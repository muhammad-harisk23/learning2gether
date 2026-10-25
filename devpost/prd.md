---
doc: prd
status: approved
---

# K12Learn2Gether — Less Searching. More Finishing.

A focused, solo-first learning-continuity experience for Indian secondary students using YouTube lessons from teachers they already trust.

Sources: `scope.md > The Unique Kernel`, `Who It's For`, `The Core Loop`, and `Why This Matters to the Learner`.

## Target User and Primary Use Cases

The primary user is an Indian student in Classes 9–12 studying mathematics or science from a YouTube teacher they already trust. They may be approaching exams, have saved many resources, and need to follow through on one chosen lesson rather than keep comparing alternatives. The product must feel useful to this student without a friend, account, library, or recommendation feed.

Primary use cases are: (1) understand the product and start one lesson for the first time; (2) focus on that lesson while preserving an honest record of activity; (3) leave and later continue the same unfinished commitment; (4) change a focus goal without losing activity; (5) intentionally switch lessons with clear consequences; (6) finish one study session while keeping an unfinished lesson active; and (7) explicitly mark a lesson complete and see that state persist. Collaboration and historical archive/reactivation are not required use cases in the current POC.

Source: `scope.md > Who It's For`, `The Core Loop`, and `In Scope > Required solo learning`.

## The Core Journey

1. **Understand the promise.** A first-time visitor lands on an editorial page that explains the resource-search cycle without blaming students or claiming everyone behaves the same way. The first viewport communicates the problem and offers an immediate way to begin.
2. **Start without onboarding friction.** “Start finishing what you learn” opens a separate setup view. The student pastes one YouTube lesson URL, writes a short objective, and chooses a personal focus-time goal. Same-browser storage is explained concisely.
3. **Load and enter deliberately.** “Start focused study” validates the URL and attempts to load the selected lesson. Invalid or unplayable candidates produce a helpful inline error and preserve the student's entered values and any current commitment. On a successful load, the workspace opens and attempts playback once because the student explicitly asked to start. If scripted playback is blocked, the player stays paused and the student sees: “Your lesson is ready. Press Play to begin.”
4. **Study with honest feedback.** The YouTube player is the workspace's main visual element. The student sees their objective, focus goal, recorded focused activity, remaining time to goal, Focus Cup, and current focus/playback state. Activity accrues only from observed eligible playback while the page is visible and browser-reported focus is present.
5. **Handle interruption safely.** On a reported tab switch, minimize, or loss of focus, pause local playback where supported and stop recording eligible activity. Explain that playback paused. Returning to the page never resumes automatically; the student chooses Resume.
6. **End a study session, not the commitment.** “Finish session” pauses playback where supported, checkpoints the latest confirmed position and eligible activity, and may offer a short reflection. If the lesson is unfinished, it remains the active commitment and retains its cumulative activity. The focus-time goal never ends playback or marks a lesson complete.
7. **Mark a lesson complete only by choice.** The student can separately choose **Mark Lesson Complete** in the workspace and confirm. This ends an active study session, pauses playback where supported, saves current state and eligible recorded focused activity, and marks the commitment completed as the student's self-report. Goal attainment, video end, position, and Finish session never complete the lesson. Completion does not imply understanding, mastery, or exam readiness.
8. **Continue later or start another lesson.** When the same browser opens again, a returning student goes directly to My Learning, not through the landing story or setup. The saved lesson, objective, position, goal, cumulative recorded focused activity, status, and Focus Cup return. An unfinished lesson has Continue Learning, which opens paused at the saved position. A completed lesson stays visibly completed and offers Start another lesson without autoplay.
9. **Change a commitment intentionally.** If the student asks to replace an unfinished lesson, explain the effect and offer Continue or Replace. Load the supported candidate while leaving the old commitment intact. If the candidate fails, preserve the old commitment and progress. In the current required scope, a successful replacement replaces the old active record after explicit confirmation; the new lesson has its own objective and goal and starts with zero recorded focused activity. Never transfer time between lessons. Persistent Previous Learning history is a proposed post-core amendment below, not a required behavior.

