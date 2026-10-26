---
doc: manual-browser-checks
status: draft
---

# Manual Browser Checks

These checks require a configured browser/deployment and real YouTube/API behavior. Automated tests use mocked Data API responses and do not count as completing these checks. Leave results unchecked until personally observed.

## YouTube API setup and deployment

- [ ] Enable YouTube Data API v3 in the intended Google Cloud project.
- [ ] Create a dedicated key restricted to YouTube Data API v3 and the exact local/production HTTP referrers required.
- [ ] Configure `VITE_YOUTUBE_API_KEY` in the local or deployment environment without committing the value.
- [ ] Inspect the deployed response headers and confirm the intended `Referrer-Policy` is present.
- [ ] Confirm that a missing key or Data API failure blocks before any iframe is created.

## Eligibility and playback

- [ ] With a known, verified non-MFK video, confirm preflight completes and only then the player is created.
- [ ] With a known MFK video, confirm a concise eligibility message appears and no iframe is created.
- [ ] With a playlist, confirm the entire playlist is checked before an iframe is created; confirm any unresolved/unknown/MFK item blocks the playlist rather than being skipped.
- [ ] Save a resource, return while its checkpoint is fresh, and confirm it opens paused at the last confirmed position.
- [ ] In a controlled local browser record, test a checkpoint older than 30 days; confirm the library resource and learner data remain, the checkpoint/player-selected playlist ID are discarded, and successful revalidation opens from the beginning.
- [ ] Confirm standard YouTube controls remain visible, player dimensions remain at least 200×200, no app overlay covers the player, no autoplay occurs before learner intent, and the app does not download/cache audiovisual content.

## Human policy review

- [ ] Owner/legal reviewer assesses whether the API Client is child-directed under applicable law.
- [ ] Human policy reviewer assesses the app-owned focus metric and the required fail-closed MFK/unknown eligibility behavior against current YouTube policies. The in-app disclosure is not a policy determination.

## Results

No manual verification results are recorded yet. Add observations only after the relevant check is actually performed.
