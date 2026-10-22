import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import { CHAT_REACTIONS, buildChatRows } from "../../lib/chat";
import { compressImage, readFileAsDataURL } from "../../lib/utils";

const bebas = {fontFamily:"'Bebas Neue',cursive",letterSpacing:2};
const timeOf = ts => new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const snippet = (t,n=60) => (t||"").length>n?t.slice(0,n)+"…":(t||"");

function Reactions({msg,currentUser,onReact,align}){
  const list=Object.entries(msg.reactions||{}).filter(([,u])=>u?.length);
  if(!list.length)return null;
  return(
    <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:align,marginTop:3}}>
      {list.map(([e,users])=>{const mine=users.includes(currentUser);return(
        <button key={e} onClick={()=>onReact(msg,e,!mine)} title={users.join(", ")} aria-label={`${e} ${users.length}, ${mine?"remove yours":"add yours"}`}
          style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:12,fontSize:12,cursor:"pointer",background:mine?"rgba(124,92,191,0.25)":"var(--bg3)",border:mine?"1px solid var(--accent)":"1px solid var(--border)",color:"var(--text)"}}>
          <span>{e}</span><span style={{fontSize:11}}>{users.length}</span>
        </button>);})}
    </div>
  );
}

// One message with long-press for actions and swipe-right to reply.
function Bubble({row,currentUser,profiles,onAction,onReply,onReact,onPhoto}){
  const m=row.msg, mine=m.author===currentUser;
  const [dx,setDx]=useState(0);
  const press=useRef(null), start=useRef(null);
  const cancel=()=>{clearTimeout(press.current);press.current=null;};
  const handlers=m.deleted?{}:{
    onContextMenu:e=>{e.preventDefault();onAction(m);},
    onPointerDown:()=>{press.current=setTimeout(()=>{press.current=null;onAction(m);},450);},
    onPointerUp:cancel,onPointerLeave:cancel,onPointerCancel:cancel,
    onTouchStart:e=>{start.current={x:e.touches[0].clientX,y:e.touches[0].clientY};},
    onTouchMove:e=>{if(!start.current)return;const x=e.touches[0].clientX-start.current.x,y=Math.abs(e.touches[0].clientY-start.current.y);if(y>12||x<0){setDx(0);if(y>12)cancel();return;}if(x>8)cancel();setDx(Math.min(x,70));},
    onTouchEnd:()=>{if(dx>50)onReply(m);setDx(0);start.current=null;},
  };

  if(m.kind==="system")return(
    <div style={{textAlign:"center",fontSize:11,color:"var(--muted)",padding:"6px 24px",lineHeight:1.5}}>{m.text}</div>
  );
  if(m.kind==="activity")return(
    <div style={{margin:"6px 0",display:"flex",flexDirection:"column",alignItems:"center"}} {...handlers}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(46,204,113,0.08)",border:"1px solid rgba(46,204,113,0.25)",borderRadius:14,maxWidth:"92%",transform:`translateX(${dx}px)`,userSelect:"none",WebkitUserSelect:"none"}}>
        <AvatarDisplay profile={profiles[m.author]} size={28}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13}}><b>{m.author}</b> {m.text}</div>
          {m.detail&&<div style={{fontSize:11,color:m.late?"var(--orange)":"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.detail}</div>}
        </div>
        <div style={{fontSize:10,color:"var(--muted)",flexShrink:0}}>{timeOf(m.ts)}</div>
      </div>
      {m.photo&&<img src={m.photo} alt={`Proof from ${m.author}`} onClick={()=>onPhoto(m.photo)} style={{marginTop:6,maxWidth:"70%",maxHeight:220,borderRadius:12,cursor:"zoom-in"}}/>}
      <Reactions msg={m} currentUser={currentUser} onReact={onReact} align="center"/>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:mine?"row-reverse":"row",alignItems:"flex-end",gap:6,marginTop:row.first?10:2}}>
      {!mine&&<div style={{width:28,flexShrink:0}}>{row.last&&<AvatarDisplay profile={profiles[m.author]} size={28}/>}</div>}
      <div style={{maxWidth:"78%",display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start"}}>
        {!mine&&row.first&&<div style={{fontSize:11,color:"var(--accent2)",margin:"0 0 2px 10px"}}>{m.author}</div>}
        <div {...handlers} style={{transform:`translateX(${dx}px)`,transition:dx?"none":"transform .15s",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",
          padding:m.photo&&!m.text?4:"8px 12px",borderRadius:18,
          borderBottomRightRadius:mine&&row.last?6:18,borderBottomLeftRadius:!mine&&row.last?6:18,
          background:m.deleted?"transparent":mine?"linear-gradient(135deg,#7c5cbf,#9b59b6)":"var(--bg3)",
          border:m.deleted?"1px dashed var(--border)":mine?"none":"1px solid var(--border)",
          color:m.deleted?"var(--muted)":"var(--text)",fontSize:15,lineHeight:1.35,wordBreak:"break-word",whiteSpace:"pre-wrap"}}>
          {m.replyTo&&!m.deleted&&<div style={{fontSize:12,padding:"4px 8px",marginBottom:4,borderLeft:"3px solid rgba(255,255,255,0.5)",background:"rgba(0,0,0,0.18)",borderRadius:6,opacity:0.9}}>
            <b>{m.replyTo.author}</b><div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.replyTo.text||"📷 Photo"}</div></div>}
          {m.deleted?<i style={{fontSize:13}}>Message deleted</i>:<>
            {m.photo&&<img src={m.photo} alt={`Photo from ${m.author}`} onClick={()=>onPhoto(m.photo)} style={{display:"block",maxWidth:"100%",maxHeight:280,borderRadius:14,cursor:"zoom-in",marginBottom:m.text?6:0}}/>}
            {m.text}
          </>}
        </div>
        <Reactions msg={m} currentUser={currentUser} onReact={onReact} align={mine?"flex-end":"flex-start"}/>
        {row.last&&<div style={{fontSize:10,color:"var(--muted)",margin:"2px 6px 0"}}>{timeOf(m.ts)}{m.edited&&!m.deleted?" · edited":""}</div>}
      </div>
    </div>
  );
}

