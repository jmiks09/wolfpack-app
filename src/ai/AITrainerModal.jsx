import { useMemo, useState } from "react";
import { aiGenerateWorkout } from "../firebase";
import { saveActiveWorkout } from "../lib/activeWorkout";
import { AI_EQUIPMENT_PRESETS, AI_GOALS, AI_SECONDARY_GOALS, MAX_DAILY_REGENS } from "../lib/aiConfig";
import { buildEquipmentString, bumpRegenCount, getLastWorkoutForMuscle, getRecentHistoryString, getRegenCount } from "../lib/aiHelpers";
import { removeFavoriteFS } from "../lib/favorites";
import { buildPriorPerformanceString, getTrainingLog } from "../lib/trainingLog";
import { ExerciseCard } from "./ExerciseCard";
import { BodyMap } from "../components/BodyMap";
import { MUSCLES, QUICK_PICKS, availableGear, muscleKey, muscleKeyIcon, muscleKeyLabel, styleIds, styleLabelOf, styleWithin, stylesFor, targetsFromKey, toggleStyle } from "../lib/exerciseLibrary";
import { INTENSITIES, buildPlan, estimateMinutes, exerciseFromLibrary, intensityPrompt, loadSeen, mergeWithAI, musclesFor, pickSwap, recentLogged, rememberSeen, rulesSummary } from "../lib/coachPicker";

// ── AI TRAINER MODAL ────────────────────────────────────────────────────────

