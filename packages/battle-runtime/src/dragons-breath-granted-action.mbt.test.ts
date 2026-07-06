// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-dragons-breath-granted-action
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dragon's Breath:
//   target-granted Magic Action exhalation, 15-foot Cone, Dexterity Saving
//   Throw, chosen damage type, save-for-half damage, and higher-slot scaling.
// - .references/srd-5.2.1/Rules-Glossary.md#Cone and #Concentration.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls.
// - packages/surface/content/dragons_breath.dhall declares SRD 5.2.1
//   provenance for the spell record used by this driver.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Saving Throw, Concentration, Cast
//   Level, Spell Effect, Damage Roll, and Area of Effect.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Hp, type DamageType } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, it } from "vitest";
import dragonsBreathInput from "../../surface/content/dragons_breath.json";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  damageTypeChoiceFill,
  knownWillingSpellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  spellSaveDcForCaster,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  dragonsBreathUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";

type DragonsBreathTurnRole = "caster" | "target";
type DragonsBreathSlotLevel = 2 | 3;
type DragonsBreathLegalDamageType =
  (typeof DRAGONS_BREATH_DAMAGE_TYPES)[number];
type DragonsBreathDamageType = DragonsBreathLegalDamageType | "none";
type DragonsBreathSaveOutcome = "none" | "success" | "failure";
type DragonsBreathHole =
  | "SavingThrowOutcome"
  | "DamageRoll"
  | "ConcentrationSavingThrow";
type DragonsBreathLastResult =
  | "init"
  | "cast"
  | "targetTurn"
  | "needsSave"
  | "needsDamage"
  | "needsConcentration"
  | "exhaled"
  | "concentrationBroken";
const DRAGONS_BREATH_GRANTED_ACTION_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, DragonsBreathLastResult>
> = {
  Init: "init",
  Cast: "cast",
  TargetTurn: "targetTurn",
  NeedsSave: "needsSave",
  NeedsDamage: "needsDamage",
  NeedsConcentration: "needsConcentration",
  Exhaled: "exhaled",
  ConcentrationBroken: "concentrationBroken",
} as const;


type DragonsBreathGrantedActionState = {
  readonly turnRole: DragonsBreathTurnRole;
  readonly magicActionAvailable: boolean;
  readonly spellInvocationAvailable: boolean;
  readonly targetEffectActive: boolean;
  readonly effectDamageType: DragonsBreathDamageType;
  readonly effectOriginalSlotLevel: number;
  readonly effectSpellSaveDc: number;
  readonly saveOutcome: DragonsBreathSaveOutcome;
  readonly damageRollTotal: number;
  readonly casterHp: number;
  readonly casterConcentrating: boolean;
  readonly holes: readonly DragonsBreathHole[];
  readonly lastResult: DragonsBreathLastResult;
};

type DragonsBreathRuntimeState = {
  readonly battle: BattleState;
  readonly turnRole: DragonsBreathTurnRole;
  readonly holes: readonly BattleHole[];
  readonly pendingExhale: BattleSubject | null;
  readonly pendingDamageHole: Extract<
    BattleHole,
    { readonly kind: "rolledDice" }
  > | null;
  readonly saveOutcome: DragonsBreathSaveOutcome;
  readonly damageRollTotal: number;
  readonly lastResult: DragonsBreathLastResult;
};

type DragonsBreathEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "dragonsBreath" }
>;

const DRAGONS_BREATH_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const satisfies ReadonlyArray<DamageType>;

const DRAGONS_BREATH_DAMAGE_ROLLS = {
  2: [[2, 2, 2]],
  3: [[2, 3, 3, 3]],
} as const satisfies Record<
  DragonsBreathSlotLevel,
  readonly (readonly number[])[]
>;

const CASTER_FULL_HP = 12;

