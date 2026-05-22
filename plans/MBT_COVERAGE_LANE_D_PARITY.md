# MBT Coverage Lane D - Rules-Kernel Parity And Coverage Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "RKBC-HANDOFF-IDENTITY-CONFLICTS",
      "status": "done",
      "title": "Character Battle Identity And Max HP Conflict Handling"
    },
    {
      "number": 2,
      "id": "RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY",
      "status": "done",
      "title": "Spell Direct Condition Removal And Protection Parity Witnesses"
    },
    {
      "number": 3,
      "id": "RKBC-SPELL-SAVE-GATED-CONDITION-PARITY",
      "status": "done",
      "title": "Spell Save-Gated Condition Parity Witnesses"
    },
    {
      "number": 4,
      "id": "RKBC-SPELL-ROLL-SCALAR-PARITY",
      "status": "done",
      "title": "Spell Roll Modifier And Scalar Buff Parity Witnesses"
    },
    {
      "number": 5,
      "id": "RKBC-SPELL-MAKE-STABLE-PARITY",
      "status": "done",
      "title": "Spell Make Stable Parity Witness"
    },
    {
      "number": 6,
      "id": "RKBC-SPELL-SELF-TRANSFORMATION-PARITY",
      "status": "done",
      "title": "Spell Self Transformation Mode Parity Witness"
    },
    {
      "number": 7,
      "id": "RKBC-SPELL-REACTION-CASTING-PARITY",
      "status": "done",
      "title": "Spell Reaction Casting Parity Witnesses"
    },
    {
      "number": 8,
      "id": "RKBC-SPELL-AFTER-HIT-RIDERS-PARITY",
      "status": "done",
      "title": "Spell After-Hit Rider Parity Witnesses"
    },
    {
      "number": 9,
      "id": "RKBC-SPELL-WEAPON-HOSTED-PARITY",
      "status": "done",
      "title": "Spell Weapon-Hosted Attack And Rider Parity Witnesses"
    },
    {
      "number": 10,
      "id": "RKBC-SPELL-MARKED-RIDER-PARITY",
      "status": "done",
      "title": "Spell Marked Damage Rider Parity Witnesses"
    },
    {
      "number": 11,
      "id": "RKBC-SPELL-ATTACK-SEQUENCES-PARITY",
      "status": "done",
      "title": "Spell Attack Sequence Parity Witnesses"
    },
    {
      "number": 12,
      "id": "RKBC-SPELL-MIRROR-IMAGE-PARITY",
      "status": "done",
      "title": "Mirror Image Hit Interception Parity Witness"
    },
    {
      "number": 13,
      "id": "RKBC-SPELL-LINKED-EFFECT-PARITY",
      "status": "done",
      "title": "Linked Spell Effect Damage Sharing Parity Witness"
    },
    {
      "number": 14,
      "id": "RKBC-FINAL-COVERAGE-CLOSURE-GATE",
      "status": "done",
      "title": "Final MBT Coverage Closure Gate"
    },
    {
      "number": 15,
      "id": "RKBC-NONFEATURE-DIRECT-CONDITION-LIFECYCLE-WITNESS",
      "status": "done",
      "title": "Direct Condition Lifecycle Coverage Witness"
    },
    {
      "number": 16,
      "id": "RKBC-NONFEATURE-SAVE-GATED-ATTACK-ADVANTAGE-WITNESS",
      "status": "done",
      "title": "Save-Gated Attack Advantage Coverage Witness"
    },
    {
      "number": 17,
      "id": "RKBC-NONFEATURE-MOONBEAM-MOVABLE-ZONE-WITNESS",
      "status": "done",
      "title": "Moonbeam Movable Zone Coverage Witness"
    },
    {
      "number": 18,
      "id": "RKBC-NONFEATURE-CREATURE-TYPE-PROTECTION-WITNESS",
      "status": "done",
      "title": "Creature-Type Protection Coverage Witness"
    },
    {
      "number": 19,
      "id": "RKBC-NONFEATURE-CONDITION-IMMUNITY-THP-WITNESS",
      "status": "done",
      "title": "Condition Immunity Temporary Hit Point Coverage Witness"
    },
    {
      "number": 20,
      "id": "RKBC-NONFEATURE-CONDITION-REMOVAL-PROTECTION-WITNESS",
      "status": "done",
      "title": "Condition Removal And Protection Coverage Witness"
    },
    {
      "number": 21,
      "id": "RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE",
      "status": "done",
      "title": "Surface Profile Join Evidence Closure"
    },
    {
      "number": 22,
      "id": "L3-METRIC-SCOPE-EXPANSION-PRECHECK",
      "status": "done",
      "title": "Level 3 Metric Scope Expansion Precheck"
    },
    {
      "number": 23,
      "id": "L3-SPELL-UNIT-INVENTORY-SEED",
      "status": "done",
      "title": "Level 3 Spell Unit Inventory Seed"
    },
    {
      "number": 24,
      "id": "L3-RULES-KERNEL-JOIN-PRECHECK",
      "status": "done",
      "title": "Level 3 Rules-Kernel Join Precheck"
    },
    {
      "number": 25,
      "id": "L3-SPELL-COUNTERSPELL-ACCOUNTING-AUDIT",
      "status": "done",
      "title": "Level 3 Counterspell Accounting Audit"
    },
    {
      "number": 26,
      "id": "L3-SPELL-DISPEL-MAGIC-ACCOUNTING-AUDIT",
      "status": "done",
      "title": "Level 3 Dispel Magic Accounting Audit"
    },
    {
      "number": 27,
      "id": "L3-SPELL-CLAIRVOYANCE-CLOSURE-SURVEY",
      "status": "done",
      "title": "Level 3 Clairvoyance Closure Survey"
    },
    {
      "number": 28,
      "id": "L3-SPELL-TONGUES-CLOSURE-SURVEY",
      "status": "done",
      "title": "Level 3 Tongues Closure Survey"
    },
    {
      "number": 29,
      "id": "L3-SPELL-WATER-BREATHING-CLOSURE-SURVEY",
      "status": "done",
      "title": "Level 3 Water Breathing Closure Survey"
    },
    {
      "number": 30,
      "id": "L3-CLASS-SUBCLASS-INVENTORY-SEED",
      "status": "done",
      "title": "Level 3 Class And Subclass Inventory Seed"
    },
    {
      "number": 31,
      "id": "L3-SUBCLASS-SELECTION-PROGRESSION-SPLIT",
      "status": "done",
      "title": "Level 3 Subclass Selection Progression Split"
    },
    {
      "number": 32,
      "id": "L3-SUBCLASS-SPELL-ACCESS-PROGRESSION-SPLIT",
      "status": "done",
      "title": "Level 3 Subclass Spell Access Progression Split"
    },
    {
      "number": 33,
      "id": "L3-CLASS-SUBCLASS-FEATURE-OWNER-SPLIT",
      "status": "done",
      "title": "Level 3 Class And Subclass Feature Owner Split"
    },
    {
      "number": 34,
      "id": "L3-REMAINING-SUBCLASS-SELECTION-FINALIZATION",
      "status": "done",
      "title": "Remaining Level 3 Selected Subclass Finalization"
    },
    {
      "number": 35,
      "id": "L12G-FOLLOWUP-DRUID-CIRCLE-LAND-SPELL-ACCESS",
      "status": "done",
      "title": "Druid Circle of the Land Spell Access"
    },
    {
      "number": 36,
      "id": "L3-FOLLOWUP-BARBARIAN-FRENZY",
      "status": "ready-for-research",
      "title": "Barbarian Frenzy Runtime Follow-Up"
    },
    {
      "number": 37,
      "id": "L3-FOLLOWUP-BARBARIAN-PRIMAL-KNOWLEDGE",
      "status": "ready-for-research",
      "title": "Barbarian Primal Knowledge Owner Follow-Up"
    },
    {
      "number": 38,
      "id": "L3-FOLLOWUP-CLERIC-DISCIPLE-OF-LIFE",
      "status": "ready-for-research",
      "title": "Cleric Disciple Of Life Runtime Follow-Up"
    },
    {
      "number": 39,
      "id": "L3-FOLLOWUP-CLERIC-PRESERVE-LIFE",
      "status": "ready-for-research",
      "title": "Cleric Preserve Life Runtime Follow-Up"
    },
    {
      "number": 40,
      "id": "L3-FOLLOWUP-DRUID-LANDS-AID",
      "status": "ready-for-research",
      "title": "Druid Land's Aid Runtime Follow-Up"
    },
    {
      "number": 41,
      "id": "L3-FOLLOWUP-FIGHTER-REMARKABLE-ATHLETE",
      "status": "ready-for-research",
      "title": "Fighter Remarkable Athlete Runtime Follow-Up"
    },
    {
      "number": 42,
      "id": "L3-FOLLOWUP-MONK-OPEN-HAND-TECHNIQUE",
      "status": "ready-for-research",
      "title": "Monk Open Hand Technique Runtime Follow-Up"
    },
    {
      "number": 43,
      "id": "L3-FOLLOWUP-PALADIN-CHANNEL-DIVINITY",
      "status": "ready-for-research",
      "title": "Paladin Channel Divinity Owner Follow-Up"
    },
    {
      "number": 44,
      "id": "L3-FOLLOWUP-PALADIN-SACRED-WEAPON",
      "status": "ready-for-research",
      "title": "Paladin Sacred Weapon Runtime Follow-Up"
    },
    {
      "number": 45,
      "id": "L3-FOLLOWUP-RANGER-HUNTERS-PREY",
      "status": "ready-for-research",
      "title": "Ranger Hunter's Prey Runtime Follow-Up"
    },
    {
      "number": 46,
      "id": "L3-FOLLOWUP-ROGUE-FAST-HANDS",
      "status": "ready-for-research",
      "title": "Rogue Fast Hands Owner Follow-Up"
    },
    {
      "number": 47,
      "id": "L3-FOLLOWUP-ROGUE-SECOND-STORY-WORK",
      "status": "ready-for-research",
      "title": "Rogue Second-Story Work Owner Follow-Up"
    },
    {
      "number": 48,
      "id": "L3-FOLLOWUP-ROGUE-STEADY-AIM",
      "status": "ready-for-research",
      "title": "Rogue Steady Aim Runtime Follow-Up"
    },
    {
      "number": 49,
      "id": "L3-FOLLOWUP-SORCERER-DRACONIC-RESILIENCE",
      "status": "ready-for-research",
      "title": "Sorcerer Draconic Resilience Character Sheet Follow-Up"
    },
    {
      "number": 50,
      "id": "L3-FOLLOWUP-WARLOCK-DARK-ONES-BLESSING",
      "status": "ready-for-research",
      "title": "Warlock Dark One's Blessing Runtime Follow-Up"
    },
    {
      "number": 51,
      "id": "L3-FOLLOWUP-WIZARD-EVOCATION-SAVANT",
      "status": "ready-for-research",
      "title": "Wizard Evocation Savant Spellbook Follow-Up"
    },
    {
      "number": 52,
      "id": "L3-FOLLOWUP-WIZARD-POTENT-CANTRIP",
      "status": "ready-for-research",
      "title": "Wizard Potent Cantrip Runtime Follow-Up"
    }
  ]
}
-->

