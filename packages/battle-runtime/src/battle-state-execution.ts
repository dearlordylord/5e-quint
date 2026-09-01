// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
import type { AttackPresentationJoinIssue } from "./attack-presentation-contract.ts";
import type {
  AbilityCheckRollModeSpellEffect,
  BrightRadiusIlluminationEmissionFacts,
  DimIlluminationEmissionFacts,
  BattleLightEmission,
  BattleLightEmitterOpaqueCoverInteraction,
  BattleImmediateAreaAudibleBoom,
  CantripSpellAttackSequenceTargeting,
  ConditionImmunityActiveEffectTemplate,
  CreatureTypeProtectionSpellTargeting,
  HealingSpellActionCost,
  HealingSpellTargeting,
  HeldLightHurlMechanicalFacts,
  MarkedDamageRiderCastAbilityCheckBehavior,
  PreparedSpellAttackSequenceTargeting,
  RollModifierSpellTargeting,
  ScalarBuffSpellEffect,
  ScalarBuffSpellTargeting,
  SpellAttackDamagePayload,
  SpellAttackDamageTargeting,
  SpellAttackMissDamage,
  SpellComponent,
  SpellFailedSaveConditionEffect,
  SpellFailedSaveConditionEffectBase,
  SpellFailedSaveConditionEndTurnSaveLifecycle,
  SpellFailedSaveConditionNoRepeatLifecycle,
  SpellFailedSavePostDamageRider,
  SpellObjectHitEffect,
  SpellPostDamageRider,
  SpellPostSaveAreaEffect,
  SpellSavingThrowRollModeRule,
  SpellTargetListTargeting,
} from "./procedure-execution/spell-execution-vocabulary.ts";
export type {
  AbilityCheckRollModeSpellEffect,
  BattleIlluminationEmissionFacts,
  BrightAndDimIlluminationEmissionFacts,
  BrightIlluminationEmissionFacts,
  BrightRadiusIlluminationEmissionFacts,
  DimIlluminationEmissionFacts,
  BattleLightEmission,
  BattleLightEmitterOpaqueCoverInteraction,
  BattleImmediateAreaAudibleBoom,
  CantripSpellAttackSequenceTargeting,
  ConditionImmunityActiveEffectTemplate,
  CreatureTypeProtectionSpellTargeting,
  HealingSpellActionCost,
  HealingSpellTargeting,
  HeldLightHurlMechanicalFacts,
  MarkedDamageRiderCastAbilityCheckBehavior,
  PreparedSpellAttackSequenceTargeting,
  RollModifierSpellTargeting,
  ScalarBuffSpellEffect,
  ScalarBuffSpellTargeting,
  SpellAttackDamagePayload,
  SpellAttackDamageTargeting,
  SpellAttackMissDamage,
  SpellComponent,
  SpellConditionCountedRepeatSave,
  SpellFailedSaveConditionChoiceEffect,
  SpellFailedSaveConditionEffect,
  SpellFailedSaveConditionEffectBase,
  SpellFailedSaveConditionEndTurnSaveLifecycle,
  SpellFailedSaveConditionExpiration,
  SpellFailedSaveConditionNoRepeatLifecycle,
  SpellFailedSaveFixedConditionEffect,
  SpellFailedSavePostDamageRider,
  SpellObjectHitEffect,
  SpellPostDamageRider,
  SpellPostSaveAreaEffect,
  SpellSavingThrowRollModeRule,
  SpellTargetListTargeting,
} from "./procedure-execution/spell-execution-vocabulary.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.retaliation-reaction-attack
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.initiative-proficiency-and-swap
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-ability-check-roll-mode
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.rogue-steady-aim
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-mirror-image-hit-interception
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-initial
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-granted-action
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-moonbeam-movable-zone
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-action-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-weapon-enhancement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-emanation
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hypnotic-pattern-control
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.creature-type-protection-and-charm spell.hit-point-restoration spell.invocation-after-hit-damage spell.invocation-after-hit-damage-illumination spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-blur-attack-roll-defense spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.invocation-condition-removal-protection spell.invocation-condition-save spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-dancing-lights-movable-dim-light spell.invocation-expeditious-retreat-dash spell.invocation-feather-fall-mitigation spell.invocation-fog-cloud-obscurement spell.invocation-forced-reaction-movement spell.invocation-grease-ground-hazard spell.invocation-held-light-emitter spell.invocation-hideous-laughter-repeat-save-lifecycle spell.invocation-independent-attack-sequence spell.invocation-jump-movement-replacement spell.invocation-make-stable spell.invocation-marked-damage-rider spell.invocation-object-light spell.invocation-roll-modifier spell.invocation-sanctuary-targeting-interdiction spell.invocation-save-gated-condition-immunity spell.invocation-see-invisible-observer-sight spell.invocation-self-ability-check-advantage spell.invocation-self-teleport spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-failed-d20-test unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.innate-sorcery-activation unit-feature.magic-action-save-gated-condition unit-feature.martial-arts-attack-projection unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.zero-hit-point-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition-removal
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.hide-action-obscurement-permission
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.fighter-tactical-master unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY BATTLE.SPELL.INVOCATION_RESOURCE_PROCEDURE BATTLE.SPELL.READIED_RESPONSE_PROCEDURE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
import type {
  ActionEconomyState,
  RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import type {
  ArmorClass,
  ArmorClassBaseSource,
  ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type {
  DeathSaveRuntimeState,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { InitiativeStack } from "@dnd/shared-algebras/initiative-algebra";
import type {
  HoleId,
  HoleInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import type { BattleDamageRelationshipQuestionId } from "./battle-reducer/damage-relationship-question-id.ts";
import {
  type AttackRollMode,
  type AttackRollResult,
  type RolledDiceGroup,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { type CreatureType } from "@dnd/shared/game-facts";
import {
  AbilityModifier,
  AttackBonus,
  DamageAmount,
  DieRollResult,
  DifficultyClass,
  Hp,
  MovementFeet,
  movementFeet,
  type Condition,
  type CoverType,
  type D6RollResult,
  type DamageDieSize,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
  type Round as RoundType,
} from "@dnd/shared/types";
import type { Language } from "@dnd/shared/game-facts";
import type {
  Ability,
  ClassName,
  DamageType,
  DcSource,
  DiceExpr,
  Size,
  Skill,
  SpellMechanics,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import type {
  BoundCharacterUnarmedStrikeActionOption,
  BoundCharacterWeaponAttackActionOption,
  BoundAttackExecutionSelection,
  CharacterAttackExecutionSelection,
  SupportedAttackActionOption,
} from "./battle-action-options.ts";

export type BattleSpellAdmissionSource = {
  readonly id: UnitId;
  readonly name: string;
  readonly mechanics: SpellMechanics;
  readonly castingSource:
    | {
        readonly tag: "classSpellcasting";
        readonly className: ClassName;
        readonly abilityModifier: AbilityModifier;
      }
    | {
        readonly tag: "spellAccess";
        readonly spellAccessRef: import("./identity.ts").BattleSpellAccessExecutionRef;
        readonly abilityModifier: AbilityModifier;
      };
  /**
   * Resource pool refs that can free-cast this spell through a class feature.
   * Populated at spell-admission time so reducer execution does not need to
   * dispatch on the spell's authored id.
   */
  readonly spellAccessFreeCastResourcePoolRefs: readonly BattleResourcePoolExecutionRef[];
};
import type {
  AttackDamageDieFloorChoiceFill,
  AttackDamageDieFloorChoiceProcedureRefs,
} from "./battle-reducer/attack-damage-die-floor-choice.ts";
import type {
  AttackDamageAbilityModifierChoice,
  AttackDamageAbilityModifierChoiceFill,
} from "./battle-reducer/attack-damage-ability-modifier-choice.ts";
import type {
  CharacterBattleD20Statistics,
  CharacterBattleInvocationFeature,
  BattleWalkSpeed,
  CharacterBattleLoadoutRef,
  HeldWeaponLoadoutSlot,
} from "./character-creature-execution-facts.ts";
import type { BattleDruidWildShapeKnownFormRuntime } from "./druid-wild-shape-known-form-runtime.ts";
import type { BattlePositiveHpUnconscious } from "./positive-hp-unconscious.ts";
import type { StatBlockBattleOrigin } from "./stat-block-combatant-execution-state.ts";
import type {
  BattleStatBlockExecutionSource,
  BattleStatBlockProjectionFailure,
  StatBlockExecutionAdmission,
  StatBlockExecutionSnapshot,
  StatBlockResourceGraphAdmissionFailure,
} from "./stat-block-execution-state.ts";
import type { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import type { BattleCompanionDurableId } from "./companion-state.ts";

export type BattleStatBlockExecutionCatalog = {
  readonly getStatBlock: (
    statBlockId: StatBlockId,
  ) => Option.Option<BattleStatBlockExecutionSource>;
};
import {
  type BattleInterruptTrigger,
  type BattleReadiedSpellTrigger,
} from "./battle-interrupt-triggers.ts";
import { Match, Option } from "effect";
import {
  type ActionHideSubject,
  type ActionSearchSubject,
  type BattleAttackExecutionSelection,
  type BattleInterruptAttackExecutionSelection,
  type BattleInterruptSubject,
  type BattleMovementSpeedKind,
  type BattleSubject,
  type BonusActionStandardActionSubject,
  type SpellInvocationRef,
  type MonkFocusFlurryOfBlowsStrikeSubject,
} from "./battle-subjects.ts";
import {
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattleMetamagicState,
  type CharacterBattleResourceState,
  type CharacterBattleSpellcastingExecutionState,
} from "./character-battle-resource-execution.ts";
import type {
  CharacterUnitProcedureSource,
  CharacterUnitProcedureExecution,
  CharacterExecutionState,
  CharacterProcedureBindingSnapshot,
  UnitFeatureProcedureExecution,
  UnitSupportProcedureExecution,
} from "./character-execution-vocabulary.ts";
import type {
  SpellExecutableExecutionOf,
  SpellProcedureInput,
  SpellProcedureExecution,
  RuntimeSpellProcedureExecution,
} from "./character-execution.ts";
import type {
  SpawnedCompanionLifecycleExecutionFacts,
  CreateSpatialMeleeSpellAttackProxySpellProcedureExecution,
  SpellRuleExecutionFactsOwner,
  StagedSaveConditionAutomaticSuccessPredicates,
  StagedSaveConditionEscapeAction,
  TemporaryAbilityCheckRollModeConcurrentDurationModeLimit,
  TemporaryAbilityCheckRollModeSelectedMode,
} from "./procedure-execution/spell-procedure-execution.ts";
import type {
  CantripSpellAccess,
  LeveledSpellInvocationResource,
  PreparedSpellAccess,
  SaveGatedConditionSpellTargeting,
  SaveGatedDamageSpellTargeting,
  SpellTargeting,
} from "./procedure-execution/spell-invocation-vocabulary.ts";
import type {
  BattleMagicSuppressionEmanationMembership,
  BattleMagicSuppressionOngoingSpellEffectRef,
  BattleCompelledBehaviorOption,
  BattleOngoingSpellEffectRef,
  BattleOngoingSpellOccurrenceRef,
  WeaponAttackDamageEnhancementBonus,
  SpellAttackKind,
  SpellConditionRepeatSave,
} from "./active-effect/execution-vocabulary.ts";
export {
  WEAPON_ATTACK_DAMAGE_ENHANCEMENT_BONUSES,
  type BattleMagicSuppressionEmanationMembership,
  type BattleMagicSuppressionOngoingSpellEffectRef,
  type BattleCompelledBehaviorOption,
  type BattleD20RollModifierDelta,
  type BattleMovableLight,
  type BattleMovableLightList,
  type BattleOngoingSpellEffectRef,
  type BattleOngoingSpellOccurrenceRef,
  type WeaponAttackDamageEnhancementBonus,
  type SpellAttackKind,
  type SpellConditionRepeatSave,
} from "./active-effect/execution-vocabulary.ts";
export type {
  LeveledSpellInvocationResource,
  PreparedSpellAccess,
  SaveGatedConditionSpellTargeting,
  SaveGatedDamageSpellTargeting,
  SpellAccessFreeCastInvocationResource,
  SpellSlotInvocationResource,
  SpellTargeting,
} from "./procedure-execution/spell-invocation-vocabulary.ts";
import type { CharacterBattleClassLevels } from "./character-class-level.ts";
import type {
  BattleCompanionPlacement,
  BattleCompanionSnapshot,
  BattleCompanions,
} from "./companion-state.ts";
import type { BattleReducerRouteEvents } from "./battle-reducer/reducer-route-protocol.ts";
import type { ZeroHpLifecycle } from "./zero-hp-lifecycle.ts";
import type { BattleActiveEffectSource } from "./active-effect/source.ts";
import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleEffectOccurrenceIdentity,
  BattleSpellEffectBase,
  BattleSpellActiveEffectTemplate,
  MarkedDamageRiderRetargetTiming,
  PersistentArmorSpellActiveEffect,
  SelfTransformationNaturalWeaponFacts,
  SpellCreatedHeldObjectActiveEffect,
  ControlledVerticalSuspensionActiveEffect,
  SpellObjectContactDamageActiveEffect,
  SpellMarkedDamageRider,
  SpellTurnEndDamage,
  SpellTurnStartDamage,
  SpellTurnStartDamageSave,
  SpatialMeleeSpellAttackProxyRepeatTargeting,
  TurnAnchoredBattleActiveEffectExpiration,
} from "./active-effect/types.ts";
import type {
  GlyphStoredSpellReleaseProfile,
  GlyphStoredSpellReleaseWitness,
} from "./glyph-durable-occurrence-execution-types.ts";
import { type DamageAmountByTypeEntry } from "./battle-reducer/damage-helpers.ts";
import type { BattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import type {
  WildShapeEquipmentDispositionFillValue,
  WildShapeLoadoutObjectRef,
} from "./battle-reducer/wild-shape-equipment.ts";
import {
  BATTLE_ATTACK_RANGE_BANDS,
  type PerceptionGatedAttackRollDefenseBypassSense,
  CRITICAL_HIT_THRESHOLDS,
  DIRECT_CONDITION_REMOVAL_CONDITIONS,
  MARKED_TARGET_FINDING_SKILLS,
  type DuplicateHitInterceptionDuplicateCount as DuplicateHitInterceptionCount,
  type DuplicateHitInterceptionUnaffectedSense as DuplicateHitInterceptionUnaffectedSense,
  OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  type OpenHandTechniqueDecisionChoice,
  type SelfTransformationModeKind,
  TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS as TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS,
  type BattleMagicSuppressionOngoingSpellEffectSourceKind as BattleMagicSuppressionOngoingSpellEffectSourceKind,
} from "./battle-reducer/domain-constants.ts";
import {
  BRUTAL_STRIKE_EFFECT_DECISION_CHOICES,
  type BrutalStrikeEffectDecisionChoice,
} from "./unit-feature-execution-constants.ts";
import type {
  KnockedOutConditionState,
  KnockedOutOneHp,
} from "./battle-reducer/knocked-out-state.ts";
import { spellDamageRerollUnsupportedIssue } from "./battle-reducer/spell-reroll-issues.ts";
import type {
  BattleEffectExecutionOrdinal,
  BattleEffectExecutionRef,
  BattleAreaId,
  BattleAttackExecutionScopeRef,
  BattleAttackProcedureExecutionRef,
  BattleCharacterExecutionScopeRef,
  BattleCompanionFormId,
  BattleMovableLightId,
  BattleExecutionScopeCursor,
  BattleLineDirectionId,
  BattleObjectId,
  BattleResourcePoolExecutionRef,
  BattleSpellEffectOccurrenceId,
  BattleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
  BattleTablePositionId,
  CharacterId,
  InitiativeScore,
} from "./identity.ts";
import {
  BattleId,
  BattleProcedureExecutionRef,
  BattleReplayStackDepth,
  CombatantId,
} from "./identity.ts";
import {
  type BattleCunningStrikeSupportProfile,
  CUNNING_STRIKE_SUPPORT_PROFILE,
  type BattlePassiveSpeedBonusSupportProfile,
  type BattlePassiveSpeedKindGrantsSupportProfile,
  type CunningStrikeEndTurnCoverDegree,
  type CunningStrikeOption,
  type CunningStrikeOptionSelectionId,
  TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
  type TacticalMasterReplacementDecision,
} from "./unit-feature-execution-constants.ts";
export {
  BATTLE_SPECIAL_SPEED_KINDS,
  type BattleSpecialSpeedKind,
} from "./battle-subjects.ts";
export type CriticalHitThreshold = (typeof CRITICAL_HIT_THRESHOLDS)[number];
export type BattlePassiveSpeedProfile =
  | BattlePassiveSpeedBonusSupportProfile
  | BattlePassiveSpeedKindGrantsSupportProfile;

export type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattlePossessionAttemptDisposition,
  BattleShapeShiftReplacementFormFacts,
  BattleSpellEffectEarlyEnd,
  BattleTurnAnchor,
  BattleUnitFeatureEffectBase,
  MarkedDamageRiderRetargetTiming,
  MarkedDamageRiderTransferState,
  ObjectContactPenaltyActiveEffect,
  CreatureTypeProtectionPreventedCondition,
  SelfTransformationModeEffectPayload,
  SelfTransformationNaturalWeaponFacts,
  SpellConditionAbilityCheckActor,
  SpellConditionAbilityCheckSuccessEnd,
  SpellConditionEscape,
  SpellCreatedHeldObjectActiveEffect,
  SpellCreatedHeldObjectState,
  ControlledVerticalSuspensionActiveEffect,
  SpellObjectContactDamageActiveEffect,
  SpellShapeShiftedFormActiveEffect,
  SpellTurnEndDamage,
  SpellTurnStartDamage,
  SpellTurnStartDamageSave,
  SpatialMeleeSpellAttackProxyRepeatTargeting,
} from "./active-effect/types.ts";

export type BattleConcentration = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectKind: "spellEffect" | "readiedSpell";
  readonly maintenanceSavingThrowRollMode?: Extract<
    AttackRollMode,
    "advantage"
  >;
};
export type BattleObjectOutline = BattleSpellEffectBase & {
  readonly kind: "saveGatedTargetProjectionObject";
  readonly objectId: BattleObjectId;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  >;
};
export type BattleLightEmitterAttachment =
  | {
      readonly kind: "combatant";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "object";
      readonly objectId: BattleObjectId;
    }
  | {
      readonly kind: "movableLight";
      readonly lightId: BattleMovableLightId;
      readonly positionId: BattleTablePositionId;
      readonly form: BattleMovableLightForm;
    };
type BattleSpellLightEmitterFacts = BattleActiveEffectSource & {
  readonly kind: "spellLightEmitter";
  readonly attachment: BattleLightEmitterAttachment;
  readonly emission: BattleLightEmission;
  readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
  readonly expiresAt: BattleActiveEffectExpiration;
};
type BattleTrackedOngoingSpellLightEmitterFacts = {
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
};
export type BattleTrackedOngoingSpellLightEmitterMechanicalFacts =
  BattleSpellLightEmitterFacts & BattleTrackedOngoingSpellLightEmitterFacts;
type BattleSpellLightEmitterVariantFacts =
  | BattleTrackedOngoingSpellLightEmitterFacts
  | {
      readonly sourceEffectId?: never;
      readonly sourceSpellLevel?: never;
    };
export type BattleProjectedSpellLightEmitter = BattleSpellLightEmitterFacts &
  BattleSpellLightEmitterVariantFacts & { readonly effectRef?: never };
export type BattleTrackedOngoingSpellLightEmitter =
  BattleTrackedOngoingSpellLightEmitterMechanicalFacts &
    BattleEffectOccurrenceIdentity;
export type BattleSpellLightEmitter = BattleSpellLightEmitterFacts &
  BattleSpellLightEmitterVariantFacts &
  BattleEffectOccurrenceIdentity;
export type BattleUnitFeatureLightEmitter = BattleActiveEffectSource & {
  readonly effectRef?: never;
  readonly kind: "unitFeatureLightEmitter";
  readonly attachment: BattleLightEmitterAttachment;
  readonly emission: BattleLightEmission;
  readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
  readonly expiresAt: BattleActiveEffectExpiration;
};
type BattleObjectInvisibleRevealLightEmitterFacts = BattleActiveEffectSource & {
  readonly kind: "objectInvisibleRevealLightEmitter";
  readonly objectId: BattleObjectId;
  readonly emission: Extract<BattleLightEmission, { readonly kind: "dim" }>;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "endOfTurn" }
  >;
};
export type BattleObjectInvisibleRevealLightEmitter =
  BattleObjectInvisibleRevealLightEmitterFacts & BattleEffectOccurrenceIdentity;
export type BattleStoredLightEmitter =
  | BattleSpellLightEmitter
  | BattleObjectInvisibleRevealLightEmitter;
export type BattleStoredLightEmitterTemplate =
  BattleStoredLightEmitter extends infer Emitter
    ? Emitter extends BattleStoredLightEmitter
      ? Omit<Emitter, "effectRef"> & { readonly effectRef?: never }
      : never
    : never;
export type BattleLightEmitterMechanicalFacts =
  | (BattleSpellLightEmitterFacts & BattleSpellLightEmitterVariantFacts)
  | BattleObjectInvisibleRevealLightEmitterFacts
  | (BattleActiveEffectSource & {
      readonly kind: "unitFeatureLightEmitter";
      readonly attachment: BattleLightEmitterAttachment;
      readonly emission: BattleLightEmission;
      readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
      readonly expiresAt: BattleActiveEffectExpiration;
    });
export type BattleLightEmitter =
  | BattleProjectedSpellLightEmitter
  | (BattleObjectInvisibleRevealLightEmitterFacts & {
      readonly effectRef?: never;
    })
  | BattleUnitFeatureLightEmitter;
export type BattleOngoingSpellTarget =
  | {
      readonly kind: "combatant";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "object";
      readonly objectId: BattleObjectId;
    }
  | {
      readonly kind: "magicalEffect";
      readonly effect: BattleOngoingSpellEffectRef;
    };
export type BattleOngoingSpellTargetWithinRangeFact = {
  readonly kind: "ongoingSpellTargetWithinRange";
  readonly casterId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly target: BattleOngoingSpellTarget;
  readonly rangeFeet: MovementFeet;
};
type BattleConcentrationOrDurationExpiration =
  | (Extract<
      BattleActiveEffectExpiration,
      { readonly kind: "concentration" }
    > & {
      readonly durationTicks: ElapsedTimeTicks;
    })
  | Extract<BattleActiveEffectExpiration, { readonly kind: "duration" }>;
export type BattleSpellObscurementZone = {
  readonly kind: "spellObscurementZone";
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly obscurement: Extract<
    BattleSightObscurement,
    "lightlyObscured" | "heavilyObscured"
  >;
  readonly area:
    | {
        readonly kind: "pointOriginSphere";
        readonly areaId: BattleAreaId;
        readonly radiusFeet: MovementFeet;
      }
    | {
        readonly kind: "pointOriginCube";
        readonly areaId: BattleAreaId;
        readonly sideFeet: MovementFeet;
      }
    | {
        readonly kind: "pointOriginCylinder";
        readonly areaId: BattleAreaId;
        readonly radiusFeet: MovementFeet;
        readonly heightFeet: MovementFeet;
      };
  readonly expiresAt: BattleConcentrationOrDurationExpiration;
};
export type BattleMagicalDarknessZone = {
  readonly kind: "spellMagicalDarknessZone";
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly area: {
    readonly kind: "pointOriginSphere";
    readonly areaId: BattleAreaId;
    readonly radiusFeet: MovementFeet;
  };
  readonly expiresAt: BattleConcentrationOrDurationExpiration;
};
export type BattleObscurementZone =
  | BattleSpellObscurementZone
  | BattleMagicalDarknessZone;
export type BattleMovableLightForm = "separateLights" | "combinedMediumForm";
export type BattleIllumination = "brightLight" | "dimLight" | "darkness";
export type BattleSightObscurement =
  | "unobscured"
  | "lightlyObscured"
  | "heavilyObscured";
export type BattleLightEmitterProjectionFact =
  | {
      readonly kind: "combatant";
      readonly combatantId: CombatantId;
      readonly distanceFeet: MovementFeet;
    }
  | {
      readonly kind: "object";
      readonly objectId: BattleObjectId;
      readonly distanceFeet: MovementFeet;
      readonly opaqueCover: boolean;
    }
  | {
      readonly kind: "movableLight";
      readonly lightId: BattleMovableLightId;
      readonly positionId: BattleTablePositionId;
      readonly form: BattleMovableLightForm;
      readonly distanceFeet: MovementFeet;
    };
export type BattleLightEmitterProjection = {
  readonly emitter: BattleLightEmitter;
  readonly illumination: Exclude<BattleIllumination, "darkness">;
};
export type BattleMagicalDarknessSightProjectionFact = {
  readonly kind: "sightThroughArea";
  readonly areaId: BattleAreaId;
};
export type BattleMagicalDarknessNonmagicalLightProjectionFact = {
  readonly kind: "nonmagicalLightInArea";
  readonly areaId: BattleAreaId;
};
export type BattleLightlyObscuredPerceptionRollMode = "disadvantage";
export type BattleSightObserver =
  | {
      readonly kind: "ordinarySight";
    }
  | {
      readonly kind: "darkvision";
      readonly rangeFeet: MovementFeet;
      readonly distanceFeet: MovementFeet;
    };
export type BattleSeeInvisibleObjectWitness = {
  readonly observerId: CombatantId;
  readonly objectHasInvisibleCondition: boolean;
  readonly hasSightLine: boolean;
  readonly blockedByOpaqueCover: boolean;
};
export type BattleSeeInvisibleEtherealWitness = {
  readonly observerId: CombatantId;
  readonly targetPlane: "material" | "ethereal";
  readonly hasSightLine: boolean;
  readonly blockedByOpaqueCover: boolean;
};
// SRD 5.2.1 Ready [Action]: this is the spell-specific Readied Response
// created by taking Ready with an action-time spell. The caster spends the
// spell's resources immediately, holds the energy with Concentration, and
// releases it later with a Reaction.
export type BattleReadiedSpell = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly trigger: BattleReadiedSpellTrigger;
  readonly expiresAt: TurnAnchoredBattleActiveEffectExpiration;
};
// SRD 5.2.1 Ready [Action]: the trigger is authored at the table rather than
// projected from an engine-event taxonomy. The response is selected when
// Ready is taken and may be released after the table reports that trigger.
export type BattleReadiedResponse = {
  readonly trigger: import("./battle-subjects.ts").ReadyTriggerDescription;
  readonly response: import("./battle-subjects.ts").BattleReadyResponse;
  readonly expiresAt: TurnAnchoredBattleActiveEffectExpiration;
};
// SRD 5.2.1 Help [Action], "Assist an Attack Roll": helper distracts an
// enemy within 5 feet, granting Advantage to one ally's next attack roll
// against that enemy; the benefit expires at the start of the helper's
// next turn. This runtime slice models that attack-roll branch only, not
// Help's ability-check branch or first-aid action summary.
export type BattleHelpAttack = {
  readonly helperId: CombatantId;
  readonly allyId: CombatantId;
  readonly targetEnemyId: CombatantId;
  readonly expiresAt: TurnAnchoredBattleActiveEffectExpiration;
};
export type GlyphStoredSpellReleaseReplayContext = {
  readonly profile: GlyphStoredSpellReleaseProfile;
  readonly witness: Omit<GlyphStoredSpellReleaseWitness, "fills">;
};
export type GlyphStoredSpellReleaseReplayInput = {
  readonly profile: GlyphStoredSpellReleaseProfile;
  readonly witness: GlyphStoredSpellReleaseWitness;
};
export type BattleAttackDamageCriticalConsequence =
  | {
      readonly kind: "ordinaryHit";
    }
  | {
      readonly kind: "criticalHit";
    };
export type BattleAttackDamageInterruptionContinuationFacts = {
  readonly concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[];
  readonly saveGatedConditionWithRepeatDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly damageDisposition: BattleAttackDamageDisposition;
  readonly attackDamageRiders: readonly AttackDamageRider[];
  readonly relationshipDecisions?: BattleDamageRelationshipDecisions;
  readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill;
  readonly cunningStrike?: BattleCunningStrikeDamageContinuation;
};
export type BattleAttackDamageInterruptionContinuation =
  | (BattleAttackDamageInterruptionContinuationFacts & {
      readonly kind: "damageOnly";
    })
  | (BattleAttackDamageInterruptionContinuationFacts & {
      readonly kind: "primaryAttackDamage";
      /**
       * Facts required to resume the primary attack's post-damage feature
       * sequence after an attack-damage interrupt closes. Participant and
       * first target remain on the enclosing frame and are intentionally not
       * copied here.
       */
      readonly attack: SupportedAttackActionOption;
      readonly fills: readonly BattleFill[];
    });
export type BattleAttackDamageInterruptionFrame = {
  readonly kind: "attackDamage";
  readonly participant: BattleAttackHostSubject;
  readonly target: {
    readonly combatantId: CombatantId;
    readonly spatialFacts: readonly BattleTargetSpatialFact[];
  };
  readonly attackResult: BattleAttackRollResult;
  readonly damageInput: BattleAttackDamageEvent;
  readonly criticalConsequence: BattleAttackDamageCriticalConsequence;
  readonly phase: "attackDamage";
  readonly continuation: BattleAttackDamageInterruptionContinuation;
};
export type BattleStartTurnOccurrenceSequenceCheckpoint = {
  readonly kind: "startTurnOccurrenceSequence";
  readonly sequence:
    | {
        readonly kind: "single";
        readonly occurrenceId: BattleStartTurnOccurrenceOption["occurrenceId"];
      }
    | {
        readonly kind: "ordered";
        readonly occurrenceIds: readonly [
          BattleStartTurnOccurrenceOption["occurrenceId"],
          BattleStartTurnOccurrenceOption["occurrenceId"],
          ...BattleStartTurnOccurrenceOption["occurrenceId"][],
        ];
      };
  readonly sourceTurn: {
    readonly actorId: CombatantId;
    readonly round: RoundType;
  };
  /** Exact child holes completed before the current occurrence; fill values live only in the replay procedure. */
  readonly completedPrefixHoleIds: readonly BattleHoleId[];
  readonly roundDurationCohort: {
    readonly activeEffectRefs: readonly BattleEffectExecutionRef[];
    readonly lightEmitterRefs: readonly BattleEffectExecutionRef[];
  };
  readonly child: {
    readonly kind: "persistentAreaTranslationSaveDamageSequence";
    readonly effectRef: BattleEffectExecutionRef;
    readonly targetId: CombatantId;
  };
};
export type BattleSpatialMeleeSpellAttackProxyCommitCheckpoint = {
  readonly kind: "spatialMeleeSpellAttackProxyCommitApplied";
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly operation: "createAndAttack" | "repositionAndAttack";
};
export type BattleInterruptedProcedure =
  | {
      readonly kind: "replay";
      readonly subject: BattleSubject;
      readonly fills: readonly BattleFill[];
      readonly parentPosition?: never;
      readonly glyphStoredSpellReleaseReplay?: never;
      readonly attackDamageReductions?: ReadonlyNonEmptyArray<BattlePendingAttackDamageReduction>;
      readonly attackDamageAdditions?: ReadonlyNonEmptyArray<AttackSpellDamageAddition>;
      readonly objectOutcomes?: BattleObjectOutcomeAccumulation;
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: BattleSpatialMeleeSpellAttackProxyCommitCheckpoint;
    }
  | {
      readonly kind: "replay";
      readonly subject: BattleSubject;
      readonly fills: readonly BattleFill[];
      readonly parentPosition: BattleStartTurnOccurrenceSequenceCheckpoint;
      readonly glyphStoredSpellReleaseReplay?: never;
      readonly attackDamageReductions?: never;
      readonly attackDamageAdditions?: never;
      readonly objectOutcomes?: BattleObjectOutcomeAccumulation;
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: never;
    }
  | {
      readonly kind: "replay";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
      readonly fills: readonly BattleFill[];
      readonly parentPosition?: never;
      readonly glyphStoredSpellReleaseReplay: GlyphStoredSpellReleaseReplayContext;
      readonly attackDamageReductions?: never;
      readonly attackDamageAdditions?: never;
      readonly objectOutcomes?: BattleObjectOutcomeAccumulation;
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: never;
    }
  | {
      readonly kind: "resolved";
      readonly subject: BattleSubject;
      readonly objectOutcomes?: BattleObjectOutcomeAccumulation;
    }
  | {
      readonly kind: "afterDamageSequence";
      readonly subject: BattleSubject;
      readonly events: readonly BattleAfterDamageEvent[];
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
      readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
    }
  | {
      readonly kind: "afterDamageSequenceWithPrimaryAttackFollowUp";
      readonly subject: BattleAttackHostSubject;
      readonly firstTargetId: CombatantId;
      readonly attack: SupportedAttackActionOption;
      readonly fills: readonly BattleFill[];
      readonly events: readonly BattleAfterDamageEvent[];
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
      readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
    }
  | {
      readonly kind: "weaponMasteryCleave";
      readonly subject: BattleAttackHostSubject;
      readonly firstTargetId: CombatantId;
      readonly attack: SupportedAttackActionOption;
      readonly fills: readonly BattleFill[];
    }
  | {
      readonly kind: "huntersPreyHordeBreaker";
      readonly subject: BattleAttackHostSubject;
      readonly firstTargetId: CombatantId;
      readonly attack: SupportedAttackActionOption;
      readonly fills: readonly BattleFill[];
    }
  | {
      readonly kind: "movement";
      readonly subject: BattleSubject;
      readonly movement: BattleResolvedMovement;
    }
  | {
      readonly kind: "movementThenAfterDamageSequence";
      readonly subject: BattleSubject;
      readonly movement: BattleResolvedMovement;
      readonly events: readonly BattleAfterDamageEvent[];
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
      readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
    }
  | BattleAttackDamageInterruptionFrame;
export type BattleAttackHostSubject =
  | Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    >
  | Extract<BattleSubject, { readonly tag: "companionAttack" }>
  | Extract<
      BattleSubject,
      { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
    >
  | Extract<
      BattleSubject,
      {
        readonly tag: "bonusAction";
        readonly action: "martialArtsUnarmedStrike";
      }
    >
  | MonkFocusFlurryOfBlowsStrikeSubject
  | Extract<BattleSubject, { readonly tag: "actionSpell" }>
  | Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    >
  | Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "releaseReadiedAttack";
      }
    >
  | Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "retaliationAttack" }
    >;
export type BattleCunningStrikeSelectedOption = {
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly sourceDamageRiderProcedureRef: BattleProcedureExecutionRef;
  readonly support: {
    readonly kind: typeof CUNNING_STRIKE_SUPPORT_PROFILE;
    readonly cunningStrike: {
      readonly trigger: {
        readonly kind: BattleCunningStrikeSupportProfile["cunningStrike"]["trigger"]["kind"];
        readonly damageRiderProcedureRef: BattleProcedureExecutionRef;
      };
      readonly choice: BattleCunningStrikeSupportProfile["cunningStrike"]["choice"];
      readonly effectSaveDc: BattleCunningStrikeSupportProfile["cunningStrike"]["effectSaveDc"];
      readonly options: BattleCunningStrikeSupportProfile["cunningStrike"]["options"];
    };
  };
  readonly option: CunningStrikeOption;
  readonly hiddenBeforeAttack: BattleCreatureState["hidden"];
};
export type BattleCunningStrikeContinuationFill =
  | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
  | Extract<BattleFill, { readonly kind: "movement" }>
  | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
  | Extract<BattleFill, { readonly kind: "cunningStrikeEndTurnCoverFacts" }>;
export type BattleCunningStrikeDamageContinuation = {
  readonly selected: BattleCunningStrikeSelectedOption;
  readonly fills: readonly BattleCunningStrikeContinuationFill[];
};
export type BattleAfterDamageEvent = {
  readonly damageSourceId: CombatantId;
  readonly damagedId: CombatantId;
  readonly damageAmount: DamageAmount;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
};
export type BattlePendingAttackDamageReduction = {
  readonly reactorId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly reduction: Extract<
    BattleReactionModifierChoice,
    { readonly kind: "attackDamageReduction" }
  >["reduction"];
  readonly reductionAmount: number;
  readonly zeroDamageRedirect?: AttackDamageReductionZeroDamageRedirectOffer;
};
export type AttackDamageReductionZeroDamageRedirectAvailableOffer = {
  readonly reactorId: CombatantId;
  readonly source: CharacterUnitProcedureSource;
  readonly execution: Extract<
    UnitFeatureProcedureExecution,
    { readonly kind: "reactionRollOrDamageReduction" }
  >;
  readonly redirect: AttackDamageReductionZeroDamageRedirectOffer;
};
export type BattleAttackKindForRedirect = "melee" | "ranged";
export type BattleAttackHitTriggerKind =
  | "meleeWeapon"
  | "rangedWeapon"
  | "unarmedStrike"
  | "otherAttack";
export type AttackDamageReductionRedirectTargetGate = NonNullable<
  Extract<
    Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "reactionRollOrDamageReduction" }
    >["modifiers"][number],
    {
      readonly kind: "attackDamageReduction";
      readonly zeroDamageRedirect: unknown;
    }
  >["zeroDamageRedirect"]
>["targetGate"];
export type AttackDamageReductionZeroDamageRedirectOffer = {
  readonly spends: BattleReactionResourceSpend;
  readonly saveAbility: "dex";
  readonly saveDc: DifficultyClass;
  readonly damageDice: {
    readonly dice: 2;
    readonly dieSize: DamageDieSize;
  };
  readonly attackKind: BattleAttackKindForRedirect;
  readonly targetGate: AttackDamageReductionRedirectTargetGate;
  readonly damageAbilityModifier: AbilityModifier;
  readonly originalDamageType: DamageType;
};
export type AttackDamageReductionZeroDamageRedirectSelection = {
  readonly targetId: CombatantId;
  readonly savingThrowSucceeded: boolean;
  readonly redirectedDamageRoll: number;
};
type BattleAttackDamageContinuation = Extract<
  BattleInterruptedProcedure,
  { readonly kind: "attackDamage" }
>;
export type BattleAttackDamageContinuationWithoutConcentration =
  BattleAttackDamageContinuation;
export type BattleReactionModifierChoice =
  | {
      readonly kind:
        | "attackRollReduction"
        | "abilityCheckReduction"
        | "damageRollReduction";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly reduction: BattleReactionRolledResourceReduction;
    }
  | {
      readonly kind: "attackDamageReduction";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly reduction:
        | { readonly kind: "halfDamage" }
        | {
            readonly kind: "rolled";
            readonly flatModifier: number;
            readonly dieSize: 10;
          };
      readonly zeroDamageRedirect?: {
        readonly spends: BattleReactionResourceSpend;
        readonly saveAbility: "dex";
        readonly saveDc: DifficultyClass;
        readonly damageDice: {
          readonly dice: 2;
          readonly dieSize: DamageDieSize;
        };
        readonly damageAbilityModifier: AbilityModifier;
        readonly attackKind: BattleAttackKindForRedirect;
        readonly targetGate: AttackDamageReductionRedirectTargetGate;
        readonly originalDamageType: DamageType;
      };
    }
  | {
      readonly kind: "fallDamageReduction";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly reduction: {
        readonly kind: "flat";
        readonly amount: DamageAmount;
      };
    };
export type BattleReactionResourceSpend = {
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  readonly amount: 1;
};
type BattleReactionRolledResourceReduction = {
  readonly kind: "rolled";
  readonly dice: 1;
  readonly dieSize: 6 | 8 | 10 | 12;
  readonly flatModifier: number;
  readonly spends: BattleReactionResourceSpend;
};
export type BattleAttackDamageEvent =
  | {
      readonly kind: "aggregateDamage";
      readonly damageByTypeBeforeTargetAdjustments: readonly DamageAmountByTypeEntry[];
    }
  | {
      readonly kind: "rolledDamage";
      readonly damageRollByType: readonly DamageAmountByTypeEntry[];
    };
export type BattleAttackDamageDisposition =
  | { readonly kind: "ordinaryDamage" }
  | { readonly kind: "knockOut" }
  | {
      readonly kind: "zeroHitPointReplacement";
      readonly procedureRef: BattleProcedureExecutionRef;
    };
export type BattleInterruptProcedureChoice =
  | {
      readonly kind: "nestedProcedure";
      readonly subject: BattleInterruptSubject;
      readonly initialHoles: readonly BattleHole[];
    }
  | {
      readonly kind: "reactionModifier";
      readonly responderId: CombatantId;
      readonly modifier: BattleReactionModifierChoice;
      readonly initialHoles: readonly BattleHole[];
    };

type BattleInterruptChoiceResponderInput =
  | {
      readonly kind: "nestedProcedure";
      readonly subject: BattleInterruptSubject;
    }
  | {
      readonly kind: "reactionModifier";
      readonly responderId: CombatantId;
    };

export function interruptChoiceResponderId(
  choice: BattleInterruptChoiceResponderInput,
): CombatantId {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: ({ subject }) =>
        Match.value(subject).pipe(
          Match.discriminatorsExhaustive("command")({
            releaseReadiedSpell: (value) => value.readiedSpellCasterId,
            releaseReadiedMovement: (value) => value.readiedMovementActorId,
            releaseReadiedAction: (value) => value.reactorId,
            releaseReadiedAttack: (value) => value.reactorId,
            castTriggeredReactionSpell: (value) => value.reactorId,
            castAttackHitBonusActionSpell: (value) => value.casterId,
            opportunityAttack: (value) => value.reactorId,
            retaliationAttack: (value) => value.reactorId,
          }),
        ),
      reactionModifier: ({ responderId }) => responderId,
    }),
  );
}

export type BattleInterruptProcedureModifierChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "reactionModifier" }
>;
export type BattleInterruptProcedureSelection = {
  readonly fills: readonly BattleFill[];
} & (
  | {
      readonly kind: "releaseReadiedSpell";
      readonly procedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "releaseReadiedMovement";
    }
  | {
      readonly kind: "releaseReadiedAction";
    }
  | {
      readonly kind: "releaseReadiedAttack";
      readonly procedureRef: BattleInterruptAttackExecutionSelection["procedureRef"];
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "castTriggeredReactionSpell";
      readonly procedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "castAttackHitBonusActionSpell";
      readonly procedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "opportunityAttack";
      readonly selection: BattleOpportunityAttackSelection;
    }
  | {
      readonly kind: "retaliationAttack";
      readonly selection: BattleInterruptAttackExecutionSelection;
    }
  | {
      readonly kind: "reactionRollOrDamageReduction";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly modifierKind: BattleReactionModifierChoice["kind"];
    }
);
type BattleActiveInterruptProcedure = {
  readonly responderId: CombatantId;
  readonly subject: BattleInterruptSubject;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptOccurrence?: BattleHandledInterruptOccurrence;
  readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: BattleSpatialMeleeSpellAttackProxyCommitCheckpoint;
  readonly pendingAttackDamageReductions?: ReadonlyNonEmptyArray<BattlePendingAttackDamageReduction>;
  readonly pendingAttackDamageAdditions?: ReadonlyNonEmptyArray<AttackSpellDamageAddition>;
};
type BattleInterruptCheckpointBase = {
  readonly eligibleResponders: readonly CombatantId[];
  readonly offeredResponders: readonly CombatantId[];
  readonly choices: readonly BattleInterruptProcedureChoice[];
  readonly activeInterrupt?: BattleActiveInterruptProcedure;
};
type BattleInterruptCheckpointWithContinuationBase =
  BattleInterruptCheckpointBase & {
    readonly continuation: BattleInterruptedProcedure;
  };
export type BattleInterruptCheckpoint =
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "attackHit";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly attackRoll: AttackRollResult;
      readonly attackKind: BattleAttackKindForRedirect;
      readonly attackHitTriggerKind: BattleAttackHitTriggerKind;
      readonly damageTypes: readonly DamageType[];
    })
  | (BattleInterruptCheckpointBase & {
      readonly trigger: "attackDamage";
      readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "spellCast";
      readonly casterId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly spellProcedure: SupportedSpellInvocation["procedure"];
      readonly castLevel: number;
      readonly components: readonly SpellComponent[];
      readonly castingResource: BattleSpellCastingTimeResource;
      readonly paymentCommitment: BattleSpellCastPaymentCommitment;
      readonly metamagicCommitment: BattleSpellCastMetamagicCommitment;
      readonly concentrationCommitment: BattleSpellCastConcentrationCommitment;
      readonly targetIds: readonly CombatantId[];
      readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "saveFailed";
      readonly targetId: CombatantId;
      readonly sourceProcedureRef?: BattleProcedureExecutionRef;
      readonly effectRef?: BattleEffectExecutionRef;
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "afterDamage";
      readonly damageSourceId: CombatantId;
      readonly damagedId: CombatantId;
      readonly damageAmount: DamageAmount;
      readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "creatureFalls";
      readonly fallingCreatureId: CombatantId;
      readonly reactionSpellTargetFacts: readonly BattleFallingCreatureMitigationTriggerFact[];
      readonly landingMitigations: readonly BattleFallDamageLandingMitigationFrame[];
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "opportunityAttack";
      readonly moverId: CombatantId;
      readonly threats: readonly BattleOpportunityAttackThreat[];
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "reportedReadyTrigger";
      readonly readiedActorId: CombatantId;
      readonly resumeSubjectResolutionPhase: BattleSubjectResolutionPhase;
    });
export type BattleAttackHitReplayCheckpoint = Extract<
  BattleInterruptCheckpoint,
  { readonly trigger: "attackHit" }
> & {
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    {
      readonly kind: "replay";
      readonly parentPosition?: never;
      readonly glyphStoredSpellReleaseReplay?: never;
    }
  >;
};
export type EndedFlySpeedGrant = Extract<
  BattleActiveEffect,
  { readonly kind: "specialSpeedGrant"; readonly speedKind: "fly" }
>;
export type BattleFlySpeedGrantEndFallCleanupFrame = {
  readonly kind: "grantedFlightEndFallCleanup";
  readonly targetId: CombatantId;
  readonly endedEffect: EndedFlySpeedGrant;
};
export type BattleFallDamageLandingMitigationFrame = {
  readonly kind: "fallDamageLandingMitigation";
  readonly targetId: CombatantId;
  readonly reductionAmount: DamageAmount;
};
export type BattleInterruptFrame =
  | {
      readonly kind: "interruptCheckpoint";
      readonly frame: BattleInterruptCheckpoint;
    }
  | BattleFlySpeedGrantEndFallCleanupFrame
  | BattleFallDamageLandingMitigationFrame
  | BattleReplayContinuationFrame
  | BattleAttackDamageContinuationConcentrationFrame
  | BattleAttackDamageContinuationRepeatSaveFrame
  | BattleAttackDamageContinuationCunningStrikeFrame;
export type BattleInterruptCheckpointFrame = Extract<
  BattleInterruptFrame,
  { readonly kind: "interruptCheckpoint" }
>;
export type BattleSpellCastingTimeResource =
  | { readonly kind: "magicAction" }
  | { readonly kind: "bonusAction" }
  | { readonly kind: "reaction" }
  | { readonly kind: "alreadySpent" };
export type SpellInvocationCastingTime =
  | { readonly kind: "action" }
  | { readonly kind: "bonusAction" }
  | { readonly kind: "reaction" };
export type BattleSpellCastPaymentCommitment =
  | { readonly kind: "none" }
  | { readonly kind: "pendingCasterSpellSlot" }
  | {
      readonly kind: "spellAccessFreeCast";
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    };
export type BattleSpellCastMetamagicCommitment =
  | { readonly kind: "none" }
  | {
      readonly kind: "applications";
      readonly applications: readonly [
        CharacterBattleMetamagicOptionFact,
        ...CharacterBattleMetamagicOptionFact[],
      ];
    };
export type BattleSpellCastConcentrationCommitment =
  | { readonly kind: "none" }
  | { readonly kind: "breakExisting" };
export type BattleHandledInterruptOccurrence =
  | {
      readonly trigger: "saveFailed";
      readonly targetId: CombatantId;
      readonly sourceProcedureRef?: BattleProcedureExecutionRef;
      readonly effectRef?: BattleEffectExecutionRef;
    }
  | {
      readonly trigger: "attackHit";
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: BattleSpatialMeleeSpellAttackProxyCommitCheckpoint;
    }
  | {
      [T in Exclude<BattleInterruptTrigger, "saveFailed" | "attackHit">]: {
        readonly trigger: T;
      };
    }[Exclude<BattleInterruptTrigger, "saveFailed" | "attackHit">];

export type BattleHandledInterruptRouteProjection =
  | {
      readonly handledInterruptOccurrence?: never;
    }
  | {
      readonly handledInterruptOccurrence: BattleHandledInterruptOccurrence;
    };

export type BattleReplayContinuationFrame = {
  readonly kind: "replayContinuation";
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
  readonly handledInterruptOccurrence: BattleHandledInterruptOccurrence;
};
export type BattleAttackDamageContinuationConcentrationFrame = {
  readonly kind: "attackDamageContinuationConcentration";
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly handledInterruptTrigger: BattleInterruptTrigger;
};
export type BattleAttackDamageContinuationRepeatSaveFrame = {
  readonly kind: "attackDamageContinuationRepeatSave";
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly handledInterruptTrigger: BattleInterruptTrigger;
};
export type BattleAttackDamageContinuationCunningStrikeFrame = {
  readonly kind: "attackDamageContinuationCunningStrike";
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly afterDamageEvent: BattleAfterDamageEvent;
  readonly handledInterruptTrigger: BattleInterruptTrigger;
};
export type BattleInterruptCheckpointInput =
  BattleInterruptCheckpoint extends infer T
    ? T extends BattleInterruptCheckpoint
      ? Omit<
          T,
          | "eligibleResponders"
          | "offeredResponders"
          | "choices"
          | "activeInterrupt"
        >
      : never
    : never;
export type BattleInterruptDecision =
  | {
      readonly kind: "decline";
      readonly responderId: CombatantId;
    }
  | {
      readonly kind: "resolve";
      readonly responderId: CombatantId;
      readonly choice: BattleInterruptProcedureSelection;
    };
export type AttackTargetConstraint =
  | { readonly kind: "meleeReach"; readonly reachFeet: MovementFeet }
  | {
      readonly kind: "rangedRange";
      readonly normalFeet: MovementFeet;
      readonly longFeet: MovementFeet;
    };
export type BattleAttackRangeBand = (typeof BATTLE_ATTACK_RANGE_BANDS)[number];
export type BattleHand = "left" | "right";
export type BattleGrappleLink = {
  readonly grapplerId: CombatantId;
  readonly targetId: CombatantId;
  readonly escapeDc: DifficultyClass;
  readonly reachFeet: MovementFeet;
  readonly hand: BattleHand;
};
export type BattleHiddenState = {
  readonly discoveryDc: DifficultyClass;
};
export type BattleHidePrerequisite =
  | {
      readonly kind: "heavilyObscuredOutOfEnemyLineOfSight";
    }
  | {
      readonly kind: "coverOutOfEnemyLineOfSight";
      readonly cover: "threeQuarters" | "total";
    }
  | {
      readonly kind: "obscuredOnlyByCreatureOutOfEnemyLineOfSight";
      readonly obscuringCreatureId: CombatantId;
    };
export type BattleMovementFillValueCommon = {
  readonly speedKind: BattleMovementSpeedKind;
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly acrobaticMovement?: BattleAcrobaticMovementFact;
  readonly areaDifficultTerrain?: BattleAreaDifficultTerrainMovementFact;
  readonly directionalPersistentAreaMovement?: BattleDirectionalPersistentAreaMovementFact;
  readonly grappleDrag?: BattleGrappleDragMovementFact;
  readonly creatureSpaceTraversal?: BattleCreatureSpaceTraversalMovementFact;
};
export type BattleOrdinaryMovementFillValue = BattleMovementFillValueCommon & {
  readonly fixedCostMovementReplacement?: BattleFixedCostMovementReplacementFact;
  readonly controlledVerticalSuspensionMovement?: BattleControlledVerticalSuspensionMovementFact;
  readonly compelledApproach?: BattleCompelledApproachMovementFact;
  readonly compelledFlee?: BattleCompelledFleeMovementFact;
  readonly brutalStrikeForcefulBlow?: never;
  readonly additionalSpeedSegments?: never;
};
export type BattleBrutalStrikeForcefulBlowMovementFillValue =
  BattleMovementFillValueCommon & {
    readonly fixedCostMovementReplacement?: never;
    readonly controlledVerticalSuspensionMovement?: never;
    readonly compelledApproach?: never;
    readonly compelledFlee?: never;
    // The first segment is represented by the common fields above. Later
    // segments make RAW switching between represented Speeds explicit without
    // duplicating the first segment or a derived total distance.
    readonly additionalSpeedSegments: readonly BattleMovementFillValueCommon[];
    readonly brutalStrikeForcefulBlow: BattleBrutalStrikeForcefulBlowMovementFact;
  };
export type BattleMovementFillValue =
  | BattleOrdinaryMovementFillValue
  | BattleBrutalStrikeForcefulBlowMovementFillValue;
export type BattleAcrobaticMovementPath =
  | "alongVerticalSurface"
  | "acrossLiquid";
export type BattleAcrobaticMovementFact = {
  readonly kind: "acrobaticMovement";
  readonly paths: readonly [
    BattleAcrobaticMovementPath,
    ...BattleAcrobaticMovementPath[],
  ];
  readonly withoutFallingDuringMovement: true;
};
export type BattleAreaDifficultTerrainSource =
  | {
      readonly kind: "persistentAreaSaveCondition";
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "persistentAreaSaveConditionEscape";
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "persistentAreaSaveComposite";
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "persistentAreaSaveDamage";
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "areaMovementDistanceDamage";
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
      readonly damageDistanceFeet: MovementFeet;
    };
export type BattleAreaDifficultTerrainMovementFact = {
  readonly kind: "areaDifficultTerrain";
  readonly sources: readonly BattleAreaDifficultTerrainSource[];
  readonly totalDistanceFeet: MovementFeet;
  readonly difficultTerrainDistanceFeet: MovementFeet;
};
export type BattleDirectionalPersistentAreaMovementFact = {
  readonly kind: "directionalPersistentAreaMovement";
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly areaId: BattleAreaId;
  readonly directionId: BattleLineDirectionId;
  readonly totalDistanceFeet: MovementFeet;
  readonly closerDistanceFeet: MovementFeet;
};
export type BattleGrappleDragMovementFact = {
  readonly kind: "grappleDrag";
  readonly totalDistanceFeet: MovementFeet;
  readonly targets: ReadonlyNonEmptyArray<{
    readonly targetId: CombatantId;
    readonly distanceFeet: MovementFeet;
  }>;
};
export type BattleCreatureSpaceTraversalMovementFact = {
  readonly kind: "occupiedCreatureSpaceTraversal";
  readonly occupiedSpaces: ReadonlyNonEmptyArray<{
    readonly occupantId: CombatantId;
    readonly positionId: BattleTablePositionId;
  }>;
  readonly destination:
    | {
        readonly kind: "unoccupiedSpace";
        readonly positionId: BattleTablePositionId;
      }
    | {
        readonly kind: "occupiedCreatureSpace";
        readonly occupantId: CombatantId;
        readonly positionId: BattleTablePositionId;
      };
};
export type BattleCompelledApproachMovementFact = {
  readonly kind: "compelledApproachShortestDirectRouteTowardSource";
  readonly movedWithinFiveFeetOfSource: boolean;
};
export type BattleCompelledFleeMovementFact = {
  readonly kind: "compelledFleeFastestAvailableRouteAwayFromSource";
};
export type BattleBrutalStrikeForcefulBlowMovementFact = {
  readonly kind: "brutalStrikeForcefulBlowStraightTowardTarget";
  readonly targetId: CombatantId;
};
export type BattleFixedCostMovementReplacementFact = {
  readonly kind: "fixedCostMovementReplacement";
  readonly distanceFeet: MovementFeet;
  readonly landing: BattleJumpLandingFact;
};
export type BattleVerticalSuspensionAltitudeDirection = "up" | "down";
export type BattleControlledVerticalSuspensionMovementFact = {
  readonly kind: "controlledVerticalSuspensionMovement";
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly fixedObjectOrSurfaceWithinReach: true;
  readonly altitudeChange?: {
    readonly direction: BattleVerticalSuspensionAltitudeDirection;
    readonly distanceFeet: MovementFeet;
  };
};
export type BattleJumpLandingFact =
  | {
      readonly kind: "legalLanding";
      readonly difficultTerrainAcrobatics: "notRequired";
    }
  | {
      readonly kind: "legalLanding";
      readonly difficultTerrainAcrobatics: "passed";
    }
  | {
      readonly kind: "legalLanding";
      readonly difficultTerrainAcrobatics: "failed";
    };
