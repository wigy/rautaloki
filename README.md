# Rautaloki

Weight training log that replaces the "Weight Training <name>" Google Sheets
(folder *Sport & Health*). Each exercise is trained in **cycles**: a program of
weekly schemes (e.g. *Original*: 4 × "10 x 10", 2 × "2 x MAX", 3 × "4 x 10", TEST)
run from the exercise's **old best**, ending in a test week that sets the new best.

<p>
  <img src="docs/screenshots/training.webp" width="260" alt="Training: this week's weight and plates per cycle">
  <img src="docs/screenshots/timer.webp" width="260" alt="Spoken set timer during a lift">
  <img src="docs/screenshots/how-to.webp" width="260" alt="Form instructions on the training card">
</p>
<p>
  <img src="docs/screenshots/new-cycle.webp" width="260" alt="New cycle: picking the muscle group">
  <img src="docs/screenshots/history.webp" width="260" alt="History of one exercise with its best over time">
  <img src="docs/screenshots/records.webp" width="260" alt="Records by muscle group">
</p>

Screenshots show the made-up example user from `fixtures/`.

## Running

```bash
npm install
cp -r fixtures data   # first time only: reference data and an example user
npm run dev     # API on :8910 (node --watch) + Vite UI on :5173, proxied
npm run build   # typecheck + build the UI into dist/
npm start       # production: one process on :8910 serving dist/ and the API
npm test        # rule tests on fixtures/, plus a consistency check of data/ if present
```

Node ≥ 24 runs the TypeScript server directly (type stripping), so only the UI
has a build step. Settings are env vars: `PORT` (8910), `HOST` (0.0.0.0),
`RAUTALOKI_DATA` (./data).

Users log in **by name only, with no password**. Names match case-insensitively, and an
unknown name can be created as a new user from the login screen. The session is an
HttpOnly cookie holding the user id, and each user can read and write only their own
file. This keeps people from mixing up each other's logs, but it is not security:
anyone who can reach the server can log in as anyone. Keep it on the LAN or behind an
authenticating proxy.

## Data

Plain JSON files with no database. **`data/` is not in git**: it is personal, and this
repository is public. Back it up separately. `fixtures/` holds the same reference files
and a made-up example user, for tests and for starting fresh.

The server rewrites a whole file atomically (temp file + rename) and is their only
writer, so run one instance only.

| File | Content |
|---|---|
| `data/catalog.json` | exercises: main/other muscles, equipment, level, reference URL |
| `data/programs.json` | programs: per week a scheme and a percentage of the old best |
| `data/weights.json` | loadable weights per equipment kind with the plates that make them |
| `data/users/<id>.json` | one user: name and all their cycles |

A cycle stores `scores`, one per program week: kg lifted, `"-"` for a skipped
week, `null` for not done yet. Records, improvements and the next proposal are
derived from these, never stored. Saves carry the file's ETag (`If-Match`), so a
stale tab gets a 412 instead of overwriting another device's entry.

New users are created from the login screen as `data/users/<id>.json`, with the id
derived from the name.

## Rules (from the sheets' formulas)

All in `shared/training.ts`:

- **target** for week *w* = MROUND(old best × program % of week *w*, 0.5)
- **performance** of a done week = kg lifted / that week's target
- **proposal** for the current week = MROUND(target × best performance so far + adjustment, 0.5)
- **load** = the heaviest weight in the equipment's table not above the proposal,
  shown as the plates to put on. Barbell 7 kg, dumbbell handle 1 kg; equipment
  kind is chosen from the catalog in the sheet's order: Barbell, Dumbbells
  (pair), Dumbbell (single), other
- **new best** = max(old best, test result); a skipped test keeps the old best

## Timer

The ▶ Timer button on a training card runs the week's sets and speaks the calls aloud
(browser speech synthesis, English), with the timings of the old time2xercise timer
(`shared/timer.ts`): 15 s to get ready, a "lift" per repeat every 5 s (3 s when *fast*,
7 s for doubles) with the last three counted down "3, 2, 1", "relax" at the end of a
set, and the next round announced 6 s before a rest ends. Rest is 1 min in 10-set work,
3 min for singles and MAX sets, otherwise 2 min. MAX and TEST sets run until *Set done*
is tapped. The screen is kept on while the timer is open.

## Import

`import/import_sheets.py` converted the sheets once (2026-10-29) from the xlsx
exports in `import/xlsx/` (not in git, personal like `data/`): `master.xlsx`
(Weight Master: catalog, programs, weight tables) and one workbook per user
(Scores sheet → cycles). It checks the
derived records against each user's Records sheet; all matched. Points to know
when reading old data:

- Google Sheets read d/m/y input as m/d/y whenever the day was ≤ 12, so those
  cells hold real dates with day and month swapped, and the importer swaps them
  back. Cells it could not parse stayed as text and are read as d/m/y.
- A cycle counts as done if marked `F` or if it has a finish date.
- Not imported: one `#VALUE!` finish date and one text note in an "Add?" column.

`uv run import/import_sheets.py --check` repeats the analysis without writing.
Running it without `--check` **overwrites** `data/` with the sheet contents.
