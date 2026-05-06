import { Brand, Match, Schema } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";
import * as Either from "effect/Either";
import * as Option from "effect/Option";
import {
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
  initiativeEntries,
  insertAtOrderIndex,
  initiativeOrder,
  nextInitiative,
  removeFromInitiative,
} from "@dnd/shared-algebras/initiative-algebra";
import {
  armorClass,
  currentArmorClass,
  statBlockArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
  validDeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";
import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
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
  type FilledHoleValue,
  type RolledDiceGroup,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  CONDITIONS as ALL_CONDITIONS,
  AbilityModifier,
  AttackBonus,
  ClassLevel,
  DamageDieSizeSchema,
  DamageAmount,
  DifficultyClass,
  Hp,
  MovementDeltaFeet,
  MovementFeet,
  Round,
  SpellSlotLevel,
  abilityModifier,
  attackBonus,
  damageAmount as toDamageAmount,
  difficultyClass,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
  type Condition,
  type DieRollResult,
  type HandUse,
  type ProficiencyBonus as ProficiencyBonusType,
  type Round as RoundType,
} from "@dnd/shared/types";
import {
  STANDARD_ACTION_KINDS,
  type StandardActionKind,
} from "@dnd/shared/game-facts";
import type {
  Ability,
  CreatureActions,
  CreatureLimitedUse,
  CreatureNamedActionOption,
  CreatureNamedAttackRoll,
  CreatureNamedMultiattack,
  DamageType,
  DcSource,
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  Size,
  SpellRecord,
  StatBlockRecord,
  StatBlockValue,
  TargetSelection,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { AbilitySchema, DamageTypeSchema } from "@dnd/surface/surface/schema";
import {
  BattleCombatantSide,
  BattleId,
  BattleReplayStackDepth,
  CombatantId,
  battleReplayStackDepth,
} from "./identity.ts";
import type { CharacterId, InitiativeScore } from "./identity.ts";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import {
  characterBattleResourceUsage,
  characterResourceState,
  characterSpellcastingState,
  parseCharacterBattleClassLevels,
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleFeatureInit,
  type CharacterBattleResourceInit,
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
  BattleSubjectTextSchema,
  BattleSubjectSchema,
  sameBattleSubject,
  type ActionHideSubject,
  type ActionSearchSubject,
  type BattleSubject,
  type BonusActionStandardActionSubject,
} from "./battle-subjects.ts";
import { KNOCKED_OUT_UNCONSCIOUS } from "./battle-init.ts";
import type {
  BattleWeaponDamage,
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  StatBlockAttackActionOption,
  StatBlockAttackDamage,
  StatBlockDailyUseState,
  StatBlockLimitedUseSnapshot,
  StatBlockMutableResourceState,
  StatBlockPartKey,
  StatBlockPartSection,
  StatBlockResourceSnapshot,
  SupportedAttackActionOption,
  SupportedCreatureNamedAttackRoll,
} from "./battle-action-options.ts";
import type {
  BattleCreatureInit,
  BattlePositiveHpUnconscious,
  BattleUnitRef,
  BattleWalkSpeed,
  CharacterBattleCreatureInit,
  CharacterBattleLoadoutRef,
  StatBlockBattleInitInput,
} from "./battle-init.ts";
import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  type AlternateActionCostAction,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
  type BattleUnitSupportProfile,
  type OngoingFeatureDamageModifier,
  type OngoingFeatureExtensionTrigger,
  type OngoingFeatureLifecycleProfile,
  type OngoingFeatureRollModifier,
  type ReactionRollOrDamageReductionProfile,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";

const CRITICAL_HIT_THRESHOLDS = [19, 20] as const;
type CriticalHitThreshold = (typeof CRITICAL_HIT_THRESHOLDS)[number];

export type BattleActiveEffectExpiration = {
  readonly kind: "startOfTurn";
  readonly combatantId: CombatantId;
};
export type BattleSpellEffectEarlyEnd =
  | { readonly kind: "targetDonsArmor" }
  | { readonly kind: "concentrationBroken" };
type BattleSpellEffectBase = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
};
export type BattleActiveEffect =
  | (BattleSpellEffectBase & {
      readonly kind: "speedDelta";
      readonly deltaFeet: MovementDeltaFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellBaseArmorClass";
      readonly base: number;
      readonly ability: "dex";
      readonly earlyEnds: readonly BattleSpellEffectEarlyEnd[];
      readonly durationTicks: ElapsedTimeTicks;
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
  readonly invocation: SupportedDamageSpellAct;
  readonly trigger: BattleReadiedSpellTrigger;
  readonly expiresAt: BattleActiveEffectExpiration;
};
// SRD 5.2.1 Ready [Action]: Ready can hold a chosen action, or the special
// alternative to move up to Speed. This runtime slice models only that
// movement alternative for non-spell Ready responses.
export type BattleReadiedMovement = {
  // supported runtime trigger buckets, not the RAW Ready trigger taxonomy; RAW is closer to "table decision" and probably shall be modeled like that
  readonly trigger: BattleReactionTrigger;
  readonly expiresAt: BattleActiveEffectExpiration;
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
  readonly expiresAt: BattleActiveEffectExpiration;
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
type BattleAfterDamageEvent = {
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
      readonly kind: "attackRollReduction" | "damageRollReduction";
      readonly unitId: UnitRecord["id"];
      readonly label: string;
      readonly reduction: {
        readonly kind: "rolled";
        readonly flatModifier: number;
        readonly dieSize: 6 | 8 | 10 | 12;
      };
    }
  | {
      readonly kind: "attackDamageReduction";
      readonly unitId: UnitRecord["id"];
      readonly label: string;
      readonly reduction: { readonly kind: "halfDamage" };
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
  | { readonly kind: "knockOut" };
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
type AttackTargetConstraint =
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
      readonly kind: "helpAttackTargetWithin5Feet";
      readonly helperId: CombatantId;
      readonly targetEnemyId: CombatantId;
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
type BattleResolvedMovement = {
  readonly moverId: CombatantId;
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly spendsTurnMovement: boolean;
};
// SupportedAttackActionOption is a currently executable option for spending an
// immediate attack made as part of the Attack action. It is narrower than all
export type SupportedSpellAct =
  | {
      readonly kind: "preparedSlotSpell";
      readonly spell: SpellRecord;
      readonly targeting: {
        readonly kind: "repeatedEffectTargetAllocation";
        readonly repeatedEffectCount: number;
      };
      readonly slotLevel: SpellSlotLevel;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "cantripSpellAttack";
      readonly spell: SpellRecord;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: MovementFeet;
      readonly attackBonus: AttackBonus;
      readonly speedReduction: {
        readonly deltaFeet: MovementDeltaFeet;
      };
    }
  | {
      readonly kind: "cantripSaveGateDamage";
      readonly spell: SpellRecord;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly area: {
        readonly kind: "pointOriginSphere";
        readonly radiusFeet: MovementFeet;
      };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly successDamage: "none" | "half";
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "preparedPersistentSpell";
      readonly spell: SpellRecord;
      readonly slotLevel: SpellSlotLevel;
      readonly rangeFeet: MovementFeet;
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "spellBaseArmorClass" }
      >;
    }
  | {
      readonly kind: "preparedHealingSpell";
      readonly spell: SpellRecord;
      readonly slotLevel: SpellSlotLevel;
      readonly healing: {
        readonly expr: DiceExpr;
      };
      readonly rangeFeet: MovementFeet;
    };

type SupportedDamageSpellAct = Exclude<
  SupportedSpellAct,
  { readonly kind: "preparedPersistentSpell" | "preparedHealingSpell" }
>;

export type BattleTurnResources = ActionEconomyState & {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
  readonly spellSlotExpendedThisTurn: boolean;
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
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
type EndOfTurnOngoingFeatureExpiration = Extract<
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
const OngoingFeatureSourceKey = Brand.nominal<OngoingFeatureSourceKey>();
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

function ongoingFeatureSourceKey(
  source: OngoingFeatureSource,
): OngoingFeatureSourceKey {
  return OngoingFeatureSourceKey(source.unitId);
}

function ongoingFeatureSourceForUnit(
  unitId: UnitRecord["id"],
): OngoingFeatureSource {
  return { kind: "unit", unitId };
}

function ongoingFeatureSourceKeyForUnit(
  unitId: UnitRecord["id"],
): OngoingFeatureSourceKey {
  return ongoingFeatureSourceKey(ongoingFeatureSourceForUnit(unitId));
}

export type KnockedOutOneHp = Hp & Brand.Brand<"KnockedOutOneHp">;
const KnockedOutOneHp = Brand.nominal<KnockedOutOneHp>();
export type KnockedOutConditionState = ConditionState &
  Brand.Brand<"KnockedOutConditionState">;
const KnockedOutConditionState = Brand.nominal<KnockedOutConditionState>();
type KnockOutEligibleZeroHpLifecycle =
  | Extract<ZeroHpLifecycle, { readonly policy: "diesAtZeroHp" }>
  | (Extract<ZeroHpLifecycle, { readonly policy: "usesDeathSavingThrows" }> & {
      readonly deathSaves: DeathSaveRuntimeState & { readonly dead: false };
    });
export type KnockOutEligibleBattleCreatureState = BattleCreatureState & {
  readonly zeroHpLifecycle: KnockOutEligibleZeroHpLifecycle;
};

type BattleCreatureKnockOutLifecycle =
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

export type BattleStateInitIssue = {
  readonly tag: "battleStateInitIssue";
  readonly message: string;
};

function battleStateInitIssue(
  message: string,
): Either.Either<never, BattleStateInitIssue> {
  return Either.left({ tag: "battleStateInitIssue", message });
}

const SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET = movementFeet(5);

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
export type BattleSpellTargetAllocationHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "spellTargetAllocation";
  readonly label: string;
  readonly spell: SupportedSpellAct;
  readonly allocationCount: number;
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
};
export type AttackRollFeatureActivation = {
  readonly unitId: UnitRecord["id"];
  readonly label: UnitRecord["name"];
  readonly rollMode: AttackRollMode;
};
export type BattleSpellAttackRollHole = Extract<
  RuntimeHole,
  { readonly kind: "attackRoll" }
> & {
  readonly spell: SupportedSpellAct;
  readonly attackBonus: AttackBonus;
  readonly rollMode?: AttackRollMode;
};
export type BattleDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly attack: SupportedAttackActionOption;
  readonly critical: boolean;
  readonly attackDamageRiders?: readonly AttackDamageRider[];
};
export type BattleSpellDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spell: SupportedDamageSpellAct;
  readonly critical: boolean;
};
export type BattleSpellHealingRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spell: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedHealingSpell" }
  >;
};
export type BattleSavingThrowOutcome = {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
};
export type BattleSavingThrowOutcomeValue = {
  readonly area: BattleSpellAreaChoice;
  readonly outcomes: readonly BattleSavingThrowOutcome[];
};
const SAVE_DAMAGE_RESULTS = ["none", "half", "full"] as const;
type SaveDamageResult = (typeof SAVE_DAMAGE_RESULTS)[number];
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
  readonly spell: SupportedSpellAct;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly BattleSpellAreaChoice[];
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
};
export type BattleAbilityCheckHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "abilityCheck";
  readonly label: string;
  readonly ability: Ability;
  readonly skill: "stealth" | "perception";
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
  | BattleSpellTargetAllocationHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleSpellHealingRollHole
  | BattleSpellSavingThrowOutcomeHole
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
const SupportedHealingSpellActSchema = Schema.Struct({
  kind: Schema.Literal("preparedHealingSpell"),
  spell: BattleRuntimeObjectSchema,
  slotLevel: SpellSlotLevel,
  healing: Schema.Struct({
    expr: BattleRuntimeObjectSchema,
  }),
  rangeFeet: MovementFeet,
});

const SupportedSpellActSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("preparedSlotSpell"),
    spell: BattleRuntimeObjectSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("repeatedEffectTargetAllocation"),
      repeatedEffectCount: Schema.Number,
    }),
    slotLevel: SpellSlotLevel,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.String,
    }),
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("cantripSpellAttack"),
    spell: BattleRuntimeObjectSchema,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.String,
    }),
    rangeFeet: MovementFeet,
    attackBonus: AttackBonus,
    speedReduction: Schema.Struct({
      deltaFeet: MovementDeltaFeet,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("cantripSaveGateDamage"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.String,
    dc: BattleRuntimeObjectSchema,
    area: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: MovementFeet,
    }),
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.String,
    }),
    successDamage: Schema.Literal("none", "half"),
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("preparedPersistentSpell"),
    spell: BattleRuntimeObjectSchema,
    slotLevel: SpellSlotLevel,
    rangeFeet: MovementFeet,
    activeEffect: BattleRuntimeObjectSchema,
  }),
  SupportedHealingSpellActSchema,
);

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
    kind: Schema.Literal("spellTargetAllocation"),
    spell: SupportedSpellActSchema,
    allocationCount: Schema.Number,
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
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    spell: SupportedSpellActSchema,
    attackBonus: AttackBonus,
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
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
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spell: SupportedSpellActSchema,
    critical: Schema.Boolean,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spell: SupportedHealingSpellActSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spell: SupportedSpellActSchema,
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
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("abilityCheck"),
    label: Schema.String,
    ability: Schema.String,
    skill: Schema.Literal("stealth", "perception"),
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
      ),
    ),
  }),
);

export type BattleAttackRollResult = AttackRollResult & {
  readonly activatedOngoingFeatureUnitId?: UnitRecord["id"];
};
export type BattleRolledDiceFill = Extract<
  FilledHoleValue,
  { readonly kind: "rolledDice" }
> & {
  readonly selectedAttackDamageRiderUnitIds?: readonly UnitRecord["id"][];
};
export type BattleFill =
  | {
      readonly kind: "attackRoll";
      readonly holeId: BattleHoleId;
      readonly value: BattleAttackRollResult;
    }
  | BattleRolledDiceFill
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: BattleHoleId;
      readonly value: BattleSavingThrowOutcomeValue;
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
            readonly kind: "helpAttackTargetWithin5Feet";
            readonly helperId: string;
            readonly targetEnemyId: string;
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
      readonly value: {
        readonly area: {
          readonly originAnchorId: string;
          readonly affectedTargetIds: readonly string[];
        };
        readonly outcomes: readonly {
          readonly targetId: string;
          readonly succeeded: boolean;
        }[];
      };
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: string;
      readonly selectedAttackDamageRiderUnitIds?: readonly string[];
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
        | { readonly kind: "knockOut" };
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
                  readonly kind: "opportunityAttack";
                  readonly reactorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "reactionRollOrDamageReduction";
                  readonly unitId: string;
                  readonly modifierKind:
                    | "attackRollReduction"
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
              kind: Schema.Literal("helpAttackTargetWithin5Feet"),
              helperId: CombatantId,
              targetEnemyId: CombatantId,
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
      kind: Schema.Literal("attackRoll"),
      holeId: BattleHoleIdSchema,
      value: BattleAttackRollResultSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("savingThrowOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
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
    }),
    Schema.Struct({
      kind: Schema.Literal("rolledDice"),
      holeId: BattleHoleIdSchema,
      selectedAttackDamageRiderUnitIds: Schema.optionalWith(
        Schema.Array(Schema.String),
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
              kind: Schema.Literal("opportunityAttack"),
              reactorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("reactionRollOrDamageReduction"),
              unitId: BattleSubjectTextSchema,
              modifierKind: Schema.Literal(
                "attackRollReduction",
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
type BattleResolutionInputForSubject<TSubject extends BattleSubject> = Omit<
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
type ActionSpellBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "actionSpell" }>
> & {
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  readonly reactionContinuationSubject?: BattleSubject | undefined;
};
type BonusActionSpellBattleResolutionInput = BattleResolutionInputForSubject<
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
  };
};

export type BattleTurnSnapshot = {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly bonusActionAvailable: boolean;
  readonly spellSlotExpendedThisTurn: boolean;
  readonly attackRollMadeThisTurn: boolean;
  readonly attackDamageRidersUsedThisTurn: readonly AttackDamageRiderUsage[];
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
type CharacterBattleCreatureState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};
type StatBlockBattleCreatureState = BattleCreatureState & {
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
  invocation: SupportedSpellActSchema,
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
    kind: Schema.Literal("attackRollReduction", "damageRollReduction"),
    unitId: Schema.String,
    label: Schema.String,
    reduction: Schema.Struct({
      kind: Schema.Literal("rolled"),
      flatModifier: Schema.Number,
      dieSize: Schema.Literal(6, 8, 10, 12),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackDamageReduction"),
    unitId: Schema.String,
    label: Schema.String,
    reduction: Schema.Struct({
      kind: Schema.Literal("halfDamage"),
    }),
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
  dashMovementBonusFeet: movementFeet(0),
  disengaged: false,
});
const ATTACK_TARGET_HOLE_ID = holeId("battle:attack:target");
const ATTACK_ROLL_HOLE_ID = holeId("battle:attack:roll");
const ATTACK_DAMAGE_DISPOSITION_HOLE_ID = holeId(
  "battle:attack:damage-disposition",
);
const ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:attack:target");
const ATTACK_ROLL_HOLE_INSTANCE = holeInstanceKey("battle:attack:roll");
const ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE = holeInstanceKey(
  "battle:attack:damage-disposition",
);
const SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS = [
  "disengage",
  "hide",
] as const satisfies ReadonlyArray<StandardActionKind>;
type SupportedStatBlockBonusActionStandardAction =
  (typeof SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS)[number];
const STAT_BLOCK_MULTIATTACK_RESOURCE_EXCLUDED_ACTIONS = [
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
type StatBlockMultiattackActionResource = Extract<
  RuntimeActionResource,
  { readonly source: "statBlockMultiattack" }
>;
const HELP_ATTACK_ALLY_HOLE_ID = holeId("battle:help-attack:ally");
const HELP_ATTACK_TARGET_HOLE_ID = holeId("battle:help-attack:target");
const HELP_ATTACK_ALLY_HOLE_INSTANCE = holeInstanceKey(
  "battle:help-attack:ally",
);
const HELP_ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:help-attack:target",
);
const DEATH_SAVING_THROW_HOLE_ID = holeId("battle:end-turn:death-saving-throw");
const DEATH_SAVING_THROW_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:death-saving-throw",
);
const STAT_BLOCK_RECHARGE_ROLL_HOLE_ID = holeId(
  "battle:end-turn:stat-block-recharge-roll",
);
const STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:stat-block-recharge-roll",
);
const CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX =
  "battle:concentration:saving-throw";
const REACTION_DECISION_HOLE_ID = holeId("battle:reaction:decision");
const REACTION_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:reaction:decision",
);
const MOVEMENT_HOLE_ID = holeId("battle:movement");
const MOVEMENT_HOLE_INSTANCE = holeInstanceKey("battle:movement");
const HIDE_ABILITY_CHECK_HOLE_ID = holeId("battle:hide:stealth-check");
const HIDE_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:hide:stealth-check",
);
const SEARCH_TARGET_HOLE_ID = holeId("battle:search:target");
const SEARCH_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:search:target");
const SEARCH_ABILITY_CHECK_HOLE_ID = holeId("battle:search:perception-check");
const SEARCH_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:search:perception-check",
);
const GRAPPLE_TARGET_HOLE_ID = holeId("battle:grapple:target");
const GRAPPLE_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:grapple:target");
const GRAPPLE_OUTCOME_HOLE_ID = holeId("battle:grapple:outcome");
const GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey("battle:grapple:outcome");
const ESCAPE_GRAPPLE_OUTCOME_HOLE_ID = holeId("battle:escape-grapple:outcome");
const ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey(
  "battle:escape-grapple:outcome",
);
const REACTION_MODIFIER_ROLL_HOLE_ID = holeId("battle:reaction:modifier-roll");
const REACTION_MODIFIER_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:reaction:modifier-roll",
);
const HIDE_DC = difficultyClass(15);

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
  const acts: AvailableBattleAct[] = [...releaseGrappleActs(state)];
  const actorId = currentActorId(state);
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
  acts.push(...statBlockMultiattackActs(state, actorId));
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "dash")
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "dash" },
      label: "Dash",
      summary: "Gain extra Movement equal to Speed for the current turn.",
      initialHoles: [],
    });
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
    canSpendAction(state.currentTurnResources, "attack") &&
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
    acts.push(...discoverSupportedSpellActs(state, actorId));
  }
  const movementHoleForActor = movementHole(state, actorId);
  // PBA29 tracks the whole legal action/command surface while Stat Block
  // Multiattack dispatches are pending; movement is only one example.
  if (
    combatantCanMoveInState(state, actorId) &&
    state.combatants.size > 1 &&
    Number(movementHoleForActor.movementBudgetFeet) > 0
  ) {
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "move" },
      label: "Move",
      summary: "Spend Movement using table-supplied movement cost.",
      initialHoles: [movementHoleForActor],
    });
  }
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

function isStatBlockMultiattackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is StatBlockMultiattackActionResource {
  return (
    resource.source === "statBlockMultiattack" &&
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

function resolveBattleSubjectInternal(
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
      input.subject.action === "escapeGrapple") &&
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
  unitId: UnitRecord["id"],
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      origin: {
        ...reactor.origin,
        resources: reactor.origin.resources.map((resource) =>
          resource.unit.id === unitId
            ? spendCharacterResourceUse(resource)
            : resource,
        ),
      },
    }),
  };
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
  const reduction =
    input.choice.choice.reduction.kind === "halfDamage"
      ? 0
      : reductionRoll.value + input.choice.choice.reduction.flatModifier;
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
    input.choice.choice.unitId,
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
    return fills.length === 0
      ? { tag: "ok", value: 0 }
      : {
          tag: "invalid",
          message: "This Reaction modifier does not accept a roll fill.",
        };
  }
  if (fills.length !== 1 || fills[0]?.kind !== "rolledDice") {
    return {
      tag: "invalid",
      message: "This Reaction modifier requires one reduction roll fill.",
    };
  }
  const fill = fills[0];
  if (fill.holeId !== REACTION_MODIFIER_ROLL_HOLE_ID) {
    return {
      tag: "invalid",
      message: "Reaction modifier roll fill does not match the requested hole.",
    };
  }
  if (
    fill.value.length !== 1 ||
    fill.value[0]?.results.length !== 1 ||
    Number(fill.value[0].results[0]) > choice.reduction.dieSize
  ) {
    return {
      tag: "invalid",
      message:
        "Reaction modifier roll must provide one Bardic Inspiration die result.",
    };
  }
  const value = fill.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return { tag: "ok", value };
}

