import { useRef, useState } from "react";
import { aiRecalculateMeal, aiScanMeal } from "../firebase";

// ── MEAL SCANNER MODAL ───────────────────────────────────────────────────────
export function MealScannerModal({onClose, currentUser}){
  const [step,setStep]=useState("pick"); // pick | scanning | recalculating | result | error
  const [scan,setScan]=useState(null);
  const [editedItems,setEditedItems]=useState([]);
  const [error,setError]=useState(null);
  const [preview,setPreview]=useState(null);
  const [showEditItems,setShowEditItems]=useState(false);
  const fileRef=useRef(null);

  const handleFile=async(file)=>{
    if(!file)return;
    // Show preview
    const reader=new FileReader();
    reader.onload=e=>setPreview(e.target.result);
    reader.readAsDataURL(file);
    // Compress image before sending — resize to max 800px and reduce quality
    const compress=()=>new Promise((resolve)=>{
      const img=new Image();
      img.onload=()=>{
        const MAX=800;
        let w=img.width,h=img.height;
        if(w>MAX||h>MAX){
          if(w>h){h=Math.round(h*MAX/w);w=MAX;}
          else{w=Math.round(w*MAX/h);h=MAX;}
        }
        const canvas=document.createElement("canvas");
        canvas.width=w;canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        const dataUrl=canvas.toDataURL("image/jpeg",0.7);
        resolve({base64:dataUrl.split(",")[1],mediaType:"image/jpeg"});
      };
      img.src=URL.createObjectURL(file);
    });
    setStep("scanning");
    try{
      const {base64,mediaType}=await compress();
      const result=await aiScanMeal(base64,mediaType,currentUser);
      if(result.ok){setScan(result.scan);setEditedItems(result.scan.items?.map(i=>({...i,edited:false}))||[]);setStep("result");}
      else{setError(result.error);setStep("error");}
    }catch(e){
      setError("Failed to process image. Try again.");
      setStep("error");
    }
  };

  const recalculate=async()=>{
    setStep("recalculating");
    try{
      const result=await aiRecalculateMeal(currentUser,editedItems.map(i=>({name:i.name,portionEstimate:i.portionEstimate||"medium serving"})));
      if(result.ok){setScan(result.scan);setEditedItems(result.scan.items?.map(i=>({...i,edited:false}))||[]);}
      setStep("result");
    }catch(e){setStep("result");}
  };

  const confidenceColor={high:"var(--green)",medium:"#EF9F27",low:"var(--red)"};
  const confidenceLabel={high:"High confidence",medium:"Moderate confidence",low:"Low confidence — complex dish"};

  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1200}}>
      <div className="modal" style={{maxHeight:"92dvh",overflowY:"auto"}}>
        <div className="modal-handle"/>

        {/* Pick */}
        {step==="pick"&&(
          <>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36,marginBottom:6}}>📷</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,background:"linear-gradient(90deg,#ff6b35,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MEAL SCANNER</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Take or upload a photo of your meal to estimate calories & macros</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
              <button onClick={()=>fileRef.current&&(fileRef.current.accept="image/*",fileRef.current.capture="environment",fileRef.current.click())} style={{padding:"16px",borderRadius:14,cursor:"pointer",background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.3)",display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:28}}>📷</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1.5,color:"#ff6b35"}}>TAKE A PHOTO</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>Use your camera</div>
                </div>
              </button>
              <button onClick={()=>fileRef.current&&(fileRef.current.accept="image/*",fileRef.current.removeAttribute("capture"),fileRef.current.click())} style={{padding:"16px",borderRadius:14,cursor:"pointer",background:"var(--bg3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:28}}>🖼️</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1.5,color:"#fff"}}>UPLOAD PHOTO</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>Choose from library</div>
                </div>
              </button>
            </div>
            <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,fontSize:11,color:"var(--muted)",lineHeight:1.5}}>
              💡 Tips for better accuracy: include a fork or hand for scale, good lighting, and show the whole plate
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
            <button className="btn-ghost" onClick={onClose} style={{width:"100%",marginTop:12}}>Cancel</button>
          </>
        )}

        {/* Scanning */}
        {step==="scanning"&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            {preview&&<img src={preview} alt="meal" style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:12,marginBottom:16}}/>}
            <div style={{fontSize:36,marginBottom:10,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔍</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,marginBottom:6}}>ANALYSING YOUR MEAL</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Estimating calories and macros...</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error */}
        {step==="error"&&(
          <div style={{textAlign:"center",padding:"30px 20px"}}>
            <div style={{fontSize:36,marginBottom:10}}>😬</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2,marginBottom:8}}>COULDN'T SCAN</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>{error}</div>
            <button className="btn-primary" onClick={()=>setStep("pick")} style={{maxWidth:200,margin:"0 auto"}}>TRY AGAIN</button>
          </div>
        )}

        {/* Recalculating */}
        {step==="recalculating"&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            {preview&&<img src={preview} alt="meal" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:12,marginBottom:16}}/>}
            <div style={{fontSize:36,marginBottom:10,animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔄</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,marginBottom:6}}>RECALCULATING</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>Updating calories with your corrections...</div>
          </div>
        )}

        {/* Result */}
        {step==="result"&&scan&&(
          <>
            {preview&&<img src={preview} alt="meal" style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:12,marginBottom:12}}/>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2}}>MEAL ESTIMATE</div>
              <span style={{fontSize:10,padding:"3px 8px",borderRadius:10,background:"rgba(255,255,255,0.06)",color:confidenceColor[scan.confidence]||"var(--muted)",border:`1px solid ${confidenceColor[scan.confidence]||"var(--border)"}`}}>
                {confidenceLabel[scan.confidence]||scan.confidence}
              </span>
            </div>

            {/* Total calories big display */}
            <div style={{padding:"14px",background:"linear-gradient(135deg,rgba(255,107,53,0.12),rgba(124,92,191,0.08))",border:"1px solid rgba(255,107,53,0.25)",borderRadius:14,marginBottom:12,textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:42,color:"#ff6b35",letterSpacing:2,lineHeight:1}}>{scan.totalCalories}</div>
              <div style={{fontSize:11,color:"var(--muted)",letterSpacing:1}}>ESTIMATED CALORIES</div>
            </div>

            {/* Macros row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {[{label:"Protein",val:scan.protein,color:"#7F77DD",unit:"g"},{label:"Carbs",val:scan.carbs,color:"#EF9F27",unit:"g"},{label:"Fat",val:scan.fat,color:"#D85A30",unit:"g"}].map(m=>(
                <div key={m.label} style={{padding:"10px 8px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:m.color,letterSpacing:1}}>{m.val}{m.unit}</div>
                  <div style={{fontSize:10,color:"var(--muted)"}}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Item breakdown — editable */}
            {editedItems.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--accent2)"}}>BREAKDOWN</div>
                  <button onClick={()=>setShowEditItems(e=>!e)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--muted)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                    {showEditItems?"DONE EDITING":"✏️ CORRECT ITEMS"}
                  </button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {editedItems.map((item,i)=>(
                    <div key={i} style={{padding:"7px 10px",background:"var(--bg3)",border:`1px solid ${item.edited?"rgba(255,107,53,0.4)":"var(--border)"}`,borderRadius:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          {showEditItems?(
                            <input
                              className="input"
                              value={item.name}
                              onChange={e=>setEditedItems(items=>items.map((it,idx)=>idx===i?{...it,name:e.target.value,edited:true}:it))}
                              style={{padding:"4px 8px",fontSize:12,width:"100%"}}
                            />
                          ):(
                            <div style={{fontSize:12,color:item.edited?"#ff6b35":"#fff",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                              {item.name}{item.edited&&<span style={{fontSize:9,color:"rgba(255,107,53,0.6)",marginLeft:6,fontFamily:"sans-serif"}}>edited</span>}
                            </div>
                          )}
                          <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{item.portionEstimate}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <div style={{fontSize:12,color:"#ff6b35",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{item.calories} cal</div>
                          {showEditItems&&<button onClick={()=>setEditedItems(items=>items.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,padding:"0 2px"}}>×</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {showEditItems&&(
                    <button onClick={()=>setEditedItems(items=>[...items,{name:"",calories:0,protein:0,carbs:0,fat:0,portionEstimate:"medium serving",edited:true}])}
                      style={{padding:"7px",borderRadius:10,cursor:"pointer",background:"rgba(255,255,255,0.03)",border:"1px dashed rgba(255,255,255,0.1)",color:"var(--muted)",fontSize:11,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>
                      + ADD ITEM
                    </button>
                  )}
                </div>
                {editedItems.some(i=>i.edited)&&!showEditItems&&(
                  <button onClick={()=>{
                    setShowEditItems(false);
                    recalculate();
                  }} style={{width:"100%",marginTop:8,padding:"10px",borderRadius:10,cursor:"pointer",background:"rgba(46,204,113,0.12)",border:"1px solid rgba(46,204,113,0.3)",color:"var(--green)",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1.5}}>
                    🔄 RECALCULATE WITH CORRECTIONS
                  </button>
                )}
              </div>
            )}

            {scan.note&&(
              <div style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,fontSize:11,color:"var(--muted)",lineHeight:1.5,marginBottom:12,fontStyle:"italic"}}>
                💭 {scan.note}
              </div>
            )}

            <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textAlign:"center",marginBottom:12}}>
              These are estimates only. Actual values may vary based on preparation and exact portions.
            </div>

            <div style={{display:"flex",gap:8}}>
              <button className="btn-primary" onClick={()=>{setStep("pick");setScan(null);setPreview(null);setEditedItems([]);setShowEditItems(false);}} style={{flex:1,background:"linear-gradient(135deg,#ff6b35,#9b59b6)",border:"none"}}>
                📷 SCAN ANOTHER
              </button>
              <button className="btn-ghost" onClick={onClose} style={{flex:1}}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
