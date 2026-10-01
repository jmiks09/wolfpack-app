import { useState } from "react";
import { AI_MUSCLE_GROUPS } from "../../lib/aiConfig";

// ── MY WEEK STRIP ────────────────────────────────────────────────────────────
// Shows Mon-Sun of current week. Each day is a dot — tap to see exercises.
export function MyWeekStrip({currentUser, history}){
  const [selectedDay,setSelectedDay]=useState(null);

  // Build Mon-Sun of current Central-time week
  const days=[];
  const now=new Date();
  const central=new Date(now.getTime()+(-5*60*60*1000));
  const todayCentral=central.toISOString().slice(0,10);
  // Get Monday of current week
  const dow=central.getDay(); // 0=Sun, 1=Mon...
  const monday=new Date(central);
  monday.setDate(central.getDate()-(dow===0?6:dow-1));

  for(let i=0;i<7;i++){
    const d=new Date(monday);
    d.setDate(monday.getDate()+i);
    const dateStr=d.toISOString().slice(0,10);
    const entry=history[dateStr]?.[currentUser];
    const isToday=dateStr===todayCentral;
    const isFuture=dateStr>todayCentral;
    days.push({
      dateStr,
      label:["M","T","W","T","F","S","S"][i],
      fullLabel:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
      entry,
      isToday,
      isFuture,
      done:!!entry?.done,
    });
  }

  const selected=days.find(d=>d.dateStr===selectedDay);

  // Parse exercises from wolfmodeSession or fall back to workoutLabel
  const getExercises=(entry)=>{
    if(!entry)return null;
    if(entry.wolfmodeSession?.exercises?.length){
      return entry.wolfmodeSession.exercises;
    }
    return null;
  };

  return(
    <div style={{margin:"16px 16px 0"}}>
      {/* Header */}
      <div style={{
        fontFamily:"'Bebas Neue',cursive",fontSize:11,
        letterSpacing:2,color:"var(--muted)",marginBottom:10,
      }}>THIS WEEK</div>

      {/* Day dots */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:selectedDay?12:0}}>
        {days.map((day,i)=>(
          <button key={i} onClick={()=>setSelectedDay(day.dateStr===selectedDay?null:day.dateStr)}
            disabled={day.isFuture}
            style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:5,
              background:"none",border:"none",cursor:day.isFuture?"default":"pointer",
              padding:"4px 2px",
            }}>
            {/* Day label */}
            <div style={{
              fontSize:10,
              color:day.isToday?"var(--accent2)":day.isFuture?"rgba(255,255,255,0.15)":"var(--muted)",
              fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
            }}>{day.label}</div>
            {/* Dot */}
            <div style={{
              width:28,height:28,borderRadius:"50%",
              display:"flex",alignItems:"center",justifyContent:"center",
              background:day.done
                ?"linear-gradient(135deg,#ff6b35,#9b59b6)"
                :day.isToday
                  ?"rgba(124,92,191,0.15)"
                  :"rgba(255,255,255,0.04)",
              border:day.isToday&&!day.done
                ?"1px solid rgba(124,92,191,0.4)"
                :day.done
                  ?"none"
                  :"1px solid rgba(255,255,255,0.06)",
              fontSize:12,
              boxShadow:day.done?"0 0 8px rgba(255,107,53,0.3)":"none",
              transition:"all 0.15s",
              transform:day.dateStr===selectedDay?"scale(1.15)":"scale(1)",
            }}>
              {day.done
                ? day.entry?.workoutIcon||"💪"
                : day.isToday
                  ? <span style={{fontSize:8,color:"rgba(124,92,191,0.6)"}}>TODAY</span>
                  : ""}
            </div>
          </button>
        ))}
      </div>

      {/* Expanded day detail */}
      {selected&&selected.entry&&(
        <div style={{
          padding:"12px 14px",
          background:"rgba(0,0,0,0.2)",
          border:"1px solid var(--border)",
          borderRadius:14,
          marginTop:4,
        }}>
          {/* Day header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--accent2)"}}>
                {selected.fullLabel} {selected.dateStr.slice(5).replace("-","/")}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>
                {selected.entry.workoutLabel||"Workout logged"}
              </div>
            </div>
            <button onClick={()=>setSelectedDay(null)} style={{
              background:"none",border:"none",cursor:"pointer",
              color:"var(--muted)",fontSize:20,padding:"0 4px",
            }}>×</button>
          </div>

          {/* WOLFMODE exercises if available */}
          {getExercises(selected.entry)?(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {getExercises(selected.entry)
                .filter(ex=>!ex.skipped||ex.substitutedWith) // hide pure skips, keep substitutes
                .map((ex,i)=>{
                  const isSubstitute=ex.skipped&&ex.substitutedWith;
                  const displayName=isSubstitute?ex.substitutedWith:ex.name;
                  return(
                    <div key={i} style={{
                      display:"flex",alignItems:"center",gap:8,
                      padding:"6px 10px",
                      background:"rgba(46,204,113,0.06)",
                      border:"1px solid rgba(46,204,113,0.15)",
                      borderRadius:10,
                    }}>
                      <span style={{fontSize:12,flexShrink:0}}>✓</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#fff",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                          {displayName}
                          {isSubstitute&&<span style={{fontSize:9,color:"rgba(255,107,53,0.6)",marginLeft:6,fontFamily:"sans-serif",letterSpacing:0}}>(subbed)</span>}
                        </div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>
                          {[
                            ex.sets&&ex.reps?`${ex.sets}×${ex.reps}`:null,
                            ex.weightUsed?`@ ${ex.weightUsed}`:ex.suggestedWeight&&ex.suggestedWeight!=="bodyweight"?`@ ${ex.suggestedWeight} (suggested)`:null,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {ex.primaryMuscle&&(
                        <span style={{padding:"2px 8px",borderRadius:10,fontSize:9,flexShrink:0,background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.2)",color:"#ff6b35",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{ex.primaryMuscle}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          ):(
            // Non-WOLFMODE workout — just show the label
            <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>
              {Array.isArray(selected.entry.summary)
                ?selected.entry.summary.map((s,i)=><div key={i}>{s}</div>)
                :selected.entry.workoutLabel}
            </div>
          )}

          {/* Effort rating if saved */}
          {selected.entry.wolfmodeSession&&(
            <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",fontSize:11,color:"var(--muted)"}}>
              {selected.entry.wolfmodeSession.muscleGroup&&(
                <span style={{marginRight:10}}>
                  💪 {AI_MUSCLE_GROUPS?.find(m=>m.id===selected.entry.wolfmodeSession.muscleGroup)?.label||selected.entry.wolfmodeSession.muscleGroup}
                </span>
              )}
              {selected.entry.duration&&(
                <span>⏱ {selected.entry.duration} min</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Week summary line */}
      <div style={{
        marginTop:10,fontSize:10,color:"var(--muted)",textAlign:"center",
      }}>
        {days.filter(d=>d.done).length}/7 days this week
        {days.filter(d=>d.done).length>=5&&" 🔥"}
        {days.filter(d=>d.done).length===7&&" PERFECT WEEK 🐺"}
      </div>
    </div>
  );
}
