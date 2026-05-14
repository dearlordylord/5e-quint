import {
  battleUnitRefWithSupportProfiles,
  type CharacterBattleCreatureInit,
  type BattleUnitRef,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  UnitRecord,
  WeaponMasteryName,
} from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

type CharacterBattleWeaponMasterySelection = NonNullable<
  CharacterBattleCreatureInit["weaponMasteries"]
>[number];

const BATTLE_SUPPORTED_MASTERY_UNIT_IDS: Partial<
  Record<WeaponMasteryName, UnitRecord["id"]>
> = {
  sap: "mastery_sap",
  topple: "mastery_topple",
};

export function characterUnitRefsWithBattleSupportProfiles(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  weaponMasteries?: readonly CharacterBattleWeaponMasterySelection[],
): Either.Either<
  readonly BattleUnitRef[],
  ReadonlyNonEmptyArray<BattleSupportProfileIssue>
> {
  const selectedWeaponMasteries =
    weaponMasteries === undefined
      ? characterBattleWeaponMasterySelections(build, unitLibrary)
      : Either.right(weaponMasteries);
  if (Either.isLeft(selectedWeaponMasteries)) {
    return Either.left(selectedWeaponMasteries.left);
  }
  const buildUnitRefs = traverseValidation(
    characterBuildUnitRefs(build, unitLibrary),
    (unitRef) => withBattleSupportProfiles(unitRef, unitLibrary),
  );
  if (Either.isLeft(buildUnitRefs)) {
    return buildUnitRefs;
  }

  const battleMasteryUnitRefs = traverseValidation(
    battleSupportedMasteryUnitIdsForSelectedWeapons(
      selectedWeaponMasteries.right,
      unitLibrary,
    ).map((unitId) => ({ unitId })),
    (unitRef) => withBattleSupportProfiles(unitRef, unitLibrary),
  );
  if (Either.isLeft(battleMasteryUnitRefs)) {
    return battleMasteryUnitRefs;
  }

  return Either.right(
    uniqueBattleUnitRefs([...buildUnitRefs.right, ...battleMasteryUnitRefs.right]),
  );
}

export type BattleSupportProfileIssue = {
  readonly tag: "battleSupportProfileIssue";
  readonly message: string;
};

function battleSupportProfileIssue(
  message: string,
): Either.Either<never, BattleSupportProfileIssue> {
  return Either.left({ tag: "battleSupportProfileIssue", message });
}

function withBattleSupportProfiles(
  unitRef: ReturnType<typeof characterBuildUnitRefs>[number],
  unitLibrary: UnitCatalog,
): Either.Either<BattleUnitRef, BattleSupportProfileIssue> {
  const unitOption = unitLibrary.getUnit(unitRef.unitId);
  if (Option.isNone(unitOption)) {
    return battleSupportProfileIssue(
      `Unknown Character Build Unit for battle initialization: ${unitRef.unitId}.`,
    );
  }
  const battleUnitRef = battleUnitRefWithSupportProfiles({
    unitRef,
    unit: unitOption.value,
  });
  return Either.isLeft(battleUnitRef)
    ? battleSupportProfileIssue(battleUnitRef.left.message)
    : Either.right(battleUnitRef.right);
}

export function characterBattleWeaponMasterySelections(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBattleWeaponMasterySelection[],
  ReadonlyNonEmptyArray<BattleSupportProfileIssue>
> {
  const selections: CharacterBattleWeaponMasterySelection[] = [];
  const issues: BattleSupportProfileIssue[] = [];

  for (const feature of build.features) {
    if (feature.kind !== "selectedClassChoice") {
      continue;
    }
    const source = unitLibrary.getUnit(feature.selectedFromUnitId);
    if (Option.isNone(source)) {
      issues.push({
        tag: "battleSupportProfileIssue",
        message: `Unknown Character Build Unit for battle initialization: ${feature.selectedFromUnitId}.`,
      });
      continue;
    }
    if (
      source.value.kind !== "class_feature" ||
      source.value.mechanics.family !== "weapon_mastery_choice"
    ) {
      continue;
    }

    const selected = unitLibrary.getUnit(feature.unitId);
    if (Option.isNone(selected)) {
      issues.push({
        tag: "battleSupportProfileIssue",
        message: `Unknown selected Weapon Mastery Unit for battle initialization: ${feature.unitId}.`,
      });
      continue;
    }
    if (selected.value.kind !== "weapon") {
      issues.push({
        tag: "battleSupportProfileIssue",
        message: `Expected selected Weapon Mastery option to be a weapon Unit: ${feature.unitId}.`,
      });
      continue;
    }
    selections.push({ weaponUnitId: selected.value.id });
  }

  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return Either.left([
      firstIssue,
      ...issues.slice(1),
    ] as ReadonlyNonEmptyArray<BattleSupportProfileIssue>);
  }

  return Either.right(uniqueWeaponMasterySelections(selections));
}

function battleSupportedMasteryUnitIdsForSelectedWeapons(
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  const unitIds = weaponMasteries.flatMap((mastery) => {
    const weapon = unitLibrary.getUnit(mastery.weaponUnitId);
    if (Option.isNone(weapon) || weapon.value.kind !== "weapon") {
      return [];
    }
    const masteryUnitId = BATTLE_SUPPORTED_MASTERY_UNIT_IDS[weapon.value.mastery];
    return masteryUnitId === undefined ? [] : [masteryUnitId];
  });
  return unitIds.filter((unitId, index) => unitIds.indexOf(unitId) === index);
}

function uniqueBattleUnitRefs(
  refs: readonly BattleUnitRef[],
): readonly BattleUnitRef[] {
  return refs.filter(
    (ref, index) =>
      refs.findIndex((candidate) => candidate.unitId === ref.unitId) === index,
  );
}

function uniqueWeaponMasterySelections(
  selections: readonly CharacterBattleWeaponMasterySelection[],
): readonly CharacterBattleWeaponMasterySelection[] {
  return selections.filter(
    (selection, index) =>
      selections.findIndex(
        (candidate) => candidate.weaponUnitId === selection.weaponUnitId,
      ) === index,
  );
}
