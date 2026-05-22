// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
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
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-weapon-enhancement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.creature-type-protection-and-charm spell.hit-point-restoration spell.invocation-after-hit-damage spell.invocation-after-hit-damage-illumination spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-blur-attack-roll-defense spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.invocation-condition-removal-protection spell.invocation-condition-save spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-dancing-lights-movable-dim-light spell.invocation-expeditious-retreat-dash spell.invocation-feather-fall-mitigation spell.invocation-fog-cloud-obscurement spell.invocation-forced-reaction-movement spell.invocation-grease-ground-hazard spell.invocation-held-light-emitter spell.invocation-hideous-laughter-repeat-save-lifecycle spell.invocation-independent-attack-sequence spell.invocation-jump-movement-replacement spell.invocation-make-stable spell.invocation-marked-damage-rider spell.invocation-object-light spell.invocation-roll-modifier spell.invocation-sanctuary-targeting-interdiction spell.invocation-save-gated-condition-immunity spell.invocation-see-invisible-observer-sight spell.invocation-self-ability-check-advantage spell.invocation-self-teleport spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-failed-d20-test unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.innate-sorcery-activation unit-feature.martial-arts-attack-projection unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.zero-hit-point-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition-removal
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.STAT_BLOCK.ATTACK_CONTROL
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
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
  MovementDeltaFeet,
  MovementFeet,
  SpellSlotLevel,
  movementFeet,
  type Condition,
  type DamageDieSize,
  type ReadonlyNonEmptyArray,
  type Round as RoundType,
} from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  DcSource,
  DiceExpr,
  EffectAtom,
  Size,
  Skill,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import { Brand } from "effect";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  StatBlockMutableResourceState,
  StatBlockPartKey,
  StatBlockResourceSnapshot,
  SupportedAttackActionOption,
} from "./battle-action-options.ts";
import type {
  BattleDruidWildShapeKnownForm,
  BattlePositiveHpUnconscious,
  CharacterBattleInvocationFeature,
  BattleUnitRef,
  BattleWalkSpeed,
  CharacterBattleLoadoutRef,
  CharacterBattleWeaponMasterySelection,
} from "./battle-init.ts";
import {
  type BattleReactionTrigger,
  type BattleReadiedSpellTrigger,
} from "./battle-reaction-triggers.ts";
import {
  type ActionHideSubject,
  type ActionSearchSubject,
  type BattleMovementSpeedKind,
  type BattleSubject,
  type BonusActionStandardActionSubject,
  type MonkFocusFlurryOfBlowsStrikeSubject,
  type MonkFocusOptionSubject,
  type SpellInvocationRef,
} from "./battle-subjects.ts";
import {
  type CharacterBattleMetamagicState,
  type CharacterBattleResourceState,
  type CharacterBattleSpellcastingState,
} from "./character-battle-resources.ts";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import type {
  FindFamiliarSnapshot,
  FindFamiliarState,
} from "./find-familiar-lifecycle.ts";
import type {
  BattleAreaId,
  BattleDancingLightId,
  BattleLineDirectionId,
  BattleObjectId,
  BattleSpellEffectOccurrenceId,
  SpellId,
  BattleTablePositionId,
  CharacterId,
  InitiativeScore,
} from "./identity.ts";
import {
  BattleCombatantSide,
  BattleId,
  BattleReplayStackDepth,
  CombatantId,
} from "./identity.ts";
import {
  type BattlePassiveSpeedBonusSupportProfile,
  type BattlePassiveSpeedKindGrantsSupportProfile,
  type ReactionReductionResourceDie,
  type ReactionReductionResourceSpend,
  type ReactionRollOrDamageReductionProfile,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import type { ZeroHpLifecycle } from "./zero-hp-lifecycle.ts";

import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleSpellEffectBase,
  MarkedDamageRiderRetargetTiming,
  SelfTransformationNaturalWeaponFacts,
  SpellConditionEscape,
  SpellCreatedHeldObjectActiveEffect,
  SpellLevitatedCreatureActiveEffect,
  SpellObjectContactDamageActiveEffect,
  SpellTurnStartDamage,
  SpellTurnStartDamageSave,
  TurnAnchoredBattleActiveEffectExpiration,
} from "./active-effect/types.ts";
import { type DamageAmountByTypeEntry } from "./battle-reducer/damage-helpers.ts";
import type { BattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import {
  BATTLE_ATTACK_RANGE_BANDS,
  type BattleD20RollModifierDieSize,
  type BlurAttackRollBypassSense,
  COMMAND_OPTIONS,
  CRITICAL_HIT_THRESHOLDS,
  DIRECT_CONDITION_REMOVAL_CONDITIONS,
  type EldritchBlastBeamCount,
  HUNTERS_MARK_FINDING_SKILLS,
  type MirrorImageDuplicateCount,
  type MirrorImageUnaffectedSense,
  type ScorchingRayRayCount,
  type SelfTransformationModeKind,
  THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
  type BattleAntimagicFieldOngoingSpellEffectSourceKind,
} from "./battle-reducer/domain-constants.ts";
export {
  addBattleCombatant,
  removeBattleCombatants,
  startBattle,
} from "./battle-reducer/api-lifecycle.ts";

export {
  actorHasClassFeatureExtraAttackActionResource,
  actorHasStatBlockMultiattackActionResource,
  canSpendEscapeGrappleActionResource,
  currentActorHasOpenStatBlockMultiattackDispatch,
  dashActsForActor,
  dashSubjectForSpeedKind,
  discoverBattleActs,
  hasTurnActionResource,
  isClassFeatureExtraAttackActionResource,
  isStatBlockBattleCreatureState,
  isStatBlockMultiattackActionResource,
  isSupportedLiteralMultiattackDispatch,
  movementActs,
  releaseGrappleActs,
  spendTurnAction,
  standardActionLabel,
  statBlockBonusActionOptionActs,
  statBlockMultiattackActs,
  subjectAllowedDuringStatBlockMultiattackDispatch,
  supportedLiteralMultiattackDispatches,
  supportedStatBlockBonusActionOptions,
  supportedStatBlockBonusActionStandardAction,
  supportedStatBlockMultiattacks,
} from "./battle-reducer/battle-discovery.ts";

export {
  discoverLegendaryActionActs,
  hasReactionRollOrDamageReductionRangeFact,
  ongoingFeatureIsAvailable,
  resolveBardicInspirationFailedD20Test,
  resolveDruidWildShapeUnitFeature,
  resolveExtraActionGrantUnitFeature,
  resolveFailedAbilityCheckResourceBoost,
  resolveOngoingFeatureUnitFeature,
  resolveSelfBonusActionHealingUnitFeature,
  resolveSuccessfulAbilityCheckReactionReduction,
  resolveUnitFeature,
  selfBonusActionHealingAmount,
  selfBonusActionHealingRollFill,
  selfBonusActionHealingRollHole,
  selfBonusActionHealingRollHoleId,
  selfBonusActionHealingRollHoleInstanceKey,
  selfBonusActionHealingRollProtocolId,
  selfBonusActionHealingStaleMessage,
  druidWildShapeActsForResource,
  supportedUnitFeatureActs,
  supportedUnitFeatureProfileForResource,
} from "./battle-reducer/unit-features.ts";

export {
  applyBattleMovement,
  applyStartOfTurnActiveEffects,
  expireActiveEffects,
  expireEndOfTurnEffects,
  expireEndOfTurnOngoingFeatures,
  expireOngoingFeatures,
  expireStartOfTurnEffects,
  expireStartOfTurnOngoingFeatures,
  movementHole,
  commandPendingEffectsForActor,
  greaseGroundHazardSavingThrowOutcomeHole,
  webRestraintSavingThrowOutcomeHole,
  movementHoleWithBudget,
  parseBattleMovement,
  readiedMovementBudgetForActor,
  readiedMovementHole,
  readiedMovementInitialHoles,
  readiedSpellInitialHoles,
  resetBattleTurnResources,
  resetPerTurnCharacterResources,
  resetSpellDamageReductionsForNewTurn,
  resetStartOfTurnCombatant,
  gustOfWindLineDirectionChoiceHole,
  gustOfWindLineSavingThrowOutcomeHole,
  resolveCommandFleeAfterMovement,
  resolveCommandFleeCommand,
  resolveEndTurn,
  resolveFlamingSphereRepositionCommand,
  resolveFlamingSphereRamCommand,
  resolveFlamingSphereSaveCommand,
  resolveMoonbeamRepositionCommand,
  resolveMoonbeamSaveCommand,
  resolveCommandApproachAfterMovement,
  resolveCommandApproachCommand,
  resolveCommandDropCommand,
  resolveCommandGrovelCommand,
  resolveEndTurnCommand,
  resolveGreaseGroundHazardSaveCommand,
  resolveWebAreaRemovedCommand,
  resolveWebRestrainedNoLongerInAreaCommand,
  resolveWebRestraintSaveCommand,
  resolveGustOfWindLineDirectionChangeCommand,
  resolveGustOfWindLineSaveCommand,
  resolveJumpMovementReplacementCommand,
  resolveMoveAfterMovement,
  resolveMoveCommand,
  resolveOpportunityAttackCommand,
  resolveReleaseReadiedMovementCommand,
  resolveReleaseReadiedSpellCommand,
  resolveStandFromProneCommand,
  standFromProneCostFeet,
  statBlockRechargeRollFillMatchesHole,
  tickDurationEffects,
} from "./battle-reducer/turn-end-movement.ts";

export {
  abilityCheckFill,
  applyDashToActor,
  applyDisengage,
  attackRollHitsWithCriticalThreshold,
  attackRollIsCriticalHit,
  attackUsesWeaponOrUnarmedStrikeCriticalRange,
  battleCreatureInitFromStatBlock,
  classFeatureExtraAttackForActor,
  compatibleAttackActionResource,
  criticalThresholdForAttack,
  grappleFillSet,
  hasHelpAttackTargetSpatialFact,
  helpAttackAllyChoices,
  helpAttackAllyHole,
  helpAttackTargetChoices,
  helpAttackTargetHole,
  needsAttackDamageConcentrationResult,
  openClassFeatureExtraAttackResource,
  resolveBonusActionDash,
  resolveBonusActionDashTemporaryHitPoints,
  resolveBonusActionDisengage,
  resolveBonusActionStandardAction,
  resolveDash,
  resolveDisengage,
  resolveDodge,
  resolveEscapeGrapple,
  resolveEscapeSpellRestraint,
  resolveGrapple,
  resolveHelpAttack,
  resolveHide,
  resolveMultiattack,
  resolveReady,
  resolveReleaseGrappleCommand,
  resolveSearch,
  resolveShove,
  resolveShakeAwakeFromSleep,
  resolveStatBlockBonusActionDisengage,
  resolveStatBlockBonusActionHide,
  resolveStatBlockBonusActionOption,
  spellSaveDcForCaster,
  shoveFillSet,
  spendAttackAction,
  spendAttackActionResource,
  validateAttackDamageFill,
  validateRolledDiceForWeaponAttack,
} from "./battle-reducer/attack-resolution.ts";

export {
  fixedAttackDamageAmount,
  fixedAttackDamageByTypeEntries,
} from "./battle-reducer/damage-helpers.ts";

export {
  dragonsBreathExhaleActs,
  dragonsBreathSavingThrowOutcomeHole,
  resolveDragonsBreathExhaleCommand,
} from "./battle-reducer/dragons-breath.ts";

export {
  isMonkFocusFlurryOfBlowsActionResource,
  monkFocusActs,
  resolveMonkFocusFlurryOfBlowsStrike,
  resolveMonkFocusOption,
} from "./battle-reducer/monk-focus.ts";

export {
  actionHideSubject,
  actionSearchSubject,
  activeReactionWithReplayContinuationAttackDamageChanges,
  admittedReactionChoice,
  attackDamageContinuationAmount,
  attackDamageContinuationConcentrationFill,
  attackDamageContinuationConcentrationFrame,
  attackDamageContinuationConcentrationHole,
  attackDamageEventAfterPendingReduction,
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamagePrefixFills,
  attackDamageReductionRedirectResource,
  attackDamageReductionRedirectResourceAvailable,
  attackDamageReductionZeroDamageRedirectHoles,
  attackDamageReductionZeroDamageRedirectSelection,
  attackDamageReductionZeroDamageRedirectTargetChoices,
  attackDamageRiderSelectionsEqual,
  attackFillsThroughAttackRoll,
  battleFillEquals,
  battleTurnSnapshot,
  completeActiveReactionProcedure,
  completeResolvedActiveReactionIfPending,
  consumeOrCloseLegendaryActionWindow,
  currentInterruptFrame,
  currentReactionFrame,
  damageAmountByTypeEntriesAfterScalarReduction,
  endTurn,
  hasAttackDamageReductionRedirectTargetSpatialFact,
  isReleaseGrappleSubject,
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  openBattleReactionWindow,
  openCreatureFallsReactionWindow,
  opportunityAttackReactionChoices,
  pendingReactionSnapshot,
  reactionChoices,
  reactionDecisionHole,
  reactionFrameAfterModifier,
  reactionInterruptFrame,
  reactionModifiedAttackRollFills,
  reactionTriggerLabel,
  readiedMovementReactionChoices,
  readiedSpellReactionChoices,
  replayContinuationFrame,
  resolveAttackDamageContinuationConcentration,
  resolveAttackDamageReductionZeroDamageRedirectAfterReduction,
  resolveBattleReaction,
  resolveBattleSubject,
  resolveBattleSubjectInternal,
  resolveCastTriggeredReactionSpellCommand,
  resolveFeatherFallLanding,
  resolveReactionRollOrDamageReduction,
  resolveReplayContinuation,
  resolveReplayContinuationFromState,
  resumeInterruptedProcedure,
  rolledDiceGroupsEqual,
  sameReactionProcedureChoice,
  snapshotBattle,
  spendAttackDamageReductionRedirectResource,
  spendReaction,
  standardActionKindForSubject,
  suppressReactionTriggerForActiveReaction,
  unofferedEligibleReactors,
} from "./battle-reducer/dispatcher.ts";

export { zeroHpLifecycleIsTerminal } from "./battle-reducer/creature-state-leaves.ts";
export { combatantKnockedOutUnconscious } from "./battle-reducer/creature-state.ts";

export {
  attackFillSet,
  validateUniqueAttackTargetRangeFacts,
} from "./battle-reducer/attack-fill-set.ts";
export {
  resolveAttack,
  resolveWeaponMasteryCleaveContinuation,
} from "./battle-reducer/attack-main.ts";
export {
  resolveMartialArtsBonusUnarmedStrike,
  resolveOffHandAttack,
  spendOffHandBonusAction,
} from "./battle-reducer/attack-offhand.ts";
export {
  breakBattleConcentration,
  resolveBattleConcentrationDamage,
} from "./battle-reducer/damage-apply.ts";
export {
  concentrationSavingThrowDc,
  scoreModifier,
} from "./battle-reducer/domain-helpers.ts";
export {
  abilityProficiencyDifficultyClass,
  attackDamageReductionOriginalDamageType,
  characterAbilityModifier,
  isBattleRolledDiceFill,
  reactionModifierReductionRoll,
  reactionModifierReductionTotal,
  reactionModifierResourceAvailable,
  reactionModifierResourceSpend,
  reactionModifierResourceUnitId,
  reactionModifierRollHole,
  reactionReductionResourceDieLabel,
  reactionReductionResourceDieRollTotal,
  reactionRollOrDamageReductionChoiceForProfile,
  reactionRollOrDamageReductionChoices,
  rolledDiceFillTotal,
  spendReactionModifierResource,
} from "./battle-reducer/reaction-modifiers.ts";
export {
  shieldReactionSpellMatchesTrigger,
  triggeredReactionSpellChoices,
  triggeredReactionSpellTurnResourceAvailable,
} from "./battle-reducer/reaction-triggered-spells.ts";
export {
  activeOngoingFeaturesPreventSpellcasting,
  damageSpellSource,
  isPreparedDamageSpellSource,
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
} from "./battle-reducer/spells-invocation-guards.ts";
export {
  activeFeatherFallDescentRateCapFeetPerRound,
  activeSelfTransformationModeEffect,
  battleIlluminationFromLightEmitters,
  battleMagicalDarknessNonmagicalLightIllumination,
  battleMagicalDarknessSightObscurement,
  battleCreatureCanBreatheUnderwater,
  battleLightEmitterProjection,
  battleLightEmitters,
  battleObscurementZones,
  battlePerceptionRollModeForObscurement,
  battlePerceptionRollModeForSight,
  battleSightObscurement,
  FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
} from "./battle-reducer/spells-active-effects.ts";
export {
  SELF_TRANSFORMATION_MODE_KINDS,
  type SelfTransformationModeKind,
} from "./battle-reducer/domain-constants.ts";
export const BATTLE_SPECIAL_SPEED_KINDS = [
  "climb",
  "swim",
] as const satisfies ReadonlyArray<Exclude<BattleMovementSpeedKind, "walk">>;
export type BattleSpecialSpeedKind =
  (typeof BATTLE_SPECIAL_SPEED_KINDS)[number];
export const BATTLE_D20_ROLL_MODIFIER_KINDS = [
  "ability_check",
  "attack_roll",
  "saving_throw",
] as const satisfies ReadonlyArray<BattleD20RollModifierKind>;
export const MAGIC_WEAPON_ENHANCEMENT_BONUSES = [
  1, 2, 3,
] as const satisfies ReadonlyArray<number>;
export type MagicWeaponEnhancementBonus =
  (typeof MAGIC_WEAPON_ENHANCEMENT_BONUSES)[number];
export const KNOWN_WILLING_TARGET_ROLL_MODIFIER_SPELL_IDS: ReadonlyArray<
  SpellRecord["id"]
> = ["guidance"];
export const KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS: ReadonlyArray<
  SpellRecord["id"]
> = ["resistance"];
export type CriticalHitThreshold = (typeof CRITICAL_HIT_THRESHOLDS)[number];
export type BattleD20RollModifierKind = Extract<
  Extract<EffectAtom, { readonly kind: "modify_roll_numeric" }>["on"][number],
  "ability_check" | "attack_roll" | "saving_throw"
>;
export type BattleD20RollModifierDelta = {
  readonly sign: "+" | "-";
} & (
  | {
      readonly kind: "fixedNumber";
      readonly amount: number;
    }
  | {
      readonly dice: number;
      readonly dieSize: BattleD20RollModifierDieSize;
    }
);
export type BattlePassiveSpeedProfile =
  | BattlePassiveSpeedBonusSupportProfile
  | BattlePassiveSpeedKindGrantsSupportProfile;

export type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattlePossessionAttemptDisposition,
  BattleSpellEffectEarlyEnd,
  BattleTurnAnchor,
  MarkedDamageRiderRetargetTiming,
  MarkedDamageRiderTransferState,
  ObjectContactPenaltyActiveEffect,
  ProtectionFromEvilAndGoodPreventedCondition,
  SelfTransformationModeEffectPayload,
  SelfTransformationNaturalWeaponFacts,
  SpellLevitatedCreatureActiveEffect,
  SpellConditionAbilityCheckActor,
  SpellConditionAbilityCheckSuccessEnd,
  SpellConditionEscape,
  SpellCreatedHeldObjectActiveEffect,
  SpellCreatedHeldObjectState,
  SpellObjectContactDamageActiveEffect,
  SpellTurnStartDamage,
  SpellTurnStartDamageSave,
} from "./active-effect/types.ts";

