# Active Plan

Date: 2026-05-06

This is the single active planning queue.
Completed PBA15A0A-PBA29 work was removed from this queue after closeout; older
closeout history remains in git history.

Current authority summary:

- `@dnd/battle-runtime` plus `packages/battle-runtime/battle-runtime.qnt` is the
  promoted battle authority for new Unit/StatBlock-backed behavior.
- Root `battle.qnt` and old v0 battle code are legacy proof/restore source
  material only.
- The most recent proof work is `QCORE1`: the first production stateless Quint
  rule-core procedure using the measured QCORE0 composition pattern.
- Broad widening should proceed through newly added tasks that use Surface
  support profiles and package-owned runtime procedures rather than authored-id
  dispatch or projected-executable vocabulary.

Primary context links:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
- [MOVEMENT_GEOMETRY_OWNERSHIP.md](/workspace/typescript/dnd/plans/MOVEMENT_GEOMETRY_OWNERSHIP.md)
- [MCPA3_SPATIAL_ACTION_CONTRACTS.md](/workspace/typescript/dnd/plans/MCPA3_SPATIAL_ACTION_CONTRACTS.md)
- [packages/battle-runtime/README.md](/workspace/typescript/dnd/packages/battle-runtime/README.md)
- [packages/battle-runtime/ARCHITECTURE_GRAPH.md](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md)
- [packages/character-creation-runtime/README.md](/workspace/typescript/dnd/packages/character-creation-runtime/README.md)
- [packages/character-creation-runtime/VOCABULARY.md](/workspace/typescript/dnd/packages/character-creation-runtime/VOCABULARY.md)

## Status Vocabulary

- `ready-for-research`: research/source reading is the next step.
- `ready-for-implementation-after-light-research`: implementation may begin
  after the listed RAW/blast-radius check.
- `blocked`: a dependency or owner decision must land first.
- `deferred`: owner explicitly parked the work.
- `done`: work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status.
Keep it synchronized with the DAG table and task details.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 84,
      "id": "QCORE0",
      "status": "done",
      "title": "Research Composable Quint Rule-Core Architecture"
    },
    {
      "number": 85,
      "id": "QCORE1",
      "status": "done",
      "title": "Create First Stateless Quint Rule-Core Procedure"
    },
    {
      "number": 86,
      "id": "QCORE2",
      "status": "done",
      "title": "Prove Zero-HP Damage and Death Saving Throw Rule-Core Procedures"
    }
  ]
}
-->

## Handoff Rules

- Start with the lowest-numbered task whose status is
  `ready-for-implementation-after-light-research` or `ready-for-research`.
- Keep this file small. Put research, closeout detail, and long evidence in
  task-specific plan files or archive files, then link them here.
- When changing a task's status, dependency, order, ID, or title, update the
  Ralph Task Index, DAG table, and task details in the same edit.
