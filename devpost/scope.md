---
doc: scope
status: approved
---

# K12Learn2Gether

A focused learning workspace that helps students commit to one YouTube video or one supplied playlist, record focused activity, and return to where they left off; studying with a friend is optional.

## The Unique Kernel

K12Learn2Gether helps students stop searching for the next resource and continue the learning commitment they already chose. It preserves the lesson, objective, goal, playback position, and recorded focused activity based on app-observed signals so a student can use a prominent Continue Learning action instead of starting over. The private Focus Cup visualizes that activity without claiming understanding or completion.

## Who It's For

An Indian school student in Classes 9–12 preparing in mathematics or science with free lessons from a YouTube teacher they trust. They save too many resources, watch a little, lose their place, and begin searching again. A friend may join, but solo use must be complete and useful on its own.

## The Core Loop

Choose one embeddable YouTube video or one supplied playlist as the active learning commitment; set an objective and focused-time goal; study in a quiet workspace; and let the app save recorded focused activity and the latest confirmed video position. For a playlist, the student can inspect YouTube's actual ordered video IDs and select an item while keeping the same commitment and activity total. When the student returns, Continue Learning restores the unfinished commitment and private Focus Cup. Finish session ends only the current study period. When the learner says they have finished the lesson, a separate confirmed Mark Lesson Complete action records that self-reported status. If they try to choose another lesson, they explicitly choose to continue the current commitment or replace it. They can optionally finish with a short reflection or next action. An optional guest room may add shared host-controlled playback after the solo loop works.

## Inspiration & Identity

Calm, professional, readable, and responsive, using warm white, electric lime, soft pink, and black. The private Focus Cup is a lightweight SVG or CSS illustration with dimensional shading, an accurate proportional fill, and restrained animation that respects reduced motion. Keep the standard YouTube player and controls visible. The workspace can reduce distractions around the player, but it cannot promise to remove all YouTube platform links or recommendations without altering the embedded player.

## Why This Matters to the Learner

This comes from the learner's own experience: excellent free YouTube teachers were available, but recommendations, Shorts, playlist hopping, unfinished courses, and scattered study tools made it hard to focus and continue. The product should improve the environment around teachers students already trust, not replace them or rehost their lessons.

## What "Working" Looks Like

The primary demonstration is solo: a student chooses a video or supplied playlist, writes an objective, sets a goal, studies, switches away, and sees playback pause and focused activity stop. Later they reopen the app in the same browser and use Continue Learning; the commitment, current playlist item when applicable, last confirmed playback position, saved focused activity, goal, and Focus Cup fill are restored accurately. Finish session leaves an unfinished commitment active. A separate confirmed Mark Lesson Complete action sets the learner-reported completed status without claiming comprehension. When they try to replace an unfinished commitment, the app asks them to continue it or intentionally replace it. A failed or unavailable replacement leaves the current commitment intact. If the optional collaboration slice is completed, a second real browser joins an expiring invitation, follows host playback changes, and keeps its own recorded focused activity total. The main "that's useful" moment is continuing without searching again.

## In Scope

### Required solo learning

This amendment adds learner-confirmed completion and one supplied YouTube playlist as an alternative to a single video; it does not add archived lessons, discovery, or multiple active commitments.

