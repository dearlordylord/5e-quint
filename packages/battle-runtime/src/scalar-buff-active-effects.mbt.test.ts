// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.scalar-buff
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Aid:
//   targets' Hit Point maximum and current Hit Points increase for the
//   duration.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#False Life:
//   the caster gains rolled Temporary Hit Points.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Longstrider:
//   the target's Speed increases by 10 feet until the spell ends.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield of Faith:
//   a creature gains a +2 AC bonus for the Concentration duration.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Spider Climb:
//   a willing target gains a Climb Speed equal to its Speed.
// - .references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points and
//   Rules-Glossary.md#Speed:
//   Temporary Hit Points are a non-stacking buffer; special speeds are
//   separate movement modes affected by Speed changes.
// - UBIQUITOUS_LANGUAGE.md: Armor Class, Speed, Hit Point Maximum, Temporary
//   Hit Points, Spell Invocation, and Spell Effect.
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { describe, expect, it } from "vitest";

import {
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureSnapshot,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  aidUnitId,
  falseLifeUnitId,
  longstriderUnitId,
  shieldOfFaithUnitId,
  spellCasterId,
  spellTargetId,
  spiderClimbUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const LAST_RESULTS = [
  "init",
  "shieldOfFaith",
  "longstrider",
  "spiderClimb",
  "aid",
  "falseLife",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);
const RESULT_SOURCE_SPELL_IDS = {
  init: null,
  shieldOfFaith: shieldOfFaithUnitId,
  longstrider: longstriderUnitId,
  spiderClimb: spiderClimbUnitId,
  aid: aidUnitId,
  falseLife: falseLifeUnitId,
} as const satisfies Readonly<Record<LastResult, string | null>>;

type ScalarBuffActiveEffectsProjection = {
  readonly affectedArmorClass: number;
  readonly affectedSpeedFeet: number;
  readonly affectedClimbSpeedFeet: number;
  readonly affectedHitPointMaximum: number;
  readonly affectedHitPoints: number;
  readonly affectedTemporaryHitPoints: number;
  readonly armorClassBonusActive: boolean;
  readonly speedDeltaActive: boolean;
  readonly specialSpeedGrantActive: boolean;
  readonly hitPointMaximumIncreaseActive: boolean;
  readonly casterConcentrating: boolean;
  readonly lastResult: LastResult;
};

type ScalarBuffRuntimeState = {
  readonly projection: ScalarBuffActiveEffectsProjection;
};

const driverSchema = {
  init: {},
  doCastShieldOfFaith: {},
  doCastLongstrider: {},
  doCastSpiderClimb: {},
  doCastAid: {},
  doCastFalseLife: {},
  doStutter: {},
  step: {},
} as const;

function createScalarBuffActiveEffectsDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastShieldOfFaith: () => {
        state = castShieldOfFaith();
      },
      doCastLongstrider: () => {
        state = castLongstrider();
      },
      doCastSpiderClimb: () => {
        state = castSpiderClimb();
      },
      doCastAid: () => {
        state = castAid();
      },
      doCastFalseLife: () => {
        state = castFalseLife();
      },
      doStutter: () => {},
      step: () => {},
      getState: () => state.projection,
    };
  });
}

const scalarBuffActiveEffectsStateCheck = stateCheck(
  normalizeScalarBuffQuintState,
  compareScalarBuffStates,
);

describe("scalar buff active-effects MBT parity", () => {
  it("projects representative scalar buff active effects from existing spell profiles", () => {
    expect(castShieldOfFaith().projection).toMatchObject({
      affectedArmorClass: 12,
      armorClassBonusActive: true,
      casterConcentrating: true,
      lastResult: "shieldOfFaith",
    });
    expect(castLongstrider().projection).toMatchObject({
      affectedSpeedFeet: 40,
      speedDeltaActive: true,
      lastResult: "longstrider",
    });
    expect(castSpiderClimb().projection).toMatchObject({
      affectedClimbSpeedFeet: 30,
      specialSpeedGrantActive: true,
      casterConcentrating: true,
      lastResult: "spiderClimb",
    });
    expect(castAid().projection).toMatchObject({
      affectedHitPointMaximum: 17,
      affectedHitPoints: 17,
      hitPointMaximumIncreaseActive: true,
      lastResult: "aid",
    });
    expect(castFalseLife().projection).toMatchObject({
      affectedTemporaryHitPoints: 9,
      lastResult: "falseLife",
    });
  });

  it(
    "matches the focused scalar buff active-effects slice against bounded MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-scalar-buff-active-effects.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createScalarBuffActiveEffectsDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: scalarBuffActiveEffectsStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): ScalarBuffRuntimeState {
  return {
    projection: {
      affectedArmorClass: 10,
      affectedSpeedFeet: 30,
      affectedClimbSpeedFeet: 0,
      affectedHitPointMaximum: 12,
      affectedHitPoints: 12,
      affectedTemporaryHitPoints: 0,
      armorClassBonusActive: false,
      speedDeltaActive: false,
      specialSpeedGrantActive: false,
      hitPointMaximumIncreaseActive: false,
      casterConcentrating: false,
      lastResult: "init",
    },
  };
}

function castShieldOfFaith(): ScalarBuffRuntimeState {
  const state = spellBattle({
    preparedSpells: [spellRecord(shieldOfFaithUnitId)],
  });
  const act = bonusSpellAct({ state, spellId: shieldOfFaithUnitId });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          shieldOfFaithUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    }),
    "Expected Shield of Faith to resolve.",
  );
  return projectScalarBuffState(resolved.state, spellTargetId, "shieldOfFaith");
}

