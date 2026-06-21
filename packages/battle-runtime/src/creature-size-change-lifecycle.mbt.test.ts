// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-creature-size-change
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce:
//   Concentration up to 1 minute; unwilling creatures make a Constitution
//   Saving Throw; Enlarge and Reduce shift Size one category, affect
//   Strength checks and Strength Saving Throws, and adjust weapon or Unarmed
//   Strike hit damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Creature Size:
//   creature Size categories determine combat space.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
//   effects end when their creator loses Concentration.
// - UBIQUITOUS_LANGUAGE.md: Size, Advantage and Disadvantage, Spell
//   Invocation, Spell Effect, and Damage.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { Size } from "@dnd/surface/surface/types";
import { describe, expect, it } from "vitest";

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
import { combatantEffectiveSize } from "./battle-reducer/druid-wild-shape.ts";
import { INITIAL_TURN_RESOURCES } from "./battle-reducer/battle-runtime-protocol.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  enlargeReduceUnitId,
  spellCasterId,
  spellTargetId,
  type ActionSpellAct,
} from "./unit-profile-admission-catalog-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  type BattleHole,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";

const noDamageResolved = -1;

const SIZE_CHANGE_MODES = ["none", "increase", "decrease"] as const;
type SizeChangeMode = (typeof SIZE_CHANGE_MODES)[number];
const SIZE_CHANGE_MODE_SET: ReadonlySet<string> = new Set(SIZE_CHANGE_MODES);

const ROLL_MODES = ["normal", "advantage", "disadvantage"] as const;
type RollMode = (typeof ROLL_MODES)[number];
const ROLL_MODE_SET: ReadonlySet<string> = new Set(ROLL_MODES);

const LAST_RESULTS = [
  "init",
  "needsHoles",
  "unwillingSaveSucceeded",
  "unwillingSaveFailed",
  "willingEnlarge",
  "willingReduce",
  "attackDamageAdjusted",
  "concentrationBroken",
  "durationExpired",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const CREATURE_SIZE_CHANGE_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, LastResult>
> = {
  Init: "init",
  NeedsHoles: "needsHoles",
  UnwillingSaveSucceeded: "unwillingSaveSucceeded",
  UnwillingSaveFailed: "unwillingSaveFailed",
  WillingEnlarge: "willingEnlarge",
  WillingReduce: "willingReduce",
  AttackDamageAdjusted: "attackDamageAdjusted",
  ConcentrationBroken: "concentrationBroken",
  DurationExpired: "durationExpired",
} as const;


type CreatureSizeChangeHole = "SavingThrowOutcome";

type CreatureSizeChangeProjection = {
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly sizeEffectActive: boolean;
  readonly casterConcentrating: boolean;
  readonly sizeChangeMode: SizeChangeMode;
  readonly targetEffectiveSize: Size;
  readonly strengthAbilityCheckRollMode: RollMode;
  readonly strengthSavingThrowRollMode: RollMode;
  readonly holes: readonly CreatureSizeChangeHole[];
  readonly lastDamageApplied: number;
  readonly lastResult: LastResult;
};

type CreatureSizeChangeRuntimeState = {
  readonly battle: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastDamageApplied: number;
  readonly lastResult: LastResult;
};

const driverSchema = {
  init: {},
  doDiscoverUnwillingReduceSave: {},
  doCastUnwillingSaveSuccess: {},
  doCastUnwillingSaveFailure: {},
  doCastWillingEnlarge: {},
  doCastWillingReduce: {},
  doResolveEnlargedWeaponHitDamage: {},
  doResolveReducedWeaponHitDamage: {},
  doBreakConcentration: {},
  doExpireDuration: {},
  doStutter: {},
  step: {},
} as const;

function createCreatureSizeChangeLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doDiscoverUnwillingReduceSave: () => {
        state = discoverUnwillingReduceSave(state);
      },
      doCastUnwillingSaveSuccess: () => {
        state = castUnwillingReduce(state, true);
      },
      doCastUnwillingSaveFailure: () => {
        state = castUnwillingReduce(state, false);
      },
      doCastWillingEnlarge: () => {
        state = castWillingCreatureSizeChange(
          state,
          "creatureSizeIncrease",
          "willingEnlarge",
        );
      },
      doCastWillingReduce: () => {
        state = castWillingCreatureSizeChange(
          state,
          "creatureSizeDecrease",
          "willingReduce",
        );
      },
      doResolveEnlargedWeaponHitDamage: () => {
        state = resolveAffectedWeaponHitDamage(state, [[4], [3]]);
      },
      doResolveReducedWeaponHitDamage: () => {
        state = resolveAffectedWeaponHitDamage(state, [[1], [4]]);
      },
      doBreakConcentration: () => {
        state = breakSizeChangeConcentration(state);
      },
      doExpireDuration: () => {
        state = expireSizeChangeDuration(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => creatureSizeChangeProjection(state),
    };
  });
}