export type BattleConcentration = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly effectKind: "spellEffect" | "readiedSpell";
};
export type BattleObjectOutline = BattleSpellEffectBase & {
  readonly kind: "faerieFireObjectOutline";
  readonly objectId: BattleObjectId;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  >;
};
export type BattleLightEmission =
  | {
      readonly kind: "dim";
      readonly radiusFeet: MovementFeet;
    }
  | {
      readonly kind: "brightAndDim";
      readonly brightRadiusFeet: MovementFeet;
      readonly dimAdditionalFeet: MovementFeet;
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
export type BattleObjectInvisibleRevealLightEmitter = BattleSpellEffectBase & {
  readonly kind: "objectInvisibleRevealLightEmitter";
  readonly objectId: BattleObjectId;
  readonly emission: Extract<BattleLightEmission, { readonly kind: "dim" }>;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "endOfTurn" }
  >;
};
export type BattleLightEmitter =
  | BattleSpellLightEmitter
  | BattleObjectInvisibleRevealLightEmitter;
export type BattleOngoingSpellEffectRef =
  | {
      readonly kind: "spellLightEmitter";
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
    }
  | {
      readonly kind: "spellActiveEffect";
      readonly activeEffectKind: "spellObjectContactDamage";
      readonly sourceEffectId: BattleSpellEffectOccurrenceId;
    };
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
  readonly spellId: SpellRecord["id"];
  readonly target: BattleOngoingSpellTarget;
  readonly rangeFeet: MovementFeet;
};
export type BattleSpellObscurementZone = {
  readonly kind: "spellObscurementZone";
  readonly sourceSpellId: SpellRecord["id"];
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
      };
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  >;
};
export type BattleMagicalDarknessZone = {
  readonly kind: "spellMagicalDarknessZone";
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
  readonly area: {
    readonly kind: "pointOriginSphere";
    readonly areaId: BattleAreaId;
    readonly radiusFeet: MovementFeet;
  };
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  >;
};
export type BattleObscurementZone =
  | BattleSpellObscurementZone
  | BattleMagicalDarknessZone;
