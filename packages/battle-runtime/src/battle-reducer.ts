// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-damage spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-beam-sequence spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-expeditious-retreat-dash spell.invocation-feather-fall-mitigation spell.invocation-forced-reaction-movement spell.invocation-grease-ground-hazard spell.invocation-jump-movement-replacement spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-damage-rider spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
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
  BattlePositiveHpUnconscious,
  BattleUnitRef,
  BattleWalkSpeed,
  CharacterBattleLoadoutRef,
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
  type SpellInvocationRef,
} from "./battle-subjects.ts";
import {
  type CharacterBattleResourceState,
  type CharacterBattleSpellcastingState,
} from "./character-battle-resources.ts";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import type {
  BattleObjectId,
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

import { type DamageAmountByTypeEntry } from "./battle-reducer/damage-helpers.ts";
import {
  BATTLE_ATTACK_RANGE_BANDS,
  COMMAND_OPTIONS,
  CRITICAL_HIT_THRESHOLDS,
  type EldritchBlastBeamCount,
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
  SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS,
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
  resolveCommandFleeAfterMovement,
  resolveCommandFleeCommand,
  resolveEndTurn,
  resolveCommandApproachAfterMovement,
  resolveCommandApproachCommand,
  resolveCommandDropCommand,
  resolveCommandGrovelCommand,
  resolveEndTurnCommand,
  resolveGreaseGroundHazardSaveCommand,
  resolveJumpMovementReplacementCommand,
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
  resolveShakeAwakeFromSleep,
  resolveStatBlockBonusActionDisengage,
  resolveStatBlockBonusActionHide,
  resolveStatBlockBonusActionOption,
  spellSaveDcForCaster,
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
export { resolveAttack } from "./battle-reducer/attack-main.ts";
export {
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
  currentActorHasPendingSlottedSpellCast,
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
  battleLightEmitters,
  FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
} from "./battle-reducer/spells-active-effects.ts";
export const BATTLE_SPECIAL_SPEED_KINDS = [
  "climb",
  "swim",
] as const satisfies ReadonlyArray<Exclude<BattleMovementSpeedKind, "walk">>;
export const BATTLE_D20_ROLL_MODIFIER_KINDS = [
  "ability_check",
  "attack_roll",
  "saving_throw",
] as const satisfies ReadonlyArray<BattleD20RollModifierKind>;
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
  readonly dice: number;
  readonly dieSize: DamageDieSize;
  readonly sign: "+" | "-";
};
export type BattlePassiveSpeedProfile =
  | BattlePassiveSpeedBonusSupportProfile
  | BattlePassiveSpeedKindGrantsSupportProfile;

export type BattleActiveEffectExpiration =
  | {
      readonly kind: "startOfTurn";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "endOfTurn";
      readonly combatantId: CombatantId;
      readonly round: RoundType;
    }
  | {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    }
  | {
      readonly kind: "duration";
      readonly durationTicks: ElapsedTimeTicks;
    };
type TurnAnchoredBattleActiveEffectExpiration = Exclude<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" } | { readonly kind: "duration" }
>;
export type BattleSpellEffectEarlyEnd =
  | { readonly kind: "targetDonsArmor" }
  | { readonly kind: "concentrationBroken" };
type BattleSpellEffectBase = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
};
export type SpellConditionAbilityCheckSuccessEnd =
  (typeof SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS)[number];
export type ProtectionFromEvilAndGoodPreventedCondition =
  (typeof PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS)[number];
export type BattlePossessionAttemptDisposition =
  | {
      readonly tag: "prevented";
      readonly prevention: "creatureTypeProtection";
      readonly sourceCombatantId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly tag: "unprevented";
      readonly sourceCombatantId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly tag: "invalid";
      readonly reason:
        | "unknownSourceCombatant"
        | "unknownSourceCreatureType"
        | "unknownTargetCombatant";
      readonly sourceCombatantId: CombatantId;
      readonly targetId: CombatantId;
    };
export type SpellConditionEscape =
  | {
      readonly kind: "abilityCheck";
      readonly ability: "str";
      readonly skill: "athletics";
      readonly successEnds: SpellConditionAbilityCheckSuccessEnd;
    }
  | {
      readonly kind: "targetDamagedByCasterOrAlly";
    };
