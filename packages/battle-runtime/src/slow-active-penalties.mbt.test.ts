// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
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
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { describe, expect, it } from "vitest";

import {
  activeEffectArmorClass,
  combatantCanTakeReactions,
} from "./battle-reducer/creature-state.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { savingThrowFlatBonusProjections } from "./battle-reducer/spells-damage-fills.ts";
import { SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT } from "./battle-reducer/domain-constants.ts";
import {
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  expeditiousRetreatUnitId,
  slowUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { combatantId } from "./identity.ts";
import {
  attackRollFill,
  attackTargetFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { extraAttackBattleUnitRef } from "./unit-profile-admission-feature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { monsterMultiattackStatBlock } from "./battle-runtime-test-support.ts";

const LAST_RESULTS = [
  "init",
  "failedSave",
  "targetTurn",
  "needsSave",
  "saved",
  "failedAgain",
  "spentAction",
  "attackedOnce",
  "needsSomaticFailure",
  "somaticSpellFailed",
  "selfFailedSave",
  "multiattackFailedSave",
  "multiattackTargetTurn",
  "multiattackedOnce",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);
const slowMultiattackTargetId = combatantId(
  "slow-active-penalties-mbt-multiattack-target",
);

const SLOW_HOLES = ["EndTurnSave", "SomaticFailure"] as const;
type SlowHole = (typeof SLOW_HOLES)[number];

type SlowActivePenaltiesProjection = {
  readonly currentTurnRole: "caster" | "target" | "multiattackTarget";
  readonly turnActionOrBonusChoice:
    | "notRestricted"
    | "notChosen"
    | "action"
    | "bonusAction";
  readonly targetTurnCanSpendAction: boolean;
  readonly targetTurnCanSpendBonusAction: boolean;
  readonly extraAttackResourceCount: number;
  readonly casterTurnCanSpendBonusAction: boolean;
  readonly statBlockMultiattackResourceCount: number;
  readonly targetSlowed: boolean;
  readonly targetSpeedFeet: number;
  readonly targetArmorClass: number;
  readonly dexteritySavingThrowDelta: number;
  readonly targetCanReact: boolean;
  readonly casterConcentrating: boolean;
  readonly holes: readonly SlowHole[];
  readonly lastResult: LastResult;
};

type SlowActivePenaltiesRuntimeState = {
  readonly battle: BattleState;
  readonly currentTurnRole: "caster" | "target" | "multiattackTarget";
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
  doMakeTargetAttack: {},
  doRequestSomaticFailure: {},
  doFillSomaticSpellFailure: {},
  doCastSlowSelfFailedSave: {},
  doCastSlowMultiattackFailedSave: {},
  doEndCasterTurnForMultiattackTarget: {},
  doMakeSlowedStatBlockMultiattack: {},
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
      doCastSlowMultiattackFailedSave: () => {
        state = castSlowMultiattackFailedSave(state);
      },
      doEndCasterTurnForMultiattackTarget: () => {
        state = endCasterTurnForMultiattackTarget(state);
      },
      doMakeSlowedStatBlockMultiattack: () => {
        state = makeSlowedStatBlockMultiattack(state);
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
    const multiattacked = makeSlowedStatBlockMultiattack(multiattackTurn);
    expect(slowActivePenaltiesProjection(multiattackTurn)).toMatchObject({
      currentTurnRole: "multiattackTarget",
      turnActionOrBonusChoice: "notChosen",
      targetTurnCanSpendAction: true,
      targetTurnCanSpendBonusAction: true,
      statBlockMultiattackResourceCount: 0,
      lastResult: "multiattackTargetTurn",
    });
    expect(slowActivePenaltiesProjection(multiattacked)).toMatchObject({
      currentTurnRole: "multiattackTarget",
      turnActionOrBonusChoice: "action",
      targetTurnCanSpendAction: false,
      targetTurnCanSpendBonusAction: false,
      statBlockMultiattackResourceCount: 0,
      lastResult: "multiattackedOnce",
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
      targetUnitRefs: [extraAttackBattleUnitRef()],
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

function castSlowFailedSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "init") {
    return state;
  }
  const act = spellAct({
    state: state.battle,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: state.battle,
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
    battle: resolved.state,
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
    state: state.battle,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: state.battle,
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
    battle: resolved.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: "selfFailedSave",
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
    state: multiattackState.battle,
    spellId: slowUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: multiattackState.battle,
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
    battle: resolved.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: "multiattackFailedSave",
  };
}

function endCasterTurn(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "failedSave") {
    return state;
  }
  const resolved = endTurn({
    state: state.battle,
    actorId: spellCasterId,
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return {
    battle: resolved.state,
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
    state: state.battle,
    actorId: spellCasterId,
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return {
    battle: resolved.state,
    currentTurnRole: "multiattackTarget",
    holes: [],
    lastResult: "multiattackTargetTurn",
  };
}

function requestEndTurnSave(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "targetTurn") {
    return state;
  }
  const needsSave = endTurn({
    state: state.battle,
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
    state: state.battle,
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
    battle: resolved.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: succeeded ? "saved" : "failedAgain",
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
    state: state.battle,
    subject: act.subject,
    fills: [],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected slowed Dodge action to resolve.");
  }
  return {
    battle: resolved.state,
    currentTurnRole: "target",
    holes: [],
    lastResult: "spentAction",
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
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    targetHole,
    spellTargetId,
    spellCasterId,
    "Club",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const resolved = resolveBattleSubject({
    state: state.battle,
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
    battle: resolved.state,
    currentTurnRole: "target",
    holes: [],
    lastResult: "attackedOnce",
  };
}

function makeSlowedStatBlockMultiattack(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesRuntimeState {
  if (state.lastResult !== "multiattackTargetTurn") {
    return state;
  }
  const act = actionAct(state.battle, slowMultiattackTargetId, "multiattack");
  const resolved = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected slowed Stat Block Multiattack to resolve.");
  }
  return {
    battle: resolved.state,
    currentTurnRole: "multiattackTarget",
    holes: [],
    lastResult: "multiattackedOnce",
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
    state: state.battle,
    subject: act.subject,
    fills: [slowSomaticSpellFailureFill(hole, true)],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected failed slowed Somatic spell cast to resolve.");
  }
  return {
    battle: resolved.state,
    currentTurnRole: "target",
    holes: [],
    lastResult: "somaticSpellFailed",
  };
}

function slowActivePenaltiesProjection(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesProjection {
  const target = requireCombatant(state.battle, spellTargetId);
  const caster = requireCombatant(state.battle, spellCasterId);
  const dexteritySavingThrowDelta =
    savingThrowFlatBonusProjections(state.battle, "dex").find(
      (projection) => projection.targetId === spellTargetId,
    )?.bonus ?? 0;
  const turnResources = state.battle.currentTurnResources;
  return {
    currentTurnRole: state.currentTurnRole,
    turnActionOrBonusChoice: actionOrBonusChoice(turnResources),
    targetTurnCanSpendAction:
      state.currentTurnRole !== "caster" &&
      canSpendAction(turnResources, "dodge"),
    targetTurnCanSpendBonusAction:
      state.currentTurnRole !== "caster" && canSpendBonusAction(turnResources),
    extraAttackResourceCount: turnResources.actionResources.filter(
      (resource) => resource.source === "classFeatureExtraAttack",
    ).length,
    casterTurnCanSpendBonusAction:
      state.currentTurnRole === "caster" && canSpendBonusAction(turnResources),
    statBlockMultiattackResourceCount: turnResources.actionResources.filter(
      (resource) => resource.source === "statBlockMultiattack",
    ).length,
    targetSlowed: target.activeEffects.some(
      (effect) => effect.kind === "slowActivePenalties",
    ),
    targetSpeedFeet: Number(effectiveWalkSpeed(target)),
    targetArmorClass: Number(currentArmorClass(activeEffectArmorClass(target))),
    dexteritySavingThrowDelta,
    targetCanReact: combatantCanTakeReactions(target),
    casterConcentrating: caster.concentration?.sourceSpellId === slowUnitId,
    holes: state.holes.map(slowHole),
    lastResult: state.lastResult,
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
  const scenarioResult = lastResult(state["scenarioResult"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: slowWitnessHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Slow active penalties",
    scenarioResult,
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
    extraAttackResourceCount: numberFromQuintInt(
      state["extraAttackResourceCount"],
      "qState.extraAttackResourceCount",
    ),
    casterTurnCanSpendBonusAction: booleanField(
      state,
      "casterTurnCanSpendBonusAction",
    ),
    statBlockMultiattackResourceCount: numberFromQuintInt(
      state["statBlockMultiattackResourceCount"],
      "qState.statBlockMultiattackResourceCount",
    ),
    targetSlowed: booleanField(state, "targetSlowed"),
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
  if (raw === "caster" || raw === "target" || raw === "multiattackTarget") {
    return raw;
  }
  throw new Error(`Unexpected Slow current turn role ${String(raw)}.`);
}

function actionAct(
  state: BattleState,
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
  const act = discoverBattleActs(state).find(
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
        ("attackName" in candidate.subject &&
          candidate.subject.attackName === attackName)),
  );
  if (act === undefined) {
    throw new Error(`Expected ${action} act for ${actorId}.`);
  }
  return act;
}

function spellActForActor(
  state: BattleState,
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
  const act = discoverBattleActs(state).find(
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
      candidate.subject.invocation.spellId === unitId,
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
  expect(raw).toBeTypeOf("string");
  if (typeof raw === "string" && LAST_RESULT_SET.has(raw)) {
    return raw as LastResult;
  }
  throw new Error(`Unexpected Slow result ${String(raw)}.`);
}
