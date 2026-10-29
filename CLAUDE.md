# CLAUDE.md

Rautaloki: weight training log for a few users, replacing Google Sheets.
README.md documents the data model and the training rules; read it first.

- `shared/` holds the types and pure training rules, used by the UI and the tests. The rules
  reproduce the old sheets' formulas exactly, and `shared/training.test.ts` pins them to
  values read from the sheets (e.g. a deadlift proposal of 62.5 kg), using `fixtures/`.
  Do not change the rules without updating those expectations deliberately.
- `server/` is plain `node:http` and runs as TypeScript with no build step (Node 24 type
  stripping). That means: only erasable syntax (no enums, no parameter properties), and
  local imports carry an explicit `.ts` extension. `tsconfig.json` enforces both.
- `src/` is the React UI (Vite). It is mobile-first, used at the gym on a phone.
- `data/` and `import/xlsx/` are personal and gitignored; the GitHub repo is **public**.
  Never commit them, and keep personal data out of fixtures, tests and docs.
- `data/` is the live data, JSON files written whole by the server. Never hand-edit them
  while the server runs. Test against a copy via `RAUTALOKI_DATA=/some/copy PORT=8911`.
- Checks: `npm test`, `npm run typecheck`, `npm run build`.
