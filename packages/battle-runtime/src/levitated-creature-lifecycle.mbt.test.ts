// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-levitated-creature
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Levitate:
//   Concentration up to 10 minutes; one visible creature rises up to 20 feet
//   and remains suspended; unwilling creatures that succeed on a Constitution
//   Saving Throw are unaffected; targets move only by pushing or pulling
//   against a fixed object or surface within reach; the caster can use a Magic
//   Action to move a non-self target that remains within range.
// - .references/srd-5.2.1/Rules-Glossary.md#Climbing:
//   climbing costs 1 extra foot per foot unless using a Climb Speed.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
//   effects end when their creator loses Concentration.
// - .references/srd-5.2.1/Playing-the-Game.md#Movement and Position:
//   Movement is deducted from the creature's movement budget.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Movement, Concentration,
//   Duration, and Spellcasting.
import * as path from "node:path";

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  levitateUnitId,
  spellCasterId,
  spellTargetId,
  type ActionSpellAct,
} from "./unit-profile-admission-catalog-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

const noAltitude = -1;

const LEVITATE_CREATURE_HOLES = [
  "LevitateAltitudeChange",
  "LevitateInitialRise",
  "Movement",
  "SavingThrowOutcome",
] as const;
type LevitateCreatureHole = (typeof LEVITATE_CREATURE_HOLES)[number];
const LEVITATE_CREATURE_HOLE_SET: ReadonlySet<string> = new Set(
  LEVITATE_CREATURE_HOLES,
);

const LAST_RESULTS = [
  "init",
  "needsSave",
  "unwillingSaveSucceeded",
  "unwillingSaveFailed",
  "needsWillingInitialRise",
  "willingLevitated",
  "needsTargetMovement",
  "missingWitnessRejected",
  "targetMoved",
  "needsCasterControl",
  "outOfRangeRejected",
  "casterControlled",
  "concentrationBroken",
  "durationExpired",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

type LevitateCreatureProjection = {
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly effectActive: boolean;
  readonly casterConcentrating: boolean;
  readonly altitudeFeet: number;
  readonly holes: readonly LevitateCreatureHole[];
  readonly lastResult: LastResult;
};

type LevitateCreatureRuntimeState = {
  readonly battle: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: LastResult;
};

type LevitateAltitudeControlAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "levitateAltitudeControl";
    }
  >;
};

type MoveAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "move";
    }
  >;
};

const driverSchema = {
  init: {},
  doDiscoverUnwillingSave: {},
  doCastUnwillingSaveSuccess: {},
  doCastUnwillingSaveFailureAt10Feet: {},
  doDiscoverWillingInitialRise: {},
  doCastWillingAt12Feet: {},
  doDiscoverTargetMovement: {},
  doRejectTargetMovementWithoutWitness: {},
  doMoveTargetWithWitnessUp5Feet: {},
  doDiscoverCasterControl: {},
  doRejectOutOfRangeCasterControl: {},
  doControlAltitudeDown10Feet: {},
  doBreakConcentration: {},
  doExpireDuration: {},
  doStutter: {},
  step: {},
} as const;

function createLevitatedCreatureLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doDiscoverUnwillingSave: () => {
        state = discoverUnwillingSave(state);
      },
      doCastUnwillingSaveSuccess: () => {
        state = castUnwillingLevitate(
          state,
          true,
          10,
          "unwillingSaveSucceeded",
        );
      },
      doCastUnwillingSaveFailureAt10Feet: () => {
        state = castUnwillingLevitate(state, false, 10, "unwillingSaveFailed");
      },
      doDiscoverWillingInitialRise: () => {
        state = discoverWillingInitialRise(state);
      },
      doCastWillingAt12Feet: () => {
        state = castWillingLevitate(state, 12);
      },
      doDiscoverTargetMovement: () => {
        state = discoverTargetMovement(state);
      },
      doRejectTargetMovementWithoutWitness: () => {
        state = rejectTargetMovementWithoutWitness(state);
      },
      doMoveTargetWithWitnessUp5Feet: () => {
        state = moveTargetWithWitnessUp5Feet(state);
      },
      doDiscoverCasterControl: () => {
        state = discoverCasterControl(state);
      },
      doRejectOutOfRangeCasterControl: () => {
        state = rejectOutOfRangeCasterControl(state);
      },
      doControlAltitudeDown10Feet: () => {
        state = controlAltitudeDown10Feet(state);
      },
      doBreakConcentration: () => {
        state = breakLevitateConcentration(state);
      },
      doExpireDuration: () => {
        state = expireLevitateDuration(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => levitateCreatureProjection(state),
    };
  });
}

