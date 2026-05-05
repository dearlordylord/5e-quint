# D&D 5e PHB — project notes

## Package manager

pnpm workspace. Never use npm.

## No external consumers (CRITICAL)

This is a greenfield project with no users, no published API, no downstream dependencies. **We own the entire stack — Quint spec, XState machine, TS features, MBT bridge, React UI.** Any layer can change to serve any other layer.

Do not treat internal boundaries as walls. When a lower layer needs a change to support a higher layer, change it — don't work around it with adapters, registries, or parallel data structures. The cost of changing `creature.qnt` and updating the MBT bridge is always less than the cost of maintaining a workaround that keeps layers "separate." Design for the system, not for the boundary.

Concretely: adding a field to `ActiveEffect`, renaming a type in the spec, restructuring `DndContext` — all fine. Update the bridge, run MBT, move on.

## No redundant state (CRITICAL)

Never duplicate data that already exists in another layer. Before adding a field to any type, **search for existing fields that carry the same data** across the entire codebase. If found: reference, project, or re-export — don't copy. The cost of threading existing data through a layer boundary is always less than the cost of maintaining two copies that can diverge.

This applies across all layers — Quint spec, XState context, TS types, React state. If a plan proposes adding fields, verify they don't already exist somewhere before implementing.

## Provenance and modeling discipline (CRITICAL)

When modeling content sources, distinguish three different concepts:

- **provenance** — the canonical rules source the shipped data claims to come from;
- **structured input** — machine-readable data used to help import, normalize, or cross-check;
- **runtime projection** — derived execution-facing facts used by the engine.

Do not collapse these into one field or one type.

For monster data in this repo:

- SRD is provenance for shipped SRD monsters.
- 5e-tools is valuable structured data and normalization inspiration, but it is **never** provenance.
- If a collection is supposed to be "the SRD catalog", model it so mixed-provenance or mixed-license states are unrepresentable at the collection boundary.

General design rule:

- **Make invalid states irrepresentable.** This is mandatory before proposing or implementing any data shape. If a proposed type can represent contradictory provenance, contradictory ownership, mismatched derived facts, support-status markers with no type/runtime consequence, or any field combination that is impossible in the code or rules domain, redesign the type before presenting it.
- Optional fields and empty collections must represent distinct domain states. Do not use `undefined` as a second spelling for an empty list. If a type can represent unknown, omitted, and empty, document the domain meaning of each or redesign the type so the invalid distinction is unrepresentable.
- Do not store derivable facts beside their source facts unless the duplication is executable at the boundary that matters. Prefer deriving labels, abbreviations, display names, option ids, and projections from one canonical value or table, so mismatches cannot be represented.
- Do not add status enums or metadata labels that neither affect the type system nor runtime behavior unless there is a specific, durable reason the repo needs them.
- Avoid contrast names such as `normalized`, `legacy`, `current`, `new`, or `promoted` unless the repo owns the opposite concept at the same boundary and the term is domain-backed. Prefer names for the rule, source shape, or domain object being modeled, not names that describe migration mechanics or implementation history.

## Domain-language reflex (extends SRD-parity rules above)

When a union type feels off, the signal to refactor is **domain conflation**, not *just* "is this type-safe?" Type safety matters a lot; it is necessary but not sufficient. A mixed union whose name fits only half its members already lies about the world even if every variant typechecks. Justify splits/renames in domain terms first (e.g., "rest-triggered" vs "calendar-time-triggered" are distinct SRD triggers), and let type safety follow.

## Connascence discipline (CRITICAL)

When changing code, actively look for connascence: code facts that must change together for correctness.

This is mandatory before finalizing any change, especially when adding or preserving:

- string or numeric literals;
- tuple/array index assumptions;
- phase/order/count assumptions;
- support gates and downstream narrowed-type usage;
- duplicated validation/projection/execution logic;
- caller protocols that require a sequence of operations.

Required check:

