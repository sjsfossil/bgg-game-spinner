BGG Game Spinner v3 — Cross-device collection

Upload these files to the ROOT of the same GitHub repository:
- index.html
- manifest.webmanifest
- sw.js
- collection.csv

The app automatically loads collection.csv whenever it opens, so the same collection appears in any browser.

To update the collection, export a fresh BGG CSV, rename it collection.csv, replace the existing GitHub file, and commit the change.

PRIVACY: A public GitHub Pages site also makes collection.csv publicly accessible. It may contain comments or private comments. Remove anything you do not want exposed. True private syncing requires authentication and a cloud database.

Play/Pass decisions remain stored separately in each browser. Syncing those decisions also requires a cloud database and sign-in.
