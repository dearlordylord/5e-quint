// RAW-COVERAGE: verification-owner:focused-mbt RAW-STAT-BLOCK-SPELLCASTING-AT-WILL-GROUP-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.spellcasting.at-will-group
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELLCASTING_AT_WILL_GROUP
import { isDeepStrictEqual } from "node:util";
import { Result } from "effect";
import {
  resetTurnActionEconomy,
  type ActionEconomyState,
} from "@dnd/shared-algebras/action-economy-algebra";
import { describe, it } from "vitest";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { spendSpellCastAction } from "./battle-reducer/spellcasting-action-cost.ts";

function ready(): ActionEconomyState {
  return resetTurnActionEconomy({
    actionResources: [],
    actionTakenThisTurn: false,
    currentHasBonusAction: false,
    actionOrBonusActionExclusion: { kind: "notRestricted" },
    movementActionBonusActionExclusion: { kind: "notRestricted" },
  });
}

function projection(cost: "magicAction" | "bonusAction", repeat: boolean) {
  const first = spendSpellCastAction(ready(), cost);
  if (Result.isFailure(first)) throw new Error(first.failure);
  const final = repeat ? spendSpellCastAction(first.success, cost) : first;
  const resources = Result.isFailure(final) ? first.success : final.success;
  return {
    actionAvailable: resources.actionResources.length > 0,
    bonusActionAvailable: resources.currentHasBonusAction,
    admitted: Result.isSuccess(final),
  };
}

const schema = {
  init: {},
  doActionCast: {},
  doBonusCast: {},
  doRejectSpentAction: {},
  doRejectSpentBonus: {},
  step: {},
} as const;
const driver = defineDriver(schema, () => {
  let state = {
    actionAvailable: true,
    bonusActionAvailable: true,
    admitted: true,
  };
  return {
    init: () => {
      state = {
        actionAvailable: true,
        bonusActionAvailable: true,
        admitted: true,
      };
    },
    doActionCast: () => {
      state = projection("magicAction", false);
    },
    doBonusCast: () => {
      state = projection("bonusAction", false);
    },
    doRejectSpentAction: () => {
      state = projection("magicAction", true);
    },
    doRejectSpentBonus: () => {
      state = projection("bonusAction", true);
    },
    step: () => {},
    getState: () => state,
  };
});

describe("at-will Stat Block spellcasting action-cost parity", () => {
  it(
    "replays action, bonus-action and atomic rejection laws through production spending",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "stat-block-at-will-spellcasting-group.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver,
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: stateCheck(
          (raw) => {
            const value = quintStateRecord(raw);
            return {
              actionAvailable: booleanField(value, "qActionAvailable"),
              bonusActionAvailable: booleanField(
                value,
                "qBonusActionAvailable",
              ),
              admitted: booleanField(value, "qAdmitted"),
            };
          },
          (quint, runtime) => isDeepStrictEqual(quint, runtime),
        ),
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
