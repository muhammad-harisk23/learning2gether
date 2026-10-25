---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. A student can choose a lesson and open the real player**
  Becomes usable: The first visit explains the problem, Setup validates one lesson, objective, and goal, and a confirmed YouTube candidate is saved before opening a usable study workspace. No activity is claimed yet.
  Why now: This crosses the first-visit journey and tests the unfamiliar YouTube embed early; the Vite scaffold and visual foundation belong inside this first working step.
  PRD ref: `prd.md > Landing, first visit, and entry`, `prd.md > Setup and candidate lesson loading`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > Editorial landing page`, `spec.md > Focused Setup view`, `spec.md > YouTube URL parser`, `spec.md > YouTube API loader and player adapter`, `spec.md > Commitment repository and runtime validation`
  Build: Scaffold React, TypeScript, and Vite at the canonical origin; create the editorial landing, accessible Setup, URL/goal validation, typed IFrame API adapter, and minimal workspace with actual standard YouTube controls. Add the minimal validated version-1 record needed to save a confirmed candidate before entering the workspace; full restoration and storage-fault safeguards follow in slice 2. Preserve form values on load failure and distinguish API readiness, candidate cue, and blocked autoplay. Establish the palette and responsive shell.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, and `npm run build`; test URL/goal boundaries, candidate states/errors, initial validated commit, adapter lifecycle, and blocked autoplay with a fake player. Perform an early real-embed smoke check in Chromium and record its observed result separately from fake-player tests.
  Learner check: Open `http://127.0.0.1:5173`, read the first screen, try a valid and invalid lesson URL, then say whether the story, Setup, and real player make sense and feel usable.
  Commit: `Build first visit and YouTube lesson entry`

- [ ] **2. A saved lesson survives reload and opens through Continue Learning**
  Becomes usable: The current commitment persists in this browser; My Learning restores its lesson, objective, goal, position, and paused Continue Learning path.
  Why now: Same-browser continuity is the product's central promise, so it must work before activity tracking and later actions add more data.
  PRD ref: `prd.md > My Learning and commitment continuity`, `prd.md > YouTube error recovery and local persistence`
  Spec ref: `spec.md > My Learning view`, `spec.md > Commitment repository and runtime validation`, `spec.md > Same-origin tabs and stale writes`, `spec.md > Unverified writes and reconciliation`, `spec.md > Data Model`
  Build: Extend the initial codec and repository with full load validation, confirmed writes, unsaved/unverified/stale feedback, guarded revision checks, external storage-event handling, and paused restoration. Build My Learning and goal editing while preserving accumulated activity. Keep one active commitment and no archive.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`; cover codec validation, rejected and unverified writes, reconciliation, external-tab updates, stale pre-write checks, goal edits, reload, and paused restore.
  Learner check: Save a lesson, reload the canonical URL, use Continue Learning, and confirm the same lesson and goal return without autoplay; try a second tab and inspect its stale-data guidance.
  Commit: `Persist one commitment and restore learning`

- [ ] **3. Eligible study activity fills an honest Focus Cup**
  Becomes usable: While a confirmed foreground lesson plays, bounded observed intervals increase recorded activity; interruption stops it, and the Focus Cup reflects the saved total.
  Why now: Focus accounting is the main reliability risk and the remaining part of the unique kernel. It needs deterministic tests and real-browser observations before completion flows depend on it.
  PRD ref: `prd.md > Focused study, activity, goal reached, and session finish`, `prd.md > YouTube error recovery and local persistence`
  Spec ref: `spec.md > Browser focus signal source`, `spec.md > Focus controller and activity accounting`, `spec.md > Focus Cup`, `spec.md > Testing seams and suites`
  Build: Add the browser focus source, separate focus controller, bounded monotonic sampling, periodic progress and position checkpoints, ambiguous-iframe feedback and recheck, explicit resume, and original accessible SVG/CSS Focus Cup. Preserve the saved-versus-unsaved distinction and reduced-motion support.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`; test stale gaps, suspension, duplicate events, all ineligible states, reload without double count, ambiguity recovery, Cup arithmetic, and reduced motion. Record real Chromium/Firefox iframe and focus observations without treating simulated signals as native proof.
  Learner check: Play a real lesson, pause and switch away, return without automatic playback, then confirm the displayed total and Cup change only during eligible activity.
  Commit: `Record focused activity and render Focus Cup`

- [ ] **4. The student can finish a session or mark a lesson complete deliberately**
  Becomes usable: Finish session retains an unfinished commitment; a separate confirmed action persists the student's Completed status and keeps progress available after reload.
  Why now: These distinct decisions rely on verified position, activity, and storage checkpoints and complete the main study-return journey.
  PRD ref: `prd.md > Focused study, activity, goal reached, and session finish`, `prd.md > My Learning and commitment continuity`
  Spec ref: `spec.md > Study workspace`, `spec.md > Commitment domain and goal calculations`, `spec.md > Commitment repository and runtime validation`, `spec.md > App shell and entry coordinator`
  Build: Wire Finish session, learner-confirmed Mark Lesson Complete, paused return to My Learning, status persistence, goal-reached feedback, and the completed lesson's Start another lesson path. Keep goal reach, video end, and position separate from completion.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`; verify finish-versus-complete transitions, confirmation cancel, failed saves, reload, continued totals, and no automatic completion or playback.
  Learner check: Finish a session and reopen it as Unfinished; then confirm Mark Lesson Complete and reload to see Completed with the prior progress intact.
  Commit: `Separate session finish from lesson completion`

- [ ] **5. Intentional replacement and the full student journey work end to end**
  Becomes usable: A student can intentionally replace one lesson while failed candidates preserve saved progress, and the full first-visit-to-return flow is responsive, accessible, and ready for hands-on review.
  Why now: Replacement is consequential and depends on the existing record, candidate player, and confirmed persistence; final integrated checks catch cross-screen issues after each behavior works alone.
  PRD ref: `prd.md > Setup and candidate lesson loading`, `prd.md > My Learning and commitment continuity`, `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > YouTube API loader and player adapter`, `spec.md > Commitment repository and runtime validation`, `spec.md > Testing seams and suites`, `spec.md > Look and Feel`, `spec.md > Implementation Sequence and Technical Acceptance`
  Build: Add explicit continue-or-replace confirmation, candidate isolation, failed/uncertain-save recovery, and successful replacement with zero transferred activity. Complete responsive and keyboard polish, error states, Playwright journeys, real-browser checklist, and run/verification instructions without adding deferred features.
  Verify (mechanical): Run all Vitest and Playwright suites, `npm run typecheck`, and `npm run build`; check invalid/unavailable candidate preservation, successful replacement, storage faults, mobile widths, keyboard access, reduced motion, and real YouTube behavior in Chromium/Firefox. Record any browser limitation instead of claiming unsupported guarantees.
  Learner check: Follow the whole journey, including a failed replacement and a successful one, on desktop and mobile width; report anything confusing, broken, or visually weak.
  Commit: `Complete safe replacement and integrated study flow`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1, before the remaining visual and study work is locked in
- [ ] Final kick-the-tires exploration and feedback completed — after slice 5

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — focused investigation of one real design or debugging decision
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: pending final review and learning wrap-up
Route and stops: pending implemented code
Edit outcome: pending
Reflection: pending
Activity mode: pending

## Revisions