const driverSchema = {
  init: {},
  doCastDragonsBreath: {
    damageType: mbtPickSchemas.unknown,
    slotLevel: mbtPickSchemas.int,
  },
  doEndCasterTurn: {},
  doRequestSavingThrow: {},
  doResolveSavingThrow: {
    saveSucceeded: mbtPickSchemas.bool,
  },
  doResolveDamageRoll: {},
  doResolveConcentration: {
    concentrationSucceeded: mbtPickSchemas.bool,
  },
  doBreakConcentration: {},
  step: {},
} as const;

function createDragonsBreathGrantedActionDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastDragonsBreath: (input: {
        readonly damageType: unknown;
        readonly slotLevel: number;
      }) => {
        state = castDragonsBreath(
          state,
          dragonsBreathDamageType(input.damageType),
          dragonsBreathSlotLevel(input.slotLevel),
        );
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doRequestSavingThrow: () => {
        state = requestSavingThrow(state);
      },
      doResolveSavingThrow: (input: { readonly saveSucceeded: boolean }) => {
        state = resolveSavingThrow(state, input.saveSucceeded);
      },
      doResolveDamageRoll: () => {
        state = resolveDamageRoll(state);
      },
      doResolveConcentration: (input: {
        readonly concentrationSucceeded: boolean;
      }) => {
        state = resolveConcentration(state, input.concentrationSucceeded);
      },
      doBreakConcentration: () => {
        state = breakDragonsBreathConcentration(state);
      },
      step: () => {},
      getState: () => dragonsBreathGrantedActionProjection(state),
    };
  });
}

const dragonsBreathGrantedActionStateCheck = stateCheck(
  normalizeDragonsBreathQuintState,
  compareDragonsBreathStates,
);

