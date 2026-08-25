import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  CreatureStatBlockProjectionSchema,
  StandaloneStatBlockSchema,
  StatBlockProcedureEntrySchema,
} from "./schema.ts";

const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown): A =>
  Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(input);

const syntheticStandaloneStatBlock = {
  size: "medium",
  creatureType: "humanoid",
  alignment: { order: "lawful", morality: "neutral" },
  ac: { value: { kind: "literal", value: 16 } },
  hp: { kind: "literal", value: 22 },
  speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
  abilityScores: { str: 12, dex: 14, con: 13, int: 10, wis: 11, cha: 9 },
  initiative: { modifier: 2, score: 12 },
  senses: [{ kind: "darkvision", rangeFeet: 60 }],
  passivePerception: 13,
  communication: {
    kind: "spoken_and_understood",
    languages: { kind: "named", languages: ["Common"] },
  },
  resources: [
    {
      ordinal: 1,
      ownership: "shared",
      limit: { kind: "daily", uses: 1 },
    },
    {
      ordinal: 2,
      ownership: "each",
      limit: { kind: "daily", uses: 2 },
    },
  ],
  actions: [
    {
      kind: "executable",
      procedureOrdinal: 1,
      procedure: {
        kind: "multiattack",
        name: "Synthetic Routine",
        dispatches: [
          { procedureOrdinal: 2, count: { kind: "literal", value: 1 } },
          { procedureOrdinal: 3, count: { kind: "literal", value: 1 } },
        ],
      },
      resourceRefs: [],
    },
    {
      kind: "executable",
      procedureOrdinal: 2,
      procedure: {
        kind: "attack_roll",
        name: "Synthetic Echo",
        attackType: "melee",
        attackAbility: "str",
        attackBonus: { kind: "literal", value: 4 },
        reachFeet: 5,
        onHit: [
          {
            kind: "damage",
            damageType: "force",
            amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
          },
        ],
      },
      resourceRefs: [1],
    },
    {
      kind: "textOnly",
      procedureOrdinal: 3,
      name: "Synthetic Echo",
      description: "The warden emits a pulse adjudicated by the table.",
      reason: "required_table_adjudication",
      resourceRefs: [],
    },
    {
      kind: "executable",
      procedureOrdinal: 4,
      procedure: {
        kind: "spellcasting",
        name: "Synthetic Spellcasting",
        ability: "int",
        spellSaveDc: { kind: "fixed", dc: 14 },
        spellAttackBonus: { kind: "literal", value: 6 },
        components: { v: true, s: true, m: false },
        groups: [
          {
            kind: "at_will",
            resourceRefs: [],
            spells: [
              {
                spellId: "unit_spell_synthetic_mending",
                restriction: "self only",
              },
            ],
          },
          {
            kind: "limited",
            resourceRefs: [2],
            spells: [{ spellId: "unit_spell_synthetic_command" }],
          },
        ],
      },
      resourceRefs: [],
    },
  ],
  bonusActions: [
    {
      kind: "executable",
      procedureOrdinal: 1,
      procedure: {
        kind: "action_option",
        name: "Synthetic Shift",
        options: ["disengage"],
      },
      resourceRefs: [],
    },
  ],
  reactions: [
    {
      kind: "textOnly",
      procedureOrdinal: 1,
      name: "Synthetic Intercept",
      description: "The warden redirects an attack using an unresolved rule.",
      reason: "unsupported_procedure_family",
      resourceRefs: [],
    },
  ],
  legendaryActions: {
    uses: 3,
    entries: [
      {
        kind: "textOnly",
        procedureOrdinal: 1,
        name: "Synthetic Echo",
        description: "The warden takes a legendary action.",
        reason: "unparsed_prose",
        resourceRefs: [],
      },
    ],
  },
} as const;