export type BattleDancingLightsForm = "separateLights" | "combinedMediumForm";
export type BattleDancingLight = {
  readonly lightId: BattleDancingLightId;
  readonly positionId: BattleTablePositionId;
};
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
  readonly invocation: ReadiedSpellInvocation;
  readonly trigger: BattleReadiedSpellTrigger;
  readonly expiresAt: TurnAnchoredBattleActiveEffectExpiration;
};
// SRD 5.2.1 Ready [Action]: Ready can hold a chosen action, or the special
// alternative to move up to Speed. This runtime slice models only that
// movement alternative for non-spell Ready responses.
export type BattleReadiedMovement = {
  // supported runtime trigger buckets, not the RAW Ready trigger taxonomy; RAW is closer to "table decision" and probably shall be modeled like that
  readonly trigger: BattleReactionTrigger;
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
export type BattleInterruptedProcedure =
  | {
      readonly kind: "replay";
      readonly subject: BattleSubject;
      readonly fills: readonly BattleFill[];
      readonly attackDamageReductions?: readonly BattlePendingAttackDamageReduction[];
      readonly attackDamageAdditions?: readonly AttackSpellDamageAddition[];
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
  | {
      readonly kind: "attackDamage";
      readonly subject: BattleAttackHostSubject;
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly damageEvent: BattleAttackDamageEvent;
      readonly fills: readonly BattleAttackDamagePrefixFill[];
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly deathFailuresAtZeroHp: 1 | 2;
      readonly damageDisposition: BattleAttackDamageDisposition;
      readonly attackDamageRiders: readonly AttackDamageRider[];
      readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill;
    };
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
  | (Extract<BattleSubject, { readonly tag: "actionSpell" }> & {
      readonly componentWeaponItemId: string;
    })
  | Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    >;
export type BattleAttackDamagePrefixFill = Extract<
  BattleFill,
  {
    readonly kind:
      | "targetChoice"
      | "attackRoll"
      | "rolledDice"
      | "attackDamageDisposition";
  }
>;
export type BattleAfterDamageEvent = {
  readonly damageSourceId: CombatantId;
  readonly damagedId: CombatantId;
  readonly damageAmount: DamageAmount;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
};
export type BattlePendingAttackDamageReduction = {
  readonly reactorId: CombatantId;
  readonly unitId: UnitRecord["id"];
  readonly label: string;
  readonly reduction: Extract<
    BattleReactionModifierChoice,
    { readonly kind: "attackDamageReduction" }
  >["reduction"];
  readonly reductionAmount: number;
  readonly zeroDamageRedirect?: AttackDamageReductionZeroDamageRedirectOffer;
};
export type AttackDamageReductionZeroDamageRedirectAvailableOffer = {
  readonly reactorId: CombatantId;
  readonly unitId: UnitRecord["id"];
  readonly label: string;
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
    ReactionRollOrDamageReductionProfile,
    { readonly kind: "attackDamageReduction" }
  >["zeroDamageRedirect"]
>["targetGate"];
export type AttackDamageReductionZeroDamageRedirectOffer = {
  readonly spends: ReactionReductionResourceSpend;
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
type BattleReactionProcedureChoiceWithSubject = {
  readonly reactorId: CombatantId;
  readonly subject: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>;
  readonly initialHoles: readonly BattleHole[];
} & (
  | {
      readonly kind: "releaseReadiedSpell";
      readonly readiedSpellCasterId: CombatantId;
    }
  | {
      readonly kind: "releaseReadiedMovement";
      readonly readiedMovementActorId: CombatantId;
    }
  | {
      readonly kind: "castTriggeredReactionSpell";
      readonly invocation: SpellInvocationRef;
    }
  | {
      readonly kind: "castAttackHitBonusActionSpell";
      readonly invocation: SpellInvocationRef;
    }
  | {
      readonly kind: "opportunityAttack";
    }
);
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
      readonly unitId: UnitRecord["id"];
      readonly label: string;
      readonly reduction: BattleReactionRolledResourceReduction;
    }
  | {
      readonly kind: "attackDamageReduction";
      readonly unitId: UnitRecord["id"];
      readonly label: string;
      readonly reduction:
        | { readonly kind: "halfDamage" }
        | {
            readonly kind: "rolled";
            readonly flatModifier: number;
            readonly dieSize: 10;
          };
      readonly zeroDamageRedirect?: {
        readonly spends: ReactionReductionResourceSpend;
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
    };
type BattleReactionRolledResourceReduction = Omit<
  ReactionReductionResourceDie,
  "kind"
> & {
  readonly kind: "rolled";
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
      readonly unitId: UnitRecord["id"];
    };
export type BattleReactionProcedureModifierChoice = {
  readonly kind: "reactionRollOrDamageReduction";
  readonly reactorId: CombatantId;
  readonly choice: BattleReactionModifierChoice;
  readonly initialHoles: readonly BattleHole[];
};
export type BattleReactionProcedureChoice =
  | BattleReactionProcedureChoiceWithSubject
  | BattleReactionProcedureModifierChoice;
export type BattleReactionProcedureSelection = {
  readonly fills: readonly BattleFill[];
} & (
  | {
      readonly kind: "releaseReadiedSpell";
      readonly readiedSpellCasterId: CombatantId;
    }
  | {
      readonly kind: "releaseReadiedMovement";
      readonly readiedMovementActorId: CombatantId;
    }
  | {
      readonly kind: "castTriggeredReactionSpell";
      readonly invocation: SpellInvocationRef;
    }
  | {
      readonly kind: "castAttackHitBonusActionSpell";
      readonly invocation: SpellInvocationRef;
    }
  | {
      readonly kind: "opportunityAttack";
      readonly reactorId: CombatantId;
    }
  | {
      readonly kind: "reactionRollOrDamageReduction";
      readonly unitId: UnitRecord["id"];
      readonly modifierKind: BattleReactionModifierChoice["kind"];
    }
);
type BattleActiveReactionProcedure = {
  readonly reactorId: CombatantId;
  readonly subject: BattleReactionProcedureChoiceWithSubject["subject"];
  readonly fills: readonly BattleFill[];
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  readonly pendingAttackDamageReductions?:
    | readonly BattlePendingAttackDamageReduction[]
    | undefined;
  readonly pendingAttackDamageAdditions?:
    | readonly AttackSpellDamageAddition[]
    | undefined;
};
type BattleReactionFrameBase = {
  readonly eligibleReactors: readonly CombatantId[];
  readonly offeredReactors: readonly CombatantId[];
  readonly choices: readonly BattleReactionProcedureChoice[];
  readonly activeReaction?: BattleActiveReactionProcedure;
};
type BattleReactionFrameWithContinuationBase = BattleReactionFrameBase & {
  readonly continuation: BattleInterruptedProcedure;
};
export type BattleReactionFrame =
  | (BattleReactionFrameWithContinuationBase & {
      readonly trigger: "attackHit";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly attackRoll: AttackRollResult;
      readonly attackKind: BattleAttackKindForRedirect;
      readonly attackHitTriggerKind: BattleAttackHitTriggerKind;
      readonly damageTypes: readonly DamageType[];
    })
  | (BattleReactionFrameBase & {
      readonly trigger: "attackDamage";
      readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
    })
  | (BattleReactionFrameWithContinuationBase & {
      readonly trigger: "spellCast";
      readonly casterId: CombatantId;
      readonly spellId: SpellRecord["id"];
      readonly castLevel: number;
      readonly components: readonly SpellComponent[];
      readonly castingResource: BattleSpellCastingTimeResource;
      readonly spellSlotCommitment: BattleSpellCastSlotCommitment;
      readonly targetIds: readonly CombatantId[];
      readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
    })
  | (BattleReactionFrameWithContinuationBase & {
      readonly trigger: "saveFailed";
      readonly targetId: CombatantId;
      readonly sourceSpellId?: SpellRecord["id"];
    })
  | (BattleReactionFrameWithContinuationBase & {
      readonly trigger: "afterDamage";
      readonly damageSourceId: CombatantId;
      readonly damagedId: CombatantId;
      readonly damageAmount: DamageAmount;
      readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
    })
  | (BattleReactionFrameWithContinuationBase & {
      readonly trigger: "creatureFalls";
      readonly fallingCreatureId: CombatantId;
      readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
    })
  | (BattleReactionFrameWithContinuationBase & {
      readonly trigger: "opportunityAttack";
      readonly moverId: CombatantId;
      readonly threats: readonly BattleOpportunityAttackThreat[];
    });
export type BattleInterruptFrame =
  | { readonly kind: "reaction"; readonly frame: BattleReactionFrame }
  | BattleReplayContinuationFrame
  | BattleAttackDamageContinuationConcentrationFrame;
export type BattleReactionInterruptFrame = Extract<
  BattleInterruptFrame,
  { readonly kind: "reaction" }
>;
export type SpellComponent = "V" | "S" | "M";
export type BattleSpellCastingTimeResource =
  | { readonly kind: "magicAction" }
  | { readonly kind: "bonusAction" }
  | { readonly kind: "reaction" }
  | { readonly kind: "alreadySpent" };
export type BattleSpellCastSlotCommitment =
  | { readonly kind: "none" }
  | { readonly kind: "pendingCasterSpellSlot" };
export type BattleReplayContinuationFrame = {
  readonly kind: "replayContinuation";
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
  readonly suppressedReactionTrigger: BattleReactionTrigger;
};
export type BattleAttackDamageContinuationConcentrationFrame = {
  readonly kind: "attackDamageContinuationConcentration";
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly suppressedReactionTrigger: BattleReactionTrigger;
};
export type BattleReactionFrameInput = BattleReactionFrame extends infer T
  ? T extends BattleReactionFrame
    ? Omit<
        T,
        "eligibleReactors" | "offeredReactors" | "choices" | "activeReaction"
      >
    : never
  : never;
export type BattleReactionDecision =
  | {
      readonly kind: "decline";
      readonly reactorId: CombatantId;
    }
  | {
      readonly kind: "resolve";
      readonly reactorId: CombatantId;
      readonly choice: BattleReactionProcedureSelection;
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
  readonly targetExemptFromDragCost: boolean;
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
    };
export type BattleMovementFillValue = {
  readonly speedKind: BattleMovementSpeedKind;
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly areaDifficultTerrain?: BattleAreaDifficultTerrainMovementFact;
  readonly gustOfWindLineMovement?: BattleGustOfWindLineMovementFact;
  readonly jumpMovementReplacement?: BattleJumpMovementReplacementFact;
  readonly levitatedMovement?: BattleLevitatedMovementFact;
  readonly commandApproach?: BattleCommandApproachMovementFact;
  readonly commandFlee?: BattleCommandFleeMovementFact;
};
export type BattleAreaDifficultTerrainSource =
  | {
      readonly kind: "greaseGroundHazard";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "webAreaHazard";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "spikeGrowthHazard";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
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
  readonly sourceSpellId: SpellRecord["id"];
  readonly areaId: BattleAreaId;
  readonly directionId: BattleLineDirectionId;
  readonly totalDistanceFeet: MovementFeet;
  readonly closerDistanceFeet: MovementFeet;
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
  readonly sourceSpellId: SpellRecord["id"];
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
  readonly spellId: SpellId;
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
export type BattleOpportunityAttackThreat = {
  readonly reactorId: CombatantId;
  readonly attackName: string;
};
export type BattleTargetSpatialFact =
  | {
      readonly kind: "attackTargetInMeleeReach";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly attackName: string;
    }
  | {
      readonly kind: "cleaveSecondTargetWithin5FeetOfFirstTarget";
      readonly attackerId: CombatantId;
      readonly firstTargetId: CombatantId;
      readonly secondTargetId: CombatantId;
    }
  | {
      readonly kind: "attackTargetInRangedRange";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly attackName: string;
      readonly rangeBand: BattleAttackRangeBand;
    }
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
      readonly spellId: SpellRecord["id"];
    }
  | {
      readonly kind: "spellTargetKnownWilling";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly spellId: SpellRecord["id"];
    }
  | {
      readonly kind: "spiritualWeaponTargetWithinForceReach";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly spellId: SpellRecord["id"];
      readonly forcePositionId: BattleTablePositionId;
      readonly reachFeet: MovementFeet;
    }
  | {
      readonly kind: "wardingBondPairedWornPlatinumRings";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly spellId: SpellRecord["id"];
    }
  | {
      readonly kind: "wardingBondCreaturesDistance";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly spellId: SpellRecord["id"];
      readonly distanceFeet: MovementFeet;
    }
  | {
      readonly kind: "spellObjectTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly spellId: SpellRecord["id"];
      readonly rangeFeet: MovementFeet;
      readonly armorClass: ArmorClass;
      readonly damageDisposition: BattleObjectDamageDisposition;
    }
  | {
      readonly kind: "spellObjectIgnition";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly spellId: SpellRecord["id"];
      readonly disposition: BattleObjectIgnitionDisposition;
    }
  | {
      readonly kind: "spellObjectTargetSight";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly spellId: SpellRecord["id"];
      readonly attackerCanSeeObject: boolean;
    }
  | {
      readonly kind: "spellObjectLightTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly spellId: SpellRecord["id"];
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
      readonly spellId: SpellRecord["id"];
    }
  | {
      readonly kind: "spellManufacturedMetalObjectTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly spellId: SpellRecord["id"];
      readonly rangeFeet: MovementFeet;
      readonly casterCanSeeObject: true;
    }
  | {
      readonly kind: "spellObjectPhysicalContact";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
      readonly objectId: BattleObjectId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "spellObjectWithinSpellRange";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
      readonly objectId: BattleObjectId;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "spellObjectHoldingOrWearing";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
      readonly objectId: BattleObjectId;
      readonly targetId: CombatantId;
      readonly relation: "holding" | "wearing";
    }
  | {
      readonly kind: "spellLeapTargetWithinRange";
      readonly previousTargetId: CombatantId;
      readonly targetId: CombatantId;
      readonly spellId: SpellRecord["id"];
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "spellTargetsInPointOriginSphere";
      readonly casterId: CombatantId;
      readonly spellId: SpellRecord["id"];
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
      readonly unitId: UnitRecord["id"];
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "bardicInspirationTargetCanHear";
      readonly bardId: CombatantId;
      readonly targetId: CombatantId;
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "reactionRollOrDamageReductionTargetWithinRange";
      readonly reactorId: CombatantId;
      readonly targetId: CombatantId;
      readonly unitId: UnitRecord["id"];
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "reactionSpellDamagerVisibleWithinRange";
      readonly reactorId: CombatantId;
      readonly damageSourceId: CombatantId;
      readonly spellId: SpellRecord["id"];
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange";
      readonly reactorId: CombatantId;
      readonly fallingCreatureId: CombatantId;
      readonly spellId: SpellRecord["id"];
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "featherFallTargetFallingWithinRange";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly spellId: SpellRecord["id"];
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "levitatedTargetWithinSpellRange";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
      readonly targetId: CombatantId;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "counterspellTriggerCasterVisibleWithinRange";
      readonly reactorId: CombatantId;
      readonly casterId: CombatantId;
      readonly spellId: SpellRecord["id"];
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
      readonly kind: "sneakAttackAllyWithin5FeetOfTarget";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly allyId: CombatantId;
    };
export type BattleSpellCastReactionFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;
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
  readonly sourceSpellId: SpellId;
  readonly destination: BattleTeleportDestination;
  readonly spendsMovement: false;
  readonly provokesOpportunityAttacks: false;
  readonly transportsWornAndCarriedEquipment: true;
};
export type BattleThunderwaveAudibleBoom = {
  readonly sound: "thunderous boom";
  readonly audibleRadiusFeet: MovementFeet;
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
  readonly areaDifficultTerrain?: BattleAreaDifficultTerrainMovementFact;
  readonly jumpMovementReplacement?: BattleJumpMovementReplacementFact;
  readonly levitatedMovement?: BattleLevitatedMovementFact;
};
export type HealingSpellActionCost = "magicAction" | "bonusAction";
export type PreparedSpellAccess = { readonly tag: "prepared" };
type ClassCantripSpellAccess = { readonly tag: "classCantrip" };
type ArmorOfShadowsSpellAccess = { readonly tag: "armorOfShadows" };
type SpellEffectSpellAccess = {
  readonly tag: "spellEffect";
  readonly sourceCombatantId: CombatantId;
};
export type SpellSlotInvocationResource = {
  readonly tag: "spellSlot";
  readonly slotLevel: SpellSlotLevel;
};
type NoSpellInvocationResource = { readonly tag: "none" };
export type ClassFeatureFreeCastInvocationResource = {
  readonly tag: "classFeatureFreeCast";
  readonly resourceUnitId: UnitRecord["id"];
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
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>["phases"][number];
export type SpellAttackKind = Extract<
  SpellActivationPhase,
  { readonly kind: "attack_roll" }
>["attackKind"];
export type SpellAttackHitEffect = Extract<
  SpellActivationPhase,
  { readonly kind: "attack_roll" }
>["onHit"][number];
export type SpellObjectHitEffect =
  | { readonly kind: "none" }
  | { readonly kind: "igniteFlammableUnattended" };
export type SaveGateFailureEffect = Extract<
  SpellActivationPhase,
  { readonly kind: "save_gate" }
>["onFail"];
export type SpellTargeting =
  | {
      readonly kind: "singleCombatant";
    }
  | {
      readonly kind: "singleCreatureOrObject";
    }
  | {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    }
  | {
      readonly kind: "pointOriginSphere";
      readonly radiusFeet: MovementFeet;
    }
  | {
      readonly kind: "pointOriginSphereDiameter";
      readonly diameterFeet: MovementFeet;
    }
  | {
      readonly kind: "pointOriginCylinder";
      readonly radiusFeet: MovementFeet;
      readonly heightFeet: MovementFeet;
    }
  | {
      readonly kind: "pointOriginCubeExcludingCaster";
      readonly sideFeet: MovementFeet;
    }
  | {
      readonly kind: "pointOriginCube";
      readonly sideFeet: MovementFeet;
    }
  | {
      readonly kind: "selfOriginCube";
      readonly sideFeet: MovementFeet;
    }
  | {
      readonly kind: "selfOriginCone";
      readonly lengthFeet: MovementFeet;
    }
  | {
      readonly kind: "selfOriginLine";
      readonly lengthFeet: MovementFeet;
      readonly widthFeet: MovementFeet;
    }
  | {
      readonly kind: "selfOriginEmanation";
      readonly radiusFeet: MovementFeet;
    }
  | {
      readonly kind: "primaryTargetOriginEmanation";
      readonly radiusFeet: MovementFeet;
    };
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
export type BattleAntimagicFieldAffectedOngoingSpellEffect = {
  readonly kind: "antimagicFieldAffectedOngoingSpellEffect";
  readonly effect: BattleOngoingSpellEffectRef;
  readonly sourceKind: BattleAntimagicFieldOngoingSpellEffectSourceKind;
};
export type BattleAntimagicFieldAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "antimagicFieldSelfEmanation" }
>;
export type BattleWebCubeAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "webCubeArea" }
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
export type BattleGustOfWindLineAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  { readonly kind: "gustOfWindLineArea" }
>;
export type BattleSpellAreaIdentityChoice =
  | {
      readonly kind: "fogCloudArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "magicalDarknessArea";
      readonly areaId: BattleAreaId;
      readonly spellCreatedLightOverlaps: readonly BattleSpellCreatedLightAreaOverlap[];
    }
  | {
      readonly kind: "antimagicFieldSelfEmanation";
      readonly areaId: BattleAreaId;
      readonly affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[];
    }
  | {
      readonly kind: "webCubeArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "flamingSphereArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "spikeGrowthArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "moonbeamCylinderArea";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "gustOfWindLineArea";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
    };
export type SpellPostDamageRider =
  | {
      readonly kind: "speedDelta";
      readonly deltaFeet: MovementDeltaFeet;
    }
  | {
      readonly kind: "condition";
      readonly condition: Condition;
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "opportunityAttackDenied";
      readonly expiresAt: "startOfTargetNextTurn";
    }
  | {
      readonly kind: "nextAttackRollAgainstTarget";
      readonly mode: "advantage";
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "hitPointRegainPrevented";
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "invisibleBenefitDenied";
      readonly expiresAt: "endOfCasterNextTurn";
    }
  | {
      readonly kind: "lightEmission";
      readonly emission: Extract<BattleLightEmission, { readonly kind: "dim" }>;
      readonly expiresAt: "endOfCasterNextTurn";
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
export type SpellFailedSavePostDamageRider =
  | {
      readonly kind: "nextAttackRollByTarget";
      readonly mode: "disadvantage";
      readonly expiresAt: "endOfTargetNextTurn";
    }
  | {
      readonly kind: "forcedReactionMovement";
      readonly direction: "awayFromCaster";
      readonly route: "safest";
      readonly distance: "asFarAsPossible";
      readonly cost: "targetReactionIfAvailable";
    };
export type SpellPostSaveAreaEffect =
  | {
      readonly kind: "fireballObjectIgnition";
    }
  | {
      readonly kind: "shatterObjectDamage";
    }
  | {
      readonly kind: "thunderwave";
      readonly creaturePush: {
        readonly distanceFeet: MovementFeet;
        readonly originDirection: "away_from_caster";
      };
      readonly unsecuredObjectPush: {
        readonly distanceFeet: MovementFeet;
        readonly originDirection: "away_from_caster";
        readonly objectLocation: "entirely_within_area";
      };
      readonly audibleBoom: BattleThunderwaveAudibleBoom;
    };
export type SpellFailedSaveConditionExpiration =
  | "endOfCasterNextTurn"
  | "concentration"
  | {
      readonly kind: "concentration";
      readonly durationTicks: ElapsedTimeTicks;
    }
  | {
      readonly kind: "duration";
      readonly durationTicks: ElapsedTimeTicks;
    };
export type SpellConditionRepeatSave = {
  readonly ability: Ability;
  readonly dc: DcSource;
};
type SpellFailedSaveConditionEffectBase = {
  readonly expiresAt: SpellFailedSaveConditionExpiration;
};
type SpellFailedSaveConditionNoRepeatLifecycle = {
  readonly escape: SpellConditionEscape | null;
  readonly turnStartDamage: SpellTurnStartDamage | null;
  readonly repeatSave: null;
};
type SpellFailedSaveConditionEndTurnSaveLifecycle = {
  readonly escape: null;
  readonly turnStartDamage: null;
  readonly repeatSave: SpellConditionRepeatSave;
};
export type SpellFailedSaveFixedConditionEffect =
  SpellFailedSaveConditionEffectBase &
    (
      | SpellFailedSaveConditionNoRepeatLifecycle
      | SpellFailedSaveConditionEndTurnSaveLifecycle
    ) & {
      readonly kind: "fixed";
      readonly condition: Condition;
    };
export type SpellFailedSaveConditionChoiceEffect =
  SpellFailedSaveConditionEffectBase &
    (
      | SpellFailedSaveConditionNoRepeatLifecycle
      | SpellFailedSaveConditionEndTurnSaveLifecycle
    ) & {
      readonly kind: "choice";
      readonly choices: readonly [Condition, ...Condition[]];
    };
export type SpellFailedSaveConditionEffect =
  | SpellFailedSaveFixedConditionEffect
  | SpellFailedSaveConditionChoiceEffect;
export type SpellSelectedFailedSaveConditionEffect =
  SpellFailedSaveConditionEffectBase &
    (
      | SpellFailedSaveConditionNoRepeatLifecycle
      | SpellFailedSaveConditionEndTurnSaveLifecycle
    ) & {
      readonly condition: Condition;
    };
export type SpellSavingThrowRollModeRule =
  | {
      readonly kind: "hostileTarget";
      readonly mode: "advantage";
    }
  | {
      readonly kind: "creatureType";
      readonly creatureType: CreatureType;
      readonly mode: "disadvantage";
    };
export type SpellFailedSaveAttackRollEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "faerieFireOutline" }
>;
export type WardingBondSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "wardingBond";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "wardingBond" }
  >;
  readonly rangeFeet: MovementFeet;
  readonly connectionRangeFeet: MovementFeet;
};
export type SpellTargetListTargeting = {
  readonly kind: "targetList";
  readonly minTargets: 1;
  readonly maxTargets: number;
};
export type ScalarBuffSpellTargeting =
  | {
      readonly kind: "self";
    }
  | (SpellTargetListTargeting & {
      readonly requiredTargetDisposition: "unrestricted" | "willing";
    });
