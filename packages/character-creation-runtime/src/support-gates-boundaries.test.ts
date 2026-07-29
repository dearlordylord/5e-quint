import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";

import { progressionOptionId } from "./phase1-manifest.ts";
import { creationChoiceOptionId } from "./types.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  finalizableSpeciesUnitIds,
  isSupportedProgression,
  speciesUnitIdsWithSupportedTraitChoices,
  supportedBackgroundUnitIds,
  supportedClassUnitIds,
  supportedEquipmentPurchaseChoiceCount,
  supportedLoadoutChoices,
  supportedProgressionForOptionId,
  supportedProgressionsForClass,
  supportedPurchasableEquipmentUnitIds,
  supportedPurchasableEquipmentUnitIdsForClass,
  supportedSpeciesUnitIds,
  supportsCharacterBuildResourceUnitId,
} from "./support-gates.ts";

describe("character creation support-profile boundaries", () => {
  test("projects catalog admission sets from their single support-profile owners", () => {
    const supportedClasses = supportedClassUnitIds(
      CHARACTER_CREATION_SUPPORT_PROFILE,
    );

    expect(new Set(supportedClasses).size).toBe(supportedClasses.length);
    expect(supportedClasses).toContain(authoredUnitId("class_fighter"));
    expect(
      supportedBackgroundUnitIds(CHARACTER_CREATION_SUPPORT_PROFILE),
    ).toEqual(CHARACTER_CREATION_SUPPORT_PROFILE.backgroundUnitIds);
    expect(
      supportedPurchasableEquipmentUnitIds(CHARACTER_CREATION_SUPPORT_PROFILE),
    ).toEqual(CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds);
    expect(
      supportedEquipmentPurchaseChoiceCount(CHARACTER_CREATION_SUPPORT_PROFILE),
    ).toBe(3);
    expect(supportedLoadoutChoices(CHARACTER_CREATION_SUPPORT_PROFILE)).toEqual(
      CHARACTER_CREATION_SUPPORT_PROFILE.loadoutChoices,
    );

    expect(supportedSpeciesUnitIds()).toEqual(
      speciesUnitIdsWithSupportedTraitChoices(),
    );
    expect(finalizableSpeciesUnitIds()).toEqual(
      speciesUnitIdsWithSupportedTraitChoices(),
    );
  });

  test("selects class-scoped progression, purchase, and resource support", () => {
    const fighterUnitId = authoredUnitId("class_fighter");
    const wizardUnitId = authoredUnitId("class_wizard");
    const fighterProgressions = supportedProgressionsForClass(
      fighterUnitId,
      CHARACTER_CREATION_SUPPORT_PROFILE,
    );
    const fighterProgression = fighterProgressions[0];
    if (fighterProgression === undefined) {
      throw new Error("The support profile must admit a Fighter progression.");
    }

    expect(
      isSupportedProgression(
        fighterProgression,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBe(true);
    expect(
      supportedProgressionForOptionId(
        progressionOptionId(fighterProgression),
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toEqual(fighterProgression);
    expect(
      supportedProgressionForOptionId(
        creationChoiceOptionId("synthetic:unsupported:progression"),
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBeUndefined();
    expect(
      supportedProgressionsForClass(
        authoredUnitId("synthetic_class"),
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toEqual([]);

    expect(
      supportedPurchasableEquipmentUnitIdsForClass(
        fighterUnitId,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toEqual(CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds);
    expect(
      supportedPurchasableEquipmentUnitIdsForClass(
        wizardUnitId,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).not.toEqual(
      CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds,
    );

    const supportedResourceUnitId =
      CHARACTER_CREATION_SUPPORT_PROFILE.characterBuildResourceUnitIds[0];
    if (supportedResourceUnitId === undefined) {
      throw new Error(
        "The support profile must admit a CharacterBuild resource.",
      );
    }
    expect(
      supportsCharacterBuildResourceUnitId(
        supportedResourceUnitId,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBe(true);
    expect(
      supportsCharacterBuildResourceUnitId(
        authoredUnitId("synthetic_resource"),
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBe(false);
  });
});
