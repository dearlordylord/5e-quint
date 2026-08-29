// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Cloudkill
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration,
//   #Area-of-Effect, #Sphere-Area-of-Effect, #Heavily-Obscured, and
//   #Simultaneous-Effects
// - .references/srd-5.2.1/Playing-the-Game.md#Saving-Throws-and-Damage
// - .references/srd-5.2.1/Gameplay-Toolbox.md#Strong-Wind
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Hp, movementFeet } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  concentrationSavingThrowFill,
} from "./battle-runtime.test-support.ts";
import { battleObscurementZones } from "./unit-profile-admission.test-support.ts";
import {
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  cloudkillAreaFill,
  cloudkillAreaHazardSaveAct,
  maybeSpellAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  cloudkillUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  type BattleActiveEffect,
  type BattleFill,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import type {
  BattleCloudkillAreaHazardDamageRollHole,
  BattleCloudkillAreaHazardSavingThrowOutcomeHole,
  BattleCloudkillMovementFill,
  BattleCloudkillMovementHole,
} from "./battle-state-execution.ts";

type CloudkillMbtTarget = "none" | "source" | "primary" | "secondary";
type CloudkillMbtPending =
  | "none"
  | "savingThrow"
  | "damage"
  | "concentrationSavingThrow";
type CloudkillMbtOutcome =
  | "init"
  | "cast"
  | "appearanceSave"
  | "appearanceDamage"
  | "appearanceResolved"
  | "targetTurn"
  | "movementSave"
  | "movementDamage"
  | "sourceConcentrationSave"
  | "movementResolved"
  | "concentrationEnded"
  | "strongWindEnded";

type CloudkillMbtProjection = {
  readonly casterTurn: boolean;
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly hazardActive: boolean;
  readonly casterConcentrating: boolean;
  readonly slotLevel: number;
  readonly damageDice: number;
  readonly durationTicks: number;
  readonly radiusFeet: number;
  readonly heavilyObscured: boolean;
  readonly sourceSavedThisTurn: boolean;
  readonly primarySavedThisTurn: boolean;
  readonly secondarySavedThisTurn: boolean;
  readonly casterHitPoints: number;
  readonly primaryHitPoints: number;
  readonly secondaryHitPoints: number;
  readonly lastMovementDistanceFeet: number;
  readonly pending: CloudkillMbtPending;
  readonly pendingTarget: CloudkillMbtTarget;
  readonly remainingTarget: CloudkillMbtTarget;
  readonly savingThrowSucceeded: boolean;
  readonly outcome: CloudkillMbtOutcome;
};

type CloudkillPendingProcedure = {
  readonly kind: "appearance" | "movement";
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly result: Extract<
    BattleResolutionResult,
    { readonly tag: "needsHoles" }
  >;
};

type CloudkillMbtRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly configuredSlotLevel: number;
  readonly pendingProcedure: CloudkillPendingProcedure | null;
  readonly lastMovementDistanceFeet: number;
  readonly remainingTarget: CloudkillMbtTarget;
  readonly savingThrowSucceeded: boolean;
  readonly outcome: CloudkillMbtOutcome;
};

type CloudkillEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "persistentAreaSaveDamage" }
>;

const secondaryTargetId = combatantId("cloudkill-mbt-secondary-target");

const driverSchema = {
  CloudkillMbtInitAction: {},
  CloudkillMbtSixthLevelCastAction: {},
  CloudkillMbtAppearanceHalfDamageAction: {},
  CloudkillMbtAppearanceFailedSaveD8OneAction: {},
  CloudkillMbtAppearanceFailedSaveD8TwoAction: {},
  CloudkillMbtAppearanceFailedSaveD8ThreeAction: {},
  CloudkillMbtAppearanceFailedSaveD8FourAction: {},
  CloudkillMbtAppearanceFailedSaveD8FiveAction: {},
  CloudkillMbtAppearanceFailedSaveD8SixAction: {},
  CloudkillMbtAppearanceFailedSaveD8SevenAction: {},
  CloudkillMbtAppearanceFailedSaveD8EightAction: {},
  CloudkillMbtMovementNextTargetSaveCheckpointAction: {},
  CloudkillMbtOrderedMovementClosureAction: {},
  CloudkillMbtSourceConcentrationCheckpointAction: {},
  CloudkillMbtSourceConcentrationCancellationAction: {},
  CloudkillMbtStrongWindCleanupAction: {},
} as const;

function createCloudkillMbtDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState(5);
    return {
      CloudkillMbtInitAction: () => {
        state = initialRuntimeState(5);
      },
      CloudkillMbtSixthLevelCastAction: () => {
        state = castCloudkill(initialRuntimeState(6));
      },
      CloudkillMbtAppearanceHalfDamageAction: () => {
        state = resolvePendingDamage(
          resolvePendingSave(
            discoverAppearanceSave(castCloudkill(initialRuntimeState(5))),
            true,
            "appearanceDamage",
          ),
          2,
          "appearanceResolved",
        );
      },
      CloudkillMbtAppearanceFailedSaveD8OneAction: () => {
        state = cloudkillAppearanceFailedSave(1);
      },
      CloudkillMbtAppearanceFailedSaveD8TwoAction: () => {
        state = cloudkillAppearanceFailedSave(2);
      },
      CloudkillMbtAppearanceFailedSaveD8ThreeAction: () => {
        state = cloudkillAppearanceFailedSave(3);
      },
      CloudkillMbtAppearanceFailedSaveD8FourAction: () => {
        state = cloudkillAppearanceFailedSave(4);
      },
      CloudkillMbtAppearanceFailedSaveD8FiveAction: () => {
        state = cloudkillAppearanceFailedSave(5);
      },
      CloudkillMbtAppearanceFailedSaveD8SixAction: () => {
        state = cloudkillAppearanceFailedSave(6);
      },
      CloudkillMbtAppearanceFailedSaveD8SevenAction: () => {
        state = cloudkillAppearanceFailedSave(7);
      },
      CloudkillMbtAppearanceFailedSaveD8EightAction: () => {
        state = cloudkillAppearanceFailedSave(8);
      },
      CloudkillMbtMovementNextTargetSaveCheckpointAction: () => {
        state = cloudkillOrderedMovementNextTargetSaveCheckpoint();
      },
      CloudkillMbtOrderedMovementClosureAction: () => {
        state = resolvePendingDamage(
          resolvePendingSave(
            cloudkillOrderedMovementNextTargetSaveCheckpoint(),
            true,
            "movementDamage",
          ),
          2,
          "movementResolved",
        );
      },
      CloudkillMbtSourceConcentrationCheckpointAction: () => {
        state = cloudkillSourceConcentrationCheckpoint();
      },
      CloudkillMbtSourceConcentrationCancellationAction: () => {
        state = resolveSourceConcentrationSave(
          cloudkillSourceConcentrationCheckpoint(),
          false,
        );
      },
      CloudkillMbtStrongWindCleanupAction: () => {
        state = disperseWithStrongWind(castCloudkill(initialRuntimeState(5)));
      },
      getState: () => cloudkillMbtProjection(state),
      config: () => ({ nondetPath: ["qReplayAction"] }),
    };
  });
}

const cloudkillMbtStateCheck = stateCheck(
  normalizeCloudkillMbtQuintState,
  compareCloudkillMbtStates,
);

