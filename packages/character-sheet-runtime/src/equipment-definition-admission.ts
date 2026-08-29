import { Either, Match } from "effect";

import { PositiveInteger } from "@dnd/shared/types";
import type {
  ArmorAcFormula,
  ArmorRecord,
  ShieldRecord,
  UnitRecord,
  WeaponDamage,
  WeaponPropertyDetail,
  WeaponRange,
  WeaponRecord,
} from "@dnd/surface/surface/types";

/**
 * Equipment fields are checked after the Surface schema has selected the
 * record shape.  This keeps structural decoding and semantic admission as
 * separate boundaries: a decoded record may still carry a non-finite number,
 * an impossible range, or contradictory weapon properties.
 */
const ARMOR_FIELDS = [
  "category",
  "acFormula",
  "strengthRequirement",
  "stealthDisadvantage",
  "weightPounds",
  "costGp",
  "donMinutes",
  "doffMinutes",
] as const;
type ArmorField = (typeof ARMOR_FIELDS)[number];

const SHIELD_FIELDS = [
  "armorClassProjection",
  "weightPounds",
  "costGp",
] as const;
type ShieldField = (typeof SHIELD_FIELDS)[number];

const WEAPON_FIELDS = [
  "attachedWeaponAttackOverrideEligibility",
  "category",
  "usage",
  "damage",
  "mastery",
  "weightPounds",
  "costGp",
] as const;
type WeaponField = (typeof WEAPON_FIELDS)[number];

const WEAPON_DAMAGE_FIELDS = [
  "kind",
  "dice",
  "dieSize",
  "amount",
  "damageType",
] as const;
type WeaponDamageField = (typeof WEAPON_DAMAGE_FIELDS)[number];

const WEAPON_RANGE_FIELDS = ["normal", "long"] as const;
type WeaponRangeField = (typeof WEAPON_RANGE_FIELDS)[number];

const WEAPON_PROPERTY_FIELDS = [
  "kind",
  "range",
  "ammunition",
  "unless",
  "damage",
] as const;
type WeaponPropertyField = (typeof WEAPON_PROPERTY_FIELDS)[number];

export const EQUIPMENT_DEFINITION_PROJECTION_ISSUE_REASONS = [
  "unsupported_mechanics",
  "ambiguous_mechanics",
] as const;

export type EquipmentDefinitionProjectionPath =
  | { readonly tag: "armor"; readonly field: ArmorField }
  | { readonly tag: "shield"; readonly field: ShieldField }
  | { readonly tag: "weapon"; readonly field: WeaponField }
  | {
      readonly tag: "weaponDamage";
      readonly field: WeaponDamageField;
    }
  | {
      readonly tag: "weaponRange";
      readonly field: WeaponRangeField;
    }
  | {
      readonly tag: "weaponProperty";
      readonly propertyOrdinal: PositiveInteger;
      readonly field: WeaponPropertyField;
    }
  | {
      readonly tag: "weaponPropertyRange";
      readonly propertyOrdinal: PositiveInteger;
      readonly field: WeaponRangeField;
    };

export type EquipmentDefinitionProjectionIssueReason =
  (typeof EQUIPMENT_DEFINITION_PROJECTION_ISSUE_REASONS)[number];

export type EquipmentDefinitionProjectionIssue = {
  readonly reason: EquipmentDefinitionProjectionIssueReason;
  readonly path: EquipmentDefinitionProjectionPath;
  readonly message: string;
};

export type EquipmentDefinitionProjectionIssues = readonly [
  EquipmentDefinitionProjectionIssue,
  ...EquipmentDefinitionProjectionIssue[],
];

/** Surface Unit records that own ordinary armor, shield, or weapon facts. */
export type EquipmentDefinitionUnit = ArmorRecord | ShieldRecord | WeaponRecord;

type ArmorDefinitionProjectionBase = {
  readonly tag: "armor";
  readonly strengthRequirement?: number;
  readonly stealthDisadvantage?: true;
  readonly weightPounds: number;
  readonly costGp: number;
  readonly donDoff: {
    readonly donMinutes: number;
    readonly doffMinutes: number;
  };
};

