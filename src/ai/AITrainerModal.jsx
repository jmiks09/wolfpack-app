import { useMemo, useState } from "react";
import { aiGenerateWorkout } from "../firebase";
import { saveActiveWorkout } from "../lib/activeWorkout";
import { AI_EQUIPMENT_PRESETS, AI_GOALS, AI_MUSCLE_GROUPS, AI_SECONDARY_GOALS, MAX_DAILY_REGENS } from "../lib/aiConfig";
import { buildEquipmentString, bumpRegenCount, getLastWorkoutForMuscle, getRecentHistoryString, getRegenCount } from "../lib/aiHelpers";
import { removeFavoriteFS } from "../lib/favorites";
import { buildPriorPerformanceString, getTrainingLog } from "../lib/trainingLog";
import { ExerciseCard } from "./ExerciseCard";

// ── AI TRAINER MODAL ────────────────────────────────────────────────────────

export function AITrainerModal({currentUser, profile, history, packHomeGym, userFavorites, onFavoritesChange, onClose, onUseWorkout, showToast}){
  const [step,setStep]=useState("home"); // home | setup | loading | result
  const [selectedPreset,setSelectedPreset]=useState(profile?.aiTrainer?.usualSetup||"home");
  const [customEquip,setCustomEquip]=useState("");
  const [savedPresets,setSavedPresets]=useState(profile?.aiTrainer?.savedPresets||[]);
  const [workout,setWorkout]=useState(null);
  const [error,setError]=useState(null);
  const [regenCount,setRegenCount]=useState(getRegenCount(currentUser));
  const [muscleGroup,setMuscleGroup]=useState(null);
  const [aiMuscleReason,setAiMuscleReason]=useState("");
  const [numExercises,setNumExercises]=useState(5);
  const [setsPerExercise,setSetsPerExercise]=useState(4);
  const [swappingIdx,setSwappingIdx]=useState(null);
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
      const mgId=fav.muscleGroup||"other";
      const mg=AI_MUSCLE_GROUPS.find(m=>m.id===mgId);
      const key=mg?.label||fav.muscleGroup||"Other";
      const icon=mg?.icon||"💪";
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

  const generate=async(isRegen=false,forceRepeat=false)=>{
    if(isRegen&&regenCount>=MAX_DAILY_REGENS){showToast("Daily limit reached.");return;}
    setStep("loading");setError(null);
    const equipment=buildEquipmentString(selectedPreset,customEquip,packHomeGym);
    const trainingLog=await getTrainingLog(currentUser);
    const muscleLabel=muscleGroup?AI_MUSCLE_GROUPS.find(m=>m.id===muscleGroup)?.label:"AI choice";
    const priorPerf=buildPriorPerformanceString(trainingLog,muscleLabel);
    const prevExercises=isRegen&&workout?workout.exercises?.map(e=>e.name)||[]:[];

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

    const result=await aiGenerateWorkout({
      userName:currentUser,
      goal:fullGoal,
      experience:experience||"intermediate",
      injuries:injuries||"None",
      equipment,
      recentHistory:getRecentHistoryString(history,currentUser),
      muscleGroup:muscleLabel,
      requestType:"freestyle",
      numExercises,
      setsPerExercise,
      daysPerWeek,
      priorPerformance:priorPerf,
      previousExercises:prevExercises,
      isRegen,
    });
    if(result.ok){
      setWorkout(result.workout);
      setCustomDuration(result.workout?.estimatedMinutes||45);
      setStep("result");
      if(isRegen)setRegenCount(bumpRegenCount(currentUser));
    }else{
      setError(result.error);
      setStep("setup");
    }
  };

  const handleSwapExercise=async(idx,exercise)=>{
    if(swappingIdx!==null)return;
    setSwappingIdx(idx);
    const equipment=buildEquipmentString(selectedPreset,customEquip,packHomeGym);
    const otherExercises=workout.exercises.map(e=>e.name);
    const result=await aiGenerateWorkout({
      userName:currentUser,goal:goalLabel,experience:experience||"intermediate",
      injuries:injuries||"None",equipment,muscleGroup:exercise.primaryMuscle||muscleGroup||"",
      requestType:"swap_exercise",exerciseToReplace:exercise.name,
      exerciseMuscle:exercise.primaryMuscle||"",otherExercises,
      numExercises:1,setsPerExercise:exercise.sets||4,
    });
    setSwappingIdx(null);
    if(result.ok&&result.workout?.exercises?.[0]){
      const newExercise={...result.workout.exercises[0],sets:exercise.sets,isCoreLift:false};
      const newExercises=[...workout.exercises];
      newExercises[idx]=newExercise;
      setWorkout({...workout,exercises:newExercises});
      showToast(`🔄 Swapped ${exercise.name} → ${newExercise.name}`);
    }else{showToast("Couldn't find a swap — try again");}
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

            {/* Muscle picker */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>🎯 MUSCLE GROUP</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:8}}>
                {AI_MUSCLE_GROUPS.map(mg=>{const sel=muscleGroup===mg.id;return(
                  <button key={mg.id} onClick={()=>{setMuscleGroup(mg.id);setAiMuscleReason("");}} style={{padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",background:sel?"rgba(255,107,53,0.2)":"var(--bg3)",border:sel?"1px solid rgba(255,107,53,0.6)":"1px solid var(--border)"}}>
                    <div style={{fontSize:16,marginBottom:2}}>{mg.icon}</div>
                    <div style={{fontSize:9,color:sel?"#ff6b35":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{mg.label}</div>
                  </button>
                );})}
              </div>
              <button onClick={()=>{
                const groups=["chest","back","legs","glutes","shoulders","arms","core"];
                const counts={};groups.forEach(g=>{counts[g]=0;});
                const lower=getRecentHistoryString(history,currentUser).toLowerCase();
                ["chest","back","shoulder","arm","core"].forEach(k=>{if(lower.includes(k))counts[k]=(counts[k]||0)+2;});
                if(lower.includes("leg")||lower.includes("squat"))counts.legs+=2;if(lower.includes("glute"))counts.glutes+=2;
                const pick=groups.sort((a,b)=>(counts[a]||0)-(counts[b]||0))[0];
                const mg=AI_MUSCLE_GROUPS.find(m=>m.id===pick)||AI_MUSCLE_GROUPS[7];
                setMuscleGroup(mg.id);setAiMuscleReason(`You haven\'t trained ${mg.label.toLowerCase()} much recently.`);setRepeatMode(false);
              }} style={{width:"100%",padding:"10px 12px",borderRadius:10,cursor:"pointer",background:!muscleGroup?"rgba(124,92,191,0.2)":"var(--bg3)",border:!muscleGroup?"1px solid var(--accent)":"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>🤖</span>
                <div style={{textAlign:"left",flex:1}}>
                  <div style={{fontSize:12,color:!muscleGroup?"var(--accent2)":"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1.5}}>AI PICK FOR ME</div>
                  {aiMuscleReason&&<div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{aiMuscleReason}</div>}
                </div>
                {!muscleGroup&&<div style={{fontSize:14,color:"var(--accent)"}}>✓</div>}
              </button>
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
                    📋 PREVIOUS {AI_MUSCLE_GROUPS.find(m=>m.id===muscleGroup)?.label?.toUpperCase()||""} WORKOUT · {daysLabel.toUpperCase()}
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
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:8}}>⚙️ VOLUME</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>Exercises</div>
                  <div style={{display:"flex",gap:4}}>
                    {[3,4,5].map(n=>(
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
