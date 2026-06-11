// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-blur-attack-roll-defense
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Blur:
//   Blur is a level 2 Action spell with range Self and Concentration up to
//   1 minute. For the duration, creatures have Disadvantage on attack rolls
//   against the caster unless the attacker perceives the caster with
//   Blindsight or Truesight.
// - .references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage:
//   Advantage and Disadvantage cancel to a normal d20 roll.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Advantage and Disadvantage,
//   Concentration, Blindsight, and Truesight.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
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
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import type {
  BattleFill,
  BattleHole,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
  CombatantId,
} from "./index.ts";
import { resolveBattleSubject } from "./index.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  combatantId,
  endTurn,
} from "./unit-profile-admission-test-support.ts";
import {
  blurUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";

const ATTACK_ROLL_MODES = ["normal", "advantage", "disadvantage"] as const;
type AttackRollMode = (typeof ATTACK_ROLL_MODES)[number];
const ATTACK_ROLL_MODE_SET: ReadonlySet<string> = new Set(ATTACK_ROLL_MODES);

const LAST_RESULTS = [
  "init",
  "blurCast",
  "blindsightBypass",
  "truesightBypass",
  "noBypass",
  "otherAdvantage",
  "noOtherAdvantage",
  "concentrationBroken",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

type BlurBypassSense = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "attackAttackerPerceivesBlurredTargetWithSense" }
>["sense"];

type BlurAttackRollDefenseProjection = {
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly spellSlotExpended: number;
  readonly slotSpellCastThisTurn: boolean;
  readonly blurredEffectActive: boolean;
  readonly casterConcentrating: boolean;
  readonly attackerPerceivesWithBlindsight: boolean;
  readonly attackerPerceivesWithTruesight: boolean;
  readonly otherAttackAdvantage: boolean;
  readonly attackRollMode: AttackRollMode;
  readonly lastResult: LastResult;
};

type BlurAttackRollDefenseRuntimeState = {
  readonly battle: BattleState;
  readonly attackerId: CombatantId;
  readonly bypassSense: BlurBypassSense | undefined;
  readonly otherAttackAdvantage: boolean;
  readonly lastResult: LastResult;
};

const BLUR_ATTACKER_ID = combatantId("focused-blur-attacker");

const driverSchema = {
  init: {},
  doCastBlur: {},
  doSetBlindsightBypass: {},
  doSetTruesightBypass: {},
  doClearBypass: {},
  doSetOtherAttackAdvantage: {},
  doClearOtherAttackAdvantage: {},
  doBreakConcentration: {},
  doStutter: {},
  step: {},
} as const;

function createBlurAttackRollDefenseLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastBlur: () => {
        state = castBlur(state);
      },
      doSetBlindsightBypass: () => {
        state = {
          ...state,
          bypassSense: "blindsight",
          lastResult: "blindsightBypass",
        };
      },
      doSetTruesightBypass: () => {
        state = {
          ...state,
          bypassSense: "truesight",
          lastResult: "truesightBypass",
        };
      },
      doClearBypass: () => {
        state = { ...state, bypassSense: undefined, lastResult: "noBypass" };
      },
      doSetOtherAttackAdvantage: () => {
        state = {
          ...state,
          otherAttackAdvantage: true,
          lastResult: "otherAdvantage",
        };
      },
      doClearOtherAttackAdvantage: () => {
        state = {
          ...state,
          otherAttackAdvantage: false,
          lastResult: "noOtherAdvantage",
        };
      },
      doBreakConcentration: () => {
        state = breakBlurConcentration(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => blurAttackRollDefenseProjection(state),
    };
  });
}

const blurAttackRollDefenseStateCheck = stateCheck(
  normalizeBlurAttackRollDefenseQuintState,
  compareBlurAttackRollDefenseStates,
);

