import { Schema } from "effect";
import * as AST from "effect/SchemaAST";
import {
  ABILITIES,
  AmmunitionKindSchema,
  CLASS_NAMES as SHARED_CLASS_NAMES,
  CREATURE_TYPES,
  STANDARD_ACTION_KINDS,
  SURFACE_CONDITIONS,
  SURFACE_SKILLS,
  type ClassName,
} from "@dnd/shared/game-facts";
import { DAMAGE_TYPES } from "@dnd/shared/types";

import { exactOptional } from "./schema-helpers.ts";

export const SURFACE_SCHEMA_ROLE_ANNOTATION =
  "dnd.surface.schema-role" as const;

export const SURFACE_IDENTITY_KINDS = [
  "catalog-reference",
  "displayName",
  "id",
  "label",
  "name",
  "reference",
] as const;

export const SURFACE_PROTOCOL_KINDS = [
  "choiceKey",
  "holeId",
  "limitGroup",
  "optionId",
] as const;

export const SURFACE_PROSE_EVIDENCE_POLICIES = ["exact", "summary"] as const;

export const SURFACE_PROJECTION_KINDS = [
  "derived-label",
  "derived-reference",
] as const;

export const SURFACE_UNIT_REFERENCE_RELATIONS = [
  "excluded-armor-reference",
  "item-reference",
  "spell-reference",
  "subclass-choice",
  "unit-reference",
  "spell-list",
  "weapon-reference",
] as const;

export const SURFACE_UNIT_DEPENDENCY_RELATIONS = [
  "item-reference",
  "linked-spell-reference",
  "origin-feat-reference",
  "resource-link",
  "spell-reference",
  "unit-reference",
] as const;

export const SURFACE_STAT_BLOCK_REFERENCE_RELATIONS = [
  "recommended-stat-block-reference",
] as const;

export const SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS = [
  "monster-reference",
  "stat-block-reference",
] as const;

/**
 * A generic relation is not enough to determine the owning mechanics branch.
 * These source roles are attached at the schema field that establishes the
 * relation, then carried by the authored-link collector.
 */
export const SURFACE_LINK_SOURCE_ROLES = [
  "generic",
  "class-feature-grant",
  "class-subclass-choice",
] as const;

export type SurfaceUnitReferenceRelation =
  (typeof SURFACE_UNIT_REFERENCE_RELATIONS)[number];
export type SurfaceUnitDependencyRelation =
  (typeof SURFACE_UNIT_DEPENDENCY_RELATIONS)[number];
export type SurfaceStatBlockReferenceRelation =
  (typeof SURFACE_STAT_BLOCK_REFERENCE_RELATIONS)[number];
export type SurfaceStatBlockDependencyRelation =
  (typeof SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS)[number];
export type SurfaceIdentityKind = (typeof SURFACE_IDENTITY_KINDS)[number];
export type SurfaceProtocolKind = (typeof SURFACE_PROTOCOL_KINDS)[number];
export type SurfaceProseEvidencePolicy =
  (typeof SURFACE_PROSE_EVIDENCE_POLICIES)[number];
export type SurfaceProjectionKind = (typeof SURFACE_PROJECTION_KINDS)[number];
export type SurfaceLinkSourceRole = (typeof SURFACE_LINK_SOURCE_ROLES)[number];

export type SurfaceSchemaFieldRole =
  | {
      readonly category: "identity";
      readonly kind: SurfaceIdentityKind;
    }
  | {
      readonly category: "prose";
      readonly evidence: SurfaceProseEvidencePolicy;
    }
  | {
      readonly category: "protocol";
      readonly kind: SurfaceProtocolKind;
    }
  | {
      readonly category: "vocabulary";
      readonly kind: "literal";
    }
  | {
      readonly category: "provenance";
    }
  | {
      readonly category: "reference";
      readonly relation: SurfaceUnitReferenceRelation;
      readonly targetKind: "unit";
      readonly sourceRole?: SurfaceLinkSourceRole;
    }
  | {
      readonly category: "reference";
      readonly relation: SurfaceStatBlockReferenceRelation;
      readonly targetKind: "statBlock";
    }
  | {
      readonly category: "dependency";
      readonly relation: SurfaceUnitDependencyRelation;
      readonly targetKind: "unit";
      readonly sourceRole?: SurfaceLinkSourceRole;
    }
  | {
      readonly category: "dependency";
      readonly relation: SurfaceStatBlockDependencyRelation;
      readonly targetKind: "statBlock";
    }
  | {
      readonly category: "projection";
      readonly kind: SurfaceProjectionKind;
    };

