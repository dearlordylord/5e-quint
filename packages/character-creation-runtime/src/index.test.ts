import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";
import { Either, Option } from "effect";
import fc from "fast-check";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type {
  ProficiencyGrantSubject,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";

import {
  characterDraftId,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  exactChoiceCardinality,
  boundedChoiceCardinality,
  characterBuildUnitRefs,
  computeTotalLevel,
  CHARACTER_EQUIPMENT_ITEM_SLOTS,
  LOADOUT_SLOTS,
  UNIT_CHOICE_KEYS,
  abilityScoreAssignment,
  classUnitIdFromUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  discoverCreationHoles,
  draftRevision,
  fillCreationHoles,
  finalizeCharacterDraft,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  loadoutSourceKey,
  parseCharacterEquipmentItemId,
  parseCharacterDraft,
  parseCreationHoleId,
  parseLoadoutSourceKey,
  parseUnitChoiceSourceKey,
  startingClassUnitId,
  unitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type CharacterDraft,
  type CharacterChoiceSelection,
  type ChoiceCardinality,
  type CreationFill,
  type CreationChoiceOptionId,
  type CreationFillIssue,
  type CreationHole,
  type CreationHoleIdText,
  type AbilityScoreAssignment,
  type CharacterEquipmentItemSlot,
  type LoadoutSlot,
  type UnitCatalog,
  type CharacterProgression,
  type ClassHitPointRule,
} from "./index.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import { classUnitId } from "./character-progression-types.ts";
import {
  applyBackgroundAbilityScoreIncrease,
  buildCharacterBuild,
  finalizedBuildEquipment,
  supportedChoiceHolesBySource,
} from "./finalization.ts";
import { qntLoadoutSlot } from "./qnt-loadout-bridge.test-support.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  type SupportedLoadoutChoice,
} from "./support-gates.ts";
import {
  abilityScoreIncreaseChoiceOptions,
  progressionOptionId,
} from "./phase1-manifest.ts";
import {
  decodeAbilityScoreIncreaseOptionId,
  decodeProficiencyGrantSubjectOptionId,
  proficiencyGrantSubjectOption,
} from "./choice-option-codecs.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

function testAbilityScoreAssignment(
  scores: RawAbilityScoreAssignment,
): AbilityScoreAssignment {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.right;
}

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

function expectRight<T, E>(result: Either.Either<T, E>): T {
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }

  return result.right;
}

function testProgression(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  hitPointRule: ClassHitPointRule = classLevel === 1
    ? { tag: "levelOneMaximumHitDie" }
    : { tag: "fixedHigherLevelGain" },
): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({ unitLibrary, classUnitId });
  if (Either.isLeft(parsedClassUnitId)) {
    throw new Error(
      `Invalid test class Unit id: ${JSON.stringify(parsedClassUnitId.left)}`,
    );
  }
  if (classLevel === 1 && hitPointRule.tag !== "levelOneMaximumHitDie") {
    throw new Error("Invalid test progression: level 1 requires maximum HP.");
  }
  if (classLevel > 1 && hitPointRule.tag !== "fixedHigherLevelGain") {
    throw new Error(
      "Invalid test progression: post-start levels require fixed HP.",
    );
  }
  const result = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.right,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId.right,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test progression: ${JSON.stringify(result.left)}`);
  }

  return result.right;
}

function unitChoiceKeyRight(value: string) {
  const result = unitChoiceKey(value);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test Unit choice key: ${value}`);
  }
  return result.right;
}

function unitChoiceSourceUnitIdRight(value: string) {
  const result = unitChoiceSourceUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test Unit choice source Unit id: ${value}`);
  }
  return result.right;
}

function loadoutEquipmentUnitIdRight(value: string) {
  const result = loadoutEquipmentUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test loadout equipment Unit id: ${value}`);
  }
  return result.right;
}

function characterEquipmentItemUnitIdRight(value: string) {
  const result = characterEquipmentItemUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(
      `Invalid test CharacterBuild equipment item Unit id: ${value}`,
    );
  }
  return result.right;
}

function testCharacterEquipmentItemId<
  const Slot extends CharacterEquipmentItemSlot,
>(slot: Slot, unitId: string) {
  return characterEquipmentItemId({
    slot,
    unitId: characterEquipmentItemUnitIdRight(unitId),
  });
}

function testUnitChoiceSourceKey(unitId: string, choiceKey: string) {
  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: unitChoiceSourceUnitIdRight(unitId),
    choiceKey: unitChoiceKeyRight(choiceKey),
  });
}

function testLoadoutHoleId(
  equipmentUnitId: string,
  slot: LoadoutSlot,
): CreationHoleIdText {
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: loadoutEquipmentUnitIdRight(equipmentUnitId),
    slot,
  });
}

function testUnitHoleId(unitId: string, choiceKey: string): CreationHoleIdText {
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: unitChoiceSourceUnitIdRight(unitId),
    choiceKey: unitChoiceKeyRight(choiceKey),
  });
}

function choiceCardinalityRight(
  cardinality: ChoiceCardinality | undefined,
): ChoiceCardinality {
  if (cardinality === undefined) {
    throw new Error("Invalid test choice cardinality.");
  }
  return cardinality;
}

describe("CharacterDraft parser", () => {
  test("accepts persisted promoted draft JSON", () => {
    const draft = createCharacterDraft({
      draftId: characterDraftId("test:stored-draft"),
    });

    expect(parseCharacterDraft(JSON.parse(JSON.stringify(draft)))).toEqual(
      Either.right(draft),
    );
  });

  test("rejects malformed nested selection data", () => {
    const draft = createCharacterDraft({
      draftId: characterDraftId("test:malformed-stored-draft"),
    });

    expect(
      parseCharacterDraft({
        ...draft,
        selections: {
          choices: [{ kind: "unitChoice", source: { tag: "unitChoice" } }],
        },
      }),
    ).toEqual(
      Either.left({
        tag: "invalidCharacterDraft",
        path: "$.selections.choices[0].source.unitId",
        message: "Expected a string.",
      }),
    );
  });
});

describe("UnitChoiceSourceKey", () => {
  const sourceUnitIdText = fc.string({ minLength: 1, maxLength: 40 });
  const unitChoiceKeyText = fc.constantFrom(...UNIT_CHOICE_KEYS);

  test("preserves source facts through the source/key isomorphism", () => {
    const source = {
      tag: "unitChoice" as const,
      unitId: unitChoiceSourceUnitIdRight("class:custom:fighter"),
      choiceKey: unitChoiceKeyRight("class_skill_proficiency_choice"),
    };

    const key = unitChoiceSourceKey(source);
    const parsed = expectRight(parseUnitChoiceSourceKey(key));

    expect(parsed).toEqual(source);
    expect(unitChoiceSourceKey(parsed)).toBe(key);
  });

  test("rejects the old separator-based Unit-source hole id", () => {
    expect(
      parseCreationHoleId(
        "cc:unit:class_fighter:class_skill_proficiency_choice",
      ),
    ).toBeNull();
  });

  test("returns typed issues for invalid source keys", () => {
    expect(
      parseUnitChoiceSourceKey("u:13:class_fighter:c:not_a_choice"),
    ).toEqual(
      Either.left({
        tag: "unitChoiceSourceKeyUnsupportedChoiceKey",
        value: "u:13:class_fighter:c:not_a_choice",
        choiceKey: "not_a_choice",
      }),
    );
  });

  test("satisfies source/key isomorphism laws", () => {
    fc.assert(
      fc.property(
        sourceUnitIdText,
        unitChoiceKeyText,
        (unitIdText, choiceKey) => {
          const source = {
            tag: "unitChoice" as const,
            unitId: unitChoiceSourceUnitIdRight(unitIdText),
            choiceKey,
          };
          const key = unitChoiceSourceKey(source);
          const parsed = expectRight(parseUnitChoiceSourceKey(key));

          expect(parsed).toEqual(source);
          expect(unitChoiceSourceKey(parsed)).toBe(key);
        },
      ),
    );
  });
});

describe("LoadoutSourceKey", () => {
  const equipmentUnitIdText = fc.string({ minLength: 1, maxLength: 40 });
  const loadoutSlot = fc.constantFrom(...LOADOUT_SLOTS);

  test("satisfies source/key isomorphism laws", () => {
    fc.assert(
      fc.property(equipmentUnitIdText, loadoutSlot, (equipmentUnitId, slot) => {
        const source = {
          tag: "loadout" as const,
          equipmentUnitId: loadoutEquipmentUnitIdRight(equipmentUnitId),
          slot,
        };
        const key = loadoutSourceKey(source);
        const parsed = expectRight(parseLoadoutSourceKey(key));

        expect(parsed).toEqual(source);
        expect(loadoutSourceKey(parsed)).toBe(key);
      }),
    );
  });

  test("rejects unsupported loadout slots with typed issues", () => {
    expect(parseLoadoutSourceKey("e:16:armor_chain_mail:s:carried")).toEqual(
      Either.left({
        tag: "loadoutSourceKeyUnsupportedSlot",
        value: "e:16:armor_chain_mail:s:carried",
        slot: "carried",
      }),
    );
  });
});

describe("CharacterEquipmentItemId", () => {
  const itemSlot = fc.constantFrom(...CHARACTER_EQUIPMENT_ITEM_SLOTS);
  const itemUnitIdText = fc.string({ minLength: 1, maxLength: 40 });

  test("satisfies source/key isomorphism laws", () => {
    fc.assert(
      fc.property(itemSlot, itemUnitIdText, (slot, unitIdText) => {
        const source = {
          slot,
          unitId: characterEquipmentItemUnitIdRight(unitIdText),
        };
        const itemId = characterEquipmentItemId(source);
        const parsed = expectRight(parseCharacterEquipmentItemId(itemId));

        expect(parsed).toEqual(source);
        expect(characterEquipmentItemId(parsed)).toBe(itemId);
      }),
    );
  });

  test("preserves separator-like characters in authored Unit ids", () => {
    const source = {
      slot: "main" as const,
      unitId: characterEquipmentItemUnitIdRight("weapon:custom:blade"),
    };
    const itemId = characterEquipmentItemId(source);

    expect(itemId).toBe("main:weapon:custom:blade");
    expect(expectRight(parseCharacterEquipmentItemId(itemId))).toEqual(source);
  });

  test("returns typed issues for invalid item ids", () => {
    expect(parseCharacterEquipmentItemId("carried:weapon_longsword")).toEqual(
      Either.left({
        tag: "characterEquipmentItemIdSlotUnsupported",
        value: "carried:weapon_longsword",
      }),
    );
    expect(parseCharacterEquipmentItemId("main:")).toEqual(
      Either.left({
        tag: "characterEquipmentItemIdUnitIdEmpty",
        value: "main:",
        slot: "main",
      }),
    );
  });
});

const packageRootPath = fileURLToPath(new URL("../", import.meta.url));
const characterCreationRuntimeSlicePath = fileURLToPath(
  new URL("../character-creation-runtime-slice.qnt", import.meta.url),
);

