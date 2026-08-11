// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-magic-weapon-enhancement spell.invocation-weapon-damage-rider

module battleRuntimeWeaponEnhancementTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  run test_divine_favor_adds_radiant_damage_to_fighter_weapon_hits = {
    val favored = resolveDivineFavor(initialState)
    val hit = resolveAttack(favored, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(favored.fighter.activeEffects.contains(DivineFavorWeaponDamageRider({ durationTicks: favorWeaponDamageRiderDurationTicks }))),
      assert(not(favored.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(favored, Fighter)),
      assert(hit.goblin.hp == 0),
    }
  }
  run test_divine_favor_weapon_damage_rider_expires_after_one_minute = {
    val favored = resolveDivineFavor(initialState)
    val round1 = endTurn(endTurn(favored))
    val round2 = endTurn(endTurn(round1))
    val round3 = endTurn(endTurn(round2))
    val round4 = endTurn(endTurn(round3))
    val round5 = endTurn(endTurn(round4))
    val round6 = endTurn(endTurn(round5))
    val round7 = endTurn(endTurn(round6))
    val round8 = endTurn(endTurn(round7))
    val round9 = endTurn(endTurn(round8))
    val round10 = endTurn(endTurn(round9))
    val hit = resolveAttack(round10, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(activeEffectsContainDivineFavor(round9.fighter.activeEffects)),
      assert(not(activeEffectsContainDivineFavor(round10.fighter.activeEffects))),
      assert(hit.goblin.hp == 3),
    }
  }
  run test_magic_weapon_spends_bonus_action_slot_and_projects_exact_item_bonus = {
    val cast = resolveMagicWeapon(initialState, Fighter, FighterPrimaryWeapon, true, 6)
    all {
      assert(cast.fighter.activeEffects.contains(MagicWeaponEnhancement({
        source: Fighter,
        target: Fighter,
        weaponItem: FighterPrimaryWeapon,
        bonus: 3,
        durationTicks: magicWeaponDurationTicks,
      }))),
      assert(not(cast.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(cast, Fighter)),
      assert(battleStateMagicWeaponItemIsMagic(cast, Fighter, FighterPrimaryWeapon)),
      assert(not(battleStateMagicWeaponItemIsMagic(cast, Fighter, FighterSecondaryWeapon))),
      assert(magicWeaponAttackBonus(cast, Fighter, FighterPrimaryWeapon) == 3),
      assert(magicWeaponDamageTotal(4, cast, Fighter, FighterPrimaryWeapon) == 7),
      assert(magicWeaponAttackBonus(cast, Fighter, FighterSecondaryWeapon) == 0),
      assert(magicWeaponDamageTotal(4, cast, Fighter, FighterSecondaryWeapon) == 4),
      assert(spellInvocationSpendsSpellSlot(MagicWeapon)),
    }
  }
  run test_magic_weapon_rejects_invalid_target_and_same_caster_recast_replaces_effect = {
    val nonWeapon = resolveMagicWeapon(initialState, Fighter, FighterPrimaryWeapon, false, 2)
    val otherSource = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(MagicWeaponEnhancement({
          source: Goblin,
          target: Fighter,
          weaponItem: FighterPrimaryWeapon,
          bonus: 1,
          durationTicks: magicWeaponDurationTicks,
        })),
      },
    }
    val rejected = resolveMagicWeapon(otherSource, Fighter, FighterPrimaryWeapon, true, 2)
    val prior = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(MagicWeaponEnhancement({
          source: Fighter,
          target: Fighter,
          weaponItem: FighterSecondaryWeapon,
          bonus: 1,
          durationTicks: 1,
        })),
      },
    }
    val recast = resolveMagicWeapon(prior, Fighter, FighterPrimaryWeapon, true, 3)
    all {
      assert(nonWeapon == initialState),
      assert(rejected == otherSource),
      assert(recast.fighter.activeEffects == Set(MagicWeaponEnhancement({
        source: Fighter,
        target: Fighter,
        weaponItem: FighterPrimaryWeapon,
        bonus: 2,
        durationTicks: magicWeaponDurationTicks,
      }))),
    }
  }
  run test_magic_weapon_duration_tick_expires_item_projection = {
    val expiring = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(MagicWeaponEnhancement({
          source: Fighter,
          target: Fighter,
          weaponItem: FighterPrimaryWeapon,
          bonus: 1,
          durationTicks: 1,
        })),
      },
    }
    val ticked = {
      ...expiring,
      fighter: {
        ...expiring.fighter,
        activeEffects: tickDurationActiveEffects(expiring.fighter.activeEffects),
      },
    }
    all {
      assert(not(battleStateMagicWeaponItemIsMagic(ticked, Fighter, FighterPrimaryWeapon))),
      assert(magicWeaponAttackBonus(ticked, Fighter, FighterPrimaryWeapon) == 0),
      assert(magicWeaponDamageTotal(4, ticked, Fighter, FighterPrimaryWeapon) == 4),
    }
  }
}