function isStringSchemaAst(ast: AST.AST): boolean {
  let current = ast;
  while (AST.isRefinement(current) || AST.isTransformation(current)) {
    current = current.from;
  }
  return (
    current?._tag === "StringKeyword" ||
    (current?._tag === "Literal" && typeof current.literal === "string")
  );
}

const exactRoleKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isSurfaceSchemaRole(
  value: unknown,
): value is SurfaceSchemaFieldRole {
  if (!isRecord(value) || typeof value.category !== "string") return false;
  const role = value;
  if (role.category === "provenance") {
    return exactRoleKeys(role, ["category"]);
  }
  if (role.category === "prose") {
    return (
      exactRoleKeys(role, ["category", "evidence"]) &&
      typeof role.evidence === "string" &&
      SURFACE_PROSE_EVIDENCE_POLICIES.some(
        (evidence) => evidence === role.evidence,
      )
    );
  }
  if (role.category === "identity") {
    return (
      exactRoleKeys(role, ["category", "kind"]) &&
      typeof role.kind === "string" &&
      SURFACE_IDENTITY_KINDS.some((kind) => kind === role.kind)
    );
  }
  if (role.category === "protocol") {
    return (
      exactRoleKeys(role, ["category", "kind"]) &&
      typeof role.kind === "string" &&
      SURFACE_PROTOCOL_KINDS.some((kind) => kind === role.kind)
    );
  }
  if (role.category === "vocabulary") {
    return exactRoleKeys(role, ["category", "kind"]) && role.kind === "literal";
  }
  if (role.category === "projection") {
    return (
      exactRoleKeys(role, ["category", "kind"]) &&
      SURFACE_PROJECTION_KINDS.some((kind) => kind === role.kind)
    );
  }
  if (role.category === "reference" || role.category === "dependency") {
    const unitRelations =
      role.category === "reference"
        ? SURFACE_UNIT_REFERENCE_RELATIONS
        : SURFACE_UNIT_DEPENDENCY_RELATIONS;
    const statBlockRelations =
      role.category === "reference"
        ? SURFACE_STAT_BLOCK_REFERENCE_RELATIONS
        : SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS;
    const linkKeys = ["category", "relation", "targetKind"] as const;
    const linkKeysWithSourceRole = [...linkKeys, "sourceRole"] as const;
    const hasSourceRole = Object.hasOwn(role, "sourceRole");
    return (
      (exactRoleKeys(role, linkKeys) ||
        exactRoleKeys(role, linkKeysWithSourceRole)) &&
      typeof role.relation === "string" &&
      typeof role.targetKind === "string" &&
      (!hasSourceRole ||
        (typeof role.sourceRole === "string" &&
          SURFACE_LINK_SOURCE_ROLES.some(
            (sourceRole) => sourceRole === role.sourceRole,
          ))) &&
      ((role.targetKind === "unit" &&
        unitRelations.some((relation) => relation === role.relation)) ||
        (role.targetKind === "statBlock" &&
          statBlockRelations.some((relation) => relation === role.relation)))
    );
  }
  return false;
}

function surfaceSchemaRoleKey(value: unknown): string | undefined {
  if (!isSurfaceSchemaRole(value)) return undefined;
  if (value.category === "identity" || value.category === "protocol") {
    return `${value.category}:${value.kind}`;
  }
  if (value.category === "reference" || value.category === "dependency") {
    const sourceRole =
      "sourceRole" in value ? (value.sourceRole ?? "generic") : "generic";
    return `${value.category}:${value.targetKind}:${value.relation}:${sourceRole}`;
  }
  if (value.category === "projection") return `projection:${value.kind}`;
  if (value.category === "prose") return `prose:${value.evidence}`;
  if (value.category === "vocabulary") return "vocabulary:literal";
  return value.category;
}

export function surfaceSchemaRolesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const leftKey = surfaceSchemaRoleKey(left);
  return leftKey !== undefined && leftKey === surfaceSchemaRoleKey(right);
}

