// Active Effect lifecycle model: expiration, early-end, effect bases, and the
// shared payload vocabulary that battle active effects are built from. This is
// pure type vocabulary with leaf dependencies only; the BattleActiveEffect union
// and its runtime live in battle-reducer.ts / battle-reducer/ and depend on these
// types one-directionally. See plans/ACTIVE_EFFECT_DEEP_MODULE.md.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
import type { ArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  AbilityModifier,
  AttackBonus,
  Condition,
  DamageDieSize,
  DifficultyClass,
  MovementDeltaFeet,
  MovementFeet,
  Round as RoundType,
  SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  Ability,
  CreatureSense,
  DamageType,
  DcSource,
  DiceExpr,
  Skill,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { StatBlockMutableResourceState } from "../battle-action-options.ts";
import type { BattleDruidWildShapeKnownForm } from "../battle-init.ts";
// Transitional back-imports: these types belong to other domains (speed kinds,
// d20 modifiers, Command, marked riders, dancing lights, condition repeat-save,
// spell attack kind) and are still defined in battle-reducer.ts. They form a
// type-only import cycle (erased at runtime, no import/no-cycle lint here) that
// dissolves as those domains are extracted. See plans/ACTIVE_EFFECT_DEEP_MODULE.md.
import type {
  BattleCommandOption,
  BattleD20RollModifierDelta,
  BattleD20RollModifierKind,
  BattleDancingLight,
  BattleDancingLightList,
  BattleOngoingSpellEffectRef,
  BattleSpecialSpeedKind,
  MagicWeaponEnhancementBonus,
  MarkedDamageRiderAbilityCheckBehavior,
  SpellAttackKind,
  SpellConditionRepeatSave,
} from "../battle-reducer.ts";
import {
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
  SPELL_CONDITION_ABILITY_CHECK_ACTORS,
  SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS,
  type MirrorImageDuplicateCount,
  type SelfTransformationNonNaturalWeaponModeKind,
} from "../battle-reducer/domain-constants.ts";
import type {
  BattleAreaId,
  BattleLineDirectionId,
  BattleObjectId,
  BattleSpellEffectOccurrenceId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import type { BattleSpellEffectLevel } from "../battle-reducer/spells-effective-level.ts";

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
    }
  | {
      readonly kind: "untilDispelled";
    };
export type TurnAnchoredBattleActiveEffectExpiration = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "startOfTurn" } | { readonly kind: "endOfTurn" }
>;
export type BattleSpellEffectEarlyEnd =
  | { readonly kind: "targetDonsArmor" }
  | { readonly kind: "concentrationBroken" };
export type BattleTargetDonsArmorEarlyEnd = Extract<
  BattleSpellEffectEarlyEnd,
  { readonly kind: "targetDonsArmor" }
>;
export type BattleConcentrationBrokenEarlyEnd = Extract<
  BattleSpellEffectEarlyEnd,
  { readonly kind: "concentrationBroken" }
>;
export type BattleSpellEffectBase = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
};
export type SpellCreatureSizeChangeDirection = "increase" | "decrease";
export type SpellCreatureSizeChangeActiveEffect = BattleSpellEffectBase & {
  readonly kind: "spellCreatureSizeChange";
  readonly direction: SpellCreatureSizeChangeDirection;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  > & { readonly durationTicks: ElapsedTimeTicks };
};
export type SpellLevitatedCreatureActiveEffect = BattleSpellEffectBase & {
  readonly kind: "spellLevitatedCreature";
  readonly altitudeFeet: MovementFeet;
  readonly maxAltitudeChangeFeet: MovementFeet;
  readonly rangeFeet: MovementFeet;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  > & { readonly durationTicks: ElapsedTimeTicks };
};
export type BattleUnitFeatureEffectBase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly sourceCombatantId: CombatantId;
};
export type SpellConditionAbilityCheckSuccessEnd =
  (typeof SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS)[number];
