// Active Effect lifecycle model: expiration, early-end, effect bases, and the
// shared payload vocabulary that battle active effects are built from. This is
// pure type vocabulary with leaf dependencies only; the BattleActiveEffect union
// and its runtime depend on these types one-directionally.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-durable-occurrence
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-explosive-rune-release
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_STORED_SPELL_RELEASE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
import type { ArmorClass } from "@dnd/shared-algebras/armor-class-values";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  AbilityModifier,
  AttackBonus,
  Condition,
  DamageDieSize,
  MovementDeltaFeet,
  MovementFeet,
  Round as RoundType,
} from "@dnd/shared/types";
import type { GlyphStoredSpellRelease } from "../procedure-execution/glyph-stored-spell.ts";
import type {
  Ability,
  ActionRestriction,
  CreatureSense,
  DamageType,
  DcSource,
  DiceExpr,
  Size,
  Skill,
} from "@dnd/surface/surface/types";
import type {
  ActiveWildShapeEquipmentDisposition,
  WildShapeFormLimbObjectHandlingWitness,
} from "../procedure-execution/wild-shape-equipment.ts";
// Shared authored-free execution vocabulary used by active-effect payloads.
import type {
  BattleMagicSuppressionEmanationMembership,
  BattleMagicSuppressionOngoingSpellEffectRef,
  BattleCompelledBehaviorOption,
  BattleD20RollModifierDelta,
  BattleMovableLight,
  BattleMovableLightList,
  BattleSpecialSpeedKind,
  SpellAttackKind,
  SpellConditionRepeatSave,
} from "./execution-vocabulary.ts";
import type {
  HUNTERS_MARK_FINDING_SKILLS,
  BattleD20RollModifierKind,
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
  SPELL_CONDITION_ABILITY_CHECK_ACTORS,
  SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS,
  DuplicateHitInterceptionDuplicateCount,
  SelfTransformationNonNaturalWeaponModeKind,
} from "../battle-reducer/domain-constants.ts";
import type {
  BattleEffectExecutionRef,
  BattleAreaId,
  BattleLineDirectionId,
  BattleObjectId,
  BattleSpellEffectOccurrenceId,
  BattleStatBlockExecutionScopeRef,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import type { BattleSpellEffectLevel } from "../procedure-execution/spell-effect-level.ts";
import type { SourcedSpellWeaponAttackOverrideTemplate as SpellWeaponAttackOverrideEffect } from "../procedure-execution/weapon-attack-override.ts";
import type { BattleActiveEffectExpiration } from "./expiration.ts";

export type {
  BattleActiveEffectExpiration,
  TurnAnchoredBattleActiveEffectExpiration,
} from "./expiration.ts";
import type { BattleActiveEffectSource } from "./source.ts";
import type { BrutalStrikeHamstringEffect } from "../procedure-execution/brutal-strike.ts";

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
export type BattleEffectOccurrenceIdentity = {
  readonly effectRef: BattleEffectExecutionRef;
};
/** Mechanical effect facts before Battle admission binds occurrence identity. */
export type BattleEffectOccurrenceTemplate<E> = E extends unknown
  ? Omit<E, keyof BattleEffectOccurrenceIdentity> & {
      readonly [Key in keyof BattleEffectOccurrenceIdentity]?: never;
    }
  : never;
export type BattleSpellEffectBase = BattleActiveEffectSource;
export type BattleSourceTurnActiveEffectExpiration = {
  readonly kind: "startOfSourceTurn";
};
export type MarkedDamageRiderFindingAdvantage = {
  readonly kind: "findingAdvantage";
  readonly ability: "wis";
  readonly skills: typeof HUNTERS_MARK_FINDING_SKILLS;
};
export type MarkedDamageRiderAbilityCheckBehavior =
  | { readonly kind: "none" }
  | { readonly kind: "abilityDisadvantage"; readonly ability: Ability }
  | MarkedDamageRiderFindingAdvantage;
export type BattleReplayAddressableEffect = BattleEffectOccurrenceIdentity;
/** Mechanical spell facts before Battle admission binds occurrence identity. */
export type BattleSpellActiveEffectTemplate<E extends BattleSpellEffectBase> =
  E extends BattleSpellEffectBase
    ? BattleEffectOccurrenceTemplate<Omit<E, "sourceProcedureRef">>
    : never;
/** Source-bound effect facts before Battle admission binds occurrence identity. */
export type BattleSourcedActiveEffectTemplate<
  E extends BattleActiveEffect & BattleActiveEffectSource,
> = E extends BattleActiveEffect ? BattleEffectOccurrenceTemplate<E> : never;
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
  readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
};
export type ControlledVerticalSuspensionActiveEffect = BattleSpellEffectBase &
  BattleReplayAddressableEffect & {
    readonly kind: "controlledVerticalSuspension";
    readonly altitudeFeet: MovementFeet;
    readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
  };
