// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-insect-plague-area-hazard
//
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Insect-Plague
// - .references/srd-5.2.1/Rules-Glossary.md#Area-of-Effect
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration
// - .references/srd-5.2.1/Rules-Glossary.md#Difficult-Terrain
// - .references/srd-5.2.1/Rules-Glossary.md#Lightly-Obscured
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import { battleObscurementZones } from "./battle-reducer/spells-active-effects.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import type {
  BattleActiveEffect,
  BattleRuntimeSession,
  BattleState,
} from "./index.ts";
import { endTurn, snapshotBattle } from "./index.ts";
import type { BattleStationaryPersistentAreaSaveDamageTrigger } from "./battle-state-execution.ts";
import type { BattleEffectExecutionRef } from "./identity.ts";
import {
  damageRollFillWithGroups,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  insectPlagueAreaFill,
  insectPlagueAreaHazardSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  insectPlagueAreaId,
  insectPlagueUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";

type InsectPlagueEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "persistentAreaSaveDamage" }
>;

type InsectPlagueMbtProjection = {
  readonly actionAvailable: boolean;
  readonly targetTurn: boolean;
  readonly areaActive: boolean;
  readonly areaOccurrenceOrdinal: number;
  readonly areaDamageDice: number;
  readonly areaDurationTicks: number;
  readonly areaRadiusFeet: number;
  readonly appearanceOccurrenceOpen: boolean;
  readonly savedThisTurn: boolean;
  readonly nextOccurrenceOrdinal: number;
  readonly slotLevel: number;
  readonly slotsRemaining: number;
  readonly slotSpellCastThisTurn: boolean;
  readonly targetHitPoints: number;
  readonly targetDead: boolean;
  readonly targetUnconscious: boolean;
  readonly concentrationActive: boolean;
  readonly lightlyObscured: boolean;
  readonly difficultTerrain: boolean;
};

type InsectPlagueRuntimeState = {
  readonly session: BattleRuntimeSession;
  readonly slotLevel: 5 | 6 | 7;
  readonly occurrenceOrdinal: number;
  readonly exactEffectRef: BattleEffectExecutionRef | null;
};

const driverSchema = {
  init: { slotLevel: mbtPickSchemas.int },
  doCastInsectPlague: {},
  doResolveInsectPlagueSave: {
    savingThrowSucceeded: mbtPickSchemas.bool,
    rolledDamage: mbtPickSchemas.int,
    trigger: mbtPickSchemas.unknown,
  },
  doBeginInsectPlagueLaterTurn: {},
  doEndInsectPlagueConcentration: {},
  step: {},
} as const;

function createInsectPlagueAreaHazardDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState(5);
    return {
      init: ({ slotLevel }) => {
        state = initialRuntimeState(
          persistentAreaSaveDamageSlotLevel(slotLevel),
        );
      },
      doCastInsectPlague: () => {
        state = castInsectPlague(state);
      },
      doResolveInsectPlagueSave: ({
        savingThrowSucceeded,
        rolledDamage,
        trigger,
      }) => {
        state = resolveInsectPlagueSave(state, {
          savingThrowSucceeded,
          rolledDamage,
          trigger: persistentAreaSaveDamageTriggerFromQuint(trigger),
        });
      },
      doBeginInsectPlagueLaterTurn: () => {
        state = beginLaterTurn(state);
      },
      doEndInsectPlagueConcentration: () => {
        state = endInsectPlagueConcentration(state);
      },
      step: () => {},
      getState: () => persistentAreaSaveDamageRuntimeProjection(state),
    };
  });
}

const persistentAreaSaveDamageStateCheck = stateCheck(
  normalizeInsectPlagueQuintState,
  compareInsectPlagueStates,
);

