# Rules Kernel Coverage Report

Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `battle-hole-frontier.jsonl`, `profile-obligations.jsonl`, `generator-readiness.jsonl`, and `KERNEL-COVERAGE` source markers.

## Summary

- Total obligations: 73
- Covered obligations: 67
- Open transitional obligations: 1
- Boundary or unsupported obligations: 5

| Status | Count |
| --- | ---: |
| covered | 67 |
| needs-qnt-owner | 0 |
| needs-parity-witness | 0 |
| needs-surface-evidence | 1 |
| boundary-only | 4 |
| unsupported-by-admission | 1 |

| Runtime | Count |
| --- | ---: |
| shared-algebras | 1 |
| battle | 55 |
| character-creation | 8 |
| character-sheet | 6 |
| character-battle | 3 |

## Obligations

| Obligation | Runtime | Status | Profiles |
| --- | --- | --- | --- |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | battle | covered | `spell.invocation-expeditious-retreat-dash`, `spell.invocation-forced-reaction-movement`, `spell.invocation-grease-ground-hazard`, `spell.invocation-jump-movement-replacement` |
| `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | battle | covered | `spell.invocation-feather-fall-mitigation`, `spell.invocation-forced-reaction-movement`, `spell.reaction-counterspell`, `spell.reaction-hellish-rebuke`, `spell.reaction-shield`, `spell.readied-action-time-spell`, `unit-feature.attack-damage-reduction-zero-damage-redirect`, `unit-feature.reaction-roll-or-damage-reduction` |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `unit-feature.action-surge-resource`, `unit-feature.alternate-action-cost`, `unit-feature.attack-action-attack-count-scaling`, `unit-feature.attack-damage-reduction-zero-damage-redirect`, `unit-feature.attack-damage-rider`, `unit-feature.attack-roll-miss-to-hit-replacement`, `unit-feature.bardic-inspiration-failed-d20-test`, `unit-feature.bardic-inspiration-grant`, `unit-feature.bonus-action-dash-temporary-hit-points`, `unit-feature.bonus-action-ongoing-rage`, `unit-feature.failed-ability-check-resource-boost`, `unit-feature.first-attack-roll-reckless-advantage`, `unit-feature.innate-sorcery-activation`, `unit-feature.martial-arts-attack-projection`, `unit-feature.monk-focus-battle-options`, `unit-feature.passive-armor-class-bonus`, `unit-feature.passive-ranged-attack-roll-bonus`, `unit-feature.passive-saving-throw-roll-mode`, `unit-feature.passive-speed-bonus`, `unit-feature.passive-speed-kind-grants`, `unit-feature.reaction-roll-or-damage-reduction`, `unit-feature.save-damage-replacement`, `unit-feature.self-bonus-action-healing`, `unit-feature.weapon-critical-range-19`, `unit-feature.weapon-damage-dice-roll-choice`, `unit-feature.weapon-mastery-cleave`, `unit-feature.weapon-mastery-sap`, `unit-feature.weapon-mastery-topple`, `unit-feature.zero-hit-point-replacement` |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `spell.invocation-damage-save-or-attack`, `spell.invocation-web-restraint-hazard`, `spell.reaction-shield`, `spell.readied-action-time-spell` |
| `BATTLE.SPELL.HIT_POINT_RESTORATION` | battle | covered | `spell.hit-point-restoration` |
| `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` | battle | covered | `spell.invocation-direct-condition` |
| `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | battle | covered | `spell.invocation-condition-save`, `spell.invocation-hideous-laughter-repeat-save-lifecycle` |
| `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | battle | covered | `spell.invocation-attack-roll-advantage-save` |
| `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` | battle | covered | `spell.invocation-sleep-repeat-save-lifecycle`, `spell.invocation-sleep-target-admission` |
| `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE` | battle | covered | `spell.invocation-grease-ground-hazard` |
| `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE` | battle | covered | `spell.invocation-fog-cloud-obscurement` |
| `BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE` | battle | covered | `spell.invocation-magical-darkness-point-origin` |
| `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE` | battle | covered | `spell.invocation-object-light` |
| `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE` | battle | covered | `spell.invocation-flaming-sphere-hazard-ram` |
| `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE` | battle | covered | `spell.invocation-held-light-emitter` |
| `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE` | battle | covered | `spell.invocation-spell-created-held-object` |
| `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE` | battle | covered | `spell.invocation-dancing-lights-movable-dim-light` |
| `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` | battle | covered | `spell.invocation-expeditious-retreat-dash` |
| `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE` | battle | covered | `spell.invocation-feather-fall-mitigation` |
| `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE` | battle | covered | `spell.invocation-jump-movement-replacement` |
| `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` | battle | covered | `spell.invocation-forced-reaction-movement` |
| `BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE` | battle | covered | `spell.invocation-self-teleport` |
| `BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE` | battle | covered | `spell.invocation-blur-attack-roll-defense` |
| `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE` | battle | covered | `spell.invocation-moonbeam-movable-zone` |
| `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` | battle | covered | `spell.invocation-make-stable` |
| `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | battle | covered | `spell.invocation-roll-modifier`, `spell.invocation-self-ability-check-advantage` |
| `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | battle | covered | `spell.scalar-buff` |
| `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` | battle | covered | `spell.creature-type-protection-and-charm` |
| `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS` | battle | covered | `spell.invocation-condition-immunity-turn-start-temporary-hit-points` |
| `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | battle | covered | `spell.invocation-condition-removal-protection`, `spell.invocation-direct-condition-removal` |
| `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` | battle | covered | `spell.invocation-self-transformation-mode` |
| `BATTLE.SPELL.REACTION_CASTING_TIME` | battle | covered | `spell.reaction-counterspell`, `spell.reaction-hellish-rebuke` |
| `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | battle | covered | `spell.invocation-after-hit-damage`, `spell.invocation-after-hit-damage-illumination`, `spell.invocation-after-hit-restraint-turn-start-damage`, `spell.invocation-after-hit-timed-damage-save` |
| `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` | battle | covered | `spell.invocation-magic-weapon-enhancement`, `spell.invocation-spell-hosted-weapon-attack`, `spell.invocation-weapon-attack-override`, `spell.invocation-weapon-damage-rider` |
| `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | battle | covered | `spell.invocation-marked-damage-rider` |
| `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` | battle | covered | `spell.invocation-chained-attack-damage` |
| `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` | battle | covered | `spell.invocation-independent-attack-sequence` |
| `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` | battle | covered | `spell.invocation-mirror-image-hit-interception` |
| `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | battle | covered | `spell.invocation-warding-bond-linked-effect` |
| `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | battle | covered | `spell.invocation-sanctuary-targeting-interdiction` |
| `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | battle | covered | `stat-block.attack-control` |
| `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | battle | covered | `spell.invocation-command-approach-route`, `spell.invocation-command-drop-held-object`, `spell.invocation-command-flee-route`, `spell.invocation-command-halt-grovel` |
| `BATTLE.DAMAGE.ATTACK_BRANCHES` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | battle | covered | `spell.invocation-damage-save-or-attack`, `spell.invocation-flaming-sphere-hazard-ram`, `spell.invocation-moonbeam-movable-zone`, `spell.invocation-spell-created-held-object` |
| `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | battle | covered | `spell.invocation-damage-reduction` |
| `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | battle | covered | `spell.invocation-flaming-sphere-hazard-ram`, `spell.invocation-moonbeam-movable-zone`, `spell.invocation-spell-created-held-object` |
| `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` | battle | covered | _direct reducer entrypoint_ |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | character-creation | covered | _direct reducer entrypoint_ |
| `CREATION.CHOICE_DISCOVERY_CARDINALITY` | character-creation | covered | _direct reducer entrypoint_ |
| `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT` | character-creation | covered | `character-creation.fighter-fighting-style-advancement-replacement` |
| `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` | character-creation | covered | `character-creation.warlock-pact-magic-advancement` |
| `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE` | character-creation | covered | `character-creation.eldritch-invocation-choice` |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | character-sheet | covered | `character-sheet.armor-class-base-formula` |
| `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` | battle | boundary-only | _outside reducer semantics_ |
| `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` | battle | needs-surface-evidence | _surface join pending_ |
| `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.class-feature-feat-choice` |
| `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.weapon-mastery-choice` |
| `SHEET.FEATURE_RESOURCES.TRANSITIONS` | character-sheet | covered | `character-sheet.class-feature-long-rest-use-state`, `character-sheet.class-feature-point-pool-resource`, `character-sheet.class-feature-use-count-resource`, `character-sheet.font-of-magic-slot-to-sorcery-points`, `character-sheet.font-of-magic-sorcery-points-to-spell-slot`, `character-sheet.healing-resource-action`, `character-sheet.metamagic-battle-resource-bridge`, `character-sheet.monk-uncanny-metabolism-initiative-recovery` |
| `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION` | character-battle | covered | _direct reducer entrypoint_ |
| `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` | character-battle | covered | _direct reducer entrypoint_ |
| `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` | character-battle | covered | _direct reducer entrypoint_ |
| `BATTLE.PROTOCOL.MALFORMED_PAYLOAD_REJECTION` | battle | boundary-only | _outside reducer semantics_ |
| `CREATION.PROTOCOL.MALFORMED_FILL_REJECTION` | character-creation | boundary-only | _outside reducer semantics_ |
| `BATTLE.SURFACE.CATALOG_ONLY_RECORDS` | battle | unsupported-by-admission | _outside reducer semantics_ |
| `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | battle | boundary-only | _outside reducer semantics_ |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | shared-algebras | covered | `spell.invocation-flaming-sphere-hazard-ram`, `spell.invocation-moonbeam-movable-zone`, `spell.invocation-spell-created-held-object` |
| `SHEET.HP_REST_HIT_DICE.TRANSITIONS` | character-sheet | covered | _direct reducer entrypoint_ |
| `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` | character-sheet | covered | `character-sheet.pact-slot-recovery`, `character-sheet.short-rest-spell-slot-recovery` |
| `SHEET.WEAPON_MASTERY.RESELECTION` | character-sheet | covered | `character-sheet.weapon-mastery-reselection` |
| `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` | character-sheet | covered | `character-sheet.spellbook-ritual-invocation` |
| `BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE` | battle | covered | `spell.invocation-dragons-breath-initial` |

## Battle Hole Frontier

- Total classified rows: 103

| Subject | Count |
| --- | ---: |
| battle-hole-family | 64 |
| battle-fill-kind | 39 |

| Classification | Count |
| --- | ---: |
| semantic-frontier | 80 |
| deterministic-boundary-projection | 0 |
| table-owned-fact | 23 |
| unsupported-dead-branch | 0 |

| Subject | Id | Kind | Classification | Coverage | Follow-up |
| --- | --- | --- | --- | --- | --- |
| battle-hole-family | `BattleTargetChoiceHole` | `targetChoice` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-hole-family | `BattleSpellCastReactionFactsHole` | `targetSpatialFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES`, `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-hole-family | `BattleWardingBondSeparationFactsHole` | `targetSpatialFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleObjectTargetChoiceHole` | `objectTargetChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSpellAreaChoiceHole` | `spellAreaChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleTeleportDestinationHole` | `teleportDestination` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleHeldObjectFactsHole` | `heldObjectFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSpellDamageTypeChoiceHole` | `damageTypeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-hole-family | `BattleSpellTargetAllocationHole` | `spellTargetAllocation` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleSpellTargetListHole` | `spellTargetList` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleAttackRollHole` | `attackRoll` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.STAT_BLOCK.ATTACK_CONTROL`, `BATTLE.DAMAGE.ATTACK_BRANCHES` | _none_ |
| battle-hole-family | `BattleSpellAttackRollHole` | `attackRoll` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` | _none_ |
| battle-hole-family | `BattleDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-hole-family | `BattleSpellDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | _none_ |
| battle-hole-family | `BattleSpellDamageReductionRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-hole-family | `BattleMirrorImageDuplicateRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` | _none_ |
| battle-hole-family | `BattleSpellTurnStartDamageRollHole` | `rolledDice` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | _none_ |
| battle-hole-family | `BattleFlamingSphereDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-hole-family | `BattleSpellHealingRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.HIT_POINT_RESTORATION` | _none_ |
| battle-hole-family | `BattleSpellSkillChoiceHole` | `skillChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | _none_ |
| battle-hole-family | `BattleSpellAbilityChoiceHole` | `abilityChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | _none_ |
| battle-hole-family | `BattleSpellConditionChoiceHole` | `conditionChoice` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleThaumaturgyActiveOneMinuteEffectCountHole` | `thaumaturgyActiveOneMinuteEffectCount` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleCommandOptionChoiceHole` | `commandOptionChoice` | semantic-frontier | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | _none_ |
| battle-hole-family | `BattleDancingLightsPlacementHole` | `dancingLightsPlacement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSpellSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | _none_ |
| battle-hole-family | `BattleSpellTurnStartSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | _none_ |
| battle-hole-family | `BattleSleepRepeatSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleHideousLaughterRepeatSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleGreaseGroundHazardSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleSpellConditionEndTurnSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | _none_ |
| battle-hole-family | `BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | _none_ |
| battle-hole-family | `BattleFlamingSphereRamMovementHole` | `movableZoneRamMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleMovableZoneRepositionMovementHole` | `movableZoneRepositionMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleFlamingSphereSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | _none_ |
| battle-hole-family | `BattleProtectionRelevantEffectSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` | _none_ |
| battle-hole-family | `BattleUnitFeatureSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleUnitFeatureRollHole` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleUnitFeatureDecisionHole` | `unitFeatureDecision` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleDeathSavingThrowHole` | `deathSavingThrow` | semantic-frontier | `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleStatBlockRechargeRollHole` | `statBlockRechargeRoll` | semantic-frontier | `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | _none_ |
| battle-hole-family | `BattleConcentrationSavingThrowHole` | `concentrationSavingThrow` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-hole-family | `BattleReactionDecisionHole` | `reactionDecision` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-hole-family | `BattleMovementHole` | `movement` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleAbilityCheckHole` | `abilityCheck` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-hole-family | `BattleGrappleOutcomeHole` | `grappleOutcome` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | _none_ |
| battle-hole-family | `BattleShoveOutcomeHole` | `shoveOutcome` | semantic-frontier | `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSanctuaryInterdictionOutcomeHole` | `sanctuaryInterdictionOutcome` | semantic-frontier | `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | _none_ |
| battle-hole-family | `BattleAttackDamageDispositionHole` | `attackDamageDisposition` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-fill-kind | `attackRoll` | `attackRoll` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.STAT_BLOCK.ATTACK_CONTROL`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | _none_ |
| battle-fill-kind | `rolledDice` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.HIT_POINT_RESTORATION`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | _none_ |
| battle-fill-kind | `damageTypeChoice` | `damageTypeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-fill-kind | `savingThrowOutcome` | `savingThrowOutcome` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`, `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`, `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | _none_ |
| battle-fill-kind | `conditionChoice` | `conditionChoice` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | _none_ |
| battle-fill-kind | `skillChoice` | `skillChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-fill-kind | `abilityChoice` | `abilityChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | _none_ |
| battle-fill-kind | `thaumaturgyActiveOneMinuteEffectCount` | `thaumaturgyActiveOneMinuteEffectCount` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `commandOptionChoice` | `commandOptionChoice` | semantic-frontier | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | _none_ |
| battle-fill-kind | `dancingLightsPlacement` | `dancingLightsPlacement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `unitFeatureDecision` | `unitFeatureDecision` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-fill-kind | `heldObjectFacts` | `heldObjectFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `targetChoice` | `targetChoice` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-fill-kind | `targetSpatialFacts` | `targetSpatialFacts` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `objectTargetChoice` | `objectTargetChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `spellAreaChoice` | `spellAreaChoice` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `movableZoneRamMovement` | `movableZoneRamMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `movableZoneRepositionMovement` | `movableZoneRepositionMovement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `teleportDestination` | `teleportDestination` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `spellTargetAllocation` | `spellTargetAllocation` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-fill-kind | `spellTargetList` | `spellTargetList` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-fill-kind | `deathSavingThrow` | `deathSavingThrow` | semantic-frontier | `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` | _none_ |
| battle-fill-kind | `statBlockRechargeRoll` | `statBlockRechargeRoll` | semantic-frontier | `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | _none_ |
| battle-fill-kind | `concentrationSavingThrow` | `concentrationSavingThrow` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-fill-kind | `attackDamageDisposition` | `attackDamageDisposition` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-fill-kind | `sanctuaryInterdictionOutcome` | `sanctuaryInterdictionOutcome` | semantic-frontier | `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | _none_ |
| battle-fill-kind | `reactionDecision` | `reactionDecision` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-fill-kind | `movement` | `movement` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `abilityCheck` | `abilityCheck` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-fill-kind | `grappleOutcome` | `grappleOutcome` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | _none_ |
| battle-fill-kind | `shoveOutcome` | `shoveOutcome` | semantic-frontier | `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSelfTransformationModeChoiceHole` | `selfTransformationModeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` | _none_ |
| battle-hole-family | `BattleMoonbeamSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | _none_ |
| battle-hole-family | `BattleMoonbeamDamageRollHole` | `rolledDice` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-fill-kind | `selfTransformationModeChoice` | `selfTransformationModeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` | _none_ |
| battle-hole-family | `BattleObjectContactTargetsHole` | `objectContactTargets` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE` |
| battle-fill-kind | `objectContactTargets` | `objectContactTargets` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | `RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE` |
| battle-hole-family | `BattleGustOfWindLineSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleGustOfWindLineDirectionChoiceHole` | `gustOfWindLineDirectionChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `gustOfWindLineDirectionChoice` | `gustOfWindLineDirectionChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleObjectContactSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleObjectDropResolutionHole` | `objectDropResolution` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-fill-kind | `objectDropResolution` | `objectDropResolution` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleLevitateAltitudeChangeHole` | `levitateAltitudeChange` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `levitateAltitudeChange` | `levitateAltitudeChange` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleLevitateInitialRiseHole` | `levitateInitialRise` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `levitateInitialRise` | `levitateInitialRise` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleMagicWeaponTargetItemHole` | `magicWeaponTargetItem` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` | _none_ |
| battle-fill-kind | `magicWeaponTargetItem` | `magicWeaponTargetItem` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` | _none_ |
| battle-hole-family | `BattleWebRestraintSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleOngoingSpellTargetChoiceHole` | `ongoingSpellTargetChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSpellcastingAbilityCheckHole` | `spellcastingAbilityCheck` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-fill-kind | `ongoingSpellTargetChoice` | `ongoingSpellTargetChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSpikeGrowthMovementDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |

## Generator Readiness

| Obligation | Status | Subset |
| --- | --- | --- |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | fixture-bound | `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `implies`, `all-block` |

## Open Work

- `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` (needs-surface-evidence; follow-up: `RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE`): Prove each currently admitted executable battle Surface profile points to a covered semantic obligation

## Checker Issues

No checker issues.