describe("Dragon's Breath granted-action MBT parity", () => {
  it("discovers the target-granted Magic action with a Dexterity save hole", () => {
    const ready = endCasterTurn(
      castDragonsBreath(initialRuntimeState(), "fire", 2),
    );
    const needsSave = requestSavingThrow(ready);

    expect(dragonsBreathGrantedActionProjection(needsSave)).toMatchObject({
      turnRole: "target",
      magicActionAvailable: true,
      targetEffectActive: true,
      effectDamageType: "fire",
      effectOriginalSlotLevel: 2,
      holes: ["SavingThrowOutcome"],
      lastResult: "needsSave",
    });
  });

  it("uses the retained damage type and slot-scaled damage roll hole", () => {
    const ready = endCasterTurn(
      castDragonsBreath(initialRuntimeState(), "cold", 3),
    );
    const needsSave = requestSavingThrow(ready);
    const needsDamage = resolveSavingThrow(needsSave, false);

    expect(dragonsBreathGrantedActionProjection(needsDamage)).toMatchObject({
      effectDamageType: "cold",
      effectOriginalSlotLevel: 3,
      saveOutcome: "failure",
      holes: ["DamageRoll"],
      lastResult: "needsDamage",
    });
  });

  it("applies failed-save damage and spends the target Magic action", () => {
    const ready = endCasterTurn(
      castDragonsBreath(initialRuntimeState(), "lightning", 2),
    );
    const needsSave = requestSavingThrow(ready);
    const needsDamage = resolveSavingThrow(needsSave, false);
    const needsConcentration = resolveDamageRoll(needsDamage);
    const exhaled = resolveConcentration(needsConcentration, true);

    expect(dragonsBreathGrantedActionProjection(exhaled)).toMatchObject({
      magicActionAvailable: false,
      effectDamageType: "lightning",
      saveOutcome: "failure",
      damageRollTotal: 6,
      casterHp: CASTER_FULL_HP - 6,
      holes: [],
      lastResult: "exhaled",
    });
  });

  it("halves successful-save damage before concentration follow-up", () => {
    const ready = endCasterTurn(
      castDragonsBreath(initialRuntimeState(), "poison", 3),
    );
    const needsSave = requestSavingThrow(ready);
    const needsDamage = resolveSavingThrow(needsSave, true);
    const needsConcentration = resolveDamageRoll(needsDamage);
    const exhaled = resolveConcentration(needsConcentration, true);

    expect(dragonsBreathGrantedActionProjection(exhaled)).toMatchObject({
      saveOutcome: "success",
      damageRollTotal: 11,
      casterHp: CASTER_FULL_HP - 5,
      holes: [],
      lastResult: "exhaled",
    });
  });

  it("keeps Cone geometry as caller/table-owned facts", () => {
    const ready = endCasterTurn(
      castDragonsBreath(initialRuntimeState(), "acid", 2),
    );
    const needsSave = requestSavingThrow(ready);

    expect(
      Object.keys(dragonsBreathGrantedActionProjection(needsSave)).sort(),
    ).toEqual([
      "casterConcentrating",
      "casterHp",
      "damageRollTotal",
      "effectDamageType",
      "effectOriginalSlotLevel",
      "effectSpellSaveDc",
      "holes",
      "lastResult",
      "magicActionAvailable",
      "saveOutcome",
      "spellInvocationAvailable",
      "targetEffectActive",
      "turnRole",
    ]);
  });

  it(
    "matches the TS reducer slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-dragons-breath-granted-action.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDragonsBreathGrantedActionDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(7),
        stateCheck: dragonsBreathGrantedActionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): DragonsBreathRuntimeState {
  const battle = spellBattle({
    preparedSpells: [dragonsBreathSpell()],
    spellSlots: [
      { spellLevel: 2, count: 1 },
      { spellLevel: 3, count: 1 },
    ],
  });
  const caster = requireCombatant(battle, spellCasterId);
  return {
    battle: {
      ...battle,
      combatants: new Map(battle.combatants).set(spellCasterId, {
        ...caster,
        hp: Hp(CASTER_FULL_HP),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    },
    turnRole: "caster",
    holes: [],
    pendingExhale: null,
    pendingDamageHole: null,
    saveOutcome: "none",
    damageRollTotal: 0,
    lastResult: "init",
  };
}

function castDragonsBreath(
  state: DragonsBreathRuntimeState,
  damageType: DragonsBreathLegalDamageType,
  slotLevel: DragonsBreathSlotLevel,
): DragonsBreathRuntimeState {
  const act = bonusSpellAct({
    state: state.battle,
    spellId: dragonsBreathUnitId,
    slotLevel,
  });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetListFill(
          targetHole,
          spellCasterId,
          dragonsBreathUnitId,
          [spellTargetId],
        ),
        damageTypeChoiceFill(damageTypeHole, damageType),
      ],
    }),
    "Expected Dragon's Breath cast to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    turnRole: "caster",
    holes: [],
    pendingExhale: null,
    pendingDamageHole: null,
    saveOutcome: "none",
    damageRollTotal: 0,
    lastResult: "cast",
  };
}

function endCasterTurn(
  state: DragonsBreathRuntimeState,
): DragonsBreathRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Dragon's Breath caster End Turn to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    turnRole: "target",
    holes: [],
    pendingExhale: null,
    pendingDamageHole: null,
    saveOutcome: "none",
    damageRollTotal: 0,
    lastResult: "targetTurn",
  };
}

