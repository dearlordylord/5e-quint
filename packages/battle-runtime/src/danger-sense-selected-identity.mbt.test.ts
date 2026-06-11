// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B4-CLASS-FEATURE-IDENTITY-BATCH-1 barbarian_danger_sense
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 barbarian_danger_sense doProjectDangerSenseDexterityAdvantage doSuppressDangerSenseWhileIncapacitated
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";
import {
  applyCondition,
  barbarianDangerSenseUnitId,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleId,
  battleUnitRefWithSupportProfiles,
  classLevel,
  Either,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  startBattle,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import type { BattleState } from "./unit-profile-admission-test-support.ts";

const BARBARIAN_DANGER_SENSE_UNIT_ID = "barbarian_danger_sense";

type DangerSenseProjection = {
  readonly lastResult:
    | "init"
    | "danger-sense-dexterity-advantage"
    | "danger-sense-incapacitated-suppressed";
  readonly sourceUnitId: typeof BARBARIAN_DANGER_SENSE_UNIT_ID | "none";
  readonly dexterityRollModeCount: number;
  readonly constitutionRollModeCount: number;
  readonly suppressed: boolean;
  readonly accepted: boolean;
};

defineSelectedIdentityWitness({
  describeLabel: "Battle Runtime Danger Sense selected identity MBT",
  taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-danger-sense-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    lastResult: "str",
    sourceUnitId: "str",
    dexterityRollModeCount: "int",
    constitutionRollModeCount: "int",
    suppressed: "bool",
    accepted: "bool",
  },
  initialProjection: initialProjection(),
  units: [
    {
      unitId: barbarianDangerSenseUnitId,
      procedures: [
        {
          actionName: "doProjectDangerSenseDexterityAdvantage",
          projectionAfter: dangerSenseDexterityAdvantageProjection(),
          discover: () => dangerSenseDexterityAdvantageProjection(),
        },
        {
          actionName: "doSuppressDangerSenseWhileIncapacitated",
          projectionAfter: dangerSenseSuppressedProjection(),
          discover: () => dangerSenseSuppressedProjection(),
        },
      ],
    },
  ],
});

function initialProjection(): DangerSenseProjection {
  return {
    lastResult: "init",
    sourceUnitId: "none",
    dexterityRollModeCount: 0,
    constitutionRollModeCount: 0,
    suppressed: false,
    accepted: false,
  };
}

function dangerSenseDexterityAdvantageProjection(): DangerSenseProjection {
  const state = dangerSenseBattle();
  return {
    lastResult: "danger-sense-dexterity-advantage",
    sourceUnitId: BARBARIAN_DANGER_SENSE_UNIT_ID,
    dexterityRollModeCount: savingThrowRollModeProjections(state, "dex").length,
    constitutionRollModeCount: savingThrowRollModeProjections(state, "con")
      .length,
    suppressed: false,
    accepted: true,
  };
}

function dangerSenseSuppressedProjection(): DangerSenseProjection {
  const state = incapacitatedDangerSenseBattle();
  return {
    lastResult: "danger-sense-incapacitated-suppressed",
    sourceUnitId: BARBARIAN_DANGER_SENSE_UNIT_ID,
    dexterityRollModeCount: savingThrowRollModeProjections(state, "dex").length,
    constitutionRollModeCount: savingThrowRollModeProjections(state, "con")
      .length,
    suppressed: true,
    accepted: true,
  };
}

function dangerSenseBattle(): BattleState {
  const unit = unitLibrary.requireUnit(barbarianDangerSenseUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const result = startBattle({
    battleId: battleId("b4-danger-sense-selected-identity"),
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
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function incapacitatedDangerSenseBattle(): BattleState {
  const state = dangerSenseBattle();
  const target = state.combatants.get(spellTargetId);
  if (target === undefined) {
    throw new Error("Expected Danger Sense target combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, "incapacitated"),
      ),
    }),
  };
}
