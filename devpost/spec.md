---
doc: spec
status: approved
---

# K12Learn2Gether — Technical Spec

This plan implements the approved solo-first product in `scope.md` and `prd.md`. It does not include accounts, server infrastructure, cloud sync, collaboration, AI tutoring, archives, streaks, or a course library. The earlier Bolt.new application is not an implementation source; this is a fresh codebase.

## How This Works, In Plain Language

The app is a React website served locally by Vite. Four screens explain the problem, collect one lesson and goal, show saved learning, and provide the study workspace. A small set of TypeScript modules holds the rules for what counts as recorded activity, which YouTube links are accepted, and when a commitment can be replaced or completed. The screens call those modules rather than implementing those rules themselves.

The browser keeps one small, versioned JSON record for the current commitment. When the student starts a lesson, the YouTube player adapter loads the video and reports its state. A focus controller combines those player reports with browser visibility and focus signals. It adds time only for short, observed intervals that meet the eligibility rules, then the single persistence service saves the current record. When the student returns later, the app reads that record and restores the player paused at the saved position.

There is no application server or account. `localStorage` is a small, same-origin key/value store the browser keeps across visits. This is simple for one small record, but it is synchronous, can be disabled or cleared, and is not safe from scripts running on the same origin. Anyone using the same browser profile can access its saved learning; “private” means not shared by the product with other students or devices, not protected by an account boundary. The app stores no identity information, does not send objectives or activity totals to YouTube, and must explain that local data can be lost if browser site data is cleared.

The most important limitation is focus detection around a cross-origin iframe. Hidden-page visibility is a strong signal for a tab switch or browser minimization. A visible page can report ambiguous focus when its embedded player is active, including in Firefox. Ambiguous intervals earn no activity, but the player is not paused solely because of an ambiguous signal. Where the browser reports a confirmed focus loss, playback is paused and the student must resume deliberately. The app cannot promise perfect detection when browser signals do not distinguish an iframe focus change from an operating-system app switch.

The main tradeoff is keeping this as a browser-only, one-commitment product. That avoids accounts, services, and setup cost, while making browser support, local storage, and actual YouTube behavior important verification boundaries.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. **Home and entry:** `App` reads the commitment repository. An empty or valid store opens the editorial Home; a valid record adds contextual Continue Learning and My Learning actions. My Learning opens the saved commitment dashboard, and Continue Learning opens the lesson paused. A corrupt or inaccessible store routes to a clear recovery state without overwriting its contents.
2. **Setup:** the student enters a YouTube URL, objective, and goal. `youtubeUrl.ts` extracts a video ID only from approved YouTube hosts and paths. `focusGoal.ts` validates a whole-number goal from 5–240 minutes.
3. **Candidate load:** `StudyCoordinator` creates one player through `YouTubePlayerAdapter`. The current saved commitment remains unchanged while the candidate is being checked. `onReady` means the player API can receive commands; it does not prove that the selected video is embeddable. The adapter observes video-specific state or error events. A candidate is not committed on API readiness alone. A failed candidate is destroyed, setup values remain, and the previous commitment is reloaded from the unchanged saved record.
4. **First playback:** after a candidate has loaded without a player error, the app commits its lesson, objective, and goal through `CommitmentRepository`. Because the student explicitly pressed Start, it attempts playback once. If the browser blocks scripted playback, the app remains paused and shows the approved manual-play instruction. Neither readiness nor the Start click itself adds activity.
5. **Eligible playback:** YouTube state events, browser visibility/focus signals, and a bounded monotonic clock feed `FocusController`. It records time only while the player reports `PLAYING`, the page is visible, and focus is confirmed. Paused, buffering, ended, errored, hidden, confirmed-unfocused, ambiguous, and stale/suspended intervals add no time. Activity and position checkpoints go through the repository.
6. **Interruption and return:** hidden visibility or independently confirmed focus loss closes the eligible interval, pauses the local player where supported, checkpoints the last confirmed position, and marks the session interrupted. Returning never calls `playVideo`; a deliberate user action is required. Ambiguous iframe-focus signals stop credit but do not, on their own, interrupt playback.
7. **Finish or complete:** **Finish session** ends only this study period, pauses, checkpoints, and leaves the commitment unfinished. **Mark Lesson Complete** opens a confirmation; confirming ends the period, pauses, checkpoints, and sets the learner-reported completion status. Goal attainment, playback reaching the end, or a session finish never changes lesson status.
8. **Continue:** `MyLearningPage` shows the saved goal, cumulative recorded focused activity, remaining time, saved position, lesson status, and Focus Cup. Continue creates a new study period, loads paused at the saved position, and does not add time until eligible playback is observed.

## Stack

- **React + TypeScript + Vite — learner-approved.** React renders the four approved experiences; TypeScript strict checking covers domain records, player events, session state, and focus accounting; Vite serves development and produces the static build. The repo currently has no application scaffold. The installed environment reports Node `v24.22.0` and npm `11.19.1`; the generated lockfile will record exact dependency versions during `5-build`.
- **Plain CSS and inline SVG — learner-approved direction.** Use project CSS tokens and small original SVG/CSS components for the editorial cycle and Focus Cup. No Three.js, CSS framework, icon pack, animation package, or external font is required for the POC.
- **Vitest — learner-approved.** Use its fake timers for deterministic domain/controller tests with an injected clock and controllable player adapter. Keep most tests DOM-free.
- **Playwright Test with Chromium — learner-approved.** Use it for application flows, responsive layouts, keyboard interactions, persistence across reload, and test-driven browser-signal transitions. Playwright documents that pages in one context behave as focused pages, so multiple pages do not prove actual desktop focus loss. Do not claim those tests validate operating-system minimization or real iframe behavior.
- **No client router or state library.** Four view states and a small explicit coordinator are enough; browser history routing, Redux-like state, and a server are not justified by the approved flow.
- **No runtime schema library by default.** Use small explicit TypeScript decoding/validation functions for the single persisted record. Add a dependency only if implementation demonstrates a concrete gap.

