import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { CharacterSessionRowSchema } from "./character-tool-output.ts";

const normalCharacterRow = {
  characterId: "character:resource-projection",
  status: "available",
  displayName: "Resource Projection",
  build: {},
  hitPoints: {
    current: 10,
    maximum: 10,
    state: {},
  },
  hitDice: [
    {
      classUnitId: "class_synthetic",
      dieSize: 10,
      total: 2,
      spent: 1,
    },
  ],
  spellSlots: [{ spellLevel: 1, count: 2, expended: 1 }],
  pactSlots: { slotLevel: 1, count: 1, expended: 0 },
  resources: [
    {
      tag: "useCountResource",
      unitId: "resource_synthetic",
      count: 3,
      expended: 2,
    },
    {
      tag: "spellAccessFreeCast",
      sourceUnitId: "class_synthetic",
      spellId: "spell_synthetic",
      count: 1,
      expended: 0,
    },
  ],
  companion: {},
} as const;

const decodeCharacterRow = (value: unknown) =>
  Schema.decodeUnknownResult(CharacterSessionRowSchema)(value);

describe("character tool output resource boundary", () => {
  test("accepts a normal character sheet projection", () => {
    const decoded = decodeCharacterRow(normalCharacterRow);

    expect(Result.isSuccess(decoded)).toBe(true);
  });

  test.each([
    ["Spell Slots", { spellSlots: [{ spellLevel: 1, count: 1, expended: 2 }] }],
    [
      "Pact Magic slots",
      { pactSlots: { slotLevel: 1, count: 1, expended: 2 } },
    ],
    [
      "Hit Point Dice",
      {
        hitDice: [
          {
            classUnitId: "class_synthetic",
            dieSize: 10,
            total: 1,
            spent: 2,
          },
        ],
      },
    ],
    [
      "unit resources",
      {
        resources: [
          {
            tag: "useCountResource",
            unitId: "resource_synthetic",
            count: 1,
            expended: 2,
          },
        ],
      },
    ],
    [
      "free casts",
      {
        resources: [
          {
            tag: "spellAccessFreeCast",
            sourceUnitId: "class_synthetic",
            spellId: "spell_synthetic",
            count: 1,
            expended: 2,
          },
        ],
      },
    ],
  ] as const)("rejects malformed %s output", (_label, replacement) => {
    const malformed = { ...normalCharacterRow, ...replacement };

    expect(Result.isFailure(decodeCharacterRow(malformed))).toBe(true);
  });

  test("rejects unit fields that are not non-empty Unit IDs", () => {
    const malformed = {
      ...normalCharacterRow,
      resources: [
        {
          tag: "useCountResource",
          unitId: "",
          count: 1,
          expended: 0,
        },
      ],
    } as const;

    expect(Result.isFailure(decodeCharacterRow(malformed))).toBe(true);
  });
});
