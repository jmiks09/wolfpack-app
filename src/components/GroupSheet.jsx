import { useState } from "react";
import { GroupRow } from "../screens/GroupGate";

export function GroupSheet({currentUser,group,myGroups,onSwitch,onJoinOrCreate,onSignOut,onClose}){
  const [copied,setCopied]=useState(false);
  const share=async()=>{
    const text=`Join ${group.name} on WOLFPACK. Invite code: ${group.code}`;
    try{
      if(navigator.share){await navigator.share({text});return;}
      await navigator.clipboard.writeText(group.code);
      setCopied(true);setTimeout(()=>setCopied(false),2000);
    }catch{/* share sheet dismissed */}
  };
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,marginBottom:12}}>YOUR GROUPS</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {myGroups.map(g=><GroupRow key={g.id} group={g} active={g.id===group.id} onClick={()=>g.id===group.id?onClose():onSwitch(g.id)}/>)}
        </div>
        <button className="btn-ghost" style={{width:"100%",marginTop:10}} onClick={onJoinOrCreate}>Join or create a group</button>

        <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid var(--border)"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)",marginBottom:6}}>INVITE TO {group.name.toUpperCase()}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,padding:"12px",background:"var(--bg3)",border:"1px dashed var(--border)",borderRadius:12,textAlign:"center",fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:6}}>{group.code}</div>
            <button className="btn-primary" onClick={share} style={{width:"auto",padding:"12px 16px"}}>{copied?"COPIED":"SHARE"}</button>
          </div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>Friends enter this code after signing in to join.</div>
        </div>

        <button onClick={onSignOut} style={{width:"100%",marginTop:20,background:"none",border:"none",color:"var(--muted)",fontSize:13,cursor:"pointer",padding:8}}>Sign out of {currentUser}</button>
      </div>
    </div>
  );
}