describe("Cloudkill area-hazard MBT parity", () => {
  it("projects the admitted RAW spell shape from the production reducer", () => {
    const projection = cloudkillMbtProjection(
      castCloudkill(initialRuntimeState(6)),
    );

    expect(projection).toMatchObject({
      actionAvailable: false,
      spellAvailable: false,
      hazardActive: true,
      casterConcentrating: true,
      slotLevel: 6,
      damageDice: 6,
      durationTicks: 100,
      radiusFeet: 20,
      heavilyObscured: true,
    });
  });

  it("retains table-supplied movement target order through both continuations", () => {
    let state = castCloudkill(initialRuntimeState(5));
    state = endCasterTurn(state);
    state = beginSourceTurnMovement(state, [secondaryTargetId, spellTargetId]);

    expect(cloudkillMbtProjection(state)).toMatchObject({
      lastMovementDistanceFeet: 10,
      pending: "savingThrow",
      pendingTarget: "secondary",
      remainingTarget: "primary",
    });

    state = resolvePendingSave(state, false, "movementDamage");
    state = resolvePendingDamage(state, 2, "movementResolved");
    expect(cloudkillMbtProjection(state)).toMatchObject({
      pending: "savingThrow",
      pendingTarget: "primary",
      remainingTarget: "none",
      secondarySavedThisTurn: false,
      secondaryHitPoints: 40,
    });

    state = resolvePendingSave(state, true, "movementDamage");
    state = resolvePendingDamage(state, 2, "movementResolved");
    expect(cloudkillMbtProjection(state)).toMatchObject({
      pending: "none",
      primarySavedThisTurn: true,
      secondarySavedThisTurn: true,
      primaryHitPoints: 35,
      secondaryHitPoints: 30,
    });
  });

  it(
    "connects the staged next-target save checkpoint to its literal witness",
    async () => {
      expect(
        cloudkillMbtProjection(
          cloudkillOrderedMovementNextTargetSaveCheckpoint(),
        ),
      ).toMatchObject({
        casterTurn: true,
        durationTicks: 100,
        lastMovementDistanceFeet: 10,
        pending: "savingThrow",
        pendingTarget: "primary",
        remainingTarget: "none",
        primarySavedThisTurn: false,
        secondarySavedThisTurn: false,
        primaryHitPoints: 40,
        secondaryHitPoints: 40,
        outcome: "movementSave",
      });

      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-cloudkill-area-hazard.mbt.qnt",
        ),
        init: "init",
        step: "doWitnessMovementNextTargetSaveCheckpoint",
        driver: createCloudkillMbtDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: cloudkillMbtStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it("cancels remaining movement targets when source damage breaks Concentration", () => {
    let state = castCloudkill(initialRuntimeState(5));
    state = endCasterTurn(state);
    state = beginSourceTurnMovement(state, [spellCasterId, secondaryTargetId]);
    state = resolvePendingSave(state, true, "movementDamage");
    state = resolvePendingDamage(state, 2, "movementResolved");

    expect(cloudkillMbtProjection(state)).toMatchObject({
      pending: "concentrationSavingThrow",
      pendingTarget: "source",
      remainingTarget: "secondary",
      casterHitPoints: 100,
      secondaryHitPoints: 40,
      outcome: "sourceConcentrationSave",
    });

    state = resolveSourceConcentrationSave(state, false);
    expect(cloudkillMbtProjection(state)).toMatchObject({
      hazardActive: false,
      casterConcentrating: false,
      pending: "none",
      remainingTarget: "none",
      casterHitPoints: 95,
      secondaryHitPoints: 40,
      outcome: "concentrationEnded",
    });
  });

  it("removes the hazard and obscurement when strong wind is supplied", () => {
    const dispersed = disperseWithStrongWind(
      castCloudkill(initialRuntimeState(5)),
    );

    expect(cloudkillMbtProjection(dispersed)).toMatchObject({
      hazardActive: false,
      casterConcentrating: false,
      durationTicks: 0,
      radiusFeet: 0,
      heavilyObscured: false,
      outcome: "strongWindEnded",
    });
  });

  it(
    "matches focused production Cloudkill traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-cloudkill-area-hazard.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createCloudkillMbtDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: cloudkillMbtStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(slotLevel: number): CloudkillMbtRuntimeState {
  const battle = cloudkillMbtBattle(slotLevel);
  return {
    battle: withBattleState(
      battle,
      battleStateWithCloudkillMbtCasterHitPoints(battle.state),
    ),
    configuredSlotLevel: slotLevel,
    pendingProcedure: null,
    lastMovementDistanceFeet: 0,
    remainingTarget: "none",
    savingThrowSucceeded: false,
    outcome: "init",
  };
}

function cloudkillMbtBattle(slotLevel: number): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [spellRecord(cloudkillUnitId)],
    spellSlots: [{ spellLevel: cloudkillSlotLevel(slotLevel), count: 1 }],
    targetHp: 40,
    targetMaxHp: 40,
    extraTargetIds: [secondaryTargetId],
    extraTargetHp: 40,
    extraTargetMaxHp: 40,
  });
}

function battleStateWithCloudkillMbtCasterHitPoints(
  state: BattleState,
): BattleState {
  const caster = state.combatants.get(spellCasterId);
  if (caster === undefined)
    throw new Error("Expected the Cloudkill MBT caster.");
  if (caster.positiveHpUnconscious !== null) {
    throw new Error("Expected a conscious positive-HP Cloudkill MBT caster.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      hp: Hp(100),
      maxHp: Hp(100),
    }),
  };
}

function castCloudkill(
  state: CloudkillMbtRuntimeState,
): CloudkillMbtRuntimeState {
  const act = spellAct({
    session: state.battle,
    spellId: cloudkillUnitId,
    slotLevel: state.configuredSlotLevel,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [cloudkillAreaFill(areaHole)],
    }),
    "Expected Cloudkill cast to resolve.",
  );
  return {
    ...state,
    battle: withBattleState(state.battle, resolved.state),
    outcome: "cast",
  };
}

