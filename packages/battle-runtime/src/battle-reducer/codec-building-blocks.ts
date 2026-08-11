import { ABILITIES, CREATURE_TYPES } from "@dnd/shared/game-facts";
import {
  CONDITIONS as ALL_CONDITIONS,
  AbilityModifier,
  AttackBonus,
  DamageAmount,
  DamageDieSizeSchema,
  DifficultyClass,
  MovementDeltaFeet,
  MovementFeet,
  SpellSlotLevel,
} from "@dnd/shared/types";
import {
  AbilitySchema,
  CreatureAttackRollMechanicsSchema,
  DamageTypeSchema,
  DcSourceSchema,
  DiceExprSchema,
  SizeSchema,
} from "@dnd/surface/surface/schema";
import { SKILLS as SURFACE_SKILLS } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import {
  BattleAttackProcedureExecutionRef,
  BattleObjectId,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
  BattleStatBlockProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import {
  STAT_BLOCK_ATTACK_ROLL_ADVANTAGE_PREDICATES,
  type SupportedCreatureAttackRollMechanics,
  type SupportedStaticDamageCreatureAttackRollMechanics,
} from "../battle-action-options.ts";
import { creatureAttackRollMechanicsAreSupported } from "../statblock-attack-execution-mechanics.ts";
import {
  statBlockAttackDamageSupportsStaticNotation,
  supportedStatBlockAttackDamage,
} from "../statblock-attack-damage-support.ts";
import { CharacterWeaponAttackExecutionWeaponSchema } from "../character-weapon-execution-schema.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
import {
  ELDRITCH_BLAST_BEAM_COUNTS,
  SCORCHING_RAY_RAY_COUNTS,
  SPELL_CONDITION_ABILITY_CHECK_ACTORS,
  SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS,
} from "./domain-constants.ts";

export {
  AbilityModifier,
  AbilitySchema,
  AttackBonus,
  DamageAmount,
  DamageDieSizeSchema,
  DamageTypeSchema,
  DcSourceSchema,
  DiceExprSchema,
  DifficultyClass,
  MovementDeltaFeet,
  MovementFeet,
  SizeSchema,
  SpellSlotLevel,
};

export const BATTLE_SURFACE_SKILLS = SURFACE_SKILLS;
export const BATTLE_SURFACE_ABILITIES = ABILITIES;

export const SpellDamageSchema = Schema.Struct({
  expr: DiceExprSchema,
  damageType: DamageTypeSchema,
});

export const BattleConditionSchema = Schema.Literal(...ALL_CONDITIONS);

export const BattleThunderwaveAudibleBoomSchema = Schema.Struct({
  sound: Schema.Literal("thunderous boom"),
  audibleRadiusFeet: MovementFeet,
});

export const SpellPostSaveAreaEffectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fireballObjectIgnition"),
  }),
  Schema.Struct({
    kind: Schema.Literal("shatterObjectDamage"),
  }),
  Schema.Struct({
    kind: Schema.Literal("thunderwave"),
    creaturePush: Schema.Struct({
      distanceFeet: MovementFeet,
      originDirection: Schema.Literal("away_from_caster"),
    }),
    unsecuredObjectPush: Schema.Struct({
      distanceFeet: MovementFeet,
      originDirection: Schema.Literal("away_from_caster"),
      objectLocation: Schema.Literal("entirely_within_area"),
    }),
    audibleBoom: BattleThunderwaveAudibleBoomSchema,
  }),
);

export const SpellSavingThrowRollModeRuleSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("hostileTarget"),
    mode: Schema.Literal("advantage"),
  }),
  Schema.Struct({
    kind: Schema.Literal("creatureType"),
    creatureType: Schema.Literal(...CREATURE_TYPES),
    mode: Schema.Literal("disadvantage"),
  }),
);

export const SpellFailedSavePostDamageRiderSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("nextAttackRollByTarget"),
    mode: Schema.Literal("disadvantage"),
    expiresAt: Schema.Literal("endOfTargetNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("forcedReactionMovement"),
    direction: Schema.Literal("awayFromCaster"),
    route: Schema.Literal("safest"),
    distance: Schema.Literal("asFarAsPossible"),
    cost: Schema.Literal("targetReactionIfAvailable"),
  }),
);

