import { fsGet, fsSet } from "../firebase";

// ── FAVORITES HELPERS ────────────────────────────────────────────────────────
// ── FAVORITES HELPERS (Firestore-backed) ────────────────────────────────────
// Stored at wolfpack/favorites → {users: {userName: [{id,workout,muscleGroup,savedAt,title}]}}
export async function getFavoritesFS(userName){
  try{
    const data=await fsGet("wolfpack/favorites");
    return data?.users?.[userName]||[];
  }catch{return[];}
}

export async function saveFavoriteFS(userName, workout, muscleGroup, currentFavs){
  try{
    const id=`fav_${Date.now()}`;
    const newFav={id,workout,muscleGroup,savedAt:Date.now(),title:workout.title};
    const updated=[newFav,...(currentFavs||[])].slice(0,20);
    await fsSet("wolfpack/favorites",{users:{[userName]:updated}},true);
    return updated;
  }catch{return currentFavs||[];}
}

export async function removeFavoriteFS(userName, favId, currentFavs){
  try{
    const updated=(currentFavs||[]).filter(f=>f.id!==favId);
    await fsSet("wolfpack/favorites",{users:{[userName]:updated}},true);
    return updated;
  }catch{return currentFavs||[];}
}

// Keep localStorage helpers as fallback for non-critical checks
export function getFavorites(userName){
  try{const raw=localStorage.getItem(`wp_favorites_${userName}`);return raw?JSON.parse(raw):[];}catch{return[];}
}

export function isWorkoutFavorited(userName, workoutTitle, favsList){
  return (favsList||getFavorites(userName)).some(f=>f.workout?.title===workoutTitle);
}

export function getFavoriteId(userName, workoutTitle, favsList){
  return (favsList||getFavorites(userName)).find(f=>f.workout?.title===workoutTitle)?.id;
}