export type BattleTeleportDestination = {
  readonly kind: "unoccupiedVisibleDestination";
  readonly destinationId: BattleTablePositionId;
  readonly distanceFeet: MovementFeet;
};
export type BattleTeleportDestinationFact = BattleTeleportDestination & {
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly magicSuppressionTransit: readonly BattleMagicSuppressionTransitWitness[];
};
export type BattleSpatialMeleeSpellAttackProxyPosition = {
  readonly positionId: BattleTablePositionId;
} & (
  | {
      readonly mode: "cast";
      readonly distanceFromCasterFeet: MovementFeet;
    }
  | {
      readonly mode: "reposition";
      readonly moveDistanceFeet: MovementFeet;
    }
);
export type BattleOpportunityAttackSelection =
  BattleInterruptAttackExecutionSelection;
export type BattleOpportunityAttackThreat = {
  readonly reactorId: CombatantId;
  /** Distance at the reach-leaving trigger, before the mover's step. */
  readonly distanceFeet: MovementFeet;
} & BattleOpportunityAttackSelection;
export type BattleTargetSpatialFact =
  | {
      readonly kind: "attackObjectTarget";
      readonly actorId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly range:
        | { readonly kind: "meleeReach" }
        | {
            readonly kind: "rangedRange";
            readonly band: BattleAttackRangeBand;
            readonly enemyWithin5FeetCanSeeAttacker: boolean;
          };
      readonly attackerCanSeeObject: boolean;
      readonly cover: CoverType;
      readonly armorClass: ArmorClass;
      readonly damageDisposition: BattleObjectDamageDisposition;
    }
  | {
      readonly kind: "retaliationDamagerWithinFiveFeet";
      readonly damagedId: CombatantId;
      readonly damageSourceId: CombatantId;
    }
  | {
      readonly kind: "cleaveSecondTargetWithin5FeetOfFirstTarget";
      readonly attackerId: CombatantId;
      readonly firstTargetId: CombatantId;
      readonly secondTargetId: CombatantId;
    }
  | ({
      readonly kind: "weaponMasteryPushDisposition";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly disposition: BattleShovePushDisposition;
    } & CharacterAttackExecutionSelection)
  | ({
      readonly kind: "attackTargetDistance";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly distanceFeet: MovementFeet;
    } & BattleAttackExecutionSelection)
  | {
      readonly kind: "attackAttackerCannotSeeTarget";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "attackTargetCannotSeeAttacker";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "attackerPerceivesObscuredTargetWithSense";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly sense: PerceptionGatedAttackRollDefenseBypassSense;
    }
  | {
      readonly kind: "attackerUnaffectedByDuplicateHitInterceptionWithSense";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly sense: DuplicateHitInterceptionUnaffectedSense;
    }
  | {
      readonly kind: "spellTarget";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "unitFeatureVisibleTargetWithinRange";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "spawnedCompanionTouchSpellTarget";
      readonly ownerId: CombatantId;
      readonly familiarId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "spellTargetKnownWilling";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "heightenedStepOfTheWindCarryEligible";
      readonly carrierId: CombatantId;
      readonly carriedCreatureId: CombatantId;
    }
  | {
      readonly kind: "spatialMeleeSpellAttackProxyTargetWithinReach";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly forcePositionId: BattleTablePositionId;
      readonly reachFeet: MovementFeet;
    }
  | {
      readonly kind: "linkedEffectPairedWornComponents";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "linkedEffectCreaturesDistance";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly distanceFeet: MovementFeet;
    }
  | {
      readonly kind: "spellObjectTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
      readonly armorClass: ArmorClass;
      readonly damageDisposition: BattleObjectDamageDisposition;
    }
  | {
      readonly kind: "spellObjectIgnition";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly disposition: BattleObjectIgnitionDisposition;
    }
  | {
      readonly kind: "spellObjectTargetSight";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly attackerCanSeeObject: boolean;
    }
  | {
      readonly kind: "spellObjectLightTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly size: Size;
      readonly wornOrCarried:
        | { readonly kind: "nobody" }
        | { readonly kind: "caster" }
        | {
            readonly kind: "someoneElse";
            readonly relation: "worn" | "carried";
          };
    }
  | {
      readonly kind: "spellDistantObjectLightTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
      readonly size: Size;
      readonly wornOrCarried:
        | { readonly kind: "nobody" }
        | { readonly kind: "caster" }
        | {
            readonly kind: "someoneElse";
            readonly relation: "worn" | "carried";
          };
    }
  | {
      readonly kind: "spellTouchedObjectTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "spellDistantTouchedObjectTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "spellManufacturedMetalObjectTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
      readonly casterCanSeeObject: true;
    }
  | {
      readonly kind: "spellObjectPhysicalContact";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly objectId: BattleObjectId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "spellObjectWithinSpellRange";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly objectId: BattleObjectId;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "spellObjectHoldingOrWearing";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly objectId: BattleObjectId;
      readonly targetId: CombatantId;
      readonly relation: "holding" | "wearing";
    }
  | {
      readonly kind: "spellLeapTargetWithinRange";
      readonly previousTargetId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "spellTargetsInPointOriginSphere";
      readonly casterId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
      readonly radiusFeet: MovementFeet;
      readonly targetIds: readonly CombatantId[];
    }
  | {
      readonly kind: "helpAttackTargetWithin5Feet";
      readonly helperId: CombatantId;
      readonly targetEnemyId: CombatantId;
    }
  | {
      readonly kind: "meleeRedirectTargetWithin5Feet";
      readonly sourceId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "rangedRedirectTargetWithin60FeetWithoutTotalCover";
      readonly sourceId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "bardicInspirationTargetWithinRange";
      readonly bardId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "bardicInspirationTargetCanHear";
      readonly bardId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "reactionRollOrDamageReductionTargetWithinRange";
      readonly reactorId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "reactionSpellDamagerVisibleWithinRange";
      readonly reactorId: CombatantId;
      readonly damageSourceId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange";
      readonly beneficiaryId: CombatantId;
      readonly damageSourceId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "magicActionHealingPoolTargetWithinRange";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "magicActionAreaSaveDamageHealingTargetsInSphere";
      readonly actorId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly originWithinRangeFeet: MovementFeet;
      readonly radiusFeet: MovementFeet;
      readonly targetIds: readonly CombatantId[];
    }
  | {
      readonly kind: "fallingCreatureTargetWithinRange";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "controlledVerticalSuspensionTargetWithinRange";
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly targetId: CombatantId;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "spellCastInterruptionTriggerCasterVisibleWithinRange";
      readonly reactorId: CombatantId;
      readonly casterId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "grappleTargetWithinReach";
      readonly grapplerId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "shoveTargetWithinReach";
      readonly shoverId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "spellRestraintEscapeActorWithinTargetReach";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "stagedConditionShakeAwakeActorWithin5Feet";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "areaControlShakeAwakePhysicalReachability";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "attackerAllyWithin5FeetOfTarget";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly allyId: CombatantId;
    }
  | {
      readonly kind: "hordeBreakerSecondTargetEligible";
      readonly attackerId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly originalTargetId: CombatantId;
      readonly secondTargetId: CombatantId;
    };
export type BattleFallingCreatureMitigationTriggerFact = {
  readonly kind: "fallingCreatureMitigationTrigger";
  readonly reactorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly witness:
    | { readonly kind: "reactorFalls" }
    | {
        readonly kind: "visibleCreatureFalls";
        readonly fallingCreatureId: CombatantId;
        readonly distanceFeet: MovementFeet;
      };
};
export type BattleProcedureRelationshipFact =
  | {
      readonly kind: "attackRollTargetIsEnemy";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly targetIsEnemy: boolean;
    }
  | {
      readonly kind: "savingThrowTargetIsEnemy";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly targetIsEnemy: boolean;
    }
  | {
      readonly kind: "spellTargetIsHostileToCaster";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly targetIsHostileToCaster: boolean;
    };
export type BattleAttackRollRelationshipFact = Extract<
  BattleProcedureRelationshipFact,
  { readonly kind: "attackRollTargetIsEnemy" }
>;
export type BattleSavingThrowRelationshipFact = Extract<
  BattleProcedureRelationshipFact,
  { readonly kind: "savingThrowTargetIsEnemy" }
>;
export type BattleTargetChoiceRelationshipFact = Exclude<
  BattleProcedureRelationshipFact,
  { readonly kind: "spellTargetIsHostileToCaster" }
>;
export type BattleSpellTargetListRelationshipFact = Extract<
  BattleProcedureRelationshipFact,
  { readonly kind: "spellTargetIsHostileToCaster" }
>;
export type BattleTargetChoiceRelationshipFactRequest =
  | {
      readonly kind: "attackRollTargetIsEnemy";
      readonly attackerId: CombatantId;
    }
  | {
      readonly kind: "savingThrowTargetIsEnemy";
      readonly actorId: CombatantId;
    };
export type BattleAttackRollRelationshipFactRequest = {
  readonly kind: "attackRollTargetIsEnemy";
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
};
export type BattleSpellTargetListRelationshipFactRequest = {
  readonly kind: "spellTargetIsHostileToCaster";
  readonly casterId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};
export type BattleSavingThrowRelationshipFactRequest = {
  readonly kind: "savingThrowTargetIsEnemy";
  readonly actorId: CombatantId;
};
export type BattleSpellCastReactionFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellCastInterruptionTriggerCasterVisibleWithinRange" }
>;
export type BattleDamageRelationshipQuestionFacts =
  | {
      readonly kind: "targetDamagedByCasterOrAlly";
      readonly targetId: CombatantId;
      readonly effectSourceId: CombatantId;
    }
  | {
      readonly kind: "enemyZeroHitPointTemporaryHitPoints";
      readonly beneficiaryId: CombatantId;
      readonly targetId: CombatantId;
      readonly procedureRef: BattleProcedureExecutionRef;
    };
export type BattleDamageRelationshipQuestion =
  BattleDamageRelationshipQuestionFacts & {
    readonly questionId: BattleDamageRelationshipQuestionId;
  };
export type BattleDamageRelationshipDecision =
  | (Extract<
      BattleDamageRelationshipQuestionFacts,
      { readonly kind: "targetDamagedByCasterOrAlly" }
    > & { readonly sourceIsAlly: boolean })
  | (Extract<
      BattleDamageRelationshipQuestionFacts,
      { readonly kind: "enemyZeroHitPointTemporaryHitPoints" }
    > & { readonly targetIsEnemy: boolean });
export type BattleDamageRelationshipDecisions = readonly [
  BattleDamageRelationshipDecision,
  ...BattleDamageRelationshipDecision[],
];
export type BattleDamageRelationshipDecisionHole = {
  readonly holeInstanceKey: BattleHoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "damageRelationshipDecisions";
  readonly label: string;
  readonly damageEventHoleId: BattleHoleId;
  readonly damageSourceId: CombatantId;
  readonly questions: readonly [
    BattleDamageRelationshipQuestion,
    ...BattleDamageRelationshipQuestion[],
  ];
};
export type BattleDamageRelationshipAnswer = {
  readonly questionId: BattleDamageRelationshipQuestionId;
  readonly answer: boolean;
};
export type BattleDamageRelationshipDecisionFill = {
  readonly kind: "damageRelationshipDecisions";
  readonly holeId: BattleHoleId;
  readonly answers: readonly [
    BattleDamageRelationshipAnswer,
    ...BattleDamageRelationshipAnswer[],
  ];
};
export type BattleImmediateAreaPushDisposition =
  | {
      readonly kind: "pushed";
      readonly distanceFeet: MovementFeet;
      readonly destinationId: BattleTablePositionId;
      readonly provokesOpportunityAttacks: false;
    }
  | {
      readonly kind: "blocked";
      readonly distanceFeet: MovementFeet;
      readonly reason: "blocked" | "noLegalDestination";
      readonly provokesOpportunityAttacks: false;
    };
export type BattleImmediateAreaCreaturePushOutcome = {
  readonly targetId: CombatantId;
  readonly disposition: BattleImmediateAreaPushDisposition;
};
export type BattleImmediateAreaUnsecuredObjectPushOutcome = {
  readonly objectId: BattleObjectId;
  readonly disposition: BattleImmediateAreaPushDisposition;
};
export type BattleDirectionalPersistentAreaPushDisposition =
  | {
      readonly kind: "pushed";
      readonly distanceFeet: MovementFeet;
      readonly destinationId: BattleTablePositionId;
      readonly provokesOpportunityAttacks: false;
    }
  | {
      readonly kind: "blocked";
      readonly distanceFeet: MovementFeet;
      readonly reason: "blocked" | "noLegalDestination";
      readonly provokesOpportunityAttacks: false;
    };
export type BattleDirectionalPersistentAreaCreaturePushOutcome = {
  readonly targetId: CombatantId;
  readonly disposition: BattleDirectionalPersistentAreaPushDisposition;
};
export type BattleShovePushDisposition =
  | {
      readonly kind: "pushed";
      readonly distanceFeet: MovementFeet;
      readonly destinationId: BattleTablePositionId;
      readonly provokesOpportunityAttacks: false;
    }
  | {
      readonly kind: "blocked";
      readonly distanceFeet: MovementFeet;
      readonly reason: "blocked" | "noLegalDestination";
      readonly provokesOpportunityAttacks: false;
    };
export type BattleShovePushOutcome = {
  readonly targetId: CombatantId;
  readonly disposition: BattleShovePushDisposition;
};
export type BattleTeleportOutcome = {
  readonly kind: "selfTeleport";
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly destination: BattleTeleportDestination;
  readonly spendsMovement: false;
  readonly provokesOpportunityAttacks: false;
  readonly transportsWornAndCarriedEquipment: true;
};
export type BattleAbilityCheckSpatialFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellRestraintEscapeActorWithinTargetReach" }
>;
export type BattleResolvedMovement = {
  readonly moverId: CombatantId;
  readonly speedKind: BattleMovementSpeedKind;
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly spendsTurnMovement: boolean;
  readonly acrobaticMovement?: BattleAcrobaticMovementFact;
  readonly areaDifficultTerrain?: BattleAreaDifficultTerrainMovementFact;
  readonly grappleDrag?: BattleGrappleDragMovementFact;
  readonly creatureSpaceTraversal?: BattleCreatureSpaceTraversalMovementFact;
  readonly fixedCostMovementReplacement?: BattleFixedCostMovementReplacementFact;
  readonly controlledVerticalSuspensionMovement?: BattleControlledVerticalSuspensionMovementFact;
};
type ArmorOfShadowsSpellAccess = { readonly tag: "armorOfShadows" };
type SpellEffectSpellAccess = {
  readonly tag: "spellEffect";
  readonly sourceCombatantId: CombatantId;
};
type NoSpellInvocationResource = { readonly tag: "none" };
type PreparedLeveledSpellSource = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
};
type CantripDamageSpellSource = {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
};
export type PreparedDamageSpellSource = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
};
export type DamageSpellSource =
  | CantripDamageSpellSource
  | PreparedDamageSpellSource;
export type SpellActivationPhase = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "activation" }
>["phases"][number];
export type SpellAttackHitEffect = Extract<
  SpellActivationPhase,
  { readonly kind: "attack_roll" }
>["onHit"][number];
export type SaveGateFailureEffect = Extract<
  SpellActivationPhase,
  { readonly kind: "save_gate" }
>["onFail"];
export type BattlePersistentAreaTraitChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "persistentAreaTraitArea" }
>;
export type BattleMagicalDarknessAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "magicalDarknessArea" }
>;
export type BattleSpellCreatedLightAreaOverlap = {
  readonly kind: "spellCreatedLightOverlapsArea";
  readonly effectRef: BattleEffectExecutionRef;
};
export type BattleSpellAreaOriginAnchor =
  | {
      readonly kind: "tableSelectedPoint";
    }
  | {
      readonly kind: "combatant";
      readonly combatantId: CombatantId;
    };
export type BattleMagicSuppressionAffectedOngoingSpellEffect = {
  readonly kind: "magicSuppressionAffectedOngoingSpellEffect";
  readonly effect: BattleMagicSuppressionOngoingSpellEffectRef;
  readonly sourceKind: BattleMagicSuppressionOngoingSpellEffectSourceKind;
};
export type BattleMagicSuppressionTransitWitness = {
  readonly kind: "magicSuppressionTransit";
  readonly areaId: BattleAreaId;
  readonly sourceCombatantId: CombatantId;
  readonly originInsideAura: boolean;
  readonly destinationInsideAura: boolean;
};
export type BattleMagicSuppressionAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "magicSuppressionSelfEmanation" }
>;
export type BattlePointOriginCubeAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "pointOriginCubeArea" }
>;
export type BattlePointOriginCylinderAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  {
    readonly kind:
      | "anchoredPointOriginCylinderArea"
      | "unanchoredPointOriginCylinderArea";
  }
>;
export type BattlePointOriginSphereDiameterAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "pointOriginSphereDiameterArea" }
>;
export type BattlePointOriginSphereAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  {
    readonly kind:
      | "anchoredPointOriginSphereArea"
      | "unanchoredPointOriginSphereArea";
  }
>;
export type BattleDirectionalPersistentAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "directionalPersistentAreaArea" }
>;
export type BattleSpellAreaIdentityChoice =
  | {
      readonly kind: "persistentAreaTraitArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "magicalDarknessArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
      readonly spellCreatedLightOverlaps: readonly BattleSpellCreatedLightAreaOverlap[];
    }
  | {
      readonly kind: "magicSuppressionSelfEmanation";
      readonly areaId: BattleAreaId;
      readonly auraMembership: BattleMagicSuppressionEmanationMembership;
      readonly affectedOngoingSpellEffects: readonly BattleMagicSuppressionAffectedOngoingSpellEffect[];
    }
  | {
      readonly kind: "pointOriginCubeArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "unanchoredPointOriginCylinderArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "unanchoredPointOriginSphereArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "pointOriginSphereDiameterArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "anchoredPointOriginSphereArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "anchoredPointOriginCylinderArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "directionalPersistentAreaArea";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
    };
export type SpellActiveEffectPostDamageRider = Exclude<
  SpellPostDamageRider,
  { readonly kind: "lightEmission" }
>;
export type SpellLightEmissionPostDamageRider = Extract<
  SpellPostDamageRider,
  { readonly kind: "lightEmission" }
>;
export type SpellPostDamageRiderExpiration = Exclude<
  SpellActiveEffectPostDamageRider,
  { readonly kind: "speedDelta" }
>["expiresAt"];
export type SpellSelectedFailedSaveConditionEffect =
  SpellFailedSaveConditionEffectBase &
    (
      | SpellFailedSaveConditionNoRepeatLifecycle
      | SpellFailedSaveConditionEndTurnSaveLifecycle
    ) & {
      readonly condition: Condition;
    };
export type SpellFailedSaveAttackRollEffect = BattleSpellActiveEffectTemplate<
  Extract<BattleActiveEffect, { readonly kind: "saveGatedTargetProjection" }>
>;
export type LinkedDefenseResistanceDamageShareSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "linkedDefenseResistanceDamageShare";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<
      BattleActiveEffect,
      { readonly kind: "linkedDefenseResistanceDamageShare" }
    >
  >;
  readonly rangeFeet: MovementFeet;
  readonly connectionRangeFeet: MovementFeet;
};
type SpellTargetListTargetingKind =
  | "targetList"
  | "pointOriginSphereTargetList"
  | "selfAndChosenLegalTargets";

export type TargetListSpellInvocationOf<Invocation> = Invocation extends {
  readonly targeting: infer Targeting;
}
  ? Extract<
      Targeting,
      { readonly kind: SpellTargetListTargetingKind }
    > extends infer TargetListTargeting
    ? [TargetListTargeting] extends [never]
      ? never
      : Exclude<
            Targeting,
            { readonly kind: SpellTargetListTargetingKind }
          > extends never
        ? Invocation
        : Invocation & { readonly targeting: TargetListTargeting }
    : never
  : never;

export type TargetListSpellInvocation =
  TargetListSpellInvocationOf<SupportedSpellInvocation>;
export type D20RollModifierSpellEffect = BattleSpellActiveEffectTemplate<
  Extract<BattleActiveEffect, { readonly kind: "d20RollModifier" }>
>;
export type RollModifierSpellEffect =
  | D20RollModifierSpellEffect
  | BattleSpellActiveEffectTemplate<
      Extract<BattleActiveEffect, { readonly kind: "abilityCheckRollMode" }>
    >;
export type SelectedRollModifierSpellEffect = BattleSpellActiveEffectTemplate<
  Extract<
    BattleActiveEffect,
    { readonly kind: "d20RollModifier" | "abilityCheckRollMode" }
  >
>;
export type TemporaryAbilityCheckRollModeSpellInvocation = {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "temporaryAbilityCheckRollMode";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<
      BattleActiveEffect,
      { readonly kind: "temporaryAbilityCheckRollMode" }
    >
  >;
  readonly rangeFeet: MovementFeet;
  readonly selectedMode: TemporaryAbilityCheckRollModeSelectedMode;
  readonly concurrentDurationModeLimit: TemporaryAbilityCheckRollModeConcurrentDurationModeLimit;
};

export type SpawnedCompanionLifecycleSpellInvocation =
  SpawnedCompanionLifecycleExecutionFacts & {
    readonly spell: BattleSpellAdmissionSource;
  };
type RollModifierSpellSaveGate = {
  readonly ability: Ability;
  readonly dc: DcSource;
};
type RollModifierSpellInvocationBase = {
  readonly procedure: "rollModifier";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: RollModifierSpellTargeting;
  readonly rangeFeet: MovementFeet;
  readonly saveGate: RollModifierSpellSaveGate | null;
};
export type RollModifierSpellInvocation = (
  | CantripDamageSpellSource
  | PreparedLeveledSpellSource
) &
  RollModifierSpellInvocationBase &
  (
    | {
        readonly effect: D20RollModifierSpellEffect;
        readonly skillChoices: readonly Skill[] | null;
        readonly abilityChoices: null;
      }
    | {
        readonly effect: AbilityCheckRollModeSpellEffect;
        readonly skillChoices: null;
        readonly abilityChoices: readonly Ability[];
        readonly abilityChoiceApplication: "single" | "perTarget";
      }
  );
export type CreatureTypeProtectionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "creatureTypeProtection";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: CreatureTypeProtectionSpellTargeting;
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "creatureTypeProtection" }>
  >;
  readonly rangeFeet: MovementFeet;
};
export type CreatureSizeChangeSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "creatureSizeIncrease" | "creatureSizeDecrease";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly ability: Extract<Ability, "con">;
  readonly dc: DcSource;
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "spellCreatureSizeChange" }>
  >;
  readonly rangeFeet: MovementFeet;
};
export type ControlledVerticalSuspensionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "controlledVerticalSuspension";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly ability: Extract<Ability, "con">;
  readonly dc: DcSource;
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Omit<ControlledVerticalSuspensionActiveEffect, "altitudeFeet">
  >;
  readonly maxAltitudeChangeFeet: MovementFeet;
  readonly maxInitialRiseFeet: MovementFeet;
  readonly rangeFeet: MovementFeet;
};
export type PerceptionGatedAttackRollDefenseSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "perceptionGatedAttackRollDefense";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<
      BattleActiveEffect,
      { readonly kind: "perceptionGatedAttackRollDefense" }
    >
  >;
};
export type SeeInvisibleObserverSightSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "seeInvisibleObserverSight";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "seeInvisibleAndEthereal" }>
  >;
};
export type DuplicateHitInterceptionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "duplicateHitInterception";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "duplicateHitInterception" }>
  >;
};
export type ConditionRemovalProtectionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "conditionRemovalProtection";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly protection: {
    readonly conditionSaveRollMode: BattleSpellActiveEffectTemplate<
      Extract<
        BattleActiveEffect,
        { readonly kind: "conditionSavingThrowRollMode" }
      >
    >;
    readonly damageResistance: BattleSpellActiveEffectTemplate<
      Extract<BattleActiveEffect, { readonly kind: "damageResistance" }>
    >;
  };
  readonly rangeFeet: MovementFeet;
};
export type ChosenDamageResistanceSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "chosenDamageResistance";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting & {
    readonly requiredTargetDisposition: "willing";
  };
  readonly damageTypeChoices: readonly DamageType[];
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  > & { readonly durationTicks: ElapsedTimeTicks };
  readonly rangeFeet: MovementFeet;
};
export type DirectConditionRemovalSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "directConditionRemoval";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly targeting: SpellTargetListTargeting;
  readonly conditionChoices: typeof DIRECT_CONDITION_REMOVAL_CONDITIONS;
  readonly rangeFeet: MovementFeet;
};
export type DamageReductionSpellInvocation = {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "damageReduction";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting & {
    readonly requiredTargetDisposition: "willing";
  };
  readonly damageTypeChoices: readonly DamageType[];
  readonly amount: {
    readonly dice: 1;
    readonly dieSize: 4;
  };
  readonly expiresAt: BattleActiveEffectExpiration;
  readonly rangeFeet: MovementFeet;
};
export type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffects: readonly [
    ConditionImmunityActiveEffectTemplate,
    BattleSpellActiveEffectTemplate<
      Extract<
        BattleActiveEffect,
        { readonly kind: "turnStartTemporaryHitPoints" }
      >
    >,
  ];
  readonly rangeFeet: MovementFeet;
};
export type SelfTransformationModeSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "selfTransformationMode";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly modeChoices: readonly [
    SelfTransformationModeKind,
    ...SelfTransformationModeKind[],
  ];
  readonly naturalWeaponFacts: SelfTransformationNaturalWeaponFacts;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  > & { readonly durationTicks: ElapsedTimeTicks };
};
export type SaveGatedConditionImmunitySpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "saveGatedConditionImmunity";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly targetCreatureTypes: readonly CreatureType[];
  readonly activeEffects: readonly [
    ConditionImmunityActiveEffectTemplate,
    ConditionImmunityActiveEffectTemplate,
  ];
  readonly rangeFeet: MovementFeet;
};
export type FixedCostMovementReplacementSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "fixedCostMovementReplacement";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: number;
    readonly requiredTargetDisposition: "willing";
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<
      BattleActiveEffect,
      { readonly kind: "fixedCostMovementReplacement" }
    >
  > & {
    readonly movementCostFeet: MovementFeet;
    readonly maxJumpDistanceFeet: MovementFeet;
  };
  readonly rangeFeet: MovementFeet;
};
export type GrantedAreaSaveDamageActionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "grantedAreaSaveDamageAction";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly ability: "dex";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: 1;
  };
  readonly activeEffect: Omit<
    BattleSpellActiveEffectTemplate<
      Extract<
        BattleActiveEffect,
        { readonly kind: "grantedAreaSaveDamageAction" }
      >
    >,
    "damageType"
  >;
  readonly dc: DcSource;
  readonly damageTypeChoices: readonly DamageType[];
  readonly rangeFeet: MovementFeet;
};
export type CompositeTargetBuffWithAftermathSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "compositeTargetBuffWithAftermath";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting & {
    readonly maxTargets: 1;
    readonly requiredTargetDisposition: "willing";
  };
  readonly activeEffects: {
    readonly speedRatio: BattleSpellActiveEffectTemplate<
      Extract<BattleActiveEffect, { readonly kind: "speedRatio" }>
    >;
    readonly armorClassBonus: BattleSpellActiveEffectTemplate<
      Extract<BattleActiveEffect, { readonly kind: "spellArmorClassBonus" }>
    >;
    readonly dexteritySavingThrowAdvantage: BattleSpellActiveEffectTemplate<
      Extract<BattleActiveEffect, { readonly kind: "savingThrowRollMode" }>
    >;
    readonly grantedActionResource: BattleSpellActiveEffectTemplate<
      Extract<
        BattleActiveEffect,
        { readonly kind: "spellGrantedActionResource" }
      >
    >;
    readonly spellEndTargetState: BattleSpellActiveEffectTemplate<
      Extract<BattleActiveEffect, { readonly kind: "spellEndTargetState" }>
    >;
  };
  readonly rangeFeet: MovementFeet;
};
export type SelfTeleportSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "selfTeleport";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly maxDistanceFeet: MovementFeet;
};
export type TargetingSaveInterdictionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "targetingSaveInterdiction";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: 1;
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "targetingSaveInterdiction" }>
  > & {
    readonly save: {
      readonly ability: "wis";
      readonly dc: DcSource;
    };
  };
  readonly rangeFeet: MovementFeet;
};
export type DirectConditionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "directCondition";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: Omit<
    BattleSpellActiveEffectTemplate<
      Extract<
        BattleActiveEffect,
        { readonly kind: "targetActionEndedSpellCondition" }
      >
    >,
    "conditionHadNonSpellSource"
  >;
  readonly rangeFeet: MovementFeet;
};
export type WeaponDamageRiderSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "weaponDamageRider";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "spellWeaponDamageRider" }>
  >;
};
export type WeaponAttackDamageEnhancementSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "weaponAttackDamageEnhancement";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly bonus: WeaponAttackDamageEnhancementBonus;
  readonly durationTicks: ElapsedTimeTicks;
};
export type AfterHitDamageSpellInvocation = PreparedLeveledSpellSource & {
  readonly procedure: "afterHitDamage";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly conditionalBonusDamage: {
    readonly targetCreatureTypes: readonly CreatureType[];
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
};
export type AfterHitSaveGatedConditionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "afterHitSaveGatedCondition";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "singleCombatant" }
  >;
  readonly effect: SpellFailedSaveConditionEffect;
};
export type AfterHitTimedDamageAndSaveSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "afterHitTimedDamageAndSave";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly immediateDamage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<
      BattleActiveEffect,
      { readonly kind: "spellTurnStartDamageAndSave" }
    >
  >;
};
export type AfterHitDamageAndIlluminationSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "afterHitDamageAndIllumination";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly illumination: BrightRadiusIlluminationEmissionFacts;
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<
      BattleActiveEffect,
      { readonly kind: "afterHitDamageAndIllumination" }
    >
  >;
};
export type MarkedDamageRiderSpellInvocation =
  | (PreparedLeveledSpellSource & {
      readonly procedure: "markedDamageRider";
      readonly action: "cast";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly targeting: { readonly kind: "singleCombatant" };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
      readonly retargetTiming: MarkedDamageRiderRetargetTiming;
      readonly rangeFeet: MovementFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | {
      readonly access: SpellEffectSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "markedDamageRider";
      readonly action: "transfer";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly targeting: { readonly kind: "singleCombatant" };
      readonly rangeFeet: MovementFeet;
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "spellMarkedDamageRider" }
      >;
    };
export type HeldLightSpellInvocation = {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "heldLight";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly light: {
    readonly brightRadiusFeet: MovementFeet;
    readonly dimAdditionalFeet: MovementFeet;
  };
  readonly hurl: HeldLightHurlMechanicalFacts;
  readonly expiresAt: BattleActiveEffectExpiration;
};
type ObjectLightSpellCantripSource = {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly targeting: {
    readonly kind: "singleObject";
    readonly object: {
      readonly kind: "lightCantripObject";
      readonly maxSize: Size;
    };
  };
};
type ObjectLightSpellSlotSource = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly targeting: {
    readonly kind: "singleObject";
    readonly object: {
      readonly kind: "touchedObject";
    };
  };
};
type ObjectLightSpellSource =
  | ObjectLightSpellCantripSource
  | ObjectLightSpellSlotSource;