1. Ask: "What must change together if this line changes?"
2. Classify the coupling:
   - name/type: usually acceptable if explicit and tool-visible;
   - meaning/value/position/algorithm: risky if duplicated or distant;
   - execution/timing/identity: high-risk unless type-enforced or tightly localized.
3. Evaluate locality and degree:
   - strong connascence is acceptable only when nearby and obvious;
   - distant or repeated connascence must be refactored.
4. Prefer refactors that weaken or localize connascence:
   - replace magic values with named constants or domain types;
   - replace positional conventions with named fields;
   - replace duplicated algorithms with one shared implementation;
   - replace caller sequencing requirements with one operation or state-typed APIs;
   - make support-gate facts flow through narrowed types instead of downstream memory.
5. If strong connascence must remain, colocate the coupled facts in one helper/module and name the helper after the domain invariant.

Do not rely on comments alone when code can encode the relationship.

If an assumption is required for correctness, make it executable at the boundary where it matters. Do not replace an executable assumption with an implicit convention unless future changes would either fail to compile or remain semantically correct.

Review trigger words: `current`, `supported`, `slice`, `phase`, `first`, `only`, `activation`, `hole`, `unit`, `index`, `order`, `TODO`, `temporary`, `for now`.

If any trigger appears in changed code, perform the connascence check before proceeding.

## Code review

Code review agents must consult `.claude/review-rules.md` for project-specific quality gates.

When the user asks for a review, findings are the primary output. Enforce the review rules strictly and cite file/line references for every finding.

Assertions are only for facts already established at compile time or by an immediately preceding parser, type guard, support gate, exhaustive match, or narrowed workflow state. Runtime/domain failures such as absent lookups, unsupported authored data, invalid tool input, unreadable content, or session conflicts must be represented as `Either`, `Option`, parser results, or precise discriminated unions rather than exceptions. A throwing helper named `require*` is acceptable only when it asserts an already-proven internal invariant; if it discovers ordinary failure, make the failure typed. Exhaustive/impossible-branch harness throws are acceptable when they assert that every compile-time-known variant has already been handled.

## Memory

Do not write to the memory system unless explicitly asked.

## Worktree agent bug

Worktree creation sometimes branches from a stale ref instead of master's HEAD. When launching a worktree agent, always include in the prompt: `"Before starting, run 'git log --oneline -1 master' and verify your HEAD matches. If not, run 'git rebase master'."` This costs one command and prevents silent divergence that causes unmergeable conflicts.

## MBT tests are nondeterministic

MBT traces are generated with random seeds. Failures may not reproduce on the next run. When an MBT test fails, the error includes the seed (e.g., `seed: 0xfa2124eb`). **Always reproduce before fixing:** `cd packages/core && QUINT_SEED=0xfa2124eb npx vitest run -t "replays Quint"`. Do not dismiss MBT failures as flaky — reproduce with the seed, diagnose, and fix unless the user explicitly says otherwise.

## MBT runs are expensive

Battle MBT (`battle.qnt`) is slow. **Treat runs as a scarce resource.** See `QUINT_CONNECT_TROUBLESHOOT.md` for performance analysis.

- Never run battle MBT for exploratory questions (checking a variable shape, confirming a format). Answer those by reading source code, quint-connect internals, ITF docs, or writing a focused unit test.
- Only run battle MBT for actual end-to-end validation after code changes are complete.
- One MBT run at a time, always. Never launch a second instance without confirming the first is dead (`ps aux | grep vitest`). **Also check for zombie evaluators:** `ps aux | grep quint_evaluator | grep -v grep` — kill with `killall -9 quint_evaluator` if any exist from prior runs.
- If a command gets backgrounded, wait for the task completion notification — do not re-issue.
- **MBT run observation protocol (MANDATORY):** Always run MBT with `run_in_background`. Wrap the command in a timing shell: `START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"`. For runs expected >60s, add a 1-minute progress reporter alongside it.
- **Debug without re-running when possible:** Once you have a failing trace (seed + action sequence), prefer these over re-running MBT:
  1. Write a focused TS unit test that replays the specific event sequence against XState actors directly (milliseconds, no Quint).
  2. Read the ITF trace JSON offline to inspect Quint state at each step.
  3. Trace through the Quint spec logic manually by reading the code.