describe("character creation hole discovery", () => {
  test("rejects unknown Unit choice keys at the protocol boundary", () => {
    expect(unitChoiceKey("future_choice")).toEqual(
      Either.left({
        tag: "unsupportedUnitChoiceKey",
        value: "future_choice",
      }),
    );
  });

  test("discovers the initial manifest draft holes from Surface records", () => {
    const draft = createCharacterDraft({
      unitLibrary,
      draftId: characterDraftId("draft:initial"),
    });
    const holes = discoverCreationHoles({ draft, unitLibrary });

    expect(holeSummary(holes)).toEqual([
      [
        "choice",
        "cc:draft:draft.progression.initial",
        [
          "13:class_fighter:level_1:maximum_hit_die",
          "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
          "12:class_wizard:level_1:maximum_hit_die",
          "12:class_wizard|13:class_fighter:level_2:fixed_hp_gain",
        ],
      ],
      ["choice", "cc:draft:draft.background", ["background_soldier"]],
      ["choice", "cc:draft:draft.species", ["species_orc"]],
      [
        "abilityScores",
        "cc:draft:draft.abilityScoreGeneration",
        ["standardArray", "pointBuy"],
      ],
      [
        "choice",
        "cc:draft:draft.languages",
        [
          "Common Sign Language",
          "Draconic",
          "Dwarvish",
          "Elvish",
          "Giant",
          "Gnomish",
          "Goblin",
          "Halfling",
          "Orc",
        ],
      ],
      [
        "choice",
        "cc:draft:draft.alignment",
        [
          "lawful_good",
          "neutral_good",
          "chaotic_good",
          "lawful_neutral",
          "neutral_neutral",
          "chaotic_neutral",
          "lawful_evil",
          "neutral_evil",
          "chaotic_evil",
        ],
      ],
    ]);
  });

  test("discovers legal catalog width while support gates reject unsupported choices", () => {
    const widenedUnitCatalog = unitLibraryWithUnrelatedUnits(48);
    const draft = createCharacterDraft({
      unitLibrary: widenedUnitCatalog,
      draftId: characterDraftId("draft:widened-catalog"),
    });
    const holes = discoverCreationHoles({
      draft,
      unitLibrary: widenedUnitCatalog,
    });

    expect(
      optionIds(holeById(holes, "cc:draft:draft.progression.initial")),
    ).toContain("17:class_unrelated_0:level_1:maximum_hit_die");
    expect(optionIds(holeById(holes, "cc:draft:draft.background"))).toContain(
      "background_unrelated_0",
    );
    expect(optionIds(holeById(holes, "cc:draft:draft.species"))).toContain(
      "species_unrelated_0",
    );

    const result = fillCreationHoles({
      draft,
      unitLibrary: widenedUnitCatalog,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "17:class_unrelated_0:level_1:maximum_hit_die",
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "illegalFill",
          code: "unsupportedChoice",
          message:
            "Unsupported choice 17:class_unrelated_0:level_1:maximum_hit_die for character creation hole: cc:draft:draft.progression.initial",
        },
      ],
    });
  });

  test("opens Fighter holes after the class selection", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:draft:draft.progression.initial"),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
      options: [
        { optionId: "acrobatics" },
        { optionId: "animal_handling" },
        { optionId: "athletics" },
        { optionId: "history" },
        { optionId: "insight" },
        { optionId: "intimidation" },
        { optionId: "persuasion" },
        { optionId: "perception" },
        { optionId: "survival" },
      ],
    });
    expect(
      holeById(
        holes,
        testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "defense", unitRef: { unitId: "defense" } }],
    });
    const weaponMasteryHole = holeById(
      holes,
      testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
    );
    expect(weaponMasteryHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 3 },
    });
    expect(optionIds(weaponMasteryHole)).toEqual(
      expect.arrayContaining([
        "weapon_longsword",
        "weapon_spear",
        "weapon_flail",
      ]),
    );
    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      optionIds(
        holeById(
          holes,
          testUnitHoleId("class_fighter", "class_equipment_choice"),
        ),
      ),
    ).toEqual(["option_a", "option_b", "option_c"]);
  });

  test("opens Soldier holes after class and background selections", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.background")).toBeUndefined();
    const backgroundIncreaseHole = holeById(
      holes,
      testUnitHoleId("background_soldier", "background_ability_score_increase"),
    );
    expect(backgroundIncreaseHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(backgroundIncreaseHole)).toEqual(
      expect.arrayContaining(["two_and_one:str:con", "one_each"]),
    );
    const backgroundToolHole = holeById(
      holes,
      testUnitHoleId("background_soldier", "background_tool_choice"),
    );
    expect(backgroundToolHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(backgroundToolHole)).toEqual([
      "tool_dice_set",
      "tool_dragonchess_set",
      "tool_playing_card_set",
      "tool_three_dragon_ante_set",
    ]);
    expect(
      holeById(
        holes,
        testUnitHoleId("background_soldier", "background_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "option_a" }, { optionId: "option_b" }],
    });
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test("opens purchase after the manifest coin equipment path is selected", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("background_soldier", "background_equipment_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "between", min: 1, max: 3 },
      options: [
        { optionId: "armor_chain_mail" },
        { optionId: "weapon_longsword" },
        { optionId: "weapon_dagger" },
        { optionId: "weapon_flail" },
        { optionId: "equipment_shield" },
      ],
    });
    expect(
      holeById(holes, testLoadoutHoleId("armor_chain_mail", "armor")),
    ).toBeUndefined();
  });

  test("does not open purchase from malformed equipment-path choice metadata", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoiceWithUnitRef(
            "class_fighter",
            "class_equipment_choice",
            "option_c",
            "armor_chain_mail",
          ),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test("does not open purchase for a non-manifest background equipment path", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_a",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test("does not open purchase for Fighter item-bundle equipment choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_b"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test("opens loadout only for purchased equipment and suppresses filled loadout slots", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
          selectedLoadoutChoice("armor_chain_mail", "armor", "worn"),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("armor_chain_mail", "armor")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("equipment_shield", "shield")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "wielded" }],
    });
    expect(
      holeById(holes, testLoadoutHoleId("weapon_longsword", "weapon")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "wielded_one_handed" }],
    });
  });

  test("opens Flail loadout when the Skeleton-pressure bludgeoning weapon is purchased", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_flail",
            "equipment_shield",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testLoadoutHoleId("weapon_flail", "weapon")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "wielded_one_handed" }],
    });
  });

  test("keeps malformed equipment purchase selections fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
            "tool_dice_set",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "between", min: 1, max: 3 },
    });
    expect(
      holeById(holes, testLoadoutHoleId("armor_chain_mail", "armor")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("equipment_shield", "shield")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("weapon_longsword", "weapon")),
    ).toBeUndefined();
  });

  test("suppresses already-filled class and background unit-choice holes", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice(
            "class_fighter",
            "class_skill_proficiency_choice",
            "perception",
            "survival",
          ),
          selectedUnitChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "defense",
          ),
          selectedUnitChoice(
            "fighter_weapon_mastery",
            "weapon_mastery_options",
            "weapon_longsword",
            "weapon_spear",
            "weapon_flail",
          ),
          selectedChoice(
            "background_soldier",
            "background_tool_choice",
            "tool_dice_set",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId(
          "background_soldier",
          "background_ability_score_increase",
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(
        holes,
        testUnitHoleId("background_soldier", "background_tool_choice"),
      ),
    ).toBeUndefined();
  });

  test("keeps malformed existing choice selections fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        choices: [
          selectedChoice(
            "class_fighter",
            "class_skill_proficiency_choice",
            "perception",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
    });
  });

  test("keeps existing choice selections with malformed unit refs fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        choices: [
          selectedChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "defense",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
  });

  test("suppresses Soldier ability-score increase from the typed draft field", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "str",
          plusOne: "con",
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId(
          "background_soldier",
          "background_ability_score_increase",
        ),
      ),
    ).toBeUndefined();
  });

  test("keeps malformed typed Soldier ability-score increase fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "cha",
          plusOne: "con",
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId(
          "background_soldier",
          "background_ability_score_increase",
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
  });

  test("removes selected species from draft holes without adding synthetic species choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_orc",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.species")).toBeUndefined();
    expect(
      holes.some(
        (hole) =>
          hole.source.tag === "unitChoice" &&
          hole.source.unitId === "species_orc",
      ),
    ).toBe(false);
  });
});

describe("character creation QNT slice parity", () => {
  test("Quint slice and runtime agree on manifest path and fill rejection algebra", () => {
    runQuintSliceSelfTests();

    const draft = createTestDraft("draft:qnt-parity");
    const initialHoles = discoverCreationHoles({ draft, unitLibrary });

    const afterInitial = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    });
    if (afterInitial.tag !== "accepted") {
      throw new Error("Expected the initial manifest fill to be accepted.");
    }

    const unsupportedLaterChoices = fillCreationHoles({
      draft: afterInitial.draft,
      unitLibrary,
      expectedRevision: afterInitial.draft.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "athletics",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_a",
        ),
      ],
    });
    if (unsupportedLaterChoices.tag !== "rejected") {
      throw new Error(
        "Expected later valid-but-unsupported choices to be rejected.",
      );
    }

    const complete = completeManifestDraft();
    const completeHoles = discoverCreationHoles({
      draft: complete,
      unitLibrary,
    });
    const completeFinalization = finalizeCharacterDraft({
      draft: complete,
      unitLibrary,
    });

    const invalid = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill("cc:draft:draft.progression.initial", "background_soldier"),
      ],
    });
    if (invalid.tag !== "rejected") {
      throw new Error(
        "Expected the invalid primary-class fill to be rejected.",
      );
    }

    const unsupportedLanguage = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.languages", "Dwarvish", "Elvish")],
    });
    if (unsupportedLanguage.tag !== "rejected") {
      throw new Error("Expected the unsupported language fill to be rejected.");
    }

    const unsupportedAlignment = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.alignment", "neutral_good")],
    });
    if (unsupportedAlignment.tag !== "rejected") {
      throw new Error(
        "Expected the unsupported alignment fill to be rejected.",
      );
    }

    const duplicateLanguage = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.languages", "Dwarvish", "Dwarvish")],
    });
    if (duplicateLanguage.tag !== "rejected") {
      throw new Error("Expected the duplicate language fill to be rejected.");
    }

    const standardArrayPermutation = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 14,
            dex: 15,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
      ],
    });
    if (standardArrayPermutation.tag !== "accepted") {
      throw new Error(
        "Expected the Standard Array permutation fill to be accepted.",
      );
    }

    const pointBuyAssignment = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "pointBuy",
          value: testAbilityScoreAssignment({
            str: 13,
            dex: 13,
            con: 13,
            int: 12,
            wis: 12,
            cha: 12,
          }),
        },
      ],
    });
    if (pointBuyAssignment.tag !== "accepted") {
      throw new Error("Expected the Point Buy fill to be accepted.");
    }

    const tooFewLanguages = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.languages", "Dwarvish")],
    });
    if (tooFewLanguages.tag !== "rejected") {
      throw new Error("Expected the too-few language fill to be rejected.");
    }

    const tooManyLanguages = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin", "Elvish"),
      ],
    });
    if (tooManyLanguages.tag !== "rejected") {
      throw new Error("Expected the too-many language fill to be rejected.");
    }

    const staleRevision = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draftRevision(draft.revision + 1),
      fills: [],
    });
    if (staleRevision.tag !== "rejected") {
      throw new Error("Expected the stale-revision fill to be rejected.");
    }

    runGeneratedQuintParity(
      renderQuintParityModule({
        initialHoles,
        afterInitial,
        complete,
        completeHoles,
        completeFinalization,
        invalid,
        unsupportedLanguage,
        unsupportedAlignment,
        duplicateLanguage,
        unsupportedLaterChoices,
        standardArrayPermutation,
        pointBuyAssignment,
        tooFewLanguages,
        tooManyLanguages,
        staleRevision,
      }),
    );
  }, 30_000);
});

