# Rules Kernel Coverage Report

Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `battle-hole-frontier.jsonl`, `profile-obligations.jsonl`, `qnt-owner-roles.jsonl`, `generator-readiness.jsonl`, `kernel-ir-boundaries.jsonl`, and `KERNEL-COVERAGE` source markers.

## Summary

- Total obligations: 97
- Covered obligations: 91
- Open transitional obligations: 0
- Boundary or unsupported obligations: 6

| Status | Count |
| --- | ---: |
| covered | 91 |
| needs-qnt-owner | 0 |
| needs-parity-witness | 0 |
| needs-surface-evidence | 0 |
| boundary-only | 5 |
| unsupported-by-admission | 1 |

| Runtime | Count |
| --- | ---: |
| shared-algebras | 1 |
| battle | 71 |
| character-creation | 13 |
| character-sheet | 9 |
| character-battle | 3 |

## Obligations

| Obligation | Runtime | Status | Profiles |
| --- | --- | --- | --- |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | battle | covered | `spell.invocation-expeditious-retreat-dash`, `spell.invocation-forced-reaction-movement`, `spell.invocation-grease-ground-hazard`, `spell.invocation-jump-movement-replacement` |
| `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | battle | covered | `spell.invocation-feather-fall-mitigation`, `spell.invocation-forced-reaction-movement`, `spell.reaction-counterspell`, `spell.reaction-hellish-rebuke`, `spell.reaction-shield`, `spell.readied-action-time-spell`, `unit-feature.attack-damage-reduction-zero-damage-redirect`, `unit-feature.reaction-roll-or-damage-reduction` |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `unit-feature.action-surge-resource`, `unit-feature.alternate-action-cost`, `unit-feature.attack-action-attack-count-scaling`, `unit-feature.attack-damage-reduction-zero-damage-redirect`, `unit-feature.attack-damage-rider`, `unit-feature.attack-roll-miss-to-hit-replacement`, `unit-feature.bardic-inspiration-failed-d20-test`, `unit-feature.bardic-inspiration-grant`, `unit-feature.bonus-action-dash-temporary-hit-points`, `unit-feature.bonus-action-ongoing-rage`, `unit-feature.failed-ability-check-resource-boost`, `unit-feature.first-attack-roll-reckless-advantage`, `unit-feature.initiative-proficiency-and-swap`, `unit-feature.innate-sorcery-activation`, `unit-feature.martial-arts-attack-projection`, `unit-feature.monk-focus-battle-options`, `unit-feature.passive-armor-class-bonus`, `unit-feature.passive-ranged-attack-roll-bonus`, `unit-feature.passive-saving-throw-roll-mode`, `unit-feature.passive-speed-bonus`, `unit-feature.passive-speed-kind-grants`, `unit-feature.reaction-roll-or-damage-reduction`, `unit-feature.save-damage-replacement`, `unit-feature.self-bonus-action-healing`, `unit-feature.weapon-critical-range-19`, `unit-feature.weapon-damage-dice-roll-choice`, `unit-feature.weapon-mastery-cleave`, `unit-feature.weapon-mastery-sap`, `unit-feature.weapon-mastery-topple`, `unit-feature.zero-hit-point-replacement` |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `spell.invocation-damage-save-or-attack`, `spell.invocation-see-invisible-observer-sight`, `spell.invocation-spiritual-weapon-attack-proxy`, `spell.reaction-shield`, `spell.readied-action-time-spell` |
| `BATTLE.SPELL.HIT_POINT_RESTORATION` | battle | covered | `spell.hit-point-restoration` |
| `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` | battle | covered | `spell.invocation-direct-condition` |
| `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | battle | covered | `spell.invocation-condition-save`, `spell.invocation-hideous-laughter-repeat-save-lifecycle`, `spell.invocation-save-gated-condition-immunity` |
| `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | battle | covered | `spell.invocation-attack-roll-advantage-save` |
| `BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT` | battle | covered | `spell.invocation-see-invisible-observer-sight` |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` | battle | covered | `spell.invocation-ray-of-enfeeblement-d20-lifecycle` |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY` | battle | covered | `spell.invocation-ray-of-enfeeblement-damage-penalty` |
| `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE` | battle | covered | `spell.find-familiar-lifecycle` |
| `BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE` | battle | covered | `spell.invocation-web-restraint-hazard` |
| `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE` | battle | covered | `unit-feature.druid-wild-shape-known-form` |
| `BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE` | battle | covered | `spell.invocation-object-contact-damage` |
| `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` | battle | covered | `spell.invocation-gust-of-wind-line` |
| `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE` | battle | covered | `spell.invocation-creature-size-change` |
| `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` | battle | covered | `spell.invocation-levitated-creature` |
| `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING` | battle | covered | `spell.invocation-ongoing-spell-ending` |
| `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` | battle | covered | `unit-feature.metamagic-cast-governor-quickened` |
| `SHEET.SPELL_REST_BENEFIT.APPLICATION` | character-sheet | covered | `character-sheet.spell-rest-benefit-application` |
| `BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION` | battle | covered | `spell.invocation-antimagic-field-ongoing-spell-suppression` |
| `BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD` | battle | covered | `spell.invocation-spike-growth-movement-hazard` |
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
| `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` | battle | covered | `spell.creature-type-protection-and-charm`, `spell.invocation-save-gated-condition-immunity` |
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
| `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT` | character-creation | covered | `character-creation.class-feature-advancement-replacement`, `character-creation.fighter-fighting-style-advancement-replacement` |
| `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` | character-creation | covered | `character-creation.warlock-pact-magic-advancement` |
| `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE` | character-creation | covered | `character-creation.eldritch-invocation-choice` |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | character-sheet | covered | `character-sheet.armor-class-base-formula` |
| `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` | battle | boundary-only | _outside reducer semantics_ |
| `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` | battle | boundary-only | _outside reducer semantics_ |
| `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.class-feature-feat-choice` |
| `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.weapon-mastery-choice` |
| `CREATION.CLASS_FEATURE_OPTION.PROJECTION` | character-creation | covered | `character-creation.class-feature-option-projection` |
| `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.skill-expertise-choice` |
| `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` | character-creation | covered | `character-creation.class-feature-resource-projection` |
| `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION` | character-creation | covered | `character-creation.class-feature-source-fact-projection` |
| `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.wizard-spellbook-learning-choice` |
| `SHEET.FEATURE_RESOURCES.TRANSITIONS` | character-sheet | covered | `character-sheet.class-feature-long-rest-use-state`, `character-sheet.class-feature-point-pool-resource`, `character-sheet.class-feature-use-count-resource`, `character-sheet.font-of-magic-slot-to-sorcery-points`, `character-sheet.font-of-magic-sorcery-points-to-spell-slot`, `character-sheet.healing-resource-action`, `character-sheet.metamagic-battle-resource-bridge`, `character-sheet.monk-uncanny-metabolism-initiative-recovery` |
| `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` | character-sheet | covered | `character-sheet.ability-check-proficiency-bonus` |
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
| `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` | character-sheet | covered | `character-sheet.class-feature-prepared-spell-access`, `character-sheet.druid-circle-land-spell-access` |
| `BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE` | battle | covered | `spell.invocation-dragons-breath-initial` |
| `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION` | battle | covered | `spell.invocation-dragons-breath-granted-action` |
| `BATTLE.ATTACK.MINIMAL_RESOLUTION` | battle | covered | _direct reducer entrypoint_ |

## Battle Hole Frontier

- Total classified rows: 110

| Subject | Count |
| --- | ---: |
| battle-hole-family | 69 |
| battle-fill-kind | 41 |

| Classification | Count |
| --- | ---: |
| semantic-frontier | 85 |
| deterministic-boundary-projection | 0 |
| table-owned-fact | 25 |
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
| battle-hole-family | `BattleDragonsBreathDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-hole-family | `BattleSpellDamageReductionRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-hole-family | `BattleSourceDamageRollPenaltyRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-hole-family | `BattleMirrorImageDuplicateRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` | _none_ |
| battle-hole-family | `BattleSpellTurnStartDamageRollHole` | `rolledDice` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | _none_ |
| battle-hole-family | `BattleFlamingSphereDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-hole-family | `BattleSpellHealingRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.HIT_POINT_RESTORATION` | _none_ |
| battle-hole-family | `BattleSpellSkillChoiceHole` | `skillChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | _none_ |
| battle-hole-family | `BattleSpellAbilityChoiceHole` | `abilityChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | _none_ |
| battle-hole-family | `BattleSpellTargetAbilityChoicesHole` | `targetAbilityChoices` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | _none_ |
| battle-hole-family | `BattleSpellConditionChoiceHole` | `conditionChoice` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleThaumaturgyActiveOneMinuteEffectCountHole` | `thaumaturgyActiveOneMinuteEffectCount` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleCommandOptionChoiceHole` | `commandOptionChoice` | semantic-frontier | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | _none_ |
| battle-hole-family | `BattleDancingLightsPlacementHole` | `dancingLightsPlacement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSpellSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | _none_ |
| battle-hole-family | `BattleDragonsBreathSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
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
| battle-fill-kind | `targetAbilityChoices` | `targetAbilityChoices` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | _none_ |
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
| battle-hole-family | `BattleSpiritualWeaponForcePositionHole` | `spiritualWeaponForcePosition` | table-owned-fact | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `spiritualWeaponForcePosition` | `spiritualWeaponForcePosition` | table-owned-fact | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |

## QNT Owner Roles

| Owner | Role | Obligations |
| --- | --- | --- |
| `packages/battle-runtime/battle-runtime-chained-spell-attack.qnt` | semantic-core | `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` |
| `packages/battle-runtime/battle-runtime-command-choice.qnt` | semantic-core | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` |
| `packages/battle-runtime/battle-runtime-concentration.qnt` | semantic-core | `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-creature-type-protection.qnt` | semantic-core | `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` |
| `packages/battle-runtime/battle-runtime-damage-adjustments.qnt` | semantic-core | `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` |
| `packages/battle-runtime/battle-runtime-direct-condition-removal.qnt` | semantic-core | `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` |
| `packages/battle-runtime/battle-runtime-ground-command-tests.qnt` | mbt-fixture | `BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD` |
| `packages/battle-runtime/battle-runtime-ground-command.qnt` | semantic-core | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` |
| `packages/battle-runtime/battle-runtime-gust-of-wind.qnt` | semantic-core | `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-hit-points.qnt` | semantic-core | `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE`, `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-light.qnt` | semantic-core | `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` |
| `packages/battle-runtime/battle-runtime-levitate-creature.qnt` | semantic-core | `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-marked-riders.qnt` | semantic-core | `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` |
| `packages/battle-runtime/battle-runtime-marked-spells.qnt` | semantic-core | `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` |
| `packages/battle-runtime/battle-runtime-metamagic.qnt` | semantic-core | `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` |
| `packages/battle-runtime/battle-runtime-mirror-image.qnt` | semantic-core | `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` |
| `packages/battle-runtime/battle-runtime-monk-focus.qnt` | semantic-core | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-protection-from-poison.qnt` | semantic-core | `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` |
| `packages/battle-runtime/battle-runtime-reaction-window.qnt` | semantic-core | `BATTLE.SPELL.REACTION_CASTING_TIME` |
| `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt` | semantic-core | `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt` | semantic-core | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-sanctuary.qnt` | semantic-core | `BATTLE.SANCTUARY.TARGETING_INTERDICTION`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-save-gated-spell.qnt` | semantic-core | `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-see-invisibility.qnt` | semantic-core | `BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT` |
| `packages/battle-runtime/battle-runtime-self-transformation.qnt` | semantic-core | `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` |
| `packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt` | semantic-core | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-spell-attack.qnt` | semantic-core | `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` |
| `packages/battle-runtime/battle-runtime-spell-facts-tests.qnt` | mbt-fixture | `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY` |
| `packages/battle-runtime/battle-runtime-spell-invocation.qnt` | semantic-core | `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` |
| `packages/battle-runtime/battle-runtime-thaumaturgy.qnt` | semantic-core | `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-timed-effects.qnt` | semantic-core | `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-warding-bond.qnt` | semantic-core | `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` |
| `packages/battle-runtime/battle-runtime-weapon-attacks.qnt` | semantic-core | `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` |
| `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt` | semantic-core | `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` |
| `packages/battle-runtime/battle-runtime.qnt` | semantic-core | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE`, `BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION`, `BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE`, `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE`, `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING`, `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION`, `BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE`, `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE`, `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE`, `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE`, `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE`, `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE`, `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE`, `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE`, `BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE`, `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE`, `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE`, `BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE`, `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE`, `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE`, `BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE`, `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE`, `BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE` |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt` | mbt-fixture | `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS`, `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION` |
| `packages/character-battle-runtime/character-battle-settlement.mbt.qnt` | mbt-fixture | `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS`, `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` |
| `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt` | mbt-fixture | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt` | mbt-fixture | `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION`, `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION` |
| `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION` |
| `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.CLASS_FEATURE_OPTION.PROJECTION` |
| `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT`, `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION` |
| `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION` |
| `packages/character-creation-runtime/character-creation-runtime-slice.qnt` | semantic-core | `CREATION.CHOICE_DISCOVERY_CARDINALITY`, `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` |
| `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE`, `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` |
| `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt` | mbt-fixture | `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt` | selected-identity-trace | `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt` | selected-identity-trace | `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt` | mbt-fixture | `SHEET.HP_REST_HIT_DICE.TRANSITIONS` |
| `packages/character-sheet-runtime/character-sheet-spell-rest-benefit-application.mbt.qnt` | mbt-fixture | `SHEET.SPELL_REST_BENEFIT.APPLICATION` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt` | mbt-fixture | `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` |
| `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt` | selected-identity-trace | `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt` | selected-identity-trace | `SHEET.WEAPON_MASTERY.RESELECTION` |
| `packages/shared-algebras/proofs/death-saves-algebra-inductive.qnt` | proof-only | `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` |
| `packages/shared-algebras/proofs/rule-core/attack-damage-composition.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` |
| `packages/shared-algebras/proofs/rule-core/damage-component-adjustments.qnt` | semantic-core | `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` |
| `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt` | semantic-core | `SHARED.HIT_POINTS.POSITIVE_DAMAGE` |
| `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt` | semantic-core | `SHEET.HP_REST_HIT_DICE.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt` | semantic-core | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` |
| `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt` | semantic-core | `BATTLE.REACTION.OFFER_DECLINE_RESUME` |
| `packages/shared-algebras/proofs/rule-core/shove-outcome.qnt` | semantic-core | `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` |
| `packages/shared-algebras/proofs/rule-core/spell-attack-burst-save-damage-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-attack-damage-projection-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-chained-attack-damage-projection-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-damage-projection-core.qnt` | semantic-core | `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-damage-rider-projection-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-defensive-effect-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-direct-damage-projection-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-independent-attack-sequence-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-invocation-action-slot-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-invocation-resource-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-object-hit-point-damage-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-hit-point-restoration-core.qnt` | semantic-core | `BATTLE.SPELL.HIT_POINT_RESTORATION` |
| `packages/shared-algebras/proofs/rule-core/spell-readied-spell-response-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-save-condition-projection-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-save-damage-projection-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-save-gate.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-sleep-repeat-save-lifecycle-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-slot-expenditure.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/spell-turn-hook-core.qnt` | semantic-core | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/stat-block-controls.qnt` | semantic-core | `BATTLE.STAT_BLOCK.ATTACK_CONTROL` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` | semantic-core | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core.qnt` | semantic-core | `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/creature-attack.qnt` | semantic-core | `BATTLE.ATTACK.MINIMAL_RESOLUTION` |

## Generator Readiness

| Obligation | Status | Subset | Blockers | Follow-up |
| --- | --- | --- | --- | --- |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | generation-subset-clean | `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `implies`, `all-block` |  |  |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `range`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` | generation-subset-clean | `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `comparison`, `pattern-match` |  |  |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `map`, `set-operators`, `membership` | `run-block-coupled` | `A43-UNIT-FEATURE-PASSIVE-MOVEMENT-DEFENSE-CORE`, `A44-UNIT-FEATURE-MARTIAL-ARTS-CORE`, `A45-UNIT-FEATURE-ZERO-HP-CORE`, `A46-MONK-FOCUS-BATTLE-CORE` |
| `BATTLE.SPELL.HIT_POINT_RESTORATION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match` |  |  |
| `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A47-BATTLE-RUNTIME-SLICE-OWNER-CLOSURE` |
| `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | not-assessed |  |  |  |
| `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | not-assessed |  |  |  |
| `BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT` | not-assessed |  |  |  |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` | not-assessed |  |  |  |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY` | not-assessed |  |  |  |
| `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A53-BATTLE-RUNTIME-COMPANION-FORM-CORE` |
| `BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A49-BATTLE-RUNTIME-GROUND-HAZARD-CORE` |
| `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A53-BATTLE-RUNTIME-COMPANION-FORM-CORE` |
| `BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A51-BATTLE-RUNTIME-OBJECT-CONTACT-ENDING-CORE` |
| `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` | not-assessed |  |  |  |
| `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE` | not-assessed |  |  |  |
| `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` | not-assessed |  |  |  |
| `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A51-BATTLE-RUNTIME-OBJECT-CONTACT-ENDING-CORE` |
| `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` | not-assessed |  |  |  |
| `BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A51-BATTLE-RUNTIME-OBJECT-CONTACT-ENDING-CORE` |
| `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` | not-assessed |  |  |  |
| `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A49-BATTLE-RUNTIME-GROUND-HAZARD-CORE` |
| `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A49-BATTLE-RUNTIME-GROUND-HAZARD-CORE` |
| `BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A49-BATTLE-RUNTIME-GROUND-HAZARD-CORE` |
| `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A48-BATTLE-RUNTIME-LIGHT-EMITTER-CORE` |
| `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A47-BATTLE-RUNTIME-SLICE-OWNER-CLOSURE` |
| `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A48-BATTLE-RUNTIME-LIGHT-EMITTER-CORE` |
| `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A48-BATTLE-RUNTIME-LIGHT-EMITTER-CORE` |
| `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A48-BATTLE-RUNTIME-LIGHT-EMITTER-CORE` |
| `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A50-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE` |
| `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A50-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE` |
| `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A50-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE` |
| `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A50-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE` |
| `BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A50-BATTLE-RUNTIME-MOVEMENT-REACTION-CORE` |
| `BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A54-BATTLE-RUNTIME-BLUR-DEFENSE-CORE` |
| `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A47-BATTLE-RUNTIME-SLICE-OWNER-CLOSURE` |
| `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` | not-assessed |  |  |  |
| `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | not-assessed |  |  |  |
| `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | not-assessed |  |  |  |
| `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` | not-assessed |  |  |  |
| `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS` | not-assessed |  |  |  |
| `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | not-assessed |  |  |  |
| `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` | not-assessed |  |  |  |
| `BATTLE.SPELL.REACTION_CASTING_TIME` | not-assessed |  |  |  |
| `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | not-assessed |  |  |  |
| `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` | not-assessed |  |  |  |
| `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | not-assessed |  |  |  |
| `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` | not-assessed |  |  |  |
| `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` | not-assessed |  |  |  |
| `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` | not-assessed |  |  |  |
| `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | not-assessed |  |  |  |
| `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | not-assessed |  |  |  |
| `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A55-BATTLE-RUNTIME-ABILITY-HOLE-CLOSURE` |
| `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | not-assessed |  |  |  |
| `BATTLE.DAMAGE.ATTACK_BRANCHES` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` | `run-block-coupled` | `A44-UNIT-FEATURE-MARTIAL-ARTS-CORE` |
| `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership`, `list`, `fold`, `map`, `exists` |  |  |
| `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` | `run-block-coupled` | `A45-UNIT-FEATURE-ZERO-HP-CORE` |
| `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` | not-assessed |  |  |  |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | not-assessed |  |  |  |
| `CREATION.CHOICE_DISCOVERY_CARDINALITY` | not-assessed |  |  |  |
| `SHEET.HP_REST_HIT_DICE.TRANSITIONS` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `implies`, `all-block` |  |  |
| `BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A52-BATTLE-RUNTIME-DRAGONS-BREATH-CORE` |
| `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION` | fixture-bound | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `set-operators`, `membership` | `bridge-projection-coupled` | `A52-BATTLE-RUNTIME-DRAGONS-BREATH-CORE` |
| `BATTLE.ATTACK.MINIMAL_RESOLUTION` | not-assessed |  |  |  |

### Generator Readiness Backlog

Rows here are derived from covered obligations with semantic-core QNT owners whose generator-readiness row is either omitted or still `not-assessed`.

| Obligation | Status | Semantic-core owners | Owner roles |
| --- | --- | --- | --- |
| `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`, `packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt` | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`: semantic-core |
| `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | not-assessed | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`, `packages/battle-runtime/battle-runtime-spell-attack.qnt` | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-attack.qnt`: semantic-core |
| `BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT` | not-assessed | `packages/battle-runtime/battle-runtime-see-invisibility.qnt` | `packages/battle-runtime/battle-runtime-see-invisibility.qnt`: semantic-core |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`, `packages/battle-runtime/battle-runtime-spell-attack.qnt`, `packages/battle-runtime/battle-runtime-timed-effects.qnt`, `packages/battle-runtime/battle-runtime-concentration.qnt` | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-attack.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-timed-effects.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-concentration.qnt`: semantic-core |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY` | not-assessed | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt` | `packages/battle-runtime/battle-runtime-save-gated-spell.qnt`: semantic-core |
| `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime-gust-of-wind.qnt` | `packages/battle-runtime/battle-runtime-gust-of-wind.qnt`: semantic-core |
| `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime.qnt`, `packages/battle-runtime/battle-runtime-timed-effects.qnt` | `packages/battle-runtime/battle-runtime.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-timed-effects.qnt`: semantic-core |
| `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime-levitate-creature.qnt` | `packages/battle-runtime/battle-runtime-levitate-creature.qnt`: semantic-core |
| `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` | not-assessed | `packages/battle-runtime/battle-runtime-metamagic.qnt` | `packages/battle-runtime/battle-runtime-metamagic.qnt`: semantic-core |
| `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt` | `packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`: semantic-core |
| `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime-hit-points.qnt` | `packages/battle-runtime/battle-runtime-hit-points.qnt`: semantic-core |
| `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | not-assessed | `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt`, `packages/battle-runtime/battle-runtime-thaumaturgy.qnt` | `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-thaumaturgy.qnt`: semantic-core |
| `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | not-assessed | `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt` | `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`: semantic-core |
| `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` | not-assessed | `packages/battle-runtime/battle-runtime-creature-type-protection.qnt` | `packages/battle-runtime/battle-runtime-creature-type-protection.qnt`: semantic-core |
| `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS` | not-assessed | `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`, `packages/battle-runtime/battle-runtime-timed-effects.qnt`, `packages/battle-runtime/battle-runtime-concentration.qnt` | `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-timed-effects.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-concentration.qnt`: semantic-core |
| `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | not-assessed | `packages/battle-runtime/battle-runtime-direct-condition-removal.qnt`, `packages/battle-runtime/battle-runtime-protection-from-poison.qnt` | `packages/battle-runtime/battle-runtime-direct-condition-removal.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-protection-from-poison.qnt`: semantic-core |
| `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` | not-assessed | `packages/battle-runtime/battle-runtime-self-transformation.qnt` | `packages/battle-runtime/battle-runtime-self-transformation.qnt`: semantic-core |
| `BATTLE.SPELL.REACTION_CASTING_TIME` | not-assessed | `packages/battle-runtime/battle-runtime-reaction-window.qnt`, `packages/battle-runtime/battle-runtime-spell-invocation.qnt` | `packages/battle-runtime/battle-runtime-reaction-window.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-invocation.qnt`: semantic-core |
| `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | not-assessed | `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`, `packages/battle-runtime/battle-runtime-spell-invocation.qnt`, `packages/battle-runtime/battle-runtime-concentration.qnt` | `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-invocation.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-concentration.qnt`: semantic-core |
| `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` | not-assessed | `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`, `packages/battle-runtime/battle-runtime-weapon-attacks.qnt`, `packages/battle-runtime/battle-runtime-light.qnt`, `packages/battle-runtime/battle-runtime-spell-invocation.qnt` | `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-weapon-attacks.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-light.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-invocation.qnt`: semantic-core |
| `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | not-assessed | `packages/battle-runtime/battle-runtime-marked-riders.qnt`, `packages/battle-runtime/battle-runtime-marked-spells.qnt`, `packages/battle-runtime/battle-runtime-concentration.qnt` | `packages/battle-runtime/battle-runtime-marked-riders.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-marked-spells.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-concentration.qnt`: semantic-core |
| `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` | not-assessed | `packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`, `packages/battle-runtime/battle-runtime-spell-attack.qnt`, `packages/battle-runtime/battle-runtime-spell-invocation.qnt` | `packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-attack.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-invocation.qnt`: semantic-core |
| `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` | not-assessed | `packages/battle-runtime/battle-runtime-spell-attack.qnt`, `packages/battle-runtime/battle-runtime-spell-invocation.qnt` | `packages/battle-runtime/battle-runtime-spell-attack.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-spell-invocation.qnt`: semantic-core |
| `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` | not-assessed | `packages/battle-runtime/battle-runtime-mirror-image.qnt` | `packages/battle-runtime/battle-runtime-mirror-image.qnt`: semantic-core |
| `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | not-assessed | `packages/battle-runtime/battle-runtime-warding-bond.qnt` | `packages/battle-runtime/battle-runtime-warding-bond.qnt`: semantic-core |
| `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | not-assessed | `packages/battle-runtime/battle-runtime-sanctuary.qnt` | `packages/battle-runtime/battle-runtime-sanctuary.qnt`: semantic-core |
| `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | not-assessed | `packages/battle-runtime/battle-runtime-ground-command.qnt`, `packages/battle-runtime/battle-runtime-command-choice.qnt` | `packages/battle-runtime/battle-runtime-ground-command.qnt`: semantic-core<br>`packages/battle-runtime/battle-runtime-command-choice.qnt`: semantic-core |
| `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` | not-assessed | `packages/battle-runtime/battle-runtime-hit-points.qnt` | `packages/battle-runtime/battle-runtime-hit-points.qnt`: semantic-core |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | not-assessed | `packages/character-creation-runtime/character-creation-runtime-slice.qnt` | `packages/character-creation-runtime/character-creation-runtime-slice.qnt`: semantic-core |
| `CREATION.CHOICE_DISCOVERY_CARDINALITY` | not-assessed | `packages/character-creation-runtime/character-creation-runtime-slice.qnt` | `packages/character-creation-runtime/character-creation-runtime-slice.qnt`: semantic-core |
| `BATTLE.ATTACK.MINIMAL_RESOLUTION` | not-assessed | `packages/battle-runtime/creature-attack.qnt` | `packages/battle-runtime/creature-attack.qnt`: semantic-core |

### Semantic-Core Run Block Findings

Rows here are derived from semantic-core QNT owners that still contain Quint `run` blocks. Assessed readiness rows must split those tests out or classify the generator blocker as `run-block-coupled`.

| Obligation | Readiness status | Blocker | Semantic-core run blocks |
| --- | --- | --- | --- |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | fixture-bound | `run-block-coupled` | `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt`: lines `334`, `363`, `382`, `400`, `431`, `452`, `468`, `507`, `558`<br>`packages/battle-runtime/battle-runtime-monk-focus.qnt`: lines `134`, `140`, `149`, `159`, `168`, `178`, `199` |
| `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` | not-assessed | `run-block-coupled` | `packages/battle-runtime/battle-runtime-gust-of-wind.qnt`: lines `163` |
| `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` | not-assessed | `run-block-coupled` | `packages/battle-runtime/battle-runtime-levitate-creature.qnt`: lines `249`, `261`, `271`, `290`, `302`, `320`, `329` |
| `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` | not-assessed | `run-block-coupled` | `packages/battle-runtime/battle-runtime-metamagic.qnt`: lines `337`, `363`, `378`, `393`, `416`, `488`, `509`, `545` |
| `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | not-assessed | `run-block-coupled` | `packages/battle-runtime/battle-runtime-direct-condition-removal.qnt`: lines `137`, `163`, `183`, `196`, `220`<br>`packages/battle-runtime/battle-runtime-protection-from-poison.qnt`: lines `101`, `116`, `126` |
| `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | not-assessed | `run-block-coupled` | `packages/battle-runtime/battle-runtime-warding-bond.qnt`: lines `187`, `205`, `217`, `228` |
| `BATTLE.DAMAGE.ATTACK_BRANCHES` | fixture-bound | `run-block-coupled` | `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt`: lines `334`, `363`, `382`, `400`, `431`, `452`, `468`, `507`, `558` |
| `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | fixture-bound | `run-block-coupled` | `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt`: lines `334`, `363`, `382`, `400`, `431`, `452`, `468`, `507`, `558` |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | not-assessed | `run-block-coupled` | `packages/character-creation-runtime/character-creation-runtime-slice.qnt`: lines `578`, `582`, `595`, `603`, `619`, `633`, `653`, `669`, `682`, `695`, `719`, `741` |
| `CREATION.CHOICE_DISCOVERY_CARDINALITY` | not-assessed | `run-block-coupled` | `packages/character-creation-runtime/character-creation-runtime-slice.qnt`: lines `578`, `582`, `595`, `603`, `619`, `633`, `653`, `669`, `682`, `695`, `719`, `741` |