describe("standalone Stat Block procedure sections", () => {
  test("preserves mixed source order, ordinal dispatch, text-only reasons, and spell refs", () => {
    const decoded = decode(
      StandaloneStatBlockSchema,
      syntheticStandaloneStatBlock,
    );

    expect(decoded.actions?.map((entry) => entry.procedureOrdinal)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(decoded.actions?.map((entry) => entry.kind)).toEqual([
      "executable",
      "executable",
      "textOnly",
      "executable",
    ]);
    expect(decoded.actions?.[0]).toMatchObject({
      kind: "executable",
      procedure: {
        kind: "multiattack",
        dispatches: [{ procedureOrdinal: 2 }, { procedureOrdinal: 3 }],
      },
    });
    expect(decoded.actions?.[2]).toMatchObject({
      kind: "textOnly",
      name: "Synthetic Echo",
      reason: "required_table_adjudication",
    });
    expect(decoded.actions?.[3]).toMatchObject({
      procedure: {
        kind: "spellcasting",
        groups: [
          {
            kind: "at_will",
            resourceRefs: [],
            spells: [{ spellId: "unit_spell_synthetic_mending" }],
          },
          {
            kind: "limited",
            resourceRefs: [2],
            spells: [{ spellId: "unit_spell_synthetic_command" }],
          },
        ],
      },
    });
    expect(decoded.resources).toEqual(syntheticStandaloneStatBlock.resources);
  });

  test("rejects duplicate and missing dispatch or resource ordinals", () => {
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        actions: [
          syntheticStandaloneStatBlock.actions[0],
          {
            ...syntheticStandaloneStatBlock.actions[1],
            procedureOrdinal: 1,
          },
          syntheticStandaloneStatBlock.actions[2],
          syntheticStandaloneStatBlock.actions[3],
        ],
      }),
    ).toThrow();

    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        actions: [
          {
            ...syntheticStandaloneStatBlock.actions[0],
            procedure: {
              ...syntheticStandaloneStatBlock.actions[0].procedure,
              dispatches: [
                { procedureOrdinal: 4, count: { kind: "literal", value: 1 } },
                { procedureOrdinal: 3, count: { kind: "literal", value: 1 } },
              ],
            },
          },
          { ...syntheticStandaloneStatBlock.actions[1], procedureOrdinal: 4 },
          { ...syntheticStandaloneStatBlock.actions[2], procedureOrdinal: 3 },
          { ...syntheticStandaloneStatBlock.actions[3], procedureOrdinal: 5 },
        ],
      }),
    ).toThrow();

    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        actions: [
          {
            ...syntheticStandaloneStatBlock.actions[0],
            procedure: {
              ...syntheticStandaloneStatBlock.actions[0].procedure,
              dispatches: [
                { procedureOrdinal: 99, count: { kind: "literal", value: 1 } },
              ],
            },
          },
          syntheticStandaloneStatBlock.actions[1],
          syntheticStandaloneStatBlock.actions[2],
          syntheticStandaloneStatBlock.actions[3],
        ],
      }),
    ).toThrow();

    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        resources: syntheticStandaloneStatBlock.resources.slice(0, 1),
      }),
    ).toThrow();
  });

  test("requires a precise reason for every text-only entry", () => {
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        kind: "textOnly",
        procedureOrdinal: 1,
        name: "Synthetic Omission",
        description: "The source procedure remains inspectable.",
        resourceRefs: [],
      }),
    ).toThrow();
  });

  test("keeps ordered authored entries out of the grouped projection boundary", () => {
    expect(() =>
      decode(CreatureStatBlockProjectionSchema, {
        displayName: "Synthetic Projection",
        size: "medium",
        creatureType: "humanoid",
        ac: { kind: "literal", value: 15 },
        hp: { kind: "literal", value: 10 },
        speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
        abilityScores: { str: 16, dex: 10, con: 10, int: 3, wis: 3, cha: 1 },
        actions: syntheticStandaloneStatBlock.actions,
      }),
    ).toThrow();
  });
});
