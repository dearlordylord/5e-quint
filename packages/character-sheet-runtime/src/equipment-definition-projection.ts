import { Match, Result } from "effect";

import { PositiveInteger } from "@dnd/shared/types";
import type { UnitMechanicsAdmissionIssueDraft } from "@dnd/surface/surface/mechanics-admission";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type {
  ArmorAcFormula,
  ArmorRecord,
  ShieldRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

// RAW: .references/srd-5.2.1/Equipment.md, "Armor" and "Armor Training".

type SourceFreeEquipmentFacts<Record> = Record extends unknown
  ? Omit<Record, "id" | "kind" | "name" | "provenance">
  : never;

export type CharacterSheetArmorDefinitionFacts =
  SourceFreeEquipmentFacts<ArmorRecord>;
export type CharacterSheetShieldDefinitionFacts =
  SourceFreeEquipmentFacts<ShieldRecord>;

/** Static equipment facts owned and consumed by Character Sheet. */
export type CharacterSheetEquipmentDefinitionProjection =
  | {
      readonly kind: "armor";
      readonly facts: CharacterSheetArmorDefinitionFacts;
    }
  | {
      readonly kind: "shield";
      readonly facts: CharacterSheetShieldDefinitionFacts;
    };

export type CharacterSheetEquipmentDefinitionIssue =
  UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>;
export type CharacterSheetEquipmentDefinitionIssues = readonly [
  CharacterSheetEquipmentDefinitionIssue,
  ...CharacterSheetEquipmentDefinitionIssue[],
];

const ARMOR_GENERAL_FACT_ORDINALS = {
  armorClass: 1,
  strengthRequirement: 2,
  stealth: 3,
  donDoff: 4,
  weight: 5,
  cost: 6,
} as const;

const SHIELD_GENERAL_FACT_ORDINALS = {
  armorClass: 1,
  donDoff: 2,
  weight: 3,
  cost: 4,
} as const;

/**
 * Parse one decoded Surface root into the source-free static facts used by the
 * sheet. Independent semantic failures accumulate before any facts escape.
 */
export function projectCharacterSheetEquipmentDefinition(
  unit: UnitRecord,
): Result.Result<
  CharacterSheetEquipmentDefinitionProjection,
  CharacterSheetEquipmentDefinitionIssues
> {
  return Match.value(unit).pipe(
    Match.when({ kind: "armor" }, projectArmorDefinition),
    Match.when({ kind: "shield" }, projectShieldDefinition),
    Match.when({ kind: "spell" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "class" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "subclass" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "class_feature" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "background" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "mastery" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "feat" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "species" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "species_trait" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "magic_item" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "armor_template" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "shield_template" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "weapon_template" }, unsupportedEquipmentDefinitionRoot),
    Match.when({ kind: "weapon" }, unsupportedEquipmentDefinitionRoot),
    Match.exhaustive,
  );
}

function projectArmorDefinition(
  armor: ArmorRecord,
): Result.Result<
  Extract<CharacterSheetEquipmentDefinitionProjection, { kind: "armor" }>,
  CharacterSheetEquipmentDefinitionIssues
> {
  const issues: CharacterSheetEquipmentDefinitionIssue[] = [];
  const armorClassValue = armorClassFormulaValue(armor.acFormula);
  if (!finiteIntegerAtLeast(armorClassValue, 0)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalFactPath(ARMOR_GENERAL_FACT_ORDINALS.armorClass),
      "Armor Class formula must contain a finite non-negative integer base or AC.",
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
      "ambiguous_mechanics",
      generalFactPath(ARMOR_GENERAL_FACT_ORDINALS.donDoff),
      "Armor donning and doffing times must match its category.",
    );
  }
  if (
    armor.strengthRequirement !== undefined &&
    !positiveInteger(armor.strengthRequirement)
  ) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalFactPath(ARMOR_GENERAL_FACT_ORDINALS.strengthRequirement),
      "Armor Strength requirement must be a finite positive integer when present.",
    );
  }
  if (!positiveFinite(armor.weightPounds)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalFactPath(ARMOR_GENERAL_FACT_ORDINALS.weight),
      "Armor weight must be a finite positive number.",
    );
  }
  if (!nonNegativeFinite(armor.costGp)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalFactPath(ARMOR_GENERAL_FACT_ORDINALS.cost),
      "Armor cost must be a finite non-negative number.",
    );
  }

  const facts = Match.value(armor).pipe(
    Match.when({ category: "light" }, (record) =>
      sourceFreeArmorCategoryFacts(record),
    ),
    Match.when({ category: "medium" }, (record) =>
      sourceFreeArmorCategoryFacts(record),
    ),
    Match.when({ category: "heavy" }, (record) =>
      sourceFreeArmorCategoryFacts(record),
    ),
    Match.exhaustive,
  );
  return finishProjection(issues, {
    kind: "armor",
    facts,
  });
}

