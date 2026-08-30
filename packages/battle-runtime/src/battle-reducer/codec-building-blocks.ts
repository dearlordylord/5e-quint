import {
  ABILITIES,
  AmmunitionKindSchema,
  CREATURE_TYPES,
} from "@dnd/shared/game-facts";
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
import {
  CharacterWeaponAttackExecutionWeaponFactsSchema,
  CharacterWeaponAttackExecutionWeaponSchema,
} from "../character-weapon-execution-schema.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
import {
  CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS,
  SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS,
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

export const BattleConditionSchema = Schema.Literals(ALL_CONDITIONS);

export const BattleAudibleBoomSchema = Schema.Struct({
  sound: Schema.Literal("thunderous boom"),
  audibleRadiusFeet: MovementFeet,
});

export const DimIlluminationEmissionSchema = Schema.Struct({
  kind: Schema.Literal("dim"),
  radiusFeet: MovementFeet,
});

export const IlluminationEmissionSchema = Schema.Union([
  DimIlluminationEmissionSchema,
  Schema.Struct({
    kind: Schema.Literal("bright"),
    radiusFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("brightAndDim"),
    brightRadiusFeet: MovementFeet,
    dimAdditionalFeet: MovementFeet,
  }),
]);

export const EmitterOpaqueCoverInteractionSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("blocksEmission") }),
  Schema.Struct({ kind: Schema.Literal("doesNotBlockEmission") }),
]);

export const DimIlluminationEmissionFactsSchema = Schema.Struct({
  emission: DimIlluminationEmissionSchema,
  opaqueCoverInteraction: EmitterOpaqueCoverInteractionSchema,
});

export const BrightAndDimIlluminationEmissionFactsSchema = Schema.Struct({
  emission: Schema.Struct({
    kind: Schema.Literal("brightAndDim"),
    brightRadiusFeet: MovementFeet,
    dimAdditionalFeet: MovementFeet,
  }),
  opaqueCoverInteraction: EmitterOpaqueCoverInteractionSchema,
});

export const BrightIlluminationEmissionFactsSchema = Schema.Struct({
  emission: Schema.Struct({
    kind: Schema.Literal("bright"),
    radiusFeet: MovementFeet,
  }),
  opaqueCoverInteraction: EmitterOpaqueCoverInteractionSchema,
});

export const BrightRadiusIlluminationEmissionFactsSchema = Schema.Union([
  BrightIlluminationEmissionFactsSchema,
  BrightAndDimIlluminationEmissionFactsSchema,
]);

export const SpellPostSaveAreaEffectSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("areaObjectIgnition"),
  }),
  Schema.Struct({
    kind: Schema.Literal("areaObjectDamage"),
  }),
  Schema.Struct({
    kind: Schema.Literal("selfOriginCubePush"),
    creaturePush: Schema.Struct({
      distanceFeet: MovementFeet,
      originDirection: Schema.Literal("away_from_caster"),
    }),
    unsecuredObjectPush: Schema.Struct({
      distanceFeet: MovementFeet,
      originDirection: Schema.Literal("away_from_caster"),
      objectLocation: Schema.Literal("entirely_within_area"),
    }),
    audibleBoom: BattleAudibleBoomSchema,
  }),
]);

export const SpellSavingThrowRollModeRuleSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("hostileTarget"),
    mode: Schema.Literal("advantage"),
  }),
  Schema.Struct({
    kind: Schema.Literal("creatureType"),
    creatureType: Schema.Literals(CREATURE_TYPES),
    mode: Schema.Literal("disadvantage"),
  }),
]);

export const SpellFailedSavePostDamageRiderSchema = Schema.Union([
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
]);

export const SpellPostDamageRiderSchema = Schema.Union([
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
]);

const AttackDamageAbilityModifierChoiceFields = {
  procedureRefs: Schema.NonEmptyArray(BattleProcedureExecutionRef),
  appliedDamageAbilityModifier: AbilityModifier,
  declinedDamageAbilityModifier: AbilityModifier,
} as const;

const AttackDamageAbilityModifierChoiceSchema = Schema.Struct({
  ...AttackDamageAbilityModifierChoiceFields,
  unitIds: Schema.optionalKey(Schema.Never),
});

