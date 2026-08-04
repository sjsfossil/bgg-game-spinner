BGG Game Spinner v6 — Supabase Database

Upload these files to the root of your GitHub repository:
- index.html
- manifest.webmanifest
- sw.js

Do not upload collection.csv. The collection is imported into Supabase from inside the app.

First use:
1. Publish the files with GitHub Pages.
2. Open the site and refresh.
3. Sign in with the user created in Supabase Authentication.
4. Tap Import or update BGG CSV.
5. Choose the CSV exported from BoardGameGeek.
6. Wait for the import-complete message.

Synced across devices:
- Collection
- Play/Pass decisions
- Game scope, player count, and maximum time settings

The Supabase publishable key is intentionally present in index.html. Security depends on Row Level Security.
Never place a Supabase secret or service-role key in these files.
