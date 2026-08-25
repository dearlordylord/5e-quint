import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  CreatureImmunityListSchema,
  CreatureStatBlockProjectionSchema,
  StatBlockCommunicationSchema,
  StatBlockInitiativeSchema,
  StandaloneStatBlockSchema,
} from "./schema.ts";

const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown): A =>
  Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(input);

const syntheticStandaloneStatBlock = {
  size: "medium",
  creatureType: "humanoid",
  creatureTypeTags: ["warden"],
  alignment: { order: "lawful", morality: "neutral" },
  ac: {
    value: { kind: "literal", value: 16 },
    annotations: ["reinforced shell"],
  },
  hp: { kind: "literal", value: 22 },
  speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
  abilityScores: { str: 12, dex: 14, con: 13, int: 10, wis: 11, cha: 9 },
  initiative: { modifier: 2, score: 12 },
  senses: [{ kind: "darkvision", rangeFeet: 60 }],
  passivePerception: 13,
  gear: [{ item: "signal rod", quantity: 2 }],
  communication: {
    kind: "spoken_and_understood",
    languages: { kind: "named", languages: ["Common", "Signal Code"] },
    telepathy: {
      rangeFeet: 30,
      response: "receiving_creature_cannot_respond",
    },
  },
} as const;

type StandaloneProcedureFields = Schema.Schema.Type<
  typeof StandaloneStatBlockSchema
>;
type GroupedProcedureMembers =
  | "multiattacks"
  | "attacks"
  | "saves"
  | "supports"
  | "actionOptions"
  | "specials";
type ContainsGroupedProcedureMembers<Value> =
  Extract<keyof Value, GroupedProcedureMembers> extends never
    ? "actions" extends keyof Value
      ? ContainsGroupedProcedureMembers<NonNullable<Value["actions"]>>
      : false
    : true;
type StandaloneGroupedProcedureField = {
  [Key in Extract<
    keyof StandaloneProcedureFields,
    "actions" | "bonusActions" | "reactions" | "legendaryActions"
  >]: ContainsGroupedProcedureMembers<
    NonNullable<StandaloneProcedureFields[Key]>
  > extends true
    ? Key
    : never;
}[Extract<
  keyof StandaloneProcedureFields,
  "actions" | "bonusActions" | "reactions" | "legendaryActions"
>];
type StandaloneGroupedProcedureFieldsAbsent = [
  StandaloneGroupedProcedureField,
] extends [never]
  ? true
  : false;
const standaloneGroupedProcedureFieldsAbsent: StandaloneGroupedProcedureFieldsAbsent = true;

describe("standalone Stat Block general facts", () => {
  test("decodes descriptive and communication facts without Hit Dice", () => {
    expect(
      decode(StandaloneStatBlockSchema, syntheticStandaloneStatBlock),
    ).toEqual(syntheticStandaloneStatBlock);
    expect("hitPointDice" in syntheticStandaloneStatBlock).toBe(false);
    expect("displayName" in syntheticStandaloneStatBlock).toBe(false);
  });

  test("keeps standalone authored facts outside the reusable creature projection", () => {
    const projection = {
      displayName: "Synthetic Spirit",
      size: "medium",
      creatureType: "construct",
      ac: { kind: "literal", value: 15 },
      hp: { kind: "literal", value: 10 },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: { str: 16, dex: 10, con: 10, int: 3, wis: 3, cha: 1 },
    } as const;

    expect(decode(CreatureStatBlockProjectionSchema, projection)).toEqual(
      projection,
    );
    expect(
      decode(CreatureStatBlockProjectionSchema, {
        ...projection,
        initiativeModifier: 2,
      }),
    ).toEqual({
      ...projection,
      initiativeModifier: 2,
    });
    expect(() =>
      decode(CreatureStatBlockProjectionSchema, {
        ...projection,
        initiative: { modifier: 2, score: 12 },
      }),
    ).toThrow();
    expect(() =>
      decode(CreatureStatBlockProjectionSchema, syntheticStandaloneStatBlock),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        displayName: "Synthetic Warden",
      }),
    ).toThrow();
  });

  test("leaves grouped procedure sections to the procedure schema", () => {
    expect(standaloneGroupedProcedureFieldsAbsent).toBe(true);
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        actions: {},
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        bonusActions: {},
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        reactions: {},
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        legendaryActions: { uses: 1, actions: {} },
      }),
    ).toThrow();
  });

  test("preserves source language qualifiers without empty collection states", () => {
    const communication = {
      kind: "spoken_and_understood",
      languages: {
        kind: "named",
        languages: ["Blink Dog"],
      },
      additionallyUnderstoodButCannotSpeak: {
        kind: "named",
        languages: ["Elvish", "Sylvan"],
      },
      speechRestriction: {
        kind: "cannot_speak_in_forms",
        forms: ["wolf"],
      },
      telepathy: {
        rangeFeet: 60,
        requiresLanguageUnderstanding: {
          kind: "named",
          languages: ["Abyssal"],
        },
      },
    } as const;

    expect(decode(StatBlockCommunicationSchema, communication)).toEqual(
      communication,
    );
    expect(decode(StatBlockCommunicationSchema, { kind: "none" })).toEqual({
      kind: "none",
    });
    expect(() =>
      decode(StatBlockCommunicationSchema, {
        kind: "spoken_and_understood",
        languages: { kind: "named", languages: [] },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockCommunicationSchema, {
        kind: "spoken_and_understood",
        languages: { kind: "none" },
      }),
    ).toThrow();
  });

  test("bounds authored numeric facts and rejects runtime-only values", () => {
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        ac: {
          value: {
            kind: "caster_derived",
            source: "proficiency_bonus",
          },
        },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockInitiativeSchema, { modifier: 2, score: -1 }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        ac: { value: { kind: "literal", value: 0 } },
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        hp: { kind: "literal", value: 0 },
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        passivePerception: -1,
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        speeds: [{ kind: "walk", feet: { kind: "literal", value: 0 } }],
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        hp: { kind: "literal", value: 22.5 },
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        speeds: [],
      }),
    ).toThrow();
  });

  test("requires an immunity category", () => {
    expect(() => decode(CreatureImmunityListSchema, {})).toThrow();
    expect(() =>
      decode(CreatureImmunityListSchema, { damageTypes: [] }),
    ).toThrow();
    expect(() =>
      decode(CreatureImmunityListSchema, { conditions: [] }),
    ).toThrow();
  });
});
