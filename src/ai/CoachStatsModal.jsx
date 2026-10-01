import { useState } from "react";
import { AI_ACTIVITY_LEVELS, AI_BULK_CUT, AI_DIETS, AI_GENDERS } from "../lib/aiConfig";

// ── AI COACH — stats input modal ────────────────────────────────────────────
export function CoachStatsModal({coach, onSave, onClose}){
  const stats=coach.stats||{};
  const [age,setAge]=useState(stats.age||"");
  const [feet,setFeet]=useState(stats.feet||"");
  const [inches,setInches]=useState(stats.inches||"");
  const [weight,setWeight]=useState(stats.weight||"");
  const [gender,setGender]=useState(stats.gender||"");
  const [bulkCut,setBulkCut]=useState(stats.bulkCut||"");
  const [activity,setActivity]=useState(stats.activity||"");
  const [diet,setDiet]=useState(stats.diet||"No restrictions");

  const canSave=age&&feet&&weight&&gender&&bulkCut&&activity;

  const save=()=>{
    onSave({
      age:Number(age),
      feet:Number(feet),
      inches:Number(inches)||0,
      heightInches:Number(feet)*12+(Number(inches)||0),
      weight:Number(weight),
      gender,
      bulkCut,
      activity,
      diet,
    });
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1100}}>
      <div className="modal" style={{maxHeight:"90dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:4}}>YOUR STATS</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>Used only to personalize your nutrition plan. Saved to your profile, never shared with the pack.</div>

        {/* Age + Weight */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Age</div>
            <input className="input" type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 28" style={{padding:10}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Weight (lbs)</div>
            <input className="input" type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 175" style={{padding:10}}/>
          </div>
        </div>

        {/* Height */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Height</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input className="input" type="number" value={feet} onChange={e=>setFeet(e.target.value)} placeholder="5" style={{padding:10}}/>
              <span style={{fontSize:12,color:"var(--muted)"}}>ft</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input className="input" type="number" value={inches} onChange={e=>setInches(e.target.value)} placeholder="10" style={{padding:10}}/>
              <span style={{fontSize:12,color:"var(--muted)"}}>in</span>
            </div>
          </div>
        </div>

        {/* Gender */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Gender (for calorie math)</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {AI_GENDERS.map(g=>{
              const sel=gender===g.id;
              return(
                <button key={g.id} onClick={()=>setGender(g.id)} style={{
                  padding:"8px 14px",borderRadius:20,cursor:"pointer",fontSize:12,
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                  color:sel?"var(--accent2)":"var(--muted)",
                }}>{g.label}</button>
              );
            })}
          </div>
        </div>

        {/* Bulk/Cut/Maintain */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Goal Mode</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {AI_BULK_CUT.map(b=>{
              const sel=bulkCut===b.id;
              return(
                <button key={b.id} onClick={()=>setBulkCut(b.id)} style={{
                  padding:"10px 6px",borderRadius:12,cursor:"pointer",textAlign:"center",
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                }}>
                  <div style={{fontSize:18,marginBottom:2}}>{b.icon}</div>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:sel?"var(--accent2)":"#fff"}}>{b.label}</div>
                  <div style={{fontSize:9,color:"var(--muted)",marginTop:2,lineHeight:1.3}}>{b.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Level */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Activity Level</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {AI_ACTIVITY_LEVELS.map(a=>{
              const sel=activity===a.id;
              return(
                <button key={a.id} onClick={()=>setActivity(a.id)} style={{
                  padding:"10px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                  background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                }}>
                  <div style={{fontSize:12,color:sel?"var(--accent2)":"#fff",marginBottom:2}}>{a.label}</div>
                  <div style={{fontSize:10,color:"var(--muted)"}}>{a.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diet */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Dietary Restrictions</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {AI_DIETS.map(d=>{
              const sel=diet===d;
              return(
                <button key={d} onClick={()=>setDiet(d)} style={{
                  padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:11,
                  background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",
                  border:sel?"1px solid var(--accent)":"1px solid var(--border)",
                  color:sel?"var(--accent2)":"var(--muted)",
                }}>{d}</button>
              );
            })}
          </div>
        </div>

        <button className="btn-primary" onClick={save} disabled={!canSave}>SAVE STATS</button>
        <div style={{textAlign:"center",fontSize:10,color:"var(--muted)",marginTop:8,fontStyle:"italic"}}>
          Informational only — not medical advice
        </div>
      </div>
    </div>
  );
}
