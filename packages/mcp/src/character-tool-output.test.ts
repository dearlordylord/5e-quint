import { Result, Schema } from "effect";
import { describe, expect, expectTypeOf, test } from "vitest";

import {
  CharacterSessionRowSchema,
  CharacterSessionSheetProjectionSchema,
  parseCharacterSessionSheetProjection,
  type CharacterSessionSheetProjection,
} from "./character-tool-output.ts";

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

const normalCharacterSheetProjection = {
  currentHp: 10,
  companion: { tag: "none" },
  hitPointMaximum: 10,
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
} as const satisfies Schema.Codec.Encoded<
  typeof CharacterSessionSheetProjectionSchema
>;
type CharacterSessionSheetProjectionEncoded = Schema.Codec.Encoded<
  typeof CharacterSessionSheetProjectionSchema
>;

const malformedCharacterSheetProjections = [
  [
    "spell slots",
    {
      ...normalCharacterSheetProjection,
      spellSlots: [{ spellLevel: 1, count: 1, expended: 2 }],
    } satisfies Schema.Codec.Encoded<
      typeof CharacterSessionSheetProjectionSchema
    >,
  ],
  [
    "pact slots",
    {
      ...normalCharacterSheetProjection,
      pactSlots: { slotLevel: 1, count: 1, expended: 2 },
    } satisfies Schema.Codec.Encoded<
      typeof CharacterSessionSheetProjectionSchema
    >,
  ],
  [
    "hit dice",
    {
      ...normalCharacterSheetProjection,
      hitDice: [
        {
          classUnitId: "class_synthetic",
          dieSize: 10,
          total: 1,
          spent: 2,
        },
      ],
    } satisfies Schema.Codec.Encoded<
      typeof CharacterSessionSheetProjectionSchema
    >,
  ],
  [
    "unit resources",
    {
      ...normalCharacterSheetProjection,
      resources: [
        {
          tag: "useCountResource",
          unitId: "resource_synthetic",
          count: 1,
          expended: 2,
        },
      ],
    } satisfies Schema.Codec.Encoded<
      typeof CharacterSessionSheetProjectionSchema
    >,
  ],
  [
    "free casts",
    {
      ...normalCharacterSheetProjection,
      resources: [
        {
          tag: "spellAccessFreeCast",
          sourceUnitId: "class_synthetic",
          spellId: "spell_synthetic",
          count: 1,
          expended: 2,
        },
      ],
    } satisfies Schema.Codec.Encoded<
      typeof CharacterSessionSheetProjectionSchema
    >,
  ],
] as const;

type StructuralSpellSlotRow = {
  readonly spellLevel: number;
  readonly count: number;
  readonly expended: number;
};
type StructuralPactSlotRow = {
  readonly slotLevel: number;
  readonly count: number;
  readonly expended: number;
};
type StructuralHitDieRow = {
  readonly classUnitId: string;
  readonly dieSize: number;
  readonly total: number;
  readonly spent: number;
};
type StructuralUnitResourceRow = {
  readonly tag: "useCountResource";
  readonly unitId: string;
  readonly count: number;
  readonly expended: number;
};
type StructuralFreeCastRow = {
  readonly tag: "spellAccessFreeCast";
  readonly sourceUnitId: string;
  readonly spellId: string;
  readonly count: number;
  readonly expended: number;
};

expectTypeOf<StructuralSpellSlotRow>().toMatchTypeOf<
  NonNullable<CharacterSessionSheetProjectionEncoded["spellSlots"]>[number]
>();
expectTypeOf<StructuralPactSlotRow>().toMatchTypeOf<
  CharacterSessionSheetProjectionEncoded["pactSlots"]
>();
expectTypeOf<StructuralHitDieRow>().toMatchTypeOf<
  CharacterSessionSheetProjectionEncoded["hitDice"][number]
>();
expectTypeOf<StructuralUnitResourceRow>().toMatchTypeOf<
  CharacterSessionSheetProjectionEncoded["resources"][number]
>();
expectTypeOf<StructuralFreeCastRow>().toMatchTypeOf<
  CharacterSessionSheetProjectionEncoded["resources"][number]
>();
expectTypeOf<StructuralSpellSlotRow>().not.toMatchTypeOf<
  NonNullable<CharacterSessionSheetProjection["spellSlots"]>[number]
>();
expectTypeOf<StructuralPactSlotRow>().not.toMatchTypeOf<
  NonNullable<CharacterSessionSheetProjection["pactSlots"]>
>();
expectTypeOf<StructuralHitDieRow>().not.toMatchTypeOf<
  CharacterSessionSheetProjection["hitDice"][number]
>();
expectTypeOf<StructuralUnitResourceRow>().not.toMatchTypeOf<
  CharacterSessionSheetProjection["resources"][number]
>();
expectTypeOf<StructuralFreeCastRow>().not.toMatchTypeOf<
  CharacterSessionSheetProjection["resources"][number]
>();

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

  test("admits a normal character sheet projection once", () => {
    const decoded = parseCharacterSessionSheetProjection(
      normalCharacterSheetProjection,
    );

    expect(Result.isSuccess(decoded)).toBe(true);
  });

  test.each(malformedCharacterSheetProjections)(
    "rejects malformed %s character sheet projection",
    (_label, candidate) => {
      const decoded = parseCharacterSessionSheetProjection(candidate);

      expect(Result.isFailure(decoded)).toBe(true);
    },
  );
});
