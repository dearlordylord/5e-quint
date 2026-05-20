# Rules Kernel Coverage Report

Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `battle-hole-frontier.jsonl`, `profile-obligations.jsonl`, `generator-readiness.jsonl`, and `KERNEL-COVERAGE` source markers.

## Summary

- Total obligations: 17
- Covered obligations: 9
- Open transitional obligations: 4
- Boundary or unsupported obligations: 4

| Status | Count |
| --- | ---: |
| covered | 9 |
| needs-qnt-owner | 3 |
| needs-parity-witness | 0 |
| needs-surface-evidence | 1 |
| boundary-only | 3 |
| unsupported-by-admission | 1 |

| Runtime | Count |
| --- | ---: |
| shared-algebras | 1 |
| battle | 11 |
| character-creation | 2 |
| character-sheet | 2 |
| character-battle | 1 |

## Obligations

| Obligation | Runtime | Status | Profiles |
| --- | --- | --- | --- |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | battle | covered | `spell.reaction-shield`, `spell.readied-action-time-spell`, `unit-feature.reaction-roll-or-damage-reduction` |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `unit-feature.action-surge-resource`, `unit-feature.alternate-action-cost`, `unit-feature.attack-damage-rider`, `unit-feature.bonus-action-ongoing-rage`, `unit-feature.first-attack-roll-reckless-advantage`, `unit-feature.passive-armor-class-bonus`, `unit-feature.passive-ranged-attack-roll-bonus`, `unit-feature.reaction-roll-or-damage-reduction`, `unit-feature.save-damage-replacement`, `unit-feature.self-bonus-action-healing`, `unit-feature.weapon-critical-range-19`, `unit-feature.weapon-damage-dice-roll-choice`, `unit-feature.zero-hit-point-replacement` |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `spell.hit-point-restoration`, `spell.invocation-damage-save-or-attack`, `spell.invocation-direct-condition`, `spell.reaction-shield`, `spell.readied-action-time-spell` |
| `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | battle | covered | `spell.invocation-sanctuary-targeting-interdiction` |
| `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | battle | covered | `stat-block.attack-control` |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | character-creation | covered | _direct reducer entrypoint_ |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | character-sheet | covered | `character-sheet.armor-class-base-formula` |
| `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` | battle | boundary-only | _outside reducer semantics_ |
| `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` | battle | needs-surface-evidence | _surface join pending_ |
| `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT` | character-creation | needs-qnt-owner | `character-creation.class-feature-advancement-replacement`, `character-creation.class-feature-feat-choice`, `character-creation.eldritch-invocation-choice`, `character-creation.warlock-pact-magic-advancement`, `character-creation.weapon-mastery-choice` |
| `SHEET.REST_AND_RESOURCE.TRANSITIONS` | character-sheet | needs-qnt-owner | _profile mapping pending_ |
| `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` | character-battle | needs-qnt-owner | _profile mapping pending_ |
| `BATTLE.PROTOCOL.MALFORMED_PAYLOAD_REJECTION` | battle | boundary-only | _outside reducer semantics_ |
| `BATTLE.SURFACE.CATALOG_ONLY_RECORDS` | battle | unsupported-by-admission | _outside reducer semantics_ |
| `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | battle | boundary-only | _outside reducer semantics_ |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | shared-algebras | covered | _direct reducer entrypoint_ |

## Battle Hole Frontier

- Total classified rows: 79

| Subject | Count |
| --- | ---: |
| battle-hole-family | 48 |
| battle-fill-kind | 31 |

| Classification | Count |
| --- | ---: |
| semantic-frontier | 60 |
| deterministic-boundary-projection | 0 |
| table-owned-fact | 19 |
| unsupported-dead-branch | 0 |

| Subject | Id | Kind | Classification | Coverage | Follow-up |
| --- | --- | --- | --- | --- | --- |
| battle-hole-family | `BattleTargetChoiceHole` | `targetChoice` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE`, `RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleSpellCastReactionFactsHole` | `targetSpatialFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-REACTION-CONCENTRATION` |
| battle-hole-family | `BattleWardingBondSeparationFactsHole` | `targetSpatialFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-SPELL-AFTER-HIT-REACTION` |
| battle-hole-family | `BattleObjectTargetChoiceHole` | `objectTargetChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleSpellAreaChoiceHole` | `spellAreaChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleTeleportDestinationHole` | `teleportDestination` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleHeldObjectFactsHole` | `heldObjectFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleSpellDamageTypeChoiceHole` | `damageTypeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-hole-family | `BattleSpellTargetAllocationHole` | `spellTargetAllocation` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleSpellTargetListHole` | `spellTargetList` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleAttackRollHole` | `attackRoll` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-hole-family | `BattleSpellAttackRollHole` | `attackRoll` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-PROFILE-JOIN-SPELL-AFTER-HIT-REACTION` |
| battle-hole-family | `BattleDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-hole-family | `BattleSpellDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION`, `RKBC-PROFILE-JOIN-SPELL-AFTER-HIT-REACTION` |
| battle-hole-family | `BattleSpellDamageReductionRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleMirrorImageDuplicateRollHole` | `rolledDice` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-AFTER-HIT-REACTION` |
| battle-hole-family | `BattleSpellTurnStartDamageRollHole` | `rolledDice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleFlamingSphereDamageRollHole` | `rolledDice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleSpellHealingRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleSpellSkillChoiceHole` | `skillChoice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleSpellAbilityChoiceHole` | `abilityChoice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleSpellConditionChoiceHole` | `conditionChoice` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleThaumaturgyActiveOneMinuteEffectCountHole` | `thaumaturgyActiveOneMinuteEffectCount` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleCommandOptionChoiceHole` | `commandOptionChoice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND` |
| battle-hole-family | `BattleDancingLightsPlacementHole` | `dancingLightsPlacement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleSpellSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleSpellTurnStartSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleSleepRepeatSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleHideousLaughterRepeatSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleGreaseGroundHazardSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleSpellConditionEndTurnSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleFlamingSphereRamMovementHole` | `flamingSphereRamMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleFlamingSphereRepositionMovementHole` | `flamingSphereRepositionMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleFlamingSphereSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-hole-family | `BattleProtectionRelevantEffectSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-hole-family | `BattleUnitFeatureSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE` |
| battle-hole-family | `BattleUnitFeatureRollHole` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS` |
| battle-hole-family | `BattleUnitFeatureDecisionHole` | `unitFeatureDecision` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE`, `RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS` |
| battle-hole-family | `BattleDeathSavingThrowHole` | `deathSavingThrow` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-hole-family | `BattleStatBlockRechargeRollHole` | `statBlockRechargeRoll` | semantic-frontier | `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | _none_ |
| battle-hole-family | `BattleConcentrationSavingThrowHole` | `concentrationSavingThrow` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | `RKBC-BATTLE-HOLE-REACTION-CONCENTRATION` |
| battle-hole-family | `BattleReactionDecisionHole` | `reactionDecision` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | `RKBC-BATTLE-HOLE-REACTION-CONCENTRATION` |
| battle-hole-family | `BattleMovementHole` | `movement` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE` |
| battle-hole-family | `BattleAbilityCheckHole` | `abilityCheck` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND` |
| battle-hole-family | `BattleGrappleOutcomeHole` | `grappleOutcome` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | _none_ |
| battle-hole-family | `BattleShoveOutcomeHole` | `shoveOutcome` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE` |
| battle-hole-family | `BattleSanctuaryInterdictionOutcomeHole` | `sanctuaryInterdictionOutcome` | semantic-frontier | `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | _none_ |
| battle-hole-family | `BattleAttackDamageDispositionHole` | `attackDamageDisposition` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-fill-kind | `attackRoll` | `attackRoll` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-fill-kind | `rolledDice` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-fill-kind | `damageTypeChoice` | `damageTypeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-fill-kind | `savingThrowOutcome` | `savingThrowOutcome` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-fill-kind | `conditionChoice` | `conditionChoice` | semantic-frontier | _none_ | `RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION` |
| battle-fill-kind | `skillChoice` | `skillChoice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND` |
| battle-fill-kind | `abilityChoice` | `abilityChoice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND` |
| battle-fill-kind | `thaumaturgyActiveOneMinuteEffectCount` | `thaumaturgyActiveOneMinuteEffectCount` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `commandOptionChoice` | `commandOptionChoice` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND` |
| battle-fill-kind | `dancingLightsPlacement` | `dancingLightsPlacement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `unitFeatureDecision` | `unitFeatureDecision` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE`, `RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS` |
| battle-fill-kind | `heldObjectFacts` | `heldObjectFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `targetChoice` | `targetChoice` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION`, `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND`, `RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE`, `RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `targetSpatialFacts` | `targetSpatialFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-REACTION-CONCENTRATION`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `objectTargetChoice` | `objectTargetChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `spellAreaChoice` | `spellAreaChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `flamingSphereRamMovement` | `flamingSphereRamMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `flamingSphereRepositionMovement` | `flamingSphereRepositionMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `teleportDestination` | `teleportDestination` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE`, `RKBC-PROFILE-JOIN-TABLE-CALLER` |
| battle-fill-kind | `spellTargetAllocation` | `spellTargetAllocation` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-fill-kind | `spellTargetList` | `spellTargetList` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-fill-kind | `deathSavingThrow` | `deathSavingThrow` | semantic-frontier | _none_ | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-fill-kind | `statBlockRechargeRoll` | `statBlockRechargeRoll` | semantic-frontier | `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | _none_ |
| battle-fill-kind | `concentrationSavingThrow` | `concentrationSavingThrow` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | `RKBC-BATTLE-HOLE-REACTION-CONCENTRATION` |
| battle-fill-kind | `attackDamageDisposition` | `attackDamageDisposition` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | `RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION` |
| battle-fill-kind | `sanctuaryInterdictionOutcome` | `sanctuaryInterdictionOutcome` | semantic-frontier | `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | _none_ |
| battle-fill-kind | `reactionDecision` | `reactionDecision` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | `RKBC-BATTLE-HOLE-REACTION-CONCENTRATION` |
| battle-fill-kind | `movement` | `movement` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE` |
| battle-fill-kind | `abilityCheck` | `abilityCheck` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND` |
| battle-fill-kind | `grappleOutcome` | `grappleOutcome` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | _none_ |
| battle-fill-kind | `shoveOutcome` | `shoveOutcome` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `RKBC-BATTLE-HOLE-MOVEMENT-ROUTE` |

## Generator Readiness

| Obligation | Status | Subset |
| --- | --- | --- |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | fixture-bound | `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `implies`, `all-block` |

## Open Work

- `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` (needs-surface-evidence): Prove each currently admitted executable battle Surface profile points to a covered semantic obligation
- `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT` (needs-qnt-owner): Audit every current Character Creation choice/fill/finalization profile into semantic obligations and parity witnesses
- `SHEET.REST_AND_RESOURCE.TRANSITIONS` (needs-qnt-owner): Audit current Character Sheet HP, rest, spell-slot, pact-slot, Hit Dice, and feature-resource transitions into QNT-connected obligations
- `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` (needs-qnt-owner): Audit Character Sheet to battle init and battle handoff settlement for HP, zero-HP lifecycle, conditions, spell slots, and identity checks

## Checker Issues

No checker issues.
