import { PassiveSavingThrowRollModeProcedureExecutionSchema } from "./battle-reducer/procedure-execution-codecs.ts";
import { unitId } from "@dnd/shared/game-facts";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { characterBattleFeatureInitForTest } from "./battle-runtime.test-support.ts";
import { battleInitializationIssueMessage } from "./battle-reducer/api-lifecycle.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { passiveSavingThrowRollModeRouteEvents } from "./index.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleId,
  battlePassiveSavingThrowRollModeSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  spellCasterId,
  spellTargetId,
  startBattle,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";
import type { UnitRecord } from "./unit-profile-admission.test-support.ts";

// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection GNOME-GNOMISH-CUNNING species_gnome_gnomish_cunning
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-saving-throw-roll-mode
const unit = unitLibrary.requireUnit("species_gnome_gnomish_cunning");
const expectedSupport = {
  kind: "passiveSavingThrowRollMode",
  savingThrow: {
    mode: "advantage",
    scope: { kind: "savingThrowAbilities", abilities: ["int", "wis", "cha"] },
  },
} as const;

describe("Gnomish Cunning battle admission and Saving Throw Advantage", () => {
  test("admits Gnomish Cunning and an independently named equivalent by mechanics", () => {
    expect(battlePassiveSavingThrowRollModeSupportForUnit(unit)).toEqual(
      expectedSupport,
    );
    const syntheticUnit: UnitRecord = {
      ...unit,
      id: unitId("synthetic_mental_save_advantage"),
      name: "Synthetic Mental Save Advantage",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic save ability filter",
      },
    };
    expect(
      battlePassiveSavingThrowRollModeSupportForUnit(syntheticUnit),
    ).toEqual(expectedSupport);
  });

  test("round-trips a nonempty ability scope through procedure execution codecs", () => {
    const encoded = {
      kind: "passiveSavingThrowRollMode",
      savingThrow: expectedSupport.savingThrow,
    } as const;
    const decoded = Schema.decodeUnknownResult(
      PassiveSavingThrowRollModeProcedureExecutionSchema,
    )(encoded);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) throw new Error(String(decoded.failure));
    expect(
      Schema.encodeSync(PassiveSavingThrowRollModeProcedureExecutionSchema)(
        decoded.success,
      ),
    ).toEqual(encoded);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(
          PassiveSavingThrowRollModeProcedureExecutionSchema,
        )({
          ...encoded,
          savingThrow: {
            mode: "advantage",
            scope: { kind: "savingThrowAbilities", abilities: [] },
          },
        }),
      ),
    ).toBe(true);
  });

  test("starts battle and projects Advantage only on Intelligence, Wisdom, and Charisma saves", () => {
    const state = gnomishCunningBattle();
    for (const ability of ["int", "wis", "cha"] as const) {
      expect(savingThrowRollModeProjections(state, ability)).toEqual([
        { targetId: spellTargetId, rollMode: "advantage" },
      ]);
      expect(
        passiveSavingThrowRollModeRouteEvents({ state, ability }),
      ).toMatchObject([
        { kind: "startBattle" },
        { kind: "discoverBattleActs", holes: ["savingThrowOutcome"] },
        { kind: "resolveBattleSubject", fill: "savingThrowOutcome" },
      ]);
    }
    for (const ability of ["str", "dex", "con"] as const) {
      expect(savingThrowRollModeProjections(state, ability)).toEqual([]);
      expect(
        passiveSavingThrowRollModeRouteEvents({ state, ability }),
      ).toBeUndefined();
    }
  });

  test("an unsuppressed ability grant still projects after an earlier suppressed grant", () => {
    if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
      throw new Error("Expected passive Gnome trait fixture.");
    }
    const syntheticUnit: UnitRecord = {
      ...unit,
      id: unitId("synthetic_dexterity_save_advantage"),
      name: "Synthetic Dexterity Save Advantage",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic overlapping save scope",
      },
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "modify_roll_advantage",
            mode: "advantage",
            on: ["saving_throw"],
            saveAbilityFilter: ["dex"],
          },
        ],
      },
    };
    const state = gnomishCunningBattle([
      unitLibrary.requireUnit("barbarian_danger_sense"),
      syntheticUnit,
    ]);
    const target = state.combatants.get(spellTargetId);
    if (target === undefined)
      throw new Error("Expected admitted passive target.");
    const incapacitatedState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(target.conditions, "incapacitated"),
        ),
      }),
    };
    expect(savingThrowRollModeProjections(incapacitatedState, "dex")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(
      passiveSavingThrowRollModeRouteEvents({
        state: incapacitatedState,
        ability: "dex",
      }),
    ).toMatchObject([
      { kind: "startBattle" },
      { kind: "discoverBattleActs", holes: ["savingThrowOutcome"] },
      { kind: "resolveBattleSubject", fill: "savingThrowOutcome" },
    ]);
  });

  test("retains Advantage while Incapacitated and cancels simultaneous Disadvantage", () => {
    const state = gnomishCunningBattle();
    const target = state.combatants.get(spellTargetId);
    if (target === undefined)
      throw new Error("Expected admitted Gnome target.");
    const incapacitatedState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(target.conditions, "incapacitated"),
        ),
      }),
    };
    expect(savingThrowRollModeProjections(incapacitatedState, "wis")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(
      savingThrowRollModeProjections(state, "wis", undefined, {
        targetId: spellTargetId,
        rollMode: "disadvantage",
      }),
    ).toEqual([{ targetId: spellTargetId, rollMode: "normal" }]);
  });
});

function gnomishCunningBattle(units: readonly UnitRecord[] = [unit]) {
  const classLevels = [
    { className: "barbarian", level: classLevel(2) },
  ] as const;
  const unitRefs = units.map((unit) => {
    const result = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) throw new Error(result.failure.message);
    return result.success;
  });
  const result = startBattle({
    battleId: battleId("gnomish-cunning-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Opponent",
        initiative: 20,
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Gnome",
        initiative: 10,
        classLevels,
        unitFeatures: units.map((unit) =>
          characterBattleFeatureInitForTest(unit, classLevels),
        ),
        characterUnitRefs: unitRefs,
      }),
    ],
  });
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isFailure(result))
    throw new Error(battleInitializationIssueMessage(result.failure));
  return result.success.state;
}
