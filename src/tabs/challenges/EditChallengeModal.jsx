import { useState } from "react";
import { getWeekdays } from "../../lib/dates";

export function EditChallengeModal({challenge,members,onSave,onClose}){
  const isDR = challenge.goalType==="dateRange";
  const [title,setTitle]=useState(challenge.title||"");
  const [goal,setGoal]=useState(challenge.goal||30);
  const [unit,setUnit]=useState(challenge.unit||"reps");
  const [startDate,setStartDate]=useState(challenge.startDate||"");
  const [endDate,setEndDate]=useState(challenge.endDate||"");
  const [penalty,setPenalty]=useState(challenge.penalty||"");
  const [penaltyAmt,setPenaltyAmt]=useState(challenge.penaltyAmt||"");
  const [forfeitCap,setForfeitCap]=useState(challenge.forfeitCap||"");
  const [paymentRecipient,setPaymentRecipient]=useState(challenge.paymentRecipient||"creator");
  const [parts,setParts]=useState(Object.keys(challenge.participants||{}));
  const toggle=m=>setParts(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m]);

  const save=()=>{
    if(!title.trim()) return;
    const np={...challenge.participants};
    parts.forEach(m=>{
      if(!np[m]){
        // New member — set as pending invite, NOT auto-accepted
        np[m]={progress:0,done:false,status:"pending"};
      }
    });
    Object.keys(np).forEach(m=>{if(!parts.includes(m))delete np[m];});
    const newGoal=isDR&&startDate&&endDate?getWeekdays(startDate,endDate).length:Number(goal);
    onSave({...challenge,title:title.trim(),goal:newGoal,unit:isDR?"days":unit,startDate:isDR?startDate:challenge.startDate,endDate:isDR?endDate:challenge.endDate,penalty:penalty.trim(),penaltyAmt:penaltyAmt?Number(penaltyAmt):0,forfeitCap:forfeitCap?Number(forfeitCap):0,participants:np});
    onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>EDIT CHALLENGE</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Challenge name</div>
            <input className="input" value={title} onChange={e=>setTitle(e.target.value)} maxLength={50}/>
          </div>
          {isDR?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Start date</div><input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>End date</div><input className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
              {startDate&&endDate&&<div style={{gridColumn:"1/-1",fontSize:12,color:"var(--accent2)",background:"rgba(124,92,191,0.1)",padding:"8px 12px",borderRadius:8}}>📅 {getWeekdays(startDate,endDate).length} weekdays</div>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div><input className="input" type="number" value={goal} onChange={e=>setGoal(e.target.value)} min={1}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div><select className="input" value={unit} onChange={e=>setUnit(e.target.value)} style={{appearance:"none"}}>{["reps","miles","minutes","lbs","kg","sessions","calories"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
          )}
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty</div><input className="input" placeholder='e.g. "Buys lunch"' value={penalty} onChange={e=>setPenalty(e.target.value)} maxLength={80}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>$ per missed workout <span style={{fontSize:11}}>(optional)</span></div><input className="input" type="number" placeholder="optional — e.g. 5" value={penaltyAmt} onChange={e=>setPenaltyAmt(e.target.value)} min={0}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Forfeit cap $ (optional)</div><input className="input" type="number" placeholder="e.g. 50" value={forfeitCap} onChange={e=>setForfeitCap(e.target.value)} min={0}/></div>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Payments go to</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:"creator",l:"Creator"},{v:"admin",l:"Admin"}].map(({v,l})=>(
                <button key={v} onClick={()=>setPaymentRecipient(v)} style={{flex:1,padding:"8px",borderRadius:10,cursor:"pointer",fontSize:12,background:paymentRecipient===v?"rgba(124,92,191,0.2)":"var(--bg3)",border:paymentRecipient===v?"1px solid var(--accent)":"1px solid var(--border)",color:paymentRecipient===v?"var(--accent2)":"var(--muted)"}}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Participants</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {members.map(m=>(
                <button key={m} onClick={()=>toggle(m)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:13,background:parts.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:parts.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:parts.includes(m)?"var(--accent2)":"var(--muted)"}}>
                  {parts.includes(m)?"✓ ":""}{m}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={save} disabled={!title.trim()}>SAVE CHANGES</button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
