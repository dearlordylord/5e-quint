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
    properties: Set(Finesse), isMelee: true, normalRange: 0, longRange: 0,
  }

  pure val LONGBOW: Weapon = {
    name: "Longbow", damageDie: 8, versatileDie: 0, damageType: Piercing,
    properties: Set(Ammunition, Heavy, TwoHanded), isMelee: false, normalRange: 150, longRange: 600,
  }

  pure val GREATSWORD: Weapon = {
    name: "Greatsword", damageDie: 12, versatileDie: 0, damageType: Slashing,
    properties: Set(Heavy, TwoHanded), isMelee: true, normalRange: 0, longRange: 0,
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

  // ============================================================
  // Phase 2: Creature State Tests
  // ============================================================

  pure val FRESH20: CreatureState = freshCreature(20)
  pure val DYING20: CreatureState = pApplyCondition(freshCreature(20).with("hp", 0), CUnconscious)

  // -- Fresh creature --
  run test_fresh_creature = {
    val s = FRESH20
    all { assert(s.hp == 20), assert(s.maxHp == 20), assert(s.tempHp == 0),
          assert(not(s.dead)), assert(not(s.unconscious)) }
  }

  // -- effectiveMaxHp --
  run test_effective_max_hp_normal = assert(effectiveMaxHp(FRESH20) == 20)

  run test_effective_max_hp_exhaustion4 = {
    val s = FRESH20.with("exhaustion", 4)
    assert(effectiveMaxHp(s) == 20)
  }

  // -- isIncapacitated --
  run test_incapacitated_none = assert(not(isIncapacitated(FRESH20)))
  run test_incapacitated_from_paralyzed = assert(isIncapacitated(pApplyCondition(FRESH20, CParalyzed)))

  // ============================================================
  // Take Damage
  // ============================================================

  run test_take_damage_basic = {
    val s = pTakeDamage(FRESH20, 5, Slashing, Set(), Set(), Set(), false)
    assert(s.hp == 15)
  }

  run test_take_damage_temp_hp_partial = {
    val s = pTakeDamage(FRESH20.with("tempHp", 3), 5, Slashing, Set(), Set(), Set(), false)
    all { assert(s.hp == 18), assert(s.tempHp == 0) }
  }

  run test_take_damage_temp_hp_full = {
    val s = pTakeDamage(FRESH20.with("tempHp", 10), 5, Slashing, Set(), Set(), Set(), false)
    all { assert(s.hp == 20), assert(s.tempHp == 5) }
  }

  run test_take_damage_drops_to_0 = {
    val s = pTakeDamage(FRESH20, 20, Slashing, Set(), Set(), Set(), false)
    all { assert(s.hp == 0), assert(s.unconscious), assert(s.prone),
          assert(isIncapacitated(s)), assert(not(s.dead)) }
  }

  run test_take_damage_instant_death = {
    // 40 - 20 = 20 overflow >= 20 maxHp
    val s = pTakeDamage(FRESH20, 40, Slashing, Set(), Set(), Set(), false)
    assert(s.dead)
  }

  run test_take_damage_at_0hp_failure = {
    val s = pTakeDamage(DYING20, 5, Slashing, Set(), Set(), Set(), false)
    all { assert(s.deathSaves.failures == 1), assert(not(s.dead)) }
  }

  run test_take_damage_at_0hp_crit_2_failures = {
    val s = pTakeDamage(DYING20, 5, Slashing, Set(), Set(), Set(), true)
    all { assert(s.deathSaves.failures == 2), assert(not(s.dead)) }
  }

  run test_take_damage_at_0hp_instant_death = {
    val s = pTakeDamage(DYING20, 20, Slashing, Set(), Set(), Set(), false)
    assert(s.dead)
  }

  run test_take_damage_at_0hp_temp_absorbs = {
    val s = pTakeDamage(DYING20.with("tempHp", 10), 5, Slashing, Set(), Set(), Set(), false)
    all { assert(s.tempHp == 5), assert(s.deathSaves.failures == 0), assert(not(s.dead)) }
  }

  run test_take_damage_dead_noop = {
    val s = pTakeDamage(FRESH20.with("dead", true), 10, Slashing, Set(), Set(), Set(), false)
    assert(s.hp == 20)
  }

  run test_take_damage_petrified_resistance = {
    val s = pApplyCondition(FRESH20, CPetrified)
    val s2 = pTakeDamage(s, 10, Fire, Set(), Set(), Set(), false)
    assert(s2.hp == 15) // 10/2 = 5 damage
  }

  run test_take_damage_stable_becomes_unstable = {
    val s = pTakeDamage(DYING20.with("stable", true), 5, Slashing, Set(), Set(), Set(), false)
    all { assert(not(s.stable)), assert(s.deathSaves.failures == 1) }
  }

  // Resistance then vulnerability: 7/2=3, 3*2=6
  run test_take_damage_resist_vuln_sequential = {
    val s = pTakeDamage(FRESH20, 7, Slashing, Set(Slashing), Set(Slashing), Set(), false)
    assert(s.hp == 14) // 20 - 6
  }

  // Immune to damage at 0 HP: no death save failure
  run test_take_damage_at_0hp_immune = {
    val s = pTakeDamage(DYING20, 10, Fire, Set(), Set(), Set(Fire), false)
    all { assert(s.deathSaves.failures == 0), assert(not(s.dead)) }
  }

  // ============================================================
  // Heal
  // ============================================================

  run test_heal_basic = {
    val s = pHeal(FRESH20.with("hp", 10), 5)
    assert(s.hp == 15)
  }

  run test_heal_cap_at_max = {
    val s = pHeal(FRESH20.with("hp", 18), 5)
    assert(s.hp == 20)
  }

  run test_heal_not_capped_by_exhaustion4 = {
    val s = pAddExhaustion(FRESH20, 4).with("hp", 5) // maxHp 20, effective 20, hp 5
    val s2 = pHeal(s, 20) // heal 20, capped at 20
    assert(s2.hp == 20)
  }

  run test_heal_from_0_consciousness = {
    val s = pHeal(DYING20.with("deathSaves", { successes: 2, failures: 1 }), 5)
    all { assert(s.hp == 5), assert(not(s.unconscious)),
          assert(s.deathSaves.successes == 0), assert(s.deathSaves.failures == 0) }
  }

  run test_heal_dead_noop = {
    val s = pHeal(FRESH20.with("dead", true).with("hp", 0), 10)
    assert(s.hp == 0)
  }

  // ============================================================
  // Temp HP
  // ============================================================

  run test_temp_hp_new = assert(pGrantTempHp(FRESH20, 10, false).tempHp == 10)
  run test_temp_hp_keep_old = assert(pGrantTempHp(FRESH20.with("tempHp", 8), 12, true).tempHp == 8)

  run test_temp_hp_no_consciousness = {
    val s = pGrantTempHp(DYING20, 10, false)
    all { assert(s.tempHp == 10), assert(s.hp == 0), assert(s.unconscious) }
  }

  // ============================================================
  // Death Saves
  // ============================================================

  run test_death_save_success = {
    val s = pDeathSave(DYING20, 12)
    all { assert(s.deathSaves.successes == 1), assert(s.deathSaves.failures == 0) }
  }

  // Boundary: exactly 10 is a success
  run test_death_save_exactly_10 = {
    val s = pDeathSave(DYING20, 10)
    all { assert(s.deathSaves.successes == 1), assert(s.deathSaves.failures == 0) }
  }

  run test_death_save_failure = {
    val s = pDeathSave(DYING20, 5)
    all { assert(s.deathSaves.successes == 0), assert(s.deathSaves.failures == 1) }
  }

  run test_death_save_third_success_stable = {
    val s = DYING20.with("deathSaves", { successes: 2, failures: 1 })
    val s2 = pDeathSave(s, 14)
    all { assert(s2.stable), assert(s2.deathSaves.successes == 0),
          assert(s2.deathSaves.failures == 0), assert(not(s2.dead)) }
  }

  run test_death_save_third_failure_dead = {
    val s = DYING20.with("deathSaves", { successes: 1, failures: 2 })
    val s2 = pDeathSave(s, 5)
    assert(s2.dead)
  }

  run test_death_save_nat1_two_failures = {
    val s = pDeathSave(DYING20, 1)
    assert(s.deathSaves.failures == 2)
  }

  run test_death_save_nat1_causes_death = {
    val s = pDeathSave(DYING20.with("deathSaves", { successes: 0, failures: 2 }), 1)
    assert(s.dead)
  }

  run test_death_save_nat20_regain_hp = {
    val s = pDeathSave(DYING20.with("deathSaves", { successes: 1, failures: 2 }), 20)
    all { assert(s.hp == 1), assert(not(s.unconscious)),
          assert(s.deathSaves.successes == 0), assert(s.deathSaves.failures == 0) }
  }

  run test_death_save_stable_noop = {
    val s = pDeathSave(DYING20.with("stable", true), 5)
    assert(s.deathSaves.failures == 0)
  }

  // ============================================================
  // Stabilize & Recovery
  // ============================================================

  run test_stabilize_resets_death_saves = {
    val s = pStabilize(DYING20.with("deathSaves", { successes: 1, failures: 2 }))
    all { assert(s.stable), assert(s.deathSaves.successes == 0),
          assert(s.deathSaves.failures == 0) }
  }

  run test_stable_recovery = {
    val s = pStableRecovery(DYING20.with("stable", true))
    all { assert(s.hp == 1), assert(not(s.unconscious)),
          assert(not(s.stable)), assert(s.prone) }
  }

  // ============================================================
  // Knock Out
  // ============================================================

  run test_knock_out = {
    val s = pKnockOut(FRESH20)
    all { assert(s.hp == 1), assert(s.unconscious), assert(s.prone),
          assert(isIncapacitated(s)) }
  }

  // ============================================================
  // Conditions
  // ============================================================

  run test_apply_blinded = assert(pApplyCondition(FRESH20, CBlinded).blinded)

  run test_paralyzed_implies_incapacitated = {
    val s = pApplyCondition(FRESH20, CParalyzed)
    all { assert(s.paralyzed), assert(isIncapacitated(s)) }
  }

  run test_unconscious_implies_prone_incap = {
    val s = pApplyCondition(FRESH20, CUnconscious)
    all { assert(s.unconscious), assert(s.prone), assert(isIncapacitated(s)) }
  }

  run test_remove_paralyzed_while_stunned_incap_stays = {
    val s = pApplyCondition(pApplyCondition(FRESH20, CParalyzed), CStunned)
    val s2 = pRemoveCondition(s, CParalyzed)
    all { assert(not(s2.paralyzed)), assert(s2.stunned), assert(isIncapacitated(s2)) }
  }

  run test_remove_unconscious_prone_stays = {
    val s = pRemoveCondition(pApplyCondition(FRESH20, CUnconscious), CUnconscious)
    all { assert(not(s.unconscious)), assert(s.prone), assert(not(isIncapacitated(s))) }
  }

  run test_petrified_blocks_poison = {
    val s = pApplyCondition(pApplyCondition(FRESH20, CPetrified), CPoisoned)
    assert(not(s.poisoned))
  }

  // ============================================================
  // Exhaustion
  // ============================================================

  run test_exhaustion_add = assert(pAddExhaustion(FRESH20, 2).exhaustion == 2)

  run test_exhaustion_4_no_hp_change = {
    val s = pAddExhaustion(FRESH20, 4)
    all { assert(s.exhaustion == 4), assert(effectiveMaxHp(s) == 20), assert(s.hp == 20) }
  }

  run test_exhaustion_6_death = {
    val s = pAddExhaustion(FRESH20, 6)
    all { assert(s.dead), assert(s.hp == 0) }
  }

  run test_exhaustion_reduce = assert(pReduceExhaustion(pAddExhaustion(FRESH20, 3), 1).exhaustion == 2)

  // -- Exhaustion Penalty --

  run test_exhaustion_penalty_0 = assert(exhaustionPenalty(FRESH20) == 0)

  run test_exhaustion_penalty_1 = {
    val s = pAddExhaustion(FRESH20, 1)
    assert(exhaustionPenalty(s) == -2)
  }

  run test_exhaustion_penalty_3 = {
    val s = pAddExhaustion(FRESH20, 3)
    assert(exhaustionPenalty(s) == -6)
  }

  run test_exhaustion_penalty_5 = {
    val s = pAddExhaustion(FRESH20, 5)
    assert(exhaustionPenalty(s) == -10)
  }

  // -- Exhaustion Speed --

  run test_speed_exhaustion1_reduced_by_5 = {
    val t = pStartTurn(TEST_FIGHTER_5, pAddExhaustion(FRESH20, 1), Unarmored,
      0, false, false)
    assert(t.movementRemaining == 25) // 30 - 5*1 = 25
  }

  run test_speed_exhaustion_high_clamps_to_zero = {
    // exhaustion 6 is death, but test with 5 and speed 20
    val cfg = TEST_FIGHTER_5.with("speeds", Map(Walk -> 20, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0))
    val t = pStartTurn(cfg, pAddExhaustion(FRESH20, 5), Unarmored,
      0, false, false)
    assert(t.movementRemaining == 0) // 20 - 25 → clamped to 0
  }

  // ============================================================
  // Active Effect Lifecycle
  // ============================================================

  pure val EMPTY_EFFECTS: Set[ActiveEffect] = Set()
  pure val EFF_A: ActiveEffect = { spellId: "hold_person", remainingTurns: 3 }
  pure val EFF_B: ActiveEffect = { spellId: "bless", remainingTurns: 10 }
  pure val TWO_EFFECTS: Set[ActiveEffect] = Set(EFF_A, EFF_B)

  // -- pAddEffect --

  run test_add_effect_to_empty = {
    val result = pAddEffect(EMPTY_EFFECTS, "hold_person", 3)
    all { assert(result.size() == 1), assert(pHasEffect(result, "hold_person")) }
  }

  run test_add_effect_no_duplicate = {
    val result = pAddEffect(TWO_EFFECTS, "haste", 5)
    assert(result.size() == 3)
  }

  run test_add_effect_replaces_same_spellId = {
    val result = pAddEffect(TWO_EFFECTS, "hold_person", 7)
    all {
      assert(result.size() == 2),
      assert(pHasEffect(result, "hold_person")),
      assert(result.exists(e => e.spellId == "hold_person" and e.remainingTurns == 7))
    }
  }

  // -- pRemoveEffect --

  run test_remove_effect_present = {
    val result = pRemoveEffect(TWO_EFFECTS, "hold_person")
    all { assert(result.size() == 1), assert(not(pHasEffect(result, "hold_person"))) }
  }

  run test_remove_effect_absent_noop = {
    val result = pRemoveEffect(TWO_EFFECTS, "nonexistent")
    assert(result.size() == 2)
  }

  // -- pDecrementDurations --

  run test_decrement_durations = {
    val result = pDecrementDurations(TWO_EFFECTS)
    all {
      assert(result.exists(e => e.spellId == "hold_person" and e.remainingTurns == 2)),
      assert(result.exists(e => e.spellId == "bless" and e.remainingTurns == 9))
    }
  }

  run test_decrement_to_zero = {
    val effects = Set({ spellId: "shield", remainingTurns: 1 })
    val result = pDecrementDurations(effects)
    assert(result.exists(e => e.spellId == "shield" and e.remainingTurns == 0))
  }

  // -- pExpiredEffects --

  run test_expired_effects_none = assert(pExpiredEffects(TWO_EFFECTS) == Set())

  run test_expired_effects_some = {
    val effects = Set(
      { spellId: "a", remainingTurns: 0 },
      { spellId: "b", remainingTurns: 3 },
      { spellId: "c", remainingTurns: -1 }
    )
    assert(pExpiredEffects(effects) == Set("a", "c"))
  }

  // -- pClearExpired --

  run test_clear_expired = {
    val effects = Set(
      { spellId: "a", remainingTurns: 0 },
      { spellId: "b", remainingTurns: 3 }
    )
    val result = pClearExpired(effects)
    all { assert(result.size() == 1), assert(pHasEffect(result, "b")) }
  }

  run test_clear_expired_none_expired = assert(pClearExpired(TWO_EFFECTS) == TWO_EFFECTS)

  // -- pHasEffect --

  run test_has_effect_true = assert(pHasEffect(TWO_EFFECTS, "bless"))
  run test_has_effect_false = assert(not(pHasEffect(TWO_EFFECTS, "fireball")))
  run test_has_effect_empty = assert(not(pHasEffect(EMPTY_EFFECTS, "anything")))

  // -- pEffectsOnConcBreak --

  run test_conc_break_removes_effect = {
    val ssOld = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hold_person")
    val ssNew = FRESH_SPELL_SLOTS  // concentration broken
    val effects = TWO_EFFECTS
    val result = pEffectsOnConcBreak(ssOld, ssNew, effects)
    all { assert(not(pHasEffect(result, "hold_person"))), assert(pHasEffect(result, "bless")) }
  }

  run test_conc_break_no_break_keeps_effects = {
    val ssOld = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hold_person")
    val ssNew = ssOld  // no break
    val result = pEffectsOnConcBreak(ssOld, ssNew, TWO_EFFECTS)
    assert(result == TWO_EFFECTS)
  }

  run test_conc_break_not_concentrating_noop = {
    val result = pEffectsOnConcBreak(FRESH_SPELL_SLOTS, FRESH_SPELL_SLOTS, TWO_EFFECTS)
    assert(result == TWO_EFFECTS)
  }

  // -- Full lifecycle: add -> decrement -> expire -> clear --

  run test_lifecycle_add_decrement_expire_clear = {
    val e0 = pAddEffect(EMPTY_EFFECTS, "spell_x", 2)
    val e1 = pDecrementDurations(e0)  // remainingTurns = 1
    val e2 = pDecrementDurations(e1)  // remainingTurns = 0
    all {
      assert(pExpiredEffects(e1) == Set()),
      assert(pExpiredEffects(e2) == Set("spell_x")),
      assert(pClearExpired(e2).size() == 0)
    }
  }

  // ============================================================
  // Own Attack Modifiers
  // ============================================================

  run test_own_attack_invisible_adv = {
    val m = pOwnAttackModifiers(pApplyCondition(FRESH20, CInvisible), false)
    all { assert(m.hasAdvantage), assert(not(m.hasDisadvantage)) }
  }

  run test_own_attack_blinded_disadv = {
    val m = pOwnAttackModifiers(pApplyCondition(FRESH20, CBlinded), false)
    all { assert(not(m.hasAdvantage)), assert(m.hasDisadvantage) }
  }

  run test_own_attack_frightened_in_los = {
    val m = pOwnAttackModifiers(pApplyCondition(FRESH20, CFrightened), true)
    assert(m.hasDisadvantage)
  }

  run test_own_attack_frightened_not_in_los = {
    val m = pOwnAttackModifiers(pApplyCondition(FRESH20, CFrightened), false)
    assert(not(m.hasDisadvantage))
  }

  // ============================================================
  // Defense Modifiers
  // ============================================================

  run test_defense_paralyzed_within_5ft = {
    val m = pDefenseModifiers(pApplyCondition(FRESH20, CParalyzed), true)
    all { assert(m.attackerAdvantage), assert(m.autoCrit) }
  }

  run test_defense_prone_within_5ft = {
    val m = pDefenseModifiers(pApplyCondition(FRESH20, CProne), true)
    all { assert(m.attackerAdvantage), assert(not(m.attackerDisadvantage)) }
  }

  run test_defense_prone_beyond_5ft = {
    val m = pDefenseModifiers(pApplyCondition(FRESH20, CProne), false)
    all { assert(not(m.attackerAdvantage)), assert(m.attackerDisadvantage) }
  }

  run test_defense_invisible_disadv = {
    val m = pDefenseModifiers(pApplyCondition(FRESH20, CInvisible), true)
    assert(m.attackerDisadvantage)
  }

  // ============================================================
  // Check Modifiers
  // ============================================================

  run test_check_exhaustion1_no_disadv = {
    val m = pCheckModifiers(pAddExhaustion(FRESH20, 1), false, false, false)
    assert(not(m.hasDisadvantage))
  }

  run test_check_blinded_sight_autofail = {
    val m = pCheckModifiers(pApplyCondition(FRESH20, CBlinded), true, false, false)
    assert(m.autoFail)
  }

  run test_check_blinded_no_sight_ok = {
    val m = pCheckModifiers(pApplyCondition(FRESH20, CBlinded), false, false, false)
    assert(not(m.autoFail))
  }

  run test_check_deafened_hearing_autofail = {
    val m = pCheckModifiers(pApplyCondition(FRESH20, CDeafened), false, true, false)
    assert(m.autoFail)
  }

  // ============================================================
  // Save Modifiers
  // ============================================================

  run test_save_paralyzed_str_autofail = {
    val m = pSaveModifiers(pApplyCondition(FRESH20, CParalyzed), Str)
    assert(m.autoFail)
  }

  run test_save_paralyzed_wis_no_autofail = {
    val m = pSaveModifiers(pApplyCondition(FRESH20, CParalyzed), Wis)
    assert(not(m.autoFail))
  }

  run test_save_restrained_dex_disadv = {
    val m = pSaveModifiers(pApplyCondition(FRESH20, CRestrained), Dex)
    assert(m.hasDisadvantage)
  }

  run test_save_exhaustion3_no_disadv = {
    val m = pSaveModifiers(pAddExhaustion(FRESH20, 3), Wis)
    assert(not(m.hasDisadvantage))
  }

  // ============================================================
  // Save Cover Bonus (T10a)
  // ============================================================

  run test_save_cover_half_dex = assert(pSaveCoverBonus(Dex, HalfCover) == 2)
  run test_save_cover_three_quarters_dex = assert(pSaveCoverBonus(Dex, ThreeQuartersCover) == 5)
  run test_save_cover_none_dex = assert(pSaveCoverBonus(Dex, NoCover) == 0)
  run test_save_cover_non_dex = assert(pSaveCoverBonus(Wis, HalfCover) == 0)

  // ============================================================
  // Can Act / Can Speak
  // ============================================================

  run test_can_act_normal = assert(pCanAct(FRESH20))
  run test_can_act_incapacitated = assert(not(pCanAct(pApplyCondition(FRESH20, CParalyzed))))
  run test_can_speak_normal = assert(pCanSpeak(FRESH20))
  run test_can_speak_paralyzed = assert(not(pCanSpeak(pApplyCondition(FRESH20, CParalyzed))))
  run test_can_speak_stunned_ok = assert(pCanSpeak(pApplyCondition(FRESH20, CStunned)))

  // ============================================================
  // Combined scenarios
  // ============================================================

  // Auto-crit at 0 HP: unconscious within 5ft -> autoCrit, crit damage = 2 death save failures
  run test_autocrit_at_0hp = {
    val dm = pDefenseModifiers(DYING20, true)
    val s = pTakeDamage(DYING20, 5, Slashing, Set(), Set(), Set(), true)
    all { assert(dm.autoCrit), assert(s.deathSaves.failures == 2) }
  }

  // Stabilize then take damage: death saves restart from 0
  run test_stabilize_then_damage = {
    val s = pStabilize(DYING20.with("deathSaves", { successes: 2, failures: 2 }))
    val s2 = pTakeDamage(s, 3, Slashing, Set(), Set(), Set(), false)
    all { assert(not(s2.stable)), assert(s2.deathSaves.failures == 1),
          assert(s2.deathSaves.successes == 0) }
  }

  // ============================================================
  // Phase 3: Turn Structure & Action Economy
  // ============================================================

  pure val TEST_FIGHTER_5: CharConfig = {
    abilityScores: Map(Str -> 16, Dex -> 14, Con -> 14, Int_ -> 10, Wis -> 12, Cha -> 8),
    level: 5,
    size: Medium,
    speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
    saveProficiencies: Set(Str, Con),
    skillProficiencies: Set(Athletics, Perception),
    expertiseSkills: Set(),
    armorProficiencies: Set(LightArmor, MediumArmor, HeavyArmor),
    hitDieType: 10,
    spellcastingAbility: Int_,
    hasSpellcasting: false,
    canRitualCast: false,
    unarmoredDefense: NoUnarmoredDefense,
    features: Set(FExtraAttack),
  }

  pure val BASIC_TURN: TurnState = pStartTurn(
    TEST_FIGHTER_5, FRESH20, Unarmored, 0, false, false
  )

  // -- Start turn basics --

  run test_start_turn_movement = assert(BASIC_TURN.movementRemaining == 30)
  run test_start_turn_action_free = assert(not(BASIC_TURN.actionUsed))
  run test_start_turn_bonus_free = assert(not(BASIC_TURN.bonusActionUsed))
  run test_start_turn_reaction_available = assert(BASIC_TURN.reactionAvailable)
  run test_start_turn_extra_attacks = assert(BASIC_TURN.extraAttacksRemaining == 1)

  // -- Extra attacks from config --

  run test_extra_attacks_none = {
    val cfg = TEST_FIGHTER_5.with("features", Set())
    assert(extraAttacksFromConfig(cfg) == 0)
  }

  run test_extra_attacks_fighter11 = {
    val cfg = TEST_FIGHTER_5.with("features", Set(FExtraAttack2))
    assert(extraAttacksFromConfig(cfg) == 2)
  }

  run test_extra_attacks_fighter20 = {
    val cfg = TEST_FIGHTER_5.with("features", Set(FExtraAttack3))
    assert(extraAttacksFromConfig(cfg) == 3)
  }

  // -- Speed modifiers --

  run test_speed_heavy_armor_penalty = {
    val t = pStartTurn(TEST_FIGHTER_5.with("abilityScores",
      Map(Str -> 12, Dex -> 14, Con -> 14, Int_ -> 10, Wis -> 12, Cha -> 8)),
      FRESH20, WearingArmor(CHAIN_MAIL), 0, false, false)
    assert(t.movementRemaining == 20) // 30 - 10 (STR 12 < 13)
  }

  run test_speed_exhaustion2_reduced_by_10 = {
    val t = pStartTurn(TEST_FIGHTER_5, pAddExhaustion(FRESH20, 2), Unarmored,
      0, false, false)
    assert(t.movementRemaining == 20) // 30 - 5*2 = 20
  }

  run test_speed_exhaustion5_reduced_by_25 = {
    val t = pStartTurn(TEST_FIGHTER_5, pAddExhaustion(FRESH20, 5), Unarmored,
      0, false, false)
    assert(t.movementRemaining == 5) // 30 - 5*5 = 5
  }

  run test_speed_grappled_zero = {
    val t = pStartTurn(TEST_FIGHTER_5, pApplyCondition(FRESH20, CGrappled), Unarmored,
      0, false, false)
    assert(t.movementRemaining == 0)
  }

  run test_speed_grappled_ignores_bonus = {
    val t = pStartTurn(TEST_FIGHTER_5, pApplyCondition(FRESH20, CGrappled), Unarmored,
      10, false, false) // +10 from spell, should be ignored
    assert(t.movementRemaining == 0)
  }

  run test_speed_grappling_halved = {
    val t = pStartTurn(TEST_FIGHTER_5, FRESH20, Unarmored,
      0, true, false) // grappling, target not 2+ sizes smaller
    assert(t.movementRemaining == 15)
  }

  run test_speed_grappling_tiny_target = {
    val t = pStartTurn(TEST_FIGHTER_5, FRESH20, Unarmored,
      0, true, true) // grappling, target 2+ sizes smaller
    assert(t.movementRemaining == 30) // no penalty
  }

  run test_speed_caller_modifier = {
    val t = pStartTurn(TEST_FIGHTER_5, FRESH20, Unarmored,
      10, false, false) // +10 from Longstrider
    assert(t.movementRemaining == 40)
  }

  // -- Action usage --

  run test_use_action = {
    val t = pUseAction(BASIC_TURN, FRESH20, AAttack)
    assert(t.actionUsed)
  }

  run test_use_action_twice_noop = {
    val t = pUseAction(pUseAction(BASIC_TURN, FRESH20, AAttack), FRESH20, ADash)
    assert(t.movementRemaining == 30) // Dash didn't apply
  }

  run test_use_action_incapacitated_noop = {
    val s = pApplyCondition(FRESH20, CStunned)
    val t = pUseAction(BASIC_TURN, s, AAttack)
    assert(not(t.actionUsed)) // can't act while incapacitated
  }

  // -- Disengage --

  run test_disengage = {
    val t = pUseAction(BASIC_TURN, FRESH20, ADisengage)
    all { assert(t.actionUsed), assert(t.disengaged) }
  }

  run test_disengage_blocks_oa = {
    val t = pUseAction(BASIC_TURN, FRESH20, ADisengage)
    assert(not(pCanBeOpportunityAttacked(t)))
  }

  run test_no_disengage_allows_oa = assert(pCanBeOpportunityAttacked(BASIC_TURN))

  // -- Dodge --

  run test_dodge = {
    val t = pUseAction(BASIC_TURN, FRESH20, ADodge)
    all { assert(t.actionUsed), assert(t.dodging) }
  }

  // -- Dash --

  run test_dash_adds_speed = {
    val t = pUseAction(BASIC_TURN, FRESH20, ADash)
    assert(t.movementRemaining == 60) // 30 + 30 (adds speed, not doubles remaining)
  }

  run test_dash_after_partial_move = {
    val t1 = pUseMovement(BASIC_TURN, 10, 1) // move 10, 20 remaining
    val t2 = pUseAction(t1, FRESH20, ADash)
    assert(t2.movementRemaining == 50) // 20 + 30 speed
  }

  // -- Ready --

  run test_ready = {
    val t = pUseAction(BASIC_TURN, FRESH20, AReady)
    all { assert(t.actionUsed), assert(t.readiedAction) }
  }

  // -- Bonus action --

  run test_use_bonus_action = {
    val t = pUseBonusAction(BASIC_TURN, FRESH20)
    assert(t.bonusActionUsed)
  }

  run test_bonus_action_twice_noop = {
    val t = pUseBonusAction(pUseBonusAction(BASIC_TURN, FRESH20), FRESH20)
    assert(t.bonusActionUsed)
  }

  // -- Reaction --

  run test_use_reaction = {
    val t = pUseReaction(BASIC_TURN)
    assert(not(t.reactionAvailable))
  }

  run test_use_reaction_twice_noop = {
    val t = pUseReaction(pUseReaction(BASIC_TURN))
    assert(not(t.reactionAvailable))
  }

  // -- Movement --

  run test_use_movement = {
    val t = pUseMovement(BASIC_TURN, 15, 1)
    assert(t.movementRemaining == 15)
  }

  run test_use_movement_difficult_terrain = {
    val t = pUseMovement(BASIC_TURN, 10, 2) // 10 ft in difficult terrain = 20 ft cost
    assert(t.movementRemaining == 10)
  }

  run test_use_movement_insufficient = {
    val t = pUseMovement(BASIC_TURN, 20, 2) // 40 ft cost > 30 ft
    assert(t.movementRemaining == 30) // no change
  }

  run test_use_movement_split = {
    val t1 = pUseMovement(BASIC_TURN, 10, 1) // move 10
    val t2 = pUseMovement(t1, 15, 1)          // move 15 more
    assert(t2.movementRemaining == 5)
  }

  // -- Extra attacks --

  run test_use_extra_attack = {
    val t = pUseExtraAttack(BASIC_TURN)
    assert(t.extraAttacksRemaining == 0)
  }

  run test_use_extra_attack_depleted = {
    val t = pUseExtraAttack(pUseExtraAttack(BASIC_TURN))
    assert(t.extraAttacksRemaining == 0) // can't go below 0
  }

  // -- Object interaction --

  run test_object_interaction_free = {
    val t = pUseObjectInteraction(BASIC_TURN)
    assert(t.freeInteractionUsed)
  }

  run test_object_interaction_second_needs_action = {
    val t = pUseObjectInteraction(pUseObjectInteraction(BASIC_TURN))
    assert(t.freeInteractionUsed) // already used, no additional change
  }

  // -- Bonus action spell rule --

  run test_bonus_spell_blocks_non_cantrip = {
    val t = pMarkBonusActionSpell(BASIC_TURN)
    all { assert(t.bonusActionSpellCast), assert(not(canCastNonCantripAction(t))) }
  }

  run test_non_cantrip_action_blocks_bonus_spell = {
    val t = pMarkNonCantripActionSpell(BASIC_TURN)
    all { assert(t.nonCantripActionSpellCast), assert(not(canCastBonusActionSpell(t))) }
  }

  run test_cantrip_action_allows_bonus_spell = {
    // No mark = cantrip or no spell cast as action
    assert(canCastBonusActionSpell(BASIC_TURN))
  }

  // -- Two-weapon fighting --

  run test_twf_eligible = {
    val t = pUseAction(BASIC_TURN, FRESH20, AAttack)
    assert(pCanTwoWeaponFighting(t, FRESH20))
  }

  run test_twf_no_attack_action = assert(not(pCanTwoWeaponFighting(BASIC_TURN, FRESH20)))

  run test_twf_after_dash_not_eligible = {
    val t = pUseAction(BASIC_TURN, FRESH20, ADash)
    assert(not(pCanTwoWeaponFighting(t, FRESH20)))
  }

  run test_twf_bonus_used = {
    val t = pUseBonusAction(pUseAction(BASIC_TURN, FRESH20, AAttack), FRESH20)
    assert(not(pCanTwoWeaponFighting(t, FRESH20)))
  }

  // ============================================================
  // Phase 3: Attack Modifier Aggregation
  // ============================================================

  pure val BASE_ATTACK_CTX: AttackContext = {
    attackerBlinded: false, attackerProne: false,
    attackerRestrained: false, attackerPoisoned: false, attackerFrightened: false,
    attackerFrightSourceInLOS: false,
    targetBlinded: false, targetParalyzed: false,
    targetPetrified: false, targetStunned: false, targetUnconscious: false,
    targetRestrained: false, targetProne: false,
    attackerWithin5ft: true, targetDodging: false, targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
    isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
    attackerGrappled: false, targetIsGrappler: false,
    squeezing: false, underwater: false, attackerHasSwimSpeed: false,
    isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
  }

  // Clean attack: no modifiers
  run test_aggregate_clean = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX)
    all { assert(not(m.hasAdvantage)), assert(not(m.hasDisadvantage)),
          assert(not(m.autoCrit)), assert(not(m.autoMiss)) }
  }

  // Target blinded: advantage
  run test_aggregate_target_blinded = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("targetBlinded", true))
    all { assert(m.hasAdvantage), assert(not(m.hasDisadvantage)) }
  }

  // Attacker blinded: disadvantage
  run test_aggregate_attacker_blinded = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("attackerBlinded", true))
    all { assert(not(m.hasAdvantage)), assert(m.hasDisadvantage) }
  }

  // Adv + disadv cancel
  run test_aggregate_adv_disadv_cancel = {
    val ctx = BASE_ATTACK_CTX.with("targetBlinded", true).with("attackerBlinded", true)
    val m = pAggregateAttackMods(ctx)
    all { assert(not(m.hasAdvantage)), assert(not(m.hasDisadvantage)) }
  }

  // Paralyzed within 5ft: adv + autocrit
  run test_aggregate_paralyzed_autocrit = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("targetParalyzed", true))
    all { assert(m.hasAdvantage), assert(m.autoCrit) }
  }

  // Unconscious within 5ft: adv + autocrit
  run test_aggregate_unconscious_autocrit = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("targetUnconscious", true))
    all { assert(m.hasAdvantage), assert(m.autoCrit) }
  }

  // Paralyzed beyond 5ft: adv but no autocrit
  run test_aggregate_paralyzed_beyond_5ft = {
    val ctx = BASE_ATTACK_CTX.with("targetParalyzed", true).with("attackerWithin5ft", false)
    val m = pAggregateAttackMods(ctx)
    all { assert(m.hasAdvantage), assert(not(m.autoCrit)) }
  }

  // Target dodging + can see attacker: disadvantage
  run test_aggregate_dodging = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("targetDodging", true))
    assert(m.hasDisadvantage)
  }

  // Target dodging but can't see attacker: no disadvantage
  run test_aggregate_dodging_blind = {
    val ctx = BASE_ATTACK_CTX.with("targetDodging", true).with("targetCanSeeAttacker", false)
    val m = pAggregateAttackMods(ctx)
    // no dodge disadv, but attacker gets advantage (unseen)
    assert(not(m.hasDisadvantage))
  }

  // Prone target within 5ft: advantage
  run test_aggregate_prone_within_5ft = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("targetProne", true))
    all { assert(m.hasAdvantage), assert(not(m.hasDisadvantage)) }
  }

  // Prone target beyond 5ft: disadvantage (ALL attacks, not just ranged)
  run test_aggregate_prone_beyond_5ft = {
    val ctx = BASE_ATTACK_CTX.with("targetProne", true).with("attackerWithin5ft", false)
    val m = pAggregateAttackMods(ctx)
    all { assert(not(m.hasAdvantage)), assert(m.hasDisadvantage) }
  }

  // Ranged attack beyond normal range: disadvantage
  run test_aggregate_ranged_beyond_normal = {
    val ctx = BASE_ATTACK_CTX.with("isRangedAttack", true).with("beyondNormalRange", true)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  // Ranged in close quarters: disadvantage
  run test_aggregate_ranged_close_quarters = {
    val ctx = BASE_ATTACK_CTX.with("isRangedAttack", true).with("hostileWithin5ft", true)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  // Heavy weapon + small creature: disadvantage
  run test_aggregate_heavy_small = {
    val ctx = BASE_ATTACK_CTX.with("isHeavyWeapon", true).with("wielderSizeSmallOrTiny", true)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  // Squeezing attacker: disadvantage
  run test_aggregate_squeezing = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("squeezing", true))
    assert(m.hasDisadvantage)
  }

  // Underwater melee without swim speed (non-exception weapon): disadvantage
  run test_aggregate_underwater_melee_disadv = {
    val ctx = BASE_ATTACK_CTX.with("underwater", true)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  run test_aggregate_underwater_melee_piercing = {
    val ctx = BASE_ATTACK_CTX.with("underwater", true).with("isUnderwaterMeleePiercing", true)
    val m = pAggregateAttackMods(ctx)
    assert(not(m.hasDisadvantage))
  }

  // Underwater melee with swim speed: no disadvantage
  run test_aggregate_underwater_melee_swim_speed = {
    val ctx = BASE_ATTACK_CTX.with("underwater", true).with("attackerHasSwimSpeed", true)
    val m = pAggregateAttackMods(ctx)
    assert(not(m.hasDisadvantage))
  }

  // Underwater ranged within normal range (non-exception): disadvantage
  run test_aggregate_underwater_ranged_disadv = {
    val ctx = BASE_ATTACK_CTX.with("underwater", true).with("isRangedAttack", true)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  // Underwater ranged beyond normal range: auto-miss
  run test_aggregate_underwater_ranged_automiss = {
    val ctx = BASE_ATTACK_CTX.with("underwater", true).with("isRangedAttack", true)
      .with("beyondNormalRange", true)
    val m = pAggregateAttackMods(ctx)
    assert(m.autoMiss)
  }

  // Underwater ranged with exception weapon: no disadvantage
  run test_aggregate_underwater_ranged_exception = {
    val ctx = BASE_ATTACK_CTX.with("underwater", true).with("isRangedAttack", true)
      .with("isUnderwaterRangedException", true)
    val m = pAggregateAttackMods(ctx)
    assert(not(m.hasDisadvantage))
  }

  // Unseen attacker (not invisible, e.g. in darkness): advantage
  run test_aggregate_unseen_attacker = {
    val ctx = BASE_ATTACK_CTX.with("targetCanSeeAttacker", false)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasAdvantage)
  }

  // Can't see target: disadvantage
  run test_aggregate_cant_see_target = {
    val ctx = BASE_ATTACK_CTX.with("attackerCanSeeTarget", false)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  // Frightened with source in LOS: disadvantage
  run test_aggregate_frightened_in_los = {
    val ctx = BASE_ATTACK_CTX.with("attackerFrightened", true).with("attackerFrightSourceInLOS", true)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  // Frightened without source in LOS: no disadvantage
  run test_aggregate_frightened_no_los = {
    val ctx = BASE_ATTACK_CTX.with("attackerFrightened", true).with("attackerFrightSourceInLOS", false)
    val m = pAggregateAttackMods(ctx)
    assert(not(m.hasDisadvantage))
  }

  // Target restrained: attacker advantage
  run test_aggregate_target_restrained = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("targetRestrained", true))
    assert(m.hasAdvantage)
  }

  // Attacker restrained: disadvantage
  run test_aggregate_attacker_restrained = {
    val m = pAggregateAttackMods(BASE_ATTACK_CTX.with("attackerRestrained", true))
    assert(m.hasDisadvantage)
  }

  run test_aggregate_grappled_vs_non_grappler = {
    val ctx = BASE_ATTACK_CTX.with("attackerGrappled", true).with("targetIsGrappler", false)
    val m = pAggregateAttackMods(ctx)
    assert(m.hasDisadvantage)
  }

  run test_aggregate_grappled_vs_grappler = {
    val ctx = BASE_ATTACK_CTX.with("attackerGrappled", true).with("targetIsGrappler", true)
    val m = pAggregateAttackMods(ctx)
    assert(not(m.hasDisadvantage))
  }

  // ============================================================
  // Phase 4: Combat Actions & Interactions
  // ============================================================

  // -- Loading property --

  pure val HAND_CROSSBOW: Weapon = {
    name: "Hand Crossbow", damageDie: 6, versatileDie: 0, damageType: Piercing,
    properties: Set(Ammunition, Light_, Loading), isMelee: false, normalRange: 30, longRange: 120,
  }

  pure val SHORTSWORD: Weapon = {
    name: "Shortsword", damageDie: 6, versatileDie: 0, damageType: Piercing,
    properties: Set(Finesse, Light_), isMelee: true, normalRange: 0, longRange: 0,
  }

  pure val DAGGER: Weapon = {
    name: "Dagger", damageDie: 4, versatileDie: 0, damageType: Piercing,
    properties: Set(Finesse, Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60,
  }

  run test_loading_blocks_extra_attack = assert(not(pCanExtraAttackWithWeapon(HAND_CROSSBOW)))

  run test_no_loading_allows_extra_attack = assert(pCanExtraAttackWithWeapon(SHORTSWORD))

  // -- Two-Weapon Fighting --

  run test_twf_full_preconditions_both_light_melee = {
    val t = pUseAction(BASIC_TURN, FRESH20, AAttack)
    assert(pCanTWFWithWeapons(SHORTSWORD, DAGGER, t, FRESH20))
  }

  run test_twf_fails_non_light_main = {
    val t = pUseAction(BASIC_TURN, FRESH20, AAttack)
    assert(not(pCanTWFWithWeapons(RAPIER, SHORTSWORD, t, FRESH20)))
  }

  run test_twf_fails_ranged_weapon = {
    val t = pUseAction(BASIC_TURN, FRESH20, AAttack)
    assert(not(pCanTWFWithWeapons(SHORTSWORD, LONGBOW, t, FRESH20)))
  }

  run test_twf_thrown_counts_as_melee = {
    val t = pUseAction(BASIC_TURN, FRESH20, AAttack)
    assert(pCanTWFWithWeapons(DAGGER, DAGGER, t, FRESH20))
  }

  run test_twf_no_attack_action_fails = {
    assert(not(pCanTWFWithWeapons(SHORTSWORD, SHORTSWORD, BASIC_TURN, FRESH20)))
  }

  run test_twf_offhand_damage_positive_mod = {
    // STR mod +3: not added
    assert(pTWFOffHandDamage(4, 3) == 4)
  }

  run test_twf_offhand_damage_negative_mod = {
    // STR mod -1: added
    assert(pTWFOffHandDamage(4, -1) == 3)
  }

  run test_twf_offhand_damage_zero_mod = {
    assert(pTWFOffHandDamage(4, 0) == 4)
  }

  run test_twf_offhand_damage_floor_zero = {
    // dice 1, mod -3: 1 + (-3) = -2, floored to 0
    assert(pTWFOffHandDamage(1, -3) == 0)
  }

  // -- Grapple/Shove DC --

  run test_grapple_shove_dc = {
    // STR mod +3, PB +2 → DC = 8 + 3 + 2 = 13
    assert(pGrappleShoveDC(3, 2) == 13)
  }

  run test_grapple_shove_dc_negative_str = {
    // STR mod -1, PB +2 → DC = 8 + (-1) + 2 = 9
    assert(pGrappleShoveDC(-1, 2) == 9)
  }

  // -- Size comparison --

  run test_size_allows_grapple_same = assert(pWithinOneSize(Medium, Medium))
  run test_size_allows_grapple_one_larger = assert(pWithinOneSize(Medium, Large))
  run test_size_blocks_grapple_two_larger = assert(not(pWithinOneSize(Medium, Huge)))
  run test_size_allows_grapple_smaller = assert(pWithinOneSize(Large, Small))
  run test_target_two_sizes_smaller = assert(pTwoSizesSmaller(Large, Tiny))
  run test_target_not_two_sizes_smaller = assert(not(pTwoSizesSmaller(Medium, Small)))

  // -- Grapple --

  run test_grapple_success = {
    val r = pGrapple(Medium, Medium, FRESH20, true, true) // target save failed
    all { assert(r.success), assert(r.targetState.grappled) }
  }

  run test_grapple_fail_save = {
    val r = pGrapple(Medium, Medium, FRESH20, false, true) // target save succeeded
    all { assert(not(r.success)), assert(not(r.targetState.grappled)) }
  }

  run test_grapple_auto_success_incapacitated = {
    val target = pApplyCondition(FRESH20, CStunned)
    val r = pGrapple(Medium, Medium, target, false, true) // save succeeded but incapacitated
    all { assert(r.success), assert(r.targetState.grappled) }
  }

  run test_grapple_too_large = {
    val r = pGrapple(Medium, Huge, FRESH20, true, true)
    assert(not(r.success))
  }

  run test_grapple_no_free_hand = {
    val r = pGrapple(Medium, Medium, FRESH20, true, false)
    assert(not(r.success))
  }

  // -- Release Grapple --

  run test_release_grapple = {
    val s = pApplyCondition(FRESH20, CGrappled)
    val s2 = pReleaseGrapple(s)
    assert(not(s2.grappled))
  }

  // -- Escape Grapple --

  run test_escape_grapple_success = {
    val s = pApplyCondition(FRESH20, CGrappled)
    val s2 = pEscapeGrapple(s, true) // check succeeded
    assert(not(s2.grappled))
  }

  run test_escape_grapple_fail = {
    val s = pApplyCondition(FRESH20, CGrappled)
    val s2 = pEscapeGrapple(s, false) // check failed
    assert(s2.grappled)
  }

  // -- Shove --

  run test_shove_prone_success = {
    val r = pShove(Medium, Medium, FRESH20, true, ShoveProne) // target save failed
    all { assert(r.success), assert(r.targetState.prone) }
  }

  run test_shove_push_success = {
    val r = pShove(Medium, Medium, FRESH20, true, ShovePush)
    all { assert(r.success), assert(not(r.targetState.prone)) } // push is spatial, no state change
  }

  run test_shove_fail_save = {
    val r = pShove(Medium, Medium, FRESH20, false, ShoveProne) // target save succeeded
    all { assert(not(r.success)), assert(not(r.targetState.prone)) }
  }

  run test_shove_too_large = {
    val r = pShove(Small, Huge, FRESH20, true, ShoveProne)
    assert(not(r.success))
  }

  run test_shove_auto_success_incapacitated = {
    val target = pApplyCondition(FRESH20, CParalyzed)
    val r = pShove(Medium, Medium, target, false, ShoveProne) // save succeeded but incapacitated
    all { assert(r.success), assert(r.targetState.prone) }
  }

  // -- Mounted Combat --

  run test_mount_dismount_cost = {
    // Speed 30, cost = 15
    val t = pMountOrDismount(BASIC_TURN)
    assert(t.movementRemaining == 15) // 30 - 15
  }

  run test_mount_insufficient_movement = {
    val t = pUseMovement(BASIC_TURN, 20, 1) // 10 remaining, cost = 15
    val t2 = pMountOrDismount(t)
    assert(t2.movementRemaining == 10) // no change
  }

  run test_mount_speed_zero = {
    val t = pStartTurn(TEST_FIGHTER_5, pApplyCondition(FRESH20, CGrappled), Unarmored,
      0, false, false)
    val t2 = pMountOrDismount(t)
    assert(t2.movementRemaining == 0) // speed 0, can't mount
  }

  run test_controlled_mount_dash_valid = assert(pIsValidControlledMountAction(ADash))
  run test_controlled_mount_disengage_valid = assert(pIsValidControlledMountAction(ADisengage))
  run test_controlled_mount_dodge_valid = assert(pIsValidControlledMountAction(ADodge))
  run test_controlled_mount_attack_invalid = assert(not(pIsValidControlledMountAction(AAttack)))
  run test_controlled_mount_cast_invalid = assert(not(pIsValidControlledMountAction(AMagic)))

  // Forced dismount save
  run test_forced_dismount_save_pass = {
    // d20=12, DEX mod +2, proficient, prof bonus 3 -> 12+2+3=17 >= 10
    assert(pForcedDismountSave(12, 2, true, 3))
  }

  run test_forced_dismount_save_fail = {
    // d20=3, DEX mod -1, not proficient, prof bonus 2 -> 3+(-1)=2 < 10
    assert(not(pForcedDismountSave(3, -1, false, 2)))
  }

  // Mount knocked prone: use reaction to dismount safely
  run test_mount_knocked_prone_use_reaction = {
    val r = pMountKnockedProne(FRESH20, BASIC_TURN, true)
    all { assert(not(r.creatureState.prone)), assert(not(r.turnState.reactionAvailable)) }
  }

  run test_mount_knocked_prone_no_reaction = {
    val r = pMountKnockedProne(FRESH20, BASIC_TURN, false)
    all { assert(r.creatureState.prone), assert(r.turnState.reactionAvailable) }
  }

  run test_mount_knocked_prone_reaction_unavailable = {
    val t = pUseReaction(BASIC_TURN) // reaction already used
    val r = pMountKnockedProne(FRESH20, t, true) // wants to use reaction but can't
    all { assert(r.creatureState.prone), assert(not(r.turnState.reactionAvailable)) }
  }

  // ============================================================
  // Phase 5: Movement System
  // ============================================================

  // -- Movement Cost Multiplier --

  run test_movement_cost_normal = assert(pMovementCost(false, false, false, false, false) == 1)

  run test_movement_cost_difficult_terrain = assert(pMovementCost(true, false, false, false, false) == 2)

  run test_movement_cost_crawling = assert(pMovementCost(false, true, false, false, false) == 2)

  run test_movement_cost_climbing_no_speed = assert(pMovementCost(false, false, true, false, false) == 2)

  run test_movement_cost_climbing_with_speed = assert(pMovementCost(false, false, true, true, false) == 1)

  run test_movement_cost_squeezing = assert(pMovementCost(false, false, false, false, true) == 2)

  // PHB: "Crawling 1 foot in difficult terrain, therefore, costs 3 feet of movement."
  run test_movement_cost_crawl_difficult = assert(pMovementCost(true, true, false, false, false) == 3)

  // PHB Ch8: climbing without speed in difficult terrain = 3 (1 base + 1 terrain + 1 climb)
  run test_movement_cost_climb_no_speed_difficult = assert(pMovementCost(true, false, true, false, false) == 3)

  // Climbing WITH speed in difficult terrain: only terrain penalty
  run test_movement_cost_climb_with_speed_difficult = assert(pMovementCost(true, false, true, true, false) == 2)

  // Squeezing + difficult terrain
  run test_movement_cost_squeeze_difficult = assert(pMovementCost(true, false, false, false, true) == 3)

  // -- Stand from Prone --

  run test_stand_from_prone_normal = {
    // Speed 30, cost = 15
    val t = pStandFromProne(BASIC_TURN)
    assert(t.movementRemaining == 15)
  }

  run test_stand_from_prone_speed_zero = {
    val t = pStartTurn(TEST_FIGHTER_5, pApplyCondition(FRESH20, CGrappled), Unarmored,
      0, false, false)
    val t2 = pStandFromProne(t)
    assert(t2.movementRemaining == 0) // speed 0, can't stand
  }

  run test_stand_from_prone_insufficient_movement = {
    val t = pUseMovement(BASIC_TURN, 20, 1) // 10 remaining, cost = 15
    val t2 = pStandFromProne(t)
    assert(t2.movementRemaining == 10) // no change
  }

  run test_stand_from_prone_exact_half = {
    // Speed 30, remaining 15, cost 15 — exactly enough
    val t = pUseMovement(BASIC_TURN, 15, 1)
    val t2 = pStandFromProne(t)
    assert(t2.movementRemaining == 0)
  }

  // -- Drop Prone --

  run test_drop_prone = {
    val s = pDropProne(FRESH20, 30)
    assert(s.prone)
  }

  run test_drop_prone_already_prone = {
    val s = pDropProne(pApplyCondition(FRESH20, CProne), 30)
    assert(s.prone) // idempotent
  }

  run test_drop_prone_speed_zero_blocked = {
    val s = pDropProne(FRESH20, 0)
    assert(not(s.prone))
  }

  // -- Flying Creature Falls --

  run test_flying_falls_prone = {
    val s = pApplyCondition(FRESH20, CProne)
    assert(pFlyingCreatureFalls(s, 30, false, false))
  }

  run test_flying_falls_speed_zero = {
    assert(pFlyingCreatureFalls(FRESH20, 0, false, false))
  }

  run test_flying_no_fall_hover = {
    val s = pApplyCondition(FRESH20, CProne)
    assert(not(pFlyingCreatureFalls(s, 30, true, false)))
  }

  run test_flying_no_fall_magic = {
    val s = pApplyCondition(FRESH20, CProne)
    assert(not(pFlyingCreatureFalls(s, 30, false, true)))
  }

  run test_flying_no_fall_normal = {
    assert(not(pFlyingCreatureFalls(FRESH20, 30, false, false)))
  }

  // -- Switch Speed Type --

  run test_switch_speed_walk_to_fly = {
    // Walk 30, Fly 60. Walked 0 feet. Switch to fly: 60 - 0 = 60
    val t = pSwitchSpeedType(BASIC_TURN, 60, 0)
    all { assert(t.movementRemaining == 60), assert(t.effectiveSpeed == 60) }
  }

  run test_switch_speed_with_distance = {
    // Walk 30, Fly 60. Walked 20 feet. Switch to fly: 60 - 20 = 40
    val t = pSwitchSpeedType(BASIC_TURN, 60, 20)
    all { assert(t.movementRemaining == 40), assert(t.effectiveSpeed == 60) }
  }

  run test_switch_speed_impossible = {
    // Walk 30, Fly 20. Walked 25 feet. Switch to fly: 20 - 25 = -5 → can't
    val t = pUseMovement(BASIC_TURN, 25, 1)
    val t2 = pSwitchSpeedType(t, 20, 25)
    assert(t2.movementRemaining == 5) // no change
  }

  run test_switch_speed_exact_zero = {
    // Walk 30, Fly 20. Walked 20 feet. Switch to fly: 20 - 20 = 0 → can't
    val t = pSwitchSpeedType(BASIC_TURN, 20, 20)
    assert(t.movementRemaining == 30) // no change
  }

  // PHB example: speed 30, fly 60. Fly 20, walk 10, fly 30 more.
  run test_switch_speed_phb_example = {
    // Start with fly 60
    val t0 = pSwitchSpeedType(BASIC_TURN, 60, 0) // switch to fly from walk
    val t1 = pUseMovement(t0, 20, 1) // fly 20, remaining 40
    // Switch to walk. Distance moved = 20. Walk speed 30. 30 - 20 = 10
    val t2 = pSwitchSpeedType(t1, 30, 20)
    val t3 = pUseMovement(t2, 10, 1) // walk 10, remaining 0
    // Switch to fly. Distance moved = 30. Fly speed 60. 60 - 30 = 30
    val t4 = pSwitchSpeedType(t3, 60, 30)
    all { assert(t4.movementRemaining == 30), assert(t4.effectiveSpeed == 60) }
  }

  // -- Long Jump --

  run test_long_jump_running = {
    // STR 16 → 16 feet
    assert(pLongJumpDistance(16, true) == 16)
  }

  run test_long_jump_standing = {
    // STR 16 → 8 feet
    assert(pLongJumpDistance(16, false) == 8)
  }

  run test_long_jump_standing_odd = {
    // STR 15 → 7 feet (15/2 = 7, integer division)
    assert(pLongJumpDistance(15, false) == 7)
  }

  // -- High Jump --

  run test_high_jump_running = {
    // STR 16, mod +3 → 3 + 3 = 6 feet
    assert(pHighJumpHeight(16, true) == 6)
  }

  run test_high_jump_standing = {
    // STR 16, mod +3 → 6 / 2 = 3 feet
    assert(pHighJumpHeight(16, false) == 3)
  }

  run test_high_jump_low_str = {
    // STR 6, mod -2 → 3 + (-2) = 1 foot
    assert(pHighJumpHeight(6, true) == 1)
  }

  run test_high_jump_very_low_str = {
    // STR 1, mod -5 → 3 + (-5) = -2 → min 0
    assert(pHighJumpHeight(1, true) == 0)
  }

  run test_high_jump_very_low_str_standing = {
    // STR 1 → base 0, standing = 0/2 = 0
    assert(pHighJumpHeight(1, false) == 0)
  }

  run test_high_jump_str10 = {
    // STR 10, mod 0 → 3 + 0 = 3 feet
    assert(pHighJumpHeight(10, true) == 3)
  }

  // -- Jump Landing in Difficult Terrain --

  run test_jump_land_pass = {
    val s = pJumpLandInDifficultTerrain(FRESH20, true)
    assert(not(s.prone))
  }

  run test_jump_land_fail = {
    val s = pJumpLandInDifficultTerrain(FRESH20, false)
    assert(s.prone)
  }

  // -- Hostile Movement --

  run test_hostile_move_medium_tiny = {
    // diff = 2 - 0 = 2 ≥ 2 → can move through
    assert(pCanMoveThroughHostile(Medium, Tiny))
  }

  run test_hostile_move_tiny_medium = {
    // diff = 0 - 2 = -2 ≤ -2 → can move through
    assert(pCanMoveThroughHostile(Tiny, Medium))
  }

  run test_hostile_move_medium_small = {
    // diff = 2 - 1 = 1, not ≥ 2 → can't
    assert(not(pCanMoveThroughHostile(Medium, Small)))
  }

  run test_hostile_move_medium_large = {
    // diff = 2 - 3 = -1, not ≤ -2 → can't
    assert(not(pCanMoveThroughHostile(Medium, Large)))
  }

  run test_hostile_move_medium_huge = {
    // diff = 2 - 4 = -2 ≤ -2 → can move through
    assert(pCanMoveThroughHostile(Medium, Huge))
  }

  run test_hostile_move_same_size = {
    assert(not(pCanMoveThroughHostile(Medium, Medium)))
  }

  // ============================================================
  // Phase 6: Spellcasting System
  // ============================================================

  // -- Test Fixtures --

  // 5th-level wizard: CL 5 → slots 4/3/2/0/.../0
  pure val WIZARD_5_SLOTS: SpellSlotState = {
    slotsMax: pBuildSlotMap(5),
    slotsCurrent: pBuildSlotMap(5),
    pactSlotsMax: 0,
    pactSlotsCurrent: 0,
    pactSlotLevel: 0,
    concentrationSpellId: "",
  }

  // 3rd-level warlock: 2 pact slots at level 2, no regular slots
  pure val WARLOCK_3_SLOTS: SpellSlotState = {
    slotsMax: EMPTY_SLOTS,
    slotsCurrent: EMPTY_SLOTS,
    pactSlotsMax: 2,
    pactSlotsCurrent: 2,
    pactSlotLevel: 2,
    concentrationSpellId: "",
  }

  // -- Expend Slot --

  run test_expend_slot_1st = {
    val ss = pExpendSlot(WIZARD_5_SLOTS, 1)
    // 4 → 3
    assert(ss.slotsCurrent.get(1) == 3)
  }

  run test_expend_slot_2nd = {
    val ss = pExpendSlot(WIZARD_5_SLOTS, 2)
    // 3 → 2
    assert(ss.slotsCurrent.get(2) == 2)
  }

  run test_expend_slot_empty = {
    // 4th level has 0 slots at CL 5
    val ss = pExpendSlot(WIZARD_5_SLOTS, 4)
    assert(ss.slotsCurrent.get(4) == 0)
  }

  run test_expend_slot_to_zero = {
    // 3rd level has 2 slots; expend twice
    val ss = pExpendSlot(pExpendSlot(WIZARD_5_SLOTS, 3), 3)
    assert(ss.slotsCurrent.get(3) == 0)
  }

  run test_expend_slot_at_zero_noop = {
    // Expend 3rd three times: third is noop
    val ss = pExpendSlot(pExpendSlot(pExpendSlot(WIZARD_5_SLOTS, 3), 3), 3)
    assert(ss.slotsCurrent.get(3) == 0)
  }

  // -- Expend Pact Slot --

  run test_expend_pact_slot = {
    val ss = pExpendPactSlot(WARLOCK_3_SLOTS)
    assert(ss.pactSlotsCurrent == 1)
  }

  run test_expend_pact_slot_empty = {
    val ss = pExpendPactSlot(pExpendPactSlot(pExpendPactSlot(WARLOCK_3_SLOTS)))
    // Third expend is noop
    assert(ss.pactSlotsCurrent == 0)
  }

  run test_expend_pact_slot_nonwarlock = {
    val ss = pExpendPactSlot(WIZARD_5_SLOTS)
    assert(ss.pactSlotsCurrent == 0)
  }

  // -- Can Cast At Level --

  run test_can_cast_at_level_exact = {
    // 1st level spell in 1st level slot
    assert(pCanCastAtLevel(WIZARD_5_SLOTS, 1, 1))
  }

  run test_can_cast_at_level_upcast = {
    // 1st level spell in 2nd level slot
    assert(pCanCastAtLevel(WIZARD_5_SLOTS, 1, 2))
  }

  run test_can_cast_at_level_insufficient = {
    // 3rd level spell in 2nd level slot → false
    assert(not(pCanCastAtLevel(WIZARD_5_SLOTS, 3, 2)))
  }

  run test_can_cast_at_level_no_slots = {
    // 4th level spell in 4th level slot → 0 slots at CL 5
    assert(not(pCanCastAtLevel(WIZARD_5_SLOTS, 4, 4)))
  }

  // -- Can Cast With Pact Slot --

  run test_can_cast_pact_valid = {
    // 1st level spell, pact level 2 → true
    assert(pCanCastWithPactSlot(WARLOCK_3_SLOTS, 1))
  }

  run test_can_cast_pact_exact_level = {
    // 2nd level spell, pact level 2 → true
    assert(pCanCastWithPactSlot(WARLOCK_3_SLOTS, 2))
  }

  run test_can_cast_pact_too_high = {
    // 3rd level spell, pact level 2 → false
    assert(not(pCanCastWithPactSlot(WARLOCK_3_SLOTS, 3)))
  }

  run test_can_cast_pact_no_slots = {
    val ss = pExpendPactSlot(pExpendPactSlot(WARLOCK_3_SLOTS))
    assert(not(pCanCastWithPactSlot(ss, 1)))
  }

  // -- Restore Slots --

  run test_restore_all_slots = {
    val spent = pExpendSlot(pExpendSlot(WIZARD_5_SLOTS, 1), 2)
    val restored = pRestoreAllSlots(spent)
    all {
      assert(restored.slotsCurrent.get(1) == 4),
      assert(restored.slotsCurrent.get(2) == 3),
    }
  }

  run test_restore_all_includes_pact = {
    val spent = pExpendPactSlot(WARLOCK_3_SLOTS)
    val restored = pRestoreAllSlots(spent)
    assert(restored.pactSlotsCurrent == 2)
  }

  run test_restore_pact_only = {
    // Hybrid: wizard slots + warlock pact slots
    val hybrid: SpellSlotState = {
      slotsMax: pBuildSlotMap(5),
      slotsCurrent: pBuildSlotMap(5),
      pactSlotsMax: 2,
      pactSlotsCurrent: 0,
      pactSlotLevel: 3,
      concentrationSpellId: "",
    }
    val spent = pExpendSlot(hybrid, 1)
    val restored = pRestorePactSlots(spent)
    all {
      // Pact restored
      assert(restored.pactSlotsCurrent == 2),
      // Regular NOT restored
      assert(restored.slotsCurrent.get(1) == 3),
    }
  }

  // -- Multiclass Caster Level --

  run test_multiclass_cl_full_only = {
    // Wizard 5 → CL 5
    assert(pMulticlassCasterLevel(5, 0, 0) == 5)
  }

  run test_multiclass_cl_half_only = {
    // Paladin 6 → floor(6/2) = 3
    assert(pMulticlassCasterLevel(0, 6, 0) == 3)
  }

  run test_multiclass_cl_third_only = {
    // Eldritch Knight 9 → floor(9/3) = 3
    assert(pMulticlassCasterLevel(0, 0, 9) == 3)
  }

  run test_multiclass_cl_mixed = {
    // Wizard 5 / Paladin 4 / EK 3 → 5 + 2 + 1 = 8
    assert(pMulticlassCasterLevel(5, 4, 3) == 8)
  }

  run test_multiclass_cl_half_rounds_down = {
    // Ranger 3 → floor(3/2) = 1
    assert(pMulticlassCasterLevel(0, 3, 0) == 1)
  }

  run test_multiclass_cl_third_rounds_down = {
    // Arcane Trickster 5 → floor(5/3) = 1
    assert(pMulticlassCasterLevel(0, 0, 5) == 1)
  }

  // -- Slots Per Level (PHB table spot checks) --

  run test_slots_cl1 = {
    all {
      assert(pSlotsPerLevel(1, 1) == 2),
      assert(pSlotsPerLevel(1, 2) == 0),
    }
  }

  run test_slots_cl5 = {
    all {
      assert(pSlotsPerLevel(5, 1) == 4),
      assert(pSlotsPerLevel(5, 2) == 3),
      assert(pSlotsPerLevel(5, 3) == 2),
      assert(pSlotsPerLevel(5, 4) == 0),
    }
  }

  run test_slots_cl9 = {
    all {
      assert(pSlotsPerLevel(9, 4) == 3),
      assert(pSlotsPerLevel(9, 5) == 1),
      assert(pSlotsPerLevel(9, 6) == 0),
    }
  }

  run test_slots_cl17 = {
    all {
      assert(pSlotsPerLevel(17, 5) == 2),
      assert(pSlotsPerLevel(17, 9) == 1),
    }
  }

  run test_slots_cl20 = {
    all {
      assert(pSlotsPerLevel(20, 5) == 3),
      assert(pSlotsPerLevel(20, 6) == 2),
      assert(pSlotsPerLevel(20, 7) == 2),
      assert(pSlotsPerLevel(20, 8) == 1),
      assert(pSlotsPerLevel(20, 9) == 1),
    }
  }

  run test_slots_cl18_5th_level = {
    // CL 18: 5th level slots = 3
    assert(pSlotsPerLevel(18, 5) == 3)
  }

  run test_slots_cl19_6th_level = {
    // CL 19: 6th level slots = 2
    assert(pSlotsPerLevel(19, 6) == 2)
  }

  // -- Build Slot Map --

  run test_build_slot_map_cl5 = {
    val m = pBuildSlotMap(5)
    all {
      assert(m.get(1) == 4),
      assert(m.get(2) == 3),
      assert(m.get(3) == 2),
      assert(m.get(4) == 0),
      assert(m.get(9) == 0),
    }
  }

  run test_build_slot_map_cl0 = {
    // CL 0: no slots at all
    val m = pBuildSlotMap(0)
    all {
      assert(m.get(1) == 0),
      assert(m.get(9) == 0),
    }
  }

  // -- Concentration DC --

  run test_conc_dc_low_damage = {
    // 10 damage → max(10, 5) = 10
    assert(pConcentrationDC(10) == 10)
  }

  run test_conc_dc_high_damage = {
    // 30 damage → min(max(10, 15), 30) = 15
    assert(pConcentrationDC(30) == 15)
  }

  run test_conc_dc_capped_at_30 = {
    assert(pConcentrationDC(70) == 30)
  }

  run test_conc_dc_minimum = {
    // 1 damage → max(10, 0) = 10
    assert(pConcentrationDC(1) == 10)
  }

  run test_conc_dc_exact_20 = {
    // 20 damage → max(10, 10) = 10
    assert(pConcentrationDC(20) == 10)
  }

  run test_conc_dc_22 = {
    // 22 damage → max(10, 11) = 11
    assert(pConcentrationDC(22) == 11)
  }

  // -- Break Concentration --

  run test_break_concentration = {
    val ss = WIZARD_5_SLOTS.with("concentrationSpellId", "bless")
    val result = pBreakConcentration(ss)
    all {
      assert(not(isConcentrating(result))),
      assert(result.concentrationSpellId == ""),
    }
  }

  // -- Start Concentration --

  run test_start_concentration_fresh = {
    val ss = pStartConcentration(WIZARD_5_SLOTS, "hold_person")
    all {
      assert(isConcentrating(ss)),
      assert(ss.concentrationSpellId == "hold_person"),
    }
  }

  run test_start_concentration_replaces = {
    val ss = pStartConcentration(WIZARD_5_SLOTS, "bless")
    val ss2 = pStartConcentration(ss, "hold_person")
    all {
      assert(isConcentrating(ss2)),
      assert(ss2.concentrationSpellId == "hold_person"),
    }
  }

  // -- Concentration Check --

  run test_conc_check_pass = {
    val ss = pStartConcentration(WIZARD_5_SLOTS, "bless")
    val result = pConcentrationCheck(ss, true)
    all {
      assert(isConcentrating(result)),
      assert(result.concentrationSpellId == "bless"),
    }
  }

  run test_conc_check_fail = {
    val ss = pStartConcentration(WIZARD_5_SLOTS, "bless")
    val result = pConcentrationCheck(ss, false)
    all {
      assert(not(isConcentrating(result))),
      assert(result.concentrationSpellId == ""),
    }
  }

  run test_conc_check_not_concentrating = {
    // Fail save but not concentrating → noop
    val result = pConcentrationCheck(WIZARD_5_SLOTS, false)
    assert(not(isConcentrating(result)))
  }

  // -- Component Validation --

  run test_components_all_satisfied = {
    assert(pCanProvideComponents(FRESH20, true, true, true))
  }

  run test_components_no_verbal_paralyzed = {
    val s = pApplyCondition(FRESH20, CParalyzed)
    assert(not(pCanProvideComponents(s, true, false, true)))
  }

  run test_components_no_somatic_no_hand = {
    assert(not(pCanProvideComponents(FRESH20, false, true, false)))
  }

  run test_components_verbal_not_required = {
    val s = pApplyCondition(FRESH20, CParalyzed)
    // V not required → paralysis doesn't matter
    assert(pCanProvideComponents(s, false, false, true))
  }

  run test_components_somatic_not_required = {
    // S not required → no free hand doesn't matter
    assert(pCanProvideComponents(FRESH20, false, false, false))
  }

  run test_components_unconscious_no_verbal = {
    val s = pApplyCondition(FRESH20, CUnconscious)
    assert(not(pCanProvideComponents(s, true, false, true)))
  }

  // -- Existing bonus action spell / armor proficiency integration --

  run test_bonus_action_spell_blocks_action_spell = {
    val t = pMarkBonusActionSpell(BASIC_TURN)
    assert(not(canCastNonCantripAction(t)))
  }

  run test_action_spell_blocks_bonus_spell = {
    val t = pMarkNonCantripActionSpell(BASIC_TURN)
    assert(not(canCastBonusActionSpell(t)))
  }

  run test_armor_blocks_casting = {
    // Wearing chain mail without heavy armor proficiency
    val noProfConfig = TEST_FIGHTER_5.with("armorProficiencies", Set(LightArmor, MediumArmor))
    assert(lacksArmorProficiency(WearingArmor(CHAIN_MAIL), noProfConfig.armorProficiencies))
  }

  run test_armor_proficient_allows_casting = {
    assert(not(lacksArmorProficiency(WearingArmor(CHAIN_MAIL), TEST_FIGHTER_5.armorProficiencies)))
  }

  // ============================================================
  // Phase 7: Resting & Recovery
  // ============================================================

  // -- Test Fixtures --

  /// Fighter at level 5, 30 max HP, taken 15 damage, 3 of 5 HD remaining
  pure val WOUNDED_FIGHTER: CreatureState =
    freshCreature(30).with("hp", 15).with("hitPointDiceRemaining", 3)

  /// Fighter at level 5, full HP, all 5 HD available
  pure val RESTED_FIGHTER: CreatureState =
    freshCreature(30).with("hitPointDiceRemaining", 5)

  // CON mod for fighter (Con 14 → +2)
  pure val FIGHTER_CON_MOD: int = 2

  // -- pSpendHitDie --

  run test_spend_hd_basic = {
    // Roll 6 + CON mod 2 = 8 healing. HP 15 → 23. HD 3 → 2.
    val s = pSpendHitDie(WOUNDED_FIGHTER, FIGHTER_CON_MOD, 6)
    all {
      assert(s.hp == 23),
      assert(s.hitPointDiceRemaining == 2),
    }
  }

  run test_spend_hd_caps_at_max = {
    // Roll 10 + 2 = 12 healing. HP 15 + 12 = 27, capped at maxHp 30. HD 3 → 2.
    val s = pSpendHitDie(WOUNDED_FIGHTER, FIGHTER_CON_MOD, 10)
    all {
      assert(s.hp == 27),
      assert(s.hitPointDiceRemaining == 2),
    }
  }

  run test_spend_hd_no_dice_remaining = {
    // 0 HD remaining → no-op
    val s = WOUNDED_FIGHTER.with("hitPointDiceRemaining", 0)
    val result = pSpendHitDie(s, FIGHTER_CON_MOD, 8)
    all {
      assert(result.hp == 15),
      assert(result.hitPointDiceRemaining == 0),
    }
  }

  run test_spend_hd_dead_noop = {
    val s = WOUNDED_FIGHTER.with("dead", true)
    val result = pSpendHitDie(s, FIGHTER_CON_MOD, 6)
    assert(result.hp == 15)
  }

  run test_spend_hd_negative_con_mod = {
    // CON mod -1, roll 2 → 2 + (-1) = 1 healing. HP 15 → 16.
    val s = pSpendHitDie(WOUNDED_FIGHTER, -1, 2)
    all {
      assert(s.hp == 16),
      assert(s.hitPointDiceRemaining == 2),
    }
  }

  run test_spend_hd_negative_total_floors_to_zero = {
    // CON mod -3, roll 1 → 1 + (-3) = -2 → min 0 → no healing
    val s = pSpendHitDie(WOUNDED_FIGHTER, -3, 1)
    all {
      assert(s.hp == 15),
      assert(s.hitPointDiceRemaining == 2),
    }
  }

  run test_spend_hd_at_0hp_regains_consciousness = {
    // 0 HP, spend HD → heals and regains consciousness
    val s = pApplyCondition(
      freshCreature(20).with("hp", 0).with("hitPointDiceRemaining", 3),
      CUnconscious
    )
    val result = pSpendHitDie(s, FIGHTER_CON_MOD, 4)
    all {
      assert(result.hp == 6),
      assert(not(result.unconscious)),
      assert(result.hitPointDiceRemaining == 2),
    }
  }

  // -- pShortRest --

  run test_short_rest_multiple_rolls = {
    // 3 HD remaining. Spend 2: roll 5 (+2=7), roll 3 (+2=5). HP 15 → 27. HD 3 → 1.
    val s = pShortRest(WOUNDED_FIGHTER, FIGHTER_CON_MOD, [5, 3])
    all {
      assert(s.hp == 27),
      assert(s.hitPointDiceRemaining == 1),
    }
  }

  run test_short_rest_empty_rolls = {
    // No HD spent → unchanged
    val s = pShortRest(WOUNDED_FIGHTER, FIGHTER_CON_MOD, [])
    all {
      assert(s.hp == 15),
      assert(s.hitPointDiceRemaining == 3),
    }
  }

  run test_short_rest_exceeds_hd = {
    // 3 HD remaining, try to spend 5 → only first 3 take effect
    val s = pShortRest(WOUNDED_FIGHTER, FIGHTER_CON_MOD, [4, 4, 4, 4, 4])
    // 3 rolls of 4+2=6 each → 18 healing. HP 15 → 30 (capped). HD 3 → 0.
    all {
      assert(s.hp == 30),
      assert(s.hitPointDiceRemaining == 0),
    }
  }

  run test_short_rest_caps_hp = {
    // Nearly full HP, one roll: 28 HP, roll 8 + 2 = 10 → cap at 30
    val s = WOUNDED_FIGHTER.with("hp", 28)
    val result = pShortRest(s, FIGHTER_CON_MOD, [8])
    assert(result.hp == 30)
  }

  // -- pLongRest --

  run test_long_rest_full_hp = {
    val s = pLongRest(WOUNDED_FIGHTER, 5)
    assert(s.hp == 30)
  }

  run test_long_rest_hd_recovery_all = {
    val s = pLongRest(WOUNDED_FIGHTER, 5)
    assert(s.hitPointDiceRemaining == 5)
  }

  run test_long_rest_hd_recovery_from_zero = {
    // 0 of 5 HD remaining → all recovered
    val s0 = WOUNDED_FIGHTER.with("hitPointDiceRemaining", 0)
    val s = pLongRest(s0, 5)
    assert(s.hitPointDiceRemaining == 5)
  }

  run test_long_rest_clears_temp_hp = {
    val s0 = WOUNDED_FIGHTER.with("tempHp", 10)
    val s = pLongRest(s0, 5)
    assert(s.tempHp == 0)
  }

  run test_long_rest_exhaustion_reduces = {
    val s0 = WOUNDED_FIGHTER.with("exhaustion", 2)
    val s = pLongRest(s0, 5)
    assert(s.exhaustion == 1)
  }

  run test_long_rest_0hp_noop = {
    // Must have >= 1 HP to benefit
    val s0 = WOUNDED_FIGHTER.with("hp", 0)
    val s = pLongRest(s0, 5)
    all {
      assert(s.hp == 0),
      assert(s.hitPointDiceRemaining == 3),
    }
  }

  run test_long_rest_exhaustion4_then_heal = {
    // Exhaustion 4 → after rest: exhaustion drops to 3,
    // effectiveMaxHp = 30, HP restored to 30.
    val s0 = WOUNDED_FIGHTER.with("exhaustion", 4)
    val s = pLongRest(s0, 5)
    all {
      assert(s.exhaustion == 3),
      assert(s.hp == 30),
    }
  }

  run test_long_rest_already_full = {
    // Already at full HP and HD → no change (besides temp HP clear + exhaustion reduction)
    val s0 = RESTED_FIGHTER.with("tempHp", 5)
    val s = pLongRest(s0, 5)
    all {
      assert(s.hp == 30),
      assert(s.hitPointDiceRemaining == 5),
      assert(s.tempHp == 0),
    }
  }

  // ============================================================
  // Phase 8: Environmental Rules
  // ============================================================

  // -- 17.1 Falling --

  run test_falling_dice_10ft = assert(pFallingDamageDice(10) == 1)
  run test_falling_dice_50ft = assert(pFallingDamageDice(50) == 5)
  run test_falling_dice_200ft = assert(pFallingDamageDice(200) == 20)
  run test_falling_dice_300ft_capped = assert(pFallingDamageDice(300) == 20)
  run test_falling_dice_5ft = assert(pFallingDamageDice(5) == 0)
  run test_falling_dice_0ft = assert(pFallingDamageDice(0) == 0)

  run test_fall_damage_and_prone = {
    val s = freshCreature(30)
    val s1 = pApplyFall(s, 10, Set(), Set(), Set())
    all {
      assert(s1.hp == 20),
      assert(s1.prone),
    }
  }

  run test_fall_no_damage_no_prone = {
    // 0 damage roll (< 10ft fall) → no prone
    val s = freshCreature(30)
    val s1 = pApplyFall(s, 0, Set(), Set(), Set())
    all {
      assert(s1.hp == 30),
      assert(not(s1.prone)),
    }
  }

  run test_fall_immune_bludgeoning = {
    // Immune to bludgeoning → no damage, no prone
    val s = freshCreature(30)
    val s1 = pApplyFall(s, 10, Set(), Set(), Set(Bludgeoning))
    all {
      assert(s1.hp == 30),
      assert(not(s1.prone)),
    }
  }

  run test_fall_resistant_bludgeoning = {
    // Resistant: 10 → 5 damage, still prone
    val s = freshCreature(30)
    val s1 = pApplyFall(s, 10, Set(Bludgeoning), Set(), Set())
    all {
      assert(s1.hp == 25),
      assert(s1.prone),
    }
  }

  run test_fall_vulnerable_bludgeoning = {
    // Vulnerable: 10 → 20 damage, prone
    val s = freshCreature(30)
    val s1 = pApplyFall(s, 10, Set(), Set(Bludgeoning), Set())
    all {
      assert(s1.hp == 10),
      assert(s1.prone),
    }
  }

  run test_fall_kills = {
    // Fall damage exceeds HP → 0 HP, unconscious (includes prone)
    val s = freshCreature(10)
    val s1 = pApplyFall(s, 15, Set(), Set(), Set())
    all {
      assert(s1.hp == 0),
      assert(s1.prone),
      assert(s1.unconscious),
    }
  }

  run test_fall_with_temp_hp = {
    // Temp HP absorbs some damage, still prone
    val s = freshCreature(30).with("tempHp", 5)
    val s1 = pApplyFall(s, 8, Set(), Set(), Set())
    all {
      assert(s1.tempHp == 0),
      assert(s1.hp == 27),
      assert(s1.prone),
    }
  }

  // -- 17.2 Suffocation --

  run test_hold_breath_positive_con = assert(pHoldBreathRounds(2) == 30) // 3 minutes
  run test_hold_breath_zero_con = assert(pHoldBreathRounds(0) == 10) // 1 minute
  run test_hold_breath_neg1_con = assert(pHoldBreathRounds(-1) == 5) // 30 sec minimum
  run test_hold_breath_neg3_con = assert(pHoldBreathRounds(-3) == 5) // 30 sec minimum

  run test_suffocation_rounds_positive = assert(pSuffocationRounds(3) == 3)
  run test_suffocation_rounds_zero = assert(pSuffocationRounds(0) == 1) // min 1
  run test_suffocation_rounds_negative = assert(pSuffocationRounds(-2) == 1) // min 1

  run test_suffocate_drops_to_0 = {
    val s = freshCreature(30)
    val s1 = pSuffocate(s)
    all {
      assert(s1.hp == 0),
      assert(s1.unconscious),
      assert(s1.prone),
    }
  }

  run test_suffocate_already_0hp = {
    // Already at 0 → no-op
    val s = freshCreature(30).with("hp", 0)
    val s1 = pSuffocate(s)
    assert(s1 == s)
  }

  run test_suffocate_dead = {
    val s = freshCreature(30).with("dead", true)
    val s1 = pSuffocate(s)
    assert(s1 == s)
  }

  // -- 17.3 Vision & Light --

  run test_illumination_bright = assert(pIlluminationObscurement(Bright) == Unobscured)
  run test_illumination_dim = assert(pIlluminationObscurement(Dim) == LightlyObscured)
  run test_illumination_dark = assert(pIlluminationObscurement(Dark) == HeavilyObscured)

  run test_darkvision_bright = assert(pEffectiveObscurement(Bright, true) == Unobscured)
  run test_darkvision_dim = assert(pEffectiveObscurement(Dim, true) == Unobscured)
  run test_darkvision_dark = assert(pEffectiveObscurement(Dark, true) == LightlyObscured)
  run test_no_darkvision_dark = assert(pEffectiveObscurement(Dark, false) == HeavilyObscured)

  run test_blinded_by_heavy_obscurement = assert(pBlindedByObscurement(HeavilyObscured))
  run test_not_blinded_by_light = assert(not(pBlindedByObscurement(LightlyObscured)))
  run test_not_blinded_unobscured = assert(not(pBlindedByObscurement(Unobscured)))

  run test_perception_disadv_light = assert(pPerceptionDisadvantage(LightlyObscured))
  run test_perception_disadv_heavy = assert(pPerceptionDisadvantage(HeavilyObscured))
  run test_no_perception_disadv_unobscured = assert(not(pPerceptionDisadvantage(Unobscured)))

  // -- 17.4 Food & Water --

  run test_starvation_threshold_positive = assert(pStarvationThreshold(2) == 5)
  run test_starvation_threshold_zero = assert(pStarvationThreshold(0) == 3)
  run test_starvation_threshold_negative = assert(pStarvationThreshold(-3) == 1) // min 1
  run test_starvation_threshold_very_negative = assert(pStarvationThreshold(-5) == 1)

  run test_starvation_adds_1_exhaustion = {
    val s = freshCreature(30)
    val s1 = pApplyStarvation(s)
    assert(s1.exhaustion == 1)
  }

  run test_dehydration_no_water_fresh = {
    // No water, not yet exhausted → 1 level
    val s = freshCreature(30)
    val s1 = pApplyDehydration(s, false, false)
    assert(s1.exhaustion == 1)
  }

  run test_dehydration_no_water_already_exhausted = {
    // No water, already exhausted → 2 levels
    val s = freshCreature(30).with("exhaustion", 1)
    val s1 = pApplyDehydration(s, false, false)
    assert(s1.exhaustion == 3)
  }

  run test_dehydration_half_water_save_fails = {
    // Half water, failed save, not exhausted → 1 level
    val s = freshCreature(30)
    val s1 = pApplyDehydration(s, true, false)
    assert(s1.exhaustion == 1)
  }

  run test_dehydration_half_water_save_succeeds = {
    // Half water, passed save → no effect
    val s = freshCreature(30)
    val s1 = pApplyDehydration(s, true, true)
    assert(s1.exhaustion == 0)
  }

  run test_dehydration_half_water_already_exhausted_fail = {
    // Half water, failed save, already exhausted → 2 levels
    val s = freshCreature(30).with("exhaustion", 2)
    val s1 = pApplyDehydration(s, true, false)
    assert(s1.exhaustion == 4)
  }

  run test_dehydration_escalation_causes_death = {
    // Exhaustion 5 + dehydration (2 levels) → 6 → dead
    val s = freshCreature(30).with("exhaustion", 5)
    val s1 = pApplyDehydration(s, false, false)
    all {
      assert(s1.exhaustion == 6),
      assert(s1.dead),
    }
  }

  // -- 17.5 Travel & Forced March --

  run test_travel_feet_fast = assert(pTravelFeetPerMinute(PaceFast) == 400)
  run test_travel_feet_normal = assert(pTravelFeetPerMinute(PaceNormal) == 300)
  run test_travel_feet_slow = assert(pTravelFeetPerMinute(PaceSlow) == 200)

  run test_travel_mph_fast = assert(pTravelMilesPerHour(PaceFast) == 4)
  run test_travel_mph_normal = assert(pTravelMilesPerHour(PaceNormal) == 3)
  run test_travel_mph_slow = assert(pTravelMilesPerHour(PaceSlow) == 2)

  run test_travel_mpd_fast = assert(pTravelMilesPerDay(PaceFast) == 30)
  run test_travel_mpd_normal = assert(pTravelMilesPerDay(PaceNormal) == 24)
  run test_travel_mpd_slow = assert(pTravelMilesPerDay(PaceSlow) == 18)

  run test_travel_perception_fast = assert(pTravelPerceptionPenalty(PaceFast) == -5)
  run test_travel_perception_normal = assert(pTravelPerceptionPenalty(PaceNormal) == 0)
  run test_travel_perception_slow = assert(pTravelPerceptionPenalty(PaceSlow) == 0)

  run test_stealth_slow = assert(pCanStealthWhileTraveling(PaceSlow))
  run test_stealth_normal = assert(not(pCanStealthWhileTraveling(PaceNormal)))
  run test_stealth_fast = assert(not(pCanStealthWhileTraveling(PaceFast)))

  run test_difficult_terrain = assert(pDifficultTerrainTravel(300) == 150)
  run test_difficult_terrain_odd = assert(pDifficultTerrainTravel(301) == 150)

  run test_forced_march_dc_8hrs = assert(pForcedMarchDC(8) == 0)
  run test_forced_march_dc_9hrs = assert(pForcedMarchDC(9) == 11)
  run test_forced_march_dc_10hrs = assert(pForcedMarchDC(10) == 12)
  run test_forced_march_dc_12hrs = assert(pForcedMarchDC(12) == 14)

  // ============================================================
  // Phase 9: Character Construction & Leveling
  // ============================================================

  // -- 18.1 Class Hit Dice --

  run test_class_hd_barbarian = assert(pClassHitDie(Barbarian) == 12)
  run test_class_hd_fighter = assert(pClassHitDie(Fighter) == 10)
  run test_class_hd_paladin = assert(pClassHitDie(Paladin) == 10)
  run test_class_hd_ranger = assert(pClassHitDie(Ranger) == 10)
  run test_class_hd_bard = assert(pClassHitDie(Bard) == 8)
  run test_class_hd_cleric = assert(pClassHitDie(Cleric) == 8)
  run test_class_hd_rogue = assert(pClassHitDie(Rogue) == 8)
  run test_class_hd_wizard = assert(pClassHitDie(Wizard) == 6)
  run test_class_hd_sorcerer = assert(pClassHitDie(Sorcerer) == 6)

  // -- 18.2 Point Buy --

  run test_point_buy_cost_8 = assert(pPointBuyCost(8) == 0)
  run test_point_buy_cost_10 = assert(pPointBuyCost(10) == 2)
  run test_point_buy_cost_13 = assert(pPointBuyCost(13) == 5)
  run test_point_buy_cost_14 = assert(pPointBuyCost(14) == 7)
  run test_point_buy_cost_15 = assert(pPointBuyCost(15) == 9)

  run test_point_buy_total_standard = {
    // 15(9) + 14(7) + 13(5) + 12(4) + 10(2) + 8(0) = 27
    assert(pPointBuyTotalCost([15, 14, 13, 12, 10, 8]) == 27)
  }

  run test_point_buy_total_flat = {
    // 13(5) * 3 + 12(4) * 3 = 15 + 12 = 27
    assert(pPointBuyTotalCost([13, 13, 13, 12, 12, 12]) == 27)
  }

  run test_valid_point_buy_standard = {
    assert(pValidPointBuy([15, 14, 13, 12, 10, 8]))
  }

  run test_valid_point_buy_all_equal = {
    // 13(5)*3 + 12(4)*3 = 27
    assert(pValidPointBuy([13, 13, 13, 12, 12, 12]))
  }

  run test_invalid_point_buy_too_expensive = {
    // 15(9)*3 + 8(0)*3 = 27, ok. 15(9)*3 + 15(9) + 8(0)*2 = 36 > 27
    assert(not(pValidPointBuy([15, 15, 15, 15, 8, 8])))
  }

  run test_invalid_point_buy_score_too_high = {
    assert(not(pValidPointBuy([16, 14, 13, 12, 10, 8])))
  }

  run test_invalid_point_buy_score_too_low = {
    assert(not(pValidPointBuy([15, 14, 13, 12, 10, 7])))
  }

  run test_invalid_point_buy_wrong_count = {
    assert(not(pValidPointBuy([15, 14, 13, 12, 10])))
  }

  // -- 18.3 XP & Level --

  run test_xp_for_level_1 = assert(pXpForLevel(1) == 0)
  run test_xp_for_level_2 = assert(pXpForLevel(2) == 300)
  run test_xp_for_level_5 = assert(pXpForLevel(5) == 6500)
  run test_xp_for_level_10 = assert(pXpForLevel(10) == 64000)
  run test_xp_for_level_20 = assert(pXpForLevel(20) == 355000)

  run test_level_for_xp_0 = assert(pLevelForXp(0) == 1)
  run test_level_for_xp_299 = assert(pLevelForXp(299) == 1)
  run test_level_for_xp_300 = assert(pLevelForXp(300) == 2)
  run test_level_for_xp_6500 = assert(pLevelForXp(6500) == 5)
  run test_level_for_xp_6499 = assert(pLevelForXp(6499) == 4)
  run test_level_for_xp_355000 = assert(pLevelForXp(355000) == 20)
  run test_level_for_xp_huge = assert(pLevelForXp(1000000) == 20)

  // -- HP on Level Up --

  run test_first_level_hp_fighter = {
    // d10 + CON mod 2 = 12
    assert(pFirstLevelHp(10, 2) == 12)
  }

  run test_first_level_hp_wizard_low_con = {
    // d6 + CON mod -1 = 5
    assert(pFirstLevelHp(6, -1) == 5)
  }

  run test_first_level_hp_min_1 = {
    // d6 + CON mod -7 → max(1, -1) = 1
    assert(pFirstLevelHp(6, -7) == 1)
  }

  run test_level_up_hp_normal = {
    // Roll 6 + CON mod 2 = 8
    assert(pLevelUpHp(6, 2) == 8)
  }

  run test_level_up_hp_low_roll = {
    // Roll 1 + CON mod -1 = 0 → min 1
    assert(pLevelUpHp(1, -1) == 1)
  }

  run test_level_up_hp_negative_total = {
    // Roll 1 + CON mod -3 = -2 → min 1
    assert(pLevelUpHp(1, -3) == 1)
  }

  // -- ASI --

  run test_is_asi_level_4 = assert(pIsASILevel(4))
  run test_is_asi_level_8 = assert(pIsASILevel(8))
  run test_is_asi_level_12 = assert(pIsASILevel(12))
  run test_is_asi_level_16 = assert(pIsASILevel(16))
  run test_is_asi_level_19 = assert(pIsASILevel(19))
  run test_not_asi_level_1 = assert(not(pIsASILevel(1)))
  run test_not_asi_level_5 = assert(not(pIsASILevel(5)))
  run test_not_asi_level_20 = assert(not(pIsASILevel(20)))

  // Test fixture: ability scores for ASI tests
  pure val TEST_SCORES: Ability -> int =
    Map(Str -> 14, Dex -> 12, Con -> 13, Int_ -> 10, Wis -> 8, Cha -> 15)

  run test_apply_asi_plus_2 = {
    val scores = pApplyASI(TEST_SCORES, Str, 2)
    assert(scores.get(Str) == 16)
  }

  run test_apply_asi_plus_1 = {
    val scores = pApplyASI(TEST_SCORES, Dex, 1)
    assert(scores.get(Dex) == 13)
  }

  run test_apply_asi_cap_at_20 = {
    // CHA 15 + 2 = 17, fine. But if score were 19:
    val scores = pApplyASI(TEST_SCORES.set(Cha, 19), Cha, 2)
    assert(scores.get(Cha) == 20)
  }

  run test_apply_asi_already_20 = {
    val scores = pApplyASI(TEST_SCORES.set(Str, 20), Str, 2)
    assert(scores.get(Str) == 20)
  }

  run test_apply_asi_two_abilities = {
    // +1 STR, +1 CON
    val scores = pApplyASI(pApplyASI(TEST_SCORES, Str, 1), Con, 1)
    all {
      assert(scores.get(Str) == 15),
      assert(scores.get(Con) == 14),
    }
  }

  run test_con_mod_hp_adjustment = {
    // CON mod goes from +1 to +2 at level 8 → +8 HP
    assert(pConModHpAdjustment(1, 2, 8) == 8)
  }

  run test_con_mod_hp_adjustment_two_point = {
    // CON mod goes from +2 to +4 at level 5 → +10 HP
    assert(pConModHpAdjustment(2, 4, 5) == 10)
  }

  run test_con_mod_hp_adjustment_no_change = {
    assert(pConModHpAdjustment(3, 3, 10) == 0)
  }

  // -- 18.4 Multiclassing Prerequisites --

  pure val MC_SCORES: Ability -> int =
    Map(Str -> 15, Dex -> 14, Con -> 12, Int_ -> 10, Wis -> 13, Cha -> 8)

  run test_mc_prereq_barbarian_pass = assert(pMeetsMulticlassPrereq(MC_SCORES, Barbarian))
  run test_mc_prereq_bard_fail = assert(not(pMeetsMulticlassPrereq(MC_SCORES, Bard))) // CHA 8
  run test_mc_prereq_cleric_pass = assert(pMeetsMulticlassPrereq(MC_SCORES, Cleric)) // WIS 13
  run test_mc_prereq_fighter_str = assert(pMeetsMulticlassPrereq(MC_SCORES, Fighter)) // STR 15

  run test_mc_prereq_fighter_dex = {
    // STR 10, DEX 14 → Fighter prereq (STR 13 OR DEX 13) passes via DEX
    val scores = MC_SCORES.set(Str, 10)
    assert(pMeetsMulticlassPrereq(scores, Fighter))
  }

  run test_mc_prereq_fighter_neither = {
    val scores = MC_SCORES.set(Str, 10).set(Dex, 10)
    assert(not(pMeetsMulticlassPrereq(scores, Fighter)))
  }

  run test_mc_prereq_monk_both = {
    // DEX 14 AND WIS 13 → passes
    assert(pMeetsMulticlassPrereq(MC_SCORES, Monk))
  }

  run test_mc_prereq_monk_missing_wis = {
    val scores = MC_SCORES.set(Wis, 10)
    assert(not(pMeetsMulticlassPrereq(scores, Monk)))
  }

  run test_mc_prereq_paladin_both = {
    // STR 15 AND CHA 8 → fails (CHA < 13)
    assert(not(pMeetsMulticlassPrereq(MC_SCORES, Paladin)))
  }

  run test_mc_prereq_wizard_fail = {
    // INT 10 < 13
    assert(not(pMeetsMulticlassPrereq(MC_SCORES, Wizard)))
  }

  run test_mc_prereq_exact_13 = {
    // Score exactly 13 meets the prereq
    assert(pMeetsMulticlassPrereq(MC_SCORES, Cleric)) // WIS 13
  }

  run test_can_multiclass_both_meet = {
    // Fighter (STR 15) → Cleric (WIS 13): both meet
    assert(pCanMulticlass(MC_SCORES, Fighter, Cleric))
  }

  run test_can_multiclass_current_fails = {
    // Bard (CHA 8) → Cleric (WIS 13): current fails
    assert(not(pCanMulticlass(MC_SCORES, Bard, Cleric)))
  }

  run test_can_multiclass_new_fails = {
    // Fighter (STR 15) → Wizard (INT 10): new fails
    assert(not(pCanMulticlass(MC_SCORES, Fighter, Wizard)))
  }

  // -- Extra Attack & Unarmored Defense stacking --

  run test_extra_attack_stacks_first = assert(pExtraAttackStacks(false))
  run test_extra_attack_no_stack = assert(not(pExtraAttackStacks(true)))

  run test_can_gain_ud_first = assert(pCanGainUnarmoredDefense(NoUnarmoredDefense))
  run test_cant_gain_ud_barbarian = assert(not(pCanGainUnarmoredDefense(BarbarianUD)))
  run test_cant_gain_ud_monk = assert(not(pCanGainUnarmoredDefense(MonkUD)))

  // ============================================================
  // Invariant Verification (MBT trace tests)
  // ============================================================
  // These tests verify that allInvariants hold across multi-step traces.
  // Complement `quint run --invariant=allInvariants` with deterministic traces.

  run test_invariants_5steps =
    init.then(step).then(step).then(step).then(step).then(step)
        .then(all { assert(allInvariants), state' = state, turnState' = turnState, spellSlots' = spellSlots })

  run test_invariants_10steps =
    init
      .then(step).then(step).then(step).then(step).then(step)
      .then(step).then(step).then(step).then(step).then(step)
      .then(all { assert(allInvariants), state' = state, turnState' = turnState, spellSlots' = spellSlots })

  run test_invariants_20steps =
    init
      .then(step).then(step).then(step).then(step).then(step)
      .then(step).then(step).then(step).then(step).then(step)
      .then(step).then(step).then(step).then(step).then(step)
      .then(step).then(step).then(step).then(step).then(step)
      .then(all { assert(allInvariants), state' = state, turnState' = turnState, spellSlots' = spellSlots })

  // Individual invariant tests on known state constructions
  run test_inv_deadIsAbsorbing_construction = {
    val s = freshCreature(20).with("dead", true).with("hp", 0)
    all {
      assert(pTakeDamage(s, 10, Slashing, Set(), Set(), Set(), false) == s),
      assert(pHeal(s, 10) == s),
      assert(pDeathSave(s, 15) == s),
    }
  }

  run test_inv_stableImpliesDeathSavesReset_construction = {
    val s = freshCreature(20).with("hp", 0).with("stable", true)
    all {
      assert(s.deathSaves.successes == 0),
      assert(s.deathSaves.failures == 0),
    }
  }

  run test_inv_paralyzedImpliesIncap_via_apply = {
    val s = pApplyCondition(freshCreature(20), CParalyzed)
    all {
      assert(s.paralyzed),
      assert(s.incapacitatedSources.contains(ISParalyzed)),
      assert(isIncapacitated(s)),
    }
  }

  run test_inv_unconsciousImpliesProne_via_apply = {
    val s = pApplyCondition(freshCreature(20), CUnconscious)
    all {
      assert(s.unconscious),
      assert(s.prone),
      assert(isIncapacitated(s)),
    }
  }

  run test_inv_prone_not_removed_while_unconscious = {
    val s = pApplyCondition(freshCreature(20), CUnconscious)
    val s1 = pRemoveCondition(s, CProne)
    // Prone should NOT be removed while unconscious
    assert(s1.prone)
  }

  run test_inv_exhaustion6_implies_dead = {
    val s = pAddExhaustion(freshCreature(20), 6)
    all { assert(s.dead), assert(s.hp == 0) }
  }

  run test_inv_hp_bounded_after_heal = {
    val s = pHeal(freshCreature(20), 100)
    assert(s.hp <= s.maxHp)
  }

  run test_inv_death_saves_bounded_nat1_at_2_failures = {
    val s = freshCreature(20).with("hp", 0)
              .with("deathSaves", { successes: 0, failures: 2 })
    val s1 = pDeathSave(s, 1) // nat 1 = +2 failures, but should clamp to 3
    all { assert(s1.deathSaves.failures <= 3), assert(s1.dead) }
  }
}
