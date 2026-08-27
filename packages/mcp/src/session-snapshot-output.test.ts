import {
  battleId,
  battlePresentedCheckpointFrontierEnvelope,
  characterId,
  combatantId,
  discoverBattleActs,
  presentBattleCheckpointFrontierEnvelope,
  resolveBattleRuntimeSubject,
} from "@dnd/battle-runtime";
import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { AdminSessionProjectionSchema } from "./admin-mirror-contract.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import { handleToolCall as handleWireToolCall } from "./server.ts";
import {
  McpSessionSnapshotSchema,
  McpSessionSummarySchema,
  mcpSessionSummary,
} from "./session-snapshot-output.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";

const setupState = {
  tag: "initialInitiativeSetup",
  battleId: "battle:projection-contract",
  combatants: [],
} as const;
const activeState = {
  tag: "activeBattle",
  battleId: "battle:projection-contract",
  currentActorId: "combatant:projection-contract",
} as const;

function sessionForProjectionState(
  battleState:
    | typeof setupState
    | typeof activeState
    | { readonly tag: "none" },
) {
  return {
    draftIds: [],
    characterIds: [],
    selectedStatBlockId: null,
    battleState,
  };
}

describe("MCP session wire projections", () => {
  test("keeps pending fills and consumer frontier copies out of session schemas", () => {
    const summaryProperties = mcpOutputJsonSchema(
      McpSessionSummarySchema,
    ).properties;
    const snapshotProperties = mcpOutputJsonSchema(
      McpSessionSnapshotSchema,
    ).properties;
    for (const properties of [summaryProperties, snapshotProperties]) {
      expect(properties).not.toHaveProperty("transientBattleFills");
      expect(properties).not.toHaveProperty("pendingBattleHoles");
      expect(properties).not.toHaveProperty("availableActs");
      expect(properties).not.toHaveProperty("presentedInterruptChoices");
    }
    expect(
      Schema.decodeUnknownEither(McpSessionSnapshotSchema, {
        onExcessProperty: "error",
      })({
        ...sessionForProjectionState({ tag: "none" }),
        transientBattleFills: null,
      }),
    ).toEqual(Either.left(expect.anything()));
  });

  test("does not accept legacy duplicate battle projections", () => {
    const legacy = {
      envelope: null,
      battleState: setupState,
      snapshot: {},
      availableActs: [],
      session: sessionForProjectionState(setupState),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(StartBattleOutputSchema, {
          onExcessProperty: "error",
        })(legacy),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSessionOutputSchema, {
          onExcessProperty: "error",
        })({
          envelope: null,
          snapshot: null,
          session: sessionForProjectionState({ tag: "none" }),
        }),
      ),
    ).toBe(true);
  });

  test("start battle cannot report an empty battle session", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(StartBattleOutputSchema)({
          envelope: null,
          session: sessionForProjectionState({ tag: "none" }),
        }),
      ),
    ).toBe(true);
  });

  test("requires one presented envelope for active battle resolution", () => {
    const schema = mcpOutputJsonSchema(BattleResolutionOutputSchema);
    const serialized = JSON.stringify(schema);
    expect(serialized).toContain('"envelope"');
    expect(serialized).not.toContain('"snapshot"');
    expect(serialized).not.toContain('"availableActs"');
    expect(serialized).not.toContain('"presentedInterruptChoices"');
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleResolutionOutputSchema)({
          result: { tag: "needsHoles" },
          snapshot: {},
          session: {
            ...sessionForProjectionState(activeState),
            battleState: activeState,
          },
        }),
      ),
    ).toBe(true);
  });

  test("derives the session summary from the canonical snapshot", () => {
    const snapshot = {
      draftIds: [],
      characterIds: [characterId("character:projection-test")],
      selectedStatBlockId: null,
      battleState: {
        tag: "activeBattle",
        battleId: battleId("battle-projection-test"),
        currentActorId: combatantId("combatant:projection-test"),
      },
    } as const;
    expect(mcpSessionSummary(snapshot)).toEqual(snapshot);
    expect(
      schemaJsonContent(SelectStatBlockOutputSchema, {
        selectedStatBlock: {},
        session: mcpSessionSummary(snapshot),
      }).structuredContent,
    ).toMatchObject({ session: snapshot });
  });

  test("accepts a canonical active battle envelope", () => {
    const root = createMcpPlaySessionRoot();
    handleWireToolCall(
      root,
      "start_battle",
      battleToolWireArgs("start_battle", {
        battleId: "battle:resolution-contract",
        initiativeMode: "direct",
        companionAdmissions: [],
        initialCombatants: [
          {
            admissionSource: { kind: "encounterParticipant" },
            combatantId: "goblin",
            initiative: 10,
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
          },
          {
            admissionSource: { kind: "encounterParticipant" },
            combatantId: "skeleton",
            initiative: 5,
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_skeleton",
          },
        ],
      }),
    );
    const session = root.sessionStore.battleSession;
    if (session === null) throw new Error("Expected active battle.");
    const envelope = battlePresentedCheckpointFrontierEnvelope(session);
    if (Either.isLeft(envelope)) throw new Error("Expected presentation.");
    expect(
      Schema.decodeUnknownEither(BattleResolutionOutputSchema)({
        result: { tag: "resolved" },
        envelope: envelope.right,
        session: {
          ...mcpSessionSummary(root.sessionStore.snapshot()),
          battleState: {
            tag: "activeBattle",
            battleId: session.state.battleId,
            currentActorId: session.state.initiative.stillToAct[0]?.creature,
          },
        },
      }),
    ).toSatisfy((result) => Either.isRight(result));
  });

  test("rejects forged session and result/frontier correlations", () => {
    const root = createMcpPlaySessionRoot();
    handleWireToolCall(
      root,
      "start_battle",
      battleToolWireArgs("start_battle", {
        battleId: "battle:forged-correlation",
        initiativeMode: "direct",
        companionAdmissions: [],
        initialCombatants: [
          {
            admissionSource: { kind: "encounterParticipant" },
            combatantId: "goblin",
            initiative: 10,
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
          },
          {
            admissionSource: { kind: "encounterParticipant" },
            combatantId: "skeleton",
            initiative: 5,
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_skeleton",
          },
        ],
      }),
    );
    const session = root.sessionStore.battleSession;
    if (session === null) throw new Error("Expected active battle.");
    const presented = battlePresentedCheckpointFrontierEnvelope(session);
    if (Either.isLeft(presented)) throw new Error("Expected presentation.");
    const activeSession = {
      ...mcpSessionSummary(root.sessionStore.snapshot()),
      battleState: {
        tag: "activeBattle" as const,
        battleId: session.state.battleId,
        currentActorId: session.state.initiative.stillToAct[0]!.creature,
      },
    };

    expect(
      Schema.decodeUnknownEither(BattleSessionOutputSchema)({
        envelope: presented.right,
        session: sessionForProjectionState({ tag: "none" }),
      }),
    ).toEqual(Either.left(expect.anything()));
    expect(
      Schema.decodeUnknownEither(BattleSessionOutputSchema)({
        envelope: null,
        session: activeSession,
      }),
    ).toEqual(Either.left(expect.anything()));
    expect(
      Schema.decodeUnknownEither(BattleResolutionOutputSchema)({
        result: { tag: "needsHoles" },
        envelope: presented.right,
        session: activeSession,
      }),
    ).toEqual(Either.left(expect.anything()));

    const act = discoverBattleActs(session).find(
      (candidate) => candidate.initialHoles.length > 0,
    );
    if (act === undefined) throw new Error("Expected an act with holes.");
    const mechanics = resolveBattleRuntimeSubject({
      session,
      subject: act.subject,
      fills: [],
      statBlockCatalog: root.statBlockCatalog,
    });
    if (mechanics.tag !== "needsHoles") {
      throw new Error("Expected a holes frontier.");
    }
    const presentedHoles = presentBattleCheckpointFrontierEnvelope(
      mechanics.session,
      mechanics.envelope,
    );
    if (Either.isLeft(presentedHoles)) {
      throw new Error("Expected holes presentation.");
    }
    expect(
      Schema.decodeUnknownEither(BattleResolutionOutputSchema)({
        result: { tag: "resolved" },
        envelope: presentedHoles.right,
        session: activeSession,
      }),
    ).toEqual(Either.left(expect.anything()));
    expect(
      Schema.decodeUnknownEither(BattleResolutionOutputSchema)({
        result: {
          tag: "invalid",
          reason: "invalidFill",
          message: "Retry the current frontier.",
        },
        envelope: presented.right,
        session: activeSession,
      }),
    ).toSatisfy((result) => Either.isRight(result));

    const forgedBattleIdEnvelope = {
      ...presented.right,
      checkpoint: {
        ...presented.right.checkpoint,
        battleId: battleId("battle:other-correlation"),
      },
    };
    expect(
      Schema.decodeUnknownEither(BattleSessionOutputSchema)({
        envelope: forgedBattleIdEnvelope,
        session: activeSession,
      }),
    ).toEqual(Either.left(expect.anything()));
    expect(
      Schema.decodeUnknownEither(AdminSessionProjectionSchema)({
        battle: forgedBattleIdEnvelope,
        characters: [],
        session: activeSession,
      }),
    ).toEqual(Either.left(expect.anything()));

    const forgedActorEnvelope = {
      ...presented.right,
      checkpoint: {
        ...presented.right.checkpoint,
        currentActorId: combatantId("combatant:other-correlation"),
      },
    };
    expect(
      Schema.decodeUnknownEither(BattleResolutionOutputSchema)({
        result: { tag: "resolved" },
        envelope: forgedActorEnvelope,
        session: activeSession,
      }),
    ).toEqual(Either.left(expect.anything()));
  });

  test("admin projections use the same presented envelope owner", () => {
    const schema = mcpOutputJsonSchema(AdminSessionProjectionSchema);
    expect(JSON.stringify(schema)).toContain("checkpoint");
    expect(JSON.stringify(schema)).not.toContain("availableActs");
  });
});
