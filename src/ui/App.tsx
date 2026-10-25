import { useEffect, useRef, useState, type FormEvent } from "react";
import { newCommitment, parseObjective, type CommitmentRecordV1 } from "../domain/commitment";
import { parseGoalMinutes } from "../domain/focusGoal";
import { parseYouTubeUrl, type YouTubeLesson } from "../domain/youtubeUrl";
import { CommitmentRepository, type LoadResult } from "../services/persistence/commitmentRepository";
import { FocusController } from "../services/focus/focusController";
import { BrowserFocusSignalSource, type FocusState } from "../services/focus/focusSignals";
import { PlayerAdapter, type CandidateResult, type CurrentVideo, type PlayerState } from "../services/youtube/playerAdapter";
import { FocusCup, formatActivity } from "./FocusCup";

type Page = "landing" | "setup" | "learning" | "study" | "recovery";
type SetupValues = { url: string; objective: string; goal: string };
type PendingLesson = { lesson: YouTubeLesson; objective: string; goalMinutes: number };
const emptySetup: SetupValues = { url: "", objective: "", goal: "25" };

export function App() {
  const repository = useRef(new CommitmentRepository()).current;
  const [loaded] = useState<LoadResult>(() => repository.load());
  const [record, setRecord] = useState<CommitmentRecordV1 | null>(loaded.status === "valid" ? loaded.record : null);
  const recordRef = useRef(record);
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

  useEffect(() => { recordRef.current = record; }, [record]);

  useEffect(() => {
    const current = recordRef.current;
    if (!current || current.sessionStatus !== "active") return;
    const interruptedRecord = { ...current, revision: current.revision + 1, sessionStatus: "interrupted" as const, updatedAt: new Date().toISOString() };
    const result = repository.save(interruptedRecord);
    if (result.status === "saved") {
      recordRef.current = interruptedRecord;
      setRecord(interruptedRecord);
      return;
    }
    setStorageWarning(result.status === "stale"
      ? "Another tab changed this commitment. Reload to reconcile it before continuing."
      : result.status === "unverified"
        ? "The interrupted session state could not be verified. Reload before recording activity."
        : "The session is paused in memory, but its interrupted state could not be saved.");
  }, [repository]);

  function goToSetup() {
    setSetupError("");
    setPage("setup");
  }

  function startCandidate(candidate: PendingLesson) {
    setPending(candidate);
    setSetupError("");
    setPage("study");
  }

  function onCandidateAccepted(candidate: PendingLesson, lesson: Extract<CandidateResult, { status: "accepted" }>["lesson"]): CommitmentRecordV1 | null {
    const next = newCommitment(lesson, candidate.objective, candidate.goalMinutes);
    const prior = repository.getLastConfirmed();
    if (prior) next.revision = prior.revision + 1;
    const result = repository.save(next);
    if (result.status === "saved") {
      recordRef.current = next;
      setRecord(next);
      setPending(null);
      return next;
    }
    setStorageWarning(result.status === "unverified" ? "Saved state is unverified. Reload to reconcile storage before studying." :
      result.status === "stale" ? "Another tab changed this lesson. Reload to see the latest saved record." : "The lesson could not be saved. Check browser storage and retry.");
    setSetupError("The lesson loaded, but its commitment could not be confirmed in this browser. Your setup is still here.");
    setPage("setup");
    return null;
  }

  function onUpdate(patch: Partial<Omit<CommitmentRecordV1, "schemaVersion" | "revision" | "createdAt" | "updatedAt">>) {
    const current = recordRef.current;
    if (!current) return { status: "not-saved" as const };
    const next: CommitmentRecordV1 = {
      ...current,
      ...patch,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    const result = repository.save(next);
    if (result.status === "saved") {
      recordRef.current = next;
      setRecord(next);
    }
    return result.status === "saved" ? { status: result.status, record: next } : { status: result.status };
  }

  return <div className={page === "study" ? "app-shell study-mode" : "app-shell"}>
    <header className="site-header">
      <button className="wordmark" onClick={() => setPage(record ? "learning" : "landing")} aria-label="K12Learn2Gether home">
        <span className="wordmark-symbol" aria-hidden="true">K<span>✦</span></span>
        <span>K12Learn2Gether</span>
      </button>
      <div className="header-right"><span className="header-tag">LESS SEARCHING. MORE FINISHING.</span>{record && <button className="text-button" onClick={() => setPage("learning")}>My Learning <span aria-hidden="true">↗</span></button>}</div>
    </header>

    {storageWarning && <div className="storage-warning" role="alert">{storageWarning}</div>}

    <main className={page === "study" ? "study-app-main" : undefined}>
      {page === "landing" && <Landing onStart={goToSetup} />}
      {page === "setup" && <Setup values={setupValues} onChange={setSetupValues} error={setupError} onError={setSetupError} replacing={!!record} onBack={() => setPage(record ? "learning" : "landing")} onStart={startCandidate} />}
      {page === "study" && <StudyWorkspace key={pending?.lesson.playlistId ?? pending?.lesson.videoId ?? record?.lesson.playlistId ?? record?.lesson.videoId ?? "none"} candidate={pending} record={record} storageWarning={storageWarning} onUpdate={onUpdate} onCandidateAccepted={onCandidateAccepted} onCandidateError={(message) => { setSetupError(message); setPending(null); setPage("setup"); }} onExit={() => setPage(record ? "learning" : "setup")} />}
      {page === "learning" && record && <LearningHome record={record} onContinue={() => { setPending(null); setPage("study"); }} onStartAnother={goToSetup} />}
      {page === "recovery" && <section className="recovery section-pad"><p className="eyebrow">LOCAL SAVE NEEDS ATTENTION</p><h1>We couldn’t safely read your saved lesson.</h1><p>Your browser’s saved data may be unavailable or in a format this version cannot read. This page will not overwrite it. Check that site storage is available, then reload. If you changed the host or port, return to the original address.</p><button className="button button-ink" onClick={() => window.location.reload()}>Retry loading</button></section>}
    </main>
    {page !== "study" && <footer className="site-footer"><span>K12Learn2Gether</span><span>One lesson. One goal. Your pace.</span></footer>}
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

function Setup({ values, onChange, error, onError, replacing, onBack, onStart }: { values: SetupValues; onChange: (value: SetupValues) => void; error: string; onError: (value: string) => void; replacing: boolean; onBack: () => void; onStart: (value: PendingLesson) => void }) {
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
    if (replacing && !window.confirm("Replace the current commitment? Its recorded activity will not transfer to this new lesson.")) return;
    onStart({ lesson: parsedLesson.lesson, objective, goalMinutes: goal.minutes });
  }
  return <section className="setup-page section-pad"><div className="setup-heading"><button className="back-link" onClick={onBack}>← Back</button><p className="eyebrow">01 / MAKE A COMMITMENT</p><h1>Start with <em>one good lesson.</em></h1><p>Choose a YouTube lesson or playlist you genuinely want to understand. You can come back to this commitment in the same browser.</p></div><form className="setup-form" onSubmit={submit} noValidate><label htmlFor="lesson-url"><span>01</span> YouTube lesson or playlist URL</label><input id="lesson-url" value={values.url} onChange={(event) => onChange({ ...values, url: event.target.value })} type="url" placeholder="https://www.youtube.com/watch?v=...&list=..." aria-invalid={!!errors.url} aria-describedby={errors.url ? "url-error" : undefined} autoComplete="off" /><p className="field-help">A public, embeddable YouTube video or playlist. We’ll check it before saving your choice.</p>{errors.url && <p className="field-error" id="url-error">{errors.url}</p>}
      <label htmlFor="objective"><span>02</span> What do you want to understand?</label><textarea id="objective" value={values.objective} onChange={(event) => onChange({ ...values, objective: event.target.value })} placeholder="e.g. Solve a quadratic equation without looking at notes" maxLength={180} rows={3} aria-invalid={!!errors.objective} aria-describedby={errors.objective ? "objective-error" : undefined} />{errors.objective && <p className="field-error" id="objective-error">{errors.objective}</p>}
      <fieldset><legend><span>03</span> Choose a focus-time goal</legend><div className="goal-options">{goalOptions.map((option) => <button key={option} type="button" className={values.goal === option ? "goal-option selected" : "goal-option"} onClick={() => onChange({ ...values, goal: option })}>{option}<small>min</small></button>)}<label className="custom-goal">Custom <input type="number" min={5} max={240} step={1} value={goalOptions.includes(values.goal) ? "" : values.goal} onChange={(event) => onChange({ ...values, goal: event.target.value })} placeholder="minutes" aria-label="Custom focus-time goal in minutes" /></label></div><p className="field-help">Choose 5–240 minutes. This is activity time, not video length.</p>{errors.goal && <p className="field-error" id="goal-error">{errors.goal}</p>}</fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-ink setup-submit" type="submit">Start focused study <span aria-hidden="true">↗</span></button><p className="storage-note">Your lesson and activity stay in this browser profile. There’s no account or cloud backup; clearing site data may remove them.</p></form></section>;
}

function LearningHome({ record, onContinue, onStartAnother }: { record: CommitmentRecordV1; onContinue: () => void; onStartAnother: () => void }) {
  return <section className="learning-page section-pad"><p className="eyebrow">YOUR STUDY SPACE</p><h1>My <em>Learning.</em></h1><div className="learning-grid"><div className="learning-card"><span className="pill">{record.lessonStatus === "completed" ? "COMPLETED" : "UNFINISHED"}</span><h2>{record.objective}</h2><p className="lesson-url">{record.lesson.title ?? record.lesson.canonicalUrl}</p><dl><div><dt>Focus-time goal</dt><dd>{record.goalMinutes} min</dd></div><div><dt>Recorded activity</dt><dd>{formatActivity(record.cumulativeRecordedFocusedMs)}</dd></div><div><dt>Saved position</dt><dd>{formatTime(record.lastConfirmedPositionMs)}</dd></div></dl><FocusCup recordedMs={record.cumulativeRecordedFocusedMs} goalMinutes={record.goalMinutes} compact />{record.lessonStatus === "unfinished" && <button className="button button-ink" onClick={onContinue}>Continue Learning <span aria-hidden="true">↗</span></button>}{record.lessonStatus === "completed" && <button className="button button-ink" onClick={onStartAnother}>Start another lesson <span aria-hidden="true">↗</span></button>}<button className="text-button under-card" onClick={onStartAnother}>{record.lessonStatus === "completed" ? "Choose another lesson" : "Replace this lesson"} ↗</button></div><aside className="learning-aside"><span className="aside-mark">✳</span><p>Progress is saved in this browser. Continuing opens the lesson paused, so you decide when to begin again.</p><small>Last confirmed save: {new Date(record.updatedAt).toLocaleString()}</small></aside></div></section>;
}

type SaveResult = { status: "saved"; record: CommitmentRecordV1 } | { status: "not-saved" | "unverified" | "stale" };
type CommitmentPatch = Partial<Omit<CommitmentRecordV1, "schemaVersion" | "revision" | "createdAt" | "updatedAt">>;

function StudyWorkspace({ candidate, record, storageWarning, onUpdate, onCandidateAccepted, onCandidateError, onExit }: {
  candidate: PendingLesson | null;
  record: CommitmentRecordV1 | null;
  storageWarning: string;
  onUpdate: (patch: CommitmentPatch) => SaveResult;
  onCandidateAccepted: (candidate: PendingLesson, lesson: Extract<CandidateResult, { status: "accepted" }>["lesson"]) => CommitmentRecordV1 | null;
  onCandidateError: (message: string) => void;
  onExit: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const adapter = useRef<PlayerAdapter | null>(null);
  const focus = useRef<FocusController | null>(null);
  const localRecord = useRef(record);
  const pendingMs = useRef(0);
  const persistenceBlocked = useRef(false);
  const interrupted = useRef(false);
  const candidatePending = useRef(!!candidate);
  const [state, setState] = useState<PlayerState>("unstarted");
  const [focusState, setFocusState] = useState<FocusState>("confirmed-foreground");
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [needsResume, setNeedsResume] = useState(false);
  const [unsavedMs, setUnsavedMs] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "not-saved" | "unverified" | "stale">("saved");
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<string[]>(record?.lesson.playlistVideoIds ?? []);
  const [currentVideoId, setCurrentVideoId] = useState(record?.lesson.videoId ?? "");
  const [currentTitle, setCurrentTitle] = useState(record?.lesson.title ?? "");
  const [goalInput, setGoalInput] = useState(String(record?.goalMinutes ?? candidate?.goalMinutes ?? 25));
  const lesson = candidate?.lesson ?? record?.lesson;
  const totalMs = (localRecord.current?.cumulativeRecordedFocusedMs ?? 0) + unsavedMs;
  const playlistCount = playlistItems.length;

  useEffect(() => { localRecord.current = record; }, [record]);

  function failPersistence(status: SaveResult["status"]): void {
    if (status === "saved") return;
    persistenceBlocked.current = true;
    setSaveState(status);
    setMessage(status === "stale"
      ? "This commitment changed in another tab. Recording stopped; reload My Learning to reconcile the saved version."
      : status === "unverified"
        ? "The saved state could not be verified. Recording stopped. Reload to reconcile browser storage before continuing."
        : "This progress could not be saved. Recording stopped; unsaved activity is shown separately from the saved total.");
    focus.current?.dispose();
    adapter.current?.pause();
  }

  function savePatch(patch: CommitmentPatch): boolean {
    if (persistenceBlocked.current || storageWarning) return false;
    const result = onUpdate(patch);
    if (result.status !== "saved") { failPersistence(result.status); return false; }
    localRecord.current = result.record;
    setSaveState("saved");
    return true;
  }

  function saveCheckpoint(): void {
    const current = localRecord.current;
    if (!current || persistenceBlocked.current || storageWarning) return;
    const position = adapter.current?.getPositionMs();
    const patch: CommitmentPatch = {
      cumulativeRecordedFocusedMs: current.cumulativeRecordedFocusedMs + pendingMs.current,
      ...(position !== null && position !== undefined ? { lastConfirmedPositionMs: position } : {}),
      ...(interrupted.current ? { sessionStatus: "interrupted" as const } : {}),
    };
    const positionChanged = position !== null && position !== undefined && position !== current.lastConfirmedPositionMs;
    const interruptionChanged = interrupted.current && current.sessionStatus !== "interrupted";
    if (pendingMs.current === 0 && !positionChanged && !interruptionChanged) return;
    setSaveState("saving");
    if (savePatch(patch)) {
      pendingMs.current = 0;
      setUnsavedMs(0);
    }
  }

  function persistCurrentVideo(video: CurrentVideo): void {
    setCurrentVideoId(video.videoId);
    setCurrentTitle(video.title ?? "");
    if (video.playlistVideoIds) setPlaylistItems(video.playlistVideoIds);
    const current = localRecord.current;
    if (!current || current.lesson.videoId === video.videoId && current.lesson.playlistIndex === video.playlistIndex && current.lesson.title === video.title) return;
    const playlistId = current.lesson.playlistId;
    savePatch({ lesson: {
      ...current.lesson,
      videoId: video.videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${video.videoId}${playlistId ? `&list=${playlistId}` : ""}`,
      ...(video.playlistIndex !== undefined ? { playlistIndex: video.playlistIndex } : {}),
      ...(video.playlistVideoIds ? { playlistVideoIds: video.playlistVideoIds } : {}),
      ...(video.title ? { title: video.title } : {}),
    }, lastConfirmedPositionMs: 0 });
  }

  useEffect(() => {
    if (!host.current || !lesson) return;
    let cancelled = false;
    const instance = new PlayerAdapter(host.current, {
      onState: (nextState) => {
        setState(nextState);
        focus.current?.setPlayerState(nextState);
        if (persistenceBlocked.current) {
          if (nextState === "playing") instance.pause();
          return;
        }
        if (nextState === "playing" && localRecord.current && !candidatePending.current && !persistenceBlocked.current) {
          if (localRecord.current.lessonStatus === "completed") {
            instance.pause();
            setNeedsResume(true);
            setMessage("This lesson is marked complete. Start another lesson from My Learning if you want a new commitment.");
            return;
          }
          interrupted.current = false;
          setNeedsResume(false);
          focus.current?.setSessionActive(true);
          if (localRecord.current.sessionStatus !== "active") savePatch({ sessionStatus: "active" });
        }
      },
      onError: (text) => { setMessage(text); focus.current?.setPlayerState("error"); },
      onAutoplayBlocked: () => {
        setBlocked(true);
        setMessage("The lesson is ready, but autoplay was blocked. Press Play inside the YouTube player to begin.");
      },
      onCurrentVideo: persistCurrentVideo,
    });
    adapter.current = instance;
    const controller = new FocusController({
      source: new BrowserFocusSignalSource(() => instance.getIframe()),
      callbacks: {
        onState: (nextFocus, isEligible) => { setFocusState(nextFocus); setEligible(isEligible); },
        onPauseRequested: (reason) => {
          interrupted.current = true;
          setNeedsResume(true);
          setMessage(reason === "hidden" ? "This tab became hidden. The lesson was asked to pause; press Play when you return." : "Browser focus was lost. The lesson was asked to pause; press Play to resume when ready.");
          instance.pause();
        },
        onActivity: (milliseconds) => {
          if (persistenceBlocked.current) return;
          pendingMs.current += milliseconds;
          setUnsavedMs(pendingMs.current);
        },
        onCheckpoint: saveCheckpoint,
      },
    });
    focus.current = controller;
    controller.start();
    if (storageWarning) failPersistence("stale");

    void instance.cueCandidate(lesson).then((result) => {
      if (cancelled) return;
      if (result.status !== "accepted") {
        if (candidate) onCandidateError(result.message);
        else { setMessage(result.message); setLoading(false); }
        return;
      }
      if (candidate) {
        const saved = onCandidateAccepted(candidate, result.lesson);
        if (!saved) return;
        candidatePending.current = false;
        localRecord.current = saved;
        setCurrentVideoId(result.lesson.videoId);
        setCurrentTitle(result.lesson.title ?? "");
        setPlaylistItems(result.lesson.playlistVideoIds ?? []);
        controller.setSessionActive(true);
        if (instance.getState() !== "playing") instance.play();
      } else {
        localRecord.current = record;
        if (record?.lastConfirmedPositionMs) instance.seekTo(record.lastConfirmedPositionMs);
        if (result.lesson.playlistVideoIds) setPlaylistItems(result.lesson.playlistVideoIds);
        setCurrentVideoId(result.lesson.videoId);
        setCurrentTitle(result.lesson.title ?? "");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      saveCheckpoint();
      controller.dispose();
      instance.destroy();
      if (adapter.current === instance) adapter.current = null;
      if (focus.current === controller) focus.current = null;
    };
    // This instance belongs to one stable lesson/playlist host. Updates to counters must not recreate the iframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.playlistId ?? lesson?.videoId]);

  useEffect(() => {
    if (!storageWarning || persistenceBlocked.current) return;
    failPersistence(storageWarning.includes("another tab") ? "stale" : "unverified");
  }, [storageWarning]);

  function resume(): void {
    if (persistenceBlocked.current || localRecord.current?.lessonStatus === "completed") return;
    setBlocked(false);
    setMessage("");
    interrupted.current = false;
    setNeedsResume(false);
    focus.current?.setSessionActive(true);
    adapter.current?.play();
  }

  function finishSession(): void {
    interrupted.current = false;
    adapter.current?.pause();
    focus.current?.setSessionActive(false);
    const position = adapter.current?.getPositionMs();
    savePatch({ sessionStatus: "finished", ...(position !== null && position !== undefined ? { lastConfirmedPositionMs: position } : {}) });
    setNeedsResume(true);
    setMessage("Session finished. Your lesson remains unfinished and is saved in My Learning.");
  }

  function markComplete(): void {
    if (!window.confirm("Mark this lesson complete? This records your choice; it does not measure understanding.")) return;
    interrupted.current = false;
    adapter.current?.pause();
    focus.current?.setSessionActive(false);
    const position = adapter.current?.getPositionMs();
    if (savePatch({ lessonStatus: "completed", sessionStatus: "finished", ...(position !== null && position !== undefined ? { lastConfirmedPositionMs: position } : {}) })) {
      setNeedsResume(false);
      setMessage("Lesson marked complete. This is your self-reported status.");
    }
  }

  function leaveWorkspace(): void {
    interrupted.current = true;
    adapter.current?.pause();
    focus.current?.setSessionActive(false);
    saveCheckpoint();
    onExit();
  }

  function updateGoal(): void {
    const parsed = parseGoalMinutes(goalInput);
    if (!parsed.ok) { setMessage(parsed.message); return; }
    if (savePatch({ goalMinutes: parsed.minutes })) setMessage("Focus-time goal saved. Your recorded activity is unchanged.");
  }

  const isAmbiguous = focusState === "ambiguous-iframe";
  const statusText = isAmbiguous
    ? "Focus can’t be confirmed. Recording is paused; YouTube may still be playing. Recheck, pause in YouTube, or continue without credited time."
    : focusState === "hidden" || focusState === "confirmed-lost"
      ? "Browser focus is not confirmed. No activity is being recorded."
      : !eligible && needsResume
        ? "The lesson is paused after an interruption. Choose Play when you are ready; playback will not resume automatically."
        : eligible ? "Focused activity is recording from confirmed playback and browser signals." : "Activity starts only after YouTube reports that the lesson is playing and focus is confirmed.";
  const actualItems = playlistItems;
  const goalReached = !!localRecord.current && localRecord.current.cumulativeRecordedFocusedMs >= localRecord.current.goalMinutes * 60_000;

  return <section className="study-page">
    <nav className="study-nav" aria-label="Study workspace navigation"><button className="wordmark" onClick={leaveWorkspace}><span className="back-glyph" aria-hidden="true">←</span> My Learning</button><span className="nav-current">{currentTitle || localRecord.current?.lesson.title || "Focused study"}</span><span className="nav-state">{state.toUpperCase()}</span></nav>
    <div className="study-content section-pad">
      <div className="study-grid"><div className="study-main"><div className="player-frame"><div ref={host} className="player-host" /></div>
        {loading && <p className="player-status" role="status">Checking that this YouTube lesson can load…</p>}
        {blocked && <p className="player-status" role="status">Autoplay was blocked. Press Play inside the YouTube player.</p>}
        {message && <p className="form-error" role="status">{message}</p>}
        <p className="player-credit">Video playback provided by YouTube. Its standard controls remain available.</p>
        <div className="player-actions"><button className="button button-ink" disabled={loading || persistenceBlocked.current || localRecord.current?.lessonStatus === "completed"} onClick={resume}>Play / Resume <span aria-hidden="true">▶</span></button><button className="button button-outline" disabled={loading} onClick={() => adapter.current?.pause()}>Pause</button><button className="text-button" onClick={() => { focus.current?.recheckFocus(); }}>Recheck focus</button></div>
        {isAmbiguous && <p className="focus-notice" role="status">This browser’s iframe focus signal is ambiguous. Waiting for a fresh browser signal; the recheck button cannot override it.</p>}
        <div className="playlist-control"><button className="playlist-toggle" aria-expanded={playlistOpen} aria-controls="playlist-panel" disabled={!lesson?.playlistId} onClick={() => setPlaylistOpen((open) => !open)}><span>Playlist · {playlistCount} {playlistCount === 1 ? "lesson" : "lessons"}</span><span aria-hidden="true">{playlistOpen ? "⌃" : "⌄"}</span></button>{lesson?.playlistId && playlistCount === 0 && <p className="field-help">YouTube has not returned playlist entries. The saved video remains available; try the direct video link or reload the playlist.</p>}
          <div id="playlist-panel" className="playlist-panel" aria-label="Playlist videos" hidden={!playlistOpen}>{actualItems.map((videoId, index) => <button key={`${videoId}-${index}`} disabled={persistenceBlocked.current} className={videoId === currentVideoId ? "playlist-item current" : "playlist-item"} aria-current={videoId === currentVideoId ? "true" : undefined} onClick={() => adapter.current?.playVideoAt(index)}><span className="playlist-index">{String(index + 1).padStart(2, "0")}</span><span>{videoId === currentVideoId && currentTitle ? currentTitle : `Video ID ${videoId}`}</span><span aria-hidden="true">{videoId === currentVideoId ? "•" : "↗"}</span></button>)}<p className="playlist-disclosure">YouTube provides real playlist order and video IDs. The IFrame API exposes a title only for the current video, so other entries are identified by their actual IDs.</p></div>
        </div>
      </div>
      <aside className="study-side"><p className="eyebrow">TODAY’S COMMITMENT</p><h2>{candidate?.objective ?? record?.objective}</h2><div className="side-line"><span>Player</span><strong>{state}</strong></div><div className="timer-box"><span>RECORDED ACTIVITY · LIVE</span><strong aria-live="off">{formatActivity(totalMs)}</strong><small>{formatActivity(localRecord.current?.cumulativeRecordedFocusedMs ?? 0)} saved · {formatActivity(unsavedMs)} in this session, not yet saved</small><p>{statusText}</p></div>
        {localRecord.current && <><FocusCup recordedMs={localRecord.current.cumulativeRecordedFocusedMs} goalMinutes={localRecord.current.goalMinutes} compact /><div className="side-line"><span>Focus-time goal</span><strong>{localRecord.current.goalMinutes} min {goalReached ? "· reached" : ""}</strong></div><div className="goal-editor"><label htmlFor="study-goal">Change goal (5–240 min)</label><div><input id="study-goal" type="number" min={5} max={240} step={1} value={goalInput} onChange={(event) => setGoalInput(event.target.value)} /><button className="text-button" disabled={persistenceBlocked.current} onClick={updateGoal}>Save goal</button></div></div></>}
        <div className="save-state" role="status">{saveState === "saved" ? `Saved · revision ${localRecord.current?.revision ?? "—"}` : saveState === "saving" ? "Saving activity…" : saveState === "not-saved" ? "Not saved; activity is in memory" : saveState === "stale" ? "Another tab has newer progress" : "Saved state is unverified"}</div>
        {localRecord.current && <details className="session-actions"><summary>Session actions</summary><div><button className="button button-outline full-width" disabled={persistenceBlocked.current} onClick={finishSession}>Finish session</button>{localRecord.current.lessonStatus !== "completed" && <button className="button button-outline full-width" disabled={persistenceBlocked.current} onClick={markComplete}>Mark lesson complete…</button>}</div></details>}
      </aside></div>
    </div>
  </section>;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