function bardicInspirationDieSize(classLevel: ClassLevel): 6 | 8 | 10 | 12 {
  if (classLevel >= 15) return 12;
  if (classLevel >= 10) return 10;
  if (classLevel >= 5) return 8;
  return 6;
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

function openAfterDamageSequenceReactionWindow(input: {
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

function reactionTriggerLabel(trigger: BattleReactionTrigger): string {
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

function maybeOpenReactionWindow(
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

function reactionChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  const readiedChoices = [
    ...readiedSpellReactionChoices(state, frame.trigger),
    ...readiedMovementReactionChoices(state, frame.trigger),
  ];
  const modifierChoices = reactionRollOrDamageReductionChoices(state, frame);
  return frame.trigger === "opportunityAttack"
    ? [
        ...readiedChoices,
        ...modifierChoices,
        ...opportunityAttackReactionChoices(
          state,
          frame.moverId,
          frame.threats,
        ),
      ]
    : [...readiedChoices, ...modifierChoices];
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
  if (!reactionModifierResourceAvailable(state, reactorId, profile.unit.id)) {
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
      const reactorOrigin = state.combatants.get(reactorId)?.origin;
      if (
        reactorOrigin?.kind !== "character" ||
        profile.unit.kind !== "class_feature"
      ) {
        return [];
      }
      return [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId,
          choice: {
            kind: "attackDamageReduction",
            unitId: profile.unit.id,
            label: profile.unit.name,
            reduction: { kind: "halfDamage" },
          },
          initialHoles: [],
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
            flatModifier: 0,
            dieSize: bardicInspirationDieSize(profile.classLevel),
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
            flatModifier: 0,
            dieSize: bardicInspirationDieSize(profile.classLevel),
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

function combatantCanSee(
  state: BattleState,
  viewerId: CombatantId,
  seenId: CombatantId,
): boolean {
  if (!state.combatants.has(viewerId)) {
    return false;
  }
  const seen = state.combatants.get(seenId);
  return (
    seen !== undefined &&
    seen.hidden === null &&
    !hasCondition(seen.conditions, "invisible")
  );
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

function reactionModifierResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  unitId: UnitRecord["id"],
): boolean {
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") return false;
  const resource = reactor.origin.resources.find(
    (candidate) => candidate.unit.id === unitId,
  );
  return resource === undefined || resourceHasUsesRemaining(resource);
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

function battleCreatureStateFromInit(
  input: BattleCreatureInit,
): BattleCreatureState {
  const creatureInit = input.creatureInit;
  assertCurrentHpWithinMaxHp(creatureInit);
  const zeroHpLifecycle = initialZeroHpLifecycleForCreatureOrigin(creatureInit);
  const initialConditions =
    creatureInit.kind === "character"
      ? (creatureInit.conditions?.reduce(
          (conditions, condition) => applyCondition(conditions, condition),
          EMPTY_CONDITION_STATE,
        ) ?? EMPTY_CONDITION_STATE)
      : EMPTY_CONDITION_STATE;
  const base = {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    side: input.side,
    maxHp: creatureInit.maxHp,
    tempHp: creatureInit.tempHp,
    ...initialKnockOutLifecycleFields(creatureInit, initialConditions),
    activeEffects: [],
    activeOngoingFeatureOccurrences: new Map(),
    concentration: null,
    dodging: false,
    hidden: null,
    zeroHpLifecycle,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
  };

  if (creatureInit.kind === "character") {
    const classLevels = parseCharacterBattleClassLevels(
      creatureInit.classLevels,
    );
    assertCharacterBattleLoadoutMatchesHands(creatureInit);
    assertCharacterBattleResourcesHaveUniqueUnits(creatureInit.resources ?? []);
    assertCharacterBattleFeaturesHaveUniqueUnits(
      creatureInit.unitFeatures ?? [],
    );
    return applyInitialZeroHpLifecycle({
      ...base,
      armorClass: creatureInit.armorClass,
      size: creatureInit.size,
      origin: {
        kind: "character",
        characterId: creatureInit.characterId,
        characterUnitRefs: creatureInit.characterUnitRefs,
        classLevels,
        selectedLoadout: creatureInit.selectedLoadout,
        speed: creatureInit.speed,
        attack: creatureInit.attack,
        unarmedStrike: creatureInit.unarmedStrike,
        ...(creatureInit.offHandAttack === undefined
          ? {}
          : { offHandAttack: creatureInit.offHandAttack }),
        resources: (creatureInit.resources ?? []).map((resource) =>
          characterResourceState(resource, classLevels),
        ),
        ongoingFeatureProfiles: characterOngoingFeatureProfiles(
          creatureInit.resources ?? [],
          creatureInit.unitFeatures ?? [],
          classLevels,
        ),
        attackDamageRiderProfiles: characterAttackDamageRiderProfiles(
          creatureInit.resources ?? [],
          creatureInit.unitFeatures ?? [],
          creatureInit.characterUnitRefs,
          classLevels,
        ),
        saveDamageReplacementProfiles: characterSaveDamageReplacementProfiles(
          creatureInit.resources ?? [],
          creatureInit.unitFeatures ?? [],
          creatureInit.characterUnitRefs,
          classLevels,
        ),
        reactionRollOrDamageReductionProfiles:
          characterReactionRollOrDamageReductionProfiles(
            creatureInit.resources ?? [],
            creatureInit.unitFeatures ?? [],
            creatureInit.characterUnitRefs,
            classLevels,
          ),
        ...(creatureInit.spellcasting === undefined
          ? {}
          : {
              spellcasting: characterSpellcastingState(
                creatureInit.spellcasting,
              ),
            }),
      },
    });
  }

  return applyInitialZeroHpLifecycle({
    ...base,
    armorClass: statBlockArmorClassState(
      literalStatBlockNumber(creatureInit.statBlock.statBlock.ac),
    ),
    size: literalCreatureSize(creatureInit.statBlock.statBlock.size),
    origin: {
      kind: "statBlock",
      statBlock: creatureInit.statBlock,
      resources: statBlockResourceState(creatureInit.statBlock.statBlock),
    },
  });
}

function hidePrerequisitesReferenceCombatantsIssue(
  hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>,
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): Either.Either<never, BattleStateInitIssue> | null {
  for (const combatantId of hidePrerequisites.keys()) {
    if (!combatants.has(combatantId)) {
      return battleStateInitIssue(
        "Hide prerequisite references unknown combatant.",
      );
    }
  }
  return null;
}

function assertCharacterBattleResourcesHaveUniqueUnits(
  resources: readonly CharacterBattleResourceInit[],
): void {
  const seen = new Set<UnitRecord["id"]>();
  for (const resource of resources) {
    if (seen.has(resource.unit.id)) {
      throw new Error(
        `Duplicate character battle resource unit: ${resource.unit.id}`,
      );
    }
    seen.add(resource.unit.id);
  }
}

function assertCharacterBattleFeaturesHaveUniqueUnits(
  features: readonly CharacterBattleFeatureInit[],
): void {
  const seen = new Set<string>();
  for (const feature of features) {
    if (seen.has(feature.unit.id)) {
      throw new Error(
        `Duplicate character battle feature unit: ${feature.unit.id}`,
      );
    }
    seen.add(feature.unit.id);
  }
}

function assertCharacterBattleLoadoutMatchesHands(
  creatureInit: CharacterBattleCreatureInit,
): void {
  const shield = creatureInit.selectedLoadout.shield;
  const weapon = creatureInit.selectedLoadout.weapon;
  const offHandWeapon = creatureInit.selectedLoadout.offHandWeapon;
  if (shield !== undefined && offHandWeapon !== undefined) {
    throw new Error(
      "Character battle loadout cannot wield shield and off-hand weapon.",
    );
  }
  if (
    weapon?.grip === "two_handed" &&
    (shield !== undefined || offHandWeapon !== undefined)
  ) {
    throw new Error("Two-handed weapon grip requires both hands free.");
  }
  const expectedLeftHandUse: HandUse =
    shield === undefined
      ? offHandWeapon === undefined
        ? "free"
        : "offWeapon"
      : "shield";
  const expectedRightHandUse: HandUse =
    weapon === undefined ? "free" : "mainWeapon";
  if (
    creatureInit.armorClass.leftHandUse !== expectedLeftHandUse ||
    creatureInit.armorClass.rightHandUse !== expectedRightHandUse
  ) {
    throw new Error(
      "Character battle loadout must match armor-class hand state.",
    );
  }
  if (weapon?.grip === "two_handed") {
    return;
  }
}

function literalCreatureSize(
  creatureSize: StatBlockRecord["statBlock"]["size"],
): Size {
  if (typeof creatureSize !== "string") {
    throw new Error("Battle runtime requires a concrete creature Size.");
  }
  return creatureSize;
}

function combatantInitiativeInsertionIndex(
  state: BattleState,
  initiative: InitiativeScore,
  tieOrderIndex?: number,
): number {
  const entries = initiativeEntries(state.initiative);
  const firstLower = entries.findIndex(
    (entry) => entry.initiative < initiative,
  );
  const orderedIndex = firstLower === -1 ? entries.length : firstLower;
  const firstTie = entries.findIndex(
    (entry) => entry.initiative === initiative,
  );
  if (firstTie === -1) return orderedIndex;
  let tieLength = 0;
  while (
    firstTie + tieLength < entries.length &&
    entries[firstTie + tieLength]?.initiative === initiative
  ) {
    tieLength += 1;
  }
  const tieIndex =
    tieOrderIndex === undefined
      ? tieLength
      : Math.max(0, Math.min(tieOrderIndex, tieLength));
  return firstTie + tieIndex;
}

function currentActorId(state: BattleState): CombatantId {
  return currentActing(state.initiative);
}

function activeOngoingFeatureOccurrencesForCombatant(
  combatant: BattleCreatureState,
): ReadonlyMap<OngoingFeatureSourceKey, ActiveOngoingFeatureOccurrence> {
  return new Map(
    [...combatant.activeOngoingFeatureOccurrences].filter(([key]) => {
      const profile = ongoingFeatureProfileForSourceKey(combatant, key);
      return (
        profile !== null &&
        !profile.lifecycle.earlyEndConditions.some((condition) =>
          hasCondition(combatant.conditions, condition),
        ) &&
        !profile.lifecycle.earlyEndArmorCategories.some((category) =>
          combatantWearingArmorCategory(combatant, category),
        )
      );
    }),
  );
}

function ongoingFeatureProfileForSourceKey(
  combatant: BattleCreatureState,
  key: OngoingFeatureSourceKey,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "ongoingFeature" }
> | null {
  if (!isCharacterBattleCreatureState(combatant)) {
    return null;
  }
  return combatant.origin.ongoingFeatureProfiles.get(key) ?? null;
}

function combatantWearingArmorCategory(
  combatant: BattleCreatureState,
  category: "heavy",
): boolean {
  return (
    combatant.armorClass.base.kind === "armor" &&
    combatant.armorClass.base.category === category
  );
}

function normalizeEarlyEndedOngoingFeatures(state: BattleState): BattleState {
  const combatants = new Map<CombatantId, BattleCreatureState>();
  let changed = false;
  for (const [id, combatant] of state.combatants) {
    const activeOngoingFeatureOccurrences =
      activeOngoingFeatureOccurrencesForCombatant(combatant);
    if (
      activeOngoingFeatureOccurrences.size !==
      combatant.activeOngoingFeatureOccurrences.size
    ) {
      changed = true;
      combatants.set(id, { ...combatant, activeOngoingFeatureOccurrences });
    } else {
      combatants.set(id, combatant);
    }
  }
  return changed ? { ...state, combatants } : state;
}

function combatantSnapshot(
  state: BattleState,
  combatant: BattleCreatureState,
): BattleCreatureSnapshot {
  const sourceGrapple = grappledBy(state, combatant.combatantId) ?? null;
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    initiative: combatant.initiative,
    side: combatant.side,
    origin: combatantOriginSnapshot(combatant),
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    armorClass: currentArmorClass(activeEffectArmorClass(combatant)),
    size: combatant.size,
    zeroHpLifecycle: combatantZeroHpLifecycleSnapshot(combatant),
    conditions: activeConditions(
      combatant.conditions,
      sourceGrapple !== null,
      combatant.hidden !== null,
    ),
    concentrating: combatant.concentration !== null,
    dodging: combatant.dodging,
    reactionAvailable: combatant.reactionAvailable,
    movement: battleMovementBudgetForActor(state, combatant.combatantId),
  };
}

function combatantOriginSnapshot(
  combatant: BattleCreatureState,
): BattleCreatureOriginSnapshot {
  return Match.value(combatant.origin).pipe(
    Match.when({ kind: "character" }, (origin) => ({
      kind: "character" as const,
      characterId: origin.characterId,
      resources: origin.resources.map(characterResourceSnapshot),
      spellcasting:
        origin.spellcasting === undefined
          ? null
          : { spellSlots: origin.spellcasting.spellSlots },
    })),
    Match.when({ kind: "statBlock" }, (origin) => ({
      kind: "statBlock" as const,
      statBlockId: origin.statBlock.id,
      resources: statBlockResourceSnapshot(
        origin.statBlock.statBlock,
        origin.resources,
      ),
    })),
    Match.exhaustive,
  );
}

function characterResourceSnapshot(
  resource: CharacterBattleResourceState,
): BattleCharacterResourceSnapshot {
  const common = {
    unitId: resource.unit.id,
    usedThisTurn: resource.usedThisTurn,
  };
  const usage = characterBattleResourceUsage(resource);
  const usesRemaining =
    "usesRemaining" in resource ? resource.usesRemaining : undefined;
  if (usage === "unlimited" || usesRemaining === undefined) {
    return {
      ...common,
      usage: "unlimited",
    };
  }
  return {
    ...common,
    usage: "limited",
    usesRemaining,
  };
}

function activeEffectArmorClass(
  combatant: BattleCreatureState,
): ArmorClassState {
  const mageArmor = combatant.activeEffects.find(
    (effect) => effect.kind === "spellBaseArmorClass",
  );
  if (mageArmor === undefined || combatant.armorClass.base.kind === "armor") {
    return combatant.armorClass;
  }
  return {
    ...combatant.armorClass,
    base: {
      kind: "ability_sum",
      base: armorClass(mageArmor.base),
      abilityModifiers: [mageArmor.ability],
      source: "spell_base_plus_ability",
    },
  };
}

function initialZeroHpLifecycleForCreatureOrigin(
  creatureInit: BattleCreatureInit["creatureInit"],
): ZeroHpLifecycle {
  return Match.value(creatureInit).pipe(
    Match.when({ kind: "statBlock" }, () => ({
      policy: "diesAtZeroHp" as const,
    })),
    Match.when({ kind: "character" }, (characterInit) => {
      const zeroHpLifecycle = characterInit.zeroHpLifecycle ?? {
        policy: "usesDeathSavingThrows" as const,
        deathSaves: resetDeathSaveRuntimeState(),
      };
      if (Number(characterInit.currentHp) > 0) {
        if (characterInit.zeroHpLifecycle !== undefined) {
          throw new Error(
            "Positive-HP character battle initialization cannot carry zero-HP lifecycle state.",
          );
        }
        return zeroHpLifecycle;
      }
      if (!validDeathSaveRuntimeState(zeroHpLifecycle.deathSaves)) {
        throw new Error(
          "Character battle initialization zero-HP lifecycle is invalid.",
        );
      }
      return zeroHpLifecycle;
    }),
    Match.exhaustive,
  );
}

function combatantZeroHpLifecycleSnapshot(
  combatant: BattleCreatureState,
): BattleCreatureZeroHpLifecycleSnapshot {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, (lifecycle) => ({
      policy: lifecycle.policy,
      dead: combatant.hp === 0,
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      policy: lifecycle.policy,
      deathSaves: lifecycle.deathSaves.deathSaves,
      stable: lifecycle.deathSaves.stable,
      dead: lifecycle.deathSaves.dead,
    })),
    Match.exhaustive,
  );
}

function positiveHpUnconsciousInitIssue(
  input: BattleCreatureInit,
): Either.Either<never, BattleStateInitIssue> | null {
  const creatureInit = input.creatureInit;
  if (
    creatureInit.kind !== "character" ||
    creatureInit.positiveHpUnconscious === undefined
  ) {
    return null;
  }
  if (Number(creatureInit.currentHp) !== 1) {
    return battleStateInitIssue(
      "Knocked Out Unconscious initialization requires exactly 1 current HP.",
    );
  }
  if (!(creatureInit.conditions ?? []).includes("unconscious")) {
    return battleStateInitIssue(
      "Knocked Out Unconscious initialization requires the Unconscious condition.",
    );
  }
  return null;
}

function knockedOutOneHp(): KnockedOutOneHp {
  return KnockedOutOneHp(Hp(1));
}

function knockedOutConditionState(
  conditions: ConditionState,
): KnockedOutConditionState {
  return KnockedOutConditionState(applyCondition(conditions, "unconscious"));
}

function battleCreatureStateWithKnockOutPreservedConditions(
  combatant: BattleCreatureState,
  conditions: ConditionState,
): BattleCreatureState {
  if (combatant.positiveHpUnconscious !== null) {
    return {
      ...combatant,
      conditions: knockedOutConditionState(conditions),
    };
  }

  return { ...combatant, conditions };
}

function nonKnockOutLifecycleFields(
  hp: Hp,
  conditions: ConditionState,
): BattleCreatureKnockOutLifecycle {
  return { hp, conditions, positiveHpUnconscious: null };
}

function battleCreatureStateWithoutKnockOut(
  combatant: BattleCreatureState,
  hp: Hp,
  conditions: ConditionState,
): BattleCreatureState {
  return { ...combatant, ...nonKnockOutLifecycleFields(hp, conditions) };
}

function battleCreatureStateWithDamageProjection(
  combatant: BattleCreatureState,
  projection: HpDamageProjection,
): BattleCreatureState {
  const tempHp = Hp(projection.currentTempHp - projection.tempHpAbsorbed);
  if (
    combatant.positiveHpUnconscious !== null &&
    Number(projection.nextHp) === 1
  ) {
    return { ...combatant, hp: knockedOutOneHp(), tempHp };
  }

  return {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      projection.nextHp,
      combatant.conditions,
    ),
    tempHp,
  };
}

function initialKnockOutLifecycleFields(
  creatureInit: BattleCreatureInit["creatureInit"],
  conditions: ConditionState,
): BattleCreatureKnockOutLifecycle {
  if (
    creatureInit.kind === "character" &&
    creatureInit.positiveHpUnconscious !== undefined
  ) {
    return {
      hp: KnockedOutOneHp(creatureInit.currentHp),
      conditions: KnockedOutConditionState(conditions),
      positiveHpUnconscious: creatureInit.positiveHpUnconscious,
    };
  }

  return {
    hp: creatureInit.currentHp,
    conditions,
    positiveHpUnconscious: null,
  };
}

export function combatantKnockedOutUnconscious(
  combatant: BattleCreatureState,
): Either.Either<BattlePositiveHpUnconscious | null, BattleStateInitIssue> {
  if (combatant.positiveHpUnconscious === null) return Either.right(null);
  if (
    Number(combatant.hp) !== 1 ||
    !hasCondition(combatant.conditions, "unconscious")
  ) {
    return battleStateInitIssue(
      "BattleCreatureState invariant violated: Knocked Out Unconscious requires exactly 1 HP and the Unconscious condition.",
    );
  }
  return Either.right(combatant.positiveHpUnconscious);
}

function combatantCanTakeActions(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState {
  return (
    combatant != null &&
    !isIncapacitated(combatant.conditions) &&
    !zeroHpLifecycleIsTerminal(combatant)
  );
}

function combatantCanTakeReactions(
  combatant: BattleCreatureState | undefined,
): boolean {
  return combatantCanTakeActions(combatant) && combatant.reactionAvailable;
}

function activeConditions(
  state: ConditionState,
  includeGrappled = false,
  includeHiddenInvisible = false,
): readonly Condition[] {
  return ALL_CONDITIONS.filter(
    (condition) =>
      hasCondition(state, condition) ||
      (condition === "grappled" && includeGrappled) ||
      (condition === "invisible" && includeHiddenInvisible),
  );
}

function grappledBy(
  state: BattleState,
  targetId: CombatantId,
): BattleGrappleLink | undefined {
  return state.grapples.find((grapple) => grapple.targetId === targetId);
}

function combatantHandUses(
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): { readonly left: HandUse; readonly right: HandUse } {
  return {
    left: handUseForOccupancy(
      combatant.armorClass.leftHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "left",
      ),
    ),
    right: handUseForOccupancy(
      combatant.armorClass.rightHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "right",
      ),
    ),
  };
}

function handUseForOccupancy(
  occupancy: HandUse,
  occupiedByGrapple: boolean,
): HandUse {
  if (occupiedByGrapple) return "grapple";
  return occupancy;
}

function battleSubjectActorId(subject: BattleSubject): CombatantId {
  return subject.actorId;
}

function isLegendaryAttackSubject(subject: BattleSubject): boolean {
  return (
    subject.tag === "action" &&
    subject.action === "attack" &&
    subject.statBlockSection === "legendaryActions"
  );
}

function statBlockLegendaryActionWindowIsOpen(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return (
    state.legendaryActionWindow !== null &&
    !state.legendaryActionWindow.consumed &&
    actorId !== state.legendaryActionWindow.afterTurnActorId &&
    actorId !== currentActorId(state)
  );
}

function closeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : { ...state, legendaryActionWindow: null };
}

function consumeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : {
        ...state,
        legendaryActionWindow: {
          ...state.legendaryActionWindow,
          consumed: true,
        },
      };
}

function characterOngoingFeatureProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  OngoingFeatureSourceKey,
  Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }>
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "ongoingFeature"
        ? [[ongoingFeatureSourceKeyForUnit(unit.id), profile] as const]
        : [];
    }),
  );
}

function characterAttackDamageRiderProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<SupportedUnitFeatureProfile, { readonly kind: "attackDamageRider" }>
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "attackDamageRider" &&
        unitRefSupportsProfile(
          unitRefs,
          unit.id,
          ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
        )
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

function characterSaveDamageReplacementProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "saveDamageReplacement" }
  >
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "saveDamageReplacement" &&
        unitRefSupportsProfile(
          unitRefs,
          unit.id,
          SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
        )
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

function characterReactionRollOrDamageReductionProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "reactionRollOrDamageReduction" }
  >
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "reactionRollOrDamageReduction" &&
        unitRefSupportsProfile(
          unitRefs,
          unit.id,
          REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
        )
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

function unitRefSupportsProfile(
  unitRefs: readonly BattleUnitRef[],
  unitId: UnitRecord["id"],
  supportProfile: BattleUnitSupportProfile,
): boolean {
  return unitRefs.some(
    (unitRef) =>
      unitRef.unitId === unitId &&
      unitRef.supportProfiles.some((profile) => profile === supportProfile) ===
        true,
  );
}

