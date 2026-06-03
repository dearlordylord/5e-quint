# D&D 5e PHB — project notes

## Package manager

pnpm workspace. Never use npm.

## No external consumers (CRITICAL)

This is a greenfield project with no users, no published API, no downstream dependencies. **We own the entire stack — Quint spec, runtime core, TS features, MBT bridge, React UI.** Any layer can change to serve any other layer.

Do not treat internal boundaries as walls. When a lower layer needs a change to support a higher layer, change it — don't work around it with adapters, registries, or parallel data structures. The cost of changing a rule-core slice or focused package-local battle QNT owner and updating the affected MBT bridge is always less than the cost of maintaining a workaround that keeps layers "separate." Design for the system, not for the boundary.

Concretely: adding a field to `BattleState`, renaming a type in a rule-core slice, restructuring a bridge module — all fine. Update the bridge, run the affected focused MBT, move on.

## No redundant state (CRITICAL)

Never duplicate data that already exists in another layer. Before adding a field to any type, **search for existing fields that carry the same data** across the entire codebase. If found: reference, project, or re-export — don't copy. The cost of threading existing data through a layer boundary is always less than the cost of maintaining two copies that can diverge.

This applies across all layers — Quint spec, runtime context, TS types, React state. If a plan proposes adding fields, verify they don't already exist somewhere before implementing.

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

## Authored identity and PHB+ content (CRITICAL)

**PHB+** means official D&D rules content that is not in this repo's
redistributable SRD corpus: PHB material beyond the SRD plus other closed-licensed
official books such as Xanathar's. Publishable source, tests, fixtures, docs, and
generated artifacts must not copy real PHB+ ids, names, slugs, prose, examples,
source headings, page references, or recognizable catalog identity. Use visibly
synthetic renamed records for non-SRD mechanics examples.

**Authored identity** means content identity or protected expression: record ids,
names, slugs, source sections, provenance sections, prose labels, page refs, or
recognizable official catalog labels. Authored identity is not a runtime rule
model. Production runtime semantics must not dispatch on authored identity.

SRD authored identity may appear in SRD content, provenance, catalogs, selection
identity, and tests because SRD is redistributable here. Runtime code must still
use Surface shape, support-profile readers, typed procedure facts, and explicit
runtime state for SRD too, so SRD implementations set the safe pattern for PHB+
support instead of teaching closed-licensed identity dispatch.

Allowed authored-identity boundaries are narrow:

- Surface catalog/schema/content boundaries.
- Tests and fixtures that use SRD or synthetic identity.
- Composition or user-selection boundaries that retain identity selected
  elsewhere.
- Data references whose domain is "reference another authored record" when the
  source rule actually names that other record.
- Explicitly documented support-profile admission boundaries. This is not a
  blanket permission for profile parsers or reducers to branch on spell/unit
  name, id, or provenance section; executable support should be admitted by
  parsed shape and typed facts.

General design rule:

- **Make invalid states irrepresentable.** This is mandatory before proposing or implementing any data shape. If a proposed type can represent contradictory provenance, contradictory ownership, mismatched derived facts, support-status markers with no type/runtime consequence, or any field combination that is impossible in the code or rules domain, redesign the type before presenting it.
- Optional fields and empty collections must represent distinct domain states. Do not use `undefined` as a second spelling for an empty list. If a type can represent unknown, omitted, and empty, document the domain meaning of each or redesign the type so the invalid distinction is unrepresentable.
- Do not store derivable facts beside their source facts unless the duplication is executable at the boundary that matters. Prefer deriving labels, abbreviations, display names, option ids, and projections from one canonical value or table, so mismatches cannot be represented.
- Do not add status enums or metadata labels that neither affect the type system nor runtime behavior unless there is a specific, durable reason the repo needs them.
- Avoid contrast names such as `normalized`, `legacy`, `current`, `new`, or `promoted` unless the repo owns the opposite concept at the same boundary and the term is domain-backed. Prefer names for the rule, source shape, or domain object being modeled, not names that describe migration mechanics or implementation history.

## Domain-language reflex (extends SRD-parity rules above)

When a union type feels off, the signal to refactor is **domain conflation**, not _just_ "is this type-safe?" Type safety matters a lot; it is necessary but not sufficient. A mixed union whose name fits only half its members already lies about the world even if every variant typechecks. Justify splits/renames in domain terms first (e.g., "rest-triggered" vs "calendar-time-triggered" are distinct SRD triggers), and let type safety follow.

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

## Ralph task-base check

