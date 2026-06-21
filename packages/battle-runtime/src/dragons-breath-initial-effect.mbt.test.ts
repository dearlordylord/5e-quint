// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-dragons-breath-initial
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dragon's Breath:
//   Bonus Action, Touch, Concentration up to 1 minute; one willing creature;
//   Acid, Cold, Fire, Lightning, or Poison choice; target can take a Magic
//   action to exhale the granted 15-foot Cone.
// - packages/surface/content/dragons_breath.dhall declares provenance
//   { kind = "srd-5.2.1", section = "Spells/Descriptions-A-D#Dragon's Breath" }.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Slot,
//   Concentration, Spell Invocation, Spell Effect, Cast Level, Duration, and
//   Area of Effect.
import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { DamageType } from "@dnd/shared/types";
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
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  spellSaveDcForCaster,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";
import {
  dragonsBreathUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetListFill,
  maybeBonusSpellAct,
} from "./unit-profile-admission-spell-fill-support.ts";

type DragonsBreathTurnRole = "caster" | "target";
type DragonsBreathLegalDamageType =
  (typeof DRAGONS_BREATH_DAMAGE_TYPES)[number];
type DragonsBreathDamageType = DragonsBreathLegalDamageType | "none";
type DragonsBreathLastResult =
  | "init"
  | "cast"
  | "targetTurn"
  | "concentrationBroken";
const DRAGONS_BREATH_INITIAL_EFFECT_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, DragonsBreathLastResult>
> = {
  Init: "init",
  Cast: "cast",
  TargetTurn: "targetTurn",
  ConcentrationBroken: "concentrationBroken",
} as const;


type DragonsBreathInitialEffectState = {
  readonly turnRole: DragonsBreathTurnRole;
  readonly bonusActionAvailable: boolean;
  readonly spellInvocationAvailable: boolean;
  readonly targetEffectActive: boolean;
  readonly effectDamageType: DragonsBreathDamageType;
  readonly effectOriginalSlotLevel: number;
  readonly effectSpellSaveDc: number;
  readonly effectDurationTicks: number;
  readonly casterConcentrating: boolean;
  readonly grantedMagicActionAvailable: boolean;
  readonly lastResult: DragonsBreathLastResult;
};

type DragonsBreathInitialRuntimeState = {
  readonly battle: BattleState;
  readonly turnRole: DragonsBreathTurnRole;
  readonly lastResult: DragonsBreathLastResult;
};

type DragonsBreathEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "dragonsBreath" }
>;

const DRAGONS_BREATH_DURATION_TICKS = 10;
const DRAGONS_BREATH_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const satisfies ReadonlyArray<DamageType>;

const driverSchema = {
  init: {},
  doCastDragonsBreath: {
    damageType: mbtPickSchemas.unknown,
    slotLevel: mbtPickSchemas.int,
  },
  doEndCasterTurn: {},
  doBreakConcentration: {},
  step: {},
} as const;

function createDragonsBreathInitialEffectDriver() {
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
          input.slotLevel,
        );
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doBreakConcentration: () => {
        state = breakDragonsBreathConcentration(state);
      },
      step: () => {},
      getState: () => dragonsBreathInitialEffectProjection(state),
    };
  });
}

const dragonsBreathInitialEffectStateCheck = stateCheck(
  normalizeDragonsBreathQuintState,
  compareDragonsBreathStates,
);

describe("Dragon's Breath initial-effect MBT parity", () => {
  it("attaches the chosen breath state to a willing target", () => {
    const cast = castDragonsBreath(initialRuntimeState(), "fire", 3);

    expect(dragonsBreathInitialEffectProjection(cast)).toMatchObject({
      bonusActionAvailable: false,
      spellInvocationAvailable: false,
      targetEffectActive: true,
      effectDamageType: "fire",
      effectOriginalSlotLevel: 3,
      effectDurationTicks: DRAGONS_BREATH_DURATION_TICKS,
      casterConcentrating: true,
      grantedMagicActionAvailable: false,
      lastResult: "cast",
    });
  });

  it("grants the target a Magic action after the caster turn ends", () => {
    const cast = castDragonsBreath(initialRuntimeState(), "acid", 2);
    const targetTurn = endCasterTurn(cast);

    expect(dragonsBreathInitialEffectProjection(targetTurn)).toMatchObject({
      turnRole: "target",
      targetEffectActive: true,
      effectDamageType: "acid",
      effectOriginalSlotLevel: 2,
      casterConcentrating: true,
      grantedMagicActionAvailable: true,
      lastResult: "targetTurn",
    });
  });

  it("removes the target-attached grant when Concentration breaks", () => {
    const cast = castDragonsBreath(initialRuntimeState(), "poison", 2);
    const targetTurn = endCasterTurn(cast);
    const broken = breakDragonsBreathConcentration(targetTurn);

    expect(dragonsBreathInitialEffectProjection(broken)).toMatchObject({
      targetEffectActive: false,
      effectDamageType: "none",
      effectOriginalSlotLevel: 0,
      effectSpellSaveDc: 0,
      effectDurationTicks: 0,
      casterConcentrating: false,
      grantedMagicActionAvailable: false,
      lastResult: "concentrationBroken",
    });
  });

  it("projects spell availability from existing runtime resources", () => {
    const projection = dragonsBreathInitialEffectProjection(
      castDragonsBreath(initialRuntimeState(), "lightning", 2),
    );

    expect(Object.keys(projection).sort()).toEqual([
      "bonusActionAvailable",
      "casterConcentrating",
      "effectDamageType",
      "effectDurationTicks",
      "effectOriginalSlotLevel",
      "effectSpellSaveDc",
      "grantedMagicActionAvailable",
      "lastResult",
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
          "battle-runtime-dragons-breath-initial-effect.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDragonsBreathInitialEffectDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: dragonsBreathInitialEffectStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): DragonsBreathInitialRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [dragonsBreathSpell()],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    }),
    turnRole: "caster",
    lastResult: "init",
  };
}

function dragonsBreathSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(dragonsBreathInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}

function castDragonsBreath(
  state: DragonsBreathInitialRuntimeState,
  damageType: DamageType,
  slotLevel: number,
): DragonsBreathInitialRuntimeState {
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
    battle: result.state,
    turnRole: "caster",
    lastResult: "cast",
  };
}

function endCasterTurn(
  state: DragonsBreathInitialRuntimeState,
): DragonsBreathInitialRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Dragon's Breath caster End Turn to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "target",
    lastResult: "targetTurn",
  };
}

function breakDragonsBreathConcentration(
  state: DragonsBreathInitialRuntimeState,
): DragonsBreathInitialRuntimeState {
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    lastResult: "concentrationBroken",
  };
}