export const SpellPostDamageRiderSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("speedDelta"),
    deltaFeet: MovementDeltaFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("condition"),
    condition: BattleConditionSchema,
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
  Schema.Struct({
    kind: Schema.Literal("hitPointRegainPrevented"),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("invisibleBenefitDenied"),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("lightEmission"),
    emission: Schema.Struct({
      kind: Schema.Literal("dim"),
      radiusFeet: MovementFeet,
    }),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
);

const AttackDamageAbilityModifierChoiceSchema = Schema.Struct({
  procedureRefs: Schema.NonEmptyArray(BattleProcedureExecutionRef),
  unitIds: Schema.optionalWith(Schema.Never, { exact: true }),
  appliedDamageAbilityModifier: AbilityModifier,
  declinedDamageAbilityModifier: AbilityModifier,
});

export const CharacterWeaponAttackActionOptionSchema = Schema.Struct({
  kind: Schema.Literal("weapon"),
  weapon: CharacterWeaponAttackExecutionWeaponSchema,
  weaponObjectId: BattleObjectId,
  hasWeaponMastery: Schema.Boolean,
  ability: AbilitySchema,
  abilityModifier: AbilityModifier,
  attackBonus: Schema.optionalWith(AttackBonus, {
    exact: true,
  }),
  damageAbilityModifier: Schema.optionalWith(AbilityModifier, {
    exact: true,
  }),
  attackDamageAbilityModifierChoice: Schema.optionalWith(
    AttackDamageAbilityModifierChoiceSchema,
    { exact: true },
  ),
  damageBonus: Schema.optionalWith(Schema.Number, { exact: true }),
  damageTypeChoices: Schema.optionalWith(
    Schema.NonEmptyArray(DamageTypeSchema).pipe(
      Schema.filter(
        (
          choices,
        ): choices is readonly [
          typeof DamageTypeSchema.Type,
          typeof DamageTypeSchema.Type,
          ...(typeof DamageTypeSchema.Type)[],
        ] => choices.length >= 2,
        {
          /* v8 ignore next -- Only malformed authored weapon data requests this diagnostic; valid choices are parsed through the two-or-more predicate above. */
          message: () =>
            "Weapon attack damage type choices must contain at least two choices.",
        },
      ),
    ),
    {
      exact: true,
    },
  ),
  alternateAbilityChoices: Schema.optionalWith(
    Schema.NonEmptyArray(
      Schema.Struct({
        ability: AbilitySchema,
        abilityModifier: AbilityModifier,
        attackBonus: AttackBonus,
        damageAbilityModifier: AbilityModifier,
        attackDamageAbilityModifierChoice: Schema.optionalWith(
          AttackDamageAbilityModifierChoiceSchema,
          { exact: true },
        ),
      }),
    ),
    {
      exact: true,
    },
  ),
});

export const BoundCharacterWeaponAttackActionOptionSchema = Schema.extend(
  CharacterWeaponAttackActionOptionSchema,
  Schema.Struct({ procedureRef: BattleAttackProcedureExecutionRef }),
);

const SupportedCreatureAttackRollMechanicsSchema =
  CreatureAttackRollMechanicsSchema.pipe(
    Schema.filter(creatureAttackRollMechanicsAreSupported, {
      message: () => "Unsupported Stat Block attack mechanics.",
    }),
  );

const SupportedStaticDamageCreatureAttackRollMechanicsSchema =
  SupportedCreatureAttackRollMechanicsSchema.pipe(
    Schema.filter(
      (
        attack: SupportedCreatureAttackRollMechanics,
      ): attack is SupportedStaticDamageCreatureAttackRollMechanics =>
        statBlockAttackDamageSupportsStaticNotation(
          supportedStatBlockAttackDamage(attack),
        ),
      {
        /* v8 ignore next -- Only malformed authored static-damage data requests this diagnostic; valid static attacks satisfy the predicate above. */
        message: () => "Static Stat Block damage requires static damage facts.",
      },
    ),
  );

const StatBlockTraitAttackRollModeSchema = Schema.Struct({
  mode: Schema.Literal("advantage"),
  predicate: Schema.Literal(...STAT_BLOCK_ATTACK_ROLL_ADVANTAGE_PREDICATES),
});

const StatBlockAttackActionOptionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attack: SupportedCreatureAttackRollMechanicsSchema,
    damageNotation: Schema.Literal("rolled"),
    traitAttackRollModes: Schema.optionalWith(
      Schema.NonEmptyArray(StatBlockTraitAttackRollModeSchema),
      { exact: true },
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attack: SupportedStaticDamageCreatureAttackRollMechanicsSchema,
    damageNotation: Schema.Literal("static"),
    traitAttackRollModes: Schema.optionalWith(
      Schema.NonEmptyArray(StatBlockTraitAttackRollModeSchema),
      { exact: true },
    ),
  }),
);

