# Ralph Quint Audit Remediation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QAR-01-TEST-LANE-ISOLATION",
      "status": "done",
      "title": "Isolate default test lanes from MBT discovery"
    },
    {
      "number": 2,
      "id": "QAR-02-MBT-LANE-INVENTORY-GATE",
      "status": "done",
      "title": "Add static test-lane and MBT inventory gates"
    },
    {
      "number": 3,
      "id": "QAR-03-SHARED-QNT-PROOF-HARNESS",
      "status": "done",
      "title": "Consolidate bounded QNT proof harness behavior"
    },
    {
      "number": 4,
      "id": "QAR-04-CHARACTER-CREATION-QNT-PROOFS",
      "status": "done",
      "title": "Add character-creation QNT proof lane"
    },
    {
      "number": 5,
      "id": "QAR-05-SHARED-INVARIANT-PROOF-HARNESS",
      "status": "done",
      "title": "Bound shared-algebras inductive proof execution"
    },
    {
      "number": 6,
      "id": "QAR-06-ACTION-COST-ADMISSION-RESULT",
      "status": "done",
      "title": "Make action and spell admission explicit in QNT"
    },
    {
      "number": 7,
      "id": "QAR-07-DAMAGE-PAIR-NONZERO",
      "status": "done",
      "title": "Encode nonzero damage-allocation preconditions"
    },
    {
      "number": 8,
      "id": "QAR-08-SHOVE-PROJECTION-UNION",
      "status": "done",
      "title": "Replace Shove flattened projection with a closed union"
    },
    {
      "number": 9,
      "id": "QAR-09-CUNNING-STRIKE-TYPED-QNT",
      "status": "done",
      "title": "Replace Cunning Strike string projections with typed QNT"
    },
    {
      "number": 10,
      "id": "QAR-10-ACID-ARROW-TYPED-TIMING",
      "status": "done",
      "title": "Replace Acid Arrow string timing with typed QNT"
    },
    {
      "number": 11,
      "id": "QAR-11-RUN-BLOCK-SEPARATION-GUARD",
      "status": "done",
      "title": "Separate QNT run blocks from owner modules"
    },
    {
      "number": 12,
      "id": "QAR-12-INDUCTIVE-WITNESS-SEEDS",
      "status": "ready-for-research",
      "title": "Repair priority inductive specs and add reachability witnesses"
    },
    {
      "number": 13,
      "id": "QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD",
      "status": "ready-for-research",
      "title": "Harden MBT closure leaf whitelist checks"
    },
    {
      "number": 14,
      "id": "QAR-14-STARRY-WISP-WITNESS-CONVERSION",
      "status": "blocked",
      "title": "Convert Starry Wisp object driver to a literal witness"
    },
    {
      "number": 15,
      "id": "QAR-15-RULE-CORE-SPELLS-MBT-SPLIT",
      "status": "blocked",
      "title": "Split rule-core spells MBT by procedure family"
    },
    {
      "number": 16,
      "id": "QAR-16-RULE-CORE-FEATURES-MBT-SPLIT",
      "status": "blocked",
      "title": "Split rule-core features MBT by feature family"
    },
    {
      "number": 17,
      "id": "QAR-17-HUNTERS-PREY-SEMANTIC-SELECTION",
      "status": "ready-for-research",
      "title": "Move Hunter's Prey execution to semantic support profiles"
    },
    {
      "number": 18,
      "id": "QAR-18-OPEN-HAND-SEMANTIC-CHOICES",
      "status": "ready-for-research",
      "title": "Move Open Hand execution to semantic effect variants"
    },
    {
      "number": 19,
      "id": "QAR-19-AUTHORED-ID-CHECKER-HARDENING",
      "status": "blocked",
      "title": "Harden authored-identity dispatch checking"
    },
    {
      "number": 20,
      "id": "QAR-20-FINAL-CONVERGENCE-AUDIT",
      "status": "blocked",
      "title": "Run final Quint and architecture convergence audit"
    }
  ]
}
-->

## Summary

This plan remediates the Quint-skills audit findings without removing the
existing `quint_kb` MCP. The work is intentionally split into a Ralph queue:
first stabilize the default verification lanes, then repair QNT modeling
interfaces, then shrink MBT closure and remove runtime authored-identity
dispatch, then run a final convergence audit.

Declared base for new Ralph tasks:
`810e7343f2067cf5762ff4681c85e6abd0c3f0cc`.

Every task agent must log the task-provided base ref/SHA, log `HEAD`, and run:

```bash
git merge-base --is-ancestor <Base SHA> HEAD
```

If the ancestor check fails, the task must stop and report the branch-base
mismatch. The Ralph runner or decider owns branch repair.

## Research Baseline

- Default `pnpm test` currently runs `turbo test`; package-local `test` scripts
  mostly invoke `vitest run`, which discovers MBT tests.
- MBT files found during research: 141 in `battle-runtime`, 6 in
  `character-battle-runtime`, 10 in `character-creation-runtime`, 13 in
  `character-sheet-runtime`, and 1 in `shared-algebras`.
