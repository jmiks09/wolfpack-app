import { useState } from "react";
import { aiGenerateFormCues } from "../firebase";
import { AnatomyDiagram } from "./AnatomyDiagram";

// ── AI TRAINER — exercise card (form cues + GIF) ─────────────────────────────
export function ExerciseCard({exercise, userName, experience, injuries, idx, onSwap, swapping}){
  const [expanded,setExpanded]=useState(false);
  const [cues,setCues]=useState(null);
  const [cuesLoading,setCuesLoading]=useState(false);
  const [cuesError,setCuesError]=useState(null);

  const handleExpand=async()=>{
    const next=!expanded;
    setExpanded(next);
    if(next&&!cues&&!cuesLoading){
      setCuesLoading(true);
      setCuesError(null);
      const cueRes=await aiGenerateFormCues({
        userName,
        exerciseName:exercise.name,
        experience:experience||"intermediate",
        injuries:injuries||"",
      });
      if(cueRes.ok){setCues(cueRes.cues);}
      else{setCuesError(cueRes.error||"Couldn't load form cues.");}
      setCuesLoading(false);
    }
  };

  const muscleLabel=exercise.primaryMuscle
    ? exercise.primaryMuscle.charAt(0).toUpperCase()+exercise.primaryMuscle.slice(1)
    : null;

  return(
    <div style={{marginBottom:10,background:"var(--bg3)",border:`1px solid ${swapping?"rgba(255,107,53,0.4)":"var(--border)"}`,borderRadius:14,overflow:"hidden",opacity:swapping?0.7:1,transition:"opacity 0.2s"}}>
      {/* Header row */}
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div onClick={handleExpand} style={{
          width:28,height:28,borderRadius:"50%",flexShrink:0,cursor:"pointer",
          background:"rgba(124,92,191,0.2)",border:"1px solid rgba(124,92,191,0.4)",
          color:"var(--accent2)",display:"flex",alignItems:"center",justifyContent:"center",
          fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1,
        }}>{idx+1}</div>
        <div onClick={handleExpand} style={{flex:1,minWidth:0,cursor:"pointer"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1.5,color:"#fff",marginBottom:2}}>
            {exercise.name}
            {exercise.isCoreLift&&<span style={{marginLeft:6,fontSize:9,padding:"1px 6px",borderRadius:4,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.25)",color:"rgba(255,215,0,0.7)"}}>CORE</span>}
          </div>
          <div style={{fontSize:11,color:"var(--muted)",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span>{exercise.sets} × {exercise.reps}</span>
            {exercise.weight&&exercise.weight!=="bodyweight"&&<span>· {exercise.weight}</span>}
            {exercise.weight==="bodyweight"&&<span>· bodyweight</span>}
            {exercise.restSeconds&&<span>· {exercise.restSeconds}s rest</span>}
            {muscleLabel&&(
              <span style={{padding:"1px 7px",borderRadius:10,fontSize:10,background:"rgba(255,107,53,0.12)",border:"1px solid rgba(255,107,53,0.25)",color:"#ff6b35"}}>{muscleLabel}</span>
            )}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {/* Swap button — only show if onSwap provided and not a core lift */}
          {onSwap&&!exercise.isCoreLift&&(
            <button onClick={e=>{e.stopPropagation();onSwap(idx,exercise);}}
              disabled={swapping}
              title="Swap this exercise"
              style={{
                width:28,height:28,borderRadius:8,cursor:swapping?"default":"pointer",
                background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.25)",
                color:"#ff6b35",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,
              }}>
              {swapping?"⏳":"🔄"}
            </button>
          )}
          <div onClick={handleExpand} style={{fontSize:18,color:"var(--muted)",cursor:"pointer",transition:"transform .2s",transform:expanded?"rotate(180deg)":"rotate(0)"}}>▾</div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded&&(
        <div style={{padding:"0 14px 14px",borderTop:"1px solid var(--border)"}}>
          {exercise.notes&&(
            <div style={{marginTop:12,padding:"8px 12px",background:"rgba(255,107,53,0.08)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:10,fontSize:12,color:"var(--orange)"}}>
              💡 {exercise.notes}
            </div>
          )}

          {/* Anatomy diagram — shows which muscles light up */}
          <AnatomyDiagram primaryMuscle={exercise.primaryMuscle}/>

          {/* YouTube form guide — opens in external browser so music keeps playing */}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name+" exercise form")}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display:"flex",alignItems:"center",gap:10,
              marginTop:12,padding:"10px 14px",
              background:"rgba(255,0,0,0.06)",
              border:"1px solid rgba(255,0,0,0.15)",
              borderRadius:10,textDecoration:"none",
            }}>
            <span style={{fontSize:20}}>▶️</span>
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1.5,color:"#ff5555"}}>WATCH FORM GUIDE</div>
              <div style={{fontSize:10,color:"var(--muted)"}}>{exercise.name} · opens in browser</div>
            </div>
          </a>

          {/* Form cues */}
          <div style={{marginTop:12}}>
            {cuesLoading&&<div style={{textAlign:"center",padding:14,color:"var(--muted)",fontSize:12}}>Writing form cues...</div>}
            {cuesError&&<div style={{padding:10,color:"var(--red)",fontSize:12,textAlign:"center"}}>{cuesError}</div>}
            {cues&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {cues.setup&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>SETUP</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.5}}>{cues.setup}</div>
                  </div>
                )}
                {cues.execution&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)",marginBottom:4}}>EXECUTION</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.5}}>{cues.execution}</div>
                  </div>
                )}
                {cues.commonMistakes?.length>0&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--red)",marginBottom:4}}>AVOID</div>
                    <ul style={{margin:0,paddingLeft:18,fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>
                      {cues.commonMistakes.map((m,i)=><li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {cues.breathing&&(
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--muted)",marginBottom:4}}>BREATHING</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.5}}>{cues.breathing}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
