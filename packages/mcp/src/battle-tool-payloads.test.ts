import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battlePendingTransactionView,
  battlePresentedSnapshot,
  battleProcedureExecutionRef,
  combatantId,
  discoverBattleActs,
  settleBattleRuntimeTransaction,
  snapshotBattle,
  type BattleInterruptProcedureChoice,
  type BattlePendingTransactionView,
  type BattleRuntimeResolutionResult,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
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
import {
  battlePendingFillAdmission,
  battlePendingSubjectAdmission,
} from "./battle-tools.ts";
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
          holes: [
            {
              holeInstanceKey: holeInstanceKey("payload-pending:instance"),
              holeId: holeId("payload-pending"),
              kind: "targetChoice",
              label: "Pending target",
              choices: [combatantId("pending-target")],
            },
          ],
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
        kind: "reactionModifier",
        responderId: reactorId,
        modifier: {
          kind: "attackDamageReduction",
          procedureRef,
          reduction: { kind: "halfDamage" },
        },
        initialHoles: [],
      },
      {
        kind: "nestedProcedure",
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

  test("atomically stores needs-holes transaction results", () => {
    const { root, session } = startedStatBlockBattle();
    const act = discoverBattleActs(session).find(
      (candidate) => candidate.initialHoles.length > 0,
    );
    if (act === undefined) {
      throw new Error("Expected a test battle act with initial holes.");
    }
    const result = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: act.subject,
        fills: [],
      },
      statBlockCatalog: root.statBlockCatalog,
    });
    if (result.tag !== "needsHoles") {
      throw new Error("Expected the test battle act to need hole fills.");
    }
    const transactionView = battlePendingTransactionView(result.transaction);
    expect(transactionView).toBeDefined();
    if (transactionView !== undefined) {
      expect(Object.isFrozen(transactionView)).toBe(true);
      expect(Object.isFrozen(transactionView.subject)).toBe(true);
      expect(Object.isFrozen(transactionView.fills)).toBe(true);
      expect(Object.isFrozen(transactionView.holes)).toBe(true);
      expect(Object.isFrozen(transactionView.holes[0])).toBe(true);
      expect(transactionView.subject).not.toBe(result.resolution.subject);
      expect(transactionView.holes).not.toBe(result.resolution.holes);
    }
    expect(
      root.sessionStore.storeActiveBattle(result.resolution.session),
    ).toEqual(Either.right(undefined));
    const staleStoreSnapshot = root.sessionStore.snapshot();
    expect(
      root.sessionStore.storeBattleTransactionResult(session, result),
    ).toEqual(
      Either.left({
        tag: "battleStateSessionChanged",
        battleId: session.state.battleId,
      }),
    );
    expect(root.sessionStore.snapshot()).toEqual(staleStoreSnapshot);
    expect(
      root.sessionStore.storeBattleTransactionResult(
        result.resolution.session,
        result,
      ),
    ).toEqual(Either.right(undefined));
    expect(root.sessionStore.battleSession).toBe(result.resolution.session);
    expect(root.sessionStore.getPendingBattleTransaction()).toBe(
      result.transaction,
    );
  });

  test("classifies Ready trigger overlays by MCP operation", () => {
    const reportSubject = {
      tag: "runtimeCommand",
      actorId: combatantId("reporter"),
      command: "reportReadyTrigger",
      readiedActorId: combatantId("readied"),
    } as const satisfies BattleSubject;
    const distinctReportSubject = {
      ...reportSubject,
      readiedActorId: combatantId("other-readied"),
    } as const satisfies BattleSubject;
    const interruptHole = {
      holeInstanceKey: holeInstanceKey("payload-interrupt:instance"),
      holeId: holeId("payload-interrupt"),
      kind: "interruptDecision",
      label: "Interrupt decision",
      trigger: "attackHit",
      eligibleResponders: [combatantId("responder")],
    } as const;
    const ordinaryHole = {
      holeInstanceKey: holeInstanceKey("payload-ordinary:instance"),
      holeId: holeId("payload-ordinary"),
      kind: "targetChoice",
      label: "Target choice",
      choices: [combatantId("target")],
    } as const;
    const interruptPending = {
      subject: reportSubject,
      fills: [],
      holes: [interruptHole],
    } satisfies BattlePendingTransactionView;
    const ordinaryPending = {
      subject: reportSubject,
      fills: [],
      holes: [ordinaryHole],
    } satisfies BattlePendingTransactionView;

    expect(
      battlePendingSubjectAdmission(interruptPending, reportSubject),
    ).toEqual({ tag: "sameSubject" });
    expect(
      battlePendingSubjectAdmission(interruptPending, distinctReportSubject),
    ).toEqual({ tag: "readyTriggerOverlay" });
    expect(
      battlePendingFillAdmission(
        interruptPending,
        distinctReportSubject,
        "interruptDecision",
      ),
    ).toEqual({ tag: "differentSubject" });
    expect(
      battlePendingFillAdmission(
        interruptPending,
        distinctReportSubject,
        "targetChoice",
      ),
    ).toEqual({ tag: "readyTriggerOverlay" });
    expect(
      battlePendingSubjectAdmission(ordinaryPending, distinctReportSubject),
    ).toEqual({ tag: "differentSubject" });
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
