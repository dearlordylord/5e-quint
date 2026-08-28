import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Slow:
//   failed Wisdom Saving Throws halve Speed, apply -2 AC and -2 Dexterity
//   Saving Throw penalties, prevent Reactions, restrict the affected target's
//   turns to either an Action or Bonus Action, cap the Attack action at one
//   attack, impose a 25 percent Somatic spell failure chance, and allow an
//   end-of-target-turn repeat save ending the spell on that target on success.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Saving
//   Throw, Speed, Armor Class, Reaction, Area of Effect/Cube, and Spell Effect.
import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintList,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { describe, expect, it } from "vitest";

import {
  activeEffectArmorClass,
  combatantCanTakeReactions,
} from "./battle-reducer/creature-state.ts";
import {
  applyBattleHitPointDamage,
  concentrationSavingThrowHole,
} from "./battle-reducer/damage-apply.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { savingThrowFlatBonusProjections } from "./battle-reducer/spells-damage-fills.ts";
import { SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT } from "./battle-reducer/domain-constants.ts";
import type { SlowActivePenaltiesEffect } from "./battle-reducer/slow-active-penalties-effects.ts";
import { slowActionOrBonusActionTurnResources } from "./battle-reducer/slow-active-penalties-turn-restriction.ts";
import { tickBattleStateDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import { statBlockMultiattackBindings } from "./stat-block-execution-state.ts";
import {
  discoverBattleActs,
  endTurn,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  expeditiousRetreatUnitId,
  orcAdrenalineRushUnitId,
  slowUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { combatantId } from "./identity.ts";
import {
  attackRollFill,
  attackTargetFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  adrenalineRushBattleUnitRef,
  extraAttackBattleUnitRef,
} from "./unit-profile-admission-feature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  concentrationSavingThrowFill,
  resolveBattleSubject,
  monsterMultiattackStatBlock,
} from "./battle-runtime.test-support.ts";

type LastResult =
  | "init"
  | "failedSave"
  | "targetTurn"
  | "needsSave"
  | "saved"
  | "failedAgain"
  | "spentAction"
  | "spentBonusAction"
  | "concentrationEndedAfterAction"
  | "durationExpiredAfterBonusAction"
  | "attackedOnce"
  | "needsSomaticFailure"
  | "somaticSpellFailed"
  | "selfFailedSave"
  | "priorBonusActionReconciled"
  | "multiattackFailedSave"
  | "multiattackTargetTurn"
  | "multiattackActivated"
  | "multiattackDispatched"
  | "twoTargetsFailedSave"
  | "twoTargetsTargetTurn"
  | "twoTargetsNeedSave"
  | "oneTargetSaved"
  | "concentrationEnded"
  | "durationExpired";
const SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  FailedSave: "failedSave",
  TargetTurn: "targetTurn",
  NeedsSave: "needsSave",
  Saved: "saved",
  FailedAgain: "failedAgain",
  SpentAction: "spentAction",
  SpentBonusAction: "spentBonusAction",
  ConcentrationEndedAfterAction: "concentrationEndedAfterAction",
  DurationExpiredAfterBonusAction: "durationExpiredAfterBonusAction",
  AttackedOnce: "attackedOnce",
  NeedsSomaticFailure: "needsSomaticFailure",
  SomaticSpellFailed: "somaticSpellFailed",
  SelfFailedSave: "selfFailedSave",
  PriorBonusActionReconciled: "priorBonusActionReconciled",
  MultiattackFailedSave: "multiattackFailedSave",
  MultiattackTargetTurn: "multiattackTargetTurn",
  MultiattackActivated: "multiattackActivated",
  MultiattackDispatched: "multiattackDispatched",
  TwoTargetsFailedSave: "twoTargetsFailedSave",
  TwoTargetsTargetTurn: "twoTargetsTargetTurn",
  TwoTargetsNeedSave: "twoTargetsNeedSave",
  OneTargetSaved: "oneTargetSaved",
  ConcentrationEnded: "concentrationEnded",
  DurationExpired: "durationExpired",
} as const satisfies Readonly<Record<string, LastResult>>;
const slowMultiattackTargetId = combatantId(
  "slow-active-penalties-mbt-multiattack-target",
);
const slowSecondTargetId = combatantId(
  "slow-active-penalties-mbt-second-target",
);

type SlowHole = "EndTurnSave" | "SomaticFailure";

type SlowActivePenaltiesProjection = {
  readonly currentTurnRole:
    | "caster"
    | "target"
    | "secondTarget"
    | "multiattackTarget";
  readonly turnActionOrBonusChoice:
    | "notRestricted"
    | "notChosen"
    | "action"
    | "bonusAction";
  readonly targetTurnCanSpendAction: boolean;
  readonly targetTurnCanSpendBonusAction: boolean;
  readonly targetCanMakeAttack: boolean;
  readonly extraAttackResourceCount: number;
  readonly casterTurnCanSpendBonusAction: boolean;
  readonly targetSlowed: boolean;
  readonly secondTargetSlowed: boolean;
  readonly multiattackTargetSlowed: boolean;
  readonly affectedTargetCount: number;
  readonly targetSpeedFeet: number;
  readonly targetArmorClass: number;
  readonly dexteritySavingThrowDelta: number;
  readonly targetCanReact: boolean;
  readonly casterConcentrating: boolean;
  readonly somaticFailurePercent: number;
  readonly somaticFailureSpentCastResources: boolean;
  readonly somaticSpellEffectMayApply: boolean;
  readonly somaticFailureStartedConcentration: boolean;
  readonly statBlockMultiattackResourceCount: number;
  readonly statBlockMultiattackDispatchKind:
    | "none"
    | "oneListedChoice"
    | "listedOccurrences";
  readonly statBlockMultiattackPendingProcedureRefs: readonly number[];
  readonly statBlockMultiattackSourceOwnerMatches: boolean;
  readonly statBlockMultiattackSourceProcedureMatches: boolean;
  readonly statBlockMultiattackContinuationOpen: boolean;
  readonly statBlockMultiattackChosenProcedurePermitted: boolean;
  readonly holes: readonly SlowHole[];
  readonly lastResult: LastResult;
};

type SlowActivePenaltiesRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly currentTurnRole: SlowActivePenaltiesProjection["currentTurnRole"];
  readonly holes: readonly BattleHole[];
  readonly lastResult: LastResult;
};

const driverSchema = {
  init: {},
  doCastSlowFailedSave: {},
  doEndCasterTurn: {},
  doRequestEndTurnSave: {},
  doFillEndTurnSaveSuccess: {},
  doFillEndTurnSaveFailure: {},
  doSpendTargetAction: {},
  doSpendTargetBonusAction: {},
  doEndSlowConcentrationAfterAction: {},
  doExpireSlowDurationAfterBonusAction: {},
  doMakeTargetAttack: {},
  doRequestSomaticFailure: {},
  doFillSomaticSpellFailure: {},
  doCastSlowSelfFailedSave: {},
  doReconcileSlowAfterPriorBonusAction: {},
  doCastSlowMultiattackFailedSave: {},
  doEndCasterTurnForMultiattackTarget: {},
  doActivateSlowedStatBlockMultiattack: {},
  doResolveChosenSlowedStatBlockMultiattackDispatch: {},
  doCastSlowTwoTargetsFailedSave: {},
  doEndCasterTurnForTwoTargets: {},
  doRequestFirstTargetEndTurnSave: {},
  doFillFirstTargetEndTurnSaveSuccess: {},
  doEndSlowConcentration: {},
  doExpireSlowDuration: {},
  doStutter: {},
  step: {},
} as const;

function createSlowActivePenaltiesDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastSlowFailedSave: () => {
        state = castSlowFailedSave(state);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doRequestEndTurnSave: () => {
        state = requestEndTurnSave(state);
      },
      doFillEndTurnSaveSuccess: () => {
        state = fillEndTurnSave(state, true);
      },
      doFillEndTurnSaveFailure: () => {
        state = fillEndTurnSave(state, false);
      },
      doSpendTargetAction: () => {
        state = spendTargetAction(state);
      },
      doSpendTargetBonusAction: () => {
        state = spendTargetBonusAction(state);
      },
      doEndSlowConcentrationAfterAction: () => {
        state = endSlowConcentrationAfterAction(state);
      },
      doExpireSlowDurationAfterBonusAction: () => {
        state = expireSlowDurationAfterBonusAction(state);
      },
      doMakeTargetAttack: () => {
        state = makeTargetAttack(state);
      },
      doRequestSomaticFailure: () => {
        state = requestSomaticFailure(state);
      },
      doFillSomaticSpellFailure: () => {
        state = fillSomaticSpellFailure(state);
      },
      doCastSlowSelfFailedSave: () => {
        state = castSlowSelfFailedSave(state);
      },
      doReconcileSlowAfterPriorBonusAction: () => {
        state = reconcileSlowAfterPriorBonusAction(state);
      },
      doCastSlowMultiattackFailedSave: () => {
        state = castSlowMultiattackFailedSave(state);
      },
      doEndCasterTurnForMultiattackTarget: () => {
        state = endCasterTurnForMultiattackTarget(state);
      },
      doActivateSlowedStatBlockMultiattack: () => {
        state = activateSlowedStatBlockMultiattack(state);
      },
      doResolveChosenSlowedStatBlockMultiattackDispatch: () => {
        state = resolveChosenSlowedStatBlockMultiattackDispatch(state);
      },
      doCastSlowTwoTargetsFailedSave: () => {
        state = castSlowTwoTargetsFailedSave(state);
      },
      doEndCasterTurnForTwoTargets: () => {
        state = endCasterTurnForTwoTargets(state);
      },
      doRequestFirstTargetEndTurnSave: () => {
        state = requestFirstTargetEndTurnSave(state);
      },
      doFillFirstTargetEndTurnSaveSuccess: () => {
        state = fillFirstTargetEndTurnSaveSuccess(state);
      },
      doEndSlowConcentration: () => {
        state = endSlowConcentration(state);
      },
      doExpireSlowDuration: () => {
        state = expireSlowDuration(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => slowActivePenaltiesProjection(state),
    };
  });
}

const slowActivePenaltiesStateCheck = stateCheck(
  normalizeSlowActivePenaltiesQuintState,
  compareSlowActivePenaltiesStates,
);