function discoverAppearanceSave(
  state: CloudkillMbtRuntimeState,
): CloudkillMbtRuntimeState {
  const act = cloudkillAreaHazardSaveAct(
    state.battle,
    spellTargetId,
    "appearsInArea",
  );
  const result = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [],
  });
  requireNeedsHoles(result, "Expected Cloudkill appearance save frontier.");
  return {
    ...state,
    pendingProcedure: {
      kind: "appearance",
      state: state.battle.state,
      subject: act.subject,
      fills: [],
      result,
    },
    outcome: "appearanceSave",
  };
}

function endCasterTurn(
  state: CloudkillMbtRuntimeState,
): CloudkillMbtRuntimeState {
  const resolved = requireResolved(
    endTurn({ state: state.battle.state, actorId: spellCasterId }),
    "Expected Cloudkill target turn to begin.",
  );
  return {
    ...state,
    battle: withBattleState(state.battle, resolved.state),
    outcome: "targetTurn",
  };
}

function cloudkillAppearanceFailedSave(
  damageDiePip: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
): CloudkillMbtRuntimeState {
  return resolvePendingDamage(
    resolvePendingSave(
      discoverAppearanceSave(castCloudkill(initialRuntimeState(5))),
      false,
      "appearanceDamage",
    ),
    damageDiePip,
    "appearanceResolved",
  );
}

function cloudkillOrderedMovementNextTargetSaveCheckpoint(): CloudkillMbtRuntimeState {
  const movement = beginSourceTurnMovement(
    endCasterTurn(castCloudkill(initialRuntimeState(5))),
    [secondaryTargetId, spellTargetId],
  );
  return resolvePendingDamage(
    resolvePendingSave(movement, false, "movementDamage"),
    2,
    "movementResolved",
  );
}

function cloudkillSourceConcentrationCheckpoint(): CloudkillMbtRuntimeState {
  const movement = beginSourceTurnMovement(
    endCasterTurn(castCloudkill(initialRuntimeState(5))),
    [spellCasterId, secondaryTargetId],
  );
  return resolvePendingDamage(
    resolvePendingSave(movement, true, "movementDamage"),
    2,
    "movementResolved",
  );
}

function beginSourceTurnMovement(
  state: CloudkillMbtRuntimeState,
  orderedTargets: readonly CombatantId[],
): CloudkillMbtRuntimeState {
  let boundaryState = state.battle.state;
  let boundaryActorId = snapshotBattle(boundaryState).currentActorId;
  let frontier = endTurn({ state: boundaryState, actorId: boundaryActorId });
  while (frontier.tag === "resolved") {
    boundaryState = frontier.state;
    boundaryActorId = snapshotBattle(boundaryState).currentActorId;
    if (boundaryActorId === spellCasterId) {
      throw new Error(
        "Expected Cloudkill movement before the caster turn began.",
      );
    }
    frontier = endTurn({ state: boundaryState, actorId: boundaryActorId });
  }
  requireNeedsHoles(frontier, "Expected Cloudkill movement frontier.");
  const movementHole = requireResultHole(
    frontier,
    "persistentAreaSourceTurnTranslation",
  );
  expect(movementHole).toMatchObject({
    distanceFeet: movementFeet(10),
    directionRequirement: "awayFromSource",
    requiresTableSpatialFact: true,
  });
  const movementFill = persistentAreaSourceTurnTranslationFill(
    movementHole,
    orderedTargets,
  );
  const result = endTurn({
    state: boundaryState,
    actorId: boundaryActorId,
    fills: [movementFill],
  });
  const remainingTarget =
    orderedTargets.length === 2 ? targetRole(orderedTargets[1]) : "none";
  if (result.tag === "invalid") {
    throw new Error(`Cloudkill movement was invalid: ${result.message}`);
  }
  if (result.tag === "resolved") {
    return {
      ...state,
      battle: withBattleState(state.battle, result.state),
      lastMovementDistanceFeet: Number(movementHole.distanceFeet),
      remainingTarget: "none",
      outcome: "movementResolved",
    };
  }
  return {
    ...state,
    pendingProcedure: {
      kind: "movement",
      state: boundaryState,
      subject: result.subject,
      fills: [movementFill],
      result,
    },
    lastMovementDistanceFeet: Number(movementHole.distanceFeet),
    remainingTarget,
    outcome: "movementSave",
  };
}