export type TargetListSpellInvocation =
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "directHitPointRestoration" }
    >
  | (Extract<SupportedSpellInvocation, { readonly procedure: "scalarBuff" }> & {
      readonly targeting: Extract<
        ScalarBuffSpellTargeting,
        { readonly kind: "targetList" }
      >;
    })
  | Extract<SupportedSpellInvocation, { readonly procedure: "rollModifier" }>
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "abilityD20TestRollModeSaveGate" }
    >
  | Extract<SupportedSpellInvocation, { readonly procedure: "damageReduction" }>
  | (Extract<
      SupportedSpellInvocation,
      { readonly procedure: "saveGatedCondition" }
    > & {
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
    })
  | Extract<SupportedSpellInvocation, { readonly procedure: "hideousLaughter" }>
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "creatureTypeProtection" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "creatureSizeIncrease" | "creatureSizeDecrease" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "levitatedCreature" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "conditionRemovalProtection" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "directConditionRemoval" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "jumpMovementReplacement" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "dragonsBreathInitial" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "featherFallMitigation" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "sanctuaryTargetingInterdiction" }
    >
  | Extract<SupportedSpellInvocation, { readonly procedure: "directCondition" }>
  | Extract<SupportedSpellInvocation, { readonly procedure: "command" }>
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
    >;
export type ScalarBuffSpellEffect =
  | {
      readonly kind: "temporaryHitPoints";
      readonly amount: { readonly expr: DiceExpr };
    }
  | {
      readonly kind: "activeEffect";
      readonly activeEffect: Extract<
        BattleActiveEffect,
        {
          readonly kind:
            | "speedDelta"
            | "specialSpeedGrant"
            | "spellArmorClassBonus"
            | "spellArmorClassFloor";
        }
      >;
    }
  | {
      readonly kind: "hitPointMaximumIncrease";
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "hitPointMaximumIncrease" }
      >;
    };
export type RollModifierSpellTargeting =
  | {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number | "allLegalTargets";
    }
  | {
      readonly kind: "selfAndChosenLegalTargets";
      readonly minTargets: 1;
    };
