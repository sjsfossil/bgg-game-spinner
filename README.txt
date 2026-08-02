BGG Game Spinner

FILES
- index.html
- manifest.webmanifest
- sw.js

HOW TO TEST ON A COMPUTER
1. Put all three files in the same folder.
2. Run a simple local web server in that folder:
   Python: python3 -m http.server 8000
3. Open http://localhost:8000

HOW TO USE ON IPHONE
The files need to be hosted on an HTTPS website. Easy hosting options include GitHub Pages,
Netlify, or Cloudflare Pages. After hosting:
1. Open the site in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

APP WORKFLOW
1. Export your BGG collection as CSV.
2. Tap Import BGG CSV.
3. The app keeps owned games with zero logged plays and excludes expansions by default.
4. Tap SPIN THE WHEEL.
5. Review the selected game's details and your BGG comment.
6. Tap Play It or Pass. The game is removed from the active session.
7. Use Reset Session to restore all eligible games.

NOTES
- The most recent imported CSV and session choices are saved locally in the browser.
- The app looks for common BGG CSV headers including name, own, numplays, subtype, and comment.
- Importing a new CSV does not upload it anywhere; processing happens in the browser.
