// -*- mode: Bluespec; -*-

module battleRuntimeRageLifecycleTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"


  run test_rage_ongoing_feature_spends_bonus_action_applies_damage_and_resistance = {
    val raging = startRage(initialState, 2)
    val hit = resolveAttack({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val levelNineHit = resolveAttackAtBarbarianLevel({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true, 9)
    val goblinTurn = endTurn(raging.state)
    val resisted = resolveGoblinAttack(goblinTurn, 15, 10, 4, true)
    all {
      assert(raging.usesRemaining == 1),
      assert(not(raging.state.bonusActionAvailable)),
      assert(fighterHasRage(raging.state)),
      assert(hit.goblin.hp == 1),
      assert(levelNineHit.goblin.hp == 0),
      assert(resisted.fighter.hp == 9),
    }
  }

  run test_rage_heavy_armor_and_incapacitated_end = {
    val armored = { ...initialState, fighter: { ...initialState.fighter, wearingHeavyArmor: true } }
    val cannotStart = startRage(armored, 2)
    val raging = startRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    all {
      assert(not(fighterHasRage(cannotStart.state))),
      assert(not(fighterHasRage(endTurn(incapacitated)))),
    }
  }

  run test_rage_bonus_action_extension_preserves_uses = {
    val raging = startRage(initialState, 2)
    val nextFighterTurn = endTurn(endTurn(raging.state))
    val extended = extendRageWithBonusAction(nextFighterTurn, raging.usesRemaining)
    all {
      assert(fighterHasRage(extended.state)),
      assert(not(extended.state.bonusActionAvailable)),
      assert(extended.usesRemaining == 1),
    }
  }

  run test_persistent_rage_survives_incapacitated_but_not_unconscious = {
    val raging = startPersistentRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    val unconscious = { ...raging, fighter: { ...raging.fighter, unconscious: true } }
    all {
      assert(fighterHasRage(endTurn(incapacitated))),
      assert(not(fighterHasRage(endTurn(unconscious)))),
    }
  }

  run test_rage_extends_when_grapple_forces_enemy_save = {
    val raging = startRage(initialState, 2).state
    val nextFighterTurn = endTurn(endTurn(raging))
    val unchangedForNonEnemyAttack = extendRageWithAttackRoll(nextFighterTurn, false)
    val unchangedForNonEnemySave = extendRageWithEnemySavingThrow(nextFighterTurn, false)
    val grappled = grappleFighterGoblin(nextFighterTurn, 12)
    val extendedToNextTurn = match fighterRageOccurrence(grappled) {
      | ActiveRoundExtendedOngoingFeature(data) =>
          data.expiresAtEndOfFighterTurnRound == nextFighterTurn.initiative.round + 1
      | _ => false
    }
    all {
      assert(fighterHasRage(grappled)),
      assert(extendedToNextTurn),
      assert(fighterRageOccurrence(unchangedForNonEnemyAttack) == fighterRageOccurrence(nextFighterTurn)),
      assert(fighterRageOccurrence(unchangedForNonEnemySave) == fighterRageOccurrence(nextFighterTurn)),
    }
  }

  run test_normal_rage_ends_when_drop_to_zero_sets_unconscious = {
    val raging = startRage(initialState, 2).state
    val dropped = { ...raging, fighter: applyDropToZeroHp(raging.fighter) }
    assert(not(fighterHasRage(endTurn(dropped))))
  }
}
