import { armorClassBuild } from "../../character-sheet-runtime/src/test-support.test-support.ts";
import {
  battleId,
  combatantId as makeCombatantId,
  characterId as makeCharacterId,
  endTurn,
  resolveBattleSubject,
  settleBattleRuntimeTransaction,
} from "@dnd/battle-runtime";
import { Hp } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  createMcpPlaySessionRoot,
  handleToolCall as handleWireToolCall,
} from "./server.ts";
import { availableCharacterSession } from "./session-store.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";
import { battleMechanicsEnvelopeForSession } from "./battle-tool-payloads.ts";
import { battleSubjectIsAvailableWithoutPendingFills } from "./battle-tool-frontier.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  fighterId,
  findAct,
  goblinAttackSubject,
  goblinId,
  movementFill,
  movementFeet,
  readyDeclarationFillForTest,
  skeletonCreatureInit,
  startBattleSessionRight,
  statBlockCreatureInit,
  characterSeed,
} from "../../battle-runtime/src/battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "../../battle-runtime/src/battle-runtime-session.test-support.ts";

function handleToolCall(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  name: string,
  args: unknown,
) {
  return handleWireToolCall(root, name, battleToolWireArgs(name, args));
}

function readToolPayload(response: ReturnType<typeof handleToolCall>) {
  const text = response.content[0]?.text;
  if (text === undefined) throw new Error("Expected a tool response payload.");
  return JSON.parse(text);
}

function startCharacterBattle() {
  const root = createMcpPlaySessionRoot();
  const characterId = makeCharacterId("character:roster-boundary");
  const available = availableCharacterSession({
    characterId,
    build: armorClassBuild({
      startingClass: "class_fighter",
      armor: "armor_chain_mail",
      shield: true,
      weapon: "weapon_longsword",
    }),
    currentHp: Hp(10),
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    companion: { tag: "none" },
    unitLibrary: root.unitLibrary,
  });
  if (Either.isLeft(available)) {
    throw new Error(available.left.message);
  }
  root.sessionStore.characters.set(available.right);
  const started = readToolPayload(
    handleToolCall(root, "start_battle", {
      battleId: "battle:roster-boundary",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "characterSession",
          characterId,
          combatantId: "roster-character",
          initiative: 18,
          ammunitionStocks: [],
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "roster-goblin",
          initiative: 7,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    }),
  );
  expect(started).toMatchObject({
    envelope: { checkpoint: { battleId: "battle:roster-boundary" } },
  });
  return { root, characterId, available: available.right };
}

function startInitialSetupBattle() {
  const root = createMcpPlaySessionRoot();
  const started = readToolPayload(
    handleToolCall(root, "start_battle", {
      battleId: "battle:roster-boundary-setup",
      initiativeMode: "initialSetup",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "setup-goblin",
          initiative: 10,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    }),
  );
  expect(started).toMatchObject({
    session: { battleState: { tag: "initialInitiativeSetup" } },
  });
  if (root.sessionStore.battleState.tag !== "initialInitiativeSetup") {
    throw new Error("Expected the battle to remain in initial setup.");
  }
  return { root, setup: root.sessionStore.battleState.setup };
}

function removeCharacter(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  combatantId = "roster-character",
) {
  return readToolPayload(
    handleToolCall(root, "battle_lifecycle", {
      operation: { kind: "removeCombatant", combatantId },
    }),
  );
}

function pendingInterruptTransaction() {
  const root = createMcpPlaySessionRoot();
  const session = startBattleSessionRight({
    battleId: battleId("battle:mcp-transaction-admission"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const movement = findAct(session, {
    tag: "runtimeCommand",
    actorId: fighterId,
    command: "move",
  });
  if (
    movement.subject.tag !== "runtimeCommand" ||
    movement.subject.command !== "move"
  ) {
    throw new Error("Expected the fixture's Move subject.");
  }
  const initial = settleBattleRuntimeTransaction({
    session,
    transaction: null,
    operation: {
      kind: "ordinarySubject",
      subject: movement.subject,
      fills: [],
    },
  });
  if (initial.tag !== "needsHoles") {
    throw new Error("Expected the fixture's Move to need a movement fill.");
  }
  const movementHole =
    initial.resolution.envelope.frontier.kind === "holes"
      ? initial.resolution.envelope.frontier.holes.find(
          (hole) => hole.kind === "movement",
        )
      : undefined;
  if (movementHole?.kind !== "movement") {
    throw new Error("Expected the fixture's movement hole.");
  }
  const pending = settleBattleRuntimeTransaction({
    session: initial.resolution.session,
    transaction: initial.transaction,
    operation: {
      kind: "ordinarySubject",
      subject: movement.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: goblinId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(
                goblinAttackSubject(session.state, "Scimitar"),
              ),
            },
          ],
        }),
      ],
    },
  });
  if (
    pending.tag !== "needsHoles" ||
    pending.frontier.kind !== "interruptDecision"
  ) {
    throw new Error("Expected an interrupt decision after the movement fill.");
  }
  expect(root.sessionStore.storeActiveBattle(session)).toEqual(
    Either.right(undefined),
  );
  expect(
    root.sessionStore.storeBattleTransactionResult(session, pending),
  ).toEqual(Either.right(undefined));
  return { root, subject: movement.subject };
}

