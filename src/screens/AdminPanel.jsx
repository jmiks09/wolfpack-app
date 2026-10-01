import { useState } from "react";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { fsSet } from "../firebase";
import { HOME_GYM_DEFAULT } from "../lib/aiConfig";
import { ALL_TYPES } from "../lib/constants";
import { fmtDate } from "../lib/dates";

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
// Reset PIN = clears their PIN from Firestore. They can log in freely until they set a new one.
export function AdminPanel({members,profiles,currentUser,adminName,onResetPin,onDeleteAccount,onAdminBackfill,onClose,garageEquipment,onSaveGarageEquipment,showToast}){
  const [confirmDel,setConfirmDel]=useState(null);
  const [busy,setBusy]=useState(null);
  const [resetDone,setResetDone]=useState([]);
  const [backfillMember,setBackfillMember]=useState(null);
  const [backfillDate,setBackfillDate]=useState("");
  const [backfillWorkouts,setBackfillWorkouts]=useState([]);
  // What's New editor
  const [wnVersion,setWnVersion]=useState("");
  const [wnItems,setWnItems]=useState([{icon:"🔥",title:"",desc:""}]);
  const [wnSaved,setWnSaved]=useState(false);
  const [wnPreview,setWnPreview]=useState(false);

  const addWnItem=()=>setWnItems(items=>[...items,{icon:"✨",title:"",desc:""}]);
  const removeWnItem=idx=>setWnItems(items=>items.filter((_,i)=>i!==idx));
  const updateWnItem=(idx,field,val)=>setWnItems(items=>items.map((item,i)=>i===idx?{...item,[field]:val}:item));

  const saveWhatsNew=async()=>{
    if(!wnVersion.trim()||wnItems.every(i=>!i.title.trim()))return;
    const data={version:wnVersion.trim(),items:wnItems.filter(i=>i.title.trim())};
    await fsSet("wolfpack/whats_new",data);
    setWnSaved(true);setTimeout(()=>setWnSaved(false),2500);
  };
  const [backfillSaving,setBackfillSaving]=useState(false);
  const [backfillDone,setBackfillDone]=useState(false);
  // Garage equipment editor state
  const [equipList,setEquipList]=useState(Array.isArray(garageEquipment)?garageEquipment:[...HOME_GYM_DEFAULT]);
  const [newItem,setNewItem]=useState("");
  const [equipSaved,setEquipSaved]=useState(false);

  const backfillDates=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(i+1));
    return d.toISOString().split("T")[0];
  });
  const toggleBW=w=>setBackfillWorkouts(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);
  const saveBackfill=async()=>{
    if(!backfillMember||!backfillDate||backfillWorkouts.length===0)return;
    setBackfillSaving(true);
    await onAdminBackfill(backfillMember,backfillDate,backfillWorkouts);
    setBackfillSaving(false);setBackfillDone(true);
    setBackfillDate("");setBackfillWorkouts([]);
    setTimeout(()=>setBackfillDone(false),2500);
  };

  if(currentUser!==adminName)return null;

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,marginBottom:4}}>ADMIN PANEL</div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>
          <b>Reset PIN</b> — clears their PIN so they can log straight in.<br/>
          <b>Delete</b> — permanently removes them from the pack.<br/>
          <b>Backfill</b> — log past workouts on behalf of a member.
        </div>

        {/* Member management */}
        {members.filter(m=>m!==currentUser).map(m=>(
          <div key={m} style={{marginBottom:10,background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
              <AvatarDisplay profile={profiles[m]} size={36}/>
              <div style={{flex:1,fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:1}}>{m}</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>setBackfillMember(backfillMember===m?null:m)} style={{padding:"5px 8px",background:"rgba(46,204,113,0.15)",border:"1px solid rgba(46,204,113,0.3)",borderRadius:8,cursor:"pointer",color:"var(--green)",fontSize:10,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                  FILL
                </button>
                <button onClick={()=>doReset(m)} disabled={!!busy} style={{padding:"5px 8px",background:"rgba(124,92,191,0.15)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:8,cursor:"pointer",color:"var(--accent2)",fontSize:10,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                  {busy===`r${m}`?"...":resetDone.includes(m)?"✓":"PIN"}
                </button>
                <button onClick={()=>setConfirmDel(confirmDel===m?null:m)} disabled={!!busy} style={{padding:"5px 8px",background:"rgba(231,76,60,0.15)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:8,cursor:"pointer",color:"var(--red)",fontSize:10,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                  DEL
                </button>
              </div>
            </div>

            {/* Backfill panel */}
            {backfillMember===m&&(
              <div style={{padding:"12px 14px",background:"rgba(46,204,113,0.05)",borderTop:"1px solid rgba(46,204,113,0.15)"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--green)",marginBottom:10}}>LOG WORKOUT FOR {m.toUpperCase()}</div>
                {/* Date picker */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {backfillDates.map(d=>(
                    <button key={d} onClick={()=>setBackfillDate(d)} style={{
                      padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,
                      fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
                      background:backfillDate===d?"rgba(46,204,113,0.2)":"var(--bg2)",
                      border:backfillDate===d?"1px solid var(--green)":"1px solid var(--border)",
                      color:backfillDate===d?"var(--green)":"var(--muted)"
                    }}>
                      {new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                    </button>
                  ))}
                </div>
                {/* Workout type picker */}
                {backfillDate&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>
                    {ALL_TYPES.map(w=>{
                      const sel=!!backfillWorkouts.find(x=>x.id===w.id);
                      return(
                        <button key={w.id} onClick={()=>toggleBW(w)} style={{
                          padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                          background:sel?"rgba(46,204,113,0.2)":"var(--bg2)",
                          border:sel?"1px solid var(--green)":"1px solid var(--border)",
                          fontSize:13
                        }}>
                          <div>{w.icon}</div>
                          <div style={{fontSize:10,color:sel?"var(--green)":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,marginTop:2}}>{w.label}</div>
                          {sel&&<div style={{fontSize:9,color:"var(--green)"}}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {backfillDone&&<div style={{padding:"8px 10px",background:"rgba(46,204,113,0.1)",border:"1px solid rgba(46,204,113,0.3)",borderRadius:8,fontSize:12,color:"var(--green)",marginBottom:8,textAlign:"center"}}>✓ Logged for {m}!</div>}
                <button onClick={saveBackfill} disabled={!backfillDate||backfillWorkouts.length===0||backfillSaving}
                  style={{width:"100%",padding:"10px",background:"var(--green)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1,opacity:(!backfillDate||backfillWorkouts.length===0)?0.4:1}}>
                  {backfillSaving?"SAVING...":"LOG FOR "+m.toUpperCase()}
                </button>
                {/* Delete existing workouts for this member */}
                <div style={{marginTop:10,borderTop:"1px solid var(--border)",paddingTop:10}}>
                  <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,fontFamily:"'Bebas Neue',cursive",marginBottom:6}}>DELETE A LOGGED DAY</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {backfillDates.filter(d=>history[d]?.[m]?.done).map(d=>(
                      <div key={d} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"var(--bg2)",borderRadius:8,border:"1px solid var(--border)"}}>
                        <div>
                          <div style={{fontSize:12,color:"var(--text)"}}>{fmtDate(d)}</div>
                          <div style={{fontSize:10,color:"var(--muted)"}}>{Array.isArray(history[d][m].summary)?history[d][m].summary.join(", "):history[d][m].workoutLabel||"Workout"}</div>
                        </div>
                        <button onClick={async()=>{
                          const newDay={...(history[d]||{})};delete newDay[m];
                          const newHistory={...history,[d]:newDay};
                          await fsSet("wolfpack/workouts",{byDate:newHistory});
                                                    showToast(`Deleted workout for ${m} on ${fmtDate(d)}`);
                        }} style={{padding:"4px 10px",background:"rgba(231,76,60,0.15)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:6,cursor:"pointer",color:"var(--red)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                          DELETE
                        </button>
                      </div>
                    ))}
                    {backfillDates.filter(d=>history[d]?.[m]?.done).length===0&&<div style={{fontSize:11,color:"var(--muted)"}}>No logged workouts in the last 7 days.</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {confirmDel===m&&(
              <div style={{padding:"12px 14px",background:"rgba(231,76,60,0.07)",borderTop:"1px solid rgba(231,76,60,0.15)"}}>
                <div style={{fontSize:13,marginBottom:10}}>Remove <b>{m}</b> from the pack permanently?</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>doDelete(m)} disabled={!!busy} style={{flex:1,padding:10,background:"var(--red)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>{busy===`d${m}`?"...":"YES, REMOVE"}</button>
                  <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:10,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {/* ── GARAGE GYM EQUIPMENT ── */}
        <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--border)"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>🏠 GARAGE GYM EQUIPMENT</div>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:10,lineHeight:1.5}}>
            This list is what WOLFMODE uses when members pick "Garage Gym". Add or remove items as your setup changes.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
            {equipList.map((item,i)=>(
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:8,
                padding:"8px 10px",background:"var(--bg3)",
                border:"1px solid var(--border)",borderRadius:10,
              }}>
                <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",flex:1}}>{item}</span>
                <button onClick={()=>setEquipList(l=>l.filter((_,j)=>j!==i))} style={{
                  background:"none",border:"none",cursor:"pointer",
                  color:"var(--muted)",fontSize:16,padding:"0 4px",lineHeight:1,
                }}>×</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <input className="input" placeholder="Add equipment (e.g. Cable machine)"
              value={newItem} onChange={e=>setNewItem(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&newItem.trim()){setEquipList(l=>[...l,newItem.trim()]);setNewItem("");setEquipSaved(false);}}}
              style={{flex:1,padding:"8px 12px",fontSize:13}}/>
            <button className="btn-ghost" onClick={()=>{if(newItem.trim()){setEquipList(l=>[...l,newItem.trim()]);setNewItem("");setEquipSaved(false);}}}
              style={{padding:"8px 14px",fontSize:12,flexShrink:0}}>+ Add</button>
          </div>
          <button className="btn-primary" onClick={async()=>{
            await onSaveGarageEquipment(equipList);
            setEquipSaved(true);
            setTimeout(()=>setEquipSaved(false),2000);
          }} style={{width:"100%",marginBottom:8}}>
            {equipSaved?"✓ SAVED":"SAVE EQUIPMENT LIST"}
          </button>
        </div>

        {/* ── WHAT'S NEW EDITOR ── */}
        <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid var(--border)"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>📢 WHAT'S NEW EDITOR</div>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:12,lineHeight:1.5}}>Edit this and save — users will see a popup the next time they open the app. Use a new Update ID each time to trigger it.</div>

          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Update ID <span style={{color:"rgba(255,255,255,0.3)"}}>(change this to trigger the popup for everyone)</span></div>
            <input className="input" placeholder="e.g. june-update, v20, week-3..." value={wnVersion} onChange={e=>setWnVersion(e.target.value)} style={{padding:"8px 12px",fontSize:13}}/>
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Update items</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {wnItems.map((item,idx)=>(
                <div key={idx} style={{padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12}}>
                  <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
                    <input className="input" placeholder="Icon" value={item.icon} onChange={e=>updateWnItem(idx,"icon",e.target.value)}
                      style={{width:52,padding:"6px 8px",fontSize:18,textAlign:"center"}}/>
                    <input className="input" placeholder="Title (e.g. New feature name)" value={item.title} onChange={e=>updateWnItem(idx,"title",e.target.value)}
                      style={{flex:1,padding:"6px 10px",fontSize:12}}/>
                    {wnItems.length>1&&<button onClick={()=>removeWnItem(idx)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,padding:"0 4px",flexShrink:0}}>×</button>}
                  </div>
                  <textarea className="input" placeholder="Description — what changed and why users will love it" value={item.desc} onChange={e=>updateWnItem(idx,"desc",e.target.value)}
                    rows={2} style={{width:"100%",resize:"none",padding:"6px 10px",fontSize:12}}/>
                </div>
              ))}
            </div>
            <button className="btn-ghost" onClick={addWnItem} style={{width:"100%",marginTop:8,fontSize:12,padding:"8px"}}>
              + Add another item
            </button>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <button className="btn-primary" onClick={saveWhatsNew} disabled={!wnVersion.trim()||wnItems.every(i=>!i.title.trim())}
              style={{flex:1,background:wnSaved?"var(--green)":"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
              {wnSaved?"✓ SAVED — USERS WILL SEE THIS":"PUBLISH UPDATE"}
            </button>
            <button className="btn-ghost" onClick={()=>setWnPreview(true)} style={{flexShrink:0,padding:"0 14px",fontSize:12}}>
              👁 Preview
            </button>
          </div>

          {wnPreview&&(
            <div style={{padding:"12px 14px",background:"rgba(255,107,53,0.06)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:12,marginBottom:8}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"#ff6b35",marginBottom:8}}>PREVIEW — THIS IS WHAT USERS WILL SEE:</div>
              {wnItems.filter(i=>i.title.trim()).map((item,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
                  <div style={{fontSize:18,flexShrink:0}}>{item.icon}</div>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:"#fff"}}>{item.title}</div>
                    <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.4}}>{item.desc}</div>
                  </div>
                </div>
              ))}
              <button onClick={()=>setWnPreview(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:11,marginTop:4}}>Close preview</button>
            </div>
          )}
        </div>

        {/* ── ADMIN TOOLS ── */}
        <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid var(--border)"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)",marginBottom:10}}>🛠️ ADMIN TOOLS</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn-ghost" onClick={()=>{
              Object.keys(localStorage).filter(k=>k.startsWith("wp_regen")).forEach(k=>localStorage.removeItem(k));
              alert("✅ All regens reset for everyone!");
            }} style={{justifyContent:"flex-start",fontSize:12,padding:"10px 12px"}}>
              🔄 Reset all WOLFMODE regens
            </button>
            <button className="btn-ghost" onClick={()=>{
              Object.keys(localStorage).filter(k=>k.startsWith("wp_active")).forEach(k=>localStorage.removeItem(k));
              alert("✅ All active workouts cleared!");
            }} style={{justifyContent:"flex-start",fontSize:12,padding:"10px 12px"}}>
              🗑️ Clear all active workouts
            </button>
          </div>
        </div>

        <button className="btn-ghost" style={{width:"100%",marginTop:8}} onClick={onClose}>Close</button>
      </div>
    </div>
  );

  function doReset(m){setBusy(`r${m}`);onResetPin(m).then(()=>{setBusy(null);setResetDone(d=>[...d,m]);});}
  function doDelete(m){setBusy(`d${m}`);onDeleteAccount(m).then(()=>{setBusy(null);setConfirmDel(null);});}
}
