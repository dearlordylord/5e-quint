// KERNEL-COVERAGE: parity-witness SHARED.HIT_POINTS.POSITIVE_DAMAGE
import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue as booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { describe, expect, it } from "vitest";

import { zeroHpLifecycleIsTerminal } from "./battle-reducer.ts";
import {
  applyBattleHitPointDamage,
  hpDamageProjection,
} from "./battle-reducer/damage-apply.ts";
import {
  characterSeed,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime-test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.ts";
import {
  battleId,
  combatantId,
  type BattleCreatureState,
  type BattleState,
  type CombatantId,
} from "./index.ts";

const hitPointDamageScenarios = [
  "init",
  "temporary-hit-points-absorb-first",
  "monster-dies-at-zero",
  "player-character-falls-unconscious",
  "player-character-dies-from-massive-damage",
] as const;
type HitPointDamageScenario = (typeof hitPointDamageScenarios)[number];
const hitPointDamageReplayStepCount = hitPointDamageScenarios.length - 1;

type HitPointDamageProjection = RuleCoreComponentRoutedProjection & {
  readonly lastScenario: HitPointDamageScenario;
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly temporaryHitPoints: number;
  readonly dead: boolean;
  readonly unconscious: boolean;
  readonly damageToHitPoints: number;
  readonly remainingDamageAtZero: number;
  readonly replayIndex: number;
};

type HitPointDamageScenarioBaseInput = {
  readonly scenario: Exclude<HitPointDamageScenario, "init">;
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly temporaryHitPoints: number;
  readonly damageAmount: number;
};
type HitPointDamageScenarioInput =
  | (HitPointDamageScenarioBaseInput & {
      readonly creatureKind: "playerCharacter";
    })
  | (HitPointDamageScenarioBaseInput & {
      readonly creatureKind: "monsterCreature";
    });

const playerTargetId = combatantId("rule-core-hit-point-damage-pc");
const monsterTargetId = combatantId("rule-core-hit-point-damage-monster");
const hitPointDamageComponentOwner = "RuleCoreHitPointDamageOwner";

const initialProjection: HitPointDamageProjection = withRuleCoreComponentRoute(
  hitPointDamageComponentOwner,
  {
  lastScenario: "init",
  hitPoints: 0,
  hitPointMaximum: 1,
  temporaryHitPoints: 0,
  dead: false,
  unconscious: false,
  damageToHitPoints: 0,
  remainingDamageAtZero: 0,
  replayIndex: 0,
  },
);

const driverSchema = {
  init: {},
  doTemporaryHitPointsAbsorbFirst: {},
  doMonsterDiesAtZero: {},
  doPlayerCharacterFallsUnconscious: {},
  doPlayerCharacterDiesFromMassiveDamage: {},
  step: {},
} as const;

function createHitPointDamageDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    function replay(input: HitPointDamageScenarioInput): void {
      projection = applyScenario(input);
    }

    return {
      init: reset,
      doTemporaryHitPointsAbsorbFirst: () =>
        replay({
          scenario: "temporary-hit-points-absorb-first",
          creatureKind: "playerCharacter",
          hitPoints: 8,
          hitPointMaximum: 10,
          temporaryHitPoints: 3,
          damageAmount: 5,
        }),
      doMonsterDiesAtZero: () =>
        replay({
          scenario: "monster-dies-at-zero",
          creatureKind: "monsterCreature",
          hitPoints: 4,
          hitPointMaximum: 10,
          temporaryHitPoints: 0,
          damageAmount: 4,
        }),
      doPlayerCharacterFallsUnconscious: () =>
        replay({
          scenario: "player-character-falls-unconscious",
          creatureKind: "playerCharacter",
          hitPoints: 4,
          hitPointMaximum: 12,
          temporaryHitPoints: 0,
          damageAmount: 7,
        }),
      doPlayerCharacterDiesFromMassiveDamage: () =>
        replay({
          scenario: "player-character-dies-from-massive-damage",
          creatureKind: "playerCharacter",
          hitPoints: 6,
          hitPointMaximum: 12,
          temporaryHitPoints: 0,
          damageAmount: 18,
        }),
      step: () => {},
      getState: () => projection,
    };
  });
}

const hitPointDamageStateCheck = stateCheck(
  normalizeHitPointDamageQuintState,
  compareHitPointDamageState,
);

