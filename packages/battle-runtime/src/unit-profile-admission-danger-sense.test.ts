// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-BARBARIAN-DANGER-SENSE barbarian_danger_sense
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-saving-throw-roll-mode
import { describe, expect, test } from "vitest";
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
  Either,
  endTurn,
  greaseAreaId,
  greaseGroundHazardEndTurnAct,
  greaseGroundHazardSaveAct,
  greaseUnitId,
  oppositionSide,
  parseSupportedUnitFeatureProfile,
  partySide,
  PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  requireHole,
  spellCasterId,
  spellTargetId,
  startBattle,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";
import type {
  BattleActiveEffect,
  BattleState,
  UnitRecord,
} from "./unit-profile-admission-test-support.ts";

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
      Either.right({
        unitId: barbarianDangerSenseUnitId,
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
      id: "barbarian_danger_sense_con_test",
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

    expect(savingThrowRollModeProjections(state, "dex")).toEqual([
      {
        targetId: spellTargetId,
        rollMode: "advantage",
      },
    ]);
    expect(savingThrowRollModeProjections(state, "con")).toEqual([]);
  });

  test("Danger Sense is suppressed while the target is Incapacitated", () => {
    const state = dangerSenseBattle();
    const target = state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Danger Sense target combatant.");
    }
    const incapacitatedState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
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

  test("Danger Sense projects through Grease entry and end-turn Dexterity save holes", () => {
    const state = dangerSenseGreaseGroundHazardBattle();

    const entryAct = greaseGroundHazardSaveAct(
      state,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(
      entryAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(entrySave).toMatchObject({
      ability: "dex",
      greaseGroundHazard: {
        targetId: spellTargetId,
        sourceSpellId: greaseUnitId,
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
        sourceSpellId: greaseUnitId,
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
      requireHole(entryAct.initialHoles, "savingThrowOutcome")
        .targetRollModes,
    ).toEqual([]);

    const endTurnAct = greaseGroundHazardEndTurnAct(state, spellTargetId);
    expect(
      requireHole(endTurnAct.initialHoles, "savingThrowOutcome")
        .targetRollModes,
    ).toEqual([]);
  });
});

function dangerSenseBattle(): BattleState {
  const unit = unitLibrary.requireUnit(barbarianDangerSenseUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: barbarianDangerSenseUnitId,
      supportProfiles: [dangerSenseSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const result = startBattle({
    battleId: battleId("unit-profile-danger-sense-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Caster",
        initiative: 20,
        side: partySide,
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Danger Sense Barbarian",
        initiative: 10,
        side: oppositionSide,
        classLevels: [{ className: "barbarian", level: classLevel(2) }],
        unitFeatures: [{ unit }],
        characterUnitRefs: [unitRef.right],
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function dangerSenseGreaseGroundHazardBattle(input?: {
  readonly incapacitated?: boolean;
}): BattleState {
  const state = dangerSenseBattle();
  const caster = state.combatants.get(spellCasterId);
  const target = state.combatants.get(spellTargetId);
  if (caster === undefined || target === undefined) {
    throw new Error("Expected Danger Sense Grease combatants.");
  }
  const greaseGroundHazard: Extract<
    BattleActiveEffect,
    { readonly kind: "greaseGroundHazard" }
  > = {
    kind: "greaseGroundHazard",
    sourceSpellId: greaseUnitId,
    sourceCombatantId: spellCasterId,
    areaId: greaseAreaId,
    heightenedSpellTargetDisadvantage: null,
    save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  };
  const nextCombatants = new Map(state.combatants).set(spellCasterId, {
    ...caster,
    activeEffects: [...caster.activeEffects, greaseGroundHazard],
  });
  if (input?.incapacitated === true) {
    nextCombatants.set(spellTargetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, "incapacitated"),
      ),
    });
  }
  const targetTurn = endTurn({
    state: { ...state, combatants: nextCombatants },
    actorId: spellCasterId,
  });
  expect(targetTurn.tag).toBe("resolved");
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Danger Sense Grease target turn.");
  }
  return targetTurn.state;
}