export function readSurfaceSchemaRole(
  ast: AST.AST,
): SurfaceSchemaFieldRole | undefined {
  /* v8 ignore start -- @preserve -- Effect AST variants expose annotations; absence requires a malformed or incompatible external AST object */
  if (!("annotations" in ast)) return undefined;
  /* v8 ignore stop -- @preserve */
  const value = ast.annotations[SURFACE_SCHEMA_ROLE_ANNOTATION];
  return isSurfaceSchemaRole(value) ? value : undefined;
}

export function surfaceSchemaRole<A, I, R>(
  schema: Schema.Schema<A & string, I, R>,
  role: SurfaceSchemaFieldRole,
): Schema.Schema<A & string, I, R> {
  /* v8 ignore start -- @preserve -- this helper is typed for string schemas; a non-string AST requires malformed internal schema construction */
  if (!isStringSchemaAst(schema.ast)) {
    throw new Error("Surface schema roles can only annotate string schemas");
  }
  /* v8 ignore stop -- @preserve */
  const requestedRoleKey = surfaceSchemaRoleKey(role);
  /* v8 ignore start -- @preserve -- SurfaceSchemaFieldRole excludes unknown role shapes, so an absent key requires bypassing its type */
  if (requestedRoleKey === undefined) {
    throw new Error("Invalid Surface schema role");
  }
  /* v8 ignore stop -- @preserve */
  const existingRole = schema.ast.annotations[SURFACE_SCHEMA_ROLE_ANNOTATION];
  /* v8 ignore start -- @preserve -- one schema field has one authored role; applying a different second role is malformed schema composition */
  if (
    existingRole !== undefined &&
    !surfaceSchemaRolesEqual(existingRole, role)
  ) {
    throw new Error("Conflicting Surface schema roles");
  }
  /* v8 ignore stop -- @preserve */
  return schema.annotations({
    [SURFACE_SCHEMA_ROLE_ANNOTATION]: role,
  });
}

export { STANDARD_ACTION_KINDS } from "@dnd/shared/game-facts";

// EXPLANATION: base closed vocabulary shared across spell and non-spell
// surface families. Keep this file non-recursive so later families can import
// stable building blocks without creating avoidable cycles.

export const RollKindSchema = Schema.Literal(
  "attack_roll",
  "spell_attack_roll",
  "saving_throw",
  "ability_check",
  "initiative",
  "death_saving_throw",
);

export const WeaponPropertySchema = Schema.Literal(
  "ammunition",
  "finesse",
  "heavy",
  "light",
  "loading",
  "reach",
  "thrown",
  "two_handed",
  "versatile",
);

export const WeaponFilterSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("source_item"),
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_category"),
    category: Schema.Literal("melee", "ranged"),
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_property"),
    property: WeaponPropertySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("specific_item"),
    itemId: surfaceSchemaRole(Schema.String, {
      category: "reference",
      relation: "item-reference",
      targetKind: "unit",
    }),
  }),
);

export const MagicalitySchema = Schema.Literal("magical", "nonmagical");

export const ResistanceSourceFilterSchema = Schema.Struct({
  kind: Schema.Literal("attack"),
  weaponFilter: exactOptional(WeaponFilterSchema),
  magicality: exactOptional(MagicalitySchema),
});

export const SavingThrowSourceFilterSchema = Schema.Struct({
  kind: Schema.Literal("spell_or_other_magical_effect"),
});

export const AbilitySchema = Schema.Literal(...ABILITIES);

export const DamageTypeSchema = Schema.Literal(...DAMAGE_TYPES);

export const AttackKindSchema = Schema.Literal(
  "ranged_spell_attack",
  "melee_spell_attack",
);

export const ExileDestinationSchema = Schema.Literal(
  "demiplane",
  "astral_plane",
  "ethereal_plane",
  "plane_of_origin",
  "different_plane",
);

export const ContainerStorageProfileSchema = Schema.Struct({
  maxWeightPounds: Schema.Number,
  maxVolumeCubicFeet: Schema.Number,
  weightOverridePounds: exactOptional(Schema.Number),
  airSupply: exactOptional(
    Schema.Struct({
      sharedMinutes: Schema.Number,
    }),
  ),
  extradimensional: exactOptional(Schema.Literal(true)),
});