describe("rule-core Hit Point damage deterministic QNT replay", () => {
  it(
    "replays positive-HP resolved damage against battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-hit-point-damage.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createHitPointDamageDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(hitPointDamageReplayStepCount),
        stateCheck: hitPointDamageStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function applyScenario(
  input: HitPointDamageScenarioInput,
): HitPointDamageProjection {
  const { state, target } = battleWithTarget(input);
  const afterDamage = applyBattleHitPointDamage({
    state,
    target,
    damageAmount: input.damageAmount,
    deathFailuresAtZeroHp: 1,
  });
  const damaged = requireCombatant(afterDamage, target.combatantId);
  return projectHitPointDamage(
    input.scenario,
    input.damageAmount,
    target,
    damaged,
  );
}

function battleWithTarget(input: HitPointDamageScenarioInput): {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
} {
  const targetId =
    input.creatureKind === "playerCharacter" ? playerTargetId : monsterTargetId;
  const state = startBattleRight({
    battleId: battleId(`rule-core-hit-point-damage-${input.scenario}`),
    combatants:
      input.creatureKind === "playerCharacter"
        ? [
            characterSeed({
              combatantId: targetId,
              displayName: "HP Damage Target",
              initiative: 20,
              currentHp: input.hitPoints,
              maxHp: input.hitPointMaximum,
              tempHp: input.temporaryHitPoints,
              attack: null,
            }),
          ]
        : [
            statBlockCreatureInit({
              combatantId: targetId,
              displayName: "HP Damage Monster",
              initiative: 20,
              currentHp: input.hitPoints,
              tempHp: input.temporaryHitPoints,
            }),
          ],
  });
  const target = requireCombatant(state, targetId);
  assertFixtureHitPointMaximum(input, target);
  return { state, target };
}

function projectHitPointDamage(
  scenario: HitPointDamageScenarioInput["scenario"],
  damageAmount: number,
  before: BattleCreatureState,
  after: BattleCreatureState,
): HitPointDamageProjection {
  const projection = hpDamageProjection(before, damageAmount);
  return withRuleCoreComponentRoute(hitPointDamageComponentOwner, {
    lastScenario: scenario,
    hitPoints: Number(after.hp),
    hitPointMaximum: Number(after.maxHp),
    temporaryHitPoints: Number(after.tempHp),
    dead: zeroHpLifecycleIsTerminal(after),
    unconscious: battleCreatureIsNonterminalUnconscious(after),
    damageToHitPoints: projection.hpDamage,
    remainingDamageAtZero: Math.max(
      0,
      projection.hpDamage - projection.currentHp,
    ),
    replayIndex: replayIndexForScenario(scenario),
  });
}

function requireCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantIdValue);
  if (combatant === undefined) {
    throw new Error(`Missing combatant ${combatantIdValue}.`);
  }
  return combatant;
}

function assertFixtureHitPointMaximum(
  input: HitPointDamageScenarioInput,
  target: BattleCreatureState,
): void {
  if (Number(target.maxHp) !== input.hitPointMaximum) {
    throw new Error(
      `Fixture ${input.scenario} expected max HP ${input.hitPointMaximum}; got ${Number(target.maxHp)}.`,
    );
  }
}

function battleCreatureIsNonterminalUnconscious(
  combatant: BattleCreatureState,
): boolean {
  return (
    !zeroHpLifecycleIsTerminal(combatant) &&
    (combatant.positiveHpUnconscious !== null ||
      hasCondition(combatant.conditions, "unconscious"))
  );
}

function normalizeHitPointDamageQuintState(
  raw: unknown,
): HitPointDamageProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Hit Point damage state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
    lastScenario: scenarioField(state["qLastScenario"]),
    hitPoints: numberFromQuintInt(state["qHitPoints"], "qHitPoints"),
    hitPointMaximum: numberFromQuintInt(
      state["qHitPointMaximum"],
      "qHitPointMaximum",
    ),
    temporaryHitPoints: numberFromQuintInt(
      state["qTemporaryHitPoints"],
      "qTemporaryHitPoints",
    ),
    dead: booleanField(state["qDead"], "qDead"),
    unconscious: booleanField(state["qUnconscious"], "qUnconscious"),
    damageToHitPoints: numberFromQuintInt(
      state["qDamageToHitPoints"],
      "qDamageToHitPoints",
    ),
    remainingDamageAtZero: numberFromQuintInt(
      state["qRemainingDamageAtZero"],
      "qRemainingDamageAtZero",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareHitPointDamageState(
  runtime: HitPointDamageProjection,
  quint: HitPointDamageProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): HitPointDamageScenario {
  if (typeof raw === "string" && isHitPointDamageScenario(raw)) {
    return raw;
  }
  throw new Error(`Unknown Hit Point damage scenario ${String(raw)}.`);
}

function isHitPointDamageScenario(raw: string): raw is HitPointDamageScenario {
  return hitPointDamageScenarios.some((scenario) => scenario === raw);
}

function replayIndexForScenario(
  scenario: HitPointDamageScenarioInput["scenario"],
): number {
  const index = hitPointDamageScenarios.indexOf(scenario);
  if (index <= 0) {
    throw new Error(`Unexpected Hit Point damage replay scenario ${scenario}.`);
  }
  return index;
}