describe("Blur attack-roll defense lifecycle MBT parity", () => {
  it("creates a self Spell Effect with Concentration and Attack Roll Disadvantage", () => {
    const cast = castBlur(initialRuntimeState());

    expect(requireCombatant(cast.battle, spellCasterId)).toMatchObject({
      concentration: {
        sourceSpellId: blurUnitId,
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "blurred",
          sourceSpellId: blurUnitId,
          sourceCombatantId: spellCasterId,
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
          },
        }),
      ],
    });
    expect(blurAttackRollDefenseProjection(cast)).toMatchObject({
      actionAvailable: false,
      spellAvailable: false,
      spellSlotExpended: 1,
      slotSpellCastThisTurn: true,
      blurredEffectActive: true,
      casterConcentrating: true,
      attackRollMode: "disadvantage",
      lastResult: "blurCast",
    });
  });

  it.each(["blindsight", "truesight"] as const)(
    "bypasses Blur Disadvantage when the attacker perceives the caster with %s",
    (sense) => {
      const cast = castBlur(initialRuntimeState());
      const bypassed = { ...cast, bypassSense: sense };

      expect(blurAttackRollDefenseProjection(bypassed)).toMatchObject({
        blurredEffectActive: true,
        casterConcentrating: true,
        attackerPerceivesWithBlindsight: sense === "blindsight",
        attackerPerceivesWithTruesight: sense === "truesight",
        attackRollMode: "normal",
      });
    },
  );

  it("cancels Blur Disadvantage with another Attack Roll Advantage source", () => {
    const cast = castBlur(initialRuntimeState());
    const cancellation = { ...cast, otherAttackAdvantage: true };

    expect(blurAttackRollDefenseProjection(cancellation)).toMatchObject({
      blurredEffectActive: true,
      otherAttackAdvantage: true,
      attackRollMode: "normal",
    });
  });

  it("removes the blurred effect and roll penalty when Concentration is broken", () => {
    const cast = castBlur(initialRuntimeState());
    const concentrationBroken = breakBlurConcentration(cast);

    expect(
      requireCombatant(concentrationBroken.battle, spellCasterId).activeEffects,
    ).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ kind: "blurred" }),
      ]),
    );
    expect(blurAttackRollDefenseProjection(concentrationBroken)).toMatchObject({
      blurredEffectActive: false,
      casterConcentrating: false,
      attackRollMode: "normal",
      lastResult: "concentrationBroken",
    });
  });

  it(
    "matches the TS reducer slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-blur-attack-roll-defense-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createBlurAttackRollDefenseLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: blurAttackRollDefenseStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): BlurAttackRollDefenseRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(blurUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: BLUR_ATTACKER_ID,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 19,
        },
      ],
    }),
    attackerId: BLUR_ATTACKER_ID,
    bypassSense: undefined,
    otherAttackAdvantage: false,
    lastResult: "init",
  };
}

function castBlur(
  state: BlurAttackRollDefenseRuntimeState,
): BlurAttackRollDefenseRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: blurUnitId,
    slotLevel: 2,
  });
  expect(act.initialHoles).toEqual([]);
  expect(act.subject.invocation).toMatchObject({
    tag: "spellSlot",
    spellId: blurUnitId,
    slotLevel: 2,
    procedure: "blurAttackRollDefense",
  });
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
    "Expected Blur to resolve.",
  );
  return { ...state, battle: result.state, lastResult: "blurCast" };
}

function breakBlurConcentration(
  state: BlurAttackRollDefenseRuntimeState,
): BlurAttackRollDefenseRuntimeState {
  if (!blurAttackRollDefenseProjection(state).casterConcentrating) {
    return state;
  }
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    lastResult: "concentrationBroken",
  };
}

function blurAttackRollDefenseProjection(
  state: BlurAttackRollDefenseRuntimeState,
): BlurAttackRollDefenseProjection {
  const caster = requireCombatant(state.battle, spellCasterId);
  const spellSlotExpended = casterSpellSlotExpended(state.battle);
  const blurredEffectActive = caster.activeEffects.some(
    (effect) => effect.kind === "blurred",
  );
  const attackRollMode = attackerAttackRollMode(state);
  return {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: blurUnitId,
        slotLevel: 2,
      }) !== undefined,
    spellSlotExpended,
    slotSpellCastThisTurn:
      state.battle.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    blurredEffectActive,
    casterConcentrating:
      caster.concentration?.sourceSpellId === blurUnitId &&
      caster.concentration.effectKind === "spellEffect",
    attackerPerceivesWithBlindsight: state.bypassSense === "blindsight",
    attackerPerceivesWithTruesight: state.bypassSense === "truesight",
    otherAttackAdvantage: state.otherAttackAdvantage,
    attackRollMode,
    lastResult: state.lastResult,
  };
}

