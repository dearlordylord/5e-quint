// -*- mode: Bluespec; -*-

module dndTest {
  import dnd.* from "./dnd"

  // ============================================================
  // Ability Modifier tests
  // ============================================================

  run test_abilityModifier_10_is_0 = assert(abilityModifier(10) == 0)
  run test_abilityModifier_11_is_0 = assert(abilityModifier(11) == 0)
  run test_abilityModifier_1_is_neg5 = assert(abilityModifier(1) == -5)
  run test_abilityModifier_30_is_10 = assert(abilityModifier(30) == 10)
  run test_abilityModifier_9_is_neg1 = assert(abilityModifier(9) == -1)
  run test_abilityModifier_8_is_neg1 = assert(abilityModifier(8) == -1)
  run test_abilityModifier_7_is_neg2 = assert(abilityModifier(7) == -2)
  run test_abilityModifier_20_is_5 = assert(abilityModifier(20) == 5)

  // ============================================================
  // Proficiency Bonus tests
  // ============================================================

  run test_profBonus_level1 = assert(proficiencyBonus(1) == 2)
  run test_profBonus_level4 = assert(proficiencyBonus(4) == 2)
  run test_profBonus_level5 = assert(proficiencyBonus(5) == 3)
  run test_profBonus_level9 = assert(proficiencyBonus(9) == 4)
  run test_profBonus_level17 = assert(proficiencyBonus(17) == 6)
  run test_profBonus_level20 = assert(proficiencyBonus(20) == 6)

  // ============================================================
  // Prof Multiplier tests
  // ============================================================

  run test_profMult_none = assert(profMultiplier(NoneProf, 3) == 0)
  run test_profMult_half = assert(profMultiplier(HalfProf, 4) == 2)
  run test_profMult_prof = assert(profMultiplier(Proficient, 3) == 3)
  run test_profMult_expertise = assert(profMultiplier(Expertise, 3) == 6)

  // ============================================================
  // Passive Check tests
  // ============================================================

  run test_passive_basic = assert(passiveCheck(2, Proficient, 3, false, false) == 15)
  run test_passive_adv = assert(passiveCheck(0, NoneProf, 2, true, false) == 15)
  run test_passive_disadv = assert(passiveCheck(0, NoneProf, 2, false, true) == 5)
  run test_passive_adv_disadv_cancel = assert(passiveCheck(0, NoneProf, 2, true, true) == 10)

  // ============================================================
  // Advantage/Disadvantage resolution
  // ============================================================

  run test_adv_disadv_cancel = {
    val r = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    all { assert(r.hasAdvantage == false), assert(r.hasDisadvantage == false) }
  }

  run test_adv_only = {
    val r = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    all { assert(r.hasAdvantage == true), assert(r.hasDisadvantage == false) }
  }

  // ============================================================
  // Check/Save resolution
  // ============================================================

  run test_check_pass = assert(checkSucceeds(12, 2, Proficient, 3, 0, 15) == true)
  run test_check_fail = assert(checkSucceeds(5, 0, NoneProf, 2, 0, 15) == false)
  run test_check_exact = assert(checkSucceeds(10, 2, Proficient, 3, 0, 15) == true)

  run test_save_pass = assert(saveSucceeds(14, 3, true, 2, 0, 15) == true)
  run test_save_fail = assert(saveSucceeds(5, -1, false, 2, 0, 15) == false)

  // ============================================================
  // Contest
  // ============================================================

  run test_contest_a_wins = assert(contestWinner(15, 12) == AWins)
  run test_contest_b_wins = assert(contestWinner(10, 14) == BWins)
  run test_contest_tie = assert(contestWinner(12, 12) == Tie)

  // ============================================================
  // Group Check
  // ============================================================

  run test_group_pass = assert(groupCheckSucceeds(3, 5) == true)
  run test_group_fail = assert(groupCheckSucceeds(2, 5) == false)
  run test_group_half = assert(groupCheckSucceeds(2, 4) == true)

  // ============================================================
  // Attack Resolution
  // ============================================================

  run test_attack_nat20 = {
    val r = resolveAttackRoll(20, -5, 30, 0)
    all { assert(r.hits == true), assert(r.isCritical == true) }
  }

  run test_attack_nat1 = {
    val r = resolveAttackRoll(1, 20, 5, 0)
    all { assert(r.hits == false), assert(r.isCritical == false) }
  }

