import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { SUPPORTED_ABILITY_SCORE_METHODS } from "@dnd/shared-algebras/ability-score-algebra";
import { describe, expect, test } from "vitest";
import { computeTotalLevel } from "./character-progression-types.ts";

import {
  choiceHole,
  draftSource,
  loadoutSource,
  unitSource,
} from "./hole-factories.ts";
import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import {
  creationChoiceOptionId,
  creationHoleId,
  exactChoiceCardinality,
  type CreationHole,
} from "./types.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  finalizableSpeciesUnitIds,
  isSupportedProgression,
  speciesUnitIdsWithSupportedTraitChoices,
  supportedBackgroundUnitIds,
  supportedClassUnitIds,
  supportedEquipmentPurchaseChoiceCount,
  supportedLoadoutChoices,
  supportedDraftOptionIds,
  supportedHoleOptionIds,
  supportedProgressionForOptionId,
  supportedProgressionsForClass,
  supportedPurchasableEquipmentUnitIds,
  supportedPurchasableEquipmentUnitIdsForClass,
  supportedSpeciesUnitIds,
  supportedUnitOptionIds,
  supportsCharacterBuildResourceUnitId,
  unitRefsForSupportedSelectedUnitChoice,
  unsupportedHoleSelectionOptionId,
} from "./support-gates.ts";

describe("character creation support-profile boundaries", () => {
  test.each([
    ["class_barbarian", 3],
    ["class_bard", 3],
    ["class_cleric", 3],
    ["class_druid", 3],
    ["class_fighter", 5],
    ["class_monk", 3],
    ["class_paladin", 3],
    ["class_ranger", 9],
    ["class_rogue", 10],
    ["class_sorcerer", 3],
    ["class_warlock", 3],
    ["class_wizard", 5],
  ] as const)(
    "derives every %s progression through its level-%i capability frontier",
    (classUnitId, throughClassLevel) => {
      expect(
        supportedProgressionsForClass(
          authoredUnitId(classUnitId),
          CHARACTER_CREATION_SUPPORT_PROFILE,
        )
          .filter((progression) =>
            progression.advancements.every(
              (entry) => entry.classUnitId === progression.startingClass,
            ),
          )
          .map(computeTotalLevel),
      ).toEqual(
        Array.from({ length: throughClassLevel }, (_, index) => index + 1),
      );
    },
  );

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

  test("distinguishes non-choice holes while admitting surfaced equipment choices", () => {
    const abilityScoreHole: CreationHole = {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      source: draftSource("draft.abilityScoreGeneration"),
      methods: SUPPORTED_ABILITY_SCORE_METHODS,
    };

    expect(
      supportedDraftOptionIds(
        abilityScoreHole.source,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBeUndefined();
    expect(
      supportedHoleOptionIds(
        abilityScoreHole,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBeUndefined();
    expect(
      unsupportedHoleSelectionOptionId(
        abilityScoreHole,
        [],
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBeUndefined();
    const surfacedEquipmentHole = choiceHole({
      source: unitSource(
        authoredUnitId("synthetic_class_with_item_bundle"),
        CLASS_EQUIPMENT_CHOICE_KEY,
      ),
      cardinality: exactChoiceCardinality(1),
      options: [
        {
          optionId: creationChoiceOptionId("option_a"),
          label: "Item bundle",
        },
        {
          optionId: creationChoiceOptionId("option_b"),
          label: "Coin grant",
        },
      ],
    });
    if (surfacedEquipmentHole?.kind !== "choice") {
      throw new Error("The surfaced equipment fixture must be a choice hole.");
    }
    expect(
      supportedHoleOptionIds(
        surfacedEquipmentHole,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toEqual(["option_a", "option_b"]);
    expect(
      unsupportedHoleSelectionOptionId(
        surfacedEquipmentHole,
        [creationChoiceOptionId("option_a")],
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBeUndefined();

    const surfacedBackgroundEquipmentHole = choiceHole({
      source: unitSource(
        authoredUnitId("synthetic_background_with_item_bundle"),
        BACKGROUND_EQUIPMENT_CHOICE_KEY,
      ),
      cardinality: exactChoiceCardinality(1),
      options: surfacedEquipmentHole.options,
    });
    if (surfacedBackgroundEquipmentHole?.kind !== "choice") {
      throw new Error(
        "The surfaced background equipment fixture must be a choice hole.",
      );
    }
    expect(
      supportedHoleOptionIds(
        surfacedBackgroundEquipmentHole,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toEqual(["option_a", "option_b"]);

    const unsupportedLoadoutHole = choiceHole({
      source: loadoutSource(
        authoredUnitId("synthetic_unsupported_equipment"),
        "weapon",
      ),
      cardinality: exactChoiceCardinality(1),
      options: [
        {
          optionId: creationChoiceOptionId("synthetic_unsupported_equipment"),
          label: "Synthetic unsupported equipment",
        },
      ],
    });
    if (unsupportedLoadoutHole?.kind !== "choice") {
      throw new Error("The unsupported loadout fixture must be a choice hole.");
    }
    expect(
      supportedHoleOptionIds(
        unsupportedLoadoutHole,
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toBeUndefined();

    expect(
      supportedUnitOptionIds(CLASS_FEATURE_FEAT_CHOICE_KEY, {
        ...CHARACTER_CREATION_SUPPORT_PROFILE,
        unitOptionIdsByChoiceKey: {},
      }),
    ).toEqual([]);

    const referencedUnitId = authoredUnitId("synthetic_referenced_unit");
    expect(
      unitRefsForSupportedSelectedUnitChoice(
        unitSource(
          authoredUnitId("synthetic_feature"),
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        ),
        [{}, { unitRef: { unitId: referencedUnitId } }],
      ),
    ).toEqual([referencedUnitId]);
  });
});
