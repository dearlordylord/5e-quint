import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Hp } from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterSheetId,
  characterSheetWeaponMasterySelectedReferenceProjection,
  createFreshCharacterSheet,
} from "./index.ts";
import {
  armorClassBuild,
  requireSuccess,
  unitLibrary,
  weaponMasteryBuild,
} from "./test-support.test-support.ts";

const projectionIssue =
  "Weapon Mastery selected-reference projection requires a Weapon Mastery class-feature Unit.";
const unownedClassIssue =
  "Weapon Mastery selected-reference projection requires the Character Build to own the feature class.";

describe("Character Sheet runtime / Weapon Mastery selected references", () => {
  test("projects the selected proficient weapons and Surface choice profile", () => {
    const projection = requireSuccess(
      characterSheetWeaponMasterySelectedReferenceProjection({
        sheet: freshSheet(
          weaponMasteryBuild({
            startingClass: "class_paladin",
            featureUnitId: "paladin_weapon_mastery",
            selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
          }),
        ),
        unitLibrary,
        featureUnitId: authoredUnitId("paladin_weapon_mastery"),
      }),
    );

    expect(projection).toMatchObject({
      featureUnitId: "paladin_weapon_mastery",
      classUnitId: "class_paladin",
      selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
      choiceCount: 2,
      longRestChangeCount: 2,
      qRoute: [
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
      ],
    });
    expect(projection.eligibleWeaponUnitIds).toEqual(
      expect.arrayContaining(["weapon_longsword", "weapon_dagger"]),
    );
  });

  test("rejects a non-Weapon-Mastery feature", () => {
    const result = characterSheetWeaponMasterySelectedReferenceProjection({
      sheet: freshSheet(armorClassBuild({ startingClass: "class_paladin" })),
      unitLibrary,
      featureUnitId: authoredUnitId("paladin_lay_on_hands"),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(projectionIssue);
    }
  });

  test("rejects a Weapon Mastery feature whose class is absent from the build", () => {
    const result = characterSheetWeaponMasterySelectedReferenceProjection({
      sheet: freshSheet(armorClassBuild({ startingClass: "class_fighter" })),
      unitLibrary,
      featureUnitId: authoredUnitId("paladin_weapon_mastery"),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(unownedClassIssue);
    }
  });
});

function freshSheet(
  build: Parameters<typeof createFreshCharacterSheet>[0]["build"],
) {
  return requireSuccess(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:weapon-mastery-projection"),
      build,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    }),
  );
}
