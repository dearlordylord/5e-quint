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
      "status": "done",
      "title": "Research Sleep Save Loop Runtime"
    },
    {
      "number": 229,
      "id": "SRDINV39",
      "status": "done",
      "title": "Promote Eldritch Blast Beam Runtime"
    },
    {
      "number": 230,
      "id": "SRDINV40",
      "status": "done",
      "title": "Research Grease Ground Hazard Runtime Retry"
    },
    {
      "number": 232,
      "id": "SRDINV38A",
      "status": "done",
      "title": "Promote Sleep Target Admission Runtime"
    },
    {
      "number": 233,
      "id": "SRDINV38B",
      "status": "done",
      "title": "Promote Sleep Repeat Save Lifecycle"
    },
    {
      "number": 234,
      "id": "SRDINV38C",
      "status": "done",
      "title": "Promote Sleep Wake-Up Cleanup Runtime"
    },
    {
      "number": 231,
      "id": "SRDINV41",
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 235,
      "id": "SRDINV42",
      "status": "done",
      "title": "Widen Command Option Surface"
    },
    {
      "number": 236,
      "id": "SRDINV43",
      "status": "done",
      "title": "Widen Dissonant Whispers Forced Reaction Movement Surface"
    },
    {
      "number": 237,
      "id": "SRDINV44",
      "status": "done",
      "title": "Widen Thunderwave Push Surface"
    },
    {
      "number": 238,
      "id": "SRDINV45",
      "status": "done",
      "title": "Widen Expeditious Retreat Dash Surface"
    },
    {
      "number": 239,
      "id": "SRDINV46",
      "status": "done",
      "title": "Widen Jump Movement Replacement Surface"
    },
    {
      "number": 240,
      "id": "SRDINV47",
      "status": "done",
      "title": "Widen Feather Fall Falling Reaction Surface"
    },
    {
      "number": 241,
      "id": "SRDINV48",
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 242,
      "id": "SRDINV49",
      "status": "done",
      "title": "Promote Expeditious Retreat Dash Runtime"
    },
    {
      "number": 243,
      "id": "SRDINV50",
      "status": "done",
      "title": "Research Command Option Runtime Split"
    },
    {
      "number": 244,
      "id": "SRDINV51",
      "status": "done",
      "title": "Promote Thunderwave Push Runtime Boundary"
    },
    {
      "number": 245,
      "id": "SRDINV52",
      "status": "done",
      "title": "Promote Dissonant Whispers Forced Reaction Movement Runtime"
    },
    {
      "number": 246,
      "id": "SRDINV53",
      "status": "done",
      "title": "Promote Jump Movement Replacement Runtime"
    },
    {
      "number": 247,
      "id": "SRDINV54",
      "status": "ready-for-research",
      "title": "Research Feather Fall Falling Runtime Boundary"
    },
    {
      "number": 248,
      "id": "SRDINV55",
      "status": "blocked",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 249,
      "id": "SRDINV50A",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Command Invocation and Grovel Runtime"
    },
    {
      "number": 250,
      "id": "SRDINV50B",
      "status": "blocked",
      "title": "Promote Command Halt Runtime"
    },
    {
      "number": 251,
      "id": "SRDINV50C",
      "status": "blocked",
      "title": "Promote Command Drop Held-Object Boundary"
    },
    {
      "number": 252,
      "id": "SRDINV50D",
      "status": "blocked",
      "title": "Promote Command Approach and Flee Route Runtime"
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
| 226   | SRDINV36 - Promote Hellish Rebuke Reaction Runtime | done | SRDINV33 | SRDINV41 | [Hellish Rebuke](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [battle reactions](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reaction-triggers.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: focused runtime tests cover Hellish Rebuke after-damage Reaction behavior, but SRDINV41 keeps Unit profile support unpromoted until the authoritative QNT model owns the behavior. |
| 227   | SRDINV37 - Promote Charm Person Runtime | done | SRDINV33 | SRDINV41 | [Charm Person](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Animal Friendship evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Charm Person is promoted as Humanoid-target Wisdom-save Charmed with hostile-target save Advantage projection, one-hour spell-owned duration, caster-or-ally damage break, slot-scaled target count, QNT parity coverage, and deterministic admission evidence; Friendly disposition/social effects and target knowledge remain visible for SRDINV41. |
| 228   | SRDINV38 - Research Sleep Save Loop Runtime | done | SRDINV33 | SRDINV38A-SRDINV38C, SRDINV41 | [Sleep research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md), [Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Sleep must split into target admission and automatic-save boundary, pending repeat-save lifecycle, and wake-up/concentration cleanup tasks. |
| 229   | SRDINV39 - Promote Eldritch Blast Beam Runtime | done | SRDINV33 | SRDINV41 | [Eldritch Blast](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [spell attack runtime](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Eldritch Blast is promoted as beam-indexed creature-or-object ranged spell attacks with cantrip beam scaling, independent targets, independent attack/damage/lifecycle fills, Force damage, and one Magic action spend. |
| 230   | SRDINV40 - Research Grease Ground Hazard Runtime Retry | done | SRDINV33 | SRDINV41 | [Grease](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Grease is promoted as a one-minute spell-owned ground hazard with caller-supplied area identity, on-cast Dexterity saves for affected creatures, table-triggered enter-area and end-turn-in-area saves, Prone on failed saves, and movement-cost Difficult Terrain left at the caller-authored Movement boundary for SRDINV41 review. |
| 232   | SRDINV38A - Promote Sleep Target Admission Runtime | done | SRDINV38 | SRDINV38B, SRDINV41 | [Sleep research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md), [Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [save gate runtime](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Sleep target admission is promoted with caller-supplied point-origin Sphere targets, Wisdom save holes, Exhaustion-immunity auto-success, explicit rejected non-sleeper facts, and Magic action plus Spell Slot spend. |
| 233   | SRDINV38B - Promote Sleep Repeat Save Lifecycle | done | SRDINV38A | SRDINV38C, SRDINV41 | [Sleep research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md), [turn-end reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/turn-end-movement.ts), [condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Sleep failed-save targets now carry a typed pending repeat-save lifecycle, ask for the second Wisdom save at that target's next end turn, and either end Sleep or escalate to spell-owned Unconscious. |
| 234   | SRDINV38C - Promote Sleep Wake-Up Cleanup Runtime | done | SRDINV38B | SRDINV41 | [Sleep research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md), [condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Sleep cleanup is promoted for damage from any source, action-spent adjacent shake-awake with caller-supplied adjacency, caster Concentration cleanup, and Prone preservation after Sleep-owned Unconscious ends. |
| 231   | SRDINV41 - Recursive SRD Inventory Planning Review | done | SRDINV34-SRDINV40, SRDINV38A-SRDINV38C | SRDINV42-SRDINV48 | [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed: refreshed spell Unit metrics, kept Hellish Rebuke QNT/parity support unpromoted, rejected Charm Person social memory and Grease automatic geometry as battle-runtime state, and appended SRDINV42-SRDINV48 movement/action Surface batch. |
| 235   | SRDINV42 - Widen Command Option Surface | done | SRDINV41 | SRDINV48 | [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Command is installed with typed next-turn option facts for Approach, Drop, Flee, Grovel, Halt, turn-ending clauses, and slot-scaled target count; named-option runtime execution remains unpromoted and visible in the Unit matrix as owner-evidence-required work. |
| 236   | SRDINV43 - Widen Dissonant Whispers Forced Reaction Movement Surface | done | SRDINV41 | SRDINV48 | [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [Dissonant Whispers](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Dissonant Whispers is installed with typed save-gated Psychic damage, half-damage success, slot-scaled damage, and failed-save forced Reaction movement facts; runtime execution of forced Reaction movement, route choice, and Opportunity Attack derivation remains unpromoted and visible in the Unit matrix as owner-evidence-required work. |
| 237   | SRDINV44 - Widen Thunderwave Push Surface | done | SRDINV41 | SRDINV48 | [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [Thunderwave](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Thunderwave is installed with typed self-origin Cube Constitution save damage, failed-save creature push, unsecured-object push, audible boom, and slot-scaled Thunder damage facts; runtime push resolution, object inventory simulation, and sound propagation remain unpromoted and visible in the Unit matrix as owner-evidence-required work. |
| 238   | SRDINV45 - Widen Expeditious Retreat Dash Surface | done | SRDINV41 | SRDINV48 | [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [Expeditious Retreat](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Expeditious Retreat is installed with typed immediate Dash and Concentration-duration Bonus Action Dash facts; runtime Dash execution and Movement budget updates remain unpromoted and visible in the Unit matrix as owner-evidence-required work. |
| 239   | SRDINV46 - Widen Jump Movement Replacement Surface | done | SRDINV41 | SRDINV48 | [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [Jump](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Jump is installed with typed touched willing targets, one-minute duration, slot-scaled additional targets, and once-per-turn jump movement replacement facts; runtime Movement spending, jump geometry, landing checks, and Difficult Terrain handling remain unpromoted. |
| 240   | SRDINV47 - Widen Feather Fall Falling Reaction Surface | done | SRDINV41 | SRDINV48 | [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Feather Fall is installed with a typed interrupting falling Reaction trigger, up-to-five falling creature targets, fall-rate cap, fall-damage prevention, and per-target landing cleanup; runtime falling simulation, fall-distance derivation, and landing geometry remain unpromoted. |
| 241   | SRDINV48 - Recursive SRD Inventory Planning Review | done | SRDINV42-SRDINV47 | SRDINV49-SRDINV55 | [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: refreshed spell Unit metrics after SRDINV42-SRDINV47, confirmed movement/action Surface blockers are now owner-evidence-required runtime work, and appended SRDINV49-SRDINV55 movement/action runtime batch. |
| 242   | SRDINV49 - Promote Expeditious Retreat Dash Runtime | done | SRDINV48 | SRDINV50D, SRDINV52-SRDINV53, SRDINV55 | [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [Expeditious Retreat](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Dash](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Expeditious Retreat is promoted as a Bonus Action spell invocation that immediately resolves Dash through the existing movement/action owner, spends a Spell Slot, starts Concentration, and grants Concentration-owned later Bonus Action Dash permission without storing duplicate Speed or Movement facts. |
| 243   | SRDINV50 - Research Command Option Runtime Split | done | SRDINV48 | SRDINV50A-SRDINV50D, SRDINV55 | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Command runtime must split into shared invocation/Grovel, Halt action suppression, Drop held-object boundary, and Approach/Flee route boundary tasks before support can be claimed. |
| 244   | SRDINV51 - Promote Thunderwave Push Runtime Boundary | done | SRDINV48 | SRDINV55 | [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [Thunderwave](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Cube](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote save damage plus caller-supplied creature push, unsecured-object push disposition, and audible-boom evidence without deriving push geometry inside battle runtime. |
| 245   | SRDINV52 - Promote Dissonant Whispers Forced Reaction Movement Runtime | done | SRDINV49 | SRDINV55 | [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [Dissonant Whispers](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Dissonant Whispers is promoted as Wisdom save Psychic damage with half damage on success, target Reaction spend on failed saves when available, caller-supplied safest-route movement, no-Reaction/no-movement fallbacks, and table-supplied Opportunity Attack windows from Reaction movement. |
| 246   | SRDINV53 - Promote Jump Movement Replacement Runtime | done | SRDINV49 | SRDINV55 | [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [Jump](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Jumping](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: Jump is promoted as a Bonus Action Spell Slot invocation with touched willing creature targets, slot-scaled target count, one-minute spell-owned duration, once-per-target-turn use, exact 10-foot Movement spend for up to 30 feet of jump movement, caller-supplied legal landing facts, and Prone application for caller-supplied failed Difficult Terrain landing Acrobatics facts. |
| 247   | SRDINV54 - Research Feather Fall Falling Runtime Boundary | ready-for-research | SRDINV48 | SRDINV55 | [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Falling](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Research the smallest executable falling-trigger, descent-rate, fall-damage prevention, and per-target landing cleanup boundary before runtime promotion. |
| 248   | SRDINV55 - Recursive SRD Inventory Planning Review | blocked | SRDINV49-SRDINV54, SRDINV50A-SRDINV50D | none | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Review SRDINV49-SRDINV54 plus the split Command runtime tasks, refresh spell Unit metrics, and append the next concrete spell Surface or runtime batch. |
| 249   | SRDINV50A - Promote Command Invocation and Grovel Runtime | ready-for-implementation-after-light-research | SRDINV50 | SRDINV50B-SRDINV50D, SRDINV55 | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the shared Command invocation and pending next-turn effect with the Grovel option only: failed-save Prone plus end-turn cleanup. |
| 250   | SRDINV50B - Promote Command Halt Runtime | blocked | SRDINV50A | SRDINV55 | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Halt as target-turn Movement, Action, and Bonus Action suppression over the Command pending-effect shell after SRDINV50A lands. |
| 251   | SRDINV50C - Promote Command Drop Held-Object Boundary | blocked | SRDINV50A | SRDINV55 | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Drop as a caller-supplied held-object disposition boundary after SRDINV50A lands, then end the target's turn without adding duplicate inventory state. |
| 252   | SRDINV50D - Promote Command Approach and Flee Route Runtime | blocked | SRDINV50A, SRDINV49 | SRDINV55 | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [Speed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Approach and Flee through caller-supplied route execution facts after SRDINV50A lands; no pathfinding derivation. |

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
exercised the after-damage reaction sequencing change. SRDINV41 later kept the
Unit profile unsupported because the authoritative QNT model does not yet own
Hellish Rebuke save-gated after-damage Reaction damage.

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

Status: `done`

Depends on: SRDINV33

Blocks: SRDINV38A-SRDINV38C, SRDINV41

Research / plan:
[SRDINV33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV33_RECURSIVE_PLANNING_REVIEW.md),
[SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md),
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed research of Sleep's current SRD 5.2.1 save loop and condition
lifecycle: point-origin target set, Wisdom save, Incapacitated until next-turn
repeat save, Unconscious on failed repeat save, damage/help wake-up, sleep
immunity, Exhaustion-immunity auto-success, and Concentration cleanup.

Out of scope: 2014 HP-pool Sleep semantics, broad unconscious/death-save
rewrites, and generic area geometry beyond caller-supplied target membership.

Result: split Sleep into SRDINV38A target admission and automatic-save
boundary, SRDINV38B pending repeat-save lifecycle, and SRDINV38C wake-up plus
Concentration cleanup. The research note records RAW/source review and
two-round `/simplify` convergence.

Verification: RAW/source review for Sleep, Incapacitated, Unconscious,
Concentration, and Exhaustion; active-plan consistency after adding
SRDINV38A-SRDINV38C; no unit-profile evidence changed.

### Task 229 - SRDINV39 - Promote Eldritch Blast Beam Runtime

Status: `done`

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

Result: promoted Eldritch Blast as beam-indexed creature-or-object ranged spell
attack resolution. Same-target multi-beam damage uses independent attack,
damage, Concentration, spell-damage-reduction, and zero-HP lifecycle fills, with
one Magic action spend for the spell invocation.

### Task 230 - SRDINV40 - Research Grease Ground Hazard Runtime Retry

Status: `done`

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

Result: promoted Grease as a spell-owned ground hazard keyed by caller-supplied
area id. Casting spends the Magic action and Spell Slot, records the one-minute
hazard, applies Dexterity saves to caller-supplied area occupants, and applies
Prone on failed saves. Runtime Grease commands cover table-triggered enter-area
saves and end-turn-in-area saves, with the latter integrated into the End Turn
boundary. Automatic Difficult Terrain movement-cost derivation, pathfinding, and
grid geometry remain visible for SRDINV41; movement costs stay caller-authored
at the Movement fill boundary.

### Task 232 - SRDINV38A - Promote Sleep Target Admission Runtime

Status: `done`

Depends on: SRDINV38

Blocks: SRDINV38B, SRDINV41

Research / plan:
[SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md),
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[save gate runtime](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: add a Sleep-specific invocation projection for SRD 5.2.1 Sleep only.
Accept a caller-supplied point-origin 5-foot-radius Sphere target set, spend
the Magic action and Spell Slot consistently with existing spell invocation
procedures, and produce Wisdom saving throw holes for selected creatures that
are not automatic successes. Derive Exhaustion-immunity auto-success from
existing stat-block condition-immunity data where present. Add an explicit
domain shape for the non-sleeper auto-success fact before making it executable;
do not infer non-sleeper status from creature type or species name.

Out of scope: pending end-turn repeat saves, Unconscious escalation, damage or
shake-awake cleanup, 2014 HP-pool allocation, grid/pathfinding/cover
derivation, and broad save-gated condition rewrites beyond Sleep.

Result: promoted Sleep target admission with caller-supplied point-origin
5-foot-radius Sphere target facts, Wisdom save holes for selected targets that
are not automatic successes, Exhaustion-immunity auto-success from retained Stat
Block condition-immunity facts, explicit rejected non-sleeper fact shape, and
Magic action plus Spell Slot spend. Repeat-save and wake-up lifecycle work
remains in SRDINV38B/SRDINV38C.

Verification: re-read local RAW for Sleep, Saving Throw, Exhaustion Immunity,
Area of Effect, Target, and Magic Action; check `UBIQUITOUS_LANGUAGE.md`;
focused admission/runtime tests for target facts, automatic successes, save
holes, resource spend, and rejection of unsupported non-sleeper facts;
`pnpm unit-profile-coverage:check` if support evidence changes; `pnpm
quality`; MBT only if the behavior change needs integrated coverage.

### Task 233 - SRDINV38B - Promote Sleep Repeat Save Lifecycle

Status: `done`

Depends on: SRDINV38A

Blocks: SRDINV38C, SRDINV41

Research / plan:
[SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md),
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[turn-end reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/turn-end-movement.ts),
[condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: after SRDINV38A lands, add a typed per-target Sleep lifecycle for
targets that fail the initial Wisdom save. The pending state applies
Incapacitated until that target's next-turn end and requires a repeat Wisdom
save exactly at that boundary. Repeat success ends that target's Sleep effect;
repeat failure replaces the pending Incapacitated effect with spell-owned
Unconscious for the remaining Concentration duration. Encode the repeat-save
obligation in the lifecycle type rather than as a generic `spellCondition`
expiration convention.

Out of scope: target admission, automatic-save predicates, damage or
shake-awake cleanup, positive-HP Knock Out or death-save unconscious
lifecycles, and generic recurring-save engines for other spells.

Result: promoted a typed per-target pending Sleep repeat-save lifecycle.
Failed initial saves apply Sleep-owned direct Incapacitated until that target's
next end turn, then the end-turn command asks for the second Wisdom save.
Repeat success removes that target's Sleep effect while preserving unrelated
condition sources; repeat failure replaces pending Incapacitated with
concentration-owned Unconscious.

Verification: re-read local RAW for Sleep, Incapacitated, Unconscious,
Concentration, and end-turn timing; checked `UBIQUITOUS_LANGUAGE.md`; focused
runtime tests cover initial failed-save state, repeat-save hole timing, repeat
success cleanup, repeat failure escalation, target Concentration breaks, and
preservation of unrelated direct and stronger condition sources; package-local
Quint self-tests and `pnpm quality` passed.

### Task 234 - SRDINV38C - Promote Sleep Wake-Up Cleanup Runtime

Status: `done`

Depends on: SRDINV38B

Blocks: SRDINV41

Research / plan:
[SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md),
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[condition helpers](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: after SRDINV38B lands, add target-specific cleanup for both Sleep
stages. Damage from any source ends Sleep on the damaged target. Add an
action-spending shake-awake command that uses caller/table-supplied adjacency
within 5 feet to end Sleep on one target. Breaking the caster's Concentration
removes every remaining Sleep effect. Verify that removing Sleep-owned
Unconscious leaves Prone through the shared condition algebra.

Out of scope: target admission, repeat-save timing, generic Help action
semantics outside Sleep's shake-awake text, grid/pathfinding/adjacency
derivation, Knock Out first aid, death-save unconscious cleanup, and broad
condition cleanup rewrites.

Completed: Sleep cleanup is promoted with damage-from-any-source target cleanup,
caller-supplied adjacent shake-awake action spend and fact validation, caster
Concentration cleanup for pending and escalated Sleep effects, and shared
condition algebra preserving Prone when Sleep-owned Unconscious ends.

Verification: re-read local RAW for Sleep, Unconscious, Concentration, damage,
and actions; checked `UBIQUITOUS_LANGUAGE.md`; focused Sleep runtime tests,
package-local Quint `test_sleep`, package typecheck, `git diff --check`, and
`pnpm quality` passed. MBT was not run because focused runtime and package
Quint coverage directly cover the completed behavior.

### Task 231 - SRDINV41 - Recursive SRD Inventory Planning Review

Status: `done`

Depends on: SRDINV34-SRDINV40, SRDINV38A-SRDINV38C

Blocks: SRDINV42-SRDINV48

Research / plan:
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV34-SRDINV40 plus SRDINV38A-SRDINV38C, refresh spell Unit
metrics, inspect rejected partial-support findings including Charm Person
Friendly disposition/social effects, target knowledge, and Grease automatic
Difficult Terrain geometry, and append the next concrete Surface-blocker batch
by execution invariant.

Out of scope: implementation work not captured by the newly appended batch and
treating catalog admission alone as behavior support.

Verification: RAW checked in `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
for Command and Dissonant Whispers,
`.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Expeditious Retreat,
Feather Fall, Grease, and Jump,
`.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Thunderwave,
`.references/srd-5.2.1/Playing-the-Game.md`, and
`.references/srd-5.2.1/Rules-Glossary.md`; `UBIQUITOUS_LANGUAGE.md` checked
for Movement, Reaction, Spell Definition, Spell Invocation, Spell Effect,
Spell Slot, Difficult Terrain, Falling, Prone, Speed, and Area of Effect.
`pnpm unit-profile-coverage:check --write` passed and regenerated the inventory.
Active plan Ralph index, DAG table, and task details are synchronized. The
appended SRDINV42-SRDINV48 batch is split by execution invariant and recorded in
`SRDINV41_RECURSIVE_PLANNING_REVIEW.md`; `/simplify` converged in three rounds.

Result: refreshed spell Unit metrics, kept Hellish Rebuke as
owner-evidence-required until QNT-backed runtime parity exists, kept Charm
Person social memory and Grease automatic geometry out of battle runtime state,
and appended the movement/action Surface blocker batch.

### Task 235 - SRDINV42 - Widen Command Option Surface

Status: `done`

Depends on: SRDINV41

Blocks: SRDINV48

Research / plan:
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed Surface widening for Command's named options: Approach, Drop,
Flee, Grovel, Halt, next-turn execution, turn-ending clauses, and slot-scaled
additional targets.

Out of scope: runtime execution of the widened Command options and generic
forced movement/pathfinding beyond the authored option facts.

Verification: RAW/source review completed for Command, Movement, Prone, and
turn/action terms plus `UBIQUITOUS_LANGUAGE.md`; Surface parser/schema tests and
generated Command content refresh completed; `pnpm unit-profile-coverage:check`
with `--write` and `pnpm quality` passed.

### Task 236 - SRDINV43 - Widen Dissonant Whispers Forced Reaction Movement Surface

Status: `done`

Depends on: SRDINV41

Blocks: SRDINV48

Research / plan:
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[Dissonant Whispers](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed Surface widening for save-gated Psychic damage plus
failed-save forced Reaction movement away by safest route, including
no-Reaction fallback and slot-scaled damage.

Out of scope: route/pathfinding derivation, Opportunity Attack derivation, and
runtime execution of the widened spell.

Verification: RAW/source review completed for Dissonant Whispers, Reaction,
Movement, Opportunity Attack, Saving Throw, and damage terms plus
`UBIQUITOUS_LANGUAGE.md`; Surface parser/schema tests and generated
Dissonant Whispers content refresh completed; `pnpm unit-profile-coverage:check`
with `--write` and `pnpm quality` passed.

### Task 237 - SRDINV44 - Widen Thunderwave Push Surface

Status: `done`

Depends on: SRDINV41

Blocks: SRDINV48

Research / plan:
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[Thunderwave](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface for self-origin Cube save damage plus failed-save creature
push, unsecured-object push, audible boom, and slot-scaled Thunder damage.

Out of scope: runtime push resolution, collision/pathfinding, object inventory
simulation, and sound propagation beyond the authored audible-boom fact.

Verification: RAW/source review for Thunderwave, Area of Effect, Object,
Movement, Saving Throw, and damage terms plus `UBIQUITOUS_LANGUAGE.md` check,
confirming all modeled rules trace to specific SRD text; Surface parser/schema
tests; generated content refresh if Dhall/JSON content changes;
`pnpm unit-profile-coverage:check --write`; `/simplify` convergence, minimum
two rounds unless the final changeset is trivial.

Result: Thunderwave is installed with typed self-origin Cube Constitution save
damage, failed-save creature push, unsecured-object push, audible boom, and
slot-scaled Thunder damage facts. Runtime push resolution, object inventory
simulation, and sound propagation remain unpromoted and visible in the Unit
matrix as owner-evidence-required work.

### Task 238 - SRDINV45 - Widen Expeditious Retreat Dash Surface

Status: `done`

Depends on: SRDINV41

Blocks: SRDINV48

Research / plan:
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[Expeditious Retreat](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface for immediate Dash on Bonus Action casting and ongoing
Concentration-granted Bonus Action Dash.

Out of scope: runtime Dash execution and duplicating Movement budget state in
the Spell Definition.

Verification: RAW/source review for Expeditious Retreat, Dash, Bonus Action,
Movement, Speed, and Concentration terms plus `UBIQUITOUS_LANGUAGE.md` check,
confirming all modeled rules trace to specific SRD text; Surface parser/schema
tests; generated content refresh if Dhall/JSON content changes;
`pnpm unit-profile-coverage:check --write`; `/simplify` convergence, minimum
two rounds unless the final changeset is trivial.

Result: Expeditious Retreat is installed with typed immediate Dash and
Concentration-duration Bonus Action Dash facts. Runtime Dash execution and
Movement budget updates remain unpromoted and visible in the Unit matrix as
owner-evidence-required work.

### Task 239 - SRDINV46 - Widen Jump Movement Replacement Surface

Status: `done`

Depends on: SRDINV41

Blocks: SRDINV48

Research / plan:
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[Jump](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface for once-per-turn jump movement up to 30 feet by spending
10 feet of movement, touched willing targets, timed duration, and slot-scaled
additional targets.

Out of scope: runtime movement execution, jump arc geometry, and automatic
Difficult Terrain or landing checks.

Verification: RAW/source review for Jump, Jumping, Movement, Speed, Target, and
Spell Slot terms plus `UBIQUITOUS_LANGUAGE.md` check, confirming all modeled
rules trace to specific SRD text; Surface parser/schema tests; generated content
refresh if Dhall/JSON content changes; `pnpm unit-profile-coverage:check --write`;
`/simplify` convergence, minimum two rounds unless the final changeset is
trivial.

### Task 240 - SRDINV47 - Widen Feather Fall Falling Reaction Surface

Status: `done`

Depends on: SRDINV41

Blocks: SRDINV48

Research / plan:
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed Surface widening for an interrupting falling Reaction trigger,
up-to-five falling creature targets, fall-rate cap, fall-damage prevention, and
per-target landing cleanup.

Out of scope: runtime falling simulation, fall-distance derivation, and table
geometry for landing.

Verification: RAW/source review for Feather Fall, Falling, Reaction, Target,
Movement, and damage terms plus `UBIQUITOUS_LANGUAGE.md` check completed;
Surface parser/schema tests passed; generated content and inventory artifacts
refreshed; `pnpm unit-profile-coverage:check --write`; `pnpm quality`; local
Surface trace generated and inspected; `/simplify` convergence recorded in two
rounds.

### Task 241 - SRDINV48 - Recursive SRD Inventory Planning Review

Status: `done`

Depends on: SRDINV42-SRDINV47

Blocks: SRDINV49-SRDINV55

Research / plan:
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed review of SRDINV42-SRDINV47 movement/action Surface widening
results, refreshed spell Unit metrics, confirmed the widened Spell Definitions
now sit in owner-evidence-required runtime pressure rather than Surface
pressure, and appended SRDINV49-SRDINV55 movement/action runtime follow-up.

Out of scope: implementation work not captured by the newly appended batch and
treating catalog admission alone as behavior support.

Verification: RAW/source review for Command, Dissonant Whispers, Expeditious
Retreat, Feather Fall, Jump, Thunderwave, Dash, Falling, Jumping, Movement,
Opportunity Attacks, Reaction, and Cube; `UBIQUITOUS_LANGUAGE.md` checked for
Spell Definition, Spell Invocation, Spell Effect, Magic Action, Reaction,
Movement, Speed, Opportunity Attack, Falling, and Object; active-plan
consistency across Ralph index, DAG table, and task details; regenerated
inventory with `pnpm unit-profile-coverage:check --write`; `pnpm
unit-profile-coverage:check`; `pnpm quality`; `/simplify` convergence recorded
in two rounds in the review note.

### Task 242 - SRDINV49 - Promote Expeditious Retreat Dash Runtime

Status: `done`

Depends on: SRDINV48

Blocks: SRDINV50D, SRDINV52-SRDINV53, SRDINV55

Research / plan:
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[Expeditious Retreat](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Dash](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Expeditious Retreat as a Bonus Action Spell Invocation that
immediately grants Dash and creates a Concentration-owned permission to take
Dash again as a Bonus Action until the spell ends. Reuse the existing
action/movement owner for Movement budget changes; do not store duplicate
Speed or Movement facts on the spell effect.

Out of scope: generic alternate-action-cost rewrites, route/pathfinding state,
and using this task to promote Command, Dissonant Whispers, Jump, or Feather
Fall runtime behavior.

Verification: RAW/source review for Expeditious Retreat, Dash, Bonus Action,
Concentration, Movement, and Speed; focused admission/runtime tests for
immediate Dash, later Bonus Action Dash, Concentration cleanup, and resource
spend; package-local Quint updates before runtime divergence if the promoted
model needs new facts; `pnpm unit-profile-coverage:check --write` if evidence
changes; `pnpm quality`; MBT only if the behavior change touches integrated
battle-runtime sequencing beyond focused reducer coverage.

Result: Expeditious Retreat is promoted as a supported
`spell.invocation-expeditious-retreat-dash` profile. The runtime discovers the
Bonus Action spell cast, resolves the immediate Dash through the existing Dash
movement-budget owner, spends the Bonus Action and Spell Slot, starts
Concentration, and projects the later Bonus Action Dash from the
Concentration-owned spell effect.

### Task 243 - SRDINV50 - Research Command Option Runtime Split

Status: `done`

Depends on: SRDINV48

Blocks: SRDINV50A-SRDINV50D, SRDINV55

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: research the runtime split for Command's failed-save next-turn effect:
Approach, Drop, Flee, Grovel, Halt, turn-ending clauses, held-item drop, and
slot-scaled target count. The output must split implementation tasks by
execution invariant if Approach/Flee route facts, Drop held-object facts, and
Halt action suppression cannot fit one Ralph task.

Out of scope: implementing Command runtime in this research task, deriving
pathfinding or safest/shortest route state, and treating Surface-installed
option facts as operational support.

Verification: RAW/source review for Command, Movement, Prone, held objects,
and turn action vocabulary; `UBIQUITOUS_LANGUAGE.md` check for Spell
Invocation, Spell Effect, Movement, Speed, Prone, and Object; active-plan
consistency if follow-up tasks are appended or revised; no MBT unless behavior
is implemented.

Result: Command runtime is split into SRDINV50A-SRDINV50D. The split keeps the
shared cast/save/pending-effect shell separate from Grovel, Halt action
suppression, Drop held-object disposition, and Approach/Flee route execution.
Route and held-object facts remain caller/table-supplied at their execution
boundaries rather than being stored as duplicate battle-runtime state.

### Task 244 - SRDINV51 - Promote Thunderwave Push Runtime Boundary

Status: `done`

Depends on: SRDINV48

Blocks: SRDINV55

Research / plan:
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[Thunderwave](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Cube](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Thunderwave's Constitution Saving Throw damage, half-damage
success, slot scaling, failed-save creature push, unsecured-object push
disposition, and audible-boom evidence. Push legality and final positions must
come from caller/table facts; battle runtime must not derive or cache geometry.

Out of scope: broad object inventory simulation, sound propagation simulation,
generic forced-movement framework rewrites, and automatic Cube membership
derivation.

Verification: RAW/source review for Thunderwave, Cube, Saving Throw, Object,
and forced movement/Opportunity Attack non-trigger clauses; focused
admission/runtime tests for save outcomes, damage, push fact consumption,
object/noise outcomes, and slot scaling; package-local Quint updates before
runtime divergence; `pnpm unit-profile-coverage:check --write` if evidence
changes; `pnpm quality`; MBT only if integrated sequencing changes require it.

### Task 245 - SRDINV52 - Promote Dissonant Whispers Forced Reaction Movement Runtime

Status: `done`

Depends on: SRDINV49

Blocks: SRDINV55

Research / plan:
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[Dissonant Whispers](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: after SRDINV49 establishes the movement budget boundary, promote
Dissonant Whispers failed-save Psychic damage plus forced Reaction movement.
Runtime inputs must include Reaction availability and caller-supplied safest
route movement result; Opportunity Attack eligibility should derive from the
fact that the target moved using its Reaction, not from pathfinding.

Out of scope: deriving safest routes, automatic reach-crossing geometry,
generic route choice AI, and Command Flee/Approach runtime.

Verification completed: RAW/source review covered Dissonant Whispers, Reaction,
Movement, Opportunity Attacks, and Spell Slot scaling. Focused admission/runtime
tests cover save success/failure damage, no-Reaction fallback, Reaction spend,
Reaction-available no-movement fallback, caller-supplied movement result, and
Opportunity Attack eligibility; package-local Quint and generated Unit evidence
were updated before runtime support was claimed.

### Task 246 - SRDINV53 - Promote Jump Movement Replacement Runtime

Status: `done`

Depends on: SRDINV49

Blocks: SRDINV55

Research / plan:
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[Jump](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Jumping](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: after SRDINV49 establishes the movement budget boundary, promote Jump's
touched willing targets, one-minute spell-owned duration, slot-scaled target
count, once-per-target-turn use marker, and 10-foot Movement spend for up to 30
feet of jump movement. Landing legality, jump arc, and Difficult Terrain
landing checks must be caller-supplied facts.

Out of scope: deriving jump trajectories, automatic map collision checks,
generic special-speed movement, and Feather Fall/falling behavior.

Verification: RAW/source review for Jump, Jumping, Movement, Speed, Target,
and Difficult Terrain landing clauses; focused admission/runtime tests for
targeting, duration, slot scaling, once-per-turn use, Movement spend, and
caller-supplied landing facts; package-local Quint updates before runtime
divergence; `pnpm unit-profile-coverage:check --write` if evidence changes;
`pnpm quality`; MBT only if integrated movement sequencing changes require it.

Completed: Jump is promoted as a Bonus Action Spell Slot invocation with
touched willing creature targets, slot-scaled target count, one-minute
spell-owned duration, once-per-target-turn use reset, exact 10-foot Movement
spend for up to 30 feet of jump movement, caller-supplied legal landing facts,
and Prone application for caller-supplied failed Difficult Terrain landing
Acrobatics facts. Runtime-owned jump arc, pathfinding, collision,
final-position derivation, and Difficult Terrain landing check derivation remain
owned by SRDINV55.

### Task 247 - SRDINV54 - Research Feather Fall Falling Runtime Boundary

Status: `ready-for-research`

Depends on: SRDINV48

Blocks: SRDINV55

Research / plan:
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Falling](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: research the smallest executable boundary for Feather Fall's falling
Reaction trigger, up-to-five falling target admission, descent-rate cap,
fall-damage prevention, and per-target landing cleanup. The output must decide
whether table-supplied fall/landing facts are enough for a promotion task or
whether falling hazard runtime needs a narrower prerequisite.

Out of scope: implementing Feather Fall runtime in this research task, broad
physics simulation, map elevation state, and generic fall-distance derivation.

Verification: RAW/source review for Feather Fall, Falling, Reaction, Target,
fall damage, and Prone-on-landing clauses; `UBIQUITOUS_LANGUAGE.md` check for
Reaction, Spell Invocation, Spell Effect, Falling, Movement, and Prone;
active-plan consistency if follow-up tasks are appended or revised; no MBT
unless behavior is implemented.

### Task 248 - SRDINV55 - Recursive SRD Inventory Planning Review

Status: `blocked`

Depends on: SRDINV49-SRDINV54, SRDINV50A-SRDINV50D

Blocks: none

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV49-SRDINV54 plus the split Command runtime results,
refresh spell Unit metrics, and append the next concrete spell Surface or
runtime batch.

Out of scope: implementation work not captured by the newly appended batch and
treating catalog admission alone as behavior support.

Verification: RAW/source review for any appended rule slices plus
`UBIQUITOUS_LANGUAGE.md` check, confirming all modeled rules trace to specific
SRD text; active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory with `pnpm unit-profile-coverage:check --write`
when evidence or inventory artifacts change; confirm the appended result is
Ralph-sized concrete work; `/simplify` convergence, minimum two rounds unless
the final changeset is trivial.

### Task 249 - SRDINV50A - Promote Command Invocation and Grovel Runtime

Status: `ready-for-implementation-after-light-research`

Depends on: SRDINV50

Blocks: SRDINV50B-SRDINV50D, SRDINV55

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote the shared Command Spell Invocation shell and the Grovel option:
Magic Action and Spell Slot spend, slot-scaled creature target count, Wisdom
Saving Throw gate, command-option fill narrowed to Grovel, failed-save pending
next-turn Spell Effect, Prone application on the affected target's turn, and
end-turn cleanup through the existing end-turn boundary.

Out of scope: Approach, Drop, Flee, Halt, held-object inventory mutation,
route/pathfinding derivation, and claiming full Command support.

Verification: RAW/source review for Command, Prone, Spell Invocation, Spell
Effect, Movement, and end-turn vocabulary; focused admission/runtime tests for
target scaling, save success/failure, pending effect creation, target-turn
Prone application, end-turn cleanup, and resource spend; package-local Quint
updates before runtime divergence; `pnpm unit-profile-coverage:check --write`
if evidence changes; `pnpm quality`; MBT only if integrated turn sequencing
changes require it.

### Task 250 - SRDINV50B - Promote Command Halt Runtime

Status: `blocked`

Depends on: SRDINV50A

Blocks: SRDINV55

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Halt over the pending Command effect from SRDINV50A. The target
must not move and must take no Action or Bonus Action on that turn. Encode the
suppression in state/types so downstream action discovery and resolution are
both gated by the same fact, and clear the effect at the correct end-turn
boundary.

Out of scope: Reactions outside the target's own turn, Drop, route-bearing
options, and generic action-suppression framework rewrites not needed for Halt.

Verification: RAW/source review for Command Halt, Turn, Action, Bonus Action,
Movement, and Spell Effect; focused tests proving Movement, Action, and Bonus
Action subjects are unavailable or invalid during the Halt turn while
start-turn/end-turn obligations still run; package-local Quint updates before
runtime divergence; `pnpm unit-profile-coverage:check --write` if evidence
changes; `pnpm quality`; MBT only if integrated action sequencing changes
require it.

### Task 251 - SRDINV50C - Promote Command Drop Held-Object Boundary

Status: `blocked`

Depends on: SRDINV50A

Blocks: SRDINV55

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Playing the Game object interactions](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Drop as a caller/table-supplied held-object disposition
boundary. Runtime execution should ask for or consume precise held-object facts,
emit dropped-object outcomes, and then end the target's turn. Reuse existing
character loadout facts only where they are already the canonical held
weapon/shield source; do not copy held-object state into a parallel Command
store.

Out of scope: general inventory simulation, automatic object placement, and
changing character equipment ownership unless a single canonical loadout
mutation boundary is added in this slice.

Verification: RAW/source review for Command Drop, Object, held objects, and
turn-ending clauses; focused tests for known empty held-object facts, known
held-object facts, unknown/missing held-object facts as typed failure, dropped
object outcomes, end-turn cleanup, and no duplicate inventory state; package-local
Quint updates before runtime divergence; `pnpm unit-profile-coverage:check --write`
if evidence changes; `pnpm quality`; MBT only if integrated object or turn
sequencing changes require it.

### Task 252 - SRDINV50D - Promote Command Approach and Flee Route Runtime

Status: `blocked`

Depends on: SRDINV50A, SRDINV49

Blocks: SRDINV55

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Speed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Approach and Flee through caller-supplied route execution facts.
Approach consumes a supplied shortest/direct movement result and caller/table
proximity evidence for whether the target moved within 5 feet of the caster;
end the turn only when that predicate is true. Flee consumes supplied
fastest-available moving-away facts through the existing Movement budget owner.
Opportunity Attack eligibility should derive from actual movement through the
existing movement/reaction boundary.

Out of scope: automatic shortest, direct, safest, or fastest route derivation;
map collision and terrain pathfinding; generic route choice AI; and inventing
non-RAW movement modes for "fastest available means."

Verification: RAW/source review for Command Approach/Flee, Movement, Speed,
Opportunity Attacks, and turn-ending clauses; focused tests for route fact
consumption, Movement spend, Approach proximity/end-turn behavior, Flee
whole-turn movement obligation, and Opportunity Attack derivation from actual
movement; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`; MBT
only if integrated movement/reaction sequencing changes require it.
