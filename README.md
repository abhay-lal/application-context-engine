# Application Context Engine

Application Context Engine (ACE) is an AI-native compiler and analysis engine that transforms applications into structured context representations. Instead of forcing AI agents to understand rendered interfaces, ACE extracts the application's objects, actions, state, workflows, and relationships directly from source code, enabling faster, cheaper, and more reliable reasoning.

- **What is it?** An engine/compiler.
- **Why does it exist?** To expose application context to AI.
- **Why is it better?** It avoids reasoning over pixels or raw UI.

See [idea.md](./idea.md) for the project's original concept doc — it describes long-term aspirations beyond what's implemented today. [ROADMAP.md](./ROADMAP.md) is the current-status source of truth.

## Status

Application Context Engine is an experimental compiler that transforms React + TypeScript applications into a structured application context for AI agents.

- **Phase 0 (hypothesis validation): done.** Before building a real compiler, we tested whether a compiled context IR actually beats an accessibility tree or a screenshot for LLM reasoning about a UI. It does, decisively — 1.00 vs. 0.30 average correctness, zero hallucinations for the IR. The sharper finding: asked to explain a real disabled button, the accessibility tree didn't just lack an answer, it confidently invented a false one. Full writeup: [`experiments/v0-validation/RESULTS.md`](experiments/v0-validation/RESULTS.md).
- **Phase 1 (core compiler): done.** A real ts-morph-based compiler, not a prototype — 35 passing tests, including an end-to-end test that checks the compiler's output against the Phase 0 validated ground truth byte-for-byte.
- **Scope:** React + TypeScript + react-router only. See [ROADMAP.md](./ROADMAP.md) for what's implemented vs. planned.

## Quick Start

```
ace build ./my-react-app                       # compile source → context-ir.json
ace build ./my-react-app --pretty              # indented, human-readable output
ace build ./my-react-app --out my-graph.json   # custom output path
ace build ./my-react-app --quiet               # suppress the checkmark summary
```

`ace` is the CLI name; the remaining planned subcommands (`serve`, `visualize`, `inspect`, `query`) are sketched in [idea.md](./idea.md#cli-surface-vision).

## Example

`experiments/v0-validation/fixture-app` is a small React + TypeScript + react-router "invoice approval" app — the same fixture Phase 0's validation and the test suite both use. Its core control is an Approve/Reject button pair gated by `invoice.canApprove && !isSubmitting`, which is the literal example this whole project is built around (see [`RESULTS.md`](experiments/v0-validation/RESULTS.md) for why an accessibility tree gets this wrong and the IR gets it right).

```
$ ace build experiments/v0-validation/fixture-app --pretty
✓ 4 Components
✓ 2 Routes
✓ 2 Objects
✓ 2 State Variables
✓ 3 Actions
✓ Generated context-ir.json
```

`context-ir.json`:

```json
{
  "version": 1,
  "routes": [
    ["/invoices", "InvoiceListPage"],
    ["/invoices/:id", "InvoiceDetailPage"]
  ],
  "objects": {
    "Customer": [["id", "string"], ["name", "string"], ["email", "string"]],
    "Invoice": [
      ["id", "string"],
      ["status", "'Pending'|'Approved'|'Rejected'"],
      ["amount", "number"],
      ["customerName", "string"],
      ["canApprove", "boolean"]
    ]
  },
  "state": {
    "InvoiceDetailPage": [["isSubmitting", "boolean"], ["comment", "string"]]
  },
  "actions": {
    "InvoiceDetailPage": [
      { "label": "Approve Invoice", "trigger": "onClick", "handler": "handleApprove", "enabled": "invoice.canApprove && !isSubmitting" },
      { "label": "Reject Invoice", "trigger": "onClick", "handler": "handleReject", "enabled": "invoice.canApprove && !isSubmitting" },
      { "label": "Add Comment", "trigger": "onSubmit", "handler": "handleAddComment", "enabled": null }
    ]
  }
}
```

An agent can now answer "why is Approve disabled?" by reading `enabled`, directly — no screenshot, no accessibility tree, no guessing.

## How It Works

```
source files → project.ts (ts-morph project load)
             → util/componentDetection.ts (find components)
             → extractors/{state,actions,objects}.ts + extractors/routes/reactRouterDetector.ts
             → assemble.ts
             → AceGraph
```

The IR format itself is documented independently of this implementation in [`docs/acir-spec.md`](docs/acir-spec.md).

## IR Format

The compiled output is called ACIR (Application Context IR) — a compact JSON document describing an app's routes, objects, state, and actions. It's specified independently of this compiler so other tooling (or other compilers) can target the same format. See [`docs/acir-spec.md`](docs/acir-spec.md) for the full spec.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for what's implemented, known limitations, and what's planned.

## License

Apache License 2.0 — see [LICENSE](./LICENSE).
