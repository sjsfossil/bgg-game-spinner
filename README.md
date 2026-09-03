# The Howling Meeple Companion

A household board-game companion built around a BoardGameGeek collection. The current product foundation supports game-night selection, BGG synchronization, household tags, a queue, completed-play logging, history, recommendations, learning links, statistics, and collection health.

## Deployment

- Frontend: GitHub Pages from `index.html`, `manifest.webmanifest`, and `sw.js`
- Backend: Supabase project `yivnzvgexutjacljqijr`
- Database: versioned SQL lives under `supabase/migrations/`
- Edge Functions: deploy the source under `edge-functions/`
- BGG access: configure the `BGG_API_TOKEN` Edge Function secret

The Edge Functions in this repository mirror the deployed production versions. Keep the function slug lowercase: `sync-bgg-collection`.

## Developer tools

Developer-only BGG tests are hidden during normal use. Add `?developer` to the site URL to display them.
