import { useState } from "react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import { getDateRange, getWeekStart, isRestDay, localDateStr, todayStr } from "../../lib/dates";
import { calcPenalties } from "../../lib/stats";

export function PenaltyTracker({challenge:c,history,profiles,currentUser,adminName,onMarkPaid,onLogPayment}){
  if(!c.startDate||!c.endDate)return null;
  const acceptedParts=Object.keys(c.participants||{}).filter(m=>c.participants[m]?.status!=="pending");
  if(acceptedParts.length===0)return null;
  const hasPenalty=c.penaltyAmt>0;
  if(!hasPenalty)return null;

  const penalties=calcPenalties(c,history,profiles);
  const payments=c.payments||{}; // {memberName: [{amount, method, date, ts}]}
  const isAdmin=currentUser===adminName||currentUser===c.createdBy;

  // Total earned (all missed workouts regardless of payments) = total pot
  const grandTotal=acceptedParts.reduce((sum,m)=>{
    const p=penalties[m]||{};
    return sum+(p.forfeited?c.forfeitCap||0:p.totalOwed||0);
  },0);

  // Eligible pot for current user — only penalties accrued AFTER they joined
  const myJoinDate=c.participants[currentUser]?.acceptedAt||c.startDate;
  const myEligiblePot=acceptedParts.filter(m=>m!==currentUser).reduce((sum,m)=>{
    const pData=c.participants[m];
    const theirJoinDate=pData?.acceptedAt||c.startDate;
    // Only count penalties from the LATER of the two join dates
    const overlapStart=myJoinDate>theirJoinDate?myJoinDate:theirJoinDate;
    const cap=todayStr()<c.endDate?todayStr():c.endDate;
    if(overlapStart>cap)return sum;
    // Count their missed days from overlapStart onwards
    const overlapDays=getDateRange(overlapStart,cap);
    const profile=profiles?.[m];
    let overlapOwed=0;
    overlapDays.forEach(d=>{
      if(!history[d]?.[m]?.done&&!isRestDay(d,profile))overlapOwed+=c.penaltyAmt;
    });
    if(c.forfeitCap&&overlapOwed>c.forfeitCap)overlapOwed=c.forfeitCap;
    return sum+overlapOwed;
  },0);

  const joinedLate=myJoinDate>c.startDate;

  // How much each person has paid
  const paidAmount=m=>(payments[m]||[]).reduce((s,p)=>s+p.amount,0);
  const isFullyPaid=m=>paidAmount(m)>=(penalties[m]?.totalOwed||0)&&(penalties[m]?.totalOwed||0)>0;

  const [expandedMember,setExpandedMember]=useState(null);
  const [partialAmt,setPartialAmt]=useState("");

  const [zelleConfirm,setZelleConfirm]=useState(false);
  const [zelleAmt,setZelleAmt]=useState(0);

  const [zelleCopied,setZelleCopied]=useState(false);
  const handleZelle=(amt)=>{
    // Just open Zelle website + show confirmation — no auto-copy
    window.open("https://www.zellepay.com","_blank");
    setZelleAmt(amt);
    setZelleConfirm(true);
    setZelleCopied(false);
  };
  const copyZelleContact=()=>{
    const recipientName=c.paymentRecipient==="admin"?adminName:c.createdBy;
    const zelleContact=profiles[recipientName]?.zelleContact||"";
    if(zelleContact){
      navigator.clipboard?.writeText(zelleContact).then(()=>{
        setZelleCopied(true);
      }).catch(()=>{setZelleCopied(true);}); // still show copied even if clipboard API fails
    }
  };

  const confirmZellePayment=()=>{
    onLogPayment(c.id,currentUser,zelleAmt,"Zelle");
    setZelleConfirm(false);setZelleAmt(0);setPartialAmt("");
  };



  return(
    <div style={{marginTop:12,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>

      {/* ── EVERYONE VIEW: summary table ── */}
      <div style={{padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span>💸</span>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--muted)"}}>PENALTY TRACKER — ${c.penaltyAmt}/MISS</span>
        </div>
        <div style={{textAlign:"right"}}>
          {joinedLate?(
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1,color:"var(--gold)"}}>🏆 YOUR POT: ${myEligiblePot}</div>
              <div style={{fontSize:9,color:"var(--muted)"}}>Total pot: ${grandTotal} (joined late)</div>
            </div>
          ):(
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1,color:"var(--gold)"}}>🏆 POT: ${grandTotal}</div>
          )}
        </div>
      </div>

      {/* Late joiner notice */}
      {joinedLate&&(
        <div style={{padding:"8px 12px",background:"rgba(255,165,0,0.06)",borderBottom:"1px solid rgba(255,165,0,0.15)",fontSize:11,color:"rgba(255,165,0,0.8)",lineHeight:1.5}}>
          ⚡ You joined on {new Date(myJoinDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}. You can only win penalties accrued after your join date (${myEligiblePot} so far). The ${grandTotal-myEligiblePot} earned before you joined goes to original members.
        </div>
      )}

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 70px 60px",padding:"5px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <span style={{fontSize:10,color:"var(--muted)"}}>Member</span>
        <span style={{fontSize:10,color:"var(--muted)",textAlign:"center"}}>This week</span>
        <span style={{fontSize:10,color:"var(--red)",textAlign:"right",fontWeight:700}}>Total</span>
      </div>


      {acceptedParts.map(m=>{
        const p=penalties[m]||{totalOwed:0,byWeek:{}};
        const forfeited=c.participants[m]?.forfeited||false;
        // Only count days that are fully over — yesterday and before
    const yesterday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return localDateStr(d);})();
    const cap=yesterday<c.endDate?yesterday:c.endDate;
        const currentWk=getWeekStart(todayStr());
        const wkAmt=p.byWeek?.[currentWk]||0;
        const totalAmt=forfeited?c.forfeitCap||0:p.totalOwed||0;
        const paid=paidAmount(m);
        const fullPaid=isFullyPaid(m);
        const isMe=m===currentUser;
        const myPayments=payments[m]||[];

        return(
          <div key={m}>
            {/* Summary row — visible to everyone */}
            <div onClick={()=>isMe||isAdmin?setExpandedMember(expandedMember===m?null:m):null}
              style={{display:"grid",gridTemplateColumns:"1fr 70px 60px",padding:"9px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center",cursor:isMe||isAdmin?"pointer":"default",background:expandedMember===m?"rgba(255,255,255,0.03)":"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <AvatarDisplay profile={profiles[m]} size={22}/>
                <span style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{m}</span>
                {forfeited&&<span style={{fontSize:10}}>🏳️</span>}
                {fullPaid&&<span style={{fontSize:10,color:"var(--green)",fontWeight:700}}>✓</span>}
                {isMe&&<span style={{fontSize:9,color:"var(--accent2)",background:"rgba(124,92,191,0.2)",padding:"1px 4px",borderRadius:3}}>you</span>}
              </div>
              <div style={{textAlign:"center"}}>
                {wkAmt>0?<span style={{fontSize:12,color:"var(--red)",fontWeight:700}}>${wkAmt}</span>:<span style={{fontSize:12,color:"var(--green)"}}>✓</span>}
              </div>
              <div style={{textAlign:"right"}}>
                {totalAmt>0?(
                  <span style={{fontSize:12,fontWeight:700,color:fullPaid?"var(--green)":"var(--red)"}}>
                    {fullPaid?"✓ Paid":`$${totalAmt}`}
                  </span>
                ):<span style={{fontSize:12,color:"var(--green)"}}>$0</span>}
              </div>
            </div>

            {/* Expanded detail — only for the member themselves or admin */}
            {expandedMember===m&&(isMe||isAdmin)&&totalAmt>0&&(
              <div style={{padding:"12px 14px",background:"rgba(0,0,0,0.15)",borderBottom:"1px solid var(--border)"}}>

                {/* Progress */}
                {paid>0&&<div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:"var(--muted)"}}>${paid} paid of ${totalAmt}</span>
                    <span style={{fontSize:11,color:"var(--muted)"}}>{Math.round((paid/totalAmt)*100)}%</span>
                  </div>
                  <div style={{height:5,background:"var(--bg2)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,Math.round((paid/totalAmt)*100))}%`,height:"100%",background:"var(--green)",borderRadius:3}}/>
                  </div>
                </div>}

                {/* Payment history */}
                {myPayments.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:"var(--muted)",fontWeight:600,letterSpacing:1,marginBottom:6}}>PAYMENT HISTORY</div>
                    {myPayments.map((pay,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:pay.method==="Zelle"?"#1d4ed8":"#555",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:9,color:"#fff",fontWeight:700}}>{pay.method==="Zelle"?"Z":"$"}</span>
                        </div>
                        <div style={{flex:1}}>
                          <span style={{fontSize:12,color:"var(--text)"}}>${pay.amount} via {pay.method}</span>
                          <span style={{fontSize:10,color:"var(--muted)",marginLeft:6}}>{pay.date}</span>
                        </div>
                        <span style={{fontSize:11,color:"var(--green)"}}>✓</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pay buttons — only for the member themselves */}
                {isMe&&!fullPaid&&(
                  <div>
                    {/* Zelle confirmation overlay */}
                    {zelleConfirm&&(
                      <div style={{padding:"12px",background:"rgba(37,99,235,0.1)",border:"1px solid rgba(37,99,235,0.3)",borderRadius:10,marginBottom:10}}>
                        <div style={{fontSize:13,marginBottom:8,fontWeight:600,color:"#60a5fa"}}>Send ${zelleAmt} via Zelle then confirm below</div>
                        {(()=>{
                          const rn=c.paymentRecipient==="admin"?adminName:c.createdBy;
                          const rc=profiles[rn]?.zelleContact;
                          return rc?(
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 10px",background:"rgba(0,0,0,0.2)",borderRadius:8}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:10,color:"var(--muted)",marginBottom:2}}>Send to:</div>
                                <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{rc}</div>
                              </div>
                              <button onClick={copyZelleContact} style={{
                                padding:"6px 12px",borderRadius:8,cursor:"pointer",flexShrink:0,
                                background:zelleCopied?"rgba(46,204,113,0.2)":"rgba(255,255,255,0.08)",
                                border:zelleCopied?"1px solid var(--green)":"1px solid var(--border)",
                                color:zelleCopied?"var(--green)":"var(--muted)",
                                fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
                              }}>
                                {zelleCopied?"✓ COPIED TO CLIPBOARD":"COPY"}
                              </button>
                            </div>
                          ):<div style={{fontSize:12,color:"var(--orange)",marginBottom:8}}>⚠️ No Zelle contact set yet.</div>;
                        })()}
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={confirmZellePayment} style={{flex:1,padding:"9px",background:"#1d4ed8",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>YES, I PAID</button>
                          <button onClick={()=>setZelleConfirm(false)} style={{flex:1,padding:"9px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>NOT YET</button>
                        </div>
                      </div>
                    )}
                    {!zelleConfirm&&<>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>
                      Pay remaining <strong style={{color:"var(--red)"}}>${totalAmt-paid}</strong>:
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <button onClick={()=>handleZelle(totalAmt-paid)} style={{flex:1,padding:"9px 8px",borderRadius:8,border:"1px solid #2563eb",background:"rgba(37,99,235,0.1)",color:"#60a5fa",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                        PAY ${totalAmt-paid} VIA ZELLE
                      </button>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input type="number" placeholder="Partial amount..." value={partialAmt} onChange={e=>setPartialAmt(e.target.value)} min={1} max={totalAmt-paid} style={{flex:1,padding:"7px 10px",borderRadius:6,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text)",fontSize:12}}/>
                      <button onClick={()=>handleZelle(Number(partialAmt))} disabled={!partialAmt} style={{padding:"7px 10px",borderRadius:6,border:"1px solid #2563eb",background:"rgba(37,99,235,0.1)",color:"#60a5fa",fontSize:11,cursor:"pointer"}}>Zelle</button>
                    </div>
                    </>}
                  </div>
                )}

                {/* Admin mark as paid */}
                {isAdmin&&!isMe&&!fullPaid&&(
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Admin — mark payment received:</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>onMarkPaid(c.id,m,totalAmt-paid,"Cash")} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid var(--green)",background:"rgba(46,204,113,0.1)",color:"var(--green)",fontSize:12,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                        MARK ${totalAmt-paid} PAID
                      </button>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:6}}>
                      <input type="number" placeholder="Partial amount..." value={partialAmt} onChange={e=>setPartialAmt(e.target.value)} min={1} style={{flex:1,padding:"7px 10px",borderRadius:6,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text)",fontSize:12}}/>
                      <button onClick={()=>{onMarkPaid(c.id,m,Number(partialAmt),"Cash");setPartialAmt("");}} disabled={!partialAmt} style={{padding:"7px 10px",borderRadius:6,border:"1px solid var(--green)",background:"rgba(46,204,113,0.1)",color:"var(--green)",fontSize:11,cursor:"pointer"}}>Mark Paid</button>
                    </div>
                  </div>
                )}

                {fullPaid&&<div style={{textAlign:"center",color:"var(--green)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>✓ FULLY PAID UP</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Grand total row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 70px 60px",padding:"10px 12px",background:"rgba(241,196,15,0.05)",borderTop:"1px solid rgba(241,196,15,0.15)"}}>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:"var(--gold)"}}>🏆 PRIZE POT</span>
        <div/>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"var(--gold)",textAlign:"right",fontWeight:700}}>${grandTotal}</span>
      </div>
    </div>
  );
}
