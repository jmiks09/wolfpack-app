import { useState, useEffect, useRef, useCallback } from "react";
import { fsGet, fsSet, fsDelete, fsListen, requestNotifPermission, onForegroundMessage } from "./firebase";

const INVITE_CODE = "WOLF2026";
const WORKOUT_TYPES = [
  {id:"lift",icon:"🏋️",label:"Lifting"},{id:"run",icon:"🏃",label:"Running"},
  {id:"bike",icon:"🚴",label:"Cycling"},{id:"swim",icon:"🏊",label:"Swimming"},
  {id:"yoga",icon:"🧘",label:"Yoga"},{id:"hiit",icon:"⚡",label:"HIIT"},
  {id:"sport",icon:"⚽",label:"Sport"},{id:"walk",icon:"🚶",label:"Walking"},
  {id:"other",icon:"💪",label:"Other"},
];
const QUOTES = [
  "Your only competition is who you were yesterday.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "One workout at a time. One day at a time.","Earn it.","Make yourself proud.",
  "The wolf on the hill is never as hungry as the wolf climbing it.",
  "Train insane or remain the same.","Sweat is just fat crying.",
  "Success starts with self-discipline.",
];
const BADGES = [
  {id:"first_blood",icon:"🩸",label:"First Blood",desc:"Log your first workout"},
  {id:"week_warrior",icon:"⚔️",label:"Week Warrior",desc:"7-day streak"},
  {id:"consistent",icon:"🔥",label:"On Fire",desc:"3-week streak"},
  {id:"monthly",icon:"📅",label:"Iron Month",desc:"30-day streak"},
  {id:"centurion",icon:"💯",label:"Centurion",desc:"100 workouts logged"},
  {id:"social",icon:"🐺",label:"Pack Leader",desc:"Post 10 times in feed"},
  {id:"challenger",icon:"⚡",label:"Challenger",desc:"Complete a challenge"},
  {id:"gym_rat",icon:"🏋️",label:"Gym Rat",desc:"Book gym 20 times"},
  {id:"penalty_free",icon:"🛡️",label:"Clean Slate",desc:"Win a penalty challenge"},
];
const WOLF_AVATARS = ["🐺","🦊","🦁","🐻","🐯","🦝","🐸","🦅","🦈","🐲","🦄","🦋"];
const GYM_HOURS = Array.from({length:14},(_,i)=>{const h=6+i;return h<12?`${h}:00 AM`:h===12?`12:00 PM`:`${h-12}:00 PM`;});
const NAV=[{id:"pack",icon:"🐺",label:"PACK"},{id:"feed",icon:"💬",label:"FEED"},{id:"gym",icon:"🏋️",label:"GYM"},{id:"challenges",icon:"⚔️",label:"CHALLENGES"},{id:"stats",icon:"📊",label:"STATS"}];

const todayStr=()=>new Date().toISOString().split("T")[0];
const isWeekend=d=>{const x=new Date(d+"T00:00:00");return x.getDay()===0||x.getDay()===6;};
const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const getRestDays=profile=>profile?.restDays||[0,6]; // default Sat/Sun
const isRestDay=(d,profile)=>{const x=new Date(d+"T00:00:00");return getRestDays(profile).includes(x.getDay());};
const next7Days=()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d.toISOString().split("T")[0];});
const fmtDate=d=>new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const fmtTime=ts=>new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const getWeekStart=d=>{const x=new Date(d+"T00:00:00");x.setDate(x.getDate()-x.getDay());return x.toISOString().split("T")[0];};
const getDateRange=(s,e)=>{const dates=[];const sd=new Date(s+"T00:00:00"),ed=new Date(e+"T00:00:00");for(let d=new Date(sd);d<=ed;d.setDate(d.getDate()+1))dates.push(d.toISOString().split("T")[0]);return dates;};
const getWeekdays=(s,e)=>getDateRange(s,e).filter(d=>!isWeekend(d));
// Get workout days for a member based on their personal rest days
const getWorkoutDays=(s,e,profile)=>getDateRange(s,e).filter(d=>!isRestDay(d,profile));
function getStreak(h,n,profile){let s=0;const b=new Date();for(let i=0;i<365;i++){const d=new Date(b);d.setDate(b.getDate()-i);const k=d.toISOString().split("T")[0];if(isRestDay(k,profile))continue;if(h[k]?.[n]?.done)s++;else if(i>0)break;}return s;}
function getTotalWorkouts(h,n){return Object.values(h).filter(d=>d?.[n]?.done).length;}
function getQuote(){return QUOTES[new Date().getDate()%QUOTES.length];}
function calcPenalties(c,h,profiles){
  if(!c.penaltyAmt||c.penaltyAmt<=0||!c.startDate||!c.endDate)return{};
  const parts=Object.keys(c.participants||{});
  const cap=todayStr()<c.endDate?todayStr():c.endDate;
  const maxRestPerWeek=c.maxRestDays??2; // default 2 rest days allowed per week
  const r={};
  parts.forEach(m=>{
    // If forfeited, use forfeited amount
    const pData=c.participants[m];
    if(pData?.forfeited){r[m]={totalOwed:c.forfeitCap||0,byWeek:{},forfeited:true};return;}
    const profile=profiles?.[m];
    // Get all calendar days in range (not filtered by rest days)
    const allDays=getDateRange(c.startDate,cap);
    const byWeek={};
    // Group days by week and calc missed per week
    allDays.forEach(d=>{
      const wk=getWeekStart(d);
      if(!byWeek[wk])byWeek[wk]={days:[],worked:0,rested:0};
      byWeek[wk].days.push(d);
      if(h[d]?.[m]?.done) byWeek[wk].worked++;
      else if(isRestDay(d,profile)) byWeek[wk].rested++;
    });
    // For each week: penalize days missed beyond allowed rest days
    let totalOwed=0;
    const byWeekAmt={};
    Object.entries(byWeek).forEach(([wk,wdata])=>{
      const totalDays=wdata.days.length;
      const workedDays=wdata.worked;
      const scheduledRestDays=wdata.days.filter(d=>isRestDay(d,profile)).length;
      // Days not worked and not on their schedule = missed workout days
      const missedWorkoutDays=wdata.days.filter(d=>!h[d]?.[m]?.done&&!isRestDay(d,profile)).length;
      // Extra rest = rest days taken beyond the max allowed
      const extraRest=Math.max(0,scheduledRestDays-maxRestPerWeek);
      const penalizedDays=missedWorkoutDays+extraRest;
      if(penalizedDays>0){const amt=penalizedDays*c.penaltyAmt;totalOwed+=amt;byWeekAmt[wk]=amt;}
    });
    // Cap at forfeit amount if set
    if(c.forfeitCap&&totalOwed>=c.forfeitCap) totalOwed=c.forfeitCap;
    r[m]={totalOwed,byWeek:byWeekAmt,forfeited:false};
  });
  return r;
}
function computeBadges(n,h,feed,ch,profile){const e=[];const t=getTotalWorkouts(h,n),s=getStreak(h,n,profile),p=feed.filter(x=>x.author===n).length;const cc=ch.filter(c=>c.participants?.[n]?.done||(c.goalType==="dateRange"&&c.startDate&&c.endDate&&getWorkoutDays(c.startDate,c.endDate,profile).filter(d=>h[d]?.[n]?.done).length>=c.goal)).length;if(t>=1)e.push("first_blood");if(s>=7)e.push("week_warrior");if(s>=21)e.push("consistent");if(s>=30)e.push("monthly");if(t>=100)e.push("centurion");if(p>=10)e.push("social");if(cc>=1)e.push("challenger");return e;}