- One active learning commitment containing either one student-selected, embeddable YouTube video or one supplied playlist, one short objective, and one personal focused-time goal. Playlist activity belongs to this one commitment. Playlist discovery, recommendations, saved playlist collections, cross-playlist paths, and syllabus libraries remain out of scope.
- For a supplied playlist, use the official IFrame API to show actual ordered video IDs and select an item. Show a title only when YouTube returns it for the current item; do not fabricate titles or lengths. Unavailable playlist entries show a fallback and preserve the prior commitment. Do not add a Data API key or metadata service.
- A distraction-reduced learning workspace with a prominent Continue Learning action for the saved unfinished commitment.
- If the student attempts to select a different lesson while one is unfinished, offer an explicit choice to continue the current commitment or intentionally replace it. Do not replace or clear saved progress silently. Validate that the URL is supported, then attempt to load the candidate while leaving the current saved commitment untouched. Do not assume embedding availability can always be verified in advance. Commit the replacement only after the player confirms the candidate loaded without an error; if loading fails or reports an error, keep the existing commitment and its progress.
- Browser-reported focus protection: count time only while the YouTube player reports playing, the page is visible, and the app window is focused where the browser reports it. A paused, buffering, hidden, unfocused, errored, or otherwise interrupted player does not accrue time. Where supported, hiding or blurring the app pauses local playback and stops counting; regaining focus never auto-starts playback. Browser/player signals are an activity proxy, not proof of attention, comprehension, or tamper resistance.
- Persist the selected video or playlist ID, actual playlist video IDs/order when available, current item/index, objective, target duration, latest confirmed playback position, lesson status (unfinished/completed), session state, and recorded focused activity milliseconds in the same browser profile so reload restores the commitment. Do not require accounts, a backend, or cross-device sync for solo use. Choose the browser-local persistence mechanism in `4-spec`. Save during activity and on meaningful state changes; an unload event may help but must not be the only save path. Clearing browser site data may erase this local progress.
- A private Focus Cup showing recorded focused activity relative to the student's goal, capped at 100%; 15 of 25 minutes displays 60%. Use SVG or CSS, accurate time and percentage, restrained fill animation, and reduced-motion support. It is informational and private, with no prizes, points, badges, public ranking, or playback gating.
- An optional short reflection or next action on explicit finish. Time toward a goal is activity only, not evidence of comprehension or automatic lesson completion.
- A separate, deliberate **Mark Lesson Complete** action in the learning workspace. It requires clear confirmation, ends any active study session, pauses playback where supported, checkpoints the latest confirmed position and all eligible recorded focused activity, and persists a completed status. Completion means only that the learner says they finished this lesson; it does not verify understanding, mastery, exam readiness, or syllabus completion. Neither reaching the goal, ending a session, reaching the end of the YouTube video, nor playback position can complete the lesson.
- My Learning distinguishes unfinished and completed commitments. A completed commitment shows a clear **Start another lesson** action; it does not autoplay or begin another lesson. The completion status and commitment details persist in the same browser.
- Clear recovery for invalid YouTube URLs, unavailable or embedding-disabled videos, and interrupted playback. Stop the timer on player errors or non-playing states. Report what happened and let the student retry or choose another lesson. Errors must not erase the saved commitment or award time.

### Optional collaboration stretch, only after solo acceptance criteria pass

- One host may create a private room and invite one guest using a high-entropy, expiring bearer link. The server enforces expiry and a two-person limit. No student accounts, identity verification, or personal student profiles are included; possession of a forwarded link grants its remaining access.
- Host play, pause, and seek updates are shared on a best-effort basis. This is not frame-perfect synchronization. Late join/reconnect follows the latest room state; autoplay restrictions may require the guest to click play. Unavailable or unembeddable videos show an honest error.
- Focus state and saved total of recorded focused activity remain participant-specific and private. If the guest loses focus, their local player pauses and their timer stops without broadcasting a room pause to the host. On return, the guest can reapply the latest host position/state; playback resumes only after any required user gesture. A host focus-loss pause is a host playback change and therefore reaches the guest.
- If collaboration cannot be completed and tested after the solo flow, leave it out of the demo rather than substitute simulated participants or synchronization. Solo learning and persistence remain complete.

## Success and Acceptance Criteria

### Required solo experience

