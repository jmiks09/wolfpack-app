import { useCallback, useEffect, useRef, useState } from "react";
import { AITrainerModal } from "./ai/AITrainerModal";
import { CoachPlanModal } from "./ai/CoachPlanModal";
import { MealScannerModal } from "./ai/MealScannerModal";
import { AvatarDisplay } from "./components/AvatarDisplay";
import { NotifBanner } from "./components/NotifBanner";
import { Toast } from "./components/Toast";
import { WhatsNewModal } from "./components/WhatsNewModal";
import { WolfIcon } from "./components/WolfIcon";
import { fsDelete, fsGet, fsListen, fsSet, onForegroundMessage } from "./firebase";
import { dismissActiveWorkout } from "./lib/activeWorkout";
import { AI_MUSCLE_GROUPS, EFFORT_RATINGS, HOME_GYM_DEFAULT } from "./lib/aiConfig";
import { MILESTONES, NAV, SESSION_MILESTONES, WHATS_NEW_FALLBACK } from "./lib/constants";
import { getDateRange, localDateStr, todayStr } from "./lib/dates";
import { getFavorites, getFavoritesFS } from "./lib/favorites";
import { slotOverlaps } from "./lib/gym";
import { getStreak, getTotalWorkouts } from "./lib/stats";
import { launchConfetti } from "./lib/utils";
import { ProfileModal } from "./profile/ProfileModal";
import { AdminPanel } from "./screens/AdminPanel";
import { Login } from "./screens/Login";
import { Onboarding } from "./screens/Onboarding";
import { ChallengesTab } from "./tabs/challenges/ChallengesTab";
import { FeedTab } from "./tabs/feed/FeedTab";
import { GymTab } from "./tabs/gym/GymTab";
import { PackTab } from "./tabs/pack/PackTab";
import { StatsTab } from "./tabs/stats/StatsTab";
import { ActiveWorkoutCard } from "./workouts/ActiveWorkoutCard";
import { EditCompletedWorkoutModal } from "./workouts/EditCompletedWorkoutModal";
import { EditWorkoutModal } from "./workouts/EditWorkoutModal";
import { EffortRatingModal } from "./workouts/EffortRatingModal";
import { WorkoutModal } from "./workouts/WorkoutModal";

