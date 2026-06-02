# Ralph Lane C: QNT Review Remediation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QRFR-C01-REVIEW-RULES-AUTHORITY",
      "status": "done",
      "title": "Correct review rules to package-local QNT authority"
    },
    {
      "number": 2,
      "id": "QRFR-C02-MBT-CLOSURE-FORBIDDEN-IMPORTS",
      "status": "done",
      "title": "Make the MBT closure checker reject forbidden imports"
    },
    {
      "number": 3,
      "id": "QRFR-C03-MBT-DRIVER-CLOSURE-REPAIR",
      "status": "done",
      "title": "Repair or classify existing MBT driver closure violations"
    },
    {
      "number": 4,
      "id": "QRFR-C04-SHARED-QNT-PROOF-DISCOVERY",
      "status": "done",
      "title": "Add self-discovering shared-algebras QNT proof runner"
    },
    {
      "number": 5,
      "id": "QRFR-C05-SHARED-QNT-PROOF-BASELINE",
      "status": "done",
      "title": "Make the discovered shared-algebras proof baseline attributable and green"
    },
    {
      "number": 6,
      "id": "QRFR-C06-DAMAGE-TYPE-TOTALITY",
      "status": "done",
      "title": "Make damage type projection exhaustive and total"
    },
    {
      "number": 7,
      "id": "QRFR-C07-FIGHTER-ONGOING-STATE-SHAPE",
      "status": "done",
      "title": "Replace fighter ongoing feature partial map state with exact shape"
    },
    {
      "number": 8,
      "id": "QRFR-C08-TURN-ORDER-EXACT-SHAPES",
      "status": "done",
      "title": "Replace positional turn-order assumptions with exact or total state shapes"
    },
    {
      "number": 9,
      "id": "QRFR-C09-EXTRA-ATTACK-RULE-CORE",
      "status": "done",
      "title": "Model SRD Extra Attack counts in rule-core"
    },
    {
      "number": 10,
      "id": "QRFR-C10-EXTRA-ATTACK-BATTLE-PARITY",
      "status": "done",
      "title": "Thread Extra Attack counts through battle-runtime QNT and parity tests"
    },
    {
      "number": 11,
      "id": "QRFR-C11-MOONBEAM-SHAPESHIFT-DESIGN",
      "status": "done",
      "title": "Design executable Moonbeam shapeshift reversion facts"
    },
    {
      "number": 12,
      "id": "QRFR-C12-MOONBEAM-SHAPESHIFT-PARITY",
      "status": "done",
      "title": "Implement Moonbeam shapeshift reversion parity"
    },
    {
      "number": 13,
      "id": "QRFR-C13-AUTHORED-IDENTITY-AUDIT",
      "status": "done",
      "title": "Audit spell authored-identity dispatch and select the pilot vertical"
    },
    {
      "number": 14,
      "id": "QRFR-C14-PROCEDURE-FACT-PILOT-QNT",
      "status": "done",
      "title": "Replace authored spell dispatch with procedure facts in the pilot QNT vertical"
    },
    {
      "number": 15,
      "id": "QRFR-C15-PROCEDURE-FACT-PILOT-TS",
      "status": "done",
      "title": "Thread the pilot procedure facts through TS runtime and parity bridge"
    },
    {
      "number": 16,
      "id": "QRFR-C16-AUTHORED-IDENTITY-GUARDRAIL",
      "status": "done",
      "title": "Add a production guardrail against authored-identity runtime dispatch"
    },
    {
      "number": 17,
      "id": "QRFR-C17-QA-GENERATED-IDENTITY-POLICY",
      "status": "done",
      "title": "Define the QA generated QNT authored-identity boundary"
    },
    {
      "number": 18,
      "id": "QRFR-C18-QA-GENERATED-IDENTITY-GATE",
      "status": "done",
      "title": "Enforce the QA generated QNT SRD-only or synthetic-identity policy"
    },
    {
      "number": 19,
      "id": "QRFR-C19-SECOND-PASS-QNT-RESCAN",
      "status": "done",
      "title": "Run the second-pass QNT rescan after remediation"
    },
    {
      "number": 20,
      "id": "QRFR-C20-LANE-CLOSEOUT-OR-NEXT-BATCH",
      "status": "blocked",
      "title": "Close the lane or create the next remediation batch"
    },
    {
      "number": 21,
      "id": "QRFR-C21-BATTLE-RUNTIME-QNT-INITIATIVE-NONEMPTY",
      "status": "done",
      "title": "Make generic battle-runtime QNT Initiative nonempty or total"
    }
  ]
}
-->

This lane turns `plans/QNT_REVIEW_FINDINGS_REMEDIATION_PLAN.md` into a Ralph
queue. The task split is reliability-driven: each task owns one durable
invariant, one executable guardrail, or one SRD parity vertical. Tasks are not
split merely by file count.

## Source Findings

Read this plan first, then read only the linked source finding summary:

- `plans/QNT_REVIEW_FINDINGS_REMEDIATION_PLAN.md`
- `.claude/review-rules.md`
- `AGENTS.md` or the task-provided project instructions

The originating review found these important issues:

- Extra Attack count is collapsed to a boolean-style slot.
- Moonbeam shapeshift reversion no-ops for modeled but unsupported shapeshift
  sources.
- Production spell runtime semantics dispatch on authored spell identity.
- MBT driver closure enforcement does not directly reject forbidden imports.
- Some QNT states rely on partial maps or positional list conventions.
- Damage type projection uses fallback meaning instead of exhaustive totality.
- Shared-algebras proof execution is hand-maintained despite many run blocks.
- Generated QA QNT contains non-SRD authored identities.
- Review rules still point at archived root QNT authority.

## Context Budget

Ralph agents should not recursively read old lanes. For each task, read:

- This file.
- `plans/QNT_REVIEW_FINDINGS_REMEDIATION_PLAN.md`.
- The exact QNT, TS, script, SRD, and language files named by the task.
- `.claude/review-rules.md` only for review-rule or review-loop tasks.
- `UBIQUITOUS_LANGUAGE.md` and the relevant `.references/srd-5.2.1/` passages
  before any rule behavior change.

Do not read archived root QNT as an active parity authority. Root `battle.qnt`,
`creature.qnt`, and `dndTest.qnt` are restoration source material only unless
the task explicitly says otherwise.

## Lane Rules

- Before starting each task, run the Ralph task-base check: log the declared
  base ref, log `HEAD`, and run
  `git merge-base --is-ancestor <Base SHA> HEAD`. If the check fails, stop and
  report the branch-base mismatch.
- Use pnpm only. Never use npm.
- Do not introduce workaround adapters to preserve internal boundaries. If a
  lower layer needs a better shape, change that layer and update the bridge.
- Before adding any field, search the repo for the same fact. Do not duplicate
  state that can be referenced or projected.
- Make invalid states unrepresentable before accepting a data-shape fix.
- Production runtime semantics must not dispatch on PHB+ authored identity.
  SRD authored identity may appear at content, selected-identity, fixture, and
  documented admission boundaries, but runtime reducers should consume typed
  facts.
- Treat MBT as scarce. Do not run battle MBT for exploration. Run it only after
  integrated behavior changes are complete and only with the repository MBT
  observation protocol.

## Reliability Split Rules

The queue deliberately avoids shallow tasks:

- A checker task must add both enforcement and a regression case.
- A state-shape task must remove the convention and update all direct consumers.
- A parity task must update the authoritative QNT owner before or alongside TS
  runtime behavior.
- A design task is allowed only when implementation would otherwise invent
  missing domain facts. Its output must be executable task instructions, not
  prose uncertainty.
- A closeout task must rescan the codebase and either prove the lane converged
  or append concrete follow-up tasks.

## Verification

Every task must include:

- RAW/ubiquitous-language check for modeled rule changes. Read the relevant SRD
  5.2.1 files under `.references/srd-5.2.1/` and check
  `UBIQUITOUS_LANGUAGE.md`; record the passages used.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, and code review. Fix every reasonable
  finding, reject only with a concrete reason, and repeat until no reasonable
  findings remain.
- `git diff --check`.
- The narrowest relevant package checks named by the task.

Use these checks when the task touches the relevant areas:

- `pnpm check:mbt-driver-closure`
- `pnpm check:authored-id-dispatch`
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs`
- The new shared-algebras proof command after Task 4 creates it.
- Focused TS unit tests for changed reducers, bridge modules, or checker code.

For battle-runtime MBT after completed integrated behavior changes:

```sh
ps aux | grep vitest | grep -v grep
ps aux | grep quint_evaluator | grep -v grep
cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/battle-runtime.mbt.test.ts
```

Run only one MBT instance at a time and use the repository timing/background
protocol when the Ralph runner supports it.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | QRFR-C01-REVIEW-RULES-AUTHORITY - Correct review rules to package-local QNT authority | done | none | Small first fix so subsequent review loops use the right authority. |
| 2 | QRFR-C02-MBT-CLOSURE-FORBIDDEN-IMPORTS - Make the MBT closure checker reject forbidden imports | done | none | Guardrail before driver repairs. |
| 3 | QRFR-C03-MBT-DRIVER-CLOSURE-REPAIR - Repair or classify existing MBT driver closure violations | done | QRFR-C02-MBT-CLOSURE-FORBIDDEN-IMPORTS | Makes the new gate pass without hiding debt. |
| 4 | QRFR-C04-SHARED-QNT-PROOF-DISCOVERY - Add self-discovering shared-algebras QNT proof runner | done | none | Guardrail before proof baseline repairs. |
| 5 | QRFR-C05-SHARED-QNT-PROOF-BASELINE - Make the discovered shared-algebras proof baseline attributable and green | done | QRFR-C04-SHARED-QNT-PROOF-DISCOVERY | Shared-algebras proof baseline is green; no inactive/archive exclusions were required. |
| 6 | QRFR-C06-DAMAGE-TYPE-TOTALITY - Make damage type projection exhaustive and total | done | none | Local connascence fix. |
| 7 | QRFR-C07-FIGHTER-ONGOING-STATE-SHAPE - Replace fighter ongoing feature partial map state with exact shape | done | none | Removes partial map convention. |
| 8 | QRFR-C08-TURN-ORDER-EXACT-SHAPES - Replace positional turn-order assumptions with exact or total state shapes | done | none | Removes list-position convention. |
| 9 | QRFR-C09-EXTRA-ATTACK-RULE-CORE - Model SRD Extra Attack counts in rule-core | done | none | Rule-core first. |
| 10 | QRFR-C10-EXTRA-ATTACK-BATTLE-PARITY - Thread Extra Attack counts through battle-runtime QNT and parity tests | done | QRFR-C09-EXTRA-ATTACK-RULE-CORE | Integration and parity after rule-core shape exists. |
| 11 | QRFR-C11-MOONBEAM-SHAPESHIFT-DESIGN - Design executable Moonbeam shapeshift reversion facts | done | none | Design note identifies the admitted reversion owner and implementation shape. |
| 12 | QRFR-C12-MOONBEAM-SHAPESHIFT-PARITY - Implement Moonbeam shapeshift reversion parity | done | QRFR-C11-MOONBEAM-SHAPESHIFT-DESIGN | QNT and TS behavior change; consumed the Task 11 design note. |
| 13 | QRFR-C13-AUTHORED-IDENTITY-AUDIT - Audit spell authored-identity dispatch and select the pilot vertical | done | none | Pilot selected: Magic Missile repeated-damage-allocation handoff in `plans/AUTHORED_IDENTITY_SPELL_AUDIT.md`. |
| 14 | QRFR-C14-PROCEDURE-FACT-PILOT-QNT - Replace authored spell dispatch with procedure facts in the pilot QNT vertical | done | QRFR-C13-AUTHORED-IDENTITY-AUDIT | QNT owner change first; used the Task 13 Magic Missile handoff. |
| 15 | QRFR-C15-PROCEDURE-FACT-PILOT-TS - Thread the pilot procedure facts through TS runtime and parity bridge | done | QRFR-C14-PROCEDURE-FACT-PILOT-QNT | Runtime and bridge follow the Task 14 QNT fact shape. |
| 16 | QRFR-C16-AUTHORED-IDENTITY-GUARDRAIL - Add a production guardrail against authored-identity runtime dispatch | done | QRFR-C15-PROCEDURE-FACT-PILOT-TS | Enforces the new pattern after one pilot proves it. |
| 17 | QRFR-C17-QA-GENERATED-IDENTITY-POLICY - Define the QA generated QNT authored-identity boundary | done | none | QA generated QNT is disposable generated output; enforcement belongs in `generate_one()` and `rebuild_qnt()`. |
| 18 | QRFR-C18-QA-GENERATED-IDENTITY-GATE - Enforce the QA generated QNT SRD-only or synthetic-identity policy | done | QRFR-C17-QA-GENERATED-IDENTITY-POLICY | Enforce at `scripts/qa/generate_assertions.py` materialization boundaries; no manual edit to `qa_generated.qnt`. |
| 19 | QRFR-C19-SECOND-PASS-QNT-RESCAN - Run the second-pass QNT rescan after remediation | done | QRFR-C03-MBT-DRIVER-CLOSURE-REPAIR, QRFR-C05-SHARED-QNT-PROOF-BASELINE, QRFR-C06-DAMAGE-TYPE-TOTALITY, QRFR-C07-FIGHTER-ONGOING-STATE-SHAPE, QRFR-C08-TURN-ORDER-EXACT-SHAPES, QRFR-C10-EXTRA-ATTACK-BATTLE-PARITY, QRFR-C12-MOONBEAM-SHAPESHIFT-PARITY, QRFR-C16-AUTHORED-IDENTITY-GUARDRAIL, QRFR-C18-QA-GENERATED-IDENTITY-GATE | Result recorded below; one residual QNT initiative state-shape issue assigned to QRFR-C21. |
| 20 | QRFR-C20-LANE-CLOSEOUT-OR-NEXT-BATCH - Close the lane or create the next remediation batch | blocked | QRFR-C19-SECOND-PASS-QNT-RESCAN, QRFR-C21-BATTLE-RUNTIME-QNT-INITIATIVE-NONEMPTY | Prevents hidden findings from being dropped after the residual QNT initiative fix lands. |
| 21 | QRFR-C21-BATTLE-RUNTIME-QNT-INITIATIVE-NONEMPTY - Make generic battle-runtime QNT Initiative nonempty or total | done | QRFR-C19-SECOND-PASS-QNT-RESCAN | Follow-up from the second-pass rescan: generic QNT turn-order still admits empty `stillToAct` while direct consumers index `[0]`. |

## Task Details

### Task 1 - QRFR-C01-REVIEW-RULES-AUTHORITY - Correct review rules to package-local QNT authority

Status: `done`

Input:

- `.claude/review-rules.md`
- Current project instructions about active QNT authority.

Output:

- Update review rules so code-review agents compare battle behavior against
  package-local `packages/battle-runtime/battle-runtime.qnt`, package-local
  QNT slices, and `packages/shared-algebras/proofs/rule-core/`.
- Keep archived root QNT described only as restoration source material.

Acceptance:

- Review rules no longer name archived root `battle.qnt` as the active parity
  gate.
- `git diff --check` is clean.

### Task 2 - QRFR-C02-MBT-CLOSURE-FORBIDDEN-IMPORTS - Make the MBT closure checker reject forbidden imports

Status: `done`

Input:

- `scripts/check-mbt-driver-closure.cjs`
- Existing `packages/battle-runtime/*.mbt.qnt` files.
- ADR-0001 MBT driver closure discipline.

Output:

- Extend the checker to reject direct and transitive imports of
  `battle-runtime-model`, aggregation barrels, and behavioral rule modules from
  simulated `*.mbt.qnt` drivers unless explicitly allowlisted.
- Add a regression fixture or self-test that proves the forbidden import case
  fails for semantic reasons, not only because the closure count is high.

Acceptance:

- `pnpm check:mbt-driver-closure` reports current violations or passes with
  only documented allowlist entries.
- The checker failure message identifies the offending driver and forbidden
  import path.
- `git diff --check` is clean.

### Task 3 - QRFR-C03-MBT-DRIVER-CLOSURE-REPAIR - Repair or classify existing MBT driver closure violations

Status: `done`

Depends on: QRFR-C02-MBT-CLOSURE-FORBIDDEN-IMPORTS

Input:

- Checker output from Task 2.
- Drivers flagged by the checker.
- `docs/adr/0001-forest-of-qnt-slices.md`.

Output:

- Convert deterministic drivers to literal projection witnesses when they only
  import broad modules for values that can be captured as literals.
- Keep computed-oracle drivers only where expected projection genuinely depends
  on reducer-computed mutable state.
- Record each remaining allowlist entry with a concrete reason and shrink any
  obsolete allowlist debt.

Acceptance:

- `pnpm check:mbt-driver-closure` is green.
- Remaining allowlist entries are few, named, and justified.
- No driver grows its transitive closure as part of the repair.

### Task 4 - QRFR-C04-SHARED-QNT-PROOF-DISCOVERY - Add self-discovering shared-algebras QNT proof runner

Status: `done`

Input:

- `packages/shared-algebras/package.json`
- Existing battle-runtime QNT proof runner pattern.
- Shared QNT files under `packages/shared-algebras/proofs/`.

Output:

- Add a shared-algebras proof runner that discovers `.qnt` files containing
  `run` blocks.
- Run each proof module independently with a bounded timeout and attributable
  failure output.
- Add an opt-in package script for the proof lane.

Acceptance:

- The new proof command discovers run-block files without a hand-maintained
  import list.
- A failing module would be reported by file path.
- `git diff --check` is clean.

### Task 5 - QRFR-C05-SHARED-QNT-PROOF-BASELINE - Make the discovered shared-algebras proof baseline attributable and green

Status: `done`

Depends on: QRFR-C04-SHARED-QNT-PROOF-DISCOVERY

Input:

- The proof command created in Task 4.
- Every shared-algebras QNT file discovered by that command.

Output:

- Run the discovered proof lane.
- Fix proof-runner integration issues and stale run-block failures that are
  clearly caused by active shared-algebras drift.
- If a discovered proof is intentionally archived or not active, move it out of
  the active proof path or document the boundary in a checker-visible way.

Acceptance:

- The shared-algebras proof command is green or has only explicitly documented
  inactive/archive exclusions.
- Each exclusion has a reason stronger than "currently failing".
- `git diff --check` is clean.

### Task 6 - QRFR-C06-DAMAGE-TYPE-TOTALITY - Make damage type projection exhaustive and total

Status: `done`

Input:

- `packages/shared-algebras/proofs/rule-core/damage-component-adjustments.qnt`
- Relevant TS mirror or parity files if any.

Output:

- Replace fallback `else` meaning for damage types with exhaustive `match` or a
  total damage-type-indexed structure.
- Keep one source of truth for the damage type set.
- Update focused tests or proof blocks so a new damage type would create a
  visible obligation.

Acceptance:

- No damage type branch is represented only by final fallback behavior.
- Adding a new `RuleDamageType` would fail typecheck, proof, or tests until the
  new branch is handled.
- Relevant QNT proof or focused package test is green.

### Task 7 - QRFR-C07-FIGHTER-ONGOING-STATE-SHAPE - Replace fighter ongoing feature partial map state with exact shape

Status: `done`

Input:

- `packages/battle-runtime/battle-runtime-model.qnt`
- `packages/battle-runtime/battle-runtime-fighter-ongoing-features.qnt`
- TS bridge/runtime files that project active ongoing feature occurrences.

Output:

- Replace the integer-keyed occurrence map convention with an exact record or
  domain variant that makes required occurrence slots explicit.
- Update all direct consumers so ordinary execution no longer relies on `.get`
  of conventionally required keys.

Acceptance:

- The QNT state cannot represent the old missing-required-key state.
- Focused QNT proofs or package tests cover both expected occurrence slots.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs` is green if QNT proofs
  are touched.

### Task 8 - QRFR-C08-TURN-ORDER-EXACT-SHAPES - Replace positional turn-order assumptions with exact or total state shapes

Status: `done`

Input:

- `packages/battle-runtime/battle-runtime-turn-order.qnt`
- Alert initiative QNT/TS bridge files that assume three entries or fallback
  positions.

Output:

- Replace unchecked `stillToAct[0]`, exact-three-list, and absent-actor fallback
  conventions with exact domain shapes or total helper functions.
- Localize any remaining strong positional connascence in one helper whose
  contract is executable.

Acceptance:

- Turn-order logic cannot silently choose a fallback actor position when the
  actor is absent.
- Alert ordering tests or proofs cover present actor, absent actor, and
  expected exact-shape cases.
- Relevant focused tests and `git diff --check` are green.

### Task 9 - QRFR-C09-EXTRA-ATTACK-RULE-CORE - Model SRD Extra Attack counts in rule-core

Status: `done`

Input:

- `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core.qnt`

Output:

- Replace the boolean extra-attack slot model with an SRD-backed count model.
- Admit only counts that correspond to modeled SRD feature facts.
- Add proof/test cases for zero, one, two, and three additional attacks.

Acceptance:

- Rule-core can represent every SRD-supported Extra Attack count.
- The count decreases one attack at a time and cannot go negative.
- Relevant QNT proof or focused test is green.

### Task 10 - QRFR-C10-EXTRA-ATTACK-BATTLE-PARITY - Thread Extra Attack counts through battle-runtime QNT and parity tests

Status: `done`

Depends on: QRFR-C09-EXTRA-ATTACK-RULE-CORE

Input:

- Task 9 rule-core output.
- `packages/battle-runtime/battle-runtime-model.qnt`
- `packages/battle-runtime/battle-runtime-feature-bridge.qnt`
- `packages/battle-runtime/battle-runtime-feature-turn-end-effects.qnt`
- Affected TS runtime and MBT bridge files.

Output:

- Preserve extra attack remaining count through battle-runtime state, bridge,
  attack action use, and turn-end reset.
- Remove boolean projections that collapse `> 0` to open/closed where count is
  semantically needed.
- Add focused parity tests for one, two, and three additional attack cases.

Acceptance:

- Battle-runtime QNT and TS agree for every modeled count.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs` is green.
- Run battle MBT only if the integrated behavior changed and focused checks are
  already green.

### Task 11 - QRFR-C11-MOONBEAM-SHAPESHIFT-DESIGN - Design executable Moonbeam shapeshift reversion facts

Status: `done`

Input:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.qnt`
- `packages/battle-runtime/battle-runtime-shape-shifting.qnt`
- Related TS runtime state for shapeshift restoration.

Output:

- Identify the minimal runtime facts needed for Moonbeam to revert every
  modeled shapeshift source to true form.
- Decide which unsupported states should become unrepresentable at admission
  versus which should gain restoration facts.
- Write the implementation handoff into this plan or a focused design note.

Acceptance:

- The next implementation task has exact fields/types to add or remove.
- The design distinguishes provenance, structured input, and runtime projection.
- No proposed field duplicates an existing fact without a documented search.

### Task 12 - QRFR-C12-MOONBEAM-SHAPESHIFT-PARITY - Implement Moonbeam shapeshift reversion parity

Status: `done`

Depends on: QRFR-C11-MOONBEAM-SHAPESHIFT-DESIGN

Input:

- `plans/MOONBEAM_SHAPESHIFT_REVERSION_DESIGN.md`
- Active Moonbeam and shapeshift QNT/TS owners.

Output:

- Implement Moonbeam failed-save reversion using executable shapeshift facts.
- Remove ordinary unsupported no-op handling for creatures already known to be
  shapeshifted when the SRD says they revert.
- Add focused QNT/TS parity coverage for every modeled shapeshift source.

Acceptance:

- A failed Moonbeam save reverts every admitted shapeshifted source.
- Unsupported or missing-restoration states are rejected before reducer
  execution, not discovered as ordinary no-op behavior.
- Relevant focused tests and QNT proofs are green.

### Task 13 - QRFR-C13-AUTHORED-IDENTITY-AUDIT - Audit spell authored-identity dispatch and select the pilot vertical

Status: `done`

Input:

- `packages/battle-runtime/battle-runtime-model.qnt`
- `packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- Spell profile rule-core files under
  `packages/shared-algebras/proofs/rule-core/`
- Existing `pnpm check:authored-id-dispatch` implementation and output.

Output:

- Classify current authored spell identity uses as content/selection/admission
  boundary, test/fixture, or production runtime dispatch.
- Pick one pilot vertical with enough coverage to prove typed procedure facts
  without attempting a whole-corpus rewrite.
- Record exact source files, reducer paths, bridge paths, and tests for the
  pilot.

Acceptance:

- Pilot choice has a concrete reason and bounded file list.
- The audit identifies at least one production runtime dispatch to remove.
- No implementation code changes are required in this task beyond recording the
  executable handoff.

Result:

- `plans/AUTHORED_IDENTITY_SPELL_AUDIT.md` selects Magic Missile
  repeated-damage-allocation as the pilot and records the bounded QNT, TS,
  bridge, and test handoff for Task 14 and Task 15.

### Task 14 - QRFR-C14-PROCEDURE-FACT-PILOT-QNT - Replace authored spell dispatch with procedure facts in the pilot QNT vertical

Status: `done`

Depends on: QRFR-C13-AUTHORED-IDENTITY-AUDIT

Input:

- `plans/AUTHORED_IDENTITY_SPELL_AUDIT.md`
- Magic Missile repeated-damage-allocation QNT owner and related rule-core
  profile files named in the Task 13 handoff.

Output:

- Define typed procedure/profile facts for the pilot.
- Change the pilot QNT reducer or projection logic to dispatch on those facts
  rather than authored spell-name variants.
- Keep authored identity only at documented admission or selection boundaries.

Acceptance:

- The pilot QNT can execute the same behavior without production rule branches
  on authored spell names.
- QNT proof or focused QNT test for the pilot is green.
- The new fact shape does not duplicate existing runtime state.

Result:

- Magic Missile repeated-damage-allocation invocation/resource dispatch uses
  typed repeated-damage-allocation facts in QNT; authored spell identity remains
  outside the pilot production resource/cardinality branch.

### Task 15 - QRFR-C15-PROCEDURE-FACT-PILOT-TS - Thread the pilot procedure facts through TS runtime and parity bridge

Status: `done`

Depends on: QRFR-C14-PROCEDURE-FACT-PILOT-QNT

Input:

- Task 14 QNT output.
- Pilot TS reducer, parser/admission boundary, and MBT bridge files.

Output:

- Parse or admit the pilot authored spell selection into typed procedure facts.
- Update TS runtime and MBT bridge code to consume those facts.
- Remove pilot production runtime branches on authored spell identity.

Acceptance:

- TS and QNT parity for the pilot remains green.
- Existing selected-identity tests still retain identity at allowed boundaries.
- `pnpm check:authored-id-dispatch` is no worse, and ideally reports one fewer
  production runtime dispatch.

Result:

- The TS pilot uses `repeated-damage-allocation-facts.ts` to thread repeated
  damage allocation procedure facts through admission, target cardinality,
  runtime action/slot spend, and the focused rule-core spell MBT bridge.

### Task 16 - QRFR-C16-AUTHORED-IDENTITY-GUARDRAIL - Add a production guardrail against authored-identity runtime dispatch

Status: `done`

Depends on: QRFR-C15-PROCEDURE-FACT-PILOT-TS

Input:

- Task 13 audit categories.
- Task 15 pilot pattern.
- Existing authored-id dispatch checker.

Output:

- Extend the checker or review rule so production runtime reducers cannot add
  new authored spell-name dispatch outside documented boundaries.
- Allow SRD identity in content, selected-identity, fixtures, and explicit
  admission files without weakening production checks.

Acceptance:

- The checker catches a representative production reducer branch on spell name.
- Allowed boundary uses do not fail the checker.
- `pnpm check:authored-id-dispatch` is green or has only documented pre-existing
  debt outside the pilot scope.

### Task 17 - QRFR-C17-QA-GENERATED-IDENTITY-POLICY - Define the QA generated QNT authored-identity boundary

Status: `done`

Input:

- `scripts/qa/QA_README.md`
- QA generator inputs and materialization path.
- `qa_generated.qnt`
- Project PHB+ authored-identity rules.

Output:

- Decide whether generated QA QNT is publishable source, disposable generated
  output, or private local scratch.
- Define the required SRD-only or synthetic-identity policy for materialized QA
  QNT.
- Identify the generator or boundary file where enforcement belongs.

Acceptance:

- The policy is recorded in the QA docs or this lane with exact enforcement
  location.
- The task does not hand-edit `qa_generated.qnt`.
- The policy distinguishes SRD provenance from structured input and runtime
  projection.

### Task 18 - QRFR-C18-QA-GENERATED-IDENTITY-GATE - Enforce the QA generated QNT SRD-only or synthetic-identity policy

Status: `done`

Depends on: QRFR-C17-QA-GENERATED-IDENTITY-POLICY

Input:

- Task 17 policy in `scripts/qa/QA_README.md`.
- `scripts/qa/generate_assertions.py` materialization boundaries:
  `generate_one()` before writing `.references/qa/cache/assertions/`, and
  `rebuild_qnt()` before writing `qa_generated.qnt`.

Output:

- Add generator filtering, synthetic renaming, artifact relocation, or a scan
  gate according to the Task 17 policy.
- Add a small regression test or script check for a non-SRD authored identity.
- Leave `qa_generated.qnt` alone unless Task 17 explicitly reclassifies it as a
  generated output that should be regenerated by the pipeline.

Acceptance:

- A PHB+ authored name in materialized QA QNT fails the new gate or is replaced
  by a visibly synthetic identity during generation.
- SRD QA materialization still works.
- Relevant QA checks and `git diff --check` are green.

### Task 19 - QRFR-C19-SECOND-PASS-QNT-RESCAN - Run the second-pass QNT rescan after remediation

Status: `done`

Depends on:

- QRFR-C03-MBT-DRIVER-CLOSURE-REPAIR
- QRFR-C05-SHARED-QNT-PROOF-BASELINE
- QRFR-C06-DAMAGE-TYPE-TOTALITY
- QRFR-C07-FIGHTER-ONGOING-STATE-SHAPE
- QRFR-C08-TURN-ORDER-EXACT-SHAPES
- QRFR-C10-EXTRA-ATTACK-BATTLE-PARITY
- QRFR-C12-MOONBEAM-SHAPESHIFT-PARITY
- QRFR-C16-AUTHORED-IDENTITY-GUARDRAIL
- QRFR-C18-QA-GENERATED-IDENTITY-GATE

Input:

- Completed outputs from Tasks 1-18.
- The same review lenses used for the original two-pass review.

Output:

- Rescan active package-local QNT, rule-core QNT, MBT drivers, proof wiring,
  authored-identity boundaries, and QA generated identity boundaries.
- Compare the rescan against the original findings.
- Append concrete follow-up Ralph tasks here if any important issue remains.

Acceptance:

- The rescan covers the codebase at least once after remediation, with explicit
  notes for each original finding.
- No reasonable important finding remains unassigned.
- All relevant static gates from the Verification section are green or have
  concrete follow-up tasks.

Result:

- Scope: active package-local QNT, shared rule-core QNT, MBT driver closure,
  proof wiring, authored-identity boundaries, and QA generated identity
  boundaries after QRFR-C01 through QRFR-C18.
- All original findings are converged except the generic QNT Initiative
  nonempty/totality shape under QRF-5. The residual issue is assigned to
  QRFR-C21-BATTLE-RUNTIME-QNT-INITIATIVE-NONEMPTY.
- Battle MBT was not run. Task 19 made no integrated behavior change, and the
  repo instructions reserve battle MBT for completed behavior changes.

Verification snapshot:

- `pnpm check:authored-id-dispatch`: passed. The checker discovered 1004
  authored identity literals, checked 319 source files, excluded 250 test or
  artifact files, and found only the 11 documented boundary allowlist usages.
- `pnpm check:qa-generated-identity`: passed. The QA generated identity
  self-test rejects private non-SRD authored identity and fail-closes missing
  blocklist materialization.
- `pnpm check:mbt-driver-closure`: passed. The gate still tracks 11
  grandfathered drivers for migration or computed-oracle classification.
- `pnpm rules-kernel-coverage:check`: passed with 97 obligations.
- `pnpm --filter @dnd/shared-algebras test:qnt-proofs`: passed, 23 tests in
  34.80 seconds.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs`: passed, 36 tests in
  421.17 seconds.
- `git diff --check`: passed.
- `pnpm quality`: stopped at an unrelated baseline lint failure in
  `packages/mcp/src/battle-tools.ts` line 439 (`max-lines`). The task touched
  only planning docs, so broad verification was stopped per Ralph instructions.

Original finding disposition:

| Finding | Second-pass disposition |
| --- | --- |
| QRF-1 MBT closure gate | Converged for enforcement. `scripts/check-mbt-driver-closure.cjs` directly rejects forbidden direct and transitive imports, self-tests a forbidden `battle-runtime-model` fixture, and the gate passes. The 11 remaining grandfathered drivers are checker-visible and reasoned as computed-oracle or convertible debt. |
| QRF-2 Extra Attack counts | Converged. Rule-core models `NoAdditionalAttacks`, `OneAdditionalAttack`, `TwoAdditionalAttacks`, and `ThreeAdditionalAttacks`; examples cover zero, one, two, and three additional attacks plus unsupported counts. Battle-runtime QNT, TS admission, and MBT bridge surfaces preserve counts rather than collapsing to a boolean. |
| QRF-3 Moonbeam shape-shift reversion | Converged for admitted runtime states. The executable shape-shift owner is Druid Wild Shape active-effect restoration; unsupported spell/stat-block shifted states are not admitted as ordinary executable states. Moonbeam local state no longer has unsupported shifted branches, and proofs/tests cover admitted reversion. |
| QRF-4 authored spell identity dispatch | Converged for the pilot and guardrail. The repeated-damage-allocation pilot uses procedure facts, and `pnpm check:authored-id-dispatch` passed. Remaining spell names and ids are in presentation, selection, source-ref, or documented admission boundaries rather than production identity dispatch per the current checker. |
| QRF-5 partial and positional QNT state | Partially converged. Fighter ongoing feature occurrences now use exact named slots, and Alert initiative uses exact named score records. A residual generic battle-runtime QNT initiative issue remains: `battle-runtime-model.qnt` still represents `Initiative.stillToAct` as `List[Actor]`, while `battle-runtime-turn-order.qnt` and `battle-runtime-turn-advancement.qnt` index `[0]`. This is assigned to QRFR-C21. |
| QRF-6 damage type totality | Converged. Damage by type is keyed by `RuleDamageType`, projection uses explicit matches and total maps, and Thunder is no longer an implicit final fallback. |
| QRF-7 shared QNT proofs | Converged. `packages/shared-algebras/src/shared-algebras-qnt-proofs.ts` discovers run-block modules, runs each module independently with a timeout, and the opt-in proof lane is green. |
| QRF-8 QA generated identity policy | Converged. `scripts/qa/generate_assertions.py` enforces the SRD-only or visibly synthetic identity boundary at cache-fragment and `qa_generated.qnt` materialization, with a self-test behind `pnpm check:qa-generated-identity`. |
| QRF-9 review authority | Converged. `.claude/review-rules.md` points reviewers at package-local `packages/battle-runtime/battle-runtime.qnt`, package-local QNT slices, and `packages/shared-algebras/proofs/rule-core/`, while root QNT remains archived restore material only. |

Reviewer loop:

- Round 1 finding: residual QRF-5 generic QNT initiative shape found and
  assigned to QRFR-C21.
- Round 2 finding: no additional important unassigned issues found after
  rerunning the same lenses over MBT closure, proof discovery, authored
  identity guardrails, QA materialization, damage totality, Extra Attack count
  parity, and Moonbeam shape-shift admission.

RAW and ubiquitous-language check:

- No new rule behavior was implemented in Task 19.
- The rescan rechecked the relevant source anchors used by the remediations:
  SRD 5.2.1 `Rules-Glossary.md` for Attack action, Moving between Attacks,
  Initiative, and Shape-Shifting; `UBIQUITOUS_LANGUAGE.md` for Initiative,
  Attack action resources, Multiattack/Extra Attack, and damage terminology.

### Task 21 - QRFR-C21-BATTLE-RUNTIME-QNT-INITIATIVE-NONEMPTY - Make generic battle-runtime QNT Initiative nonempty or total

Status: `done`

Depends on: QRFR-C19-SECOND-PASS-QNT-RESCAN

Input:

- Task 19 rescan result above.
- `packages/battle-runtime/battle-runtime-model.qnt`
- `packages/battle-runtime/battle-runtime-turn-order.qnt`
- `packages/battle-runtime/battle-runtime-turn-advancement.qnt`
- `packages/shared-algebras/src/initiative-algebra.ts`
- `packages/shared-algebras/proofs/initiative-algebra-invariant.qnt`

Output:

- Make the generic battle-runtime QNT `Initiative` shape mirror the runtime
  invariant that there is always a current actor, or route all current-actor
  access through a total result shape that makes empty initiative unrepresentable
  at reducer call sites.
- Replace direct `stillToAct[0]` reads in generic package-local QNT turn-order
  and turn-advancement code with the new exact or total shape.
- Keep the Alert-specific exact named initiative score model intact.

Acceptance:

- `BattleState.initiative` in active package-local QNT cannot represent a
  normal battle state with no current actor unless that state is carried by an
  explicit terminal/no-current-actor variant.
- `battle-runtime-turn-order.qnt` and `battle-runtime-turn-advancement.qnt` no
  longer rely on unchecked list indexing for current actor selection.
- Focused QNT run blocks cover normal advancement, round wraparound, and the
  rejected or terminal empty-initiative case.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs` and `git diff --check`
  are green.

### Task 20 - QRFR-C20-LANE-CLOSEOUT-OR-NEXT-BATCH - Close the lane or create the next remediation batch

Status: `blocked`

Depends on:

- QRFR-C19-SECOND-PASS-QNT-RESCAN
- QRFR-C21-BATTLE-RUNTIME-QNT-INITIATIVE-NONEMPTY

Input:

- Task 19 rescan output.
- Task 21 residual state-shape output.
- Current git status and all plan files changed by this lane.

Output:

- If the lane converged, mark completed tasks and update
  `plans/QNT_REVIEW_FINDINGS_REMEDIATION_PLAN.md` with final disposition.
- If the lane did not converge, create the next Ralph lane or append exact
  follow-up tasks here.
- Keep Ralph from ending with hidden QNT review debt.

Acceptance:

- Ralph has either a closed, converged lane or a concrete next runnable queue.
- No broad prose-only backlog remains for unresolved important findings.
- `git diff --check` is clean.
