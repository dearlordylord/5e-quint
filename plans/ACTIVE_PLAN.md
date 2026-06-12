# Active Plan: Deterministic Replay Portability Audit

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "DRP-T01-INVENTORY-GATE",
      "status": "done",
      "title": "Refresh deterministic replay witness inventory and classify replay roles"
    },
    {
      "number": 2,
      "id": "DRP-T02-SHOVE-OUTCOME-DECISION",
      "status": "done",
      "title": "Audit Shove outcome deterministic replay portability"
    },
    {
      "number": 3,
      "id": "DRP-T03-SPELL-REST-BENEFIT-APPLICATION",
      "status": "done",
      "title": "Audit spell-rest benefit application replay portability"
    },
    {
      "number": 4,
      "id": "DRP-T04-ABILITY-SEARCH-REPLAY",
      "status": "done",
      "title": "Audit ability, skill, and Search deterministic replay portability"
    },
    {
      "number": 5,
      "id": "DRP-T05-DAMAGE-DISPOSITION-REPLAY",
      "status": "done",
      "title": "Audit attack damage disposition and Knock Out replay portability"
    },
    {
      "number": 6,
      "id": "DRP-T06-ARMOR-CLASS-FORMULA",
      "status": "ready-for-research",
      "title": "Audit Armor Class base formula selected-identity replay portability"
    },
    {
      "number": 7,
      "id": "DRP-T07-CREATION-CLASS-FEATURE-PROJECTIONS",
      "status": "ready-for-research",
      "title": "Audit class-feature resource and source-fact projection replays"
    },
    {
      "number": 8,
      "id": "DRP-T08-CREATION-WIZARD-SPELLBOOK",
      "status": "ready-for-research",
      "title": "Audit Wizard spellbook learning selected-identity replay portability"
    },
    {
      "number": 9,
      "id": "DRP-T09-SHEET-FEATURE-RESOURCES",
      "status": "ready-for-research",
      "title": "Audit Character Sheet feature-resource transition replay portability"
    },
    {
      "number": 10,
      "id": "DRP-T10-SHEET-ABILITY-CHECK-PROFICIENCY",
      "status": "ready-for-research",
      "title": "Audit Ability Check Proficiency Bonus replay portability"
    },
    {
      "number": 11,
      "id": "DRP-T11-BATTLE-HANDOFF-INIT",
      "status": "ready-for-research",
      "title": "Audit character-battle initialization projection replay portability"
    },
    {
      "number": 12,
      "id": "DRP-T12-BATTLE-HANDOFF-SETTLEMENT",
      "status": "blocked",
      "title": "Audit character-battle settlement and identity-conflict replay portability"
    },
    {
      "number": 13,
      "id": "DRP-T13-HIT-POINT-DAMAGE-RUST-PARITY",
      "status": "ready-for-research",
      "title": "Audit positive Hit Point damage replay and Rust dry-run parity"
    },
    {
      "number": 14,
      "id": "DRP-T14-HP-REST-HIT-DICE",
      "status": "blocked",
      "title": "Audit HP, rest, and Hit Dice transition replay portability"
    },
    {
      "number": 15,
      "id": "DRP-T15-HIT-POINT-MAXIMUM",
      "status": "ready-for-research",
      "title": "Audit Hit Point Maximum derivation replay portability"
    },
    {
      "number": 16,
      "id": "DRP-T16-SPELL-SLOTS-AND-PACT-SLOTS",
      "status": "blocked",
      "title": "Audit Spell Slot and Pact Slot transition and table replays"
    },
    {
      "number": 17,
      "id": "DRP-T17-WEAPON-MASTERY-RESELECTION",
      "status": "ready-for-research",
      "title": "Audit Weapon Mastery reselection replay portability"
    },
    {
      "number": 18,
      "id": "DRP-T18-SPELL-ACCESS-SELECTED-IDENTITY",
      "status": "ready-for-research",
      "title": "Audit spellbook Ritual and class-feature prepared Spell Access replays"
    },
    {
      "number": 19,
      "id": "DRP-T19-LANE-CLOSEOUT",
      "status": "blocked",
      "title": "Close out deterministic replay portability decisions and next queue"
    }
  ]
}
-->

## Why This Lane