- `packages/battle-runtime` already has an opt-in `test:qnt-proofs` lane and a
  bounded proof runner.
- `packages/character-creation-runtime` has run-block QNT tests but no
  package-local proof lane.
- `packages/shared-algebras` has a bounded run-block proof lane, but its
  inductive proof script is still a raw chain of `quint verify` commands.
- Heavy MBT drivers identified by closure research:
  `battle-runtime-starry-wisp-object.mbt.qnt`,
  `rule-core-spells.mbt.qnt`, `rule-core-features.mbt.qnt`, and the
  intentionally computed-oracle Blur driver.
- Authored-identity dispatch findings are concentrated around Hunter's Prey,
  Open Hand Technique, and the checker allowlist for
  `unit-feature-support.ts`.

## DAG / Queue Order

|   # | Task | Status | Depends on | Notes |
| --: | ---- | ------ | ---------- | ----- |
| 1 | QAR-01-TEST-LANE-ISOLATION - Isolate default test lanes from MBT discovery | done | none | First runnable task; makes default tests non-MBT. |
| 2 | QAR-02-MBT-LANE-INVENTORY-GATE - Add static test-lane and MBT inventory gates | done | QAR-01-TEST-LANE-ISOLATION | Adds static guards after default lane shape is decided. |
| 3 | QAR-03-SHARED-QNT-PROOF-HARNESS - Consolidate bounded QNT proof harness behavior | done | QAR-01-TEST-LANE-ISOLATION | Consolidates bounded proof execution before new proof lanes. |
| 4 | QAR-04-CHARACTER-CREATION-QNT-PROOFS - Add character-creation QNT proof lane | done | QAR-03-SHARED-QNT-PROOF-HARNESS | Adds the missing character-creation proof lane. |
| 5 | QAR-05-SHARED-INVARIANT-PROOF-HARNESS - Bound shared-algebras inductive proof execution | done | QAR-03-SHARED-QNT-PROOF-HARNESS | Bounds shared inductive proofs. |
| 6 | QAR-06-ACTION-COST-ADMISSION-RESULT - Make action and spell admission explicit in QNT | done | QAR-01-TEST-LANE-ISOLATION | Removes admission-by-state-equality. |
| 7 | QAR-07-DAMAGE-PAIR-NONZERO - Encode nonzero damage-allocation preconditions | done | QAR-01-TEST-LANE-ISOLATION | Encodes the nonzero total precondition. |
| 8 | QAR-08-SHOVE-PROJECTION-UNION - Replace Shove flattened projection with a closed union | done | QAR-01-TEST-LANE-ISOLATION | Replaces impossible Shove projection combinations. |
| 9 | QAR-09-CUNNING-STRIKE-TYPED-QNT - Replace Cunning Strike string projections with typed QNT | done | QAR-01-TEST-LANE-ISOLATION | Replaces raw Cunning Strike strings. |
| 10 | QAR-10-ACID-ARROW-TYPED-TIMING - Replace Acid Arrow string timing with typed QNT | done | QAR-01-TEST-LANE-ISOLATION | Replaces raw Acid Arrow timing strings. |
| 11 | QAR-11-RUN-BLOCK-SEPARATION-GUARD - Separate QNT run blocks from owner modules | done | QAR-06-ACTION-COST-ADMISSION-RESULT, QAR-07-DAMAGE-PAIR-NONZERO, QAR-08-SHOVE-PROJECTION-UNION, QAR-09-CUNNING-STRIKE-TYPED-QNT, QAR-10-ACID-ARROW-TYPED-TIMING | Cleans owner modules after semantic edits land. |
| 12 | QAR-12-INDUCTIVE-WITNESS-SEEDS - Repair priority inductive specs and add reachability witnesses | ready-for-research | QAR-05-SHARED-INVARIANT-PROOF-HARNESS, QAR-06-ACTION-COST-ADMISSION-RESULT, QAR-07-DAMAGE-PAIR-NONZERO, QAR-11-RUN-BLOCK-SEPARATION-GUARD | Admits state-space repair modules and adds reachability witnesses after affected specs settle. |
| 13 | QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD - Harden MBT closure leaf whitelist checks | ready-for-research | QAR-01-TEST-LANE-ISOLATION | Hardens closure checks before driver conversions. |
| 14 | QAR-14-STARRY-WISP-WITNESS-CONVERSION - Convert Starry Wisp object driver to a literal witness | blocked | QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD | Converts the clearest heavy driver to a literal witness. |
| 15 | QAR-15-RULE-CORE-SPELLS-MBT-SPLIT - Split rule-core spells MBT by procedure family | blocked | QAR-06-ACTION-COST-ADMISSION-RESULT, QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD | Splits spell MBT closure after admission semantics are explicit. |
| 16 | QAR-16-RULE-CORE-FEATURES-MBT-SPLIT - Split rule-core features MBT by feature family | blocked | QAR-06-ACTION-COST-ADMISSION-RESULT, QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD | Splits feature MBT closure after closure rules are hardened. |
| 17 | QAR-17-HUNTERS-PREY-SEMANTIC-SELECTION - Move Hunter's Prey execution to semantic support profiles | ready-for-research | QAR-01-TEST-LANE-ISOLATION | Removes execution dispatch on selected authored option ids. |
| 18 | QAR-18-OPEN-HAND-SEMANTIC-CHOICES - Move Open Hand execution to semantic effect variants | ready-for-research | QAR-01-TEST-LANE-ISOLATION | Removes Open Hand authored-choice execution dispatch. |
| 19 | QAR-19-AUTHORED-ID-CHECKER-HARDENING - Harden authored-identity dispatch checking | blocked | QAR-17-HUNTERS-PREY-SEMANTIC-SELECTION, QAR-18-OPEN-HAND-SEMANTIC-CHOICES | Tightens the checker after known migrations land. |
| 20 | QAR-20-FINAL-CONVERGENCE-AUDIT - Run final Quint and architecture convergence audit | blocked | QAR-02-MBT-LANE-INVENTORY-GATE, QAR-03-SHARED-QNT-PROOF-HARNESS, QAR-04-CHARACTER-CREATION-QNT-PROOFS, QAR-05-SHARED-INVARIANT-PROOF-HARNESS, QAR-06-ACTION-COST-ADMISSION-RESULT, QAR-07-DAMAGE-PAIR-NONZERO, QAR-08-SHOVE-PROJECTION-UNION, QAR-09-CUNNING-STRIKE-TYPED-QNT, QAR-10-ACID-ARROW-TYPED-TIMING, QAR-11-RUN-BLOCK-SEPARATION-GUARD, QAR-12-INDUCTIVE-WITNESS-SEEDS, QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD, QAR-14-STARRY-WISP-WITNESS-CONVERSION, QAR-15-RULE-CORE-SPELLS-MBT-SPLIT, QAR-16-RULE-CORE-FEATURES-MBT-SPLIT, QAR-17-HUNTERS-PREY-SEMANTIC-SELECTION, QAR-18-OPEN-HAND-SEMANTIC-CHOICES, QAR-19-AUTHORED-ID-CHECKER-HARDENING | Final repeated review loop and whole-plan verification. |

