import { useState } from "react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import { getTotalWorkouts } from "../../lib/stats";

// ── MEMBER CARD ──────────────────────────────────────────────────────────────
export function MemberCard({m,i,done,isMe,ms,restToday,td,profiles,sessionExercises,sessionMuscles,onOpenProfile,history}){
  const [expanded,setExpanded]=useState(false);
  const hasExercises=sessionExercises?.length>0;

  return(
    <div style={{
      position:"relative",borderRadius:18,overflow:"hidden",
      background:done
        ?"linear-gradient(135deg,rgba(46,204,113,0.12),rgba(46,204,113,0.04))"
        :restToday?"rgba(255,255,255,0.03)"
        :isMe?"rgba(124,92,191,0.1)":"var(--card)",
      border:done?"1px solid rgba(46,204,113,0.3)":isMe?"1px solid rgba(124,92,191,0.35)":"1px solid var(--border)",
    }}>
      {/* Main row */}
      <div
        onClick={()=>{if(isMe&&!hasExercises)onOpenProfile();else if(hasExercises)setExpanded(e=>!e);else if(isMe)onOpenProfile();}}
        style={{
          padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
          cursor:hasExercises||isMe?"pointer":"default",
          minHeight:72,
        }}>
        {/* Left accent bar */}
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:26,background:done?"rgba(46,204,113,0.12)":restToday?"rgba(124,92,191,0.1)":"rgba(255,255,255,0.02)",borderRadius:"18px 0 0 18px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:done?"linear-gradient(180deg,#2ecc71,#27ae60)":isMe?"linear-gradient(180deg,var(--accent),var(--orange))":restToday?"linear-gradient(180deg,var(--accent),#5a3fa0)":"transparent",borderRadius:"18px 0 0 18px"}}/>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:9,letterSpacing:2,color:done?"var(--green)":restToday?"var(--accent2)":"var(--muted)",writingMode:"vertical-rl",textOrientation:"mixed",transform:"rotate(180deg)",marginLeft:3}}>
            {done?"DONE":restToday?"REST":"PENDING"}
          </span>
        </div>
        {/* Rank */}
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"var(--muted)",width:20,textAlign:"center",flexShrink:0}}>{i+1}</div>
        {/* Avatar */}
        <AvatarDisplay profile={profiles[m]} size={44}/>
        {/* Info */}
        <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:1,color:isMe?"var(--accent2)":"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{m}</span>
            {isMe&&<span style={{fontSize:10,color:"var(--accent2)",background:"rgba(124,92,191,0.2)",padding:"1px 5px",borderRadius:4,flexShrink:0}}>YOU</span>}
          </div>
          <div style={{fontSize:11,color:"var(--muted)"}}>🔥 {ms} days · {getTotalWorkouts(history,m)} sessions</div>
          {done&&(
            <div style={{marginTop:3}}>
              {Array.isArray(td[m]?.summary)
                ?td[m].summary.map((line,idx)=><div key={idx} style={{fontSize:11,color:"var(--green)",lineHeight:1.5,wordBreak:"break-word"}}>{line}</div>)
                :<div style={{fontSize:11,color:"var(--green)",wordBreak:"break-word"}}>{td[m]?.workoutLabel||""}</div>
              }
              {sessionMuscles?.length>0&&(
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>
                  {sessionMuscles.join(" · ")}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Expand arrow — only if exercises exist */}
        {hasExercises&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
            <span style={{fontSize:10,color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
              {sessionExercises.filter(ex=>!ex.skipped||ex.substitutedWith).length} ex
            </span>
            <span style={{fontSize:14,color:"var(--muted)",transition:"transform .2s",transform:expanded?"rotate(180deg)":"rotate(0)"}}>▾</span>
          </div>
        )}
        {isMe&&!hasExercises&&<div style={{position:"absolute",top:10,right:12,fontSize:11,color:"var(--muted)"}}>👤</div>}
      </div>

      {/* Expanded exercise list */}
      {expanded&&hasExercises&&(
        <div style={{padding:"0 14px 14px 60px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{paddingTop:10,display:"flex",flexDirection:"column",gap:5}}>
            {sessionExercises
              .filter(ex=>!ex.skipped||ex.substitutedWith)
              .map((ex,idx)=>{
                const isSubstitute=ex.skipped&&ex.substitutedWith;
                const displayName=isSubstitute?ex.substitutedWith:ex.name;
                return(
                  <div key={idx} style={{
                    display:"flex",alignItems:"center",gap:8,
                    padding:"5px 10px",
                    background:"rgba(46,204,113,0.05)",
                    border:"1px solid rgba(46,204,113,0.1)",
                    borderRadius:8,
                  }}>
                    <span style={{fontSize:10,color:"rgba(46,204,113,0.6)",flexShrink:0}}>✓</span>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.85)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                        {displayName}
                        {isSubstitute&&<span style={{fontSize:9,color:"rgba(255,107,53,0.5)",marginLeft:6,fontFamily:"sans-serif",letterSpacing:0}}>(subbed)</span>}
                      </span>
                      {(ex.sets||ex.reps||ex.weightUsed||ex.weight)&&(
                        <span style={{fontSize:10,color:"var(--muted)",marginLeft:6}}>
                          {[
                            ex.sets&&ex.reps?`${ex.sets}×${ex.actualReps||ex.reps}`:null,
                            ex.weightUsed?`@ ${ex.weightUsed}`:ex.weight&&ex.weight!=="bodyweight"?`@ ${ex.weight}`:null,
                          ].filter(Boolean).join(" ")}
                        </span>
                      )}
                    </div>
                    {ex.isCoreLift&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:4,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"rgba(255,215,0,0.6)",flexShrink:0}}>CORE</span>}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
