import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  CreatureImmunityListSchema,
  CreatureStatBlockProjectionSchema,
  StatBlockCommunicationSchema,
  StatBlockInitiativeSchema,
  StatBlockLanguageSetSchema,
  StatBlockTelepathySchema,
  StandaloneCreatureSenseSchema,
  StandaloneStatBlockSchema,
  StandaloneStatBlockSizeSchema,
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

describe("standalone Stat Block general facts", () => {
  test("decodes descriptive and communication facts without Hit Dice", () => {
    expect(
      decode(StandaloneStatBlockSchema, syntheticStandaloneStatBlock),
    ).toEqual(syntheticStandaloneStatBlock);
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        hitPointDice: { count: 3, faces: 8 },
      }),
    ).toThrow();
    expect("hitPointDice" in syntheticStandaloneStatBlock).toBe(false);
    expect("displayName" in syntheticStandaloneStatBlock).toBe(false);
  });

  test("accepts sparse or complete saving throw modifiers without duplicate abilities", () => {
    expect(
      decode(StandaloneStatBlockSchema, syntheticStandaloneStatBlock)
        .savingThrowModifiers,
    ).toBeUndefined();

    const sparseSavingThrowModifiers = [
      { ability: "dex", modifier: 2 },
    ] as const;
    expect(
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        savingThrowModifiers: sparseSavingThrowModifiers,
      }).savingThrowModifiers,
    ).toEqual(sparseSavingThrowModifiers);

    const completeSavingThrowModifiers = [
      { ability: "str", modifier: 1 },
      { ability: "dex", modifier: 2 },
      { ability: "con", modifier: 3 },
      { ability: "int", modifier: 4 },
      { ability: "wis", modifier: 5 },
      { ability: "cha", modifier: 6 },
    ] as const;
    expect(
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        savingThrowModifiers: completeSavingThrowModifiers,
      }).savingThrowModifiers,
    ).toEqual(completeSavingThrowModifiers);

    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        savingThrowModifiers: [],
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        savingThrowModifiers: undefined,
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        savingThrowModifiers: [
          { ability: "dex", modifier: 2 },
          { ability: "dex", modifier: 3 },
        ],
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        savingThrowModifiers: [
          ...completeSavingThrowModifiers,
          { ability: "str", modifier: 7 },
        ],
      }),
    ).toThrow();
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

  test("admits only the SRD aggregate and constituent Size pairs for a swarm", () => {
    const mediumSwarm = {
      ...syntheticStandaloneStatBlock,
      size: "medium",
      creatureType: "undead",
      creatureTypeTags: undefined,
      swarm: { constituentSize: "tiny" },
    } as const;
    const { creatureTypeTags: _omittedTags, ...authoredMediumSwarm } =
      mediumSwarm;
    const authoredLargeSwarm = {
      ...authoredMediumSwarm,
      size: "large",
    } as const;

    expect(
      decode(StandaloneStatBlockSchema, authoredMediumSwarm),
    ).toMatchObject({
      size: "medium",
      creatureType: "undead",
      swarm: { constituentSize: "tiny" },
    });
    expect(decode(StandaloneStatBlockSchema, authoredLargeSwarm)).toMatchObject(
      {
        size: "large",
        swarm: { constituentSize: "tiny" },
      },
    );

    for (const forbiddenAggregateSize of ["tiny", "gargantuan"] as const) {
      expect(() =>
        decode(StandaloneStatBlockSchema, {
          ...authoredMediumSwarm,
          size: forbiddenAggregateSize,
        }),
      ).toThrow();
    }
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...authoredMediumSwarm,
        creatureTypeTags: ["swarm"],
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...authoredMediumSwarm,
        swarm: { constituentSize: "medium" },
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...authoredMediumSwarm,
        swarm: { constituentSize: "tiny", size: "medium" },
      }),
    ).toThrow();
  });

  test("leaves grouped procedure sections to the procedure schema", () => {
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
        legendaryActions: {
          uses: { kind: "fixed", uses: 1 },
          actions: {},
        },
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

  test("reserves All and None for language-set variants", () => {
    for (const language of ["All", "ALL", "none", "NONE"] as const) {
      expect(() =>
        decode(StatBlockLanguageSetSchema, {
          kind: "named",
          languages: [language],
        }),
      ).toThrow();
      expect(() =>
        decode(StatBlockLanguageSetSchema, {
          kind: "named_plus_other_languages",
          languages: [language],
          additionalLanguages: 1,
        }),
      ).toThrow();
    }
    expect(decode(StatBlockLanguageSetSchema, { kind: "all" })).toEqual({
      kind: "all",
    });
  });

  test("uses absence as the default telepathy response", () => {
    expect(decode(StatBlockTelepathySchema, { rangeFeet: 60 })).toEqual({
      rangeFeet: 60,
    });
    expect(() =>
      decode(StatBlockTelepathySchema, {
        rangeFeet: 60,
        response: "receiving_creature_can_respond",
      }),
    ).toThrow();
  });

  test("requires distinct alternatives when a size choice is authored", () => {
    expect(
      decode(StandaloneStatBlockSizeSchema, {
        kind: "alternatives",
        options: ["medium", "large"],
      }),
    ).toEqual({ kind: "alternatives", options: ["medium", "large"] });
    expect(() =>
      decode(StandaloneStatBlockSizeSchema, {
        kind: "alternatives",
        options: ["medium"],
      }),
    ).toThrow();
    expect(() =>
      decode(StandaloneStatBlockSizeSchema, {
        kind: "alternatives",
        options: ["medium", "medium"],
      }),
    ).toThrow();
  });

  test("qualifies hover only on an authored fly speed", () => {
    const hoveredStatBlock = {
      ...syntheticStandaloneStatBlock,
      speeds: [
        {
          kind: "fly",
          feet: { kind: "literal", value: 90 },
          hover: true,
        },
      ],
    } as const;

    expect(decode(StandaloneStatBlockSchema, hoveredStatBlock)).toEqual(
      hoveredStatBlock,
    );
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        speeds: [
          {
            kind: "fly",
            feet: { kind: "literal", value: 90 },
            hover: false,
          },
        ],
      }),
    ).toThrow();

    for (const kind of ["walk", "swim", "climb", "burrow"] as const) {
      expect(() =>
        decode(StandaloneStatBlockSchema, {
          ...syntheticStandaloneStatBlock,
          speeds: [
            {
              kind,
              feet: { kind: "literal", value: 30 },
              hover: true,
            },
          ],
        }),
      ).toThrow();
    }
  });

  test("bounds authored ability scores and sense ranges while keeping projections reusable", () => {
    for (const value of [0, 31, 10.5] as const) {
      expect(() =>
        decode(StandaloneStatBlockSchema, {
          ...syntheticStandaloneStatBlock,
          abilityScores: {
            ...syntheticStandaloneStatBlock.abilityScores,
            str: value,
          },
        }),
      ).toThrow();
    }
    for (const rangeFeet of [0, 10.5] as const) {
      expect(() =>
        decode(StandaloneCreatureSenseSchema, {
          kind: "darkvision",
          rangeFeet,
        }),
      ).toThrow();
      expect(() =>
        decode(StandaloneStatBlockSchema, {
          ...syntheticStandaloneStatBlock,
          senses: [{ kind: "darkvision", rangeFeet }],
        }),
      ).toThrow();
    }
    for (const rangeFeet of [1, 151] as const) {
      expect(
        decode(StandaloneCreatureSenseSchema, {
          kind: "darkvision",
          rangeFeet,
        }),
      ).toEqual({ kind: "darkvision", rangeFeet });
      expect(
        decode(StandaloneStatBlockSchema, {
          ...syntheticStandaloneStatBlock,
          senses: [{ kind: "darkvision", rangeFeet }],
        }),
      ).toEqual({
        ...syntheticStandaloneStatBlock,
        senses: [{ kind: "darkvision", rangeFeet }],
      });
    }

    const projection = {
      displayName: "Synthetic Spirit",
      size: "medium",
      creatureType: "construct",
      ac: { kind: "literal", value: 15 },
      hp: { kind: "literal", value: 10 },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: { str: 0, dex: 10, con: 10, int: 3, wis: 3, cha: 1 },
      senses: [{ kind: "darkvision", rangeFeet: 0 }],
    } as const;
    expect(decode(CreatureStatBlockProjectionSchema, projection)).toEqual(
      projection,
    );
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
