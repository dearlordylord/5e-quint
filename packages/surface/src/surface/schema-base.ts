import { Match, Schema } from "effect";
import * as AST from "effect/SchemaAST";
import {
  ABILITIES,
  AmmunitionKindSchema,
  CLASS_NAMES as SHARED_CLASS_NAMES,
  CREATURE_TYPES,
  STANDARD_ACTION_KINDS,
  SURFACE_CONDITIONS,
  SURFACE_SKILLS,
  UnitId,
  type ClassName,
  type UnitId as UnitIdType,
} from "@dnd/shared/game-facts";
import { DAMAGE_TYPES } from "@dnd/shared/types";

import { exactOptional } from "./schema-helpers.ts";
import {
  SURFACE_WEAPON_FILTER_CATEGORIES,
  SURFACE_WEAPON_FILTER_SOURCE_ITEM,
  SURFACE_WEAPON_FILTER_SPECIFIC_ITEM,
  SURFACE_WEAPON_FILTER_WEAPON_CATEGORY,
  SURFACE_WEAPON_FILTER_WEAPON_PROPERTY,
  SURFACE_WEAPON_PROPERTIES,
  SURFACE_WEAPON_PROPERTY_AMMUNITION,
  SURFACE_WEAPON_PROPERTY_FINESSE,
  SURFACE_WEAPON_PROPERTY_HEAVY,
  SURFACE_WEAPON_PROPERTY_LIGHT,
  SURFACE_WEAPON_PROPERTY_LOADING,
  SURFACE_WEAPON_PROPERTY_REACH,
  SURFACE_WEAPON_PROPERTY_THROWN,
  SURFACE_WEAPON_PROPERTY_TWO_HANDED,
  SURFACE_WEAPON_PROPERTY_VERSATILE,
  type SurfaceWeaponFilter,
} from "./surface-vocabulary.ts";
import { SRD_PROVENANCE_KIND } from "./srd-provenance.ts";

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
  "mastery-reference",
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
export type SurfaceSpecializedLinkSourceRole = Exclude<
  SurfaceLinkSourceRole,
  "generic"
>;

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
      /** Absence is the single spelling of the generic source role. */
      readonly sourceRole?: SurfaceSpecializedLinkSourceRole;
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
      /** Absence is the single spelling of the generic source role. */
      readonly sourceRole?: SurfaceSpecializedLinkSourceRole;
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

export type SurfaceLinkSchemaRole = Extract<
  SurfaceSchemaFieldRole,
  { readonly category: "reference" | "dependency" }
>;

export type SurfaceLinkSourceRoleFor<Role extends SurfaceLinkSchemaRole> =
  Role extends { readonly targetKind: "unit" }
    ? SurfaceLinkSourceRole
    : "generic";

export function surfaceLinkSourceRole<Role extends SurfaceLinkSchemaRole>(
  role: Role,
): SurfaceLinkSourceRoleFor<Role>;
export function surfaceLinkSourceRole(
  role: SurfaceLinkSchemaRole,
): SurfaceLinkSourceRole {
  return "sourceRole" in role ? (role.sourceRole ?? "generic") : "generic";
}

