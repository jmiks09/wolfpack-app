import { useState } from "react";

// ── WORKOUT PROOF PHOTO MODAL ─────────────────────────────────────────────────
export function WorkoutModal({onClose,onSubmit,loading}){
  const [selected,setSelected]=useState([]); // workout types selected
  const [muscles,setMuscles]=useState([]); // muscles worked (for weight training)
  const [exercises,setExercises]=useState([]); // [{name,sets,reps,weight}]
  const [newEx,setNewEx]=useState({name:"",sets:"",reps:"",weight:""});
  const [duration,setDuration]=useState("");
  const [note,setNote]=useState("");
  const [step,setStep]=useState("pick"); // pick | lifting | cardio
  // non-lifting details
  const [cardioDetails,setCardioDetails]=useState({});

  const MUSCLES=[
    {id:"chest",label:"Chest",icon:"💪"},
    {id:"back",label:"Back",icon:"🔙"},
    {id:"legs",label:"Legs",icon:"🦵"},
    {id:"glutes",label:"Glutes",icon:"🍑"},
    {id:"shoulders",label:"Shoulders",icon:"🏔️"},
    {id:"arms",label:"Arms",icon:"💪"},
    {id:"core",label:"Core",icon:"⚡"},
    {id:"fullbody",label:"Full Body",icon:"🔥"},
  ];

  const hasLifting=selected.some(s=>s.id==="lift");
  const hasCardio=selected.some(s=>s.id!=="lift");

  const toggleType=w=>{
    setSelected(s=>s.find(x=>x.id===w.id)?s.filter(x=>x.id!==w.id):[...s,w]);
  };
  const toggleMuscle=m=>{
    setMuscles(ms=>ms.includes(m)?ms.filter(x=>x!==m):[...ms,m]);
  };
  const addExercise=()=>{
    if(!newEx.name.trim())return;
    setExercises(ex=>[...ex,{...newEx,id:Date.now()}]);
    setNewEx({name:"",sets:"",reps:"",weight:""});
  };
  const removeExercise=id=>setExercises(ex=>ex.filter(e=>e.id!==id));

  const handleSubmit=()=>{
    // Build selected list — if lifting selected, convert to weight training type
    const finalSelected=selected.map(s=>s.id==="lift"?{...s,label:"Weight Training"}:s);
    // Build details
    const details={};
    if(hasLifting){
      details.lift={
        muscles,
        exercises,
        duration,
        focus:muscles.join(", ")||"General",
      };
    }
    selected.filter(s=>s.id!=="lift").forEach(s=>{
      details[s.id]=cardioDetails[s.id]||{};
    });
    const summary=buildManualSummary(finalSelected,muscles,exercises,duration);
    const totalDuration=Number(duration)||selected.filter(s=>s.id!=="lift").reduce((sum,w)=>sum+(Number(cardioDetails[w.id]?.duration)||0),0)||null;
    onSubmit(finalSelected,note,totalDuration,details,summary);
  };

  const buildManualSummary=(types,msc,exs,dur)=>{
    return types.map(t=>{
      if(t.id==="lift"){
        const parts=[msc.length>0?msc.join(", "):"Weight Training"];
        if(exs.length>0)parts.push(`${exs.length} exercises`);
        if(dur)parts.push(`${dur} min`);
        return{label:"🏋️ Weight Training",detail:parts.join(" · ")};
      }
      const d=cardioDetails[t.id]||{};
      const parts=[];
      if(d.distance)parts.push(`${d.distance} mi`);
      if(d.duration)parts.push(`${d.duration} min`);
      if(d.pace)parts.push(`${d.pace}/mi`);
      return{label:`${t.icon} ${t.label}`,detail:parts.join(" · ")};
    });
  };

  const CARDIO_TYPES=selected.filter(s=>s.id!=="lift");

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>

        {/* ── STEP 1: Pick workout types ── */}
        {step==="pick"&&(
          <>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:4}}>LOG WORKOUT</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>What did you do today? Select all that apply.</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {id:"lift",icon:"🏋️",label:"Weight Training"},
                {id:"run",icon:"🏃",label:"Running"},
                {id:"bike",icon:"🚴",label:"Cycling"},
                {id:"hiit",icon:"⚡",label:"HIIT"},
                {id:"walk",icon:"🚶",label:"Walking"},
                {id:"cardio",icon:"❤️‍🔥",label:"Mixed Cardio"},
                {id:"swim",icon:"🏊",label:"Swimming"},
                {id:"other",icon:"💪",label:"Other"},
              ].map(w=>{
                const sel=!!selected.find(x=>x.id===w.id);
                return(
                  <button key={w.id} onClick={()=>toggleType(w)} style={{
                    padding:"14px 10px",borderRadius:14,cursor:"pointer",
                    textAlign:"center",position:"relative",
                    background:sel?"linear-gradient(135deg,rgba(124,92,191,0.2),rgba(255,107,53,0.1))":"var(--bg3)",
                    border:sel?"1px solid rgba(124,92,191,0.5)":"1px solid var(--border)",
                    transition:"all 0.15s",
                  }}>
                    {sel&&<div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>✓</div>}
                    <div style={{fontSize:26,marginBottom:4}}>{w.icon}</div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:sel?"var(--accent2)":"var(--muted)"}}>{w.label}</div>
                  </button>
                );
              })}
            </div>

            <button className="btn-primary" disabled={selected.length===0} onClick={()=>{
              if(hasLifting||hasCardio)setStep(hasLifting?"lifting":"cardio");
            }}>
              NEXT → ADD DETAILS
            </button>
          </>
        )}

        {/* ── STEP 2A: Weight Training details ── */}
        {step==="lifting"&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <button onClick={()=>setStep("pick")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20}}>←</button>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3}}>🏋️ WEIGHT TRAINING</div>
            </div>

            {/* Muscle group multi-select */}
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>MUSCLES WORKED</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                {MUSCLES.map(m=>{
                  const sel=muscles.includes(m.id);
                  return(
                    <button key={m.id} onClick={()=>toggleMuscle(m.id)} style={{
                      padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                      background:sel?"rgba(255,107,53,0.2)":"var(--bg3)",
                      border:sel?"1px solid rgba(255,107,53,0.5)":"1px solid var(--border)",
                    }}>
                      <div style={{fontSize:14,marginBottom:2}}>{m.icon}</div>
                      <div style={{fontSize:9,color:sel?"#ff6b35":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{m.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercise log — optional */}
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>
                EXERCISES <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1,fontFamily:"sans-serif",textTransform:"none"}}>optional</span>
              </div>

              {/* Existing exercises */}
              {exercises.length>0&&(
                <div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:6}}>
                  {exercises.map(ex=>(
                    <div key={ex.id} style={{
                      display:"flex",alignItems:"center",gap:8,
                      padding:"8px 12px",background:"var(--bg3)",
                      border:"1px solid var(--border)",borderRadius:10,
                    }}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:"#fff",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{ex.name}</div>
                        <div style={{fontSize:10,color:"var(--muted)"}}>
                          {[ex.sets?`${ex.sets} sets`:null,ex.reps?`${ex.reps} reps`:null,ex.weight?`@ ${ex.weight} lbs`:null].filter(Boolean).join(" · ")||"No details"}
                        </div>
                      </div>
                      <button onClick={()=>removeExercise(ex.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,padding:"0 4px"}}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new exercise */}
              <div style={{padding:"12px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:12}}>
                <input className="input" placeholder="Exercise name (e.g. Bench Press)"
                  value={newEx.name} onChange={e=>setNewEx(n=>({...n,name:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&addExercise()}
                  style={{marginBottom:8,padding:"8px 12px",fontSize:13}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                  <input className="input" type="number" placeholder="Sets" value={newEx.sets}
                    onChange={e=>setNewEx(n=>({...n,sets:e.target.value}))}
                    style={{padding:"8px 10px",fontSize:13,textAlign:"center"}}/>
                  <input className="input" type="number" placeholder="Reps" value={newEx.reps}
                    onChange={e=>setNewEx(n=>({...n,reps:e.target.value}))}
                    style={{padding:"8px 10px",fontSize:13,textAlign:"center"}}/>
                  <input className="input" type="number" placeholder="Lbs" value={newEx.weight}
                    onChange={e=>setNewEx(n=>({...n,weight:e.target.value}))}
                    style={{padding:"8px 10px",fontSize:13,textAlign:"center"}}/>
                </div>
                <button onClick={addExercise} disabled={!newEx.name.trim()} style={{
                  width:"100%",padding:"8px",borderRadius:10,cursor:"pointer",
                  background:newEx.name.trim()?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:newEx.name.trim()?"1px solid rgba(124,92,191,0.4)":"1px solid var(--border)",
                  color:newEx.name.trim()?"var(--accent2)":"var(--muted)",
                  fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
                }}>+ ADD EXERCISE</button>
              </div>
            </div>

            {/* Duration */}
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>DURATION <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1,fontFamily:"sans-serif",textTransform:"none"}}>optional</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input className="input" type="number" placeholder="45" value={duration}
                  onChange={e=>setDuration(e.target.value)}
                  style={{width:80,padding:"10px 12px",fontSize:16,textAlign:"center"}}/>
                <span style={{fontSize:13,color:"var(--muted)"}}>minutes</span>
              </div>
            </div>

            {/* Note */}
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>NOTES <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1,fontFamily:"sans-serif",textTransform:"none"}}>optional</span></div>
              <input className="input" placeholder="PRs, how it felt, etc..." value={note}
                onChange={e=>setNote(e.target.value)} maxLength={120}/>
            </div>

            <div style={{display:"flex",gap:8}}>
              {hasCardio&&<button className="btn-ghost" onClick={()=>setStep("cardio")} style={{flex:"0 0 auto",padding:"0 14px",fontSize:11}}>+ Cardio →</button>}
              <button className="btn-primary" onClick={hasCardio?()=>setStep("cardio"):handleSubmit} disabled={loading} style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
                {hasCardio?"NEXT → CARDIO":loading?"LOGGING...":"LOG IT 💪"}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2B: Cardio details ── */}
        {step==="cardio"&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <button onClick={()=>setStep(hasLifting?"lifting":"pick")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20}}>←</button>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3}}>CARDIO DETAILS</div>
            </div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>All optional — fill in what you tracked.</div>

            {CARDIO_TYPES.map(w=>(
              <div key={w.id} style={{marginBottom:14,padding:"12px 14px",background:"var(--bg3)",borderRadius:14,border:"1px solid var(--border)"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:20}}>{w.icon}</span>{w.label}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {["run","bike","walk","swim"].includes(w.id)&&(
                    <div>
                      <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Distance (mi)</div>
                      <input className="input" type="number" placeholder="3.1" step="0.1"
                        value={cardioDetails[w.id]?.distance||""}
                        onChange={e=>setCardioDetails(d=>({...d,[w.id]:{...d[w.id],distance:e.target.value}}))}
                        style={{padding:"10px 12px"}}/>
                    </div>
                  )}
                  <div>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Duration (min)</div>
                    <input className="input" type="number" placeholder="30"
                      value={cardioDetails[w.id]?.duration||""}
                      onChange={e=>setCardioDetails(d=>({...d,[w.id]:{...d[w.id],duration:e.target.value}}))}
                      style={{padding:"10px 12px"}}/>
                  </div>
                  {["run","walk"].includes(w.id)&&(
                    <div>
                      <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Pace (min/mi)</div>
                      <input className="input" type="text" placeholder="9:30"
                        value={cardioDetails[w.id]?.pace||""}
                        onChange={e=>setCardioDetails(d=>({...d,[w.id]:{...d[w.id],pace:e.target.value}}))}
                        style={{padding:"10px 12px"}}/>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>NOTES <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1,fontFamily:"sans-serif",textTransform:"none"}}>optional</span></div>
              <input className="input" placeholder="How it went..." value={note} onChange={e=>setNote(e.target.value)} maxLength={120}/>
            </div>

            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
              {loading?"LOGGING...":"LOG IT 💪"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