function literalStatBlockNumber(value: StatBlockValue): number {
  if (value.kind !== "literal") {
    throw new Error(
      "Battle runtime initialization requires literal Stat Block numeric values.",
    );
  }
  return value.value;
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

export function scoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function breakBattleConcentration(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const concentration = state.combatants.get(combatantId)?.concentration;
  let readiedSpells: ReadonlyMap<CombatantId, BattleReadiedSpell> =
    state.readiedSpells;
  if (concentration?.effectKind === "readiedSpell") {
    const remainingReadiedSpells = new Map(state.readiedSpells);
    remainingReadiedSpells.delete(combatantId);
    readiedSpells = remainingReadiedSpells;
  }
  return {
    ...state,
    combatants: breakCombatantConcentration(state.combatants, combatantId),
    readiedSpells,
  };
}

function breakBattleConcentrationAfterDamage(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly priorConcentration: BattleConcentration | null;
}): BattleState {
  const currentConcentration =
    input.state.combatants.get(input.combatantId)?.concentration ?? null;
  if (currentConcentration !== null) {
    return breakBattleConcentration(input.state, input.combatantId);
  }
  if (input.priorConcentration?.effectKind !== "readiedSpell") {
    return input.state;
  }
  const readiedSpells = new Map(input.state.readiedSpells);
  readiedSpells.delete(input.combatantId);
  return { ...input.state, readiedSpells };
}

export function concentrationSavingThrowDc(
  damageAmount: number,
): DifficultyClass {
  return difficultyClass(
    Math.min(30, Math.max(10, Math.floor(Math.max(0, damageAmount) / 2))),
  );
}

