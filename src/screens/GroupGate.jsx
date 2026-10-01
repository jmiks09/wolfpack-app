import { useState } from "react";
import { WolfIcon } from "../components/WolfIcon";
import { GROUP_EMOJIS } from "../lib/groups";

const lbl = {fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:3,color:"var(--muted)"};
const wrap = {width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:12};
const Err = ({msg}) => msg ? <div style={{color:"var(--red)",fontSize:13}}>{msg}</div> : null;

export function GroupRow({group,active,onClick}){
  return(
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:active?"rgba(124,92,191,0.18)":"var(--bg3)",border:active?"1px solid var(--accent)":"1px solid var(--border)",borderRadius:12,cursor:"pointer",width:"100%",textAlign:"left",color:"var(--text)"}}>
      <div style={{width:40,height:40,borderRadius:12,background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{group.emoji||"🐺"}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{group.name}</div>
        <div style={{fontSize:11,color:"var(--muted)"}}>{(group.members||[]).length} {(group.members||[]).length===1?"member":"members"}</div>
      </div>
      {active&&<div style={{fontSize:12,color:"var(--accent2)"}}>✓</div>}
    </button>
  );
}

// ── GROUP GATE ────────────────────────────────────────────────────────────────
// Full screen after sign-in, or an overlay from the group switcher (onCancel set).
export function GroupGate({user,myGroups,startMode,onPick,onJoin,onCreate,onSignOut,onCancel}){
  const [mode,setMode]=useState(startMode||(myGroups.length?"list":"start"));
  const [code,setCode]=useState("");
  const [name,setName]=useState("");
  const [emoji,setEmoji]=useState("🐺");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [created,setCreated]=useState(null);
  const go=m=>{setError("");setMode(m);};
  const back=()=>startMode?go(startMode):go(myGroups.length?"list":"start");

  const submitJoin=async()=>{
    if(!code.trim())return setError("Enter the invite code");
    setBusy(true);
    const err=await onJoin(code);
    if(err){setError(err);setBusy(false);}
  };
  const submitCreate=async()=>{
    const n=name.trim();
    if(!n)return setError("Give your group a name");
    if(n.length>24)return setError("Keep it under 24 characters");
    setBusy(true);
    const g=await onCreate(n,emoji);
    setBusy(false);setCreated(g);go("created");
  };

  const body=(
    <div style={wrap}>
      {mode==="list"&&<>
        <div style={lbl}>YOUR GROUPS</div>
        {myGroups.map(g=><GroupRow key={g.id} group={g} onClick={()=>onPick(g.id)}/>)}
        <button className="btn-ghost" style={{width:"100%",marginTop:4}} onClick={()=>go("join")}>Join a group with a code</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("create")}>Create a new group</button>
      </>}

      {mode==="choose"&&<>
        <div style={lbl}>JOIN OR CREATE</div>
        <button className="btn-primary" onClick={()=>go("join")}>JOIN WITH A CODE</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("create")}>Create a new group</button>
      </>}

      {mode==="start"&&<>
        <div style={lbl}>WELCOME, {user?.toUpperCase()}</div>
        <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.5}}>You're not in a group yet. Join one with an invite code from a friend, or start your own.</div>
        <button className="btn-primary" onClick={()=>go("join")}>JOIN A GROUP</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={()=>go("create")}>Create a new group</button>
      </>}

      {mode==="join"&&<>
        <div style={lbl}>JOIN A GROUP</div>
        <div style={{fontSize:13,color:"var(--muted)"}}>Ask someone in the group for its invite code.</div>
        <input className="input" placeholder="Invite code" value={code} onChange={e=>{setCode(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submitJoin()} autoFocus autoCapitalize="characters" style={{textTransform:"uppercase",letterSpacing:4,textAlign:"center",fontSize:20}}/>
        <Err msg={error}/>
        <button className="btn-primary" onClick={submitJoin} disabled={busy}>{busy?"JOINING...":"JOIN"}</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={back}>← Back</button>
      </>}

      {mode==="create"&&<>
        <div style={lbl}>CREATE A GROUP</div>
        <input className="input" placeholder="Group name, like Winter Arc Crew" value={name} onChange={e=>{setName(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submitCreate()} maxLength={24} autoFocus/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
          {GROUP_EMOJIS.map(e=>(
            <button key={e} onClick={()=>setEmoji(e)} aria-label={`Group icon ${e}`} style={{padding:8,fontSize:22,borderRadius:10,cursor:"pointer",background:emoji===e?"rgba(124,92,191,0.25)":"var(--bg3)",border:emoji===e?"2px solid var(--accent)":"2px solid var(--border)"}}>{e}</button>
          ))}
        </div>
        <Err msg={error}/>
        <button className="btn-primary" onClick={submitCreate} disabled={busy}>{busy?"CREATING...":"CREATE GROUP"}</button>
        <button className="btn-ghost" style={{width:"100%"}} onClick={back}>← Back</button>
      </>}

      {mode==="created"&&created&&<>
        <div style={lbl}>{created.emoji} {created.name.toUpperCase()} IS READY</div>
        <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.5}}>Share this invite code with your friends. They'll enter it after signing in.</div>
        <div style={{padding:"18px",background:"var(--bg3)",border:"1px dashed var(--accent)",borderRadius:14,textAlign:"center",fontFamily:"'Bebas Neue',cursive",fontSize:36,letterSpacing:8,color:"var(--accent2)"}}>{created.code}</div>
        <button className="btn-primary" onClick={()=>onPick(created.id)}>GO TO {created.name.toUpperCase()}</button>
      </>}

      {!onCancel&&mode!=="created"&&<button onClick={onSignOut} style={{marginTop:8,background:"none",border:"none",color:"var(--muted)",fontSize:12,cursor:"pointer"}}>Not {user}? Sign out</button>}
    </div>
  );

  if(onCancel)return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div className="modal-handle"/>
        {body}
        {mode!=="created"&&<button className="btn-ghost" style={{width:"100%",maxWidth:380,marginTop:8}} onClick={onCancel}>Close</button>}
      </div>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100dvh",padding:"36px 24px 100px",gap:16,overflowY:"auto",background:"var(--bg)"}}>
      <WolfIcon size={64}/>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:5,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div>
      {body}
    </div>
  );
}
