// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-spell-created-held-object

module battleRuntimeFlameBladeLifecycleTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeLightSpellLifecycle.* from "./battle-runtime-light-spell-lifecycle"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_flame_blade_creation_spends_slot_bonus_action_and_projects_held_light = {
    val noFreeHandState = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        leftHandUse: HShield,
        rightHandUse: HMainWeapon,
      },
    }
    val noFreeHand = resolveFlameBlade(noFreeHandState, 2, 3)
    val tooLow = resolveFlameBlade(initialState, 1, 3)
    val result = resolveFlameBlade(initialState, 2, 3)
    all {
      assert(noFreeHand == noFreeHandState),
      assert(tooLow == initialState),
      assert(not(result.bonusActionAvailable)),
      assert(result.actionAvailable),
      assert(result.fighter.concentrating),
      assert(result.fighter.leftHandUse == HSpellCreatedHeldObject),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.activeEffects.contains(flameBladeActiveEffect(2, 3, FlameBladeHeldObject))),
      assert(flameBladeBrightLightRadiusFeet == 10),
      assert(flameBladeDimLightAdditionalFeet == 10),
      assert(flameBladeDamageDice(2) == 3),
      assert(flameBladeDamageDice(5) == 6),
      assert(flameBladeDamage(6, 3) == 9),
      assert(battleRuntimeLightEmitters(result).contains(flameBladeHeldLightEmitter)),
      assert(spellInvocationSpendsSpellSlot(FlameBlade)),
    }
  }

  run test_flame_blade_release_and_re_evoke_use_same_occurrence_without_slot = {
    val blade = resolveFlameBlade(initialState, 3, 3)
    val released = releaseFlameBlade(blade)
    val nextTurn = endTurn(endTurn(released))
    val noFreeHandState = {
      ...nextTurn,
      fighter: {
        ...nextTurn.fighter,
        leftHandUse: HShield,
        rightHandUse: HMainWeapon,
      },
    }
    val blocked = reEvokeFlameBlade(noFreeHandState)
    val reEvoked = reEvokeFlameBlade(nextTurn)
    all {
      assert(activeEffectsContainReleasedFlameBlade(released.fighter.activeEffects)),
      assert(released.fighter.leftHandUse == HFree),
      assert(not(battleRuntimeLightEmitters(released).contains(flameBladeHeldLightEmitter))),
      assert(blocked == noFreeHandState),
      assert(activeEffectsContainHeldFlameBlade(reEvoked.fighter.activeEffects)),
      assert(reEvoked.fighter.leftHandUse == HSpellCreatedHeldObject),
      assert(not(reEvoked.bonusActionAvailable)),
      assert(not(battleActorHasSpellSlotUse(reEvoked, Fighter))),
      assert(battleRuntimeLightEmitters(reEvoked).contains(flameBladeHeldLightEmitter)),
    }
  }

  run test_flame_blade_concentration_and_duration_cleanup_remove_blade = {
    val blade = resolveFlameBlade(initialState, 2, 3)
    val broken = breakConcentrationSpellEffects(blade, Fighter)
    val nearlyExpired = {
      ...blade,
      fighter: {
        ...blade.fighter,
        activeEffects: Set(FlameBladeEffect({
          durationTicks: 1,
          slotLevel: 2,
          spellcastingAbilityModifier: 3,
          objectState: FlameBladeHeldObject,
        })),
      },
    }
    val nextRound = endTurn(endTurn(nearlyExpired))
    all {
      assert(not(activeEffectsContainHeldFlameBlade(broken.fighter.activeEffects))),
      assert(broken.fighter.leftHandUse == HFree),
      assert(not(battleRuntimeLightEmitters(broken).contains(flameBladeHeldLightEmitter))),
      assert(not(activeEffectsContainHeldFlameBlade(nextRound.fighter.activeEffects))),
      assert(nextRound.fighter.leftHandUse == HFree),
      assert(not(nextRound.fighter.concentrating)),
      assert(not(battleRuntimeLightEmitters(nextRound).contains(flameBladeHeldLightEmitter))),
    }
  }

}