type ObjectLightSpellInvocationBase = {
  readonly procedure: "objectLight";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly light: Extract<
    BattleLightEmission,
    { readonly kind: "brightAndDim" }
  >;
  readonly expiresAt: BattleActiveEffectExpiration;
};
export type ObjectLightSpellInvocation = ObjectLightSpellInvocationBase &
  ObjectLightSpellSource;
export type OngoingSpellEndSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly procedure: "ongoingSpellEnd";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly rangeFeet: MovementFeet;
};
export type HeldLightHurlSpellInvocation = HeldLightHurlMechanicalFacts & {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "heldLightHurl";
  readonly sourceEffectRef: BattleEffectExecutionRef;
  readonly sourceHeldLightProcedureRef: BattleProcedureExecutionRef;
  readonly spell: BattleSpellAdmissionSource;
};
export type MovableLightManifestationSpellInvocation =
  | {
      readonly access: CantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "movableLightManifestation";
      readonly operation: "create";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly form: "separateLights";
      readonly dimRadiusFeet: MovementFeet;
      readonly rangeFeet: MovementFeet;
      readonly maxMoveFeet: MovementFeet;
      readonly spacingFeet: MovementFeet;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    }
  | {
      readonly access: CantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "movableLightManifestation";
      readonly operation: "create";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly form: "combinedMediumForm";
      readonly dimRadiusFeet: MovementFeet;
      readonly rangeFeet: MovementFeet;
      readonly maxMoveFeet: MovementFeet;
      readonly spacingFeet: MovementFeet;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    }
  | {
      readonly access: CantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "movableLightManifestation";
      readonly operation: "reposition";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly activeEffectRef: BattleEffectExecutionRef;
      readonly sourceManifestationProcedureRef: BattleProcedureExecutionRef;
      readonly maxMoveFeet: MovementFeet;
      readonly rangeFeet: MovementFeet;
      readonly spacingFeet: MovementFeet;
    };
export type SpellCreatedHeldObjectSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "spellCreatedHeldObject";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly activeEffect: BattleSpellActiveEffectTemplate<SpellCreatedHeldObjectActiveEffect> & {
        readonly objectState: { readonly kind: "held" };
      };
    }
  | {
      readonly access: SpellEffectSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "spellCreatedHeldObjectAttack";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "singleCombatant" }
      >;
      readonly damage: SpellCreatedHeldObjectActiveEffect["attack"]["damage"];
      readonly rangeFeet: MovementFeet;
      readonly attackKind: SpellCreatedHeldObjectActiveEffect["attack"]["attackKind"];
      readonly attackBonus: SpellCreatedHeldObjectActiveEffect["attack"]["attackBonus"];
      readonly sourceEffectRef: BattleEffectExecutionRef;
      readonly sourceHeldObjectProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly access: SpellEffectSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "spellCreatedHeldObjectReEvoke";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly sourceEffectRef: BattleEffectExecutionRef;
      readonly sourceHeldObjectProcedureRef: BattleProcedureExecutionRef;
    };
export type ObjectContactDamageSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "objectContactDamage";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly targeting: { readonly kind: "singleManufacturedMetalObject" };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
      readonly durationTicks: ElapsedTimeTicks;
    }
  | {
      readonly access: SpellEffectSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "objectContactDamageRepeat";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly activeEffect: SpellObjectContactDamageActiveEffect;
    };
export type RepeatSpatialMeleeSpellAttackProxyInvocation = {
  readonly access: SpellEffectSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "spatialMeleeSpellAttackProxy";
  readonly operation: "repositionAndAttack";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "spatialMeleeSpellAttackProxy" }
  >;
  readonly repeatTargeting: SpatialMeleeSpellAttackProxyRepeatTargeting;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "singleCombatant" }
  >;
  readonly damage: Extract<
    CreateSpatialMeleeSpellAttackProxySpellProcedureExecution,
    { readonly operation: "createAndAttack" }
  >["damage"];
  readonly attackKind: Extract<SpellAttackKind, "melee_spell_attack">;
  readonly attackBonus: AttackBonus;
  readonly forceReachFeet: MovementFeet;
  readonly repeatMoveMaxFeet: MovementFeet;
};
export type SpellAttackSequenceTargeting =
  | CantripSpellAttackSequenceTargeting
  | PreparedSpellAttackSequenceTargeting;
export type SpellHostedWeaponAttackInvocation = {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "spellHostedWeaponAttack";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly componentWeapon: {
    readonly objectId: BattleObjectId;
    readonly attack: BoundCharacterWeaponAttackActionOption;
  };
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly attackBonus: AttackBonus;
  readonly damageTypeChoices: readonly DamageType[];
  readonly bonusDamage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  } | null;
};
export type WeaponAttackOverrideSpellInvocation = {
  readonly access: CantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "weaponAttackOverride";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly attachedWeaponSlot: HeldWeaponLoadoutSlot;
  readonly attachedWeapon: {
    readonly attack: BoundCharacterWeaponAttackActionOption;
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "spellWeaponAttackOverride" }>
  >;
};
export type PersistentArmorSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentArmorEffect";
      readonly spell: BattleSpellAdmissionSource;
      readonly rangeFeet: MovementFeet;
      readonly activeEffect: BattleSpellActiveEffectTemplate<PersistentArmorSpellActiveEffect>;
    }
  | {
      readonly access: ArmorOfShadowsSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "persistentArmorEffect";
      readonly spell: BattleSpellAdmissionSource;
      readonly rangeFeet: MovementFeet;
      readonly activeEffect: BattleSpellActiveEffectTemplate<PersistentArmorSpellActiveEffect>;
    };

export type ResolvedSpellAttackDamagePayload = Extract<
  SpellAttackDamagePayload,
  {
    readonly kind: "fixedSpellAttackDamage" | "selectedSpellAttackDamage";
  }
>;

export function spellAttackDamagePayloadIsResolved(
  damage: SpellAttackDamagePayload,
): damage is ResolvedSpellAttackDamagePayload {
  return (
    damage.kind === "fixedSpellAttackDamage" ||
    damage.kind === "selectedSpellAttackDamage"
  );
}

// SupportedAttackActionOption is a currently executable option for spending an
// immediate attack made as part of the Attack action. It is narrower than all
type SupportedSpellInvocationSource =
  | HeldLightSpellInvocation
  | ObjectLightSpellInvocation
  | OngoingSpellEndSpellInvocation
  | HeldLightHurlSpellInvocation
  | MovableLightManifestationSpellInvocation
  | SpellCreatedHeldObjectSpellInvocation
  | ObjectContactDamageSpellInvocation
  | RepeatSpatialMeleeSpellAttackProxyInvocation
  | SpellHostedWeaponAttackInvocation
  | WeaponAttackOverrideSpellInvocation
  | ChosenDamageResistanceSpellInvocation
  | DamageReductionSpellInvocation
  | LinkedDefenseResistanceDamageShareSpellInvocation
  | TemporaryAbilityCheckRollModeSpellInvocation
  | SeeInvisibleObserverSightSpellInvocation
  | GrantedAreaSaveDamageActionSpellInvocation
  | CompositeTargetBuffWithAftermathSpellInvocation
  | SpawnedCompanionLifecycleSpellInvocation
  | {
      readonly access: CantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "makeStable";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly rangeFeet: MovementFeet;
    }
  | FixedCostMovementReplacementSpellInvocation
  | SelfTeleportSpellInvocation
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "repeatedDamageAllocation";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: {
        readonly kind: "repeatedEffectTargetAllocation";
        readonly repeatedEffectCount: number;
      };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
    }
  | (DamageSpellSource & {
      readonly procedure: "spellAttackDamage";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: SpellAttackDamageTargeting;
      readonly damage: SpellAttackDamagePayload;
      readonly rangeFeet: MovementFeet;
      readonly attackKind: SpellAttackKind;
      readonly attackBonus: AttackBonus;
      readonly missDamage: SpellAttackMissDamage;
      readonly laterDamage: SpellTurnEndDamage | null;
      readonly postDamageRiders: readonly SpellPostDamageRider[];
      readonly objectHitEffect: SpellObjectHitEffect;
    })
  | (CantripDamageSpellSource & {
      readonly procedure: "spellAttackSequence";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: CantripSpellAttackSequenceTargeting;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
      readonly attackKind: Extract<SpellAttackKind, "ranged_spell_attack">;
      readonly attackBonus: AttackBonus;
    })
  | (PreparedDamageSpellSource & {
      readonly procedure: "spellAttackSequence";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: PreparedSpellAttackSequenceTargeting;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
      readonly attackKind: Extract<SpellAttackKind, "ranged_spell_attack">;
      readonly attackBonus: AttackBonus;
    })
  | (PreparedDamageSpellSource & {
      readonly procedure: "chainedSpellAttackDamage";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "singleCombatant" }
      >;
      readonly damage: {
        readonly expr: DiceExpr;
      };
      readonly damageTypeChoices: readonly DamageType[];
      readonly rangeFeet: MovementFeet;
      readonly leapRangeFeet: MovementFeet;
      readonly attackKind: SpellAttackKind;
      readonly attackBonus: AttackBonus;
    })
  | (DamageSpellSource & {
      readonly procedure: "saveGatedDamage";
      readonly spell: BattleSpellAdmissionSource;
      readonly castingTime: Exclude<
        SpellInvocationCastingTime,
        { readonly kind: "bonusAction" }
      >;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly targeting: SaveGatedDamageSpellTargeting;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly additionalDamageComponents: readonly {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      }[];
      readonly successDamage: "none" | "half";
      readonly rangeFeet: MovementFeet;
      readonly failedSavePostDamageRiders: readonly SpellFailedSavePostDamageRider[];
      readonly failedSaveConditionEffects: readonly SpellFailedSaveConditionEffect[];
      readonly failedSaveAbilityChoices: readonly Ability[] | null;
      readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
      readonly postSaveAreaEffect?: SpellPostSaveAreaEffect;
    })
  | (PreparedDamageSpellSource & {
      readonly procedure: "attackBurstSaveDamage";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "singleCombatant" }
      >;
      readonly attackKind: SpellAttackKind;
      readonly attackBonus: AttackBonus;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly burst: {
        readonly ability: Ability;
        readonly dc: DcSource;
        readonly targeting: Extract<
          SpellTargeting,
          { readonly kind: "primaryTargetOriginEmanation" }
        >;
        readonly damage: {
          readonly expr: DiceExpr;
          readonly damageType: DamageType;
        };
        readonly successDamage: "none";
      };
      readonly rangeFeet: MovementFeet;
    })
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "saveGatedCondition";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly targeting: SaveGatedConditionSpellTargeting;
      readonly targetCreatureTypes: readonly CreatureType[] | null;
      readonly effect: SpellFailedSaveConditionEffect;
      readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "saveGatedAttackRollAdvantage";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly targeting: SpellTargeting;
      readonly effect: SpellFailedSaveAttackRollEffect;
      readonly illumination: DimIlluminationEmissionFacts;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "abilityD20TestRollModeSaveGate";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
      readonly rangeFeet: MovementFeet;
      readonly successEffect: BattleSpellActiveEffectTemplate<
        Extract<
          Extract<BattleActiveEffect, BattleSpellEffectBase>,
          { readonly kind: "nextAttackRollBySelf" }
        >
      >;
      readonly failedSaveEffect: BattleSpellActiveEffectTemplate<
        Extract<
          BattleActiveEffect,
          { readonly kind: "abilityD20TestRollModeEndTurnSave" }
        >
      >;
      readonly failedSaveDamagePenaltyEffect: BattleSpellActiveEffectTemplate<
        Extract<
          BattleActiveEffect,
          { readonly kind: "sourceDamageRollPenalty" }
        >
      >;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "stagedSaveCondition";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphere" }
      >;
      readonly rangeFeet: MovementFeet;
      readonly automaticSuccessPredicates: StagedSaveConditionAutomaticSuccessPredicates;
      readonly escapeAction: StagedSaveConditionEscapeAction;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "saveGatedConditionWithRepeat";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "saveGatedAreaControl";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginCube" }
      >;
      readonly rangeFeet: MovementFeet;
      readonly durationTicks: ElapsedTimeTicks;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "saveGatedTurnConstraintBundle";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginCube" }
      >;
      readonly maxTargets: 6;
      readonly rangeFeet: MovementFeet;
      readonly durationTicks: ElapsedTimeTicks;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaSaveCondition";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "dex">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginGroundSquare" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaSaveConditionEscape";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "dex">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginCube" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaSaveComposite";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "dex">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginCylinder" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "stationary" };
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphere" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "piercing">;
      };
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "sourceTurnTranslation";
        readonly distanceFeet: MovementFeet;
        readonly direction: "awayFromSource";
        readonly movedAreaOperation: "saveDamage";
        readonly environmentalEnd: "strongWind";
      };
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphere" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "poison">;
      };
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "directionalPersistentArea";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "str">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "selfOriginLine" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly pushDistanceFeet: MovementFeet;
      readonly movementCost: {
        readonly multiplier: 2;
        readonly appliesTo: "towardSource";
      };
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaTrait";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphere" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "magicalDarknessPointOrigin";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphere" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly dispelledSpellCreatedLightMaxSpellLevel: BattleSpellEffectLevel;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "magicSuppressionEmanation";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "selfOriginEmanation" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "bonusAction";
        readonly movedAreaOperation: "saveDamage";
        readonly collisionDisposition: "stopAndAffectAdjacent";
      };
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "dex">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphereDiameter" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly ramMaxMoveFeet: MovementFeet;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "fire">;
      };
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "spatialMeleeSpellAttackProxy";
      readonly operation: "createAndAttack";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "singleCombatant" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly forceReachFeet: MovementFeet;
      readonly repeatMoveMaxFeet: MovementFeet;
      readonly damage: {
        readonly kind: "fixedSpellAttackDamage";
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "force">;
      };
      readonly attackKind: Extract<SpellAttackKind, "melee_spell_attack">;
      readonly attackBonus: AttackBonus;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "areaMovementDistanceDamage";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphere" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "piercing">;
      };
      readonly damagePerFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "magicAction";
        readonly movedAreaOperation: "saveDamage";
        readonly collisionDisposition: "ignoreObstacles";
      };
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginCylinder" }
      >;
      readonly durationTicks: ElapsedTimeTicks;
      readonly rangeFeet: MovementFeet;
      readonly repositionMaxMoveFeet: MovementFeet;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "radiant">;
      };
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "compelledNextTurnBehavior";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "scalarBuff";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: HealingSpellActionCost;
      readonly targeting: ScalarBuffSpellTargeting;
      readonly effect: ScalarBuffSpellEffect;
      readonly rangeFeet: MovementFeet;
    }
  | RollModifierSpellInvocation
  | CreatureTypeProtectionSpellInvocation
  | CreatureSizeChangeSpellInvocation
  | ControlledVerticalSuspensionSpellInvocation
  | PerceptionGatedAttackRollDefenseSpellInvocation
  | DuplicateHitInterceptionSpellInvocation
  | ConditionRemovalProtectionSpellInvocation
  | DirectConditionRemovalSpellInvocation
  | ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation
  | SelfTransformationModeSpellInvocation
  | SaveGatedConditionImmunitySpellInvocation
  | WeaponDamageRiderSpellInvocation
  | WeaponAttackDamageEnhancementSpellInvocation
  | AfterHitDamageSpellInvocation
  | AfterHitSaveGatedConditionSpellInvocation
  | AfterHitTimedDamageAndSaveSpellInvocation
  | AfterHitDamageAndIlluminationSpellInvocation
  | MarkedDamageRiderSpellInvocation
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "grantedAlternateActionCost";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly activeEffect: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "spellDashBonusAction" }>
      >;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "fallingCreatureMitigationReaction";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
      readonly activeEffect: BattleSpellActiveEffectTemplate<
        Extract<
          BattleActiveEffect,
          { readonly kind: "fallingCreatureMitigationReaction" }
        >
      >;
      readonly rangeFeet: MovementFeet;
    }
  | TargetingSaveInterdictionSpellInvocation
  | DirectConditionSpellInvocation
  | PersistentArmorSpellInvocation
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "triggeredArmorDefense";
      readonly spell: BattleSpellAdmissionSource;
      readonly armorClassBonus: number;
      readonly negatesRepeatedDamageAllocation: true;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "spellCastInterruptionReaction";
      readonly spell: BattleSpellAdmissionSource;
      readonly triggerComponents: readonly SpellComponent[];
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "singleCombatant" }
      >;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: LeveledSpellInvocationResource;
      readonly procedure: "directHitPointRestoration";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: HealingSpellActionCost;
      readonly targeting: HealingSpellTargeting;
      readonly healing: {
        readonly expr: DiceExpr;
      };
      readonly rangeFeet: MovementFeet;
    };

type SupportedSpellProcedure = SupportedSpellInvocationSource["procedure"];

/**
 * The executable spell catalog, distributed by procedure so every member has
 * exactly one discriminant. Source aliases may group procedures that own the
 * same fields, but reducer dispatch must remain exhaustive per procedure.
 */
export type SupportedSpellInvocation = {
  readonly [Procedure in SupportedSpellProcedure]: SupportedSpellInvocationSource extends infer Invocation
    ? Invocation extends {
        readonly procedure: SupportedSpellProcedure;
        readonly spell: infer Spell extends BattleSpellAdmissionSource;
      }
      ? Procedure extends Invocation["procedure"]
        ? Omit<Invocation, "spell" | "procedure"> & {
            readonly procedure: Procedure;
            readonly spell: Pick<
              Spell,
              | "id"
              | "name"
              | "mechanics"
              | "castingSource"
              | "spellAccessFreeCastResourcePoolRefs"
            >;
          }
        : never
      : never
    : never;
}[SupportedSpellProcedure];

/** A selected execution invocation paired with its stable procedure reference. */
export type SelectableSpellProcedureExecution =
  SpellProcedureExecution<SupportedSpellInvocation> extends infer Execution
    ? Execution extends SpellRuleExecutionFactsOwner
      ? Execution
      : never
    : never;
export type BattleSelectedSpellInvocation =
  SelectableSpellProcedureExecution & {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  };

/** A reducer-safe procedure containing typed mechanics and no authored spell. */
export type BattleExecutableSpellInvocation<
  I extends SpellProcedureInput = RuntimeSpellProcedureExecution,
> = (I extends SupportedSpellInvocation | SpellProcedureExecution
  ? SpellExecutableExecutionOf<I>
  : I) & {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};

type AnySupportedDamageSpellInvocation = Exclude<
  SupportedSpellInvocation,
  {
    readonly procedure:
      | "persistentArmorEffect"
      | "directHitPointRestoration"
      | "makeStable"
      | "damageReduction"
      | "linkedDefenseResistanceDamageShare"
      | "spawnedCompanionLifecycle"
      | "temporaryAbilityCheckRollMode"
      | "spellHostedWeaponAttack"
      | "weaponAttackOverride"
      | "rollModifier"
      | "creatureTypeProtection"
      | "creatureSizeIncrease"
      | "creatureSizeDecrease"
      | "controlledVerticalSuspension"
      | "perceptionGatedAttackRollDefense"
      | "seeInvisibleObserverSight"
      | "duplicateHitInterception"
      | "conditionRemovalProtection"
      | "chosenDamageResistance"
      | "conditionImmunityAndTurnStartTemporaryHitPoints"
      | "selfTransformationMode"
      | "scalarBuff"
      | "weaponDamageRider"
      | "weaponAttackDamageEnhancement"
      | "afterHitDamage"
      | "afterHitSaveGatedCondition"
      | "afterHitTimedDamageAndSave"
      | "afterHitDamageAndIllumination"
      | "markedDamageRider"
      | "grantedAlternateActionCost"
      | "fixedCostMovementReplacement"
      | "grantedAreaSaveDamageAction"
      | "compositeTargetBuffWithAftermath"
      | "selfTeleport"
      | "targetingSaveInterdiction"
      | "directCondition"
      | "directConditionRemoval"
      | "fallingCreatureMitigationReaction"
      | "heldLight"
      | "objectLight"
      | "ongoingSpellEnd"
      | "spellCreatedHeldObject"
      | "spellCreatedHeldObjectReEvoke"
      | "movableLightManifestation"
      | "triggeredArmorDefense"
      | "spellCastInterruptionReaction"
      | "saveGatedCondition"
      | "saveGatedConditionImmunity"
      | "saveGatedAttackRollAdvantage"
      | "abilityD20TestRollModeSaveGate"
      | "stagedSaveCondition"
      | "saveGatedConditionWithRepeat"
      | "saveGatedAreaControl"
      | "saveGatedTurnConstraintBundle"
      | "compelledNextTurnBehavior"
      | "persistentAreaSaveCondition"
      | "persistentAreaSaveConditionEscape"
      | "persistentAreaSaveComposite"
      | "persistentAreaSaveDamage"
      | "directionalPersistentArea"
      | "persistentAreaTrait"
      | "magicalDarknessPointOrigin"
      | "magicSuppressionEmanation"
      | "areaMovementDistanceDamage"
      | "chainedSpellAttackDamage";
  }
>;
export type SupportedDamageSpellInvocation =
  | Exclude<
      AnySupportedDamageSpellInvocation,
      { readonly procedure: "spellAttackDamage" }
    >
  | (Extract<
      AnySupportedDamageSpellInvocation,
      { readonly procedure: "spellAttackDamage" }
    > & {
      readonly damage: ResolvedSpellAttackDamagePayload;
    });
export type ReadiedSpellInvocation =
  | Exclude<
      SupportedDamageSpellInvocation,
      {
        readonly procedure:
          | "heldLightHurl"
          | "objectContactDamage"
          | "objectContactDamageRepeat"
          | "spatialMeleeSpellAttackProxy"
          | "spellCreatedHeldObjectAttack";
      }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "chainedSpellAttackDamage" }
    >;

type WeaponDamageDiceRollChoiceSelection = "first" | "second";
type WeaponDamageDiceRollCandidate = RolledDiceGroup & {
  readonly results: ReadonlyNonEmptyArray<DieRollResult>;
};
export type WeaponDamageDiceRollChoiceFill = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly selection: WeaponDamageDiceRollChoiceSelection;
  readonly candidates: readonly [
    WeaponDamageDiceRollCandidate,
    WeaponDamageDiceRollCandidate,
  ];
};
export type WeaponDamageDiceRollChoiceUsage = {
  readonly attackerId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
};
export type RecklessAttackWhileRagingUsage = {
  readonly attackerId: CombatantId;
  readonly recklessAttackSourceKey: OngoingFeatureSourceKey;
  readonly rageSourceKey: OngoingFeatureSourceKey;
};
type AttackRollMissToHitReplacementUsage = {
  readonly procedureRef: BattleProcedureExecutionRef;
};
export type PendingAttackRollMissToHitReplacementContext = {
  readonly subject: BattleSubject;
  readonly targetId: CombatantId;
  readonly attackRoll: BattleAttackRollResult;
};
type PendingAttackRollMissToHitReplacementSelection = {
  readonly attackerId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly context: PendingAttackRollMissToHitReplacementContext;
};
export type BattleCompelledHaltTurnSuppression = {
  readonly kind: "compelledHalt";
};
export type BattleJumpDistanceMultiplier = {
  readonly multiplier: 2;
};

export type BattleTurnResources = ActionEconomyState & {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
  readonly compelledHalt: BattleCompelledHaltTurnSuppression | null;
  readonly jumpDistanceMultiplier: BattleJumpDistanceMultiplier | null;
  readonly heightenedStepOfTheWindCarriedCreatures: readonly HeightenedStepOfTheWindCarriedCreature[];
  readonly spellSlotUsesThisTurn: readonly BattleTurnSpellSlotUse[];
  readonly levelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly quickenedLevelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly attackRollMadeThisTurn: boolean;
  readonly brutalStrike:
    | { readonly kind: "available" }
    | {
        readonly kind: "pending";
        readonly subject: BattleAttackHostSubject;
        readonly targetId: CombatantId;
      }
    | { readonly kind: "spent" };
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly stunningStrikesUsedThisTurn: readonly StunningStrikeUsage[];
  readonly recklessAttackWhileRagingUsedThisTurn: readonly RecklessAttackWhileRagingUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
  readonly weaponMasteryCleaveAttackersUsedThisTurn: readonly CombatantId[];
  readonly huntersPreyHordeBreakerUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly grapplerPunchAndGrabUsedThisTurn: readonly CombatantId[];
  readonly pendingAttackRollMissToHitReplacementSelection?: PendingAttackRollMissToHitReplacementSelection;
  readonly lightWeaponAttackMade?: {
    readonly weaponItemId: BattleObjectId;
  };
  readonly dashMovementBonusFeet: MovementFeet;
  readonly disengaged: boolean;
};