function isStringSchemaAst(ast: AST.AST): boolean {
  const current = AST.toType(ast);
  return (
    current?._tag === "String" ||
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

type SurfaceSchemaRoleCategory = SurfaceSchemaFieldRole["category"];

const SURFACE_SCHEMA_ROLE_CATEGORIES = {
  dependency: true,
  identity: true,
  projection: true,
  prose: true,
  protocol: true,
  provenance: true,
  reference: true,
  vocabulary: true,
} as const satisfies Record<SurfaceSchemaRoleCategory, true>;

function isSurfaceSchemaRoleCategory(
  value: string,
): value is SurfaceSchemaRoleCategory {
  return Object.hasOwn(SURFACE_SCHEMA_ROLE_CATEGORIES, value);
}

function isAllowedString(value: unknown, allowed: readonly string[]): boolean {
  return (
    typeof value === "string" &&
    allowed.some((candidate) => candidate === value)
  );
}

function isEnumeratedSurfaceSchemaRole(
  role: Record<string, unknown>,
  field: "evidence" | "kind",
  allowed: readonly string[],
): boolean {
  return (
    exactRoleKeys(role, ["category", field]) &&
    isAllowedString(role[field], allowed)
  );
}

function hasValidSurfaceLinkSourceRole(role: Record<string, unknown>): boolean {
  if (!Object.hasOwn(role, "sourceRole")) return true;
  return (
    role.targetKind === "unit" &&
    typeof role.sourceRole === "string" &&
    role.sourceRole !== "generic" &&
    SURFACE_LINK_SOURCE_ROLES.some(
      (sourceRole) => sourceRole === role.sourceRole,
    )
  );
}

function hasValidSurfaceLinkRelation(
  role: Record<string, unknown>,
  unitRelations: readonly string[],
  statBlockRelations: readonly string[],
): boolean {
  return (
    (role.targetKind === "unit" &&
      unitRelations.some((relation) => relation === role.relation)) ||
    (role.targetKind === "statBlock" &&
      statBlockRelations.some((relation) => relation === role.relation))
  );
}

function isSurfaceLinkSchemaRole(
  role: Record<string, unknown>,
  unitRelations: readonly string[],
  statBlockRelations: readonly string[],
): boolean {
  const linkKeys = ["category", "relation", "targetKind"] as const;
  const linkKeysWithSourceRole = [...linkKeys, "sourceRole"] as const;
  return (
    (exactRoleKeys(role, linkKeys) ||
      exactRoleKeys(role, linkKeysWithSourceRole)) &&
    typeof role.relation === "string" &&
    typeof role.targetKind === "string" &&
    hasValidSurfaceLinkSourceRole(role) &&
    hasValidSurfaceLinkRelation(role, unitRelations, statBlockRelations)
  );
}

export function isSurfaceSchemaRole(
  value: unknown,
): value is SurfaceSchemaFieldRole {
  if (!isRecord(value) || typeof value.category !== "string") return false;
  if (!isSurfaceSchemaRoleCategory(value.category)) return false;
  return Match.value(value.category).pipe(
    Match.when("provenance", () => exactRoleKeys(value, ["category"])),
    Match.when("prose", () =>
      isEnumeratedSurfaceSchemaRole(
        value,
        "evidence",
        SURFACE_PROSE_EVIDENCE_POLICIES,
      ),
    ),
    Match.when("identity", () =>
      isEnumeratedSurfaceSchemaRole(value, "kind", SURFACE_IDENTITY_KINDS),
    ),
    Match.when("protocol", () =>
      isEnumeratedSurfaceSchemaRole(value, "kind", SURFACE_PROTOCOL_KINDS),
    ),
    Match.when(
      "vocabulary",
      () =>
        exactRoleKeys(value, ["category", "kind"]) && value.kind === "literal",
    ),
    Match.when("projection", () =>
      isEnumeratedSurfaceSchemaRole(value, "kind", SURFACE_PROJECTION_KINDS),
    ),
    Match.when("reference", () =>
      isSurfaceLinkSchemaRole(
        value,
        SURFACE_UNIT_REFERENCE_RELATIONS,
        SURFACE_STAT_BLOCK_REFERENCE_RELATIONS,
      ),
    ),
    Match.when("dependency", () =>
      isSurfaceLinkSchemaRole(
        value,
        SURFACE_UNIT_DEPENDENCY_RELATIONS,
        SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS,
      ),
    ),
    Match.exhaustive,
  );
}

function surfaceSchemaRoleKey(value: unknown): string | undefined {
  if (!isSurfaceSchemaRole(value)) return undefined;
  return Match.value(value).pipe(
    Match.when(
      { category: "identity" },
      (role) => `${role.category}:${role.kind}`,
    ),
    Match.when(
      { category: "protocol" },
      (role) => `${role.category}:${role.kind}`,
    ),
    Match.when({ category: "reference" }, surfaceLinkSchemaRoleKey),
    Match.when({ category: "dependency" }, surfaceLinkSchemaRoleKey),
    Match.when({ category: "projection" }, (role) => `projection:${role.kind}`),
    Match.when({ category: "prose" }, (role) => `prose:${role.evidence}`),
    Match.when({ category: "vocabulary" }, () => "vocabulary:literal"),
    Match.when({ category: "provenance" }, (role) => role.category),
    Match.exhaustive,
  );
}

function surfaceLinkSchemaRoleKey(value: SurfaceLinkSchemaRole): string {
  return `${value.category}:${value.targetKind}:${value.relation}:${surfaceLinkSourceRole(value)}`;
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
  const value = AST.resolveAt<unknown>(SURFACE_SCHEMA_ROLE_ANNOTATION)(ast);
  return isSurfaceSchemaRole(value) ? value : undefined;
}

export function surfaceSchemaRole<A extends string, I, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>,
  role: SurfaceSchemaFieldRole,
): Schema.Codec<A, I, RD, RE> {
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
  const existingRole = AST.resolveAt<unknown>(SURFACE_SCHEMA_ROLE_ANNOTATION)(
    schema.ast,
  );
  /* v8 ignore start -- @preserve -- one schema field has one authored role; applying a different second role is malformed schema composition */
  if (
    existingRole !== undefined &&
    !surfaceSchemaRolesEqual(existingRole, role)
  ) {
    throw new Error("Conflicting Surface schema roles");
  }
  /* v8 ignore stop -- @preserve */
  const annotations = {
    [SURFACE_SCHEMA_ROLE_ANNOTATION]: role,
  } as const;
  const annotated = schema.pipe(
    Schema.annotate(annotations),
    Schema.annotateEncoded(annotations),
  );
  return annotated;
}

export { STANDARD_ACTION_KINDS } from "@dnd/shared/game-facts";

// EXPLANATION: base closed vocabulary shared across spell and non-spell
// surface families. Keep this file non-recursive so later families can import
// stable building blocks without creating avoidable cycles.

export const RollKindSchema = Schema.Literals([
  "attack_roll",
  "spell_attack_roll",
  "saving_throw",
  "ability_check",
  "initiative",
  "death_saving_throw",
]);

export const WeaponPropertySchema = Schema.Literals(SURFACE_WEAPON_PROPERTIES);

export const WeaponFilterSchema: Schema.Codec<
  SurfaceWeaponFilter<UnitIdType>,
  SurfaceWeaponFilter<string>,
  never,
  never
> = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_FILTER_SOURCE_ITEM),
  }),
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_FILTER_WEAPON_CATEGORY),
    category: Schema.Literals(SURFACE_WEAPON_FILTER_CATEGORIES),
  }),
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_FILTER_WEAPON_PROPERTY),
    property: WeaponPropertySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_FILTER_SPECIFIC_ITEM),
    itemId: surfaceSchemaRole(UnitId, {
      category: "reference",
      relation: "item-reference",
      targetKind: "unit",
    }),
  }),
]);

