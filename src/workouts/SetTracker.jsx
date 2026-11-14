import { setsOf } from "../lib/setLog";

// ── SET TRACKER ──────────────────────────────────────────────────────────────
// One row per set: [weight] lbs × [reps]  ✓. Pre-filled from the coach's plan;
// edit any number, tap ✓ when the set is done, add or remove sets.
const box={
  width:52,padding:"6px 4px",borderRadius:8,textAlign:"center",fontSize:14,fontWeight:600,
  background:"rgba(255,255,255,0.06)",border:"1px solid var(--border)",color:"#fff",
};

export function SetTracker({exercise, onChange, readOnly}){
  const sets=setsOf(exercise);
  const bw=sets.every(s=>s.weight==="BW");
  const doneCount=sets.filter(s=>s.done).length;
  const update=(i,patch)=>onChange(sets.map((s,j)=>j===i?{...s,...patch}:s));
  const add=()=>{const last=sets[sets.length-1]||{weight:"",reps:""};onChange([...sets,{weight:last.weight,reps:last.reps,done:false}]);};
  const remove=()=>{if(sets.length>1)onChange(sets.slice(0,-1));};

  return(
    <div style={{padding:"2px 14px 12px"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {sets.map((s,i)=>(
          <div key={i} data-testid="set-row" style={{
            display:"flex",alignItems:"center",gap:8,padding:"4px 8px",borderRadius:10,
            background:s.done?"rgba(46,204,113,0.10)":"rgba(0,0,0,0.15)",
            border:`1px solid ${s.done?"rgba(46,204,113,0.35)":"transparent"}`,
          }}>
            <div style={{width:40,flexShrink:0,whiteSpace:"nowrap",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:s.done?"var(--green)":"var(--muted)"}}>SET {i+1}</div>
            {bw?(
              <div style={{...box,width:"auto",padding:"6px 4px",fontSize:12,color:"var(--muted)",background:"transparent",border:"none",whiteSpace:"nowrap"}}>Bodyweight</div>
            ):(
              <>
                <input aria-label={`${exercise.name} set ${i+1} weight`} inputMode="decimal" value={s.weight} placeholder="—" disabled={readOnly}
                  onChange={e=>update(i,{weight:e.target.value.replace(/[^0-9.]/g,"")})} style={box}/>
                <span style={{fontSize:11,color:"var(--muted)"}}>lbs</span>
              </>
            )}
            <span style={{fontSize:12,color:"var(--muted)"}}>×</span>
            <input aria-label={`${exercise.name} set ${i+1} reps`} inputMode="numeric" value={s.reps} placeholder="—" disabled={readOnly}
              onChange={e=>update(i,{reps:e.target.value.replace(/[^0-9]/g,"")})} style={{...box,width:44}}/>
            <span style={{fontSize:11,color:"var(--muted)"}}>reps</span>
            <button aria-label={`${exercise.name} set ${i+1} done`} aria-pressed={s.done} disabled={readOnly}
              onClick={()=>update(i,{done:!s.done})}
              style={{
                marginLeft:"auto",width:34,height:34,borderRadius:"50%",cursor:readOnly?"default":"pointer",flexShrink:0,
                background:s.done?"var(--green)":"transparent",
                border:`2px solid ${s.done?"var(--green)":"rgba(255,255,255,0.25)"}`,
                color:s.done?"#0b0b12":"rgba(255,255,255,0.35)",fontSize:16,fontWeight:700,
              }}>✓</button>
          </div>
        ))}
      </div>
      {!readOnly&&(
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
          <button onClick={add} style={chip}>+ Add set</button>
          <button onClick={remove} disabled={sets.length<=1} style={{...chip,opacity:sets.length<=1?0.4:1}}>− Remove set</button>
          <div style={{marginLeft:"auto",fontSize:11,color:doneCount===sets.length?"var(--green)":"var(--muted)"}}>{doneCount}/{sets.length} done</div>
        </div>
      )}
    </div>
  );
}
const chip={padding:"5px 12px",borderRadius:20,fontSize:11,cursor:"pointer",background:"rgba(255,255,255,0.05)",border:"1px solid var(--border)",color:"rgba(255,255,255,0.8)"};