export type BattleUnitFeatureEffectBase = BattleActiveEffectSource;
export type SpellConditionAbilityCheckSuccessEnd =
  (typeof SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS)[number];
export type SpellConditionAbilityCheckActor =
  (typeof SPELL_CONDITION_ABILITY_CHECK_ACTORS)[number];
export type CreatureTypeProtectionPreventedCondition =
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
export type SpellCreatedHeldObjectActiveEffect = BattleSpellEffectBase &
  BattleReplayAddressableEffect & {
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
export type SpellObjectContactDamageActiveEffect = BattleSpellEffectBase &
  BattleReplayAddressableEffect & {
    readonly kind: "spellObjectContactDamage";
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
export type SpatialMeleeSpellAttackProxyRepeatTargeting =
  | { readonly kind: "unrestricted" }
  | {
      readonly kind: "fixedCombatant";
      readonly combatantId: CombatantId;
    };
export type SpellConcentrationOrStoredDurationExpiration =
  | (Extract<
      BattleActiveEffectExpiration,
      { readonly kind: "concentration" }
    > & { readonly durationTicks: ElapsedTimeTicks })
  | Extract<BattleActiveEffectExpiration, { readonly kind: "duration" }>;
export type SpatialMeleeSpellAttackProxyActiveEffect = BattleSpellEffectBase &
  BattleReplayAddressableEffect & {
    readonly kind: "spatialMeleeSpellAttackProxy";
    readonly forcePositionId: BattleTablePositionId;
    readonly startedOn: BattleTurnAnchor;
    readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
  };
/* v8 ignore start -- @preserve -- This canonical value exists only to derive SpellTurnStartDamageAndSaveSource; production code consumes the derived type and has no runtime array consumer. */
export const SPELL_TURN_START_DAMAGE_AND_SAVE_SOURCES = [
  "afterHitTimedDamageAndSave",
  "turnBoundaryEffectLifecycle",
] as const;
/* v8 ignore stop -- @preserve */
export type SpellTurnStartDamageAndSaveSource =
  (typeof SPELL_TURN_START_DAMAGE_AND_SAVE_SOURCES)[number];
export type GlyphDurableOccurrenceAnchor =
  | {
      readonly kind: "surface";
      readonly areaId: BattleAreaId;
    }
  | {
      readonly kind: "closeableObject";
      readonly objectId: BattleObjectId;
    };
export type GlyphDurableOccurrenceRelease =
  | {
      readonly kind: "explosiveRune";
      readonly damageType: DamageType;
    }
  | GlyphStoredSpellRelease;
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
  readonly sourceEffectRef: BattleEffectExecutionRef;
  readonly mode: Extract<AttackRollMode, "disadvantage">;
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "startOfTurn" }
  >;
};
export type BattleActiveEffect = (
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
      // Execution-scope reference to the admitted Wild Shape form. The reducer
      // resolves the form's mechanical facts through this scope ref, never by
      // authored Stat Block identity.
      readonly formScopeRef: BattleStatBlockExecutionScopeRef;
      readonly formLimbs: WildShapeFormLimbObjectHandlingWitness;
      readonly equipmentDisposition: readonly ActiveWildShapeEquipmentDisposition[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "paladinSacredWeapon";
      readonly weaponItemId: BattleObjectId;
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
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "unitFeatureSpeedDelta";
      readonly deltaFeet: MovementDeltaFeet;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "brutalStrikeHamstring";
      readonly effect: BrutalStrikeHamstringEffect;
      readonly expiresAt: BattleSourceTurnActiveEffectExpiration;
    })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "speedHalved";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "startOfTurn" }
      >;
    })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
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
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "selfTransformation";
        readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
      } & SelfTransformationModeEffectPayload)
  | SpellShapeShiftedFormActiveEffect
  | ControlledVerticalSuspensionActiveEffect
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "spellArmorClassBonus";
        readonly bonus: number;
        readonly negatesRepeatedDamageAllocation: boolean;
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
      readonly base: ArmorClass;
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
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "spellCondition";
        readonly condition: Condition;
        readonly conditionHadNonSpellSource: boolean;
        readonly escape: SpellConditionEscape | null;
        readonly turnStartDamage: SpellTurnStartDamage | null;
        readonly expiresAt: BattleActiveEffectExpiration;
      })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "unitFeatureCondition";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly earlyEnd: null | { readonly kind: "targetTakesAnyDamage" };
      readonly turnRestriction: null | {
        readonly kind: "moveActionOrBonusAction";
      };
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleUnitFeatureEffectBase & {
      readonly kind: "unitFeatureConditionEndTurnSave";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly save: SpellConditionRepeatSave;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "targetActionEndedSpellCondition";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "spellConditionRepeatSave";
        readonly condition: CreatureTypeProtectionPreventedCondition;
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
      readonly kind: "spellConditionCountedEndTurnSave";
      readonly condition: Condition;
      readonly conditionHadNonSpellSource: boolean;
      readonly save: SpellConditionRepeatSave;
      readonly successes: number;
      readonly failures: number;
      readonly successThreshold: number;
      readonly failureThreshold: number;
      readonly savingThrowDisadvantageAbility: Ability;
      readonly lockedIn: boolean;
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
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "possession";
        readonly save: SpellConditionRepeatSave;
        readonly expiresAt: BattleActiveEffectExpiration;
      })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "stagedSaveConditionPendingRepeat";
        readonly conditionHadNonSpellSource: boolean;
        readonly repeatAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "endOfTurn" }
        >;
        readonly expiresAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "concentration" }
        >;
      })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "stagedSaveConditionApplied";
        readonly conditionHadNonSpellSource: boolean;
        readonly expiresAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "concentration" }
        >;
      })
  | (BattleSpellEffectBase & {
      readonly kind: "saveGatedConditionWithRepeat";
      readonly conditionHadNonSpellProneSource: boolean;
      readonly conditionHadNonSpellIncapacitatedSource: boolean;
      readonly repeatSaveRollMode: Extract<
        AttackRollMode,
        "disadvantage"
      > | null;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "saveGatedAreaControl";
      readonly conditionHadNonSpellCharmedSource: boolean;
      readonly conditionHadNonSpellIncapacitatedSource: boolean;
      readonly expiresAt:
        | (Extract<
            BattleActiveEffectExpiration,
            { readonly kind: "concentration" }
          > & { readonly durationTicks: ElapsedTimeTicks })
        | Extract<BattleActiveEffectExpiration, { readonly kind: "duration" }>;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "saveGatedTurnConstraintBundle";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase & {
      readonly kind: "persistentAreaSaveCondition";
      readonly areaId: BattleAreaId;
      readonly heightenedSpellTargetDisadvantage: AreaSpellEffectHeightenedRepeatSaveRider;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "persistentAreaSaveConditionEscape";
      readonly areaId: BattleAreaId;
      readonly entrySavedThisTurn: readonly CombatantId[];
      readonly startTurnSavedThisTurn: readonly CombatantId[];
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "persistentAreaSaveComposite";
      readonly areaId: BattleAreaId;
      readonly savedThisTurn: readonly CombatantId[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & { readonly durationTicks: ElapsedTimeTicks };
    })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "persistentAreaSaveDamage";
        readonly lifecycle: "stationary";
        readonly appearanceOccurrence: BattleTurnAnchor;
        readonly areaId: BattleAreaId;
        readonly savedThisTurn: readonly CombatantId[];
        readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
      })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "persistentAreaSaveDamage";
        readonly lifecycle: "sourceTurnTranslation";
        readonly appearanceOccurrence: BattleTurnAnchor;
        readonly areaId: BattleAreaId;
        readonly savedThisTurn: readonly CombatantId[];
        readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
      })
  | (BattleSpellEffectBase & {
      readonly kind: "persistentAreaSaveDamage";
      readonly lifecycle: "collisionReposition";
      readonly areaId: BattleAreaId;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "areaMovementDistanceDamage";
      readonly areaId: BattleAreaId;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "persistentAreaSaveDamage";
      readonly lifecycle: "directedReposition";
      readonly areaId: BattleAreaId;
      readonly savedThisTurn: readonly CombatantId[];
      readonly shapeShiftSuppressed: readonly CombatantId[];
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "directionalPersistentArea";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
      readonly heightenedSpellTargetDisadvantage: AreaSpellEffectHeightenedRepeatSaveRider;
      readonly castTurn: BattleTurnAnchor;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "persistentAreaTrait";
      readonly areaId: BattleAreaId;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "magicalDarknessPointOrigin";
      readonly areaId: BattleAreaId;
      readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "magicSuppressionEmanation";
      readonly areaId: BattleAreaId;
      readonly auraMembership: BattleMagicSuppressionEmanationMembership;
      readonly suppressedOngoingSpellEffects: readonly BattleMagicSuppressionOngoingSpellEffectRef[];
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "compelledNextTurnBehavior";
        readonly option: BattleCompelledBehaviorOption;
        readonly expiresAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "endOfTurn" }
        >;
      })
  | (BattleSpellEffectBase & {
      readonly kind: "spellTurnStartDamageAndSave";
      readonly source: SpellTurnStartDamageAndSaveSource;
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
  | ((BattleSpellEffectBase | BattleUnitFeatureEffectBase) & {
      readonly kind: "nextAttackRollAgainstSelf";
      readonly mode: AttackRollMode;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "perceptionGatedAttackRollDefense";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "duplicateHitInterception";
      readonly remainingDuplicates: DuplicateHitInterceptionDuplicateCount;
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
      readonly kind: "temporaryAbilityCheckRollMode";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "creatureTypeProtection";
      readonly attackRollMode: "disadvantage";
      readonly protectedAgainstCreatureTypes: readonly CreatureType[];
      readonly preventedConditions: readonly CreatureTypeProtectionPreventedCondition[];
      readonly preventsPossession: boolean;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "conditionSavingThrowRollMode";
      readonly condition: Condition;
      readonly mode: "advantage";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "savingThrowRollMode";
        readonly ability: Ability;
        readonly mode: "advantage";
        readonly expiresAt: BattleActiveEffectExpiration;
      })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "spellGrantedActionResource";
        readonly restriction: ActionRestriction;
        readonly expiresAt: BattleActiveEffectExpiration;
      })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "spellEndTargetState";
        readonly condition: "incapacitated";
        readonly expiresAt: SpellConcentrationOrStoredDurationExpiration;
      })
  | (BattleSpellEffectBase & {
      readonly kind: "damageResistance";
      readonly damageType: DamageType;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "saveGatedTargetProjection";
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "afterHitDamageAndIllumination";
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
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "linkedDefenseResistanceDamageShare";
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
  | Omit<SpellWeaponAttackOverrideEffect, "effectRef">
  | (BattleSpellEffectBase & {
      readonly kind: "weaponAttackDamageEnhancement";
      readonly holderCombatantId: CombatantId;
      readonly weaponItemId: BattleObjectId;
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
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
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "spellDashBonusAction";
        readonly expiresAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "concentration" }
        >;
      })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "fixedCostMovementReplacement";
        readonly usedThisTurn: boolean;
        readonly expiresAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "duration" }
        >;
      })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "grantedAreaSaveDamageAction";
        readonly damageType: DamageType;
        readonly expiresAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "concentration" }
        > & { readonly durationTicks: ElapsedTimeTicks };
      })
  | (BattleSpellEffectBase & {
      readonly kind: "fallingCreatureMitigationReaction";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "targetingSaveInterdiction";
      readonly expiresAt: Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "duration" }
      >;
    })
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "heldLight";
        readonly brightRadiusFeet: MovementFeet;
        readonly dimAdditionalFeet: MovementFeet;
        readonly expiresAt: BattleActiveEffectExpiration;
      })
  | SpellCreatedHeldObjectActiveEffect
  | SpellObjectContactDamageActiveEffect
  | SpatialMeleeSpellAttackProxyActiveEffect
  | GlyphDurableOccurrenceActiveEffect
  | ObjectContactPenaltyActiveEffect
  | (BattleSpellEffectBase &
      BattleReplayAddressableEffect & {
        readonly kind: "movableLightManifestation";
        readonly expiresAt: Extract<
          BattleActiveEffectExpiration,
          { readonly kind: "concentration" }
        > & { readonly durationTicks: ElapsedTimeTicks };
      } & (
        | {
            readonly form: "separateLights";
            readonly lights: BattleMovableLightList;
          }
        | {
            readonly form: "combinedMediumForm";
            readonly light: BattleMovableLight;
          }
      ))
  | (BattleReplayAddressableEffect & {
      readonly kind: "spawnedCompanionSharedSenses";
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
    })
) &
  BattleEffectOccurrenceIdentity;