export const MagicalitySchema = Schema.Literals(["magical", "nonmagical"]);

export const ResistanceSourceFilterSchema = Schema.Struct({
  kind: Schema.Literal("attack"),
  weaponFilter: exactOptional(WeaponFilterSchema),
  magicality: exactOptional(MagicalitySchema),
});

export const SavingThrowSourceFilterSchema = Schema.Struct({
  kind: Schema.Literal("spell_or_other_magical_effect"),
});

export const AbilitySchema = Schema.Literals(ABILITIES);

export const DamageTypeSchema = Schema.Literals(DAMAGE_TYPES);

export const AttackKindSchema = Schema.Literals([
  "ranged_spell_attack",
  "melee_spell_attack",
]);

export const ExileDestinationSchema = Schema.Literals([
  "demiplane",
  "astral_plane",
  "ethereal_plane",
  "plane_of_origin",
  "different_plane",
]);

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

export const StandardActionKindSchema = Schema.Literals([
  ...STANDARD_ACTION_KINDS,
]);

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

export const ClassNameSchema = Schema.Literals(CLASS_NAMES);

export const ClassRecordKindSchema = Schema.Literal("class");

export const SubclassRecordKindSchema = Schema.Literal("subclass");

export const BackgroundRecordKindSchema = Schema.Literal("background");

export const SpeciesRecordKindSchema = Schema.Literal("species");

export const RestKindSchema = Schema.Literals(["short", "long"]);

export const FeatCategorySchema = Schema.Literals([
  "general",
  "fighting_style",
  "epic_boon",
  "origin",
]);

export const MagicItemRaritySchema = Schema.Literals([
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "legendary",
  "artifact",
]);

export const LevelAxisSchema = Schema.Literals([
  "proficiency_bonus",
  "character",
  "class",
  "slot",
  "subclass",
]);

export const DiceDeltaSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("fixed_number"),
    amount: Schema.Number,
    sign: Schema.Literals(["+", "-"]),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed_dice"),
    dice: Schema.Number,
    dieSize: Schema.Number,
    sign: Schema.Literals(["+", "-"]),
  }),
  Schema.Struct({
    kind: Schema.Literal("proficiency_bonus"),
    sign: Schema.Literals(["+", "-"]),
    scale: exactOptional(Schema.Literal("half")),
  }),
  Schema.Struct({
    kind: Schema.Literal("ability_modifier"),
    ability: AbilitySchema,
    sign: Schema.Literals(["+", "-"]),
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
    sign: Schema.Literals(["+", "-"]),
  }),
  Schema.Struct({
    kind: Schema.Literal("magic_item_rarity_bonus"),
    sign: Schema.Literals(["+", "-"]),
    byRarity: Schema.Struct({
      common: Schema.Number,
      uncommon: Schema.Number,
      rare: Schema.Number,
      very_rare: Schema.Number,
      legendary: Schema.Number,
      artifact: Schema.Number,
    }),
  }),
]);

