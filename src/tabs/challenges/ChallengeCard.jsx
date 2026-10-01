import { useState } from "react";
import { fmtDate, getWorkoutDays, todayStr } from "../../lib/dates";
import { calcPenalties } from "../../lib/stats";
import { EditChallengeModal } from "./EditChallengeModal";
import { PenaltyTracker } from "./PenaltyTracker";

export function ChallengeCard({challenge:c,currentUser,adminName,members,profiles,onLog,onDelete,onEdit,onForfeit,onMarkPaid,onLogPayment,history,completed}){
  const [logOpen,setLogOpen]=useState(false);
  const [editOpen,setEditOpen]=useState(false);
  const [forfeitConfirm,setForfeitConfirm]=useState(false);
  const [amt,setAmt]=useState("");
  const parts=Object.keys(c.participants||{});
  const amI=parts.includes(currentUser);
  const isDR=c.goalType==="dateRange";
  const canEdit=c.createdBy===currentUser&&!completed;
  const myData=c.participants?.[currentUser]||{};
  const myForfeited=myData.forfeited||false;
  const myManual=myData.progress||0;
  const myAcceptedAt=c.participants?.[currentUser]?.acceptedAt||c.startDate;
  const myAuto=isDR&&c.startDate&&c.endDate?getWorkoutDays(myAcceptedAt,todayStr()<c.endDate?todayStr():c.endDate,profiles?.[currentUser]).filter(d=>history[d]?.[currentUser]?.done).length:null;
  const myProg=myAuto!==null?myAuto:myManual;
  const myGoal=isDR&&c.startDate&&c.endDate?getWorkoutDays(myAcceptedAt,c.endDate,profiles?.[currentUser]).length:c.goal;
  const myPct=Math.min(100,Math.round((myProg/Math.max(myGoal,1))*100));

  // Penalty calc for auto-forfeit prompt
  const penalties=calcPenalties(c,history,profiles);
  const myOwed=penalties[currentUser]?.totalOwed||0;
  const atForfeitCap=c.forfeitCap&&myOwed>=c.forfeitCap;

  const rows=parts.filter(m=>c.participants[m]?.status!=="pending").map(m=>{
    const mAcceptedAt=c.participants[m]?.acceptedAt||c.startDate;
    const mGoal=isDR&&c.startDate&&c.endDate?getWorkoutDays(mAcceptedAt,c.endDate,profiles?.[m]).length:c.goal;
    const prog=isDR&&c.startDate&&c.endDate?getWorkoutDays(mAcceptedAt,todayStr()<c.endDate?todayStr():c.endDate,profiles?.[m]).filter(d=>history[d]?.[m]?.done).length:(c.participants[m]?.progress||0);
    const forfeited=c.participants[m]?.forfeited||false;
    return{name:m,prog,goal:mGoal,pct:Math.min(100,Math.round((prog/Math.max(mGoal,1))*100)),forfeited};
  }).sort((a,b)=>b.pct-a.pct);

  const doLog=()=>{const n=Number(amt);if(!n||n<=0)return;const np=myManual+n;onLog(c.id,currentUser,np,np>=c.goal);setAmt("");setLogOpen(false);};
  const doForfeit=()=>{onForfeit(c.id,currentUser);setForfeitConfirm(false);};
  const losers=completed?rows.filter(r=>r.pct<100&&!r.forfeited):[];
  const forfeited=rows.filter(r=>r.forfeited);

  return(
    <div className="challenge-card">
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{c.title}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
            {isDR?`📅 ${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`:`Goal: ${c.goal} ${c.unit}`}
            {isDR&&c.maxRestDays!=null&&<span style={{color:"var(--muted)"}}> · max {c.maxRestDays} rest days/week</span>}
            {c.penalty&&<span style={{color:"var(--orange)"}}> · {c.penalty}{c.penaltyAmt>0?` ($${c.penaltyAmt}/miss)`:""}</span>}
          {/* Show pending invites count */}
          {Object.values(c.participants||{}).some(p=>p.status==="pending")&&(
            <div style={{marginTop:4,fontSize:11,color:"var(--muted)"}}>
              ⏳ {Object.values(c.participants).filter(p=>p.status==="pending").length} invite(s) pending
            </div>
          )}
            {c.forfeitCap>0&&<span style={{color:"var(--red)"}}> · forfeit cap ${c.forfeitCap}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,paddingLeft:8,flexShrink:0}}>
          {canEdit&&<button onClick={()=>setEditOpen(true)} style={{padding:"5px 9px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✏️</button>}
          {c.createdBy===currentUser&&<button onClick={()=>onDelete(c.id)} style={{padding:"5px 9px",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>}
        </div>
      </div>

      {/* My progress */}
      {amI&&!myForfeited&&(
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:13,color:"var(--accent2)"}}>You: {myProg}/{myGoal} {c.unit}</span>
            <span style={{fontSize:13,color:myPct>=100?"var(--green)":"var(--muted)"}}>{myPct}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{width:`${myPct}%`}}/></div>
        </div>
      )}
      {amI&&myForfeited&&(
        <div style={{marginBottom:10,padding:"10px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🏳️</span>
          <div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>YOU FORFEITED</div>
            <div style={{fontSize:12,color:"var(--red)"}}>Owes ${c.forfeitCap||0}</div>
          </div>
        </div>
      )}

      {/* Other members */}
      {rows.filter(r=>r.name!==currentUser).map(r=>(
        <div key={r.name} style={{marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:12,color:"var(--muted)",display:"flex",alignItems:"center",gap:4}}>
              {r.forfeited&&<span>🏳️</span>}{r.name}: {r.forfeited?<span style={{color:"var(--red)"}}>FORFEITED (owes ${c.forfeitCap||0})</span>:`${r.prog}/${r.goal}`}
            </span>
            {!r.forfeited&&<span style={{fontSize:12,color:r.pct>=100?"var(--green)":"var(--muted)"}}>{r.pct}%</span>}
          </div>
          {!r.forfeited&&<div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${r.pct}%`,opacity:.6}}/></div>}
        </div>
      ))}

      <PenaltyTracker challenge={c} history={history} profiles={profiles} currentUser={currentUser} adminName={adminName} onMarkPaid={onMarkPaid} onLogPayment={onLogPayment}/>

      {/* Auto-forfeit prompt when at cap */}
      {!completed&&amI&&!myForfeited&&atForfeitCap&&(
        <div style={{marginTop:10,padding:"10px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--red)",marginBottom:4}}>⚠️ FORFEIT CAP REACHED</div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>You've hit the ${c.forfeitCap} cap. Forfeit now to stop the clock.</div>
          <button onClick={()=>setForfeitConfirm(true)} style={{width:"100%",padding:"8px",background:"var(--red)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>FORFEIT — OWE ${c.forfeitCap}</button>
        </div>
      )}

      {/* Completed losers */}
      {completed&&(losers.length>0||forfeited.length>0)&&(
        <div style={{marginTop:10,padding:"10px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:10}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--red)",marginBottom:5}}>🚨 FINAL STANDINGS</div>
          {forfeited.map(l=><div key={l.name} style={{fontSize:13,color:"var(--muted)",marginBottom:4}}>🏳️ <span style={{color:"var(--text)"}}>{l.name}</span> — forfeited, owes <span style={{color:"var(--red)"}}>${c.forfeitCap||0}</span></div>)}
          {losers.map(l=>{const p=penalties[l.name];return<div key={l.name} style={{fontSize:13,color:"var(--muted)",marginBottom:4}}><span style={{color:"var(--text)"}}>{l.name}</span> — owes <span style={{color:"var(--red)"}}>${p?.totalOwed||0}</span></div>;})}
          {(losers.find(l=>l.name===currentUser)||myForfeited)&&<div style={{marginTop:6,fontSize:12,color:"var(--orange)",fontWeight:600}}>😬 That's you! {c.penalty}</div>}
        </div>
      )}

      {/* Action buttons */}
      {!completed&&amI&&myPct<100&&!isDR&&!myForfeited&&<button onClick={()=>setLogOpen(true)} style={{marginTop:10,width:"100%",padding:10,background:"rgba(124,92,191,0.15)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:10,cursor:"pointer",color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>+ LOG PROGRESS</button>}
      {isDR&&!completed&&amI&&!myForfeited&&<div style={{marginTop:8,fontSize:11,color:"var(--muted)",textAlign:"center"}}>Progress auto-tracked from your daily workouts</div>}
      {myPct>=100&&!myForfeited&&<div style={{marginTop:8,textAlign:"center",color:"var(--green)",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2}}>✓ YOU COMPLETED THIS</div>}

      {/* Forfeit button — always available */}
      {!completed&&amI&&!myForfeited&&c.forfeitCap>0&&!atForfeitCap&&(
        <button onClick={()=>setForfeitConfirm(true)} style={{marginTop:8,width:"100%",padding:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1}}>
          🏳️ FORFEIT — OWE ${c.forfeitCap}
        </button>
      )}

      {/* Forfeit confirm */}
      {forfeitConfirm&&(
        <div style={{marginTop:10,padding:"12px",background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:10}}>
          <div style={{fontSize:13,marginBottom:10}}>Are you sure? You'll owe <strong style={{color:"var(--red)"}}>${c.forfeitCap}</strong> and be removed from the challenge.</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={doForfeit} style={{flex:1,padding:10,background:"var(--red)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>YES, FORFEIT</button>
            <button onClick={()=>setForfeitConfirm(false)} style={{flex:1,padding:10,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Log input */}
      {logOpen&&<div style={{marginTop:10,display:"flex",gap:8}}><input className="input" type="number" placeholder={`Add ${c.unit}...`} value={amt} onChange={e=>setAmt(e.target.value)} min={1} autoFocus onKeyDown={e=>e.key==="Enter"&&doLog()}/><button onClick={doLog} disabled={!amt||Number(amt)<=0} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>LOG</button><button onClick={()=>{setLogOpen(false);setAmt("");}} style={{padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✕</button></div>}
      {editOpen&&<EditChallengeModal challenge={c} members={members} onSave={onEdit} onClose={()=>setEditOpen(false)}/>}
    </div>
  );
}
