import { statBlockId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";

import { createMcpCompositionRoot } from "./composition-root.ts";
import { statBlockSummary } from "./content-tools.ts";

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
