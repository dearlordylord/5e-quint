import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { combatantId, initiativeScore } from "@dnd/battle-runtime";
import { statBlockId } from "@dnd/shared/game-facts";
import { Hp } from "@dnd/shared/types";
import {
  SrdStatBlockRecordSchema,
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceOrdinalSchema,
} from "@dnd/surface/surface/schema";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { Result, Option, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { projectStatBlockBattleCombatant } from "./stat-block-battle-combatant-projection.ts";
import type { StatBlockCombatantToolInput } from "./start-battle-tool-input.ts";
import { jsonContentPayload } from "./tool-content.ts";

const authoredOrdinal = (value: number) =>
  Schema.decodeUnknownSync(StatBlockProcedureOrdinalSchema)(value);

describe("MCP Stat Block battle combatant projection", () => {
  test("rejects an unknown Stat Block identity with its authored id", () => {
    const root = createMcpPlaySessionRoot();
    const missingStatBlockId = statBlockId(
      "stat_block_synthetic_missing_mcp_combatant",
    );

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: {
        kind: "statBlock",
        statBlockId: missingStatBlockId,
        combatantId: combatantId("synthetic-missing-mcp-combatant"),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        admissionSource: { kind: "encounterParticipant" },
      },
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Unknown Stat Block combatant.",
      details: {
        code: "UNKNOWN_STAT_BLOCK_COMBATANT",
        statBlockId: missingStatBlockId,
      },
    });
  });

  test("retains the complete Stat Block resource graph failure", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      baseRoot.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const resource = {
      ordinal: Schema.decodeUnknownSync(
        StatBlockProcedureResourceOrdinalSchema,
      )(1),
      ownership: "shared" as const,
      limit: { kind: "daily" as const, uses: 1 },
    };
    const invalid = {
      ...base,
      id: statBlockId("stat_block_synthetic_mcp_resource_graph_failure"),
      name: "Synthetic MCP Resource Graph Failure",
      statBlock: {
        ...base.statBlock,
        resources: [resource, resource],
      },
    } satisfies StatBlockRecord;
    const root = {
      ...baseRoot,
      statBlockCatalog: {
        ...baseRoot.statBlockCatalog,
        getStatBlock: () => Option.some(invalid),
      },
    } satisfies ReturnType<typeof createMcpPlaySessionRoot>;

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error:
        "Battle runtime requires Stat Block resource declaration ordinal 1 to be unique.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: invalid.id,
        issues: [
          {
            kind: "duplicateResourceOrdinal",
            ordinal: resource.ordinal,
          },
        ],
      },
    });
  });

  test("projects a supported installed Stat Block combatant", () => {
    const root = createMcpPlaySessionRoot();
    const wolf = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_wolf"),
    );
    const combatant = {
      ...statBlockCombatant(wolf),
      currentHp: Hp(wolf.statBlock.hp.value),
      tempHp: Hp(2),
    };

    const projected = projectStatBlockBattleCombatant({ root, combatant });

    expect(Result.isSuccess(projected)).toBe(true);
    if (Result.isFailure(projected)) return;
    expect(projected.success).toMatchObject({
      tag: "encounterCombatant",
      creatureInit: {
        combatantId: combatant.combatantId,
        creatureInit: {
          currentHp: combatant.currentHp,
          tempHp: combatant.tempHp,
          source: { id: wolf.id },
        },
      },
    });
  });

  test("does not select lair-conditional Legendary Action uses", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      baseRoot.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const firstAction = base.statBlock.actions?.[0];
    if (firstAction === undefined) {
      throw new Error("Expected a Goblin Warrior action.");
    }
    const invalid = {
      ...base,
      id: statBlockId("stat_block_synthetic_mcp_lair_legendary_action_uses"),
      name: "Synthetic MCP Lair Legendary Action Uses",
      statBlock: {
        ...base.statBlock,
        legendaryActions: {
          uses: {
            kind: "lair_bonus" as const,
            usesOutsideLair: 3,
            additionalUsesInLair: 1,
          },
          entries: [firstAction],
        },
      },
    } satisfies StatBlockRecord;
    const root = {
      ...baseRoot,
      statBlockCatalog: {
        ...baseRoot.statBlockCatalog,
        getStatBlock: () => Option.some(invalid),
      },
    } satisfies ReturnType<typeof createMcpPlaySessionRoot>;

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Stat Block projection failed.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: invalid.id,
        reason: "unsupportedLairConditionalLegendaryActionUses",
      },
    });
  });

  test("preserves every accumulated unsupported procedure location", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      baseRoot.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const attack = base.statBlock.actions?.[0];
    if (attack === undefined || attack.kind !== "executable") {
      throw new Error("Expected a Goblin Warrior executable attack.");
    }
    const unsupportedAttack = {
      ...attack,
      procedure: {
        ...attack.procedure,
        multiattackCount: { kind: "literal" as const, value: 2 },
      },
    };
    const multiattack: Extract<
      StatBlockProcedureEntry,
      { readonly kind: "executable" }
    > = {
      kind: "executable",
      procedureOrdinal: authoredOrdinal(3),
      procedure: {
        kind: "multiattack",
        name: "Synthetic Routine",
        dispatches: [
          {
            procedureOrdinal: attack.procedureOrdinal,
            count: { kind: "literal", value: 1 },
          },
        ],
      },
      resourceRefs: { kind: "none" },
    };
    const invalid = Schema.decodeUnknownSync(SrdStatBlockRecordSchema)({
      ...base,
      id: statBlockId("stat_block_synthetic_mcp_projection_failure"),
      name: "Synthetic MCP Projection Failure",
      statBlock: {
        ...base.statBlock,
        actions: [unsupportedAttack, multiattack],
      },
    });
    const root = {
      ...baseRoot,
      statBlockCatalog: {
        ...baseRoot.statBlockCatalog,
        getStatBlock: (id: StatBlockRecord["id"]) =>
          id === invalid.id
            ? Option.some(invalid)
            : baseRoot.statBlockCatalog.getStatBlock(id),
      },
    } satisfies ReturnType<typeof createMcpPlaySessionRoot>;

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Stat Block projection failed.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: invalid.id,
        reason: "unsupportedProcedureBinding",
        issues: [
          { section: "actions", procedureOrdinal: attack.procedureOrdinal },
          { section: "actions", procedureOrdinal: authoredOrdinal(3) },
        ],
      },
    });
  });

  test("keeps scalar projection failures precise without procedure details", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      baseRoot.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const { swarm: _swarm, ...nonSwarmStatBlock } = base.statBlock;
    const invalid = {
      ...base,
      id: statBlockId("stat_block_synthetic_mcp_scalar_projection_failure"),
      name: "Synthetic MCP Scalar Projection Failure",
      statBlock: {
        ...nonSwarmStatBlock,
        size: { kind: "alternatives", options: ["small", "medium"] },
      },
    } satisfies StatBlockRecord;
    const root = {
      ...baseRoot,
      statBlockCatalog: {
        ...baseRoot.statBlockCatalog,
        getStatBlock: () => Option.some(invalid),
      },
    } satisfies ReturnType<typeof createMcpPlaySessionRoot>;

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Stat Block projection failed.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: invalid.id,
        reason: "nonLiteralSize",
      },
    });
  });

  test("does not select a form-restricted Speed without active-form state", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      baseRoot.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const invalid = Schema.decodeUnknownSync(SrdStatBlockRecordSchema)({
      ...base,
      id: "stat_block_synthetic_mcp_form_restricted_speed",
      name: "Synthetic MCP Form-Restricted Speed",
      statBlock: {
        ...base.statBlock,
        speeds: base.statBlock.speeds.map((speed, index) =>
          index === 0
            ? {
                ...speed,
                availability: {
                  kind: "forms_only",
                  forms: ["synthetic winged form"],
                },
              }
            : speed,
        ),
      },
    });
    const root = {
      ...baseRoot,
      statBlockCatalog: {
        ...baseRoot.statBlockCatalog,
        getStatBlock: (id: StatBlockRecord["id"]) =>
          id === invalid.id
            ? Option.some(invalid)
            : baseRoot.statBlockCatalog.getStatBlock(id),
      },
    } satisfies ReturnType<typeof createMcpPlaySessionRoot>;

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Stat Block projection failed.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: invalid.id,
        reason: "unsupportedFormRestrictedSpeed",
      },
    });
  });

  test("reports the unresolved GM Speed Table Decision without selecting an alternative", () => {
    const root = createMcpPlaySessionRoot();
    const swarm = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_swarm_of_insects"),
    );

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(swarm),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Stat Block projection failed.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: swarm.id,
        reason: "unresolvedGmSpeedChoice",
      },
    });
  });

  test("does not apply qualified condition Immunity without qualifying state", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      baseRoot.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const invalid = Schema.decodeUnknownSync(SrdStatBlockRecordSchema)({
      ...base,
      id: "stat_block_synthetic_mcp_qualified_condition_immunity",
      name: "Synthetic MCP Qualified Condition Immunity",
      statBlock: {
        ...base.statBlock,
        immunities: {
          qualifiedConditions: [
            {
              condition: "charmed",
              qualifier: "while the synthetic ward is active",
            },
          ],
        },
      },
    });
    const root = {
      ...baseRoot,
      statBlockCatalog: {
        ...baseRoot.statBlockCatalog,
        getStatBlock: (id: StatBlockRecord["id"]) =>
          id === invalid.id
            ? Option.some(invalid)
            : baseRoot.statBlockCatalog.getStatBlock(id),
      },
    } satisfies ReturnType<typeof createMcpPlaySessionRoot>;

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Stat Block projection failed.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: invalid.id,
        reason: "unsupportedQualifiedConditionImmunity",
      },
    });
  });

  test("maps invalid resource limits to a precise projection failure", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const base = assertStatBlockForTest(
      baseRoot.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const invalidResource = {
      ordinal: Schema.decodeUnknownSync(
        StatBlockProcedureResourceOrdinalSchema,
      )(1),
      ownership: "each" as const,
      limit: { kind: "daily" as const, uses: 0 },
    };
    const invalid = {
      ...base,
      id: statBlockId("stat_block_synthetic_mcp_invalid_resource_limit"),
      name: "Synthetic MCP Invalid Resource Limit",
      statBlock: {
        ...base.statBlock,
        resources: [invalidResource],
      },
    } satisfies StatBlockRecord;
    const root = {
      ...baseRoot,
      statBlockCatalog: {
        ...baseRoot.statBlockCatalog,
        getStatBlock: () => Option.some(invalid),
      },
    } satisfies ReturnType<typeof createMcpPlaySessionRoot>;

    const projected = projectStatBlockBattleCombatant({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expect(jsonContentPayload(projected.failure)).toEqual({
      error: "Stat Block projection failed.",
      details: {
        code: "STAT_BLOCK_BATTLE_INIT_INVALID",
        statBlockId: invalid.id,
        reason: "invalidResourceLimit",
        issues: [
          {
            ordinal: invalidResource.ordinal,
            reason: "invalidDailyUses",
          },
        ],
      },
    });
  });
});

function statBlockCombatant(
  statBlock: StatBlockRecord,
): StatBlockCombatantToolInput {
  return {
    kind: "statBlock",
    statBlockId: statBlock.id,
    combatantId: combatantId("synthetic-mcp-combatant"),
    initiative: initiativeScore(10),
    ammunitionStocks: [],
    admissionSource: { kind: "encounterParticipant" },
  };
}
