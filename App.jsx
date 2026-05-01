import { useState, useEffect, useRef, useCallback } from "react";
import { fsGet, fsSet, fsDelete, fsListen, requestNotifPermission, onForegroundMessage } from "./firebase";

const INVITE_CODE = "WOLF2026";

const WORKOUT_TYPES = [
  { id:"lift",icon:"🏋️",label:"Lifting"},{id:"run",icon:"🏃",label:"Running"},
  { id:"bike",icon:"🚴",label:"Cycling"},{id:"swim",icon:"🏊",label:"Swimming"},
  { id:"yoga",icon:"🧘",label:"Yoga"},{id:"hiit",icon:"⚡",label:"HIIT"},
  { id:"sport",icon:"⚽",label:"Sport"},{id:"walk",icon:"🚶",label:"Walking"},
  { id:"other",icon:"💪",label:"Other"},
];

const QUOTES = [
  "Your only competition is who you were yesterday.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "One workout at a time. One day at a time.",
  "Earn it.","Make yourself proud.",
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

const GYM_HOURS = Array.from({length:14},(_,i)=>{
  const h=6+i;
  return h<12?`${h}:00 AM`:h===12?`12:00 PM`:`${h-12}:00 PM`;
});

const NAV=[
  {id:"pack",icon:"🐺",label:"PACK"},{id:"feed",icon:"💬",label:"FEED"},
  {id:"gym",icon:"🏋️",label:"GYM"},{id:"challenges",icon:"⚔️",label:"CHALLENGES"},
  {id:"stats",icon:"📊",label:"STATS"},
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const today=()=>new Date().toISOString().split("T")[0];
const isWeekend=(dateStr)=>{const d=new Date(dateStr+"T00:00:00");return d.getDay()===0||d.getDay()===6;};
const weekDates=()=>{const d=new Date();return Array.from({length:7},(_,i)=>{const dd=new Date(d);dd.setDate(d.getDate()+i);return dd.toISOString().split("T")[0];});};
const fmt=(d)=>new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const fmtTime=(ts)=>new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const getWeekStart=(dateStr)=>{const d=new Date(dateStr+"T00:00:00");d.setDate(d.getDate()-d.getDay());return d.toISOString().split("T")[0];};

function getStreak(history,name){
  let streak=0;const d=new Date();
  for(let i=0;i<365;i++){
    const k=new Date(d);k.setDate(d.getDate()-i);
    const key=k.toISOString().split("T")[0];
    if(isWeekend(key)) continue;
    if(history[key]?.[name]?.done) streak++;
    else if(i>0) break;
  }
  return streak;
}
function getTotalWorkouts(history,name){return Object.values(history).filter(d=>d?.[name]?.done).length;}
function getQuote(){return QUOTES[new Date().getDate()%QUOTES.length];}
const dateRange=(start,end)=>{const dates=[];const s=new Date(start+"T00:00:00");const e=new Date(end+"T00:00:00");for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){dates.push(d.toISOString().split("T")[0]);}return dates;};
const weekdaysInRange=(start,end)=>dateRange(start,end).filter(d=>!isWeekend(d));

// ── PENALTY TRACKER ───────────────────────────────────────────────────────────
// For a date-range challenge with a per-missed-workout penalty,
// calculate how much each member owes total and per week.
function calcPenalties(challenge, history) {
  if (!challenge.penaltyAmt || challenge.penaltyAmt <= 0) return {};
  if (!challenge.startDate || !challenge.endDate) return {};
  const participants = Object.keys(challenge.participants || {});
  const endCap = today() < challenge.endDate ? today() : challenge.endDate;
  const allDays = weekdaysInRange(challenge.startDate, endCap);

  const result = {};
  participants.forEach(member => {
    const missedDays = allDays.filter(d => !history[d]?.[member]?.done);
    const totalOwed = missedDays.length * challenge.penaltyAmt;

    // Group by week
    const byWeek = {};
    missedDays.forEach(d => {
      const wk = getWeekStart(d);
      byWeek[wk] = (byWeek[wk] || 0) + challenge.penaltyAmt;
    });

    result[member] = { totalOwed, byWeek, missedDays };
  });
  return result;
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────
function launchConfetti(){
  const canvas=document.getElementById("confetti-canvas");if(!canvas)return;
  const ctx=canvas.getContext("2d");canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const pieces=Array.from({length:80},()=>({x:Math.random()*canvas.width,y:-10,r:Math.random()*6+4,c:["#7c5cbf","#ff6b35","#f1c40f","#2ecc71","#e74c3c"][Math.floor(Math.random()*5)],vx:(Math.random()-0.5)*4,vy:Math.random()*4+2,life:1}));
  let frame;
  const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);let alive=false;pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=0.008;if(p.y<canvas.height&&p.life>0)alive=true;ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.r,p.r);});ctx.globalAlpha=1;if(alive)frame=requestAnimationFrame(draw);else ctx.clearRect(0,0,canvas.width,canvas.height);};
  draw();setTimeout(()=>{cancelAnimationFrame(frame);ctx.clearRect(0,0,canvas.width,canvas.height);},4000);
}

function Toast({msg}){return msg?<div className="toast">{msg}</div>:null;}

function readFileAsDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}

// Compress image to max ~80KB for Firestore compatibility
function compressImage(dataUrl, maxSize=200){
  return new Promise((res)=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement("canvas");
      let w=img.width, h=img.height;
      if(w>maxSize||h>maxSize){
        if(w>h){h=Math.round(h*(maxSize/w));w=maxSize;}
        else{w=Math.round(w*(maxSize/h));h=maxSize;}
      }
      canvas.width=w; canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      res(canvas.toDataURL("image/jpeg",0.7));
    };
    img.onerror=()=>res(dataUrl);
    img.src=dataUrl;
  });
}