export type D20RollModifierSpellEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "d20RollModifier" }
>;
export type AbilityCheckRollModeSpellEffect = Omit<
  Extract<BattleActiveEffect, { readonly kind: "abilityCheckRollMode" }>,
  "ability"
>;
export type RollModifierSpellEffect =
  | D20RollModifierSpellEffect
  | Extract<BattleActiveEffect, { readonly kind: "abilityCheckRollMode" }>;
export type SelectedRollModifierSpellEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "d20RollModifier" | "abilityCheckRollMode" }
>;
export type ThaumaturgyBoomingVoiceSpellInvocation = {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "thaumaturgyBoomingVoice";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "thaumaturgyBoomingVoice" }
  >;
  readonly rangeFeet: MovementFeet;
};
type RollModifierSpellSaveGate = {
  readonly ability: Ability;
  readonly dc: DcSource;
};
type RollModifierSpellInvocationBase = {
  readonly access: PreparedSpellAccess | ClassCantripSpellAccess;
  readonly resource: SpellSlotInvocationResource | NoSpellInvocationResource;
  readonly procedure: "rollModifier";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: RollModifierSpellTargeting;
  readonly rangeFeet: MovementFeet;
  readonly saveGate: RollModifierSpellSaveGate | null;
};
export type RollModifierSpellInvocation = RollModifierSpellInvocationBase &
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
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "creatureTypeProtection" }
  >;
  readonly rangeFeet: MovementFeet;
};
export type CreatureSizeChangeSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "creatureSizeIncrease" | "creatureSizeDecrease";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly ability: Extract<Ability, "con">;
  readonly dc: DcSource;
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellCreatureSizeChange" }
  >;
  readonly rangeFeet: MovementFeet;
};
export type LevitatedCreatureSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "levitatedCreature";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly ability: Extract<Ability, "con">;
  readonly dc: DcSource;
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: Omit<
    SpellLevitatedCreatureActiveEffect,
    "altitudeFeet"
  >;
  readonly maxInitialRiseFeet: MovementFeet;
  readonly rangeFeet: MovementFeet;
};
export type BlurAttackRollDefenseSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "blurAttackRollDefense";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "blurred" }
  >;
};
export type SeeInvisibleObserverSightSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "seeInvisibleObserverSight";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "seeInvisibleAndEthereal" }
  >;
};
export type MirrorImageHitInterceptionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "mirrorImageHitInterception";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "mirrorImageDuplicates" }
  >;
};
export type ConditionRemovalProtectionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "conditionRemovalProtection";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly protection: {
    readonly conditionSaveRollMode: Extract<
      BattleActiveEffect,
      { readonly kind: "conditionSavingThrowRollMode" }
    >;
    readonly damageResistance: Extract<
      BattleActiveEffect,
      { readonly kind: "damageResistance" }
    >;
  };
  readonly rangeFeet: MovementFeet;
};
export type DirectConditionRemovalSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "directConditionRemoval";
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly targeting: SpellTargetListTargeting;
  readonly conditionChoices: typeof DIRECT_CONDITION_REMOVAL_CONDITIONS;
  readonly rangeFeet: MovementFeet;
};
export type DamageReductionSpellInvocation = {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "damageReduction";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly damageTypeChoices: readonly DamageType[];
  readonly amount: {
    readonly dice: 1;
    readonly dieSize: 4;
  };
  readonly expiresAt: BattleActiveEffectExpiration;
  readonly rangeFeet: MovementFeet;
};
export type ConditionImmunityActiveEffectTemplate = Omit<
  Extract<BattleActiveEffect, { readonly kind: "conditionImmunity" }>,
  "conditionHadNonSpellSource"
>;
export type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffects: readonly [
    ConditionImmunityActiveEffectTemplate,
    Extract<
      BattleActiveEffect,
      { readonly kind: "turnStartTemporaryHitPoints" }
    >,
  ];
  readonly rangeFeet: MovementFeet;
};
export type SelfTransformationModeSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "selfTransformationMode";
  readonly spell: SpellRecord;
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
  readonly spell: SpellRecord;
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
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: number;
  };
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "jumpMovementReplacement" }
  >;
  readonly rangeFeet: MovementFeet;
};
export type DragonsBreathInitialSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "dragonsBreathInitial";
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: 1;
  };
  readonly activeEffect: Omit<
    Extract<BattleActiveEffect, { readonly kind: "dragonsBreath" }>,
    "damageType" | "spellSaveDc"
  >;
  readonly damageTypeChoices: readonly DamageType[];
  readonly rangeFeet: MovementFeet;
};
export type SelfTeleportSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "selfTeleport";
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly maxDistanceFeet: MovementFeet;
};
export type SanctuaryTargetingInterdictionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "sanctuaryTargetingInterdiction";
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly targeting: {
    readonly kind: "targetList";
    readonly minTargets: 1;
    readonly maxTargets: 1;
  };
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "sanctuaryWard" }
  >;
  readonly rangeFeet: MovementFeet;
};
export type DirectConditionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "directCondition";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: SpellTargetListTargeting;
  readonly activeEffect: Omit<
    Extract<
      BattleActiveEffect,
      { readonly kind: "targetActionEndedSpellCondition" }
    >,
    "conditionHadNonSpellSource"
  >;
  readonly rangeFeet: MovementFeet;
};
export type WeaponDamageRiderSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "weaponDamageRider";
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellWeaponDamageRider" }
  >;
};
export type MagicWeaponEnhancementSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "magicWeaponEnhancement";
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly bonus: MagicWeaponEnhancementBonus;
  readonly durationTicks: ElapsedTimeTicks;
};
export type AfterHitDamageSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource:
    | SpellSlotInvocationResource
    | ClassFeatureFreeCastInvocationResource;
  readonly procedure: "afterHitDamage";
  readonly spell: SpellRecord;
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
  readonly spell: SpellRecord;
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
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly immediateDamage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >;
};
export type AfterHitDamageAndIlluminationSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "afterHitDamageAndIllumination";
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "shiningSmiteIllumination" }
  >;
};
export type MarkedDamageRiderSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource:
        | SpellSlotInvocationResource
        | ClassFeatureFreeCastInvocationResource;
      readonly procedure: "markedDamageRider";
      readonly action: "cast";
      readonly spell: SpellRecord;
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
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "markedDamageRider";
      readonly action: "transfer";
      readonly spell: SpellRecord;
      readonly actionCost: "bonusAction";
      readonly targeting: { readonly kind: "singleCombatant" };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
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
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly light: {
    readonly brightRadiusFeet: MovementFeet;
    readonly dimAdditionalFeet: MovementFeet;
  };
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
  readonly spell: SpellRecord;
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
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly rangeFeet: MovementFeet;
};
export type HeldLightHurlSpellInvocation = DamageSpellSource & {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "heldLightHurl";
  readonly spell: SpellRecord;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "singleCreatureOrObject" }
  >;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly rangeFeet: MovementFeet;
  readonly attackKind: Extract<SpellAttackKind, "ranged_spell_attack">;
  readonly attackBonus: AttackBonus;
};
export type DancingLightsSpellInvocation =
  | {
      readonly access: ClassCantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "dancingLightsSeparateCast";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly actionCost: "bonusAction";
      readonly maxMoveFeet: MovementFeet;
      readonly rangeFeet: MovementFeet;
      readonly spacingFeet: MovementFeet;
    };
export type SpellCreatedHeldObjectSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "spellCreatedHeldObject";
      readonly spell: SpellRecord;
      readonly actionCost: "bonusAction";
      readonly activeEffect: SpellCreatedHeldObjectActiveEffect & {
        readonly objectState: { readonly kind: "held" };
      };
    }
  | {
      readonly access: SpellEffectSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "spellCreatedHeldObjectAttack";
      readonly spell: SpellRecord;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "singleCombatant" }
      >;
      readonly damage: SpellCreatedHeldObjectActiveEffect["attack"]["damage"];
      readonly rangeFeet: MovementFeet;
      readonly attackKind: SpellCreatedHeldObjectActiveEffect["attack"]["attackKind"];
      readonly attackBonus: SpellCreatedHeldObjectActiveEffect["attack"]["attackBonus"];
      readonly activeEffect: SpellCreatedHeldObjectActiveEffect & {
        readonly objectState: { readonly kind: "held" };
      };
    }
  | {
      readonly access: SpellEffectSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "spellCreatedHeldObjectReEvoke";
      readonly spell: SpellRecord;
      readonly actionCost: "bonusAction";
      readonly activeEffect: SpellCreatedHeldObjectActiveEffect & {
        readonly objectState: { readonly kind: "notHeld" };
      };
    };
export type ObjectContactDamageSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "objectContactDamage";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly actionCost: "bonusAction";
      readonly activeEffect: SpellObjectContactDamageActiveEffect;
      readonly damage: SpellObjectContactDamageActiveEffect["damage"];
      readonly rangeFeet: MovementFeet;
    };
export type SpiritualWeaponRepeatAttackSpellInvocation = {
  readonly access: SpellEffectSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "spiritualWeaponRepeatAttack";
  readonly spell: SpellRecord;
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
export type SpellAttackDamageTargeting = Extract<
  SpellTargeting,
  { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
>;
export type CantripSpellAttackSequenceTargeting = {
  readonly kind: "spellAttackSequenceCreatureOrObject";
  readonly countSource: "characterLevel";
  readonly attackCount: EldritchBlastBeamCount;
};
export type PreparedSpellAttackSequenceTargeting = {
  readonly kind: "spellAttackSequenceCreatureOrObject";
  readonly countSource: "spellSlotLevel";
  readonly attackCount: ScorchingRayRayCount;
};
export type SpellAttackSequenceTargeting =
  | CantripSpellAttackSequenceTargeting
  | PreparedSpellAttackSequenceTargeting;
export type SpellHostedWeaponAttackInvocation = {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "spellHostedWeaponAttack";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly componentWeapon: {
    readonly itemId: string;
    readonly attack: CharacterWeaponAttackActionOption;
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
  readonly spell: SpellRecord;
  readonly actionCost: "bonusAction";
  readonly attachedWeapon: {
    readonly itemId: string;
    readonly attack: CharacterWeaponAttackActionOption;
  };
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellWeaponAttackOverride" }
  >;
};
export type PersistentArmorSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "persistentArmorEffect";
      readonly spell: SpellRecord;
      readonly rangeFeet: MovementFeet;
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "spellBaseArmorClass" }
      >;
    }
  | {
      readonly access: ArmorOfShadowsSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "persistentArmorEffect";
      readonly spell: SpellRecord;
      readonly rangeFeet: MovementFeet;
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "spellBaseArmorClass" }
      >;
    };