Ralph task worktrees are based on the task Base SHA, not necessarily on
`master`. When launching or reviewing a Ralph task agent, include the
task-provided base check: log the declared base ref, log `HEAD`, and run
`git merge-base --is-ancestor <Base SHA> HEAD`. If the ancestor check fails,
the agent must stop and report the branch-base mismatch; the Ralph runner or
decider owns branch repair. Do not ask task agents to repair branch state by
rebasing against `master`.

## MBT tests are nondeterministic

MBT traces are generated with random seeds. Failures may not reproduce on the
next run. When an MBT test fails, the error includes the seed (e.g.,
`seed: 0xfa2124eb`). **Always reproduce before fixing** with the same package
test and `QUINT_SEED`. Do not dismiss MBT failures as flaky; reproduce with the
seed, diagnose, and fix unless the user explicitly says otherwise.

## MBT runs are expensive

Battle-runtime MBT is selective. Archived restore-source MBT is not an active
verification lane. **Treat MBT runs as a scarce resource.**

- Never run battle MBT for exploratory questions (checking a variable shape, confirming a format). Answer those by reading source code, quint-connect internals, ITF docs, or writing a focused unit test.
- Only run battle MBT for actual end-to-end validation after code changes are complete.
- One MBT run at a time, always. Never launch a second instance without confirming the first is dead (`ps aux | grep vitest`). **Also check for zombie evaluators:** `ps aux | grep quint_evaluator | grep -v grep` — kill with `killall -9 quint_evaluator` if any exist from prior runs.
- If a command gets backgrounded, wait for the task completion notification — do not re-issue.
- **MBT run observation protocol (MANDATORY):** Always run MBT with `run_in_background`. Wrap the command in a timing shell: `START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"`. For runs expected >60s, add a 1-minute progress reporter alongside it.
- **Debug without re-running when possible:** Once you have a failing trace (seed + action sequence), prefer these over re-running MBT:
  1. Write a focused TS unit test that replays the specific event sequence against package runtime reducers directly (milliseconds, no Quint).
  2. Read the ITF trace JSON offline to inspect Quint state at each step.
  3. Trace through the package-local Quint spec logic manually by reading the code.
- **Battle-runtime MBT:** use
  `cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/battle-runtime.mbt.test.ts`
  for completed battle-runtime behavior changes that need integrated MBT.
- **Archived MBT/fuzz tiers:** root fuzz and overnight scripts are not active
  verification gates.
  - **Coverage lever is `MBT_TRACES`, not `MBT_MAX_SAMPLES`.** `MBT_TRACES=N` generates N distinct random walks per vitest call. `MBT_MAX_SAMPLES` is a search budget for invariant checking — irrelevant for MBT trace generation (first walk always succeeds). Do not escalate `MBT_MAX_SAMPLES` expecting more coverage.
- **If a seed is slow**, re-run without `QUINT_SEED` for a fresh one. Slow-seed rate measured at ~49% for invariant fuzzer (5 samples × 5 steps, 120s timeout) and 0% for battle MBT Tier 1 (10 seeds). Slow seeds are caused by branch count (Finding 14), not nondet range sizes.
- **Slow evaluator? Try different seeds first.** Slow seeds are caused by branch count (Finding 14), not nondet range sizes. Re-run with fresh seeds before considering range narrowing. If narrowing is truly necessary, keep domain-correct ranges as comments and document the narrowing rationale in the code.

## QNT proof lane (run consciously, CRITICAL)

The package-local Quint proofs (`run`-block tests in
`packages/battle-runtime/*.qnt`) are the SRD-parity gate, but any single proof
can regress into a forever-running state-explosion search. That hazard is
invisible if it hides inside a slow default test run, so the lane is structured
to surface it instead:

- **Not in `pnpm test`.** The proof lane is opt-in: `pnpm --filter
  @dnd/battle-runtime test:qnt-proofs` (sets `RUN_QNT_PROOFS=1`). A normal
  `pnpm test` runs only a fast reminder test and renders the proof modules as
  skipped — that standing skip is the nag to run the lane consciously. Do not
  fold the proofs back into the default lane.
- **Bounded + attributable per module.** Each `.qnt` with `run` blocks runs as
  its own `quint test <file>`, hard-killed at `proofModuleTimeoutMs`
  (`src/battle-runtime-qnt-proofs.ts`). A runaway proof fails that one module
  rather than hanging the suite, so a "fast → forever" regression is caught and
  named, not silently absorbed into a week of work.