function resolvePendingSave(
  state: CloudkillMbtRuntimeState,
  succeeded: boolean,
  outcome: Extract<CloudkillMbtOutcome, "appearanceDamage" | "movementDamage">,
): CloudkillMbtRuntimeState {
  const pending = requirePendingProcedure(state);
  const saveHole = cloudkillSaveHole(
    requireResultHole(pending.result, "savingThrowOutcome"),
  );
  const fill = singleTargetSavingThrowOutcomeFill(
    saveHole,
    saveHole.persistentAreaSaveDamage.targetId,
    succeeded,
  );
  const fills = [...pending.fills, fill];
  const result = submitPendingProcedure(pending, fills);
  requireNeedsHoles(result, "Expected Cloudkill damage or reaction frontier.");
  const hasFailedSaveInterrupt = result.holes.some(
    (hole) => hole.kind === "interruptDecision",
  );
  const damageFrontier = hasFailedSaveInterrupt
    ? declineCloudkillFailedSaveInterrupt(result)
    : result;
  if (!damageFrontier.holes.some((hole) => hole.kind === "rolledDice")) {
    throw new Error(
      `Expected Cloudkill damage frontier, got ${damageFrontier.holes.map((hole) => hole.kind).join(", ")}.`,
    );
  }
  return {
    ...state,
    pendingProcedure: {
      ...pending,
      state: hasFailedSaveInterrupt ? damageFrontier.state : pending.state,
      subject: hasFailedSaveInterrupt
        ? damageFrontier.subject
        : pending.subject,
      fills,
      result: damageFrontier,
    },
    savingThrowSucceeded: succeeded,
    outcome,
  };
}

function resolvePendingDamage(
  state: CloudkillMbtRuntimeState,
  damageDiePip: number,
  resolvedOutcome: Extract<
    CloudkillMbtOutcome,
    "appearanceResolved" | "movementResolved"
  >,
): CloudkillMbtRuntimeState {
  const pending = requirePendingProcedure(state);
  const damageHole = cloudkillDamageHole(
    requireResultHole(pending.result, "rolledDice"),
  );
  const dice = damageHole.persistentAreaSaveDamage.damage.expr.dice;
  const fill = damageRollFillWithGroups(damageHole, [
    Array.from({ length: dice }, () => damageDiePip),
  ]);
  const fills = [...pending.fills, fill];
  const result = submitPendingProcedure(pending, fills);
  if (result.tag === "invalid") {
    throw new Error(`Cloudkill damage was invalid: ${result.message}`);
  }
  if (result.tag === "resolved") {
    return {
      ...state,
      battle: withBattleState(state.battle, result.state),
      pendingProcedure: null,
      remainingTarget: "none",
      savingThrowSucceeded: false,
      outcome: resolvedOutcome,
    };
  }
  if (result.holes.some((hole) => hole.kind === "concentrationSavingThrow")) {
    return {
      ...state,
      pendingProcedure: { ...pending, fills, result },
      savingThrowSucceeded: false,
      outcome: "sourceConcentrationSave",
    };
  }
  const nextTarget = pendingTargetFromResult(result);
  return {
    ...state,
    pendingProcedure: {
      ...pending,
      fills,
      result,
    },
    remainingTarget: "none",
    savingThrowSucceeded: false,
    outcome:
      nextTarget === "none"
        ? resolvedOutcome
        : pending.kind === "appearance"
          ? "appearanceSave"
          : "movementSave",
  };
}

function resolveSourceConcentrationSave(
  state: CloudkillMbtRuntimeState,
  succeeded: boolean,
): CloudkillMbtRuntimeState {
  const pending = requirePendingProcedure(state);
  const concentrationHole = requireResultHole(
    pending.result,
    "concentrationSavingThrow",
  );
  const fills = [
    ...pending.fills,
    concentrationSavingThrowFill(concentrationHole, succeeded),
  ];
  const result = submitPendingProcedure(pending, fills);
  if (result.tag === "invalid") {
    throw new Error(
      `Cloudkill Concentration save was invalid: ${result.message}`,
    );
  }
  if (!succeeded) {
    if (result.tag !== "resolved") {
      throw new Error("Expected failed source Concentration to end Cloudkill.");
    }
    return {
      ...state,
      battle: withBattleState(state.battle, result.state),
      pendingProcedure: null,
      remainingTarget: "none",
      savingThrowSucceeded: false,
      outcome: "concentrationEnded",
    };
  }
  requireNeedsHoles(
    result,
    "Expected remaining Cloudkill movement target after maintained Concentration.",
  );
  if (!result.holes.some((hole) => hole.kind === "savingThrowOutcome")) {
    throw new Error("Expected the remaining Cloudkill movement save frontier.");
  }
  return {
    ...state,
    pendingProcedure: { ...pending, fills, result },
    remainingTarget: "none",
    savingThrowSucceeded: false,
    outcome: "movementSave",
  };
}