function projectShieldDefinition(
  shield: ShieldRecord,
): Result.Result<
  Extract<CharacterSheetEquipmentDefinitionProjection, { kind: "shield" }>,
  CharacterSheetEquipmentDefinitionIssues
> {
  const issues: CharacterSheetEquipmentDefinitionIssue[] = [];
  if (!positiveInteger(shield.armorClassProjection.bonus)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalFactPath(SHIELD_GENERAL_FACT_ORDINALS.armorClass),
      "Shield Armor Class bonus must be a finite positive integer.",
    );
  } else if (shield.armorClassProjection.bonus !== 2) {
    addIssue(
      issues,
      "ambiguous_mechanics",
      generalFactPath(SHIELD_GENERAL_FACT_ORDINALS.armorClass),
      "An ordinary Shield must provide the SRD Armor Class bonus of 2.",
    );
  }
  if (!positiveFinite(shield.weightPounds)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalFactPath(SHIELD_GENERAL_FACT_ORDINALS.weight),
      "Shield weight must be a finite positive number.",
    );
  }
  if (!nonNegativeFinite(shield.costGp)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalFactPath(SHIELD_GENERAL_FACT_ORDINALS.cost),
      "Shield cost must be a finite non-negative number.",
    );
  }

  const {
    id: _id,
    kind: _kind,
    name: _name,
    provenance: _provenance,
    ...facts
  } = shield;
  return finishProjection(issues, {
    kind: "shield",
    facts,
  });
}

function armorClassFormulaValue(formula: ArmorAcFormula): number {
  return Match.value(formula).pipe(
    Match.when({ kind: "light_dex" }, ({ base }) => base),
    Match.when({ kind: "medium_dex_max_2" }, ({ base }) => base),
    Match.when({ kind: "heavy_fixed" }, ({ ac }) => ac),
    Match.exhaustive,
  );
}

function sourceFreeArmorCategoryFacts<Record extends ArmorRecord>(
  record: Record,
): Omit<Record, "id" | "kind" | "name" | "provenance"> {
  const {
    id: _id,
    kind: _kind,
    name: _name,
    provenance: _provenance,
    ...facts
  } = record;
  return facts;
}

function unsupportedEquipmentDefinitionRoot(
  unit: UnitRecord,
): Result.Result<never, CharacterSheetEquipmentDefinitionIssues> {
  return Result.fail([
    {
      reason: "no_admitted_procedure",
      mechanicsPath: rootMechanicsPath(),
      message: `Expected a Character Sheet armor or shield root, received ${unit.kind}.`,
    },
  ]);
}

function finishProjection<Projection>(
  issues: CharacterSheetEquipmentDefinitionIssue[],
  projection: Projection,
): Result.Result<Projection, CharacterSheetEquipmentDefinitionIssues> {
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Result.succeed(projection)
    : Result.fail([firstIssue, ...remainingIssues]);
}

function addIssue(
  issues: CharacterSheetEquipmentDefinitionIssue[],
  reason: CharacterSheetEquipmentDefinitionIssue["reason"],
  mechanicsPath: UnitMechanicsPath,
  message: string,
): void {
  issues.push({ reason, mechanicsPath, message });
}

function rootMechanicsPath(): UnitMechanicsPath {
  return unitMechanicsPath([{ kind: "singleton", role: "recordMechanics" }]);
}

function generalFactPath(ordinal: number): UnitMechanicsPath {
  return unitMechanicsPath([
    { kind: "singleton", role: "recordMechanics" },
    {
      kind: "occurrence",
      role: "generalFact",
      ordinal: PositiveInteger(ordinal),
    },
  ]);
}

function positiveInteger(value: number): boolean {
  return finiteIntegerAtLeast(value, 1);
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