export const SupportedAttackActionOptionSchema = Schema.Union(
  CharacterWeaponAttackActionOptionSchema,
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
          kind: Schema.Literal("mechanicalReplacement"),
          dice: Schema.Literal(1),
          dieSize: DamageDieSizeSchema,
          damageType: DamageTypeSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("procedureReplacement"),
          sourceProcedureRef: BattleProcedureExecutionRef,
          dice: Schema.Literal(1),
          dieSize: DamageDieSizeSchema,
          damageType: DamageTypeSchema,
        }),
      ),
    }),
    attackAbility: Schema.Union(AbilitySchema, Schema.Literal("spellcasting")),
    attackAbilityModifier: AbilityModifier,
    attackBonus: AttackBonus,
    damageAbilityModifier: AbilityModifier,
    damageBonus: Schema.optionalWith(Schema.Number, { exact: true }),
  }),
  StatBlockAttackActionOptionSchema,
);

export const PreparedSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("prepared"),
});

export { ClassCantripSpellAccessSchema } from "../procedure-execution/spell-invocation-codecs.ts";

export const ArmorOfShadowsSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("armorOfShadows"),
});

export const SpellEffectSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("spellEffect"),
  sourceCombatantId: CombatantId,
});

export const SpellSlotInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("spellSlot"),
  slotLevel: SpellSlotLevel,
});

export { NoSpellInvocationResourceSchema } from "../procedure-execution/spell-invocation-codecs.ts";

export const ClassFeatureFreeCastInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("classFeatureFreeCast"),
  resourcePoolRef: BattleResourcePoolExecutionRef,
});

export const ClassFeatureFreeCastExecutionResourceSchema = Schema.Struct({
  tag: Schema.Literal("classFeatureFreeCast"),
  resourcePoolRef: BattleResourcePoolExecutionRef,
});

export const SingleCreatureOrObjectSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("singleCreatureOrObject"),
});

export const SpellAttackDamageTargetingSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("singleCombatant"),
  }),
  SingleCreatureOrObjectSpellTargetingSchema,
);

const SingleCombatantSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("singleCombatant"),
});
const TargetListSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("targetList"),
  minTargets: Schema.Literal(1),
  maxTargets: Schema.Number,
});
const PointOriginSphereSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("pointOriginSphere"),
  radiusFeet: MovementFeet,
});
const PointOriginCylinderSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("pointOriginCylinder"),
  radiusFeet: MovementFeet,
  heightFeet: MovementFeet,
});
const PointOriginCubeExcludingCasterSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("pointOriginCubeExcludingCaster"),
  sideFeet: MovementFeet,
});
const PointOriginCubeSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("pointOriginCube"),
  sideFeet: MovementFeet,
});
const SelfOriginConeSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("selfOriginCone"),
  lengthFeet: MovementFeet,
});

const SaveGatedConditionAreaSpellTargetingSchema = Schema.Union(
  PointOriginSphereSpellTargetingSchema,
  PointOriginCubeExcludingCasterSpellTargetingSchema,
  PointOriginCubeSpellTargetingSchema,
  SelfOriginConeSpellTargetingSchema,
);

export const SaveGatedConditionSpellTargetingSchema = Schema.Union(
  TargetListSpellTargetingSchema,
  SaveGatedConditionAreaSpellTargetingSchema,
);

export const SaveGatedDamageSpellTargetingSchema = Schema.Union(
  SingleCombatantSpellTargetingSchema,
  SaveGatedConditionAreaSpellTargetingSchema,
  PointOriginCylinderSpellTargetingSchema,
  Schema.Struct({
    kind: Schema.Literal("selfOriginCube"),
    sideFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("selfOriginLine"),
    lengthFeet: MovementFeet,
    widthFeet: MovementFeet,
  }),
);

export const CantripSpellAttackSequenceAttackCountSchema = Schema.Literal(
  ...ELDRITCH_BLAST_BEAM_COUNTS,
);

