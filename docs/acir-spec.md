# Application Context IR (ACIR) — Format Specification

**Status:** Experimental. **Scope (v1):** React + TypeScript + react-router only.

This document describes ACIR as a *format* — the JSON shape a compiler emits and an AI agent consumes — independent of any particular compiler implementation. Application Context Engine (ACE), the compiler in this repository, is the reference implementation, but the format is meant to outlive it.

## 1. Purpose & why a separate spec

Decoupling the format from this one compiler's implementation means:

- Other tooling (an MCP server, a graph visualizer, an evaluation harness) can target the schema without depending on ts-morph or TypeScript compiler internals.
- Other compilers or adapters could, in principle, emit the same shape from a different source language or framework (Vue, Next.js, etc.) — nothing here is intrinsic to React specifically.
- `version` has something concrete to mean: a schema contract independent of any one codebase's release history.

Today there is exactly one implementation (this repo's `src/` compiler) and the format has not yet been validated against a second, independent one. Treat this spec as a snapshot of what that one implementation produces, written down separately so it *can* be targeted independently later.

## 2. Design principles

These aren't aspirational — each is backed by a specific finding from this project's own validation experiment (`experiments/v0-validation/RESULTS.md`):

- **Compactness is a first-class requirement, not polish.** A verbose hand-authored IR (full key names, a redundant `kind` tag on every node, an explicit `edges` array) used ~3× the prompt tokens of an accessibility-tree representation for the same page. Rewriting to short/grouped keys and tuple-style properties cut that to 4,521 tokens from 11,801 (a 62% reduction) with zero loss of correctness (10/10 either way). This is why the schema below groups nodes by owning component/type name instead of repeating a `component`/`kind` field on every entry, and uses `[name, type]` tuples instead of `{name, type}` objects.
- **Never fabricate — decline instead.** Every field that can't be resolved confidently returns an explicit sentinel or `null`, never a guess: `ActionEntry.handler` is `"<inline>"` or `"<unresolved>"` when it can't be resolved to a named function, `enabled` is `null` (not omitted) when an action has no gating condition at all, and a `describeInstance()` helper (library-only, not part of the persisted document) returns `null` for an unrecognized object name rather than passing data through unfiltered.
- **Static schema and live instance data are kept separate, deliberately.** In the validation experiment, an LLM given only an accessibility tree and asked *why* a specific disabled button was disabled didn't just lack an answer — it confidently invented a false one (it attributed the gate to the invoice's `status` field, when the real gate was a `canApprove` field). Given the ACIR schema alone (no data), the same question was honestly declined ("I don't have instance data"); given the schema plus a small (~60-token) instance-data blob, it was answered exactly right. The format intentionally keeps these as two separate concerns — a static document (this spec) plus an optional, additive data overlay — rather than merging them, so a consumer always knows which kind of claim it's making.

## 3. Document shape

An ACIR document is a single JSON object with five top-level fields:

```typescript
interface AceGraph {
  version: 1;
  routes: [path: string, component: string][];
  objects: Record<string, [name: string, type: string][]>;
  state: Record<string, [name: string, type: string][]>;
  actions: Record<string, ActionEntry[]>;
}

interface ActionEntry {
  label: string;
  trigger: string;
  handler: string;
  enabled: string | null;
}
```

### `version`

A flat integer. See §5.

### `routes`

