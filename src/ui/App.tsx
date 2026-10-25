import { useEffect, useRef, useState, type FormEvent } from "react";
import { newCommitment, parseObjective, type CommitmentRecordV1 } from "../domain/commitment";
import { parseGoalMinutes } from "../domain/focusGoal";
import { parseYouTubeUrl, type YouTubeLesson } from "../domain/youtubeUrl";
import { CommitmentRepository, type LoadResult } from "../services/persistence/commitmentRepository";
import { PlayerAdapter, type PlayerState } from "../services/youtube/playerAdapter";

type Page = "landing" | "setup" | "learning" | "study" | "recovery";
type SetupValues = { url: string; objective: string; goal: string };
type PendingLesson = { lesson: YouTubeLesson; objective: string; goalMinutes: number };
const emptySetup: SetupValues = { url: "", objective: "", goal: "25" };

export function App() {
  const repository = useRef(new CommitmentRepository()).current;
  const [loaded] = useState<LoadResult>(() => repository.load());
  const [record, setRecord] = useState<CommitmentRecordV1 | null>(loaded.status === "valid" ? loaded.record : null);
  const [page, setPage] = useState<Page>(loaded.status === "empty" ? "landing" : loaded.status === "valid" ? "learning" : "recovery");
  const [setupValues, setSetupValues] = useState<SetupValues>(emptySetup);
  const [setupError, setSetupError] = useState("");
  const [pending, setPending] = useState<PendingLesson | null>(null);
  const [storageWarning, setStorageWarning] = useState("");

  useEffect(() => repository.watch((status) => {
    setStorageWarning(status === "stale"
      ? "This lesson changed in another tab. Activity and saving are stopped here. Reload this page to see the latest saved lesson. Use one active study tab."
      : "Saved progress could not be verified. Activity and saving are stopped. Reload when browser storage is available.");
  }), [repository]);

  function goToSetup() {
    setSetupError("");
    setPage("setup");
  }

  function startCandidate(candidate: PendingLesson) {
    setPending(candidate);
    setSetupError("");
    setPage("study");
  }

  function onCandidateAccepted(candidate: PendingLesson): boolean {
    const next = newCommitment(candidate.lesson, candidate.objective, candidate.goalMinutes);
    const result = repository.save(next);
    if (result.status === "saved") {
      setRecord(next);
      setPending(null);
      return true;
    }
    setStorageWarning(result.status === "unverified" ? "Saved state is unverified. Reload to reconcile storage before studying." :
      result.status === "stale" ? "Another tab changed this lesson. Reload to see the latest saved record." : "The lesson could not be saved. Check browser storage and retry.");
    setSetupError("The lesson loaded, but its commitment could not be confirmed in this browser. Your setup is still here.");
    setPage("setup");
    return false;
  }

  return <div className="app-shell">
    <header className="site-header">
      <button className="wordmark" onClick={() => setPage(record ? "learning" : "landing")} aria-label="K12Learn2Gether home">
        <span className="wordmark-symbol" aria-hidden="true">K<span>✦</span></span>
        <span>K12Learn2Gether</span>
      </button>
      <div className="header-right"><span className="header-tag">LESS SEARCHING. MORE FINISHING.</span>{record && <button className="text-button" onClick={() => setPage("learning")}>My Learning <span aria-hidden="true">↗</span></button>}</div>
    </header>

    {storageWarning && <div className="storage-warning" role="alert">{storageWarning}</div>}

    <main>
      {page === "landing" && <Landing onStart={goToSetup} />}
      {page === "setup" && <Setup values={setupValues} onChange={setSetupValues} error={setupError} onError={setSetupError} onBack={() => setPage(record ? "learning" : "landing")} onStart={startCandidate} />}
      {page === "study" && <StudyWorkspace key={pending?.lesson.videoId ?? record?.lesson.videoId ?? "none"} candidate={pending} record={record} onCandidateAccepted={onCandidateAccepted} onCandidateError={(message) => { setSetupError(message); setPending(null); setPage("setup"); }} onExit={() => setPage(record ? "learning" : "setup")} />}
      {page === "learning" && record && <LearningHome record={record} onContinue={() => { setPending(null); setPage("study"); }} />}
      {page === "recovery" && <section className="recovery section-pad"><p className="eyebrow">LOCAL SAVE NEEDS ATTENTION</p><h1>We couldn’t safely read your saved lesson.</h1><p>Your browser’s saved data may be unavailable or in a format this version cannot read. This page will not overwrite it. Check that site storage is available, then reload. If you changed the host or port, return to the original address.</p><button className="button button-ink" onClick={() => window.location.reload()}>Retry loading</button></section>}
    </main>
    <footer className="site-footer"><span>K12Learn2Gether</span><span>One lesson. One goal. Your pace.</span></footer>
  </div>;
}

