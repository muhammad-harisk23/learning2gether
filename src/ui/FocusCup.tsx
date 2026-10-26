import { useEffect, useId, useRef, useState } from "react";
import { goalPercent, goalProgress } from "../domain/focusGoal";
import { DEFAULT_FOCUS_VESSEL, FOCUS_VESSELS, focusGoalWasReached, type FocusVesselStyle } from "../domain/focusVessel";
import { VESSEL_SHAPES } from "./vesselArtwork";

export function formatActivity(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function VesselPreview({ style }: { style: FocusVesselStyle }) {
  if (style === "bottle") return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M14 7V4h8v3l3 3 2 20H9l2-20z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M11 22h14l1 7H10z" fill="var(--lime)"/></svg>;
  if (style === "mug") return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 9h19v20H9zM26 13h3a4 4 0 0 1 0 9h-3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9 22h16v6H9z" fill="#4d9a9c"/></svg>;
  if (style === "coffee") return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 12h19l-2 16H10zM26 15h2a4 4 0 0 1 0 8h-3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9 21h16l-1 6H10z" fill="#79533a"/></svg>;
  return <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M8 8h20l-2 22H10z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M10 20h16l-1 9H11z" fill="var(--lime)"/></svg>;
}

export function FocusCup({
  recordedMs,
  goalMinutes,
  compact = false,
  vesselStyle = DEFAULT_FOCUS_VESSEL,
  recording = false,
  activityLabel,
  onVesselStyleChange,
}: {
  recordedMs: number;
  goalMinutes: number;
  compact?: boolean;
  vesselStyle?: FocusVesselStyle;
  recording?: boolean;
  activityLabel?: string;
  onVesselStyleChange?: (style: FocusVesselStyle) => void;
}) {
  const id = useId().replaceAll(":", "");
  const progress = goalProgress(recordedMs, goalMinutes);
  const percent = goalPercent(recordedMs, goalMinutes);
  const shape = VESSEL_SHAPES[vesselStyle];
  const liquidColors = FOCUS_VESSELS.find((vessel) => vessel.id === vesselStyle)!.liquid;
  const fillY = shape.capacityBottom - (shape.capacityBottom - shape.capacityTop) * progress.fill;
  const previous = useRef<{ recordedMs: number; goalMinutes: number } | null>(null);
  const celebrationTimer = useRef<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [vesselVisible, setVesselVisible] = useState(reducedMotion);
  const [fillVisible, setFillVisible] = useState(reducedMotion);
  const [captionVisible, setCaptionVisible] = useState(reducedMotion);

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!preference) return;
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener?.("change", updatePreference);
    return () => preference.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setVesselVisible(true);
      setFillVisible(true);
      setCaptionVisible(true);
      return;
    }
    let fillTimer = 0;
    let captionTimer = 0;
    const frame = window.requestAnimationFrame(() => {
      setVesselVisible(true);
      fillTimer = window.setTimeout(() => {
        setFillVisible(true);
        captionTimer = window.setTimeout(() => setCaptionVisible(true), 1050);
      }, 260);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fillTimer);
      window.clearTimeout(captionTimer);
    };
  }, [reducedMotion]);

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

  const label = `Focus goal progress: ${Math.floor(recordedMs / 60_000)} of ${goalMinutes} minutes, ${percent} percent.${percent === 100 ? " Goal reached." : ""}`;
  return <figure className={`${compact ? "focus-cup compact" : "focus-cup"}${celebrating ? " celebrating" : ""}${recording ? " recording" : ""}${vesselVisible ? " vessel-visible" : ""}${fillVisible ? " fill-visible" : ""}${captionVisible ? " caption-visible" : ""}`} data-vessel={vesselStyle} data-celebrating={celebrating ? "true" : "false"} data-fill-percent={percent} data-recorded-ms={recordedMs}>
    <svg className="cup-illustration" viewBox="0 0 240 220" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="var(--cup-glass-edge)"/><stop offset=".18" stopColor="var(--cup-glass-highlight)"/><stop offset=".43" stopColor="var(--cup-glass-mid)"/><stop offset=".7" stopColor="var(--cup-glass-highlight)"/><stop offset="1" stopColor="var(--cup-glass-other-edge)"/></linearGradient>
        <linearGradient id={`${id}-liquid`} x1="0" x2="1" y1="0" y2=".8"><stop offset="0" stopColor={liquidColors[0]}/><stop offset=".46" stopColor={liquidColors[1]}/><stop offset="1" stopColor={liquidColors[2]}/></linearGradient>
        <linearGradient id={`${id}-shadow`} x1="0" x2="1"><stop offset="0" stopColor="var(--shadow-ink)" stopOpacity=".4"/><stop offset=".5" stopColor="var(--shadow-ink)" stopOpacity="0"/><stop offset="1" stopColor="var(--shadow-ink)" stopOpacity=".28"/></linearGradient>
        <clipPath id={`${id}-inside`}><path d={shape.inside}/></clipPath>
      </defs>
      <ellipse cx="120" cy="202" rx="72" ry="9" fill="var(--shadow-ink)" opacity=".14"/>
      {(vesselStyle === "coffee" || vesselStyle === "mug") && <><path d={vesselStyle === "coffee" ? "M168 77 H181 Q205 77 201 111 Q198 135 164 136" : "M169 76 H184 Q215 76 211 115 Q208 149 169 151"} fill="none" stroke="var(--cup-handle)" strokeWidth={vesselStyle === "mug" ? 17 : 15}/><path d={vesselStyle === "coffee" ? "M167 80 H179 Q198 80 195 109 Q192 128 164 130" : "M168 80 H182 Q207 80 204 114 Q201 143 168 145"} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="8"/></>}
      <g clipPath={`url(#${id}-inside)`}>
        <rect className="cup-liquid" x="55" y={fillVisible ? fillY : shape.capacityBottom} width="130" height={fillVisible ? shape.capacityBottom - fillY : 0} fill={`url(#${id}-liquid)`}/>
        {percent > 0 && fillVisible && <path className="cup-liquid-surface" d={`M57 ${fillY} Q84 ${fillY - 5} 110 ${fillY} T160 ${fillY} T190 ${fillY}`} fill="none" stroke="var(--cup-liquid-highlight)" strokeWidth="3" opacity=".9"/>}
        <rect x="55" y="29" width="130" height="160" fill={`url(#${id}-shadow)`}/>
      </g>
      <g className="cup-outline">
        {(vesselStyle === "coffee" || vesselStyle === "mug") && <><path d={vesselStyle === "coffee" ? "M168 77 H181 Q205 77 201 111 Q198 135 164 136" : "M169 76 H184 Q215 76 211 115 Q208 149 169 151"} fill="none" stroke="var(--cup-handle)" strokeWidth={vesselStyle === "mug" ? 17 : 15}/><path d={vesselStyle === "coffee" ? "M167 80 H179 Q198 80 195 109 Q192 128 164 130" : "M168 80 H182 Q207 80 204 114 Q201 143 168 145"} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="8"/></>}
        <path d={shape.body} fill="var(--cup-body-tint)" stroke="var(--cup-body-stroke)" strokeWidth="2"/>
        <path d={shape.rim} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="7" strokeLinecap="round"/>
        {vesselStyle !== "bottle" && <ellipse cx={vesselStyle === "glass" ? 120 : 111} cy={vesselStyle === "glass" ? 51 : 57} rx={vesselStyle === "glass" ? 59 : 56} ry="8" fill={`url(#${id}-glass)`} stroke="var(--cup-body-stroke)" strokeWidth="2"/>}
        <path d={vesselStyle === "bottle" ? "M84 72 L91 170" : "M75 66 L87 173"} fill="none" stroke="var(--cup-glass-highlight)" strokeWidth="5" opacity=".7"/>
        <path d={vesselStyle === "bottle" ? "M155 73 L150 170" : "M165 64 L155 174"} fill="none" stroke="var(--cup-glass-highlight)" strokeWidth="2" opacity=".55"/>
        <path className="cup-overflow" d="M75 48 Q83 35 95 48 Q106 33 118 48 Q131 31 143 48 Q155 35 165 48" fill="none" stroke={`url(#${id}-liquid)`} strokeWidth="8" strokeLinecap="round"/>
      </g>
    </svg>
    <figcaption><span className="cup-time">{Math.floor(recordedMs / 60_000)} min focused</span><span className="cup-goal-line">of {goalMinutes} min goal · {percent}%</span>{activityLabel && <span className={recording ? "cup-recording-state active" : "cup-recording-state"}>{activityLabel}</span>}{percent === 100 && <strong className="goal-reached">Goal reached</strong>}</figcaption>
    {onVesselStyleChange && <div className="vessel-picker" role="group" aria-label="Choose Focus Cup vessel">{FOCUS_VESSELS.map((vessel) => <button key={vessel.id} type="button" className="vessel-option" aria-label={vessel.label} aria-pressed={vesselStyle === vessel.id} title={vessel.label} onClick={() => vessel.id !== vesselStyle && onVesselStyleChange(vessel.id)}><VesselPreview style={vessel.id}/><span>{vessel.label}</span></button>)}</div>}
  </figure>;
}