The portable parity witness lane closed the open rules-kernel gaps: generated
coverage reports show 120 obligations, 114 covered obligations, zero open
transitional obligations, and only permanent boundary or unsupported rows
outside the covered set. The same closeout recorded that the three named
composition seams now have focused MBT witnesses and that the remaining TS-side
protocol-vocabulary witness is an explicit policy decision, not an unwitnessed
reducer gap.

The next useful portability question is narrower: which deterministic QNT
replays should stay closed fixtures, and which should become generative focused
MBT before a non-TS harness depends on them? This lane audits those entries from
the checked registry, not from stale pre-closeout counts.

## DRP-T01 Checked Inventory Note

Task DRP-T01 refreshed the deterministic replay inventory from
`plans/rules-kernel-coverage/obligations.jsonl`:

- 22 `deterministic-qnt-replay` witness entries.
- 21 obligation rows with at least one deterministic replay.
- 19 replay-only obligation rows, carrying 20 replay entries because
  `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` has both init-side and
  settlement-side deterministic replay witnesses.
- 2 supplemental deterministic replay rows beside focused MBT:
  `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` and
  `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`.

Do not describe this lane as "21 replay-only" work. Use the checked distinction
above: 22 replay entries, 21 replay-bearing obligation rows, 19 replay-only
obligation rows, and 2 supplemental replay rows.

Every checked deterministic replay row is assigned below:

| Task | Replay role | Obligation row(s) |
| --- | --- | --- |
| DRP-T02 | replay-only | `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` |
| DRP-T03 | replay-only | `SHEET.SPELL_REST_BENEFIT.APPLICATION` |
| DRP-T04 | supplemental beside focused MBT | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` |
| DRP-T05 | supplemental beside focused MBT | `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` |
| DRP-T06 | replay-only | `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` |
| DRP-T07 | replay-only | `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION`; `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION` |
| DRP-T08 | replay-only | `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION` |
| DRP-T09 | replay-only | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| DRP-T10 | replay-only | `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` |
| DRP-T11 | replay-only | `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION` |
| DRP-T12 | replay-only | `CHARACTER.BATTLE.HANDOFF.SETTLEMENT`; `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` |
| DRP-T13 | replay-only | `SHARED.HIT_POINTS.POSITIVE_DAMAGE` |
| DRP-T14 | replay-only | `SHEET.HP_REST_HIT_DICE.TRANSITIONS` |
| DRP-T15 | replay-only | `SHEET.HIT_POINTS.MAXIMUM_DERIVATION` |
| DRP-T16 | replay-only | `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS`; `SHEET.SPELL_SLOTS.TABLE_DERIVATION` |
| DRP-T17 | replay-only | `SHEET.WEAPON_MASTERY.RESELECTION` |
| DRP-T18 | replay-only | `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION`; `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` |

The lane has two allowed outcomes per replay:

- Keep deterministic replay, with a durable rationale in the obligation row
  explaining why random branch interleavings are not the risk at that boundary.
- Promote to focused MBT, but only when the task shows a real generative
  interleaving, ordering, or table-choice risk that deterministic replay cannot
  cover.

Do not add a parallel Rust or generated state model in this lane. Rust dry-run
notes may be refreshed only where existing checked artifacts already own that
manual evidence, such as Hit Point damage and recovery.

## Context Budget

Read by default:

- `CLAUDE.md`
- `plans/QNT_COVERAGE_PROGRAM.md`
- `plans/rules-kernel-coverage/README.md`
- `plans/rules-kernel-coverage/REPORT.md`
- The current deterministic replay rows in
  `plans/rules-kernel-coverage/obligations.jsonl`
- The relevant QNT owner roles in
  `plans/rules-kernel-coverage/qnt-owner-roles.jsonl`
- The relevant generator-readiness rows in
  `plans/rules-kernel-coverage/generator-readiness.jsonl`
- The exact QNT driver and TS witness file named by the current task
- The SRD 5.2.1 and `UBIQUITOUS_LANGUAGE.md` anchors named by the current
  obligation before changing any modeled rule or replay semantics

Do not reread closed Ralph lanes, deleted historical plans, generated MBT
traces, or production runtime files unrelated to the current replay. If a task
only records a witness-shape decision and changes no rule behavior, it should
still verify domain language against the obligation title and rationale.

## Lane Rules

- Before starting each task, run the Ralph task-base check from `CLAUDE.md`:
  log the declared base ref, log `HEAD`, and confirm the Base SHA is an
  ancestor of `HEAD`. Stop on mismatch.
- Use pnpm only.
- Treat battle MBT as scarce. Do not run battle MBT for inventory or planning
  exploration. Run a focused MBT only after a task actually adds or changes a
  battle MBT witness.
- New or changed `.mbt.qnt` drivers must import only leaf modules and must pass
  `scripts/check-mbt-driver-closure.cjs` through `pnpm quality`.
- Use the typed witness protocol for new battle-runtime witnesses. Do not
  reintroduce legacy mutable protocol fields.
- Do not dispatch production runtime behavior on authored Unit or Spell
  identity. SRD identity may appear in content, fixtures, and selected-identity
  evidence only.
- Do not duplicate state across QNT, runtime, bridge, or dry-run artifacts. If
  a Rust dry-run note needs a projection, project from the existing runtime
  owner recorded in `kernel-ir-boundaries.jsonl`.
- If a deterministic replay is kept, the task must make the reason
  checker-readable in `obligations.jsonl` rather than leaving it only in a plan
  note.
- If a deterministic replay is promoted, update the obligation row,
  package-local script, owner-role rows if needed, and focused witness in the
  same task.

## Verification

Every task must include:

- RAW and ubiquitous-language check against the SRD and language anchors needed
  for that replay. If the task changes no modeled rule, state that the check
  was limited to obligation wording, domain terms, and existing rationale.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes after implementation. Fix
  every reasonable finding, explicitly reject only findings with a concrete
  reason, and repeat until no reasonable findings remain.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

Run `pnpm quality` for lane closeout and for any task that changes checker
logic, package scripts, QNT drivers, or TypeScript code. For docs-only or
obligation-rationale-only tasks, `pnpm quality` is optional unless the task file
or reviewer asks for the broad gate.

For any battle MBT run, first check:

```sh
ps aux | grep vitest | grep -v grep
ps aux | grep quint_evaluator | grep -v grep
```

If a prior `quint_evaluator` is alive, stop it with
`killall -9 quint_evaluator`. If a vitest/MBT process is alive, do not start
another MBT run. Use the timing/background protocol from `CLAUDE.md`.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | DRP-T01-INVENTORY-GATE | done | none | Refreshed the deterministic replay inventory from checked artifacts and assigned each replay to one lane task. |
| 2 | DRP-T02-SHOVE-OUTCOME-DECISION | ready-for-research | DRP-T01 | Portability audit of the recorded PPW-T11 closed-fixture decision; reopen only on new interleaving evidence. |
| 3 | DRP-T03-SPELL-REST-BENEFIT-APPLICATION | ready-for-research | DRP-T01 | Sheet spell-rest benefit fixture and lockout replay. |
| 4 | DRP-T04-ABILITY-SEARCH-REPLAY | done | DRP-T01 | Mixed focused-MBT plus deterministic replay row; do not duplicate existing focused coverage. |
| 5 | DRP-T05-DAMAGE-DISPOSITION-REPLAY | done | DRP-T01 | Knock Out accepted/rejected table facts beside existing feature MBT. |
| 6 | DRP-T06-ARMOR-CLASS-FORMULA | ready-for-research | DRP-T01 | Selected-identity formula projection. |
| 7 | DRP-T07-CREATION-CLASS-FEATURE-PROJECTIONS | ready-for-research | DRP-T01 | Resource and source-fact projection rows share one driver. |
| 8 | DRP-T08-CREATION-WIZARD-SPELLBOOK | ready-for-research | DRP-T01 | Selected Wizard spellbook learning replay. |
| 9 | DRP-T09-SHEET-FEATURE-RESOURCES | ready-for-research | DRP-T01 | Feature resources bridge and sheet transitions. |
| 10 | DRP-T10-SHEET-ABILITY-CHECK-PROFICIENCY | ready-for-research | DRP-T01 | Jack of All Trades, proficiency, and Expertise scalar projection. |
| 11 | DRP-T11-BATTLE-HANDOFF-INIT | ready-for-research | DRP-T01 | Character Sheet to battle init projection. |
| 12 | DRP-T12-BATTLE-HANDOFF-SETTLEMENT | blocked | DRP-T11 | Settlement and identity-conflict replays share handoff assumptions. |
| 13 | DRP-T13-HIT-POINT-DAMAGE-RUST-PARITY | ready-for-research | DRP-T01 | Align replay decision with existing Hit Point damage Rust dry-run evidence. |
| 14 | DRP-T14-HP-REST-HIT-DICE | blocked | DRP-T13 | HP recovery dry run reuses damage/vitals shapes. |
| 15 | DRP-T15-HIT-POINT-MAXIMUM | ready-for-research | DRP-T01 | Hit Point Maximum formula replay. |
| 16 | DRP-T16-SPELL-SLOTS-AND-PACT-SLOTS | blocked | DRP-T14 | Slot transitions import rest outcome facts. |
| 17 | DRP-T17-WEAPON-MASTERY-RESELECTION | ready-for-research | DRP-T01 | Selected-identity plus identity-free reselection semantics. |
| 18 | DRP-T18-SPELL-ACCESS-SELECTED-IDENTITY | ready-for-research | DRP-T01 | Spellbook Ritual and class-feature prepared Spell Access selected-identity replays. |
| 19 | DRP-T19-LANE-CLOSEOUT | blocked | DRP-T02, DRP-T03, DRP-T04, DRP-T05, DRP-T06, DRP-T07, DRP-T08, DRP-T09, DRP-T10, DRP-T11, DRP-T12, DRP-T13, DRP-T14, DRP-T15, DRP-T16, DRP-T17, DRP-T18 | Recompute reports, summarize kept/promoted replay decisions, and create the next coherent queue if needed. |

## Task Details

### Task 1 - DRP-T01-INVENTORY-GATE

Status: `done`

Input:

- `plans/rules-kernel-coverage/obligations.jsonl`
- `plans/rules-kernel-coverage/REPORT.md`
- `plans/QNT_COVERAGE_PROGRAM.md#Portable-Parity-Witness-Closeout`

