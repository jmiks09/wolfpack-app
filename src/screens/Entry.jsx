import { useRef, useState } from "react";
import { WolfIcon } from "../components/WolfIcon";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { fsGet } from "../firebase";
import { WOLF_AVATARS } from "../lib/constants";
import { findGroupByCode } from "../lib/groups";
import { compressImage, readFileAsDataURL } from "../lib/utils";

const title = {fontFamily:"'Bebas Neue',cursive",fontSize:38,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"};
const lbl = {fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"};
const wrap = {width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:12,marginTop:8};
const pinStyle = {letterSpacing:10,textAlign:"center",fontSize:24};
const digits = v => v.replace(/\D/g,"").slice(0,4);

function Shell({children,big}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:big?"center":"flex-start",minHeight:"100dvh",padding:"36px 24px 100px",gap:16,overflowY:"auto",background:"var(--bg)"}}>
      <WolfIcon size={big?96:72}/>
      <div style={big?{...title,fontSize:48}:title}>WOLFPACK</div>
      {children}
    </div>
  );
}
const Err = ({msg}) => msg ? <div style={{color:"var(--red)",fontSize:13}}>{msg}</div> : null;

// ── ENTRY ─────────────────────────────────────────────────────────────────────
// splash → sign in (name + PIN) or create account (name → look → PIN)
export function Entry({profiles,groups,onSignIn,onCreateAccount,onSetPin}){
  const [step,setStep]=useState("splash");
  const [name,setName]=useState("");
  const [pin,setPin]=useState("");
  const [pin2,setPin2]=useState("");
  const [avatar,setAvatar]=useState("🐺");
  const [avatarImg,setAvatarImg]=useState(null);
  const [matched,setMatched]=useState(null); // existing account name, exact casing
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [code,setCode]=useState("");
  const [codeGroup,setCodeGroup]=useState(null);
  const fileRef=useRef();

  const go=s=>{setError("");setPin("");setPin2("");setStep(s);};
  const findAccount=n=>Object.keys(profiles||{}).find(k=>k.toLowerCase()===n.trim().toLowerCase())||null;

  // Sign in: pick yourself from name suggestions or from a group's member list
  const chooseAccount=async acct=>{
    setMatched(acct);setBusy(true);
    const stored=await fsGet(`wolfpack/pin_${acct}`);
    setBusy(false);
    go(stored?.pin?"pin":"newpin");
  };
  const q=name.trim().toLowerCase();
  const suggestions=q?Object.keys(profiles||{})
    .filter(n=>n.toLowerCase().includes(q))
    .sort((a,b)=>(b.toLowerCase().startsWith(q)-a.toLowerCase().startsWith(q))||a.localeCompare(b))
    .slice(0,5):[];
  const submitSignInName=()=>{
    const acct=findAccount(name)||(suggestions.length===1?suggestions[0]:null);
    if(acct)return chooseAccount(acct);
    setError(suggestions.length?"Tap your name below.":"No names match. Try fewer letters, or use your group's invite code.");
  };
  const submitCode=()=>{
    const g=findGroupByCode(groups,code);
    if(!g)return setError("That code doesn't match any group.");
    setError("");setCodeGroup(g);
  };
  const personRow=n=>(
    <button key={n} onClick={()=>chooseAccount(n)} disabled={busy} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer",width:"100%",color:"var(--text)"}}>
      <AvatarDisplay profile={profiles[n]} size={36}/>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>{n}</div>
    </button>
  );
  const submitPin=async()=>{
    if(pin.length!==4)return setError("Enter your 4-digit PIN");
    setBusy(true);
    const stored=await fsGet(`wolfpack/pin_${matched}`);
    if(stored?.pin&&stored.pin!==pin){setBusy(false);setPin("");return setError("Wrong PIN. Try again.");}
    onSignIn(matched);
  };
  const submitNewPin=async()=>{
    if(pin.length!==4)return setError("PIN must be exactly 4 digits");
    if(pin!==pin2)return setError("PINs don't match");
    setBusy(true);
    await onSetPin(matched,pin);
    onSignIn(matched);
  };

  // Create account
  const submitNewName=()=>{
    const n=name.trim();
    if(!n)return setError("Enter your name");
    if(findAccount(n))return setError("That name is taken. If it's you, sign in instead.");
    go("look");
  };
  const handlePhoto=async e=>{const f=e.target.files?.[0];if(!f)return;const raw=await readFileAsDataURL(f);setAvatarImg(await compressImage(raw,160));};
  const submitCreate=async()=>{
    if(pin.length!==4)return setError("PIN must be exactly 4 digits");
    if(pin!==pin2)return setError("PINs don't match");
    setBusy(true);
    try{await onCreateAccount(name.trim(),avatarImg?null:avatar,pin,avatarImg||null);}
    catch{setError("Connection error. Try again.");setBusy(false);}
  };

  if(step==="splash")return(
    <Shell big>
      <div style={{color:"var(--muted)",fontSize:14,marginTop:-8}}>fitness accountability</div>
      <div style={{...wrap,marginTop:32}}>
        <button className="btn-primary" onClick={()=>go("signin")} style={{fontSize:20,padding:"16px"}}>ENTER</button>
        <button className="btn-ghost" onClick={()=>{setName("");go("newname");}} style={{width:"100%"}}>New here? Create an account</button>
      </div>
    </Shell>
  );

  return(
    <Shell>
      {step==="signin"&&<div style={wrap}>
        <div style={lbl}>WHO ARE YOU?</div>
        <input className="input" placeholder="Start typing your name" value={name} onChange={e=>{setName(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submitSignInName()} autoFocus autoCapitalize="words" autoComplete="off"/>
        {suggestions.map(personRow)}
        <Err msg={error}/>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>{setCode("");setCodeGroup(null);go("bycode");}}>Find me with my group's invite code</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("splash")}>← Back</button>
      </div>}

      {step==="bycode"&&<div style={wrap}>
        {!codeGroup?<>
          <div style={lbl}>ENTER YOUR GROUP'S CODE</div>
          <input className="input" placeholder="Invite code" value={code} onChange={e=>{setCode(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submitCode()} autoFocus autoCapitalize="characters" style={{textTransform:"uppercase",letterSpacing:4,textAlign:"center",fontSize:20}}/>
          <Err msg={error}/>
          <button className="btn-primary" onClick={submitCode}>SHOW MEMBERS</button>
        </>:<>
          <div style={lbl}>{codeGroup.emoji} {codeGroup.name.toUpperCase()}: TAP YOUR NAME</div>
          {[...(codeGroup.members||[])].sort((a,b)=>a.localeCompare(b)).map(personRow)}
        </>}
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("signin")}>← Back</button>
      </div>}

      {step==="pin"&&<div style={wrap}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--bg3)",borderRadius:12}}>
          <AvatarDisplay profile={profiles[matched]} size={40}/>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2}}>{matched}</div>
        </div>
        <input className="input" type="password" inputMode="numeric" placeholder="Enter PIN" value={pin} onChange={e=>setPin(digits(e.target.value))} onKeyDown={e=>e.key==="Enter"&&submitPin()} autoFocus maxLength={4} style={pinStyle} autoComplete="current-password"/>
        <Err msg={error}/>
        <button className="btn-primary" onClick={submitPin} disabled={busy}>{busy?"...":<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><WolfIcon size={18}/>LET ME IN</span>}</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>{setName("");go("signin");}}>← Not you?</button>
      </div>}

      {step==="newpin"&&<div style={wrap}>
        <div style={lbl}>CREATE A NEW PIN</div>
        <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.5}}>{matched}, your account doesn't have a PIN right now. Set one so nobody else can sign in as you.</div>
        <input className="input" type="password" inputMode="numeric" placeholder="New 4-digit PIN" value={pin} onChange={e=>setPin(digits(e.target.value))} maxLength={4} autoFocus style={pinStyle} autoComplete="new-password"/>
        <input className="input" type="password" inputMode="numeric" placeholder="Confirm PIN" value={pin2} onChange={e=>setPin2(digits(e.target.value))} maxLength={4} onKeyDown={e=>e.key==="Enter"&&submitNewPin()} style={pinStyle} autoComplete="new-password"/>
        <Err msg={error}/>
        <button className="btn-primary" onClick={submitNewPin} disabled={busy}>{busy?"...":"SAVE PIN AND SIGN IN"}</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("signin")}>← Back</button>
      </div>}

      {step==="newname"&&<div style={wrap}>
        <div style={lbl}>CREATE YOUR ACCOUNT</div>
        <div style={{fontSize:13,color:"var(--muted)"}}>Your name is how your pack sees you.</div>
        <input className="input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitNewName()} maxLength={20} autoFocus autoCapitalize="words"/>
        <Err msg={error}/>
        <button className="btn-primary" onClick={submitNewName}>CONTINUE</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("splash")}>← Back</button>
      </div>}

      {step==="look"&&<div style={wrap}>
        <div style={lbl}>PICK YOUR LOOK</div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:16,background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
          {avatarImg
            ?<img src={avatarImg} alt="Your photo" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--accent)"}}/>
            :<div style={{width:80,height:80,borderRadius:"50%",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,border:"2px dashed var(--border)"}}>📷</div>}
          <button className="btn-ghost" onClick={()=>fileRef.current.click()} style={{fontSize:13}}>{avatarImg?"Change photo":"Upload photo"}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
          {avatarImg&&<button className="btn-ghost" onClick={()=>setAvatarImg(null)} style={{fontSize:12,color:"var(--muted)"}}>Remove photo</button>}
        </div>
        <div style={{textAlign:"center",fontSize:12,color:"var(--muted)"}}>or pick an emoji</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {WOLF_AVATARS.map(a=>(
            <button key={a} onClick={()=>{setAvatar(a);setAvatarImg(null);}} style={{padding:10,fontSize:26,borderRadius:12,cursor:"pointer",background:!avatarImg&&avatar===a?"rgba(124,92,191,0.25)":"var(--bg3)",border:!avatarImg&&avatar===a?"2px solid var(--accent)":"2px solid var(--border)"}}>{a}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>go("newacctpin")}>CONTINUE</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("newname")}>← Back</button>
      </div>}

      {step==="newacctpin"&&<div style={wrap}>
        <div style={lbl}>SET YOUR 4-DIGIT PIN</div>
        <input className="input" type="password" inputMode="numeric" placeholder="4-digit PIN" value={pin} onChange={e=>setPin(digits(e.target.value))} maxLength={4} autoFocus style={pinStyle} autoComplete="new-password"/>
        <input className="input" type="password" inputMode="numeric" placeholder="Confirm PIN" value={pin2} onChange={e=>setPin2(digits(e.target.value))} maxLength={4} onKeyDown={e=>e.key==="Enter"&&submitCreate()} style={pinStyle} autoComplete="new-password"/>
        <Err msg={error}/>
        <button className="btn-primary" onClick={submitCreate} disabled={busy}>{busy?"CREATING...":"CREATE ACCOUNT"}</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("look")}>← Back</button>
      </div>}
    </Shell>
  );
}
