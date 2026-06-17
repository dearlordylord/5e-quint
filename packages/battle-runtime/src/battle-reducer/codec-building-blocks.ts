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
  DamageTypeSchema,
  DcSourceSchema,
  SizeSchema,
} from "@dnd/surface/surface/schema";
import { SKILLS as SURFACE_SKILLS } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import { CombatantId } from "../identity.ts";
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
  DifficultyClass,
  MovementDeltaFeet,
  MovementFeet,
  SizeSchema,
  SpellSlotLevel,
};

export const BATTLE_SURFACE_SKILLS = SURFACE_SKILLS;
export const BATTLE_SURFACE_ABILITIES = ABILITIES;

export const BattleRuntimeObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});

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
  unitIds: Schema.NonEmptyArray(Schema.String),
  appliedDamageAbilityModifier: AbilityModifier,
  declinedDamageAbilityModifier: AbilityModifier,
});

export const CharacterWeaponAttackActionOptionSchema = Schema.Struct({
  kind: Schema.Literal("weapon"),
  weapon: BattleRuntimeObjectSchema,
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
      Schema.filter((choices) => choices.length >= 2, {
        message: () =>
          "Weapon attack damage type choices must contain at least two choices.",
      }),
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
          kind: Schema.Literal("authoredReplacement"),
          sourceUnitId: Schema.String,
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
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    attack: BattleRuntimeObjectSchema,
  }),
);

export const PreparedSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("prepared"),
});

export const ClassCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("classCantrip"),
});

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

export const NoSpellInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("none"),
});

export const ClassFeatureFreeCastInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("classFeatureFreeCast"),
  resourceUnitId: Schema.String,
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
    expr: BattleRuntimeObjectSchema,
    damageType: DamageTypeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("sorcerousBurstDamageTypeChoice"),
    expr: BattleRuntimeObjectSchema,
    damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedSorcerousBurstDamage"),
    expr: BattleRuntimeObjectSchema,
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

const SpellFailedSaveFixedConditionEffectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    condition: Schema.Literal(...ALL_CONDITIONS),
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.NullOr(SpellConditionEscapeSchema),
    turnStartDamage: Schema.NullOr(BattleRuntimeObjectSchema),
    repeatSave: Schema.Null,
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    condition: Schema.Literal(...ALL_CONDITIONS),
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.Null,
    turnStartDamage: Schema.Null,
    repeatSave: SpellConditionRepeatSaveSchema,
  }),
);

const SpellFailedSaveConditionChoiceEffectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    choices: Schema.NonEmptyArray(Schema.Literal(...ALL_CONDITIONS)),
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.NullOr(SpellConditionEscapeSchema),
    turnStartDamage: Schema.NullOr(BattleRuntimeObjectSchema),
    repeatSave: Schema.Null,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    choices: Schema.NonEmptyArray(Schema.Literal(...ALL_CONDITIONS)),
    expiresAt: SpellFailedSaveConditionExpirationSchema,
    escape: Schema.Null,
    turnStartDamage: Schema.Null,
    repeatSave: SpellConditionRepeatSaveSchema,
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
  }),
  Schema.Struct({
    kind: Schema.Literal("targetList"),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Literal("allLegalTargets"),
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

export const RollModifierSpellInvocationBaseSchemaFields = {
  access: Schema.Union(PreparedSpellAccessSchema, ClassCantripSpellAccessSchema),
  resource: Schema.Union(
    SpellSlotInvocationResourceSchema,
    NoSpellInvocationResourceSchema,
  ),
  procedure: Schema.Literal("rollModifier"),
  spell: BattleRuntimeObjectSchema,
  actionCost: Schema.Literal("magicAction"),
  targeting: RollModifierSpellTargetingSchema,
  effect: BattleRuntimeObjectSchema,
  rangeFeet: MovementFeet,
  saveGate: RollModifierSpellSaveGateSchema,
} as const;

export const SupportedHealingSpellInvocationSchema = Schema.Struct({
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