const MechanicalAttackDamageAbilityModifierChoiceSchema = Schema.Struct(
  AttackDamageAbilityModifierChoiceFields,
);

export const CharacterWeaponAttackActionOptionSchema = Schema.Struct({
  kind: Schema.Literal("weapon"),
  weapon: CharacterWeaponAttackExecutionWeaponSchema,
  weaponObjectId: BattleObjectId,
  hasWeaponMastery: Schema.Boolean,
  ability: AbilitySchema,
  abilityModifier: AbilityModifier,
  attackBonus: Schema.optionalKey(AttackBonus),
  damageAbilityModifier: Schema.optionalKey(AbilityModifier),
  attackDamageAbilityModifierChoice: Schema.optionalKey(
    AttackDamageAbilityModifierChoiceSchema,
  ),
  damageBonus: Schema.optionalKey(Schema.Number),
  damageTypeChoices: Schema.optionalKey(
    Schema.NonEmptyArray(DamageTypeSchema).pipe(
      Schema.refine(
        (
          choices,
        ): choices is readonly [
          typeof DamageTypeSchema.Type,
          typeof DamageTypeSchema.Type,
          ...(typeof DamageTypeSchema.Type)[],
        ] => choices.length >= 2,
        {
          /* v8 ignore next -- @preserve -- Only malformed authored weapon data requests this diagnostic; valid choices are parsed through the two-or-more predicate above. */
          message:
            "Weapon attack damage type choices must contain at least two choices.",
        },
      ),
    ),
  ),
  alternateAbilityChoices: Schema.optionalKey(
    Schema.NonEmptyArray(
      Schema.Struct({
        ability: AbilitySchema,
        abilityModifier: AbilityModifier,
        attackBonus: AttackBonus,
        damageAbilityModifier: AbilityModifier,
        attackDamageAbilityModifierChoice: Schema.optionalKey(
          AttackDamageAbilityModifierChoiceSchema,
        ),
      }),
    ),
  ),
});

export const BoundCharacterWeaponAttackActionOptionSchema =
  CharacterWeaponAttackActionOptionSchema.pipe(
    Schema.fieldsAssign({ procedureRef: BattleAttackProcedureExecutionRef }),
  );

const SupportedCreatureAttackRollMechanicsSchema =
  CreatureAttackRollMechanicsSchema.pipe(
    Schema.refine(creatureAttackRollMechanicsAreSupported, {
      message: "Unsupported Stat Block attack mechanics.",
    }),
  );

const SupportedStaticDamageCreatureAttackRollMechanicsSchema =
  SupportedCreatureAttackRollMechanicsSchema.pipe(
    Schema.refine(
      (
        attack: SupportedCreatureAttackRollMechanics,
      ): attack is SupportedStaticDamageCreatureAttackRollMechanics =>
        statBlockAttackDamageSupportsStaticNotation(
          supportedStatBlockAttackDamage(attack),
        ),
      {
        /* v8 ignore next -- @preserve -- Only malformed authored static-damage data requests this diagnostic; valid static attacks satisfy the predicate above. */
        message: "Static Stat Block damage requires static damage facts.",
      },
    ),
  );

const StatBlockTraitAttackRollModeSchema = Schema.Struct({
  mode: Schema.Literal("advantage"),
  predicate: Schema.Literals(STAT_BLOCK_ATTACK_ROLL_ADVANTAGE_PREDICATES),
});

const StatBlockAttackActionOptionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attack: SupportedCreatureAttackRollMechanicsSchema,
    damageNotation: Schema.Literal("rolled"),
    traitAttackRollModes: Schema.optionalKey(
      Schema.NonEmptyArray(StatBlockTraitAttackRollModeSchema),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attack: SupportedStaticDamageCreatureAttackRollMechanicsSchema,
    damageNotation: Schema.Literal("static"),
    traitAttackRollModes: Schema.optionalKey(
      Schema.NonEmptyArray(StatBlockTraitAttackRollModeSchema),
    ),
  }),
]);

