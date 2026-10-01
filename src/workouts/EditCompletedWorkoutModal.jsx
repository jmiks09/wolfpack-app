import { useState } from "react";

// ── WEIGHT LOG MODAL ─────────────────────────────────────────────────────────
// ── EDIT COMPLETED WORKOUT MODAL ─────────────────────────────────────────────
export function EditCompletedWorkoutModal({date, entry, currentUser, onSave, onClose}){
  const exercises=entry?.wolfmodeSession?.exercises||entry?.details?.lift?.exercises||[];
  const [editedExercises,setEditedExercises]=useState(()=>exercises.map(ex=>({...ex})));
  const [saving,setSaving]=useState(false);

  const updateField=(idx,field,val)=>{
    setEditedExercises(exs=>exs.map((ex,i)=>i===idx?{...ex,[field]:val}:ex));
  };

  const save=async()=>{
    setSaving(true);
    await onSave(date,editedExercises);
    setSaving(false);
    onClose();
  };

  if(exercises.length===0){
    return(
      <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal">
          <div className="modal-handle"/>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,marginBottom:8}}>EDIT EXERCISES</div>
          <div style={{fontSize:13,color:"var(--muted)",marginBottom:16}}>No exercise data found for this workout. Only WOLFMODE workouts with logged weights can be edited here.</div>
          <button className="btn-ghost" onClick={onClose} style={{width:"100%"}}>Close</button>
        </div>
      </div>
    );
  }

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,marginBottom:2}}>EDIT EXERCISES</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>Update weights, reps, or sets for any exercise.</div>

        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {editedExercises.map((ex,idx)=>{
            const isSkipped=ex.skipped&&!ex.substitutedWith;
            const displayName=ex.substitutedWith||ex.name;
            return(
              <div key={idx} style={{padding:"10px 12px",background:isSkipped?"rgba(255,255,255,0.02)":"var(--bg3)",border:`1px solid ${isSkipped?"rgba(255,255,255,0.05)":"var(--border)"}`,borderRadius:12,opacity:isSkipped?0.4:1}}>
                <input type="text" value={displayName} onChange={e=>updateField(idx,"name",e.target.value)}
                    placeholder="Exercise name..." style={{width:"100%",padding:"5px 8px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:7,color:"#fff",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,marginBottom:6}}/>
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
        <button onClick={()=>setEditedExercises(exs=>[...exs,{name:"",sets:"",reps:"",weightUsed:"",skipped:false,primaryMuscle:""}])} style={{width:"100%",marginBottom:12,padding:"8px",borderRadius:8,cursor:"pointer",background:"rgba(255,255,255,0.03)",border:"1px dashed rgba(255,255,255,0.15)",color:"var(--muted)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
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
