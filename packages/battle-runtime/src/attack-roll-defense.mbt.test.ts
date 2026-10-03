// UNIT-IDENTITY-REPLAY: FEATURE-585 ranger_defensive_tactics doResolveDefense
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay FEATURE-585 ranger_defensive_tactics
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.ATTACK_ROLL_DEFENSE
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.attack-roll-defense
import type { AttackRollDefenseSelection } from "@dnd/shared/game-facts";
// RAW: .references/srd-5.2.1/classes.md:6825-6832.
import { Result } from "effect";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleUnitRefWithSupportProfiles } from "./unit-feature-support.ts";
import {
  requiredAttackRollMode,
  recordAttackRollOngoingFeatures,
} from "./battle-reducer/attack-roll.ts";
import { resetBattleTurnResources } from "./battle-reducer/turn-resource-reset.ts";
import {
  startBattleSessionRight,
  battleId,
  characterSeed,
  fighterId,
  goblinId,
  statBlockCreatureInit,
  unitLibrary,
  testLongswordAttack,
} from "./battle-runtime.test-support.ts";

function defenseProjection() {
  const unit = unitLibrary.requireUnit("ranger_defensive_tactics");
  const stateFor = (selection: AttackRollDefenseSelection) => {
    const ref = Result.getOrThrow(
      battleUnitRefWithSupportProfiles({
        unit,
        unitRef: {
          unitId: unit.id,
          selectedOption: { kind: "attackRollDefense", selection },
        },
      }),
    );
    return startBattleSessionRight({
      battleId: battleId("battle:defense-parity"),
      combatants: [
        characterSeed({ initiative: 20, characterUnitRefs: [ref] }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }).state;
  };
  const opportunity = stateFor("opportunityAttackDisadvantage");
  const repeat = stateFor("repeatAttackerAfterHitDisadvantage");
  const hit = recordAttackRollOngoingFeatures(
    repeat,
    goblinId,
    fighterId,
    null,
    [],
    true,
  );
  const miss = recordAttackRollOngoingFeatures(
    repeat,
    goblinId,
    fighterId,
    null,
    [],
    false,
  );
  const nextTurn = {
    ...hit,
    currentTurnResources: resetBattleTurnResources(hit.currentTurnResources),
  };
  const attack = testLongswordAttack();
  return {
    opportunityDisadvantage:
      requiredAttackRollMode(
        opportunity,
        goblinId,
        fighterId,
        attack,
        [],
        true,
      ) === "disadvantage",
    ordinaryDisadvantage:
      requiredAttackRollMode(opportunity, goblinId, fighterId, attack, []) ===
      "disadvantage",
    repeatDisadvantage:
      requiredAttackRollMode(hit, goblinId, fighterId, attack, []) ===
      "disadvantage",
    missDisadvantage:
      requiredAttackRollMode(miss, goblinId, fighterId, attack, []) ===
      "disadvantage",
    nextTurnDisadvantage:
      requiredAttackRollMode(nextTurn, goblinId, fighterId, attack, []) ===
      "disadvantage",
  };
}

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Attack roll defense selected identity",
  taskId: "FEATURE-585",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-attack-roll-defense.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  projectionSchema: {
    opportunityDisadvantage: "bool",
    ordinaryDisadvantage: "bool",
    repeatDisadvantage: "bool",
    missDisadvantage: "bool",
    nextTurnDisadvantage: "bool",
  },
  initialProjection: {
    opportunityDisadvantage: false,
    ordinaryDisadvantage: false,
    repeatDisadvantage: false,
    missDisadvantage: false,
    nextTurnDisadvantage: false,
  },
  units: [
    {
      unitId: "ranger_defensive_tactics",
      procedures: [
        { actionName: "doResolveDefense", discover: defenseProjection },
      ],
    },
  ],
});
