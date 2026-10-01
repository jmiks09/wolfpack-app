import { AvatarDisplay } from "../../components/AvatarDisplay";
import { AI_MUSCLE_GROUPS } from "../../lib/aiConfig";
import { BADGES } from "../../lib/constants";
import { isWeekend, localDateStr } from "../../lib/dates";
import { computeBadges, getStreak, getTotalWorkouts } from "../../lib/stats";
import { WorkoutHistorySection } from "./WorkoutHistorySection";

export function StatsTab({currentUser,members,profiles,history,challenges,feed,onEditExercises}){
  const last30=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);return{date:localDateStr(d),day:d.getDate()};});
  const mb=computeBadges(currentUser,history,feed,challenges,profiles[currentUser]);

  // Compute all stats from history
  const allEntries=Object.entries(history).filter(([,d])=>d?.[currentUser]?.done);
  const totalSessions=allEntries.length;
  const totalMinutes=allEntries.reduce((sum,[,d])=>sum+(d[currentUser]?.duration||d[currentUser]?.wolfmodeSession?.estimatedMinutes||45),0);

  // Workout type breakdown
  const typeCounts={};
  allEntries.forEach(([,d])=>{
    const entry=d[currentUser];
    if(entry.wolfmodeSession||entry.workoutLabel?.includes("WOLFMODE")){
      typeCounts["Weight Training"]=(typeCounts["Weight Training"]||0)+1;
    } else {
      const types=entry.workouts||[];
      if(types.length>0){
        types.forEach(t=>{let label=t.label||t.id||"Other";if(label==="Lifting"||t.id==="lift")label="Weight Training";typeCounts[label]=(typeCounts[label]||0)+1;});
      } else {
        const label=entry.workoutLabel||"Other";
        const key=label.includes("Run")?"Running":label.includes("Walk")?"Walking":label.includes("Cardio")||label.includes("HIIT")?"Cardio":"Other";
        typeCounts[key]=(typeCounts[key]||0)+1;
      }
    }
  });
  const typeTotal=Object.values(typeCounts).reduce((a,b)=>a+b,0)||1;
  const typeData=Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([label,count])=>({label,count,pct:Math.round(count/typeTotal*100)}));
  const topType=typeData[0]?.label||"—";

  // Muscle group breakdown (weight training only)
  const muscleCounts={};
  const SPLIT_NORMALIZE={"push":"Chest & Shoulders","pull":"Back","legs":"Legs & Glutes","upper":"Upper Body","lower":"Legs & Glutes","chest":"Chest","back":"Back","shoulders":"Shoulders","arms":"Arms","fullbody":"Full Body","glutes":"Glutes","core":"Core","biceps":"Arms","triceps":"Arms","hamstrings":"Legs & Glutes","quads":"Legs & Glutes","calves":"Legs & Glutes","rear delts":"Shoulders","lats":"Back","traps":"Back","legs & glutes":"Legs & Glutes","chest & shoulders":"Chest & Shoulders"};
  allEntries.forEach(([,d])=>{
    const entry=d[currentUser];
    let mg=null;

    // 1. wolfmodeSession.muscleGroup (WOLFMODE sessions)
    if(entry.wolfmodeSession?.muscleGroup){
      mg=entry.wolfmodeSession.muscleGroup;
    }
    // 2. details.lift.muscles (manual log sessions)
    else if(entry.details?.lift?.muscles?.length){
      mg=entry.details.lift.muscles[0];
    }
    // 3. details.lift.focus (manual log focus field)
    else if(entry.details?.lift?.focus){
      mg=entry.details.lift.focus;
    }
    // 4. Parse from summary array or workoutLabel
    else{
      const labelStr=Array.isArray(entry.summary)?entry.summary[0]:(entry.workoutLabel||"");
      if(labelStr.toLowerCase().includes("weight training")||labelStr.toLowerCase().includes("wolfmode")){
        // Handle "Weight Training: glutes · 52 min" format
        const colonMatch=labelStr.match(/weight training[:\s]+([a-zA-Z\s&]+?)(?:\s*·|\s*\d|$)/i);
        if(colonMatch)mg=colonMatch[1].trim();
        // Handle "WOLFMODE · Weight Training · Back · 5 exercises" format
        else{
          const parts=labelStr.split(/[·]/).map(p=>p.trim());
          const wtIdx=parts.findIndex(p=>p.toLowerCase().includes("weight training")||p.toLowerCase().includes("wolfmode"));
          for(let i=wtIdx+1;i<parts.length;i++){
            const part=parts[i].trim();
            if(part&&!/^\d/.test(part)&&!part.toLowerCase().includes("min")&&!part.toLowerCase().includes("exercise")){
              mg=part;break;
            }
          }
        }
      }
    }

    if(mg){
      const normalized=mg.toLowerCase().trim();
      const label=AI_MUSCLE_GROUPS?.find(m=>m.id===normalized||m.label?.toLowerCase()===normalized)?.label||SPLIT_NORMALIZE[normalized]||mg.charAt(0).toUpperCase()+mg.slice(1);
      if(label)muscleCounts[label]=(muscleCounts[label]||0)+1;
    }
  });
  const muscleTotal=Object.values(muscleCounts).reduce((a,b)=>a+b,0)||1;
  const muscleData=Object.entries(muscleCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([label,count])=>({label,count,pct:Math.round(count/muscleTotal*100)}));
  const topMuscle=muscleData[0]?.label||"—";

  // Sessions per week (last 8 weeks)
  const weeklyData=Array.from({length:8},(_,wi)=>{
    const today=new Date();
    const dayOfWeek=today.getDay();
    const thisSunday=new Date(today);thisSunday.setDate(today.getDate()-dayOfWeek);
    const weekStart=new Date(thisSunday);weekStart.setDate(thisSunday.getDate()-wi*7);
    const label=weekStart.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    let count=0;
    for(let i=0;i<7;i++){
      const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);
      const entry=history[localDateStr(d)]?.[currentUser];
      if(entry?.done) count+=entry.sessionCount||1;
    }
    return{label,count,isCurrent:wi===0};
  }).reverse();
  const maxWeekly=Math.max(...weeklyData.map(w=>w.count),1);

  // Donut chart helper
  const DONUT_COLORS=["#7F77DD","#D85A30","#1D9E75","#EF9F27","#B4B2A9"];
  const buildDonut=(data,total)=>{
    const circumference=2*Math.PI*38;
    let offset=0;
    return data.map((item,i)=>{
      const dash=(item.count/total)*circumference;
      const el={dash,offset,color:DONUT_COLORS[i]};
      offset+=dash;
      return el;
    });
  };
  const typeArcs=buildDonut(typeData,typeTotal);
  const muscleArcs=buildDonut(muscleData,muscleTotal);

  return(
    <div>
      <div className="section-label" style={{marginTop:12}}>LAST 30 DAYS</div>
      <div style={{padding:"0 16px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:5}}>
          {last30.map(({date,day})=>{const done=!!history[date]?.[currentUser]?.done,we=isWeekend(date);return<div key={date} style={{aspectRatio:"1",borderRadius:6,background:done?"linear-gradient(135deg,var(--accent),var(--orange))":we?"rgba(255,255,255,0.02)":"var(--bg3)",border:`1px solid ${we?"rgba(255,255,255,0.03)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:done?"#fff":we?"rgba(255,255,255,0.15)":"var(--muted)"}}>{we?"":day}</div>;})}
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:"var(--muted)"}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"linear-gradient(135deg,var(--accent),var(--orange))",display:"inline-block"}}/>Workout</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"var(--bg3)",border:"1px solid var(--border)",display:"inline-block"}}/>Missed</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"rgba(255,255,255,0.02)",display:"inline-block"}}/>Weekend</span>
        </div>
      </div>

      {/* ── 3-stat row ── */}
      <div className="section-label">MY STATS</div>
      <div style={{padding:"0 16px 16px"}}>
        <div style={{display:"flex",gap:8,padding:"10px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:14,alignItems:"center",justifyContent:"space-around"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"#ff6b35",letterSpacing:1}}>{totalMinutes.toLocaleString()}</div>
            <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>min logged</div>
          </div>
          <div style={{width:1,height:32,background:"var(--border)"}}/>
          <div style={{textAlign:"center",flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"var(--accent2)",letterSpacing:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topType}</div>
            <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>top workout</div>
          </div>
          <div style={{width:1,height:32,background:"var(--border)"}}/>
          <div style={{textAlign:"center",flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"var(--accent2)",letterSpacing:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topMuscle}</div>
            <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>top muscle</div>
          </div>
        </div>
      </div>

      {/* ── Workout type donut ── */}
      {typeData.length>0&&(
        <>
          <div className="section-label">WORKOUT TYPE BREAKDOWN</div>
          <div style={{padding:"0 16px 16px",display:"flex",alignItems:"center",gap:16}}>
            <svg width={100} height={100} viewBox="0 0 110 110" style={{flexShrink:0}}>
              {typeArcs.map((arc,i)=>(
                <circle key={i} cx={55} cy={55} r={38} fill="none" stroke={arc.color} strokeWidth={18}
                  strokeDasharray={`${arc.dash} ${2*Math.PI*38-arc.dash}`}
                  strokeDashoffset={-arc.offset} transform="rotate(-90 55 55)"/>
              ))}
              <text x={55} y={51} textAnchor="middle" fontSize={15} fontWeight="500" fill="rgba(255,255,255,0.9)">{typeData[0]?.pct}%</text>
              <text x={55} y={63} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)">{(typeData[0]?.label||"").split(" ")[0]}</text>
            </svg>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
              {typeData.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:2,background:DONUT_COLORS[i],flexShrink:0}}/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span>
                  <span style={{fontSize:11,fontFamily:"'Bebas Neue',cursive",color:"#fff",letterSpacing:1}}>{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Muscle group donut ── */}
      {muscleData.length>0&&(
        <>
          <div className="section-label">MUSCLE GROUP BREAKDOWN</div>
          <div style={{padding:"0 16px 16px",display:"flex",alignItems:"center",gap:16}}>
            <svg width={100} height={100} viewBox="0 0 110 110" style={{flexShrink:0}}>
              {muscleArcs.map((arc,i)=>(
                <circle key={i} cx={55} cy={55} r={38} fill="none" stroke={arc.color} strokeWidth={18}
                  strokeDasharray={`${arc.dash} ${2*Math.PI*38-arc.dash}`}
                  strokeDashoffset={-arc.offset} transform="rotate(-90 55 55)"/>
              ))}
              <text x={55} y={51} textAnchor="middle" fontSize={14} fontWeight="500" fill="rgba(255,255,255,0.9)">{muscleData[0]?.label?.split(" ")[0]}</text>
              <text x={55} y={63} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)">most trained</text>
            </svg>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
              {muscleData.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:2,background:DONUT_COLORS[i],flexShrink:0}}/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",flex:1}}>{item.label}</span>
                  <span style={{fontSize:11,fontFamily:"'Bebas Neue',cursive",color:"#fff",letterSpacing:1}}>{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Sessions per week bar chart ── */}
      <div className="section-label">SESSIONS PER WEEK</div>
      <div style={{padding:"0 16px 16px"}}>
        {weeklyData.map((week,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{fontSize:10,color:"var(--muted)",width:52,textAlign:"right",flexShrink:0}}>{week.label}</div>
            <div style={{flex:1,height:8,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,width:`${week.count/maxWeekly*100}%`,background:week.isCurrent?"#ff6b35":"#7F77DD",transition:"width 0.3s"}}/>
            </div>
            <div style={{fontSize:10,color:week.isCurrent?"#ff6b35":"var(--muted)",width:14,textAlign:"right",flexShrink:0,fontFamily:"'Bebas Neue',cursive"}}>{week.count}</div>
          </div>
        ))}
        <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>Current week in orange</div>
      </div>

      <div className="section-label">BADGES</div>
      <div className="badge-grid" style={{marginBottom:16}}>
        {BADGES.map(b=>{const earned=mb.includes(b.id);return<div key={b.id} className={`badge-item ${earned?"earned":"locked"}`}><div style={{fontSize:28,marginBottom:4}}>{b.icon}</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1}}>{b.label}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2,lineHeight:1.3}}>{b.desc}</div></div>;})}
      </div>
      <div className="section-label">PACK COMPARISON</div>
      {[...members].sort((a,b)=>getTotalWorkouts(history,b)-getTotalWorkouts(history,a)).map((m,i)=>{
        const t=getTotalWorkouts(history,m),s=getStreak(history,m,profiles[m]),mx=Math.max(...members.map(x=>getTotalWorkouts(history,x)),1);
        return<div key={m} className="member-row" style={{margin:"0 16px 8px"}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"var(--muted)",width:22}}>{i+1}</div><AvatarDisplay profile={profiles[m]} size={36}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1}}>{m}{m===currentUser&&" (you)"}</span><span style={{fontSize:12,color:"var(--muted)"}}>{t} workouts</span></div><div className="progress-bar" style={{height:4}}><div className="progress-fill" style={{width:`${(t/mx)*100}%`}}/></div><div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>🔥{s} day streak</div></div></div>;
      })}
      <div className="section-label">MY WORKOUT HISTORY</div>
      <WorkoutHistorySection currentUser={currentUser} history={history} onEditExercises={onEditExercises}/>
    </div>
  );
}
