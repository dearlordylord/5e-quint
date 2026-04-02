# D&D 5e PHB — project notes

## No external consumers (CRITICAL)

This is a greenfield project with no users, no published API, no downstream dependencies. **We own the entire stack — Quint spec, XState machine, TS features, MBT bridge, React UI.** Any layer can change to serve any other layer.

Do not treat internal boundaries as walls. When a lower layer needs a change to support a higher layer, change it — don't work around it with adapters, registries, or parallel data structures. The cost of changing `creature.qnt` and updating the MBT bridge is always less than the cost of maintaining a workaround that keeps layers "separate." Design for the system, not for the boundary.

Concretely: adding a field to `ActiveEffect`, renaming a type in the spec, restructuring `DndContext` — all fine. Update the bridge, run MBT, move on.

## No redundant state (CRITICAL)

Never duplicate data that already exists in another layer. Before adding a field to any type, **search for existing fields that carry the same data** across the entire codebase. If found: reference, project, or re-export — don't copy. The cost of threading existing data through a layer boundary is always less than the cost of maintaining two copies that can diverge.

This applies across all layers — Quint spec, XState context, TS types, React state. If a plan proposes adding fields, verify they don't already exist somewhere before implementing.

## Memory

Do not write to the memory system unless explicitly asked.

## Worktree agent bug

Worktree creation sometimes branches from a stale ref instead of master's HEAD. When launching a worktree agent, always include in the prompt: `"Before starting, run 'git log --oneline -1 master' and verify your HEAD matches. If not, run 'git rebase master'."` This costs one command and prevents silent divergence that causes unmergeable conflicts.

## MBT tests are nondeterministic

MBT traces are generated with random seeds. Failures may not reproduce on the next run. When an MBT test fails, the error includes the seed (e.g., `seed: 0xfa2124eb`). **Always reproduce before fixing:** `QUINT_SEED=0xfa2124eb npx vitest run -t "replays Quint"`. Do not dismiss MBT failures as flaky — reproduce with the seed, diagnose, and fix unless the user explicitly says otherwise.

## MBT runs are expensive

Battle MBT (`battle.qnt`) is slow. **Treat runs as a scarce resource.**

- Never run battle MBT for exploratory questions (checking a variable shape, confirming a format). Answer those by reading source code, quint-connect internals, ITF docs, or writing a focused unit test.
- Only run battle MBT for actual end-to-end validation after code changes are complete.
- One MBT run at a time, always. Never launch a second instance without confirming the first is dead (`ps aux | grep vitest`).
- If a command gets backgrounded, wait for the task completion notification — do not re-issue.
- **Debug without re-running when possible:** Once you have a failing trace (seed + action sequence), prefer these over re-running MBT:
  1. Write a focused TS unit test that replays the specific event sequence against XState actors directly (milliseconds, no Quint).
  2. Read the ITF trace JSON offline to inspect Quint state at each step.
  3. Trace through the Quint spec logic manually by reading the code.
- **Dev mode for faster runs:** `MBT_DEV=1 npx vitest run src/battle.mbt.test.ts` — reduces `maxSamples` (50→10) and step count (10→5). Use for quick "did I break something?" feedback during development. Full runs for CI / final validation.

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

The spec (`creature.qnt`) is a **direct formalization of the SRD** — nothing more, nothing less. Every modeled rule must trace to a specific SRD passage. Do not invent mechanics, add interpretive extensions, or go beyond what the SRD text says. The only sanctioned deviations from RAW (Rules As Written) are documented in `ASSUMPTIONS.md`, curated by the project owner.

- **Model what the SRD says.** If the SRD doesn't define it, don't model it.
- **No homebrew, no "reasonable extensions."** If a rule is ambiguous or the formalization requires a choice the SRD doesn't prescribe, document it in `ASSUMPTIONS.md` — don't silently pick an interpretation.
- **ASSUMPTIONS.md is the sole record of modeling decisions** where the spec makes explicit what the SRD leaves implicit (e.g., turn boundaries, implied constraints, architecture-driven choices). Curated by the project owner, kept minimal and close to RAW.
- **Always consult RAW and ubiquitous language.** Before implementing any rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` for precise terminology. Do not rely on memory or paraphrased understanding of the rules.

## Quint parity (CRITICAL)

The XState machine (`machine.ts`, `machine-helpers.ts`) MUST maintain full parity with the Quint spec (`creature.qnt`). The MBT bridge (`machine.mbt.test.ts`) via `@firfi/quint-connect` is the correctness proof — 50 traces × 30 steps comparing Quint and XState state field-by-field.

- **Never** add logic to the XState machine that diverges from the Quint spec without updating the spec first.
- **Never** "fix" XState behavior that the Quint spec models differently — update the spec or accept it as spec-level intentional.
- **Never** remove or rename context fields that the MBT bridge maps — check `machine.mbt.test.ts` before removing anything from `DndContext`.
- If a simplify/refactor changes behavior, the MBT tests MUST still pass. If they don't, the refactor is wrong.

## TypeScript conventions

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

## QA pipeline

Community Q&A corpus used to generate Quint test assertions against the spec. Full docs: `scripts/qa/QA_README.md`.

## Rules reference

**Current edition: SRD 5.2.1 (2024).** Archived: SRD 5.1 (2014) in `.references/srd/`.

`.references/srd-5.2.1/` — SRD 5.2.1 full text (Playing-the-Game.md, Rules-Glossary.md, Equipment.md, Classes/, Spells/, etc.)
`.references/srd-5.2.1-conversion/` — official 5.1→5.2.1 conversion guide (delta manifest)
`.references/srd/` — SRD 5.1 (2014, archived)
`.references/rules/` — D&D 5e PHB chapters as markdown (5.1 era)
