# Rules Kernel Coverage Report

Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `battle-hole-frontier.jsonl`, `profile-obligations.jsonl`, `qnt-owner-roles.jsonl`, `generator-readiness.jsonl`, `kernel-ir-boundaries.jsonl`, and `KERNEL-COVERAGE` source markers.

## Summary

- Total obligations: 120
- Covered obligations: 114
- Open transitional obligations: 0
- Boundary or unsupported obligations: 6

| Status | Count |
| --- | ---: |
| covered | 114 |
| needs-qnt-owner | 0 |
| needs-parity-witness | 0 |
| needs-surface-evidence | 0 |
| boundary-only | 5 |
| unsupported-by-admission | 1 |

| Runtime | Count |
| --- | ---: |
| shared-algebras | 1 |
| battle | 90 |
| character-creation | 14 |
| character-sheet | 12 |
| character-battle | 3 |

## Obligations

| Obligation | Runtime | Status | Profiles |
| --- | --- | --- | --- |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | battle | covered | `spell.invocation-expeditious-retreat-dash`, `spell.invocation-forced-reaction-movement`, `spell.invocation-grease-ground-hazard`, `spell.invocation-jump-movement-replacement`, `unit-feature.creature-space-movement-permission` |
| `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | battle | covered | `spell.invocation-feather-fall-mitigation`, `spell.invocation-forced-reaction-movement`, `spell.reaction-counterspell`, `spell.reaction-hellish-rebuke`, `spell.reaction-shield`, `spell.readied-action-time-spell`, `unit-feature.attack-damage-reduction-zero-damage-redirect`, `unit-feature.reaction-roll-or-damage-reduction` |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | _unit-feature profile-scoped owner rows below_ |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `spell.invocation-damage-save-or-attack`, `spell.invocation-see-invisible-observer-sight`, `spell.invocation-spiritual-weapon-attack-proxy`, `spell.reaction-shield`, `spell.readied-action-time-spell` |
| `BATTLE.SPELL.HIT_POINT_RESTORATION` | battle | covered | `spell.hit-point-restoration` |
| `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` | battle | covered | `spell.invocation-direct-condition` |
| `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | battle | covered | `spell.invocation-condition-save`, `spell.invocation-hideous-laughter-repeat-save-lifecycle`, `spell.invocation-hypnotic-pattern-control`, `spell.invocation-save-gated-condition-immunity` |
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
| `BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION` | battle | covered | `unit-feature.metamagic-careful-save-protection` |
| `BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE` | battle | covered | `unit-feature.metamagic-heightened-save-disadvantage` |
| `BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION` | battle | covered | `unit-feature.metamagic-damage-type-substitution` |
| `BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET` | battle | covered | `unit-feature.metamagic-effective-level-extra-target` |
| `BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE` | battle | covered | `unit-feature.metamagic-cast-range-increase` |
| `BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION` | battle | covered | `unit-feature.metamagic-cast-duration-and-concentration` |
| `BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION` | battle | covered | `unit-feature.metamagic-cast-component-suppression` |
| `SHEET.SPELL_REST_BENEFIT.APPLICATION` | character-sheet | covered | `character-sheet.spell-rest-benefit-application` |
| `BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION` | battle | covered | `spell.invocation-antimagic-field-ongoing-spell-suppression` |
| `BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION` | battle | covered | `spell.invocation-antimagic-field-action-interdiction` |
| `BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION` | battle | covered | `spell.invocation-antimagic-field-magical-effect-interdiction` |
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
| `BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING` | battle | covered | `spell.invocation-self-teleport` |
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
| `BATTLE.DAMAGE.ATTACK_BRANCHES` | battle | covered | `unit-feature.light-extra-attack-damage-ability-modifier` |
| `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | battle | covered | `spell.invocation-acid-arrow-attack-timing`, `spell.invocation-damage-save-or-attack`, `spell.invocation-flaming-sphere-hazard-ram`, `spell.invocation-moonbeam-movable-zone`, `spell.invocation-spell-created-held-object` |
| `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | battle | covered | `spell.invocation-damage-reduction`, `unit-feature.passive-damage-resistance` |
| `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | battle | covered | `spell.invocation-flaming-sphere-hazard-ram`, `spell.invocation-moonbeam-movable-zone`, `spell.invocation-spell-created-held-object` |
| `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` | battle | covered | _direct reducer entrypoint_ |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | character-creation | covered | _direct reducer entrypoint_ |
| `CREATION.CHOICE_DISCOVERY_CARDINALITY` | character-creation | covered | _direct reducer entrypoint_ |
| `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT` | character-creation | covered | `character-creation.class-feature-advancement-replacement`, `character-creation.fighter-fighting-style-advancement-replacement` |
| `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` | character-creation | covered | `character-creation.warlock-pact-magic-advancement` |
| `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE` | character-creation | covered | `character-creation.eldritch-invocation-choice` |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | character-sheet | covered | `character-sheet.armor-class-base-formula` |
| `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` | battle | boundary-only | _outside reducer semantics_ |
| `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` | battle | boundary-only | _outside reducer semantics_ |
| `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.class-feature-feat-choice` |
| `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` | character-creation | covered | `character-creation.weapon-mastery-choice` |
| `CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT` | character-creation | covered | `character-creation.weapon-mastery-level-gain` |
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
| `SHEET.HIT_POINTS.MAXIMUM_DERIVATION` | character-sheet | covered | _direct reducer entrypoint_ |
| `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` | character-sheet | covered | `character-sheet.pact-slot-recovery`, `character-sheet.short-rest-spell-slot-recovery` |
| `SHEET.SPELL_SLOTS.TABLE_DERIVATION` | character-sheet | covered | _direct reducer entrypoint_ |
| `SHEET.WEAPON_MASTERY.RESELECTION` | character-sheet | covered | `character-sheet.weapon-mastery-reselection` |
| `SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION` | character-sheet | covered | `character-sheet.weapon-mastery-class-level-reselection` |
| `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` | character-sheet | covered | `character-sheet.spellbook-ritual-invocation` |
| `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` | character-sheet | covered | `character-sheet.class-feature-prepared-spell-access`, `character-sheet.druid-circle-land-spell-access` |
| `BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE` | battle | covered | `spell.invocation-dragons-breath-initial` |
| `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION` | battle | covered | `spell.invocation-dragons-breath-granted-action` |
| `BATTLE.ATTACK.MINIMAL_RESOLUTION` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL` | battle | covered | `unit-feature.metamagic-missed-spell-attack-reroll` |
| `BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL` | battle | covered | `unit-feature.metamagic-damage-dice-reroll` |
| `BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING` | battle | covered | `spell.invocation-acid-arrow-attack-timing` |
| `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION` | battle | covered | _direct reducer entrypoint_ |

