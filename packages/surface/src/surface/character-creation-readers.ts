import type {
  Ability,
  ArmorTrainingCategory,
  BackgroundAbilityScoreIncrease,
  BackgroundRecord,
  BackgroundToolProficiency,
  ClassFeatureGrant,
  ClassName,
  ClassRecord,
  OrcSpeciesRecord,
  SpeciesRecord,
  StartingEquipmentChoice,
  UnitRecord,
  WeaponProficiencyCategory,
  Skill,
} from "./types.ts";

export type SurfaceReadIssueCode = "unsupportedUnitKind";

export type SurfaceReadIssue = {
  readonly code: SurfaceReadIssueCode;
  readonly message: string;
  readonly unitId?: UnitRecord["id"];
};

export type UnitReaderResult<T> =
  | { readonly tag: "readable"; readonly value: T }
  | {
      readonly tag: "unreadable";
      readonly issues: readonly SurfaceReadIssue[];
    };

export type ClassCreationFacts = {
  readonly recordId: ClassRecord["id"];
  readonly className: ClassName;
  readonly hitPointDie: number;
  readonly savingThrowProficiencies: readonly Ability[];
  readonly skillProficiencyChoice: {
    readonly choose: number;
    readonly options: readonly Skill[];
  };
  readonly weaponProficiencies: readonly WeaponProficiencyCategory[];
  readonly armorTraining: readonly ArmorTrainingCategory[];
  readonly startingEquipment: readonly StartingEquipmentChoice[];
  readonly featureGrants: readonly ClassFeatureGrant[];
};

export type BackgroundCreationFacts = {
  readonly recordId: BackgroundRecord["id"];
  readonly abilityScoreIncrease: BackgroundAbilityScoreIncrease;
  readonly originFeatId: UnitRecord["id"];
  readonly skillProficiencies: readonly Skill[];
  readonly toolProficiency: BackgroundToolProficiency;
  readonly startingEquipment: readonly StartingEquipmentChoice[];
};

export type SpeciesCreationFacts = {
  readonly recordId: SpeciesRecord["id"];
  readonly species: SpeciesRecord["species"];
  readonly creatureType: SpeciesRecord["creatureType"];
  readonly size: SpeciesRecord["size"];
  readonly speed: SpeciesRecord["speed"];
  readonly traits: SpeciesRecord["traits"];
};

export type OrcSpeciesCreationFacts = SpeciesCreationFacts & {
  readonly recordId: OrcSpeciesRecord["id"];
  readonly species: OrcSpeciesRecord["species"];
  readonly creatureType: OrcSpeciesRecord["creatureType"];
  readonly size: OrcSpeciesRecord["size"];
  readonly speed: OrcSpeciesRecord["speed"];
  readonly traits: OrcSpeciesRecord["traits"];
};

export function readClassCreationFacts(
  unit: UnitRecord,
): UnitReaderResult<ClassCreationFacts> {
  if (unit.kind !== "class") {
    return unsupportedKind(unit, "class");
  }

  const value: ClassCreationFacts = {
    recordId: unit.id,
    className: unit.className,
    hitPointDie: unit.hitPointDie,
    savingThrowProficiencies: unit.savingThrowProficiencies,
    skillProficiencyChoice: unit.skillProficiencyChoice,
    weaponProficiencies: unit.weaponProficiencies,
    armorTraining: unit.armorTraining,
    startingEquipment: unit.startingEquipment,
    featureGrants: unit.featureGrants,
  };

  return {
    tag: "readable",
    value,
  };
}

export function readBackgroundCreationFacts(
  unit: UnitRecord,
): UnitReaderResult<BackgroundCreationFacts> {
  if (unit.kind !== "background") {
    return unsupportedKind(unit, "background");
  }

  return {
    tag: "readable",
    value: {
      recordId: unit.id,
      abilityScoreIncrease: unit.abilityScoreIncrease,
      originFeatId: unit.originFeatId,
      skillProficiencies: unit.skillProficiencies,
      toolProficiency: unit.toolProficiency,
      startingEquipment: unit.startingEquipment,
    },
  };
}

export function readSpeciesCreationFacts(
  unit: UnitRecord,
): UnitReaderResult<SpeciesCreationFacts> {
  if (unit.kind !== "species") {
    return unsupportedKind(unit, "species");
  }

  return {
    tag: "readable",
    value: readOrcSpeciesRecord(unit),
  };
}

export function readOrcSpeciesCreationFacts(
  unit: UnitRecord,
): UnitReaderResult<OrcSpeciesCreationFacts> {
  if (unit.kind !== "species") {
    return unsupportedKind(unit, "species");
  }

  return {
    tag: "readable",
    value: readOrcSpeciesRecord(unit),
  };
}

function readOrcSpeciesRecord(unit: OrcSpeciesRecord): OrcSpeciesCreationFacts {
  return {
    recordId: unit.id,
    species: unit.species,
    creatureType: unit.creatureType,
    size: unit.size,
    speed: unit.speed,
    traits: unit.traits,
  };
}

function unsupportedKind(
  unit: UnitRecord,
  expectedKind:
    | ClassRecord["kind"]
    | BackgroundRecord["kind"]
    | SpeciesRecord["kind"],
): UnitReaderResult<never> {
  return {
    tag: "unreadable",
    issues: [
      {
        code: "unsupportedUnitKind",
        message: `Expected ${expectedKind} record, received ${unit.kind}.`,
        unitId: unit.id,
      },
    ],
  };
}
