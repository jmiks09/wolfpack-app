import { useState } from "react";
import { AvatarDisplay } from "../../../components/AvatarDisplay";
import { HABIT_TYPES, blankHabit, winterArcTemplate } from "../../../lib/habits";

const bebas = {fontFamily:"'Bebas Neue',cursive",letterSpacing:2};
const section = {marginTop:18,paddingTop:14,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:10};
const small = {fontSize:12,color:"var(--muted)"};

function Field({label,children,hint}){
  return(
    <label style={{display:"flex",flexDirection:"column",gap:4,flex:1,minWidth:0}}>
      <span style={small}>{label}</span>
      {children}
      {hint&&<span style={{...small,fontSize:11}}>{hint}</span>}
    </label>
  );
}
const num = v => (v===""?"":Number(v));

// ── HABIT BUILDER ─────────────────────────────────────────────────────────────
// existing: edit that challenge. Otherwise start from the Winter Arc template or blank.
export function HabitBuilder({existing,members,profiles,currentUser,today,onSave,onDelete,onClose}){
  const [step,setStep]=useState(existing?"edit":"pick");
  const [c,setC]=useState(()=>existing?structuredClone(existing):null);
  const [who,setWho]=useState(()=>existing?Object.keys(existing.participants||{}):[...members]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);

  const start=tpl=>{
    setC(tpl==="winter"?winterArcTemplate(today):{name:"",emoji:"🔥",start:today,end:"",penaltyStart:today,graceDays:1,passesPerWeek:1,money:{buyIn:0,missFee:5,payoutPct:90},habits:[]});
    setStep("edit");
  };
  const up=patch=>setC(x=>({...x,...patch}));
  const upMoney=patch=>setC(x=>({...x,money:{...x.money,...patch}}));
  const upHabit=(i,patch)=>setC(x=>({...x,habits:x.habits.map((h,j)=>j===i?{...h,...patch}:h)}));

  const save=async()=>{
    if(!c.name.trim())return setError("Give the challenge a name.");
    if(!c.start||!c.end||c.end<c.start)return setError("Pick a start date and an end date after it.");
    if(c.penaltyStart<c.start||c.penaltyStart>c.end)return setError("Penalties must start between the start and end dates.");
    if(!c.habits.length)return setError("Add at least one habit.");
    if(c.habits.some(h=>!h.label.trim()))return setError("Every habit needs a name.");
    if(!who.length)return setError("Pick who's in.");
    setBusy(true);
    const prev=existing?.participants||{};
    const participants=Object.fromEntries(who.map(u=>[u,prev[u]||{joinedAt:c.start<=today?c.start:today}]));
    const removed=Object.keys(prev).filter(u=>!who.includes(u));
    await onSave({...c,name:c.name.trim(),participants},removed);
    setBusy(false);onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{...bebas,fontSize:22,letterSpacing:3,marginBottom:12}}>{existing?"EDIT CHALLENGE":"NEW HABIT CHALLENGE"}</div>

        {step==="pick"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>start("winter")} style={{textAlign:"left",padding:14,background:"var(--bg3)",border:"1px solid var(--accent)",borderRadius:14,cursor:"pointer",color:"var(--text)"}}>
            <div style={{...bebas,fontSize:18}}>❄️ Winter Arc</div>
            <div style={{...small,marginTop:4,lineHeight:1.5}}>Read 3×/week · Workout daily (3 strength, 4 cardio or 20-min activity) · Screen time under 1 hour · 0.7 g protein per lb of goal weight</div>
          </button>
          <button onClick={()=>start("blank")} style={{textAlign:"left",padding:14,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:14,cursor:"pointer",color:"var(--text)"}}>
            <div style={{...bebas,fontSize:18}}>Start from scratch</div>
            <div style={{...small,marginTop:4}}>Pick your own habits and rules.</div>
          </button>
          <button className="btn-ghost" style={{width:"100%"}} onClick={onClose}>Cancel</button>
        </div>}

        {step==="edit"&&c&&<>
          <div style={{display:"flex",gap:8}}>
            <Field label="Icon"><input className="input" value={c.emoji} onChange={e=>up({emoji:e.target.value.slice(0,2)})} style={{width:56,textAlign:"center",fontSize:20,padding:8}}/></Field>
            <div style={{flex:4}}><Field label="Challenge name"><input className="input" value={c.name} onChange={e=>up({name:e.target.value})} maxLength={30} placeholder="Winter Arc"/></Field></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <Field label="Starts"><input className="input" type="date" value={c.start} onChange={e=>up({start:e.target.value})}/></Field>
            <Field label="Ends"><input className="input" type="date" value={c.end} onChange={e=>up({end:e.target.value})}/></Field>
          </div>
          <div style={{marginTop:10}}>
            <Field label="Penalties start" hint="Before this date it's a trial: everything is tracked, nobody is charged.">
              <input className="input" type="date" value={c.penaltyStart} onChange={e=>up({penaltyStart:e.target.value})}/>
            </Field>
          </div>

          <div style={section}>
            <div style={{...bebas,fontSize:15,color:"var(--accent2)"}}>HABITS</div>
            {c.habits.map((h,i)=>(
              <div key={h.id} style={{padding:10,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input className="input" value={h.icon} onChange={e=>upHabit(i,{icon:e.target.value.slice(0,2)})} aria-label="Habit icon" style={{width:46,textAlign:"center",padding:8}}/>
                  <input className="input" value={h.label} onChange={e=>upHabit(i,{label:e.target.value})} placeholder="Habit name" aria-label="Habit name" style={{flex:1,padding:8}}/>
                  <button onClick={()=>setC(x=>({...x,habits:x.habits.filter((_,j)=>j!==i)}))} aria-label={`Remove ${h.label||"habit"}`} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:"0 4px"}}>✕</button>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
                  {(h.type==="check"||h.type==="workout")&&<Field label="Times per week"><input className="input" type="number" min={1} max={7} value={h.target} onChange={e=>upHabit(i,{target:num(e.target.value)})} style={{padding:8}}/></Field>}
                  {h.type==="workout"&&<Field label="Counts">
                    <select className="input" value={h.filter} onChange={e=>upHabit(i,{filter:e.target.value})} style={{padding:8}}>
                      <option value="any">Any workout</option><option value="strength">Strength (weights)</option><option value="cardio">Cardio or activity</option>
                    </select></Field>}
                  {h.type==="workout"&&h.filter==="cardio"&&<Field label="Activity min."><input className="input" type="number" value={h.minMinutes??20} onChange={e=>upHabit(i,{minMinutes:num(e.target.value)})} style={{padding:8}}/></Field>}
                  {(h.type==="max"||h.type==="min")&&<>
                    <Field label={h.type==="max"?"Daily limit":"Daily minimum"}><input className="input" type="number" value={h.target} onChange={e=>upHabit(i,{target:num(e.target.value)})} style={{padding:8}}/></Field>
                    <Field label="Unit"><input className="input" value={h.unit||""} onChange={e=>upHabit(i,{unit:e.target.value.slice(0,8)})} placeholder="min" style={{padding:8}}/></Field>
                  </>}
                  {h.type==="protein"&&<Field label="Grams per lb of goal weight" hint="Each person enters their own goal weight."><input className="input" type="number" step="0.1" value={h.perLb} onChange={e=>upHabit(i,{perLb:num(e.target.value)})} style={{padding:8}}/></Field>}
                </div>
                <div style={{...small,fontSize:11}}>{HABIT_TYPES[h.type].label}{h.type==="workout"?": filled in from logged workouts":""}</div>
              </div>
            ))}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {Object.entries(HABIT_TYPES).map(([t,v])=>(
                <button key={t} className="btn-ghost" style={{fontSize:12,padding:"8px 10px"}} onClick={()=>setC(x=>({...x,habits:[...x.habits,blankHabit(t)]}))}>+ {v.label}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <Field label="Grace days per week" hint="Misses allowed on daily habits."><input className="input" type="number" min={0} max={6} value={c.graceDays} onChange={e=>up({graceDays:num(e.target.value)})}/></Field>
              <Field label="Passes per week" hint="Sick or traveling days."><input className="input" type="number" min={0} max={7} value={c.passesPerWeek} onChange={e=>up({passesPerWeek:num(e.target.value)})}/></Field>
            </div>
          </div>

          <div style={section}>
            <div style={{...bebas,fontSize:15,color:"var(--accent2)"}}>MONEY</div>
            <div style={{display:"flex",gap:8}}>
              <Field label="Buy-in ($)"><input className="input" type="number" min={0} value={c.money.buyIn} onChange={e=>upMoney({buyIn:num(e.target.value)})}/></Field>
              <Field label="Per missed habit ($)"><input className="input" type="number" min={0} value={c.money.missFee} onChange={e=>upMoney({missFee:num(e.target.value)})}/></Field>
            </div>
            <Field label="Finishers split the pot at (%)" hint="Everyone who completes at least this share of their weekly habits splits the pot.">
              <input className="input" type="number" min={0} max={100} value={c.money.payoutPct} onChange={e=>upMoney({payoutPct:num(e.target.value)})}/>
            </Field>
            <div style={small}>Each habit missed in a week adds ${c.money.missFee||0} to the pot. The app keeps the ledger; pay each other through Venmo or Cash App.</div>
          </div>

          <div style={section}>
            <div style={{...bebas,fontSize:15,color:"var(--accent2)"}}>WHO'S IN</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {members.map(m=>{const on=who.includes(m);return(
                <button key={m} onClick={()=>setWho(w=>on?w.filter(x=>x!==m):[...w,m])} aria-pressed={on} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px 6px 6px",borderRadius:20,cursor:"pointer",background:on?"rgba(124,92,191,0.2)":"var(--bg3)",border:on?"1px solid var(--accent)":"1px solid var(--border)",color:on?"var(--text)":"var(--muted)"}}>
                  <AvatarDisplay profile={profiles[m]} size={24}/><span style={{fontSize:13}}>{m}</span>
                </button>);})}
            </div>
            <div style={small}>Anyone left out can still join from the challenge card.</div>
          </div>

          {error&&<div style={{color:"var(--red)",fontSize:13,marginTop:12}}>{error}</div>}
          <button className="btn-primary" style={{marginTop:14}} onClick={save} disabled={busy}>{busy?"SAVING...":existing?"SAVE CHANGES":"START CHALLENGE"}</button>
          <button className="btn-ghost" style={{width:"100%",marginTop:8}} onClick={onClose}>Cancel</button>
          {existing&&(confirmDelete
            ?<div style={{marginTop:12,padding:12,background:"rgba(231,76,60,0.08)",borderRadius:12,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:13}}>Delete {existing.name}? Everyone's check-ins for it are lost.</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={async()=>{await onDelete(existing.id);onClose();}} style={{flex:1,padding:10,background:"var(--red)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",...bebas}}>DELETE</button>
                <button className="btn-ghost" style={{flex:1}} onClick={()=>setConfirmDelete(false)}>Keep it</button>
              </div>
            </div>
            :<button onClick={()=>setConfirmDelete(true)} style={{width:"100%",marginTop:8,background:"none",border:"none",color:"var(--red)",fontSize:13,cursor:"pointer",padding:8}}>Delete challenge</button>)}
          {existing&&existing.createdBy!==currentUser&&<div style={{...small,marginTop:6,textAlign:"center"}}>Created by {existing.createdBy}</div>}
        </>}
      </div>
    </div>
  );
}
