import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { statBlockId } from "@dnd/shared/game-facts";
import {
  decodeCreatureImmunityDeclarationSync,
  decodeStatBlockRecordSync,
} from "@dnd/surface/surface/schema";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { contentToolDefinitions, statBlockSummary } from "./content-tools.ts";
import { handleToolCall } from "./server.ts";
import { jsonContentPayload } from "./tool-content.ts";

const CatalogUnitListSchema = Schema.Struct({
  unitsByKind: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.Struct({ id: Schema.String })),
  }),
});

const StatBlockListSchema = Schema.Struct({
  statBlocks: Schema.Array(Schema.Struct({ statBlockId: Schema.String })),
});

function payload(response: ReturnType<typeof handleToolCall>): unknown {
  return jsonContentPayload(response);
}

const UnitDetailOutputSchema = Schema.Struct({
  unitRecordJson: Schema.parseJson(Schema.Unknown),
});

function unitDetailPayload(response: ReturnType<typeof handleToolCall>) {
  return Schema.decodeUnknownSync(UnitDetailOutputSchema)(payload(response))
    .unitRecordJson;
}

describe("MCP Stat Block summaries", () => {
  test("projects authored names and ordered procedure summaries", () => {
    const root = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const firstAction = base.statBlock.actions?.[0];
    if (firstAction === undefined) {
      throw new Error("Goblin Warrior fixture must have an action");
    }
    const summary = statBlockSummary({
      ...base,
      id: statBlockId("stat_block_synthetic_summary"),
      name: "Synthetic Summary Creature",
      statBlock: {
        ...base.statBlock,
        actions: [
          {
            kind: "textOnly",
            procedureOrdinal: firstAction.procedureOrdinal,
            name: "Unmodeled Roar",
            description: "A synthetic procedure retained for presentation.",
            reason: "unsupported_procedure_family",
            resourceRefs: { kind: "none" },
          },
        ],
        creatureType: "beast",
        immunities: decodeCreatureImmunityDeclarationSync({
          conditions: ["poisoned"],
        }),
        resistances: {
          kind: "choose_one_from",
          options: ["cold", "fire"],
        },
      },
    });

    expect(summary).toMatchObject({
      armorClass: 15,
      attacks: [],
      conditionImmunities: ["poisoned"],
      creatureType: "beast",
      damageImmunities: [],
      damageResistanceChoices: ["cold", "fire"],
      damageResistances: [],
      hitPoints: 10,
      initiativeModifier: 2,
      name: "Synthetic Summary Creature",
      orderedProcedures: expect.arrayContaining([
        expect.objectContaining({
          section: "action",
          procedureOrdinal: 1,
          kind: "textOnly",
          name: "Unmodeled Roar",
          reason: "unsupported_procedure_family",
          resourceRefs: { kind: "none" },
        }),
      ]),
      statBlockId: "stat_block_synthetic_summary",
    });
  });
});