describe("Insect Plague area-hazard MBT parity", () => {
  it("uses the exact cast occurrence across save holes and concentration cleanup", () => {
    const cast = castInsectPlague(initialRuntimeState(6));
    const effect = requireInsectPlagueEffect(cast.session.state);
    const saveAct = insectPlagueAreaHazardSaveAct(
      cast.session,
      spellTargetId,
      "appearsInArea",
    );
    const saveHole = requireHole(saveAct.initialHoles, "savingThrowOutcome");

    expect(cast.exactEffectRef).toBe(effect.effectRef);
    expect(saveAct.subject.areaMembershipTrigger.effectRef).toBe(
      effect.effectRef,
    );
    if (!("persistentAreaSaveDamage" in saveHole)) {
      throw new Error("Expected an Insect Plague save hole.");
    }
    expect(saveHole.persistentAreaSaveDamage.effectRef).toBe(effect.effectRef);

    const cleaned = endInsectPlagueConcentration(cast);
    expect(persistentAreaSaveDamageRuntimeProjection(cleaned)).toMatchObject({
      areaActive: false,
      concentrationActive: false,
      lightlyObscured: false,
      difficultTerrain: false,
      nextOccurrenceOrdinal: cast.occurrenceOrdinal + 1,
    });
  });

  it("resolves off-turn entry and shares the production trigger ledger", () => {
    const cast = castInsectPlague(initialRuntimeState(5));
    const enteredOffTurn = resolveInsectPlagueSave(cast, {
      savingThrowSucceeded: false,
      rolledDamage: 20,
      trigger: "entersArea",
    });
    const duplicateAppearance = resolveInsectPlagueSave(enteredOffTurn, {
      savingThrowSucceeded: false,
      rolledDamage: 20,
      trigger: "appearsInArea",
    });
    const targetTurn = beginLaterTurn(enteredOffTurn);
    const endedTargetTurn = resolveInsectPlagueSave(targetTurn, {
      savingThrowSucceeded: true,
      rolledDamage: 20,
      trigger: "endsTurnInArea",
    });

    expect(
      persistentAreaSaveDamageRuntimeProjection(enteredOffTurn),
    ).toMatchObject({
      areaActive: true,
      targetTurn: false,
      savedThisTurn: true,
      targetHitPoints: 480,
    });
    expect(
      persistentAreaSaveDamageRuntimeProjection(duplicateAppearance),
    ).toEqual(persistentAreaSaveDamageRuntimeProjection(enteredOffTurn));
    expect(
      persistentAreaSaveDamageRuntimeProjection(endedTargetTurn),
    ).toMatchObject({
      targetTurn: true,
      savedThisTurn: true,
      targetHitPoints: 470,
    });
  });

  it("projects Lightly Obscured and Difficult Terrain from the active Sphere", () => {
    const cast = castInsectPlague(initialRuntimeState(5));
    const targetTurn = beginLaterTurn(cast);
    const effect = requireInsectPlagueEffect(targetTurn.session.state);
    const moveSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "move" as const,
    };
    const moveRequest = resolveBattleSubject({
      state: targetTurn.session.state,
      subject: moveSubject,
      fills: [],
    });
    const moveHole = requireResultHole(moveRequest, "movement");
    const moved = resolveBattleSubject({
      state: targetTurn.session.state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "persistentAreaSaveDamage",
                effectRef: effect.effectRef,
                sourceCombatantId: spellCasterId,
                sourceProcedureRef: effect.sourceProcedureRef,
                areaId: insectPlagueAreaId,
              },
            ],
            totalDistanceFeet: movementFeet(10),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });

    expect(persistentAreaSaveDamageRuntimeProjection(targetTurn)).toMatchObject(
      {
        areaActive: true,
        areaRadiusFeet: 20,
        lightlyObscured: true,
        difficultTerrain: true,
      },
    );
    expect(moved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ spentFeet: movementFeet(15) }),
          }),
        ]),
      },
    });
  });

  it(
    "matches production runtime against bounded semantic traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-insect-plague-area-hazard.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createInsectPlagueAreaHazardDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: persistentAreaSaveDamageStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(
  slotLevel: InsectPlagueRuntimeState["slotLevel"],
): InsectPlagueRuntimeState {
  const session = spellBattle({
    preparedSpells: [spellRecord(insectPlagueUnitId)],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
    targetHp: 500,
    targetMaxHp: 500,
  });
  const caster = requireCombatant(session.state, spellCasterId);
  return {
    session,
    slotLevel,
    occurrenceOrdinal: Number(caster.nextEffectOrdinal),
    exactEffectRef: null,
  };
}

