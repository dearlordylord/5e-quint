// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { describe, expect, it } from "vitest";

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
  quintVariantMappedValue,
  quintVariantTag,
  run,
  stateCheck,
  stringLiteralField,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  maybeSpellAct,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  acidArrowUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  endTurn,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

type AcidArrowScenario =
  | "hit"
  | "hitComplete"
  | "miss"
  | "missComplete";
type AcidArrowTurnRole = "caster" | "target";
type AcidArrowHole =
  | "TargetChoice"
  | "AttackRoll"
  | "InitialDamageRoll"
  | "LaterDamageRoll";

type AcidArrowTimingState = {
  readonly scenario: AcidArrowScenario;
  readonly currentTurnRole: AcidArrowTurnRole;
  readonly targetHp: number;
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly delayedDamageActive: boolean;
  readonly holes: readonly AcidArrowHole[];
  readonly lastResult: "init" | "needsHoles" | "resolved" | "invalid";
};

type PendingInvocation =
  | { readonly tag: "none" }
  | {
      readonly tag: "targetChoice";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    }
  | {
      readonly tag: "attackRoll";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
      readonly targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
    }
  | {
      readonly tag: "initialDamage";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
      readonly targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly hit: boolean;
    }
  | { readonly tag: "laterDamage" };

type AcidArrowRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: AcidArrowScenario;
  readonly currentTurnRole: AcidArrowTurnRole;
  readonly holes: readonly BattleHole[];
  readonly pending: PendingInvocation;
  readonly lastResult: "init" | "needsHoles" | "resolved";
};

const ACID_ARROW_SCENARIO_BY_TAG = {
  HitScenario: "hit",
  HitComplete: "hitComplete",
  MissScenario: "miss",
  MissComplete: "missComplete",
} as const satisfies Readonly<Record<string, AcidArrowScenario>>;

const acidArrowDriverSchema = {
  init: {},
  doDiscoverAcidArrow: {},
  doFillTargetChoice: {},
  doFillHitAttackRoll: {},
  doFillMissAttackRoll: {},
  doFillHitInitialDamage: {
    initialDiePip: mbtPickSchemas.int,
  },
  doFillMissInitialDamage: {
    initialDiePip: mbtPickSchemas.int,
  },
  doEndCasterTurn: {},
  doDiscoverLaterDamage: {},
  doFillLaterDamage: {
    laterDiePip: mbtPickSchemas.int,
  },
  doStartMissScenario: {},
  doEndTargetTurnAfterMiss: {},
  step: {},
} as const;

function createAcidArrowTimingDriver() {
  return defineDriver(acidArrowDriverSchema, () => {
    let state = initialRuntimeState("hit");
    return {
      init: () => {
        state = initialRuntimeState("hit");
      },
      doDiscoverAcidArrow: () => {
        state = discoverAcidArrow(state);
      },
      doFillTargetChoice: () => {
        state = fillTargetChoice(state);
      },
      doFillHitAttackRoll: () => {
        state = fillAttackRoll(state, true);
      },
      doFillMissAttackRoll: () => {
        state = fillAttackRoll(state, false);
      },
      doFillHitInitialDamage: (input: { readonly initialDiePip: number }) => {
        state = fillInitialDamage(state, input.initialDiePip, true);
      },
      doFillMissInitialDamage: (input: { readonly initialDiePip: number }) => {
        state = fillInitialDamage(state, input.initialDiePip, false);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doDiscoverLaterDamage: () => {
        state = discoverLaterDamage(state);
      },
      doFillLaterDamage: (input: { readonly laterDiePip: number }) => {
        state = fillLaterDamage(state, input.laterDiePip);
      },
      doStartMissScenario: () => {
        state = initialRuntimeState("miss");
      },
      doEndTargetTurnAfterMiss: () => {
        state = endTargetTurnAfterMiss(state);
      },
      step: () => {},
      getState: () => acidArrowProjection(state),
    };
  });
}

const acidArrowTimingStateCheck = stateCheck(
  normalizeAcidArrowQuintState,
  compareAcidArrowStates,
);

describe("Acid Arrow timing MBT parity", () => {
  it("matches hit delayed damage and miss half-initial timing", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-acid-arrow-timing.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAcidArrowTimingDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(14),
      stateCheck: acidArrowTimingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function initialRuntimeState(
  scenario: Extract<AcidArrowScenario, "hit" | "miss">,
): AcidArrowRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(acidArrowUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    }),
    scenario,
    currentTurnRole: "caster",
    holes: [],
    pending: { tag: "none" },
    lastResult: scenario === "hit" ? "init" : "resolved",
  };
}

function discoverAcidArrow(
  state: AcidArrowRuntimeState,
): AcidArrowRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: acidArrowUnitId,
    slotLevel: 2,
  });
  return {
    ...state,
    holes: act.initialHoles,
    pending: { tag: "targetChoice", subject: act.subject },
    lastResult: "needsHoles",
  };
}

