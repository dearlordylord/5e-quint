// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-spell-hosted-weapon-attack

module battleRuntimeSpellHostedWeaponAttackTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  run test_true_strike_weapon_attack_uses_spellcasting_ability_and_cantrip_scaling = {
    val hit = resolveTrueStrikeWeaponAttack(
      { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } },
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
    all {
      assert(hit.goblin.hp == 0),
      assert(not(hit.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(hit, Fighter))),
      assert(spellInvocationSpendsSpellSlot(TrueStrike) == false),
      assert(trueStrikeWeaponAttackModifier(3, 3) == 6),
      assert(trueStrikeDamageAfterAdjustments(4, 5, 3, 5, Radiant) == 12),
    }
  }
  run test_true_strike_damage_choice_and_bonus_dice_are_level_gated = {
    all {
      assert(trueStrikeDamageTypeChoiceIsLegal(Radiant, Slashing)),
      assert(trueStrikeDamageTypeChoiceIsLegal(Slashing, Slashing)),
      assert(not(trueStrikeDamageTypeChoiceIsLegal(Fire, Slashing))),
      assert(trueStrikeBonusDamageDice(1) == 0),
      assert(trueStrikeBonusDamageDice(5) == 1),
      assert(trueStrikeBonusDamageDice(11) == 2),
      assert(trueStrikeBonusDamageDice(17) == 3),
    }
  }
  run test_pact_blade_damage_choice_and_charisma_option_projection = {
    all {
      assert(pactBladeDamageTypeChoiceIsLegal(Slashing, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Necrotic, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Psychic, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Radiant, Slashing)),
      assert(not(pactBladeDamageTypeChoiceIsLegal(Fire, Slashing))),
      assert(pactBladeAbilityModifierChoiceIsLegal(4, 4, 3)),
      assert(pactBladeAbilityModifierChoiceIsLegal(3, 4, 3)),
      assert(not(pactBladeAbilityModifierChoiceIsLegal(2, 4, 3))),
      assert(pactBladeAttackModifier(3, 2) == 5),
      assert(pactBladeAttackModifier(4, 2) == 6),
    }
  }
}
