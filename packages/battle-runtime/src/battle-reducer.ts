// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
import { Brand, Match, Schema } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";
import * as Either from "effect/Either";
import * as Option from "effect/Option";
import {
  actionRestrictionAllows,
  canSpendAction,
  grantUnitActionResource,
  resetTurnActionEconomy,
  spendAction,
  spendActivationResource,
  spendMatchingActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import {
  createScoredInitiativeStack,
  currentActing,
  insertAtOrderIndex,
  initiativeOrder,
  nextInitiative,
  removeFromInitiative,
} from "@dnd/shared-algebras/initiative-algebra";
import {
  currentArmorClass,
} from "@dnd/shared-algebras/armor-class-algebra";
import { ordinaryMovementCost } from "@dnd/shared-algebras/movement-cost-algebra";
import {
  hasCondition,
  isIncapacitated,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  elapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  ActionEconomyState,
  RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import type { InitiativeStack } from "@dnd/shared-algebras/initiative-algebra";
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
import type {
  HoleId,
  HoleInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  ATTACK_ROLL_MODES,
  holeId,
  holeInstanceKey,
  type AttackRollResult,
  type AttackRollMode,
  type RolledDiceGroup,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  CONDITIONS as ALL_CONDITIONS,
  AbilityModifier,
  AttackBonus,
  DamageDieSizeSchema,
  DamageAmount,
  DifficultyClass,
  Hp,
  MovementDeltaFeet,
  MovementFeet,
  Round,
  SpellSlotLevel,
  damageAmount as toDamageAmount,
  difficultyClass,
  movementFeet,
  type Condition,
  type DamageDieSize,
  DieRollResult,
  type Round as RoundType,
} from "@dnd/shared/types";
import {
  STANDARD_ACTION_KINDS,
  type CreatureType,
  type StandardActionKind,
} from "@dnd/shared/game-facts";
import type {
  Ability,
  CreatureNamedActionOption,
  CreatureNamedMultiattack,
  DamageType,
  DcSource,
  DiceExpr,
  EffectAtom,
  Size,
  Skill,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { SKILLS as SURFACE_SKILLS } from "@dnd/surface/surface/types";
import {
  AbilitySchema,
  DamageTypeSchema,
  DcSourceSchema,
} from "@dnd/surface/surface/schema";
import {
  BattleCombatantSide,
  BattleId,
  BattleReplayStackDepth,
  CombatantId,
  battleReplayStackDepth,
  spellId,
} from "./identity.ts";
import type { CharacterId, InitiativeScore } from "./identity.ts";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleResourceState,
  type CharacterBattleSpellcastingState,
} from "./character-battle-resources.ts";
import {
  BATTLE_REACTION_TRIGGERS,
  BATTLE_READIED_SPELL_TRIGGERS,
  type BattleReactionTrigger,
  type BattleReadiedSpellTrigger,
} from "./battle-reaction-triggers.ts";
import type { ZeroHpLifecycle } from "./zero-hp-lifecycle.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BattleSubjectTextSchema,
  BattleSubjectSchema,
  SpellInvocationRefSchema,
  sameBattleSubject,
  type ActionHideSubject,
  type ActionSearchSubject,
  type BattleMovementSpeedKind,
  type BattleSubject,
  type BonusActionStandardActionSubject,
  type SpellInvocationRef,
  type SpellInvocationRefEncoded,
} from "./battle-subjects.ts";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  StatBlockAttackActionOption,
  StatBlockMutableResourceState,
  StatBlockPartKey,
  StatBlockPartSection,
  StatBlockResourceSnapshot,
  SupportedAttackActionOption,
} from "./battle-action-options.ts";
import type {
  BattleCreatureInit,
  BattlePositiveHpUnconscious,
  BattleUnitRef,
  BattleWalkSpeed,
  CharacterBattleLoadoutRef,
  StatBlockBattleInitInput,
} from "./battle-init.ts";
import {
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  type BattlePassiveSpeedBonusSupportProfile,
  type BattlePassiveSpeedKindGrantsSupportProfile,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  battleReactionRollOrDamageReductionSupportForUnit,
  parseSupportedUnitFeatureProfile,
  type ReactionReductionResourceDie,
  type ReactionReductionResourceSpend,
  type ReactionRollOrDamageReductionProfile,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";

import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_INSTANCE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_INSTANCE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_INSTANCE,
  CRITICAL_HIT_THRESHOLDS,
} from "./battle-reducer/domain-constants.ts";
import {
  battleStateInitIssue,
} from "./battle-reducer/domain-helpers.ts";
export {
  concentrationSavingThrowDc,
  scoreModifier,
} from "./battle-reducer/domain-helpers.ts";
export { combatantKnockedOutUnconscious } from "./battle-reducer/creature-state.ts";
export {
  breakBattleConcentration,
  resolveBattleConcentrationDamage,
} from "./battle-reducer/damage-apply.ts";
import {
  expendSpellSlot,
  spellHealingAmount,
} from "./battle-reducer/spell-effects.ts";
import {
  activeMarkedDamageRiderEffect,
  activeMarkedDamageRiders,
  activeSpellWeaponDamageRiders,
  applyAvailableSpellDamageReduction,
  attackDamageByTypeEntries,
  damageAmountAfterTargetAdjustments,
  damageAmountByTypeAfterTargetAdjustments,
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeMapEntries,
  entriesAfterProportionalDamageReduction,
  isSpellDamageReductionRollFill,
  ongoingFeatureDamageModifier,
  spellDamageReductionRollForTarget,
  type DamageAmountByTypeEntry,
} from "./battle-reducer/damage-helpers.ts";
import {
  actorHasAlternateActionCost,
  attackTargetChoices,
  attackTargetHole,
  bonusActionDashTemporaryHitPointsForActor,
  bonusActionStandardActionActs,
  canHideInCurrentCircumstances,
  escapeGrappleOutcomeHole,
  escapeSpellRestraintAbilityCheckHole,
  grappleOutcomeHole,
  grappleTargetChoices,
  grappleTargetHole,
  hiddenSearchTargetChoices,
  hideAbilityCheckHole,
  needsHolesResult,
  revealHidden,
  searchAbilityCheckHole,
  searchTargetHole,
} from "./battle-reducer/hole-helpers.ts";
import {
  combatantCanSee,
  combatantWearingArmorCategory,
  combatantsAreAllies,
  combatantsAreEnemies,
  currentActorId,
  grappledBy,
} from "./battle-reducer/creature-state-leaves.ts";
import { invalidResult } from "./battle-reducer/result-helpers.ts";
import {
  attackActionOptionIsOrdinaryAttackAction,
  refreshStatBlockStartTurnResources,
  sameStatBlockPartKey,
  spendStatBlockAttackResources,
  statBlockActionSectionAttackOptions,
  statBlockAttackResourceAvailable,
  statBlockLimitedUseForPart,
  statBlockPartLimitedUseAvailable,
  statBlockSubjectPart,
  updateStatBlockActorResources,
} from "./battle-reducer/statblock.ts";
import {
  attackActionOptionName,
  attackCanCarryKnockOutChoice,
  attackDamageComponents,
  attackDamageModifier,
  attackPotentialDamageTypes,
  attackTargetConstraint,
  clearPendingAttackRollMissToHitReplacementSelection,
  eligibleAttackDamageRiders,
  eligibleWeaponDamageDiceRollChoiceUnitIds,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackDamageRiders,
  selectedAttackRollMissToHitReplacement,
  selectedWeaponDamageDiceRollChoice,
  signedModifier,
  weaponDamageComponent,
} from "./battle-reducer/statblock-attacks.ts";
import {
  attackActionOptionForSubject,
  attackActionOptionsForActor,
  attackDamageDispositionHole,
  attackDamageHole,
  attackDamageHoleId,
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionFillValidation,
  damageDispositionForTarget,
  heldWeaponItemIdForAttack,
  iceKnifeDamageDispositionHoleKey,
  isLightMeleeWeapon,
  offHandAttackActionOptionForActor,
  offHandAttackPrerequisiteMet,
  zeroHitPointReplacementDispositionHole,
} from "./battle-reducer/attack-damage-apply.ts";
import {
  activeOngoingFeatureOccurrenceFromProfile,
  extendOngoingFeatureToEndOfNextTurn,
  ongoingFeatureLifecycleHasExtensionTrigger,
} from "./battle-reducer/ongoing-feature-helpers.ts";
import {
  attackRollHole,
  attackRollModeMatches,
  attackRollModeWithOptionalOngoingFeature,
  attackRollOngoingFeatureActivationProfile,
  attackRollOngoingFeatureActivations,
  consumeHelpAttackForAttackRoll,
  extendSavingThrowOngoingFeatures,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./battle-reducer/attack-roll.ts";
import {
  activeEffectArmorClass,
  activeOngoingFeatureOccurrencesForCombatant,
  battleCreatureStateFromInit,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleSubjectActorId,
  closeLegendaryActionWindow,
  combatantCanTakeActions,
  combatantCanTakeReactions,
  combatantInitiativeInsertionIndex,
  combatantSnapshot,
  consumeLegendaryActionWindow,
  hidePrerequisitesReferenceCombatantsIssue,
  isCharacterBattleCreatureState,
  isLegendaryAttackSubject,
  literalStatBlockNumber,
  normalizeEarlyEndedOngoingFeatures,
  ongoingFeatureProfileForSourceKey,
  ongoingFeatureSourceKeyForUnit,
  positiveHpUnconsciousInitIssue,
  statBlockLegendaryActionWindowIsOpen,
} from "./battle-reducer/creature-state.ts";
import {
  applyAttackDamage,
  applyAttackDamageAmount,
  applyHpDamage,
  applyHpHealing,
  applyStartTurnDeathSavingThrow,
  applyTemporaryHitPoints,
  breakBattleConcentration,
  breakBattleConcentrationAfterDamage,
  breakCombatantConcentration,
  concentrationSavingThrowHole,
  deathSavingThrowHole,
  markMarkedDamageRiderTransferAvailable,
  processStatBlockRechargeRolls,
  startTurnDeathSavingThrowRequired,
  statBlockRechargeRollHole,
} from "./battle-reducer/damage-apply.ts";
import {
  conditionsAfterExpiringSpellConditionEffects,
  removeSpellConditionEffect,
  spellRestraintEffectFor,
  spellRestraintEffects,
} from "./battle-reducer/spell-condition-effects-helpers.ts";
import {
  attackKindForDeflectRedirect,
  attackTargetIsLegal,
  battleMovementBudgetForActor,
  combatantCanMoveInState,
  combatantCanMoveWithBudget,
  combatantProficiencyBonus,
  effectiveMovementSpeed,
  effectiveWalkSpeed,
  grappleLinkForTarget,
  movementHoleHasRemainingBudget,
  opportunityAttackOptionForReactor,
  opportunityAttackThreatsForMovement,
  representedMovementSpeedKinds,
} from "./battle-reducer/movement-speed.ts";
import {
  discoverSupportedSpellInvocations,
  isReadiedSpellInvocation,
  spellInvocationCasterPrerequisiteIsMet,
  spellInvocationIsSpellcasting,
  spellRequiresVerbal,
} from "./battle-reducer/spells-discovery.ts";
import {
  markSpellSlotExpendedThisTurn,
  reactionTriggerIncludesHitByAttackRoll,
  reactionTriggerNamedSpellIds,
  spellActTurnResourceAvailable,
  spellAttackKindForRedirect,
  spellHasAvailableSpend,
  supportedSpellActs,
} from "./battle-reducer/spells-profiles.ts";
import {
  applyConditionImmunityAndTurnStartTemporaryHitPointsEffects,
  applyCreatureTypeProtectionSpellEffect,
  applyDamageReductionSpellEffect,
  applyFailedSaveAttackRollAdvantageEffects,
  applyFailedSaveSpellActiveEffects,
  applyFailedSaveSpellConditionEffects,
  applyHeldLightSpellEffect,
  applyMarkedDamageRiderSpellEffect,
  applyPersistentSpellActiveEffect,
  applyPreparedSlotSpellDamage,
  applyRollModifierSpellEffect,
  applyScalarBuffSpellEffect,
  applyShieldReactionSpellActiveEffect,
  applySpellActiveEffects,
  applySpellDamage,
  chainedSpellAttackRollHole,
  chainedSpellAttackRollHoleId,
  chainedSpellDamageRollHole,
  chainedSpellDamageRollHoleId,
  chainedSpellLeapTargetIsLegal,
  chainedSpellTargetHole,
  chainedSpellTargetHoleId,
  repeatedDamageAllocationSpellDamageAmount,
  sameCombatantIdSet,
  sameSpellInvocationRef,
  saveGateDamageResultForOutcome,
  savingThrowRollModeProjections,
  spellAttackRollHole,
  spellBurstDamageAmountForTarget,
  spellBurstDamageHole,
  spellDamageAmountForTarget,
  spellDamageByTypeForTarget,
  spellDamageHole,
  spellDamageTypeChoiceHole,
  spellDamageTypes,
  spellHealingRollHole,
  spellRollModifierSkillChoiceHole,
  spellRollModifierSkillChoiceHoleId,
  spellSavingThrowOutcomeHole,
  spellSavingThrowOutcomeHoleId,
  spellSavingThrowTargeting,
  spellScalarBuffRollHole,
  spellTargetAllocationHole,
  spellTargetAllocationHoleId,
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  spellTargetListHoleId,
  supportedSpellInvocationMatchesRef,
  supportedSpellInvocationRef,
  validatePreparedSlotSpellDamageGroups,
  validateScalarBuffTemporaryHitPointsFill,
  validateSpellBurstDamageFill,
  validateSpellDamageFill,
  validateSpellHealingFill,
  validateSpellTargetAllocation,
  validateSpellTargetList,
} from "./battle-reducer/spells-holes-fills.ts";
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
const BATTLE_SURFACE_SKILLS = SURFACE_SKILLS satisfies ReadonlyArray<Skill>;
type CriticalHitThreshold = (typeof CRITICAL_HIT_THRESHOLDS)[number];
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
export type SpellConditionEscape =
  | {
      readonly kind: "abilityCheck";
      readonly ability: "str";
      readonly skill: "athletics";
    }
  | {
      readonly kind: "targetDamagedByCasterOrAlly";
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
      readonly kind: "d20RollModifier";
      readonly on: readonly BattleD20RollModifierKind[];
      readonly delta: BattleD20RollModifierDelta;
      readonly skill: Skill | null;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "attackerTypeScopedAttackRollAgainstSelf";
      readonly mode: "disadvantage";
      readonly attackerCreatureTypes: readonly CreatureType[];
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "visibleAttackRollAgainstSelf";
      readonly mode: AttackRollMode;
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
      readonly kind: "heldLight";
      readonly brightRadiusFeet: MovementFeet;
      readonly dimAdditionalFeet: MovementFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    });
export type BattleConcentration = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly effectKind: "spellEffect" | "readiedSpell";
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
type BattleAttackHostSubject =
  | Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    >
  | Extract<
      BattleSubject,
      { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
    >
  | Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    >;
type BattleAttackDamagePrefixFill = Extract<
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
};
type BattlePendingAttackDamageReduction = {
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
type AttackDamageReductionZeroDamageRedirectAvailableOffer = {
  readonly reactorId: CombatantId;
  readonly unitId: UnitRecord["id"];
  readonly label: string;
  readonly redirect: AttackDamageReductionZeroDamageRedirectOffer;
};
export type BattleAttackKindForRedirect = "melee" | "ranged";
type AttackDamageReductionRedirectTargetGate = NonNullable<
  Extract<
    ReactionRollOrDamageReductionProfile,
    { readonly kind: "attackDamageReduction" }
  >["zeroDamageRedirect"]
>["targetGate"];
type AttackDamageReductionZeroDamageRedirectOffer = {
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
type AttackDamageReductionZeroDamageRedirectSelection = {
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
      readonly kind: "opportunityAttack";
    }
);
type BattleAttackDamageContinuation = Extract<
  BattleInterruptedProcedure,
  { readonly kind: "attackDamage" }
>;
type BattleAttackDamageContinuationWithoutConcentration = Omit<
  BattleAttackDamageContinuation,
  "concentrationSavingThrow"
> & {
  readonly concentrationSavingThrow?: never;
};
type BattleReactionModifierChoice =
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
type BattleAttackDamageEvent =
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
type BattleReactionProcedureModifierChoice = {
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
    })
  | (BattleReactionFrameWithContinuationBase & {
      readonly trigger: "opportunityAttack";
      readonly moverId: CombatantId;
      readonly threats: readonly BattleOpportunityAttackThreat[];
    });
type BattleInterruptFrame =
  | { readonly kind: "reaction"; readonly frame: BattleReactionFrame }
  | BattleReplayContinuationFrame
  | BattleAttackDamageContinuationConcentrationFrame;
type BattleReactionInterruptFrame = Extract<
  BattleInterruptFrame,
  { readonly kind: "reaction" }
>;
type BattleReplayContinuationFrame = {
  readonly kind: "replayContinuation";
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
  readonly suppressedReactionTrigger: BattleReactionTrigger;
};
type BattleAttackDamageContinuationConcentrationFrame = {
  readonly kind: "attackDamageContinuationConcentration";
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly suppressedReactionTrigger: BattleReactionTrigger;
};
type BattleReactionFrameInput = BattleReactionFrame extends infer T
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
const BATTLE_ATTACK_RANGE_BANDS = ["normal", "long"] as const;
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
      readonly kind: "grappleTargetWithinReach";
      readonly grapplerId: CombatantId;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "sneakAttackAllyWithin5FeetOfTarget";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
      readonly allyId: CombatantId;
    };
export type BattleResolvedMovement = {
  readonly moverId: CombatantId;
  readonly speedKind: BattleMovementSpeedKind;
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly spendsTurnMovement: boolean;
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
export function isPreparedDamageSpellSource(
  source: DamageSpellSource,
): source is PreparedDamageSpellSource {
  return source.access.tag === "prepared";
}
export function damageSpellSource(source: DamageSpellSource): DamageSpellSource {
  return isPreparedDamageSpellSource(source)
    ? { access: source.access, resource: source.resource }
    : { access: source.access, resource: source.resource };
}
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
    };
export type SpellPostDamageRiderExpiration = Exclude<
  SpellPostDamageRider,
  { readonly kind: "speedDelta" }
>["expiresAt"];
export type SpellFailedSavePostDamageRider = {
  readonly kind: "nextAttackRollByTarget";
  readonly mode: "disadvantage";
  readonly expiresAt: "endOfTargetNextTurn";
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
};
export type SpellFailedSaveAttackRollEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "visibleAttackRollAgainstSelf" }
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
export function isScalarBuffTargetListInvocation(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "scalarBuff" }
> & {
  readonly targeting: Extract<
    ScalarBuffSpellTargeting,
    { readonly kind: "targetList" }
  >;
} {
  return invocation.targeting.kind === "targetList";
}
export function isTargetListSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is TargetListSpellInvocation {
  return (
    invocation.procedure === "directHitPointRestoration" ||
    (invocation.procedure === "scalarBuff" &&
      invocation.targeting.kind === "targetList") ||
    invocation.procedure === "rollModifier" ||
    invocation.procedure === "damageReduction" ||
    (invocation.procedure === "saveGatedCondition" &&
      invocation.targeting.kind === "targetList") ||
    invocation.procedure === "creatureTypeProtection" ||
    invocation.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  );
}
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
    { readonly kind: "attackerTypeScopedAttackRollAgainstSelf" }
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
    { readonly kind: "singleCombatant" }
  >;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly rangeFeet: MovementFeet;
  readonly attackKind: Extract<SpellAttackKind, "ranged_spell_attack">;
  readonly attackBonus: AttackBonus;
};
// SupportedAttackActionOption is a currently executable option for spending an
// immediate attack made as part of the Attack action. It is narrower than all
export type SupportedSpellInvocation =
  | HeldLightSpellInvocation
  | HeldLightHurlSpellInvocation
  | DamageReductionSpellInvocation
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
      readonly targeting: Extract<
        SpellTargeting,
        { readonly kind: "singleCombatant" }
      >;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
      readonly attackKind: SpellAttackKind;
      readonly attackBonus: AttackBonus;
      readonly postDamageRiders: readonly SpellPostDamageRider[];
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
  | MarkedDamageRiderSpellInvocation
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
      | "rollModifier"
      | "creatureTypeProtection"
      | "conditionImmunityAndTurnStartTemporaryHitPoints"
      | "scalarBuff"
      | "weaponDamageRider"
      | "markedDamageRider"
      | "heldLight"
      | "shieldReaction"
      | "saveGatedCondition"
      | "saveGatedAttackRollAdvantage"
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
type WeaponDamageDiceRollChoiceFillEncoded = {
  readonly unitId: string;
  readonly selection: WeaponDamageDiceRollChoiceSelection;
  readonly candidates: readonly [
    { readonly results: readonly [number, ...number[]] },
    { readonly results: readonly [number, ...number[]] },
  ];
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

export type BattleTurnResources = ActionEconomyState & {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
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
const OngoingFeatureExpirationSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("startOfTurn"),
    combatantId: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal("endOfTurn"),
    combatantId: Schema.String,
    round: Schema.Number,
  }),
);
const EndOfTurnOngoingFeatureExpirationSchema = Schema.Struct({
  kind: Schema.Literal("endOfTurn"),
  combatantId: Schema.String,
  round: Schema.Number,
});
const OngoingFeatureSourceSchema = Schema.Struct({
  kind: Schema.Literal("unit"),
  unitId: Schema.String,
});
export const ActiveOngoingFeatureOccurrenceSnapshotSchema: Schema.Schema<
  ActiveOngoingFeatureOccurrenceSnapshotEncoded,
  ActiveOngoingFeatureOccurrenceSnapshotEncoded,
  never
> = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("turnBoundary"),
    expiresAt: OngoingFeatureExpirationSchema,
    source: OngoingFeatureSourceSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("roundExtended"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    maxExpiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    source: OngoingFeatureSourceSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("fixedDuration"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    source: OngoingFeatureSourceSchema,
  }),
);


export type KnockedOutOneHp = Hp & Brand.Brand<"KnockedOutOneHp">;
export const KnockedOutOneHp = Brand.nominal<KnockedOutOneHp>();
export type KnockedOutConditionState = ConditionState &
  Brand.Brand<"KnockedOutConditionState">;
export const KnockedOutConditionState = Brand.nominal<KnockedOutConditionState>();
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
export type BattleSpellTargetAllocation = {
  readonly targetId: CombatantId;
  readonly count: number;
};
export type BattleSpellDamageTypeChoiceHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "damageTypeChoice";
  readonly label: string;
  readonly spell: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" | "damageReduction" }
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
export type BattleSpellTargetListSpatialFact =
  | BattleSpellTargetSpatialFact
  | BattlePointOriginSphereSpellTargetsSpatialFact;
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
        | "conditionImmunityAndTurnStartTemporaryHitPoints";
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
  readonly spellWeaponDamageRiders?: readonly SpellWeaponDamageRider[];
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
        | "saveGatedAttackRollAdvantage";
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
  | BattleSpellDamageTypeChoiceHole
  | BattleSpellTargetAllocationHole
  | BattleSpellTargetListHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleSpellDamageReductionRollHole
  | BattleSpellHealingRollHole
  | BattleSpellSkillChoiceHole
  | BattleSpellSavingThrowOutcomeHole
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

const BattleHoleIdSchema = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("HoleId"),
);
const BattleHoleBaseSchema = {
  holeInstanceKey: Schema.NonEmptyTrimmedString,
  holeId: BattleHoleIdSchema,
  label: Schema.optionalWith(Schema.String, { exact: true }),
} as const;

const BattleRuntimeObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});
const SupportedAttackActionOptionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("weapon"),
    weapon: BattleRuntimeObjectSchema,
    ability: Schema.String,
    abilityModifier: AbilityModifier,
    damageAbilityModifier: Schema.optionalWith(AbilityModifier, {
      exact: true,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("unarmedStrike"),
    effect: Schema.Struct({
      kind: Schema.Literal("damage"),
      damage: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("base"),
          damageType: Schema.Literal("bludgeoning"),
          flat: Schema.Literal(1),
        }),
        Schema.Struct({
          kind: Schema.Literal("authoredReplacement"),
          sourceUnitId: Schema.String,
          dice: Schema.Literal(1),
          dieSize: DamageDieSizeSchema,
          damageType: DamageTypeSchema,
        }),
      ),
    }),
    attackAbility: AbilitySchema,
    attackAbilityModifier: AbilityModifier,
    attackBonus: AttackBonus,
    damageAbilityModifier: AbilityModifier,
    damageBonus: Schema.optionalWith(Schema.Number, { exact: true }),
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    attack: BattleRuntimeObjectSchema,
  }),
);
const PreparedSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("prepared"),
});
const ClassCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("classCantrip"),
});
const SpellSlotInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("spellSlot"),
  slotLevel: SpellSlotLevel,
});
const NoSpellInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("none"),
});
const SupportedHealingSpellInvocationSchema = Schema.Struct({
  access: PreparedSpellAccessSchema,
  resource: SpellSlotInvocationResourceSchema,
  procedure: Schema.Literal("directHitPointRestoration"),
  spell: BattleRuntimeObjectSchema,
  actionCost: Schema.Literal("magicAction", "bonusAction"),
  targeting: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    Schema.Struct({
      kind: Schema.Literal("pointOriginSphereTargetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
      area: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
    }),
  ),
  healing: Schema.Struct({
    expr: BattleRuntimeObjectSchema,
  }),
  rangeFeet: MovementFeet,
});