describe("Slow active-penalties MBT parity", () => {
  it("projects failed-save Slow penalties and successful repeat-save cleanup", () => {
    const cast = castSlowFailedSave(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const needsSave = requestEndTurnSave(targetTurn);
    const saved = fillEndTurnSave(needsSave, true);

    expect(slowActivePenaltiesProjection(cast)).toMatchObject({
      targetSlowed: true,
      targetSpeedFeet: 15,
      targetArmorClass: 8,
      dexteritySavingThrowDelta: -2,
      targetCanReact: false,
      casterConcentrating: true,
      lastResult: "failedSave",
    });
    expect(slowActivePenaltiesProjection(needsSave)).toMatchObject({
      holes: ["EndTurnSave"],
      lastResult: "needsSave",
    });
    expect(slowActivePenaltiesProjection(saved)).toMatchObject({
      targetSlowed: false,
      targetSpeedFeet: 30,
      targetArmorClass: 10,
      dexteritySavingThrowDelta: 0,
      targetCanReact: true,
      casterConcentrating: false,
      lastResult: "saved",
    });
  });

  it("projects self-Slow current-turn restriction and slowed Stat Block Multiattack cap", () => {
    const selfSlowed = castSlowSelfFailedSave(initialRuntimeState());
    expect(slowActivePenaltiesProjection(selfSlowed)).toMatchObject({
      currentTurnRole: "caster",
      turnActionOrBonusChoice: "action",
      casterTurnCanSpendBonusAction: false,
      lastResult: "selfFailedSave",
    });

    const multiattackCast = castSlowMultiattackFailedSave(
      initialRuntimeState(),
    );
    const multiattackTurn = endCasterTurnForMultiattackTarget(multiattackCast);
    const multiattackActivated =
      activateSlowedStatBlockMultiattack(multiattackTurn);
    const multiattackDispatched =
      resolveChosenSlowedStatBlockMultiattackDispatch(multiattackActivated);
    expect(slowActivePenaltiesProjection(multiattackTurn)).toMatchObject({
      currentTurnRole: "multiattackTarget",
      turnActionOrBonusChoice: "notChosen",
      targetTurnCanSpendAction: true,
      targetTurnCanSpendBonusAction: true,
      statBlockMultiattackResourceCount: 0,
      lastResult: "multiattackTargetTurn",
    });
    expect(slowActivePenaltiesProjection(multiattackActivated)).toMatchObject({
      currentTurnRole: "multiattackTarget",
      turnActionOrBonusChoice: "action",
      targetTurnCanSpendAction: false,
      targetTurnCanSpendBonusAction: false,
      statBlockMultiattackResourceCount: 1,
      lastResult: "multiattackActivated",
    });
    expect(slowActivePenaltiesProjection(multiattackDispatched)).toMatchObject({
      currentTurnRole: "multiattackTarget",
      turnActionOrBonusChoice: "action",
      targetTurnCanSpendAction: false,
      targetTurnCanSpendBonusAction: false,
      statBlockMultiattackResourceCount: 0,
      lastResult: "multiattackDispatched",
    });
  });

  it("releases only Slow's mid-turn Action-or-Bonus-Action gate on cleanup", () => {
    const targetTurnAfterActionCast = endCasterTurn(
      castSlowFailedSave(initialRuntimeState()),
    );
    const actionSpent = spendTargetAction(targetTurnAfterActionCast);
    const concentrationEnded = endSlowConcentrationAfterAction(actionSpent);
    expect(slowActivePenaltiesProjection(actionSpent)).toMatchObject({
      turnActionOrBonusChoice: "action",
      targetTurnCanSpendAction: false,
      targetTurnCanSpendBonusAction: false,
    });
    expect(slowActivePenaltiesProjection(concentrationEnded)).toMatchObject({
      turnActionOrBonusChoice: "notRestricted",
      targetTurnCanSpendAction: false,
      targetTurnCanSpendBonusAction: true,
      targetSlowed: false,
      casterConcentrating: false,
      lastResult: "concentrationEndedAfterAction",
    });

    const targetTurnAfterBonusCast = endCasterTurn(
      castSlowFailedSave(initialRuntimeState()),
    );
    const bonusActionSpent = spendTargetBonusAction(targetTurnAfterBonusCast);
    const durationExpired =
      expireSlowDurationAfterBonusAction(bonusActionSpent);
    expect(slowActivePenaltiesProjection(bonusActionSpent)).toMatchObject({
      turnActionOrBonusChoice: "bonusAction",
      targetTurnCanSpendAction: false,
      targetTurnCanSpendBonusAction: false,
    });
    expect(slowActivePenaltiesProjection(durationExpired)).toMatchObject({
      turnActionOrBonusChoice: "notRestricted",
      targetTurnCanSpendAction: true,
      targetTurnCanSpendBonusAction: false,
      targetSlowed: false,
      casterConcentrating: false,
      lastResult: "durationExpiredAfterBonusAction",
    });
  });

  it(
    "matches the focused Slow active-penalties slice against bounded MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-slow-active-penalties.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSlowActivePenaltiesDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: slowActivePenaltiesStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): SlowActivePenaltiesRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_club"),
      targetUnitRefs: [
        extraAttackBattleUnitRef(),
        adrenalineRushBattleUnitRef(),
      ],
      targetResources: [
        { unit: unitLibrary.requireUnit(orcAdrenalineRushUnitId) },
      ],
      targetPreparedSpells: [spellRecord(expeditiousRetreatUnitId)],
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "init",
  };
}

function multiattackRuntimeState(): SlowActivePenaltiesRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      statBlockTargets: [
        {
          combatantId: slowMultiattackTargetId,
          statBlock: monsterMultiattackStatBlock(),
          initiative: 15,
        },
      ],
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "init",
  };
}

function twoTargetRuntimeState(): SlowActivePenaltiesRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_club"),
      extraTargetIds: [slowSecondTargetId],
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "init",
  };
}

function castSlowFailedSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const act = spellAct({
    session: state.battle,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [
      slowSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Slow failed-save cast to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "failedSave",
  };
}

function castSlowSelfFailedSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const act = spellAct({
    session: state.battle,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [
      slowSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellCasterId, succeeded: false },
      ]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected self-targeted Slow cast to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "selfFailedSave",
  };
}

