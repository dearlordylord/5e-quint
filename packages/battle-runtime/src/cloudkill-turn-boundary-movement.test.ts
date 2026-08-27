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
  BattleActiveEffect,
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
  greaseAreaId,
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
  combatantId,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  attackRollFill,
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  concentrationSavingThrowFill,
  damageRollFill,
  reactionChoiceWithSubject,
  targetFill,
} from "./battle-runtime.test-support.ts";
import {
  readyTargetRayOfFrost,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";

const cloudkillDirectionId = battleLineDirectionId("away-from-source");
const cloudkillDestinationId = battleTablePositionId("cloudkill-next-center");
const cloudkillSecondaryTargetId = combatantId("cloudkill-secondary-target");

function withGreaseGroundHazard(state: BattleState): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) {
    throw new Error("Expected the persistent-spell source.");
  }
  const effect = {
    kind: "greaseGroundHazard",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "cloudkill-composition-grease",
    ),
    sourceCombatantId: spellCasterId,
    areaId: greaseAreaId,
    heightenedSpellTargetDisadvantage: null,
    save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...source,
      activeEffects: [...source.activeEffects, effect],
    }),
  };
}

function withCommandGrovel(
  state: BattleState,
  actorId: CombatantId,
): {
  readonly state: BattleState;
  readonly effectRef: Extract<
    BattleActiveEffect,
    { readonly kind: "commandPending" }
  >["effectRef"];
} {
  const target = state.combatants.get(actorId);
  if (target === undefined) {
    throw new Error("Expected the Command Grovel target.");
  }
  const effectRef = battleActiveEffectExecutionRefForTest(
    "cloudkill-command-grovel",
  );
  const effect = {
    kind: "commandPending",
    effectRef,
    sourceCombatantId: spellCasterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "cloudkill-command-grovel",
    ),
    option: "grovel",
    expiresAt: {
      kind: "endOfTurn",
      combatantId: actorId,
      round: state.initiative.round,
    },
  } as const satisfies BattleActiveEffect;
  return {
    effectRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(actorId, {
        ...target,
        activeEffects: [...target.activeEffects, effect],
      }),
    },
  };
}

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
  input: {
    readonly targetCanReadyRayOfFrost?: true;
    readonly extraTargetIds?: readonly CombatantId[];
  } = {},
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
        ...(input.extraTargetIds === undefined
          ? {}
          : {
              extraTargetIds: input.extraTargetIds,
              extraTargetHp: 30,
              extraTargetMaxHp: 30,
            }),
      })
    : spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 5, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
        ...(input.extraTargetIds === undefined
          ? {}
          : {
              extraTargetIds: input.extraTargetIds,
              extraTargetHp: 30,
              extraTargetMaxHp: 30,
            }),
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

  test("opens independent failed-save windows for two movement-affected targets", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementHole = requireResultHole(
      movementFrontier,
      "cloudkillMovement",
    );
    const movementFill = cloudkillMovementFill(movementHole, [
      cloudkillSecondaryTargetId,
      spellCasterId,
    ]);
    const firstSaveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const firstSaveHole = requireResultHole(
      firstSaveFrontier,
      "savingThrowOutcome",
    );
    expect(firstSaveHole).toMatchObject({
      cloudkillAreaHazard: { targetId: spellCasterId },
    });
    const firstSaveFill = singleTargetSavingThrowOutcomeFill(
      firstSaveHole,
      spellCasterId,
      false,
    );
    const firstInterrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, firstSaveFill],
    });
    const firstDecision = requireResultHole(
      firstInterrupted,
      "interruptDecision",
    );
    if (firstInterrupted.tag !== "needsHoles") {
      throw new Error("Expected the first failed-save window.");
    }
    const firstDeclined = resolveBattleInterrupt({
      state: firstInterrupted.state,
      fill: interruptDecisionFill(firstDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const firstDamageHole = requireResultHole(firstDeclined, "rolledDice");
    const firstDamageFill = damageRollFillWithGroups(firstDamageHole, [
      [1, 1, 1, 1, 1],
    ]);
    if (firstDeclined.tag !== "needsHoles") {
      throw new Error("Expected the first target's damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: firstDeclined.state,
      subject: firstDeclined.subject,
      fills: [movementFill, firstSaveFill, firstDamageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected the source Concentration save frontier.");
    }
    const secondSaveFrontier = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [movementFill, firstSaveFill, firstDamageFill, concentrationFill],
    });
    const secondSaveHole = requireResultHole(
      secondSaveFrontier,
      "savingThrowOutcome",
    );
    const secondSaveFill = singleTargetSavingThrowOutcomeFill(
      secondSaveHole,
      cloudkillSecondaryTargetId,
      false,
    );
    if (secondSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the second target's save frontier.");
    }
    const secondInterrupted = resolveBattleSubject({
      state: secondSaveFrontier.state,
      subject: secondSaveFrontier.subject,
      fills: [
        movementFill,
        firstSaveFill,
        firstDamageFill,
        concentrationFill,
        secondSaveFill,
      ],
    });

    expect(secondInterrupted).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "saveFailed",
          choices: [
            expect.objectContaining({ readiedSpellCasterId: spellTargetId }),
          ],
        },
      },
    });
  });

  test("preserves and resolves movement interrupt replay through delegated Command End Turn", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const commanded = withCommandGrovel(
      secondaryTurn.state,
      cloudkillSecondaryTargetId,
    );
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: cloudkillSecondaryTargetId,
      command: "commandGrovel" as const,
      effectRef: commanded.effectRef,
    };
    const movementFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [],
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [cloudkillSecondaryTargetId],
    );
    const saveFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const interrupted = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill, saveFill],
    });

    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      state: {
        interruptStack: [
          {
            kind: "interruptCheckpoint",
            frame: {
              trigger: "saveFailed",
              continuation: {
                kind: "replay",
                subject,
                parentPosition: {
                  kind: "persistentAreaSaveDamage",
                  targetId: cloudkillSecondaryTargetId,
                },
              },
            },
          },
        ],
      },
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected delegated movement interrupt.");
    }
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected delegated pending interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: [{ kind: "rolledDice" }],
      state: {
        interruptStack: [
          {
            kind: "replayContinuation",
            continuation: {
              kind: "replay",
              subject,
              parentPosition: {
                kind: "persistentAreaSaveDamage",
                targetId: cloudkillSecondaryTargetId,
              },
            },
          },
        ],
      },
    });
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected delegated movement damage frontier.");
    }
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const resumed = resolveBattleSubject({
      state: declined.state,
      subject: declined.subject,
      fills: [movementFill, saveFill, damageFill],
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

  test("offers independent failed-save reactions for delegated Grease End Turn and Cloudkill movement", () => {
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
        state: withGreaseGroundHazard(targetTurn.state),
      }),
    );
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "greaseGroundHazardSave" as const,
      areaId: greaseAreaId,
      trigger: "endsTurnInArea" as const,
    };
    const combinedFrontier = resolveBattleSubject({
      state: readied.state,
      subject,
      fills: [],
    });
    if (combinedFrontier.tag !== "needsHoles") {
      throw new Error("Expected the combined Grease and Cloudkill frontier.");
    }
    const greaseSaveHole = combinedFrontier.holes.find(
      (hole) =>
        hole.kind === "savingThrowOutcome" &&
        "greaseGroundHazard" in hole,
    );
    if (greaseSaveHole?.kind !== "savingThrowOutcome") {
      throw new Error("Expected the Grease end-turn save frontier.");
    }
    const movementHole = requireHole(
      combinedFrontier.holes,
      "cloudkillMovement",
    );
    const greaseSaveFill = singleTargetSavingThrowOutcomeFill(
      greaseSaveHole,
      spellTargetId,
      false,
    );
    const movementFill = cloudkillMovementFill(movementHole, [spellTargetId]);
    const cloudkillSaveFrontier = resolveBattleSubject({
      state: readied.state,
      subject,
      fills: [greaseSaveFill, movementFill],
    });
    if (cloudkillSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement save frontier.");
    }
    const cloudkillSaveHole = cloudkillSaveFrontier.holes.find(
      (hole) =>
        hole.kind === "savingThrowOutcome" &&
        "cloudkillAreaHazard" in hole,
    );
    if (cloudkillSaveHole?.kind !== "savingThrowOutcome") {
      throw new Error("Expected the Cloudkill movement save hole.");
    }
    const cloudkillSaveFill = singleTargetSavingThrowOutcomeFill(
      cloudkillSaveHole,
      spellTargetId,
      false,
    );
    const cloudkillInterrupted = resolveBattleSubject({
      state: readied.state,
      subject,
      fills: [greaseSaveFill, movementFill, cloudkillSaveFill],
    });
    const cloudkillDecision = requireResultHole(
      cloudkillInterrupted,
      "interruptDecision",
    );
    if (cloudkillInterrupted.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill failed-save window.");
    }
    const afterCloudkillDecline = resolveBattleInterrupt({
      state: cloudkillInterrupted.state,
      fill: interruptDecisionFill(cloudkillDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const cloudkillDamageHole = requireResultHole(
      afterCloudkillDecline,
      "rolledDice",
    );
    if (afterCloudkillDecline.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: afterCloudkillDecline.state,
      subject: afterCloudkillDecline.subject,
      fills: [
        greaseSaveFill,
        movementFill,
        cloudkillSaveFill,
        damageRollFillWithGroups(cloudkillDamageHole, [[1, 1, 1, 1, 1]]),
      ],
    });
    const cloudkillConcentrationHole = requireResultHole(
      concentrationFrontier,
      "concentrationSavingThrow",
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill Concentration-save frontier.");
    }
    const greaseInterrupted = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [
        greaseSaveFill,
        movementFill,
        cloudkillSaveFill,
        damageRollFillWithGroups(cloudkillDamageHole, [[1, 1, 1, 1, 1]]),
        concentrationSavingThrowFill(cloudkillConcentrationHole, true),
      ],
    });

    expect(greaseInterrupted).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        currentActorId: spellTargetId,
        pendingInterrupt: { trigger: "saveFailed" },
      },
    });
    if (greaseInterrupted.tag !== "needsHoles") return;
    const greaseDecision = requireHole(
      greaseInterrupted.holes,
      "interruptDecision",
    );
    const resolved = resolveBattleInterrupt({
      state: greaseInterrupted.state,
      fill: interruptDecisionFill(greaseDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
  });

  test("cancels remaining movement damage and advances once when an accepted reaction ends source Concentration", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const sourceHpBeforeReaction =
      secondaryTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeReaction === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [cloudkillSecondaryTargetId],
    );
    const saveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const interrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected the failed-save reaction window.");
    }
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected a pending failed-save interrupt.");
    }
    const choice = reactionChoiceWithSubject(pending.choices);
    if (
      choice.kind !== "releaseReadiedSpell" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected the readied Ray of Frost choice.");
    }
    const released = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: spellTargetId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: spellTargetId,
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    const reactionTargetHole = requireResultHole(released, "targetChoice");
    if (released.tag !== "needsHoles") {
      throw new Error("Expected the readied spell target frontier.");
    }
    const reactionTargetFill = targetFill(reactionTargetHole, spellCasterId);
    const attackFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill],
    });
    const attackHole = requireResultHole(attackFrontier, "attackRoll");
    const attackFill = attackRollFill(attackHole, {
      total: 20,
      naturalD20: 15,
    });
    const damageFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill, attackFill],
    });
    const damageHole = requireResultHole(damageFrontier, "rolledDice");
    const damageFill = damageRollFill(damageHole, 4);
    const concentrationFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill, attackFill, damageFill],
    });
    const concentrationHole = requireResultHole(
      concentrationFrontier,
      "concentrationSavingThrow",
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected the source Concentration save frontier.");
    }
    const resumed = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [
        reactionTargetFill,
        attackFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, false),
      ],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: false,
          }),
        ]),
      },
    });
    if (resumed.tag !== "resolved") return;
    expect(
      [...resumed.state.combatants.values()].flatMap(
        (combatant) => combatant.activeEffects,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "cloudkillAreaHazard" }),
      ]),
    );
    expect(resumed.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeReaction - 4,
    );
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
