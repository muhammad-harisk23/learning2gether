---
doc: spec
status: draft
---

# K12Learn2Gether — Technical Specification

## Historical baseline and amendment status

The technical spec was first committed as approved in `545e795ce117b0a8e9652fa17170ba384704e8a3`; its approved planning refinements appear in `197822e5be7a0fac50c85221cff3faa76d84d5cc`, `a7cb62739bf6fc2c7afc20fdca2bc035777a0545`, and `0b189a5155966ebd92366bc0596efcbff0f35765`. That last hash is the latest committed spec marked `approved`. A later spec revision in `bab68e1b857a45cfbc0202d1c3dd5dafae69c727` was marked `draft` and documented the dark appearance preference. This file is a further draft; the earlier technical plan remains the source for original decisions.

## Original architecture decisions and constraints

The approved plan was a fresh, solo-first browser application for one active learning commitment. Its architectural choices were:

- **React, TypeScript, and Vite** for the client application and static build. No application server, account system, or app API was required.
- **Plain CSS and small original SVG/CSS artwork** for the visual system and Focus Cup. Keep the standard YouTube player controls visible.
- **YouTube IFrame Player API** for playback; validate URLs locally and confirm a candidate with player events before replacing saved data.
- **Separate domain/controller/persistence responsibilities:** pure goal and URL rules, a focus controller driven by browser/player signals, and a small validated persistence record.
- **Browser `localStorage`** for same-origin continuity. Local persistence is not an account boundary, can be cleared or unavailable, and does not sync between devices.
- **Vitest** for deterministic domain/controller tests and **Playwright** for user flows and browser-signal behavior. Simulated browser signals do not prove native OS focus or live YouTube behavior.
- No client router or state-management library for the small original flow; no runtime schema library unless implementation showed a need.
- No collaboration service, accounts, backend, cloud sync, AI tutor, course library, or streak/share-card system in the original architecture.

The central technical uncertainty was focus around a cross-origin iframe. Visible-but-ambiguous focus must not accrue time; browser signals cannot guarantee that every operating-system focus transition is detected.

## Recorded pre-library refinements

Git records approved planning/build refinements before the multi-resource implementation:

- A supplied YouTube playlist was allowed as one active commitment, using player-returned IDs/order and available current-item metadata, without a Data API key or discovery service.
- Home remained the entry point, with a distinct My Learning destination and a contextual Continue Learning action.
- Focus Cup choices and a browser-local light/dark appearance preference were added as presentation refinements. The later spec revision that records dark appearance is itself marked draft.

These refinements do not mean the original plan included a multi-resource library or historical course catalog.

## Final architecture in the current application

### Runtime and state ownership

- Product context: this is for the solo learner defined in `scope.md` and `prd.md`—an Indian secondary student, especially Classes 9–12, who already has a trusted learning resource but can lose continuity through repeated searching, comparisons, distraction, or losing their place. The application supports saving and returning; it does not discover content. Country, age, and class are positioning, not runtime eligibility checks.
- The app is a browser-only React/TypeScript client built with Vite. `src/ui/App.tsx` coordinates Home, setup, My Learning, the selected study workspace, preferences, and persistence feedback.
- `src/domain/` contains resource, goal, vessel, share-data, and YouTube URL rules. UI components render those results; the focus controller owns eligibility decisions.
- The app has no account, server-side database, sync service, or backend API. Resource data is local to the same browser profile and exact origin. Clearing site data can remove it; another profile, host, or port does not share it.

### Library persistence, version, and migration

- `LibraryStateV1` in `src/domain/library.ts` stores a selected resource, multiple independent library items, and bounded dated activity buckets.
- `src/services/persistence/libraryRepository.ts` stores the versioned record under `k12learn2gether.library.v1`. `libraryCodec.ts` validates the stored structure and rejects corrupt or unsupported versions rather than silently replacing them.
- On first load, the repository can migrate the earlier single-commitment record into one library item. It removes the legacy key only after the new library record is successfully written. Writes are checked and report saved, stale, unverified, duplicate, or not-saved outcomes; cross-tab changes can make the current copy stale.
- Each library item owns its commitment and progress: learner-provided title, subject, canonical URL/video/playlist identity, goal, completion status, recorded eligible time, vessel choice, and a timestamped player checkpoint. `sourceVideoId` records a video ID parsed from a learner-supplied playlist URL separately from the current player-selected video ID. The latter is API-derived and expires with its checkpoint; the learner's canonical resource URL and identifiers remain.
- Dated activity is stored separately from per-resource cumulative totals. The repository adds persisted eligible-time deltas to local-date buckets and bounds retained dated history to 400 days. Lifetime totals remain available from saved resource commitments.
- The theme preference is stored separately from learning records.

### YouTube setup, playback, and resume