This is an active Ralph execution plan for MBT/coverage parity work. It replaces the stale rules-kernel B closure active lane.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until `accept`. The reviewer loop must include RAW traceability where rule behavior is involved, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

This lane must not implement level-2 feature behavior from lanes A-C. It may add parity witnesses, MBT hooks, coverage obligations, reports, and focused tests for already-supported behavior.

## Verification

Every task must include:

- Read relevant promoted package-local Quint specs before changing MBT or coverage.
- When moving a rules-kernel obligation from `needs-parity-witness` to `covered`, update the obligation artifacts and add matching `KERNEL-COVERAGE` owner markers to every listed QNT and runtime owner file; the checker does not infer owner coverage from parity-witness comments alone.
- If MBT is run, follow AGENTS.md MBT protocol exactly: one MBT run at a time, background timing wrapper, no exploratory MBT.
- `pnpm rules-kernel-coverage:check -- --write`, then `pnpm rules-kernel-coverage:check` when rules-kernel reports change.
- `pnpm unit-profile-coverage:check -- --write`, then `pnpm unit-profile-coverage:check` when profile reports change.
- Relevant focused tests/typechecks.
- Reviewer-loop convergence.

## Tasks

### Task 1 - RKBC-HANDOFF-IDENTITY-CONFLICTS - Character Battle Identity And Max HP Conflict Handling

