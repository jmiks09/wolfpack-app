import { useState } from "react";

// ── AI COACH — disclaimer modal (shown once) ────────────────────────────────
export function CoachDisclaimerModal({onAccept, onClose}){
  const [ack,setAck]=useState(false);
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1100}}>
      <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{textAlign:"center",fontSize:32,marginBottom:8}}>⚠️</div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,textAlign:"center",marginBottom:12}}>BEFORE YOU CONTINUE</div>

        <div style={{
          padding:"12px 14px",marginBottom:12,
          background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,
          fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.6,
        }}>
          <div style={{marginBottom:10}}>
            <strong style={{color:"var(--accent2)"}}>This is INFORMATIONAL ONLY.</strong> The AI Coach is not a doctor, dietitian, or medical professional. Nothing it suggests is medical advice.
          </div>
          <div style={{marginBottom:10}}>
            <strong style={{color:"var(--orange)"}}>Always talk to a healthcare provider</strong> before starting any supplement, making significant diet changes, or beginning a new exercise program — especially if you take medications, have a medical condition, are pregnant or nursing, or are under 18.
          </div>
          <div style={{marginBottom:10}}>
            <strong style={{color:"var(--red)"}}>You are responsible</strong> for your own health decisions. Neither WOLFPACK nor its creators are liable for outcomes from any information provided.
          </div>
          <div>
            Supplement suggestions stick to widely-available OTC items. The AI will not recommend prescription drugs, hormones, SARMs, or anything similar.
          </div>
        </div>

        <label style={{
          display:"flex",alignItems:"flex-start",gap:10,
          padding:"10px 12px",marginBottom:12,
          background:ack?"rgba(46,204,113,0.08)":"var(--bg3)",
          border:ack?"1px solid var(--green)":"1px solid var(--border)",
          borderRadius:10,cursor:"pointer",
        }}>
          <input
            type="checkbox"
            checked={ack}
            onChange={e=>setAck(e.target.checked)}
            style={{marginTop:2,flexShrink:0,accentColor:"var(--accent)"}}
          />
          <span style={{fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.5}}>
            I understand this is informational only, not medical advice. I will consult a healthcare provider before making decisions based on it.
          </span>
        </label>

        <div style={{display:"flex",gap:8}}>
          <button className="btn-ghost" onClick={onClose} style={{flex:1}}>CANCEL</button>
          <button className="btn-primary" onClick={onAccept} disabled={!ack} style={{flex:1}}>I AGREE</button>
        </div>
      </div>
    </div>
  );
}