- `youtubeUrl.ts` validates supported YouTube URL forms. `src/services/youtube/compliance.ts` uses the browser-configured `VITE_YOUTUBE_API_KEY` for a preflight before `PlayerAdapter.cueCandidate()` can create an iframe. A video requires an explicit `status.madeForKids: false`; a playlist is fully paginated and every resolved ID is checked with `videos.list` in batches of 50. Any MFK, unknown status, missing item, API/key failure, or incomplete playlist blocks player creation.
- The IFrame API loader and `PlayerAdapter` cue only a preflight-eligible video or playlist, observe player state/errors, and expose current video ID, available title, playlist IDs/order, and position readings.
- Candidate data is saved only after a player confirmation. Failed or unavailable candidates do not replace saved resource progress.
- The canonical URL and IDs parsed from it, learner-entered names/subjects/objectives/goals/completion choices/vessel preference, and focus records are application data. YouTube API-derived values include eligibility status, playlist items/order, returned titles, player-selected playlist video ID, and IFrame playback position. Eligibility and playlist results are fetched for each open; titles and playlist metadata are transient, not persisted. The player checkpoint and any player-selected playlist video ID have a timestamp and are discarded after 30 days. Expiration keeps the library item and learner data; after successful revalidation the video opens at the learner-supplied URL's video ID, or the first checked playlist item, from the beginning.
- A fresh saved checkpoint restores the last confirmed position paused. Returning to the page does not auto-resume; the learner must explicitly press Play. Without a fresh checkpoint, no position is restored.
- The browser-visible API key must be configured in local/deployment environment settings, restricted in Google Cloud to YouTube Data API v3 and the appropriate HTTP referrers. It must never be committed or unrestricted. Missing keys fail closed.
- In the current working tree, access to the YouTube player is gated by local affirmative acceptance of the privacy disclosure and YouTube Terms. The disclosure is not a formal legal policy or legal-compliance determination.
- Playback requires a network connection and remains subject to YouTube availability, embedding permission, and player behavior.

### Focus eligibility and progress semantics

- `BrowserFocusSignalSource` reads document visibility, `document.hasFocus()`, and whether the YouTube iframe is active. The focus classifier distinguishes confirmed foreground, hidden, confirmed lost, and ambiguous iframe focus.
- `FocusController` credits bounded monotonic intervals only when the study session is active, the player reports playing, and focus is confirmed foreground. Paused, buffering, ended, hidden, confirmed-lost, ambiguous, stale, or invalid intervals do not count.
- Hidden-page and confirmed-focus-loss signals request a pause where supported. Ambiguous iframe focus stops accrual but does not by itself claim a focus loss. Returning never auto-plays.
- These are browser/player activity proxies. They do not prove human attention, comprehension, mastery, presence, or tamper resistance. Native focus behavior with a live iframe is a manual verification boundary.
- `focusGoal.ts` is the canonical goal calculation: the ratio is recorded eligible milliseconds divided by goal milliseconds, clamped to 0–1; display percentage is the floored ratio. Visual fill caps at 100%; actual recorded time is not capped. Each resource retains its own goal and vessel choice.
- A dated local day qualifies for a streak at `10 * 60_000` milliseconds of eligible activity. Streaks use browser-local calendar dates and the retained activity buckets; they are not verified attendance. Date summaries do not assign dates to older activity with no date bucket.

### Focus Cup, activity summaries, and sharing

- `FocusCup.tsx` renders the selected glass, coffee cup, mug, or bottle from vessel artwork. Vessel choice persists with the resource; fill follows the canonical goal ratio.
- `shareProgress.ts` selects saved resource progress and dated activity for Daily Focus, Learning Recap, and an eligible Goal Reached card. Date totals are limited to existing buckets; lifetime totals sum recorded per-resource values. Resource title and subject are optional card details.
- `shareCardSvg.ts` builds the card artwork as SVG, escaping learner-controlled text. `ShareProgress.tsx` renders it to a 1080×1350 PNG through browser image and Canvas APIs.
- The UI detects Web Share support for image files with `navigator.canShare`; when available it offers `navigator.share`. PNG download remains available as a fallback. A successful export or share represents saved app data, not verified learning.

### Appearance and accessibility

Responsive styles support narrow and wide layouts, keyboard-operable controls, and light/dark appearance. Focus Cup and share-card animation have reduced-motion handling. The YouTube player's own controls remain visible.

## Verification boundaries and limitations

Automated tests can establish how the app responds to controlled player and browser-signal inputs; they do not establish OS-level focus accuracy, arbitrary YouTube-link availability, or human attention. Recorded browser checks and pending checks are kept in `manual-browser-checks.md`, separate from automated evidence.

The app does not embed or track MFK videos; unknown eligibility also blocks. The app-owned focus metric is disclosed as: “K12Learn2Gether recorded focus is an app-owned study-session metric. It is not a YouTube metric and does not measure YouTube engagement, verified attention, comprehension, or mastery.” YouTube policy treatment of independently derived metrics remains ambiguous and needs human policy review; this disclosure is not a compliance determination. Determining whether the API Client is child-directed under applicable law requires owner/legal assessment; no legal conclusion is made here. A further policy concern also requires review: developer policies restrict independently derived metrics and caution against restricting or blocking a user's access to YouTube content. The required fail-closed MFK preflight is implemented, but this documentation does not claim that it resolves policy interpretation.

The app also has no account boundary, cross-device backup, backend anti-cheating, or guaranteed protection from other scripts in the same browser origin.

No future backend or hypothetical architecture is specified here. This final-implementation amendment remains `draft` until the learner reviews it.