function Landing({ onStart }: { onStart: () => void }) {
  return <>
    <section className="hero section-pad">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> THE STUDY SPACE FOR FINISHING</p><h1>You don’t need<br />another <em>playlist.</em><br />You need to finish<br />the one you started<span className="period">.</span></h1><p className="hero-lede">The lectures are free. The teachers are excellent. The study plans are everywhere. Yet somehow, exams get closer while the unfinished lessons keep growing.</p><div className="hero-actions"><button className="button button-ink" onClick={onStart}>Start finishing what you learn <span aria-hidden="true">↗</span></button><a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div></div>
      <div className="hero-art" aria-hidden="true"><div className="art-note art-note-top">ONE GOOD<br />LESSON</div><div className="art-orbit"><div className="art-orbit-inner"><span className="art-play">▶</span></div></div><div className="art-note art-note-bottom">A CLEAR<br />NEXT STEP <span>↗</span></div><div className="art-spark">✳</div><div className="art-caption">A LITTLE LESS SCROLLING.<br />A LOT MORE STARTING.</div></div>
      <div className="hero-index">01 / THE PROBLEM</div>
    </section>
    <section id="how-it-works" className="story section-pad"><div className="story-intro"><p className="eyebrow">THE LOOP WE KNOW TOO WELL</p><h2>Finding the perfect resource can become the thing that keeps you from learning.</h2></div><div className="cycle" aria-label="The resource search cycle: Search, Compare, Save, Start, Switch, Repeat">{["Search", "Compare", "Save", "Start", "Switch", "Repeat"].map((step, i) => <div className="cycle-step" key={step}><span className="cycle-index">0{i + 1}</span><strong>{step}</strong><span className="cycle-arrow" aria-hidden="true">↗</span></div>)}</div><div className="story-aside">The next video rarely solves the hard part: staying with the one you chose.</div></section>
    <section className="manifesto section-pad"><p className="eyebrow">A SMALLER, STRONGER START</p><h2>Bring what you already want to learn. <em>We help you actually finish it.</em></h2><p>Already found a teacher you trust? Bring your lesson, set one goal, and focus on finishing what you start.</p><button className="button button-lime" onClick={onStart}>Start with one lesson <span aria-hidden="true">↗</span></button></section>
    <section className="features section-pad"><div><p className="eyebrow">WHAT YOU CAN DO HERE</p><h2>A focused place for the lesson you picked.</h2></div><div className="feature-grid"><article><span>01 / COMMIT</span><h3>One lesson. One goal.</h3><p>Paste a YouTube lesson and name what you want to understand.</p></article><article><span>02 / FOCUS</span><h3>Make the time count.</h3><p>Record activity only while playback and browser focus can be confirmed.</p></article><article><span>03 / RETURN</span><h3>Pick up your thread.</h3><p>Continue from your saved lesson and playback position in this browser.</p></article><article><span>04 / SEE IT</span><h3>A cup that tells the truth.</h3><p>Your Focus Cup reflects recorded activity toward your own time goal.</p></article></div></section>
    <section className="closing-cta section-pad"><p className="eyebrow">READY WHEN YOU ARE</p><h2>Less searching.<br /><em>More finishing.</em></h2><button className="button button-ink" onClick={onStart}>Start finishing what you learn <span aria-hidden="true">↗</span></button></section>
  </>;
}