function attackerAttackRollMode(
  state: BlurAttackRollDefenseRuntimeState,
): AttackRollMode {
  const attackerTurn = endTurn({
    state: state.battle,
    actorId: spellCasterId,
  });
  expect(attackerTurn).toMatchObject({ tag: "resolved" });
  if (attackerTurn.tag !== "resolved") {
    throw new Error("Expected to advance to Blur attacker turn.");
  }

  const attack = statBlockAttackAct(
    attackerTurn.state,
    state.attackerId,
    "Scimitar",
  );
  const target = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [
        attackTargetFillWithFacts({
          hole: target,
          attackerId: state.attackerId,
          targetId: spellCasterId,
          extraFacts: attackTargetFacts(state),
        }),
      ],
    }),
    "attackRoll",
  );
  return attackRoll.rollMode ?? "normal";
}

function attackTargetFacts(
  state: BlurAttackRollDefenseRuntimeState,
): readonly BattleTargetSpatialFact[] {
  const facts: BattleTargetSpatialFact[] = [];
  if (state.bypassSense !== undefined) {
    facts.push({
      kind: "attackAttackerPerceivesBlurredTargetWithSense",
      attackerId: state.attackerId,
      targetId: spellCasterId,
      sense: state.bypassSense,
    });
  }
  if (state.otherAttackAdvantage) {
    facts.push({
      kind: "attackTargetCannotSeeAttacker",
      attackerId: state.attackerId,
      targetId: spellCasterId,
    });
  }
  return facts;
}

function attackTargetFillWithFacts(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "targetChoice" }>;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly extraFacts: readonly BattleTargetSpatialFact[];
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = attackTargetFill(
    input.hole,
    input.attackerId,
    input.targetId,
    "Scimitar",
  );
  return {
    ...base,
    spatialFacts: [...(base.spatialFacts ?? []), ...input.extraFacts],
  };
}

function casterSpellSlotExpended(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    return 0;
  }
  const blurSlot = caster.origin.spellcasting?.spellSlots.find(
    (slot) => Number(slot.spellLevel) === 2,
  );
  return Number(blurSlot?.expended ?? 0);
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

function normalizeBlurAttackRollDefenseQuintState(
  raw: unknown,
): BlurAttackRollDefenseProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["qScenarioResult"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: blurAttackRollDefenseUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Blur attack-roll defense witness holes to be empty.",
    );
  }
  assertWitnessProtocolConsistentWithScenario({
    label: "Blur attack-roll defense",
    scenarioResult,
    protocol,
  });
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    spellSlotExpended: numberFromQuintInt(
      state["qSpellSlotExpended"],
      "qSpellSlotExpended",
    ),
    slotSpellCastThisTurn: booleanField(state, "qSlotSpellCastThisTurn"),
    blurredEffectActive: booleanField(state, "qBlurredEffectActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    attackerPerceivesWithBlindsight: booleanField(
      state,
      "qAttackerPerceivesWithBlindsight",
    ),
    attackerPerceivesWithTruesight: booleanField(
      state,
      "qAttackerPerceivesWithTruesight",
    ),
    otherAttackAdvantage: booleanField(state, "qOtherAttackAdvantage"),
    attackRollMode: attackRollMode(state["qAttackRollMode"]),
    lastResult: scenarioResult,
  };
}

function blurAttackRollDefenseUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Blur attack-roll defense witness does not expect holes; received ${String(raw)}.`,
  );
}

function compareBlurAttackRollDefenseStates(
  runtime: BlurAttackRollDefenseProjection,
  quint: BlurAttackRollDefenseProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function attackRollMode(raw: unknown): AttackRollMode {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isAttackRollMode(raw)) {
    throw new Error(`Unexpected Blur Attack Roll mode ${String(raw)}.`);
  }
  return raw;
}

function lastResult(raw: unknown): LastResult {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isLastResult(raw)) {
    throw new Error(`Unexpected Blur result ${String(raw)}.`);
  }
  return raw;
}

function isAttackRollMode(value: string): value is AttackRollMode {
  return ATTACK_ROLL_MODE_SET.has(value);
}

function isLastResult(value: string): value is LastResult {
  return LAST_RESULT_SET.has(value);
}
