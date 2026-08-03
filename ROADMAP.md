# Roadmap

`idea.md` describes the project's original long-term vision (its own V1/V2/V3/V4 sketch). This document tracks actual status. idea.md's originally-sketched "V1" (React, TypeScript, Components, Routes, Hooks, Action Graph) is what **Phase 0 + Phase 1 below already satisfy** — the phase numbering here reflects how the project was actually built (validate the hypothesis first, then build the compiler), not idea.md's version numbering, so don't expect the two to line up 1:1.

## Phase 0 — Hypothesis Validation ✅ Done

Before building a real compiler, validated whether a compiled context IR actually beats an accessibility tree or a screenshot for LLM reasoning about a UI. Result: decisive win on correctness (1.00 vs 0.30 average score, zero hallucinations for ACIR) — and a sharper finding than expected: asked to explain a real disabled button, the accessibility tree didn't just lack an answer, it confidently invented a false one. Full writeup: [`experiments/v0-validation/RESULTS.md`](experiments/v0-validation/RESULTS.md).

## Phase 1 — Core Compiler ✅ Done

- Component detection — top-level function/arrow components, `forwardRef`/`memo` unwrapping ([`src/util/componentDetection.ts`](src/util/componentDetection.ts))
- Domain object extraction from prop types and local variable declarations, deduplicated globally by declaration identity ([`src/extractors/objects.ts`](src/extractors/objects.ts))
- `useState`-based component state extraction ([`src/extractors/state.ts`](src/extractors/state.ts))
- JSX action extraction — button/form triggers, De Morgan polarity normalization for `enabled`, never-fabricate handler resolution ([`src/extractors/actions.ts`](src/extractors/actions.ts))
- react-router route detection, excluding non-local router-utility targets ([`src/extractors/routes/reactRouterDetector.ts`](src/extractors/routes/reactRouterDetector.ts))
- `ace build` CLI producing compact-by-default IR output ([`src/cli.ts`](src/cli.ts))
- `describeInstance()` — static instance-data filtering against the compiled schema ([`src/instance.ts`](src/instance.ts))
- 35 passing tests, including an end-to-end snapshot against the Phase 0 validated ground truth ([`test/`](test/))

Format details: [`docs/acir-spec.md`](docs/acir-spec.md).

## Known limitations (current, not hidden)

- Action detection only looks at `button`/`Button` and `form`/`Form` elements — anchors and custom icon-button components aren't recognized as action triggers ([`src/extractors/actions.ts`](src/extractors/actions.ts))
- Routes with no explicit `path` attribute (index/layout routes) are skipped ([`src/extractors/routes/reactRouterDetector.ts`](src/extractors/routes/reactRouterDetector.ts))
- Routing support is react-router only
- `describeInstance()` is scoped to objects only, not component state — merging live object data with live UI state is a harder problem, deferred (see Planned, below)
- Local-variable object detection can over-include non-domain local types (internal utility/style/param types) — there's no "is this a domain object" precision heuristic yet

## Planned

- **Runtime instrumentation → live Application Context IR** (combine the static IR with a running app's actual state) — promoted to top priority following Phase 0's finding that per-instance data is where a meaningful share of the value (and the hallucination-avoidance) lives; `describeInstance()` is the static half already shipped, this is the harder remaining half
- Next.js file-based routing detection (`pages/`, `app/` conventions)
- React Router v6.4+ data-router (object-literal route) detection
- `useReducer` / `useContext` state tracking
- API-call inference (`fetch`/`axios` call → object mutation)
- Workflow / state-transition graph extraction
- `requires` object-dependency edges
- Graph visualization (`ace visualize`)
- MCP server (`ace serve`) exposing `discoverObjects()` / `discoverActions()` / `describePage()` style tools
- Domain-object precision heuristic (see limitations above)
- Framework expansion: Vue, Angular, Solid, React Native
