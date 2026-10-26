import { useState } from "react";
import type { FocusVesselStyle } from "../domain/focusVessel";
import {
  itemProgress,
  itemStatus,
  selectContinueItem,
  sortLibraryItems,
  STREAK_QUALIFYING_MS,
  type ActivityPeriod,
  type LibraryItem,
  type LibraryStateV1,
} from "../domain/library";
import { selectShareProgress } from "../domain/shareProgress";
import { FocusCup } from "./FocusCup";
import { ShareProgress } from "./ShareProgress";

export function LearningDashboard({ library, onAdd, onOpen, onVesselStyleChange }: {
  library: LibraryStateV1;
  onAdd: () => void;
  onOpen: (item: LibraryItem) => void;
  onVesselStyleChange: (item: LibraryItem, style: FocusVesselStyle) => void;
}) {
  const [period, setPeriod] = useState<ActivityPeriod>("week");
  const items = sortLibraryItems(library.items);
  const nextItem = selectContinueItem(items);
  const periodLabels: Record<ActivityPeriod, string> = { day: "Today", week: "This week", month: "This month", year: "This year" };
  const today = new Date();
  const shareData = selectShareProgress(library, library.selectedItemId, today);
  const periodValues: Record<ActivityPeriod, number> = { day: shareData.todayMs, week: shareData.weekMs, month: shareData.monthMs, year: shareData.yearMs };
  const todayRecordedMs = shareData.todayMs;
  const nextProgress = nextItem ? itemProgress(nextItem) : 0;
  const nextRecordedMs = nextItem?.commitment.cumulativeRecordedFocusedMs ?? 0;
  const nextGoalMinutes = nextItem?.commitment.goalMinutes ?? 25;

  return <section id="my-learning" className="library-dashboard section-pad">
    <header className="library-heading"><div><p className="eyebrow">YOUR PERSONAL LEARNING LIBRARY</p><h1>My <em>Learning.</em></h1><p>Everything you’ve chosen to come back to.</p></div><button className="button button-ink" onClick={onAdd}>Add to library <span aria-hidden="true">+</span></button></header>
    <section className="momentum-section" aria-labelledby="momentum-heading">
      <div className="dashboard-section-heading"><div><p className="eyebrow">STEADY WORK, COUNTED HONESTLY</p><h2 id="momentum-heading">Your momentum</h2></div><div className="momentum-heading-actions"><div className="period-switch" role="group" aria-label="Activity period">{(Object.keys(periodLabels) as ActivityPeriod[]).map((key) => <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div><ShareProgress library={library} resourceId={library.selectedItemId ?? items[0].id} /></div></div>
      <div className="momentum-grid">
        <article className={`streak-card${todayRecordedMs >= STREAK_QUALIFYING_MS ? " qualified" : ""}`} data-qualified={todayRecordedMs >= STREAK_QUALIFYING_MS}>
          <span className="streak-kicker"><svg className="streak-flame" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.4 2.5c.8 4-3.5 5.2-3.5 9.1 0 1.2.6 2.1 1.5 2.6-.1-2.1 1-3.2 2.1-4.3 2.5 2.2 4.5 4.2 4.5 7.1A5.1 5.1 0 0 1 11.8 22c-4 0-6.8-2.7-6.8-6.6 0-4.4 3.1-7.5 7.4-12.9Z" fill="currentColor"/></svg> Current streak</span>
          <strong>{shareData.streakDays} <small>{shareData.streakDays === 1 ? "day" : "days"}</small></strong>
          <div className="streak-today"><span>Today</span><span>{formatLibraryTime(todayRecordedMs)} / 10 min</span></div>
          <progress className="streak-progress" max={STREAK_QUALIFYING_MS} value={Math.min(todayRecordedMs, STREAK_QUALIFYING_MS)} aria-label={`${Math.floor(Math.min(todayRecordedMs, STREAK_QUALIFYING_MS) / 60_000)} of 10 minutes toward today's streak day`} />
          <p>A day counts after 10 minutes of eligible recorded focus.</p>
        </article>
        <article><span>{periodLabels[period]} · recorded focus</span><strong>{formatLibraryTime(periodValues[period])}</strong><p>Eligible activity recorded in this browser.</p></article>
        <article><span>Recorded focus total</span><strong>{formatLibraryTime(shareData.lifetimeMs)}</strong><p>Saved across your library resources.</p></article>
        <article><span>Lessons marked complete</span><strong>{shareData.lessonsMarkedComplete}</strong><p>Based on your completion choice.</p></article>
      </div>
    </section>

    <section className="continue-section" aria-labelledby="continue-heading">
      <div className="dashboard-section-heading"><div><p className="eyebrow">PICK UP YOUR THREAD</p><h2 id="continue-heading">Continue learning</h2></div></div>
      {nextItem ? <article className="continue-card"><div className="continue-copy"><span className="subject-label">{nextItem.subject}</span><h3>{nextItem.title}</h3><p>{nextItem.commitment.objective}</p><div className="library-progress-line"><span>Focus goal progress · {nextProgress}%</span><span>{formatLibraryTime(nextRecordedMs)} recorded</span></div><progress className="library-progress" max={100} value={nextProgress} aria-label={`${nextProgress} percent of focus goal`} /><div className="continue-meta"><span>{nextItem.sourceType === "playlist" ? "YouTube playlist" : "YouTube video"}</span><span>Continue from {formatPosition(nextItem.commitment.lastConfirmedPositionMs)}</span></div></div><div className="continue-actions"><FocusCup compact recordedMs={nextRecordedMs} goalMinutes={nextGoalMinutes} vesselStyle={nextItem.commitment.vesselStyle} onVesselStyleChange={(style) => onVesselStyleChange(nextItem, style)} /><button className="button button-ink" onClick={() => onOpen(nextItem)}>{itemStatus(nextItem) === "not-started" ? "Start learning" : "Continue Learning"} <span aria-hidden="true">↗</span></button></div></article>
        : <div className="continue-empty"><p>Every saved lesson is marked complete. Add another resource whenever you’re ready.</p><button className="text-button" onClick={onAdd}>Add another resource ↗</button></div>}
    </section>

    <section className="library-section" aria-labelledby="library-heading">
      <div className="dashboard-section-heading"><div><p className="eyebrow">CHOSEN BY YOU</p><h2 id="library-heading">Your library <span>{items.length}</span></h2></div></div>
      <div className="library-grid">{items.map((item) => <LibraryCard key={item.id} item={item} onOpen={() => onOpen(item)} />)}</div>
    </section>
    <p className="library-history-note">Daily, weekly, monthly, yearly, and streak totals use eligible activity recorded since this browser began keeping date history. Earlier saved focus is included in the total, but its dates are unknown.</p>
  </section>;
}

function LibraryCard({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  const percent = itemProgress(item);
  const status = itemStatus(item);
  return <article className="library-card">
    <div className="library-card-top"><span className="subject-label">{item.subject}</span><span className={`library-status ${status}`}>{status === "completed" ? "Marked complete" : status === "in-progress" ? "In progress" : "Not started"}</span></div>
    <h3>{item.title}</h3><p className="library-objective">{item.commitment.objective}</p>
    <div className="library-progress-line"><span>Focus goal progress · {percent}%</span><span>{formatLibraryTime(item.commitment.cumulativeRecordedFocusedMs)} recorded</span></div>
    <progress className="library-progress" max={100} value={percent} aria-label={`${percent} percent of focus goal`} />
    <div className="library-card-meta"><span>{item.sourceType === "playlist" ? "YouTube playlist" : "YouTube video"}</span><span>{item.lastStudiedAt ? `Last studied ${formatDate(item.lastStudiedAt)}` : "Not studied yet"}</span><span>Continue from {formatPosition(item.commitment.lastConfirmedPositionMs)}</span></div>
    <button className="text-button library-open" onClick={onOpen}>{status === "completed" ? "Open saved resource" : status === "not-started" ? "Start learning" : "Continue"} <span aria-hidden="true">↗</span></button>
  </article>;
}

function formatLibraryTime(milliseconds: number): string {
  const totalMinutes = Math.floor(milliseconds / 60_000);
  if (totalMinutes >= 60) return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  return `${totalMinutes} min`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatPosition(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
