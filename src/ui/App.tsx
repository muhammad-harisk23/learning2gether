import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { newCommitment, parseObjective, type CommitmentRecordV1 } from "../domain/commitment";
import { parseGoalMinutes } from "../domain/focusGoal";
import { DEFAULT_FOCUS_VESSEL } from "../domain/focusVessel";
import { parseYouTubeUrl, type YouTubeLesson } from "../domain/youtubeUrl";
import { libraryItemId, selectContinueItem, type LibraryItem, type LibraryStateV1 } from "../domain/library";
import { selectShareProgress } from "../domain/shareProgress";
import { LibraryRepository, type LibraryLoadResult, type LibraryWriteResult } from "../services/persistence/libraryRepository";
import { FocusController } from "../services/focus/focusController";
import { BrowserFocusSignalSource, type FocusState } from "../services/focus/focusSignals";
import { PlayerAdapter, type CandidateResult, type CurrentVideo, type PlayerState } from "../services/youtube/playerAdapter";
import { FocusCup, formatActivity } from "./FocusCup";
import { LearningDashboard } from "./LearningDashboard";
import { ShareProgress } from "./ShareProgress";
import { ThemeToggle } from "./ThemeToggle";
import { applyThemePreference, readThemePreference, saveThemePreference, type ThemePreference } from "./themePreference";

type Page = "landing" | "add" | "learning" | "study" | "privacy" | "recovery";
type StudyExitDestination = "home" | "learning" | "privacy";
type SetupValues = { url: string; title: string; subject: string; objective: string; goal: string };
type PendingLesson = { lesson: YouTubeLesson; title: string; subject: string; objective: string; goalMinutes: number };
const emptySetup: SetupValues = { url: "", title: "", subject: "", objective: "", goal: "25" };