// Schema.Union preserves the runtime parser but infers a wider structural
// union for nested BattleRuntimeObjectSchema fields than the authored
// SupportedSpellInvocation variants. The variant discriminants below cover
// every SupportedSpellInvocation branch locally, and callers still decode
// through this schema at the boundary.
const SupportedSpellInvocationSchema: Schema.Schema<SupportedSpellInvocation> =
  Schema.Union(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("heldLight"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      light: Schema.Struct({
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
      expiresAt: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("heldLightHurl"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("attackBurstSaveDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      burst: Schema.Struct({
        ability: AbilitySchema,
        dc: DcSourceSchema,
        targeting: Schema.Struct({
          kind: Schema.Literal("primaryTargetOriginEmanation"),
          radiusFeet: MovementFeet,
        }),
        damage: Schema.Struct({
          expr: BattleRuntimeObjectSchema,
          damageType: DamageTypeSchema,
        }),
        successDamage: Schema.Literal("none"),
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("repeatedDamageAllocation"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("repeatedEffectTargetAllocation"),
        repeatedEffectCount: Schema.Number,
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      postDamageRiders: Schema.Array(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("speedDelta"),
            deltaFeet: MovementDeltaFeet,
          }),
          Schema.Struct({
            kind: Schema.Literal("condition"),
            condition: Schema.Literal(...ALL_CONDITIONS),
            expiresAt: Schema.Literal("endOfCasterNextTurn"),
          }),
          Schema.Struct({
            kind: Schema.Literal("opportunityAttackDenied"),
            expiresAt: Schema.Literal("startOfTargetNextTurn"),
          }),
          Schema.Struct({
            kind: Schema.Literal("nextAttackRollAgainstTarget"),
            mode: Schema.Literal("advantage"),
            expiresAt: Schema.Literal("endOfCasterNextTurn"),
          }),
        ),
      ),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      postDamageRiders: Schema.Array(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("speedDelta"),
            deltaFeet: MovementDeltaFeet,
          }),
          Schema.Struct({
            kind: Schema.Literal("condition"),
            condition: Schema.Literal(...ALL_CONDITIONS),
            expiresAt: Schema.Literal("endOfCasterNextTurn"),
          }),
          Schema.Struct({
            kind: Schema.Literal("opportunityAttackDenied"),
            expiresAt: Schema.Literal("startOfTargetNextTurn"),
          }),
          Schema.Struct({
            kind: Schema.Literal("nextAttackRollAgainstTarget"),
            mode: Schema.Literal("advantage"),
            expiresAt: Schema.Literal("endOfCasterNextTurn"),
          }),
        ),
      ),
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
      ),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        Schema.Struct({
          kind: Schema.Literal("nextAttackRollByTarget"),
          mode: Schema.Literal("disadvantage"),
          expiresAt: Schema.Literal("endOfTargetNextTurn"),
        }),
      ),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("chainedSpellAttackDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      rangeFeet: MovementFeet,
      leapRangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
      ),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        Schema.Struct({
          kind: Schema.Literal("nextAttackRollByTarget"),
          mode: Schema.Literal("disadvantage"),
          expiresAt: Schema.Literal("endOfTargetNextTurn"),
        }),
      ),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedCondition"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
      ),
      targetCreatureTypes: Schema.NullOr(Schema.Array(Schema.String)),
      effect: Schema.Struct({
        condition: Schema.Literal(...ALL_CONDITIONS),
        expiresAt: Schema.Union(
          Schema.Literal("endOfCasterNextTurn", "concentration"),
          Schema.Struct({
            kind: Schema.Literal("duration"),
            durationTicks: BattleRuntimeObjectSchema,
          }),
        ),
        escape: Schema.NullOr(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("abilityCheck"),
              ability: Schema.Literal("str"),
              skill: Schema.Literal("athletics"),
            }),
            Schema.Struct({
              kind: Schema.Literal("targetDamagedByCasterOrAlly"),
            }),
          ),
        ),
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedAttackRollAdvantage"),
      spell: BattleRuntimeObjectSchema,
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
      ),
      effect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("damageReduction"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      amount: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(4),
      }),
      expiresAt: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("scalarBuff"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction", "bonusAction"),
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("self"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
      ),
      effect: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("temporaryHitPoints"),
          amount: Schema.Struct({
            expr: BattleRuntimeObjectSchema,
          }),
        }),
        Schema.Struct({
          kind: Schema.Literal("activeEffect"),
          activeEffect: BattleRuntimeObjectSchema,
        }),
      ),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal(
        "conditionImmunityAndTurnStartTemporaryHitPoints",
      ),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      activeEffects: Schema.Tuple(
        BattleRuntimeObjectSchema,
        BattleRuntimeObjectSchema,
      ),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: Schema.Union(
        PreparedSpellAccessSchema,
        ClassCantripSpellAccessSchema,
      ),
      resource: Schema.Union(
        SpellSlotInvocationResourceSchema,
        NoSpellInvocationResourceSchema,
      ),
      procedure: Schema.Literal("rollModifier"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      effect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
      saveGate: Schema.NullOr(
        Schema.Struct({
          ability: AbilitySchema,
          dc: DcSourceSchema,
        }),
      ),
      skillChoices: Schema.NullOr(
        Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
      ),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("creatureTypeProtection"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      activeEffect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("weaponDamageRider"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("cast"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      damage: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
      expiresAt: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("transfer"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      damage: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
      activeEffect: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("persistentArmorEffect"),
      spell: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
      activeEffect: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("shieldReaction"),
      spell: BattleRuntimeObjectSchema,
      armorClassBonus: Schema.Number,
      negatedSpellIds: Schema.Array(Schema.String),
    }),
    SupportedHealingSpellInvocationSchema,
  ) as unknown as Schema.Schema<SupportedSpellInvocation>;

export const BattleHoleSchema = Schema.Union(
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("targetChoice"),
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.optionalWith(Schema.Boolean, {
      exact: true,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("damageTypeChoice"),
    spell: SupportedSpellInvocationSchema,
    choices: Schema.Array(DamageTypeSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellTargetAllocation"),
    spell: SupportedSpellInvocationSchema,
    allocationCount: Schema.Number,
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellTargetList"),
    spell: SupportedSpellInvocationSchema,
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Number,
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    attack: SupportedAttackActionOptionSchema,
    attackBonus: AttackBonus,
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
    ongoingFeatureActivations: Schema.optionalWith(
      Schema.Array(
        Schema.Struct({
          unitId: Schema.String,
          label: Schema.String,
          rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
        }),
      ),
      { exact: true },
    ),
    missToHitReplacements: Schema.optionalWith(
      Schema.Array(
        Schema.Struct({
          unitId: Schema.String,
          label: Schema.String,
        }),
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    spell: SupportedSpellInvocationSchema,
    attackBonus: AttackBonus,
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
    missToHitReplacements: Schema.optionalWith(
      Schema.Array(
        Schema.Struct({
          unitId: Schema.String,
          label: Schema.String,
        }),
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    attack: SupportedAttackActionOptionSchema,
    critical: Schema.Boolean,
    attackDamageRiders: Schema.optionalWith(
      Schema.Array(
        Schema.Struct({
          attackerId: Schema.String,
          unitId: Schema.String,
          label: Schema.String,
          damage: Schema.Struct({
            dice: Schema.Number,
            dieSize: Schema.Number,
            damageType: Schema.String,
          }),
        }),
      ),
      { exact: true },
    ),
    spellWeaponDamageRiders: Schema.optionalWith(
      Schema.Array(BattleRuntimeObjectSchema),
      { exact: true },
    ),
    spellMarkedDamageRiders: Schema.optionalWith(
      Schema.Array(BattleRuntimeObjectSchema),
      { exact: true },
    ),
    weaponDamageDiceRollChoiceUnitIds: Schema.optionalWith(
      Schema.Array(Schema.String),
      { exact: true },
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spell: SupportedSpellInvocationSchema,
    critical: Schema.Boolean,
    spellMarkedDamageRiders: Schema.optionalWith(
      Schema.Array(BattleRuntimeObjectSchema),
      { exact: true },
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spellDamageReduction: Schema.Struct({
      sourceSpellId: Schema.String,
      sourceCombatantId: CombatantId,
      targetId: CombatantId,
      damageType: DamageTypeSchema,
      amount: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(4),
      }),
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spell: SupportedSpellInvocationSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("skillChoice"),
    label: Schema.String,
    spell: SupportedSpellInvocationSchema,
    choices: Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spell: SupportedSpellInvocationSchema,
    ability: Schema.String,
    dc: BattleRuntimeObjectSchema,
    areaChoices: Schema.Array(
      Schema.Struct({
        originAnchorId: CombatantId,
        affectedTargetIds: Schema.Array(CombatantId),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    unitFeature: BattleRuntimeObjectSchema,
    ability: AbilitySchema,
    dc: DcSourceSchema,
    targetIds: Schema.Array(CombatantId),
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    unitFeature: BattleRuntimeObjectSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("deathSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("statBlockRechargeRoll"),
    label: Schema.String,
    combatantId: CombatantId,
    rechargeTargets: Schema.Array(BattleRuntimeObjectSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("concentrationSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
    dc: DifficultyClass,
    damageAmount: DamageAmount,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("reactionDecision"),
    label: Schema.String,
    trigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
    eligibleReactors: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("movement"),
    label: Schema.String,
    actorId: CombatantId,
    movementBudgetFeet: MovementFeet,
    speedKinds: Schema.Array(
      Schema.Struct({
        kind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
        movementBudgetFeet: MovementFeet,
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("abilityCheck"),
    label: Schema.String,
    ability: Schema.String,
    skill: Schema.Literal("stealth", "perception", "athletics"),
    dc: DifficultyClass,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("grappleOutcome"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    dc: DifficultyClass,
    mode: Schema.Literal("grappleSave", "escapeCheck"),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackDamageDisposition"),
    label: Schema.String,
    attackerId: CombatantId,
    targetId: CombatantId,
    choices: Schema.Array(
      Schema.Union(
        Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
        Schema.Struct({ kind: Schema.Literal("knockOut") }),
        Schema.Struct({
          kind: Schema.Literal("zeroHitPointReplacement"),
          unitId: Schema.String,
        }),
      ),
    ),
  }),
);

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
export type SpellDamageReductionRoll = Omit<SpellDamageReductionFill, "roll"> & {
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
      readonly kind: "targetChoice";
      readonly holeId: BattleHoleId;
      readonly value: CombatantId;
      readonly spatialFacts?: readonly BattleTargetSpatialFact[];
    }
  | {
      readonly kind: "spellTargetAllocation";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly allocations: readonly BattleSpellTargetAllocation[];
      };
      readonly spatialFacts: readonly Extract<
        BattleTargetSpatialFact,
        { readonly kind: "spellTarget" }
      >[];
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
    }
  | {
      readonly kind: "grappleOutcome";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly succeeded: boolean;
      };
    };

const BattleDieRollResultSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);
const BattleD20DieRollResultSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 20),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);
const BattleAttackRollResultSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.int()),
  naturalD20: BattleD20DieRollResultSchema,
  rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
    exact: true,
  }),
  activatedOngoingFeatureUnitId: Schema.optionalWith(Schema.String, {
    exact: true,
  }),
  missToHitReplacementUnitId: Schema.optionalWith(Schema.String, {
    exact: true,
  }),
});
const BattleRolledDiceGroupSchema = Schema.Struct({
  results: Schema.NonEmptyArray(BattleDieRollResultSchema),
});

type BattleFillEncoded =
  | {
      readonly kind: "targetChoice";
      readonly holeId: string;
      readonly value: string;
      readonly spatialFacts?: readonly (
        | {
            readonly kind: "attackTargetInMeleeReach";
            readonly actorId: string;
            readonly targetId: string;
            readonly attackName: string;
          }
        | {
            readonly kind: "attackTargetInRangedRange";
            readonly actorId: string;
            readonly targetId: string;
            readonly attackName: string;
            readonly rangeBand: BattleAttackRangeBand;
          }
        | {
            readonly kind: "spellTarget";
            readonly casterId: string;
            readonly targetId: string;
            readonly spellId: string;
          }
        | {
            readonly kind: "spellLeapTargetWithinRange";
            readonly previousTargetId: string;
            readonly targetId: string;
            readonly spellId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "spellTargetsInPointOriginSphere";
            readonly casterId: string;
            readonly spellId: string;
            readonly areaId: string;
            readonly radiusFeet: number;
            readonly targetIds: readonly string[];
          }
        | {
            readonly kind: "helpAttackTargetWithin5Feet";
            readonly helperId: string;
            readonly targetEnemyId: string;
          }
        | {
            readonly kind: "meleeRedirectTargetWithin5Feet";
            readonly sourceId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "rangedRedirectTargetWithin60FeetWithoutTotalCover";
            readonly sourceId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "reactionRollOrDamageReductionTargetWithinRange";
            readonly reactorId: string;
            readonly targetId: string;
            readonly unitId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "grappleTargetWithinReach";
            readonly grapplerId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "sneakAttackAllyWithin5FeetOfTarget";
            readonly attackerId: string;
            readonly targetId: string;
            readonly allyId: string;
          }
      )[];
    }
  | {
      readonly kind: "damageTypeChoice";
      readonly holeId: string;
      readonly value: DamageType;
    }
  | {
      readonly kind: "spellTargetAllocation";
      readonly holeId: string;
      readonly value: {
        readonly allocations: readonly {
          readonly targetId: string;
          readonly count: number;
        }[];
      };
      readonly spatialFacts: readonly {
        readonly kind: "spellTarget";
        readonly casterId: string;
        readonly targetId: string;
        readonly spellId: string;
      }[];
    }
  | {
      readonly kind: "spellTargetList";
      readonly holeId: string;
      readonly value: {
        readonly targetIds: readonly string[];
      };
      readonly spatialFacts: readonly (
        | {
            readonly kind: "spellTarget";
            readonly casterId: string;
            readonly targetId: string;
            readonly spellId: string;
          }
        | {
            readonly kind: "spellTargetsInPointOriginSphere";
            readonly casterId: string;
            readonly spellId: string;
            readonly areaId: string;
            readonly radiusFeet: number;
            readonly targetIds: readonly string[];
          }
      )[];
    }
  | {
      readonly kind: "attackRoll";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
        readonly naturalD20: number;
        readonly rollMode?: (typeof ATTACK_ROLL_MODES)[number];
        readonly activatedOngoingFeatureUnitId?: string;
      };
    }
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: string;
      readonly value:
        | {
            readonly area: {
              readonly originAnchorId: string;
              readonly affectedTargetIds: readonly string[];
            };
            readonly outcomes: readonly {
              readonly targetId: string;
              readonly succeeded: boolean;
            }[];
          }
        | {
            readonly outcomes: readonly {
              readonly targetId: string;
              readonly succeeded: boolean;
            }[];
          };
    }
  | {
      readonly kind: "skillChoice";
      readonly holeId: string;
      readonly value: Skill;
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: string;
      readonly selectedAttackDamageRiderUnitIds?: readonly string[];
      readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFillEncoded;
      readonly value: readonly [
        {
          readonly results: readonly [number, ...number[]];
        },
        ...{
          readonly results: readonly [number, ...number[]];
        }[],
      ];
    }
  | {
      readonly kind: "deathSavingThrow";
      readonly holeId: string;
      readonly value: number;
    }
  | {
      readonly kind: "statBlockRechargeRoll";
      readonly holeId: string;
      readonly value: readonly {
        readonly target: {
          readonly section: StatBlockPartSection;
          readonly name: string;
        };
        readonly roll: number;
      }[];
    }
  | {
      readonly kind: "concentrationSavingThrow";
      readonly holeId: string;
      readonly value: {
        readonly succeeded: boolean;
      };
    }
  | {
      readonly kind: "attackDamageDisposition";
      readonly holeId: string;
      readonly value:
        | { readonly kind: "ordinaryDamage" }
        | { readonly kind: "knockOut" }
        | {
            readonly kind: "zeroHitPointReplacement";
            readonly unitId: string;
          };
    }
  | {
      readonly kind: "reactionDecision";
      readonly holeId: string;
      readonly value:
        | {
            readonly kind: "decline";
            readonly reactorId: string;
          }
        | {
            readonly kind: "resolve";
            readonly reactorId: string;
            readonly choice:
              | {
                  readonly kind: "releaseReadiedSpell";
                  readonly readiedSpellCasterId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedMovement";
                  readonly readiedMovementActorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "castTriggeredReactionSpell";
                  readonly invocation: SpellInvocationRefEncoded;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "opportunityAttack";
                  readonly reactorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "reactionRollOrDamageReduction";
                  readonly unitId: string;
                  readonly modifierKind:
                    | "attackRollReduction"
                    | "abilityCheckReduction"
                    | "damageRollReduction"
                    | "attackDamageReduction";
                  readonly fills: readonly BattleFillEncoded[];
                };
          };
    }
  | {
      readonly kind: "movement";
      readonly holeId: string;
      readonly value: {
        readonly speedKind: BattleMovementSpeedKind;
        readonly movementCostFeet: number;
        readonly provokedOpportunityAttacks: readonly {
          readonly reactorId: string;
          readonly attackName: string;
        }[];
      };
    }
  | {
      readonly kind: "abilityCheck";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
      };
    }
  | {
      readonly kind: "grappleOutcome";
      readonly holeId: string;
      readonly value: {
        readonly succeeded: boolean;
      };
    };

export const BattleFillSchema: Schema.Schema<
  BattleFill,
  BattleFillEncoded,
  never
> = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("targetChoice"),
      holeId: BattleHoleIdSchema,
      value: CombatantId,
      spatialFacts: Schema.optionalWith(
        Schema.Array(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("attackTargetInMeleeReach"),
              actorId: CombatantId,
              targetId: CombatantId,
              attackName: Schema.String,
            }),
            Schema.Struct({
              kind: Schema.Literal("attackTargetInRangedRange"),
              actorId: CombatantId,
              targetId: CombatantId,
              attackName: Schema.String,
              rangeBand: Schema.Literal(...BATTLE_ATTACK_RANGE_BANDS),
            }),
            Schema.Struct({
              kind: Schema.Literal("spellTarget"),
              casterId: CombatantId,
              targetId: CombatantId,
              spellId: Schema.String,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellLeapTargetWithinRange"),
              previousTargetId: CombatantId,
              targetId: CombatantId,
              spellId: Schema.String,
              rangeFeet: MovementFeet,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellTargetsInPointOriginSphere"),
              casterId: CombatantId,
              spellId: Schema.String,
              areaId: Schema.String,
              radiusFeet: MovementFeet,
              targetIds: Schema.Array(CombatantId),
            }),
            Schema.Struct({
              kind: Schema.Literal("helpAttackTargetWithin5Feet"),
              helperId: CombatantId,
              targetEnemyId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal("meleeRedirectTargetWithin5Feet"),
              sourceId: CombatantId,
              targetId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal(
                "rangedRedirectTargetWithin60FeetWithoutTotalCover",
              ),
              sourceId: CombatantId,
              targetId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal(
                "reactionRollOrDamageReductionTargetWithinRange",
              ),
              reactorId: CombatantId,
              targetId: CombatantId,
              unitId: Schema.String,
              rangeFeet: MovementFeet,
            }),
            Schema.Struct({
              kind: Schema.Literal("grappleTargetWithinReach"),
              grapplerId: CombatantId,
              targetId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal("sneakAttackAllyWithin5FeetOfTarget"),
              attackerId: CombatantId,
              targetId: CombatantId,
              allyId: CombatantId,
            }),
          ),
        ),
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("spellTargetAllocation"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        allocations: Schema.Array(
          Schema.Struct({
            targetId: CombatantId,
            count: Schema.Number.pipe(Schema.int(), Schema.greaterThan(0)),
          }),
        ),
      }),
      spatialFacts: Schema.Array(
        Schema.Struct({
          kind: Schema.Literal("spellTarget"),
          casterId: CombatantId,
          targetId: CombatantId,
          spellId: Schema.String,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("spellTargetList"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        targetIds: Schema.Array(CombatantId),
      }),
      spatialFacts: Schema.Array(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("spellTarget"),
            casterId: CombatantId,
            targetId: CombatantId,
            spellId: Schema.String,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellTargetsInPointOriginSphere"),
            casterId: CombatantId,
            spellId: Schema.String,
            areaId: Schema.String,
            radiusFeet: MovementFeet,
            targetIds: Schema.Array(CombatantId),
          }),
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("attackRoll"),
      holeId: BattleHoleIdSchema,
      value: BattleAttackRollResultSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("damageTypeChoice"),
      holeId: BattleHoleIdSchema,
      value: DamageTypeSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("savingThrowOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          area: Schema.Struct({
            originAnchorId: CombatantId,
            affectedTargetIds: Schema.Array(CombatantId),
          }),
          outcomes: Schema.Array(
            Schema.Struct({
              targetId: CombatantId,
              succeeded: Schema.Boolean,
            }),
          ),
        }),
        Schema.Struct({
          outcomes: Schema.Array(
            Schema.Struct({
              targetId: CombatantId,
              succeeded: Schema.Boolean,
            }),
          ),
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("skillChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal(...BATTLE_SURFACE_SKILLS),
    }),
    Schema.Struct({
      kind: Schema.Literal("rolledDice"),
      holeId: BattleHoleIdSchema,
      selectedAttackDamageRiderUnitIds: Schema.optionalWith(
        Schema.Array(Schema.String),
        { exact: true },
      ),
      weaponDamageDiceRollChoice: Schema.optionalWith(
        Schema.Struct({
          unitId: Schema.String,
          selection: Schema.Literal("first", "second"),
          candidates: Schema.Tuple(
            BattleRolledDiceGroupSchema,
            BattleRolledDiceGroupSchema,
          ),
        }),
        { exact: true },
      ),
      value: Schema.NonEmptyArray(BattleRolledDiceGroupSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("deathSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: BattleD20DieRollResultSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("statBlockRechargeRoll"),
      holeId: BattleHoleIdSchema,
      value: Schema.Array(
        Schema.Struct({
          target: Schema.Struct({
            section: Schema.Literal(
              "actions",
              "bonusActions",
              "reactions",
              "legendaryActions",
            ),
            name: Schema.String,
          }),
          roll: BattleDieRollResultSchema,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("concentrationSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        succeeded: Schema.Boolean,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("attackDamageDisposition"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
        Schema.Struct({ kind: Schema.Literal("knockOut") }),
        Schema.Struct({
          kind: Schema.Literal("zeroHitPointReplacement"),
          unitId: Schema.String,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("reactionDecision"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("decline"),
          reactorId: CombatantId,
        }),
        Schema.Struct({
          kind: Schema.Literal("resolve"),
          reactorId: CombatantId,
          choice: Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedSpell"),
              readiedSpellCasterId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedMovement"),
              readiedMovementActorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("castTriggeredReactionSpell"),
              invocation: SpellInvocationRefSchema,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("opportunityAttack"),
              reactorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("reactionRollOrDamageReduction"),
              unitId: BattleSubjectTextSchema,
              modifierKind: Schema.Literal(
                "attackRollReduction",
                "abilityCheckReduction",
                "damageRollReduction",
                "attackDamageReduction",
              ),
              fills: Schema.Array(BattleFillSchema),
            }),
          ),
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("movement"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
        movementCostFeet: MovementFeet,
        provokedOpportunityAttacks: Schema.Array(
          Schema.Struct({
            reactorId: CombatantId,
            attackName: Schema.String,
          }),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("abilityCheck"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        total: Schema.Number.pipe(Schema.int()),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("grappleOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        succeeded: Schema.Boolean,
      }),
    }),
  ),
).annotations({ identifier: "BattleFill" });

export type BattleResolutionInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};
export type BattleResolutionInputForSubject<TSubject extends BattleSubject> = Omit<
  BattleResolutionInput,
  "subject"
> & {
  readonly subject: TSubject;
};
type AttackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "attack" }>
> & {
  readonly replayingInterruptedProcedure?: boolean;
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  readonly pendingAttackDamageReductions?:
    | readonly BattlePendingAttackDamageReduction[]
    | undefined;
};
type MultiattackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "multiattack" }
  >
>;
type OffHandAttackBattleResolutionInput = BattleResolutionInputForSubject<
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
};
type StatBlockBonusActionOptionBattleResolutionInput =
  BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "bonusAction";
        readonly action: "statBlockActionOption";
      }
    >
  >;
type HideBattleResolutionInput = BattleResolutionInputForSubject<
  | ActionHideSubject
  | (BonusActionStandardActionSubject & { readonly action: "hide" })
>;
type BonusActionStandardActionBattleResolutionInput =
  BattleResolutionInputForSubject<BonusActionStandardActionSubject>;
type SearchBattleResolutionInput =
  BattleResolutionInputForSubject<ActionSearchSubject>;
type GrappleBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "grapple" }>
>;
type EscapeGrappleBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "escapeGrapple" }
  >
>;
type EscapeSpellRestraintBattleResolutionInput =
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
};
export type BonusActionSpellBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "bonusActionSpell" }>
> & {
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
};
type UnitFeatureBattleResolutionInput = BattleResolutionInputForSubject<
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

export type BattleSnapshot = {
  readonly battleId: BattleId;
  readonly round: RoundType;
  readonly currentActorId: CombatantId;
  readonly turnOrder: readonly CombatantId[];
  readonly combatants: readonly BattleCreatureSnapshot[];
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

const BattleCreatureZeroHpLifecycleSnapshotSchema = Schema.Union(
  Schema.Struct({
    policy: Schema.Literal("diesAtZeroHp"),
    dead: Schema.Boolean,
  }),
  Schema.Struct({
    policy: Schema.Literal("usesDeathSavingThrows"),
    deathSaves: Schema.Struct({
      successes: Schema.Literal(0, 1, 2, 3),
      failures: Schema.Literal(0, 1, 2, 3),
    }),
    stable: Schema.Boolean,
    dead: Schema.Boolean,
  }),
);

const BattleActionRestrictionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("none") }),
  Schema.Struct({
    kind: Schema.Literal("exclude"),
    actions: Schema.NonEmptyArray(Schema.Literal(...STANDARD_ACTION_KINDS)),
  }),
);

const RuntimeActionResourceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("turn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("unit"),
    sourceOwnerId: Schema.String,
    sourceUnitId: Schema.String,
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("statBlockMultiattack"),
    sourceOwnerId: Schema.String,
    attackPart: Schema.Struct({
      section: Schema.Literal("actions"),
      name: Schema.String,
    }),
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("classFeatureExtraAttack"),
    sourceOwnerId: Schema.String,
    sourceUnitId: Schema.String,
    restriction: BattleActionRestrictionSchema,
  }),
);

const BattleTurnSnapshotSchema = Schema.Struct({
  actionResources: Schema.Array(RuntimeActionResourceSchema),
  bonusActionAvailable: Schema.Boolean,
  spellSlotExpendedThisTurn: Schema.Boolean,
  attackRollMadeThisTurn: Schema.Boolean,
  attackDamageRidersUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      unitId: Schema.String,
    }),
  ),
  weaponDamageDiceRollChoicesUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      unitId: Schema.String,
    }),
  ),
  lightWeaponAttackMade: Schema.optionalWith(
    Schema.Struct({ weaponItemId: Schema.String }),
    { exact: true },
  ),
  dashMovementBonusFeet: Schema.Number,
  disengaged: Schema.Boolean,
});

const BattleCharacterResourceSnapshotSchema = Schema.Union(
  Schema.Struct({
    unitId: Schema.String,
    usage: Schema.Literal("unlimited"),
    usedThisTurn: Schema.Boolean,
  }),
  Schema.Struct({
    unitId: Schema.String,
    usage: Schema.Literal("limited"),
    usesRemaining: Schema.Number,
    usedThisTurn: Schema.Boolean,
  }),
);

const StatBlockPartKeySchema = Schema.Struct({
  section: Schema.Literal(
    "actions",
    "bonusActions",
    "reactions",
    "legendaryActions",
  ),
  name: Schema.String,
});

const StatBlockLimitedUseSnapshotSchema = Schema.Union(
  Schema.Struct({
    key: StatBlockPartKeySchema,
    kind: Schema.Literal("daily"),
    usesMax: Schema.Number,
    usesRemaining: Schema.Number,
  }),
  Schema.Struct({
    key: StatBlockPartKeySchema,
    kind: Schema.Literal("recharge"),
    minimumRoll: Schema.Number,
    available: Schema.Boolean,
  }),
  Schema.Struct({
    key: StatBlockPartKeySchema,
    kind: Schema.Literal("recharge_after_rest"),
    available: Schema.Boolean,
  }),
);

const StatBlockResourceSnapshotSchema = Schema.Struct({
  legendaryActions: Schema.Union(
    Schema.Struct({
      usesMax: Schema.Number,
      usesRemaining: Schema.Number,
    }),
    Schema.Null,
  ),
  limitedUses: Schema.Array(StatBlockLimitedUseSnapshotSchema),
});

const BattleCreatureOriginSnapshotSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("character"),
    characterId: Schema.String,
    resources: Schema.Array(BattleCharacterResourceSnapshotSchema),
    spellcasting: Schema.Union(
      Schema.Struct({
        spellSlots: Schema.Array(
          Schema.Struct({
            spellLevel: SpellSlotLevel,
            count: Schema.Number,
            expended: Schema.Number,
          }),
        ),
      }),
      Schema.Null,
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlock"),
    statBlockId: Schema.String,
    resources: StatBlockResourceSnapshotSchema,
  }),
);

const BattleCreatureSnapshotSchema = Schema.Struct({
  combatantId: CombatantId,
  displayName: Schema.String,
  initiative: Schema.Number,
  side: BattleCombatantSide,
  origin: BattleCreatureOriginSnapshotSchema,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
  armorClass: Schema.Number,
  size: Schema.String,
  zeroHpLifecycle: BattleCreatureZeroHpLifecycleSnapshotSchema,
  conditions: Schema.Array(Schema.Literal(...ALL_CONDITIONS)),
  concentrating: Schema.Boolean,
  dodging: Schema.Boolean,
  reactionAvailable: Schema.Boolean,
  movement: Schema.Struct({
    speedFeet: Schema.Number,
    spentFeet: Schema.Number,
    remainingFeet: Schema.Number,
    speedKinds: Schema.Array(
      Schema.Struct({
        kind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
        speedFeet: Schema.Number,
        remainingFeet: Schema.Number,
      }),
    ),
  }),
});

const AvailableBattleActSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  label: Schema.String,
  summary: Schema.String,
  initialHoles: Schema.Array(BattleHoleSchema),
});

const BattleReadiedSpellSnapshotSchema = Schema.Struct({
  casterId: CombatantId,
  invocation: SupportedSpellInvocationSchema,
  trigger: Schema.Literal(...BATTLE_READIED_SPELL_TRIGGERS),
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleReadiedMovementSnapshotSchema = Schema.Struct({
  actorId: CombatantId,
  trigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleHelpAttackSnapshotSchema = Schema.Struct({
  helperId: CombatantId,
  allyId: CombatantId,
  targetEnemyId: CombatantId,
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleReactionModifierChoiceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal(
      "attackRollReduction",
      "abilityCheckReduction",
      "damageRollReduction",
    ),
    unitId: Schema.String,
    label: Schema.String,
    reduction: Schema.Struct({
      kind: Schema.Literal("rolled"),
      dice: Schema.Literal(1),
      flatModifier: Schema.Number,
      dieSize: Schema.Literal(6, 8, 10, 12),
      spends: Schema.Struct({
        resourceUnitId: Schema.String,
        amount: Schema.Literal(1),
      }),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackDamageReduction"),
    unitId: Schema.String,
    label: Schema.String,
    reduction: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("halfDamage"),
      }),
      Schema.Struct({
        kind: Schema.Literal("rolled"),
        flatModifier: Schema.Number,
        dieSize: Schema.Literal(10),
      }),
    ),
    zeroDamageRedirect: Schema.optionalWith(
      Schema.Struct({
        spends: Schema.Struct({
          resourceUnitId: Schema.String,
          amount: Schema.Literal(1),
        }),
        saveAbility: Schema.Literal("dex"),
        saveDc: DifficultyClass,
        damageDice: Schema.Struct({
          dice: Schema.Literal(2),
          dieSize: DamageDieSizeSchema,
        }),
        damageAbilityModifier: AbilityModifier,
        attackKind: Schema.Literal("melee", "ranged"),
        targetGate: Schema.Struct({
          melee: Schema.Literal("visibleWithin5Feet"),
          ranged: Schema.Literal("visibleWithin60FeetWithoutTotalCover"),
        }),
        originalDamageType: DamageTypeSchema,
      }),
      { exact: true },
    ),
  }),
);

const BattleReactionProcedureChoiceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("releaseReadiedSpell"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
    readiedSpellCasterId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("releaseReadiedMovement"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
    readiedMovementActorId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("castTriggeredReactionSpell"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
    invocation: SpellInvocationRefSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("opportunityAttack"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("reactionRollOrDamageReduction"),
    reactorId: CombatantId,
    choice: BattleReactionModifierChoiceSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
);

const BattlePendingReactionSnapshotSchema = Schema.Struct({
  trigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
  decisionHole: BattleHoleSchema,
  choices: Schema.Array(BattleReactionProcedureChoiceSchema),
  stackDepth: Schema.Number,
});

export const BattleSnapshotSchema = Schema.Struct({
  battleId: BattleId,
  round: Schema.Number,
  currentActorId: CombatantId,
  turnOrder: Schema.Array(CombatantId),
  combatants: Schema.Array(BattleCreatureSnapshotSchema),
  acts: Schema.Array(AvailableBattleActSchema),
  turn: BattleTurnSnapshotSchema,
  readiedResponses: Schema.Struct({
    spells: Schema.Array(BattleReadiedSpellSnapshotSchema),
    movements: Schema.Array(BattleReadiedMovementSnapshotSchema),
  }),
  helpAttackMarkers: Schema.Array(BattleHelpAttackSnapshotSchema),
  pendingReaction: Schema.Union(
    BattlePendingReactionSnapshotSchema,
    Schema.Null,
  ),
});

const INITIAL_ROUND: RoundType = Round(1);
const INITIAL_TURN_RESOURCES = resetTurnActionEconomy({
  actionResources: [],
  currentHasBonusAction: false,
  spellSlotExpendedThisTurn: false,
  attackRollMadeThisTurn: false,
  attackDamageRidersUsedThisTurn: [],
  weaponDamageDiceRollChoicesUsedThisTurn: [],
  dashMovementBonusFeet: movementFeet(0),
  disengaged: false,
});
export const ATTACK_TARGET_HOLE_ID = holeId("battle:attack:target");
export const ATTACK_ROLL_HOLE_ID = holeId("battle:attack:roll");
export const ATTACK_DAMAGE_DISPOSITION_HOLE_ID = holeId(
  "battle:attack:damage-disposition",
);
export const ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:attack:target");
export const ATTACK_ROLL_HOLE_INSTANCE = holeInstanceKey("battle:attack:roll");
export const ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE = holeInstanceKey(
  "battle:attack:damage-disposition",
);
const SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS = [
  "disengage",
  "hide",
] as const satisfies ReadonlyArray<StandardActionKind>;
type SupportedStatBlockBonusActionStandardAction =
  (typeof SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS)[number];
const ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS = [
  "dash",
  "disengage",
  "dodge",
  "help",
  "hide",
  "influence",
  "magic",
  "ready",
  "search",
  "study",
  "utilize",
] as const satisfies readonly [StandardActionKind, ...StandardActionKind[]];
export type StatBlockMultiattackActionResource = Extract<
  RuntimeActionResource,
  { readonly source: "statBlockMultiattack" }
>;
type ClassFeatureExtraAttackActionResource = Extract<
  RuntimeActionResource,
  { readonly source: "classFeatureExtraAttack" }
>;
const HELP_ATTACK_ALLY_HOLE_ID = holeId("battle:help-attack:ally");
const HELP_ATTACK_TARGET_HOLE_ID = holeId("battle:help-attack:target");
const HELP_ATTACK_ALLY_HOLE_INSTANCE = holeInstanceKey(
  "battle:help-attack:ally",
);
const HELP_ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:help-attack:target",
);
export const DEATH_SAVING_THROW_HOLE_ID = holeId("battle:end-turn:death-saving-throw");
export const DEATH_SAVING_THROW_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:death-saving-throw",
);
export const STAT_BLOCK_RECHARGE_ROLL_HOLE_ID = holeId(
  "battle:end-turn:stat-block-recharge-roll",
);
export const STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:stat-block-recharge-roll",
);
export const CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX =
  "battle:concentration:saving-throw";
const REACTION_DECISION_HOLE_ID = holeId("battle:reaction:decision");
const REACTION_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:reaction:decision",
);
const MOVEMENT_HOLE_ID = holeId("battle:movement");
const MOVEMENT_HOLE_INSTANCE = holeInstanceKey("battle:movement");
export const HIDE_ABILITY_CHECK_HOLE_ID = holeId("battle:hide:stealth-check");
export const HIDE_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:hide:stealth-check",
);
export const SEARCH_TARGET_HOLE_ID = holeId("battle:search:target");
export const SEARCH_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:search:target",
);
export const SEARCH_ABILITY_CHECK_HOLE_ID = holeId(
  "battle:search:perception-check",
);
export const SEARCH_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:search:perception-check",
);
export const GRAPPLE_TARGET_HOLE_ID = holeId("battle:grapple:target");
export const GRAPPLE_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:grapple:target",
);
export const GRAPPLE_OUTCOME_HOLE_ID = holeId("battle:grapple:outcome");
export const GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey(
  "battle:grapple:outcome",
);
export const ESCAPE_GRAPPLE_OUTCOME_HOLE_ID = holeId(
  "battle:escape-grapple:outcome",
);
export const ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey(
  "battle:escape-grapple:outcome",
);
export const ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID = holeId(
  "battle:escape-spell-restraint:athletics-check",
);
export const ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:escape-spell-restraint:athletics-check",
);
const REACTION_MODIFIER_ROLL_HOLE_ID = holeId("battle:reaction:modifier-roll");
const REACTION_MODIFIER_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:reaction:modifier-roll",
);
export const HIDE_DC = difficultyClass(15);