export type SpellConditionAbilityCheckActor =
  (typeof SPELL_CONDITION_ABILITY_CHECK_ACTORS)[number];
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
      readonly allowedActor: SpellConditionAbilityCheckActor;
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
export type MarkedDamageRiderRetargetTiming = "sameTurn" | "laterTurn";
export type BattleTurnAnchor = {
  readonly actorId: CombatantId;
  readonly round: RoundType;
};
export type MarkedDamageRiderTransferState =
  | {
      readonly kind: "awaitingTargetDrop";
      readonly retargetTiming: MarkedDamageRiderRetargetTiming;
    }
  | {
      readonly kind: "available";
      readonly retargetTiming: "sameTurn";
    }
  | {
      readonly kind: "availableAfterTurn";
      readonly retargetTiming: "laterTurn";
      readonly droppedOnTurn: BattleTurnAnchor;
    };
export type SelfTransformationNaturalWeaponFacts = {
  readonly damage: {
    readonly dice: 1;
    readonly dieSize: DamageDieSize;
    readonly damageTypeChoices: readonly [DamageType, ...DamageType[]];
  };
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly attackBonus: AttackBonus;
};
export type SelfTransformationModeEffectPayload = {
  readonly naturalWeaponFacts: SelfTransformationNaturalWeaponFacts;
} & (
  | {
      readonly mode: SelfTransformationNonNaturalWeaponModeKind;
    }
  | {
      readonly mode: "naturalWeapons";
      readonly naturalWeaponDamageType: DamageType;
    }
);
export type SpellCreatedHeldObjectState =
  | { readonly kind: "held" }
  | { readonly kind: "notHeld" };
