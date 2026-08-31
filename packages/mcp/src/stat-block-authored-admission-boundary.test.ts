import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import {
  combatantId,
  initiativeScore,
  type BattleCreatureInit,
  type CharacterBattleCombatantInit,
} from "@dnd/battle-runtime";
import { statBlockId } from "@dnd/shared/game-facts";
import { Hp, resourceCount } from "@dnd/shared/types";
import {
  assertSrd521StatBlock,
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  SrdStatBlockRecordSchema,
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceOrdinalSchema,
} from "@dnd/surface/surface/schema";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { Match, Result, Schema } from "effect";
import { describe, expect, expectTypeOf, test } from "vitest";

import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { battleStatBlockExecutionCatalog } from "./battle-stat-block-execution-catalog.ts";
import { handleToolCall } from "./server.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";
import type { StatBlockCombatantToolInput } from "./start-battle-tool-input.ts";
import { jsonContentPayload } from "./tool-content.ts";

const authoredOrdinal = (value: number) =>
  Schema.decodeUnknownSync(StatBlockProcedureOrdinalSchema)(value);

describe("MCP authored Stat Block battle admission boundary", () => {
  test("does not type a spread character and authored Stat Block as one public input", () => {
    type SpreadHybrid = CharacterBattleCombatantInit & {
      readonly statBlock: StatBlockRecord;
    };

    expectTypeOf<SpreadHybrid>().not.toMatchTypeOf<BattleCreatureInit>();
  });

  test("rejects an unknown Stat Block identity with its authored id", () => {
    const root = createMcpPlaySessionRoot();
    const missingStatBlockId = statBlockId(
      "stat_block_synthetic_missing_mcp_combatant",
    );

    const projected = admitStatBlockThroughStartBoundary({
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
    expectStartAdmissionIssue(projected.failure, {
      kind: "statBlockSourceUnavailable",
      ownerPath: ["initialCombatants", 0],
      combatantId: "synthetic-missing-mcp-combatant",
      code: "UNKNOWN_STAT_BLOCK_COMBATANT",
      statBlockId: missingStatBlockId,
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
    const root = rootWithAuthoredStatBlocks(baseRoot, [base, invalid]);

    const started = admitStatBlockThroughStartBoundary({
      root,
      combatant: {
        ...statBlockCombatant(base),
        ammunitionStocks: [
          { ammunition: "arrow", remaining: resourceCount(20) },
        ],
      },
    });
    expect(Result.isSuccess(started)).toBe(true);
    if (Result.isFailure(started)) return;
    const battleBeforeRejectedAdd = root.sessionStore.battleSession;
    const projected = admitStatBlockThroughAddBoundary({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectDynamicAdmissionIssue(projected.failure, {
      kind: "battleInitialization",
      code: "BATTLE_INITIALIZATION_INVALID",
      ownerPath: ["operation", "combatant"],
      issueTag: "statBlockResourceGraphIssue",
      combatantId: "synthetic-mcp-combatant",
      issues: [
        {
          kind: "duplicateResourceOrdinal",
          ordinal: resource.ordinal,
        },
      ],
    });
    expect(root.sessionStore.battleSession).toBe(battleBeforeRejectedAdd);
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

    const projected = admitStatBlockThroughStartBoundary({ root, combatant });

    expect(Result.isSuccess(projected)).toBe(true);
    if (Result.isFailure(projected)) return;
    expect(projected.success).toMatchObject({
      envelope: {
        checkpoint: {
          combatants: [
            {
              combatantId: combatant.combatantId,
              hp: combatant.currentHp,
              tempHp: combatant.tempHp,
              origin: { kind: "statBlock", statBlockId: wolf.id },
            },
          ],
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
    const root = rootWithAuthoredStatBlocks(baseRoot, [invalid]);

    const projected = admitStatBlockThroughStartBoundary({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectStatBlockProjectionIssue(projected.failure, {
      reason: "unsupportedLairConditionalLegendaryActionUses",
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
    const root = rootWithAuthoredStatBlocks(baseRoot, [invalid]);

    const projected = admitStatBlockThroughStartBoundary({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectStatBlockProjectionIssue(projected.failure, {
      reason: "unsupportedProcedureBinding",
      issues: [
        { section: "actions", procedureOrdinal: attack.procedureOrdinal },
        { section: "actions", procedureOrdinal: authoredOrdinal(3) },
      ],
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
    const root = rootWithAuthoredStatBlocks(baseRoot, [invalid]);

    const projected = admitStatBlockThroughStartBoundary({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectStatBlockProjectionIssue(projected.failure, {
      reason: "nonLiteralSize",
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
    const root = rootWithAuthoredStatBlocks(baseRoot, [invalid]);

    const projected = admitStatBlockThroughStartBoundary({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectStatBlockProjectionIssue(projected.failure, {
      reason: "unsupportedFormRestrictedSpeed",
    });
  });

  test("reports the unresolved GM Speed Table Decision without selecting an alternative", () => {
    const root = createMcpPlaySessionRoot();
    const swarm = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_swarm_of_insects"),
    );

    const projected = admitStatBlockThroughStartBoundary({
      root,
      combatant: statBlockCombatant(swarm),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectStatBlockProjectionIssue(projected.failure, {
      reason: "unresolvedGmSpeedChoice",
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
    const root = rootWithAuthoredStatBlocks(baseRoot, [invalid]);

    const projected = admitStatBlockThroughStartBoundary({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectStatBlockProjectionIssue(projected.failure, {
      reason: "unsupportedQualifiedConditionImmunity",
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
    const root = rootWithAuthoredStatBlocks(baseRoot, [invalid]);

    const projected = admitStatBlockThroughStartBoundary({
      root,
      combatant: statBlockCombatant(invalid),
    });

    expect(Result.isFailure(projected)).toBe(true);
    if (Result.isSuccess(projected)) return;
    expectStatBlockProjectionIssue(projected.failure, {
      reason: "invalidResourceLimit",
      issues: [
        {
          ordinal: invalidResource.ordinal,
          reason: "invalidDailyUses",
        },
      ],
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

function rootWithAuthoredStatBlocks(
  baseRoot: ReturnType<typeof createMcpPlaySessionRoot>,
  statBlocks: readonly StatBlockRecord[],
): ReturnType<typeof createMcpPlaySessionRoot> {
  const catalog = buildStatBlockCatalog({
    collections: [
      defineSrdStatBlockCollection({
        statBlocks: statBlocks.map(assertSrd521StatBlock),
      }),
    ],
  });
  if (catalog.tag !== "ok") {
    throw new Error("Expected the MCP fixture Stat Block catalog to build.");
  }
  return {
    ...baseRoot,
    statBlockCatalog: catalog.catalog,
    battleStatBlockExecutionCatalog: battleStatBlockExecutionCatalog(
      catalog.catalog,
    ),
  };
}

function admitStatBlockThroughStartBoundary(input: {
  readonly root: ReturnType<typeof createMcpPlaySessionRoot>;
  readonly combatant: StatBlockCombatantToolInput;
}) {
  const response = handleToolCall(
    input.root,
    "start_battle",
    battleToolWireArgs("start_battle", {
      battleId: "battle:synthetic-mcp-stat-block-admission",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [input.combatant],
    }),
  );
  return toolCallResult(response);
}

function admitStatBlockThroughAddBoundary(input: {
  readonly root: ReturnType<typeof createMcpPlaySessionRoot>;
  readonly combatant: StatBlockCombatantToolInput;
}) {
  const response = handleToolCall(
    input.root,
    "battle_lifecycle",
    battleToolWireArgs("battle_lifecycle", {
      operation: {
        kind: "addCombatant",
        combatant: input.combatant,
      },
    }),
  );
  return toolCallResult(response);
}

function toolCallResult(response: ReturnType<typeof handleToolCall>) {
  const outcome =
    "isError" in response
      ? { tag: "failure" as const, response }
      : { tag: "success" as const, response };
  return Match.value(outcome).pipe(
    Match.discriminatorsExhaustive("tag")({
      failure: ({ response: failure }) => Result.fail(failure),
      success: ({ response: success }) =>
        Result.succeed(jsonContentPayload(success)),
    }),
  );
}

function expectStartAdmissionIssue(
  response: Parameters<typeof jsonContentPayload>[0],
  issue: Record<string, unknown>,
) {
  expect(jsonContentPayload(response)).toMatchObject({
    error: "Invalid battle start combatants.",
    details: {
      code: "INVALID_BATTLE_COMBATANTS",
      issues: [issue],
    },
  });
}

function expectDynamicAdmissionIssue(
  response: Parameters<typeof jsonContentPayload>[0],
  issue: Record<string, unknown>,
) {
  expect(jsonContentPayload(response)).toMatchObject({
    error: "Battle combatant admission failed.",
    details: {
      code: "BATTLE_COMBATANT_ADMISSION_FAILED",
      combatantId: "synthetic-mcp-combatant",
      ownerPath: ["operation", "combatant"],
      issues: [issue],
    },
  });
}

function expectStatBlockProjectionIssue(
  response: Parameters<typeof jsonContentPayload>[0],
  failure: Record<string, unknown>,
  ownerPath: readonly (string | number)[] = ["initialCombatants", 0],
) {
  expectStartAdmissionIssue(response, {
    kind: "battleInitialization",
    code: "STAT_BLOCK_BATTLE_INIT_INVALID",
    ownerPath,
    issueTag: "statBlockProjectionFailure",
    combatantId: "synthetic-mcp-combatant",
    failure: {
      tag: "battleStatBlockProjectionFailure",
      ...failure,
    },
  });
}