- **MBT run tiers (choose the right one!):** Wall-clock times include vitest startup (~8–10s overhead). See `BENCHMARK_METHODOLOGY.md` for full measurement data (Night 1, 2026-04-05).
  - **Tier 1 — Battle dev (~15s wall-clock):** `cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 npx vitest run src/battle-projection.mbt.test.ts` — **Use this for iterative development.** Requires compiled cache (`node scripts/compile-battle-spec.cjs`). Vitest overhead dominates; 3-step and 5-step are the same wall-clock (~14s median). Evaluator-only time is ~5–8s.
  - **Tier 1b — Creature MBT (~17s wall-clock):** `cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 npx vitest run src/creature.mbt.test.ts` — creature-level parity only (no battle.qnt). Use when changes are purely creature-level.
  - **Tier 2 — Pre-commit (~12–18s/seed on host, ~25s on Docker):** `cd packages/core && MBT_DEV=1 npx vitest run src/battle-projection.mbt.test.ts` — 1 trace × 5 steps, 10 seeds via `MBT_DEV`. Background it. **Needs ~2GB+ free RAM** — OOMs when available memory is low. On memory-constrained environments, use Tier 1 or run on the host machine.
  - **Tier 3 — CI validation (~15 min):** `MBT_STEPS=10 ./scripts/mbt-fuzz.sh 50` — 50 seeds × 1 trace × 10 steps. Use the fuzz script, NOT a single vitest invocation: a single call will hit a slow seed and hang. The fuzz script isolates each seed with a per-seed timeout.
  - **Tier 4 — Overnight (~92–105s/seed, unlimited):** `MBT_STEPS=640 MBT_TIMEOUT=150 ./scripts/mbt-fuzz.sh` — 640 steps/seed, runs indefinitely. Add `MBT_SAVE_TRACES=1` to save full ITF traces to `fat-traces/<seed>/` for offline analysis. Validated 2026-04-07: 314 seeds × 640 steps, 0 failures, 0 timeouts.
  - **Coverage lever is `MBT_TRACES`, not `MBT_MAX_SAMPLES`.** `MBT_TRACES=N` generates N distinct random walks per vitest call. `MBT_MAX_SAMPLES` is a search budget for invariant checking — irrelevant for MBT trace generation (first walk always succeeds). Do not escalate `MBT_MAX_SAMPLES` expecting more coverage.
  - **Step count scaling (measured 2026-04-07):** Per-seed timing scales linearly with steps: 10→9s, 20→11s, 40→13s, 80→18s, 160→29s, 320→51s, 640→97s, 1280→>180s. At 1280 steps the evaluator exceeds the 180s per-seed watchdog in `mbt-fuzz.sh` (`MBT_TIMEOUT`). **640 steps is the practical limit** with the default 180s watchdog. Default Tier 1/2/3 use 3–10 steps — far below this.
  - **Default to Tier 1.** Never run Tier 2/3/4 for exploratory work. See `QUINT_CONNECT_TROUBLESHOOT.md` for why.
- **If a seed is slow**, re-run without `QUINT_SEED` for a fresh one. Slow-seed rate measured at ~49% for invariant fuzzer (5 samples × 5 steps, 120s timeout) and 0% for battle MBT Tier 1 (10 seeds). Slow seeds are caused by branch count (Finding 14), not nondet range sizes.
- **Slow evaluator? Try different seeds first.** Slow seeds are caused by branch count (Finding 14), not nondet range sizes. Re-run with fresh seeds before considering range narrowing. If narrowing is truly necessary, keep domain-correct ranges as comments and document the narrowing rationale in the code.

## Quint gotchas

Things that cause non-obvious errors, not discoverable by reading code.