function disperseWithStrongWind(
  state: CloudkillMbtRuntimeState,
): CloudkillMbtRuntimeState {
  const act = discoverBattleActs(state.battle).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "endPersistentAreaSaveDamageForEnvironment",
  );
  if (act === undefined) {
    throw new Error("Expected active Cloudkill strong-wind dispersal act.");
  }
  const windHole = requireHole(act.initialHoles, "areaWindStrength");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [
        {
          kind: "areaWindStrength",
          holeId: windHole.holeId,
          value: { kind: "strong" },
        },
      ],
    }),
    "Expected strong wind to disperse Cloudkill.",
  );
  return {
    ...state,
    battle: withBattleState(state.battle, resolved.state),
    outcome: "strongWindEnded",
  };
}

function cloudkillMbtProjection(
  state: CloudkillMbtRuntimeState,
): CloudkillMbtProjection {
  const battleState =
    state.pendingProcedure?.result.state ?? state.battle.state;
  const battle = withBattleState(state.battle, battleState);
  const snapshot =
    state.pendingProcedure?.result.snapshot ?? snapshotBattle(battleState);
  const effect = activeCloudkill(battleState);
  const casterSnapshot = snapshot.combatants.find(
    (combatant) => combatant.combatantId === spellCasterId,
  );
  if (casterSnapshot === undefined) {
    throw new Error("Expected the Cloudkill caster snapshot.");
  }
  const savedThisTurn = effect?.savedThisTurn ?? [];
  const pendingTarget =
    state.pendingProcedure === null
      ? "none"
      : pendingTargetFromResult(state.pendingProcedure.result);
  return {
    casterTurn:
      state.pendingProcedure?.kind === "movement" ||
      snapshot.currentActorId === spellCasterId,
    actionAvailable: canSpendAction(battleState.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        session: battle,
        spellId: cloudkillUnitId,
        slotLevel: state.configuredSlotLevel,
      }) !== undefined,
    hazardActive: effect !== undefined,
    casterConcentrating: effect !== undefined && casterSnapshot.concentrating,
    slotLevel: state.configuredSlotLevel,
    damageDice: effect?.damage.expr.dice ?? 0,
    durationTicks:
      effect?.expiresAt.kind === "concentration"
        ? Number(effect.expiresAt.durationTicks)
        : 0,
    radiusFeet: effect === undefined ? 0 : Number(effect.radiusFeet),
    heavilyObscured: battleObscurementZones(battleState).some(
      (zone) =>
        zone.kind === "spellObscurementZone" &&
        zone.obscurement === "heavilyObscured" &&
        zone.area.areaId === effect?.areaId,
    ),
    sourceSavedThisTurn: savedThisTurn.includes(spellCasterId),
    primarySavedThisTurn: savedThisTurn.includes(spellTargetId),
    secondarySavedThisTurn: savedThisTurn.includes(secondaryTargetId),
    casterHitPoints: snapshotHitPoints(snapshot, spellCasterId),
    primaryHitPoints: snapshotHitPoints(snapshot, spellTargetId),
    secondaryHitPoints: snapshotHitPoints(snapshot, secondaryTargetId),
    lastMovementDistanceFeet: state.lastMovementDistanceFeet,
    pending: pendingPhase(state.pendingProcedure?.result),
    pendingTarget,
    remainingTarget: state.remainingTarget,
    savingThrowSucceeded: state.savingThrowSucceeded,
    outcome: state.outcome,
  };
}

function snapshotHitPoints(
  snapshot: ReturnType<typeof snapshotBattle>,
  targetId: CombatantId,
): number {
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (target === undefined)
    throw new Error("Expected Cloudkill target snapshot.");
  return Number(target.hp);
}

function activeCloudkill(state: BattleState): CloudkillEffect | undefined {
  return [...state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (effect): effect is CloudkillEffect =>
        effect.kind === "persistentAreaSaveDamage" &&
        effect.sourceCombatantId === spellCasterId,
    );
}