## Kernel IR Boundaries

| Boundary | Obligations | Runtime Paths | Summary |
| --- | --- | --- | --- |
| command | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/battle-subjects.ts` | Executable reducer commands are selected Battle subjects and command-option choices, not authored spell names. |
| fill | `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/battle-reducer/spells-resolve-fill-set.ts`, `packages/battle-runtime/src/battle-reducer/attack-fill-set.ts` | Caller, table, roll, choice, and result facts enter through typed hole/fill frontiers. |
| result | `BATTLE.REACTION.OFFER_DECLINE_RESUME`, `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY`, `SHEET.SPELL_REST_BENEFIT.APPLICATION` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/battle-reducer/result-helpers.ts`, `packages/character-creation-runtime/src/index.ts`, `packages/character-sheet-runtime/src/index.ts` | Reducer results distinguish resolved state, requested holes, and typed invalid outcomes. |
| state | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `SHEET.HP_REST_HIT_DICE.TRANSITIONS`, `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/character-creation-runtime/src/types.ts`, `packages/character-sheet-runtime/src/index.ts`, `packages/character-battle-runtime/src/battle-creature-init.ts` | Mutable reducer state remains runtime-owned and is projected from shared algebras, Surface records, and character-sheet facts. |
| active-effect | `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | `packages/battle-runtime/src/active-effect/types.ts`, `packages/battle-runtime/src/active-effect/lifecycle.ts`, `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts`, `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts` | Battle active effects are typed occurrence state with expiration and cleanup semantics. |
| support-profile | `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `CREATION.CHOICE_DISCOVERY_CARDINALITY` | `packages/battle-runtime/src/unit-feature-support.ts`, `packages/battle-runtime/src/battle-reducer/spells-profiles.ts`, `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-battle-runtime/src/battle-support-profiles.ts` | Support profiles admit Surface records into executable procedure shapes before reducer execution. |
| resource | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`, `SHEET.FEATURE_RESOURCES.TRANSITIONS`, `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/character-battle-resources.ts`, `packages/battle-runtime/src/battle-reducer/spells-resolve-resources.ts`, `packages/character-sheet-runtime/src/index.ts`, `packages/character-battle-runtime/src/index.ts` | Resources are split by owner: turn economy in battle, spell/feature expenditure on sheet state, and battle-local resource snapshots during combat. |
| handoff | `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION`, `CHARACTER.BATTLE.HANDOFF.SETTLEMENT`, `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` | `packages/character-battle-runtime/src/index.ts`, `packages/character-battle-runtime/src/battle-creature-init.ts`, `packages/character-battle-runtime/src/battle-character-build-projection.ts`, `packages/character-battle-runtime/src/battle-support-profiles.ts` | Character-battle handoff projects state into battle and settles accepted battle-owned changes back to character sheet state. |

## Open Work

No open transitional obligations.

## Checker Issues

No checker issues.