Status: `done`

Input:
- Current character battle initialization and settlement coverage.

Output:
- Coverage/parity witness for identity and max-HP conflict handling, or precise closure if no runtime behavior is missing.

### Task 2 - RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY - Spell Direct Condition Removal And Protection Parity Witnesses

Status: `done`

Output:
- Parity witnesses or focused tests for direct condition removal/protection profiles already supported in runtime.

### Task 3 - RKBC-SPELL-SAVE-GATED-CONDITION-PARITY - Spell Save-Gated Condition Parity Witnesses

Status: `done`

Output:
- Parity witnesses or focused tests for save-gated condition profiles already supported in runtime.

### Task 4 - RKBC-SPELL-ROLL-SCALAR-PARITY - Spell Roll Modifier And Scalar Buff Parity Witnesses

Status: `done`

Output:
- Parity witnesses or focused tests for roll modifier and scalar buff profiles already supported in runtime.

### Task 5 - RKBC-SPELL-MAKE-STABLE-PARITY - Spell Make Stable Parity Witness

Status: `done`

Output:
- Parity witness for the Make Stable spell profile already supported in runtime.

### Task 6 - RKBC-SPELL-SELF-TRANSFORMATION-PARITY - Spell Self Transformation Mode Parity Witness

Status: `done`