function Setup({ values, onChange, error, onError, onBack, onStart }: { values: SetupValues; onChange: (value: SetupValues) => void; error: string; onError: (value: string) => void; onBack: () => void; onStart: (value: PendingLesson) => void }) {
  const [errors, setErrors] = useState<Partial<Record<keyof SetupValues, string>>>({});
  const goalOptions = ["15", "25", "45"];
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsedLesson = parseYouTubeUrl(values.url);
    const objective = parseObjective(values.objective);
    const goal = parseGoalMinutes(values.goal);
    const nextErrors = {
      url: parsedLesson.ok ? "" : parsedLesson.message,
      objective: objective ? "" : "Write a short objective (up to 180 characters).",
      goal: goal.ok ? "" : "Choose a whole number from 5 to 240 minutes.",
    };
    setErrors(nextErrors);
    onError("");
    if (!parsedLesson.ok || !objective || !goal.ok) return;
    onStart({ lesson: parsedLesson.lesson, objective, goalMinutes: goal.minutes });
  }
  return <section className="setup-page section-pad"><div className="setup-heading"><button className="back-link" onClick={onBack}>← Back</button><p className="eyebrow">01 / MAKE A COMMITMENT</p><h1>Start with <em>one good lesson.</em></h1><p>Choose something you genuinely want to understand. You can come back to this commitment in the same browser.</p></div><form className="setup-form" onSubmit={submit} noValidate><label htmlFor="lesson-url"><span>01</span> YouTube lesson URL</label><input id="lesson-url" value={values.url} onChange={(event) => onChange({ ...values, url: event.target.value })} type="url" placeholder="https://www.youtube.com/watch?v=..." aria-invalid={!!errors.url} aria-describedby={errors.url ? "url-error" : undefined} autoComplete="off" /><p className="field-help">A public, embeddable YouTube video. We’ll check it before saving your choice.</p>{errors.url && <p className="field-error" id="url-error">{errors.url}</p>}
      <label htmlFor="objective"><span>02</span> What do you want to understand?</label><textarea id="objective" value={values.objective} onChange={(event) => onChange({ ...values, objective: event.target.value })} placeholder="e.g. Solve a quadratic equation without looking at notes" maxLength={180} rows={3} aria-invalid={!!errors.objective} aria-describedby={errors.objective ? "objective-error" : undefined} />{errors.objective && <p className="field-error" id="objective-error">{errors.objective}</p>}
      <fieldset><legend><span>03</span> Choose a focus-time goal</legend><div className="goal-options">{goalOptions.map((option) => <button key={option} type="button" className={values.goal === option ? "goal-option selected" : "goal-option"} onClick={() => onChange({ ...values, goal: option })}>{option}<small>min</small></button>)}<label className="custom-goal">Custom <input type="number" min={5} max={240} step={1} value={goalOptions.includes(values.goal) ? "" : values.goal} onChange={(event) => onChange({ ...values, goal: event.target.value })} placeholder="minutes" aria-label="Custom focus-time goal in minutes" /></label></div><p className="field-help">Choose 5–240 minutes. This is activity time, not video length.</p>{errors.goal && <p className="field-error" id="goal-error">{errors.goal}</p>}</fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-ink setup-submit" type="submit">Start focused study <span aria-hidden="true">↗</span></button><p className="storage-note">Your lesson and activity stay in this browser profile. There’s no account or cloud backup; clearing site data may remove them.</p></form></section>;
}

