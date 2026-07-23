import type {
  AbilityCheckRollModeSpellEffect,
  BattleLightEmission,
  BattleThunderwaveAudibleBoom,
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
  BattleLightEmission,
  BattleThunderwaveAudibleBoom,
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
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-action-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-weapon-enhancement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hypnotic-pattern-control
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.creature-type-protection-and-charm spell.hit-point-restoration spell.invocation-after-hit-damage spell.invocation-after-hit-damage-illumination spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-blur-attack-roll-defense spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.invocation-condition-removal-protection spell.invocation-condition-save spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-dancing-lights-movable-dim-light spell.invocation-expeditious-retreat-dash spell.invocation-feather-fall-mitigation spell.invocation-fog-cloud-obscurement spell.invocation-forced-reaction-movement spell.invocation-grease-ground-hazard spell.invocation-held-light-emitter spell.invocation-hideous-laughter-repeat-save-lifecycle spell.invocation-independent-attack-sequence spell.invocation-jump-movement-replacement spell.invocation-make-stable spell.invocation-marked-damage-rider spell.invocation-object-light spell.invocation-roll-modifier spell.invocation-sanctuary-targeting-interdiction spell.invocation-save-gated-condition-immunity spell.invocation-see-invisible-observer-sight spell.invocation-self-ability-check-advantage spell.invocation-self-teleport spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-failed-d20-test unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.innate-sorcery-activation unit-feature.magic-action-save-gated-condition unit-feature.martial-arts-attack-projection unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.zero-hit-point-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition-removal
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.hide-action-obscurement-permission
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.fighter-tactical-master unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.STAT_BLOCK.ATTACK_CONTROL BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
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
  type DamageDieSize,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
  type Round as RoundType,
} from "@dnd/shared/types";
import type { Language } from "@dnd/shared/game-facts";
import type {
  Ability,
  DamageType,
  DcSource,
  DiceExpr,
  Size,
  Skill,
  SpellMechanics,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import type * as Option from "effect/Option";
import type {
  BoundCharacterUnarmedStrikeActionOption,
  BoundCharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "./battle-action-options.ts";

export type BattleSpellAdmissionSource = {
  readonly id: UnitId;
  readonly mechanics: SpellMechanics;
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
  CharacterBattleWeaponMasterySelection,
} from "./character-creature-execution-facts.ts";
import type { BattleDruidWildShapeKnownForm } from "./druid-wild-shape-known-form-execution.ts";
import type { BattlePositiveHpUnconscious } from "./positive-hp-unconscious.ts";
import type { StatBlockBattleOrigin } from "./stat-block-combatant-execution-state.ts";
import type {
  BattleStatBlockExecutionSource,
  StatBlockExecutionAdmission,
  StatBlockExecutionSnapshot,
} from "./stat-block-execution-state.ts";
import type { StatBlockId, UnitId } from "@dnd/shared/game-facts";

export type BattleStatBlockExecutionCatalog = {
  readonly getStatBlock: (
    statBlockId: StatBlockId,
  ) => Option.Option<BattleStatBlockExecutionSource>;
};
import {
  type BattleInterruptTrigger,
  type BattleReadiedSpellTrigger,
} from "./battle-interrupt-triggers.ts";
import {
  type ActionHideSubject,
  type ActionSearchSubject,
  type BattleAttackExecutionSelection,
  type BattleInterruptAttackExecutionSelection,
  type BattleMovementSpeedKind,
  type BattleSubject,
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
  CharacterExecutionState,
  CharacterProcedureBindingSnapshot,
  UnitFeatureProcedureExecution,
} from "./character-execution-vocabulary.ts";
import type {
  SpellExecutableExecutionOf,
  SpellProcedureExecution,
} from "./character-execution.ts";
import type { SpellRuleExecutionFactsOwner } from "./procedure-execution/spell-procedure-execution.ts";
import type {
  PreparedSpellAccess,
  SpellSlotInvocationResource,
  SpellTargeting,
} from "./procedure-execution/spell-invocation-vocabulary.ts";
import type {
  BattleAntimagicFieldAuraMembership,
  BattleAntimagicFieldOngoingSpellEffectRef,
  BattleCommandOption,
  BattleOngoingSpellEffectRef,
  MagicWeaponEnhancementBonus,
  SpellAttackKind,
  SpellConditionRepeatSave,
} from "./active-effect/execution-vocabulary.ts";
export {
  MAGIC_WEAPON_ENHANCEMENT_BONUSES,
  type BattleAntimagicFieldAuraMembership,
  type BattleAntimagicFieldOngoingSpellEffectRef,
  type BattleCommandOption,
  type BattleD20RollModifierDelta,
  type BattleDancingLight,
  type BattleDancingLightList,
  type BattleOngoingSpellEffectRef,
  type MagicWeaponEnhancementBonus,
  type SpellAttackKind,
  type SpellConditionRepeatSave,
} from "./active-effect/execution-vocabulary.ts";
export type {
  PreparedSpellAccess,
  SpellSlotInvocationResource,
  SpellTargeting,
} from "./procedure-execution/spell-invocation-vocabulary.ts";
import type { CharacterBattleClassLevels } from "./character-class-level.ts";
import type {
  BattleCompanionPlacement,
  BattleCompanionSnapshot,
  BattleCompanions,
} from "./companion-state.ts";
import type { BattleReducerRouteEvents } from "./battle-reducer/reducer-route.ts";
import type { ZeroHpLifecycle } from "./zero-hp-lifecycle.ts";
import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleSpellEffectBase,
  BattleSpellActiveEffectTemplate,
  BattleUnitFeatureEffectBase,
  MarkedDamageRiderRetargetTiming,
  PersistentArmorSpellActiveEffect,
  SelfTransformationNaturalWeaponFacts,
  SpellCreatedHeldObjectActiveEffect,
  SpellLevitatedCreatureActiveEffect,
  SpellObjectContactDamageActiveEffect,
  SpellMarkedDamageRider,
  SpellTurnEndDamage,
  SpellTurnStartDamage,
  SpellTurnStartDamageSave,
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
  type BlurAttackRollBypassSense,
  CRITICAL_HIT_THRESHOLDS,
  DIRECT_CONDITION_REMOVAL_CONDITIONS,
  HUNTERS_MARK_FINDING_SKILLS,
  type MirrorImageDuplicateCount,
  type MirrorImageUnaffectedSense,
  OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  type OpenHandTechniqueDecisionChoice,
  type SelfTransformationModeKind,
  THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
  type BattleAntimagicFieldOngoingSpellEffectSourceKind,
} from "./battle-reducer/domain-constants.ts";
import {
  BRUTAL_STRIKE_DECISION_CHOICES,
  type BrutalStrikeDecisionChoice,
} from "./unit-feature-execution-constants.ts";
import type {
  KnockedOutConditionState,
  KnockedOutOneHp,
} from "./battle-reducer/knocked-out-state.ts";
import { spellDamageRerollUnsupportedIssue } from "./battle-reducer/spell-reroll-issues.ts";
import type {
  BattleActiveEffectExecutionOrdinal,
  BattleActiveEffectExecutionRef,
  BattleAreaId,
  BattleAttackExecutionScopeRef,
  BattleAttackProcedureExecutionRef,
  BattleCharacterExecutionScopeRef,
  BattleDancingLightId,
  BattleExecutionScopeCursor,
  BattleLineDirectionId,
  BattleObjectId,
  BattleProcedureExecutionCursor,
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
  ProtectionFromEvilAndGoodPreventedCondition,
  SelfTransformationModeEffectPayload,
  SelfTransformationNaturalWeaponFacts,
  SpellConditionAbilityCheckActor,
  SpellConditionAbilityCheckSuccessEnd,
  SpellConditionEscape,
  SpellCreatedHeldObjectActiveEffect,
  SpellCreatedHeldObjectState,
  SpellLevitatedCreatureActiveEffect,
  SpellObjectContactDamageActiveEffect,
  SpellShapeShiftedFormActiveEffect,
  SpellTurnEndDamage,
  SpellTurnStartDamage,
  SpellTurnStartDamageSave,
  SpiritualWeaponRepeatTargeting,
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
  readonly kind: "faerieFireObjectOutline";
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
      readonly kind: "dancingLight";
      readonly lightId: BattleDancingLightId;
      readonly positionId: BattleTablePositionId;
      readonly form: BattleDancingLightsForm;
    };
export type BattleLightEmitterOpaqueCoverInteraction =
  | {
      readonly kind: "blocksEmission";
    }
  | {
      readonly kind: "doesNotBlockEmission";
    };
type BattleSpellLightEmitterBase = BattleSpellEffectBase & {
  readonly kind: "spellLightEmitter";
  readonly attachment: BattleLightEmitterAttachment;
  readonly emission: BattleLightEmission;
  readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
  readonly expiresAt: BattleActiveEffectExpiration;
};
export type BattleTrackedOngoingSpellLightEmitter =
  BattleSpellLightEmitterBase & {
    readonly sourceEffectId: BattleSpellEffectOccurrenceId;
    readonly sourceSpellLevel: BattleSpellEffectLevel;
  };
export type BattleProjectedSpellLightEmitter = BattleSpellLightEmitterBase & {
  readonly sourceEffectId?: never;
  readonly sourceSpellLevel?: never;
};
export type BattleSpellLightEmitter =
  | BattleTrackedOngoingSpellLightEmitter
  | BattleProjectedSpellLightEmitter;
export type BattleUnitFeatureLightEmitter = BattleUnitFeatureEffectBase & {
  readonly kind: "unitFeatureLightEmitter";
  readonly attachment: BattleLightEmitterAttachment;
  readonly emission: BattleLightEmission;
  readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
  readonly expiresAt: BattleActiveEffectExpiration;
};
export type BattleObjectInvisibleRevealLightEmitter = BattleSpellEffectBase & {
  readonly kind: "objectInvisibleRevealLightEmitter";
  readonly objectId: BattleObjectId;
  readonly emission: Extract<BattleLightEmission, { readonly kind: "dim" }>;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "endOfTurn" }
  >;
};
export type BattleStoredLightEmitter =
  | BattleSpellLightEmitter
  | BattleObjectInvisibleRevealLightEmitter;
