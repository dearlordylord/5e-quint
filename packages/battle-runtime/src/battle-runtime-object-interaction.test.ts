import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, it } from "vitest";
import {
  battleObjectId,
  battleProcedureExecutionRefForTest,
  battleTablePositionId,
  discoverBattleActCandidates,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  interruptDecisionFill,
  readyDeclarationFillForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
} from "./battle-runtime.test-support.ts";
import type { BattleFill, BattleState } from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  battleStateWithGroundObjects,
  characterEffectiveLoadout,
  resolveBattleSubject,
} from "./index.ts";
import type { CombatantId } from "./identity.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import { objectInteractionRulingHole } from "./battle-reducer/object-interaction.ts";

// RAW trace:
// - .references/srd-5.2.1/playing-the-game.md#Your Turn, Interacting with
//   Things: one object for free during the move or action, the Utilize
//   action for a second object, and an action when the object needs one.
// - .references/srd-5.2.1/rules-glossary.md#Utilize [Action].
// - .references/srd-5.2.1/rules-glossary.md#Ready [Action].
// - ASSUMPTIONS.md A60: the free interaction belongs to the creature's own
//   turn; a readied interaction takes the readied Utilize action.

const longswordId = battleObjectId("main:weapon_longsword");

function interactSubject(actorId: CombatantId): BattleSubject {
  return { tag: "runtimeCommand", actorId, command: "interactWithObject" };
}

function pickupSubject(actorId: CombatantId): BattleSubject {
  return {
    tag: "runtimeCommand",
    actorId,
    command: "pickUpHeldWeapon",
    objectId: longswordId,
  };
}

function objectInteractionActs(state: BattleState) {
  return discoverBattleActCandidates(state).filter(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      (act.subject.command === "interactWithObject" ||
        act.subject.command === "pickUpHeldWeapon"),
  );
}

function rulingFill(
  state: BattleState,
  subject: BattleSubject,
  requiresUtilize: boolean,
): BattleFill {
  const act = objectInteractionActs(state).find(
    (candidate) =>
      JSON.stringify(candidate.subject) === JSON.stringify(subject),
  );
  const [hole] = act?.initialHoles ?? [];
  if (hole?.kind !== "objectInteractionRuling") {
    throw new Error("Expected an object interaction ruling hole.");
  }
  return {
    kind: "objectInteractionRuling",
    holeId: hole.holeId,
    value: { requiresUtilize },
  };
}

function interact(
  state: BattleState,
  subject: BattleSubject,
  requiresUtilize: boolean,
) {
  return resolveBattleSubject({
    state,
    subject,
    fills: [rulingFill(state, subject, requiresUtilize)],
  });
}

function fighterWithFallenLongsword(): BattleState {
  const placed = battleStateWithGroundObjects(fighterVsGoblinBattle(), [
    {
      actorId: fighterId,
      objectId: longswordId,
      positionId: battleTablePositionId("fallen-longsword"),
      source: {
        kind: "spell",
        sourceCombatantId: goblinId,
        sourceProcedureRef: battleProcedureExecutionRefForTest("drop"),
      },
    },
  ]);
  if (placed.tag !== "applied") throw new Error(placed.message);
  return placed.state;
}

function endTurn(state: BattleState, actorId: CombatantId): BattleState {
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
      fills: [],
    }),
  ).state;
}