export function AITrainerModal({currentUser, profile, history, packHomeGym, userFavorites, onFavoritesChange, onClose, onUseWorkout, showToast}){
  const [step,setStep]=useState("home"); // home | setup | loading | result
  const [selectedPreset,setSelectedPreset]=useState(profile?.aiTrainer?.usualSetup||"home");
  const [customEquip,setCustomEquip]=useState("");
  const [savedPresets,setSavedPresets]=useState(profile?.aiTrainer?.savedPresets||[]);
  const [workout,setWorkout]=useState(null);
  const [error,setError]=useState(null);
  const [regenCount,setRegenCount]=useState(getRegenCount(currentUser));
  const [targets,setTargets]=useState([]); // picker ids, several allowed
  const muscleGroup=muscleKey(targets);     // saved id, e.g. "upper" or "biceps+shoulders"
  const setMuscleGroup=key=>setTargets(targetsFromKey(key));
  const [equipStyle,setEquipStyle]=useState(()=>{try{return localStorage.getItem(`wp_coach_style_${currentUser}`)||"any";}catch{return "any";}});
  const [shown,setShown]=useState(()=>new Set()); // everything shown this visit, so swaps keep finding new ones
  const [rules,setRules]=useState([]);
  const [planNote,setPlanNote]=useState("");
  const [intensity,setIntensity]=useState("normal");
  const [bodyGender,setBodyGender]=useState(()=>{
    try{const saved=localStorage.getItem(`wp_body_${currentUser}`);if(saved)return saved;}catch{/* ignore */}
    return profile?.aiTrainer?.coach?.stats?.gender==="female"?"female":"male";
  });
  const flipBody=()=>{const g=bodyGender==="female"?"male":"female";setBodyGender(g);try{localStorage.setItem(`wp_body_${currentUser}`,g);}catch{/* ignore */}};
  const toggleMuscle=m=>{setTargets(x=>x.includes(m)?x.filter(y=>y!==m):[...x,m]);setAiMuscleReason("");setRepeatMode(false);};
  const [aiMuscleReason,setAiMuscleReason]=useState("");
  const [numExercises,setNumExercises]=useState(5);
  const [setsPerExercise,setSetsPerExercise]=useState(4);
  const swappingIdx=null; // swaps happen instantly now
  const [customDuration,setCustomDuration]=useState(null);
  const [expandedFavGroup,setExpandedFavGroup]=useState(null);
  const [repeatMode,setRepeatMode]=useState(false); // true = repeat last workout

  const goal=profile?.aiTrainer?.goal;
  const experience=profile?.aiTrainer?.experience;
  const injuries=(profile?.aiTrainer?.injuries||[]).join(", ");
  const daysPerWeek=profile?.aiTrainer?.daysPerWeek||3;
  const goalLabel=AI_GOALS.find(g=>g.id===goal)?.label||goal||"General Fitness";
  const secondaryGoal=profile?.aiTrainer?.secondaryGoal;
  const secondaryLabel=secondaryGoal?AI_SECONDARY_GOALS.find(s=>s.id===secondaryGoal)?.label:null;
  const fullGoal=[goalLabel,secondaryLabel?`+ ${secondaryLabel}`:null].filter(Boolean).join(" ");

  // Group favorites by muscle — reads from Firestore-backed userFavorites prop
  const favsByMuscle=useMemo(()=>{
    const favs=userFavorites||[];
    const groups={};
    favs.forEach(fav=>{
      const key=muscleKeyLabel(fav.muscleGroup)||"Other";
      const icon=fav.muscleGroup?muscleKeyIcon(fav.muscleGroup):"💪";
      if(!groups[key])groups[key]={icon,favs:[]};
      groups[key].favs.push(fav);
    });
    return groups;
  },[userFavorites]);

  if(!goal||!experience){
    return(
      <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal" style={{maxHeight:"85dvh",overflowY:"auto"}}>
          <div className="modal-handle"/>
          <div style={{textAlign:"center",padding:"10px 0 16px"}}>
            <div style={{fontSize:36,marginBottom:8}}>🔥</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,marginBottom:8}}>SET UP YOUR PROFILE FIRST</div>
            <div style={{fontSize:13,color:"var(--muted)",marginBottom:18,lineHeight:1.5,padding:"0 10px"}}>WOLFMODE needs your goal and experience level. Open your profile and fill in the 🔥 WOLF tab.</div>
            <button className="btn-primary" onClick={onClose} style={{maxWidth:240,margin:"0 auto"}}>OPEN MY PROFILE</button>
          </div>
        </div>
      </div>
    );
  }

  // Location → what gear exists; style → what to use today (e.g. dumbbells only).
  const equipmentText=buildEquipmentString(selectedPreset,customEquip,packHomeGym);
  const gear=availableGear(selectedPreset,equipmentText);
  const styleOptions=stylesFor(gear);
  const activeStyle=styleWithin(equipStyle,styleOptions);
  const activeIds=styleIds(activeStyle);
  const pickStyle=id=>{const next=toggleStyle(activeStyle,id);setEquipStyle(next);try{localStorage.setItem(`wp_coach_style_${currentUser}`,next);}catch{/* ignore */}};

  // "AI pick for me": the muscle group trained least recently.
  const autoPick=()=>{
    const groups=["chest","back","legs","glutes","shoulders","arms","core"];
    const counts={};groups.forEach(g=>{counts[g]=0;});
    const lower=getRecentHistoryString(history,currentUser).toLowerCase();
    ["chest","back","shoulder","arm","core"].forEach(k=>{const g=groups.find(x=>x.startsWith(k));if(lower.includes(k))counts[g]+=2;});
    if(lower.includes("leg")||lower.includes("squat"))counts.legs+=2;if(lower.includes("glute"))counts.glutes+=2;
    const pick=groups.sort((a,b)=>(counts[a]||0)-(counts[b]||0))[0];
    return {key:pick,targets:targetsFromKey(pick)};
  };

  const generate=async(isRegen=false,forceRepeat=false)=>{
    if(isRegen&&regenCount>=MAX_DAILY_REGENS){showToast("Daily limit reached.");return;}
    setStep("loading");setError(null);setPlanNote("");
    const equipment=equipmentText;
    const trainingLog=await getTrainingLog(currentUser);
    const muscleLabel=muscleGroup?muscleKeyLabel(muscleGroup):"AI choice";
    const priorPerf=buildPriorPerformanceString(trainingLog,muscleLabel);

    // Repeat mode — load last workout and ask AI to progress weights
    if((forceRepeat||repeatMode)&&muscleGroup){
      const lastWorkout=getLastWorkoutForMuscle(history,currentUser,muscleGroup);
      if(lastWorkout?.exercises?.length){
        const result=await aiGenerateWorkout({
          userName:currentUser,
          goal:fullGoal,
          experience:experience||"intermediate",
          injuries:injuries||"None",
          equipment,
          recentHistory:getRecentHistoryString(history,currentUser),
          muscleGroup:muscleLabel,
          requestType:"repeat_progression",
          lastWorkoutExercises:JSON.stringify(lastWorkout.exercises.map(e=>({
            name:e.name,
            sets:e.sets,
            reps:e.actualReps||e.reps,
            weight:e.weightUsed||e.weight,
            primaryMuscle:e.primaryMuscle,
          }))),
          lastWorkoutEffort:lastWorkout.effortRating||"normal",
          daysAgo:lastWorkout.daysAgo,
          numExercises,
          setsPerExercise,
        });
        if(result.ok){
          setWorkout(result.workout);
          setCustomDuration(result.workout?.estimatedMinutes||45);
          setStep("result");
          if(isRegen)setRegenCount(bumpRegenCount(currentUser));
        }else{
          setError(result.error);setStep("setup");
        }
        return;
      }
    }

    // The app chooses the exercises (safe, right equipment, varied), then the
    // AI only writes sets, reps, weights and notes for them.
    let useTargets=targets;
    if(!useTargets.length){const a=autoPick();useTargets=a.targets;setTargets(a.targets);setAiMuscleReason(`You haven't trained ${muscleKeyLabel(a.key).toLowerCase()} much recently.`);}
    const key=muscleKey(useTargets),label=muscleKeyLabel(key);
    const logged=recentLogged(history,currentUser);
    const recent=new Set([...loadSeen(currentUser),...logged.names]);
    const exclude=isRegen&&workout?new Set((workout.exercises||[]).map(e=>e.name)):new Set();
    const plan=buildPlan({targets:useTargets,n:numExercises,gear,style:activeStyle,injuries:profile?.aiTrainer?.injuries||[],exclude,recent,recentMuscles:logged.muscles});
    const styleLabel=styleLabelOf(activeStyle);
    if(!plan.exercises.length){
      setError(`No ${label.toLowerCase()} exercises fit ${activeStyle==="any"?"your equipment":`${styleLabel.toLowerCase()} only`}${plan.flags.size?" and your injuries":""}. Try another equipment option or muscle group.`);
      setStep("setup");return;
    }
    const notes=[];
    if(plan.missing.length)notes.push(`No safe ${plan.missing.map(m=>MUSCLES[m].toLowerCase()).join(" or ")} options with your ${plan.flags.size?"injuries and ":""}equipment, so this workout skips ${plan.missing.length===1?"it":"them"}.`);
    if(plan.exercises.length<numExercises)notes.push(`Only ${plan.exercises.length} different exercises fit, so the workout is a little shorter.`);
    const list=plan.exercises.map((e,i)=>`${i+1}. ${e.name} (${MUSCLES[e.muscle]})`).join("; ");
    const result=await aiGenerateWorkout({
      userName:currentUser,
      goal:[fullGoal,intensityPrompt(intensity)].filter(Boolean).join(". "),
      experience:experience||"intermediate",
      injuries:injuries||"None",
      equipment:`${equipment} Today: ${styleLabel==="Everything"?"any of this equipment":`${styleLabel.toLowerCase()} only`}. The app has already chosen the exercises to fit the athlete's injuries and equipment. Use EXACTLY these ${plan.exercises.length} exercises, in this order, with these exact names, one entry each: ${list}. Do not add, remove, rename or replace any exercise. Your job is the sets, reps, weight, rest and a short coaching note for each.`,
      recentHistory:getRecentHistoryString(history,currentUser),
      muscleGroup:`${label} (${musclesFor(useTargets).map(m=>MUSCLES[m]).join(", ")})`,
      requestType:"freestyle",
      numExercises:plan.exercises.length,
      setsPerExercise,
      daysPerWeek,
      priorPerformance:priorPerf,
      previousExercises:[...exclude],
      isRegen,
    });
    let built;
    if(result.ok){
      const merged=mergeWithAI(plan.exercises,result.workout,{sets:setsPerExercise,goal:fullGoal,intensity,trainingLog});
      built={...result.workout,title:result.workout?.title||`${label} Workout`,exercises:merged.exercises,
        reasoning:merged.replaced>=2?`${label} session: ${plan.exercises.length} different movements chosen for your goal and equipment.`:result.workout?.reasoning,
        estimatedMinutes:Number(result.workout?.estimatedMinutes)||estimateMinutes(merged.exercises)};
    }else{
      // The AI couldn't be reached: still give a full workout, just without its weight suggestions.
      const exercises=plan.exercises.map(e=>exerciseFromLibrary(e,{sets:setsPerExercise,goal:fullGoal,intensity,trainingLog}));
      built={title:`${label} Workout`,reasoning:"",exercises,estimatedMinutes:estimateMinutes(exercises)};
      notes.push(`The coach couldn't add weight suggestions right now (${result.error||"connection problem"}), so pick a weight you can do for the reps shown.`);
    }
    const names=built.exercises.map(e=>e.name);
    rememberSeen(currentUser,names);
    setShown(s=>new Set([...s,...names]));
    setRules(rulesSummary({flags:plan.flags,style:activeStyle,intensity}));
    built.intensity=intensity;
    setPlanNote(notes.join(" "));
    setWorkout(built);
    setCustomDuration(built.estimatedMinutes||45);
    setStep("result");
    if(isRegen)setRegenCount(bumpRegenCount(currentUser));
  };

  // Swapping is done by the app instantly: same muscle, something new, not like the rest.
  const handleSwapExercise=(idx,exercise)=>{
    const seen=new Set([...shown,...loadSeen(currentUser)]);
    const pick=pickSwap({workoutNames:workout.exercises.map(e=>e.name),replace:exercise,targets:targets.length?targets:targetsFromKey(muscleGroup),gear,style:activeStyle,injuries:profile?.aiTrainer?.injuries||[],seen});
    if(!pick){showToast(`No other ${String(exercise.primaryMuscle||"").toLowerCase()||"matching"} exercises fit your equipment and injuries.`);return;}
    const replacement={...exerciseFromLibrary(pick,{sets:exercise.sets,goal:fullGoal,intensity:workout.intensity||intensity}),sets:exercise.sets};
    const newExercises=[...workout.exercises];
    newExercises[idx]=replacement;
    setWorkout({...workout,exercises:newExercises});
    setShown(s=>new Set([...s,pick.name]));
    rememberSeen(currentUser,[pick.name]);
    showToast(seen.has(pick.name)
      ?`🔄 ${pick.name}. You've now seen every ${String(exercise.primaryMuscle||"").toLowerCase()} exercise that fits your equipment and injuries, so they'll start repeating.`
      :`🔄 Swapped ${exercise.name} → ${pick.name}`);
  };

  const handleUseWorkout=()=>{
    if(!workout)return;
    const mg=muscleGroup||"fullbody";
    const finalMinutes=customDuration!==null?Number(customDuration):workout.estimatedMinutes;
    saveActiveWorkout(currentUser,{...workout,estimatedMinutes:finalMinutes},mg,"today");
    showToast("🔥 Workout saved! Find it on the Pack tab.");
    onUseWorkout&&onUseWorkout();onClose();
  };

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>

        {/* ── HOME ── */}
        {step==="home"&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontSize:26}}>🔥</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>WOLFMODE</div>
                <div style={{fontSize:10,color:"var(--muted)"}}>{goalLabel}{secondaryLabel?` · ${secondaryLabel}`:""} · {experience}</div>
              </div>
            </div>

            {/* Favorites grouped by muscle */}
            {Object.keys(favsByMuscle).length>0&&(
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>⭐ MY FAVORITES</div>
                {Object.entries(favsByMuscle).map(([groupLabel,{icon,favs}])=>(
                  <div key={groupLabel} style={{marginBottom:6}}>
                    <button onClick={()=>setExpandedFavGroup(expandedFavGroup===groupLabel?null:groupLabel)} style={{width:"100%",padding:"8px 12px",borderRadius:10,cursor:"pointer",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:8,marginBottom:expandedFavGroup===groupLabel?4:0}}>
                      <span style={{fontSize:16}}>{icon}</span>
                      <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:"rgba(255,255,255,0.7)",flex:1,textAlign:"left"}}>{groupLabel}</span>
                      <span style={{fontSize:11,color:"var(--muted)"}}>{favs.length}</span>
                      <span style={{fontSize:12,color:"var(--muted)",transform:expandedFavGroup===groupLabel?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>▾</span>
                    </button>
                    {expandedFavGroup===groupLabel&&(
                      <div style={{display:"flex",flexDirection:"column",gap:5,paddingLeft:8}}>
                        {favs.map(fav=>(
                          <div key={fav.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(255,107,53,0.06)",border:"1px solid rgba(255,107,53,0.15)",borderRadius:10}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:"#fff"}}>{fav.title}</div>
                              <div style={{fontSize:10,color:"var(--muted)"}}>{fav.workout?.exercises?.length||0} exercises</div>
                            </div>
                            <button onClick={()=>{setWorkout(fav.workout);setMuscleGroup(fav.muscleGroup);setCustomDuration(fav.workout?.estimatedMinutes||45);setStep("result");}} style={{padding:"5px 12px",borderRadius:8,cursor:"pointer",background:"rgba(255,107,53,0.15)",border:"1px solid rgba(255,107,53,0.3)",color:"#ff6b35",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,flexShrink:0}}>USE</button>
                            <button onClick={async()=>{const updated=await removeFavoriteFS(currentUser,fav.id,userFavorites);if(onFavoritesChange)onFavoritesChange(updated);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,padding:"0 2px"}}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{height:1,background:"var(--border)",margin:"8px 0"}}/>
              </div>
            )}

            <button className="btn-primary" onClick={()=>setStep("setup")} style={{background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
              🔥 GENERATE WORKOUT
            </button>
            {error&&<div style={{padding:10,marginTop:10,background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,color:"var(--red)",fontSize:12}}>{error}</div>}
          </>
        )}

        {/* ── SETUP ── */}
        {step==="setup"&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <button onClick={()=>setStep("home")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,padding:"0 4px"}}>←</button>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,color:"#fff"}}>⚡ GENERATE WORKOUT</div>
            </div>

            {/* Muscle picker: one row of quick picks, then tap muscles on the body */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)"}}>🎯 WHAT ARE WE TRAINING?</div>
                <button onClick={flipBody} aria-label={`Show ${bodyGender==="female"?"men's":"women's"} body`} style={{background:"none",border:"1px solid var(--border)",borderRadius:12,padding:"3px 10px",fontSize:11,color:"var(--muted)",cursor:"pointer"}}>{bodyGender==="female"?"♀":"♂"} body</button>
              </div>
              <div style={{position:"relative",marginBottom:6}}>
              <div role="group" aria-label="Quick picks" style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,paddingRight:28,scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
                {QUICK_PICKS.map(q=>{const sel=muscleGroup===q.id;return(
                  <button key={q.id} aria-pressed={sel} onClick={()=>{setTargets(sel?[]:[...q.targets]);setAiMuscleReason("");setRepeatMode(false);}}
                    style={{flexShrink:0,padding:"6px 12px",borderRadius:16,cursor:"pointer",fontSize:12,whiteSpace:"nowrap",background:sel?"rgba(255,107,53,0.2)":"transparent",border:sel?"1px solid rgba(255,107,53,0.6)":"1px solid var(--border)",color:sel?"#ff6b35":"var(--muted)"}}>{q.label}</button>
                );})}
              </div>
              <div aria-hidden="true" style={{position:"absolute",top:0,right:0,bottom:4,width:36,pointerEvents:"none",background:"linear-gradient(to right, rgba(20,20,30,0), var(--bg2, #16161f))"}}/>
              </div>
              <div style={{padding:"8px 0 4px",background:"rgba(255,255,255,0.02)",border:"1px solid var(--border)",borderRadius:14}}>
                <BodyMap muscles={musclesFor(targets)} onToggle={toggleMuscle} gender={bodyGender} scale={0.78}/>
                <div style={{textAlign:"center",fontSize:10,color:"var(--muted)",marginTop:2}}>Tap muscles to add or remove them</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,minHeight:24}}>
                <div style={{flex:1,fontSize:12,color:targets.length?"var(--text)":"var(--muted)"}}>
                  {targets.length?<>Training: <b>{muscleKeyLabel(muscleGroup)}</b></>:aiMuscleReason||"Pick a quick pick or tap the body."}
                </div>
                {targets.length>0
                  ?<button onClick={()=>{setTargets([]);setAiMuscleReason("");}} style={{background:"none",border:"none",color:"var(--muted)",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Clear</button>
                  :<button onClick={()=>{const a=autoPick();setTargets(a.targets);setAiMuscleReason(`You haven't trained ${muscleKeyLabel(a.key).toLowerCase()} much recently.`);setRepeatMode(false);}}
                    style={{background:"none",border:"1px solid var(--border)",borderRadius:12,padding:"4px 10px",color:"var(--accent2)",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>🤖 Coach picks</button>}
              </div>
              {targets.length>0&&aiMuscleReason&&<div style={{fontSize:10,color:"var(--muted)"}}>{aiMuscleReason}</div>}
            </div>

            {/* Repeat last workout suggestion — shows when muscle group selected */}
            {(()=>{
              if(!muscleGroup)return null;
              const lastWorkout=getLastWorkoutForMuscle(history,currentUser,muscleGroup);
              if(!lastWorkout||!lastWorkout.exercises?.length)return null;
              const effortMap={easy:"Too Easy",normal:"Just Right",hard:"Hard",wrecked:"Wrecked"};
              const progressMap={easy:"Increase weights ~10%",normal:"Progress weights ~5%",hard:"Keep same weights",wrecked:"Reduce weights slightly"};
              const effort=lastWorkout.effortRating||"normal";
              const daysLabel=lastWorkout.daysAgo===7?"Last week":lastWorkout.daysAgo<=3?`${lastWorkout.daysAgo} days ago`:`${lastWorkout.daysAgo} days ago`;
              return(
                <div style={{marginBottom:14,padding:"12px 14px",background:"rgba(46,204,113,0.06)",border:"1px solid rgba(46,204,113,0.2)",borderRadius:14}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--green)",marginBottom:6}}>
                    📋 PREVIOUS {(muscleKeyLabel(muscleGroup)||"").toUpperCase()} WORKOUT · {daysLabel.toUpperCase()}
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.5}}>
                    {lastWorkout.exercises.filter(e=>!e.skipped).slice(0,3).map(e=>e.name).join(" · ")}
                    {lastWorkout.exercises.filter(e=>!e.skipped).length>3&&<span style={{color:"var(--muted)"}}> +{lastWorkout.exercises.filter(e=>!e.skipped).length-3} more</span>}
                  </div>
                  {effort&&<div style={{fontSize:10,color:"var(--muted)",marginBottom:10}}>Last rating: {effortMap[effort]||effort} → <span style={{color:"rgba(46,204,113,0.8)"}}>{progressMap[effort]||"Progress from last session"}</span></div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setRepeatMode(true);generate(false,true);}}
                      style={{flex:1,padding:"9px",borderRadius:10,cursor:"pointer",background:"rgba(46,204,113,0.15)",border:"1px solid rgba(46,204,113,0.3)",color:"var(--green)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                      🔄 REPEAT + PROGRESS
                    </button>
                    <button onClick={()=>{setRepeatMode(false);generate(false,false);}}
                      style={{flex:1,padding:"9px",borderRadius:10,cursor:"pointer",background:!repeatMode?"rgba(255,107,53,0.15)":"rgba(255,255,255,0.04)",border:!repeatMode?"1px solid rgba(255,107,53,0.4)":"1px solid var(--border)",color:!repeatMode?"#ff6b35":"var(--muted)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                      ✨ NEW WORKOUT
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Volume */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>⚙️ VOLUME & INTENSITY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Exercises</div>
                  <div style={{display:"flex",gap:4}}>
                    {[3,4,5,6].map(n=>(
                      <button key={n} onClick={()=>setNumExercises(n)} style={{flex:1,padding:"8px 0",borderRadius:8,cursor:"pointer",background:numExercises===n?"rgba(255,107,53,0.2)":"var(--bg3)",border:numExercises===n?"1px solid rgba(255,107,53,0.6)":"1px solid var(--border)",color:numExercises===n?"#ff6b35":"var(--muted)",fontFamily:"'Bebas Neue',cursive",fontSize:15}}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Sets each</div>
                  <div style={{display:"flex",gap:4}}>
                    {[3,4].map(n=>(
                      <button key={n} onClick={()=>setSetsPerExercise(n)} style={{flex:1,padding:"8px 0",borderRadius:8,cursor:"pointer",background:setsPerExercise===n?"rgba(255,107,53,0.2)":"var(--bg3)",border:setsPerExercise===n?"1px solid rgba(255,107,53,0.6)":"1px solid var(--border)",color:setsPerExercise===n?"#ff6b35":"var(--muted)",fontFamily:"'Bebas Neue',cursive",fontSize:15}}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:"var(--muted)",margin:"12px 0 6px"}}>Intensity</div>
              <div role="radiogroup" aria-label="Intensity" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {INTENSITIES.map(it=>{const sel=intensity===it.id;return(
                  <button key={it.id} role="radio" aria-checked={sel} onClick={()=>setIntensity(it.id)}
                    style={{padding:"8px 4px",borderRadius:10,cursor:"pointer",background:sel?"rgba(255,107,53,0.2)":"var(--bg3)",border:sel?"1px solid rgba(255,107,53,0.6)":"1px solid var(--border)",color:sel?"#ff6b35":"var(--muted)",fontSize:13}}>{it.icon} {it.label}</button>
                );})}
              </div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:6,lineHeight:1.5}}>{INTENSITIES.find(x=>x.id===intensity)?.desc}</div>
            </div>

            {/* Equipment */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🏠 EQUIPMENT</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {AI_EQUIPMENT_PRESETS.map(p=>{const sel=selectedPreset===p.id;return(
                  <button key={p.id} onClick={()=>setSelectedPreset(p.id)} style={{padding:"10px 8px",borderRadius:12,cursor:"pointer",background:sel?"rgba(124,92,191,0.2)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)",textAlign:"left"}}>
                    <div style={{fontSize:18,marginBottom:2}}>{p.icon}</div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:sel?"var(--accent2)":"#fff"}}>{p.label}</div>
                  </button>
                );})}
              </div>
              {savedPresets.map((sp,i)=>{const sel=selectedPreset===`saved_${i}`;return(
                <button key={i} onClick={()=>{setSelectedPreset(`saved_${i}`);setCustomEquip(sp.equipment);}} style={{width:"100%",padding:"8px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",marginTop:6,background:sel?"rgba(124,92,191,0.15)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)"}}>
                  <div style={{fontSize:12,color:sel?"var(--accent2)":"#fff"}}>⚙️ {sp.name}</div>
                </button>
              );})}
              <div style={{fontSize:11,color:"var(--muted)",margin:"12px 0 6px"}}>Use today <span style={{opacity:0.7}}>· pick as many as you like</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {styleOptions.map(st=>{const sel=st.id==="any"?!activeIds.length:activeIds.includes(st.id);return(
                  <button key={st.id} aria-pressed={sel} onClick={()=>pickStyle(st.id)}
                    style={{padding:"7px 12px",borderRadius:20,cursor:"pointer",fontSize:12,background:sel?"rgba(124,92,191,0.25)":"var(--bg3)",border:sel?"1px solid var(--accent)":"1px solid var(--border)",color:sel?"var(--accent2)":"var(--muted)"}}>{st.icon} {st.label}</button>
                );})}
              </div>
              {styleOptions.length<7&&<div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>Only showing equipment this location has.</div>}
            </div>

            <button className="btn-primary" onClick={()=>generate(false)} style={{background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
              🔥 GENERATE
            </button>
            <div style={{textAlign:"center",fontSize:10,color:"var(--muted)",marginTop:6}}>{MAX_DAILY_REGENS-regenCount} regens remaining today</div>
          </>
        )}

        {/* ── LOADING ── */}
        {step==="loading"&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:48,marginBottom:14,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔥</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:6,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>BUILDING YOUR SESSION</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Personalizing for your goal...</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── RESULT ── */}
        {step==="result"&&workout&&(
          <>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
              <div style={{fontSize:22}}>🔥</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1}}>{workout.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:"var(--muted)"}}>⏱</span>
                  <input type="number" value={customDuration!==null?customDuration:workout.estimatedMinutes}
                    onChange={e=>setCustomDuration(e.target.value?Number(e.target.value):workout.estimatedMinutes)}
                    onBlur={e=>{if(!e.target.value||Number(e.target.value)<1)setCustomDuration(workout.estimatedMinutes);}}
                    style={{width:44,padding:"2px 6px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,color:"rgba(255,255,255,0.7)",fontSize:11,textAlign:"center"}} min={1}/>
                  <span style={{fontSize:11,color:"var(--muted)"}}>min · {workout.exercises?.length} exercises</span>
                </div>
              </div>
            </div>
            {workout.reasoning&&<div style={{padding:"10px 12px",marginBottom:12,background:"rgba(255,107,53,0.06)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:10,fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5,fontStyle:"italic"}}>💭 {workout.reasoning}</div>}
            {(rules.length>0||planNote)&&<div style={{marginBottom:12}}>
              {rules.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:planNote?8:0}}>
                {rules.map(x=><span key={x} style={{padding:"4px 10px",borderRadius:14,fontSize:11,background:"rgba(46,204,113,0.08)",border:"1px solid rgba(46,204,113,0.3)",color:"var(--green)"}}>{x}</span>)}
              </div>}
              {planNote&&<div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>{planNote}</div>}
            </div>}
            {workout.exercises?.map((ex,i)=>(
              <ExerciseCard key={i} exercise={ex} userName={currentUser} experience={experience} injuries={injuries} idx={i} onSwap={handleSwapExercise} swapping={swappingIdx===i}/>
            ))}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button className="btn-primary" onClick={handleUseWorkout} style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
                🔥 USE THIS WORKOUT
              </button>
              <button className="btn-ghost" onClick={()=>generate(true)} disabled={regenCount>=MAX_DAILY_REGENS} style={{flex:"0 0 auto",padding:"0 14px"}}>
                🔄 ({MAX_DAILY_REGENS-regenCount})
              </button>
            </div>
            <button onClick={()=>{setStep("home");setWorkout(null);}} style={{width:"100%",marginTop:8,padding:8,background:"transparent",border:"none",color:"var(--muted)",fontSize:11,cursor:"pointer"}}>← Back</button>
          </>
        )}
      </div>
    </div>
  );
}