Output:

- Refresh the deterministic replay count from checked artifacts.
- Add or update a short lane note if the count or task assignment differs from
  this plan.
- Confirm every deterministic replay row has a task assignment below.

Acceptance:

- No unassigned deterministic replay entries remain.
- No task starts from stale "21 replay-only" language; use the current checked
  registry count and distinguish replay-only from supplemental replays.

### Task 2 - DRP-T02-SHOVE-OUTCOME-DECISION

Status: `done`

Input:

- Obligation `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY`
- `packages/shared-algebras/proofs/rule-core/shove-outcome.qnt`
- `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts`

Output:

- Start from the PPW-T11 decision already recorded on
  `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` (the `deterministicReplayRationale`
  in `obligations.jsonl`); do not re-decide the witness mode.
- Audit the replay for portability: confirm the replayed facts come from the
  QNT spec rather than TS-side constants, so a sibling-language harness can
  replay the same closed outcome table.
- Reopen the witness-mode decision only on new evidence of an interleaving
  risk the recorded rationale does not cover.

Acceptance:

- Portability result recorded per the DRP-T01 inventory note.
- The recorded rationale stands unless the audit cites new evidence; relevant
  focused test runs if the witness changes.

### Task 3 - DRP-T03-SPELL-REST-BENEFIT-APPLICATION

Status: `done`

Input:

- Obligation `SHEET.SPELL_REST_BENEFIT.APPLICATION`
- `packages/character-sheet-runtime/character-sheet-spell-rest-benefit-application.mbt.qnt`
- `packages/character-sheet-runtime/src/spell-rest-benefit-application.mbt.test.ts`

Output:

- Decide whether the completed-cast and Long Rest lockout replay remains a
  closed fixture or needs a generative sheet-runtime MBT.

Acceptance:

- Final witness mode is checker-readable.
- No duplicate rest lockout state is introduced.

### Task 4 - DRP-T04-ABILITY-SEARCH-REPLAY

Status: `done`

Input:

- Obligation `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`
- Existing focused MBT and deterministic replay rows for ability, skill,
  Search, Guidance, Enhance Ability, and Command replay facts.

Output:

- Confirm which facts are already generatively covered and which remain
  deterministic selected-case fixtures.

Acceptance:

- No duplicate focused witness is added for coverage already owned by
  `ability-check-choice-search`.
- Any kept deterministic replay has a closed-case rationale.

### Task 5 - DRP-T05-DAMAGE-DISPOSITION-REPLAY