Sources: `scope.md > The Core Loop`, `What "Working" Looks Like`, `In Scope > Required solo learning`, and `Success and Acceptance Criteria`.

## Screens and Layout

### 1. Editorial landing page — first visit

The first visit starts with a strong hero: **K12Learn2Gether**, **“You don't need another playlist. You need to finish the one you started.”**, and the supporting copy: **“The lectures are free. The teachers are excellent. The study plans are everywhere. Yet somehow, exams get closer while the unfinished lessons keep growing.”** Introduce the positioning **“Less searching. More finishing.”** and the copy **“Already found a teacher you trust? Bring your lesson, set one goal, and focus on finishing what you start.”** The primary CTA, **Start finishing what you learn**, opens Setup. **See how it works** moves to the explanation on the same page. The CTA is available without reading the full page.

Below the hero, keep the requested narrative in this order:

1. The resource-search cycle: Search → Compare → Save → Start → Switch → Repeat. Explain that searching for the perfect resource can replace using a good resource consistently. Use a restrained, accessible visual treatment, not fabricated data.
2. The connected problems: Resource FOMO; distraction and fragmented tools; unfinished lessons and unclear recorded progress. Use empathetic examples grounded in the learner's shared experience: comparing teachers after saving a playlist, leaving YouTube to check a separate timer or message, or returning unsure which lesson position they reached. Present these as relatable situations, not statistics or universal claims.
3. The philosophy: “Bring what you already want to learn. We help you actually finish it.” The student chooses the teacher and resource; the app helps them commit, focus, preserve progress, and continue.
4. Four current capabilities only: one lesson and goal; browser-supported focus protection; saved lesson position and recorded focused activity; Continue Learning and the factual Focus Cup.
5. A second CTA to Setup. No signup, course discovery, fake metrics, testimonials, or planned-feature claims.

The landing page is editorial and scannable; it is not a dashboard or a gate before study. On narrow screens, the narrative becomes a single readable column, the cycle illustration remains understandable without animation, and primary CTAs remain easy to reach. No horizontal scrolling.

### 2. Focused Setup view — first commitment or intentional replacement

Setup is a separate, quiet view with heading **“One lesson. One intention. One step forward.”** It contains only:

- A labeled YouTube lesson URL input.
- A short learning-objective input.
- Focus-time quick choices: 15, 25, and 45 minutes; 25 minutes is selected by default.
- A Custom duration input for whole minutes from 5 through 240 inclusive.
- **Start focused study** and an obvious Back action.
- Concise information that no account is needed, progress is stored in this browser, and clearing site data may remove it.

The setup is a single clear task, not a wizard. URL, objective, and goal errors are shown beside the relevant input, associated with it for assistive technology, and do not clear other entered values. During loading, show a clear in-progress state and prevent duplicate submissions. When replacing an active commitment, this view is reached only after the student intentionally chooses Replace; the previous commitment remains saved until the candidate successfully loads.

### 3. My Learning — returning student home

A saved current commitment—unfinished or completed—routes directly to My Learning. The editorial landing page does not appear first. The single current commitment dominates the view, in one composed editorial layout rather than a grid of metric cards. Show:

- The selected lesson and its YouTube attribution.
- The personal learning objective.
- The last confirmed playback position.
- The chosen goal, cumulative recorded focused activity, and remaining time (never below zero).
- The private Focus Cup, proportionally filled and capped visually at 100%, while the actual cumulative recorded focused activity remains visible even above the goal. Label this as focused activity toward this commitment's focus-time goal; it is not daily progress, lesson completion, watched-video percentage, or a comprehension score.
- An accurate **Unfinished** or **Completed** status. Finishing a study session does not change an unfinished lesson to Completed.
- For an unfinished lesson, one prominent **Continue Learning** action opens the study workspace paused at the saved position. For a completed lesson, show a clear **Start another lesson** action; it opens Setup but does not autoplay. The completed record remains until the new candidate successfully loads, then is replaced because history is not in scope. The new commitment starts with zero recorded focused activity; no time transfers.
- Secondary actions to change the goal or intentionally change the lesson.
- Same-browser storage information, visible but secondary.

