import { WHATS_NEW_FALLBACK } from "../lib/constants";
import { WolfIcon } from "./WolfIcon";

export function WhatsNewModal({onClose, whatsNewData}){
  const data=whatsNewData||WHATS_NEW_FALLBACK;
  return(
    <div className="modal-overlay" style={{zIndex:2000}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"88dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><WolfIcon size={48}/></div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WHAT'S NEW</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:2,letterSpacing:1}}>LATEST WOLFPACK UPDATES</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
          {(data.items||[]).map((item,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"10px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12}}>
              <div style={{fontSize:22,flexShrink:0,lineHeight:1.3}}>{item.icon}</div>
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:1.5,color:"#fff",marginBottom:2}}>{item.title}</div>
                <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={onClose} style={{width:"100%",background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
          GOT IT <WolfIcon size={16} style={{marginLeft:4}}/>
        </button>
      </div>
    </div>
  );
}
