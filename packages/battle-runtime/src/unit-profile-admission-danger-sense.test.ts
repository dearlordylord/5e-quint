import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { passiveSavingThrowRollModeRouteEvents } from "./index.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-BARBARIAN-DANGER-SENSE barbarian_danger_sense
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-saving-throw-roll-mode
import {
  battleStateWithAllocatedEffectOccurrencesForTest,
  characterBattleFeatureInitForTest,
  requireCharacterSpellProcedureRefForTest,
  spellRecord,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { spellSlotInvocationRef } from "./index.ts";
import { describe, expect, test } from "vitest";
import { Result } from "effect";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  applyCondition,
  barbarianDangerSenseUnitId,
  battleId,
  battleCreatureStateWithKnockOutPreservedConditions,
  battlePassiveSavingThrowRollModeSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  elapsedTimeTicks,
  endTurn,
  greaseAreaId,
  greaseGroundHazardEndTurnAct,
  greaseGroundHazardSaveAct,
  greaseUnitId,
  parseSupportedUnitFeatureProfile,
  PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  requireHole,
  spellCasterId,
  spellTargetId,
  startBattle,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import type {
  BattleRuntimeSession,
  BattleState,
  UnitRecord,
} from "./unit-profile-admission.test-support.ts";

const dangerSenseSupportProfile = {
  kind: PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  savingThrow: {
    mode: "advantage",
    scope: {
      kind: "savingThrowAbility",
      ability: "dex",
      suppressedByCondition: "incapacitated",
    },
  },
} as const;

describe("L12G deterministic Danger Sense admission", () => {
  test("Danger Sense is admitted as passive Dexterity Saving Throw Advantage", () => {
    const unit = unitLibrary.requireUnit(barbarianDangerSenseUnitId);

    expect(battlePassiveSavingThrowRollModeSupportForUnit(unit)).toEqual(
      dangerSenseSupportProfile,
    );
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(barbarianDangerSenseUnitId),
        supportProfiles: [dangerSenseSupportProfile],
      }),
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "barbarian", level: classLevel(2) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "passiveSavingThrowRollMode",
        unit,
        savingThrow: dangerSenseSupportProfile.savingThrow,
      }),
    );
  });

  test("adjacent Saving Throw roll-mode grants stay unsupported", () => {
    const unit = unitLibrary.requireUnit(barbarianDangerSenseUnitId);
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Danger Sense passive class feature fixture.");
    }
    const [effect] = unit.mechanics.grants;
    if (effect?.kind !== "modify_roll_advantage") {
      throw new Error("Expected Danger Sense roll-mode grant fixture.");
    }
    const adjacentUnit: UnitRecord = {
      ...unit,
      id: parseSharedUnitId("barbarian_danger_sense_con_test"),
      mechanics: {
        ...unit.mechanics,
        grants: [{ ...effect, saveAbilityFilter: ["con"] }],
      },
    };

    expect(battlePassiveSavingThrowRollModeSupportForUnit(adjacentUnit)).toBe(
      "unsupported",
    );
    expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
  });

  test("Danger Sense projects Advantage for Dexterity saves while not Incapacitated", () => {
    const state = dangerSenseBattle();

    expect(savingThrowRollModeProjections(state.state, "dex")).toEqual([
      {
        targetId: spellTargetId,
        rollMode: "advantage",
      },
    ]);
    expect(savingThrowRollModeProjections(state.state, "con")).toEqual([]);
  });

  test("Danger Sense is suppressed while the target is Incapacitated", () => {
    const state = dangerSenseBattle();
    const target = state.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Danger Sense target combatant.");
    }
    const incapacitatedState: BattleState = {
      ...state.state,
      combatants: new Map(state.state.combatants).set(spellTargetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(target.conditions, "incapacitated"),
        ),
      }),
    };

    expect(savingThrowRollModeProjections(incapacitatedState, "dex")).toEqual(
      [],
    );
  });

  test("Danger Sense routes matching saves through projection and Incapacitated suppression owners", () => {
    const session = dangerSenseBattle();

    expect(
      passiveSavingThrowRollModeRouteEvents({
        state: session.state,
        ability: "con",
      }),
    ).toBeUndefined();
    expect(
      passiveSavingThrowRollModeRouteEvents({
        state: session.state,
        ability: "dex",
      }),
    ).toEqual([
      { kind: "startBattle", owner: "battleSavingThrowRollMode" },
      {
        kind: "discoverBattleActs",
        subject: "passiveSavingThrowRollMode",
        holes: ["savingThrowOutcome"],
        owner: "battleSavingThrowRollMode",
      },
      {
        kind: "resolveBattleSubject",
        subject: "passiveSavingThrowRollMode",
        fill: "savingThrowOutcome",
        holes: [],
        owner: "battleSavingThrowRollMode",
      },
    ]);

    const target = session.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Danger Sense target combatant.");
    }
    const incapacitatedState: BattleState = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellTargetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(target.conditions, "incapacitated"),
        ),
      }),
    };
    expect(
      passiveSavingThrowRollModeRouteEvents({
        state: incapacitatedState,
        ability: "dex",
      }),
    ).toEqual([
      { kind: "startBattle", owner: "battleSavingThrowRollMode" },
      {
        kind: "discoverBattleActs",
        subject: "passiveSavingThrowRollMode",
        holes: [],
        owner: "battleSavingThrowRollMode",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "passiveSavingThrowRollMode",
        holes: [],
        owner: "battleConditionLifecycle",
      },
    ]);
  });

  test("Danger Sense projects through Grease entry and end-turn Dexterity save holes", () => {
    const state = dangerSenseGreaseGroundHazardBattle();

    const entryAct = greaseGroundHazardSaveAct(
      state,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    expect(entrySave).toMatchObject({
      ability: "dex",
      greaseGroundHazard: {
        targetId: spellTargetId,
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        trigger: "entersArea",
      },
      targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
    });

    const endTurnAct = greaseGroundHazardEndTurnAct(state, spellTargetId);
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(endTurnSave).toMatchObject({
      ability: "dex",
      greaseGroundHazard: {
        targetId: spellTargetId,
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        trigger: "endsTurnInArea",
      },
      targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
    });
  });

  test("Danger Sense is suppressed in Grease save holes while Incapacitated", () => {
    const state = dangerSenseGreaseGroundHazardBattle({
      incapacitated: true,
    });

    const entryAct = greaseGroundHazardSaveAct(
      state,
      spellTargetId,
      "entersArea",
    );
    expect(
      requireHole(entryAct.initialHoles, "savingThrowOutcome").targetRollModes,
    ).toEqual([]);

    const endTurnAct = greaseGroundHazardEndTurnAct(state, spellTargetId);
    expect(
      requireHole(endTurnAct.initialHoles, "savingThrowOutcome")
        .targetRollModes,
    ).toEqual([]);
  });
});