## Shared Verification

- Read `AGENTS.md`, this plan, the selected task body, and any task context
  packet before editing.
- Use `pnpm`; never use `npm`.
- Do not run battle MBT for exploration. Use source reads, focused unit tests,
  ITF trace reads, or Quint source inspection instead.
- For any MBT verification, follow the repository MBT protocol: one run at a
  time, check for existing `vitest` and `quint_evaluator`, kill stale
  `quint_evaluator` processes, run in background with timing/progress, and
  reproduce seeded failures with `QUINT_SEED` before fixing.
- Before modeling or changing D&D rules behavior, read the relevant local SRD
  5.2.1 passage in `.references/srd-5.2.1/` and check
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence is mandatory after significant changes: run RAW
  traceability, ubiquitous-language/domain, architecture/connascence, and
  code-review passes; fix every reasonable finding; reject only with a concrete
  reason; repeat until no reasonable findings remain.
- Always run `git diff --check`.
- Run focused package `typecheck` and focused package tests for touched
  packages.
- After applicable tasks land, run:
  - `pnpm check:mbt-driver-closure`
  - `pnpm check:authored-id-dispatch`
  - new test-lane and MBT inventory checks from this plan
  - affected package `test:qnt-proofs` lanes
  - `pnpm test`
  - `pnpm quality`

Every implementer, reviewer, and decider final report must include:

```md
Plan Impact:
- none
```

or a concrete `update-required` / `applied` note when a durable discovery
changes task status, dependencies, acceptance criteria, verification, or creates
a follow-up task.

## Task Details

### Task 1 - QAR-01-TEST-LANE-ISOLATION

Status: `done`

Depends on:

- none

Output:

- Update package-local `test` scripts or Vitest config so default test lanes do
  not discover `**/*.mbt.test.ts`.
- Preserve ordinary unit tests and any intentional proof reminder tests.
- Do not remove explicit package-local MBT scripts.
- Prefer a direct `vitest run --exclude "**/*.mbt.test.ts"` style or equivalent
  package config over new wrapper complexity.

Acceptance:

- `pnpm test` cannot discover `*.mbt.test.ts`.
- Each package with MBT files still has at least one explicit opt-in MBT command
  or a documented follow-up in QAR-02.
- Battle-runtime proof reminder behavior remains in the default lane.

Verification:

- Shared verification.
- Focused package `test` commands for each changed package.
- `pnpm test`.
- No MBT run is required for this task.

Plan Impact:

- Update-required if a package cannot exclude MBT without a larger test harness
  change.

### Task 2 - QAR-02-MBT-LANE-INVENTORY-GATE

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-01 must define the default non-MBT lane before static gates
can encode it.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Output:

- Add `check:test-lane-hygiene` to prove default package `test` scripts/configs
  exclude MBT files.
- Add `check:mbt-script-inventory` to inventory all `*.mbt.test.ts` files and
  flag packages or families without explicit opt-in commands or documented
  grouping.
- Wire both checks into root `quality`.

Acceptance:

- The checks report the current MBT counts by package.
- The checks fail if a package default test lane can discover MBT.
- The checks fail if new MBT files have no opt-in lane or accepted grouping
  rationale.

Verification:

- Shared verification.
- `pnpm check:test-lane-hygiene`.
- `pnpm check:mbt-script-inventory`.
- `pnpm quality`.

Plan Impact:

- Update-required if the inventory reveals missing MBT lanes that need their own
  remediation tasks.

### Task 3 - QAR-03-SHARED-QNT-PROOF-HARNESS

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-01 should land first so proof harness verification runs
inside stable default test lanes.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Output:

- Reuse or extract the bounded proof-runner behavior already used by
  `packages/battle-runtime/src/battle-runtime-qnt-proofs.ts` and
  `packages/shared-algebras/src/shared-algebras-qnt-proofs.ts`.
- Preserve self-discovery by run-block presence.
- Preserve per-module timeout and process-tree cleanup.
- Avoid a hand-maintained list of proof files.

Acceptance:

- Battle-runtime and shared-algebras proof lanes still discover the same
  run-block proof modules.
- A hung proof fails the responsible module instead of hanging the suite.
- The implementation is simpler to reuse for character-creation in QAR-04.

Verification:

- Shared verification.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs`.
- `pnpm --filter @dnd/shared-algebras test:qnt-proofs`.

Plan Impact:

- Update-required if extraction would create a shallow module with worse
  locality than the duplicated runners.

### Task 4 - QAR-04-CHARACTER-CREATION-QNT-PROOFS

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-03 must provide the reusable bounded proof-runner shape.

Depends on:

- QAR-03-SHARED-QNT-PROOF-HARNESS

Output:

- Add a package-local `test:qnt-proofs` lane for
  `packages/character-creation-runtime`.
- Discover run-block QNT tests without a hand-maintained import list.
- Keep default `pnpm test` fast; do not fold this proof lane into default tests.

Acceptance:

- Character-creation run-block QNT tests are opt-in, bounded, and attributable by
  module.
- Default package tests still skip or remind rather than running proofs.

Verification:

- Shared verification.
- `pnpm --filter @dnd/character-creation-runtime test`.
- `pnpm --filter @dnd/character-creation-runtime test:qnt-proofs`.

Plan Impact:

- none unless new character-creation QNT modules are discovered that need
  separate remediation.

### Task 5 - QAR-05-SHARED-INVARIANT-PROOF-HARNESS

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-03 must settle the bounded proof-runner interface before
inductive proof execution is rebuilt.

Depends on:

- QAR-03-SHARED-QNT-PROOF-HARNESS

Output:

- Replace raw shared-algebras inductive proof chains with a bounded,
  attributable harness.
- Classify the current `*-inductive.qnt` modules and preserve intentional proof
  commands under package-local scripts.
- Do not hide state-explosion by folding this lane into default `pnpm test`.

Acceptance:

- Each inductive module failure names the responsible file.
- Timeout behavior is explicit and bounded.
- Existing package-local proof scripts still expose the intended proof lanes.

Verification:

- Shared verification.
- `pnpm --filter @dnd/shared-algebras test:qnt-proofs`.
- The rebuilt shared-algebras inductive proof script.

Plan Impact:

- Update-required if any inductive module needs a separate modeling fix before
  it can run under the bounded lane.

### Task 6 - QAR-06-ACTION-COST-ADMISSION-RESULT

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-01 should stabilize non-MBT verification before semantic QNT
changes begin.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `packages/shared-algebras/proofs/rule-core/action-turn-procedures.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-invocation-resource-core.qnt`
- All QNT importers, MBT drivers, and TypeScript bridges that consume action
  cost or spell invocation admission facts.

Output:

- Replace admission inferred from unchanged state with explicit admitted/rejected
  result records or variants.
- `spendActionCost` must no longer require callers to infer rejection by
  comparing returned state to input state.
- Spell invocation admission must not compute admission from
  `spentTurn != state.turn`.
- Keep failure as a modeled QNT result, not a no-op transition that appears
  successful.
- Update every downstream importer, MBT bridge, and TypeScript decoder affected
  by the result shape in the same task.

Acceptance:

- Callers can distinguish "free cost admitted" from "inadmissible and state
  unchanged".
- Existing run-block tests are updated or moved without weakening behavior.
- No bridge or runtime parity code reconstructs admission by comparing pre/post
  state.
- QNT typecheck/test passes for affected modules.

Verification:

- Shared verification.
- Read relevant SRD action/spellcasting passages and `UBIQUITOUS_LANGUAGE.md`.
- Targeted `quint test --backend typescript --match ...` for affected QNT tests.
- Focused parity/MBT tests for every changed bridge, using the MBT protocol.
- Affected package proof lane after QAR-03/QAR-05 is available.

Plan Impact:

- Update-required if importer discovery reveals an additional admission family
  that deserves its own task rather than being part of this shape migration.

### Task 7 - QAR-07-DAMAGE-PAIR-NONZERO

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-01 should stabilize non-MBT verification before semantic QNT
changes begin.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `packages/shared-algebras/proofs/rule-core/damage-component-adjustments.qnt`

Output:

- Encode the nonzero total precondition before largest-remainder division.
- Prefer a closed result or guarded helper that makes zero-total allocation
  impossible at the call site.
- Do not leave the rule as an undocumented caller convention.

Acceptance:

- `largestRemainderBonusGoesToFirst` or its replacement cannot divide by zero
  for representable admitted inputs.
- Tests cover the zero-total boundary and ordinary nonzero allocation.

Verification:

- Shared verification.
- Targeted QNT tests for damage component adjustment.
- Affected shared-algebras proof lane after QAR-05 is available.

Plan Impact:

- none unless the guard exposes broader invalid damage component states.

### Task 8 - QAR-08-SHOVE-PROJECTION-UNION

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-01 should stabilize non-MBT verification before semantic QNT
changes begin.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `packages/shared-algebras/proofs/rule-core/shove-outcome.qnt`
- `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- The matching TypeScript MBT bridge/test.

