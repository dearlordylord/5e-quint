# D&D 5e PHB — project notes

## Package manager

pnpm workspace. Never use npm.

## No external consumers (CRITICAL)

This is a greenfield project with no users, no published API, no downstream dependencies. **We own the entire stack — Quint spec, runtime core, TS features, MBT bridge, React UI.** Any layer can change to serve any other layer.

Do not treat internal boundaries as walls. When a lower layer needs a change to support a higher layer, change it — don't work around it with adapters, registries, or parallel data structures. The cost of changing a rule-core slice or focused battle QNT owner and updating the affected MBT bridge is always less than the cost of maintaining a workaround that keeps layers "separate." Design for the system, not for the boundary.

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
generated artifacts must not copy real PHB+ source ids, names, slugs, prose,
examples, source headings, page references, or public source-to-Mushroom
crosswalks. Use visibly synthetic renamed records for non-SRD mechanics examples.

Mushroom Playbook language and authoring gates live in
[`docs/mushroom-playbook/CONTEXT.md`](docs/mushroom-playbook/CONTEXT.md) and
[`docs/mushroom-playbook/AUTHORING.md`](docs/mushroom-playbook/AUTHORING.md).

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

## Documentation ownership

Consult `CONTEXT-MAP.md` before adding or moving domain, architecture,
assumption, Cleanroom, or acceptance documentation. The repository's mapped
owners take precedence over generic skill file conventions. Keep each fact in
one owning document and link to it elsewhere; do not maintain parallel glossary,
architecture, assumption, or acceptance prose.

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

## Implementation claims

`Implemented` is not a standalone status. If the user asks only "is it
implemented?", first ask the short clarifying question "Implemented what?" The
relevant subject may be a Rule Capability Increment, an Authored Record, or the
whole Target SDK. A Cleanroom Acceptance Run is evidence about the Target SDK,
not another implementation subject.

Once the subject is clear, lead with `yes`, `no`, or `partially` and name the
subject. State the decisive evidence or missing fact in one concise sentence.
Do not answer by reciting every related gate, lifecycle stage, parser/reducer
boundary, or conformance term unless the user asks for that detail. Prefer a
link to detailed evidence over a wall of acceptance jargon.

## Memory

Do not write to the memory system unless explicitly asked.

## Scoped agent instructions

- For Quint proofs, focused QNT specifications, or battle-runtime MBT, read `docs/agents/QNT-MBT.md`.
- For local Ralph harness work, read `docs/tooling/ralph/README.md`.

## Resource-bounded verification (CRITICAL)

Root workspace verification is intentionally resource-bounded. `pnpm
typecheck` and `pnpm test` acquire the Git-common-directory
`ralph-heavy-verification.lock`, shared by all linked worktrees, and cap
Turbo concurrency at one package task and pass a one-worker bound into every
package Vitest task. `pnpm quality` uses the same lock. Run
those public scripts directly; do not wrap them in another `flock`, bypass them
with raw Turbo, or invoke their internal `:body`/`:turbo` scripts. For another
broad workspace command, use `. scripts/resource-lock-owner.sh &&
with_resource_lock_owner scripts/with-broad-workspace-lock.sh <command>`.
Keep focused package checks focused; they do not require this broad-check lock.

All Quint/QNT proof and battle MBT commands must hold that same shared
`ralph-heavy-verification.lock` for the entire command. Public proof and MBT
package scripts do this automatically. Run those public scripts directly; do
not wrap them in another lock or invoke their internal `:body` scripts. Run any
direct Quint or filtered MBT command through `. scripts/resource-lock-owner.sh
&& with_resource_lock_owner scripts/with-mbt-lock.sh <command>`. The
broad-check and MBT wrappers are two
entry points to one lock and must never be nested. Import-
closure budgets, per-module proof timeouts, and the one-MBT-at-a-time rule
remain mandatory; a lock is not permission to run an unbounded model.

The guard also acquires the former `ralph-broad-workspace-check.lock` and
`ralph-mbt.lock` in a fixed order. This bridges older guarded worktrees that use
either prior name. Commits predating the guard are not protected by a lock, so
Ralph refuses to launch agents from such a Base SHA. Do not remove either legacy
acquisition merely because current worktrees use the common lock.

**SIGKILL / exit 137 is an emergency signal**, including when it comes from
TypeScript rather than Quint. Immediately stop launching verification and:

1. Record the exact killed command and child PID(s).
2. Inspect `ps` for `quint_evaluator`, `quint`, `vitest`, fuzzers, compilers,
   and surviving children; inspect `free -h`, load, and readable cgroup
   `memory.events` counters.
3. Kill only confirmed orphan verification children, including compiler,
   Turbo/pnpm, test, proof, and evaluator processes. Preserve live Ralph agents
   and unrelated host sessions.
4. Do not retry the unchanged command. First reduce/serialize concurrency,
   shrink an accidental QNT import closure, select the focused lane, or otherwise
   remove the demonstrated resource cause.
5. Report the emergency and the evidence. A partial run is not verification.

## SRD feature parity (CRITICAL)

The Quint specs are a **direct formalization of the SRD** — nothing more, nothing less. The QNT corpus is a forest of small slices (see `docs/adr/0001-forest-of-qnt-slices.md`): reusable rule-core slices in `packages/shared-algebras/proofs/rule-core/`, focused QNT with bridge modules into rule-core, and focused `*.mbt.qnt` / `*.mbt.test.ts` parity drivers per obligation or profile. Every modeled rule must trace to a specific SRD passage. Do not invent mechanics, add interpretive extensions, or go beyond what the SRD text says. The only sanctioned deviations from RAW (Rules As Written) are documented in `ASSUMPTIONS.md`, curated by the project owner.

- **Model what the SRD says.** If the SRD doesn't define it, don't model it.
- **No homebrew, no "reasonable extensions."** If a rule is ambiguous or the formalization requires a choice the SRD doesn't prescribe, document it in `ASSUMPTIONS.md` — don't silently pick an interpretation.
- **ASSUMPTIONS.md is the sole record of modeling decisions** where the spec makes explicit what the SRD leaves implicit (e.g., turn boundaries, implied constraints, architecture-driven choices). Curated by the project owner, kept minimal and close to RAW.
- **Always consult RAW and ubiquitous language.** Before implementing any rule, read the relevant SRD passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` for precise terminology. Do not rely on memory or paraphrased understanding of the rules.
- **Local rules corpus first.** `.references/srd-5.2.1/` is the working RAW corpus for this repo. If the needed rule text is missing or insufficient there, stop and tell the user so they can adjust the corpus or direct the source of truth. Do not silently browse external rules sources.

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

## Rules reference

**Current edition: SRD 5.2.1 (2024).**

`.references/srd-5.2.1/` — SRD 5.2.1 full text (Playing-the-Game.md, Rules-Glossary.md, Equipment.md, Classes/, Spells/, etc.)
`.references/srd-5.2.1-conversion/` — official 5.1→5.2.1 conversion guide (delta manifest)

## Agent skills

### Issue tracker

Issues, specifications, and Wayfinder maps use GitHub Issues. See
`docs/agents/issue-tracker.md`.

### Domain docs

This repository uses the multi-context layout rooted at `CONTEXT-MAP.md`. See
`docs/agents/domain.md` for skill-facing consumption rules.