describe("character creation batch fill", () => {
  test("accepts a legal batch atomically, increments revision, and rederives holes", () => {
    const draft = createTestDraft("draft:batch-accepted");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    });

    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") {
      return;
    }

    expect(draft.revision).toBe(0);
    expect(result.draft.revision).toBe(1);
    expect(result.draft.selections).toMatchObject({
      progression: testProgression("class_fighter", 1),
      background: "background_soldier",
      species: "species_orc",
      abilityScoreGeneration: {
        method: "standardArray",
        assignedScores: {
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        },
      },
      languages: ["Common", "Dwarvish", "Goblin"],
      alignment: { order: "lawful", morality: "good" },
    });
    expect(
      holeById(result.holes, "cc:draft:draft.progression.initial"),
    ).toBeUndefined();
    expect(
      holeById(
        result.holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
    });
    expect(result.finalization).toMatchObject({ tag: "incomplete" });
  });

  test("records accepted choice options without inferring Units from option ids", () => {
    const draft = createTestDraft("draft:batch-choice-option-metadata");
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills(),
      }),
    );
    const result = fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
      ],
    });

    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") {
      return;
    }

    expect(
      selectedChoiceBySource(
        result.draft,
        "class_fighter",
        "class_skill_proficiency_choice",
      )?.options,
    ).toEqual([{ optionId: "perception" }, { optionId: "survival" }]);
    expect(
      selectedChoiceBySource(
        result.draft,
        "fighter_fighting_style",
        "class_feature_feat_choice",
      )?.options,
    ).toEqual([{ optionId: "defense", unitRef: { unitId: "defense" } }]);
    expect(
      selectedChoiceBySource(
        result.draft,
        "fighter_weapon_mastery",
        "weapon_mastery_options",
      )?.options,
    ).toEqual([
      {
        optionId: "weapon_longsword",
        unitRef: { unitId: "weapon_longsword" },
      },
      { optionId: "weapon_spear", unitRef: { unitId: "weapon_spear" } },
      { optionId: "weapon_flail", unitRef: { unitId: "weapon_flail" } },
    ]);
  });

  test("rejects invalid choices without changing the draft", () => {
    const draft = createTestDraft("draft:batch-invalid-choice");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill("cc:draft:draft.progression.initial", "background_soldier"),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [{ tag: "illegalFill", code: "invalidChoice", fillIndex: 0 }],
    });
  });

  test("rejects source-unsupported class equipment option ids", () => {
    const draft = createTestDraft("draft:batch-fighter-item-equipment");
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills(),
      }),
    );
    const result = fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_equipment_choice"),
          "option_b",
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft: afterInitial,
      issues: [{ tag: "illegalFill", code: "unsupportedChoice", fillIndex: 0 }],
    });
  });

  test("reports every invalid option in a choice fill", () => {
    const draft = createTestDraft("draft:batch-multiple-invalid-choices");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "background_soldier",
          "species_orc",
        ),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "tooManyChoices",
      "invalidChoice",
      "invalidChoice",
    ]);
    expect(
      result.issues
        .filter((issue) => issue.code === "invalidChoice")
        .map((issue) => issue.message),
    ).toEqual([
      "Invalid choice background_soldier for character creation hole: cc:draft:draft.progression.initial",
      "Invalid choice species_orc for character creation hole: cc:draft:draft.progression.initial",
    ]);
  });

  test("accepts Point Buy ability score assignments and records the method", () => {
    const draft = createTestDraft("draft:batch-point-buy-ability-scores");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "pointBuy",
          value: testAbilityScoreAssignment({
            str: 13,
            dex: 13,
            con: 13,
            int: 12,
            wis: 12,
            cha: 12,
          }),
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "accepted",
      draft: {
        selections: {
          abilityScoreGeneration: {
            method: "pointBuy",
            assignedScores: testAbilityScoreAssignment({
              str: 13,
              dex: 13,
              con: 13,
              int: 12,
              wis: 12,
              cha: 12,
            }),
          },
        },
      },
    });
  });

  test("rejects ability score assignments that are invalid for their method", () => {
    const draft = createTestDraft("draft:batch-invalid-ability-scores");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 20,
            dex: 20,
            con: 20,
            int: 20,
            wis: 20,
            cha: 20,
          }),
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [
        { tag: "illegalFill", code: "invalidAbilityScores", fillIndex: 0 },
      ],
    });

    const invalidPointBuy = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "pointBuy",
          value: testAbilityScoreAssignment({
            str: 15,
            dex: 15,
            con: 15,
            int: 15,
            wis: 8,
            cha: 8,
          }),
        },
      ],
    });

    expect(invalidPointBuy).toMatchObject({
      tag: "rejected",
      draft,
      issues: [
        { tag: "illegalFill", code: "invalidAbilityScores", fillIndex: 0 },
      ],
    });
  });

  test("rejects duplicate fills for the same hole", () => {
    const draft = createTestDraft("draft:batch-duplicate");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_fighter:level_1:maximum_hit_die",
        ),
        choiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_fighter:level_1:maximum_hit_die",
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [{ tag: "illegalFill", code: "duplicateFill", fillIndex: 1 }],
    });
  });

  test("rejects stale revisions while still reporting diagnosable fill issues", () => {
    const draft = createTestDraft("draft:batch-stale");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draftRevision(draft.revision + 1),
      fills: [
        choiceFill("cc:draft:draft.progression.initial", "background_soldier"),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "staleRevision",
      "invalidChoice",
    ]);
  });

  test("rejects wrong fill kinds and unsupported but otherwise valid choices", () => {
    const draft = createTestDraft("draft:batch-wrong-kind");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.progression.initial"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 15,
            dex: 14,
            con: 13,
            int: 12,
            wis: 10,
            cha: 8,
          }),
        },
        choiceFill("cc:draft:draft.alignment", "neutral_good"),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "wrongFillKind",
      "unsupportedChoice",
    ]);
  });

  test("reports the unsupported selected option for choice fills", () => {
    const draft = createTestDraft("draft:batch-unsupported-choice");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "choice",
          holeId: creationHoleId("cc:draft:draft.languages"),
          optionIds: [
            creationChoiceOptionId("Dwarvish"),
            creationChoiceOptionId("Elvish"),
          ],
        },
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.issues).toMatchObject([
      {
        tag: "illegalFill",
        code: "unsupportedChoice",
        fillIndex: 0,
        message:
          "Unsupported choice Elvish for character creation hole: cc:draft:draft.languages",
      },
    ]);
  });

  test("reports unsupported Soldier gaming sets as unsupported, not invalid", () => {
    const draft = draftWithSelections({
      progression: testProgression("class_fighter", 1),
      background: "background_soldier",
    });
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dragonchess_set",
        ),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.issues).toMatchObject([
      {
        tag: "illegalFill",
        code: "unsupportedChoice",
        fillIndex: 0,
        message: `Unsupported choice tool_dragonchess_set for character creation hole: ${testUnitHoleId(
          "background_soldier",
          "background_tool_choice",
        )}`,
      },
    ]);
  });

  test("replaying the same accepted batch from the same prior draft is idempotent", () => {
    const draft = createTestDraft("draft:batch-replay");
    const fills = initialManifestFills();
    const first = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills,
    });
    const second = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills,
    });

    expect(second).toEqual(first);
  });
});