export function startBattle(input: {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
}): Either.Either<BattleState, BattleStateInitIssue> {
  if (input.combatants.length === 0) {
    return battleStateInitIssue("startBattle requires at least one combatant.");
  }

  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const combatant of input.combatants) {
    if (combatants.has(combatant.combatantId)) {
      return battleStateInitIssue(
        `Duplicate combatant id: ${combatant.combatantId}`,
      );
    }
    const positiveHpUnconsciousIssue =
      positiveHpUnconsciousInitIssue(combatant);
    if (positiveHpUnconsciousIssue !== null) {
      return positiveHpUnconsciousIssue;
    }
    combatants.set(
      combatant.combatantId,
      battleCreatureStateFromInit(combatant),
    );
  }
  const hidePrerequisiteIssue = hidePrerequisitesReferenceCombatantsIssue(
    input.hidePrerequisites ?? new Map(),
    combatants,
  );
  if (hidePrerequisiteIssue !== null) return hidePrerequisiteIssue;

  const orderedEntries = input.combatants
    .map((combatant, callerOrder) => ({ combatant, callerOrder }))
    .sort(
      (left, right) =>
        right.combatant.initiative - left.combatant.initiative ||
        left.callerOrder - right.callerOrder,
    )
    .map(({ combatant }) => ({
      creature: combatant.combatantId,
      initiative: combatant.initiative,
    }));
  if (!isNonEmptyReadonlyArray(orderedEntries)) {
    return battleStateInitIssue("startBattle requires at least one combatant.");
  }

  const initiative = createScoredInitiativeStack<CombatantId>(
    orderedEntries,
    INITIAL_ROUND,
  );
  if (Either.isLeft(initiative)) {
    return battleStateInitIssue(initiative.left);
  }
  return Either.right({
    battleId: input.battleId,
    initiative: initiative.right,
    combatants,
    hidePrerequisites: new Map(input.hidePrerequisites ?? []),
    currentTurnResources: INITIAL_TURN_RESOURCES,
    readiedSpells: new Map(),
    readiedMovements: new Map(),
    helpAttacks: [],
    grapples: [],
    interruptStack: [],
    legendaryActionWindow: null,
  });
}

export function addBattleCombatant(input: {
  readonly state: BattleState;
  readonly combatant: BattleCreatureInit;
  readonly tieOrderIndex?: number;
}): Either.Either<BattleState, BattleStateInitIssue> {
  if (input.state.combatants.has(input.combatant.combatantId)) {
    return battleStateInitIssue(
      `Duplicate combatant id: ${input.combatant.combatantId}`,
    );
  }
  const positiveHpUnconsciousIssue = positiveHpUnconsciousInitIssue(
    input.combatant,
  );
  if (positiveHpUnconsciousIssue !== null) {
    return positiveHpUnconsciousIssue;
  }
  const nextCombatants = new Map(input.state.combatants).set(
    input.combatant.combatantId,
    battleCreatureStateFromInit(input.combatant),
  );
  const insertionIndex = combatantInitiativeInsertionIndex(
    input.state,
    input.combatant.initiative,
    input.tieOrderIndex,
  );
  const initiative = insertAtOrderIndex(
    input.state.initiative,
    insertionIndex,
    {
      creature: input.combatant.combatantId,
      initiative: input.combatant.initiative,
    },
  );

  return Either.right({
    ...input.state,
    initiative,
    combatants: nextCombatants,
  });
}

export function removeBattleCombatants(input: {
  readonly state: BattleState;
  readonly combatantIds: readonly CombatantId[];
}): Either.Either<BattleState, BattleStateInitIssue> {
  const removeIds = new Set(input.combatantIds);
  if (removeIds.size === 0) return Either.right(input.state);
  for (const id of removeIds) {
    if (!input.state.combatants.has(id)) {
      return battleStateInitIssue(
        "Cannot remove a combatant that is not in this battle.",
      );
    }
  }
  if (removeIds.size >= input.state.combatants.size) {
    return battleStateInitIssue("Cannot remove every combatant from a battle.");
  }
  const currentRemoved = removeIds.has(currentActorId(input.state));
  const initiativeOption = removeFromInitiative(input.state.initiative, (id) =>
    removeIds.has(id),
  );
  if (Option.isNone(initiativeOption)) {
    return battleStateInitIssue(
      "Cannot remove every combatant from Initiative.",
    );
  }
  const combatants = new Map(
    [...input.state.combatants]
      .filter(([id]) => !removeIds.has(id))
      .map(([id, combatant]) => [
        id,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.filter(
            (effect) => !removeIds.has(effect.sourceCombatantId),
          ),
        },
      ]),
  );
  return Either.right(
    normalizeBattleGrapples({
      ...input.state,
      initiative: initiativeOption.value,
      combatants,
      currentTurnResources: currentRemoved
        ? resetBattleTurnResources(input.state.currentTurnResources)
        : input.state.currentTurnResources,
      hidePrerequisites: new Map(
        [...input.state.hidePrerequisites].filter(([id]) => !removeIds.has(id)),
      ),
      readiedSpells: new Map(
        [...input.state.readiedSpells].filter(([id]) => !removeIds.has(id)),
      ),
      readiedMovements: new Map(
        [...input.state.readiedMovements].filter(([id]) => !removeIds.has(id)),
      ),
      helpAttacks: input.state.helpAttacks.filter(
        (help) =>
          !removeIds.has(help.helperId) &&
          !removeIds.has(help.allyId) &&
          !removeIds.has(help.targetEnemyId),
      ),
      grapples: input.state.grapples.filter(
        (grapple) =>
          !removeIds.has(grapple.grapplerId) &&
          !removeIds.has(grapple.targetId),
      ),
      interruptStack: [],
      legendaryActionWindow:
        input.state.legendaryActionWindow === null ||
        removeIds.has(input.state.legendaryActionWindow.afterTurnActorId)
          ? null
          : input.state.legendaryActionWindow,
    }),
  );
}

export function discoverBattleActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  const actorId = currentActorId(state);
  const hasOpenStatBlockMultiattackDispatch =
    currentActorHasOpenStatBlockMultiattackDispatch(state);
  const acts: AvailableBattleAct[] = hasOpenStatBlockMultiattackDispatch
    ? []
    : [...releaseGrappleActs(state)];
  if (!state.combatants.has(actorId)) {
    return acts;
  }
  const attackActionOptions = attackActionOptionsForActor(
    state,
    actorId,
  ).filter(attackActionOptionIsOrdinaryAttackAction);
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    attackActionOptions.some(
      (attack) => attackTargetChoices(state, actorId, attack).length > 0,
    )
  ) {
    acts.push(
      ...attackActionOptions.flatMap((attack) => {
        const targetHole = attackTargetHole(state, actorId, attack);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "action" as const,
                  actorId,
                  action: "attack" as const,
                  attackName: attackActionOptionName(attack),
                  ...statBlockSubjectPart(attack),
                },
                label: "Attack",
                summary: `Take the Attack action with ${attackActionOptionName(attack)}.`,
                initialHoles: [targetHole],
              },
            ];
      }),
    );
  }
  if (hasOpenStatBlockMultiattackDispatch) {
    acts.push(...movementActs(state, actorId));
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
      label: "End Turn",
      summary:
        "End the current combatant's turn and close pending Multiattack dispatches.",
      initialHoles: [],
    });
    return acts;
  }
  acts.push(...statBlockMultiattackActs(state, actorId));
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "dash")
  ) {
    acts.push(...dashActsForActor(state, actorId));
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "disengage")
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "disengage" },
      label: "Disengage",
      summary: "Prevent Movement from provoking Opportunity Attacks this turn.",
      initialHoles: [],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "dodge")
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "dodge" },
      label: "Dodge",
      summary:
        "Impose Disadvantage on attacks against you until your next turn.",
      initialHoles: [],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "help") &&
    helpAttackAllyChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "helpAttack" },
      label: "Help",
      summary:
        "Help an ally's next attack roll against an enemy within 5 feet.",
      initialHoles: [helpAttackAllyHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "ready")
  ) {
    acts.push(
      ...BATTLE_REACTION_TRIGGERS.map((trigger) => ({
        subject: {
          tag: "action" as const,
          actorId,
          action: "ready" as const,
          readyTrigger: trigger,
        },
        label: "Ready",
        summary: `Prepare a Reaction for ${reactionTriggerLabel(trigger)}.`,
        initialHoles: [],
      })),
    );
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "hide") &&
    canHideInCurrentCircumstances(state, actorId)
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "hide" },
      label: "Hide",
      summary: "Make a Dexterity (Stealth) check to become hidden.",
      initialHoles: [hideAbilityCheckHole()],
    });
  }
  const hiddenTargets = hiddenSearchTargetChoices(state, actorId);
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "search") &&
    hiddenTargets.length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "search" },
      label: "Search",
      summary: "Make a Wisdom (Perception) check to find a hidden creature.",
      initialHoles: [searchTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    !actorHasStatBlockMultiattackActionResource(state, actorId) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    grappleTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "grapple" },
      label: "Grapple",
      summary: "Replace one attack with an Unarmed Strike Grapple.",
      initialHoles: [grappleTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    !actorHasStatBlockMultiattackActionResource(state, actorId) &&
    canSpendEscapeGrappleActionResource(state, actorId) &&
    grappledBy(state, actorId) !== undefined
  ) {
    const grapple = grappledBy(state, actorId);
    if (grapple !== undefined) {
      acts.push({
        subject: { tag: "action", actorId, action: "escapeGrapple" },
        label: "Escape Grapple",
        summary: "Use an action to attempt to end the Grappled condition.",
        initialHoles: [escapeGrappleOutcomeHole(grapple, actorId)],
      });
    }
  }
  for (const effect of spellRestraintEffects(state, actorId)) {
    if (
      combatantCanTakeActions(state.combatants.get(actorId)) &&
      !actorHasStatBlockMultiattackActionResource(state, actorId) &&
      canSpendAction(state.currentTurnResources, "utilize")
    ) {
      acts.push({
        subject: {
          tag: "action",
          actorId,
          action: "escapeSpellRestraint",
          sourceSpellId: spellId(effect.sourceSpellId),
          sourceCombatantId: effect.sourceCombatantId,
        },
        label: `Escape ${effect.sourceSpellId}`,
        summary:
          "Use an action to attempt to end a spell-imposed Restrained condition.",
        initialHoles: [escapeSpellRestraintAbilityCheckHole(state, effect)],
      });
    }
  }
  const offHand = offHandAttackActionOptionForActor(state, actorId);
  if (
    offHand !== undefined &&
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    state.currentTurnResources.currentHasBonusAction &&
    offHandAttackPrerequisiteMet(state, actorId, offHand) &&
    attackTargetChoices(state, actorId, offHand).length > 0
  ) {
    acts.push({
      subject: {
        tag: "bonusAction",
        actorId,
        action: "offHandAttack",
        attackName: attackActionOptionName(offHand),
      },
      label: "Light Property Bonus Action Attack",
      summary: `Make the Light property Bonus Action attack with ${attackActionOptionName(offHand)}.`,
      initialHoles: [attackTargetHole(state, actorId, offHand)],
    });
  }
  acts.push(...bonusActionStandardActionActs(state, actorId));
  acts.push(...statBlockBonusActionOptionActs(state, actorId));
  acts.push(...supportedUnitFeatureActs(state, actorId));
  if (combatantCanTakeActions(state.combatants.get(actorId))) {
    acts.push(...discoverSupportedSpellInvocations(state, actorId));
  }
  acts.push(...movementActs(state, actorId));
  if (standFromProneCostFeet(state, actorId) !== null) {
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "standFromProne" },
      label: "Stand",
      summary: "Spend Movement equal to half Speed and end Prone.",
      initialHoles: [],
    });
  }
  acts.push({
    subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
    label: "End Turn",
    summary: "End the current combatant's turn.",
    initialHoles: [],
  });
  acts.push(
    ...[...state.readiedSpells].map(([casterId, readiedSpell]) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "releaseReadiedSpell" as const,
        readiedSpellCasterId: casterId,
      },
      label: `Release ${readiedSpell.invocation.spell.name}`,
      summary: `Release ${readiedSpell.invocation.spell.name} with a Reaction.`,
      initialHoles: readiedSpellInitialHoles(state, casterId, readiedSpell),
    })),
  );
  acts.push(...discoverLegendaryActionActs(state));

  return acts;
}

function releaseGrappleActs(state: BattleState): readonly AvailableBattleAct[] {
  return state.grapples.map((grapple) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId: grapple.grapplerId,
      command: "releaseGrapple" as const,
      targetId: grapple.targetId,
    },
    label: "Release Grapple",
    summary: "Release a grappled target without spending an action.",
    initialHoles: [],
  }));
}

function movementActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const movementHoleForActor = movementHole(state, actorId);
  if (
    !combatantCanMoveInState(state, actorId) ||
    state.combatants.size <= 1 ||
    !movementHoleHasRemainingBudget(movementHoleForActor)
  ) {
    return [];
  }

  return [
    {
      subject: { tag: "runtimeCommand", actorId, command: "move" },
      label: "Move",
      summary: "Spend Movement using table-supplied movement cost.",
      initialHoles: [movementHoleForActor],
    },
  ];
}

function dashActsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) return [];
  const speedKinds = representedMovementSpeedKinds(actor);

  return speedKinds.map((speedKind) => ({
    subject: dashSubjectForSpeedKind(actorId, speedKind),
    label: "Dash",
    summary:
      "Gain extra Movement equal to the chosen Speed for the current turn.",
    initialHoles: [],
  }));
}

function dashSubjectForSpeedKind(
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind,
): Extract<BattleSubject, { readonly tag: "action"; readonly action: "dash" }> {
  return { tag: "action", actorId, action: "dash", speedKind };
}

type SupportedStatBlockBonusActionOption = {
  readonly option: Omit<CreatureNamedActionOption, "options"> & {
    readonly options: readonly SupportedStatBlockBonusActionStandardAction[];
  };
  readonly part: StatBlockPartKey;
};

type SupportedStatBlockMultiattack = {
  readonly multiattack: CreatureNamedMultiattack;
  readonly dispatches: readonly StatBlockAttackActionOption[];
};
type SupportedLiteralMultiattackDispatch =
  CreatureNamedMultiattack["dispatches"][number] & {
    readonly count: Extract<
      CreatureNamedMultiattack["dispatches"][number]["count"],
      { readonly kind: "literal" }
    >;
  };

function statBlockMultiattackActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "statBlock" ||
    !combatantCanTakeActions(actor) ||
    !hasTurnActionResource(state.currentTurnResources)
  ) {
    return [];
  }
  const origin = actor.origin;
  return supportedStatBlockMultiattacks(origin.statBlock).flatMap(
    (multiattack) => {
      if (
        !multiattack.dispatches.every((dispatch) =>
          statBlockAttackResourceAvailable(
            origin.statBlock.statBlock,
            origin.resources,
            dispatch,
          ),
        )
      ) {
        return [];
      }
      return [
        {
          subject: {
            tag: "action" as const,
            actorId,
            action: "multiattack" as const,
            multiattackName: multiattack.multiattack.name,
          },
          label: multiattack.multiattack.name,
          summary: `Take the Attack action using ${multiattack.multiattack.name}.`,
          initialHoles: [],
        },
      ];
    },
  );
}

function statBlockBonusActionOptionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "statBlock" ||
    !combatantCanTakeActions(actor) ||
    !state.currentTurnResources.currentHasBonusAction
  ) {
    return [];
  }
  const origin = actor.origin;

  return supportedStatBlockBonusActionOptions(origin.statBlock).flatMap(
    (option) =>
      option.option.options.flatMap((standardAction) => {
        if (
          !statBlockPartLimitedUseAvailable(
            origin.statBlock.statBlock,
            origin.resources,
            option.part,
          )
        ) {
          return [];
        }
        if (
          standardAction === "hide" &&
          !canHideInCurrentCircumstances(state, actorId)
        ) {
          return [];
        }
        return [
          {
            subject: {
              tag: "bonusAction" as const,
              actorId,
              action: "statBlockActionOption" as const,
              optionName: option.option.name,
              standardAction,
            },
            label: option.option.name,
            summary: `Use ${option.option.name} to ${standardActionLabel(standardAction)} as a Bonus Action.`,
            initialHoles:
              standardAction === "hide" ? [hideAbilityCheckHole()] : [],
          },
        ];
      }),
  );
}

function supportedStatBlockMultiattacks(
  statBlock: StatBlockRecord,
): readonly SupportedStatBlockMultiattack[] {
  const actionAttacks = statBlockActionSectionAttackOptions(
    "actions",
    statBlock.statBlock.actions,
  );
  return (
    statBlock.statBlock.actions?.multiattacks?.flatMap((multiattack) => {
      const literalDispatches =
        supportedLiteralMultiattackDispatches(multiattack);
      if (literalDispatches === null) return [];

      const dispatches = literalDispatches.flatMap((dispatch) => {
        const matchingAttacks = actionAttacks.filter(
          (candidate) => candidate.attack.name === dispatch.name,
        );
        const [attack] = matchingAttacks;
        if (attack === undefined || matchingAttacks.length !== 1) return [];
        if (
          dispatch.count.value > 1 &&
          statBlockLimitedUseForPart(statBlock.statBlock, attack.part) !==
            undefined
        ) {
          return [];
        }
        return Array.from({ length: dispatch.count.value }, () => attack);
      });
      const dispatchCount = literalDispatches.reduce(
        (count, dispatch) => count + dispatch.count.value,
        0,
      );
      return dispatches.length === dispatchCount
        ? [{ multiattack, dispatches }]
        : [];
    }) ?? []
  );
}

function supportedLiteralMultiattackDispatches(
  multiattack: CreatureNamedMultiattack,
): readonly SupportedLiteralMultiattackDispatch[] | null {
  if (multiattack.dispatches.length === 0) return null;

  const dispatches = multiattack.dispatches.filter(
    isSupportedLiteralMultiattackDispatch,
  );
  return dispatches.length === multiattack.dispatches.length
    ? dispatches
    : null;
}

function isSupportedLiteralMultiattackDispatch(
  dispatch: CreatureNamedMultiattack["dispatches"][number],
): dispatch is SupportedLiteralMultiattackDispatch {
  return (
    dispatch.count.kind === "literal" &&
    dispatch.count.value >= 1 &&
    Number.isInteger(dispatch.count.value)
  );
}

function supportedStatBlockBonusActionOptions(
  statBlock: StatBlockRecord,
): readonly SupportedStatBlockBonusActionOption[] {
  return (
    statBlock.statBlock.bonusActions?.actionOptions?.flatMap((option) => {
      const supportedOptions = option.options.filter(
        (
          standardAction,
        ): standardAction is SupportedStatBlockBonusActionStandardAction =>
          supportedStatBlockBonusActionStandardAction(standardAction),
      );
      return supportedOptions.length === option.options.length
        ? [
            {
              option: { ...option, options: supportedOptions },
              part: { section: "bonusActions", name: option.name },
            },
          ]
        : [];
    }) ?? []
  );
}

function supportedStatBlockBonusActionStandardAction(
  standardAction: StandardActionKind,
): standardAction is SupportedStatBlockBonusActionStandardAction {
  return SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS.some(
    (supported) => supported === standardAction,
  );
}

export function isStatBlockMultiattackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is StatBlockMultiattackActionResource {
  return (
    resource.source === "statBlockMultiattack" &&
    resource.sourceOwnerId === actorId
  );
}

function isClassFeatureExtraAttackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is ClassFeatureExtraAttackActionResource {
  return (
    resource.source === "classFeatureExtraAttack" &&
    resource.sourceOwnerId === actorId
  );
}

function actorHasStatBlockMultiattackActionResource(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return state.currentTurnResources.actionResources.some((resource) =>
    isStatBlockMultiattackActionResource(resource, actorId),
  );
}

function currentActorHasOpenStatBlockMultiattackDispatch(
  state: BattleState,
): boolean {
  return actorHasStatBlockMultiattackActionResource(
    state,
    currentActorId(state),
  );
}

function actorHasClassFeatureExtraAttackActionResource(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return state.currentTurnResources.actionResources.some((resource) =>
    isClassFeatureExtraAttackActionResource(resource, actorId),
  );
}

function canSpendEscapeGrappleActionResource(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return state.currentTurnResources.actionResources.some(
    (resource) =>
      !isClassFeatureExtraAttackActionResource(resource, actorId) &&
      (resource.source === "turn" ||
        actionRestrictionAllows(resource.restriction, "attack")),
  );
}

function subjectAllowedDuringStatBlockMultiattackDispatch(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  const actorId = currentActorId(state);
  if (
    subject.tag === "runtimeCommand" &&
    subject.actorId === actorId &&
    (subject.command === "endTurn" || subject.command === "move")
  ) {
    return true;
  }
  if (
    subject.tag !== "action" ||
    subject.actorId !== actorId ||
    subject.action !== "attack"
  ) {
    return false;
  }
  return state.currentTurnResources.actionResources.some(
    (resource): boolean =>
      isStatBlockMultiattackActionResource(resource, actorId) &&
      resource.attackPart.name === subject.attackName &&
      resource.attackPart.section === (subject.statBlockSection ?? "actions"),
  );
}

function hasTurnActionResource(state: ActionEconomyState): boolean {
  return state.actionResources.some((resource) => resource.source === "turn");
}

function spendTurnAction<T extends ActionEconomyState>(
  state: T,
): Either.Either<T, "no action resource available"> {
  const turnActionResourceIndex = state.actionResources.findIndex(
    (resource) => resource.source === "turn",
  );
  if (turnActionResourceIndex === -1) {
    return Either.left("no action resource available");
  }

  return Either.right({
    ...state,
    actionResources: state.actionResources.filter(
      (_, index) => index !== turnActionResourceIndex,
    ),
  });
}

function isStatBlockBattleCreatureState(
  combatant: BattleCreatureState | undefined,
): combatant is StatBlockBattleCreatureState {
  return combatant?.origin.kind === "statBlock";
}

function standardActionLabel(
  standardAction: SupportedStatBlockBonusActionStandardAction,
): string {
  return Match.value(standardAction).pipe(
    Match.when("disengage", () => "Disengage"),
    Match.when("hide", () => "Hide"),
    Match.exhaustive,
  );
}

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  return resolveBattleSubjectInternal(input, {});
}