export default function App(){
  const [screen,setScreen]=useState("loading");
  const [members,setMembers]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [currentUser,setCurrentUser]=useState(null);
  const [sharedData,setSharedData]=useState({});
  const [history,setHistory]=useState({});
  const [feed,setFeed]=useState([]);
  const [challenges,setChallenges]=useState([]);
  const [gymSlots,setGymSlots]=useState([]);
  const [adminName,setAdminName]=useState(null);
  const [view,setView]=useState("pack");
  const [whatsNewData,setWhatsNewData]=useState(null);
  const [whatsNewOpen,setWhatsNewOpen]=useState(false);
  const dismissWhatsNew=()=>{
    try{localStorage.setItem("wp_seen_version",(whatsNewData||WHATS_NEW_FALLBACK).version);}catch{}
    setWhatsNewOpen(false);
  };
  const [workoutOpen,setWorkoutOpen]=useState(false);
  const [adminOpen,setAdminOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [lastSeen,setLastSeen]=useState({feed:0,challenges:0,gym:0});
  const [packGoals,setPackGoals]=useState([]);
  const [garageEquipment,setGarageEquipment]=useState(HOME_GYM_DEFAULT);
  const [userFavorites,setUserFavorites]=useState([]);
useEffect(()=>{
  if(!currentUser)return;
  getFavoritesFS(currentUser).then(favs=>{if(favs?.length>0)setUserFavorites(favs);});
},[currentUser]);
  const [reactions,setReactions]=useState({});
  const [editWorkout,setEditWorkout]=useState(null);
  const [editCompletedWorkout,setEditCompletedWorkout]=useState(null); // {date, entry}
  const [weeklyRecap,setWeeklyRecap]=useState(null);
  const [aiTrainerOpen,setAiTrainerOpen]=useState(false);
  const [nutritionOpen,setNutritionOpen]=useState(false);
  const [mealScannerOpen,setMealScannerOpen]=useState(false);
  const [pendingEffortRating,setPendingEffortRating]=useState(null);
  const [activeWorkoutRefresh,setActiveWorkoutRefresh]=useState(0);
  const [toast,setToast]=useState("");
  const unsubs=useRef([]);const tt=useRef(null);
  const showToast=useCallback(msg=>{setToast(msg);clearTimeout(tt.current);tt.current=setTimeout(()=>setToast(""),3000);},[]);

  useEffect(()=>{
    (async()=>{
      const md=await fsGet("wolfpack/members");const m=md?.list||[];setMembers(m);
      const u1=fsListen("wolfpack/workouts",d=>{if(d){setSharedData(d.byDate||{});setHistory(d.byDate||{});}});
      const u2=fsListen("wolfpack/profiles",d=>{if(d)setProfiles(d.users||{});});
      const u3=fsListen("wolfpack/feed",d=>{if(d)setFeed((d.posts||[]).sort((a,b)=>b.ts-a.ts));});
      const u4=fsListen("wolfpack/challenges",d=>{if(d)setChallenges(d.list||[]);});
      const u5=fsListen("wolfpack/gym",d=>{if(d)setGymSlots(d.slots||[]);});
      const u6=fsListen("wolfpack/packgoals",d=>{if(d)setPackGoals(d.list||[]);});
      const u8=fsListen("wolfpack/settings",d=>{if(d?.garageEquipment)setGarageEquipment(d.garageEquipment);});
      const u10=fsListen("wolfpack/favorites",async d=>{
  const firestoreFavs=d?.users?.[currentUser];
  if(firestoreFavs&&firestoreFavs.length>0){
    setUserFavorites(firestoreFavs);
  } else {
    // Migrate from localStorage if Firestore is empty
    const localFavs=getFavorites(currentUser);
    if(localFavs.length>0){
      await fsSet("wolfpack/favorites",{users:{[currentUser]:localFavs}},true);
      setUserFavorites(localFavs);
    }
  }
});
      const u7=fsListen("wolfpack/reactions",d=>{if(d)setReactions(d.data||{});});
      const u9=fsListen("wolfpack/whats_new",d=>{
        if(d?.version&&d?.items){
          setWhatsNewData(d);
          // Check if user has seen this version
          try{
            const seen=localStorage.getItem("wp_seen_version");
            if(seen!==d.version)setWhatsNewOpen(true);
          }catch{}
        } else {
          // No Firestore data yet — use fallback
          try{
            const seen=localStorage.getItem("wp_seen_version");
            if(seen!==WHATS_NEW_FALLBACK.version)setWhatsNewOpen(true);
          }catch{}
        }
      });
      unsubs.current=[u1,u2,u3,u4,u5,u6,u7,u8,u9,u10];
      const ad=await fsGet("wolfpack/admin");if(ad?.name)setAdminName(ad.name);
      setScreen(m.length>0?"login":"onboard");
    })();
    return()=>unsubs.current.forEach(u=>u?.());
  },[]);

  useEffect(()=>{const u=onForegroundMessage(p=>{const{title,body}=p.notification||{};showToast(`${title||"WOLFPACK"}: ${body||""}`);});return()=>u?.();},[showToast]);

  const handleJoin=async(name,avatar,pin,avatarImg)=>{
    if(members.map(m=>m.toLowerCase()).includes(name.toLowerCase())){setCurrentUser(name);setScreen("main");return;}
    await fsSet(`wolfpack/pin_${name}`,{pin});
    const nm=[...members,name],profile={avatar:avatar||"🐺",...(avatarImg?{avatarImg}:{})};
    const np={...profiles,[name]:profile};
    if(members.length===0){await fsSet("wolfpack/admin",{name});setAdminName(name);}
    await fsSet("wolfpack/members",{list:nm});await fsSet("wolfpack/profiles",{users:np});
    setMembers(nm);setProfiles(np);setCurrentUser(name);setScreen("main");
    showToast(`Welcome to the pack, ${name}! 🐺`);
  };

  const handleLogin=(name,action)=>{
    if(action==="join"){setScreen("onboard");return;}
    setCurrentUser(name);
    setScreen("main");
    // Load lastSeen from profile
    fsGet("wolfpack/profiles").then(d=>{
      const seen=d?.users?.[name]?.lastSeen;
      if(seen) setLastSeen(seen);
    });
  };

  const handleResetPin=async m=>{await fsDelete(`wolfpack/pin_${m}`);showToast(`${m}'s PIN cleared. They can log in freely now.`);};

  const handleAdminBackfill=async(member,date,workouts)=>{
    const time="12:00 PM";
    const icons=workouts.map(w=>w.icon).join("");
    const labels=workouts.map(w=>w.label).join(" + ");
    const entry={done:true,workouts:workouts.map(w=>({id:w.id,icon:w.icon,label:w.label})),workoutIcon:icons,workoutLabel:labels,note:"(admin backfill)",time,ts:new Date(date+"T12:00:00").getTime()};
    const newHistory={...history,[date]:{...(history[date]||{}),[member]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newHistory});
    // Update local state immediately so streak/recap reflect the change
    setHistory(newHistory);
    setSharedData(newHistory);

    // Also update acceptedAt for any active challenge this member is in
    // so their goal recalculates from challenge start
    const newChallenges=challenges.map(c=>{
      if(c.status!=="active")return c;
      if(!c.participants?.[member])return c;
      if(c.participants[member]?.status!=="accepted")return c;
      // If the backfill date is before their acceptedAt, push acceptedAt back
      const currentAccepted=c.participants[member]?.acceptedAt||c.startDate;
      if(date<currentAccepted){
        return{...c,participants:{...c.participants,[member]:{...c.participants[member],acceptedAt:c.startDate}}};
      }
      return c;
    });
    if(JSON.stringify(newChallenges)!==JSON.stringify(challenges)){
      await fsSet("wolfpack/challenges",{list:newChallenges});
    }
    showToast(`✓ Logged ${icons} for ${member} on ${date}`);
  };

  const handleDeleteAccount=async m=>{
    const nm=members.filter(x=>x!==m),np={...profiles};delete np[m];
    const nc=challenges.map(c=>{const p={...c.participants};delete p[m];return{...c,participants:p};});
    const ns=gymSlots.filter(s=>s.bookedBy!==m);
    await Promise.all([fsSet("wolfpack/members",{list:nm}),fsSet("wolfpack/profiles",{users:np}),fsSet("wolfpack/challenges",{list:nc}),fsSet("wolfpack/gym",{slots:ns}),fsDelete(`wolfpack/pin_${m}`)]);
    setMembers(nm);setProfiles(np);showToast(`${m} removed from the pack.`);
  };

  const handleAddPackGoal=async t=>{
    const goal={id:Date.now().toString(),author:currentUser,text:t,cheers:[],ts:Date.now(),date:todayStr()};
    await fsSet("wolfpack/packgoals",{list:[goal,...packGoals]});
  };
  const handleCheerGoal=async(id,user)=>{
    const nl=packGoals.map(g=>{if(g.id!==id)return g;const c=g.cheers||[];return{...g,cheers:c.includes(user)?c.filter(x=>x!==user):[...c,user]};});
    await fsSet("wolfpack/packgoals",{list:nl});
  };
  const handleDeletePackGoal=async id=>{
    await fsSet("wolfpack/packgoals",{list:packGoals.filter(g=>g.id!==id)});
  };
  const handleSaveBackfill=async updatedHistory=>{
    await fsSet("wolfpack/workouts",{byDate:updatedHistory});
  };

  // Reactions
  const handleReact=async(member,emoji)=>{
    const memberReactions=reactions[member]||{};
    const emojiList=memberReactions[emoji]||[];
    const updated={...reactions,[member]:{...memberReactions,[emoji]:emojiList.includes(currentUser)?emojiList.filter(x=>x!==currentUser):[...emojiList,currentUser]}};
    await fsSet("wolfpack/reactions",{data:updated});
  };

  // Edit workout
  const handleSaveEditedWorkout=async(date,entry)=>{
    // Entry already has correct workoutLabel and summary built by EditWorkoutModal — just save it
    const newHistory={...history,[date]:{...(history[date]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newHistory});
    setHistory(newHistory);
    setSharedData(newHistory);
    setEditWorkout(null);showToast("Workout updated!");
  };

  const handleSaveEditedExercises=async(date,editedExercises)=>{
    const existing=history[date]?.[currentUser];
    if(!existing)return;
    let updatedEntry={...existing};
    if(existing.wolfmodeSession?.exercises){
      updatedEntry={...existing,wolfmodeSession:{...existing.wolfmodeSession,exercises:editedExercises}};
    }else if(existing.details?.lift?.exercises){
      updatedEntry={...existing,details:{...existing.details,lift:{...existing.details.lift,exercises:editedExercises}}};
    }
    const newHistory={...history,[date]:{...(history[date]||{}),[currentUser]:updatedEntry}};
    await fsSet("wolfpack/workouts",{byDate:newHistory});
    setHistory(newHistory);setSharedData(newHistory);
    showToast("✅ Exercises updated!");
  };
  const handleDeleteWorkout=async(date)=>{
    const newDay={...(history[date]||{})};
    delete newDay[currentUser];
    const newHistory={...history,[date]:newDay};
    await fsSet("wolfpack/workouts",{byDate:newHistory});
    // Force local state update immediately
    setHistory(newHistory);
    setSharedData(newHistory);
    setEditWorkout(null);
    showToast("Workout deleted.");
  };

  // Weekly recap — compute on Monday
  useEffect(()=>{
    if(!currentUser||members.length===0)return;
    const today=new Date();
    if(today.getDay()!==1)return; // only on Monday
    const lastWeekStart=new Date(today);lastWeekStart.setDate(today.getDate()-7);
    const lastWeekEnd=new Date(today);lastWeekEnd.setDate(today.getDate()-1);
    const days=getDateRange(localDateStr(lastWeekStart),localDateStr(lastWeekEnd));
    const stats=members.map(m=>({name:m,days:days.filter(d=>history[d]?.[m]?.done).length})).sort((a,b)=>b.days-a.days);
    setWeeklyRecap({stats,week:localDateStr(lastWeekStart),dismissed:false});
  },[currentUser,members,history]);

  // Milestone auto-posts — check after logging
  const checkMilestones=async(newHistory)=>{
    const streak=getStreak(newHistory,currentUser,profiles[currentUser]);
    const sessions=getTotalWorkouts(newHistory,currentUser);
    const streakMilestone=MILESTONES.find(m=>streak===m);
    const sessionMilestone=SESSION_MILESTONES.find(m=>sessions===m);
    const posts=[];
    if(streakMilestone) posts.push({id:Date.now().toString(),author:currentUser,text:`🔥 ${currentUser} just hit a ${streakMilestone}-day streak! The wolf is on fire! 🐺`,ts:Date.now(),likes:[],isAuto:true});
    if(sessionMilestone) posts.push({id:(Date.now()+1).toString(),author:currentUser,text:`💪 ${currentUser} just logged their ${sessionMilestone}th workout session! Beast mode! 🏋️`,ts:Date.now()+1,likes:[],isAuto:true});
    if(posts.length>0) await fsSet("wolfpack/feed",{posts:[...posts,...feed]});
  };
  const handleSaveWeight=async wl=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],weightLog:wl}};
    await fsSet("wolfpack/profiles",{users:np});setProfiles(np);
  };
  const handleSaveGoal=async(goal,share)=>{
    const np={...profiles,[currentUser]:{...profiles[currentUser],personalGoal:goal,goalDate:todayStr(),shareGoal:typeof share==="boolean"?share:(profiles[currentUser]?.shareGoal||false)}};
    await fsSet("wolfpack/profiles",{users:np});setProfiles(np);
  };
  const handleChangePin=async newPin=>{
    await fsSet(`wolfpack/pin_${currentUser}`,{pin:newPin});
  };
  const handleChangeName=async(newName,setErr,setDone)=>{
    if(!newName.trim()){setErr("Name can't be empty");return;}
    if(newName.trim()===currentUser){return;}
    // Check name not taken
    if(members.map(m=>m.toLowerCase()).includes(newName.trim().toLowerCase())&&newName.trim().toLowerCase()!==currentUser.toLowerCase()){
      setErr("That name is already taken");return;
    }
    const oldName=currentUser;
    const nm=members.map(m=>m===oldName?newName.trim():m);
    // Update profile
    const np={...profiles,[newName.trim()]:{...profiles[oldName]}};
    delete np[oldName];
    // Update workout history keys
    const newHistory={};
    Object.entries(history).forEach(([date,dayData])=>{
      const newDay={...dayData};
      if(newDay[oldName]){newDay[newName.trim()]=newDay[oldName];delete newDay[oldName];}
      newHistory[date]=newDay;
    });
    // Update challenges
    const newChallenges=challenges.map(c=>{
      const newParts={};
      Object.entries(c.participants||{}).forEach(([m,v])=>{newParts[m===oldName?newName.trim():m]=v;});
      return{...c,participants:newParts,createdBy:c.createdBy===oldName?newName.trim():c.createdBy};
    });
    // Update feed
    const newFeed=feed.map(p=>({...p,author:p.author===oldName?newName.trim():p.author,comments:(p.comments||[]).map(c=>({...c,author:c.author===oldName?newName.trim():c.author}))}));
    // Update gym slots
    const newSlots=gymSlots.map(s=>({...s,bookedBy:s.bookedBy===oldName?newName.trim():s.bookedBy}));
    // Update PIN
    const pinData=await fsGet(`wolfpack/pin_${oldName}`);
    await Promise.all([
      fsSet("wolfpack/members",{list:nm}),
      fsSet("wolfpack/profiles",{users:np}),
      fsSet("wolfpack/workouts",{byDate:newHistory}),
      fsSet("wolfpack/challenges",{list:newChallenges}),
      fsSet("wolfpack/feed",{posts:newFeed}),
      fsSet("wolfpack/gym",{slots:newSlots}),
      ...(pinData?[fsSet(`wolfpack/pin_${newName.trim()}`,pinData),fsDelete(`wolfpack/pin_${oldName}`)]:[]),
    ]);
    // Update admin if needed
    if(adminName===oldName){await fsSet("wolfpack/admin",{name:newName.trim()});setAdminName(newName.trim());}
    setMembers(nm);setProfiles(np);setCurrentUser(newName.trim());
    setDone(true);
    showToast(`Name updated to ${newName.trim()}!`);
  };

  const [loggingWorkout,setLoggingWorkout]=useState(false);
  const handleLogWorkout=async(workouts,note,duration,details,summary)=>{
    if(loggingWorkout)return; // prevent double-tap
    setLoggingWorkout(true);
    const key=todayStr(),time=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    // Support multiple workout types - merge with existing entries for today
    const existing=history[key]?.[currentUser]||{};
    const prevWorkouts=existing.workouts||[];
    const prevDetails=existing.details||{};
    const newWorkouts=[...prevWorkouts,...workouts.map(w=>({id:w.id,icon:w.icon,label:w.label}))];
    // Merge details preserving existing ones
    const mergedDetails={...prevDetails,...(details||{})};
    const icons=newWorkouts.map(w=>w.icon).join("");
    const labels=newWorkouts.map(w=>w.label).join(" + ");
    // Build summary using MERGED details so previous workout details are preserved
    const summaryLines=newWorkouts.map(w=>{
      const d=mergedDetails?.[w.id]||mergedDetails?.[w.key]||{};
      const parts=[];
      if(d.focus) parts.push(d.focus);
      if(d.distance) parts.push(`${d.distance} mi`);
      if(d.pace) parts.push(`${d.pace}/mi`);
      if(d.rounds) parts.push(`${d.rounds} rounds`);
      if(d.sets&&d.reps) parts.push(`${d.sets} sets x ${d.reps} reps`);
      else if(d.sets) parts.push(`${d.sets} sets`);
      else if(d.reps) parts.push(`${d.reps} reps`);
      if(d.weight) parts.push(`${d.weight} lbs`);
      if(d.duration) parts.push(`${d.duration} min`);
      return parts.length>0?`${w.label}: ${parts.join(" · ")}`:w.label;
    });
    const totalDur=newWorkouts.reduce((s,w)=>s+(Number(mergedDetails?.[w.id]?.duration)||Number(mergedDetails?.[w.key]?.duration)||0),0)||null;
    const sessionCount=(existing.sessionCount||1)+workouts.length-1;
    const entry={done:true,workouts:newWorkouts,workoutIcon:icons,workoutLabel:summaryLines.join(" | "),summary:summaryLines,note,duration:totalDur,details:mergedDetails,time,ts:Date.now(),sessionCount};
    const newData={...history,[key]:{...(history[key]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newData});
    setLoggingWorkout(false);setWorkoutOpen(false);launchConfetti();showToast(`${icons} Logged! Keep grinding! 🐺`);
    await checkMilestones(newData);
  };

  // ── AI Trainer: log the AI-generated workout as a lift entry ──────────────
  const handleLogAIWorkout=async({summary,note,minutes,exercises,muscleGroup})=>{
    if(loggingWorkout)return;
    setLoggingWorkout(true);
    const key=todayStr(),time=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    const existing=history[key]?.[currentUser]||{};
    const prevWorkouts=existing.workouts||[];
    const prevDetails=existing.details||{};
    // Use unique key so multiple WOLFMODE sessions don't overwrite each other
    const liftKey=`lift_${Date.now()}`;
    const aiLift={id:"lift",key:liftKey,icon:"🏋️",label:"Weight Training"};
    const newWorkouts=[...prevWorkouts,aiLift];
    const mgLabel=muscleGroup?AI_MUSCLE_GROUPS.find(m=>m.id===muscleGroup)?.label||muscleGroup:null;
    const exCount=exercises?.filter(e=>!e.skipped||e.substitutedWith).length||exercises?.length||0;
    const cleanLabel=[`WOLFMODE · Weight Training`,mgLabel,exCount?`${exCount} exercises`:null,minutes?`${minutes} min`:null].filter(Boolean).join(" · ");
    // Preserve ALL previous details — only add new lift, don't overwrite walk/run distance etc
    const newDetails={...prevDetails,[liftKey]:{duration:String(minutes||45),focus:mgLabel||"Full Body"}};
    const icons=newWorkouts.map(w=>w.icon).join("");
    // Rebuild summary preserving ALL previous workout lines with original details including distance
    const summaryLines=newWorkouts.map(w=>{
      if(w.key===liftKey) return cleanLabel;
      const d=prevDetails?.[w.id]||prevDetails?.[w.key]||{};
      const parts=[];
      if(d.focus) parts.push(d.focus);
      if(d.distance) parts.push(`${d.distance} mi`);
      if(d.pace) parts.push(`${d.pace}/mi`);
      if(d.duration) parts.push(`${d.duration} min`);
      return parts.length>0?`${w.label}: ${parts.join(" · ")}`:w.label;
    });
    const wolfmodeSession={
      title:note?.replace("WOLFMODE: ",""),
      muscleGroup:muscleGroup||"fullbody",
      estimatedMinutes:minutes||45,
      generatedAt:Date.now(),
      exercises:(exercises||[]).map(e=>({
        name:e.name,sets:e.sets,reps:e.reps,
        suggestedWeight:e.weight,weightUsed:null,effortRating:null,
      })),
    };
    // Track individual session count for stats (walk + WOLFMODE = 2 sessions)
    const sessionCount=(existing.sessionCount||1)+1;
    const entry={done:true,workouts:newWorkouts,workoutIcon:icons,workoutLabel:summaryLines.join(" | "),summary:summaryLines,note:note||"",duration:minutes||null,details:newDetails,time,ts:Date.now(),wolfmodeSession,sessionCount};
    const newData={...history,[key]:{...(history[key]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:newData});
    setLoggingWorkout(false);
    launchConfetti();
    showToast(`🔥 WOLFMODE logged! 🐺`);
    await checkMilestones(newData);
  };

  const handlePost=async(t,photo)=>{
    const post={id:Date.now().toString(),author:currentUser,text:t,ts:Date.now(),likes:[],...(photo?{photo}:{})};
    await fsSet("wolfpack/feed",{posts:[post,...feed]});showToast("Posted! 🐺");
  };
  const handleLike=async id=>{await fsSet("wolfpack/feed",{posts:feed.map(p=>{if(p.id!==id)return p;const l=p.likes||[];return{...p,likes:l.includes(currentUser)?l.filter(x=>x!==currentUser):[...l,currentUser]};})});};
  const handleDelPost=async id=>{await fsSet("wolfpack/feed",{posts:feed.filter(p=>p.id!==id)});};
  const handleComment=async(postId,text)=>{
    const comment={author:currentUser,text,ts:Date.now()};
    const newFeed=feed.map(p=>{
      if(p.id!==postId)return p;
      return{...p,comments:[...(p.comments||[]),comment]};
    });
    await fsSet("wolfpack/feed",{posts:newFeed});
  };
  const handleDeleteComment=async(postId,idx)=>{
    const newFeed=feed.map(p=>{
      if(p.id!==postId)return p;
      const comments=[...(p.comments||[])];
      comments.splice(idx,1);
      return{...p,comments};
    });
    await fsSet("wolfpack/feed",{posts:newFeed});
  };
  const handleBookGym=async(date,slot,durationMins,displayTime)=>{
    // Check for conflicts
    const daySlots=gymSlots.filter(s=>s.date===date);
    const conflict=daySlots.find(s=>s.bookedBy!==currentUser&&slotOverlaps(slot.h,slot.m,s));
    if(conflict){showToast("That time overlaps with an existing booking!");return;}
    const myConflict=daySlots.find(s=>s.bookedBy===currentUser&&slotOverlaps(slot.h,slot.m,s));
    if(myConflict){showToast("You already have a booking that overlaps!");return;}
    const booking={id:Date.now().toString(),date,time:slot.label,displayTime,startH:slot.h,startM:slot.m,durationMins,bookedBy:currentUser,createdAt:Date.now()};
    await fsSet("wolfpack/gym",{slots:[...gymSlots,booking]});
    showToast(`Gym booked: ${displayTime}! 💪`);
  };
  const handleCancelGym=async id=>{await fsSet("wolfpack/gym",{slots:gymSlots.filter(s=>s.id!==id)});showToast("Cancelled.");};
  const handleAddChallenge=async c=>{await fsSet("wolfpack/challenges",{list:[c,...challenges]});showToast("Challenge created! ⚔️");};
  const handleLogProgress=async(cid,member,progress,done)=>{
    const nl=challenges.map(c=>{
      if(c.id!==cid)return c;
      const u={...c,participants:{...c.participants,[member]:{progress,done}}};
      if(Object.values(u.participants).every(p=>p.done)){u.status="completed";launchConfetti();showToast("🏆 Challenge complete!");}
      return u;
    });
    await fsSet("wolfpack/challenges",{list:nl});
    if(done)showToast("✓ You completed your part! 🎉");else showToast("Progress logged!");
  };
  const handleDelChallenge=async id=>{await fsSet("wolfpack/challenges",{list:challenges.filter(c=>c.id!==id)});showToast("Challenge removed.");};
  const handleEditChallenge=async u=>{await fsSet("wolfpack/challenges",{list:challenges.map(c=>c.id===u.id?u:c)});showToast("Challenge updated!");};
  const handleAcceptChallenge=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      return{...c,participants:{...c.participants,[member]:{
        ...c.participants[member],
        status:"accepted",
        acceptedAt:todayStr(), // track when they joined for penalty purposes
      }}};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast("Challenge accepted! Rest days are now locked. ⚔️");
  };
  const handleDeclineChallenge=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      const np={...c.participants};
      delete np[member];
      return{...c,participants:np};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast("Challenge declined.");
  };
  const handleMarkPaid=async(challengeId,member,amount,method)=>{
    const payment={amount,method,date:todayStr(),ts:Date.now()};
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      const existingPayments=c.payments?.[member]||[];
      return{...c,payments:{...c.payments,[member]:[...existingPayments,payment]}};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast(`✓ $${amount} ${method} payment recorded for ${member}`);
  };
  const handleLogPayment=async(challengeId,member,amount,method)=>{
    await handleMarkPaid(challengeId,member,amount,method);
  };

  const handleForfeit=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      return{...c,participants:{...c.participants,[member]:{...c.participants[member],forfeited:true,forfeitedAt:Date.now()}}};
    });
    await fsSet("wolfpack/challenges",{list:newList});
    showToast(`🏳️ Forfeited. You owe $${challenges.find(c=>c.id===challengeId)?.forfeitCap||0}.`);
  };

  // ── DOT CONDITIONS ────────────────────────────────────────────────────────
  // Feed dot: any post newer than lastSeen.feed not by currentUser
  const hasFeedDot = feed.some(p => {
    // New post by someone else
    if(p.author !== currentUser && p.ts > lastSeen.feed) return true;
    // New comment on any post by someone else
    if((p.comments||[]).some(c => c.author !== currentUser && c.ts > lastSeen.feed)) return true;
    return false;
  });

  // Challenges dot: any pending invite
  const hasChallengeDot = challenges.some(c =>
    c.status === "active" && c.participants?.[currentUser]?.status === "pending"
  );

  // Gym dot: any new booking on a day you're also booked, newer than lastSeen.gym
  const hasGymDot = (() => {
    const myDates = new Set(gymSlots.filter(s => s.bookedBy === currentUser).map(s => s.date));
    return gymSlots.some(s =>
      s.bookedBy !== currentUser &&
      myDates.has(s.date) &&
      s.createdAt > lastSeen.gym
    );
  })();

  if(screen==="loading")return<div className="loading-screen"><div className="loading-wolf"><img src="/wolfpack-app/wolf-icon.png" alt="wolf" style={{width:80,height:80,objectFit:"contain"}}/></div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div><div style={{color:"var(--muted)",fontSize:13}}>Loading the pack...</div></div>;
  if(screen==="onboard")return<Onboarding onJoin={handleJoin}/>;
  if(screen==="login")return<Login members={members} profiles={profiles} onLogin={handleLogin} adminName={adminName}/>;

  return(
    <div className="app">
      <canvas id="confetti-canvas"/>
      <Toast msg={toast}/>
      <div className="header">
        <div style={{display:"flex",alignItems:"center",gap:8}}><WolfIcon size={38}/><div><div className="header-title">WOLFPACK</div><div style={{fontSize:11,color:"var(--muted)",letterSpacing:1}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div></div></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {currentUser===adminName&&(
            <button onClick={()=>setAdminOpen(true)} style={{background:"none",border:"1px solid var(--border)",borderRadius:10,padding:"6px 8px",cursor:"pointer",color:"var(--muted)",fontSize:16,lineHeight:1}}>⚙️</button>
          )}
          <div style={{textAlign:"right",marginRight:4}}><div style={{fontSize:11,color:"var(--muted)"}}>welcome back</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2,color:"var(--accent2)"}}>{currentUser}</div></div>
          <div onClick={()=>setProfileOpen(true)} style={{cursor:"pointer"}}><AvatarDisplay profile={profiles[currentUser]} size={40}/></div>
        </div>
      </div>
      <div className="scroll">
        {view==="pack"&&(
          <>
            {/* Active workout cards — show above everything when present */}
            <ActiveWorkoutCard
              key={`today-${activeWorkoutRefresh}`}
              currentUser={currentUser}
              targetDate="today"
              userName={currentUser}
              experience={profiles[currentUser]?.aiTrainer?.experience}
              injuries={(profiles[currentUser]?.aiTrainer?.injuries||[]).join(", ")}
              userFavorites={userFavorites}
              onFavoritesChange={setUserFavorites}
              onComplete={(data)=>{
                const logMinutes=data.workout?.estimatedMinutes||45;
                handleLogAIWorkout({
                  summary:data.workout.exercises.map(e=>`${e.name}: ${e.sets}×${e.reps}${e.weight&&e.weight!=="bodyweight"?` @ ${e.weight}`:""}`).join(" + "),
                  note:`WOLFMODE: ${data.workout.title}`,
                  minutes:logMinutes,
                  exercises:data.workout.exercises,
                  muscleGroup:data.muscleGroup,
                });
                setPendingEffortRating({exercises:data.workout.exercises,muscleGroup:data.muscleGroup});
                dismissActiveWorkout(currentUser,"today");
                setActiveWorkoutRefresh(r=>r+1);
              }}
              onDismiss={(targetDate)=>{
                dismissActiveWorkout(currentUser,targetDate);
                setActiveWorkoutRefresh(r=>r+1);
              }}
            />
            <ActiveWorkoutCard
              key={`tomorrow-${activeWorkoutRefresh}`}
              currentUser={currentUser}
              targetDate="tomorrow"
              userName={currentUser}
              experience={profiles[currentUser]?.aiTrainer?.experience}
              injuries={(profiles[currentUser]?.aiTrainer?.injuries||[]).join(", ")}
              userFavorites={userFavorites}
              onFavoritesChange={setUserFavorites}
              onComplete={()=>{}}
              onDismiss={(targetDate)=>{
                dismissActiveWorkout(currentUser,targetDate);
                setActiveWorkoutRefresh(r=>r+1);
              }}
            />
            {view==="pack"&&<NotifBanner currentUser={currentUser}/>}
            <PackTab currentUser={currentUser} members={members} profiles={profiles} history={history} sharedData={sharedData} onLogWorkout={()=>setWorkoutOpen(true)} onOpenAITrainer={()=>setAiTrainerOpen(true)} onOpenNutrition={()=>setNutritionOpen(true)} onOpenMealScanner={()=>setMealScannerOpen(true)} onEditWorkout={()=>setEditWorkout({date:todayStr(),entry:sharedData[todayStr()]?.[currentUser]||{}})} adminName={adminName} onOpenAdmin={()=>setAdminOpen(true)} packGoals={packGoals} onAddGoal={handleAddPackGoal} onCheer={handleCheerGoal} onDeleteGoal={handleDeletePackGoal} onOpenProfile={()=>setProfileOpen(true)} reactions={reactions} onReact={handleReact} weeklyRecap={weeklyRecap} onDismissRecap={()=>setWeeklyRecap(r=>r?{...r,dismissed:true}:null)}/>
          </>
        )}
        {view==="feed"&&<FeedTab currentUser={currentUser} profiles={profiles} feed={feed} onPost={handlePost} onLike={handleLike} onDelete={handleDelPost} onComment={handleComment} onDeleteComment={handleDeleteComment}/>}
        {view==="gym"&&<GymTab currentUser={currentUser} gymSlots={gymSlots} onBook={handleBookGym} onCancel={handleCancelGym}/>}
        {view==="challenges"&&<ChallengesTab currentUser={currentUser} adminName={adminName} members={members} profiles={profiles} challenges={challenges} history={history} onAdd={handleAddChallenge} onLogProgress={handleLogProgress} onDelete={handleDelChallenge} onEditChallenge={handleEditChallenge} onForfeit={handleForfeit} onAccept={handleAcceptChallenge} onDecline={handleDeclineChallenge} onOpenProfile={()=>setProfileOpen(true)} onMarkPaid={handleMarkPaid} onLogPayment={handleLogPayment}/>}
        {view==="stats"&&<StatsTab currentUser={currentUser} members={members} profiles={profiles} history={history} challenges={challenges} feed={feed} onEditExercises={(date,entry)=>setEditCompletedWorkout({date,entry})}/>}
      </div>
      <nav className="nav">
        {NAV.map(n=>{
          const hasDot=n.id==="feed"?hasFeedDot:n.id==="challenges"?hasChallengeDot:n.id==="gym"?hasGymDot:false;
          return(
            <button key={n.id} className={`nav-btn ${view===n.id?"active":""}`}
              onClick={()=>{
                const now=Date.now();
                setView(n.id);
                setLastSeen(p=>{
                  const updated={...p,[n.id]:now};
                  // Persist to Firebase
                  if(currentUser){
                    fsGet("wolfpack/profiles").then(d=>{
                      if(d?.users?.[currentUser]){
                        fsSet("wolfpack/profiles",{users:{...d.users,[currentUser]:{...d.users[currentUser],lastSeen:updated}}});
                      }
                    });
                  }
                  return updated;
                });
              }}
              style={{position:"relative"}}>
              <span className="icon" style={{position:"relative",display:"inline-block"}}>
                {n.id==="pack"
                  ? <WolfIcon size={26} style={{opacity:view==="pack"?1:0.5}}/>
                  : n.icon
                }
                {hasDot&&view!==n.id&&(
                  <span style={{position:"absolute",top:-2,right:-4,width:8,height:8,borderRadius:"50%",background:"var(--red)",border:"2px solid var(--bg)"}}/>
                )}
              </span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      {workoutOpen&&<WorkoutModal onClose={()=>setWorkoutOpen(false)} onSubmit={handleLogWorkout} loading={loggingWorkout}/>}
      {aiTrainerOpen&&<AITrainerModal currentUser={currentUser} profile={profiles[currentUser]} history={history} packHomeGym={garageEquipment} userFavorites={userFavorites} onFavoritesChange={setUserFavorites} onClose={()=>{setAiTrainerOpen(false);setActiveWorkoutRefresh(r=>r+1);if(!profiles[currentUser]?.aiTrainer?.goal||!profiles[currentUser]?.aiTrainer?.experience){setProfileOpen(true);}}} onUseWorkout={()=>{setActiveWorkoutRefresh(r=>r+1);}} showToast={showToast}/>}
      {nutritionOpen&&<CoachPlanModal currentUser={currentUser} profile={profiles[currentUser]} coach={profiles[currentUser]?.aiTrainer?.coach||{}} onPlanGenerated={async(plan)=>{const p=profiles[currentUser];const updated={...p,aiTrainer:{...(p?.aiTrainer||{}),coach:{...(p?.aiTrainer?.coach||{}),lastPlan:{...plan,generatedAt:Date.now()}}}};await fsSet("wolfpack/profiles",{users:{...profiles,[currentUser]:updated}});}} onDeletePlan={async()=>{const p=profiles[currentUser];const updated={...p,aiTrainer:{...(p?.aiTrainer||{}),coach:{...(p?.aiTrainer?.coach||{}),lastPlan:null}}};await fsSet("wolfpack/profiles",{users:{...profiles,[currentUser]:updated}});setNutritionOpen(false);}} onClose={()=>setNutritionOpen(false)} onOpenScanner={()=>{setNutritionOpen(false);setMealScannerOpen(true);}}/>}
      {mealScannerOpen&&<MealScannerModal currentUser={currentUser} onClose={()=>setMealScannerOpen(false)}/>}
      {pendingEffortRating&&<EffortRatingModal exercises={pendingEffortRating.exercises} muscleGroup={pendingEffortRating.muscleGroup} currentUser={currentUser} onRate={async(effortId,logged)=>{
        setPendingEffortRating(null);
        const effort=EFFORT_RATINGS.find(r=>r.id===effortId);
        showToast((effort?.emoji||"") + " Logged! " + (effort?.advice||"Keep it up") + "! 🐺");
        if(logged?.length){try{
          const key=todayStr();
          const existing=history[key]?.[currentUser];
          if(existing?.wolfmodeSession){
            const updatedEx=existing.wolfmodeSession.exercises.map(ex=>{const l=logged.find(x=>x.name===ex.name);if(l)return{...ex,weightUsed:l.weightUsed||ex.weightUsed,actualReps:l.actualReps||null,skipped:l.skipped||false,substitutedWith:l.substitutedWith||null};return{...ex,skipped:true};});
            await fsSet("wolfpack/workouts",{byDate:{...history,[key]:{...(history[key]||{}),[currentUser]:{...existing,wolfmodeSession:{...existing.wolfmodeSession,exercises:updatedEx,effortRating:effortId}}}}});
          }
        }catch(err){console.warn(err);}}
      }} onClose={()=>setPendingEffortRating(null)}/>}
      {editWorkout&&editWorkout.entry?.done&&<EditWorkoutModal entry={editWorkout.entry} date={editWorkout.date} currentUser={currentUser} onClose={()=>setEditWorkout(null)} onSave={handleSaveEditedWorkout} onDelete={()=>handleDeleteWorkout(editWorkout.date)}/>}
      {editCompletedWorkout&&<EditCompletedWorkoutModal date={editCompletedWorkout.date} entry={editCompletedWorkout.entry} currentUser={currentUser} onSave={handleSaveEditedExercises} onClose={()=>setEditCompletedWorkout(null)}/>}
      {whatsNewOpen&&<WhatsNewModal onClose={dismissWhatsNew} whatsNewData={whatsNewData||WHATS_NEW_FALLBACK}/>}
      {profileOpen&&<ProfileModal currentUser={currentUser} profile={profiles[currentUser]} profiles={profiles} history={history} challenges={challenges} onClose={()=>setProfileOpen(false)} onSaveWeight={handleSaveWeight} onSaveGoal={handleSaveGoal} onChangePin={handleChangePin} onChangeName={handleChangeName} onSaveProfile={np=>setProfiles(np)} onSaveBackfill={handleSaveBackfill}/>}
      {adminOpen&&<AdminPanel showToast={showToast} members={members} profiles={profiles} currentUser={currentUser} adminName={adminName} onResetPin={handleResetPin} onDeleteAccount={handleDeleteAccount} onAdminBackfill={handleAdminBackfill} onClose={()=>setAdminOpen(false)} garageEquipment={garageEquipment} onSaveGarageEquipment={async(list)=>{await fsSet("wolfpack/settings",{garageEquipment:list});setGarageEquipment(list);showToast("🏠 Garage gym updated!");}}/>}
    </div>
  );
}