## Battle Hole Frontier

- Total classified rows: 157

| Subject | Count |
| --- | ---: |
| battle-hole-family | 75 |
| battle-fill-kind | 46 |
| battle-subject-kind | 36 |

| Classification | Count |
| --- | ---: |
| semantic-frontier | 128 |
| deterministic-boundary-projection | 0 |
| table-owned-fact | 29 |
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
| battle-hole-family | `BattleFindFamiliarConnectionHole` | `findFamiliarConnection` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleCompanionReappearancePlacementHole` | `companionReappearancePlacement` | table-owned-fact | `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleCompanionReappearanceInitiativeHole` | `companionReappearanceInitiative` | semantic-frontier | `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleSpellDamageTypeChoiceHole` | `damageTypeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-hole-family | `BattleSpellTargetAllocationHole` | `spellTargetAllocation` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleSpellTargetListHole` | `spellTargetList` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | _none_ |
| battle-hole-family | `BattleAttackRollHole` | `attackRoll` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.STAT_BLOCK.ATTACK_CONTROL`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-hole-family | `BattleSpellAttackRollHole` | `attackRoll` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` | _none_ |
| battle-hole-family | `BattleDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-hole-family | `BattleSpellDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | _none_ |
| battle-hole-family | `BattleDragonsBreathDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-hole-family | `BattleSpellDamageReductionRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-hole-family | `BattleSourceDamageRollPenaltyRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-hole-family | `BattleMirrorImageDuplicateRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` | _none_ |
| battle-hole-family | `BattleSpellTurnStartDamageRollHole` | `rolledDice` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | _none_ |
| battle-hole-family | `BattleSpellTurnEndDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-hole-family | `BattleFlamingSphereDamageRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-hole-family | `BattleSpellHealingRollHole` | `rolledDice` | semantic-frontier | `BATTLE.SPELL.HIT_POINT_RESTORATION`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-hole-family | `BattleHitPointHealingPoolDistributionHole` | `hitPointHealingDistribution` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-hole-family | `BattleSpellSkillChoiceHole` | `skillChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | _none_ |
| battle-hole-family | `BattleSpellAbilityChoiceHole` | `abilityChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | _none_ |
| battle-hole-family | `BattleSpellTargetAbilityChoicesHole` | `targetAbilityChoices` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | _none_ |
| battle-hole-family | `BattleSpellConditionChoiceHole` | `conditionChoice` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | _none_ |
| battle-hole-family | `BattleThaumaturgyActiveOneMinuteEffectCountHole` | `thaumaturgyActiveOneMinuteEffectCount` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleCommandOptionChoiceHole` | `commandOptionChoice` | semantic-frontier | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-hole-family | `BattleDancingLightsPlacementHole` | `dancingLightsPlacement` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSpellSavingThrowOutcomeHole` | `savingThrowOutcome` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | _none_ |
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
| battle-hole-family | `BattleStatBlockRechargeRollHole` | `statBlockRechargeRoll` | semantic-frontier | `BATTLE.STAT_BLOCK.ATTACK_CONTROL`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-hole-family | `BattleConcentrationSavingThrowHole` | `concentrationSavingThrow` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-hole-family | `BattleInterruptDecisionHole` | `interruptDecision` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-hole-family | `BattleMovementHole` | `movement` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleAbilityCheckHole` | `abilityCheck` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-hole-family | `BattleGrappleOutcomeHole` | `grappleOutcome` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | _none_ |
| battle-hole-family | `BattleShoveOutcomeHole` | `shoveOutcome` | semantic-frontier | `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-hole-family | `BattleSanctuaryInterdictionOutcomeHole` | `sanctuaryInterdictionOutcome` | semantic-frontier | `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | _none_ |
| battle-hole-family | `BattleAttackDamageDispositionHole` | `attackDamageDisposition` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-fill-kind | `attackRoll` | `attackRoll` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.STAT_BLOCK.ATTACK_CONTROL`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-fill-kind | `rolledDice` | `rolledDice` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.HIT_POINT_RESTORATION`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | _none_ |
| battle-fill-kind | `hitPointHealingDistribution` | `hitPointHealingDistribution` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-fill-kind | `damageTypeChoice` | `damageTypeChoice` | semantic-frontier | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | _none_ |
| battle-fill-kind | `savingThrowOutcome` | `savingThrowOutcome` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`, `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`, `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | _none_ |
| battle-fill-kind | `conditionChoice` | `conditionChoice` | semantic-frontier | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | _none_ |
| battle-fill-kind | `skillChoice` | `skillChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | _none_ |
| battle-fill-kind | `abilityChoice` | `abilityChoice` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | _none_ |
| battle-fill-kind | `targetAbilityChoices` | `targetAbilityChoices` | semantic-frontier | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | _none_ |
| battle-fill-kind | `thaumaturgyActiveOneMinuteEffectCount` | `thaumaturgyActiveOneMinuteEffectCount` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `commandOptionChoice` | `commandOptionChoice` | semantic-frontier | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
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
| battle-fill-kind | `statBlockRechargeRoll` | `statBlockRechargeRoll` | semantic-frontier | `BATTLE.STAT_BLOCK.ATTACK_CONTROL`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | _none_ |
| battle-fill-kind | `concentrationSavingThrow` | `concentrationSavingThrow` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-fill-kind | `attackDamageDisposition` | `attackDamageDisposition` | semantic-frontier | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | _none_ |
| battle-fill-kind | `sanctuaryInterdictionOutcome` | `sanctuaryInterdictionOutcome` | semantic-frontier | `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | _none_ |
| battle-fill-kind | `interruptDecision` | `interruptDecision` | semantic-frontier | `BATTLE.REACTION.OFFER_DECLINE_RESUME` | _none_ |
| battle-fill-kind | `movement` | `movement` | semantic-frontier | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
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
| battle-fill-kind | `findFamiliarConnection` | `findFamiliarConnection` | table-owned-fact | `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `companionReappearancePlacement` | `companionReappearancePlacement` | table-owned-fact | `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `companionReappearanceInitiative` | `companionReappearanceInitiative` | semantic-frontier | `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE` | _none_ |
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
| battle-hole-family | `BattleWildShapeEquipmentDispositionHole` | `wildShapeEquipmentDisposition` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-fill-kind | `wildShapeEquipmentDisposition` | `wildShapeEquipmentDisposition` | semantic-frontier | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` | _none_ |
| battle-subject-kind | `actionAttack` | `actionAttack` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionMovement` | `actionMovement` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionAvoidance` | `actionAvoidance` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionSupport` | `actionSupport` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionExploration` | `actionExploration` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionReady` | `actionReady` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionContest` | `actionContest` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionConditionIntervention` | `actionConditionIntervention` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `companionAttack` | `companionAttack` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `bonusActionAttack` | `bonusActionAttack` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `bonusActionGrantedStandardAction` | `bonusActionGrantedStandardAction` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `featureOption` | `featureOption` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `featureAttack` | `featureAttack` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `actionMagic` | `actionMagic` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `bonusActionMagic` | `bonusActionMagic` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `spellGrantedMovement` | `spellGrantedMovement` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `featureActivation` | `featureActivation` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `featureWeaponActivation` | `featureWeaponActivation` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `formTransformation` | `formTransformation` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `companionLifecycle` | `companionLifecycle` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `companionSenses` | `companionSenses` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `companionDeliveredMagic` | `companionDeliveredMagic` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeTurnBoundary` | `runtimeTurnBoundary` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeMovement` | `runtimeMovement` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeReadiedResponse` | `runtimeReadiedResponse` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeReaction` | `runtimeReaction` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeLinkRelease` | `runtimeLinkRelease` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeSavingThrow` | `runtimeSavingThrow` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeEffectCleanup` | `runtimeEffectCleanup` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeEffectControl` | `runtimeEffectControl` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeHeldObjectRelease` | `runtimeHeldObjectRelease` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeProtectionSave` | `runtimeProtectionSave` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeTransformationMode` | `runtimeTransformationMode` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeCompelledAction` | `runtimeCompelledAction` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeAltitudeControl` | `runtimeAltitudeControl` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |
| battle-subject-kind | `runtimeAreaEffect` | `runtimeAreaEffect` | semantic-frontier | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | _none_ |

