// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-ray-of-enfeeblement-damage-penalty
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
import * as path from "node:path";

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import rayOfEnfeeblementInput from "../../surface/content/ray_of_enfeeblement.json";

import { requiredAttackRollMode } from "./battle-reducer/attack-roll.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";

const rayOfEnfeeblementUnitId = "ray_of_enfeeblement";
const noDamageResolved = -1;

type RayTurnRole = "caster" | "target";
type RayLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "maintained"
  | "ended";
type RayHole = "SavingThrowOutcome";

type RayOfEnfeeblementLifecycleState = {
  readonly currentTurnRole: RayTurnRole;
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly d20EffectActive: boolean;
  readonly damagePenaltyActive: boolean;
  readonly casterConcentrating: boolean;
  readonly strAttackRollDisadvantage: boolean;
  readonly strAbilityCheckDisadvantage: boolean;
  readonly strSavingThrowDisadvantage: boolean;
  readonly holes: readonly RayHole[];
  readonly lastDamageAfterPenalty: number;
  readonly lastResult: RayLastResult;
};

type RayOfEnfeeblementRuntimeState = {
  readonly battle: BattleState;
  readonly currentTurnRole: RayTurnRole;
  readonly holes: readonly BattleHole[];
  readonly lastDamageAfterPenalty: number;
  readonly lastResult: RayLastResult;
};

const QuintIntAsNumber = Schema.transform(
  Schema.BigIntFromSelf,
  Schema.Number,
  { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
);

const intSchema = Schema.standardSchemaV1(QuintIntAsNumber);

const driverSchema = {
  init: {},
  doCastFailedSave: {},
  doEndCasterTurn: {},
  doResolveTargetDamage: {
    penaltyRoll: intSchema,
  },
  doDiscoverRepeatSave: {},
  doFillRepeatSaveFailure: {},
  doFillRepeatSaveSuccess: {},
  step: {},
} as const;

function createRayOfEnfeeblementLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastFailedSave: () => {
        state = castRayOfEnfeeblementFailedSave(state);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doResolveTargetDamage: (input: { readonly penaltyRoll: number }) => {
        state = resolveTargetDamage(state, input.penaltyRoll);
      },
      doDiscoverRepeatSave: () => {
        state = discoverRepeatSave(state);
      },
      doFillRepeatSaveFailure: () => {
        state = fillRepeatSave(state, false);
      },
      doFillRepeatSaveSuccess: () => {
        state = fillRepeatSave(state, true);
      },
      step: () => {},
      getState: () => rayOfEnfeeblementProjection(state),
    };
  });
}

const rayOfEnfeeblementStateCheck = stateCheck(
  normalizeRayOfEnfeeblementQuintState,
  compareRayOfEnfeeblementStates,
);

describe("Ray of Enfeeblement lifecycle MBT parity", () => {
  it("maintains failed-save effects after a failed repeat save", () => {
    const cast = castRayOfEnfeeblementFailedSave(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const discovered = discoverRepeatSave(targetTurn);
    const maintained = fillRepeatSave(discovered, false);

    expect(rayOfEnfeeblementProjection(maintained)).toMatchObject({
      currentTurnRole: "caster",
      d20EffectActive: true,
      damagePenaltyActive: true,
      casterConcentrating: true,
      strAttackRollDisadvantage: true,
      strAbilityCheckDisadvantage: true,
      strSavingThrowDisadvantage: true,
      lastResult: "maintained",
    });
  });

  it("ends failed-save effects and Concentration after a successful repeat save", () => {
    const cast = castRayOfEnfeeblementFailedSave(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const damaged = resolveTargetDamage(targetTurn, 4);
    const discovered = discoverRepeatSave(damaged);
    const ended = fillRepeatSave(discovered, true);

    expect(rayOfEnfeeblementProjection(damaged)).toMatchObject({
      currentTurnRole: "target",
      d20EffectActive: true,
      damagePenaltyActive: true,
      lastDamageAfterPenalty: 2,
    });
    expect(rayOfEnfeeblementProjection(ended)).toMatchObject({
      currentTurnRole: "caster",
      d20EffectActive: false,
      damagePenaltyActive: false,
      casterConcentrating: false,
      strAttackRollDisadvantage: false,
      strAbilityCheckDisadvantage: false,
      strSavingThrowDisadvantage: false,
      lastResult: "ended",
    });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-ray-of-enfeeblement-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createRayOfEnfeeblementLifecycleDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: rayOfEnfeeblementStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): RayOfEnfeeblementRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [rayOfEnfeeblementSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
    }),
    currentTurnRole: "caster",
    holes: [],
    lastDamageAfterPenalty: noDamageResolved,
    lastResult: "init",
  };
}

function rayOfEnfeeblementSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(rayOfEnfeeblementInput);
  if (unit.kind !== "spell") {
    throw new Error(
      "Expected Ray of Enfeeblement content to decode as a spell Unit.",
    );
  }
  return unit;
}

function castRayOfEnfeeblementFailedSave(
  state: RayOfEnfeeblementRuntimeState,
): RayOfEnfeeblementRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: rayOfEnfeeblementUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(
    targetHole,
    spellCasterId,
    rayOfEnfeeblementUnitId,
    [spellTargetId],
  );
  const saveHole = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    }),
    "Expected Ray of Enfeeblement failed save to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: "resolved",
  };
}

