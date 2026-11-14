import Body from "react-muscle-highlighter";
import { DECOR, MUSCLE_PARTS, PART_TO_MUSCLE } from "../lib/bodyParts";

// Front + back muscle figures. Tap a muscle to pick it (when onToggle is given);
// picked or highlighted muscles show in orange.

const COLORS = { muscle: "#2b2b3a", decor: "#3a3a4c", outline: "#5a5a6e", picked: "#ff6b35" };

export function BodyMap({ muscles = [], onToggle, gender = "male", scale = 0.8, sides = ["front", "back"] }) {
  const data = [
    ...DECOR.map(slug => ({ slug, color: COLORS.decor })),
    ...muscles.flatMap(m => (MUSCLE_PARTS[m] || []).map(slug => ({ slug, intensity: 1 }))),
  ];
  const press = part => {
    const m = PART_TO_MUSCLE[part?.slug];
    if (m && onToggle) onToggle(m);
  };
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
      {sides.map(side => (
        <div key={side} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Body
            data={data}
            side={side}
            gender={gender === "female" ? "female" : "male"}
            scale={scale}
            colors={[COLORS.picked]}
            defaultFill={COLORS.muscle}
            border={COLORS.outline}
            onBodyPartPress={onToggle ? press : undefined}
          />
          <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--muted)", marginTop: 2, fontFamily: "'Bebas Neue',cursive" }}>{side.toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
}