/** A source-free armor projection consumed by creation, sheet, and battle. */
export type ArmorDefinitionProjection =
  | (ArmorDefinitionProjectionBase & {
      readonly category: "light";
      readonly acFormula: Extract<
        ArmorAcFormula,
        { readonly kind: "light_dex" }
      >;
    })
  | (ArmorDefinitionProjectionBase & {
      readonly category: "medium";
      readonly acFormula: Extract<
        ArmorAcFormula,
        { readonly kind: "medium_dex_max_2" }
      >;
    })
  | (ArmorDefinitionProjectionBase & {
      readonly category: "heavy";
      readonly acFormula: Extract<
        ArmorAcFormula,
        { readonly kind: "heavy_fixed" }
      >;
    });

/** A source-free shield projection consumed by creation, sheet, and battle. */
export type ShieldDefinitionProjection = {
  readonly tag: "shield";
  readonly armorClassProjection: ShieldRecord["armorClassProjection"];
  readonly weightPounds: number;
  readonly costGp: number;
  readonly donDoff: ShieldRecord["donDoff"];
};

/** A source-free weapon projection shared with character-battle execution. */
export type WeaponDefinitionProjection = {
  readonly tag: "weapon";
  readonly attachedWeaponAttackOverrideEligibility?: WeaponRecord["attachedWeaponAttackOverrideEligibility"];
  readonly category: WeaponRecord["category"];
  readonly usage: WeaponRecord["usage"];
  readonly damage: WeaponDamage;
  readonly properties: readonly WeaponPropertyDetail[];
  readonly mastery: WeaponRecord["mastery"];
  readonly weightPounds?: number;
  readonly costGp: number;
};

/**
 * The complete static projection for an ordinary Equipment Definition Unit.
 * Authored id, name, provenance, and publication prose deliberately do not
 * cross this boundary; the aggregate keeps the authored root identity beside
 * this source-free mechanics value when it needs to index projections.
 */
export type EquipmentDefinitionProjection =
  | ArmorDefinitionProjection
  | ShieldDefinitionProjection
  | WeaponDefinitionProjection;

/** The narrowed shape gate used before calling the equipment owner. */
export function isEquipmentDefinitionUnit(
  unit: UnitRecord,
): unit is EquipmentDefinitionUnit {
  return (
    unit.kind === "armor" || unit.kind === "shield" || unit.kind === "weapon"
  );
}

/**
 * Parse and semantically admit one ordinary equipment definition.
 *
 * The input has already crossed the Surface decoder, so this operation never
 * consults a catalog, authored identity, wearer, build, session, or battle
 * state.  All independently discoverable field issues are accumulated before
 * a projection is returned; a partially projected equipment record is never
 * exposed.
 */
export function projectEquipmentDefinition(
  unit: EquipmentDefinitionUnit,
): Either.Either<
  EquipmentDefinitionProjection,
  EquipmentDefinitionProjectionIssues
> {
  return Match.value(unit).pipe(
    Match.when({ kind: "armor" }, projectArmor),
    Match.when({ kind: "shield" }, projectShield),
    Match.when({ kind: "weapon" }, projectWeapon),
    Match.exhaustive,
  );
}

function projectArmor(
  armor: ArmorRecord,
): Either.Either<
  ArmorDefinitionProjection,
  EquipmentDefinitionProjectionIssues