function pendingPhase(
  result: BattleResolutionResult | undefined,
): CloudkillMbtPending {
  if (result === undefined || result.tag === "resolved") return "none";
  if (result.tag === "invalid") {
    throw new Error(`Unexpected invalid Cloudkill frontier: ${result.message}`);
  }
  if (result.holes.some((hole) => hole.kind === "savingThrowOutcome")) {
    return "savingThrow";
  }
  if (result.holes.some((hole) => hole.kind === "rolledDice")) {
    return "damage";
  }
  if (result.holes.some((hole) => hole.kind === "concentrationSavingThrow")) {
    return "concentrationSavingThrow";
  }
  throw new Error(
    "Expected a Cloudkill save, damage, or Concentration frontier.",
  );
}

function pendingTargetFromResult(
  result: BattleResolutionResult,
): CloudkillMbtTarget {
  if (result.tag !== "needsHoles") return "none";
  if (result.holes.some((hole) => hole.kind === "concentrationSavingThrow")) {
    return "source";
  }
  const save = result.holes.find(
    (hole): hole is BattleCloudkillAreaHazardSavingThrowOutcomeHole =>
      hole.kind === "savingThrowOutcome" && "persistentAreaSaveDamage" in hole,
  );
  if (save !== undefined) {
    return targetRole(save.persistentAreaSaveDamage.targetId);
  }
  const damage = result.holes.find(
    (hole): hole is BattleCloudkillAreaHazardDamageRollHole =>
      hole.kind === "rolledDice" && "persistentAreaSaveDamage" in hole,
  );
  return damage === undefined
    ? "none"
    : targetRole(damage.persistentAreaSaveDamage.targetId);
}

function targetRole(targetId: CombatantId | undefined): CloudkillMbtTarget {
  if (targetId === spellCasterId) return "source";
  if (targetId === spellTargetId) return "primary";
  if (targetId === secondaryTargetId) return "secondary";
  return "none";
}

function persistentAreaSourceTurnTranslationFill(
  hole: BattleCloudkillMovementHole,
  affectedCombatantIdsInResolutionOrder: readonly CombatantId[],
): BattleCloudkillMovementFill {
  return {
    kind: "persistentAreaSourceTurnTranslation",
    holeId: hole.holeId,
    value: { affectedCombatantIdsInResolutionOrder },
  };
}

function cloudkillSaveHole(
  hole: Extract<
    import("./index.ts").BattleHole,
    { readonly kind: "savingThrowOutcome" }
  >,
): BattleCloudkillAreaHazardSavingThrowOutcomeHole {
  if (!("persistentAreaSaveDamage" in hole)) {
    throw new Error("Expected Cloudkill saving throw hole.");
  }
  return hole;
}

function cloudkillDamageHole(
  hole: Extract<
    import("./index.ts").BattleHole,
    { readonly kind: "rolledDice" }
  >,
): BattleCloudkillAreaHazardDamageRollHole {
  if (!("persistentAreaSaveDamage" in hole)) {
    throw new Error("Expected Cloudkill damage roll hole.");
  }
  return hole;
}

function submitPendingProcedure(
  pending: CloudkillPendingProcedure,
  fills: readonly BattleFill[],
): BattleResolutionResult {
  return resolveBattleSubject({
    state: pending.state,
    subject: pending.subject,
    fills,
  });
}

function declineCloudkillFailedSaveInterrupt(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  const decisionHole = requireResultHole(result, "interruptDecision");
  expect("pendingInterrupt" in result.snapshot).toBe(false);
  const responder = battleFrontierInterruptDecisionForState(result.state)
    ?.choices[0];
  if (responder === undefined) {
    throw new Error("Expected a Cloudkill failed-save reaction responder.");
  }
  const declined = resolveBattleInterrupt({
    state: result.state,
    fill: interruptDecisionFill(decisionHole, {
      kind: "decline",
      responderId: responder.reactorId,
    }),
  });
  requireNeedsHoles(declined, "Expected damage after declining the reaction.");
  return declined;
}

function requirePendingProcedure(
  state: CloudkillMbtRuntimeState,
): CloudkillPendingProcedure {
  if (state.pendingProcedure === null) {
    throw new Error("Expected pending Cloudkill procedure.");
  }
  return state.pendingProcedure;
}

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): asserts result is Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
> {
  if (result.tag !== "needsHoles") throw new Error(message);
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") throw new Error(message);
  return result;
}

function withBattleState(
  session: BattleRuntimeSession,
  state: BattleState,
): BattleRuntimeSession {
  return battleRuntimeSessionForTest({ ...session, state });
}