export function App() {
  const repository = useRef(new LibraryRepository()).current;
  const [loaded] = useState<LibraryLoadResult>(() => repository.load());
  const [library, setLibrary] = useState<LibraryStateV1 | null>(loaded.status === "empty" || loaded.status === "valid" ? loaded.state : null);
  const libraryRef = useRef(library);
  const [activeItemId, setActiveItemId] = useState<string | null>(() => loaded.status === "empty" || loaded.status === "valid"
    ? loaded.state.selectedItemId ?? selectContinueItem(loaded.state.items)?.id ?? null
    : null);
  const activeItem = library?.items.find((item) => item.id === activeItemId) ?? null;
  const record = activeItem?.commitment ?? null;
  const continueItem = library ? selectContinueItem(library.items) : null;
  const [page, setPage] = useState<Page>(loaded.status === "empty" || loaded.status === "valid" ? "landing" : "recovery");
  const setupOrigin = useRef<"landing" | "learning">("learning");
  const studyNavigation = useRef<((destination: StudyExitDestination) => void) | null>(null);
  const pendingHomeSection = useRef<string | null>(null);
  const [setupValues, setSetupValues] = useState<SetupValues>(emptySetup);
  const [setupError, setSetupError] = useState("");
  const [pending, setPending] = useState<PendingLesson | null>(null);
  const [storageWarning, setStorageWarning] = useState("");
  const [theme, setTheme] = useState<ThemePreference>(() => readThemePreference());

  useEffect(() => { applyThemePreference(theme); }, [theme]);

  useEffect(() => repository.watch((status) => {
    setStorageWarning(status === "stale"
      ? "Your library changed in another tab. Activity and saving are stopped here. Reload this page to see the latest library. Use one active study tab."
      : "Saved progress could not be verified. Activity and saving are stopped. Reload when browser storage is available.");
  }), [repository]);

  useEffect(() => { libraryRef.current = library; }, [library]);

  const initialRecord = loaded.status === "valid" ? loaded.state.items.find((item) => item.id === loaded.state.selectedItemId)?.commitment : null;
  const initialItemId = loaded.status === "valid" ? loaded.state.selectedItemId : null;
  const bootHandled = useRef(false);

  useEffect(() => {
    if (page === "landing" && pendingHomeSection.current) {
      const section = pendingHomeSection.current;
      pendingHomeSection.current = null;
      const frame = window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    if (bootHandled.current) return;
    bootHandled.current = true;
    const current = initialRecord;
    if (!current || current.sessionStatus !== "active" || !initialItemId) return;
    const interruptedRecord = { ...current, revision: current.revision + 1, sessionStatus: "interrupted" as const, updatedAt: new Date().toISOString() };
    const result = repository.updateCommitment(initialItemId, interruptedRecord);
    handleLibraryWrite(result, setLibrary, libraryRef, setStorageWarning);
  }, [repository, initialRecord, initialItemId]);

  function goToSetup(origin: "landing" | "learning" = "learning") {
    setupOrigin.current = origin;
    setSetupError("");
    setSetupValues(emptySetup);
    setPage("add");
  }

  function startCandidate(candidate: PendingLesson) {
    const id = candidate.lesson.playlistId
      ? `playlist:${candidate.lesson.playlistId}`
      : candidate.lesson.videoId ? `video:${candidate.lesson.videoId}` : null;
    if (id && libraryRef.current?.items.some((item) => item.id === id)) {
      setSetupError("That video or playlist is already in your library. Open the saved item instead of adding a duplicate.");
      return;
    }
    setPending(candidate);
    setSetupError("");
    setPage("study");
  }

  function onCandidateAccepted(candidate: PendingLesson, lesson: Extract<CandidateResult, { status: "accepted" }>["lesson"]): CommitmentRecordV1 | null {
    const next = newCommitment(lesson, candidate.objective, candidate.goalMinutes);
    const item: LibraryItem = {
      id: libraryItemId(lesson),
      title: candidate.title,
      subject: candidate.subject,
      sourceType: lesson.playlistId ? "playlist" : "video",
      commitment: next,
    };
    const result = repository.addItem(item);
    if (result.status === "duplicate") {
      setPending(null);
      setSetupError("That video or playlist is already in your library. Open the saved item instead of adding a duplicate.");
      setPage("learning");
      return null;
    }
    if (result.status === "saved") {
      libraryRef.current = result.state;
      setLibrary(result.state);
      setActiveItemId(item.id);
      setPending(null);
      return next;
    }
    setStorageWarning(result.status === "unverified" ? "Saved state is unverified. Reload to reconcile storage before studying." :
      result.status === "stale" ? "Another tab changed this lesson. Reload to see the latest saved record." : "The lesson could not be saved. Check browser storage and retry.");
    setSetupError("The lesson loaded, but its commitment could not be confirmed in this browser. Your setup is still here.");
    setPage("add");
    return null;
  }

  function onUpdate(itemId: string, patch: Partial<Omit<CommitmentRecordV1, "schemaVersion" | "revision" | "createdAt" | "updatedAt">>) {
    const current = libraryRef.current?.items.find((item) => item.id === itemId)?.commitment;
    if (!current) return { status: "not-saved" as const };
    const next: CommitmentRecordV1 = {
      ...current,
      ...patch,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    const result = repository.updateCommitment(itemId, next);
    handleLibraryWrite(result, setLibrary, libraryRef, setStorageWarning);
    return result.status === "saved" ? { status: result.status, record: next } : { status: result.status === "duplicate" ? "not-saved" : result.status };
  }

  function openItem(item: LibraryItem): void {
    const result = repository.selectItem(item.id);
    if (result.status !== "saved") {
      setStorageWarning(libraryWriteMessage(result.status));
      return;
    }
    libraryRef.current = result.state;
    setLibrary(result.state);
    setActiveItemId(item.id);
    setPending(null);
    setPage("study");
  }

  function navigateTo(destination: StudyExitDestination): void {
    pendingHomeSection.current = null;
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    if (page === "study") {
      studyNavigation.current?.(destination);
      return;
    }
    const nextPage = destination === "home" ? "landing" : destination;
    if (nextPage === page) window.scrollTo({ top: 0 });
    else setPage(nextPage);
  }

  function navigateToHomeSection(event: MouseEvent<HTMLAnchorElement>, section: string): void {
    if (page === "landing") return;
    event.preventDefault();
    pendingHomeSection.current = section;
    if (page === "study") studyNavigation.current?.("home");
    else setPage("landing");
  }

  function changeTheme(nextTheme: ThemePreference): boolean {
    applyThemePreference(nextTheme);
    setTheme(nextTheme);
    return saveThemePreference(nextTheme);
  }

  const workspaceItemId = pending
    ? pending.lesson.playlistId ? `playlist:${pending.lesson.playlistId}` : pending.lesson.videoId ? `video:${pending.lesson.videoId}` : null
    : activeItemId;

  return <div className={page === "study" ? "app-shell study-mode" : "app-shell"}>
    <SiteNavigation page={page} theme={theme} onThemeChange={changeTheme} onNavigate={navigateTo} onSectionNavigate={navigateToHomeSection} />

    {storageWarning && <div className="storage-warning" role="alert">{storageWarning}</div>}

    <main className={page === "study" ? "study-app-main" : undefined}>
      {page === "landing" && <Landing record={continueItem?.commitment ?? null} onStart={() => goToSetup("landing")} onContinue={() => continueItem && openItem(continueItem)} onMyLearning={() => navigateTo("learning")} />}
      {page === "add" && <Setup values={setupValues} onChange={setSetupValues} error={setupError} onError={setSetupError} onBack={() => setPage(setupOrigin.current)} onStart={startCandidate} />}
      {page === "study" && workspaceItemId && <StudyWorkspace key={workspaceItemId} library={library} candidate={pending} item={pending ? null : activeItem} record={pending ? null : record} storageWarning={storageWarning} navigationRef={studyNavigation} onUpdate={(patch) => onUpdate(workspaceItemId, patch)} onCandidateAccepted={onCandidateAccepted} onCandidateError={(message) => { setSetupError(message); setPending(null); setPage("add"); }} onExit={(destination) => { setPending(null); setPage(destination === "home" ? "landing" : destination); }} />}
      {page === "learning" && library && library.items.length > 0 && <LearningDashboard library={library} onAdd={() => goToSetup("learning")} onOpen={openItem} onVesselStyleChange={(item, vesselStyle) => { onUpdate(item.id, { vesselStyle }); }} />}
      {page === "learning" && (!library || library.items.length === 0) && <EmptyLearning onStart={() => goToSetup("learning")} />}
      {page === "privacy" && <PrivacyDataPage origin={window.location.origin} />}
      {page === "recovery" && <section className="recovery section-pad"><p className="eyebrow">LOCAL SAVE NEEDS ATTENTION</p><h1>We couldn’t safely read your saved lesson.</h1><p>Your browser’s saved data may be unavailable or in a format this version cannot read. This page will not overwrite it. Check that site storage is available, then reload. If you changed the host or port, return to the original address.</p><button className="button button-ink" onClick={() => window.location.reload()}>Retry loading</button></section>}
    </main>
    {page !== "study" && <footer className="site-footer"><span>K12Learn2Gether</span><span>One lesson. One goal. Your pace.</span></footer>}
  </div>;
}

function libraryWriteMessage(status: LibraryWriteResult["status"]): string {
  if (status === "stale") return "Your library changed in another tab. Reload My Learning before saving or continuing.";
  if (status === "unverified") return "The browser could not verify this library save. Reload before making more changes.";
  if (status === "duplicate") return "This resource is already in your library.";
  return "The library change was not saved. Your previous saved data remains available.";
}

function handleLibraryWrite(
  result: LibraryWriteResult,
  setLibrary: (library: LibraryStateV1) => void,
  libraryRef: { current: LibraryStateV1 | null },
  setStorageWarning: (warning: string) => void,
): void {
  if (result.status === "saved") {
    libraryRef.current = result.state;
    setLibrary(result.state);
    return;
  }
  setStorageWarning(libraryWriteMessage(result.status));
}

function SiteNavigation({ page, theme, onThemeChange, onNavigate, onSectionNavigate }: {
  page: Page;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => boolean;
  onNavigate: (destination: StudyExitDestination) => void;
  onSectionNavigate: (event: MouseEvent<HTMLAnchorElement>, section: string) => void;
}) {
  return <header className="site-header">
    <a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); onNavigate("home"); }} aria-label="K12Learn2Gether home">
      <span className="wordmark-symbol" aria-hidden="true">K<span>✦</span></span><span>K12Learn2Gether</span>
    </a>
    <nav className="primary-nav" aria-label="Primary navigation">
      <a href="/" aria-current={page === "landing" ? "page" : undefined} onClick={(event) => { event.preventDefault(); onNavigate("home"); }}>Home</a>
      <a href="#problem" onClick={(event) => onSectionNavigate(event, "problem")}>The problem</a>
      <a href="#how-it-works" onClick={(event) => onSectionNavigate(event, "how-it-works")}>How it works</a>
      <a href="#my-learning" aria-current={page === "learning" ? "page" : undefined} onClick={(event) => { event.preventDefault(); onNavigate("learning"); }}>My Learning</a>
      <a href="#privacy-data" aria-current={page === "privacy" ? "page" : undefined} onClick={(event) => { event.preventDefault(); onNavigate("privacy"); }}>Privacy &amp; Data</a>
      <ThemeToggle theme={theme} onChange={onThemeChange} />
    </nav>
  </header>;
}

