// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  createBattleSubjectResolutionRecorder,
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
  run,
  stateCheck,
  stringLiteralValue,
  type BattleResolutionRecorderSnapshot,
  type MbtWitnessLastResult,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  characterSeed,
  deathSavingThrowFill,
  fighterId,
  findHole,
  startBattleRight,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  characterId,
  combatantId,
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

// Production path: character fixtures enter `startBattle` through
// `startBattleRight`; the end-turn runtime command is submitted through
// `resolveBattleSubject` from `./index.ts`; Death Saving Throw holes are filled
// through the production subject resolver, and the resulting `BattleState`
// mutation is observed with `snapshotBattle`.

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

type DeathSavingThrowMbtProjection = {
  readonly currentTurnRole: DeathSavingThrowMbtTurnRole;
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
    const initialState = deathSavingThrowBattle();
    const subject = endTurnSubject();
    const recorder = createBattleSubjectResolutionRecorder({
      initialState,
      subject,
      noInvalidReason: DEATH_SAVING_THROW_NO_INVALID_REASON,
    });
    let fills: readonly BattleFill[] = [];

    function reset(): void {
      recorder.reset(deathSavingThrowBattle());
      fills = [];
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      recorder.submit(fills);
    }

    function fillDeathSavingThrow(roll: number): void {
      const { holes } = recorder.snapshot();
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
        const snapshot = recorder.snapshot();
        recorder.record(
          resolveBattleSubject({ state: snapshot.state, subject, fills }),
        );
      },
      step: () => {},
      getState: () =>
        projectDeathSavingThrowMbtState(recorder.snapshot()),
    };
  });
}

const deathSavingThrowStateCheck = stateCheck(
  normalizeDeathSavingThrowQuintState,
  (spec: DeathSavingThrowMbtProjection, impl: DeathSavingThrowMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Death Saving Throw MBT parity", () => {
  it("replays start-turn Death Saving Throw holes for a Character Build combatant", async () => {
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
  }, MBT_TEST_TIMEOUT_MS);
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

function projectDeathSavingThrowMbtState(
  input: BattleResolutionRecorderSnapshot<
    typeof DEATH_SAVING_THROW_NO_INVALID_REASON
  >,
): DeathSavingThrowMbtProjection {
  const snapshot = snapshotBattle(input.state);
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
    targetHp: target.hp,
    targetUnconscious: target.conditions.includes("unconscious"),
    targetStable: target.zeroHpLifecycle.stable,
    targetDead: target.zeroHpLifecycle.dead,
    targetDeathSuccesses: target.zeroHpLifecycle.deathSaves.successes,
    targetDeathFailures: target.zeroHpLifecycle.deathSaves.failures,
    holes: projectDeathSavingThrowHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: stringLiteralValue(
      input.lastInvalidReason,
      "lastInvalidReason",
      DEATH_SAVING_THROW_MBT_LAST_INVALID_REASONS,
    ),
  };
}

function deathSavingThrowBattle(): BattleState {
  return startBattleRight({
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
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["zeroHpLifecycle"];
}): BattleCreatureInit {
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
