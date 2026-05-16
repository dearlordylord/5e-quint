import { Match, Option } from "effect";
import type {
  ClassFeatureRecord,
  ClassRecord,
  UnitRecord,
  WeaponProficiency,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import type { UnitCatalog } from "./types.ts";

const byKind = Match.discriminator("kind");

type WeaponMasteryChoiceMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "weapon_mastery_choice" }
>;

export type WeaponMasteryChoiceFeature = ClassFeatureRecord & {
  readonly mechanics: WeaponMasteryChoiceMechanics;
};

export type WeaponMasteryChoiceProfile = {
  readonly feature: WeaponMasteryChoiceFeature;
  readonly classRecord: ClassRecord;
  readonly choiceCount: number;
  readonly longRestChangeCount: number;
  readonly eligibleWeapons: readonly WeaponRecord[];
};

export function weaponMasteryChoiceProfileForFeature(input: {
  readonly featureUnitId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
}): WeaponMasteryChoiceProfile | undefined {
  const featureUnit = input.unitLibrary.getUnit(input.featureUnitId);
  if (Option.isNone(featureUnit)) return undefined;
  const feature = featureUnit.value;
  if (!isWeaponMasteryChoiceFeature(feature)) return undefined;
  const classRecord = classRecordForFeature(feature, input.unitLibrary);
  if (classRecord === undefined) return undefined;

  return {
    feature,
    classRecord,
    choiceCount: feature.mechanics.choose,
    longRestChangeCount:
      feature.mechanics.changeOn.kind === "long_rest"
        ? feature.mechanics.changeOn.count
        : 0,
    eligibleWeapons: eligibleWeaponMasteryWeapons({
      feature,
      classRecord,
      unitLibrary: input.unitLibrary,
    }),
  };
}

export function isWeaponMasteryChoiceFeature(
  unit: UnitRecord,
): unit is WeaponMasteryChoiceFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "weapon_mastery_choice"
  );
}

function eligibleWeaponMasteryWeapons(input: {
  readonly feature: WeaponMasteryChoiceFeature;
  readonly classRecord: ClassRecord;
  readonly unitLibrary: UnitCatalog;
}): readonly WeaponRecord[] {
  return input.unitLibrary.listUnits().filter(
    (unit): unit is WeaponRecord =>
      unit.kind === "weapon" &&
      weaponMatchesMasteryEligibility(
        unit,
        input.feature.mechanics.eligibleWeapons,
        input.classRecord,
      ),
  );
}

function classRecordForFeature(
  feature: ClassFeatureRecord,
  unitLibrary: UnitCatalog,
): ClassRecord | undefined {
  return unitLibrary
    .listUnits()
    .find(
      (unit): unit is ClassRecord =>
        unit.kind === "class" && unit.className === feature.className,
    );
}

function weaponMatchesMasteryEligibility(
  weapon: WeaponRecord,
  eligibility: WeaponMasteryChoiceMechanics["eligibleWeapons"],
  classRecord: ClassRecord,
): boolean {
  return Match.value(eligibility).pipe(
    byKind(
      "class_proficient_weapons",
      (classProficientWeapons) =>
        (classProficientWeapons.usage === undefined ||
          weapon.usage === classProficientWeapons.usage) &&
        classRecord.weaponProficiencies.some((proficiency) =>
          weaponMatchesProficiency(weapon, proficiency),
        ),
    ),
    Match.exhaustive,
  );
}

function weaponMatchesProficiency(
  weapon: WeaponRecord,
  proficiency: WeaponProficiency,
): boolean {
  return Match.value(proficiency).pipe(
    byKind(
      "weapon_category",
      (categoryProficiency) => weapon.category === categoryProficiency.category,
    ),
    byKind(
      "weapon_category_with_properties",
      (propertyProficiency) =>
        weapon.category === propertyProficiency.category &&
        weapon.properties?.some((property) =>
          propertyProficiency.anyOfProperties.includes(property.kind),
        ) === true,
    ),
    Match.exhaustive,
  );
}
