---
doc: scope
status: draft
---

# K12Learn2Gether

A focused learning workspace that helps students make and resume honest progress through YouTube lessons they choose, alone or with one study partner.

## The Unique Kernel

K12Learn2Gether is about learning continuity, not a watch party: a student returns to the same unfinished lesson with their own goal, playback position, and genuinely recorded focused time intact. A second student can join the same private room and follow the host's lesson controls, while each student's focus progress remains independent. The Focus Cup makes that saved activity visible without claiming that time proves comprehension.

## Who It's For

An Indian school student in Classes 9–12 who studies mathematics or science from a YouTube teacher they trust, but gets distracted, hops between lessons, or loses track of where they left off. They may invite one friend to study the same lesson.

## The Core Loop

Choose one embeddable YouTube lesson, set a short learning objective and focus-time goal, and open a private room. Invite one partner. Study with best-effort host-controlled playback; each student's timer counts only their own app-observed focused activity. Leave and return later to the saved lesson position and progress, then optionally record a short reflection or next action.

## Inspiration & Identity

Calm, professional, readable, and responsive, using warm white, electric lime, soft pink, and black. The Focus Cup is a lightweight SVG or CSS illustration with dimensional shading, accurate private progress, and a restrained fill animation that respects reduced-motion preferences. Keep the standard YouTube player and its controls visible. The visual style should support focus rather than add competing content.

## Why This Matters to the Learner

The idea comes from the learner's experience as a school student: excellent free YouTube teachers were available, but recommendations, Shorts, playlist switching, unfinished courses, and separate study tools made it hard to stay focused and continue where they left off. The product should improve the learning environment around those teachers, not replace them or rehost their lessons.

## What "Working" Looks Like

In a short demonstration, Student A imports one embeddable lesson, sets a goal, and creates a room. Student B joins from a separate browser using the invitation. A's play, pause, and seek state reaches B's player; each student's own active time is recorded separately. After pausing or making a participant's tab inactive, that participant's total stops. Reload the unfinished room: lesson, goal, saved position, and each student's saved time return, and each private Focus Cup shows the corresponding progress. The clearest "that's useful" moment is returning to the unfinished lesson and seeing the real progress still there.

## In Scope

- One learning session containing one student-selected, embeddable YouTube lesson, one personal learning objective, and one target focus duration.
- One host and at most one guest in a private room. A high-entropy, expiring invitation is a bearer credential; possession grants access. The server enforces expiry and the two-person limit. There are no student accounts or verified identities, and no personal student information is needed for this proof of concept.
- Host-controlled, best-effort synchronization of play, pause, and seek. The guest follows the latest room state and saved position when joining or reconnecting. Playback is not frame-accurate; local buffering and network delay can create temporary drift. If a browser blocks scripted playback, that student gets a clear prompt to start playback themselves. Unembeddable or unavailable lessons show an honest error.
- Separate focused-time totals for the two participants. Time may accrue only while that participant's player reports playing, their app tab is visible, and their connection/heartbeat is current. Paused, buffering, hidden-tab, and disconnected intervals do not count. This is an app-observed activity measure, not proof of attention, learning, or comprehension, and not tamper-proof against a deliberately modified client.
- Persistence for the room's lesson, objective, target duration, unfinished/finished state, latest valid shared playback position, and each participant's own accumulated focused time. Reloading an unfinished session restores these values without counting time twice.
- A private Focus Cup showing each participant's saved focused time relative to their own goal. Fill is calculated from saved time divided by the goal (capped at 100%); for example, 15 of 25 minutes displays 60%. Use a lightweight SVG or CSS illustration, smooth restrained animation, and reduced-motion support. It is a neutral, private progress display: no points, badges, prizes, unlocks, public ranking, or playback gating.
- An optional short reflection or next action when a participant explicitly finishes. Finishing records the participant's action; reaching a time goal does not claim that a lesson is complete or understood.

## Success and Acceptance Criteria

- A host can create a room from one valid embeddable YouTube URL and a learning objective and target duration; unsupported video URLs and videos that cannot embed are reported clearly.
- A separate guest browser can join using the valid invitation. Expired/invalid invitations and a third participant are rejected by server-side checks. The room link is treated as a secret: anyone who obtains it can use its remaining guest access.
- Host play, pause, and seek changes reach the guest, and a late or reconnected guest receives the latest room state and position. The product describes synchronization as best-effort and requests a user gesture when needed; it does not claim frame-perfect sync or guaranteed autoplay.
- Each participant accumulates time independently only while all focus conditions are met. Checks confirm no increase during pause, buffering, hidden-tab, or disconnected intervals, and confirm one student's active time never changes the other's total.
- Reloading an unfinished session restores the lesson, objective, goal, saved position, and saved personal totals without losing progress or duplicating elapsed time.
- Focus Cup fill and displayed time match the saved values, including the 15/25-minute = 60% case; the cup restores the same value after reload, remains participant-private, and removes fill animation when reduced motion is requested.
- The demo uses two real browser sessions and a real YouTube embed, with no fake participants, playback state, or study activity.

## Later

Actual shared AI tutoring; broader lesson history and progress analytics; multiple subjects and curriculum pathways; learning-consistency features (only after review for YouTube policy compliance); daily streaks; achievements; elaborate shareable cards; and verified student accounts.

## Explicitly Cut

- Reusing code, components, assets, database schema, migrations, or configuration from the earlier Bolt.new application. This is a new implementation in the Devpost workspace.
- Full account registration, identity verification, and personal student profiles; those exceed this demo's privacy boundary and timebox.
- AI responses, shared question/chat threads, arbitrary group sizes, multiple lessons or playlists, and a full course library.
- Watch-time rewards or incentives, points, XP, badges, streaks, leaderboards, claims of comprehension, and automatic lesson-completion claims. The Focus Cup is a private, factual activity visualization, not a reward. YouTube's [developer policies](https://developers.google.com/youtube/terms/developer-policies) prohibit incentives or rewards for engaging with YouTube, including viewing content.
- Frame-perfect synchronization, guaranteed autoplay, and anti-cheat claims. Browser policy, network conditions, buffering, and the embedded video control what can be guaranteed.

The 2–4 hour course timebox is aggressive for a fresh real-time, persistent two-person experience. Keep the one-room boundary. If time runs short, cut the optional reflection and decorative cup shading first; retain real invitation enforcement, honest time accounting, saved progress, resume, and the Focus Cup's accurate fill.