Output:

- Replace `ShoveOutcomeProjection` parallel booleans/strings with a closed union
  that distinguishes rejected, accepted-without-push, and accepted push/topple
  outcomes.
- Update the MBT bridge and TS decoding to consume the union shape directly.
- Avoid optional fields or sentinel strings for facts meaningful only in one
  branch.

Acceptance:

- Impossible combinations such as rejected plus pushed cannot be represented.
- The bridge no longer reconstructs domain meaning from parallel projection
  flags.

Verification:

- Shared verification.
- Read local SRD Shove text and `UBIQUITOUS_LANGUAGE.md`.
- Targeted QNT tests.
- Focused Shove MBT only after code changes are complete, using the MBT
  protocol.

Plan Impact:

- Update-required if the projection union should become shared vocabulary for
  other forced-movement drivers.

### Task 9 - QAR-09-CUNNING-STRIKE-TYPED-QNT

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-01 should stabilize non-MBT verification before semantic QNT
changes begin.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `packages/battle-runtime/battle-runtime-cunning-strike.qnt`

Output:

- Replace raw `str` projections for required tools, saving throws, conditions,
  and repeat-save cadence with typed QNT variants or imported leaf vocabulary.
- Keep Cunning Strike option identity separate from semantic runtime facts.
- Split embedded run-block tests into a test module if this task touches them.

Acceptance:

- Projection facts are closed over the modeled SRD Cunning Strike semantics.
- No runtime-relevant Cunning Strike field is a raw string when the domain is a
  known finite vocabulary.

Verification:

- Shared verification.
- Read local SRD Rogue Cunning Strike text and `UBIQUITOUS_LANGUAGE.md`.
- Targeted `quint test` for Cunning Strike.
- Focused Cunning Strike MBT/parity test after code changes are complete, using
  the MBT protocol.

Plan Impact:

- Update-required if the typed vocabulary belongs in a reusable leaf module used
  by non-Cunning Strike features.

### Task 10 - QAR-10-ACID-ARROW-TYPED-TIMING

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-01 should stabilize non-MBT verification before semantic QNT
changes begin.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `packages/battle-runtime/battle-runtime-acid-arrow.qnt`
- `packages/battle-runtime/battle-runtime-acid-arrow-timing.mbt.qnt`
- The matching TypeScript MBT bridge/test.

Output:

- Replace raw timing strings such as target-end-of-next-turn roles with typed
  timing variants.
- Make the delayed damage anchor describe the runtime timing fact, not a string
  convention.
- Split embedded run-block tests into a test module if this task touches them.

Acceptance:

- Acid Arrow timing projections cannot misspell or conflate caster-turn and
  target-turn facts.
- The focused MBT bridge decodes typed timing facts directly.

Verification:

- Shared verification.
- Read local SRD Acid Arrow text and `UBIQUITOUS_LANGUAGE.md`.
- Targeted `quint test` for Acid Arrow.
- Focused Acid Arrow timing MBT only after code changes are complete, using the
  MBT protocol.

Plan Impact:

- Update-required if the timing vocabulary should be shared by other delayed
  spell-effect drivers.

### Task 11 - QAR-11-RUN-BLOCK-SEPARATION-GUARD

Status: `done`

Blocker Type: dependency

Blocker Detail: QAR-06 through QAR-10 should land first so this task moves the
final run blocks only once.

Depends on:

- QAR-06-ACTION-COST-ADMISSION-RESULT
- QAR-07-DAMAGE-PAIR-NONZERO
- QAR-08-SHOVE-PROJECTION-UNION
- QAR-09-CUNNING-STRIKE-TYPED-QNT
- QAR-10-ACID-ARROW-TYPED-TIMING