function castInsectPlague(
  state: InsectPlagueRuntimeState,
): InsectPlagueRuntimeState {
  const act = spellAct({
    session: state.session,
    spellId: insectPlagueUnitId,
    slotLevel: state.slotLevel,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const resolved = resolveBattleSubject({
    state: state.session.state,
    subject: act.subject,
    fills: [insectPlagueAreaFill(areaHole)],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected production Insect Plague cast to resolve: ${JSON.stringify(resolved)}`,
    );
  }
  const effect = requireInsectPlagueEffect(resolved.state);
  return {
    ...state,
    session: battleRuntimeSessionForTest({
      ...state.session,
      state: resolved.state,
    }),
    exactEffectRef: effect.effectRef,
  };
}

function resolveInsectPlagueSave(
  state: InsectPlagueRuntimeState,
  input: {
    readonly savingThrowSucceeded: boolean;
    readonly rolledDamage: number;
    readonly trigger: BattleStationaryPersistentAreaSaveDamageTrigger;
  },
): InsectPlagueRuntimeState {
  const effect = requireInsectPlagueEffect(state.session.state);
  assertExactEffectRef(state, effect);
  const saveAct = insectPlagueAreaHazardSaveAct(
    state.session,
    spellTargetId,
    input.trigger,
  );
  if (saveAct.subject.areaMembershipTrigger.effectRef !== effect.effectRef) {
    throw new Error(
      "Insect Plague save subject lost its exact effect occurrence.",
    );
  }
  const saveHole = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  if (
    !("persistentAreaSaveDamage" in saveHole) ||
    saveHole.persistentAreaSaveDamage.effectRef !== effect.effectRef
  ) {
    throw new Error(
      "Insect Plague save hole lost its exact effect occurrence.",
    );
  }
  const saveFill = singleTargetSavingThrowOutcomeFill(
    saveHole,
    spellTargetId,
    input.savingThrowSucceeded,
  );
  const pendingDamage = resolveBattleSubject({
    state: state.session.state,
    subject: saveAct.subject,
    fills: [saveFill],
  });
  if (pendingDamage.tag === "invalid") {
    return state;
  }
  const damageHole = requireResultHole(pendingDamage, "rolledDice");
  if (
    !("persistentAreaSaveDamage" in damageHole) ||
    damageHole.persistentAreaSaveDamage.effectRef !== effect.effectRef
  ) {
    throw new Error(
      "Insect Plague damage hole lost its exact effect occurrence.",
    );
  }
  const damageFill = damageRollFillWithGroups(damageHole, [
    diceResults(effect.damage.expr.dice, input.rolledDamage),
  ]);
  const resolved = resolveBattleSubject({
    state: state.session.state,
    subject: saveAct.subject,
    fills: [saveFill, damageFill],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected production Insect Plague save to resolve: ${JSON.stringify(resolved)}`,
    );
  }
  return {
    ...state,
    session: battleRuntimeSessionForTest({
      ...state.session,
      state: resolved.state,
    }),
  };
}

function beginLaterTurn(
  state: InsectPlagueRuntimeState,
): InsectPlagueRuntimeState {
  const currentActorId = snapshotBattle(state.session.state).currentActorId;
  const advanced = endTurn({
    state: state.session.state,
    actorId: currentActorId,
  });
  if (advanced.tag !== "resolved") {
    throw new Error("Expected the production battle turn to advance.");
  }
  return {
    ...state,
    session: battleRuntimeSessionForTest({
      ...state.session,
      state: advanced.state,
    }),
  };
}

function endInsectPlagueConcentration(
  state: InsectPlagueRuntimeState,
): InsectPlagueRuntimeState {
  const resolved = resolveBattleSubject({
    state: state.session.state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "endConcentration",
    },
    fills: [],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Insect Plague Concentration to end.");
  }
  return {
    ...state,
    session: battleRuntimeSessionForTest({
      ...state.session,
      state: resolved.state,
    }),
  };
}

function persistentAreaSaveDamageRuntimeProjection(
  state: InsectPlagueRuntimeState,
): InsectPlagueMbtProjection {
  const battle = state.session.state;
  const currentActorId = snapshotBattle(battle).currentActorId;
  const caster = requireCombatant(battle, spellCasterId);
  const target = requireCombatant(battle, spellTargetId);
  const effect = persistentAreaSaveDamageEffects(battle)[0];
  const areaActive = effect !== undefined;
  if (effect !== undefined) {
    assertExactEffectRef(state, effect);
  }
  if (caster.origin.kind !== "character") {
    throw new Error("Expected the Insect Plague caster to be a character.");
  }
  const slot = caster.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === state.slotLevel,
  );
  if (slot === undefined) {
    throw new Error("Expected the selected Insect Plague Spell Slot ledger.");
  }
  const obscurementZones = battleObscurementZones(battle).filter(
    (zone) =>
      zone.kind === "spellObscurementZone" &&
      zone.sourceCombatantId === spellCasterId &&
      zone.area.kind === "pointOriginSphere" &&
      zone.area.areaId === insectPlagueAreaId &&
      zone.obscurement === "lightlyObscured",
  );
  const concentrationActive =
    effect !== undefined &&
    caster.concentration?.sourceProcedureRef === effect.sourceProcedureRef;
  return {
    actionAvailable: canSpendAction(battle.currentTurnResources, "magic"),
    targetTurn: currentActorId === spellTargetId,
    areaActive,
    areaOccurrenceOrdinal: effect === undefined ? 0 : state.occurrenceOrdinal,
    areaDamageDice: effect === undefined ? 0 : effect.damage.expr.dice,
    areaDurationTicks:
      effect?.expiresAt.kind === "concentration"
        ? Number(effect.expiresAt.durationTicks)
        : 0,
    areaRadiusFeet: effect === undefined ? 0 : Number(effect.radiusFeet),
    appearanceOccurrenceOpen:
      effect !== undefined &&
      effect.appearanceOccurrence.actorId === currentActorId &&
      effect.appearanceOccurrence.round === battle.initiative.round,
    savedThisTurn: effect?.savedThisTurn.includes(spellTargetId) === true,
    nextOccurrenceOrdinal: Number(caster.nextEffectOrdinal),
    slotLevel: state.slotLevel,
    slotsRemaining: Number(slot.count) - Number(slot.expended),
    slotSpellCastThisTurn:
      battle.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    targetHitPoints: Number(target.hp),
    targetDead:
      target.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? target.zeroHpLifecycle.deathSaves.dead
        : Number(target.hp) === 0,
    targetUnconscious: hasCondition(target.conditions, "unconscious"),
    concentrationActive,
    lightlyObscured: obscurementZones.length === 1,
    difficultTerrain: areaActive,
  };
}

function persistentAreaSaveDamageEffects(
  state: BattleState,
): readonly InsectPlagueEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.filter(
      (effect): effect is InsectPlagueEffect =>
        effect.kind === "persistentAreaSaveDamage",
    ),
  );
}