export const DurationUpcastTierSchema = Schema.Struct({
  atSlot: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  ),
  amount: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  ),
});

export const ReadonlyNonEmptyArrayDurationUpcastTierSchema =
  Schema.NonEmptyArray(DurationUpcastTierSchema);

export const TimeSpanDurationValueSchema = Schema.Struct({
  unit: Schema.Literals(["round", "minute", "hour", "day"]),
  amount: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  ),
  upcastTiers: exactOptional(ReadonlyNonEmptyArrayDurationUpcastTierSchema),
});

export const HalfClassLevelRoundedDownHoursDurationValueSchema = Schema.Struct({
  kind: Schema.Literal("half_class_level_rounded_down_hours"),
});

export const DurationValueSchema = TimeSpanDurationValueSchema;

export const SkillSchema = Schema.Literals(SURFACE_SKILLS);

export const ReadonlyNonEmptyArraySkillSchema =
  Schema.NonEmptyArray(SkillSchema);

export const SkillFilterSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    skills: ReadonlyNonEmptyArraySkillSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    options: ReadonlyNonEmptyArraySkillSchema,
  }),
]);

export const WEAPON_PROFICIENCY_CATEGORIES = ["simple", "martial"] as const;
export const WeaponProficiencyCategorySchema = Schema.Literals([
  ...WEAPON_PROFICIENCY_CATEGORIES,
]);

export const TOOL_PROFICIENCY_CATEGORIES = [
  "artisan_tool",
  "gaming_set",
  "musical_instrument",
] as const;
export const ToolProficiencyCategorySchema = Schema.Literals([
  ...TOOL_PROFICIENCY_CATEGORIES,
]);

export const ARMOR_TRAINING_CATEGORIES = [
  "light",
  "medium",
  "heavy",
  "shield",
] as const;
export const ArmorTrainingCategorySchema = Schema.Literals([
  ...ARMOR_TRAINING_CATEGORIES,
]);

export const ArmorCategorySchema = Schema.Literals([
  "light",
  "medium",
  "heavy",
]);

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

export const ArmorAcFormulaSchema = Schema.Union([
  LightArmorAcFormulaSchema,
  MediumArmorAcFormulaSchema,
  HeavyArmorAcFormulaSchema,
]);

export const WeaponCategorySchema = Schema.Literals(["simple", "martial"]);

export const WeaponProficiencySchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("weapon_category"),
    category: WeaponProficiencyCategorySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_category_with_properties"),
    category: WeaponProficiencyCategorySchema,
    anyOfProperties: Schema.NonEmptyArray(WeaponPropertySchema),
  }),
]);

export const WeaponUsageSchema = Schema.Literals(
  SURFACE_WEAPON_FILTER_CATEGORIES,
);

export const WeaponDamageSchema = Schema.Union([
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
]);

export const WeaponRangeSchema = Schema.Struct({
  normal: Schema.Number,
  long: Schema.Number,
});

export { AmmunitionKindSchema };

export const WeaponPropertyDetailSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_AMMUNITION),
    range: WeaponRangeSchema,
    ammunition: AmmunitionKindSchema,
  }),
  Schema.Struct({ kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_FINESSE) }),
  Schema.Struct({ kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_HEAVY) }),
  Schema.Struct({ kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_LIGHT) }),
  Schema.Struct({ kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_LOADING) }),
  Schema.Struct({ kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_REACH) }),
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_THROWN),
    range: WeaponRangeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_TWO_HANDED),
    unless: exactOptional(Schema.Literal("mounted")),
  }),
  Schema.Struct({
    kind: Schema.Literal(SURFACE_WEAPON_PROPERTY_VERSATILE),
    damage: WeaponDamageSchema,
  }),
]);

export const WeaponMasteryNameSchema = Schema.Literals([
  "cleave",
  "graze",
  "nick",
  "push",
  "sap",
  "slow",
  "topple",
  "vex",
]);

