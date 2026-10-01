import { useState } from "react";
import { AI_EQUIPMENT_PRESETS, AI_GOALS, AI_SECONDARY_GOALS } from "../lib/aiConfig";
import { DAYS_PER_WEEK_OPTIONS } from "../lib/constants";

// ── AI TRAINER — profile settings tab ───────────────────────────────────────
export function AITrainerProfileTab({currentUser, profile, profiles, onSaveProfile}){
  const cur=profile?.aiTrainer||{};
  const [goal,setGoal]=useState(cur.goal||"");
  const [secondaryGoal,setSecondaryGoal]=useState(cur.secondaryGoal||"none");
  const [experience,setExperience]=useState(cur.experience||"");
  const [injuries,setInjuries]=useState(cur.injuries||[]);
  const [usualSetup,setUsualSetup]=useState(cur.usualSetup||"home");
  const [customInjury,setCustomInjury]=useState("");
  const [saved,setSaved]=useState(false);
  const [daysPerWeek,setDaysPerWeek]=useState(cur.daysPerWeek||3);

  const save=async()=>{
    const updated={...profile,aiTrainer:{...cur,goal,secondaryGoal:secondaryGoal==="none"?null:secondaryGoal,experience,injuries,usualSetup,daysPerWeek}};
    const newProfiles={...profiles,[currentUser]:updated};
    await onSaveProfile(newProfiles);
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  return(
    <div style={{padding:"0 4px"}}>
      {/* Goal */}
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🎯 PRIMARY GOAL</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {AI_GOALS.map(g=>{const sel=goal===g.id;return(
            <button key={g.id} onClick={()=>{setGoal(g.id);setSaved(false);}} style={{padding:"10px 14px",borderRadius:12,cursor:"pointer",textAlign:"left",background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20,flexShrink:0}}>{g.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:sel?"var(--accent2)":"#fff",marginBottom:1}}>{g.label}</div>
                <div style={{fontSize:10,color:"var(--muted)"}}>{g.desc}</div>
              </div>
              {sel&&<div style={{color:"var(--accent)",fontSize:14}}>✓</div>}
            </button>
          );})}
        </div>
      </div>

      {/* Secondary goal */}
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>✨ AESTHETIC PREFERENCE <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1,fontFamily:"sans-serif",textTransform:"none"}}>optional</span></div>
        <select value={secondaryGoal} onChange={e=>{setSecondaryGoal(e.target.value);setSaved(false);}} style={{width:"100%",padding:"10px 12px",borderRadius:10,background:"var(--bg3)",border:"1px solid var(--border)",color:secondaryGoal==="none"?"var(--muted)":"#fff",fontSize:13}}>
          <option value="none">No preference</option>
          {AI_SECONDARY_GOALS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        <div style={{fontSize:10,color:"var(--muted)",marginTop:4,lineHeight:1.4}}>Used to adjust emphasis only. Fat loss is always systemic — no spot reduction.</div>
      </div>

      {/* Experience */}
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>💪 EXPERIENCE LEVEL</div>
        <div style={{display:"flex",gap:8}}>
          {["beginner","intermediate","advanced"].map(lvl=>{const sel=experience===lvl;return(
            <button key={lvl} onClick={()=>{setExperience(lvl);setSaved(false);}} style={{flex:1,padding:"10px 4px",borderRadius:12,cursor:"pointer",textAlign:"center",background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)"}}>
              <div style={{fontSize:11,color:sel?"var(--accent2)":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{lvl.charAt(0).toUpperCase()+lvl.slice(1)}</div>
            </button>
          );})}
        </div>
      </div>

      {/* Days per week */}
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🗓️ TRAINING DAYS/WEEK</div>
        <div style={{display:"flex",gap:8}}>
          {DAYS_PER_WEEK_OPTIONS.map(n=>{const sel=daysPerWeek===n;return(
            <button key={n} onClick={()=>{setDaysPerWeek(n);setSaved(false);}} style={{flex:1,padding:"12px 0",borderRadius:12,cursor:"pointer",background:sel?"linear-gradient(135deg,rgba(255,107,53,0.25),rgba(124,92,191,0.2))":"var(--bg3)",border:sel?"1px solid rgba(255,107,53,0.5)":"1px solid var(--border)"}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:sel?"#ff6b35":"#fff"}}>{n}</div>
              <div style={{fontSize:9,color:"var(--muted)"}}>days</div>
            </button>
          );})}
        </div>
        <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>Used for recovery calculations — not to lock you into a schedule.</div>
      </div>

      {/* Injuries */}
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🩹 INJURIES / LIMITATIONS <span style={{fontSize:9,color:"var(--muted)",letterSpacing:1,fontFamily:"sans-serif",textTransform:"none"}}>optional</span></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
          {["Bad knees","Bad back","Shoulder injury","Wrist pain","Hip pain","Ankle issues"].map(inj=>{const sel=injuries.includes(inj);return(
            <button key={inj} onClick={()=>{setInjuries(i=>sel?i.filter(x=>x!==inj):[...i,inj]);setSaved(false);}} style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:12,background:sel?"rgba(231,76,60,0.15)":"var(--bg3)",border:sel?"1px solid rgba(231,76,60,0.4)":"1px solid var(--border)",color:sel?"var(--red)":"var(--muted)"}}>
              {sel?"✓ ":""}{inj}
            </button>
          );})}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input className="input" placeholder="Other limitation..." value={customInjury} onChange={e=>setCustomInjury(e.target.value)} style={{flex:1,padding:"8px 12px",fontSize:12}}/>
          <button onClick={()=>{if(customInjury.trim()){setInjuries(i=>[...i,customInjury.trim()]);setCustomInjury("");setSaved(false);}}} className="btn-ghost" style={{flexShrink:0,padding:"0 14px",fontSize:12}}>Add</button>
        </div>
        {injuries.filter(i=>!["Bad knees","Bad back","Shoulder injury","Wrist pain","Hip pain","Ankle issues"].includes(i)).map((inj,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginTop:6,padding:"6px 12px",background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:8}}>
            <span style={{flex:1,fontSize:12,color:"var(--red)"}}>{inj}</span>
            <button onClick={()=>setInjuries(x=>x.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16}}>×</button>
          </div>
        ))}
      </div>

      {/* Usual setup */}
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🏠 DEFAULT EQUIPMENT</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {AI_EQUIPMENT_PRESETS.map(p=>{const sel=usualSetup===p.id;return(
            <button key={p.id} onClick={()=>{setUsualSetup(p.id);setSaved(false);}} style={{padding:"10px 8px",borderRadius:12,cursor:"pointer",background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)",textAlign:"left"}}>
              <div style={{fontSize:18,marginBottom:2}}>{p.icon}</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:sel?"var(--accent2)":"#fff"}}>{p.label}</div>
            </button>
          );})}
        </div>
      </div>

      <button className="btn-primary" onClick={save} disabled={!goal||!experience} style={{width:"100%",marginBottom:8,background:saved?"var(--green)":undefined}}>
        {saved?"✓ SAVED":"SAVE AI TRAINER SETTINGS"}
      </button>
    </div>
  );
}