function reconcileSlowAfterPriorBonusAction(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const adrenalineRush = adrenalineRushBattleUnitRef();
  const session = spellBattle({
    preparedSpells: [spellRecord(slowUnitId)],
    spellSlots: [{ spellLevel: 3, count: 1 }],
    casterUnitRefs: [adrenalineRush],
    casterResources: [
      { unit: unitLibrary.requireUnit(orcAdrenalineRushUnitId) },
    ],
  });
  const bonusAction = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionStandardAction" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.action === "dash",
  );
  if (
    bonusAction?.subject.tag !== "bonusActionStandardAction" ||
    bonusAction.subject.action !== "dash"
  ) {
    throw new Error("Expected a supported Bonus Action before Slow applies.");
  }
  const spentBonusAction = resolveBattleSubject({
    state: session.state,
    subject: bonusAction.subject,
    fills: [],
  });
  expect(spentBonusAction).toMatchObject({ tag: "resolved" });
  if (spentBonusAction.tag !== "resolved") {
    throw new Error("Expected the prior Bonus Action to resolve.");
  }
  const afterBonusAction = battleRuntimeSessionForTest({
    ...session,
    state: spentBonusAction.state,
  });
  const slowAct = spellAct({
    session: afterBonusAction,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const caster = requireCombatant(afterBonusAction.state, spellCasterId);
  const activeEffect: SlowActivePenaltiesEffect = {
    kind: "slowActivePenalties",
    sourceProcedureRef: slowAct.subject.procedureRef,
    sourceCombatantId: spellCasterId,
    save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
  const affectedCaster = {
    ...caster,
    concentration: {
      sourceProcedureRef: slowAct.subject.procedureRef,
      effectKind: "spellEffect" as const,
    },
    activeEffects: [...caster.activeEffects, activeEffect],
  };
  const reconciledState: BattleState = {
    ...afterBonusAction.state,
    combatants: new Map(afterBonusAction.state.combatants).set(
      spellCasterId,
      affectedCaster,
    ),
    currentTurnResources: slowActionOrBonusActionTurnResources(
      afterBonusAction.state.currentTurnResources,
      affectedCaster,
    ),
  };
  return {
    battle: battleRuntimeSessionForTest({
      ...afterBonusAction,
      state: reconciledState,
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "priorBonusActionReconciled",
  };
}

function castSlowMultiattackFailedSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const multiattackState = multiattackRuntimeState();
  const act = spellAct({
    session: multiattackState.battle,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: multiattackState.battle.state,
    subject: act.subject,
    fills: [
      slowSavingThrowOutcomeFill(savingThrow, [
        { targetId: slowMultiattackTargetId, succeeded: false },
      ]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error(
      "Expected Slow cast against multiattack target to resolve.",
    );
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...multiattackState.battle,
      state: resolved.state,
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "multiattackFailedSave",
  };
}

function castSlowTwoTargetsFailedSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const twoTargetState = twoTargetRuntimeState();
  const act = spellAct({
    session: twoTargetState.battle,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: twoTargetState.battle.state,
    subject: act.subject,
    fills: [
      slowSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: false },
        { targetId: slowSecondTargetId, succeeded: false },
      ]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected two-target Slow failed-save cast to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...twoTargetState.battle,
      state: resolved.state,
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "twoTargetsFailedSave",
  };
}

function endCasterTurn(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "failedSave") {
    return state;
  }
  const resolved = endTurn({
    state: state.battle.state,
    actorId: spellCasterId,
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "targetTurn",
  };
}

function endCasterTurnForMultiattackTarget(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "multiattackFailedSave") {
    return state;
  }
  const resolved = endTurn({
    state: state.battle.state,
    actorId: spellCasterId,
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "multiattackTarget",
    holes: [],
    lastResult: "multiattackTargetTurn",
  };
}

function endCasterTurnForTwoTargets(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "twoTargetsFailedSave") {
    return state;
  }
  const resolved = endTurn({
    state: state.battle.state,
    actorId: spellCasterId,
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected two-target Slow caster End Turn to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "twoTargetsTargetTurn",
  };
}

function requestEndTurnSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "targetTurn") {
    return state;
  }
  const needsSave = endTurn({
    state: state.battle.state,
    actorId: spellTargetId,
  });
  expect(needsSave).toMatchObject({ tag: "needsHoles" });
  if (needsSave.tag !== "needsHoles") {
    throw new Error("Expected Slow target End Turn to request a save.");
  }
  return {
    battle: state.battle,
    currentTurnRole: "target",
    holes: needsSave.holes,
    lastResult: "needsSave",
  };
}

function fillEndTurnSave(
  state: SlowActivePenaltiesRuntimeState,
  succeeded: boolean,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "needsSave") {
    return state;
  }
  const repeatSave = requireSlowEndTurnSaveHole(state.holes);
  const resolved = endTurn({
    state: state.battle.state,
    actorId: spellTargetId,
    fills: [
      singleTargetSavingThrowOutcomeFill(repeatSave, spellTargetId, succeeded),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Slow end-turn save fill to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: succeeded ? "saved" : "failedAgain",
  };
}

function requestFirstTargetEndTurnSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "twoTargetsTargetTurn") {
    return state;
  }
  const needsSave = endTurn({
    state: state.battle.state,
    actorId: spellTargetId,
  });
  expect(needsSave).toMatchObject({ tag: "needsHoles" });
  if (needsSave.tag !== "needsHoles") {
    throw new Error("Expected first Slow target End Turn to request a save.");
  }
  return {
    battle: state.battle,
    currentTurnRole: "target",
    holes: needsSave.holes,
    lastResult: "twoTargetsNeedSave",
  };
}

function fillFirstTargetEndTurnSaveSuccess(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "twoTargetsNeedSave") {
    return state;
  }
  const repeatSave = requireSlowEndTurnSaveHole(state.holes);
  const resolved = endTurn({
    state: state.battle.state,
    actorId: spellTargetId,
    fills: [
      singleTargetSavingThrowOutcomeFill(repeatSave, spellTargetId, true),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected first Slow target repeat save to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "secondTarget",
    holes: [],
    lastResult: "oneTargetSaved",
  };
}

function endSlowConcentration(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const cast = castSlowFailedSave(initialRuntimeState());
  const act = endConcentrationAct(cast.battle);
  const resolved = resolveBattleSubject({
    state: cast.battle.state,
    subject: act.subject,
    fills: [],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected public Slow End Concentration to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...cast.battle,
      state: resolved.state,
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "concentrationEnded",
  };
}

function expireSlowDuration(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const cast = castSlowFailedSave(initialRuntimeState());
  const nearExpiry: SlowActivePenaltiesRuntimeState = {
    ...cast,
    battle: battleRuntimeSessionForTest({
      ...cast.battle,
      state: stateWithSlowDurationTicks(cast.battle.state, elapsedTimeTicks(1)),
    }),
  };
  const targetTurn = endCasterTurn(nearExpiry);
  const needsSave = requestEndTurnSave(targetTurn);
  const expired = fillEndTurnSave(needsSave, false);
  return {
    ...expired,
    currentTurnRole: "caster",
    lastResult: "durationExpired",
  };
}

function stateWithSlowDurationTicks(
  state: BattleState,
  durationTicks: ReturnType<typeof elapsedTimeTicks>,
): BattleState {
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.map((effect) =>
            effect.kind === "slowActivePenalties"
              ? slowActivePenaltiesEffectWithDurationTicks(
                  effect,
                  durationTicks,
                )
              : effect,
          ),
        },
      ]),
    ),
  };
}

