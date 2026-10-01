import { useState } from "react";
import { blankHabit } from "../../../lib/habits";

const bebas = {fontFamily:"'Bebas Neue',cursive",letterSpacing:2};
const small = {fontSize:12,color:"var(--muted)"};
const num = v => (v===""?"":Number(v));
const TYPES = [
  ["check","Check off","🙏","Prayer 5× a week"],
  ["total","Running total","💰","Save $1,000"],
  ["min","Daily minimum","💧","8 glasses of water"],
  ["max","Daily limit","🍬","Under 2 sweets"],
  ["workout","Workouts","🏃","Run 3× a week"],
];

function Field({label,children}){
  return <label style={{display:"flex",flexDirection:"column",gap:4,flex:1,minWidth:0}}><span style={small}>{label}</span>{children}</label>;
}

// ── PERSONAL GOAL FORM ────────────────────────────────────────────────────────
export function PersonalGoalForm({challenge:ch,existing,today,onSave,onDelete,onClose}){
  const [g,setG]=useState(()=>existing?{...existing}:null);
  const [error,setError]=useState("");
  const [confirmDelete,setConfirmDelete]=useState(false);
  const up=patch=>setG(x=>({...x,...patch}));
  const pick=type=>{
    const b=blankHabit(type);
    setG({...b,id:`p_${b.id}`,label:type==="workout"?"":b.label,deadline:type==="total"?ch.end:undefined,shared:false,start:today,createdAt:Date.now()});
  };
  const save=async()=>{
    if(!g.label.trim())return setError("Give your goal a name.");
    if(!(Number(g.target)>0))return setError("Set a target above 0.");
    if(g.type==="total"&&(!g.deadline||g.deadline<today))return setError("Pick a deadline from today on.");
    const clean=Object.fromEntries(Object.entries({...g,label:g.label.trim()}).filter(([,v])=>v!==undefined));
    await onSave(clean);onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{...bebas,fontSize:22,letterSpacing:3}}>{existing?"EDIT PERSONAL GOAL":"ADD A PERSONAL GOAL"}</div>
        <div style={{...small,marginBottom:12,lineHeight:1.5}}>Tracked alongside {ch.name}, but just for you. It never affects money or rankings.</div>

        {!g&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {TYPES.map(([t,l,icon,ex])=>(
            <button key={t} onClick={()=>pick(t)} style={{display:"flex",alignItems:"center",gap:12,padding:12,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer",color:"var(--text)",textAlign:"left"}}>
              <span style={{fontSize:22}}>{icon}</span>
              <span><span style={{...bebas,fontSize:16,display:"block"}}>{l}</span><span style={small}>e.g. {ex}</span></span>
            </button>
          ))}
          <button className="btn-ghost" style={{width:"100%"}} onClick={onClose}>Cancel</button>
        </div>}

        {g&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:8}}>
            <input className="input" value={g.icon} onChange={e=>up({icon:e.target.value.slice(0,2)})} aria-label="Goal icon" style={{width:56,textAlign:"center",fontSize:20,padding:8}}/>
            <input className="input" value={g.label} onChange={e=>up({label:e.target.value})} placeholder={g.type==="total"?"Savings":g.type==="check"?"Pray":"Goal name"} aria-label="Goal name" maxLength={30} autoFocus style={{flex:1}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            {(g.type==="check"||g.type==="workout")&&<Field label="Times per week"><input className="input" type="number" min={1} max={7} value={g.target} onChange={e=>up({target:num(e.target.value)})}/></Field>}
            {g.type==="workout"&&<Field label="Counts"><select className="input" value={g.filter} onChange={e=>up({filter:e.target.value})}><option value="any">Any workout</option><option value="strength">Strength</option><option value="cardio">Cardio or activity</option></select></Field>}
            {(g.type==="min"||g.type==="max")&&<Field label={g.type==="max"?"Daily limit":"Daily minimum"}><input className="input" type="number" value={g.target} onChange={e=>up({target:num(e.target.value)})}/></Field>}
            {g.type==="total"&&<Field label="Goal amount"><input className="input" type="number" min={1} value={g.target} onChange={e=>up({target:num(e.target.value)})}/></Field>}
            {g.type!=="check"&&g.type!=="workout"&&<Field label="Unit"><input className="input" value={g.unit||""} onChange={e=>up({unit:e.target.value.slice(0,8)})} placeholder={g.type==="total"?"$":"glasses"}/></Field>}
          </div>
          {g.type==="total"&&<Field label="Deadline"><input className="input" type="date" value={g.deadline||""} onChange={e=>up({deadline:e.target.value})}/></Field>}
          {g.type==="total"&&<div style={small}>Each day, enter how much you added. The app keeps the running total and tells you if you're on pace.</div>}

          <button onClick={()=>up({shared:!g.shared})} role="switch" aria-checked={!!g.shared} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:12,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer",color:"var(--text)",textAlign:"left"}}>
            <span><span style={{fontSize:14,display:"block"}}>{g.shared?"👀 Shared with the pack":"🔒 Private"}</span><span style={small}>{g.shared?"Others see your progress on the weekly board.":"Only you see this goal."}</span></span>
            <span style={{width:44,height:26,borderRadius:13,background:g.shared?"var(--accent)":"var(--bg2)",border:"1px solid var(--border)",position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",top:3,left:g.shared?21:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .15s"}}/>
            </span>
          </button>

          {error&&<div style={{color:"var(--red)",fontSize:13}}>{error}</div>}
          <button className="btn-primary" onClick={save}>{existing?"SAVE":"ADD GOAL"}</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={existing?onClose:()=>setG(null)}>{existing?"Cancel":"← Back"}</button>
          {existing&&(confirmDelete
            ?<div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{flex:1,fontSize:13}}>Delete this goal?</span>
              <button onClick={async()=>{await onDelete(existing.id);onClose();}} style={{padding:"8px 14px",background:"var(--red)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",...bebas}}>DELETE</button>
              <button className="btn-ghost" onClick={()=>setConfirmDelete(false)}>Keep</button>
            </div>
            :<button onClick={()=>setConfirmDelete(true)} style={{background:"none",border:"none",color:"var(--red)",fontSize:13,cursor:"pointer",padding:6}}>Delete goal</button>)}
        </div>}
      </div>
    </div>
  );
}
