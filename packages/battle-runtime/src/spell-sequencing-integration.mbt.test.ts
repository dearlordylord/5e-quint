// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dragon's Breath:
//   Bonus Action, Concentration, willing target, target-granted Magic Action,
//   Dexterity Saving Throw, and chosen damage type.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Heat Metal:
//   Action, Concentration, manufactured metal object contact damage, and repeat
//   damage as a Bonus Action on later turns.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration: starting another
//   Concentration effect ends the previous one.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration, Spell
//   Effect, Saving Throw, Damage Roll, and Boundary Crossing.
//
// Scope: this is a bounded fixture-world integration MBT for sequencing already
// promoted spell procedures. It intentionally does not add new generated
// coverage markers, catalog rows, geometry, or new spell semantics.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Hp, type DamageType } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
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
import { describe, expect, it } from "vitest";
import dragonsBreathInput from "../../surface/content/dragons_breath.json";

import type { BattleActiveEffect } from "./active-effect/types.ts";
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
  knownWillingSpellTargetListFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  dragonsBreathUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleObjectId,
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

type SpellSequencingTurnRole = "caster" | "target";
type SpellSequencingConcentrationSpell = "none" | "dragonsBreath" | "heatMetal";
type SpellSequencingLastResult =
  | "init"
  | "castDragonsBreath"
  | "targetTurnWithBreath"
  | "exhaledBreath"
  | "casterTurnAfterBreath"
  | "castHeatMetal"
  | "targetTurnWithHeatMetal"
  | "casterTurnWithHeatMetalRepeat"
  | "repeatHeatMetal";

type SpellSequencingProjection = {
  readonly turnRole: SpellSequencingTurnRole;
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly dragonsBreathActive: boolean;
  readonly heatMetalActive: boolean;
  readonly concentrationSpell: SpellSequencingConcentrationSpell;
  readonly heatMetalRepeatAvailable: boolean;
  readonly casterHp: number;
  readonly targetHp: number;
  readonly lastResult: SpellSequencingLastResult;
};

type SpellSequencingRuntimeState = {
  readonly battle: BattleState;
  readonly turnRole: SpellSequencingTurnRole;
  readonly lastResult: SpellSequencingLastResult;
};

type DragonsBreathEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "dragonsBreath" }
>;

type HeatMetalEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" }
>;

const spellSequencingObjectId = battleObjectId(
  "spell-sequencing-heat-metal-object",
);
const initialCasterHp = 12;
const initialTargetHp = 40;
const dragonsBreathDamageRoll = [[2, 2, 2]] as const;
const heatMetalCastDamageRoll = [[3, 4]] as const;
const heatMetalRepeatDamageRoll = [[2, 3]] as const;

const driverSchema = {
  init: {},
  doCastDragonsBreath: {},
  doEndCasterTurnForDragonsBreath: {},
  doExhaleAndMaintainConcentration: {},
  doEndTargetTurnAfterBreath: {},
  doCastHeatMetalContact: {},
  doEndCasterTurnForHeatMetal: {},
  doEndTargetTurnForHeatMetal: {},
  doRepeatHeatMetalContactDamage: {},
  step: {},
} as const;

function createSpellSequencingIntegrationDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastDragonsBreath: () => {
        state = castDragonsBreath(state);
      },
      doEndCasterTurnForDragonsBreath: () => {
        state = endCasterTurnForDragonsBreath(state);
      },
      doExhaleAndMaintainConcentration: () => {
        state = exhaleDragonsBreathAndMaintainConcentration(state);
      },
      doEndTargetTurnAfterBreath: () => {
        state = endTargetTurnAfterBreath(state);
      },
      doCastHeatMetalContact: () => {
        state = castHeatMetalContact(state);
      },
      doEndCasterTurnForHeatMetal: () => {
        state = endCasterTurnForHeatMetal(state);
      },
      doEndTargetTurnForHeatMetal: () => {
        state = endTargetTurnForHeatMetalRepeat(state);
      },
      doRepeatHeatMetalContactDamage: () => {
        state = repeatHeatMetalContactDamage(state);
      },
      step: () => {},
      getState: () => spellSequencingProjection(state),
    };
  });
}