function slowActivePenaltiesEffectWithDurationTicks(
  effect: SlowActivePenaltiesEffect,
  durationTicks: ReturnType<typeof elapsedTimeTicks>,
): SlowActivePenaltiesEffect {
  if (
    effect.sourceCombatantId !== spellCasterId ||
    effect.expiresAt.kind !== "concentration"
  ) {
    return effect;
  }
  return {
    ...effect,
    expiresAt: { ...effect.expiresAt, durationTicks },
  };
}

function spendTargetAction(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "targetTurn") {
    return state;
  }
  const act = actionAct(state.battle, spellTargetId, "dodge");
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected slowed Dodge action to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "spentAction",
  };
}

function spendTargetBonusAction(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "targetTurn") {
    return state;
  }
  const bonusAction = discoverBattleActs(state.battle).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionStandardAction" &&
      candidate.subject.actorId === spellTargetId &&
      candidate.subject.action === "dash",
  );
  if (
    bonusAction?.subject.tag !== "bonusActionStandardAction" ||
    bonusAction.subject.action !== "dash"
  ) {
    throw new Error("Expected slowed target Bonus Action Dash.");
  }
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: bonusAction.subject,
    fills: [],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected slowed target Bonus Action to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "spentBonusAction",
  };
}

function endSlowConcentrationAfterAction(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "spentAction") {
    return state;
  }
  const caster = requireCombatant(state.battle.state, spellCasterId);
  const concentrationHole = concentrationSavingThrowHole(caster, 1);
  if (concentrationHole === null) {
    throw new Error("Expected damage to request a Concentration save.");
  }
  const concentrationFill = concentrationSavingThrowFill(concentrationHole, {
    succeeded: false,
    withoutRoll: true,
  });
  if (concentrationFill.kind !== "concentrationSavingThrow") {
    throw new Error("Expected a Concentration saving throw fill.");
  }
  const concentrationEnded = applyBattleHitPointDamage({
    state: state.battle.state,
    target: caster,
    damageAmount: 1,
    deathFailuresAtZeroHp: 1,
    concentrationSavingThrow: concentrationFill,
  });
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: concentrationEnded,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "concentrationEndedAfterAction",
  };
}

function expireSlowDurationAfterBonusAction(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "spentBonusAction") {
    return state;
  }
  const expiringState = stateWithSlowDurationTicks(
    state.battle.state,
    elapsedTimeTicks(1),
  );
  const expiredState = tickBattleStateDurationEffects(expiringState).value;
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: expiredState,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "durationExpiredAfterBonusAction",
  };
}

function makeTargetAttack(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "targetTurn") {
    return state;
  }
  const act = actionAct(state.battle, spellTargetId, "attack", "Club");
  const targetHole = requireResultHole(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(targetHole, spellTargetId, spellCasterId);
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [
      targetFill,
      attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected slowed Attack action to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "attackedOnce",
  };
}

function activateSlowedStatBlockMultiattack(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "multiattackTargetTurn") {
    return state;
  }
  const act = actionAct(state.battle, slowMultiattackTargetId, "multiattack");
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected slowed Stat Block Multiattack to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "multiattackTarget",
    holes: [],
    lastResult: "multiattackActivated",
  };
}

function resolveChosenSlowedStatBlockMultiattackDispatch(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "multiattackActivated") {
    return state;
  }
  const act = actionAct(
    state.battle,
    slowMultiattackTargetId,
    "attack",
    "Shortbow",
  );
  const targetHole = requireResultHole(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    targetHole,
    slowMultiattackTargetId,
    spellCasterId,
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [
      targetFill,
      attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected chosen slowed Multiattack dispatch to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "multiattackTarget",
    holes: [],
    lastResult: "multiattackDispatched",
  };
}

function requestSomaticFailure(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "targetTurn") {
    return state;
  }
  const act = spellActForActor(
    state.battle,
    spellTargetId,
    expeditiousRetreatUnitId,
  );
  const hole = requireSlowSomaticSpellFailureHole(act.initialHoles);
  expect(hole.failurePercent).toBe(
    SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
  );
  return {
    battle: state.battle,
    currentTurnRole: "target",
    holes: [hole],
    lastResult: "needsSomaticFailure",
  };
}

function fillSomaticSpellFailure(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "needsSomaticFailure") {
    return state;
  }
  const act = spellActForActor(
    state.battle,
    spellTargetId,
    expeditiousRetreatUnitId,
  );
  const hole = requireSlowSomaticSpellFailureHole(state.holes);
  const resolved = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [slowSomaticSpellFailureFill(hole, true)],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected failed slowed Somatic spell cast to resolve.");
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    currentTurnRole: "target",
    holes: [],
    lastResult: "somaticSpellFailed",
  };
}

