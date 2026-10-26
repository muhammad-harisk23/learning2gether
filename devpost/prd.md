---
doc: prd
status: draft
---

# K12Learn2Gether — Product Requirements

## Historical basis and review status

The PRD first appears as approved in `545e795ce117b0a8e9652fa17170ba384704e8a3`. Its approved planning revisions are recorded in `197822e5be7a0fac50c85221cff3faa76d84d5cc`, `a7cb62739bf6fc2c7afc20fdca2bc035777a0545`, and `0b189a5155966ebd92366bc0596efcbff0f35765`. The latter is the last committed PRD version marked `approved`. This document keeps that learner-led product narrative as its base and labels subsequent implementation changes separately.

Git preserves the planning documents and their status; it is not an interview transcript. This draft adds no learner quote, testing observation, or undocumented reason for a product change. The approved scope records the learner's experience in paraphrase.

## Product problem

Learners often already have a useful lesson from a teacher they trust. Repeated searching and comparing, switching resources, distraction, and losing their place can make it hard to follow through. The product helps the learner continue a chosen learning thread rather than promising a better discovery feed or replacing the teacher.

## Learner and goals

The primary learner is an Indian secondary student, especially a Classes 9–12 learner studying mathematics or science with a trusted YouTube teacher. The solo journey must be useful without a friend, account, or paid service.

The original product goals were to:

1. Make the problem and promise understandable on Home, then let a learner start one lesson without unnecessary onboarding.
2. Keep one chosen lesson, objective, personal focus-time goal, playback position, and honestly recorded activity together.
3. Stop recording when observable player/browser conditions become ineligible and never resume playback automatically after an interruption.
4. Make continuing an unfinished lesson easier than searching for it again.
5. Keep “Finish session” distinct from the learner's deliberate, confirmed “Mark Lesson Complete” action.
6. Represent recorded activity honestly without implying attention, comprehension, mastery, or exam readiness.

## Original learner decisions and requirements

These describe the approved one-commitment plan, not the later library:

- **One active commitment:** one supported YouTube video (a supplied playlist was later approved as one commitment), one short objective, and one personal goal. The goal is cumulative for that commitment, not a compulsory session limit.
- **Setup and candidate loading:** accept supported YouTube URLs, objective, and goal; default to 25 minutes, offer 15/25/45-minute presets and whole-minute custom values from 5 through 240. A candidate is not committed until the player confirms it loaded without error. A failed replacement preserves the prior commitment and its progress.
- **Focused study:** show the lesson and standard YouTube controls. Count only bounded observed intervals while playback is reported playing, the page is visible, and browser focus is confirmed. Paused, buffering, ended, hidden, confirmed-unfocused, ambiguous, errored, or stale intervals do not count.
- **Interruption and return:** request a pause on observed hidden-page or confirmed-focus-loss signals where supported. Returning never auto-plays. Continue restores the last confirmed position paused.
- **Finish and completion:** finishing ends only the current study period. Marking the lesson complete is separate, confirmed, and self-reported. Reaching the goal, reaching the end of a video, or finishing a session does not mark completion.
- **Replacement:** explain the consequence and obtain an explicit choice. Failed or unavailable candidates leave the saved commitment intact; successful replacement starts with its own goal and no transferred activity.
- **Presentation:** a calm, professional, responsive interface; accessible keyboard controls and visible validation; visible YouTube controls; motion reduced when the user requests it. The Focus Cup fill follows recorded activity relative to the goal, caps visually at 100%, and leaves the actual total visible.

### Original acceptance criteria

- A first-time learner can understand the problem and reach Setup from the editorial Home. A returning learner can find the saved commitment and use Continue Learning.
- The 25-minute default and 15/25/45-minute presets work; whole-number custom goals from 5 through 240 minutes are accepted, and invalid values or URLs produce clear outcomes.
- A failed candidate does not replace saved progress. Playback is attempted only after a confirmed candidate and an explicit start action.
- Activity advances only during eligible observed playback; interruption stops accrual, and return does not autoplay.
- Reloading in the same browser restores the selected lesson, objective, goal, last confirmed position, recorded activity, and status. Continue opens paused.
- Changing the goal preserves the activity total and recalculates the displayed ratio. Finish does not complete a lesson; only confirmed learner action records completion.
- The app identifies browser-local persistence and its clearing/data-loss limitation. It does not claim that browser signals prove attention or learning.
- Key workflows remain usable with a keyboard, at narrow widths, and with reduced motion enabled; player controls are not obscured.