- **Reserved names:** `size` is a built-in operator — use `creatureSize` for parameters.
- **Integer division:** Quint `/` truncates toward zero, NOT floor — matters for negative numbers.
- **Cross-file imports:** Must use `from` clause: `import dnd.* from "./dnd"` (bare `import dnd.*` fails silently with "unknown module").
- **Test syntax:** Multiple assertions use `all { assert(x), assert(y) }` — `and { }` causes parse errors in `run` blocks.
- **Verbose test output:** `quint test --match "pattern"` for per-test output (default only shows module name).
- **Rust evaluator GLIBC mismatch:** If MBT tests fail with `EPIPE`, run `./scripts/build-quint-evaluator.sh` (re-run after `npm install`).
- **Apalache / Java:** JDK 17 is installed at `~/.local/java/jdk-17.0.18+8-jre/`. The Bash tool doesn't source `.zshrc`, so prefix Apalache commands with: `export PATH="$HOME/.local/java/jdk-17.0.18+8-jre/bin:$PATH" &&`
- **Nondet must be bare `oneOf()`:** `nondet x = if (cond) A.oneOf() else B.oneOf()` is a parse error (QNT204). The outermost expression must be `oneOf()` or `apalache::generate` — no wrapping `if`, `val`, or function calls. If you need conditional narrowing, accept the wider set and let the guard filter.
- **Apalache record sets:** Apalache needs `var.in(Set)` for record-typed vars before field access. Quint's only way to express record sets is nested `map().flatten()` which enumerates the Cartesian product. This works for small records (~7K elements for FighterState) but is infeasible for large records (CreatureState, TurnState). Don't attempt to build VALID_*_STATES for records with 10+ fields or wide integer ranges.
- **Frame condition verification recipe:** After bulk-adding new class state vars to frame conditions, some actions get missed due to line-ending variations. To catch stragglers: `grep -n "barbarianLevel' = barbarianLevel" creature.qnt | grep -v "newClassState'"` — finds every frame condition that has the *previous* class but is missing the *new* class. Fix all hits before typechecking.
- **Rust backend `mbt::actionTaken` bug:** Bare actions inside `match` arms report the composite name (e.g., `"battleStep"`) instead of the leaf name. Only `any { }` branches get leaf-level tracking. Workaround: wrap every single-action `match` arm in `any { action, }`. See comment in `battle.qnt` above `battleStep`. Upstream Quint bug — not yet filed.
- **ITF variant format:** Parameterized Quint variants (e.g., `RCounterspell(false)`) arrive in ITF as `{tag: "RCounterspell", value: false}`, NOT `{"RCounterspell": false}`. Use `v.value` to access the parameter — `Object.values(v)[0]` returns the tag string. See `ITFVariantWithValue` in `mbt-shared.ts`.

## SRD feature parity (CRITICAL)

The Quint specs are a **direct formalization of the SRD** — nothing more, nothing less. `packages/battle-runtime/battle-runtime.qnt` is the canonical promoted spec for Unit/StatBlock-backed `@dnd/battle-runtime` behavior. Root `battle.qnt` remains legacy/Core broad proof and restore source material, not the active authority for promoted battle-runtime work. `creature.qnt` remains a helper library used by root `battle.qnt` and related legacy/Core tests. Every modeled rule must trace to a specific SRD passage. Do not invent mechanics, add interpretive extensions, or go beyond what the SRD text says. The only sanctioned deviations from RAW (Rules As Written) are documented in `ASSUMPTIONS.md`, curated by the project owner.

