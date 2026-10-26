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

function cupSvg(data: ShareProgressData, x: number, y: number, width: number, height: number, animated: boolean): string {
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
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 240 220" aria-hidden="true" class="${animated ? "share-cup" : ""}">
    <defs>
      <linearGradient id="${id}-glass" x1="0" x2="1"><stop offset="0" stop-color="#879083"/><stop offset=".2" stop-color="#ffffff"/><stop offset=".55" stop-color="#dce6d5"/><stop offset=".78" stop-color="#ffffff"/><stop offset="1" stop-color="#879083"/></linearGradient>
      <linearGradient id="${id}-liquid" x1="0" x2="1" y1="0" y2=".8"><stop offset="0" stop-color="${colors[0]}"/><stop offset=".46" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient>
      <clipPath id="${id}-inside"><path d="${shape.inside}"/></clipPath>
    </defs>
    <ellipse cx="120" cy="202" rx="72" ry="9" fill="#181916" opacity=".12"/>
    ${handle}
    <g clip-path="url(#${id}-inside)"><g class="${animated ? "share-liquid" : ""}"><rect x="55" y="${fillY}" width="130" height="${shape.capacityBottom - fillY}" fill="url(#${id}-liquid)"/>${data.goalPercent > 0 ? `<path d="M57 ${fillY} Q84 ${fillY - 5} 110 ${fillY} T160 ${fillY} T190 ${fillY}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".8"/>` : ""}</g></g>
    <path d="${shape.body}" fill="#f7f8f1" fill-opacity=".64" stroke="#181916" stroke-width="2"/>
    <path d="${shape.rim}" fill="none" stroke="url(#${id}-glass)" stroke-width="7" stroke-linecap="round"/>
    ${data.vesselStyle !== "bottle" ? `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="8" fill="url(#${id}-glass)" stroke="#181916" stroke-width="2"/>` : ""}
    ${highlights}
  </svg>`;
}

function optionalResource(data: ShareProgressData, includeResource: boolean, y: number): string {
  if (!includeResource || !data.resourceTitle) return "";
  const subject = data.subject ? `<text x="96" y="${y}" class="subject">${safeText(shorten(data.subject.toUpperCase(), 32))}</text>` : "";
  return `${subject}<text x="96" y="${y + (subject ? 42 : 0)}" class="resource">${safeText(shorten(data.resourceTitle, 42))}</text>`;
}

function streakBadge(days: number, x: number, y: number, width: number, height: number, animated: boolean): string {
  return `<g class="${animated ? "share-streak" : ""}"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#d9f525" stroke="#181916" stroke-width="2"/><path d="M${x + 32} ${y + height - 21} Q${x + 24} ${y + height - 35} ${x + 35} ${y + height - 50} Q${x + 33} ${y + height - 37} ${x + 43} ${y + height - 40} Q${x + 55} ${y + height - 30} ${x + 44} ${y + height - 21} Z" fill="#f2d5d2" stroke="#181916" stroke-width="2"/><text x="${x + width / 2 + 14}" y="${y + height / 2 + 9}" class="streak" text-anchor="middle">${days} DAY STREAK</text></g>`;
}