const levitateCreatureStateCheck = stateCheck(
  normalizeLevitateCreatureQuintState,
  compareLevitateCreatureStates,
);

describe("Levitate creature lifecycle MBT parity", () => {
  it("projects save-gated suspension and caller-selected altitude", () => {
    const saveHole = discoverUnwillingSave(initialRuntimeState());
    const saved = castUnwillingLevitate(
      saveHole,
      true,
      10,
      "unwillingSaveSucceeded",
    );
    const failed = castUnwillingLevitate(
      saveHole,
      false,
      10,
      "unwillingSaveFailed",
    );
    const willingHole = discoverWillingInitialRise(initialRuntimeState());
    const willing = castWillingLevitate(willingHole, 12);

    expect(levitateCreatureProjection(saved)).toMatchObject({
      effectActive: false,
      casterConcentrating: false,
      altitudeFeet: noAltitude,
      lastResult: "unwillingSaveSucceeded",
    });
    expect(levitateCreatureProjection(failed)).toMatchObject({
      effectActive: true,
      casterConcentrating: true,
      altitudeFeet: 10,
      lastResult: "unwillingSaveFailed",
    });
    expect(levitateCreatureProjection(willing)).toMatchObject({
      effectActive: true,
      casterConcentrating: true,
      altitudeFeet: 12,
      lastResult: "willingLevitated",
    });
  });

  it("projects witnessed target movement and range-gated caster Magic Action control", () => {
    const cast = castWillingLevitate(
      discoverWillingInitialRise(initialRuntimeState()),
      12,
    );
    const moveHole = discoverTargetMovement(cast);
    const rejectedMove = rejectTargetMovementWithoutWitness(moveHole);
    const moved = moveTargetWithWitnessUp5Feet(moveHole);
    const controlHole = discoverCasterControl(moved);
    const outOfRange = rejectOutOfRangeCasterControl(controlHole);
    const controlled = controlAltitudeDown10Feet(controlHole);

    expect(levitateCreatureProjection(rejectedMove)).toMatchObject({
      actionAvailable: true,
      altitudeFeet: 12,
      lastResult: "missingWitnessRejected",
    });
    expect(levitateCreatureProjection(moved)).toMatchObject({
      actionAvailable: true,
      altitudeFeet: 17,
      lastResult: "targetMoved",
    });
    expect(levitateCreatureProjection(outOfRange)).toMatchObject({
      actionAvailable: true,
      altitudeFeet: 17,
      lastResult: "outOfRangeRejected",
    });
    expect(levitateCreatureProjection(controlled)).toMatchObject({
      actionAvailable: false,
      altitudeFeet: 7,
      lastResult: "casterControlled",
    });
  });

  it("cleans up the levitated creature projection on Concentration break and duration expiry", () => {
    const cast = castWillingLevitate(
      discoverWillingInitialRise(initialRuntimeState()),
      12,
    );
    const broken = breakLevitateConcentration(cast);
    const expired = expireLevitateDuration(cast);

    expect(levitateCreatureProjection(broken)).toMatchObject({
      effectActive: false,
      casterConcentrating: false,
      altitudeFeet: noAltitude,
      lastResult: "concentrationBroken",
    });
    expect(levitateCreatureProjection(expired)).toMatchObject({
      actionAvailable: true,
      effectActive: false,
      casterConcentrating: false,
      altitudeFeet: noAltitude,
      lastResult: "durationExpired",
    });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-levitated-creature-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevitatedCreatureLifecycleDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: levitateCreatureStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): LevitateCreatureRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(levitateUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    }),
    holes: [],
    lastResult: "init",
  };
}

