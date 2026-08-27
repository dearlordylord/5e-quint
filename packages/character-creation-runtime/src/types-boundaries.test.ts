import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  boundedChoiceCardinality,
  characterEquipmentItemId,
  characterEquipmentItemSourceFromId,
  characterEquipmentItemUnitId,
  characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId,
  characterDraconicAncestrySelection,
  choiceCardinalityBounds,
  choiceCardinalityMax,
  exactChoiceCardinality,
  isCharacterBuildToolProficiencyId,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  loadoutSourceKey,
  parseCharacterEquipmentItemId,
  parseCreationHoleId,
  parseLoadoutSourceKey,
  parseUnitChoiceSourceKey,
  sorcererMetamagicOptionId,
  toolProficiencyId,
  unitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type CharacterEquipmentItemId,
} from "./index.ts";
import {
  isCharacterSpeciesSizeSelection,
  nonEmptyReadonlyArray,
} from "./types.ts";

function expectRight<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) {
    expect.fail(
      `Expected a parsed fixture, received ${String(result.failure)}.`,
    );
  }
  return result.success;
}

describe("character-creation primitive boundaries", () => {
  test("parses supported closed identities and rejects unknown values", () => {
    expect(
      sorcererMetamagicOptionId("sorcerer_empowered_spell"),
    ).toHaveProperty("_tag", "Success");
    expect(sorcererMetamagicOptionId("synthetic_unknown")).toMatchObject({
      _tag: "Failure",
      failure: { tag: "unsupportedSorcererMetamagicOptionId" },
    });
    expect(unitChoiceKey("class_feature_feat_choice")).toHaveProperty(
      "_tag",
      "Success",
    );
    expect(unitChoiceKey("synthetic_unknown")).toMatchObject({
      _tag: "Failure",
      failure: { tag: "unsupportedUnitChoiceKey" },
    });
    expect(isCharacterBuildToolProficiencyId("thieves_tools")).toBe(true);
    expect(isCharacterBuildToolProficiencyId("synthetic_unknown")).toBe(false);
    expect(toolProficiencyId("thieves_tools")).toBe("thieves_tools");
    expect(isCharacterSpeciesSizeSelection("small")).toBe(true);
    expect(isCharacterSpeciesSizeSelection("large")).toBe(false);
    expect(isCharacterSpeciesSizeSelection(undefined)).toBe(false);
    expect(characterDraconicAncestrySelection("synthetic_ancestor")).toBe(
      "synthetic_ancestor",
    );
  });

  test("constructs only valid choice cardinalities and projects both shapes", () => {
    for (const count of [0, -1, 1.5, Number.NaN]) {
      expect(exactChoiceCardinality(count)).toBeUndefined();
    }
    const exact = exactChoiceCardinality(2);
    expect(exact).toEqual({ tag: "exactly", count: 2 });
    if (exact === undefined) {
      expect.fail("Expected exact cardinality fixture.");
    }
    expect(choiceCardinalityBounds(exact)).toEqual({ min: 2, max: 2 });
    expect(choiceCardinalityMax(exact)).toBe(2);

    const invalidBounds = [
      { min: 0.5, max: 2 },
      { min: 0, max: 2.5 },
      { min: -1, max: 2 },
      { min: 0, max: 0 },
      { min: 3, max: 2 },
    ];
    for (const bounds of invalidBounds) {
      expect(boundedChoiceCardinality(bounds)).toBeUndefined();
    }
    expect(boundedChoiceCardinality({ min: 2, max: 2 })).toEqual(exact);
    const between = boundedChoiceCardinality({ min: 0, max: 2 });
    expect(between).toEqual({ tag: "between", min: 0, max: 2 });
    if (between === undefined) {
      expect.fail("Expected bounded cardinality fixture.");
    }
    expect(choiceCardinalityBounds(between)).toEqual({ min: 0, max: 2 });
    expect(choiceCardinalityMax(between)).toBe(2);
  });

  test("round-trips Unit-choice source keys and reports each malformed shape", () => {
    expect(unitChoiceSourceUnitId("")).toMatchObject({
      _tag: "Failure",
      failure: { tag: "unitChoiceSourceUnitIdEmpty" },
    });
    const source = {
      tag: "unitChoice",
      unitId: expectRight(unitChoiceSourceUnitId("synthetic:feature")),
      choiceKey: expectRight(unitChoiceKey("class_feature_feat_choice")),
    } as const;
    const key = unitChoiceSourceKey(source);
    expect(parseUnitChoiceSourceKey(key)).toEqual(Result.succeed(source));
    expect(
      parseCreationHoleId(unitChoiceSourceHoleIdText(source)),
    ).not.toBeNull();

    const malformedCases = [
      [
        "x:1:a:c:class_feature_feat_choice",
        "unitChoiceSourceKeyPrefixMismatch",
      ],
      ["u:1", "unitChoiceSourceKeyMissingLength"],
      ["u:x:a:c:class_feature_feat_choice", "unitChoiceSourceKeyInvalidLength"],
      [
        "u:01:a:c:class_feature_feat_choice",
        "unitChoiceSourceKeyInvalidLength",
      ],
      ["u:2:a", "unitChoiceSourceKeyInvalidLength"],
      ["u:1: :c:class_feature_feat_choice", "unitChoiceSourceKeyInvalidLength"],
      [
        "u:1:a:x:class_feature_feat_choice",
        "unitChoiceSourceKeyMissingChoicePrefix",
      ],
      ["u:1:a:c:synthetic_unknown", "unitChoiceSourceKeyUnsupportedChoiceKey"],
    ] as const;
    for (const [value, tag] of malformedCases) {
      expect(parseUnitChoiceSourceKey(value)).toMatchObject({
        _tag: "Failure",
        failure: { tag },
      });
      expect(parseCreationHoleId(`cc:unit-source:${value}`)).toBeNull();
    }
  });

  test("round-trips loadout source keys and reports each malformed shape", () => {
    expect(loadoutEquipmentUnitId("")).toMatchObject({
      _tag: "Failure",
      failure: { tag: "loadoutEquipmentUnitIdEmpty" },
    });
    const source = {
      tag: "loadout",
      equipmentUnitId: expectRight(
        loadoutEquipmentUnitId("synthetic:equipment"),
      ),
      slot: "weapon",
    } as const;
    expect(
      characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId(
        source.equipmentUnitId,
      ),
    ).toBe("synthetic:equipment");
    const key = loadoutSourceKey(source);
    expect(parseLoadoutSourceKey(key)).toEqual(Result.succeed(source));
    expect(parseCreationHoleId(loadoutSourceHoleIdText(source))).not.toBeNull();

    const malformedCases = [
      ["x:1:a:s:weapon", "loadoutSourceKeyPrefixMismatch"],
      ["e:1", "loadoutSourceKeyMissingLength"],
      ["e:x:a:s:weapon", "loadoutSourceKeyInvalidLength"],
      ["e:01:a:s:weapon", "loadoutSourceKeyInvalidLength"],
      ["e:2:a", "loadoutSourceKeyInvalidLength"],
      ["e:1: :s:weapon", "loadoutSourceKeyInvalidLength"],
      ["e:1:a:x:weapon", "loadoutSourceKeyMissingSlotPrefix"],
      ["e:1:a:s:synthetic_unknown", "loadoutSourceKeyUnsupportedSlot"],
    ] as const;
    for (const [value, tag] of malformedCases) {
      expect(parseLoadoutSourceKey(value)).toMatchObject({
        _tag: "Failure",
        failure: { tag },
      });
      expect(parseCreationHoleId(`cc:loadout-source:${value}`)).toBeNull();
    }
  });

  test("parses only canonical draft and equipment identities", () => {
    expect(parseCreationHoleId("cc:draft:draft.background")).toBe(
      "cc:draft:draft.background",
    );
    expect(parseCreationHoleId("cc:draft:synthetic_unknown")).toBeNull();
    expect(parseCreationHoleId("synthetic_unknown")).toBeNull();

    expect(characterEquipmentItemUnitId("")).toMatchObject({
      _tag: "Failure",
      failure: { tag: "characterEquipmentItemUnitIdEmpty" },
    });
    const unitId = expectRight(
      characterEquipmentItemUnitId("synthetic_equipment"),
    );
    for (const slot of ["armor", "shield", "main", "off"] as const) {
      const itemId = characterEquipmentItemId({ slot, unitId });
      expect(parseCharacterEquipmentItemId(itemId)).toEqual(
        Result.succeed({ slot, unitId }),
      );
      expect(characterEquipmentItemSourceFromId(itemId)).toEqual({
        slot,
        unitId,
      });
    }
    expect(parseCharacterEquipmentItemId("synthetic:equipment")).toMatchObject({
      _tag: "Failure",
      failure: { tag: "characterEquipmentItemIdSlotUnsupported" },
    });
    expect(parseCharacterEquipmentItemId("armor:")).toMatchObject({
      _tag: "Failure",
      failure: { tag: "characterEquipmentItemIdUnitIdEmpty", slot: "armor" },
    });
    // The public constructor is the only safe producer; this cast deliberately
    // violates its erased brand to exercise the internal invariant assertion.
    expect(() =>
      characterEquipmentItemSourceFromId(
        "synthetic_invalid_item_id" as CharacterEquipmentItemId,
      ),
    ).toThrow(
      "CharacterEquipmentItemId invariant violated: synthetic_invalid_item_id",
    );
  });

  test("distinguishes empty and non-empty collections", () => {
    expect(nonEmptyReadonlyArray([])).toBeUndefined();
    expect(nonEmptyReadonlyArray(["a"])).toEqual(["a"]);
    expect(nonEmptyReadonlyArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });
});