export function resolveBattleConcentrationDamage(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly damageAmount: number;
  readonly savingThrowSucceeded: boolean;
}): BattleState {
  const combatant = input.state.combatants.get(input.combatantId);
  if (
    combatant?.concentration === null ||
    combatant === undefined ||
    input.damageAmount <= 0 ||
    input.savingThrowSucceeded
  ) {
    return input.state;
  }
  return breakBattleConcentration(input.state, input.combatantId);
}

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
  const selectedDamageRiders =
    fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          fillSet.damageRoll.selectedAttackDamageRiderUnitIds,
        ) ?? []);
  const fixedDamageByTypeBeforeTargetAdjustments = hit
    ? fixedAttackDamageByTypeEntries(
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
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
          eligibleDamageRiders,
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
    const reducedFixedDamageAmount = attackDamageEventAmountForTarget(
      target,
      reducedDamageEvent,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target,
      damageAmount: reducedFixedDamageAmount,
    });
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    } else if (fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage disposition is only valid when melee attack damage can Knock Out the target.",
      );
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEvent,
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
      target,
      reducedFixedDamageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsAttackDamageConcentrationResult({
          state: attackRolledState,
          subject: input.subject,
          attack,
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEvent,
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
        attackRolledState,
        input.subject.actorId,
        target.combatantId,
        toDamageAmount(reducedFixedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        [],
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
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        ),
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
    const damageValidation = validateAttackDamageFill(
      fillSet.damageRoll,
      attack,
      critical,
      fillSet.attackRoll,
      eligibleDamageRiders,
      ongoingFeatureDamageModifier(
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      ),
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
    );
    const damageEvent = {
      kind: "rolledDamage" as const,
      damageRollByType,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const reducedDamageAmount = attackDamageEventAmountForTarget(
      target,
      reducedDamageEvent,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target,
      damageAmount: reducedDamageAmount,
    });
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    } else if (fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage disposition is only valid when melee attack damage can Knock Out the target.",
      );
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEvent,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: selectedDamageRiders,
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
      target,
      reducedDamageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsAttackDamageConcentrationResult({
          state: attackRolledState,
          subject: input.subject,
          attack,
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEvent,
            fills: attackDamagePrefixFills(input.fills),
            deathFailuresAtZeroHp: critical ? 2 : 1,
            damageDisposition: fillSet.damageDisposition,
            attackDamageRiders: selectedDamageRiders,
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
        attackRolledState,
        input.subject.actorId,
        target.combatantId,
        toDamageAmount(reducedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        selectedDamageRiders,
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
  const spent = spendAction(input.state.currentTurnResources, "dash");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  const nextState = applyDashToActor(input.state, actor, spent.right);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyDashToActor(
  state: BattleState,
  actor: BattleCreatureState,
  spentResources: BattleTurnResources,
): BattleState {
  const speed = effectiveWalkSpeed(
    actor,
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
    )
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
  const nextState = applyDashToActor(input.state, actor, spent.right);
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
  const nextState = {
    ...input.state,
    currentTurnResources: {
      ...spent.right,
      actionResources: [
        ...spent.right.actionResources,
        ...multiattack.dispatches.map((dispatch) => ({
          kind: "action" as const,
          source: "statBlockMultiattack" as const,
          sourceOwnerId: input.subject.actorId,
          attackPart: { section: "actions" as const, name: dispatch.part.name },
          restriction: {
            kind: "exclude" as const,
            actions: STAT_BLOCK_MULTIATTACK_RESOURCE_EXCLUDED_ACTIONS,
          },
        })),
      ],
    },
  };
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
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
          eligibleDamageRiders,
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
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        ),
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
    const damageValidation = validateAttackDamageFill(
      fillSet.damageRoll,
      attack,
      critical,
      fillSet.attackRoll,
      eligibleDamageRiders,
      ongoingFeatureDamageModifier(
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      ),
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
    );
    const damageEvent = {
      kind: "rolledDamage" as const,
      damageRollByType,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const damageAmount = attackDamageEventAmountForTarget(
      target,
      reducedDamageEvent,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target,
      damageAmount,
    });
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    } else if (fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage disposition is only valid when melee attack damage can Knock Out the target.",
      );
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEvent,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: selectedDamageRiders,
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
      target,
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
      attackRolledState,
      input.subject.actorId,
      target.combatantId,
      damageAmount,
      critical ? 2 : 1,
      fillSet.damageDisposition,
      selectedDamageRiders,
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
  const spent = spendAction(input.state.currentTurnResources, "attack");
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

function assertCurrentHpWithinMaxHp(
  creatureInit: BattleCreatureInit["creatureInit"],
): void {
  if (creatureInit.currentHp > creatureInit.maxHp) {
    throw new Error("Battle initialization current HP exceeds max HP.");
  }
}

type AttackFillSet =
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
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
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
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
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

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return { tag: "invalid", message: "Attack roll was filled twice." };
      }
      attackRoll = fill.value;
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

function hideAbilityCheckHole(): BattleAbilityCheckHole {
  return {
    holeInstanceKey: HIDE_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: HIDE_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Hide Dexterity (Stealth) check (DC ${HIDE_DC})`,
    ability: "dex",
    skill: "stealth",
    dc: HIDE_DC,
  };
}

function searchAbilityCheckHole(dc: DifficultyClass): BattleAbilityCheckHole {
  return {
    holeInstanceKey: SEARCH_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: SEARCH_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Search Wisdom (Perception) check (DC ${dc})`,
    ability: "wis",
    skill: "perception",
    dc,
  };
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
  ongoingDamageModifier = 0,
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
    attackDamageHoleId(attack, critical, attackRoll, ongoingDamageModifier)
  ) {
    return critical
      ? "Critical hit damage must use the critical damage hole."
      : "Attack damage must use the normal hit damage hole.";
  }

  return validateRolledDiceForWeaponAttack(
    fill.value,
    attack,
    critical,
    attackRoll,
    selectedRiders,
  );
}

function validateRolledDiceForWeaponAttack(
  groups: ReadonlyArray<RolledDiceGroup>,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[],
): string | null {
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
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

function attackRollIsCriticalHit(
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
  const spent =
    multiattackResources.length > 0 &&
    attack.kind === "statBlockAttack" &&
    attack.part.section === "actions"
      ? spendMatchingActionResource(
          state.currentTurnResources,
          "attack",
          (resource) =>
            isStatBlockMultiattackActionResource(resource, actorId) &&
            resource.attackPart.section === attack.part.section &&
            resource.attackPart.name === attack.part.name,
        )
      : spendAction(state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  const nextTurnResources =
    attack.kind === "weapon" && isLightMeleeWeapon(attack.weapon)
      ? {
          ...spent.right,
          lightWeaponAttackMade: {
            weaponItemId: heldWeaponItemIdForAttack(state, actorId, attack),
          },
        }
      : spent.right;

  const nextState = spendStatBlockAttackResources({
    state: {
      ...state,
      currentTurnResources: nextTurnResources,
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
  const combatantsAfterStartOngoingFeatures = expireStartOfTurnOngoingFeatures(
    combatantsAfterEndTurnOngoingFeatures,
    nextActorId,
  );
  const combatantsAfterStartEffects = expireStartOfTurnEffects(
    combatantsAfterStartOngoingFeatures,
    nextActorId,
  );
  const combatantsAfterRecharge =
    statBlockRechargeRolls === undefined
      ? combatantsAfterStartEffects
      : processStatBlockRechargeRolls(
          combatantsAfterStartEffects,
          nextActorId,
          statBlockRechargeRolls,
        );
  const nextState = {
    ...state,
    initiative,
    combatants: combatantsAfterRecharge,
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

function expireStartOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => [
      id,
      {
        ...combatant,
        activeEffects: combatant.activeEffects.filter(
          (effect) =>
            effect.kind !== "speedDelta" ||
            effect.expiresAt.combatantId !== actorId,
        ),
      },
    ]),
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
      attackRollHole(attack, requiredRollMode),
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
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
          eligibleDamageRiders,
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
  const fixedDamageAmount = fixedAttackDamageAmount(
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
    const reducedFixedDamageAmount = attackDamageEventAmountForTarget(
      target,
      reducedDamageEvent,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: subject.reactorId,
      target,
      damageAmount: reducedFixedDamageAmount,
    });
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    } else if (fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage disposition is only valid when melee attack damage can Knock Out the target.",
      );
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: subject.reactorId,
          targetId: subject.targetId,
          damageEvent: reducedDamageEvent,
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
      target,
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
      attackRolledState,
      subject.reactorId,
      subject.targetId,
      reducedFixedDamageAmount,
      critical ? 2 : 1,
      fillSet.damageDisposition,
      [],
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
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(subject.reactorId),
          attack,
        ),
      ),
    ]);
  }
  const damageValidation = validateAttackDamageFill(
    fillSet.damageRoll,
    attack,
    critical,
    fillSet.attackRoll,
    eligibleDamageRiders,
    ongoingFeatureDamageModifier(
      attackRolledState.combatants.get(subject.reactorId),
      attack,
    ),
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
  );
  const damageEvent = {
    kind: "rolledDamage" as const,
    damageRollByType,
  } satisfies BattleAttackDamageEvent;
  const reducedDamageEvent = attackDamageEventAfterPendingReductions(
    damageEvent,
    pendingAttackDamageReductions,
  );
  const reducedDamageAmount = attackDamageEventAmountForTarget(
    target,
    reducedDamageEvent,
  );
  const damageDispositionHole = attackDamageDispositionHole({
    attack,
    attackerId: subject.reactorId,
    target,
    damageAmount: reducedDamageAmount,
  });
  if (damageDispositionHole !== null) {
    if (!fillSet.damageDispositionFilled) {
      return needsHolesResult(attackRolledState, input.subject, [
        damageDispositionHole,
      ]);
    }
  } else if (fillSet.damageDispositionFilled) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage disposition is only valid when melee attack damage can Knock Out the target.",
    );
  }
  const attackDamageReactionWindow = maybeOpenReactionWindow(
    attackRolledState,
    {
      trigger: "attackDamage",
      continuation: {
        kind: "attackDamage",
        subject: input.subject,
        attackerId: subject.reactorId,
        targetId: subject.targetId,
        damageEvent: reducedDamageEvent,
        fills: attackDamagePrefixFills(input.fills),
        deathFailuresAtZeroHp: critical ? 2 : 1,
        damageDisposition: fillSet.damageDisposition,
        attackDamageRiders: selectedDamageRiders,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (attackDamageReactionWindow !== null) {
    return attackDamageReactionWindow;
  }
  const concentrationSave = concentrationSavingThrowHole(
    target,
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
    attackRolledState,
    subject.reactorId,
    subject.targetId,
    reducedDamageAmount,
    critical ? 2 : 1,
    fillSet.damageDisposition,
    selectedDamageRiders,
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
  return movementHoleWithBudget(
    actorId,
    battleMovementBudgetForActor(state, actorId).remainingFeet,
  );
}

function readiedMovementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  return movementHoleWithBudget(
    actorId,
    readiedMovementBudgetForActor(state, actorId),
  );
}

function movementHoleWithBudget(
  actorId: CombatantId,
  movementBudgetFeet: MovementFeet,
): BattleMovementHole {
  return {
    kind: "movement",
    holeInstanceKey: MOVEMENT_HOLE_INSTANCE,
    holeId: MOVEMENT_HOLE_ID,
    label: "Movement",
    actorId,
    movementBudgetFeet,
  };
}

function readiedMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
): MovementFeet {
  const actor = state.combatants.get(actorId);
  return actor === undefined
    ? movementFeet(0)
    : effectiveWalkSpeed(
        actor,
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
    battleMovementBudgetForActor(state, moverId).remainingFeet;
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
  if (fill.value.movementCostFeet > Number(movementBudgetFeet)) {
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
      movementCostFeet: movementFeet(fill.value.movementCostFeet),
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
        ? battleMovementBudgetForActor(state, movement.moverId).remainingFeet
        : readiedMovementBudgetForActor(state, movement.moverId),
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
  if (readied.invocation.kind === "cantripSaveGateDamage") {
    return [spellSavingThrowOutcomeHole(state, casterId, readied.invocation)];
  }
  if (readied.invocation.kind === "preparedSlotSpell") {
    return [spellTargetAllocationHole(state, casterId, readied.invocation)];
  }
  return [spellTargetHole(state, casterId, readied.invocation)];
}

function readiedMovementInitialHoles(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleHole[] {
  const movementBudget = readiedMovementBudgetForActor(state, actorId);
  return Number(movementBudget) > 0
    ? [readiedMovementHole(state, actorId)]
    : [];
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
    spellId: readied.invocation.spell.id,
    spellActId: supportedSpellActId(readied.invocation),
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
      ),
      spendsTurnMovement: false,
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

function isCharacterBattleCreatureState(
  actor: BattleCreatureState | undefined,
): actor is CharacterBattleCreatureState {
  return actor?.origin.kind === "character";
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

function activeOngoingFeatureOccurrenceFromProfile(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): ActiveOngoingFeatureOccurrence {
  const expiresAt = ongoingFeatureExpirationFromProfile(
    state,
    actorId,
    unitFeature,
  );
  if (unitFeature.lifecycle.kind === "roundExtended") {
    return {
      kind: "roundExtended",
      expiresAt: requireEndOfTurnOngoingFeatureExpiration(expiresAt),
      maxExpiresAt: {
        kind: "endOfTurn",
        combatantId: actorId,
        round: Round(
          Number(state.initiative.round) +
            unitFeature.lifecycle.maximumDurationRounds,
        ),
      },
    };
  }
  if (unitFeature.lifecycle.kind === "fixedDuration") {
    return {
      kind: "fixedDuration",
      expiresAt: requireEndOfTurnOngoingFeatureExpiration(expiresAt),
    };
  }
  return {
    kind: "turnBoundary",
    expiresAt,
  };
}

function requireEndOfTurnOngoingFeatureExpiration(
  expiration: OngoingFeatureExpiration,
): EndOfTurnOngoingFeatureExpiration {
  if (expiration.kind !== "endOfTurn") {
    throw new Error(
      "Duration-based ongoing features must expire at end of turn.",
    );
  }
  return expiration;
}

function ongoingFeatureExpirationFromProfile(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): OngoingFeatureExpiration {
  if (
    unitFeature.lifecycle.kind === "turnBoundary" &&
    unitFeature.lifecycle.initialExpiration === "startOfNextTurn"
  ) {
    return { kind: "startOfTurn", combatantId: actorId };
  }
  const rounds =
    unitFeature.lifecycle.kind === "fixedDuration"
      ? unitFeature.lifecycle.maximumDurationRounds
      : 1;
  return {
    kind: "endOfTurn",
    combatantId: actorId,
    round: Round(Number(state.initiative.round) + rounds),
  };
}

function extendOngoingFeatureToEndOfNextTurn(
  state: BattleState,
  actorId: CombatantId,
  occurrence: ActiveOngoingFeatureOccurrence,
): ActiveOngoingFeatureOccurrence {
  if (occurrence.kind !== "roundExtended") {
    return occurrence;
  }
  const nextExpiresAt: OngoingFeatureExpiration = {
    kind: "endOfTurn",
    combatantId: actorId,
    round: Round(Number(state.initiative.round) + 1),
  };
  return {
    ...occurrence,
    expiresAt: clampOngoingFeatureExpiration(nextExpiresAt, occurrence),
  };
}

function clampOngoingFeatureExpiration(
  nextExpiresAt: OngoingFeatureExpiration,
  occurrence: Extract<
    ActiveOngoingFeatureOccurrence,
    { readonly kind: "roundExtended" }
  >,
): EndOfTurnOngoingFeatureExpiration {
  const endOfTurn = requireEndOfTurnOngoingFeatureExpiration(nextExpiresAt);
  if (Number(endOfTurn.round) <= Number(occurrence.maxExpiresAt.round)) {
    return endOfTurn;
  }
  return occurrence.maxExpiresAt;
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

function discoverSupportedSpellActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return [];
  }
  return supportedSpellActs(actor).flatMap(
    (invocation): readonly AvailableBattleAct[] => {
      if (!spellHasAvailableSpend(actor, invocation)) {
        return [];
      }
      if (
        !spellActTurnResourceAvailable(state.currentTurnResources, invocation)
      ) {
        return [];
      }
      if (invocation.kind === "cantripSaveGateDamage") {
        const savingThrowHole = spellSavingThrowOutcomeHole(
          state,
          actorId,
          invocation,
        );
        const castActs = [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              spellId: invocation.spell.id,
              spellActId: supportedSpellActId(invocation),
            },
            label: invocation.spell.name,
            summary: `Cast ${invocation.spell.name} as a cantrip; table-supplied affected targets make ${invocation.ability.toUpperCase()} Saving Throws.`,
            initialHoles: [savingThrowHole],
          },
        ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      const targetHole =
        invocation.kind === "preparedSlotSpell"
          ? spellTargetAllocationHole(state, actorId, invocation)
          : spellTargetHole(state, actorId, invocation);
      const castActs =
        targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: spellSubjectTagForInvocation(invocation),
                  actorId,
                  spellId: invocation.spell.id,
                  spellActId: supportedSpellActId(invocation),
                },
                label: invocation.spell.name,
                summary:
                  invocation.kind === "preparedSlotSpell"
                    ? `Cast ${invocation.spell.name} using a level ${invocation.slotLevel} Spell Slot, allocating ${invocation.targeting.repeatedEffectCount} repeated effects among targets.`
                    : invocation.kind === "preparedHealingSpell"
                      ? `Cast ${invocation.spell.name} using a level ${invocation.slotLevel} Spell Slot as a Bonus Action.`
                      : `Cast ${invocation.spell.name} as a cantrip.`,
                initialHoles: [targetHole],
              },
            ];
      return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
    },
  );
}

function spellSubjectTagForInvocation(
  invocation: SupportedSpellAct,
): "actionSpell" | "bonusActionSpell" {
  return invocation.kind === "preparedHealingSpell"
    ? "bonusActionSpell"
    : "actionSpell";
}

function activeOngoingFeaturesPreventSpellcasting(
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

function spellRequiresVerbal(spell: SpellRecord): boolean {
  return (
    spell.mechanics.family === "activation" && spell.mechanics.components.v
  );
}

function readiedSpellAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellAct,
): readonly AvailableBattleAct[] {
  if (
    invocation.kind === "preparedPersistentSpell" ||
    invocation.kind === "preparedHealingSpell" ||
    state.readiedSpells.has(actorId)
  ) {
    return [];
  }
  return BATTLE_READIED_SPELL_TRIGGERS.map((trigger) => ({
    subject: {
      tag: "actionSpell" as const,
      actorId,
      spellId: invocation.spell.id,
      spellActId: readiedSpellActId(invocation),
      readyTrigger: trigger,
    },
    label: `Ready ${invocation.spell.name}`,
    summary: `Ready ${invocation.spell.name} for ${reactionTriggerLabel(trigger)}; holding the spell requires Concentration until the start of your next turn.`,
    initialHoles: [],
  }));
}

function readiedSpellActId(invocation: SupportedDamageSpellAct): string {
  return `readiedSpell:${supportedSpellActId(invocation)}`;
}

function isReadiedSpellActId(spellActId: string | undefined): boolean {
  return spellActId?.startsWith("readiedSpell:") === true;
}

function castSpellActIdFromReadied(spellActId: string): string {
  return spellActId.slice("readiedSpell:".length);
}

function resolveSpellAct(
  input: ActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const resolvedSpellActId =
    subject.spellActId !== undefined && isReadiedSpellActId(subject.spellActId)
      ? castSpellActIdFromReadied(subject.spellActId)
      : subject.spellActId;
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find((candidate) =>
          resolvedSpellActId === undefined
            ? candidate.spell.id === subject.spellId
            : supportedSpellActId(candidate) === resolvedSpellActId,
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Action-time spell act requires a supported prepared spell or cantrip.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act no longer has its required runtime spell resource.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (invocation.kind === "preparedHealingSpell") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Prepared Bonus Action healing spells must use the Bonus Action spell subject.",
    );
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  if (
    subject.readyTrigger !== undefined &&
    (subject.spellActId === undefined ||
      !isReadiedSpellActId(subject.spellActId))
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Ready trigger selection is only valid for a Ready spell act.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, subject.actorId)
    : input.state;
  if (
    subject.spellActId !== undefined &&
    isReadiedSpellActId(subject.spellActId)
  ) {
    return resolveReadySpellAct({ ...input, state: castingState }, invocation);
  }

  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.kind === "cantripSaveGateDamage") {
    return resolveSaveGateDamageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.kind === "preparedSlotSpell") {
    return resolvePreparedSlotSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(castingState, input.subject, [
      spellTargetHole(castingState, subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }

  if (invocation.kind === "preparedPersistentSpell") {
    if (
      fillSet.attackRoll != null ||
      fillSet.damageRoll != null ||
      fillSet.concentrationSavingThrows.length > 0
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Persistent spell effects do not use attack or damage fills.",
      );
    }
    const effected = applyPersistentSpellActiveEffect(
      castingState,
      subject.actorId,
      target.combatantId,
      invocation,
    );
    const spent = spendAction(effected.currentTurnResources, "magic");
    if (Either.isLeft(spent)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Magic action is no longer available for the current actor.",
      );
    }
    const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
    if (Either.isLeft(slotTurnResources)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "This turn has already expended a Spell Slot.",
      );
    }
    const slotted = expendSpellSlot(
      effected,
      subject.actorId,
      invocation.slotLevel,
    );
    const nextState = {
      ...slotted,
      currentTurnResources: slotTurnResources.right,
    };
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    castingState,
    {
      trigger: "spellCast",
      casterId: subject.actorId,
      spellId: invocation.spell.id,
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (invocation.kind === "cantripSpellAttack") {
    const requiredRollMode = requiredAttackRollMode(
      castingState,
      subject.actorId,
      target.combatantId,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(castingState, input.subject, [
        spellAttackRollHole(invocation, requiredRollMode),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const hit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    if (hit && fillSet.damageRoll == null) {
      return needsHolesResult(
        recordAttackRollOngoingFeatures(
          castingState,
          subject.actorId,
          target.combatantId,
          null,
        ),
        input.subject,
        [spellDamageHole(invocation, critical)],
      );
    }
    if (!hit && fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return spendMagicAction(
        recordAttackRollOngoingFeatures(
          castingState,
          subject.actorId,
          target.combatantId,
          null,
        ),
      );
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    return needsHolesResult(castingState, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const spellResolutionState =
    invocation.kind === "cantripSpellAttack" && fillSet.attackRoll != null
      ? recordAttackRollOngoingFeatures(
          castingState,
          subject.actorId,
          target.combatantId,
          null,
        )
      : castingState;
  const critical =
    invocation.kind === "cantripSpellAttack" &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const spellDamageAmount = spellDamageAmountForTarget(
    target,
    invocation,
    fillSet.damageRoll,
  );
  const concentrationSave = concentrationSavingThrowHole(
    target,
    spellDamageAmount,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(spellResolutionState, input.subject, [
        concentrationSave,
      ]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damaged = applySpellDamage(
    spellResolutionState,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    concentrationFill,
  );
  const effected = applySpellActiveEffects(
    damaged,
    subject.actorId,
    target.combatantId,
    invocation,
  );
  const spent = spendAction(effected.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const nextState = { ...effected, currentTurnResources: spent.right };
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: subject.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(spellDamageAmount),
      continuation: {
        kind: "resolved",
        subject: input.subject,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveBonusActionSpellAct(
  input: BonusActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find((candidate) =>
          subject.spellActId === undefined
            ? candidate.spell.id === subject.spellId
            : supportedSpellActId(candidate) === subject.spellActId,
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action spell act requires a supported prepared spell.",
    );
  }
  if (invocation.kind !== "preparedHealingSpell") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Bonus Action spell subject requires a supported Bonus Action spell act.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, subject.actorId)
    : input.state;
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (
    fillSet.attackRoll !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.damageRoll !== undefined
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bonus Action healing spells use one target fill and one healing roll.",
    );
  }
  if (fillSet.targetId == null) {
    return needsHolesResult(castingState, input.subject, [
      spellTargetHole(castingState, subject.actorId, invocation),
    ]);
  }
  const target = castingState.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      castingState,
      subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    castingState,
    {
      trigger: "spellCast",
      casterId: subject.actorId,
      spellId: invocation.spell.id,
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (fillSet.healingRoll == null) {
    return needsHolesResult(castingState, input.subject, [
      spellHealingRollHole(invocation),
    ]);
  }
  const healingValidation = validateSpellHealingFill(
    fillSet.healingRoll,
    invocation,
  );
  if (healingValidation !== null) {
    return invalidResult(input.state, "invalidFill", healingValidation);
  }
  const healed = {
    ...castingState,
    combatants: new Map(castingState.combatants).set(
      target.combatantId,
      applyHpHealing(
        target,
        spellHealingAmount(invocation, fillSet.healingRoll),
      ),
    ),
  };
  const spent = spendActivationResource(healed.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    healed,
    subject.actorId,
    invocation.slotLevel,
  );
  const nextState = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveReadySpellAct(
  input: ActionSpellBattleResolutionInput,
  invocation: SupportedSpellAct,
): BattleResolutionResult {
  if (invocation.kind === "preparedPersistentSpell") {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Persistent spell effects cannot be readied by this runtime lane.",
    );
  }
  if (invocation.kind === "preparedHealingSpell") {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action healing spells cannot be readied by this runtime lane.",
    );
  }
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready Spell does not accept release-time fills.",
    );
  }
  if (input.state.readiedSpells.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This caster is already holding a readied spell.",
    );
  }
  if (input.subject.readyTrigger === undefined) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Ready Spell requires a selected Reaction trigger.",
    );
  }

  const afterPriorConcentration = breakBattleConcentration(
    input.state,
    input.subject.actorId,
  );
  const refreshedActor = afterPriorConcentration.combatants.get(
    input.subject.actorId,
  );
  if (refreshedActor?.origin.kind !== "character") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready Spell caster is no longer available.",
    );
  }
  const concentratingActor = {
    ...refreshedActor,
    concentration: {
      sourceSpellId: invocation.spell.id,
      effectKind: "readiedSpell" as const,
    },
  };
  const withConcentration = {
    ...afterPriorConcentration,
    combatants: new Map(afterPriorConcentration.combatants).set(
      input.subject.actorId,
      concentratingActor,
    ),
    readiedSpells: new Map(afterPriorConcentration.readiedSpells).set(
      input.subject.actorId,
      {
        invocation,
        trigger: input.subject.readyTrigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  const spent = spendAction(withConcentration.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotted =
    invocation.kind === "preparedSlotSpell"
      ? expendSpellSlot(
          withConcentration,
          input.subject.actorId,
          invocation.slotLevel,
        )
      : withConcentration;
  const nextTurnResources =
    invocation.kind === "preparedSlotSpell"
      ? markSpellSlotExpendedThisTurn(spent.right)
      : Either.right(spent.right);
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

function resolveSpellRelease(
  input: ActionSpellBattleResolutionInput,
  invocation: SupportedDamageSpellAct,
): BattleResolutionResult {
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.kind === "cantripSaveGateDamage") {
    return resolveSaveGateDamageSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.kind === "preparedSlotSpell") {
    return resolvePreparedSlotSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetHole(input.state, input.subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (invocation.kind === "cantripSpellAttack") {
    const requiredRollMode = requiredAttackRollMode(
      input.state,
      input.subject.actorId,
      target.combatantId,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(input.state, input.subject, [
        spellAttackRollHole(invocation, requiredRollMode),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const releaseAttackRolledState = recordAttackRollOngoingFeatures(
      input.state,
      input.subject.actorId,
      target.combatantId,
      null,
    );
    const hit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    if (hit && fillSet.damageRoll == null) {
      return needsHolesResult(releaseAttackRolledState, input.subject, [
        spellDamageHole(invocation, critical),
      ]);
    }
    if (!hit && fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return {
        tag: "resolved",
        state: releaseAttackRolledState,
        snapshot: snapshotBattle(releaseAttackRolledState),
      };
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const critical =
    invocation.kind === "cantripSpellAttack" &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const concentrationSave = concentrationSavingThrowHole(
    target,
    spellDamageAmountForTarget(target, invocation, fillSet.damageRoll),
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(input.state, input.subject, [concentrationSave]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const releaseResolutionState =
    invocation.kind === "cantripSpellAttack" && fillSet.attackRoll != null
      ? recordAttackRollOngoingFeatures(
          input.state,
          input.subject.actorId,
          target.combatantId,
          null,
        )
      : input.state;
  const damaged = applySpellDamage(
    releaseResolutionState,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    concentrationFill,
  );
  const effected = applySpellActiveEffects(
    damaged,
    input.subject.actorId,
    target.combatantId,
    invocation,
  );
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

function resolveSaveGateDamageSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const beforeSpend = resolveSaveGateDamageSpellAct(input);
  if (beforeSpend.tag !== "resolved") {
    return beforeSpend;
  }
  return {
    tag: "resolved",
    state: {
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    },
    snapshot: snapshotBattle({
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    }),
  };
}

type SpellFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly targetAllocation:
        | {
            readonly allocations: readonly BattleSpellTargetAllocation[];
            readonly spatialFacts: readonly Extract<
              BattleTargetSpatialFact,
              { readonly kind: "spellTarget" }
            >[];
          }
        | undefined;
      readonly attackRoll: AttackRollResult | undefined;
      readonly savingThrowOutcomes: BattleSavingThrowOutcomeValue | undefined;
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
      readonly healingRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function spellFillSet(
  fills: readonly BattleFill[],
  invocation: SupportedSpellAct,
): SpellFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let targetAllocation:
    | {
        readonly allocations: readonly BattleSpellTargetAllocation[];
        readonly spatialFacts: readonly Extract<
          BattleTargetSpatialFact,
          { readonly kind: "spellTarget" }
        >[];
      }
    | undefined;
  let attackRoll: AttackRollResult | undefined;
  let savingThrowOutcomes: BattleSavingThrowOutcomeValue | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Spell target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }

    if (fill.kind === "spellTargetAllocation") {
      if (invocation.kind !== "preparedSlotSpell") {
        return {
          tag: "invalid",
          message: "Spell target allocation does not match this spell act.",
        };
      }
      if (fill.holeId !== spellTargetAllocationHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell target allocation must use the selected spell act allocation hole.",
        };
      }
      if (targetAllocation !== undefined) {
        return {
          tag: "invalid",
          message: "Spell target allocation was filled twice.",
        };
      }
      targetAllocation = {
        allocations: fill.value.allocations,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Spell attack roll was filled twice.",
        };
      }
      attackRoll = fill.value;
      continue;
    }

    if (fill.kind === "savingThrowOutcome") {
      if (invocation.kind !== "cantripSaveGateDamage") {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes do not match this spell act.",
        };
      }
      if (fill.holeId !== spellSavingThrowOutcomeHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell saving throw outcomes must use the selected spell act outcome hole.",
        };
      }
      if (savingThrowOutcomes !== undefined) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes were filled twice.",
        };
      }
      savingThrowOutcomes = fill.value;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (invocation.kind === "preparedHealingSpell") {
        if (healingRoll !== undefined) {
          return { tag: "invalid", message: "Spell healing was filled twice." };
        }
        healingRoll = fill;
        continue;
      }
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Spell damage was filled twice." };
      }
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      if (
        concentrationSavingThrows.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      concentrationSavingThrows.push(fill);
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the spell replay holes.`,
    };
  }

  return {
    tag: "ok",
    targetId,
    targetSpatialFacts,
    targetAllocation,
    attackRoll,
    savingThrowOutcomes,
    concentrationSavingThrows,
    damageRoll,
    healingRoll,
  };
}

function concentrationSavingThrowFillFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  hole: BattleConcentrationSavingThrowHole,
):
  | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
  | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function resolvePreparedSlotSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedSlotSpell" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  return resolvePreparedSlotSpellAct({
    ...input,
    opensSpellCastReactionWindow: false,
    spendsCastResources: false,
    opensAfterDamageReactionWindow: false,
  });
}

function resolvePreparedSlotSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedSlotSpell" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly opensSpellCastReactionWindow?: boolean;
  readonly spendsCastResources?: boolean;
  readonly opensAfterDamageReactionWindow?: boolean;
}): BattleResolutionResult {
  const allocationHole = spellTargetAllocationHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Repeated-damage slot spells use spell target allocation fills, not a single-target fill.",
    );
  }
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} does not use an attack roll.`,
    );
  }
  if (input.fillSet.targetAllocation === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      allocationHole,
    ]);
  }
  const allocationValidation = validateSpellTargetAllocation(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetAllocation.allocations,
    input.fillSet.targetAllocation.spatialFacts,
  );
  if (allocationValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      allocationValidation,
    );
  }

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "spellCast",
        casterId: input.actorId,
        spellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation =
    validateSpellDamageFill(
      input.fillSet.damageRoll,
      input.invocation,
      false,
    ) ??
    validatePreparedSlotSpellDamageGroups(
      input.fillSet.damageRoll,
      input.fillSet.targetAllocation.allocations,
    );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = input.fillSet.targetAllocation.allocations.flatMap(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return [];
      }
      const damageAmount = preparedSlotSpellDamageAmountForAllocation(
        target,
        input.invocation,
        input.fillSet.damageRoll!,
        allocationIndex,
        allocation.count,
      );
      const hole = concentrationSavingThrowHole(target, damageAmount);
      return hole === null ? [] : [hole];
    },
  );
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((concentrationSave) => concentrationSave.holeId),
  );
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }

  const damaged = input.fillSet.targetAllocation.allocations.reduce(
    (state, allocation, allocationIndex) => {
      const target = state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return state;
      }
      const damageAmount = preparedSlotSpellDamageAmountForAllocation(
        target,
        input.invocation,
        input.fillSet.damageRoll!,
        allocationIndex,
        allocation.count,
      );
      const concentrationSave = concentrationSavingThrowHole(
        target,
        damageAmount,
      );
      return applyPreparedSlotSpellDamage(
        state,
        allocation.targetId,
        damageAmount,
        concentrationSave === null
          ? undefined
          : concentrationSavingThrowFillFor(
              input.fillSet.concentrationSavingThrows,
              concentrationSave,
            ),
      );
    },
    input.input.state,
  );
  if (input.spendsCastResources === false) {
    return {
      tag: "resolved",
      state: damaged,
      snapshot: snapshotBattle(damaged),
    };
  }

  const spent = spendAction(damaged.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    damaged,
    input.actorId,
    input.invocation.slotLevel,
  );
  const nextState = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
  };
  if (input.opensAfterDamageReactionWindow !== false) {
    const damageRoll = input.fillSet.damageRoll;
    const afterDamageEvents =
      input.fillSet.targetAllocation.allocations.flatMap(
        (allocation, allocationIndex): readonly BattleAfterDamageEvent[] => {
          const target = input.input.state.combatants.get(allocation.targetId);
          if (target === undefined) {
            return [];
          }
          const damageAmount = preparedSlotSpellDamageAmountForAllocation(
            target,
            input.invocation,
            damageRoll,
            allocationIndex,
            allocation.count,
          );
          return [
            {
              damageSourceId: input.actorId,
              damagedId: allocation.targetId,
              damageAmount: toDamageAmount(damageAmount),
            },
          ];
        },
      );
    const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
      state: nextState,
      subject: input.input.subject,
      events: afterDamageEvents,
      suppressedReactionTrigger: input.input.suppressedReactionTrigger,
    });
    if (afterDamageReactionWindow.tag === "needsHoles") {
      return afterDamageReactionWindow;
    }
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSaveGateDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells do not use an attack roll.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;

  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveDamageResultByTargetId = new Map(
    savingThrowOutcomes.outcomes.map((outcome) => [
      outcome.targetId,
      saveGateDamageResultForOutcome(
        input.input.state,
        outcome.targetId,
        input.invocation,
        outcome.succeeded,
      ),
    ]),
  );
  const saveDamageResultForTarget = (targetId: CombatantId): SaveDamageResult =>
    saveDamageResultByTargetId.get(targetId) ?? "none";
  const damageTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    saveDamageResultForTarget(outcome.targetId) === "none"
      ? []
      : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  if (damageTargets.length === 0) {
    if (input.fillSet.damageRoll !== undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate spell damage can only be filled when at least one target takes damage.",
      );
    }
    return spendMagicAction(
      extendSavingThrowOngoingFeatures(
        input.input.state,
        input.actorId,
        selectedTargetIds,
      ),
    );
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageRoll = input.fillSet.damageRoll;
  const damageValidation = validateSpellDamageFill(
    damageRoll,
    input.invocation,
    false,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = damageTargets.flatMap((targetId) => {
    const target = input.input.state.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const hole = concentrationSavingThrowHole(target, damageAmount);
    return hole === null ? [] : [hole];
  });
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((concentrationSave) => concentrationSave.holeId),
  );
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const concentrationSaveByTargetId = new Map(
    concentrationSaves.map((concentrationSave) => [
      concentrationSave.combatantId,
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ),
    ]),
  );
  const damaged = damageTargets.reduce(
    (state, targetId) =>
      applySpellDamage(
        state,
        targetId,
        input.invocation,
        damageRoll,
        false,
        concentrationSaveByTargetId.get(targetId),
        saveDamageResultForTarget(targetId),
      ),
    input.input.state,
  );
  const extended = extendSavingThrowOngoingFeatures(
    damaged,
    input.actorId,
    selectedTargetIds,
  );
  const spent = spendAction(extended.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const nextState = { ...extended, currentTurnResources: spent.right };
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: input.actorId,
      damagedId: damageTargets[0]!,
      damageAmount: toDamageAmount(
        spellDamageAmountForTarget(
          input.input.state.combatants.get(damageTargets[0]!)!,
          input.invocation,
          damageRoll,
          saveDamageResultForTarget(damageTargets[0]!),
        ),
      ),
      continuation: {
        kind: "resolved",
        subject: input.input.subject,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function validateSavingThrowOutcomes(
  value: BattleSavingThrowOutcomeValue,
  _hole: BattleSpellSavingThrowOutcomeHole,
  state: BattleState,
): string | null {
  const outcomes = value.outcomes;
  if (outcomes.length === 0) {
    return "Save-gate spell must include at least one affected target Saving Throw outcome.";
  }
  if (!state.combatants.has(value.area.originAnchorId)) {
    return "Save-gate spell area origin anchor must be a combatant in this battle.";
  }
  const affectedTargets = new Set(value.area.affectedTargetIds);
  if (affectedTargets.size !== value.area.affectedTargetIds.length) {
    return "Save-gate spell area affected targets must not duplicate targets.";
  }
  for (const targetId of affectedTargets) {
    if (!state.combatants.has(targetId)) {
      return "Save-gate spell area affected target must be a combatant in this battle.";
    }
  }
  const seenTargets = new Set<CombatantId>();
  for (const outcome of outcomes) {
    const targetId = outcome.targetId;
    if (!affectedTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must match the table-supplied area affected targets.";
    }
    if (seenTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must not duplicate targets.";
    }
    seenTargets.add(targetId);
  }
  if (seenTargets.size !== affectedTargets.size) {
    return "Save-gate spell Saving Throw outcomes must cover every table-supplied area affected target.";
  }
  return null;
}

function spendMagicAction(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spent = spendAction(state.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }

  const nextState = { ...state, currentTurnResources: spent.right };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyAttackDamage(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
  critical: boolean,
  attackDamageRiders: readonly AttackDamageRider[] = [],
): BattleState {
  if (fillSet.damageRoll == null) {
    return state;
  }

  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damageAmount = attackDamageAmount(
    state.combatants.get(attackerId),
    target,
    attack,
    fillSet.damageRoll,
    critical,
    fillSet.attackRoll,
    attackDamageRiders,
  );
  const damaged = applyHpDamage(target, damageAmount, {
    deathFailuresAtZeroHp: critical ? 2 : 1,
    damageDisposition: fillSet.damageDisposition,
  });
  const combatants = new Map(state.combatants).set(targetId, damaged);

  const nextState = {
    ...state,
    combatants,
  };
  const concentrated =
    fillSet.concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
      ? breakBattleConcentrationAfterDamage({
          state: nextState,
          combatantId: targetId,
          priorConcentration: target.concentration,
        })
      : nextState;
  return normalizeBattleGrapples(
    recordAttackDamageRidersUsed(concentrated, attackDamageRiders),
  );
}

function applyAttackDamageAmount(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  damageAmount: DamageAmount,
  deathFailuresAtZeroHp: 1 | 2,
  damageDisposition: BattleAttackDamageDisposition,
  attackDamageRiders: readonly AttackDamageRider[],
  concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damaged = applyHpDamage(target, Number(damageAmount), {
    deathFailuresAtZeroHp,
    damageDisposition,
  });
  const combatants = new Map(state.combatants).set(targetId, damaged);
  const nextState = {
    ...state,
    combatants,
  };
  const concentrated =
    Number(damageAmount) > 0 &&
    (concentrationSavingThrow?.value.succeeded === false ||
      (target.concentration !== null && damaged.concentration === null))
      ? breakBattleConcentrationAfterDamage({
          state: nextState,
          combatantId: targetId,
          priorConcentration: target.concentration,
        })
      : nextState;
  return normalizeBattleGrapples(
    recordAttackDamageRidersUsed(
      concentrated,
      attackDamageRiders.map((rider) => ({ ...rider, attackerId })),
    ),
  );
}

function recordAttackDamageRidersUsed(
  state: BattleState,
  attackDamageRiders: readonly AttackDamageRider[],
): BattleState {
  if (attackDamageRiders.length === 0) {
    return state;
  }
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      attackDamageRidersUsedThisTurn: [
        ...state.currentTurnResources.attackDamageRidersUsedThisTurn,
        ...attackDamageRiders.map((rider) => ({
          attackerId: rider.attackerId,
          unitId: rider.unitId,
        })),
      ],
    },
  };
}

type BattleDamageContext = {
  readonly deathFailuresAtZeroHp: 1 | 2;
  readonly damageDisposition?: BattleAttackDamageDisposition;
};
type HpDamageProjection = {
  readonly effectiveDamage: number;
  readonly currentTempHp: number;
  readonly tempHpAbsorbed: number;
  readonly currentHp: number;
  readonly hpDamage: number;
  readonly nextHp: Hp;
  readonly massiveDamageKills: boolean;
};

function applyHpDamage(
  combatant: BattleCreatureState,
  damageAmount: number,
  context: BattleDamageContext,
): BattleCreatureState {
  const projection = hpDamageProjection(combatant, damageAmount);
  if (projection.effectiveDamage <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const damaged = battleCreatureStateWithDamageProjection(combatant, projection);

  if (projection.currentHp <= 0) {
    return projection.massiveDamageKills
      ? applyInstantDeath(damaged)
      : applyDamageAtZeroHp(damaged, context);
  }

  if (Number(projection.nextHp) > 0) {
    return damaged;
  }

  if (context.damageDisposition?.kind === "knockOut") {
    return applyKnockOut(damaged);
  }

  return projection.massiveDamageKills
    ? applyInstantDeath(damaged)
    : applyDropToZeroHpLifecycle(damaged);
}

function hpDamageProjection(
  combatant: BattleCreatureState,
  damageAmount: number,
): HpDamageProjection {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  const currentTempHp = Number(combatant.tempHp);
  const currentHp = Number(combatant.hp);
  const tempHpAbsorbed = Math.min(currentTempHp, effectiveDamage);
  const hpDamage = effectiveDamage - tempHpAbsorbed;
  const nextHp = Hp(Math.max(0, currentHp - hpDamage));
  return {
    effectiveDamage,
    currentTempHp,
    tempHpAbsorbed,
    currentHp,
    hpDamage,
    nextHp,
    massiveDamageKills:
      hpDamage > 0 &&
      (currentHp <= 0 ? hpDamage : hpDamage - currentHp) >=
        Number(combatant.maxHp),
  };
}

function damageAllowsKnockOut(
  combatant: BattleCreatureState,
  damageAmount: number,
): boolean {
  const projection = hpDamageProjection(combatant, damageAmount);
  return (
    projection.currentHp > 0 &&
    Number(projection.nextHp) === 0
  );
}

function battleCreatureStateWithKnockedOutUnconsciousFields(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return {
    ...combatant,
    hp: knockedOutOneHp(),
    conditions: knockedOutConditionState(combatant.conditions),
    positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
  };
}

function applyKnockOut(combatant: BattleCreatureState): BattleCreatureState {
  return battleCreatureStateWithKnockedOutUnconsciousFields(
    withoutConcentration(combatant),
  );
}

function applyHpHealing(
  combatant: BattleCreatureState,
  healingAmount: number,
): BattleCreatureState {
  const effectiveHealing = Math.max(0, Math.floor(healingAmount));
  if (effectiveHealing <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const currentHp = Number(combatant.hp);
  const nextHp = Hp(
    Math.min(Number(combatant.maxHp), currentHp + effectiveHealing),
  );
  const regainedHitPoints = Number(nextHp) > currentHp;
  if (currentHp <= 0 && Number(nextHp) > 0) {
    return {
      ...battleCreatureStateWithoutKnockOut(
        combatant,
        nextHp,
        removeCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle:
        combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows"
          ? {
              ...combatant.zeroHpLifecycle,
              deathSaves: resetDeathSaveRuntimeState(),
            }
          : combatant.zeroHpLifecycle,
    };
  }
  if (regainedHitPoints && combatant.positiveHpUnconscious !== null) {
    return battleCreatureStateWithoutKnockOut(
      combatant,
      nextHp,
      removeCondition(combatant.conditions, "unconscious"),
    );
  }

  return regainedHitPoints
    ? battleCreatureStateWithoutKnockOut(combatant, nextHp, combatant.conditions)
    : combatant;
}

function applyInitialZeroHpLifecycle(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (Number(combatant.hp) > 0) {
    return combatant;
  }

  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () =>
      withoutConcentration(combatant),
    ),
    Match.when({ policy: "usesDeathSavingThrows" }, () => ({
      ...battleCreatureStateWithKnockOutPreservedConditions(
        combatant,
        applyCondition(combatant.conditions, "unconscious"),
      ),
    })),
    Match.exhaustive,
  );
}

function applyDropToZeroHpLifecycle(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: resetDeathSaveRuntimeState(),
      },
    })),
    Match.exhaustive,
  );
}