export type BattleLightEmitter =
  | BattleStoredLightEmitter
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
export type BattleDancingLightsForm = "separateLights" | "combinedMediumForm";
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
      readonly kind: "dancingLight";
      readonly lightId: BattleDancingLightId;
      readonly positionId: BattleTablePositionId;
      readonly form: BattleDancingLightsForm;
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
// SRD 5.2.1 Ready [Action]: Ready can hold a chosen action, or the special
// alternative to move up to Speed. This runtime slice models only that
// movement alternative for non-spell Ready responses.
export type BattleReadiedMovement = {
  // supported runtime trigger buckets, not the RAW Ready trigger taxonomy; RAW is closer to "table decision" and probably shall be modeled like that
  readonly trigger: BattleInterruptTrigger;
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
export type BattleAttackDamageCriticalConsequence =
  | {
      readonly kind: "ordinaryHit";
    }
  | {
      readonly kind: "criticalHit";
    };
export type BattleAttackDamageInterruptionContinuation = {
  readonly concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[];
  readonly damageDisposition: BattleAttackDamageDisposition;
  readonly attackDamageRiders: readonly AttackDamageRider[];
  readonly relationshipDecisions?: BattleDamageRelationshipDecisions;
  readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill;
  readonly cunningStrike?: BattleCunningStrikeDamageContinuation;
};
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
export type BattleAttackDamageInterruptionBoundaryPhase = Extract<
  BattleInterruptTrigger,
  "attackHit" | "attackDamage"
>;
export type BattleAttackDamageInterruptionFacts = {
  readonly participant: BattleAttackHostSubject;
  readonly targetId: CombatantId;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly attackResult: BattleAttackRollResult;
  readonly damageInput: BattleAttackDamageEvent;
  readonly criticalConsequence: BattleAttackDamageCriticalConsequence;
  readonly continuation: BattleAttackDamageInterruptionContinuation;
};
export type BattleAttackDamageInterruptionBoundaryInput =
  BattleAttackDamageInterruptionFacts & {
    readonly phase: BattleAttackDamageInterruptionBoundaryPhase;
  };
export type BattleAttackDamageInterruptionBoundaryResult =
  | {
      readonly tag: "decoded";
      readonly frame: BattleAttackDamageInterruptionFrame;
    }
  | {
      readonly tag: "invalidPhase";
      readonly phase: "attackHit";
    };
export type BattleInterruptedProcedure =
  | {
      readonly kind: "replay";
      readonly subject: BattleSubject;
      readonly fills: readonly BattleFill[];
      readonly glyphStoredSpellReleaseReplay?: never;
      readonly attackDamageReductions?: readonly BattlePendingAttackDamageReduction[];
      readonly attackDamageAdditions?: readonly AttackSpellDamageAddition[];
    }
  | {
      readonly kind: "replay";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
      readonly fills: readonly BattleFill[];
      readonly glyphStoredSpellReleaseReplay: GlyphStoredSpellReleaseReplayContext;
      readonly attackDamageReductions?: never;
      readonly attackDamageAdditions?: never;
    }
  | {
      readonly kind: "resolved";
      readonly subject: BattleSubject;
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
  | {
      readonly kind: "commandApproachMovement";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "commandApproach" }
      >;
      readonly movement: BattleResolvedMovement;
      readonly movedWithinFiveFeetOfCaster: boolean;
      readonly endTurnFills: readonly BattleFill[];
    }
  | {
      readonly kind: "commandFleeMovement";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "commandFlee" }
      >;
      readonly movement: BattleResolvedMovement;
      readonly endTurnFills: readonly BattleFill[];
    }
  | BattleAttackDamageInterruptionFrame;
export type BattleAttackHostSubject =
  | Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    >
  | Extract<BattleSubject, { readonly tag: "pactOfTheChainFamiliarAttack" }>
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
type BattleInterruptProcedureChoiceBase = {
  readonly reactorId: CombatantId;
  readonly initialHoles: readonly BattleHole[];
};
type BattleInterruptProcedureChoiceWithSubject =
  | {
      readonly reactorId: CombatantId;
      readonly initialHoles: readonly BattleHole[];
      readonly kind: "releaseReadiedSpell";
      readonly readiedSpellCasterId: CombatantId;
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "releaseReadiedSpell";
        }
      >;
    }
  | {
      readonly reactorId: CombatantId;
      readonly initialHoles: readonly BattleHole[];
      readonly kind: "releaseReadiedMovement";
      readonly readiedMovementActorId: CombatantId;
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "releaseReadiedMovement";
        }
      >;
    }
  | (BattleInterruptProcedureChoiceBase & {
      readonly kind: "castTriggeredReactionSpell";
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "castTriggeredReactionSpell";
        }
      >;
    })
  | (BattleInterruptProcedureChoiceBase & {
      readonly kind: "castAttackHitBonusActionSpell";
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "castAttackHitBonusActionSpell";
        }
      >;
    })
  | (BattleInterruptProcedureChoiceBase & {
      readonly kind: "opportunityAttack";
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "opportunityAttack";
        }
      >;
    })
  | (BattleInterruptProcedureChoiceBase & {
      readonly kind: "retaliationAttack";
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "retaliationAttack";
        }
      >;
    });
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
export type BattleInterruptProcedureModifierChoice = {
  readonly kind: "reactionRollOrDamageReduction";
  readonly reactorId: CombatantId;
  readonly choice: BattleReactionModifierChoice;
  readonly initialHoles: readonly BattleHole[];
};
export type BattleInterruptProcedureChoice =
  | BattleInterruptProcedureChoiceWithSubject
  | BattleInterruptProcedureModifierChoice;
export type BattleInterruptProcedureSelection = {
  readonly fills: readonly BattleFill[];
} & (
  | {
      readonly kind: "releaseReadiedSpell";
      readonly readiedSpellCasterId: CombatantId;
      readonly procedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "releaseReadiedMovement";
      readonly readiedMovementActorId: CombatantId;
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
      readonly reactorId: CombatantId;
      readonly selection: BattleOpportunityAttackSelection;
    }
  | {
      readonly kind: "retaliationAttack";
      readonly reactorId: CombatantId;
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
  readonly subject: BattleInterruptProcedureChoiceWithSubject["subject"];
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  readonly pendingAttackDamageReductions?:
    | readonly BattlePendingAttackDamageReduction[]
    | undefined;
  readonly pendingAttackDamageAdditions?:
    | readonly AttackSpellDamageAddition[]
    | undefined;
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
      readonly spellSlotCommitment: BattleSpellCastSlotCommitment;
      readonly metamagicCommitment: BattleSpellCastMetamagicCommitment;
      readonly concentrationCommitment: BattleSpellCastConcentrationCommitment;
      readonly targetIds: readonly CombatantId[];
      readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "saveFailed";
      readonly targetId: CombatantId;
      readonly sourceProcedureRef?: BattleProcedureExecutionRef;
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
      readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
      readonly landingMitigations: readonly BattleFallDamageLandingMitigationFrame[];
    })
  | (BattleInterruptCheckpointWithContinuationBase & {
      readonly trigger: "opportunityAttack";
      readonly moverId: CombatantId;
      readonly threats: readonly BattleOpportunityAttackThreat[];
    });
export type EndedFlySpeedGrant = Extract<
  BattleActiveEffect,
  { readonly kind: "specialSpeedGrant"; readonly speedKind: "fly" }