describe("character creation finalization", () => {
  test("finalizes the complete Orc Soldier Fighter manifest into a legal CharacterBuild", () => {
    const draft = completeManifestDraft();
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") {
      return;
    }

    expect(result.build.progression).toEqual({
      startingClass: "class_fighter",
      advancements: [],
    });
    expect(result.build.background).toBe("background_soldier");
    expect(result.build.species).toBe("species_orc");
    expect(result.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(result.build.alignment).toEqual({
      order: "lawful",
      morality: "good",
    });
    expect(result.build.abilityScores).toEqual({
      str: 17,
      dex: 14,
      con: 14,
      int: 8,
      wis: 10,
      cha: 12,
    });
    expect(result.build.hitPoints).toEqual({
      maximum: 12,
      hitDice: [{ classUnitId: "class_fighter", dieSize: 10, total: 1 }],
    });
    expect(result.build.proficiencies).toEqual({
      savingThrows: ["str", "con"],
      skills: ["perception", "survival", "athletics", "intimidation"],
      weapon: ["simple", "martial"],
      tools: ["tool_dice_set"],
    });
    expect(result.build.armorTraining).toEqual([
      "light",
      "medium",
      "heavy",
      "shield",
    ]);
    expect(result.build.features).toEqual([
      {
        kind: "classFeature",
        unitId: "fighter_fighting_style",
      },
      {
        kind: "classFeature",
        unitId: "fighter_second_wind",
      },
      {
        kind: "classFeature",
        unitId: "fighter_weapon_mastery",
      },
      {
        kind: "backgroundOriginFeat",
        unitId: "feat_savage_attacker",
      },
      {
        kind: "speciesTrait",
        unitId: "orc_adrenaline_rush",
      },
      {
        kind: "speciesTrait",
        unitId: "orc_darkvision",
      },
      {
        kind: "speciesTrait",
        unitId: "orc_relentless_endurance",
      },
      {
        choiceKey: "class_feature_feat_choice",
        kind: "classChoice",
        unitId: "defense",
      },
    ]);
    expect(result.build.equipment).toEqual({
      armor: "armor_chain_mail",
      shield: "equipment_shield",
      weapon: {
        itemId: testCharacterEquipmentItemId("main", "weapon_longsword"),
        grip: "one_handed",
      },
    });
    expect(result.build.resources).toEqual([
      {
        unitId: "fighter_second_wind",
        resource: {
          cap: {
            axis: "class",
            base: 2,
            kind: "threshold_tiers",
            tiers: [
              { atLevel: 4, value: 3 },
              { atLevel: 10, value: 4 },
            ],
          },
          kind: "use_count",
        },
      },
    ]);
    expect(
      characterBuildUnitRefs(result.build).map((ref) => ref.unitId),
    ).toEqual([
      "class_fighter",
      "background_soldier",
      "species_orc",
      "fighter_fighting_style",
      "fighter_second_wind",
      "fighter_weapon_mastery",
      "feat_savage_attacker",
      "orc_adrenaline_rush",
      "orc_darkvision",
      "orc_relentless_endurance",
      "defense",
      "armor_chain_mail",
      "equipment_shield",
      "weapon_longsword",
    ]);
  });

  test("rejects over-cap parsed ability scores without throwing during finalization", () => {
    const complete = completeManifestDraft();
    const draft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        abilityScoreGeneration: {
          method: "standardArray",
          assignedScores: testAbilityScoreAssignment({
            str: 30,
            dex: 14,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
      },
    };

    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result).toMatchObject({ tag: "invalid" });
    if (result.tag !== "invalid") return;
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Finalized build must use the supported manifest background ability-score increase.",
    );
  });

  test("returns a typed issue instead of clamping over-cap background ability-score increases", () => {
    const result = applyBackgroundAbilityScoreIncrease(
      testAbilityScoreAssignment({
        str: 30,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
      { kind: "twoAndOne", plusTwo: "str", plusOne: "con" },
      ["str", "dex", "con"],
    );

    expect(result).toEqual(
      Either.left({
        tag: "illegalFinalization",
        code: "illegalFinalization",
        message:
          "Cannot apply background ability-score increase: str 30 + 2 would exceed 20.",
      }),
    );
  });

  test("accepts Fighter 2 through the runtime progression fill", () => {
    const fighterTwo = completeFighterTwoDraft();
    const result = finalizeCharacterDraft({ draft: fighterTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.hitPoints.hitDice).toEqual([
      { classUnitId: "class_fighter", dieSize: 10, total: 2 },
    ]);
    expect(result.build.features).toEqual(
      expect.arrayContaining([
        { kind: "classFeature", unitId: "fighter_action_surge" },
        { kind: "classFeature", unitId: "fighter_tactical_mind" },
      ]),
    );
    expect(result.build.resources.map((resource) => resource.unitId)).toContain(
      "fighter_action_surge",
    );
  });

  test("retains selected subclass Unit refs in finalized builds", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      supportedProgressions: CharacterProgression[];
    };
    const originalProgressions = profile.supportedProgressions;
    const fighterThree = testProgression("class_fighter", 3);
    profile.supportedProgressions = [...originalProgressions, fighterThree];
    try {
      const complete = completeManifestDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          progression: fighterThree,
          choices: [
            ...complete.selections.choices,
            selectedUnitChoice(
              "class_fighter",
              "class_subclass_choice",
              "subclass_fighter_champion",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result).toMatchObject({
        tag: "ready",
        build: {
          features: expect.arrayContaining([
            {
              choiceKey: "class_subclass_choice",
              kind: "classChoice",
              unitId: "subclass_fighter_champion",
            },
          ]),
        },
      });
    } finally {
      profile.supportedProgressions = originalProgressions;
    }
  });

  test("projects selected Ability Score Improvement feat choices into build ability scores", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      supportedProgressions: CharacterProgression[];
    };
    const originalProgressions = profile.supportedProgressions;
    const fighterFour = testProgression("class_fighter", 4);
    profile.supportedProgressions = [...originalProgressions, fighterFour];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const abilityScoreImprovement = {
        ...secondWind,
        id: "fighter_ability_score_improvement_l4",
        name: "Ability Score Improvement",
        acquiredAtLevel: 4,
        mechanics: {
          family: "passive",
          grants: [
            {
              category: "general",
              kind: "grant_feat",
              openFallback: "any_qualifying_feat",
            },
          ],
        },
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 4, unitId: "fighter_ability_score_improvement_l4" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        abilityScoreImprovement,
      ]);
      const complete = completeManifestDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          progression: fighterFour,
          choices: [
            ...complete.selections.choices,
            selectedUnitChoice(
              "class_fighter",
              "class_subclass_choice",
              "subclass_fighter_champion",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_ability_score_increase_choice",
              "ability_score:dex:+2:max20",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });
      expect(result).toMatchObject({
        tag: "ready",
        build: {
          abilityScores: {
            dex: 16,
          },
          features: expect.arrayContaining([
            {
              choiceKey: "class_feature_feat_choice",
              kind: "classChoice",
              unitId: "feat_ability_score_improvement",
            },
          ]),
        },
      });
    } finally {
      profile.supportedProgressions = originalProgressions;
    }
  });

  test("represents two-score Ability Score Improvement choices as unordered pairs", () => {
    const optionIds = abilityScoreIncreaseChoiceOptions({
      maxScore: 20,
      methods: [
        { kind: "two_scores", primaryIncrease: 1, secondaryIncrease: 1 },
      ],
    }).map((option) => option.optionId);

    expect(optionIds).toContain("ability_scores:str:+1;dex:+1:max20");
    expect(optionIds).not.toContain("ability_scores:dex:+1;str:+1:max20");
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });

  test("decodes every generated Ability Score Improvement option", () => {
    const options = abilityScoreIncreaseChoiceOptions({
      maxScore: 20,
      methods: [
        { kind: "one_score", increase: 2 },
        { kind: "two_scores", primaryIncrease: 1, secondaryIncrease: 1 },
      ],
    });

    for (const option of options) {
      const decoded = decodeAbilityScoreIncreaseOptionId(option.optionId);
      expect(Either.isRight(decoded)).toBe(true);
      if (Either.isRight(decoded)) {
        expect(decoded.right.length).toBeGreaterThan(0);
      }
    }
    expect(
      Either.isLeft(
        decodeAbilityScoreIncreaseOptionId("ability_score:dex:2:max20"),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeAbilityScoreIncreaseOptionId(
          "ability_scores:str:+1;str:+1:max20",
        ),
      ),
    ).toBe(true);
  });

  test("applies two-score Ability Score Improvement feat choices", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      supportedProgressions: CharacterProgression[];
    };
    const originalProgressions = profile.supportedProgressions;
    const fighterFour = testProgression("class_fighter", 4);
    profile.supportedProgressions = [...originalProgressions, fighterFour];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const abilityScoreImprovement = {
        ...secondWind,
        id: "fighter_ability_score_improvement_l4",
        name: "Ability Score Improvement",
        acquiredAtLevel: 4,
        mechanics: {
          family: "passive",
          grants: [
            {
              category: "general",
              kind: "grant_feat",
              openFallback: "any_qualifying_feat",
            },
          ],
        },
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 4, unitId: "fighter_ability_score_improvement_l4" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        abilityScoreImprovement,
      ]);
      const complete = completeManifestDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          progression: fighterFour,
          choices: [
            ...complete.selections.choices,
            selectedUnitChoice(
              "class_fighter",
              "class_subclass_choice",
              "subclass_fighter_champion",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_ability_score_increase_choice",
              "ability_scores:str:+1;dex:+1:max20",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });
      expect(result).toMatchObject({
        tag: "ready",
        build: {
          abilityScores: {
            str: 18,
            dex: 15,
          },
        },
      });
    } finally {
      profile.supportedProgressions = originalProgressions;
    }
  });

  test("rejects cumulative class-feature ability-score increases above their cap", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      supportedProgressions: CharacterProgression[];
    };
    const originalProgressions = profile.supportedProgressions;
    const fighterSix = testProgression("class_fighter", 6);
    profile.supportedProgressions = [...originalProgressions, fighterSix];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const abilityScoreImprovement = {
        ...secondWind,
        id: "fighter_ability_score_improvement_l4",
        name: "Ability Score Improvement",
        acquiredAtLevel: 4,
        mechanics: {
          family: "passive",
          grants: [
            {
              category: "general",
              kind: "grant_feat",
              openFallback: "any_qualifying_feat",
            },
          ],
        },
      } as UnitRecord;
      const secondAbilityScoreImprovement = {
        ...abilityScoreImprovement,
        id: "fighter_ability_score_improvement_l6",
        acquiredAtLevel: 6,
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 4, unitId: "fighter_ability_score_improvement_l4" },
          { level: 6, unitId: "fighter_ability_score_improvement_l6" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        abilityScoreImprovement,
        secondAbilityScoreImprovement,
      ]);
      const complete = completeManifestDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          progression: fighterSix,
          choices: [
            ...complete.selections.choices,
            selectedUnitChoice(
              "class_fighter",
              "class_subclass_choice",
              "subclass_fighter_champion",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_ability_score_increase_choice",
              "ability_score:str:+2:max20",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l6",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l6",
              "class_feature_ability_score_increase_choice",
              "ability_score:str:+2:max20",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });

      expect(result).toMatchObject({
        tag: "invalid",
        issues: [
          {
            tag: "illegalFinalization",
            code: "illegalFinalization",
            message:
              "Cannot apply class-feature ability-score increase: str 19 + 2 would exceed 20.",
          },
        ],
      });
    } finally {
      profile.supportedProgressions = originalProgressions;
    }
  });

  test("does not treat Fighter followed by Wizard as supported Fighter 2", () => {
    const fighterThenWizard = expectRight(
      parseCharacterProgressionShape({
        startingClass: expectRight(
          classUnitIdFromUnitId({
            unitLibrary,
            classUnitId: "class_fighter",
          }),
        ),
        advancements: [
          {
            classUnitId: expectRight(
              classUnitIdFromUnitId({
                unitLibrary,
                classUnitId: "class_wizard",
              }),
            ),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );
    const fighterTwo = testProgression("class_fighter", 2);

    expect(progressionOptionId(fighterThenWizard)).not.toBe(
      progressionOptionId(fighterTwo),
    );
  });

  test("finalizes supported multiclass proficiencies and class feature choices", () => {
    const draft = completeWizardThenFighterDraft();
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.hitPoints.hitDice).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 1 },
      { classUnitId: "class_fighter", dieSize: 10, total: 1 },
    ]);
    expect(result.build.proficiencies.weapon).toEqual(["simple", "martial"]);
    expect(result.build.armorTraining).toEqual(["light", "medium", "shield"]);
    expect(result.build.features).toEqual(
      expect.arrayContaining([
        { kind: "classFeature", unitId: "wizard_ritual_adept" },
        { kind: "classFeature", unitId: "fighter_fighting_style" },
        { kind: "classFeature", unitId: "fighter_weapon_mastery" },
      ]),
    );
  });

  test("collects all missing class Unit issues while projecting a build", () => {
    const progression = expectRight(
      parseCharacterProgressionShape({
        startingClass: classUnitId("class_fighter"),
        advancements: [
          {
            classUnitId: classUnitId("class_missing_one"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
          {
            classUnitId: classUnitId("class_missing_two"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );
    const complete = completeManifestDraft();
    const selections = {
      ...complete.selections,
      progression,
    };
    const supportedSelections = {
      selections,
      progression,
      unitChoices: [],
      loadoutChoices: [],
    } as unknown as Parameters<
      typeof buildCharacterBuild
    >[0]["supportedSelections"];

    const result = buildCharacterBuild({ supportedSelections, unitLibrary });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left.map((issue) => issue.message)).toEqual([
      "Cannot finalize unknown class Unit: class_missing_one",
      "Cannot finalize unknown class Unit: class_missing_two",
    ]);
  });

  test("collects malformed class-feature ability-score option issues while projecting a build", () => {
    const complete = completeManifestDraft();
    const selections = {
      ...complete.selections,
      choices: [
        ...complete.selections.choices,
        selectedChoice(
          "fighter_ability_score_improvement_l4",
          "class_feature_ability_score_increase_choice",
          "ability_score:dex:2:max20",
          "ability_scores:str:+1;str:+1:max20",
        ),
      ],
    };
    const supportedSelections = {
      selections,
      progression: selections.progression,
      unitChoices: [],
      loadoutChoices: [],
    } as unknown as Parameters<
      typeof buildCharacterBuild
    >[0]["supportedSelections"];

    const result = buildCharacterBuild({ supportedSelections, unitLibrary });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject([
      { tag: "invalidChoiceOption", optionId: "ability_score:dex:2:max20" },
      {
        tag: "invalidChoiceOption",
        optionId: "ability_scores:str:+1;str:+1:max20",
      },
    ]);
  });

  test("collects malformed class-feature proficiency option issues while projecting a build", () => {
    const complete = completeManifestDraft();
    const selections = {
      ...complete.selections,
      choices: [
        ...complete.selections.choices,
        selectedChoice(
          "fighter_proficiency_grant",
          "class_feature_proficiency_choice",
          "proficiency:skill",
          "proficiency:armor",
        ),
      ],
    };
    const supportedSelections = {
      selections,
      progression: selections.progression,
      unitChoices: [],
      loadoutChoices: [],
    } as unknown as Parameters<
      typeof buildCharacterBuild
    >[0]["supportedSelections"];

    const result = buildCharacterBuild({ supportedSelections, unitLibrary });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject([
      { tag: "invalidChoiceOption", optionId: "proficiency:skill" },
      { tag: "invalidChoiceOption", optionId: "proficiency:armor" },
    ]);
  });

  test("uses collision-resistant progression option ids for class paths", () => {
    const singleClassWithRawEncodedSeparator = expectRight(
      parseCharacterProgressionShape({
        startingClass: classUnitId("class_alpha%7Cclass_beta"),
        advancements: [
          {
            classUnitId: classUnitId("class_alpha%7Cclass_beta"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );
    const multiclassPath = expectRight(
      parseCharacterProgressionShape({
        startingClass: classUnitId("class_alpha"),
        advancements: [
          {
            classUnitId: classUnitId("class_beta"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );

    expect(progressionOptionId(singleClassWithRawEncodedSeparator)).not.toBe(
      progressionOptionId(multiclassPath),
    );
  });

  test("finalizes Wizard 1 spellcasting build facts from selected spell access", () => {
    const wizard = completeWizardDraft();
    const result = finalizeCharacterDraft({ draft: wizard, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.spellcasting).toEqual({
      spellcastingAbility: "int",
      cantrips: ["light", "fire_bolt", "ray_of_frost"],
      spellbook: [
        { spellId: "detect_magic", spellLevel: 1 },
        { spellId: "mage_armor", spellLevel: 1 },
        { spellId: "magic_missile", spellLevel: 1 },
        { spellId: "shield", spellLevel: 1 },
        { spellId: "sleep", spellLevel: 1 },
        { spellId: "thunderwave", spellLevel: 1 },
      ],
      preparedSpells: ["detect_magic", "mage_armor", "magic_missile", "sleep"],
      spellSlots: [{ count: 2, spellLevel: 1 }],
      spellcastingFocuses: ["arcane_focus", "spellbook"],
    });
    expect(result.build.proficiencies.skills).toEqual([
      "arcana",
      "history",
      "athletics",
      "intimidation",
    ]);
    expect(
      characterBuildUnitRefs(result.build).map((ref) => ref.unitId),
    ).toEqual([
      "class_wizard",
      "background_soldier",
      "species_orc",
      "wizard_ritual_adept",
      "wizard_arcane_recovery",
      "feat_savage_attacker",
      "orc_adrenaline_rush",
      "orc_darkvision",
      "orc_relentless_endurance",
      "equipment_shield",
      "weapon_longsword",
      "light",
      "fire_bolt",
      "ray_of_frost",
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ]);
  });

  test("does not finalize Fighter item-bundle equipment with purchased loadout", () => {
    const complete = completeManifestDraft();
    const itemBundleWithPurchasedEquipment: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: complete.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.unitId === "class_fighter" &&
          choice.source.choiceKey === "class_equipment_choice"
            ? selectedChoice(
                "class_fighter",
                "class_equipment_choice",
                "option_b",
              )
            : choice,
        ),
      },
    };

    expect(
      finalizeCharacterDraft({
        draft: itemBundleWithPurchasedEquipment,
        unitLibrary,
      }),
    ).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId("class_fighter", "class_equipment_choice"),
        },
      ],
    });
  });

  test("derives build loadout projection from selected loadout source equipment", () => {
    const complete = completeManifestDraft();
    const projection = finalizedBuildEquipment({
      ...complete.selections,
      progression: testProgression("class_fighter", 1),
      background: "background_soldier",
      abilityScoreGeneration: {
        method: "standardArray",
        assignedScores: testAbilityScoreAssignment({
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        }),
      },
      backgroundAbilityScoreIncrease: {
        kind: "twoAndOne",
        plusTwo: "str",
        plusOne: "con",
      },
      species: "species_orc",
      languages: ["Common", "Dwarvish", "Goblin"],
      alignment: { order: "lawful", morality: "good" },
      equipment: {
        selectedUnitIds: [
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ],
      },
      choices: complete.selections.choices.map((choice) =>
        choice.kind === "loadout" &&
        choice.source.equipmentUnitId === "weapon_longsword" &&
        choice.source.slot === "weapon"
          ? selectedLoadoutChoice(
              "weapon_longsword",
              "weapon",
              "wielded_one_handed",
            )
          : choice,
      ),
    });

    expect(projection.weapon).toEqual({
      itemId: testCharacterEquipmentItemId("main", "weapon_longsword"),
      grip: "one_handed",
    });
  });

  test("rejects finalized drafts with duplicate selected-equipment loadout slots", () => {
    const complete = completeManifestDraft();
    const mutableProfile =
      CHARACTER_CREATION_SUPPORT_PROFILE as unknown as MutableSupportProfile;
    const originalEquipmentPurchaseChoiceCount =
      mutableProfile.equipmentPurchaseChoiceCount;
    mutableProfile.equipmentPurchaseChoiceCount = 4;

    try {
      const duplicateWeaponSlotDraft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          equipment: {
            selectedUnitIds: [
              "armor_chain_mail",
              "weapon_longsword",
              "weapon_flail",
              "equipment_shield",
            ],
          },
          choices: [
            ...complete.selections.choices,
            selectedLoadoutChoice(
              "weapon_flail",
              "weapon",
              "wielded_one_handed",
            ),
          ],
        },
      };

      expect(
        finalizeCharacterDraft({
          draft: duplicateWeaponSlotDraft,
          unitLibrary,
        }),
      ).toMatchObject({
        tag: "invalid",
        issues: [
          {
            tag: "unsupportedFinalization",
            code: "unsupportedFinalization",
          },
        ],
      });
    } finally {
      mutableProfile.equipmentPurchaseChoiceCount =
        originalEquipmentPurchaseChoiceCount;
    }
  });

  test("finalizes public builds from support-profile-selected loadout Unit refs", () => {
    const complete = completeManifestDraft();
    const mutableProfile =
      CHARACTER_CREATION_SUPPORT_PROFILE as unknown as MutableSupportProfile;
    const originalPurchaseOptionIds =
      mutableProfile.unitOptionIdsByChoiceKey.equipment_purchase;
    const originalPurchasableEquipmentUnitIds =
      mutableProfile.purchasableEquipmentUnitIds;
    const originalLoadoutChoices = mutableProfile.loadoutChoices;
    const spearWeaponLoadout: SupportedLoadoutChoice = {
      slot: "weapon",
      unitId: "weapon_spear",
      optionId: creationChoiceOptionId("wielded_one_handed"),
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    };

    mutableProfile.unitOptionIdsByChoiceKey.equipment_purchase = [
      creationChoiceOptionId("armor_chain_mail"),
      creationChoiceOptionId("weapon_spear"),
      creationChoiceOptionId("equipment_shield"),
    ];
    mutableProfile.purchasableEquipmentUnitIds = [
      "armor_chain_mail",
      "weapon_spear",
      "equipment_shield",
    ];
    mutableProfile.loadoutChoices = [
      originalLoadoutChoices[0]!,
      originalLoadoutChoices[1]!,
      spearWeaponLoadout,
    ];

    try {
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          equipment: {
            selectedUnitIds: [
              "armor_chain_mail",
              "weapon_spear",
              "equipment_shield",
            ],
          },
          choices: complete.selections.choices.map((choice) =>
            choice.kind === "loadout" &&
            choice.source.equipmentUnitId === "weapon_longsword" &&
            choice.source.slot === "weapon"
              ? selectedLoadoutChoice(
                  "weapon_spear",
                  "weapon",
                  "wielded_one_handed",
                )
              : choice,
          ),
        },
      };

      const finalization = finalizeCharacterDraft({ draft, unitLibrary });

      expect(finalization).toMatchObject({
        tag: "ready",
        build: {
          equipment: {
            armor: "armor_chain_mail",
            shield: "equipment_shield",
            weapon: {
              itemId: testCharacterEquipmentItemId("main", "weapon_spear"),
              grip: "one_handed",
            },
          },
        },
      });
    } finally {
      mutableProfile.unitOptionIdsByChoiceKey.equipment_purchase =
        originalPurchaseOptionIds;
      mutableProfile.purchasableEquipmentUnitIds =
        originalPurchasableEquipmentUnitIds;
      mutableProfile.loadoutChoices = originalLoadoutChoices;
    }
  });

  test("merges duplicate supported choice-hole sources instead of overwriting", () => {
    const merged = supportedChoiceHolesBySource([
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(exactChoiceCardinality(1)),
        options: [
          {
            optionId: creationChoiceOptionId("defense"),
            label: "Defense",
            unitRef: { unitId: "defense" },
          },
        ],
      },
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(exactChoiceCardinality(1)),
        options: [
          {
            optionId: creationChoiceOptionId("defense"),
            label: "Defense",
            unitRef: { unitId: "defense" },
          },
          {
            optionId: creationChoiceOptionId("dueling"),
            label: "Dueling",
            unitRef: { unitId: "dueling" },
          },
        ],
      },
    ]);

    const mergedHole = merged.get(
      testUnitChoiceSourceKey(
        "fighter_fighting_style",
        "class_feature_feat_choice",
      ),
    );
    expect(mergedHole).toMatchObject({
      kind: "choice",
      source: {
        tag: "unitChoice",
        unitId: "fighter_fighting_style",
        choiceKey: "class_feature_feat_choice",
      },
    });
    expect(mergedHole?.options).toEqual([
      {
        optionId: "defense",
        label: "Defense",
        unitRef: { unitId: "defense" },
      },
      {
        optionId: "dueling",
        label: "Dueling",
        unitRef: { unitId: "dueling" },
      },
    ]);
  });

  test("ignores duplicate supported choice-hole sources that disagree on cardinality", () => {
    const merged = supportedChoiceHolesBySource([
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(exactChoiceCardinality(1)),
        options: [
          {
            optionId: creationChoiceOptionId("defense"),
            label: "Defense",
            unitRef: { unitId: "defense" },
          },
        ],
      },
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(
          boundedChoiceCardinality({ min: 1, max: 2 }),
        ),
        options: [
          {
            optionId: creationChoiceOptionId("dueling"),
            label: "Dueling",
            unitRef: { unitId: "dueling" },
          },
        ],
      },
    ]);
    expect(
      merged.get(
        testUnitChoiceSourceKey(
          "fighter_fighting_style",
          "class_feature_feat_choice",
        ),
      )?.options,
    ).toEqual([
      {
        optionId: "defense",
        label: "Defense",
        unitRef: { unitId: "defense" },
      },
    ]);
  });

  test("does not finalize incomplete or illegal drafts", () => {
    const incomplete = finalizeCharacterDraft({
      draft: createTestDraft("draft:finalize-incomplete"),
      unitLibrary,
    });
    expect(incomplete).toMatchObject({ tag: "incomplete" });

    const complete = completeManifestDraft();
    const illegalDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        progression: testProgression("class_fighter", 3),
      },
    };
    const illegal = finalizeCharacterDraft({
      draft: illegalDraft,
      unitLibrary,
    });

    expect(illegal).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build progression must match a supported progression profile.",
        },
      ],
    });
  });

  test("keeps drafts with unsupported ability-score increases incomplete", () => {
    const complete = completeManifestDraft();
    const oneEachDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        backgroundAbilityScoreIncrease: { kind: "oneEach" },
      },
    };

    const finalization = finalizeCharacterDraft({
      draft: oneEachDraft,
      unitLibrary,
    });

    expect(finalization).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
        },
      ],
    });
  });

  test("rejects completed drafts with extra or contradictory choices", () => {
    const complete = completeManifestDraft();
    const extraChoiceDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: [
          ...complete.selections.choices,
          selectedChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "weapon_longsword",
          ),
        ],
      },
    };
    const duplicateChoiceDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: [
          ...complete.selections.choices,
          selectedChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "defense",
          ),
        ],
      },
    };

    expect(
      finalizeCharacterDraft({ draft: extraChoiceDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build must carry exactly the supported choices for the selected progression.",
        },
      ],
    });
    expect(
      finalizeCharacterDraft({ draft: duplicateChoiceDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build must carry exactly the supported choices for the selected progression.",
        },
      ],
    });
  });

  test("keeps drafts whose Unit-backed selected options lost Unit refs incomplete", () => {
    const complete = completeManifestDraft();
    const missingUnitRefDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: complete.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.unitId === "fighter_fighting_style" &&
          choice.source.choiceKey === "class_feature_feat_choice"
            ? {
                ...choice,
                options: choice.options.map((option) => ({
                  optionId: option.optionId,
                })),
              }
            : choice,
        ),
      },
    };

    const finalization = finalizeCharacterDraft({
      draft: missingUnitRefDraft,
      unitLibrary,
    });

    expect(finalization).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId(
            "fighter_fighting_style",
            "class_feature_feat_choice",
          ),
        },
      ],
    });
  });

  test("projects selected class-feature proficiency grants into build skills", () => {
    const fighter = unitLibrary.requireUnit("class_fighter");
    const secondWind = unitLibrary.requireUnit("fighter_second_wind");
    const bonusProficiencies = {
      ...secondWind,
      id: "fighter_bonus_proficiencies",
      name: "Bonus Proficiencies",
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "grant_proficiency",
            proficiency: {
              kind: "choice",
              count: 3,
              options: [
                { kind: "skill", skill: "animal_handling" },
                { kind: "skill", skill: "medicine" },
                { kind: "skill", skill: "religion" },
              ],
            },
          },
        ],
      },
    } as UnitRecord;
    const widenedFighter = {
      ...fighter,
      featureGrants: [
        ...("featureGrants" in fighter ? fighter.featureGrants : []),
        { level: 2, unitId: "fighter_bonus_proficiencies" },
      ],
    } as UnitRecord;
    const widenedUnitLibrary = unitLibraryReplacingUnits([
      widenedFighter,
      bonusProficiencies,
    ]);
    const draft = createCharacterDraft({
      unitLibrary: widenedUnitLibrary,
      draftId: characterDraftId("draft:class-feature-proficiency-grant"),
    });
    const afterProgression = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills(
          "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
        ),
      }),
    );

    const proficiencyHole = holeById(
      discoverCreationHoles({
        draft: afterProgression,
        unitLibrary: widenedUnitLibrary,
      }),
      testUnitHoleId(
        "fighter_bonus_proficiencies",
        "class_feature_proficiency_choice",
      ),
    );
    expect(proficiencyHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 3 },
      options: expect.arrayContaining([
        expect.objectContaining({ optionId: "animal_handling" }),
        expect.objectContaining({ optionId: "medicine" }),
        expect.objectContaining({ optionId: "religion" }),
      ]),
    });

    const afterChoices = requireAcceptedBatch(
      fillCreationHoles({
        draft: afterProgression,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: afterProgression.revision,
        fills: [
          choiceFill(
            testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
            "perception",
            "survival",
          ),
          choiceFill(
            testUnitHoleId(
              "fighter_fighting_style",
              "class_feature_feat_choice",
            ),
            "defense",
          ),
          choiceFill(
            testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
            "weapon_longsword",
            "weapon_spear",
            "weapon_flail",
          ),
          choiceFill(
            testUnitHoleId(
              "fighter_bonus_proficiencies",
              "class_feature_proficiency_choice",
            ),
            "animal_handling",
            "medicine",
            "religion",
          ),
          choiceFill(
            testUnitHoleId(
              "background_soldier",
              "background_ability_score_increase",
            ),
            "two_and_one:str:con",
          ),
          choiceFill(
            testUnitHoleId("background_soldier", "background_tool_choice"),
            "tool_dice_set",
          ),
          choiceFill(
            testUnitHoleId("class_fighter", "class_equipment_choice"),
            "option_c",
          ),
          choiceFill(
            testUnitHoleId("background_soldier", "background_equipment_choice"),
            "option_b",
          ),
        ],
      }),
    );
    const afterPurchase = requireAcceptedBatch(
      fillCreationHoles({
        draft: afterChoices,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: afterChoices.revision,
        fills: [
          choiceFill(
            testUnitHoleId("class_fighter", "equipment_purchase"),
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
          ),
        ],
      }),
    );
    const complete = requireAcceptedBatch(
      fillCreationHoles({
        draft: afterPurchase,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: afterPurchase.revision,
        fills: [
          choiceFill(testLoadoutHoleId("armor_chain_mail", "armor"), "worn"),
          choiceFill(
            testLoadoutHoleId("equipment_shield", "shield"),
            "wielded",
          ),
          choiceFill(
            testLoadoutHoleId("weapon_longsword", "weapon"),
            "wielded_one_handed",
          ),
        ],
      }),
    );

    const finalization = finalizeCharacterDraft({
      draft: complete,
      unitLibrary: widenedUnitLibrary,
    });

    expect(finalization).toMatchObject({
      tag: "ready",
      build: {
        proficiencies: {
          skills: [
            "perception",
            "survival",
            "animal_handling",
            "medicine",
            "religion",
            "athletics",
            "intimidation",
          ],
        },
      },
    });
  });

  test("represents mixed class-feature proficiency grant subjects without narrowing to skills", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      unitOptionIdsByChoiceKey: Record<string, CreationChoiceOptionId[]>;
    };
    const originalProficiencyOptions =
      profile.unitOptionIdsByChoiceKey.class_feature_proficiency_choice;
    profile.unitOptionIdsByChoiceKey.class_feature_proficiency_choice = [
      ...(originalProficiencyOptions ?? []),
      creationChoiceOptionId("tool:tool_thieves_tools"),
    ];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const mixedProficiencies = {
        ...secondWind,
        id: "fighter_mixed_proficiencies",
        name: "Mixed Proficiencies",
        mechanics: {
          family: "passive",
          grants: [
            {
              kind: "grant_proficiency",
              proficiency: {
                kind: "choice",
                count: 4,
                options: [
                  { kind: "skill", skill: "medicine" },
                  { kind: "weapon_category", category: "martial" },
                  { kind: "armor_category", category: "light" },
                  { kind: "tool", toolId: "tool_thieves_tools" },
                ],
              },
            },
          ],
        },
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 2, unitId: "fighter_mixed_proficiencies" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        mixedProficiencies,
      ]);
      const complete = completeFighterTwoDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          choices: [
            ...complete.selections.choices,
            selectedChoice(
              "fighter_mixed_proficiencies",
              "class_feature_proficiency_choice",
              "medicine",
              "weapon_category:martial",
              "armor_category:light",
              "tool:tool_thieves_tools",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });

      expect(result).toMatchObject({
        tag: "ready",
        build: {
          armorTraining: expect.arrayContaining(["light"]),
          proficiencies: {
            skills: expect.arrayContaining(["medicine"]),
            weapon: expect.arrayContaining(["martial"]),
            tools: expect.arrayContaining(["tool_thieves_tools"]),
          },
        },
      });
    } finally {
      profile.unitOptionIdsByChoiceKey.class_feature_proficiency_choice =
        originalProficiencyOptions;
    }
  });

  test("round-trips every class-feature proficiency subject option shape", () => {
    const subjects: readonly ProficiencyGrantSubject[] = [
      { kind: "skill", skill: "medicine" },
      { kind: "weapon_category", category: "martial" },
      { kind: "armor_category", category: "light" },
      { kind: "tool", toolId: "tool_thieves_tools" },
    ];

    for (const subject of subjects) {
      const option = proficiencyGrantSubjectOption(subject);
      const decoded = decodeProficiencyGrantSubjectOptionId(option.optionId);
      expect(Either.isRight(decoded)).toBe(true);
      if (Either.isRight(decoded)) {
        expect(decoded.right).toEqual(subject);
      }
    }
    expect(
      Either.isLeft(
        decodeProficiencyGrantSubjectOptionId("weapon_category:future"),
      ),
    ).toBe(true);
    expect(Either.isLeft(decodeProficiencyGrantSubjectOptionId("tool:"))).toBe(
      true,
    );
    expect(
      Either.isLeft(decodeProficiencyGrantSubjectOptionId("tool:   ")),
    ).toBe(true);
    expect(
      proficiencyGrantSubjectOption({ kind: "skill", skill: "medicine" }),
    ).toMatchObject({ label: "Medicine" });
  });

  test("keeps duplicate or missing equipment ownership fillable", () => {
    const complete = completeManifestDraft();
    const duplicateEquipmentDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
            "equipment_shield",
          ],
        },
      },
    };
    const missingShieldDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "weapon_longsword",
          ],
        },
      },
    };

    expect(
      finalizeCharacterDraft({ draft: duplicateEquipmentDraft, unitLibrary }),
    ).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId("class_fighter", "equipment_purchase"),
        },
      ],
    });
    expect(
      finalizeCharacterDraft({ draft: missingShieldDraft, unitLibrary }),
    ).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId("class_fighter", "equipment_purchase"),
        },
      ],
    });
  });
});