function discoverUnwillingSave(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const act = levitateActInState(state.battle);
  const target = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [
      spellTargetFill(target, levitateUnitId, spellCasterId, spellTargetId),
    ],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Levitate Constitution Saving Throw hole.");
  }
  return {
    ...state,
    holes: result.holes,
    lastResult: "needsSave",
  };
}

function castUnwillingLevitate(
  state: LevitateCreatureRuntimeState,
  saveSucceeded: boolean,
  initialRiseFeet: number,
  lastResult: Extract<
    LastResult,
    "unwillingSaveSucceeded" | "unwillingSaveFailed"
  >,
): LevitateCreatureRuntimeState {
  const act = levitateActInState(state.battle);
  const target = requireHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    levitateUnitId,
    spellCasterId,
    spellTargetId,
  );
  const save = requireHole(state.holes, "savingThrowOutcome");
  const saveFill = savingThrowOutcomeFill(save, [
    { targetId: spellTargetId, succeeded: saveSucceeded },
  ]);
  const resolved = saveSucceeded
    ? requireResolved(
        resolveBattleSubject({
          state: state.battle,
          subject: act.subject,
          fills: [targetFill, saveFill],
        }),
        "Expected successful Levitate save to resolve without suspension.",
      )
    : resolveUnwillingFailedSaveWithInitialRise(
        state.battle,
        act,
        targetFill,
        saveFill,
        initialRiseFeet,
      );
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastResult,
  };
}

function resolveUnwillingFailedSaveWithInitialRise(
  battle: BattleState,
  act: ActionSpellAct,
  targetFill: BattleFill,
  saveFill: BattleFill,
  initialRiseFeet: number,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const needsInitialRise = resolveBattleSubject({
    state: battle,
    subject: act.subject,
    fills: [targetFill, saveFill],
  });
  expect(needsInitialRise).toMatchObject({ tag: "needsHoles" });
  if (needsInitialRise.tag !== "needsHoles") {
    throw new Error("Expected Levitate initial-rise hole after failed save.");
  }
  const initialRise = requireHole(
    needsInitialRise.holes,
    "levitateInitialRise",
  );
  return requireResolved(
    resolveBattleSubject({
      state: battle,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        levitateInitialRiseFill(initialRise, initialRiseFeet),
      ],
    }),
    "Expected failed Levitate save with selected initial rise to resolve.",
  );
}

function discoverWillingInitialRise(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const act = levitateActInState(state.battle);
  const target = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        target,
        levitateUnitId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Levitate initial-rise hole.");
  }
  return {
    ...state,
    holes: result.holes,
    lastResult: "needsWillingInitialRise",
  };
}

function castWillingLevitate(
  state: LevitateCreatureRuntimeState,
  initialRiseFeet: number,
): LevitateCreatureRuntimeState {
  const act = levitateActInState(state.battle);
  const target = requireHole(act.initialHoles, "targetChoice");
  const initialRise = requireHole(state.holes, "levitateInitialRise");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        levitateInitialRiseFill(initialRise, initialRiseFeet),
      ],
    }),
    "Expected willing Levitate with selected initial rise to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastResult: "willingLevitated",
  };
}

function discoverTargetMovement(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const battle = advanceToTargetTurnForLevitate(state.battle);
  const act = moveActInState(battle);
  return {
    ...state,
    battle,
    holes: act.initialHoles,
    lastResult: "needsTargetMovement",
  };
}