export const StandardActionKindSchema = Schema.Literal(
  ...STANDARD_ACTION_KINDS,
);

export const AlternateActionCostSchema = Schema.Struct({
  from: Schema.Struct({
    kind: Schema.Literal("standard_action"),
    actions: Schema.NonEmptyArray(StandardActionKindSchema),
  }),
  to: Schema.Struct({
    kind: Schema.Literal("bonus_action"),
  }),
});

export const CLASS_NAMES = SHARED_CLASS_NAMES;

const [firstClassName, ...rawClassNameTail] = CLASS_NAMES;
const classNameTail: ReadonlyArray<ClassName> = rawClassNameTail;

type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export const LIST_PREPARED_SPELLCASTING_CLASS_NAMES = [
  "bard",
  "cleric",
  "druid",
  "paladin",
  "ranger",
  "sorcerer",
] as const satisfies ReadonlyArray<ClassName>;

export const PACT_MAGIC_CLASS_NAMES = [
  "warlock",
] as const satisfies ReadonlyArray<ClassName>;

export const CLASS_SPELLCASTING_CLASS_NAMES = [
  ...LIST_PREPARED_SPELLCASTING_CLASS_NAMES,
  ...PACT_MAGIC_CLASS_NAMES,
  "wizard",
] as const satisfies ReadonlyArray<ClassName>;

export const NON_SPELLCASTING_CLASS_NAMES = [
  "barbarian",
  "fighter",
  "monk",
  "rogue",
] as const satisfies NonEmptyReadonlyArray<
  Exclude<ClassName, (typeof CLASS_SPELLCASTING_CLASS_NAMES)[number]>
>;

export const NON_FIGHTER_NON_WIZARD_CLASS_NAMES = [
  firstClassName,
  ...classNameTail.filter(
    (className): className is Exclude<ClassName, "fighter" | "wizard"> =>
      className !== "fighter" && className !== "wizard",
  ),
] as const satisfies NonEmptyReadonlyArray<
  Exclude<ClassName, "fighter" | "wizard">
>;

export const NON_WIZARD_CLASS_NAMES = [
  firstClassName,
  ...classNameTail.filter(
    (className): className is Exclude<ClassName, "wizard"> =>
      className !== "wizard",
  ),
] as const satisfies NonEmptyReadonlyArray<Exclude<ClassName, "wizard">>;

export const ClassNameSchema = Schema.Literal(...CLASS_NAMES);

export const ClassRecordKindSchema = Schema.Literal("class");

export const SubclassRecordKindSchema = Schema.Literal("subclass");

export const BackgroundRecordKindSchema = Schema.Literal("background");

export const SpeciesRecordKindSchema = Schema.Literal("species");

export const RestKindSchema = Schema.Literal("short", "long");

export const FeatCategorySchema = Schema.Literal(
  "general",
  "fighting_style",
  "epic_boon",
  "origin",
);

export const MagicItemRaritySchema = Schema.Literal(
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "legendary",
  "artifact",
);

export const LevelAxisSchema = Schema.Literal(
  "proficiency_bonus",
  "character",
  "class",
  "slot",
  "subclass",
);

export const DiceDeltaSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixed_number"),
    amount: Schema.Number,
    sign: Schema.Literal("+", "-"),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed_dice"),
    dice: Schema.Number,
    dieSize: Schema.Number,
    sign: Schema.Literal("+", "-"),
  }),
  Schema.Struct({
    kind: Schema.Literal("proficiency_bonus"),
    sign: Schema.Literal("+", "-"),
    scale: exactOptional(Schema.Literal("half")),
  }),
  Schema.Struct({
    kind: Schema.Literal("ability_modifier"),
    ability: AbilitySchema,
    sign: Schema.Literal("+", "-"),
    minimum: exactOptional(Schema.Number),
  }),
  Schema.Struct({
    kind: Schema.Literal("threshold_tiers"),
    axis: LevelAxisSchema,
    base: Schema.Number,
    tiers: Schema.NonEmptyArray(
      Schema.Struct({
        atLevel: Schema.Number,
        value: Schema.Number,
      }),
    ),
    sign: Schema.Literal("+", "-"),
  }),
  Schema.Struct({
    kind: Schema.Literal("magic_item_rarity_bonus"),
    sign: Schema.Literal("+", "-"),
    byRarity: Schema.Struct({
      common: Schema.Number,
      uncommon: Schema.Number,
      rare: Schema.Number,
      very_rare: Schema.Number,
      legendary: Schema.Number,
      artifact: Schema.Number,
    }),
  }),
);

