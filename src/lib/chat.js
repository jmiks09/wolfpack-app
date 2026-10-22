import { fsArrayAdd, fsArrayRemove, fsDeleteFields, fsGet, fsSet } from "../firebase";
import { gpath } from "./groups";
import { todayStr } from "./dates";

// Each group's chat is stored one document per day:
//   wolfpack/<group>chat_<YYYY-MM-DD>  →  { msgs: { [id]: message } }
// plus an index of which days have messages:
//   wolfpack/<group>chatdays           →  { days: { [date]: true } }
// Every write touches a single message, so simultaneous senders never clash.
//
// message: { id, day, ts, kind: "msg" | "workout" | "system", author?, text?, photo?,
//            replyTo?: {id, author, text}, reactions?: {emoji: [names]}, edited?, deleted? }

export const CHAT_REACTIONS = ["🔥", "💪", "😂", "👏", "❤️"];
export const chatDayPath = (groupId, day) => gpath(groupId, `chat_${day}`);
export const chatIndexPath = groupId => gpath(groupId, "chatdays");
export const newMsgId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function postMessage(groupId, msg) {
  const day = msg.day || todayStr();
  const full = { ...msg, day, ts: msg.ts || Date.now() };
  await fsSet(chatDayPath(groupId, day), { msgs: { [full.id]: full } });
  await fsSet(chatIndexPath(groupId), { days: { [day]: true } });
  return full;
}

export const updateMessage = (groupId, day, id, patch) =>
  fsSet(chatDayPath(groupId, day), { msgs: { [id]: patch } });

export const deleteMessage = (groupId, day, id) =>
  updateMessage(groupId, day, id, { deleted: true, text: "", photo: null, replyTo: null });

export async function removeMessage(groupId, day, id) {
  try { await fsDeleteFields(chatDayPath(groupId, day), [["msgs", id]]); } catch { /* day has no messages */ }
}

export const setReaction = (groupId, day, id, emoji, user, on) =>
  (on ? fsArrayAdd : fsArrayRemove)(chatDayPath(groupId, day), ["msgs", id, "reactions", emoji], user);

// Workout cards use a fixed id per person per day, so logging a second
// workout updates the same card (and moves it to the bottom) instead of adding another.
export const workoutCardId = (user, day) => `wo_${user.replace(/[^\w]/g, "_")}_${day}`;

// Rename a member in every message of a group's chat.
export async function renameInChat(groupId, oldName, newName) {
  const index = await fsGet(chatIndexPath(groupId));
  const swap = x => (x === oldName ? newName : x);
  for (const day of Object.keys(index?.days || {})) {
    const doc = await fsGet(chatDayPath(groupId, day));
    const msgs = doc?.msgs || {};
    const changed = {};
    for (const [id, m] of Object.entries(msgs)) {
      const touches = m.author === oldName || m.replyTo?.author === oldName ||
        Object.values(m.reactions || {}).some(l => l.includes(oldName));
      if (!touches) continue;
      changed[id] = {
        ...m, author: swap(m.author),
        ...(m.replyTo ? { replyTo: { ...m.replyTo, author: swap(m.replyTo.author) } } : {}),
        reactions: Object.fromEntries(Object.entries(m.reactions || {}).map(([e, l]) => [e, l.map(swap)])),
      };
    }
    if (Object.keys(changed).length) await fsSet(chatDayPath(groupId, day), { msgs: changed });
  }
}

// Clusters consecutive messages from the same person (within 5 minutes)
// and inserts day separators. Returns render rows.
export function buildChatRows(messages, today) {
  const rows = [];
  let prev = null;
  for (const m of messages) {
    if (!prev || prev.day !== m.day) {
      rows.push({ type: "day", day: m.day, key: `d_${m.day}` });
      prev = null;
    }
    const chatty = m.kind === "msg";
    const joins = chatty && prev && prev.kind === "msg" && prev.author === m.author && m.ts - prev.ts < 5 * 60 * 1000;
    if (joins) rows[rows.length - 1].last = false;
    rows.push({ type: "msg", msg: m, key: m.id, first: !joins, last: true });
    prev = m;
  }
  return rows.map(r => (r.type === "day" ? { ...r, label: dayLabel(r.day, today) } : r));
}

export function dayLabel(day, today) {
  if (day === today) return "Today";
  const y = new Date(today + "T12:00:00"); y.setDate(y.getDate() - 1);
  const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (day === yStr) return "Yesterday";
  return new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