function rejectTargetMovementWithoutWitness(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const movement = requireHole(state.holes, "movement");
  const result = resolveBattleSubject({
    state: state.battle,
    subject: moveActInState(state.battle).subject,
    fills: [
      movementFill(movement, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  expect(result).toMatchObject({ tag: "invalid" });
  return {
    ...state,
    holes: [],
    lastResult: "missingWitnessRejected",
  };
}

function moveTargetWithWitnessUp5Feet(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const movement = requireHole(state.holes, "movement");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: moveActInState(state.battle).subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          levitatedMovement: {
            kind: "levitatedMovement",
            sourceCombatantId: spellCasterId,
            sourceSpellId: levitateUnitId,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "up",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    }),
    "Expected witnessed Levitate target movement to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastResult: "targetMoved",
  };
}

function discoverCasterControl(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const battle = advanceToCasterControlTurn(state.battle);
  const act = levitateAltitudeControlActInState(battle);
  return {
    ...state,
    battle,
    holes: act.initialHoles,
    lastResult: "needsCasterControl",
  };
}

function rejectOutOfRangeCasterControl(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const hole = requireHole(state.holes, "levitateAltitudeChange");
  const result = resolveBattleSubject({
    state: state.battle,
    subject: levitateAltitudeControlActInState(state.battle).subject,
    fills: [levitateAltitudeChangeFill(hole, "up", 10, [])],
  });
  expect(result).toMatchObject({ tag: "invalid" });
  return {
    ...state,
    holes: [],
    lastResult: "outOfRangeRejected",
  };
}

function controlAltitudeDown10Feet(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const hole = requireHole(state.holes, "levitateAltitudeChange");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: levitateAltitudeControlActInState(state.battle).subject,
      fills: [
        levitateAltitudeChangeFill(hole, "down", 10, [
          {
            kind: "levitatedTargetWithinSpellRange",
            sourceCombatantId: spellCasterId,
            sourceSpellId: levitateUnitId,
            targetId: spellTargetId,
            rangeFeet: movementFeet(60),
          },
        ]),
      ],
    }),
    "Expected range-witnessed Levitate caster altitude control to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastResult: "casterControlled",
  };
}

function breakLevitateConcentration(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    holes: [],
    lastResult: "concentrationBroken",
  };
}

function expireLevitateDuration(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureRuntimeState {
  const target = requireCombatant(state.battle, spellTargetId);
  const nearlyExpired: BattleState = {
    ...state.battle,
    combatants: new Map(state.battle.combatants).set(spellTargetId, {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "spellLevitatedCreature" &&
        effect.expiresAt.kind === "concentration"
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    }),
  };
  return {
    ...state,
    battle: advanceToNextCasterTurn(nearlyExpired),
    holes: [],
    lastResult: "durationExpired",
  };
}

function levitateActInState(state: BattleState): ActionSpellAct {
  const act = maybeSpellAct({
    state,
    spellId: levitateUnitId,
    slotLevel: 2,
  });
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Levitate spell act.");
  }
  return act;
}

function moveActInState(state: BattleState): MoveAct {
  const act = discoverBattleActs(state).find(isTargetMoveAct);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected movement act.");
  }
  return act;
}

function levitateAltitudeControlActInState(
  state: BattleState,
): LevitateAltitudeControlAct {
  const act = discoverBattleActs(state).find(isLevitateAltitudeControlAct);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Levitate altitude-control act.");
  }
  return act;
}

function isTargetMoveAct(candidate: AvailableBattleAct): candidate is MoveAct {
  return (
    candidate.subject.tag === "runtimeCommand" &&
    candidate.subject.command === "move" &&
    candidate.subject.actorId === spellTargetId
  );
}

function isLevitateAltitudeControlAct(
  candidate: AvailableBattleAct,
): candidate is LevitateAltitudeControlAct {
  return (
    candidate.subject.tag === "runtimeCommand" &&
    candidate.subject.command === "levitateAltitudeControl"
  );
}

function levitateAltitudeChangeFill(
  hole: Extract<BattleHole, { readonly kind: "levitateAltitudeChange" }>,
  direction: "up" | "down",
  distanceFeet: number,
  spatialFacts: Extract<
    BattleFill,
    { readonly kind: "levitateAltitudeChange" }
  >["spatialFacts"],
): Extract<BattleFill, { readonly kind: "levitateAltitudeChange" }> {
  return {
    kind: "levitateAltitudeChange",
    holeId: hole.holeId,
    value: { direction, distanceFeet: movementFeet(distanceFeet) },
    spatialFacts,
  };
}