Changing the goal preserves cumulative recorded focused activity and recalculates the percentage and remaining time against the new goal. It does not reset the total. In the required scope, no archived-history section is shown; archive and reactivation remain a proposed amendment.

### 4. Focused study workspace

The embedded YouTube lesson is the primary visual element, with its standard controls, branding, and functionality accessible. Supporting information is visually quieter: objective, goal, recorded focused activity, remaining time, Focus Cup, and focus/playback status. Provide clear Play/Resume, **Finish session**, and a distinct **Mark Lesson Complete** action without obscuring YouTube controls or layering decorative UI over the player. Mark Lesson Complete opens an explicit confirmation; only confirming changes lesson status. A completed lesson remains completed and does not start another video automatically.

Desktop uses a strong content hierarchy with the player dominant and supporting study details adjacent where space allows. Mobile stacks the video first, then the objective and progress details; controls and Finish session remain reachable without horizontal scrolling or hover-only interaction. Losing focus pauses local playback where supported. Returning shows a clear paused-while-away state and an explicit Resume action.

### 5. In-context confirmation and feedback

Replacement confirmation, field validation, video loading/errors, autoplay-blocked instructions, focus-loss feedback, goal-reached status, storage errors, and session-finish reflection are states of the relevant view, not extra dashboard pages. Use dialogs only for consequential replacement confirmation; all other feedback stays close to the related content and preserves context.

### Visible component responsibilities

- **Problem-cycle story:** explains the resource-search pattern as a sequence, without fabricated evidence or a claim that every student behaves alike.
- **Lesson and objective fields:** capture the student's chosen YouTube lesson and intention; keep values intact through validation and load failures.
- **Goal selector:** presents 15/25/45-minute choices, a 25-minute default, and a validated custom whole-minute value; changing the goal never resets activity.
- **Active commitment summary:** keeps the current lesson, objective, goal, status, and Continue Learning action together; it does not become a grid of unrelated metrics.
- **YouTube player:** presents the selected lesson with standard YouTube controls, branding, and player feedback intact.
- **Focus status and activity display:** explains Playing, Paused, Buffering, Paused while away, and Goal reached states in text; shows exact cumulative recorded focused activity and remaining time.
- **Focus Cup:** translates the saved activity/goal ratio into a private proportional visual; it does not generate achievements or substitute for the numeric total.
- **Replacement confirmation:** explains that the current active record and its browser-local progress will be replaced in this POC after the candidate loads; Cancel preserves it. History is not represented until a later scope amendment is approved.
- **Lesson-completion confirmation:** distinguishes learner-reported completion from finishing a session or reaching the focus goal. Cancel leaves the session and lesson state unchanged; confirm checkpoints state, stops the active session, and persists Completed.
- **Mark Lesson Complete action:** is available in the focused workspace as a deliberate, separately labeled control; it is never replaced by Finish session or a player/goal event.
- **Inline feedback:** relates errors and recovery actions to the relevant input or player and keeps the student's other entered/saved data intact.
- **Working controls:** every visible CTA, button, selector, and link has a defined action and destination; no decorative or dead controls are shown.

Sources: `scope.md > Inspiration & Identity`, `In Scope > Required solo learning`, and `Success and Acceptance Criteria`.

## Look and Feel