const learningCycle = [
  ["Exam pressure", "The syllabus feels bigger as the exam date gets closer."],
  ["Search for the best", "A trusted teacher is good, but maybe another roadmap is better."],
  ["Save playlists", "Useful lessons collect faster than study time."],
  ["Watch one or two", "The first videos start well; the next step gets less clear."],
  ["Switch again", "A recommendation or a new plan sends the search back to the start."],
  ["Leave lessons unfinished", "Time goes into switching, while the chosen lesson waits."],
];

function Landing({ record, onStart, onContinue, onMyLearning }: { record: CommitmentRecordV1 | null; onStart: () => void; onContinue: () => void; onMyLearning: () => void }) {
  return <>
    <section className="hero section-pad">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL LEARNING LIBRARY</p><h1>You found a good lesson.<br />{" "}Then the distractions started.</h1><p className="hero-emphasis"><em>Stop searching. Keep going.</em></p><p className="hero-lede">Save the lessons and playlists you trust in one personal library. Come back to your saved position and see eligible recorded focus time toward the goal you chose.</p><div className="hero-actions"><button className="button button-ink" onClick={onStart}>Add a learning resource <span aria-hidden="true">↗</span></button>{record?.lessonStatus === "unfinished" && <button className="button button-lime" onClick={onContinue}>Continue Learning <span aria-hidden="true">↗</span></button>}{record?.lessonStatus === "completed" && <button className="button button-lime" onClick={onMyLearning}>My Learning <span aria-hidden="true">↗</span></button>}<a className="text-link" href="#problem">See the problem <span aria-hidden="true">↓</span></a></div></div>
      <LearningJourneyIllustration />
      <div className="hero-index">01 / THE PROBLEM</div>
    </section>
    <section id="problem" className="story section-pad"><div className="story-intro"><p className="eyebrow">THE LOOP THAT STEALS STUDY TIME</p><h2>Trying to find the perfect resource can quietly replace learning.</h2></div><ol className="cycle" aria-label="A common unfinished-learning cycle">{learningCycle.map(([title, detail], i) => <li className="cycle-step" key={title}><span className="cycle-index">0{i + 1}</span><strong>{title}</strong><p>{detail}</p></li>)}</ol><div className="story-aside">Some students recognize this loop. It is not laziness; it is a hard workflow to escape.</div></section>
    <section className="manifesto section-pad"><p className="eyebrow">WHY CONTINUITY IS HARD</p><h2>Good tools help. <em>Each one still leaves a gap.</em></h2><ul className="tool-gaps"><li><strong>YouTube</strong><span>Has excellent lessons and also discovery paths that can pull attention away from the one chosen.</span></li><li><strong>Playlists</strong><span>Organize videos, but do not create a personal commitment or focused-study workflow.</span></li><li><strong>Generic timers</strong><span>Count elapsed time without knowing whether the lesson is playing or the page is hidden.</span></li><li><strong>Blockers</strong><span>Can restrict access without keeping lesson, goal, and saved progress together.</span></li><li><strong>Separate notes and trackers</strong><span>Can add context switching between the lesson, timer, playlist, and progress record.</span></li></ul><p>These tools can still help; this app focuses on the continuity between choosing one lesson and returning to it.</p></section>
    <section id="how-it-works" className="features section-pad"><div className="features-intro"><p className="eyebrow">A SMALLER, STRONGER START</p><h2>Bring what you already trust. <em>Then stop searching.</em></h2><p className="workflow-intro">Build your learning library from the lessons and playlists you already chose. Come back to them without searching again.</p><button className="button button-lime" onClick={onStart}>Add a learning resource <span aria-hidden="true">↗</span></button></div><div className="feature-grid"><article><span>01 / CHOOSE</span><h3>Save what you already trust.</h3><p>Add the lessons and playlists you've already decided are worth finishing.</p></article><article><span>02 / FOCUS</span><h3>Stay with the lesson.</h3><p>Recorded focus advances only while playback and supported browser-focus signals are eligible.</p></article><article><span>03 / RETURN</span><h3>Pick up exactly where you stopped.</h3><p>Your saved resource and playback position are waiting when you return.</p></article><article><span>04 / SEE IT</span><h3>Make your effort visible.</h3><p>Your Focus Cup, focused time, streak and progress reflect recorded study activity.</p></article></div></section>
    <section className="closing-cta section-pad"><p className="eyebrow">READY WHEN YOU ARE</p><h2>Less searching.<br /><em>More follow-through.</em></h2><button className="button button-ink" onClick={onStart}>Add a learning resource <span aria-hidden="true">↗</span></button></section>
  </>;
}

