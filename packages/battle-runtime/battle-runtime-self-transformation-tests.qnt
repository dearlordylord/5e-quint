// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-self-transformation-mode

module battleRuntimeSelfTransformationTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeSelfTransformation.* from "./battle-runtime-self-transformation"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"

  run test_alter_self_aquatic_adaptation_projects_water_breathing_and_swim_speed = {
    val result = resolveAlterSelfSelfTransformationMode(initialState, AquaticAdaptationMode, 2)
    all {
      assert(not(result.actionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(result.fighter.concentrating),
      assert(activeEffectsContainSelfTransformationMode(result.fighter.activeEffects, Fighter, AquaticAdaptationMode)),
      assert(combatantCanBreatheUnderwater(result.fighter, Fighter)),
      assert(movementSpeed(result.fighter, SwimSpeedKind) == movementSpeed(result.fighter, WalkSpeedKind)),
      assert(movementSpeed(result.fighter, SwimSpeedKind) == 30),
    }
  }

  run test_alter_self_change_appearance_has_no_statistic_projection = {
    val result = resolveAlterSelfSelfTransformationMode(initialState, ChangeAppearanceMode, 2)
    all {
      assert(result.fighter.concentrating),
      assert(activeEffectsContainSelfTransformationMode(result.fighter.activeEffects, Fighter, ChangeAppearanceMode)),
      assert(not(combatantCanBreatheUnderwater(result.fighter, Fighter))),
      assert(movementSpeed(result.fighter, WalkSpeedKind) == 30),
      assert(movementSpeed(result.fighter, SwimSpeedKind) == 0),
    }
  }

  run test_alter_self_natural_weapons_projects_unarmed_strike_replacement = {
    val naturalWeapons = alterSelfNaturalWeaponsMode(Slashing, 3, 2)
    val result = resolveAlterSelfSelfTransformationMode(initialState, naturalWeapons, 2)
    all {
      assert(result.fighter.concentrating),
      assert(activeEffectsContainSelfTransformationMode(result.fighter.activeEffects, Fighter, naturalWeapons)),
      assert(not(combatantCanBreatheUnderwater(result.fighter, Fighter))),
      assert(selfTransformationModeIsNaturalWeapons(naturalWeapons)),
      assert(naturalWeaponsUnarmedStrikeDamageDieSize(naturalWeapons) == 6),
      assert(naturalWeaponsUnarmedStrikeDamageType(naturalWeapons) == Slashing),
      assert(naturalWeaponsUnarmedStrikeAttackBonus(naturalWeapons) == 5),
      assert(naturalWeaponsUnarmedStrikeDamage(naturalWeapons, 4) == 7),
    }
  }

  run test_alter_self_magic_action_replaces_mode_without_spell_slot_spend_or_duration_reset = {
    val cast = resolveAlterSelfSelfTransformationMode(initialState, AquaticAdaptationMode, 2)
    val readyToReplace = { ...cast, actionAvailable: true, spellSlotUsesThisTurn: Set() }
    val replaced = replaceAlterSelfSelfTransformationMode(readyToReplace, ChangeAppearanceMode)
    all {
      assert(not(replaced.actionAvailable)),
      assert(replaced.spellSlotUsesThisTurn == Set()),
      assert(not(activeEffectsContainSelfTransformationMode(replaced.fighter.activeEffects, Fighter, AquaticAdaptationMode))),
      assert(activeEffectsContainSelfTransformationMode(replaced.fighter.activeEffects, Fighter, ChangeAppearanceMode)),
      assert(activeEffectsSelfTransformationModeDurationTicks(replaced.fighter.activeEffects, Fighter) == alterSelfDurationTicks),
      assert(not(combatantCanBreatheUnderwater(replaced.fighter, Fighter))),
      assert(movementSpeed(replaced.fighter, SwimSpeedKind) == 0),
    }
  }

  run test_alter_self_magic_action_replaces_aquatic_mode_with_natural_weapons = {
    val naturalWeapons = alterSelfNaturalWeaponsMode(Piercing, 3, 2)
    val cast = resolveAlterSelfSelfTransformationMode(initialState, AquaticAdaptationMode, 2)
    val readyToReplace = { ...cast, actionAvailable: true, spellSlotUsesThisTurn: Set() }
    val replaced = replaceAlterSelfSelfTransformationMode(readyToReplace, naturalWeapons)
    all {
      assert(not(replaced.actionAvailable)),
      assert(replaced.spellSlotUsesThisTurn == Set()),
      assert(not(activeEffectsContainSelfTransformationMode(replaced.fighter.activeEffects, Fighter, AquaticAdaptationMode))),
      assert(activeEffectsContainSelfTransformationMode(replaced.fighter.activeEffects, Fighter, naturalWeapons)),
      assert(activeEffectsSelfTransformationModeDurationTicks(replaced.fighter.activeEffects, Fighter) == alterSelfDurationTicks),
      assert(not(combatantCanBreatheUnderwater(replaced.fighter, Fighter))),
      assert(naturalWeaponsUnarmedStrikeDamageType(naturalWeapons) == Piercing),
    }
  }

  run test_alter_self_magic_action_does_not_replace_natural_weapons_with_same_option = {
    val slashingWeapons = alterSelfNaturalWeaponsMode(Slashing, 3, 2)
    val piercingWeapons = alterSelfNaturalWeaponsMode(Piercing, 3, 2)
    val cast = resolveAlterSelfSelfTransformationMode(initialState, slashingWeapons, 2)
    val readyToReplace = { ...cast, actionAvailable: true, spellSlotUsesThisTurn: Set() }
    val replaced = replaceAlterSelfSelfTransformationMode(readyToReplace, piercingWeapons)
    all {
      assert(replaced == readyToReplace),
      assert(activeEffectsContainSelfTransformationMode(replaced.fighter.activeEffects, Fighter, slashingWeapons)),
      assert(not(activeEffectsContainSelfTransformationMode(replaced.fighter.activeEffects, Fighter, piercingWeapons))),
    }
  }

  run test_alter_self_concentration_and_duration_cleanup_remove_active_mode_projection = {
    val naturalWeapons = alterSelfNaturalWeaponsMode(Slashing, 3, 2)
    val cast = resolveAlterSelfSelfTransformationMode(initialState, naturalWeapons, 2)
    val broken = breakConcentrationSpellEffects(cast, Fighter)
    val expiredEffects = tickDurationActiveEffects(Set(selfTransformationModeActiveEffect(Fighter, naturalWeapons, 1)))
    all {
      assert(not(broken.fighter.concentrating)),
      assert(not(activeEffectsContainSelfTransformationModeFrom(broken.fighter.activeEffects, Fighter))),
      assert(not(combatantCanBreatheUnderwater(broken.fighter, Fighter))),
      assert(movementSpeed(broken.fighter, SwimSpeedKind) == 0),
      assert(expiredEffects == Set()),
    }
  }
}
