// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
  stringLiteralValue,
  type MbtWitnessLastResult,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  characterSeed,
  deathSavingThrowFill,
  fighterId,
  findHole,
  startBattleSessionRight,
} from "./battle-runtime.test-support.ts";
import {
  battleId,
  characterId,
  combatantId,
  currentBattleCheckpointFrontierEnvelope,
  resolveBattleRuntimeSubject,
  type CharacterBattleCombatantInit,
  type BattleFill,
  type BattleHole,
  type BattleSubject,
  type BattleRuntimeSession,
  type CombatantId,
} from "./index.ts";

// Runtime path: the session fixture is created through `startBattleSessionRight`;
// the end-turn command and fills use `resolveBattleRuntimeSubject`, and the
// public checkpoint/frontier envelope supplies the ownership projection.

type DeathSavingThrowMbtHole = "DeathSavingThrow";
type DeathSavingThrowMbtLastResult = MbtWitnessLastResult;
const DEATH_SAVING_THROW_NO_INVALID_REASON = "";
const DEATH_SAVING_THROW_MBT_LAST_INVALID_REASONS = [
  DEATH_SAVING_THROW_NO_INVALID_REASON,
  "invalidFill",
  "staleSubject",
  "wrongActor",
] as const;
type DeathSavingThrowMbtLastInvalidReason =
  (typeof DEATH_SAVING_THROW_MBT_LAST_INVALID_REASONS)[number];
const DEATH_SAVING_THROW_MBT_TURN_ROLES = ["actor", "target"] as const;
type DeathSavingThrowMbtTurnRole =
  (typeof DEATH_SAVING_THROW_MBT_TURN_ROLES)[number];

type DeathSavingThrowMbtFrontier =
  | { readonly kind: "noHoleFrontier" }
  | {
      readonly kind: "ordinaryHoleFrontier";
      readonly replayRootOwner: DeathSavingThrowMbtTurnRole;
      readonly pendingProcedureOwner: DeathSavingThrowMbtTurnRole;
      readonly request: "startTurnDeathSavingThrow";
    };

type DeathSavingThrowMbtProjection = {
  readonly currentTurnRole: DeathSavingThrowMbtTurnRole;
  readonly frontier: DeathSavingThrowMbtFrontier;
  readonly targetHp: number;
  readonly targetUnconscious: boolean;
  readonly targetStable: boolean;
  readonly targetDead: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly holes: readonly DeathSavingThrowMbtHole[];
  readonly lastResult: DeathSavingThrowMbtLastResult;
  readonly lastInvalidReason: DeathSavingThrowMbtLastInvalidReason;
};

const deathSavingThrowTargetId = combatantId("death-saving-throw-target");

const deathSavingThrowDriverSchema = {
  init: {},
  doDiscoverEndTurnDeathSavingThrow: {},
  doFillDeathSavingThrow: {
    roll: mbtPickSchemas.int,
  },
  doRejectWrongActorEndTurnAfterResolved: {},
  step: {},
} as const;

