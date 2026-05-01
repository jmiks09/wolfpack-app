import { useState, useEffect, useRef, useCallback } from "react";
import { fsGet, fsSet, fsDelete, fsListen } from "./firebase";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const WORKOUT_TYPES = [
  { id: "lift", icon: "🏋️", label: "Lifting" },
  { id: "run", icon: "🏃", label: "Running" },
  { id: "bike", icon: "🚴", label: "Cycling" },
  { id: "swim", icon: "🏊", label: "Swimming" },
  { id: "yoga", icon: "🧘", label: "Yoga" },
  { id: "hiit", icon: "⚡", label: "HIIT" },
  { id: "sport", icon: "⚽", label: "Sport" },
  { id: "walk", icon: "🚶", label: "Walking" },
  { id: "other", icon: "💪", label: "Other" },
];

const QUOTES = [
  "Your only competition is who you were yesterday.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "One workout at a time. One day at a time.",
  "Earn it.",
  "Make yourself proud.",
  "The wolf on the hill is never as hungry as the wolf climbing it.",
  "Train insane or remain the same.",
  "Sweat is just fat crying.",
  "Success starts with self-discipline.",
];

const BADGES = [
  { id: "first_blood", icon: "🩸", label: "First Blood", desc: "Log your first workout" },
  { id: "week_warrior", icon: "⚔️", label: "Week Warrior", desc: "7-day streak" },
  { id: "monthly", icon: "📅", label: "Iron Month", desc: "30-day streak" },
  { id: "centurion", icon: "💯", label: "Centurion", desc: "100 workouts logged" },
  { id: "social", icon: "🐺", label: "Pack Leader", desc: "Post 10 times in feed" },
  { id: "challenger", icon: "⚡", label: "Challenger", desc: "Complete a challenge" },
  { id: "gym_rat", icon: "🏋️", label: "Gym Rat", desc: "Book gym 20 times" },
  { id: "consistent", icon: "🔥", label: "On Fire", desc: "3-week streak" },
  { id: "penalty_free", icon: "🛡️", label: "Clean Slate", desc: "Win a penalty challenge" },
];

const WOLF_AVATARS = ["🐺","🦊","🦁","🐻","🐯","🦝","🐸","🦅","🦈","🐲","🦄","🦋"];

const GYM_HOURS = Array.from({length:14},(_,i)=>{
  const h = 6 + i;
  return h < 12 ? `${h}:00 AM` : h === 12 ? `12:00 PM` : `${h-12}:00 PM`;
});

const NAV = [
  { id: "pack", icon: "🐺", label: "PACK" },
  { id: "feed", icon: "💬", label: "FEED" },
  { id: "gym", icon: "🏋️", label: "GYM" },
  { id: "challenges", icon: "⚔️", label: "CHALLENGES" },
  { id: "stats", icon: "📊", label: "STATS" },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const weekDates = () => {
  const d = new Date();
  return Array.from({length:7},(_,i)=>{
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd.toISOString().split("T")[0];
  });
};
const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});

function getStreak(history, name) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const k = new Date(d);
    k.setDate(d.getDate() - i);
    const key = k.toISOString().split("T")[0];
    if (history[key]?.[name]?.done) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getTotalWorkouts(history, name) {
  return Object.values(history).filter(d => d?.[name]?.done).length;
}