- Brand name and positioning: **K12Learn2Gether — Less Searching. More Finishing.** Core promise: **“Bring what you already want to learn. We help you actually finish it.”**
- Colors: warm white `#FAF9F5`, electric lime `#D9F525`, soft pink `#F8C7D9`, and rich ink black. Use color purposefully for hierarchy, progress, and focus feedback; do not rely on color alone to convey state.
- Editorial, premium, calm, confident, and original. Typography, whitespace, rhythm, and responsive composition should feel deliberate. Avoid generic SaaS/dashboard templates, repetitive feature-card grids, fake student stories or metrics, stock student imagery, excessive gradients/glass, emoji-heavy UI, decorative AI imagery, random floating shapes, and guilt-inducing exam messaging.
- Focus Cup: original lightweight SVG/CSS illustration with dimensional shading, highlights, and a proportional liquid fill. The focus-time goal is cumulative for the single current learning commitment across study sessions. Fill is `min(cumulative recorded focused activity / current goal, 1)`. Show the exact cumulative total separately when it exceeds the goal, with remaining goal time at zero. Label the metric so it cannot be mistaken for daily progress, lesson completion, watched-video percentage, or comprehension. Use restrained transitions; disable or reduce motion when the user requests reduced motion.
- Motion supports state change and orientation only. Never use confetti or celebratory rewards for watch time. Avoid animation that competes with the lesson.
- A light appearance is required. Dark appearance is optional later only if it does not compromise core usability or delivery; it is not an acceptance requirement.
- Keep YouTube's player branding and controls visible and usable. Surrounding app styling must not disguise the lesson source or interfere with the player.

Source: `scope.md > Inspiration & Identity`.

## Accessibility, Responsive Behavior, and Motion

- Use semantic page landmarks and heading order. All inputs have visible labels; all actions work by keyboard and have visible focus indicators.
- Goal presets and custom input have a clear accessible relationship. Validation is not conveyed by color alone, identifies the problem in text, and is associated with the affected field. Important state changes such as Paused while away, autoplay blocked, player error, and Goal reached are announced without announcing the timer every second.
- Maintain readable contrast with the brand palette; use text or icons alongside color for focus and error states. Do not cover or intercept YouTube controls.
- Respect `prefers-reduced-motion`; the Focus Cup fill and landing-page movement become static or reduced. Motion must not be required to understand the resource-search cycle or progress.
- At mobile widths, stack the player and supporting details in a single reading order, keep controls reachable, preserve CTA visibility, and avoid horizontal scrolling. On desktop, maintain editorial hierarchy and keep the lesson visually dominant in the workspace.

Source: `scope.md > Inspiration & Identity`, `In Scope > Required solo learning`.

## Features and Behavior

### Landing, first visit, and entry

- A student with no saved commitment sees the editorial landing page. Its hero communicates the problem in the first screen and provides the primary Start CTA plus an in-page “See how it works” action.
- Start CTAs navigate to Setup, not to a form hidden deep in the landing page. “See how it works” scrolls to the story section without trapping the student there.
- The page communicates resource FOMO, fragmented study, and unfinished learning without asserting universal behavior or inventing statistics.
- A student with a saved current commitment opens My Learning directly. Continue Learning is primary for an unfinished lesson; Start another lesson is shown for a completed one. Neither path forces the landing story.

Acceptance criteria (source: `scope.md > The Core Loop`, `Who It's For`, `What "Working" Looks Like`):

- [ ] A first-time visitor can explain the product's promise from the first viewport and reach Setup with one primary CTA.
- [ ] “See how it works” reaches the explanatory section; a CTA near the conclusion also opens Setup.
- [ ] A returning student with an unfinished saved commitment sees My Learning and Continue Learning without first scrolling through the landing story.
- [ ] A returning student with a completed current commitment sees its Completed state and Start another lesson without first scrolling through the landing story or autoplaying.
- [ ] Landing content contains no fake statistics, testimonials, metrics, unbuilt-feature claims, or forced signup.

### Setup and candidate lesson loading

