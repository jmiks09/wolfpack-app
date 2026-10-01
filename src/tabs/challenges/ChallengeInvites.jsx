import { fmtDate } from "../../lib/dates";

export function ChallengeInvites({currentUser,challenges,profiles,onAccept,onDecline,onOpenProfile}){
  const pending=challenges.filter(c=>c.status==="active"&&c.participants?.[currentUser]?.status==="pending");
  if(pending.length===0)return null;
  return(
    <div style={{margin:"0 0 4px"}}>
      {pending.map(c=>(
        <div key={c.id} style={{margin:"0 16px 10px",padding:"14px",background:"rgba(124,92,191,0.08)",border:"1px solid rgba(124,92,191,0.35)",borderRadius:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:20}}>⚔️</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2}}>{c.title}</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Invited by {c.createdBy}</div>
            </div>
          </div>
          {/* Challenge details */}
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:8,lineHeight:1.6}}>
            {c.goalType==="dateRange"?`📅 ${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`:`🎯 Goal: ${c.goal} ${c.unit}`}
            {c.maxRestDays!=null&&<span> · max {c.maxRestDays} rest days/week</span>}
            {c.penaltyAmt>0&&<span style={{color:"var(--orange)"}}> · ${c.penaltyAmt}/miss</span>}
            {c.forfeitCap>0&&<span style={{color:"var(--red)"}}> · forfeit cap ${c.forfeitCap}</span>}
          </div>
          {/* Rest day reminder */}
          <div style={{padding:"8px 10px",background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:8,marginBottom:10,fontSize:12,color:"var(--orange)",lineHeight:1.5}}>
            ⚠️ Before accepting, make sure your rest days are up to date — they'll be locked once you join.{" "}
            <span onClick={onOpenProfile} style={{textDecoration:"underline",cursor:"pointer",fontWeight:600}}>Update rest days →</span>
          </div>
          {/* Accept / Decline */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onAccept(c.id,currentUser)} style={{flex:1,padding:"10px",background:"linear-gradient(135deg,var(--accent),var(--orange))",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>
              ✓ ACCEPT
            </button>
            <button onClick={()=>onDecline(c.id,currentUser)} style={{flex:1,padding:"10px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>
              ✕ DECLINE
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