/* v8 ignore start -- @preserve -- these exported declarative schemas initialize during full-suite collection before V8 attributes their statements; schema-base.test.ts decodes every shape directly */
export const ProficiencyGrantSubjectSchema = Schema.Union([
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
    toolId: surfaceSchemaRole(Schema.Trimmed.check(Schema.isNonEmpty()), {
      category: "projection",
      kind: "derived-reference",
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("tool_category"),
    category: ToolProficiencyCategorySchema,
  }),
]);

export const ToolProficiencyGrantSubjectSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("tool"),
    toolId: surfaceSchemaRole(Schema.Trimmed.check(Schema.isNonEmpty()), {
      category: "projection",
      kind: "derived-reference",
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("tool_category"),
    category: ToolProficiencyCategorySchema,
  }),
]);

export const ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema =
  Schema.NonEmptyArray(ProficiencyGrantSubjectSchema);
export const ReadonlyNonEmptyArrayToolProficiencyGrantSubjectSchema =
  Schema.NonEmptyArray(ToolProficiencyGrantSubjectSchema);

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
);

export const ClassLevelChoiceCountSchema = Schema.Union([
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
]);

const ProficiencyGrantChoiceSchema = Schema.Struct({
  count: PositiveIntegerSchema,
  options: ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema,
});

const NamedProficiencyGrantChoiceSchema = Schema.Struct({
  choiceKey: surfaceSchemaRole(Schema.Trimmed.check(Schema.isNonEmpty()), {
    category: "protocol",
    kind: "choiceKey",
  }),
  ...ProficiencyGrantChoiceSchema.fields,
});
/* v8 ignore stop -- @preserve */

export const ProficiencyGrantSchema = Schema.Union([
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
]);

const ToolProficiencyGrantChoiceSchema = Schema.Struct({
  count: PositiveIntegerSchema,
  options: ReadonlyNonEmptyArrayToolProficiencyGrantSubjectSchema,
});

export const ToolProficiencyGrantSchema = Schema.Union([
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
]);

export const ConditionSchema = Schema.Literals(SURFACE_CONDITIONS);

export const ReadonlyNonEmptyArrayConditionSchema =
  Schema.NonEmptyArray(ConditionSchema);

export const AreaShapeSchema = Schema.Literals([
  "sphere",
  "cone",
  "cube",
  "cylinder",
  "emanation",
  "line",
]);

export const SenseKindSchema = Schema.Literals([
  "darkvision",
  "blindsight",
  "tremorsense",
  "truesight",
]);

export const CreatureTypeSchema = Schema.Literals(CREATURE_TYPES);

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
  kind: Schema.Literals(["damage_taken", "damage_dealt"]),
  scale: Schema.Literals(["full", "half"]),
});

export const DiceAmountSchema = Schema.suspend(() =>
  Schema.Union([
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
  ]),
).pipe(Schema.annotate({ identifier: "DiceAmount" }));

export const SpellAccessModeSchema = Schema.Union([
  Schema.Literals([
    "at_will",
    "once_per_long_rest",
    "prepared",
    "prepared_once_per_long_rest",
    "known",
    "known_once_per_long_rest",
  ]),
  Schema.Struct({
    kind: Schema.Literal("charge_cast"),
    baseCharges: Schema.Number,
    perLevelCharges: Schema.Number,
    minLevel: Schema.Number,
    maxLevel: Schema.Number,
  }),
]);

export const GrantedSpellTargetRestrictionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("self_only"),
  }),
  Schema.Struct({
    kind: Schema.Literal("visible_target_within_feet"),
    feet: Schema.Number,
    origin: Schema.Literals(["caster", "spell_sensor"]),
  }),
]);

export const GrantedSpellDurationOverrideSchema = Schema.Struct({
  removeConcentration: exactOptional(Schema.Literal(true)),
  endsWhenGrantedSpellEnds: exactOptional(
    surfaceSchemaRole(UnitId, {
      category: "dependency",
      relation: "linked-spell-reference",
      targetKind: "unit",
    }),
  ),
});

export const ProvenanceSchema = Schema.Struct({
  kind: Schema.Literals([SRD_PROVENANCE_KIND, "xphb", "synthetic-test"]),
  section: surfaceSchemaRole(Schema.String, { category: "provenance" }),
});

export const UsageLimitSchema = Schema.Struct({
  kind: Schema.Literals(["once_per_turn", "once_per_round"]),
  limitGroup: exactOptional(
    surfaceSchemaRole(Schema.String, {
      category: "protocol",
      kind: "limitGroup",
    }),
  ),
});