- **Self-discovering.** The corpus is globbed by `run`-block presence, never a
  hand-maintained import list, so a new proof slice cannot drift into being
  unrun (the retired `battle-runtime-self-tests.qnt` aggregator had).
- Run it before merging proof/spec changes and in a dedicated CI job.

## MBT driver closure discipline (CRITICAL)

The Quint evaluator instantiates a simulated spec's **entire transitive `import` closure on every generated trace**, so a `*.mbt.qnt` driver's per-trace cost scales with the size of everything it imports — not with its own state width, branch count, or step depth. This is the dominant MBT performance factor. Measured: an _unused_ `import battle-runtime-model` took a 0.6s spec to 85s; a driver importing the full battle-runtime closure ran ~100× slower than an equivalent one importing only leaf modules. See `docs/adr/0001-forest-of-qnt-slices.md`.

- **Simulated drivers import leaves only.** A `*.mbt.qnt` driver may import only small, pure **leaf** modules (type/tag definitions and `pure def` facts). It must never import a barrel/aggregation module (e.g. `battle-runtime-model`) or a behavioural rule module (e.g. `battle-runtime-movement`, `battle-runtime-concentration`). `scripts/check-mbt-driver-closure.cjs` enforces this (transitive import file-count ≤ 8) and runs in `pnpm quality`. New drivers must pass; shrink its allowlist, never grow it.
- **Keep type-vocabulary modules free of behavioural imports.** `battle-runtime-model` is the type vocabulary imported by ~84 files; it must not `import` the behavioural bridges. When it needs a type a bridge defines, that type goes in a leaf both import (see `battle-runtime-reaction-kinds.qnt`). Importing a behavioural module for one type re-attaches its whole closure to every importer.
- **Two driver shapes, choose deliberately:**
  - **Literal projection witness** — self-contained; asserts the SRD outcome as literal facts. Fast. Preferred for deterministic scenarios; most drivers are this shape.
  - **Computed-oracle driver** — imports the rule reducer to _derive_ the expected projection. Justified only when the projection genuinely depends on mutable state the reducer computes (the reducer is then the SRD oracle). Expensive by nature; keep them few. Do **not** convert one to a witness by reimplementing the rule inside the driver — that duplicates rule logic and weakens parity.
- **Converting a deterministic computed driver to a witness:** capture exact reducer values via the REPL — `printf 'import <module>.*\n<expr>\n.exit\n' | quint -r <spec>.qnt` (the heavy import can take ~90s to load; do not set a short timeout) — assert them as literals, inline only the `Hole` tags the driver uses, drop the imports, and validate with the now-fast filtered test (`pnpm exec vitest run … -t "<name>"`).

## Quint gotchas

Things that cause non-obvious errors, not discoverable by reading code.

- **Reserved names:** `size` is a built-in operator — use `creatureSize` for parameters.
- **Integer division:** Quint `/` truncates toward zero, NOT floor — matters for negative numbers.
- **Cross-file imports:** Must use `from` clause: `import dnd.* from "./dnd"` (bare `import dnd.*` fails silently with "unknown module").
- **Test syntax:** Multiple assertions use `all { assert(x), assert(y) }` — `and { }` causes parse errors in `run` blocks.
- **Verbose test output:** `quint test --match "pattern"` for per-test output (default only shows module name).
- **Rust evaluator GLIBC mismatch:** If MBT tests fail with `EPIPE`, run `./scripts/build-quint-evaluator.sh` (re-run after `pnpm install`).
- **Fresh worktree battle MBT module resolution:** In a worktree without a primed `.quint-cache`, `battle-runtime.mbt.test.ts` can fail with quint `QNT404` name-resolution errors (e.g. `damageAfterAdjustments`) even though those names exist in the corpus. Suspected missing cache-priming step in worktree setup; reproduce in the main checkout first before treating it as a code regression.
- **Apalache / Java:** JDK 17 is installed at `~/.local/java/jdk-17.0.18+8-jre/`. The Bash tool doesn't source `.zshrc`, so prefix Apalache commands with: `export PATH="$HOME/.local/java/jdk-17.0.18+8-jre/bin:$PATH" &&`
- **Nondet must be bare `oneOf()`:** `nondet x = if (cond) A.oneOf() else B.oneOf()` is a parse error (QNT204). The outermost expression must be `oneOf()` or `apalache::generate` — no wrapping `if`, `val`, or function calls. If you need conditional narrowing, accept the wider set and let the guard filter.
- **Apalache record sets:** Apalache needs `var.in(Set)` for record-typed vars before field access. Quint's only way to express record sets is nested `map().flatten()` which enumerates the Cartesian product. This works for small records (~7K elements for FighterState) but is infeasible for large records (CreatureState, TurnState). Don't attempt to build VALID\_\*\_STATES for records with 10+ fields or wide integer ranges.
- **Frame condition verification recipe (historical root-QNT restoration only):** The deleted root `creature.qnt` restore source remains recoverable from git history. If an explicit restoration task revives it, the old frame-condition straggler check was: `grep -n "barbarianLevel' = barbarianLevel" creature.qnt | grep -v "newClassState'"`. This is not used by active package-local specs.
- **Rust backend `mbt::actionTaken` bug:** Bare actions inside `match` arms report the composite name (e.g., `"battleStep"`) instead of the leaf name. Only `any { }` branches get leaf-level tracking. Workaround: wrap every single-action `match` arm in `any { action, }`. Upstream Quint bug — not yet filed.
- **ITF variant format:** Parameterized Quint variants (e.g., `RCounterspell(false)`) arrive in ITF as `{tag: "RCounterspell", value: false}`, NOT `{"RCounterspell": false}`. Use `v.value` to access the parameter — `Object.values(v)[0]` returns the tag string. See `ITFVariantWithValue` in `mbt-shared.ts`.

