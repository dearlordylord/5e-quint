import { armorClassBuild } from "../../character-sheet-runtime/src/test-support.test-support.ts";
import {
  battleId,
  combatantId as makeCombatantId,
  characterId as makeCharacterId,
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
  goblinId,
  movementFill,
  movementFeet,
  readyDeclarationFillForTest,
} from "../../battle-runtime/src/battle-runtime.test-support.ts";

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

function startCharacterBattle(input?: {
  readonly battleId?: string;
  readonly characterCombatantId?: string;
  readonly goblinCombatantId?: string;
}) {
  const root = createMcpPlaySessionRoot();
  const battleIdValue = input?.battleId ?? "battle:roster-boundary";
  const characterCombatantId =
    input?.characterCombatantId ?? "roster-character";
  const goblinCombatantId = input?.goblinCombatantId ?? "roster-goblin";
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
      battleId: battleIdValue,
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "characterSession",
          characterId,
          combatantId: characterCombatantId,
          initiative: 18,
          ammunitionStocks: [],
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: goblinCombatantId,
          initiative: 7,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    }),
  );
  expect(started).toMatchObject({
    envelope: { checkpoint: { battleId: battleIdValue } },
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

function rootAndCharacterRegistrySnapshot(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
) {
  return {
    session: root.sessionStore.snapshot(),
    characters: Array.from(root.sessionStore.characters.entries()),
  };
}

function pendingInterruptTransaction() {
  const { root } = startCharacterBattle({
    battleId: "battle:mcp-transaction-admission",
    characterCombatantId: "fighter",
    goblinCombatantId: "goblin",
  });
  const session = root.sessionStore.battleSession;
  if (session === null) {
    throw new Error("Expected the active Character Session battle.");
  }
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
  const movementHole = movement.initialHoles.find(
    (hole) => hole.kind === "movement",
  );
  if (movementHole?.kind !== "movement") {
    throw new Error("Expected the fixture's movement hole.");
  }
  const goblinAttackProcedure = session.context.statBlocks
    .get(goblinId)
    ?.procedures.find((procedure) => procedure.kind === "attack");
  if (goblinAttackProcedure === undefined) {
    throw new Error("Expected the Goblin's admitted attack procedure.");
  }
  const goblinAttackSubject = {
    tag: "action" as const,
    actorId: goblinId,
    action: "attack" as const,
    procedureRef: goblinAttackProcedure.procedureRef,
  };
  const pending = readToolPayload(
    handleToolCall(root, "fill_battle_hole", {
      subject: movement.subject,
      fill: movementFill(movementHole, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          {
            reactorId: goblinId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(goblinAttackSubject),
          },
        ],
      }),
    }),
  );
  if (pending.result?.tag !== "needsHoles") {
    throw new Error("Expected an interrupt decision after the movement fill.");
  }
  if (pending.envelope?.frontier.kind !== "interruptDecision") {
    throw new Error("Expected an interrupt decision frontier.");
  }
  return { root, subject: movement.subject };
}