export const PreparedSpellAttackSequenceAttackCountSchema = Schema.Literal(
  ...SCORCHING_RAY_RAY_COUNTS,
);

export const CantripSpellAttackSequenceTargetingSchema = Schema.Struct({
  kind: Schema.Literal("spellAttackSequenceCreatureOrObject"),
  countSource: Schema.Literal("characterLevel"),
  attackCount: CantripSpellAttackSequenceAttackCountSchema,
});

export const PreparedSpellAttackSequenceTargetingSchema = Schema.Struct({
  kind: Schema.Literal("spellAttackSequenceCreatureOrObject"),
  countSource: Schema.Literal("spellSlotLevel"),
  attackCount: PreparedSpellAttackSequenceAttackCountSchema,
});

export const SpellAttackDamagePayloadSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixedSpellAttackDamage"),
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("sorcerousBurstDamageTypeChoice"),
    expr: DiceExprSchema,
    damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedSorcerousBurstDamage"),
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
  }),
);

export const SpellAttackMissDamageSchema = Schema.Literal(
  "none",
  "halfInitialOnly",
);

export const SpellFailedSaveConditionExpirationSchema = Schema.Union(
  Schema.Literal("endOfCasterNextTurn", "concentration"),
  Schema.Struct({
    kind: Schema.Literal("concentration"),
    durationTicks: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("duration"),
    durationTicks: Schema.Number,
  }),
);

export const SpellConditionEscapeSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("abilityCheck"),
    ability: Schema.Literal("str"),
    skill: Schema.Literal("athletics"),
    allowedActor: Schema.Literal(...SPELL_CONDITION_ABILITY_CHECK_ACTORS),
    successEnds: Schema.Literal(...SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS),
  }),
  Schema.Struct({
    kind: Schema.Literal("targetDamagedByCasterOrAlly"),
  }),
);

export const SpellConditionRepeatSaveSchema = Schema.Struct({
  ability: AbilitySchema,
  dc: DcSourceSchema,
});

export const SpellConditionCountedRepeatSaveSchema = Schema.Struct({
  kind: Schema.Literal("counted"),
  save: SpellConditionRepeatSaveSchema,
  successThreshold: Schema.Number,
  failureThreshold: Schema.Number,
  savingThrowDisadvantageAbilities: Schema.NonEmptyArray(AbilitySchema),
});

const SpellFailedSaveFixedConditionEffectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    condition: BattleConditionSchema,
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.NullOr(SpellConditionEscapeSchema),
    turnStartDamage: Schema.NullOr(SpellDamageSchema),
    repeatSave: Schema.Null,
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    condition: BattleConditionSchema,
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.Null,
    turnStartDamage: Schema.Null,
    repeatSave: Schema.Union(
      SpellConditionRepeatSaveSchema,
      SpellConditionCountedRepeatSaveSchema,
    ),
  }),
);

const SpellFailedSaveConditionChoiceEffectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    choices: Schema.NonEmptyArray(BattleConditionSchema),
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.NullOr(SpellConditionEscapeSchema),
    turnStartDamage: Schema.NullOr(SpellDamageSchema),
    repeatSave: Schema.Null,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    choices: Schema.NonEmptyArray(BattleConditionSchema),
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.Null,
    turnStartDamage: Schema.Null,
    repeatSave: Schema.Union(
      SpellConditionRepeatSaveSchema,
      SpellConditionCountedRepeatSaveSchema,
    ),
  }),
);

export const SpellFailedSaveConditionEffectSchema = Schema.Union(
  SpellFailedSaveFixedConditionEffectSchema,
  SpellFailedSaveConditionChoiceEffectSchema,
);

export const RollModifierSpellTargetingSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("targetList"),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Number,
    requiredTargetDisposition: Schema.Literal("unrestricted", "willing"),
  }),
  Schema.Struct({
    kind: Schema.Literal("targetList"),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Literal("allLegalTargets"),
    requiredTargetDisposition: Schema.Literal("unrestricted", "willing"),
  }),
  Schema.Struct({
    kind: Schema.Literal("selfAndChosenLegalTargets"),
    minTargets: Schema.Literal(1),
  }),
);

export const RollModifierSpellSaveGateSchema = Schema.NullOr(
  Schema.Struct({
    ability: AbilitySchema,
    dc: DcSourceSchema,
  }),
);
