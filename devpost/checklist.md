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
  PRD ref: `prd.md > Home, saved-return, and entry`, `prd.md > Setup and candidate lesson loading`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > Editorial landing page`, `spec.md > Focused Setup view`, `spec.md > YouTube URL parser`, `spec.md > YouTube API loader and player adapter`, `spec.md > Commitment repository and runtime validation`
  Build: Scaffold React, TypeScript, and Vite at the canonical origin; create the editorial landing, accessible Setup, URL/goal validation, typed IFrame API adapter, and minimal workspace with actual standard YouTube controls. Add the minimal validated version-1 record needed to save a confirmed candidate before entering the workspace; full restoration and storage-fault safeguards follow in slice 2. Preserve form values on load failure and distinguish API readiness, candidate cue, and blocked autoplay. Establish the palette and responsive shell.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, and `npm run build`; test URL/goal boundaries, candidate states/errors, initial validated commit, adapter lifecycle, and blocked autoplay with a fake player. Perform an early real-embed smoke check in Chromium and record its observed result separately from fake-player tests.
  Learner check: Open `http://127.0.0.1:5173`, read the first screen, try a valid and invalid lesson URL, then say whether the story, Setup, and real player make sense and feel usable.
  Commit: `Build first visit and YouTube lesson entry`

- [x] **2. A saved lesson survives reload and opens through Continue Learning**
  Becomes usable: The current commitment persists in this browser; My Learning restores its lesson, objective, goal, position, and paused Continue Learning path.
  Why now: Same-browser continuity is the product's central promise, so it must work before activity tracking and later actions add more data.
  PRD ref: `prd.md > My Learning and commitment continuity`, `prd.md > YouTube error recovery and local persistence`
  Spec ref: `spec.md > My Learning view`, `spec.md > Commitment repository and runtime validation`, `spec.md > Same-origin tabs and stale writes`, `spec.md > Unverified writes and reconciliation`, `spec.md > Data Model`
  Build: Extend the initial codec and repository with full load validation, confirmed writes, unsaved/unverified/stale feedback, guarded revision checks, external storage-event handling, and paused restoration. Build My Learning and goal editing while preserving accumulated activity. Keep one active commitment and no archive.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`; cover codec validation, rejected and unverified writes, reconciliation, external-tab updates, stale pre-write checks, goal edits, reload, and paused restore.
  Learner check: Save a lesson, reload the canonical URL, use Continue Learning, and confirm the same lesson and goal return without autoplay; try a second tab and inspect its stale-data guidance.
  Commit: `Persist one commitment and restore learning`

- [x] **3. Eligible study activity fills an honest Focus Cup**
  Becomes usable: While a confirmed foreground lesson plays, bounded observed intervals increase recorded activity; interruption stops it, and the Focus Cup reflects the saved total.
  Why now: Focus accounting is the main reliability risk and the remaining part of the unique kernel. It needs deterministic tests and real-browser observations before completion flows depend on it.
  PRD ref: `prd.md > Focused study, activity, goal reached, and session finish`, `prd.md > YouTube error recovery and local persistence`
  Spec ref: `spec.md > Browser focus signal source`, `spec.md > Focus controller and activity accounting`, `spec.md > Focus Cup`, `spec.md > Testing seams and suites`
  Build: Add the browser focus source, separate focus controller, bounded monotonic sampling, periodic progress and position checkpoints, ambiguous-iframe feedback and recheck, explicit resume, and original accessible SVG/CSS Focus Cup. Preserve the saved-versus-unsaved distinction and reduced-motion support.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`; test stale gaps, suspension, duplicate events, all ineligible states, reload without double count, ambiguity recovery, Cup arithmetic, and reduced motion. Record real Chromium/Firefox iframe and focus observations without treating simulated signals as native proof.
  Learner check: Play a real lesson, pause and switch away, return without automatic playback, then confirm the displayed total and Cup change only during eligible activity.
  Commit: `Record focused activity and render Focus Cup`