const creatureSizeChangeStateCheck = stateCheck(
  normalizeCreatureSizeChangeQuintState,
  compareCreatureSizeChangeStates,
);

describe("Enlarge/Reduce creature size-change lifecycle MBT parity", () => {
  it("projects successful and failed unwilling-target Constitution saves", () => {
    const saveHole = discoverUnwillingReduceSave(initialRuntimeState());
    const saved = castUnwillingReduce(saveHole, true);
    const failed = castUnwillingReduce(saveHole, false);

    expect(creatureSizeChangeProjection(saved)).toMatchObject({
      sizeEffectActive: false,
      casterConcentrating: false,
      targetEffectiveSize: "medium",
      strengthAbilityCheckRollMode: "normal",
      strengthSavingThrowRollMode: "normal",
      lastResult: "unwillingSaveSucceeded",
    });
    expect(creatureSizeChangeProjection(failed)).toMatchObject({
      sizeEffectActive: true,
      casterConcentrating: true,
      sizeChangeMode: "decrease",
      targetEffectiveSize: "small",
      strengthAbilityCheckRollMode: "disadvantage",
      strengthSavingThrowRollMode: "disadvantage",
      lastResult: "unwillingSaveFailed",
    });
  });

  it("projects Enlarge and Reduce Size, Strength roll modes, and hit damage", () => {
    const enlarged = castWillingCreatureSizeChange(
      initialRuntimeState(),
      "creatureSizeIncrease",
      "willingEnlarge",
    );
    const reduced = castWillingCreatureSizeChange(
      initialRuntimeState(),
      "creatureSizeDecrease",
      "willingReduce",
    );
    const enlargedHit = resolveAffectedWeaponHitDamage(enlarged, [[4], [3]]);
    const reducedHit = resolveAffectedWeaponHitDamage(reduced, [[1], [4]]);

    expect(creatureSizeChangeProjection(enlarged)).toMatchObject({
      sizeChangeMode: "increase",
      targetEffectiveSize: "large",
      strengthAbilityCheckRollMode: "advantage",
      strengthSavingThrowRollMode: "advantage",
    });
    expect(creatureSizeChangeProjection(reduced)).toMatchObject({
      sizeChangeMode: "decrease",
      targetEffectiveSize: "small",
      strengthAbilityCheckRollMode: "disadvantage",
      strengthSavingThrowRollMode: "disadvantage",
    });
    expect(creatureSizeChangeProjection(enlargedHit).lastDamageApplied).toBe(7);
    expect(creatureSizeChangeProjection(reducedHit).lastDamageApplied).toBe(1);
  });

  it("cleans up Size projection on Concentration break and duration expiry", () => {
    const enlarged = castWillingCreatureSizeChange(
      initialRuntimeState(),
      "creatureSizeIncrease",
      "willingEnlarge",
    );
    const broken = breakSizeChangeConcentration(enlarged);
    const expired = expireSizeChangeDuration(enlarged);

    expect(creatureSizeChangeProjection(broken)).toMatchObject({
      sizeEffectActive: false,
      casterConcentrating: false,
      targetEffectiveSize: "medium",
      lastResult: "concentrationBroken",
    });
    expect(creatureSizeChangeProjection(expired)).toMatchObject({
      actionAvailable: true,
      sizeEffectActive: false,
      casterConcentrating: false,
      targetEffectiveSize: "medium",
      lastResult: "durationExpired",
    });
  });

  it(
    "matches the TS reducer slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-creature-size-change-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createCreatureSizeChangeLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: creatureSizeChangeStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): CreatureSizeChangeRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(enlargeReduceUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
    }),
    holes: [],
    lastDamageApplied: noDamageResolved,
    lastResult: "init",
  };
}