Status: `done`

Input:

- Obligation `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`
- `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- `packages/battle-runtime/src/rule-core-attack-damage-disposition.mbt.test.ts`
- Existing zero-Hit-Point feature MBT witness.

Output:

- Decide whether accepted melee Knock Out and rejected ranged Knock Out should
  remain deterministic table-fact fixtures.

Acceptance:

- The replay's relationship to zero-Hit-Point replacement focused MBT is
  explicit and checker-readable.

### Task 6 - DRP-T06-ARMOR-CLASS-FORMULA

Status: `ready-for-research`

Input:

- Obligation `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE`
- `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/src/armor-class-base-selected-identity.mbt.test.ts`

Output:

- Audit selected-identity formula replay for portability and keep or promote
  its witness mode.

Acceptance:

- The rationale distinguishes formula selection identity from runtime Armor
  Class state.

### Task 7 - DRP-T07-CREATION-CLASS-FEATURE-PROJECTIONS

Status: `ready-for-research`

Input:

- Obligations `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` and
  `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION`
- `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- `packages/character-creation-runtime/src/class-feature-projections.mbt.test.ts`

Output:

- Decide whether the shared fixed projection replay remains deterministic for
  class-feature resource and source-fact projections.

Acceptance:

- Resource facts and source facts remain distinct domain concepts in any
  updated rationale or witness.

### Task 8 - DRP-T08-CREATION-WIZARD-SPELLBOOK

Status: `ready-for-research`

Input:

- Obligation `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION`
- `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`
- `packages/character-creation-runtime/src/class-feature-selected-identity.mbt.test.ts`

Output:

- Audit Wizard spellbook learning selected-identity replay for portability.

Acceptance:

- The task does not dispatch runtime behavior on authored spell identity beyond
  the selected-identity evidence boundary.

### Task 9 - DRP-T09-SHEET-FEATURE-RESOURCES

Status: `ready-for-research`

Input:

- Obligation `SHEET.FEATURE_RESOURCES.TRANSITIONS`
- `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt`
- `packages/character-battle-runtime/src/character-sheet-feature-resources.mbt.test.ts`

Output:

- Decide whether the feature-resource replay remains a closed fixture or
  should split into focused generative sheet-resource witnesses.

Acceptance:

- Any split keeps feature resource pools, use counts, and battle bridge facts
  as typed facts rather than name-based special cases.

### Task 10 - DRP-T10-SHEET-ABILITY-CHECK-PROFICIENCY

Status: `ready-for-research`

Input:

- Obligation `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS`
- `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- `packages/character-sheet-runtime/src/ability-check-proficiency-bonus.mbt.test.ts`

Output:

- Audit the scalar Ability Check Proficiency Bonus replay.

Acceptance:

- Jack of All Trades, proficiency, Expertise, and other-Proficiency-Bonus
  exclusion precedence remain modeled by typed facts, not authored identity.

### Task 11 - DRP-T11-BATTLE-HANDOFF-INIT

Status: `ready-for-research`

Input:

- Obligation `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION`
- `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt`
- `packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts`

Output:

- Audit Character Sheet to battle initialization projection replay.

Acceptance:

- No parallel battle-entry state is introduced.
- Any kept deterministic replay explains why projection facts, not random
  battle interleavings, are the risk.

### Task 12 - DRP-T12-BATTLE-HANDOFF-SETTLEMENT

Status: `blocked`

Input:

- Obligations `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` and
  `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS`
- `packages/character-battle-runtime/character-battle-settlement.mbt.qnt`
- `packages/character-battle-runtime/src/character-battle-settlement.mbt.test.ts`
- Init-side identity-conflict replay from Task 11.

Output:

- Audit settlement and identity-conflict deterministic replays.

Acceptance:

- Handoff assumptions stay explicit in `ASSUMPTIONS.md` or the checked
  obligation rationale where already owned; do not create a second identity
  conflict model.

### Task 13 - DRP-T13-HIT-POINT-DAMAGE-RUST-PARITY

Status: `ready-for-research`

Input:

- Obligation `SHARED.HIT_POINTS.POSITIVE_DAMAGE`
- `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts`
- `plans/rules-kernel-coverage/HIT_POINT_DAMAGE_RUST_DRY_RUN.md`

Output:

- Audit the four-case deterministic replay and confirm the Rust dry-run note
  still matches the checked semantic core.

Acceptance:

- Any dry-run note updates remain documentation only and do not add committed
  Rust source or ABI.

### Task 14 - DRP-T14-HP-REST-HIT-DICE

Status: `blocked`

Input:

- Obligation `SHEET.HP_REST_HIT_DICE.TRANSITIONS`
- `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`
- `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
- `packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`
- `plans/rules-kernel-coverage/HIT_POINT_RECOVERY_RUST_DRY_RUN.md`