function levitateInitialRiseFill(
  hole: Extract<BattleHole, { readonly kind: "levitateInitialRise" }>,
  distanceFeet: number,
): Extract<BattleFill, { readonly kind: "levitateInitialRise" }> {
  return {
    kind: "levitateInitialRise",
    holeId: hole.holeId,
    value: { distanceFeet: movementFeet(distanceFeet) },
  };
}

function advanceToTargetTurnForLevitate(state: BattleState): BattleState {
  if (discoverBattleActs(state).some(isTargetMoveAct)) {
    return state;
  }
  return requireResolved(
    endTurn({ state, actorId: spellCasterId }),
    "Expected caster turn to end before target movement.",
  ).state;
}

function advanceToCasterControlTurn(state: BattleState): BattleState {
  if (discoverBattleActs(state).some(isLevitateAltitudeControlAct)) {
    return state;
  }
  if (discoverBattleActs(state).some(isTargetMoveAct)) {
    return requireResolved(
      endTurn({ state, actorId: spellTargetId }),
      "Expected target turn to end before caster control.",
    ).state;
  }
  return advanceToNextCasterTurn(state);
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const targetTurn = requireResolved(
    endTurn({ state, actorId: spellCasterId }),
    "Expected caster turn to end.",
  );
  return requireResolved(
    endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    "Expected target turn to end.",
  ).state;
}

function levitateCreatureProjection(
  state: LevitateCreatureRuntimeState,
): LevitateCreatureProjection {
  const target = requireCombatant(state.battle, spellTargetId);
  const effect = target.activeEffects.find(
    (candidate) => candidate.kind === "spellLevitatedCreature",
  );
  return {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: levitateUnitId,
        slotLevel: 2,
      }) !== undefined,
    effectActive: effect !== undefined,
    casterConcentrating:
      requireCombatant(state.battle, spellCasterId).concentration !== null,
    altitudeFeet:
      effect === undefined ? noAltitude : Number(effect.altitudeFeet),
    holes: battleHolesToLevitateCreatureHoles(state.holes),
    lastResult: state.lastResult,
  };
}

function battleHolesToLevitateCreatureHoles(
  holes: readonly BattleHole[],
): readonly LevitateCreatureHole[] {
  return holes
    .map((hole) => {
      if (hole.kind === "savingThrowOutcome") {
        return "SavingThrowOutcome";
      }
      if (hole.kind === "levitateInitialRise") {
        return "LevitateInitialRise";
      }
      if (hole.kind === "movement") {
        return "Movement";
      }
      if (hole.kind === "levitateAltitudeChange") {
        return "LevitateAltitudeChange";
      }
      throw new Error(`Unexpected Levitate creature hole ${hole.kind}.`);
    })
    .sort();
}

function normalizeLevitateCreatureQuintState(
  raw: unknown,
): LevitateCreatureProjection {
  const state = quintStateRecord(raw);
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    effectActive: booleanField(state, "qEffectActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    altitudeFeet: numberFromQuintInt(state["qAltitudeFeet"], "qAltitudeFeet"),
    holes: quintSet(state["qHoles"], "qHoles").map(levitateCreatureHole).sort(),
    lastResult: lastResult(state["qLastResult"]),
  };
}

function compareLevitateCreatureStates(
  runtime: LevitateCreatureProjection,
  quint: LevitateCreatureProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error(message);
  }
  return result;
}

function levitateCreatureHole(raw: unknown): LevitateCreatureHole {
  if (typeof raw === "string" && LEVITATE_CREATURE_HOLE_SET.has(raw)) {
    return raw as LevitateCreatureHole;
  }
  throw new Error(`Unknown Levitate creature hole: ${String(raw)}.`);
}

function lastResult(raw: unknown): LastResult {
  if (typeof raw === "string" && LAST_RESULT_SET.has(raw)) {
    return raw as LastResult;
  }
  throw new Error(`Unknown Levitate creature result: ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint Levitate creature state.");
  }
  return raw;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  if (typeof state[field] === "boolean") {
    return state[field];
  }
  throw new Error(`Expected Quint Boolean field ${field}.`);
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }
  throw new Error(`Expected Quint Set field ${field}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