## QNT Owner Roles

| Owner | Role | Obligations / profile-scoped rows |
| --- | --- | --- |
| `packages/battle-runtime/battle-runtime-chained-spell-attack.qnt` | semantic-core | `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` |
| `packages/battle-runtime/battle-runtime-area-trigger-timing.qnt` | semantic-core | `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE`, `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE`, `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE`, `BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-antimagic-suppression.qnt` | semantic-core | `BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION` |
| `packages/battle-runtime/battle-runtime-antimagic-field-action-interdiction.mbt.qnt` | mbt-fixture | `BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION` |
| `packages/battle-runtime/battle-runtime-antimagic-field-magical-effect-interdiction.mbt.qnt` | mbt-fixture | `BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION` |
| `packages/battle-runtime/battle-runtime-bardic-inspiration.qnt` | proof-only | profile-scoped: `unit-feature.bardic-inspiration-failed-d20-test` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.bardic-inspiration-grant` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-slow-fall.qnt` | proof-only | profile-scoped: `unit-feature.reaction-roll-or-damage-reduction` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-blur-attack-roll-defense.qnt` | semantic-core | `BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-command-choice.qnt` | semantic-core | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` |
| `packages/battle-runtime/battle-runtime-concentration.qnt` | semantic-core | `BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN`, `BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION`, `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-creature-size-change.qnt` | semantic-core | `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-dark-ones-blessing.mbt.qnt` | mbt-fixture | profile-scoped: `unit-feature.enemy-zero-hit-point-temporary-hit-points` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-disciple-of-life.mbt.qnt` | mbt-fixture | profile-scoped: `unit-feature.spell-slot-healing-modifier` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-preserve-life.mbt.qnt` | mbt-fixture | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-creature-type-protection.qnt` | semantic-core | `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` |
| `packages/battle-runtime/battle-runtime-damage-adjustments.qnt` | semantic-core | `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` |
| `packages/battle-runtime/battle-runtime-direct-condition-lifecycle.qnt` | semantic-core | `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-direct-condition-removal.qnt` | semantic-core | `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` |
| `packages/battle-runtime/battle-runtime-flaming-sphere-hazard-ram.qnt` | semantic-core | `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-feather-fall.qnt` | semantic-core | `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-feature-turn-end-effects.qnt` | semantic-core | `BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING`<br>profile-scoped: `unit-feature.attack-action-attack-count-scaling` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-ground-command-tests.qnt` | mbt-fixture | `BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD` |
| `packages/battle-runtime/battle-runtime-rogue-steady-aim.mbt.qnt` | mbt-fixture | profile-scoped: `unit-feature.rogue-steady-aim` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-ground-command.qnt` | semantic-core | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE`, `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE`, `BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE`, `BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-gust-of-wind.qnt` | semantic-core | `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-hit-points.qnt` | semantic-core | `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE`, `BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION`, `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-jump-movement.qnt` | semantic-core | `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-light.qnt` | semantic-core | `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE`, `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING`, `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE`, `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE`, `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` |
| `packages/battle-runtime/battle-runtime-levitate-creature.qnt` | semantic-core | `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-marked-riders.qnt` | semantic-core | `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` |
| `packages/battle-runtime/battle-runtime-marked-spells.qnt` | semantic-core | `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` |
| `packages/battle-runtime/battle-runtime-metamagic.qnt` | semantic-core | `BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION`, `BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE`, `BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL`, `BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION`, `BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE`, `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`, `BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL`, `BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION`, `BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION`, `BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core.qnt` | semantic-core | `BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION`, `BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE`, `BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL`, `BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION`, `BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE`, `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`, `BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL`, `BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION`, `BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION`, `BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core.qnt` | semantic-core | `BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION`, `BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE`, `BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL`, `BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION`, `BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE`, `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`, `BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL`, `BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION`, `BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION`, `BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core.qnt` | semantic-core | `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` |
| `packages/battle-runtime/battle-runtime-mirror-image.qnt` | semantic-core | `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` |
| `packages/battle-runtime/battle-runtime-monk-focus.qnt` | semantic-core | profile-scoped: `unit-feature.monk-focus-battle-options` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-open-hand-technique.qnt` | semantic-core | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-open-hand-technique.mbt.qnt` | mbt-fixture | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.qnt` | semantic-core | `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-movement.qnt` | semantic-core | `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE`, `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE`<br>profile-scoped: `unit-feature.bonus-action-dash-temporary-hit-points` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-object-contact-damage.qnt` | semantic-core | `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING`, `BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-ongoing-spell-dispel.qnt` | semantic-core | `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING` |
| `packages/battle-runtime/battle-runtime-protection-from-poison.qnt` | semantic-core | `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` |
| `packages/battle-runtime/battle-runtime-reaction-window.qnt` | semantic-core | `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY`, `BATTLE.REACTION.OFFER_DECLINE_RESUME`, `BATTLE.SPELL.REACTION_CASTING_TIME` |
| `packages/battle-runtime/battle-runtime-reaction-resolution.qnt` | semantic-core | `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY` |
| `packages/battle-runtime/battle-runtime-replay-equivalence.qnt` | semantic-core | `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY` |
| `packages/battle-runtime/battle-runtime-remarkable-athlete-critical-movement.qnt` | proof-only | profile-scoped: `unit-feature.remarkable-athlete` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-remarkable-athlete-roll-modes.qnt` | proof-only | profile-scoped: `unit-feature.remarkable-athlete` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-paladin-sacred-weapon-activation.qnt` | proof-only | profile-scoped: `unit-feature.paladin-sacred-weapon` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt` | semantic-core | `BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION`, `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-ability-check-search.qnt` | semantic-core | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` |
| `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt` | semantic-core | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-sanctuary.qnt` | semantic-core | `BATTLE.SANCTUARY.TARGETING_INTERDICTION`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-save-gated-spell.qnt` | semantic-core | `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-see-invisibility.qnt` | semantic-core | `BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT` |
| `packages/battle-runtime/battle-runtime-self-teleport.qnt` | semantic-core | `BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-self-teleport-lifecycle.mbt.qnt` | mbt-fixture | `BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING` |
| `packages/battle-runtime/battle-runtime-self-transformation.qnt` | semantic-core | `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` |
| `packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt` | semantic-core | `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-spell-attack.qnt` | semantic-core | `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE`, `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` |
| `packages/battle-runtime/battle-runtime-spell-facts-tests.qnt` | mbt-fixture | `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY` |
| `packages/battle-runtime/battle-runtime-spell-invocation.qnt` | semantic-core | `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`, `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`, `BATTLE.SPELL.REACTION_CASTING_TIME`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` |
| `packages/battle-runtime/battle-runtime-spiritual-weapon.qnt` | proof-only | `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING` |
| `packages/battle-runtime/battle-runtime-thaumaturgy.qnt` | semantic-core | `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-timed-effects.qnt` | semantic-core | `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE`, `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE`<br>profile-scoped: `unit-feature.weapon-mastery-sap` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-turn-order.qnt` | proof-only | profile-scoped: `unit-feature.initiative-proficiency-and-swap` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-weapon-attacks.qnt` | semantic-core | `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`<br>profile-scoped: `unit-feature.weapon-mastery-cleave` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.weapon-mastery-sap` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.weapon-mastery-topple` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt` | semantic-core | `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`, `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` |
| `packages/battle-runtime/battle-runtime-dragons-breath.qnt` | semantic-core | `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION`, `BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE` |
| `packages/battle-runtime/battle-runtime-druid-wild-shape.qnt` | semantic-core | `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-find-familiar.qnt` | semantic-core | `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE` |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt` | mbt-fixture | `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS`, `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION` |
| `packages/character-battle-runtime/character-battle-settlement.mbt.qnt` | mbt-fixture | `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS`, `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` |
| `packages/shared-algebras/proofs/rule-core/feature-resource-pool.qnt` | semantic-core | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/feature-resource-hit-point-healing.qnt` | semantic-core | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/lay-on-hands-resource.qnt` | semantic-core | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/font-of-magic-resource.qnt` | semantic-core | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/uncanny-metabolism-resource.qnt` | semantic-core | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt` | mbt-fixture | `SHEET.FEATURE_RESOURCES.TRANSITIONS` |
| `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt` | mbt-fixture | `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION`, `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION` |
| `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION` |
| `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.CLASS_FEATURE_OPTION.PROJECTION` |
| `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT`, `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION` |
| `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION` |
| `packages/character-creation-runtime/character-creation-runtime-slice.qnt` | semantic-core | `CREATION.CHOICE_DISCOVERY_CARDINALITY`, `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` |
| `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE`, `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` |
| `packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt` | selected-identity-trace | `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` |
| `packages/shared-algebras/proofs/rule-core/ability-check-proficiency-bonus.qnt` | semantic-core | `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt` | mbt-fixture | `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` |
| `packages/shared-algebras/proofs/rule-core/armor-class-base.qnt` | semantic-core | `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt` | mbt-fixture | `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt` | selected-identity-trace | `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt` | mbt-fixture | `SHEET.HP_REST_HIT_DICE.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/hit-point-maximum.qnt` | semantic-core | `SHEET.HIT_POINTS.MAXIMUM_DERIVATION` |
| `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt` | mbt-fixture | `SHEET.HIT_POINTS.MAXIMUM_DERIVATION` |
| `packages/shared-algebras/proofs/rule-core/spell-rest-benefit-application.qnt` | semantic-core | `SHEET.SPELL_REST_BENEFIT.APPLICATION` |
| `packages/character-sheet-runtime/character-sheet-spell-rest-benefit-application.mbt.qnt` | mbt-fixture | `SHEET.SPELL_REST_BENEFIT.APPLICATION` |
| `packages/shared-algebras/proofs/rule-core/spell-slot-table.qnt` | semantic-core | `SHEET.SPELL_SLOTS.TABLE_DERIVATION` |
| `packages/shared-algebras/proofs/rule-core/spell-slot-transitions.qnt` | semantic-core | `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt` | mbt-fixture | `SHEET.SPELL_SLOTS.TABLE_DERIVATION`, `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/spellbook-ritual-access.qnt` | semantic-core | `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` |
| `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt` | selected-identity-trace | `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` |
| `packages/shared-algebras/proofs/rule-core/weapon-mastery-reselection.qnt` | semantic-core | `CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT`, `SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION`, `SHEET.WEAPON_MASTERY.RESELECTION` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt` | selected-identity-trace | `SHEET.WEAPON_MASTERY.RESELECTION` |
| `packages/battle-runtime/battle-runtime-weapon-attack-ordering.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/battle-runtime/battle-runtime-spell-attack-ordering.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/shared-algebras/proofs/death-saves-algebra-inductive.qnt` | proof-only | `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` |
| `packages/shared-algebras/proofs/rule-core/attack-damage-composition.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`, `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` |
| `packages/shared-algebras/proofs/rule-core/damage-component-adjustments.qnt` | semantic-core | `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` |
| `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt` | semantic-core | `SHARED.HIT_POINTS.POSITIVE_DAMAGE` |
| `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt` | semantic-core | `SHEET.HP_REST_HIT_DICE.TRANSITIONS` |
| `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt` | semantic-core | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`<br>profile-scoped: `unit-feature.creature-space-movement-permission` (`BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`) |
| `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt` | semantic-core | `BATTLE.REACTION.OFFER_DECLINE_RESUME`<br>profile-scoped: `unit-feature.reaction-roll-or-damage-reduction` (`BATTLE.REACTION.OFFER_DECLINE_RESUME`) |
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
| `packages/battle-runtime/battle-runtime-acid-arrow.qnt` | proof-only | `BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING` |
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
| `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` | semantic-core | profile-scoped: `unit-feature.alternate-action-cost` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.bonus-action-dash-temporary-hit-points` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.failed-ability-check-resource-boost` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.innate-sorcery-activation` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.self-bonus-action-healing` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`<br>profile-scoped: `unit-feature.action-surge-resource` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.attack-action-attack-count-scaling` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`<br>profile-scoped: `unit-feature.attack-damage-rider` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.bonus-action-ongoing-rage` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.first-attack-roll-reckless-advantage` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`<br>profile-scoped: `unit-feature.attack-damage-die-floor` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.attack-damage-rider` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.attack-roll-miss-to-hit-replacement` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.passive-ranged-attack-roll-bonus` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.weapon-critical-range-19` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.weapon-damage-dice-roll-choice` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core.qnt` | semantic-core | `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`<br>profile-scoped: `unit-feature.passive-ability-check-roll-mode` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.passive-saving-throw-roll-mode` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.save-damage-replacement` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`<br>profile-scoped: `unit-feature.attack-damage-reduction-zero-damage-redirect` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.reaction-roll-or-damage-reduction` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core.qnt` | semantic-core | profile-scoped: `unit-feature.passive-armor-class-bonus` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.passive-speed-bonus` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`), `unit-feature.passive-speed-kind-grants` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-martial-arts-core.qnt` | semantic-core | `BATTLE.DAMAGE.ATTACK_BRANCHES`<br>profile-scoped: `unit-feature.martial-arts-attack-projection` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-zero-hit-point-core.qnt` | semantic-core | `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`<br>profile-scoped: `unit-feature.zero-hit-point-replacement` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/battle-runtime/creature-attack.qnt` | semantic-core | `BATTLE.ATTACK.MINIMAL_RESOLUTION` |
| `packages/battle-runtime/battle-runtime-warding-bond-damage-sharing.qnt` | semantic-core | `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` |
| `packages/battle-runtime/battle-runtime-direct-condition-removal-tests.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-gust-of-wind-tests.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-levitate-creature-tests.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-metamagic-tests.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-monk-focus-tests.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-protection-from-poison-tests.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-self-transformation-tests.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/creature-attack.mbt.qnt` | mbt-fixture | _none_ |
| `packages/character-creation-runtime/character-creation-runtime-slice-tests.qnt` | mbt-fixture | _none_ |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt` | mbt-fixture | _none_ |
| `packages/shared-algebras/proofs/rule-core/attack-damage-composition-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/attack-damage-composition-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/damage-component-adjustments-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/damage-component-adjustments-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/hit-point-recovery-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/hit-point-recovery-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/shove-outcome-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/stat-block-controls-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/stat-block-controls-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-martial-arts-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles-inductive.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/unit-feature-zero-hit-point-core-examples.qnt` | proof-only | _none_ |
| `packages/battle-runtime/battle-runtime-hole-kinds.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` |
| `packages/battle-runtime/battle-runtime-fill-kinds.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` |
| `packages/battle-runtime/battle-runtime-subject-kinds.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/battle-runtime/battle-runtime-command-ordering.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.qnt` | semantic-core | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/battle-runtime/battle-runtime-condition-spell-resolution.qnt` | proof-only | `BATTLE.SANCTUARY.TARGETING_INTERDICTION`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-hunters-prey.qnt` | semantic-core | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-mirror-image-hit-interception.qnt` | semantic-core | `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` |
| `packages/battle-runtime/battle-runtime-prone-movement.qnt` | proof-only | `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-turn-advancement.qnt` | semantic-core | `BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING` |
| `packages/battle-runtime/battle-runtime-weapon-hit-turn-effects.qnt` | semantic-core | `BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING` |
| `packages/battle-runtime/battle-runtime-actor-combatants.qnt` | proof-only | `BATTLE.SANCTUARY.TARGETING_INTERDICTION`, `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-armor-class.qnt` | proof-only | `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-armor-spell-resolution.qnt` | proof-only | `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` |
| `packages/battle-runtime/battle-runtime-attack-facts.qnt` | proof-only | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/battle-runtime/battle-runtime-combat-holes.qnt` | proof-only | `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` |
| `packages/battle-runtime/battle-runtime-combatant-side.qnt` | proof-only | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-feature-bridge.qnt` | bridge | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-fighter-ongoing-features.qnt` | proof-only | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-hidden.qnt` | proof-only | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` |
| `packages/battle-runtime/battle-runtime-hide-search-fixture.qnt` | proof-only | `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` |
| `packages/battle-runtime/battle-runtime-interrupt-bridge.qnt` | bridge | `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY` |
| `packages/battle-runtime/battle-runtime-legendary-actions.qnt` | proof-only | `BATTLE.STAT_BLOCK.ATTACK_CONTROL` |
| `packages/battle-runtime/battle-runtime-movement-bridge.qnt` | bridge | `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` |
| `packages/battle-runtime/battle-runtime-shape-shifting.qnt` | proof-only | `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-spell-bridge.qnt` | bridge | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/battle-runtime/battle-runtime-stat-block-bridge.qnt` | bridge | `BATTLE.STAT_BLOCK.ATTACK_CONTROL` |
| `packages/battle-runtime/battle-runtime-warding-bond.qnt` | proof-only | `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` |
| `packages/shared-algebras/proofs/rule-core/action-turn-procedures.qnt` | proof-only | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/attack-action-additional-attacks.qnt` | proof-only | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/unit-feature-d20-test-natural-one-reroll-core.qnt` | semantic-core | profile-scoped: `unit-feature.d20-test-natural-one-reroll` (`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `packages/shared-algebras/proofs/rule-core/unit-feature-d20-test-natural-one-reroll-core-examples.qnt` | proof-only | _none_ |
| `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt` | proof-only | `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` |
| `packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt` | proof-only | `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt` | mbt-fixture | _none_ |
| `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt` | mbt-fixture | _none_ |

## QNT Registry

Rows here inventory `packages/**/*.qnt` files excluding `.mbt.qnt` drivers and `*-tests.qnt` files. Each row must be role-rowed or checker-exempt.

| Owner | Classification | Detail |
| --- | --- | --- |
| `packages/battle-runtime/battle-runtime-ability-check-search.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-acid-arrow.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-actor-combatants.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-antimagic-suppression.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-area-trigger-timing.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-armor-class.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-armor-spell-resolution.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-attack-facts.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-bardic-inspiration.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-blur-attack-roll-defense.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-chained-spell-attack.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-combat-holes.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-combatant-side.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-command-choice.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-command-ordering.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-concentration.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-condition-spell-resolution.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-creature-size-change.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-creature-type-protection.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-damage-adjustments.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-direct-condition-lifecycle.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-direct-condition-removal.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-dragons-breath.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-druid-wild-shape.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-feather-fall.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-feature-bridge-examples.qnt` | exempt | proof-only-example: Run-block examples for the feature bridge; registered rule-core and feature owners carry active coverage. |
| `packages/battle-runtime/battle-runtime-feature-bridge.qnt` | qnt-owner-role | bridge |
| `packages/battle-runtime/battle-runtime-feature-turn-end-effects.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-fighter-ongoing-features.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-fill-kinds.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-find-familiar.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-flaming-sphere-hazard-ram.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-ground-command.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-gust-of-wind.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-hidden.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-hide-search-fixture.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-hit-points.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-hole-kinds.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-hunters-prey.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-interrupt-bridge.qnt` | qnt-owner-role | bridge |
| `packages/battle-runtime/battle-runtime-jump-movement.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-legendary-actions.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-levitate-creature.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-light.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-marked-riders.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-marked-spells.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-metamagic.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-mirror-image-constants.qnt` | exempt | leaf-type-vocabulary: Mirror Image constants leaf imported by registered Mirror Image owners. |
| `packages/battle-runtime/battle-runtime-mirror-image-hit-interception.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-mirror-image.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-model.qnt` | exempt | leaf-type-vocabulary: Battle runtime type vocabulary aggregate intentionally kept free of behavioral bridge imports. |
| `packages/battle-runtime/battle-runtime-monk-focus.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-movement-bridge-examples.qnt` | exempt | proof-only-example: Run-block examples for the movement bridge; registered movement owners carry active coverage. |
| `packages/battle-runtime/battle-runtime-movement-bridge.qnt` | qnt-owner-role | bridge |
| `packages/battle-runtime/battle-runtime-movement.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-object-contact-damage.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-ongoing-spell-dispel.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-open-hand-technique.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-paladin-sacred-weapon-activation.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-prone-movement.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-protection-from-poison.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-public-trace-contract.qnt` | exempt | witness-protocol-leaf: Public trace protocol vocabulary leaf shared by witnesses. |
| `packages/battle-runtime/battle-runtime-reaction-kinds.qnt` | exempt | leaf-type-vocabulary: Reaction kind vocabulary leaf shared by the model and interrupt bridge. |
| `packages/battle-runtime/battle-runtime-reaction-resolution.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-reaction-window.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-remarkable-athlete-critical-movement.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-remarkable-athlete-roll-modes.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-replay-equivalence.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-sanctuary.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-save-gated-spell.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-see-invisibility-constants.qnt` | exempt | leaf-type-vocabulary: See Invisibility constants and witness-plane vocabulary leaf. |
| `packages/battle-runtime/battle-runtime-see-invisibility.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-self-teleport.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-self-transformation.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-shape-shifting.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-slow-fall.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-sorcerous-burst-damage-choice.qnt` | exempt | leaf-type-vocabulary: Sorcerous Burst damage-choice vocabulary leaf shared by the model and spell bridge. |
| `packages/battle-runtime/battle-runtime-spell-attack-ordering.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-spell-attack.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-spell-bridge-examples.qnt` | exempt | proof-only-example: Run-block examples for the spell bridge; registered spell rule-core and battle owners carry active coverage. |
| `packages/battle-runtime/battle-runtime-spell-bridge.qnt` | qnt-owner-role | bridge |
| `packages/battle-runtime/battle-runtime-spell-invocation.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-spiritual-weapon.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-stat-block-bridge-examples.qnt` | exempt | proof-only-example: Run-block examples for the stat-block bridge; registered stat-block owners carry active coverage. |
| `packages/battle-runtime/battle-runtime-stat-block-bridge.qnt` | qnt-owner-role | bridge |
| `packages/battle-runtime/battle-runtime-subject-kinds.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-thaumaturgy.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-timed-effects.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-turn-advancement.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-turn-order.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-warding-bond-damage-sharing.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-warding-bond.qnt` | qnt-owner-role | proof-only |
| `packages/battle-runtime/battle-runtime-weapon-attack-ordering.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-weapon-attacks.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-weapon-hit-turn-effects.qnt` | qnt-owner-role | semantic-core |
| `packages/battle-runtime/battle-runtime-witness-protocol.qnt` | exempt | witness-protocol-leaf: Typed witness protocol vocabulary leaf for lightweight battle-runtime MBT witnesses. |
| `packages/battle-runtime/creature-attack.qnt` | qnt-owner-role | semantic-core |
| `packages/character-creation-runtime/character-creation-runtime-slice.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/action-economy-algebra-inductive.qnt` | exempt | retired-test-companion: Retained shared-algebra inductive proof companion outside the active rules-kernel owner rows. |
| `packages/shared-algebras/proofs/conditions-algebra-inductive.qnt` | exempt | retired-test-companion: Retained shared-algebra inductive proof companion outside the active rules-kernel owner rows. |
| `packages/shared-algebras/proofs/death-saves-algebra-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/initiative-algebra-invariant.qnt` | exempt | retired-test-companion: Retained shared-algebra invariant companion outside the active rules-kernel owner rows. |
| `packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt` | exempt | retired-test-companion: Retained multiclass prerequisite proof companion outside the active rules-kernel owner rows. |
| `packages/shared-algebras/proofs/rule-core/ability-check-proficiency-bonus.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/action-turn-procedures-inductive.qnt` | exempt | proof-only-example: Inductive proof companion for registered action-turn procedure core owners. |
| `packages/shared-algebras/proofs/rule-core/action-turn-procedures.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/armor-class-base.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/attack-action-additional-attacks.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/attack-damage-composition-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/attack-damage-composition-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/attack-damage-composition.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/damage-component-adjustments-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/damage-component-adjustments-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/damage-component-adjustments.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/feature-resource-hit-point-healing.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/feature-resource-pool.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/font-of-magic-resource.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/hit-point-maximum.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/hit-point-recovery-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/hit-point-recovery-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/lay-on-hands-resource.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/shove-outcome-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/shove-outcome.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-attack-burst-save-damage-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-attack-damage-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-chained-attack-damage-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-damage-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-damage-rider-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-defensive-effect-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-definition-profiles.qnt` | exempt | leaf-type-vocabulary: Spell definition profile vocabulary imported by registered spell procedure owners. |
| `packages/shared-algebras/proofs/rule-core/spell-direct-damage-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-hit-point-restoration-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-independent-attack-sequence-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-invocation-action-slot-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-invocation-resource-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-object-hit-point-damage-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/spell-readied-spell-response-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-rest-benefit-application.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-save-condition-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-save-damage-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-save-gate.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-sleep-repeat-save-lifecycle-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-slot-expenditure.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-slot-table.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-slot-transitions.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spell-turn-hook-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/spellbook-ritual-access.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/stat-block-controls-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/stat-block-controls-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/stat-block-controls.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/uncanny-metabolism-resource.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-d20-test-natural-one-reroll-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-d20-test-natural-one-reroll-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-martial-arts-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-martial-arts-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles-inductive.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/unit-feature-zero-hit-point-core-examples.qnt` | qnt-owner-role | proof-only |
| `packages/shared-algebras/proofs/rule-core/unit-feature-zero-hit-point-core.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/weapon-mastery-reselection.qnt` | qnt-owner-role | semantic-core |
| `packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt` | exempt | proof-only-example: Inductive proof companion for registered zero-Hit-Point lifecycle owners. |
| `packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt` | qnt-owner-role | proof-only |

## Unit Feature Profile QNT Owners

Rows here are derived from `plans/unit-profile-coverage/profiles.jsonl` for profiles mapped to `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`. They report profile-scoped QNT owner evidence so the broad procedure obligation does not credit unrelated unit-feature profiles.

| Profile | QNT owners |
| --- | --- |
| `unit-feature.action-surge-resource` | `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.alternate-action-cost` | `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.attack-action-attack-count-scaling` | `packages/shared-algebras/proofs/rule-core/unit-feature-action-count-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`)<br>`packages/battle-runtime/battle-runtime-feature-turn-end-effects.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.attack-damage-die-floor` | `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.attack-damage-reduction-zero-damage-redirect` | `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.attack-damage-rider` | `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`)<br>`packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.attack-roll-miss-to-hit-replacement` | `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.bardic-inspiration-failed-d20-test` | `packages/battle-runtime/battle-runtime-bardic-inspiration.qnt` (proof-only; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.bardic-inspiration-grant` | `packages/battle-runtime/battle-runtime-bardic-inspiration.qnt` (proof-only; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.bonus-action-dash-temporary-hit-points` | `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`)<br>`packages/battle-runtime/battle-runtime-movement.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.bonus-action-ongoing-rage` | `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.creature-space-movement-permission` | `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt` (semantic-core; `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND`) |
| `unit-feature.d20-test-natural-one-reroll` | `packages/shared-algebras/proofs/rule-core/unit-feature-d20-test-natural-one-reroll-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.enemy-zero-hit-point-temporary-hit-points` | `packages/battle-runtime/battle-runtime-dark-ones-blessing.mbt.qnt` (mbt-fixture; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.failed-ability-check-resource-boost` | `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.first-attack-roll-reckless-advantage` | `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.initiative-proficiency-and-swap` | `packages/battle-runtime/battle-runtime-turn-order.qnt` (proof-only; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.innate-sorcery-activation` | `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.martial-arts-attack-projection` | `packages/shared-algebras/proofs/rule-core/unit-feature-martial-arts-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.monk-focus-battle-options` | `packages/battle-runtime/battle-runtime-monk-focus.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.paladin-sacred-weapon` | `packages/battle-runtime/battle-runtime-paladin-sacred-weapon-activation.qnt` (proof-only; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.passive-ability-check-roll-mode` | `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.passive-armor-class-bonus` | `packages/shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.passive-ranged-attack-roll-bonus` | `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.passive-saving-throw-roll-mode` | `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.passive-speed-bonus` | `packages/shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.passive-speed-kind-grants` | `packages/shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.reaction-roll-or-damage-reduction` | `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`)<br>`packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt` (semantic-core; `BATTLE.REACTION.OFFER_DECLINE_RESUME`)<br>`packages/battle-runtime/battle-runtime-slow-fall.qnt` (proof-only; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.remarkable-athlete` | `packages/battle-runtime/battle-runtime-remarkable-athlete-roll-modes.qnt` (proof-only; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`)<br>`packages/battle-runtime/battle-runtime-remarkable-athlete-critical-movement.qnt` (proof-only; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.rogue-steady-aim` | `packages/battle-runtime/battle-runtime-rogue-steady-aim.mbt.qnt` (mbt-fixture; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.save-damage-replacement` | `packages/shared-algebras/proofs/rule-core/unit-feature-save-damage-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.self-bonus-action-healing` | `packages/shared-algebras/proofs/rule-core/unit-feature-pool-cost-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.spell-slot-healing-modifier` | `packages/battle-runtime/battle-runtime-disciple-of-life.mbt.qnt` (mbt-fixture; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.weapon-critical-range-19` | `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.weapon-damage-dice-roll-choice` | `packages/shared-algebras/proofs/rule-core/unit-feature-attack-rider-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.weapon-mastery-cleave` | `packages/battle-runtime/battle-runtime-weapon-attacks.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.weapon-mastery-sap` | `packages/battle-runtime/battle-runtime-weapon-attacks.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`)<br>`packages/battle-runtime/battle-runtime-timed-effects.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.weapon-mastery-topple` | `packages/battle-runtime/battle-runtime-weapon-attacks.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |
| `unit-feature.zero-hit-point-replacement` | `packages/shared-algebras/proofs/rule-core/unit-feature-zero-hit-point-core.qnt` (semantic-core; `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`) |

## Generator Readiness

| Obligation | Status | Subset | Blockers | Follow-up |
| --- | --- | --- | --- | --- |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | generation-subset-clean | `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `implies`, `all-block` |  |  |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `range`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `map`, `set-operators`, `membership`, `list` |  |  |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` | generation-subset-clean | `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `comparison`, `pattern-match` |  |  |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership`, `size` |  |  |
| `BATTLE.SPELL.HIT_POINT_RESTORATION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match` |  |  |
| `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match` |  |  |
| `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `exists`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators` |  |  |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match` |  |  |
| `BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match` |  |  |
| `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators` |  |  |
| `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `set-operators` |  |  |
| `BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `list`, `filter`, `exists`, `set-operators` |  |  |
| `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match` |  |  |
| `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `list`, `map`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE` | generation-subset-clean | `import`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective` |  |  |
| `BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record-update`, `pure-def`, `constant-val`, `bool`, `let-binding`, `boolean-connective`, `pattern-match`, `set`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match` |  |  |
| `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `exists` |  |  |
| `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `map`, `fold`, `set-operators` |  |  |
| `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `list`, `filter`, `exists`, `forall`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` | generation-subset-clean | `import`, `variant`, `pure-def`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `list`, `filter`, `exists`, `forall`, `map`, `fold`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists`, `set-operators` |  |  |
| `BATTLE.SPELL.REACTION_CASTING_TIME` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `list`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `map`, `fold`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `map`, `fold`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `map`, `fold`, `set-operators` |  |  |
| `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `map`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `filter`, `fold`, `exists` |  |  |
| `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING` | generation-subset-clean | `import`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective` |  |  |
| `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `map`, `fold`, `set-operators` |  |  |
| `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `map`, `fold` |  |  |
| `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `set-operators`, `membership` |  |  |
| `BATTLE.DAMAGE.ATTACK_BRANCHES` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership` |  |  |
| `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `membership`, `list`, `fold`, `map`, `exists` |  |  |
| `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match` |  |  |
| `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists` |  |  |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | generation-subset-clean | `variant`, `record`, `record-update`, `pure-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `list`, `fold`, `set-operators`, `membership` |  |  |
| `CREATION.CHOICE_DISCOVERY_CARDINALITY` | generation-subset-clean | `variant`, `record`, `record-update`, `pure-def`, `constant-val`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `list`, `fold`, `set-operators`, `membership` |  |  |
| `SHEET.HP_REST_HIT_DICE.TRANSITIONS` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `implies`, `all-block` |  |  |
| `SHEET.HIT_POINTS.MAXIMUM_DERIVATION` | generation-subset-clean | `import`, `record`, `pure-def`, `int`, `bool`, `list`, `fold`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block` |  |  |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `list`, `fold`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match` |  |  |
| `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `arithmetic`, `pattern-match` |  |  |
| `SHEET.SPELL_REST_BENEFIT.APPLICATION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `list`, `fold`, `if-expression`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match` |  |  |
| `SHEET.FEATURE_RESOURCES.TRANSITIONS` | generation-subset-clean | `import`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block` |  |  |
| `SHEET.WEAPON_MASTERY.RESELECTION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `arithmetic`, `boolean-connective`, `all-block`, `pattern-match`, `list`, `set`, `fold`, `set-operators`, `membership`, `size` |  |  |
| `SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `arithmetic`, `boolean-connective`, `all-block`, `pattern-match`, `list`, `set`, `fold`, `set-operators`, `membership`, `size` |  |  |
| `CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `comparison`, `arithmetic`, `boolean-connective`, `all-block`, `pattern-match`, `list`, `set`, `fold`, `set-operators`, `membership`, `size` |  |  |
| `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-val`, `int`, `bool`, `if-expression`, `comparison`, `boolean-connective`, `all-block`, `pattern-match` |  |  |
| `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` | generation-subset-clean | `import`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block` |  |  |
| `SHEET.SPELL_SLOTS.TABLE_DERIVATION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `comparison`, `boolean-connective`, `all-block`, `pattern-match` |  |  |
| `BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.ATTACK.MINIMAL_RESOLUTION` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `arithmetic`, `boolean-connective`, `pattern-match` |  |  |
| `BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `set-operators`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `record-update` |  |  |
| `BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `pattern-match`, `set`, `set-operators`, `map`, `fold`, `forall`, `exists`, `membership`, `size`, `record-update` |  |  |
| `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` | generation-subset-clean | `variant` |  |  |
| `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` | generation-subset-clean | `import`, `variant`, `record`, `pure-def`, `bool`, `if-expression`, `comparison`, `pattern-match`, `set` |  |  |
| `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `map`, `set-operators`, `membership`, `list` |  |  |
| `BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `filter`, `exists`, `set-operators`, `membership` |  |  |
| `BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block`, `pattern-match`, `set`, `filter`, `set-operators`, `membership` |  |  |
| `BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION` | generation-subset-clean | `import`, `variant`, `record`, `record-update`, `pure-def`, `constant-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `all-block` |  |  |

### Generator Readiness Backlog

Rows here are derived from covered obligations with semantic-core QNT owners whose generator-readiness row is either omitted or still `not-assessed`.

No missing or not-assessed generator-readiness rows.

### Semantic-Core Run Block Findings

Rows here are derived from semantic-core QNT owners that still contain Quint `run` blocks. Assessed readiness rows must split those tests out or classify the generator blocker as `run-block-coupled`.

No semantic-core QNT owners contain run blocks.

## Kernel IR Boundaries

| Boundary | Obligations | Runtime Paths | Summary |
| --- | --- | --- | --- |
| command | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY`, `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/battle-subjects.ts` | Executable reducer commands are selected Battle subjects and command-option choices, not authored spell names. |
| fill | `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY`, `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`, `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY`, `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION`, `BATTLE.TABLE.HOLE_FACT_BOUNDARIES`, `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/battle-reducer/spells-resolve-fill-set.ts`, `packages/battle-runtime/src/battle-reducer/attack-fill-set.ts` | Caller, table, roll, choice, and result facts enter through typed hole/fill frontiers. |
| result | `BATTLE.REACTION.OFFER_DECLINE_RESUME`, `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY`, `SHEET.SPELL_REST_BENEFIT.APPLICATION` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/battle-reducer/result-helpers.ts`, `packages/character-creation-runtime/src/index.ts`, `packages/character-sheet-runtime/src/index.ts` | Reducer results distinguish resolved state, requested holes, and typed invalid outcomes. |
| state | `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, `SHEET.HP_REST_HIT_DICE.TRANSITIONS`, `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/character-creation-runtime/src/types.ts`, `packages/character-sheet-runtime/src/index.ts`, `packages/character-battle-runtime/src/battle-creature-init.ts` | Mutable reducer state remains runtime-owned and is projected from shared algebras, Surface records, and character-sheet facts. |
| active-effect | `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | `packages/battle-runtime/src/active-effect/types.ts`, `packages/battle-runtime/src/active-effect/lifecycle.ts`, `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts`, `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts` | Battle active effects are typed occurrence state with expiration and cleanup semantics. |
| support-profile | `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN`, `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`, `CREATION.CHOICE_DISCOVERY_CARDINALITY` | `packages/battle-runtime/src/unit-feature-support.ts`, `packages/battle-runtime/src/battle-reducer/spells-profiles.ts`, `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts`, `packages/character-creation-runtime/src/support-gates.ts`, `packages/character-battle-runtime/src/battle-support-profiles.ts` | Support profiles admit Surface records into executable procedure shapes before reducer execution. |
| resource | `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS`, `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`, `SHEET.FEATURE_RESOURCES.TRANSITIONS`, `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` | `packages/battle-runtime/src/battle-reducer.ts`, `packages/battle-runtime/src/character-battle-resources.ts`, `packages/battle-runtime/src/battle-reducer/spells-resolve-resources.ts`, `packages/character-sheet-runtime/src/index.ts`, `packages/character-battle-runtime/src/index.ts` | Resources are split by owner: turn economy in battle, spell/feature expenditure on sheet state, and battle-local resource snapshots during combat. |
| handoff | `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION`, `CHARACTER.BATTLE.HANDOFF.SETTLEMENT`, `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` | `packages/character-battle-runtime/src/index.ts`, `packages/character-battle-runtime/src/companion-handoff.ts`, `packages/character-battle-runtime/src/battle-creature-init.ts`, `packages/character-battle-runtime/src/battle-character-build-projection.ts`, `packages/character-battle-runtime/src/battle-support-profiles.ts` | Character-battle handoff projects state into battle and settles accepted battle-owned changes back to character sheet state. |

## Open Work

No open transitional obligations.

## Checker Issues

No checker issues.