function applyDamageAtZeroHp(
  combatant: BattleCreatureState,
  context: BattleDamageContext,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(
          lifecycle.deathSaves,
          context.deathFailuresAtZeroHp,
        ),
      },
    })),
    Match.exhaustive,
  );
}

function startTurnDeathSavingThrowRequired(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState & {
  readonly zeroHpLifecycle: Extract<
    ZeroHpLifecycle,
    { readonly policy: "usesDeathSavingThrows" }
  >;
} {
  return (
    combatant !== undefined &&
    Number(combatant.hp) === 0 &&
    combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows" &&
    !combatant.zeroHpLifecycle.deathSaves.stable &&
    !combatant.zeroHpLifecycle.deathSaves.dead
  );
}

function applyStartTurnDeathSavingThrow(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  roll: DieRollResult,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (!startTurnDeathSavingThrowRequired(combatant)) {
    return combatants;
  }

  const deathSaves = resolveDeathSavingThrow(
    combatant.zeroHpLifecycle.deathSaves,
    Number(roll),
  );
  const nextCombatant = {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      deathSaves.hpRegained ? Hp(1) : combatant.hp,
      deathSaves.hpRegained
        ? removeCondition(combatant.conditions, "unconscious")
        : combatant.conditions,
    ),
    zeroHpLifecycle: {
      ...combatant.zeroHpLifecycle,
      deathSaves,
    },
  };

  return new Map(combatants).set(actorId, nextCombatant);
}

function deathSavingThrowHole(
  actorId: CombatantId,
): BattleDeathSavingThrowHole {
  return {
    kind: "deathSavingThrow",
    holeInstanceKey: DEATH_SAVING_THROW_HOLE_INSTANCE,
    holeId: DEATH_SAVING_THROW_HOLE_ID,
    label: "Death Saving Throw",
    combatantId: actorId,
  };
}

function statBlockRechargeRollHole(
  combatant: BattleCreatureState | undefined,
): BattleStatBlockRechargeRollHole | null {
  if (combatant?.origin.kind !== "statBlock") return null;
  const rechargeTargets = unavailableRechargeTargets(
    combatant.origin.statBlock.statBlock,
    combatant.origin.resources,
  );
  if (rechargeTargets.length === 0) return null;
  return {
    kind: "statBlockRechargeRoll",
    holeInstanceKey: STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
    holeId: STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
    label: "Stat Block Recharge roll",
    combatantId: combatant.combatantId,
    rechargeTargets,
  };
}

function unavailableRechargeTargets(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
): readonly StatBlockPartKey[] {
  return resources.unavailableRechargeParts.filter(
    (key) => statBlockLimitedUseForPart(statBlock, key)?.kind === "recharge",
  );
}

function processStatBlockRechargeRolls(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  rolls: readonly BattleStatBlockRechargeRollResult[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (combatant?.origin.kind !== "statBlock") return combatants;
  const statBlock = combatant.origin.statBlock.statBlock;
  const nextResources = {
    ...combatant.origin.resources,
    unavailableRechargeParts:
      combatant.origin.resources.unavailableRechargeParts.filter((key) => {
        const limitedUse = statBlockLimitedUseForPart(statBlock, key);
        const result = rolls.find((roll) =>
          sameStatBlockPartKey(roll.target, key),
        );
        return (
          limitedUse?.kind !== "recharge" ||
          result === undefined ||
          result.roll < limitedUse.minimumRoll
        );
      }),
  };
  return new Map(combatants).set(actorId, {
    ...combatant,
    origin: {
      ...combatant.origin,
      resources: nextResources,
    },
  });
}

function concentrationSavingThrowHole(
  combatant: BattleCreatureState,
  damageAmount: number,
): BattleConcentrationSavingThrowHole | null {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  if (combatant.concentration === null || effectiveDamage <= 0) {
    return null;
  }
  const holeKey = `${CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX}:${combatant.combatantId}`;
  return {
    kind: "concentrationSavingThrow",
    holeInstanceKey: holeInstanceKey(holeKey),
    holeId: holeId(holeKey),
    label: "Concentration Constitution Saving Throw",
    combatantId: combatant.combatantId,
    dc: concentrationSavingThrowDc(effectiveDamage),
    damageAmount: toDamageAmount(effectiveDamage),
  };
}

function applyInstantDeath(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(lifecycle.deathSaves, 3),
      },
    })),
    Match.exhaustive,
  );
}

function withoutConcentration(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.concentration === null) {
    return combatant;
  }
  return {
    ...combatant,
    concentration: null,
    activeEffects: combatant.activeEffects.filter(
      (effect) =>
        effect.kind !== "spellBaseArmorClass" ||
        !effect.earlyEnds.some(
          (earlyEnd) => earlyEnd.kind === "concentrationBroken",
        ),
    ),
  };
}

function breakCombatantConcentration(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  combatantId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  if (!combatants.has(combatantId)) {
    return combatants;
  }
  return new Map(
    [...combatants].map(([id, combatant]) => [
      id,
      {
        ...combatant,
        concentration: id === combatantId ? null : combatant.concentration,
        activeEffects: combatant.activeEffects.filter(
          (effect) => !concentrationBrokenEffectFrom(effect, combatantId),
        ),
      },
    ]),
  );
}

function concentrationBrokenEffectFrom(
  effect: BattleActiveEffect,
  combatantId: CombatantId,
): boolean {
  return (
    effect.sourceCombatantId === combatantId &&
    effect.kind === "spellBaseArmorClass" &&
    effect.earlyEnds.some((earlyEnd) => earlyEnd.kind === "concentrationBroken")
  );
}

function zeroHpLifecycleIsTerminal(combatant: BattleCreatureState): boolean {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant.hp === 0),
    Match.when(
      { policy: "usesDeathSavingThrows" },
      (lifecycle) => lifecycle.deathSaves.dead,
    ),
    Match.exhaustive,
  );
}

type DamageAmountByTypeEntry = {
  readonly damageType: DamageType;
  readonly amount: number;
};

function attackDamageAmount(
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
  damageRoll: BattleRolledDiceFill,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
): number {
  return damageAmountByTypeAfterTargetAdjustments(
    target,
    attackDamageByType(
      attacker,
      attack,
      damageRoll,
      critical,
      attackRoll,
      attackDamageRiders,
    ),
  );
}

function attackDamageByTypeEntries(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  damageRoll: BattleRolledDiceFill,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
): readonly DamageAmountByTypeEntry[] {
  return [
    ...attackDamageByType(
      attacker,
      attack,
      damageRoll,
      critical,
      attackRoll,
      attackDamageRiders,
    ),
  ].map(([damageType, amount]) => ({ damageType, amount }));
}

function attackDamageByType(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  damageRoll: BattleRolledDiceFill,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
): ReadonlyMap<DamageType, number> {
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
  );
  const damageByType = damageRoll.value.reduce<ReadonlyMap<DamageType, number>>(
    (totals, group, index) => {
      const component = components[index];
      if (component === undefined) {
        return totals;
      }
      const diceTotal = group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      );
      const unadjusted =
        diceTotal +
        (index === 0
          ? attackDamageModifier(attack) +
            ongoingFeatureDamageModifier(attacker, attack)
          : 0);
      return addDamageAmountForType(totals, component.damageType, unadjusted);
    },
    new Map(),
  );
  return damageByType;
}

function damageAmountByTypeEntriesToMap(
  entries: readonly DamageAmountByTypeEntry[],
): ReadonlyMap<DamageType, number> {
  return entries.reduce<ReadonlyMap<DamageType, number>>(
    (totals, entry) =>
      addDamageAmountForType(totals, entry.damageType, entry.amount),
    new Map(),
  );
}

function entriesAfterProportionalDamageReduction(
  entries: readonly DamageAmountByTypeEntry[],
  reduction: number,
): readonly DamageAmountByTypeEntry[] {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalReduction = Math.min(total, Math.max(0, reduction));
  if (total === 0 || totalReduction === 0) {
    return entries;
  }
  const allocations = entries.map((entry, index) => {
    const exact = (entry.amount * totalReduction) / total;
    const base = Math.floor(exact);
    return { index, base, remainder: exact - base };
  });
  const baseTotal = allocations.reduce(
    (sum, allocation) => sum + allocation.base,
    0,
  );
  const bonusIndexes = new Set(
    [...allocations]
      .sort(
        (left, right) =>
          right.remainder - left.remainder || left.index - right.index,
      )
      .slice(0, totalReduction - baseTotal)
      .map((allocation) => allocation.index),
  );
  return entries.map((entry, index) => ({
    ...entry,
    amount:
      entry.amount -
      (allocations[index]!.base + (bonusIndexes.has(index) ? 1 : 0)),
  }));
}

function ongoingFeatureDamageModifier(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): number {
  if (attacker === undefined || attack.kind !== "weapon") {
    return 0;
  }
  return [...activeOngoingFeatureOccurrencesForCombatant(attacker)].reduce(
    (total, [key]) => {
      const profile = ongoingFeatureProfileForSourceKey(attacker, key);
      if (profile === null) return total;
      return (
        total +
        profile.damageModifiers.reduce(
          (ongoingFeatureTotal, modifier) =>
            ongoingFeatureTotal +
            (ongoingFeatureDamageModifierApplies(modifier, attack)
              ? modifier.amount
              : 0),
          0,
        )
      );
    },
    0,
  );
}

function ongoingFeatureDamageModifierApplies(
  modifier: OngoingFeatureDamageModifier,
  attack: CharacterWeaponAttackActionOption,
): boolean {
  return (
    attackAbilityMatchesModifier(attack, modifier) &&
    (modifier.weaponUsageFilter === undefined ||
      modifier.weaponUsageFilter === attack.weapon.usage)
  );
}

function addDamageAmountForType(
  totals: ReadonlyMap<DamageType, number>,
  damageType: DamageType,
  amount: number,
): ReadonlyMap<DamageType, number> {
  return new Map(totals).set(
    damageType,
    (totals.get(damageType) ?? 0) + amount,
  );
}

function damageAmountByTypeAfterTargetAdjustments(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): number {
  return [...damageByType].reduce(
    (total, [damageType, amount]) =>
      total + damageAmountAfterTargetAdjustments(target, amount, damageType),
    0,
  );
}

function damageAmountAfterTargetAdjustments(
  target: BattleCreatureState,
  amount: number,
  damageType: DamageType,
): number {
  if (target.origin.kind !== "statBlock") {
    return [...activeOngoingFeatureOccurrencesForCombatant(target)].some(
      ([key]) =>
        ongoingFeatureProfileForSourceKey(target, key)?.resistances.includes(
          damageType,
        ) === true,
    )
      ? Math.floor(amount / 2)
      : amount;
  }

  const statBlock = target.origin.statBlock.statBlock;
  if (statBlock.immunities?.damageTypes?.includes(damageType) === true) {
    return 0;
  }

  const afterResiongoingFeature =
    statBlock.resistances?.kind === "fixed" &&
    statBlock.resistances.damageTypes.includes(damageType)
      ? Math.floor(amount / 2)
      : amount;

  return statBlock.vulnerabilities?.damageTypes.includes(damageType) === true
    ? afterResiongoingFeature * 2
    : afterResiongoingFeature;
}

function supportedSpellActs(
  actor: BattleCreatureState,
): readonly SupportedSpellAct[] {
  if (actor.origin.kind !== "character") {
    return [];
  }
  const spellcasting = actor.origin.spellcasting;
  if (spellcasting === undefined || !spellcasting.canCastSpells) {
    return [];
  }

  return [
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedSlotSpellProfile(spell, spellcasting.spellSlots),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedPersistentSpellProfile(actor.combatantId, spell),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedHealingSpellProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
      ),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripSpellAttackProfile(
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripSaveGateDamageProfile(spell),
    ),
  ];
}

function supportedPreparedHealingSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
): readonly SupportedSpellAct[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "heal_hp"
  ) {
    return [];
  }
  const rangeFeet = movementFeet(spell.mechanics.range.feet);
  return spellSlots.flatMap((slot): readonly SupportedSpellAct[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const healingExpr = supportedHealingAmountExpr(
      effect.amount,
      spell.mechanics.level,
      slot.spellLevel,
      spellcastingAbilityModifier,
    );
    return healingExpr === null
      ? []
      : [
          {
            kind: "preparedHealingSpell",
            spell,
            slotLevel: slot.spellLevel,
            healing: { expr: healingExpr },
            rangeFeet,
          },
        ];
  });
}

function supportedPreparedSlotSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellAct[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.effects?.length !== 1
  ) {
    return [];
  }
  const effect = phase.effects?.[0];
  if (effect?.kind !== "damage" || typeof effect.damageType !== "string") {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr(effect.amount);
  if (damageExpr == null || typeof effect.damageType !== "string") {
    return [];
  }
  const damageType = effect.damageType;
  const rangeFeet = movementFeet(spell.mechanics.range.feet);
  const repeatedEffectCountForSlotLevel = supportedRepeatedEffectCount(
    phase.attachment.value.selection,
    spell.mechanics.level,
  );
  if (repeatedEffectCountForSlotLevel === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellAct[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        kind: "preparedSlotSpell",
        spell,
        targeting: {
          kind: "repeatedEffectTargetAllocation",
          repeatedEffectCount: repeatedEffectCountForSlotLevel(slot.spellLevel),
        },
        slotLevel: slot.spellLevel,
        damage: {
          expr: damageExpr,
          damageType,
        },
        rangeFeet,
      },
    ];
  });
}

function supportedPreparedPersistentSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellAct[] {
  if (spell.mechanics.family !== "ongoing_effect") {
    return [];
  }
  if (spell.mechanics.duration.kind !== "timed") {
    return [];
  }
  const operation = spell.mechanics.operations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  const mageArmorDurationTicks = elapsedTimeTicksFromHours(8);
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    Either.isLeft(durationTicks) ||
    Either.isLeft(mageArmorDurationTicks) ||
    Number(durationTicks.right) !== Number(mageArmorDurationTicks.right) ||
    spell.mechanics.operations.length !== 1 ||
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "modify_ac_set_base" ||
    operation.effect.formula.kind !== "base_plus_dex"
  ) {
    return [];
  }

  return [
    {
      kind: "preparedPersistentSpell",
      spell,
      slotLevel: spellSlotLevel(1),
      rangeFeet: movementFeet(5),
      activeEffect: {
        kind: "spellBaseArmorClass",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        base: operation.effect.formula.base,
        ability: "dex",
        durationTicks: durationTicks.right,
        earlyEnds: [{ kind: "targetDonsArmor" }],
      },
    },
  ];
}

function supportedCantripSpellAttackProfile(
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellAct[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== "ranged_spell_attack" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.onHit.length !== 2 ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const [damageEffect, speedEffect] = phase.onHit;
  if (
    damageEffect?.kind !== "damage" ||
    typeof damageEffect.damageType !== "string" ||
    speedEffect?.kind !== "modify_speed" ||
    speedEffect.unit !== "feet" ||
    speedEffect.delta >= 0
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr(damageEffect.amount);
  if (damageExpr == null || typeof damageEffect.damageType !== "string") {
    return [];
  }

  return [
    {
      kind: "cantripSpellAttack",
      spell,
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: movementFeet(spell.mechanics.range.feet),
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
      speedReduction: {
        deltaFeet: movementDeltaFeet(speedEffect.delta),
      },
    },
  ];
}

function supportedCantripSaveGateDamageProfile(
  spell: SpellRecord,
): readonly SupportedSpellAct[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "sphere" ||
    phase.attachment.value.shape.radiusFeet !==
      SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET ||
    (phase.onSuccess.kind !== "none" &&
      phase.onSuccess.kind !== "half_damage") ||
    phase.onFail.kind !== "damage" ||
    typeof phase.onFail.damageType !== "string"
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr(phase.onFail.amount);
  if (damageExpr == null) {
    return [];
  }

  return [
    {
      kind: "cantripSaveGateDamage",
      spell,
      ability: phase.ability,
      dc: phase.dc,
      area: {
        kind: "pointOriginSphere",
        radiusFeet: movementFeet(phase.attachment.value.shape.radiusFeet),
      },
      damage: {
        expr: damageExpr,
        damageType: phase.onFail.damageType,
      },
      successDamage: phase.onSuccess.kind === "half_damage" ? "half" : "none",
      rangeFeet: movementFeet(spell.mechanics.range.feet),
    },
  ];
}

function supportedRepeatedEffectCount(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") {
    return () => count;
  }
  if (count.kind !== "linear") {
    return null;
  }
  const { base, perSlotAboveBase } = count;
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    base + Math.max(0, Number(slotLevel) - baseLevel) * perSlotAboveBase;
}

function supportedDamageAmountExpr(amount: SurfaceDiceAmount): DiceExpr | null {
  if (amount.kind === "fixed") {
    return amount.expr;
  }
  if (amount.kind === "threshold_tiers") {
    return amount.base;
  }
  return null;
}

function supportedHealingAmountExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.spellcastingMod !== true ||
    amount.base.dieSize === undefined
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat: Number(spellcastingAbilityModifier),
  };
}

function spellHasAvailableSpend(
  actor: BattleCreatureState,
  invocation: SupportedSpellAct,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  if (
    invocation.kind === "cantripSpellAttack" ||
    invocation.kind === "cantripSaveGateDamage"
  ) {
    return true;
  }
  return (
    actor.origin.spellcasting?.spellSlots.some(
      (slot) =>
        slot.spellLevel === invocation.slotLevel && slot.expended < slot.count,
    ) === true
  );
}

function spellActTurnResourceAvailable(
  resources: BattleTurnResources,
  invocation: SupportedSpellAct,
): boolean {
  if (
    invocation.kind === "cantripSpellAttack" ||
    invocation.kind === "cantripSaveGateDamage"
  ) {
    return canSpendAction(resources, "magic");
  }
  if (resources.spellSlotExpendedThisTurn) {
    return false;
  }
  return invocation.kind === "preparedHealingSpell"
    ? resources.currentHasBonusAction
    : canSpendAction(resources, "magic");
}

function markSpellSlotExpendedThisTurn(
  resources: BattleTurnResources,
): Either.Either<BattleTurnResources, "spell slot already expended this turn"> {
  return resources.spellSlotExpendedThisTurn
    ? Either.left("spell slot already expended this turn" as const)
    : Either.right({ ...resources, spellSlotExpendedThisTurn: true });
}

function spellTargetHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellAct,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: `${invocation.spell.name} target`,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

function spellTargetAllocationHoleId(
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedSlotSpell" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:target-allocation:${invocation.spell.id}`);
}

function spellTargetAllocationHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedSlotSpell" }
  >,
): BattleSpellTargetAllocationHole {
  const holeKey = `battle:spell:target-allocation:${invocation.spell.id}`;
  return {
    kind: "spellTargetAllocation",
    holeId: spellTargetAllocationHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} target allocation`,
    spell: invocation,
    allocationCount: invocation.targeting.repeatedEffectCount,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

function spellTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellAct,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  if (
    !spellTargetHasNonSpatialPrerequisites(state, actorId, targetId, invocation)
  ) {
    return false;
  }
  return facts.some(
    (fact) =>
      fact.kind === "spellTarget" &&
      fact.casterId === actorId &&
      fact.targetId === targetId &&
      fact.spellId === invocation.spell.id,
  );
}

function spellTargetHasNonSpatialPrerequisites(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellAct,
): boolean {
  const target = state.combatants.get(targetId);
  if (
    invocation.kind === "preparedPersistentSpell" &&
    (!persistentSpellTargetIsKnownWilling(actorId, targetId) ||
      target?.armorClass.base.kind === "armor")
  ) {
    return false;
  }
  return target !== undefined;
}

function validateSpellTargetAllocation(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedSlotSpell" }
  >,
  allocations: readonly BattleSpellTargetAllocation[],
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  if (allocations.length === 0) {
    return "Spell target allocation must include at least one target.";
  }
  const seen = new Set<CombatantId>();
  for (const allocation of allocations) {
    if (!Number.isInteger(allocation.count) || allocation.count <= 0) {
      return "Spell target allocation entries must assign a positive integer count.";
    }
    if (seen.has(allocation.targetId)) {
      return "Spell target allocation must combine repeated effects for the same target into one entry.";
    }
    seen.add(allocation.targetId);
    if (
      !spellTargetIsLegal(
        state,
        actorId,
        allocation.targetId,
        invocation,
        facts,
      )
    ) {
      return "Spell target allocation entries must be combatants within the selected spell's supported range.";
    }
  }
  const allocatedCount = allocations.reduce(
    (total, allocation) => total + allocation.count,
    0,
  );
  if (allocatedCount !== invocation.targeting.repeatedEffectCount) {
    return `${invocation.spell.name} target allocation must assign exactly ${invocation.targeting.repeatedEffectCount} repeated effects.`;
  }
  return null;
}

function persistentSpellTargetIsKnownWilling(
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return actorId === targetId;
}

function supportedSpellActId(invocation: SupportedSpellAct): string {
  return Match.value(invocation).pipe(
    Match.when(
      { kind: "preparedSlotSpell" },
      (slotSpell) =>
        `${slotSpell.kind}:${slotSpell.spell.id}:slot:${slotSpell.slotLevel}`,
    ),
    Match.when(
      { kind: "cantripSpellAttack" },
      (cantrip) => `${cantrip.kind}:${cantrip.spell.id}`,
    ),
    Match.when(
      { kind: "cantripSaveGateDamage" },
      (cantrip) => `${cantrip.kind}:${cantrip.spell.id}`,
    ),
    Match.when(
      { kind: "preparedPersistentSpell" },
      (persistent) =>
        `${persistent.kind}:${persistent.spell.id}:slot:${persistent.slotLevel}`,
    ),
    Match.when(
      { kind: "preparedHealingSpell" },
      (healing) =>
        `${healing.kind}:${healing.spell.id}:slot:${healing.slotLevel}`,
    ),
    Match.exhaustive,
  );
}

function spellAttackRollHole(
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSpellAttack" }
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${invocation.spell.name} spell attack roll`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

function spellDamageHole(
  invocation: SupportedDamageSpellAct,
  critical = false,
): BattleSpellDamageRollHole {
  const expr = spellDamageExpression(invocation, critical);
  return {
    kind: "rolledDice",
    holeId: holeId(`battle:spell:damage-result:${invocation.spell.id}:${expr}`),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:damage-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} damage (${expr})`,
    spell: invocation,
    critical,
  };
}

function spellHealingRollHole(
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedHealingSpell" }
  >,
): BattleSpellHealingRollHole {
  const expr = spellHealingExpression(invocation);
  return {
    kind: "rolledDice",
    holeId: holeId(
      `battle:spell:healing-result:${invocation.spell.id}:${expr}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:healing-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} healing (${expr})`,
    spell: invocation,
  };
}

function spellSavingThrowOutcomeHoleId(
  invocation: SupportedSpellAct,
): BattleHoleId {
  return holeId(`battle:spell:saving-throw-outcome:${invocation.spell.id}`);
}

function spellSavingThrowOutcomeHole(
  state: BattleState,
  _actorId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >,
): BattleSpellSavingThrowOutcomeHole {
  const holeKey = `battle:spell:saving-throw-outcome:${invocation.spell.id}`;
  return {
    kind: "savingThrowOutcome",
    holeId: spellSavingThrowOutcomeHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} point-origin Sphere Saving Throw outcomes`,
    spell: invocation,
    ability: invocation.ability,
    dc: invocation.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(state, invocation.ability),
  };
}

function savingThrowRollModeProjections(
  state: BattleState,
  ability: Ability,
): readonly BattleSavingThrowRollModeProjection[] {
  if (ability !== "dex") {
    return [];
  }
  return [...state.combatants]
    .filter(([, target]) => hasDodgeBenefit(state, target))
    .map(([targetId]) => ({
      targetId,
      rollMode: "advantage" as const,
    }));
}

function validateSpellDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: SupportedDamageSpellAct,
  critical: boolean,
): string | null {
  if (fill.holeId !== spellDamageHole(invocation, critical).holeId) {
    return critical
      ? "Critical hit spell damage must use the critical spell damage hole."
      : "Spell damage must use the selected action-time spell act damage hole.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice:
      invocation.kind === "preparedSlotSpell"
        ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
        : invocation.damage.expr.dice *
          (invocation.kind === "cantripSpellAttack" && critical ? 2 : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

function validateSpellHealingFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedHealingSpell" }
  >,
): string | null {
  if (fill.holeId !== spellHealingRollHole(invocation).holeId) {
    return "Spell healing must use the selected Bonus Action spell act healing hole.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: invocation.healing.expr.dice,
    dieSize: invocation.healing.expr.dieSize,
  });
  return validation?.reason ?? null;
}

function validatePreparedSlotSpellDamageGroups(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocations: readonly BattleSpellTargetAllocation[],
): string | null {
  if (fill.value.length !== allocations.length) {
    return "Repeated spell damage dice groups must match the target allocation entries.";
  }
  const mismatched = allocations.find(
    (allocation, index) =>
      fill.value[index]?.results.length !== allocation.count,
  );
  return mismatched === undefined
    ? null
    : "Each repeated spell damage dice group must match that target's allocated effect count.";
}

function applySpellDamage(
  state: BattleState,
  targetId: CombatantId,
  invocation: SupportedDamageSpellAct,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
  concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >,
  saveDamageResult: SaveDamageResult = "full",
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damaged = applyHpDamage(
    target,
    spellDamageAmountForTarget(
      target,
      invocation,
      damageRoll,
      saveDamageResult,
    ),
    { deathFailuresAtZeroHp: critical ? 2 : 1 },
  );
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, damaged),
  };
  return concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
    ? breakBattleConcentrationAfterDamage({
        state: nextState,
        combatantId: targetId,
        priorConcentration: target.concentration,
      })
    : nextState;
}

function applyPreparedSlotSpellDamage(
  state: BattleState,
  targetId: CombatantId,
  damageAmount: number,
  concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damaged = applyHpDamage(target, damageAmount, {
    deathFailuresAtZeroHp: 1,
  });
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, damaged),
  };
  return concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
    ? breakBattleConcentrationAfterDamage({
        state: nextState,
        combatantId: targetId,
        priorConcentration: target.concentration,
      })
    : nextState;
}

function spellDamageAmountForTarget(
  target: BattleCreatureState,
  invocation: SupportedDamageSpellAct,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  saveDamageResult: SaveDamageResult = "full",
): number {
  const diceTotal = damageRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  const flat =
    (invocation.damage.expr.flat ?? 0) *
    (invocation.kind === "preparedSlotSpell"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  const saveAdjustedDamage = applySaveDamageResult(
    diceTotal + flat,
    saveDamageResult,
  );
  return damageAmountAfterTargetAdjustments(
    target,
    saveAdjustedDamage,
    invocation.damage.damageType,
  );
}

function preparedSlotSpellDamageAmountForAllocation(
  target: BattleCreatureState,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedSlotSpell" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocationIndex: number,
  repeatedEffectCount: number,
): number {
  const group = damageRoll.value[allocationIndex];
  const diceTotal =
    group?.results.reduce(
      (groupTotal, dieResult) => groupTotal + Number(dieResult),
      0,
    ) ?? 0;
  const flat = (invocation.damage.expr.flat ?? 0) * repeatedEffectCount;
  return damageAmountAfterTargetAdjustments(
    target,
    diceTotal + flat,
    invocation.damage.damageType,
  );
}

function saveGateDamageResultForOutcome(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >,
  savingThrowSucceeded: boolean,
): SaveDamageResult {
  const target = state.combatants.get(targetId);
  const baseResult: SaveDamageResult = savingThrowSucceeded
    ? invocation.successDamage
    : "full";
  const replacement = saveDamageReplacementForInvocation(target, invocation);
  if (replacement === null) {
    return baseResult;
  }
  return savingThrowSucceeded ? replacement.onSuccess : replacement.onFail;
}

function saveDamageReplacementForInvocation(
  target: BattleCreatureState | undefined,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "saveDamageReplacement" }
> | null {
  if (
    target?.origin.kind !== "character" ||
    invocation.successDamage !== "half" ||
    isIncapacitated(target.conditions)
  ) {
    return null;
  }
  return (
    [...target.origin.saveDamageReplacementProfiles.values()].find(
      (profile) =>
        profile.ability === invocation.ability &&
        profile.requiredSuccessDamage === "half" &&
        profile.suppressedByCondition === "incapacitated",
    ) ?? null
  );
}

function applySaveDamageResult(
  amount: number,
  saveDamageResult: SaveDamageResult,
): number {
  return Match.value(saveDamageResult).pipe(
    Match.when("none", () => 0),
    Match.when("half", () => Math.floor(amount / 2)),
    Match.when("full", () => amount),
    Match.exhaustive,
  );
}

function applySpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellAct,
): BattleState {
  if (invocation.kind !== "cantripSpellAttack") {
    return state;
  }
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "speedDelta" &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        {
          kind: "speedDelta",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          deltaFeet: invocation.speedReduction.deltaFeet,
          expiresAt: {
            kind: "startOfTurn",
            combatantId: actorId,
          },
        },
      ],
    }),
  };
}

function applyPersistentSpellActiveEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedPersistentSpell" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || target.armorClass.base.kind === "armor") {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === invocation.activeEffect.kind &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        { ...invocation.activeEffect, sourceCombatantId: actorId },
      ],
    }),
  };
}

function expendSpellSlot(
  state: BattleState,
  actorId: CombatantId,
  spellLevel: SpellSlotLevel,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "character" ||
    actor.origin.spellcasting === undefined
  ) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        spellcasting: {
          ...actor.origin.spellcasting,
          spellSlots: actor.origin.spellcasting.spellSlots.map((slot) =>
            slot.spellLevel === spellLevel && slot.expended < slot.count
              ? { ...slot, expended: resourceCount(Number(slot.expended) + 1) }
              : slot,
          ),
        },
      },
    }),
  };
}

function spellDamageExpression(
  invocation: SupportedDamageSpellAct,
  critical = false,
): string {
  const dice =
    invocation.kind === "preparedSlotSpell"
      ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
      : invocation.damage.expr.dice *
        (invocation.kind === "cantripSpellAttack" && critical ? 2 : 1);
  const flat =
    (invocation.damage.expr.flat ?? 0) *
    (invocation.kind === "preparedSlotSpell"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  return `${dice}d${invocation.damage.expr.dieSize}${signedModifier(flat)}-${invocation.damage.damageType}`;
}

function spellHealingExpression(
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedHealingSpell" }
  >,
): string {
  return `${invocation.healing.expr.dice}d${invocation.healing.expr.dieSize}${signedModifier(invocation.healing.expr.flat ?? 0)}`;
}

function spellHealingAmount(
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedHealingSpell" }
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
  return diceTotal + (invocation.healing.expr.flat ?? 0);
}

function needsHolesResult(
  state: BattleState,
  subject: BattleSubject,
  holes: readonly BattleHole[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  return {
    tag: "needsHoles",
    state,
    subject,
    holes,
    snapshot: snapshotBattle(state),
  };
}

function attackTargetHole(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: "Attack target",
    requiresTableSpatialFact: true,
    choices: attackTargetChoices(state, actorId, attack),
  };
}

function searchTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: SEARCH_TARGET_HOLE_ID,
    holeInstanceKey: SEARCH_TARGET_HOLE_INSTANCE,
    label: "Hidden creature to Search for",
    choices: hiddenSearchTargetChoices(state, actorId),
  };
}

function grappleTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: GRAPPLE_TARGET_HOLE_ID,
    holeInstanceKey: GRAPPLE_TARGET_HOLE_INSTANCE,
    label: "Grapple target",
    requiresTableSpatialFact: true,
    choices: grappleTargetChoices(state, actorId),
  };
}

function grappleOutcomeHole(link: BattleGrappleLink): BattleGrappleOutcomeHole {
  return {
    kind: "grappleOutcome",
    holeId: GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Grapple saving throw",
    actorId: link.grapplerId,
    targetId: link.targetId,
    dc: link.escapeDc,
    mode: "grappleSave",
  };
}

function escapeGrappleOutcomeHole(
  link: BattleGrappleLink,
  actorId: CombatantId,
): BattleGrappleOutcomeHole {
  return {
    kind: "grappleOutcome",
    holeId: ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Escape Grapple ability check",
    actorId,
    targetId: link.grapplerId,
    dc: link.escapeDc,
    mode: "escapeCheck",
  };
}

function attackTargetChoices(
  state: BattleState,
  actorId: CombatantId,
  _attack: SupportedAttackActionOption,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter(
    (id) => id !== actorId && state.combatants.has(id),
  );
}

function hiddenSearchTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants.values()]
    .filter(
      (combatant) =>
        combatant.combatantId !== actorId && combatant.hidden !== null,
    )
    .map((combatant) => combatant.combatantId);
}

function revealHidden(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined || combatant.hidden === null) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      hidden: null,
    }),
  };
}

function bonusActionStandardActionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !state.currentTurnResources.currentHasBonusAction
  ) {
    return [];
  }

  return alternateActionCostProfilesForActor(actor).flatMap((entry) =>
    entry.profile.from.actions.flatMap((action) => {
      if (!alternateActionCostActionAvailable(state, actorId, action)) {
        return [];
      }
      return [
        {
          subject: {
            tag: "bonusActionStandardAction" as const,
            actorId,
            sourceUnitId: entry.unitId,
            action,
          },
          label: alternateActionCostActionLabel(action),
          summary: `${alternateActionCostActionLabel(action)} as a Bonus Action.`,
          initialHoles: action === "hide" ? [hideAbilityCheckHole()] : [],
        },
      ];
    }),
  );
}

function alternateActionCostProfilesForActor(
  combatant: BattleCreatureState | undefined,
): readonly {
  readonly unitId: UnitRecord["id"];
  readonly profile: Extract<
    BattleUnitSupportProfile,
    { readonly kind: "alternateActionCost" }
  >;
}[] {
  return combatant?.origin.kind === "character"
    ? combatant.origin.characterUnitRefs.flatMap((unitRef) =>
        unitRef.supportProfiles.flatMap((profile) =>
          typeof profile === "object" && profile.kind === "alternateActionCost"
            ? [{ unitId: unitRef.unitId, profile }]
            : [],
        ),
      )
    : [];
}

function alternateActionCostActionAvailable(
  state: BattleState,
  actorId: CombatantId,
  action: AlternateActionCostAction,
): boolean {
  return Match.value(action).pipe(
    Match.when("dash", () => true),
    Match.when("disengage", () => true),
    Match.when("hide", () => canHideInCurrentCircumstances(state, actorId)),
    Match.exhaustive,
  );
}

function actorHasAlternateActionCost(
  combatant: BattleCreatureState | undefined,
  sourceUnitId: string,
  action: AlternateActionCostAction,
): boolean {
  return alternateActionCostProfilesForActor(combatant).some(
    (entry) =>
      entry.unitId === sourceUnitId &&
      entry.profile.to.kind === "bonusAction" &&
      entry.profile.from.actions.some((candidate) => candidate === action),
  );
}

function alternateActionCostActionLabel(
  action: AlternateActionCostAction,
): string {
  return Match.value(action).pipe(
    Match.when("dash", () => "Dash"),
    Match.when("disengage", () => "Disengage"),
    Match.when("hide", () => "Hide"),
    Match.exhaustive,
  );
}

function canHideInCurrentCircumstances(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  const prerequisite = state.hidePrerequisites.get(combatantId);
  if (prerequisite === undefined) return false;
  return Match.value(prerequisite).pipe(
    Match.when({ kind: "heavilyObscuredOutOfEnemyLineOfSight" }, () => true),
    Match.when({ kind: "coverOutOfEnemyLineOfSight" }, () => true),
    Match.exhaustive,
  );
}

function grappleTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  return [...state.combatants.keys()].filter((targetId) => {
    const link = grappleLinkForTarget(state, actorId, targetId, [
      {
        kind: "grappleTargetWithinReach",
        grapplerId: actorId,
        targetId,
      },
    ]);
    return link.tag === "ok";
  });
}

function battleMovementBudget(
  combatant: BattleCreatureState | undefined,
  grapples: readonly BattleGrappleLink[] = [],
  movementBonusFeet: MovementFeet = movementFeet(0),
): {
  readonly speedFeet: MovementFeet;
  readonly spentFeet: MovementFeet;
  readonly remainingFeet: MovementFeet;
} {
  if (combatant === undefined) {
    return {
      speedFeet: movementFeet(0),
      spentFeet: movementFeet(0),
      remainingFeet: movementFeet(0),
    };
  }
  const speedFeet = effectiveWalkSpeed(
    combatant,
    grapples.some((grapple) => grapple.targetId === combatant.combatantId),
  );
  const movementBudgetFeet = Number(speedFeet) + Number(movementBonusFeet);
  const remainingFeet = movementFeet(
    Math.max(0, movementBudgetFeet - Number(combatant.movementSpentFeet)),
  );
  return {
    speedFeet,
    spentFeet: combatant.movementSpentFeet,
    remainingFeet,
  };
}

function battleMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
): ReturnType<typeof battleMovementBudget> {
  const bonus =
    actorId === currentActorId(state)
      ? state.currentTurnResources.dashMovementBonusFeet
      : movementFeet(0);
  return battleMovementBudget(
    state.combatants.get(actorId),
    state.grapples,
    bonus,
  );
}

function effectiveWalkSpeed(
  combatant: BattleCreatureState,
  isGrappled = false,
): MovementFeet {
  if (
    isGrappled ||
    hasCondition(combatant.conditions, "paralyzed") ||
    hasCondition(combatant.conditions, "petrified") ||
    hasCondition(combatant.conditions, "restrained") ||
    hasCondition(combatant.conditions, "stunned") ||
    hasCondition(combatant.conditions, "unconscious")
  ) {
    return movementFeet(0);
  }
  const base = baseWalkSpeed(combatant);
  const delta = combatant.activeEffects
    .filter((effect) => effect.kind === "speedDelta")
    .reduce((total, effect) => total + effect.deltaFeet, 0);
  return movementFeet(base + delta);
}

function baseWalkSpeed(combatant: BattleCreatureState): number {
  if (combatant.origin.kind === "character") {
    return Number(combatant.origin.speed.walkFeet);
  }
  const walkSpeed = combatant.origin.statBlock.statBlock.speeds.find(
    (speed) => speed.kind === "walk" && speed.feet.kind === "literal",
  );
  return walkSpeed?.feet.kind === "literal" ? walkSpeed.feet.value : 0;
}

function combatantCanMoveInState(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return combatantCanMoveWithBudget(
    state,
    combatantId,
    battleMovementBudgetForActor(state, combatantId).remainingFeet,
  );
}

function combatantCanMoveWithBudget(
  state: BattleState,
  combatantId: CombatantId,
  movementBudgetFeet: MovementFeet,
): boolean {
  const combatant = state.combatants.get(combatantId);
  return (
    combatant !== undefined &&
    !zeroHpLifecycleIsTerminal(combatant) &&
    Number(movementBudgetFeet) > 0
  );
}

function opportunityAttackThreatsForMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): readonly BattleOpportunityAttackThreat[] {
  if (
    movement.moverId === currentActorId(state) &&
    state.currentTurnResources.disengaged
  ) {
    return [];
  }
  return movement.provokedOpportunityAttacks.filter(
    (threat) =>
      opportunityAttackOptionForReactor(
        state,
        threat.reactorId,
        movement.moverId,
        threat.attackName,
      ) !== undefined &&
      combatantCanSee(state, threat.reactorId, movement.moverId),
  );
}

function opportunityAttackOptionForReactor(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
): SupportedAttackActionOption | undefined {
  return attackActionOptionsForActor(state, reactorId).find((attack) => {
    const constraint = attackTargetConstraint(attack);
    return (
      attackActionOptionName(attack) === attackName &&
      constraint.kind === "meleeReach" &&
      state.combatants.has(targetId)
    );
  });
}

function attackTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  const attackName = attackActionOptionName(attack);
  const constraint = attackTargetConstraint(attack);
  return (
    actorId !== targetId &&
    state.combatants.has(targetId) &&
    (constraint.kind === "meleeReach"
      ? facts.some(
          (fact) =>
            fact.kind === "attackTargetInMeleeReach" &&
            fact.actorId === actorId &&
            fact.targetId === targetId &&
            fact.attackName === attackName,
        )
      : attackTargetRangeBand(facts, actorId, targetId, attack) !== null)
  );
}

function attackTargetRangeBand(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleAttackRangeBand | null {
  if (attackTargetConstraint(attack).kind !== "rangedRange") {
    return null;
  }
  const attackName = attackActionOptionName(attack);
  for (const fact of facts) {
    if (
      fact.kind === "attackTargetInRangedRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      fact.attackName === attackName
    ) {
      return fact.rangeBand;
    }
  }
  return null;
}

function grappleLinkForTarget(
  state: BattleState,
  grapplerId: CombatantId,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
):
  | { readonly tag: "ok"; readonly link: BattleGrappleLink }
  | { readonly tag: "invalid"; readonly message: string } {
  const grappler = state.combatants.get(grapplerId);
  const target = state.combatants.get(targetId);
  if (
    grappler === undefined ||
    target === undefined ||
    grapplerId === targetId
  ) {
    return {
      tag: "invalid",
      message: "Grapple target must be another combatant in this battle.",
    };
  }
  if (grappledBy(state, targetId) !== undefined) {
    return { tag: "invalid", message: "Grapple target is already Grappled." };
  }
  const hand = firstFreeHand(grappler, state.grapples);
  if (hand === undefined) {
    return { tag: "invalid", message: "Grapple requires a free hand." };
  }
  if (!targetIsNoMoreThanOneSizeLarger(grappler.size, target.size)) {
    return {
      tag: "invalid",
      message: "Grapple target cannot be more than one size larger.",
    };
  }
  if (
    !facts.some(
      (fact) =>
        fact.kind === "grappleTargetWithinReach" &&
        fact.grapplerId === grapplerId &&
        fact.targetId === targetId,
    )
  ) {
    return {
      tag: "invalid",
      message: "Grapple target must be within reach by table-supplied fact.",
    };
  }
  return {
    tag: "ok",
    link: {
      grapplerId,
      targetId,
      escapeDc: grappleEscapeDc(grappler),
      reachFeet: movementFeet(5),
      hand,
      targetExemptFromDragCost: grappleDragCostExempt(
        grappler.size,
        target.size,
      ),
    },
  };
}

function firstFreeHand(
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): BattleHand | undefined {
  const hands = combatantHandUses(combatant, grapples);
  if (hands.left === "free") return "left";
  if (hands.right === "free") return "right";
  return undefined;
}

function grappleEscapeDc(grappler: BattleCreatureState): DifficultyClass {
  return difficultyClass(
    8 + strengthModifier(grappler) + combatantProficiencyBonus(grappler),
  );
}

function strengthModifier(combatant: BattleCreatureState): number {
  if (combatant.origin.kind === "statBlock") {
    return Math.floor(
      (combatant.origin.statBlock.statBlock.abilityScores.str - 10) / 2,
    );
  }
  return Number(combatant.armorClass.abilityModifiers.str);
}

function combatantProficiencyBonus(combatant: BattleCreatureState): number {
  if (combatant.origin.kind === "statBlock") return 2;
  const level = combatant.origin.classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );
  return Number(proficiencyBonus(Math.floor((level - 1) / 4) + 2));
}

