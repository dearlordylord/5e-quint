// Active Effect lifecycle model: expiration, early-end, effect bases, and the
// shared payload vocabulary that battle active effects are built from. This is
// pure type vocabulary with leaf dependencies only; the BattleActiveEffect union
// and its runtime live in battle-reducer.ts / battle-reducer/ and depend on these
// types one-directionally. See plans/ACTIVE_EFFECT_DEEP_MODULE.md.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-durable-occurrence
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-explosive-rune-release
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_STORED_SPELL_RELEASE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
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
  ActionRestriction,
  CreatureSense,
  DamageType,
  DcSource,
  DiceExpr,
  Size,
  Skill,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { StatBlockMutableResourceState } from "../battle-action-options.ts";
import type { BattleDruidWildShapeKnownForm } from "../battle-init.ts";
import type {
  ActiveWildShapeEquipmentDisposition,
  WildShapeFormLimbObjectHandlingWitness,
} from "../battle-reducer/wild-shape-equipment.ts";
// Transitional back-imports: these types belong to other domains (speed kinds,
// d20 modifiers, Command, marked riders, dancing lights, condition repeat-save,
// spell attack kind) and are still defined in battle-reducer.ts. They form a
// type-only import cycle (erased at runtime, no import/no-cycle lint here) that
// dissolves as those domains are extracted. See plans/ACTIVE_EFFECT_DEEP_MODULE.md.
import type {
  BattleCommandOption,
  BattleAntimagicFieldAuraMembership,
  BattleAntimagicFieldOngoingSpellEffectRef,
  BattleD20RollModifierDelta,
  BattleD20RollModifierKind,
  BattleDancingLight,
  BattleDancingLightList,
  PreparedSpellAccess,
  ReadiedSpellInvocation,
  SupportedSpellInvocation,
  BattleSpecialSpeedKind,
  MagicWeaponEnhancementBonus,
  MarkedDamageRiderAbilityCheckBehavior,
  SpellAttackKind,
  SpellConditionRepeatSave,
  SpellSlotInvocationResource,
  SpellTargeting,
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
export type AreaSpellEffectHeightenedRepeatSaveRider = null | {
  readonly kind: "heightenedSpellTargetDisadvantage";
  readonly targetId: CombatantId;
};
export type CombatantOwnedSpellEffectHeightenedRepeatSaveRider = null | {
  readonly kind: "heightenedSpellTargetDisadvantage";
};
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
export type BattleShapeShiftReplacementFormFacts = {
  readonly kind: "runtimeCreatureForm";
  readonly creatureSize: Size;
};
export type SpellShapeShiftedFormActiveEffect = BattleSpellEffectBase & {
  readonly kind: "spellShapeShiftedForm";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly replacementForm: BattleShapeShiftReplacementFormFacts;
  readonly expiresAt: BattleActiveEffectExpiration;
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
export type SpellTurnEndDamage = {
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
export type SpiritualWeaponRepeatTargeting =
  | { readonly kind: "unrestricted" }
  | {
      readonly kind: "fixedCombatant";
      readonly combatantId: CombatantId;
    };
type SpellConcentrationOrStoredDurationExpiration =
  | (Extract<
      BattleActiveEffectExpiration,
      { readonly kind: "concentration" }
    > & { readonly durationTicks: ElapsedTimeTicks })
  | Extract<BattleActiveEffectExpiration, { readonly kind: "duration" }>;
export type SpiritualWeaponActiveEffect = BattleSpellEffectBase & {
  readonly kind: "spiritualWeapon";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
  readonly forcePositionId: BattleTablePositionId;
  readonly forceReachFeet: MovementFeet;
  readonly repeatMoveMaxFeet: MovementFeet;
  readonly repeatTargeting: SpiritualWeaponRepeatTargeting;
  readonly startedOn: BattleTurnAnchor;
  readonly damage: {
    readonly kind: "fixedSpellAttackDamage";
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
  readonly attackKind: Extract<SpellAttackKind, "melee_spell_attack">;
  readonly attackBonus: AttackBonus;
  readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
};
export type GlyphDurableOccurrenceAnchor =
  | {
      readonly kind: "surface";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "closeableObject";
      readonly objectId: BattleObjectId;
    };
type GlyphStoredConcentrationSaveGatedConditionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
};
type GlyphStoredNonConcentrationSpellRecord = SpellRecord & {
  readonly mechanics: SpellRecord["mechanics"] & {
    readonly duration: Exclude<
      SpellRecord["mechanics"]["duration"],
      { readonly kind: "concentration" }
    >;
  };
};
type GlyphStoredReadiedSpellInvocation = ReadiedSpellInvocation & {
  readonly spell: GlyphStoredNonConcentrationSpellRecord;
};
type GlyphStoredSingleCreatureTargeting =
  | Extract<SpellTargeting, { readonly kind: "singleCombatant" }>
  | Extract<SpellTargeting, { readonly kind: "singleCreatureOrObject" }>
  | (Extract<SpellTargeting, { readonly kind: "targetList" }> & {
      readonly maxTargets: 1;
    });
type GlyphStoredConcentrationSaveGatedDamageInvocation = Extract<
  ReadiedSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
  readonly targeting: GlyphStoredSingleCreatureTargeting;
};
type GlyphStoredGreaseGroundHazardInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "greaseGroundHazard" }
> & {
  readonly spell: GlyphStoredNonConcentrationSpellRecord;
};
type GlyphStoredConcentrationHarmfulObjectInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spiritualWeaponAttackProxy" }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
};
export const GLYPH_STORED_AREA_ONGOING_PROCEDURES = [
  "fogCloudObscurement",
  "magicalDarknessPointOrigin",
  "flamingSphere",
  "spikeGrowthMovementHazard",
  "moonbeam",
  "webRestraintHazard",
  "gustOfWindLine",
] as const satisfies ReadonlyArray<SupportedSpellInvocation["procedure"]>;
export type GlyphStoredAreaOngoingProcedure =
  (typeof GLYPH_STORED_AREA_ONGOING_PROCEDURES)[number];
type GlyphStoredAreaOngoingInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: GlyphStoredAreaOngoingProcedure }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
};
export type GlyphStoredSpellInvocationCandidate = Extract<
  | ReadiedSpellInvocation
  | Extract<
      SupportedSpellInvocation,
      {
        readonly procedure:
          | "greaseGroundHazard"
          | "saveGatedCondition"
          | "spiritualWeaponAttackProxy"
          | GlyphStoredAreaOngoingProcedure;
      }
    >,
  {
    readonly access: PreparedSpellAccess;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargeting;
  }
>;
export type GlyphStoredSpellInvocation = Extract<
  | GlyphStoredReadiedSpellInvocation
  | GlyphStoredGreaseGroundHazardInvocation
  | GlyphStoredConcentrationSaveGatedDamageInvocation
  | GlyphStoredConcentrationSaveGatedConditionInvocation
  | GlyphStoredConcentrationHarmfulObjectInvocation
  | GlyphStoredAreaOngoingInvocation,
  {
    readonly access: PreparedSpellAccess;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargeting;
  }
>;
export type GlyphDurableOccurrenceRelease =
  | {
      readonly kind: "explosiveRune";
      readonly damageType: DamageType;
    }
  | {
      readonly kind: "spellGlyph";
      readonly storedInvocation: GlyphStoredSpellInvocation;
    };
