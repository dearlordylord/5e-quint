// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-object-contact-damage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE
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
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  maybeBonusSpellAct,
  maybeSpellAct,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleObjectId,
  breakBattleConcentration,
  endTurn,
  resolveBattleSubject,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";
import type { SpellObjectContactDamageActiveEffect } from "./active-effect/types.ts";

const heatMetalObjectId = battleObjectId("focused-heat-metal-object");
const heatMetalCastDamage = 7;
const heatMetalRepeatDamage = 5;
const initialTargetHp = 40;

type HeatMetalTurnRole = "caster" | "target";
type HeatMetalLastResult =
  | "init"
  | "castNoContact"
  | "castContactDamage"
  | "repeatBlocked"
  | "endCasterTurn"
  | "endTargetTurn"
  | "repeatContactDamage"
  | "concentrationBroken";

type HeatMetalObjectContactState = {
  readonly currentTurnRole: HeatMetalTurnRole;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly repeatAvailable: boolean;
  readonly objectContactEffectActive: boolean;
  readonly casterConcentrating: boolean;
  readonly targetHp: number;
  readonly lastResult: HeatMetalLastResult;
};

type HeatMetalRuntimeState = {
  readonly battle: BattleState;
  readonly currentTurnRole: HeatMetalTurnRole;
  readonly lastResult: HeatMetalLastResult;
};

const driverSchema = {
  init: {},
  doCastNoContact: {},
  doCastContactDamage: {},
  doTrySameTurnRepeatBlocked: {},
  doEndCasterTurn: {},
  doEndTargetTurn: {},
  doRepeatContactDamage: {},
  doBreakConcentration: {},
  step: {},
} as const;

function createHeatMetalObjectContactDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastNoContact: () => {
        state = castHeatMetal(state, { contactTarget: false });
      },
      doCastContactDamage: () => {
        state = castHeatMetal(state, { contactTarget: true });
      },
      doTrySameTurnRepeatBlocked: () => {
        state = trySameTurnRepeat(state);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doEndTargetTurn: () => {
        state = endTargetTurn(state);
      },
      doRepeatContactDamage: () => {
        state = repeatHeatMetalDamage(state);
      },
      doBreakConcentration: () => {
        state = breakHeatMetalConcentration(state);
      },
      step: () => {},
      getState: () => heatMetalProjection(state),
    };
  });
}

const heatMetalStateCheck = stateCheck(
  normalizeHeatMetalQuintState,
  compareHeatMetalStates,
);

describe("Heat Metal object-contact MBT parity", () => {
  it("records an object-contact effect without damage when no creature is in contact", () => {
    const cast = castHeatMetal(initialRuntimeState(), { contactTarget: false });

    expect(heatMetalProjection(cast)).toMatchObject({
      objectContactEffectActive: true,
      casterConcentrating: true,
      targetHp: initialTargetHp,
      repeatAvailable: false,
    });
  });

  it("damages contact creatures and gates repeat damage to a later caster turn", () => {
    const cast = castHeatMetal(initialRuntimeState(), { contactTarget: true });
    const blocked = trySameTurnRepeat(cast);
    const targetTurn = endCasterTurn(blocked);
    const casterTurn = endTargetTurn(targetTurn);
    const repeated = repeatHeatMetalDamage(casterTurn);

    expect(heatMetalProjection(blocked)).toMatchObject({
      targetHp: initialTargetHp - heatMetalCastDamage,
      repeatAvailable: false,
      lastResult: "repeatBlocked",
    });
    expect(heatMetalProjection(casterTurn)).toMatchObject({
      repeatAvailable: true,
    });
    expect(heatMetalProjection(repeated)).toMatchObject({
      bonusActionAvailable: false,
      repeatAvailable: false,
      targetHp:
        initialTargetHp - heatMetalCastDamage - heatMetalRepeatDamage,
    });
  });

  it("cleans up the object-contact effect when Concentration breaks", () => {
    const cast = castHeatMetal(initialRuntimeState(), { contactTarget: false });
    const broken = breakHeatMetalConcentration(cast);

    expect(heatMetalProjection(broken)).toMatchObject({
      objectContactEffectActive: false,
      casterConcentrating: false,
      repeatAvailable: false,
      lastResult: "concentrationBroken",
    });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-heat-metal-object-contact.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHeatMetalObjectContactDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(6),
      stateCheck: heatMetalStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function initialRuntimeState(): HeatMetalRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: initialTargetHp,
      targetMaxHp: initialTargetHp,
    }),
    currentTurnRole: "caster",
    lastResult: "init",
  };
}

function castHeatMetal(
  state: HeatMetalRuntimeState,
  input: { readonly contactTarget: boolean },
): HeatMetalRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: heatMetalUnitId,
    slotLevel: 2,
  });
  const objectFill = spellManufacturedMetalObjectTargetFill({
    hole: requireHole(act.initialHoles, "objectTargetChoice"),
    objectId: heatMetalObjectId,
    spellId: heatMetalUnitId,
    casterId: spellCasterId,
  });
  const contactHole = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [objectFill],
    }),
    "objectContactTargets",
  );
  const contactFill = spellObjectContactTargetsFill({
    hole: contactHole,
    targetIds: input.contactTarget ? [spellTargetId] : [],
  });

  if (!input.contactTarget) {
    const result = requireResolved(
      resolveBattleSubject({
        state: state.battle,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "Expected no-contact Heat Metal cast to resolve.",
    );
    return {
      battle: result.state,
      currentTurnRole: "caster",
      lastResult: "castNoContact",
    };
  }

  const damageHole = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [objectFill, contactFill],
    }),
    "rolledDice",
  );
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[3, 4]]),
      ],
    }),
    "Expected contact Heat Metal cast to resolve.",
  );
  return {
    battle: result.state,
    currentTurnRole: "caster",
    lastResult: "castContactDamage",
  };
}