const SIZE_RANKS: Readonly<Record<Size, number>> = {
  tiny: 0,
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
  gargantuan: 5,
};

function targetIsNoMoreThanOneSizeLarger(
  grappler: Size,
  target: Size,
): boolean {
  return SIZE_RANKS[target] - SIZE_RANKS[grappler] <= 1;
}

function grappleDragCostExempt(grappler: Size, target: Size): boolean {
  return target === "tiny" || SIZE_RANKS[grappler] - SIZE_RANKS[target] >= 2;
}

function attackRollHole(
  attack: SupportedAttackActionOption,
  rollMode?: AttackRollMode,
  ongoingFeatureActivations?: readonly AttackRollFeatureActivation[],
): BattleAttackRollHole {
  const name = attackActionOptionName(attack);
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${name} attack roll`,
    attack,
    attackBonus: attackActionBonus(attack),
    ...(rollMode === undefined ? {} : { rollMode }),
    ...(ongoingFeatureActivations === undefined ||
    ongoingFeatureActivations.length === 0
      ? {}
      : { ongoingFeatureActivations }),
  };
}

function requiredAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack?: SupportedAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[] = [],
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const target = state.combatants.get(targetId);
  const grapple = grappledBy(state, attackerId);
  const hiddenTargetDisadvantage =
    target?.hidden !== null && target?.hidden !== undefined;
  const dodgeDisadvantage =
    attacker !== undefined &&
    target !== undefined &&
    hasDodgeAttackRollBenefit(state, target, attacker);
  const grappleDisadvantage =
    grapple !== undefined && grapple.grapplerId !== targetId;
  const longRangeDisadvantage =
    attack !== undefined &&
    attackTargetRangeBand(targetSpatialFacts, attackerId, targetId, attack) ===
      "long";
  const hasAdvantage =
    (attacker?.hidden !== null && attacker?.hidden !== undefined) ||
    state.helpAttacks.some(
      (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
    ) ||
    ongoingFeatureGrantsAttackRollMode(attacker, target, "advantage", attack);
  const hasDisadvantage =
    hiddenTargetDisadvantage ||
    dodgeDisadvantage ||
    grappleDisadvantage ||
    longRangeDisadvantage ||
    ongoingFeatureGrantsAttackRollMode(
      attacker,
      target,
      "disadvantage",
      attack,
    );
  if (hasAdvantage && !hasDisadvantage) return "advantage";
  if (hasDisadvantage && !hasAdvantage) return "disadvantage";
  return undefined;
}

function attackRollHasAdvantageSource(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack?: SupportedAttackActionOption,
): boolean {
  const attacker = state.combatants.get(attackerId);
  const target = state.combatants.get(targetId);
  return (
    (attacker?.hidden !== null && attacker?.hidden !== undefined) ||
    state.helpAttacks.some(
      (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
    ) ||
    ongoingFeatureGrantsAttackRollMode(attacker, target, "advantage", attack)
  );
}

function attackRollModeWithOptionalOngoingFeature(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
  activatedOngoingFeatureUnitId: UnitRecord["id"] | undefined,
): AttackRollMode | undefined {
  const baseline = requiredAttackRollMode(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  );
  if (activatedOngoingFeatureUnitId === undefined) {
    return baseline;
  }
  if (baseline === "disadvantage") {
    return undefined;
  }
  if (
    baseline === undefined &&
    attackRollHasAdvantageSource(state, attackerId, targetId, attack)
  ) {
    return undefined;
  }
  return "advantage";
}

function ongoingFeatureLifecycleHasExtensionTrigger(
  lifecycle: OngoingFeatureLifecycleProfile,
  trigger: OngoingFeatureExtensionTrigger,
): boolean {
  return (
    lifecycle.kind === "roundExtended" &&
    lifecycle.extensionTriggers.includes(trigger)
  );
}

function ongoingFeatureProfileHasExtensionTrigger(
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  > | null,
  trigger: OngoingFeatureExtensionTrigger,
): boolean {
  return (
    profile !== null &&
    ongoingFeatureLifecycleHasExtensionTrigger(profile.lifecycle, trigger)
  );
}

function attackRollOngoingFeatureActivations(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly AttackRollFeatureActivation[] {
  const attacker = state.combatants.get(attackerId);
  if (
    !isCharacterBattleCreatureState(attacker) ||
    state.currentTurnResources.attackRollMadeThisTurn ||
    attack.kind !== "weapon"
  ) {
    return [];
  }
  return [...attacker.origin.ongoingFeatureProfiles.values()].flatMap(
    (unitFeature): readonly AttackRollFeatureActivation[] => {
      if (
        unitFeature.activationTrigger !== "firstAttackRoll" ||
        unitFeature.spendsUse ||
        activeOngoingFeatureOccurrencesForCombatant(attacker).has(
          ongoingFeatureSourceKeyForUnit(unitFeature.unit.id),
        ) ||
        !unitFeature.rollModifiers.some(
          (modifier) =>
            modifier.affects === "selfRoll" &&
            modifier.mode === "advantage" &&
            attackAbilityMatchesModifier(attack, modifier),
        )
      ) {
        return [];
      }
      return [
        {
          unitId: unitFeature.unit.id,
          label: unitFeature.unit.name,
          rollMode: "advantage" as const,
        },
      ];
    },
  );
}

function attackRollOngoingFeatureActivationProfile(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
  unitId: UnitRecord["id"] | undefined,
  allowAlreadyActiveReplay: boolean,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "ongoingFeature" }
> | null {
  if (unitId === undefined) return null;
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) return null;
  const unitFeature = attacker.origin.ongoingFeatureProfiles.get(
    ongoingFeatureSourceKeyForUnit(unitId),
  );
  if (
    unitFeature?.kind !== "ongoingFeature" ||
    unitFeature.activationTrigger !== "firstAttackRoll" ||
    !(
      attackRollOngoingFeatureActivations(state, attackerId, attack).some(
        (option) => option.unitId === unitId,
      ) ||
      (allowAlreadyActiveReplay &&
        activeOngoingFeatureOccurrencesForCombatant(attacker).has(
          ongoingFeatureSourceKeyForUnit(unitId),
        ))
    )
  ) {
    return null;
  }
  return unitFeature;
}

function ongoingFeatureGrantsAttackRollMode(
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState | undefined,
  mode: AttackRollMode,
  attack?: SupportedAttackActionOption,
): boolean {
  const outgoing =
    isCharacterBattleCreatureState(attacker) &&
    target !== undefined &&
    [...activeOngoingFeatureOccurrencesForCombatant(attacker)].some(([key]) =>
      ongoingFeatureProfileForSourceKey(attacker, key)?.rollModifiers.some(
        (modifier) =>
          modifier.mode === mode &&
          modifier.affects === "selfRoll" &&
          modifier.on === "attackRoll" &&
          attackAbilityMatchesModifier(
            attack?.kind === "weapon" ? attack : null,
            modifier,
          ),
      ),
    );
  const incoming =
    isCharacterBattleCreatureState(target) &&
    [...activeOngoingFeatureOccurrencesForCombatant(target)].some(([key]) =>
      ongoingFeatureProfileForSourceKey(target, key)?.rollModifiers.some(
        (modifier) =>
          modifier.mode === mode &&
          modifier.affects === "rollsAgainstSelf" &&
          modifier.on === "attackRoll" &&
          attackAbilityMatchesModifier(
            attack?.kind === "weapon" ? attack : null,
            modifier,
          ),
      ),
    );
  return outgoing || incoming;
}

function attackAbilityMatchesModifier(
  attack: CharacterWeaponAttackActionOption | null | undefined,
  modifier: OngoingFeatureRollModifier | OngoingFeatureDamageModifier,
): boolean {
  return (
    modifier.abilityFilter === undefined ||
    (attack !== null &&
      attack !== undefined &&
      modifier.abilityFilter.includes(attack.ability))
  );
}

function hasDodgeBenefit(
  state: BattleState,
  target: BattleCreatureState,
): boolean {
  return (
    target.dodging &&
    !isIncapacitated(target.conditions) &&
    Number(
      effectiveWalkSpeed(
        target,
        state.grapples.some(
          (grapple) => grapple.targetId === target.combatantId,
        ),
      ),
    ) > 0
  );
}

function hasDodgeAttackRollBenefit(
  state: BattleState,
  target: BattleCreatureState,
  attacker: BattleCreatureState,
): boolean {
  return (
    hasDodgeBenefit(state, target) &&
    !hasCondition(target.conditions, "blinded") &&
    attacker.hidden === null
  );
}

function consumeHelpAttackForAttackRoll(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const helpIndex = state.helpAttacks.findIndex(
    (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
  );
  if (helpIndex === -1) return state;
  return {
    ...state,
    helpAttacks: state.helpAttacks.filter((_, index) => index !== helpIndex),
  };
}

function combatantsAreEnemies(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  const target = state.combatants.get(targetId);
  return (
    actor !== undefined && target !== undefined && actor.side !== target.side
  );
}

function combatantsAreAllies(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  const target = state.combatants.get(targetId);
  return (
    actor !== undefined && target !== undefined && actor.side === target.side
  );
}

function extendAttackRollOngoingFeatures(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  if (!combatantsAreEnemies(state, attackerId, targetId)) {
    return state;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) return state;
  const activeOngoingFeatureOccurrences =
    activeOngoingFeatureOccurrencesForCombatant(attacker);
  if (
    ![...activeOngoingFeatureOccurrences].some(([key]) =>
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(attacker, key),
        "attackRollAgainstEnemy",
      ),
    )
  ) {
    return state;
  }
  const nextOccurrences = new Map(attacker.activeOngoingFeatureOccurrences);
  for (const [key, occurrence] of activeOngoingFeatureOccurrences) {
    if (
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(attacker, key),
        "attackRollAgainstEnemy",
      )
    ) {
      nextOccurrences.set(
        key,
        extendOngoingFeatureToEndOfNextTurn(state, attackerId, occurrence),
      );
    }
  }
  const nextActor = {
    ...attacker,
    activeOngoingFeatureOccurrences: nextOccurrences,
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(attackerId, nextActor),
  };
}

function extendSavingThrowOngoingFeatures(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
): BattleState {
  if (
    !targetIds.some((targetId) =>
      combatantsAreEnemies(state, actorId, targetId),
    )
  ) {
    return state;
  }
  const actor = state.combatants.get(actorId);
  if (actor === undefined) return state;
  const activeOngoingFeatureOccurrences =
    activeOngoingFeatureOccurrencesForCombatant(actor);
  if (
    ![...activeOngoingFeatureOccurrences].some(([key]) =>
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(actor, key),
        "enemySavingThrow",
      ),
    )
  ) {
    return state;
  }
  const nextOccurrences = new Map(actor.activeOngoingFeatureOccurrences);
  for (const [key, occurrence] of activeOngoingFeatureOccurrences) {
    if (
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(actor, key),
        "enemySavingThrow",
      )
    ) {
      nextOccurrences.set(
        key,
        extendOngoingFeatureToEndOfNextTurn(state, actorId, occurrence),
      );
    }
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeOngoingFeatureOccurrences: nextOccurrences,
    }),
  };
}

function recordAttackRollOngoingFeatures(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  activatedOngoingFeatureProfile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  > | null,
): BattleState {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined || attackerId !== currentActorId(state)) {
    return state;
  }
  const withActivatedOngoingFeature =
    activatedOngoingFeatureProfile === null
      ? state
      : stateWithActiveOngoingFeatureOccurrence(
          state,
          attacker,
          attackerId,
          activatedOngoingFeatureProfile,
        );
  const withExtendedOngoingFeatures = extendAttackRollOngoingFeatures(
    withActivatedOngoingFeature,
    attackerId,
    targetId,
  );
  return {
    ...withExtendedOngoingFeatures,
    currentTurnResources: {
      ...withExtendedOngoingFeatures.currentTurnResources,
      attackRollMadeThisTurn: true,
    },
  };
}

function stateWithActiveOngoingFeatureOccurrence(
  state: BattleState,
  actor: BattleCreatureState,
  actorId: CombatantId,
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): BattleState {
  const occurrences = new Map(actor.activeOngoingFeatureOccurrences);
  occurrences.set(
    ongoingFeatureSourceKeyForUnit(profile.unit.id),
    activeOngoingFeatureOccurrenceFromProfile(state, actorId, profile),
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeOngoingFeatureOccurrences: occurrences,
    }),
  };
}

function attackRollModeMatches(
  roll: BattleAttackRollResult,
  requiredMode: AttackRollMode | undefined,
): boolean {
  return requiredMode === undefined || roll.rollMode === requiredMode;
}

function attackDamageHole(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  ongoingDamageModifier = 0,
): BattleDamageRollHole {
  const expression = weaponAttackDamageExpression(
    attack,
    critical,
    attackRoll,
    [],
    ongoingDamageModifier,
  );
  const name = attackActionOptionName(attack);
  return {
    kind: "rolledDice",
    holeId: attackDamageHoleId(
      attack,
      critical,
      attackRoll,
      ongoingDamageModifier,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:attack:damage-result:${expression}`,
    ),
    label: `${name} damage (${expression})`,
    attack,
    critical,
    ...(attackDamageRiders.length === 0 ? {} : { attackDamageRiders }),
  };
}

function attackDamageDispositionHole(input: {
  readonly attack: SupportedAttackActionOption;
  readonly attackerId: CombatantId;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
}): BattleAttackDamageDispositionHole | null {
  return attackCanCarryKnockOutChoice(input.attack) &&
    damageAllowsKnockOut(input.target, input.damageAmount)
    ? {
        kind: "attackDamageDisposition",
        holeId: ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
        holeInstanceKey: ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE,
        label: "Attack damage disposition",
        attackerId: input.attackerId,
        targetId: input.target.combatantId,
        choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
      }
    : null;
}

function attackDamageHoleId(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
  ongoingDamageModifier = 0,
): BattleHoleId {
  return holeId(
    `battle:attack:damage-result:${weaponAttackDamageExpression(
      attack,
      critical,
      attackRoll,
      [],
      ongoingDamageModifier,
    )}`,
  );
}

function attackActionOptionForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): SupportedAttackActionOption | undefined {
  return attackActionOptionsForActor(state, subject.actorId).find(
    (attack) =>
      attackActionOptionName(attack) === subject.attackName &&
      statBlockSectionMatchesSubject(attack, subject.statBlockSection),
  );
}

function attackActionOptionsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly SupportedAttackActionOption[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind === "character") {
    return actor.origin.attack == null
      ? [actor.origin.unarmedStrike]
      : [actor.origin.attack, actor.origin.unarmedStrike];
  }

  if (actor?.origin.kind === "statBlock") {
    const origin = actor.origin;
    const multiattackResources =
      state.currentTurnResources.actionResources.filter(
        (resource): resource is StatBlockMultiattackActionResource =>
          isStatBlockMultiattackActionResource(resource, actorId),
      );
    const multiattackAttackNames = multiattackResources.map(
      (resource) => resource.attackPart.name,
    );
    return statBlockAttackActionOptions(origin.statBlock).filter(
      (option) =>
        statBlockAttackResourceAvailable(
          origin.statBlock.statBlock,
          origin.resources,
          option,
        ) &&
        (multiattackAttackNames.length === 0 ||
          multiattackAttackNames.includes(option.attack.name)),
    );
  }

  return [];
}

function offHandAttackActionOptionForActor(
  state: BattleState,
  actorId: CombatantId,
): CharacterWeaponAttackActionOption | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  const main = actor.origin.attack;
  const offHand = actor.origin.offHandAttack;
  if (main === null || offHand === undefined) return undefined;
  if (
    main.kind !== "weapon" ||
    !isLightMeleeWeapon(main.weapon) ||
    !isLightMeleeWeapon(offHand.weapon)
  ) {
    return undefined;
  }
  return {
    ...offHand,
    damageAbilityModifier:
      offHand.abilityModifier < 0
        ? offHand.abilityModifier
        : abilityModifier(0),
  };
}

function offHandAttackPrerequisiteMet(
  state: BattleState,
  actorId: CombatantId,
  offHand: CharacterWeaponAttackActionOption,
): boolean {
  const offHandItemId = offHandWeaponItemIdForActor(state, actorId, offHand);
  if (offHandItemId === undefined) return false;
  const priorLightAttack = state.currentTurnResources.lightWeaponAttackMade;
  return (
    priorLightAttack !== undefined &&
    priorLightAttack.weaponItemId !== offHandItemId
  );
}

function heldWeaponItemIdForAttack(
  state: BattleState,
  actorId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
): string {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return attack.weapon.id;
  if (
    actor.origin.attack?.kind === "weapon" &&
    actor.origin.attack.weapon.id === attack.weapon.id
  ) {
    return actor.origin.selectedLoadout.weapon?.itemId ?? attack.weapon.id;
  }
  if (actor.origin.offHandAttack?.weapon.id === attack.weapon.id) {
    return (
      actor.origin.selectedLoadout.offHandWeapon?.itemId ?? attack.weapon.id
    );
  }
  return attack.weapon.id;
}

function offHandWeaponItemIdForActor(
  state: BattleState,
  actorId: CombatantId,
  offHand: CharacterWeaponAttackActionOption,
): string | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  return actor.origin.selectedLoadout.offHandWeapon?.unitId ===
    offHand.weapon.id
    ? actor.origin.selectedLoadout.offHandWeapon.itemId
    : undefined;
}

function isLightMeleeWeapon(weapon: WeaponRecord): boolean {
  return (
    weapon.usage === "melee" &&
    (weapon.properties ?? []).some((property) => property.kind === "light")
  );
}

function supportedStatBlockAttackActionOption(
  attack: CreatureNamedAttackRoll,
  part: StatBlockPartKey,
): StatBlockAttackActionOption | null {
  if (!isSupportedCreatureNamedAttackRoll(attack)) {
    return null;
  }

  return {
    kind: "statBlockAttack",
    attack,
    part,
  };
}

function statBlockAttackActionOptions(
  statBlock: StatBlockRecord,
): readonly StatBlockAttackActionOption[] {
  const actionAttacks = statBlockActionSectionAttackOptions(
    "actions",
    statBlock.statBlock.actions,
  );
  const legendaryAttacks = statBlockActionSectionAttackOptions(
    "legendaryActions",
    statBlock.statBlock.legendaryActions?.actions,
  );

  return [...actionAttacks, ...legendaryAttacks];
}

function attackActionOptionIsOrdinaryAttackAction(
  attack: SupportedAttackActionOption,
): boolean {
  return attack.kind !== "statBlockAttack" || attack.part.section === "actions";
}

function statBlockActionSectionAttackOptions(
  section: StatBlockPartSection,
  actions: CreatureActions | undefined,
): readonly StatBlockAttackActionOption[] {
  return (
    actions?.attacks?.flatMap((attack) => {
      const option = supportedStatBlockAttackActionOption(attack, {
        section,
        name: attack.name,
      });
      return option == null ? [] : [option];
    }) ?? []
  );
}

function isSupportedCreatureNamedAttackRoll(
  attack: CreatureNamedAttackRoll,
): attack is SupportedCreatureNamedAttackRoll {
  return (
    attack.multiattackCount === undefined &&
    attack.attackBonus.kind === "literal" &&
    supportedStatBlockAttackDamage(attack) !== null &&
    supportedStatBlockAttackTargetConstraint(attack) !== null
  );
}

function statBlockResourceState(
  statBlock: StatBlockRecord["statBlock"],
): StatBlockMutableResourceState {
  const limitedUses = statBlockLimitedUseInitialStates(statBlock);
  assertUniqueStatBlockPartKeys(
    limitedUses.dailyUses.map((state) => state.key),
  );
  assertUniqueStatBlockPartKeys(limitedUses.rechargeParts);
  assertUniqueStatBlockPartKeys(limitedUses.restRechargeParts);
  return {
    legendaryActionUsesRemaining: resourceCount(
      statBlock.legendaryActions?.uses ?? 0,
    ),
    dailyUses: limitedUses.dailyUses,
    unavailableRechargeParts: [],
    unavailableRestRechargeParts: [],
  };
}

function statBlockLimitedUseInitialStates(
  statBlock: StatBlockRecord["statBlock"],
): {
  readonly dailyUses: readonly StatBlockDailyUseState[];
  readonly rechargeParts: readonly StatBlockPartKey[];
  readonly restRechargeParts: readonly StatBlockPartKey[];
} {
  const states = statBlockAuthoredLimitedUses(statBlock);
  return {
    dailyUses: states.flatMap((state) =>
      state.kind === "daily"
        ? [{ key: state.key, usesRemaining: resourceCount(state.uses) }]
        : [],
    ),
    rechargeParts: states.flatMap((state) =>
      state.kind === "recharge" ? [state.key] : [],
    ),
    restRechargeParts: states.flatMap((state) =>
      state.kind === "recharge_after_rest" ? [state.key] : [],
    ),
  };
}

function statBlockAuthoredLimitedUses(
  statBlock: StatBlockRecord["statBlock"],
): readonly StatBlockAuthoredLimitedUse[] {
  return [
    ...statBlockActionSectionLimitedUseInitialStates(
      "actions",
      statBlock.actions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "bonusActions",
      statBlock.bonusActions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "reactions",
      statBlock.reactions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "legendaryActions",
      statBlock.legendaryActions?.actions,
    ),
  ];
}

type StatBlockAuthoredLimitedUse = CreatureLimitedUse & {
  readonly key: StatBlockPartKey;
};

function statBlockActionSectionLimitedUseInitialStates(
  section: StatBlockPartSection,
  actions: CreatureActions | undefined,
): readonly StatBlockAuthoredLimitedUse[] {
  const attacks =
    actions?.attacks?.flatMap((attack) =>
      statBlockAuthoredLimitedUse(
        { section, name: attack.name },
        attack.limitedUse,
      ),
    ) ?? [];
  const saves =
    actions?.saves?.flatMap((save) =>
      statBlockAuthoredLimitedUse(
        { section, name: save.name },
        save.limitedUse,
      ),
    ) ?? [];
  const supports =
    actions?.supports?.flatMap((support) =>
      statBlockAuthoredLimitedUse(
        { section, name: support.name },
        support.limitedUse,
      ),
    ) ?? [];
  const actionOptions =
    actions?.actionOptions?.flatMap((option) =>
      statBlockAuthoredLimitedUse(
        { section, name: option.name },
        option.limitedUse,
      ),
    ) ?? [];

  return [...attacks, ...saves, ...supports, ...actionOptions];
}

