// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { Schema } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import cloudkillInput from "../../surface/content/cloudkill.json";
import {
  battleLineDirectionId,
  battleTablePositionId,
  type CombatantId,
} from "./identity.ts";
import type {
  BattleCloudkillMovementHole,
  BattleState,
} from "./battle-state-execution.ts";
import {
  BattleFillSchema,
  BattleHoleSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  cloudkillAreaId,
  cloudkillUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  cloudkillAreaFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  endTurn,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { concentrationSavingThrowFill } from "./battle-runtime.test-support.ts";
import {
  readyTargetRayOfFrost,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";

const cloudkillDirectionId = battleLineDirectionId("away-from-source");
const cloudkillDestinationId = battleTablePositionId("cloudkill-next-center");

function cloudkillMovementFill(
  hole: BattleCloudkillMovementHole,
  affectedCombatantIds: readonly CombatantId[],
) {
  return {
    kind: "cloudkillMovement" as const,
    holeId: hole.holeId,
    value: {
      directionId: cloudkillDirectionId,
      destinationId: cloudkillDestinationId,
      affectedCombatantIds,
    },
  };
}

function castCloudkill(
  input: { readonly targetCanReadyRayOfFrost?: true } = {},
) {
  const spell = decodeUnitRecordSync(cloudkillInput);
  if (spell.kind !== "spell") {
    throw new Error("Expected the Cloudkill fixture to decode as a Spell.");
  }
  const session = input.targetCanReadyRayOfFrost
    ? spellBattleWithTargetRayOfFrost({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 5, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
      })
    : spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 5, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
      });
  const act = spellAct({
    session,
    spellId: cloudkillUnitId,
    slotLevel: 5,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [cloudkillAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Cloudkill to resolve: ${JSON.stringify(cast)}`);
  }
  return { session, state: cast.state };
}

function sourceTurnMovementBoundary() {
  const cast = castCloudkill();
  const targetTurn = endTurn({
    state: cast.state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected the target turn to start.");
  }
  const movementFrontier = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (movementFrontier.tag !== "needsHoles") {
    throw new Error("Expected the Cloudkill movement frontier.");
  }
  return {
    cast,
    boundaryState: targetTurn.state,
    movementHole: requireHole(movementFrontier.holes, "cloudkillMovement"),
  };
}

function activeCloudkill(state: BattleState) {
  const effect = [...state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find((candidate) => candidate.kind === "cloudkillAreaHazard");
  if (effect?.kind !== "cloudkillAreaHazard") {
    throw new Error("Expected an active Cloudkill effect.");
  }
  return effect;
}

describe("Cloudkill source-turn movement", () => {
  test("opens the fixed-distance movement frontier only at the source's start-turn boundary", () => {
    const cast = castCloudkill().state;

    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const sourceTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(sourceTurn).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "cloudkillMovement",
          sourceCombatantId: spellCasterId,
          areaId: cloudkillAreaId,
          distanceFeet: movementFeet(10),
          directionRequirement: "awayFromSource",
          requiresTableSpatialFact: true,
        },
      ],
    });
  });

  test("advances exactly one turn after the table supplies movement facts", () => {
    const cast = castCloudkill().state;
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementHole = requireHole(
      movementFrontier.holes,
      "cloudkillMovement",
    );

    const sourceTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [cloudkillMovementFill(movementHole, [])],
    });

    expect(sourceTurn).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
      },
    });
    if (sourceTurn.tag !== "resolved") return;
    expect(sourceTurn.state.initiative.stillToAct[0]?.creature).toBe(
      spellCasterId,
    );
  });

  test("keeps turn advancement suspended while movement-affected creatures resolve their saves", () => {
    const cast = castCloudkill().state;
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementHole = requireHole(
      movementFrontier.holes,
      "cloudkillMovement",
    );

    const saveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [cloudkillMovementFill(movementHole, [spellTargetId])],
    });

    expect(saveFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "savingThrowOutcome",
          cloudkillAreaHazard: {
            targetId: spellTargetId,
            sourceCombatantId: spellCasterId,
            areaId: cloudkillAreaId,
            trigger: "movesIntoSpace",
          },
        },
      ],
    });
    if (saveFrontier.tag !== "needsHoles") return;
    expect(saveFrontier.state.initiative.stillToAct[0]?.creature).toBe(
      spellTargetId,
    );
  });

  test("applies movement-triggered save damage before advancing exactly once", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const movementFill = cloudkillMovementFill(movementHole, [spellTargetId]);
    expect(movementFill.value).not.toHaveProperty("distanceFeet");

    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (saveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered save frontier.");
    }
    const saveHole = requireHole(saveFrontier.holes, "savingThrowOutcome");
    const saveFill = singleTargetSavingThrowOutcomeFill(
      saveHole,
      spellTargetId,
      true,
    );
    const damageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill, saveFill],
    });
    if (damageFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered damage frontier.");
    }
    const damageHole = requireHole(damageFrontier.holes, "rolledDice");
    const resolved = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        movementFill,
        saveFill,
        damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { round: 2, currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toBe(28);
    expect(activeCloudkill(resolved.state).savedThisTurn).toEqual([
      spellTargetId,
    ]);
  });

  test("rejects duplicate, wrong-phase, and stale movement fills", () => {
    const { cast, boundaryState, movementHole } = sourceTurnMovementBoundary();
    const movementFill = cloudkillMovementFill(movementHole, []);

    expect(
      endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [movementFill, movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      endTurn({
        state: cast.state,
        actorId: spellCasterId,
        fills: [movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    expect(
      endTurn({
        state: nextTargetTurn.state,
        actorId: spellTargetId,
        fills: [movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("requires a fresh movement exactly once on every later source turn", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [cloudkillMovementFill(movementHole, [])],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    const nextMovement = endTurn({
      state: nextTargetTurn.state,
      actorId: spellTargetId,
    });

    expect(nextMovement).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "cloudkillMovement", distanceFeet: movementFeet(10) }],
    });
    if (nextMovement.tag !== "needsHoles") return;
    expect(
      requireHole(nextMovement.holes, "cloudkillMovement").holeId,
    ).not.toBe(movementHole.holeId);
  });

  test("replays an interrupted movement save without advancing or reopening it", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({
        ...cast.session,
        state: targetTurn.state,
      }),
    );
    const movementFrontier = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementFill = cloudkillMovementFill(
      requireHole(movementFrontier.holes, "cloudkillMovement"),
      [spellTargetId],
    );
    const saveFrontier = endTurn({
      state: readied.state,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (saveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered save frontier.");
    }
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireHole(saveFrontier.holes, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = endTurn({
      state: readied.state,
      actorId: spellTargetId,
      fills: [movementFill, saveFill],
    });

    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        currentActorId: spellTargetId,
        pendingInterrupt: { trigger: "saveFailed" },
      },
    });
    if (interrupted.tag !== "needsHoles") return;
    const pendingInterrupt = interrupted.snapshot.pendingInterrupt;
    if (pendingInterrupt === null) {
      throw new Error("Expected the failed-save interrupt checkpoint.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        currentActorId: spellTargetId,
        pendingInterrupt: null,
      },
    });
    if (declined.tag !== "needsHoles") return;
    const damageHole = requireHole(declined.holes, "rolledDice");
    const damageFill = damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]);
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: declined.subject,
      fills: [movementFill, saveFill, damageFill],
    });
    expect(concentrationFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "concentrationSavingThrow" }],
      snapshot: {
        currentActorId: spellTargetId,
        pendingInterrupt: null,
      },
    });
    if (concentrationFrontier.tag !== "needsHoles") return;
    const concentrationHole = requireHole(
      concentrationFrontier.holes,
      "concentrationSavingThrow",
    );
    const resumed = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [
        movementFill,
        saveFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, true),
      ],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
  });

  test("rejects the former anytime movement-save command", () => {
    const { state } = castCloudkill();

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: spellCasterId,
          command: "cloudkillAreaHazardSave",
          areaMembershipTrigger: {
            kind: "areaMovesIntoSpace",
            areaId: cloudkillAreaId,
          },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Cloudkill movement saves resolve only through the source's start-turn boundary.",
    });
  });

  test("movement holes and generated table facts round-trip through the battle codecs", () => {
    const { movementHole } = sourceTurnMovementBoundary();
    expect(
      Schema.decodeUnknownSync(BattleHoleSchema)(
        Schema.encodeSync(BattleHoleSchema)(movementHole),
      ),
    ).toEqual(movementHole);

    fc.assert(
      fc.property(
        fc.record({
          directionId: fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/),
          destinationId: fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/),
          affectedCombatantIds: fc.shuffledSubarray([
            spellCasterId,
            spellTargetId,
          ]),
        }),
        ({ directionId, destinationId, affectedCombatantIds }) => {
          const fill = {
            kind: "cloudkillMovement" as const,
            holeId: movementHole.holeId,
            value: {
              directionId: battleLineDirectionId(directionId),
              destinationId: battleTablePositionId(destinationId),
              affectedCombatantIds,
            },
          };
          expect(
            Schema.decodeUnknownSync(BattleFillSchema)(
              Schema.encodeSync(BattleFillSchema)(fill),
            ),
          ).toEqual(fill);
        },
      ),
      { numRuns: 32, seed: 0x381c10d },
    );
  });
});
