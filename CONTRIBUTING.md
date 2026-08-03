# Contributing

Application Context Engine (ACE) is an early, experimental project — see [ROADMAP.md](./ROADMAP.md) for what's implemented vs. planned. Contributions are welcome, especially against the "Known limitations" and "Planned" sections there; those are the most concrete places to start.

## Setup

```
npm install
npm run build   # compiles src/ -> dist/
npm test        # runs the vitest suite
```

## Project layout

- `src/extractors/` — one file per IR category (`state.ts`, `actions.ts`, `objects.ts`, `routes/`). Each is independently testable and mostly independent of the others.
- `src/assemble.ts` — orchestrates the extractors into the final `AceGraph`.
- `src/schema/types.ts` — the canonical IR schema. If you change it, update `docs/acir-spec.md` to match.
- `test/` — one test file per extractor, plus `assemble.test.ts` (end-to-end snapshot against `experiments/v0-validation/`) and `stats.test.ts`.
- `experiments/v0-validation/` — the fixture app and validation harness Phase 0 used; `assemble.test.ts` treats `context-ir-compact.json` there as ground truth.

## Ground rules

- **Never fabricate.** If something can't be resolved confidently, return an explicit `null` or a sentinel (see `ActionEntry.handler`'s `"<inline>"`/`"<unresolved>"`) — never a guess. This is the project's core differentiator versus reasoning over screenshots/accessibility trees, so it's a hard rule, not a style preference.
- **Compact by default.** The IR schema is deliberately terse (short/grouped keys, tuple-style properties) — this was measured, not aesthetic (see `experiments/v0-validation/RESULTS.md`). Don't add fields "just in case"; if you need a new field, justify the token cost.
- **Document gaps, don't silently guess around them.** If your change has a known limitation, add it to `ROADMAP.md`'s "Known limitations" section rather than leaving it undocumented.
- Add a test for any new extractor behavior. Prefer reproducing the fixture app's real cases (see existing tests for the pattern) over synthetic-only coverage.

## Submitting a change

1. Fork and branch from `master`.
2. Make your change, with tests (`npm test` must pass).
3. Open a PR — CI runs the same test suite automatically.
4. If you touched `src/schema/types.ts`, update `docs/acir-spec.md` in the same PR.

## Reporting issues

Open a GitHub issue. For a bug, include the input source (a minimal repro if possible) and the actual vs. expected IR output.