function cloudkillSlotLevel(slotLevel: number): 5 | 6 {
  if (slotLevel === 5 || slotLevel === 6) return slotLevel;
  throw new Error(
    `Expected Cloudkill MBT slot level 5 or 6, got ${slotLevel}.`,
  );
}

const CLOUDKILL_OUTCOME_BY_QUINT_TAG: Readonly<
  Record<string, CloudkillMbtOutcome>
> = {
  CloudkillMbtInit: "init",
  CloudkillMbtCast: "cast",
  CloudkillMbtAppearanceSave: "appearanceSave",
  CloudkillMbtAppearanceDamage: "appearanceDamage",
  CloudkillMbtAppearanceResolved: "appearanceResolved",
  CloudkillMbtTargetTurn: "targetTurn",
  CloudkillMbtMovementSave: "movementSave",
  CloudkillMbtMovementDamage: "movementDamage",
  CloudkillMbtSourceConcentrationSave: "sourceConcentrationSave",
  CloudkillMbtMovementResolved: "movementResolved",
  CloudkillMbtConcentrationEnded: "concentrationEnded",
  CloudkillMbtStrongWindEnded: "strongWindEnded",
};

const CLOUDKILL_TARGET_BY_QUINT_TAG: Readonly<
  Record<string, CloudkillMbtTarget>
> = {
  NoCloudkillMbtTarget: "none",
  SourceCloudkillMbtTarget: "source",
  PrimaryCloudkillMbtTarget: "primary",
  SecondaryCloudkillMbtTarget: "secondary",
};

const CLOUDKILL_PENDING_BY_QUINT_TAG: Readonly<
  Record<string, CloudkillMbtPending>
> = {
  CloudkillMbtNoPending: "none",
  CloudkillMbtSavingThrowPending: "savingThrow",
  CloudkillMbtConcentrationSavingThrowPending: "concentrationSavingThrow",
};

function normalizeCloudkillMbtQuintState(raw: unknown): CloudkillMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  return {
    casterTurn: booleanField(state, "qCasterTurn"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    hazardActive: booleanField(state, "qHazardActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    slotLevel: quintIntField(state, "qSlotLevel"),
    damageDice: quintIntField(state, "qDamageDice"),
    durationTicks: quintIntField(state, "qDurationTicks"),
    radiusFeet: quintIntField(state, "qRadiusFeet"),
    heavilyObscured: booleanField(state, "qHeavilyObscured"),
    sourceSavedThisTurn: booleanField(state, "qSourceSavedThisTurn"),
    primarySavedThisTurn: booleanField(state, "qPrimarySavedThisTurn"),
    secondarySavedThisTurn: booleanField(state, "qSecondarySavedThisTurn"),
    casterHitPoints: quintIntField(state, "qCasterHitPoints"),
    primaryHitPoints: quintIntField(state, "qPrimaryHitPoints"),
    secondaryHitPoints: quintIntField(state, "qSecondaryHitPoints"),
    lastMovementDistanceFeet: quintIntField(state, "qLastMovementDistanceFeet"),
    pending: quintVariantValue(
      state["qPending"],
      "qPending",
      CLOUDKILL_PENDING_BY_QUINT_TAG,
    ),
    pendingTarget: quintVariantValue(
      state["qPendingTarget"],
      "qPendingTarget",
      CLOUDKILL_TARGET_BY_QUINT_TAG,
    ),
    remainingTarget: quintVariantValue(
      state["qRemainingTarget"],
      "qRemainingTarget",
      CLOUDKILL_TARGET_BY_QUINT_TAG,
    ),
    savingThrowSucceeded: booleanField(state, "qSavingThrowSucceeded"),
    outcome: quintVariantValue(
      state["qOutcome"],
      "qOutcome",
      CLOUDKILL_OUTCOME_BY_QUINT_TAG,
    ),
  };
}

function quintIntField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): number {
  return numberFromQuintInt(state[field], field);
}

function quintVariantValue<Value extends string>(
  raw: unknown,
  field: string,
  values: Readonly<Record<string, Value>>,
): Value {
  const tag = quintVariantTag(raw, field);
  const value = values[tag];
  if (value === undefined) {
    throw new Error(`Unexpected Quint ${field} variant ${tag}.`);
  }
  return value;
}

function compareCloudkillMbtStates(
  quint: CloudkillMbtProjection,
  runtime: CloudkillMbtProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nruntime=${JSON.stringify(runtime)}\nquint=${JSON.stringify(quint)}`,
      );
    }
    throw error;
  }
  return true;
}
