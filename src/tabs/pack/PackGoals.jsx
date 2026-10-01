import { useState } from "react";
import { fmtDate } from "../../lib/dates";

// ── PACK GOALS BOARD ─────────────────────────────────────────────────────────
export function PackGoals({currentUser,packGoals,profiles,members,onAddGoal,onCheer,onDeleteGoal}){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const sub=()=>{if(!text.trim())return;onAddGoal(text.trim());setText("");setOpen(false);};
  const myGoal=packGoals.find(g=>g.author===currentUser);
  // Combine pack goals + personal goals from profiles
  const profileGoals=members.filter(m=>profiles[m]?.personalGoal&&profiles[m]?.shareGoal&&!packGoals.find(g=>g.author===m)).map(m=>({
    id:`profile_${m}`,author:m,text:profiles[m].personalGoal,cheers:[],fromProfile:true
  }));
  const allGoals=[...packGoals,...profileGoals];
  return(
    <div style={{margin:"8px 16px 0"}}>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",marginBottom:8}}>PACK GOALS</div>
      {allGoals.length===0&&!open&&(
        <div style={{textAlign:"center",padding:"16px",background:"var(--bg3)",borderRadius:14,border:"1px dashed var(--border)",marginBottom:8}}>
          <div style={{fontSize:12,color:"var(--muted)"}}>No goals posted yet. Set one for the pack to see!</div>
        </div>
      )}
      {allGoals.map(g=>(
        <div key={g.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--bg3)",borderRadius:12,border:"1px solid var(--border)",marginBottom:8}}>
          <div style={{fontSize:22}}>🎯</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{g.text}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{g.author}{g.date&&<span style={{marginLeft:6,opacity:0.6}}>· {fmtDate(g.date)}</span>}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>onCheer(g.id,currentUser)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,opacity:(g.cheers||[]).includes(currentUser)?1:0.4}}>🔥</button>
            <span style={{fontSize:12,color:"var(--muted)"}}>{(g.cheers||[]).length||""}</span>
            {g.author===currentUser&&<button onClick={()=>onDeleteGoal(g.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,marginLeft:2}}>×</button>}
          </div>
        </div>
      ))}
      {!myGoal&&!open&&(
        <button onClick={()=>setOpen(true)} style={{width:"100%",padding:"10px",background:"rgba(124,92,191,0.1)",border:"1px dashed rgba(124,92,191,0.4)",borderRadius:12,cursor:"pointer",color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2}}>+ SET YOUR GOAL</button>
      )}
      {open&&(
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <input className="input" placeholder="My goal is..." value={text} onChange={e=>setText(e.target.value)} maxLength={80} autoFocus style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&sub()}/>
          <button onClick={sub} disabled={!text.trim()} style={{padding:"10px 14px",background:"var(--accent)",border:"none",borderRadius:10,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:13}}>POST</button>
          <button onClick={()=>{setOpen(false);setText("");}} style={{padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>✕</button>
        </div>
      )}
    </div>
  );
}