function LearningJourneyIllustration() {
  const figureRef = useRef<HTMLElement | null>(null);
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<"waiting" | "playing" | "settled">("waiting");
  const [run, setRun] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | null = null;
    const startOnce = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setPhase("playing");
    };
    const applyMotionPreference = () => {
      if (reducedMotion.matches) {
        startedRef.current = true;
        setPhase("settled");
        observer?.disconnect();
      }
    };

    applyMotionPreference();
    reducedMotion.addEventListener("change", applyMotionPreference);
    if (!reducedMotion.matches && figureRef.current) {
      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) {
            startOnce();
            observer?.disconnect();
          }
        }, { threshold: 0.2 });
        observer.observe(figureRef.current);
      } else {
        startOnce();
      }
    }

    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener("change", applyMotionPreference);
    };
  }, []);

  function replayStory() {
    startedRef.current = true;
    setRun((current) => current + 1);
    setPhase("playing");
  }

  return <figure ref={figureRef} className="hero-art" data-story-phase={phase} data-story-run={run} aria-labelledby="journey-illustration-description">
    <figcaption id="journey-illustration-description" className="visually-hidden">Illustrative scenario only: a learner finds a Current Electricity lesson, then gets pulled into teacher comparisons, roadmaps, playlists, and recommendations. The example of 42 minutes searching and 0 minutes learning is not tracked user data. The final card shows a trusted resource, a chosen focus goal, eligible activity, and a saved return point. No live search or learner activity is shown.</figcaption>
    <div key={run} className={`journey-stage${phase === "playing" ? " is-playing" : ""}${phase === "settled" ? " is-settled" : ""}`} aria-hidden="true">
      <svg className="journey-branches" viewBox="0 0 500 500" preserveAspectRatio="none">
        <path d="M108 153 C165 175 209 205 275 240 S345 290 390 365" />
        <path d="M275 240 C245 278 210 315 190 378" />
        <path d="M275 240 C326 220 365 207 421 209" />
        <circle cx="275" cy="240" r="7" />
        <circle cx="390" cy="365" r="6" />
        <circle cx="190" cy="378" r="6" />
        <circle cx="421" cy="209" r="6" />
      </svg>
      <div className="journey-search">
        <span className="journey-label">START WITH SOMETHING YOU WANT TO LEARN</span>
        <div className="discovery-card"><div className="discovery-topline"><span>LESSON SEARCH</span><span className="discovery-status">FOUND</span></div><div className="search-field"><span aria-hidden="true">⌕</span><span className="search-query">Current Electricity</span></div><p>One useful lesson is already here.</p></div>
      </div>
      <div className="journey-choices">
        <div className="choice-heading"><span className="journey-label">MORE WAYS TO CHOOSE</span><strong>10+ paths</strong></div>
        <div className="lesson-choice selected"><span className="choice-number">01</span><span>Current Electricity<br /><small>A lesson that fits</small></span><span className="choice-mark">✓</span></div>
        <div className="lesson-choice"><span className="choice-number">02</span><span>Best physics teacher<br /><small>Compare teachers</small></span><span className="choice-mark">↗</span></div>
        <div className="lesson-choice"><span className="choice-number">03</span><span>Complete playlist<br /><small>Find a better roadmap</small></span><span className="choice-mark">↗</span></div>
      </div>
      <div className="journey-distractions">
        <span className="journey-label">THEN THE SEARCH KEEPS GOING</span>
        <div className="recommendation-rail"><span>Recommended next</span><span>Compare another</span><span>More roadmaps</span></div>
        <span className="distraction-card distraction-one">Best teacher 2026</span>
        <span className="distraction-card distraction-two">Teacher A vs B</span>
        <span className="distraction-card distraction-three">Better course?</span><span className="distraction-card distraction-four">Best one-shot</span><span className="distraction-card distraction-five">New playlist</span>
      </div>
      <span className="journey-pointer" />
      <div className="journey-outcome">
        <span className="journey-label">ILLUSTRATIVE PATTERN · NOT TRACKED</span>
        <strong>42 min searching.<br />0 min learning.</strong>
        <span className="unfinished-goal"><i /> Current Electricity is still waiting.</span>
      </div>
      <div className="journey-workspace" onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setPhase("settled");
      }}>
        <div className="workspace-topline"><span className="workspace-dot" /> YOUR LEARNING LIBRARY</div>
        <strong>Continue where you stopped.</strong>
        <div className="workspace-details"><span>Lesson</span><b>Current Electricity</b></div>
        <div className="workspace-details"><span>Focus goal</span><b>Chosen by you</b></div>
        <div className="workspace-details"><span>Progress</span><b>Eligible focus time</b></div><div className="workspace-details"><span>Return path</span><b>Position saved here</b></div>
      </div>
    </div>
    <div className="journey-static" aria-label="Illustrative story">
      <article><span>01 · FIND</span><strong>A good lesson is here</strong><p>Current Electricity fits what you want to learn.</p></article>
      <article><span>02 · GET PULLED AWAY</span><strong>Search replaces study</strong><p>Teacher comparisons, roadmaps, playlists, and recommendations.</p></article>
      <article><span>03 · SAVE AND RETURN</span><strong>Continue where you stopped</strong><p>Keep the lesson, chosen goal, eligible progress, and return point together.</p></article>
    </div>
    <button className="journey-replay" type="button" onClick={replayStory}><span aria-hidden="true">↻</span> Replay story</button>
    <p className="hero-art-caption">ILLUSTRATIVE SCENARIO · NO LIVE SEARCH OR ACTIVITY</p>
  </figure>;
}