export function buildShareCardSvg(data: ShareProgressData, variant: ShareCardVariant, includeResource = false, animated = false): string {
  const percent = Math.max(0, Math.min(100, data.goalPercent));
  const minutes = Math.floor(data.recordedFocusMs / 60_000);
  const common = `<rect width="1080" height="1350" fill="#faf9f5"/><rect x="55" y="55" width="970" height="1240" fill="#faf9f5" stroke="#181916" stroke-width="3"/><rect x="55" y="55" width="18" height="170" fill="#d9f525"/><path d="M850 56H1024V230" fill="#f2d5d2" stroke="#181916" stroke-width="3"/><text x="96" y="125" class="brand ${animated ? "share-reveal" : ""}">K12Learn2Gether</text><text x="96" y="174" class="kicker ${animated ? "share-reveal share-delay-1" : ""}">RECORDED FOCUS · YOUR PACE</text><path d="M96 1190H984" stroke="#181916" stroke-width="2"/><text x="96" y="1244" class="footer">${variant === "goal" ? "Keep showing up." : variant === "recap" ? "Built from real focused time." : "Choose once. Focus. Finish."}</text><text x="984" y="1244" class="footer" text-anchor="end">K12Learn2Gether</text>`;
  let content: string;

  if (variant === "goal") {
    content = `<text x="96" y="300" class="editorial-intro ${animated ? "share-reveal share-delay-1" : ""}">I SAID</text><text x="96" y="410" class="goal-record">${data.focusGoalMinutes} MIN.</text><text x="96" y="500" class="editorial-intro ${animated ? "share-reveal share-delay-1" : ""}">I DID</text>${cupSvg(data, 625, 255, 350, 355, animated)}<text x="96" y="700" class="hero-number ${animated ? "share-reveal share-delay-2" : ""}">${minutes}</text><text x="104" y="748" class="hero-label">MIN FOCUSED</text><text x="96" y="830" class="headline">GOAL REACHED</text><text x="96" y="878" class="subhead">${percent}% OF MY GOAL</text><rect x="96" y="902" width="888" height="12" fill="#f1eee5" stroke="#181916" stroke-width="2"/><rect class="share-progress ${animated ? "" : "share-progress-static"}" x="96" y="902" width="${888 * percent / 100}" height="12" fill="#d9f525"/><text x="800" y="670" class="metric-label" text-anchor="middle">${data.focusGoalMinutes} MIN GOAL</text>${streakBadge(data.streakDays, 96, 942, 888, 82, animated)}${optionalResource(data, includeResource, 1070)}`;
  } else if (variant === "recap") {
    content = `<text x="96" y="278" class="headline ${animated ? "share-reveal share-delay-1" : ""}">LEARNING RECAP</text>${cupSvg(data, 670, 245, 300, 292, animated)}<text x="96" y="374" class="metric-label">TODAY · RECORDED</text><text x="96" y="475" class="hero-number-small ${animated ? "share-reveal share-delay-2" : ""}">${formatShareTime(data.todayMs)}</text><text x="96" y="535" class="micro-label">OF YOUR SELECTED FOCUS GOAL</text><text x="96" y="580" class="subhead">${minutes} of ${data.focusGoalMinutes} min · ${percent}%</text><rect x="96" y="628" width="888" height="12" fill="#f1eee5" stroke="#181916" stroke-width="2"/><rect class="share-progress ${animated ? "" : "share-progress-static"}" x="96" y="628" width="${888 * percent / 100}" height="12" fill="#d9f525"/><rect x="96" y="690" width="425" height="126" fill="#fffefa" stroke="#181916" stroke-width="2"/><text x="122" y="733" class="metric-label">THIS WEEK · RECORDED</text><text x="122" y="787" class="metric-value">${formatShareTime(data.weekMs)}</text><rect x="559" y="690" width="425" height="126" fill="#f2d5d2" stroke="#181916" stroke-width="2"/><text x="585" y="733" class="metric-label">LIFETIME · RECORDED</text><text x="585" y="787" class="metric-value">${formatShareTime(data.lifetimeMs)}</text>${streakBadge(data.streakDays, 96, 850, 888, 86, animated)}<text x="96" y="1004" class="subhead">${data.resourcesInProgress} resources in progress</text><text x="96" y="1050" class="subhead">${data.lessonsMarkedComplete} lessons marked complete</text>${optionalResource(data, includeResource, 1090)}<text x="96" y="1156" class="footnote">Date totals reflect activity available in this browser.</text>`;
  } else {
    content = `<text x="96" y="260" class="metric-label">TODAY</text><text x="96" y="344" class="editorial-intro ${animated ? "share-reveal share-delay-1" : ""}">I SHOWED UP.</text><text x="96" y="574" class="hero-number ${animated ? "share-reveal share-delay-2" : ""}">${Math.floor(Math.max(0, data.todayMs) / 60_000)}</text><text x="104" y="622" class="hero-label">MIN TODAY</text>${cupSvg(data, 610, 265, 365, 370, animated)}<text x="792" y="694" class="subhead" text-anchor="middle">${minutes} / ${data.focusGoalMinutes} MIN</text><text x="96" y="725" class="subhead">${percent}% OF MY GOAL</text><rect x="96" y="750" width="888" height="14" fill="#f1eee5" stroke="#181916" stroke-width="2"/><rect class="share-progress ${animated ? "" : "share-progress-static"}" x="96" y="750" width="${888 * percent / 100}" height="14" fill="#d9f525"/>${streakBadge(data.streakDays, 96, 812, 888, 88, animated)}${optionalResource(data, includeResource, 1030)}`;
  }

  const motionStyles = animated ? `<style>
    @keyframes share-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes share-settle{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes share-fill{from{transform:scaleY(0)}to{transform:scaleY(1)}}
    @keyframes share-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    .share-reveal{animation:share-rise .55s cubic-bezier(.2,.75,.25,1) both}
    .share-delay-1{animation-delay:.08s}.share-delay-2{animation-delay:.17s}
    .share-cup{transform-box:fill-box;transform-origin:center;animation:share-settle .68s cubic-bezier(.2,.75,.25,1) .12s both}
    .share-liquid{transform-box:fill-box;transform-origin:center bottom;animation:share-fill .9s cubic-bezier(.2,.75,.25,1) .18s both}
    .share-progress{transform-box:fill-box;transform-origin:left center;animation:share-progress .78s cubic-bezier(.2,.75,.25,1) .2s both}
    .share-streak{transform-box:fill-box;transform-origin:center;animation:share-settle .5s cubic-bezier(.2,.75,.25,1) .38s both}
    @media(prefers-reduced-motion:reduce){.share-reveal,.share-cup,.share-liquid,.share-progress,.share-streak{animation:none!important;opacity:1!important;transform:none!important}}
  </style>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><style>
    text{font-family:Inter,Arial,sans-serif;fill:#181916}.brand{font-size:33px;font-weight:850;letter-spacing:-1.2px}.kicker,.metric-label,.subject{font-size:17px;font-weight:800;letter-spacing:2.3px}.headline{font-size:56px;font-weight:850;letter-spacing:-1.7px}.editorial-intro{font-family:Georgia,"Times New Roman",serif;font-size:52px;font-weight:700;font-style:italic;letter-spacing:-1px}.subhead{font-size:26px;font-weight:700}.hero-number{font-size:190px;font-weight:850;letter-spacing:-12px}.hero-number-small{font-size:72px;font-weight:850;letter-spacing:-3px}.hero-label{font-size:20px;font-weight:850;letter-spacing:4px}.streak{font-size:28px;font-weight:850;letter-spacing:1px}.metric-label{font-size:15px}.metric-value{font-size:43px;font-weight:850;letter-spacing:-1.8px}.goal-record{font-size:68px;font-weight:850;letter-spacing:-3px}.micro-label{font-size:15px;font-weight:800;letter-spacing:1.6px;fill:#51544e}.resource{font-size:26px;font-weight:750}.subject{font-size:16px}.footer,.footnote{font-size:14px;font-weight:700;letter-spacing:.5px;fill:#51544e}
  </style>${motionStyles}${common}${content}</svg>`;
}

export function shareCardAlt(data: ShareProgressData, variant: ShareCardVariant): string {
  if (variant === "goal") return `Focus goal reached. ${Math.floor(data.recordedFocusMs / 60_000)} minutes focused, ${data.streakDays} day streak.`;
  if (variant === "recap") return `Learning recap. ${formatShareTime(data.todayMs)} today, ${formatShareTime(data.weekMs)} this week, ${formatShareTime(data.lifetimeMs)} lifetime, ${data.streakDays} day streak.`;
  return `Today's focus: ${formatShareTime(data.todayMs)} recorded, ${data.goalPercent}% of selected focus goal, ${data.streakDays} day streak.`;
}
