// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// RAW-COVERAGE: verification-owner:focused-mbt RAW-STAT-BLOCK-SPELLCASTING-CONCENTRATION-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.spell-invocation.unrestricted
import { Match } from "effect";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  spellTargetListFill,
  savingThrowOutcomeFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELLCASTING_CONCENTRATION
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  mbtSpecPath,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";

import {
  endTurn,
  resolveBattleSubject,
  discoverBattleActs,
  type BattleState,
} from "./index.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { concentrationSavingThrowFill } from "./battle-runtime.test-support.ts";
import {
  applyBattleHitPointDamage,
  concentrationSavingThrowHole,
} from "./battle-reducer/damage-apply.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import {
  castStatBlockConcentrationSpell,
  statBlockConcentrationBattle,
  statBlockConcentrationCasterId,
} from "./stat-block-spell-concentration.test-support.ts";

const scenarios = [
  "Initial",
  "Cast",
  "VoluntaryEnd",
  "FailedDamageSave",
  "Dead",
  "Incapacitated",
  "DurationExpired",
  "Replacement",
] as const;
type Scenario = (typeof scenarios)[number];
type Projection = {
  scenario: Scenario;
  concentrating: boolean;
  effectCount: number;
  sourceMatches: boolean;
};

function projected(scenario: Scenario, state: BattleState): Projection {
  const caster = state.combatants.get(statBlockConcentrationCasterId);
  if (caster === undefined)
    throw new Error("Expected admitted Stat Block caster.");
  const effects = caster.activeEffects.filter(
    (effect) => effect.kind === "perceptionGatedAttackRollDefense",
  );
  return {
    scenario,
    concentrating: caster.concentration !== null,
    effectCount: effects.length,
    sourceMatches:
      caster.concentration !== null &&
      effects.length === 1 &&
      effects.every(
        (effect) =>
          "sourceProcedureRef" in effect &&
          effect.sourceProcedureRef ===
            caster.concentration?.sourceProcedureRef,
      ),
  };
}

function castState() {
  return castStatBlockConcentrationSpell(statBlockConcentrationBattle());
}

function damageState(dead: boolean): BattleState {
  const battle = castState();
  const caster = battle.state.combatants.get(statBlockConcentrationCasterId);
  if (caster === undefined) throw new Error("Expected admitted caster.");
  const damageAmount = dead ? Number(caster.maxHp) * 3 : 1;
  const hole = concentrationSavingThrowHole(caster, damageAmount);
  if (hole === null) throw new Error("Expected Concentration saving throw.");
  const fill = concentrationSavingThrowFill(hole, false);
  if (fill.kind !== "concentrationSavingThrow")
    throw new Error("Expected typed Concentration saving throw fill.");
  return applyBattleHitPointDamage({
    state: battle.state,
    target: caster,
    damageAmount,
    deathFailuresAtZeroHp: 1,
    concentrationSavingThrow: fill,
    saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
  });
}

const driverSchema = {
  init: {},
  doCast: {},
  doVoluntaryEnd: {},
  doFailedDamageSave: {},
  doDeath: {},
  doIncapacitated: {},
  doDurationExpiry: {},
  doReplacement: {},
  step: {},
} as const;

function nextTurn(session: ReturnType<typeof castState>) {
  const result = endTurn({
    state: session.state,
    actorId: currentActorId(session.state),
  });
  if (result.tag !== "resolved")
    throw new Error(`Expected End Turn, received ${result.tag}.`);
  return battleRuntimeSessionForTest({ ...session, state: result.state });
}

function voluntaryEndState(): BattleState {
  const session = castState();
  const act = discoverBattleActs(session).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "endConcentration",
  );
  if (act === undefined) throw new Error("Expected End Concentration act.");
  const result = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [],
  });
  if (result.tag !== "resolved") throw new Error("Expected Concentration end.");
  return result.state;
}

function expiryState(): BattleState {
  const session = castState();
  const caster = session.state.combatants.get(statBlockConcentrationCasterId);
  const effect = caster?.activeEffects.find(
    (effect) => effect.kind === "perceptionGatedAttackRollDefense",
  );
  if (
    effect?.kind !== "perceptionGatedAttackRollDefense" ||
    effect.expiresAt.durationTicks === undefined
  )
    throw new Error("Expected bounded Concentration effect.");
  const combatants = Array.from({
    length: Number(effect.expiresAt.durationTicks),
  }).reduce<BattleState["combatants"]>(
    (combatants) => tickDurationEffects(combatants).value,
    session.state.combatants,
  );
  return { ...session.state, combatants };
}

