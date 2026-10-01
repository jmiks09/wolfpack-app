export function launchConfetti(){const cv=document.getElementById("confetti-canvas");if(!cv)return;const ctx=cv.getContext("2d");cv.width=window.innerWidth;cv.height=window.innerHeight;const ps=Array.from({length:80},()=>({x:Math.random()*cv.width,y:-10,r:Math.random()*6+4,c:["#7c5cbf","#ff6b35","#f1c40f","#2ecc71","#e74c3c"][Math.floor(Math.random()*5)],vx:(Math.random()-.5)*4,vy:Math.random()*4+2,life:1}));let fr;const draw=()=>{ctx.clearRect(0,0,cv.width,cv.height);let alive=false;ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=.008;if(p.y<cv.height&&p.life>0)alive=true;ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.r,p.r);});ctx.globalAlpha=1;if(alive)fr=requestAnimationFrame(draw);else ctx.clearRect(0,0,cv.width,cv.height);};draw();setTimeout(()=>{cancelAnimationFrame(fr);ctx.clearRect(0,0,cv.width,cv.height);},4000);}

export function readFileAsDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}

// Shrinks an image (data URL) so its longest side is at most maxSize px and
// re-encodes it as JPEG. Keeps photos small enough for Firestore documents.
export function compressImage(dataUrl,maxSize=300,quality=0.75){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
      const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
      const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d");ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL("image/jpeg",quality));
    };
    img.onerror=reject;
    img.src=dataUrl;
  });
}
