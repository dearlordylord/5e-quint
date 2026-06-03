// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

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
  type BattleResolutionResult,
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
type DeathSavingThrowMbtLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "invalid";
type DeathSavingThrowMbtLastInvalidReason =
  | ""
  | "invalidFill"
  | "staleSubject"
  | "wrongActor";
type DeathSavingThrowMbtTurnRole = "actor" | "target";

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
  doFillDeathSavingThrowNaturalOne: {},
  doFillDeathSavingThrowFailure: {},
  doFillDeathSavingThrowSuccess: {},
  doFillDeathSavingThrowNaturalTwenty: {},
  doRejectWrongActorEndTurnAfterResolved: {},
  step: {},
} as const;

function createDeathSavingThrowDriver() {
  return defineDriver(deathSavingThrowDriverSchema, () => {
    let state = deathSavingThrowBattle();
    const subject = endTurnSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let lastResult: DeathSavingThrowMbtProjection["lastResult"] = "init";
    let lastInvalidReason: DeathSavingThrowMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = deathSavingThrowBattle();
      fills = [];
      holes = [];
      lastResult = "init";
      lastInvalidReason = "";
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = deathSavingThrowMbtInvalidReason(result.reason);
    }

    function fillDeathSavingThrow(roll: number): void {
      const deathSavingThrow = findHole(holes, "deathSavingThrow");
      submit([deathSavingThrowFill(deathSavingThrow, roll)]);
    }

    return {
      init: reset,
      doDiscoverEndTurnDeathSavingThrow: () => {
        submit([]);
      },
      doFillDeathSavingThrowNaturalOne: () => {
        fillDeathSavingThrow(1);
      },
      doFillDeathSavingThrowFailure: () => {
        fillDeathSavingThrow(5);
      },
      doFillDeathSavingThrowSuccess: () => {
        fillDeathSavingThrow(10);
      },
      doFillDeathSavingThrowNaturalTwenty: () => {
        fillDeathSavingThrow(20);
      },
      doRejectWrongActorEndTurnAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectDeathSavingThrowMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
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
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-death-saving-throw.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDeathSavingThrowDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: deathSavingThrowStateCheck,
    });
  }, 120_000);
});

function normalizeDeathSavingThrowQuintState(
  raw: unknown,
): DeathSavingThrowMbtProjection {
  const state = quintStateRecord(raw);

  return {
    currentTurnRole: deathSavingThrowMbtTurnRole(
      state["qCurrentTurnRole"],
      "qCurrentTurnRole",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetStable: booleanField(state, "qTargetStable"),
    targetDead: booleanField(state, "qTargetDead"),
    targetDeathSuccesses: numberFromQuintInt(
      state["qTargetDeathSuccesses"],
      "qTargetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      state["qTargetDeathFailures"],
      "qTargetDeathFailures",
    ),
    holes: quintHoleSet(state["qHoles"]).map(deathSavingThrowHoleName).sort(),
    lastResult: deathSavingThrowMbtLastResult(state["qLastResult"]),
    lastInvalidReason: deathSavingThrowMbtLastInvalidReason(
      state["qLastInvalidReason"],
    ),
  };
}

function projectDeathSavingThrowMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: DeathSavingThrowMbtProjection["lastResult"];
  readonly lastInvalidReason: DeathSavingThrowMbtProjection["lastInvalidReason"];
}): DeathSavingThrowMbtProjection {
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
    lastInvalidReason: input.lastInvalidReason,
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

function deathSavingThrowMbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): DeathSavingThrowMbtProjection["lastInvalidReason"] {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected Death Saving Throw invalid reason: ${reason}`);
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

function deathSavingThrowMbtTurnRole(
  raw: unknown,
  field: string,
): DeathSavingThrowMbtTurnRole {
  if (raw === "actor" || raw === "target") {
    return raw;
  }

  throw new Error(`Expected Death Saving Throw MBT turn role field ${field}.`);
}

function focusedMbtMaxSteps(domainMaxSteps: number): number {
  const requestedSteps = Number(process.env["MBT_STEPS"] ?? domainMaxSteps);
  return Math.min(requestedSteps, domainMaxSteps);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "bigint") {
    return Number(raw);
  }

  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }

  throw new Error("Expected Quint qHoles field to be a Set.");
}

function deathSavingThrowMbtLastResult(
  raw: unknown,
): DeathSavingThrowMbtLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "invalid"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last result: ${String(raw)}.`);
}

function deathSavingThrowMbtLastInvalidReason(
  raw: unknown,
): DeathSavingThrowMbtLastInvalidReason {
  if (
    raw === "" ||
    raw === "invalidFill" ||
    raw === "staleSubject" ||
    raw === "wrongActor"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint invalid reason: ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
}

function quintVariantTag(raw: unknown): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") {
    return raw["tag"];
  }

  if (typeof raw === "string") {
    return raw;
  }

  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
