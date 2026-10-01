import { useState } from "react";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { WolfIcon } from "../components/WolfIcon";
import { fsGet } from "../firebase";

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export function Login({members,profiles,onLogin,adminName}){
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
      <div style={{fontSize:56,display:"flex",justifyContent:"center"}}><WolfIcon size={72}/></div>
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
          <button className="btn-primary" onClick={go} disabled={loading}>{loading?"...":<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><WolfIcon size={18}/>LET ME IN</span>}</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={()=>{setSel(null);setPin("");setErr("");}}>← Back</button>
        </div>
      )}
    </div>
  );
}