Output:
- Parity witness for Alter Self self-transformation behavior already supported in runtime.

### Task 7 - RKBC-SPELL-REACTION-CASTING-PARITY - Spell Reaction Casting Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported reaction spell casting behavior.

### Task 8 - RKBC-SPELL-AFTER-HIT-RIDERS-PARITY - Spell After-Hit Rider Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported after-hit damage, illumination, restraint, and timed-save riders.

### Task 9 - RKBC-SPELL-WEAPON-HOSTED-PARITY - Spell Weapon-Hosted Attack And Rider Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported spell-hosted weapon attacks, weapon overrides, and weapon riders.

### Task 10 - RKBC-SPELL-MARKED-RIDER-PARITY - Spell Marked Damage Rider Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported marked damage rider behavior.

### Task 11 - RKBC-SPELL-ATTACK-SEQUENCES-PARITY - Spell Attack Sequence Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported independent and chained spell attack sequences.

### Task 12 - RKBC-SPELL-MIRROR-IMAGE-PARITY - Mirror Image Hit Interception Parity Witness

Status: `done`

Output:
- Parity witness for Mirror Image hit interception already supported in runtime.

### Task 13 - RKBC-SPELL-LINKED-EFFECT-PARITY - Linked Spell Effect Damage Sharing Parity Witness

Status: `done`

Output:
- Parity witness for linked spell-effect damage sharing already supported in runtime.

### Task 14 - RKBC-FINAL-COVERAGE-CLOSURE-GATE - Final MBT Coverage Closure Gate

Status: `done`

Depends on:
- Tasks D1-D13.

Output:
- Refresh rules-kernel and unit-profile coverage reports.
- Record remaining gaps as explicit nonfeature follow-ups or close the lane.

### Task 15 - RKBC-NONFEATURE-DIRECT-CONDITION-LIFECYCLE-WITNESS - Direct Condition Lifecycle Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, covering direct spell-owned condition application, cleanup, duration expiry, and target-action early ending, or split unsupported branches into explicit boundary rows.

### Task 16 - RKBC-NONFEATURE-SAVE-GATED-ATTACK-ADVANTAGE-WITNESS - Save-Gated Attack Advantage Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`, covering failed-save attack-roll Advantage active effects from save outcome through attack-roll projection.

### Task 17 - RKBC-NONFEATURE-MOONBEAM-MOVABLE-ZONE-WITNESS - Moonbeam Movable Zone Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE`, covering current Moonbeam movable-zone lifecycle semantics, or split any shapechanging rider that is outside current runtime support.

### Task 18 - RKBC-NONFEATURE-CREATURE-TYPE-PROTECTION-WITNESS - Creature-Type Protection Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`, covering creature-type protection, prevention, and relevant-effect Saving Throw Advantage.

### Task 19 - RKBC-NONFEATURE-CONDITION-IMMUNITY-THP-WITNESS - Condition Immunity Temporary Hit Point Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, covering condition immunity with start-turn Temporary Hit Point refresh and cleanup.

### Task 20 - RKBC-NONFEATURE-CONDITION-REMOVAL-PROTECTION-WITNESS - Condition Removal And Protection Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION`, covering direct condition removal and poison protection semantics beyond the selected-identity evidence already recorded for Unit replay.

### Task 21 - RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE - Surface Profile Join Evidence Closure

Status: `done`

Depends on:
- Task 14.

Output:
- Prove every pre-Level-3 admitted executable battle Surface profile points to a covered rules-kernel semantic obligation, or record explicit non-runtime or boundary dispositions.

## Overnight Backlog Refill

## Level 2 Completion And Level 3 Kickoff Refill

### Task 22 - L3-METRIC-SCOPE-EXPANSION-PRECHECK - Level 3 Metric Scope Expansion Precheck

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Survey how level 1-2 inventory/report metrics are generated and propose the smallest safe extension for spell-level-3/class-level-3 pressure without breaking existing level 1-2 reporting.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 23 - L3-SPELL-UNIT-INVENTORY-SEED - Level 3 Spell Unit Inventory Seed

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Seed or plan level-3 spell-pressure inventory rows from installed SRD Surface spell content, with level-3 rows clearly separated from level 1-2 metrics.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 24 - L3-RULES-KERNEL-JOIN-PRECHECK - Level 3 Rules-Kernel Join Precheck