export type SpellCreatedHeldObjectActiveEffect = BattleSpellEffectBase & {
  readonly kind: "spellCreatedHeldObject";
  readonly objectState: SpellCreatedHeldObjectState;
  readonly light: {
    readonly brightRadiusFeet: MovementFeet;
    readonly dimAdditionalFeet: MovementFeet;
  };
  readonly attack: {
    readonly damage: {
      readonly expr: DiceExpr;
      readonly damageType: DamageType;
    };
    readonly attackKind: Extract<SpellAttackKind, "melee_spell_attack">;
    readonly attackBonus: AttackBonus;
  };
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  > & { readonly durationTicks: ElapsedTimeTicks };
};
export type SpellObjectContactDamageActiveEffect = BattleSpellEffectBase & {
  readonly kind: "spellObjectContactDamage";
  readonly effectId: BattleSpellEffectOccurrenceId;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
  readonly objectId: BattleObjectId;
  readonly rangeFeet: MovementFeet;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly startedOn: BattleTurnAnchor;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  > & { readonly durationTicks: ElapsedTimeTicks };
};
export type SpiritualWeaponActiveEffect = BattleSpellEffectBase & {
  readonly kind: "spiritualWeapon";
  readonly forcePositionId: BattleTablePositionId;
  readonly forceReachFeet: MovementFeet;
  readonly repeatMoveMaxFeet: MovementFeet;
  readonly startedOn: BattleTurnAnchor;
  readonly damage: {
    readonly kind: "fixedSpellAttackDamage";
    readonly expr: DiceExpr;
    readonly damageType: Extract<DamageType, "force">;
  };
  readonly attackKind: Extract<SpellAttackKind, "melee_spell_attack">;
  readonly attackBonus: AttackBonus;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "concentration" }
  > & { readonly durationTicks: ElapsedTimeTicks };
};
export type ObjectContactPenaltyActiveEffect = BattleSpellEffectBase & {
  readonly kind: "selfAttackRollAndAbilityCheckRollMode";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly mode: Extract<AttackRollMode, "disadvantage">;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "startOfTurn" }
  >;
};
export type BattleActiveEffect =
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "bardicInspirationDie";
      readonly dieSize: DamageDieSize;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "druidWildShapeForm";
      readonly formStatBlockId: BattleDruidWildShapeKnownForm["id"];
      readonly equipmentDisposition: "merged";
      readonly resources: StatBlockMutableResourceState;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "speedDelta";
      readonly deltaFeet: MovementDeltaFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "specialSpeedGrant";
      readonly speedKind: BattleSpecialSpeedKind;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "selfTransformation";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    } & SelfTransformationModeEffectPayload)
  | SpellLevitatedCreatureActiveEffect
  | (BattleSpellEffectBase & {
      readonly kind: "spellArmorClassBonus";
      readonly bonus: number;
      readonly negatedSpellIds: readonly SpellRecord["id"][];
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellArmorClassFloor";
      readonly floor: ArmorClass;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "hitPointMaximumIncrease";
      readonly amount: number;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellBaseArmorClass";
      readonly base: number;
      readonly ability: "dex";
    } & (
        | {
            readonly earlyEnds: readonly [BattleTargetDonsArmorEarlyEnd];
            readonly expiresAt: Extract<
              BattleActiveEffectExpiration,
              { readonly kind: "duration" }
            >;
          }
        | {
            readonly earlyEnds: readonly [BattleConcentrationBrokenEarlyEnd];
            readonly expiresAt: Extract<
              BattleActiveEffectExpiration,
              { readonly kind: "concentration" }
            >;
          }
      ))
  | (BattleSpellEffectBase & {
      readonly kind: "spellCondition";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly escape: SpellConditionEscape | null;
      readonly turnStartDamage: SpellTurnStartDamage | null;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "targetActionEndedSpellCondition";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellConditionRepeatSave";
      readonly condition: ProtectionFromEvilAndGoodPreventedCondition;
      readonly conditionHadNonSpellSource: boolean;
      readonly save: SpellConditionRepeatSave;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellConditionEndTurnSave";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly save: SpellConditionRepeatSave;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "abilityD20TestRollModeEndTurnSave";
      readonly ability: Ability;
      readonly mode: AttackRollMode;
      readonly save: SpellConditionRepeatSave;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "possession";
      readonly save: SpellConditionRepeatSave;
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
      readonly kind: "hideousLaughter";
      readonly conditionHadNonSpellProneSource: boolean;
      readonly conditionHadNonSpellIncapacitatedSource: boolean;
      readonly save: {
        readonly ability: Extract<Ability, "wis">;
        readonly dc: DcSource;
      };
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "greaseGroundHazard";
      readonly areaId: BattleAreaId;
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
      readonly kind: "webRestraintHazard";
      readonly areaId: BattleAreaId;
      readonly sideFeet: MovementFeet;
      readonly save: {
        readonly ability: Extract<Ability, "dex">;
        readonly dc: DcSource;
      };
      readonly entrySavedThisTurn: readonly CombatantId[];
      readonly startTurnSavedThisTurn: readonly CombatantId[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "flamingSphere";
      readonly areaId: BattleAreaId;
      readonly save: {
        readonly ability: Extract<Ability, "dex">;
        readonly dc: DcSource;
      };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "fire">;
      };
      readonly ramMaxMoveFeet: MovementFeet;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | SpiritualWeaponActiveEffect
  | (BattleSpellEffectBase & {
      readonly kind: "spikeGrowthHazard";
      readonly areaId: BattleAreaId;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "piercing">;
      };
      readonly damagePerFeet: MovementFeet;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "moonbeam";
      readonly areaId: BattleAreaId;
      readonly save: {
        readonly ability: Extract<Ability, "con">;
        readonly dc: DcSource;
      };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "radiant">;
      };
      readonly repositionMaxMoveFeet: MovementFeet;
      readonly savedThisTurn: readonly CombatantId[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "gustOfWindLine";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
      readonly castTurn: BattleTurnAnchor;
      readonly line: {
        readonly lengthFeet: MovementFeet;
        readonly widthFeet: MovementFeet;
      };
      readonly save: {
        readonly ability: Extract<Ability, "str">;
        readonly dc: DcSource;
      };
      readonly pushDistanceFeet: MovementFeet;
      readonly movementCost: {
        readonly multiplier: 2;
        readonly appliesTo: "towardSource";
      };
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "fogCloudObscurement";
      readonly areaId: BattleAreaId;
      readonly radiusFeet: MovementFeet;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "magicalDarknessPointOrigin";
      readonly areaId: BattleAreaId;
      readonly radiusFeet: MovementFeet;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "antimagicFieldOngoingSpellSuppression";
      readonly areaId: BattleAreaId;
      readonly radiusFeet: MovementFeet;
      readonly suppressedOngoingSpellEffects: readonly BattleOngoingSpellEffectRef[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
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
  | ((BattleSpellEffectBase | BattleUnitFeatureEffectBase) & {
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
      readonly kind: "blurred";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "mirrorImageDuplicates";
      readonly remainingDuplicates: MirrorImageDuplicateCount;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "hitPointRegainPrevented";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "invisibleBenefitDenied";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "seeInvisibleAndEthereal";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellConcentrationDuration";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "d20RollModifier";
      readonly on: readonly BattleD20RollModifierKind[];
      readonly delta: BattleD20RollModifierDelta;
      readonly skill: Skill | null;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "abilityCheckRollMode";
      readonly mode: AttackRollMode;
      readonly ability: Ability;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | SpellCreatureSizeChangeActiveEffect
  | (BattleSpellEffectBase & {
      readonly kind: "thaumaturgyBoomingVoice";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
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
      readonly kind: "conditionSavingThrowRollMode";
      readonly condition: Condition;
      readonly mode: "advantage";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "damageResistance";
      readonly damageType: DamageType;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "faerieFireOutline";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "shiningSmiteIllumination";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "conditionImmunity";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
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
      readonly kind: "sourceDamageRollPenalty";
      readonly amount: {
        readonly dice: 1;
        readonly dieSize: 8;
      };
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "wardingBond";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
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
      readonly kind: "spellWeaponAttackOverride";
      readonly weaponItemId: string;
      readonly spellcastingAbilityModifier: AbilityModifier;
      readonly attackBonus: AttackBonus;
      readonly damage: {
        readonly expr: DiceExpr;
      };
      readonly damageTypeChoices: readonly [DamageType, DamageType];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellMagicWeaponEnhancement";
      readonly holderCombatantId: CombatantId;
      readonly weaponItemId: string;
      readonly bonus: MagicWeaponEnhancementBonus;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellMarkedDamageRider";
      readonly targetCombatantId: CombatantId;
      readonly transfer: MarkedDamageRiderTransferState;
      readonly abilityCheckBehavior: MarkedDamageRiderAbilityCheckBehavior;
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
      readonly kind: "dragonsBreath";
      readonly damageType: DamageType;
      readonly originalSlotLevel: SpellSlotLevel;
      readonly spellSaveDc: DifficultyClass;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "featherFallMitigation";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "sanctuaryWard";
      readonly save: {
        readonly ability: Extract<Ability, "wis">;
        readonly dc: DcSource;
      };
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
    })
  | SpellCreatedHeldObjectActiveEffect
  | SpellObjectContactDamageActiveEffect
  | ObjectContactPenaltyActiveEffect
  | (BattleSpellEffectBase & {
      readonly kind: "dancingLights";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    } & (
        | {
            readonly form: "separateLights";
            readonly lights: BattleDancingLightList;
          }
        | {
            readonly form: "combinedMediumForm";
            readonly light: BattleDancingLight;
          }
      ))
  | (BattleSpellEffectBase & {
      readonly kind: "findFamiliarSharedSenses";
      readonly familiarId: CombatantId;
      readonly canSeeThroughFamiliar: true;
      readonly canHearThroughFamiliar: true;
      readonly familiarSenses: readonly CreatureSense[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "startOfTurn" }
      >;
    });