function getQuote() {
  return QUOTES[new Date().getDate() % QUOTES.length];
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = Array.from({length:80},()=>({
    x: Math.random()*canvas.width,
    y: -10,
    r: Math.random()*6+4,
    c: ["#7c5cbf","#ff6b35","#f1c40f","#2ecc71","#e74c3c"][Math.floor(Math.random()*5)],
    vx: (Math.random()-0.5)*4,
    vy: Math.random()*4+2,
    life: 1,
  }));
  let frame;
  const draw = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    pieces.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life-=0.008;
      if(p.y<canvas.height&&p.life>0){alive=true;}
      ctx.globalAlpha=p.life;
      ctx.fillStyle=p.c;
      ctx.fillRect(p.x,p.y,p.r,p.r);
    });
    ctx.globalAlpha=1;
    if(alive) frame=requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  };
  draw();
  setTimeout(()=>{ cancelAnimationFrame(frame); ctx.clearRect(0,0,canvas.width,canvas.height); },4000);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({msg}) {
  return msg ? <div className="toast">{msg}</div> : null;
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function Onboarding({onJoin}) {
  const [step, setStep] = useState("name");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🐺");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");

  const handleName = () => {
    if (!name.trim()) return setError("Enter your name");
    setError(""); setStep("avatar");
  };
  const handleAvatar = () => setStep("pin");
  const handlePin = () => {
    if (pin.length < 4) return setError("PIN must be at least 4 digits");
    if (pin !== pin2) return setError("PINs don't match");
    setError("");
    onJoin(name.trim(), avatar, pin);
  };

  return (
    <div className="onboard">
      <div style={{fontSize:72}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:40,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
        WOLFPACK
      </div>
      <div style={{color:"var(--muted)",fontSize:15,marginTop:-8}}>fitness accountability</div>

      {step === "name" && (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"}}>YOUR NAME</div>
          <input className="input" placeholder="Enter your name..." value={name}
            onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleName()} maxLength={20} autoFocus />
          {error && <div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
          <button className="btn-primary" onClick={handleName}>CONTINUE →</button>
        </div>
      )}

      {step === "avatar" && (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"}}>PICK YOUR SPIRIT ANIMAL</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {WOLF_AVATARS.map(a=>(
              <button key={a} onClick={()=>setAvatar(a)} style={{
                padding:14,fontSize:28,borderRadius:14,cursor:"pointer",
                background: avatar===a?"rgba(124,92,191,0.25)":"var(--bg3)",
                border: avatar===a?"2px solid var(--accent)":"2px solid var(--border)",
                transition:"all 0.15s"
              }}>{a}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={handleAvatar}>CONTINUE →</button>
        </div>
      )}

      {step === "pin" && (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"}}>SET YOUR PIN</div>
          <input className="input" type="password" inputMode="numeric" placeholder="4+ digit PIN..." value={pin}
            onChange={e=>setPin(e.target.value.replace(/\D/g,""))} maxLength={8} autoFocus />
          <input className="input" type="password" inputMode="numeric" placeholder="Confirm PIN..." value={pin2}
            onChange={e=>setPin2(e.target.value.replace(/\D/g,""))} maxLength={8}
            onKeyDown={e=>e.key==="Enter"&&handlePin()} />
          {error && <div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
          <button className="btn-primary" onClick={handlePin}>JOIN THE PACK 🐺</button>
        </div>
      )}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({members, profiles, onLogin}) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!selected) return;
    const stored = await fsGet(`wolfpack/pin_${selected}`);
    if (stored?.pin === pin) onLogin(selected);
    else setError("Wrong PIN. Try again.");
  };

  return (
    <div className="onboard">
      <div style={{fontSize:56}}>🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:5,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
        WOLFPACK
      </div>
      {!selected ? (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:3,color:"var(--muted)",marginBottom:4}}>WHO ARE YOU?</div>
          {members.map(m=>(
            <button key={m} onClick={()=>setSelected(m)} className="member-row" style={{cursor:"pointer",border:"1px solid var(--border)",textAlign:"left"}}>
              <div className="avatar" style={{background:"var(--bg2)",fontSize:24}}>{profiles[m]?.avatar||"🐺"}</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{m}</div>
            </button>
          ))}
          <div style={{marginTop:8,color:"var(--muted)",fontSize:13}}>New here?{" "}
            <span style={{color:"var(--accent2)",cursor:"pointer"}} onClick={()=>onLogin(null, true)}>Join the Pack</span>
          </div>
        </div>
      ) : (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--bg3)",borderRadius:12}}>
            <div style={{fontSize:28}}>{profiles[selected]?.avatar||"🐺"}</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2}}>{selected}</div>
          </div>
          <input className="input" type="password" inputMode="numeric" placeholder="Enter PIN..." value={pin}
            onChange={e=>setPin(e.target.value.replace(/\D/g,""))} autoFocus maxLength={8}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          {error && <div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
          <button className="btn-primary" onClick={handleLogin}>LET ME IN 🐺</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={()=>{setSelected(null);setPin("");setError("");}}>← Back</button>
        </div>
      )}
    </div>
  );
}