export const SupportedAttackActionOptionSchema = Schema.Union([
  CharacterWeaponAttackActionOptionSchema,
  Schema.Struct({
    kind: Schema.Literal("unarmedStrike"),
    effect: Schema.Struct({
      kind: Schema.Literal("damage"),
      damage: Schema.Union([
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
      ]),
    }),
    attackAbility: Schema.Union([
      AbilitySchema,
      Schema.Literal("spellcasting"),
    ]),
    attackAbilityModifier: AbilityModifier,
    attackBonus: AttackBonus,
    damageAbilityModifier: AbilityModifier,
    damageBonus: Schema.optionalKey(Schema.Number),
  }),
  StatBlockAttackActionOptionSchema,
]);

const MechanicalStatBlockDamageAmountFields = {
  kind: Schema.Literal("fixed"),
  expr: DiceExprSchema,
} as const;

const MechanicalStatBlockDamageAmountSchema = Schema.Struct({
  ...MechanicalStatBlockDamageAmountFields,
  static: Schema.optionalKey(Schema.Number),
});

const MechanicalStaticStatBlockDamageAmountSchema = Schema.Struct({
  ...MechanicalStatBlockDamageAmountFields,
  static: Schema.Number,
});

const MechanicalStatBlockBaseDamageFields = {
  kind: Schema.Literal("damage"),
  damageType: DamageTypeSchema,
  timing: Schema.optionalKey(Schema.Literal("end_of_next_turn")),
} as const;

const MechanicalStatBlockConditionalBonusDamageFields = {
  kind: Schema.Literal("conditional_bonus_damage"),
  when: Schema.Struct({
    kind: Schema.Literal("attack_roll_had_advantage"),
  }),
  damageType: DamageTypeSchema,
} as const;

const MechanicalStatBlockTargetSizeConditionFields = {
  kind: Schema.Literal("apply_condition_if_target_size_at_most"),
  condition: Schema.Literal("prone"),
  maxCreatureSize: SizeSchema,
} as const;

const MechanicalStatBlockAttackEffectSchema = Schema.Union([
  Schema.Struct({
    ...MechanicalStatBlockBaseDamageFields,
    amount: MechanicalStatBlockDamageAmountSchema,
  }),
  Schema.Struct({
    ...MechanicalStatBlockConditionalBonusDamageFields,
    amount: MechanicalStatBlockDamageAmountSchema,
  }),
  Schema.Struct(MechanicalStatBlockTargetSizeConditionFields),
]);

const MechanicalStaticStatBlockAttackEffectSchema = Schema.Union([
  Schema.Struct({
    ...MechanicalStatBlockBaseDamageFields,
    amount: MechanicalStaticStatBlockDamageAmountSchema,
  }),
  Schema.Struct({
    ...MechanicalStatBlockConditionalBonusDamageFields,
    amount: MechanicalStaticStatBlockDamageAmountSchema,
  }),
  Schema.Struct(MechanicalStatBlockTargetSizeConditionFields),
]);

const MechanicalStatBlockAttackRollMechanicsFields = {
  attackAbility: Schema.Union([AbilitySchema, Schema.Literal("spellcasting")]),
  attackBonus: Schema.Struct({
    kind: Schema.Literal("literal"),
    value: Schema.Number,
  }),
} as const;

const MechanicalStatBlockAttackRollMechanicsSchema = Schema.Union([
  Schema.Struct({
    ...MechanicalStatBlockAttackRollMechanicsFields,
    attackType: Schema.Literal("melee"),
    reachFeet: Schema.Number,
    onHit: Schema.NonEmptyArray(MechanicalStatBlockAttackEffectSchema),
  }),
  Schema.Struct({
    ...MechanicalStatBlockAttackRollMechanicsFields,
    attackType: Schema.Literal("ranged"),
    rangeFeet: Schema.Struct({
      normal: Schema.Number,
      long: Schema.Number,
    }),
    ammunition: Schema.optionalKey(AmmunitionKindSchema),
    onHit: Schema.NonEmptyArray(MechanicalStatBlockAttackEffectSchema),
  }),
]);