>;
export type BattleFlySpeedGrantEndFallCleanupFrame = {
  readonly kind: "flySpeedGrantEndFallCleanup";
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
export type BattleSpellCastSlotCommitment =
  | { readonly kind: "none" }
  | { readonly kind: "pendingCasterSpellSlot" };
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
export type BattleReplayContinuationFrame = {
  readonly kind: "replayContinuation";
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
  readonly handledInterruptTrigger: BattleInterruptTrigger;
};
export type BattleAttackDamageContinuationConcentrationFrame = {
  readonly kind: "attackDamageContinuationConcentration";
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
export type BattleMovementFillValue = {
  readonly speedKind: BattleMovementSpeedKind;
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly acrobaticMovement?: BattleAcrobaticMovementFact;
  readonly areaDifficultTerrain?: BattleAreaDifficultTerrainMovementFact;
  readonly gustOfWindLineMovement?: BattleGustOfWindLineMovementFact;
  readonly grappleDrag?: BattleGrappleDragMovementFact;
  readonly creatureSpaceTraversal?: BattleCreatureSpaceTraversalMovementFact;
  readonly jumpMovementReplacement?: BattleJumpMovementReplacementFact;
  readonly levitatedMovement?: BattleLevitatedMovementFact;
  readonly commandApproach?: BattleCommandApproachMovementFact;
  readonly commandFlee?: BattleCommandFleeMovementFact;
};
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
      readonly kind: "greaseGroundHazard";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "webAreaHazard";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "sleetStormHazard";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "insectPlagueHazard";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "spikeGrowthHazard";
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
export type BattleGustOfWindLineMovementFact = {
  readonly kind: "gustOfWindLineMovement";
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
  readonly targets: readonly {
    readonly targetId: CombatantId;
    readonly distanceFeet: MovementFeet;
  }[];
};
export type BattleCreatureSpaceTraversalMovementFact = {
  readonly kind: "occupiedCreatureSpaceTraversal";
  readonly occupiedSpaces: readonly {
    readonly occupantId: CombatantId;
    readonly positionId: BattleTablePositionId;
  }[];
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
export type BattleCommandApproachMovementFact = {
  readonly kind: "commandApproachShortestDirectRouteTowardCaster";
  readonly movedWithinFiveFeetOfCaster: boolean;
};
export type BattleCommandFleeMovementFact = {
  readonly kind: "commandFleeFastestAvailableRouteAwayFromCaster";
};
export type BattleJumpMovementReplacementFact = {
  readonly kind: "jumpMovementReplacement";
  readonly distanceFeet: MovementFeet;
  readonly landing: BattleJumpLandingFact;
};
export type BattleLevitateAltitudeDirection = "up" | "down";
export type BattleLevitatedMovementFact = {
  readonly kind: "levitatedMovement";
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly fixedObjectOrSurfaceWithinReach: true;
  readonly altitudeChange?: {
    readonly direction: BattleLevitateAltitudeDirection;
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
  readonly antimagicFieldTransit: readonly BattleAntimagicFieldTransitWitness[];
};
export type BattleSpiritualWeaponForcePosition = {
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
} & BattleOpportunityAttackSelection;
export type BattleTargetSpatialFact =
  | ({
      readonly kind: "attackTargetInMeleeReach";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    } & BattleAttackExecutionSelection)
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
    } & BattleAttackExecutionSelection)
  | ({
      readonly kind: "attackTargetInRangedRange";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly rangeBand: BattleAttackRangeBand;
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
      readonly kind: "attackAttackerPerceivesBlurredTargetWithSense";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly sense: BlurAttackRollBypassSense;
    }
  | {
      readonly kind: "attackAttackerUnaffectedByMirrorImageWithSense";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly sense: MirrorImageUnaffectedSense;
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
      readonly kind: "findFamiliarTouchSpellTarget";
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
      readonly kind: "spiritualWeaponTargetWithinForceReach";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly forcePositionId: BattleTablePositionId;
      readonly reachFeet: MovementFeet;
    }
  | {
      readonly kind: "wardingBondPairedWornPlatinumRings";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "wardingBondCreaturesDistance";
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
      readonly kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange";
      readonly reactorId: CombatantId;
      readonly fallingCreatureId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "featherFallTargetFallingWithinRange";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "levitatedTargetWithinSpellRange";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly targetId: CombatantId;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "counterspellTriggerCasterVisibleWithinRange";
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
      readonly kind: "sleepShakeAwakeActorWithin5Feet";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "hypnoticPatternShakeAwakeActorWithin5Feet";
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
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
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
export type BattleThunderwavePushDisposition =
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
export type BattleThunderwaveCreaturePushOutcome = {
  readonly targetId: CombatantId;
  readonly disposition: BattleThunderwavePushDisposition;
};
export type BattleThunderwaveUnsecuredObjectPushOutcome = {
  readonly objectId: BattleObjectId;
  readonly disposition: BattleThunderwavePushDisposition;
};
export type BattleGustOfWindLinePushDisposition =
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
export type BattleGustOfWindLineCreaturePushOutcome = {
  readonly targetId: CombatantId;
  readonly disposition: BattleGustOfWindLinePushDisposition;
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
  readonly jumpMovementReplacement?: BattleJumpMovementReplacementFact;
  readonly levitatedMovement?: BattleLevitatedMovementFact;
};
type ClassCantripSpellAccess = { readonly tag: "classCantrip" };
type ArmorOfShadowsSpellAccess = { readonly tag: "armorOfShadows" };
type SpellEffectSpellAccess = {
  readonly tag: "spellEffect";
  readonly sourceCombatantId: CombatantId;
};
type NoSpellInvocationResource = { readonly tag: "none" };
export type ClassFeatureFreeCastInvocationResource = {
  readonly tag: "classFeatureFreeCast";
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
};
type PreparedSpellSlotSource = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
};
type PreparedClassFeatureFreeCastSource = {
  readonly access: PreparedSpellAccess;
  readonly resource: ClassFeatureFreeCastInvocationResource;
};
type ClassCantripDamageSpellSource = {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
};
export type PreparedDamageSpellSource = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
};
export type DamageSpellSource =
  | ClassCantripDamageSpellSource
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
export type BattleFogCloudAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "fogCloudArea" }
>;
export type BattleMagicalDarknessAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "magicalDarknessArea" }
>;
export type BattleSpellCreatedLightAreaOverlap = {
  readonly kind: "spellCreatedLightOverlapsArea";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
};
export type BattleSpellAreaOriginAnchor =
  | {
      readonly kind: "tableSelectedPoint";
    }
  | {
      readonly kind: "combatant";
      readonly combatantId: CombatantId;
    };
export type BattleAntimagicFieldAffectedOngoingSpellEffect = {
  readonly kind: "antimagicFieldAffectedOngoingSpellEffect";
  readonly effect: BattleAntimagicFieldOngoingSpellEffectRef;
  readonly sourceKind: BattleAntimagicFieldOngoingSpellEffectSourceKind;
};
export type BattleAntimagicFieldTransitWitness = {
  readonly kind: "antimagicFieldTransit";
  readonly areaId: BattleAreaId;
  readonly sourceCombatantId: CombatantId;
  readonly originInsideAura: boolean;
  readonly destinationInsideAura: boolean;
};
export type BattleAntimagicFieldAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "antimagicFieldSelfEmanation" }
>;
export type BattleWebCubeAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "webCubeArea" }
>;
export type BattleSleetStormCylinderAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "sleetStormCylinderArea" }
>;
export type BattleFlamingSphereAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "flamingSphereArea" }
>;
export type BattleSpikeGrowthAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "spikeGrowthArea" }
>;
export type BattleMoonbeamAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "moonbeamCylinderArea" }
>;
export type BattleInsectPlagueAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "insectPlagueSphereArea" }
>;
export type BattleCloudkillAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "cloudkillSphereArea" }
>;
export type BattleGustOfWindLineAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "gustOfWindLineArea" }
>;
export type BattleSpellAreaIdentityChoice =
  | {
      readonly kind: "fogCloudArea";
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
      readonly kind: "antimagicFieldSelfEmanation";
      readonly areaId: BattleAreaId;
      readonly auraMembership: BattleAntimagicFieldAuraMembership;
      readonly affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[];
    }
  | {
      readonly kind: "webCubeArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "sleetStormCylinderArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "insectPlagueSphereArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "cloudkillSphereArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "flamingSphereArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "spikeGrowthArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "moonbeamCylinderArea";
      readonly areaId: BattleAreaId;
      readonly originAnchor: BattleSpellAreaOriginAnchor;
    }
  | {
      readonly kind: "gustOfWindLineArea";
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
  Extract<BattleActiveEffect, { readonly kind: "faerieFireOutline" }>
>;
export type WardingBondSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "wardingBond";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "wardingBond" }>
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
export type ThaumaturgyBoomingVoiceSpellInvocation = {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "thaumaturgyBoomingVoice";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "thaumaturgyBoomingVoice" }>
  >;
  readonly rangeFeet: MovementFeet;
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
  | ClassCantripDamageSpellSource
  | PreparedSpellSlotSource
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
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
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
export type LevitatedCreatureSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "levitatedCreature";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly ability: Extract<Ability, "con">;
  readonly dc: DcSource;
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Omit<SpellLevitatedCreatureActiveEffect, "altitudeFeet">
  >;
  readonly maxInitialRiseFeet: MovementFeet;
  readonly rangeFeet: MovementFeet;
};
export type BlurAttackRollDefenseSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "blurAttackRollDefense";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "blurred" }>
  >;
};
export type SeeInvisibleObserverSightSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "seeInvisibleObserverSight";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "seeInvisibleAndEthereal" }>
  >;
};
export type MirrorImageHitInterceptionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "mirrorImageHitInterception";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "mirrorImageDuplicates" }>
  >;
};
export type ConditionRemovalProtectionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "directConditionRemoval";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly targeting: SpellTargetListTargeting;
  readonly conditionChoices: typeof DIRECT_CONDITION_REMOVAL_CONDITIONS;
  readonly rangeFeet: MovementFeet;
};
export type DamageReductionSpellInvocation = {
  readonly access: ClassCantripSpellAccess;
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
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
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
export type JumpMovementReplacementSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "jumpMovementReplacement";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: number;
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "jumpMovementReplacement" }>
  >;
  readonly rangeFeet: MovementFeet;
};
export type DragonsBreathInitialSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "dragonsBreathInitial";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: 1;
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Omit<
      Extract<BattleActiveEffect, { readonly kind: "dragonsBreath" }>,
      "damageType" | "spellSaveDc"
    >
  >;
  readonly damageTypeChoices: readonly DamageType[];
  readonly rangeFeet: MovementFeet;
};
export type HastePositiveSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "hastePositive";
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
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "selfTeleport";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly maxDistanceFeet: MovementFeet;
};
export type SanctuaryTargetingInterdictionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "sanctuaryTargetingInterdiction";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: 1;
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "sanctuaryWard" }>
  >;
  readonly rangeFeet: MovementFeet;
};
export type DirectConditionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "weaponDamageRider";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "spellWeaponDamageRider" }>
  >;
};
export type MagicWeaponEnhancementSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "magicWeaponEnhancement";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly bonus: MagicWeaponEnhancementBonus;
  readonly durationTicks: ElapsedTimeTicks;
};
export type AfterHitDamageSpellInvocation = (
  | PreparedSpellSlotSource
  | PreparedClassFeatureFreeCastSource
) & {
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
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "afterHitDamageAndIllumination";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly activeEffect: BattleSpellActiveEffectTemplate<
    Extract<BattleActiveEffect, { readonly kind: "shiningSmiteIllumination" }>
  >;
};
export type MarkedDamageRiderSpellInvocation =
  | ((PreparedSpellSlotSource | PreparedClassFeatureFreeCastSource) & {
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
  readonly access: ClassCantripSpellAccess;
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
  readonly access: ClassCantripSpellAccess;
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
  readonly resource: SpellSlotInvocationResource;
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
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "ongoingSpellEnd";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly rangeFeet: MovementFeet;
};
export type HeldLightHurlSpellInvocation = HeldLightHurlMechanicalFacts & {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "heldLightHurl";
  readonly sourceEffectRef: BattleActiveEffectExecutionRef;
  readonly sourceHeldLightProcedureRef: BattleProcedureExecutionRef;
  readonly spell: BattleSpellAdmissionSource;
};
export type DancingLightsSpellInvocation =
  | {
      readonly access: ClassCantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "dancingLightsSeparateCast";
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
      readonly access: ClassCantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "dancingLightsCombinedCast";
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
      readonly access: ClassCantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "dancingLightsReposition";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly activeEffectRef: BattleActiveEffectExecutionRef;
      readonly sourceDancingLightsProcedureRef: BattleProcedureExecutionRef;
      readonly maxMoveFeet: MovementFeet;
      readonly rangeFeet: MovementFeet;
      readonly spacingFeet: MovementFeet;
    };
export type SpellCreatedHeldObjectSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
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
      readonly sourceEffectRef: BattleActiveEffectExecutionRef;
      readonly sourceHeldObjectProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly access: SpellEffectSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "spellCreatedHeldObjectReEvoke";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly sourceEffectRef: BattleActiveEffectExecutionRef;
      readonly sourceHeldObjectProcedureRef: BattleProcedureExecutionRef;
    };
