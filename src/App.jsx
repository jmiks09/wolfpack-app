import { useCallback, useEffect, useRef, useState } from "react";
import { AITrainerModal } from "./ai/AITrainerModal";
import { CoachPlanModal } from "./ai/CoachPlanModal";
import { MealScannerModal } from "./ai/MealScannerModal";
import { AvatarDisplay } from "./components/AvatarDisplay";
import { NotifBanner } from "./components/NotifBanner";
import { Toast } from "./components/Toast";
import { WhatsNewModal } from "./components/WhatsNewModal";
import { WolfIcon } from "./components/WolfIcon";
import { fsArrayAdd, fsArrayRemove, fsDelete, fsDeleteFields, fsGet, fsListen, fsSet, onForegroundMessage } from "./firebase";
import { LEGACY_GROUP_ID, REGISTRY_PATH, clearSession, ensureLegacyGroup, findGroupByCode, gpath, groupsForUser, loadSession, makeGroupId, makeInviteCode, memberSince, renameInGroup, saveSession } from "./lib/groups";
import { dismissActiveWorkout } from "./lib/activeWorkout";
import { EFFORT_RATINGS, HOME_GYM_DEFAULT } from "./lib/aiConfig";
import { muscleKeyLabel } from "./lib/exerciseLibrary";
import { MILESTONES, NAV, SESSION_MILESTONES, WHATS_NEW_FALLBACK } from "./lib/constants";
import { getDateRange, localDateStr, todayStr } from "./lib/dates";
import { getFavorites, getFavoritesFS } from "./lib/favorites";
import { slotOverlaps } from "./lib/gym";
import { getStreak, getTotalWorkouts } from "./lib/stats";
import { launchConfetti } from "./lib/utils";
import { ProfileModal } from "./profile/ProfileModal";
import { AdminPanel } from "./screens/AdminPanel";
import { Entry } from "./screens/Entry";
import { GroupGate } from "./screens/GroupGate";
import { GroupSheet } from "./components/GroupSheet";
import { HabitBuilder } from "./tabs/challenges/habits/HabitBuilder";
import { ChatTab } from "./tabs/chat/ChatTab";
import { FeedPost } from "./tabs/feed/FeedPost";
import { chatDayPath, chatIndexPath, deleteMessage, newMsgId, postMessage, removeMessage, renameInChat, setReaction, updateMessage, workoutCardId } from "./lib/chat";
import { addDays, challengeWeeks, daysBetween, penaltyMode, scoreChallenge } from "./lib/habits";
import { HabitChallengeCard } from "./tabs/challenges/habits/HabitChallengeCard";
import { HabitTodayCard } from "./tabs/challenges/habits/HabitTodayCard";
import { ChallengesTab } from "./tabs/challenges/ChallengesTab";
import { GymTab } from "./tabs/gym/GymTab";
import { PackTab } from "./tabs/pack/PackTab";
import { StatsTab } from "./tabs/stats/StatsTab";
import { ActiveWorkoutCard } from "./workouts/ActiveWorkoutCard";
import { EditCompletedWorkoutModal } from "./workouts/EditCompletedWorkoutModal";
import { EditWorkoutModal } from "./workouts/EditWorkoutModal";
import { EffortRatingModal } from "./workouts/EffortRatingModal";
import { anySetDone, buildPrelogged, workoutSummary } from "./lib/setLog";
import { workoutFromHistory } from "./lib/repeatWorkout";
import { WorkoutModal } from "./workouts/WorkoutModal";

const NO_MEMBERS=[];
const restRuleKey=(gid,cid)=>`${gid}_${cid}`;
// The rest-day cap a habit challenge puts on one participant, or null.
// The step count a challenge set for counting a day as a workout: its "Workout" goal's
// setting, else its cardio goal's. null when the challenge doesn't set one.
function challengeSteps(c){
  const ws=(c?.habits||[]).filter(h=>h.type==="workout");
  const pick=ws.find(h=>(h.filter||"any")==="any")||ws.find(h=>h.filter==="cardio");
  return Number(pick?.steps)>0?Number(pick.steps):null;
}
// What a habit challenge sets for one participant on their profile (rest-day cap,
// step count), or null if it sets neither.
function restRuleFor(gid,c,user){
  const p=c?.participants?.[user];
  const steps=challengeSteps(c);
  if(!p||(c.restDays==null&&steps==null)||!c.start||!c.end)return null;
  const start=p.joinedAt&&p.joinedAt>c.start?p.joinedAt:c.start;
  const end=p.leftAt?addDays(p.leftAt,-1):c.end;
  if(end<start)return null;
  return {limit:c.restDays??null,...(steps!=null?{steps}:{}),start,end,name:c.name||"Challenge",emoji:c.emoji||"🔥"};
}