function endCasterTurn(
  state: RayOfEnfeeblementRuntimeState,
): RayOfEnfeeblementRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected caster turn to end.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "target",
    holes: [],
    lastResult: "resolved",
  };
}

function discoverRepeatSave(
  state: RayOfEnfeeblementRuntimeState,
): RayOfEnfeeblementRuntimeState {
  const result = endTurn({ state: state.battle, actorId: spellTargetId });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Ray of Enfeeblement repeat save hole.");
  }
  return {
    ...state,
    holes: result.holes,
    lastResult: "needsHoles",
  };
}

function fillRepeatSave(
  state: RayOfEnfeeblementRuntimeState,
  succeeded: boolean,
): RayOfEnfeeblementRuntimeState {
  const repeatSave = requireHole(state.holes, "savingThrowOutcome");
  const result = requireResolved(
    endTurn({
      state: state.battle,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded },
        ]),
      ],
    }),
    "Expected Ray of Enfeeblement repeat save to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: succeeded ? "ended" : "maintained",
  };
}

function resolveTargetDamage(
  state: RayOfEnfeeblementRuntimeState,
  penaltyRoll: number,
): RayOfEnfeeblementRuntimeState {
  const beforeHp = Number(requireCombatant(state.battle, spellCasterId).hp);
  const attack = targetLongswordAct(state.battle);
  const targetHole = requireHole(attack.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(
    targetHole,
    spellTargetId,
    spellCasterId,
    "Longsword",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 18,
    naturalD20: 12,
    rollMode: "disadvantage",
  });
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: attack.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damageRoll, [[6]]);
  const penaltyRequest = resolveBattleSubject({
    state: state.battle,
    subject: attack.subject,
    fills: [targetFill, attackFill, damageFill],
  });
  const penaltyHole = requireResultHole(penaltyRequest, "rolledDice");
  expect(penaltyHole).toHaveProperty("sourceDamageRollPenalty");
  const penaltyFill = damageRollFillWithGroups(penaltyHole, [[penaltyRoll]]);
  const damageResult = resolveBattleSubject({
    state: state.battle,
    subject: attack.subject,
    fills: [targetFill, attackFill, damageFill, penaltyFill],
  });
  const resolved =
    damageResult.tag === "needsHoles"
      ? resolveAfterConcentrationSave({
          state: damageResult.state,
          subject: attack.subject,
          holes: damageResult.holes,
          fills: [targetFill, attackFill, damageFill, penaltyFill],
        })
      : requireResolved(
          damageResult,
          "Expected Ray of Enfeeblement damage to resolve.",
        );
  const afterHp = Number(requireCombatant(resolved.state, spellCasterId).hp);
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastDamageAfterPenalty: beforeHp - afterHp,
    lastResult: "resolved",
  };
}

function resolveAfterConcentrationSave(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly holes: readonly BattleHole[];
  readonly fills: readonly BattleFill[];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const concentration = requireHole(input.holes, "concentrationSavingThrow");
  return requireResolved(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: [
        ...input.fills,
        {
          kind: "concentrationSavingThrow",
          holeId: concentration.holeId,
          value: { succeeded: true },
        },
      ],
    }),
    "Expected Ray of Enfeeblement damage after Concentration save to resolve.",
  );
}

function targetLongswordAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === spellTargetId &&
      candidate.subject.action === "attack" &&
      candidate.subject.attackName === "Longsword",
  );
  if (act === undefined) {
    throw new Error("Expected target Longsword attack act.");
  }
  return act;
}

function rayOfEnfeeblementProjection(
  state: RayOfEnfeeblementRuntimeState,
): RayOfEnfeeblementLifecycleState {
  const target = requireCombatant(state.battle, spellTargetId);
  const d20EffectActive = target.activeEffects.some(
    (effect) => effect.kind === "abilityD20TestRollModeEndTurnSave",
  );
  const damagePenaltyActive = target.activeEffects.some(
    (effect) => effect.kind === "sourceDamageRollPenalty",
  );
  const strSavingThrowDisadvantage = savingThrowRollModeProjections(
    state.battle,
    "str",
  ).some(
    (projection) =>
      projection.targetId === spellTargetId &&
      projection.rollMode === "disadvantage",
  );
  const projection = {
    currentTurnRole: state.currentTurnRole,
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: rayOfEnfeeblementUnitId,
        slotLevel: 2,
      }) !== undefined,
    d20EffectActive,
    damagePenaltyActive,
    casterConcentrating:
      requireCombatant(state.battle, spellCasterId).concentration !== null,
    strAttackRollDisadvantage:
      requiredAttackRollMode(
        state.battle,
        spellTargetId,
        spellCasterId,
        zeroAbilityWeaponAttack("weapon_longsword"),
      ) === "disadvantage",
    strAbilityCheckDisadvantage:
      requiredAbilityCheckRollMode(state.battle, spellTargetId, "str") ===
      "disadvantage",
    strSavingThrowDisadvantage,
    holes: battleHolesToRayHoles(state.holes),
    lastDamageAfterPenalty: state.lastDamageAfterPenalty,
    lastResult: state.lastResult,
  };
  expect(projection.damagePenaltyActive).toBe(projection.d20EffectActive);
  return projection;
}

function battleHolesToRayHoles(
  holes: readonly BattleHole[],
): readonly RayHole[] {
  return holes.map((hole) => {
    if (hole.kind === "savingThrowOutcome") {
      return "SavingThrowOutcome";
    }
    throw new Error(`Unexpected Ray of Enfeeblement hole ${hole.kind}.`);
  });
}

function normalizeRayOfEnfeeblementQuintState(
  raw: unknown,
): RayOfEnfeeblementLifecycleState {
  const state = quintStateRecord(raw);
  return {
    currentTurnRole: rayTurnRole(state["qCurrentTurnRole"]),
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    d20EffectActive: booleanField(state, "qD20EffectActive"),
    damagePenaltyActive: booleanField(state, "qDamagePenaltyActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    strAttackRollDisadvantage: booleanField(
      state,
      "qStrAttackRollDisadvantage",
    ),
    strAbilityCheckDisadvantage: booleanField(
      state,
      "qStrAbilityCheckDisadvantage",
    ),
    strSavingThrowDisadvantage: booleanField(
      state,
      "qStrSavingThrowDisadvantage",
    ),
    holes: quintSet(state["qHoles"], "qHoles").map(rayHole).sort(),
    lastDamageAfterPenalty: numberFromQuintInt(
      state["qLastDamageAfterPenalty"],
      "qLastDamageAfterPenalty",
    ),
    lastResult: rayLastResult(state["qLastResult"]),
  };
}

function compareRayOfEnfeeblementStates(
  runtime: RayOfEnfeeblementLifecycleState,
  quint: RayOfEnfeeblementLifecycleState,
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

function rayTurnRole(raw: unknown): RayTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown Ray of Enfeeblement turn role: ${String(raw)}.`);
}

function rayHole(raw: unknown): RayHole {
  if (raw === "SavingThrowOutcome") return raw;
  throw new Error(`Unknown Ray of Enfeeblement hole: ${String(raw)}.`);
}

function rayLastResult(raw: unknown): RayLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "maintained" ||
    raw === "ended"
  ) {
    return raw;
  }
  throw new Error(`Unknown Ray of Enfeeblement result: ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint Ray of Enfeeblement state.");
  }
  return raw;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  if (typeof state[field] === "boolean") {
    return state[field];
  }
  throw new Error(`Expected Quint Boolean field ${field}.`);
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }
  throw new Error(`Expected Quint Set field ${field}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