Versions and Node compatibility must be checked when scaffolding. Vite transpiles TypeScript but does not type-check it, so `npm run typecheck` is a separate required command. The current Vitest guide lists Node `22.12+` and Vite `6.4+` as prerequisites; the installed Node is above that minimum. Recheck current compatibility and use a committed `package-lock.json` rather than relying on unpinned installs.

Documentation:

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vite.dev/guide/)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Pages](https://playwright.dev/docs/pages)
- [Playwright Test](https://playwright.dev/docs/intro)

## Where It Runs and How Someone Tries It

- **Development and demo:** Windows, PowerShell, Node.js `v24.22.0`, npm `11.19.1`; run `npm install`, then `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`, and open exactly `http://127.0.0.1:5173`. This host and port are the canonical origin for local progress and the demo. Do not use `file://`, where browser storage behavior is not defined consistently.
- **Checks:** `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Configure Playwright's local app `baseURL` as `http://127.0.0.1:5173` and start the same strict-host/port Vite command for browser tests. The Playwright command may need its Chromium browser installed once with `npx playwright install chromium`.
- **Production preview:** `npm run build` creates static assets; `npm run preview` serves that build locally for a final check. A preview on another port has a different origin and therefore a separate browser-local record. Deployment is optional and is not required to record the Devpost demo.
- **Demo:** record the local application. Start on the problem-focused landing page, then move quickly through setup, actual YouTube playback, a genuine focus interruption, saved Continue Learning state, Focus Cup, and the explicit completion distinction. Use no seeded or accelerated activity. The public GitHub repository and short demo video remain required for submission; deployment does not replace the video.
- **External network:** load the YouTube IFrame API only when the student begins a lesson, not on the landing page. The real lesson and API require internet access. An unavailable, unembeddable, or blocked video must show a recoverable error. No credentials or API key are needed for the selected IFrame API use.

## Look and Feel

Implements `prd.md > Screens and Layout`, `prd.md > Look and Feel`, and `scope.md > Inspiration & Identity`.

- Warm white `#FAF9F5`, electric lime `#D9F525`, soft pink `#F8C7D9`, and rich ink black. Define these as CSS custom properties in one token file.
- Editorial headlines use a restrained serif/system display pairing; body copy and controls use a highly readable system sans stack. Avoid downloading fonts as a runtime dependency.
- Use generous whitespace, deliberate type scale, and a strong lesson-first workspace hierarchy. The landing story uses a composed Search → Compare → Save → Start → Switch → Repeat illustration that remains understandable without motion.
- The Focus Cup is an original inline SVG/CSS illustration with shaded rim/body and a clipping path or mask for a fluid fill. The fill is derived only from cumulative recorded activity divided by the current goal, capped at 100%; exact time and goal labels remain visible separately. Respect `prefers-reduced-motion`; no confetti, rewards, or animation required to interpret progress.
- Keep YouTube attribution, standard controls, and branding intact. Do not cover the iframe with decorative layers or attempt to access its cross-origin DOM.
- Layouts are designed for mobile and desktop from the same screens, with a readable single-column narrative on narrow widths and the player dominant on desktop. Keyboard focus, text labels, error contrast, and reduced-motion behavior are part of acceptance.

## Components

### App shell and entry coordinator

Loads the single saved commitment, opens Home for both first-time and returning students, and uses storage-recovery view only for invalid or inaccessible data. My Learning remains a separate dashboard destination. The Home Continue Learning action opens the saved unfinished commitment paused. Setup remembers whether it was opened from Home or My Learning so Back returns to the originating view. Leaving Study Workspace for Home, My Learning, or Privacy & Data checkpoints and interrupts the session without finishing or replacing the commitment.

`SiteNavigation` is shared across every view and provides Home, The problem, How it works, My Learning, and Privacy & Data. From non-Home views, section links route back to Home and scroll to the requested section; leaving Study uses the established safe checkpoint path. `PrivacyDataPage` is informational and reads the current origin to explain the existing browser-local record and verified third-party boundary. It adds no persistence behavior or app service.

Implements `prd.md > Home, saved-return, and entry`, `prd.md > My Learning and commitment continuity`, and `prd.md > States and Boundaries`.

### Editorial landing page

Presents the specific student problem, unfinished-learning cycle, fair limitations of fragmented tools, actual focus-and-continuity workflow, four current capabilities, and contextual CTA destinations. A CSS animated, illustrative journey shows a lesson search, choices, competing distractions, and the focused workspace; labels state that the example is not a live search or activity record. Reduced motion presents the same stages as a static readable sequence. It contains no fake stats, testimonials, feature claims, or invented student progress. “See how it works” scrolls to the explanation; Start opens Setup; Continue Learning opens the saved unfinished lesson paused; My Learning opens the separate dashboard.

Implements `prd.md > Screens and Layout > Home — editorial landing page` and `prd.md > Home, saved-return, and entry`.

### Focused Setup view

Collects one YouTube video or playlist URL, short objective, and 15/25/45 or custom 5–240 minute goal. It preserves entered values and displays accessible inline validation. Candidate loading keeps the old commitment persisted until a video-specific candidate confirmation and confirmed storage write.

Implements `prd.md > Screens and Layout > Focused Setup view — first commitment or intentional replacement` and `prd.md > Setup and candidate lesson loading`.

### My Learning view

Shows the single current commitment, objective, last confirmed position, cumulative recorded focused activity, chosen goal, time remaining, lesson status, Focus Cup, and the appropriate Continue Learning or Start another lesson action. It is opened only through the distinct My Learning navigation action; it is not the Home route. A goal edit changes the target but not accumulated activity. No archive UI is rendered.

Implements `prd.md > Screens and Layout > My Learning — saved commitment dashboard` and `prd.md > My Learning and commitment continuity`.

### Study workspace

`StudyWorkspace` in `src/ui/App.tsx` keeps the standard YouTube player prominent, displays the objective and progress context, and provides a sticky Back to Home action plus the shared navigation, Play/Resume, Pause, Recheck focus, Finish session, and separately confirmed Mark Lesson Complete. Leaving for Home, My Learning, or Privacy & Data checkpoints and interrupts without finishing the commitment. Its playlist toggle sits above the player and opens the existing overlay without changing player or progress layout; it shows YouTube's returned item count and actual ordered IDs, with the current returned title when available. Session actions remain in a native collapsed disclosure with a visible expanded/collapsed indicator. Selecting a playlist item updates the same commitment and retains accumulated activity. The live timer updates at second-level precision; saved and session-only activity are labeled separately. The SVG/CSS Focus Cup uses the last confirmed persisted activity and current goal. It renders player/loading/autoplay/focus/storage/error/goal-reached states without obscuring YouTube controls.

Implements `prd.md > Screens and Layout > Focused study workspace`, `prd.md > Focused study, activity, goal reached, and session finish`, and `prd.md > States and Boundaries`.

### Commitment domain and goal calculations

`src/domain/commitment.ts` defines commitment/session types and objective rules; `src/domain/focusGoal.ts` validates goals and calculates remainder/Cup fill; `src/domain/focusVessel.ts` defines the validated vessel preference, default, and goal-transition rule. The App coordinates transitions through the single `CommitmentRepository`; it does not read or write `localStorage` directly.

Implements `prd.md > Setup and candidate lesson loading` and `prd.md > My Learning and commitment continuity`.

### YouTube URL parser

Uses the platform `URL` parser and accepts HTTPS URLs only from `youtube.com`, `www.youtube.com`, `m.youtube.com`, and `youtu.be`. It supports video URLs at `/watch?v=...`, `/embed/{id}`, `/shorts/{id}`, `/live/{id}`, and `youtu.be/{id}`, including watch links that also contain `list`; it also accepts standard `/playlist?list=...` links. It validates 11-character video IDs and bounded playlist IDs, rejects lookalike domains, userinfo, unsupported paths, repeated/malformed IDs, and non-HTTPS schemes, and never creates an iframe URL from raw user input. The parser preserves the playlist ID while the player resolves a playlist-only URL to a real first item. It produces a canonical URL retaining both video and playlist IDs when applicable.

Implements `prd.md > Setup and candidate lesson loading` and `prd.md > YouTube error recovery and local persistence`.

### YouTube API loader and player adapter

Loads `https://www.youtube.com/iframe_api` through one shared loader promise and installs one `onYouTubeIframeAPIReady` callback. A typed adapter owns player creation, readiness, video-specific state/error events, play, pause, seek/position reads, playlist cue/select, current playlist IDs/index/title reads, and `destroy()` cleanup. `onReady` means the API is ready; a candidate is saved only after a video-specific `CUED` or `PLAYING` state confirms the requested item and required playlist IDs are returned. The playlist panel uses actual ordered IDs and the API-reported current title; the IFrame API does not return titles for every queued item, so other entries display their actual IDs. No YouTube Data API key or metadata service is added. React never accesses the YouTube iframe's internal DOM. A stable player host/ref prevents ordinary React rerenders from constructing another player; teardown removes callbacks and the iframe, and late events from a destroyed instance are ignored.

Map IFrame API state values to `unstarted`, `ended`, `playing`, `paused`, `buffering`, and `cued`; map `onError` codes 2, 5, 100, 101/150, and 153 to clear recoverable states. Treat `onAutoplayBlocked` as a browser playback restriction, not a video error. Keep controls enabled and include the host page `origin` in the API player parameters. The current API reference documents player lifecycle, state and error events, `onAutoplayBlocked`, current-time reads, and `destroy()`.

**Candidate loading:** player `onReady` proves only that the API can accept commands. After readiness, cue the candidate and wait for a candidate-specific `CUED` or `PLAYING` state with no candidate error; that confirms the player accepted this video for use, not that it will remain available or that playback has started. `onAutoplayBlocked` alone is not evidence that the video loaded; it can qualify only after a successful candidate-specific cue/state was observed. If no candidate-specific state or error arrives within 20 seconds of cueing, stop waiting and report “Couldn’t confirm this video loaded. Retry or cancel”; this is a timeout, not a claim that the video is unavailable. On an error, timeout, or explicit cancel before candidate acceptance, destroy the candidate and keep the old record byte-for-byte untouched; re-create the previous player paused at its saved position if the study view needs to return. After candidate acceptance, validate and write the new commitment, then confirm persistence before treating it as current. Only then make one playback attempt because the student explicitly pressed Start. If autoplay is blocked, keep the accepted commitment saved and paused, show a manual Play instruction, and add no time until `PLAYING` is observed. If the write is definitely rejected, keep the previous confirmed record authoritative, stop/destroy the candidate, and retain setup values for retry. If the write outcome is unverified, stop/destroy the candidate and reconcile storage before claiming which commitment is saved; do not retry the replacement blindly. A later YouTube/network failure after confirmed acceptance is a playback error on the current commitment; stop time, preserve the last confirmed saved progress, and offer retry or an intentional new candidate. Availability cannot be guaranteed before an attempt.

Implements `prd.md > Setup and candidate lesson loading`, `prd.md > YouTube error recovery and local persistence`, and `prd.md > Focused study, activity, goal reached, and session finish`.

### Browser focus signal source

Subscribes to `document.visibilitychange`, `window.focus`, and `window.blur`, and exposes `visibilityState`, `document.hasFocus()`, and whether the app's player iframe is the active element as raw signals to the controller. A raw `blur` is never itself a pause command. `document.activeElement === iframe` is used only to flag an ambiguous iframe-focus case; it is never treated as proof that the browser window remains foregrounded.

Focus states are `confirmed-foreground`, `confirmed-lost`, `hidden`, and `ambiguous-iframe`:

- `visibilityState === "hidden"` is a confirmed interruption (tab switch, minimization, or another browser-hidden condition): stop credit immediately, request pause, checkpoint, and require an explicit resume after return.
- When visible, a focus recheck with `document.hasFocus() === true` can confirm foreground eligibility, including a focused child document on browsers that report it correctly.
- A blur is followed by a recheck, not automatic pause. If the browser reports `hasFocus() === false` while the player iframe is the active element, enter `ambiguous-iframe`: stop credit immediately, do not pause solely from this combination, and wait for a conclusive visibility/focus signal. Active-element identity is not proof of foreground focus.
- When the page is visible, focus is false, and the active element is not the player iframe, treat the browser-reported focus loss as confirmed: stop credit, request pause, checkpoint, and require explicit resume.
- On return from a confirmed interruption, do not call `playVideo`; only the student's explicit Play/Resume gesture may start playback again.

This conservative rule may undercount while a Firefox iframe-focus report is ambiguous. If switching to another desktop app while the YouTube iframe remains active produces the same ambiguous signals, the app cannot safely distinguish that state from an iframe interaction using portable browser APIs. In that case it stops counting, but cannot promise to pause until the browser provides a confirmed signal. This limitation must be stated honestly; no grace period may credit ambiguous time. Manual checks on actual Chromium and Firefox builds determine the observed behavior and the demo's supported-browser claim.

#### Guarantees versus browser-dependent behavior

- **Guaranteed by app logic when the corresponding signal is delivered:** non-playing player states, hidden visibility, confirmed focus loss, and ambiguous focus states add no activity; the controller requests pause on hidden or confirmed loss; returning from a confirmed interruption never triggers playback; stale timer gaps are discarded.
- **Dependent on the browser or YouTube:** whether an OS app switch is exposed as a conclusive focus signal while the cross-origin player iframe remains active; whether a requested player pause takes effect immediately; whether a video is actually embeddable/available; autoplay permission; event timing during buffering or browser suspension.
- Where those signals are indistinguishable, behavior is explicitly ambiguous: stop crediting time and do not assert that playback was paused. Report the real Chromium and Firefox results in the manual checklist rather than claiming universal focus verification.

#### Ambiguous-focus experience and recovery

An ambiguous state can persist for as long as the browser keeps reporting visible + `hasFocus() === false` while the YouTube iframe remains active. In that case recorded activity can remain stopped indefinitely even while the student is genuinely watching or using YouTube controls. The workspace must say this plainly (for example, “Focus can’t be confirmed. Activity recording is paused; YouTube may still be playing.”), keep the player usable, and expose a **Recheck focus** action in app chrome outside the iframe. The action takes a fresh signal snapshot; it never overrides a false or ambiguous browser report. If the page is visible and focus becomes confirmed, start a new accounting baseline and resume credit only on later eligible samples. If focus remains ambiguous, keep recording stopped and leave playback alone; the student may keep watching without credit, pause using YouTube controls, finish the session, or leave and return. Returning or rechecking never starts playback. There is no timeout that converts ambiguity to confirmed focus and no claim that this fallback proves attention or foreground state. A browser that never provides a resolving signal may therefore undercount the whole remaining session. Manual Chromium/Firefox checks record whether the recheck action resolves the observed case; browser compatibility claims are limited to tested versions and observed signals.

Implements `prd.md > Focused study, activity, goal reached, and session finish` and the iframe-focus acceptance criteria.

### Focus controller and activity accounting

Combines normalized player state with focus-source state. Accrual is eligible only when session is active, player state is `playing`, page visibility is `visible`, and focus state is `confirmed-foreground`. Any buffering, paused, ended, error, hidden, confirmed-lost, or ambiguous state makes the interval ineligible. The controller owns exactly one timer and is idempotent across start/stop/dispose calls. Recheck focus samples the browser signals anew; it cannot set focus to confirmed itself. Re-entering eligibility establishes a new baseline, so no ambiguous or recovery interval is retroactively counted.

Use `performance.now()` for elapsed time because it is monotonic; do not derive focus time from wall-clock time or YouTube playback position. One controller owns one scheduler; duplicate `start` calls do not create another timer, and `stop`/`dispose` are idempotent. Each timer callback takes one sample and advances the baseline exactly once. Normalize and deduplicate repeated player/focus events: if an event reports the already-current state, it does not close, reopen, or add an interval. On a real eligibility transition, discard the unobserved time since the prior sample and clear the baseline; the next eligible sample establishes a fresh baseline without credit.

Sample at a bounded interval (nominally 500 ms). Add a delta only when both adjacent samples are eligible, the session and player still report active/playing, the monotonic clock is finite and nondecreasing, and `0 < delta <= 1.5 seconds`. Advance the baseline once whether the delta is accepted or rejected, so a stale interval cannot be retried or counted later. If the page is suspended, callbacks are delayed beyond 1.5 seconds, the clock moves unexpectedly, or a tick is duplicated, discard that interval; never substitute wall-clock time, timer count, playback position, or a later callback to fill the gap. A visibility/focus/player transition closes eligibility at the last completed sample and discards the unobserved remainder conservatively. Never carry a running timestamp across reload. Use the IFrame API's `getCurrentTime()` only for position checkpoints, not focus duration. Thus only repeated, bounded observations can add activity; wall-clock passage by itself cannot.

Checkpoint eligible time every 5 seconds and immediately on player/focus/session/completion transitions. Poll the player's position at the same checkpoint cadence while playing and save the newest finite, nonnegative position. Timer display may update at a lower, accessible cadence without announcing every tick. A goal change recalculates `min(recordedFocusedMs / goalMs, 1)` and `max(goalMs - recordedFocusedMs, 0)` without altering accumulated time. Goal reach does not change player, session, or lesson state.

Implements `prd.md > Focused study, activity, goal reached, and session finish`, `prd.md > My Learning and commitment continuity`, and `prd.md > Look and Feel`.

### Commitment repository and runtime validation

The only module allowed to read/write the authoritative local record. Use key `k12learn2gether.commitment` with a JSON envelope containing `schemaVersion: 1`, monotonically increasing `revision`, and a validated commitment. Before writing, validate all fields and ranges and serialize to one string. Compare the current stored raw value and decoded revision with this tab's last confirmed value (or expected absence for a first commitment); if they differ, do not call `setItem`. Otherwise call `setItem` once. Report **persisted** only if it returns successfully and an immediate `getItem` returns the exact serialized value, which also decodes and validates to the expected revision. Update this tab's expected value/revision only after that confirmation.

`load()` returns a discriminated result: `empty`, `valid`, `corrupt`, `unsupported-version`, or `unavailable`. Parse JSON in a try/catch and validate types, enums, ID format, goal 5–240, nonnegative finite playback position and activity, and timestamps before hydrating app state. On corrupt or unsupported data, preserve the exact raw string and block writes to that key; show a user-facing recovery message and do not silently start over or overwrite it. If storage is inaccessible before a commitment exists, explain the limitation and do not claim persistence or start the required persistent workflow until storage becomes available. No migration is needed for version 1; future migrations must explicitly support known older versions and retain the raw value until a migrated write succeeds.

The commitment stores: `schemaVersion`, `revision`, `lesson.videoId`, `lesson.canonicalUrl`, `objective`, `goalMinutes`, optional `vesselStyle` (`glass`, `coffee`, `mug`, or `bottle`), `lastConfirmedPositionMs`, `cumulativeRecordedFocusedMs`, `lessonStatus` (`unfinished` or `completed`), `sessionStatus` (`not-started`, `active`, `interrupted`, or `finished`), `createdAt`, and `updatedAt`. Version 1 records without `vesselStyle` remain valid and display the default `glass`; loading does not rewrite them. A vessel change is persisted only through the existing validated repository path and changes no lesson, goal, playback, activity, or completion fields. A confirmed interruption is persisted as `interrupted`; if the browser closes while status is `active`, load treats it as interrupted. Neither state is resumed or credited automatically. There is one current commitment; there is no archive.

Storage writes occur at candidate acceptance, goal changes, player position checkpoints, eligible-time checkpoints, Finish session, and confirmed Mark Lesson Complete. Writes are not deferred solely to page unload. The UI exposes `saving` during a write and `saved` only after confirmed write/read-back; error states show the last confirmed save time/revision. Activity since the last confirmed checkpoint is labeled **in this session, not yet saved** (or equivalent), separately from the saved total. A write blocked before `setItem` is `not-saved`; if `setItem` throws, read back when possible and call it definitely failed only if the prior raw value is confirmed unchanged. Stop/pause recording and playback where supported, keep the in-memory change visible, and offer retry only after the current stored record has been validated and still matches this tab's expected value. A failed completion/replacement is never displayed as committed. A successful replacement overwrites the sole record only after candidate acceptance and confirmed persistence.

#### Same-origin tabs and stale writes

Subscribe to `storage` events for the commitment key and whole-origin clears (`key === null`). On a relevant event, re-read the current key rather than relying on a possibly superseded event value; if its raw value or revision differs from this tab's expected value, mark this tab `stale`, and if it cannot be read, block writes as `unverified`. Identical current values can be ignored. In either blocked state, stop further activity recording, request a local player pause, and block checkpoints, completion, goal changes, replacement, and other writes. Show: “Learning data changed in another tab. Keep one study tab open, then reload to use the latest saved progress. Unsaved activity here may be lost.” Do not merge the two tabs' in-memory activity or overwrite the external record. The pre-write comparison above also catches a stale record when an event was missed. Storage events do not fire in the tab that made the write, and a normal read/check followed by `setItem` is not an atomic cross-tab transaction: two nearly simultaneous writers can still overwrite one another. The POC therefore recommends one active study tab and makes no cross-tab consistency guarantee.

#### Unverified writes and reconciliation

If `setItem` returned but read-back throws, is missing, differs, or fails validation, mark the outcome `unverified`, not `not-saved`; the prior record might already have been replaced. Immediately stop/pause recording and playback, retain the pending in-memory change for display, block further writes and automatic retry, and say that saved progress could not be confirmed. Attempt a fresh read and runtime validation when storage is accessible. If the raw value exactly matches the attempted write and validates, confirm it as saved; if it exactly matches the previous confirmed value, report the attempted change not saved; if it is a different valid record, treat this tab as stale and show the actual saved record; if it is corrupt, missing unexpectedly, or inaccessible, keep the state unverified and require the user to resolve/reload without overwriting it. A retry is allowed only after reconciliation establishes the expected prior record and re-runs the stale pre-write check. No failure path claims the previous record is intact without reading it.

Implements `prd.md > My Learning and commitment continuity`, `prd.md > YouTube error recovery and local persistence`, and `prd.md > States and Boundaries`.

### Focus Cup

Render an accessible inline SVG/CSS Focus Cup with four selectable vessels: transparent glass, coffee cup, mug, and bottle. Each has a small preview; the selected style is persisted as the optional version 1 `vesselStyle` preference, with glass as the no-write default for legacy records. Its accessible text reports exact cumulative recorded focused activity and current target; its decorative liquid fill is derived from `min(recordedFocusedMs / goalMs, 1)`, with a transparent dimensional body, visible liquid surface/highlights, and coffee-colored fill for the coffee cup. A 90-minute total against a 25-minute goal displays 90 minutes and 100% fill while lesson status remains Unfinished unless explicitly completed. Goal and vessel changes never reset activity. A brief rim overflow runs only when a newly observed persisted activity update crosses the unchanged goal from below; it does not run on load, goal/style changes, or unrelated renders. The completed label remains after the effect. Respect `prefers-reduced-motion` by removing fill and overflow motion.

Implements `prd.md > My Learning — returning student home`, `prd.md > Look and Feel`, and the cumulative Focus Cup acceptance criteria.

### Testing seams and suites

`FocusController` accepts an injectable monotonic clock, interval scheduler, and `FocusSignalSource`, allowing Vitest to test time accounting deterministically. The production UI composes the real browser focus source, official YouTube adapter, and local repository in `src/ui/App.tsx`. Playwright runs homepage story/navigation/privacy and Chromium/Firefox UI flows against the same app; deterministic study-workspace flows use a test-injected fake YouTube IFrame API and do not prove real playback or native desktop focus. The separate first-lesson Playwright test uses the real YouTube embed. Manual checks in actual Chromium and Firefox remain necessary for iframe controls, tab switching, minimizing, switching applications, buffering/errors, return-without-autoplay, and cleanup/reload.

Playwright does not model actual tab activation merely by creating multiple pages: pages in one browser context are not a substitute for OS-level focus evidence. The injected UI tests verify reactions to hidden, confirmed-lost, and ambiguous signals; manual browser checks establish how actual browser and iframe interactions report those signals.

Implements the testing requirements in `prd.md > Setup and candidate lesson loading`, `prd.md > My Learning and commitment continuity`, `prd.md > Focused study, activity, goal reached, and session finish`, and `prd.md > YouTube error recovery and local persistence`.
## Data Model

There is one authoritative browser-local record and no remote data model.

```ts
type LessonStatus = "unfinished" | "completed";
type PersistedSessionStatus = "not-started" | "active" | "interrupted" | "finished";

interface CommitmentRecordV1 {
  schemaVersion: 1;
  revision: number;
  lesson: {
    videoId: string;
    canonicalUrl: string;
    playlistId?: string;
    playlistVideoIds?: string[]; // actual ordered IDs returned by the IFrame API
    playlistIndex?: number;
    title?: string; // title returned for the current IFrame item only
  };
  objective: string;
  goalMinutes: number; // integer, 5 through 240
  lastConfirmedPositionMs: number;
  cumulativeRecordedFocusedMs: number;
  lessonStatus: LessonStatus;
  sessionStatus: PersistedSessionStatus;
  createdAt: string;
  updatedAt: string;
}
```

`CommitmentRepository` encodes and decodes this record. Its successful read-back confirms what the Web Storage API currently returns; it is not a guarantee against later browser failure, user clearing data, same-origin script modification, or a concurrent tab race. `FocusController` owns transient eligibility and the last monotonic sample in memory only; no running clock is persisted. The UI derives remaining time and Focus Cup fill rather than storing redundant percentages, and separately tracks the last confirmed persisted raw value/revision, any dirty in-memory change, and `saved`/`not-saved`/`unverified`/`stale` status. When a valid record is reopened with `sessionStatus: "active"`, the runtime immediately treats it as interrupted and paused; it attempts a guarded, validated write marking it interrupted if the tab is current, and surfaces an unconfirmed or stale outcome honestly. The user must resume explicitly. Completion is stored as the learner's self-report, not inferred from any player field.

Data path: setup text → URL/goal validation → candidate video or playlist cue → video-specific confirmation and actual playlist metadata → confirmed repository write → workspace; player/focus events → bounded controller → eligible milliseconds and position snapshot → repository → My Learning and Focus Cup; playlist selection → real playlist index/current item → same commitment update with activity retained; reload → repository decoder → paused My Learning state.

## File Structure

```text
project/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── playwright.config.ts
├── src/
│   ├── main.tsx
│   ├── domain/
│   │   ├── commitment.ts              # commitment and completion data rules
│   │   ├── focusGoal.ts               # goal validation and progress math
│   │   ├── focusVessel.ts             # vessel preference and goal crossing rule
│   │   └── youtubeUrl.ts              # supported video and playlist URL parsing
│   ├── services/
│   │   ├── focus/
│   │   │   ├── focusSignals.ts        # browser focus signal sampling
│   │   │   └── focusController.ts     # bounded activity accounting
│   │   ├── persistence/
│   │   │   ├── commitmentCodec.ts     # runtime validation and versioning
│   │   │   └── commitmentRepository.ts # confirmed localStorage writes and stale detection
│   │   └── youtube/
│   │       ├── iframeApi.ts           # typed official IFrame API surface and loader
│   │       └── playerAdapter.ts       # candidate confirmation, playback and playlist adapter
│   └── ui/
│       ├── App.tsx                    # shared navigation, Home story/privacy, setup, My Learning and study workspace
│       ├── FocusCup.tsx               # accessible dimensional SVG cup
│       └── styles.css                 # responsive visual system and reduced motion
├── tests/
│   ├── unit/                          # domain, focus, persistence and player tests
│   └── e2e/                           # Home story/navigation/privacy, real embed smoke test and deterministic workspace flows
└── devpost/
    ├── learner-profile.md
    ├── scope.md
    ├── prd.md
    ├── spec.md
    ├── checklist.md
    └── manual-browser-checks.md
```

## External Services and Dependencies

### YouTube IFrame Player API — real lesson playback

- Script: `https://www.youtube.com/iframe_api` loaded once asynchronously.
- Player: `new YT.Player(hostElement, { videoId, playerVars: { enablejsapi: 1, origin: window.location.origin, playsinline: 1 }, events })`.
- Events used: `onReady`, `onStateChange`, `onError`, `onAutoplayBlocked`. State codes normalize to unstarted `-1`, ended `0`, playing `1`, paused `2`, buffering `3`, cued `5`.
- Methods used: `cueVideoById`, `cuePlaylist`, `playVideoAt`, `playVideo`, `pauseVideo`, `seekTo`, `getPlayerState`, `getCurrentTime`, `getPlaylist`, `getPlaylistIndex`, `getVideoData`, `getIframe`, and `destroy`.
- Error handling: 2 invalid parameter, 5 HTML5/player issue, 100 unavailable/private, 101/150 embedding disallowed, 153 missing referer/client identification. Messages are user-readable and preserve an old commitment on candidate failure.
- No API key or credentials are used for this client-side embed. Network access and a valid page origin/referer are required; `file://` is unsupported. Keep the standard YouTube controls and branding. Do not access the cross-origin iframe DOM.
- Documentation: [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

### Browser APIs — focus and persistence

- Page Visibility: `document.visibilityState` and `visibilitychange` identify hidden/visible page transitions. [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- Focus: `document.hasFocus()`, `window.focus`, and `window.blur` are supporting signals; blur is never sufficient by itself. [MDN `Document.hasFocus()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/hasFocus), [MDN window blur](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event).
- Firefox caveat: Mozilla Bug 1899264 reports `document.hasFocus()` false when focusing a nested document. This is why iframe-active + false is ambiguous and handled conservatively. [Mozilla Bug 1899264](https://bugzilla.mozilla.org/show_bug.cgi?id=1899264).
- Storage: `localStorage` is scoped to the exact scheme, host, and port. `http://127.0.0.1:5173` is the development/demo/test origin; changing to `localhost`, another port, or a deployed URL does not automatically transfer progress. Access can throw, Web Storage operations are synchronous, and `storage` events notify other same-origin tabs of changes. [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [MDN Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API), [MDN storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event).

There is no backend API, database, account, AI service, analytics provider, external asset library, or paid infrastructure.

## Important Failure Modes

- **YouTube API script blocked or slow** → keep candidate values and old commitment; show API load/retry feedback; add no time.
- **Player API ready but video unavailable or embed blocked** → wait for video-specific state/error; do not commit candidate on API `onReady` alone; preserve old record and allow correction.
- **Autoplay blocked** → treat `onAutoplayBlocked` as a paused-ready state and instruct the student to press Play; no repeated play attempts and no activity until the player reports `PLAYING`.
- **Tab hidden/minimized or confirmed focus loss** → close the last confirmed interval conservatively, request pause, checkpoint, and require explicit resume. If focus signals are ambiguous due iframe behavior, stop credit and do not pause solely on the ambiguous signal; document the limitation.
- **Background timer suspension or stale tick** → discard elapsed gaps above the controller's 1.5-second acceptance bound. This may undercount slightly; it cannot award a large background interval.
- **Corrupt/future-schema storage** → preserve the raw value, block writes to it, and show recovery guidance. Never reset to an empty commitment silently.
- **Storage unavailable or rejected write** → stop/pause study, show unsaved in-memory changes, and permit retry only after validating the current stored value.
- **Read-back cannot verify a returned write** → show `unverified`, block further writes, and reconcile the actual stored record before claiming it was saved or unchanged.
- **Another tab changes the commitment** → mark this tab `stale`, stop/pause study and block writes; guide the student to use one active study tab and reload the latest saved record. Revision checks reduce stale writes but are not atomic across tabs.

## What Was Simplified and Why

- A single browser-local commitment replaces accounts, databases, and cloud sync — the approved POC needs continuity on the same browser, not multi-user infrastructure.
- Four coordinated views replace a dashboard/router architecture — the student has one current lesson and a short flow.
- One CSS/SVG Focus Cup replaces a 3D engine — accurate proportional progress and refined visual identity matter more than WebGL complexity.
- A typed adapter around the official YouTube API replaces a React player wrapper — fewer dependencies and a clear lifecycle boundary, at the cost of implementing and testing our own event normalization and cleanup.
- Vitest plus a controllable player adapter makes timing and failure cases deterministic; Playwright verifies application behavior; manual real-browser checks remain necessary because mocked playback and Playwright pages do not prove native focus or real YouTube behavior.
- No archive, AI, multiplayer, daily history, or rewards — each adds data and verification work without proving the approved single-commitment workflow.

## Implementation Sequence and Technical Acceptance

The build should work in narrow, verifiable slices. Each slice must type-check and have relevant tests before moving on.

1. **Fresh scaffold and visual shell.** Create only the Vite React/TypeScript project, strict typecheck, scripts, palette tokens, typography, responsive shell, and four view navigation. Confirm no old project files or assets entered the repository. Verify `npm run typecheck` and production build.
2. **Domain and commitment storage.** Implement URL/goal parsing, commitment transitions, versioned codec, single repository, and corrupt/unsupported/unavailable/write-failure handling, including stale-tab detection and unverified-write reconciliation. Add Vitest cases before wiring forms. Verify a rejected replacement leaves the saved record unchanged and an unverified replacement makes no such claim until reconciliation.
3. **YouTube player vertical slice.** Load the official API once; create, cue, play once, normalize states/errors, restore paused position, and clean up. Use fake adapter tests, then an early real-browser YouTube smoke check before polishing the workspace.
4. **Focus controller.** Implement the tri-state browser focus controller and monotonic bounded accounting with fake clock/player/focus source. Verify paused/buffering/error/hidden/ambiguous/stale intervals, session boundaries, periodic persistence, and no reload double count. Then run real Chromium and Firefox iframe interaction checks.
5. **Four screens and Focus Cup.** Wire setup, My Learning, workspace, explicit replacement, Finish session, completion confirmation, errors, accessible live statuses, and the SVG/CSS Cup. Test the 90/25 case and reduced motion. Keep Previous Learning and every deferred feature absent.
6. **Automated and manual readiness.** Run all Vitest suites, Playwright Chromium user journeys, typecheck, production build, keyboard checks, and responsive checks. Follow the actual YouTube manual checklist in Chromium and Firefox: play/pause/seek, buffering/error, iframe focus, tab switch, minimize, external-app switch, return without autoplay, and cleanup. Document unsupported or ambiguous browser behavior rather than claiming it passed.

### Required automated checks

- URL allowlist and ID parsing, lookalike hosts, malformed IDs, unsupported schemes; failed candidate replacement leaves the serialized old record unchanged.
- Goal custom validation for empty, text, fractional, negative, boundaries 5/240, and out-of-range values; changing a goal preserves cumulative milliseconds and recalculates fill/remainder.
- Playlist parsing covers playlist-only URLs and watch URLs containing both v and list parameters; Playwright verifies actual-entry count/order, panel expansion/collapse, selection, and preserved activity; unavailable playlist data preserves the prior commitment and shows the honest fallback.
- Fake player state transitions for unstarted/cued/playing/paused/buffering/ended/errors/autoplay blocked.
- Fake clock tests: only eligible samples add time; stale gaps >1.5 seconds are discarded; buffering, paused, error, hidden, confirmed loss, and ambiguous states add zero; duplicated start callbacks do not create multiple clocks.
- Focus controller tests: iframe active + `hasFocus=false` becomes ambiguous (no credit, no pause); raw blur alone does not pause; confirmed loss pauses; focus return does not call play; visible/hidden transitions behave as designed. Repeated identical player/focus events and duplicate timer delivery cannot double-count; a recovery recheck that stays ambiguous grants no credit, while a confirmed recheck starts with a fresh baseline only.
- Persistent ambiguity UI test: show the explicit “recording paused; YouTube may still be playing” state, keep the player available, and verify activity remains stopped with no timeout-based recovery. Recheck focus must not override browser signals or trigger playback; verified foreground resumes counting only on subsequent bounded samples.
- Playwright signal-path cases: the test-only focus driver emits tab-hidden, minimize-hidden, confirmed application-focus loss, iframe-ambiguous, and foreground-return events; verify no eligible time in the ineligible states, pause only on confirmed states, and no automatic Play call on return. These are simulated signal-delivery tests, not native desktop-focus tests.
- Persistence codec/repository tests: round trip, reload restoration, version-1 validation, malformed JSON, unsupported version, storage getter/setter throwing, quota/write rejection, and read-back exception/missing/mismatch/invalid value after a returned `setItem`. Verify each reconciliation result: attempted value confirmed, prior value confirmed, different valid value, and unavailable/corrupt value. UI tests distinguish saving, confirmed saved, not-saved, unverified, and stale states; show session-only activity as unsaved; and never display an unconfirmed replacement/completion as committed.
- Same-origin two-tab tests: an external commitment update or clear event stops accounting, requests pause, and blocks subsequent checkpoints and replacement; an unchanged event does not. A stale revision/raw value found by the pre-write check blocks a write even if the storage event was missed. Document that nearly simultaneous writes remain a race outside this POC's guarantee.
- Multiple session tests: finish → reload → continue retains the prior total and adds only new eligible deltas once.
- Finish session versus Mark Lesson Complete: Finish leaves status unfinished; goal reach, YouTube ENDED and timestamp do not complete; cancel completion leaves state intact; confirmed completion persists `completed` and retains all progress.
- Focus Cup calculation test: 90 eligible minutes / 25-minute goal → 100% fill, 90 minutes shown, zero remaining, unfinished lesson unless explicitly completed; reduced-motion styling disables transitions.
- Adapter lifecycle: one player per mount, one shared API script loader, callbacks ignored after dispose, player destroyed once, listeners/timers cleaned on unmount.
- Playwright Chromium flows: first-use and saved-return Home → Setup → Study; contextual Continue Learning; separate My Learning navigation; workspace return to Home; goal changes; safe failed replacement; reload and paused restore; Finish versus Complete; keyboard-accessible controls and mobile-width layout. Use test data/fake player only in test fixtures; never show that data as real product progress.

### Manual real-browser verification (required)

Use real embeddable YouTube videos in desktop Chromium and Firefox at `http://127.0.0.1:5173`. Verify actual API script readiness, iframe control and seek interaction, playback/buffering/error events, blocked autoplay, tab switching, window minimization, switching to another application, return without auto-resume, periodic persistence, stale-tab feedback with two same-origin tabs, and teardown. Playwright's multi-page model is not evidence of OS-level focus. Record per-browser outcomes and limitations; a failure or ambiguous signal is not to be described as verified.

## Decisions and Open Issues

### Agreed decisions

- **Learner-approved:** React + TypeScript + Vite; no backend, database, authentication, cloud sync, or copied Bolt implementation.
- **Learner-approved:** one versioned, runtime-validated `localStorage` record behind a single repository; preserve raw corrupt/future-schema data; never claim failed writes were saved.
- **Learner-approved:** direct official YouTube IFrame API behind a small typed adapter; controllable fake adapter for automated tests and real-browser YouTube verification.
- **Learner-approved scope amendment:** one supplied YouTube playlist is an alternative single active commitment. Show actual ordered IDs and the current title only when the IFrame API returns it; do not add playlist discovery, a Data API key, or a metadata service.
- **Learner-approved:** Vitest with fake clock/player for deterministic tests and Playwright Chromium for app-level browser workflows; manual YouTube/focus checks in real Chromium and Firefox.
- **Learner-approved policy, implementation boundary:** page hidden is a confirmed interruption; raw blur triggers a recheck only; ambiguous iframe-focus state earns no time but does not itself pause; confirmed focus loss pauses and requires explicit resume.
- **Learner-approved design direction carried from PRD:** editorial warm-white/lime/pink/ink UI, original CSS/SVG cup, responsive accessible layout, restrained reduced-motion animation.
- **Security boundary:** same-profile users can inspect browser-local data; the app has no identity isolation. Do not store personal identity details or treat client data as tamper-resistant.

### Focus-detection uncertainty and evidence needed

The learner identified the Firefox nested-iframe `document.hasFocus()` report. The policy is clarified with a tri-state controller: confirmed foreground, confirmed lost/hidden, and ambiguous iframe focus. What remains evidence-dependent is whether Chromium and Firefox provide a second independent signal that reliably distinguishes a real OS app switch from a focus transition into the active YouTube iframe. This cannot be decided from mocks or API documentation alone. Verify with the real IFrame API in both browsers during `5-build`; when the signals are indistinguishable, do not credit time and do not claim guaranteed playback pause for that ambiguous case.

### Remaining implementation checks, not product questions

- Confirm current stable package versions and Node compatibility at scaffold time; record exact versions in the lockfile. Node `v24.22.0` / npm `11.19.1` are present now.
- Verify YouTube's current error/event behavior for the chosen video examples, especially the difference between player `onReady`, video `CUED`, `onAutoplayBlocked`, and errors. No availability check is promised before the embed attempt.
- Focus/accounting settings (500 ms sampling, 1.5 s stale-gap bound, 5 s persistence cadence) are concrete starting values for the first slice. Tests and real browser traces may justify tuning them; never tune them to inflate totals.
- No deployment destination is selected or required. A local recording is sufficient; deployment can be decided in `6-ship` only if sharing a live URL becomes useful.