## Original out-of-scope decisions

The approved plan did not require a multi-resource library or course path, resource recommendations/discovery, persistent archives, a required friend/room/collaboration service, accounts, backend, cross-device sync, AI tutoring, rehosting lessons, analytics, payments, ads, public rankings, rewards, or verified-attention/anti-cheating claims. A room with one guest was only an optional stretch after the solo experience; it is not shipped.

## Post-build product evolution

The implementation expanded from one active commitment to a Personal Learning Library. Multiple videos or supplied playlists can be saved, and each resource retains independent metadata, goal, activity, completion, and playback checkpoint. A learner can select one resource at a time and return to it paused. This is a product expansion, not an original interview requirement.

Other code-backed additions are:

- Dated local activity buckets and day/week/month/year summaries where dates are available, alongside lifetime totals from saved resource records.
- A streak based on local calendar days with at least 10 minutes of eligible activity.
- Per-resource Focus Cup choices (glass, coffee cup, mug, or bottle), with capped visual fill and uncapped recorded minutes.
- Daily Focus, Learning Recap, and conditionally available Goal Reached share cards based on saved data; resource details are optional. Export is a 1080×1350 PNG; image sharing is offered only when supported, with download available.
- Light/dark appearance and reduced-motion/responsive presentation.
- In the current working application, an affirmative local privacy-disclosure/YouTube-Terms gate precedes player access. This is an implementation detail, not a learner quote or evidence of legal approval.

Git records the library implementation in `bab68e1b857a45cfbc0202d1c3dd5dafae69c727` and later UI work in the history. The repository does not record a specific learner observation or decision as the reason for the post-build expansion.

## Final requirements

- Support multiple saved YouTube videos or supplied playlists, with one selected resource open at a time and independent per-resource progress.
- Keep resource details and progress in validated, versioned browser-local storage for the same origin/profile. No account or cross-device synchronization is provided; clearing site data can erase data.
- Restore a fresh last-confirmed playback checkpoint paused and require an explicit learner action to resume. Discard the IFrame-derived checkpoint and player-selected playlist video ID after 30 days without deleting the learner's saved resource or its learner-provided URL/IDs.
- Before creating a YouTube player, require YouTube Data API v3 verification that the single video or every paginated playlist item has an explicit `status.madeForKids: false` result. Block MFK, unknown, unresolved, or failed checks; this is not a content-quality judgment. Playlist order and current-item details remain transient.
- Accrue activity only for bounded observed intervals while playback is reported playing, the page is visible, and browser focus is confirmed. Browser/player signals are an activity proxy, not proof of attention, comprehension, or presence. Ambiguous intervals earn no time; supported interruption signals request a pause.
- Keep the goal, Focus Cup ratio, actual recorded minutes, completion, and activity history distinct. A local day qualifies for the streak at 10 minutes of eligible recorded activity; dates use the browser's local calendar.
- Build share cards from saved values only. Older totals without date buckets are not assigned invented dates. PNG download remains available if Web Share with image files is not supported.
- Preserve keyboard access, responsive layouts, light/dark appearance, and reduced-motion behavior.

### Limitations and remaining boundaries

The product has no server, account, cloud backup, or cross-device sync. YouTube playback requires network access and remains subject to YouTube availability and embedding behavior. Browser signals cannot verify attention or guarantee perfect OS-level focus detection. The post-build compliance amendment adds a Data API preflight and fails closed for MFK/unknown content; it is not an MFK tracking branch and does not establish policy compliance. YouTube policy treatment of app-owned focus metrics and restrictions on content access still need human review. The privacy disclosure is not a legal review or a claim of compliance.

This amended PRD remains `draft` until the learner personally reviews and approves it.