export const DurationUpcastTierSchema = Schema.Struct({
  atSlot: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
});

export const ReadonlyNonEmptyArrayDurationUpcastTierSchema =
  Schema.NonEmptyArray(DurationUpcastTierSchema);

export const TimeSpanDurationValueSchema = Schema.Struct({
  unit: Schema.Literal("round", "minute", "hour", "day"),
  amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  upcastTiers: exactOptional(ReadonlyNonEmptyArrayDurationUpcastTierSchema),
});

export const HalfClassLevelRoundedDownHoursDurationValueSchema = Schema.Struct({
  kind: Schema.Literal("half_class_level_rounded_down_hours"),
});

export const DurationValueSchema = TimeSpanDurationValueSchema;

export const SkillSchema = Schema.Literal(...SURFACE_SKILLS);

export const ReadonlyNonEmptyArraySkillSchema =
  Schema.NonEmptyArray(SkillSchema);

export const SkillFilterSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    skills: ReadonlyNonEmptyArraySkillSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    options: ReadonlyNonEmptyArraySkillSchema,
  }),
);

export const WEAPON_PROFICIENCY_CATEGORIES = ["simple", "martial"] as const;
export const WeaponProficiencyCategorySchema = Schema.Literal(
  ...WEAPON_PROFICIENCY_CATEGORIES,
);

export const TOOL_PROFICIENCY_CATEGORIES = [
  "artisan_tool",
  "gaming_set",
  "musical_instrument",
] as const;
export const ToolProficiencyCategorySchema = Schema.Literal(
  ...TOOL_PROFICIENCY_CATEGORIES,
);

export const ARMOR_TRAINING_CATEGORIES = [
  "light",
  "medium",
  "heavy",
  "shield",
] as const;
export const ArmorTrainingCategorySchema = Schema.Literal(
  ...ARMOR_TRAINING_CATEGORIES,
);

export const ArmorCategorySchema = Schema.Literal("light", "medium", "heavy");

export const LightArmorAcFormulaSchema = Schema.Struct({
  kind: Schema.Literal("light_dex"),
  base: Schema.Number,
});

export const MediumArmorAcFormulaSchema = Schema.Struct({
  kind: Schema.Literal("medium_dex_max_2"),
  base: Schema.Number,
});

export const HeavyArmorAcFormulaSchema = Schema.Struct({
  kind: Schema.Literal("heavy_fixed"),
  ac: Schema.Number,
});

export const ArmorAcFormulaSchema = Schema.Union(
  LightArmorAcFormulaSchema,
  MediumArmorAcFormulaSchema,
  HeavyArmorAcFormulaSchema,
);

export const WeaponCategorySchema = Schema.Literal("simple", "martial");

export const WeaponProficiencySchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("weapon_category"),
    category: WeaponProficiencyCategorySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_category_with_properties"),
    category: WeaponProficiencyCategorySchema,
    anyOfProperties: Schema.NonEmptyArray(WeaponPropertySchema),
  }),
);

export const WeaponUsageSchema = Schema.Literal("melee", "ranged");

export const WeaponDamageSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("dice"),
    dice: Schema.Number,
    dieSize: Schema.Number,
    damageType: DamageTypeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("flat"),
    amount: Schema.Number,
    damageType: DamageTypeSchema,
  }),
);

export const WeaponRangeSchema = Schema.Struct({
  normal: Schema.Number,
  long: Schema.Number,
});

export { AmmunitionKindSchema };

export const WeaponPropertyDetailSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("ammunition"),
    range: WeaponRangeSchema,
    ammunition: AmmunitionKindSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("finesse") }),
  Schema.Struct({ kind: Schema.Literal("heavy") }),
  Schema.Struct({ kind: Schema.Literal("light") }),
  Schema.Struct({ kind: Schema.Literal("loading") }),
  Schema.Struct({ kind: Schema.Literal("reach") }),
  Schema.Struct({ kind: Schema.Literal("thrown"), range: WeaponRangeSchema }),
  Schema.Struct({
    kind: Schema.Literal("two_handed"),
    unless: exactOptional(Schema.Literal("mounted")),
  }),
  Schema.Struct({
    kind: Schema.Literal("versatile"),
    damage: WeaponDamageSchema,
  }),
);