export type SpellTurnStartDamage = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
};
export type SpellTurnStartDamageSave = {
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly successEnds: "spell";
};
export type BattleActiveEffect =
  | (BattleSpellEffectBase & {
      readonly kind: "speedDelta";
      readonly deltaFeet: MovementDeltaFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellArmorClassBonus";
      readonly bonus: number;
      readonly negatedSpellIds: readonly SpellRecord["id"][];
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellBaseArmorClass";
      readonly base: number;
      readonly ability: "dex";
      readonly earlyEnds: readonly BattleSpellEffectEarlyEnd[];
      readonly durationTicks: ElapsedTimeTicks;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellCondition";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly escape: SpellConditionEscape | null;
      readonly turnStartDamage: SpellTurnStartDamage | null;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "sleepPendingRepeatSave";
      readonly conditionHadNonSpellSource: boolean;
      readonly save: {
        readonly ability: Extract<Ability, "wis">;
        readonly dc: DcSource;
      };
      readonly repeatAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "endOfTurn" }
      >;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "sleepUnconscious";
      readonly conditionHadNonSpellSource: boolean;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "greaseGroundHazard";
      readonly areaId: string;
      readonly save: {
        readonly ability: Extract<Ability, "dex">;
        readonly dc: DcSource;
      };
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "commandPending";
      readonly option: BattleCommandOption;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "endOfTurn" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellTurnStartDamageAndSave";
      readonly damage: SpellTurnStartDamage;
      readonly save: SpellTurnStartDamageSave;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "opportunityAttackDenied";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "nextAttackRollBySelf";
      readonly mode: AttackRollMode;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "nextAttackRollAgainstSelf";
      readonly mode: AttackRollMode;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "hitPointRegainPrevented";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "d20RollModifier";
      readonly on: readonly BattleD20RollModifierKind[];
      readonly delta: BattleD20RollModifierDelta;
      readonly skill: Skill | null;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "creatureTypeProtection";
      readonly attackRollMode: "disadvantage";
      readonly protectedAgainstCreatureTypes: readonly CreatureType[];
      readonly preventedConditions: readonly ProtectionFromEvilAndGoodPreventedCondition[];
      readonly preventsPossession: true;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "faerieFireOutline";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "conditionImmunity";
      readonly condition: Condition;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "turnStartTemporaryHitPoints";
      readonly amount: number;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellDamageReduction";
      readonly damageType: DamageType;
      readonly amount: {
        readonly dice: 1;
        readonly dieSize: 4;
      };
      readonly usedThisTurn: boolean;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellWeaponDamageRider";
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellMarkedDamageRider";
      readonly targetCombatantId: CombatantId;
      readonly transferAvailable: boolean;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellDashBonusAction";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "jumpMovementReplacement";
      readonly movementCostFeet: MovementFeet;
      readonly maxJumpDistanceFeet: MovementFeet;
      readonly usedThisTurn: boolean;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "featherFallMitigation";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "heldLight";
      readonly brightRadiusFeet: MovementFeet;
      readonly dimAdditionalFeet: MovementFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    });
export type BattleConcentration = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly effectKind: "spellEffect" | "readiedSpell";
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
    };