function requestSavingThrow(
  state: DragonsBreathRuntimeState,
): DragonsBreathRuntimeState {
  const exhaleAct = dragonsBreathExhaleAct(state.battle);
  const result = resolveBattleSubject({
    state: state.battle,
    subject: exhaleAct.subject,
    fills: [],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Dragon's Breath exhale Saving Throw hole.");
  }
  const saveHole = requireResultHole(result, "savingThrowOutcome");
  expect(saveHole).toMatchObject({
    ability: "dex",
    dragonsBreath: {
      sourceCombatantId: spellCasterId,
      sourceSpellId: dragonsBreathUnitId,
      lengthFeet: 15,
    },
  });
  return {
    ...state,
    holes: result.holes,
    pendingExhale: exhaleAct.subject,
    pendingDamageHole: null,
    lastResult: "needsSave",
  };
}

function resolveSavingThrow(
  state: DragonsBreathRuntimeState,
  saveSucceeded: boolean,
): DragonsBreathRuntimeState {
  const subject = requirePendingExhale(state);
  const saveHole = requireHole(state.holes, "savingThrowOutcome");
  const saveFill = dragonsBreathSavingThrowOutcomeFill(saveHole, saveSucceeded);
  const result = resolveBattleSubject({
    state: state.battle,
    subject,
    fills: [saveFill],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "rolledDice" })],
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Dragon's Breath damage roll hole.");
  }
  const damageHole = requireResultHole(result, "rolledDice");
  const effect = requireDragonsBreathTargetEffect(state.battle);
  expect(damageHole).toMatchObject({
    dragonsBreath: {
      sourceCombatantId: spellCasterId,
      sourceSpellId: dragonsBreathUnitId,
      damageType: effect.damageType,
      expr: {
        dice: Number(effect.originalSlotLevel) + 1,
        dieSize: 6,
      },
    },
  });
  return {
    ...state,
    holes: result.holes,
    pendingExhale: subject,
    pendingDamageHole: damageHole,
    saveOutcome: saveSucceeded ? "success" : "failure",
    lastResult: "needsDamage",
  };
}

function resolveDamageRoll(
  state: DragonsBreathRuntimeState,
): DragonsBreathRuntimeState {
  const subject = requirePendingExhale(state);
  const saveHole = dragonsBreathSavingThrowHole(state);
  const damageHole = requireHole(state.holes, "rolledDice");
  const effect = requireDragonsBreathTargetEffect(state.battle);
  const damageRoll = dragonsBreathDamageRoll(effect.originalSlotLevel);
  const result = resolveBattleSubject({
    state: state.battle,
    subject,
    fills: [
      dragonsBreathSavingThrowOutcomeFill(
        saveHole,
        state.saveOutcome === "success",
      ),
      damageRollFillWithGroups(damageHole, damageRoll.groups),
    ],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "concentrationSavingThrow" })],
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Dragon's Breath concentration hole.");
  }
  return {
    ...state,
    holes: result.holes,
    pendingExhale: subject,
    pendingDamageHole: damageHole,
    damageRollTotal: damageRoll.total,
    lastResult: "needsConcentration",
  };
}

function resolveConcentration(
  state: DragonsBreathRuntimeState,
  concentrationSucceeded: boolean,
): DragonsBreathRuntimeState {
  const subject = requirePendingExhale(state);
  const saveHole = dragonsBreathSavingThrowHole(state);
  const damageHole = requirePendingDamageHole(state);
  const concentrationHole = requireHole(
    state.holes,
    "concentrationSavingThrow",
  );
  const effect = requireDragonsBreathTargetEffect(state.battle);
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(
          saveHole,
          state.saveOutcome === "success",
        ),
        damageRollFillWithGroups(
          damageHole,
          dragonsBreathDamageRoll(effect.originalSlotLevel).groups,
        ),
        {
          kind: "concentrationSavingThrow",
          holeId: concentrationHole.holeId,
          value: { succeeded: concentrationSucceeded },
        },
      ],
    }),
    "Expected Dragon's Breath exhale to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    pendingExhale: null,
    pendingDamageHole: null,
    lastResult: "exhaled",
  };
}

function breakDragonsBreathConcentration(
  state: DragonsBreathRuntimeState,
): DragonsBreathRuntimeState {
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    holes: [],
    pendingExhale: null,
    pendingDamageHole: null,
    saveOutcome: "none",
    lastResult: "concentrationBroken",
  };
}