function pendingReadyTriggerTransaction() {
  const root = createMcpPlaySessionRoot();
  const initial = startBattleSessionRight({
    battleId: battleId("battle:mcp-ready-trigger-admission"),
    combatants: [
      characterSeed({ initiative: 40 }),
      statBlockCreatureInit({ initiative: 30 }),
      skeletonCreatureInit({ initiative: 20 }),
    ],
  });
  const readySubject = {
    tag: "action" as const,
    actorId: fighterId,
    action: "ready" as const,
  };
  const readyAct = findAct(initial, readySubject);
  const declarationHole = readyAct.initialHoles.find(
    (hole) => hole.kind === "readyDeclaration",
  );
  if (declarationHole?.kind !== "readyDeclaration") {
    throw new Error("Expected the Ready declaration hole.");
  }
  const response = declarationHole.responseChoices.find(
    (candidate) => candidate.kind === "movement",
  );
  if (response === undefined) {
    throw new Error("Expected a Ready movement response.");
  }
  const readied = resolveBattleSubject({
    state: initial.state,
    subject: readySubject,
    fills: [
      readyDeclarationFillForTest(
        declarationHole,
        "the goblin moves",
        response,
      ),
    ],
  });
  if (readied.tag !== "resolved") {
    throw new Error("Expected Ready declaration to resolve.");
  }
  const ended = endTurn({ state: readied.state, actorId: fighterId });
  if (ended.tag !== "resolved") {
    throw new Error("Expected the Ready actor's turn to end.");
  }
  const session = battleRuntimeSessionForTest({
    state: ended.state,
    context: initial.context,
  });
  const reportSubject = {
    tag: "runtimeCommand" as const,
    actorId: goblinId,
    command: "reportReadyTrigger" as const,
    readiedActorId: fighterId,
  };
  const report = settleBattleRuntimeTransaction({
    session,
    transaction: null,
    operation: {
      kind: "ordinarySubject",
      subject: reportSubject,
      fills: [],
    },
  });
  if (report.tag !== "needsHoles") {
    throw new Error(
      "Expected a Ready trigger report to need an interrupt decision.",
    );
  }
  if (report.frontier.kind !== "interruptDecision") {
    throw new Error("Expected a Ready trigger interrupt decision frontier.");
  }
  expect(root.sessionStore.storeActiveBattle(session)).toEqual(
    Either.right(undefined),
  );
  expect(
    root.sessionStore.storeBattleTransactionResult(session, report),
  ).toEqual(Either.right(undefined));
  return { root, subject: reportSubject };
}