function EmptyLearning({ onStart }: { onStart: () => void }) {
  return <section id="my-learning" className="learning-page section-pad empty-learning"><p className="eyebrow">YOUR PERSONAL LEARNING LIBRARY</p><h1>My <em>Learning.</em></h1><p>Your library is empty. Save the lessons and playlists you already trust. Choose once, then come back here instead of searching again.</p><button className="button button-ink" onClick={onStart}>Add your first lesson <span aria-hidden="true">↗</span></button></section>;
}

function PrivacyDataPage({ origin }: { origin: string }) {
  return <section id="privacy-data" className="privacy-page section-pad">
    <p className="eyebrow">YOUR DATA, PLAINLY EXPLAINED</p><h1>Privacy <em>&amp; Data.</em></h1>
    <p className="privacy-lede">Your learning library and eligible activity history stay in this browser. There is no account or app server for syncing your progress.</p>
    <div className="privacy-list">
      <article><h2>What this browser stores</h2><p>The library can include your resource names and subjects, YouTube video and playlist IDs, current playlist item and available title, learning objective, focus-time goal, Focus Cup style, last confirmed playback position, completion choice, and recorded focused activity. A bounded daily ledger starts when Library V1 records eligible activity; earlier cumulative focus has no recoverable date.</p><p>The library uses browser local storage under <code>k12learn2gether.library.v1</code> for <code>{origin}</code>. Existing commitment data is retained after migration.</p></article>
      <article><h2>Where it stays</h2><p>Local storage belongs to this browser profile and exact site origin. A different browser profile, device, hostname, or port has a separate library; this app does not sync it between them. Anyone with access to this browser profile may be able to view this saved information.</p></article>
      <article><h2>When you use YouTube</h2><p>Starting a lesson loads the YouTube IFrame API and an embedded YouTube player. YouTube/Google may receive requests and handle data under their own services and policies. This app does not control the embedded player's separate network behavior.</p></article>
      <article><h2>Other app connections</h2><p>The current application code has no app backend, account system, analytics integration, or separate external search service. The verified third-party integration is YouTube's IFrame API and embedded player. Your browser and the site host still handle the requests needed to load this app.</p></article>
      <article><h2>Clear this browser's saved progress</h2><p>Use your browser's site-data controls to remove stored data for this exact address: <code>{origin}</code>. Browser menu names vary. Clearing site data can remove the library and its progress; there is no in-app delete control in this proof of concept.</p></article>
    </div>
    <p className="privacy-note">This page describes the current proof of concept, not a formal legal privacy policy. Legal review is needed before public commercial use.</p>
  </section>;
}
function Setup({ values, onChange, error, onError, onBack, onStart }: { values: SetupValues; onChange: (value: SetupValues) => void; error: string; onError: (value: string) => void; onBack: () => void; onStart: (value: PendingLesson) => void }) {
  const [errors, setErrors] = useState<Partial<Record<keyof SetupValues, string>>>({});
  const goalOptions = ["15", "25", "45"];
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsedLesson = parseYouTubeUrl(values.url);
    const objective = parseObjective(values.objective);
    const goal = parseGoalMinutes(values.goal);
    const title = values.title.trim();
    const subject = values.subject.trim();
    const nextErrors = {
      url: parsedLesson.ok ? "" : parsedLesson.message,
      title: title.length >= 1 && title.length <= 120 ? "" : "Enter a resource name up to 120 characters.",
      subject: subject.length >= 1 && subject.length <= 60 ? "" : "Enter a subject up to 60 characters.",
      objective: objective ? "" : "Write a short objective (up to 180 characters).",
      goal: goal.ok ? "" : "Choose a whole number from 5 to 240 minutes.",
    };
    setErrors(nextErrors);
    onError("");
    if (!parsedLesson.ok || !objective || !goal.ok || nextErrors.title || nextErrors.subject) return;
    onStart({ lesson: parsedLesson.lesson, title, subject, objective, goalMinutes: goal.minutes });
  }
  return <section className="setup-page section-pad"><div className="setup-heading"><button className="back-link" onClick={onBack}>← Back</button><p className="eyebrow">ADD TO YOUR LIBRARY</p><h1>Choose something to <em>come back to.</em></h1><p>Save a lesson or playlist you trust. It will stay in this browser alongside your other learning resources.</p></div><form className="setup-form" onSubmit={submit} noValidate><label htmlFor="lesson-url"><span>01</span> YouTube lesson or playlist URL</label><input id="lesson-url" value={values.url} onChange={(event) => onChange({ ...values, url: event.target.value })} type="url" placeholder="https://www.youtube.com/watch?v=...&list=..." aria-invalid={!!errors.url} aria-describedby={errors.url ? "url-error" : undefined} autoComplete="off" /><p className="field-help">A public, embeddable YouTube video or playlist. We’ll check it before saving your choice.</p>{errors.url && <p className="field-error" id="url-error">{errors.url}</p>}
      <label htmlFor="resource-title"><span>02</span> Name this resource</label><input id="resource-title" value={values.title} onChange={(event) => onChange({ ...values, title: event.target.value })} maxLength={120} placeholder="e.g. Current Electricity — finish the chapter" aria-invalid={!!errors.title} aria-describedby={errors.title ? "title-error" : undefined} />{errors.title && <p className="field-error" id="title-error">{errors.title}</p>}
      <label htmlFor="resource-subject"><span>03</span> Subject or category</label><input id="resource-subject" value={values.subject} onChange={(event) => onChange({ ...values, subject: event.target.value })} maxLength={60} placeholder="e.g. Physics or Programming" aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined} />{errors.subject && <p className="field-error" id="subject-error">{errors.subject}</p>}
      <label htmlFor="objective"><span>04</span> What do you want to understand?</label><textarea id="objective" value={values.objective} onChange={(event) => onChange({ ...values, objective: event.target.value })} placeholder="e.g. Solve a quadratic equation without looking at notes" maxLength={180} rows={3} aria-invalid={!!errors.objective} aria-describedby={errors.objective ? "objective-error" : undefined} />{errors.objective && <p className="field-error" id="objective-error">{errors.objective}</p>}
      <fieldset><legend><span>05</span> Choose a focus-time goal</legend><div className="goal-options">{goalOptions.map((option) => <button key={option} type="button" className={values.goal === option ? "goal-option selected" : "goal-option"} onClick={() => onChange({ ...values, goal: option })}>{option}<small>min</small></button>)}<label className="custom-goal">Custom <input type="number" min={5} max={240} step={1} value={goalOptions.includes(values.goal) ? "" : values.goal} onChange={(event) => onChange({ ...values, goal: event.target.value })} placeholder="minutes" aria-label="Custom focus-time goal in minutes" /></label></div><p className="field-help">Choose 5–240 minutes. This is activity time, not video length.</p>{errors.goal && <p className="field-error" id="goal-error">{errors.goal}</p>}</fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-ink setup-submit" type="submit">Add to my library <span aria-hidden="true">↗</span></button><p className="storage-note">Your library and activity stay in this browser profile. There’s no account or cloud backup; clearing site data may remove them.</p></form></section>;
}