function replacementState(): BattleState {
  const cast = castState();
  const priorEffect = cast.state.combatants
    .get(statBlockConcentrationCasterId)
    ?.activeEffects.find(
      (effect) => effect.kind === "perceptionGatedAttackRollDefense",
    );
  if (priorEffect === undefined)
    throw new Error("Expected prior spell effect.");
  const refreshed = nextTurn(nextTurn(cast));
  const replaced = castStatBlockConcentrationSpell(refreshed);
  expect(
    replaced.state.combatants.get(statBlockConcentrationCasterId)
      ?.activeEffects,
  ).not.toContain(priorEffect);
  return replaced.state;
}

function incapacitatedState(): BattleState {
  const session = nextTurn(castState());
  const act = discoverBattleActs(session).find(
    (act) => act.subject.tag === "actionSpell",
  );
  if (act === undefined)
    throw new Error("Expected binding caster's admitted spell act.");
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(
    targetHole,
    currentActorId(session.state),
    "hold_monster",
    [statBlockConcentrationCasterId],
  );
  const saveResult = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [targetFill],
  });
  const saveHole = requireResultHole(saveResult, "savingThrowOutcome");
  const saveFill = savingThrowOutcomeFill(saveHole, [
    {
      targetId: statBlockConcentrationCasterId,
      succeeded: false,
      naturalD20: 2,
    },
  ]);
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [targetFill, saveFill],
  });
  if (resolved.tag !== "resolved")
    throw new Error(
      `Expected binding spell resolution, received ${resolved.tag}.`,
    );
  return resolved.state;
}

function scenarioProjection(scenario: Scenario): Projection {
  return Match.value(scenario).pipe(
    Match.when("Initial", () =>
      projected(scenario, statBlockConcentrationBattle().state),
    ),
    Match.when("Cast", () => projected(scenario, castState().state)),
    Match.when("VoluntaryEnd", () => projected(scenario, voluntaryEndState())),
    Match.when("FailedDamageSave", () =>
      projected(scenario, damageState(false)),
    ),
    Match.when("Dead", () => projected(scenario, damageState(true))),
    Match.when("Incapacitated", () =>
      projected(scenario, incapacitatedState()),
    ),
    Match.when("DurationExpired", () => projected(scenario, expiryState())),
    Match.when("Replacement", () => projected(scenario, replacementState())),
    Match.exhaustive,
  );
}

function driver() {
  return defineDriver(driverSchema, () => {
    let projection = scenarioProjection("Initial");
    return {
      init: () => {
        projection = scenarioProjection("Initial");
      },
      doCast: () => {
        projection = scenarioProjection("Cast");
      },
      doVoluntaryEnd: () => {
        projection = scenarioProjection("VoluntaryEnd");
      },
      doFailedDamageSave: () => {
        projection = scenarioProjection("FailedDamageSave");
      },
      doDeath: () => {
        projection = scenarioProjection("Dead");
      },
      doIncapacitated: () => {
        projection = scenarioProjection("Incapacitated");
      },
      doDurationExpiry: () => {
        projection = scenarioProjection("DurationExpired");
      },
      doReplacement: () => {
        projection = scenarioProjection("Replacement");
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function normalize(raw: unknown): Projection {
  const state = quintStateRecord(raw);
  const tag = quintVariantTag(quintField(state, "qScenario"), "scenario");
  const scenario = scenarios.find((scenario) => scenario === tag);
  if (scenario === undefined)
    throw new Error(`Unknown source concentration scenario ${tag}.`);
  return {
    scenario,
    concentrating: booleanField(state, "qConcentrating"),
    effectCount: numberFromQuintInt(
      quintField(state, "qEffectCount"),
      "effectCount",
    ),
    sourceMatches: booleanField(state, "qSourceMatches"),
  };
}

describe("Stat Block Concentration source lifecycle", () => {
  it(
    "replays actual admitted casting and generic teardown for each lifecycle cause",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "stat-block-spell-concentration.mbt.qnt",
        ),
        init: "init",
        step: "step",
        backend: "typescript",
        driver: driver(),
        stateCheck: stateCheck(normalize, (quint, runtime) =>
          isDeepStrictEqual(quint, runtime),
        ),
        maxSteps: 7,
        nTraces: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