const spellSequencingStateCheck = stateCheck(
  normalizeSpellSequencingQuintState,
  compareSpellSequencingStates,
);

describe("Spell sequencing integration MBT", () => {
  it("sequences Dragon's Breath into Heat Metal without retaining duplicate Concentration state", () => {
    const breathed = exhaleDragonsBreathAndMaintainConcentration(
      endCasterTurnForDragonsBreath(castDragonsBreath(initialRuntimeState())),
    );
    const heatMetal = castHeatMetalContact(endTargetTurnAfterBreath(breathed));

    expect(spellSequencingProjection(breathed)).toMatchObject({
      dragonsBreathActive: true,
      heatMetalActive: false,
      concentrationSpell: "dragonsBreath",
      casterHp: initialCasterHp - damageRollTotal(dragonsBreathDamageRoll),
      lastResult: "exhaledBreath",
    });
    expect(spellSequencingProjection(heatMetal)).toMatchObject({
      dragonsBreathActive: false,
      heatMetalActive: true,
      concentrationSpell: "heatMetal",
      targetHp: initialTargetHp - damageRollTotal(heatMetalCastDamageRoll),
      lastResult: "castHeatMetal",
    });
  });

  it("opens Heat Metal repeat damage only on the later caster turn", () => {
    const heatMetal = castHeatMetalContact(
      endTargetTurnAfterBreath(
        exhaleDragonsBreathAndMaintainConcentration(
          endCasterTurnForDragonsBreath(
            castDragonsBreath(initialRuntimeState()),
          ),
        ),
      ),
    );
    const targetTurn = endCasterTurnForHeatMetal(heatMetal);
    const casterTurn = endTargetTurnForHeatMetalRepeat(targetTurn);
    const repeated = repeatHeatMetalContactDamage(casterTurn);

    expect(spellSequencingProjection(heatMetal)).toMatchObject({
      heatMetalRepeatAvailable: false,
    });
    expect(spellSequencingProjection(casterTurn)).toMatchObject({
      heatMetalRepeatAvailable: true,
    });
    expect(spellSequencingProjection(repeated)).toMatchObject({
      bonusActionAvailable: false,
      heatMetalRepeatAvailable: false,
      targetHp:
        initialTargetHp -
        damageRollTotal(heatMetalCastDamageRoll) -
        damageRollTotal(heatMetalRepeatDamageRoll),
      lastResult: "repeatHeatMetal",
    });
  });

  it("matches the bounded fixture sequence against Quint-owned traces", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-spell-sequencing-integration.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpellSequencingIntegrationDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(8),
      stateCheck: spellSequencingStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): SpellSequencingRuntimeState {
  const battle = spellBattle({
    preparedSpells: [dragonsBreathSpell(), spellRecord(heatMetalUnitId)],
    spellSlots: [{ spellLevel: 2, count: 2 }],
    targetHp: initialTargetHp,
    targetMaxHp: initialTargetHp,
  });
  const caster = requireCombatant(battle, spellCasterId);
  return {
    battle: {
      ...battle,
      combatants: new Map(battle.combatants).set(spellCasterId, {
        ...caster,
        hp: Hp(initialCasterHp),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    },
    turnRole: "caster",
    lastResult: "init",
  };
}

function castDragonsBreath(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
  const act = bonusSpellAct({
    state: state.battle,
    spellId: dragonsBreathUnitId,
    slotLevel: 2,
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
        damageTypeChoiceFill(damageTypeHole, "fire"),
      ],
    }),
    "Expected Dragon's Breath cast to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "caster",
    lastResult: "castDragonsBreath",
  };
}

function endCasterTurnForDragonsBreath(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Dragon's Breath caster End Turn to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "target",
    lastResult: "targetTurnWithBreath",
  };
}

function exhaleDragonsBreathAndMaintainConcentration(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
  const exhaleAct = dragonsBreathExhaleAct(state.battle);
  const needsSave = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle,
      subject: exhaleAct.subject,
      fills: [],
    }),
    "Expected Dragon's Breath exhale Saving Throw hole.",
  );
  const saveHole = requireResultHole(needsSave, "savingThrowOutcome");
  const saveFill = dragonsBreathSavingThrowOutcomeFill(saveHole, false);
  const needsDamage = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle,
      subject: exhaleAct.subject,
      fills: [saveFill],
    }),
    "Expected Dragon's Breath damage roll hole.",
  );
  const damageHole = requireResultHole(needsDamage, "rolledDice");
  const damageFill = damageRollFillWithGroups(
    damageHole,
    dragonsBreathDamageRoll,
  );
  const needsConcentration = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle,
      subject: exhaleAct.subject,
      fills: [saveFill, damageFill],
    }),
    "Expected Dragon's Breath concentration Saving Throw hole.",
  );
  const concentrationHole = requireHole(
    needsConcentration.holes,
    "concentrationSavingThrow",
  );
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: exhaleAct.subject,
      fills: [
        saveFill,
        damageFill,
        {
          kind: "concentrationSavingThrow",
          holeId: concentrationHole.holeId,
          value: { succeeded: true },
        },
      ],
    }),
    "Expected Dragon's Breath exhale to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "target",
    lastResult: "exhaledBreath",
  };
}