> {
  const issues: EquipmentDefinitionProjectionIssue[] = [];

  const armorAcValue = Match.value(armor.acFormula).pipe(
    Match.when({ kind: "light_dex" }, (formula) => formula.base),
    Match.when({ kind: "medium_dex_max_2" }, (formula) => formula.base),
    Match.when({ kind: "heavy_fixed" }, (formula) => formula.ac),
    Match.exhaustive,
  );
  if (!finiteIntegerAtLeast(armorAcValue, 0)) {
    addIssue(
      issues,
      { tag: "armor", field: "acFormula" },
      "unsupported_mechanics",
      "Armor AC formula must contain a finite non-negative integer base or AC.",
    );
  }
  const expectedFormula = Match.value(armor.category).pipe(
    Match.when("light", () => "light_dex" as const),
    Match.when("medium", () => "medium_dex_max_2" as const),
    Match.when("heavy", () => "heavy_fixed" as const),
    Match.exhaustive,
  );
  if (armor.acFormula.kind !== expectedFormula) {
    addIssue(
      issues,
      { tag: "armor", field: "acFormula" },
      "ambiguous_mechanics",
      "Armor category and AC formula describe different armor rules.",
    );
  }
  if (
    armor.strengthRequirement !== undefined &&
    !positiveInteger(armor.strengthRequirement)
  ) {
    addIssue(
      issues,
      { tag: "armor", field: "strengthRequirement" },
      "unsupported_mechanics",
      "Armor Strength requirement must be a finite positive integer when present.",
    );
  }
  if (
    armor.stealthDisadvantage !== undefined &&
    armor.stealthDisadvantage !== true
  ) {
    addIssue(
      issues,
      { tag: "armor", field: "stealthDisadvantage" },
      "ambiguous_mechanics",
      "Armor stealth disadvantage is either absent or explicitly true.",
    );
  }
  if (!positiveFinite(armor.weightPounds)) {
    addIssue(
      issues,
      { tag: "armor", field: "weightPounds" },
      "unsupported_mechanics",
      "Armor weight must be a finite positive number.",
    );
  }
  if (!nonNegativeFinite(armor.costGp)) {
    addIssue(
      issues,
      { tag: "armor", field: "costGp" },
      "unsupported_mechanics",
      "Armor cost must be a finite non-negative number.",
    );
  }
  if (!positiveInteger(armor.donDoff.donMinutes)) {
    addIssue(
      issues,
      { tag: "armor", field: "donMinutes" },
      "unsupported_mechanics",
      "Armor donning time must be a finite positive integer.",
    );
  }
  if (!positiveInteger(armor.donDoff.doffMinutes)) {
    addIssue(
      issues,
      { tag: "armor", field: "doffMinutes" },
      "unsupported_mechanics",
      "Armor doffing time must be a finite positive integer.",
    );
  }
  const expectedDonDoff = Match.value(armor.category).pipe(
    Match.when("light", () => ({ donMinutes: 1, doffMinutes: 1 })),
    Match.when("medium", () => ({ donMinutes: 5, doffMinutes: 1 })),
    Match.when("heavy", () => ({ donMinutes: 10, doffMinutes: 5 })),
    Match.exhaustive,
  );
  if (
    armor.donDoff.donMinutes !== expectedDonDoff.donMinutes ||
    armor.donDoff.doffMinutes !== expectedDonDoff.doffMinutes
  ) {
    addIssue(
      issues,
      { tag: "armor", field: "donMinutes" },
      "ambiguous_mechanics",
      "Armor donning and doffing times must match its category.",
    );
  }

  const sharedProjection = {
    ...(armor.strengthRequirement === undefined
      ? {}
      : { strengthRequirement: armor.strengthRequirement }),
    ...(armor.stealthDisadvantage === undefined
      ? {}
      : { stealthDisadvantage: armor.stealthDisadvantage }),
    weightPounds: armor.weightPounds,
    costGp: armor.costGp,
    donDoff: armor.donDoff,
  };
  return Match.value(armor).pipe(
    Match.when({ category: "light" }, ({ acFormula }) =>
      finish<ArmorDefinitionProjection>(issues, {
        tag: "armor",
        category: "light",
        acFormula,
        ...sharedProjection,
      }),
    ),
    Match.when({ category: "medium" }, ({ acFormula }) =>
      finish<ArmorDefinitionProjection>(issues, {
        tag: "armor",
        category: "medium",
        acFormula,
        ...sharedProjection,
      }),
    ),
    Match.when({ category: "heavy" }, ({ acFormula }) =>
      finish<ArmorDefinitionProjection>(issues, {
        tag: "armor",
        category: "heavy",
        acFormula,
        ...sharedProjection,
      }),
    ),
    Match.exhaustive,
  );
}

function projectShield(
  shield: ShieldRecord,
): Either.Either<
  ShieldDefinitionProjection,
  EquipmentDefinitionProjectionIssues
> {
  const issues: EquipmentDefinitionProjectionIssue[] = [];
  if (
    shield.armorClassProjection.kind !== "trained_shield_bonus" ||
    shield.armorClassProjection.handUse !== "shield" ||
    shield.armorClassProjection.trainingRequired !== "shield"
  ) {
    addIssue(
      issues,
      { tag: "shield", field: "armorClassProjection" },
      "ambiguous_mechanics",
      "Shield armor-class projection must use the trained shield bonus profile.",
    );
  }
  if (!positiveInteger(shield.armorClassProjection.bonus)) {
    addIssue(
      issues,
      { tag: "shield", field: "armorClassProjection" },
      "unsupported_mechanics",
      "Shield armor-class bonus must be a finite positive integer.",
    );
  }
  if (!positiveFinite(shield.weightPounds)) {
    addIssue(
      issues,
      { tag: "shield", field: "weightPounds" },
      "unsupported_mechanics",
      "Shield weight must be a finite positive number.",
    );
  }
  if (!nonNegativeFinite(shield.costGp)) {
    addIssue(
      issues,
      { tag: "shield", field: "costGp" },
      "unsupported_mechanics",
      "Shield cost must be a finite non-negative number.",
    );
  }

  return finish(issues, {
    tag: "shield",
    armorClassProjection: shield.armorClassProjection,
    weightPounds: shield.weightPounds,
    costGp: shield.costGp,
    donDoff: shield.donDoff,
  });
}