- Setup gathers one supported YouTube lesson URL, a non-empty short objective, and one personal focus-time goal.
- The goal defaults to 25 minutes. Quick choices are 15, 25, and 45. Custom values are whole numbers from 5 to 240 inclusive. Empty, nonnumeric, fractional, negative, and out-of-range values are rejected with clear inline validation. The goal is a personal cumulative activity target, not a compulsory session limit.
- The URL is validated for supported format. Embedding availability is not promised in advance; attempt to load the candidate. For a first commitment, keep the entered URL/objective/goal on load error. For replacement, keep the existing saved commitment unchanged until the candidate loads without player error.
- On successful player load, enter the workspace and attempt playback once in response to the explicit Start action. Never loop/retry autoplay, force mute, or hide player controls. If scripted playback is blocked, keep the player paused and show **“Your lesson is ready. Press Play to begin.”**
- Do not accrue activity during validation, loading, blocked playback, buffering, pause, error, hidden state, or reported unfocused state.

Acceptance criteria (source: `scope.md > In Scope > Required solo learning`, `Success and Acceptance Criteria`):

- [ ] The default is 25; presets select 15/25/45; a whole-number custom value from 5 to 240 is accepted and persisted.
- [ ] Invalid custom values are rejected inline and accessibly; correcting a field does not clear other setup values.
- [ ] Invalid URLs and unavailable/embedding-disabled candidates show useful errors near the URL input. A failed replacement leaves the old saved commitment and all its recorded activity intact.
- [ ] Start attempts playback once after a successful load. When blocked, the exact manual-play instruction appears; no repeated attempt, forced mute, or hidden YouTube control occurs.

### My Learning and commitment continuity

- My Learning displays only the single current commitment as required by the current scope. The lesson, objective, goal, last confirmed position, recorded focused activity, remaining target time, Focus Cup, and lesson status remain together. Completed commitments retain these fields too.
- An unfinished commitment has Continue Learning. A completed commitment has Start another lesson and stays Completed after reload; it does not show as unfinished or autoplay.
- Continue Learning opens at the last confirmed playback position, paused. The student chooses when to play.
- The student can change the goal at any time. Existing recorded focused activity is retained; the displayed percentage and remaining target are recalculated from the new goal. The actual total is never capped or reset.
- Changing an unfinished lesson requires a clear confirmation describing the effect. Continue/cancel preserves the current commitment. Replace begins a candidate load while preserving the old commitment; only a successful load commits the new lesson. In this required POC, after explicit successful replacement the previous record is not retained because history is outside approved scope. The new commitment starts with its own goal and zero recorded focused activity. This limitation must be stated honestly; no silent discard is allowed.
- Mark Lesson Complete is a separate explicit action. Confirmation ends any active study session, pauses playback where supported, checkpoints position and recorded focused activity, and saves Completed. It is not triggered by goal attainment, session finish, playback position, or YouTube's ended state. Completion grants no XP, badge, streak, or watch-time reward. The completed record remains until the student intentionally starts another lesson; a failed new lesson load leaves it intact.
- Storage load/write failures show an honest, actionable error. Do not replace or clear the last valid saved commitment when a save fails.

Acceptance criteria (source: `scope.md > The Core Loop`, `In Scope > Required solo learning`, `Success and Acceptance Criteria`):

- [ ] Reopening the same browser shows the same active lesson, objective, goal, position, cumulative recorded focused activity, and commitment status.
- [ ] Continue Learning loads paused at the saved position and never autoplays on return.
- [ ] Changing the goal preserves total activity and recalculates the Cup; if activity exceeds the new goal, the Cup stays at 100%, actual minutes remain visible, and remaining time displays zero.
- [ ] Continue/cancel in replacement confirmation leaves saved data untouched. A failed candidate does not change the active record. A successful explicit replacement starts the new lesson with its own goal and zero activity; time is never transferred between lessons and replacement is never presented as completion of the old lesson.
- [ ] Confirming Mark Lesson Complete ends the active study session, pauses playback where supported, checkpoints progress, and persists Completed. Canceling does not change lesson or session status.
- [ ] Goal reached, Finish session, YouTube video end, or playback position never completes a lesson. Completed status survives same-browser reload and presents Start another lesson without autoplay.
- [ ] A storage failure is visible and does not silently overwrite known-good saved data.