Status: `done`

Depends on:

- Task 23.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Survey level-3 supported or likely-supported profiles and identify rules-kernel obligation mappings needed before broad implementation.
- Resolve the current `spell.invocation-ray-of-enfeeblement-d20-lifecycle` profile join gap by mapping it to a covered rules-kernel obligation or splitting a precise follow-up when that mapping would overclaim current behavior.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 25 - L3-SPELL-COUNTERSPELL-ACCOUNTING-AUDIT - Level 3 Counterspell Accounting Audit

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Check existing Counterspell support against level-3 metric expansion and add any missing profile/evidence/rules-kernel accounting without changing already-correct runtime behavior.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 26 - L3-SPELL-DISPEL-MAGIC-ACCOUNTING-AUDIT - Level 3 Dispel Magic Accounting Audit

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Check existing Dispel Magic support against level-3 metric expansion and add any missing profile/evidence/rules-kernel accounting without duplicating ongoing spell ending logic.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 27 - L3-SPELL-CLAIRVOYANCE-CLOSURE-SURVEY - Level 3 Clairvoyance Closure Survey

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Clairvoyance and current content; close runtime-detached sensor/table ownership or split any actual runtime/profile work.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 28 - L3-SPELL-TONGUES-CLOSURE-SURVEY - Level 3 Tongues Closure Survey

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Tongues and current language-access policy; close runtime-detached language/table ownership or split any actual runtime/profile work.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 29 - L3-SPELL-WATER-BREATHING-CLOSURE-SURVEY - Level 3 Water Breathing Closure Survey

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Water Breathing and current environmental/table policy; close runtime-detached environment ownership or split any actual runtime/profile work.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 30 - L3-CLASS-SUBCLASS-INVENTORY-SEED - Level 3 Class And Subclass Inventory Seed

Status: `done`

Depends on:

- Task 22.
- Task 23.

Input:

- Local RAW under `.references/srd-5.2.1/Classes/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface class, subclass, class-feature, Spell Access, Unit claim, and
  owner-evidence artifacts.

Output:

- Seed or plan class `level-3` inventory rows from the SRD class feature table
  rows, class Level 3 headings, subclass selection rows, subclass feature
  grants, and subclass always-prepared Spell Access rows.
- Keep class/subclass `level-3` rows separate from `spell-level-3` spell-list
  pressure and from existing Level 1-2 readiness/support reports.
- Update generated inventory/report artifacts only where this class/subclass
  task is the correct owner; otherwise record precise follow-up splits.

Acceptance:

- The 51 pre-scanned class `level-3` rows have checker-visible classification:
  supported owner evidence, accepted runtime-detached or character-fact closure,
  or a smaller executable follow-up split.
- Subclass selection, subclass feature grants, and subclass Spell Access are not
  collapsed into spell-list pressure or treated as runtime support from catalog
  admission alone.
- No companion AI/autonomous-control behavior and no authored identity dispatch
  are introduced.

### Task 31 - L3-SUBCLASS-SELECTION-PROGRESSION-SPLIT - Level 3 Subclass Selection Progression Split

Status: `done`

Depends on:

- Task 30.

Input:

- Level-3 `subclass-selection` rows in `plans/unit-profile-coverage/srd-unit-inventory.json`.
- Local RAW under `.references/srd-5.2.1/Classes/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface class/subclass records, Character Creation subclass/progression
  owner code, Unit claims, and owner-evidence artifacts.

Output:

- Promote or precisely split the 12 level-3 subclass selection rows so class
  level-3 subclass choices and SRD subclass option records are checker-visible.
- Connect selected subclass identity to the Character Creation/progression owner
  when executable, without treating class catalog admission alone as runtime
  support.
- Update generated inventory/report artifacts and Unit/profile claims only where
  this task is the correct owner; otherwise record smaller executable follow-up
  rows.

Acceptance:

- Every level-3 `subclass-selection` row has checker-visible owner evidence,
  accepted runtime-detached closure, or a smaller executable follow-up split.
- Catalog admission for class records and subclass option records remains
  distinct from runtime support and selected-subclass progression ownership.
- No PHB+ authored identity, companion AI/autonomous-control behavior, or runtime
  authored-identity dispatch is introduced.

### Task 32 - L3-SUBCLASS-SPELL-ACCESS-PROGRESSION-SPLIT - Level 3 Subclass Spell Access Progression Split