export type HeightenedStepOfTheWindCarriedCreature = {
  readonly carrierId: CombatantId;
  readonly carriedCreatureId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly movementDoesNotProvokeOpportunityAttacks: true;
  readonly expires: "endOfCarrierTurn";
};

export type BattleTurnSpellSlotUse =
  | {
      readonly kind: "pending";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "committed";
      readonly combatantId: CombatantId;
    };

export type OngoingFeatureExpiration =
  | {
      readonly kind: "startOfTurn";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "endOfTurn";
      readonly combatantId: CombatantId;
      readonly round: RoundType;
    };
export type EndOfTurnOngoingFeatureExpiration = Extract<
  OngoingFeatureExpiration,
  { readonly kind: "endOfTurn" }
>;
export type AttackDamageRider = {
  readonly attackerId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly optional: boolean;
  readonly damage: {
    readonly dice: number;
    readonly dieSize: number;
    readonly damageType: DamageType;
  };
};
export type SpellWeaponDamageRider = Extract<
  BattleActiveEffect,
  { readonly kind: "spellWeaponDamageRider" }
>;
export type SpellAttackDamageComponent = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly operation?: "add" | "subtract";
  readonly minimumDamageTotal?: 1;
};
export type AttackSpellDamageAddition = SpellAttackDamageComponent & {
  readonly kind: "attackSpellDamageAddition";
  readonly sourceProcedure:
    | "afterHitDamage"
    | "afterHitTimedDamageAndSave"
    | "afterHitDamageAndIllumination"
    | "spellHostedWeaponAttack";
};
export type MarkedDamageRiderFindingAdvantage = {
  readonly kind: "findingAdvantage";
  readonly ability: Extract<Ability, "wis">;
  readonly skills: typeof MARKED_TARGET_FINDING_SKILLS;
};
export type {
  MarkedDamageRiderAbilityCheckBehavior,
  SpellMarkedDamageRider,
} from "./active-effect/types.ts";
export type AttackDamageRiderUsage = {
  readonly attackerId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
};
export type StunningStrikeUsage = {
  readonly attackerId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
};
export type OngoingFeatureSourceKey = BattleProcedureExecutionRef;
export const OngoingFeatureSourceKey = BattleProcedureExecutionRef;
export type ActiveOngoingFeatureOccurrence =
  | {
      readonly kind: "turnBoundary";
      readonly expiresAt: OngoingFeatureExpiration;
    }
  | {
      readonly kind: "roundExtended";
      readonly expiresAt: EndOfTurnOngoingFeatureExpiration;
      readonly maxExpiresAt: EndOfTurnOngoingFeatureExpiration;
    }
  | {
      readonly kind: "fixedDuration";
      readonly expiresAt: EndOfTurnOngoingFeatureExpiration;
    };
export type ActiveOngoingFeatureOccurrenceSnapshot =
  ActiveOngoingFeatureOccurrence & {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  };
type OngoingFeatureExpirationEncoded =
  | {
      readonly kind: "startOfTurn";
      readonly combatantId: string;
    }
  | {
      readonly kind: "endOfTurn";
      readonly combatantId: string;
      readonly round: number;
    };
type EndOfTurnOngoingFeatureExpirationEncoded = Extract<
  OngoingFeatureExpirationEncoded,
  { readonly kind: "endOfTurn" }
>;
export type ActiveOngoingFeatureOccurrenceSnapshotEncoded =
  | {
      readonly kind: "turnBoundary";
      readonly expiresAt: OngoingFeatureExpirationEncoded;
      readonly sourceProcedureRef: string;
    }
  | {
      readonly kind: "roundExtended";
      readonly expiresAt: EndOfTurnOngoingFeatureExpirationEncoded;
      readonly maxExpiresAt: EndOfTurnOngoingFeatureExpirationEncoded;
      readonly sourceProcedureRef: string;
    }
  | {
      readonly kind: "fixedDuration";
      readonly expiresAt: EndOfTurnOngoingFeatureExpirationEncoded;
      readonly sourceProcedureRef: string;
    };

type KnockOutEligibleZeroHpLifecycle =
  | Extract<ZeroHpLifecycle, { readonly policy: "diesAtZeroHp" }>
  | (Extract<ZeroHpLifecycle, { readonly policy: "usesDeathSavingThrows" }> & {
      readonly deathSaves: DeathSaveRuntimeState & { readonly dead: false };
    });
export type KnockOutEligibleBattleCreatureState = BattleCreatureState & {
  readonly zeroHpLifecycle: KnockOutEligibleZeroHpLifecycle;
};

export type BattleCreatureKnockOutLifecycle =
  | {
      readonly hp: Hp;
      readonly conditions: ConditionState;
      readonly positiveHpUnconscious: null;
    }
  | {
      readonly hp: KnockedOutOneHp;
      readonly conditions: KnockedOutConditionState;
      readonly positiveHpUnconscious: BattlePositiveHpUnconscious;
    };

export type CharacterBattleUnarmoredArmorClassBases = {
  readonly shielded: Extract<
    ArmorClassBaseSource,
    { readonly kind: "ability_sum" }
  >;
  readonly unshielded: Extract<
    ArmorClassBaseSource,
    { readonly kind: "ability_sum" }
  >;
};

type BattleCreatureStateCommon = {
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly activeEffects: readonly BattleActiveEffect[];
  readonly nextEffectOrdinal: BattleEffectExecutionOrdinal;
  readonly activeOngoingFeatureOccurrences: ReadonlyMap<
    OngoingFeatureSourceKey,
    ActiveOngoingFeatureOccurrence
  >;
  readonly attackRollMissToHitReplacementsUsedSinceTurnStart: readonly AttackRollMissToHitReplacementUsage[];
  readonly concentration: BattleConcentration | null;
  readonly dodging: boolean;
  readonly hidden: BattleHiddenState | null;
  readonly armorClass: ArmorClassState;
  readonly size: Size;
  readonly zeroHpLifecycle: ZeroHpLifecycle;
  readonly reactionAvailable: boolean;
  readonly movementSpentFeet: MovementFeet;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly origin:
    | {
        readonly kind: "character";
        // Authored identity retained for settlement / catalog reference. The
        // reducer never dispatches on characterId.
        readonly characterId: CharacterId;
        readonly execution: CharacterExecutionState;
        readonly classLevels: CharacterBattleClassLevels;
        readonly knownLanguages: ReadonlyNonEmptyArray<Language>;
        readonly d20Statistics: CharacterBattleD20Statistics;
        readonly druidWildShapeAvailableForms?: readonly StatBlockExecutionAdmission<BattleDruidWildShapeKnownFormRuntime>[];
        readonly weaponProficiencies: readonly WeaponProficiency[];
        readonly selectedLoadout: CharacterBattleLoadoutRef;
        readonly unarmoredArmorClassBases: CharacterBattleUnarmoredArmorClassBases;
        readonly invocationFeatures: readonly CharacterBattleInvocationFeature[];
        readonly speed: BattleWalkSpeed;
        readonly attack: BoundCharacterWeaponAttackActionOption | null;
        readonly unarmedStrike: BoundCharacterUnarmedStrikeActionOption;
        readonly offHandAttack?: BoundCharacterWeaponAttackActionOption;
        readonly resources: readonly CharacterBattleResourceState[];
        readonly metamagic?: CharacterBattleMetamagicState;
        readonly spellcasting?: CharacterBattleSpellcastingExecutionState;
      }
    // Authored identity retained for companion settlement and snapshot
    // restoration. Mechanics are taken from StatBlockBattleOrigin.mechanics;
    // the reducer never dispatches on statBlockId.
    | ({ readonly kind: "statBlock" } & StatBlockBattleOrigin);
};

export type BattleAmmunitionKind =
  import("@dnd/shared/game-facts").AmmunitionKind;

export type BattleAmmunitionStock = {
  readonly ammunition: BattleAmmunitionKind;
  readonly remaining: ResourceCount;
};

export type BattleCreatureState = BattleCreatureStateCommon &
  BattleCreatureKnockOutLifecycle;

export type BattleExecutionScopeAllocation =
  | {
      readonly kind: "active";
      readonly nextScopeOrdinal: BattleExecutionScopeCursor;
    }
  | {
      readonly kind: "retired";
      readonly nextScopeOrdinal: BattleExecutionScopeCursor;
      readonly ownership: BattleRetiredExecutionScopeOwnership;
    };

export type BattleRetiredExecutionScopeOwnership =
  | {
      readonly kind: "statBlock";
      readonly statBlockScopeRef: BattleStatBlockExecutionScopeRef;
    }
  | {
      readonly kind: "character";
      readonly characterScopeRef: BattleCharacterExecutionScopeRef;
      readonly attackScopeRef: BattleAttackExecutionScopeRef;
      readonly formScopeRefs: readonly BattleStatBlockExecutionScopeRef[];
    };

export type LegendaryActionWindow = {
  readonly afterTurnActorId: CombatantId;
  readonly consumed: boolean;
};

export type BattleSubjectResolutionPhase =
  | { readonly kind: "subjectSelection" }
  | {
      readonly kind: "subjectContinuation";
      readonly subject: BattleSubject;
      readonly handledInterruptTrigger?: BattleInterruptTrigger;
      readonly acceptedAttackAmmunitionSpend?: BattleAcceptedAttackAmmunitionSpend;
    };

export type BattleAcceptedAttackAmmunitionSpend = {
  readonly actorId: CombatantId;
  readonly attackSelection: BoundAttackExecutionSelection;
};

export type BattleState = {
  readonly battleId: BattleId;
  readonly initiative: InitiativeStack<CombatantId>;
  readonly combatants: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly executionScopeCursors: ReadonlyMap<
    CombatantId,
    BattleExecutionScopeAllocation
  >;
  readonly companions: BattleCompanions;
  readonly groundObjects: ReadonlyMap<CombatantId, BattleActorGroundObjects>;
  readonly objectOutlines: readonly BattleObjectOutline[];
  readonly lightEmitters: readonly BattleStoredLightEmitter[];
  readonly hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly currentTurnResources: BattleTurnResources;
  readonly subjectResolutionPhase: BattleSubjectResolutionPhase;
  readonly readiedSpells: ReadonlyMap<CombatantId, BattleReadiedSpell>;
  readonly readiedResponses: ReadonlyMap<CombatantId, BattleReadiedResponse>;
  readonly helpAttacks: readonly BattleHelpAttack[];
  readonly grapples: readonly BattleGrappleLink[];
  readonly interruptStack: readonly BattleInterruptFrame[];
  readonly legendaryActionWindow: LegendaryActionWindow | null;
};

export type BattleFailedAbilityCheckFacts = {
  readonly actorId: CombatantId;
  readonly ability: Ability;
  readonly skillOrToolLabel?: string;
  readonly originalTotal: number;
  readonly dc: DifficultyClass;
};

export type BattleBardicInspirationFailedD20TestFacts =
  | {
      readonly kind: "abilityCheck";
      readonly actorId: CombatantId;
      readonly ability: Ability;
      readonly skillOrToolLabel?: string;
      readonly originalTotal: number;
      readonly dc: DifficultyClass;
    }
  | {
      readonly kind: "attackRoll";
      readonly actorId: CombatantId;
      readonly attackRoll: BattleAttackRollResult;
      readonly armorClass: ArmorClass;
      readonly criticalThreshold?: CriticalHitThreshold;
    }
  | {
      readonly kind: "savingThrow";
      readonly actorId: CombatantId;
      readonly ability: Ability;
      readonly originalTotal: number;
      readonly dc: DifficultyClass;
    };

export type BattleSuccessfulAbilityCheckFacts = {
  readonly actorId: CombatantId;
  readonly ability: Ability;
  readonly skillOrToolLabel?: string;
  readonly originalTotal: number;
  readonly dc: DifficultyClass;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
};

export type FailedAbilityCheckResourceBoostResolutionInput = {
  readonly state: BattleState;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly abilityCheck: BattleFailedAbilityCheckFacts;
  readonly boostRoll: number;
};

export type BardicInspirationFailedD20TestResolutionInput = {
  readonly state: BattleState;
  readonly d20Test: BattleBardicInspirationFailedD20TestFacts;
  readonly bardicInspirationRoll: number;
};

export type SuccessfulAbilityCheckReactionReductionResolutionInput = {
  readonly state: BattleState;
  readonly reactorId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly abilityCheck: BattleSuccessfulAbilityCheckFacts;
  readonly reductionRoll: number;
};

export type FailedAbilityCheckResourceBoostResolutionResult =
  | (Extract<BattleResolutionResult, { readonly tag: "resolved" }> & {
      readonly abilityCheckBoost: {
        readonly boostedTotal: number;
        readonly boostedSucceeded: boolean;
      };
    })
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export type BardicInspirationFailedD20TestResolutionResult =
  | (Extract<BattleResolutionResult, { readonly tag: "resolved" }> & {
      readonly bardicInspirationD20Test: {
        readonly boostedTotal: number;
        readonly boostedSucceeded: boolean;
      };
    })
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export type SuccessfulAbilityCheckReactionReductionResolutionResult =
  | (Extract<BattleResolutionResult, { readonly tag: "resolved" }> & {
      readonly abilityCheckReduction: {
        readonly reducedTotal: number;
        readonly reducedSucceeded: boolean;
      };
    })
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export type BattleInitializationIssueFacts =
  | { readonly kind: "emptyRoster" }
  | {
      readonly kind: "duplicateCombatantId";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "ammunitionStockInvalid";
      readonly combatantId: CombatantId;
      readonly ammunition: BattleAmmunitionKind;
    }
  | {
      readonly kind: "currentHpExceedsMaximum";
      readonly combatantId: CombatantId;
      readonly currentHp: Hp;
      readonly maximumHp: Hp;
    }
  | {
      readonly kind: "positiveHpUnconsciousInvalid";
      readonly combatantId: CombatantId;
      readonly requirement: "oneCurrentHp" | "unconsciousCondition";
    }
  | {
      readonly kind: "zeroHpLifecycleInvalid";
      readonly combatantId: CombatantId;
      readonly requirement: "absentAtPositiveHp" | "validDeathSaves";
    }
  | {
      readonly kind: "initialConditionImmune";
      readonly combatantId: CombatantId;
      readonly condition: Condition;
    }
  | {
      readonly kind: "statBlockSourceInvalid";
      readonly statBlockId: StatBlockId;
      readonly constraint:
        | "literalArmorClassRequired"
        | "literalMaximumHitPointsRequired"
        | "positiveMaximumHitPointsRequired"
        | "concreteSizeRequired";
    }
  | {
      readonly kind: "statBlockCombatantInvalid";
      readonly combatantId: CombatantId;
      readonly constraint:
        | "concreteCreatureTypeRequired"
        | "resolvedResistanceChoiceRequired";
    }
  | {
      readonly kind: "characterClassLevelsInvalid";
      readonly combatantId: CombatantId;
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterSupportProjectionInvalid";
      readonly combatantId: CombatantId;
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterResourceInvalid";
      readonly combatantId: CombatantId;
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterFeatureInvalid";
      readonly combatantId: CombatantId;
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterSpellcastingInvalid";
      readonly combatantId: CombatantId;
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterAdmissionInvalid";
      readonly combatantId: CombatantId;
      readonly phase:
        | "weaponExecution"
        | "resourceExecution"
        | "spellExecution"
        | "executionBindings";
      readonly issueIndex: number;
    }
  | {
      readonly kind: "executionScopeUnavailable";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "runtimeContextMissing";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "weaponPresentationUnavailable";
      readonly combatantId: CombatantId;
      readonly weaponUnitId: UnitId;
      readonly availability: "missing" | "ambiguous";
    }
  | {
      readonly kind: "hidePrerequisiteReferencesUnknownCombatant";
      readonly combatantId: CombatantId;
      readonly referencedCombatantId: CombatantId;
    }
  | {
      readonly kind: "hidePrerequisiteSelfReference";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "initialCombatantOrderMissing";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "initialInitiativeInvalid";
      readonly initializationReason: "emptyRoster" | "stackConstruction";
    }
  | {
      readonly kind: "runtimeAdmissionInvalid";
      readonly combatantId: CombatantId;
      readonly origin: "character" | "statBlock";
      readonly issueIndex: number;
    }
  | {
      readonly kind: "companionOwnerMissing";
      readonly ownerId: CombatantId;
    }
  | {
      readonly kind: "companionDurableIdentityMissing";
      readonly ownerId: CombatantId;
    }
  | {
      readonly kind: "companionOwnerAlreadyHasCompanion";
      readonly ownerId: CombatantId;
    }
  | {
      readonly kind: "companionDurableIdentityInUse";
      readonly ownerId: CombatantId;
      readonly durableCompanionId: BattleCompanionDurableId;
      readonly existingOwnerId: CombatantId;
    }
  | {
      readonly kind: "companionManifestationInvalid";
      readonly ownerId: CombatantId;
      readonly requirement: "embodiedOutsideBattle" | "retainedIdentity";
    }
  | {
      readonly kind: "companionFormStatBlockMissing";
      readonly formAccess: "spawnedCompanion" | "pactOfTheChain";
      readonly resolvedStatBlockId: StatBlockId;
    }
  | {
      readonly kind: "companionFormAccessMismatch";
      readonly storedFormAccess: "spawnedCompanion" | "pactOfTheChain";
      readonly eligibilityFormAccess: "spawnedCompanion" | "pactOfTheChain";
    }
  | {
      readonly kind: "companionFormResolvedStatBlockMismatch";
      readonly formAccess: "spawnedCompanion" | "pactOfTheChain";
      readonly expectedStatBlockId: StatBlockId;
      readonly resolvedStatBlockId: StatBlockId;
    }
  | {
      readonly kind: "companionFormSelectionStatBlockMissing";
      readonly formAccess: "spawnedCompanion" | "pactOfTheChain";
      readonly selectedStatBlockId: StatBlockId;
    }
  | {
      readonly kind: "companionFormSelectionStatBlockInvalid";
      readonly formAccess: "spawnedCompanion" | "pactOfTheChain";
      readonly selectedStatBlockId: StatBlockId;
      readonly expectedCreatureType: "beast";
      readonly expectedChallengeRating: 0;
    }
  | {
      readonly kind: "companionFormSpecialFormUnknown";
      readonly formAccess: "pactOfTheChain";
      readonly formId: BattleCompanionFormId;
    }
  | {
      readonly kind: "companionFormNormalFormIneligible";
      readonly formAccess: "spawnedCompanion" | "pactOfTheChain";
      readonly formId: BattleCompanionFormId;
    }
  | {
      readonly kind: "companionCombatantAdmissionInvalid";
      readonly ownerId: CombatantId;
      readonly companionCombatantId: CombatantId;
    }
  | {
      readonly kind: "companionInitialInitiativeInvalid";
      readonly ownerId: CombatantId;
      readonly companionCombatantId: CombatantId;
      readonly requirement:
        | "initialCombatantOrder"
        | "nonEmptyRoster"
        | "stackConstruction";
    }
  | {
      readonly kind: "companionOwnerRuntimeContextMissing";
      readonly ownerId: CombatantId;
    }
  | {
      readonly kind: "companionPresentationStatBlockMissing";
      readonly companionCombatantId: CombatantId;
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "companionPresentationCombatantMissing";
      readonly companionCombatantId: CombatantId;
      readonly statBlockId: StatBlockId;
    };

/** A flat projection of one initialization fact for boundary payloads. */
export type BattleInitializationIssueFact = {
  [K in BattleInitializationIssueFacts["kind"]]: Omit<
    Extract<BattleInitializationIssueFacts, { readonly kind: K }>,
    "kind"
  > & { readonly reason: K };
}[BattleInitializationIssueFacts["kind"]];

export type BattleStateInitLeafIssue =
  | ({
      readonly tag: "battleStateInitIssue";
      readonly message: string;
      readonly ownerPath?: readonly (string | number)[];
    } & BattleInitializationIssueFacts)
  | {
      readonly tag: "battleStateInitIssue";
      readonly message: string;
      readonly ownerPath?: readonly (string | number)[];
    }
  | {
      readonly tag: "statBlockResourceGraphIssue";
      readonly issues: ReadonlyNonEmptyArray<StatBlockResourceGraphAdmissionFailure>;
    }
  | {
      readonly tag: "weaponLoadoutMismatch";
      readonly slot: "main-hand" | "off-hand";
      readonly ownerPath?: readonly (string | number)[];
    };

/** Initialization issues emitted while admitting a Stat Block combatant. */
export type BattleStatBlockInitializationIssue = Extract<
  BattleStateInitLeafIssue,
  { readonly tag: "battleStateInitIssue" }
>;

export type BattleInitializationLeafIssue =
  | ({
      readonly tag: "battleStateInitIssue";
      readonly message: string;
      readonly ownerPath?: readonly (string | number)[];
    } & BattleInitializationIssueFacts)
  | {
      readonly tag: "statBlockResourceGraphIssue";
      readonly issues: ReadonlyNonEmptyArray<StatBlockResourceGraphAdmissionFailure>;
      readonly combatantId: CombatantId;
      readonly ownerPath: readonly (string | number)[];
    }
  | {
      readonly tag: "statBlockProjectionFailure";
      readonly combatantId: CombatantId;
      readonly failure: BattleStatBlockProjectionFailure;
      readonly ownerPath: readonly (string | number)[];
    }
  | {
      readonly tag: "weaponLoadoutMismatch";
      readonly slot: "main-hand" | "off-hand";
      readonly ownerPath?: readonly (string | number)[];
    };

export type BattleInitializationIssue =
  | BattleInitializationLeafIssue
  | {
      readonly tag: "battleStateInitIssues";
      readonly issues: readonly [
        BattleInitializationLeafIssue,
        BattleInitializationLeafIssue,
        ...BattleInitializationLeafIssue[],
      ];
    };

export type BattleStateInitIssue =
  | BattleStateInitLeafIssue
  | {
      readonly tag: "battleStateInitIssues";
      readonly issues: readonly [
        BattleStateInitLeafIssue,
        BattleStateInitLeafIssue,
        ...BattleStateInitLeafIssue[],
      ];
    };

// battleStateInitIssue and battleStateInitIssueMessage moved to ./battle-reducer/domain-helpers.ts

export const SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET = movementFeet(5);
export const SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET = movementFeet(15);
export const SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET = movementFeet(20);
export const FAILED_SAVE_BLINDED_CONDITION = "blinded" satisfies Condition;
export const FAILED_SAVE_RESTRAINED_CONDITION =
  "restrained" satisfies Condition;

type BattleActExecution<TSubject extends BattleSubject> = {
  readonly subject: TSubject;
  readonly initialHoles: readonly BattleHole[];
  readonly routeEvents?: BattleReducerRouteEvents;
};

export {
  ATTACK_PRESENTATION_JOIN_ISSUE_REASONS,
  type AttackPresentationJoinIssue,
  type AttackPresentationJoinIssueReason,
} from "./attack-presentation-contract.ts";

export type BattleActPresentation =
  | { readonly kind: "intrinsic" }
  | {
      readonly kind: "presentationIssue";
      readonly issue: AttackPresentationJoinIssue;
    }
  | {
      readonly kind: "attack";
      readonly procedureRef:
        | BattleAttackProcedureExecutionRef
        | BattleStatBlockProcedureExecutionRef;
      readonly name: string;
    }
  | {
      readonly kind: "spell";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly invocation: SpellInvocationRef;
    }
  | {
      readonly kind: "unit";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly unitId: string;
    }
  | {
      readonly kind: "druidWildShapeForm";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly formExecutionRef: BattleStatBlockExecutionScopeRef;
      readonly unitId: string;
      readonly formStatBlockId: BattleDruidWildShapeKnownFormRuntime["id"];
    };

export type BattleActDiscoveryCandidate = BattleActExecution<BattleSubject>;

export type BattleActExecutionCandidate = BattleActExecution<BattleSubject>;

export type AvailableBattleAct = BattleActExecutionCandidate & {
  readonly label: string;
  readonly summary: string;
  readonly presentation: BattleActPresentation;
};

export type BattleHoleId = HoleId;
export type BattleHoleInstanceKey = HoleInstanceKey;
export type BattleTargetChoiceHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "targetChoice" }
> & {
  readonly choices: readonly CombatantId[];
  readonly procedureRef?: BattleProcedureExecutionRef;
  readonly requiresTableSpatialFact?: boolean;
  readonly relationshipFactRequest?: BattleTargetChoiceRelationshipFactRequest;
  readonly spellTargetSpatialFactRequest?: {
    readonly casterId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly rangeFeet: MovementFeet;
    readonly visibility: "requiresSight" | "notSpecifiedByProcedure";
    readonly requiresKnownWillingTarget?: true;
  };
  readonly attack?: {
    readonly actorId: CombatantId;
    readonly selection: BattleAttackExecutionSelection;
    readonly targetConstraint: AttackTargetConstraint;
    readonly acceptsObjectTarget?: true;
  };
};
export type BattleHelpAttackAllyDecisionHole = {
  readonly kind: "helpAttackAllyDecision";
  readonly holeId: BattleHoleId;
  readonly holeInstanceKey: BattleHoleInstanceKey;
  readonly label: string;
  readonly helperId: CombatantId;
  readonly choices: readonly CombatantId[];
};
export type BattleHelpAttackEnemyDecisionHole = {
  readonly kind: "helpAttackEnemyDecision";
  readonly holeId: BattleHoleId;
  readonly holeInstanceKey: BattleHoleInstanceKey;
  readonly label: string;
  readonly helperId: CombatantId;
  readonly allyId: CombatantId;
  readonly choices: readonly CombatantId[];
};
export type BattleObjectTargetChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "objectTargetChoice";
  readonly label: string;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly requiresTableSpatialFact: true;
};
export type BattleObjectContactTargetSpatialFact = Extract<
  BattleTargetSpatialFact,
  {
    readonly kind:
      | "spellObjectPhysicalContact"
      | "spellObjectWithinSpellRange"
      | "spellObjectHoldingOrWearing";
  }
>;
export type BattleObjectContactTargetsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "objectContactTargets";
  readonly label: string;
  readonly objectContact: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly objectId: BattleObjectId;
    readonly rangeFeet: MovementFeet;
    readonly requiresObjectWithinRange: boolean;
  };
  readonly choices: readonly CombatantId[];
  readonly requiresTableSpatialFact: true;
};
export type BattleObjectContactSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly outcomeTargeting: "targetList";
  readonly objectContactSave: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly objectId: BattleObjectId;
    readonly targetIds: readonly CombatantId[];
  };
  readonly ability: Extract<Ability, "con">;
  readonly dc: Extract<DcSource, { readonly kind: "caster_spell_save_dc" }>;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleObjectDropResolution =
  | {
      readonly targetId: CombatantId;
      readonly capability: { readonly kind: "canDrop" };
      readonly result: { readonly kind: "dropped" };
    }
  | {
      readonly targetId: CombatantId;
      readonly capability: { readonly kind: "cannotDrop" };
      readonly result: { readonly kind: "notDropped" };
    };
export type BattleObjectDropResolutionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "objectDropResolution";
  readonly label: string;
  readonly objectDrop: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly objectId: BattleObjectId;
    readonly targetIds: readonly CombatantId[];
  };
};
export type BattleCunningStrikeEndTurnCoverFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "cunningStrikeEndTurnCoverFacts";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly coverDegrees: readonly CunningStrikeEndTurnCoverDegree[];
};
export type BattleSpellCastReactionFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetSpatialFacts";
  readonly label: string;
  readonly spellBeingCast: {
    readonly casterId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly castLevel: number;
    readonly components: readonly SpellComponent[];
  };
  readonly requiresTableSpatialFact: true;
};
export type BattleTurnConstraintSomaticSpellFailureOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "turnConstraintSomaticSpellFailureOutcome";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly failurePercent: 25;
  readonly activeEffectSources: readonly {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
  }[];
};
export type BattleLinkedEffectSeparationFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetSpatialFacts";
  readonly label: string;
  readonly linkedEffectSeparation: {
    readonly sourceCombatantId: CombatantId;
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly rangeFeet: MovementFeet;
  };
  readonly requiresTableSpatialFact: true;
};
export type BattleAreaWindStrength =
  | { readonly kind: "strong" }
  | { readonly kind: "notStrong" };
export type BattleAreaWindStrengthHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "areaWindStrength";
  readonly label: string;
  readonly areaId: BattleAreaId;
};
export type BattleSpellAreaChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellAreaChoice";
  readonly label: string;
  readonly area: Extract<
    SpellTargeting,
    {
      readonly kind:
        | "pointOriginSphere"
        | "pointOriginSphereDiameter"
        | "pointOriginCylinder"
        | "pointOriginCube"
        | "pointOriginGroundSquare"
        | "selfOriginEmanation";
    }
  >;
};
export type BattleTeleportDestinationHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "teleportDestination";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
  readonly requiresTableSpatialFact: true;
};
export type BattleSpatialMeleeSpellAttackProxyPositionHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spatialMeleeSpellAttackProxyPosition";
  readonly label: string;
  readonly mode: BattleSpatialMeleeSpellAttackProxyPosition["mode"];
  readonly maxDistanceFeet: MovementFeet;
  readonly requiresTableSpatialFact: true;
};
export type BattleHeldObjectFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "heldObjectFacts";
  readonly label: string;
  readonly actorId: CombatantId;
};
export type BattleToolPossessionFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "toolPossessionFacts";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly toolIds: readonly ["poisoners_kit"];
};
export type BattleSpawnedCompanionConnectionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spawnedCompanionConnection";
  readonly label: string;
  readonly ownerId: CombatantId;
  readonly companionId: CombatantId;
  readonly rangeFeet: MovementFeet;
  readonly requiresTableSpatialFact: true;
};
export type BattleCompanionReappearancePlacementHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "companionReappearancePlacement";
  readonly label: string;
  readonly ownerId: CombatantId;
};
export type BattleCompanionReappearanceInitiativeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "companionReappearanceInitiative";
  readonly label: string;
  readonly ownerId: CombatantId;
};
export type BattleWeaponEnhancementTargetItemFact = {
  readonly kind: "nonmagicalWeaponItem";
  readonly holderCombatantId: CombatantId;
  readonly itemId: BattleObjectId;
};
export type BattleWeaponEnhancementTargetItemHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "weaponAttackDamageEnhancementTargetItem";
  readonly label: string;
  readonly requiresTableItemFact: true;
};
export type BattleSpellTargetAllocation = {
  readonly targetId: CombatantId;
  readonly count: number;
};
export type BattleObjectDamageDisposition =
  | {
      readonly kind: "hitPoints";
      readonly hitPoints: Hp;
    }
  | {
      readonly kind: "hitPointsWithDamageThreshold";
      readonly hitPoints: Hp;
      readonly damageThreshold: DamageAmount;
    }
  | {
      readonly kind: "tableResolved";
    };
export type BattleObjectIgnitionDisposition =
  | { readonly kind: "flammableUnattended" }
  | { readonly kind: "notFlammable" }
  | { readonly kind: "wornOrCarried" };
export type BattleObjectDamageComponent = {
  readonly damageType: DamageType;
  readonly rolledDamage: DamageAmount;
};
export type BattleObjectDamageOutcome =
  | {
      readonly kind: "hitPoints";
      readonly objectId: BattleObjectId;
      readonly components: ReadonlyNonEmptyArray<BattleObjectDamageComponent>;
      readonly rolledDamage: DamageAmount;
      readonly damageAfterImmunities: DamageAmount;
      readonly damageThreshold: DamageAmount | null;
      readonly effectiveDamage: DamageAmount;
      readonly priorHitPoints: Hp;
      readonly nextHitPoints: Hp;
      readonly destroyed: boolean;
    }
  | {
      readonly kind: "tableResolved";
      readonly objectId: BattleObjectId;
      readonly components: ReadonlyNonEmptyArray<BattleObjectDamageComponent>;
      readonly rolledDamage: DamageAmount;
    };
export type BattleObjectIgnitionOutcome = {
  readonly kind: "startsBurning";
  readonly objectId: BattleObjectId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};
export type BattleObjectOutcomeAccumulation =
  | {
      readonly objectDamages: ReadonlyNonEmptyArray<BattleObjectDamageOutcome>;
      readonly objectIgnitions?: ReadonlyNonEmptyArray<BattleObjectIgnitionOutcome>;
      readonly droppedObjects?: readonly BattleDroppedObjectOutcome[];
    }
  | {
      readonly objectDamages?: ReadonlyNonEmptyArray<BattleObjectDamageOutcome>;
      readonly objectIgnitions: ReadonlyNonEmptyArray<BattleObjectIgnitionOutcome>;
      readonly droppedObjects?: readonly BattleDroppedObjectOutcome[];
    }
  | {
      readonly objectDamages?: ReadonlyNonEmptyArray<BattleObjectDamageOutcome>;
      readonly objectIgnitions?: ReadonlyNonEmptyArray<BattleObjectIgnitionOutcome>;
      readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
    };
export type BattleAreaDamageObjectIgnitionFact = {
  readonly objectId: BattleObjectId;
  readonly disposition: BattleObjectIgnitionDisposition;
};
export type BattleAreaDamageNonmagicalUnattendedObjectDamageFact = {
  readonly objectId: BattleObjectId;
  readonly disposition: BattleObjectDamageDisposition;
};
export type BattleDroppedObjectSource =
  | {
      readonly kind: "spell";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "companionDisappearance";
      readonly ownerId: CombatantId;
      readonly companionId: CombatantId;
    }
  | {
      readonly kind: "druidWildShape";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly formExecutionRef: BattleStatBlockExecutionScopeRef;
    };
export type BattleGroundObjectState = {
  readonly positionId: BattleTablePositionId;
  readonly source: BattleDroppedObjectSource;
};
declare const battleActorGroundObjectsNonEmpty: unique symbol;
export type BattleActorGroundObjects = ReadonlyMap<
  BattleObjectId,
  BattleGroundObjectState
> & {
  readonly [battleActorGroundObjectsNonEmpty]: true;
};
export type BattleDroppedObjectOutcome = {
  readonly kind: "objectDropped";
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly source: BattleDroppedObjectSource;
};
export type BattleDamageTypeChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "damageTypeChoice";
  readonly label: string;
  readonly choices: readonly DamageType[];
};
type BattleSpellTargetSpatialFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellTarget" }
>;
type BattlePointOriginSphereSpellTargetsSpatialFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellTargetsInPointOriginSphere" }
>;
type BattleKnownWillingSpellTargetSpatialFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellTargetKnownWilling" }
>;
export type BattleSpellTargetAllocationSpatialFact = Extract<
  BattleTargetSpatialFact,
  {
    readonly kind: "spellTarget" | "reactionSpellDamagerVisibleWithinRange";
  }
>;
type BattleFallingCreatureTargetSpatialFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "fallingCreatureTargetWithinRange" }
>;
export type BattleSpellTargetListSpatialFact =
  | BattleSpellTargetSpatialFact
  | BattlePointOriginSphereSpellTargetsSpatialFact
  | BattleKnownWillingSpellTargetSpatialFact
  | BattleFallingCreatureTargetSpatialFact;
export type BattleSpellTargetAllocationHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellTargetAllocation";
  readonly label: string;
  readonly allocationCount: number;
  readonly choices: readonly CombatantId[];
  readonly requiresTableSpatialFact: true;
  readonly spellTargetSpatialFactRequest: {
    readonly casterId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly rangeFeet: MovementFeet;
    readonly visibility: "requiresSight";
  };
};
export type BattleSpellTargetListHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellTargetList";
  readonly label: string;
  readonly minTargets: 1;
  readonly maxTargets: number;
  readonly spatialTargeting:
    | { readonly kind: "individualTargets" }
    | {
        readonly kind: "pointOriginSphere";
        readonly radiusFeet: MovementFeet;
      };
  readonly choices: readonly CombatantId[];
  readonly requiresTableSpatialFact: true;
  readonly spellTargetSpatialFactRequest?: {
    readonly casterId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly rangeFeet: MovementFeet;
    readonly visibility: "notSpecifiedByProcedure";
  };
  readonly requiresKnownWillingTargets?: true;
  readonly relationshipFactRequest?: BattleSpellTargetListRelationshipFactRequest;
};
export type BattleAttackRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "attackRoll" }
> & {
  readonly label: string;
  readonly attack: SupportedAttackActionOption;
  readonly attackBonus: AttackBonus;
  readonly rollMode?: AttackRollMode;
  readonly ongoingFeatureActivations?: ReadonlyNonEmptyArray<AttackRollFeatureActivation>;
  readonly missToHitReplacements?: ReadonlyNonEmptyArray<AttackRollMissToHitReplacement>;
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
  readonly relationshipFactRequest?: BattleAttackRollRelationshipFactRequest;
};
export type AttackRollFeatureActivation = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly rollMode: AttackRollMode;
};
export type AttackRollMissToHitReplacement = {
  readonly procedureRef: BattleProcedureExecutionRef;
};
export type BattleSpellAttackRerollOption = {
  readonly effectKind: "missed_spell_attack_reroll";
  readonly label: string;
  readonly sorceryPointCost: ResourceCount;
};
export type BattleSpellAttackRerollDecision =
  | {
      readonly kind: "decline";
      readonly effectKind: "missed_spell_attack_reroll";
    }
  | {
      readonly kind: "reroll";
      readonly effectKind: "missed_spell_attack_reroll";
      readonly replacement: AttackRollResult;
    };
export const D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND =
  "d20_test_natural_one_reroll";
export type BattleD20TestNaturalOneRerollOption = {
  readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
  readonly label: string;
};
export const BATTLE_D20_TEST_ROLLED_DIE_KEYS = ["first", "second"] as const;
export type BattleD20TestRolledDieKey =
  (typeof BATTLE_D20_TEST_ROLLED_DIE_KEYS)[number];
export type BattleD20TestRolledD20s = {
  readonly first: DieRollResult;
  readonly second: DieRollResult;
  readonly selected: BattleD20TestRolledDieKey;
};
export type BattleD20TestRollReplacement = AttackRollResult;
export type BattleD20TestRolledDieRollReplacement = {
  readonly die: BattleD20TestRolledDieKey;
  readonly naturalD20: DieRollResult;
  readonly result: BattleD20TestRollReplacement;
};
export type BattleD20TestNaturalOneRerollDecision =
  | {
      readonly kind: "decline";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
    }
  | {
      readonly kind: "reroll";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
      readonly replacement: BattleD20TestRollReplacement;
    }
  | {
      readonly kind: "rerollRolledDie";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
      readonly replacement: BattleD20TestRolledDieRollReplacement;
    };
export type BattleD20TestOutcomeReplacement = {
  readonly succeeded: boolean;
  readonly naturalD20: DieRollResult;
};
export type BattleD20TestRolledDieOutcomeReplacement = {
  readonly die: BattleD20TestRolledDieKey;
  readonly naturalD20: DieRollResult;
  readonly result: BattleD20TestOutcomeReplacement;
};
export type BattleD20TestDieReplacement = DieRollResult;
export type BattleD20TestNaturalOneRerollOutcomeDecision =
  | {
      readonly kind: "decline";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
    }
  | {
      readonly kind: "reroll";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
      readonly replacement: BattleD20TestOutcomeReplacement;
    }
  | {
      readonly kind: "rerollRolledDie";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
      readonly replacement: BattleD20TestRolledDieOutcomeReplacement;
    };
export type BattleD20TestNaturalOneRerollDieDecision =
  | {
      readonly kind: "decline";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
    }
  | {
      readonly kind: "reroll";
      readonly effectKind: typeof D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND;
      readonly replacement: BattleD20TestDieReplacement;
    };
export type BattleSpellDamageRerollOption = {
  readonly effectKind: "damage_dice_reroll";
  readonly label: string;
  readonly sorceryPointCost: ResourceCount;
  readonly maximumSelectedDice: number;
};
export type BattleSpellDamageDieReroll = {
  readonly original: DieRollResult;
  readonly replacement: DieRollResult;
};
export type BattleSpellDamageRerollDecision = {
  readonly kind: "reroll";
  readonly effectKind: "damage_dice_reroll";
  readonly dice: readonly [
    BattleSpellDamageDieReroll,
    ...BattleSpellDamageDieReroll[],
  ];
};
export type BattleSpellAttackRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "attackRoll" }
> & {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly attackBonus: AttackBonus;
  readonly rollMode?: AttackRollMode;
  readonly missToHitReplacements?: ReadonlyNonEmptyArray<AttackRollMissToHitReplacement>;
  readonly spellAttackRerolls?: readonly BattleSpellAttackRerollOption[];
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
};
export type BattleCunningStrikeOptionSelection = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly optionId: CunningStrikeOptionSelectionId;
};
export type BattleCunningStrikeOption = BattleCunningStrikeOptionSelection & {
  readonly sourceDamageRiderProcedureRef: BattleProcedureExecutionRef;
  readonly dieCost: {
    readonly dice: 1;
    readonly dieSize: 6;
  };
};
export type BattleDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly attack: SupportedAttackActionOption;
  readonly critical: boolean;
  readonly attackDamageRiders?: readonly AttackDamageRider[];
  readonly spellWeaponDamageRiders?: readonly SpellAttackDamageComponent[];
  readonly spellMarkedDamageRiders?: readonly SpellMarkedDamageRider[];
  readonly cunningStrikeOptions?: readonly BattleCunningStrikeOption[];
  readonly weaponDamageDiceRollChoiceProcedureRefs?: readonly BattleProcedureExecutionRef[];
  readonly attackDamageDieFloorChoiceProcedureRefs?: AttackDamageDieFloorChoiceProcedureRefs;
  readonly attackDamageAbilityModifierChoice?: AttackDamageAbilityModifierChoice;
};
export type BattleSpellDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly critical: boolean;
  readonly spellMarkedDamageRiders?: readonly SpellMarkedDamageRider[];
  readonly spellDamageRerolls?: readonly BattleSpellDamageRerollOption[];
};
export type BattleGrantedAreaSaveDamageActionDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly grantedAreaSaveDamageAction: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly damageType: DamageType;
    readonly expr: DiceExpr;
  };
};
export type BattleGlyphExplosiveRuneDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly glyphExplosiveRune: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly effectRef: BattleEffectExecutionRef;
    readonly damage: {
      readonly expr: DiceExpr;
    };
  };
};
export type BattleSpellDamageReductionRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly spellDamageReduction: SpellDamageReductionRoll;
};
export type BattleSourceDamageRollPenaltyRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly sourceDamageRollPenalty: SourceDamageRollPenaltyRoll;
};
export type BattleDuplicateHitInterceptionRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly duplicateHitInterceptionRoll: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly remainingDuplicates: DuplicateHitInterceptionCount;
    readonly dieSize: 6;
    readonly successAtLeast: 3;
  };
};
export type BattleSpellTurnStartDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly spellTurnStartDamage: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly trigger:
      | { readonly kind: "condition"; readonly condition: Condition }
      | {
          readonly kind: "saveToEnd";
          readonly ability: Ability;
          readonly dc: DcSource;
        };
    readonly damage: SpellTurnStartDamage;
  };
};
export type BattleSpellTurnEndDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly spellTurnEndDamage: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly damage: SpellTurnEndDamage;
  };
};
export type BattleSpellTurnStartSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly spellTurnStartSave: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly save: SpellTurnStartDamageSave;
  };
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleStagedConditionRepeatSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly stagedConditionRepeatSave: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly save: {
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "wis">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleSaveGatedConditionRepeatTrigger = "endTurn" | "damage";
export type BattleDamageOccurrenceSource =
  | { readonly kind: "untrackedDamage" }
  | {
      readonly kind: "spellTurnEndDamage";
      readonly effectRef: BattleEffectExecutionRef;
    };
export type BattleSaveGatedConditionRepeatSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly damageOccurrence: BattleDamageOccurrenceSource;
  readonly saveGatedConditionRepeatSave: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly trigger: BattleSaveGatedConditionRepeatTrigger;
    readonly save: {
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "wis">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleSpellConditionCountedEndTurnSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly spellConditionCountedEndTurnSave: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly condition: Condition;
    readonly save: SpellConditionRepeatSave;
    readonly successes: number;
    readonly failures: number;
    readonly successThreshold: number;
    readonly failureThreshold: number;
  };
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattlePersistentAreaSaveConditionTrigger =
  | "entersArea"
  | "endsTurnInArea";
export type BattlePersistentAreaSaveConditionSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly persistentAreaSaveCondition: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattlePersistentAreaSaveConditionTrigger;
    readonly save: {
      readonly ability: Extract<Ability, "dex">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "dex">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattlePersistentAreaSaveConditionEscapeTrigger =
  | "entersArea"
  | "startsTurnInArea";
export type BattlePersistentAreaSaveConditionEscapeSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly persistentAreaSaveConditionEscape: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattlePersistentAreaSaveConditionEscapeTrigger;
    readonly save: {
      readonly ability: Extract<Ability, "dex">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "dex">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattlePersistentAreaSaveCompositeTrigger =
  | "entersArea"
  | "startsTurnInArea";
export type BattleStationaryPersistentAreaSaveDamageTrigger =
  | "appearsInArea"
  | "entersArea"
  | "endsTurnInArea";
export type BattleTranslatingPersistentAreaSaveDamageTrigger =
  | "appearsInArea"
  | "movesIntoSpace"
  | "entersArea"
  | "endsTurnInArea";
export type BattlePersistentAreaSaveCompositeSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly persistentAreaSaveComposite: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattlePersistentAreaSaveCompositeTrigger;
    readonly save: {
      readonly ability: Extract<Ability, "dex">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "dex">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly persistentAreaSaveDamage: {
    readonly topology: "stationary";
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleStationaryPersistentAreaSaveDamageTrigger;
    readonly save: {
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "con">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleTranslatingPersistentAreaSaveDamageSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly persistentAreaSaveDamage: {
    readonly topology: "translating";
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleTranslatingPersistentAreaSaveDamageTrigger;
    readonly save: {
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "con">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleStationaryPersistentAreaSaveDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly persistentAreaSaveDamage: {
    readonly topology: "stationary";
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleStationaryPersistentAreaSaveDamageTrigger;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "piercing">;
    };
  };
  readonly critical: false;
};
export type BattleTranslatingPersistentAreaSaveDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly persistentAreaSaveDamage: {
    readonly topology: "translating";
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleTranslatingPersistentAreaSaveDamageTrigger;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "poison">;
    };
  };
  readonly critical: false;
};
export type BattleDirectionalPersistentAreaTrigger = "endsTurnInLine";
export type BattleDirectionalPersistentAreaSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly directionalPersistentArea: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly directionId: BattleLineDirectionId;
    readonly trigger: BattleDirectionalPersistentAreaTrigger;
    readonly save: {
      readonly ability: Extract<Ability, "str">;
      readonly dc: DcSource;
    };
    readonly pushDistanceFeet: MovementFeet;
  };
  readonly ability: Extract<Ability, "str">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleDirectionalPersistentAreaDirectionChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "directionalPersistentAreaDirectionChoice";
  readonly label: string;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectRef: BattleEffectExecutionRef;
  readonly areaId: BattleAreaId;
  readonly directionId: BattleLineDirectionId;
  readonly requiresTableSpatialFact: true;
};
export type BattleSpellConditionEndTurnSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly spellConditionEndTurnSave: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly condition: Condition;
    readonly save: SpellConditionRepeatSave;
  };
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleUnitFeatureConditionEndTurnSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly unitFeatureConditionEndTurnSave: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly condition: Condition;
    readonly save: SpellConditionRepeatSave;
  };
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleTurnConstraintEndTurnSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly turnConstraintEndTurnSave: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly save: {
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
    };
  };
  readonly ability: Extract<Ability, "wis">;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly abilityD20TestRollModeEndTurnSave: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly affectedAbility: Ability;
    readonly save: SpellConditionRepeatSave;
  };
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleCollisionRepositionPersistentAreaSaveDamageTrigger =
  | "endsTurnWithinFiveFeetOfSphere"
  | "rammedBySphere";
export type BattlePersistentAreaSaveDamageRamMovementHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "movableZoneRamMovement";
  readonly label: string;
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly maxMoveFeet: MovementFeet;
  };
  readonly requiresTableSpatialFact: true;
};
export type BattleMovableZoneRepositionMovementHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "movableZoneRepositionMovement";
  readonly label: string;
  readonly movableZone: {
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly maxMoveFeet: MovementFeet;
  };
  readonly requiresTableSpatialFact: true;
};
export type BattleCollisionRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole =
  {
    readonly holeInstanceKey: HoleInstanceKey;
    readonly holeId: BattleHoleId;
    readonly kind: "savingThrowOutcome";
    readonly label: string;
    readonly movableZone: {
      readonly targetId: CombatantId;
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly areaId: BattleAreaId;
      readonly trigger: BattleCollisionRepositionPersistentAreaSaveDamageTrigger;
      readonly save: {
        readonly ability: Extract<Ability, "dex">;
        readonly dc: DcSource;
      };
    };
    readonly ability: Extract<Ability, "dex">;
    readonly dc: DcSource;
    readonly areaChoices: readonly [];
    readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
    readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  };
export type BattleCollisionRepositionPersistentAreaSaveDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleCollisionRepositionPersistentAreaSaveDamageTrigger;
    readonly damage: SpellTurnStartDamage;
  };
  readonly critical: false;
};
export type BattleDirectedRepositionPersistentAreaSaveDamageTrigger =
  | "appearsInArea"
  | "areaMovesIntoSpace"
  | "entersArea"
  | "endsTurnInArea";
export type BattleDirectedRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole =
  {
    readonly holeInstanceKey: HoleInstanceKey;
    readonly holeId: BattleHoleId;
    readonly kind: "savingThrowOutcome";
    readonly label: string;
    readonly movableZone: {
      readonly targetId: CombatantId;
      readonly effectRef: BattleEffectExecutionRef;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly sourceCombatantId: CombatantId;
      readonly areaId: BattleAreaId;
      readonly trigger: BattleDirectedRepositionPersistentAreaSaveDamageTrigger;
      readonly save: {
        readonly ability: Extract<Ability, "con">;
        readonly dc: DcSource;
      };
    };
    readonly ability: Extract<Ability, "con">;
    readonly dc: DcSource;
    readonly areaChoices: readonly [];
    readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
    readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  };
export type BattleDirectedRepositionPersistentAreaSaveDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleDirectedRepositionPersistentAreaSaveDamageTrigger;
    readonly damage: SpellTurnStartDamage;
  };
  readonly critical: false;
};
export type BattleAreaMovementDistanceDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly areaMovementDistanceDamage: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly distanceFeet: MovementFeet;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "piercing">;
    };
  };
  readonly critical: false;
};
export type BattleProtectionRelevantEffectSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly protectionRelevantEffectSave: {
    readonly targetId: CombatantId;
    readonly effectRef: BattleEffectExecutionRef;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly relevantEffect: "charmed" | "frightened" | "possession";
    readonly save: SpellConditionRepeatSave;
  };
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly [];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleSpellHealingRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & { readonly sourceProcedureRef: BattleProcedureExecutionRef };
export type BattleSpellSkillChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "skillChoice";
  readonly label: string;
  readonly choices: readonly Skill[];
};
export type BattleSpellAbilityChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "abilityChoice";
  readonly label: string;
  readonly choices: readonly Ability[];
};
export type BattleSpellTargetAbilityChoicesHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetAbilityChoices";
  readonly label: string;
  readonly choices: readonly Ability[];
};
export type BattleSpellConditionChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "conditionChoice";
  readonly label: string;
  readonly choices: readonly [Condition, ...Condition[]];
};
export type BattleTemporaryAbilityCheckRollModeActiveEffectCountHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "temporaryAbilityCheckRollModeActiveEffectCount";
  readonly label: string;
  readonly maximumActiveOneMinuteEffects: typeof TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS;
  readonly requiresTableSpellEffectCount: true;
};
export type BattleCompelledBehaviorOptionChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "compelledBehaviorOptionChoice";
  readonly label: string;
  readonly choices: readonly BattleCompelledBehaviorOption[];
};
export type BattleSelfTransformationModeChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "selfTransformationModeChoice";
  readonly label: string;
  readonly choices: readonly [
    SelfTransformationModeKind,
    ...SelfTransformationModeKind[],
  ];
};
export type BattleMovableLightCastPlacement = {
  readonly positionId: BattleTablePositionId;
  readonly distanceFromCasterFeet: MovementFeet;
  readonly nearestSiblingDistanceFeet?: MovementFeet;
};
export type BattleMovableLightRepositionPlacement =
  BattleMovableLightCastPlacement & {
    readonly lightId: BattleMovableLightId;
    readonly moveDistanceFeet: MovementFeet;
  };
export type BattleMovableLightCastPlacementList =
  readonly BattleMovableLightCastPlacement[];
export type BattleMovableLightRepositionPlacementList =
  readonly BattleMovableLightRepositionPlacement[];
export type BattleMovableLightPlacementValue =
  | {
      readonly mode: "cast";
      readonly form: "separateLights";
      readonly lights: BattleMovableLightCastPlacementList;
    }
  | {
      readonly mode: "cast";
      readonly form: "combinedMediumForm";
      readonly light: BattleMovableLightCastPlacement;
    }
  | {
      readonly mode: "reposition";
      readonly form: "separateLights";
      readonly lights: BattleMovableLightRepositionPlacementList;
    }
  | {
      readonly mode: "reposition";
      readonly form: "combinedMediumForm";
      readonly light: BattleMovableLightRepositionPlacement;
    };
export type BattleMovableLightPlacementHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "movableLightPlacement";
  readonly label: string;
  readonly mode: BattleMovableLightPlacementValue["mode"];
  readonly form: BattleMovableLightForm;
  readonly activeLightIds: readonly BattleMovableLightId[];
  readonly rangeFeet: MovementFeet;
  readonly maxMoveFeet: MovementFeet;
  readonly spacingFeet: MovementFeet;
  readonly requiresTableSpatialFact: true;
};
export type BattleD20TestRolledOutcome = {
  readonly succeeded: boolean;
  readonly naturalD20?: DieRollResult;
  readonly rolledD20s?: BattleD20TestRolledD20s;
  readonly withoutRoll?: never;
  readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollOutcomeDecision;
};
export type BattleD20TestWithoutRollOutcome = {
  readonly succeeded: boolean;
  readonly withoutRoll: true;
  readonly naturalD20?: never;
  readonly rolledD20s?: never;
  readonly d20TestNaturalOneReroll?: never;
};
export type BattleD20TestOutcome =
  | BattleD20TestRolledOutcome
  | BattleD20TestWithoutRollOutcome;
export type BattleRolledSavingThrowOutcome = BattleD20TestRolledOutcome & {
  readonly targetId: CombatantId;
};
export type BattleSavingThrowWithoutRollOutcome =
  BattleD20TestWithoutRollOutcome & {
    readonly targetId: CombatantId;
  };
export type BattleSavingThrowOutcome =
  | BattleRolledSavingThrowOutcome
  | BattleSavingThrowWithoutRollOutcome;
export type BattleConcentrationSavingThrowValue = BattleD20TestOutcome;
export type BattleSpellAreaSavingThrowOutcomeValue = {
  readonly area: BattleSpellAreaChoice;
  readonly outcomes: readonly BattleSavingThrowOutcome[];
};
export type BattleSpellTargetSavingThrowOutcomeValue = {
  readonly outcomes: readonly BattleSavingThrowOutcome[];
};
export type BattleSpellSavingThrowOutcomeValue =
  | BattleSpellAreaSavingThrowOutcomeValue
  | BattleSpellTargetSavingThrowOutcomeValue;
export type BattleUnitFeatureSavingThrowOutcomeValue = {
  readonly outcomes: readonly BattleSavingThrowOutcome[];
  readonly openHandTechniquePush?: BattleShovePushOutcome;
};
export type BattleSavingThrowOutcomeValue =
  | BattleSpellSavingThrowOutcomeValue
  | BattleUnitFeatureSavingThrowOutcomeValue;