export type ObjectContactDamageSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
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
export type SpiritualWeaponRepeatAttackSpellInvocation = {
  readonly access: SpellEffectSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "spiritualWeaponRepeatAttack";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "spiritualWeapon" }
  >;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "singleCombatant" }
  >;
  readonly damage: Extract<
    BattleActiveEffect,
    { readonly kind: "spiritualWeapon" }
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
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "spellHostedWeaponAttack";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "magicAction";
  readonly componentWeapon: {
    readonly itemId: string;
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
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "weaponAttackOverride";
  readonly spell: BattleSpellAdmissionSource;
  readonly actionCost: "bonusAction";
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
      readonly resource: SpellSlotInvocationResource;
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
    readonly kind: "fixedSpellAttackDamage" | "selectedSorcerousBurstDamage";
  }
>;

export function spellAttackDamagePayloadIsResolved(
  damage: SpellAttackDamagePayload,
): damage is ResolvedSpellAttackDamagePayload {
  return (
    damage.kind === "fixedSpellAttackDamage" ||
    damage.kind === "selectedSorcerousBurstDamage"
  );
}

// SupportedAttackActionOption is a currently executable option for spending an
// immediate attack made as part of the Attack action. It is narrower than all
type SupportedSpellInvocationSource =
  | HeldLightSpellInvocation
  | ObjectLightSpellInvocation
  | OngoingSpellEndSpellInvocation
  | HeldLightHurlSpellInvocation
  | DancingLightsSpellInvocation
  | SpellCreatedHeldObjectSpellInvocation
  | ObjectContactDamageSpellInvocation
  | SpiritualWeaponRepeatAttackSpellInvocation
  | SpellHostedWeaponAttackInvocation
  | WeaponAttackOverrideSpellInvocation
  | ChosenDamageResistanceSpellInvocation
  | DamageReductionSpellInvocation
  | WardingBondSpellInvocation
  | ThaumaturgyBoomingVoiceSpellInvocation
  | SeeInvisibleObserverSightSpellInvocation
  | DragonsBreathInitialSpellInvocation
  | HastePositiveSpellInvocation
  | {
      readonly access: ClassCantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "makeStable";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "magicAction";
      readonly rangeFeet: MovementFeet;
    }
  | JumpMovementReplacementSpellInvocation
  | SelfTeleportSpellInvocation
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
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
  | (ClassCantripDamageSpellSource & {
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
      readonly targeting: SpellTargeting;
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "saveGatedCondition";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly targeting: SpellTargeting;
      readonly targetCreatureTypes: readonly CreatureType[] | null;
      readonly effect: SpellFailedSaveConditionEffect;
      readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "saveGatedAttackRollAdvantage";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly targeting: SpellTargeting;
      readonly effect: SpellFailedSaveAttackRollEffect;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "sleepTargetAdmission";
      readonly spell: BattleSpellAdmissionSource;
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "pointOriginSphere" }
      >;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "hideousLaughter";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "hypnoticPattern";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "slowActivePenalties";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "greaseGroundHazard";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "webRestraintHazard";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "sleetStormAreaHazard";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "insectPlagueAreaHazard";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "cloudkillAreaHazard";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "gustOfWindLine";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "fogCloudObscurement";
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
      readonly resource: SpellSlotInvocationResource;
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "antimagicFieldOngoingSpellSuppression";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "flamingSphere";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "spiritualWeaponAttackProxy";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "spikeGrowthMovementHazard";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "moonbeam";
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
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "command";
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
      readonly resource: SpellSlotInvocationResource;
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
  | LevitatedCreatureSpellInvocation
  | BlurAttackRollDefenseSpellInvocation
  | MirrorImageHitInterceptionSpellInvocation
  | ConditionRemovalProtectionSpellInvocation
  | DirectConditionRemovalSpellInvocation
  | ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation
  | SelfTransformationModeSpellInvocation
  | SaveGatedConditionImmunitySpellInvocation
  | WeaponDamageRiderSpellInvocation
  | MagicWeaponEnhancementSpellInvocation
  | AfterHitDamageSpellInvocation
  | AfterHitSaveGatedConditionSpellInvocation
  | AfterHitTimedDamageAndSaveSpellInvocation
  | AfterHitDamageAndIlluminationSpellInvocation
  | MarkedDamageRiderSpellInvocation
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "expeditiousRetreatDash";
      readonly spell: BattleSpellAdmissionSource;
      readonly actionCost: "bonusAction";
      readonly activeEffect: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "spellDashBonusAction" }>
      >;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "featherFallMitigation";
      readonly spell: BattleSpellAdmissionSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
      readonly activeEffect: BattleSpellActiveEffectTemplate<
        Extract<BattleActiveEffect, { readonly kind: "featherFallMitigation" }>
      >;
      readonly rangeFeet: MovementFeet;
    }
  | SanctuaryTargetingInterdictionSpellInvocation
  | DirectConditionSpellInvocation
  | PersistentArmorSpellInvocation
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "shieldReaction";
      readonly spell: BattleSpellAdmissionSource;
      readonly armorClassBonus: number;
      readonly negatesRepeatedDamageAllocation: true;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "counterspell";
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
      readonly resource: SpellSlotInvocationResource;
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
            readonly spell: Pick<Spell, "id" | "mechanics">;
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
  I extends { readonly procedure: SupportedSpellProcedure } =
    SpellProcedureExecution,
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
      | "wardingBond"
      | "thaumaturgyBoomingVoice"
      | "spellHostedWeaponAttack"
      | "weaponAttackOverride"
      | "rollModifier"
      | "creatureTypeProtection"
      | "creatureSizeIncrease"
      | "creatureSizeDecrease"
      | "levitatedCreature"
      | "blurAttackRollDefense"
      | "seeInvisibleObserverSight"
      | "mirrorImageHitInterception"
      | "conditionRemovalProtection"
      | "chosenDamageResistance"
      | "conditionImmunityAndTurnStartTemporaryHitPoints"
      | "selfTransformationMode"
      | "scalarBuff"
      | "weaponDamageRider"
      | "magicWeaponEnhancement"
      | "afterHitDamage"
      | "afterHitSaveGatedCondition"
      | "afterHitTimedDamageAndSave"
      | "afterHitDamageAndIllumination"
      | "markedDamageRider"
      | "expeditiousRetreatDash"
      | "jumpMovementReplacement"
      | "dragonsBreathInitial"
      | "hastePositive"
      | "selfTeleport"
      | "sanctuaryTargetingInterdiction"
      | "directCondition"
      | "directConditionRemoval"
      | "featherFallMitigation"
      | "heldLight"
      | "objectLight"
      | "ongoingSpellEnd"
      | "spellCreatedHeldObject"
      | "spellCreatedHeldObjectReEvoke"
      | "dancingLightsSeparateCast"
      | "dancingLightsCombinedCast"
      | "dancingLightsReposition"
      | "shieldReaction"
      | "counterspell"
      | "saveGatedCondition"
      | "saveGatedConditionImmunity"
      | "saveGatedAttackRollAdvantage"
      | "abilityD20TestRollModeSaveGate"
      | "sleepTargetAdmission"
      | "hideousLaughter"
      | "hypnoticPattern"
      | "slowActivePenalties"
      | "command"
      | "greaseGroundHazard"
      | "webRestraintHazard"
      | "sleetStormAreaHazard"
      | "insectPlagueAreaHazard"
      | "cloudkillAreaHazard"
      | "gustOfWindLine"
      | "fogCloudObscurement"
      | "magicalDarknessPointOrigin"
      | "antimagicFieldOngoingSpellSuppression"
      | "flamingSphere"
      | "spikeGrowthMovementHazard"
      | "moonbeam"
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
          | "spiritualWeaponAttackProxy"
          | "spiritualWeaponRepeatAttack"
          | "spellCreatedHeldObjectAttack";
      }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "chainedSpellAttackDamage" }
    >;

