// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP
import { describe, expect, it } from "vitest";
import {
  deathSaveStateFailures,
  deathSaveStateIsDead,
} from "@dnd/shared-algebras/death-saves-algebra";
import { deathSaveCount } from "@dnd/shared/types";

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
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleId, combatantId } from "./index.ts";
import {
  resolveBattleSubject,
  attackDamageDispositionFill,
  attackDamageDispositionHoleAfterDamage,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinTurnBattle,
  requireHole,
  startBattleRight,
  targetFill,
} from "./battle-runtime.test-support.ts";
import { ATTACK_DAMAGE_DISPOSITION_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.test-support.ts";

const scenarios = [
  "init",
  "melee-knock-out",
  "ranged-knock-out-rejected",
  "melee-hit-on-dying-target",
] as const;
type Scenario = (typeof scenarios)[number];
const scenarioSet: ReadonlySet<string> = new Set(scenarios);
type ReplayAction =
  | "doMeleeKnockOut"
  | "doRejectRangedKnockOut"
  | "doMeleeHitOnDyingTarget";

type Projection = RuleCoreComponentRoutedProjection & {
  readonly lastScenario: Scenario;
  readonly accepted: boolean;
  readonly targetHp: number;
  readonly targetUnconscious: boolean;
  readonly targetDead: boolean;
  readonly knockOutRecovery: boolean;
  readonly targetDeathSavingThrowFailures: number;
  readonly replayIndex: number;
};

const driverSchema = {
  init: {},
  doMeleeKnockOut: {},
  doRejectRangedKnockOut: {},
  doMeleeHitOnDyingTarget: {},
  step: {},
} as const;

const targetCharacterId = combatantId("attack-disposition-target");
const componentOwner = "RuleCoreAttackDamageDispositionOwner";

const initialProjection: Projection = withRuleCoreComponentRoute(
  componentOwner,
  {
    lastScenario: "init",
    accepted: true,
    targetHp: 3,
    targetUnconscious: false,
    targetDead: false,
    knockOutRecovery: false,
    targetDeathSavingThrowFailures: 0,
    replayIndex: 0,
  },
);

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    const replays: Readonly<Record<ReplayAction, () => Projection>> = {
      doMeleeKnockOut: resolveMeleeKnockOut,
      doRejectRangedKnockOut: rejectRangedKnockOut,
      doMeleeHitOnDyingTarget: resolveMeleeHitOnDyingTarget,
    };

    function runAction(action: ReplayAction): void {
      projection = replays[action]();
    }

    return {
      init: reset,
      doMeleeKnockOut: () => runAction("doMeleeKnockOut"),
      doRejectRangedKnockOut: () => runAction("doRejectRangedKnockOut"),
      doMeleeHitOnDyingTarget: () => runAction("doMeleeHitOnDyingTarget"),
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
    "replays Knock Out disposition acceptance, ranged rejection and a hit at 0 HP",
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
  const subject = fighterAttackSubject(state, "Longsword");
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
  return withRuleCoreComponentRoute(componentOwner, {
    lastScenario: "melee-knock-out",
    accepted: true,
    targetHp: Number(target.hp),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDead: targetIsDead(target),
    knockOutRecovery:
      Number(target.hp) === 1 && target.conditions.includes("unconscious"),
    targetDeathSavingThrowFailures: targetDeathSavingThrowFailures(target),
    replayIndex: 1,
  });
}

function rejectRangedKnockOut(): Projection {
  const state = goblinTurnBattle({ fighterHp: 3 });
  const subject = goblinAttackSubject(state, "Shortbow");
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
  return withRuleCoreComponentRoute(componentOwner, {
    lastScenario: "ranged-knock-out-rejected",
    accepted: false,
    targetHp: Number(target.hp),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDead: targetIsDead(target),
    knockOutRecovery: false,
    targetDeathSavingThrowFailures: targetDeathSavingThrowFailures(target),
    replayIndex: 2,
  });
}

function resolveMeleeHitOnDyingTarget(): Projection {
  const state = startBattleRight({
    battleId: battleId("rule-core-attack-damage-disposition-dying-target"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: targetCharacterId,
        displayName: "Attack Disposition Target",
        initiative: 10,
        currentHp: 0,
        attack: null,
        conditions: ["unconscious"],
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            tag: "dying",
            deathSaves: {
              successes: deathSaveCount(0),
              failures: deathSaveCount(0),
            },
          },
        },
      }),
    ],
  });
  const subject = fighterAttackSubject(state, "Longsword");
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(
    state,
    targetHole,
    subject,
    targetCharacterId,
  );
  // Attack rolls against an Unconscious creature have Advantage, and an
  // adjacent hit is a Critical Hit, so the Longsword rolls two damage dice.
  const roll = { total: 15, naturalD20: 10, rollMode: "advantage" } as const;
  const damageHole = attackDamageHoleAfterHit(
    state,
    targetHole,
    rollHole,
    roll,
    subject,
    targetCharacterId,
  );
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(targetHole, targetCharacterId),
      attackRollFill(rollHole, roll),
      damageRollFillWithGroups(damageHole, [[4, 4]]),
    ],
  });
  if (result.tag !== "resolved") {
    throw new Error(`Expected the hit at 0 HP to resolve, got ${result.tag}.`);
  }
  const target = result.snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetCharacterId,
  );
  if (target === undefined) {
    throw new Error("Missing attack disposition target after the hit.");
  }
  return withRuleCoreComponentRoute(componentOwner, {
    lastScenario: "melee-hit-on-dying-target",
    accepted: true,
    targetHp: Number(target.hp),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDead: targetIsDead(target),
    knockOutRecovery: false,
    targetDeathSavingThrowFailures: targetDeathSavingThrowFailures(target),
    replayIndex: 3,
  });
}

type SnapshotCombatant = Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
>["snapshot"]["combatants"][number];

function targetIsDead(target: SnapshotCombatant): boolean {
  return target.zeroHpLifecycle.policy === "diesAtZeroHp"
    ? target.zeroHpLifecycle.dead
    : deathSaveStateIsDead(target.zeroHpLifecycle.deathSaves);
}

function targetDeathSavingThrowFailures(target: SnapshotCombatant): number {
  return target.zeroHpLifecycle.policy === "diesAtZeroHp"
    ? 0
    : Number(deathSaveStateFailures(target.zeroHpLifecycle.deathSaves));
}

function normalizeQuintState(raw: unknown): Projection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected attack damage disposition Quint state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
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
    targetDeathSavingThrowFailures: numberFromQuintInt(
      state["qTargetDeathSavingThrowFailures"],
      "qTargetDeathSavingThrowFailures",
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