function castLongstrider(): ScalarBuffRuntimeState {
  const state = spellBattle({
    preparedSpells: [spellRecord(longstriderUnitId)],
  });
  const act = spellAct({ state, spellId: longstriderUnitId, slotLevel: 1 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          longstriderUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    }),
    "Expected Longstrider to resolve.",
  );
  return projectScalarBuffState(resolved.state, spellTargetId, "longstrider");
}

function castSpiderClimb(): ScalarBuffRuntimeState {
  const state = spellBattle({
    preparedSpells: [spellRecord(spiderClimbUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const act = spellAct({ state, spellId: spiderClimbUnitId, slotLevel: 2 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          spiderClimbUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    }),
    "Expected Spider Climb to resolve.",
  );
  return projectScalarBuffState(resolved.state, spellCasterId, "spiderClimb");
}

function castAid(): ScalarBuffRuntimeState {
  const state = spellBattle({
    preparedSpells: [spellRecord(aidUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const act = spellAct({ state, spellId: aidUnitId, slotLevel: 2 });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetHole, spellCasterId, aidUnitId, [
          spellTargetId,
        ]),
      ],
    }),
    "Expected Aid to resolve.",
  );
  return projectScalarBuffState(resolved.state, spellTargetId, "aid");
}

function castFalseLife(): ScalarBuffRuntimeState {
  const state = spellBattle({
    preparedSpells: [spellRecord(falseLifeUnitId)],
  });
  const act = spellAct({ state, spellId: falseLifeUnitId, slotLevel: 1 });
  const rollHole = requireHole(act.initialHoles, "rolledDice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageRollFillWithGroups(rollHole, [[2, 3]])],
    }),
    "Expected False Life to resolve.",
  );
  return projectScalarBuffState(resolved.state, spellCasterId, "falseLife");
}

function projectScalarBuffState(
  battle: BattleState,
  affectedId: CombatantId,
  lastResult: LastResult,
): ScalarBuffRuntimeState {
  const affected = requireCombatant(battle, affectedId);
  const caster = requireCombatant(battle, spellCasterId);
  const affectedSnapshot = requireSnapshotCombatant(battle, affectedId);
  const climbSpeed = affectedSnapshot.movement.speedKinds.find(
    (speed) => speed.kind === "climb",
  );
  const sourceSpellId = RESULT_SOURCE_SPELL_IDS[lastResult];
  return {
    projection: {
      affectedArmorClass: Number(affectedSnapshot.armorClass),
      affectedSpeedFeet: Number(affectedSnapshot.movement.speedFeet),
      affectedClimbSpeedFeet: Number(climbSpeed?.speedFeet ?? 0),
      affectedHitPointMaximum: Number(affectedSnapshot.maxHp),
      affectedHitPoints: Number(affectedSnapshot.hp),
      affectedTemporaryHitPoints: Number(affectedSnapshot.tempHp),
      armorClassBonusActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "spellArmorClassBonus" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      speedDeltaActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "speedDelta" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      specialSpeedGrantActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "specialSpeedGrant" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      hitPointMaximumIncreaseActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "hitPointMaximumIncrease" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      casterConcentrating:
        caster.concentration?.effectKind === "spellEffect" &&
        caster.concentration.sourceSpellId === sourceSpellId,
      lastResult,
    },
  };
}

function requireSnapshotCombatant(
  battle: BattleState,
  combatantId: CombatantId,
): BattleCreatureSnapshot {
  const combatant = snapshotBattle(battle).combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  expect(combatant).toBeDefined();
  if (combatant === undefined) {
    throw new Error(`Expected snapshot combatant ${combatantId}.`);
  }
  return combatant;
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error(message);
  }
  return result;
}

function normalizeScalarBuffQuintState(
  raw: unknown,
): ScalarBuffActiveEffectsProjection {
  const state = quintStateRecord(raw);
  return {
    affectedArmorClass: numberFromQuintInt(
      state["qAffectedArmorClass"],
      "qAffectedArmorClass",
    ),
    affectedSpeedFeet: numberFromQuintInt(
      state["qAffectedSpeedFeet"],
      "qAffectedSpeedFeet",
    ),
    affectedClimbSpeedFeet: numberFromQuintInt(
      state["qAffectedClimbSpeedFeet"],
      "qAffectedClimbSpeedFeet",
    ),
    affectedHitPointMaximum: numberFromQuintInt(
      state["qAffectedHitPointMaximum"],
      "qAffectedHitPointMaximum",
    ),
    affectedHitPoints: numberFromQuintInt(
      state["qAffectedHitPoints"],
      "qAffectedHitPoints",
    ),
    affectedTemporaryHitPoints: numberFromQuintInt(
      state["qAffectedTemporaryHitPoints"],
      "qAffectedTemporaryHitPoints",
    ),
    armorClassBonusActive: booleanField(state, "qArmorClassBonusActive"),
    speedDeltaActive: booleanField(state, "qSpeedDeltaActive"),
    specialSpeedGrantActive: booleanField(state, "qSpecialSpeedGrantActive"),
    hitPointMaximumIncreaseActive: booleanField(
      state,
      "qHitPointMaximumIncreaseActive",
    ),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    lastResult: lastResult(state["qLastResult"]),
  };
}

function compareScalarBuffStates(
  runtime: ScalarBuffActiveEffectsProjection,
  quint: ScalarBuffActiveEffectsProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function lastResult(raw: unknown): LastResult {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isLastResult(raw)) {
    throw new Error(`Unexpected scalar buff result ${String(raw)}.`);
  }
  return raw;
}

function isLastResult(value: string): value is LastResult {
  return LAST_RESULT_SET.has(value);
}