function draftWithSelections(
  selections: Partial<CharacterDraft["selections"]>,
): CharacterDraft {
  const base = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId("draft:with-selections"),
  });

  return {
    ...base,
    selections: {
      ...base.selections,
      ...selections,
    },
  };
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(draftId),
  });
}

function unitLibraryWithUnrelatedUnits(count: number): UnitCatalog {
  const fighter = unitLibrary.requireUnit("class_fighter");
  const soldier = unitLibrary.requireUnit("background_soldier");
  const orc = unitLibrary.requireUnit("species_orc");
  const longsword = unitLibrary.requireUnit("weapon_longsword");
  const unrelatedUnits: UnitRecord[] = Array.from(
    { length: count },
    (_, index) =>
      [
        { ...fighter, id: `class_unrelated_${index}` },
        { ...soldier, id: `background_unrelated_${index}` },
        { ...orc, id: `species_unrelated_${index}` },
        { ...longsword, id: `weapon_unrelated_${index}` },
      ] as UnitRecord[],
  ).flat();
  const units = [...unitLibrary.listUnits(), ...unrelatedUnits];

  return {
    ...unitLibrary,
    listUnits: () => units,
    requireUnit: (id) => {
      const unit = units.find((candidate) => candidate.id === id);
      if (unit == null) {
        throw new Error(`Missing test Unit: ${id}`);
      }

      return unit;
    },
  };
}