function statBlockAuthoredLimitedUse(
  key: StatBlockPartKey,
  limitedUse: CreatureLimitedUse | undefined,
): readonly StatBlockAuthoredLimitedUse[] {
  if (limitedUse === undefined) return [];
  return [{ ...limitedUse, key }];
}

function statBlockResourceSnapshot(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
): StatBlockResourceSnapshot {
  const authoredLimitedUses = statBlockLimitedUseInitialStates(statBlock);
  return {
    legendaryActions:
      statBlock.legendaryActions === undefined
        ? null
        : {
            usesMax: resourceCount(statBlock.legendaryActions.uses),
            usesRemaining: resources.legendaryActionUsesRemaining,
          },
    limitedUses: [
      ...authoredLimitedUses.dailyUses
        .map((daily) => {
          const authored = statBlockLimitedUseForPart(statBlock, daily.key);
          if (authored?.kind !== "daily") return null;
          return {
            key: daily.key,
            kind: "daily" as const,
            usesMax: resourceCount(authored.uses),
            usesRemaining: daily.usesRemaining,
          };
        })
        .filter(
          (
            state,
          ): state is Extract<
            StatBlockLimitedUseSnapshot,
            { readonly kind: "daily" }
          > => state !== null,
        ),
      ...authoredLimitedUses.rechargeParts.map((key) => {
        const authored = statBlockLimitedUseForPart(statBlock, key);
        if (authored?.kind !== "recharge") {
          throw new Error(
            "Recharge resource key must reference Recharge authored use.",
          );
        }
        return {
          key,
          kind: "recharge" as const,
          minimumRoll: authored.minimumRoll,
          available: !resources.unavailableRechargeParts.some((part) =>
            sameStatBlockPartKey(part, key),
          ),
        };
      }),
      ...authoredLimitedUses.restRechargeParts.map((key) => ({
        key,
        kind: "recharge_after_rest" as const,
        available: !resources.unavailableRestRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
      })),
    ],
  };
}

function statBlockLimitedUseForPart(
  statBlock: StatBlockRecord["statBlock"],
  key: StatBlockPartKey,
): CreatureLimitedUse | undefined {
  return statBlockAuthoredLimitedUses(statBlock).find((limitedUse) =>
    sameStatBlockPartKey(limitedUse.key, key),
  );
}

function refreshStatBlockStartTurnResources(
  resources: StatBlockMutableResourceState,
  statBlock: StatBlockRecord["statBlock"],
): StatBlockMutableResourceState {
  return {
    ...resources,
    legendaryActionUsesRemaining: resourceCount(
      statBlock.legendaryActions?.uses ?? 0,
    ),
  };
}

function statBlockAttackResourceAvailable(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  attack: StatBlockAttackActionOption,
): boolean {
  return (
    statBlockPartLimitedUseAvailable(statBlock, resources, attack.part) &&
    (attack.part.section !== "legendaryActions" ||
      resources.legendaryActionUsesRemaining > 0)
  );
}

function statBlockPartLimitedUseAvailable(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  key: StatBlockPartKey,
): boolean {
  const limitedUse = statBlockLimitedUseForPart(statBlock, key);
  if (limitedUse === undefined) return true;
  return Match.value(limitedUse).pipe(
    Match.when(
      { kind: "daily" },
      () =>
        (resources.dailyUses.find((state) =>
          sameStatBlockPartKey(state.key, key),
        )?.usesRemaining ?? 0) > 0,
    ),
    Match.when(
      { kind: "recharge" },
      () =>
        !resources.unavailableRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
    ),
    Match.when(
      { kind: "recharge_after_rest" },
      () =>
        !resources.unavailableRestRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
    ),
    Match.exhaustive,
  );
}

function spendStatBlockAttackResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): BattleState {
  if (input.attack.kind !== "statBlockAttack") {
    return input.state;
  }
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "statBlock") {
    return input.state;
  }

  const resources = spendStatBlockPartResources(
    actor.origin.statBlock.statBlock,
    actor.origin.resources,
    input.attack.part,
  );
  const combatants = new Map(input.state.combatants);
  combatants.set(input.actorId, {
    ...actor,
    origin: {
      ...actor.origin,
      resources,
    },
  });
  return { ...input.state, combatants };
}

function updateStatBlockActorResources(
  state: BattleState,
  actor: StatBlockBattleCreatureState,
  part: StatBlockPartKey,
): BattleState {
  const currentActor = state.combatants.get(actor.combatantId);
  if (currentActor?.origin.kind !== "statBlock") {
    return state;
  }
  const resources = spendStatBlockPartResources(
    currentActor.origin.statBlock.statBlock,
    currentActor.origin.resources,
    part,
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actor.combatantId, {
      ...currentActor,
      origin: {
        ...currentActor.origin,
        resources,
      },
    }),
  };
}

function spendStatBlockPartResources(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  key: StatBlockPartKey,
): StatBlockMutableResourceState {
  const limitedUse = statBlockLimitedUseForPart(statBlock, key);
  return {
    legendaryActionUsesRemaining:
      key.section === "legendaryActions"
        ? resourceCount(Number(resources.legendaryActionUsesRemaining) - 1)
        : resources.legendaryActionUsesRemaining,
    dailyUses:
      limitedUse?.kind === "daily"
        ? resources.dailyUses.map((state) =>
            sameStatBlockPartKey(state.key, key)
              ? {
                  ...state,
                  usesRemaining: resourceCount(Number(state.usesRemaining) - 1),
                }
              : state,
          )
        : resources.dailyUses,
    unavailableRechargeParts:
      limitedUse?.kind === "recharge" &&
      !resources.unavailableRechargeParts.some((part) =>
        sameStatBlockPartKey(part, key),
      )
        ? [...resources.unavailableRechargeParts, key]
        : resources.unavailableRechargeParts,
    unavailableRestRechargeParts:
      limitedUse?.kind === "recharge_after_rest" &&
      !resources.unavailableRestRechargeParts.some((part) =>
        sameStatBlockPartKey(part, key),
      )
        ? [...resources.unavailableRestRechargeParts, key]
        : resources.unavailableRestRechargeParts,
  };
}

function statBlockSectionMatchesSubject(
  attack: SupportedAttackActionOption,
  section: StatBlockPartSection | undefined,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => section === undefined),
    Match.when({ kind: "unarmedStrike" }, () => section === undefined),
    Match.when(
      { kind: "statBlockAttack" },
      (option) => option.part.section === (section ?? "actions"),
    ),
    Match.exhaustive,
  );
}

function statBlockSubjectPart(attack: SupportedAttackActionOption): {
  readonly statBlockSection?: StatBlockPartSection;
} {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => ({})),
    Match.when({ kind: "unarmedStrike" }, () => ({})),
    Match.when({ kind: "statBlockAttack" }, (option) =>
      option.part.section === "actions"
        ? {}
        : { statBlockSection: option.part.section },
    ),
    Match.exhaustive,
  );
}

function sameStatBlockPartKey(
  left: StatBlockPartKey,
  right: StatBlockPartKey,
): boolean {
  return left.section === right.section && left.name === right.name;
}

function assertUniqueStatBlockPartKeys(
  keys: readonly StatBlockPartKey[],
): void {
  const seen = new Set<string>();
  for (const key of keys) {
    const encoded = statBlockPartKeyString(key);
    if (seen.has(encoded)) {
      throw new Error(
        `Duplicate limited-use Stat Block part: ${key.section}/${key.name}`,
      );
    }
    seen.add(encoded);
  }
}

function statBlockPartKeyString(key: StatBlockPartKey): string {
  return `${key.section}\u0000${key.name}`;
}

function supportedStatBlockAttackDamage(
  attack: SupportedCreatureNamedAttackRoll,
): StatBlockAttackDamage;
function supportedStatBlockAttackDamage(
  attack: CreatureNamedAttackRoll,
): StatBlockAttackDamage | null;
function supportedStatBlockAttackDamage(
  attack: CreatureNamedAttackRoll,
): StatBlockAttackDamage | null {
  const baseDamage = attack.onHit.flatMap((effect) =>
    supportedStatBlockBaseDamageEffect(effect),
  );
  const advantageBonus = attack.onHit.flatMap((effect) =>
    supportedStatBlockAdvantageBonusDamageEffect(effect),
  );
  if (
    baseDamage.length !== 1 ||
    baseDamage.length + advantageBonus.length !== attack.onHit.length
  ) {
    return null;
  }

  const damage = baseDamage[0];
  if (damage === undefined) {
    return null;
  }
  const bonus = advantageBonus[0];
  if (advantageBonus.length > 1) {
    return null;
  }
  if (bonus !== undefined && bonus.damageType !== damage.damageType) {
    return null;
  }

  return {
    expr: damage.expr,
    damageType: damage.damageType,
    ...(bonus === undefined ? {} : { advantageBonus: bonus }),
  };
}

function supportedStatBlockBaseDamageEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): readonly StatBlockAttackDamage[] {
  return effect.kind === "damage" &&
    effect.amount.kind === "fixed" &&
    typeof effect.damageType === "string"
    ? [
        {
          expr: effect.amount.expr,
          damageType: effect.damageType,
        },
      ]
    : [];
}

function supportedStatBlockAdvantageBonusDamageEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): readonly Required<StatBlockAttackDamage>["advantageBonus"][] {
  return effect.kind === "conditional_bonus_damage" &&
    effect.when.kind === "attack_roll_had_advantage" &&
    effect.amount.kind === "fixed" &&
    typeof effect.damageType === "string"
    ? [
        {
          expr: effect.amount.expr,
          damageType: effect.damageType,
        },
      ]
    : [];
}

function supportedStatBlockAttackTargetConstraint(
  attack: SupportedCreatureNamedAttackRoll,
): AttackTargetConstraint;
function supportedStatBlockAttackTargetConstraint(
  attack: CreatureNamedAttackRoll,
): AttackTargetConstraint | null;
function supportedStatBlockAttackTargetConstraint(
  attack: CreatureNamedAttackRoll,
): AttackTargetConstraint | null {
  if (attack.attackType === "melee" && attack.reachFeet !== undefined) {
    return { kind: "meleeReach", reachFeet: movementFeet(attack.reachFeet) };
  }
  if (attack.attackType === "ranged" && attack.rangeFeet !== undefined) {
    return {
      kind: "rangedRange",
      normalFeet: movementFeet(attack.rangeFeet.normal),
      longFeet: movementFeet(attack.rangeFeet.long),
    };
  }

  return null;
}

function statBlockAttackDamage(
  attack: StatBlockAttackActionOption,
): StatBlockAttackDamage {
  return supportedStatBlockAttackDamage(attack.attack);
}

function statBlockAttackTargetConstraint(
  attack: StatBlockAttackActionOption,
): AttackTargetConstraint {
  return supportedStatBlockAttackTargetConstraint(attack.attack);
}

function statBlockAttackBonus(
  attack: StatBlockAttackActionOption,
): AttackBonus {
  return attackBonus(attack.attack.attackBonus.value);
}

function attackTargetConstraint(
  attack: SupportedAttackActionOption,
): AttackTargetConstraint {
  return Match.value(attack).pipe(
    Match.when({ kind: "statBlockAttack" }, (option) =>
      statBlockAttackTargetConstraint(option),
    ),
    Match.when({ kind: "weapon" }, (option) =>
      weaponTargetConstraint(option.weapon),
    ),
    Match.when({ kind: "unarmedStrike" }, () => ({
      kind: "meleeReach" as const,
      reachFeet: movementFeet(5),
    })),
    Match.exhaustive,
  );
}

function attackCanCarryKnockOutChoice(
  attack: SupportedAttackActionOption,
): boolean {
  return attackTargetConstraint(attack).kind === "meleeReach";
}

function weaponTargetConstraint(weapon: WeaponRecord): AttackTargetConstraint {
  const properties = weapon.properties ?? [];
  if (weapon.usage === "ranged") {
    const ammunition = properties.find(
      (property) => property.kind === "ammunition",
    );
    const thrown = properties.find((property) => property.kind === "thrown");
    const range = ammunition?.range ?? thrown?.range;
    if (range == null) {
      throw new Error("Ranged Battle Attack requires weapon range.");
    }
    return {
      kind: "rangedRange",
      normalFeet: movementFeet(range.normal),
      longFeet: movementFeet(range.long),
    };
  }

  return {
    kind: "meleeReach",
    reachFeet: properties.some((property) => property.kind === "reach")
      ? movementFeet(10)
      : movementFeet(5),
  };
}

function selectedWeaponDamage(weapon: WeaponRecord): BattleWeaponDamage {
  if (weapon.damage.kind !== "dice") {
    throw new Error("Battle Attack requires dice weapon damage.");
  }

  return weapon.damage;
}

function attackActionOptionName(attack: SupportedAttackActionOption): string {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) => weaponAttack.weapon.name),
    Match.when({ kind: "unarmedStrike" }, () => "Unarmed Strike"),
    Match.when(
      { kind: "statBlockAttack" },
      (statBlockAttack) => statBlockAttack.attack.name,
    ),
    Match.exhaustive,
  );
}

function attackDamage(attack: SupportedAttackActionOption): {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly damageType: DamageType;
} {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) =>
      selectedWeaponDamage(weaponAttack.weapon),
    ),
    Match.when({ kind: "unarmedStrike" }, (unarmedStrike) =>
      unarmedStrikeAttackDamage(unarmedStrike),
    ),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) => {
      const damage = statBlockAttackDamage(statBlockAttack);
      return {
        dice: damage.expr.dice,
        dieSize: damage.expr.dieSize,
        ...(damage.expr.flat === undefined ? {} : { flat: damage.expr.flat }),
        damageType: damage.damageType,
      };
    }),
    Match.exhaustive,
  );
}

function unarmedStrikeAttackDamage(
  attack: CharacterUnarmedStrikeActionOption,
): {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly damageType: DamageType;
} {
  return Match.value(attack.effect.damage).pipe(
    Match.when({ kind: "base" }, (damage) => ({
      dice: 0,
      dieSize: 1,
      flat: damage.flat,
      damageType: damage.damageType,
    })),
    Match.when({ kind: "authoredReplacement" }, (damage) => ({
      dice: damage.dice,
      dieSize: damage.dieSize,
      damageType: damage.damageType,
    })),
    Match.exhaustive,
  );
}

function unarmedStrikeDamageDiceExpr(
  attack: CharacterUnarmedStrikeActionOption,
  critical: boolean,
): DiceExpr | null {
  return Match.value(attack.effect.damage).pipe(
    Match.when({ kind: "base" }, () => null),
    Match.when({ kind: "authoredReplacement" }, (damage) => ({
      dice: critical ? damage.dice * 2 : damage.dice,
      dieSize: damage.dieSize,
    })),
    Match.exhaustive,
  );
}

type AttackDamageComponent = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
};

function attackDamageRiderDiceCount(
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "attackDamageRider" }
  >,
): number {
  return profile.diceByLevel.reduce(
    (current, tier) =>
      Number(profile.classLevel) >= tier.atLevel
        ? Math.max(current, tier.count)
        : current,
    0,
  );
}

function attackDamageRiderForProfile(
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "attackDamageRider" }
  >,
  attackerId: CombatantId,
  damageType: DamageType,
): AttackDamageRider | null {
  const dice = attackDamageRiderDiceCount(profile);
  return dice > 0
    ? {
        attackerId,
        unitId: profile.unit.id,
        label: profile.unit.name,
        damage: {
          dice,
          dieSize: profile.dieSize,
          damageType,
        },
      }
    : null;
}

function weaponAttackSupportsFinesseOrRanged(
  attack: SupportedAttackActionOption,
): attack is CharacterWeaponAttackActionOption {
  return (
    attack.kind === "weapon" &&
    (attack.weapon.usage === "ranged" ||
      (attack.weapon.properties ?? []).some(
        (property) => property.kind === "finesse",
      ))
  );
}

function targetHasAdjacentNonIncapacitatedAlly(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  return facts.some((fact) => {
    if (
      fact.kind !== "sneakAttackAllyWithin5FeetOfTarget" ||
      fact.attackerId !== attackerId ||
      fact.targetId !== targetId
    ) {
      return false;
    }
    const ally = state.combatants.get(fact.allyId);
    return (
      ally !== undefined &&
      fact.allyId !== attackerId &&
      fact.allyId !== targetId &&
      combatantsAreAllies(state, attackerId, fact.allyId) &&
      !isIncapacitated(ally.conditions)
    );
  });
}

function eligibleAttackDamageRiders(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  attackRoll: AttackRollResult,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): readonly AttackDamageRider[] {
  const attacker = state.combatants.get(attackerId);
  if (
    !isCharacterBattleCreatureState(attacker) ||
    !weaponAttackSupportsFinesseOrRanged(attack)
  ) {
    return [];
  }
  const hasRequiredRollContext =
    attackRoll.rollMode === "advantage" ||
    (targetHasAdjacentNonIncapacitatedAlly(
      state,
      attackerId,
      targetId,
      targetSpatialFacts,
    ) &&
      attackRoll.rollMode !== "disadvantage");
  if (!hasRequiredRollContext) {
    return [];
  }
  return [...attacker.origin.attackDamageRiderProfiles.values()].flatMap(
    (profile): readonly AttackDamageRider[] => {
      if (
        state.currentTurnResources.attackDamageRidersUsedThisTurn.some(
          (usage) =>
            usage.attackerId === attackerId && usage.unitId === profile.unit.id,
        )
      ) {
        return [];
      }
      const rider = attackDamageRiderForProfile(
        profile,
        attackerId,
        selectedWeaponDamage(attack.weapon).damageType,
      );
      return rider === null ? [] : [rider];
    },
  );
}

function selectedAttackDamageRiders(
  eligibleRiders: readonly AttackDamageRider[],
  selectedUnitIds: readonly UnitRecord["id"][] | undefined,
): readonly AttackDamageRider[] | null {
  if (selectedUnitIds === undefined || selectedUnitIds.length === 0) {
    return [];
  }
  if (new Set(selectedUnitIds).size !== selectedUnitIds.length) {
    return null;
  }
  const selected: AttackDamageRider[] = [];
  for (const unitId of selectedUnitIds) {
    const rider = eligibleRiders.find(
      (candidate) => candidate.unitId === unitId,
    );
    if (rider === undefined) {
      return null;
    }
    selected.push(rider);
  }
  return selected;
}

function attackDamageComponents(
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
): readonly AttackDamageComponent[] {
  const riderComponents = attackDamageRiders.map((rider) => ({
    expr: {
      dice: critical ? rider.damage.dice * 2 : rider.damage.dice,
      dieSize: rider.damage.dieSize,
    },
    damageType: rider.damage.damageType,
  }));
  const baseComponents = Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) => {
      const damage = selectedWeaponDamage(weaponAttack.weapon);
      return [
        {
          expr: critical
            ? {
                dice: damage.dice * 2,
                dieSize: damage.dieSize,
              }
            : {
                dice: damage.dice,
                dieSize: damage.dieSize,
              },
          damageType: damage.damageType,
        },
      ];
    }),
    Match.when({ kind: "unarmedStrike" }, (unarmedStrike) => {
      const expr = unarmedStrikeDamageDiceExpr(unarmedStrike, critical);
      return expr === null
        ? []
        : [{ expr, damageType: unarmedStrike.effect.damage.damageType }];
    }),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) => {
      const damage = statBlockAttackDamage(statBlockAttack);
      const base = damage.expr;
      const baseComponent = {
        expr: {
          dice: critical ? base.dice * 2 : base.dice,
          dieSize: base.dieSize,
        },
        damageType: damage.damageType,
      };
      const advantageBonus = damage.advantageBonus;
      if (
        attackRoll?.rollMode !== "advantage" ||
        advantageBonus === undefined
      ) {
        return [baseComponent];
      }

      return [
        baseComponent,
        {
          expr: {
            dice: critical
              ? advantageBonus.expr.dice * 2
              : advantageBonus.expr.dice,
            dieSize: advantageBonus.expr.dieSize,
          },
          damageType: advantageBonus.damageType,
        },
      ];
    }),
    Match.exhaustive,
  );
  return [...baseComponents, ...riderComponents];
}

function attackPotentialDamageTypes(
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  eligibleAttackDamageRiders: readonly AttackDamageRider[],
): readonly DamageType[] {
  return [
    ...new Set(
      attackDamageComponents(
        attack,
        critical,
        attackRoll,
        eligibleAttackDamageRiders,
      ).map((component) => component.damageType),
    ),
  ];
}

function attackDamageModifier(attack: SupportedAttackActionOption): number {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) =>
      Number(
        weaponAttack.damageAbilityModifier ?? weaponAttack.abilityModifier,
      ),
    ),
    Match.when(
      { kind: "unarmedStrike" },
      (unarmedStrike) =>
        (unarmedStrike.effect.damage.kind === "base"
          ? unarmedStrike.effect.damage.flat
          : 0) +
        Number(unarmedStrike.damageAbilityModifier) +
        (unarmedStrike.damageBonus ?? 0),
    ),
    Match.when(
      { kind: "statBlockAttack" },
      (statBlockAttack) =>
        statBlockAttackDamage(statBlockAttack).expr.flat ?? 0,
    ),
    Match.exhaustive,
  );
}

function attackActionBonus(attack: SupportedAttackActionOption): AttackBonus {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) =>
      attackBonus(weaponAttack.abilityModifier),
    ),
    Match.when(
      { kind: "unarmedStrike" },
      (unarmedStrike) => unarmedStrike.attackBonus,
    ),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) =>
      statBlockAttackBonus(statBlockAttack),
    ),
    Match.exhaustive,
  );
}

function weaponAttackDamageExpression(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  ongoingDamageModifier = 0,
): string {
  const damage = attackDamage(attack);
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
  );
  const modifier = signedModifier(
    attackDamageModifier(attack) + ongoingDamageModifier,
  );

  return `${components
    .map((component) => `${component.expr.dice}d${component.expr.dieSize}`)
    .join("+")}${modifier}-${damage.damageType}`;
}

function signedModifier(modifier: number): string {
  if (modifier === 0) {
    return "";
  }

  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}

function invalidResult(
  state: BattleState,
  reason: BattleInvalidReasonCode,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    reason,
    message,
    snapshot: snapshotBattle(state),
  };
}