export type SpellAttackDamagePayload =
  | {
      readonly kind: "fixedSpellAttackDamage";
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    }
  | {
      readonly kind: "sorcerousBurstDamageTypeChoice";
      readonly expr: DiceExpr;
      readonly damageTypeChoices: readonly [DamageType, ...DamageType[]];
      readonly maxDieAdditionalDiceLimit: number;
    }
  | {
      readonly kind: "selectedSorcerousBurstDamage";
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
      readonly maxDieAdditionalDiceLimit: number;
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
export type SupportedSpellInvocation =
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
  | DamageReductionSpellInvocation
  | WardingBondSpellInvocation
  | ThaumaturgyBoomingVoiceSpellInvocation
  | SeeInvisibleObserverSightSpellInvocation
  | DragonsBreathInitialSpellInvocation
  | {
      readonly access: ClassCantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "makeStable";
      readonly spell: SpellRecord;
      readonly actionCost: "magicAction";
      readonly rangeFeet: MovementFeet;
    }
  | JumpMovementReplacementSpellInvocation
  | SelfTeleportSpellInvocation
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "repeatedDamageAllocation";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly targeting: SpellAttackDamageTargeting;
      readonly damage: SpellAttackDamagePayload;
      readonly rangeFeet: MovementFeet;
      readonly attackKind: SpellAttackKind;
      readonly attackBonus: AttackBonus;
      readonly postDamageRiders: readonly SpellPostDamageRider[];
      readonly objectHitEffect: SpellObjectHitEffect;
    })
  | (ClassCantripDamageSpellSource & {
      readonly procedure: "spellAttackSequence";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly targeting: SpellTargeting;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly successDamage: "none" | "half";
      readonly rangeFeet: MovementFeet;
      readonly failedSavePostDamageRiders: readonly SpellFailedSavePostDamageRider[];
      readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
      readonly postSaveAreaEffect?: SpellPostSaveAreaEffect;
    })
  | (PreparedDamageSpellSource & {
      readonly procedure: "attackBurstSaveDamage";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "con">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
      readonly rangeFeet: MovementFeet;
      readonly successEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "nextAttackRollBySelf" }
      >;
      readonly failedSaveEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "abilityD20TestRollModeEndTurnSave" }
      >;
      readonly failedSaveDamagePenaltyEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "sourceDamageRollPenalty" }
      >;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "sleepTargetAdmission";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "greaseGroundHazard";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly procedure: "gustOfWindLine";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly actionCost: "magicAction";
      readonly ability: Extract<Ability, "wis">;
      readonly dc: DcSource;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "scalarBuff";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly actionCost: "bonusAction";
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "spellDashBonusAction" }
      >;
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "featherFallMitigation";
      readonly spell: SpellRecord;
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "targetList" }
      >;
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "featherFallMitigation" }
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
      readonly spell: SpellRecord;
      readonly armorClassBonus: number;
      readonly negatedSpellIds: readonly SpellRecord["id"][];
    }
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "counterspell";
      readonly spell: SpellRecord;
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
      readonly spell: SpellRecord;
      readonly actionCost: HealingSpellActionCost;
      readonly targeting: HealingSpellTargeting;
      readonly healing: {
        readonly expr: DiceExpr;
      };
      readonly rangeFeet: MovementFeet;
    };

export type HealingSpellTargeting =
  | {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    }
  | {
      readonly kind: "pointOriginSphereTargetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
      readonly area: {
        readonly kind: "pointOriginSphere";
        readonly radiusFeet: MovementFeet;
      };
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
      | "command"
      | "greaseGroundHazard"
      | "webRestraintHazard"
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
  readonly unitId: UnitRecord["id"];
  readonly selection: WeaponDamageDiceRollChoiceSelection;
  readonly candidates: readonly [RolledDiceGroup, RolledDiceGroup];
};
export type WeaponDamageDiceRollChoiceUsage = {
  readonly attackerId: CombatantId;
  readonly unitId: UnitRecord["id"];
};
type AttackRollMissToHitReplacementUsage = {
  readonly unitId: UnitRecord["id"];
};
export type PendingAttackRollMissToHitReplacementContext = {
  readonly subject: BattleSubject;
  readonly targetId: CombatantId;
  readonly attackRoll: BattleAttackRollResult;
};
type PendingAttackRollMissToHitReplacementSelection = {
  readonly attackerId: CombatantId;
  readonly unitId: UnitRecord["id"];
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
  readonly spellSlotUsesThisTurn: readonly BattleTurnSpellSlotUse[];
  readonly levelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly quickenedLevelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
  readonly weaponMasteryCleaveAttackersUsedThisTurn: readonly CombatantId[];
  readonly pendingAttackRollMissToHitReplacementSelection?: PendingAttackRollMissToHitReplacementSelection;
  readonly lightWeaponAttackMade?: {
    readonly weaponItemId: string;
  };
  readonly dashMovementBonusFeet: MovementFeet;
  readonly disengaged: boolean;
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
  readonly unitId: UnitRecord["id"];
  readonly label: UnitRecord["name"];
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
  readonly sourceSpellId: SpellRecord["id"];
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
};
export type MarkedDamageRiderFindingAdvantage = {
  readonly kind: "findingAdvantage";
  readonly ability: Extract<Ability, "wis">;
  readonly skills: typeof HUNTERS_MARK_FINDING_SKILLS;
};
export type MarkedDamageRiderCastAbilityCheckBehavior =
  | { readonly kind: "none" }
  | {
      readonly kind: "chosenAbilityDisadvantage";
      readonly choices: readonly Ability[];
    }
  | MarkedDamageRiderFindingAdvantage;
export type MarkedDamageRiderAbilityCheckBehavior =
  | { readonly kind: "none" }
  | { readonly kind: "abilityDisadvantage"; readonly ability: Ability }
  | MarkedDamageRiderFindingAdvantage;
export type SpellMarkedDamageRider = Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>;
export type AttackDamageRiderUsage = {
  readonly attackerId: CombatantId;
  readonly unitId: UnitRecord["id"];
};
export type OngoingFeatureSource = {
  readonly kind: "unit";
  readonly unitId: UnitRecord["id"];
};
// Encounter relationship id, not creature provenance or a creature trait.
// RAW defines allies/enemies by adventuring party, friendship, combat side,
// hostile action, or GM/rule designation. This runtime currently projects that
// relationship as side equality: same side = ally, different side = enemy.
// Used by Help's ally/enemy picks, Rage extension against enemies, and Sneak
// Attack's adjacent-ally branch. Widen this model before supporting rules that
// need per-pair hostility, neutrality, or temporary designation.
export type OngoingFeatureSourceKey = string &
  Brand.Brand<"OngoingFeatureSourceKey">;
export const OngoingFeatureSourceKey = Brand.nominal<OngoingFeatureSourceKey>();
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
    readonly source: OngoingFeatureSource;
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
type OngoingFeatureSourceEncoded = {
  readonly kind: "unit";
  readonly unitId: string;
};
export type ActiveOngoingFeatureOccurrenceSnapshotEncoded =
  | {
      readonly kind: "turnBoundary";
      readonly expiresAt: OngoingFeatureExpirationEncoded;
      readonly source: OngoingFeatureSourceEncoded;
    }
  | {
      readonly kind: "roundExtended";
      readonly expiresAt: EndOfTurnOngoingFeatureExpirationEncoded;
      readonly maxExpiresAt: EndOfTurnOngoingFeatureExpirationEncoded;
      readonly source: OngoingFeatureSourceEncoded;
    }
  | {
      readonly kind: "fixedDuration";
      readonly expiresAt: EndOfTurnOngoingFeatureExpirationEncoded;
      readonly source: OngoingFeatureSourceEncoded;
    };

export type KnockedOutOneHp = Hp & Brand.Brand<"KnockedOutOneHp">;
export const KnockedOutOneHp = Brand.nominal<KnockedOutOneHp>();
export type KnockedOutConditionState = ConditionState &
  Brand.Brand<"KnockedOutConditionState">;
export const KnockedOutConditionState =
  Brand.nominal<KnockedOutConditionState>();
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
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  readonly side: BattleCombatantSide;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly activeEffects: readonly BattleActiveEffect[];
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
        readonly characterId: CharacterId;
        readonly characterUnitRefs: readonly BattleUnitRef[];
        readonly classLevels: readonly CharacterBattleClassLevel[];
        readonly druidWildShapeKnownForms?: ReadonlyNonEmptyArray<BattleDruidWildShapeKnownForm>;
        readonly weaponProficiencies: readonly WeaponProficiency[];
        readonly selectedLoadout: CharacterBattleLoadoutRef;
        readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
        readonly invocationFeatures: readonly CharacterBattleInvocationFeature[];
        readonly speed: BattleWalkSpeed;
        readonly attack: CharacterWeaponAttackActionOption | null;
        readonly unarmedStrike: CharacterUnarmedStrikeActionOption;
        readonly offHandAttack?: CharacterWeaponAttackActionOption;
        readonly resources: readonly CharacterBattleResourceState[];
        readonly metamagic?: CharacterBattleMetamagicState;
        readonly ongoingFeatureProfiles: ReadonlyMap<
          OngoingFeatureSourceKey,
          Extract<
            SupportedUnitFeatureProfile,
            { readonly kind: "ongoingFeature" }
          >
        >;
        readonly attackDamageRiderProfiles: ReadonlyMap<
          UnitRecord["id"],
          Extract<
            SupportedUnitFeatureProfile,
            { readonly kind: "attackDamageRider" }
          >
        >;
        readonly saveDamageReplacementProfiles: ReadonlyMap<
          UnitRecord["id"],
          Extract<
            SupportedUnitFeatureProfile,
            { readonly kind: "saveDamageReplacement" }
          >
        >;
        readonly passiveSavingThrowRollModeProfiles: ReadonlyMap<
          UnitRecord["id"],
          Extract<
            SupportedUnitFeatureProfile,
            { readonly kind: "passiveSavingThrowRollMode" }
          >
        >;
        readonly reactionRollOrDamageReductionProfiles: ReadonlyMap<
          UnitRecord["id"],
          Extract<
            SupportedUnitFeatureProfile,
            { readonly kind: "reactionRollOrDamageReduction" }
          >
        >;
        readonly failedAbilityCheckResourceBoostProfiles: ReadonlyMap<
          UnitRecord["id"],
          Extract<
            SupportedUnitFeatureProfile,
            { readonly kind: "failedAbilityCheckResourceBoost" }
          >
        >;
        readonly spellcasting?: CharacterBattleSpellcastingState;
      }
    | {
        readonly kind: "statBlock";
        readonly statBlock: StatBlockRecord;
        readonly resources: StatBlockMutableResourceState;
      };
};

export type BattleCreatureState = BattleCreatureStateCommon &
  BattleCreatureKnockOutLifecycle;

export type LegendaryActionWindow = {
  readonly afterTurnActorId: CombatantId;
  readonly consumed: boolean;
};

export type BattleState = {
  readonly battleId: BattleId;
  readonly initiative: InitiativeStack<CombatantId>;
  readonly combatants: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly findFamiliars: ReadonlyMap<CombatantId, FindFamiliarState>;
  readonly objectOutlines: readonly BattleObjectOutline[];
  readonly lightEmitters: readonly BattleLightEmitter[];
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
  readonly unitId: UnitRecord["id"];
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
  readonly unitId: UnitRecord["id"];
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

export type AvailableBattleAct = {
  readonly subject: BattleSubject;
  readonly label: string;
  readonly summary: string;
  readonly initialHoles: readonly BattleHole[];
};

export type BattleHoleId = HoleId;
export type BattleHoleInstanceKey = HoleInstanceKey;
export type BattleTargetChoiceHole = Extract<
  RuntimeHole,
  { readonly kind: "targetChoice" }
> & {
  readonly choices: readonly CombatantId[];
  readonly requiresTableSpatialFact?: boolean;
};
export type BattleObjectTargetChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "objectTargetChoice";
  readonly label: string;
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
    readonly sourceSpellId: SpellId;
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
  readonly objectContactSave: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceSpellId: SpellId;
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
    readonly sourceSpellId: SpellId;
    readonly objectId: BattleObjectId;
    readonly targetIds: readonly CombatantId[];
  };
};
export type BattleSpellCastReactionFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetSpatialFacts";
  readonly label: string;
  readonly spellBeingCast: {
    readonly casterId: CombatantId;
    readonly spellId: SpellId;
    readonly castLevel: number;
    readonly components: readonly SpellComponent[];
  };
  readonly requiresTableSpatialFact: true;
};
export type BattleWardingBondSeparationFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetSpatialFacts";
  readonly label: string;
  readonly wardingBondSeparation: {
    readonly sourceCombatantId: CombatantId;
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellId;
    readonly rangeFeet: MovementFeet;
  };
  readonly requiresTableSpatialFact: true;
};
export type BattleSpellAreaChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellAreaChoice";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "fogCloudObscurement"
        | "magicalDarknessPointOrigin"
        | "antimagicFieldOngoingSpellSuppression"
        | "flamingSphere"
        | "spikeGrowthMovementHazard"
        | "moonbeam"
        | "webRestraintHazard";
    }
  >;
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
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "teleportDestination";
  readonly label: string;
  readonly spell: SelfTeleportSpellInvocation;
  readonly actorId: CombatantId;
  readonly maxDistanceFeet: MovementFeet;
  readonly requiresTableSpatialFact: true;
};
export type BattleSpiritualWeaponForcePositionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spiritualWeaponForcePosition";
  readonly label: string;
  readonly spell:
    | Extract<
        SupportedSpellInvocation,
        { readonly procedure: "spiritualWeaponAttackProxy" }
      >
    | Extract<
        SupportedSpellInvocation,
        { readonly procedure: "spiritualWeaponRepeatAttack" }
      >;
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
export type BattleMagicWeaponTargetItemFact = {
  readonly kind: "nonmagicalWeaponItem";
  readonly holderCombatantId: CombatantId;
  readonly itemId: string;
};
export type BattleMagicWeaponTargetItemHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "magicWeaponTargetItem";
  readonly label: string;
  readonly spell: MagicWeaponEnhancementSpellInvocation;
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
  readonly sourceSpellId: SpellId;
};
export type BattleFireballObjectIgnitionFact = {
  readonly objectId: BattleObjectId;
  readonly disposition: BattleObjectIgnitionDisposition;
};
export type BattleShatterNonmagicalUnattendedObjectDamageFact = {
  readonly objectId: BattleObjectId;
  readonly disposition: BattleObjectDamageDisposition;
};
export type BattleDroppedObjectOutcome = {
  readonly kind: "heldObjectDropped";
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: SpellId;
};
export type BattleSpellDamageTypeChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "damageTypeChoice";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "chainedSpellAttackDamage"
        | "damageReduction"
        | "dragonsBreathInitial"
        | "selfTransformationMode"
        | "spellAttackDamage"
        | "spellHostedWeaponAttack";
    }
  >;
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
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellTargetAllocation";
  readonly label: string;
  readonly spell: SupportedSpellInvocation;
  readonly allocationCount: number;
  readonly choices: readonly CombatantId[];
  readonly requiresTableSpatialFact: true;
};
export type BattleSpellTargetListHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellTargetList";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "directHitPointRestoration"
        | "rollModifier"
        | "saveGatedDamage"
        | "abilityD20TestRollModeSaveGate"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "hideousLaughter"
        | "creatureTypeProtection"
        | "creatureSizeIncrease"
        | "creatureSizeDecrease"
        | "levitatedCreature"
        | "conditionRemovalProtection"
        | "damageReduction"
        | "scalarBuff"
        | "conditionImmunityAndTurnStartTemporaryHitPoints"
        | "jumpMovementReplacement"
        | "dragonsBreathInitial"
        | "featherFallMitigation"
        | "sanctuaryTargetingInterdiction"
        | "directCondition"
        | "directConditionRemoval"
        | "command"
        | "greaseGroundHazard"
        | "gustOfWindLine";
    }
  >;
  readonly minTargets: 1;
  readonly maxTargets: number;
  readonly choices: readonly CombatantId[];
  readonly requiresTableSpatialFact: true;
};
export type BattleAttackRollHole = Extract<
  RuntimeHole,
  { readonly kind: "attackRoll" }
