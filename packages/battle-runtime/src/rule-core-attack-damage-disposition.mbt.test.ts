// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { battleId, combatantId, resolveBattleSubject } from "./index.ts";
import {
  attackDamageDispositionFill,
  attackDamageDispositionHoleAfterDamage,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  characterSeed,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinTurnBattle,
  requireHole,
  startBattleRight,
  targetFill,
} from "./battle-runtime-test-support.ts";
import { ATTACK_DAMAGE_DISPOSITION_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";

const scenarios = [
  "init",
  "melee-knock-out",
  "ranged-knock-out-rejected",
] as const;
type Scenario = (typeof scenarios)[number];
const scenarioSet: ReadonlySet<string> = new Set(scenarios);
type ReplayAction = "doMeleeKnockOut" | "doRejectRangedKnockOut";

type Projection = {
  readonly lastScenario: Scenario;
  readonly accepted: boolean;
  readonly targetHp: number;
  readonly targetUnconscious: boolean;
  readonly targetDead: boolean;
  readonly knockOutRecovery: boolean;
  readonly replayIndex: number;
};

const driverSchema = {
  init: {},
  doMeleeKnockOut: {},
  doRejectRangedKnockOut: {},
  step: {},
} as const;

const targetCharacterId = combatantId("attack-disposition-target");

const initialProjection: Projection = {
  lastScenario: "init",
  accepted: true,
  targetHp: 3,
  targetUnconscious: false,
  targetDead: false,
  knockOutRecovery: false,
  replayIndex: 0,
};

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    function runAction(action: ReplayAction): void {
      projection =
        action === "doMeleeKnockOut"
          ? resolveMeleeKnockOut()
          : rejectRangedKnockOut();
    }

    return {
      init: reset,
      doMeleeKnockOut: () => runAction("doMeleeKnockOut"),
      doRejectRangedKnockOut: () => runAction("doRejectRangedKnockOut"),
      step: () => {},
      getState: () => projection,
    };
  });
}

const attackDamageDispositionStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);

describe("rule-core attack damage disposition deterministic QNT replay", () => {
  it(
    "replays Knock Out disposition acceptance and ranged rejection",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-attack-damage-disposition.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(scenarios.length - 1),
        stateCheck: attackDamageDispositionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function resolveMeleeKnockOut(): Projection {
  const state = startBattleRight({
    battleId: battleId("rule-core-attack-damage-disposition"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: targetCharacterId,
        displayName: "Attack Disposition Target",
        initiative: 10,
        currentHp: 3,
        attack: null,
      }),
    ],
  });
  const subject = fighterAttackSubject("Longsword");
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(
    state,
    targetHole,
    subject,
    targetCharacterId,
  );
  const damageHole = attackDamageHoleAfterHit(
    state,
    targetHole,
    rollHole,
    { total: 15, naturalD20: 10 },
    subject,
    targetCharacterId,
  );
  const dispositionHole = attackDamageDispositionHoleAfterDamage(
    state,
    targetHole,
    rollHole,
    damageHole,
    targetCharacterId,
    8,
  );
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(targetHole, targetCharacterId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      damageRollFill(damageHole, 8),
      attackDamageDispositionFill(dispositionHole, { kind: "knockOut" }),
    ],
  });
  if (result.tag !== "resolved") {
    throw new Error(`Expected Knock Out to resolve, got ${result.tag}.`);
  }
  const target = result.snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetCharacterId,
  );
  if (target === undefined) {
    throw new Error("Missing attack disposition target after Knock Out.");
  }
  return {
    lastScenario: "melee-knock-out",
    accepted: true,
    targetHp: Number(target.hp),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDead: target.zeroHpLifecycle.dead,
    knockOutRecovery:
      Number(target.hp) === 1 && target.conditions.includes("unconscious"),
    replayIndex: 1,
  };
}

function rejectRangedKnockOut(): Projection {
  const state = goblinTurnBattle({ fighterHp: 3 });
  const subject = goblinAttackSubject("Shortbow");
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const rollHole = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(targetHole, fighterId)],
    }),
    "attackRoll",
  );
  const damageHole = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, fighterId),
        attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(targetHole, fighterId),
      attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
      damageRollFill(damageHole, 6),
      {
        kind: "attackDamageDisposition",
        holeId: ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
        value: { kind: "knockOut" },
      },
    ],
  });
  if (result.tag !== "invalid") {
    throw new Error(
      `Expected ranged Knock Out to be invalid, got ${result.tag}.`,
    );
  }
  const target = result.snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  if (target === undefined) {
    throw new Error("Missing attack disposition target after rejection.");
  }
  return {
    lastScenario: "ranged-knock-out-rejected",
    accepted: false,
    targetHp: Number(target.hp),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDead: target.zeroHpLifecycle.dead,
    knockOutRecovery: false,
    replayIndex: 2,
  };
}

function normalizeQuintState(raw: unknown): Projection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected attack damage disposition Quint state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    lastScenario: scenarioField(state["qLastScenario"]),
    accepted: booleanValue(state["qAccepted"], "qAccepted"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    targetUnconscious: booleanValue(
      state["qTargetUnconscious"],
      "qTargetUnconscious",
    ),
    targetDead: booleanValue(state["qTargetDead"], "qTargetDead"),
    knockOutRecovery: booleanValue(
      state["qKnockOutRecovery"],
      "qKnockOutRecovery",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareState(runtime: Projection, quint: Projection): boolean {
  expect(runtime).toEqual(quint);
  return true;
}

function scenarioField(raw: unknown): Scenario {
  if (isScenario(raw)) return raw;
  throw new Error(`Unknown attack damage disposition scenario ${String(raw)}.`);
}

function isScenario(raw: unknown): raw is Scenario {
  return typeof raw === "string" && scenarioSet.has(raw);
}