type SaveResult = { status: "saved"; record: CommitmentRecordV1 } | { status: "not-saved" | "unverified" | "stale" };
type CommitmentPatch = Partial<Omit<CommitmentRecordV1, "schemaVersion" | "revision" | "createdAt" | "updatedAt">>;

function StudyWorkspace({ library, item, candidate, record, storageWarning, navigationRef, onUpdate, onCandidateAccepted, onCandidateError, onExit }: {
  library: LibraryStateV1 | null;
  item: LibraryItem | null;
  candidate: PendingLesson | null;
  record: CommitmentRecordV1 | null;
  storageWarning: string;
  navigationRef: { current: ((destination: StudyExitDestination) => void) | null };
  onUpdate: (patch: CommitmentPatch) => SaveResult;
  onCandidateAccepted: (candidate: PendingLesson, lesson: Extract<CandidateResult, { status: "accepted" }>["lesson"]) => CommitmentRecordV1 | null;
  onCandidateError: (message: string) => void;
  onExit: (destination: StudyExitDestination) => void;
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
  const [goalEditing, setGoalEditing] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<string[]>(record?.lesson.playlistVideoIds ?? []);
  const [currentVideoId, setCurrentVideoId] = useState(record?.lesson.videoId ?? "");
  const [currentTitle, setCurrentTitle] = useState(record?.lesson.title ?? "");
  const [goalInput, setGoalInput] = useState(String(record?.goalMinutes ?? candidate?.goalMinutes ?? 25));
  const lesson = candidate?.lesson ?? record?.lesson;
  const totalMs = (localRecord.current?.cumulativeRecordedFocusedMs ?? 0) + unsavedMs;
  const playlistCount = playlistItems.length;
  const focusShareData = useMemo(() => library && item ? selectShareProgress(library, item.id) : null, [library, item]);

  useEffect(() => { localRecord.current = record; }, [record]);

  function failPersistence(status: SaveResult["status"]): void {
    if (status === "saved") return;
    persistenceBlocked.current = true;
    setEligible(false);
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

  function leaveWorkspace(destination: StudyExitDestination): void {
    interrupted.current = true;
    adapter.current?.pause();
    focus.current?.setSessionActive(false);
    saveCheckpoint();
    onExit(destination);
  }

  useEffect(() => {
    const navigate = (destination: StudyExitDestination) => leaveWorkspace(destination);
    navigationRef.current = navigate;
    return () => { if (navigationRef.current === navigate) navigationRef.current = null; };
  }, [navigationRef, onExit]);

  function updateGoal(): void {
    const parsed = parseGoalMinutes(goalInput);
    if (!parsed.ok) { setMessage(parsed.message); return; }
    if (savePatch({ goalMinutes: parsed.minutes })) {
      setMessage("Focus-time goal saved. Your recorded activity is unchanged.");
      setGoalEditing(false);
    }
  }

  function cancelGoalEdit(): void {
    setGoalInput(String(localRecord.current?.goalMinutes ?? 25));
    setGoalEditing(false);
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
  const goalReached = !!localRecord.current && totalMs >= localRecord.current.goalMinutes * 60_000;
  const cupActivityLabel = eligible ? "Recording focus" : state === "playing" ? "Focus paused" : needsResume ? "Paused" : "Not recording";

  return <section className="study-page">
    <nav className="study-nav" aria-label="Study workspace navigation"><button className="wordmark" onClick={() => leaveWorkspace("home")}><span className="back-glyph" aria-hidden="true">←</span> Back to Home</button><span className="nav-current">{currentTitle || localRecord.current?.lesson.title || "Focused study"}</span><span className="nav-state">{state.toUpperCase()}</span></nav>
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
      <aside className="study-side"><p className="eyebrow">{item?.subject ?? candidate?.subject ?? "YOUR RESOURCE"}</p><h2>{item?.title ?? candidate?.title ?? record?.objective}</h2><p className="study-objective">{candidate?.objective ?? record?.objective}</p><div className="side-line"><span>Player</span><strong>{state}</strong></div><div className="timer-box"><span>RECORDED ACTIVITY · LIVE</span><strong aria-live="off">{formatActivity(totalMs)}</strong><small>{formatActivity(localRecord.current?.cumulativeRecordedFocusedMs ?? 0)} saved · {formatActivity(unsavedMs)} in this session, not yet saved</small><p>{statusText}</p></div>
        {localRecord.current && <><FocusCup recordedMs={totalMs} goalMinutes={localRecord.current.goalMinutes} compact vesselStyle={localRecord.current.vesselStyle ?? DEFAULT_FOCUS_VESSEL} recording={eligible} activityLabel={cupActivityLabel} onVesselStyleChange={(style) => { savePatch({ vesselStyle: style }); }} /><div className="goal-row"><span>Focus-time goal</span><strong>{localRecord.current.goalMinutes} min {goalReached ? "· reached" : ""}</strong><button className="text-button" type="button" aria-label="Change focus-time goal" aria-expanded={goalEditing} aria-controls="study-goal-editor" onClick={() => goalEditing ? cancelGoalEdit() : setGoalEditing(true)}>{goalEditing ? "Cancel" : "Change"}</button></div>{goalEditing && <div className="goal-editor" id="study-goal-editor"><label htmlFor="study-goal">Change goal (5–240 min)</label><div><input id="study-goal" type="number" min={5} max={240} step={1} value={goalInput} onChange={(event) => setGoalInput(event.target.value)} /><button className="text-button" disabled={persistenceBlocked.current} onClick={updateGoal}>Save goal</button></div></div>}{focusShareData && <div className="side-line study-momentum-line"><span>Today · eligible focus</span><strong>{formatActivity(focusShareData.todayMs)} · {focusShareData.streakDays} {focusShareData.streakDays === 1 ? "day" : "day streak"}</strong></div>}{library && item && <ShareProgress library={library} resourceId={item.id} buttonLabel={goalReached ? "Share goal progress" : "Share progress"} />}</>}
        <div className="save-state" role="status">{saveState === "saved" ? "Saved locally" : saveState === "saving" ? "Saving activity…" : saveState === "not-saved" ? "Not saved; activity is in memory" : saveState === "stale" ? "Another tab has newer progress" : "Saved state is unverified"}</div>
        {localRecord.current && <details className="session-actions"><summary>Session actions</summary><div><button className="button button-outline full-width" disabled={persistenceBlocked.current} onClick={finishSession}>Finish session</button>{localRecord.current.lessonStatus !== "completed" && <button className="button button-outline full-width" disabled={persistenceBlocked.current} onClick={markComplete}>Mark lesson complete…</button>}</div></details>}
      </aside></div>
    </div>
  </section>;
}
