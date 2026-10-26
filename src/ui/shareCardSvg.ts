import type { ShareProgressData } from "../domain/shareProgress";
import { FOCUS_VESSELS } from "../domain/focusVessel";
import { VESSEL_SHAPES } from "./vesselArtwork";

export type ShareCardVariant = "daily" | "recap" | "goal";

function safeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function shorten(value: string, limit: number): string {
  const chars = Array.from(value.trim());
  return chars.length > limit ? `${chars.slice(0, limit - 1).join("")}…` : chars.join("");
}

export function formatShareTime(milliseconds: number): string {
  const minutes = Math.floor(Math.max(0, milliseconds) / 60_000);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes} min`;
}

function cupSvg(data: ShareProgressData, x: number, y: number, width: number, height: number): string {
  const shape = VESSEL_SHAPES[data.vesselStyle];
  const colors = FOCUS_VESSELS.find((vessel) => vessel.id === data.vesselStyle)!.liquid;
  const fillY = shape.capacityBottom - (shape.capacityBottom - shape.capacityTop) * data.goalPercent / 100;
  const id = `share-cup-${data.vesselStyle}`;
  const handle = data.vesselStyle === "coffee"
    ? '<path d="M168 77 H181 Q205 77 201 111 Q198 135 164 136" fill="none" stroke="#181916" stroke-width="15"/><path d="M167 80 H179 Q198 80 195 109 Q192 128 164 130" fill="none" stroke="#dce6d5" stroke-width="8"/>'
    : data.vesselStyle === "mug"
      ? '<path d="M169 76 H184 Q215 76 211 115 Q208 149 169 151" fill="none" stroke="#181916" stroke-width="17"/><path d="M168 80 H182 Q207 80 204 114 Q201 143 168 145" fill="none" stroke="#dce6d5" stroke-width="8"/>'
      : "";
  const top = data.vesselStyle === "glass" ? 51 : 57;
  const rx = data.vesselStyle === "glass" ? 59 : 56;
  const cx = data.vesselStyle === "glass" ? 120 : 111;
  const highlights = data.vesselStyle === "bottle"
    ? '<path d="M84 72 L91 170" fill="none" stroke="#ffffff" stroke-width="5" opacity=".7"/><path d="M155 73 L150 170" fill="none" stroke="#ffffff" stroke-width="2" opacity=".55"/>'
    : '<path d="M75 66 L87 173" fill="none" stroke="#ffffff" stroke-width="5" opacity=".7"/><path d="M165 64 L155 174" fill="none" stroke="#ffffff" stroke-width="2" opacity=".55"/>';
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 240 220" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-glass" x1="0" x2="1"><stop offset="0" stop-color="#879083"/><stop offset=".2" stop-color="#ffffff"/><stop offset=".55" stop-color="#dce6d5"/><stop offset=".78" stop-color="#ffffff"/><stop offset="1" stop-color="#879083"/></linearGradient>
      <linearGradient id="${id}-liquid" x1="0" x2="1" y1="0" y2=".8"><stop offset="0" stop-color="${colors[0]}"/><stop offset=".46" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient>
      <clipPath id="${id}-inside"><path d="${shape.inside}"/></clipPath>
    </defs>
    <ellipse cx="120" cy="202" rx="72" ry="9" fill="#181916" opacity=".12"/>
    ${handle}
    <g clip-path="url(#${id}-inside)"><rect x="55" y="${fillY}" width="130" height="${shape.capacityBottom - fillY}" fill="url(#${id}-liquid)"/>${data.goalPercent > 0 ? `<path d="M57 ${fillY} Q84 ${fillY - 5} 110 ${fillY} T160 ${fillY} T190 ${fillY}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".8"/>` : ""}</g>
    <path d="${shape.body}" fill="#f7f8f1" fill-opacity=".64" stroke="#181916" stroke-width="2"/>
    <path d="${shape.rim}" fill="none" stroke="url(#${id}-glass)" stroke-width="7" stroke-linecap="round"/>
    ${data.vesselStyle !== "bottle" ? `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="8" fill="url(#${id}-glass)" stroke="#181916" stroke-width="2"/>` : ""}
    ${highlights}
  </svg>`;
}

function optionalResource(data: ShareProgressData, includeResource: boolean, y: number): string {
  if (!includeResource || !data.resourceTitle) return "";
  const subject = data.subject ? `<text x="96" y="${y}" class="subject">${safeText(shorten(data.subject.toUpperCase(), 32))}</text>` : "";
  return `${subject}<text x="96" y="${y + (subject ? 49 : 0)}" class="resource">${safeText(shorten(data.resourceTitle, 42))}</text>`;
}

export function buildShareCardSvg(data: ShareProgressData, variant: ShareCardVariant, includeResource = false): string {
  const percent = Math.max(0, Math.min(100, data.goalPercent));
  const minutes = Math.floor(data.recordedFocusMs / 60_000);
  const streakLabel = `${data.streakDays} DAY STREAK`;
  const common = `<rect width="1080" height="1350" fill="#faf9f5"/><rect x="55" y="55" width="970" height="1240" fill="#faf9f5" stroke="#181916" stroke-width="3"/><rect x="55" y="55" width="18" height="170" fill="#d9f525"/><path d="M850 56H1024V230" fill="#f2d5d2" stroke="#181916" stroke-width="3"/><text x="96" y="125" class="brand">K12Learn2Gether</text><text x="96" y="174" class="kicker">RECORDED FOCUS · YOUR PACE</text><path d="M96 1190H984" stroke="#181916" stroke-width="2"/><text x="96" y="1244" class="footer">A personal record of eligible focus time</text><text x="984" y="1244" class="footer" text-anchor="end">K12Learn2Gether</text>`;
  let content: string;

  if (variant === "goal") {
    content = `<text x="96" y="300" class="headline">FOCUS GOAL REACHED</text><text x="96" y="365" class="subhead">${data.focusGoalMinutes} minute goal</text>${cupSvg(data, 385, 320, 330, 320)}<text x="540" y="745" class="hero-number" text-anchor="middle">${minutes}</text><text x="540" y="800" class="hero-label" text-anchor="middle">MIN FOCUSED</text><rect x="220" y="850" width="640" height="12" fill="#f1eee5" stroke="#181916" stroke-width="2"/><rect x="220" y="850" width="640" height="12" fill="#d9f525"/><text x="540" y="918" class="subhead" text-anchor="middle">${data.recordedFocusMs > data.focusGoalMinutes * 60_000 ? `${minutes} min recorded · ${data.focusGoalMinutes} min goal` : "100% of your focus goal"}</text><rect x="365" y="982" width="350" height="70" fill="#d9f525" stroke="#181916" stroke-width="2"/><text x="540" y="1027" class="streak" text-anchor="middle">${streakLabel}</text>${optionalResource(data, includeResource, 1080)}`;
  } else if (variant === "recap") {
    const metric = (x: number, y: number, label: string, value: string) => `<rect x="${x}" y="${y}" width="410" height="142" fill="#ffffff" stroke="#181916" stroke-width="2"/><text x="${x + 28}" y="${y + 48}" class="metric-label">${label}</text><text x="${x + 28}" y="${y + 106}" class="metric-value">${value}</text>`;
    content = `<text x="96" y="300" class="headline">LEARNING RECAP</text>${cupSvg(data, 655, 245, 285, 260)}<text x="96" y="390" class="metric-label">SELECTED FOCUS GOAL</text><text x="96" y="488" class="hero-number-small">${percent}%</text><text x="96" y="544" class="subhead">${minutes} of ${data.focusGoalMinutes} min · ${safeText(data.vesselStyle.toUpperCase())}</text>${metric(96, 630, "TODAY · RECORDED", formatShareTime(data.todayMs))}${metric(574, 630, "THIS WEEK · RECORDED", formatShareTime(data.weekMs))}${metric(96, 800, "LIFETIME · RECORDED", formatShareTime(data.lifetimeMs))}${metric(574, 800, "CURRENT STREAK", `${data.streakDays} ${data.streakDays === 1 ? "DAY" : "DAYS"}`)}<text x="96" y="990" class="metric-label">${data.resourcesInProgress} RESOURCES IN PROGRESS</text><text x="96" y="1040" class="subhead">${data.lessonsMarkedComplete} lessons marked complete</text>${optionalResource(data, includeResource, 1090)}<text x="96" y="1172" class="footnote">Date totals reflect activity available in this browser.</text>`;
  } else {
    content = `<text x="96" y="300" class="headline">TODAY'S FOCUS</text><text x="96" y="370" class="hero-number-small">${formatShareTime(data.todayMs)}</text><text x="96" y="421" class="subhead">ELIGIBLE FOCUS RECORDED TODAY</text>${cupSvg(data, 620, 310, 300, 275)}<text x="770" y="625" class="metric-label" text-anchor="middle">${safeText(data.vesselStyle.toUpperCase())} · FOCUS GOAL</text><text x="770" y="674" class="subhead" text-anchor="middle">${minutes} / ${data.focusGoalMinutes} min · ${percent}%</text><rect x="96" y="738" width="888" height="14" fill="#f1eee5" stroke="#181916" stroke-width="2"/><rect x="96" y="738" width="${888 * percent / 100}" height="14" fill="#d9f525"/><rect x="96" y="814" width="356" height="105" fill="#d9f525" stroke="#181916" stroke-width="2"/><text x="274" y="878" class="streak" text-anchor="middle">${streakLabel}</text><text x="96" y="1002" class="metric-label">THIS WEEK · RECORDED</text><text x="96" y="1064" class="subhead">${formatShareTime(data.weekMs)}</text>${optionalResource(data, includeResource, 1080)}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><style>
    text{font-family:Inter,Arial,sans-serif;fill:#181916}.brand{font-size:33px;font-weight:850;letter-spacing:-1.2px}.kicker,.metric-label,.subject{font-size:17px;font-weight:800;letter-spacing:2.3px}.headline{font-size:50px;font-weight:850;letter-spacing:-1.2px}.subhead{font-size:26px;font-weight:650}.hero-number{font-size:122px;font-weight:850;letter-spacing:-7px}.hero-number-small{font-size:82px;font-weight:850;letter-spacing:-4px}.hero-label{font-size:20px;font-weight:850;letter-spacing:4px}.streak{font-size:22px;font-weight:850;letter-spacing:1.5px}.metric-label{font-size:15px}.metric-value{font-size:38px;font-weight:800;letter-spacing:-1.6px}.resource{font-size:26px;font-weight:750}.subject{font-size:16px}.footer,.footnote{font-size:14px;font-weight:600;letter-spacing:.5px;fill:#51544e}
  </style>${common}${content}</svg>`;
}

export function shareCardAlt(data: ShareProgressData, variant: ShareCardVariant): string {
  if (variant === "goal") return `Focus goal reached. ${Math.floor(data.recordedFocusMs / 60_000)} minutes focused, ${data.streakDays} day streak.`;
  if (variant === "recap") return `Learning recap. ${formatShareTime(data.todayMs)} today, ${formatShareTime(data.weekMs)} this week, ${formatShareTime(data.lifetimeMs)} lifetime, ${data.streakDays} day streak.`;
  return `Today's focus: ${formatShareTime(data.todayMs)} recorded, ${data.goalPercent}% of selected focus goal, ${data.streakDays} day streak.`;
}
