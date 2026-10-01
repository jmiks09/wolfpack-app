import { useRef, useState } from "react";
import { WolfIcon } from "../components/WolfIcon";
import { INVITE_CODE, WOLF_AVATARS } from "../lib/constants";
import { compressImage, readFileAsDataURL } from "../lib/utils";

// ── ONBOARDING ────────────────────────────────────────────────────────────────
export function Onboarding({onJoin}){
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
      <div style={{fontSize:64,display:"flex",justifyContent:"center"}}><WolfIcon size={80}/></div>
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
        <button className="btn-primary" onClick={handlePin} disabled={loading}>{loading?"JOINING...":<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><WolfIcon size={18}/>JOIN THE PACK</span>}</button>
      </div>}
    </div>
  );
}