export type BattleLightEmitter = BattleSpellEffectBase & {
  readonly attachment: BattleLightEmitterAttachment;
  readonly emission: BattleLightEmission;
  readonly expiresAt: BattleActiveEffectExpiration;
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
      readonly concentrationSavingThrow?: Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >;
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
  | Extract<
      BattleSubject,
      { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
    >
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
export type BattleAttackDamageContinuationWithoutConcentration = Omit<
  BattleAttackDamageContinuation,
  "concentrationSavingThrow"
> & {
  readonly concentrationSavingThrow?: never;
};
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
      readonly targetIds: readonly CombatantId[];
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
  readonly greaseGroundDifficultTerrain?: BattleGreaseGroundDifficultTerrainMovementFact;
  readonly jumpMovementReplacement?: BattleJumpMovementReplacementFact;
  readonly commandApproach?: BattleCommandApproachMovementFact;
  readonly commandFlee?: BattleCommandFleeMovementFact;
};
export type BattleGreaseGroundDifficultTerrainMovementFact = {
  readonly kind: "greaseGroundDifficultTerrain";
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly areaId: string;
  readonly totalDistanceFeet: MovementFeet;
  readonly greaseDistanceFeet: MovementFeet;
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
      readonly kind: "attackTargetInRangedRange";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly attackName: string;
      readonly rangeBand: BattleAttackRangeBand;
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
      readonly kind: "spellObjectTarget";
      readonly casterId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly spellId: SpellRecord["id"];
      readonly rangeFeet: MovementFeet;
      readonly armorClass: ArmorClass;
      readonly damageDisposition: BattleObjectDamageDisposition;
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
      readonly areaId: string;
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
      readonly kind: "grappleTargetWithinReach";
      readonly grapplerId: CombatantId;
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
  readonly jumpMovementReplacement?: BattleJumpMovementReplacementFact;
};
export type HealingSpellActionCost = "magicAction" | "bonusAction";
export type PreparedSpellAccess = { readonly tag: "prepared" };
type ClassCantripSpellAccess = { readonly tag: "classCantrip" };
export type SpellSlotInvocationResource = {
  readonly tag: "spellSlot";
  readonly slotLevel: SpellSlotLevel;
};
type NoSpellInvocationResource = { readonly tag: "none" };
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
      readonly kind: "primaryTargetOriginEmanation";
      readonly radiusFeet: MovementFeet;
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
export type SpellPostSaveAreaEffect = {
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
export type SpellFailedSaveConditionEffect = {
  readonly condition: Condition;
  readonly expiresAt:
    | "endOfCasterNextTurn"
    | "concentration"
    | {
        readonly kind: "duration";
        readonly durationTicks: ElapsedTimeTicks;
      };
  readonly escape: SpellConditionEscape | null;
  readonly turnStartDamage: SpellTurnStartDamage | null;
};
export type SpellSavingThrowRollModeRule = {
  readonly kind: "hostileTarget";
  readonly mode: "advantage";
};
export type SpellFailedSaveAttackRollEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "faerieFireOutline" }
>;
export type ScalarBuffSpellTargeting =
  | {
      readonly kind: "self";
    }
  | {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    };
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
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "creatureTypeProtection" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "jumpMovementReplacement" }
    >
  | Extract<
      SupportedSpellInvocation,
      { readonly procedure: "featherFallMitigation" }
    >
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
        { readonly kind: "speedDelta" | "spellArmorClassBonus" }
      >;
    };
export type RollModifierSpellTargeting = Extract<
  ScalarBuffSpellTargeting,
  { readonly kind: "targetList" }