Status: `done`

Depends on:

- Task 30.
- Task 31.

Input:

- Level-3 `subclass-spell-access` rows in `plans/unit-profile-coverage/srd-unit-inventory.json`.
- Local RAW under `.references/srd-5.2.1/Classes/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface Spell Access shapes, Character Creation spell-access
  projection code, Unit claims, and owner-evidence artifacts.

Output:

- Promote or precisely split subclass Spell Access rows for level-gated
  always-prepared grants, keeping character-owned Spell Access separate from
  individual Spell Definition spell-list pressure and invocation runtime support.
- Preserve the Druid Circle of the Land Long Rest land-type choice as its own
  choice-derived prepared-spell progression concern before deriving prepared
  spells.
- Update generated inventory/report artifacts and Unit/profile claims only where
  this task is the correct owner; otherwise record smaller executable follow-up
  rows.

Acceptance:

- Every level-3 `subclass-spell-access` row has checker-visible owner evidence,
  accepted runtime-detached closure, or a smaller executable follow-up split.
- Choice-derived prepared spells and always-prepared subclass grants are not
  collapsed into spell-list pressure or catalog admission support.
- No PHB+ authored identity, companion AI/autonomous-control behavior, or runtime
  authored-identity dispatch is introduced.

### Task 33 - L3-CLASS-SUBCLASS-FEATURE-OWNER-SPLIT - Level 3 Class And Subclass Feature Owner Split

Status: `done`

Depends on:

- Task 30.

Input:

- Level-3 `class-feature-grant` rows in `plans/unit-profile-coverage/srd-unit-inventory.json`.
- Local RAW under `.references/srd-5.2.1/Classes/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface class-feature records, Unit/profile claims, battle-runtime and
  character-creation owner-evidence artifacts.

Output:

- Promote or precisely split level-3 class and subclass feature grants that lack
  authored records, catalog admission, or owner evidence.
- Route each feature to the correct owner boundary: battle runtime for supported
  encounter behavior, Character Creation/Sheet for durable character facts, or
  explicit runtime-detached closure.
- Update generated inventory/report artifacts and Unit/profile claims only where
  this task is the correct owner; otherwise record smaller executable follow-up
  rows.

Acceptance:

- Every level-3 `class-feature-grant` row has checker-visible owner evidence,
  accepted runtime-detached or character-fact closure, or a smaller executable
  follow-up split.
- Feature support is based on Surface shape, typed profile facts, and owner
  evidence rather than authored identity dispatch.
- No PHB+ authored identity or companion AI/autonomous-control behavior is
  introduced.

Completion:

- `plans/unit-profile-coverage/srd-unit-inventory.json` now records precise
  owner splits for the 17 remaining level-3 class/subclass feature rows.
- `Ranger Hunter's Lore` is closed as runtime-detached table/stat-block
  knowledge rather than promoted battle state.
- The remaining executable follow-ups are tracked as Tasks 36-52.

### Task 34 - L3-REMAINING-SUBCLASS-SELECTION-FINALIZATION - Remaining Level 3 Selected Subclass Finalization

Status: `done`

Depends on:

- Task 31.
- Task 32.
- Task 33.

Input:

- Remaining level-3 `subclass-selection` rows in `plans/unit-profile-coverage/srd-unit-inventory.json`
  whose owner evidence still points to the future selected-subclass
  progression/finalization owner.
