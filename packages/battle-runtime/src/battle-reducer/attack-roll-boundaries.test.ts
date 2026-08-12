import { describe, expect, test } from "vitest";
import { DieRollResult } from "@dnd/shared/types";

import {
  battleProcedureExecutionRefForTest,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  longswordWeaponMasterySelections,
  tacticalMasterReplacementUnitRefs,
  testGreataxeAttack,
  testLongswordAttack,
  testUnarmedStrikeDamageAttack,
  unitFeatureDecisionFill,
} from "../battle-runtime.test-support.ts";
import { combatantId } from "../identity.ts";
import {
  activeEffectGrantsAttackRollMode,
  attackRollOngoingFeatureActivationProfile,
  consumeSelfAttackRollEffects,
  extendAttackRollOngoingFeatures,
  extendSavingThrowOngoingFeatures,
  huntersPreyHordeBreakerDamageHole,
  recordHuntersPreyHordeBreakerUsed,
  recordWeaponMasteryCleaveUsed,
  tacticalMasterAttackWithReplacement,
  tacticalMasterReplacementDecisionHole,
  weaponMasteryCleaveDamageHole,
} from "./attack-roll.ts";
import { battleStateWithSyntheticWeakeningEndTurnSave } from "../command-delegated-end-turn.test-support.ts";

describe("attack-roll reducer boundaries", () => {
  test("stale ongoing-feature and Tactical Master references cannot activate a different attack", () => {
    const tacticalState = fighterVsGoblinBattle({
      characterUnitRefs: tacticalMasterReplacementUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const tacticalActor = tacticalState.combatants.get(fighterId);
    if (
      tacticalActor?.origin.kind !== "character" ||
      tacticalActor.origin.attack === null
    ) {
      throw new Error("Expected the Tactical Master weapon attack.");
    }
    const tacticalAttack = tacticalActor.origin.attack;
    const decisionHole = tacticalMasterReplacementDecisionHole(
      tacticalState,
      fighterId,
      tacticalAttack,
    );
    if (decisionHole === null) {
      throw new Error("Expected the admitted Tactical Master decision.");
    }
    const pushDecision = unitFeatureDecisionFill(decisionHole, "push");
    if (pushDecision.kind !== "unitFeatureDecision") {
      throw new Error("Expected the Tactical Master decision fill.");
    }

    expect(
      tacticalMasterAttackWithReplacement({
        state: fighterVsGoblinBattle(),
        attackerId: fighterId,
        attack: testLongswordAttack(),
        decision: pushDecision,
      }),
    ).toEqual({
      tag: "invalid",
      message:
        "Tactical Master replacement is only valid for an eligible weapon mastery attack.",
    });
    expect(
      attackRollOngoingFeatureActivationProfile(
        tacticalState,
        fighterId,
        tacticalAttack,
        battleProcedureExecutionRefForTest("stale-ongoing-feature"),
        true,
      ),
    ).toBeNull();
  });

  test("attack-roll one-shot cleanup and ongoing extension are no-ops after their actor leaves", () => {
    const state = fighterVsGoblinBattle();
    const absentActorId = combatantId("departed-actor");

    expect(consumeSelfAttackRollEffects(state, absentActorId)).toBe(state);
    expect(
      extendAttackRollOngoingFeatures(state, absentActorId, goblinId, [
        {
          kind: "attackRollTargetIsEnemy",
          attackerId: absentActorId,
          targetId: goblinId,
          targetIsEnemy: true,
        },
      ]),
    ).toBe(state);
    expect(
      extendSavingThrowOngoingFeatures(
        state,
        absentActorId,
        [goblinId],
        [
          {
            kind: "savingThrowTargetIsEnemy",
            actorId: absentActorId,
            targetId: goblinId,
            targetIsEnemy: true,
          },
        ],
      ),
    ).toBe(state);
  });

  test("once-per-turn Cleave and Horde Breaker records are idempotent", () => {
    const state = fighterVsGoblinBattle();
    const hordeBreakerProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-horde-breaker",
    );
    const cleaveRecorded = recordWeaponMasteryCleaveUsed(state, fighterId);
    const cleaveRecordedAgain = recordWeaponMasteryCleaveUsed(
      cleaveRecorded,
      fighterId,
    );
    const hordeBreakerRecorded = recordHuntersPreyHordeBreakerUsed(
      state,
      fighterId,
      hordeBreakerProcedureRef,
    );
    const hordeBreakerRecordedAgain = recordHuntersPreyHordeBreakerUsed(
      hordeBreakerRecorded,
      fighterId,
      hordeBreakerProcedureRef,
    );

    expect(cleaveRecordedAgain).toBe(cleaveRecorded);
    expect(
      cleaveRecordedAgain.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([fighterId]);
    expect(hordeBreakerRecordedAgain).toBe(hordeBreakerRecorded);
    expect(
      hordeBreakerRecordedAgain.currentTurnResources
        .huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([
      { attackerId: fighterId, procedureRef: hordeBreakerProcedureRef },
    ]);
  });

  test("additional-attack damage holes retain an admitted damage-die floor choice", () => {
    const attack = testGreataxeAttack();
    const damageDieFloorProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-damage-die-floor-choice",
    );
    const attackRoll = { total: 18, naturalD20: DieRollResult(15) } as const;

    expect(
      weaponMasteryCleaveDamageHole(attack, false, attackRoll, [
        damageDieFloorProcedureRef,
      ]),
    ).toMatchObject({
      label: "Cleave damage (1d12+3-slashing)",
      attackDamageDieFloorChoiceProcedureRefs: [damageDieFloorProcedureRef],
    });
    expect(
      huntersPreyHordeBreakerDamageHole(
        attack,
        false,
        attackRoll,
        [],
        [],
        [],
        0,
        [damageDieFloorProcedureRef],
      ),
    ).toMatchObject({
      label: "Horde Breaker damage (1d12+3-slashing)",
      attackDamageDieFloorChoiceProcedureRefs: [damageDieFloorProcedureRef],
    });
  });

  test("ability-specific attack effects recognize an Unarmed Strike's attack ability", () => {
    const state = battleStateWithSyntheticWeakeningEndTurnSave(
      fighterVsGoblinBattle(),
      fighterId,
      goblinId,
    );
    const goblin = state.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected the weakened target.");
    }
    expect(
      activeEffectGrantsAttackRollMode(
        state,
        goblin,
        state.combatants.get(fighterId),
        "disadvantage",
        { attack: testUnarmedStrikeDamageAttack() },
      ),
    ).toBe(true);
  });
});
