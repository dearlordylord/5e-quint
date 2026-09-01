import {
  battlePendingTransactionView,
  combatantId,
  discoverBattleActs,
  resolveBattleRuntimeSubject,
  sameBattleSubject,
  settleBattleRuntimeTransaction,
} from "@dnd/battle-runtime";
import { Result, Option, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleResolutionResultPayload,
  battleResolutionPayload,
  battleMechanicsEnvelopeForSession,
  battleSessionPayload,
  battlePresentationIssueContent,
  noStoredBattleContent,
  pendingBattleFillsContent,
  unknownStatBlockContent,
} from "./battle-tool-payloads.ts";
import { battleSubjectIsAvailableWithoutPendingFills } from "./battle-tool-frontier.ts";
import { BattleResolutionOutputSchema } from "./battle-tool-output.ts";
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
      _tag: "Success",
      success: {
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
      _tag: "Success",
      success: {
        envelope: {
          checkpoint: { battleId: "battle:payload-boundaries" },
        },
      },
    });
    const payload = battleSessionPayload(root, session);
    if (Result.isFailure(payload))
      throw new Error("Expected an active payload.");
    if (payload.success.envelope === null) {
      throw new Error("Expected an active battle envelope.");
    }
    expect(payload.success.envelope.checkpoint).not.toHaveProperty(
      "pendingInterrupt",
    );
  });

  test("checks subject availability across ordinary and holes frontiers", () => {
    const { root, session } = startedStatBlockBattle();
    const actsFrontier = battleMechanicsEnvelopeForSession(
      root,
      session,
    ).frontier;
    if (actsFrontier.kind !== "acts") {
      throw new Error("Expected an acts frontier before a transaction starts.");
    }
    const availableSubject = actsFrontier.acts[0]?.subject;
    if (availableSubject === undefined) {
      throw new Error("Expected an available battle subject.");
    }
    expect(
      battleSubjectIsAvailableWithoutPendingFills(
        actsFrontier,
        availableSubject,
      ),
    ).toBe(true);
    expect(
      battleSubjectIsAvailableWithoutPendingFills(actsFrontier, {
        tag: "runtimeCommand",
        actorId: combatantId("unavailable-subject"),
        command: "endTurn",
      }),
    ).toBe(false);

    const pendingAct = actsFrontier.acts.find(
      (act) => act.initialHoles.length > 0,
    );
    if (pendingAct === undefined) {
      throw new Error("Expected an act with holes.");
    }
    expect(
      readToolPayload(
        handleToolCall(root, "resolve_battle_act", {
          subject: pendingAct.subject,
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_ACT_REQUIRES_HOLES",
        subject: pendingAct.subject,
      },
    });
    const pending = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: pendingAct.subject,
        fills: [],
      },
      statBlockCatalog: root.battleStatBlockExecutionCatalog,
    });
    if (pending.tag !== "needsHoles") {
      throw new Error("Expected the selected act to need holes.");
    }
    expect(
      root.sessionStore.storeBattleTransactionResult(session, pending),
    ).toEqual(Result.succeed(undefined));
    const holesFrontier = battleMechanicsEnvelopeForSession(
      root,
      pending.resolution.session,
    ).frontier;
    if (holesFrontier.kind !== "holes") {
      throw new Error(
        "Expected a holes frontier after starting a transaction.",
      );
    }
    expect(
      battleSubjectIsAvailableWithoutPendingFills(
        holesFrontier,
        holesFrontier.subject,
      ),
    ).toBe(true);
    expect(
      battleSubjectIsAvailableWithoutPendingFills(holesFrontier, {
        tag: "runtimeCommand",
        actorId: combatantId("different-holes-subject"),
        command: "endTurn",
      }),
    ).toBe(false);
  });

  test("returns typed snapshot-presentation issues as tool errors", () => {
    const issue = {
      tag: "battleSnapshotPresentationIssue",
      reason: "missingStatBlockPresentation",
      combatantId: combatantId("synthetic-missing-presentation"),
    } as const;
    const content = battlePresentationIssueContent([issue]);
    expect(content).toMatchObject({
      isError: true,
      content: [
        {
          text: expect.stringContaining(
            '"code": "BATTLE_PRESENTATION_INCOMPLETE"',
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
    const endTurnAct = discoverBattleActs(session).find(
      ({ subject }) =>
        subject.tag === "runtimeCommand" && subject.command === "endTurn",
    );
    if (endTurnAct === undefined) {
      throw new Error("Expected the test battle's End Turn act.");
    }
    const settled = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: endTurnAct.subject,
        fills: [],
      },
    });
    if (settled.tag !== "settled") {
      throw new Error("Expected End Turn to settle without hole fills.");
    }
    const result = { ...settled.resolution, droppedObjects: [] };

    expect(battleResolutionResultPayload(result)).toHaveProperty(
      "droppedObjects",
      [],
    );
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
      statBlockCatalog: root.battleStatBlockExecutionCatalog,
    });
    if (result.tag !== "needsHoles") {
      throw new Error("Expected the test battle act to need hole fills.");
    }
    const transactionView = battlePendingTransactionView(result.transaction);
    expect(Option.isSome(transactionView)).toBe(true);
    if (Option.isSome(transactionView)) {
      expect(Object.isFrozen(transactionView.value)).toBe(true);
      expect(Object.isFrozen(transactionView.value.subject)).toBe(true);
      expect(Object.isFrozen(transactionView.value.fills)).toBe(true);
      expect(Object.isFrozen(transactionView.value.holes)).toBe(true);
      expect(Object.isFrozen(transactionView.value.holes[0])).toBe(true);
    }
    const competingSession = startedStatBlockBattle().session;
    expect(root.sessionStore.storeActiveBattle(competingSession)).toEqual(
      Result.succeed(undefined),
    );
    const staleStoreSnapshot = root.sessionStore.snapshot();
    expect(
      root.sessionStore.storeBattleTransactionResult(session, result),
    ).toEqual(
      Result.fail({
        tag: "battleStateSessionChanged",
        battleId: session.state.battleId,
      }),
    );
    expect(root.sessionStore.snapshot()).toEqual(staleStoreSnapshot);
    expect(
      root.sessionStore.storeActiveBattle(result.resolution.session),
    ).toEqual(Result.succeed(undefined));
    expect(
      root.sessionStore.storeBattleTransactionResult(
        result.resolution.session,
        result,
      ),
    ).toEqual(Result.succeed(undefined));
    expect(root.sessionStore.battleSession).toBe(result.resolution.session);
    expect(root.sessionStore.getPendingBattleTransaction()).toBe(
      result.transaction,
    );
  });

  test("accepts a rejected fill with a correlated retry session and envelope", () => {
    const { root, session } = startedStatBlockBattle();
    const actorId = session.state.initiative.stillToAct[0]?.creature;
    if (actorId === undefined) {
      throw new Error("Expected a current battle actor.");
    }
    const targetAct = discoverBattleActs(session).find(({ initialHoles }) =>
      initialHoles.some((hole) => hole.kind === "targetChoice"),
    );
    const targetHole = targetAct?.initialHoles.find(
      (hole) => hole.kind === "targetChoice",
    );
    const targetId = [...session.state.combatants.keys()].find(
      (combatant) => combatant !== actorId,
    );
    if (targetHole === undefined || targetId === undefined) {
      throw new Error("Expected a target-choice battle act.");
    }
    const invalid = resolveBattleRuntimeSubject({
      session,
      subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
      fills: [
        {
          kind: "targetChoice",
          holeId: targetHole.holeId,
          value: targetId,
        },
      ],
    });
    expect(invalid.tag).toBe("invalid");
    if (invalid.tag !== "invalid") {
      throw new Error("Expected the End Turn fill to be rejected.");
    }
    expect(invalid.session).toBe(session);

    const payload = battleResolutionPayload(root, invalid);
    expect(Result.isSuccess(payload)).toBe(true);
    if (Result.isFailure(payload)) {
      throw new Error("Expected the rejected fill to have a payload.");
    }
    expect(
      Schema.decodeUnknownResult(BattleResolutionOutputSchema)(payload.success),
    ).toSatisfy((decoded) => Result.isSuccess(decoded));
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
      details: { code: "BATTLE_FILL_HOLE_MISMATCH" },
    });

    const pendingResult = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: pendingAct.subject,
        fills: [],
      },
      statBlockCatalog: root.battleStatBlockExecutionCatalog,
    });
    if (pendingResult.tag !== "needsHoles") {
      throw new Error("Expected the test battle act to need hole fills.");
    }
    expect(
      root.sessionStore.storeBattleTransactionResult(session, pendingResult),
    ).toEqual(Result.succeed(undefined));

    const interruptAgainstOrdinary = handleToolCall(root, "fill_battle_hole", {
      subject: pendingAct.subject,
      fill: {
        kind: "interruptDecision",
        holeId: "battle:synthetic-interrupt",
        value: { kind: "decline", responderId: "goblin" },
      },
    });
    expect(readToolPayload(interruptAgainstOrdinary)).toMatchObject({
      details: {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject: pendingAct.subject,
      },
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
      details: {
        code: "BATTLE_FILL_SUBJECT_MISMATCH",
        pendingSubject: pendingAct.subject,
        requestedSubject: distinctAct.subject,
      },
    });

    const mismatchedResolve = handleToolCall(root, "resolve_battle_act", {
      subject: distinctAct.subject,
    });
    expect(readToolPayload(mismatchedResolve)).toMatchObject({
      details: {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject: pendingAct.subject,
      },
    });
  });

  test("maps active roster transition outcomes through the lifecycle boundary", () => {
    const { root } = startedStatBlockBattle();

    expect(
      readToolPayload(
        handleToolCall(root, "battle_lifecycle", {
          operation: {
            kind: "removeCombatant",
            combatantId: "missing-combatant",
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_COMBATANT_NOT_FOUND",
        combatantId: "missing-combatant",
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
      },
    });

    const duplicateCombatantPayload = readToolPayload(
      handleToolCall(root, "battle_lifecycle", {
        operation: {
          kind: "addCombatant",
          combatant: {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_skeleton",
            combatantId: "goblin",
            initiative: 4,
            admissionSource: { kind: "encounterParticipant" },
          },
        },
      }),
    );
    expect(duplicateCombatantPayload).toEqual({
      error: "Battle combatant admission failed.",
      details: {
        code: "BATTLE_COMBATANT_ADMISSION_FAILED",
        combatantId: "goblin",
        ownerPath: ["operation", "combatant"],
        issues: [
          {
            kind: "battleInitialization",
            code: "BATTLE_INITIALIZATION_INVALID",
            ownerPath: ["operation", "combatant"],
            issueTag: "battleStateInitIssue",
            reason: "duplicateCombatantId",
            combatantId: "goblin",
            message: "Duplicate combatant id: goblin",
          },
        ],
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
      },
    });

    expect(
      readToolPayload(
        handleToolCall(root, "battle_lifecycle", {
          operation: { kind: "removeCombatant", combatantId: "goblin" },
        }),
      ),
    ).toMatchObject({
      result: {
        tag: "combatantRemoved",
        combatantId: "goblin",
        removedCombatantIds: ["goblin"],
      },
    });

    expect(
      readToolPayload(
        handleToolCall(root, "battle_lifecycle", {
          operation: { kind: "removeCombatant", combatantId: "skeleton" },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_COMBATANT_REMOVAL_FAILED",
        combatantId: "skeleton",
        message: "Cannot remove every combatant from a battle.",
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
      },
    });
  });

  test("rejects roster changes while a battle transaction owns pending fills", () => {
    const { root, session } = startedStatBlockBattle();
    const pendingAct = discoverBattleActs(session).find(
      (candidate) => candidate.initialHoles.length > 0,
    );
    if (pendingAct === undefined) {
      throw new Error("Expected a battle act with a pending fill frontier.");
    }
    const pending = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: pendingAct.subject,
        fills: [],
      },
      statBlockCatalog: root.battleStatBlockExecutionCatalog,
    });
    expect(pending.tag).toBe("needsHoles");
    expect(
      root.sessionStore.storeBattleTransactionResult(session, pending),
    ).toEqual(Result.succeed(undefined));

    expect(
      readToolPayload(
        handleToolCall(root, "battle_lifecycle", {
          operation: {
            kind: "addCombatant",
            combatant: {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_wolf",
              combatantId: "pending-roster-add",
              initiative: 4,
              admissionSource: { kind: "encounterParticipant" },
            },
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject: pendingAct.subject,
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
      },
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
