import { useEffect, useId, useRef, useState } from "react";
import { goalProgress } from "../domain/focusGoal";
import { DEFAULT_FOCUS_VESSEL, FOCUS_VESSELS, focusGoalWasReached, type FocusVesselStyle } from "../domain/focusVessel";

export function formatActivity(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const vesselShapes: Record<FocusVesselStyle, { body: string; inside: string; rim: string; capacityTop: number; capacityBottom: number }> = {
  glass: {
    body: "M61 54 Q62 48 70 48 H170 Q178 48 179 54 L165 181 Q164 188 156 188 H84 Q76 188 75 181 Z",
    inside: "M63 56 Q64 51 71 51 H169 Q176 51 177 56 L163 179 Q162 185 155 185 H85 Q78 185 77 179 Z",
    rim: "M61 54 Q62 48 70 48 H170 Q178 48 179 54",
    capacityTop: 51,
    capacityBottom: 185,
  },
  coffee: {
    body: "M54 62 Q55 54 65 54 H157 Q168 54 169 63 L159 174 Q158 184 148 184 H76 Q66 184 65 174 Z",
    inside: "M57 64 Q58 58 66 58 H156 Q164 58 165 64 L155 172 Q154 180 147 180 H77 Q70 180 69 172 Z",
    rim: "M54 62 Q55 54 65 54 H157 Q168 54 169 63",
    capacityTop: 58,
    capacityBottom: 180,
  },
  mug: {
    body: "M52 59 Q52 52 61 52 H160 Q169 52 169 59 V176 Q169 185 160 185 H61 Q52 185 52 176 Z",
    inside: "M56 61 H165 V174 Q165 181 158 181 H63 Q56 181 56 174 Z",
    rim: "M52 59 Q52 52 61 52 H160 Q169 52 169 59",
    capacityTop: 61,
    capacityBottom: 181,
  },
  bottle: {
    body: "M91 50 V34 Q91 29 97 29 H143 Q149 29 149 34 V50 Q165 57 169 76 L163 177 Q162 186 153 186 H87 Q78 186 77 177 L71 76 Q75 57 91 50 Z",
    inside: "M95 52 V35 H145 V52 Q161 59 165 77 L159 175 Q158 182 152 182 H88 Q82 182 81 175 L75 77 Q79 59 95 52 Z",
    rim: "M91 50 V34 Q91 29 97 29 H143 Q149 29 149 34 V50",
    capacityTop: 51,
    capacityBottom: 182,
  },
};

function VesselPreview({ style }: { style: FocusVesselStyle }) {
  if (style === "bottle") return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M14 7V4h8v3l3 3 2 20H9l2-20z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M11 22h14l1 7H10z" fill="#d9f525"/></svg>;
  if (style === "mug") return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 9h19v20H9zM26 13h3a4 4 0 0 1 0 9h-3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9 22h16v6H9z" fill="#4d9a9c"/></svg>;
  if (style === "coffee") return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 12h19l-2 16H10zM26 15h2a4 4 0 0 1 0 8h-3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9 21h16l-1 6H10z" fill="#79533a"/></svg>;
  return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M8 8h20l-2 22H10z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M10 20h16l-1 9H11z" fill="#d9f525"/></svg>;
}

export function FocusCup({
  recordedMs,
  goalMinutes,
  compact = false,
  vesselStyle = DEFAULT_FOCUS_VESSEL,
  onVesselStyleChange,
}: {
  recordedMs: number;
  goalMinutes: number;
  compact?: boolean;
  vesselStyle?: FocusVesselStyle;
  onVesselStyleChange?: (style: FocusVesselStyle) => void;
}) {
  const id = useId().replaceAll(":", "");
  const progress = goalProgress(recordedMs, goalMinutes);
  const percent = Math.floor(progress.fill * 100);
  const shape = vesselShapes[vesselStyle];
  const liquidColors = FOCUS_VESSELS.find((vessel) => vessel.id === vesselStyle)!.liquid;
  const fillY = shape.capacityBottom - (shape.capacityBottom - shape.capacityTop) * progress.fill;
  const previous = useRef<{ recordedMs: number; goalMinutes: number } | null>(null);
  const celebrationTimer = useRef<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const current = { recordedMs, goalMinutes };
    const crossedGoal = previous.current !== null && focusGoalWasReached(previous.current, current);
    previous.current = current;
    if (!crossedGoal || celebrationTimer.current !== null) return;
    setCelebrating(true);
    celebrationTimer.current = window.setTimeout(() => {
      celebrationTimer.current = null;
      setCelebrating(false);
    }, 1300);
  }, [recordedMs, goalMinutes]);

  useEffect(() => () => {
    if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
  }, []);

  const label = `${Math.floor(recordedMs / 60_000)} min of ${goalMinutes} min, ${percent} percent${percent === 100 ? ", focus-time goal reached" : ""}`;
  return <figure className={`${compact ? "focus-cup compact" : "focus-cup"}${celebrating ? " celebrating" : ""}`} data-vessel={vesselStyle} data-celebrating={celebrating ? "true" : "false"}>
    <svg className="cup-illustration" viewBox="0 0 240 220" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#7e7a6f"/><stop offset=".18" stopColor="#fffef9"/><stop offset=".43" stopColor="#d8d6cc"/><stop offset=".7" stopColor="#fffef9"/><stop offset="1" stopColor="#77746b"/></linearGradient>
        <linearGradient id={`${id}-liquid`} x1="0" x2="1" y1="0" y2=".8"><stop offset="0" stopColor={liquidColors[0]}/><stop offset=".46" stopColor={liquidColors[1]}/><stop offset="1" stopColor={liquidColors[2]}/></linearGradient>
        <linearGradient id={`${id}-shadow`} x1="0" x2="1"><stop offset="0" stopColor="#171813" stopOpacity=".4"/><stop offset=".5" stopColor="#171813" stopOpacity="0"/><stop offset="1" stopColor="#171813" stopOpacity=".28"/></linearGradient>
        <clipPath id={`${id}-inside`}><path d={shape.inside}/></clipPath>
      </defs>
      <ellipse cx="120" cy="202" rx="72" ry="9" fill="#171813" opacity=".14"/>
      {(vesselStyle === "coffee" || vesselStyle === "mug") && <><path d={vesselStyle === "coffee" ? "M168 77 H181 Q205 77 201 111 Q198 135 164 136" : "M169 76 H184 Q215 76 211 115 Q208 149 169 151"} fill="none" stroke="#858176" strokeWidth={vesselStyle === "mug" ? 17 : 15}/><path d={vesselStyle === "coffee" ? "M167 80 H179 Q198 80 195 109 Q192 128 164 130" : "M168 80 H182 Q207 80 204 114 Q201 143 168 145"} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="8"/></>}
      <g clipPath={`url(#${id}-inside)`}>
        <rect className="cup-liquid" x="55" y={fillY} width="130" height={shape.capacityBottom - fillY} fill={`url(#${id}-liquid)`}/>
        {percent > 0 && <path className="cup-liquid-surface" d={`M57 ${fillY} Q84 ${fillY - 5} 110 ${fillY} T160 ${fillY} T190 ${fillY}`} fill="none" stroke="#f7ffbb" strokeWidth="3" opacity=".9"/>}
        <rect x="55" y="29" width="130" height="160" fill={`url(#${id}-shadow)`}/>
      </g>
      <path d={shape.body} fill="rgba(255,254,249,.16)" stroke="#403f38" strokeWidth="2"/>
      <path d={shape.rim} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="7" strokeLinecap="round"/>
      {vesselStyle !== "bottle" && <ellipse cx={vesselStyle === "glass" ? 120 : 111} cy={vesselStyle === "glass" ? 51 : 57} rx={vesselStyle === "glass" ? 59 : 56} ry="8" fill={`url(#${id}-glass)`} stroke="#403f38" strokeWidth="2"/>}
      <path d={vesselStyle === "bottle" ? "M84 72 L91 170" : "M75 66 L87 173"} fill="none" stroke="#fff" strokeWidth="5" opacity=".7"/>
      <path d={vesselStyle === "bottle" ? "M155 73 L150 170" : "M165 64 L155 174"} fill="none" stroke="#fff" strokeWidth="2" opacity=".55"/>
      <path className="cup-overflow" d="M75 48 Q83 35 95 48 Q106 33 118 48 Q131 31 143 48 Q155 35 165 48" fill="none" stroke={`url(#${id}-liquid)`} strokeWidth="8" strokeLinecap="round"/>
    </svg>
    <figcaption><span className="cup-time">{label}</span>{percent === 100 && <strong className="goal-reached">Focus-time goal reached</strong>}<span className="cup-percent">{percent}% of your goal</span></figcaption>
    {onVesselStyleChange && <div className="vessel-picker" role="group" aria-label="Choose Focus Cup vessel">{FOCUS_VESSELS.map((vessel) => <button key={vessel.id} type="button" className="vessel-option" aria-label={vessel.label} aria-pressed={vesselStyle === vessel.id} title={vessel.label} onClick={() => vessel.id !== vesselStyle && onVesselStyleChange(vessel.id)}><VesselPreview style={vessel.id}/><span>{vessel.label}</span></button>)}</div>}
  </figure>;
}
