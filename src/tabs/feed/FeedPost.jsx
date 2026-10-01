import { useState } from "react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import { fmtTime } from "../../lib/dates";

export function FeedPost({post:p, currentUser, profiles, onLike, onDelete, onComment, onDeleteComment}){
  const [showComments,setShowComments]=useState(false);
  const [commentText,setCommentText]=useState("");
  const [showLikes,setShowLikes]=useState(false);
  const liked=(p.likes||[]).includes(currentUser);
  const isMe=p.author===currentUser;
  const comments=p.comments||[];

  const submitComment=()=>{
    if(!commentText.trim())return;
    onComment(p.id,commentText.trim());
    setCommentText("");
  };

  return(
    <div className="card">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <AvatarDisplay profile={profiles[p.author]} size={36}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1}}>{p.author}</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>{fmtTime(p.ts)}</div>
        </div>
        {isMe&&<button onClick={()=>onDelete(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,lineHeight:1}}>×</button>}
      </div>

      {/* Post text */}
      {p.text&&<div style={{fontSize:15,lineHeight:1.5,marginBottom:p.photo?8:12}}>{p.text}</div>}
      {p.photo&&<img src={p.photo} alt="post" style={{width:"100%",borderRadius:10,marginBottom:12,maxHeight:300,objectFit:"cover"}}/>}

      {/* Actions row */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:4}}>
        <button onClick={()=>onLike(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:liked?"var(--orange)":"var(--muted)",display:"flex",alignItems:"center",gap:4,fontSize:13}}>
          {liked?"🔥":"🤍"} {(p.likes||[]).length||0} {(p.likes||[]).length===1?"like":"likes"}
        </button>
        {(p.likes||[]).length>0&&(
          <button onClick={()=>setShowLikes(s=>!s)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:12,textDecoration:"underline"}}>
            {showLikes?"hide":"who liked?"}
          </button>
        )}
        <button onClick={()=>setShowComments(s=>!s)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex",alignItems:"center",gap:4,fontSize:13,marginLeft:"auto"}}>
          💬 {comments.length>0?comments.length:"Reply"}
        </button>
      </div>
      {showLikes&&(p.likes||[]).length>0&&(
        <div style={{marginBottom:8,padding:"8px 10px",background:"var(--bg3)",borderRadius:10,display:"flex",flexWrap:"wrap",gap:6}}>
          {(p.likes||[]).map(name=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",background:"var(--bg2)",borderRadius:20,fontSize:12}}>
              <AvatarDisplay profile={profiles[name]} size={16}/>
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      {(showComments||comments.length>0)&&(
        <div style={{borderTop:"1px solid var(--border)",paddingTop:10}}>
          {/* Existing comments */}
          {comments.map((c,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
              <AvatarDisplay profile={profiles[c.author]} size={26}/>
              <div style={{flex:1,background:"var(--bg3)",borderRadius:10,padding:"7px 10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,color:"var(--accent2)"}}>{c.author}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,color:"var(--muted)"}}>{fmtTime(c.ts)}</span>
                    {c.author===currentUser&&(
                      <button onClick={()=>onDeleteComment(p.id,i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:14,lineHeight:1,padding:0}}>×</button>
                    )}
                  </div>
                </div>
                <div style={{fontSize:13,color:"var(--text)",lineHeight:1.4}}>{c.text}</div>
              </div>
            </div>
          ))}

          {/* Comment input */}
          {showComments&&(
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <AvatarDisplay profile={profiles[currentUser]} size={26}/>
              <div style={{flex:1,display:"flex",gap:6}}>
                <input className="input" placeholder="Write a comment..." value={commentText}
                  onChange={e=>setCommentText(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&submitComment()}
                  style={{flex:1,padding:"8px 12px",fontSize:13}}/>
                <button onClick={submitComment} disabled={!commentText.trim()} style={{
                  padding:"8px 12px",background:"var(--accent)",border:"none",borderRadius:10,
                  cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',cursive",fontSize:12,letterSpacing:1,flexShrink:0
                }}>POST</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
