import { statBlockId } from "@dnd/shared/game-facts";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpCompositionRoot } from "./composition-root.ts";
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

describe("MCP Stat Block summaries", () => {
  test("projects cast-time choices and nonliteral execution values", () => {
    const root = createMcpCompositionRoot();
    const base = root.statBlockCatalog.requireStatBlock(
      "stat_block_goblin_warrior",
    );
    const {
      actions: _actions,
      initiativeModifier: _initiativeModifier,
      ...baseMechanics
    } = base.statBlock;
    const summary = statBlockSummary({
      ...base,
      id: statBlockId("stat_block_synthetic_summary"),
      name: "Synthetic Summary Creature",
      statBlock: {
        ...baseMechanics,
        displayName: "Synthetic Summary Creature",
        creatureType: {
          kind: "choice",
          label: "Synthetic creature type",
          options: ["beast"],
        },
        ac: { kind: "caster_derived", source: "spell_save_dc" },
        hp: { kind: "caster_derived", source: "proficiency_bonus" },
        immunities: { conditions: ["poisoned"] },
        resistances: {
          kind: "choose_one_from",
          options: ["cold", "fire"],
        },
      },
    });

    expect(summary).toMatchObject({
      armorClass: null,
      attacks: [],
      conditionImmunities: ["poisoned"],
      creatureType: expect.stringContaining("Synthetic creature type"),
      damageImmunities: [],
      damageResistanceChoices: ["cold", "fire"],
      damageResistances: [],
      hitPoints: null,
      statBlockId: "stat_block_synthetic_summary",
    });
    expect(summary).not.toHaveProperty("initiativeModifier");
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
        /"(executable|supported)"/,
      );
    }
  });

  test("lists every canonical installed SRD Unit and Stat Block", () => {
    const root = createMcpCompositionRoot();
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
    const root = createMcpCompositionRoot();
    const installed = srdUnitCollection.units.find(
      (unit) => unit.id === "cloudkill",
    );
    expect(installed).toBeDefined();

    expect(
      payload(
        handleToolCall(root, "inspect_catalog_unit", {
          unitId: "cloudkill",
        }),
      ),
    ).toEqual({ unit: installed });
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
});