export const WeaponMasteryNameSchema = Schema.Literal(
  "cleave",
  "graze",
  "nick",
  "push",
  "sap",
  "slow",
  "topple",
  "vex",
);

/* v8 ignore start -- @preserve -- these exported declarative schemas initialize during full-suite collection before V8 attributes their statements; schema-base.test.ts decodes every shape directly */
export const ProficiencyGrantSubjectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("skill"),
    skill: SkillSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_category"),
    category: WeaponProficiencyCategorySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("armor_category"),
    category: ArmorTrainingCategorySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("tool"),
    toolId: surfaceSchemaRole(Schema.NonEmptyTrimmedString, {
      category: "projection",
      kind: "derived-reference",
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("tool_category"),
    category: ToolProficiencyCategorySchema,
  }),
);

export const ToolProficiencyGrantSubjectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("tool"),
    toolId: surfaceSchemaRole(Schema.NonEmptyTrimmedString, {
      category: "projection",
      kind: "derived-reference",
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("tool_category"),
    category: ToolProficiencyCategorySchema,
  }),
);

export const ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema =
  Schema.NonEmptyArray(ProficiencyGrantSubjectSchema);
export const ReadonlyNonEmptyArrayToolProficiencyGrantSubjectSchema =
  Schema.NonEmptyArray(ToolProficiencyGrantSubjectSchema);

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

export const ClassLevelChoiceCountSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("class_level_additional_choices"),
    initial: PositiveIntegerSchema,
    increases: Schema.NonEmptyArray(
      Schema.Struct({
        atLevel: PositiveIntegerSchema,
        choose: PositiveIntegerSchema,
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("class_level_total_choices"),
    levels: Schema.NonEmptyArray(
      Schema.Struct({
        atLevel: PositiveIntegerSchema,
        total: PositiveIntegerSchema,
      }),
    ),
  }),
);

const ProficiencyGrantChoiceSchema = Schema.Struct({
  count: PositiveIntegerSchema,
  options: ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema,
});

const NamedProficiencyGrantChoiceSchema = Schema.Struct({
  choiceKey: surfaceSchemaRole(Schema.NonEmptyTrimmedString, {
    category: "protocol",
    kind: "choiceKey",
  }),
  ...ProficiencyGrantChoiceSchema.fields,
});
/* v8 ignore stop -- @preserve */

export const ProficiencyGrantSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    proficiencies: ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    ...ProficiencyGrantChoiceSchema.fields,
  }),
  Schema.Struct({
    kind: Schema.Literal("mixed"),
    fixed: ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema,
    choice: NamedProficiencyGrantChoiceSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("mixed_choices"),
    fixed: ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema,
    choices: Schema.NonEmptyArray(NamedProficiencyGrantChoiceSchema),
  }),
);

const ToolProficiencyGrantChoiceSchema = Schema.Struct({
  count: PositiveIntegerSchema,
  options: ReadonlyNonEmptyArrayToolProficiencyGrantSubjectSchema,
});

export const ToolProficiencyGrantSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    proficiencies: ReadonlyNonEmptyArrayToolProficiencyGrantSubjectSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    ...ToolProficiencyGrantChoiceSchema.fields,
  }),
);

export const ConditionSchema = Schema.Literal(...SURFACE_CONDITIONS);

export const ReadonlyNonEmptyArrayConditionSchema =
  Schema.NonEmptyArray(ConditionSchema);

export const AreaShapeSchema = Schema.Literal(
  "sphere",
  "cone",
  "cube",
  "cylinder",
  "emanation",
  "line",
);

export const SenseKindSchema = Schema.Literal(
  "darkvision",
  "blindsight",
  "tremorsense",
  "truesight",
);

export const CreatureTypeSchema = Schema.Literal(...CREATURE_TYPES);

export const ReadonlyNonEmptyArrayCreatureTypeSchema =
  Schema.NonEmptyArray(CreatureTypeSchema);

export const DiceExprSchema = Schema.Struct({
  dice: Schema.Number,
  dieSize: Schema.Number,
  flat: exactOptional(Schema.Number),
  spellcastingMod: exactOptional(Schema.Literal(true)),
  abilityModifier: exactOptional(AbilitySchema),
});