  run test_attack_normal_hit = {
    val r = resolveAttackRoll(15, 5, 18, 0)
    all { assert(r.hits == true), assert(r.isCritical == false) }
  }

  run test_attack_hit_exact_with_cover = {
    val r = resolveAttackRoll(13, 5, 16, 2)
    // 13 + 5 = 18, AC 16 + 2 = 18, hits (>=)
    all { assert(r.hits == true), assert(r.isCritical == false) }
  }

  // ============================================================
  // Cover
  // ============================================================

  run test_cover_none = assert(coverBonus(NoCover) == 0)
  run test_cover_half = assert(coverBonus(HalfCover) == 2)
  run test_cover_three_quarters = assert(coverBonus(ThreeQuartersCover) == 5)
  run test_total_cover_no_target = assert(canBeTargeted(TotalCover) == false)

  // ============================================================
  // Damage Modifiers
  // ============================================================

  run test_damage_immune = {
    val dmg = applyDamageModifiers(20, Fire, Set(Fire), Set(), Set())
    assert(dmg == 0)
  }

  run test_damage_resist = {
    val dmg = applyDamageModifiers(7, Slashing, Set(), Set(Slashing), Set())
    assert(dmg == 3) // floor(7/2)
  }

  run test_damage_vulnerable = {
    val dmg = applyDamageModifiers(10, Radiant, Set(), Set(), Set(Radiant))
    assert(dmg == 20)
  }

  // Resistance then vulnerability: halve 7 = 3, double 3 = 6
  run test_damage_resist_then_vulnerable = {
    val dmg = applyDamageModifiers(7, Fire, Set(), Set(Fire), Set(Fire))
    assert(dmg == 6)
  }

  run test_damage_immune_trumps = {
    val dmg = applyDamageModifiers(20, Cold, Set(Cold), Set(Cold), Set(Cold))
    assert(dmg == 0)
  }

  // ============================================================
  // AC Calculation
  // ============================================================

  run test_ac_no_armor = {
    val ac = calculateAC(Unarmored, 2, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 12) // 10 + 2 DEX
  }

  run test_ac_leather = {
    val ac = calculateAC(WearingArmor(LEATHER), 3, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 14) // 11 + 3 DEX
  }

  run test_ac_chain_shirt = {
    val ac = calculateAC(WearingArmor(CHAIN_SHIRT), 4, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 15) // 13 + 2 (DEX capped)
  }

  run test_ac_medium_negative_dex = {
    val ac = calculateAC(WearingArmor(CHAIN_SHIRT), -2, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 11) // 13 + (-2), no cap on negatives
  }

  run test_ac_plate = {
    val ac = calculateAC(WearingArmor(PLATE), 5, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 18) // 18, no DEX
  }

  run test_ac_shield = {
    val ac = calculateAC(WearingArmor(PLATE), 0, true, NoUnarmoredDefense, 0, 0)
    assert(ac == 20) // 18 + 2
  }

  run test_ac_barbarian_unarmored = {
    val ac = calculateAC(Unarmored, 3, false, BarbarianUD, 2, 0)
    assert(ac == 15) // 10 + 3 DEX + 2 CON
  }

  run test_ac_monk_unarmored = {
    val ac = calculateAC(Unarmored, 3, false, MonkUD, 0, 2)
    assert(ac == 15) // 10 + 3 DEX + 2 WIS
  }

  run test_ac_barbarian_unarmored_shield = {
    val ac = calculateAC(Unarmored, 2, true, BarbarianUD, 3, 0)
    assert(ac == 17) // 10 + 2 DEX + 3 CON + 2 shield
  }

  // ============================================================
  // Armor Speed Penalty
  // ============================================================

  run test_armor_speed_no_penalty = {
    assert(armorSpeedPenalty(WearingArmor(CHAIN_MAIL), 13) == 0) // meets STR 13
  }

  run test_armor_speed_penalty = {
    assert(armorSpeedPenalty(WearingArmor(CHAIN_MAIL), 12) == 10) // STR 12 < 13
  }

  run test_armor_speed_no_req = {
    assert(armorSpeedPenalty(WearingArmor(RING_MAIL), 8) == 0) // no STR req
  }

  run test_armor_speed_unarmored = {
    assert(armorSpeedPenalty(Unarmored, 5) == 0)
  }

  // ============================================================
  // Armor Proficiency
  // ============================================================