function dragonsBreathGrantedActionProjection(
  state: DragonsBreathRuntimeState,
): DragonsBreathGrantedActionState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const effect = dragonsBreathTargetEffect(state.battle);
  const casterConcentrating =
    caster.concentration?.sourceSpellId === dragonsBreathUnitId &&
    caster.concentration.effectKind === "spellEffect";
  const projection = {
    turnRole: state.turnRole,
    magicActionAvailable: canSpendAction(
      state.battle.currentTurnResources,
      "magic",
    ),
    spellInvocationAvailable: spellInvocationAvailable(state.battle),
    targetEffectActive: effect !== undefined,
    effectDamageType:
      effect === undefined
        ? "none"
        : dragonsBreathDamageType(effect.damageType),
    effectOriginalSlotLevel: Number(effect?.originalSlotLevel ?? 0),
    effectSpellSaveDc: effect === undefined ? 0 : Number(effect.spellSaveDc),
    saveOutcome: state.saveOutcome,
    damageRollTotal: state.damageRollTotal,
    casterHp: Number(caster.hp),
    casterConcentrating,
    holes: battleHolesToDragonsBreathHoles(state.holes),
    lastResult: state.lastResult,
  } satisfies DragonsBreathGrantedActionState;
  expect(projection.casterConcentrating).toBe(projection.targetEffectActive);
  if (effect !== undefined) {
    expect(projection.effectSpellSaveDc).toBe(
      Number(spellSaveDcForCaster(state.battle, spellCasterId)),
    );
  }
  return projection;
}

function spellInvocationAvailable(state: BattleState): boolean {
  return discoverBattleActs(state).some(
    (act) =>
      act.subject.tag === "bonusActionSpell" &&
      act.subject.invocation.spellId === dragonsBreathUnitId,
  );
}

function dragonsBreathExhaleAct(state: BattleState): AvailableBattleAct {
  const exhaleAct = discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "dragonsBreathExhale",
  );
  if (
    exhaleAct?.subject.tag !== "runtimeCommand" ||
    exhaleAct.subject.command !== "dragonsBreathExhale"
  ) {
    throw new Error("Expected Dragon's Breath exhale action.");
  }
  return exhaleAct;
}

function dragonsBreathTargetEffect(
  state: BattleState,
): DragonsBreathEffect | undefined {
  return requireCombatant(state, spellTargetId).activeEffects.find(
    (effect): effect is DragonsBreathEffect =>
      effect.kind === "dragonsBreath" &&
      effect.sourceSpellId === dragonsBreathUnitId &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function requireDragonsBreathTargetEffect(
  state: BattleState,
): DragonsBreathEffect {
  const effect = dragonsBreathTargetEffect(state);
  if (effect === undefined) {
    throw new Error("Expected active Dragon's Breath target effect.");
  }
  return effect;
}

function dragonsBreathSavingThrowHole(
  state: DragonsBreathRuntimeState,
): Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> {
  const exhaleAct = dragonsBreathExhaleAct(state.battle);
  return requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
}

function requirePendingDamageHole(
  state: DragonsBreathRuntimeState,
): Extract<BattleHole, { readonly kind: "rolledDice" }> {
  if (state.pendingDamageHole === null) {
    throw new Error("Expected Dragon's Breath damage roll hole.");
  }
  return state.pendingDamageHole;
}

function requirePendingExhale(state: DragonsBreathRuntimeState): BattleSubject {
  if (state.pendingExhale === null) {
    throw new Error("Expected pending Dragon's Breath exhale subject.");
  }
  return state.pendingExhale;
}

function dragonsBreathDamageRoll(slotLevel: number): {
  readonly groups: readonly (readonly number[])[];
  readonly total: number;
} {
  const groups = DRAGONS_BREATH_DAMAGE_ROLLS[dragonsBreathSlotLevel(slotLevel)];
  return {
    groups,
    total: groups.flat().reduce((sum, roll) => sum + roll, 0),
  };
}

function dragonsBreathSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(dragonsBreathInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}

function dragonsBreathSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellCasterId],
      },
      outcomes: [{ targetId: spellCasterId, succeeded }],
    },
  };
}

