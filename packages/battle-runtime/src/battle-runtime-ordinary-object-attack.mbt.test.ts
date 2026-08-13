// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.ORDINARY_OBJECT_PROCEDURE
import {
  MBT_TEST_TIMEOUT_MS,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { Hp } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";
import type {
  BattleFill,
  BattleResolutionResult,
} from "./battle-state-execution.ts";
import { battleObjectId } from "./identity.ts";
import {
  attackRollFill,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  requireHole,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";

const scenarios = [
  "init",
  "total-cover-rejected",
  "half-cover-target-admitted",
  "half-cover-miss",
  "uncovered-target-admitted",
  "uncovered-hit-awaits-damage",
  "uncovered-hit-damaged",
] as const;
type Scenario = (typeof scenarios)[number];
type ReplayScenario = Exclude<Scenario, "init">;

type Projection = Readonly<{
  scenario: Scenario;
  valid: boolean;
  actionRemaining: boolean;
  needsAttackRoll: boolean;
  needsDamageRoll: boolean;
  hit: boolean;
  damageEmitted: boolean;
  replayIndex: number;
}>;

const initialProjection: Projection = {
  scenario: "init",
  valid: true,
  actionRemaining: true,
  needsAttackRoll: false,
  needsDamageRoll: false,
  hit: false,
  damageEmitted: false,
  replayIndex: 0,
};

const driverSchema = {
  init: {},
  doRejectTotalCover: {},
  doAdmitHalfCoverTarget: {},
  doResolveHalfCoverMiss: {},
  doAdmitUncoveredTarget: {},
  doResolveUncoveredHitRoll: {},
  doApplyUncoveredHitDamage: {},
  step: {},
} as const;

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;
    return {
      init: () => {
        projection = initialProjection;
      },
      doRejectTotalCover: () => {
        projection = projectScenario("total-cover-rejected", 1);
      },
      doAdmitHalfCoverTarget: () => {
        projection = projectScenario("half-cover-target-admitted", 2);
      },
      doResolveHalfCoverMiss: () => {
        projection = projectScenario("half-cover-miss", 3);
      },
      doAdmitUncoveredTarget: () => {
        projection = projectScenario("uncovered-target-admitted", 4);
      },
      doResolveUncoveredHitRoll: () => {
        projection = projectScenario("uncovered-hit-awaits-damage", 5);
      },
      doApplyUncoveredHitDamage: () => {
        projection = projectScenario("uncovered-hit-damaged", 6);
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

describe("ordinary object Attack procedure deterministic QNT replay", () => {
  it(
    "covers target legality, Cover, roll ordering, hit and miss, and action spend",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-ordinary-object-attack.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: stateCheck(normalizeQuintState, compareState),
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function projectScenario(
  scenario: ReplayScenario,
  replayIndex: number,
): Projection {
  const state = fighterVsGoblinBattle();
  const subject = fighterAttackSubject(state, "Longsword");
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const cover = scenario.startsWith("half-cover")
    ? "half"
    : scenario === "total-cover-rejected"
      ? "total"
      : "none";
  const targetFill = {
    kind: "objectTargetChoice",
    holeId: targetHole.holeId,
    value: battleObjectId("ordinary_object_procedure_parity"),
    spatialFacts: [
      {
        kind: "attackObjectTarget",
        actorId: fighterId,
        objectId: battleObjectId("ordinary_object_procedure_parity"),
        range: { kind: "meleeReach" },
        attackerCanSeeObject: true,
        cover,
        armorClass: armorClass(15),
        damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
      },
    ],
  } as const satisfies BattleFill;
  let result: BattleResolutionResult = resolveBattleSubject({
    state,
    subject,
    fills: [targetFill],
  });
  const needsRollOnly = scenario.endsWith("target-admitted");
  if (!needsRollOnly && scenario !== "total-cover-rejected") {
    const rollHole = requireHole(result, "attackRoll");
    const hit = !scenario.endsWith("miss");
    result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill,
        attackRollFill(rollHole, {
          total: hit ? 18 : 16,
          naturalD20: hit ? 13 : 11,
        }),
      ],
    });
    if (scenario === "uncovered-hit-damaged") {
      const damageHole = requireHole(result, "rolledDice");
      result = resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill,
          attackRollFill(rollHole, { total: 18, naturalD20: 13 }),
          damageRollFill(damageHole, 4),
        ],
      });
    }
  }
  return {
    scenario,
    valid: result.tag !== "invalid",
    actionRemaining: result.snapshot.turn.actionResources.length > 0,
    needsAttackRoll:
      result.tag === "needsHoles" &&
      result.holes.some(({ kind }) => kind === "attackRoll"),
    needsDamageRoll:
      result.tag === "needsHoles" &&
      result.holes.some(({ kind }) => kind === "rolledDice"),
    hit: scenario.startsWith("uncovered-hit"),
    damageEmitted:
      result.tag === "resolved" && (result.objectDamages?.length ?? 0) > 0,
    replayIndex,
  };
}

function normalizeQuintState(raw: unknown): Projection {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected ordinary object Attack Quint state.");
  }
  const state = Object.fromEntries(Object.entries(raw)) as Readonly<
    Record<string, unknown>
  >;
  const scenario = state["qScenario"];
  if (typeof scenario !== "string" || !isScenario(scenario)) {
    throw new Error(
      `Unknown ordinary object Attack scenario ${String(scenario)}.`,
    );
  }
  return {
    scenario,
    valid: state["qValid"] === true,
    actionRemaining: state["qActionRemaining"] === true,
    needsAttackRoll: state["qNeedsAttackRoll"] === true,
    needsDamageRoll: state["qNeedsDamageRoll"] === true,
    hit: state["qHit"] === true,
    damageEmitted: state["qDamageEmitted"] === true,
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function isScenario(value: string): value is Scenario {
  return scenarios.some((scenario) => scenario === value);
}

function compareState(runtime: Projection, quint: Projection): boolean {
  expect(runtime).toEqual(quint);
  return true;
}
