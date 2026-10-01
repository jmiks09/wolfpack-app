import { useEffect, useState } from "react";
import { getDateRange, localDateStr, todayStr } from "../../lib/dates";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeInvites } from "./ChallengeInvites";

export function ChallengesTab({currentUser,adminName,members,profiles,challenges,history,onAdd,onLogProgress,onDelete,onEditChallenge,onForfeit,onAccept,onDecline,onOpenProfile,onMarkPaid,onLogPayment}){
  const [open,setOpen]=useState(false);
  const defEnd=()=>{const e=new Date();e.setDate(e.getDate()+30);return localDateStr(e);};
  const [form,setForm]=useState({title:"",useDateRange:false,goal:30,unit:"reps",startDate:todayStr(),endDate:defEnd(),penalty:"",penaltyAmt:"",forfeitCap:"",maxRestDays:2,participants:[],paymentRecipient:"creator"});
  useEffect(()=>setForm(f=>({...f,participants:members})),[members]);
  const toggleP=m=>setForm(f=>({...f,participants:f.participants.includes(m)?f.participants.filter(x=>x!==m):[...f.participants,m]}));
  const sub=()=>{
    if(!form.title.trim())return;
    const parts=form.participants.length>0?form.participants:members;
    const goal=form.useDateRange?getDateRange(form.startDate,form.endDate).length:Number(form.goal);
    // Creator is auto-enrolled, everyone else gets a pending invite
    const participantMap=parts.reduce((a,m)=>({
      ...a,
      [m]: m===currentUser
        ? {progress:0,done:false,status:"accepted"}
        : {progress:0,done:false,status:"pending"}
    }),{});
    onAdd({id:Date.now().toString(),title:form.title.trim(),goalType:form.useDateRange?"dateRange":"amount",goal,unit:form.useDateRange?"days":form.unit,startDate:form.useDateRange?form.startDate:null,endDate:form.useDateRange?form.endDate:null,penalty:form.penalty.trim(),penaltyAmt:form.penaltyAmt?Number(form.penaltyAmt):0,forfeitCap:form.forfeitCap?Number(form.forfeitCap):0,maxRestDays:form.useDateRange?Number(form.maxRestDays):null,createdBy:currentUser,createdAt:Date.now(),participants:participantMap,status:"active"});
    setOpen(false);
  };
  const active=challenges.filter(c=>c.status==="active"),done=challenges.filter(c=>c.status!=="active");
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}><button className="btn-primary" onClick={()=>setOpen(true)}>⚔️ CREATE CHALLENGE</button></div>
      <ChallengeInvites currentUser={currentUser} challenges={challenges} profiles={profiles} onAccept={onAccept} onDecline={onDecline} onOpenProfile={onOpenProfile}/>
      {active.filter(c=>c.participants?.[currentUser]?.status!=="pending").length===0&&done.length===0&&challenges.filter(c=>c.participants?.[currentUser]?.status==="pending").length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}><div style={{fontSize:40,marginBottom:12}}>⚔️</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>NO ACTIVE CHALLENGES</div></div>}
      {active.filter(c=>c.participants?.[currentUser]?.status!=="pending").length>0&&<div className="section-label">ACTIVE</div>}
      {active.filter(c=>c.participants?.[currentUser]?.status!=="pending").map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} adminName={adminName} members={members} profiles={profiles} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} onForfeit={onForfeit} onMarkPaid={onMarkPaid} onLogPayment={onLogPayment} history={history}/>)}
      {done.length>0&&<div className="section-label" style={{marginTop:8}}>COMPLETED</div>}
      {done.map(c=><ChallengeCard key={c.id} challenge={c} currentUser={currentUser} adminName={adminName} members={members} profiles={profiles} onLog={onLogProgress} onDelete={onDelete} onEdit={onEditChallenge} onForfeit={onForfeit} onMarkPaid={onMarkPaid} onLogPayment={onLogPayment} history={history} completed/>)}
      {open&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}><div className="modal">
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>NEW CHALLENGE</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input className="input" placeholder="Challenge name..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoFocus maxLength={50}/>
          <div style={{display:"flex",gap:8}}>
            {[{v:false,l:"📊 GOAL AMOUNT"},{v:true,l:"📅 DATE RANGE"}].map(({v,l})=>(
              <button key={String(v)} onClick={()=>setForm({...form,useDateRange:v})} style={{flex:1,padding:10,borderRadius:10,cursor:"pointer",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,background:form.useDateRange===v?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.useDateRange===v?"1px solid var(--accent)":"1px solid var(--border)",color:form.useDateRange===v?"var(--accent2)":"var(--muted)"}}>{l}</button>
            ))}
          </div>
          {!form.useDateRange?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Goal amount</div><input className="input" type="number" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} min={1}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Unit</div><select className="input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={{appearance:"none"}}>{["reps","miles","minutes","lbs","kg","sessions","calories"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Start</div><input className="input" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
              <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>End</div><input className="input" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
              {form.startDate&&form.endDate&&<div style={{gridColumn:"1/-1",fontSize:12,color:"var(--accent2)",background:"rgba(124,92,191,0.1)",padding:"8px 12px",borderRadius:8}}>📅 {getDateRange(form.startDate,form.endDate).length} total days · your workout days depend on your rest day settings</div>}
            </div>
          )}
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Participants</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{members.map(m=><button key={m} onClick={()=>toggleP(m)} style={{padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:13,background:form.participants.includes(m)?"rgba(124,92,191,0.2)":"var(--bg3)",border:form.participants.includes(m)?"1px solid var(--accent)":"1px solid var(--border)",color:form.participants.includes(m)?"var(--accent2)":"var(--muted)"}}>{m}</button>)}</div></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Penalty (optional)</div><input className="input" placeholder='e.g. "Buys lunch"' value={form.penalty} onChange={e=>setForm({...form,penalty:e.target.value})} maxLength={80}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>$ per missed workout <span style={{color:"var(--bg3)",fontSize:11}}>(optional)</span></div><input className="input" type="number" placeholder="optional — e.g. 5" value={form.penaltyAmt} onChange={e=>setForm({...form,penaltyAmt:e.target.value})} min={0}/></div>
          <div><div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>Forfeit cap $ (optional — max they'll ever owe)</div><input className="input" type="number" placeholder="e.g. 50" value={form.forfeitCap} onChange={e=>setForm({...form,forfeitCap:e.target.value})} min={0}/></div>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Payments go to</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:"creator",l:"Me (challenge creator)"},{v:"admin",l:`Admin (${adminName})`}].map(({v,l})=>(
                <button key={v} onClick={()=>setForm({...form,paymentRecipient:v})} style={{flex:1,padding:"8px",borderRadius:10,cursor:"pointer",fontSize:12,background:(form.paymentRecipient||"creator")===v?"rgba(124,92,191,0.2)":"var(--bg3)",border:(form.paymentRecipient||"creator")===v?"1px solid var(--accent)":"1px solid var(--border)",color:(form.paymentRecipient||"creator")===v?"var(--accent2)":"var(--muted)"}}>{l}</button>
              ))}
            </div>
          </div>
          {form.useDateRange&&<div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Max rest days per week allowed</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button onClick={()=>setForm(f=>({...f,maxRestDays:Math.max(1,f.maxRestDays-1)}))} style={{width:36,height:36,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--text)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"var(--accent2)"}}>{form.maxRestDays}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>day{form.maxRestDays!==1?"s":""} / week</div>
              </div>
              <button onClick={()=>setForm(f=>({...f,maxRestDays:Math.min(6,f.maxRestDays+1)}))} style={{width:36,height:36,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--text)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:6,textAlign:"center"}}>Anyone taking more than {form.maxRestDays} rest day{form.maxRestDays!==1?"s":""} in a week will be penalized for the extra missed days</div>
          </div>}
          <button className="btn-primary" onClick={sub} disabled={!form.title.trim()} style={{marginTop:4}}>CREATE ⚔️</button>
        </div>
      </div></div>}
    </div>
  );
}