const MechanicalStaticStatBlockAttackRollMechanicsSchema = Schema.Union([
  Schema.Struct({
    ...MechanicalStatBlockAttackRollMechanicsFields,
    attackType: Schema.Literal("melee"),
    reachFeet: Schema.Number,
    onHit: Schema.NonEmptyArray(MechanicalStaticStatBlockAttackEffectSchema),
  }),
  Schema.Struct({
    ...MechanicalStatBlockAttackRollMechanicsFields,
    attackType: Schema.Literal("ranged"),
    rangeFeet: Schema.Struct({
      normal: Schema.Number,
      long: Schema.Number,
    }),
    ammunition: Schema.optionalKey(AmmunitionKindSchema),
    onHit: Schema.NonEmptyArray(MechanicalStaticStatBlockAttackEffectSchema),
  }),
]);

const MechanicalStatBlockAttackActionOptionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attack: MechanicalStatBlockAttackRollMechanicsSchema,
    damageNotation: Schema.Literal("rolled"),
    traitAttackRollModes: Schema.optionalKey(
      Schema.NonEmptyArray(StatBlockTraitAttackRollModeSchema),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    procedureRef: BattleStatBlockProcedureExecutionRef,
    attack: MechanicalStaticStatBlockAttackRollMechanicsSchema,
    damageNotation: Schema.Literal("static"),
    traitAttackRollModes: Schema.optionalKey(
      Schema.NonEmptyArray(StatBlockTraitAttackRollModeSchema),
    ),
  }),
]);

const MechanicalCharacterWeaponAttackActionOptionSchema = Schema.Struct({
  kind: Schema.Literal("weapon"),
  weapon: CharacterWeaponAttackExecutionWeaponFactsSchema,
  weaponObjectId: BattleObjectId,
  hasWeaponMastery: Schema.Boolean,
  ability: AbilitySchema,
  abilityModifier: AbilityModifier,
  attackBonus: Schema.optionalKey(AttackBonus),
  damageAbilityModifier: Schema.optionalKey(AbilityModifier),
  attackDamageAbilityModifierChoice: Schema.optionalKey(
    MechanicalAttackDamageAbilityModifierChoiceSchema,
  ),
  damageBonus: Schema.optionalKey(Schema.Number),
  damageTypeChoices: Schema.optionalKey(
    Schema.TupleWithRest(Schema.Tuple([DamageTypeSchema, DamageTypeSchema]), [
      DamageTypeSchema,
    ]),
  ),
  alternateAbilityChoices: Schema.optionalKey(
    Schema.NonEmptyArray(
      Schema.Struct({
        ability: AbilitySchema,
        abilityModifier: AbilityModifier,
        attackBonus: AttackBonus,
        damageAbilityModifier: AbilityModifier,
        attackDamageAbilityModifierChoice: Schema.optionalKey(
          MechanicalAttackDamageAbilityModifierChoiceSchema,
        ),
      }),
    ),
  ),
});

export const MechanicalSupportedAttackActionOptionSchema = Schema.Union([
  MechanicalCharacterWeaponAttackActionOptionSchema,
  Schema.Struct({
    kind: Schema.Literal("unarmedStrike"),
    effect: Schema.Struct({
      kind: Schema.Literal("damage"),
      damage: Schema.Union([
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
      ]),
    }),
    attackAbility: Schema.Union([
      AbilitySchema,
      Schema.Literal("spellcasting"),
    ]),
    attackAbilityModifier: AbilityModifier,
    attackBonus: AttackBonus,
    damageAbilityModifier: AbilityModifier,
    damageBonus: Schema.optionalKey(Schema.Number),
  }),
  MechanicalStatBlockAttackActionOptionSchema,
]).annotate({
  identifier: "MechanicalSupportedAttackActionOption",
  parseOptions: { onExcessProperty: "error" },
});

export type MechanicalSupportedAttackActionOption =
  typeof MechanicalSupportedAttackActionOptionSchema.Type;

export const PreparedSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("prepared"),
});

export {
  CantripSpellAccessSchema,
  ClassCantripSpellAccessSchema,
} from "../procedure-execution/spell-invocation-codecs.ts";

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

export const SpellAccessFreeCastInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("spellAccessFreeCast"),
  castLevel: SpellSlotLevel,
  resourcePoolRef: BattleResourcePoolExecutionRef,
});

