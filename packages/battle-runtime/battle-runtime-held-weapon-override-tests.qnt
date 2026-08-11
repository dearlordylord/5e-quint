// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-weapon-attack-override

module battleRuntimeHeldWeaponOverrideTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  run test_shillelagh_requires_held_club_or_quarterstaff_and_spends_bonus_action = {
    val club = resolveShillelagh(initialState, HeldClub, 3, 1)
    val quarterstaff = resolveShillelagh(initialState, HeldQuarterstaff, 3, 1)
    all {
      assert(club.fighter.activeEffects.contains(shillelaghEffect(ShillelaghClub, 3, 1))),
      assert(not(club.bonusActionAvailable)),
      assert(not(battleActorHasSpellSlotUse(club, Fighter))),
      assert(quarterstaff.fighter.activeEffects.contains(shillelaghEffect(ShillelaghQuarterstaff, 3, 1))),
      assert(resolveShillelagh(initialState, HeldOtherWeapon, 3, 1) == initialState),
      assert(resolveShillelagh(initialState, HeldNoWeapon, 3, 1) == initialState),
    }
  }
  run test_shillelagh_projects_spellcasting_attack_damage_type_choice_and_scaling = {
    all {
      assert(shillelaghAttackModifier(3, 2) == 5),
      assert(shillelaghDamageTypeChoiceIsLegal(Force, Bludgeoning)),
      assert(shillelaghDamageTypeChoiceIsLegal(Bludgeoning, Bludgeoning)),
      assert(not(shillelaghDamageTypeChoiceIsLegal(Fire, Bludgeoning))),
      assert(shillelaghDamageDice(1) == 1),
      assert(shillelaghDamageDieSize(1) == 8),
      assert(shillelaghDamageDice(5) == 1),
      assert(shillelaghDamageDieSize(5) == 10),
      assert(shillelaghDamageDice(11) == 1),
      assert(shillelaghDamageDieSize(11) == 12),
      assert(shillelaghDamageDice(17) == 2),
      assert(shillelaghDamageDieSize(17) == 6),
    }
  }
  run test_shillelagh_recast_replaces_prior_effect_and_lets_go_ends_projection = {
    val once = resolveShillelagh(initialState, HeldClub, 1, 1)
    val nextTurn = { ...once, bonusActionAvailable: true }
    val recast = resolveShillelagh(nextTurn, HeldQuarterstaff, 3, 17)
    val letGo = {
      ...recast,
      fighter: {
        ...recast.fighter,
        activeEffects: shillelaghEffectsMatchingHeldWeapon(recast.fighter.activeEffects, HeldNoWeapon),
      },
    }
    all {
      assert(recast.fighter.activeEffects == Set(shillelaghEffect(ShillelaghQuarterstaff, 3, 17))),
      assert(letGo.fighter.activeEffects == Set()),
    }
  }
}