/** Canonical discriminants for durable active-effect occurrence metadata. */
export const BATTLE_ACTIVE_EFFECT_KINDS = [
  "abilityCheckRollMode",
  "abilityD20TestRollModeEndTurnSave",
  "magicSuppressionEmanation",
  "bardicInspirationDie",
  "perceptionGatedAttackRollDefense",
  "brutalStrikeHamstring",
  "persistentAreaSaveDamage",
  "compelledNextTurnBehavior",
  "conditionImmunity",
  "conditionSavingThrowRollMode",
  "creatureTypeProtection",
  "d20RollModifier",
  "damageResistance",
  "movableLightManifestation",
  "grantedAreaSaveDamageAction",
  "druidWildShapeForm",
  "saveGatedTargetProjection",
  "fallingCreatureMitigationReaction",
  "spawnedCompanionSharedSenses",
  "persistentAreaTrait",
  "glyphDurableOccurrence",
  "persistentAreaSaveCondition",
  "directionalPersistentArea",
  "heldLight",
  "saveGatedConditionWithRepeat",
  "hitPointMaximumIncrease",
  "hitPointRegainPrevented",
  "saveGatedAreaControl",
  "invisibleBenefitDenied",
  "fixedCostMovementReplacement",
  "magicalDarknessPointOrigin",
  "duplicateHitInterception",
  "nextAttackRollAgainstSelf",
  "nextAttackRollBySelf",
  "opportunityAttackDenied",
  "paladinSacredWeapon",
  "possession",
  "targetingSaveInterdiction",
  "savingThrowRollMode",
  "seeInvisibleAndEthereal",
  "selfAttackRollAndAbilityCheckRollMode",
  "selfSpeedZero",
  "selfTransformation",
  "afterHitDamageAndIllumination",
  "stagedSaveConditionPendingRepeat",
  "stagedSaveConditionApplied",
  "persistentAreaSaveComposite",
  "saveGatedTurnConstraintBundle",
  "sourceDamageRollPenalty",
  "specialSpeedGrant",
  "speedDelta",
  "speedHalved",
  "speedRatio",
  "spellArmorClassBonus",
  "spellArmorClassFloor",
  "spellBaseArmorClass",
  "spellConcentrationDuration",
  "spellCondition",
  "spellConditionCountedEndTurnSave",
  "spellConditionEndTurnSave",
  "spellConditionRepeatSave",
  "spellCreatedHeldObject",
  "spellCreatureSizeChange",
  "spellDamageReduction",
  "spellDashBonusAction",
  "spellEndTargetState",
  "spellGrantedActionResource",
  "controlledVerticalSuspension",
  "weaponAttackDamageEnhancement",
  "spellMarkedDamageRider",
  "spellObjectContactDamage",
  "spellShapeShiftedForm",
  "spellSpeedZero",
  "spellTurnEndDamage",
  "spellTurnStartDamageAndSave",
  "spellWeaponAttackOverride",
  "spellWeaponDamageRider",
  "areaMovementDistanceDamage",
  "spatialMeleeSpellAttackProxy",
  "targetActionEndedSpellCondition",
  "temporaryAbilityCheckRollMode",
  "turnStartTemporaryHitPoints",
  "unitFeatureCondition",
  "unitFeatureConditionEndTurnSave",
  "unitFeatureSpeedDelta",
  "linkedDefenseResistanceDamageShare",
  "persistentAreaSaveConditionEscape",
] as const satisfies readonly BattleActiveEffect["kind"][];

type MissingBattleActiveEffectKind = Exclude<
  BattleActiveEffect["kind"],
  (typeof BATTLE_ACTIVE_EFFECT_KINDS)[number]
>;
const _battleActiveEffectKindsAreExhaustive: MissingBattleActiveEffectKind extends never
  ? true
  : never = true;
void _battleActiveEffectKindsAreExhaustive;

export type PersistentArmorSpellActiveEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind: "spellBaseArmorClass";
    readonly earlyEnds: readonly [BattleTargetDonsArmorEarlyEnd];
    readonly expiresAt: { readonly kind: "duration" };
  }
>;

export type SpellMarkedDamageRider = Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>;

export type DirectConditionSpellActiveEffectTemplate = Omit<
  BattleSpellActiveEffectTemplate<
    Extract<
      BattleActiveEffect,
      { readonly kind: "targetActionEndedSpellCondition" }
    >
  >,
  "conditionHadNonSpellSource"
>;
