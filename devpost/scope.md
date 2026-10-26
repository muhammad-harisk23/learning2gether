---
doc: scope
status: draft
---

# K12Learn2Gether — Product Scope

## Learner-defined problem

Learners can already find useful lessons from teachers they trust, but repeatedly searching, comparing resources, switching between them, distraction, and losing their place make it difficult to follow through. K12Learn2Gether is about learning continuity, not discovering more content: it helps a learner return to a chosen lesson with their objective, goal, playback position, and honestly recorded activity intact.

The approved planning narrative records the learner's experience of excellent free YouTube teachers alongside recommendations, Shorts, playlist hopping, unfinished learning, and scattered study tools. This is a paraphrase of the existing planning material, not a new learner quote or a claim about an interview beyond what those artifacts record.

## Who It Is For

An Indian secondary-school learner, especially a student in Classes 9–12 studying mathematics or science from a YouTube teacher they already trust. Solo use must be complete and useful without an account or a friend. The learner chooses the teacher and lesson; the app supports focus and continuity rather than replacing the teacher or hosting the lesson.

## Core objective

Help the learner stop searching for the next resource and continue the useful learning commitment they already chose: save a trusted resource, return to it, focus under observable browser/player conditions, and continue from the last confirmed position.

## Original success definition

The approved solo demonstration was a learner choosing a lesson, writing an objective, setting a goal, studying, interrupting the session, then returning in the same browser. Playback should pause when the app can observe an interruption; eligible activity should stop; returning should restore the unfinished lesson and its progress paused, without autoplay. Finishing a study session must not itself mark the lesson complete. Completion is a separate, confirmed learner-reported status, not evidence of understanding.

The original Focus Cup was an honest visual representation of eligible recorded activity against the learner's goal. Its fill could reach 100%, but it must not imply comprehension, mastery, or completion.

## Original boundaries and decisions

- The approved baseline was one active learning commitment: one learner-selected embeddable YouTube lesson, one objective, and one personal focus-time goal. Replacing an unfinished commitment required an explicit decision; a failed candidate could not discard saved progress.
- The product was solo-first. A private room with one guest appeared only as an optional stretch after the solo journey worked; it was not required scope and is not part of the shipped POC.
- The learner should not need an account, backend, or cross-device sync for solo continuity. Browser-local data may be lost if site data is cleared.
- Activity was to be based on observed player, page-visibility, and browser-focus signals, not represented as verified attention. No time should count while paused, buffering, hidden, unfocused, errored, or otherwise interrupted.
- The visual direction was calm, professional, readable, and responsive, using warm white, electric lime, soft pink, and black. Keep YouTube controls visible, use accessible controls, and respect reduced motion.

### Explicitly out of scope in the approved plan

No required collaboration, student accounts, backend, cross-device sync, AI tutoring, rehosting lessons, content discovery/recommendations, course or syllabus library, archive/reactivation, points, badges, public ranking, or rewards for watch time. YouTube's recommendations and links inside the embedded player could not be promised away without altering that player.

## Final scope amendment / Post-build scope evolution

The shipped application expands the original one-active-commitment boundary into a Personal Learning Library. A learner can save multiple YouTube videos or supplied playlists; each saved resource has independent metadata and progress. The app still opens one selected resource at a time. The one-supplied-playlist path was separately recorded as a planning refinement before the library expansion; it is not evidence that the original scope included a course library or playlist discovery.

The final POC also includes:

- Per-resource playback checkpoints, goal, learner-marked completion, and eligible activity; same-browser return restores the selected resource paused.
- Dated activity summaries and a streak derived from local calendar days with at least 10 minutes of eligible recorded activity.
- A Focus Cup choice of glass, coffee cup, mug, or bottle; its display is capped at the goal while recorded minutes remain uncapped.
- Daily Focus, Learning Recap, and eligible Goal Reached cards using saved values, with 1080×1350 PNG export, optional resource details, and native image sharing when the browser supports it.
- Light/dark appearance, responsive layouts, keyboard-accessible controls, and reduced-motion handling.

These are final-state amendments, not claims about the original interview or approved one-commitment scope. The library, dated summaries, streak, and share cards are supported by later implementation history, including `bab68e1b857a45cfbc0202d1c3dd5dafae69c727`. Git does not record a learner observation as the reason for each addition; none is attributed here.

## Final boundaries

The current POC remains browser-only and local to the same browser profile and origin. It does not provide accounts, cloud or cross-device sync, AI tutoring, recommendations, backend anti-cheating, verified-attention claims, a course-discovery library, or hosted YouTube content. A supplied playlist is played through YouTube's player; the app does not discover or curate playlists.

This amendment is a draft for learner review. The earlier approved scope and later evolution remain distinguishable in Git history.

## Git history and review status

The original generated scope is in `e56837b7ebf333a4fb8bc620c031d13e43fcb6f1` (`draft`). It was first marked `approved` in `545e795ce117b0a8e9652fa17170ba384704e8a3`; the last committed scope revision marked `approved` is `197822e5be7a0fac50c85221cff3faa76d84d5cc`. This current amendment is local and remains `draft`; no Git history has been rewritten.