export default function App(){
  const [screen,setScreen]=useState("loading");
  const [groups,setGroups]=useState({});
  const [groupId,setGroupId]=useState(null);
  const [boot,setBoot]=useState({profiles:false,groups:false,legacy:false});
  const [groupSheetOpen,setGroupSheetOpen]=useState(false);
  const [groupGateMode,setGroupGateMode]=useState(null);
  const [profiles,setProfiles]=useState({});
  const [currentUser,setCurrentUser]=useState(null);
  const [sharedData,setSharedData]=useState({});
  const [history,setHistory]=useState({});
  const [feed,setFeed]=useState([]);
  const [challenges,setChallenges]=useState([]);
  const [gymSlots,setGymSlots]=useState([]);
  const [view,setView]=useState("pack");
  const [whatsNewData,setWhatsNewData]=useState(null);
  const [whatsNewOpen,setWhatsNewOpen]=useState(false);
  const dismissWhatsNew=()=>{
    try{localStorage.setItem("wp_seen_version",(whatsNewData||WHATS_NEW_FALLBACK).version);}catch{}
    setWhatsNewOpen(false);
  };
  const [workoutOpen,setWorkoutOpen]=useState(false);
  const [workoutDate,setWorkoutDate]=useState(null); // null = today
  const [adminOpen,setAdminOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [lastSeen,setLastSeen]=useState({feed:0,challenges:0,gym:0});
  const [packGoals,setPackGoals]=useState([]);
  const [habitChallenges,setHabitChallenges]=useState({});
  const [habitLogs,setHabitLogs]=useState({});
  const [habitBuilder,setHabitBuilder]=useState(null); // "new" or a challenge id
  const [chatIndex,setChatIndex]=useState({});      // days that have messages
  const [chatDocs,setChatDocs]=useState({});        // day -> {msgId: message}
  const [chatWindow,setChatWindow]=useState(7);     // how many recent message-days to load
  const [chatDivider,setChatDivider]=useState(0);   // "new messages" line position
  const [legacyFeedOpen,setLegacyFeedOpen]=useState(false);
  // Current group. Members, admin, feed, challenges, gym, goals and reactions are per group;
  // profiles and workouts are per person and shared across all of their groups.
  const group=groupId?groups[groupId]:null;
  const members=group?.members||NO_MEMBERS;
  const adminName=group?.admin||null;
  const myGroups=currentUser?groupsForUser(groups,currentUser):[];
  const gp=base=>gpath(groupId,base);
  const sinceFor=u=>memberSince(group,u);
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
      const u1=fsListen("wolfpack/workouts",d=>{if(d){setSharedData(d.byDate||{});setHistory(d.byDate||{});}});
      const u2=fsListen("wolfpack/profiles",d=>{if(d)setProfiles(d.users||{});setBoot(b=>b.profiles?b:{...b,profiles:true});});
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
      const u11=fsListen(REGISTRY_PATH,d=>{setGroups(d?.list||{});setBoot(b=>b.groups?b:{...b,groups:true});});
      unsubs.current=[u1,u2,u9,u10,u11];
      try{await ensureLegacyGroup((await fsGet(REGISTRY_PATH))?.list);}catch(e){console.warn("Group setup failed:",e);}
      setBoot(b=>({...b,legacy:true}));
    })();
    return()=>unsubs.current.forEach(u=>u?.());
  },[]);

  // Per-group listeners — re-subscribe whenever the group changes.
  useEffect(()=>{
    if(!groupId)return;
    const p=base=>gpath(groupId,base);
    const us=[
      fsListen(p("feed"),d=>setFeed((d?.posts||[]).sort((a,b)=>b.ts-a.ts))),
      fsListen(p("challenges"),d=>setChallenges(d?.list||[])),
      fsListen(p("gym"),d=>setGymSlots(d?.slots||[])),
      fsListen(p("packgoals"),d=>setPackGoals(d?.list||[])),
      fsListen(p("reactions"),d=>setReactions(d?.data||{})),
      fsListen(p("settings"),d=>setGarageEquipment(d?.garageEquipment||HOME_GYM_DEFAULT)),
      fsListen(p("habits"),d=>setHabitChallenges(d?.list||{})),
    ];
    return()=>us.forEach(u=>u?.());
  },[groupId]);

  // Chat: the day index, then the most recent days that have messages.
  useEffect(()=>{
    if(!groupId)return;
    return fsListen(chatIndexPath(groupId),d=>setChatIndex(d?.days||{}));
  },[groupId]);
  const chatDays=[...new Set([todayStr(),...Object.keys(chatIndex)])].sort().reverse().slice(0,chatWindow);
  const chatDaysKey=chatDays.join(",");
  useEffect(()=>{
    if(!groupId)return;
    const us=chatDaysKey.split(",").map(day=>fsListen(chatDayPath(groupId,day),d=>setChatDocs(c=>({...c,[day]:d?.msgs||{}}))));
    return()=>us.forEach(u=>u?.());
  },[groupId,chatDaysKey]);

  // Rest-day caps: read habit challenges from every group I'm in and record the
  // limits on my profile (dated), so streaks follow the strictest active challenge.
  const myGroupIds=myGroups.map(g=>g.id).sort().join(",");
  const [allHabits,setAllHabits]=useState({});
  useEffect(()=>{
    if(!myGroupIds)return;
    const us=myGroupIds.split(",").map(gid=>fsListen(gpath(gid,"habits"),d=>setAllHabits(a=>({...a,[gid]:d?.list||{}}))));
    return()=>us.forEach(u=>u?.());
  },[myGroupIds]);
  const myRestRulesKey=JSON.stringify(profiles[currentUser]?.restRules||{});
  useEffect(()=>{
    if(!currentUser||!myGroupIds||!profiles[currentUser])return;
    const ids=myGroupIds.split(",");
    if(ids.some(gid=>!(gid in allHabits)))return; // wait until every group has loaded
    const want={};
    for(const gid of ids)for(const c of Object.values(allHabits[gid]||{})){
      const rule=restRuleFor(gid,c,currentUser);
      if(rule)want[restRuleKey(gid,c.id)]=rule;
    }
    const have=JSON.parse(myRestRulesKey);
    const changed=Object.fromEntries(Object.entries(want).filter(([k,v])=>JSON.stringify(have[k])!==JSON.stringify(v)));
    const stale=Object.keys(have).filter(k=>!(k in want));
    if(Object.keys(changed).length)fsSet("wolfpack/profiles",{users:{[currentUser]:{restRules:changed}}}).catch(()=>{});
    if(stale.length)fsDeleteFields("wolfpack/profiles",stale.map(k=>["users",currentUser,"restRules",k])).catch(()=>{});
  },[currentUser,myGroupIds,allHabits,myRestRulesKey,profiles]);

  // Check-in logs: one document per habit challenge.
  const habitIds=Object.keys(habitChallenges).sort().join(",");
  useEffect(()=>{
    if(!groupId||!habitIds)return;
    const us=habitIds.split(",").map(cid=>fsListen(gpath(groupId,`hlog_${cid}`),d=>setHabitLogs(l=>({...l,[cid]:d||{}}))));
    return()=>us.forEach(u=>u?.());
  },[groupId,habitIds]);


  useEffect(()=>{const u=onForegroundMessage(p=>{const{title,body}=p.notification||{};showToast(`${title||"WOLFPACK"}: ${body||""}`);});return()=>u?.();},[showToast]);

  // ── ACCOUNTS & GROUPS ──────────────────────────────────────────────────────
  const openGroup=(gid,user)=>{
    const u=user||currentUser;
    setGroupId(gid);
    setFeed([]);setChallenges([]);setGymSlots([]);setPackGoals([]);setReactions({});setHabitChallenges({});setHabitLogs({});setHabitBuilder(null);setChatIndex({});setChatDocs({});setChatWindow(7);setLegacyFeedOpen(false);setGarageEquipment(HOME_GYM_DEFAULT);
    setView("pack");setGroupGateMode(null);setGroupSheetOpen(false);setAdminOpen(false);
    const prof=profiles[u];
    setLastSeen(prof?.lastSeenByGroup?.[gid]||(gid===LEGACY_GROUP_ID?prof?.lastSeen:null)||{feed:0,challenges:0,gym:0});
    saveSession({user:u,group:gid});
    setScreen("main");
  };
  // Signed in: go to the remembered group, the only group, or the group list.
  const enterAs=(user,preferredGroup)=>{
    setCurrentUser(user);
    const mine=groupsForUser(groups,user);
    const pick=mine.find(g=>g.id===preferredGroup)?.id||(mine.length===1?mine[0].id:null);
    if(pick){openGroup(pick,user);return;}
    saveSession({user,group:null});
    setGroupId(null);setScreen("groups");
  };
  const handleCreateAccount=async(name,avatar,pin,avatarImg)=>{
    await fsSet(`wolfpack/pin_${name}`,{pin});
    const profile={avatar:avatar||"🐺",...(avatarImg?{avatarImg}:{})};
    await fsSet("wolfpack/profiles",{users:{[name]:profile}});
    setProfiles(p=>({...p,[name]:profile}));
    enterAs(name);
  };
  const handleSetPin=async(user,pin)=>{await fsSet(`wolfpack/pin_${user}`,{pin});};
  const handleJoinGroup=async code=>{
    const g=findGroupByCode(groups,code);
    if(!g)return "That code doesn't match any group. Double-check it with your friend.";
    if(!(g.members||[]).includes(currentUser)){
      try{await fsArrayAdd(REGISTRY_PATH,["list",g.id,"members"],currentUser);await fsSet(REGISTRY_PATH,{list:{[g.id]:{joined:{[currentUser]:todayStr()}}}});}
      catch(e){console.warn(e);return "Couldn't join right now. Check your connection and try again.";}
      if(g.id===LEGACY_GROUP_ID){
        const l=(await fsGet("wolfpack/members"))?.list||[];
        if(!l.includes(currentUser))await fsSet("wolfpack/members",{list:[...l,currentUser]});
      }
      setGroups(p=>({...p,[g.id]:{...g,members:[...(g.members||[]),currentUser]}}));
      if(g.chatSystem!==false)postMessage(g.id,{id:`sys_join_${currentUser.replace(/[^\w]/g,"_")}`,kind:"system",text:`👋 ${currentUser} joined the group`}).catch(()=>{});
      showToast(`Welcome to ${g.name}! 🐺`);
    }
    openGroup(g.id);
    return null;
  };
  const handleCreateGroup=async(name,emoji)=>{
    const id=makeGroupId();
    const g={id,name,emoji,code:makeInviteCode(Object.values(groups).map(x=>x.code)),admin:currentUser,members:[currentUser],joined:{[currentUser]:todayStr()},gym:false,createdAt:Date.now()};
    await fsSet(REGISTRY_PATH,{list:{[id]:g}});
    setGroups(p=>({...p,[id]:g}));
    return g;
  };
  const handleUpdateGroup=async patch=>{
    await fsSet(REGISTRY_PATH,{list:{[groupId]:patch}});
    setGroups(p=>({...p,[groupId]:{...p[groupId],...patch}}));
  };
  const handleNewInviteCode=async()=>{
    const code=makeInviteCode(Object.values(groups).map(x=>x.code));
    await handleUpdateGroup({code});
    showToast(`New invite code: ${code}`);
  };
  const handleSignOut=()=>{
    clearSession();
    setGroupSheetOpen(false);setGroupGateMode(null);setAdminOpen(false);setProfileOpen(false);
    setGroupId(null);setCurrentUser(null);setScreen("entry");
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
      await fsSet(gp("challenges"),{list:newChallenges});
    }
    showToast(`✓ Logged ${icons} for ${member} on ${date}`);
  };

  // Once profiles and groups have loaded, resume a remembered session or show the entry screen.
  useEffect(()=>{
    if(screen!=="loading"||!boot.profiles||!boot.groups||!boot.legacy)return;
    const s=loadSession();
    if(s?.user&&profiles[s.user])enterAs(s.user,s.group);
    else setScreen("entry");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[boot,screen,profiles,groups]);

  // Admin: remove someone from this group. Their account and workouts are kept.
  const handleDeleteAccount=async m=>{
    const nc=challenges.map(c=>{const p={...c.participants};delete p[m];return{...c,participants:p};});
    const ns=gymSlots.filter(s=>s.bookedBy!==m);
    await Promise.all([
      fsArrayRemove(REGISTRY_PATH,["list",groupId,"members"],m),
      ...(group?.joined?.[m]?[fsDeleteFields(REGISTRY_PATH,[["list",groupId,"joined",m]])]:[]),
      fsSet(gp("challenges"),{list:nc}),
      fsSet(gp("gym"),{slots:ns}),
      ...(groupId===LEGACY_GROUP_ID?[fsSet("wolfpack/members",{list:members.filter(x=>x!==m)})]:[]),
    ]);
    setGroups(p=>({...p,[groupId]:{...p[groupId],members:(p[groupId]?.members||[]).filter(x=>x!==m)}}));
    showToast(`${m} removed from ${group?.name||"the group"}.`);
  };

  const handleAddPackGoal=async t=>{
    const goal={id:Date.now().toString(),author:currentUser,text:t,cheers:[],ts:Date.now(),date:todayStr()};
    await fsSet(gp("packgoals"),{list:[goal,...packGoals]});
  };
  const handleCheerGoal=async(id,user)=>{
    const nl=packGoals.map(g=>{if(g.id!==id)return g;const c=g.cheers||[];return{...g,cheers:c.includes(user)?c.filter(x=>x!==user):[...c,user]};});
    await fsSet(gp("packgoals"),{list:nl});
  };
  const handleDeletePackGoal=async id=>{
    await fsSet(gp("packgoals"),{list:packGoals.filter(g=>g.id!==id)});
  };

  // Reactions
  const handleReact=async(member,emoji)=>{
    const memberReactions=reactions[member]||{};
    const emojiList=memberReactions[emoji]||[];
    const updated={...reactions,[member]:{...memberReactions,[emoji]:emojiList.includes(currentUser)?emojiList.filter(x=>x!==currentUser):[...emojiList,currentUser]}};
    await fsSet(gp("reactions"),{data:updated});
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
    await fsDeleteFields("wolfpack/workouts",[["byDate",date,currentUser]]);
    myGroups.forEach(g=>removeMessage(g.id,date,workoutCardId(currentUser,date)));
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

  // After logging: a workout card (plus any milestone) in the chat of every group you're in.
  const checkMilestones=async(newHistory,{stepsOnly=false}={})=>{
    const day=todayStr(),entry=newHistory[day]?.[currentUser];
    const streak=getStreak(newHistory,currentUser,profiles[currentUser]);
    const sessions=getTotalWorkouts(newHistory,currentUser);
    const streakMilestone=stepsOnly?null:MILESTONES.find(m=>streak===m);
    const sessionMilestone=stepsOnly?null:SESSION_MILESTONES.find(m=>sessions===m);
    const safe=currentUser.replace(/[^\w]/g,"_");
    const cards=[];
    if(entry)cards.push({id:workoutCardId(currentUser,day),kind:"activity",author:currentUser,
      text:`logged ${[...(entry.workouts||[]).map(w=>`${w.icon} ${w.label}`),...(entry.steps?[`👟 ${Number(entry.steps).toLocaleString("en-US")} steps`]:[])].join(" + ")||"a workout"}`,
      detail:[...(entry.summary||[]).filter(x=>x.includes(":")),entry.duration?`${entry.duration} min`:null].filter(Boolean).join(" · ").slice(0,120),ts:Date.now()});
    if(streakMilestone)cards.push({id:`ms_${safe}_streak${streakMilestone}_${day}`,kind:"activity",author:currentUser,text:`hit a ${streakMilestone}-day streak! 🔥🐺`,ts:Date.now()+1});
    if(sessionMilestone)cards.push({id:`ms_${safe}_sess${sessionMilestone}`,kind:"activity",author:currentUser,text:`logged workout #${sessionMilestone}! 💪`,ts:Date.now()+2});
    const targets=myGroups.filter(g=>g.chatSystem!==false);
    await Promise.all(targets.flatMap(g=>cards.map(c=>postMessage(g.id,c).catch(e=>console.warn("chat post failed",e)))));
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
    const nn=newName.trim();
    if(!nn){setErr("Name can't be empty");return;}
    if(nn===currentUser)return;
    if(Object.keys(profiles).some(k=>k.toLowerCase()===nn.toLowerCase()&&k!==currentUser)){setErr("That name is already taken");return;}
    const oldName=currentUser;
    const swap=x=>x===oldName?nn:x;
    // Profile: copy to the new name, then really delete the old key
    await fsSet("wolfpack/profiles",{users:{[nn]:profiles[oldName]||{}}});
    await fsDeleteFields("wolfpack/profiles",[["users",oldName]]);
    // Workout history
    const moved={},dels=[];
    Object.entries(history).forEach(([date,day])=>{if(day?.[oldName]){moved[date]={[nn]:day[oldName]};dels.push(["byDate",date,oldName]);}});
    if(dels.length){await fsSet("wolfpack/workouts",{byDate:moved});await fsDeleteFields("wolfpack/workouts",dels);}
    // PIN
    const pinData=await fsGet(`wolfpack/pin_${oldName}`);
    if(pinData){await fsSet(`wolfpack/pin_${nn}`,pinData);await fsDelete(`wolfpack/pin_${oldName}`);}
    // Every group they belong to
    for(const g of groupsForUser(groups,oldName)){
      await fsSet(REGISTRY_PATH,{list:{[g.id]:{members:(g.members||[]).map(swap),admin:swap(g.admin),...(g.joined?.[oldName]?{joined:{[nn]:g.joined[oldName]}}:{})}}});
      if(g.joined?.[oldName])await fsDeleteFields(REGISTRY_PATH,[["list",g.id,"joined",oldName]]);
      await renameInGroup(g.id,oldName,nn);
      await renameInChat(g.id,oldName,nn);
    }
    setProfiles(p=>{const np={...p,[nn]:p[oldName]};delete np[oldName];return np;});
    setCurrentUser(nn);saveSession({user:nn,group:groupId});
    setDone(true);
    showToast(`Name updated to ${nn}!`);
  };

  const [loggingWorkout,setLoggingWorkout]=useState(false);
  const closeWorkout=()=>{setWorkoutOpen(false);setWorkoutDate(null);};
  const handleLogWorkout=async(workouts,note,duration,details,summary,opts)=>{
    if(loggingWorkout)return; // prevent double-tap
    setLoggingWorkout(true);
    try{
    const today=todayStr(),key=opts?.date||today,late=key!==today;
    const time=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    const steps=opts?.steps||null;
    if(!workouts.length){
      // Steps only: saved on the day without making it a workout day.
      if(!steps)return;
      const prev=history[key]?.[currentUser]||{};
      const newData={...history,[key]:{...(history[key]||{}),[currentUser]:{...prev,steps}}};
      await fsSet("wolfpack/workouts",{byDate:{[key]:{[currentUser]:{steps}}}});
      setHistory(newData);setSharedData(newData);closeWorkout();
      const dayName=new Date(key+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
      showToast(`👟 ${steps.toLocaleString("en-US")} steps ${late?`added to ${dayName}`:"logged"}`);
      if(late)await postLateCard(key,dayName,[],[],opts?.proof,steps);
      else await checkMilestones(newData,{stepsOnly:true});
      return;
    }
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
    const entry={done:true,workouts:newWorkouts,workoutIcon:icons,workoutLabel:summaryLines.join(" | "),summary:summaryLines,note,duration:totalDur,details:mergedDetails,time,
      ...((steps??existing.steps)?{steps:steps??existing.steps}:{}),
      ts:late?(existing.ts||new Date(key+"T12:00:00").getTime()):Date.now(),sessionCount,
      ...(late?{late:{addedOn:today,addedAt:Date.now(),...(existing.late?{count:(existing.late.count||1)+1}:{})}}:{})};
    const newData={...history,[key]:{...(history[key]||{}),[currentUser]:entry}};
    await fsSet("wolfpack/workouts",{byDate:{[key]:{[currentUser]:entry}}});
    setHistory(newData);setSharedData(newData);
    closeWorkout();launchConfetti();
    if(late){
      const dayName=new Date(key+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
      showToast(`${icons} Added to ${dayName} ✓`);
      await postLateCard(key,dayName,workouts,summaryLines,opts?.proof,steps);
    }else{
      showToast(`${icons} Logged! Keep grinding! 🐺`);
      await checkMilestones(newData);
    }
    }catch(e){console.warn(e);showToast("Couldn't save. Check your connection and try again.");}
    finally{setLoggingWorkout(false);}
  };
  // Workouts added for a past day get their own chat card, marked late, with any proof photo.
  const postLateCard=async(day,dayName,added,summaryLines,proof,steps)=>{
    const safe=currentUser.replace(/[^\w]/g,"_");
    const ids=new Set(added.map(w=>w.label));
    const card={id:`late_${safe}_${day}_${Date.now().toString(36)}`,kind:"activity",author:currentUser,late:true,forDay:day,
      text:`added ${[...added.map(w=>`${w.icon} ${w.label}`),...(steps?[`👟 ${steps.toLocaleString("en-US")} steps`]:[])].join(" + ")} for ${dayName}`,
      detail:["Logged late",...summaryLines.filter(x=>x.includes(":")&&ids.has(x.split(":")[0]))].join(" · ").slice(0,120),
      ...(proof?{photo:proof}:{})};
    const targets=myGroups.filter(g=>g.chatSystem!==false);
    await Promise.all(targets.map(g=>postMessage(g.id,card).catch(e=>console.warn("chat post failed",e))));
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
    const mgLabel=muscleGroup?muscleKeyLabel(muscleGroup):null;
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
        suggestedWeight:e.suggestedWeight??e.weight??null,weightUsed:e.weightUsed||null,effortRating:null,
        ...(e.setLog!==undefined?{actualReps:e.actualReps||null,skipped:!!e.skipped,setLog:e.setLog||null}:{}),
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
    await fsSet(gp("feed"),{posts:[post,...feed]});showToast("Posted! 🐺");
  };
  const handleLike=async id=>{await fsSet(gp("feed"),{posts:feed.map(p=>{if(p.id!==id)return p;const l=p.likes||[];return{...p,likes:l.includes(currentUser)?l.filter(x=>x!==currentUser):[...l,currentUser]};})});};
  const handleDelPost=async id=>{await fsSet(gp("feed"),{posts:feed.filter(p=>p.id!==id)});};
  const handleComment=async(postId,text)=>{
    const comment={author:currentUser,text,ts:Date.now()};
    const newFeed=feed.map(p=>{
      if(p.id!==postId)return p;
      return{...p,comments:[...(p.comments||[]),comment]};
    });
    await fsSet(gp("feed"),{posts:newFeed});
  };
  const handleDeleteComment=async(postId,idx)=>{
    const newFeed=feed.map(p=>{
      if(p.id!==postId)return p;
      const comments=[...(p.comments||[])];
      comments.splice(idx,1);
      return{...p,comments};
    });
    await fsSet(gp("feed"),{posts:newFeed});
  };
  const handleBookGym=async(date,slot,durationMins,displayTime)=>{
    // Check for conflicts
    const daySlots=gymSlots.filter(s=>s.date===date);
    const conflict=daySlots.find(s=>s.bookedBy!==currentUser&&slotOverlaps(slot.h,slot.m,s));
    if(conflict){showToast("That time overlaps with an existing booking!");return;}
    const myConflict=daySlots.find(s=>s.bookedBy===currentUser&&slotOverlaps(slot.h,slot.m,s));
    if(myConflict){showToast("You already have a booking that overlaps!");return;}
    const booking={id:Date.now().toString(),date,time:slot.label,displayTime,startH:slot.h,startM:slot.m,durationMins,bookedBy:currentUser,createdAt:Date.now()};
    await fsSet(gp("gym"),{slots:[...gymSlots,booking]});
    showToast(`Gym booked: ${displayTime}! 💪`);
  };
  const handleCancelGym=async id=>{await fsSet(gp("gym"),{slots:gymSlots.filter(s=>s.id!==id)});showToast("Cancelled.");};
  const handleAddChallenge=async c=>{await fsSet(gp("challenges"),{list:[c,...challenges]});showToast("Challenge created! ⚔️");};
  const handleLogProgress=async(cid,member,progress,done)=>{
    const nl=challenges.map(c=>{
      if(c.id!==cid)return c;
      const u={...c,participants:{...c.participants,[member]:{progress,done}}};
      if(Object.values(u.participants).every(p=>p.done)){u.status="completed";launchConfetti();showToast("🏆 Challenge complete!");}
      return u;
    });
    await fsSet(gp("challenges"),{list:nl});
    if(done)showToast("✓ You completed your part! 🎉");else showToast("Progress logged!");
  };
  const handleDelChallenge=async id=>{await fsSet(gp("challenges"),{list:challenges.filter(c=>c.id!==id)});showToast("Challenge removed.");};
  const handleEditChallenge=async u=>{await fsSet(gp("challenges"),{list:challenges.map(c=>c.id===u.id?u:c)});showToast("Challenge updated!");};
  const handleAcceptChallenge=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      return{...c,participants:{...c.participants,[member]:{
        ...c.participants[member],
        status:"accepted",
        acceptedAt:todayStr(), // track when they joined for penalty purposes
      }}};
    });
    await fsSet(gp("challenges"),{list:newList});
    showToast("Challenge accepted! Rest days are now locked. ⚔️");
  };
  const handleDeclineChallenge=async(challengeId,member)=>{
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      const np={...c.participants};
      delete np[member];
      return{...c,participants:np};
    });
    await fsSet(gp("challenges"),{list:newList});
    showToast("Challenge declined.");
  };
  const handleMarkPaid=async(challengeId,member,amount,method)=>{
    const payment={amount,method,date:todayStr(),ts:Date.now()};
    const newList=challenges.map(c=>{
      if(c.id!==challengeId)return c;
      const existingPayments=c.payments?.[member]||[];
      return{...c,payments:{...c.payments,[member]:[...existingPayments,payment]}};
    });
    await fsSet(gp("challenges"),{list:newList});
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
    await fsSet(gp("challenges"),{list:newList});
    showToast(`🏳️ Forfeited. You owe $${challenges.find(c=>c.id===challengeId)?.forfeitCap||0}.`);
  };

  // ── HABIT CHALLENGES ───────────────────────────────────────────────────────
  const habitList=Object.values(habitChallenges).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const handleSaveHabitChallenge=async(def,removed)=>{
    const id=def.id||`hc${Date.now().toString(36)}`;
    const full={...def,id,createdBy:def.createdBy||currentUser,createdAt:def.createdAt||Date.now()};
    await fsSet(gp("habits"),{list:{[id]:full}});
    if(removed?.length)await fsDeleteFields(gp("habits"),removed.map(u=>["list",id,"participants",u]));
    const key=restRuleKey(groupId,id);
    const users=Object.keys(full.participants||{}).filter(u=>profiles[u]);
    const setRules=Object.fromEntries(users.map(u=>[u,restRuleFor(groupId,full,u)]).filter(([,v])=>v).map(([u,v])=>[u,{restRules:{[key]:v}}]));
    if(Object.keys(setRules).length)await fsSet("wolfpack/profiles",{users:setRules}).catch(()=>{});
    const clear=[...removed||[],...users.filter(u=>!restRuleFor(groupId,full,u))].filter(u=>profiles[u]?.restRules?.[key]);
    if(clear.length)await fsDeleteFields("wolfpack/profiles",clear.map(u=>["users",u,"restRules",key])).catch(()=>{});
    showToast(def.id?"Challenge updated.":`${full.emoji} ${full.name} is on!`);
  };
  const handleDeleteHabitChallenge=async id=>{
    await fsDeleteFields(gp("habits"),[["list",id]]);
    await fsDelete(gp(`hlog_${id}`));
    showToast("Challenge deleted.");
  };
  const handleHabitLog=(cid,date,patch)=>fsSet(gp(`hlog_${cid}`),{byUser:{[currentUser]:{days:{[date]:patch}}}});
  const handleSavePersonal=(cid,goal)=>fsSet(gp(`hlog_${cid}`),{byUser:{[currentUser]:{personal:{[goal.id]:goal}}}});
  const handleDeletePersonal=(cid,id)=>fsDeleteFields(gp(`hlog_${cid}`),[["byUser",currentUser,"personal",id]]);
  const handleUsePass=(cid,monday,list)=>fsSet(gp(`hlog_${cid}`),{byUser:{[currentUser]:{passes:{[monday]:list}}}});
  const handleGoalWeight=(cid,w)=>fsSet(gp(`hlog_${cid}`),{byUser:{[currentUser]:{goalWeight:w}}});
  const handleJoinHabit=async cid=>{
    await fsSet(gp("habits"),{list:{[cid]:{participants:{[currentUser]:{joinedAt:todayStr(),leftAt:null}}}}});
    showToast("You're in! 💪");
  };
  const handleLeaveHabit=async cid=>{
    await fsSet(gp("habits"),{list:{[cid]:{participants:{[currentUser]:{leftAt:todayStr()}}}}});
    showToast("You left the challenge.");
  };
  const handleHabitPayment=async(cid,member,amount)=>{
    const pid=`p${Date.now().toString(36)}`;
    await fsSet(gp("habits"),{list:{[cid]:{payments:{[member]:{[pid]:{amount,ts:Date.now(),by:currentUser,date:todayStr()}}}}}});
    showToast(`$${amount} recorded for ${member}.`);
  };

  // ── CHAT ───────────────────────────────────────────────────────────────────
  const chatMessages=Object.entries(chatDocs).filter(([day])=>chatDays.includes(day))
    .flatMap(([,msgs])=>Object.values(msgs||{})).filter(m=>m&&m.ts).sort((a,b)=>a.ts-b.ts);
  const canLoadMoreChat=Object.keys(chatIndex).some(d=>!chatDays.includes(d));
  const chatUnread=chatMessages.filter(m=>m.kind!=="system"&&m.author!==currentUser&&m.ts>(lastSeen.feed||0)).length;
  const handleChatSend=async({text,photo,replyTo})=>{
    try{await postMessage(groupId,{id:newMsgId(),kind:"msg",author:currentUser,text,photo:photo||null,replyTo:replyTo||null});}
    catch(e){console.warn(e);showToast("Couldn't send. Check your connection and try again.");throw e;}
  };
  const handleChatEdit=(m,text)=>updateMessage(groupId,m.day,m.id,{text,edited:true});
  const handleChatDelete=m=>deleteMessage(groupId,m.day,m.id);
  const handleChatReact=(m,emoji,on)=>setReaction(groupId,m.day,m.id,emoji,currentUser,on).catch(()=>{});
  const handleChatSeen=useCallback(ts=>{
    setLastSeen(p=>{
      if((p.feed||0)>=ts)return p;
      const updated={...p,feed:ts};
      if(currentUser&&groupId)fsSet("wolfpack/profiles",{users:{[currentUser]:{lastSeenByGroup:{[groupId]:updated},...(groupId===LEGACY_GROUP_ID?{lastSeen:updated}:{})}}});
      return updated;
    });
  },[currentUser,groupId]);

  // When a challenge week closes, post a summary line in the chat (once per week).
  const announcedRef=useRef(new Set());
  useEffect(()=>{
    if(!groupId||!group||group.chatSystem===false)return;
    const today=todayStr();
    for(const c of Object.values(habitChallenges)){
      const log=habitLogs[c.id];if(!log)continue;
      for(const w of challengeWeeks(c).filter(w=>w.to<today&&daysBetween(w.to,today)<=7)){
        const key=`${groupId}:${c.id}:${w.index}`;
        if(c.announced?.[w.index]||announcedRef.current.has(key))continue;
        announcedRef.current.add(key);
        const s=scoreChallenge(c,log,history,today);
        const rows=s.scores.filter(m=>!m.left&&m.rows[w.index]?.counted);
        const perfect=rows.filter(m=>m.rows[w.index].missed===0).map(m=>m.user);
        const owing=rows.filter(m=>m.rows[w.index].fee>0);
        const trial=w.from<c.penaltyStart;
        const flat=penaltyMode(c)==="flat";
        const parts=[`${c.emoji} ${c.name} · Week ${w.index+1} closed.`,
          perfect.length?`Perfect week: ${perfect.join(", ")}.`:"No perfect weeks this time.",
          trial?"Trial week, no charges."
            :owing.length?(flat?`${c.money?.flatLabel||"Penalty"} owed: ${owing.map(m=>m.user).join(", ")}.`:`Owing: ${owing.map(m=>`${m.user} $${m.rows[w.index].fee}`).join(", ")}.`)
            :"Nobody owes anything!",
          trial?"":`Pot: $${s.pot}.`].filter(Boolean);
        postMessage(groupId,{id:`sys_${c.id}_w${w.index}`,kind:"system",text:parts.join(" ")})
          .then(()=>fsSet(gp("habits"),{list:{[c.id]:{announced:{[w.index]:true}}}}))
          .catch(e=>console.warn("week summary failed",e));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[groupId,group?.chatSystem,habitChallenges,habitLogs,history]);

  // ── DOT CONDITIONS ────────────────────────────────────────────────────────
  const hasFeedDot=chatUnread>0;

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

  if(screen==="loading"||(screen==="main"&&!group))return<div className="loading-screen"><div className="loading-wolf"><img src="/wolfpack-app/wolf-icon.png" alt="wolf" style={{width:80,height:80,objectFit:"contain"}}/></div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:6,background:"linear-gradient(135deg,#fff,#9b7de0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>WOLFPACK</div><div style={{color:"var(--muted)",fontSize:13}}>Loading the pack...</div></div>;
  if(screen==="entry")return<Entry profiles={profiles} groups={groups} onSignIn={name=>enterAs(name)} onCreateAccount={handleCreateAccount} onSetPin={handleSetPin}/>;
  if(screen==="groups")return<GroupGate key={currentUser} user={currentUser} myGroups={myGroups} onPick={gid=>openGroup(gid)} onJoin={handleJoinGroup} onCreate={handleCreateGroup} onSignOut={handleSignOut}/>;

  return(
    <div className="app">
      <canvas id="confetti-canvas"/>
      <Toast msg={toast}/>
      <div className="header">
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}><WolfIcon size={38}/><div style={{minWidth:0}}><button onClick={()=>setGroupSheetOpen(true)} aria-label="Switch group" style={{background:"none",border:"none",padding:0,cursor:"pointer",color:"inherit",display:"flex",alignItems:"center",gap:6,maxWidth:"100%"}}><span className="header-title" style={{display:"inline-block",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{group.name}</span><span style={{fontSize:12,color:"var(--muted)"}}>▾</span></button><div style={{fontSize:11,color:"var(--muted)",letterSpacing:1}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div></div></div>
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
                // If sets were checked off during the workout, log exactly those
                const tracked=anySetDone(data.workout.exercises);
                const prelogged=tracked?buildPrelogged(data.workout.exercises):null;
                handleLogAIWorkout({
                  summary:workoutSummary(data.workout.exercises,tracked),
                  note:`WOLFMODE: ${data.workout.title}`,
                  minutes:logMinutes,
                  exercises:prelogged||data.workout.exercises,
                  muscleGroup:data.muscleGroup,
                });
                setPendingEffortRating({exercises:data.workout.exercises,muscleGroup:data.muscleGroup,prelogged});
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
            {habitList.filter(c=>c.participants?.[currentUser]&&!c.participants[currentUser].leftAt&&c.start<=todayStr()&&todayStr()<=c.end).map(c=>(
              <HabitTodayCard key={c.id} challenge={c} log={habitLogs[c.id]} history={history} currentUser={currentUser} today={todayStr()} onLog={handleHabitLog} onSetGoalWeight={handleGoalWeight} onLogWorkout={d=>{setWorkoutDate(d&&d!==todayStr()?d:null);setWorkoutOpen(true);}} onSavePersonal={handleSavePersonal} onDeletePersonal={handleDeletePersonal} onUsePass={handleUsePass}/>
            ))}
            <PackTab sinceFor={sinceFor} currentUser={currentUser} members={members} profiles={profiles} history={history} sharedData={sharedData} onLogWorkout={()=>setWorkoutOpen(true)} onOpenAITrainer={()=>setAiTrainerOpen(true)} onOpenNutrition={()=>setNutritionOpen(true)} onOpenMealScanner={()=>setMealScannerOpen(true)} onEditWorkout={()=>setEditWorkout({date:todayStr(),entry:sharedData[todayStr()]?.[currentUser]||{}})} adminName={adminName} onOpenAdmin={()=>setAdminOpen(true)} packGoals={packGoals} onAddGoal={handleAddPackGoal} onCheer={handleCheerGoal} onDeleteGoal={handleDeletePackGoal} onOpenProfile={()=>setProfileOpen(true)} reactions={reactions} onReact={handleReact} weeklyRecap={weeklyRecap} onDismissRecap={()=>setWeeklyRecap(r=>r?{...r,dismissed:true}:null)}/>
          </>
        )}
        {view==="feed"&&<ChatTab groupName={group.name} messages={chatMessages} currentUser={currentUser} profiles={profiles} today={todayStr()} dividerTs={chatDivider}
          canLoadMore={canLoadMoreChat} onLoadMore={()=>setChatWindow(w=>w+7)} legacyCount={feed.length} onOpenLegacy={()=>setLegacyFeedOpen(true)}
          onSend={handleChatSend} onEdit={handleChatEdit} onDelete={handleChatDelete} onReact={handleChatReact} onSeen={handleChatSeen}/>}
        {view==="gym"&&<GymTab currentUser={currentUser} gymSlots={gymSlots} onBook={handleBookGym} onCancel={handleCancelGym}/>}
        {view==="challenges"&&<div style={{marginBottom:8}}>
          {habitList.map(c=>(
            <HabitChallengeCard key={c.id} challenge={c} log={habitLogs[c.id]} history={history} profiles={profiles} currentUser={currentUser} isAdmin={currentUser===adminName} today={todayStr()}
              onEdit={()=>setHabitBuilder(c.id)} onJoin={()=>handleJoinHabit(c.id)} onLeave={()=>handleLeaveHabit(c.id)} onRecordPayment={(m,a)=>handleHabitPayment(c.id,m,a)}/>
          ))}
          <button className="btn-ghost" style={{width:"100%",padding:12}} onClick={()=>setHabitBuilder("new")}>+ New habit challenge (like Winter Arc)</button>
        </div>}
        {view==="challenges"&&<ChallengesTab currentUser={currentUser} adminName={adminName} members={members} profiles={profiles} challenges={challenges} history={history} onAdd={handleAddChallenge} onLogProgress={handleLogProgress} onDelete={handleDelChallenge} onEditChallenge={handleEditChallenge} onForfeit={handleForfeit} onAccept={handleAcceptChallenge} onDecline={handleDeclineChallenge} onOpenProfile={()=>setProfileOpen(true)} onMarkPaid={handleMarkPaid} onLogPayment={handleLogPayment}/>}
        {view==="stats"&&<StatsTab sinceFor={sinceFor} currentUser={currentUser} members={members} profiles={profiles} history={history} challenges={challenges} feed={feed} onEditExercises={(date,entry)=>setEditCompletedWorkout({date,entry})} onRepeatWorkout={(date,entry)=>setAiTrainerOpen(workoutFromHistory(entry,date))}/>}
      </div>
      <nav className="nav">
        {NAV.filter(n=>n.id!=="gym"||group.gym).map(n=>{
          const hasDot=n.id==="feed"?hasFeedDot:n.id==="challenges"?hasChallengeDot:n.id==="gym"?hasGymDot:false;
          return(
            <button key={n.id} className={`nav-btn ${view===n.id?"active":""}`}
              onClick={()=>{
                const now=Date.now();
                if(n.id==="feed"&&view!=="feed")setChatDivider(lastSeen.feed||0);
                setView(n.id);
                setLastSeen(p=>{
                  const updated={...p,[n.id]:now};
                  // Persist to Firebase
                  if(currentUser&&groupId){
                    fsSet("wolfpack/profiles",{users:{[currentUser]:{lastSeenByGroup:{[groupId]:updated},...(groupId===LEGACY_GROUP_ID?{lastSeen:updated}:{})}}});
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
                {hasDot&&view!==n.id&&(n.id==="feed"
                  ?<span aria-label={`${chatUnread} unread`} style={{position:"absolute",top:-6,right:-12,minWidth:18,height:18,padding:"0 5px",borderRadius:9,background:"var(--red)",border:"2px solid var(--bg)",color:"#fff",fontSize:10,fontWeight:700,lineHeight:"14px",textAlign:"center",boxSizing:"border-box"}}>{chatUnread>99?"99+":chatUnread}</span>
                  :<span style={{position:"absolute",top:-2,right:-4,width:8,height:8,borderRadius:"50%",background:"var(--red)",border:"2px solid var(--bg)"}}/>
                )}
              </span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      {workoutOpen&&<WorkoutModal onClose={closeWorkout} onSubmit={handleLogWorkout} loading={loggingWorkout} today={todayStr()} initialDate={workoutDate}/>}
      {aiTrainerOpen&&<AITrainerModal currentUser={currentUser} profile={profiles[currentUser]} history={history} packHomeGym={garageEquipment} userFavorites={userFavorites} onFavoritesChange={setUserFavorites} onClose={()=>{setAiTrainerOpen(false);setActiveWorkoutRefresh(r=>r+1);if(!profiles[currentUser]?.aiTrainer?.goal||!profiles[currentUser]?.aiTrainer?.experience){setProfileOpen(true);}}} onUseWorkout={()=>{setActiveWorkoutRefresh(r=>r+1);setView("pack");}} showToast={showToast} initial={typeof aiTrainerOpen==="object"?aiTrainerOpen:null}/>}
      {nutritionOpen&&<CoachPlanModal currentUser={currentUser} profile={profiles[currentUser]} coach={profiles[currentUser]?.aiTrainer?.coach||{}} onPlanGenerated={async(plan)=>{const p=profiles[currentUser];const updated={...p,aiTrainer:{...(p?.aiTrainer||{}),coach:{...(p?.aiTrainer?.coach||{}),lastPlan:{...plan,generatedAt:Date.now()}}}};await fsSet("wolfpack/profiles",{users:{...profiles,[currentUser]:updated}});}} onDeletePlan={async()=>{const p=profiles[currentUser];const updated={...p,aiTrainer:{...(p?.aiTrainer||{}),coach:{...(p?.aiTrainer?.coach||{}),lastPlan:null}}};await fsSet("wolfpack/profiles",{users:{...profiles,[currentUser]:updated}});setNutritionOpen(false);}} onClose={()=>setNutritionOpen(false)} onOpenScanner={()=>{setNutritionOpen(false);setMealScannerOpen(true);}}/>}
      {mealScannerOpen&&<MealScannerModal currentUser={currentUser} onClose={()=>setMealScannerOpen(false)}/>}
      {pendingEffortRating&&<EffortRatingModal exercises={pendingEffortRating.exercises} prelogged={pendingEffortRating.prelogged} muscleGroup={pendingEffortRating.muscleGroup} currentUser={currentUser} onRate={async(effortId,logged)=>{
        setPendingEffortRating(null);
        const effort=EFFORT_RATINGS.find(r=>r.id===effortId);
        showToast((effort?.emoji||"") + " Logged! " + (effort?.advice||"Keep it up") + "! 🐺");
        if(logged?.length){try{
          const key=todayStr();
          const existing=history[key]?.[currentUser];
          if(existing?.wolfmodeSession){
            const updatedEx=existing.wolfmodeSession.exercises.map(ex=>{const l=logged.find(x=>x.name===ex.name);if(l)return{...ex,sets:l.sets??ex.sets,weightUsed:l.weightUsed||ex.weightUsed,actualReps:l.actualReps||null,skipped:l.skipped||false,substitutedWith:l.substitutedWith||null,...(l.setLog?{setLog:l.setLog}:{})};return{...ex,skipped:true};});
            await fsSet("wolfpack/workouts",{byDate:{...history,[key]:{...(history[key]||{}),[currentUser]:{...existing,wolfmodeSession:{...existing.wolfmodeSession,exercises:updatedEx,effortRating:effortId}}}}});
          }
        }catch(err){console.warn(err);}}
      }} onClose={()=>setPendingEffortRating(null)}/>}
      {editWorkout&&editWorkout.entry?.done&&<EditWorkoutModal entry={editWorkout.entry} date={editWorkout.date} currentUser={currentUser} onClose={()=>setEditWorkout(null)} onSave={handleSaveEditedWorkout} onDelete={()=>handleDeleteWorkout(editWorkout.date)}/>}
      {editCompletedWorkout&&<EditCompletedWorkoutModal date={editCompletedWorkout.date} entry={editCompletedWorkout.entry} currentUser={currentUser} onSave={handleSaveEditedExercises} onClose={()=>setEditCompletedWorkout(null)}/>}
      {whatsNewOpen&&<WhatsNewModal onClose={dismissWhatsNew} whatsNewData={whatsNewData||WHATS_NEW_FALLBACK}/>}
      {profileOpen&&<ProfileModal currentUser={currentUser} profile={profiles[currentUser]} profiles={profiles} history={history} challenges={challenges} onClose={()=>setProfileOpen(false)} onSaveWeight={handleSaveWeight} onSaveGoal={handleSaveGoal} onChangePin={handleChangePin} onChangeName={handleChangeName} onSaveProfile={np=>setProfiles(np)}/>}
      {legacyFeedOpen&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setLegacyFeedOpen(false)}>
        <div className="modal" style={{maxHeight:"88dvh",overflowY:"auto"}}>
          <div className="modal-handle"/>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,marginBottom:4}}>📜 OLD FEED POSTS</div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>Posts from before the group chat.</div>
          {feed.map(p=><FeedPost key={p.id} post={p} currentUser={currentUser} profiles={profiles} onLike={handleLike} onDelete={handleDelPost} onComment={handleComment} onDeleteComment={handleDeleteComment}/>)}
          <button className="btn-ghost" style={{width:"100%",marginTop:8}} onClick={()=>setLegacyFeedOpen(false)}>Close</button>
        </div>
      </div>}
      {habitBuilder&&<HabitBuilder existing={habitBuilder==="new"?null:habitChallenges[habitBuilder]} members={members} profiles={profiles} currentUser={currentUser} today={todayStr()} onSave={handleSaveHabitChallenge} onDelete={handleDeleteHabitChallenge} onClose={()=>setHabitBuilder(null)}/>}
      {groupSheetOpen&&<GroupSheet currentUser={currentUser} group={group} myGroups={myGroups} onSwitch={gid=>openGroup(gid)} onJoinOrCreate={()=>{setGroupSheetOpen(false);setGroupGateMode("choose");}} onSignOut={handleSignOut} onClose={()=>setGroupSheetOpen(false)}/>}
      {groupGateMode&&<GroupGate user={currentUser} myGroups={myGroups} startMode={groupGateMode} onPick={gid=>openGroup(gid)} onJoin={handleJoinGroup} onCreate={handleCreateGroup} onSignOut={handleSignOut} onCancel={()=>setGroupGateMode(null)}/>}
      {adminOpen&&<AdminPanel showToast={showToast} history={history} group={group} isOwner={groups[LEGACY_GROUP_ID]?.admin===currentUser} onUpdateGroup={handleUpdateGroup} onNewInviteCode={handleNewInviteCode} members={members} profiles={profiles} currentUser={currentUser} adminName={adminName} onResetPin={handleResetPin} onDeleteAccount={handleDeleteAccount} onAdminBackfill={handleAdminBackfill} onClose={()=>setAdminOpen(false)} garageEquipment={garageEquipment} onSaveGarageEquipment={async(list)=>{await fsSet(gp("settings"),{garageEquipment:list});setGarageEquipment(list);showToast("🏠 Garage gym updated!");}}/>}
    </div>
  );
}