Output:

- Move run-block tests out of main QNT owner modules into `*-tests.qnt` style
  modules that import the owner.
- Add a static guard that flags new run blocks in owner modules unless the file
  is explicitly a test/example/MBT/proof-runner module.
- Prioritize the owner modules found during research, including Acid Arrow,
  Cunning Strike, action-turn procedures, interrupt bridge, and the movement
  spatial grapple inductive module.

Acceptance:

- Main rule-owner modules contain rule types, pure logic, state/actions, and
  invariants, not scenario tests.
- The proof/test discovery lanes still find moved run blocks.
- The static guard is wired into `pnpm quality`.

Verification:

- Shared verification.
- New run-block guard command.
- Affected package proof lanes.
- `pnpm quality`.

Plan Impact:

- Update-required if moving tests exposes owner modules whose names or discovery
  rules need a narrower convention.

### Task 12 - QAR-12-INDUCTIVE-WITNESS-SEEDS

Status: `ready-for-research`

Blocker Type: dependency

Blocker Detail: QAR-05 must provide bounded inductive proof execution, and
QAR-06, QAR-07, and QAR-11 must settle affected QNT module shapes before
witnesses are added.

Depends on:

- QAR-05-SHARED-INVARIANT-PROOF-HARNESS
- QAR-06-ACTION-COST-ADMISSION-RESULT
- QAR-07-DAMAGE-PAIR-NONZERO
- QAR-11-RUN-BLOCK-SEPARATION-GUARD

Output:

- Repair and admit the QAR-05 state-space repair inductive modules into the
  active bounded lane:
  `attack-damage-composition-inductive.qnt`,
  `damage-component-adjustments-inductive.qnt`, and
  `spell-procedure-profiles-inductive.qnt`.
- Add meaningful reachability witnesses for priority inductive specs:
  action-turn procedures, attack damage composition, damage component
  adjustments, movement spatial grapple, and spell procedure profiles.
- Witnesses must prove important actions or cases are reachable, not merely
  restate type bounds.
- Keep witnesses in test/proof modules according to the QAR-11 convention.

Acceptance:

- Each priority inductive family has at least one witness that reaches a
  nontrivial state under sampled `quint run` / proof-lane execution.
- The QAR-05 state-space repair modules are removed from the repair list by
  entering the active bounded inductive proof lane.
- Dead or unreachable modeled cases are fixed or split into follow-up tasks.

Verification:

- Shared verification.
- Targeted witness runs for each affected module.
- Affected shared-algebras proof lanes.

Plan Impact:

- Update-required if a 0% witness reveals a dead action requiring separate
  semantic repair.

### Task 13 - QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD

Status: `ready-for-research`

Blocker Type: dependency

Blocker Detail: QAR-01 must define the stable default/explicit MBT lane split
before closure guard changes land.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `scripts/check-mbt-driver-closure.cjs`

Output:

- Harden closure checks so leaf-module whitelist entries are validated for
  purity instead of trusted only by convention.
- Keep the transitive import file-count budget at or below the current budget;
  shrink allowlists when conversions land.
- Record the Blur driver as an intentionally computed-oracle driver unless a
  small pure-leaf extraction is discovered.

Acceptance:

- New or modified drivers importing behavioral/barrel modules fail with a clear
  diagnostic.
- Allowlist entries require a rationale or classification.
- Exact-damage drivers remain under budget without a dedicated conversion task.

Verification:

- Shared verification.
- `pnpm check:mbt-driver-closure`.
- `pnpm quality` if root checker wiring changes.

Plan Impact:

- Update-required if Blur is reclassified from computed oracle to convertible
  witness.

### Task 14 - QAR-14-STARRY-WISP-WITNESS-CONVERSION

Status: `blocked`

Blocker Type: dependency

Blocker Detail: QAR-13 must harden closure guard behavior before shrinking the
heavy driver allowlist.

Depends on:

- QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD

Relevant files:

- `packages/battle-runtime/battle-runtime-starry-wisp-object.mbt.qnt`
- Matching TypeScript MBT test/bridge.

Output:

- Convert the Starry Wisp object MBT driver from heavy behavioral imports to a
  literal projection witness.
- Capture exact reducer values through the REPL if needed, then assert them as
  literal facts rather than reimplementing reducer logic inside the driver.
- Remove the now-unneeded closure allowlist entry.

Acceptance:

- The driver imports only small leaf/type modules or is self-contained.
- Transitive closure falls below the enforced budget.
- No duplicated rule reducer logic is introduced in the MBT driver.

Verification:

- Shared verification.
- Read local SRD Starry Wisp text in
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` and
  `UBIQUITOUS_LANGUAGE.md` before freezing literal projection facts.
- `pnpm check:mbt-driver-closure`.
- Focused Starry Wisp MBT only after code changes are complete, using the MBT
  protocol.

Plan Impact:

- none unless the conversion exposes a reusable object-target projection
  pattern.

### Task 15 - QAR-15-RULE-CORE-SPELLS-MBT-SPLIT

Status: `blocked`

Blocker Type: dependency

Blocker Detail: QAR-06 must settle admission result shape and QAR-13 must settle
closure guard behavior before this split.

Depends on:

- QAR-06-ACTION-COST-ADMISSION-RESULT
- QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD

Relevant files:

- `packages/battle-runtime/rule-core-spells.mbt.qnt`
- Matching TypeScript MBT test/bridge.

Output:

- Split rule-core spell MBT coverage by procedure family rather than one broad
  driver that imports many spell modules.
- Keep computed-oracle drivers only where projection genuinely depends on mutable
  reducer-computed state.
- Do not reimplement rule reducers inside literal witnesses.

Acceptance:

- Each resulting spell driver stays within the MBT closure budget or has a
  narrow computed-oracle rationale.
- Existing spell parity obligations remain covered.

Verification:

- Shared verification.
- `pnpm check:mbt-driver-closure`.
- Focused rule-core spell MBT scripts only after code changes are complete,
  using the MBT protocol.

Plan Impact:

- Update-required if the split reveals distinct spell procedure families that
  need follow-up tasks.

### Task 16 - QAR-16-RULE-CORE-FEATURES-MBT-SPLIT

Status: `blocked`

Blocker Type: dependency

Blocker Detail: QAR-06 must settle admission result shape and QAR-13 must settle
closure guard behavior before this split.

Depends on:

- QAR-06-ACTION-COST-ADMISSION-RESULT
- QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD

Relevant files:

- `packages/battle-runtime/rule-core-features.mbt.qnt`
- Matching TypeScript MBT test/bridge.

Output:

- Split rule-core feature MBT coverage by feature family rather than one broad
  driver that imports many feature modules.
- Keep feature driver imports leaf-only wherever the scenario is deterministic.
- Do not reimplement feature reducers inside literal witnesses.

Acceptance:

- Each resulting feature driver stays within the MBT closure budget or has a
  narrow computed-oracle rationale.
- Existing feature parity obligations remain covered.

Verification:

- Shared verification.
- `pnpm check:mbt-driver-closure`.
- Focused rule-core feature MBT scripts only after code changes are complete,
  using the MBT protocol.

Plan Impact:

- Update-required if the split reveals distinct feature families that need
  follow-up tasks.

### Task 17 - QAR-17-HUNTERS-PREY-SEMANTIC-SELECTION

Status: `ready-for-research`

Blocker Type: dependency

Blocker Detail: QAR-01 should stabilize non-MBT verification before runtime
semantic migrations begin.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `packages/character-creation-runtime/src/finalization.ts`
- `packages/battle-runtime/src/battle-init.ts`
- `packages/battle-runtime/src/battle-reducer/attack-roll.ts`
- `packages/battle-runtime/src/battle-reducer/statblock-attacks.ts`
- `packages/battle-runtime/src/unit-feature-support.ts`

Output:

- Move Hunter's Prey selected authored option identity out of battle execution.
- Character composition/admission may use the selected SRD option to choose a
  semantic runtime support profile.
- Reducers must branch on semantic support-profile variants or typed runtime
  facts, not `colossusSlayer`, `hordeBreaker`, transformed camel-case IDs, or
  authored names.
- Do not duplicate selection state beside the semantic profile.

Acceptance:

- `BattleUnitRefSelectedOption` no longer carries Hunter's Prey authored option
  IDs into battle execution state.
- Battle execution receives only semantic support-profile variants or typed
  runtime facts for Hunter's Prey.
- Hunter's Prey behavior remains covered by focused runtime tests and any
  existing parity drivers.
- No PHB+ authored identity is introduced.

Verification:

- Shared verification.
- Read local SRD Ranger Hunter's Prey text and `UBIQUITOUS_LANGUAGE.md`.
- Focused TypeScript unit tests for affected reducers.
- Update or replace the focused Hunter's Prey selected-identity/parity evidence.
- Run the focused Hunter's Prey MBT/parity lane after code changes are complete,
  using the MBT protocol.

Plan Impact:

- Update-required if selected-option handoff is shared with other class features
  and needs a generalized semantic-selection module.

### Task 18 - QAR-18-OPEN-HAND-SEMANTIC-CHOICES

Status: `ready-for-research`

Blocker Type: dependency

Blocker Detail: QAR-01 should stabilize non-MBT verification before runtime
semantic migrations begin.

Depends on:

- QAR-01-TEST-LANE-ISOLATION

Relevant files:

- `packages/battle-runtime/src/battle-reducer/open-hand-technique.ts`
- `packages/battle-runtime/src/unit-feature-support.ts`
- Any character-creation or surface support-profile admission readers touched by
  Open Hand Technique.

Output:

- Move Open Hand Technique reducer execution to semantic effect variants.
- Admission may read official SRD option identity, but executable support should
  be admitted by parsed effect shape and typed facts.
- Remove tuple-position or choice-index assumptions from reducer execution.
- UI/fill labels may remain authored at allowed catalog/selection seams.

Acceptance:

- Reducer branches do not depend on `"addle"`, `"push"`, `"topple"` authored
  choice identity or positional order.
- The support profile makes invalid choice/effect combinations unrepresentable.
- Existing Open Hand tests still cover Addle, Push, Topple, and decline behavior
  through semantic choices.

Verification:

- Shared verification.
- Read local SRD Monk Open Hand Technique text and `UBIQUITOUS_LANGUAGE.md`.
- Focused TypeScript unit tests for Open Hand reducer behavior.
- Update or replace the focused Open Hand selected-identity/parity evidence.
- Run the focused Open Hand MBT/parity lane after code changes are complete,
  using the MBT protocol.

Plan Impact:

- Update-required if Open Hand reveals a reusable selected-effect support-profile
  pattern needed by other features.

### Task 19 - QAR-19-AUTHORED-ID-CHECKER-HARDENING

Status: `blocked`

Blocker Type: dependency

Blocker Detail: QAR-17 and QAR-18 must remove the known authored-identity
runtime dispatches before the checker allowlist can be tightened safely.

Depends on:

- QAR-17-HUNTERS-PREY-SEMANTIC-SELECTION
- QAR-18-OPEN-HAND-SEMANTIC-CHOICES

Relevant files:

- `scripts/check-authored-id-dispatch-boundary.cjs`
- Any checker fixtures or allowlist comments near `unit-feature-support.ts`.

Output:

- Shrink broad `unit-feature-support.ts` allowances.
- Detect transformed authored IDs such as camel-cased selected option IDs.
- Detect generic `fill.value` or selected-choice dispatch that is actually
  authored identity in disguise.
- Preserve the allowed seams for catalog/schema/content, SRD/synthetic tests,
  composition/user-selection, true cross-record references, and documented
  support admission.

Acceptance:

- The checker fails on the pre-migration Hunter's Prey and Open Hand dispatch
  patterns if reintroduced.
- The checker does not flag allowed catalog or admission seams.
- Diagnostics identify why the branch is considered runtime identity dispatch.

Verification:

- Shared verification.
- `pnpm check:authored-id-dispatch`.
- `pnpm quality`.

Plan Impact:

- Update-required if the checker identifies additional authored-identity runtime
  dispatch requiring new remediation tasks.

### Task 20 - QAR-20-FINAL-CONVERGENCE-AUDIT

Status: `blocked`

Blocker Type: dependency

Blocker Detail: This audit runs only after QAR-02 through QAR-19 are done.

Depends on:

- QAR-02-MBT-LANE-INVENTORY-GATE
- QAR-03-SHARED-QNT-PROOF-HARNESS
- QAR-04-CHARACTER-CREATION-QNT-PROOFS
- QAR-05-SHARED-INVARIANT-PROOF-HARNESS
- QAR-06-ACTION-COST-ADMISSION-RESULT
- QAR-07-DAMAGE-PAIR-NONZERO
- QAR-08-SHOVE-PROJECTION-UNION
- QAR-09-CUNNING-STRIKE-TYPED-QNT
- QAR-10-ACID-ARROW-TYPED-TIMING
- QAR-11-RUN-BLOCK-SEPARATION-GUARD
- QAR-12-INDUCTIVE-WITNESS-SEEDS
- QAR-13-MBT-CLOSURE-LEAF-WHITELIST-GUARD
- QAR-14-STARRY-WISP-WITNESS-CONVERSION
- QAR-15-RULE-CORE-SPELLS-MBT-SPLIT
- QAR-16-RULE-CORE-FEATURES-MBT-SPLIT
- QAR-17-HUNTERS-PREY-SEMANTIC-SELECTION
- QAR-18-OPEN-HAND-SEMANTIC-CHOICES
- QAR-19-AUTHORED-ID-CHECKER-HARDENING

Output:

- Run a final Quint-skills audit over changed QNT files.
- Run the project code-review loop using `.claude/review-rules.md`.
- Confirm no authored-identity dispatch, no redundant runtime state, no invalid
  state shapes, no MBT closure regressions, and no default MBT discovery remain.
- Update this plan with final statuses and durable follow-up tasks only for real
  remaining work.

Acceptance:

- All reasonable findings from RAW, ubiquitous-language/domain,
  architecture/connascence, Quint modeling, and code-review passes are fixed.
- Any rejected finding has a concrete written reason.
- No task remains blocked only because of stale plan state.

Verification:

- Shared verification.
- `pnpm check:test-lane-hygiene`.
- `pnpm check:mbt-script-inventory`.
- `pnpm check:mbt-driver-closure`.
- `pnpm check:authored-id-dispatch`.
- All affected `test:qnt-proofs` lanes.
- Focused MBT lanes for behavior changed by earlier tasks, using the MBT
  protocol.
- `pnpm test`.
- `pnpm quality`.

Plan Impact:

- Applied when final statuses are reconciled and any real follow-up work is
  represented as executable Ralph tasks rather than prose.