function projectWeapon(
  weapon: WeaponRecord,
): Either.Either<
  WeaponDefinitionProjection,
  EquipmentDefinitionProjectionIssues
> {
  const issues: EquipmentDefinitionProjectionIssue[] = [];
  if (!nonNegativeFinite(weapon.costGp)) {
    addIssue(
      issues,
      { tag: "weapon", field: "costGp" },
      "unsupported_mechanics",
      "Weapon cost must be a finite non-negative number.",
    );
  }
  if (
    weapon.weightPounds !== undefined &&
    !positiveFinite(weapon.weightPounds)
  ) {
    addIssue(
      issues,
      { tag: "weapon", field: "weightPounds" },
      "unsupported_mechanics",
      "Weapon weight must be a finite positive number when present.",
    );
  }

  inspectDamage(weapon.damage, issues);
  const properties = weapon.properties ?? [];
  inspectProperties({ weapon, properties, issues });

  return finish(issues, {
    tag: "weapon",
    ...(weapon.attachedWeaponAttackOverrideEligibility === undefined
      ? {}
      : {
          attachedWeaponAttackOverrideEligibility:
            weapon.attachedWeaponAttackOverrideEligibility,
        }),
    category: weapon.category,
    usage: weapon.usage,
    damage: weapon.damage,
    properties,
    mastery: weapon.mastery,
    ...(weapon.weightPounds === undefined
      ? {}
      : { weightPounds: weapon.weightPounds }),
    costGp: weapon.costGp,
  });
}

function inspectDamage(
  damage: WeaponDamage,
  issues: EquipmentDefinitionProjectionIssue[],
  propertyOrdinal?: PositiveInteger,
): void {
  const pathFor = (
    field: WeaponDamageField,
  ): EquipmentDefinitionProjectionPath =>
    propertyOrdinal === undefined
      ? { tag: "weaponDamage", field }
      : { tag: "weaponProperty", propertyOrdinal, field: "damage" };

  if (damage.kind === "dice") {
    if (!positiveInteger(damage.dice)) {
      addIssue(
        issues,
        pathFor("dice"),
        "unsupported_mechanics",
        "Weapon damage dice count must be a finite positive integer.",
      );
    }
    if (!positiveInteger(damage.dieSize)) {
      addIssue(
        issues,
        pathFor("dieSize"),
        "unsupported_mechanics",
        "Weapon damage die size must be a finite positive integer.",
      );
    }
  } else {
    if (!positiveInteger(damage.amount)) {
      addIssue(
        issues,
        pathFor("amount"),
        "unsupported_mechanics",
        "Flat weapon damage must be a finite positive integer.",
      );
    }
  }
}

function inspectProperties(input: {
  readonly weapon: WeaponRecord;
  readonly properties: readonly WeaponPropertyDetail[];
  readonly issues: EquipmentDefinitionProjectionIssue[];
}): void {
  const seen = new Set<WeaponPropertyDetail["kind"]>();
  for (const [index, property] of input.properties.entries()) {
    const propertyOrdinal = PositiveInteger(index + 1);
    if (seen.has(property.kind)) {
      addIssue(
        input.issues,
        { tag: "weaponProperty", propertyOrdinal, field: "kind" },
        "ambiguous_mechanics",
        "A weapon property may occur at most once in an equipment definition.",
      );
    }
    seen.add(property.kind);
    inspectProperty({
      weapon: input.weapon,
      property,
      propertyOrdinal,
      issues: input.issues,
    });
  }

  const hasTwoHanded = input.properties.some(
    (property) => property.kind === "two_handed",
  );
  const hasVersatile = input.properties.some(
    (property) => property.kind === "versatile",
  );
  if (hasTwoHanded && hasVersatile) {
    addIssue(
      input.issues,
      { tag: "weapon", field: "category" },
      "ambiguous_mechanics",
      "A weapon cannot declare both Two-Handed and Versatile properties.",
    );
  }
}