export function resolveBattleSubjectInternal(
  input: BattleResolutionInput,
  options: {
    readonly replayingInterruptedProcedure?: boolean;
    readonly suppressedReactionTrigger?: BattleReactionTrigger;
    readonly pendingAttackDamageReductions?: readonly BattlePendingAttackDamageReduction[];
  },
): BattleResolutionResult {
  if (
    input.state.interruptStack.length > 0 &&
    options.replayingInterruptedProcedure !== true
  ) {
    const activeFrame = currentInterruptFrame(input.state);
    if (activeFrame !== null) {
      if (activeFrame.kind === "attackDamageContinuationConcentration") {
        if (
          !sameBattleSubject(input.subject, activeFrame.continuation.subject)
        ) {
          return invalidResult(
            input.state,
            "staleSubject",
            "Attack damage Concentration save must be resolved before other battle subjects.",
          );
        }
        return resolveAttackDamageContinuationConcentration({
          state: input.state,
          frame: activeFrame,
          subject: input.subject,
          fills: input.fills,
        });
      }
      if (activeFrame.kind === "replayContinuation") {
        if (
          !sameBattleSubject(input.subject, activeFrame.continuation.subject)
        ) {
          return invalidResult(
            input.state,
            "staleSubject",
            "Interrupted attack replay must be resolved before other battle subjects.",
          );
        }
        return resolveReplayContinuation({
          state: input.state,
          frame: activeFrame,
          subject: input.subject,
          fills: input.fills,
        });
      }
      const activeReaction = activeFrame.frame.activeReaction;
      if (
        activeReaction !== undefined &&
        sameBattleSubject(input.subject, activeReaction.subject)
      ) {
        const reactionResult = resolveBattleSubjectInternal(input, {
          replayingInterruptedProcedure: true,
          ...(activeReaction.suppressedReactionTrigger === undefined
            ? {}
            : {
                suppressedReactionTrigger:
                  activeReaction.suppressedReactionTrigger,
              }),
          ...(activeReaction.pendingAttackDamageReductions === undefined
            ? {}
            : {
                pendingAttackDamageReductions:
                  activeReaction.pendingAttackDamageReductions,
              }),
        });
        return reactionResult.tag === "resolved"
          ? completeActiveReactionProcedure(reactionResult.state)
          : reactionResult;
      }
    }
    return invalidResult(
      input.state,
      "staleSubject",
      "A pending Reaction window must be resolved before the interrupted procedure can continue.",
    );
  }

  const actorId = battleSubjectActorId(input.subject);
  if (
    actorId !== currentActorId(input.state) &&
    !isLegendaryAttackSubject(input.subject) &&
    !isReleaseGrappleSubject(input.subject)
  ) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Subject actor is not the current actor.",
    );
  }
  if (
    isLegendaryAttackSubject(input.subject) &&
    !statBlockLegendaryActionWindowIsOpen(input.state, actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Legendary Actions are available only after another creature's turn ends.",
    );
  }

  if (!input.state.combatants.has(actorId)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Subject actor is not in this battle.",
    );
  }
  if (
    currentActorHasOpenStatBlockMultiattackDispatch(input.state) &&
    !subjectAllowedDuringStatBlockMultiattackDispatch(
      input.state,
      input.subject,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Pending Stat Block Multiattack dispatches must be resolved, Movement may be taken between attacks, or the turn must end before other battle subjects.",
    );
  }

  if (
    input.subject.tag === "action" &&
    (input.subject.action === "attack" ||
      input.subject.action === "dash" ||
      input.subject.action === "disengage" ||
      input.subject.action === "dodge" ||
      input.subject.action === "helpAttack" ||
      input.subject.action === "hide" ||
      input.subject.action === "multiattack" ||
      input.subject.action === "ready" ||
      input.subject.action === "search" ||
      input.subject.action === "grapple" ||
      input.subject.action === "escapeGrapple" ||
      input.subject.action === "escapeSpellRestraint") &&
    !combatantCanTakeActions(input.state.combatants.get(actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  const standardActionKind = standardActionKindForSubject(input.subject);
  if (
    standardActionKind !== null &&
    !canSpendAction(input.state.currentTurnResources, standardActionKind)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusAction" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusActionStandardAction" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "actionSpell" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !canSpendAction(input.state.currentTurnResources, "magic"))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusActionSpell" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }

  if (
    input.subject.tag === "unitFeature" &&
    !combatantCanTakeActions(input.state.combatants.get(actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const result = (() => {
    const subject = input.subject;
    if (subject.tag === "action" && subject.action === "attack") {
      return resolveAttack({
        ...input,
        subject,
        ...(options.replayingInterruptedProcedure === undefined
          ? {}
          : {
              replayingInterruptedProcedure:
                options.replayingInterruptedProcedure,
            }),
        ...(options.suppressedReactionTrigger === undefined
          ? {}
          : { suppressedReactionTrigger: options.suppressedReactionTrigger }),
        ...(options.pendingAttackDamageReductions === undefined
          ? {}
          : {
              pendingAttackDamageReductions:
                options.pendingAttackDamageReductions,
            }),
      });
    }
    if (subject.tag === "action" && subject.action === "dash") {
      return resolveDash(input);
    }
    if (subject.tag === "action" && subject.action === "disengage") {
      return resolveDisengage(input);
    }
    if (subject.tag === "action" && subject.action === "dodge") {
      return resolveDodge(input);
    }
    if (subject.tag === "action" && subject.action === "helpAttack") {
      return resolveHelpAttack({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "hide") {
      return resolveHide({ ...input, subject: actionHideSubject(subject) });
    }
    if (subject.tag === "action" && subject.action === "multiattack") {
      return resolveMultiattack({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "ready") {
      return resolveReady({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "search") {
      return resolveSearch({ ...input, subject: actionSearchSubject(subject) });
    }
    if (subject.tag === "action" && subject.action === "grapple") {
      return resolveGrapple({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "escapeGrapple") {
      return resolveEscapeGrapple({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "escapeSpellRestraint") {
      return resolveEscapeSpellRestraint({ ...input, subject });
    }
    if (subject.tag === "bonusAction" && subject.action === "offHandAttack") {
      return resolveOffHandAttack({
        ...input,
        subject,
        ...(options.replayingInterruptedProcedure === undefined
          ? {}
          : {
              replayingInterruptedProcedure:
                options.replayingInterruptedProcedure,
            }),
        ...(options.suppressedReactionTrigger === undefined
          ? {}
          : { suppressedReactionTrigger: options.suppressedReactionTrigger }),
        ...(options.pendingAttackDamageReductions === undefined
          ? {}
          : {
              pendingAttackDamageReductions:
                options.pendingAttackDamageReductions,
            }),
      });
    }
    if (subject.tag === "bonusActionStandardAction") {
      return resolveBonusActionStandardAction({ ...input, subject });
    }
    if (
      subject.tag === "bonusAction" &&
      subject.action === "statBlockActionOption"
    ) {
      return resolveStatBlockBonusActionOption({ ...input, subject });
    }
    if (subject.tag === "actionSpell") {
      return resolveSpellAct({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (subject.tag === "bonusActionSpell") {
      return resolveBonusActionSpellAct({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (subject.tag === "unitFeature") {
      return resolveUnitFeature({ ...input, subject });
    }
    if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
      return resolveEndTurnCommand(input);
    }
    if (subject.tag === "runtimeCommand" && subject.command === "move") {
      return resolveMoveCommand(input);
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "standFromProne"
    ) {
      return resolveStandFromProneCommand(input);
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseReadiedSpell"
    ) {
      return resolveReleaseReadiedSpellCommand(input, {
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseReadiedMovement"
    ) {
      return resolveReleaseReadiedMovementCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "castTriggeredReactionSpell"
    ) {
      return resolveCastTriggeredReactionSpellCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseGrapple"
    ) {
      return resolveReleaseGrappleCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "opportunityAttack"
    ) {
      return resolveOpportunityAttackCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
        pendingAttackDamageReductions: options.pendingAttackDamageReductions,
      });
    }
    const _exhaustive: never = subject;
    return _exhaustive;
  })();
  return consumeOrCloseLegendaryActionWindow(input.subject, result);
}

function actionHideSubject(subject: {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "hide";
}): ActionHideSubject {
  return {
    tag: "action",
    actorId: subject.actorId,
    action: "hide",
  };
}

function actionSearchSubject(subject: {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "search";
}): ActionSearchSubject {
  return {
    tag: "action",
    actorId: subject.actorId,
    action: "search",
  };
}

function isReleaseGrappleSubject(
  subject: BattleSubject,
): subject is Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
> {
  return (
    subject.tag === "runtimeCommand" && subject.command === "releaseGrapple"
  );
}

function standardActionKindForSubject(
  subject: BattleSubject,
): StandardActionKind | null {
  if (subject.tag !== "action" || isLegendaryAttackSubject(subject)) {
    return null;
  }
  return Match.value(subject.action).pipe(
    Match.when("attack", () => "attack" as const),
    Match.when("dash", () => "dash" as const),
    Match.when("disengage", () => "disengage" as const),
    Match.when("dodge", () => "dodge" as const),
    Match.when("helpAttack", () => "help" as const),
    Match.when("hide", () => "hide" as const),
    Match.when("multiattack", () => "attack" as const),
    Match.when("ready", () => "ready" as const),
    Match.when("search", () => "search" as const),
    Match.when("grapple", () => "attack" as const),
    Match.when("escapeGrapple", () => "attack" as const),
    Match.when("escapeSpellRestraint", () => "utilize" as const),
    Match.exhaustive,
  );
}

function consumeOrCloseLegendaryActionWindow(
  subject: BattleSubject,
  result: BattleResolutionResult,
): BattleResolutionResult {
  if (result.tag !== "resolved") return result;
  if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
    const normalized = normalizeEarlyEndedOngoingFeatures(result.state);
    return normalized === result.state
      ? result
      : { ...result, state: normalized, snapshot: snapshotBattle(normalized) };
  }
  const normalized = normalizeEarlyEndedOngoingFeatures(result.state);
  const state = isLegendaryAttackSubject(subject)
    ? consumeLegendaryActionWindow(normalized)
    : closeLegendaryActionWindow(normalized);
  return state === result.state
    ? result
    : { ...result, state, snapshot: snapshotBattle(state) };
}

export function openBattleReactionWindow(input: {
  readonly state: BattleState;
  readonly frame: BattleReactionFrame;
}): BattleState {
  return {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack,
      reactionInterruptFrame(input.frame),
    ],
  };
}

function reactionInterruptFrame(
  frame: BattleReactionFrame,
): BattleReactionInterruptFrame {
  return { kind: "reaction", frame };
}

export function resolveBattleReaction(input: {
  readonly state: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "reactionDecision" }>;
}): BattleResolutionResult {
  const frame = currentReactionFrame(input.state);
  if (frame === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No Reaction window is pending.",
    );
  }
  if (input.fill.holeId !== REACTION_DECISION_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction decision fill does not match the pending Reaction window.",
    );
  }

  const reactor = input.state.combatants.get(input.fill.value.reactorId);
  if (
    reactor === undefined ||
    !unofferedEligibleReactors(frame).includes(input.fill.value.reactorId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction decision reactor is not eligible for the pending Reaction window.",
    );
  }

  if (
    input.fill.value.kind === "resolve" &&
    !combatantCanTakeReactions(reactor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Selected reactor has no Reaction available.",
    );
  }

  if (input.fill.value.kind === "resolve") {
    const choice = admittedReactionChoice(frame, input.fill.value);
    if (choice === null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Reaction choice is not admitted for the pending Reaction window.",
      );
    }
    if (choice.kind === "reactionRollOrDamageReduction") {
      return resolveReactionRollOrDamageReduction({
        state: input.state,
        frame,
        choice,
        selection: input.fill.value.choice,
      });
    }
    const activeFrame = {
      ...frame,
      activeReaction: {
        reactorId: input.fill.value.reactorId,
        subject: choice.subject,
        fills: input.fill.value.choice.fills,
      },
    };
    const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
    const activeState = spendReaction(
      {
        ...input.state,
        interruptStack: [
          ...stackWithoutCurrent,
          reactionInterruptFrame(activeFrame),
        ],
      },
      input.fill.value.reactorId,
    );
    const reactionResult = resolveBattleSubjectInternal(
      {
        state: activeState,
        subject: choice.subject,
        fills: input.fill.value.choice.fills,
      },
      { replayingInterruptedProcedure: true },
    );
    return reactionResult.tag === "resolved"
      ? completeActiveReactionProcedure(reactionResult.state)
      : reactionResult;
  }

  const updatedFrame = {
    ...frame,
    offeredReactors: [...frame.offeredReactors, input.fill.value.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(updatedFrame);
  const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
  const closedState =
    remainingReactors.length === 0
      ? {
          ...input.state,
          interruptStack: stackWithoutCurrent,
        }
      : {
          ...input.state,
          interruptStack: [
            ...stackWithoutCurrent,
            reactionInterruptFrame(updatedFrame),
          ],
        };
  const nextState =
    remainingReactors.length === 0
      ? suppressReactionTriggerForActiveReaction(closedState, frame.trigger)
      : closedState;

  return remainingReactors.length === 0
    ? completeResolvedActiveReactionIfPending(
        resumeInterruptedProcedure(
          nextState,
          frame.continuation,
          frame.trigger,
        ),
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

function spendReaction(
  state: BattleState,
  reactorId: CombatantId,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      reactionAvailable: false,
    }),
  };
}

function spendReactionModifierResource(
  state: BattleState,
  reactorId: CombatantId,
  choice: BattleReactionModifierChoice,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") return state;
  if (
    choice.kind === "attackDamageReduction" &&
    choice.zeroDamageRedirect !== undefined
  ) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      origin: {
        ...reactor.origin,
        resources: reactor.origin.resources.map((resource) =>
          resource.unit.id === reactionModifierResourceUnitId(choice)
            ? spendCharacterResourceUse(resource)
            : resource,
        ),
      },
    }),
  };
}

function reactionModifierResourceUnitId(
  choice: BattleReactionModifierChoice,
): UnitRecord["id"] {
  return choice.reduction.kind === "rolled" && "spends" in choice.reduction
    ? choice.reduction.spends.resourceUnitId
    : choice.unitId;
}

function resolveReactionRollOrDamageReduction(input: {
  readonly state: BattleState;
  readonly frame: BattleReactionFrame;
  readonly choice: BattleReactionProcedureModifierChoice;
  readonly selection: BattleReactionProcedureSelection;
}): BattleResolutionResult {
  if (input.selection.kind !== "reactionRollOrDamageReduction") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction modifier selection does not match the admitted choice.",
    );
  }
  const reductionRoll = reactionModifierReductionRoll(
    input.choice.choice,
    input.selection.fills,
  );
  if (reductionRoll.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", reductionRoll.message);
  }
  const reduction = reductionRoll.value;
  if (
    input.choice.choice.kind === "attackDamageReduction" &&
    input.frame.trigger !== "attackHit"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage reductions must be chosen when the attack roll hits.",
    );
  }
  if (
    input.choice.choice.kind === "attackDamageReduction" &&
    input.frame.trigger === "attackHit"
  ) {
    const reactor = input.state.combatants.get(input.choice.reactorId);
    if (
      input.choice.reactorId !== input.frame.targetId ||
      reactor?.origin.kind !== "character"
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage reductions require the damaged character as the reactor.",
      );
    }
  }
  if (
    input.choice.choice.kind === "damageRollReduction" &&
    (input.frame.trigger !== "attackDamage" ||
      input.frame.continuation.damageEvent.kind !== "rolledDamage")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Damage-roll reductions require unresolved rolled attack damage.",
    );
  }
  const spent = spendReactionModifierResource(
    spendReaction(input.state, input.choice.reactorId),
    input.choice.reactorId,
    input.choice.choice,
  );
  const updatedFrame = reactionFrameAfterModifier(
    input.frame,
    input.choice.reactorId,
    input.choice.choice,
    reduction,
  );
  const completedFrame: BattleReactionFrame = {
    ...updatedFrame,
    offeredReactors: [...updatedFrame.offeredReactors, input.choice.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(completedFrame);
  const stackWithoutCurrent = spent.interruptStack.slice(0, -1);
  const nextState =
    remainingReactors.length === 0
      ? { ...spent, interruptStack: stackWithoutCurrent }
      : {
          ...spent,
          interruptStack: [
            ...stackWithoutCurrent,
            reactionInterruptFrame(completedFrame),
          ],
        };

  return remainingReactors.length === 0
    ? completeResolvedActiveReactionIfPending(
        resumeInterruptedProcedure(
          nextState,
          completedFrame.continuation,
          completedFrame.trigger,
        ),
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

export function resolveCastTriggeredReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  >,
): BattleResolutionResult {
  const frame = currentReactionFrame(input.state);
  const activeReaction = frame?.activeReaction;
  const reactor = input.state.combatants.get(input.subject.reactorId);
  const invocation =
    reactor?.origin.kind === "character"
      ? supportedSpellActs(reactor).find(
          (candidate) =>
            candidate.procedure === "shieldReaction" &&
            supportedSpellInvocationMatchesRef(
              candidate,
              input.subject.invocation,
            ),
        )
      : undefined;
  if (
    (frame?.trigger !== "attackHit" && frame?.trigger !== "spellCast") ||
    activeReaction === undefined ||
    activeReaction.reactorId !== input.subject.reactorId ||
    !sameBattleSubject(activeReaction.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell casting requires an active matching Reaction window.",
    );
  }
  if (
    reactor?.origin.kind !== "character" ||
    invocation?.procedure !== "shieldReaction"
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Triggered Reaction spell command requires a supported prepared Reaction spell.",
    );
  }
  if (!spellHasAvailableSpend(reactor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell no longer has its required runtime spell resource.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(reactor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Triggered Reaction Shield spell does not accept table fills.",
    );
  }
  if (
    !triggeredReactionSpellTurnResourceAvailable(
      input.state,
      input.subject.reactorId,
      invocation,
      frame,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, input.subject.reactorId)
    : input.state;
  const effected = applyShieldReactionSpellActiveEffect(
    castingState,
    input.subject.reactorId,
    invocation,
  );
  const slotted = expendSpellSlot(
    effected,
    input.subject.reactorId,
    invocation.resource.slotLevel,
  );
  const nextTurnResources =
    input.subject.reactorId === currentActorId(slotted)
      ? markSpellSlotExpendedThisTurn(slotted.currentTurnResources)
      : Either.right(slotted.currentTurnResources);
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function completeResolvedActiveReactionIfPending(
  result: BattleResolutionResult,
): BattleResolutionResult {
  if (result.tag !== "resolved") {
    return result;
  }
  return currentReactionFrame(result.state)?.activeReaction === undefined
    ? result
    : completeActiveReactionProcedure(result.state);
}

function reactionModifierReductionRoll(
  choice: BattleReactionModifierChoice,
  fills: readonly BattleFill[],
):
  | { readonly tag: "ok"; readonly value: number }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  if (choice.reduction.kind === "halfDamage") {
    const unexpectedRollFill = fills.find((fill) => fill.kind === "rolledDice");
    return unexpectedRollFill === undefined
      ? { tag: "ok", value: 0 }
      : {
          tag: "invalid",
          message: "This Reaction modifier does not accept a roll fill.",
        };
  }
  const fill = fills.find(
    (candidate): candidate is BattleRolledDiceFill =>
      isBattleRolledDiceFill(candidate) &&
      candidate.holeId === REACTION_MODIFIER_ROLL_HOLE_ID,
  );
  if (fill === undefined) {
    return {
      tag: "invalid",
      message: "This Reaction modifier requires one reduction roll fill.",
    };
  }
  if (
    fills.some(
      (candidate) =>
        isBattleRolledDiceFill(candidate) &&
        candidate.holeId === REACTION_MODIFIER_ROLL_HOLE_ID &&
        candidate !== fill,
    )
  ) {
    return {
      tag: "invalid",
      message: "Reaction modifier reduction roll was filled twice.",
    };
  }
  const expectedDieResults =
    "dice" in choice.reduction ? choice.reduction.dice : 1;
  const value = rolledDiceFillTotal(fill, {
    dice: expectedDieResults,
    dieSize: choice.reduction.dieSize,
  });
  if (value === null) {
    return {
      tag: "invalid",
      message:
        "Reaction modifier roll must provide one valid reduction die result.",
    };
  }
  if ("dice" in choice.reduction) {
    return reactionReductionResourceDieRollTotal({
      reduction: choice.reduction,
      rollTotal: value,
    });
  }
  return {
    tag: "ok",
    value: reactionModifierReductionTotal(choice.reduction, value),
  };
}

function reactionModifierReductionTotal(
  reduction: Extract<
    BattleReactionModifierChoice["reduction"],
    { readonly kind: "rolled" }
  >,
  rollTotal: number,
): number {
  return rollTotal + reduction.flatModifier;
}

function reactionReductionResourceDieRollTotal(input: {
  readonly reduction: Pick<
    ReactionReductionResourceDie,
    "dice" | "dieSize" | "flatModifier"
  >;
  readonly rollTotal: number;
}):
  | { readonly tag: "ok"; readonly value: number }
  | { readonly tag: "invalid"; readonly message: string } {
  const minimumRollTotal = input.reduction.dice;
  const maximumRollTotal = input.reduction.dice * input.reduction.dieSize;
  if (
    input.rollTotal < minimumRollTotal ||
    input.rollTotal > maximumRollTotal ||
    !Number.isInteger(input.rollTotal)
  ) {
    return {
      tag: "invalid",
      message: `reduction roll must be a ${reactionReductionResourceDieLabel(input.reduction)} result.`,
    };
  }
  return {
    tag: "ok",
    value: input.rollTotal + input.reduction.flatModifier,
  };
}

function reactionReductionResourceDieLabel(
  reduction: Pick<
    ReactionReductionResourceDie,
    "dice" | "dieSize" | "flatModifier"
  >,
): string {
  return `${reduction.dice}d${reduction.dieSize}${signedModifier(reduction.flatModifier)}`;
}

function isBattleRolledDiceFill(
  fill: BattleFill,
): fill is BattleRolledDiceFill {
  return fill.kind === "rolledDice";
}

function attackDamageReductionZeroDamageRedirectSelection(input: {
  readonly state: BattleState;
  readonly reactorId: CombatantId;
  readonly unitId: UnitRecord["id"];
  readonly offer: AttackDamageReductionZeroDamageRedirectOffer;
  readonly target:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  readonly save:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  readonly damage: BattleRolledDiceFill | undefined;
}):
  | {
      readonly tag: "ok";
      readonly value:
        | AttackDamageReductionZeroDamageRedirectSelection
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const { damage, offer, reactorId, save, state, target, unitId } = input;
  if (target === undefined && save === undefined && damage === undefined) {
    return { tag: "ok", value: undefined };
  }
  if (target === undefined || save === undefined || damage === undefined) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect requires target, save, and damage facts.",
    };
  }
  if (
    !attackDamageReductionRedirectResourceAvailable(
      state,
      reactorId,
      unitId,
      offer,
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect requires an available projected resource.",
    };
  }
  if (
    !attackDamageReductionZeroDamageRedirectTargetChoices(
      state,
      reactorId,
    ).includes(target.value) ||
    !hasAttackDamageReductionRedirectTargetSpatialFact(
      target.spatialFacts ?? [],
      reactorId,
      target.value,
      offer.attackKind,
      offer.targetGate,
    )
  ) {
    return {
      tag: "invalid",
      message: "Attack damage reduction redirect target is not eligible.",
    };
  }
  const outcome = save.value.outcomes.find(
    (candidate) => candidate.targetId === target.value,
  );
  if ("area" in save.value) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect save must not include spell area facts.",
    };
  }
  if (outcome === undefined || save.value.outcomes.length !== 1) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect save must name the redirect target once.",
    };
  }
  const redirectedDamageRoll = rolledDiceFillTotal(damage, {
    dice: offer.damageDice.dice,
    dieSize: offer.damageDice.dieSize,
  });
  if (redirectedDamageRoll === null) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect damage must match its projected dice.",
    };
  }
  return {
    tag: "ok",
    value: {
      targetId: target.value,
      savingThrowSucceeded: outcome.succeeded,
      redirectedDamageRoll,
    },
  };
}

function rolledDiceFillTotal(
  fill: BattleRolledDiceFill,
  expr: { readonly dice: number; readonly dieSize: DamageDieSize },
): number | null {
  const validation = validateRolledDiceForDiceExpr(fill.value, expr);
  if (validation !== null) {
    return null;
  }
  return rolledDiceTotal(fill.value);
}

function reactionFrameAfterModifier(
  frame: BattleReactionFrame,
  reactorId: CombatantId,
  choice: BattleReactionModifierChoice,
  reduction: number,
): BattleReactionFrame {
  if (frame.trigger === "attackHit" && choice.kind === "attackRollReduction") {
    return {
      ...frame,
      attackRoll: {
        ...frame.attackRoll,
        total: frame.attackRoll.total - reduction,
      },
      continuation:
        frame.continuation.kind === "replay"
          ? {
              ...frame.continuation,
              fills: reactionModifiedAttackRollFills(
                frame.continuation.fills,
                frame.attackRoll.total - reduction,
              ),
            }
          : frame.continuation,
    };
  }
  if (
    frame.trigger === "attackHit" &&
    choice.kind === "attackDamageReduction" &&
    frame.continuation.kind === "replay"
  ) {
    return {
      ...frame,
      continuation: {
        ...frame.continuation,
        attackDamageReductions: [
          ...(frame.continuation.attackDamageReductions ?? []),
          {
            reactorId,
            unitId: choice.unitId,
            label: choice.label,
            reduction: choice.reduction,
            reductionAmount: reduction,
            ...(choice.zeroDamageRedirect === undefined
              ? {}
              : { zeroDamageRedirect: choice.zeroDamageRedirect }),
          },
        ],
      },
    };
  }
  if (
    frame.trigger === "attackDamage" &&
    choice.kind === "damageRollReduction"
  ) {
    const nextDamageEntries = damageAmountByTypeEntriesAfterScalarReduction(
      attackDamageEventEntries(frame.continuation.damageEvent),
      choice.reduction.kind,
      reduction,
    );
    const nextDamageEvent =
      frame.continuation.damageEvent.kind === "rolledDamage"
        ? ({
            kind: "rolledDamage" as const,
            damageRollByType: nextDamageEntries,
          } satisfies BattleAttackDamageEvent)
        : ({
            kind: "aggregateDamage" as const,
            damageByTypeBeforeTargetAdjustments: nextDamageEntries,
          } satisfies BattleAttackDamageEvent);
    return {
      ...frame,
      continuation: {
        ...frame.continuation,
        damageEvent: nextDamageEvent,
      },
    };
  }
  return frame;
}

function attackDamageEventEntries(
  event: BattleAttackDamageEvent,
): readonly DamageAmountByTypeEntry[] {
  return event.kind === "rolledDamage"
    ? event.damageRollByType
    : event.damageByTypeBeforeTargetAdjustments;
}

function attackDamageEventAmountForTarget(
  target: BattleCreatureState,
  event: BattleAttackDamageEvent,
): DamageAmount {
  return toDamageAmount(
    damageAmountByTypeAfterTargetAdjustments(
      target,
      damageAmountByTypeEntriesToMap(attackDamageEventEntries(event)),
    ),
  );
}

function attackDamageEventAmountBeforeTargetAdjustments(
  event: BattleAttackDamageEvent,
): DamageAmount {
  return toDamageAmount(
    attackDamageEventEntries(event).reduce(
      (total, entry) => total + entry.amount,
      0,
    ),
  );
}

function attackDamageEventAfterPendingReductions(
  event: BattleAttackDamageEvent,
  reductions: readonly BattlePendingAttackDamageReduction[],
): BattleAttackDamageEvent {
  return reductions.reduce(
    (current, reduction) =>
      attackDamageEventAfterPendingReduction(current, reduction),
    event,
  );
}

function attackDamageEventWithEntries(
  event: BattleAttackDamageEvent,
  entries: readonly DamageAmountByTypeEntry[],
): BattleAttackDamageEvent {
  return event.kind === "rolledDamage"
    ? { ...event, damageRollByType: entries }
    : { ...event, damageByTypeBeforeTargetAdjustments: entries };
}

function attackDamageEventAfterPendingReduction(
  event: BattleAttackDamageEvent,
  reduction: BattlePendingAttackDamageReduction,
): BattleAttackDamageEvent {
  const nextEntries = damageAmountByTypeEntriesAfterScalarReduction(
    attackDamageEventEntries(event),
    reduction.reduction.kind,
    reduction.reductionAmount,
  );
  return event.kind === "rolledDamage"
    ? { ...event, damageRollByType: nextEntries }
    : { ...event, damageByTypeBeforeTargetAdjustments: nextEntries };
}

function resolveAttackDamageReductionZeroDamageRedirectAfterReduction(input: {
  readonly state: BattleState;
  readonly reductions: readonly BattlePendingAttackDamageReduction[];
  readonly reducedDamageBeforeTargetAdjustments: DamageAmount;
  readonly redirectTarget:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  readonly redirectSave:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  readonly redirectDamage:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
}):
  | { readonly tag: "ok"; readonly state: BattleState }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly holes: readonly BattleHole[];
    }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  const offers = input.reductions.flatMap((reduction) =>
    reduction.zeroDamageRedirect === undefined
      ? []
      : [
          {
            reactorId: reduction.reactorId,
            unitId: reduction.unitId,
            label: reduction.label,
            redirect: reduction.zeroDamageRedirect,
          } satisfies AttackDamageReductionZeroDamageRedirectAvailableOffer,
        ],
  );
  if (offers.length === 0) {
    return { tag: "ok", state: input.state };
  }
  if (offers.length > 1) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect expects exactly one zero-damage redirect offer.",
    };
  }
  if (Number(input.reducedDamageBeforeTargetAdjustments) !== 0) {
    if (
      input.redirectTarget === undefined &&
      input.redirectSave === undefined &&
      input.redirectDamage === undefined
    ) {
      return { tag: "ok", state: input.state };
    }
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect is only available when the reduction makes the attack damage 0.",
    };
  }
  const offer = offers[0];
  const selection = attackDamageReductionZeroDamageRedirectSelection({
    state: input.state,
    reactorId: offer.reactorId,
    unitId: offer.unitId,
    offer: offer.redirect,
    target: input.redirectTarget,
    save: input.redirectSave,
    damage: input.redirectDamage,
  });
  if (selection.tag === "invalid") {
    return selection;
  }
  if (selection.value === undefined) {
    const holes = attackDamageReductionZeroDamageRedirectHoles(
      input.state,
      offer,
    );
    if (holes.length === 0) {
      return { tag: "ok", state: input.state };
    }
    return {
      tag: "needsHoles",
      state: input.state,
      holes,
    };
  }
  const resourceSpent = spendAttackDamageReductionRedirectResource(
    input.state,
    offer.reactorId,
    offer.unitId,
    offer.redirect,
  );
  if (selection.value.savingThrowSucceeded) {
    return { tag: "ok", state: resourceSpent };
  }
  const redirectTarget = resourceSpent.combatants.get(selection.value.targetId);
  if (redirectTarget === undefined) {
    return { tag: "ok", state: resourceSpent };
  }
  const redirectedDamage = attackDamageEventAmountForTarget(redirectTarget, {
    kind: "aggregateDamage",
    damageByTypeBeforeTargetAdjustments: [
      {
        damageType: offer.redirect.originalDamageType,
        amount: Math.max(
          0,
          selection.value.redirectedDamageRoll +
            Number(offer.redirect.damageAbilityModifier),
        ),
      },
    ],
  });
  return {
    tag: "ok",
    state: applyAttackDamageAmount(
      resourceSpent,
      offer.reactorId,
      selection.value.targetId,
      redirectedDamage,
      1,
      { kind: "ordinaryDamage" },
      [],
    ),
  };
}

function damageAmountByTypeEntriesAfterScalarReduction(
  entries: readonly DamageAmountByTypeEntry[],
  reductionKind: BattleReactionModifierChoice["reduction"]["kind"],
  reduction: number,
): readonly DamageAmountByTypeEntry[] {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const reductionAmount =
    reductionKind === "halfDamage"
      ? total - Math.floor(total / 2)
      : Math.min(total, Math.max(0, reduction));
  return entriesAfterProportionalDamageReduction(entries, reductionAmount);
}

function reactionModifiedAttackRollFills(
  fills: readonly BattleFill[],
  total: number,
): readonly BattleFill[] {
  return fills.flatMap<BattleFill>((fill) => {
    if (fill.kind === "attackRoll") {
      return [{ ...fill, value: { ...fill.value, total } }];
    }
    return fill.kind === "rolledDice" ||
      fill.kind === "concentrationSavingThrow"
      ? []
      : [fill];
  });
}

function attackFillsThroughAttackRoll(
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  return fills.filter(
    (fill) => fill.kind === "targetChoice" || fill.kind === "attackRoll",
  );
}

function attackDamagePrefixFills(
  fills: readonly BattleFill[],
): readonly BattleAttackDamagePrefixFill[] {
  return fills.filter(
    (fill): fill is BattleAttackDamagePrefixFill =>
      fill.kind === "targetChoice" ||
      fill.kind === "attackRoll" ||
      fill.kind === "rolledDice" ||
      fill.kind === "attackDamageDisposition",
  );
}

function admittedReactionChoice(
  frame: BattleReactionFrame,
  decision: Extract<BattleReactionDecision, { readonly kind: "resolve" }>,
): BattleReactionProcedureChoice | null {
  return (
    frame.choices.find(
      (choice) =>
        choice.kind === decision.choice.kind &&
        choice.reactorId === decision.reactorId &&
        sameReactionProcedureChoice(choice, decision.choice),
    ) ?? null
  );
}

function sameReactionProcedureChoice(
  choice: BattleReactionProcedureChoice,
  decisionChoice: BattleReactionProcedureSelection,
): boolean {
  if (
    choice.kind === "reactionRollOrDamageReduction" &&
    decisionChoice.kind === "reactionRollOrDamageReduction"
  ) {
    return (
      choice.choice.unitId === decisionChoice.unitId &&
      choice.choice.kind === decisionChoice.modifierKind
    );
  }
  if (
    choice.kind === "releaseReadiedSpell" &&
    decisionChoice.kind === "releaseReadiedSpell"
  ) {
    return choice.readiedSpellCasterId === decisionChoice.readiedSpellCasterId;
  }
  if (
    choice.kind === "releaseReadiedMovement" &&
    decisionChoice.kind === "releaseReadiedMovement"
  ) {
    return (
      choice.readiedMovementActorId === decisionChoice.readiedMovementActorId
    );
  }
  if (
    choice.kind === "castTriggeredReactionSpell" &&
    decisionChoice.kind === "castTriggeredReactionSpell"
  ) {
    return sameSpellInvocationRef(choice.invocation, decisionChoice.invocation);
  }
  return (
    choice.kind === "opportunityAttack" &&
    decisionChoice.kind === "opportunityAttack" &&
    choice.reactorId === decisionChoice.reactorId
  );
}

