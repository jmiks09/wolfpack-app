import { useRef, useState } from "react";
import { AITrainerProfileTab } from "../ai/AITrainerProfileTab";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { fsSet } from "../firebase";
import { WOLF_AVATARS } from "../lib/constants";
import { DAY_NAMES, fmtDate, isRestDay, localDateStr, todayStr } from "../lib/dates";
import { getStreak, getTotalWorkouts } from "../lib/stats";
import { compressImage, readFileAsDataURL } from "../lib/utils";

// ── PROFILE MODAL ────────────────────────────────────────────────────────────
export function ProfileModal({currentUser,profile,profiles,history,challenges,onClose,onSaveWeight,onSaveGoal,onChangePin,onChangeName,onSaveProfile,onSaveBackfill}){
  const [tab,setTab]=useState("stats");
  const [weight,setWeight]=useState("");
  const [weightUnit,setWeightUnit]=useState("lbs");
  const [goal,setGoal]=useState(profile?.personalGoal||"");
  const [goalSaved,setGoalSaved]=useState(false);
  const [shareGoal,setShareGoal]=useState(profile?.shareGoal||false);
  const [pin1,setPin1]=useState("");
  const [pin2,setPin2]=useState("");
  const [pinErr,setPinErr]=useState("");
  const [pinDone,setPinDone]=useState(false);
  const [newName,setNewName]=useState(currentUser);
  const [nameErr,setNameErr]=useState("");
  const [nameDone,setNameDone]=useState(false);

  const streak=getStreak(history,currentUser,profile);
  const total=getTotalWorkouts(history,currentUser);
  const weightLog=profile?.weightLog||[];

  const logWeight=()=>{
    if(!weight||isNaN(Number(weight)))return;
    const entry={w:Number(weight),unit:weightUnit,date:todayStr(),ts:Date.now()};
    onSaveWeight([entry,...weightLog].slice(0,30));
    setWeight("");
  };

  const saveGoal=()=>{onSaveGoal(goal.trim(),shareGoal);setGoalSaved(true);setTimeout(()=>setGoalSaved(false),2000);};

  const changePin=async()=>{
    if(pin1.length!==4)return setPinErr("PIN must be 4 digits");
    if(pin1!==pin2)return setPinErr("PINs don't match");
    setPinErr("");await onChangePin(pin1);setPinDone(true);setPin1("");setPin2("");
  };

  const [restDays,setRestDays]=useState(profile?.restDays||[0,6]);
  const toggleRestDay=d=>{
    if(restDays.includes(d)){if(restDays.length<=2)return;setRestDays(r=>r.filter(x=>x!==d));}
    else setRestDays(r=>[...r,d]);
  };
  const saveRestDays=async()=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],restDays}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    showRestSaved(true);setTimeout(()=>showRestSaved(false),2000);
  };
  const [restSaved,showRestSaved]=useState(false);
  const [zelleInfo,setZelleInfo]=useState(profile?.zelleContact||"");
  const [zelleSaved,setZelleSaved]=useState(false);
  const saveZelle=async()=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],zelleContact:zelleInfo.trim()}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    setZelleSaved(true);setTimeout(()=>setZelleSaved(false),2000);
  };
  const onSaveZelle=async(val)=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],zelleContact:val}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    setZelleInfo(val);
  };
  const [pbExercise,setPbExercise]=useState("");
  const [pbValue,setPbValue]=useState("");
  const [pbUnit,setPbUnit]=useState("lbs");
  const [pbNote,setPbNote]=useState("");
  const savePB=async()=>{
    if(!pbExercise.trim()||!pbValue)return;
    const pr={exercise:pbExercise.trim(),value:Number(pbValue),unit:pbUnit.trim()||"lbs",note:pbNote.trim(),date:todayStr()};
    const updated=[pr,...(profile?.personalBests||[])].slice(0,50);
    const np={...profiles,[currentUser]:{...profiles[currentUser],personalBests:updated}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
    setPbExercise("");setPbValue("");setPbUnit("lbs");setPbNote("");
  };
  const deletePB=async(idx)=>{
    const updated=[...(profile?.personalBests||[])];updated.splice(idx,1);
    const np={...profiles,[currentUser]:{...profiles[currentUser],personalBests:updated}};
    await fsSet("wolfpack/profiles",{users:np});if(onSaveProfile)onSaveProfile(np);
  };

  // Avatar editing
  const [editingAvatar,setEditingAvatar]=useState(false);
  const [newAvatar,setNewAvatar]=useState(profile?.avatar||"🐺");
  const [newAvatarImg,setNewAvatarImg]=useState(profile?.avatarImg||null);
  const avatarFileRef=useRef();

  const handleAvatarPhoto=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    const raw=await readFileAsDataURL(f);
    const comp=await compressImage(raw);
    setNewAvatarImg(comp);
  };
  const saveAvatar=async()=>{
    const updated={...profiles[currentUser],avatar:newAvatarImg?null:newAvatar,...(newAvatarImg?{avatarImg:newAvatarImg}:{avatarImg:undefined})};
    if(!newAvatarImg) delete updated.avatarImg;
    const np={...profiles,[currentUser]:updated};
    await fsSet("wolfpack/profiles",{users:np});
    if(onSaveProfile)onSaveProfile(np);
    setEditingAvatar(false);
  };

  // Backfill state
  const [backfillDate,setBackfillDate]=useState("");
  const [backfillWorkouts,setBackfillWorkouts]=useState([]);
  const [backfillDone,setBackfillDone]=useState(false);
  const [backfillSaving,setBackfillSaving]=useState(false);

  // Last 7 days excluding today
  const backfillDates=Array.from({length:7},(_,i)=>{
    const d=new Date();
    d.setDate(d.getDate()-(i+1));
    return localDateStr(d);
  });

  const toggleBackfillWorkout=w=>setBackfillWorkouts(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);

  const saveBackfill=async()=>{
    if(!backfillDate||backfillWorkouts.length===0)return;
    setBackfillSaving(true);
    const time="12:00 PM";
    const icons=backfillWorkouts.map(w=>w.icon).join("");
    const labels=backfillWorkouts.map(w=>w.label).join(" + ");
    const entry={done:true,workouts:backfillWorkouts.map(w=>({id:w.id,icon:w.icon,label:w.label})),workoutIcon:icons,workoutLabel:labels,note:"(backfilled)",time,ts:new Date(backfillDate+"T12:00:00").getTime()};
    const updated={...history,[backfillDate]:{...(history[backfillDate]||{}),[currentUser]:entry}};
    await onSaveBackfill(updated);
    setBackfillDate("");setBackfillWorkouts([]);setBackfillDone(true);
    setTimeout(()=>setBackfillDone(false),2500);
    setBackfillSaving(false);
  };

  // Longest streak ever
  const longestStreak=(()=>{
    let best=0,cur=0;
    const base=new Date();
    for(let i=365;i>=0;i--){
      const d=new Date(base);d.setDate(base.getDate()-i);
      const k=localDateStr(d);
      if(isRestDay(k,profile))continue;
      if(history[k]?.[currentUser]?.done){cur++;best=Math.max(best,cur);}
      else cur=0;
    }
    return best;
  })();

  const tabs=[{id:"stats",label:"STATS"},{id:"body",label:"BODY"},{id:"ai",label:"🔥 WOLF"},{id:"pb",label:"MY PRs"},{id:"rest",label:"REST DAYS"},{id:"pin",label:"PIN"}];

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        {/* header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setEditingAvatar(true)}>
            <AvatarDisplay profile={profile} size={52}/>
            <div style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",border:"2px solid var(--bg2)"}}>✏️</div>
          </div>
          <div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3}}>{currentUser}</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>🔥 {streak} streak · 💪 {total} workouts</div>
          </div>
        </div>

        {/* avatar edit modal */}
        {editingAvatar&&(
          <div style={{marginBottom:16,padding:16,background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,marginBottom:12}}>CHANGE PROFILE PICTURE</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:12}}>
              {newAvatarImg
                ?<img src={newAvatarImg} alt="av" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--accent)"}}/>
                :<div style={{width:72,height:72,borderRadius:"50%",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,border:"2px solid var(--border)"}}>{newAvatar}</div>
              }
              <button className="btn-ghost" onClick={()=>avatarFileRef.current.click()} style={{fontSize:13}}>{newAvatarImg?"Change Photo":"Upload Photo"}</button>
              <input ref={avatarFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarPhoto}/>
              {newAvatarImg&&<button className="btn-ghost" onClick={()=>setNewAvatarImg(null)} style={{fontSize:12,color:"var(--muted)"}}>Remove photo</button>}
            </div>
            {!newAvatarImg&&(
              <>
                <div style={{textAlign:"center",fontSize:12,color:"var(--muted)",marginBottom:8}}>— or pick an emoji —</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:12}}>
                  {WOLF_AVATARS.map(a=>(
                    <button key={a} onClick={()=>setNewAvatar(a)} style={{padding:8,fontSize:22,borderRadius:10,cursor:"pointer",background:newAvatar===a?"rgba(124,92,191,0.25)":"var(--bg2)",border:newAvatar===a?"2px solid var(--accent)":"2px solid var(--border)"}}>{a}</button>
                  ))}
                </div>
              </>
            )}
            <div style={{display:"flex",gap:8}}>
              <button className="btn-primary" onClick={saveAvatar} style={{flex:1}}>SAVE</button>
              <button className="btn-ghost" onClick={()=>{setEditingAvatar(false);setNewAvatarImg(profile?.avatarImg||null);setNewAvatar(profile?.avatar||"🐺");}} style={{flex:1}}>Cancel</button>
            </div>
          </div>
        )}

        {/* tabs */}
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 4px",borderRadius:10,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,background:tab===t.id?"rgba(124,92,191,0.2)":"var(--bg3)",border:tab===t.id?"1px solid var(--accent)":"1px solid var(--border)",color:tab===t.id?"var(--accent2)":"var(--muted)"}}>{t.label}</button>
          ))}
        </div>

        {/* ── TAB CONTENT — fixed min height so modal doesn't jump ── */}
        <div style={{minHeight:320}}>

          {/* STATS tab */}
          {tab==="stats"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["🔥","Consecutive days logged",`${streak} day streak`],
                  ["🏆","Best consecutive days",`${longestStreak} days`],
                  ["💪","Total sessions logged",total],
                  ["📅","Sessions this month",Object.keys(history).filter(d=>{const m=new Date();return d.startsWith(`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`)&&history[d]?.[currentUser]?.done}).reduce((sum,d)=>{const s=history[d]?.[currentUser]?.workouts?.length||1;return sum+s;},0)],
                ].map(([icon,label,val])=>(
                  <div key={label} style={{padding:"14px",background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)",textAlign:"center"}}>
                    <div style={{fontSize:24,marginBottom:4}}>{icon}</div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:1}}>{val}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{label}</div>
                  </div>
                ))}
              </div>
              {profile?.personalGoal&&(
                <div style={{padding:"12px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.25)",borderRadius:12}}>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>MY GOAL</div>
                  <div style={{fontSize:14,color:"var(--text)"}}>🎯 {profile.personalGoal}</div>
                </div>
              )}
            </div>
          )}

          {/* BODY tab — goal + weight combined */}
          {tab==="pb"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>Track your personal records. Private — only you can see these.</div>
              {/* Add PR form */}
              <div style={{display:"flex",flexDirection:"column",gap:8,padding:"12px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)"}}>
                <input className="input" placeholder="Exercise (e.g. Bench Press)" value={pbExercise} onChange={e=>setPbExercise(e.target.value)} maxLength={40}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input className="input" placeholder="Value (e.g. 225)" value={pbValue} onChange={e=>setPbValue(e.target.value)} type="number" min={0}/>
                  <input className="input" placeholder="Unit (lbs, reps, min)" value={pbUnit} onChange={e=>setPbUnit(e.target.value)} maxLength={10}/>
                </div>
                <input className="input" placeholder="Note (optional)" value={pbNote} onChange={e=>setPbNote(e.target.value)} maxLength={60}/>
                <button className="btn-primary" onClick={savePB} disabled={!pbExercise.trim()||!pbValue}>LOG PR 🏆</button>
              </div>
              {/* PR list */}
              {(profile?.personalBests||[]).length===0?(
                <div style={{textAlign:"center",padding:"20px",color:"var(--muted)",fontSize:13}}>No PRs logged yet. Set your first one!</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {(profile?.personalBests||[]).map((pb,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)"}}>
                      <div style={{fontSize:20}}>🏆</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{pb.exercise}</div>
                        <div style={{fontSize:13,color:"var(--accent2)",fontWeight:700}}>{pb.value} {pb.unit}</div>
                        {pb.note&&<div style={{fontSize:11,color:"var(--muted)",fontStyle:"italic"}}>{pb.note}</div>}
                        <div style={{fontSize:11,color:"var(--muted)"}}>{fmtDate(pb.date)}</div>
                      </div>
                      <button onClick={()=>deletePB(i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab==="body"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Personal goal */}
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)",marginBottom:8}}>MY GOAL</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Set a personal goal. Private by default — toggle to share with the pack.</div>
                <textarea className="input" rows={3} placeholder="e.g. Run a 5K by June, lose 15 lbs, bench 225..." value={goal} onChange={e=>setGoal(e.target.value)} maxLength={120} style={{resize:"none",marginBottom:8}}/>
                <div onClick={()=>setShareGoal(s=>!s)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg3)",borderRadius:10,border:"1px solid var(--border)",marginBottom:8,cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"var(--text)"}}>Share with the pack</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{shareGoal?"Visible on the Pack tab":"Only you can see this"}</div>
                  </div>
                  <div style={{width:44,height:24,borderRadius:12,background:shareGoal?"var(--accent)":"rgba(255,255,255,0.1)",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:3,left:shareGoal?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn-primary" onClick={saveGoal} disabled={!goal.trim()} style={{flex:1}}>{goalSaved?"✓ SAVED!":"SAVE GOAL"}</button>
                  {profile?.personalGoal&&<button className="btn-ghost" onClick={()=>{setGoal("");onSaveGoal("",false);}} style={{flex:1}}>Clear</button>}
                </div>
              </div>
              <div style={{height:1,background:"var(--border)"}}/>
              {/* Weight log */}
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)",marginBottom:8}}>WEIGHT LOG <span style={{fontSize:10,color:"var(--muted)",letterSpacing:1}}>— private, only you see this</span></div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input className="input" type="number" placeholder="Enter weight..." value={weight} onChange={e=>setWeight(e.target.value)} style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&logWeight()}/>
                  <select className="input" value={weightUnit} onChange={e=>setWeightUnit(e.target.value)} style={{width:70,appearance:"none",textAlign:"center"}}>
                    <option>lbs</option><option>kg</option>
                  </select>
                  <button onClick={logWeight} disabled={!weight} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>LOG</button>
                </div>
                {weightLog.length===0?(
                  <div style={{textAlign:"center",padding:"16px",color:"var(--muted)",fontSize:13}}>No weight entries yet.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto"}}>
                    {weightLog.map((e,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"var(--bg3)",borderRadius:10,border:"1px solid var(--border)"}}>
                        <span style={{fontSize:14,fontWeight:600}}>{e.w} {e.unit}</span>
                        <span style={{fontSize:12,color:"var(--muted)"}}>{fmtDate(e.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{height:1,background:"var(--border)",margin:"4px 0"}}/>
              {/* Zelle contact — private */}
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)",marginBottom:4}}>ZELLE CONTACT <span style={{fontSize:10,letterSpacing:1}}>— private, for challenge payments</span></div>
                <input className="input" placeholder="Phone or email for Zelle" value={zelleInfo} onChange={e=>setZelleInfo(e.target.value)} maxLength={50}/>
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button className="btn-primary" onClick={saveZelle} disabled={zelleInfo===profile?.zelleContact}>{zelleSaved?"✓ SAVED!":"SAVE ZELLE"}</button>
                  {profile?.zelleContact&&<button className="btn-ghost" onClick={()=>{setZelleInfo("");onSaveZelle("");}}>Clear</button>}
                </div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>Only used when someone taps "Pay via Zelle" on a challenge you created. Never shown to others.</div>
              </div>
            </div>
          )}

          {/* AI TRAINER tab */}
          {tab==="ai"&&(
            <AITrainerProfileTab
              currentUser={currentUser}
              profile={profile}
              profiles={profiles}
              onSaveProfile={onSaveProfile}
            />
          )}

          {/* REST DAYS tab */}
          {tab==="rest"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {challenges.some(ch=>ch.status==="active"&&Object.keys(ch.participants||{}).includes(currentUser)&&ch.participants[currentUser]?.status==="accepted")?(
                <div style={{padding:"14px",background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.3)",borderRadius:12,textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:6}}>🔒</div>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--orange)",marginBottom:4}}>LOCKED DURING CHALLENGE</div>
                  <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>You can't change rest days while in an active challenge. Finish or forfeit all active challenges first.</div>
                </div>
              ):(
                <>
                  <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>
                    Pick your personal rest days. Minimum 2 required.<br/>
                    <span style={{color:"var(--orange)"}}>Note: the gym is always closed on weekends.</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
                    {DAY_NAMES.map((name,i)=>{
                      const sel=restDays.includes(i);
                      const isWE=i===0||i===6;
                      return(
                        <button key={i} onClick={()=>toggleRestDay(i)} style={{
                          padding:"10px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                          background:sel?"rgba(124,92,191,0.25)":"var(--bg3)",
                          border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                          color:sel?"var(--accent2)":isWE?"var(--muted)":"var(--text)",
                          fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,
                          opacity:!sel&&restDays.length>=2?0.6:1,
                        }}>
                          <div>{name}</div>
                          {sel&&<div style={{fontSize:9,marginTop:2}}>REST</div>}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>Selected: {restDays.map(d=>DAY_NAMES[d]).join(", ")} ({restDays.length} days)</div>
                  <button className="btn-primary" onClick={saveRestDays}>{restSaved?"✓ SAVED!":"SAVE REST DAYS"}</button>
                </>
              )}
            </div>
          )}

          {/* PIN tab */}
          {tab==="pin"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Name change */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>DISPLAY NAME</div>
                <input className="input" placeholder="Your name..." value={newName}
                  onChange={e=>{setNewName(e.target.value.slice(0,20));setNameErr("");setNameDone(false);}}
                  maxLength={20}/>
                {nameErr&&<div style={{color:"var(--red)",fontSize:13}}>{nameErr}</div>}
                {nameDone&&<div style={{color:"var(--green)",fontSize:13}}>✓ Name updated!</div>}
                <button className="btn-primary" onClick={()=>onChangeName(newName.trim(),setNameErr,setNameDone)}
                  disabled={!newName.trim()||newName.trim()===currentUser}>
                  UPDATE NAME
                </button>
              </div>
              <div style={{height:1,background:"var(--border)"}}/>
              {/* PIN change */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>CHANGE PIN</div>
                <input className="input" type="password" inputMode="numeric" placeholder="New 4-digit PIN" value={pin1} onChange={e=>setPin1(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
                <input className="input" type="password" inputMode="numeric" placeholder="Confirm new PIN" value={pin2} onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
                {pinErr&&<div style={{color:"var(--red)",fontSize:13}}>{pinErr}</div>}
                {pinDone&&<div style={{color:"var(--green)",fontSize:13}}>✓ PIN updated!</div>}
                <button className="btn-primary" onClick={changePin} disabled={pin1.length!==4||pin2.length!==4}>UPDATE PIN</button>
              </div>
            </div>
          )}

        </div>{/* end min-height wrapper */}

                <button className="btn-ghost" style={{width:"100%",marginTop:12}} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
