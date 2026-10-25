import { useId } from "react";
import { goalProgress } from "../domain/focusGoal";

export function formatActivity(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function FocusCup({ recordedMs, goalMinutes, compact = false }: { recordedMs: number; goalMinutes: number; compact?: boolean }) {
  const id = useId().replaceAll(":", "");
  const progress = goalProgress(recordedMs, goalMinutes);
  const percent = Math.round(progress.fill * 100);
  const fillY = 177 - 103 * progress.fill;
  const label = `${Math.floor(recordedMs / 60_000)} min of ${goalMinutes} min, ${percent} percent${percent === 100 ? ", focus-time goal reached" : ""}`;
  return <figure className={compact ? "focus-cup compact" : "focus-cup"}>
    <svg className="cup-illustration" viewBox="0 0 240 220" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#7e7a6f"/><stop offset=".18" stopColor="#fffef9"/><stop offset=".43" stopColor="#d8d6cc"/><stop offset=".7" stopColor="#fffef9"/><stop offset="1" stopColor="#77746b"/></linearGradient>
        <linearGradient id={`${id}-liquid`} x1="0" x2="1" y1="0" y2=".8"><stop offset="0" stopColor="#ebff65"/><stop offset=".46" stopColor="#d9f525"/><stop offset="1" stopColor="#9fb414"/></linearGradient>
        <linearGradient id={`${id}-shadow`} x1="0" x2="1"><stop offset="0" stopColor="#171813" stopOpacity=".4"/><stop offset=".5" stopColor="#171813" stopOpacity="0"/><stop offset="1" stopColor="#171813" stopOpacity=".28"/></linearGradient>
        <clipPath id={`${id}-inside`}><path d="M61 54 Q62 48 70 48 H170 Q178 48 179 54 L165 181 Q164 188 156 188 H84 Q76 188 75 181 Z"/></clipPath>
      </defs>
      <ellipse cx="120" cy="202" rx="72" ry="9" fill="#171813" opacity=".14"/>
      <path d="M179 76 H193 Q216 76 213 111 Q211 142 169 145" fill="none" stroke="#858176" strokeWidth="15"/>
      <path d="M178 79 H190 Q207 79 205 109 Q203 133 169 138" fill="none" stroke={`url(#${id}-glass)`} strokeWidth="8"/>
      <g clipPath={`url(#${id}-inside)`}>
        <rect className="cup-liquid" x="58" y={fillY} width="124" height={188 - fillY} fill={`url(#${id}-liquid)`}/>
        {percent > 0 && <path className="cup-liquid-surface" d={`M60 ${fillY} Q85 ${fillY - 5} 110 ${fillY} T160 ${fillY} T190 ${fillY}`} fill="none" stroke="#f7ffbb" strokeWidth="3" opacity=".9"/>}
        <rect x="58" y="48" width="124" height="142" fill={`url(#${id}-shadow)`}/>
      </g>
      <path d="M61 54 Q62 48 70 48 H170 Q178 48 179 54 L165 181 Q164 188 156 188 H84 Q76 188 75 181 Z" fill="none" stroke="#403f38" strokeWidth="2"/>
      <ellipse cx="120" cy="51" rx="59" ry="8" fill={`url(#${id}-glass)`} stroke="#403f38" strokeWidth="2"/>
      <ellipse cx="120" cy="52" rx="45" ry="4" fill="#fffef9" opacity=".9"/>
      <path d="M75 66 L87 173" fill="none" stroke="#fff" strokeWidth="5" opacity=".7"/>
      <path d="M165 64 L155 174" fill="none" stroke="#fff" strokeWidth="2" opacity=".55"/>
    </svg>
    <figcaption><span className="cup-time">{label}</span>{percent === 100 && <strong className="goal-reached">Focus-time goal reached</strong>}<span className="cup-percent">{percent}% of your goal</span></figcaption>
  </figure>;
}