- A student can select one valid embeddable YouTube video or supplied playlist, define an objective and goal, start studying, and find the saved commitment through Continue Learning.
- A supplied playlist panel opens/closes accessibly, reflects YouTube's real entry count and order, and selecting an entry updates the current video while preserving the same commitment and activity total. Tests cover playlist-only and watch URLs containing both `v` and `list`; missing entries show an honest fallback without replacing saved progress.
- Attempting to replace an unfinished lesson presents the explicit continue-or-replace choice. Choosing continue preserves the current lesson and all progress. Choosing replace is intentional; attempt to load the supported URL while retaining the old saved commitment. Do not claim embed availability is known in advance. Commit only after the player confirms the candidate loaded without error; invalid URLs or candidate load/player errors preserve the old commitment and progress.
- Reloading or reopening the app in the same browser restores the lesson, objective, goal, unfinished/finished state, last confirmed playback position, and accumulated focused time. Saving does not rely on unload alone. Tests verify that restored time is not duplicated.
- Player pause, buffering, hidden page, reported window blur, player error, or interrupted/non-playing playback each stops focused-time accumulation. Where focus-loss signals are available, playback pauses; returning does not auto-resume. Tests confirm no focused activity is recorded for these conditions and that unobserved/suspended timer gaps are not counted.
- Focused time is calculated only from observed intervals where the player reports playing and browser focus/visibility conditions pass. Call the locally measured metric “recorded focused activity.” It uses observed player and browser signals; it does not prove human attention or comprehension and is not tamper-resistant verification.
- A video error is recoverable and does not erase the existing saved commitment or add focused time.
- Focus Cup time and fill match saved data, including 15/25 minutes = 60%; state is restored after reload, remains private, and fill motion is disabled or reduced when the user requests reduced motion.
- The student can explicitly finish and optionally save a reflection. Neither reaching the goal nor filling the cup claims understanding or lesson completion.
- **Finish session** pauses playback where supported and checkpoints the position and eligible recorded focused activity while leaving an unfinished lesson unfinished.
- Only confirming **Mark Lesson Complete** changes the commitment to completed. Tests confirm that focus-goal reach, session finish, video end, and playback position do not change lesson status.
- A completed lesson's status, lesson, objective, personal goal, latest playback position, and recorded focused activity remain saved after reload in the same browser and the view offers Start another lesson without autoplay. Completion is a learner self-report, not a comprehension or mastery claim.
- The demonstration uses a real YouTube embed and actual player/browser signals and recorded focused activity, with no fabricated activity or AI response.

### Optional collaboration acceptance, only if the stretch is built

- A second browser joins with a valid invitation; expired/invalid links and a third participant are rejected by server-side checks.
- Host playback commands reach the guest on a best-effort basis; a late guest receives the current state. A guest focus loss stops only their local playback/time and does not change the host's playback or progress. The demo uses two real browser sessions, not fake participants.

## Later

Playlist discovery/recommendations, saved playlist collections, and cross-playlist continuity; curriculum and subject pathways; revision tools; actual shared AI tutoring; broader analytics; and learning-consistency features, only after review for YouTube policy compliance.

## Explicitly Cut

- Reusing code, components, assets, database schema, migrations, or configuration from the earlier Bolt.new implementation.
- Full student accounts, identity verification, profiles, cloud-backed personal progress, cross-device sync, multiple saved courses, arbitrary group sizes, multiple rooms, playlist discovery/recommendations, and a full curriculum library.
- Watch-time rewards or incentives, points, XP, badges, streaks, leaderboards, claims of comprehension, and automatic completion claims. The Focus Cup is a private factual visualization, not a reward. YouTube's [developer policies](https://developers.google.com/youtube/terms/developer-policies) prohibit incentives or rewards for engaging with YouTube, including viewing content.
- Frame-perfect synchronization, guaranteed autoplay, and claims that browser signals prove attention or resist a deliberately modified client.

The 2–4 hour course timebox is aggressive even for the solo flow with local persistence, focus protection, replacement safeguards, and video-error recovery. Keep solo learning as the required build. Treat collaboration as a stretch after solo acceptance passes; if time runs short, omit it entirely rather than weakening the core. If solo work itself runs long, cut the optional reflection and decorative cup shading first.
