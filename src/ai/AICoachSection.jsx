import { useState } from "react";
import { fsSet } from "../firebase";
import { CoachDisclaimerModal } from "./CoachDisclaimerModal";
import { CoachPlanModal } from "./CoachPlanModal";
import { CoachStatsModal } from "./CoachStatsModal";

export function AICoachSection({currentUser, profile, profiles, onSaveProfile}){
  const coach=profile?.aiTrainer?.coach||{};
  const enabled=!!coach.enabled;
  const acknowledged=!!coach.disclaimerAcknowledged;
  const [showDisclaimer,setShowDisclaimer]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const [showPlan,setShowPlan]=useState(false);

  const enableCoach=async()=>{
    // Open disclaimer modal first if they haven't accepted it before
    if(!acknowledged){
      setShowDisclaimer(true);
    }else{
      // Already accepted in the past — just flip the toggle on
      await persistCoach({enabled:true});
    }
  };

  const disableCoach=async()=>{
    await persistCoach({enabled:false});
  };

  const persistCoach=async(updates)=>{
    const updated={
      ...profile,
      aiTrainer:{
        ...(profile?.aiTrainer||{}),
        coach:{...coach,...updates},
      },
    };
    const np={...profiles,[currentUser]:updated};
    await fsSet("wolfpack/profiles",{users:np});
    if(onSaveProfile)onSaveProfile(np);
  };

  return(
    <>
      <div style={{
        marginTop:20,
        padding:"14px 16px",
        background:"linear-gradient(135deg, rgba(255,107,53,0.06), rgba(124,92,191,0.06))",
        border:"1px solid var(--border)",
        borderRadius:14,
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>🥩</span>
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:2,color:"var(--accent2)"}}>NUTRITION & SUPPLEMENTS</div>
              <div style={{fontSize:10,color:"var(--muted)"}}>Optional · macros + supp suggestions</div>
            </div>
          </div>
          <button
            onClick={enabled?disableCoach:enableCoach}
            style={{
              padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:11,
              background:enabled?"rgba(46,204,113,0.15)":"var(--bg3)",
              border:enabled?"1px solid var(--green)":"1px solid var(--border)",
              color:enabled?"var(--green)":"var(--muted)",
              fontFamily:"'Bebas Neue',cursive",letterSpacing:1.5,
            }}>
            {enabled?"✓ ENABLED":"+ ENABLE"}
          </button>
        </div>
        {!enabled&&(
          <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5,marginTop:6}}>
            Want the AI to suggest calories, macros, and supplements based on your goal? Enable this and it'll personalize a plan. It's purely informational — not medical advice.
          </div>
        )}
        {enabled&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>
            <button className="btn-ghost" onClick={()=>setShowStats(true)} style={{justifyContent:"flex-start",padding:"10px 12px",fontSize:12}}>
              {coach.stats?"✏️ Edit my stats":"📝 Enter my stats (required)"}
            </button>
            {coach.stats&&(
              <button className="btn-primary" onClick={()=>setShowPlan(true)} style={{fontSize:12,padding:"10px 12px"}}>
                🤖 GET MY NUTRITION & SUPP PLAN
              </button>
            )}
            {coach.lastPlan&&(
              <button className="btn-ghost" onClick={()=>setShowPlan(true)} style={{justifyContent:"flex-start",padding:"8px 12px",fontSize:11,color:"var(--muted)"}}>
                📋 View last plan ({new Date(coach.lastPlan.generatedAt).toLocaleDateString()})
              </button>
            )}
          </div>
        )}
      </div>

      {showDisclaimer&&(
        <CoachDisclaimerModal
          onAccept={async()=>{
            await persistCoach({enabled:true,disclaimerAcknowledged:true,disclaimerAcceptedAt:Date.now()});
            setShowDisclaimer(false);
          }}
          onClose={()=>setShowDisclaimer(false)}
        />
      )}

      {showStats&&(
        <CoachStatsModal
          coach={coach}
          onSave={async(stats)=>{
            await persistCoach({stats});
            setShowStats(false);
          }}
          onClose={()=>setShowStats(false)}
        />
      )}

      {showPlan&&(
        <CoachPlanModal
          currentUser={currentUser}
          profile={profile}
          coach={coach}
          onPlanGenerated={async(plan)=>{
            await persistCoach({lastPlan:{...plan,generatedAt:Date.now()}});
          }}
          onClose={()=>setShowPlan(false)}
        />
      )}
    </>
  );
}