describe("MCP Battle roster lifecycle boundaries", () => {
  test("reports missing, available, and foreign Character Session ownership", () => {
    const missing = startCharacterBattle();
    const originalGet = missing.root.sessionStore.characters.get;
    missing.root.sessionStore.characters.get = (requestedId) =>
      requestedId === missing.characterId
        ? undefined
        : originalGet(requestedId);
    expect(removeCharacter(missing.root)).toMatchObject({
      details: {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        recovery: { tag: "battleAndCharacterSessionsUnchanged" },
      },
    });

    const available = startCharacterBattle();
    available.root.sessionStore.characters.set(available.available);
    expect(removeCharacter(available.root)).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        recovery: { tag: "battleAndCharacterSessionsUnchanged" },
      },
    });

    const foreign = startCharacterBattle();
    const inBattle = foreign.root.sessionStore.characters.get(
      foreign.characterId,
    );
    if (inBattle?.tag !== "inBattle") {
      throw new Error("Expected the Character Session to be in Battle.");
    }
    foreign.root.sessionStore.characters.set({
      ...inBattle,
      battleId: battleId("battle:another-owner"),
    });
    expect(removeCharacter(foreign.root)).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_BATTLE_OWNERSHIP_CONFLICT",
        recovery: { tag: "battleAndCharacterSessionsUnchanged" },
      },
    });
  });

  test("rejects a Character Session that is already assigned to the battle", () => {
    const { root, characterId } = startCharacterBattle();
    expect(
      readToolPayload(
        handleToolCall(root, "battle_lifecycle", {
          operation: {
            kind: "addCombatant",
            combatant: {
              kind: "characterSession",
              characterId,
              combatantId: "roster-character-again",
              initiative: 6,
              ammunitionStocks: [],
            },
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "CHARACTER_ALREADY_IN_BATTLE",
        recovery: { tag: "battleAndCharacterSessionsUnchanged" },
      },
    });
  });

  test("keeps the battle unchanged when Character Session commit fails", () => {
    const { root, characterId } = startCharacterBattle();
    const before = root.sessionStore.snapshot();
    root.sessionStore.characters.setAll = () =>
      Either.left({ tag: "unknownCharacterSession", characterId });

    expect(removeCharacter(root)).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_COMMIT_INVALID",
        recovery: { tag: "battleAndCharacterSessionsUnchanged" },
      },
    });
    expect(root.sessionStore.snapshot()).toEqual(before);
  });

  test("returns typed errors when a session-store transition targets the wrong phase", () => {
    const none = createMcpPlaySessionRoot();
    expect(
      none.sessionStore.planActiveBattleRosterTransition({
        kind: "remove",
        combatantId: makeCombatantId("none-combatant"),
      }),
    ).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "none",
        to: "activeBattle",
      }),
    );
    expect(
      none.sessionStore.applyInitialInitiativeSwap({
        sourceId: makeCombatantId("none-source"),
        candidateId: makeCombatantId("none-candidate"),
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "none",
        to: "initialInitiativeSetup",
      }),
    );
    expect(none.sessionStore.finalizeInitialInitiativeSetup()).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "none",
        to: "activeBattle",
      }),
    );

    const setup = startInitialSetupBattle();
    const active = startCharacterBattle();
    const activeSession = active.root.sessionStore.battleSession;
    if (activeSession === null) {
      throw new Error("Expected the active phase fixture's session.");
    }
    expect(setup.root.sessionStore.storeActiveBattle(activeSession)).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "initialInitiativeSetup",
        to: "activeBattle",
      }),
    );
    expect(
      setup.root.sessionStore.storeInitialInitiativeSetup(setup.setup),
    ).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "initialInitiativeSetup",
        to: "initialInitiativeSetup",
      }),
    );
    expect(
      active.root.sessionStore.storeInitialInitiativeSetup(setup.setup),
    ).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "activeBattle",
        to: "initialInitiativeSetup",
      }),
    );
    expect(
      active.root.sessionStore.applyInitialInitiativeSwap({
        sourceId: makeCombatantId("active-source"),
        candidateId: makeCombatantId("active-candidate"),
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "activeBattle",
        to: "initialInitiativeSetup",
      }),
    );
    expect(active.root.sessionStore.finalizeInitialInitiativeSetup()).toEqual(
      Either.left({
        tag: "invalidBattleStateTransition",
        from: "activeBattle",
        to: "activeBattle",
      }),
    );
  });

  test("maps an ordinary fill against an interrupt frontier to a pending-fill error", () => {
    const { root, subject } = pendingInterruptTransaction();
    const session = root.sessionStore.battleSession;
    if (session === null) {
      throw new Error("Expected the pending interrupt session.");
    }
    const frontier = battleMechanicsEnvelopeForSession(root, session).frontier;
    expect(frontier.kind).toBe("interruptDecision");
    expect(battleSubjectIsAvailableWithoutPendingFills(frontier, subject)).toBe(
      false,
    );

    expect(
      readToolPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject,
          fill: {
            kind: "targetChoice",
            holeId: "synthetic-admission-retry",
            value: "goblin",
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject: subject,
      },
    });
  });

  test("maps a repeated Ready trigger report to a pending-fill error", () => {
    const { root, subject } = pendingReadyTriggerTransaction();

    expect(
      readToolPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject,
          fill: {
            kind: "targetChoice",
            holeId: "synthetic-ready-retry",
            value: "goblin",
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject: subject,
      },
    });
  });
});