export const DiceExprDeltaSchema = Schema.Struct({
  dice: exactOptional(Schema.Number),
  dieSize: exactOptional(Schema.Number),
  flat: exactOptional(Schema.Number),
});

const DiceAmountThresholdTierSchema = Schema.Struct({
  atLevel: Schema.Number,
  override: DiceExprDeltaSchema,
});

const ReadonlyNonEmptyArrayDiceAmountThresholdTierSchema = Schema.NonEmptyArray(
  DiceAmountThresholdTierSchema,
);

const ExplodingMaxDieThresholdTierSchema = Schema.Struct({
  atLevel: Schema.Number,
  dice: Schema.Number,
});

const ReadonlyNonEmptyArrayExplodingMaxDieThresholdTierSchema =
  Schema.NonEmptyArray(ExplodingMaxDieThresholdTierSchema);

export const LinkedSpeedSchema = Schema.Struct({
  kind: Schema.Literal("walk_speed"),
});

export const LinkedDamageSchema = Schema.Struct({
  kind: Schema.Literal("damage_taken", "damage_dealt"),
  scale: Schema.Literal("full", "half"),
});

export const DiceAmountSchema = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("fixed"),
      expr: DiceExprSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("threshold_tiers"),
      axis: LevelAxisSchema,
      base: DiceExprSchema,
      tiers: ReadonlyNonEmptyArrayDiceAmountThresholdTierSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("linear_per_level"),
      axis: LevelAxisSchema,
      base: DiceExprSchema,
      perLevel: DiceExprDeltaSchema,
      startingAtLevel: Schema.Number,
    }),
    Schema.Struct({
      kind: Schema.Literal("threshold_tiers_exploding_max_die"),
      axis: LevelAxisSchema,
      baseDice: Schema.Number,
      dieSize: Schema.Number,
      tiers: ReadonlyNonEmptyArrayExplodingMaxDieThresholdTierSchema,
      maxAdditionalDice: Schema.Literal("spellcasting_ability_modifier"),
    }),
    Schema.Struct({
      kind: Schema.Literal("resource_spent"),
    }),
    Schema.Struct({
      kind: Schema.Literal("proficiency_bonus"),
    }),
    Schema.Struct({
      kind: Schema.Literal("resource_spent_linear"),
      base: DiceExprSchema,
      perResource: DiceExprDeltaSchema,
      maximum: exactOptional(DiceExprSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("linked"),
      link: LinkedDamageSchema,
    }),
  ),
).annotations({ identifier: "DiceAmount" });

export const SpellAccessModeSchema = Schema.Union(
  Schema.Literal(
    "at_will",
    "once_per_long_rest",
    "prepared",
    "prepared_once_per_long_rest",
    "known",
    "known_once_per_long_rest",
  ),
  Schema.Struct({
    kind: Schema.Literal("charge_cast"),
    baseCharges: Schema.Number,
    perLevelCharges: Schema.Number,
    minLevel: Schema.Number,
    maxLevel: Schema.Number,
  }),
);

export const GrantedSpellTargetRestrictionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("self_only"),
  }),
  Schema.Struct({
    kind: Schema.Literal("visible_target_within_feet"),
    feet: Schema.Number,
    origin: Schema.Literal("caster", "spell_sensor"),
  }),
);

export const GrantedSpellDurationOverrideSchema = Schema.Struct({
  removeConcentration: exactOptional(Schema.Literal(true)),
  endsWhenGrantedSpellEnds: exactOptional(
    surfaceSchemaRole(Schema.String, {
      category: "dependency",
      relation: "linked-spell-reference",
      targetKind: "unit",
    }),
  ),
});

export const ProvenanceSchema = Schema.Struct({
  kind: Schema.Literal("srd-5.2.1", "xphb", "synthetic-test"),
  section: surfaceSchemaRole(Schema.String, { category: "provenance" }),
});

export const UsageLimitSchema = Schema.Struct({
  kind: Schema.Literal("once_per_turn", "once_per_round"),
  limitGroup: exactOptional(
    surfaceSchemaRole(Schema.String, {
      category: "protocol",
      kind: "limitGroup",
    }),
  ),
});
