// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELLCASTING_LONG_CASTING_TIME
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// RAW-COVERAGE: verification-owner:focused-mbt RAW-STAT-BLOCK-SPELLCASTING-LONG-CASTING-TIME-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.spell-invocation.unrestricted
import { isDeepStrictEqual } from "node:util";
import { describe, it } from "vitest";
import { endTurn, resolveBattleSubject } from "./index.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import {
  longCastingActorId,
  longCastingBattle,
  resolved,
  advance,
} from "./long-casting-lifecycle.test-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  defineDriver,
  run,
  stateCheck,
  quintStateRecord,
  booleanField,
  mbtSpecPath,
  mbtTraceCount,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import type { BattleState } from "./battle-state-execution.ts";

function minuteReady() {
  let state = longCastingBattle({ ownership: "each" }).state;
  for (let turn = 1; turn <= 10; turn += 1) {
    state = advance(state);
    if (turn < 10)
      state = resolved(endTurn({ state, actorId: longCastingActorId }));
  }
  return state;
}
function projection(state: BattleState) {
  const actor = state.combatants.get(longCastingActorId);
  return {
    casting: actor?.concentration?.effectKind === "castingSpell",
    ready:
      actor?.concentration?.effectKind === "castingSpell" &&
      actor.concentration.progress.kind === "readyToComplete",
    effect: Number(actor?.tempHp) > 0,
    poolPaid:
      actor?.origin.kind === "statBlock" &&
      actor.origin.execution.resourcePools.some(
        (pool) => pool.kind === "daily" && pool.usesRemaining === 1,
      ),
  };
}
const driver = defineDriver(
  {
    init: {},
    doStarted: {},
    doMinuteReady: {},
    doSkipped: {},
    doCompleted: {},
    step: {},
  } as const,
  () => {
    let observed = {
      casting: false,
      ready: false,
      effect: false,
      poolPaid: false,
    };
    return {
      init: () => {
        observed = projection(longCastingBattle({ ownership: "each" }).state);
      },
      doStarted: () => {
        observed = projection(
          advance(longCastingBattle({ ownership: "each" }).state),
        );
      },
      doMinuteReady: () => {
        observed = projection(minuteReady());
      },
      doSkipped: () => {
        let state = advance(longCastingBattle({ ownership: "each" }).state);
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
        state = resolved(endTurn({ state, actorId: longCastingActorId }));
        observed = projection(state);
      },
      doCompleted: () => {
        const state = minuteReady();
        const act = discoverBattleActCandidates(state).find(
          (candidate) => candidate.subject.tag === "actionSpell",
        );
        if (act === undefined)
          throw new Error("Expected ready completion act.");
        const hole = requireHole(act.initialHoles, "rolledDice");
        observed = projection(
          resolved(
            resolveBattleSubject({
              state,
              subject: act.subject,
              fills: [damageRollFillWithGroups(hole, [[3, 4]])],
            }),
          ),
        );
      },
      step: () => {},
      getState: () => observed,
    };
  },
);
describe("long casting production parity", () => {
  it(
    "observes full minute progression, skipped-turn failure and final effects",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "spell-long-casting.mbt.qnt"),
        init: "init",
        step: "step",
        driver,
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: stateCheck((raw) => {
          const state = quintStateRecord(raw);
          return {
            casting: booleanField(state, "qCasting"),
            ready: booleanField(state, "qReady"),
            effect: booleanField(state, "qEffect"),
            poolPaid: booleanField(state, "qPoolPaid"),
          };
        }, isDeepStrictEqual),
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
