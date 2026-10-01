import { fsDeleteFields, fsGet, fsSet } from "../firebase";
import { INVITE_CODE } from "./constants";

// The original crew. It keeps using the original Firestore documents
// (wolfpack/feed, wolfpack/challenges, ...) so none of its data moves.
export const LEGACY_GROUP_ID = "wolfpack";
export const REGISTRY_PATH = "wolfpack/groups";

// Firestore path for a per-group document.
export const gpath = (groupId, base) =>
  groupId === LEGACY_GROUP_ID ? `wolfpack/${base}` : `wolfpack/g_${groupId}_${base}`;

export const GROUP_EMOJIS = ["🐺","❄️","🔥","⚔️","🏔️","🦁","🐻","🦅","⚡","🌙","💀","🏆"];

// Invite codes skip look-alike characters (0/O, 1/I/L).
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function makeInviteCode(existingCodes = []) {
  const taken = new Set(existingCodes.map(c => (c || "").toUpperCase()));
  for (;;) {
    let c = "";
    for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!taken.has(c)) return c;
  }
}
export function makeGroupId() {
  return Math.random().toString(36).slice(2, 10);
}

export const groupsForUser = (groups, user) =>
  Object.values(groups || {})
    .filter(g => (g.members || []).includes(user))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

export const findGroupByCode = (groups, code) => {
  const c = (code || "").trim().toUpperCase();
  if (!c) return null;
  return Object.values(groups || {}).find(g => (g.code || "").toUpperCase() === c) || null;
};

// Registers the original crew as a group the first time the new version runs.
// Members come from the old member list so nobody is left out.
export async function ensureLegacyGroup(groups) {
  const legacyMembersDoc = await fsGet("wolfpack/members");
  const legacyMembers = legacyMembersDoc?.list || [];
  const existing = groups?.[LEGACY_GROUP_ID];
  if (existing) {
    // Anyone who joined through an old cached copy of the app gets added too.
    const missing = legacyMembers.filter(m => !(existing.members || []).includes(m));
    if (missing.length) {
      await fsSet(REGISTRY_PATH, { list: { [LEGACY_GROUP_ID]: { members: [...(existing.members || []), ...missing] } } });
    }
    return;
  }
  if (!legacyMembers.length) return;
  const admin = (await fsGet("wolfpack/admin"))?.name || legacyMembers[0];
  await fsSet(REGISTRY_PATH, {
    list: {
      [LEGACY_GROUP_ID]: {
        id: LEGACY_GROUP_ID, name: "WOLFPACK", emoji: "🐺", code: INVITE_CODE,
        admin, members: legacyMembers, gym: true, createdAt: 0,
      },
    },
  });
}

// Remembers who is signed in on this device and which group they were in.
const SESSION_KEY = "wp_session";
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
export function saveSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* storage unavailable */ }
}
export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
}

const renameKey = (obj, oldName, newName) => {
  if (!obj || !(oldName in obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k === oldName ? newName : k] = v;
  return out;
};

// Rewrites a member's name everywhere inside one group's documents.
export async function renameInGroup(groupId, oldName, newName) {
  const p = base => gpath(groupId, base);
  const swap = x => (x === oldName ? newName : x);
  const swapList = l => (l || []).map(swap);
  const [feed, ch, gym, goals, react] = await Promise.all(
    ["feed", "challenges", "gym", "packgoals", "reactions"].map(b => fsGet(p(b)))
  );
  const writes = [];
  if (feed?.posts) writes.push(fsSet(p("feed"), { posts: feed.posts.map(x => ({
    ...x, author: swap(x.author), likes: swapList(x.likes),
    comments: (x.comments || []).map(c => ({ ...c, author: swap(c.author) })),
  })) }));
  if (ch?.list) writes.push(fsSet(p("challenges"), { list: ch.list.map(c => ({
    ...c, createdBy: swap(c.createdBy),
    participants: renameKey(c.participants, oldName, newName) || {},
    ...(c.payments ? { payments: renameKey(c.payments, oldName, newName) } : {}),
  })) }));
  if (gym?.slots) writes.push(fsSet(p("gym"), { slots: gym.slots.map(s => ({ ...s, bookedBy: swap(s.bookedBy) })) }));
  if (goals?.list) writes.push(fsSet(p("packgoals"), { list: goals.list.map(g => ({ ...g, author: swap(g.author), cheers: swapList(g.cheers) })) }));
  if (react?.data) {
    const data = {};
    for (const [member, byEmoji] of Object.entries(react.data)) {
      const fixed = {};
      for (const [emoji, users] of Object.entries(byEmoji || {})) fixed[emoji] = swapList(users);
      data[swap(member)] = fixed;
    }
    writes.push(fsSet(p("reactions"), { data }).then(() =>
      oldName in react.data ? fsDeleteFields(p("reactions"), [["data", oldName]]) : null));
  }
  if (groupId === LEGACY_GROUP_ID) {
    const [md, ad] = await Promise.all([fsGet("wolfpack/members"), fsGet("wolfpack/admin")]);
    if (md?.list) writes.push(fsSet("wolfpack/members", { list: swapList(md.list) }));
    if (ad?.name === oldName) writes.push(fsSet("wolfpack/admin", { name: newName }));
  }
  await Promise.all(writes);
}
