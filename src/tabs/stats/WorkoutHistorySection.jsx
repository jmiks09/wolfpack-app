import { useState } from "react";
import { fmtDate } from "../../lib/dates";

export function WorkoutHistorySection({currentUser, history, onEditExercises}){
  const now=new Date();
  const [viewYear,setViewYear]=useState(now.getFullYear());
  const [viewMonth,setViewMonth]=useState(now.getMonth()); // 0-indexed
  const [expandedDate,setExpandedDate]=useState(null);

  const monthName=new Date(viewYear,viewMonth,1).toLocaleString("en-US",{month:"long",year:"numeric"});

  const goBack=()=>{
    if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}
    else setViewMonth(m=>m-1);
    setExpandedDate(null);
  };
  const goForward=()=>{
    const isCurrentMonth=viewYear===now.getFullYear()&&viewMonth===now.getMonth();
    if(isCurrentMonth)return;
    if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}
    else setViewMonth(m=>m+1);
    setExpandedDate(null);
  };

  const isCurrentMonth=viewYear===now.getFullYear()&&viewMonth===now.getMonth();

  // Get all logged days in this month
  const entries=Object.entries(history)
    .filter(([date,d])=>{
      if(!d?.[currentUser]?.done)return false;
      const [y,m]=date.split("-").map(Number);
      return y===viewYear&&m-1===viewMonth;
    })
    .sort((a,b)=>b[0].localeCompare(a[0]));

  return(
    <div style={{padding:"0 16px 16px"}}>
      {/* Month navigator */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"8px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12}}>
        <button onClick={goBack} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,padding:"0 8px",lineHeight:1}}>‹</button>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,color:"var(--accent2)"}}>{monthName}</div>
        <button onClick={goForward} disabled={isCurrentMonth} style={{background:"none",border:"none",cursor:"pointer",color:isCurrentMonth?"rgba(255,255,255,0.1)":"var(--muted)",fontSize:20,padding:"0 8px",lineHeight:1}}>›</button>
      </div>

      {entries.length===0?(
        <div style={{textAlign:"center",padding:"30px 20px",color:"var(--muted)",fontSize:13}}>
          No workouts logged in {monthName}.
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {entries.map(([date,dayData])=>{
            const entry=dayData[currentUser];
            const summary=Array.isArray(entry.summary)?entry.summary:[entry.workoutLabel||"Workout"];
            const exercises=entry.wolfmodeSession?.exercises||entry.details?.lift?.exercises||[];
            const doneExercises=exercises.filter(e=>!e.skipped||e.substitutedWith);
            const isExpanded=expandedDate===date;

            return(
              <div key={date} style={{background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)",overflow:"hidden"}}>
                {/* Header row */}
                <div
                  onClick={()=>setExpandedDate(isExpanded?null:date)}
                  style={{padding:"12px 14px",cursor:doneExercises.length>0?"pointer":"default",display:"flex",alignItems:"flex-start",gap:10}}
                >
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1,color:"var(--accent2)"}}>{fmtDate(date)}</div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>{entry.time||""}</div>
                    </div>
                    {summary.map((line,i)=><div key={i} style={{fontSize:12,color:"var(--green)",lineHeight:1.6}}>{line}</div>)}
                    {entry.note&&<div style={{fontSize:11,color:"var(--muted)",marginTop:4,fontStyle:"italic"}}>"{entry.note}"</div>}
                  </div>
                  {doneExercises.length>0&&(
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0,paddingTop:2}}>
                      <span style={{fontSize:10,color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{doneExercises.length} ex</span>
                      <span style={{fontSize:14,color:"var(--muted)",transition:"transform .2s",transform:isExpanded?"rotate(180deg)":"rotate(0)"}}>▾</span>
                    </div>
                  )}
                </div>

                {/* Expanded exercise list */}
                {isExpanded&&doneExercises.length>0&&(
                  <div style={{padding:"0 14px 12px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{paddingTop:10,display:"flex",flexDirection:"column",gap:5}}>
                      {doneExercises.map((ex,idx)=>{
                        const isSubstitute=ex.skipped&&ex.substitutedWith;
                        const displayName=isSubstitute?ex.substitutedWith:ex.name;
                        return(
                          <div key={idx} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"rgba(46,204,113,0.05)",border:"1px solid rgba(46,204,113,0.1)",borderRadius:8}}>
                            <span style={{fontSize:10,color:"rgba(46,204,113,0.6)",flexShrink:0}}>✓</span>
                            <div style={{flex:1,minWidth:0}}>
                              <span style={{fontSize:12,color:"rgba(255,255,255,0.85)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                                {displayName}
                                {isSubstitute&&<span style={{fontSize:9,color:"rgba(255,107,53,0.5)",marginLeft:6,fontFamily:"sans-serif",letterSpacing:0}}>(subbed)</span>}
                              </span>
                              {(ex.sets||ex.reps||ex.weightUsed||ex.weight)&&(
                                <span style={{fontSize:10,color:"var(--muted)",marginLeft:6}}>
                                  {[
                                    ex.sets&&(ex.actualReps||ex.reps)?`${ex.sets}×${ex.actualReps||ex.reps}`:null,
                                    ex.weightUsed?`@ ${ex.weightUsed}`:ex.weight&&ex.weight!=="bodyweight"?`@ ${ex.weight}`:null,
                                  ].filter(Boolean).join(" ")}
                                </span>
                              )}
                            </div>
                            {ex.primaryMuscle&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:8,background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.2)",color:"#ff6b35",flexShrink:0,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{ex.primaryMuscle}</span>}
                          </div>
                        );
                      })}
                    </div>
                    {onEditExercises&&(
                      <button onClick={()=>onEditExercises(date,entry)} style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,cursor:"pointer",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"var(--muted)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                        ✏️ EDIT EXERCISES & WEIGHTS
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