function endTargetTurnAfterBreath(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellTargetId }),
    "Expected target End Turn before Heat Metal to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "caster",
    lastResult: "casterTurnAfterBreath",
  };
}

function castHeatMetalContact(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: heatMetalUnitId,
    slotLevel: 2,
  });
  const objectFill = spellManufacturedMetalObjectTargetFill({
    hole: requireHole(act.initialHoles, "objectTargetChoice"),
    objectId: spellSequencingObjectId,
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
    targetIds: [spellTargetId],
  });
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
        damageRollFillWithGroups(damageHole, heatMetalCastDamageRoll),
      ],
    }),
    "Expected Heat Metal cast to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "caster",
    lastResult: "castHeatMetal",
  };
}

function endCasterTurnForHeatMetal(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Heat Metal caster End Turn to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "target",
    lastResult: "targetTurnWithHeatMetal",
  };
}

function endTargetTurnForHeatMetalRepeat(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellTargetId }),
    "Expected Heat Metal target End Turn to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "caster",
    lastResult: "casterTurnWithHeatMetalRepeat",
  };
}

function repeatHeatMetalContactDamage(
  state: SpellSequencingRuntimeState,
): SpellSequencingRuntimeState {
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
        damageRollFillWithGroups(damageHole, heatMetalRepeatDamageRoll),
      ],
    }),
    "Expected Heat Metal repeat damage to resolve.",
  );
  return {
    battle: result.state,
    turnRole: "caster",
    lastResult: "repeatHeatMetal",
  };
}

function spellSequencingProjection(
  state: SpellSequencingRuntimeState,
): SpellSequencingProjection {
  const caster = requireCombatant(state.battle, spellCasterId);
  const target = requireCombatant(state.battle, spellTargetId);
  const dragonsBreathActive =
    dragonsBreathTargetEffect(state.battle) !== undefined;
  const heatMetalActive = heatMetalEffect(state.battle) !== undefined;
  const projection = {
    turnRole: state.turnRole,
    magicActionAvailable: canSpendAction(
      state.battle.currentTurnResources,
      "magic",
    ),
    bonusActionAvailable:
      state.battle.currentTurnResources.currentHasBonusAction,
    dragonsBreathActive,
    heatMetalActive,
    concentrationSpell: concentrationSpell(state.battle),
    heatMetalRepeatAvailable:
      maybeBonusSpellAct({
        state: state.battle,
        spellId: heatMetalUnitId,
      }) !== undefined,
    casterHp: Number(caster.hp),
    targetHp: Number(target.hp),
    lastResult: state.lastResult,
  } satisfies SpellSequencingProjection;
  expect(projection.dragonsBreathActive && projection.heatMetalActive).toBe(
    false,
  );
  return projection;
}

