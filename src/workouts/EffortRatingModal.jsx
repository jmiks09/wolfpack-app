import { useState } from "react";
import { EFFORT_RATINGS } from "../lib/aiConfig";
import { saveTrainingLog } from "../lib/trainingLog";

export function EffortRatingModal({exercises, muscleGroup, currentUser, onRate, onClose}){
  const [step,setStep]=useState("checklist");
  const [done,setDone]=useState(()=>Object.fromEntries((exercises||[]).map(e=>[e.name,true])));
  const [subs,setSubs]=useState({});
  const [effortId,setEffortId]=useState(null);
  // Fix 1: sets editable + Fix 2: substitutes get weight/reps fields
  const [sets,setSets]=useState(()=>{
    const init={};
    (exercises||[]).forEach(e=>{init[e.name]=String(e.sets||4);});
    return init;
  });
  const [weights,setWeights]=useState(()=>{
    const init={};
    (exercises||[]).forEach(e=>{
      init[e.name]=e.weight&&e.weight!=="bodyweight"?e.weight.replace(/[^0-9.]/g,""):"";
    });
    return init;
  });
  const [reps,setReps]=useState(()=>{
    const init={};
    (exercises||[]).forEach(e=>{
      init[e.name]=e.reps?e.reps.toString().split("-")[0].replace(/[^0-9]/g,""):"";
    });
    return init;
  });
  const [saving,setSaving]=useState(false);
  const [barPlates,setBarPlates]=useState({}); // plates added per exercise key

  const doneExercises=(exercises||[]).filter(e=>done[e.name]!==false);
  const skippedExercises=(exercises||[]).filter(e=>done[e.name]===false);

  // Fix 1: Build the list of exercises to show in Step 3
  // Includes done exercises + substituted exercises (using the sub name)
  const loggableExercises=[
    ...doneExercises,
    ...skippedExercises.filter(e=>subs[e.name]).map(e=>({
      ...e,
      displayName:subs[e.name],
      isSubstitute:true,
      originalName:e.name,
    })),
  ];

  const handleFinalSave=async()=>{
    setSaving(true);
    const logged=doneExercises.map(e=>({
      name:e.name,
      sets:Number(sets[e.name])||e.sets,
      reps:reps[e.name]?reps[e.name]:e.reps,
      actualReps:reps[e.name]||null,
      weightUsed:weights[e.name]?`${weights[e.name]} lbs`:null,
      skipped:false,
      isCoreLift:e.isCoreLift||false,
      primaryMuscle:e.primaryMuscle||"",
    }));
    // Add skipped with substitutes
    skippedExercises.forEach(e=>{
      const subName=subs[e.name]||null;
      const key=subName||e.name;
      logged.push({
        name:e.name,
        sets:Number(sets[e.name])||e.sets,
        reps:reps[key]||e.reps,
        weightUsed:weights[key]?`${weights[key]} lbs`:null,
        skipped:true,
        substitutedWith:subName,
        primaryMuscle:e.primaryMuscle||"",
      });
    });
    await saveTrainingLog(currentUser, logged, effortId||"normal");
    setSaving(false);
    onRate(effortId||"normal", logged);
  };

  // ── STEP 1: Checklist ──────────────────────────────────────────────────────
  if(step==="checklist"){
    return(
      <div className="modal-overlay" style={{zIndex:1200}}>
        <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto"}}>
          <div className="modal-handle"/>
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:26,marginBottom:4}}>📋</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WHAT DID YOU DO?</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Untick anything you skipped</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {(exercises||[]).map((ex,i)=>{
              const isDone=done[ex.name]!==false;
              return(
                <div key={i} style={{padding:"10px 12px",background:isDone?"rgba(46,204,113,0.06)":"rgba(231,76,60,0.06)",border:isDone?"1px solid rgba(46,204,113,0.2)":"1px solid rgba(231,76,60,0.2)",borderRadius:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <button onClick={()=>setDone(d=>({...d,[ex.name]:!isDone}))} style={{width:24,height:24,borderRadius:6,flexShrink:0,cursor:"pointer",background:isDone?"var(--green)":"var(--bg3)",border:isDone?"1px solid var(--green)":"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>{isDone?"✓":""}</button>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,color:isDone?"#fff":"rgba(255,255,255,0.4)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{ex.name}</div>
                      <div style={{fontSize:10,color:"var(--muted)"}}>{ex.sets} sets × {ex.reps}{ex.weight&&ex.weight!=="bodyweight"?` · ${ex.weight}`:""}</div>
                    </div>
                  </div>
                  {!isDone&&(
                    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                      <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>Did you do something instead?</div>
                      <input className="input" placeholder="e.g. Leg press, bodyweight squats..."
                        value={subs[ex.name]||""}
                        onChange={e=>setSubs(s=>({...s,[ex.name]:e.target.value}))}
                        style={{padding:"6px 10px",fontSize:12,width:"100%"}}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginBottom:10}}>
            {doneExercises.length} completed · {skippedExercises.length} skipped
          </div>
          <button className="btn-primary" onClick={()=>setStep("effort")} style={{width:"100%",background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>NEXT →</button>
          <button onClick={onClose} style={{width:"100%",marginTop:8,padding:8,background:"transparent",border:"none",color:"var(--muted)",fontSize:11,cursor:"pointer"}}>Skip — just log it</button>
        </div>
      </div>
    );
  }

  // ── STEP 2: Effort rating ──────────────────────────────────────────────────
  if(step==="effort"){
    return(
      <div className="modal-overlay" style={{zIndex:1200}}>
        <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
          <div className="modal-handle"/>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:28,marginBottom:6}}>🔥</div>
            {/* Fix 5: Clarify rating is based on what they actually lifted */}
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>HOW HARD WAS YOUR SESSION?</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Rate based on the weights YOU actually lifted — WOLFMODE adjusts next time</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {EFFORT_RATINGS.map(r=>{
              const sel=effortId===r.id;
              return(
                <button key={r.id} onClick={()=>setEffortId(r.id)} style={{padding:"14px 8px",borderRadius:14,cursor:"pointer",textAlign:"center",background:sel?`rgba(${r.color.replace("#","").match(/.{2}/g).map(h=>parseInt(h,16)).join(",")},0.2)`:"var(--bg3)",border:sel?`1px solid ${r.color}`:"1px solid var(--border)",transition:"all 0.15s"}}>
                  <div style={{fontSize:28,marginBottom:4}}>{r.emoji}</div>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:sel?r.color:"#fff"}}>{r.label}</div>
                  {sel&&<div style={{fontSize:9,color:"var(--muted)",marginTop:2}}>{r.advice}</div>}
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-ghost" onClick={e=>{e.stopPropagation();setStep("checklist");}} style={{flex:"0 0 auto",padding:"0 14px",fontSize:11}}>← Back</button>
            <button className="btn-primary" onClick={()=>setStep("weights")} disabled={!effortId} style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>NEXT →</button>
          </div>
          <button onClick={()=>{if(effortId)handleFinalSave();else onClose();}} style={{width:"100%",marginTop:8,padding:8,background:"transparent",border:"none",color:"var(--muted)",fontSize:11,cursor:"pointer"}}>
            {effortId?"Save without logging weights":"Skip"}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 3: Weights + sets + reps ─────────────────────────────────────────
  return(
    <div className="modal-overlay" style={{zIndex:1200}}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,marginBottom:2}}>WHAT DID YOU LIFT?</div>
        {/* Fix 3: Clarify weight includes the bar */}
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:14,lineHeight:1.5}}>
          All weights are <span style={{color:"rgba(255,255,255,0.7)"}}>total loaded weight including the bar</span>. Update anything you changed — WOLFMODE learns from this.
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {/* Fix 1: Show substituted exercises too */}
          {loggableExercises.map((ex,i)=>{
            const key=ex.isSubstitute?(ex.displayName||ex.name):ex.name;
            const isBarbell=ex.name?.toLowerCase().includes("barbell")||ex.name?.toLowerCase().includes("squat")||ex.name?.toLowerCase().includes("deadlift")||ex.name?.toLowerCase().includes("row")||ex.name?.toLowerCase().includes("press");
            return(
              <div key={i} style={{padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:"#fff",marginBottom:1}}>
                  {ex.isSubstitute?ex.displayName:ex.name}
                  {ex.isSubstitute&&<span style={{fontSize:9,color:"rgba(255,107,53,0.6)",marginLeft:6,fontFamily:"sans-serif",letterSpacing:0}}>(subbed)</span>}
                </div>
                <div style={{fontSize:10,color:"var(--muted)",marginBottom:8}}>suggested: {ex.sets} sets × {ex.reps}</div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {/* Fix 2: Sets field */}
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <input type="number" value={sets[ex.name]||""}
                      onChange={e=>setSets(s=>({...s,[ex.name]:e.target.value}))}
                      placeholder="—"
                      style={{width:38,padding:"6px 4px",textAlign:"center",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,color:"#fff",fontSize:13}}/>
                    <span style={{fontSize:10,color:"var(--muted)"}}>sets</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <input type="number" value={reps[key]||""}
                      onChange={e=>setReps(r=>({...r,[key]:e.target.value}))}
                      placeholder="—"
                      style={{width:38,padding:"6px 4px",textAlign:"center",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,color:"#fff",fontSize:13}}/>
                    <span style={{fontSize:10,color:"var(--muted)"}}>reps</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <input type="number" value={weights[key]||""}
                      onChange={e=>setWeights(w=>({...w,[key]:e.target.value}))}
                      placeholder="—"
                      style={{width:48,padding:"6px 4px",textAlign:"center",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,color:"#fff",fontSize:13}}/>
                    <span style={{fontSize:10,color:"var(--muted)"}}>lbs</span>
                  </div>
                </div>
                {/* Fix 4: Smoother bar weight + plates UI */}
                {isBarbell&&(
                  <div style={{marginTop:8,padding:"8px 10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10}}>
                    <div style={{fontSize:10,color:"var(--muted)",marginBottom:6}}>Quick calculate total weight:</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <select onChange={e=>{
                        const barWeight=Number(e.target.value);
                        const plates=Number(barPlates[key]||0);
                        setWeights(w=>({...w,[key]:String(barWeight+plates)}));
                      }} defaultValue="" style={{padding:"4px 8px",borderRadius:8,background:"var(--bg2)",border:"1px solid var(--border)",color:"#fff",fontSize:11,cursor:"pointer"}}>
                        <option value="" disabled>Bar type</option>
                        <option value="45">Olympic bar (45 lbs)</option>
                        <option value="15">CAP bar (15 lbs)</option>
                        <option value="0">No bar</option>
                      </select>
                      <span style={{fontSize:10,color:"var(--muted)"}}>+</span>
                      <div style={{display:"flex",alignItems:"center",gap:3}}>
                        <input type="number" placeholder="0" min="0" step="5"
                          value={barPlates[key]||""}
                          onChange={e=>{
                            const plates=Number(e.target.value)||0;
                            setBarPlates(p=>({...p,[key]:e.target.value}));
                            const currentWeight=Number(weights[key]||0);
                            const prevPlates=Number(barPlates[key]||0);
                            const barWeight=currentWeight-prevPlates;
                            setWeights(w=>({...w,[key]:String(Math.max(0,barWeight)+plates)}));
                          }}
                          style={{width:48,padding:"4px 6px",textAlign:"center",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,color:"#fff",fontSize:11}}/>
                        <span style={{fontSize:10,color:"var(--muted)"}}>lbs plates</span>
                      </div>
                    </div>
                    <div style={{fontSize:10,color:"rgba(255,107,53,0.6)",marginTop:4}}>
                      💡 For landmine exercises, log total weight loaded on the bar
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{display:"flex",gap:8}}>
          <button className="btn-ghost" onClick={e=>{e.stopPropagation();setStep("effort");}} style={{flex:"0 0 auto",padding:"0 14px",fontSize:11}}>← Back</button>
          <button className="btn-primary" onClick={handleFinalSave} disabled={saving} style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
            {saving?"SAVING...":"✓ FINISH"}
          </button>
        </div>
        <button onClick={handleFinalSave} disabled={saving} style={{width:"100%",marginTop:8,padding:8,background:"transparent",border:"none",color:"var(--muted)",fontSize:11,cursor:"pointer"}}>
          Skip weights — just save
        </button>
      </div>
    </div>
  );
}
