// -*- mode: Bluespec; -*-

module battleRuntimeMirrorImageAttackTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCombatHoles.* from "./battle-runtime-combat-holes"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"


  run test_mirror_image_duplicate_roll_hole_precedes_attack_damage_hole = {
    val mirroredGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val replay = AttackRollFilled({ attackTotal: 20, naturalD20: 18 })
    all {
      assert(combatAttackReplayHoles(mirroredGoblin, replay) == Set(MirrorImageDuplicateRoll)),
      assert(mirrorImageAttackRollHitReplayHoles(
        initialState.fighter.activeEffects,
        mirroredGoblin.goblin.activeEffects,
        false,
        true,
        3,
        false,
        DamageRoll,
      ) == Set()),
      assert(mirrorImageAttackRollHitReplayHoles(
        initialState.fighter.activeEffects,
        mirroredGoblin.goblin.activeEffects,
        false,
        true,
        2,
        false,
        DamageRoll,
      ) == Set(DamageRoll)),
    }
  }

  run test_mirror_image_intercepts_goblin_weapon_attack_hit = {
    val mirroredFighter = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val redirected = resolveGoblinAttackWithMirrorImageDuplicateRoll(mirroredFighter, 20, 18, 5, false, 3, false)
    val failedRoll = resolveGoblinAttackWithMirrorImageDuplicateRoll(mirroredFighter, 20, 18, 5, false, 2, false)
    all {
      assert(redirected.fighter.hp == 12),
      assert(activeEffectsMirrorImageRemainingDuplicates(redirected.fighter.activeEffects) == 2),
      assert(redirected.actionAvailable == false),
      assert(failedRoll.fighter.hp == 5),
      assert(activeEffectsMirrorImageRemainingDuplicates(failedRoll.fighter.activeEffects) == 3),
    }
  }

  run test_mirror_image_weapon_attack_bypasses_for_blinded_or_special_sense_attacker = {
    val mirroredFighter = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val blindedGoblin = {
      ...mirroredFighter,
      goblin: { ...mirroredFighter.goblin, activeEffects: Set(ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })) },
    }
    val blindedBypass = resolveGoblinAttackWithMirrorImageDuplicateRoll(blindedGoblin, 20, 18, 5, false, 3, false)
    val sightBypass = resolveGoblinAttackWithMirrorImageDuplicateRoll(mirroredFighter, 20, 18, 5, false, 3, true)
    all {
      assert(blindedBypass.fighter.hp == 5),
      assert(activeEffectsMirrorImageRemainingDuplicates(blindedBypass.fighter.activeEffects) == 3),
      assert(sightBypass.fighter.hp == 5),
      assert(activeEffectsMirrorImageRemainingDuplicates(sightBypass.fighter.activeEffects) == 3),
    }
  }

  run test_mirror_image_intercepts_fighter_weapon_attack_hit = {
    val mirroredGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val redirected = resolveAttackAtBarbarianLevelWithToppleChoiceAndMirrorImageDuplicateRoll(
      mirroredGoblin,
      20,
      18,
      fighterWeaponAttackDamageRoll(5),
      true,
      1,
      OrdinaryDamage,
      false,
      true,
      3,
      false,
    )
    all {
      assert(redirected.goblin.hp == 10),
      assert(activeEffectsMirrorImageRemainingDuplicates(redirected.goblin.activeEffects) == 2),
      assert(redirected.actionAvailable == false),
    }
  }
}