function fillTargetChoice(
  state: AcidArrowRuntimeState,
): AcidArrowRuntimeState {
  if (state.pending.tag !== "targetChoice") {
    throw new Error("Expected pending Acid Arrow target choice.");
  }
  const targetFill = spellTargetFill(
    requireHole(state.holes, "targetChoice"),
    acidArrowUnitId,
    spellCasterId,
    spellTargetId,
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  return {
    ...state,
    holes: [attackRoll],
    pending: {
      tag: "attackRoll",
      subject: state.pending.subject,
      targetFill,
    },
    lastResult: "needsHoles",
  };
}

function fillAttackRoll(
  state: AcidArrowRuntimeState,
  hit: boolean,
): AcidArrowRuntimeState {
  if (state.pending.tag !== "attackRoll") {
    throw new Error("Expected pending Acid Arrow attack roll.");
  }
  const attackFill = attackRollFill(requireHole(state.holes, "attackRoll"), {
    total: hit ? 18 : 1,
    naturalD20: hit ? 12 : 1,
  });
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [state.pending.targetFill, attackFill],
    }),
    "rolledDice",
  );
  return {
    ...state,
    holes: [damageRoll],
    pending: {
      tag: "initialDamage",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill,
      hit,
    },
    lastResult: "needsHoles",
  };
}

function fillInitialDamage(
  state: AcidArrowRuntimeState,
  initialDiePip: number,
  hit: boolean,
): AcidArrowRuntimeState {
  if (state.pending.tag !== "initialDamage" || state.pending.hit !== hit) {
    throw new Error("Expected pending Acid Arrow initial damage.");
  }
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [
        state.pending.targetFill,
        state.pending.attackFill,
        damageRollFillWithGroups(requireHole(state.holes, "rolledDice"), [
          [initialDiePip, initialDiePip, initialDiePip, initialDiePip],
        ]),
      ],
    }),
    "Expected Acid Arrow initial damage to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function endCasterTurn(state: AcidArrowRuntimeState): AcidArrowRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Acid Arrow caster turn to end.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "target",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function discoverLaterDamage(
  state: AcidArrowRuntimeState,
): AcidArrowRuntimeState {
  const result = endTurn({ state: state.battle, actorId: spellTargetId });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Acid Arrow later damage hole.");
  }
  return {
    ...state,
    holes: result.holes,
    pending: { tag: "laterDamage" },
    lastResult: "needsHoles",
  };
}

function fillLaterDamage(
  state: AcidArrowRuntimeState,
  laterDiePip: number,
): AcidArrowRuntimeState {
  if (state.pending.tag !== "laterDamage") {
    throw new Error("Expected pending Acid Arrow later damage.");
  }
  const result = requireResolved(
    endTurn({
      state: state.battle,
      actorId: spellTargetId,
      fills: [
        damageRollFillWithGroups(requireHole(state.holes, "rolledDice"), [
          [laterDiePip, laterDiePip],
        ]),
      ],
    }),
    "Expected Acid Arrow later damage to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    scenario: "hitComplete",
    currentTurnRole: "caster",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function endTargetTurnAfterMiss(
  state: AcidArrowRuntimeState,
): AcidArrowRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellTargetId }),
    "Expected Acid Arrow miss target turn to end without later damage.",
  );
  return {
    ...state,
    battle: result.state,
    scenario: "missComplete",
    currentTurnRole: "caster",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function acidArrowProjection(
  state: AcidArrowRuntimeState,
): AcidArrowTimingState {
  const target = requireCombatant(state.battle, spellTargetId);
  return {
    scenario: state.scenario,
    currentTurnRole: state.currentTurnRole,
    targetHp: Number(target.hp),
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      state.currentTurnRole === "caster" &&
      spellActAvailable(state.battle),
    delayedDamageActive: target.activeEffects.some(
      (effect) =>
        effect.kind === "spellTurnEndDamage" &&
        effect.sourceSpellId === acidArrowUnitId,
    ),
    holes: battleHolesToAcidHoles(state.holes, state.pending),
    lastResult: state.lastResult,
  };
}

function spellActAvailable(state: BattleState): boolean {
  return (
    maybeSpellAct({ state, spellId: acidArrowUnitId, slotLevel: 2 }) !==
    undefined
  );
}

function battleHolesToAcidHoles(
  holes: readonly BattleHole[],
  pending: PendingInvocation,
): readonly AcidArrowHole[] {
  return holes.map((hole) => {
    if (hole.kind === "targetChoice") return "TargetChoice";
    if (hole.kind === "attackRoll") return "AttackRoll";
    if (hole.kind === "rolledDice" && pending.tag === "initialDamage") {
      return "InitialDamageRoll";
    }
    if (hole.kind === "rolledDice" && pending.tag === "laterDamage") {
      return "LaterDamageRoll";
    }
    throw new Error(`Unexpected Acid Arrow hole ${hole.kind}.`);
  });
}

function normalizeAcidArrowQuintState(raw: unknown): AcidArrowTimingState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: acidArrowHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Acid Arrow timing",
    scenarioResult: protocol.lastResult,
    protocol,
    initScenarioResult: "init",
  });
  return {
    scenario: acidArrowScenario(state["qScenario"]),
    currentTurnRole: stringLiteralField(state, "qCurrentTurnRole", [
      "caster",
      "target",
    ]),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    delayedDamageActive: booleanField(state, "qDelayedDamageActive"),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
  };
}

function compareAcidArrowStates(
  runtime: AcidArrowTimingState,
  quint: AcidArrowTimingState,
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

function acidArrowScenario(raw: unknown): AcidArrowScenario {
  return quintVariantMappedValue(
    raw,
    "qScenario",
    ACID_ARROW_SCENARIO_BY_TAG,
    "Acid Arrow scenario",
  );
}

function acidArrowHole(raw: unknown): AcidArrowHole {
  const tag = quintVariantTag(raw, "AcidArrowHole");
  if (
    tag === "TargetChoice" ||
    tag === "AttackRoll" ||
    tag === "InitialDamageRoll" ||
    tag === "LaterDamageRoll"
  ) {
    return tag;
  }
  throw new Error(`Unknown Acid Arrow hole: ${String(raw)}.`);
}