>;
export type RollModifierSpellEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "d20RollModifier" }
>;
type RollModifierSpellSaveGate = {
  readonly ability: Ability;
  readonly dc: DcSource;
};
export type RollModifierSpellInvocation = {
  readonly access: PreparedSpellAccess | ClassCantripSpellAccess;
  readonly resource: SpellSlotInvocationResource | NoSpellInvocationResource;
  readonly procedure: "rollModifier";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: RollModifierSpellTargeting;
  readonly effect: RollModifierSpellEffect;
  readonly rangeFeet: MovementFeet;
  readonly saveGate: RollModifierSpellSaveGate | null;
  readonly skillChoices: readonly Skill[] | null;
};
export type CreatureTypeProtectionSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly procedure: "creatureTypeProtection";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: RollModifierSpellTargeting;
  readonly activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "creatureTypeProtection" }
  >;
  readonly rangeFeet: MovementFeet;
};
export type DamageReductionSpellInvocation = {
  readonly access: ClassCantripSpellAccess;
  readonly resource: NoSpellInvocationResource;
  readonly procedure: "damageReduction";
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: RollModifierSpellTargeting;
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
  readonly spell: SpellRecord;
  readonly actionCost: "magicAction";
  readonly targeting: RollModifierSpellTargeting;
  readonly activeEffects: readonly [
    Extract<BattleActiveEffect, { readonly kind: "conditionImmunity" }>,
    Extract<
      BattleActiveEffect,
      { readonly kind: "turnStartTemporaryHitPoints" }
    >,
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
export type AfterHitDamageSpellInvocation = {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
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
export type MarkedDamageRiderSpellInvocation =
  | {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
      readonly procedure: "markedDamageRider";
      readonly action: "cast";
      readonly spell: SpellRecord;
      readonly actionCost: "bonusAction";
      readonly targeting: { readonly kind: "singleCombatant" };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
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
export type SpellAttackDamageTargeting = Extract<
  SpellTargeting,
  { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
>;
export type SpellAttackBeamSequenceTargeting = {
  readonly kind: "beamSequenceCreatureOrObject";
  readonly beamCount: EldritchBlastBeamCount;
};
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
// SupportedAttackActionOption is a currently executable option for spending an
// immediate attack made as part of the Attack action. It is narrower than all
export type SupportedSpellInvocation =
  | HeldLightSpellInvocation
  | HeldLightHurlSpellInvocation
  | SpellHostedWeaponAttackInvocation
  | DamageReductionSpellInvocation
  | JumpMovementReplacementSpellInvocation
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
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
      readonly attackKind: SpellAttackKind;
      readonly attackBonus: AttackBonus;
      readonly postDamageRiders: readonly SpellPostDamageRider[];
    })
  | {
      readonly access: ClassCantripSpellAccess;
      readonly resource: NoSpellInvocationResource;
      readonly procedure: "spellAttackBeamSequence";
      readonly spell: SpellRecord;
      readonly targeting: SpellAttackBeamSequenceTargeting;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
      readonly attackKind: Extract<SpellAttackKind, "ranged_spell_attack">;
      readonly attackBonus: AttackBonus;
    }
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
  | ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation
  | WeaponDamageRiderSpellInvocation
  | AfterHitDamageSpellInvocation
  | AfterHitSaveGatedConditionSpellInvocation
  | AfterHitTimedDamageAndSaveSpellInvocation
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

export type SupportedDamageSpellInvocation = Exclude<
  SupportedSpellInvocation,
  {
    readonly procedure:
      | "persistentArmorEffect"
      | "directHitPointRestoration"
      | "damageReduction"
      | "spellHostedWeaponAttack"
      | "rollModifier"
      | "creatureTypeProtection"
      | "conditionImmunityAndTurnStartTemporaryHitPoints"
      | "scalarBuff"
      | "weaponDamageRider"
      | "afterHitDamage"
      | "afterHitSaveGatedCondition"
      | "afterHitTimedDamageAndSave"
      | "markedDamageRider"
      | "expeditiousRetreatDash"
      | "jumpMovementReplacement"
      | "featherFallMitigation"
      | "heldLight"
      | "shieldReaction"
      | "saveGatedCondition"
      | "saveGatedAttackRollAdvantage"
      | "sleepTargetAdmission"
      | "command"
      | "greaseGroundHazard"
      | "chainedSpellAttackDamage";
  }
>;
export type ReadiedSpellInvocation =
  | Exclude<
      SupportedDamageSpellInvocation,
      { readonly procedure: "heldLightHurl" }
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

export type BattleTurnResources = ActionEconomyState & {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
  readonly commandHalt: BattleCommandHaltTurnSuppression | null;
  readonly spellSlotExpendedThisTurn: boolean;
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
  readonly pendingAttackRollMissToHitReplacementSelection?: PendingAttackRollMissToHitReplacementSelection;
  readonly lightWeaponAttackMade?: {
    readonly weaponItemId: string;
  };
  readonly dashMovementBonusFeet: MovementFeet;
  readonly disengaged: boolean;
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
export type SpellAttackDamageComponent = Omit<
  SpellWeaponDamageRider,
  "kind" | "expiresAt"
>;
export type AttackSpellDamageAddition = SpellAttackDamageComponent & {
  readonly kind: "attackSpellDamageAddition";
};
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
        readonly weaponProficiencies: readonly WeaponProficiency[];
        readonly selectedLoadout: CharacterBattleLoadoutRef;
        readonly speed: BattleWalkSpeed;
        readonly attack: CharacterWeaponAttackActionOption | null;
        readonly unarmedStrike: CharacterUnarmedStrikeActionOption;
        readonly offHandAttack?: CharacterWeaponAttackActionOption;
        readonly resources: readonly CharacterBattleResourceState[];
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
export type BattleHeldObjectFactsHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "heldObjectFacts";
  readonly label: string;
  readonly actorId: CombatantId;
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
        | "saveGatedCondition"
        | "creatureTypeProtection"
        | "damageReduction"
        | "scalarBuff"
        | "conditionImmunityAndTurnStartTemporaryHitPoints"
        | "jumpMovementReplacement"
        | "featherFallMitigation"
        | "command";
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
        | "repeatedDamageAllocation"
        | "saveGatedDamage"
        | "spellAttackBeamSequence"
        | "spellAttackDamage";
    }
  >;
  readonly critical: boolean;
  readonly spellMarkedDamageRiders?: readonly SpellMarkedDamageRider[];
};
export type BattleSpellDamageReductionRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spellDamageReduction: SpellDamageReductionRoll;
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
    readonly areaId: string;
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
      readonly sleepNonSleeperFacts: readonly BattleSleepNonSleeperFact[];
    }
  | {
      readonly kind: "greaseGroundArea";
      readonly areaId: string;
    }
  | {
      readonly kind: "thunderwaveArea";
      readonly creaturePushes: readonly BattleThunderwaveCreaturePushOutcome[];
      readonly unsecuredObjectPushes: readonly BattleThunderwaveUnsecuredObjectPushOutcome[];
      readonly audibleBoom: BattleThunderwaveAudibleBoom;
    };
export type BattleSleepNonSleeperFact = {
  readonly kind: "doesNotSleep";
  readonly targetId: CombatantId;
};
export type BattleSavingThrowRollModeProjection = {
  readonly targetId: CombatantId;
  readonly rollMode: AttackRollMode;
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
        | "rollModifier"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "afterHitSaveGatedCondition"
        | "saveGatedAttackRollAdvantage"
        | "sleepTargetAdmission"
        | "command"
        | "greaseGroundHazard";
    }
  >;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly BattleSpellAreaChoice[];
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
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
export type BattleAbilityCheckHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "abilityCheck";
  readonly label: string;
  readonly ability: Ability;
  readonly skill: "stealth" | "perception" | "athletics";
  readonly dc: DifficultyClass;
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
export type BattleAttackDamageDispositionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "attackDamageDisposition";
  readonly label: string;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly choices: readonly BattleAttackDamageDisposition[];
};
export type BattleHole =
  | BattleTargetChoiceHole
  | BattleObjectTargetChoiceHole
  | BattleHeldObjectFactsHole
  | BattleSpellDamageTypeChoiceHole
  | BattleSpellTargetAllocationHole
  | BattleSpellTargetListHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleSpellDamageReductionRollHole
  | BattleSpellTurnStartDamageRollHole
  | BattleSpellHealingRollHole
  | BattleSpellSkillChoiceHole
  | BattleCommandOptionChoiceHole
  | BattleSpellSavingThrowOutcomeHole
  | BattleSpellTurnStartSavingThrowOutcomeHole
  | BattleSleepRepeatSavingThrowOutcomeHole
  | BattleGreaseGroundHazardSavingThrowOutcomeHole
  | BattleUnitFeatureSavingThrowOutcomeHole
  | BattleUnitFeatureRollHole
  | BattleDeathSavingThrowHole
  | BattleStatBlockRechargeRollHole
  | BattleConcentrationSavingThrowHole
  | BattleReactionDecisionHole
  | BattleMovementHole
  | BattleAbilityCheckHole
  | BattleGrappleOutcomeHole
  | BattleAttackDamageDispositionHole;

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
      readonly kind: "skillChoice";
      readonly holeId: BattleHoleId;
      readonly value: Skill;
    }
  | {
      readonly kind: "commandOptionChoice";
      readonly holeId: BattleHoleId;
      readonly value: BattleCommandOption;
    }
  | {
      readonly kind: "heldObjectFacts";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly objectIds: readonly BattleObjectId[];
      };
    }
  | {
      readonly kind: "targetChoice";
      readonly holeId: BattleHoleId;
      readonly value: CombatantId;
      readonly spatialFacts?: readonly BattleTargetSpatialFact[];
    }
  | {
      readonly kind: "objectTargetChoice";
      readonly holeId: BattleHoleId;
      readonly value: BattleObjectId;
      readonly spatialFacts: readonly Extract<
        BattleTargetSpatialFact,
        { readonly kind: "spellObjectTarget" }
      >[];
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
      readonly droppedObjects?: readonly BattleDroppedObjectOutcome[];
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
  readonly lightEmitters: readonly BattleLightEmitter[];
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
  readonly spellSlotExpendedThisTurn: boolean;
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
  readonly weaponDamageDiceRollChoicesUsedThisTurn: readonly WeaponDamageDiceRollChoiceUsage[];
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
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID,
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_INSTANCE,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  type AttackFillSet,
  type ClassFeatureExtraAttackActionResource,
  type GrappleFillSet,
  type HpDamageProjection,
  type StatBlockMultiattackActionResource,
  type SupportedLiteralMultiattackDispatch,
  type SupportedStatBlockBonusActionOption,
  type SupportedStatBlockBonusActionStandardAction,
  type SupportedStatBlockMultiattack,
  type UnitFeatureRolledDiceFill,
} from "./battle-reducer/battle-runtime-protocol.ts";

export {
  ActiveOngoingFeatureOccurrenceSnapshotSchema,
  BattleFillSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
  BattleSnapshotSchema,
} from "./battle-reducer/battle-codecs.ts";
