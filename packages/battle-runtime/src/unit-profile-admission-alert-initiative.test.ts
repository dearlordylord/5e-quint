// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ALERT-INITIATIVE-RUNTIME alert
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.initiative-proficiency-and-swap
import { describe, expect, test } from "vitest";
import {
  applyInitiativeSwap,
  battleId,
  battleInitiativeProficiencyAndSwapSupportForUnit,
  battleUnitRefWithSupportProfiles,
  combatantId,
  Either,
  endTurn,
  finishInitialInitiativeSetup,
  INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
  oppositionSide,
  parseSupportedUnitFeatureProfile,
  partySide,
  startBattleWithInitialInitiativeSetup,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";
import type {
  BattleState,
  CombatantId,
  UnitRecord,
} from "./unit-profile-admission-test-support.ts";

const alertUnitId = "alert";
const alertSourceId = combatantId("alert-source");
const alertAllyId = combatantId("alert-ally");
const alertSecondAllyId = combatantId("alert-second-ally");
const alertEnemyId = combatantId("alert-enemy");
const alertSupportProfile = {
  kind: INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
  initiative: {
    initiativeRollBonus: {
      amount: { kind: "proficiencyBonus" },
    },
    swap: {
      timing: "immediatelyAfterInitiativeRoll",
      ally: "willingAllySameCombat",
      prohibitedByCondition: "incapacitated",
    },
  },
} as const;

describe("L12G deterministic Alert Initiative admission", () => {
  test("Alert is admitted by Initiative proficiency and swap mechanics", () => {
    const unit = unitLibrary.requireUnit(alertUnitId);

    expect(battleInitiativeProficiencyAndSwapSupportForUnit(unit)).toEqual(
      alertSupportProfile,
    );
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: alertUnitId,
        supportProfiles: [alertSupportProfile],
      }),
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual(
      expect.objectContaining({
        kind: "initiativeProficiencyAndSwap",
        unit,
        initiative: alertSupportProfile.initiative,
      }),
    );
  });

  test("same-shaped synthetic Initiative mechanics are admitted without Alert identity", () => {
    const unit = unitLibrary.requireUnit(alertUnitId);
    const syntheticUnit: UnitRecord = {
      ...unit,
      id: "synthetic_initiative_training",
      name: "Synthetic Initiative Training",
    };

    expect(
      battleInitiativeProficiencyAndSwapSupportForUnit(syntheticUnit),
    ).toEqual(alertSupportProfile);
    expect(parseSupportedUnitFeatureProfile(syntheticUnit, [])).toEqual(
      expect.objectContaining({
        kind: "initiativeProficiencyAndSwap",
        unit: syntheticUnit,
        initiative: alertSupportProfile.initiative,
      }),
    );
  });

  test("Initiative support gate rejects unprojected optional passive facts", () => {
    const mechanics = alertPassiveMechanics();
    const [left, right] = mechanics.grants;
    if (left === undefined || right === undefined) {
      throw new Error("Expected Alert to have Initiative bonus and swap grants.");
    }
    const adjacentUnits = [
      alertShapedUnitWithMechanics(
        "synthetic_initiative_training_with_count",
        {
          ...mechanics,
          grants: [
            left.kind === "modify_roll_numeric" ? { ...left, count: 1 } : left,
            right.kind === "modify_roll_numeric"
              ? { ...right, count: 1 }
              : right,
          ],
        },
      ),
      alertShapedUnitWithMechanics(
        "synthetic_initiative_training_with_condition",
        {
          ...mechanics,
          condition: { kind: "always" },
        },
      ),
      alertShapedUnitWithMechanics(
        "synthetic_initiative_training_with_suppressor",
        {
          ...mechanics,
          suppressedBy: [
            { kind: "condition_active", conditions: ["incapacitated"] },
          ],
        },
      ),
      alertShapedUnitWithMechanics(
        "synthetic_initiative_training_with_operation",
        {
          ...mechanics,
          operations: [
            {
              trigger: { kind: "elapsed_time", unit: "day", amount: 1 },
              effect: {
                kind: "initiative_swap",
                timing: "immediately_after_initiative_roll",
                ally: "willing_ally_same_combat",
                prohibitedByCondition: "incapacitated",
              },
            },
          ],
        },
      ),
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentUnits) {
      expect(battleInitiativeProficiencyAndSwapSupportForUnit(adjacentUnit)).toBe(
        "unsupported",
      );
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle Initiative proficiency-and-swap Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });

  test("Initiative Swap exchanges existing scores before any combatant acts", () => {
    const setup = alertBattleSetup();

    const result = applyInitiativeSwap({
      setup,
      sourceId: alertSourceId,
      allyId: alertAllyId,
      allyWilling: true,
    });

    expect(Either.isRight(result)).toBe(true);
    if (Either.isLeft(result)) {
      throw new Error(result.left.message);
    }
    const state = finishInitialInitiativeSetup(result.right);
    expect(initiativeOrder(state)).toEqual([
      alertSourceId,
      alertEnemyId,
      alertAllyId,
      alertSecondAllyId,
    ]);
    expect(state.combatants.get(alertSourceId)?.initiative).toBe(18);
    expect(state.combatants.get(alertAllyId)?.initiative).toBe(12);
  });

  test("Initiative Swap consumes one post-roll opportunity for the source", () => {
    const setup = alertBattleSetup();

    const firstSwap = applyInitiativeSwap({
      setup,
      sourceId: alertSourceId,
      allyId: alertAllyId,
      allyWilling: true,
    });

    expect(Either.isRight(firstSwap)).toBe(true);
    if (Either.isLeft(firstSwap)) {
      throw new Error(firstSwap.left.message);
    }
    expect(firstSwap.right).toBe(setup);
    expect(firstSwap.right.state.combatants.get(alertSourceId)?.initiative).toBe(
      18,
    );
    const secondSwapFromStaleSetup = applyInitiativeSwap({
      setup,
      sourceId: alertSourceId,
      allyId: alertSecondAllyId,
      allyWilling: true,
    });
    expect(Either.isLeft(secondSwapFromStaleSetup)).toBe(true);

    const secondSwap = applyInitiativeSwap({
      setup: firstSwap.right,
      sourceId: alertSourceId,
      allyId: alertSecondAllyId,
      allyWilling: true,
    });

    expect(Either.isLeft(secondSwap)).toBe(true);
  });

  test("Initiative Swap requires a willing same-side non-Incapacitated ally", () => {
    const setup = alertBattleSetup();

    expectSwapRejected({
      setup,
      sourceId: alertSourceId,
      allyId: alertAllyId,
      allyWilling: false,
    });

    expectSwapRejected({
      setup: alertBattleSetup({ sourceConditions: ["incapacitated"] }),
      sourceId: alertSourceId,
      allyId: alertAllyId,
      allyWilling: true,
    });

    expectSwapRejected({
      setup: alertBattleSetup({ allyConditions: ["incapacitated"] }),
      sourceId: alertSourceId,
      allyId: alertAllyId,
      allyWilling: true,
    });

    expectSwapRejected({
      setup,
      sourceId: alertSourceId,
      allyId: alertEnemyId,
      allyWilling: true,
    });
  });

  test("Initiative Swap timing is restricted to the initial setup workflow", () => {
    const setup = alertBattleSetup();

    const actedState = endTurn({
      state: finishInitialInitiativeSetup(setup),
      actorId: alertAllyId,
    });
    expect(actedState.tag).toBe("resolved");
    if (actedState.tag !== "resolved") {
      throw new Error("Expected first Alert ally turn to resolve.");
    }
    expect(actedState.state.initiative.alreadyActed.length).toBeGreaterThan(0);
    expectSwapRejected({
      setup,
      sourceId: alertSourceId,
      allyId: alertAllyId,
      allyWilling: true,
    });
  });
});

