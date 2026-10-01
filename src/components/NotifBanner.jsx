import { useEffect, useState } from "react";
import { requestNotifPermission } from "../firebase";

export function NotifBanner({currentUser}){
  const [vis,setVis]=useState(false);
  const [asking,setAsking]=useState(false);
  useEffect(()=>{
    if("Notification" in window && Notification.permission==="default") setVis(true);
  },[]);
  const enable=async()=>{
    setAsking(true);
    await requestNotifPermission(currentUser); // saves token to Firestore automatically
    setVis(false);
    setAsking(false);
  };
  if(!vis)return null;
  return(
    <div style={{margin:"8px 16px 0",padding:"12px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.3)",borderRadius:14,display:"flex",alignItems:"center",gap:10}}>
      <div style={{fontSize:22}}>🔔</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>ENABLE NOTIFICATIONS</div>
        <div style={{fontSize:11,color:"var(--muted)"}}>Get streak reminders before midnight 🔥</div>
      </div>
      <button onClick={enable} disabled={asking} style={{padding:"6px 12px",background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1}}>{asking?"...":"ALLOW"}</button>
      <button onClick={()=>setVis(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>
    </div>
  );
}