function slowActivePenaltiesProjection(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesProjection {
  const target = requireCombatant(state.battle.state, spellTargetId);
  const caster = requireCombatant(state.battle.state, spellCasterId);
  const secondTarget = state.battle.state.combatants.get(slowSecondTargetId);
  const multiattackTarget = state.battle.state.combatants.get(
    slowMultiattackTargetId,
  );
  const dexteritySavingThrowDelta =
    savingThrowFlatBonusProjections(state.battle.state, "dex").find(
      (projection) => projection.targetId === spellTargetId,
    )?.bonus ?? 0;
  const turnResources = state.battle.state.currentTurnResources;
  const slowEffect = target.activeEffects.find(
    (effect) => effect.kind === "slowActivePenalties",
  );
  const secondTargetSlowed =
    secondTarget?.activeEffects.some(
      (effect) => effect.kind === "slowActivePenalties",
    ) ?? false;
  const multiattackTargetSlowed =
    multiattackTarget?.activeEffects.some(
      (effect) => effect.kind === "slowActivePenalties",
    ) ?? false;
  const casterConcentrationSourceProcedureRef =
    caster.concentration?.sourceProcedureRef;
  const concentratedSlowEffects =
    casterConcentrationSourceProcedureRef !== undefined &&
    [...state.battle.state.combatants.values()].flatMap((combatant) =>
      combatant.activeEffects.filter(
        (effect) =>
          effect.kind === "slowActivePenalties" &&
          effect.sourceCombatantId === spellCasterId &&
          effect.sourceProcedureRef === casterConcentrationSourceProcedureRef,
      ),
    );
  const affectedTargetCount =
    concentratedSlowEffects === false ? 0 : concentratedSlowEffects.length;
  const somaticFailureHole = state.holes.find(
    (hole) => hole.kind === "slowSomaticSpellFailureOutcome",
  );
  const multiattack = slowStatBlockMultiattackProjection(state);
  return {
    currentTurnRole: state.currentTurnRole,
    turnActionOrBonusChoice: actionOrBonusChoice(turnResources),
    targetTurnCanSpendAction:
      state.currentTurnRole !== "caster" &&
      canSpendAction(turnResources, "dodge"),
    targetTurnCanSpendBonusAction:
      state.currentTurnRole !== "caster" && canSpendBonusAction(turnResources),
    targetCanMakeAttack:
      state.currentTurnRole === "target" &&
      discoverBattleActs(state.battle).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.actorId === spellTargetId &&
          candidate.subject.action === "attack",
      ),
    extraAttackResourceCount: turnResources.actionResources.filter(
      (resource) => resource.source === "classFeatureExtraAttack",
    ).length,
    casterTurnCanSpendBonusAction:
      state.currentTurnRole === "caster" && canSpendBonusAction(turnResources),
    targetSlowed: slowEffect !== undefined,
    secondTargetSlowed,
    multiattackTargetSlowed,
    affectedTargetCount,
    targetSpeedFeet: Number(effectiveWalkSpeed(state.battle.state, target)),
    targetArmorClass: Number(
      currentArmorClass(activeEffectArmorClass(state.battle.state, target)),
    ),
    dexteritySavingThrowDelta,
    targetCanReact: combatantCanTakeReactions(target),
    casterConcentrating: affectedTargetCount > 0,
    somaticFailurePercent: somaticFailureHole?.failurePercent ?? 0,
    somaticFailureSpentCastResources: turnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed" && use.combatantId === spellTargetId,
    ),
    somaticSpellEffectMayApply: target.activeEffects.some(
      (effect) => effect.kind === "spellDashBonusAction",
    ),
    somaticFailureStartedConcentration: target.concentration !== null,
    ...multiattack,
    holes: state.holes.map(slowHole),
    lastResult: state.lastResult,
  };
}

function slowStatBlockMultiattackProjection(
  state: SlowActivePenaltiesRuntimeState,
): Pick<
  SlowActivePenaltiesProjection,
  | "statBlockMultiattackResourceCount"
  | "statBlockMultiattackDispatchKind"
  | "statBlockMultiattackPendingProcedureRefs"
  | "statBlockMultiattackSourceOwnerMatches"
  | "statBlockMultiattackSourceProcedureMatches"
  | "statBlockMultiattackContinuationOpen"
  | "statBlockMultiattackChosenProcedurePermitted"