function unitLibraryReplacingUnits(
  replacements: readonly UnitRecord[],
): UnitCatalog {
  const replacementById = new Map(
    replacements.map((unit) => [unit.id, unit] as const),
  );
  const baseUnits = unitLibrary.listUnits();
  const units = [
    ...baseUnits.map((unit) => replacementById.get(unit.id) ?? unit),
    ...replacements.filter(
      (unit) => !baseUnits.some((baseUnit) => baseUnit.id === unit.id),
    ),
  ];

  return {
    ...unitLibrary,
    getUnit: (id) => Option.fromNullable(units.find((unit) => unit.id === id)),
    listUnits: () => units,
    requireUnit: (id) => {
      const unit = units.find((candidate) => candidate.id === id);
      if (unit == null) {
        throw new Error(`Missing test Unit: ${id}`);
      }

      return unit;
    },
  };
}

function initialManifestFills(
  progressionOptionId = "13:class_fighter:level_1:maximum_hit_die",
): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.progression.initial", progressionOptionId),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    },
    {
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function completeManifestDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-manifest");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );

  return completeManifestDraftAfterProgression(afterInitial);
}

function completeFighterTwoDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-fighter-two");
  const afterProgression = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(
        "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
      ),
    }),
  );

  return completeManifestDraftAfterProgression(afterProgression);
}

