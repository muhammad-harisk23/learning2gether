# K12Learn2Gether

**Less searching. More finishing.**

A student opens YouTube to understand a difficult topic. They find a promising lesson, then recommendations, suggested videos, Shorts, and playlist choices start competing for their attention. They may leave having watched several things without finishing the lesson they meant to study.

That is an illustrative situation, not a research finding or a measured student outcome. K12Learn2Gether explores the gap between finding a useful lesson and staying with that learning path long enough to finish it.

## Why this exists

Free lessons let students learn from teachers and explanations they already trust. The discovery experience around a lesson can also make it easy to keep comparing teachers, roadmaps, and playlists after a student has found something useful.

K12Learn2Gether works with the resource a learner chooses. It does not replace YouTube, teachers, or coaching, and it does not block every recommendation. Its focus is continuity: keep a lesson, a personal goal, recorded activity, and a return point together so the learner has a clearer way back to studying.

A playlist can organize videos, a timer can measure elapsed time, and notes can hold ideas. This proof of concept connects a chosen YouTube resource to a study goal and a saved return path. It only records activity when the player and browser signals meet its eligibility rules; it cannot tell whether someone is paying attention.

## What the app does

- Save multiple YouTube videos or supplied playlists in a personal library. Each resource can have a name, subject, learning objective, and focus-time goal.
- Study one selected resource at a time in a workspace with YouTube's standard embedded player controls.
- For a playlist, view the ordered items and select a video. YouTube provides the actual IDs and order; the app shows a title only when the IFrame API provides one for the current video.
- Record **eligible focused activity** while a study session is active, the player reports that it is playing, the page is visible, and the browser reports the app window is focused. Delayed or unobserved intervals are discarded rather than estimated.
- Save the confirmed playback position, goal, completion choice, and recorded activity locally. Return to an unfinished resource without starting playback automatically.
- View recorded time toward a personal goal in the private Focus Cup. The cup is an activity visualization, not evidence of understanding or lesson completion.
- Finish a study session separately from marking a lesson complete. Completion requires a deliberate learner confirmation and records the learner's choice; it does not claim mastery.
- Review saved resources and local activity summaries in My Learning.

The central design principle is **one chosen lesson, one goal, a clearer path back to learning**. You can keep several resources in the library, while the workspace studies one selected resource at a time.

## What is different about this proof of concept

The product is organized around returning to a chosen learning thread, not around adding another discovery feed or encouraging more clicks. The player remains YouTube's player, and the app uses observed playback and browser-focus signals to decide when activity may be recorded.

Those signals are a limited activity proxy. They do not prove attention, comprehension, or that a student has finished learning. The app does not promise to remove every distraction from YouTube.

## Get started

### Prerequisites

- Node.js 24.15 or later in the 24.x line. The inspected environment used Node.js 24.22.0 and npm 11.19.1; the lockfile includes dependencies with modern Node engine requirements.
- npm, included with Node.js.

### Run locally

```sh
git clone https://github.com/muhammad-harisk23/learning2gether.git
cd learning2gether
npm ci
npm run dev
```

Open the local URL printed by Vite, normally <http://127.0.0.1:5173/>.

No application environment variables, API keys, account setup, or backend service are required. YouTube playback does require an internet connection.

