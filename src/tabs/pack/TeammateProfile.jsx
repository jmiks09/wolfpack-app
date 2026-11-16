import { useState } from "react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import { DAY_NAMES, fmtDate, isRestDay, localDateStr, stepDayOn, todayStr } from "../../lib/dates";
import { canRepeat, pastExercises, timesTried } from "../../lib/repeatWorkout";
import { getStreak, getTotalWorkouts } from "../../lib/stats";

// ── TEAMMATE PROFILE ─────────────────────────────────────────────────────────
// Opened by tapping someone's picture: their last 7 days, each workout's
// exercises, and a button to try any of them yourself.
const last7 = () => {
  const [y, m, d] = todayStr().split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => localDateStr(new Date(y, m - 1, d - 6 + i)));
};

export function TeammateProfile({ member, currentUser, profiles, history, since, onTry, onClose }) {
  const profile = profiles[member];
  const days = last7();
  const entries = days.map(d => [d, history[d]?.[member]]).filter(([, e]) => e?.done || Number(e?.steps) > 0).reverse();
  const [open, setOpen] = useState(() => entries.find(([, e]) => canRepeat(e))?.[0] || null);
  const workoutsThisWeek = days.filter(d => history[d]?.[member]?.done).length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: "90dvh", overflowY: "auto" }}>
        <div className="modal-handle" />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <AvatarDisplay profile={profile} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: 2, lineHeight: 1 }}>{member}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              🔥 {getStreak(history, member, profile)} day streak · {getTotalWorkouts(history, member, since)} sessions
            </div>
          </div>
        </div>

        {/* Last 7 days strip */}
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 12, letterSpacing: 2, color: "var(--accent2)", marginBottom: 6 }}>
          LAST 7 DAYS · {workoutsThisWeek} WORKOUT{workoutsThisWeek === 1 ? "" : "S"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
          {days.map(d => {
            const e = history[d]?.[member];
            const steps = Number(e?.steps) || 0;
            const active = e?.done || steps >= stepDayOn(profile, d);
            return (
              <button key={d} onClick={() => e?.done && setOpen(d)} disabled={!e?.done}
                style={{
                  padding: "6px 0", borderRadius: 10, textAlign: "center", cursor: e?.done ? "pointer" : "default",
                  background: open === d ? "rgba(255,107,53,0.2)" : active ? "rgba(46,204,113,0.12)" : "var(--bg3)",
                  border: `1px solid ${open === d ? "#ff6b35" : active ? "rgba(46,204,113,0.35)" : "var(--border)"}`,
                }}>
                <div style={{ fontSize: 9, color: "var(--muted)" }}>{DAY_NAMES[new Date(d + "T00:00:00").getDay()]}</div>
                <div style={{ fontSize: 15, minHeight: 20 }}>{e?.done ? (e.workoutIcon || "💪").slice(0, 2) : active ? "👟" : isRestDay(d, profile) ? "🛌" : "·"}</div>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginBottom: 14 }}>👟 steps  ·  🛌 rest day  ·  blank = missed</div>

        {entries.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--muted)", fontSize: 13 }}>
            {member} hasn't logged anything in the last 7 days.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map(([date, e]) => {
            const exs = pastExercises(e).filter(x => !x.skipped || x.substitutedWith);
            const repeatable = canRepeat(e);
            const isOpen = open === date;
            const tried = repeatable ? timesTried(history, member, date) : [];
            const iTried = tried.includes(currentUser);
            const summary = !e.done ? [] : Array.isArray(e.summary) ? e.summary : [e.workoutLabel || "Workout"];
            return (
              <div key={date} data-testid="tm-day" style={{ background: "var(--bg3)", border: `1px solid ${isOpen ? "rgba(255,107,53,0.4)" : "var(--border)"}`, borderRadius: 12, overflow: "hidden" }}>
                <div onClick={() => repeatable && setOpen(isOpen ? null : date)} style={{ padding: "10px 12px", cursor: repeatable ? "pointer" : "default" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 13, letterSpacing: 1, color: "var(--accent2)" }}>{fmtDate(date)}</div>
                    {tried.length > 0 && <span style={{ fontSize: 10, color: "#ff6b35" }}>🐺 {tried.length} tried it</span>}
                  </div>
                  {summary.map((l, i) => <div key={i} style={{ fontSize: 12, color: "var(--green)", lineHeight: 1.5 }}>{l}</div>)}
                  {Number(e.steps) > 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>👟 {Number(e.steps).toLocaleString("en-US")} steps</div>}
                  {repeatable && !isOpen && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{exs.length} exercises · tap to see them</div>}
                </div>
                {isOpen && repeatable && (
                  <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 10 }}>
                      {exs.map((x, i) => {
                        const nm = x.skipped && x.substitutedWith ? x.substitutedWith : x.name;
                        const sets = Array.isArray(x.setLog) && x.setLog.length ? x.setLog.length : x.sets;
                        const w = x.weightUsed || (x.suggestedWeight && !/lighter|heavier/.test(x.suggestedWeight) ? x.suggestedWeight : "");
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                            <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 13, letterSpacing: 1, flex: 1, minWidth: 0 }}>{nm}</span>
                            <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
                              {sets}×{x.actualReps || x.reps}{w && w !== "bodyweight" ? ` @ ${/lbs/.test(w) ? w : `${w} lbs`}` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <button className="btn-primary" onClick={() => onTry(date, e)}
                      style={{ width: "100%", marginTop: 10, background: "linear-gradient(135deg,#ff6b35,#9b59b6)", border: "none" }}>
                      🐺 {iTried ? "TRY IT AGAIN" : "TRY THIS WORKOUT"}
                    </button>
                    <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
                      Same exercises, sets and reps, with your own weights
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 12 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
