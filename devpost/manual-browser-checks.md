# Manual Browser Verification Record

## Automated real YouTube embed smoke tests

Run on 2026-10-25 with `@playwright/test` 1.64.1 against `http://127.0.0.1:5173`.

- **Chromium:** passed. The official YouTube IFrame API loaded, the sample video `M7lc1UVf-VE` was confirmed as the selected candidate, and the player reported `playing`. Clicking the real video surface paused playback and the player state changed to `paused`.
- **Firefox:** passed. The same real embed reached the selected candidate and the player reported `playing`. Clicking the real video surface paused playback and the player state changed to `paused`.
- These are real YouTube embed checks inside Playwright-managed browser processes. They establish API load and actual player-reported playback state for this sample video, not native desktop focus behavior.

## Focus signal tests

The real iframe-click observation in both browsers reported `visibility=visible`, `hasFocus=true`, and `iframeActive=true`. The full Playwright workspace suite passed in Chromium and Firefox for player-state gating, second-level counter updates, hidden-page pause requests, no automatic resume, playlist UI behavior, and storage persistence. The test changes visibility/focus signals through a controlled test fixture. These checks verify the application's response to those signals only.

## Not manually verified

- Native browser focus behavior during a tab switch, minimize, or external-application switch while the real YouTube iframe remains active; the real click check only observed a visible, focused window in both engines.
- Real YouTube playlist entry availability, ordering, and titles for the learner's supplied playlist. Automated playlist tests use a fake IFrame API response; they verify rendering and selection logic, not live playlist data.
- Real autoplay-blocked behavior, dedicated YouTube control-button interaction, and seeking.

No browser compatibility claim is made for those unverified cases. Use one active study tab for the POC. The app must stop crediting time on ambiguous focus and must not claim it can distinguish every OS-level focus change.