export type SaveDamageResult = "none" | "half" | "full";
export type BattleSpellAreaChoice = {
  readonly originAnchorId: CombatantId;
  readonly affectedTargetIds: readonly CombatantId[];
} & BattleSpellAreaChoiceKind;
type BattleSpellAreaChoiceKind =
  | {
      readonly kind?: never;
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind?: never;
      readonly stagedConditionAutomaticSuccessFacts: readonly [
        BattleStagedConditionAutomaticSuccessFact,
        ...BattleStagedConditionAutomaticSuccessFact[],
      ];
    }
  | {
      readonly kind: "saveGatedTargetProjectionArea";
      readonly affectedObjectIds: readonly BattleObjectId[];
    }
  | {
      readonly kind: "saveGatedAreaControlArea";
      readonly cubeSideFeet: 30;
      readonly affectedCreatureWitnesses: readonly BattleAreaControlAffectedCreatureWitness[];
    }
  | {
      readonly kind: "saveGatedTurnConstraintBundleArea";
      readonly cubeSideFeet: 40;
      readonly affectedCreatureWitnesses: readonly BattleTurnConstraintBundleAffectedCreatureWitness[];
    }
  | {
      readonly kind: "persistentAreaSaveConditionArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "pointOriginSphereSaveDamageArea";
      readonly objectIgnitionFacts: readonly BattleAreaDamageObjectIgnitionFact[];
    }
  | {
      readonly kind: "pointOriginSphereObjectDamageArea";
      readonly nonmagicalUnattendedObjectDamageFacts: readonly BattleAreaDamageNonmagicalUnattendedObjectDamageFact[];
    }
  | {
      readonly kind: "selfOriginCubePushArea";
      readonly creaturePushes: readonly BattleImmediateAreaCreaturePushOutcome[];
      readonly unsecuredObjectPushes: readonly BattleImmediateAreaUnsecuredObjectPushOutcome[];
      readonly audibleBoom: BattleImmediateAreaAudibleBoom;
    }
  | {
      readonly kind: "directionalPersistentAreaArea";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
      readonly creaturePushes: readonly BattleDirectionalPersistentAreaCreaturePushOutcome[];
    };
export type BattleStagedConditionAutomaticSuccessFact = {
  readonly kind: "doesNotSleep";
  readonly targetId: CombatantId;
};
export type BattleAreaControlAffectedCreatureWitness = {
  readonly targetId: CombatantId;
  readonly inCube: true;
  readonly canSeePattern: true;
};
export type BattleTurnConstraintBundleAffectedCreatureWitness = {
  readonly targetId: CombatantId;
  readonly inCube: true;
  readonly chosenByCaster: true;
};
export type BattleSavingThrowRollModeProjection = {
  readonly targetId: CombatantId;
  readonly rollMode: AttackRollMode;
};
export type BattleSavingThrowFlatBonusProjection = {
  readonly targetId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly bonus: number;
};
export type BattleSpellSavingThrowOutcomeHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly outcomeTargeting: "singleTarget" | "targetList" | "area";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly BattleSpellAreaChoice[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
  readonly relationshipFactRequest?: BattleSavingThrowRelationshipFactRequest;
};
export type BattleGrantedAreaSaveDamageActionSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly grantedAreaSaveDamageAction: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly lengthFeet: 15;
  };
  readonly ability: Extract<Ability, "dex">;
  readonly dc: DcSource;
  readonly areaChoices: readonly BattleSpellAreaChoice[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
  readonly relationshipFactRequest?: BattleSavingThrowRelationshipFactRequest;
};
export type BattleGlyphExplosiveRuneSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly glyphExplosiveRune: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly effectRef: BattleEffectExecutionRef;
    readonly radiusFeet: 20;
  };
  readonly ability: Extract<Ability, "dex">;
  readonly dc: DcSource;
  readonly targetIds: readonly CombatantId[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
};
export type BattleUnitFeatureSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly targetIds: readonly CombatantId[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
  readonly relationshipFactRequest?: BattleSavingThrowRelationshipFactRequest;
};
export type BattleUnitFeatureRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
>;
export type BattleUnitFeatureDecisionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "unitFeatureDecision";
  readonly label: string;
  readonly choices:
    | readonly ["use", "decline"]
    | readonly ["attempt", "decline"]
    | typeof OPEN_HAND_TECHNIQUE_DECISION_CHOICES
    | typeof BRUTAL_STRIKE_EFFECT_DECISION_CHOICES
    | typeof TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES;
};
export type BattleHitPointHealingPoolAllocation = {
  readonly targetId: CombatantId;
  readonly hitPoints: Hp;
};
export type BattleHitPointHealingPoolDistributionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "hitPointHealingDistribution";
  readonly label: string;
  readonly requiresTableSpatialFact: true;
  readonly healingPool: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly rangeFeet: MovementFeet;
    readonly poolHitPoints: Hp;
    readonly perTargetCap: "halfHitPointMaximum";
  };
  readonly choices: readonly CombatantId[];
};
export type BattleDeathSavingThrowHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "deathSavingThrow";
  readonly label: string;
  readonly combatantId: CombatantId;
  readonly rollMode?: AttackRollMode;
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
};
export type BattleStatBlockRechargeRollHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "statBlockRechargeRoll";
  readonly label: string;
  readonly combatantId: CombatantId;
  readonly rechargeTargets: readonly BattleResourcePoolExecutionRef[];
};
export type BattleStatBlockRechargeRollResult = {
  readonly target: BattleResourcePoolExecutionRef;
  readonly roll: D6RollResult;
};
export type BattleConcentrationSavingThrowHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "concentrationSavingThrow";
  readonly label: string;
  readonly damageOccurrence: BattleDamageOccurrenceSource;
  readonly combatantId: CombatantId;
  readonly dc: DifficultyClass;
  readonly damageAmount: DamageAmount;
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  readonly rollMode?: AttackRollMode;
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
};
export type BattleInterruptDecisionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "interruptDecision";
  readonly label: string;
  readonly trigger: BattleInterruptTrigger;
  readonly eligibleResponders: readonly CombatantId[];
};
export type BattlePersistentAreaSourceTurnTranslationHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "persistentAreaSourceTurnTranslation";
  readonly label: string;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectRef: BattleEffectExecutionRef;
  readonly areaId: BattleAreaId;
  readonly distanceFeet: MovementFeet;
  readonly directionRequirement: "awayFromSource";
  readonly requiresTableSpatialFact: true;
};
export type BattleStartTurnOccurrenceOrderHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "startTurnOccurrenceOrder";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly occurrences: readonly [
    BattleStartTurnOccurrenceOption,
    BattleStartTurnOccurrenceOption,
    ...BattleStartTurnOccurrenceOption[],
  ];
};
export const BATTLE_TEMPORARY_HIT_POINT_CHOICES = [
  "keepExisting",
  "replaceWithGranted",
] as const;
export type BattleTemporaryHitPointChoice =
  (typeof BATTLE_TEMPORARY_HIT_POINT_CHOICES)[number];
export type BattleTemporaryHitPointChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "temporaryHitPointChoice";
  readonly label: string;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceTurn: {
    readonly actorId: CombatantId;
    readonly round: RoundType;
  };
  readonly occurrenceId: BattleStartTurnOccurrenceOption["occurrenceId"];
  readonly existingTemporaryHitPoints: Hp;
  readonly grantedTemporaryHitPoints: Hp;
};
export const BATTLE_START_TURN_OCCURRENCE_KINDS = [
  "deathSavingThrow",
  "statBlockRecharge",
  "turnStartTemporaryHitPoints",
  "spellConditionTurnStartDamage",
  "spellTurnStartDamageAndSave",
  "persistentAreaSourceTurnTranslation",
] as const;
export type BattleStartTurnOccurrenceKind =
  (typeof BATTLE_START_TURN_OCCURRENCE_KINDS)[number];
export type BattleStartTurnOccurrenceOption = {
  readonly occurrenceId: import("./identity.ts").BattleStartTurnOccurrenceId;
  readonly kind: BattleStartTurnOccurrenceKind;
  readonly label: string;
};
type BattleMovementHoleCommon = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "movement";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly movementBudgetFeet: MovementFeet;
  readonly speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: MovementFeet;
  }[];
};
export type BattleMovementHole = BattleMovementHoleCommon &
  (
    | { readonly brutalStrikeForcefulBlow?: never }
    | {
        readonly brutalStrikeForcefulBlow: BattleBrutalStrikeForcefulBlowMovementFact;
      }
  );
export type BattleControlledVerticalSuspensionAltitudeChangeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "controlledVerticalSuspensionAltitudeChange";
  readonly effectRef: BattleEffectExecutionRef;
  readonly label: string;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
  readonly directions: readonly BattleVerticalSuspensionAltitudeDirection[];
  readonly requiresTargetWithinRangeFact: true;
};
export type BattleControlledVerticalSuspensionInitialRiseHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "controlledVerticalSuspensionInitialRise";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
};
export type BattleAbilityCheckHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "abilityCheck";
  readonly label: string;
  readonly ability: Ability;
  readonly skill: Skill;
  readonly dc: DifficultyClass;
  readonly rollMode?: AttackRollMode;
  readonly requiresTableSpatialFact?: boolean;
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
};
export type BattleSpellcastingAbilityCheckHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellcastingAbilityCheck";
  readonly label: string;
  readonly dc: DifficultyClass;
  readonly rollMode?: AttackRollMode;
  readonly spellcastingAbilityCheck: {
    readonly casterId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly contestedSpellLevel: BattleSpellEffectLevel;
  } & (
    | {
        readonly target: Extract<
          BattleOngoingSpellTarget,
          { readonly kind: "magicalEffect" }
        > & { readonly effect: BattleOngoingSpellOccurrenceRef };
        readonly checkedOccurrence?: never;
      }
    | {
        readonly target: Exclude<
          BattleOngoingSpellTarget,
          { readonly kind: "magicalEffect" }
        >;
        readonly checkedOccurrence: {
          readonly ownerId: CombatantId;
          readonly effect: BattleOngoingSpellOccurrenceRef;
          readonly target?: never;
        };
      }
  );
  readonly requiresTableSpatialFact?: boolean;
  readonly d20TestNaturalOneRerolls?: readonly BattleD20TestNaturalOneRerollOption[];
};
export type BattleGrappleOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "grappleOutcome";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly dc: DifficultyClass;
  readonly mode: "grappleSave" | "escapeCheck";
  readonly rollMode?: AttackRollMode;
  readonly relationshipFactRequest?: BattleSavingThrowRelationshipFactRequest;
};
export type BattleShoveOutcomeValue =
  | {
      readonly succeeded: true;
    }
  | {
      readonly succeeded: false;
      readonly failedEffect:
        | { readonly kind: "prone" }
        | {
            readonly kind: "pushAway";
            readonly disposition: BattleShovePushDisposition;
          };
    };
export type BattleShoveOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "shoveOutcome";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly dc: DifficultyClass;
  readonly relationshipFactRequest?: BattleSavingThrowRelationshipFactRequest;
};
export type BattleTargetingSaveInterdictionOutcome =
  | {
      readonly saveSucceeded: true;
    }
  | {
      readonly saveSucceeded: false;
      readonly outcome:
        | { readonly kind: "loseAttackOrSpell" }
        | ({
            readonly kind: "newTarget";
            readonly targetId: CombatantId;
            readonly spatialFacts: readonly BattleTargetSpatialFact[];
          } & (
            | {
                readonly replacementTargetKind: "attackRoll";
                readonly relationshipFacts?: ReadonlyNonEmptyArray<BattleAttackRollRelationshipFact>;
              }
            | { readonly replacementTargetKind: "nonAttack" }
          ));
    };
type BattleTargetingSaveInterdictionOutcomeHoleBase = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetingSaveInterdictionOutcome";
  readonly label: string;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly triggeringProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly ability: Extract<Ability, "wis">;
  readonly dc: DcSource;
  readonly choices: readonly CombatantId[];
};
export type BattleTargetingSaveInterdictionOutcomeHole =
  BattleTargetingSaveInterdictionOutcomeHoleBase &
    (
      | {
          readonly replacementTargetKind: "attackRoll";
          readonly relationshipFactRequest?: Extract<
            BattleTargetChoiceRelationshipFactRequest,
            { readonly kind: "attackRollTargetIsEnemy" }
          >;
        }
      | { readonly replacementTargetKind: "nonAttack" }
    );
export type BattleAttackDamageDispositionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "attackDamageDisposition";
  readonly label: string;
  readonly damageOccurrence: BattleDamageOccurrenceSource;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly choices: readonly BattleAttackDamageDisposition[];
};
export type BattleOngoingSpellTargetChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "ongoingSpellTargetChoice";
  readonly label: string;
  readonly requiresTableSpatialFact: true;
  readonly casterId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly rangeFeet: MovementFeet;
  readonly choices: readonly BattleOngoingSpellTarget[];
};
export type BattleWildShapeEquipmentDispositionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "wildShapeEquipmentDisposition";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly formExecutionRef: BattleStatBlockExecutionScopeRef;
  readonly candidates: readonly WildShapeLoadoutObjectRef[];
};
export type BattleReadyDeclarationHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "readyDeclaration";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly responseChoices: readonly import("./battle-subjects.ts").BattleReadyResponse[];
};
export type BattleHole =
  | BattleTargetChoiceHole
  | BattleHelpAttackAllyDecisionHole
  | BattleHelpAttackEnemyDecisionHole
  | BattleSpellCastReactionFactsHole
  | BattleTurnConstraintSomaticSpellFailureOutcomeHole
  | BattleLinkedEffectSeparationFactsHole
  | BattleAreaWindStrengthHole
  | BattleObjectTargetChoiceHole
  | BattleObjectContactTargetsHole
  | BattleObjectContactSavingThrowOutcomeHole
  | BattleObjectDropResolutionHole
  | BattleSpellAreaChoiceHole
  | BattleTeleportDestinationHole
  | BattleSpatialMeleeSpellAttackProxyPositionHole
  | BattleHeldObjectFactsHole
  | BattleToolPossessionFactsHole
  | BattleCunningStrikeEndTurnCoverFactsHole
  | BattleSpawnedCompanionConnectionHole
  | BattleCompanionReappearancePlacementHole
  | BattleCompanionReappearanceInitiativeHole
  | BattleWeaponEnhancementTargetItemHole
  | BattleDamageTypeChoiceHole
  | BattleSpellTargetAllocationHole
  | BattleSpellTargetListHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleGrantedAreaSaveDamageActionDamageRollHole
  | BattleGlyphExplosiveRuneDamageRollHole
  | BattleSpellDamageReductionRollHole
  | BattleSourceDamageRollPenaltyRollHole
  | BattleDuplicateHitInterceptionRollHole
  | BattleSpellTurnStartDamageRollHole
  | BattleSpellTurnEndDamageRollHole
  | BattleCollisionRepositionPersistentAreaSaveDamageRollHole
  | BattleAreaMovementDistanceDamageRollHole
  | BattleStationaryPersistentAreaSaveDamageRollHole
  | BattleTranslatingPersistentAreaSaveDamageRollHole
  | BattleSpellHealingRollHole
  | BattleSpellSkillChoiceHole
  | BattleSpellAbilityChoiceHole
  | BattleSpellTargetAbilityChoicesHole
  | BattleSpellConditionChoiceHole
  | BattleTemporaryAbilityCheckRollModeActiveEffectCountHole
  | BattleCompelledBehaviorOptionChoiceHole
  | BattleSelfTransformationModeChoiceHole
  | BattleMovableLightPlacementHole
  | BattleSpellSavingThrowOutcomeHole
  | BattleGrantedAreaSaveDamageActionSavingThrowOutcomeHole
  | BattleGlyphExplosiveRuneSavingThrowOutcomeHole
  | BattleSpellTurnStartSavingThrowOutcomeHole
  | BattleStagedConditionRepeatSavingThrowOutcomeHole
  | BattleSaveGatedConditionRepeatSavingThrowOutcomeHole
  | BattlePersistentAreaSaveConditionSavingThrowOutcomeHole
  | BattlePersistentAreaSaveConditionEscapeSavingThrowOutcomeHole
  | BattlePersistentAreaSaveCompositeSavingThrowOutcomeHole
  | BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole
  | BattleTranslatingPersistentAreaSaveDamageSavingThrowOutcomeHole
  | BattleDirectionalPersistentAreaSavingThrowOutcomeHole
  | BattleDirectionalPersistentAreaDirectionChoiceHole
  | BattleSpellConditionEndTurnSavingThrowOutcomeHole
  | BattleSpellConditionCountedEndTurnSavingThrowOutcomeHole
  | BattleUnitFeatureConditionEndTurnSavingThrowOutcomeHole
  | BattleTurnConstraintEndTurnSavingThrowOutcomeHole
  | BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole
  | BattlePersistentAreaSaveDamageRamMovementHole
  | BattleMovableZoneRepositionMovementHole
  | BattleCollisionRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole
  | BattleDirectedRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole
  | BattleDirectedRepositionPersistentAreaSaveDamageRollHole
  | BattleProtectionRelevantEffectSavingThrowOutcomeHole
  | BattleUnitFeatureSavingThrowOutcomeHole
  | BattleUnitFeatureRollHole
  | BattleUnitFeatureDecisionHole
  | BattleHitPointHealingPoolDistributionHole
  | BattleDeathSavingThrowHole
  | BattleStatBlockRechargeRollHole
  | BattleConcentrationSavingThrowHole
  | BattleInterruptDecisionHole
  | BattleStartTurnOccurrenceOrderHole
  | BattleTemporaryHitPointChoiceHole
  | BattlePersistentAreaSourceTurnTranslationHole
  | BattleMovementHole
  | BattleControlledVerticalSuspensionAltitudeChangeHole
  | BattleControlledVerticalSuspensionInitialRiseHole
  | BattleAbilityCheckHole
  | BattleSpellcastingAbilityCheckHole
  | BattleGrappleOutcomeHole
  | BattleShoveOutcomeHole
  | BattleTargetingSaveInterdictionOutcomeHole
  | BattleAttackDamageDispositionHole
  | BattleDamageRelationshipDecisionHole
  | BattleOngoingSpellTargetChoiceHole
  | BattleWildShapeEquipmentDispositionHole
  | BattleReadyDeclarationHole;

export type BattleAttackRollResult = AttackRollResult & {
  readonly rolledD20s?: BattleD20TestRolledD20s;
  readonly activatedOngoingFeatureProcedureRef?: BattleProcedureExecutionRef;
  readonly missToHitReplacementProcedureRef?: BattleProcedureExecutionRef;
  readonly spellAttackReroll?: BattleSpellAttackRerollDecision;
  readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDecision;
};
export type BattleRolledDiceFill = {
  readonly kind: "rolledDice";
  readonly holeId: BattleHoleId;
  readonly value: readonly [RolledDiceGroup, ...RolledDiceGroup[]];
  readonly selectedAttackDamageRiderProcedureRefs?: readonly BattleProcedureExecutionRef[];
  readonly cunningStrikeOption?: BattleCunningStrikeOptionSelection;
  readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill;
  readonly attackDamageDieFloorChoice?: AttackDamageDieFloorChoiceFill;
  readonly attackDamageAbilityModifierChoice?: AttackDamageAbilityModifierChoiceFill;
  readonly spellDamageReroll?: BattleSpellDamageRerollDecision;
};
export const ATTACK_DAMAGE_DIE_FLOOR_CHOICE_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE =
  "Attack damage die floor choices are not available for this damage-roll owner.";
export function attackDamageDieFloorChoiceUnsupportedIssue(
  damageRoll: BattleRolledDiceFill,
): string | null {
  return damageRoll.attackDamageDieFloorChoice === undefined
    ? null
    : ATTACK_DAMAGE_DIE_FLOOR_CHOICE_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE;
}
export const ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE =
  "Attack damage ability modifier choices are not available for this damage-roll owner.";
export function attackDamageAbilityModifierChoiceUnsupportedIssue(
  damageRoll: BattleRolledDiceFill,
): string | null {
  return damageRoll.attackDamageAbilityModifierChoice === undefined
    ? null
    : ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE;
}
export function validateRolledDiceFillForDiceExpr(
  fill: BattleRolledDiceFill,
  expr: DiceExpr,
): string | null {
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(fill);
  if (spellDamageRerollIssue !== null) {
    return spellDamageRerollIssue;
  }
  const attackDamageDieFloorChoiceIssue =
    attackDamageDieFloorChoiceUnsupportedIssue(fill);
  if (attackDamageDieFloorChoiceIssue !== null) {
    return attackDamageDieFloorChoiceIssue;
  }
  const attackDamageAbilityModifierChoiceIssue =
    attackDamageAbilityModifierChoiceUnsupportedIssue(fill);
  if (attackDamageAbilityModifierChoiceIssue !== null) {
    return attackDamageAbilityModifierChoiceIssue;
  }
  const cunningStrikeSelectionIssue = cunningStrikeOptionUnsupportedIssue(fill);
  if (cunningStrikeSelectionIssue !== null) {
    return cunningStrikeSelectionIssue;
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, expr);
  return validation === null ? null : validation.reason;
}
export const CUNNING_STRIKE_OPTION_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE =
  "Cunning Strike options are not available for this damage-roll owner.";
export function cunningStrikeOptionUnsupportedIssue(
  damageRoll: BattleRolledDiceFill,
): string | null {
  return damageRoll.cunningStrikeOption === undefined
    ? null
    : CUNNING_STRIKE_OPTION_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE;
}
export type SpellDamageReductionRoll = {
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly targetId: CombatantId;
  readonly damageType: DamageType;
  readonly amount: {
    readonly dice: 1;
    readonly dieSize: 4;
  };
};
export type SourceDamageRollPenaltyFill = {
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly affectedCombatantId: CombatantId;
  readonly damageRollHoleId: BattleHoleId;
  readonly roll: DieRollResult;
};
export type SourceDamageRollPenaltyRoll = Omit<
  SourceDamageRollPenaltyFill,
  "roll"
> & {
  readonly amount: {
    readonly dice: 1;
    readonly dieSize: 8;
  };
};
export type BattleMovementFill = {
  readonly kind: "movement";
  readonly holeId: BattleHoleId;
  readonly value: BattleMovementFillValue;
};
export type BattlePersistentAreaSourceTurnTranslationFill = {
  readonly kind: "persistentAreaSourceTurnTranslation";
  readonly holeId: BattleHoleId;
  readonly value: {
    readonly affectedCombatantIdsInResolutionOrder: readonly CombatantId[];
  };
};
export type BattleStartTurnOccurrenceOrderFill = {
  readonly kind: "startTurnOccurrenceOrder";
  readonly holeId: BattleHoleId;
  readonly value: {
    readonly occurrenceIds: readonly [
      import("./identity.ts").BattleStartTurnOccurrenceId,
      import("./identity.ts").BattleStartTurnOccurrenceId,
      ...import("./identity.ts").BattleStartTurnOccurrenceId[],
    ];
  };
};
export type BattleTemporaryHitPointChoiceFill = {
  readonly kind: "temporaryHitPointChoice";
  readonly holeId: BattleHoleId;
  readonly value: BattleTemporaryHitPointChoice;
};
export type BattleBrutalStrikeForcefulBlowMovementFill = {
  readonly kind: "movement";
  readonly holeId: BattleHoleId;
  readonly value: BattleBrutalStrikeForcefulBlowMovementFillValue;
};
export type BattleFill =
  | BattleTemporaryHitPointChoiceFill
  | {
      readonly kind: "readyDeclaration";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly trigger: import("./battle-subjects.ts").ReadyTriggerDescription;
        readonly response: import("./battle-subjects.ts").BattleReadyResponse;
      };
    }
  | {
      readonly kind: "helpAttackAllyDecision";
      readonly holeId: BattleHoleId;
      readonly allyId: CombatantId;
    }
  | {
      readonly kind: "helpAttackEnemyDecision";
      readonly holeId: BattleHoleId;
      readonly targetEnemyId: CombatantId;
      readonly targetWithinFiveFeetOfHelper: boolean;
    }
  | {
      readonly kind: "attackRoll";
      readonly holeId: BattleHoleId;
      readonly value: BattleAttackRollResult;
      readonly relationshipFacts?: ReadonlyNonEmptyArray<BattleAttackRollRelationshipFact>;
    }
  | BattleRolledDiceFill
  | {
      readonly kind: "damageTypeChoice";
      readonly holeId: BattleHoleId;
      readonly value: DamageType;
    }
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: BattleHoleId;
      readonly value: BattleSavingThrowOutcomeValue;
      readonly spatialFacts?: readonly BattleTargetSpatialFact[];
      readonly relationshipFacts?: ReadonlyNonEmptyArray<BattleSavingThrowRelationshipFact>;
    }
  | {
      readonly kind: "conditionChoice";
      readonly holeId: BattleHoleId;
      readonly value: Condition;
    }
  | {
      readonly kind: "skillChoice";
      readonly holeId: BattleHoleId;
      readonly value: Skill;
    }
  | {
      readonly kind: "abilityChoice";
      readonly holeId: BattleHoleId;
      readonly value: Ability;
    }
  | {
      readonly kind: "targetAbilityChoices";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly choices: readonly {
          readonly targetId: CombatantId;
          readonly ability: Ability;
        }[];
      };
    }
  | {
      readonly kind: "temporaryAbilityCheckRollModeActiveEffectCount";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly activeOneMinuteEffectCount: number;
      };
    }
  | {
      readonly kind: "compelledBehaviorOptionChoice";
      readonly holeId: BattleHoleId;
      readonly value: BattleCompelledBehaviorOption;
    }
  | {
      readonly kind: "selfTransformationModeChoice";
      readonly holeId: BattleHoleId;
      readonly value: SelfTransformationModeKind;
    }
  | {
      readonly kind: "wildShapeEquipmentDisposition";
      readonly holeId: BattleHoleId;
      readonly value: WildShapeEquipmentDispositionFillValue;
    }
  | {
      readonly kind: "movableLightPlacement";
      readonly holeId: BattleHoleId;
      readonly value: BattleMovableLightPlacementValue;
    }
  | {
      readonly kind: "unitFeatureDecision";
      readonly holeId: BattleHoleId;
      readonly value:
        | "use"
        | "attempt"
        | OpenHandTechniqueDecisionChoice
        | BrutalStrikeEffectDecisionChoice
        | TacticalMasterReplacementDecision;
    }
  | {
      readonly kind: "hitPointHealingDistribution";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly allocations: readonly BattleHitPointHealingPoolAllocation[];
      };
      readonly spatialFacts: readonly BattleTargetSpatialFact[];
    }
  | {
      readonly kind: "heldObjectFacts";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly objectIds: readonly BattleObjectId[];
      };
    }
  | {
      readonly kind: "toolPossessionFacts";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly toolIdsOnPerson: readonly "poisoners_kit"[];
      };
    }
  | {
      readonly kind: "cunningStrikeEndTurnCoverFacts";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly cover: CunningStrikeEndTurnCoverDegree;
      };
    }
  | {
      readonly kind: "spawnedCompanionConnection";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly withinRange: true;
      };
    }
  | {
      readonly kind: "companionReappearancePlacement";
      readonly holeId: BattleHoleId;
      readonly value: BattleCompanionPlacement;
    }
  | {
      readonly kind: "companionReappearanceInitiative";
      readonly holeId: BattleHoleId;
      readonly value: InitiativeScore;
    }
  | {
      readonly kind: "weaponAttackDamageEnhancementTargetItem";
      readonly holeId: BattleHoleId;
      readonly value: BattleWeaponEnhancementTargetItemFact;
    }
  | {
      readonly kind: "targetChoice";
      readonly holeId: BattleHoleId;
      readonly value: CombatantId;
      readonly spatialFacts?: readonly BattleTargetSpatialFact[];
      readonly relationshipFacts?: ReadonlyNonEmptyArray<BattleTargetChoiceRelationshipFact>;
    }
  | BattleDamageRelationshipDecisionFill
  | {
      readonly kind: "targetSpatialFacts";
      readonly holeId: BattleHoleId;
      readonly spatialFacts: readonly BattleTargetSpatialFact[];
    }
  | {
      readonly kind: "areaWindStrength";
      readonly holeId: BattleHoleId;
      readonly value: BattleAreaWindStrength;
    }
  | {
      readonly kind: "turnConstraintSomaticSpellFailureOutcome";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly spellFailed: boolean;
      };
    }
  | {
      readonly kind: "objectTargetChoice";
      readonly holeId: BattleHoleId;
      readonly value: BattleObjectId;
      readonly spatialFacts: readonly Extract<
        BattleTargetSpatialFact,
        {
          readonly kind:
            | "spellObjectLightTarget"
            | "spellDistantObjectLightTarget"
            | "spellTouchedObjectTarget"
            | "spellDistantTouchedObjectTarget"
            | "spellObjectIgnition"
            | "spellManufacturedMetalObjectTarget"
            | "spellObjectTarget"
            | "spellObjectTargetSight"
            | "attackObjectTarget";
        }
      >[];
    }
  | {
      readonly kind: "ongoingSpellTargetChoice";
      readonly holeId: BattleHoleId;
      readonly value: BattleOngoingSpellTarget;
      readonly spatialFacts: readonly BattleOngoingSpellTargetWithinRangeFact[];
    }
  | {
      readonly kind: "objectContactTargets";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly targetIds: readonly CombatantId[];
      };
      readonly spatialFacts: readonly BattleObjectContactTargetSpatialFact[];
    }
  | {
      readonly kind: "objectDropResolution";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly outcomes: readonly BattleObjectDropResolution[];
      };
    }
  | {
      readonly kind: "spellAreaChoice";
      readonly holeId: BattleHoleId;
      readonly value: BattleSpellAreaIdentityChoice;
    }
  | {
      readonly kind: "directionalPersistentAreaDirectionChoice";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly directionId: BattleLineDirectionId;
      };
    }
  | {
      readonly kind: "movableZoneRamMovement";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly moveFeet: MovementFeet;
      };
    }
  | {
      readonly kind: "movableZoneRepositionMovement";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly moveFeet: MovementFeet;
      };
    }
  | {
      readonly kind: "teleportDestination";
      readonly holeId: BattleHoleId;
      readonly value: BattleTeleportDestinationFact;
    }
  | {
      readonly kind: "spatialMeleeSpellAttackProxyPosition";
      readonly holeId: BattleHoleId;
      readonly value: BattleSpatialMeleeSpellAttackProxyPosition;
    }
  | {
      readonly kind: "spellTargetAllocation";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly allocations: readonly BattleSpellTargetAllocation[];
      };
      readonly spatialFacts: readonly BattleSpellTargetAllocationSpatialFact[];
    }
  | {
      readonly kind: "spellTargetList";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly targetIds: readonly CombatantId[];
      };
      readonly spatialFacts: readonly BattleSpellTargetListSpatialFact[];
      readonly relationshipFacts?: ReadonlyNonEmptyArray<BattleSpellTargetListRelationshipFact>;
    }
  | {
      readonly kind: "deathSavingThrow";
      readonly holeId: BattleHoleId;
      readonly value: DieRollResult;
      readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDieDecision;
    }
  | {
      readonly kind: "statBlockRechargeRoll";
      readonly holeId: BattleHoleId;
      readonly value: readonly BattleStatBlockRechargeRollResult[];
    }
  | {
      readonly kind: "concentrationSavingThrow";
      readonly holeId: BattleHoleId;
      readonly value: BattleConcentrationSavingThrowValue;
    }
  | {
      readonly kind: "attackDamageDisposition";
      readonly holeId: BattleHoleId;
      readonly value: BattleAttackDamageDisposition;
    }
  | {
      readonly kind: "targetingSaveInterdictionOutcome";
      readonly holeId: BattleHoleId;
      readonly value: BattleTargetingSaveInterdictionOutcome;
    }
  | {
      readonly kind: "interruptDecision";
      readonly holeId: BattleHoleId;
      readonly value: BattleInterruptDecision;
    }
  | BattlePersistentAreaSourceTurnTranslationFill
  | BattleStartTurnOccurrenceOrderFill
  | BattleMovementFill
  | {
      readonly kind: "controlledVerticalSuspensionAltitudeChange";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly direction: BattleVerticalSuspensionAltitudeDirection;
        readonly distanceFeet: MovementFeet;
      };
      readonly spatialFacts: readonly BattleTargetSpatialFact[];
    }
  | {
      readonly kind: "controlledVerticalSuspensionInitialRise";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly distanceFeet: MovementFeet;
      };
    }
  | {
      readonly kind: "abilityCheck";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly total: number;
        readonly naturalD20?: DieRollResult;
        readonly rolledD20s?: BattleD20TestRolledD20s;
        readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDecision;
      };
      readonly spatialFacts?: readonly BattleAbilityCheckSpatialFact[];
    }
  | {
      readonly kind: "grappleOutcome";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly succeeded: boolean;
      };
      readonly relationshipFacts?: ReadonlyNonEmptyArray<BattleSavingThrowRelationshipFact>;
    }
  | {
      readonly kind: "shoveOutcome";
      readonly holeId: BattleHoleId;
      readonly value: BattleShoveOutcomeValue;
      readonly relationshipFacts?: ReadonlyNonEmptyArray<BattleSavingThrowRelationshipFact>;
    };

