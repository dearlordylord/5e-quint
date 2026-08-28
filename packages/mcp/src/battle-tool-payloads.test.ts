import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battlePendingTransactionView,
  battlePresentedSnapshot,
  battleProcedureExecutionRef,
  combatantId,
  discoverBattleActs,
  sameBattleSubject,
  settleBattleRuntimeTransaction,
  snapshotBattle,
  type BattleInterruptProcedureChoice,
  type BattleRuntimeResolutionResult,
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

function readToolPayload(response: ReturnType<typeof handleToolCall>) {
  return JSON.parse(response.content[0]?.text ?? "null");
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

  test("delegates transaction admission and maps typed runtime issues", () => {
    const { root, session } = startedStatBlockBattle();
    const pendingAct = discoverBattleActs(session).find(
      (candidate) => candidate.initialHoles.length > 0,
    );
    if (pendingAct === undefined) {
      throw new Error("Expected a test battle act with initial holes.");
    }

    const noPendingInterrupt = handleToolCall(root, "fill_battle_hole", {
      subject: pendingAct.subject,
      fill: {
        kind: "interruptDecision",
        holeId: "battle:synthetic-interrupt",
        value: { kind: "decline", responderId: "goblin" },
      },
    });
    expect(readToolPayload(noPendingInterrupt)).toMatchObject({
      details: { code: "BATTLE_ACT_NOT_AVAILABLE" },
    });

    const pendingResult = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: pendingAct.subject,
        fills: [],
      },
      statBlockCatalog: root.statBlockCatalog,
    });
    if (pendingResult.tag !== "needsHoles") {
      throw new Error("Expected the test battle act to need hole fills.");
    }
    expect(
      root.sessionStore.storeBattleTransactionResult(session, pendingResult),
    ).toEqual(Either.right(undefined));

    const interruptAgainstOrdinary = handleToolCall(root, "fill_battle_hole", {
      subject: pendingAct.subject,
      fill: {
        kind: "interruptDecision",
        holeId: "battle:synthetic-interrupt",
        value: { kind: "decline", responderId: "goblin" },
      },
    });
    expect(readToolPayload(interruptAgainstOrdinary)).toMatchObject({
      details: { code: "BATTLE_FILLS_PENDING" },
    });

    const distinctAct = discoverBattleActs(session).find(
      (candidate) => !sameBattleSubject(candidate.subject, pendingAct.subject),
    );
    if (distinctAct === undefined) {
      throw new Error("Expected a distinct test battle act.");
    }
    const mismatchedFill = handleToolCall(root, "fill_battle_hole", {
      subject: distinctAct.subject,
      fill: {
        kind: "targetChoice",
        holeId: "battle:synthetic-mismatch",
        value: "goblin",
      },
    });
    expect(readToolPayload(mismatchedFill)).toMatchObject({
      details: { code: "BATTLE_FILL_SUBJECT_MISMATCH" },
    });

    const mismatchedResolve = handleToolCall(root, "resolve_battle_act", {
      subject: distinctAct.subject,
    });
    expect(readToolPayload(mismatchedResolve)).toMatchObject({
      details: { code: "BATTLE_FILLS_PENDING" },
    });
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