- [x] **4. The student can finish a session or mark a lesson complete deliberately**
  Becomes usable: Finish session retains an unfinished commitment; a separate confirmed action persists the student's Completed status and keeps progress available after reload.
  Why now: These distinct decisions rely on verified position, activity, and storage checkpoints and complete the main study-return journey.
  PRD ref: `prd.md > Focused study, activity, goal reached, and session finish`, `prd.md > My Learning and commitment continuity`
  Spec ref: `spec.md > Study workspace`, `spec.md > Commitment domain and goal calculations`, `spec.md > Commitment repository and runtime validation`, `spec.md > App shell and entry coordinator`
  Build: Wire Finish session, learner-confirmed Mark Lesson Complete, paused return to My Learning, status persistence, goal-reached feedback, and the completed lesson's Start another lesson path. Keep goal reach, video end, and position separate from completion.
  Verify (mechanical): Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`; verify finish-versus-complete transitions, confirmation cancel, failed saves, reload, continued totals, and no automatic completion or playback.
  Learner check: Finish a session and reopen it as Unfinished; then confirm Mark Lesson Complete and reload to see Completed with the prior progress intact.
  Commit: `Separate session finish from lesson completion`

- [x] **5. Intentional replacement and the full student journey work end to end**
  Becomes usable: A student can intentionally replace one lesson while failed candidates preserve saved progress, and the full first-visit-to-return flow is responsive, accessible, and ready for hands-on review.
  Why now: Replacement is consequential and depends on the existing record, candidate player, and confirmed persistence; final integrated checks catch cross-screen issues after each behavior works alone.
  PRD ref: `prd.md > Setup and candidate lesson loading`, `prd.md > My Learning and commitment continuity`, `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > YouTube API loader and player adapter`, `spec.md > Commitment repository and runtime validation`, `spec.md > Testing seams and suites`, `spec.md > Look and Feel`, `spec.md > Implementation Sequence and Technical Acceptance`
  Build: Add explicit continue-or-replace confirmation, candidate isolation, failed/uncertain-save recovery, and successful replacement with zero transferred activity. Support one supplied playlist as the same single commitment: preserve its ID, show actual ordered items, current returned title, accessible selection, and honest unavailable-data fallback. Complete responsive and keyboard polish, error states, Playwright journeys, real-browser checks, and run instructions without adding deferred features.
  Verify (mechanical): Run all Vitest and Playwright suites, `npm run typecheck`, and `npm run build`; check video and playlist URL parsing, playlist panel count/order/selection and failure fallback, preserved activity, invalid/unavailable candidate preservation, successful replacement, storage faults, mobile widths, keyboard access, reduced motion, and real YouTube behavior in Chromium/Firefox. Record any browser limitation instead of claiming unsupported guarantees.
  Learner check: Follow the whole journey, including a failed replacement and a successful one, on desktop and mobile width; report anything confusing, broken, or visually weak.
  Commit: `Complete safe replacement and integrated study flow`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1, before the remaining visual and study work is locked in
- [ ] Final kick-the-tires exploration and feedback completed — after slice 5

## Verified Follow-up

- [x] Optional Light/Dark presentation preference implemented without changing the commitment record or product scope. The browser-local value is validated, read-back confirmed, keyboard accessible, and applied across Home, Setup, My Learning, Privacy & Data, and the study workspace. Invalid or unavailable storage falls back to Light; a failed preference write is reported as visit-only.
  Verification: `npm run typecheck`, `npm test` (51 passed), `npm run test:e2e -- --workers=1` (44 passed across Chromium and Firefox), plus the final focused theme subset (6 passed across both browsers), `npm run build`, and `git diff --check`. Visually inspected Home/story and study-workspace captures at 1440×900 and 390×844 in both themes; also inspected dark Setup, My Learning, and Privacy & Data captures at desktop size. The Focus Cup was reviewed in workspace and My Learning captures.
  Browser evidence: the real YouTube embed smoke test passed in Chromium and Firefox. Focus/minimize behavior remains subject to the separate manual browser checklist; simulated focus tests are not native focus verification.

## Final Review

- [ ] Re-test the Home-first saved-return story, separate My Learning destination, and workspace back-to-Home action; report any remaining issue and confirm readiness.
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
- On 2026-10-25, the learner approved one supplied YouTube playlist as an alternative single active commitment. This remains narrow: actual IFrame API IDs/order, current title only, no Data API key or metadata service, and no discovery/collections.
- On 2026-10-25, final review identified that saved records bypassed the editorial Home and the study back action opened My Learning. The approved POC now keeps Home as the entry point, makes My Learning a separate destination, and provides contextual Continue Learning; the landing story follows the supplied exam-pressure/resource-switching narrative. Scope remains unchanged. Automated checks pass; final learner retry is pending.
- On 2026-10-25, focused workspace feedback added an above-player playlist toggle, an explicit collapsed Session actions indicator, and four persisted Focus Cup vessel styles. Legacy version 1 records default to glass without a migration write; vessel changes preserve all study progress. This does not close the final learner-review checkpoint.
- On 2026-10-25, an optional Light/Dark presentation preference was implemented under a separate validated browser-local key. The technical spec records this follow-up as draft pending learner review; scope and PRD remain unchanged.