> & {
  readonly attack: SupportedAttackActionOption;
  readonly attackBonus: AttackBonus;
  readonly rollMode?: AttackRollMode;
  readonly ongoingFeatureActivations?: readonly AttackRollFeatureActivation[];
  readonly missToHitReplacements?: readonly AttackRollMissToHitReplacement[];
};
export type AttackRollFeatureActivation = {
  readonly unitId: UnitRecord["id"];
  readonly label: UnitRecord["name"];
  readonly rollMode: AttackRollMode;
};
export type AttackRollMissToHitReplacement = {
  readonly unitId: UnitRecord["id"];
  readonly label: UnitRecord["name"];
};
export type BattleSpellAttackRollHole = Extract<
  RuntimeHole,
  { readonly kind: "attackRoll" }
> & {
  readonly spell: SupportedSpellInvocation;
  readonly attackBonus: AttackBonus;
  readonly rollMode?: AttackRollMode;
  readonly missToHitReplacements?: readonly AttackRollMissToHitReplacement[];
};
export type BattleDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly attack: SupportedAttackActionOption;
  readonly critical: boolean;
  readonly attackDamageRiders?: readonly AttackDamageRider[];
  readonly spellWeaponDamageRiders?: readonly SpellAttackDamageComponent[];
  readonly spellMarkedDamageRiders?: readonly SpellMarkedDamageRider[];
  readonly weaponDamageDiceRollChoiceUnitIds?: readonly UnitRecord["id"][];
};
export type BattleSpellDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spell: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "chainedSpellAttackDamage"
        | "heldLightHurl"
        | "objectContactDamage"
        | "objectContactDamageRepeat"
        | "repeatedDamageAllocation"
        | "saveGatedDamage"
        | "spellCreatedHeldObjectAttack"
        | "spiritualWeaponAttackProxy"
        | "spiritualWeaponRepeatAttack"
        | "spellAttackSequence"
        | "spellAttackDamage";
    }
  >;
  readonly critical: boolean;
  readonly spellMarkedDamageRiders?: readonly SpellMarkedDamageRider[];
};
export type BattleDragonsBreathDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly dragonsBreath: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
    readonly damageType: DamageType;
    readonly expr: DiceExpr;
  };
};
export type BattleSpellDamageReductionRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spellDamageReduction: SpellDamageReductionRoll;
};
export type BattleSourceDamageRollPenaltyRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly sourceDamageRollPenalty: SourceDamageRollPenaltyRoll;
};
export type BattleMirrorImageDuplicateRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly mirrorImageDuplicateRoll: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
    readonly sourceCombatantId: CombatantId;
    readonly remainingDuplicates: MirrorImageDuplicateCount;
    readonly dieSize: 6;
    readonly successAtLeast: 3;
  };
};
export type BattleSpellTurnStartDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spellTurnStartDamage: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
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
export type BattleSpellTurnStartSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly spellTurnStartSave: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
export type BattleGreaseGroundHazardTrigger = "entersArea" | "endsTurnInArea";
export type BattleGreaseGroundHazardSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly greaseGroundHazard: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
export type BattleGustOfWindLineTrigger = "endsTurnInLine";
export type BattleGustOfWindLineSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly gustOfWindLine: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
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
  readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
export type BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly abilityD20TestRollModeEndTurnSave: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly movableZone: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
    readonly sourceCombatantId: CombatantId;
    readonly areaId: BattleAreaId;
    readonly trigger: BattleMoonbeamSaveTrigger;
    readonly damage: SpellTurnStartDamage;
  };
  readonly critical: false;
};
export type BattleSpikeGrowthMovementDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spikeGrowthMovement: {
    readonly targetId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
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
    readonly sourceSpellId: SpellRecord["id"];
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
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spell: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" | "scalarBuff" }
  >;
};
export type BattleSpellSkillChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "skillChoice";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >;
  readonly choices: readonly Skill[];
};
export type BattleSpellAbilityChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "abilityChoice";
  readonly label: string;
  readonly spell:
    | Extract<
        SupportedSpellInvocation,
        { readonly procedure: "markedDamageRider"; readonly action: "cast" }
      >
    | Extract<SupportedSpellInvocation, { readonly procedure: "rollModifier" }>;
  readonly choices: readonly Ability[];
};
export type BattleSpellTargetAbilityChoicesHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "targetAbilityChoices";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >;
  readonly choices: readonly Ability[];
};
export type BattleSpellConditionChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "conditionChoice";
  readonly label: string;
  readonly spell:
    | (Extract<
        SupportedSpellInvocation,
        { readonly procedure: "saveGatedCondition" }
      > & {
        readonly effect: SpellFailedSaveConditionChoiceEffect;
      })
    | Extract<
        SupportedSpellInvocation,
        { readonly procedure: "directConditionRemoval" }
      >;
  readonly choices: readonly [Condition, ...Condition[]];
};
export type BattleThaumaturgyActiveOneMinuteEffectCountHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "thaumaturgyActiveOneMinuteEffectCount";
  readonly label: string;
  readonly spell: ThaumaturgyBoomingVoiceSpellInvocation;
  readonly maximumActiveOneMinuteEffects: typeof THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS;
  readonly requiresTableSpellEffectCount: true;
};
export type BattleCommandOption = (typeof COMMAND_OPTIONS)[number];
export type BattleCommandOptionChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "commandOptionChoice";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >;
  readonly choices: readonly BattleCommandOption[];
};
export type BattleSelfTransformationModeChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "selfTransformationModeChoice";
  readonly label: string;
  readonly spell: SelfTransformationModeSpellInvocation;
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
export type BattleDancingLightList =
  | readonly [BattleDancingLight]
  | readonly [BattleDancingLight, BattleDancingLight]
  | readonly [BattleDancingLight, BattleDancingLight, BattleDancingLight]
  | readonly [
      BattleDancingLight,
      BattleDancingLight,
      BattleDancingLight,
      BattleDancingLight,
    ];
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
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "dancingLightsPlacement";
  readonly label: string;
  readonly spell: DancingLightsSpellInvocation;
  readonly mode: BattleDancingLightsPlacementValue["mode"];
  readonly form: BattleDancingLightsForm;
  readonly activeLightIds: readonly BattleDancingLightId[];
  readonly rangeFeet: MovementFeet;
  readonly maxMoveFeet: MovementFeet;
  readonly spacingFeet: MovementFeet;
  readonly requiresTableSpatialFact: true;
};
export type BattleSavingThrowOutcome = {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
};
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
export type BattleSavingThrowRollModeProjection = {
  readonly targetId: CombatantId;
  readonly rollMode: AttackRollMode;
};
export type BattleSavingThrowFlatBonusProjection = {
  readonly targetId: CombatantId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly bonus: number;
};
export type BattleSpellSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "abilityD20TestRollModeSaveGate"
        | "rollModifier"
        | "creatureSizeIncrease"
        | "creatureSizeDecrease"
        | "levitatedCreature"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "afterHitSaveGatedCondition"
        | "saveGatedAttackRollAdvantage"
        | "counterspell"
        | "sleepTargetAdmission"
        | "hideousLaughter"
        | "command"
        | "greaseGroundHazard"
        | "gustOfWindLine";
    }
  >;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly BattleSpellAreaChoice[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleDragonsBreathSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly dragonsBreath: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
    readonly lengthFeet: 15;
  };
  readonly ability: Extract<Ability, "dex">;
  readonly dc: DcSource;
  readonly areaChoices: readonly BattleSpellAreaChoice[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleUnitFeatureSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly unitFeature: {
    readonly unitId: UnitRecord["id"];
    readonly label: string;
  };
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly targetIds: readonly CombatantId[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
};
export type BattleUnitFeatureRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly unitFeature:
    | Extract<
        SupportedUnitFeatureProfile,
        { readonly kind: "selfBonusActionHealing" }
      >
    | {
        readonly unitId: UnitRecord["id"];
        readonly label: string;
        readonly modifierKind: BattleReactionModifierChoice["kind"];
      };
};
export type BattleUnitFeatureDecisionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "unitFeatureDecision";
  readonly label: string;
  readonly unitFeature: {
    readonly unitId: UnitRecord["id"];
    readonly label: string;
  };
  readonly choices: readonly ["use", "decline"];
};
export type BattleDeathSavingThrowHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "deathSavingThrow";
  readonly label: string;
  readonly combatantId: CombatantId;
};
export type BattleStatBlockRechargeRollHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "statBlockRechargeRoll";
  readonly label: string;
  readonly combatantId: CombatantId;
  readonly rechargeTargets: readonly StatBlockPartKey[];
};
export type BattleStatBlockRechargeRollResult = {
  readonly target: StatBlockPartKey;
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
};
export type BattleReactionDecisionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "reactionDecision";
  readonly label: string;
  readonly trigger: BattleReactionTrigger;
  readonly eligibleReactors: readonly CombatantId[];
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
};
export type BattleSpellcastingAbilityCheckHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellcastingAbilityCheck";
  readonly label: string;
  readonly dc: DifficultyClass;
  readonly spellcastingAbilityCheck: {
    readonly casterId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
    readonly target: BattleOngoingSpellTarget;
    readonly effect: BattleOngoingSpellEffectRef;
    readonly contestedSpellLevel: BattleSpellEffectLevel;
  };
  readonly requiresTableSpatialFact?: boolean;
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
};
export type BattleSanctuaryInterdictionOutcome =
  | {
      readonly saveSucceeded: true;
    }
  | {
      readonly saveSucceeded: false;
      readonly outcome:
        | { readonly kind: "loseAttackOrSpell" }
        | {
            readonly kind: "newTarget";
            readonly targetId: CombatantId;
            readonly spatialFacts: readonly BattleTargetSpatialFact[];
          };
    };
export type BattleSanctuaryInterdictionOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "sanctuaryInterdictionOutcome";
  readonly label: string;
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly ability: Extract<Ability, "wis">;
  readonly dc: DcSource;
  readonly choices: readonly CombatantId[];
};
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
  readonly spellId: SpellRecord["id"];
  readonly rangeFeet: MovementFeet;
  readonly choices: readonly BattleOngoingSpellTarget[];
};
export type BattleHole =
  | BattleTargetChoiceHole
  | BattleSpellCastReactionFactsHole
  | BattleWardingBondSeparationFactsHole
  | BattleObjectTargetChoiceHole
  | BattleObjectContactTargetsHole
  | BattleObjectContactSavingThrowOutcomeHole
  | BattleObjectDropResolutionHole
  | BattleSpellAreaChoiceHole
  | BattleTeleportDestinationHole
  | BattleSpiritualWeaponForcePositionHole
  | BattleHeldObjectFactsHole
  | BattleMagicWeaponTargetItemHole
  | BattleSpellDamageTypeChoiceHole
  | BattleSpellTargetAllocationHole
  | BattleSpellTargetListHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleDragonsBreathDamageRollHole
  | BattleSpellDamageReductionRollHole
  | BattleSourceDamageRollPenaltyRollHole
  | BattleMirrorImageDuplicateRollHole
  | BattleSpellTurnStartDamageRollHole
  | BattleFlamingSphereDamageRollHole
  | BattleSpikeGrowthMovementDamageRollHole
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
  | BattleSpellTurnStartSavingThrowOutcomeHole
  | BattleSleepRepeatSavingThrowOutcomeHole
  | BattleHideousLaughterRepeatSavingThrowOutcomeHole
  | BattleGreaseGroundHazardSavingThrowOutcomeHole
  | BattleWebRestraintSavingThrowOutcomeHole
  | BattleGustOfWindLineSavingThrowOutcomeHole
  | BattleGustOfWindLineDirectionChoiceHole
  | BattleSpellConditionEndTurnSavingThrowOutcomeHole
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
  | BattleDeathSavingThrowHole
  | BattleStatBlockRechargeRollHole
  | BattleConcentrationSavingThrowHole
  | BattleReactionDecisionHole
  | BattleMovementHole
  | BattleLevitateAltitudeChangeHole
  | BattleLevitateInitialRiseHole
  | BattleAbilityCheckHole
  | BattleSpellcastingAbilityCheckHole
  | BattleGrappleOutcomeHole
  | BattleShoveOutcomeHole
  | BattleSanctuaryInterdictionOutcomeHole
  | BattleAttackDamageDispositionHole
  | BattleOngoingSpellTargetChoiceHole;

export type BattleAttackRollResult = AttackRollResult & {
  readonly activatedOngoingFeatureUnitId?: UnitRecord["id"];
  readonly missToHitReplacementUnitId?: UnitRecord["id"];
};
export type BattleRolledDiceFill = {
  readonly kind: "rolledDice";
  readonly holeId: BattleHoleId;
  readonly value: readonly [RolledDiceGroup, ...RolledDiceGroup[]];
  readonly selectedAttackDamageRiderUnitIds?: readonly UnitRecord["id"][];
  readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill;
};
export type SpellDamageReductionFill = {
  readonly sourceSpellId: SpellRecord["id"];
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
  readonly sourceSpellId: SpellRecord["id"];
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
      readonly kind: "attackRoll";
      readonly holeId: BattleHoleId;
      readonly value: BattleAttackRollResult;
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
      readonly kind: "dancingLightsPlacement";
      readonly holeId: BattleHoleId;
      readonly value: BattleDancingLightsPlacementValue;
    }
  | {
      readonly kind: "unitFeatureDecision";
      readonly holeId: BattleHoleId;
      readonly value: "use" | "decline";
    }
  | {
      readonly kind: "heldObjectFacts";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly objectIds: readonly BattleObjectId[];
      };
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
    }
  | {
      readonly kind: "targetSpatialFacts";
      readonly holeId: BattleHoleId;
      readonly spatialFacts: readonly BattleTargetSpatialFact[];
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
            | "spellTouchedObjectTarget"
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
    }
  | {
      readonly kind: "deathSavingThrow";
      readonly holeId: BattleHoleId;
      readonly value: DieRollResult;
    }
  | {
      readonly kind: "statBlockRechargeRoll";
      readonly holeId: BattleHoleId;
      readonly value: readonly BattleStatBlockRechargeRollResult[];
    }
  | {
      readonly kind: "concentrationSavingThrow";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly succeeded: boolean;
      };
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
      readonly kind: "reactionDecision";
      readonly holeId: BattleHoleId;
      readonly value: BattleReactionDecision;
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
      };
      readonly spatialFacts?: readonly BattleAbilityCheckSpatialFact[];
    }
  | {
      readonly kind: "grappleOutcome";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly succeeded: boolean;
      };
    }
  | {
      readonly kind: "shoveOutcome";
      readonly holeId: BattleHoleId;
      readonly value: BattleShoveOutcomeValue;
    };

export type BattleResolutionInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};
export type BattleResolutionInputForSubject<TSubject extends BattleSubject> =
  Omit<BattleResolutionInput, "subject"> & {
    readonly subject: TSubject;
  };
export type AttackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "attack" }>
> & {
  readonly replayingInterruptedProcedure?: boolean;
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
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
  | (BonusActionStandardActionSubject & { readonly action: "hide" })
>;
export type BonusActionStandardActionBattleResolutionInput =
  BattleResolutionInputForSubject<BonusActionStandardActionSubject>;
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
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  readonly reactionContinuationSubject?: BattleSubject | undefined;
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  };
export type BonusActionDashSpellBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "bonusActionDashSpell" }>
  > & {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  };
export type UnitFeatureBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "unitFeature" }>
>;
export type MonkFocusOptionBattleResolutionInput =
  BattleResolutionInputForSubject<MonkFocusOptionSubject>;
export type MonkFocusFlurryOfBlowsStrikeBattleResolutionInput =
  BattleResolutionInputForSubject<MonkFocusFlurryOfBlowsStrikeSubject> & {
    readonly replayingInterruptedProcedure?: boolean;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
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
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
      readonly snapshot: BattleSnapshot;
    };
export type BattleFeatherFallLandingResult =
  | {
      readonly tag: "mitigated";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly fallDamagePrevented: true;
      readonly fallingPronePrevented: true;
    }
  | {
      readonly tag: "unmitigated";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly fallDamagePrevented: false;
      readonly fallingPronePrevented: false;
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
  readonly round: RoundType;
  readonly currentActorId: CombatantId;
  readonly turnOrder: readonly CombatantId[];
  readonly combatants: readonly BattleCreatureSnapshot[];
  readonly findFamiliars: readonly FindFamiliarSnapshot[];
  readonly lightEmitters: readonly BattleLightEmitter[];
  readonly obscurementZones: readonly BattleObscurementZone[];
  readonly acts: readonly AvailableBattleAct[];
  readonly turn: BattleTurnSnapshot;
  readonly readiedResponses: {
    readonly spells: readonly BattleReadiedSpellSnapshot[];
    readonly movements: readonly BattleReadiedMovementSnapshot[];
  };
  readonly helpAttackMarkers: readonly BattleHelpAttackSnapshot[];
  readonly pendingReaction: {
    readonly trigger: BattleReactionTrigger;
    readonly decisionHole: BattleReactionDecisionHole;
    readonly choices: readonly BattleReactionProcedureChoice[];
    readonly stackDepth: BattleReplayStackDepth;
  } | null;
};

export type BattleCreatureSnapshot = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  readonly side: BattleCombatantSide;
  readonly origin: BattleCreatureOriginSnapshot;
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
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

export type BattleTurnSnapshot = {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly bonusActionAvailable: boolean;
  readonly jumpDistanceMultiplier: BattleJumpDistanceMultiplier | null;
  readonly spellSlotUsesThisTurn: readonly BattleTurnSpellSlotUse[];
  readonly levelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly quickenedLevelOnePlusSpellCastsThisTurn: readonly CombatantId[];
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
  readonly weaponMasteryCleaveAttackersUsedThisTurn: readonly CombatantId[];
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
      readonly characterId: CharacterId;
      readonly resources: readonly BattleCharacterResourceSnapshot[];
      readonly spellcasting: {
        readonly spellSlots: CharacterBattleSpellcastingState["spellSlots"];
      } | null;
    }
  | {
      readonly kind: "statBlock";
      readonly statBlockId: StatBlockRecord["id"];
      readonly resources: StatBlockResourceSnapshot;
    };

export type BattleCharacterResourceSnapshot =
  | {
      readonly unitId: UnitRecord["id"];
      readonly usage: "unlimited";
      readonly usedThisTurn: boolean;
    }
  | {
      readonly unitId: UnitRecord["id"];
      readonly usage: "limited";
      readonly usesRemaining: number;
      readonly usedThisTurn: boolean;
    }
  | {
      readonly unitId: UnitRecord["id"];
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

export {
  ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
  ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE,
  ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
  ATTACK_TARGET_HOLE_ID,
  ATTACK_TARGET_HOLE_INSTANCE,
  CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX,
  DEATH_SAVING_THROW_HOLE_ID,
  DEATH_SAVING_THROW_HOLE_INSTANCE,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_INSTANCE,
  GRAPPLE_OUTCOME_HOLE_ID,
  GRAPPLE_OUTCOME_HOLE_INSTANCE,
  GRAPPLE_TARGET_HOLE_ID,
  GRAPPLE_TARGET_HOLE_INSTANCE,
  HELP_ATTACK_ALLY_HOLE_ID,
  HELP_ATTACK_ALLY_HOLE_INSTANCE,
  HELP_ATTACK_TARGET_HOLE_ID,
  HELP_ATTACK_TARGET_HOLE_INSTANCE,
  HIDE_ABILITY_CHECK_HOLE_ID,
  HIDE_ABILITY_CHECK_HOLE_INSTANCE,
  HIDE_DC,
  INITIAL_ROUND,
  INITIAL_TURN_RESOURCES,
  LEVITATE_ALTITUDE_CHANGE_HOLE_ID,
  LEVITATE_ALTITUDE_CHANGE_HOLE_INSTANCE,
  MOVEMENT_HOLE_ID,
  MOVEMENT_HOLE_INSTANCE,
  REACTION_DECISION_HOLE_ID,
  REACTION_DECISION_HOLE_INSTANCE,
  REACTION_MODIFIER_ROLL_HOLE_ID,
  REACTION_MODIFIER_ROLL_HOLE_INSTANCE,
  SEARCH_ABILITY_CHECK_HOLE_ID,
  SEARCH_ABILITY_CHECK_HOLE_INSTANCE,
  SEARCH_TARGET_HOLE_ID,
  SEARCH_TARGET_HOLE_INSTANCE,
  SHOVE_OUTCOME_HOLE_ID,
  SHOVE_OUTCOME_HOLE_INSTANCE,
  SHOVE_TARGET_HOLE_ID,
  SHOVE_TARGET_HOLE_INSTANCE,
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID,
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_INSTANCE,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  type AttackFillSet,
  type ClassFeatureExtraAttackActionResource,
  type GrappleFillSet,
  type HpDamageProjection,
  type ShoveFillSet,
  type StatBlockMultiattackActionResource,
  type SupportedLiteralMultiattackDispatch,
  type SupportedStatBlockBonusActionOption,
  type SupportedStatBlockBonusActionStandardAction,
  type SupportedStatBlockMultiattack,
  type UnitFeatureRolledDiceFill,
} from "./battle-reducer/battle-runtime-protocol.ts";

export {
  ActiveOngoingFeatureOccurrenceSnapshotSchema,
  BattleDroppedObjectOutcomeSchema,
  BattleFillSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BattleSnapshotSchema,
} from "./battle-reducer/battle-codecs.ts";