- **Model what the SRD says.** If the SRD doesn't define it, don't model it.
- **No homebrew, no "reasonable extensions."** If a rule is ambiguous or the formalization requires a choice the SRD doesn't prescribe, document it in `ASSUMPTIONS.md` — don't silently pick an interpretation.
- **ASSUMPTIONS.md is the sole record of modeling decisions** where the spec makes explicit what the SRD leaves implicit (e.g., turn boundaries, implied constraints, architecture-driven choices). Curated by the project owner, kept minimal and close to RAW.
- **Always consult RAW and ubiquitous language.** Before implementing any rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` for precise terminology. Do not rely on memory or paraphrased understanding of the rules.
- **Local rules corpus first.** `.references/srd-5.2.1/` is the working RAW corpus for this repo. If the needed rule text is missing or insufficient there, stop and tell the user so they can adjust the corpus or direct the source of truth. Do not silently browse external rules sources.

## Quint parity (CRITICAL)

Promoted Unit/StatBlock-backed battle behavior MUST maintain parity with `packages/battle-runtime/battle-runtime.qnt` and the promoted `@dnd/battle-runtime` tests. `battle-machine.ts` and root `battle.qnt` remain a legacy/Core proof-source lane; use them for restore/reference work, not as a competing active authority for promoted battle behavior. `machine.ts` and `creature.mbt.test.ts` remain valuable for helper/local-projection coverage.

- **Never** add logic to an XState machine that diverges from the relevant Quint model without updating the spec first.
- **Never** "fix" runtime behavior that the relevant authoritative Quint model handles differently — update the spec or accept it as spec-level intentional.
- **Never** remove or rename context fields that an MBT bridge maps without checking the relevant parity test first.
- If a simplify/refactor changes behavior, the relevant MBT tests MUST still pass. If they don't, the refactor is wrong.

## TypeScript conventions

- **Parse, don’t validate:** Parse once at the boundary; use the parsed type everywhere else. When code establishes a stronger fact about a value, reflect that fact in the type and pass the narrowed value forward. Do not keep passing the weaker type and re-checking the same property downstream.

  First examples:
  - If a function only makes sense for damage effects, it should accept `DamageEffect`, not `Effect`.
  - Narrow/filter first, then call it. Do not pass `Effect` into the function and check `effect.kind === "damage"` again inside.

- **Return the most precise type available:** If a function can only return one branch of a union, type it as that branch, not the wider union. Example: return `ResolutionResult & { readonly tag: "invalid" }`, not `ResolutionResult`.

- **Brand meaningful primitives early:** If a primitive (`string`, `number`, etc.) carries protocol/domain meaning, give it a branded type at the boundary instead of passing the raw primitive deeper into the code.

- **Typed constant arrays:** When defining a fixed list of domain values (conditions, damage types, etc.), use `as const satisfies ReadonlyArray<T>` to get both literal types and compile-time validation:
  ```typescript
  const CURABLE = ["poisoned", "blinded", "charmed"] as const satisfies ReadonlyArray<Condition>
  ```
  This catches typos and invalid values at compile time. Prefer this over plain `string[]` or unvalidated `as const`.

- **Derive union types from constant arrays:** When a union type and a runtime array contain the same values, define the array first and derive the type with `typeof X[number]`. Single source of truth — no duplication:
  ```typescript
  const CHOICES = ["push", "sap", "slow"] as const
  type Choice = typeof CHOICES[number]  // "push" | "sap" | "slow"
  ```
  When subsets exist, spread them into a combined array and derive from that:
  ```typescript
  const BASE = ["a", "b"] as const
  const ADVANCED = ["c", "d"] as const
  const ALL = [...BASE, ...ADVANCED] as const
  type Effect = typeof ALL[number]  // "a" | "b" | "c" | "d"
  ```
  Place these arrays in the types section (top of file, before interfaces) so the derived type is available for interface fields. Never hand-write a union type that duplicates a `const` array.

- **Exhaustive matching with `effect/Match`:** All `switch` statements on discriminated unions or literal unions must use `effect/Match` with `Match.exhaustive`. Never use `default` branches — they silently swallow new variants and hide bugs. For tagged unions (discriminant field `tag`), use the shared `byTag` helper from `battle-machine-helpers.ts`. For string literal unions, use `Match.when`:
  ```typescript
  import { Match } from "effect"
  import { byTag } from "#/battle-machine-helpers.ts"
  // Tagged union:
  Match.value(postCast).pipe(byTag("PCESave", (v) => ...), byTag("PCEDone", () => ...), Match.exhaustive)
  // String literal union:
  Match.value(cond).pipe(Match.when("blinded", () => ...), Match.when("prone", () => ...), Match.exhaustive)
  ```

## Non-core features

`app/src/features/` — pure functions for class features, feats, spells, species traits. See `features/README.md`.

## ESLint file size limits

`app/src/machine.ts` has a 420-line eslint `max-lines` limit. When adding actions, extract logic into `machine-helpers.ts` (or `machine-combat.ts`) to stay under the cap.

## Plan verification requirements

Every plan's **Verification** section must include:

1. **`/simplify` convergence** — minimum 2 rounds (see below). Do not mark the plan as complete until simplify converges. **Start `/simplify` immediately after implementation — do not wait for user confirmation.**
2. **RAW agent check** — before implementing any rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`. Include a verification step that confirms all modeled rules trace to specific SRD text.