An array of `[path, component]` pairs — the path pattern as written (e.g. `/invoices/:id`) and the name of the component that renders there. Routes whose target resolves to a router-package utility (e.g. React Router's `Navigate`, `Outlet`) rather than a locally-declared component are omitted — they aren't meaningful navigation targets in their own right. Index/layout routes with no explicit path are also omitted in v1 (a known gap, not silently wrong).

### `objects`

Keyed by **type name**, not by component — a type like `Invoice` may be used by several components, and it appears exactly once here regardless of how many places reference it (deduplicated globally by declaration identity, not by name string, so two unrelated types that happen to share a name are never merged). Each value is an array of `[propertyName, type]` tuples, in declared order.

`type` is compact, source-preserving text: primitive and structural types are rendered as written; a property typed as a closed alias to a union of string literals (e.g. `type InvoiceStatus = 'Pending' | 'Approved' | 'Rejected'`) is expanded inline to that literal union rather than left as the bare alias name — a name like `"InvoiceStatus"` on its own is meaningless to a consumer without the alias definition alongside it.

### `state`

Keyed by **component name**. Each value is an array of `[variableName, type]` tuples for that component's local (`useState`) state, in declaration order. A component with no local state has no key here at all — there is no empty-array entry.

### `actions`

Keyed by **component name**. Each value is an array of `ActionEntry` objects, in the order the corresponding elements appear in the component's JSX:

- `label` — the visible text of the triggering element (or, for a form, its nested submit control).
- `trigger` — the JSX event-prop name as written (`"onClick"`, `"onSubmit"`, etc.).
- `handler` — the resolved handler's identifier name, or `"<inline>"` (an unnamed inline callback) / `"<unresolved>"` (couldn't be resolved — e.g. a member-expression handler). Never a guess.
- `enabled` — a **positive-polarity** boolean expression in source syntax, or `null` if the action is unconditional. Positive polarity means a `disabled={!x || y}` prop is rendered here as its logical negation (`x && !y`), not printed as-is — so `enabled` always answers "when can the user do this," never "when can't they."

### What's *not* in the document

- **No `edges` array.** Relationships (which state gates which action, which route renders which component) are derivable from the fields above — a route's `component` value and a component's key in `state`/`actions` are already the join keys — and are intentionally never materialized as a separate structure.
- **No per-node `kind`/`id`/`sourceFile`/`line` tags.** The record key a field lives under already says what it is; source location isn't something "what can the user do" or "why is this disabled" questions need.
- **No `components` count.** A total component-scan count is compiler/library-reporting metadata (see the reference implementation's `AceStats`), not part of this document — a component can be scanned and contribute nothing to `routes`/`objects`/`state`/`actions` (e.g. a pure layout wrapper).

## 4. Worked example

The following is real output from the reference compiler (`ace build`) against the fixture app used throughout this project's validation work (`experiments/v0-validation/fixture-app`) — an invoice-approval page with an Approve/Reject button pair gated by `invoice.canApprove && !isSubmitting`. It is asserted byte-for-byte by this repo's test suite (`test/assemble.test.ts`), not hand-typed for this document:

```json
{"version":1,"routes":[["/invoices","InvoiceListPage"],["/invoices/:id","InvoiceDetailPage"]],"objects":{"Customer":[["id","string"],["name","string"],["email","string"]],"Invoice":[["id","string"],["status","'Pending'|'Approved'|'Rejected'"],["amount","number"],["customerName","string"],["canApprove","boolean"]]},"state":{"InvoiceDetailPage":[["isSubmitting","boolean"],["comment","string"]]},"actions":{"InvoiceDetailPage":[{"label":"Approve Invoice","trigger":"onClick","handler":"handleApprove","enabled":"invoice.canApprove && !isSubmitting"},{"label":"Reject Invoice","trigger":"onClick","handler":"handleReject","enabled":"invoice.canApprove && !isSubmitting"},{"label":"Add Comment","trigger":"onSubmit","handler":"handleAddComment","enabled":null}]}}
```

## 5. Versioning policy

`version` is a flat integer, currently `1`. It is bumped on any breaking change to field shape or semantics. There is no migration or compatibility guarantee pre-1.0 — a consumer should treat `version` as a hard gate (refuse to parse an unrecognized version) rather than attempt to interpret or migrate an unfamiliar shape.

## 6. Non-goals / explicit exclusions (v1)

These are roadmap items, not gaps in this spec relative to some implied larger scope — the format simply doesn't cover them yet:

- API-call inference (a `fetch`/`axios` call resulting in an object mutation)
- Workflow / state-transition graphs (multi-step sequences across actions)
- Live/runtime data merged into the document itself, beyond the additive, library-only `describeInstance()` filter (which validates a caller-supplied instance-data object against the `objects` schema — it does not change this document's shape)
- Non-react-router routing conventions (e.g. Next.js file-based routing)
- Non-React source frameworks

See `ROADMAP.md` for current status on each of these.

## 7. Relationship to the reference compiler

`src/schema/types.ts` in this repository is the canonical, checked-in source of truth for the shape described here. This document is a human-readable mirror of that file, written independently so the format can be reasoned about without reading compiler source. If the two ever diverge, the TypeScript types win until this document is updated to match.
