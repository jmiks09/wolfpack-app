import { AvatarDisplay } from "../../components/AvatarDisplay";
import { isRestDay, todayStr } from "../../lib/dates";
import { getQuote, getStreak, getTotalWorkouts } from "../../lib/stats";
import { MemberCard } from "./MemberCard";
import { MyWeekStrip } from "./MyWeekStrip";
import { PackGoals } from "./PackGoals";

export function PackTab({currentUser,members,profiles,history,sharedData,onLogWorkout,onOpenAITrainer,onOpenNutrition,onOpenMealScanner,onEditWorkout,adminName,onOpenAdmin,packGoals,onAddGoal,onCheer,onDeleteGoal,onOpenProfile,reactions,onReact,weeklyRecap,onDismissRecap}){
  const key=todayStr(),td=sharedData[key]||{},my=td[currentUser],str=getStreak(history,currentUser,profiles[currentUser]),tot=getTotalWorkouts(history,currentUser),we=isRestDay(key,profiles[currentUser]);
  const sorted=[...members].sort((a,b)=>{const sa=getStreak(history,a,profiles[a]),sb=getStreak(history,b,profiles[b]);if(sb!==sa)return sb-sa;return b===currentUser?1:a===currentUser?-1:0;});

  return(
    <div>
      {/* ── COMPACT QUOTE ── subtle, not dominating */}
      <div style={{padding:"10px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",fontStyle:"italic",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>"{getQuote()}"</div>
      </div>

      {/* ── WEEKLY RECAP BANNER — top of screen, easy to see and dismiss ── */}
      {weeklyRecap&&!weeklyRecap.dismissed&&(
        <div style={{margin:"0 16px 8px",padding:"12px 14px",background:"rgba(124,92,191,0.1)",border:"1px solid rgba(124,92,191,0.25)",borderRadius:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--accent2)"}}>📊 LAST WEEK RECAP</div>
            <button onClick={onDismissRecap} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:18,lineHeight:1,padding:"0 2px"}}>×</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {weeklyRecap.stats?.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <AvatarDisplay profile={profiles[s.name]} size={20}/>
                  <span style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{s.name}</span>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:11,color:"var(--muted)"}}>{s.days} days</span>
                  <span style={{fontSize:11,color:s.days>=5?"var(--green)":s.days>=3?"var(--orange)":"var(--red)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                    {s.days>=5?"🔥 Crushed it":s.days>=3?"💪 Solid":s.days>0?"📈 Keep going":"😴 Rest week"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOG WORKOUT / REST DAY ── */}
      <div style={{padding:"4px 16px 8px"}}>
        {we?(
          <div style={{padding:"12px 16px",background:"var(--bg3)",borderRadius:14,textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:4}}>😴</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,color:"var(--muted)"}}>REST DAY — YOU EARNED IT</div>
          </div>
        ):!my?.done?(
          <button className="btn-primary" onClick={onLogWorkout} style={{background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>LOG TODAY'S WORKOUT</button>
        ):(
          <div style={{background:"rgba(46,204,113,0.08)",border:"1px solid rgba(46,204,113,0.25)",borderRadius:16,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:2,color:"var(--green)",marginBottom:3}}>✓ LOGGED · {my.time}</div>
                {Array.isArray(my.summary)
                  ?my.summary.map((line,i)=><div key={i} style={{fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5}}>{line}</div>)
                  :<div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>{my.workoutLabel}</div>
                }
                {my.note&&<div style={{fontSize:11,color:"var(--muted)",marginTop:3,fontStyle:"italic"}}>"{my.note}"</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button className="btn-ghost" onClick={onLogWorkout} style={{flex:1,fontSize:11,padding:"6px 0"}}>+ Log Another</button>
              <button onClick={onEditWorkout} style={{padding:"6px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,cursor:"pointer",color:"var(--muted)",fontSize:11}}>✏️ Edit</button>
            </div>
          </div>
        )}
      </div>

      {/* ── AI TOOLS ROW — compact icon buttons ── */}
      <div style={{padding:"0 16px 10px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {/* WOLFMODE */}
          <button onClick={onOpenAITrainer} style={{
            padding:"10px 8px",borderRadius:14,cursor:"pointer",textAlign:"center",
            background:"linear-gradient(135deg,rgba(255,107,53,0.18),rgba(124,92,191,0.2))",
            border:"1px solid rgba(255,107,53,0.4)",
            position:"relative",overflow:"hidden",
          }}>
            <style>{`@keyframes wolfPulse{0%{box-shadow:0 0 0 0 rgba(255,107,53,0.4)}50%{box-shadow:0 0 0 6px rgba(255,107,53,0)}100%{box-shadow:0 0 0 0 rgba(255,107,53,0)}}`}</style>
            <div style={{fontSize:22,marginBottom:3}}>🔥</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>THE WOLF</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:1}}>AI Coach</div>
          </button>

          {/* NUTRITION */}
          <button onClick={onOpenNutrition} style={{
            padding:"10px 8px",borderRadius:14,cursor:"pointer",textAlign:"center",
            background:"rgba(46,204,113,0.08)",
            border:"1px solid rgba(46,204,113,0.2)",
          }}>
            <div style={{fontSize:22,marginBottom:3}}>🥩</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:"var(--green)"}}>NUTRITION</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:1}}>
              {profiles[currentUser]?.aiTrainer?.coach?.lastPlan?"Plan ready":"Get your plan"}
            </div>
          </button>

          {/* MEAL SCANNER */}
          <button onClick={onOpenMealScanner} style={{
            padding:"10px 8px",borderRadius:14,cursor:"pointer",textAlign:"center",
            background:"rgba(255,107,53,0.06)",
            border:"1px solid rgba(255,107,53,0.15)",
          }}>
            <div style={{fontSize:22,marginBottom:3}}>📷</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:1.5,color:"#ff6b35"}}>MEAL SCAN</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:1}}>Snap & estimate</div>
          </button>
        </div>
      </div>

      {/* ── SINGLE COLUMN MEMBER CARDS ── */}
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:3,color:"var(--muted)",padding:"6px 16px 8px"}}>THE PACK</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 16px 16px"}}>
        {sorted.map((m,i)=>{
          const done=!!td[m]?.done,isMe=m===currentUser;
          const ms=getStreak(history,m,profiles[m]);
          const wt=td[m]?.workoutIcon||"";
          const restToday=isRestDay(key,profiles[m]);
          // Get exercises from either WOLFMODE session or manual log
          const sessionExercises=td[m]?.wolfmodeSession?.exercises||td[m]?.details?.lift?.exercises||[];
          const sessionMuscles=td[m]?.details?.lift?.muscles||[];
          return(
            <MemberCard key={m}
              m={m} i={i} done={done} isMe={isMe} ms={ms}
              restToday={restToday} td={td} profiles={profiles}
              sessionExercises={sessionExercises}
              sessionMuscles={sessionMuscles}
              onOpenProfile={onOpenProfile}
              history={history}
            />
          );
        })}
      </div>

      {/* Pack Goals — includes personal goals from profiles */}
      <PackGoals currentUser={currentUser} packGoals={packGoals} profiles={profiles} members={members} onAddGoal={onAddGoal} onCheer={onCheer} onDeleteGoal={onDeleteGoal}/>

      {/* ── MY WEEK ── */}
      <MyWeekStrip currentUser={currentUser} history={history}/>

      <div style={{height:16}}/>
    </div>
  );
}