> {
  const snapshot = snapshotBattle(state.battle.state);
  const resources = snapshot.turn.actionResources.filter(
    (resource) => resource.source === "statBlockMultiattack",
  );
  const actor = state.battle.state.combatants.get(slowMultiattackTargetId);
  const binding =
    actor?.origin.kind === "statBlock"
      ? statBlockMultiattackBindings(actor.origin.execution)[0]
      : undefined;
  if (resources.length === 0) {
    return {
      statBlockMultiattackResourceCount: 0,
      statBlockMultiattackDispatchKind: "none",
      statBlockMultiattackPendingProcedureRefs: [],
      statBlockMultiattackSourceOwnerMatches: false,
      statBlockMultiattackSourceProcedureMatches: false,
      statBlockMultiattackContinuationOpen: false,
      statBlockMultiattackChosenProcedurePermitted: false,
    };
  }
  if (actor?.origin.kind !== "statBlock" || binding === undefined) {
    throw new Error("Expected bound slowed Stat Block Multiattack resources.");
  }
  const [firstListedProcedureRef] = binding.procedure.dispatchProcedureRefs;
  const alternateListedProcedureRef =
    binding.procedure.dispatchProcedureRefs.find(
      (procedureRef) => procedureRef !== firstListedProcedureRef,
    );
  if (alternateListedProcedureRef === undefined) {
    throw new Error(
      "Expected two distinct procedure executions in the Multiattack fixture.",
    );
  }
  const syntheticProcedureRef = (procedureRef: string): number => {
    if (procedureRef === String(firstListedProcedureRef)) return 0;
    if (procedureRef === String(alternateListedProcedureRef)) return 1;
    throw new Error(`Unexpected slowed Multiattack procedure ${procedureRef}.`);
  };
  const dispatchKinds = new Set(
    resources.map((resource) => resource.dispatch.kind),
  );
  if (dispatchKinds.size !== 1) {
    throw new Error("Expected one coherent slowed Multiattack dispatch shape.");
  }
  const dispatchKind = resources[0]?.dispatch.kind;
  if (dispatchKind === undefined) {
    throw new Error("Expected slowed Multiattack dispatch resources.");
  }
  const pendingProcedureRefs = resources.flatMap((resource) =>
    resource.dispatch.kind === "oneListedChoice"
      ? resource.dispatch.attackProcedureRefs.map((procedureRef) =>
          syntheticProcedureRef(String(procedureRef)),
        )
      : [syntheticProcedureRef(String(resource.dispatch.attackProcedureRef))],
  );
  return {
    statBlockMultiattackResourceCount: resources.length,
    statBlockMultiattackDispatchKind:
      dispatchKind === "listedOccurrence" ? "listedOccurrences" : dispatchKind,
    statBlockMultiattackPendingProcedureRefs: pendingProcedureRefs,
    statBlockMultiattackSourceOwnerMatches: resources.every(
      (resource) => resource.sourceOwnerId === String(slowMultiattackTargetId),
    ),
    statBlockMultiattackSourceProcedureMatches: resources.every(
      (resource) =>
        resource.sourceProcedureRef === String(binding.procedureRef),
    ),
    statBlockMultiattackContinuationOpen: true,
    statBlockMultiattackChosenProcedurePermitted: discoverBattleActs(
      state.battle,
    ).some(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.actorId === slowMultiattackTargetId &&
        candidate.subject.action === "attack" &&
        candidate.subject.procedureRef === alternateListedProcedureRef,
    ),
  };
}

function slowSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "slowArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        cubeSideFeet: 40,
        affectedCreatureWitnesses: outcomes.map((outcome) => ({
          targetId: outcome.targetId,
          inCube: true,
          chosenByCaster: true,
        })),
      },
      outcomes,
    },
  };
}

function requireSlowEndTurnSaveHole(holes: readonly BattleHole[]): Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
> & {
  readonly slowActivePenaltiesEndTurnSave: unknown;
} {
  const hole = requireHole(holes, "savingThrowOutcome");
  if (!("slowActivePenaltiesEndTurnSave" in hole)) {
    throw new Error("Expected Slow end-turn Saving Throw outcome hole.");
  }
  return hole;
}

function requireSlowSomaticSpellFailureHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "slowSomaticSpellFailureOutcome" }> {
  return requireHole(holes, "slowSomaticSpellFailureOutcome");
}

function slowSomaticSpellFailureFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "slowSomaticSpellFailureOutcome" }
  >,
  spellFailed: boolean,
): Extract<BattleFill, { readonly kind: "slowSomaticSpellFailureOutcome" }> {
  return {
    kind: "slowSomaticSpellFailureOutcome",
    holeId: hole.holeId,
    value: { spellFailed },
  };
}

function slowHole(hole: BattleHole): SlowHole {
  if (
    hole.kind === "savingThrowOutcome" &&
    "slowActivePenaltiesEndTurnSave" in hole
  ) {
    return "EndTurnSave";
  }
  if (hole.kind === "slowSomaticSpellFailureOutcome") {
    return "SomaticFailure";
  }
  throw new Error(`Unexpected Slow MBT hole ${hole.kind}.`);
}

function normalizeSlowActivePenaltiesQuintState(
  raw: unknown,
): SlowActivePenaltiesProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["scenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: slowWitnessHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Slow active penalties",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    currentTurnRole: currentTurnRole(state["currentTurnRole"]),
    turnActionOrBonusChoice: actionOrBonusChoiceFromQuint(
      state["turnActionOrBonusChoice"],
    ),
    targetTurnCanSpendAction: booleanField(state, "targetTurnCanSpendAction"),
    targetTurnCanSpendBonusAction: booleanField(
      state,
      "targetTurnCanSpendBonusAction",
    ),
    targetCanMakeAttack: booleanField(state, "targetCanMakeAttack"),
    extraAttackResourceCount: numberFromQuintInt(
      state["extraAttackResourceCount"],
      "qState.extraAttackResourceCount",
    ),
    casterTurnCanSpendBonusAction: booleanField(
      state,
      "casterTurnCanSpendBonusAction",
    ),
    targetSlowed: booleanField(state, "targetSlowed"),
    secondTargetSlowed: booleanField(state, "secondTargetSlowed"),
    multiattackTargetSlowed: booleanField(state, "multiattackTargetSlowed"),
    affectedTargetCount: numberFromQuintInt(
      state["affectedTargetCount"],
      "qState.affectedTargetCount",
    ),
    targetSpeedFeet: numberFromQuintInt(
      state["targetSpeedFeet"],
      "qState.targetSpeedFeet",
    ),
    targetArmorClass: numberFromQuintInt(
      state["targetArmorClass"],
      "qState.targetArmorClass",
    ),
    dexteritySavingThrowDelta: numberFromQuintInt(
      state["dexteritySavingThrowDelta"],
      "qState.dexteritySavingThrowDelta",
    ),
    targetCanReact: booleanField(state, "targetCanReact"),
    casterConcentrating: booleanField(state, "casterConcentrating"),
    somaticFailurePercent: numberFromQuintInt(
      state["somaticFailurePercent"],
      "qState.somaticFailurePercent",
    ),
    somaticFailureSpentCastResources: booleanField(
      state,
      "somaticFailureSpentCastResources",
    ),
    somaticSpellEffectMayApply: booleanField(
      state,
      "somaticSpellEffectMayApply",
    ),
    somaticFailureStartedConcentration: booleanField(
      state,
      "somaticFailureStartedConcentration",
    ),
    statBlockMultiattackResourceCount: numberFromQuintInt(
      state["statBlockMultiattackResourceCount"],
      "qState.statBlockMultiattackResourceCount",
    ),
    statBlockMultiattackDispatchKind: statBlockMultiattackDispatchKind(
      state["statBlockMultiattackDispatchKind"],
    ),
    statBlockMultiattackPendingProcedureRefs: quintList(
      state["statBlockMultiattackPendingProcedureRefs"],
      "qState.statBlockMultiattackPendingProcedureRefs",
    ).map((procedureRef, index) =>
      numberFromQuintInt(
        procedureRef,
        `qState.statBlockMultiattackPendingProcedureRefs[${index}]`,
      ),
    ),
    statBlockMultiattackSourceOwnerMatches: booleanField(
      state,
      "statBlockMultiattackSourceOwnerMatches",
    ),
    statBlockMultiattackSourceProcedureMatches: booleanField(
      state,
      "statBlockMultiattackSourceProcedureMatches",
    ),
    statBlockMultiattackContinuationOpen: booleanField(
      state,
      "statBlockMultiattackContinuationOpen",
    ),
    statBlockMultiattackChosenProcedurePermitted: booleanField(
      state,
      "statBlockMultiattackChosenProcedurePermitted",
    ),
    holes: protocol.holes,
    lastResult: scenarioResult,
  };
}

