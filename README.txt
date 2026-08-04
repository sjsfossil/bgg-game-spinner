BGG Game Spinner v4

NEW FILTERS
- No plays only or all owned games
- Exact player count supported by the game
- Maximum BGG playing time

GITHUB UPDATE
Replace index.html, manifest.webmanifest, sw.js, and collection.csv in the repository root.
After committing, open the site with ?v=4 once to bypass an old Safari cache.

FILTER BEHAVIOR
- Player count keeps games where minplayers <= entered count <= maxplayers.
- Maximum time keeps games with BGG playingtime at or below the selected limit.
- Games missing player-count or play-time data are excluded only when that particular filter is active.
