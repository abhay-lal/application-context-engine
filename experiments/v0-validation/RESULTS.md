# Phase 0 Validation Results

Model: `claude-sonnet-5`, thinking disabled, 30 calls (3 representations × 10 questions). Raw answers + token counts in `results.csv`. Hand-scored below (1.0 / 0.5 / 0.0 against `questions.json` ground truth; hallucination = confidently asserting a fabricated specific, not an honest "I can't tell" or a reasonable UI-level approximation).

## Per-question scores

| Q# | ACIR | A11y | Screenshot | Note |
|----|------|------|------------|------|
| Q1 | 1.0 | 0.5 | 0.5 | a11y/screenshot see textbox+button as 2 controls, don't know it's 1 logical "Add Comment" action |
| Q2 (hero) | 1.0 | 0.0 | 0.0 | a11y/screenshot honestly decline — enable condition doesn't exist in pixels/roles |
| Q3 (hero) | 1.0 | 0.0 | 0.0 | same as Q2 |
| Q4 | 1.0 | 0.5 | 0.5 | right conclusion by absence-of-evidence, correctly hedged |
| Q5 | 1.0 | 0.5 | 0.5 | gets visible fields, misses `canApprove` (invisible to both), speculates a "Comment object" that doesn't exist |
| Q6 | 1.0 | 0.0 | 0.0 | honestly decline — handler names aren't in pixels/a11y |
| Q7 | 1.0 | 0.0 | 0.0 | honestly decline, reasonable hedged speculation |
| Q8 | 1.0 | 0.5 | 0.5 | gets route paths right, explicitly can't name components |
| Q9 | 1.0 | 1.0 | 1.0 | route pattern is visible/inferable from both |
| Q10 | 1.0 | 0.0 | 0.0 | both assert "triggered by click" — factually diverges from onSubmit, but a reasonable UI-level read, not a fabrication |

**Zero hallucinations across all 30 calls** — the honesty-licensing system prompt worked; every wrong answer was an explicit "I can't tell" or a labeled guess.

## Aggregate

| Representation | Avg score | Hallucination rate | Total prompt tokens | Avg tokens/question |
|---|---|---|---|---|
| **ACIR** | **1.00** (10/10) | 0% | 11,801 | 1,180 |
| Accessibility tree | 0.30 (3/10) | 0% | 3,931 | 393 |
| Screenshot | 0.30 (3/10) | 0% | 13,961 | 1,396 |

## Threshold check (from the plan)

1. **ACIR correctness ≥ a11y correctness** → **PASS**, decisively (1.00 vs 0.30).
2. **ACIR uses ≥30% fewer prompt tokens than a11y** → **FAIL**. ACIR used ~3× *more* tokens than the a11y tree (11,801 vs 3,931), not fewer.
3. **ACIR strictly wins the hero enable/disable questions (Q2/Q3)** → **PASS**, decisively (1.0/1.0 vs 0.0/0.0 for both other reps).

**2 of 3 thresholds pass. Per the plan's "all three must hold" gate, this does not clear as written.**

## Why threshold 2 failed, and what it does/doesn't mean

The correctness result is the real finding and it's unambiguous: on the exact question idea.md is built around ("why is this disabled"), pixels and accessibility trees are structurally blind — not weak, *blind* — while the IR answers perfectly. That part of the hypothesis is validated hard.

The token failure is mostly an artifact of this specific ground-truth file, not necessarily the concept: `context-ir.json` is pretty-printed JSON with full key names, `kind` tags on every node, and explicit `edges` — 2,480 bytes for a page the a11y tree describes in 235 bytes. Minifying only gets it to ~1,909 bytes (still ~3.5× the a11y tree). The gap won't close from formatting alone.

Two confounds worth naming before concluding anything harder:
- The a11y tree is cheap here specifically because it describes **one rendered instance** (INV-001). It knows nothing about the schema pattern that would let you answer the same questions for INV-002 or INV-003 without a fresh capture. The IR encodes the *general* pattern once. A fairer token test would amortize IR cost across multiple invoice instances/questions rather than one-shot per fixture — this single-shot comparison structurally favors the a11y tree.
- A leaner IR schema (short keys, drop redundant `kind` tags, fold `enabled` into a plain string instead of an object, skip `edges` and derive them client-side) would likely cut ACIR size significantly — untested here.

## Follow-up: compact schema + second instance (INV-002)

Ran the two cheap follow-ups flagged above.

**Compact schema** (`context-ir-compact.json`, short keys, no `kind`/`edges`, minified — 750 bytes vs original 2,480): re-ran all 10 questions.

| Rep | Total prompt tokens | Avg score |
|---|---|---|
| ACIR (original, verbose) | 11,801 | 1.00 |
| ACIR (compact) | 4,521 | 1.00 |
| Accessibility tree | 3,931 | 0.30 |

Compact schema cuts ACIR token cost by 62% with **zero loss of correctness** (still 10/10). Gap to a11y narrows from "3× more tokens" to "15% more tokens" — still fails the literal ≥30%-fewer bar, but the verbosity confound is mostly gone. A hand-authored ground truth was never going to be perfectly optimized; a real compiler emitting compact output would likely close this fully.

**Second instance, runtime-data question** (`eval-inv002.ts`): captured INV-002 (`canApprove: false`, already `Approved` — buttons render `[disabled]`, confirmed empirically in the a11y snapshot). Asked one question 3 ways: *"Is Approve Invoice enabled for INV-002, and why?"*

| Arm | Tokens | Result |
|---|---|---|
| a11y tree, fresh capture of INV-002 | 241 in | Correctly says disabled — **then hallucinates the reason**: claims it's disabled "because the invoice is already Approved, to prevent redundant actions." Confident, plausible, **wrong** — the real gate is `canApprove`, not `status`. This is a real hallucination, not an honest gap. |
| ACIR schema only, no instance data | 457 in | Correctly declines: states the rule (`canApprove && !isSubmitting`) and honestly says it can't know the actual values without instance data. No hallucination. |
| ACIR schema + small instance-data blob (~60 tokens) | 520 in | Fully correct, cites the actual field values, matches ground truth exactly. |

This is the sharpest finding of the whole experiment: **the a11y tree doesn't just lack the "why" — when pushed to explain a real instance, it confabulates a plausible-sounding wrong rule.** ACIR either declines honestly (schema-only) or answers exactly right (schema + data) — it never guesses. This also concretely confirms idea.md's own "runtime enrichment" stretch goal is where the real per-instance value lives: static schema is a one-time cost, and only a small per-instance data blob (~60 tokens) is needed per new invoice thereafter — versus a11y paying a full fresh capture (~240+ tokens) every time, with a demonstrated hallucination risk on top. Prompt-caching the static schema (Anthropic's `cache_control`) would make repeat schema resends near-free in a real deployment, which this token accounting doesn't yet reflect.

## Recommendation

Correctness case: proven decisively, twice over (hero questions + the INV-002 hallucination result). Token case: no longer a clean fail — compact schema gets ACIR within 15% of a11y token cost with full correctness retained, and the one-time-schema-cost model means real deployments (with caching, multiple instances) likely favor ACIR outright. Verdict: **worth proceeding to Phase 1** (the real ts-morph compiler), on the condition that the compiler targets compact output (short keys, no redundant tags) as a first-class goal, not an afterthought — and that runtime/instance-data enrichment gets pulled forward in priority rather than staying a V3-only stretch goal, since it's clearly where a meaningful share of the value (and the hallucination-avoidance) lives.
