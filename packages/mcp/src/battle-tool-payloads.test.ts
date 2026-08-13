import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battlePresentedSnapshot,
  battleProcedureExecutionRef,
  combatantId,
  discoverBattleActs,
  resolveBattleRuntimeSubject,
  snapshotBattle,
  type BattleInterruptProcedureChoice,
  type BattleRuntimeResolutionResult,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleResolutionResultPayload,
  battleSessionPayload,
  battleSnapshotPresentationIssueContent,
  noStoredBattleContent,
  pendingBattleFillsContent,
  presentedInterruptChoices,
  unknownStatBlockContent,
} from "./battle-tool-payloads.ts";
import { storeBattleResolution } from "./battle-tools.ts";
import { createMcpCompositionRoot } from "./composition-root.ts";
import { handleToolCall as handleWireToolCall } from "./server.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";

function handleToolCall(
  root: ReturnType<typeof createMcpCompositionRoot>,
  name: string,
  args: unknown,
) {
  return handleWireToolCall(root, name, battleToolWireArgs(name, args));
}

describe("battle tool payload boundaries", () => {
  test("projects the explicit no-session state", () => {
    const root = createMcpCompositionRoot();
    expect(battleSessionPayload(root, null)).toMatchObject({
      _tag: "Right",
      right: {
        snapshot: null,
        availableActs: [],
        admittedSpellPresentations: [],
        presentedInterruptChoices: [],
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
        snapshot: { pendingInterrupt: null },
        presentedInterruptChoices: [],
      },
    });
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
          fills: [],
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

  test("omits mechanical and unpresentable interrupt choices", () => {
    const { session } = startedStatBlockBattle();
    const reactorId = combatantId("goblin");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle:payload-boundaries"),
        reactorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const choices = [
      {
        kind: "reactionRollOrDamageReduction",
        reactorId,
        choice: {
          kind: "attackDamageReduction",
          procedureRef,
          reduction: { kind: "halfDamage" },
        },
        initialHoles: [],
      },
      {
        kind: "castTriggeredReactionSpell",
        reactorId,
        initialHoles: [],
        subject: {
          tag: "runtimeCommand",
          actorId: reactorId,
          command: "castTriggeredReactionSpell",
          reactorId,
          procedureRef,
        },
      },
    ] as const satisfies readonly BattleInterruptProcedureChoice[];

    expect(presentedInterruptChoices(session, choices)).toEqual([]);
  });

  test("retains reported dropped-object outcomes in resolved payloads", () => {
    const { session } = startedStatBlockBattle();
    const presented = battlePresentedSnapshot(session);
    if (Either.isLeft(presented)) {
      throw new Error("Expected the test battle snapshot to be presentable.");
    }
    const result = {
      tag: "resolved",
      session,
      snapshot: snapshotBattle(session.state),
      droppedObjects: [],
    } satisfies BattleRuntimeResolutionResult;

    expect(
      battleResolutionResultPayload(result, presented.right),
    ).toHaveProperty("droppedObjects", []);
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
    expect(storeBattleResolution(root, result, null)).toBe(false);
    expect(root.sessionStore.battleSession).toBe(session);
  });
});

function startedStatBlockBattle() {
  const root = createMcpCompositionRoot();
  handleToolCall(root, "start_battle", {
    battleId: "battle:payload-boundaries",
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
