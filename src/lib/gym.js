// Half-hour slots 6 AM - 8 PM
export const GYM_HOURS = Array.from({length:28},(_,i)=>{
  const totalMins=6*60+i*30;
  const h=Math.floor(totalMins/60);
  const m=totalMins%60;
  const label=m===0?`${h===12?12:h%12}:00 ${h<12?"AM":"PM"}`:`${h===12?12:h%12}:30 ${h<12?"AM":"PM"}`;
  return {label,h,m};
});

export const GYM_DURATIONS=["30 min","1 hr","1.5 hrs","2 hrs"];

export const GYM_DURATION_MINS=[30,60,90,120];

export const GYM_CLOSE_HOUR = 20;

export const isGymOpen = () => { const h=new Date().getHours(); return h>=6&&h<GYM_CLOSE_HOUR; };

// Check if a slot overlaps with a booked range
export const slotOverlaps=(slotH,slotM,booking)=>{
  const slotStart=slotH*60+slotM;
  const slotEnd=slotStart+30;
  const bookStart=booking.startH*60+booking.startM;
  const bookEnd=bookStart+booking.durationMins;
  return slotStart<bookEnd&&slotEnd>bookStart;
};