- Any implementation task must read the relevant local SRD text under
  `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before rules
  edits.
- Battle-runtime behavior changes must update
  `packages/battle-runtime/README.md` and
  `packages/battle-runtime/ARCHITECTURE_GRAPH.md` when architecture or public
  behavior changes.
- Spatial facts always come from the table/caller/session. Do not plan grid
  state, LOS/pathfinding/cover derivation, or adjacency caches in Core,
  promoted runtimes, or MCP; plan explicit table-supplied facts instead.
- Character-creation behavior changes must update
  `packages/character-creation-runtime/README.md` and
  `packages/character-creation-runtime/VOCABULARY.md` when architecture or
  vocabulary changes.
- Shared algebra changes must update `packages/shared-algebras/README.md` or
  relevant package-local proof docs.
- Do not run battle MBT for research-only tasks. Use the smallest MBT tier that
  actually validates a completed behavior change.
- Implementation closeout must include `/simplify` convergence: minimum two
  rounds unless the changeset is trivial.

## DAG / Queue Order

| Order | Task                                                      | Status             | Depends on | Blocks | Research / plan | Next action |
| ----- | --------------------------------------------------------- | ------------------ | ---------- | ------ | --------------- | ----------- |
| 84    | QCORE0 - Research Composable Quint Rule-Core Architecture | done               | none       | QCORE1 | [QCORE0_COMPOSITION_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE0_COMPOSITION_RESEARCH.md) | Research complete: use stateless contract/procedure modules, shallow stateful proof modules, and serialized verifier checks. |
| 85    | QCORE1 - Create First Stateless Quint Rule-Core Procedure | done | QCORE0 | QCORE2 | [rule-core README](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/README.md) | Created the first production stateless rule-core QNT procedure and owned proof machine for Hit Point damage. |
| 86    | QCORE2 - Prove Zero-HP Damage and Death Saving Throw Rule-Core Procedures | done | QCORE1 | QCORE3 | [QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md) | Created zero-HP damage and Death Saving Throw rule-core QNT with a shallow QCORE1 lifecycle composition proof. |

## Task Details

### Task 84 - QCORE0 - Research Composable Quint Rule-Core Architecture

Status: `done`

Depends on: none
Blocks: QCORE1

Result: research and spike complete. See
[QCORE0_COMPOSITION_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE0_COMPOSITION_RESEARCH.md)
and
[qcore0-composition README](/workspace/typescript/dnd/packages/shared-algebras/proofs/qcore0-composition/README.md).

Context:

- The long-term goal is to restore a 100% RAW rule core written in Quint without
  recreating the v0 failure mode where some traces take effectively forever.
- Quint authored facts are proof fixtures, not canonical content mirrors.
  Fixtures should primarily prove reusable rule procedure families. SRD-like
  names/mechanics may be used when legal and helpful; non-SRD/PHB-like fixtures
  must use fake names and minimal executable facts only.
- QNT should prove rule procedures after projection, not Surface/DLC parser
  correctness. Surface/DLC authored content is parsed by TypeScript into
  executable procedure facts; QNT fixtures instantiate those proof-facing facts
  directly.
- Support gates as a concept should disappear. Typed projection parsers remain
  the boundary from authored content to executable procedure facts.
- The likely architecture is small algebra/procedure modules first, with
  battle-level integration specs reserved for selected composition proofs, but
  QCORE0 must measure Quint behavior before finalizing that architecture.

Acceptance:

- Upstream research scans `informalsystems/quint` docs, examples, issues,
  discussions, and relevant code for module/import semantics, compositional
  specification patterns, state-space control, evaluator behavior, and known
  performance pathologies.
- Local spike specs exercise at least these patterns:
  - pure function/contract import;
  - implementation transition import;
  - importing a module with unused vars/actions;
  - a procedure module proved against an abstract contract;
  - a shallow integration module that composes two small procedures.
- Each experiment records the command, backend/evaluator, state variables,
  actions, trace depth or invariant bounds, runtime, and observed failure mode
  if slow or nonterminating.
- The closeout chooses allowed QNT module kinds, such as implementation modules,
  contract modules, fixture modules, and integration modules, and names banned
  or high-risk import/composition patterns.
- No production rule-core module is created until the composition pattern is
  measured and recorded.

Verification:

- `pnpm exec quint typecheck` or the smallest equivalent typecheck command for
  each spike file.
- Focused `pnpm exec quint test` / `pnpm exec quint run` commands for each
  local experiment.
- Focused serialized `pnpm exec quint compile` / `pnpm exec quint verify`
  checks for the shallow integration, stateful delegate, unused import, and
  branch blow-up POC.
- No battle MBT.
- `/simplify` convergence, minimum two rounds for the resulting plan/spike
  design.

Plan Impact: QCORE1 is now the first production rule-core module/proof-layout
task using the measured composition pattern.

### Task 85 - QCORE1 - Create First Stateless Quint Rule-Core Procedure

Status: `done`

Depends on: QCORE0
Blocks: QCORE2

Result: created the first production rule-core proof location and positive-Hit
Point damage procedure. See
[rule-core README](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/README.md),
[hit-point-damage.qnt](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt),
and
[hit-point-damage-inductive.qnt](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt).

Context:

- QCORE0 established the composition rule: reusable modules are stateless
  contracts/procedures, stateful proof machines are shallow owners, and broad
  battle-level specs are reserved for selected integration proofs.
- The first production procedure should be small enough to keep verifier state
  bounded, but representative enough to validate the layout for future rule
  families.
- Fixtures are projection-shaped authored facts, not Surface mirrors. They may
  use SRD-like names/mechanics where legal and useful; PHB-like cases use fake
  names and minimal executable facts.

Acceptance:

- Create or choose the production rule-core proof location.
- Add one stateless contract/procedure module with projection-shaped facts and
  pure legality/procedure functions.
- Add one small stateful proof machine that imports only the stateless contract.
- Record a branch budget beside each `any` action.
- Do not introduce support gates.
- Do not import Surface schema into QNT.
- Do not create a broad battle-level composition spec in this task.

Verification:

- Read `.references/srd-5.2.1/Playing-the-Game.md` Damage and Healing, Hit
  Points, Temporary Hit Points, Dropping to 0 Hit Points, Monster Death, Massive
  Damage, and Falling Unconscious.
- Checked `UBIQUITOUS_LANGUAGE.md` Hit Points and Death plus creature/stat-block
  language.
- Checked `ASSUMPTIONS.md` A12 and A16.
- `pnpm exec quint typecheck packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- `pnpm exec quint typecheck packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt`
- `pnpm exec quint test packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- `pnpm exec quint run packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt --max-samples=2000 --max-steps=8 --invariant=invariant --verbosity=1 --backend=rust`
- `pnpm exec quint compile packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt --target=json --out=/tmp/qcore1_hit_point_damage.json --verbosity=1`
- Serialized Apalache:
  `pnpm exec quint verify packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt --inductive-invariant=invariant --invariant=invariant --max-steps=1 --verbosity=1`
- No battle MBT.
- RAW/ubiquitous/architecture reviewer found the original at-0-HP scope hole
  and contract invalid-state gap. Fixed by renaming the procedure to positive
  Hit Point damage, adding `canApplyResolvedDamageToPositiveHitPoints(...)`,
  guarding the proof action, and making `legalVitals(...)` reject a non-dead
  player character at 0 Hit Points without Unconscious.
- `/simplify` convergence:
  - Round 1 found the same at-0-HP scope hole before final closeout; fixed with
    executable guard plus narrower procedure naming.
  - Round 2 found no additional structural issue in the QCORE1 QNT shape:
    stateless procedure module, owned proof machine, no Surface schema, no
    support gates, branch budget near `any`, and serialized verifier command.

### Task 86 - QCORE2 - Prove Zero-HP Damage and Death Saving Throw Rule-Core Procedures

Status: `done`

Depends on: QCORE1
Blocks: QCORE3

Research: see
[QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md).

Result: created the zero-HP lifecycle rule-core procedure and owned proof
machine. See
[zero-hit-point-lifecycle.qnt](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt),
[zero-hit-point-lifecycle-inductive.qnt](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt),
and
[rule-core README](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/README.md).

Context:

- QNT is the first authority for every production-modeled reducer procedure,
  including procedures reached through Unit/StatBlock/Spell projection.
- Surface/DLC authored facts are not modeled in QNT. QNT fixtures instantiate
  projection-shaped executable facts directly, using SRD-like facts where legal
  and fake names for non-SRD authored content.
- Forward architecture replaces support gates with typed projection parsers:
  projection parsers classify authored content into executable procedure facts;
  rule-core QNT proves those procedure facts and battle-runtime reducers mirror
  them.
- Deepness comes first. QCORE2 extends QCORE1 through the adjacent zero-HP
  lifecycle before widening to attacks, spells, features, and monster controls.

Acceptance:

- Add a stateless rule-core procedure module for damage at 0 Hit Points and
  Death Saving Throw counter updates.
- Reuse or align with the existing `death-saves-algebra` semantics rather than
  creating a second counter model.
- Add one owned proof machine with a recorded branch budget near each `any`.
- Add one shallow integration module or proof action that composes QCORE1
  positive-HP damage with zero-HP damage/Death Saving Throw lifecycle facts.
- Keep QNT Surface-free and projection-shaped.
- No broad battle-runtime composition spec in this task.

Verification:

- Read `.references/srd-5.2.1/Playing-the-Game.md` Dropping to 0 Hit Points,
  Falling Unconscious, Death Saving Throws, Damage at 0 Hit Points, and
  Healing.
- Checked `UBIQUITOUS_LANGUAGE.md` Hit Points and Death, Damage, Conditions, and
  Action Lifecycle.
- Checked `ASSUMPTIONS.md` entries that govern monster-vs-character zero-HP
  policy and battle/session handoff.
- `pnpm exec quint typecheck packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt`
- `pnpm exec quint typecheck packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt`
- `pnpm exec quint test packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt`
- `pnpm exec quint run packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt --max-samples=2000 --max-steps=8 --invariant=invariant --verbosity=1 --backend=rust`
- `pnpm exec quint compile packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt --target=json --out=/tmp/qcore2_zero_hit_point_lifecycle.json --verbosity=1`
- Serialized Apalache:
  `pnpm exec quint verify packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt --inductive-invariant=invariant --invariant=invariant --max-steps=1 --verbosity=1`
- No battle MBT because no TypeScript reducer behavior changed.
- `/simplify` convergence:
  - Round 1 found one Quint scoping issue in the inductive action binding;
    fixed by moving the `nextLifecycle` binding outside the `all` block.
  - Round 2 found no additional structural issue: QCORE2 keeps Surface out of
    QNT, keeps death canonical in `CreatureVitals`, avoids a duplicate death
    flag in the Death Saving Throw lifecycle, records a branch budget, and
    verifies with serialized Apalache.