describe("MCP installed SRD catalog tools", () => {
  test("publish stateless presence-only contracts", () => {
    const catalogDefinitions = contentToolDefinitions.filter(
      (definition) => definition.name !== "describe_mcp_workflow",
    );

    for (const definition of catalogDefinitions) {
      expect(definition.description).toMatch(
        /catalog presence|catalog detail/i,
      );
      expect(definition.inputSchema.properties).not.toHaveProperty(
        "playSessionId",
      );
      expect(JSON.stringify(definition.outputSchema)).not.toMatch(
        /"supported"/,
      );
    }
  });

  test("lists every canonical installed SRD Unit and Stat Block", () => {
    const root = createMcpPlaySessionRoot();
    const units = Schema.decodeUnknownSync(CatalogUnitListSchema)(
      payload(handleToolCall(root, "list_catalog_units", {})),
    );
    const statBlocks = Schema.decodeUnknownSync(StatBlockListSchema)(
      payload(handleToolCall(root, "list_stat_blocks", {})),
    );

    expect(
      Object.values(units.unitsByKind)
        .flat()
        .map(({ id }) => id)
        .sort(),
    ).toEqual(srdUnitCollection.units.map(({ id }) => id).sort());
    expect(
      statBlocks.statBlocks.map(({ statBlockId }) => statBlockId).sort(),
    ).toEqual(srdStatBlockCollection.statBlocks.map(({ id }) => id).sort());
  });

  test("inspects one canonical installed Unit without claiming executability", () => {
    const root = createMcpPlaySessionRoot();
    const installed = srdUnitCollection.units.find(
      (unit) => unit.id === "cloudkill",
    );
    expect(installed).toBeDefined();

    expect(
      payload(
        handleToolCall(root, "inspect_catalog_unit", {
          unitId: "   ",
        }),
      ),
    ).toMatchObject({
      details: { code: "INVALID_ARGUMENTS" },
    });
    expect(
      unitDetailPayload(
        handleToolCall(root, "inspect_catalog_unit", {
          unitId: "cloudkill",
        }),
      ),
    ).toEqual(installed);
    expect(
      payload(
        handleToolCall(root, "inspect_catalog_unit", {
          unitId: "synthetic_missing_unit",
        }),
      ),
    ).toEqual({
      error: "Unknown installed SRD Unit: synthetic_missing_unit",
      details: {
        code: "UNKNOWN_CATALOG_UNIT",
        unitId: "synthetic_missing_unit",
        recovery:
          "Call list_catalog_units and retry with one returned Unit id.",
      },
    });
  });

  test("retains nested spellcasting group resource references", () => {
    const root = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const summary = statBlockSummary(
      decodeStatBlockRecordSync({
        ...base,
        id: statBlockId("stat_block_synthetic_spellcasting_summary"),
        name: "Synthetic Spellcasting Creature",
        provenance: {
          kind: "synthetic-test",
          section: "mcp-spellcasting-summary",
        },
        statBlock: {
          ...base.statBlock,
          actions: [
            {
              kind: "executable",
              procedureOrdinal: 1,
              procedure: {
                kind: "spellcasting",
                name: "Synthetic Spellcasting",
                ability: "int",
                groups: [
                  {
                    kind: "limited",
                    resourceRefs: { kind: "some", ordinals: [1] },
                    spells: [
                      {
                        spellId: "magic_missile",
                        count: 2,
                        castAtLevel: 3,
                        restriction: "Only when the target is visible.",
                      },
                      { spellId: "shield" },
                    ],
                  },
                ],
              },
              resourceRefs: { kind: "none" },
            },
          ],
          resources: [
            {
              ordinal: 1,
              ownership: "shared",
              limit: { kind: "daily", uses: 1 },
            },
          ],
        },
      }),
    );

    expect(summary.orderedProcedures).toEqual(
      expect.arrayContaining([
        {
          section: "action",
          procedureOrdinal: 1,
          kind: "executable",
          procedureKind: "spellcasting",
          name: "Synthetic Spellcasting",
          resourceRefs: { kind: "none" },
          spellcastingGroups: [
            {
              kind: "limited",
              resourceRefs: { kind: "some", ordinals: [1] },
              spells: [
                {
                  spellId: "magic_missile",
                  count: 2,
                  castAtLevel: 3,
                  restriction: "Only when the target is visible.",
                },
                { spellId: "shield" },
              ],
            },
          ],
        },
      ]),
    );

    const spellcastingProcedure = summary.orderedProcedures.find(
      (procedure) =>
        procedure.kind === "executable" &&
        procedure.procedureKind === "spellcasting",
    );
    if (
      spellcastingProcedure?.kind !== "executable" ||
      spellcastingProcedure.procedureKind !== "spellcasting"
    ) {
      throw new Error("Expected spellcasting procedure summary.");
    }
    const [spellcastingGroup] = spellcastingProcedure.spellcastingGroups ?? [];
    if (spellcastingGroup === undefined) {
      throw new Error("Expected spellcasting group summary.");
    }
    const [completeSpell, minimalSpell] = spellcastingGroup.spells;
    expect(completeSpell).toEqual({
      spellId: "magic_missile",
      count: 2,
      castAtLevel: 3,
      restriction: "Only when the target is visible.",
    });
    expect(minimalSpell).toEqual({ spellId: "shield" });
    expect(minimalSpell).not.toHaveProperty("count");
    expect(minimalSpell).not.toHaveProperty("castAtLevel");
    expect(minimalSpell).not.toHaveProperty("restriction");
  });
});