export const SpellAccessFreeCastExecutionResourceSchema = Schema.Struct({
  tag: Schema.Literal("spellAccessFreeCast"),
  castLevel: SpellSlotLevel,
  resourcePoolRef: BattleResourcePoolExecutionRef,
});

export const LeveledSpellInvocationResourceSchema = Schema.Union([
  SpellSlotInvocationResourceSchema,
  SpellAccessFreeCastInvocationResourceSchema,
]);

export const SingleCreatureOrObjectSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("singleCreatureOrObject"),
});

export const SpellAttackDamageTargetingSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("singleCombatant"),
  }),
  SingleCreatureOrObjectSpellTargetingSchema,
]);

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

const SaveGatedConditionAreaSpellTargetingSchema = Schema.Union([
  PointOriginSphereSpellTargetingSchema,
  PointOriginCubeExcludingCasterSpellTargetingSchema,
  PointOriginCubeSpellTargetingSchema,
  SelfOriginConeSpellTargetingSchema,
]);

export const SaveGatedConditionSpellTargetingSchema = Schema.Union([
  TargetListSpellTargetingSchema,
  SaveGatedConditionAreaSpellTargetingSchema,
]);

export const SaveGatedDamageSpellTargetingSchema = Schema.Union([
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
]);

export const CantripSpellAttackSequenceAttackCountSchema = Schema.Literals(
  CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS,
);

export const PreparedSpellAttackSequenceAttackCountSchema = Schema.Literals(
  SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS,
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

export const SpellAttackDamagePayloadSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("fixedSpellAttackDamage"),
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellAttackDamageTypeChoice"),
    expr: DiceExprSchema,
    damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isGreaterThanOrEqualTo(0)),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedSpellAttackDamage"),
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isGreaterThanOrEqualTo(0)),
    ),
  }),
]);

export const SpellAttackMissDamageSchema = Schema.Literals([
  "none",
  "halfInitialOnly",
]);

export const SpellFailedSaveConditionExpirationSchema = Schema.Union([
  Schema.Literals(["endOfCasterNextTurn", "concentration"]),
  Schema.Struct({
    kind: Schema.Literal("concentration"),
    durationTicks: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("duration"),
    durationTicks: Schema.Number,
  }),
]);

export const SpellConditionEscapeSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("abilityCheck"),
    ability: Schema.Literal("str"),
    skill: Schema.Literal("athletics"),
    allowedActor: Schema.Literals(SPELL_CONDITION_ABILITY_CHECK_ACTORS),
    successEnds: Schema.Literals(SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS),
  }),
  Schema.Struct({
    kind: Schema.Literal("targetDamagedByCasterOrAlly"),
  }),
]);

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

const SpellFailedSaveFixedConditionEffectSchema = Schema.Union([
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
    repeatSave: Schema.Union([
      SpellConditionRepeatSaveSchema,
      SpellConditionCountedRepeatSaveSchema,
    ]),
  }),
]);

const SpellFailedSaveConditionChoiceEffectSchema = Schema.Union([
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
    repeatSave: Schema.Union([
      SpellConditionRepeatSaveSchema,
      SpellConditionCountedRepeatSaveSchema,
    ]),
  }),
]);

export const SpellFailedSaveConditionEffectSchema = Schema.Union([
  SpellFailedSaveFixedConditionEffectSchema,
  SpellFailedSaveConditionChoiceEffectSchema,
]);

export const RollModifierSpellTargetingSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("targetList"),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Number,
    requiredTargetDisposition: Schema.Literals(["unrestricted", "willing"]),
  }),
  Schema.Struct({
    kind: Schema.Literal("targetList"),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Literal("allLegalTargets"),
    requiredTargetDisposition: Schema.Literals(["unrestricted", "willing"]),
  }),
  Schema.Struct({
    kind: Schema.Literal("selfAndChosenLegalTargets"),
    minTargets: Schema.Literal(1),
  }),
]);

export const RollModifierSpellSaveGateSchema = Schema.NullOr(
  Schema.Struct({
    ability: AbilitySchema,
    dc: DcSourceSchema,
  }),
);
