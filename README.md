# Rautaloki

Weight training log for a few users. Each exercise is trained in **cycles**: a program of
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

Users log in with a **name and password**. Names match case-insensitively, and an
unknown name can be created as a new user from the login screen, with the password
given there (at least 8 characters). Each user can read and write only their own file.
The session is an HttpOnly cookie holding a token signed with `data/secret` (created on
first start; deleting it logs everyone out), and it is also marked Secure when the
request arrives through an HTTPS proxy (`X-Forwarded-Proto: https`). After 5 wrong
passwords in a row a user's login is held off for a minute per attempt.

Set or change a password from the shell, which also ends that user's old sessions:

```bash
node server/passwd.ts <name>    # asks for the password; RAUTALOKI_DATA as for the server
```

### Docker

```bash
docker build -t rautaloki .
docker run -d -p 8910:8910 -v "$PWD/data:/data" rautaloki
```

The image runs as uid 1000 with the data in `/data`. Put it behind an HTTPS proxy
before exposing it to the internet.

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
| `data/users/<id>.json` | one user: name, all their cycles, timer tempo per exercise, and body weight and stretching sessions |
| `data/passwords.json` | scrypt password hashes by user id, never sent to the UI |
| `data/secret` | the key session cookies are signed with |

A cycle stores `scores`, one per program week: kg lifted, `"-"` for a skipped
week, `null` for not done yet, and beside them `scored`, the date each one was
entered (missing in data from before it was kept). Records, improvements and the next proposal are
derived from these, never stored. Saves carry the file's ETag (`If-Match`), so a
stale tab gets a 412 instead of overwriting another device's entry.

Body weight and stretching sessions are kept beside the cycles as `sessions`: the date, the
day or routine, its seconds (work per interval, or seconds per hold) and the exercises
actually performed, each with the repeats counted over all rounds or `null`. Their
exercises, days and routines are fixed in code (`shared/bodyweight.ts`,
`shared/stretching.ts`), so they need no file in `data/`.

New users are created from the login screen as `data/users/<id>.json`, with the id
derived from the name.

## Rules

All in `shared/training.ts`:

- **target** for week *w* = old best × program % of week *w*, rounded to the nearest 0.5 kg
- **performance** of a done week = kg lifted / that week's target
- **proposal** for the current week = target × best performance so far + adjustment, rounded to the nearest 0.5 kg
- **adjustment** is set with − / +, each tap moving the shown load to the next lighter or
  heavier loadable weight, so a tap always changes it even where loads are more than
  0.5 kg apart or the plan is below the empty bar
- **load** = the heaviest weight in the equipment's table not above the proposal,
  shown as the plates to put on. Barbell 7 kg, dumbbell handle 1 kg; equipment
  kind is chosen from the catalog in this order: Barbell, Dumbbells (pair),
  Dumbbell (single), other
- **new best** = max(old best, test result); a skipped test keeps the old best
- **training week** runs Monday 00:00 to Sunday 24:00. Dates are reckoned in
  `TIME_ZONE` (Europe/Helsinki), not the device's zone. A cycle whose latest entry,
  result or skip, falls in the current week is shown below the others, dimmed and
  ticked, with every control still usable

## Timer

The ▶ Timer button on a training card runs the week's sets and speaks the calls aloud
(browser speech synthesis, English), with the timings of the old time2xercise timer
(`shared/timer.ts`): 15 s to get ready, a "lift" per repeat every 5 s (3 s when *fast*,
7 s for doubles) with the last three counted down "3, 2, 1", "relax" at the end of a
set, and the next round announced 6 s before a rest ends. Rest is 1 min in 10-set work,
3 min for singles and MAX sets, otherwise 2 min. MAX and TEST sets run until *Set done*
is tapped. The screen is kept on while the timer is open.
The tempo is set per exercise with − / + on the timer, before the start or while it runs,
in steps of 25 % of normal speed (50 % to 325 %); a change mid-set keeps the lifter on the
same repeat. It is kept in the user's file as `tempo`, by exercise id. With a keyboard,
p or space pauses and + / − change the tempo. *Done* on the final screen saves the
weight in the entry field, like the card's Done button.

## Body weight

The *Body* tab runs the five days of the old time2xercise "Fitness" body weight timer
(`shared/bodyweight.ts`, `shared/intervals.ts`): each day is three rounds of its 3-5
exercises, each a one minute interval of work and rest, with a minute between rounds.
The level is work:rest, from 30:30 to 60:00 in 5 s steps, set with − / + and proposed
from the last session of that day (else of any day). The timer says the next exercise in
each rest, "go" at the start, and counts the last three seconds; at 60:00 there is no rest
and the next exercise is called by name. An exercise counts as performed once its work
has run 3 s; at the end the repeats of each performed one can be entered (optional, none
for holds), and *Save* stores the session. *Log without timer* records one by hand.
A day done this week goes below the others, dimmed and ticked, as cycles do.

## Stretching

The *Stretch* tab has guided routines (`shared/stretching.ts`), following the usual advice:

- **Warm-up**: dynamic moves before lifting (30 s each, 20 s per side), because long
  static holds right before lifting lower strength and power a little, while a dynamic
  warm-up does not.
- **Full body** and **Hips and back**: static stretches after training or on a rest day,
  held at mild tension, 2 holds per side alternating sides, so about 60 s per muscle group
  at the default 30 s hold (15-60 s with − / +). At least 2-3 days a week; daily is best.

Sources: ACSM's [stretching and flexibility guidelines](https://www.acsm.org/blog-detail/acsm-certified-blog/2021/03/18/stretching-and-flexibility-guidelines-update),
Simic et al. 2013, [Does pre-exercise static stretching inhibit maximal muscular performance?](https://pubmed.ncbi.nlm.nih.gov/22316148/),
Behm & Chaouachi 2011, [A review of the acute effects of static and dynamic stretching on performance](https://pubmed.ncbi.nlm.nih.gov/21373870/).

## Stopwatch

The ⏱ button in the header opens a plain stopwatch: Start, Stop (and Continue), Reset.
It says only the whole minutes, "1 minute", "2 minutes", and so on, and stores nothing.