function battleHolesToDragonsBreathHoles(
  holes: readonly BattleHole[],
): readonly DragonsBreathHole[] {
  return holes
    .map((hole): DragonsBreathHole => {
      if (hole.kind === "savingThrowOutcome" && "dragonsBreath" in hole) {
        return "SavingThrowOutcome";
      }
      if (hole.kind === "rolledDice" && "dragonsBreath" in hole) {
        return "DamageRoll";
      }
      if (hole.kind === "concentrationSavingThrow") {
        return "ConcentrationSavingThrow";
      }
      throw new Error(`Unexpected Dragon's Breath hole ${hole.kind}.`);
    })
    .sort();
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

function normalizeDragonsBreathQuintState(
  raw: unknown,
): DragonsBreathGrantedActionState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const lastResult = dragonsBreathLastResult(state["qScenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "none",
    decodeHole: dragonsBreathHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Dragon's Breath granted action",
    scenarioOutcome: lastResult,
    protocol,
  });
  return {
    turnRole: dragonsBreathTurnRole(state["qTurnRole"]),
    magicActionAvailable: booleanField(state, "qMagicActionAvailable"),
    spellInvocationAvailable: booleanField(state, "qSpellInvocationAvailable"),
    targetEffectActive: booleanField(state, "qTargetEffectActive"),
    effectDamageType: dragonsBreathDamageTypeOrNone(state["qEffectDamageType"]),
    effectOriginalSlotLevel: numberFromQuintInt(
      state["qEffectOriginalSlotLevel"],
      "qEffectOriginalSlotLevel",
    ),
    effectSpellSaveDc: numberFromQuintInt(
      state["qEffectSpellSaveDc"],
      "qEffectSpellSaveDc",
    ),
    saveOutcome: dragonsBreathSaveOutcome(state["qSaveOutcome"]),
    damageRollTotal: numberFromQuintInt(
      state["qDamageRollTotal"],
      "qDamageRollTotal",
    ),
    casterHp: numberFromQuintInt(state["qCasterHp"], "qCasterHp"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    holes: protocol.holes,
    lastResult,
  };
}

function compareDragonsBreathStates(
  runtime: DragonsBreathGrantedActionState,
  quint: DragonsBreathGrantedActionState,
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

function dragonsBreathTurnRole(raw: unknown): DragonsBreathTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown Dragon's Breath turn role: ${String(raw)}.`);
}

function dragonsBreathSlotLevel(raw: unknown): DragonsBreathSlotLevel {
  if (raw === 2 || raw === 3) return raw;
  throw new Error(`Unknown Dragon's Breath slot level: ${String(raw)}.`);
}

function dragonsBreathDamageType(raw: unknown): DragonsBreathLegalDamageType {
  if (
    raw === "acid" ||
    raw === "cold" ||
    raw === "fire" ||
    raw === "lightning" ||
    raw === "poison"
  ) {
    return raw;
  }
  throw new Error(`Unknown Dragon's Breath damage type: ${String(raw)}.`);
}

function dragonsBreathDamageTypeOrNone(raw: unknown): DragonsBreathDamageType {
  if (raw === "none") return raw;
  return dragonsBreathDamageType(raw);
}

function dragonsBreathSaveOutcome(raw: unknown): DragonsBreathSaveOutcome {
  if (raw === "none" || raw === "success" || raw === "failure") return raw;
  throw new Error(`Unknown Dragon's Breath save outcome: ${String(raw)}.`);
}

function dragonsBreathHole(raw: unknown): DragonsBreathHole {
  const tag = quintVariantTag(raw, "protocol.holes");
  if (
    tag === "SavingThrowOutcome" ||
    tag === "DamageRoll" ||
    tag === "ConcentrationSavingThrow"
  ) {
    return tag;
  }
  throw new Error(`Unknown Dragon's Breath hole: ${String(raw)}.`);
}

function dragonsBreathLastResult(raw: unknown): DragonsBreathLastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value = DRAGONS_BREATH_GRANTED_ACTION_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}