### Focused study, activity, goal reached, and session finish

- During a study session, use the player's reported state and browser visibility/focus signals. Record activity only for observed intervals when the player reports PLAYING and the page is visible and focused where the browser reports focus. Buffering, paused, blocked, errored, interrupted, hidden, or reported-blur intervals add no activity. Browser/player signals do not prove human attention, comprehension, or tamper-resistant behavior.
- On a supported visibility/focus loss, stop activity immediately and pause local playback. On return, explain the pause and wait for a deliberate Resume action; never autoplay after tab return, minimizing, browser reopen, or Continue Learning.
- Interacting with YouTube's standard controls while remaining in the active study tab must not falsely trigger a focus-loss pause. Genuine tab switching, minimization and supported app-focus loss must still stop eligible focused-activity accumulation and pause playback where supported. Resolve the focus-detection strategy in `4-spec` and test iframe interactions, tab switching and window minimization.
- At 100% of the current goal, playback and eligible activity continue normally. Show a subtle accessible **Focus-time goal reached** status, keep the Cup visually capped, and continue showing the exact cumulative activity. Offer Continue studying and Finish session. Do not stop, navigate, or mark the lesson complete automatically.
- **Finish session** ends only the current study period: pause playback where supported, checkpoint the last confirmed playback position and eligible activity, optionally collect a short reflection about what was covered or what remains, and return to My Learning. If the lesson is unfinished, it remains the active commitment with cumulative activity intact and Continue Learning prominent.
- Subsequent study sessions add eligible recorded activity to the same active commitment without resetting or duplicating earlier totals. Lesson completion is distinct from session finish and requires a separate confirmed Mark Lesson Complete action. Completion is the learner's self-report, not verified understanding or mastery.

Acceptance criteria (source: `scope.md > The Core Loop`, `What "Working" Looks Like`, `In Scope > Required solo learning`, `Success and Acceptance Criteria`):

- [ ] Activity increases only while PLAYING + visible + reported focused; pause, buffering, blocked, error, hidden, blur, and unobserved/suspended gaps add none.
- [ ] Interacting with YouTube's standard controls while remaining in the active study tab must not falsely trigger a focus-loss pause. Genuine tab switching, minimization and supported app-focus loss must still stop eligible focused-activity accumulation and pause playback where supported.
- [ ] Automated tests cover YouTube iframe control interaction, tab switching and window minimization; the `4-spec` defines the focus-detection strategy. Supported genuine focus loss pauses local playback and recording; return feedback is visible and playback remains paused until the student acts.
- [ ] At goal, playback and eligible recording continue; the status and actions appear; the Cup is capped at 100%, while exact cumulative activity remains accurate.
- [ ] The focus-time goal is cumulative for the current commitment across multiple sessions. For 90 eligible minutes toward a 25-minute goal, the Cup shows 100%, the displayed total is 90 minutes, remaining goal time is zero, and the lesson remains unfinished unless explicitly marked complete. Changing the goal preserves the 90-minute total and recalculates fill.
- [ ] Finish session checkpoints state and ends the session without finishing the lesson. An unfinished lesson remains on My Learning and can be continued after reopening.
- [ ] Mark Lesson Complete is distinct from Finish session; confirming it ends an active session and persists Completed, while goal attainment, playback reaching the end, and session finish leave the lesson status unchanged.
- [ ] A completed lesson remains Completed after reload and offers Start another lesson without starting playback or a new commitment automatically.
- [ ] A later session adds only new eligible activity; tests show no reset or double count across finish, reload, and resume.
- [ ] Reflection, if included, is optional and does not claim comprehension or completion.

### YouTube error recovery and local persistence

