// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-shield

module battleRuntimeWeaponShieldReactionResolutionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeWeaponShieldReactionResolution.* from "./battle-runtime-weapon-shield-reaction-resolution"

  run test_weapon_shield_take_closes_and_replays_true_strike = {
    val awaiting = resolveTrueStrikeWeaponAttack(
      initialState,
      15,
      10,
      4,
      5,
      3,
      5,
      Radiant,
      Slashing,
      true,
    )
    val resolved = resolveWeaponShieldReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(resolved.goblin.hp == 10),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_weapon_shield_decline_closes_and_replays_true_strike = {
    val awaiting = resolveTrueStrikeWeaponAttack(
      initialState,
      15,
      10,
      4,
      5,
      3,
      5,
      Radiant,
      Slashing,
      true,
    )
    val resumed = declineWeaponShieldReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.goblin.reactionAvailable),
      assert(resumed.goblin.hp == 0),
      assert(not(resumed.actionAvailable)),
    }
  }

  run test_weapon_shield_rejects_non_weapon_continuation_without_spend = {
    val awaiting = openReactionWindow(initialState, {
      trigger: AttackHit,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    all {
      assert(resolveWeaponShieldReactionOffer(awaiting, Goblin) == awaiting),
      assert(declineWeaponShieldReactionOfferAndResume(awaiting, Goblin) == awaiting),
    }
  }
}