type WeaponDamageDiceRollChoiceSelection = "first" | "second";
export type WeaponDamageDiceRollChoiceFill = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly selection: WeaponDamageDiceRollChoiceSelection;
  readonly candidates: readonly [RolledDiceGroup, RolledDiceGroup];
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
export type BattleCommandHaltTurnSuppression = {
  readonly kind: "commandHalt";
};
export type BattleJumpDistanceMultiplier = {
  readonly multiplier: 2;
};

export type BattleTurnResources = ActionEconomyState & {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
  readonly commandHalt: BattleCommandHaltTurnSuppression | null;
  readonly jumpDistanceMultiplier: BattleJumpDistanceMultiplier | null;
  readonly heightenedStepOfTheWindCarriedCreatures: readonly HeightenedStepOfTheWindCarriedCreature[];
  readonly spellSlotUsesThisTurn: readonly BattleTurnSpellSlotUse[];
  readonly levelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly quickenedLevelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly stunningStrikesUsedThisTurn: readonly StunningStrikeUsage[];
  readonly recklessAttackWhileRagingUsedThisTurn: readonly RecklessAttackWhileRagingUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
  readonly weaponMasteryCleaveAttackersUsedThisTurn: readonly CombatantId[];
  readonly huntersPreyHordeBreakerUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly grapplerPunchAndGrabUsedThisTurn: readonly CombatantId[];
  readonly pendingAttackRollMissToHitReplacementSelection?: PendingAttackRollMissToHitReplacementSelection;
  readonly lightWeaponAttackMade?: {
    readonly weaponItemId: string;
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
  readonly skills: typeof HUNTERS_MARK_FINDING_SKILLS;
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

type BattleCreatureStateCommon = {
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly activeEffects: readonly BattleActiveEffect[];
  readonly nextActiveEffectOrdinal: BattleActiveEffectExecutionOrdinal;
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
  readonly origin:
    | {
        readonly kind: "character";
        // Authored identity retained for settlement / catalog reference. The
        // reducer never dispatches on characterId.
        readonly characterId: CharacterId;
        // Presentation label retained as a snapshot convenience. Not used by
        // reducer execution; documented as inert presentation identity in #224
        // inventory.
        readonly displayName: string;
        readonly execution: CharacterExecutionState;
        readonly classLevels: CharacterBattleClassLevels;
        readonly knownLanguages: ReadonlyNonEmptyArray<Language>;
        readonly d20Statistics: CharacterBattleD20Statistics;
        readonly druidWildShapeAvailableForms?: readonly StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm>[];
        readonly weaponProficiencies: readonly WeaponProficiency[];
        readonly selectedLoadout: CharacterBattleLoadoutRef;
        readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
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

export type BattleState = {
  readonly battleId: BattleId;
  readonly initiative: InitiativeStack<CombatantId>;
  readonly combatants: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly executionScopeCursors: ReadonlyMap<
    CombatantId,
    BattleExecutionScopeAllocation
  >;
  readonly companions: BattleCompanions;
  readonly objectOutlines: readonly BattleObjectOutline[];
  readonly lightEmitters: readonly BattleStoredLightEmitter[];
  readonly hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly currentTurnResources: BattleTurnResources;
  readonly readiedSpells: ReadonlyMap<CombatantId, BattleReadiedSpell>;
  readonly readiedMovements: ReadonlyMap<CombatantId, BattleReadiedMovement>;
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

export type BattleStateInitIssue = {
  readonly tag: "battleStateInitIssue";
  readonly message: string;
};

// battleStateInitIssue moved to ./battle-reducer/domain-helpers.ts

export const SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET = movementFeet(5);
export const SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET = movementFeet(15);
export const SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET = movementFeet(20);
export const COLOR_SPRAY_FAILED_SAVE_CONDITION = "blinded" satisfies Condition;
export const ENTANGLE_FAILED_SAVE_CONDITION = "restrained" satisfies Condition;

type BattleActExecution<TSubject extends BattleSubject> = {
  readonly subject: TSubject;
  readonly initialHoles: readonly BattleHole[];
  readonly routeEvents?: BattleReducerRouteEvents;
};

export const ATTACK_PRESENTATION_JOIN_ISSUE_REASONS = [
  "characterContextMissing",
  "weaponPresentationMissing",
  "statBlockAdmissionMissing",
  "statBlockPresentationMissing",
] as const;
export type AttackPresentationJoinIssueReason =
  (typeof ATTACK_PRESENTATION_JOIN_ISSUE_REASONS)[number];
export type AttackPresentationJoinIssue = {
  readonly tag: "attackPresentationJoinIssue";
  readonly reason: AttackPresentationJoinIssueReason;
};

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
      readonly formStatBlockId: BattleDruidWildShapeKnownForm["id"];
    };

export type BattleActDiscoveryCandidate = BattleActExecution<BattleSubject>;

export type BattleActExecutionCandidate = BattleActExecution<BattleSubject>;

export type AvailableBattleAct = BattleActExecutionCandidate & {
  readonly label: string;
  readonly summary: string;
  readonly presentation: BattleActPresentation;
};

export type BattleSnapshotAct = Pick<
  BattleActExecutionCandidate,
  "subject" | "initialHoles"
>;

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
    readonly requiresKnownWillingTarget?: true;
  };
  readonly attack?: {
    readonly actorId: CombatantId;
    readonly selection: BattleAttackExecutionSelection;
    readonly targetConstraint: "meleeReach" | "rangedRange";
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
export type BattleCreatureAttackRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "attackRoll" }
> & {
  readonly attackBonus?: never;
  readonly rollMode?: AttackRollMode;
  readonly creatureAttack: {
    readonly actorId: CombatantId;
    readonly targetId: CombatantId;
  };
};
export type BattleCreatureAttackDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly creatureAttack: {
    readonly actorId: CombatantId;
    readonly targetId: CombatantId;
  };
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
export type BattleSlowSomaticSpellFailureOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "slowSomaticSpellFailureOutcome";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly failurePercent: 25;
  readonly activeEffectSources: readonly {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
  }[];
};
export type BattleWardingBondSeparationFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetSpatialFacts";
  readonly label: string;
  readonly wardingBondSeparation: {
    readonly sourceCombatantId: CombatantId;
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly rangeFeet: MovementFeet;
  };
  readonly requiresTableSpatialFact: true;
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
export type BattleSpiritualWeaponForcePositionHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spiritualWeaponForcePosition";
  readonly label: string;
  readonly mode: BattleSpiritualWeaponForcePosition["mode"];
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
export type BattleFindFamiliarConnectionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "findFamiliarConnection";
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
export type BattleMagicWeaponTargetItemFact = {
  readonly kind: "nonmagicalWeaponItem";
  readonly holderCombatantId: CombatantId;
  readonly itemId: string;
};
export type BattleMagicWeaponTargetItemHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "magicWeaponTargetItem";
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
export type BattleObjectDamageOutcome =
  | {
      readonly kind: "hitPoints";
      readonly objectId: BattleObjectId;
      readonly damageType: DamageType;
      readonly rolledDamage: DamageAmount;
      readonly effectiveDamage: DamageAmount;
      readonly priorHitPoints: Hp;
      readonly nextHitPoints: Hp;
      readonly destroyed: boolean;
    }
  | {
      readonly kind: "tableResolved";
      readonly objectId: BattleObjectId;
      readonly damageType: DamageType;
      readonly rolledDamage: DamageAmount;
    };
export type BattleObjectIgnitionOutcome = {
  readonly kind: "startsBurning";
  readonly objectId: BattleObjectId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};
export type BattleFireballObjectIgnitionFact = {
  readonly objectId: BattleObjectId;
  readonly disposition: BattleObjectIgnitionDisposition;
};
export type BattleShatterNonmagicalUnattendedObjectDamageFact = {
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
export type BattleDroppedObjectOutcome = {
  readonly kind: "objectDropped";
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly source: BattleDroppedObjectSource;
};
export type BattleSpellDamageTypeChoiceHole = {
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
type BattleFeatherFallTargetSpatialFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "featherFallTargetFallingWithinRange" }
>;
export type BattleSpellTargetListSpatialFact =
  | BattleSpellTargetSpatialFact
  | BattlePointOriginSphereSpellTargetsSpatialFact
  | BattleKnownWillingSpellTargetSpatialFact
  | BattleFeatherFallTargetSpatialFact;
export type BattleSpellTargetAllocationHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellTargetAllocation";
  readonly label: string;
  readonly allocationCount: number;
  readonly choices: readonly CombatantId[];
  readonly requiresTableSpatialFact: true;
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
  readonly ongoingFeatureActivations?: readonly AttackRollFeatureActivation[];
  readonly missToHitReplacements?: readonly AttackRollMissToHitReplacement[];
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
  readonly missToHitReplacements?: readonly AttackRollMissToHitReplacement[];
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
export type BattleDragonsBreathDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly dragonsBreath: {
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
    readonly sourceEffectId: BattleSpellEffectOccurrenceId;
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
export type BattleMirrorImageDuplicateRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly mirrorImageDuplicateRoll: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly remainingDuplicates: MirrorImageDuplicateCount;
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
export type BattleSleepRepeatSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly sleepRepeatSave: {
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
export type BattleHideousLaughterRepeatTrigger = "endTurn" | "damage";
export type BattleHideousLaughterRepeatSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly hideousLaughterRepeatSave: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly trigger: BattleHideousLaughterRepeatTrigger;
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
export type BattleGreaseGroundHazardTrigger = "entersArea" | "endsTurnInArea";
export type BattleGreaseGroundHazardSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly greaseGroundHazard: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleGreaseGroundHazardTrigger;
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
export type BattleWebRestraintTrigger = "entersArea" | "startsTurnInArea";
export type BattleWebRestraintSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly webRestraint: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleWebRestraintTrigger;
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
export type BattleSleetStormAreaHazardTrigger =
  | "entersArea"
  | "startsTurnInArea";
export type BattleInsectPlagueAreaHazardTrigger =
  | "appearsInArea"
  | "entersArea"
  | "endsTurnInArea";
export type BattleCloudkillAreaHazardTrigger =
  | "appearsInArea"
  | "movesIntoSpace"
  | "entersArea"
  | "endsTurnInArea";
export type BattleSleetStormAreaHazardSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly sleetStormAreaHazard: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleSleetStormAreaHazardTrigger;
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
export type BattleInsectPlagueAreaHazardSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly insectPlagueAreaHazard: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleInsectPlagueAreaHazardTrigger;
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
export type BattleCloudkillAreaHazardSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly cloudkillAreaHazard: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleCloudkillAreaHazardTrigger;
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
export type BattleInsectPlagueAreaHazardDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly insectPlagueAreaHazard: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleInsectPlagueAreaHazardTrigger;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "piercing">;
    };
  };
  readonly critical: false;
};
export type BattleCloudkillAreaHazardDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly cloudkillAreaHazard: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleCloudkillAreaHazardTrigger;
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: Extract<DamageType, "poison">;
    };
  };
  readonly critical: false;
};
export type BattleGustOfWindLineTrigger = "endsTurnInLine";
export type BattleGustOfWindLineSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly gustOfWindLine: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly directionId: BattleLineDirectionId;
    readonly trigger: BattleGustOfWindLineTrigger;
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
export type BattleGustOfWindLineDirectionChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "gustOfWindLineDirectionChoice";
  readonly label: string;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
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
export type BattleSlowActivePenaltiesEndTurnSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly slowActivePenaltiesEndTurnSave: {
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
export type BattleFlamingSphereTrigger =
  | "endsTurnWithinFiveFeetOfSphere"
  | "rammedBySphere";
export type BattleFlamingSphereRamMovementHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "movableZoneRamMovement";
  readonly label: string;
  readonly movableZone: {
    readonly targetId: CombatantId;
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
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly maxMoveFeet: MovementFeet;
  };
  readonly requiresTableSpatialFact: true;
};
export type BattleFlamingSphereSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleFlamingSphereTrigger;
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
export type BattleFlamingSphereDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleFlamingSphereTrigger;
    readonly damage: SpellTurnStartDamage;
  };
  readonly critical: false;
};
export type BattleMoonbeamSaveTrigger =
  | "appearsInArea"
  | "areaMovesIntoSpace"
  | "entersArea"
  | "endsTurnInArea";