function compareSlowActivePenaltiesStates(
  runtime: SlowActivePenaltiesProjection,
  quint: SlowActivePenaltiesProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function slowWitnessHole(raw: unknown): SlowHole {
  const tag = quintVariantTag(raw, "SlowHole");
  if (tag === "EndTurnSave") {
    return "EndTurnSave";
  }
  if (tag === "SomaticFailure") {
    return "SomaticFailure";
  }
  throw new Error(`Unexpected Slow witness hole ${tag}.`);
}

function currentTurnRole(
  raw: unknown,
): SlowActivePenaltiesProjection["currentTurnRole"] {
  expect(raw).toBeTypeOf("string");
  if (
    raw === "caster" ||
    raw === "target" ||
    raw === "secondTarget" ||
    raw === "multiattackTarget"
  ) {
    return raw;
  }
  throw new Error(`Unexpected Slow current turn role ${String(raw)}.`);
}

function statBlockMultiattackDispatchKind(
  raw: unknown,
): SlowActivePenaltiesProjection["statBlockMultiattackDispatchKind"] {
  expect(raw).toBeTypeOf("string");
  if (
    raw === "none" ||
    raw === "oneListedChoice" ||
    raw === "listedOccurrences"
  ) {
    return raw;
  }
  throw new Error(
    `Unexpected slowed Multiattack dispatch kind ${String(raw)}.`,
  );
}

function endConcentrationAct(
  session: BattleRuntimeSession,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        {
          readonly tag: "runtimeCommand";
          readonly command: "endConcentration";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "endConcentration" &&
      candidate.subject.actorId === spellCasterId,
  );
  if (act === undefined) {
    throw new Error("Expected public Slow End Concentration act.");
  }
  return act;
}

function actionAct(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  action: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "action" }
  >["action"],
  attackName?: string,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "action" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "action" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === action &&
      (attackName === undefined ||
        candidate.summary === `Take the Attack action with ${attackName}.`),
  );
  if (act === undefined) {
    throw new Error(`Expected ${action} act for ${actorId}.`);
  }
  return act;
}

function spellActForActor(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  unitId: string,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    {
      readonly tag: "actionSpell" | "bonusActionSpell" | "bonusActionDashSpell";
    }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        {
          readonly tag:
            | "actionSpell"
            | "bonusActionSpell"
            | "bonusActionDashSpell";
        }
      >;
    } =>
      (candidate.subject.tag === "actionSpell" ||
        candidate.subject.tag === "bonusActionSpell" ||
        candidate.subject.tag === "bonusActionDashSpell") &&
      candidate.subject.actorId === actorId &&
      battleActSpellPresentation(candidate)?.invocation.spellId === unitId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${unitId} spell act for ${actorId}.`);
  }
  return act;
}

function actionOrBonusChoice(
  resources: BattleState["currentTurnResources"],
): SlowActivePenaltiesProjection["turnActionOrBonusChoice"] {
  return resources.actionOrBonusActionExclusion.kind === "notRestricted"
    ? "notRestricted"
    : resources.actionOrBonusActionExclusion.choice;
}

function actionOrBonusChoiceFromQuint(
  raw: unknown,
): SlowActivePenaltiesProjection["turnActionOrBonusChoice"] {
  expect(raw).toBeTypeOf("string");
  if (
    raw === "notRestricted" ||
    raw === "notChosen" ||
    raw === "action" ||
    raw === "bonusAction"
  ) {
    return raw;
  }
  throw new Error(`Unexpected Slow action/bonus choice ${String(raw)}.`);
}

function lastResult(raw: unknown): LastResult {
  const tag = quintVariantTag(raw, "qState.scenarioOutcome");
  if (isScenarioOutcomeTag(tag)) return SCENARIO_OUTCOME_BY_TAG[tag];
  throw new Error(`Unexpected scenario outcome variant ${tag}.`);
}

function isScenarioOutcomeTag(
  tag: string,
): tag is keyof typeof SCENARIO_OUTCOME_BY_TAG {
  return Object.hasOwn(SCENARIO_OUTCOME_BY_TAG, tag);
}