function alertBattleSetup(
  input: {
    readonly sourceConditions?: readonly "incapacitated"[];
    readonly allyConditions?: readonly "incapacitated"[];
  } = {},
) {
  const unit = unitLibrary.requireUnit(alertUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: alertUnitId,
      supportProfiles: [alertSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const result = startBattleWithInitialInitiativeSetup({
    battleId: battleId("unit-profile-alert-initiative-admission"),
    combatants: [
      characterCreature({
        combatantId: alertSourceId,
        displayName: "Alert source",
        initiative: 12,
        side: partySide,
        characterUnitRefs: [unitRef.right],
        conditions: input.sourceConditions,
      }),
      characterCreature({
        combatantId: alertAllyId,
        displayName: "Alert ally",
        initiative: 18,
        side: partySide,
        conditions: input.allyConditions,
      }),
      characterCreature({
        combatantId: alertEnemyId,
        displayName: "Alert enemy",
        initiative: 15,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: alertSecondAllyId,
        displayName: "Alert second ally",
        initiative: 9,
        side: partySide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function expectSwapRejected(input: Parameters<typeof applyInitiativeSwap>[0]) {
  expect(Either.isLeft(applyInitiativeSwap(input))).toBe(true);
}

function alertPassiveMechanics() {
  const unit = unitLibrary.requireUnit(alertUnitId);
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    throw new Error("Expected Alert to be a passive feat.");
  }
  return unit.mechanics;
}

function alertShapedUnitWithMechanics(
  id: UnitRecord["id"],
  mechanics: ReturnType<typeof alertPassiveMechanics>,
): UnitRecord {
  const unit = unitLibrary.requireUnit(alertUnitId);
  if (unit.kind !== "feat") {
    throw new Error("Expected Alert to be a feat.");
  }
  return {
    ...unit,
    id,
    name: "Synthetic Initiative Training",
    mechanics,
  };
}

function initiativeOrder(state: BattleState): readonly CombatantId[] {
  return state.initiative.stillToAct.map((entry) => entry.creature);
}