function inspectProperty(input: {
  readonly weapon: WeaponRecord;
  readonly property: WeaponPropertyDetail;
  readonly propertyOrdinal: PositiveInteger;
  readonly issues: EquipmentDefinitionProjectionIssue[];
}): void {
  Match.value(input.property).pipe(
    Match.when({ kind: "ammunition" }, (property) => {
      inspectRange(
        property.range,
        input.issues,
        input.propertyOrdinal,
        "weaponPropertyRange",
      );
      if (input.weapon.usage !== "ranged") {
        addIssue(
          input.issues,
          {
            tag: "weaponProperty",
            propertyOrdinal: input.propertyOrdinal,
            field: "ammunition",
          },
          "ambiguous_mechanics",
          "The Ammunition property requires a ranged weapon usage.",
        );
      }
    }),
    Match.when({ kind: "thrown" }, (property) => {
      inspectRange(
        property.range,
        input.issues,
        input.propertyOrdinal,
        "weaponPropertyRange",
      );
    }),
    Match.when({ kind: "versatile" }, (property) => {
      inspectDamage(property.damage, input.issues, input.propertyOrdinal);
      if (input.weapon.usage !== "melee") {
        addIssue(
          input.issues,
          {
            tag: "weaponProperty",
            propertyOrdinal: input.propertyOrdinal,
            field: "damage",
          },
          "ambiguous_mechanics",
          "The Versatile property requires a melee weapon usage.",
        );
      }
      if (property.damage.damageType !== input.weapon.damage.damageType) {
        addIssue(
          input.issues,
          {
            tag: "weaponProperty",
            propertyOrdinal: input.propertyOrdinal,
            field: "damage",
          },
          "ambiguous_mechanics",
          "Versatile damage must use the weapon's damage type.",
        );
      }
    }),
    Match.when({ kind: "finesse" }, () => undefined),
    Match.when({ kind: "heavy" }, () => undefined),
    Match.when({ kind: "light" }, () => undefined),
    Match.when({ kind: "loading" }, () => undefined),
    Match.when({ kind: "reach" }, () => undefined),
    Match.when({ kind: "two_handed" }, () => undefined),
    Match.exhaustive,
  );
}

function inspectRange(
  range: WeaponRange,
  issues: EquipmentDefinitionProjectionIssue[],
  propertyOrdinal?: PositiveInteger,
  tag: "weaponRange" | "weaponPropertyRange" = "weaponRange",
): void {
  const normalPath: EquipmentDefinitionProjectionPath =
    tag === "weaponRange" || propertyOrdinal === undefined
      ? { tag: "weaponRange", field: "normal" }
      : { tag: "weaponPropertyRange", propertyOrdinal, field: "normal" };
  const longPath: EquipmentDefinitionProjectionPath =
    tag === "weaponRange" || propertyOrdinal === undefined
      ? { tag: "weaponRange", field: "long" }
      : { tag: "weaponPropertyRange", propertyOrdinal, field: "long" };
  if (!positiveFinite(range.normal)) {
    addIssue(
      issues,
      normalPath,
      "unsupported_mechanics",
      "Weapon normal range must be a finite positive number.",
    );
  }
  if (!positiveFinite(range.long)) {
    addIssue(
      issues,
      longPath,
      "unsupported_mechanics",
      "Weapon long range must be a finite positive number.",
    );
  }
  if (positiveFinite(range.normal) && positiveFinite(range.long)) {
    if (range.long <= range.normal) {
      addIssue(
        issues,
        longPath,
        "ambiguous_mechanics",
        "Weapon long range must exceed its normal range.",
      );
    }
  }
}

function finish<T>(
  issues: EquipmentDefinitionProjectionIssue[],
  projection: T,
): Either.Either<T, EquipmentDefinitionProjectionIssues> {
  const [first, ...rest] = issues;
  return first === undefined
    ? Either.right(projection)
    : Either.left([first, ...rest]);
}

function addIssue(
  issues: EquipmentDefinitionProjectionIssue[],
  path: EquipmentDefinitionProjectionPath,
  reason: EquipmentDefinitionProjectionIssueReason,
  message: string,
): void {
  issues.push({ reason, path, message });
}

function positiveInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function finiteIntegerAtLeast(value: number, minimum: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= minimum;
}

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function nonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