- URL-format errors, unavailable or embedding-disabled videos, player errors, and interrupted playback receive distinct, calm feedback near the relevant player/input. Retain setup values. During a replacement attempt, keep the old saved commitment until a candidate loads successfully. On playback interruption, stop activity, preserve the last confirmed state, and allow retry or an intentional lesson change.
- Solo progress is stored in the same browser profile. Explain that it is not an account or cloud backup and clearing site data may remove it. Persist the active lesson identifier/link, objective, goal, confirmed playback position, cumulative recorded focused activity, and session/commitment status. Save during activity and at meaningful transitions; do not rely on unload alone.

Acceptance criteria (source: `scope.md > In Scope > Required solo learning`, `Success and Acceptance Criteria`):

- [ ] Errors identify the issue and next useful action without clearing the objective, goal, or current commitment.
- [ ] A failed replacement or player error never awards activity or destroys the previous saved record.
- [ ] Reload/reopen in the same browser restores the last confirmed state; browser site-data clearing is disclosed as a loss risk.

## States and Boundaries

- **First use:** landing page, no active progress, empty Focus Cup only if shown as an illustration; never imply recorded activity.
- **Setup ready / invalid:** fields retain user input; invalid URL, missing objective, or invalid goal has inline guidance.
- **Loading candidate:** visible loading feedback; no activity accrues and existing commitment remains intact until successful load.
- **Player ready / autoplay blocked:** workspace is visible, paused, with the manual-play instruction.
- **Playing:** activity indicator and cumulative time update only from eligible observed intervals.
- **Paused / buffering / hidden / unfocused / interrupted:** no activity accrues; supported focus loss pauses playback.
- **Return:** explain why paused; explicit Resume required.
- **Goal reached:** subtle status and actions; player/session continue until the student chooses.
- **Session finished, lesson unfinished:** session is ended; commitment remains unfinished and prominent in My Learning.
- **Lesson completion requested:** a confirmation distinguishes the learner's self-report from a study-session finish; Cancel preserves state, confirm checkpoints and persists Completed.
- **Lesson completed:** My Learning shows Completed and Start another lesson. No video autoplays and no understanding/mastery claim is made.
- **Commitment replacement:** explicit continue/replace confirmation; failed load preserves existing state; successful replacement is explicit and, in this scope, replaces the old active record without history.
- **Persistence failure:** explain that the latest change could not be saved; keep the last known valid data and do not claim unsaved activity persisted.
- **No network/video error:** preserve the commitment and stop activity; provide retry/replace path. The app does not promise video availability or uninterrupted YouTube service.

Source: `scope.md > In Scope > Required solo learning` and `Success and Acceptance Criteria`.

## Product Decisions

- Product name and positioning are **K12Learn2Gether — Less Searching. More Finishing.**; promise: “Bring what you already want to learn. We help you actually finish it.”
- Solo learning and continuity are the required product; collaboration is optional and only considered after solo acceptance passes.
- First-time flow: editorial landing → separate focused Setup → workspace. Returning students bypass the landing and open My Learning.
- Default goal is 25 minutes; 15/25/45 presets and custom whole minutes 5–240 are available. Goal changes never reset recorded focused activity.
- Start focused study attempts playback once after successful load; blocked autoplay falls back to an explicit Play instruction. Resume after any interruption is always user-initiated.
- A study session is one period; a focus-time goal is an activity target; a learning commitment is the active lesson/objective; lesson completion is separate. Finishing a session does not finish its lesson; only a confirmed Mark Lesson Complete action does.
- **Approved scope amendment:** the proof of concept adds one persisted, learner-confirmed completion status and its necessary confirmation/completed-state UI. It does not add archived lessons, multiple commitments, or a lesson library; Previous Learning and reactivation remain deferred.
- Recorded focused activity means locally measured time from observed player and browser signals, not verified attention, comprehension, or tamper-resistant evidence.
- Solo progress is browser-local; no account, cloud backup, or cross-device sync is required.
- Archive and reactivation are not part of the approved scope or required acceptance; see the proposed post-core amendment below.
- Daily goals/streaks, full playlist/course systems, and AI tutoring are deferred; no reward is tied to YouTube viewing.

## What We're Building

