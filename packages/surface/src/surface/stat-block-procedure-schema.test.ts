import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  AuthoredStatBlockReactionTriggerSchema,
  CreatureStatBlockProjectionSchema,
  StandaloneStatBlockSchema,
  StatBlockProcedureEntrySchema,
  StatBlockProcedureSectionSchema,
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
        ],
      },
      resourceRefs: { kind: "none" },
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
      resourceRefs: { kind: "some", ordinals: [1] },
    },
    {
      kind: "textOnly",
      procedureOrdinal: 3,
      name: "Synthetic Echo",
      description: "The warden emits a pulse adjudicated by the table.",
      reason: "required_table_adjudication",
      resourceRefs: { kind: "none" },
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
            resourceRefs: { kind: "none" },
            spells: [
              {
                spellId: "unit_spell_synthetic_mending",
                restriction: "on itself",
              },
            ],
          },
          {
            kind: "limited",
            resourceRefs: { kind: "some", ordinals: [2] },
            spells: [{ spellId: "unit_spell_synthetic_command" }],
          },
        ],
      },
      resourceRefs: { kind: "none" },
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
      resourceRefs: { kind: "none" },
    },
  ],
  reactions: [
    {
      kind: "textOnly",
      procedureOrdinal: 1,
      name: "Synthetic Intercept",
      description: "The warden redirects an attack using an unresolved rule.",
      reason: "unsupported_procedure_family",
      resourceRefs: { kind: "none" },
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
        resourceRefs: { kind: "none" },
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
        dispatches: [{ procedureOrdinal: 2 }],
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
            resourceRefs: { kind: "none" },
            spells: [{ spellId: "unit_spell_synthetic_mending" }],
          },
          {
            kind: "limited",
            resourceRefs: { kind: "some", ordinals: [2] },
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
                { procedureOrdinal: 2, count: { kind: "literal", value: 1 } },
                { procedureOrdinal: 2, count: { kind: "literal", value: 1 } },
              ],
            },
          },
          syntheticStandaloneStatBlock.actions[1],
          syntheticStandaloneStatBlock.actions[2],
          syntheticStandaloneStatBlock.actions[3],
        ],
      }),
    ).toThrow();

    expect(
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        actions: [
          {
            ...syntheticStandaloneStatBlock.actions[0],
            procedure: {
              ...syntheticStandaloneStatBlock.actions[0].procedure,
              dispatches: [
                { procedureOrdinal: 3, count: { kind: "literal", value: 1 } },
              ],
            },
          },
          syntheticStandaloneStatBlock.actions[1],
          syntheticStandaloneStatBlock.actions[2],
          syntheticStandaloneStatBlock.actions[3],
        ],
      }).actions?.[0],
    ).toMatchObject({ procedure: { dispatches: [{ procedureOrdinal: 3 }] } });

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

  test("retains Multiattack references to save, spellcasting, and text-only entries", () => {
    const saveEntry = {
      kind: "executable",
      procedureOrdinal: 3,
      procedure: {
        kind: "save",
        name: "Synthetic Save",
        ability: "dex",
        dc: { kind: "fixed", dc: 14 },
        onFail: {
          kind: "damage",
          damageType: "force",
          amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
        },
        onSuccess: { kind: "half_damage" },
        target: { kind: "one_creature_in_range", rangeFeet: 30 },
      },
      resourceRefs: { kind: "none" },
    } as const;
    const entries = [
      {
        ...syntheticStandaloneStatBlock.actions[0],
        procedure: {
          ...syntheticStandaloneStatBlock.actions[0].procedure,
          dispatches: [
            { procedureOrdinal: 2, count: { kind: "literal", value: 1 } },
            { procedureOrdinal: 3, count: { kind: "literal", value: 1 } },
            { procedureOrdinal: 4, count: { kind: "literal", value: 1 } },
            { procedureOrdinal: 5, count: { kind: "literal", value: 1 } },
          ],
        },
      },
      syntheticStandaloneStatBlock.actions[1],
      saveEntry,
      syntheticStandaloneStatBlock.actions[3],
      syntheticStandaloneStatBlock.actions[2],
    ].map((entry, index) => ({
      ...entry,
      procedureOrdinal: index === 4 ? 5 : entry.procedureOrdinal,
    }));

    expect(decode(StatBlockProcedureSectionSchema, entries)).toEqual(entries);
  });

  test("requires a precise reason for every text-only entry", () => {
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        kind: "textOnly",
        procedureOrdinal: 1,
        name: "Synthetic Omission",
        description: "The source procedure remains inspectable.",
        resourceRefs: { kind: "none" },
      }),
    ).toThrow();
  });

  test("rejects runtime-derived, level-scaled, and hole-valued authored procedure facts", () => {
    const attackEntry = syntheticStandaloneStatBlock.actions[1];
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...attackEntry,
        procedure: {
          ...attackEntry.procedure,
          attackBonus: {
            kind: "caster_derived",
            source: "proficiency_bonus",
          },
        },
      }),
    ).toThrow();
    for (const attackBonus of [-31, 31] as const) {
      expect(
        decode(StatBlockProcedureEntrySchema, {
          ...attackEntry,
          procedure: {
            ...attackEntry.procedure,
            attackBonus: { kind: "literal", value: attackBonus },
          },
        }),
      ).toMatchObject({ procedure: { attackBonus: { value: attackBonus } } });
    }
    for (const attackBonus of [1.5, NaN, Infinity, -Infinity] as const) {
      expect(() =>
        decode(StatBlockProcedureEntrySchema, {
          ...attackEntry,
          procedure: {
            ...attackEntry.procedure,
            attackBonus: { kind: "literal", value: attackBonus },
          },
        }),
      ).toThrow();
    }
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...attackEntry,
        procedure: {
          ...attackEntry.procedure,
          attackBonus: {
            kind: "linear_per_level",
            axis: "character",
            base: 1,
            perLevel: 1,
            startingAtLevel: 1,
          },
        },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...attackEntry,
        procedure: {
          ...attackEntry.procedure,
          onHit: [
            {
              ...attackEntry.procedure.onHit[0],
              damageType: {
                kind: "hole",
                holeId: "synthetic-damage-type",
                value: "force",
              },
            },
          ],
        },
      }),
    ).toThrow();

    const multiattackEntry = syntheticStandaloneStatBlock.actions[0];
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...multiattackEntry,
        procedure: {
          ...multiattackEntry.procedure,
          dispatches: [
            {
              ...multiattackEntry.procedure.dispatches[0],
              count: {
                kind: "caster_derived",
                source: "proficiency_bonus",
              },
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...multiattackEntry,
        procedure: {
          ...multiattackEntry.procedure,
          dispatches: [
            {
              ...multiattackEntry.procedure.dispatches[0],
              count: { kind: "literal", value: 0 },
            },
          ],
        },
      }),
    ).toThrow();
    expect(
      decode(StatBlockProcedureEntrySchema, {
        ...multiattackEntry,
        procedure: {
          ...multiattackEntry.procedure,
          dispatches: [
            {
              ...multiattackEntry.procedure.dispatches[0],
              count: { kind: "literal", value: 1001 },
            },
          ],
        },
      }),
    ).toMatchObject({
      procedure: { dispatches: [{ count: { value: 1001 } }] },
    });
    for (const count of [-1, 1.5, NaN, Infinity, -Infinity] as const) {
      expect(() =>
        decode(StatBlockProcedureEntrySchema, {
          ...multiattackEntry,
          procedure: {
            ...multiattackEntry.procedure,
            dispatches: [
              {
                ...multiattackEntry.procedure.dispatches[0],
                count: { kind: "literal", value: count },
              },
            ],
          },
        }),
      ).toThrow();
    }

    const spellcastingEntry = syntheticStandaloneStatBlock.actions[3];
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...spellcastingEntry,
        procedure: {
          ...spellcastingEntry.procedure,
          spellSaveDc: { kind: "caster_spell_save_dc" },
        },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...spellcastingEntry,
        procedure: {
          ...spellcastingEntry.procedure,
          spellAttackBonus: {
            kind: "linear_per_level",
            axis: "character",
            base: 1,
            perLevel: 1,
            startingAtLevel: 1,
          },
        },
      }),
    ).toThrow();

    const saveEntry = {
      kind: "executable",
      procedureOrdinal: 5,
      procedure: {
        kind: "save",
        name: "Synthetic Save",
        ability: "dex",
        dc: { kind: "fixed", dc: 14 },
        onFail: {
          kind: "damage",
          damageType: "force",
          amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
        },
        onSuccess: { kind: "half_damage" },
        area: { kind: "cone", lengthFeet: 30 },
      },
      resourceRefs: { kind: "none" },
    } as const;
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...saveEntry,
        procedure: {
          ...saveEntry.procedure,
          dc: { kind: "caster_spell_save_dc" },
        },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...saveEntry,
        procedure: {
          ...saveEntry.procedure,
          area: {
            kind: "sphere",
            radiusFeet: {
              kind: "linear_per_level",
              axis: "character",
              base: 1,
              perLevel: 1,
              startingAtLevel: 1,
            },
          },
        },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockProcedureEntrySchema, {
        ...saveEntry,
        procedure: {
          ...saveEntry.procedure,
          dc: { kind: "fixed", dc: 0 },
        },
      }),
    ).toThrow();
    expect(
      decode(StatBlockProcedureEntrySchema, {
        ...saveEntry,
        procedure: {
          ...saveEntry.procedure,
          dc: { kind: "fixed", dc: 1001 },
        },
      }),
    ).toMatchObject({ procedure: { dc: { dc: 1001 } } });
    for (const dc of [-1, 1.5, NaN, Infinity, -Infinity] as const) {
      expect(() =>
        decode(StatBlockProcedureEntrySchema, {
          ...saveEntry,
          procedure: {
            ...saveEntry.procedure,
            dc: { kind: "fixed", dc },
          },
        }),
      ).toThrow();
    }
  });

  test("keeps authored positive procedure quantities finite and uncapped", () => {
    const attackEntry = syntheticStandaloneStatBlock.actions[1];
    expect(
      decode(StatBlockProcedureEntrySchema, {
        ...attackEntry,
        procedure: {
          ...attackEntry.procedure,
          reachFeet: 1001,
          rangeFeet: { normal: 1001, long: 1002 },
        },
      }),
    ).toMatchObject({
      procedure: {
        reachFeet: 1001,
        rangeFeet: { normal: 1001, long: 1002 },
      },
    });

    for (const value of [0, -1, 1.5, NaN, Infinity, -Infinity] as const) {
      expect(() =>
        decode(StatBlockProcedureEntrySchema, {
          ...attackEntry,
          procedure: {
            ...attackEntry.procedure,
            reachFeet: value,
          },
        }),
      ).toThrow();
    }
  });

  test("requires a parsed trigger for executable reactions while retaining text-only reactions", () => {
    const executableReaction = {
      kind: "executable",
      procedureOrdinal: 1,
      procedure: syntheticStandaloneStatBlock.actions[1].procedure,
      trigger: { kind: "hit_by_attack_roll" },
      resourceRefs: { kind: "none" },
    } as const;
    expect(
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        reactions: [executableReaction],
      }).reactions,
    ).toEqual([executableReaction]);
    expect(() =>
      decode(StandaloneStatBlockSchema, {
        ...syntheticStandaloneStatBlock,
        reactions: [
          {
            kind: "executable",
            procedureOrdinal: 1,
            procedure: syntheticStandaloneStatBlock.actions[1].procedure,
            resourceRefs: { kind: "none" },
          },
        ],
      }),
    ).toThrow();
    expect(
      decode(StandaloneStatBlockSchema, syntheticStandaloneStatBlock).reactions,
    ).toEqual(syntheticStandaloneStatBlock.reactions);
  });

  test("preserves authored reaction trigger variants with finite positive ranges", () => {
    const validTriggers = [
      { kind: "hit_by_attack_roll" },
      {
        kind: "hit_by_attack_roll",
        weaponFilter: { kind: "weapon_category", category: "melee" },
      },
      { kind: "takes_damage_from_creature", rangeFeet: 1001 },
      { kind: "self_or_visible_creature_falls", rangeFeet: 60 },
      {
        kind: "targeted_by_named_spell",
        spellId: "unit_spell_synthetic_mending",
      },
      { kind: "creature_casts_spell", components: ["V"] },
      { kind: "spell_save_outcome", outcome: "success" },
      {
        kind: "any_of",
        triggers: [
          { kind: "takes_damage_from_creature", rangeFeet: 1 },
          { kind: "spell_save_outcome", outcome: "failure" },
        ],
      },
    ] as const;
    for (const trigger of validTriggers) {
      expect(decode(AuthoredStatBlockReactionTriggerSchema, trigger)).toEqual(
        trigger,
      );
    }

    for (const rangeFeet of [-1, 0, 1.5, NaN, Infinity, -Infinity] as const) {
      expect(() =>
        decode(AuthoredStatBlockReactionTriggerSchema, {
          kind: "takes_damage_from_creature",
          rangeFeet,
        }),
      ).toThrow();
    }
    expect(() =>
      decode(AuthoredStatBlockReactionTriggerSchema, {
        kind: "takes_damage_from_creature",
        rangeFeet: { kind: "hole", holeId: "synthetic-range" },
      }),
    ).toThrow();
    expect(() =>
      decode(AuthoredStatBlockReactionTriggerSchema, {
        kind: "targeted_by_named_spell",
        spellId: "",
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