function completeActiveReactionProcedure(
  state: BattleState,
): BattleResolutionResult {
  const frame = currentReactionFrame(state);
  const activeReaction = frame?.activeReaction;
  if (frame === null || activeReaction === undefined) {
    return invalidResult(
      state,
      "staleSubject",
      "No active Reaction procedure is pending completion.",
    );
  }
  const { activeReaction: _completedReaction, ...inactiveFrame } = frame;
  const completedFrame: BattleReactionFrame = {
    ...inactiveFrame,
    offeredReactors: [...frame.offeredReactors, activeReaction.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(completedFrame);
  const stackWithoutCurrent = state.interruptStack.slice(0, -1);
  const closedState =
    remainingReactors.length === 0
      ? { ...state, interruptStack: stackWithoutCurrent }
      : {
          ...state,
          interruptStack: [
            ...stackWithoutCurrent,
            reactionInterruptFrame(completedFrame),
          ],
        };
  const nextState =
    remainingReactors.length === 0
      ? suppressReactionTriggerForActiveReaction(closedState, frame.trigger)
      : closedState;

  return remainingReactors.length === 0
    ? resumeInterruptedProcedure(nextState, frame.continuation, frame.trigger)
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

function suppressReactionTriggerForActiveReaction(
  state: BattleState,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleState {
  const frame = currentReactionFrame(state);
  if (frame?.activeReaction === undefined) {
    return state;
  }
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      reactionInterruptFrame({
        ...frame,
        activeReaction: {
          ...frame.activeReaction,
          suppressedReactionTrigger,
        },
      }),
    ],
  };
}

function resumeInterruptedProcedure(
  state: BattleState,
  continuation: BattleInterruptedProcedure,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleResolutionResult {
  if (continuation.kind === "resolved") {
    return {
      tag: "resolved",
      state,
      snapshot: snapshotBattle(state),
    };
  }
  if (continuation.kind === "afterDamageSequence") {
    return openAfterDamageSequenceReactionWindow({
      state,
      subject: continuation.subject,
      events: continuation.events,
      suppressedReactionTrigger:
        suppressedReactionTrigger === "afterDamage"
          ? undefined
          : suppressedReactionTrigger,
    });
  }
  if (continuation.kind === "movement") {
    const nextState = applyBattleMovement(state, continuation.movement);
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  if (continuation.kind === "attackDamage") {
    const damageAmount = attackDamageContinuationAmount(state, continuation);
    if (damageAmount === null) {
      return invalidResult(
        state,
        "invalidFill",
        "Attack damage target is no longer available.",
      );
    }
    const concentrationPending = attackDamageContinuationConcentrationHole(
      state,
      continuation,
    );
    if (
      concentrationPending !== null &&
      continuation.concentrationSavingThrow === undefined
    ) {
      const {
        concentrationSavingThrow: _pendingConcentrationSavingThrow,
        ...continuationWithoutConcentration
      } = continuation;
      const pendingState = {
        ...state,
        interruptStack: [
          ...state.interruptStack,
          attackDamageContinuationConcentrationFrame(
            continuationWithoutConcentration,
            suppressedReactionTrigger,
          ),
        ],
      };
      return needsHolesResult(pendingState, continuation.subject, [
        concentrationPending,
      ]);
    }
    const damagedState = applyAttackDamageAmount(
      state,
      continuation.attackerId,
      continuation.targetId,
      damageAmount,
      continuation.deathFailuresAtZeroHp,
      continuation.damageDisposition,
      continuation.attackDamageRiders,
      continuation.weaponDamageDiceRollChoice,
      continuation.concentrationSavingThrow,
    );
    const reactionWindow = maybeOpenReactionWindow(
      damagedState,
      {
        trigger: "afterDamage",
        damageSourceId: continuation.attackerId,
        damagedId: continuation.targetId,
        damageAmount,
        continuation: {
          kind: "resolved",
          subject: continuation.subject,
        },
      },
      suppressedReactionTrigger,
    );
    return (
      reactionWindow ?? {
        tag: "resolved",
        state: damagedState,
        snapshot: snapshotBattle(damagedState),
      }
    );
  }

  return resolveReplayContinuationFromState(
    state,
    continuation,
    suppressedReactionTrigger,
    continuation.fills,
  );
}

export function openAfterDamageSequenceReactionWindow(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly events: readonly BattleAfterDamageEvent[];
  readonly suppressedReactionTrigger: BattleReactionTrigger | undefined;
}): BattleResolutionResult {
  const [event, ...remainingEvents] = input.events;
  if (event === undefined) {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  const reactionWindow = maybeOpenReactionWindow(
    input.state,
    {
      trigger: "afterDamage",
      damageSourceId: event.damageSourceId,
      damagedId: event.damagedId,
      damageAmount: event.damageAmount,
      continuation: {
        kind: "afterDamageSequence",
        subject: input.subject,
        events: remainingEvents,
      },
    },
    input.suppressedReactionTrigger,
  );
  return (
    reactionWindow ??
    openAfterDamageSequenceReactionWindow({
      ...input,
      events: remainingEvents,
    })
  );
}

function replayContinuationFrame(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleReplayContinuationFrame {
  return {
    kind: "replayContinuation",
    continuation,
    suppressedReactionTrigger,
  };
}

function resolveReplayContinuation(input: {
  readonly state: BattleState;
  readonly frame: BattleReplayContinuationFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): BattleResolutionResult {
  const stateWithoutFrame = {
    ...input.state,
    interruptStack: input.state.interruptStack.slice(0, -1),
  };
  return resolveReplayContinuationFromState(
    stateWithoutFrame,
    input.frame.continuation,
    input.frame.suppressedReactionTrigger,
    input.fills,
  );
}

function resolveReplayContinuationFromState(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  suppressedReactionTrigger: BattleReactionTrigger,
  fills: readonly BattleFill[],
): BattleResolutionResult {
  const result = resolveBattleSubjectInternal(
    {
      state,
      subject: continuation.subject,
      fills,
    },
    {
      replayingInterruptedProcedure: true,
      suppressedReactionTrigger,
      ...(continuation.attackDamageReductions === undefined
        ? {}
        : {
            pendingAttackDamageReductions: continuation.attackDamageReductions,
          }),
    },
  );
  if (
    result.tag !== "needsHoles" ||
    result.state.interruptStack.length !== state.interruptStack.length
  ) {
    return result;
  }
  const activeReaction = currentReactionFrame(result.state)?.activeReaction;
  if (
    activeReaction !== undefined &&
    sameBattleSubject(activeReaction.subject, continuation.subject)
  ) {
    const pendingState =
      activeReactionWithReplayContinuationAttackDamageReductions(
        result.state,
        continuation,
      );
    return {
      ...result,
      state: pendingState,
      snapshot: snapshotBattle(pendingState),
    };
  }
  const pendingState = {
    ...result.state,
    interruptStack: [
      ...result.state.interruptStack,
      replayContinuationFrame(continuation, suppressedReactionTrigger),
    ],
  };
  return {
    ...result,
    state: pendingState,
    snapshot: snapshotBattle(pendingState),
  };
}

function activeReactionWithReplayContinuationAttackDamageReductions(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
): BattleState {
  if (continuation.attackDamageReductions === undefined) {
    return state;
  }
  const frame = currentReactionFrame(state);
  if (frame?.activeReaction === undefined) {
    return state;
  }
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      reactionInterruptFrame({
        ...frame,
        activeReaction: {
          ...frame.activeReaction,
          pendingAttackDamageReductions: continuation.attackDamageReductions,
        },
      }),
    ],
  };
}

function attackDamageContinuationConcentrationFrame(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleAttackDamageContinuationConcentrationFrame {
  return {
    kind: "attackDamageContinuationConcentration",
    continuation,
    suppressedReactionTrigger,
  };
}

function attackDamageContinuationAmount(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): DamageAmount | null {
  const target = state.combatants.get(continuation.targetId);
  return target === undefined
    ? null
    : attackDamageEventAmountForTarget(target, continuation.damageEvent);
}

function attackDamageContinuationConcentrationHole(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): BattleConcentrationSavingThrowHole | null {
  const target = state.combatants.get(continuation.targetId);
  return target === undefined
    ? null
    : concentrationSavingThrowHole(
        target,
        Number(
          attackDamageEventAmountForTarget(target, continuation.damageEvent),
        ),
      );
}

function resolveAttackDamageContinuationConcentration(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackDamageContinuationConcentrationFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): BattleResolutionResult {
  const concentrationSave = attackDamageContinuationConcentrationHole(
    input.state,
    input.frame.continuation,
  );
  if (concentrationSave === null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw is no longer available for the damaged target.",
    );
  }
  const concentrationFill = attackDamageContinuationConcentrationFill(
    input.frame.continuation,
    input.fills,
  );
  if (concentrationFill.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", concentrationFill.message);
  }
  if (concentrationFill.value === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationSave]);
  }
  if (concentrationFill.value.holeId !== concentrationSave.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill does not match the damaged target.",
    );
  }
  const stateWithoutFrame = {
    ...input.state,
    interruptStack: input.state.interruptStack.slice(0, -1),
  };
  return resumeInterruptedProcedure(
    stateWithoutFrame,
    {
      ...input.frame.continuation,
      concentrationSavingThrow: concentrationFill.value,
    },
    input.frame.suppressedReactionTrigger,
  );
}

function attackDamageContinuationConcentrationFill(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
  fills: readonly BattleFill[],
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const prefix = continuation.fills;
  const accumulated =
    fills.length >= prefix.length &&
    prefix.every((fill, index) => battleFillEquals(fill, fills[index]!));
  const remaining = accumulated ? fills.slice(prefix.length) : fills;
  if (remaining.length === 0) {
    return { tag: "ok", value: undefined };
  }
  if (
    remaining.length !== 1 ||
    remaining[0]?.kind !== "concentrationSavingThrow"
  ) {
    return {
      tag: "invalid",
      message:
        "Attack damage Concentration continuation accepts the pending Concentration Saving Throw after the original attack fills.",
    };
  }
  return { tag: "ok", value: remaining[0] };
}

function battleFillEquals(
  a: BattleAttackDamagePrefixFill,
  b: BattleFill,
): boolean {
  if (a.kind !== b.kind || a.holeId !== b.holeId) {
    return false;
  }
  if (a.kind === "targetChoice" && b.kind === "targetChoice") {
    return a.value === b.value;
  }
  if (a.kind === "attackRoll" && b.kind === "attackRoll") {
    return (
      a.value.total === b.value.total &&
      a.value.naturalD20 === b.value.naturalD20 &&
      a.value.rollMode === b.value.rollMode &&
      a.value.activatedOngoingFeatureUnitId ===
        b.value.activatedOngoingFeatureUnitId
    );
  }
  if (a.kind === "rolledDice" && b.kind === "rolledDice") {
    return (
      rolledDiceGroupsEqual(a.value, b.value) &&
      attackDamageRiderSelectionsEqual(
        a.selectedAttackDamageRiderUnitIds,
        b.selectedAttackDamageRiderUnitIds,
      )
    );
  }
  if (
    a.kind === "attackDamageDisposition" &&
    b.kind === "attackDamageDisposition"
  ) {
    return a.value.kind === b.value.kind;
  }
  return false;
}

function rolledDiceGroupsEqual(
  a: BattleRolledDiceFill["value"],
  b: BattleRolledDiceFill["value"],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (group, index) =>
        group.results.length === b[index]?.results.length &&
        group.results.every(
          (result, resultIndex) => result === b[index]?.results[resultIndex],
        ),
    )
  );
}

function attackDamageRiderSelectionsEqual(
  a: readonly UnitRecord["id"][] | undefined,
  b: readonly UnitRecord["id"][] | undefined,
): boolean {
  return (
    (a ?? []).length === (b ?? []).length &&
    (a ?? []).every((unitId, index) => unitId === (b ?? [])[index])
  );
}

export function endTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
}): BattleResolutionResult {
  const result = resolveBattleSubject({
    state: input.state,
    subject: {
      tag: "runtimeCommand",
      actorId: input.actorId,
      command: "endTurn",
    },
    fills: [],
  });

  return result;
}

export function snapshotBattle(state: BattleState): BattleSnapshot {
  const turnOrder = [...initiativeOrder(state.initiative)];

  return {
    battleId: state.battleId,
    round: state.initiative.round,
    currentActorId: currentActorId(state),
    turnOrder,
    combatants: turnOrder.flatMap((id) => {
      const combatant = state.combatants.get(id);
      return combatant == null ? [] : [combatantSnapshot(state, combatant)];
    }),
    acts: discoverBattleActs(state),
    turn: battleTurnSnapshot(state.currentTurnResources),
    readiedResponses: {
      spells: [...state.readiedSpells].map(([casterId, readiedSpell]) => ({
        casterId,
        ...readiedSpell,
      })),
      movements: [...state.readiedMovements].map(
        ([actorId, readiedMovement]) => ({
          actorId,
          ...readiedMovement,
        }),
      ),
    },
    helpAttackMarkers: state.helpAttacks,
    pendingReaction: pendingReactionSnapshot(state),
  };
}

function battleTurnSnapshot(
  resources: BattleTurnResources,
): BattleTurnSnapshot {
  return {
    actionResources: resources.actionResources,
    bonusActionAvailable: resources.currentHasBonusAction,
    spellSlotExpendedThisTurn: resources.spellSlotExpendedThisTurn,
    attackRollMadeThisTurn: resources.attackRollMadeThisTurn,
    attackDamageRidersUsedThisTurn: resources.attackDamageRidersUsedThisTurn,
    weaponDamageDiceRollChoicesUsedThisTurn:
      resources.weaponDamageDiceRollChoicesUsedThisTurn,
    ...(resources.lightWeaponAttackMade === undefined
      ? {}
      : { lightWeaponAttackMade: resources.lightWeaponAttackMade }),
    dashMovementBonusFeet: resources.dashMovementBonusFeet,
    disengaged: resources.disengaged,
  };
}

function pendingReactionSnapshot(
  state: BattleState,
): BattleSnapshot["pendingReaction"] {
  const frame = currentReactionFrame(state);
  return frame === null
    ? null
    : {
        trigger: frame.trigger,
        decisionHole: reactionDecisionHole(frame),
        choices: frame.choices,
        stackDepth: battleReplayStackDepth(state.interruptStack.length),
      };
}

function currentInterruptFrame(
  state: BattleState,
): BattleInterruptFrame | null {
  return state.interruptStack[state.interruptStack.length - 1] ?? null;
}

function currentReactionFrame(state: BattleState): BattleReactionFrame | null {
  const frame = currentInterruptFrame(state);
  return frame?.kind === "reaction" ? frame.frame : null;
}

function reactionDecisionHole(
  frame: BattleReactionFrame,
): BattleReactionDecisionHole {
  return {
    holeInstanceKey: REACTION_DECISION_HOLE_INSTANCE,
    holeId: REACTION_DECISION_HOLE_ID,
    kind: "reactionDecision",
    label: `${reactionTriggerLabel(frame.trigger)} reaction decision`,
    trigger: frame.trigger,
    eligibleReactors: unofferedEligibleReactors(frame),
  };
}

export function reactionTriggerLabel(trigger: BattleReactionTrigger): string {
  return Match.value(trigger).pipe(
    Match.when("attackHit", () => "Attack hit"),
    Match.when("attackDamage", () => "Attack damage"),
    Match.when("spellCast", () => "Spell cast"),
    Match.when("saveFailed", () => "Failed save"),
    Match.when("afterDamage", () => "After damage"),
    Match.when("opportunityAttack", () => "Opportunity Attack"),
    Match.exhaustive,
  );
}

function unofferedEligibleReactors(
  frame: BattleReactionFrame,
): readonly CombatantId[] {
  const offered = new Set(frame.offeredReactors);
  return frame.eligibleReactors.filter((reactorId) => !offered.has(reactorId));
}

export function maybeOpenReactionWindow(
  state: BattleState,
  frame: BattleReactionFrameInput,
  suppressedReactionTrigger: BattleReactionTrigger | undefined,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (frame.trigger === suppressedReactionTrigger) {
    return null;
  }
  const choices = reactionChoices(state, frame);
  if (choices.length === 0) {
    return null;
  }
  const eligibleReactors = [
    ...new Set(choices.map((choice) => choice.reactorId)),
  ];
  const frameCommon = {
    eligibleReactors,
    offeredReactors: [],
    choices,
  } satisfies Pick<
    BattleReactionFrame,
    "eligibleReactors" | "offeredReactors" | "choices"
  >;
  const nextFrame: BattleReactionFrame = Match.value(frame).pipe(
    Match.when({ trigger: "attackHit" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "attackDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "spellCast" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "saveFailed" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "afterDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "opportunityAttack" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.exhaustive,
  );
  const nextState = openBattleReactionWindow({ state, frame: nextFrame });
  const decisionHole = reactionDecisionHole(nextFrame);
  return {
    tag: "needsHoles",
    state: nextState,
    subject: frame.continuation.subject,
    holes: [decisionHole],
    snapshot: snapshotBattle(nextState),
  };
}

function readiedSpellReactionChoices(
  state: BattleState,
  trigger: BattleReactionTrigger,
): readonly BattleReactionProcedureChoice[] {
  const readiedChoices = [...state.readiedSpells].flatMap(
    ([casterId, readiedSpell]) => {
      const reactor = state.combatants.get(casterId);
      if (
        readiedSpell.trigger !== trigger ||
        reactor === undefined ||
        !combatantCanTakeReactions(reactor)
      ) {
        return [];
      }
      return [
        {
          kind: "releaseReadiedSpell" as const,
          reactorId: casterId,
          readiedSpellCasterId: casterId,
          initialHoles: readiedSpellInitialHoles(state, casterId, readiedSpell),
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "releaseReadiedSpell" as const,
            readiedSpellCasterId: casterId,
          },
        },
      ];
    },
  );
  return readiedChoices;
}

function readiedMovementReactionChoices(
  state: BattleState,
  trigger: BattleReactionTrigger,
): readonly BattleReactionProcedureChoice[] {
  return [...state.readiedMovements].flatMap(
    ([readiedMovementActorId, readiedMovement]) => {
      const reactor = state.combatants.get(readiedMovementActorId);
      const initialHoles = readiedMovementInitialHoles(
        state,
        readiedMovementActorId,
      );
      if (
        readiedMovement.trigger !== trigger ||
        reactor === undefined ||
        !combatantCanTakeReactions(reactor) ||
        initialHoles.length === 0
      ) {
        return [];
      }
      return [
        {
          kind: "releaseReadiedMovement" as const,
          reactorId: readiedMovementActorId,
          readiedMovementActorId,
          initialHoles,
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "releaseReadiedMovement" as const,
            readiedMovementActorId,
          },
        },
      ];
    },
  );
}

function triggeredReactionSpellChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  if (frame.trigger !== "attackHit" && frame.trigger !== "spellCast") {
    return [];
  }
  const reactorIds =
    frame.trigger === "attackHit" ? [frame.targetId] : frame.targetIds;
  return reactorIds.flatMap(
    (reactorId): readonly BattleReactionProcedureChoice[] => {
      const reactor = state.combatants.get(reactorId);
      if (
        reactor?.origin.kind !== "character" ||
        !combatantCanTakeReactions(reactor) ||
        activeOngoingFeaturesPreventSpellcasting(reactor)
      ) {
        return [];
      }
      return supportedSpellActs(reactor).flatMap(
        (invocation): readonly BattleReactionProcedureChoice[] => {
          if (
            invocation.procedure !== "shieldReaction" ||
            !spellHasAvailableSpend(reactor, invocation) ||
            !triggeredReactionSpellTurnResourceAvailable(
              state,
              reactorId,
              invocation,
              frame,
            ) ||
            !shieldReactionSpellMatchesTrigger(invocation, frame)
          ) {
            return [];
          }
          const invocationRef = supportedSpellInvocationRef(invocation);
          return [
            {
              kind: "castTriggeredReactionSpell" as const,
              reactorId,
              invocation: invocationRef,
              initialHoles: [],
              subject: {
                tag: "runtimeCommand" as const,
                actorId: currentActorId(state),
                command: "castTriggeredReactionSpell" as const,
                reactorId,
                invocation: invocationRef,
              },
            },
          ];
        },
      );
    },
  );
}

function triggeredReactionSpellTurnResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleReactionFrameInput,
): boolean {
  if (reactorId !== currentActorId(state)) {
    return true;
  }
  if (state.currentTurnResources.spellSlotExpendedThisTurn) {
    return false;
  }
  return !currentActorHasPendingSlottedSpellCast(state, invocation, frame);
}

function currentActorHasPendingSlottedSpellCast(
  state: BattleState,
  reactionInvocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleReactionFrameInput,
): boolean {
  if (
    frame.trigger !== "spellCast" ||
    frame.casterId !== currentActorId(state)
  ) {
    return false;
  }
  const caster = state.combatants.get(frame.casterId);
  if (caster?.origin.kind !== "character") {
    return false;
  }
  return supportedSpellActs(caster).some(
    (candidate) =>
      candidate.spell.id === frame.spellId &&
      candidate.spell.id !== reactionInvocation.spell.id &&
      candidate.resource.tag === "spellSlot",
  );
}

function shieldReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleReactionFrameInput,
): boolean {
  const castingTime = invocation.spell.mechanics.castingTime;
  if (castingTime.kind !== "reaction") {
    return false;
  }
  if (frame.trigger === "attackHit") {
    return reactionTriggerIncludesHitByAttackRoll(castingTime);
  }
  const namedSpellTriggerIds = reactionTriggerNamedSpellIds(castingTime);
  return (
    frame.trigger === "spellCast" &&
    namedSpellTriggerIds.includes(frame.spellId) &&
    invocation.negatedSpellIds.includes(frame.spellId)
  );
}

function reactionChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  const readiedChoices = [
    ...readiedSpellReactionChoices(state, frame.trigger),
    ...readiedMovementReactionChoices(state, frame.trigger),
  ];
  const triggeredSpellChoices = triggeredReactionSpellChoices(state, frame);
  const modifierChoices = reactionRollOrDamageReductionChoices(state, frame);
  return frame.trigger === "opportunityAttack"
    ? [
        ...readiedChoices,
        ...triggeredSpellChoices,
        ...modifierChoices,
        ...opportunityAttackReactionChoices(
          state,
          frame.moverId,
          frame.threats,
        ),
      ]
    : [...readiedChoices, ...triggeredSpellChoices, ...modifierChoices];
}

function reactionRollOrDamageReductionChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  if (frame.trigger !== "attackHit" && frame.trigger !== "attackDamage") {
    return [];
  }
  return [...state.combatants].flatMap(([reactorId, reactor]) => {
    if (
      reactor.origin.kind !== "character" ||
      !combatantCanTakeReactions(reactor)
    ) {
      return [];
    }
    return [
      ...reactor.origin.reactionRollOrDamageReductionProfiles.values(),
    ].flatMap((profile) =>
      profile.modifiers.flatMap((modifier) =>
        reactionRollOrDamageReductionChoiceForProfile(
          state,
          frame,
          reactorId,
          profile,
          modifier,
        ),
      ),
    );
  });
}

function reactionRollOrDamageReductionChoiceForProfile(
  state: BattleState,
  frame: BattleReactionFrameInput,
  reactorId: CombatantId,
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "reactionRollOrDamageReduction" }
  >,
  modifier: ReactionRollOrDamageReductionProfile,
): readonly BattleReactionProcedureChoice[] {
  if (!reactionModifierResourceAvailable(state, reactorId, profile, modifier)) {
    return [];
  }
  if (
    frame.trigger === "attackHit" &&
    ((modifier.kind === "attackRollReduction" &&
      combatantCanSee(state, reactorId, frame.attackerId)) ||
      (modifier.kind === "attackDamageReduction" &&
        reactorId === frame.targetId &&
        (modifier.requiresVisibleAttacker !== true ||
          combatantCanSee(state, reactorId, frame.attackerId)) &&
        (modifier.damageIncludes === undefined ||
          modifier.damageIncludes.some((damageType) =>
            frame.damageTypes.includes(damageType),
          ))))
  ) {
    if (modifier.kind === "attackDamageReduction") {
      const reactor = state.combatants.get(reactorId);
      if (
        reactor?.origin.kind !== "character" ||
        profile.unit.kind !== "class_feature"
      ) {
        return [];
      }
      const characterReactor = reactor as BattleCreatureState & {
        readonly origin: Extract<
          BattleCreatureState["origin"],
          { readonly kind: "character" }
        >;
      };
      return [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId,
          choice: {
            kind: "attackDamageReduction",
            unitId: profile.unit.id,
            label: profile.unit.name,
            reduction:
              modifier.reduction.kind === "halfDamage"
                ? { kind: "halfDamage" }
                : {
                    kind: "rolled",
                    flatModifier:
                      Number(
                        characterAbilityModifier(characterReactor, "dex"),
                      ) + Number(profile.classLevel),
                    dieSize: modifier.reduction.dieSize,
                  },
            ...(modifier.zeroDamageRedirect === undefined
              ? {}
              : {
                  zeroDamageRedirect: {
                    spends: modifier.zeroDamageRedirect.spends,
                    saveAbility: modifier.zeroDamageRedirect.save.ability,
                    saveDc: abilityProficiencyDifficultyClass(
                      characterReactor,
                      modifier.zeroDamageRedirect.save.dc,
                    ),
                    damageDice: modifier.zeroDamageRedirect.damage.dice,
                    damageAbilityModifier: characterAbilityModifier(
                      characterReactor,
                      modifier.zeroDamageRedirect.damage.ability,
                    ),
                    attackKind: frame.attackKind,
                    targetGate: modifier.zeroDamageRedirect.targetGate,
                    originalDamageType: attackDamageReductionOriginalDamageType(
                      frame.damageTypes,
                      modifier.zeroDamageRedirect.damage.damageType,
                    ),
                  },
                }),
          },
          initialHoles:
            modifier.reduction.kind === "halfDamage"
              ? []
              : [reactionModifierRollHole(profile, "attackDamageReduction")],
        },
      ];
    }
    return [
      {
        kind: "reactionRollOrDamageReduction",
        reactorId,
        choice: {
          kind: "attackRollReduction",
          unitId: profile.unit.id,
          label: profile.unit.name,
          reduction: {
            kind: "rolled",
            dice: modifier.reduction.dice,
            flatModifier: modifier.reduction.flatModifier,
            dieSize: modifier.reduction.dieSize,
            spends: modifier.reduction.spends,
          },
        },
        initialHoles: [
          reactionModifierRollHole(profile, "attackRollReduction"),
        ],
      },
    ];
  }
  if (frame.trigger !== "attackDamage") {
    return [];
  }
  if (
    modifier.kind === "attackDamageRollReduction" &&
    frame.continuation.damageEvent.kind === "rolledDamage" &&
    combatantCanSee(state, reactorId, frame.continuation.attackerId)
  ) {
    return [
      {
        kind: "reactionRollOrDamageReduction",
        reactorId,
        choice: {
          kind: "damageRollReduction",
          unitId: profile.unit.id,
          label: profile.unit.name,
          reduction: {
            kind: "rolled",
            dice: modifier.reduction.dice,
            flatModifier: modifier.reduction.flatModifier,
            dieSize: modifier.reduction.dieSize,
            spends: modifier.reduction.spends,
          },
        },
        initialHoles: [
          reactionModifierRollHole(profile, "damageRollReduction"),
        ],
      },
    ];
  }
  return [];
}

function reactionModifierRollHole(
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "reactionRollOrDamageReduction" }
  >,
  modifierKind: BattleReactionModifierChoice["kind"],
): BattleHole {
  return {
    kind: "rolledDice",
    holeId: REACTION_MODIFIER_ROLL_HOLE_ID,
    holeInstanceKey: REACTION_MODIFIER_ROLL_HOLE_INSTANCE,
    label: `${profile.unit.name} reduction roll`,
    unitFeature: {
      unitId: profile.unit.id,
      label: profile.unit.name,
      modifierKind,
    },
  };
}

function attackDamageReductionZeroDamageRedirectHoles(
  state: BattleState,
  offer: AttackDamageReductionZeroDamageRedirectAvailableOffer,
): readonly BattleHole[] {
  if (
    attackDamageReductionRedirectResourceAvailable(
      state,
      offer.reactorId,
      offer.unitId,
      offer.redirect,
    ) === false
  ) {
    return [];
  }
  const targetChoices = attackDamageReductionZeroDamageRedirectTargetChoices(
    state,
    offer.reactorId,
  );
  return [
    {
      kind: "targetChoice",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_INSTANCE,
      label: `${offer.label} redirect target`,
      choices: targetChoices,
      requiresTableSpatialFact: true,
    },
    {
      kind: "savingThrowOutcome",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_INSTANCE,
      label: `${offer.label} Dexterity saving throw`,
      unitFeature: {
        unitId: offer.unitId,
        label: offer.label,
      },
      ability: offer.redirect.saveAbility,
      dc: { kind: "fixed", dc: offer.redirect.saveDc },
      targetIds: targetChoices,
      targetRollModes: savingThrowRollModeProjections(
        state,
        offer.redirect.saveAbility,
      ),
    },
    {
      kind: "rolledDice",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_INSTANCE,
      label: `${offer.label} redirected damage`,
      unitFeature: {
        unitId: offer.unitId,
        label: offer.label,
        modifierKind: "attackDamageReduction",
      },
    },
  ];
}

function attackDamageReductionZeroDamageRedirectTargetChoices(
  state: BattleState,
  reactorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([targetId, target]) =>
        targetId !== reactorId &&
        !zeroHpLifecycleIsTerminal(target) &&
        combatantCanSee(state, reactorId, targetId),
    )
    .map(([targetId]) => targetId);
}

function attackDamageReductionRedirectResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  unitId: UnitRecord["id"],
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): boolean {
  const reactor = state.combatants.get(reactorId);
  return (
    attackDamageReductionRedirectResource(reactor, unitId, offer) !== undefined
  );
}

function spendAttackDamageReductionRedirectResource(
  state: BattleState,
  reactorId: CombatantId,
  unitId: UnitRecord["id"],
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") {
    return state;
  }
  const resource = attackDamageReductionRedirectResource(
    reactor,
    unitId,
    offer,
  );
  if (resource === undefined) return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      origin: {
        ...reactor.origin,
        resources: reactor.origin.resources.map((candidate) =>
          candidate === resource
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    }),
  };
}

function attackDamageReductionRedirectResource(
  reactor: BattleCreatureState | undefined,
  unitId: UnitRecord["id"],
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): CharacterBattleResourceState | undefined {
  if (reactor?.origin.kind !== "character") return undefined;
  const characterOrigin = reactor.origin;
  return characterOrigin.resources.find(
    (resource) =>
      resource.unit.id === offer.spends.resourceUnitId &&
      unitId === offer.spends.resourceUnitId &&
      offer.spends.amount === 1 &&
      resource.unit.kind === "class_feature" &&
      resource.unit.mechanics.family === "reaction_roll_or_damage_reduction" &&
      battleReactionRollOrDamageReductionSupportForUnit(resource.unit) ===
        "attackDamageReductionZeroDamageRedirect" &&
      resourceHasUsesRemaining(resource),
  );
}

function hasAttackDamageReductionRedirectTargetSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  sourceId: CombatantId,
  targetId: CombatantId,
  attackKind: BattleAttackKindForRedirect,
  targetGate: AttackDamageReductionRedirectTargetGate,
): boolean {
  return Match.value(attackKind).pipe(
    Match.when(
      "melee",
      () =>
        targetGate.melee === "visibleWithin5Feet" &&
        facts.some(
          (fact) =>
            fact.kind === "meleeRedirectTargetWithin5Feet" &&
            fact.sourceId === sourceId &&
            fact.targetId === targetId,
        ),
    ),
    Match.when(
      "ranged",
      () =>
        targetGate.ranged === "visibleWithin60FeetWithoutTotalCover" &&
        facts.some(
          (fact) =>
            fact.kind === "rangedRedirectTargetWithin60FeetWithoutTotalCover" &&
            fact.sourceId === sourceId &&
            fact.targetId === targetId,
        ),
    ),
    Match.exhaustive,
  );
}

function characterAbilityModifier(
  combatant: BattleCreatureState & {
    readonly origin: Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >;
  },
  ability: "dex" | "wis",
): AbilityModifier {
  return combatant.armorClass.abilityModifiers[ability];
}

export function abilityProficiencyDifficultyClass(
  combatant: BattleCreatureState & {
    readonly origin: Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >;
  },
  dc: {
    readonly base: 8;
    readonly ability: "wis";
  },
): DifficultyClass {
  return difficultyClass(
    dc.base +
      Number(characterAbilityModifier(combatant, dc.ability)) +
      combatantProficiencyBonus(combatant),
  );
}

function attackDamageReductionOriginalDamageType(
  damageTypes: readonly DamageType[],
  damageTypeProjection: "sameTypeDealtByAttack",
): DamageType {
  return Match.value(damageTypeProjection).pipe(
    Match.when(
      "sameTypeDealtByAttack",
      () =>
        damageTypes.find(
          (damageType) =>
            damageType === "bludgeoning" ||
            damageType === "piercing" ||
            damageType === "slashing",
        ) ?? "bludgeoning",
    ),
    Match.exhaustive,
  );
}

function reactionModifierResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "reactionRollOrDamageReduction" }
  >,
  modifier: ReactionRollOrDamageReductionProfile,
): boolean {
  if (
    modifier.kind === "attackDamageReduction" &&
    modifier.zeroDamageRedirect !== undefined
  ) {
    return true;
  }
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") return false;
  const resourceSpend = reactionModifierResourceSpend(modifier);
  if (resourceSpend !== null) {
    const resource = reactor.origin.resources.find(
      (candidate) => candidate.unit.id === resourceSpend.resourceUnitId,
    );
    return resource !== undefined && resourceHasUsesRemaining(resource);
  }
  const resource = reactor.origin.resources.find(
    (candidate) => candidate.unit.id === profile.unit.id,
  );
  return resource === undefined || resourceHasUsesRemaining(resource);
}

function reactionModifierResourceSpend(
  modifier: ReactionRollOrDamageReductionProfile,
): ReactionReductionResourceSpend | null {
  return "spends" in modifier.reduction ? modifier.reduction.spends : null;
}

function opportunityAttackReactionChoices(
  state: BattleState,
  moverId: CombatantId,
  threats: readonly BattleOpportunityAttackThreat[],
): readonly BattleReactionProcedureChoice[] {
  return threats.flatMap((threat) => {
    const reactorId = threat.reactorId;
    const reactor = state.combatants.get(reactorId);
    if (reactor === undefined) {
      return [];
    }
    const attack = opportunityAttackOptionForReactor(
      state,
      reactorId,
      moverId,
      threat.attackName,
    );
    if (attack === undefined) return [];
    return [
      {
        kind: "opportunityAttack" as const,
        reactorId,
        initialHoles: [],
        subject: {
          tag: "runtimeCommand" as const,
          actorId: currentActorId(state),
          command: "opportunityAttack" as const,
          reactorId,
          targetId: moverId,
          attackName: attackActionOptionName(attack),
        },
      },
    ];
  });
}


export function battleCreatureInitFromStatBlock(
  input: StatBlockBattleInitInput,
): BattleCreatureInit {
  const maxHp = Hp(literalStatBlockNumber(input.statBlock.statBlock.hp));
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: input.initiative,
    side: input.side,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: input.currentHp ?? maxHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
    },
  };
}

// scoreModifier moved to ./battle-reducer/domain-helpers.ts (re-exported below)