  run test_armor_prof_has = assert(lacksArmorProficiency(WearingArmor(PLATE), Set(HeavyArmor)) == false)
  run test_armor_prof_lacks = assert(lacksArmorProficiency(WearingArmor(PLATE), Set(LightArmor)) == true)
  run test_armor_prof_unarmored = assert(lacksArmorProficiency(Unarmored, Set()) == false)

  // ============================================================
  // Weapon helpers
  // ============================================================

  run test_unarmed_positive = assert(unarmedDamage(3) == 4)
  run test_unarmed_negative = assert(unarmedDamage(-2) == 0)

  pure val RAPIER: Weapon = {
    name: "Rapier", damageDie: 8, versatileDie: 0, damageType: Piercing,
    properties: Set(Finesse), normalRange: 0, longRange: 0,
  }

  pure val LONGBOW: Weapon = {
    name: "Longbow", damageDie: 8, versatileDie: 0, damageType: Piercing,
    properties: Set(Ammunition, Heavy, TwoHanded), normalRange: 150, longRange: 600,
  }

  pure val GREATSWORD: Weapon = {
    name: "Greatsword", damageDie: 12, versatileDie: 0, damageType: Slashing,
    properties: Set(Heavy, TwoHanded), normalRange: 0, longRange: 0,
  }

  run test_finesse_picks_higher = {
    // DEX 4 > STR 2 -> uses DEX
    assert(weaponAttackAbility(RAPIER, 2, 4) == 4)
  }

  run test_ranged_uses_dex = {
    assert(weaponAttackAbility(LONGBOW, 3, 1) == 1)
  }

  run test_heavy_small_disadv = {
    assert(heavyWeaponDisadvantage(GREATSWORD, Small) == true)
  }

  run test_heavy_tiny_disadv = {
    assert(heavyWeaponDisadvantage(GREATSWORD, Tiny) == true)
  }

  run test_heavy_medium_no_disadv = {
    assert(heavyWeaponDisadvantage(GREATSWORD, Medium) == false)
  }

  // ============================================================
  // Carrying Capacity
  // ============================================================

  run test_carry_medium = assert(carryingCapacity(15, Medium) == 225)
  run test_carry_tiny = assert(carryingCapacity(10, Tiny) == 75)
  run test_carry_large = assert(carryingCapacity(10, Large) == 300)
  run test_push_drag = assert(pushDragLift(15, Medium) == 450)

  // ============================================================
  // Donning / Doffing
  // ============================================================

  run test_don_heavy = assert(donTime(HeavyArmor) == 10)
  run test_doff_heavy = assert(doffTime(HeavyArmor, false) == 5)
  run test_doff_heavy_help = assert(doffTime(HeavyArmor, true) == 2)

  // ============================================================
  // Skill -> Ability mapping
  // ============================================================

  run test_skill_athletics = assert(skillAbility(Athletics) == Str)
  run test_skill_stealth = assert(skillAbility(Stealth) == Dex)
  run test_skill_arcana = assert(skillAbility(Arcana) == Int_)
  run test_skill_perception = assert(skillAbility(Perception) == Wis)
  run test_skill_persuasion = assert(skillAbility(Persuasion) == Cha)

  // ============================================================
  // Spell Save DC & Attack Bonus
  // ============================================================

  pure val TEST_WIZARD: CharConfig = {
    abilityScores: Map(Str -> 8, Dex -> 14, Con -> 12, Int_ -> 18, Wis -> 10, Cha -> 10),
    level: 5,
    size: Medium,
    speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
    saveProficiencies: Set(Int_, Wis),
    skillProficiencies: Set(Arcana, Investigation),
    expertiseSkills: Set(),
    armorProficiencies: Set(),
    hitDieType: 6,
    spellcastingAbility: Int_,
    hasSpellcasting: true,
    canRitualCast: true,
    unarmoredDefense: NoUnarmoredDefense,
    features: Set(),
  }

  // Spell save DC = 8 + INT mod(4) + prof(3) = 15
  run test_spell_save_dc = assert(spellSaveDC(TEST_WIZARD) == 15)

  // Spell attack bonus = INT mod(4) + prof(3) = 7
  run test_spell_attack_bonus = assert(spellAttackBonus(TEST_WIZARD) == 7)

  // ============================================================
  // Critical/Normal damage
  // ============================================================

  run test_normal_damage = assert(normalDamage(6, 3) == 9)
  run test_critical_damage = assert(criticalDamage(6, 5, 3) == 14)
}