function concentrationSpell(
  state: BattleState,
): SpellSequencingConcentrationSpell {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.concentration?.sourceSpellId === dragonsBreathUnitId) {
    return "dragonsBreath";
  }
  if (caster.concentration?.sourceSpellId === heatMetalUnitId) {
    return "heatMetal";
  }
  return "none";
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

function heatMetalEffect(state: BattleState): HeatMetalEffect | undefined {
  return requireCombatant(state, spellCasterId).activeEffects.find(
    (effect): effect is HeatMetalEffect =>
      effect.kind === "spellObjectContactDamage" &&
      effect.sourceSpellId === heatMetalUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.objectId === spellSequencingObjectId,
  );
}

function dragonsBreathExhaleAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "dragonsBreathExhale" }
  >;
} {
  const exhaleAct = discoverBattleActs(state).find(
    (act): act is ReturnType<typeof dragonsBreathExhaleAct> =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "dragonsBreathExhale",
  );
  if (exhaleAct === undefined) {
    throw new Error("Expected Dragon's Breath exhale action.");
  }
  return exhaleAct;
}

function dragonsBreathSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(dragonsBreathInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
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

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error(message);
  }
  return result;
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

function damageRollTotal(rollGroups: readonly (readonly number[])[]): number {
  return rollGroups.flat().reduce((sum, roll) => sum + roll, 0);
}

function normalizeSpellSequencingQuintState(
  raw: unknown,
): SpellSequencingProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["scenarioResult"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: spellSequencingUnexpectedHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "spell sequencing",
    scenarioResult,
    protocol,
  });
  return {
    turnRole: turnRole(state["turnRole"]),
    magicActionAvailable: booleanField(state, "magicActionAvailable"),
    bonusActionAvailable: booleanField(state, "bonusActionAvailable"),
    dragonsBreathActive: booleanField(state, "dragonsBreathActive"),
    heatMetalActive: booleanField(state, "heatMetalActive"),
    concentrationSpell: concentrationSpellName(state["concentrationSpell"]),
    heatMetalRepeatAvailable: booleanField(state, "heatMetalRepeatAvailable"),
    casterHp: numberFromQuintInt(state["casterHp"], "qState.casterHp"),
    targetHp: numberFromQuintInt(state["targetHp"], "qState.targetHp"),
    lastResult: scenarioResult,
  };
}

function compareSpellSequencingStates(
  runtime: SpellSequencingProjection,
  quint: SpellSequencingProjection,
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

function turnRole(raw: unknown): SpellSequencingTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown spell sequencing turn role: ${String(raw)}.`);
}

function concentrationSpellName(
  raw: unknown,
): SpellSequencingConcentrationSpell {
  if (raw === "none" || raw === "dragonsBreath" || raw === "heatMetal") {
    return raw;
  }
  throw new Error(
    `Unknown spell sequencing Concentration spell: ${String(raw)}.`,
  );
}

function lastResult(raw: unknown): SpellSequencingLastResult {
  if (
    raw === "init" ||
    raw === "castDragonsBreath" ||
    raw === "targetTurnWithBreath" ||
    raw === "exhaledBreath" ||
    raw === "casterTurnAfterBreath" ||
    raw === "castHeatMetal" ||
    raw === "targetTurnWithHeatMetal" ||
    raw === "casterTurnWithHeatMetalRepeat" ||
    raw === "repeatHeatMetal"
  ) {
    return raw;
  }
  throw new Error(`Unknown spell sequencing result: ${String(raw)}.`);
}

function spellSequencingUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Spell sequencing witness does not expect holes; received ${String(raw)}.`,
  );
}