export type BattleMoonbeamSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleMoonbeamSaveTrigger;
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
export type BattleMoonbeamDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleMoonbeamSaveTrigger;
    readonly damage: SpellTurnStartDamage;
  };
  readonly critical: false;
};
export type BattleSpikeGrowthMovementDamageRollHole = Extract<
  RuntimeHole & { readonly label: string },
  { readonly kind: "rolledDice" }
> & {
  readonly spikeGrowthMovement: {
    readonly targetId: CombatantId;
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
export type BattleThaumaturgyActiveOneMinuteEffectCountHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "thaumaturgyActiveOneMinuteEffectCount";
  readonly label: string;
  readonly maximumActiveOneMinuteEffects: typeof THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS;
  readonly requiresTableSpellEffectCount: true;
};
export type BattleCommandOptionChoiceHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "commandOptionChoice";
  readonly label: string;
  readonly choices: readonly BattleCommandOption[];
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
export type BattleDancingLightCastPlacement = {
  readonly positionId: BattleTablePositionId;
  readonly distanceFromCasterFeet: MovementFeet;
  readonly nearestSiblingDistanceFeet?: MovementFeet;
};
export type BattleDancingLightRepositionPlacement =
  BattleDancingLightCastPlacement & {
    readonly lightId: BattleDancingLightId;
    readonly moveDistanceFeet: MovementFeet;
  };
export type BattleDancingLightCastPlacementList =
  readonly BattleDancingLightCastPlacement[];
export type BattleDancingLightRepositionPlacementList =
  readonly BattleDancingLightRepositionPlacement[];
export type BattleDancingLightsPlacementValue =
  | {
      readonly mode: "cast";
      readonly form: "separateLights";
      readonly lights: BattleDancingLightCastPlacementList;
    }
  | {
      readonly mode: "cast";
      readonly form: "combinedMediumForm";
      readonly light: BattleDancingLightCastPlacement;
    }
  | {
      readonly mode: "reposition";
      readonly form: "separateLights";
      readonly lights: BattleDancingLightRepositionPlacementList;
    }
  | {
      readonly mode: "reposition";
      readonly form: "combinedMediumForm";
      readonly light: BattleDancingLightRepositionPlacement;
    };
export type BattleDancingLightsPlacementHole = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "dancingLightsPlacement";
  readonly label: string;
  readonly mode: BattleDancingLightsPlacementValue["mode"];
  readonly form: BattleDancingLightsForm;
  readonly activeLightIds: readonly BattleDancingLightId[];
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
const SAVE_DAMAGE_RESULTS = ["none", "half", "full"] as const;
export type SaveDamageResult = (typeof SAVE_DAMAGE_RESULTS)[number];
export type BattleSpellAreaChoice = {
  readonly originAnchorId: CombatantId;
  readonly affectedTargetIds: readonly CombatantId[];
} & BattleSpellAreaChoiceKind;
type BattleSpellAreaChoiceKind =
  | { readonly kind?: never; readonly sleepNonSleeperFacts?: never }
  | {
      readonly kind?: never;
      readonly sleepNonSleeperFacts: readonly [
        BattleSleepNonSleeperFact,
        ...BattleSleepNonSleeperFact[],
      ];
    }
  | {
      readonly kind: "faerieFireArea";
      readonly affectedObjectIds: readonly BattleObjectId[];
    }
  | {
      readonly kind: "hypnoticPatternArea";
      readonly cubeSideFeet: 30;
      readonly affectedCreatureWitnesses: readonly BattleHypnoticPatternAffectedCreatureWitness[];
    }
  | {
      readonly kind: "slowArea";
      readonly cubeSideFeet: 40;
      readonly affectedCreatureWitnesses: readonly BattleSlowAffectedCreatureWitness[];
    }
  | {
      readonly kind: "greaseGroundArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "fireballArea";
      readonly objectIgnitionFacts: readonly BattleFireballObjectIgnitionFact[];
    }
  | {
      readonly kind: "shatterArea";
      readonly nonmagicalUnattendedObjectDamageFacts: readonly BattleShatterNonmagicalUnattendedObjectDamageFact[];
    }
  | {
      readonly kind: "thunderwaveArea";
      readonly creaturePushes: readonly BattleThunderwaveCreaturePushOutcome[];
      readonly unsecuredObjectPushes: readonly BattleThunderwaveUnsecuredObjectPushOutcome[];
      readonly audibleBoom: BattleThunderwaveAudibleBoom;
    }
  | {
      readonly kind: "gustOfWindLineArea";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
      readonly creaturePushes: readonly BattleGustOfWindLineCreaturePushOutcome[];
    };
export type BattleSleepNonSleeperFact = {
  readonly kind: "doesNotSleep";
  readonly targetId: CombatantId;
};
export type BattleHypnoticPatternAffectedCreatureWitness = {
  readonly targetId: CombatantId;
  readonly inCube: true;
  readonly canSeePattern: true;
};
export type BattleSlowAffectedCreatureWitness = {
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
export type BattleDragonsBreathSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly dragonsBreath: {
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
    readonly sourceEffectId: BattleSpellEffectOccurrenceId;
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
    | typeof BRUTAL_STRIKE_DECISION_CHOICES
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
  readonly roll: DieRollResult;
};
export type BattleConcentrationSavingThrowHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "concentrationSavingThrow";
  readonly label: string;
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
export type BattleMovementHole = {
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
export type BattleLevitateAltitudeChangeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "levitateAltitudeChange";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
  readonly directions: readonly BattleLevitateAltitudeDirection[];
  readonly requiresTargetWithinRangeFact: true;
};
export type BattleLevitateInitialRiseHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "levitateInitialRise";
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
  readonly spellcastingAbilityCheck: {
    readonly casterId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
    readonly target: BattleOngoingSpellTarget;
    readonly effect: BattleOngoingSpellEffectRef;
    readonly contestedSpellLevel: BattleSpellEffectLevel;
  };
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
export type BattleSanctuaryInterdictionOutcome =
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
type BattleSanctuaryInterdictionOutcomeHoleBase = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "sanctuaryInterdictionOutcome";
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
export type BattleSanctuaryInterdictionOutcomeHole =
  BattleSanctuaryInterdictionOutcomeHoleBase &
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
export type BattleHole =
  | BattleTargetChoiceHole
  | BattleHelpAttackAllyDecisionHole
  | BattleHelpAttackEnemyDecisionHole
  | BattleCreatureAttackRollHole
  | BattleCreatureAttackDamageRollHole
  | BattleSpellCastReactionFactsHole
  | BattleSlowSomaticSpellFailureOutcomeHole
  | BattleWardingBondSeparationFactsHole
  | BattleObjectTargetChoiceHole
  | BattleObjectContactTargetsHole
  | BattleObjectContactSavingThrowOutcomeHole
  | BattleObjectDropResolutionHole
  | BattleSpellAreaChoiceHole
  | BattleTeleportDestinationHole
  | BattleSpiritualWeaponForcePositionHole
  | BattleHeldObjectFactsHole
  | BattleToolPossessionFactsHole
  | BattleCunningStrikeEndTurnCoverFactsHole
  | BattleFindFamiliarConnectionHole
  | BattleCompanionReappearancePlacementHole
  | BattleCompanionReappearanceInitiativeHole
  | BattleMagicWeaponTargetItemHole
  | BattleSpellDamageTypeChoiceHole
  | BattleSpellTargetAllocationHole
  | BattleSpellTargetListHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleDragonsBreathDamageRollHole
  | BattleGlyphExplosiveRuneDamageRollHole
  | BattleSpellDamageReductionRollHole
  | BattleSourceDamageRollPenaltyRollHole
  | BattleMirrorImageDuplicateRollHole
  | BattleSpellTurnStartDamageRollHole
  | BattleSpellTurnEndDamageRollHole
  | BattleFlamingSphereDamageRollHole
  | BattleSpikeGrowthMovementDamageRollHole
  | BattleInsectPlagueAreaHazardDamageRollHole
  | BattleCloudkillAreaHazardDamageRollHole
  | BattleSpellHealingRollHole
  | BattleSpellSkillChoiceHole
  | BattleSpellAbilityChoiceHole
  | BattleSpellTargetAbilityChoicesHole
  | BattleSpellConditionChoiceHole
  | BattleThaumaturgyActiveOneMinuteEffectCountHole
  | BattleCommandOptionChoiceHole
  | BattleSelfTransformationModeChoiceHole
  | BattleDancingLightsPlacementHole
  | BattleSpellSavingThrowOutcomeHole
  | BattleDragonsBreathSavingThrowOutcomeHole
  | BattleGlyphExplosiveRuneSavingThrowOutcomeHole
  | BattleSpellTurnStartSavingThrowOutcomeHole
  | BattleSleepRepeatSavingThrowOutcomeHole
  | BattleHideousLaughterRepeatSavingThrowOutcomeHole
  | BattleGreaseGroundHazardSavingThrowOutcomeHole
  | BattleWebRestraintSavingThrowOutcomeHole
  | BattleSleetStormAreaHazardSavingThrowOutcomeHole
  | BattleInsectPlagueAreaHazardSavingThrowOutcomeHole
  | BattleCloudkillAreaHazardSavingThrowOutcomeHole
  | BattleGustOfWindLineSavingThrowOutcomeHole
  | BattleGustOfWindLineDirectionChoiceHole
  | BattleSpellConditionEndTurnSavingThrowOutcomeHole
  | BattleSpellConditionCountedEndTurnSavingThrowOutcomeHole
  | BattleUnitFeatureConditionEndTurnSavingThrowOutcomeHole
  | BattleSlowActivePenaltiesEndTurnSavingThrowOutcomeHole
  | BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole
  | BattleFlamingSphereRamMovementHole
  | BattleMovableZoneRepositionMovementHole
  | BattleFlamingSphereSavingThrowOutcomeHole
  | BattleMoonbeamSavingThrowOutcomeHole
  | BattleMoonbeamDamageRollHole
  | BattleProtectionRelevantEffectSavingThrowOutcomeHole
  | BattleUnitFeatureSavingThrowOutcomeHole
  | BattleUnitFeatureRollHole
  | BattleUnitFeatureDecisionHole
  | BattleHitPointHealingPoolDistributionHole
  | BattleDeathSavingThrowHole
  | BattleStatBlockRechargeRollHole
  | BattleConcentrationSavingThrowHole
  | BattleInterruptDecisionHole
  | BattleMovementHole
  | BattleLevitateAltitudeChangeHole
  | BattleLevitateInitialRiseHole
  | BattleAbilityCheckHole
  | BattleSpellcastingAbilityCheckHole
  | BattleGrappleOutcomeHole
  | BattleShoveOutcomeHole
  | BattleSanctuaryInterdictionOutcomeHole
  | BattleAttackDamageDispositionHole
  | BattleDamageRelationshipDecisionHole
  | BattleOngoingSpellTargetChoiceHole
  | BattleWildShapeEquipmentDispositionHole;

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
export type BattleCreatureAttackZeroDamageFill = {
  readonly kind: "creatureAttackZeroDamage";
  readonly holeId: BattleHoleId;
  readonly creatureAttack: {
    readonly actorId: CombatantId;
    readonly targetId: CombatantId;
  };
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
export type SpellDamageReductionFill = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly targetId: CombatantId;
  readonly damageType: DamageType;
  readonly roll: DieRollResult;
};
export type SpellDamageReductionRoll = Omit<
  SpellDamageReductionFill,
  "roll"
> & {
  readonly amount: {
    readonly dice: 1;
    readonly dieSize: 4;
  };
};
export type SourceDamageRollPenaltyFill = {
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
export type BattleFill =
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
  | BattleCreatureAttackZeroDamageFill
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
      readonly kind: "thaumaturgyActiveOneMinuteEffectCount";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly activeOneMinuteEffectCount: number;
      };
    }
  | {
      readonly kind: "commandOptionChoice";
      readonly holeId: BattleHoleId;
      readonly value: BattleCommandOption;
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
      readonly kind: "dancingLightsPlacement";
      readonly holeId: BattleHoleId;
      readonly value: BattleDancingLightsPlacementValue;
    }
  | {
      readonly kind: "unitFeatureDecision";
      readonly holeId: BattleHoleId;
      readonly value:
        | "use"
        | "attempt"
        | OpenHandTechniqueDecisionChoice
        | BrutalStrikeDecisionChoice
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
      readonly kind: "findFamiliarConnection";
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
      readonly kind: "magicWeaponTargetItem";
      readonly holeId: BattleHoleId;
      readonly value: BattleMagicWeaponTargetItemFact;
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
      readonly kind: "slowSomaticSpellFailureOutcome";
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
            | "spellObjectTargetSight";
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
      readonly kind: "gustOfWindLineDirectionChoice";
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
      readonly kind: "spiritualWeaponForcePosition";
      readonly holeId: BattleHoleId;
      readonly value: BattleSpiritualWeaponForcePosition;
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
      readonly kind: "sanctuaryInterdictionOutcome";
      readonly holeId: BattleHoleId;
      readonly value: BattleSanctuaryInterdictionOutcome;
    }
  | {
      readonly kind: "interruptDecision";
      readonly holeId: BattleHoleId;
      readonly value: BattleInterruptDecision;
    }
  | {
      readonly kind: "movement";
      readonly holeId: BattleHoleId;
      readonly value: BattleMovementFillValue;
    }
  | {
      readonly kind: "levitateAltitudeChange";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly direction: BattleLevitateAltitudeDirection;
        readonly distanceFeet: MovementFeet;
      };
      readonly spatialFacts: readonly BattleTargetSpatialFact[];
    }
  | {
      readonly kind: "levitateInitialRise";
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
declare const admittedBattleResolutionInput: unique symbol;
export type AdmittedBattleResolutionInput = BattleResolutionInput & {
  readonly [admittedBattleResolutionInput]: true;
};
export type BattleResolutionInputForSubject<TSubject extends BattleSubject> =
  Omit<BattleResolutionCandidateInput, "subject"> & {
    readonly subject: TSubject;
  };
export type AttackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "attack" }>
> & {
  readonly replayingInterruptedProcedure?: boolean;
  readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  readonly pendingAttackDamageReductions?:
    | readonly BattlePendingAttackDamageReduction[]
    | undefined;
  readonly pendingAttackDamageAdditions?:
    | readonly AttackSpellDamageAddition[]
    | undefined;
};
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
  > & {
    readonly replayingInterruptedProcedure?: boolean;
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
    readonly pendingAttackDamageReductions?:
      | readonly BattlePendingAttackDamageReduction[]
      | undefined;
    readonly pendingAttackDamageAdditions?:
      | readonly AttackSpellDamageAddition[]
      | undefined;
  };
export type MartialArtsBonusUnarmedStrikeBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "bonusAction";
        readonly action: "martialArtsUnarmedStrike";
      }
    >
  > & {
    readonly replayingInterruptedProcedure?: boolean;
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
    readonly pendingAttackDamageReductions?:
      | readonly BattlePendingAttackDamageReduction[]
      | undefined;
    readonly pendingAttackDamageAdditions?:
      | readonly AttackSpellDamageAddition[]
      | undefined;
  };
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
> & {
  readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  readonly reactionContinuationSubject?: BattleSubject | undefined;
  readonly glyphStoredSpellReleaseReplay?:
    | GlyphStoredSpellReleaseReplayContext
    | undefined;
  readonly replayingInterruptedProcedure?: boolean | undefined;
  readonly pendingAttackDamageReductions?:
    | readonly BattlePendingAttackDamageReduction[]
    | undefined;
  readonly pendingAttackDamageAdditions?:
    | readonly AttackSpellDamageAddition[]
    | undefined;
};
export type BonusActionSpellBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "bonusActionSpell" }>
  > & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  };
export type BonusActionDashSpellBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "bonusActionDashSpell" }>
  > & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
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
  BattleResolutionInputForSubject<MonkFocusFlurryOfBlowsStrikeSubject> & {
    readonly replayingInterruptedProcedure?: boolean;
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
    readonly pendingAttackDamageReductions?:
      | readonly BattlePendingAttackDamageReduction[]
      | undefined;
    readonly pendingAttackDamageAdditions?:
      | readonly AttackSpellDamageAddition[]
      | undefined;
  };
