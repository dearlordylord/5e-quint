// -*- mode: Bluespec; -*-

module battleRuntimeMovementBridgeExamples {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import movementSpatialGrapple.* from "../shared-algebras/proofs/rule-core/movement-spatial-grapple"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"

  run test_start_turn_resets_runtime_turn_resources = {
    val started = battleRuntimeStartTurn({
      currentActorOwnsTurn: true,
      actionAvailable: false,
      bonusActionAvailable: false,
      reactionAvailable: false,
      dashMovementBonus: 30,
      disengaged: true,
      dodging: true,
      hidden: true,
      helpAttackHeld: true,
      readiedMovementHeld: true,
      speedFeet: 30,
      movementSpentFeet: 25,
      prone: false,
      grappleEscapeDc: 0,
    })
    all {
      assert(started.actionAvailable),
      assert(started.bonusActionAvailable),
      assert(started.reactionAvailable),
      assert(started.dashMovementBonus == 0),
      assert(not(started.disengaged)),
      assert(not(started.dodging)),
      assert(started.hidden),
      assert(not(started.helpAttackHeld)),
      assert(not(started.readiedMovementHeld)),
      assert(started.movementSpentFeet == 0),
    }
  }

  run test_battle_runtime_bonus_action_dash_spends_bonus_action_not_action = {
    val dashed = battleRuntimeBonusActionDash({
      currentActorOwnsTurn: true,
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      dodging: false,
      hidden: false,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      speedFeet: 30,
      movementSpentFeet: 0,
      prone: false,
      grappleEscapeDc: 0,
    }, 30)
    all {
      assert(dashed.actionAvailable),
      assert(not(dashed.bonusActionAvailable)),
      assert(dashed.dashMovementBonus == 30),
    }
  }

  run test_battle_runtime_attack_and_magic_actions_spend_action = {
    val projection = {
      currentActorOwnsTurn: true,
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      dodging: false,
      hidden: false,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      speedFeet: 30,
      movementSpentFeet: 0,
      prone: false,
      grappleEscapeDc: 0,
    }
    all {
      assert(not(battleRuntimeSpendAttackAction(projection).actionAvailable)),
      assert(not(battleRuntimeSpendMagicAction(projection).actionAvailable)),
    }
  }

  run test_battle_runtime_bonus_action_spends_bonus_action_only = {
    val spent = battleRuntimeSpendBonusAction({
      currentActorOwnsTurn: true,
      actionAvailable: true,
      bonusActionAvailable: true,
      reactionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      dodging: false,
      hidden: false,
      helpAttackHeld: false,
      readiedMovementHeld: false,
      speedFeet: 30,
      movementSpentFeet: 0,
      prone: false,
      grappleEscapeDc: 0,
    })
    all {
      assert(spent.actionAvailable),
      assert(not(spent.bonusActionAvailable)),
    }
  }
}
