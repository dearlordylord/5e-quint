// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.ATTACK_BRANCHES
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  quintVariantMappedValue,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleId, combatantId } from "./identity.ts";
import {
  attackRollFill,
  attackTargetFill,
  characterSeed,
  fighterId,
  goblinAttackSubject,
  goblinId,
  requireHole,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import type { BattleState } from "./battle-state-execution.ts";

const modes = {
  NormalD20TestRoll: "normal",
  AdvantageD20TestRoll: "advantage",
  DisadvantageD20TestRoll: "disadvantage",
} as const;
type Projection = {
  readonly caseIndex: number;
  readonly offeredAttackRoll: (typeof modes)[keyof typeof modes] | null;
  readonly actionSpent: boolean;
};
const initialProjection: Projection = {
  caseIndex: 0,
  offeredAttackRoll: null,
  actionSpent: false,
};
const driverSchema = {
  init: {},
  doNormalEndpoint: {},
  doLongBand: {},
  doLongEndpoint: {},
  doNormalAdvantage: {},
  doLongRangeCancellation: {},
  doBeyondRange: {},
  step: {},
} as const;
const helperId = combatantId("range-parity-helper");

function rangeBattle(advantage: boolean): BattleState {
  const state = startBattleRight({
    battleId: battleId("range-parity"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({ initiative: 10 }),
      characterSeed({ combatantId: helperId, initiative: 5, attack: null }),
    ],
  });
  return {
    ...state,
    // A previously established Help benefit supplies the independent source.
    helpAttacks: advantage
      ? [
          {
            helperId,
            allyId: goblinId,
            targetEnemyId: fighterId,
            expiresAt: { kind: "startOfTurn", combatantId: helperId },
          },
        ]
      : [],
  };
}

function replayRange(
  caseIndex: number,
  distanceFeet: number,
  advantage: boolean,
): Projection {
  const state = rangeBattle(advantage);
  const subject = goblinAttackSubject(state, "Shortbow");
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const target = attackTargetFill(
    targetHole,
    goblinId,
    fighterId,
    undefined,
    [],
    movementFeet(distanceFeet),
  );
  const offered = resolveBattleSubject({ state, subject, fills: [target] });
  if (offered.tag === "invalid") {
    return {
      caseIndex,
      offeredAttackRoll: null,
      actionSpent: offered.snapshot.turn.actionResources.length === 0,
    };
  }
  const attackRoll = requireHole(offered, "attackRoll");
  const mode = attackRoll.rollMode ?? "normal";
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      target,
      // Both physical dice happen to show 2; the selected result misses in all modes.
      attackRollFill(attackRoll, { total: 6, naturalD20: 2, rollMode: mode }),
    ],
  });
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected the admitted ranged miss to resolve: ${result.tag}.`,
    );
  }
  return {
    caseIndex,
    offeredAttackRoll: mode,
    actionSpent: !canSpendAction(result.state.currentTurnResources, "attack"),
  };
}

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;
    return {
      init: () => {
        projection = initialProjection;
      },
      doNormalEndpoint: () => {
        projection = replayRange(1, 80, false);
      },
      doLongBand: () => {
        projection = replayRange(2, 81, false);
      },
      doLongEndpoint: () => {
        projection = replayRange(3, 320, false);
      },
      doNormalAdvantage: () => {
        projection = replayRange(4, 80, true);
      },
      doLongRangeCancellation: () => {
        projection = replayRange(5, 81, true);
      },
      doBeyondRange: () => {
        projection = replayRange(6, 321, false);
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function normalizeQuintState(raw: unknown): Projection {
  const state = quintStateRecord(raw);
  const roll = state["qOfferedAttackRoll"];
  return {
    caseIndex: numberFromQuintInt(state["qCaseIndex"], "qCaseIndex"),
    offeredAttackRoll:
      quintVariantTag(roll) === "NoAttackRoll"
        ? null
        : quintVariantMappedValue(
            quintVariantValue(roll, "OfferedAttackRoll"),
            "qOfferedAttackRoll",
            modes,
            "attack roll mode",
          ),
    actionSpent: booleanValue(state["qActionSpent"], "qActionSpent"),
  };
}

describe("rule-core attack range deterministic QNT replay", () => {
  it(
    "compares normal/long endpoints, Advantage cancellation, and rejected action cost",
    async () => {
      const observedCases = new Set<number>();
      const rangeStateCheck = stateCheck(
        normalizeQuintState,
        (runtime, quint) => {
          expect(runtime).toEqual(quint);
          observedCases.add(quint.caseIndex);
          return true;
        },
      );
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-attack-range.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: rangeStateCheck,
      });
      expect([...observedCases].sort((a, b) => a - b)).toEqual([
        0, 1, 2, 3, 4, 5, 6,
      ]);
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
