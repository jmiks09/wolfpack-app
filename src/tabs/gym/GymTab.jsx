import { useState } from "react";
import { fmtDate, isWeekend, next7Days, todayStr } from "../../lib/dates";
import { GYM_DURATIONS, GYM_DURATION_MINS, GYM_HOURS, isGymOpen, slotOverlaps } from "../../lib/gym";

export function GymTab({currentUser,gymSlots,onBook,onCancel}){
  const [sel,setSel]=useState(todayStr());
  const [bookingOpen,setBookingOpen]=useState(false);
  const [selStartIdx,setSelStartIdx]=useState(null);
  const [selDuration,setSelDuration]=useState(1);
  const [conflictErr,setConflictErr]=useState(false);
  const [closingErr,setClosingErr]=useState(false);
  const showConflict=()=>{setConflictErr(true);setTimeout(()=>setConflictErr(false),3500);};
  const showClosingErr=()=>{setClosingErr(true);setTimeout(()=>setClosingErr(false),4000);};
  const dates=next7Days();
  const daySlots=gymSlots.filter(s=>s.date===sel);
  const mySlots=gymSlots.filter(s=>s.bookedBy===currentUser&&s.date>=todayStr());
  const availableToday=gymSlots.filter(s=>s.date===todayStr()).length;

  const getSlotBooking=(slot)=>daySlots.find(s=>slotOverlaps(slot.h,slot.m,s));
  const isSlotMine=(slot)=>{const b=getSlotBooking(slot);return b&&b.bookedBy===currentUser;};

  const GYM_CLOSE_MINS = 20 * 60; // 8:00 PM in minutes from midnight

  const handleBook=()=>{
    if(selStartIdx===null)return;
    const slot=GYM_HOURS[selStartIdx];
    const durMins=GYM_DURATION_MINS[selDuration];
    // Hard block — session must end by 8:00 PM
    const endMins=slot.h*60+slot.m+durMins;
    if(endMins>GYM_CLOSE_MINS){showClosingErr();return;}
    const slotsNeeded=GYM_HOURS.filter((_,i)=>{
      const s=GYM_HOURS[i];
      const sStart=s.h*60+s.m;
      const bStart=slot.h*60+slot.m;
      return sStart>=bStart&&sStart<bStart+durMins;
    });
    const conflict=slotsNeeded.some(s=>getSlotBooking(s)&&!isSlotMine(s));
    if(conflict){showConflict();return;}
    onBook(sel,slot,durMins,slot.label+" – "+formatEndTime(slot.h,slot.m,durMins));
    setBookingOpen(false);setSelStartIdx(null);
  };

  const formatEndTime=(h,m,durMins)=>{
    const total=h*60+m+durMins;
    const eh=Math.floor(total/60),em=total%60;
    return em===0?`${eh===12?12:eh%12}:00 ${eh<12?"AM":"PM"}`:`${eh===12?12:eh%12}:30 ${eh<12?"AM":"PM"}`;
  };

  // Image path — place garage.jpg in your repo's public folder
  // GitHub Pages URL: https://[username].github.io/[repo]/garage.jpg
  const GYM_IMAGE = "https://jmiks09.github.io/wolfpack-app/garage.jpg";

  return(
    <div style={{paddingBottom:16}}>

      {/* ── CINEMATIC HERO ── */}
      <div style={{
        position:"relative",
        height:240,
        overflow:"hidden",
        marginBottom:0,
      }}>
        {/* Photo */}
        <img
          src={GYM_IMAGE}
          alt="WOLFPACK Garage Gym"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"cover",
            objectPosition:"center 30%",
            display:"block",
          }}
          onError={e=>{e.target.style.display="none";}}
        />

        {/* Vignette — darkens edges */}
        <div style={{
          position:"absolute",inset:0,
          background:"radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)",
          pointerEvents:"none",
        }}/>

        {/* Bottom gradient — bleeds into app background */}
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,height:"65%",
          background:"linear-gradient(to bottom, transparent 0%, rgba(10,10,15,0.7) 50%, rgba(10,10,15,0.97) 100%)",
          pointerEvents:"none",
        }}/>

        {/* Amber LED accent strip — mirrors the real LEDs in the photo */}
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,height:1,
          background:"linear-gradient(90deg, transparent, rgba(255,140,50,0.4), rgba(255,140,50,0.6), rgba(255,140,50,0.4), transparent)",
          boxShadow:"0 0 20px 2px rgba(255,140,50,0.25)",
        }}/>

        {/* Hero text — left aligned, sits on gradient */}
        <div style={{
          position:"absolute",bottom:18,left:20,right:16,
        }}>
          <div style={{
            fontFamily:"'Bebas Neue',cursive",
            fontSize:11,letterSpacing:4,
            color:"rgba(255,140,50,0.8)",
            marginBottom:2,
          }}>WOLFPACK</div>
          <div style={{
            fontFamily:"'Bebas Neue',cursive",
            fontSize:26,letterSpacing:3,
            color:"#fff",lineHeight:1,
            marginBottom:4,
            textShadow:"0 2px 12px rgba(0,0,0,0.8)",
          }}>GARAGE GYM</div>
          <div style={{
            display:"flex",alignItems:"center",gap:8,
          }}>
            <div style={{
              width:6,height:6,borderRadius:"50%",
              background:isGymOpen()?"#2ecc71":"#e74c3c",
              boxShadow:isGymOpen()?"0 0 6px rgba(46,204,113,0.8)":"0 0 6px rgba(231,76,60,0.8)",
            }}/>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",letterSpacing:1}}>
              {isGymOpen()?"OPEN · 6:00 AM – 8:00 PM":"CLOSED"}
            </div>
            {mySlots.length>0&&(
              <div style={{
                marginLeft:"auto",
                padding:"2px 10px",borderRadius:20,
                background:"rgba(124,92,191,0.3)",
                border:"1px solid rgba(124,92,191,0.5)",
                fontSize:10,color:"var(--accent2)",
                fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
              }}>
                {mySlots.length} RESERVED
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DATE PICKER — glassmorphism strip ── */}
      <div style={{
        margin:"0 0 4px",
        background:"rgba(10,10,15,0.6)",
        backdropFilter:"blur(12px)",
        WebkitBackdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{display:"flex",gap:6,padding:"10px 16px",overflowX:"auto"}}>
          {dates.map(d=>{
            const act=d===sel;
            const dd=new Date(d+"T00:00:00");
            const we=isWeekend(d);
            return(
              <button key={d} onClick={()=>setSel(d)} style={{
                flexShrink:0,minWidth:52,padding:"8px 8px",borderRadius:12,
                cursor:"pointer",textAlign:"center",
                background:act?"linear-gradient(135deg,var(--accent),var(--orange))":"rgba(255,255,255,0.04)",
                border:act?"none":"1px solid rgba(255,255,255,0.07)",
                color:we&&!act?"rgba(255,255,255,0.3)":"#fff",
              }}>
                <div style={{fontSize:9,opacity:.8,letterSpacing:1}}>{dd.toLocaleDateString("en-US",{weekday:"short"}).toUpperCase()}</div>
                <div style={{fontSize:18,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{dd.getDate()}</div>
                {we&&<div style={{fontSize:8,opacity:.5,letterSpacing:1}}>REST</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MY RESERVATIONS — glass card ── */}
      {mySlots.length>0&&(
        <div style={{margin:"12px 16px 0"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:11,letterSpacing:2,color:"var(--muted)",marginBottom:8}}>MY RESERVATIONS</div>
          {mySlots.map(s=>(
            <div key={s.id} style={{
              display:"flex",alignItems:"center",gap:12,
              marginBottom:8,padding:"12px 14px",
              background:"rgba(124,92,191,0.08)",
              backdropFilter:"blur(8px)",
              WebkitBackdropFilter:"blur(8px)",
              borderRadius:14,
              border:"1px solid rgba(124,92,191,0.2)",
            }}>
              <div style={{
                width:36,height:36,borderRadius:10,
                background:"linear-gradient(135deg,rgba(124,92,191,0.3),rgba(255,107,53,0.2))",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:18,flexShrink:0,
              }}>🏋️</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1.5,color:"#fff"}}>{s.displayTime||s.time}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{fmtDate(s.date)}</div>
              </div>
              <button onClick={()=>onCancel(s.id)} style={{
                background:"rgba(231,76,60,0.1)",
                border:"1px solid rgba(231,76,60,0.2)",
                borderRadius:8,padding:"5px 12px",
                cursor:"pointer",color:"var(--red)",fontSize:11,
                fontFamily:"'Bebas Neue',cursive",letterSpacing:1,
              }}>CANCEL</button>
            </div>
          ))}
        </div>
      )}

      {/* ── DAY LABEL ── */}
      <div style={{
        padding:"14px 16px 8px",
        fontFamily:"'Bebas Neue',cursive",fontSize:11,
        letterSpacing:2,color:"var(--muted)",
      }}>
        {fmtDate(sel)}{isWeekend(sel)?" — REST DAY":" — 6:00 AM – 8:00 PM"}
      </div>

      {isWeekend(sel)||(!isGymOpen()&&sel===todayStr())?(
        <div style={{
          margin:"0 16px",padding:"30px 20px",
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.05)",
          borderRadius:16,
          textAlign:"center",color:"var(--muted)",
        }}>
          <div style={{fontSize:40,marginBottom:8}}>{isWeekend(sel)?"😴":"🔒"}</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2}}>{isWeekend(sel)?"GYM CLOSED ON WEEKENDS":"GARAGE GYM CLOSED"}</div>
          <div style={{fontSize:12,marginTop:6}}>Hours: 6:00 AM – 8:00 PM</div>
        </div>
      ):(
        <>
          {!bookingOpen&&(
            <div style={{padding:"0 16px 12px"}}>
              <button className="btn-primary" onClick={()=>setBookingOpen(true)}
                style={{
                  background:"linear-gradient(135deg,rgba(124,92,191,0.9),rgba(255,107,53,0.8))",
                  border:"none",
                  boxShadow:"0 4px 20px rgba(124,92,191,0.3)",
                }}>
                🏋️ RESERVE GYM TIME
              </button>
            </div>
          )}

          {/* Booking picker */}
          {bookingOpen&&(
            <div style={{margin:"0 16px 12px",padding:"14px",background:"var(--card)",borderRadius:14,border:"1px solid var(--border)"}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,marginBottom:10}}>PICK START TIME</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12,maxHeight:180,overflowY:"auto"}}>
                {GYM_HOURS.map((slot,i)=>{
                  const booking=getSlotBooking(slot);
                  const taken=!!booking&&booking.bookedBy!==currentUser;
                  const mine=isSlotMine(slot);
                  const sel2=selStartIdx===i;
                  const durMins=GYM_DURATION_MINS[selDuration];
                  const wouldRunPast=(slot.h*60+slot.m+durMins)>GYM_CLOSE_MINS;
                  const disabled=taken||wouldRunPast;
                  return(
                    <button key={i} onClick={()=>!disabled&&setSelStartIdx(i)} style={{
                      padding:"6px 4px",borderRadius:8,cursor:disabled?"default":"pointer",textAlign:"center",
                      background:sel2?"rgba(124,92,191,0.3)":taken?"rgba(231,76,60,0.1)":wouldRunPast?"rgba(255,255,255,0.02)":mine?"rgba(124,92,191,0.1)":"var(--bg3)",
                      border:sel2?"1px solid var(--accent)":taken?"1px solid rgba(231,76,60,0.3)":wouldRunPast?"1px solid rgba(255,255,255,0.04)":mine?"1px solid rgba(124,92,191,0.3)":"1px solid var(--border)",
                      opacity:disabled?0.35:1,
                    }}>
                      <div style={{fontSize:11,color:sel2?"var(--accent2)":taken?"var(--red)":wouldRunPast?"var(--muted)":mine?"var(--accent2)":"var(--text)"}}>{slot.label}</div>
                      {taken&&<div style={{fontSize:9,color:"var(--red)",fontWeight:700}}>BOOKED</div>}
                      {mine&&<div style={{fontSize:9,color:"var(--accent2)"}}>YOURS</div>}
                      {wouldRunPast&&!taken&&<div style={{fontSize:8,color:"var(--muted)"}}>CLOSES</div>}
                    </button>
                  );
                })}
              </div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:2,marginBottom:8}}>DURATION</div>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {GYM_DURATIONS.map((d,i)=>(
                  <button key={i} onClick={()=>{setSelDuration(i);setSelStartIdx(null);}} style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,background:selDuration===i?"rgba(124,92,191,0.2)":"var(--bg3)",border:selDuration===i?"1px solid var(--accent)":"1px solid var(--border)",color:selDuration===i?"var(--accent2)":"var(--muted)"}}>{d}</button>
                ))}
              </div>
              {selStartIdx!==null&&(
                <div style={{fontSize:12,color:"var(--accent2)",marginBottom:10,padding:"8px 10px",background:"rgba(124,92,191,0.1)",borderRadius:8}}>
                  📅 {GYM_HOURS[selStartIdx].label} – {formatEndTime(GYM_HOURS[selStartIdx].h,GYM_HOURS[selStartIdx].m,GYM_DURATION_MINS[selDuration])} ({GYM_DURATIONS[selDuration]})
                </div>
              )}
              {conflictErr&&<div style={{padding:"8px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:8,fontSize:12,color:"var(--red)",marginBottom:8}}>⚠️ That time overlaps with an existing booking. Pick a different time.</div>}
              {closingErr&&<div style={{padding:"8px 12px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:8,fontSize:12,color:"var(--red)",marginBottom:8}}>🔒 Session would run past 8:00 PM closing. Choose an earlier start or shorter duration.</div>}
              <div style={{display:"flex",gap:8}}>
                <button className="btn-primary" onClick={handleBook} disabled={selStartIdx===null} style={{flex:1}}>CONFIRM BOOKING</button>
                <button className="btn-ghost" onClick={()=>{setBookingOpen(false);setSelStartIdx(null);setConflictErr(false);setClosingErr(false);}} style={{flex:1}}>Cancel</button>
              </div>
            </div>
          )}

          {/* Timeline view */}
          <div style={{padding:"0 16px 16px"}}>
            {GYM_HOURS.map((slot,i)=>{
              const booking=getSlotBooking(slot);
              const taken=!!booking;
              const mine=taken&&booking.bookedBy===currentUser;
              // Only show on-the-hour slots to keep it clean, or booked slots
              if(!taken&&slot.m!==0)return null;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"10px 12px",background:mine?"rgba(124,92,191,0.1)":taken?"rgba(231,76,60,0.08)":"var(--card)",borderRadius:10,border:mine?"1px solid rgba(124,92,191,0.3)":taken?"1px solid rgba(231,76,60,0.25)":"1px solid var(--border)"}}>
                  <div style={{width:60,fontFamily:"'Bebas Neue',cursive",fontSize:12,color:mine?"var(--accent2)":taken?"var(--red)":"var(--muted)"}}>{slot.label}</div>
                  <div style={{flex:1,fontSize:12,color:mine?"var(--accent2)":taken?"var(--text)":"var(--muted)"}}>
                    {taken?`${booking.bookedBy} · ${booking.displayTime||booking.time}`:"Open"}
                  </div>
                  {taken&&<div style={{padding:"3px 10px",borderRadius:20,background:mine?"rgba(124,92,191,0.2)":"rgba(231,76,60,0.15)",border:mine?"1px solid rgba(124,92,191,0.4)":"1px solid rgba(231,76,60,0.3)",fontSize:11,color:mine?"var(--accent2)":"var(--red)",fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{mine?"YOURS":"BOOKED"}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