function requireInsectPlagueEffect(state: BattleState): InsectPlagueEffect {
  const effects = persistentAreaSaveDamageEffects(state);
  if (effects.length !== 1 || effects[0] === undefined) {
    throw new Error("Expected one exact active Insect Plague occurrence.");
  }
  return effects[0];
}

function assertExactEffectRef(
  state: InsectPlagueRuntimeState,
  effect: InsectPlagueEffect,
): void {
  if (
    state.exactEffectRef === null ||
    effect.effectRef !== state.exactEffectRef
  ) {
    throw new Error("Insect Plague active occurrence identity changed.");
  }
}

function diceResults(dice: number, total: number): readonly number[] {
  const results: number[] = [];
  let remaining = total;
  for (let index = 0; index < dice; index += 1) {
    const remainingDice = dice - index - 1;
    const value = Math.min(10, remaining - remainingDice);
    results.push(value);
    remaining -= value;
  }
  return results;
}

function persistentAreaSaveDamageSlotLevel(value: number): 5 | 6 | 7 {
  if (value === 5 || value === 6 || value === 7) return value;
  throw new Error(`Unsupported Insect Plague MBT slot level: ${value}`);
}

function persistentAreaSaveDamageTriggerFromQuint(
  raw: unknown,
): BattleStationaryPersistentAreaSaveDamageTrigger {
  const tag = quintVariantTag(raw);
  if (tag === "InsectPlagueAppearanceOccurrence") return "appearsInArea";
  if (tag === "InsectPlagueFirstEntryOccurrence") return "entersArea";
  if (tag === "InsectPlagueTargetTurnEndOccurrence") return "endsTurnInArea";
  throw new Error(`Unknown Quint Insect Plague trigger: ${tag}`);
}