## SRD feature parity (CRITICAL)

The Quint specs are a **direct formalization of the SRD** — nothing more, nothing less. The QNT corpus is a forest of small slices (see `docs/adr/0001-forest-of-qnt-slices.md`): reusable rule-core slices in `packages/shared-algebras/proofs/rule-core/`, focused package-local QNT with bridge modules into rule-core, and focused `*.mbt.qnt` / `*.mbt.test.ts` parity drivers per obligation or profile. Deleted root `.qnt` files are historical restore material recoverable from git history, not active authority for any runtime and not behavior gates. Every modeled rule must trace to a specific SRD passage. Do not invent mechanics, add interpretive extensions, or go beyond what the SRD text says. The only sanctioned deviations from RAW (Rules As Written) are documented in `ASSUMPTIONS.md`, curated by the project owner.

- **Model what the SRD says.** If the SRD doesn't define it, don't model it.
- **No homebrew, no "reasonable extensions."** If a rule is ambiguous or the formalization requires a choice the SRD doesn't prescribe, document it in `ASSUMPTIONS.md` — don't silently pick an interpretation.
- **ASSUMPTIONS.md is the sole record of modeling decisions** where the spec makes explicit what the SRD leaves implicit (e.g., turn boundaries, implied constraints, architecture-driven choices). Curated by the project owner, kept minimal and close to RAW.
- **Always consult RAW and ubiquitous language.** Before implementing any rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` for precise terminology. Do not rely on memory or paraphrased understanding of the rules.
- **Local rules corpus first.** `.references/srd-5.2.1/` is the working RAW corpus for this repo. If the needed rule text is missing or insufficient there, stop and tell the user so they can adjust the corpus or direct the source of truth. Do not silently browse external rules sources.

## Quint parity (CRITICAL)

Unit/StatBlock-backed battle behavior MUST maintain parity with
focused package-local battle-runtime QNT slices, the rule-core slices they bridge
into (`packages/shared-algebras/proofs/rule-core/`), and the
`@dnd/battle-runtime` parity tests (`packages/battle-runtime/src/*.mbt.test.ts`).
Reusable mechanics live in rule-core; package-local QNT slices own focused
integration. Deleted root QNT files are historical restore material recoverable
from git history and not a parity gate.

- **Never** add logic to the runtime commit layer that diverges from the relevant Quint model without updating the spec first.
- **Never** "fix" runtime behavior that the relevant authoritative Quint model handles differently — update the spec or accept it as spec-level intentional.
- **Never** remove or rename context fields that an MBT bridge maps without checking the relevant parity test first.
- If a refactor changes behavior, the relevant MBT tests MUST still pass. If they don't, the refactor is wrong.

## TypeScript conventions

- **Parse, don’t validate:** Parse once at the boundary; use the parsed type everywhere else. When code establishes a stronger fact about a value, reflect that fact in the type and pass the narrowed value forward. Do not keep passing the weaker type and re-checking the same property downstream.
  Boundary parsers may accept `unknown`; typed internal functions must not. For known callers, use a typed core (`f(c: Wider): Narrower`) and let the raw adapter parse then delegate (`fRaw(c: unknown)` parses to `Wider`, then calls `f`).

  First examples:
  - If a function only makes sense for damage effects, it should accept `DamageEffect`, not `Effect`.
  - Narrow/filter first, then call it. Do not pass `Effect` into the function and check `effect.kind === "damage"` again inside.

- **Return the most precise type available:** If a function can only return one branch of a union, type it as that branch, not the wider union. Example: return `ResolutionResult & { readonly tag: "invalid" }`, not `ResolutionResult`.

- **Brand meaningful primitives early:** If a primitive (`string`, `number`, etc.) carries protocol/domain meaning, give it a branded type at the boundary instead of passing the raw primitive deeper into the code.

- **Typed constant arrays:** When defining a fixed list of domain values (conditions, damage types, etc.), use `as const satisfies ReadonlyArray<T>` to get both literal types and compile-time validation:

  ```typescript
  const CURABLE = [
    "poisoned",
    "blinded",
    "charmed",
  ] as const satisfies ReadonlyArray<Condition>;
  ```

  This catches typos and invalid values at compile time. Prefer this over plain `string[]` or unvalidated `as const`.

- **Derive union types from constant arrays:** When a union type and a runtime array contain the same values, define the array first and derive the type with `typeof X[number]`. Single source of truth — no duplication:

  ```typescript
  const CHOICES = ["push", "sap", "slow"] as const;
  type Choice = (typeof CHOICES)[number]; // "push" | "sap" | "slow"
  ```

  When subsets exist, spread them into a combined array and derive from that:

  ```typescript
  const BASE = ["a", "b"] as const;
  const ADVANCED = ["c", "d"] as const;
  const ALL = [...BASE, ...ADVANCED] as const;
  type Effect = (typeof ALL)[number]; // "a" | "b" | "c" | "d"
  ```

  Place these arrays in the types section (top of file, before interfaces) so the derived type is available for interface fields. Never hand-write a union type that duplicates a `const` array.

- **Exhaustive matching with `effect/Match`:** All `switch` statements on discriminated unions or literal unions must use `effect/Match` with `Match.exhaustive`. Never use `default` branches — they silently swallow new variants and hide bugs. For tagged unions (discriminant field `tag`), introduce a file-local `const byTag = Match.discriminator("tag")` (see `packages/battle-runtime/src/battle-reducer/direct-condition-lifecycle.ts` for an example). For string literal unions, use `Match.when`:
  ```typescript
  import { Match } from "effect"
  const byTag = Match.discriminator("tag")
  // Tagged union:
  Match.value(postCast).pipe(byTag("PCESave", (v) => ...), byTag("PCEDone", () => ...), Match.exhaustive)
  // String literal union:
  Match.value(cond).pipe(Match.when("blinded", () => ...), Match.when("prone", () => ...), Match.exhaustive)
  ```

## Plan verification requirements

Every plan's **Verification** section must include:

1. **Reviewer-loop convergence** — run RAW, ubiquitous-language, architecture/domain, and code-review passes after implementation. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat the reviewer loop until no reasonable findings remain. Do not wait for user confirmation between rounds.
2. **RAW/ubiquitous-language check** — before implementing any rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`. Include a verification step that confirms all modeled rules trace to specific SRD text.

## Reviewer-loop convergence

After significant changes, run the normal reviewer loop repeatedly until it converges. The loop must include RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks. Each round should produce fewer reasonable findings; if a round still finds real issues, fix them and run another round. Convergence means no reasonable findings remain, with any rejected notes documented alongside the reason they were rejected. A single round is enough only for trivially small changesets (< ~20 lines); otherwise use at least two rounds to catch both obvious and subtler issues.

## Invariant scenario tests

The deleted root `dndTest.qnt` restore source is historical only. Use
package-local runtime tests and package-local Quint specs for active
verification.

## Fuzzing

The old root-QNT fuzz script was removed with the archived root specs. Root fuzz
is not an active verification gate.

## QA pipeline

Community Q&A corpus tooling is research-only unless a future task rewires it to
package-local QNT authority. Full docs: `scripts/qa/QA_README.md`. The old
root-QNT generated assertion artifact was removed from the worktree and is not
part of development verification.

## Rules reference

**Current edition: SRD 5.2.1 (2024).** Archived: SRD 5.1 (2014) in `.references/srd/`.

`.references/srd-5.2.1/` — SRD 5.2.1 full text (Playing-the-Game.md, Rules-Glossary.md, Equipment.md, Classes/, Spells/, etc.)
`.references/srd-5.2.1-conversion/` — official 5.1→5.2.1 conversion guide (delta manifest)
`.references/srd/` — SRD 5.1 (2014, archived)
`.references/rules/` — D&D 5e PHB chapters as markdown (5.1 era)