Output:

- Audit HP/rest/Hit Dice deterministic replay and align with the recovery
  manual Rust dry-run artifact.

Acceptance:

- Short Rest, Long Rest, Hit Point Dice, Stable recovery, and positive
  Hit Point healing facts remain distinct. Do not store derived recovery facts
  beside their Character Sheet sources.

### Task 15 - DRP-T15-HIT-POINT-MAXIMUM

Status: `ready-for-research`

Input:

- Obligation `SHEET.HIT_POINTS.MAXIMUM_DERIVATION`
- `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
- `packages/character-sheet-runtime/src/hit-point-maximum.mbt.test.ts`

Output:

- Audit Hit Point Maximum formula replay.

Acceptance:

- Maximum derivation remains a projection from existing class Hit Dice,
  Constitution modifier, level, and reduction facts; no duplicate maximum state
  is added.

### Task 16 - DRP-T16-SPELL-SLOTS-AND-PACT-SLOTS

Status: `blocked`

Input:

- Obligations `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` and
  `SHEET.SPELL_SLOTS.TABLE_DERIVATION`
- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- `packages/character-sheet-runtime/src/spell-slots-pact-slots.mbt.test.ts`

Output:

- Audit Spell Slot/Pact Slot transition replay and table derivation replay.

Acceptance:

- Ordinary Spell Slots, Pact Slots, created slots, Arcane Recovery, Magical
  Cunning, Short Rest, and Long Rest facts stay typed and non-duplicated.

### Task 17 - DRP-T17-WEAPON-MASTERY-RESELECTION

Status: `ready-for-research`

Input:

- Obligation `SHEET.WEAPON_MASTERY.RESELECTION`
- `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/src/weapon-mastery-containers-selected-identity.mbt.test.ts`

Output:

- Audit Weapon Mastery selected-identity and identity-free reselection replay.

Acceptance:

- Eligible weapon facts project from installed Surface content and selected
  refs; do not add durable sheet-local Weapon Mastery state.

### Task 18 - DRP-T18-SPELL-ACCESS-SELECTED-IDENTITY

Status: `ready-for-research`

Input:

- Obligations `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` and
  `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION`
- `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/src/spellbook-ritual-selected-identity.mbt.test.ts`
- `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/src/class-feature-selected-identity.mbt.test.ts`

Output:

- Audit selected-identity replays for spellbook Ritual and class-feature
  prepared Spell Access.

Acceptance:

- Spell Access remains projected from retained CharacterBuild and Surface facts
  without a parallel prepared-spell roster or spellbook Ritual list.

### Task 19 - DRP-T19-LANE-CLOSEOUT

Status: `blocked`

Input:

- Completed DRP task outputs.
- Refreshed `plans/rules-kernel-coverage/REPORT.md`.
- `plans/QNT_COVERAGE_PROGRAM.md`.

Output:

- Summarize kept deterministic replays, promoted focused MBT witnesses, and any
  deferred owner-decision blockers.
- Update the QNT coverage program portable-witness closeout if the durable
  witness-mode mix changes.
- If the lane drains, create the next coherent active queue; if it does not,
  append exact repair tasks instead of ending on an empty task index.

Acceptance:

- `plans/ACTIVE_PLAN.md` does not end with an empty task index unless the
  closeout explicitly names the next plan file to run and records why no
  default queue should be active.
- Broad verification is green or any unrelated baseline failure is documented
  without expanding the task scope.

## Tooling

`scripts/ralph-run.sh:2126` and `scripts/sync-active-plan-to-ralph.sh:21`
reference this path as the default `--plan` / `--source`. This file now carries
the next default runnable Ralph queue. If a future decider wants to park this
lane, it must either move the queue to an explicit `plans/<lane>.md` entrypoint
or replace this file with a new concrete queue.