function dangerSenseBattle(): BattleRuntimeSession {
  const unit = unitLibrary.requireUnit(barbarianDangerSenseUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Result.succeed({
      unit: unitLibrary.requireUnit(barbarianDangerSenseUnitId),
      supportProfiles: [dangerSenseSupportProfile],
    }),
  );
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const result = startBattle({
    battleId: battleId("unit-profile-danger-sense-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Caster",
        initiative: 20,
        classLevels: [{ className: "wizard", level: classLevel(1) }],
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord(greaseUnitId)],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Danger Sense Barbarian",
        initiative: 10,
        classLevels: [{ className: "barbarian", level: classLevel(2) }],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "barbarian", level: classLevel(2) },
          ]),
        ],
        characterUnitRefs: [unitRef.success],
      }),
    ],
  });
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function dangerSenseGreaseGroundHazardBattle(input?: {
  readonly incapacitated?: boolean;
}): BattleRuntimeSession {
  const session = dangerSenseBattle();
  const state = session.state;
  const caster = state.combatants.get(spellCasterId);
  const target = state.combatants.get(spellTargetId);
  if (caster === undefined || target === undefined) {
    throw new Error("Expected Danger Sense Grease combatants.");
  }
  const allocatedState = battleStateWithAllocatedEffectOccurrencesForTest({
    state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: spellCasterId,
        effect: {
          kind: "greaseGroundHazard",
          sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            spellCasterId,
            spellSlotInvocationRef(greaseUnitId, 1, "greaseGroundHazard"),
          ),
          sourceCombatantId: spellCasterId,
          areaId: greaseAreaId,
          heightenedSpellTargetDisadvantage: null,
          save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
    ],
  }).state;
  const nextCombatants = new Map(allocatedState.combatants);
  if (input?.incapacitated === true) {
    nextCombatants.set(spellTargetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, "incapacitated"),
      ),
    });
  }
  const targetTurn = endTurn({
    state: { ...allocatedState, combatants: nextCombatants },
    actorId: spellCasterId,
  });
  expect(targetTurn.tag).toBe("resolved");
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Danger Sense Grease target turn.");
  }
  return battleRuntimeSessionForTest({ ...session, state: targetTurn.state });
}
