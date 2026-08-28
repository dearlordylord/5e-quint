import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { combatantId, initiativeScore } from "@dnd/battle-runtime";
import { statBlockId } from "@dnd/shared/game-facts";
import {
  SrdStatBlockRecordSchema,
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceOrdinalSchema,
} from "@dnd/surface/surface/schema";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { Either, Option, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { projectStatBlockBattleCombatant } from "./stat-block-battle-combatant-projection.ts";
import type { StatBlockCombatantToolInput } from "./start-battle-tool-input.ts";
import { jsonContentPayload } from "./tool-content.ts";

const authoredOrdinal = (value: number) =>
  Schema.decodeUnknownSync(StatBlockProcedureOrdinalSchema)(value);

describe("MCP Stat Block battle combatant projection", () => {
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

    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(jsonContentPayload(projected.left)).toEqual({
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

    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(jsonContentPayload(projected.left)).toEqual({
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

    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(jsonContentPayload(projected.left)).toEqual({
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

    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(jsonContentPayload(projected.left)).toEqual({
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

    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(jsonContentPayload(projected.left)).toEqual({
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
    const invalidRechargeResource = {
      ordinal: Schema.decodeUnknownSync(
        StatBlockProcedureResourceOrdinalSchema,
      )(2),
      ownership: "shared" as const,
      limit: { kind: "recharge" as const, minimumRoll: 7 },
    };
    const invalid = {
      ...base,
      id: statBlockId("stat_block_synthetic_mcp_invalid_resource_limit"),
      name: "Synthetic MCP Invalid Resource Limit",
      statBlock: {
        ...base.statBlock,
        resources: [invalidResource, invalidRechargeResource],
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

    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(jsonContentPayload(projected.left)).toEqual({
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
          {
            ordinal: invalidRechargeResource.ordinal,
            reason: "invalidRechargeMinimumRoll",
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