function pendingReadyTriggerTransaction() {
  const { root } = startCharacterBattle({
    battleId: "battle:mcp-ready-trigger-admission",
    characterCombatantId: "fighter",
    goblinCombatantId: "goblin",
  });
  const initial = root.sessionStore.battleSession;
  if (initial === null) {
    throw new Error("Expected the active Character Session battle.");
  }
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
  const readied = readToolPayload(
    handleToolCall(root, "fill_battle_hole", {
      subject: readySubject,
      fill: readyDeclarationFillForTest(
        declarationHole,
        "the goblin moves",
        response,
      ),
    }),
  );
  if (readied.result?.tag !== "resolved") {
    throw new Error("Expected Ready declaration to resolve.");
  }
  const ended = readToolPayload(
    handleToolCall(root, "end_turn", { actorId: fighterId }),
  );
  if (ended.result?.tag !== "resolved") {
    throw new Error("Expected the Ready actor's turn to end.");
  }
  const session = root.sessionStore.battleSession;
  if (session === null) {
    throw new Error("Expected the active Ready battle.");
  }
  const reportSubject = {
    tag: "runtimeCommand" as const,
    actorId: goblinId,
    command: "reportReadyTrigger" as const,
    readiedActorId: fighterId,
  };
  const report = readToolPayload(
    handleToolCall(root, "resolve_battle_act", { subject: reportSubject }),
  );
  if (report.result?.tag !== "needsHoles") {
    throw new Error(
      "Expected a Ready trigger report to need an interrupt decision.",
    );
  }
  if (report.envelope?.frontier.kind !== "interruptDecision") {
    throw new Error("Expected a Ready trigger interrupt decision frontier.");
  }
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
        combatantId: "roster-character",
        characterId: missing.characterId,
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
      },
    });

    const available = startCharacterBattle();
    available.root.sessionStore.characters.set(available.available);
    expect(removeCharacter(available.root)).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId: available.characterId,
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
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
        characterId: foreign.characterId,
        expectedBattleId: "battle:roster-boundary",
        actualBattleId: "battle:another-owner",
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
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
        characterId,
        battleId: "battle:roster-boundary",
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
      },
    });
  });

  test("keeps the battle unchanged when Character Session commit fails", () => {
    const { root, characterId } = startCharacterBattle();
    const before = rootAndCharacterRegistrySnapshot(root);
    root.sessionStore.characters.setAll = () =>
      Either.left({ tag: "unknownCharacterSession", characterId });

    expect(removeCharacter(root)).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_COMMIT_INVALID",
        transition: {
          tag: "battleStateCharacterSessionRegistryConflict",
          registryIssue: { tag: "unknownCharacterSession", characterId },
          affectedCharacterIds: [characterId],
        },
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
        },
      },
    });
    expect(rootAndCharacterRegistrySnapshot(root)).toEqual(before);
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

  test("reports lifecycle operations that require an active Battle", () => {
    const setup = startInitialSetupBattle();
    const add = handleToolCall(setup.root, "battle_lifecycle", {
      operation: {
        kind: "addCombatant",
        combatant: {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "setup-add",
          initiative: 4,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
      },
    });
    expect(readToolPayload(add)).toMatchObject({
      details: {
        code: "BATTLE_LIFECYCLE_ACTIVE_BATTLE_REQUIRED",
        operation: "addCombatant",
      },
    });

    const remove = handleToolCall(setup.root, "battle_lifecycle", {
      operation: {
        kind: "removeCombatant",
        combatantId: "setup-goblin",
      },
    });
    expect(readToolPayload(remove)).toMatchObject({
      details: {
        code: "BATTLE_LIFECYCLE_ACTIVE_BATTLE_REQUIRED",
        operation: "removeCombatant",
      },
    });

    const active = startCharacterBattle();
    expect(
      readToolPayload(
        handleToolCall(active.root, "battle_lifecycle", {
          operation: {
            kind: "applyInitiativeSwap",
            sourceId: "roster-character",
            candidateId: "roster-goblin",
            candidateWitness: { tag: "willingAlly" },
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INITIAL_INITIATIVE_SETUP_ALREADY_FINALIZED",
        battleId: "battle:roster-boundary",
      },
    });
  });

  test("reports Character Session registry conflicts while starting a Battle", () => {
    const root = createMcpPlaySessionRoot();
    const characterId = makeCharacterId("character:roster-start-conflict");
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
    const before = rootAndCharacterRegistrySnapshot(root);
    root.sessionStore.characters.setAll = () =>
      Either.left({ tag: "unknownCharacterSession", characterId });

    expect(
      readToolPayload(
        handleToolCall(root, "start_battle", {
          battleId: "battle:roster-start-conflict",
          initiativeMode: "direct",
          companionAdmissions: [],
          initialCombatants: [
            {
              kind: "characterSession",
              characterId,
              combatantId: "start-conflict-character",
              initiative: 18,
              ammunitionStocks: [],
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_STATE_TRANSITION_INVALID",
        transition: {
          tag: "battleStateCharacterSessionRegistryConflict",
          registryIssue: { tag: "unknownCharacterSession", characterId },
          affectedCharacterIds: [characterId],
        },
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry the operation.",
        },
      },
    });
    expect(rootAndCharacterRegistrySnapshot(root)).toEqual(before);
  });

  test("reports Character Session registry conflicts while ending a Battle", () => {
    const { root, characterId } = startCharacterBattle();
    const before = rootAndCharacterRegistrySnapshot(root);
    root.sessionStore.characters.setAll = () =>
      Either.left({ tag: "unknownCharacterSession", characterId });

    expect(
      readToolPayload(handleToolCall(root, "end_battle", {})),
    ).toMatchObject({
      details: {
        code: "BATTLE_STATE_TRANSITION_INVALID",
        transition: {
          tag: "battleStateCharacterSessionRegistryConflict",
          registryIssue: { tag: "unknownCharacterSession", characterId },
          affectedCharacterIds: [characterId],
        },
        recovery: {
          tag: "battleAndCharacterSessionsUnchanged",
          guidance:
            "No Battle or Character Session was committed; correct the reported conflict and retry the operation.",
        },
      },
    });
    expect(rootAndCharacterRegistrySnapshot(root)).toEqual(before);
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
