import { useState } from "react";
import { wolfmodeMinutes } from "../lib/workoutEntry";

// ── WEIGHT LOG MODAL ─────────────────────────────────────────────────────────
// ── EDIT COMPLETED WORKOUT MODAL ─────────────────────────────────────────────
export function EditCompletedWorkoutModal({date, entry, currentUser, onSave, onClose}){
  const exercises=entry?.wolfmodeSession?.exercises||entry?.details?.lift?.exercises||[];
  const blank={name:"",sets:"",reps:"",weightUsed:"",skipped:false,primaryMuscle:""};
  // No exercises yet (e.g. a workout logged without any): start with one empty row
  const [editedExercises,setEditedExercises]=useState(()=>exercises.length?exercises.map(ex=>({...ex})):[{...blank}]);
  const [saving,setSaving]=useState(false);
  const startMins=wolfmodeMinutes(entry);
  const [mins,setMins]=useState(startMins?String(startMins):"");

  const updateField=(idx,field,val)=>{
    setEditedExercises(exs=>exs.map((ex,i)=>i===idx?{...ex,[field]:val}:ex));
  };

  const save=async()=>{
    setSaving(true);
    // Drop rows left empty
    const kept=editedExercises.filter(ex=>String(ex.substitutedWith||ex.name||"").trim());
    await onSave(date,kept,entry?.wolfmodeSession&&Number(mins)&&Number(mins)!==startMins?mins:null);
    setSaving(false);
    onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,marginBottom:2}}>{exercises.length?"EDIT EXERCISES":"ADD EXERCISES"}</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>{exercises.length?"Update weights, reps, or sets for any exercise.":"Add what you did — name, sets, reps and weight."}</div>
        {entry?.wolfmodeSession&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",flex:1}}>⏱️ Workout length</span>
            <input aria-label="Workout minutes" inputMode="numeric" value={mins} onChange={e=>setMins(e.target.value.replace(/[^0-9]/g,"").slice(0,3))}
              style={{width:56,padding:"6px 4px",borderRadius:8,textAlign:"center",fontSize:14,fontWeight:600,background:"var(--bg2)",border:"1px solid var(--border)",color:"#fff"}}/>
            <span style={{fontSize:12,color:"var(--muted)"}}>min</span>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {editedExercises.map((ex,idx)=>{
            const isSkipped=ex.skipped&&!ex.substitutedWith;
            const displayName=ex.substitutedWith||ex.name;
            return(
              <div key={idx} style={{padding:"10px 12px",background:isSkipped?"rgba(255,255,255,0.02)":"var(--bg3)",border:`1px solid ${isSkipped?"rgba(255,255,255,0.05)":"var(--border)"}`,borderRadius:12,opacity:isSkipped?0.4:1}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                <input type="text" value={displayName} onChange={e=>updateField(idx,"name",e.target.value)} aria-label={`Exercise ${idx+1} name`}
                    placeholder="Exercise name..." style={{flex:1,minWidth:0,padding:"5px 8px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:7,color:"#fff",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}/>
                <button onClick={()=>setEditedExercises(exs=>exs.filter((_,i)=>i!==idx))} aria-label={`Remove exercise ${idx+1}`}
                  style={{width:28,height:28,borderRadius:8,cursor:"pointer",background:"transparent",border:"1px solid var(--border)",color:"var(--muted)",fontSize:12,flexShrink:0}}>✕</button>
                </div>
                {ex.substitutedWith&&<span style={{fontSize:9,color:"rgba(255,107,53,0.6)",marginLeft:6,fontFamily:"sans-serif",letterSpacing:0}}>(subbed)</span>}
                {isSkipped&&<span style={{fontSize:9,color:"var(--muted)",marginLeft:6,fontFamily:"sans-serif"}}>skipped</span>}
                {!isSkipped&&(
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={ex.sets||""} onChange={e=>updateField(idx,"sets",e.target.value?Number(e.target.value):"")}
                        placeholder="—" style={{width:38,padding:"5px 4px",textAlign:"center",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:7,color:"#fff",fontSize:12}}/>
                      <span style={{fontSize:10,color:"var(--muted)"}}>sets</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={ex.actualReps||ex.reps||""} onChange={e=>updateField(idx,"actualReps",e.target.value)}
                        placeholder="—" style={{width:38,padding:"5px 4px",textAlign:"center",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:7,color:"#fff",fontSize:12}}/>
                      <span style={{fontSize:10,color:"var(--muted)"}}>reps</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="text" value={ex.weightUsed?.replace(/[^0-9.]/g,"")||""} onChange={e=>updateField(idx,"weightUsed",e.target.value?`${e.target.value} lbs`:"")}
                        placeholder="—" style={{width:46,padding:"5px 4px",textAlign:"center",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:7,color:"#fff",fontSize:12}}/>
                      <span style={{fontSize:10,color:"var(--muted)"}}>lbs</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{fontSize:11,color:"var(--muted)",marginBottom:12,padding:"8px 10px",background:"rgba(255,255,255,0.02)",borderRadius:8}}>
          💡 All weights are total loaded weight including the bar.
        </div>
        <button onClick={()=>setEditedExercises(exs=>[...exs,{...blank}])} style={{width:"100%",marginBottom:12,padding:"8px",borderRadius:8,cursor:"pointer",background:"rgba(255,255,255,0.03)",border:"1px dashed rgba(255,255,255,0.15)",color:"var(--muted)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
          + ADD EXERCISE
        </button>

        <button className="btn-primary" onClick={save} disabled={saving} style={{width:"100%",background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
          {saving?"SAVING...":"SAVE CHANGES"}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{width:"100%",marginTop:8}}>Cancel</button>
      </div>
    </div>
  );
}