export type DruidWildShapeBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "druidWildShape" }>
  >;

type WithAdmittedSubject<
  TInput extends BattleResolutionInput,
  TTag extends BattleSubject["tag"],
> = Omit<TInput, "subject"> &
  AdmittedBattleResolutionInput & {
    readonly subject: Extract<BattleSubject, { readonly tag: TTag }>;
  };

export type AdmittedActionSpellBattleResolutionInput = WithAdmittedSubject<
  ActionSpellBattleResolutionInput,
  "actionSpell"
>;
export type AdmittedBonusActionSpellBattleResolutionInput = WithAdmittedSubject<
  BonusActionSpellBattleResolutionInput,
  "bonusActionSpell"
>;
export type AdmittedBonusActionDashSpellBattleResolutionInput =
  WithAdmittedSubject<
    BonusActionDashSpellBattleResolutionInput,
    "bonusActionDashSpell"
  >;
export type AdmittedUnitFeatureBattleResolutionInput = WithAdmittedSubject<
  UnitFeatureBattleResolutionInput,
  "unitFeature"
>;
export type AdmittedUnitFeatureHeldWeaponActivationBattleResolutionInput =
  WithAdmittedSubject<
    UnitFeatureHeldWeaponActivationBattleResolutionInput,
    "unitFeatureHeldWeaponActivation"
  >;
export type AdmittedMonkFocusOptionBattleResolutionInput = WithAdmittedSubject<
  MonkFocusOptionBattleResolutionInput,
  "monkFocusOption"
>;
export type AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput =
  WithAdmittedSubject<
    MonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
    "monkFocusFlurryOfBlowsStrike"
  >;
export type AdmittedDruidWildShapeBattleResolutionInput = WithAdmittedSubject<
  DruidWildShapeBattleResolutionInput,
  "druidWildShape"
>;

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
    }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly subject: BattleSubject;
      readonly holes: readonly BattleHole[];
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
    };
export type BattleFeatherFallLandingResult =
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
      readonly slowFallReductionAmount: DamageAmount;
      readonly featherFallMitigated: boolean;
    }
  | {
      readonly tag: "invalid";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly reason: "missingCombatant";
      readonly message: string;
    };

export type BattleSnapshot = {
  readonly battleId: BattleId;
  readonly executionScopeCursors: readonly {
    readonly combatantId: CombatantId;
    readonly nextScopeOrdinal: BattleExecutionScopeCursor;
  }[];
  readonly retiredExecutionScopeAllocations: readonly {
    readonly combatantId: CombatantId;
    readonly nextScopeOrdinal: BattleExecutionScopeCursor;
    readonly ownership: BattleRetiredExecutionScopeOwnership;
  }[];
  readonly round: RoundType;
  readonly currentActorId: CombatantId;
  readonly turnOrder: readonly CombatantId[];
  readonly combatants: readonly BattleCreatureSnapshot[];
  readonly companions: readonly BattleCompanionSnapshot[];
  readonly lightEmitters: readonly BattleLightEmitter[];
  readonly obscurementZones: readonly BattleObscurementZone[];
  readonly acts: readonly BattleSnapshotAct[];
  readonly turn: BattleTurnSnapshot;
  readonly readiedResponses: {
    readonly spells: readonly BattleReadiedSpellSnapshot[];
    readonly movements: readonly BattleReadiedMovementSnapshot[];
  };
  readonly helpAttackMarkers: readonly BattleHelpAttackSnapshot[];
  readonly pendingInterrupt: {
    readonly trigger: BattleInterruptTrigger;
    readonly decisionHole: BattleInterruptDecisionHole;
    readonly choices: readonly BattleInterruptProcedureChoice[];
    readonly stackDepth: BattleReplayStackDepth;
  } | null;
};

type BattleCreatureSnapshotCommon = {
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly nextActiveEffectOrdinal: BattleActiveEffectExecutionOrdinal;
  readonly activeEffectRefs: readonly BattleActiveEffectExecutionRef[];
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
};

export type BattleCreatureSnapshot = BattleCreatureSnapshotCommon &
  (
    | {
        readonly displayName: string;
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

type WithBattleCreatureDisplayName<T> = T extends BattleCreatureSnapshot
  ? Omit<T, "displayName"> & {
      readonly displayName: import("./battle-creature-display-name.ts").BattleCreatureDisplayName;
    }
  : never;

export type BattlePresentedCreatureSnapshot =
  WithBattleCreatureDisplayName<BattleCreatureSnapshot>;

export type BattlePresentedSnapshot = Omit<BattleSnapshot, "combatants"> & {
  readonly combatants: readonly BattlePresentedCreatureSnapshot[];
};

export type BattleSnapshotPresentationIssue = {
  readonly tag: "battleSnapshotPresentationIssue";
  readonly reason: "missingStatBlockPresentation" | "invalidDisplayName";
  readonly combatantId: CombatantId;
};

export type BattleSnapshotPresentationIssues =
  ReadonlyNonEmptyArray<BattleSnapshotPresentationIssue>;

export type BattleTurnSnapshot = {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly bonusActionAvailable: boolean;
  readonly jumpDistanceMultiplier: BattleJumpDistanceMultiplier | null;
  readonly heightenedStepOfTheWindCarriedCreatures: readonly HeightenedStepOfTheWindCarriedCreature[];
  readonly spellSlotUsesThisTurn: readonly BattleTurnSpellSlotUse[];
  readonly levelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly quickenedLevelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly stunningStrikesUsedThisTurn: readonly StunningStrikeUsage[];
  readonly recklessAttackWhileRagingUsedThisTurn: readonly RecklessAttackWhileRagingUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
  readonly weaponMasteryCleaveAttackersUsedThisTurn: readonly CombatantId[];
  readonly huntersPreyHordeBreakerUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly grapplerPunchAndGrabUsedThisTurn: readonly CombatantId[];
  readonly lightWeaponAttackMade?: {
    readonly weaponItemId: string;
  };
  readonly dashMovementBonusFeet: MovementFeet;
  readonly disengaged: boolean;
};

export type BattleReadiedSpellSnapshot = BattleReadiedSpell & {
  readonly casterId: CombatantId;
};

export type BattleReadiedMovementSnapshot = BattleReadiedMovement & {
  readonly actorId: CombatantId;
};

export type BattleHelpAttackSnapshot = BattleHelpAttack;

export type BattleCreatureOriginSnapshot =
  | {
      readonly kind: "character";
      // Authored identity retained for settlement / catalog reference. Not an
      // execution or replay key. See #224 inventory.
      readonly characterId: CharacterId;
      readonly execution: {
        readonly scopeRef: BattleCharacterExecutionScopeRef;
        readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
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
        readonly statBlockId: string;
        readonly execution: StatBlockExecutionSnapshot;
      }[];
      readonly spellcasting: {
        readonly spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"];
      } | null;
    }
  | {
      readonly kind: "statBlock";
      // Authored identity retained for settlement / companion reappearance. Not
      // an execution or replay key. See #224 inventory.
      readonly statBlockId: string;
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
