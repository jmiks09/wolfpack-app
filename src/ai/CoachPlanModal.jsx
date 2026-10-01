import { useEffect, useState } from "react";
import { aiGenerateNutritionPlan, fsSet } from "../firebase";
import { AI_ACTIVITY_LEVELS, AI_BULK_CUT, AI_DIETS, AI_GENDERS, AI_GOALS } from "../lib/aiConfig";

// ── AI COACH — nutrition plan modal (results) ───────────────────────────────
export function CoachPlanModal({currentUser, profile, coach, onPlanGenerated, onDeletePlan, onClose, onOpenScanner}){
  const [step,setStep]=useState(()=>{
    if(!coach.stats)return "setup"; // no stats yet — go straight to setup
    if(coach.lastPlan)return "result";
    return "loading";
  });
  const [plan,setPlan]=useState(coach.lastPlan||null);
  const [error,setError]=useState(null);
  // Inline stats editing
  const stats=coach.stats||{};
  const [age,setAge]=useState(stats.age||"");
  const [feet,setFeet]=useState(stats.feet||"");
  const [inches,setInches]=useState(stats.inches||"");
  const [weight,setWeight]=useState(stats.weight||"");
  const [gender,setGender]=useState(stats.gender||"");
  const [bulkCut,setBulkCut]=useState(stats.bulkCut||"");
  const [activity,setActivity]=useState(stats.activity||"");
  const [diet,setDiet]=useState(stats.diet||"No restrictions");
  const [showStats,setShowStats]=useState(false);

  const canSave=age&&feet&&weight&&gender&&bulkCut&&activity;

  const saveStats=async()=>{
    const newStats={age:Number(age),feet:Number(feet),inches:Number(inches)||0,heightInches:Number(feet)*12+(Number(inches)||0),weight:Number(weight),gender,bulkCut,activity,diet};
    const p=profile;
    const updated={...p,aiTrainer:{...(p?.aiTrainer||{}),coach:{...(p?.aiTrainer?.coach||{}),stats:newStats,enabled:true}}};
    await fsSet("wolfpack/profiles",{users:{...{[currentUser]:updated}}});
    setShowStats(false);
    generate(newStats);
  };

  const generate=async(overrideStats)=>{
    setStep("loading");setError(null);
    const s=overrideStats||coach.stats||{};
    const goalLabel=AI_GOALS.find(g=>g.id===profile?.aiTrainer?.goal)?.label||"General Fitness";
    const result=await aiGenerateNutritionPlan({userName:currentUser,age:s.age,heightInches:s.heightInches,weightLbs:s.weight,gender:s.gender,bulkCut:s.bulkCut,activityLevel:s.activity,dietaryRestrictions:s.diet,goal:goalLabel});
    if(result.ok){setPlan(result.plan);setStep("result");if(onPlanGenerated)await onPlanGenerated(result.plan);}
    else{setError(result.error);setStep("error");}
  };

  useEffect(()=>{if(step==="loading"&&!coach.stats)setStep("setup");else if(step==="loading")generate();},[]);

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1100}}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>

        {/* ── SETUP — no stats yet ── */}
        {step==="setup"&&(
          <>
            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:28,marginBottom:6}}>🥩</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3}}>NUTRITION PLAN</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Enter your stats to get a personalized calorie and macro plan.</div>
            </div>
            {renderStatsForm()}
            <button className="btn-primary" onClick={saveStats} disabled={!canSave} style={{width:"100%",marginTop:4}}>GET MY PLAN →</button>
            <button className="btn-ghost" onClick={onClose} style={{width:"100%",marginTop:8}}>Cancel</button>
          </>
        )}

        {/* ── LOADING ── */}
        {step==="loading"&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:48,marginBottom:14,animation:"spin 2s linear infinite",display:"inline-block"}}>🥩</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,marginBottom:6}}>BUILDING YOUR PLAN</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Calculating calories, macros, and supplement fit...</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── ERROR ── */}
        {step==="error"&&(
          <div style={{textAlign:"center",padding:"30px 20px"}}>
            <div style={{fontSize:36,marginBottom:10}}>😬</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2,marginBottom:8}}>SOMETHING WENT WRONG</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>{error}</div>
            <button className="btn-primary" onClick={()=>generate()} style={{maxWidth:200,margin:"0 auto"}}>TRY AGAIN</button>
          </div>
        )}

        {/* ── RESULT ── */}
        {step==="result"&&plan&&(
          <>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
              <div style={{fontSize:24}}>🥩</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,lineHeight:1.1}}>YOUR NUTRITION PLAN</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                  {coach.stats?.bulkCut?.toUpperCase()} mode · {coach.stats?.activity} · {coach.stats?.weight}lbs
                </div>
              </div>
            </div>

            {/* ── STATS SUMMARY — tap to edit ── */}
            <button onClick={()=>setShowStats(s=>!s)} style={{width:"100%",padding:"8px 12px",marginBottom:10,borderRadius:10,cursor:"pointer",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:11,color:"var(--muted)"}}>
                {coach.stats?.age}y · {coach.stats?.feet}'{coach.stats?.inches}" · {coach.stats?.weight}lbs · {coach.stats?.activity} · {coach.stats?.diet||"No restrictions"}
              </div>
              <span style={{fontSize:11,color:"var(--accent2)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,flexShrink:0,marginLeft:8}}>{showStats?"CLOSE":"✏️ EDIT STATS"}</span>
            </button>

            {/* Inline stats editor */}
            {showStats&&(
              <div style={{padding:"12px 14px",background:"rgba(124,92,191,0.06)",border:"1px solid rgba(124,92,191,0.2)",borderRadius:14,marginBottom:12}}>
                {renderStatsForm()}
                <button className="btn-primary" onClick={saveStats} disabled={!canSave} style={{width:"100%",marginTop:4}}>
                  SAVE & REGENERATE
                </button>
              </div>
            )}

            {plan.explanation&&(
              <div style={{padding:"10px 12px",marginBottom:12,background:"rgba(124,92,191,0.08)",border:"1px solid rgba(124,92,191,0.2)",borderRadius:10,fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.5,fontStyle:"italic"}}>
                💭 {plan.explanation}
              </div>
            )}

            {/* Calorie card */}
            <div style={{padding:"14px",marginBottom:10,background:"linear-gradient(135deg,rgba(255,107,53,0.1),rgba(124,92,191,0.06))",border:"1px solid rgba(255,107,53,0.3)",borderRadius:14,textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--muted)",marginBottom:2}}>DAILY TARGET</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:2,color:"var(--orange)",lineHeight:1}}>{plan.calorieTarget?.toLocaleString()}</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>calories per day {plan.tdee&&`· TDEE: ${plan.tdee.toLocaleString()}`}</div>
            </div>

            {/* Macro cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{padding:"10px 8px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--muted)"}}>Protein</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#ef4444"}}>{plan.macros?.proteinGrams}g</div>
              </div>
              <div style={{padding:"10px 8px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--muted)"}}>Carbs</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#f59e0b"}}>{plan.macros?.carbsGrams}g</div>
              </div>
              <div style={{padding:"10px 8px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--muted)"}}>Fat</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#a78bfa"}}>{plan.macros?.fatGrams}g</div>
              </div>
            </div>

            {plan.mealTiming&&(
              <div style={{padding:"10px 12px",marginBottom:14,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:10,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>⏰ MEAL TIMING</div>
                {plan.mealTiming}
              </div>
            )}

            {plan.supplements?.length>0&&(
              <>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>💊 SUPPLEMENT SUGGESTIONS</div>
                {plan.supplements.map((s,i)=>(
                  <div key={i} style={{marginBottom:8,padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1.5,color:"#fff"}}>{s.name}</div>
                      {s.priority==="high"&&<span style={{fontSize:10,padding:"2px 8px",background:"rgba(46,204,113,0.15)",border:"1px solid var(--green)",borderRadius:10,color:"var(--green)"}}>RECOMMENDED</span>}
                    </div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",marginBottom:4,lineHeight:1.5}}>{s.why}</div>
                    {s.typicalUse&&<div style={{fontSize:11,color:"var(--muted)",fontStyle:"italic"}}>Typical use: {s.typicalUse}</div>}
                  </div>
                ))}
              </>
            )}

            <div style={{padding:"10px 12px",marginTop:12,marginBottom:12,background:"rgba(231,76,60,0.05)",border:"1px solid rgba(231,76,60,0.2)",borderRadius:10,fontSize:10,color:"var(--muted)",lineHeight:1.5,textAlign:"center"}}>
              ⚠️ Informational only — not medical advice. Consult a healthcare provider before starting any supplement or significant diet change.
            </div>

            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <button className="btn-primary" onClick={()=>generate()} style={{flex:1}}>🔄 REGENERATE</button>
              <button className="btn-ghost" onClick={onClose} style={{flex:1}}>CLOSE</button>
            </div>
            {onOpenScanner&&(
              <button onClick={onOpenScanner} style={{width:"100%",marginBottom:8,padding:"10px",borderRadius:12,cursor:"pointer",background:"rgba(255,107,53,0.08)",border:"1px solid rgba(255,107,53,0.2)",color:"#ff6b35",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1.5}}>
                📷 SCAN A MEAL
              </button>
            )}
            {onDeletePlan&&(
              <button onClick={onDeletePlan} style={{width:"100%",padding:"9px",borderRadius:10,cursor:"pointer",background:"transparent",border:"none",color:"rgba(255,255,255,0.2)",fontSize:11}}>
                Delete nutrition plan
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  function renderStatsForm(){
    return(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Age</div>
            <input className="input" type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 28" style={{padding:10}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Weight (lbs)</div>
            <input className="input" type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 175" style={{padding:10}}/>
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Height</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><input className="input" type="number" value={feet} onChange={e=>setFeet(e.target.value)} placeholder="5" style={{padding:10}}/><span style={{fontSize:12,color:"var(--muted)"}}>ft</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><input className="input" type="number" value={inches} onChange={e=>setInches(e.target.value)} placeholder="10" style={{padding:10}}/><span style={{fontSize:12,color:"var(--muted)"}}>in</span></div>
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Gender</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {AI_GENDERS.map(g=>{const sel=gender===g.id;return(<button key={g.id} onClick={()=>setGender(g.id)} style={{padding:"7px 12px",borderRadius:20,cursor:"pointer",fontSize:12,background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)",color:sel?"var(--accent2)":"var(--muted)"}}>{g.label}</button>);})}</div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Goal Mode</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {AI_BULK_CUT.map(b=>{const sel=bulkCut===b.id;return(<button key={b.id} onClick={()=>setBulkCut(b.id)} style={{padding:"8px 6px",borderRadius:12,cursor:"pointer",textAlign:"center",background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)"}}><div style={{fontSize:16,marginBottom:2}}>{b.icon}</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:10,letterSpacing:1.5,color:sel?"var(--accent2)":"#fff"}}>{b.label}</div></button>);})}</div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Activity Level</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {AI_ACTIVITY_LEVELS.map(a=>{const sel=activity===a.id;return(<button key={a.id} onClick={()=>setActivity(a.id)} style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)"}}><div style={{fontSize:12,color:sel?"var(--accent2)":"#fff",marginBottom:1}}>{a.label}</div><div style={{fontSize:10,color:"var(--muted)"}}>{a.desc}</div></button>);})}</div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Dietary Restrictions</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {AI_DIETS.map(d=>{const sel=diet===d;return(<button key={d} onClick={()=>setDiet(d)} style={{padding:"5px 10px",borderRadius:20,cursor:"pointer",fontSize:11,background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)",color:sel?"var(--accent2)":"var(--muted)"}}>{d}</button>);})}
          </div>
        </div>
      </div>
    );
  }
}