### Build and checks

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run preview
```

`npm test` runs the Vitest unit suite. `npm run test:e2e` runs the Playwright browser suite. On systems that restrict parallel worker processes, run it with one worker:

```sh
npm run test:e2e -- --workers=1
```

`npm run build` type-checks and creates static output in `dist/`; `npm run preview` serves that output locally. A preview hosted on a different hostname or port has a different browser-storage origin.

## How it works

The app is a client-side React and TypeScript application served and built with Vite. [src/main.tsx](src/main.tsx) mounts the application. [src/ui/App.tsx](src/ui/App.tsx) coordinates the Home, setup, My Learning, study, privacy, and recovery views.

The main implementation boundaries are:

- [src/domain/](src/domain) validates YouTube links, focus goals, library items, and progress calculations.
- [src/services/youtube/playerAdapter.ts](src/services/youtube/playerAdapter.ts) and [iframeApi.ts](src/services/youtube/iframeApi.ts) load the official YouTube IFrame API and adapt player events, playlist IDs, playback state, and position checkpoints.
- [src/services/focus/focusController.ts](src/services/focus/focusController.ts) and [focusSignals.ts](src/services/focus/focusSignals.ts) combine player state with browser visibility and focus signals. The controller counts only bounded intervals observed while all eligibility conditions hold.
- [src/services/persistence/libraryRepository.ts](src/services/persistence/libraryRepository.ts) and [libraryCodec.ts](src/services/persistence/libraryCodec.ts) validate and save the library in browser local storage, detect stale cross-tab writes, and can migrate a legacy single-commitment record.
- [src/ui/FocusCup.tsx](src/ui/FocusCup.tsx) renders the activity visualization; [src/ui/LearningDashboard.tsx](src/ui/LearningDashboard.tsx) renders the saved library and local activity summaries.
- [tests/unit/](tests/unit) contains Vitest tests for domain rules, focus accounting, persistence, the player adapter, and presentation preferences. [tests/e2e/](tests/e2e) contains Playwright user-flow tests, including a real YouTube embed smoke test and browser tests that use controlled player fixtures.

## Privacy and data handling

The library is stored in `localStorage` under `k12learn2gether.library.v1`. It may contain resource names and subjects, YouTube video and playlist IDs, playlist order and current item when available, learning objectives, focus goals, playback position, session and learner-reported completion state, recorded focused activity, and a bounded daily activity history. A separate local preference stores the selected light or dark theme. When a library is not present, an older single-commitment record may be copied into the library; the legacy record is retained by the current migration.

Browser storage belongs to the current browser profile and exact site origin. A different browser, profile, device, hostname, or port has a separate library. Reloading at the same origin can restore saved data. There is no in-app delete control; use the browser's site-data settings for that exact address to clear it. Clearing site data removes local progress.

There is no application backend, account system, analytics integration, or separate search service in the current code. Starting a lesson loads YouTube's IFrame API and embedded player. YouTube/Google may receive requests and process data under their own services and policies; the app does not control the embedded player's network behavior. No YouTube Data API key is used.

## Limitations and current boundaries

- Browser focus and player state cannot establish human attention or understanding. Ambiguous focus reports stop activity recording, and in some cases the embedded player may continue until a conclusive browser signal arrives.
- Local progress does not sync across devices or browser profiles. YouTube availability, embedding permissions, playback, and network requests depend on YouTube and an internet connection.
- Accounts, cloud sync, shared study rooms, AI tutoring, resource discovery, and curriculum pathways are outside this proof of concept.
- The current code has evolved beyond the approved [scope](devpost/scope.md) and [PRD](devpost/prd.md): it stores multiple resources and includes date-based activity summaries and a current-streak display, while those planning documents describe a single active commitment and cut streaks. The [technical spec](devpost/spec.md) is marked draft. This README describes the code as implemented; the planning documents still need owner review for alignment.
- The [build checklist](devpost/checklist.md) leaves final learner exploration, final review, and the code tour/app map pending. The manual browser record also lists native focus transitions, live playlist data, and real autoplay-blocked behavior as unverified. Automated test results do not resolve those open checks, so this README does not claim the project is fully submission-ready.

## Project notes and acknowledgements

Project records:

- [Approved scope](devpost/scope.md)
- [Approved PRD](devpost/prd.md)
- [Technical spec](devpost/spec.md)
- [Build checklist](devpost/checklist.md)
- [Manual browser checks](devpost/manual-browser-checks.md)

No current application screenshots or app map are included in the repository, so this README does not present mockups or generated test captures as product screenshots.

Development used the Devpost Learn Skill Pack, tracked in [skills-lock.json](skills-lock.json), along with AI-assisted coding and review. The application itself does not provide AI tutoring or call an AI service. The project uses React, TypeScript, Vite, Vitest, Playwright, and YouTube's IFrame API. Their own licenses and service terms remain applicable; this project's MIT license does not replace them.

## License

This project is licensed under the [MIT License](LICENSE).
