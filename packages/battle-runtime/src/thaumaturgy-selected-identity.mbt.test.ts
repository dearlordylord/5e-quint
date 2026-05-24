// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy
// UNIT-IDENTITY-MBT-REPLAY: L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy doResolveThaumaturgyBoomingVoice
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleId,
  cantripSpellInvocationRef,
  characterSeed,
  discoverBattleActs,
  fighterId,
  findAct,
  findHole,
  requiredAbilityCheckRollMode,
  requireResolved,
  startBattleRight,
  statBlockCreatureInit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "./index.ts";

const thaumaturgySelectedIdentityDriverSchema = {
  init: {},
  doResolveThaumaturgyBoomingVoice: {},
  step: {},
} as const;
type ThaumaturgySelectedIdentityDriverAction = Exclude<
  keyof typeof thaumaturgySelectedIdentityDriverSchema,
  "init" | "step"
>;

type ThaumaturgySelectedIdentityProjection = {
  readonly casterEffectCount: number;
  readonly actionAvailable: boolean;
  readonly intimidationRollMode: BattleRollMode;
  readonly wisdomIntimidationRollMode: BattleRollMode;
  readonly perceptionRollMode: BattleRollMode;
  readonly lastResult: "init" | "resolved";
};
type BattleRollMode = "normal" | "advantage" | "disadvantage";
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ThaumaturgySelectedIdentityDriverAction[];
  readonly expected: ThaumaturgySelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-THAUMATURGY-BOOMING-VOICE";
  readonly unitId: "thaumaturgy";
  readonly actions: readonly ThaumaturgySelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const thaumaturgySubject = {
  tag: "actionSpell" as const,
  actorId: fighterId,
  invocation: cantripSpellInvocationRef(
    "thaumaturgy",
    "thaumaturgyBoomingVoice",
  ),
  mode: { tag: "cast" as const },
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-THAUMATURGY-BOOMING-VOICE",
    unitId: "thaumaturgy",
    actions: ["doResolveThaumaturgyBoomingVoice"],
    sequences: [
      {
        name: "booming-voice-projects-charisma-intimidation-advantage",
        actions: ["doResolveThaumaturgyBoomingVoice"],
        expected: {
          casterEffectCount: 1,
          actionAvailable: false,
          intimidationRollMode: "advantage",
          wisdomIntimidationRollMode: "normal",
          perceptionRollMode: "normal",
          lastResult: "resolved",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Thaumaturgy selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ThaumaturgySelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createThaumaturgySelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Thaumaturgy selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Thaumaturgy selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Thaumaturgy selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-thaumaturgy-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createThaumaturgySelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: thaumaturgySelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createThaumaturgySelectedIdentityDriver() {
  return defineDriver(thaumaturgySelectedIdentityDriverSchema, () => {
    let state = battleWithThaumaturgy();
    let lastResult: ThaumaturgySelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = battleWithThaumaturgy();
      lastResult = "init";
    }

    return {
      init: reset,
      doResolveThaumaturgyBoomingVoice: () => {
        state = requireResolved(
          resolveBattleSubject({
            state,
            subject: thaumaturgySubject,
            fills: [thaumaturgyCountFill(state, 0)],
          }),
        ).state;
        lastResult = "resolved";
      },
      step: () => {},
      getState: () =>
        projectThaumaturgySelectedIdentityState(state, lastResult),
    };
  });
}

function battleWithThaumaturgy(): BattleState {
  return startBattleRight({
    battleId: battleId("thaumaturgy-selected-identity"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevels: [{ className: "cleric", level: 1 }],
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [srdThaumaturgySpell()],
            preparedSpells: [],
            spellSlots: [],
          }),
          sourceClassName: "cleric",
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function srdThaumaturgySpell(): SpellRecord {
  const unit = unitLibrary.requireUnit("thaumaturgy");
  if (unit.kind !== "spell") {
    throw new Error("Expected SRD catalog unit thaumaturgy to be a Spell.");
  }
  return unit;
}

function thaumaturgyCountFill(
  state: BattleState,
  activeOneMinuteEffectCount: number,
): BattleFill {
  const act = findAct(state, thaumaturgySubject);
  const hole = findThaumaturgyCountHole(act.initialHoles);
  return {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
    holeId: hole.holeId,
    value: { activeOneMinuteEffectCount },
  };
}

function findThaumaturgyCountHole(holes: readonly BattleHole[]) {
  const hole = findHole(holes, "thaumaturgyActiveOneMinuteEffectCount");
  if (hole.kind !== "thaumaturgyActiveOneMinuteEffectCount") {
    throw new Error("Expected Thaumaturgy active-effect count hole.");
  }
  return hole;
}

function projectThaumaturgySelectedIdentityState(
  state: BattleState,
  lastResult: ThaumaturgySelectedIdentityProjection["lastResult"],
): ThaumaturgySelectedIdentityProjection {
  return {
    casterEffectCount:
      state.combatants
        .get(fighterId)
        ?.activeEffects.filter(
          (effect) => effect.kind === "thaumaturgyBoomingVoice",
        ).length ?? 0,
    actionAvailable: discoverBattleActs(state).some(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.invocation.spellId === "thaumaturgy" &&
        act.subject.invocation.procedure === "thaumaturgyBoomingVoice",
    ),
    intimidationRollMode:
      requiredAbilityCheckRollMode(state, fighterId, "cha", {
        skill: "intimidation",
      }) ?? "normal",
    wisdomIntimidationRollMode:
      requiredAbilityCheckRollMode(state, fighterId, "wis", {
        skill: "intimidation",
      }) ?? "normal",
    perceptionRollMode:
      requiredAbilityCheckRollMode(state, fighterId, "cha", {
        skill: "perception",
      }) ?? "normal",
    lastResult,
  };
}

function normalizeThaumaturgySelectedIdentityQuintState(
  raw: unknown,
): ThaumaturgySelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    casterEffectCount: numberFromQuintInt(
      state["qCasterEffectCount"],
      "qCasterEffectCount",
    ),
    actionAvailable: booleanFromQuint(state["qActionAvailable"]),
    intimidationRollMode: rollModeFromQuint(state["qIntimidationRollMode"]),
    wisdomIntimidationRollMode: rollModeFromQuint(
      state["qWisdomIntimidationRollMode"],
    ),
    perceptionRollMode: rollModeFromQuint(state["qPerceptionRollMode"]),
    lastResult: lastResultFromQuint(state["qLastResult"]),
  };
}

function numberFromQuintInt(raw: unknown, label: string): number {
  if (typeof raw !== "bigint") {
    throw new Error(`Expected ${label} to be a Quint int.`);
  }
  return Number(raw);
}

function booleanFromQuint(raw: unknown): boolean {
  if (typeof raw !== "boolean") {
    throw new Error("Expected Quint boolean.");
  }
  return raw;
}

function rollModeFromQuint(raw: unknown): BattleRollMode {
  if (raw === "normal" || raw === "advantage" || raw === "disadvantage") {
    return raw;
  }
  throw new Error(`Unexpected Thaumaturgy roll mode ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Record<string, unknown> {
  if (!isQuintStateRecord(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return raw;
}

function isQuintStateRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null;
}

function lastResultFromQuint(raw: unknown): "init" | "resolved" {
  if (raw === "init" || raw === "resolved") {
    return raw;
  }
  throw new Error(`Unexpected Thaumaturgy result ${String(raw)}.`);
}

const thaumaturgySelectedIdentityStateCheck = stateCheck(
  normalizeThaumaturgySelectedIdentityQuintState,
  (
    spec: ThaumaturgySelectedIdentityProjection,
    impl: ThaumaturgySelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