- Local RAW under `.references/srd-5.2.1/Classes/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Character Creation subclass/progression owner code, subclass Spell Access
  progression work, subclass feature owner work, Unit claims, and
  owner-evidence artifacts.

Output:

- Promote the remaining Bard, Cleric, Druid, Paladin, Ranger, Sorcerer,
  Warlock, and Wizard level-3 selected-subclass progression/finalization rows
  when their level-3 Spell Access and feature holes have checker-visible owner
  treatment.
- Keep selected subclass identity projection separate from subclass Spell Access,
  subclass feature execution, and catalog admission support.
- Update generated inventory/report artifacts and Unit/profile claims only where
  this task is the correct selected-subclass finalization owner.

Acceptance:

- No remaining level-3 `subclass-selection` row points to an unspecified future
  selected-subclass progression/finalization owner.
- Finalized builds retain the selected subclass Unit ref for each newly promoted
  class-specific level-3 progression without claiming subclass Spell Access or
  subclass feature execution from the subclass container record.
- No PHB+ authored identity, companion AI/autonomous-control behavior, or runtime
  authored-identity dispatch is introduced.

Completion:

- Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, and Wizard level-3
  subclass-selection rows now have checker-visible Character Creation owner
  evidence.
- The selected subclass Unit ref is finalized as selected identity only;
  subclass Spell Access and subclass feature execution remain owned by their
  existing follow-up rows.

### Task 35 - L12G-FOLLOWUP-DRUID-CIRCLE-LAND-SPELL-ACCESS - Druid Circle of the Land Spell Access

Status: `done`

Depends on:

- Task 32.

Input:

- `druid_circle_of_the_land_spells` Surface Unit and its `unsupported-profile`
  Unit claim.
- Local RAW under `.references/srd-5.2.1/Classes/Druid.md`.
- `UBIQUITOUS_LANGUAGE.md`.
- Character Sheet runtime state/projection code for durable character facts,
  Long Rest workflows, and prepared Spell Access.

Output:

- Add checker-visible Character Sheet owner evidence for Circle of the Land
  Spell Access that preserves the Long Rest land-type choice before deriving
  prepared spells for the character's Druid level and lower.
- Keep choice-derived prepared Spell Access separate from individual Spell
  Definition invocation support and from fixed always-prepared subclass grants.
- Update generated inventory/report artifacts and Unit/profile claims only where
  this selected-land Spell Access task is the correct owner.

Acceptance:

- Circle of the Land prepared Spell Access has focused runtime/projection tests
  and checker-visible owner evidence, or is split again into a smaller executable
  task with precise owner and required output.
- The selected land choice is represented as character-owned state or a typed
  workflow fact, not as authored-identity dispatch or duplicated prepared-spell
  state.
- No PHB+ authored identity, companion AI/autonomous-control behavior, or runtime
  authored-identity dispatch is introduced.

### Task 36 - L3-FOLLOWUP-BARBARIAN-FRENZY - Barbarian Frenzy Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Frenzy as a Rage-gated, Reckless Attack-gated first-hit damage rider
  for the selected Berserker subclass.
- Track active Rage, Reckless Attack use on the turn, first target hit by a
  Strength-based weapon or Unarmed Strike attack, Rage Damage bonus d6 count, and
  same damage type as the triggering attack.
- Add focused runtime tests, generated coverage artifacts, and promoted Quint
  parity if runtime behavior is admitted.

### Task 37 - L3-FOLLOWUP-BARBARIAN-PRIMAL-KNOWLEDGE - Barbarian Primal Knowledge Owner Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.

Output:

- Split Primal Knowledge between a durable Barbarian skill proficiency choice
  over the Barbarian level-1 skill list and a Rage-active Ability Check
  substitution.
- Model Acrobatics, Intimidation, Perception, Stealth, and Survival checks using
  Strength while Rage is active without duplicating the underlying Skill
  proficiency facts.

### Task 38 - L3-FOLLOWUP-CLERIC-DISCIPLE-OF-LIFE - Cleric Disciple Of Life Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Disciple of Life as a source-owned healing modifier for spells the
  Cleric casts with a Spell Slot.
- Detect Hit Point restoration on the cast turn, add `2 + spent slot level` to
  each affected creature, exclude non-slot casts, and add focused runtime tests
  plus promoted Quint parity.

### Task 39 - L3-FOLLOWUP-CLERIC-PRESERVE-LIFE - Cleric Preserve Life Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Preserve Life as a Magic Action that spends Cleric Channel Divinity.
- Accept caller-chosen Bloodied creatures within 30 feet including self, divide a
  healing pool equal to five times Cleric level, cap each target at half Hit
  Point Maximum, and add focused runtime tests plus promoted Quint parity.

### Task 40 - L3-FOLLOWUP-DRUID-LANDS-AID - Druid Land's Aid Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Land's Aid as a Magic Action that spends one Wild Shape use.
- Accept a table-supplied 10-foot-radius Sphere within 60 feet, apply a
  Constitution Saving Throw for chosen creatures in the area, deal Necrotic
  damage with half damage on success, heal one chosen creature in the area, and
  keep later Druid-level dice scaling as later-level work.

### Task 41 - L3-FOLLOWUP-FIGHTER-REMARKABLE-ATHLETE - Fighter Remarkable Athlete Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Remarkable Athlete by projecting Advantage on Initiative rolls and
  Strength (Athletics) checks.
- Add the immediately-after-Critical-Hit movement release up to half Speed
  without Opportunity Attacks, using existing Movement and Opportunity Attack
  vocabulary rather than a generic feature flag.

### Task 42 - L3-FOLLOWUP-MONK-OPEN-HAND-TECHNIQUE - Monk Open Hand Technique Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Open Hand Technique as choices attached only to attacks granted by
  Flurry of Blows.
- Model Addle denying Opportunity Attacks until the target's next turn starts,
  Push as a Strength Saving Throw before pushing up to 15 feet away, and Topple
  as a Dexterity Saving Throw before Prone.

### Task 43 - L3-FOLLOWUP-PALADIN-CHANNEL-DIVINITY - Paladin Channel Divinity Owner Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.

Output:

- Split Paladin Channel Divinity between a two-use Short Rest/Long Rest resource
  that later Paladin effects spend and a runtime-detached Divine Sense detection
  closure.
- Keep Paladin level 11 use scaling as later-level work, and do not duplicate
  creature-type or consecrated/desecrated object knowledge into promoted battle
  state unless a runtime owner is explicitly admitted.

### Task 44 - L3-FOLLOWUP-PALADIN-SACRED-WEAPON - Paladin Sacred Weapon Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.
- Task 43.

Output:

- Promote Sacred Weapon as an Attack-action option that spends Paladin Channel
  Divinity and binds one held Melee weapon.
- Add Charisma modifier minimum +1 to attack rolls with that weapon, allow normal
  or Radiant damage type on hits, emit authored light while active, and end on
  recast, no-action dismissal, or not carrying the weapon.

### Task 45 - L3-FOLLOWUP-RANGER-HUNTERS-PREY - Ranger Hunter's Prey Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Split Hunter's Prey between Short or Long Rest replacement choice and
  battle-runtime weapon-hit behavior.
- Model Colossus Slayer as a once-per-turn weapon-hit damage rider against a
  target missing Hit Points, and Horde Breaker as a once-per-turn same-weapon
  extra attack against a different nearby creature within weapon range.

### Task 46 - L3-FOLLOWUP-ROGUE-FAST-HANDS - Rogue Fast Hands Owner Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Split Fast Hands between Bonus Action action-economy permission,
  runtime-detached Sleight of Hand lock/trap/pocket adjudication, Utilize action
  support, and Magic Item Magic Action support.
- Reuse item-owned activation facts instead of adding Thief-specific item
  execution state.

### Task 47 - L3-FOLLOWUP-ROGUE-SECOND-STORY-WORK - Rogue Second-Story Work Owner Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Second-Story Work by projecting Climb Speed equal to Speed and adding a
  jump-distance ability substitution that uses Dexterity rather than Strength.
- Avoid storing duplicated climb or jump values beside base Speed and Ability
  Score facts.

### Task 48 - L3-FOLLOWUP-ROGUE-STEADY-AIM - Rogue Steady Aim Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.

Output:

- Promote Steady Aim as a Bonus Action available only if the Rogue has not moved
  on the turn.
- Grant Advantage on the next attack roll on that same turn and set Speed to 0
  until the current turn ends.

### Task 49 - L3-FOLLOWUP-SORCERER-DRACONIC-RESILIENCE - Sorcerer Draconic Resilience Character Sheet Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Draconic Resilience as durable Character Sheet facts.
- Increase Hit Point Maximum by 3 at acquisition and by 1 for each later Sorcerer
  level, and add the unarmored base Armor Class formula `10 + Dexterity modifier
  + Charisma modifier` using the existing explicit base-formula selection
  boundary.

### Task 50 - L3-FOLLOWUP-WARLOCK-DARK-ONES-BLESSING - Warlock Dark One's Blessing Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Dark One's Blessing as a trigger when the Warlock reduces an enemy to 0
  Hit Points or another creature reduces an enemy within 10 feet of the Warlock
  to 0 Hit Points.
- Grant Temporary Hit Points equal to Charisma modifier plus Warlock level with a
  minimum of 1.

### Task 51 - L3-FOLLOWUP-WIZARD-EVOCATION-SAVANT - Wizard Evocation Savant Spellbook Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Evocation Savant as spellbook acquisition facts.
- At acquisition, choose two Wizard Evocation spells no higher than level 2 for
  free; whenever the Wizard gains access to a new Spell Slot level, add one
  Wizard Evocation spell for free no higher than an available slot level.

### Task 52 - L3-FOLLOWUP-WIZARD-POTENT-CANTRIP - Wizard Potent Cantrip Runtime Follow-Up

Status: `ready-for-research`

Depends on:

- Task 33.
- Task 34.

Output:

- Promote Potent Cantrip as a damaging-cantrip rule.
- When a Wizard cantrip cast at a creature misses with its Attack Roll or the
  target succeeds on a Saving Throw against the cantrip, apply half the cantrip's
  damage if any and no additional cantrip effect.