function createDeathSavingThrowDriver() {
  return defineDriver(deathSavingThrowDriverSchema, () => {
    const initialSession = deathSavingThrowBattle();
    const subject = endTurnSubject();
    let session = initialSession;
    let envelope = currentBattleCheckpointFrontierEnvelope(session);
    let fills: readonly BattleFill[] = [];
    let lastResult: DeathSavingThrowMbtLastResult = "init";
    let lastInvalidReason: DeathSavingThrowMbtLastInvalidReason =
      DEATH_SAVING_THROW_NO_INVALID_REASON;

    function reset(): void {
      session = deathSavingThrowBattle();
      envelope = currentBattleCheckpointFrontierEnvelope(session);
      fills = [];
      lastResult = "init";
      lastInvalidReason = DEATH_SAVING_THROW_NO_INVALID_REASON;
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      const result = resolveBattleRuntimeSubject({ session, subject, fills });
      session = result.session;
      envelope = result.envelope;
      lastResult = result.tag;
      lastInvalidReason =
        result.tag === "invalid"
          ? deathSavingThrowInvalidReason(result.reason)
          : DEATH_SAVING_THROW_NO_INVALID_REASON;
    }

    function fillDeathSavingThrow(roll: number): void {
      const holes = battleRuntimeHoles(envelope);
      const deathSavingThrow = findHole(holes, "deathSavingThrow");
      submit([deathSavingThrowFill(deathSavingThrow, roll)]);
    }

    return {
      init: reset,
      doDiscoverEndTurnDeathSavingThrow: () => {
        submit([]);
      },
      doFillDeathSavingThrow: ({ roll }) => {
        fillDeathSavingThrow(roll);
      },
      doRejectWrongActorEndTurnAfterResolved: () => {
        submit(fills);
      },
      step: () => {},
      getState: () =>
        projectDeathSavingThrowMbtState({
          envelope,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

const deathSavingThrowStateCheck = stateCheck(
  normalizeDeathSavingThrowQuintState,
  (
    spec: DeathSavingThrowMbtProjection,
    impl: DeathSavingThrowMbtProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Death Saving Throw MBT parity", () => {
  it(
    "replays start-turn Death Saving Throw holes for a Character Build combatant",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-death-saving-throw.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDeathSavingThrowDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: deathSavingThrowStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeDeathSavingThrowQuintState(
  raw: unknown,
): DeathSavingThrowMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: DEATH_SAVING_THROW_NO_INVALID_REASON,
    decodeHole: deathSavingThrowHoleName,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    currentTurnRole: stringLiteralValue(
      quintField(state, "currentTurnRole"),
      "qState.currentTurnRole",
      DEATH_SAVING_THROW_MBT_TURN_ROLES,
    ),
    frontier: normalizeDeathSavingThrowFrontier(quintField(state, "frontier")),
    targetHp: numberFromQuintInt(
      quintField(state, "targetHp"),
      "qState.targetHp",
    ),
    targetUnconscious: booleanField(state, "targetUnconscious"),
    targetStable: booleanField(state, "targetStable"),
    targetDead: booleanField(state, "targetDead"),
    targetDeathSuccesses: numberFromQuintInt(
      quintField(state, "targetDeathSuccesses"),
      "qState.targetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      quintField(state, "targetDeathFailures"),
      "qState.targetDeathFailures",
    ),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
    lastInvalidReason: stringLiteralValue(
      protocol.lastInvalidReason,
      "qState.protocol.result",
      DEATH_SAVING_THROW_MBT_LAST_INVALID_REASONS,
    ),
  };
}

function projectDeathSavingThrowMbtState(input: {
  readonly envelope: ReturnType<typeof currentBattleCheckpointFrontierEnvelope>;
  readonly lastResult: DeathSavingThrowMbtLastResult;
  readonly lastInvalidReason: DeathSavingThrowMbtLastInvalidReason;
}): DeathSavingThrowMbtProjection {
  const snapshot = input.envelope.checkpoint;
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === deathSavingThrowTargetId,
  );
  if (target == null) {
    throw new Error("Expected Death Saving Throw target in battle snapshot.");
  }
  if (target.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    throw new Error("Expected target to use Death Saving Throws.");
  }

  return {
    currentTurnRole:
      snapshot.currentActorId === deathSavingThrowTargetId ? "target" : "actor",
    frontier: projectDeathSavingThrowFrontier(input.envelope),
    targetHp: target.hp,
    targetUnconscious: target.conditions.includes("unconscious"),
    targetStable: target.zeroHpLifecycle.stable,
    targetDead: target.zeroHpLifecycle.dead,
    targetDeathSuccesses: target.zeroHpLifecycle.deathSaves.successes,
    targetDeathFailures: target.zeroHpLifecycle.deathSaves.failures,
    holes: projectDeathSavingThrowHoles(battleRuntimeHoles(input.envelope)),
    lastResult: input.lastResult,
    lastInvalidReason: stringLiteralValue(
      input.lastInvalidReason,
      "lastInvalidReason",
      DEATH_SAVING_THROW_MBT_LAST_INVALID_REASONS,
    ),
  };
}

function normalizeDeathSavingThrowFrontier(
  raw: unknown,
): DeathSavingThrowMbtFrontier {
  const tag = quintVariantTag(raw, "qState.frontier");
  if (tag === "NoHoleFrontier") {
    return { kind: "noHoleFrontier" };
  }
  if (tag !== "OrdinaryHoleFrontier") {
    throw new Error(`Unexpected qState.frontier variant ${tag}.`);
  }
  const value = quintRecordField(
    {
      value: quintVariantValue(raw, "OrdinaryHoleFrontier", "qState.frontier"),
    },
    "value",
  );
  const request = quintVariantTag(
    quintField(value, "request"),
    "qState.frontier.request",
  );
  if (request !== "StartTurnDeathSavingThrow") {
    throw new Error(`Unexpected qState.frontier.request variant ${request}.`);
  }
  return {
    kind: "ordinaryHoleFrontier",
    replayRootOwner: stringLiteralValue(
      quintField(value, "replayRootOwner"),
      "qState.frontier.replayRootOwner",
      DEATH_SAVING_THROW_MBT_TURN_ROLES,
    ),
    pendingProcedureOwner: stringLiteralValue(
      quintField(value, "pendingProcedureOwner"),
      "qState.frontier.pendingProcedureOwner",
      DEATH_SAVING_THROW_MBT_TURN_ROLES,
    ),
    request: "startTurnDeathSavingThrow",
  };
}

function deathSavingThrowInvalidReason(
  reason: string,
): DeathSavingThrowMbtLastInvalidReason {
  if (
    reason === "" ||
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }
  throw new Error(`Unexpected Death Saving Throw invalid reason ${reason}.`);
}

function projectDeathSavingThrowFrontier(
  envelope: ReturnType<typeof currentBattleCheckpointFrontierEnvelope>,
): DeathSavingThrowMbtFrontier {
  if (envelope.frontier.kind !== "holes") {
    return { kind: "noHoleFrontier" };
  }
  const replaySubject = envelope.frontier.replaySubject;
  if (
    replaySubject.tag !== "runtimeCommand" ||
    replaySubject.command !== "endTurn"
  ) {
    throw new Error(
      "Expected Death Saving Throw replay subject to be End Turn.",
    );
  }
  const pendingProcedure = envelope.frontier.pendingProcedure;
  if (
    pendingProcedure.kind !== "turnBoundary" ||
    pendingProcedure.request.kind !== "startTurnOccurrence" ||
    pendingProcedure.request.occurrence.kind !== "deathSavingThrow"
  ) {
    throw new Error(
      "Expected Death Saving Throw frontier to expose its start-turn occurrence procedure.",
    );
  }
  return {
    kind: "ordinaryHoleFrontier",
    replayRootOwner: roleForCombatant(replaySubject.actorId),
    pendingProcedureOwner: roleForCombatant(
      pendingProcedure.sourceTurn.actorId,
    ),
    request: "startTurnDeathSavingThrow",
  };
}

function roleForCombatant(
  combatantId: CombatantId,
): DeathSavingThrowMbtTurnRole {
  return combatantId === deathSavingThrowTargetId ? "target" : "actor";
}

function battleRuntimeHoles(
  envelope: ReturnType<typeof currentBattleCheckpointFrontierEnvelope>,
): readonly BattleHole[] {
  return envelope.frontier.kind === "holes" ? envelope.frontier.holes : [];
}

function deathSavingThrowBattle(): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle-runtime-mbt-death-saving-throw"),
    combatants: [
      deathSavingThrowCharacterSeed({
        combatantId: fighterId,
        characterId: "death-saving-throw-actor-character",
        displayName: "Actor",
        initiative: 20,
        currentHp: 12,
      }),
      deathSavingThrowCharacterSeed({
        combatantId: deathSavingThrowTargetId,
        characterId: "death-saving-throw-target-character",
        displayName: "Target",
        initiative: 10,
        currentHp: 0,
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            deathSaves: { successes: 2, failures: 1 },
            stable: false,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    ],
  });
}

function deathSavingThrowCharacterSeed(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
  readonly currentHp: number;
  readonly zeroHpLifecycle?: Extract<
    CharacterBattleCombatantInit["creatureInit"],
    { readonly kind: "character" }
  >["zeroHpLifecycle"];
}): ReturnType<typeof characterSeed> {
  const seed = characterSeed({
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    currentHp: input.currentHp,
    zeroHpLifecycle: input.zeroHpLifecycle,
    selectedLoadout: {},
    attack: null,
  });
  if (seed.creatureInit.kind !== "character") {
    throw new Error("Expected Death Saving Throw fixture to be a character.");
  }

  return {
    ...seed,
    creatureInit: {
      ...seed.creatureInit,
      characterId: characterId(input.characterId),
    },
  };
}

function endTurnSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" };
}

function projectDeathSavingThrowHoles(
  holes: readonly BattleHole[],
): readonly DeathSavingThrowMbtHole[] {
  return holes.map(projectDeathSavingThrowHole).sort();
}

function projectDeathSavingThrowHole(
  hole: BattleHole,
): DeathSavingThrowMbtHole {
  if (hole.kind === "deathSavingThrow") {
    return "DeathSavingThrow";
  }

  throw new Error(`Unexpected Death Saving Throw MBT hole: ${hole.kind}`);
}

function deathSavingThrowHoleName(raw: unknown): DeathSavingThrowMbtHole {
  const tag = quintVariantTag(raw);
  if (tag === "DeathSavingThrow") {
    return tag;
  }

  throw new Error(`Unknown Quint Death Saving Throw hole variant: ${tag}`);
}