export type BattleResolutionCandidateInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};
export type BattleResolutionInput = BattleResolutionCandidateInput;
export type BattleResolutionInputForSubject<TSubject extends BattleSubject> =
  Omit<BattleResolutionCandidateInput, "subject"> & {
    readonly subject: TSubject;
  };
declare const admittedBattleResolutionInput: unique symbol;
type AdmittedBattleResolutionBrand = {
  readonly [admittedBattleResolutionInput]: true;
};
type DruidWildShapeSubject = Extract<
  BattleSubject,
  { readonly tag: "druidWildShape" }
>;
type UnitFeatureSubject = Extract<
  BattleSubject,
  { readonly tag: "unitFeature" }
>;
type BonusActionStandardActionAdmissionFacts =
  | {
      readonly admissionKind: "bonusActionStandardActionRejection";
      readonly subject: BonusActionStandardActionSubject;
      readonly bonusActionStandardActionRejection: {
        readonly reason: "staleSubject" | "unsupportedActOption";
        readonly message: string;
      };
    }
  | {
      readonly admissionKind: "bonusActionStandardAction";
      readonly subject: Extract<
        BonusActionStandardActionSubject,
        { readonly action: "dash" }
      >;
      readonly bonusActionStandardActionAdmission: {
        readonly actor: CharacterBattleCreatureState;
        readonly procedure: { readonly kind: "grantedAlternateActionCost" };
      };
    }
  | {
      readonly admissionKind: "bonusActionStandardAction";
      readonly subject: BonusActionStandardActionSubject;
      readonly bonusActionStandardActionAdmission: {
        readonly actor: CharacterBattleCreatureState;
        readonly procedure: {
          readonly kind: "supportedAlternateActionCost";
          readonly procedure: Extract<
            CharacterUnitProcedureExecution,
            { readonly kind: "unitSupportProfile" }
          > & {
            readonly execution: Extract<
              UnitSupportProcedureExecution,
              { readonly kind: "alternateActionCost" }
            >;
          };
        };
      };
    }
  | {
      readonly admissionKind: "bonusActionStandardAction";
      readonly subject: Extract<
        BonusActionStandardActionSubject,
        { readonly action: "dash" }
      >;
      readonly bonusActionStandardActionAdmission: {
        readonly actor: CharacterBattleCreatureState;
        readonly procedure: {
          readonly kind: "dashTemporaryHitPoints";
          readonly procedure:
            | (Extract<
                CharacterUnitProcedureExecution,
                { readonly kind: "unitFeature" }
              > & {
                readonly execution: Extract<
                  UnitFeatureProcedureExecution,
                  { readonly kind: "bonusActionDashTemporaryHitPoints" }
                >;
              })
            | (Extract<
                CharacterUnitProcedureExecution,
                { readonly kind: "unitSupportProfile" }
              > & {
                readonly execution: Extract<
                  UnitSupportProcedureExecution,
                  { readonly kind: "bonusActionDashTemporaryHitPoints" }
                >;
              });
        };
      };
    };
type UnitFeatureAdmissionFacts = {
  readonly admissionKind: "unitFeature";
  readonly unitFeatureAdmission: {
    readonly actor: CharacterBattleCreatureState;
    readonly procedure: Extract<
      CharacterUnitProcedureExecution,
      { readonly kind: "unitFeature" }
    >;
  };
};
type DruidWildShapeAdmissionFacts = {
  readonly admissionKind: "druidWildShape";
  readonly wildShapeAdmission: {
    readonly actor: CharacterBattleCreatureState;
    readonly procedure: {
      readonly kind: "unitFeature";
      readonly source: Extract<
        CharacterUnitProcedureSource,
        { readonly kind: "resourcePool" }
      >;
      readonly execution: Extract<
        UnitFeatureProcedureExecution,
        { readonly kind: "druidWildShapeKnownForm" }
      >;
    };
  };
};
type AdmittedBonusActionStandardActionMember<
  TInput extends BattleResolutionInput,
  TFacts extends BonusActionStandardActionAdmissionFacts =
    BonusActionStandardActionAdmissionFacts,
> = TFacts extends BonusActionStandardActionAdmissionFacts
  ? Omit<TInput, "subject"> &
      AdmittedBattleResolutionBrand &
      TFacts & {
        readonly subject: Extract<TInput["subject"], TFacts["subject"]>;
      }
  : never;
export type AdmittedBattleResolutionInputFor<
  TInput extends BattleResolutionInput,
> = TInput extends BattleResolutionInput
  ? AdmittedBattleResolutionInputMember<TInput>
  : never;

type AdmittedBattleResolutionInputMember<TInput extends BattleResolutionInput> =
  | ([
      Exclude<
        TInput["subject"],
        | BonusActionStandardActionSubject
        | DruidWildShapeSubject
        | UnitFeatureSubject
      >,
    ] extends [never]
      ? never
      : Omit<TInput, "subject"> &
          AdmittedBattleResolutionBrand & {
            readonly admissionKind: "general";
            readonly subject: Exclude<
              TInput["subject"],
              | BonusActionStandardActionSubject
              | DruidWildShapeSubject
              | UnitFeatureSubject
            >;
          })
  | ([Extract<TInput["subject"], UnitFeatureSubject>] extends [never]
      ? never
      : Omit<TInput, "subject"> &
          AdmittedBattleResolutionBrand &
          UnitFeatureAdmissionFacts & {
            readonly subject: Extract<TInput["subject"], UnitFeatureSubject>;
          })
  | ([Extract<TInput["subject"], DruidWildShapeSubject>] extends [never]
      ? never
      : Omit<TInput, "subject"> &
          AdmittedBattleResolutionBrand &
          DruidWildShapeAdmissionFacts & {
            readonly subject: Extract<TInput["subject"], DruidWildShapeSubject>;
          })
  | ([Extract<TInput["subject"], BonusActionStandardActionSubject>] extends [
      never,
    ]
      ? never
      : AdmittedBonusActionStandardActionMember<TInput>);
export type AdmittedBattleResolutionInput =
  AdmittedBattleResolutionInputFor<BattleResolutionInput>;
export type AdmittedBonusActionStandardActionBattleResolutionInput = Extract<
  AdmittedBattleResolutionInput,
  { readonly admissionKind: "bonusActionStandardAction" }
>;
export type AdmittedBonusActionStandardActionRejectionBattleResolutionInput =
  Extract<
    AdmittedBattleResolutionInput,
    { readonly admissionKind: "bonusActionStandardActionRejection" }
  >;
export type BattleInterruptRouteOptions =
  | {
      readonly replayingInterruptedProcedure?: never;
      readonly handledInterruptTrigger?: BattleInterruptTrigger;
      readonly handledInterruptOccurrence?: never;
      readonly replayParentPosition?: never;
      readonly pendingAttackDamageReductions?: never;
      readonly pendingAttackDamageAdditions?: never;
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: never;
    }
  | (BattleHandledInterruptRouteProjection & {
      readonly replayingInterruptedProcedure: true;
      readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
      readonly objectOutcomes?: BattleObjectOutcomeAccumulation;
      readonly pendingAttackDamageReductions?: ReadonlyNonEmptyArray<BattlePendingAttackDamageReduction>;
      readonly pendingAttackDamageAdditions?: ReadonlyNonEmptyArray<AttackSpellDamageAddition>;
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: BattleSpatialMeleeSpellAttackProxyCommitCheckpoint;
    });
export type BattleInterruptConsumerOptions =
  | {
      readonly replayingInterruptedProcedure?: never;
      readonly handledInterruptTrigger?: BattleInterruptTrigger;
      readonly replayParentPosition?: never;
      readonly pendingAttackDamageReductions?: never;
      readonly pendingAttackDamageAdditions?: never;
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: never;
    }
  | {
      readonly replayingInterruptedProcedure: true;
      readonly handledInterruptTrigger: BattleInterruptTrigger;
      readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
      readonly pendingAttackDamageReductions?: ReadonlyNonEmptyArray<BattlePendingAttackDamageReduction>;
      readonly pendingAttackDamageAdditions?: ReadonlyNonEmptyArray<AttackSpellDamageAddition>;
      readonly spatialMeleeSpellAttackProxyCommitCheckpoint?: BattleSpatialMeleeSpellAttackProxyCommitCheckpoint;
    };
export type AttackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "attack" }>
> &
  BattleInterruptConsumerOptions;
export type MultiattackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "multiattack" }
  >
>;
export type OffHandAttackBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
    >
  > &
    BattleInterruptConsumerOptions;
export type MartialArtsBonusUnarmedStrikeBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "bonusAction";
        readonly action: "martialArtsUnarmedStrike";
      }
    >
  > &
    BattleInterruptConsumerOptions;
export type StatBlockBonusActionOptionBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "bonusAction";
        readonly action: "statBlockActionOption";
      }
    >
  >;
export type HideBattleResolutionInput = BattleResolutionInputForSubject<
  | ActionHideSubject
  | (Extract<BattleSubject, { readonly tag: "bonusActionStandardAction" }> & {
      readonly action: "hide";
    })
>;
export type BonusActionStandardActionBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "bonusActionStandardAction" }>
  >;
export type SearchBattleResolutionInput =
  BattleResolutionInputForSubject<ActionSearchSubject>;
export type GrappleBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "grapple" }>
>;
export type ShoveBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "shove" }>
>;
export type EscapeGrappleBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "escapeGrapple" }
    >
  >;
export type EscapeSpellRestraintBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
    >
  >;
export type ActionSpellBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "actionSpell" }>
> &
  BattleInterruptConsumerOptions &
  (
    | {
        readonly reactionContinuation?: {
          readonly subject: BattleSubject;
          readonly fills: readonly BattleFill[];
        };
        readonly glyphStoredSpellReleaseReplay?: never;
      }
    | {
        readonly reactionContinuation?: never;
        readonly glyphStoredSpellReleaseReplay: GlyphStoredSpellReleaseReplayInput;
      }
  );
export type BonusActionSpellBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "bonusActionSpell" }>
  > &
    BattleInterruptConsumerOptions & {
      readonly reactionContinuation?: {
        readonly subject: BattleSubject;
        readonly fills: readonly BattleFill[];
      };
    };
export type BonusActionDashSpellBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "bonusActionDashSpell" }>
  > & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  };
export type UnitFeatureBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "unitFeature" }>
>;
export type UnitFeatureHeldWeaponActivationBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "unitFeatureHeldWeaponActivation" }>
  >;
export type MonkFocusOptionBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "monkFocusOption" }>
  >;
export type MonkFocusFlurryOfBlowsStrikeBattleResolutionInput =
  BattleResolutionInputForSubject<MonkFocusFlurryOfBlowsStrikeSubject> &
    BattleInterruptConsumerOptions;
export type DruidWildShapeBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "druidWildShape" }>
  >;

type WithAdmittedSubject<TInput extends BattleResolutionInput> =
  AdmittedBattleResolutionInputFor<TInput>;

export type AdmittedActionSpellBattleResolutionInput =
  WithAdmittedSubject<ActionSpellBattleResolutionInput>;
export type AdmittedBonusActionSpellBattleResolutionInput =
  WithAdmittedSubject<BonusActionSpellBattleResolutionInput>;
export type AdmittedBonusActionDashSpellBattleResolutionInput =
  WithAdmittedSubject<BonusActionDashSpellBattleResolutionInput>;
export type AdmittedUnitFeatureBattleResolutionInput =
  WithAdmittedSubject<UnitFeatureBattleResolutionInput>;
export type AdmittedUnitFeatureHeldWeaponActivationBattleResolutionInput =
  WithAdmittedSubject<UnitFeatureHeldWeaponActivationBattleResolutionInput>;
export type AdmittedMonkFocusOptionBattleResolutionInput =
  WithAdmittedSubject<MonkFocusOptionBattleResolutionInput>;
export type AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput =
  WithAdmittedSubject<MonkFocusFlurryOfBlowsStrikeBattleResolutionInput>;
export type AdmittedDruidWildShapeBattleResolutionInput =
  WithAdmittedSubject<DruidWildShapeBattleResolutionInput>;

export const BATTLE_INVALID_REASON_CODES = [
  "staleSubject",
  "wrongActor",
  "missingCombatant",
  "invalidFill",
  "unsupportedSubject",
  "unsupportedActOption",
] as const;
export type BattleInvalidReasonCode =
  (typeof BATTLE_INVALID_REASON_CODES)[number];

export type BattleResolutionCheckpointBoundary =
  | { readonly kind: "durableInterruptCheckpoint" }
  | { readonly kind: "durableContinuationCheckpoint" };

export const DURABLE_CONTINUATION_CHECKPOINT_BOUNDARY = {
  kind: "durableContinuationCheckpoint",
} as const satisfies BattleResolutionCheckpointBoundary;

export type BattleResolutionResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
      readonly objectDamages?: readonly BattleObjectDamageOutcome[];
      readonly objectIgnitions?: readonly BattleObjectIgnitionOutcome[];
      readonly droppedObjects?: readonly BattleDroppedObjectOutcome[];
      readonly shovePushes?: readonly BattleShovePushOutcome[];
      readonly teleports?: readonly BattleTeleportOutcome[];
      readonly movements?: readonly BattleResolvedMovement[];
    }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly subject: BattleSubject;
      readonly holes: readonly BattleHole[];
      readonly snapshot: BattleSnapshot;
      /** Set when this result advances the runtime's durable checkpoint. */
      readonly checkpointBoundary?: BattleResolutionCheckpointBoundary;
      readonly routeEvents?: BattleReducerRouteEvents;
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
    };
export type BattleFallingCreatureMitigationLandingResult =
  | {
      readonly tag: "mitigated";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
      readonly targetId: CombatantId;
      readonly fallDamagePrevented: true;
      readonly fallingPronePrevented: true;
    }
  | {
      readonly tag: "unmitigated";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
      readonly targetId: CombatantId;
      readonly fallDamagePrevented: false;
      readonly fallingPronePrevented: false;
    }
  | {
      readonly tag: "invalid";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
      readonly reason: "missingCombatant";
      readonly message: string;
    };
export type BattleRawFallDamage = {
  readonly kind: "rawFallDamage";
  readonly amount: DamageAmount;
};
export type BattleFallDamageLandingResult =
  | {
      readonly tag: "landed";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly incomingFallDamage: DamageAmount;
      readonly effectiveFallDamage: DamageAmount;
      readonly fallDamagePrevented: boolean;
      readonly fallingPronePrevented: boolean;
      readonly fallDamageReductionAmount: DamageAmount;
      readonly fallingCreatureMitigated: boolean;
    }
  | {
      readonly tag: "invalid";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly reason: "missingCombatant";
      readonly message: string;
    };

/**
 * Durable committed mechanical checkpoint for a Battle Runtime state.
 * Continuation frontiers, allocation/replay bookkeeping, and presentation
 * joins are projected separately.
 */
export type BattleSnapshot = {
  readonly battleId: BattleId;
  readonly round: RoundType;
  readonly currentActorId: CombatantId;
  readonly turnOrder: readonly CombatantId[];
  readonly combatants: readonly BattleCreatureSnapshot[];
  readonly companions: readonly BattleCompanionSnapshot[];
  readonly storedLightEmitters: readonly BattleStoredLightEmitter[];
  readonly lightEmitters: readonly BattleLightEmitter[];
  readonly obscurementZones: readonly BattleObscurementZone[];
  readonly turn: BattleTurnSnapshot;
  readonly readiedResponses: {
    readonly spells: readonly BattleReadiedSpellSnapshot[];
    readonly actionsOrMovements: readonly BattleReadiedResponseSnapshot[];
  };
  readonly helpAttackMarkers: readonly BattleHelpAttackSnapshot[];
};

/**
 * The mechanical frontier for choosing an interrupt procedure.
 *
 * This is intentionally not part of BattleSnapshot: a frontier describes an
 * open decision in an in-flight execution, while BattleSnapshot is the
 * durable committed mechanical checkpoint callers can persist.
 */
export type BattleInterruptDecisionFrontier = {
  readonly kind: "interruptDecision";
  readonly trigger: BattleInterruptTrigger;
  readonly decisionHole: BattleInterruptDecisionHole;
  readonly choices: ReadonlyNonEmptyArray<BattleInterruptProcedureChoice>;
  readonly stackDepth: BattleReplayStackDepth;
};

type BattleCreatureSnapshotCommon = {
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly nextEffectOrdinal: BattleEffectExecutionOrdinal;
  readonly activeEffectOccurrences: readonly {
    readonly kind: "activeEffect";
    readonly effectRef: BattleEffectExecutionRef;
    readonly activeEffectKind: BattleActiveEffect["kind"];
    readonly location: BattleActiveEffectOccurrenceLocation;
  }[];
  readonly armorClass: ArmorClass;
  readonly size: Size;
  readonly zeroHpLifecycle: BattleCreatureZeroHpLifecycleSnapshot;
  readonly conditions: readonly Condition[];
  readonly concentrating: boolean;
  readonly dodging: boolean;
  readonly reactionAvailable: boolean;
  readonly movement: {
    readonly speedFeet: MovementFeet;
    readonly spentFeet: MovementFeet;
    readonly remainingFeet: MovementFeet;
    readonly speedKinds: readonly {
      readonly kind: BattleMovementSpeedKind;
      readonly speedFeet: MovementFeet;
      readonly remainingFeet: MovementFeet;
    }[];
  };
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
};

export type BattleActiveEffectOccurrenceLocation =
  | { readonly kind: "nonSpatial" }
  | { readonly kind: "area"; readonly areaId: BattleAreaId }
  | {
      readonly kind: "line";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
    }
  | { readonly kind: "object"; readonly objectId: BattleObjectId };

export type BattleCreatureSnapshot = BattleCreatureSnapshotCommon &
  (
    | {
        readonly origin: Extract<
          BattleCreatureOriginSnapshot,
          { readonly kind: "character" }
        >;
      }
    | {
        readonly origin: Extract<
          BattleCreatureOriginSnapshot,
          { readonly kind: "statBlock" }
        >;
      }
  );

export type BattlePresentedCreatureSnapshot = BattleCreatureSnapshot & {
  readonly displayName: import("./battle-creature-display-name.ts").BattleCreatureDisplayName;
};

export type BattlePresentedSnapshot = Omit<BattleSnapshot, "combatants"> & {
  readonly combatants: readonly BattlePresentedCreatureSnapshot[];
};

export type BattleSnapshotPresentationIssue = {
  readonly tag: "battleSnapshotPresentationIssue";
  readonly reason: "missingStatBlockPresentation" | "invalidDisplayName";
  readonly combatantId: CombatantId;
};

export type BattleInterruptChoicePresentationIssue = {
  readonly tag: "battleInterruptChoicePresentationIssue";
  readonly reason: "missingSubjectPresentation";
  readonly responderId: CombatantId;
  readonly choiceKind: Exclude<
    BattleInterruptProcedureChoice,
    { readonly kind: "reactionModifier" }
  >["kind"];
  readonly subject: BattleSubject;
};

export type BattlePresentationIssue =
  | BattleSnapshotPresentationIssue
  | BattleInterruptChoicePresentationIssue;

export type BattleSnapshotPresentationIssues =
  ReadonlyNonEmptyArray<BattleSnapshotPresentationIssue>;

export type BattleInterruptChoicePresentationIssues =
  ReadonlyNonEmptyArray<BattleInterruptChoicePresentationIssue>;

export type BattlePresentationIssues =
  ReadonlyNonEmptyArray<BattlePresentationIssue>;

export type BattleTurnSnapshot = {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly actionTakenThisTurn: boolean;
  /** The current turn's unspent Bonus Action quota, not discovered action availability. */
  readonly bonusActionQuotaAvailable: boolean;
  readonly jumpDistanceMultiplier: BattleJumpDistanceMultiplier | null;
  readonly heightenedStepOfTheWindCarriedCreatures: readonly HeightenedStepOfTheWindCarriedCreature[];
  readonly spellSlotUsesThisTurn: readonly BattleTurnSpellSlotUse[];
  readonly levelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly quickenedLevelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly attackRollMadeThisTurn: boolean;
  readonly brutalStrikeChosenThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly stunningStrikesUsedThisTurn: readonly StunningStrikeUsage[];
  readonly recklessAttackWhileRagingUsedThisTurn: readonly RecklessAttackWhileRagingUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
  readonly weaponMasteryCleaveAttackersUsedThisTurn: readonly CombatantId[];
  readonly huntersPreyHordeBreakerUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly grapplerPunchAndGrabUsedThisTurn: readonly CombatantId[];
  readonly lightWeaponAttackMade?: {
    readonly weaponItemId: BattleObjectId;
  };
  readonly dashMovementBonusFeet: MovementFeet;
  readonly disengaged: boolean;
};

export type BattleReadiedSpellSnapshot = BattleReadiedSpell & {
  readonly casterId: CombatantId;
};

export type BattleReadiedResponseSnapshot = Omit<
  BattleReadiedResponse,
  "response"
> & {
  readonly actorId: CombatantId;
  readonly response: import("./battle-subjects.ts").BattleReadyResponseSnapshot;
};

export type BattleHelpAttackSnapshot = BattleHelpAttack;

export type BattleCreatureOriginSnapshot =
  | {
      readonly kind: "character";
      // Authored identity retained for settlement / catalog reference. Not an
      // execution or replay key.
      readonly characterId: CharacterId;
      readonly execution: {
        readonly scopeRef: BattleCharacterExecutionScopeRef;
        readonly procedureBindings: readonly CharacterProcedureBindingSnapshot[];
      };
      readonly attackExecution: {
        readonly scopeRef: BattleAttackExecutionScopeRef;
        readonly attackProcedureRef: BattleAttackProcedureExecutionRef | null;
        readonly unarmedStrikeProcedureRef: BattleAttackProcedureExecutionRef;
        readonly offHandAttackProcedureRef: BattleAttackProcedureExecutionRef | null;
      };
      readonly resources: readonly BattleCharacterResourceSnapshot[];
      readonly druidWildShapeAvailableForms: readonly {
        readonly statBlockId: StatBlockId;
        readonly execution: StatBlockExecutionSnapshot;
      }[];
      readonly spellcasting: {
        readonly spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"];
      } | null;
    }
  | {
      readonly kind: "statBlock";
      // Authored identity retained for settlement / companion reappearance. Not
      // an execution or replay key.
      readonly statBlockId: StatBlockId;
      readonly execution: StatBlockExecutionSnapshot;
    };

export type BattleCharacterResourceSnapshot =
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly usage: "unlimited";
      readonly usedThisTurn: boolean;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly usage: "limited";
      readonly usesRemaining: number;
      readonly usedThisTurn: boolean;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly usage: "pointPool";
      readonly pointsRemaining: number;
    };
export type CharacterBattleCreatureState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};
export type StatBlockBattleCreatureState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "statBlock" }
  >;
};

export type BattleCreatureZeroHpLifecycleSnapshot =
  | {
      readonly policy: "diesAtZeroHp";
      readonly dead: boolean;
    }
  | {
      readonly policy: "usesDeathSavingThrows";
      readonly deathSaves: DeathSaves;
      readonly stable: boolean;
      readonly dead: boolean;
    };

export type { BattleAttackExecutionSelection } from "./battle-subjects.ts";

export type {
  GlyphDurableOccurrenceActiveEffect,
  GlyphDurableOccurrenceAnchor,
} from "./active-effect/types.ts";

export type {
  GlyphStoredSpellInvocation,
  GlyphStoredSpellInvocationCandidate,
} from "./glyph-stored-spell-invocation.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