## /simplify convergence

After significant changes, run `/simplify` repeatedly until it converges — i.e., each round finds fewer issues until no important fixes remain. **Do not ask between rounds** — just proceed automatically. Typical progression: round 1 catches dead code and obvious duplication; round 2 catches subtler issues (bugs, tautological invariants, missed dedup); round 3 should find nothing significant. If round N still finds real issues, keep going. **Minimum 2 rounds** — convergence cannot be measured from a single round unless the changeset is trivially small (< ~20 lines). A single round may fix the obvious issues but cannot confirm that no subtler issues remain.

## Invariant scenario tests

`npx quint test --match "inv_" dndTest.qnt` — deterministic pure-function tests for creature-level invariant edge cases (death saves, stability, concentration, conditions, effects, exhaustion, HP).

## Fuzzing

`./scripts/fuzz-all.sh [N]` — runs battle MBT parity + invariant fuzzers in parallel. Failures → `mbt-failures.jsonl` / `invariant-failures.jsonl`. **Needs ~12GB+ RAM** — on constrained containers (<16GB), run them separately.

- `./scripts/mbt-fuzz.sh [N]` — battle MBT fuzzer (default). Set `MBT_TEST=creature` for creature MBT. Includes per-seed timeout (180s default, set `MBT_TIMEOUT`), timing data (`mbt-timing.jsonl`), and structured error extraction. Set `MBT_SAVE_TRACES=1` to save per-seed ITF traces to `fat-traces/<seed>/trace_0.itf.json`.
- `./scripts/invariant-fuzz.sh [N]` — invariant fuzzer. Per-seed timeout (120s default, set `FUZZ_TIMEOUT`). ~49% of seeds timeout at 5 samples × 5 steps.
- `./scripts/fuzz-monitor.sh` — health checker: kills zombie evaluators, analyzes failure patterns, reports timing stats. Designed for cron.
- `./scripts/measure-tier-timing.sh [N]` — benchmarks MBT tier wall-clock times. Results in `tier-timing.jsonl`. See `BENCHMARK_METHODOLOGY.md`.

## QA pipeline

Community Q&A corpus used to generate Quint test assertions against the spec. Full docs: `scripts/qa/QA_README.md`. `qa_generated.qnt` is only relevant for the QA pipeline — it is not part of the development verification workflow and may have pre-existing typecheck errors. Do not fix or update it during normal development.

## Rules reference

**Current edition: SRD 5.2.1 (2024).** Archived: SRD 5.1 (2014) in `.references/srd/`.

`.references/srd-5.2.1/` — SRD 5.2.1 full text (Playing-the-Game.md, Rules-Glossary.md, Equipment.md, Classes/, Spells/, etc.)
`.references/srd-5.2.1-conversion/` — official 5.1→5.2.1 conversion guide (delta manifest)
`.references/srd/` — SRD 5.1 (2014, archived)
`.references/rules/` — D&D 5e PHB chapters as markdown (5.1 era)