function LearningHome({ record, onContinue }: { record: CommitmentRecordV1; onContinue: () => void }) {
  return <section className="learning-page section-pad"><p className="eyebrow">YOUR STUDY SPACE</p><h1>My <em>Learning.</em></h1><div className="learning-grid"><div className="learning-card"><span className="pill">{record.lessonStatus === "completed" ? "COMPLETED" : "UNFINISHED"}</span><h2>{record.objective}</h2><p className="lesson-url">{record.lesson.canonicalUrl}</p><dl><div><dt>Focus-time goal</dt><dd>{record.goalMinutes} min</dd></div><div><dt>Recorded activity</dt><dd>{Math.floor(record.cumulativeRecordedFocusedMs / 60000)} min</dd></div><div><dt>Saved position</dt><dd>{formatTime(record.lastConfirmedPositionMs)}</dd></div></dl>{record.lessonStatus === "unfinished" && <button className="button button-ink" onClick={onContinue}>Continue Learning <span aria-hidden="true">↗</span></button>}</div><aside className="learning-aside"><span className="aside-mark">✳</span><p>Progress is saved in this browser. Continuing opens the lesson paused, so you decide when to begin again.</p><small>Last confirmed save: {new Date(record.updatedAt).toLocaleString()}</small></aside></div></section>;
}

function StudyWorkspace({ candidate, record, onCandidateAccepted, onCandidateError, onExit }: { candidate: PendingLesson | null; record: CommitmentRecordV1 | null; onCandidateAccepted: (candidate: PendingLesson) => boolean; onCandidateError: (message: string) => void; onExit: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const adapter = useRef<PlayerAdapter | null>(null);
  const [state, setState] = useState<PlayerState>("unstarted");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const lesson = candidate?.lesson ?? record?.lesson;

  useEffect(() => {
    if (!host.current || !lesson) return;
    let cancelled = false;
    const instance = new PlayerAdapter(host.current, { onState: setState, onError: setMessage, onAutoplayBlocked: () => setBlocked(true) });
    adapter.current = instance;
    void instance.cueCandidate(lesson.videoId).then((result) => {
      if (cancelled) return;
      if (result.status !== "accepted") {
        if (candidate) onCandidateError(result.message);
        else { setMessage(result.message); setLoading(false); }
        return;
      }
      if (candidate) {
        if (!onCandidateAccepted(candidate)) return;
        instance.play();
      } else if (record?.lastConfirmedPositionMs) {
        instance.seekTo(record.lastConfirmedPositionMs);
      }
      setLoading(false);
    });
    return () => { cancelled = true; instance.destroy(); if (adapter.current === instance) adapter.current = null; };
    // A workspace is mounted for one candidate or saved lesson. Parent re-renders must not recreate its iframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.videoId]);

  return <section className="study-page section-pad"><div className="study-heading"><button className="back-link" onClick={onExit}>← My Learning</button><p className="eyebrow">YOUR FOCUSED STUDY SPACE</p><h1>Stay with <em>this lesson.</em></h1></div><div className="study-grid"><div><div className="player-frame"><div ref={host} className="player-host" /></div>{loading && <p className="player-status" role="status">Checking that this YouTube lesson can load…</p>}{message && <p className="form-error" role="alert">{message}</p>}{blocked && <p className="player-status" role="status">Your lesson is ready. Press Play to begin.</p>}<p className="player-credit">Video playback provided by YouTube. Standard YouTube controls remain available.</p></div><aside className="study-side"><p className="eyebrow">TODAY’S COMMITMENT</p><h2>{candidate?.objective ?? record?.objective}</h2><div className="side-line"><span>Focus-time goal</span><strong>{candidate?.goalMinutes ?? record?.goalMinutes} min</strong></div><div className="side-line"><span>Recorded activity</span><strong>{Math.floor((record?.cumulativeRecordedFocusedMs ?? 0) / 60000)} min</strong></div><div className="side-line"><span>Player</span><strong>{loading ? "Loading" : state}</strong></div><p className="study-disclosure">Focus activity recording arrives in the next build step. This screen does not credit time yet.</p>{!loading && <button className="button button-lime" onClick={() => { setBlocked(false); adapter.current?.play(); }}>Play lesson <span aria-hidden="true">▶</span></button>}<button className="text-button" onClick={() => adapter.current?.pause()}>Pause video</button><button className="text-button" onClick={onExit}>Finish this visit</button></aside></div></section>;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
