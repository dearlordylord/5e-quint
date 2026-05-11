# Active Plan

Date: 2026-05-07

This is the single active planning queue.
Completed PBA15A0A-PBA29 work was removed from this queue after closeout; older
closeout history remains in git history.
Completed historical work was removed from this active queue after closeout;
older closeout history remains in git history, task-specific research files,
and linked package documentation.

Current authority summary:

- `@dnd/battle-runtime` plus `packages/battle-runtime/battle-runtime.qnt` is the
  promoted battle authority for new Unit/StatBlock-backed behavior.
- Archived restore-source packages are not active implementation targets.
- The most recent proof work is `QCORE11`: Stat Block attack controls,
  Multiattack named dispatch, Bonus Action and Reaction windows, Legendary
  Action windows, X/Day, Recharge, rest recharge, and start-turn recharge rolls.
- Broad widening should proceed through typed projection parsers and
  package-owned runtime procedures rather than authored-id dispatch,
  support-gate terminology, or projected-executable vocabulary.

Primary context links:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
- [MOVEMENT_GEOMETRY_OWNERSHIP.md](/workspace/typescript/dnd/plans/MOVEMENT_GEOMETRY_OWNERSHIP.md)
- [MCPA3_SPATIAL_ACTION_CONTRACTS.md](/workspace/typescript/dnd/plans/MCPA3_SPATIAL_ACTION_CONTRACTS.md)
- [packages/battle-runtime/README.md](/workspace/typescript/dnd/packages/battle-runtime/README.md)
- [packages/battle-runtime/ARCHITECTURE_GRAPH.md](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md)
- [packages/character-creation-runtime/README.md](/workspace/typescript/dnd/packages/character-creation-runtime/README.md)
- [packages/character-creation-runtime/VOCABULARY.md](/workspace/typescript/dnd/packages/character-creation-runtime/VOCABULARY.md)
- [QCORE0_COMPOSITION_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE0_COMPOSITION_RESEARCH.md)
- [QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md)
- [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)
- [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)
- [rule-core README](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/README.md)

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
      "number": 164,
      "id": "QMBT69",
      "status": "deferred",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 217,
      "id": "SRDINV31C",
      "status": "done",
      "title": "Promote Divine Smite After-Hit Runtime"
    },
    {
      "number": 218,
      "id": "SRDINV31D",
      "status": "done",
      "title": "Promote Ensnaring Strike Runtime"
    },
    {
      "number": 219,
      "id": "SRDINV31E",
      "status": "done",
      "title": "Promote Searing Smite Runtime"
    },
    {
      "number": 220,
      "id": "SRDINV31F",
      "status": "done",
      "title": "Promote True Strike Weapon Spell Runtime"
    },
    {
      "number": 223,
      "id": "SRDINV33",
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 224,
      "id": "SRDINV34",
      "status": "done",
      "title": "Promote Starry Wisp Object Target Runtime"
    },
    {
      "number": 225,
      "id": "SRDINV35",
      "status": "done",
      "title": "Author Missing Detect Spell Records"
    },
    {
      "number": 226,
      "id": "SRDINV36",
      "status": "done",
      "title": "Promote Hellish Rebuke Reaction Runtime"
    },
    {
      "number": 227,
      "id": "SRDINV37",
      "status": "done",
      "title": "Promote Charm Person Runtime"
    },
    {
      "number": 228,
      "id": "SRDINV38",
      "status": "ready-for-research",
      "title": "Research Sleep Save Loop Runtime"
    },
    {
      "number": 229,
      "id": "SRDINV39",
      "status": "ready-for-research",
      "title": "Promote Eldritch Blast Beam Runtime"
    },
    {
      "number": 230,
      "id": "SRDINV40",
      "status": "ready-for-research",
      "title": "Research Grease Ground Hazard Runtime Retry"
    },
    {
      "number": 231,
      "id": "SRDINV41",
      "status": "blocked",
      "title": "Recursive SRD Inventory Planning Review"
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
| 164   | QMBT69 - Recursive Unit Profile Planning Review | deferred | QMBT68 | none | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Still parked by the SRD inventory frontier instruction; QMBT68 is complete, but the older QMBT queue remains deferred until that frontier resumes it. |
| 217   | SRDINV31C - Promote Divine Smite After-Hit Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Divine Smite](/workspace/typescript/dnd/packages/surface/content/divine_smite.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Completed: Divine Smite is promoted as an immediate after-hit Bonus Action damage splice without replaying the base attack. |
| 218   | SRDINV31D - Promote Ensnaring Strike Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Ensnaring Strike](/workspace/typescript/dnd/packages/surface/content/ensnaring_strike.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Completed: Ensnaring Strike is promoted as an after-hit weapon spell with Strength save, Restrained, start-turn Piercing damage, helper escape by table reach fact, and spell-ending concentration cleanup. |
| 219   | SRDINV31E - Promote Searing Smite Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Searing Smite](/workspace/typescript/dnd/packages/surface/content/searing_smite.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Completed: Searing Smite is promoted as an after-hit melee weapon or Unarmed Strike spell with immediate Fire damage, timed start-turn Fire damage, Constitution save-to-end, and slot scaling. |
| 220   | SRDINV31F - Promote True Strike Weapon Spell Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [True Strike](/workspace/typescript/dnd/packages/surface/content/true_strike.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Completed: True Strike is promoted as a spell-hosted proficient material-weapon attack with spellcasting ability attack/damage replacement, Radiant-or-normal damage choice, and Radiant cantrip scaling. |
| 223   | SRDINV33 - Recursive SRD Inventory Planning Review | done | SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E, SRDINV29F3, SRDINV30A-SRDINV32B | SRDINV34-SRDINV40 | [SRDINV33 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed: refreshed spell Unit metrics, closed missing Heroism/Ensnaring Strike evidence, and appended SRDINV34-SRDINV40 plus SRDINV41 review. |
| 224   | SRDINV34 - Promote Starry Wisp Object Target Runtime | done | SRDINV33 | SRDINV41 | [SRDINV28E decision](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md), [battle-runtime target facts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spells-targeting.ts), [Starry Wisp](/workspace/typescript/dnd/packages/surface/content/starry_wisp.dhall), [Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall), [SRD Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [SRD Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Starry Wisp is promoted over the creature-or-object target subset with typed object target facts, object attack resolution, and object damage disposition; Dim Light and Invisible-benefit riders remain visible for SRDINV41. |
| 225   | SRDINV35 - Author Missing Detect Spell Records | done | SRDINV33 | SRDINV41 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Detect Evil and Good](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Detect Poison and Disease](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Detect Evil and Good and Detect Poison and Disease have SRD-provenance Spell Definition records installed in the SRD Unit catalog; detection, occlusion, Hallow discovery, and poison/disease identification remain unsupported runtime behavior. |
| 226   | SRDINV36 - Promote Hellish Rebuke Reaction Runtime | done | SRDINV33 | SRDINV41 | [Hellish Rebuke](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [battle reactions](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reaction-triggers.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Hellish Rebuke is promoted as an after-damage Reaction spell with caller-supplied visible-within-60-feet facts, Dexterity save, Fire damage, half damage on success, slot scaling, and Reaction plus Spell Slot spend. |
| 227   | SRDINV37 - Promote Charm Person Runtime | done | SRDINV33 | SRDINV41 | [Charm Person](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Animal Friendship evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Charm Person is promoted as Humanoid-target Wisdom-save Charmed with hostile-target save Advantage projection, one-hour spell-owned duration, caster-or-ally damage break, slot-scaled target count, QNT parity coverage, and deterministic admission evidence; Friendly disposition/social effects and target knowledge remain visible for SRDINV41. |
| 228   | SRDINV38 - Research Sleep Save Loop Runtime | ready-for-research | SRDINV33 | SRDINV41 | [Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Research the Sleep save loop and Incapacitated/Unconscious lifecycle; split before implementation if repeat-save or wake-up procedures exceed one execution invariant. |
| 229   | SRDINV39 - Promote Eldritch Blast Beam Runtime | ready-for-research | SRDINV33 | SRDINV41 | [Eldritch Blast](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [spell attack runtime](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote per-beam ranged spell attack resolution with cantrip beam scaling, independent targets, independent attack rolls, Force damage, and one Magic action spend. |
| 230   | SRDINV40 - Research Grease Ground Hazard Runtime Retry | ready-for-research | SRDINV33 | SRDINV41 | [Grease](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Retry Grease only as a standalone recurring ground-hazard lifecycle with table-supplied area membership for cast-time, enter-area, and end-turn saves. |
| 231   | SRDINV41 - Recursive SRD Inventory Planning Review | blocked | SRDINV34-SRDINV40 | none | [SRDINV33 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Review SRDINV34-SRDINV40 results, refresh spell Unit metrics, inspect rejected partial-support findings including Charm Person Friendly disposition/social effects and target knowledge, and append the next concrete Surface-blocker batch. |

## Task Details
### Task 164 - QMBT69 - Recursive Unit Profile Planning Review

Status: `deferred`

Depends on: QMBT68

Blocks: none

Research / plan:
[QMBT66_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: deferred while the SRD inventory frontier runs. QMBT68 is complete; when
resumed, review QMBT67-QMBT68 findings, update the PRD and plan docs, and append
the next coherent widening or cleanup batch unless the Unit profile matrix lane
is explicitly complete. AC/base-formula work is a strong candidate because
Barbarian and Monk Unarmored Defense have repeatedly been deferred for
one-formula-at-a-time semantics, but QMBT69 must re-check the refreshed matrix
and QMBT67-QMBT68 discoveries before selecting the next batch.

Out of scope: implementation work not captured by the new task batch.

Verification: RAW/source review for QMBT67-QMBT68 findings and any appended
rule slices; active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

### Task 217 - SRDINV31C - Promote Divine Smite After-Hit Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Divine Smite as an already-hit melee weapon/unarmed trigger,
Bonus Action and slot spend, Radiant damage scaling, and Fiend/Undead bonus.
Do not replay or duplicate the base attack.

Verification: RAW checked in
`.references/srd-5.2.1/Spells/Descriptions-A-D.md`,
`.references/srd-5.2.1/Playing-the-Game.md`,
`.references/srd-5.2.1/Spells/Gaining-and-Casting.md`, and
`UBIQUITOUS_LANGUAGE.md`; package-local focused admission/runtime tests passed;
`pnpm quality` passed; Tier 1 battle-runtime MBT passed.

### Task 218 - SRDINV31D - Promote Ensnaring Strike Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Ensnaring Strike's weapon-hit trigger, Strength save, Restrained
condition, Concentration cleanup, start-turn Piercing damage, slot scaling, and
escape action.

Verification: RAW checked in
`.references/srd-5.2.1/Spells/Descriptions-E-L.md` and
`UBIQUITOUS_LANGUAGE.md`; package-local focused admission/runtime tests passed;
`pnpm quality` passed; Tier 1 battle-runtime MBT passed.

### Task 219 - SRDINV31E - Promote Searing Smite Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Searing Smite's immediate after-hit Fire damage, timed duration,
start-turn damage, Constitution save, save-to-end behavior, and slot scaling.

Verification: RAW checked in
`.references/srd-5.2.1/Spells/Descriptions-S-Z.md` and
`UBIQUITOUS_LANGUAGE.md`; `/simplify` convergence recorded in two rounds;
package-local focused admission/runtime tests passed; focused Searing Smite
Quint run blocks passed; `pnpm quality` passed; Tier 1 battle-runtime MBT
passed in candidate verification.

### Task 220 - SRDINV31F - Promote True Strike Weapon Spell Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote True Strike as a spell-hosted weapon attack with material
component weapon eligibility, spellcasting ability override, Radiant-or-normal
damage choice, and cantrip scaling.

Verification: RAW checked in
`.references/srd-5.2.1/Spells/Descriptions-S-Z.md`,
`.references/srd-5.2.1/Playing-the-Game.md`, and
`UBIQUITOUS_LANGUAGE.md`; decider simplification review completed in two
passes; package-local focused admission/runtime tests passed; focused True
Strike Quint self-tests passed; `pnpm quality` passed; Tier 1 battle-runtime
MBT passed.

### Task 223 - SRDINV33 - Recursive SRD Inventory Planning Review

Status: `done`

Depends on: SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E, SRDINV29F3, SRDINV30A-SRDINV32B

Blocks: SRDINV34-SRDINV40

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: completed review of SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E,
SRDINV29F3, and SRDINV30A-SRDINV32B spell-runtime closure; refreshed generated
inventory metrics; closed missing checker evidence for Heroism and Ensnaring
Strike; and appended SRDINV34-SRDINV40 plus SRDINV41 review.

Granularity rule: before appending tasks, split every candidate by execution
invariant. A task is too broad if it contains multiple independent target/fill
protocols, stateful loops, recurring triggers, object-target support, area
geometry, reaction timing, or unrelated effect lifecycles. Chromatic Orb-style
repeated holes and Grease-style recurring hazards must be standalone research
or implementation slices, not bundled into generic spell-runtime tasks.

Support-claim rule: matrix/unit claims must only be promoted when the SRD
mechanic is executable. Metadata-only state, stored facts with no later
procedure, or partial reducer support must stay checker-visible as unsupported
or partial. Recursive reviews must inspect rejected implementation findings and
turn them into concrete retry guidance before unblocking follow-up work.

Coverage done-state gate: any task that changes `UNIT-IDENTITY-EVIDENCE`,
`unit-claims.jsonl`, `unit-evidence.jsonl`, `profiles.jsonl`, profile owner
markers, or Surface catalog admission must run
`pnpm unit-profile-coverage:check --write`, include generated
`plans/unit-profile-coverage/` artifacts, and keep this active plan consistent
with `SRD_UNIT_INVENTORY.md` before the task is marked `done`.

Out of scope: implementation work not captured by the newly appended batch,
PHB/XPHB pressure, broad runtime rewrites, and treating catalog admission alone
as behavior support.

Verification: RAW/source review recorded in SRDINV33 review; active-plan
consistency across Ralph index, DAG table, and task details; regenerated
inventory; `pnpm unit-profile-coverage:check --write`;
`pnpm unit-profile-coverage:check`; `pnpm quality`; `/simplify` convergence
recorded in two rounds.

### Task 224 - SRDINV34 - Promote Starry Wisp Object Target Runtime

Status: `done`

Depends on: SRDINV33

Blocks: SRDINV41

Research / plan:
[SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[Starry Wisp](/workspace/typescript/dnd/packages/surface/content/starry_wisp.dhall),
[Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall),
[SRD Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[SRD Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote the Starry Wisp creature-or-object spell target boundary as the
first object-target slice. Cover typed object target identity, caller-supplied
range/spatial targetability facts, ranged spell attack hit/miss adjudication
against object targets, object damage disposition, and a precise
supported-subset decision for Dim Light emission and Invisible-benefit denial.
Decide whether the same target branch covers Chill Touch's generic "target
within reach" wording; if it does not, keep Chill Touch as a combatant-target
subset with checker-visible deferred evidence.

Out of scope: broad object simulation, inventory-wide object support, Fire
Bolt object ignition, Produce Flame held-light state, and general illumination
simulation beyond the exact Starry Wisp supported-subset decision.

Verification: RAW/source review for Starry Wisp and Chill Touch target wording;
focused tests for object target discovery/fill validation, range fact
rejection, attack hit/miss, object damage disposition, and any supported rider
subset; `pnpm unit-profile-coverage:check`; `pnpm quality`; MBT only if
promoted battle-runtime behavior changes.

Result: promoted Starry Wisp as a profile-subset-supported Unit with combatant
targets plus a typed caller-supplied object target branch. Chill Touch remains
limited to its existing combatant-target subset, while Starry Wisp Dim Light
emission and Invisible-benefit denial stay checker-visible for SRDINV41.

### Task 225 - SRDINV35 - Author Missing Detect Spell Records

Status: `done`

Depends on: SRDINV33

Blocks: SRDINV41

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRD Detect Evil and Good](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[SRD Detect Poison and Disease](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed SRD-provenance Spell Definition records for Detect Evil and
Good and Detect Poison and Disease using existing Surface detection atoms. Kept
detection, occlusion, Hallow discovery, poison/disease identification, and
exploration runtime behavior outside the support claim.

Out of scope: promoted detection runtime, Magic action search procedures,
occlusion simulation, and changing Detect Magic's existing unsupported runtime
classification.

Verification: RAW/source review for both Detect spells; focused Surface/catalog
authoring checks; `pnpm unit-profile-coverage:check --write`; `pnpm quality`.

### Task 226 - SRDINV36 - Promote Hellish Rebuke Reaction Runtime

Status: `done`

Depends on: SRDINV33

Blocks: SRDINV41

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[Hellish Rebuke](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[battle reactions](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reaction-triggers.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed Hellish Rebuke as a damage-triggered Reaction spell:
taking-damage trigger from a caller-supplied visible creature within 60 feet,
Reaction and Spell Slot spend, Dexterity save, Fire damage, half damage on
success, and slot scaling.

Out of scope: generic reaction spell framework rewrites, Counterspell timing,
Shield timing changes, and non-visible damager inference beyond caller-supplied
facts.

Verification: RAW/source review for Hellish Rebuke and Reaction timing; focused
reaction-window and reducer tests passed; `pnpm unit-profile-coverage:check`
passed; `pnpm quality` passed. MBT was not run because focused reducer coverage
exercised the after-damage reaction sequencing change.

### Task 227 - SRDINV37 - Promote Charm Person Runtime

Status: `done`

Depends on: SRDINV33

Blocks: SRDINV41

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[Charm Person](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Animal Friendship evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed Humanoid-target Charmed application with hostile-target save
Advantage, one-hour spell-owned duration, early ending when the caster or allies
damage the target, and slot-scaled target count.

Out of scope: social encounter simulation beyond the executable Friendly
subset, Beast-only Animal Friendship target reuse, broad condition-immunity
work, and Dominate spell behavior.

Verification: RAW/source review for Charm Person and Charmed terminology;
focused admission/runtime tests for target filtering, save Advantage, damage
break, duration, and slot scaling; `pnpm unit-profile-coverage:check`; `pnpm
quality`; MBT only if cross-turn condition cleanup sequencing changes.

Result: promoted Charm Person as a profile-subset-supported Unit with
package-local QNT parity, deterministic admission evidence, and spell-owned
damage-break cleanup shared with Animal Friendship. Friendly disposition/social
effects and target knowledge when the spell ends are not represented in battle
runtime state and remain checker-visible for SRDINV41.

### Task 228 - SRDINV38 - Research Sleep Save Loop Runtime

Status: `ready-for-research`

Depends on: SRDINV33

Blocks: SRDINV41

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: research Sleep's current SRD 5.2.1 save loop and condition lifecycle:
point-origin target set, Wisdom save, Incapacitated until next-turn repeat
save, Unconscious on failed repeat save, damage/help wake-up, sleep immunity,
Exhaustion-immunity auto-success, and Concentration cleanup. Split before
implementation if target-area facts, repeat-save timing, and wake-up lifecycle
do not fit one execution invariant.

Out of scope: 2014 HP-pool Sleep semantics, broad unconscious/death-save
rewrites, and generic area geometry beyond caller-supplied target membership.

Verification: RAW/source review for Sleep, Incapacitated, Unconscious, and
Concentration; research note or implementation split; `pnpm
unit-profile-coverage:check` if evidence changes; `pnpm quality` for
implementation; MBT only after behavior changes that need integrated coverage.

### Task 229 - SRDINV39 - Promote Eldritch Blast Beam Runtime

Status: `ready-for-research`

Depends on: SRDINV33

Blocks: SRDINV41

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[Eldritch Blast](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[spell attack runtime](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Eldritch Blast as independent ranged spell attack beams:
creature-or-object target decision for each beam, per-beam attack roll, Force
damage, cantrip beam-count scaling, same or different targets, and one Magic
action invocation spend.

Out of scope: Agonizing Blast or other invocation riders, Chromatic Orb
chained continuation, Fire Bolt ignition, and broad object simulation if
SRDINV34 has not made the object target branch reusable.

Verification: RAW/source review for Eldritch Blast and Spell Attack; focused
admission/runtime tests for beam count, per-beam targets, per-beam hit/miss,
Force damage, action spend, and any object-target supported subset; `pnpm
unit-profile-coverage:check`; `pnpm quality`; MBT only if multi-beam sequencing
requires integrated coverage.

### Task 230 - SRDINV40 - Research Grease Ground Hazard Runtime Retry

Status: `ready-for-research`

Depends on: SRDINV33

Blocks: SRDINV41

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[Grease](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: retry Grease only as a standalone recurring ground-hazard lifecycle:
one-minute duration, caller-supplied ground area membership, on-cast Dexterity
save for creatures in the area, save when a creature enters the area, save when
a creature ends its turn there, Prone application, and explicit Difficult
Terrain support decision.

Out of scope: generic persistent area engine, pathfinding, grid state,
non-Grease ground hazards, and treating stored area metadata as runtime support
without executable enter/end-turn procedures.

Verification: RAW/source review for Grease, Prone, Difficult Terrain, and
area/turn timing; research split if recurring hazard hooks remain broad;
focused tests for any implemented cast-time, enter-area, and end-turn saves;
`pnpm unit-profile-coverage:check`; `pnpm quality`; MBT only after promoted
behavior changes that require integrated turn sequencing coverage.

### Task 231 - SRDINV41 - Recursive SRD Inventory Planning Review

Status: `blocked`

Depends on: SRDINV34-SRDINV40

Blocks: none

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV34-SRDINV40, refresh spell Unit metrics, inspect rejected
partial-support findings including Charm Person Friendly disposition/social
effects and target knowledge, and append the next concrete Surface-blocker
batch by execution invariant.

Out of scope: implementation work not captured by the newly appended batch and
treating catalog admission alone as behavior support.

Verification: RAW/source review for any appended rule slices; active-plan
consistency across Ralph index, DAG table, and task details; regenerated
inventory with `pnpm unit-profile-coverage:check --write` when evidence or
inventory artifacts change; confirm the appended result is Ralph-sized concrete
work; `/simplify` convergence, minimum two rounds unless the final changeset is
trivial.