// ── PACK TAB ──────────────────────────────────────────────────────────────────
function PackTab({currentUser, members, profiles, history, sharedData, onLogWorkout}) {
  const todayKey = today();
  const todayData = sharedData[todayKey] || {};
  const myStatus = todayData[currentUser];
  const streak = getStreak(history, currentUser);
  const total = getTotalWorkouts(history, currentUser);
  const isWeekend = [0,6].includes(new Date().getDay());

  const sorted = [...members].sort((a,b)=>{
    const as = getStreak(history,a), bs = getStreak(history,b);
    if(bs!==as) return bs-as;
    return b===currentUser?1:a===currentUser?-1:0;
  });

  return (
    <div>
      {/* Header quote */}
      <div style={{padding:"16px 16px 8px"}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:3,color:"var(--muted)",marginBottom:6}}>TODAY'S HOWL</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontStyle:"italic",lineHeight:1.5}}>"{getQuote()}"</div>
      </div>

      {/* My status / Log workout */}
      {!isWeekend && (
        <div style={{padding:"8px 16px 4px"}}>
          {!myStatus?.done ? (
            <button className="btn-primary glow-purple" onClick={onLogWorkout} style={{marginBottom:0}}>
              🐺 LOG TODAY'S WORKOUT
            </button>
          ) : (
            <div style={{background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:16,padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:28}}>{myStatus.workoutIcon}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2,color:"var(--accent2)"}}>
                    ✓ LOGGED — {myStatus.workoutLabel?.toUpperCase()}
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>{myStatus.time}</div>
                </div>
                {myStatus.note && (
                  <div style={{fontSize:12,color:"var(--muted)",maxWidth:120,textAlign:"right",fontStyle:"italic"}}>"{myStatus.note}"</div>
                )}
              </div>
              <button className="btn-ghost" onClick={onLogWorkout} style={{marginTop:10,width:"100%",fontSize:12}}>+ Log Another</button>
            </div>
          )}
        </div>
      )}
      {isWeekend && (
        <div style={{margin:"8px 16px",padding:"12px 16px",background:"var(--bg3)",borderRadius:14,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:4}}>😴</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--muted)"}}>REST DAY — YOU EARNED IT</div>
        </div>
      )}

      {/* My stats row */}
      <div style={{display:"flex",gap:8,padding:"12px 16px 8px",overflowX:"auto"}}>
        <div className="pill pill-purple"><span className="flame">🔥</span>{streak} DAY STREAK</div>
        <div className="pill pill-orange">💪 {total} TOTAL</div>
      </div>

      {/* Pack leaderboard */}
      <div className="section-label" style={{marginTop:8}}>THE PACK</div>
      {sorted.map((m,i)=>{
        const ms = getStreak(history,m);
        const mt = getTotalWorkouts(history,m);
        const done = !!todayData[m]?.done;
        const isMe = m === currentUser;
        return (
          <div key={m} className="member-row" style={{
            margin:"0 16px 8px",
            background: isMe?"rgba(124,92,191,0.08)":"var(--bg3)",
            border: isMe?"1px solid rgba(124,92,191,0.3)":"1px solid var(--border)",
          }}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"var(--muted)",width:22,textAlign:"center"}}>{i+1}</div>
            <div className="avatar" style={{background:"var(--bg2)",fontSize:22}}>{profiles[m]?.avatar||"🐺"}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1}}>{m}</span>
                {isMe && <span style={{fontSize:11,color:"var(--accent2)",background:"rgba(124,92,191,0.2)",padding:"1px 6px",borderRadius:4}}>YOU</span>}
              </div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:1}}>
                <span className="flame">🔥</span>{ms} streak · {mt} workouts
              </div>
            </div>
            <div style={{
              width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
              background: done?"rgba(46,204,113,0.15)":"rgba(255,255,255,0.04)",
              border: done?"1px solid rgba(46,204,113,0.4)":"1px solid var(--border)",
              fontSize:18
            }}>
              {done ? (todayData[m].workoutIcon||"✓") : "○"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── FEED TAB ──────────────────────────────────────────────────────────────────
function FeedTab({currentUser, profiles, feed, onPost, onLike, onDelete}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onPost(text.trim());
    setText(""); setOpen(false);
  };

  return (
    <div>
      <div style={{padding:"12px 16px 8px"}}>
        <button className="btn-primary" onClick={()=>setOpen(true)}>💬 POST TO THE PACK</button>
      </div>
      {feed.length === 0 && (
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}>
          <div style={{fontSize:40,marginBottom:12}}>🐺</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>THE FEED IS EMPTY</div>
          <div style={{fontSize:13,marginTop:6}}>Be the first to post something.</div>
        </div>
      )}
      {feed.map(post=>{
        const liked = (post.likes||[]).includes(currentUser);
        const isMe = post.author === currentUser;
        return (
          <div key={post.id} className="card">
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div className="avatar" style={{background:"var(--bg2)",fontSize:20}}>{profiles[post.author]?.avatar||"🐺"}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{post.author}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{fmtTime(post.ts)}</div>
              </div>
              {isMe && (
                <button onClick={()=>onDelete(post.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18}}>×</button>
              )}
            </div>
            <div style={{fontSize:15,lineHeight:1.5,marginBottom:12}}>{post.text}</div>
            <button onClick={()=>onLike(post.id)} style={{
              background:"none",border:"none",cursor:"pointer",
              color:liked?"var(--orange)":"var(--muted)",
              display:"flex",alignItems:"center",gap:5,fontSize:13,transition:"color 0.15s"
            }}>
              {liked?"🔥":"🤍"} {(post.likes||[]).length || 0} {(post.likes||[]).length===1?"like":"likes"}
            </button>
          </div>
        );
      })}

      {open && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>POST TO THE PACK</div>
            <textarea className="input" rows={4} placeholder="What's on your mind, wolf?..."
              value={text} onChange={e=>setText(e.target.value)}
              style={{resize:"none",marginBottom:12}} autoFocus />
            <button className="btn-primary" onClick={submit} disabled={!text.trim()}>POST 🐺</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GYM TAB ───────────────────────────────────────────────────────────────────
function GymTab({currentUser, gymSlots, onBook, onCancel}) {
  const [selDate, setSelDate] = useState(today());
  const dates = weekDates();

  const slotsForDate = gymSlots.filter(s => s.date === selDate);
  const mySlots = gymSlots.filter(s => s.bookedBy === currentUser);

  return (
    <div>
      {/* Date selector */}
      <div style={{padding:"12px 16px 8px",overflowX:"auto",display:"flex",gap:8,paddingBottom:12}}>
        {dates.map(d=>{
          const isToday = d===today();
          const active = d===selDate;
          const dd = new Date(d+"T00:00:00");
          return (
            <button key={d} onClick={()=>setSelDate(d)} style={{
              flexShrink:0,padding:"8px 14px",borderRadius:12,cursor:"pointer",
              background:active?"linear-gradient(135deg,var(--accent),var(--orange))":"var(--bg3)",
              border:"none",color:"#fff",fontFamily:"'DM Sans',sans-serif",textAlign:"center",minWidth:60
            }}>
              <div style={{fontSize:11,opacity:0.8}}>{dd.toLocaleDateString("en-US",{weekday:"short"})}</div>
              <div style={{fontSize:18,fontWeight:700}}>{dd.getDate()}</div>
              {isToday&&<div style={{fontSize:9,opacity:0.8}}>TODAY</div>}
            </button>
          );
        })}
      </div>

      {/* My reservations */}
      {mySlots.length > 0 && (
        <>
          <div className="section-label">MY RESERVATIONS</div>
          {mySlots.map(s=>(
            <div key={s.id} style={{
              display:"flex",alignItems:"center",gap:12,margin:"0 16px 8px",
              padding:"12px 14px",background:"rgba(124,92,191,0.1)",borderRadius:12,
              border:"1px solid rgba(124,92,191,0.25)"
            }}>
              <span style={{fontSize:20}}>🏋️</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>{s.time}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{fmt(s.date)}</div>
              </div>
              <button onClick={()=>onCancel(s.id)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>Cancel</button>
            </div>
          ))}
        </>
      )}

      {/* Time slots */}
      <div className="section-label">{fmt(selDate)}</div>
      {GYM_HOURS.map(time=>{
        const booked = slotsForDate.filter(s=>s.time===time);
        const mine = booked.find(s=>s.bookedBy===currentUser);
        const full = booked.length >= 2;
        return (
          <div key={time} style={{
            display:"flex",alignItems:"center",gap:12,margin:"0 16px 8px",
            padding:"12px 14px",background:"var(--card)",borderRadius:12,
            border:`1px solid ${mine?"rgba(124,92,191,0.3)":full?"rgba(231,76,60,0.2)":"var(--border)"}`
          }}>
            <div style={{width:72,fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1,color:mine?"var(--accent2)":full?"var(--red)":"var(--text)"}}>{time}</div>
            <div style={{flex:1,display:"flex",gap:6,flexWrap:"wrap"}}>
              {booked.map(s=>(
                <span key={s.id} style={{fontSize:13,background:"var(--bg3)",padding:"3px 8px",borderRadius:8,color:"var(--muted)"}}>{s.bookedBy}</span>
              ))}
              {booked.length===0&&<span style={{fontSize:12,color:"var(--muted)"}}>Open</span>}
            </div>
            {mine ? (
              <button onClick={()=>onCancel(mine.id)} style={{background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"var(--muted)",fontSize:12}}>Cancel</button>
            ) : full ? (
              <span style={{fontSize:12,color:"var(--red)",fontWeight:600}}>FULL</span>
            ) : (
              <button onClick={()=>onBook(selDate, time)} style={{
                background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1
              }}>BOOK</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CHALLENGES TAB ────────────────────────────────────────────────────────────
function ChallengesTab({currentUser, members, challenges, history, onAdd, onLogProgress, onDelete}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({title:"",type:"reps",goal:30,unit:"reps",penalty:"",penaltyAmt:""});

  const submit = () => {
    if (!form.title.trim() || !form.goal) return;
    onAdd({
      id: Date.now().toString(),
      title: form.title.trim(),
      type: form.type,
      goal: Number(form.goal),
      unit: form.unit,
      penalty: form.penalty.trim(),
      penaltyAmt: form.penaltyAmt ? Number(form.penaltyAmt) : 0,
      createdBy: currentUser,
      createdAt: Date.now(),
      participants: members.reduce((a,m)=>({...a,[m]:{progress:0,done:false}}),{}),
      status: "active",
    });
    setForm({title:"",type:"reps",goal:30,unit:"reps",penalty:"",penaltyAmt:""});
    setOpen(false);
  };

  const active = challenges.filter(c=>c.status==="active");
  const done = challenges.filter(c=>c.status!=="active");

  return (
    <div>
      <div style={{padding:"12px 16px 8px"}}>
        <button className="btn-primary" onClick={()=>setOpen(true)}>⚔️ CREATE CHALLENGE</button>
      </div>

      {active.length===0&&done.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}>
          <div style={{fontSize:40,marginBottom:12}}>⚔️</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>NO ACTIVE CHALLENGES</div>
          <div style={{fontSize:13,marginTop:6}}>Create one and hold each other accountable.</div>
        </div>
      )}

      {active.length>0&&<div className="section-label">ACTIVE</div>}
      {active.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} members={members} onLog={onLogProgress} onDelete={onDelete} history={history}/>)}

      {done.length>0&&<div className="section-label" style={{marginTop:8}}>COMPLETED</div>}
      {done.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} members={members} onLog={onLogProgress} onDelete={onDelete} history={history} completed/>)}

      {open && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>NEW CHALLENGE</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input className="input" placeholder="Challenge name..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoFocus maxLength={50}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div>
                  <input className="input" type="number" placeholder="e.g. 100" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} min={1}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div>
                  <select className="input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={{appearance:"none"}}>
                    {["reps","miles","minutes","days","lbs","kg","sessions"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty (optional)</div>
                <input className="input" placeholder='e.g. "Buys the team lunch"' value={form.penalty} onChange={e=>setForm({...form,penalty:e.target.value})} maxLength={80}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty amount $ (optional)</div>
                <input className="input" type="number" placeholder="e.g. 20" value={form.penaltyAmt} onChange={e=>setForm({...form,penaltyAmt:e.target.value})} min={0}/>
              </div>
              <button className="btn-primary" onClick={submit} disabled={!form.title.trim()||!form.goal} style={{marginTop:4}}>CREATE ⚔️</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChallengeCard({challenge:c, currentUser, members, onLog, onDelete, history, completed}) {
  const [logOpen, setLogOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const myProgress = c.participants?.[currentUser]?.progress || 0;
  const myDone = c.participants?.[currentUser]?.done || false;
  const pct = Math.min(100, Math.round((myProgress / c.goal) * 100));

  const memberProgress = members.map(m=>({
    name:m,
    progress: c.participants?.[m]?.progress || 0,
    done: c.participants?.[m]?.done || false,
    pct: Math.min(100,Math.round(((c.participants?.[m]?.progress||0)/c.goal)*100))
  })).sort((a,b)=>b.pct-a.pct);

  const handleLog = () => {
    const n = Number(amt);
    if (!n || n<=0) return;
    onLog(c.id, currentUser, myProgress + n, myProgress + n >= c.goal);
    setAmt(""); setLogOpen(false);
  };

  // Calculate who owes penalty
  const losers = completed ? memberProgress.filter(m=>!m.done) : [];
  const myOwed = losers.find(m=>m.name===currentUser);

  return (
    <div className="challenge-card">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{c.title}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>
            Goal: {c.goal} {c.unit}
            {c.penalty&&<span style={{color:"var(--orange)"}}>  · {c.penalty}{c.penaltyAmt>0?` ($${c.penaltyAmt})`:""}</span>}
          </div>
        </div>
        {c.createdBy===currentUser&&(
          <button onClick={()=>onDelete(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,padding:"0 0 0 8px"}}>×</button>
        )}
      </div>

      {/* My progress */}
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:13,color:"var(--accent2)"}}>You: {myProgress}/{c.goal} {c.unit}</span>
          <span style={{fontSize:13,color:pct>=100?"var(--green)":"var(--muted)"}}>{pct}%</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
      </div>

      {/* Pack progress */}
      {memberProgress.filter(m=>m.name!==currentUser).map(m=>(
        <div key={m.name} style={{marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:12,color:"var(--muted)"}}>{m.name}: {m.progress}/{c.goal}</span>
            <span style={{fontSize:12,color:m.pct>=100?"var(--green)":"var(--muted)"}}>{m.pct}%</span>
          </div>
          <div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${m.pct}%`,opacity:0.6}}/></div>
        </div>
      ))}

      {/* Penalty section */}
      {completed && losers.length > 0 && (
        <div style={{marginTop:10,padding:"10px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:10}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--red)",marginBottom:5}}>🚨 PENALTY OWED</div>
          {losers.map(l=>(
            <div key={l.name} style={{fontSize:13,color:"var(--muted)"}}>
              <span style={{color:"var(--text)"}}>{l.name}</span> missed by {c.goal-l.progress} {c.unit}
              {c.penaltyAmt>0&&<span style={{color:"var(--red)"}}> — owes ${c.penaltyAmt}</span>}
            </div>
          ))}
          {myOwed&&<div style={{marginTop:6,fontSize:12,color:"var(--orange)",fontWeight:600}}>😬 That's you! {c.penalty}</div>}
        </div>
      )}

      {/* Log progress button */}
      {!completed && !myDone && (
        <button onClick={()=>setLogOpen(true)} style={{
          marginTop:10,width:"100%",padding:"10px",background:"rgba(124,92,191,0.15)",
          border:"1px solid rgba(124,92,191,0.3)",borderRadius:10,cursor:"pointer",
          color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2
        }}>+ LOG PROGRESS</button>
      )}
      {myDone&&<div style={{marginTop:8,textAlign:"center",color:"var(--green)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>✓ YOU COMPLETED THIS</div>}

      {logOpen && (
        <div style={{marginTop:10,display:"flex",gap:8}}>
          <input className="input" type="number" placeholder={`Add ${c.unit}...`} value={amt}
            onChange={e=>setAmt(e.target.value)} min={1} autoFocus onKeyDown={e=>e.key==="Enter"&&handleLog()}/>
          <button onClick={handleLog} disabled={!amt||Number(amt)<=0} style={{
            padding:"10px 16px",background:"var(--accent)",border:"none",borderRadius:10,
            cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1
          }}>LOG</button>
          <button onClick={()=>{setLogOpen(false);setAmt("");}} style={{
            padding:"10px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13
          }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────
function StatsTab({currentUser, members, profiles, history, challenges, feed}) {
  const last30 = Array.from({length:30},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-29+i);
    return { date:d.toISOString().split("T")[0], day:d.getDate() };
  });

  const myBadges = computeBadges(currentUser, history, feed, challenges);

  return (
    <div>
      {/* Workout calendar heatmap */}
      <div className="section-label" style={{marginTop:12}}>LAST 30 DAYS</div>
      <div style={{padding:"0 16px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:5}}>
          {last30.map(({date,day})=>{
            const done = !!history[date]?.[currentUser]?.done;
            return (
              <div key={date} style={{
                aspectRatio:"1",borderRadius:6,
                background: done?"linear-gradient(135deg,var(--accent),var(--orange))":"var(--bg3)",
                border:"1px solid var(--border)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:9,color:done?"#fff":"var(--muted)"
              }}>{day}</div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="section-label">BADGES</div>
      <div className="badge-grid" style={{marginBottom:16}}>
        {BADGES.map(b=>{
          const earned = myBadges.includes(b.id);
          return (
            <div key={b.id} className={`badge-item ${earned?"earned":"locked"}`}>
              <div style={{fontSize:28,marginBottom:4}}>{b.icon}</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1}}>{b.label}</div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:2,lineHeight:1.3}}>{b.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Pack comparison */}
      <div className="section-label">PACK STATS</div>
      {[...members].sort((a,b)=>getTotalWorkouts(history,b)-getTotalWorkouts(history,a)).map((m,i)=>{
        const total = getTotalWorkouts(history,m);
        const streak = getStreak(history,m);
        const max = getTotalWorkouts(history, members[0]) || 1;
        return (
          <div key={m} className="member-row" style={{margin:"0 16px 8px"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"var(--muted)",width:22}}>{i+1}</div>
            <div className="avatar" style={{background:"var(--bg2)",fontSize:20}}>{profiles[m]?.avatar||"🐺"}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{m}{m===currentUser&&" (you)"}</span>
                <span style={{fontSize:12,color:"var(--muted)"}}>{total} workouts</span>
              </div>
              <div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${(total/Math.max(...members.map(m2=>getTotalWorkouts(history,m2)),1))*100}%`}}/></div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}><span className="flame">🔥</span>{streak} day streak</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function computeBadges(name, history, feed, challenges) {
  const earned = [];
  const total = getTotalWorkouts(history, name);
  const streak = getStreak(history, name);
  const myPosts = feed.filter(p=>p.author===name).length;
  const completedChallenges = challenges.filter(c=>c.participants?.[name]?.done).length;
  const gymBookings = Object.values(history).filter(d=>d?.[name]?.gym).length;

  if(total>=1) earned.push("first_blood");
  if(streak>=7) earned.push("week_warrior");
  if(streak>=21) earned.push("consistent");
  if(streak>=30) earned.push("monthly");
  if(total>=100) earned.push("centurion");
  if(myPosts>=10) earned.push("social");
  if(completedChallenges>=1) earned.push("challenger");
  if(gymBookings>=20) earned.push("gym_rat");

  return earned;
}

// ── WORKOUT MODAL ─────────────────────────────────────────────────────────────
function WorkoutModal({onClose, onSubmit}) {
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>LOG WORKOUT</div>
        <div className="workout-grid" style={{marginBottom:14}}>
          {WORKOUT_TYPES.map(w=>(
            <button key={w.id} className={`workout-tile ${selected?.id===w.id?"selected":""}`}
              onClick={()=>setSelected(w)}>
              <div style={{fontSize:24,marginBottom:4}}>{w.icon}</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:selected?.id===w.id?"var(--accent2)":"var(--muted)"}}>{w.label}</div>
            </button>
          ))}
        </div>
        <input className="input" placeholder="Optional note... (PR, how it went)" value={note}
          onChange={e=>setNote(e.target.value)} style={{marginBottom:12}} maxLength={80}/>
        <button className="btn-primary" disabled={!selected} onClick={()=>onSubmit(selected, note)}>
          LOG IT 💪
        </button>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [sharedData, setSharedData] = useState({});
  const [history, setHistory] = useState({});
  const [feed, setFeed] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [gymSlots, setGymSlots] = useState([]);
  const [adminName, setAdminName] = useState(null);
  const [view, setView] = useState("pack");
  const [workoutModal, setWorkoutModal] = useState(false);
  const [toast, setToast] = useState("");
  const unsubRefs = useRef([]);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(""), 3000);
  }, []);

  // Load data
  useEffect(()=>{
    (async()=>{
      const membersDoc = await fsGet("wolfpack/members");
      const m = membersDoc?.list || [];
      setMembers(m);

      const u1 = fsListen("wolfpack/workouts", data=>{
        if(data){setSharedData(data.byDate||{});setHistory(data.byDate||{});}
      });
      const u2 = fsListen("wolfpack/profiles", data=>{ if(data) setProfiles(data.users||{}); });
      const u3 = fsListen("wolfpack/feed", data=>{ if(data) setFeed((data.posts||[]).sort((a,b)=>b.ts-a.ts)); });
      const u4 = fsListen("wolfpack/challenges", data=>{ if(data) setChallenges(data.list||[]); });
      const u5 = fsListen("wolfpack/gym", data=>{ if(data) setGymSlots(data.slots||[]); });
      unsubRefs.current = [u1,u2,u3,u4,u5];

      fsGet("wolfpack/admin").then(d=>{ if(d?.name) setAdminName(d.name); });
      setScreen(m.length > 0 ? "login" : "onboard");
    })();
    return ()=> unsubRefs.current.forEach(u=>u?.());
  }, []);

  // ── AUTH ───────────────────────────────────────────────────────────────────
  const handleJoin = async (name, avatar, pin) => {
    if (members.map(m=>m.toLowerCase()).includes(name.toLowerCase())) {
      setCurrentUser(name); setScreen("main"); return;
    }
    await fsSet(`wolfpack/pin_${name}`, {pin});
    const nm = [...members, name];
    const np = {...profiles, [name]:{avatar}};
    if (members.length === 0) await fsSet("wolfpack/admin", {name});
    await fsSet("wolfpack/members", {list:nm});
    await fsSet("wolfpack/profiles", {users:np});
    setMembers(nm); setProfiles(np);
    setCurrentUser(name); setScreen("main");
    showToast(`Welcome to the pack, ${name}! 🐺`);
  };

  const handleLogin = (name, goJoin) => {
    if (goJoin) { setScreen("onboard"); return; }
    setCurrentUser(name); setScreen("main");
  };

  // ── WORKOUT ────────────────────────────────────────────────────────────────
  const handleLogWorkout = async (workoutType, note) => {
    const todayKey = today();
    const time = new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    const entry = {
      done: true,
      workoutType: workoutType.id,
      workoutIcon: workoutType.icon,
      workoutLabel: workoutType.label,
      note,
      time,
      ts: Date.now(),
    };
    const newData = {
      ...history,
      [todayKey]: {...(history[todayKey]||{}), [currentUser]: entry}
    };
    await fsSet("wolfpack/workouts", {byDate: newData});
    setWorkoutModal(false);
    launchConfetti();
    showToast(`${workoutType.icon} Workout logged! Keep it up! 🐺`);
  };

  // ── FEED ───────────────────────────────────────────────────────────────────
  const handlePost = async (text) => {
    const post = {id:Date.now().toString(), author:currentUser, text, ts:Date.now(), likes:[]};
    const newFeed = [post, ...feed];
    await fsSet("wolfpack/feed", {posts:newFeed});
    showToast("Posted! 🐺");
  };

  const handleLike = async (postId) => {
    const newFeed = feed.map(p=>{
      if(p.id!==postId) return p;
      const likes = p.likes||[];
      return {...p, likes: likes.includes(currentUser)?likes.filter(l=>l!==currentUser):[...likes,currentUser]};
    });
    await fsSet("wolfpack/feed", {posts:newFeed});
  };

  const handleDeletePost = async (postId) => {
    const newFeed = feed.filter(p=>p.id!==postId);
    await fsSet("wolfpack/feed", {posts:newFeed});
  };

  // ── GYM ───────────────────────────────────────────────────────────────────
  const handleBookGym = async (date, time) => {
    const existing = gymSlots.filter(s=>s.date===date&&s.time===time);
    if(existing.length >= 2) { showToast("That slot is full!"); return; }
    if(existing.find(s=>s.bookedBy===currentUser)) { showToast("You already have that slot!"); return; }
    const slot = {id:Date.now().toString(), date, time, bookedBy:currentUser, createdAt:Date.now()};
    const newSlots = [...gymSlots, slot];
    await fsSet("wolfpack/gym", {slots:newSlots});
    showToast(`Gym booked for ${time}! 💪`);
  };

  const handleCancelGym = async (slotId) => {
    const newSlots = gymSlots.filter(s=>s.id!==slotId);
    await fsSet("wolfpack/gym", {slots:newSlots});
    showToast("Reservation cancelled.");
  };

  // ── CHALLENGES ─────────────────────────────────────────────────────────────
  const handleAddChallenge = async (challenge) => {
    const newList = [challenge, ...challenges];
    await fsSet("wolfpack/challenges", {list:newList});
    showToast(`Challenge "${challenge.title}" created! ⚔️`);
  };

  const handleLogProgress = async (challengeId, member, progress, done) => {
    const newList = challenges.map(c=>{
      if(c.id!==challengeId) return c;
      const updated = {...c, participants:{...c.participants,[member]:{progress,done}}};
      // Check if all done → mark complete
      const allDone = Object.values(updated.participants).every(p=>p.done);
      if(allDone) { updated.status="completed"; launchConfetti(); showToast("🏆 Challenge complete!"); }
      return updated;
    });
    await fsSet("wolfpack/challenges", {list:newList});
    if(done) showToast("✓ You completed your part! 🎉");
    else showToast("Progress logged!");
  };

  const handleDeleteChallenge = async (challengeId) => {
    const newList = challenges.filter(c=>c.id!==challengeId);
    await fsSet("wolfpack/challenges", {list:newList});
    showToast("Challenge removed.");
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  if (screen === "loading") return (
    <div className="loading-screen">
      <div className="loading-wolf">🐺</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      <div style={{color:"var(--muted)",fontSize:13}}>Loading the pack...</div>
    </div>
  );

  if (screen === "onboard") return <Onboarding onJoin={handleJoin}/>;
  if (screen === "login") return <Login members={members} profiles={profiles} onLogin={handleLogin}/>;

  const todayData = sharedData[today()] || {};

  return (
    <div className="app">
      <canvas id="confetti-canvas"/>
      <Toast msg={toast}/>

      {/* Header */}
      <div className="header">
        <div>
          <div className="header-title">WOLFPACK</div>
          <div style={{fontSize:11,color:"var(--muted)",letterSpacing:1}}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{textAlign:"right",marginRight:4}}>
            <div style={{fontSize:11,color:"var(--muted)"}}>welcome back</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,color:"var(--accent2)"}}>{currentUser}</div>
          </div>
          <div className="avatar" style={{background:"var(--bg3)",fontSize:22,border:"1px solid var(--border)"}}>
            {profiles[currentUser]?.avatar||"🐺"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="scroll">
        {view === "pack" && <PackTab
          currentUser={currentUser} members={members} profiles={profiles}
          history={history} sharedData={sharedData} onLogWorkout={()=>setWorkoutModal(true)}
        />}
        {view === "feed" && <FeedTab
          currentUser={currentUser} profiles={profiles} feed={feed}
          onPost={handlePost} onLike={handleLike} onDelete={handleDeletePost}
        />}
        {view === "gym" && <GymTab
          currentUser={currentUser} gymSlots={gymSlots}
          onBook={handleBookGym} onCancel={handleCancelGym}
        />}
        {view === "challenges" && <ChallengesTab
          currentUser={currentUser} members={members} challenges={challenges}
          history={history} onAdd={handleAddChallenge} onLogProgress={handleLogProgress} onDelete={handleDeleteChallenge}
        />}
        {view === "stats" && <StatsTab
          currentUser={currentUser} members={members} profiles={profiles}
          history={history} challenges={challenges} feed={feed}
        />}
      </div>

      {/* Bottom nav */}
      <nav className="nav">
        {NAV.map(n=>(
          <button key={n.id} className={`nav-btn ${view===n.id?"active":""}`} onClick={()=>setView(n.id)}>
            <span className="icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Workout modal */}
      {workoutModal && <WorkoutModal onClose={()=>setWorkoutModal(false)} onSubmit={handleLogWorkout}/>}
    </div>
  );
}