function completeManifestDraftAfterProgression(
  afterProgression: CharacterDraft,
): CharacterDraft {
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterProgression,
      unitLibrary,
      expectedRevision: afterProgression.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          testUnitHoleId("class_fighter", "class_equipment_choice"),
          "option_c",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function completeWizardDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-wizard");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "12:class_wizard:level_1:maximum_hit_die",
        ),
        choiceFill("cc:draft:draft.background", "background_soldier"),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 8,
            dex: 14,
            con: 13,
            int: 15,
            wis: 10,
            cha: 12,
          }),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "class_skill_proficiency_choice"),
          "arcana",
          "history",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_cantrip_choices"),
          "light",
          "fire_bolt",
          "ray_of_frost",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_spellbook_choices"),
          "detect_magic",
          "mage_armor",
          "magic_missile",
          "shield",
          "sleep",
          "thunderwave",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_prepared_spell_choices"),
          "detect_magic",
          "mage_armor",
          "magic_missile",
          "sleep",
        ),
        choiceFill(
          testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "class_equipment_choice"),
          "option_b",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "equipment_purchase"),
          "weapon_longsword",
          "weapon_dagger",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function completeWizardThenFighterDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-wizard-fighter");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "12:class_wizard|13:class_fighter:level_2:fixed_hp_gain",
        ),
        choiceFill("cc:draft:draft.background", "background_soldier"),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 15,
            dex: 14,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "class_skill_proficiency_choice"),
          "arcana",
          "history",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_cantrip_choices"),
          "light",
          "fire_bolt",
          "ray_of_frost",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_spellbook_choices"),
          "detect_magic",
          "mage_armor",
          "magic_missile",
          "shield",
          "sleep",
          "thunderwave",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_prepared_spell_choices"),
          "detect_magic",
          "mage_armor",
          "magic_missile",
          "sleep",
        ),
        choiceFill(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "class_equipment_choice"),
          "option_b",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected accepted character-creation fill batch, received ${JSON.stringify(result.issues)}`,
    );
  }

  return result.draft;
}

type AcceptedCreationBatch = Extract<
  ReturnType<typeof fillCreationHoles>,
  { readonly tag: "accepted" }
>;
type RejectedCreationBatch = Extract<
  ReturnType<typeof fillCreationHoles>,
  { readonly tag: "rejected" }
>;
type MutableSupportProfile = {
  unitOptionIdsByChoiceKey: {
    equipment_purchase: ReturnType<typeof creationChoiceOptionId>[];
  };
  purchasableEquipmentUnitIds: UnitRecord["id"][];
  loadoutChoices: SupportedLoadoutChoice[];
  equipmentPurchaseChoiceCount: number;
};

const HOLE_ID_TO_QNT_VARIANT = {
  "cc:draft:draft.progression.initial": "HProgression",
  "cc:draft:draft.background": "HBackground",
  "cc:draft:draft.species": "HSpecies",
  "cc:draft:draft.abilityScoreGeneration": "HAbilityScores",
  "cc:draft:draft.languages": "HLanguages",
  "cc:draft:draft.alignment": "HAlignment",
  [testUnitHoleId("class_fighter", "class_skill_proficiency_choice")]:
    "HClassSkills",
  [testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice")]:
    "HFighterFightingStyle",
  [testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options")]:
    "HFighterWeaponMastery",
  [testUnitHoleId("background_soldier", "background_ability_score_increase")]:
    "HBackgroundAbilityScoreIncrease",
  [testUnitHoleId("background_soldier", "background_tool_choice")]:
    "HBackgroundTool",
  [testUnitHoleId("class_fighter", "class_equipment_choice")]:
    "HClassEquipment",
  [testUnitHoleId("background_soldier", "background_equipment_choice")]:
    "HBackgroundEquipment",
  [testUnitHoleId("class_fighter", "equipment_purchase")]: "HEquipmentPurchase",
  [testLoadoutHoleId("armor_chain_mail", "armor")]: "HLoadoutArmor",
  [testLoadoutHoleId("equipment_shield", "shield")]: "HLoadoutShield",
  [testLoadoutHoleId("weapon_longsword", "weapon")]: "HLoadoutWeapon",
} as const satisfies Record<string, string>;
const HOLE_ID_TO_QNT_VARIANT_LOOKUP: Readonly<Record<string, string>> =
  HOLE_ID_TO_QNT_VARIANT;

const FILL_ISSUE_CODE_TO_QNT_VARIANT = {
  unknownHole: "UnknownHole",
  duplicateFill: "DuplicateFill",
  wrongFillKind: "WrongFillKind",
  invalidChoice: "InvalidChoice",
  invalidAbilityScores: "InvalidAbilityScores",
  tooFewChoices: "TooFewChoices",
  tooManyChoices: "TooManyChoices",
  unsupportedChoice: "UnsupportedChoice",
} as const satisfies Record<CreationFillIssue["code"], string>;

function runQuintSliceSelfTests(): void {
  const quintOutput = execFileSync(
    "pnpm",
    [
      "exec",
      "quint",
      "test",
      "--backend",
      "typescript",
      characterCreationRuntimeSlicePath,
      "--match",
      "test_",
    ],
    { encoding: "utf8" },
  );
  expect(quintOutput).toContain("9 passing");
}

function runGeneratedQuintParity(moduleBody: string): void {
  const tempDir = fs.mkdtempSync(
    path.join(
      packageRootPath,
      `.tmp-character-creation-parity-${os.userInfo().username}-`,
    ),
  );
  const tempFile = path.join(tempDir, "character-creation-runtime-parity.qnt");

  try {
    fs.writeFileSync(tempFile, moduleBody);
    const quintOutput = execFileSync(
      "pnpm",
      [
        "exec",
        "quint",
        "test",
        "--backend",
        "typescript",
        tempFile,
        "--match",
        "parity_",
      ],
      { encoding: "utf8" },
    );
    expect(quintOutput).toContain("13 passing");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function renderQuintParityModule(input: {
  readonly initialHoles: readonly CreationHole[];
  readonly afterInitial: AcceptedCreationBatch;
  readonly complete: CharacterDraft;
  readonly completeHoles: readonly CreationHole[];
  readonly completeFinalization: ReturnType<typeof finalizeCharacterDraft>;
  readonly invalid: RejectedCreationBatch;
  readonly unsupportedLanguage: RejectedCreationBatch;
  readonly unsupportedAlignment: RejectedCreationBatch;
  readonly duplicateLanguage: RejectedCreationBatch;
  readonly unsupportedLaterChoices: RejectedCreationBatch;
  readonly standardArrayPermutation: AcceptedCreationBatch;
  readonly pointBuyAssignment: AcceptedCreationBatch;
  readonly tooFewLanguages: RejectedCreationBatch;
  readonly tooManyLanguages: RejectedCreationBatch;
  readonly staleRevision: RejectedCreationBatch;
}): string {
  const completeFinalizationTag = qntFinalizationTag(
    input.completeFinalization.tag,
  );

  return `module characterCreationRuntimeParity {
  import characterCreationRuntimeSlice.* from "../character-creation-runtime-slice"

  run parity_initial_holes_match_runtime = {
    assert(openCreationHoles(emptyDraft) == ${renderQntHoleSet(input.initialHoles)})
  }

  run parity_initial_batch_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, initialManifestFills) {
      | Accepted(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.afterInitial.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.afterInitial.holes)}),
            assert(v.finalization == ${qntFinalizationTag(input.afterInitial.finalization.tag)}),
          }
      | Rejected(_) => assert(false)
    }
  }

  run parity_complete_manifest_matches_runtime = {
    all {
      assert(completeManifestDraft == ${renderQntDraftProjection(input.complete)}),
      assert(openCreationHoles(completeManifestDraft) == ${renderQntHoleSet(input.completeHoles)}),
      assert(finalizeDraft(completeManifestDraft) == ${completeFinalizationTag}),
    }
  }

  run parity_standard_array_permutation_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FAbilityScores({
        hole: HAbilityScores,
        method: StandardArray,
        scores: {
          strength: 14,
          dexterity: 15,
          constitution: 13,
          intelligence: 8,
          wisdom: 10,
          charisma: 12,
        },
      }),
    ]) {
      | Accepted(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.standardArrayPermutation.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.standardArrayPermutation.holes)}),
            assert(v.finalization == ${qntFinalizationTag(input.standardArrayPermutation.finalization.tag)}),
          }
      | Rejected(_) => assert(false)
    }
  }

  run parity_point_buy_assignment_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FAbilityScores({
        hole: HAbilityScores,
        method: PointBuy,
        scores: {
          strength: 13,
          dexterity: 13,
          constitution: 13,
          intelligence: 12,
          wisdom: 12,
          charisma: 12,
        },
      }),
    ]) {
      | Accepted(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.pointBuyAssignment.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.pointBuyAssignment.holes)}),
            assert(v.finalization == ${qntFinalizationTag(input.pointBuyAssignment.finalization.tag)}),
          }
      | Rejected(_) => assert(false)
    }
  }

  run parity_invalid_primary_class_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HProgression, options: [OBackgroundSoldier] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.invalid.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.invalid.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.invalid.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.invalid.finalization.tag)}),
          }
    }
  }

  run parity_unsupported_language_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageElvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.unsupportedLanguage.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.unsupportedLanguage.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.unsupportedLanguage.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.unsupportedLanguage.finalization.tag)}),
          }
    }
  }

  run parity_duplicate_language_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageDwarvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.duplicateLanguage.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.duplicateLanguage.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.duplicateLanguage.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.duplicateLanguage.finalization.tag)}),
          }
    }
  }

  run parity_unsupported_alignment_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HAlignment, options: [OAlignmentNeutralGood] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.unsupportedAlignment.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.unsupportedAlignment.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.unsupportedAlignment.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.unsupportedAlignment.finalization.tag)}),
          }
    }
  }

  run parity_later_valid_but_unsupported_choices_match_runtime = {
    match fillCreationHoles(afterInitialManifest, 1, [
      FChoice({ hole: HClassSkills, options: [OSkillPerception, OSkillAthletics] }),
      FChoice({ hole: HBackgroundEquipment, options: [OBackgroundEquipmentPack] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.unsupportedLaterChoices.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.unsupportedLaterChoices.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.unsupportedLaterChoices.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.unsupportedLaterChoices.finalization.tag)}),
          }
    }
  }

  run parity_too_few_languages_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.tooFewLanguages.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.tooFewLanguages.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.tooFewLanguages.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.tooFewLanguages.finalization.tag)}),
          }
    }
  }

  run parity_too_many_languages_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin, OLanguageElvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.tooManyLanguages.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.tooManyLanguages.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.tooManyLanguages.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.tooManyLanguages.finalization.tag)}),
          }
    }
  }

  run parity_stale_revision_matches_runtime_boundary = {
    match fillCreationHoles(emptyDraft, 1, []) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.staleRevision.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.staleRevision.holes)}),
            assert(v.issues.batch == ${renderQntBatchIssueSet(input.staleRevision.issues)}),
            assert(v.issues.fills == Set()),
            assert(v.finalization == ${qntFinalizationTag(input.staleRevision.finalization.tag)}),
          }
    }
  }
}
`;
}

function renderQntDraftProjection(draft: CharacterDraft): string {
  const selections = draft.selections;

  return `{
    revision: ${draft.revision},
    progression: ${qntProgressionSelection(selections.progression)},
    background: ${qntBool(selections.background != null)},
    species: ${qntBool(selections.species != null)},
    abilityScores: ${qntBool(selections.abilityScoreGeneration != null)},
    languages: ${qntBool(selections.languages != null)},
    alignment: ${qntBool(selections.alignment != null)},
    classSkills: ${qntBool(hasChoiceSelection(draft, "class_fighter", "class_skill_proficiency_choice"))},
    fighterFightingStyle: ${qntBool(hasChoiceSelection(draft, "fighter_fighting_style", "class_feature_feat_choice"))},
    fighterWeaponMastery: ${qntBool(hasChoiceSelection(draft, "fighter_weapon_mastery", "weapon_mastery_options"))},
    backgroundAbilityScoreIncrease: ${qntBool(selections.backgroundAbilityScoreIncrease != null)},
    backgroundTool: ${qntBool(hasChoiceSelection(draft, "background_soldier", "background_tool_choice"))},
    classEquipment: ${qntBool(hasChoiceSelection(draft, "class_fighter", "class_equipment_choice"))},
    backgroundEquipment: ${qntBool(hasChoiceSelection(draft, "background_soldier", "background_equipment_choice"))},
    equipmentPurchase: ${qntBool(selections.equipment != null)},
    loadoutArmor: ${qntBool(hasChoiceSelection(draft, "armor_chain_mail", "loadout_armor"))},
    loadoutShield: ${qntBool(hasChoiceSelection(draft, "equipment_shield", "loadout_shield"))},
    loadoutWeapon: ${qntBool(hasChoiceSelection(draft, "weapon_longsword", "loadout_weapon"))},
  }`;
}

function qntProgressionSelection(
  progression: CharacterDraft["selections"]["progression"],
): string {
  if (progression == null) {
    return "NoProgression";
  }

  if (startingClassUnitId(progression) === "class_wizard") {
    return "WizardLevel1";
  }

  return computeTotalLevel(progression) === 1
    ? "FighterLevel1"
    : "FighterLevel2";
}

function renderQntHoleSet(holes: readonly CreationHole[]): string {
  return renderQntSet(holes.map((hole) => qntHoleVariant(hole.holeId)));
}

function renderQntFillIssueSet(issues: readonly unknown[]): string {
  const fillIssues = issues.filter(
    (issue): issue is CreationFillIssue =>
      typeof issue === "object" &&
      issue != null &&
      "tag" in issue &&
      issue.tag === "illegalFill",
  );

  return renderQntSet(
    fillIssues.map(
      (issue) =>
        `{ fillIndex: ${issue.fillIndex}, hole: ${qntHoleVariant(issue.holeId)}, code: ${FILL_ISSUE_CODE_TO_QNT_VARIANT[issue.code]} }`,
    ),
  );
}

function renderQntBatchIssueSet(issues: readonly unknown[]): string {
  const hasStaleRevision = issues.some(
    (issue) =>
      typeof issue === "object" &&
      issue != null &&
      "tag" in issue &&
      issue.tag === "illegalBatch" &&
      "code" in issue &&
      issue.code === "staleRevision",
  );

  return hasStaleRevision ? "Set(StaleRevision)" : "Set()";
}

function renderQntSet(items: readonly string[]): string {
  return items.length === 0 ? "Set()" : `Set(${items.join(", ")})`;
}

function qntHoleVariant(holeId: string): string {
  const variant = HOLE_ID_TO_QNT_VARIANT_LOOKUP[holeId];
  if (variant == null) {
    throw new Error(`No QNT hole-id variant mapping for ${holeId}.`);
  }

  return variant;
}

function qntFinalizationTag(
  tag: ReturnType<typeof finalizeCharacterDraft>["tag"],
): string {
  if (tag === "ready") {
    return "Ready";
  }

  return tag === "incomplete" ? "Incomplete" : "Invalid";
}

function qntBool(value: boolean): string {
  return value ? "true" : "false";
}

function hasChoiceSelection(
  draft: CharacterDraft,
  unitId: string,
  choiceKey: string,
): boolean {
  return selectedChoiceBySource(draft, unitId, choiceKey) != null;
}

function selectedChoiceBySource(
  draft: CharacterDraft,
  unitId: string,
  choiceKey: string,
): CharacterChoiceSelection | undefined {
  const loadoutSlot = qntLoadoutSlot(choiceKey);
  return draft.selections.choices.find(
    (choice) =>
      (choice.kind === "unitChoice" &&
        choice.source.unitId === unitId &&
        choice.source.choiceKey === choiceKey) ||
      (choice.kind === "loadout" &&
        choice.source.equipmentUnitId === unitId &&
        choice.source.slot === loadoutSlot),
  );
}

function choiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    // Test fixtures pass discovered hole ids as text, so they cast at the same
    // protocol boundary as caller-provided fill payloads.
    holeId: creationHoleId(holeId as CreationHoleIdText),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function holeSummary(
  holes: readonly CreationHole[],
): readonly (readonly [CreationHole["kind"], string, readonly string[]])[] {
  return holes.map((hole) => [
    hole.kind,
    hole.holeId,
    hole.kind === "abilityScores"
      ? hole.methods
      : "options" in hole
        ? hole.options.map((option) => option.optionId)
        : [],
  ]);
}

function holeById(
  holes: readonly CreationHole[],
  holeId: string,
): CreationHole | undefined {
  return holes.find((hole) => hole.holeId === holeId);
}

function optionIds(hole: CreationHole | undefined): readonly string[] {
  return hole != null && "options" in hole
    ? hole.options.map((option) => option.optionId)
    : [];
}

function selectedChoice(
  unitId: string,
  choiceKey: string,
  ...optionIds: readonly string[]
): CharacterChoiceSelection {
  return {
    kind: "unitChoice",
    source: {
      tag: "unitChoice",
      unitId: unitChoiceSourceUnitIdRight(unitId),
      choiceKey: unitChoiceKeyRight(choiceKey),
    },
    options: optionIds.map((optionId) => ({
      optionId: creationChoiceOptionId(optionId),
    })),
  };
}

function selectedChoiceWithUnitRef(
  unitId: string,
  choiceKey: string,
  optionId: string,
  optionUnitId: string,
): CharacterChoiceSelection {
  return {
    kind: "unitChoice",
    source: {
      tag: "unitChoice",
      unitId: unitChoiceSourceUnitIdRight(unitId),
      choiceKey: unitChoiceKeyRight(choiceKey),
    },
    options: [
      {
        optionId: creationChoiceOptionId(optionId),
        unitRef: { unitId: optionUnitId },
      },
    ],
  };
}

function selectedUnitChoice(
  unitId: string,
  choiceKey: string,
  ...optionIds: readonly string[]
): CharacterChoiceSelection {
  return {
    kind: "unitChoice",
    source: {
      tag: "unitChoice",
      unitId: unitChoiceSourceUnitIdRight(unitId),
      choiceKey: unitChoiceKeyRight(choiceKey),
    },
    options: optionIds.map((optionId) => ({
      optionId: creationChoiceOptionId(optionId),
      unitRef: { unitId: optionId },
    })),
  };
}

function selectedLoadoutChoice(
  unitId: string,
  slot: LoadoutSlot,
  optionId: string,
): CharacterChoiceSelection {
  return {
    kind: "loadout",
    source: {
      tag: "loadout",
      equipmentUnitId: loadoutEquipmentUnitIdRight(unitId),
      slot,
    },
    options: [
      {
        optionId: creationChoiceOptionId(optionId),
      },
    ],
  };
}
