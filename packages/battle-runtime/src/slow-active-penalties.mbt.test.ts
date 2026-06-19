// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Slow:
//   failed Wisdom Saving Throws halve Speed, apply -2 AC and -2 Dexterity
//   Saving Throw penalties, prevent Reactions, and allow an end-of-target-turn
//   repeat save ending the spell on that target on success.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Saving
//   Throw, Speed, Armor Class, Reaction, Area of Effect/Cube, and Spell Effect.
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
import {
  endTurn,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  slowUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const LAST_RESULTS = [
  "init",
  "failedSave",
  "targetTurn",
  "needsSave",
  "saved",
  "failedAgain",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

const SLOW_HOLES = ["EndTurnSave"] as const;
type SlowHole = (typeof SLOW_HOLES)[number];

type SlowActivePenaltiesProjection = {
  readonly currentTurnRole: "caster" | "target";
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
  readonly currentTurnRole: "caster" | "target";
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

function slowActivePenaltiesProjection(
  state: SlowActivePenaltiesRuntimeState,
): SlowActivePenaltiesProjection {
  const target = requireCombatant(state.battle, spellTargetId);
  const caster = requireCombatant(state.battle, spellCasterId);
  const dexteritySavingThrowDelta =
    savingThrowFlatBonusProjections(state.battle, "dex").find(
      (projection) => projection.targetId === spellTargetId,
    )?.bonus ?? 0;
  return {
    currentTurnRole: state.currentTurnRole,
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

function slowHole(hole: BattleHole): SlowHole {
  if (
    hole.kind === "savingThrowOutcome" &&
    "slowActivePenaltiesEndTurnSave" in hole
  ) {
    return "EndTurnSave";
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
  throw new Error(`Unexpected Slow witness hole ${tag}.`);
}

function currentTurnRole(raw: unknown): "caster" | "target" {
  expect(raw).toBeTypeOf("string");
  if (raw === "caster" || raw === "target") {
    return raw;
  }
  throw new Error(`Unexpected Slow current turn role ${String(raw)}.`);
}

function lastResult(raw: unknown): LastResult {
  expect(raw).toBeTypeOf("string");
  if (typeof raw === "string" && LAST_RESULT_SET.has(raw)) {
    return raw as LastResult;
  }
  throw new Error(`Unexpected Slow result ${String(raw)}.`);
}
