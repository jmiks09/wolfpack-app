// Colors and labels for weekly habit chips.
export function chipColor(s){
  if(s.passed===true)return {bg:"rgba(46,204,113,0.15)",bd:"rgba(46,204,113,0.4)",fg:"var(--green)"};
  if(s.passed===false||s.failing)return {bg:"rgba(231,76,60,0.12)",bd:"rgba(231,76,60,0.35)",fg:"var(--red)"};
  return {bg:"var(--bg2)",bd:"var(--border)",fg:"var(--muted)"};
}
export function chipText(h,s){
  if(s.kind==="count")return `${s.count}/${s.target}`;
  if(s.misses>0)return `${s.misses} miss${s.misses===1?"":"es"}`;
  return s.hits>0||s.passed?"✓":"–";
}