function discoverUnwillingReduceSave(
  state: CreatureSizeChangeRuntimeState,
): CreatureSizeChangeRuntimeState {
  const act = creatureSizeActInState(state.battle, "creatureSizeDecrease");
  const target = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [
      spellTargetFill(
        target,
        enlargeReduceUnitId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Enlarge/Reduce Constitution Saving Throw hole.");
  }
  return {
    ...state,
    holes: result.holes,
    lastResult: "needsHoles",
  };
}

function castUnwillingReduce(
  state: CreatureSizeChangeRuntimeState,
  saveSucceeded: boolean,
): CreatureSizeChangeRuntimeState {
  const act = creatureSizeActInState(state.battle, "creatureSizeDecrease");
  const target = requireHole(act.initialHoles, "targetChoice");
  const save = requireHole(state.holes, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: saveSucceeded },
        ]),
      ],
    }),
    "Expected Enlarge/Reduce unwilling-target save to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastResult: saveSucceeded
      ? "unwillingSaveSucceeded"
      : "unwillingSaveFailed",
  };
}

function castWillingCreatureSizeChange(
  state: CreatureSizeChangeRuntimeState,
  procedure: "creatureSizeIncrease" | "creatureSizeDecrease",
  lastResult: Extract<LastResult, "willingEnlarge" | "willingReduce">,
): CreatureSizeChangeRuntimeState {
  const act = creatureSizeActInState(state.battle, procedure);
  const target = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    }),
    "Expected Enlarge/Reduce willing-target cast to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastResult,
  };
}

function resolveAffectedWeaponHitDamage(
  state: CreatureSizeChangeRuntimeState,
  damageRolls: readonly (readonly number[])[],
): CreatureSizeChangeRuntimeState {
  const targetTurnState = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected caster turn to end before affected target attack.",
  ).state;
  const readyState = {
    ...targetTurnState,
    currentTurnResources: INITIAL_TURN_RESOURCES,
  };
  const beforeHp = Number(requireCombatant(readyState, spellCasterId).hp);
  const subject = targetLongswordSubject(readyState);
  const target = requireResultHole(
    resolveBattleSubject({ state: readyState, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellTargetId,
    spellCasterId,
    "Longsword",
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state: readyState, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: readyState,
      subject,
      fills: [targetFill, rollFill],
    }),
    "rolledDice",
  );
  const fills = [
    targetFill,
    rollFill,
    damageRollFillWithGroups(damage, damageRolls),
  ] as const satisfies readonly BattleFill[];
  const damageResult = resolveBattleSubject({
    state: readyState,
    subject,
    fills,
  });
  const resolved =
    damageResult.tag === "needsHoles"
      ? resolveAfterConcentrationSave({
          state: damageResult.state,
          subject,
          holes: damageResult.holes,
          fills,
        })
      : requireResolved(
          damageResult,
          "Expected Enlarge/Reduce affected weapon hit to resolve.",
        );
  const afterHp = Number(requireCombatant(resolved.state, spellCasterId).hp);
  return {
    ...state,
    battle: resolved.state,
    holes: [],
    lastDamageApplied: beforeHp - afterHp,
    lastResult: "attackDamageAdjusted",
  };
}

function resolveAfterConcentrationSave(input: {
  readonly state: BattleState;
  readonly subject: ReturnType<typeof weaponAttackSubject>;
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
    "Expected affected weapon hit to resolve after Concentration save.",
  );
}

function targetLongswordSubject(
  state: BattleState,
): ReturnType<typeof weaponAttackSubject> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === spellTargetId &&
      candidate.subject.action === "attack" &&
      candidate.subject.attackName === "Longsword",
  );
  expect(act).toBeDefined();
  if (act === undefined || act.subject.tag !== "action") {
    throw new Error("Expected affected target Longsword attack act.");
  }
  return act.subject;
}

function breakSizeChangeConcentration(
  state: CreatureSizeChangeRuntimeState,
): CreatureSizeChangeRuntimeState {
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    holes: [],
    lastResult: "concentrationBroken",
  };
}

function expireSizeChangeDuration(
  state: CreatureSizeChangeRuntimeState,
): CreatureSizeChangeRuntimeState {
  const target = requireCombatant(state.battle, spellTargetId);
  const nearlyExpired: BattleState = {
    ...state.battle,
    combatants: new Map(state.battle.combatants).set(spellTargetId, {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "spellCreatureSizeChange"
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    }),
  };
  return {
    ...state,
    battle: advanceToNextCasterTurn(nearlyExpired),
    holes: [],
    lastResult: "durationExpired",
  };
}