// ── CHAT TAB ──────────────────────────────────────────────────────────────────
export function ChatTab({groupName,messages,currentUser,profiles,today,dividerTs,canLoadMore,onLoadMore,legacyCount,onOpenLegacy,onSend,onEdit,onDelete,onReact,onSeen}){
  const [text,setText]=useState("");
  const [photo,setPhoto]=useState(null);
  const [replyTo,setReplyTo]=useState(null);
  const [editing,setEditing]=useState(null);
  const [action,setAction]=useState(null);
  const [viewPhoto,setViewPhoto]=useState(null);
  const [sending,setSending]=useState(false);
  const [atBottom,setAtBottom]=useState(true);
  const [confirmDel,setConfirmDel]=useState(false);
  const topRef=useRef(),endRef=useRef(),inputRef=useRef(),fileRef=useRef();
  const scroller=()=>topRef.current?.closest(".scroll");
  const rows=buildChatRows(messages,today);
  const firstUnread=messages.find(m=>m.ts>dividerTs&&m.author!==currentUser&&m.kind!=="system");
  const lastTs=messages.length?messages[messages.length-1].ts:0;
  const prevLen=useRef(0),prevFirst=useRef(null),prevHeight=useRef(0);

  // Keep position when older messages load; follow new ones when already at the bottom.
  useLayoutEffect(()=>{
    const el=scroller();if(!el)return;
    const first=messages[0]?.id;
    if(prevLen.current===0)el.scrollTop=el.scrollHeight;
    else if(first!==prevFirst.current&&prevFirst.current)el.scrollTop+=el.scrollHeight-prevHeight.current;
    else if(messages.length>prevLen.current&&(atBottom||messages[messages.length-1]?.author===currentUser))el.scrollTop=el.scrollHeight;
    prevLen.current=messages.length;prevFirst.current=first;prevHeight.current=el.scrollHeight;
  },[messages,atBottom,currentUser]);
  useEffect(()=>{
    const el=scroller();if(!el)return;
    const onScroll=()=>setAtBottom(el.scrollHeight-el.scrollTop-el.clientHeight<80);
    el.addEventListener("scroll",onScroll);return()=>el.removeEventListener("scroll",onScroll);
  },[]);
  useEffect(()=>{if(lastTs)onSeen(lastTs);},[lastTs,onSeen]);

  const pickPhoto=async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;setPhoto(await compressImage(await readFileAsDataURL(f),600,0.7));};
  const send=async()=>{
    const t=text.trim();
    if(sending||(!t&&!photo))return;
    setSending(true);
    try{
      if(editing){if(t&&t!==editing.text)await onEdit(editing,t);setEditing(null);}
      else await onSend({text:t,photo,replyTo:replyTo?{id:replyTo.id,author:replyTo.author,text:snippet(replyTo.text,80)}:null});
      setText("");setPhoto(null);setReplyTo(null);
      if(inputRef.current)inputRef.current.style.height="auto";
    }finally{setSending(false);}
  };
  const startReply=m=>{setEditing(null);setReplyTo(m);inputRef.current?.focus();};
  const grow=e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,110)+"px";};

  return(
    <div ref={topRef} style={{padding:`0 12px ${replyTo||editing||photo?150:76}px`}}>
      {canLoadMore&&<button className="btn-ghost" style={{display:"block",margin:"4px auto 8px",fontSize:12,padding:"6px 14px"}} onClick={onLoadMore}>Load earlier messages</button>}
      {!canLoadMore&&legacyCount>0&&<button className="btn-ghost" style={{display:"block",margin:"4px auto 8px",fontSize:12,padding:"6px 14px"}} onClick={onOpenLegacy}>📜 Old feed posts ({legacyCount})</button>}
      {messages.length===0&&<div style={{textAlign:"center",padding:"60px 24px",color:"var(--muted)"}}>
        <div style={{fontSize:40}}>💬</div>
        <div style={{...bebas,fontSize:20,color:"var(--text)",marginTop:8}}>{groupName} CHAT</div>
        <div style={{fontSize:13,marginTop:6,lineHeight:1.5}}>Only members of this group can see it. Say hi to your pack.</div>
      </div>}

      {rows.map(r=>r.type==="day"
        ?<div key={r.key} style={{textAlign:"center",margin:"14px 0 4px"}}><span style={{fontSize:11,color:"var(--muted)",background:"var(--bg2)",padding:"3px 10px",borderRadius:10}}>{r.label}</span></div>
        :<div key={r.key}>
          {firstUnread?.id===r.msg.id&&<div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0",color:"var(--accent2)",fontSize:11}}><div style={{flex:1,height:1,background:"var(--accent)"}}/>New messages<div style={{flex:1,height:1,background:"var(--accent)"}}/></div>}
          <Bubble row={r} currentUser={currentUser} profiles={profiles} onAction={setAction} onReply={startReply} onReact={onReact} onPhoto={setViewPhoto}/>
        </div>)}
      <div ref={endRef}/>

      {!atBottom&&messages.length>0&&<button onClick={()=>{const el=scroller();el&&(el.scrollTop=el.scrollHeight);}} aria-label="Jump to newest"
        style={{position:"fixed",right:"max(16px, calc(50% - 199px))",bottom:"calc(var(--nav-h) + 80px)",width:40,height:40,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--text)",fontSize:18,cursor:"pointer",zIndex:90}}>↓</button>}

      {/* Composer, pinned above the bottom nav */}
      <div style={{position:"fixed",left:"50%",transform:"translateX(-50%)",bottom:"var(--nav-h)",width:"100%",maxWidth:430,background:"rgba(10,10,15,0.97)",borderTop:"1px solid var(--border)",padding:"8px 10px",zIndex:95}}>
        {(replyTo||editing)&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",marginBottom:6,background:"var(--bg3)",borderLeft:"3px solid var(--accent)",borderRadius:8,fontSize:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"var(--accent2)"}}>{editing?"Editing message":`Replying to ${replyTo.author}`}</div>
            <div style={{color:"var(--muted)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{snippet((editing||replyTo).text,80)||"📷 Photo"}</div>
          </div>
          <button onClick={()=>{setReplyTo(null);if(editing){setEditing(null);setText("");}}} aria-label="Cancel" style={{background:"none",border:"none",color:"var(--muted)",fontSize:16,cursor:"pointer"}}>✕</button>
        </div>}
        {photo&&<div style={{position:"relative",display:"inline-block",marginBottom:6}}>
          <img src={photo} alt="Photo to send" style={{height:64,borderRadius:10,display:"block"}}/>
          <button onClick={()=>setPhoto(null)} aria-label="Remove photo" style={{position:"absolute",top:-6,right:-6,width:22,height:22,borderRadius:"50%",background:"var(--bg)",border:"1px solid var(--border)",color:"var(--text)",fontSize:11,cursor:"pointer"}}>✕</button>
        </div>}
        <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
          {!editing&&<button onClick={()=>fileRef.current.click()} aria-label="Add photo" style={{width:38,height:38,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border)",fontSize:16,cursor:"pointer",flexShrink:0}}>📷</button>}
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={pickPhoto}/>
          <textarea ref={inputRef} className="input" rows={1} value={text} placeholder={`Message ${groupName}`} aria-label="Message"
            onChange={e=>{setText(e.target.value);grow(e);}} enterKeyHint="send"
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            style={{flex:1,resize:"none",padding:"9px 14px",borderRadius:20,fontSize:15,lineHeight:1.3,maxHeight:110,overflowY:"auto"}}/>
          <button onClick={send} disabled={sending||(!text.trim()&&!photo)} aria-label={editing?"Save edit":"Send"}
            style={{width:38,height:38,borderRadius:"50%",border:"none",flexShrink:0,cursor:"pointer",fontSize:16,color:"#fff",background:(text.trim()||photo)?"linear-gradient(135deg,#ff6b35,#9b59b6)":"var(--bg3)"}}>{editing?"✓":"➤"}</button>
        </div>
      </div>

      {/* Long-press actions */}
      {action&&<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setAction(null);setConfirmDel(false);}}}>
        <div className="modal">
          <div className="modal-handle"/>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{action.author?`${action.author}: `:""}{snippet(action.text,70)||"📷 Photo"}</div>
          <div style={{display:"flex",justifyContent:"space-around",marginBottom:12}}>
            {CHAT_REACTIONS.map(e=>{const on=(action.reactions?.[e]||[]).includes(currentUser);return(
              <button key={e} onClick={()=>{onReact(action,e,!on);setAction(null);}} aria-label={`React ${e}`} aria-pressed={on}
                style={{fontSize:26,width:50,height:50,borderRadius:"50%",cursor:"pointer",background:on?"rgba(124,92,191,0.3)":"var(--bg3)",border:on?"1px solid var(--accent)":"1px solid var(--border)"}}>{e}</button>);})}
          </div>
          {action.kind!=="system"&&<button className="btn-ghost" style={{width:"100%",marginBottom:8}} onClick={()=>{startReply(action);setAction(null);}}>↩ Reply</button>}
          {action.text&&<button className="btn-ghost" style={{width:"100%",marginBottom:8}} onClick={()=>{navigator.clipboard?.writeText(action.text).catch(()=>{});setAction(null);}}>Copy text</button>}
          {action.author===currentUser&&action.kind==="msg"&&<>
            {action.text&&<button className="btn-ghost" style={{width:"100%",marginBottom:8}} onClick={()=>{setReplyTo(null);setEditing(action);setText(action.text);setAction(null);setTimeout(()=>inputRef.current?.focus(),50);}}>✏️ Edit</button>}
            {confirmDel
              ?<button onClick={async()=>{await onDelete(action);setAction(null);setConfirmDel(false);}} style={{width:"100%",padding:12,background:"var(--red)",border:"none",borderRadius:12,color:"#fff",cursor:"pointer",...bebas,fontSize:16}}>YES, DELETE IT</button>
              :<button onClick={()=>setConfirmDel(true)} style={{width:"100%",padding:10,background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:14}}>Delete message</button>}
          </>}
        </div>
      </div>}

      {viewPhoto&&<div onClick={()=>setViewPhoto(null)} role="dialog" aria-label="Photo" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16,cursor:"zoom-out"}}>
        <img src={viewPhoto} alt="Full size" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:8}}/>
      </div>}
    </div>
  );
}
