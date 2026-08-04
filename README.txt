THE HOWLING MEEPLE COMPANION v7.2 — SHARED HOUSEHOLD

Accounts included:
- sjschraml@gmail.com — owner
- miaschraml@icloud.com — member

ORDER OF OPERATIONS

1. SUPABASE DATABASE
Open SQL Editor, create a new query, paste the entire contents of:
HOUSEHOLD_MIGRATION.sql
Run it once.

The migration:
- Creates The Howling Meeple household
- Adds both existing Authentication users
- Moves Seth's existing games and decisions into the household
- Migrates shared filters and BGG username
- Replaces user-only RLS with household membership security

2. GITHUB
Replace these repository-root files:
- index.html
- manifest.webmanifest
- sw.js

Open:
https://sjsfossil.github.io/bgg-game-spinner/?v=7.2
Refresh once.

3. TEST
- Sign in as Seth: confirm games appear.
- Sign out.
- Sign in as Mia: confirm the same games and decision history appear.
- A Play or Pass choice made by either account is shared.

4. EDGE FUNCTIONS
The Edge Function files are included for household compatibility.
They are not required to test the shared collection itself.

fetch-bgg-art:
Replace the existing function code after BGG token approval, or now if desired.
It verifies household membership before updating an image.

sync-bgg-collection:
The included version intentionally reports that BGG approval is pending.
CSV import remains the active collection-update method.

IMPORTANT
Run the SQL migration before publishing the household-aware index.html.
Otherwise the app will report that the account has not been added to a household.
