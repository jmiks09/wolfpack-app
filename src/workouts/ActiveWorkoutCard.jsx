import { useEffect, useState } from "react";
import { ExerciseCard } from "../ai/ExerciseCard";
import { getActiveWorkout } from "../lib/activeWorkout";
import { AI_MUSCLE_GROUPS } from "../lib/aiConfig";
import { centralDateStr } from "../lib/dates";
import { removeFavoriteFS, saveFavoriteFS } from "../lib/favorites";

export function ActiveWorkoutCard({currentUser, targetDate, onComplete, onDismiss, userName, experience, injuries, userFavorites, onFavoritesChange}){
  const [data,setData]=useState(()=>getActiveWorkout(currentUser, targetDate));
  const [expanded,setExpanded]=useState(false);
  const [favorited,setFavorited]=useState(()=>{
    if(!data?.workout?.title)return false;
    return (userFavorites||[]).some(f=>f.workout?.title===data.workout.title);
  });
  const [editingDuration,setEditingDuration]=useState(false);
  const [localDuration,setLocalDuration]=useState(null);

  useEffect(()=>{
    const d=getActiveWorkout(currentUser, targetDate);
    setData(d);
    setFavorited(d?.workout?(userFavorites||[]).some(f=>f.workout?.title===d.workout.title):false);
    setLocalDuration(null);
  },[currentUser, targetDate, userFavorites]);

  if(!data)return null;

  const {workout,muscleGroup,completed}=data;
  const isToday=targetDate==="today";
  const mgObj=AI_MUSCLE_GROUPS?.find(m=>m.id===muscleGroup);
  const displayMinutes=localDuration!==null?localDuration:workout.estimatedMinutes;

  const saveDuration=(newMins)=>{
    if(!newMins||Number(newMins)<1)return;
    const updated={...data,workout:{...workout,estimatedMinutes:Number(newMins)}};
    const date=targetDate==="tomorrow"?centralDateStr(1):centralDateStr(0);
    const key=`wp_active_${currentUser}_${date}`;
    try{localStorage.setItem(key,JSON.stringify(updated));}catch{}
    setLocalDuration(Number(newMins));
    setData(updated);
    setEditingDuration(false);
  };

  const toggleFavorite=async(e)=>{
    e.stopPropagation();
    if(favorited){
      const favId=(userFavorites||[]).find(f=>f.workout?.title===workout.title)?.id;
      if(favId){
        const updated=await removeFavoriteFS(currentUser,favId,userFavorites);
        if(onFavoritesChange)onFavoritesChange(updated);
      }
      setFavorited(false);
    }else{
      const updated=await saveFavoriteFS(currentUser,workout,muscleGroup,userFavorites);
      if(onFavoritesChange)onFavoritesChange(updated);
      setFavorited(true);
    }
  };

  return(
    <div style={{
      margin:"0 16px 10px",
      background:isToday
        ?"linear-gradient(135deg, rgba(255,107,53,0.12), rgba(124,92,191,0.08))"
        :"rgba(124,92,191,0.06)",
      border:isToday?"1px solid rgba(255,107,53,0.35)":"1px solid rgba(124,92,191,0.25)",
      borderRadius:16,
      overflow:"hidden",
    }}>
      {/* Header — tap anywhere to expand */}
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setExpanded(e=>!e)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{
            fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,
            color:isToday?"#ff6b35":"var(--accent2)",marginBottom:2,
          }}>
            {isToday?"🔥 TODAY'S WORKOUT":"📋 TOMORROW'S PLAN"}
          </div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1.5,color:"#fff",lineHeight:1.1}}>
            {workout.title}
          </div>
          <div style={{fontSize:10,color:"var(--muted)",marginTop:2,display:"flex",alignItems:"center",gap:4}}>
            {editingDuration?(
              <input
                type="number"
                defaultValue={displayMinutes}
                autoFocus
                onClick={e=>e.stopPropagation()}
                onBlur={e=>saveDuration(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")saveDuration(e.target.value);if(e.key==="Escape")setEditingDuration(false);}}
                style={{width:44,padding:"1px 5px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,107,53,0.5)",borderRadius:6,color:"#ff6b35",fontSize:11,textAlign:"center"}}
                min={1}
              />
            ):(
              <span onClick={e=>{e.stopPropagation();setEditingDuration(true);}} style={{cursor:"text",borderBottom:"1px dashed rgba(255,255,255,0.2)",paddingBottom:1}} title="Tap to edit">
                {displayMinutes}
              </span>
            )}
            <span>min · {workout.exercises?.length} exercises{mgObj?` · ${mgObj.label}`:""}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          {completed&&(
            <span style={{
              padding:"3px 10px",borderRadius:20,fontSize:10,
              background:"rgba(46,204,113,0.15)",border:"1px solid var(--green)",
              color:"var(--green)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
            }}>✓ DONE</span>
          )}
          {/* Heart — favorite button */}
          <button onClick={toggleFavorite} style={{
            background:"none",border:"none",cursor:"pointer",
            fontSize:18,padding:"0 4px",lineHeight:1,
            color:favorited?"#e74c3c":"var(--muted)",
            transition:"transform 0.15s",
            transform:favorited?"scale(1.2)":"scale(1)",
          }}>{favorited?"❤️":"🤍"}</button>
          <button onClick={e=>{e.stopPropagation();setExpanded(ex=>!ex);}} style={{
            background:"none",border:"none",cursor:"pointer",
            color:"var(--muted)",fontSize:18,padding:"0 4px",
            transition:"transform .2s",transform:expanded?"rotate(180deg)":"rotate(0)",
          }}>▾</button>
          <button onClick={e=>{e.stopPropagation();if(window.confirm("Remove this workout? It won't be logged.")){{onDismiss(targetDate);setData(null);};}}} style={{
            background:"none",border:"none",cursor:"pointer",
            color:"var(--muted)",fontSize:20,padding:"0 4px",lineHeight:1,
          }}>×</button>
        </div>
      </div>

      {/* Exercise list */}
      {expanded&&(
        <div style={{padding:"0 14px 14px"}}>
          <div style={{
            padding:"8px 12px",marginBottom:10,
            background:"rgba(0,0,0,0.2)",borderRadius:10,
            fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.5,fontStyle:"italic",
          }}>
            💭 {workout.reasoning}
          </div>

          {workout.exercises?.map((ex,i)=>(
            <ExerciseCard
              key={i}
              exercise={ex}
              userName={userName}
              experience={experience}
              injuries={injuries}
              idx={i}
            />
          ))}

          {/* Mark complete button — only for today, only if not done */}
          {isToday&&!completed&&(
            <button className="btn-primary" onClick={()=>{onComplete(data);setData({...data,completed:true});}}
              style={{
                width:"100%",marginTop:8,
                background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none",
              }}>
              ✓ MARK COMPLETE
            </button>
          )}
          {isToday&&completed&&(
            <div style={{
              textAlign:"center",padding:"10px",
              fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,
              color:"var(--green)",
            }}>
              ✓ CRUSHED IT TODAY
            </div>
          )}
          {!isToday&&(
            <div style={{
              textAlign:"center",padding:"8px",fontSize:11,color:"var(--muted)",
            }}>
              This becomes today's workout at midnight Central
            </div>
          )}
        </div>
      )}
    </div>
  );
}
