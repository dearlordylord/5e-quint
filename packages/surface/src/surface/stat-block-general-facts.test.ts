import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  CreatureStatBlockProjectionSchema,
  StatBlockCommunicationSchema,
  StandaloneStatBlockSchema,
} from "./schema.ts";

const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown): A =>
  Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(input);

const syntheticStandaloneStatBlock = {
  displayName: "Synthetic Warden",
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
  initiativeModifier: 2,
  senses: [{ kind: "darkvision", rangeFeet: 60 }],
  passivePerception: 13,
  gear: [{ item: "signal rod", quantity: 2 }],
  communication: {
    languages: {
      kind: "spoken_and_understood",
      languages: { kind: "named", languages: ["Common", "Signal Code"] },
    },
    telepathy: {
      rangeFeet: 30,
      response: "receiving_creature_cannot_respond",
    },
  },
} as const;

describe("standalone Stat Block general facts", () => {
  test("decodes descriptive and communication facts without Hit Dice", () => {
    expect(
      decode(StandaloneStatBlockSchema, syntheticStandaloneStatBlock),
    ).toEqual(syntheticStandaloneStatBlock);
    expect("hitPointDice" in syntheticStandaloneStatBlock).toBe(false);
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
    expect(() =>
      decode(CreatureStatBlockProjectionSchema, syntheticStandaloneStatBlock),
    ).toThrow();
  });

  test("preserves source language qualifiers without empty collection states", () => {
    const communication = {
      languages: {
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
    expect(() =>
      decode(StatBlockCommunicationSchema, {
        languages: {
          kind: "spoken_and_understood",
          languages: { kind: "named", languages: [] },
        },
      }),
    ).toThrow();
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
  });
});
