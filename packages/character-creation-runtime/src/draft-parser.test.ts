import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { createCharacterDraft, parseCharacterDraft } from "./draft.ts";

type FixturePath = readonly (string | number)[];

const SYNTHETIC_MAXIMAL_STORED_DRAFT = {
  draftId: "draft:synthetic-maximal",
  revision: 3,
  selections: {
    progression: {
      startingClass: "synthetic_class",
      advancements: [
        {
          classUnitId: "synthetic_class",
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    background: "synthetic_background",
    abilityScoreGeneration: {
      method: "standardArray",
      assignedScores: {
        str: 15,
        dex: 14,
        con: 13,
        int: 12,
        wis: 10,
        cha: 8,
      },
    },
    backgroundAbilityScoreIncrease: {
      kind: "twoAndOne",
      plusTwo: "str",
      plusOne: "dex",
    },
    species: "synthetic_species",
    speciesSize: "medium",
    draconicAncestry: "synthetic_ancestry",
    languages: ["Common", "Dwarvish", "Elvish"],
    alignment: { order: "lawful", morality: "good" },
    equipment: { selectedUnitIds: ["synthetic_item"] },
    choices: [
      {
        kind: "unitChoice",
        source: {
          tag: "unitChoice",
          unitId: "synthetic_source",
          choiceKey: "class_skill_proficiency_choice",
        },
        options: [
          {
            optionId: "synthetic_option",
            unitRef: { unitId: "synthetic_selected_unit" },
          },
          { optionId: "synthetic_option_without_unit" },
        ],
      },
      {
        kind: "loadout",
        source: {
          tag: "loadout",
          equipmentUnitId: "synthetic_item",
          slot: "weapon",
        },
        options: [{ optionId: "synthetic_loadout_option" }],
      },
    ],
  },
};

function maximalStoredDraft(): unknown {
  return structuredClone(SYNTHETIC_MAXIMAL_STORED_DRAFT);
}

function isFixtureContainer(
  value: unknown,
): value is Record<string, unknown> | unknown[] {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

function isFixtureRecord(value: unknown): value is Record<string, unknown> {
  return !Array.isArray(value) && typeof value === "object" && value !== null;
}

function fixtureContainerAt(
  root: unknown,
  path: FixturePath,
): Record<string, unknown> | unknown[] {
  let cursor = root;
  for (const segment of path) {
    if (Array.isArray(cursor)) {
      if (typeof segment !== "number") {
        expect.fail("Array fixture paths require numeric segments.");
      }
      cursor = cursor[segment];
      continue;
    }
    if (!isFixtureRecord(cursor)) {
      expect.fail("Fixture path must resolve through an object or array.");
    }
    cursor = cursor[String(segment)];
  }
  if (!isFixtureContainer(cursor)) {
    expect.fail("Fixture path must resolve to a mutable container.");
  }
  return cursor;
}

function storedDraftWith(path: FixturePath, value: unknown): unknown {
  const draft = maximalStoredDraft();
  const parent = fixtureContainerAt(draft, path.slice(0, -1));
  const key = path.at(-1);
  if (key === undefined) {
    expect.fail("Fixture mutation paths must be non-empty.");
  }
  if (Array.isArray(parent)) {
    if (typeof key !== "number") {
      expect.fail("Array fixture paths require numeric terminal segments.");
    }
    parent[key] = value;
  } else {
    parent[String(key)] = value;
  }
  return draft;
}

function expectInvalidDraft(value: unknown, path: string): void {
  expect(parseCharacterDraft(value)).toEqual(
    Result.fail(
      expect.objectContaining({
        tag: "invalidCharacterDraft",
        path,
      }),
    ),
  );
}

describe("stored CharacterDraft parser", () => {
  test("parses every durable selection variant in one maximal stored draft", () => {
    const result = parseCharacterDraft(maximalStoredDraft());

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.success).toMatchObject({
        draftId: "draft:synthetic-maximal",
        revision: 3,
        selections: {
          progression: {
            startingClass: "synthetic_class",
            advancements: [
              {
                classUnitId: "synthetic_class",
                hitPointRule: { tag: "fixedHigherLevelGain" },
              },
            ],
          },
          backgroundAbilityScoreIncrease: {
            kind: "twoAndOne",
            plusTwo: "str",
            plusOne: "dex",
          },
          speciesSize: "medium",
          languages: ["Common", "Dwarvish", "Elvish"],
          choices: [
            expect.objectContaining({ kind: "unitChoice" }),
            expect.objectContaining({ kind: "loadout" }),
          ],
        },
      });
    }
  });

  test("parses the alternate durable selection variants", () => {
    const pointBuy = storedDraftWith(["selections", "abilityScoreGeneration"], {
      method: "pointBuy",
      assignedScores: {
        str: 13,
        dex: 13,
        con: 13,
        int: 12,
        wis: 12,
        cha: 12,
      },
    });
    const oneEach = storedDraftWith(
      ["selections", "backgroundAbilityScoreIncrease"],
      { kind: "oneEach" },
    );
    const small = storedDraftWith(["selections", "speciesSize"], "small");

    expect(Result.isSuccess(parseCharacterDraft(pointBuy))).toBe(true);
    expect(Result.isSuccess(parseCharacterDraft(oneEach))).toBe(true);
    expect(Result.isSuccess(parseCharacterDraft(small))).toBe(true);
  });

  test.each([
    ["root object", [], null, "$"],
    ["draft id", ["draftId"], 1, "$.draftId"],
    ["negative revision", ["revision"], -1, "$.revision"],
    ["fractional revision", ["revision"], 1.5, "$.revision"],
    ["revision type", ["revision"], "1", "$.revision"],
    ["selection object", ["selections"], null, "$.selections"],
    ["choice array", ["selections", "choices"], {}, "$.selections.choices"],
    [
      "choice object",
      ["selections", "choices", 0],
      null,
      "$.selections.choices[0]",
    ],
    [
      "choice kind",
      ["selections", "choices", 0, "kind"],
      "syntheticUnsupported",
      "$.selections.choices[0]",
    ],
    [
      "Unit choice source object",
      ["selections", "choices", 0, "source"],
      null,
      "$.selections.choices[0].source",
    ],
    [
      "Unit choice source tag",
      ["selections", "choices", 0, "source", "tag"],
      "loadout",
      "$.selections.choices[0].source.tag",
    ],
    [
      "Unit choice source id type",
      ["selections", "choices", 0, "source", "unitId"],
      1,
      "$.selections.choices[0].source.unitId",
    ],
    [
      "Unit choice source id value",
      ["selections", "choices", 0, "source", "unitId"],
      "",
      "$.selections.choices[0].source.unitId",
    ],
    [
      "Unit choice key type",
      ["selections", "choices", 0, "source", "choiceKey"],
      1,
      "$.selections.choices[0].source.choiceKey",
    ],
    [
      "Unit choice key value",
      ["selections", "choices", 0, "source", "choiceKey"],
      "syntheticUnsupported",
      "$.selections.choices[0].source.choiceKey",
    ],
    [
      "Unit choice options",
      ["selections", "choices", 0, "options"],
      null,
      "$.selections.choices[0].options",
    ],
    [
      "Unit choice option object",
      ["selections", "choices", 0, "options", 0],
      null,
      "$.selections.choices[0].options[0]",
    ],
    [
      "Unit choice option id",
      ["selections", "choices", 0, "options", 0, "optionId"],
      1,
      "$.selections.choices[0].options[0].optionId",
    ],
    [
      "Unit choice option Unit ref object",
      ["selections", "choices", 0, "options", 0, "unitRef"],
      null,
      "$.selections.choices[0].options[0].unitRef",
    ],
    [
      "Unit choice option Unit ref id",
      ["selections", "choices", 0, "options", 0, "unitRef", "unitId"],
      1,
      "$.selections.choices[0].options[0].unitRef.unitId",
    ],
    [
      "loadout source object",
      ["selections", "choices", 1, "source"],
      null,
      "$.selections.choices[1].source",
    ],
    [
      "loadout source tag",
      ["selections", "choices", 1, "source", "tag"],
      "unitChoice",
      "$.selections.choices[1].source.tag",
    ],
    [
      "loadout equipment id type",
      ["selections", "choices", 1, "source", "equipmentUnitId"],
      1,
      "$.selections.choices[1].source.equipmentUnitId",
    ],
    [
      "loadout equipment id value",
      ["selections", "choices", 1, "source", "equipmentUnitId"],
      "",
      "$.selections.choices[1].source.equipmentUnitId",
    ],
    [
      "loadout slot",
      ["selections", "choices", 1, "source", "slot"],
      "syntheticUnsupported",
      "$.selections.choices[1].source.slot",
    ],
    [
      "loadout options",
      ["selections", "choices", 1, "options"],
      null,
      "$.selections.choices[1].options",
    ],
    [
      "loadout option cardinality",
      ["selections", "choices", 1, "options"],
      [],
      "$.selections.choices[1].options",
    ],
    [
      "loadout option object",
      ["selections", "choices", 1, "options", 0],
      null,
      "$.selections.choices[1].options[0]",
    ],
    [
      "loadout option id",
      ["selections", "choices", 1, "options", 0, "optionId"],
      1,
      "$.selections.choices[1].options[0].optionId",
    ],
    [
      "progression object",
      ["selections", "progression"],
      null,
      "$.selections.progression",
    ],
    [
      "starting class",
      ["selections", "progression", "startingClass"],
      1,
      "$.selections.progression.startingClass",
    ],
    [
      "advancement array",
      ["selections", "progression", "advancements"],
      null,
      "$.selections.progression.advancements",
    ],
    [
      "advancement object",
      ["selections", "progression", "advancements", 0],
      null,
      "$.selections.progression.advancements[0]",
    ],
    [
      "advancement class",
      ["selections", "progression", "advancements", 0, "classUnitId"],
      1,
      "$.selections.progression.advancements[0].classUnitId",
    ],
    [
      "advancement Hit Point rule object",
      ["selections", "progression", "advancements", 0, "hitPointRule"],
      null,
      "$.selections.progression.advancements[0].hitPointRule",
    ],
    [
      "advancement Hit Point rule tag",
      ["selections", "progression", "advancements", 0, "hitPointRule", "tag"],
      "syntheticUnsupported",
      "$.selections.progression.advancements[0].hitPointRule",
    ],
    ["background", ["selections", "background"], 1, "$.selections.background"],
    [
      "ability score generation object",
      ["selections", "abilityScoreGeneration"],
      null,
      "$.selections.abilityScoreGeneration",
    ],
    [
      "ability score method",
      ["selections", "abilityScoreGeneration", "method"],
      "syntheticUnsupported",
      "$.selections.abilityScoreGeneration",
    ],
    [
      "ability score assignment",
      ["selections", "abilityScoreGeneration", "assignedScores"],
      null,
      "$.selections.abilityScoreGeneration.assignedScores",
    ],
    [
      "background ability score object",
      ["selections", "backgroundAbilityScoreIncrease"],
      null,
      "$.selections.backgroundAbilityScoreIncrease",
    ],
    [
      "background ability score kind",
      ["selections", "backgroundAbilityScoreIncrease", "kind"],
      "syntheticUnsupported",
      "$.selections.backgroundAbilityScoreIncrease",
    ],
    [
      "background plus two ability",
      ["selections", "backgroundAbilityScoreIncrease", "plusTwo"],
      "syntheticUnsupported",
      "$.selections.backgroundAbilityScoreIncrease.plusTwo",
    ],
    [
      "background plus one ability",
      ["selections", "backgroundAbilityScoreIncrease", "plusOne"],
      "syntheticUnsupported",
      "$.selections.backgroundAbilityScoreIncrease.plusOne",
    ],
    [
      "duplicate background abilities",
      ["selections", "backgroundAbilityScoreIncrease", "plusOne"],
      "str",
      "$.selections.backgroundAbilityScoreIncrease",
    ],
    ["species", ["selections", "species"], 1, "$.selections.species"],
    [
      "species size type",
      ["selections", "speciesSize"],
      1,
      "$.selections.speciesSize",
    ],
    [
      "species size value",
      ["selections", "speciesSize"],
      "large",
      "$.selections.speciesSize",
    ],
    [
      "Draconic Ancestry",
      ["selections", "draconicAncestry"],
      1,
      "$.selections.draconicAncestry",
    ],
    [
      "language array",
      ["selections", "languages"],
      null,
      "$.selections.languages",
    ],
    [
      "language count",
      ["selections", "languages"],
      ["Common"],
      "$.selections.languages",
    ],
    [
      "Common language",
      ["selections", "languages", 0],
      "Dwarvish",
      "$.selections.languages[0]",
    ],
    [
      "first selected language",
      ["selections", "languages", 1],
      "Common",
      "$.selections.languages[1]",
    ],
    [
      "second selected language",
      ["selections", "languages", 2],
      "syntheticUnsupported",
      "$.selections.languages[2]",
    ],
    [
      "distinct selected languages",
      ["selections", "languages", 2],
      "Dwarvish",
      "$.selections.languages[2]",
    ],
    [
      "alignment object",
      ["selections", "alignment"],
      null,
      "$.selections.alignment",
    ],
    [
      "alignment order",
      ["selections", "alignment", "order"],
      "syntheticUnsupported",
      "$.selections.alignment.order",
    ],
    [
      "alignment morality",
      ["selections", "alignment", "morality"],
      "syntheticUnsupported",
      "$.selections.alignment.morality",
    ],
    [
      "equipment object",
      ["selections", "equipment"],
      null,
      "$.selections.equipment",
    ],
    [
      "equipment Unit id array",
      ["selections", "equipment", "selectedUnitIds"],
      null,
      "$.selections.equipment.selectedUnitIds",
    ],
    [
      "equipment Unit id",
      ["selections", "equipment", "selectedUnitIds", 0],
      1,
      "$.selections.equipment.selectedUnitIds[0]",
    ],
  ] as const)(
    "rejects an invalid $0",
    (_name, fixturePath, value, expectedPath) => {
      const invalidDraft =
        fixturePath.length === 0 ? value : storedDraftWith(fixturePath, value);
      expectInvalidDraft(invalidDraft, expectedPath);
    },
  );

  test("assigns stable unique ids to fresh drafts", () => {
    const first = createCharacterDraft({});
    const second = createCharacterDraft({});

    expect(first.draftId).not.toBe(second.draftId);
    expect(first).toEqual({
      draftId: expect.stringMatching(/^cc:draft:\d+$/),
      revision: 0,
      selections: { choices: [] },
    });
  });
});
