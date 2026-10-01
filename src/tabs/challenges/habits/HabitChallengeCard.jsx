import { useState } from "react";
import { AvatarDisplay } from "../../../components/AvatarDisplay";
import { challengeWeeks, countsForPenalty, penaltyMode, scoreChallenge, scoreHabitWeek } from "../../../lib/habits";
import { chipColor, chipText } from "./habitUi";

const bebas = {fontFamily:"'Bebas Neue',cursive",letterSpacing:2};
const md = d => new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
const money = n => `$${Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2})}`;

// ── HABIT CHALLENGE CARD ──────────────────────────────────────────────────────
export function HabitChallengeCard({challenge:ch,log,history,profiles,currentUser,isAdmin,today,onEdit,onJoin,onLeave,onRecordPayment}){
  const weeks=challengeWeeks(ch);
  const current=weeks.findIndex(w=>w.from<=today&&today<=w.to);
  const lastIdx=current>=0?current:(today>ch.end?weeks.length-1:0);
  const [wi,setWi]=useState(lastIdx);
  const [tab,setTab]=useState("week");
  const [payFor,setPayFor]=useState(null);
  const [amount,setAmount]=useState("");
  const [confirmLeave,setConfirmLeave]=useState(false);

  const started=today>=ch.start;
  const s=scoreChallenge(ch,log,history,today);
  const inIt=!!ch.participants?.[currentUser]&&!ch.participants[currentUser].leftAt;
  const canManage=isAdmin||ch.createdBy===currentUser;
  const week=weeks[wi];
  const weekRows=s.scores.filter(m=>!m.left).map(m=>({m,row:m.rows[wi]})).filter(x=>x.row)
    .sort((a,b)=>(a.m.user===currentUser?-1:b.m.user===currentUser?1:0)||(a.row.missed-b.row.missed)||a.m.user.localeCompare(b.m.user));

  const flat=penaltyMode(ch)==="flat";
  const flatLabel=ch.money?.flatLabel||"Penalty";
  const penaltyHabits=ch.habits.filter(countsForPenalty);
  const penaltyLine=flat?`${flatLabel} ($${ch.money?.flatAmount||0}) if you miss a penalty habit`:`$${ch.money?.missFee||0} per missed penalty habit`;
  const feeText=fee=>flat?flatLabel:money(fee);
  const visiblePersonal=user=>Object.values(log?.byUser?.[user]?.personal||{})
    .filter(g=>user===currentUser||g.shared).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const status=s.finished?"Finished":!started?`Starts ${md(ch.start)}`:s.inTrial?`Trial: no penalties until ${md(ch.penaltyStart)}`:"Penalties active";

  return(
    <div style={{marginBottom:16,padding:14,background:"var(--bg3)",border:"1px solid var(--accent)",borderRadius:16}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
        <div style={{minWidth:0}}>
          <div style={{...bebas,fontSize:22}}>{ch.emoji} {ch.name}</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>{md(ch.start)} – {md(ch.end)} · {status}</div>
        </div>
        {canManage&&<button onClick={onEdit} aria-label="Edit challenge" style={{background:"none",border:"1px solid var(--border)",borderRadius:10,padding:"6px 8px",cursor:"pointer",color:"var(--muted)"}}>✏️</button>}
      </div>

      <div style={{display:"flex",gap:8,marginTop:12}}>
        <div style={{flex:1,padding:"10px 12px",background:"var(--bg2)",borderRadius:12}}>
          <div style={{fontSize:11,color:"var(--muted)"}}>Pot</div>
          <div style={{...bebas,fontSize:24,color:"var(--accent2)"}}>{money(s.pot)}</div>
        </div>
        <div style={{flex:1,padding:"10px 12px",background:"var(--bg2)",borderRadius:12}}>
          <div style={{fontSize:11,color:"var(--muted)"}}>Each finisher gets (now)</div>
          <div style={{...bebas,fontSize:24}}>{money(s.payoutEach)}</div>
          <div style={{fontSize:10,color:"var(--muted)"}}>{s.onTrack.length} at {s.threshold}%+</div>
        </div>
      </div>

      {!inIt&&!s.finished&&<button className="btn-primary" style={{marginTop:12}} onClick={onJoin}>JOIN {ch.name.toUpperCase()}</button>}

      <div style={{display:"flex",gap:6,marginTop:14}}>
        {[["week","This week"],["season","Season"],["money","Money"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"8px 4px",borderRadius:10,cursor:"pointer",...bebas,fontSize:13,background:tab===id?"rgba(124,92,191,0.2)":"var(--bg2)",border:tab===id?"1px solid var(--accent)":"1px solid var(--border)",color:tab===id?"var(--accent2)":"var(--muted)"}}>{l}</button>
        ))}
      </div>

      {tab==="week"&&week&&<div style={{marginTop:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <button aria-label="Previous week" disabled={wi<=0} onClick={()=>setWi(wi-1)} style={{background:"none",border:"none",color:wi<=0?"var(--border)":"var(--text)",fontSize:20,cursor:"pointer"}}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{...bebas,fontSize:15}}>Week {wi+1} · {md(week.from)}–{md(week.to)}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{week.from<ch.penaltyStart?"Trial week, no charges":penaltyLine}{wi===current?" · in progress":""}</div>
          </div>
          <button aria-label="Next week" disabled={wi>=lastIdx} onClick={()=>setWi(wi+1)} style={{background:"none",border:"none",color:wi>=lastIdx?"var(--border)":"var(--text)",fontSize:20,cursor:"pointer"}}>›</button>
        </div>
        {!started?<div style={{fontSize:13,color:"var(--muted)",textAlign:"center",padding:12}}>Nothing to show until {md(ch.start)}.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {weekRows.map(({m,row})=>(
            <div key={m.user} style={{padding:10,background:"var(--bg2)",borderRadius:12,border:m.user===currentUser?"1px solid var(--accent)":"1px solid transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <AvatarDisplay profile={profiles[m.user]} size={28}/>
                <div style={{flex:1,...bebas,fontSize:16}}>{m.user}</div>
                {!row.counted?<span style={{fontSize:11,color:"var(--muted)"}}>Joined mid-week</span>
                  :row.finished?(row.missed===0?<span style={{...bebas,fontSize:14,color:"var(--green)"}}>PERFECT WEEK</span>
                    :<span style={{...bebas,fontSize:14,color:row.fee?"var(--red)":"var(--muted)"}}>{row.missed} missed{row.fee?` · ${feeText(row.fee)}`:""}</span>)
                  :null}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {ch.habits.map(h=>{const hs=row.habits[h.id];const c=chipColor(hs);return(
                  <span key={h.id} title={h.label} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:20,fontSize:12,background:c.bg,border:`1px solid ${c.bd}`,color:c.fg}}>
                    <span aria-hidden="true">{h.icon}</span><span>{chipText(h,hs)}</span><span style={{position:"absolute",left:-9999}}>{h.label}</span>
                  </span>);})}
                {visiblePersonal(m.user).map(g=>{const gs=scoreHabitWeek(ch,g,week,log?.byUser?.[m.user],history,m.user,today);const c=chipColor(gs);return(
                  <span key={g.id} title={`${g.label} (personal${g.shared?"":", only you see this"})`} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:20,fontSize:12,background:"transparent",border:`1px dashed ${c.bd}`,color:c.fg}}>
                    <span aria-hidden="true">{g.icon}</span><span>{chipText(g,gs)}</span>{!g.shared&&<span aria-label="private" style={{fontSize:10}}>🔒</span>}
                  </span>);})}
              </div>
            </div>
          ))}
        </div>}
        <div style={{fontSize:11,color:"var(--muted)",marginTop:8,lineHeight:1.5}}>
          {ch.habits.map(h=>`${h.icon} ${h.label}`).join("  ·  ")}. Daily habits allow {ch.graceDays??1} miss{(ch.graceDays??1)===1?"":"es"} a week.
          {penaltyHabits.length<ch.habits.length&&<> Penalty applies to {penaltyHabits.map(h=>`${h.icon} ${h.label}`).join(", ")}; the rest count toward completion only.</>}
          {" "}Dashed chips are personal goals and don't affect money.
        </div>
      </div>}

      {tab==="season"&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
        {[...s.scores].filter(m=>!m.left).sort((a,b)=>(b.completion??-1)-(a.completion??-1)).map((m,i)=>(
          <div key={m.user} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"var(--bg2)",borderRadius:12}}>
            <div style={{...bebas,fontSize:16,width:18,color:"var(--muted)"}}>{i+1}</div>
            <AvatarDisplay profile={profiles[m.user]} size={28}/>
            <div style={{flex:1,...bebas,fontSize:16}}>{m.user}</div>
            <div style={{textAlign:"right"}}>
              <div style={{...bebas,fontSize:16,color:m.completion==null?"var(--muted)":m.completion>=s.threshold?"var(--green)":"var(--red)"}}>{m.completion==null?"—":`${m.completion}%`}</div>
              <div style={{fontSize:10,color:"var(--muted)"}}>{m.rows.filter(r=>r.finished&&r.counted&&r.missed===0).length} perfect weeks</div>
            </div>
          </div>
        ))}
        <div style={{fontSize:11,color:"var(--muted)"}}>Completion counts finished weeks only, including trial weeks.</div>
      </div>}

      {tab==="money"&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{display:"flex",fontSize:11,color:"var(--muted)",padding:"0 10px"}}><div style={{flex:1}}>Member</div><div style={{width:60,textAlign:"right"}}>Owes</div><div style={{width:60,textAlign:"right"}}>Paid</div><div style={{width:64,textAlign:"right"}}>Balance</div></div>
        {s.scores.map(m=>(
          <div key={m.user} style={{padding:"8px 10px",background:"var(--bg2)",borderRadius:12}}>
            <div style={{display:"flex",alignItems:"center",fontSize:13}}>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}><AvatarDisplay profile={profiles[m.user]} size={24}/>{m.user}{m.left&&<span style={{fontSize:10,color:"var(--muted)"}}>left</span>}</div>
              <div style={{width:60,textAlign:"right"}}>{money(m.owed)}</div>
              <div style={{width:60,textAlign:"right",color:"var(--muted)"}}>{money(m.paid)}</div>
              <div style={{width:64,textAlign:"right",...bebas,fontSize:15,color:m.balance>0?"var(--red)":"var(--green)"}}>{m.balance>0?money(m.balance):"✓"}</div>
            </div>
            {canManage&&(payFor===m.user
              ?<div style={{display:"flex",gap:6,marginTop:8}}>
                <input className="input" type="number" inputMode="decimal" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} style={{flex:1,padding:8}} autoFocus/>
                <button className="btn-primary" style={{width:"auto",padding:"0 12px"}} disabled={!Number(amount)} onClick={async()=>{await onRecordPayment(m.user,Number(amount));setPayFor(null);setAmount("");}}>SAVE</button>
                <button className="btn-ghost" style={{padding:"0 10px"}} onClick={()=>setPayFor(null)}>✕</button>
              </div>
              :<button onClick={()=>{setPayFor(m.user);setAmount(m.balance>0?String(m.balance):"");}} style={{marginTop:4,background:"none",border:"none",color:"var(--accent2)",fontSize:12,cursor:"pointer",padding:0}}>Record a payment</button>)}
          </div>
        ))}
        <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>Owes = ${ch.money?.buyIn||0} buy-in + {flat?`one ${flatLabel} ($${ch.money?.flatAmount||0}) per week with a missed penalty habit`:"missed-habit fees"}. Pay through Venmo or Cash App; {canManage?"you record":"the challenge creator records"} payments here.</div>
      </div>}

      {inIt&&!s.finished&&(confirmLeave
        ?<div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1,fontSize:12}}>Leave {ch.name}? Your buy-in and fees stay on the ledger.</div>
          <button onClick={onLeave} style={{padding:"8px 12px",background:"var(--red)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",...bebas}}>LEAVE</button>
          <button className="btn-ghost" style={{padding:"8px 10px"}} onClick={()=>setConfirmLeave(false)}>Stay</button>
        </div>
        :<button onClick={()=>setConfirmLeave(true)} style={{display:"block",margin:"12px auto 0",background:"none",border:"none",color:"var(--muted)",fontSize:12,cursor:"pointer"}}>Leave challenge</button>)}
    </div>
  );
}