function creatureSizeActInState(
  state: BattleState,
  procedure: "creatureSizeIncrease" | "creatureSizeDecrease",
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === enlargeReduceUnitId &&
      candidate.subject.invocation.procedure === procedure,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${procedure} spell act.`);
  }
  return act;
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const casterEnd = requireResolved(
    endTurn({ state, actorId: spellCasterId }),
    "Expected caster turn to end.",
  );
  return requireResolved(
    endTurn({ state: casterEnd.state, actorId: spellTargetId }),
    "Expected target turn to end.",
  ).state;
}

function creatureSizeChangeProjection(
  state: CreatureSizeChangeRuntimeState,
): CreatureSizeChangeProjection {
  const target = requireCombatant(state.battle, spellTargetId);
  const effect = target.activeEffects.find(
    (candidate) => candidate.kind === "spellCreatureSizeChange",
  );
  const strengthSavingThrowRollMode =
    savingThrowRollModeProjections(state.battle, "str").find(
      (projection) => projection.targetId === spellTargetId,
    )?.rollMode ?? "normal";
  return {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: enlargeReduceUnitId,
        slotLevel: 2,
      }) !== undefined,
    sizeEffectActive: effect !== undefined,
    casterConcentrating:
      requireCombatant(state.battle, spellCasterId).concentration !== null,
    sizeChangeMode: effect?.direction ?? "none",
    targetEffectiveSize: combatantEffectiveSize(target),
    strengthAbilityCheckRollMode:
      requiredAbilityCheckRollMode(state.battle, spellTargetId, "str") ??
      "normal",
    strengthSavingThrowRollMode,
    holes: battleHolesToCreatureSizeChangeHoles(state.holes),
    lastDamageApplied: state.lastDamageApplied,
    lastResult: state.lastResult,
  };
}

function battleHolesToCreatureSizeChangeHoles(
  holes: readonly BattleHole[],
): readonly CreatureSizeChangeHole[] {
  return holes.map((hole) => {
    if (hole.kind === "savingThrowOutcome") {
      return "SavingThrowOutcome";
    }
    throw new Error(`Unexpected Enlarge/Reduce hole ${hole.kind}.`);
  });
}

function normalizeCreatureSizeChangeQuintState(
  raw: unknown,
): CreatureSizeChangeProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["qScenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "none",
    decodeHole: creatureSizeChangeHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Enlarge/Reduce",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    sizeEffectActive: booleanField(state, "qSizeEffectActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    sizeChangeMode: sizeChangeMode(state["qSizeChangeMode"]),
    targetEffectiveSize: sizeField(state["qTargetEffectiveSize"]),
    strengthAbilityCheckRollMode: rollMode(
      state["qStrengthAbilityCheckRollMode"],
    ),
    strengthSavingThrowRollMode: rollMode(
      state["qStrengthSavingThrowRollMode"],
    ),
    holes: protocol.holes,
    lastDamageApplied: numberFromQuintInt(
      state["qLastDamageApplied"],
      "qLastDamageApplied",
    ),
    lastResult: scenarioResult,
  };
}

function compareCreatureSizeChangeStates(
  runtime: CreatureSizeChangeProjection,
  quint: CreatureSizeChangeProjection,
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

function sizeChangeMode(raw: unknown): SizeChangeMode {
  if (typeof raw === "string" && SIZE_CHANGE_MODE_SET.has(raw)) {
    return raw as SizeChangeMode;
  }
  throw new Error(`Unknown Enlarge/Reduce mode: ${String(raw)}.`);
}

function rollMode(raw: unknown): RollMode {
  if (typeof raw === "string" && ROLL_MODE_SET.has(raw)) {
    return raw as RollMode;
  }
  throw new Error(`Unknown Enlarge/Reduce roll mode: ${String(raw)}.`);
}

function lastResult(raw: unknown): LastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value = CREATURE_SIZE_CHANGE_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}

function creatureSizeChangeHole(raw: unknown): CreatureSizeChangeHole {
  const tag = quintVariantTag(raw, "protocol.holes");
  if (tag === "SavingThrowOutcome") {
    return tag;
  }
  throw new Error(`Unknown Enlarge/Reduce hole: ${String(raw)}.`);
}

function sizeField(raw: unknown): Size {
  if (
    raw === "tiny" ||
    raw === "small" ||
    raw === "medium" ||
    raw === "large" ||
    raw === "huge" ||
    raw === "gargantuan"
  ) {
    return raw;
  }
  throw new Error(`Unknown Size field: ${String(raw)}.`);
}
