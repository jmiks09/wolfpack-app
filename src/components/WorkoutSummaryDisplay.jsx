export function WorkoutSummaryDisplay({summary, workoutLabel, style={}}){
  // summary can be string (old) or used workoutLabel
  // Parse stacked workout display
  if(!workoutLabel&&!summary) return null;
  const lines = workoutLabel ? workoutLabel.split(" + ") : [summary];
  return(
    <div style={style}>
      {lines.map((line,i)=><div key={i} style={{fontSize:12,color:"var(--green)",lineHeight:1.6}}>{line}</div>)}
    </div>
  );
}
