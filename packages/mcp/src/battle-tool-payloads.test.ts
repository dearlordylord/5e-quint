import {
  currentBattleCheckpointFrontierEnvelope,
  combatantId,
  discoverBattleActs,
  resolveBattleRuntimeSubject,
  type BattleResolvedCheckpointFrontierEnvelope,
  type BattleRuntimeResolutionResult,
} from "@dnd/battle-runtime";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleResolutionResultPayload,
  battleSessionPayload,
  battleSnapshotPresentationIssueContent,
  noStoredBattleContent,
  pendingBattleFillsContent,
  unknownStatBlockContent,
} from "./battle-tool-payloads.ts";
import { storeBattleResolution } from "./battle-tools.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall as handleWireToolCall } from "./server.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";

function handleToolCall(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  name: string,
  args: unknown,
) {
  return handleWireToolCall(root, name, battleToolWireArgs(name, args));
}

describe("battle tool payload boundaries", () => {
  test("projects the explicit no-session state", () => {
    const root = createMcpPlaySessionRoot();
    expect(battleSessionPayload(root, null)).toMatchObject({
      _tag: "Right",
      right: {
        envelope: null,
      },
    });
    expect(noStoredBattleContent()).toMatchObject({
      isError: true,
      content: [
        {
          text: expect.stringContaining('"code": "NO_BATTLE_SESSION"'),
        },
      ],
    });
  });

  test("projects an active session without an interrupt window", () => {
    const { root, session } = startedStatBlockBattle();

    expect(battleSessionPayload(root, session)).toMatchObject({
      _tag: "Right",
      right: {
        envelope: {
          checkpoint: { battleId: "battle:payload-boundaries" },
        },
      },
    });
    const payload = battleSessionPayload(root, session);
    if (Either.isLeft(payload)) throw new Error("Expected an active payload.");
    if (payload.right.envelope === null) {
      throw new Error("Expected an active battle envelope.");
    }
    expect(payload.right.envelope.checkpoint).not.toHaveProperty(
      "pendingInterrupt",
    );
  });

  test("returns typed snapshot-presentation issues as tool errors", () => {
    const issue = {
      tag: "battleSnapshotPresentationIssue",
      reason: "missingStatBlockPresentation",
      combatantId: combatantId("synthetic-missing-presentation"),
    } as const;
    const content = battleSnapshotPresentationIssueContent([issue]);
    expect(content).toMatchObject({
      isError: true,
      content: [
        {
          text: expect.stringContaining(
            '"code": "BATTLE_SNAPSHOT_PRESENTATION_INCOMPLETE"',
          ),
        },
      ],
    });
  });

  test("preserves Error and non-Error boundary diagnostics", () => {
    expect(
      unknownStatBlockContent("stat_block_missing", new Error("missing")),
    ).toMatchObject({
      content: [{ text: expect.stringContaining('"message": "missing"') }],
    });
    expect(
      unknownStatBlockContent("stat_block_missing", "missing text"),
    ).toMatchObject({
      content: [{ text: expect.stringContaining('"message": "missing text"') }],
    });
    expect(
      pendingBattleFillsContent(
        {
          subject: {
            tag: "runtimeCommand",
            actorId: combatantId("pending-actor"),
            command: "endTurn",
          },
        },
        "Pending",
      ),
    ).toMatchObject({
      content: [
        { text: expect.stringContaining('"code": "BATTLE_FILLS_PENDING"') },
      ],
    });
  });

  test("retains reported dropped-object outcomes in resolved payloads", () => {
    const { session } = startedStatBlockBattle();
    const envelope = currentBattleCheckpointFrontierEnvelope(session);
    if (envelope.frontier.kind === "holes") {
      throw new Error(
        "Expected the test battle to expose a resolved frontier.",
      );
    }
    const resolvedEnvelope =
      envelope as BattleResolvedCheckpointFrontierEnvelope;
    const result = {
      tag: "resolved",
      session,
      envelope: resolvedEnvelope,
      droppedObjects: [],
    } satisfies BattleRuntimeResolutionResult;

    expect(battleResolutionResultPayload(result)).toHaveProperty(
      "droppedObjects",
      [],
    );
  });

  test("does not store needs-holes results without a pending transaction", () => {
    const { root, session } = startedStatBlockBattle();
    const act = discoverBattleActs(session).find(
      (candidate) => candidate.initialHoles.length > 0,
    );
    if (act === undefined) {
      throw new Error("Expected a test battle act with initial holes.");
    }
    const result = resolveBattleRuntimeSubject({
      session,
      subject: act.subject,
      fills: [],
      statBlockCatalog: root.statBlockCatalog,
    });
    if (result.tag !== "needsHoles") {
      throw new Error("Expected the test battle act to need hole fills.");
    }
    expect(storeBattleResolution(root, result, null)).toEqual(
      Either.left({ tag: "pendingBattleFillTransactionMissing" }),
    );
    expect(root.sessionStore.battleSession).toBe(session);
  });
});

function startedStatBlockBattle() {
  const root = createMcpPlaySessionRoot();
  handleToolCall(root, "start_battle", {
    battleId: "battle:payload-boundaries",
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
  });
  const session = root.sessionStore.battleSession;
  if (session === null) {
    throw new Error("Expected an active payload-boundary test battle.");
  }
  return { root, session };
}
