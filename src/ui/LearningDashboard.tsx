import { useState } from "react";
import {
  currentStudyStreak,
  itemProgress,
  itemStatus,
  periodActivityMs,
  selectContinueItem,
  sortLibraryItems,
  type ActivityPeriod,
  type LibraryItem,
  type LibraryStateV1,
} from "../domain/library";

export function LearningDashboard({ library, onAdd, onOpen }: {
  library: LibraryStateV1;
  onAdd: () => void;
  onOpen: (item: LibraryItem) => void;
}) {
  const [period, setPeriod] = useState<ActivityPeriod>("week");
  const items = sortLibraryItems(library.items);
  const nextItem = selectContinueItem(items);
  const lifetimeMs = items.reduce((total, item) => total + item.commitment.cumulativeRecordedFocusedMs, 0);
  const completedCount = items.filter((item) => item.commitment.lessonStatus === "completed").length;
  const periodLabels: Record<ActivityPeriod, string> = { day: "Today", week: "This week", month: "This month", year: "This year" };

  return <section id="my-learning" className="library-dashboard section-pad">
    <header className="library-heading"><div><p className="eyebrow">YOUR PERSONAL LEARNING LIBRARY</p><h1>My <em>Learning.</em></h1><p>Everything you’ve chosen to come back to.</p></div><button className="button button-ink" onClick={onAdd}>Add to library <span aria-hidden="true">+</span></button></header>
    <section className="momentum-section" aria-labelledby="momentum-heading">
      <div className="dashboard-section-heading"><div><p className="eyebrow">STEADY WORK, COUNTED HONESTLY</p><h2 id="momentum-heading">Your momentum</h2></div><div className="period-switch" role="group" aria-label="Activity period">{(Object.keys(periodLabels) as ActivityPeriod[]).map((key) => <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div></div>
      <div className="momentum-grid">
        <article><span>Current streak</span><strong>{currentStudyStreak(library.activity, new Date())} <small>days</small></strong><p>At least 1 minute of recorded activity per day.</p></article>
        <article><span>{periodLabels[period]}</span><strong>{formatLibraryTime(periodActivityMs(library.activity, period, new Date()))}</strong><p>Date-based totals start with Library tracking.</p></article>
        <article><span>Total focused</span><strong>{formatLibraryTime(lifetimeMs)}</strong><p>Across saved resources in this browser.</p></article>
        <article><span>Lessons marked complete</span><strong>{completedCount}</strong><p>Based on your completion choice.</p></article>
      </div>
    </section>

    <section className="continue-section" aria-labelledby="continue-heading">
      <div className="dashboard-section-heading"><div><p className="eyebrow">PICK UP YOUR THREAD</p><h2 id="continue-heading">Continue learning</h2></div></div>
      {nextItem ? <article className="continue-card"><div className="continue-copy"><span className="subject-label">{nextItem.subject}</span><h3>{nextItem.title}</h3><p>{nextItem.commitment.objective}</p><div className="library-progress-line"><span>Focus goal · {itemProgress(nextItem)}%</span><span>{formatLibraryTime(nextItem.commitment.cumulativeRecordedFocusedMs)} recorded</span></div><progress className="library-progress" max={100} value={itemProgress(nextItem)} aria-label={`${itemProgress(nextItem)} percent of focus goal`} /><div className="continue-meta"><span>{nextItem.sourceType === "playlist" ? "YouTube playlist" : "YouTube video"}</span><span>{nextItem.lastStudiedAt ? `Last studied ${formatDate(nextItem.lastStudiedAt)}` : "Not studied yet"}</span><span>Saved position · {formatPosition(nextItem.commitment.lastConfirmedPositionMs)}</span></div></div><button className="button button-ink" onClick={() => onOpen(nextItem)}>{itemStatus(nextItem) === "not-started" ? "Start learning" : "Continue Learning"} <span aria-hidden="true">↗</span></button></article>
        : <div className="continue-empty"><p>Every saved lesson is marked complete. Add another resource whenever you’re ready.</p><button className="text-button" onClick={onAdd}>Add another resource ↗</button></div>}
    </section>

    <section className="library-section" aria-labelledby="library-heading">
      <div className="dashboard-section-heading"><div><p className="eyebrow">CHOSEN BY YOU</p><h2 id="library-heading">Your library <span>{items.length}</span></h2></div></div>
      <div className="library-grid">{items.map((item) => <LibraryCard key={item.id} item={item} onOpen={() => onOpen(item)} />)}</div>
    </section>
    <p className="library-history-note">Daily, weekly, monthly, yearly, and streak totals begin when eligible activity is recorded in Library V1. Earlier saved focus remains included in total focused, but its dates are unknown.</p>
  </section>;
}

function LibraryCard({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  const percent = itemProgress(item);
  const status = itemStatus(item);
  const playlistCount = item.commitment.lesson.playlistVideoIds?.length;
  return <article className="library-card">
    <div className="library-card-top"><span className="subject-label">{item.subject}</span><span className={`library-status ${status}`}>{status === "completed" ? "Marked complete" : status === "in-progress" ? "In progress" : "Not started"}</span></div>
    <h3>{item.title}</h3><p className="library-objective">{item.commitment.objective}</p>
    <div className="library-progress-line"><span>Focus goal · {percent}%</span><span>{formatLibraryTime(item.commitment.cumulativeRecordedFocusedMs)}</span></div>
    <progress className="library-progress" max={100} value={percent} aria-label={`${percent} percent of focus goal`} />
    <div className="library-card-meta"><span>{item.sourceType === "playlist" ? `Playlist${playlistCount ? ` · ${playlistCount} videos` : ""}` : "Video"}</span><span>{item.lastStudiedAt ? `Last studied ${formatDate(item.lastStudiedAt)}` : "Not studied yet"}</span><span>Position · {formatPosition(item.commitment.lastConfirmedPositionMs)}</span></div>
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