function dragonsBreathInitialEffectProjection(
  state: DragonsBreathInitialRuntimeState,
): DragonsBreathInitialEffectState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const effect = dragonsBreathTargetEffect(state.battle);
  const spellSaveDc = spellSaveDcForCaster(state.battle, spellCasterId);
  const targetEffectActive = effect !== undefined;
  const casterConcentrating =
    caster.concentration?.sourceSpellId === dragonsBreathUnitId &&
    caster.concentration.effectKind === "spellEffect";
  const projection = {
    turnRole: state.turnRole,
    bonusActionAvailable: canSpendBonusAction(
      state.battle.currentTurnResources,
    ),
    spellInvocationAvailable:
      maybeBonusSpellAct({
        state: state.battle,
        spellId: dragonsBreathUnitId,
      }) !== undefined,
    targetEffectActive,
    effectDamageType:
      effect === undefined
        ? "none"
        : dragonsBreathDamageType(effect.damageType),
    effectOriginalSlotLevel: effect?.originalSlotLevel ?? 0,
    effectSpellSaveDc: effect === undefined ? 0 : Number(effect.spellSaveDc),
    effectDurationTicks:
      effect?.expiresAt.kind === "concentration"
        ? Number(effect.expiresAt.durationTicks)
        : 0,
    casterConcentrating,
    grantedMagicActionAvailable: dragonsBreathExhaleActAvailable(state.battle),
    lastResult: state.lastResult,
  } satisfies DragonsBreathInitialEffectState;
  expect(projection.casterConcentrating).toBe(projection.targetEffectActive);
  if (effect !== undefined) {
    expect(projection.effectSpellSaveDc).toBe(Number(spellSaveDc));
    expect(effect.expiresAt).toEqual({
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(DRAGONS_BREATH_DURATION_TICKS),
    });
  }
  return projection;
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

function dragonsBreathExhaleActAvailable(state: BattleState): boolean {
  if (!canSpendAction(state.currentTurnResources, "magic")) return false;
  return discoverBattleActs(state).some(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "dragonsBreathExhale",
  );
}

function damageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  damageType: DamageType,
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return {
    kind: "damageTypeChoice",
    holeId: hole.holeId,
    value: damageType,
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
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
): DragonsBreathInitialEffectState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = dragonsBreathLastResult(state["qScenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: dragonsBreathInitialEffectUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Dragon's Breath initial-effect witness holes to be empty.",
    );
  }
  assertWitnessProtocolConsistentWithScenario({
    label: "Dragon's Breath initial effect",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    turnRole: dragonsBreathTurnRole(state["qTurnRole"]),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
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
    effectDurationTicks: numberFromQuintInt(
      state["qEffectDurationTicks"],
      "qEffectDurationTicks",
    ),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    grantedMagicActionAvailable: booleanField(
      state,
      "qGrantedMagicActionAvailable",
    ),
    lastResult: scenarioResult,
  };
}

function dragonsBreathInitialEffectUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Dragon's Breath initial-effect witness does not expect holes; received ${String(raw)}.`,
  );
}

function compareDragonsBreathStates(
  runtime: DragonsBreathInitialEffectState,
  quint: DragonsBreathInitialEffectState,
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

function dragonsBreathDamageType(raw: unknown): DragonsBreathLegalDamageType {
  switch (raw) {
    case "acid":
    case "cold":
    case "fire":
    case "lightning":
    case "poison":
      return raw;
  }
  throw new Error(`Unknown Dragon's Breath damage type: ${String(raw)}.`);
}

function dragonsBreathDamageTypeOrNone(raw: unknown): DragonsBreathDamageType {
  if (raw === "none") return raw;
  return dragonsBreathDamageType(raw);
}

function dragonsBreathLastResult(raw: unknown): DragonsBreathLastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value = DRAGONS_BREATH_INITIAL_EFFECT_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}
