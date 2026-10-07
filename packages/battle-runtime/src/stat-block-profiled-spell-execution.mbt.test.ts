import { isDeepStrictEqual } from "node:util";
import { Result } from "effect";
import { describe, it } from "vitest";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import { resolveBattleSubject } from "./index.ts";
import {
  battleId,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  numberFromQuintInt,
  quintField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";

function execute(bonus: boolean, repeat: boolean) {
  const actorId = combatantId("synthetic-profiled-mbt-caster");
  const base = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry({
    unrestrictedSpellId: "false_life",
  });
  if (entry.procedure.kind !== "spellcasting")
    throw new Error("Expected authored spellcasting fixture.");
  const group = entry.procedure.groups[0];
  if (group?.kind !== "at_will") throw new Error("Expected at-will group.");
  const selected = {
    ...entry,
    procedure: {
      ...entry.procedure,
      groups: [{ ...group, spells: [{ spellId: "false_life" }] }],
    },
  };
  const started = startBattle({
    battleId: battleId("synthetic-profiled-mbt"),
    combatants: [
      statBlockCreatureInit({
        combatantId: actorId,
        initiative: 20,
        statBlock: {
          ...base,
          statBlock: {
            ...base.statBlock,
            actions: bonus ? undefined : [selected],
            bonusActions: bonus ? [selected] : undefined,
          },
        },
      }),
    ],
  });
  if (Result.isFailure(started)) throw new Error("Expected admitted caster.");
  let state = started.success.state;
  const cast = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === (bonus ? "bonusActionSpell" : "actionSpell"),
  );
  if (cast === undefined)
    throw new Error("Expected production-discovered spell.");
  const fill = damageRollFillWithGroups(
    requireHole(cast.initialHoles, "rolledDice"),
    [[3, 4]],
  );
  const first = resolveBattleSubject({
    state,
    subject: cast.subject,
    fills: [fill],
  });
  if (first.tag !== "resolved")
    throw new Error(JSON.stringify({ bonus, first }));
  state = first.state;
  let admitted = true;
  if (repeat) {
    const second = resolveBattleSubject({
      state,
      subject: cast.subject,
      fills: [fill],
    });
    admitted = second.tag === "resolved";
    if (second.tag === "resolved") state = second.state;
  }
  return {
    actionAvailable: state.currentTurnResources.actionResources.length > 0,
    bonusActionAvailable: state.currentTurnResources.currentHasBonusAction,
    temporaryHitPoints: Number(state.combatants.get(actorId)?.tempHp),
    admitted,
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
    temporaryHitPoints: 0,
    admitted: true,
  };
  return {
    init: () => {
      state = {
        actionAvailable: true,
        bonusActionAvailable: true,
        temporaryHitPoints: 0,
        admitted: true,
      };
    },
    doActionCast: () => {
      state = execute(false, false);
    },
    doBonusCast: () => {
      state = execute(true, false);
    },
    doRejectSpentAction: () => {
      state = execute(false, true);
    },
    doRejectSpentBonus: () => {
      state = execute(true, true);
    },
    step: () => {},
    getState: () => state,
  };
});
describe("profiled Stat Block production spell parity", () => {
  it(
    "replays effect, action cost and stale-cast rejection through the catalog and reducer",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "stat-block-profiled-spell-execution.mbt.qnt",
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
              temporaryHitPoints: numberFromQuintInt(
                quintField(value, "qTemporaryHitPoints"),
                "qTemporaryHitPoints",
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