export type GlyphDurableOccurrenceActiveEffect = BattleSpellEffectBase & {
  readonly kind: "glyphDurableOccurrence";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
  readonly sourceSpellLevel: BattleSpellEffectLevel;
  readonly release: GlyphDurableOccurrenceRelease;
  readonly anchor: GlyphDurableOccurrenceAnchor;
  readonly coveredAreaId: BattleAreaId;
  readonly castLocationId: BattleTablePositionId;
  readonly maxCoveredDiameterFeet: MovementFeet;
  readonly notice: {
    readonly ability: Extract<Ability, "wis">;
    readonly skill: Extract<Skill, "perception">;
    readonly dc: Extract<DcSource, { readonly kind: "caster_spell_save_dc" }>;
    readonly owner: "table_witnessed_glyph_notice";
  };
  readonly trigger: {
    readonly occurrence: "table_witnessed_trigger_occurrence";
    readonly activationFilter: "creature_type";
    readonly nonTriggerExclusion: "password_or_other_condition";
    readonly onTriggered: "spell_ends";
  };
  readonly movementInvalidation: {
    readonly movedSubject: "inscribed_surface_or_object";
    readonly distanceFrom: "cast_location";
    readonly moreThanFeet: MovementFeet;
    readonly outcome: "glyph_breaks_spell_ends_without_triggering";
  };
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "untilDispelled" }
  >;
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
      readonly formLimbs: WildShapeFormLimbObjectHandlingWitness;
      readonly equipmentDisposition: readonly ActiveWildShapeEquipmentDisposition[];
      readonly resources: StatBlockMutableResourceState;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "paladinSacredWeapon";
      readonly weaponItemId: string;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "selfSpeedZero";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "endOfTurn" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "speedDelta";
      readonly deltaFeet: MovementDeltaFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "speedRatio";
      readonly numerator: number;
      readonly denominator: number;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellSpeedZero";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "endOfTurn" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "specialSpeedGrant";
      readonly expiresAt: BattleActiveEffectExpiration;
    } & (
        | {
            readonly speedKind: Exclude<BattleSpecialSpeedKind, "fly">;
            readonly speed: { readonly kind: "equalToSpeed" };
            readonly hover: false;
          }
        | {
            readonly speedKind: Extract<BattleSpecialSpeedKind, "fly">;
            readonly speed: {
              readonly kind: "fixed";
              readonly speedFeet: MovementFeet;
            };
            readonly hover: true;
          }
      ))
  | (BattleSpellEffectBase & {
      readonly kind: "selfTransformation";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    } & SelfTransformationModeEffectPayload)
  | SpellShapeShiftedFormActiveEffect
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
      readonly heightenedSpellTargetDisadvantage: CombatantOwnedSpellEffectHeightenedRepeatSaveRider;
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
      readonly repeatSaveRollMode: Extract<
        AttackRollMode,
        "disadvantage"
      > | null;
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
      readonly kind: "hypnoticPatternControl";
      readonly conditionHadNonSpellCharmedSource: boolean;
      readonly conditionHadNonSpellIncapacitatedSource: boolean;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "greaseGroundHazard";
      readonly areaId: BattleAreaId;
      readonly heightenedSpellTargetDisadvantage: AreaSpellEffectHeightenedRepeatSaveRider;
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
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
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
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spikeGrowthHazard";
      readonly areaId: BattleAreaId;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: Extract<DamageType, "piercing">;
      };
      readonly damagePerFeet: MovementFeet;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
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
      readonly shapeShiftSuppressed: readonly CombatantId[];
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "gustOfWindLine";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
      readonly heightenedSpellTargetDisadvantage: AreaSpellEffectHeightenedRepeatSaveRider;
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
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "fogCloudObscurement";
      readonly areaId: BattleAreaId;
      readonly radiusFeet: MovementFeet;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "magicalDarknessPointOrigin";
      readonly areaId: BattleAreaId;
      readonly radiusFeet: MovementFeet;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "antimagicFieldOngoingSpellSuppression";
      readonly areaId: BattleAreaId;
      readonly auraMembership: BattleAntimagicFieldAuraMembership;
      readonly radiusFeet: MovementFeet;
      readonly suppressedOngoingSpellEffects: readonly BattleAntimagicFieldOngoingSpellEffectRef[];
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
      readonly kind: "spellTurnEndDamage";
      readonly damage: SpellTurnEndDamage;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "endOfTurn" }
      >;
    })
  | ((BattleSpellEffectBase | BattleUnitFeatureEffectBase) & {
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
      readonly expiresAt:
        | (Extract<
            BattleActiveEffectExpiration,
            { readonly kind: "concentration" }
          > & { readonly durationTicks: ElapsedTimeTicks })
        | Extract<BattleActiveEffectExpiration, { readonly kind: "duration" }>;
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
      readonly kind: "savingThrowRollMode";
      readonly ability: Ability;
      readonly mode: "advantage";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellGrantedActionResource";
      readonly restriction: ActionRestriction;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "spellEndTargetState";
      readonly condition: "incapacitated";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
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
  | SpiritualWeaponActiveEffect
  | GlyphDurableOccurrenceActiveEffect
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
  | {
      readonly kind: "findFamiliarSharedSenses";
      readonly source: {
        readonly kind: "companionSharedSenses";
        readonly ownerId: CombatantId;
        readonly companionId: CombatantId;
      };
      readonly sourceCombatantId: CombatantId;
      readonly familiarId: CombatantId;
      readonly canSeeThroughFamiliar: true;
      readonly canHearThroughFamiliar: true;
      readonly familiarSenses: readonly CreatureSense[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "startOfTurn" }
      >;
    };
