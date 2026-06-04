// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES fighter_remarkable_athlete
// UNIT-IDENTITY-MBT-REPLAY: L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES fighter_remarkable_athlete doProjectRemarkableAthleteRollModes
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.remarkable-athlete
import * as path from "node:path";

import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import {
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  Either,
  fighterRemarkableAthleteUnitId,
  oppositionSide,
  partySide,
  requiredInitiativeRollModeForCombatant,
  startBattle,
  type BattleState,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";

type RollMode = "normal" | "advantage" | "disadvantage";

type RemarkableAthleteProjection = {
  readonly initiativeRollMode: RollMode;
  readonly strengthAthleticsRollMode: RollMode;
  readonly strengthAcrobaticsRollMode: RollMode;
  readonly plainStrengthRollMode: RollMode;
  readonly dexterityAthleticsRollMode: RollMode;
  readonly unselectedStrengthAthleticsRollMode: RollMode;
  readonly lastResult: "init" | "projected";
};

const remarkableAthleteActorId = combatantId("remarkable-athlete-mbt-actor");
const unselectedActorId = combatantId("remarkable-athlete-mbt-unselected");
const targetId = combatantId("remarkable-athlete-mbt-target");

defineSelectedIdentityWitness({
  describeLabel: "Remarkable Athlete selected identity MBT",
  taskId: "L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-remarkable-athlete-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    initiativeRollMode: "str",
    strengthAthleticsRollMode: "str",
    strengthAcrobaticsRollMode: "str",
    plainStrengthRollMode: "str",
    dexterityAthleticsRollMode: "str",
    unselectedStrengthAthleticsRollMode: "str",
    lastResult: "str",
  },
  initialProjection: {
    initiativeRollMode: "normal",
    strengthAthleticsRollMode: "normal",
    strengthAcrobaticsRollMode: "normal",
    plainStrengthRollMode: "normal",
    dexterityAthleticsRollMode: "normal",
    unselectedStrengthAthleticsRollMode: "normal",
    lastResult: "init",
  },
  units: [
    {
      unitId: fighterRemarkableAthleteUnitId,
      procedures: [
        {
          actionName: "doProjectRemarkableAthleteRollModes",
          projectionAfter: {
            initiativeRollMode: "advantage",
            strengthAthleticsRollMode: "advantage",
            strengthAcrobaticsRollMode: "normal",
            plainStrengthRollMode: "normal",
            dexterityAthleticsRollMode: "normal",
            unselectedStrengthAthleticsRollMode: "normal",
            lastResult: "projected",
          },
          discover: () =>
            projectRemarkableAthleteRollModes(
              remarkableAthleteBattle(),
              "projected",
            ),
        },
      ],
    },
  ],
});

function remarkableAthleteBattle(): BattleState {
  const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const state = startBattle({
    battleId: battleId("remarkable-athlete-selected-identity"),
    combatants: [
      characterCreature({
        combatantId: remarkableAthleteActorId,
        displayName: "Remarkable Athlete MBT Actor",
        initiative: 18,
        side: partySide,
        characterUnitRefs: [unitRef.right],
        classLevels: [{ className: "fighter", level: 3 }],
        unitFeatures: [{ unit }],
      }),
      characterCreature({
        combatantId: unselectedActorId,
        displayName: "Remarkable Athlete MBT Unselected Actor",
        initiative: 14,
        side: partySide,
        classLevels: [{ className: "fighter", level: 3 }],
        unitFeatures: [{ unit }],
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Remarkable Athlete MBT Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(state)) {
    throw new Error(state.left.message);
  }
  return state.right;
}

function projectRemarkableAthleteRollModes(
  state: BattleState,
  lastResult: RemarkableAthleteProjection["lastResult"],
): RemarkableAthleteProjection {
  return {
    initiativeRollMode:
      requiredInitiativeRollModeForCombatant(
        state,
        remarkableAthleteActorId,
      ) ?? "normal",
    strengthAthleticsRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "str", {
        skill: "athletics",
      }) ?? "normal",
    strengthAcrobaticsRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "str", {
        skill: "acrobatics",
      }) ?? "normal",
    plainStrengthRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "str") ??
      "normal",
    dexterityAthleticsRollMode:
      requiredAbilityCheckRollMode(state, remarkableAthleteActorId, "dex", {
        skill: "athletics",
      }) ?? "normal",
    unselectedStrengthAthleticsRollMode:
      requiredAbilityCheckRollMode(state, unselectedActorId, "str", {
        skill: "athletics",
      }) ?? "normal",
    lastResult,
  };
}