function trySameTurnRepeat(
  state: HeatMetalRuntimeState,
): HeatMetalRuntimeState {
  expect(
    maybeBonusSpellAct({ state: state.battle, spellId: heatMetalUnitId }),
  ).toBeUndefined();
  return { ...state, lastResult: "repeatBlocked" };
}

function endCasterTurn(state: HeatMetalRuntimeState): HeatMetalRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Heat Metal caster End Turn to resolve.",
  );
  return {
    battle: result.state,
    currentTurnRole: "target",
    lastResult: "endCasterTurn",
  };
}

function endTargetTurn(state: HeatMetalRuntimeState): HeatMetalRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellTargetId }),
    "Expected Heat Metal target End Turn to resolve.",
  );
  return {
    battle: result.state,
    currentTurnRole: "caster",
    lastResult: "endTargetTurn",
  };
}

function repeatHeatMetalDamage(
  state: HeatMetalRuntimeState,
): HeatMetalRuntimeState {
  const act = bonusSpellAct({
    state: state.battle,
    spellId: heatMetalUnitId,
  });
  const contactFill = spellObjectContactTargetsFill({
    hole: requireHole(act.initialHoles, "objectContactTargets"),
    targetIds: [spellTargetId],
  });
  const damageHole = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [contactFill],
    }),
    "rolledDice",
  );
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        contactFill,
        damageRollFillWithGroups(damageHole, [[2, 3]]),
      ],
    }),
    "Expected Heat Metal repeat damage to resolve.",
  );
  return {
    battle: result.state,
    currentTurnRole: "caster",
    lastResult: "repeatContactDamage",
  };
}

function breakHeatMetalConcentration(
  state: HeatMetalRuntimeState,
): HeatMetalRuntimeState {
  return {
    battle: breakBattleConcentration(state.battle, spellCasterId),
    currentTurnRole: state.currentTurnRole,
    lastResult: "concentrationBroken",
  };
}

function heatMetalProjection(
  state: HeatMetalRuntimeState,
): HeatMetalObjectContactState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const target = requireCombatant(state.battle, spellTargetId);
  const effect = caster.activeEffects.find(
    (candidate): candidate is SpellObjectContactDamageActiveEffect =>
      candidate.kind === "spellObjectContactDamage" &&
      candidate.sourceSpellId === heatMetalUnitId &&
      candidate.sourceCombatantId === spellCasterId &&
      candidate.objectId === heatMetalObjectId,
  );
  const projection = {
    currentTurnRole: state.currentTurnRole,
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    bonusActionAvailable:
      state.battle.currentTurnResources.currentHasBonusAction,
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: heatMetalUnitId,
        slotLevel: 2,
      }) !== undefined,
    repeatAvailable:
      maybeBonusSpellAct({
        state: state.battle,
        spellId: heatMetalUnitId,
      }) !== undefined,
    objectContactEffectActive: effect !== undefined,
    casterConcentrating:
      caster.concentration?.sourceSpellId === heatMetalUnitId &&
      caster.concentration.effectKind === "spellEffect",
    targetHp: Number(target.hp),
    lastResult: state.lastResult,
  };
  expect(projection.casterConcentrating).toBe(
    projection.objectContactEffectActive,
  );
  return projection;
}

function normalizeHeatMetalQuintState(
  raw: unknown,
): HeatMetalObjectContactState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: heatMetalUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error("Expected Heat Metal witness holes to be empty.");
  }
  const scenarioResult = heatMetalLastResult(state["qScenarioResult"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Heat Metal object-contact lifecycle",
    scenarioResult,
    protocol,
  });
  return {
    currentTurnRole: heatMetalTurnRole(state["qCurrentTurnRole"]),
    actionAvailable: booleanField(state, "qActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    repeatAvailable: booleanField(state, "qRepeatAvailable"),
    objectContactEffectActive: booleanField(
      state,
      "qObjectContactEffectActive",
    ),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    lastResult: scenarioResult,
  };
}

function heatMetalUnexpectedHole(raw: unknown): never {
  throw new Error(`Unexpected Heat Metal witness hole ${String(raw)}.`);
}

function compareHeatMetalStates(
  runtime: HeatMetalObjectContactState,
  quint: HeatMetalObjectContactState,
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

function heatMetalTurnRole(raw: unknown): HeatMetalTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown Heat Metal turn role: ${String(raw)}.`);
}

function heatMetalLastResult(raw: unknown): HeatMetalLastResult {
  if (
    raw === "init" ||
    raw === "castNoContact" ||
    raw === "castContactDamage" ||
    raw === "repeatBlocked" ||
    raw === "endCasterTurn" ||
    raw === "endTargetTurn" ||
    raw === "repeatContactDamage" ||
    raw === "concentrationBroken"
  ) {
    return raw;
  }
  throw new Error(`Unknown Heat Metal result: ${String(raw)}.`);
}