function AvatarDisplay({profile,size=40}){
  if(profile?.avatarImg)return<img src={profile.avatarImg} alt="avatar" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>;
  return<div className="avatar" style={{width:size,height:size,background:"var(--bg2)",fontSize:size*0.55,flexShrink:0}}>{profile?.avatar||"🐺"}</div>;
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function Onboarding({onJoin}){
  const [step,setStep]=useState("invite");
  const [invite,setInvite]=useState("");
  const [name,setName]=useState("");
  const [avatar,setAvatar]=useState("🐺");
  const [avatarImg,setAvatarImg]=useState(null);
  const [usePhoto,setUsePhoto]=useState(false);
  const [pin,setPin]=useState("");
  const [pin2,setPin2]=useState("");
  const [error,setError]=useState("");
  const fileRef=useRef();

  const handleInvite=()=>{if(invite.trim().toUpperCase()!==INVITE_CODE)return setError("Wrong invite code. Ask your pack leader.");setError("");setStep("name");};
  const handleName=()=>{if(!name.trim())return setError("Enter your name");setError("");setStep("avatar");};
  const handlePhoto=async(e)=>{const file=e.target.files?.[0];if(!file)return;const data=await readFileAsDataURL(file);const compressed=await compressImage(data);setAvatarImg(compressed);setUsePhoto(true);};
  const [joining,setJoining]=useState(false);
  const handlePin=async()=>{if(pin.length!==4)return setError("PIN must be exactly 4 digits");if(pin!==pin2)return setError("PINs don't match");setError("");setJoining(true);try{await onJoin(name.trim(),usePhoto?null:avatar,pin,avatarImg);}catch(e){setError("Something went wrong. Try again.");setJoining(false);}};

  return(
    <div className="onboard" style={{overflowY:"auto",justifyContent:"flex-start",paddingTop:40}}>
      <div style={{fontSize:72}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:40,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      <div style={{color:"var(--muted)",fontSize:15,marginTop:-8}}>fitness accountability</div>

      {step==="invite"&&<div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"}}>ENTER INVITE CODE</div>
        <input className="input" placeholder="Invite code..." value={invite} onChange={e=>setInvite(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleInvite()} autoFocus style={{textTransform:"uppercase",letterSpacing:4,textAlign:"center",fontSize:18}}/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handleInvite}>CONTINUE →</button>
      </div>}

      {step==="name"&&<div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"}}>YOUR NAME</div>
        <input className="input" placeholder="Enter your name..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleName()} maxLength={20} autoFocus/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handleName}>CONTINUE →</button>
      </div>}

      {step==="avatar" && (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"}}>PICK YOUR LOOK</div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"14px",background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
            {avatarImg
              ? <img src={avatarImg} alt="avatar" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--accent)"}}/>
              : <div style={{width:72,height:72,borderRadius:"50%",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,border:"2px dashed var(--border)"}}>📷</div>
            }
            <button className="btn-ghost" onClick={()=>fileRef.current.click()} style={{fontSize:13}}>{avatarImg?"Change Photo":"Upload Photo"}</button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
            {avatarImg && <button className="btn-ghost" onClick={()=>{setAvatarImg(null);setUsePhoto(false);}} style={{fontSize:12,color:"var(--muted)"}}>Remove photo</button>}
          </div>
          {!avatarImg && (
            <div>
              <div style={{textAlign:"center",fontSize:12,color:"var(--muted)",marginBottom:10}}>— or pick an emoji —</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {WOLF_AVATARS.map(a=>(
                  <button key={a} onClick={()=>{setAvatar(a);setUsePhoto(false);}} style={{padding:14,fontSize:28,borderRadius:14,cursor:"pointer",background:!usePhoto&&avatar===a?"rgba(124,92,191,0.25)":"var(--bg3)",border:!usePhoto&&avatar===a?"2px solid var(--accent)":"2px solid var(--border)",transition:"all 0.15s"}}>{a}</button>
                ))}
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={()=>setStep("pin")} style={{marginTop:4,marginBottom:24}}>CONTINUE →</button>
        </div>
      )}

      {step==="pin"&&<div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"}}>SET YOUR 4-DIGIT PIN</div>
        <input className="input" type="password" inputMode="numeric" placeholder="4-digit PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} autoFocus style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
        <input className="input" type="password" inputMode="numeric" placeholder="Confirm PIN" value={pin2} onChange={e=>setPin2(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} onKeyDown={e=>e.key==="Enter"&&handlePin()} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
        {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
        <button className="btn-primary" onClick={handlePin} disabled={joining}>{joining?"JOINING...":"JOIN THE PACK 🐺"}</button>
      </div>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({members,profiles,onLogin,adminName}){
  const [selected,setSelected]=useState(null);
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const handleLogin=async()=>{
    if(!selected)return;
    const stored=await fsGet(`wolfpack/pin_${selected}`);
    if(!stored?.pin){onLogin(selected);return;}
    if(stored.pin===pin)onLogin(selected);
    else setError("Wrong PIN. Try again.");
  };
  return(
    <div className="onboard">
      <div style={{fontSize:56}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:5,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      {!selected?(
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:3,color:"var(--muted)",marginBottom:4}}>WHO ARE YOU?</div>
          {members.map(m=>(
            <button key={m} onClick={()=>setSelected(m)} className="member-row" style={{cursor:"pointer",border:"1px solid var(--border)",textAlign:"left",width:"100%"}}>
              <AvatarDisplay profile={profiles[m]} size={40}/>
              <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{m}</div>{m===adminName&&<div style={{fontSize:11,color:"var(--accent2)"}}>Pack Admin</div>}</div>
            </button>
          ))}
          <div style={{marginTop:8,color:"var(--muted)",fontSize:13}}>New here?{" "}<span style={{color:"var(--accent2)",cursor:"pointer"}} onClick={()=>onLogin(null,"join")}>Join the Pack</span></div>
        </div>
      ):(
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--bg3)",borderRadius:12}}>
            <AvatarDisplay profile={profiles[selected]} size={40}/>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2}}>{selected}</div>
          </div>
          <input className="input" type="password" inputMode="numeric" placeholder="Enter PIN..." value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} autoFocus maxLength={4} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{letterSpacing:8,textAlign:"center",fontSize:22}}/>
          {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
          <button className="btn-primary" onClick={handleLogin}>LET ME IN 🐺</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={()=>{setSelected(null);setPin("");setError("");}}>← Back</button>
        </div>
      )}
    </div>
  );
}

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
function AdminPanel({members,profiles,currentUser,adminName,onResetPin,onDeleteAccount,onClose}){
  const [confirm,setConfirm]=useState(null);
  const [resetting,setResetting]=useState(null);
  const [done,setDone]=useState(null);
  if(currentUser!==adminName)return null;
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:4}}>ADMIN PANEL</div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>Manage pack members — reset PINs or delete accounts.</div>
        {members.filter(m=>m!==currentUser).map(m=>(
          <div key={m} style={{marginBottom:10,padding:"12px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:confirm===m?10:0}}>
              <AvatarDisplay profile={profiles[m]} size={36}/>
              <div style={{flex:1,fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:1}}>{m}</div>
              <button onClick={async()=>{setResetting(m);await onResetPin(m);setResetting(null);setDone(m);}}
                style={{background:"rgba(124,92,191,0.15)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--accent2)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,marginRight:4}}>
                {resetting===m?"...":done===m?"✓ RESET":"RESET PIN"}
              </button>
              <button onClick={()=>setConfirm(confirm===m?null:m)}
                style={{background:"rgba(231,76,60,0.15)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--red)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                DELETE
              </button>
            </div>
            {confirm===m&&(
              <div style={{background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:13,color:"var(--text)",marginBottom:8}}>Delete <strong>{m}</strong>? This removes all their data permanently.</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{onDeleteAccount(m);setConfirm(null);}} style={{flex:1,padding:"8px",background:"var(--red)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>YES, DELETE</button>
                  <button onClick={()=>setConfirm(null)} style={{flex:1,padding:"8px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>Cancel</button>
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

// ── NOTIFICATION SETUP ────────────────────────────────────────────────────────
function NotifBanner({currentUser,onSave}){
  const [visible,setVisible]=useState(false);
  const [asking,setAsking]=useState(false);

  useEffect(()=>{
    if(!("Notification" in window))return;
    if(Notification.permission==="default") setVisible(true);
  },[]);

  const handleEnable=async()=>{
    setAsking(true);
    const token=await requestNotifPermission();
    if(token&&currentUser){
      await fsSet(`wolfpack/fcm_${currentUser}`,{token,updatedAt:Date.now()});
      onSave&&onSave(token);
    }
    setVisible(false);setAsking(false);
  };

  if(!visible)return null;
  return(
    <div style={{margin:"8px 16px",padding:"12px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:14,display:"flex",alignItems:"center",gap:10}}>
      <div style={{fontSize:24}}>🔔</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2}}>ENABLE NOTIFICATIONS</div>
        <div style={{fontSize:12,color:"var(--muted)"}}>Get alerts when the pack logs workouts</div>
      </div>
      <button onClick={handleEnable} disabled={asking} style={{padding:"7px 14px",background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,flexShrink:0}}>
        {asking?"...":"ALLOW"}
      </button>
      <button onClick={()=>setVisible(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,padding:0,flexShrink:0}}>×</button>
    </div>
  );
}

// ── PACK TAB ──────────────────────────────────────────────────────────────────
function PackTab({currentUser,members,profiles,history,sharedData,onLogWorkout,adminName,onOpenAdmin}){
  const todayKey=today();
  const todayData=sharedData[todayKey]||{};
  const myStatus=todayData[currentUser];
  const streak=getStreak(history,currentUser);
  const total=getTotalWorkouts(history,currentUser);
  const todayIsWeekend=isWeekend(todayKey);
  const sorted=[...members].sort((a,b)=>{const as=getStreak(history,a),bs=getStreak(history,b);if(bs!==as)return bs-as;return b===currentUser?1:a===currentUser?-1:0;});
  return(
    <div>
      <div style={{padding:"16px 16px 8px"}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:3,color:"var(--muted)",marginBottom:6}}>TODAY'S HOWL</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontStyle:"italic",lineHeight:1.5}}>"{getQuote()}"</div>
      </div>
      <NotifBanner currentUser={currentUser}/>
      {!todayIsWeekend?(
        <div style={{padding:"8px 16px 4px"}}>
          {!myStatus?.done?(
            <button className="btn-primary glow-purple" onClick={onLogWorkout}>🐺 LOG TODAY'S WORKOUT</button>
          ):(
            <div style={{background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:16,padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:28}}>{myStatus.workoutIcon}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2,color:"var(--accent2)"}}>✓ LOGGED — {myStatus.workoutLabel?.toUpperCase()}</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>{myStatus.time}</div>
                </div>
                {myStatus.note&&<div style={{fontSize:12,color:"var(--muted)",maxWidth:120,textAlign:"right",fontStyle:"italic"}}>"{myStatus.note}"</div>}
              </div>
              <button className="btn-ghost" onClick={onLogWorkout} style={{marginTop:10,width:"100%",fontSize:12}}>+ Log Another</button>
            </div>
          )}
        </div>
      ):(
        <div style={{margin:"8px 16px",padding:"12px 16px",background:"var(--bg3)",borderRadius:14,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:4}}>😴</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--muted)"}}>REST DAY — YOU EARNED IT</div>
        </div>
      )}
      <div style={{display:"flex",gap:8,padding:"12px 16px 8px",overflowX:"auto",flexWrap:"wrap"}}>
        <div className="pill pill-purple">🔥{streak} DAY STREAK</div>
        <div className="pill pill-orange">💪 {total} TOTAL</div>
        {currentUser===adminName&&<button onClick={onOpenAdmin} style={{padding:"5px 12px",borderRadius:20,background:"rgba(124,92,191,0.2)",border:"1px solid rgba(124,92,191,0.3)",color:"var(--accent2)",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>⚙️ Admin</button>}
      </div>
      <div className="section-label" style={{marginTop:8}}>THE PACK</div>
      {sorted.map((m,i)=>{
        const ms=getStreak(history,m),mt=getTotalWorkouts(history,m),done=!!todayData[m]?.done,isMe=m===currentUser;
        return(
          <div key={m} className="member-row" style={{margin:"0 16px 8px",background:isMe?"rgba(124,92,191,0.08)":"var(--bg3)",border:isMe?"1px solid rgba(124,92,191,0.3)":"1px solid var(--border)"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"var(--muted)",width:22,textAlign:"center"}}>{i+1}</div>
            <AvatarDisplay profile={profiles[m]} size={38}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1}}>{m}</span>
                {isMe&&<span style={{fontSize:11,color:"var(--accent2)",background:"rgba(124,92,191,0.2)",padding:"1px 6px",borderRadius:4}}>YOU</span>}
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:1}}>🔥{ms} streak · {mt} workouts</div>
            </div>
            <div style={{width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:done?"rgba(46,204,113,0.15)":"rgba(255,255,255,0.04)",border:done?"1px solid rgba(46,204,113,0.4)":"1px solid var(--border)",fontSize:18}}>
              {done?(todayData[m].workoutIcon||"✓"):"○"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── FEED TAB ──────────────────────────────────────────────────────────────────
function FeedTab({currentUser,profiles,feed,onPost,onLike,onDelete}){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const submit=()=>{if(!text.trim())return;onPost(text.trim());setText("");setOpen(false);};
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}><button className="btn-primary" onClick={()=>setOpen(true)}>💬 POST TO THE PACK</button></div>
      {feed.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:12}}>🐺</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>THE FEED IS EMPTY</div></div>}
      {feed.map(post=>{
        const liked=(post.likes||[]).includes(currentUser),isMe=post.author===currentUser;
        return(
          <div key={post.id} className="card">
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <AvatarDisplay profile={profiles[post.author]} size={38}/>
              <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{post.author}</div><div style={{fontSize:11,color:"var(--muted)"}}>{fmtTime(post.ts)}</div></div>
              {isMe&&<button onClick={()=>onDelete(post.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18}}>×</button>}
            </div>
            <div style={{fontSize:15,lineHeight:1.5,marginBottom:12}}>{post.text}</div>
            <button onClick={()=>onLike(post.id)} style={{background:"none",border:"none",cursor:"pointer",color:liked?"var(--orange)":"var(--muted)",display:"flex",alignItems:"center",gap:5,fontSize:13,transition:"color 0.15s"}}>
              {liked?"🔥":"🤍"} {(post.likes||[]).length||0} {(post.likes||[]).length===1?"like":"likes"}
            </button>
          </div>
        );
      })}
      {open&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}><div className="modal"><div className="modal-handle"/><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>POST TO THE PACK</div><textarea className="input" rows={4} placeholder="What's on your mind, wolf?..." value={text} onChange={e=>setText(e.target.value)} style={{resize:"none",marginBottom:12}} autoFocus/><button className="btn-primary" onClick={submit} disabled={!text.trim()}>POST 🐺</button></div></div>}
    </div>
  );
}

// ── GYM TAB ───────────────────────────────────────────────────────────────────
function GymTab({currentUser,gymSlots,onBook,onCancel}){
  const [selDate,setSelDate]=useState(today());
  const dates=weekDates();
  const slotsForDate=gymSlots.filter(s=>s.date===selDate);
  const mySlots=gymSlots.filter(s=>s.bookedBy===currentUser);
  return(
    <div>
      <div style={{padding:"12px 16px 8px",overflowX:"auto",display:"flex",gap:8,paddingBottom:12}}>
        {dates.map(d=>{
          const isToday=d===today(),active=d===selDate,dd=new Date(d+"T00:00:00"),weekend=isWeekend(d);
          return<button key={d} onClick={()=>setSelDate(d)} style={{flexShrink:0,padding:"8px 14px",borderRadius:12,cursor:"pointer",background:active?"linear-gradient(135deg,var(--accent),var(--orange))":"var(--bg3)",border:"none",color:weekend&&!active?"var(--muted)":"#fff",fontFamily:"'DM Sans',sans-serif",textAlign:"center",minWidth:60,opacity:weekend?0.6:1}}>
            <div style={{fontSize:11,opacity:0.8}}>{dd.toLocaleDateString("en-US",{weekday:"short"})}</div>
            <div style={{fontSize:18,fontWeight:700}}>{dd.getDate()}</div>
            {isToday&&<div style={{fontSize:9,opacity:0.8}}>TODAY</div>}
            {weekend&&<div style={{fontSize:9,opacity:0.7}}>REST</div>}
          </button>;
        })}
      </div>
      {mySlots.length>0&&<><div className="section-label">MY RESERVATIONS</div>
        {mySlots.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:12,margin:"0 16px 8px",padding:"12px 14px",background:"rgba(124,92,191,0.1)",borderRadius:12,border:"1px solid rgba(124,92,191,0.25)"}}>
          <span style={{fontSize:20}}>🏋️</span>
          <div style={{flex:1}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>{s.time}</div><div style={{fontSize:11,color:"var(--muted)"}}>{fmt(s.date)}</div></div>
          <button onClick={()=>onCancel(s.id)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>Cancel</button>
        </div>)}</>}
      <div className="section-label">{fmt(selDate)}{isWeekend(selDate)&&" — REST DAY"}</div>
      {isWeekend(selDate)?<div style={{textAlign:"center",padding:"30px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:8}}>😴</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2}}>GYM CLOSED ON WEEKENDS</div></div>:
        GYM_HOURS.map(time=>{
          const booked=slotsForDate.filter(s=>s.time===time),mine=booked.find(s=>s.bookedBy===currentUser),full=booked.length>=2;
          return<div key={time} style={{display:"flex",alignItems:"center",gap:12,margin:"0 16px 8px",padding:"12px 14px",background:"var(--card)",borderRadius:12,border:`1px solid ${mine?"rgba(124,92,191,0.3)":full?"rgba(231,76,60,0.2)":"var(--border)"}`}}>
            <div style={{width:72,fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1,color:mine?"var(--accent2)":full?"var(--red)":"var(--text)"}}>{time}</div>
            <div style={{flex:1,display:"flex",gap:6,flexWrap:"wrap"}}>
              {booked.map(s=><span key={s.id} style={{fontSize:13,background:"var(--bg3)",padding:"3px 8px",borderRadius:8,color:"var(--muted)"}}>{s.bookedBy}</span>)}
              {booked.length===0&&<span style={{fontSize:12,color:"var(--muted)"}}>Open</span>}
            </div>
            {mine?<button onClick={()=>onCancel(mine.id)} style={{background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>Cancel</button>
            :full?<span style={{fontSize:12,color:"var(--red)",fontWeight:600}}>FULL</span>
            :<button onClick={()=>onBook(selDate,time)} style={{background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>BOOK</button>}
          </div>;
        })
      }
    </div>
  );
}

// ── CHALLENGES TAB ────────────────────────────────────────────────────────────
function ChallengesTab({currentUser,members,challenges,history,onAdd,onLogProgress,onDelete,onEditChallenge}){
  const [open,setOpen]=useState(false);
  const getDefaultEnd=()=>{const e=new Date();e.setDate(e.getDate()+30);return e.toISOString().split("T")[0];};
  const [form,setForm]=useState({title:"",useDateRange:false,goal:30,unit:"reps",startDate:today(),endDate:getDefaultEnd(),penalty:"",penaltyAmt:"",participants:members});
  useEffect(()=>setForm(f=>({...f,participants:members})),[members]);
  const toggleP=(m)=>setForm(f=>({...f,participants:f.participants.includes(m)?f.participants.filter(p=>p!==m):[...f.participants,m]}));
  const submit=()=>{
    if(!form.title.trim())return;
    if(form.useDateRange&&(!form.startDate||!form.endDate))return;
    const parts=form.participants.length>0?form.participants:members;
    onAdd({id:Date.now().toString(),title:form.title.trim(),goalType:form.useDateRange?"dateRange":"amount",goal:form.useDateRange?weekdaysInRange(form.startDate,form.endDate).length:Number(form.goal),unit:form.useDateRange?"days":form.unit,startDate:form.useDateRange?form.startDate:null,endDate:form.useDateRange?form.endDate:null,penalty:form.penalty.trim(),penaltyAmt:form.penaltyAmt?Number(form.penaltyAmt):0,createdBy:currentUser,createdAt:Date.now(),participants:parts.reduce((a,m)=>({...a,[m]:{progress:0,done:false}}),{}),status:"active"});
    setOpen(false);
  };
  const active=challenges.filter(c=>c.status==="active");
  const done=challenges.filter(c=>c.status!=="active");
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}><button className="btn-primary" onClick={()=>setOpen(true)}>⚔️ CREATE CHALLENGE</button></div>
      {active.length===0&&done.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:12}}>⚔️</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>NO ACTIVE CHALLENGES</div></div>}
      {active.length>0&&<div className="section-label">ACTIVE</div>}
      {active.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} members={members} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} history={history}/>)}
      {done.length>0&&<div className="section-label" style={{marginTop:8}}>COMPLETED</div>}
      {done.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} members={members} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} history={history} completed/>)}

      {open&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}><div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>NEW CHALLENGE</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input className="input" placeholder="Challenge name..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoFocus maxLength={50}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setForm({...form,useDateRange:false})} style={{flex:1,padding:"10px",borderRadius:10,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1,background:!form.useDateRange?"rgba(124,92,191,0.2)":"var(--bg3)",border:!form.useDateRange?"1px solid var(--accent)":"1px solid var(--border)",color:!form.useDateRange?"var(--accent2)":"var(--muted)"}}>📊 GOAL AMOUNT</button>
            <button onClick={()=>setForm({...form,useDateRange:true})} style={{flex:1,padding:"10px",borderRadius:10,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1,background:form.useDateRange?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.useDateRange?"1px solid var(--accent)":"1px solid var(--border)",color:form.useDateRange?"var(--accent2)":"var(--muted)"}}>📅 DATE RANGE</button>
          </div>
          {!form.useDateRange?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div><input className="input" type="number" placeholder="e.g. 100" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} min={1}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div><select className="input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={{appearance:"none"}}>{["reps","miles","minutes","lbs","kg","sessions","calories"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Start date</div><input className="input" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>End date</div><input className="input" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
              {form.startDate&&form.endDate&&<div style={{gridColumn:"1/-1",fontSize:12,color:"var(--accent2)",background:"rgba(124,92,191,0.1)",padding:"8px 12px",borderRadius:8}}>📅 {weekdaysInRange(form.startDate,form.endDate).length} weekdays (weekends excluded)</div>}
            </div>
          )}
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Participants</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {members.map(m=><button key={m} onClick={()=>toggleP(m)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:13,background:form.participants.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.participants.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:form.participants.includes(m)?"var(--accent2)":"var(--muted)"}}>{m}</button>)}
            </div>
          </div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty (optional)</div><input className="input" placeholder='e.g. "Buys lunch"' value={form.penalty} onChange={e=>setForm({...form,penalty:e.target.value})} maxLength={80}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>$ per missed workout (optional)</div><input className="input" type="number" placeholder="e.g. 5" value={form.penaltyAmt} onChange={e=>setForm({...form,penaltyAmt:e.target.value})} min={0}/></div>
          <button className="btn-primary" onClick={submit} disabled={!form.title.trim()} style={{marginTop:4}}>CREATE ⚔️</button>
        </div>
      </div></div>}
    </div>
  );
}

// ── CHALLENGE EDIT MODAL ──────────────────────────────────────────────────────
function EditChallengeModal({challenge,members,onSave,onClose}){
  const currentParts=Object.keys(challenge.participants||{});
  const [parts,setParts]=useState(currentParts);
  const toggleP=(m)=>setParts(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m]);
  const handleSave=()=>{
    const newParts={...challenge.participants};
    // Add new members with 0 progress
    parts.forEach(m=>{if(!newParts[m])newParts[m]={progress:0,done:false};});
    // Remove removed members
    Object.keys(newParts).forEach(m=>{if(!parts.includes(m))delete newParts[m];});
    onSave({...challenge,participants:newParts});
    onClose();
  };
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:4}}>EDIT CHALLENGE</div>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>{challenge.title}</div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Add or remove participants:</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {members.map(m=>(
            <button key={m} onClick={()=>toggleP(m)} style={{padding:"8px 16px",borderRadius:20,cursor:"pointer",fontSize:14,background:parts.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:parts.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:parts.includes(m)?"var(--accent2)":"var(--muted)"}}>
              {parts.includes(m)?"✓ ":""}{m}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={handleSave}>SAVE CHANGES</button>
        <button className="btn-ghost" style={{width:"100%",marginTop:8}} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── PENALTY TRACKER DISPLAY ───────────────────────────────────────────────────
function PenaltyTracker({challenge,history,members,profiles}){
  const penalties=calcPenalties(challenge,history);
  const participants=Object.keys(challenge.participants||{});
  if(!challenge.penaltyAmt||challenge.penaltyAmt<=0)return null;
  if(!challenge.startDate||!challenge.endDate)return null;

  const hasPenalties=participants.some(m=>(penalties[m]?.totalOwed||0)>0);
  if(!hasPenalties)return null;

  // Get all weeks in range
  const allWeekStarts=[...new Set(
    weekdaysInRange(challenge.startDate, today()<challenge.endDate?today():challenge.endDate)
      .map(d=>getWeekStart(d))
  )].sort();

  return(
    <div style={{marginTop:12,background:"rgba(231,76,60,0.06)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",background:"rgba(231,76,60,0.1)",borderBottom:"1px solid rgba(231,76,60,0.15)",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>💸</span>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--red)"}}>PENALTY TRACKER — ${challenge.penaltyAmt}/MISSED WORKOUT</div>
      </div>
      {/* Header row */}
      <div style={{display:"grid",gridTemplateColumns:`120px repeat(${allWeekStarts.length},1fr) 70px`,gap:0,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{padding:"6px 10px",fontSize:11,color:"var(--muted)",fontWeight:600}}>Member</div>
        {allWeekStarts.map(wk=>{
          const d=new Date(wk+"T00:00:00");
          return<div key={wk} style={{padding:"6px 4px",fontSize:10,color:"var(--muted)",textAlign:"center"}}>{d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>;
        })}
        <div style={{padding:"6px 10px",fontSize:11,color:"var(--red)",fontWeight:600,textAlign:"center"}}>TOTAL</div>
      </div>
      {/* Member rows */}
      {participants.map(m=>{
        const p=penalties[m]||{totalOwed:0,byWeek:{}};
        return(
          <div key={m} style={{display:"grid",gridTemplateColumns:`120px repeat(${allWeekStarts.length},1fr) 70px`,gap:0,borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center"}}>
            <div style={{padding:"8px 10px",display:"flex",alignItems:"center",gap:6}}>
              <AvatarDisplay profile={profiles[m]} size={22}/>
              <span style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m}</span>
            </div>
            {allWeekStarts.map(wk=>{
              const amt=p.byWeek?.[wk]||0;
              return<div key={wk} style={{padding:"8px 4px",textAlign:"center",fontSize:13,color:amt>0?"var(--red)":"var(--muted)",fontWeight:amt>0?700:400}}>
                {amt>0?`$${amt}`:"—"}
              </div>;
            })}
            <div style={{padding:"8px 10px",textAlign:"center",fontSize:14,fontWeight:700,color:p.totalOwed>0?"var(--red)":"var(--green)"}}>
              {p.totalOwed>0?`$${p.totalOwed}`:"✓"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CHALLENGE CARD ────────────────────────────────────────────────────────────
function ChallengeCard({challenge:c,currentUser,members,onLog,onDelete,onEdit,history,completed}){
  const [logOpen,setLogOpen]=useState(false);
  const [editOpen,setEditOpen]=useState(false);
  const [amt,setAmt]=useState("");
  const participants=Object.keys(c.participants||{});
  const myProgress=c.participants?.[currentUser]?.progress||0;
  const myDone=c.participants?.[currentUser]?.done||false;
  const isDateRange=c.goalType==="dateRange";
  const autoProgress=isDateRange&&c.startDate&&c.endDate?weekdaysInRange(c.startDate,today()<c.endDate?today():c.endDate).filter(d=>history[d]?.[currentUser]?.done).length:null;
  const displayProgress=isDateRange?(autoProgress??myProgress):myProgress;
  const displayPct=Math.min(100,Math.round((displayProgress/c.goal)*100));
  const memberRows=participants.map(m=>({name:m,progress:isDateRange&&c.startDate&&c.endDate?weekdaysInRange(c.startDate,today()<c.endDate?today():c.endDate).filter(d=>history[d]?.[m]?.done).length:(c.participants[m]?.progress||0),done:c.participants[m]?.done||false})).map(m=>({...m,pct:Math.min(100,Math.round((m.progress/c.goal)*100))})).sort((a,b)=>b.pct-a.pct);
  const handleLog=()=>{const n=Number(amt);if(!n||n<=0)return;const np=myProgress+n;onLog(c.id,currentUser,np,np>=c.goal);setAmt("");setLogOpen(false);};
  const losers=completed?memberRows.filter(m=>m.pct<100):[];
  const myOwed=losers.find(m=>m.name===currentUser);
  const amIParticipant=participants.includes(currentUser);
  const canEdit = c.createdBy === currentUser && !completed;

  return(
    <div className="challenge-card">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{c.title}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
            {isDateRange?`📅 ${fmt(c.startDate)} → ${fmt(c.endDate)} (${c.goal} weekdays)`:`Goal: ${c.goal} ${c.unit}`}
            {c.penalty&&<span style={{color:"var(--orange)"}}> · {c.penalty}{c.penaltyAmt>0?` ($${c.penaltyAmt}/miss)`:""}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0,paddingLeft:8}}>
          {canEdit&&<button onClick={()=>setEditOpen(true)} style={{background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"4px 8px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>✏️</button>}
          {c.createdBy===currentUser&&<button onClick={()=>onDelete(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18}}>×</button>}
        </div>
      </div>

      {amIParticipant&&<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"var(--accent2)"}}>You: {displayProgress}/{c.goal} {c.unit}</span><span style={{fontSize:13,color:displayPct>=100?"var(--green)":"var(--muted)"}}>{displayPct}%</span></div><div className="progress-bar"><div className="progress-fill" style={{width:`${displayPct}%`}}/></div></div>}

      {memberRows.filter(m=>m.name!==currentUser).map(m=>(
        <div key={m.name} style={{marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"var(--muted)"}}>{m.name}: {m.progress}/{c.goal}</span><span style={{fontSize:12,color:m.pct>=100?"var(--green)":"var(--muted)"}}>{m.pct}%</span></div>
          <div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${m.pct}%`,opacity:0.6}}/></div>
        </div>
      ))}

      {/* Penalty tracker */}
      <PenaltyTracker challenge={c} history={history} members={members} profiles={{}}/>

      {completed&&losers.length>0&&(
        <div style={{marginTop:10,padding:"10px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:10}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--red)",marginBottom:5}}>🚨 CHALLENGE FAILED</div>
          {losers.map(l=><div key={l.name} style={{fontSize:13,color:"var(--muted)"}}><span style={{color:"var(--text)"}}>{l.name}</span> missed by {c.goal-l.progress} {c.unit}{c.penaltyAmt>0&&<span style={{color:"var(--red)"}}> — owes ${c.penaltyAmt}</span>}</div>)}
          {myOwed&&<div style={{marginTop:6,fontSize:12,color:"var(--orange)",fontWeight:600}}>😬 That's you! {c.penalty}</div>}
        </div>
      )}

      {!completed&&amIParticipant&&!myDone&&!isDateRange&&<button onClick={()=>setLogOpen(true)} style={{marginTop:10,width:"100%",padding:"10px",background:"rgba(124,92,191,0.15)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:10,cursor:"pointer",color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2}}>+ LOG PROGRESS</button>}
      {isDateRange&&!completed&&amIParticipant&&<div style={{marginTop:8,fontSize:12,color:"var(--muted)",textAlign:"center"}}>Progress auto-tracked from your daily workouts</div>}
      {displayPct>=100&&<div style={{marginTop:8,textAlign:"center",color:"var(--green)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>✓ YOU COMPLETED THIS</div>}

      {logOpen&&<div style={{marginTop:10,display:"flex",gap:8}}>
        <input className="input" type="number" placeholder={`Add ${c.unit}...`} value={amt} onChange={e=>setAmt(e.target.value)} min={1} autoFocus onKeyDown={e=>e.key==="Enter"&&handleLog()}/>
        <button onClick={handleLog} disabled={!amt||Number(amt)<=0} style={{padding:"10px 16px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1}}>LOG</button>
        <button onClick={()=>{setLogOpen(false);setAmt("");}} style={{padding:"10px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✕</button>
      </div>}

      {editOpen&&<EditChallengeModal challenge={c} members={members} onSave={(updated)=>onEdit(updated)} onClose={()=>setEditOpen(false)}/>}
    </div>
  );
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────
function StatsTab({currentUser,members,profiles,history,challenges,feed}){
  const last30=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);return{date:d.toISOString().split("T")[0],day:d.getDate()};});
  const myBadges=computeBadges(currentUser,history,feed,challenges);
  return(
    <div>
      <div className="section-label" style={{marginTop:12}}>LAST 30 DAYS</div>
      <div style={{padding:"0 16px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:5}}>
          {last30.map(({date,day})=>{const done=!!history[date]?.[currentUser]?.done,weekend=isWeekend(date);return<div key={date} style={{aspectRatio:"1",borderRadius:6,background:done?"linear-gradient(135deg,var(--accent),var(--orange))":weekend?"rgba(255,255,255,0.02)":"var(--bg3)",border:`1px solid ${weekend?"rgba(255,255,255,0.03)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:done?"#fff":weekend?"rgba(255,255,255,0.2)":"var(--muted)"}}>{weekend?"":day}</div>;})}
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:"var(--muted)"}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"linear-gradient(135deg,var(--accent),var(--orange))",display:"inline-block"}}/>Workout</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"var(--bg3)",border:"1px solid var(--border)",display:"inline-block"}}/>Missed</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"rgba(255,255,255,0.02)",display:"inline-block"}}/>Weekend</span>
        </div>
      </div>
      <div className="section-label">BADGES</div>
      <div className="badge-grid" style={{marginBottom:16}}>
        {BADGES.map(b=>{const earned=myBadges.includes(b.id);return<div key={b.id} className={`badge-item ${earned?"earned":"locked"}`}><div style={{fontSize:28,marginBottom:4}}>{b.icon}</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1}}>{b.label}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2,lineHeight:1.3}}>{b.desc}</div></div>;})}
      </div>
      <div className="section-label">PACK COMPARISON</div>
      {[...members].sort((a,b)=>getTotalWorkouts(history,b)-getTotalWorkouts(history,a)).map((m,i)=>{
        const total=getTotalWorkouts(history,m),streak=getStreak(history,m),maxTotal=Math.max(...members.map(m2=>getTotalWorkouts(history,m2)),1);
        return<div key={m} className="member-row" style={{margin:"0 16px 8px"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"var(--muted)",width:22}}>{i+1}</div>
          <AvatarDisplay profile={profiles[m]} size={36}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{m}{m===currentUser&&" (you)"}</span><span style={{fontSize:12,color:"var(--muted)"}}>{total} workouts</span></div>
            <div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${(total/maxTotal)*100}%`}}/></div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>🔥{streak} day streak</div>
          </div>
        </div>;
      })}
    </div>
  );
}

function computeBadges(name,history,feed,challenges){
  const earned=[];
  const total=getTotalWorkouts(history,name),streak=getStreak(history,name);
  const myPosts=feed.filter(p=>p.author===name).length;
  const completedC=challenges.filter(c=>c.participants?.[name]?.done||(c.goalType==="dateRange"&&c.startDate&&c.endDate&&weekdaysInRange(c.startDate,c.endDate).filter(d=>history[d]?.[name]?.done).length>=c.goal)).length;
  if(total>=1)earned.push("first_blood");if(streak>=7)earned.push("week_warrior");if(streak>=21)earned.push("consistent");if(streak>=30)earned.push("monthly");if(total>=100)earned.push("centurion");if(myPosts>=10)earned.push("social");if(completedC>=1)earned.push("challenger");
  return earned;
}

function WorkoutModal({onClose,onSubmit}){
  const [selected,setSelected]=useState(null);const[note,setNote]=useState("");
  return<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-handle"/><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>LOG WORKOUT</div><div className="workout-grid" style={{marginBottom:14}}>{WORKOUT_TYPES.map(w=><button key={w.id} className={`workout-tile ${selected?.id===w.id?"selected":""}`} onClick={()=>setSelected(w)}><div style={{fontSize:24,marginBottom:4}}>{w.icon}</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:selected?.id===w.id?"var(--accent2)":"var(--muted)"}}>{w.label}</div></button>)}</div><input className="input" placeholder="Optional note... (PR, how it went)" value={note} onChange={e=>setNote(e.target.value)} style={{marginBottom:12}} maxLength={80}/><button className="btn-primary" disabled={!selected} onClick={()=>onSubmit(selected,note)}>LOG IT 💪</button></div></div>;
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
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
  const [workoutModal,setWorkoutModal]=useState(false);
  const [adminOpen,setAdminOpen]=useState(false);
  const [toast,setToast]=useState("");
  const unsubRefs=useRef([]);
  const toastTimer=useRef(null);

  const showToast=useCallback((msg)=>{setToast(msg);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(""),3000);},[]);

  useEffect(()=>{
    (async()=>{
      const membersDoc=await fsGet("wolfpack/members");
      const m=membersDoc?.list||[];
      setMembers(m);
      const u1=fsListen("wolfpack/workouts",data=>{if(data){setSharedData(data.byDate||{});setHistory(data.byDate||{});}});
      const u2=fsListen("wolfpack/profiles",data=>{if(data)setProfiles(data.users||{});});
      const u3=fsListen("wolfpack/feed",data=>{if(data)setFeed((data.posts||[]).sort((a,b)=>b.ts-a.ts));});
      const u4=fsListen("wolfpack/challenges",data=>{if(data)setChallenges(data.list||[]);});
      const u5=fsListen("wolfpack/gym",data=>{if(data)setGymSlots(data.slots||[]);});
      unsubRefs.current=[u1,u2,u3,u4,u5];
      fsGet("wolfpack/admin").then(d=>{if(d?.name)setAdminName(d.name);});
      setScreen(m.length>0?"login":"onboard");
    })();
    return()=>unsubRefs.current.forEach(u=>u?.());
  },[]);

  // Foreground push notifications
  useEffect(()=>{
    const unsub=onForegroundMessage((payload)=>{
      const{title,body}=payload.notification||{};
      showToast(`${title||"WOLFPACK"}: ${body||""}`);
    });
    return()=>unsub?.();
  },[showToast]);

  const handleJoin=async(name,avatar,pin,avatarImg)=>{
    if(members.map(m=>m.toLowerCase()).includes(name.toLowerCase())){setCurrentUser(name);setScreen("main");return;}
    await fsSet(`wolfpack/pin_${name}`,{pin});
    const nm=[...members,name];
    const profile={avatar:avatar||"🐺",...(avatarImg?{avatarImg}:{})};
    const np={...profiles,[name]:profile};
    if(members.length===0){await fsSet("wolfpack/admin",{name});setAdminName(name);}
    await fsSet("wolfpack/members",{list:nm});
    await fsSet("wolfpack/profiles",{users:np});
    setMembers(nm);setProfiles(np);setCurrentUser(name);setScreen("main");
    showToast(`Welcome to the pack, ${name}! 🐺`);
  };

  const handleLogin=(name,action)=>{if(action==="join"){setScreen("onboard");return;}setCurrentUser(name);setScreen("main");};

  const handleResetPin=async(memberName)=>{await fsDelete(`wolfpack/pin_${memberName}`);showToast(`${memberName}'s PIN has been reset.`);};

  const handleDeleteAccount=async(memberName)=>{
    // Remove from members list
    const nm=members.filter(m=>m!==memberName);
    await fsSet("wolfpack/members",{list:nm});
    // Remove profile
    const np={...profiles};delete np[memberName];
    await fsSet("wolfpack/profiles",{users:np});
    // Remove PIN
    await fsDelete(`wolfpack/pin_${memberName}`);
    // Remove from all challenges
    const newChallenges=challenges.map(c=>{
      const newParts={...c.participants};delete newParts[memberName];
      return{...c,participants:newParts};
    });
    await fsSet("wolfpack/challenges",{list:newChallenges});
    // Remove gym slots
    const newSlots=gymSlots.filter(s=>s.bookedBy!==memberName);
    await fsSet("wolfpack/gym",{slots:newSlots});
    setMembers(nm);setProfiles(np);
    showToast(`${memberName} has been removed from the pack.`);
  };

  const handleLogWorkout=async(workoutType,note)=>{
    const todayKey=today();
    const time=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    const entry={done:true,workoutType:workoutType.id,workoutIcon:workoutType.icon,workoutLabel:workoutType.label,note,time,ts:Date.now()};
    const newData={...history,[todayKey]:{...(history[todayKey]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newData});
    setWorkoutModal(false);launchConfetti();showToast(`${workoutType.icon} Workout logged! 🐺`);
  };

  const handlePost=async(text)=>{const post={id:Date.now().toString(),author:currentUser,text,ts:Date.now(),likes:[]};await fsSet("wolfpack/feed",{posts:[post,...feed]});showToast("Posted! 🐺");};
  const handleLike=async(postId)=>{const newFeed=feed.map(p=>{if(p.id!==postId)return p;const likes=p.likes||[];return{...p,likes:likes.includes(currentUser)?likes.filter(l=>l!==currentUser):[...likes,currentUser]};});await fsSet("wolfpack/feed",{posts:newFeed});};
  const handleDeletePost=async(postId)=>{await fsSet("wolfpack/feed",{posts:feed.filter(p=>p.id!==postId)});};
  const handleBookGym=async(date,time)=>{const existing=gymSlots.filter(s=>s.date===date&&s.time===time);if(existing.length>=2){showToast("That slot is full!");return;}if(existing.find(s=>s.bookedBy===currentUser)){showToast("You already have that slot!");return;}await fsSet("wolfpack/gym",{slots:[...gymSlots,{id:Date.now().toString(),date,time,bookedBy:currentUser,createdAt:Date.now()}]});showToast(`Gym booked for ${time}! 💪`);};
  const handleCancelGym=async(slotId)=>{await fsSet("wolfpack/gym",{slots:gymSlots.filter(s=>s.id!==slotId)});showToast("Cancelled.");};
  const handleAddChallenge=async(challenge)=>{await fsSet("wolfpack/challenges",{list:[challenge,...challenges]});showToast("Challenge created! ⚔️");};
  const handleLogProgress=async(challengeId,member,progress,done)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      const updated={...c,participants:{...c.participants,[member]:{progress,done}}};
      const allDone=Object.values(updated.participants).every(p=>p.done);
      if(allDone){updated.status="completed";launchConfetti();showToast("🏆 Challenge complete!");}
      return updated;
    });
    await fsSet("wolfpack/challenges",{list:newList});
    if(done)showToast("✓ You completed your part! 🎉");else showToast("Progress logged!");
  };
  const handleDeleteChallenge=async(challengeId)=>{await fsSet("wolfpack/challenges",{list:challenges.filter(c=>c.id!==challengeId)});showToast("Challenge removed.");};
  const handleEditChallenge=async(updated)=>{const newList=challenges.map(c=>c.id===updated.id?updated:c);await fsSet("wolfpack/challenges",{list:newList});showToast("Challenge updated!");};

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
          <AvatarDisplay profile={profiles[currentUser]} size={40}/>
        </div>
      </div>
      <div className="scroll">
        {view==="pack"&&<PackTab currentUser={currentUser} members={members} profiles={profiles} history={history} sharedData={sharedData} onLogWorkout={()=>setWorkoutModal(true)} adminName={adminName} onOpenAdmin={()=>setAdminOpen(true)}/>}
        {view==="feed"&&<FeedTab currentUser={currentUser} profiles={profiles} feed={feed} onPost={handlePost} onLike={handleLike} onDelete={handleDeletePost}/>}
        {view==="gym"&&<GymTab currentUser={currentUser} gymSlots={gymSlots} onBook={handleBookGym} onCancel={handleCancelGym}/>}
        {view==="challenges"&&<ChallengesTab currentUser={currentUser} members={members} challenges={challenges} history={history} onAdd={handleAddChallenge} onLogProgress={handleLogProgress} onDelete={handleDeleteChallenge} onEditChallenge={handleEditChallenge}/>}
        {view==="stats"&&<StatsTab currentUser={currentUser} members={members} profiles={profiles} history={history} challenges={challenges} feed={feed}/>}
      </div>
      <nav className="nav">{NAV.map(n=><button key={n.id} className={`nav-btn ${view===n.id?"active":""}`} onClick={()=>setView(n.id)}><span className="icon">{n.icon}</span><span>{n.label}</span></button>)}</nav>
      {workoutModal&&<WorkoutModal onClose={()=>setWorkoutModal(false)} onSubmit={handleLogWorkout}/>}
      {adminOpen&&<AdminPanel members={members} profiles={profiles} currentUser={currentUser} adminName={adminName} onResetPin={handleResetPin} onDeleteAccount={handleDeleteAccount} onClose={()=>setAdminOpen(false)}/>}
    </div>
  );
}