function resolveAttack(
  input: AttackBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];

  const attack = attackActionOptionForSubject(input.state, subject);
  if (attack == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Attack resolution requires a supported Attack action option.",
    );
  }

  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }

  if (fillSet.targetId == null) {
    if (fillSet.attackRoll != null || fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack target must be filled before attack roll or damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId, attack),
    ]);
  }

  const target = input.state.combatants.get(fillSet.targetId);
  if (target == null || target.combatantId === input.subject.actorId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target must be another combatant in this battle.",
    );
  }
  if (
    !attackTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      attack,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target is outside the selected attack's supported target constraint.",
    );
  }
  if (
    fillSet.damageDisposition.kind === "knockOut" &&
    !attackCanCarryKnockOutChoice(attack)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Knock Out can only be chosen for melee attack damage.",
    );
  }

  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack roll must be filled before attack damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        input.state.combatants.get(input.subject.actorId),
        attack,
        requiredAttackRollMode(
          input.state,
          input.subject.actorId,
          target.combatantId,
          attack,
          fillSet.targetSpatialFacts,
        ),
        attackRollOngoingFeatureActivations(
          input.state,
          input.subject.actorId,
          attack,
        ),
      ),
    ]);
  }

  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  const activatedOngoingFeatureProfile =
    attackRollOngoingFeatureActivationProfile(
      input.state,
      input.subject.actorId,
      attack,
      fillSet.attackRoll.activatedOngoingFeatureUnitId,
      input.replayingInterruptedProcedure === true ||
        fillSet.damageRoll != null,
    );
  if (
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    activatedOngoingFeatureProfile === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack-roll ongoing feature activation is not available for this attack roll.",
    );
  }
  const requiredRollMode = attackRollModeWithOptionalOngoingFeature(
    input.state,
    input.subject.actorId,
    target.combatantId,
    attack,
    fillSet.targetSpatialFacts,
    fillSet.attackRoll.activatedOngoingFeatureUnitId,
  );
  if (
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    fillSet.attackRoll.rollMode !== requiredRollMode
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the activated ongoing feature rule.",
    );
  }
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the current attack-roll rule.",
    );
  }

  const attacker = input.state.combatants.get(input.subject.actorId);
  const criticalThreshold = criticalThresholdForAttack(attacker, attack);
  const ordinaryHit = attackRollHitsWithCriticalThreshold(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
    criticalThreshold,
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.state,
    subject: input.subject,
    attackerId: input.subject.actorId,
    targetId: target.combatantId,
    attackRoll: fillSet.attackRoll,
    ordinaryHit,
  });
  if (
    fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
    missToHitReplacement === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      ordinaryHit
        ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
        : "Attack-roll miss-to-hit replacement is not available for this attack roll.",
    );
  }
  const hit = ordinaryHit || missToHitReplacement !== null;
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        revealHidden(input.state, input.subject.actorId),
        input.subject.actorId,
        target.combatantId,
        activatedOngoingFeatureProfile,
      ),
      input.subject.actorId,
      target.combatantId,
    ),
    input.subject.actorId,
    missToHitReplacement,
    {
      subject: input.subject,
      targetId: target.combatantId,
      attackRoll: fillSet.attackRoll,
    },
  );
  const critical = attackRollIsCriticalHit(
    fillSet.attackRoll,
    criticalThreshold,
  );
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        input.subject.actorId,
        target.combatantId,
        attack,
        fillSet.attackRoll,
        fillSet.targetSpatialFacts,
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceUnitIds(
        attackRolledState,
        input.subject.actorId,
        attack,
      )
    : [];
  const spellWeaponDamageRiders = hit
    ? activeSpellWeaponDamageRiders(
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      )
    : [];
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(input.subject.actorId),
        target.combatantId,
      )
    : [];
  const selectedDamageRiders =
    fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          fillSet.damageRoll.selectedAttackDamageRiderUnitIds,
        ) ?? []);
  const fixedDamageByTypeBeforeTargetAdjustments = hit
    ? spellMarkedDamageRiders.length > 0
      ? null
      : fixedAttackDamageByTypeEntries(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        )
    : null;
  const fixedDamageAmount =
    fixedDamageByTypeBeforeTargetAdjustments === null
      ? null
      : damageAmountByTypeAfterTargetAdjustments(
          target,
          damageAmountByTypeEntriesToMap(
            fixedDamageByTypeBeforeTargetAdjustments,
          ),
        );
  if (hit && input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
          eligibleDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        ),
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: attackFillsThroughAttackRoll(input.fills),
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (
    hit &&
    fixedDamageAmount !== null &&
    fixedDamageByTypeBeforeTargetAdjustments !== null
  ) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Fixed Unarmed Strike damage does not use a rolled damage fill.",
      );
    }
    const damageEvent = {
      kind: "aggregateDamage" as const,
      damageByTypeBeforeTargetAdjustments:
        fixedDamageByTypeBeforeTargetAdjustments,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
    );
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
    if (spellReduction.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...attackRolledState,
      combatants: new Map(attackRolledState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const reducedFixedDamageAmount = attackDamageEventAmountForTarget(
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const reducedFixedDamageBeforeTargetAdjustments =
      attackDamageEventAmountBeforeTargetAdjustments(
        reducedDamageEventAfterSpellReduction,
      );
    const redirectState =
      resolveAttackDamageReductionZeroDamageRedirectAfterReduction({
        state: spellReducedState,
        reductions: pendingAttackDamageReductions,
        reducedDamageBeforeTargetAdjustments:
          reducedFixedDamageBeforeTargetAdjustments,
        redirectTarget: fillSet.attackDamageReductionRedirectTarget,
        redirectSave: fillSet.attackDamageReductionRedirectSave,
        redirectDamage: fillSet.attackDamageReductionRedirectDamage,
      });
    if (redirectState.tag === "invalid") {
      return invalidResult(input.state, "invalidFill", redirectState.message);
    }
    if (redirectState.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...redirectState.holes,
      ]);
    }
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target: spellReduction.target,
      damageAmount: reducedFixedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
      value: fillSet.damageDisposition,
    });
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      redirectState.state,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: [],
        },
      },
      input.suppressedReactionTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendAttackAction(
        attackDamageReactionWindow.state,
        input.subject.actorId,
        attack,
      );
      return spent.tag === "invalid"
        ? spent
        : {
            ...attackDamageReactionWindow,
            state: spent.state,
            snapshot: snapshotBattle(spent.state),
          };
    }
    const concentrationSave = concentrationSavingThrowHole(
      spellReduction.target,
      reducedFixedDamageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsAttackDamageConcentrationResult({
          state: redirectState.state,
          subject: input.subject,
          attack,
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEventAfterSpellReduction,
            fills: attackDamagePrefixFills(input.fills),
            deathFailuresAtZeroHp: critical ? 2 : 1,
            damageDisposition: fillSet.damageDisposition,
            attackDamageRiders: [],
          },
          concentrationSave,
        });
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
    const spent = spendAttackAction(
      applyAttackDamageAmount(
        redirectState.state,
        input.subject.actorId,
        target.combatantId,
        toDamageAmount(reducedFixedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        [],
        undefined,
        fillSet.concentrationSavingThrow,
      ),
      input.subject.actorId,
      attack,
    );
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenReactionWindow(
      spent.state,
      {
        trigger: "afterDamage",
        damageSourceId: input.subject.actorId,
        damagedId: target.combatantId,
        damageAmount: toDamageAmount(reducedFixedDamageAmount),
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return spent;
  }
  if (hit && fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        fillSet.attackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
      ),
    ]);
  }
  if (!hit && (fillSet.damageRoll != null || fillSet.damageDispositionFilled)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage can only be filled after a hit.",
    );
  }
  if (hit && fillSet.damageRoll != null) {
    const selectedDamageDiceChoice = selectedWeaponDamageDiceRollChoice(
      eligibleDamageDiceChoiceUnitIds,
      fillSet.damageRoll.weaponDamageDiceRollChoice,
    );
    const damageValidation = validateAttackDamageFill(
      fillSet.damageRoll,
      attack,
      critical,
      fillSet.attackRoll,
      eligibleDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingFeatureDamageModifier(
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      ),
      eligibleDamageDiceChoiceUnitIds,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    const damageRollByType = attackDamageByTypeEntries(
      attackRolledState.combatants.get(input.subject.actorId),
      attack,
      fillSet.damageRoll,
      critical,
      fillSet.attackRoll,
      selectedDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
    );
    const damageEvent = {
      kind: "rolledDamage" as const,
      damageRollByType,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
    );
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
    if (spellReduction.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...attackRolledState,
      combatants: new Map(attackRolledState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const reducedDamageAmount = attackDamageEventAmountForTarget(
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const reducedDamageBeforeTargetAdjustments =
      attackDamageEventAmountBeforeTargetAdjustments(
        reducedDamageEventAfterSpellReduction,
      );
    const redirectState =
      resolveAttackDamageReductionZeroDamageRedirectAfterReduction({
        state: spellReducedState,
        reductions: pendingAttackDamageReductions,
        reducedDamageBeforeTargetAdjustments,
        redirectTarget: fillSet.attackDamageReductionRedirectTarget,
        redirectSave: fillSet.attackDamageReductionRedirectSave,
        redirectDamage: fillSet.attackDamageReductionRedirectDamage,
      });
    if (redirectState.tag === "invalid") {
      return invalidResult(input.state, "invalidFill", redirectState.message);
    }
    if (redirectState.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...redirectState.holes,
      ]);
    }
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target: spellReduction.target,
      damageAmount: reducedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
      value: fillSet.damageDisposition,
    });
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      redirectState.state,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: selectedDamageRiders,
          ...(selectedDamageDiceChoice === null
            ? {}
            : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
        },
      },
      input.suppressedReactionTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendAttackAction(
        attackDamageReactionWindow.state,
        input.subject.actorId,
        attack,
      );
      return spent.tag === "invalid"
        ? spent
        : {
            ...attackDamageReactionWindow,
            state: spent.state,
            snapshot: snapshotBattle(spent.state),
          };
    }
    const concentrationSave = concentrationSavingThrowHole(
      spellReduction.target,
      reducedDamageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsAttackDamageConcentrationResult({
          state: redirectState.state,
          subject: input.subject,
          attack,
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEventAfterSpellReduction,
            fills: attackDamagePrefixFills(input.fills),
            deathFailuresAtZeroHp: critical ? 2 : 1,
            damageDisposition: fillSet.damageDisposition,
            attackDamageRiders: selectedDamageRiders,
            ...(selectedDamageDiceChoice === null
              ? {}
              : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
          },
          concentrationSave,
        });
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
    const spent = spendAttackAction(
      applyAttackDamageAmount(
        redirectState.state,
        input.subject.actorId,
        target.combatantId,
        toDamageAmount(reducedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        selectedDamageRiders,
        selectedDamageDiceChoice ?? undefined,
        fillSet.concentrationSavingThrow,
      ),
      input.subject.actorId,
      attack,
    );
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenReactionWindow(
      spent.state,
      {
        trigger: "afterDamage",
        damageSourceId: input.subject.actorId,
        damagedId: target.combatantId,
        damageAmount: toDamageAmount(reducedDamageAmount),
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return spent;
  }

  return spendAttackAction(
    hit
      ? applyAttackDamage(
          attackRolledState,
          input.subject.actorId,
          target.combatantId,
          attack,
          fillSet,
          critical,
          selectedDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        )
      : attackRolledState,
    input.subject.actorId,
    attack,
  );
}

function needsAttackDamageConcentrationResult(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attack: SupportedAttackActionOption;
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly concentrationSave: BattleConcentrationSavingThrowHole;
}): BattleResolutionResult {
  const pendingState = {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack,
      attackDamageContinuationConcentrationFrame(
        input.continuation,
        "attackDamage",
      ),
    ],
  };
  const spent = spendAttackAction(
    pendingState,
    input.subject.actorId,
    input.attack,
  );
  return spent.tag === "invalid"
    ? spent
    : needsHolesResult(spent.state, input.subject, [input.concentrationSave]);
}

function resolveDash(input: BattleResolutionInput): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dash actor is not in this battle.",
    );
  }
  const speedKind =
    input.subject.tag === "action" && input.subject.action === "dash"
      ? input.subject.speedKind
      : "walk";
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "dash");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  const nextState = applyDashToActor(
    input.state,
    actor,
    speedKind,
    spent.right,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyDashToActor(
  state: BattleState,
  actor: BattleCreatureState,
  speedKind: BattleMovementSpeedKind,
  spentResources: BattleTurnResources,
): BattleState {
  const speed = effectiveMovementSpeed(
    actor,
    speedKind,
    state.grapples.some((grapple) => grapple.targetId === actor.combatantId),
  );
  return {
    ...state,
    currentTurnResources: {
      ...spentResources,
      dashMovementBonusFeet: movementFeet(
        Number(spentResources.dashMovementBonusFeet) + Number(speed),
      ),
    },
  };
}

function resolveDisengage(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "disengage");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  const nextState = applyDisengage(input.state, spent.right);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveBonusActionStandardAction(
  input: BonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !actorHasAlternateActionCost(
      actor,
      input.subject.sourceUnitId,
      input.subject.action,
    ) &&
    (input.subject.action !== "dash" ||
      bonusActionDashTemporaryHitPointsForActor(
        actor,
        input.subject.sourceUnitId,
      ) === null)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action standard action requires an admitted alternate action cost feature.",
    );
  }

  return Match.value(input.subject.action).pipe(
    Match.when("dash", () => resolveBonusActionDash(input)),
    Match.when("disengage", () => resolveBonusActionDisengage(input)),
    Match.when("hide", () =>
      resolveHide({
        ...input,
        subject: { ...input.subject, action: "hide" },
      }),
    ),
    Match.exhaustive,
  );
}

function resolveBonusActionDash(
  input: BonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dash actor is not in this battle.",
    );
  }
  const dashTemporaryHitPoints = bonusActionDashTemporaryHitPointsForActor(
    actor,
    input.subject.sourceUnitId,
  );
  const speedKind =
    input.subject.action === "dash" ? input.subject.speedKind : "walk";
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  const nextState = applyDashToActor(
    input.state,
    actor,
    speedKind,
    spent.right,
  );
  if (dashTemporaryHitPoints !== null) {
    if (!isCharacterBattleCreatureState(actor)) {
      return invalidResult(
        input.state,
        "unsupportedActOption",
        "Bonus Action Dash Temporary Hit Points requires a character feature resource.",
      );
    }
    return resolveBonusActionDashTemporaryHitPoints(
      nextState,
      actor,
      input.subject.sourceUnitId,
    );
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveBonusActionDashTemporaryHitPoints(
  dashedState: BattleState,
  actor: CharacterBattleCreatureState,
  sourceUnitId: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const nextActor = applyTemporaryHitPoints(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === sourceUnitId
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    },
    combatantProficiencyBonus(actor),
  );
  const nextState = {
    ...dashedState,
    combatants: new Map(dashedState.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}


function resolveBonusActionDisengage(
  input: BonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  const nextState = applyDisengage(input.state, spent.right);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyDisengage(
  state: BattleState,
  spentResources: BattleTurnResources,
): BattleState {
  return {
    ...state,
    currentTurnResources: { ...spentResources, disengaged: true },
  };
}

function resolveDodge(input: BattleResolutionInput): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Dodge accepts no fills.");
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dodge actor is not in this battle.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "dodge");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dodge is no longer available.",
    );
  }
  const combatants = new Map(input.state.combatants).set(actor.combatantId, {
    ...actor,
    dodging: true,
  });
  const nextState = {
    ...input.state,
    combatants,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveReady(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "action"; readonly action: "ready" }>
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Ready accepts no fills.");
  }
  const spent = spendAction(input.state.currentTurnResources, "ready");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready is no longer available.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
    readiedMovements: new Map(input.state.readiedMovements).set(
      input.subject.actorId,
      {
        trigger: input.subject.readyTrigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveHelpAttack(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "helpAttack" }
    >
  >,
): BattleResolutionResult {
  const [allyFill, targetFillValue] = input.fills;
  if (allyFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      helpAttackAllyHole(input.state, input.subject.actorId),
    ]);
  }
  if (
    allyFill.kind !== "targetChoice" ||
    allyFill.holeId !== HELP_ATTACK_ALLY_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires an ally target fill first.",
    );
  }
  const allyId = allyFill.value;
  if (
    !helpAttackAllyChoices(input.state, input.subject.actorId).includes(allyId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help ally must be another live combatant.",
    );
  }
  if (targetFillValue === undefined) {
    return needsHolesResult(input.state, input.subject, [
      helpAttackTargetHole(input.state, input.subject.actorId, allyId),
    ]);
  }
  if (
    input.fills.length > 2 ||
    targetFillValue.kind !== "targetChoice" ||
    targetFillValue.holeId !== HELP_ATTACK_TARGET_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires one enemy target fill.",
    );
  }
  const targetEnemyId = targetFillValue.value;
  if (
    !helpAttackTargetChoices(
      input.state,
      input.subject.actorId,
      allyId,
    ).includes(targetEnemyId) ||
    !hasHelpAttackTargetSpatialFact(
      targetFillValue.spatialFacts ?? [],
      input.subject.actorId,
      targetEnemyId,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help target must be an enemy within 5 feet of the helper.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "help");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Help is no longer available.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
    helpAttacks: [
      ...input.state.helpAttacks,
      {
        helperId: input.subject.actorId,
        allyId,
        targetEnemyId,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ],
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveHide(input: HideBattleResolutionInput): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined || !combatantCanTakeActions(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusActionStandardAction" &&
    !actorHasAlternateActionCost(
      actor,
      input.subject.sourceUnitId,
      input.subject.action,
    )
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action Hide requires an admitted alternate action cost feature.",
    );
  }
  if (!canHideInCurrentCircumstances(input.state, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Hide requires Heavily Obscured or sufficient cover and being out of enemy line of sight.",
    );
  }
  const check = abilityCheckFill(
    input.fills,
    HIDE_ABILITY_CHECK_HOLE_ID,
    "Hide",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      hideAbilityCheckHole(),
    ]);
  }

  const spent =
    input.subject.tag === "bonusActionStandardAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(input.state.currentTurnResources, "hide");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: difficultyClass(check.value.value.total) }
      : null;
  const nextActor = { ...actor, hidden };
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveMultiattack(
  input: MultiattackBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Multiattack accepts no fills.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  const origin = actor.origin;
  const multiattack = supportedStatBlockMultiattacks(origin.statBlock).find(
    (candidate) => candidate.multiattack.name === input.subject.multiattackName,
  );
  if (multiattack === undefined) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  if (
    !multiattack.dispatches.every((dispatch) =>
      statBlockAttackResourceAvailable(
        origin.statBlock.statBlock,
        origin.resources,
        dispatch,
      ),
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Multiattack Stat Block resources are no longer available.",
    );
  }
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }
  const [consumedDispatch, ...pendingDispatches] = multiattack.dispatches;
  const nextStateWithPendingDispatches = {
    ...input.state,
    currentTurnResources: {
      ...spent.right,
      actionResources: [
        ...spent.right.actionResources,
        ...pendingDispatches.map((dispatch) => ({
          kind: "action" as const,
          source: "statBlockMultiattack" as const,
          sourceOwnerId: input.subject.actorId,
          attackPart: { section: "actions" as const, name: dispatch.part.name },
          restriction: {
            kind: "exclude" as const,
            actions: ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
          },
        })),
      ],
    },
  };
  const nextState =
    consumedDispatch === undefined
      ? nextStateWithPendingDispatches
      : spendStatBlockAttackResources({
          state: nextStateWithPendingDispatches,
          actorId: input.subject.actorId,
          attack: consumedDispatch,
        });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSearch(
  input: SearchBattleResolutionInput,
): BattleResolutionResult {
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      searchTargetHole(input.state, input.subject.actorId),
    ]);
  }
  if (targetFill.holeId !== SEARCH_TARGET_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target fill does not match the requested hole.",
    );
  }
  const target = input.state.combatants.get(targetFill.value);
  if (
    target === undefined ||
    target.combatantId === input.subject.actorId ||
    target.hidden === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target must be a hidden combatant in this battle.",
    );
  }
  const check = abilityCheckFill(
    input.fills.filter((fill) => fill.kind !== "targetChoice"),
    SEARCH_ABILITY_CHECK_HOLE_ID,
    "Search",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      searchAbilityCheckHole(target.hidden.discoveryDc),
    ]);
  }
  const spent = spendAction(input.state.currentTurnResources, "search");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Search is no longer available for the current actor.",
    );
  }
  const found = check.value.value.total >= target.hidden.discoveryDc;
  const nextTarget = found ? { ...target, hidden: null } : target;
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function helpAttackAllyHole(
  state: BattleState,
  helperId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeInstanceKey: HELP_ATTACK_ALLY_HOLE_INSTANCE,
    holeId: HELP_ATTACK_ALLY_HOLE_ID,
    label: "Help ally",
    choices: helpAttackAllyChoices(state, helperId),
  };
}

function helpAttackTargetHole(
  state: BattleState,
  helperId: CombatantId,
  allyId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeInstanceKey: HELP_ATTACK_TARGET_HOLE_INSTANCE,
    holeId: HELP_ATTACK_TARGET_HOLE_ID,
    label: "Help attack target",
    requiresTableSpatialFact: true,
    choices: helpAttackTargetChoices(state, helperId, allyId),
  };
}

function helpAttackAllyChoices(
  state: BattleState,
  helperId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([id, combatant]) =>
        id !== helperId &&
        combatantsAreAllies(state, helperId, id) &&
        !zeroHpLifecycleIsTerminal(combatant),
    )
    .map(([id]) => id);
}

function helpAttackTargetChoices(
  state: BattleState,
  helperId: CombatantId,
  allyId: CombatantId,
): readonly CombatantId[] {
  if (!helpAttackAllyChoices(state, helperId).includes(allyId)) return [];
  return [...state.combatants]
    .filter(
      ([id, combatant]) =>
        id !== helperId &&
        id !== allyId &&
        combatantsAreEnemies(state, helperId, id) &&
        !zeroHpLifecycleIsTerminal(combatant),
    )
    .map(([id]) => id);
}

function hasHelpAttackTargetSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  helperId: CombatantId,
  targetEnemyId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "helpAttackTargetWithin5Feet" &&
      fact.helperId === helperId &&
      fact.targetEnemyId === targetEnemyId,
  );
}

function resolveOffHandAttack(
  input: OffHandAttackBattleResolutionInput,
): BattleResolutionResult {
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];
  const attack = offHandAttackActionOptionForActor(
    input.state,
    input.subject.actorId,
  );
  if (
    attack == null ||
    attackActionOptionName(attack) !== input.subject.attackName ||
    !offHandAttackPrerequisiteMet(input.state, input.subject.actorId, attack)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Light Property Bonus Action Attack requires a prior Attack action attack with a different Light weapon.",
    );
  }

  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId, attack),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    target.combatantId === input.subject.actorId ||
    !attackTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      attack,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Light Property Bonus Action Attack target is outside the selected attack's supported target constraint.",
    );
  }
  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Light Property Bonus Action Attack roll must be filled before damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        input.state.combatants.get(input.subject.actorId),
        attack,
        requiredAttackRollMode(
          input.state,
          input.subject.actorId,
          target.combatantId,
          attack,
          fillSet.targetSpatialFacts,
        ),
        attackRollOngoingFeatureActivations(
          input.state,
          input.subject.actorId,
          attack,
        ),
      ),
    ]);
  }
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Light Property Bonus Action Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  const activatedOngoingFeatureProfile =
    attackRollOngoingFeatureActivationProfile(
      input.state,
      input.subject.actorId,
      attack,
      fillSet.attackRoll.activatedOngoingFeatureUnitId,
      fillSet.damageRoll != null,
    );
  if (
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    activatedOngoingFeatureProfile === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Light Property Bonus Action Attack ongoing feature activation is not available for this attack roll.",
    );
  }
  const requiredRollMode = attackRollModeWithOptionalOngoingFeature(
    input.state,
    input.subject.actorId,
    target.combatantId,
    attack,
    fillSet.targetSpatialFacts,
    fillSet.attackRoll.activatedOngoingFeatureUnitId,
  );
  if (
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    fillSet.attackRoll.rollMode !== requiredRollMode
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Light Property Bonus Action Attack roll mode does not match the activated ongoing feature rule.",
    );
  }
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Light Property Bonus Action Attack roll mode does not match the current attack-roll rule.",
    );
  }
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(input.subject.actorId),
    attack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
    criticalThreshold,
  );
  const attackRolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, input.subject.actorId),
      input.subject.actorId,
      target.combatantId,
      activatedOngoingFeatureProfile,
    ),
    input.subject.actorId,
    target.combatantId,
  );
  const critical = attackRollIsCriticalHit(
    fillSet.attackRoll,
    criticalThreshold,
  );
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        input.subject.actorId,
        target.combatantId,
        attack,
        fillSet.attackRoll,
        fillSet.targetSpatialFacts,
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceUnitIds(
        attackRolledState,
        input.subject.actorId,
        attack,
      )
    : [];
  const spellWeaponDamageRiders = hit
    ? activeSpellWeaponDamageRiders(
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      )
    : [];
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(input.subject.actorId),
        target.combatantId,
      )
    : [];
  const selectedDamageRiders =
    fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          fillSet.damageRoll.selectedAttackDamageRiderUnitIds,
        ) ?? []);
  if (hit && input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
          eligibleDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        ),
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: attackFillsThroughAttackRoll(input.fills),
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (hit && fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        fillSet.attackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
      ),
    ]);
  }
  if (!hit && (fillSet.damageRoll != null || fillSet.damageDispositionFilled)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Light Property Bonus Action Attack damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return spendOffHandBonusAction(attackRolledState);
  }
  if (hit && fillSet.damageRoll != null) {
    const selectedDamageDiceChoice = selectedWeaponDamageDiceRollChoice(
      eligibleDamageDiceChoiceUnitIds,
      fillSet.damageRoll.weaponDamageDiceRollChoice,
    );
    const damageValidation = validateAttackDamageFill(
      fillSet.damageRoll,
      attack,
      critical,
      fillSet.attackRoll,
      eligibleDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingFeatureDamageModifier(
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      ),
      eligibleDamageDiceChoiceUnitIds,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    const damageRollByType = attackDamageByTypeEntries(
      attackRolledState.combatants.get(input.subject.actorId),
      attack,
      fillSet.damageRoll,
      critical,
      fillSet.attackRoll,
      selectedDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
    );
    const damageEvent = {
      kind: "rolledDamage" as const,
      damageRollByType,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
    );
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
    if (spellReduction.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...attackRolledState,
      combatants: new Map(attackRolledState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const damageAmount = attackDamageEventAmountForTarget(
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target: spellReduction.target,
      damageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
      value: fillSet.damageDisposition,
    });
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      spellReducedState,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: selectedDamageRiders,
          ...(selectedDamageDiceChoice === null
            ? {}
            : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
        },
      },
      input.suppressedReactionTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendOffHandBonusAction(attackDamageReactionWindow.state);
      return spent.tag === "invalid"
        ? spent
        : {
            ...attackDamageReactionWindow,
            state: spent.state,
            snapshot: snapshotBattle(spent.state),
          };
    }
    const concentrationSave = concentrationSavingThrowHole(
      spellReduction.target,
      damageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsHolesResult(attackRolledState, input.subject, [
          concentrationSave,
        ]);
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
    const damaged = applyAttackDamageAmount(
      spellReducedState,
      input.subject.actorId,
      target.combatantId,
      damageAmount,
      critical ? 2 : 1,
      fillSet.damageDisposition,
      selectedDamageRiders,
      selectedDamageDiceChoice ?? undefined,
      fillSet.concentrationSavingThrow,
    );
    const spent = spendOffHandBonusAction(damaged);
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenReactionWindow(
      spent.state,
      {
        trigger: "afterDamage",
        damageSourceId: input.subject.actorId,
        damagedId: target.combatantId,
        damageAmount,
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return spent;
  }

  return spendOffHandBonusAction(attackRolledState);
}

function spendOffHandBonusAction(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spent = spendActivationResource(state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...state,
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveStatBlockBonusActionOption(
  input: StatBlockBonusActionOptionBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  const statBlockActor = actor;
  const origin = statBlockActor.origin;
  const option = supportedStatBlockBonusActionOptions(origin.statBlock).find(
    (candidate) =>
      candidate.option.name === input.subject.optionName &&
      candidate.option.options.some(
        (standardAction) => standardAction === input.subject.standardAction,
      ),
  );
  if (option === undefined) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  if (
    !statBlockPartLimitedUseAvailable(
      origin.statBlock.statBlock,
      origin.resources,
      option.part,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stat Block Bonus Action resource is no longer available.",
    );
  }
  if (
    !supportedStatBlockBonusActionStandardAction(input.subject.standardAction)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted standard action option.",
    );
  }
  const standardAction = input.subject.standardAction;

  return Match.value(standardAction).pipe(
    Match.when("disengage", () =>
      resolveStatBlockBonusActionDisengage(input, statBlockActor, option.part),
    ),
    Match.when("hide", () =>
      resolveStatBlockBonusActionHide(input, statBlockActor, option.part),
    ),
    Match.exhaustive,
  );
}

function resolveStatBlockBonusActionDisengage(
  input: StatBlockBonusActionOptionBattleResolutionInput,
  actor: StatBlockBattleCreatureState,
  part: StatBlockPartKey,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Bonus Action Disengage accepts no fills.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  const nextState = updateStatBlockActorResources(
    {
      ...input.state,
      currentTurnResources: { ...spent.right, disengaged: true },
    },
    actor,
    part,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveStatBlockBonusActionHide(
  input: StatBlockBonusActionOptionBattleResolutionInput,
  actor: StatBlockBattleCreatureState,
  part: StatBlockPartKey,
): BattleResolutionResult {
  if (!canHideInCurrentCircumstances(input.state, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Hide requires Heavily Obscured or sufficient cover and being out of enemy line of sight.",
    );
  }
  const check = abilityCheckFill(
    input.fills,
    HIDE_ABILITY_CHECK_HOLE_ID,
    "Hide",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      hideAbilityCheckHole(),
    ]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: difficultyClass(check.value.value.total) }
      : null;
  const nextState = updateStatBlockActorResources(
    normalizeBattleGrapples({
      ...input.state,
      currentTurnResources: spent.right,
      combatants: new Map(input.state.combatants).set(actor.combatantId, {
        ...actor,
        hidden,
      }),
    }),
    actor,
    part,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveGrapple(
  input: GrappleBattleResolutionInput,
): BattleResolutionResult {
  const fillSet = grappleFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill?.holeId !== GRAPPLE_TARGET_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple target fill does not match the requested hole.",
    );
  }
  const link = grappleLinkForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
    fillSet.targetSpatialFacts,
  );
  if (link.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", link.message);
  }
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleOutcomeHole(link.link),
    ]);
  }
  if (fillSet.outcome.holeId !== GRAPPLE_OUTCOME_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple outcome fill does not match the requested hole.",
    );
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is no longer available for the current actor.",
    );
  }
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    input.state,
    input.subject.actorId,
    [fillSet.targetId],
  );
  const nextState = normalizeBattleGrapples({
    ...savingThrowExtendedState,
    currentTurnResources: spent.right,
    grapples: fillSet.outcome.value.succeeded
      ? savingThrowExtendedState.grapples
      : [...savingThrowExtendedState.grapples, link.link],
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveEscapeGrapple(
  input: EscapeGrappleBattleResolutionInput,
): BattleResolutionResult {
  const grapple = grappledBy(input.state, input.subject.actorId);
  if (grapple === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No Grapple is available to escape.",
    );
  }
  const fillSet = grappleFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple does not use a target fill.",
    );
  }
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      escapeGrappleOutcomeHole(grapple, input.subject.actorId),
    ]);
  }
  if (fillSet.outcome.holeId !== ESCAPE_GRAPPLE_OUTCOME_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple outcome fill does not match the requested hole.",
    );
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const spent = spendMatchingActionResource(
    input.state.currentTurnResources,
    "attack",
    (resource) =>
      !isClassFeatureExtraAttackActionResource(resource, input.subject.actorId),
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is no longer available for the current actor.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    currentTurnResources: spent.right,
    grapples: fillSet.outcome.value.succeeded
      ? input.state.grapples.filter((candidate) => candidate !== grapple)
      : input.state.grapples,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveEscapeSpellRestraint(
  input: EscapeSpellRestraintBattleResolutionInput,
): BattleResolutionResult {
  const effect = spellRestraintEffectFor(
    input.state,
    input.subject.actorId,
    input.subject.sourceSpellId,
    input.subject.sourceCombatantId,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No spell-imposed Restraint is available to escape.",
    );
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape spell Restraint is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const dc = spellSaveDcForCaster(input.state, effect.sourceCombatantId);
  if (dc === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spell-imposed Restraint escape DC is no longer available.",
    );
  }
  const check = abilityCheckFill(
    input.fills,
    ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
    "Escape spell Restraint",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      escapeSpellRestraintAbilityCheckHole(input.state, effect),
    ]);
  }
  const spent = spendAction(input.state.currentTurnResources, "utilize");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape spell Restraint is no longer available for the current actor.",
    );
  }
  const nextState =
    check.value.value.total >= dc
      ? removeSpellConditionEffect(
          {
            ...input.state,
            currentTurnResources: spent.right,
          },
          input.subject.actorId,
          effect,
        )
      : {
          ...input.state,
          currentTurnResources: spent.right,
        };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveReleaseGrappleCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
    >
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Grapple does not use fills.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    grapples: input.state.grapples.filter(
      (grapple) =>
        !(
          grapple.grapplerId === input.subject.actorId &&
          grapple.targetId === input.subject.targetId
        ),
    ),
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}