The required POC is a polished, responsive first-visit landing page, separate lesson/goal Setup view, returning-student My Learning home, and focused YouTube workspace. It supports one active commitment, explicit safe replacement, validated custom goals, browser-local continuity, observable focus protection, Finish session distinct from a separately confirmed Mark Lesson Complete action, recoverable player errors, and an accurate private Focus Cup. Optional finish reflection is included only if it does not delay core behavior. The 2–3 minute demo shows actual application behavior, beginning with the product problem and moving quickly to a real lesson, focus pause, restored Continue Learning state, and the distinct completion flow. The first ten seconds establish the problem and product promise; the demo reaches working controls early rather than spending its opening on slides. Any displayed activity is genuinely recorded; no seeded or accelerated fake progress is allowed.

## Deferred From the POC

- **Previous Learning archive and reactivation — proposed post-core scope amendment, not approved or required.** If separately approved and time permits, every intentionally replaced commitment would be stored locally with its own lesson identifier/link, objective, goal, last confirmed position, cumulative recorded focused activity, and unfinished/finished status. My Learning would show active first and Previous Learning second. Reactivating an archive would first preserve the current active commitment, then restore the selected one without transferring time. Failed switching would preserve both. If browser storage fails or is exhausted, do not overwrite or delete existing records; show an honest error and leave the active commitment unchanged. Do not build a read-only archive just for appearance; if the amendment is not approved/completed, keep the current single-active-commitment behavior and disclose replacement effects.
- Rough added effort: approximately 2–4 active hours to persist all replaced records, add the Previous Learning view, and verify repeated replacements, failed candidates, reloads, no time transfer, and storage exhaustion; another 1–2 hours for reactivation and safe swap/recovery verification. This estimate is additional to the already-required candidate-loading behavior and is provisional before `4-spec`; browser-test setup and storage-failure behavior may change it. Since the required solo core already strains the 2–4 hour target, this addition threatens submission readiness and stays post-core.
- Full playlist discovery, multi-lesson pathways, course library, recommendations, and search marketplace.
- Academic AI/tutoring, PDF workspaces, practice exams, multiplayer rooms, and collaboration unless the solo experience is complete and independently verified first.
- Daily goals, streaks, and long-term date-based history. These require a separate scope proposal and policy review; do not reward or incentivize YouTube viewing.
- Full accounts, identity verification, cloud-backed personal progress, analytics dashboards, payments/monetization, and elaborate shareable achievement cards.
- Dark appearance unless it can be added after the core without reducing accessibility or delivery quality.

## Possible Later Enhancements

The longer-term vision includes daily goals, learning consistency, streaks, and progress history. A private, neutral dated activity record could be explored as a separate scope amendment, but no policy-compliance claim is made; streaks or other watch-based incentives remain excluded pending review. Archive/reactivation, broader curriculum continuity, collaboration, and tutoring may be revisited only after the core solo workflow is accepted and shipped.

## Non-Goals

- Replacing or rehosting YouTube teachers or content, hiding YouTube branding/controls, or promising to remove every platform recommendation.
- Claiming to verify attention, understanding, lesson completion, or syllabus completion from playback time.
- Automatically pausing at goal completion, auto-resuming on return, or marking a lesson complete from watch time or playback position.
- Creating extra pages, navigation, metrics, testimonials, fake students, placeholder AI, or decorative controls without working behavior.
- Reusing any source, asset, UI component, configuration, migration, or database from the previous Bolt.new project.

## Planning Boundary for `4-spec`

No product behavior questions remain open for this PRD. The following implementation choices belong in `4-spec`, not this product definition:

- Browser-local storage mechanism, supported browsers, and exact persistence checkpoint interval. The product requirement is fixed: same-browser continuity, safe failure, and no unload-only persistence.
- Optional collaboration remains a stretch and must not enter the technical plan until the required solo workflow is implemented and independently verified.
- Previous Learning archive/reactivation remains a proposed post-core scope amendment. It is not required by this PRD; implementing it would first require updating the approved scope.

