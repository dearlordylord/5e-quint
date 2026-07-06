// KERNEL-COVERAGE: runtime-owner SHEET.WEAPON_MASTERY.RESELECTION
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.weapon-mastery-reselection
import {
  classLevelForUnit,
  weaponMasteryChoiceProfileForFeature,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { Either } from "effect";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetWeaponMasterySelectedReferenceProjection,
  type CharacterSheetWeaponMasterySelectedReferenceProjectionRoute,
} from "./sheet-types.ts";

const CHARACTER_SHEET_WEAPON_MASTERY_SELECTED_REFERENCE_ROUTE = [
  {
    kind: "retainCharacterSheetSelectedReferences",
    subject: "selectedReferenceProjection",
    owner: "selectedReference",
  },
  {
    kind: "projectCharacterSheetFacts",
    subject: "buildFactsProjection",
    owner: "buildProjection",
  },
] as const satisfies CharacterSheetWeaponMasterySelectedReferenceProjectionRoute;

export function characterSheetWeaponMasterySelectedReferenceProjection(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly featureUnitId: UnitRecord["id"];
}): Either.Either<
  CharacterSheetWeaponMasterySelectedReferenceProjection,
  CharacterSheetIssue
> {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: input.featureUnitId,
    unitLibrary: input.unitLibrary,
  });
  if (profile === undefined) {
    return characterSheetIssue(
      "Weapon Mastery selected-reference projection requires a Weapon Mastery class-feature Unit.",
    );
  }
  const classLevel = classLevelForUnit(
    input.sheet.build.progression,
    profile.classRecord.id,
  );
  const levelProfile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: input.featureUnitId,
    unitLibrary: input.unitLibrary,
    classLevel,
  });
  if (levelProfile === undefined) {
    return characterSheetIssue(
      "Weapon Mastery selected-reference projection requires a Weapon Mastery class-feature Unit.",
    );
  }
  return Either.right({
    featureUnitId: levelProfile.feature.id,
    classUnitId: levelProfile.classRecord.id,
    selectedWeaponUnitIds: weaponMasterySelectedWeaponUnitIds(
      input.sheet,
      levelProfile.feature.id,
    ),
    choiceCount: levelProfile.choiceCount,
    longRestChangeCount: levelProfile.longRestChangeCount,
    eligibleWeaponUnitIds: levelProfile.eligibleWeapons.map(
      (weapon) => weapon.id,
    ),
    qRoute: CHARACTER_SHEET_WEAPON_MASTERY_SELECTED_REFERENCE_ROUTE,
  });
}

function weaponMasterySelectedWeaponUnitIds(
  sheet: CharacterSheet,
  featureUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] {
  return sheet.build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === featureUnitId
      ? [feature.unitId]
      : [],
  );
}