export type AttackFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly attackRoll: BattleAttackRollResult | undefined;
      readonly concentrationSavingThrow:
        | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
        | undefined;
      readonly damageDisposition: BattleAttackDamageDisposition;
      readonly damageDispositionFilled: boolean;
      readonly damageRoll: BattleRolledDiceFill | undefined;
      readonly spellDamageReductionRoll: BattleRolledDiceFill | undefined;
      readonly attackDamageReductionRedirectTarget:
        | Extract<BattleFill, { readonly kind: "targetChoice" }>
        | undefined;
      readonly attackDamageReductionRedirectSave:
        | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
        | undefined;
      readonly attackDamageReductionRedirectDamage:
        | BattleRolledDiceFill
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };
type GrappleFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly outcome:
        | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function attackFillSet(fills: readonly BattleFill[]): AttackFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let attackRoll: BattleAttackRollResult | undefined;
  let concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  let damageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  };
  let damageDispositionFilled = false;
  let damageRoll: BattleRolledDiceFill | undefined;
  let spellDamageReductionRoll: BattleRolledDiceFill | undefined;
  let attackDamageReductionRedirectTarget:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  let attackDamageReductionRedirectSave:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let attackDamageReductionRedirectDamage: BattleRolledDiceFill | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Attack target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      const rangeFactValidation =
        validateUniqueAttackTargetRangeFacts(targetSpatialFacts);
      if (rangeFactValidation !== null) {
        return { tag: "invalid", message: rangeFactValidation };
      }
      continue;
    }

    if (
      fill.kind === "targetChoice" &&
      fill.holeId ===
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID
    ) {
      if (attackDamageReductionRedirectTarget !== undefined) {
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect target was filled twice.",
        };
      }
      attackDamageReductionRedirectTarget = fill;
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return { tag: "invalid", message: "Attack roll was filled twice." };
      }
      attackRoll = fill.value;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID
    ) {
      if (attackDamageReductionRedirectSave !== undefined) {
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect save was filled twice.",
        };
      }
      attackDamageReductionRedirectSave = fill;
      continue;
    }

    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID
    ) {
      if (attackDamageReductionRedirectDamage !== undefined) {
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect damage was filled twice.",
        };
      }
      attackDamageReductionRedirectDamage = fill;
      continue;
    }

    if (fill.kind === "rolledDice" && isSpellDamageReductionRollFill(fill)) {
      if (spellDamageReductionRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Spell damage reduction roll was filled twice.",
        };
      }
      spellDamageReductionRoll = fill;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Attack damage was filled twice." };
      }
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      if (concentrationSavingThrow !== undefined) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      concentrationSavingThrow = fill;
      continue;
    }

    if (fill.kind === "attackDamageDisposition") {
      if (fill.holeId !== ATTACK_DAMAGE_DISPOSITION_HOLE_ID) {
        return {
          tag: "invalid",
          message: "Attack damage disposition fill uses the wrong hole.",
        };
      }
      if (damageDispositionFilled) {
        return {
          tag: "invalid",
          message: "Attack damage disposition was filled twice.",
        };
      }
      damageDispositionFilled = true;
      damageDisposition = fill.value;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Attack replay holes.`,
    };
  }

  return {
    tag: "ok",
    targetId,
    targetSpatialFacts,
    attackRoll,
    concentrationSavingThrow,
    damageDisposition,
    damageDispositionFilled,
    damageRoll,
    spellDamageReductionRoll,
    attackDamageReductionRedirectTarget,
    attackDamageReductionRedirectSave,
    attackDamageReductionRedirectDamage,
  };
}

function validateUniqueAttackTargetRangeFacts(
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  const rangeFacts = facts.filter(
    (fact) => fact.kind === "attackTargetInRangedRange",
  );
  const duplicate = rangeFacts.find((fact, factIndex) =>
    rangeFacts
      .slice(0, factIndex)
      .some(
        (previous) =>
          previous.actorId === fact.actorId &&
          previous.targetId === fact.targetId &&
          previous.attackName === fact.attackName,
      ),
  );
  if (duplicate === undefined) {
    return null;
  }
  return "Attack target range facts must contain at most one range band for each actor, target, and attack.";
}

function abilityCheckFill(
  fills: readonly BattleFill[],
  holeId: BattleHoleId,
  label: string,
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "abilityCheck" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let check: Extract<BattleFill, { readonly kind: "abilityCheck" }> | undefined;
  for (const fill of fills) {
    if (fill.kind === "abilityCheck" && fill.holeId === holeId) {
      if (check !== undefined) {
        return { tag: "invalid", message: `${label} check was filled twice.` };
      }
      check = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${label} replay holes.`,
    };
  }
  return { tag: "ok", value: check };
}

export function spellSaveDcForCaster(
  state: BattleState,
  casterId: CombatantId,
): DifficultyClass | null {
  const caster = state.combatants.get(casterId);
  if (caster?.origin.kind !== "character") {
    return null;
  }
  const spellcasting = caster.origin.spellcasting;
  if (spellcasting === undefined) {
    return null;
  }
  return difficultyClass(
    8 +
      Number(spellcasting.spellcastingAbilityModifier) +
      spellcasting.proficiencyBonus,
  );
}