function normalizeInsectPlagueQuintState(
  raw: unknown,
): InsectPlagueMbtProjection {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Insect Plague state.");
  }
  const state = Object.fromEntries(Object.entries(raw)) as Readonly<
    Record<string, unknown>
  >;
  return {
    actionAvailable: booleanValue(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    targetTurn: booleanValue(state["qTargetTurn"], "qTargetTurn"),
    areaActive: booleanValue(state["qAreaActive"], "qAreaActive"),
    areaOccurrenceOrdinal: numberFromQuintInt(
      state["qAreaOccurrenceOrdinal"],
      "qAreaOccurrenceOrdinal",
    ),
    areaDamageDice: numberFromQuintInt(
      state["qAreaDamageDice"],
      "qAreaDamageDice",
    ),
    areaDurationTicks: numberFromQuintInt(
      state["qAreaDurationTicks"],
      "qAreaDurationTicks",
    ),
    areaRadiusFeet: numberFromQuintInt(
      state["qAreaRadiusFeet"],
      "qAreaRadiusFeet",
    ),
    appearanceOccurrenceOpen: booleanValue(
      state["qAppearanceOccurrenceOpen"],
      "qAppearanceOccurrenceOpen",
    ),
    savedThisTurn: booleanValue(state["qSavedThisTurn"], "qSavedThisTurn"),
    nextOccurrenceOrdinal: numberFromQuintInt(
      state["qNextOccurrenceOrdinal"],
      "qNextOccurrenceOrdinal",
    ),
    slotLevel: numberFromQuintInt(state["qSlotLevel"], "qSlotLevel"),
    slotsRemaining: numberFromQuintInt(
      state["qSlotsRemaining"],
      "qSlotsRemaining",
    ),
    slotSpellCastThisTurn: booleanValue(
      state["qSlotSpellCastThisTurn"],
      "qSlotSpellCastThisTurn",
    ),
    targetHitPoints: numberFromQuintInt(
      state["qTargetHitPoints"],
      "qTargetHitPoints",
    ),
    targetDead: booleanValue(state["qTargetDead"], "qTargetDead"),
    targetUnconscious: booleanValue(
      state["qTargetUnconscious"],
      "qTargetUnconscious",
    ),
    concentrationActive: booleanValue(
      state["qConcentrationActive"],
      "qConcentrationActive",
    ),
    lightlyObscured: booleanValue(
      state["qLightlyObscured"],
      "qLightlyObscured",
    ),
    difficultTerrain: booleanValue(
      state["qDifficultTerrain"],
      "qDifficultTerrain",
    ),
  };
}

function compareInsectPlagueStates(
  quint: InsectPlagueMbtProjection,
  runtime: InsectPlagueMbtProjection,
): boolean {
  if (JSON.stringify(runtime) !== JSON.stringify(quint)) {
    throw new Error(
      `Insect Plague projection mismatch. Quint: ${JSON.stringify(quint)} Runtime: ${JSON.stringify(runtime)}`,
    );
  }
  return true;
}
