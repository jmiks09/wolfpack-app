import { getMuscleMapping } from "../lib/muscles";

export function AnatomyDiagram({primaryMuscle}){
  const mapping=getMuscleMapping(primaryMuscle);
  const allPrimary=[...mapping.front,...mapping.back];
  const secondary=mapping.secondary||[];

  const getFill=(muscleId, view)=>{
    const relevantPrimary=view==="front"?mapping.front:mapping.back;
    if(relevantPrimary.includes(muscleId)) return "#ff6b35"; // primary — orange
    if(secondary.includes(muscleId)) return "rgba(255,107,53,0.3)"; // secondary — dim
    return "rgba(255,255,255,0.06)"; // inactive
  };
  const getOpacity=(muscleId, view)=>{
    const relevantPrimary=view==="front"?mapping.front:mapping.back;
    if(relevantPrimary.includes(muscleId)) return 1;
    if(secondary.includes(muscleId)) return 0.6;
    return 1;
  };

  const FrontBody=()=>(
    <svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",maxWidth:90}}>
      {/* Body outline */}
      <ellipse cx="50" cy="18" rx="12" ry="13" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
      {/* Neck */}
      <rect x="44" y="28" width="12" height="8" rx="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
      {/* Shoulders */}
      <ellipse id="front-delt-l" cx="30" cy="42" rx="9" ry="7" fill={getFill("front-delt","front")} opacity={getOpacity("front-delt","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="front-delt-r" cx="70" cy="42" rx="9" ry="7" fill={getFill("front-delt","front")} opacity={getOpacity("front-delt","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Chest */}
      <path id="chest-l" d="M38,36 Q50,34 50,48 Q44,52 36,48 Z" fill={getFill("chest","front")} opacity={getOpacity("chest","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <path id="chest-r" d="M62,36 Q50,34 50,48 Q56,52 64,48 Z" fill={getFill("chest","front")} opacity={getOpacity("chest","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Biceps */}
      <ellipse id="biceps-l" cx="24" cy="62" rx="6" ry="10" fill={getFill("biceps","front")} opacity={getOpacity("biceps","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="biceps-r" cx="76" cy="62" rx="6" ry="10" fill={getFill("biceps","front")} opacity={getOpacity("biceps","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Forearms */}
      <ellipse id="forearms-l" cx="20" cy="84" rx="5" ry="10" fill={getFill("forearms","front")} opacity={getOpacity("forearms","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="forearms-r" cx="80" cy="84" rx="5" ry="10" fill={getFill("forearms","front")} opacity={getOpacity("forearms","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Abs */}
      <rect id="abs" x="41" y="52" width="18" height="26" rx="4" fill={getFill("abs","front")} opacity={getOpacity("abs","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Obliques */}
      <path id="obliques-l" d="M36,52 Q40,52 41,58 Q38,68 36,72 Q32,68 33,58 Z" fill={getFill("obliques","front")} opacity={getOpacity("obliques","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <path id="obliques-r" d="M64,52 Q60,52 59,58 Q62,68 64,72 Q68,68 67,58 Z" fill={getFill("obliques","front")} opacity={getOpacity("obliques","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Quads */}
      <ellipse id="quads-l" cx="40" cy="110" rx="9" ry="22" fill={getFill("quads","front")} opacity={getOpacity("quads","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="quads-r" cx="60" cy="110" rx="9" ry="22" fill={getFill("quads","front")} opacity={getOpacity("quads","front")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Knees */}
      <ellipse cx="40" cy="136" rx="7" ry="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      <ellipse cx="60" cy="136" rx="7" ry="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      {/* Calves front */}
      <ellipse cx="40" cy="162" rx="7" ry="16" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse cx="60" cy="162" rx="7" ry="16" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Feet */}
      <ellipse cx="40" cy="182" rx="8" ry="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      <ellipse cx="60" cy="182" rx="8" ry="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      {/* Label */}
      <text x="50" y="200" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="sans-serif">FRONT</text>
    </svg>
  );

  const BackBody=()=>(
    <svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",maxWidth:90}}>
      {/* Head */}
      <ellipse cx="50" cy="18" rx="12" ry="13" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
      {/* Neck */}
      <rect x="44" y="28" width="12" height="8" rx="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
      {/* Traps */}
      <path id="traps" d="M38,34 Q50,30 62,34 Q58,44 50,46 Q42,44 38,34 Z" fill={getFill("traps","back")} opacity={getOpacity("traps","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Rear delts */}
      <ellipse id="rear-delt-l" cx="30" cy="42" rx="9" ry="7" fill={getFill("rear-delt","back")} opacity={getOpacity("rear-delt","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="rear-delt-r" cx="70" cy="42" rx="9" ry="7" fill={getFill("rear-delt","back")} opacity={getOpacity("rear-delt","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Lats */}
      <path id="lats-l" d="M36,42 Q38,44 39,78 Q36,80 32,72 Q28,60 30,48 Z" fill={getFill("lats","back")} opacity={getOpacity("lats","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <path id="lats-r" d="M64,42 Q62,44 61,78 Q64,80 68,72 Q72,60 70,48 Z" fill={getFill("lats","back")} opacity={getOpacity("lats","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Triceps */}
      <ellipse id="triceps-l" cx="24" cy="62" rx="6" ry="10" fill={getFill("triceps","back")} opacity={getOpacity("triceps","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="triceps-r" cx="76" cy="62" rx="6" ry="10" fill={getFill("triceps","back")} opacity={getOpacity("triceps","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Lower back */}
      <rect x="40" y="72" width="20" height="16" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Glutes */}
      <ellipse id="glutes-l" cx="41" cy="96" rx="10" ry="11" fill={getFill("glutes","back")} opacity={getOpacity("glutes","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="glutes-r" cx="59" cy="96" rx="10" ry="11" fill={getFill("glutes","back")} opacity={getOpacity("glutes","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Hamstrings */}
      <ellipse id="hamstrings-l" cx="40" cy="122" rx="9" ry="18" fill={getFill("hamstrings","back")} opacity={getOpacity("hamstrings","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="hamstrings-r" cx="60" cy="122" rx="9" ry="18" fill={getFill("hamstrings","back")} opacity={getOpacity("hamstrings","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Calves */}
      <ellipse id="calves-l" cx="40" cy="158" rx="7" ry="15" fill={getFill("calves","back")} opacity={getOpacity("calves","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      <ellipse id="calves-r" cx="60" cy="158" rx="7" ry="15" fill={getFill("calves","back")} opacity={getOpacity("calves","back")} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      {/* Feet */}
      <ellipse cx="40" cy="178" rx="8" ry="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      <ellipse cx="60" cy="178" rx="8" ry="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      {/* Label */}
      <text x="50" y="196" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="sans-serif">BACK</text>
    </svg>
  );

  return(
    <div style={{marginTop:12,marginBottom:4}}>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:10,letterSpacing:2,color:"var(--muted)",marginBottom:6,textAlign:"center"}}>
        MUSCLES WORKED
        {allPrimary.length>0&&(
          <span style={{color:"#ff6b35",marginLeft:6}}>
            {[...new Set(allPrimary)].map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(" · ")}
          </span>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:16,padding:"8px 0"}}>
        <FrontBody/>
        <BackBody/>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:16,fontSize:9,color:"var(--muted)",marginTop:4}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#ff6b35",display:"inline-block"}}/>
          Primary
        </span>
        <span style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"rgba(255,107,53,0.3)",display:"inline-block"}}/>
          Secondary
        </span>
      </div>
    </div>
  );
}