function grappleFillSet(fills: readonly BattleFill[]): GrappleFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let outcome:
    | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice") {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Grapple target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }
    if (fill.kind === "grappleOutcome") {
      if (outcome !== undefined) {
        return {
          tag: "invalid",
          message: "Grapple outcome was filled twice.",
        };
      }
      outcome = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Grapple replay holes.`,
    };
  }
  return { tag: "ok", targetId, targetSpatialFacts, outcome };
}

function validateAttackDamageFill(
  fill: BattleRolledDiceFill,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  eligibleAttackDamageRiders: readonly AttackDamageRider[],
  spellWeaponDamageRiders: readonly SpellWeaponDamageRider[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
  eligibleWeaponDamageDiceRollChoiceUnitIds: readonly UnitRecord["id"][] = [],
): string | null {
  const selectedRiders = selectedAttackDamageRiders(
    eligibleAttackDamageRiders,
    fill.selectedAttackDamageRiderUnitIds,
  );
  if (selectedRiders === null) {
    return "Selected attack damage rider is not eligible for this attack.";
  }
  if (
    fill.holeId !==
    attackDamageHoleId(
      attack,
      critical,
      attackRoll,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingDamageModifier,
    )
  ) {
    return critical
      ? "Critical hit damage must use the critical damage hole."
      : "Attack damage must use the normal hit damage hole.";
  }

  const weaponDamageDiceRollChoice = selectedWeaponDamageDiceRollChoice(
    eligibleWeaponDamageDiceRollChoiceUnitIds,
    fill.weaponDamageDiceRollChoice,
  );
  if (
    fill.weaponDamageDiceRollChoice !== undefined &&
    weaponDamageDiceRollChoice === null
  ) {
    return "Weapon damage dice roll choice is not eligible for this attack.";
  }

  return validateRolledDiceForWeaponAttack(
    fill.value,
    attack,
    critical,
    attackRoll,
    selectedRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    weaponDamageDiceRollChoice ?? undefined,
  );
}

function validateRolledDiceForWeaponAttack(
  groups: ReadonlyArray<RolledDiceGroup>,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[],
  spellWeaponDamageRiders: readonly SpellWeaponDamageRider[],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[],
  weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill,
): string | null {
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  if (groups.length !== components.length) {
    return "filled damage groups do not match current attack damage";
  }

  for (const [index, component] of components.entries()) {
    const group = groups[index];
    if (group === undefined) {
      return "filled damage groups do not match current attack damage";
    }
    const validation = validateRolledDiceForDiceExpr([group], component.expr);
    if (validation !== null) {
      return validation.reason;
    }
  }

  if (weaponDamageDiceRollChoice !== undefined) {
    const weaponDamage = weaponDamageComponent(attack, critical);
    if (weaponDamage === null) {
      return "Weapon damage dice roll choice requires weapon damage dice.";
    }
    const candidateValidation = validateRolledDiceForDiceExpr(
      weaponDamageDiceRollChoice.candidates,
      {
        dice: weaponDamage.expr.dice * 2,
        dieSize: weaponDamage.expr.dieSize,
      },
    );
    if (candidateValidation !== null) {
      return candidateValidation.reason;
    }
    const selectedCandidate =
      weaponDamageDiceRollChoice.selection === "first"
        ? weaponDamageDiceRollChoice.candidates[0]
        : weaponDamageDiceRollChoice.candidates[1];
    if (
      JSON.stringify(groups[0]?.results) !==
      JSON.stringify(selectedCandidate.results)
    ) {
      return "Selected weapon damage dice roll choice must match the base weapon damage group.";
    }
  }

  return null;
}

function fixedAttackDamageAmount(
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
): number | null {
  const entries = fixedAttackDamageByTypeEntries(attacker, attack);
  return entries === null
    ? null
    : damageAmountByTypeAfterTargetAdjustments(
        target,
        damageAmountByTypeEntriesToMap(entries),
      );
}

function fixedAttackDamageByTypeEntries(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): readonly DamageAmountByTypeEntry[] | null {
  return Match.value(attack).pipe(
    Match.when({ kind: "unarmedStrike" }, (unarmedStrike) => {
      if (unarmedStrike.effect.damage.kind !== "base") {
        return null;
      }
      return [
        {
          damageType: unarmedStrike.effect.damage.damageType,
          amount: Math.max(
            0,
            attackDamageModifier(attack) +
              ongoingFeatureDamageModifier(attacker, attack),
          ),
        },
      ];
    }),
    Match.when({ kind: "weapon" }, () => null),
    Match.when({ kind: "statBlockAttack" }, () => null),
    Match.exhaustive,
  );
}

function attackRollHitsWithCriticalThreshold(
  roll: AttackRollResult,
  armorClass: number,
  criticalThreshold: CriticalHitThreshold,
): boolean {
  if (Number(roll.naturalD20) === 1) {
    return false;
  }

  if (attackRollIsCriticalHit(roll, criticalThreshold)) {
    return true;
  }

  return roll.total >= armorClass;
}

export function attackRollIsCriticalHit(
  roll: AttackRollResult,
  criticalThreshold: CriticalHitThreshold = 20,
): boolean {
  return Number(roll.naturalD20) >= criticalThreshold;
}

function criticalThresholdForAttack(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): CriticalHitThreshold {
  if (
    !attackUsesWeaponOrUnarmedStrikeCriticalRange(attack) ||
    attacker?.origin.kind !== "character"
  ) {
    return 20;
  }

  return attacker.origin.characterUnitRefs.some(
    (unitRef) =>
      unitRef.supportProfiles.some(
        (profile) =>
          profile === WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
      ) === true,
  )
    ? 19
    : 20;
}

function attackUsesWeaponOrUnarmedStrikeCriticalRange(
  attack: SupportedAttackActionOption,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => true),
    Match.when({ kind: "unarmedStrike" }, () => true),
    Match.when({ kind: "statBlockAttack" }, () => false),
    Match.exhaustive,
  );
}

function compatibleAttackActionResource(
  resources: readonly RuntimeActionResource[],
): { readonly resource: RuntimeActionResource; readonly index: number } | null {
  const compatible = resources
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) =>
      resource.source === "turn"
        ? true
        : actionRestrictionAllows(resource.restriction, "attack"),
    );
  const extraAttack = compatible.find(
    ({ resource }) => resource.source === "classFeatureExtraAttack",
  );
  if (extraAttack !== undefined) return extraAttack;
  const restricted = compatible.find(
    ({ resource }) => resource.source !== "turn",
  );
  return restricted ?? compatible[0] ?? null;
}

function spendAttackActionResource<T extends ActionEconomyState>(
  state: T,
): Either.Either<
  { readonly state: T; readonly spentResource: RuntimeActionResource },
  "no action resource available"
> {
  const actionResource = compatibleAttackActionResource(state.actionResources);
  if (actionResource === null) {
    return Either.left("no action resource available");
  }
  return Either.right({
    state: {
      ...state,
      actionResources: state.actionResources.filter(
        (_, index) => index !== actionResource.index,
      ),
    },
    spentResource: actionResource.resource,
  });
}

function classFeatureExtraAttackForActor(
  actor: BattleCreatureState | undefined,
): {
  readonly unitId: UnitRecord["id"];
  readonly additionalAttacks: 1;
} | null {
  if (actor?.origin.kind !== "character") return null;
  for (const unitRef of actor.origin.characterUnitRefs) {
    for (const profile of unitRef.supportProfiles) {
      if (
        typeof profile === "object" &&
        profile.kind === ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE
      ) {
        return {
          unitId: unitRef.unitId,
          additionalAttacks: profile.additionalAttacks,
        };
      }
    }
  }
  return null;
}

function openClassFeatureExtraAttackResource(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly spentResource: RuntimeActionResource;
}): BattleTurnResources {
  if (
    input.spentResource.source === "classFeatureExtraAttack" ||
    actorHasClassFeatureExtraAttackActionResource(input.state, input.actorId)
  ) {
    return input.state.currentTurnResources;
  }
  const extraAttack = classFeatureExtraAttackForActor(
    input.state.combatants.get(input.actorId),
  );
  if (extraAttack === null) {
    return input.state.currentTurnResources;
  }
  return {
    ...input.state.currentTurnResources,
    actionResources: [
      ...input.state.currentTurnResources.actionResources,
      ...Array.from({ length: extraAttack.additionalAttacks }, () => ({
        kind: "action" as const,
        source: "classFeatureExtraAttack" as const,
        sourceOwnerId: input.actorId,
        sourceUnitId: extraAttack.unitId,
        restriction: {
          kind: "exclude" as const,
          actions: ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
        },
      })),
    ],
  };
}

function spendAttackAction(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (
    attack.kind === "statBlockAttack" &&
    attack.part.section === "legendaryActions"
  ) {
    const nextState = spendStatBlockAttackResources({
      state,
      actorId,
      attack,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const multiattackResources =
    attack.kind === "statBlockAttack" && attack.part.section === "actions"
      ? state.currentTurnResources.actionResources.filter(
          (resource): resource is StatBlockMultiattackActionResource =>
            isStatBlockMultiattackActionResource(resource, actorId),
        )
      : [];
  let spentTurnResources: BattleTurnResources;
  let spentResource: RuntimeActionResource | null;
  if (
    multiattackResources.length > 0 &&
    attack.kind === "statBlockAttack" &&
    attack.part.section === "actions"
  ) {
    const spent = spendMatchingActionResource(
      state.currentTurnResources,
      "attack",
      (resource) =>
        isStatBlockMultiattackActionResource(resource, actorId) &&
        resource.attackPart.section === attack.part.section &&
        resource.attackPart.name === attack.part.name,
    );
    if (Either.isLeft(spent)) {
      return invalidResult(
        state,
        "staleSubject",
        "Attack is no longer available for the current actor.",
      );
    }
    spentTurnResources = spent.right;
    spentResource = null;
  } else {
    const spent = spendAttackActionResource(state.currentTurnResources);
    if (Either.isLeft(spent)) {
      return invalidResult(
        state,
        "staleSubject",
        "Attack is no longer available for the current actor.",
      );
    }
    spentTurnResources = spent.right.state;
    spentResource = spent.right.spentResource;
  }
  const afterExtraAttackResource =
    spentResource === null
      ? spentTurnResources
      : openClassFeatureExtraAttackResource({
          state: {
            ...state,
            currentTurnResources: spentTurnResources,
          },
          actorId,
          spentResource,
        });
  const nextTurnResources =
    attack.kind === "weapon" && isLightMeleeWeapon(attack.weapon)
      ? {
          ...afterExtraAttackResource,
          lightWeaponAttackMade: {
            weaponItemId: heldWeaponItemIdForAttack(state, actorId, attack),
          },
        }
      : afterExtraAttackResource;
  const nextTurnResourcesWithoutPendingReplacement =
    clearPendingAttackRollMissToHitReplacementSelection(
      nextTurnResources,
      actorId,
    );

  const nextState = spendStatBlockAttackResources({
    state: {
      ...state,
      currentTurnResources: nextTurnResourcesWithoutPendingReplacement,
    },
    actorId,
    attack,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveEndTurn(
  state: BattleState,
  deathSavingThrowRoll?: DieRollResult,
  statBlockRechargeRolls?: readonly BattleStatBlockRechargeRollResult[],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const initiative = nextInitiative(state.initiative);
  const nextActorId = currentActing(initiative);
  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const [id, combatant] of state.combatants) {
    combatants.set(
      id,
      id === nextActorId
        ? resetStartOfTurnCombatant(resetPerTurnCharacterResources(combatant))
        : combatant,
    );
  }
  const afterDeathSavingThrow =
    deathSavingThrowRoll === undefined
      ? combatants
      : applyStartTurnDeathSavingThrow(
          combatants,
          nextActorId,
          deathSavingThrowRoll,
        );
  const expiringReadiedSpellCasterIds = [...state.readiedSpells]
    .filter(
      ([, readiedSpell]) => readiedSpell.expiresAt.combatantId === nextActorId,
    )
    .map(([casterId]) => casterId);
  const readiedSpells = new Map(state.readiedSpells);
  for (const casterId of expiringReadiedSpellCasterIds) {
    readiedSpells.delete(casterId);
  }
  const readiedMovements = new Map(state.readiedMovements);
  for (const [actorId, readiedMovement] of state.readiedMovements) {
    if (readiedMovement.expiresAt.combatantId === nextActorId) {
      readiedMovements.delete(actorId);
    }
  }
  const helpAttacks = state.helpAttacks.filter(
    (help) => help.expiresAt.combatantId !== nextActorId,
  );
  let combatantsAfterExpiredReadiedSpells = afterDeathSavingThrow;
  for (const casterId of expiringReadiedSpellCasterIds) {
    combatantsAfterExpiredReadiedSpells = breakCombatantConcentration(
      combatantsAfterExpiredReadiedSpells,
      casterId,
    );
  }
  const combatantsAfterEndTurnOngoingFeatures = expireEndOfTurnOngoingFeatures(
    combatantsAfterExpiredReadiedSpells,
    currentActorId(state),
    state.initiative.round,
  );
  const combatantsAfterEndEffects = expireEndOfTurnEffects(
    combatantsAfterEndTurnOngoingFeatures,
    currentActorId(state),
    state.initiative.round,
  );
  const combatantsAfterStartOngoingFeatures = expireStartOfTurnOngoingFeatures(
    combatantsAfterEndEffects,
    nextActorId,
  );
  const combatantsAfterStartEffects = expireStartOfTurnEffects(
    combatantsAfterStartOngoingFeatures,
    nextActorId,
  );
  const combatantsAfterStartTurnEffects = applyStartOfTurnActiveEffects(
    combatantsAfterStartEffects,
    nextActorId,
  );
  const combatantsAfterDurationTick =
    Number(initiative.round) > Number(state.initiative.round)
      ? tickDurationEffects(combatantsAfterStartTurnEffects)
      : combatantsAfterStartTurnEffects;
  const combatantsAfterRecharge =
    statBlockRechargeRolls === undefined
      ? combatantsAfterDurationTick
      : processStatBlockRechargeRolls(
          combatantsAfterDurationTick,
          nextActorId,
          statBlockRechargeRolls,
        );
  const combatantsAfterDamageReductionReset =
    resetSpellDamageReductionsForNewTurn(combatantsAfterRecharge);
  const nextState = {
    ...state,
    initiative,
    combatants: combatantsAfterDamageReductionReset,
    currentTurnResources: resetBattleTurnResources(state.currentTurnResources),
    readiedSpells,
    readiedMovements,
    helpAttacks,
    legendaryActionWindow: {
      afterTurnActorId: currentActorId(state),
      consumed: false,
    },
  };

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resetSpellDamageReductionsForNewTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const activeEffects = combatant.activeEffects.map((effect) =>
        effect.kind === "spellDamageReduction" && effect.usedThisTurn
          ? { ...effect, usedThisTurn: false }
          : effect,
      );
      return activeEffects.some(
        (effect, index) => effect !== combatant.activeEffects[index],
      )
        ? [id, { ...combatant, activeEffects }]
        : [id, combatant];
    }),
  );
}

function expireStartOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireActiveEffects(
    combatants,
    (effect) =>
      "expiresAt" in effect &&
      effect.expiresAt.kind === "startOfTurn" &&
      effect.expiresAt.combatantId === actorId,
  );
}

function applyStartOfTurnActiveEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  if (actor === undefined) {
    return combatants;
  }
  const temporaryHitPoints = actor.activeEffects
    .filter(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "turnStartTemporaryHitPoints" }
      > => effect.kind === "turnStartTemporaryHitPoints",
    )
    .reduce(
      (highest, effect) => Math.max(highest, effect.amount),
      Number(actor.tempHp),
    );
  if (temporaryHitPoints === Number(actor.tempHp)) {
    return combatants;
  }
  return new Map(combatants).set(
    actorId,
    applyTemporaryHitPoints(actor, temporaryHitPoints),
  );
}

function expireEndOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireActiveEffects(
    combatants,
    (effect) =>
      "expiresAt" in effect &&
      effect.expiresAt.kind === "endOfTurn" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === round,
  );
}

function tickDurationEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring: BattleActiveEffect[] = [];
      const activeEffects = combatant.activeEffects.flatMap((effect) => {
        if (!("expiresAt" in effect) || effect.expiresAt.kind !== "duration") {
          return [effect];
        }
        const remainingTicks = Number(effect.expiresAt.durationTicks) - 1;
        if (remainingTicks <= 0) {
          expiring.push(effect);
          return [];
        }
        return [
          {
            ...effect,
            expiresAt: {
              ...effect.expiresAt,
              durationTicks: elapsedTimeTicks(remainingTicks),
            },
          },
        ];
      });
      const nextCombatant: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : { ...combatant, activeEffects };
      return [id, nextCombatant];
    }),
  );
}

function expireActiveEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  shouldExpire: (effect: BattleActiveEffect) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter(shouldExpire);
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !shouldExpire(effect),
      );
      const nextCombatant: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : { ...combatant, activeEffects };
      return [id, nextCombatant];
    }),
  );
}

function expireStartOfTurnOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireOngoingFeatures(
    combatants,
    (ongoingFeature) =>
      ongoingFeature.expiresAt.kind === "startOfTurn" &&
      ongoingFeature.expiresAt.combatantId === actorId,
  );
}

function expireEndOfTurnOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireOngoingFeatures(
    combatants,
    (ongoingFeature) =>
      ongoingFeature.expiresAt.kind === "endOfTurn" &&
      ongoingFeature.expiresAt.combatantId === actorId &&
      ongoingFeature.expiresAt.round === round,
  );
}

function expireOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  shouldExpire: (occurrence: ActiveOngoingFeatureOccurrence) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => [
      id,
      {
        ...combatant,
        activeOngoingFeatureOccurrences: new Map(
          [...combatant.activeOngoingFeatureOccurrences].filter(
            ([, occurrence]) => !shouldExpire(occurrence),
          ),
        ),
      },
    ]),
  );
}

function resetBattleTurnResources(
  resources: BattleTurnResources,
): BattleTurnResources {
  const { lightWeaponAttackMade: _lightWeaponAttackMade, ...base } =
    resetTurnActionEconomy(resources);
  return {
    ...base,
    spellSlotExpendedThisTurn: false,
    attackRollMadeThisTurn: false,
    attackDamageRidersUsedThisTurn: [],
    weaponDamageDiceRollChoicesUsedThisTurn: [],
    dashMovementBonusFeet: movementFeet(0),
    disengaged: false,
  };
}

function resolveEndTurnCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const initiative = nextInitiative(input.state.initiative);
  const nextActorId = currentActing(initiative);
  const nextActor = input.state.combatants.get(nextActorId);
  const needsDeathSavingThrow = startTurnDeathSavingThrowRequired(nextActor);
  const rechargeHole = statBlockRechargeRollHole(nextActor);
  const expectedHoleCount =
    (needsDeathSavingThrow ? 1 : 0) + (rechargeHole === null ? 0 : 1);
  if (expectedHoleCount > 0 && input.fills.length === 0) {
    return {
      tag: "needsHoles",
      state: input.state,
      subject: input.subject,
      holes: [
        ...(needsDeathSavingThrow ? [deathSavingThrowHole(nextActorId)] : []),
        ...(rechargeHole === null ? [] : [rechargeHole]),
      ],
      snapshot: snapshotBattle(input.state),
    };
  }

  if (input.fills.length > expectedHoleCount) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received too many fills for start-turn requirements.",
    );
  }

  const deathSavingThrowFill = input.fills.find(
    (fill) => fill.kind === "deathSavingThrow",
  );
  const rechargeRollFill = input.fills.find(
    (fill) => fill.kind === "statBlockRechargeRoll",
  );
  if (
    (needsDeathSavingThrow &&
      deathSavingThrowFill?.kind !== "deathSavingThrow") ||
    (!needsDeathSavingThrow && deathSavingThrowFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      needsDeathSavingThrow
        ? "End Turn requires a Death Saving Throw fill for the next actor."
        : "End Turn does not accept battle fills.",
    );
  }
  if (
    (rechargeHole !== null &&
      rechargeRollFill?.kind !== "statBlockRechargeRoll") ||
    (rechargeHole === null && rechargeRollFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      rechargeHole !== null
        ? "End Turn requires a Stat Block Recharge roll fill for the next actor."
        : "End Turn does not accept a Stat Block Recharge roll fill.",
    );
  }
  if (
    deathSavingThrowFill?.kind === "deathSavingThrow" &&
    deathSavingThrowFill.holeId !== DEATH_SAVING_THROW_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Death Saving Throw fill does not match the requested hole.",
    );
  }
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    rechargeRollFill.holeId !== STAT_BLOCK_RECHARGE_ROLL_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill does not match the requested hole.",
    );
  }
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    !statBlockRechargeRollFillMatchesHole(rechargeRollFill.value, rechargeHole)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill must provide one d6 result for each requested target.",
    );
  }

  return resolveEndTurn(
    input.state,
    deathSavingThrowFill?.kind === "deathSavingThrow"
      ? deathSavingThrowFill.value
      : undefined,
    rechargeRollFill?.kind === "statBlockRechargeRoll"
      ? rechargeRollFill.value
      : undefined,
  );
}

function statBlockRechargeRollFillMatchesHole(
  value: readonly BattleStatBlockRechargeRollResult[],
  rechargeHole: BattleStatBlockRechargeRollHole | null,
): boolean {
  if (rechargeHole === null) return value.length === 0;
  if (value.length !== rechargeHole.rechargeTargets.length) return false;

  const matchedTargetIndexes = new Set<number>();
  for (const result of value) {
    if (result.roll < 1 || result.roll > 6) return false;
    const targetIndex = rechargeHole.rechargeTargets.findIndex(
      (target, index) =>
        !matchedTargetIndexes.has(index) &&
        sameStatBlockPartKey(target, result.target),
    );
    if (targetIndex === -1) return false;
    matchedTargetIndexes.add(targetIndex);
  }
  return true;
}

function resolveMoveCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  if (input.fills.length > 1 || input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires exactly one Movement fill.",
    );
  }
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  const nextState = applyBattleMovement(input.state, movement.movement);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveStandFromProneCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stand from Prone accepts no fills.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  const cost = standFromProneCostFeet(input.state, input.subject.actorId);
  if (actor === undefined || cost === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stand from Prone is no longer available.",
    );
  }
  const nextActor = {
    ...battleCreatureStateWithKnockOutPreservedConditions(
      actor,
      removeCondition(actor.conditions, "prone"),
    ),
    movementSpentFeet: movementFeet(Number(actor.movementSpentFeet) + cost),
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function standFromProneCostFeet(
  state: BattleState,
  actorId: CombatantId,
): number | null {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !hasCondition(actor.conditions, "prone")) {
    return null;
  }
  const speed = effectiveWalkSpeed(
    actor,
    state.grapples.some((grapple) => grapple.targetId === actorId),
  );
  const cost = Math.floor(Number(speed) / 2);
  const remaining = battleMovementBudgetForActor(state, actorId).remainingFeet;
  if (cost <= 0 || Number(remaining) < cost) return null;
  return cost;
}

function resolveOpportunityAttackCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    >
  > & {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
    readonly pendingAttackDamageReductions?:
      | readonly BattlePendingAttackDamageReduction[]
      | undefined;
  },
): BattleResolutionResult {
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];
  const subject = input.subject;
  const target = input.state.combatants.get(subject.targetId);
  const attack = opportunityAttackOptionForReactor(
    input.state,
    subject.reactorId,
    subject.targetId,
    subject.attackName,
  );
  if (target === undefined || attack === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Opportunity Attack is no longer available.",
    );
  }
  if (attackActionOptionName(attack) !== subject.attackName) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Opportunity Attack requires the selected melee attack option.",
    );
  }
  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack target is fixed by the movement trigger.",
    );
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    subject.reactorId,
    subject.targetId,
    attack,
  );
  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Opportunity Attack roll must be filled before damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        input.state.combatants.get(subject.reactorId),
        attack,
        requiredRollMode,
      ),
    ]);
  }
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack roll mode does not match the current attack-roll rule.",
    );
  }
  const attackRolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, subject.reactorId),
      subject.reactorId,
      subject.targetId,
      null,
    ),
    subject.reactorId,
    subject.targetId,
  );
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(subject.reactorId),
    attack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
    criticalThreshold,
  );
  const critical = attackRollIsCriticalHit(
    fillSet.attackRoll,
    criticalThreshold,
  );
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        subject.reactorId,
        subject.targetId,
        attack,
        fillSet.attackRoll,
        [],
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceUnitIds(
        attackRolledState,
        subject.reactorId,
        attack,
      )
    : [];
  const spellWeaponDamageRiders = hit
    ? activeSpellWeaponDamageRiders(
        attackRolledState.combatants.get(subject.reactorId),
        attack,
      )
    : [];
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(subject.reactorId),
        subject.targetId,
      )
    : [];
  const selectedDamageRiders =
    fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          fillSet.damageRoll.selectedAttackDamageRiderUnitIds,
        ) ?? []);
  if (hit && input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: subject.reactorId,
        targetId: subject.targetId,
        attackRoll: fillSet.attackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
          eligibleDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        ),
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: attackFillsThroughAttackRoll(input.fills),
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (!hit && (fillSet.damageRoll != null || fillSet.damageDispositionFilled)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return {
      tag: "resolved",
      state: attackRolledState,
      snapshot: snapshotBattle(attackRolledState),
    };
  }
  const fixedDamageAmount =
    spellMarkedDamageRiders.length > 0
      ? null
      : fixedAttackDamageAmount(
          attackRolledState.combatants.get(subject.reactorId),
          target,
          attack,
        );
  if (fixedDamageAmount !== null) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Opportunity Attack Fixed Unarmed Strike damage does not use a rolled damage fill.",
      );
    }
    const fixedDamageByTypeBeforeTargetAdjustments =
      fixedAttackDamageByTypeEntries(
        attackRolledState.combatants.get(subject.reactorId),
        attack,
      );
    if (fixedDamageByTypeBeforeTargetAdjustments === null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Opportunity Attack fixed damage is no longer available.",
      );
    }
    const damageEvent = {
      kind: "aggregateDamage" as const,
      damageByTypeBeforeTargetAdjustments:
        fixedDamageByTypeBeforeTargetAdjustments,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
    );
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
    if (spellReduction.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...attackRolledState,
      combatants: new Map(attackRolledState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const reducedFixedDamageAmount = attackDamageEventAmountForTarget(
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: subject.reactorId,
      target: spellReduction.target,
      damageAmount: reducedFixedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
      value: fillSet.damageDisposition,
    });
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      spellReducedState,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: subject.reactorId,
          targetId: subject.targetId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: [],
        },
      },
      input.suppressedReactionTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      return attackDamageReactionWindow;
    }
    const concentrationSave = concentrationSavingThrowHole(
      spellReduction.target,
      reducedFixedDamageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsHolesResult(attackRolledState, input.subject, [
          concentrationSave,
        ]);
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
    const nextState = applyAttackDamageAmount(
      spellReducedState,
      subject.reactorId,
      subject.targetId,
      reducedFixedDamageAmount,
      critical ? 2 : 1,
      fillSet.damageDisposition,
      [],
      undefined,
      fillSet.concentrationSavingThrow,
    );
    const reactionWindow = maybeOpenReactionWindow(
      nextState,
      {
        trigger: "afterDamage",
        damageSourceId: subject.reactorId,
        damagedId: subject.targetId,
        damageAmount: reducedFixedDamageAmount,
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  if (fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        fillSet.attackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(subject.reactorId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
      ),
    ]);
  }
  const selectedDamageDiceChoice = selectedWeaponDamageDiceRollChoice(
    eligibleDamageDiceChoiceUnitIds,
    fillSet.damageRoll.weaponDamageDiceRollChoice,
  );
  const damageValidation = validateAttackDamageFill(
    fillSet.damageRoll,
    attack,
    critical,
    fillSet.attackRoll,
    eligibleDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    ongoingFeatureDamageModifier(
      attackRolledState.combatants.get(subject.reactorId),
      attack,
    ),
    eligibleDamageDiceChoiceUnitIds,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const damageRollByType = attackDamageByTypeEntries(
    attackRolledState.combatants.get(subject.reactorId),
    attack,
    fillSet.damageRoll,
    critical,
    fillSet.attackRoll,
    selectedDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  const damageEvent = {
    kind: "rolledDamage" as const,
    damageRollByType,
  } satisfies BattleAttackDamageEvent;
  const reducedDamageEvent = attackDamageEventAfterPendingReductions(
    damageEvent,
    pendingAttackDamageReductions,
  );
  const spellReduction = applyAvailableSpellDamageReduction(
    target,
    damageAmountByTypeEntriesToMap(
      attackDamageEventEntries(reducedDamageEvent),
    ),
    fillSet.spellDamageReductionRoll,
  );
  if (spellReduction.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.subject, [
      ...spellReduction.holes,
    ]);
  }
  const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
    reducedDamageEvent,
    damageAmountByTypeMapEntries(spellReduction.damageByType),
  );
  const spellReducedState = {
    ...attackRolledState,
    combatants: new Map(attackRolledState.combatants).set(
      target.combatantId,
      spellReduction.target,
    ),
  };
  const reducedDamageAmount = attackDamageEventAmountForTarget(
    spellReduction.target,
    reducedDamageEventAfterSpellReduction,
  );
  const damageDispositionHole = attackDamageDispositionHole({
    attack,
    attackerId: subject.reactorId,
    target: spellReduction.target,
    damageAmount: reducedDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillValidation({
    hole: damageDispositionHole,
    filled: fillSet.damageDispositionFilled,
    value: fillSet.damageDisposition,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (damageDispositionHole !== null) {
    if (!fillSet.damageDispositionFilled) {
      return needsHolesResult(attackRolledState, input.subject, [
        damageDispositionHole,
      ]);
    }
  }
  const attackDamageReactionWindow = maybeOpenReactionWindow(
    spellReducedState,
    {
      trigger: "attackDamage",
      continuation: {
        kind: "attackDamage",
        subject: input.subject,
        attackerId: subject.reactorId,
        targetId: subject.targetId,
        damageEvent: reducedDamageEventAfterSpellReduction,
        fills: attackDamagePrefixFills(input.fills),
        deathFailuresAtZeroHp: critical ? 2 : 1,
        damageDisposition: fillSet.damageDisposition,
        attackDamageRiders: selectedDamageRiders,
        ...(selectedDamageDiceChoice === null
          ? {}
          : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
      },
    },
    input.suppressedReactionTrigger,
  );
  if (attackDamageReactionWindow !== null) {
    return attackDamageReactionWindow;
  }
  const concentrationSave = concentrationSavingThrowHole(
    spellReduction.target,
    reducedDamageAmount,
  );
  if (concentrationSave !== null) {
    if (fillSet.concentrationSavingThrow === undefined) {
      return needsHolesResult(attackRolledState, input.subject, [
        concentrationSave,
      ]);
    }
    if (fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill does not match the damaged target.",
      );
    }
  }
  const nextState = applyAttackDamageAmount(
    spellReducedState,
    subject.reactorId,
    subject.targetId,
    reducedDamageAmount,
    critical ? 2 : 1,
    fillSet.damageDisposition,
    selectedDamageRiders,
    selectedDamageDiceChoice ?? undefined,
    fillSet.concentrationSavingThrow,
  );
  const reactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: subject.reactorId,
      damagedId: subject.targetId,
      damageAmount: reducedDamageAmount,
      continuation: {
        kind: "resolved",
        subject: input.subject,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (reactionWindow !== null) {
    return reactionWindow;
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function movementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const budget = battleMovementBudgetForActor(state, actorId);
  return movementHoleWithBudget(
    actorId,
    budget.remainingFeet,
    budget.speedKinds.map((speedKind) => ({
      kind: speedKind.kind,
      movementBudgetFeet: speedKind.remainingFeet,
    })),
  );
}

function readiedMovementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const actor = state.combatants.get(actorId);
  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === actorId,
  );
  const speedKinds =
    actor === undefined
      ? []
      : representedMovementSpeedKinds(actor).map((kind) => ({
          kind,
          movementBudgetFeet: effectiveMovementSpeed(actor, kind, isGrappled),
        }));
  return movementHoleWithBudget(
    actorId,
    readiedMovementBudgetForActor(state, actorId),
    speedKinds,
  );
}

function movementHoleWithBudget(
  actorId: CombatantId,
  movementBudgetFeet: MovementFeet,
  speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: MovementFeet;
  }[] = [{ kind: "walk", movementBudgetFeet }],
): BattleMovementHole {
  return {
    kind: "movement",
    holeInstanceKey: MOVEMENT_HOLE_INSTANCE,
    holeId: MOVEMENT_HOLE_ID,
    label: "Movement",
    actorId,
    movementBudgetFeet,
    speedKinds,
  };
}

function readiedMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind = "walk",
): MovementFeet {
  const actor = state.combatants.get(actorId);
  return actor === undefined
    ? movementFeet(0)
    : effectiveMovementSpeed(
        actor,
        speedKind,
        state.grapples.some((grapple) => grapple.targetId === actorId),
      );
}

function parseBattleMovement(
  state: BattleState,
  moverId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
  options: {
    readonly movementBudgetFeet?: MovementFeet;
    readonly spendsTurnMovement?: boolean;
  } = {},
):
  | { readonly tag: "ok"; readonly movement: BattleResolvedMovement }
  | { readonly tag: "invalid"; readonly message: string } {
  const movementBudgetFeet =
    options.movementBudgetFeet ??
    battleMovementBudgetForActor(state, moverId, fill.value.speedKind)
      .remainingFeet;
  const mover = state.combatants.get(moverId);
  if (
    mover === undefined ||
    !representedMovementSpeedKinds(mover).includes(fill.value.speedKind)
  ) {
    return {
      tag: "invalid",
      message: "Movement speed kind is not represented for this combatant.",
    };
  }
  if (!combatantCanMoveWithBudget(state, moverId, movementBudgetFeet)) {
    return { tag: "invalid", message: "Current combatant cannot move." };
  }
  if (
    fill.value.movementCostFeet <= 0 ||
    !Number.isInteger(fill.value.movementCostFeet)
  ) {
    return {
      tag: "invalid",
      message: "Movement cost must be a positive integer.",
    };
  }
  const movementCost = ordinaryMovementCost(
    movementFeet(fill.value.movementCostFeet),
    fill.value.speedKind,
  );
  if (Number(movementCost.costFeet) > Number(movementBudgetFeet)) {
    return {
      tag: "invalid",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    };
  }
  const seen = new Set<string>();
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  for (const threat of fill.value.provokedOpportunityAttacks) {
    const reactorId = threat.reactorId;
    if (reactorId === moverId) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat cannot name the mover as reactor.",
      };
    }
    if (!state.combatants.has(reactorId)) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown combatant.",
      };
    }
    const attack = attackActionOptionsForActor(state, reactorId).find(
      (option) => attackActionOptionName(option) === threat.attackName,
    );
    if (attack === undefined) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown attack option.",
      };
    }
    if (attackTargetConstraint(attack).kind !== "meleeReach") {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat must name a melee attack option.",
      };
    }
    const threatKey = `${reactorId}\u0000${threat.attackName}`;
    if (seen.has(threatKey)) {
      return {
        tag: "invalid",
        message: "Movement Opportunity Attack threat repeats an attack option.",
      };
    }
    seen.add(threatKey);
    provokedOpportunityAttacks.push(threat);
  }
  return {
    tag: "ok",
    movement: {
      moverId,
      speedKind: fill.value.speedKind,
      movementCostFeet: movementCost.costFeet,
      provokedOpportunityAttacks,
      spendsTurnMovement: options.spendsTurnMovement ?? true,
    },
  };
}

function applyBattleMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): BattleState {
  const mover = state.combatants.get(movement.moverId);
  if (
    mover === undefined ||
    !combatantCanMoveWithBudget(
      state,
      movement.moverId,
      movement.spendsTurnMovement
        ? battleMovementBudgetForActor(
            state,
            movement.moverId,
            movement.speedKind,
          ).remainingFeet
        : readiedMovementBudgetForActor(
            state,
            movement.moverId,
            movement.speedKind,
          ),
    )
  ) {
    return state;
  }
  const nextMover = movement.spendsTurnMovement
    ? {
        ...mover,
        movementSpentFeet: movementFeet(
          Number(mover.movementSpentFeet) + Number(movement.movementCostFeet),
        ),
      }
    : mover;
  const combatants = new Map(state.combatants).set(movement.moverId, nextMover);
  return normalizeBattleGrapples({
    ...state,
    combatants,
  });
}

function normalizeBattleGrapples(state: BattleState): BattleState {
  const grapples = state.grapples.filter((grapple) => {
    const grappler = state.combatants.get(grapple.grapplerId);
    const target = state.combatants.get(grapple.targetId);
    return (
      grappler !== undefined &&
      target !== undefined &&
      !isIncapacitated(grappler.conditions) &&
      !zeroHpLifecycleIsTerminal(grappler) &&
      !zeroHpLifecycleIsTerminal(target)
    );
  });
  return grapples.length === state.grapples.length
    ? state
    : { ...state, grapples };
}

function readiedSpellInitialHoles(
  state: BattleState,
  casterId: CombatantId,
  readied: BattleReadiedSpell,
): readonly BattleHole[] {
  if (readied.invocation.procedure === "saveGatedDamage") {
    return readied.invocation.targeting.kind === "singleCombatant"
      ? [spellTargetHole(state, casterId, readied.invocation)]
      : [spellSavingThrowOutcomeHole(state, casterId, readied.invocation)];
  }
  if (readied.invocation.procedure === "repeatedDamageAllocation") {
    return [spellTargetAllocationHole(state, casterId, readied.invocation)];
  }
  if (readied.invocation.procedure === "chainedSpellAttackDamage") {
    return [spellDamageTypeChoiceHole(readied.invocation)];
  }
  return [spellTargetHole(state, casterId, readied.invocation)];
}

function readiedMovementInitialHoles(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleHole[] {
  const hole = readiedMovementHole(state, actorId);
  return movementHoleHasRemainingBudget(hole) ? [hole] : [];
}

function resolveReleaseReadiedSpellCommand(
  input: BattleResolutionInput,
  options: {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  if (input.subject.tag !== "runtimeCommand") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Release Readied Spell requires a runtime command subject.",
    );
  }
  const subject = input.subject;
  if (subject.command !== "releaseReadiedSpell") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Release Readied Spell requires a release command subject.",
    );
  }
  const casterId = subject.readiedSpellCasterId;
  const readied = input.state.readiedSpells.get(casterId);
  if (readied === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No readied spell is currently being held.",
    );
  }

  const releaseSubject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" }
  > = {
    tag: "actionSpell",
    actorId: casterId,
    invocation: supportedSpellInvocationRef(readied.invocation),
    mode: { tag: "cast" },
  };
  const released = resolveSpellRelease(
    {
      state: input.state,
      subject: releaseSubject,
      fills: input.fills,
      suppressedReactionTrigger: options.suppressedReactionTrigger,
      reactionContinuationSubject: input.subject,
    },
    readied.invocation,
  );
  if (released.tag === "needsHoles") {
    return { ...released, subject: input.subject };
  }
  if (released.tag !== "resolved") {
    return released;
  }
  const readiedSpells = new Map(released.state.readiedSpells);
  readiedSpells.delete(casterId);
  const withoutReadied = breakBattleConcentration(
    { ...released.state, readiedSpells },
    casterId,
  );
  return {
    tag: "resolved",
    state: withoutReadied,
    snapshot: snapshotBattle(withoutReadied),
  };
}

function resolveReleaseReadiedMovementCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "releaseReadiedMovement";
      }
    >
  >,
): BattleResolutionResult {
  const readiedMovementActorId = input.subject.readiedMovementActorId;
  const activeReaction = currentReactionFrame(input.state)?.activeReaction;
  if (
    activeReaction === undefined ||
    activeReaction.reactorId !== readiedMovementActorId ||
    !sameBattleSubject(activeReaction.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Readied Movement release requires an active Reaction window.",
    );
  }
  const readied = input.state.readiedMovements.get(readiedMovementActorId);
  if (readied === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No readied movement is currently being held.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      readiedMovementHole(input.state, readiedMovementActorId),
    ]);
  }
  if (input.fills.length > 1 || input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Readied Movement requires exactly one Movement fill.",
    );
  }
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied Movement fill does not match the requested hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    readiedMovementActorId,
    fill,
    {
      movementBudgetFeet: readiedMovementBudgetForActor(
        input.state,
        readiedMovementActorId,
        fill.value.speedKind,
      ),
      spendsTurnMovement: true,
    },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const readiedMovements = new Map(input.state.readiedMovements);
  readiedMovements.delete(readiedMovementActorId);
  const stateWithoutReadied = { ...input.state, readiedMovements };
  const threats = opportunityAttackThreatsForMovement(
    stateWithoutReadied,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      stateWithoutReadied,
      {
        trigger: "opportunityAttack",
        moverId: readiedMovementActorId,
        threats,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  const nextState = applyBattleMovement(stateWithoutReadied, movement.movement);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resetStartOfTurnCombatant(
  combatant: BattleCreatureState,
): BattleCreatureState {
  const resetCombatant = {
    ...combatant,
    dodging: false,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
    attackRollMissToHitReplacementsUsedSinceTurnStart: [],
  };
  if (resetCombatant.origin.kind !== "statBlock") {
    return resetCombatant;
  }
  return {
    ...resetCombatant,
    origin: {
      ...resetCombatant.origin,
      resources: refreshStatBlockStartTurnResources(
        resetCombatant.origin.resources,
        resetCombatant.origin.statBlock.statBlock,
      ),
    },
  };
}

function resetPerTurnCharacterResources(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.origin.kind !== "character") {
    return combatant;
  }

  return {
    ...combatant,
    origin: {
      ...combatant.origin,
      resources: combatant.origin.resources.map((resource) => ({
        ...resource,
        usedThisTurn: false,
      })),
    },
  };
}

function discoverLegendaryActionActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  return [...state.combatants].flatMap(([actorId, actor]) => {
    if (
      !statBlockLegendaryActionWindowIsOpen(state, actorId) ||
      actor.origin.kind !== "statBlock" ||
      !combatantCanTakeActions(actor) ||
      actor.origin.resources.legendaryActionUsesRemaining <= 0
    ) {
      return [];
    }
    return attackActionOptionsForActor(state, actorId)
      .filter(
        (attack) =>
          attack.kind === "statBlockAttack" &&
          attack.part.section === "legendaryActions",
      )
      .flatMap((attack) => {
        const targetHole = attackTargetHole(state, actorId, attack);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "action" as const,
                  actorId,
                  action: "attack" as const,
                  attackName: attackActionOptionName(attack),
                  statBlockSection: "legendaryActions" as const,
                },
                label: "Legendary Action",
                summary: `Take the Legendary Action ${attackActionOptionName(
                  attack,
                )}.`,
                initialHoles: [targetHole],
              },
            ];
      });
  });
}

function supportedUnitFeatureActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    !isCharacterBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return [];
  }

  const classLevels = actor.origin.classLevels;
  return actor.origin.resources.flatMap((resource) => {
    const unitFeature = supportedUnitFeatureProfileForResource(
      actor,
      resource,
      classLevels,
    );
    if (
      unitFeature?.kind === "extraActionGrant" &&
      resourceHasUsesRemaining(resource) &&
      !resource.usedThisTurn
    ) {
      return [
        {
          subject: {
            tag: "unitFeature" as const,
            actorId,
            unitId: unitFeature.unit.id,
          },
          label: unitFeature.unit.name,
          summary: "Grant one additional non-Magic action this turn.",
          initialHoles: [],
        },
      ];
    }

    if (
      unitFeature?.kind === "ongoingFeature" &&
      unitFeature.activationTrigger === "bonusAction" &&
      ongoingFeatureIsAvailable(state, actor, resource, unitFeature)
    ) {
      return [
        {
          subject: {
            tag: "unitFeature" as const,
            actorId,
            unitId: unitFeature.unit.id,
          },
          label: unitFeature.unit.name,
          summary: "Activate an ongoing feature occurrence.",
          initialHoles: [],
        },
      ];
    }

    return unitFeature?.kind === "selfBonusActionHealing" &&
      resourceHasUsesRemaining(resource) &&
      state.currentTurnResources.currentHasBonusAction
      ? [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId,
              unitId: unitFeature.unit.id,
            },
            label: unitFeature.unit.name,
            summary: "Spend a Bonus Action and one use to regain Hit Points.",
            initialHoles: [selfBonusActionHealingRollHole(unitFeature)],
          },
        ]
      : [];
  });
}


function supportedUnitFeatureProfileForResource(
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  classLevels: readonly CharacterBattleClassLevel[],
): SupportedUnitFeatureProfile | null {
  return (
    actor.origin.ongoingFeatureProfiles.get(
      ongoingFeatureSourceKeyForUnit(resource.unit.id),
    ) ?? parseSupportedUnitFeatureProfile(resource.unit, classLevels)
  );
}

function resolveUnitFeature(
  input: UnitFeatureBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  if (isCharacterBattleCreatureState(actor)) {
    const resource = actor.origin.resources.find(
      (candidate) => candidate.unit.id === subject.unitId,
    );

    if (resource !== undefined) {
      const unitFeature = supportedUnitFeatureProfileForResource(
        actor,
        resource,
        actor.origin.classLevels,
      );
      if (unitFeature?.kind === "extraActionGrant") {
        return resolveExtraActionGrantUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature?.kind === "selfBonusActionHealing") {
        return resolveSelfBonusActionHealingUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature?.kind === "ongoingFeature") {
        return resolveOngoingFeatureUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
    }
  }

  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Unsupported Unit feature does not accept battle fills.",
    );
  }

  return invalidResult(
    input.state,
    "staleSubject",
    "Unit feature is no longer available for the current actor.",
  );
}

export function resolveFailedAbilityCheckResourceBoost(
  input: FailedAbilityCheckResourceBoostResolutionInput,
): FailedAbilityCheckResourceBoostResolutionResult {
  const actor = input.state.combatants.get(input.abilityCheck.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Failed ability-check resource boost is no longer available for the current actor.",
    );
  }

  const profile = actor.origin.failedAbilityCheckResourceBoostProfiles.get(
    input.unitId,
  );
  const resource = actor.origin.resources.find(
    (resource) =>
      resource.unit.id === profile?.abilityCheck.spends.resourceUnitId,
  );
  if (
    profile === undefined ||
    resource === undefined ||
    !resourceHasUsesRemaining(resource)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Failed ability-check resource boost is no longer available for the current actor.",
    );
  }

  if (
    input.boostRoll < 1 ||
    input.boostRoll > profile.abilityCheck.bonus.dieSize ||
    !Number.isInteger(input.boostRoll)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} boost roll must be a 1d10 result.`,
    );
  }

  if (input.abilityCheck.originalTotal >= input.abilityCheck.dc) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires an already-failed ability check.`,
    );
  }

  const boostedTotal = input.abilityCheck.originalTotal + input.boostRoll;
  const boostedSucceeded = boostedTotal >= input.abilityCheck.dc;
  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((resource) =>
        boostedSucceeded &&
        resource.unit.id === profile.abilityCheck.spends.resourceUnitId
          ? spendCharacterResourceUse(resource)
          : resource,
      ),
    },
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.abilityCheck.actorId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    abilityCheckBoost: {
      boostedTotal,
      boostedSucceeded,
    },
  };
}

export function resolveSuccessfulAbilityCheckReactionReduction(
  input: SuccessfulAbilityCheckReactionReductionResolutionInput,
): SuccessfulAbilityCheckReactionReductionResolutionResult {
  const reactor = input.state.combatants.get(input.reactorId);
  const target = input.state.combatants.get(input.abilityCheck.actorId);
  if (!isCharacterBattleCreatureState(reactor) || target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ability-check Reaction reduction is no longer available.",
    );
  }

  const profile = reactor.origin.reactionRollOrDamageReductionProfiles.get(
    input.unitId,
  );
  const modifier = profile?.modifiers.find(
    (candidate) => candidate.kind === "abilityCheckReduction",
  );
  if (
    profile === undefined ||
    modifier === undefined ||
    !combatantCanTakeReactions(reactor) ||
    !reactionModifierResourceAvailable(
      input.state,
      input.reactorId,
      profile,
      modifier,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ability-check Reaction reduction is no longer available.",
    );
  }

  if (input.abilityCheck.originalTotal < input.abilityCheck.dc) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires an already-successful ability check.`,
    );
  }

  if (
    modifier.requiresVisibleCreature &&
    !combatantCanSee(input.state, input.reactorId, input.abilityCheck.actorId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires a visible creature.`,
    );
  }

  if (
    !hasReactionRollOrDamageReductionRangeFact(
      input.abilityCheck.targetSpatialFacts,
      input.reactorId,
      input.abilityCheck.actorId,
      input.unitId,
      modifier.rangeFeet,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires the creature to be within range.`,
    );
  }

  const reductionTotal = reactionReductionResourceDieRollTotal({
    reduction: modifier.reduction,
    rollTotal: input.reductionRoll,
  });
  if (reductionTotal.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} ${reductionTotal.message}`,
    );
  }

  const reducedTotal = input.abilityCheck.originalTotal - reductionTotal.value;
  const reducedSucceeded = reducedTotal >= input.abilityCheck.dc;
  const spentState = spendReactionModifierResource(
    spendReaction(input.state, input.reactorId),
    input.reactorId,
    {
      kind: "abilityCheckReduction",
      unitId: profile.unit.id,
      label: profile.unit.name,
      reduction: {
        kind: "rolled",
        dice: modifier.reduction.dice,
        flatModifier: modifier.reduction.flatModifier,
        dieSize: modifier.reduction.dieSize,
        spends: modifier.reduction.spends,
      },
    },
  );

  return {
    tag: "resolved",
    state: spentState,
    snapshot: snapshotBattle(spentState),
    abilityCheckReduction: {
      reducedTotal,
      reducedSucceeded,
    },
  };
}

function hasReactionRollOrDamageReductionRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  reactorId: CombatantId,
  targetId: CombatantId,
  unitId: UnitRecord["id"],
  rangeFeet: MovementFeet,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "reactionRollOrDamageReductionTargetWithinRange" &&
      fact.reactorId === reactorId &&
      fact.targetId === targetId &&
      fact.unitId === unitId &&
      fact.rangeFeet === rangeFeet,
  );
}

function resolveExtraActionGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "extraActionGrant" }
  >,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }

  if (!resourceHasUsesRemaining(resource) || resource.usedThisTurn) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const granted = grantUnitActionResource(
    input.state.currentTurnResources,
    input.subject.actorId,
    input.subject.unitId,
    unitFeature.restriction,
  );
  if (Either.isLeft(granted)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This Unit feature has already granted an action this turn.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === input.subject.unitId
          ? {
              ...spendCharacterResourceUse(candidate),
              usedThisTurn: true,
            }
          : candidate,
      ),
    },
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: granted.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSelfBonusActionHealingUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleResolutionResult {
  if (
    !resourceHasUsesRemaining(resource) ||
    !input.state.currentTurnResources.currentHasBonusAction
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      selfBonusActionHealingStaleMessage(unitFeature),
    );
  }

  const healingRoll = selfBonusActionHealingRollFill(input.fills, unitFeature);
  if (healingRoll.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", healingRoll.message);
  }
  if (healingRoll.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      selfBonusActionHealingRollHole(unitFeature),
    ]);
  }

  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      selfBonusActionHealingStaleMessage(unitFeature),
    );
  }

  const nextActor = applyHpHealing(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === input.subject.unitId
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    },
    selfBonusActionHealingAmount(unitFeature, healingRoll.value),
  );
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function ongoingFeatureIsAvailable(
  state: BattleState,
  actor: BattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): boolean {
  if (unitFeature.activationTrigger === "firstAttackRoll") {
    return false;
  }
  const occurrenceKey = ongoingFeatureSourceKeyForUnit(unitFeature.unit.id);
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  if (activeOngoingFeature !== undefined) {
    return (
      state.currentTurnResources.currentHasBonusAction &&
      ongoingFeatureLifecycleHasExtensionTrigger(
        unitFeature.lifecycle,
        "bonusAction",
      )
    );
  }
  if (unitFeature.spendsUse && !resourceHasUsesRemaining(resource)) {
    return false;
  }
  if (!state.currentTurnResources.currentHasBonusAction) {
    return false;
  }
  return !unitFeature.lifecycle.earlyEndArmorCategories.some((category) =>
    combatantWearingArmorCategory(actor, category),
  );
}

function resolveOngoingFeatureUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }
  if (!ongoingFeatureIsAvailable(input.state, actor, resource, unitFeature)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const spent =
    unitFeature.activationTrigger === "bonusAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : Either.right(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const occurrenceKey = ongoingFeatureSourceKeyForUnit(input.subject.unitId);
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  const nextActiveOngoingFeatureOccurrences = new Map(
    actor.activeOngoingFeatureOccurrences,
  );
  nextActiveOngoingFeatureOccurrences.set(
    occurrenceKey,
    activeOngoingFeature === undefined
      ? activeOngoingFeatureOccurrenceFromProfile(
          input.state,
          input.subject.actorId,
          unitFeature,
        )
      : extendOngoingFeatureToEndOfNextTurn(
          input.state,
          input.subject.actorId,
          activeOngoingFeature,
        ),
  );
  const nextActorWithFeature: BattleCreatureState = {
    ...actor,
    activeOngoingFeatureOccurrences: nextActiveOngoingFeatureOccurrences,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        activeOngoingFeature === undefined &&
        candidate.unit.id === input.subject.unitId &&
        unitFeature.spendsUse
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const nextActor = nextActorWithFeature;
  const nextStateBeforeConcentration = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  };
  const nextState =
    unitFeature.concentrationEffect === "breakAndPrevent"
      ? breakBattleConcentration(
          nextStateBeforeConcentration,
          input.subject.actorId,
        )
      : nextStateBeforeConcentration;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}


type UnitFeatureRolledDiceFill =
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function selfBonusActionHealingRollFill(
  fills: readonly BattleFill[],
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): UnitFeatureRolledDiceFill {
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "rolledDice" &&
      fill.holeId === selfBonusActionHealingRollHoleId(unitFeature)
    ) {
      if (healingRoll !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} healing roll was filled twice.`,
        };
      }
      healingRoll = fill;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${unitFeature.unit.name} replay holes.`,
    };
  }

  if (healingRoll === undefined) {
    return { tag: "ok", value: undefined };
  }

  const validation = validateRolledDiceForDiceExpr(healingRoll.value, {
    dice: unitFeature.dice,
    dieSize: unitFeature.dieSize,
  });
  return validation == null
    ? { tag: "ok", value: healingRoll }
    : { tag: "invalid", message: validation.reason };
}

function selfBonusActionHealingRollHole(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: selfBonusActionHealingRollHoleId(unitFeature),
    holeInstanceKey: selfBonusActionHealingRollHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} healing (${unitFeature.dice}d${unitFeature.dieSize})`,
    unitFeature,
  };
}

function selfBonusActionHealingStaleMessage(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): string {
  return `${unitFeature.unit.name} is no longer available for the current actor.`;
}

function selfBonusActionHealingRollProtocolId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): string {
  return `battle:unit-feature:${unitFeature.unit.id}:healing-roll`;
}

function selfBonusActionHealingRollHoleId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleHoleId {
  return holeId(selfBonusActionHealingRollProtocolId(unitFeature));
}

function selfBonusActionHealingRollHoleInstanceKey(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): HoleInstanceKey {
  return holeInstanceKey(selfBonusActionHealingRollProtocolId(unitFeature));
}

function selfBonusActionHealingAmount(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
  healingRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const diceTotal = healingRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return (
    diceTotal +
    unitFeature.flatBase +
    Math.max(0, unitFeature.classLevel - unitFeature.startingAtLevel) *
      unitFeature.flatPerLevel
  );
}

export function activeOngoingFeaturesPreventSpellcasting(
  actor: BattleCreatureState,
): boolean {
  return [...activeOngoingFeatureOccurrencesForCombatant(actor)].some(
    ([key]) =>
      ongoingFeatureProfileForSourceKey(
        actor,
        key,
      )?.actionRestrictions.includes("spellcasting") === true,
  );
}


export type HpDamageProjection = {
  readonly effectiveDamage: number;
  readonly currentTempHp: number;
  readonly tempHpAbsorbed: number;
  readonly currentHp: number;
  readonly hpDamage: number;
  readonly nextHp: Hp;
  readonly massiveDamageKills: boolean;
};


export function zeroHpLifecycleIsTerminal(combatant: BattleCreatureState): boolean {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant.hp === 0),
    Match.when(
      { policy: "usesDeathSavingThrows" },
      (lifecycle) => lifecycle.deathSaves.dead,
    ),
    Match.exhaustive,
  );
}