function launchConfetti(){const cv=document.getElementById("confetti-canvas");if(!cv)return;const ctx=cv.getContext("2d");cv.width=window.innerWidth;cv.height=window.innerHeight;const ps=Array.from({length:80},()=>({x:Math.random()*cv.width,y:-10,r:Math.random()*6+4,c:["#7c5cbf","#ff6b35","#f1c40f","#2ecc71","#e74c3c"][Math.floor(Math.random()*5)],vx:(Math.random()-.5)*4,vy:Math.random()*4+2,life:1}));let fr;const draw=()=>{ctx.clearRect(0,0,cv.width,cv.height);let alive=false;ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=.008;if(p.y<cv.height&&p.life>0)alive=true;ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.r,p.r);});ctx.globalAlpha=1;if(alive)fr=requestAnimationFrame(draw);else ctx.clearRect(0,0,cv.width,cv.height);};draw();setTimeout(()=>{cancelAnimationFrame(fr);ctx.clearRect(0,0,cv.width,cv.height);},4000);}
function Toast({msg}){return msg?<div className="toast">{msg}</div>:null;}
function AvatarDisplay({profile,size=40}){if(profile?.avatarImg)return<img src={profile.avatarImg} alt="av" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>;return<div className="avatar" style={{width:size,height:size,background:"var(--bg2)",fontSize:size*.55,flexShrink:0}}>{profile?.avatar||"🐺"}</div>;}
function readFileAsDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
function compressImage(dataUrl,maxPx=200){return new Promise(res=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;if(w>maxPx||h>maxPx){if(w>h){h=Math.round(h*(maxPx/w));w=maxPx;}else{w=Math.round(w*(maxPx/h));h=maxPx;}}const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);res(cv.toDataURL("image/jpeg",.75));};img.onerror=()=>res(dataUrl);img.src=dataUrl;});}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function Onboarding({onJoin}){
  const [step,setStep]=useState("invite");
  const [invite,setInvite]=useState("");
  const [name,setName]=useState("");
  const [avatar,setAvatar]=useState("🐺");
  const [avatarImg,setAvatarImg]=useState(null);
  const [pin,setPin]=useState("");
  const [pin2,setPin2]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const fileRef=useRef();

  const next=s=>{setError("");setStep(s);};
  const handleInvite=()=>{if(invite.trim().toUpperCase()!==INVITE_CODE)return setError("Wrong invite code.");next("name");};
  const handleName=()=>{if(!name.trim())return setError("Enter your name");next("avatar");};
  const handlePhoto=async e=>{const f=e.target.files?.[0];if(!f)return;const raw=await readFileAsDataURL(f);const comp=await compressImage(raw);setAvatarImg(comp);};
  const handlePin=async()=>{
    if(pin.length!==4)return setError("PIN must be exactly 4 digits");
    if(pin!==pin2)return setError("PINs don't match");
    setError("");setLoading(true);
    try{await onJoin(name.trim(),avatarImg?null:avatar,pin,avatarImg||null);}
    catch(e){setError("Connection error. Try again.");setLoading(false);}
  };

  const wrap={width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:8};
  const lbl={fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"};

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100dvh",padding:"36px 24px 100px",gap:16,overflowY:"auto",WebkitOverflowScrolling:"touch",background:"var(--bg)"}}>
      <div style={{fontSize:64}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:38,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      <div style={{color:"var(--muted)",fontSize:14,marginTop:-8}}>fitness accountability</div>

      {step==="invite"&&<div style={wrap}>
        <div style={lbl}>ENTER INVITE CODE</div>
        <input className="input" placeholder="Invite code..." value={invite} onChange={e=>setInvite(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleInvite()} style={{textTransform:"uppercase",letterSpacing:4,textAlign:"center",fontSize:20}} autoFocus/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handleInvite}>CONTINUE →</button>
      </div>}

      {step==="name"&&<div style={wrap}>
        <div style={lbl}>YOUR NAME</div>
        <input className="input" placeholder="Enter your name..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleName()} maxLength={20} autoFocus/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handleName}>CONTINUE →</button>
      </div>}

      {step==="avatar"&&<div style={wrap}>
        <div style={lbl}>PICK YOUR LOOK</div>
        {/* photo box */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:16,background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
          {avatarImg
            ?<img src={avatarImg} alt="av" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--accent)"}}/>
            :<div style={{width:80,height:80,borderRadius:"50%",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,border:"2px dashed var(--border)"}}>📷</div>
          }
          <button className="btn-ghost" onClick={()=>fileRef.current.click()} style={{fontSize:13}}>{avatarImg?"Change Photo":"Upload Photo"}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
          {avatarImg&&<button className="btn-ghost" onClick={()=>setAvatarImg(null)} style={{fontSize:12,color:"var(--muted)"}}>Remove photo</button>}
        </div>
        {/* emoji grid — always shown */}
        <div style={{textAlign:"center",fontSize:12,color:"var(--muted)"}}>— or pick an emoji —</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {WOLF_AVATARS.map(a=>(
            <button key={a} onClick={()=>{setAvatar(a);setAvatarImg(null);}} style={{padding:10,fontSize:26,borderRadius:12,cursor:"pointer",background:!avatarImg&&avatar===a?"rgba(124,92,191,0.25)":"var(--bg3)",border:!avatarImg&&avatar===a?"2px solid var(--accent)":"2px solid var(--border)",transition:"all .15s"}}>{a}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>next("pin")}>CONTINUE →</button>
      </div>}

      {step==="pin"&&<div style={wrap}>
        <div style={lbl}>SET YOUR 4-DIGIT PIN</div>
        <input className="input" type="password" inputMode="numeric" placeholder="4-digit PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} autoFocus style={{letterSpacing:10,textAlign:"center",fontSize:24}}/>
        <input className="input" type="password" inputMode="numeric" placeholder="Confirm PIN" value={pin2} onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} onKeyDown={e=>e.key==="Enter"&&handlePin()} style={{letterSpacing:10,textAlign:"center",fontSize:24}}/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handlePin} disabled={loading}>{loading?"JOINING...":"JOIN THE PACK 🐺"}</button>
      </div>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({members,profiles,onLogin,adminName}){
  const [sel,setSel]=useState(null);
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!sel)return;setLoading(true);
    const stored=await fsGet(`wolfpack/pin_${sel}`);
    if(!stored?.pin){onLogin(sel);return;}
    if(stored.pin===pin){onLogin(sel);}
    else{setErr("Wrong PIN. Try again.");setLoading(false);}
  };
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100dvh",padding:"32px 24px",gap:16,background:"var(--bg)"}}>
      <div style={{fontSize:56}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:5,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      {!sel?(
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:3,color:"var(--muted)",marginBottom:4}}>WHO ARE YOU?</div>
          {members.map(m=>(
            <button key={m} onClick={()=>setSel(m)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer",width:"100%"}}>
              <AvatarDisplay profile={profiles[m]} size={40}/>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{m}</div>
                {m===adminName&&<div style={{fontSize:11,color:"var(--accent2)"}}>Pack Admin</div>}
              </div>
            </button>
          ))}
          <div style={{marginTop:8,color:"var(--muted)",fontSize:13,textAlign:"center"}}>New here? <span style={{color:"var(--accent2)",cursor:"pointer"}} onClick={()=>onLogin(null,"join")}>Join the Pack</span></div>
        </div>
      ):(
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--bg3)",borderRadius:12}}>
            <AvatarDisplay profile={profiles[sel]} size={40}/>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2}}>{sel}</div>
          </div>
          <input className="input" type="password" inputMode="numeric" placeholder="Enter PIN..." value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} autoFocus maxLength={4} onKeyDown={e=>e.key==="Enter"&&go()} style={{letterSpacing:10,textAlign:"center",fontSize:24}}/>
          {err&&<div style={{color:"var(--red)",fontSize:13}}>{err}</div>}
          <button className="btn-primary" onClick={go} disabled={loading}>{loading?"...":"LET ME IN 🐺"}</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={()=>{setSel(null);setPin("");setErr("");}}>← Back</button>
        </div>
      )}
    </div>
  );
}

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
// Reset PIN = clears their PIN from Firestore. They can log in freely until they set a new one.
function AdminPanel({members,profiles,currentUser,adminName,onResetPin,onDeleteAccount,onClose}){
  const [confirmDel,setConfirmDel]=useState(null);
  const [busy,setBusy]=useState(null);
  const [resetDone,setResetDone]=useState([]);
  if(currentUser!==adminName)return null;
  const doReset=async m=>{setBusy(`r${m}`);await onResetPin(m);setBusy(null);setResetDone(d=>[...d,m]);};
  const doDelete=async m=>{setBusy(`d${m}`);await onDeleteAccount(m);setBusy(null);setConfirmDel(null);};
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,marginBottom:4}}>ADMIN PANEL</div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>
          <b>Reset PIN</b> — clears their PIN so they can log straight in (no PIN required until they set a new one).<br/>
          <b>Delete</b> — permanently removes them from the pack.
        </div>
        {members.filter(m=>m!==currentUser).map(m=>(
          <div key={m} style={{marginBottom:10,background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
              <AvatarDisplay profile={profiles[m]} size={36}/>
              <div style={{flex:1,fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:1}}>{m}</div>
              <button onClick={()=>doReset(m)} disabled={!!busy} style={{padding:"6px 10px",background:"rgba(124,92,191,0.15)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:8,cursor:"pointer",color:"var(--accent2)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,marginRight:6}}>
                {busy===`r${m}`?"...":resetDone.includes(m)?"✓ DONE":"RESET PIN"}
              </button>
              <button onClick={()=>setConfirmDel(confirmDel===m?null:m)} disabled={!!busy} style={{padding:"6px 10px",background:"rgba(231,76,60,0.15)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:8,cursor:"pointer",color:"var(--red)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                DELETE
              </button>
            </div>
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
        <button className="btn-ghost" style={{width:"100%",marginTop:8}} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function NotifBanner({currentUser}){
  const [vis,setVis]=useState(false);
  const [asking,setAsking]=useState(false);
  useEffect(()=>{if("Notification" in window&&Notification.permission==="default")setVis(true);},[]);
  const enable=async()=>{setAsking(true);const t=await requestNotifPermission();if(t&&currentUser)await fsSet(`wolfpack/fcm_${currentUser}`,{token:t,ts:Date.now()});setVis(false);setAsking(false);};
  if(!vis)return null;
  return(
    <div style={{margin:"8px 16px 0",padding:"12px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:14,display:"flex",alignItems:"center",gap:10}}>
      <div style={{fontSize:22}}>🔔</div>
      <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>ENABLE NOTIFICATIONS</div><div style={{fontSize:11,color:"var(--muted)"}}>Get alerts when the pack logs workouts</div></div>
      <button onClick={enable} disabled={asking} style={{padding:"6px 12px",background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1}}>{asking?"...":"ALLOW"}</button>
      <button onClick={()=>setVis(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>
    </div>
  );
}

// ── PACK GOALS BOARD ─────────────────────────────────────────────────────────
function PackGoals({currentUser,packGoals,onAddGoal,onCheer,onDeleteGoal}){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const sub=()=>{if(!text.trim())return;onAddGoal(text.trim());setText("");setOpen(false);};
  const myGoal=packGoals.find(g=>g.author===currentUser);
  return(
    <div style={{margin:"8px 16px 0"}}>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",marginBottom:8}}>PACK GOALS</div>
      {packGoals.length===0&&!open&&(
        <div style={{textAlign:"center",padding:"16px",background:"var(--bg3)",borderRadius:14,border:"1px dashed var(--border)",marginBottom:8}}>
          <div style={{fontSize:12,color:"var(--muted)"}}>No goals posted yet. Set one for the pack to see!</div>
        </div>
      )}
      {packGoals.map(g=>(
        <div key={g.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)",marginBottom:8}}>
          <div style={{fontSize:22}}>🎯</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{g.text}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{g.author}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>onCheer(g.id,currentUser)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,opacity:(g.cheers||[]).includes(currentUser)?1:0.4}}>🔥</button>
            <span style={{fontSize:12,color:"var(--muted)"}}>{(g.cheers||[]).length||""}</span>
            {g.author===currentUser&&<button onClick={()=>onDeleteGoal(g.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,marginLeft:2}}>×</button>}
          </div>
        </div>
      ))}
      {!myGoal&&!open&&(
        <button onClick={()=>setOpen(true)} style={{width:"100%",padding:"10px",background:"rgba(124,92,191,0.1)",border:"1px dashed rgba(124,92,191,0.4)",borderRadius:12,cursor:"pointer",color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>+ SET YOUR GOAL</button>
      )}
      {open&&(
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <input className="input" placeholder="My goal is..." value={text} onChange={e=>setText(e.target.value)} maxLength={80} autoFocus style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&sub()}/>
          <button onClick={sub} disabled={!text.trim()} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>POST</button>
          <button onClick={()=>{setOpen(false);setText("");}} style={{padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✕</button>
        </div>
      )}
    </div>
  );
}

function PackTab({currentUser,members,profiles,history,sharedData,onLogWorkout,adminName,onOpenAdmin,packGoals,onAddGoal,onCheer,onDeleteGoal,onOpenProfile}){
  const key=todayStr(),td=sharedData[key]||{},my=td[currentUser],str=getStreak(history,currentUser,profiles[currentUser]),tot=getTotalWorkouts(history,currentUser),we=isRestDay(key,profiles[currentUser]);
  const sorted=[...members].sort((a,b)=>{const sa=getStreak(history,a),sb=getStreak(history,b);if(sb!==sa)return sb-sa;return b===currentUser?1:a===currentUser?-1:0;});

  return(
    <div>
      {/* Quote */}
      <div style={{padding:"14px 16px 8px"}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",marginBottom:5}}>TODAY'S HOWL</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontStyle:"italic",lineHeight:1.5}}>"{getQuote()}"</div>
      </div>

      <NotifBanner currentUser={currentUser}/>

      {/* Log workout / rest day */}
      <div style={{padding:"10px 16px 4px"}}>
        {we?(
          <div style={{padding:"12px 16px",background:"var(--bg3)",borderRadius:14,textAlign:"center"}}><div style={{fontSize:24,marginBottom:4}}>😴</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>REST DAY — YOU EARNED IT</div></div>
        ):!my?.done?(
          <button className="btn-primary" onClick={onLogWorkout}>🐺 LOG TODAY'S WORKOUT</button>
        ):(
          <div style={{background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:16,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:26}}>{my.workoutIcon}</div>
              <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,color:"var(--accent2)"}}>✓ {my.workoutLabel?.toUpperCase()}</div><div style={{fontSize:11,color:"var(--muted)"}}>{my.time}</div></div>
              {my.note&&<div style={{fontSize:12,color:"var(--muted)",maxWidth:110,textAlign:"right",fontStyle:"italic"}}>"{my.note}"</div>}
            </div>
            <button className="btn-ghost" onClick={onLogWorkout} style={{marginTop:10,width:"100%",fontSize:12}}>+ Log Another</button>
          </div>
        )}
      </div>

      {/* My stats + admin */}
      <div style={{display:"flex",gap:8,padding:"10px 16px 6px",flexWrap:"wrap"}}>
        <div className="pill pill-purple">🔥 {str} DAY STREAK</div>
        <div className="pill pill-orange">💪 {tot} TOTAL</div>
        {currentUser===adminName&&<button onClick={onOpenAdmin} style={{padding:"5px 12px",borderRadius:20,background:"rgba(124,92,191,0.2)",border:"1px solid rgba(124,92,191,0.3)",color:"var(--accent2)",fontSize:12,cursor:"pointer"}}>⚙️ Admin</button>}
      </div>

      {/* ── SINGLE COLUMN MEMBER CARDS ── */}
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",padding:"6px 16px 8px"}}>THE PACK</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 16px 16px"}}>
        {sorted.map((m,i)=>{
          const done=!!td[m]?.done,isMe=m===currentUser;
          const ms=getStreak(history,m,profiles[m]);
          const wt=td[m]?.workoutIcon||"";
          const restToday=isRestDay(key,profiles[m]);
          return(
            <div key={m} onClick={isMe?onOpenProfile:undefined} style={{
              position:"relative",borderRadius:18,overflow:"hidden",
              cursor:isMe?"pointer":"default",
              background:done
                ?"linear-gradient(135deg,rgba(46,204,113,0.12),rgba(46,204,113,0.04))"
                :restToday?"rgba(255,255,255,0.03)"
                :isMe?"rgba(124,92,191,0.1)":"var(--card)",
              border:done?"1px solid rgba(46,204,113,0.3)":isMe?"1px solid rgba(124,92,191,0.35)":"1px solid var(--border)",
              padding:"14px 16px",
              display:"flex",alignItems:"center",gap:14,
            }}>
              {/* left accent bar */}
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:done?"linear-gradient(180deg,#2ecc71,#27ae60)":isMe?"linear-gradient(180deg,var(--accent),var(--orange))":"transparent",borderRadius:"18px 0 0 18px"}}/>
              {/* rank */}
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"var(--muted)",width:20,textAlign:"center",flexShrink:0}}>{i+1}</div>
              {/* avatar */}
              <AvatarDisplay profile={profiles[m]} size={48}/>
              {/* info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,color:isMe?"var(--accent2)":"var(--text)"}}>{m}</span>
                  {isMe&&<span style={{fontSize:10,color:"var(--accent2)",background:"rgba(124,92,191,0.2)",padding:"1px 5px",borderRadius:4}}>YOU</span>}
                </div>
                <div style={{fontSize:12,color:"var(--muted)"}}>🔥 {ms} day streak</div>
                {done&&wt&&<div style={{fontSize:12,color:"var(--green)",marginTop:2}}>{wt}</div>}
              </div>
              {/* status */}
              <div style={{
                flexShrink:0,padding:"6px 14px",borderRadius:20,
                background:done?"rgba(46,204,113,0.15)":restToday?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.04)",
                border:done?"1px solid rgba(46,204,113,0.4)":"1px solid var(--border)",
                fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,
                color:done?"var(--green)":restToday?"var(--muted)":"var(--muted)",
              }}>
                {done?"✓ DONE":restToday?"😴 REST":"○ PENDING"}
              </div>
              {isMe&&<div style={{position:"absolute",top:10,right:12,fontSize:11,color:"var(--muted)"}}>👤</div>}
            </div>
          );
        })}
      </div>

      {/* Pack Goals */}
      <PackGoals currentUser={currentUser} packGoals={packGoals} onAddGoal={onAddGoal} onCheer={onCheer} onDeleteGoal={onDeleteGoal}/>
      <div style={{height:16}}/>
    </div>
  );
}

function FeedTab({currentUser,profiles,feed,onPost,onLike,onDelete}){
  const [open,setOpen]=useState(false);const[text,setText]=useState("");
  const sub=()=>{if(!text.trim())return;onPost(text.trim());setText("");setOpen(false);};
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}><button className="btn-primary" onClick={()=>setOpen(true)}>💬 POST TO THE PACK</button></div>
      {feed.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:12}}>🐺</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>THE FEED IS EMPTY</div></div>}
      {feed.map(p=>{const liked=(p.likes||[]).includes(currentUser),isMe=p.author===currentUser;return(
        <div key={p.id} className="card">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <AvatarDisplay profile={profiles[p.author]} size={36}/>
            <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>{p.author}</div><div style={{fontSize:11,color:"var(--muted)"}}>{fmtTime(p.ts)}</div></div>
            {isMe&&<button onClick={()=>onDelete(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>}
          </div>
          <div style={{fontSize:15,lineHeight:1.5,marginBottom:10}}>{p.text}</div>
          <button onClick={()=>onLike(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:liked?"var(--orange)":"var(--muted)",display:"flex",alignItems:"center",gap:5,fontSize:13}}>{liked?"🔥":"🤍"} {(p.likes||[]).length||0} {(p.likes||[]).length===1?"like":"likes"}</button>
        </div>
      );})}
      {open&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}><div className="modal"><div className="modal-handle"/><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>POST TO THE PACK</div><textarea className="input" rows={4} placeholder="What's on your mind, wolf?..." value={text} onChange={e=>setText(e.target.value)} style={{resize:"none",marginBottom:12}} autoFocus/><button className="btn-primary" onClick={sub} disabled={!text.trim()}>POST 🐺</button></div></div>}
    </div>
  );
}

function GymTab({currentUser,gymSlots,onBook,onCancel}){
  const [sel,setSel]=useState(todayStr());
  const dates=next7Days(),daySlots=gymSlots.filter(s=>s.date===sel),mySlots=gymSlots.filter(s=>s.bookedBy===currentUser);
  return(
    <div>
      <div style={{display:"flex",gap:8,padding:"12px 16px",overflowX:"auto"}}>
        {dates.map(d=>{const act=d===sel,dd=new Date(d+"T00:00:00"),we=isWeekend(d);return<button key={d} onClick={()=>setSel(d)} style={{flexShrink:0,minWidth:56,padding:"8px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",background:act?"linear-gradient(135deg,var(--accent),var(--orange))":"var(--bg3)",border:"none",color:we&&!act?"var(--muted)":"#fff",opacity:we?.6:1}}><div style={{fontSize:10,opacity:.8}}>{dd.toLocaleDateString("en-US",{weekday:"short"})}</div><div style={{fontSize:17,fontWeight:700}}>{dd.getDate()}</div>{we&&<div style={{fontSize:9,opacity:.7}}>REST</div>}</button>;})}
      </div>
      {mySlots.length>0&&<><div className="section-label">MY RESERVATIONS</div>{mySlots.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:12,margin:"0 16px 8px",padding:"12px 14px",background:"rgba(124,92,191,0.1)",borderRadius:12,border:"1px solid rgba(124,92,191,0.25)"}}><span style={{fontSize:20}}>🏋️</span><div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>{s.time}</div><div style={{fontSize:11,color:"var(--muted)"}}>{fmtDate(s.date)}</div></div><button onClick={()=>onCancel(s.id)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>Cancel</button></div>)}</>}
      <div className="section-label">{fmtDate(sel)}{isWeekend(sel)&&" — REST DAY"}</div>
      {isWeekend(sel)?<div style={{textAlign:"center",padding:"30px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:8}}>😴</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2}}>GYM CLOSED ON WEEKENDS</div></div>:
        GYM_HOURS.map(time=>{
          const booked=daySlots.filter(s=>s.time===time),mine=booked.find(s=>s.bookedBy===currentUser),full=booked.length>=2;
          return<div key={time} style={{display:"flex",alignItems:"center",gap:10,margin:"0 16px 8px",padding:"12px 14px",background:"var(--card)",borderRadius:12,border:`1px solid ${mine?"rgba(124,92,191,0.3)":full?"rgba(231,76,60,0.2)":"var(--border)"}`}}><div style={{width:68,fontFamily:"'Bebas Neue',cursive",fontSize:13,color:mine?"var(--accent2)":full?"var(--red)":"var(--text)"}}>{time}</div><div style={{flex:1,display:"flex",gap:5,flexWrap:"wrap"}}>{booked.map(s=><span key={s.id} style={{fontSize:12,background:"var(--bg3)",padding:"2px 8px",borderRadius:8,color:"var(--muted)"}}>{s.bookedBy}</span>)}{booked.length===0&&<span style={{fontSize:12,color:"var(--muted)"}}>Open</span>}</div>{mine?<button onClick={()=>onCancel(mine.id)} style={{background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>Cancel</button>:full?<span style={{fontSize:12,color:"var(--red)",fontWeight:700}}>FULL</span>:<button onClick={()=>onBook(sel,time)} style={{background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>BOOK</button>}</div>;
        })
      }
    </div>
  );
}

function EditChallengeModal({challenge,members,onSave,onClose}){
  const isDR = challenge.goalType==="dateRange";
  const [title,setTitle]=useState(challenge.title||"");
  const [goal,setGoal]=useState(challenge.goal||30);
  const [unit,setUnit]=useState(challenge.unit||"reps");
  const [startDate,setStartDate]=useState(challenge.startDate||"");
  const [endDate,setEndDate]=useState(challenge.endDate||"");
  const [penalty,setPenalty]=useState(challenge.penalty||"");
  const [penaltyAmt,setPenaltyAmt]=useState(challenge.penaltyAmt||"");
  const [parts,setParts]=useState(Object.keys(challenge.participants||{}));
  const toggle=m=>setParts(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m]);

  const save=()=>{
    if(!title.trim()) return;
    const np={...challenge.participants};
    parts.forEach(m=>{if(!np[m])np[m]={progress:0,done:false};});
    Object.keys(np).forEach(m=>{if(!parts.includes(m))delete np[m];});
    const newGoal=isDR&&startDate&&endDate?getWeekdays(startDate,endDate).length:Number(goal);
    onSave({...challenge,title:title.trim(),goal:newGoal,unit:isDR?"days":unit,startDate:isDR?startDate:challenge.startDate,endDate:isDR?endDate:challenge.endDate,penalty:penalty.trim(),penaltyAmt:penaltyAmt?Number(penaltyAmt):0,participants:np});
    onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>EDIT CHALLENGE</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Challenge name</div>
            <input className="input" value={title} onChange={e=>setTitle(e.target.value)} maxLength={50}/>
          </div>
          {isDR?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Start date</div><input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>End date</div><input className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
              {startDate&&endDate&&<div style={{gridColumn:"1/-1",fontSize:12,color:"var(--accent2)",background:"rgba(124,92,191,0.1)",padding:"8px 12px",borderRadius:8}}>📅 {getWeekdays(startDate,endDate).length} weekdays</div>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div><input className="input" type="number" value={goal} onChange={e=>setGoal(e.target.value)} min={1}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div><select className="input" value={unit} onChange={e=>setUnit(e.target.value)} style={{appearance:"none"}}>{["reps","miles","minutes","lbs","kg","sessions","calories"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
          )}
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty</div><input className="input" placeholder='e.g. "Buys lunch"' value={penalty} onChange={e=>setPenalty(e.target.value)} maxLength={80}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>$ per missed workout</div><input className="input" type="number" placeholder="e.g. 5" value={penaltyAmt} onChange={e=>setPenaltyAmt(e.target.value)} min={0}/></div>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Participants</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {members.map(m=>(
                <button key={m} onClick={()=>toggle(m)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:13,background:parts.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:parts.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:parts.includes(m)?"var(--accent2)":"var(--muted)"}}>
                  {parts.includes(m)?"✓ ":""}{m}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={save} disabled={!title.trim()}>SAVE CHANGES</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PenaltyTracker({challenge:c,history,profiles}){
  const penalties=calcPenalties(c,history,profiles);
  const parts=Object.keys(c.participants||{});
  if(!c.penaltyAmt||c.penaltyAmt<=0||!c.startDate||!c.endDate)return null;
  if(!parts.some(m=>(penalties[m]?.totalOwed||0)>0))return null;
  const cap=todayStr()<c.endDate?todayStr():c.endDate;
  const wks=[...new Set(getWeekdays(c.startDate,cap).map(d=>getWeekStart(d)))].sort();
  return(
    <div style={{marginTop:12,background:"rgba(231,76,60,0.06)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"8px 12px",background:"rgba(231,76,60,0.1)",display:"flex",alignItems:"center",gap:6}}>
        <span>💸</span><span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--red)"}}>PENALTY — ${c.penaltyAmt}/MISSED WORKOUT</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`1fr repeat(${wks.length},60px) 60px`,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{padding:"5px 10px",fontSize:10,color:"var(--muted)"}}>Member</div>
        {wks.map(w=><div key={w} style={{padding:"5px 4px",fontSize:9,color:"var(--muted)",textAlign:"center"}}>{new Date(w+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>)}
        <div style={{padding:"5px 4px",fontSize:10,color:"var(--red)",textAlign:"center",fontWeight:700}}>TOTAL</div>
      </div>
      {parts.map(m=>{const p=penalties[m]||{totalOwed:0,byWeek:{}};return(
        <div key={m} style={{display:"grid",gridTemplateColumns:`1fr repeat(${wks.length},60px) 60px`,borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center"}}>
          <div style={{padding:"8px 10px",display:"flex",alignItems:"center",gap:6}}><AvatarDisplay profile={profiles[m]} size={20}/><span style={{fontSize:12,fontWeight:600}}>{m}</span></div>
          {wks.map(w=>{const a=p.byWeek?.[w]||0;return<div key={w} style={{textAlign:"center",fontSize:12,color:a>0?"var(--red)":"var(--muted)",fontWeight:a>0?700:400}}>{a>0?`$${a}`:"—"}</div>;})}
          <div style={{textAlign:"center",fontSize:13,fontWeight:700,color:p.totalOwed>0?"var(--red)":"var(--green)"}}>{p.totalOwed>0?`$${p.totalOwed}`:"✓"}</div>
        </div>
      );})}
    </div>
  );
}

function ChallengeCard({challenge:c,currentUser,members,profiles,onLog,onDelete,onEdit,onForfeit,history,completed}){
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
  const myAuto=isDR&&c.startDate&&c.endDate?getWorkoutDays(c.startDate,todayStr()<c.endDate?todayStr():c.endDate,profiles?.[currentUser]).filter(d=>history[d]?.[currentUser]?.done).length:null;
  const myProg=myAuto!==null?myAuto:myManual;
  const myGoal=isDR&&c.startDate&&c.endDate?getWorkoutDays(c.startDate,c.endDate,profiles?.[currentUser]).length:c.goal;
  const myPct=Math.min(100,Math.round((myProg/Math.max(myGoal,1))*100));

  // Penalty calc for auto-forfeit prompt
  const penalties=calcPenalties(c,history,profiles);
  const myOwed=penalties[currentUser]?.totalOwed||0;
  const atForfeitCap=c.forfeitCap&&myOwed>=c.forfeitCap;

  const rows=parts.map(m=>{
    const mGoal=isDR&&c.startDate&&c.endDate?getWorkoutDays(c.startDate,c.endDate,profiles?.[m]).length:c.goal;
    const prog=isDR&&c.startDate&&c.endDate?getWorkoutDays(c.startDate,todayStr()<c.endDate?todayStr():c.endDate,profiles?.[m]).filter(d=>history[d]?.[m]?.done).length:(c.participants[m]?.progress||0);
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

      <PenaltyTracker challenge={c} history={history} profiles={profiles}/>

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

function ChallengesTab({currentUser,members,profiles,challenges,history,onAdd,onLogProgress,onDelete,onEditChallenge,onForfeit}){
  const [open,setOpen]=useState(false);
  const defEnd=()=>{const e=new Date();e.setDate(e.getDate()+30);return e.toISOString().split("T")[0];};
  const [form,setForm]=useState({title:"",useDateRange:false,goal:30,unit:"reps",startDate:todayStr(),endDate:defEnd(),penalty:"",penaltyAmt:"",forfeitCap:"",maxRestDays:2,participants:[]});
  useEffect(()=>setForm(f=>({...f,participants:members})),[members]);
  const toggleP=m=>setForm(f=>({...f,participants:f.participants.includes(m)?f.participants.filter(x=>x!==m):[...f.participants,m]}));
  const sub=()=>{
    if(!form.title.trim())return;
    const parts=form.participants.length>0?form.participants:members;
    const goal=form.useDateRange?getDateRange(form.startDate,form.endDate).length:Number(form.goal);
    onAdd({id:Date.now().toString(),title:form.title.trim(),goalType:form.useDateRange?"dateRange":"amount",goal,unit:form.useDateRange?"days":form.unit,startDate:form.useDateRange?form.startDate:null,endDate:form.useDateRange?form.endDate:null,penalty:form.penalty.trim(),penaltyAmt:form.penaltyAmt?Number(form.penaltyAmt):0,forfeitCap:form.forfeitCap?Number(form.forfeitCap):0,maxRestDays:form.useDateRange?Number(form.maxRestDays):null,createdBy:currentUser,createdAt:Date.now(),participants:parts.reduce((a,m)=>({...a,[m]:{progress:0,done:false}}),{}),status:"active"});
    setOpen(false);
  };
  const active=challenges.filter(c=>c.status==="active"),done=challenges.filter(c=>c.status!=="active");
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}><button className="btn-primary" onClick={()=>setOpen(true)}>⚔️ CREATE CHALLENGE</button></div>
      {active.length===0&&done.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:12}}>⚔️</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>NO ACTIVE CHALLENGES</div></div>}
      {active.length>0&&<div className="section-label">ACTIVE</div>}
      {active.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} members={members} profiles={profiles} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} onForfeit={onForfeit} history={history}/>)}
      {done.length>0&&<div className="section-label" style={{marginTop:8}}>COMPLETED</div>}
      {done.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} members={members} profiles={profiles} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} onForfeit={onForfeit} history={history} completed/>)}
      {open&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}><div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>NEW CHALLENGE</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input className="input" placeholder="Challenge name..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoFocus maxLength={50}/>
          <div style={{display:"flex",gap:8}}>
            {[{v:false,l:"📊 GOAL AMOUNT"},{v:true,l:"📅 DATE RANGE"}].map(({v,l})=>(
              <button key={String(v)} onClick={()=>setForm({...form,useDateRange:v})} style={{flex:1,padding:10,borderRadius:10,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,background:form.useDateRange===v?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.useDateRange===v?"1px solid var(--accent)":"1px solid var(--border)",color:form.useDateRange===v?"var(--accent2)":"var(--muted)"}}>{l}</button>
            ))}
          </div>
          {!form.useDateRange?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div><input className="input" type="number" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} min={1}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div><select className="input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={{appearance:"none"}}>{["reps","miles","minutes","lbs","kg","sessions","calories"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Start</div><input className="input" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>End</div><input className="input" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
              {form.startDate&&form.endDate&&<div style={{gridColumn:"1/-1",fontSize:12,color:"var(--accent2)",background:"rgba(124,92,191,0.1)",padding:"8px 12px",borderRadius:8}}>📅 {getDateRange(form.startDate,form.endDate).length} total days · your workout days depend on your rest day settings</div>}
            </div>
          )}
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Participants</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{members.map(m=><button key={m} onClick={()=>toggleP(m)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:13,background:form.participants.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.participants.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:form.participants.includes(m)?"var(--accent2)":"var(--muted)"}}>{m}</button>)}</div></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty (optional)</div><input className="input" placeholder='e.g. "Buys lunch"' value={form.penalty} onChange={e=>setForm({...form,penalty:e.target.value})} maxLength={80}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>$ per missed workout</div><input className="input" type="number" placeholder="e.g. 5" value={form.penaltyAmt} onChange={e=>setForm({...form,penaltyAmt:e.target.value})} min={0}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Forfeit cap $ (optional — max they'll ever owe)</div><input className="input" type="number" placeholder="e.g. 50" value={form.forfeitCap} onChange={e=>setForm({...form,forfeitCap:e.target.value})} min={0}/></div>
          {form.useDateRange&&<div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Max rest days per week allowed</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button onClick={()=>setForm(f=>({...f,maxRestDays:Math.max(1,f.maxRestDays-1)}))} style={{width:36,height:36,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--text)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"var(--accent2)"}}>{form.maxRestDays}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>day{form.maxRestDays!==1?"s":""} / week</div>
              </div>
              <button onClick={()=>setForm(f=>({...f,maxRestDays:Math.min(6,f.maxRestDays+1)}))} style={{width:36,height:36,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--text)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:6,textAlign:"center"}}>Anyone taking more than {form.maxRestDays} rest day{form.maxRestDays!==1?"s":""} in a week will be penalized for the extra missed days</div>
          </div>}
          <button className="btn-primary" onClick={sub} disabled={!form.title.trim()} style={{marginTop:4}}>CREATE ⚔️</button>
        </div>
      </div></div>}
    </div>
  );
}

function StatsTab({currentUser,members,profiles,history,challenges,feed}){
  const last30=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);return{date:d.toISOString().split("T")[0],day:d.getDate()};});
  const mb=computeBadges(currentUser,history,feed,challenges,profiles[currentUser]);
  return(
    <div>
      <div className="section-label" style={{marginTop:12}}>LAST 30 DAYS</div>
      <div style={{padding:"0 16px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:5}}>
          {last30.map(({date,day})=>{const done=!!history[date]?.[currentUser]?.done,we=isWeekend(date);return<div key={date} style={{aspectRatio:"1",borderRadius:6,background:done?"linear-gradient(135deg,var(--accent),var(--orange))":we?"rgba(255,255,255,0.02)":"var(--bg3)",border:`1px solid ${we?"rgba(255,255,255,0.03)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:done?"#fff":we?"rgba(255,255,255,0.15)":"var(--muted)"}}>{we?"":day}</div>;})}
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:"var(--muted)"}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"linear-gradient(135deg,var(--accent),var(--orange))",display:"inline-block"}}/>Workout</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"var(--bg3)",border:"1px solid var(--border)",display:"inline-block"}}/>Missed</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"rgba(255,255,255,0.02)",display:"inline-block"}}/>Weekend</span>
        </div>
      </div>
      <div className="section-label">BADGES</div>
      <div className="badge-grid" style={{marginBottom:16}}>
        {BADGES.map(b=>{const earned=mb.includes(b.id);return<div key={b.id} className={`badge-item ${earned?"earned":"locked"}`}><div style={{fontSize:28,marginBottom:4}}>{b.icon}</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1}}>{b.label}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2,lineHeight:1.3}}>{b.desc}</div></div>;})}
      </div>
      <div className="section-label">PACK COMPARISON</div>
      {[...members].sort((a,b)=>getTotalWorkouts(history,b)-getTotalWorkouts(history,a)).map((m,i)=>{
        const t=getTotalWorkouts(history,m),s=getStreak(history,m),mx=Math.max(...members.map(x=>getTotalWorkouts(history,x)),1);
        return<div key={m} className="member-row" style={{margin:"0 16px 8px"}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"var(--muted)",width:22}}>{i+1}</div><AvatarDisplay profile={profiles[m]} size={36}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{m}{m===currentUser&&" (you)"}</span><span style={{fontSize:12,color:"var(--muted)"}}>{t} workouts</span></div><div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${(t/mx)*100}%`}}/></div><div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>🔥{s} day streak</div></div></div>;
      })}
    </div>
  );
}

// ── PROFILE MODAL ────────────────────────────────────────────────────────────
function ProfileModal({currentUser,profile,profiles,history,challenges,onClose,onSaveWeight,onSaveGoal,onChangePin,onSaveProfile}){
  const [tab,setTab]=useState("stats");
  const [weight,setWeight]=useState("");
  const [weightUnit,setWeightUnit]=useState("lbs");
  const [goal,setGoal]=useState(profile?.personalGoal||"");
  const [goalSaved,setGoalSaved]=useState(false);
  const [pin1,setPin1]=useState("");
  const [pin2,setPin2]=useState("");
  const [pinErr,setPinErr]=useState("");
  const [pinDone,setPinDone]=useState(false);

  const streak=getStreak(history,currentUser);
  const total=getTotalWorkouts(history,currentUser);
  const weightLog=profile?.weightLog||[];

  const logWeight=()=>{
    if(!weight||isNaN(Number(weight)))return;
    const entry={w:Number(weight),unit:weightUnit,date:todayStr(),ts:Date.now()};
    onSaveWeight([entry,...weightLog].slice(0,30));
    setWeight("");
  };

  const saveGoal=()=>{onSaveGoal(goal.trim());setGoalSaved(true);setTimeout(()=>setGoalSaved(false),2000);};

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

  const tabs=[{id:"stats",label:"STATS"},{id:"weight",label:"WEIGHT"},{id:"goal",label:"GOAL"},{id:"rest",label:"REST DAYS"},{id:"pin",label:"PIN"}];

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

        {/* STATS tab */}
        {tab==="stats"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[["🔥","Current Streak",`${streak} days`],["💪","Total Workouts",total],["📅","This Month",Object.keys(history).filter(d=>{const m=new Date();return d.startsWith(`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`)&&history[d]?.[currentUser]?.done}).length],["⚡","Best Workout",Object.values(history).map(d=>d?.[currentUser]?.workoutLabel).filter(Boolean).reduce((a,b,_,arr)=>arr.filter(x=>x===b).length>arr.filter(x=>x===a).length?b:a,"—")||"—"]].map(([icon,label,val])=>(
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

        {/* WEIGHT tab */}
        {tab==="weight"&&(
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>Private — only you can see this.</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <input className="input" type="number" placeholder="Enter weight..." value={weight} onChange={e=>setWeight(e.target.value)} style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&logWeight()}/>
              <select className="input" value={weightUnit} onChange={e=>setWeightUnit(e.target.value)} style={{width:70,appearance:"none",textAlign:"center"}}>
                <option>lbs</option><option>kg</option>
              </select>
              <button onClick={logWeight} disabled={!weight} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>LOG</button>
            </div>
            {weightLog.length===0?(
              <div style={{textAlign:"center",padding:"20px",color:"var(--muted)",fontSize:13}}>No weight entries yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {weightLog.map((e,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"var(--bg3)",borderRadius:10,border:"1px solid var(--border)"}}>
                    <span style={{fontSize:14,fontWeight:600}}>{e.w} {e.unit}</span>
                    <span style={{fontSize:12,color:"var(--muted)"}}>{fmtDate(e.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GOAL tab */}
        {tab==="goal"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>Set a personal goal visible to the whole pack on the Pack tab.</div>
            <textarea className="input" rows={3} placeholder="e.g. Run a 5K by June, lose 15 lbs, bench 225..." value={goal} onChange={e=>setGoal(e.target.value)} maxLength={120} style={{resize:"none"}}/>
            <button className="btn-primary" onClick={saveGoal} disabled={!goal.trim()}>{goalSaved?"✓ SAVED!":"SAVE GOAL"}</button>
            {profile?.personalGoal&&<button className="btn-ghost" onClick={()=>{setGoal("");onSaveGoal("");}}>Clear goal</button>}
          </div>
        )}

        {/* REST DAYS tab */}
        {tab==="rest"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {challenges.some(ch=>ch.status==="active"&&Object.keys(ch.participants||{}).includes(currentUser))?(
              <div style={{padding:"14px",background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.3)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:6}}>🔒</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--orange)",marginBottom:4}}>LOCKED DURING CHALLENGE</div>
                <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>You can't change rest days while you're in an active challenge. Finish or forfeit all active challenges first.</div>
              </div>
            ):(
              <>
            <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>Pick your personal rest days. Minimum 2 required. Your streak and challenges will skip these days.<br/><br/><span style={{color:"var(--orange)"}}>Note: the gym is always closed on weekends regardless of your rest days.</span></div>
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
                    opacity:!sel&&restDays.length>=2&&!restDays.includes(i)?0.6:1,
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
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>Change your 4-digit login PIN.</div>
            <input className="input" type="password" inputMode="numeric" placeholder="New 4-digit PIN" value={pin1} onChange={e=>setPin1(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
            <input className="input" type="password" inputMode="numeric" placeholder="Confirm new PIN" value={pin2} onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
            {pinErr&&<div style={{color:"var(--red)",fontSize:13}}>{pinErr}</div>}
            {pinDone&&<div style={{color:"var(--green)",fontSize:13}}>✓ PIN updated!</div>}
            <button className="btn-primary" onClick={changePin} disabled={pin1.length!==4||pin2.length!==4}>UPDATE PIN</button>
          </div>
        )}

        <button className="btn-ghost" style={{width:"100%",marginTop:12}} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function WorkoutModal({onClose,onSubmit}){
  const [selected,setSelected]=useState([]);
  const [note,setNote]=useState("");

  const toggle=w=>setSelected(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);
  const isSelected=w=>!!selected.find(x=>x.id===w.id);

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:6}}>LOG WORKOUT</div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>Select one or more workout types</div>
        <div className="workout-grid" style={{marginBottom:14}}>
          {WORKOUT_TYPES.map(w=>(
            <button key={w.id} className={`workout-tile ${isSelected(w)?"selected":""}`} onClick={()=>toggle(w)}>
              <div style={{fontSize:24,marginBottom:4}}>{w.icon}</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1,color:isSelected(w)?"var(--accent2)":"var(--muted)"}}>{w.label}</div>
              {isSelected(w)&&<div style={{position:"absolute",top:4,right:4,width:14,height:14,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>✓</div>}
            </button>
          ))}
        </div>
        {selected.length>0&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {selected.map(w=><span key={w.id} style={{padding:"4px 10px",background:"rgba(124,92,191,0.2)",border:"1px solid rgba(124,92,191,0.4)",borderRadius:20,fontSize:12,color:"var(--accent2)"}}>{w.icon} {w.label}</span>)}
          </div>
        )}
        <input className="input" placeholder="Optional note..." value={note} onChange={e=>setNote(e.target.value)} style={{marginBottom:12}} maxLength={80}/>
        <button className="btn-primary" disabled={selected.length===0} onClick={()=>onSubmit(selected,note)}>LOG IT 💪</button>
      </div>
    </div>
  );
}

export default function App(){
  const [screen,setScreen]=useState("loading");
  const [members,setMembers]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [currentUser,setCurrentUser]=useState(null);
  const [sharedData,setSharedData]=useState({});
  const [history,setHistory]=useState({});
  const [feed,setFeed]=useState([]);
  const [challenges,setChallenges]=useState([]);
  const [gymSlots,setGymSlots]=useState([]);
  const [adminName,setAdminName]=useState(null);
  const [view,setView]=useState("pack");
  const [workoutOpen,setWorkoutOpen]=useState(false);
  const [adminOpen,setAdminOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [packGoals,setPackGoals]=useState([]);
  const [toast,setToast]=useState("");
  const unsubs=useRef([]);const tt=useRef(null);
  const showToast=useCallback(msg=>{setToast(msg);clearTimeout(tt.current);tt.current=setTimeout(()=>setToast(""),3000);},[]);

  useEffect(()=>{
    (async()=>{
      const md=await fsGet("wolfpack/members");const m=md?.list||[];setMembers(m);
      const u1=fsListen("wolfpack/workouts",d=>{if(d){setSharedData(d.byDate||{});setHistory(d.byDate||{});}});
      const u2=fsListen("wolfpack/profiles",d=>{if(d)setProfiles(d.users||{});});
      const u3=fsListen("wolfpack/feed",d=>{if(d)setFeed((d.posts||[]).sort((a,b)=>b.ts-a.ts));});
      const u4=fsListen("wolfpack/challenges",d=>{if(d)setChallenges(d.list||[]);});
      const u5=fsListen("wolfpack/gym",d=>{if(d)setGymSlots(d.slots||[]);});
      const u6=fsListen("wolfpack/packgoals",d=>{if(d)setPackGoals(d.list||[]);});
      unsubs.current=[u1,u2,u3,u4,u5,u6];
      const ad=await fsGet("wolfpack/admin");if(ad?.name)setAdminName(ad.name);
      setScreen(m.length>0?"login":"onboard");
    })();
    return()=>unsubs.current.forEach(u=>u?.());
  },[]);

  useEffect(()=>{const u=onForegroundMessage(p=>{const{title,body}=p.notification||{};showToast(`${title||"WOLFPACK"}: ${body||""}`);});return()=>u?.();},[showToast]);

  const handleJoin=async(name,avatar,pin,avatarImg)=>{
    if(members.map(m=>m.toLowerCase()).includes(name.toLowerCase())){setCurrentUser(name);setScreen("main");return;}
    await fsSet(`wolfpack/pin_${name}`,{pin});
    const nm=[...members,name],profile={avatar:avatar||"🐺",...(avatarImg?{avatarImg}:{})};
    const np={...profiles,[name]:profile};
    if(members.length===0){await fsSet("wolfpack/admin",{name});setAdminName(name);}
    await fsSet("wolfpack/members",{list:nm});await fsSet("wolfpack/profiles",{users:np});
    setMembers(nm);setProfiles(np);setCurrentUser(name);setScreen("main");
    showToast(`Welcome to the pack, ${name}! 🐺`);
  };

  const handleLogin=(name,action)=>{if(action==="join"){setScreen("onboard");return;}setCurrentUser(name);setScreen("main");};

  const handleResetPin=async m=>{await fsDelete(`wolfpack/pin_${m}`);showToast(`${m}'s PIN cleared. They can log in freely now.`);};

  const handleDeleteAccount=async m=>{
    const nm=members.filter(x=>x!==m),np={...profiles};delete np[m];
    const nc=challenges.map(c=>{const p={...c.participants};delete p[m];return{...c,participants:p};});
    const ns=gymSlots.filter(s=>s.bookedBy!==m);
    await Promise.all([fsSet("wolfpack/members",{list:nm}),fsSet("wolfpack/profiles",{users:np}),fsSet("wolfpack/challenges",{list:nc}),fsSet("wolfpack/gym",{slots:ns}),fsDelete(`wolfpack/pin_${m}`)]);
    setMembers(nm);setProfiles(np);showToast(`${m} removed from the pack.`);
  };

  const handleAddPackGoal=async t=>{
    const goal={id:Date.now().toString(),author:currentUser,text:t,cheers:[],ts:Date.now()};
    await fsSet("wolfpack/packgoals",{list:[goal,...packGoals]});
  };
  const handleCheerGoal=async(id,user)=>{
    const nl=packGoals.map(g=>{if(g.id!==id)return g;const c=g.cheers||[];return{...g,cheers:c.includes(user)?c.filter(x=>x!==user):[...c,user]};});
    await fsSet("wolfpack/packgoals",{list:nl});
  };
  const handleDeletePackGoal=async id=>{
    await fsSet("wolfpack/packgoals",{list:packGoals.filter(g=>g.id!==id)});
  };
  const handleSaveWeight=async wl=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],weightLog:wl}};
    await fsSet("wolfpack/profiles",{users:np});setProfiles(np);
  };
  const handleSaveGoal=async goal=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],personalGoal:goal}};
    await fsSet("wolfpack/profiles",{users:np});setProfiles(np);
  };
  const handleChangePin=async newPin=>{
    await fsSet(`wolfpack/pin_${currentUser}`,{pin:newPin});
  };

  const handleLogWorkout=async(workouts,note)=>{
    const key=todayStr(),time=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    // Support multiple workout types - merge with existing entries for today
    const existing=history[key]?.[currentUser]||{};
    const prevWorkouts=existing.workouts||[];
    const newWorkouts=[...prevWorkouts,...workouts.map(w=>({id:w.id,icon:w.icon,label:w.label}))];
    const icons=newWorkouts.map(w=>w.icon).join("");
    const labels=newWorkouts.map(w=>w.label).join(" + ");
    const entry={done:true,workouts:newWorkouts,workoutIcon:icons,workoutLabel:labels,note,time,ts:Date.now()};
    await fsSet("wolfpack/workouts",{byDate:{...history,[key]:{...(history[key]||{}),[currentUser]:entry}}});
    setWorkoutOpen(false);launchConfetti();showToast(`${icons} Logged! Keep grinding! 🐺`);
  };

  const handlePost=async t=>{await fsSet("wolfpack/feed",{posts:[{id:Date.now().toString(),author:currentUser,text:t,ts:Date.now(),likes:[]},...feed]});showToast("Posted! 🐺");};
  const handleLike=async id=>{await fsSet("wolfpack/feed",{posts:feed.map(p=>{if(p.id!==id)return p;const l=p.likes||[];return{...p,likes:l.includes(currentUser)?l.filter(x=>x!==currentUser):[...l,currentUser]};})});};
  const handleDelPost=async id=>{await fsSet("wolfpack/feed",{posts:feed.filter(p=>p.id!==id)});};
  const handleBookGym=async(date,time)=>{
    const ex=gymSlots.filter(s=>s.date===date&&s.time===time);
    if(ex.length>=2){showToast("That slot is full!");return;}
    if(ex.find(s=>s.bookedBy===currentUser)){showToast("You already have that slot!");return;}
    await fsSet("wolfpack/gym",{slots:[...gymSlots,{id:Date.now().toString(),date,time,bookedBy:currentUser,createdAt:Date.now()}]});
    showToast(`Gym booked for ${time}! 💪`);
  };
  const handleCancelGym=async id=>{await fsSet("wolfpack/gym",{slots:gymSlots.filter(s=>s.id!==id)});showToast("Cancelled.");};
  const handleAddChallenge=async c=>{await fsSet("wolfpack/challenges",{list:[c,...challenges]});showToast("Challenge created! ⚔️");};
  const handleLogProgress=async(cid,member,progress,done)=>{
    const nl=challenges.map(c=>{
      if(c.id!==cid)return c;
      const u={...c,participants:{...c.participants,[member]:{progress,done}}};
      if(Object.values(u.participants).every(p=>p.done)){u.status="completed";launchConfetti();showToast("🏆 Challenge complete!");}
      return u;
    });
    await fsSet("wolfpack/challenges",{list:nl});
    if(done)showToast("✓ You completed your part! 🎉");else showToast("Progress logged!");
  };
  const handleDelChallenge=async id=>{await fsSet("wolfpack/challenges",{list:challenges.filter(c=>c.id!==id)});showToast("Challenge removed.");};
  const handleEditChallenge=async u=>{await fsSet("wolfpack/challenges",{list:challenges.map(c=>c.id===u.id?u:c)});showToast("Challenge updated!");};
  const handleForfeit=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      return{...c,participants:{...c.participants,[member]:{...c.participants[member],forfeited:true,forfeitedAt:Date.now()}}};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast(`🏳️ Forfeited. You owe $${challenges.find(c=>c.id===challengeId)?.forfeitCap||0}.`);
  };

  if(screen==="loading")return<div className="loading-screen"><div className="loading-wolf">🐺</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div><div style={{color:"var(--muted)",fontSize:13}}>Loading the pack...</div></div>;
  if(screen==="onboard")return<Onboarding onJoin={handleJoin}/>;
  if(screen==="login")return<Login members={members} profiles={profiles} onLogin={handleLogin} adminName={adminName}/>;

  return(
    <div className="app">
      <canvas id="confetti-canvas"/>
      <Toast msg={toast}/>
      <div className="header">
        <div><div className="header-title">WOLFPACK</div><div style={{fontSize:11,color:"var(--muted)",letterSpacing:1}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{textAlign:"right",marginRight:4}}><div style={{fontSize:11,color:"var(--muted)"}}>welcome back</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,color:"var(--accent2)"}}>{currentUser}</div></div>
          <div onClick={()=>setProfileOpen(true)} style={{cursor:"pointer"}}><AvatarDisplay profile={profiles[currentUser]} size={40}/></div>
        </div>
      </div>
      <div className="scroll">
        {view==="pack"&&<PackTab currentUser={currentUser} members={members} profiles={profiles} history={history} sharedData={sharedData} onLogWorkout={()=>setWorkoutOpen(true)} adminName={adminName} onOpenAdmin={()=>setAdminOpen(true)} packGoals={packGoals} onAddGoal={handleAddPackGoal} onCheer={handleCheerGoal} onDeleteGoal={handleDeletePackGoal} onOpenProfile={()=>setProfileOpen(true)}/>}
        {view==="feed"&&<FeedTab currentUser={currentUser} profiles={profiles} feed={feed} onPost={handlePost} onLike={handleLike} onDelete={handleDelPost}/>}
        {view==="gym"&&<GymTab currentUser={currentUser} gymSlots={gymSlots} onBook={handleBookGym} onCancel={handleCancelGym}/>}
        {view==="challenges"&&<ChallengesTab currentUser={currentUser} members={members} profiles={profiles} challenges={challenges} history={history} onAdd={handleAddChallenge} onLogProgress={handleLogProgress} onDelete={handleDelChallenge} onEditChallenge={handleEditChallenge} onForfeit={handleForfeit}/>}
        {view==="stats"&&<StatsTab currentUser={currentUser} members={members} profiles={profiles} history={history} challenges={challenges} feed={feed}/>}
      </div>
      <nav className="nav">{NAV.map(n=><button key={n.id} className={`nav-btn ${view===n.id?"active":""}`} onClick={()=>setView(n.id)}><span className="icon">{n.icon}</span><span>{n.label}</span></button>)}</nav>
      {workoutOpen&&<WorkoutModal onClose={()=>setWorkoutOpen(false)} onSubmit={handleLogWorkout}/>}
      {profileOpen&&<ProfileModal currentUser={currentUser} profile={profiles[currentUser]} profiles={profiles} history={history} challenges={challenges} onClose={()=>setProfileOpen(false)} onSaveWeight={handleSaveWeight} onSaveGoal={handleSaveGoal} onChangePin={handleChangePin} onSaveProfile={np=>setProfiles(np)}/>}
      {adminOpen&&<AdminPanel members={members} profiles={profiles} currentUser={currentUser} adminName={adminName} onResetPin={handleResetPin} onDeleteAccount={handleDeleteAccount} onClose={()=>setAdminOpen(false)}/>}
    </div>
  );
}
