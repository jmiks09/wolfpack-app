import { WOLF_ICON_SRC } from "../lib/constants";

export function WolfIcon({size=20, style={}}){
  return(
    <img
      src={WOLF_ICON_SRC}
      alt="🐺"
      style={{width:size,height:size,objectFit:"contain",display:"inline-block",verticalAlign:"middle",...style}}
    />
  );
}