describe("object interaction", () => {
  it("offers an interaction on the creature's own turn and asks the table for its ruling", () => {
    const state = fighterVsGoblinBattle();
    const acts = objectInteractionActs(state);
    expect(acts.map((act) => act.subject)).toEqual([
      interactSubject(fighterId),
    ]);
    expect(acts[0]?.initialHoles).toEqual([
      expect.objectContaining({
        kind: "objectInteractionRuling",
        actorId: fighterId,
        objectInteraction: "available",
      }),
    ]);
    expect(
      resolveBattleSubject({
        state,
        subject: interactSubject(fighterId),
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      frontier: { holes: [{ kind: "objectInteractionRuling" }] },
    });
  });

  it("makes the first interaction free and charges the Utilize action for the second", () => {
    const start = fighterVsGoblinBattle();
    const first = requireResolved(
      interact(start, interactSubject(fighterId), false),
    ).state;
    expect(first.currentTurnResources.objectInteraction).toBe("spent");
    expect(first.currentTurnResources.actionResources).toEqual(
      start.currentTurnResources.actionResources,
    );

    const second = requireResolved(
      interact(first, interactSubject(fighterId), false),
    ).state;
    expect(second.currentTurnResources.actionTakenThisTurn).toBe(true);
    expect(
      second.currentTurnResources.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
    expect(objectInteractionActs(second)).toEqual([]);
  });

  it("charges the Utilize action when the table rules the object needs an action", () => {
    const start = fighterVsGoblinBattle();
    const used = requireResolved(
      interact(start, interactSubject(fighterId), true),
    ).state;
    expect(used.currentTurnResources.objectInteraction).toBe("available");
    expect(used.currentTurnResources.actionTakenThisTurn).toBe(true);

    expect(interact(used, interactSubject(fighterId), true)).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(
      requireResolved(interact(used, interactSubject(fighterId), false)).state
        .currentTurnResources.objectInteraction,
    ).toBe("spent");
  });

  it("refuses an interaction off the creature's turn and gives it back on its next turn", () => {
    const start = fighterVsGoblinBattle();
    const spent = requireResolved(
      interact(start, interactSubject(fighterId), false),
    ).state;
    const goblinTurn = endTurn(spent, fighterId);
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: interactSubject(fighterId),
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "wrongActor" });

    const fighterTurn = endTurn(goblinTurn, goblinId);
    expect(fighterTurn.currentTurnResources.objectInteraction).toBe(
      "available",
    );
    expect(
      objectInteractionActs(fighterTurn).map((act) => act.subject),
    ).toEqual([interactSubject(fighterId)]);
  });

  it("releases a readied interaction with the Utilize action Ready held", () => {
    const start = fighterVsGoblinBattle();
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(start, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected Ready declaration hole.");
    }
    const interactResponse = declarationHole.responseChoices.find(
      (response) =>
        response.kind === "action" &&
        response.subject.tag === "runtimeCommand" &&
        response.subject.command === "interactWithObject",
    );
    if (interactResponse?.kind !== "action") {
      throw new Error("Expected an offered object interaction response.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state: start,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the goblin reaches the lever",
            interactResponse,
          ),
        ],
      }),
    ).state;
    const goblinTurn = endTurn(readied, fighterId);
    const reported = resolveBattleSubject({
      state: goblinTurn,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected a reported Ready trigger interrupt.");
    }
    const asked = resolveBattleInterrupt({
      state: reported.state,
      fill: interruptDecisionFill(requireHole(reported, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: { kind: "releaseReadiedAction", fills: [] },
      }),
    });
    // Off its turn the Fighter has no free interaction, only the readied
    // Utilize action.
    expect(asked).toMatchObject({
      tag: "needsHoles",
      frontier: {
        holes: [
          { kind: "objectInteractionRuling", objectInteraction: "spent" },
        ],
      },
    });
    const released = resolveBattleInterrupt({
      state: reported.state,
      fill: interruptDecisionFill(requireHole(reported, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAction",
          fills: [
            {
              kind: "objectInteractionRuling",
              holeId: objectInteractionRulingHole(reported.state, fighterId)
                .holeId,
              value: { requiresUtilize: false },
            },
          ],
        },
      }),
    });
    if (released.tag !== "resolved") {
      throw new Error("Expected the readied interaction to resolve.");
    }
    expect(released.state.readiedResponses.has(fighterId)).toBe(false);
    expect(released.state.combatants.get(fighterId)).toMatchObject({
      reactionAvailable: false,
    });
    // The Goblin's turn resources are untouched by the Fighter's release.
    expect(released.state.currentTurnResources).toEqual(
      goblinTurn.currentTurnResources,
    );
  });

  it("refuses a fill for another hole", () => {
    const state = fighterVsGoblinBattle();
    expect(
      resolveBattleSubject({
        state,
        subject: interactSubject(fighterId),
        fills: [
          {
            kind: "objectInteractionRuling",
            holeId: holeId("battle:object-interaction:ruling:another-hole"),
            value: { requiresUtilize: false },
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });
});

describe("held-weapon pickup", () => {
  it("offers a fallen selected weapon and puts it back in hand for the free interaction", () => {
    const fallen = fighterWithFallenLongsword();
    const fighter = fallen.combatants.get(fighterId);
    if (fighter === undefined || !isCharacterBattleCreatureState(fighter)) {
      throw new Error("Expected Fighter.");
    }
    expect(characterEffectiveLoadout(fallen, fighter).weapon).toBeUndefined();
    expect(objectInteractionActs(fallen).map((act) => act.subject)).toEqual([
      interactSubject(fighterId),
      pickupSubject(fighterId),
    ]);

    const pickedUp = requireResolved(
      interact(fallen, pickupSubject(fighterId), false),
    ).state;
    expect(pickedUp.groundObjects.has(fighterId)).toBe(false);
    expect(pickedUp.currentTurnResources.objectInteraction).toBe("spent");
    const armed = pickedUp.combatants.get(fighterId);
    if (armed === undefined || !isCharacterBattleCreatureState(armed)) {
      throw new Error("Expected Fighter.");
    }
    expect(characterEffectiveLoadout(pickedUp, armed).weapon?.itemId).toBe(
      longswordId,
    );
    expect(objectInteractionActs(pickedUp).map((act) => act.subject)).toEqual([
      interactSubject(fighterId),
    ]);
  });

  it("charges the Utilize action for a pickup after the free interaction", () => {
    const fallen = fighterWithFallenLongsword();
    const spent = requireResolved(
      interact(fallen, interactSubject(fighterId), false),
    ).state;
    const pickedUp = requireResolved(
      interact(spent, pickupSubject(fighterId), false),
    ).state;
    expect(pickedUp.currentTurnResources.actionTakenThisTurn).toBe(true);
    expect(pickedUp.groundObjects.has(fighterId)).toBe(false);
  });

  it("refuses a pickup of an object that isn't on the ground", () => {
    const state = fighterVsGoblinBattle();
    expect(
      resolveBattleSubject({
        state,
        subject: pickupSubject(fighterId),
        fills: [rulingFill(state, interactSubject(fighterId), false)],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });
});
