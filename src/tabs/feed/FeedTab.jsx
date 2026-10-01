import { useRef, useState } from "react";
import { WolfIcon } from "../../components/WolfIcon";
import { compressImage, readFileAsDataURL } from "../../lib/utils";
import { FeedPost } from "./FeedPost";

export function FeedTab({currentUser,profiles,feed,onPost,onLike,onDelete,onComment,onDeleteComment}){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [photo,setPhoto]=useState(null);
  const photoRef=useRef();
  const sub=()=>{if(!text.trim()&&!photo)return;onPost(text.trim(),photo);setText("");setPhoto(null);setOpen(false);};
  return(
    <div>
      <div style={{padding:"12px 16px 8px"}}>
        <button className="btn-primary" onClick={()=>setOpen(true)}>💬 POST TO THE PACK</button>
      </div>
      {feed.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><WolfIcon size={48}/></div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>THE FEED IS EMPTY</div>
        </div>
      )}
      {feed.map(p=>(
        <FeedPost key={p.id} post={p} currentUser={currentUser} profiles={profiles}
          onLike={onLike} onDelete={onDelete} onComment={onComment} onDeleteComment={onDeleteComment}/>
      ))}
      {open&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:14}}>POST TO THE PACK</div>
            <textarea className="input" rows={3} placeholder="What's on your mind, wolf?..."
              value={text} onChange={e=>setText(e.target.value)} style={{resize:"none",marginBottom:10}} autoFocus/>
            {/* Photo preview */}
            {photo&&(
              <div style={{position:"relative",marginBottom:10}}>
                <img src={photo} alt="post" style={{width:"100%",borderRadius:10,maxHeight:200,objectFit:"cover"}}/>
                <button onClick={()=>setPhoto(null)} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            )}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>photoRef.current.click()} style={{padding:"8px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--muted)",fontSize:13}}>📷 Photo</button>
              <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const raw=await readFileAsDataURL(f);const comp=await compressImage(raw,600);setPhoto(comp);}}/>
            </div>
            <button className="btn-primary" onClick={sub} disabled={!text.trim()&&!photo}>POST 🐺</button>
          </div>
        </div>
      )}
    </div>
  );
}
