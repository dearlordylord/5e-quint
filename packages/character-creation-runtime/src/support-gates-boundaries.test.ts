import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { SUPPORTED_ABILITY_SCORE_METHODS } from "@dnd/shared-algebras/ability-score-algebra";
import { describe, expect, test } from "vitest";

import {
  choiceHole,
  draftSource,
  loadoutSource,
  unitSource,
} from "./hole-factories.ts";
import {
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
  supportedUnitOptionIdsForSource,
  supportsCharacterBuildResourceUnitId,
  unitRefsForSupportedSelectedUnitChoice,
  unsupportedHoleSelectionOptionId,
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

  test("distinguishes non-choice holes from absent equipment support maps", () => {
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
    expect(
      supportedUnitOptionIdsForSource(
        unitSource(
          authoredUnitId("synthetic_class_without_equipment_map"),
          CLASS_EQUIPMENT_CHOICE_KEY,
        ),
        CHARACTER_CREATION_SUPPORT_PROFILE,
      ),
    ).toEqual([]);

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
