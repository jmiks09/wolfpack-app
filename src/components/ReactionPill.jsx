import { useState } from "react";
import { REACTIONS } from "../lib/constants";

// ── REACTION PILL ────────────────────────────────────────────────────────────
export function ReactionPill({member, reactions, currentUser, onReact}){
  const [open,setOpen]=useState(false);
  const memberReactions=reactions?.[member]||{};
  // Get all reactions that have at least 1
  const activeReactions=REACTIONS.filter(r=>(memberReactions[r]||[]).length>0);
  const myReaction=REACTIONS.find(r=>(memberReactions[r]||[]).includes(currentUser));

  return(
    <div style={{position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {/* Active reactions with counts */}
        {activeReactions.map(r=>{
          const count=(memberReactions[r]||[]).length;
          const iReacted=(memberReactions[r]||[]).includes(currentUser);
          return(
            <button key={r} onClick={e=>{e.stopPropagation();onReact(member,r);}} style={{
              padding:"2px 8px",borderRadius:20,fontSize:12,cursor:"pointer",
              background:iReacted?"rgba(124,92,191,0.2)":"rgba(255,255,255,0.05)",
              border:iReacted?"1px solid rgba(124,92,191,0.35)":"1px solid rgba(255,255,255,0.08)",
              display:"flex",alignItems:"center",gap:3,
            }}>
              {r} <span style={{fontSize:10,color:"var(--muted)"}}>{count}</span>
            </button>
          );
        })}
        {/* React + button */}
        <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{
          padding:"2px 10px",borderRadius:20,fontSize:11,cursor:"pointer",
          background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
          color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
        }}>
          {myReaction?"REACTED":"REACT +"}
        </button>
      </div>
      {/* Emoji picker */}
      {open&&(
        <div onClick={e=>e.stopPropagation()} style={{
          position:"absolute",bottom:"calc(100% + 6px)",right:0,
          background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,
          padding:"10px 12px",display:"flex",gap:8,zIndex:50,
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {REACTIONS.map(r=>(
            <button key={r} onClick={()=>{onReact(member,r);setOpen(false);}} style={{
              fontSize:22,cursor:"pointer",background:"none",border:"none",
              padding:"4px",borderRadius:8,
              transform:(memberReactions[r]||[]).includes(currentUser)?"scale(1.3)":"scale(1)",
              transition:"transform 0.1s",
            }}>{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}
