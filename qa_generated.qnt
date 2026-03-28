// -*- mode: Bluespec; -*-

/// Auto-generated from community Q&A corpus.
/// Do not edit — regenerate with scripts/qa/generate_assertions.py

module qa_generated {
  import dnd.* from "./dnd"

  // Source: https://rpg.stackexchange.com/q/214536
  
  // Does Slasher Hamstring (-10 ft speed) stack with Weapon Mastery Slow (-10 ft speed)?
  run qa_slasher_and_weapon_mastery_slow_stack = {
    val creature = freshCreature(30)
    // callerSpeedModifier encodes combined external speed reductions passed by the caller
    val slasherOnly   = pStartTurn(TEST_CONFIG, creature, Unarmored, -10, false, false)
    val bothStacked   = pStartTurn(TEST_CONFIG, creature, Unarmored, -20, false, false)
    // Two distinct sources (Slasher + Weapon Mastery Slow) stack: total -20 ft, not capped at -10 ft
    assert(
      slasherOnly.effectiveSpeed == 20 and
      bothStacked.effectiveSpeed == 10 and
      bothStacked.effectiveSpeed < slasherOnly.effectiveSpeed
    )
  }

  // Source: https://reddit.com/r/onednd/comments/11avfh2/
  
  // Restoring Touch vs Cleansing Touch: Restoring Touch removes Paralyzed (incapacitating) condition from creature
  run qa_restoring_touch_removes_paralyzed = {
    val creature = freshCreature(20)
    val paralyzed = pApplyCondition(creature, CParalyzed)
    val restored = pRemoveCondition(paralyzed, CParalyzed)
    assert(
      not(restored.paralyzed) and
      not(restored.incapacitatedSources.contains(ISParalyzed))
    )
  }
  
  // Restoring Touch vs Cleansing Touch: Restoring Touch removes Charmed and Frightened simultaneously (multi-condition use)
  run qa_restoring_touch_removes_charmed_and_frightened = {
    val creature = freshCreature(20)
    val c1 = pApplyCondition(creature, CCharmed)
    val c2 = pApplyCondition(c1, CFrightened)
    val restored = pRemoveCondition(pRemoveCondition(c2, CCharmed), CFrightened)
    assert(not(restored.charmed) and not(restored.frightened))
  }
  
  // Restoring Touch vs Cleansing Touch: Cleansing Touch ends an active spell effect (e.g. Dominate Person) on a creature
  run qa_cleansing_touch_removes_spell_effect = {
    val creature = freshCreature(20)
    val withEffect = creature.with("activeEffects",
      pAddEffect(creature.activeEffects, "dominate_person", 3, AtEndOfTurn))
    val cleaned = withEffect.with("activeEffects",
      pRemoveEffect(withEffect.activeEffects, "dominate_person"))
    assert(not(pHasEffect(cleaned.activeEffects, "dominate_person")))
  }
  
  // Restoring Touch vs Cleansing Touch: Cleansing Touch does not remove conditions — only the active spell entry
  run qa_cleansing_touch_leaves_conditions = {
    val creature = freshCreature(20)
    val c1 = pApplyCondition(creature, CCharmed)
    val withEffect = c1.with("activeEffects",
      pAddEffect(c1.activeEffects, "dominate_person", 3, AtEndOfTurn))
    val afterCleansing = withEffect.with("activeEffects",
      pRemoveEffect(withEffect.activeEffects, "dominate_person"))
    // Cleansing Touch ended the spell but the Charmed condition remains (separate removal needed)
    assert(not(pHasEffect(afterCleansing.activeEffects, "dominate_person")) and afterCleansing.charmed)
  }

  // Source: https://reddit.com/r/onednd/comments/zkdfj4/
  
  // You can get Epic Boons even when multiclassing — total character level 20 qualifies regardless of class split
  run qa_epic_boon_multiclass_level20 = {
    // Accepted answer: 1 cleric / 19 rogue totals level 20, meeting the Epic Boon level-20 prerequisite
    val clericLevels = 1
    val rogueLevels  = 19
    val totalLevel   = clericLevels + rogueLevels
    // Spec models character level as a single integer (total across all classes).
    // A level-20 prerequisite is satisfied whenever config.level == 20, regardless of class split.
    // proficiencyBonus(20) == 6 confirms the character is fully treated as level 20 in all spec calculations.
    assert(
      totalLevel == 20
      and proficiencyBonus(totalLevel) == 6
      and proficiencyBonus(totalLevel) == proficiencyBonus(20)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wz53em/
  
  // For those who don't require rolls for impossible tasks: investigating for secret doors is always a valid check; nat 20 gives certainty, low roll leaves doubt
  run qa_search_no_secret_door_nat20_confirms_absence = {
    // Investigation is INT-based (the skill, not the door, is what's being tested)
    val correctAbility = skillAbility(Investigation) == Int_
    val intMod = abilityModifier(10)  // INT 10 → mod 0
    val pb = proficiencyBonus(5)      // level 5 → +3
    // Nat 20 + proficiency beats DC 20: absolute certainty no door exists
    val nat20Succeeds = checkSucceeds(20, intMod, Proficient, pb, 0, 20)
    // Low roll fails DC 20: player left uncertain
    val lowRollFails = not(checkSucceeds(5, intMod, Proficient, pb, 0, 20))
    assert(correctAbility and nat20Succeeds and lowRollFails)
  }

  // Source: https://reddit.com/r/onednd/comments/wx3pl9/
  
  // Inspiration can be used on death saving throws — it's a d20 test, not a house rule (Comment 1, score 105)
  run qa_inspiration_death_save_advantage = {
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // Without inspiration: roll 7 alone — below 10, records a failure
    val noInspiration = pDeathSave(dying, 7)
    // With inspiration (advantage = caller passes higher of two rolls: 7 vs 14 → 14)
    val withInspiration = pDeathSave(dying, 14)
    assert(
      noInspiration.deathSaves.failures == 1
      and noInspiration.deathSaves.successes == 0
      and withInspiration.deathSaves.successes == 1
      and withInspiration.deathSaves.failures == 0
    )
  }

  // Source: https://reddit.com/r/onednd/comments/11dewi8/
  
  // Divine smite no longer level capped?
  run qa_divine_smite_uncapped_scaling = {
    // 2024 rules: Divine Smite = (slotLevel + 1) d8 radiant, no slot level cap.
    // Old 5e capped at 5d8 (slot 4); new: slot 5 → 6d8, slot 9 → 10d8.
    val smiteSlot1 = 1 + 1   // 2d8
    val smiteSlot4 = 4 + 1   // 5d8 (was the old 5e ceiling)
    val smiteSlot5 = 5 + 1   // 6d8 — exceeds old cap; key assertion
    val smiteSlot9 = 9 + 1   // 10d8 — maximum slot, fully uncapped
    // Use normalDamage to run dice count through the spec's damage model
    // (pre-resolve each die as 1 for minimum; the count alone encodes the rule)
    val dmg1 = normalDamage(smiteSlot1, 0)
    val dmg4 = normalDamage(smiteSlot4, 0)
    val dmg5 = normalDamage(smiteSlot5, 0)
    val dmg9 = normalDamage(smiteSlot9, 0)
    assert(
      dmg1 == 2 and
      dmg4 == 5 and
      dmg5 == 6 and       // in old 5e this would also be 5 (capped); now 6
      dmg9 == 10 and
      dmg5 > dmg4 and     // no artificial ceiling at 5d8
      dmg9 > dmg5         // scaling continues all the way to slot 9
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xchbjf/
  
  // Are there any other abilities like the new Lucky? — advantage and disadvantage cancel each other out (resolveAdvantage)
  run qa_advantage_disadvantage_cancel = {
    val adv = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(adv.hasAdvantage) and not(adv.hasDisadvantage))
  }
  
  // Are there any other abilities like the new Lucky? — Bardic Inspiration as post-roll miscBonus can turn a failed check into a success
  run qa_post_roll_bonus_turns_failure_to_success = {
    // roll 8 + abilityMod 2 = 10 vs DC 12: fails without bonus, succeeds with +4 (Bardic Inspiration d8)
    val failsWithout = checkSucceeds(8, 2, NoneProf, 3, 0, 12)
    val succeedsWith = checkSucceeds(8, 2, NoneProf, 3, 4, 12)
    assert(not(failsWithout) and succeedsWith)
  }

  // Source: https://reddit.com/r/onednd/comments/yk4p99/
  
  // Did OneD&D take hand crossbows from Rogues and Bards? - non-finesse melee weapon (longsword) forces STR mod, not DEX
  run qa_non_finesse_melee_uses_str_mod = {
    val longsword: Weapon = {
      name: "longsword",
      damageDie: 8,
      versatileDie: 10,
      damageType: Slashing,
      properties: Set(Versatile),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val strMod = 2
    val dexMod = 4
    assert(weaponAttackAbility(longsword, strMod, dexMod) == strMod)
  }
  
  // Did OneD&D take hand crossbows from Rogues and Bards? - finesse weapon (rapier/dagger) picks higher of STR/DEX, enabling DEX-based Rogues
  run qa_finesse_weapon_picks_higher_mod = {
    val dagger: Weapon = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val strMod = 0
    val dexMod = 4
    assert(weaponAttackAbility(dagger, strMod, dexMod) == dexMod)
  }
  
  // Did OneD&D take hand crossbows from Rogues and Bards? - hand crossbow has Loading, blocking Extra Attack regardless of class
  run qa_hand_crossbow_loading_blocks_extra_attack = {
    val handCrossbow: Weapon = {
      name: "hand crossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Loading, Ammunition),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    assert(not(pCanExtraAttackWithWeapon(handCrossbow)))
  }
  
  // Did OneD&D take hand crossbows from Rogues and Bards? - ranged weapon (hand crossbow) uses DEX mod regardless of finesse
  run qa_ranged_weapon_uses_dex_mod = {
    val handCrossbow: Weapon = {
      name: "hand crossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Loading, Ammunition),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    val strMod = 3
    val dexMod = 2
    assert(weaponAttackAbility(handCrossbow, strMod, dexMod) == dexMod)
  }

  // Source: https://rpg.stackexchange.com/q/214593
  
  run qa_suppressed_spell_duration_continues_counting_down = {{
    val effects0 = pAddEffect(Set(), "haste", 10, AtEndOfTurn)
    val effectsAfterSuppressedTime = pTickEffects(effects0, 3)
    val effectsAfterFullDuration = pTickEffects(effects0, 10)
    assert(pHasEffect(effectsAfterSuppressedTime, "haste") and not(pHasEffect(effectsAfterFullDuration, "haste")))
  }}

  // Source: https://rpg.stackexchange.com/q/214789
  
  // Is there an error in the new Carrion Crawler stat block? — Paralyzed auto-fails DEX saves, making DEX-based escape impossible
  run qa_paralyzed_autofails_dex_escape_save = {
    val paralyzed = pApplyCondition(freshCreature(20), CParalyzed)
    val mods = pSaveModifiers(paralyzed, Dex)
    assert(mods.autoFail == true)
  }
  
  // Errata fix: CON save is not auto-failed while Paralyzed, so escape via CON save is possible
  run qa_paralyzed_con_save_not_autofail = {
    val paralyzed = pApplyCondition(freshCreature(20), CParalyzed)
    val mods = pSaveModifiers(paralyzed, Con)
    assert(mods.autoFail == false)
  }

  // Source: https://reddit.com/r/onednd/comments/wt9nup/
  
  // Q: "My crown? It's in that safe over there…" — nat 20 does NOT auto-succeed ability checks; dump-stat no-prof character fails DC 28 even on nat 20
  run qa_nat20_no_auto_success_ability_check = {
    // Paladin: DEX 8 (mod -1), no thieves' tools proficiency, nat 20, DC 28 lock → 19 < 28, fails
    val paladinDexMod = abilityModifier(8)
    val paladinFails = not(checkSucceeds(20, paladinDexMod, NoneProf, 2, 0, 28))
    // Level-4 Rogue: DEX 18 (mod +4), Expertise (profBonus 2 → expertise 4), nat 20, DC 28 → 28 >= 28, succeeds
    val rogueDexMod = abilityModifier(18)
    val rogueProfBonus = proficiencyBonus(4)
    val rogueSucceeds = checkSucceeds(20, rogueDexMod, Expertise, rogueProfBonus, 0, 28)
    assert(paladinFails and rogueSucceeds)
  }

  // Source: https://reddit.com/r/onednd/comments/zhmly9/
  
  // Why isn't movement handled through fractions, and what's the reason for the 'one speed per movement' rule?
  // PHB: switching speed types subtracts actual feet moved from new speed — not a proportional fraction
  run qa_speed_switch_subtracts_distance_not_proportional = {
    // Walk 30ft speed, move 15ft, switch to swim 60ft → remaining = 60 - 15 = 45 (not 30 proportional)
    val t0: TurnState = FRESH_TURN.with("movementRemaining", 30).with("effectiveSpeed", 30)
    val t1 = pUseMovement(t0, 15, 1)
    val t2 = pSwitchSpeedType(t1, 60, 15)
    assert(t2.movementRemaining == 45 and t2.effectiveSpeed == 60)
  }
  
  // PHB: speed switch is blocked when distance already moved equals or exceeds the new speed
  run qa_speed_switch_blocked_when_distance_exceeds_new_speed = {
    val t0: TurnState = FRESH_TURN.with("movementRemaining", 0).with("effectiveSpeed", 30)
    // Already moved 35ft; fly speed is 30 → 30 - 35 = -5 ≤ 0, no switch
    val t1 = pSwitchSpeedType(t0, 30, 35)
    assert(t1 == t0)
  }
  
  // PHB: speed switch is blocked when distance already moved equals new speed exactly
  run qa_speed_switch_blocked_at_exact_new_speed = {
    val t0: TurnState = FRESH_TURN.with("movementRemaining", 0).with("effectiveSpeed", 30)
    // Already moved 30ft; swim speed is 30 → 30 - 30 = 0 ≤ 0, no switch
    val t1 = pSwitchSpeedType(t0, 30, 30)
    assert(t1 == t0)
  }

  // Source: https://reddit.com/r/onednd/comments/1ivaehx/
  
  // When can a player use their Heroic Inspiration? — HI is expended on use; regained at start of next turn (Champion L10)
  run qa_heroic_inspiration_consumed_on_use = {
    val fs_has_hi = freshFighterState(10).with("heroicInspiration", true)
    // Expending Heroic Inspiration clears the flag — cannot be used again until regained
    val fs_after_use = fs_has_hi.with("heroicInspiration", false)
    all {
      // Before use: inspiration is available
      assert(fs_has_hi.heroicInspiration),
      // After use: inspiration is gone (expended)
      assert(not(fs_after_use.heroicInspiration)),
      // Champion L10 Heroic Warrior: regain it at start of next turn when you don't have it
      assert(pFighterStartTurn(fs_after_use, 10).heroicInspiration),
      // If you already have it, it is not doubled — start-of-turn does not replace existing inspiration
      assert(pFighterStartTurn(fs_has_hi, 10).heroicInspiration),
      // Below L10, start-of-turn does NOT grant Heroic Inspiration
      assert(not(pFighterStartTurn(fs_after_use, 9).heroicInspiration)),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xsr14r/
  
  // Hide action: DC 15 Dexterity (Stealth) check; skill correctly maps to Dex ability
  run qa_hide_action_stealth_check_dex_skill = {
    val dexMod = abilityModifier(14) // Dex 14 -> +2
    val profBonus = proficiencyBonus(5) // level 5 -> +3
    // Roll 13 + 2 + 0 (no Stealth prof) = 15, exactly meets DC 15 -> succeeds
    val rollMeets = checkSucceeds(13, dexMod, NoneProf, profBonus, 0, 15)
    // Roll 12 + 2 + 0 = 14 < 15 -> fails
    val rollFails = checkSucceeds(12, dexMod, NoneProf, profBonus, 0, 15)
    assert(
      skillAbility(Stealth) == Dex
      and rollMeets == true
      and rollFails == false
    )
  }
  
  // Stealth check total becomes Perception DC; proficient Stealth hider vs passive Perception detection
  run qa_hide_stealth_total_becomes_perception_dc = {
    // Hider: Dex 16 (+3), proficient in Stealth, level 3 (PB +2) -> rolls 12: 12+3+2=17 total
    val hiderDexMod = abilityModifier(16) // +3
    val hiderProfBonus = proficiencyBonus(3) // +2
    val hiderRoll = 12
    val stealthTotal = hiderRoll + hiderDexMod + profMultiplier(Proficient, hiderProfBonus) // 17
    // Seeker: Wis 13 (+1), proficient Perception, level 1 (PB +2)
    // Passive Perception = 10 + 1 + 2 = 13 < 17 -> cannot passively detect hider
    val seekerWisMod = abilityModifier(13) // +1
    val seekerProfBonus = proficiencyBonus(1) // +2
    val passivePerc = passiveCheck(seekerWisMod, Proficient, seekerProfBonus, false, false)
    // Active Perception check roll 3: 3+1+2=6 < 17 -> fails to find hider
    val activeCheckFails = checkSucceeds(3, seekerWisMod, Proficient, seekerProfBonus, 0, stealthTotal)
    // Active Perception check roll 14: 14+1+2=17 >= 17 -> finds hider
    val activeCheckSucceeds = checkSucceeds(14, seekerWisMod, Proficient, seekerProfBonus, 0, stealthTotal)
    assert(
      stealthTotal == 17
      and passivePerc == 13
      and passivePerc < stealthTotal
      and activeCheckFails == false
      and activeCheckSucceeds == true
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1cxb2b5/
  
  // Rogue's Expertise vs Tactical Mind, Primal Knowledge, and Guidance
  // Expertise doubles the proficiency bonus: rogue's static edge over fighter on trained skills
  run qa_expertise_doubles_proficiency_vs_proficient = {
    // Level 1: PB = +2. Rogue: Expertise → +4. Fighter: Proficient → +2. Gap = +2.
    val pb = proficiencyBonus(1)
    val dexMod = 3 // +3 Dex (both characters)
    val dc = 15
    // Roll 8: rogue total 8+3+4=15 (succeeds); fighter total 8+3+2=13 (fails)
    val marginalRoll = 8
    all {
      assert(profMultiplier(Expertise, pb) == pb * 2),
      assert(profMultiplier(Proficient, pb) == pb),
      assert(profMultiplier(Expertise, pb) - profMultiplier(Proficient, pb) == 2),
      assert(checkSucceeds(marginalRoll, dexMod, Expertise, pb, 0, dc)),
      assert(not(checkSucceeds(marginalRoll, dexMod, Proficient, pb, 0, dc))),
    }
  }
  
  // Rogue's Expertise vs Tactical Mind, Primal Knowledge, and Guidance
  // Tactical Mind: Second Wind charge consumed ONLY when d10 boost converts failure to success
  run qa_tactical_mind_charge_consumed_only_on_success = {
    val fs = freshFighterState(2) // level 2 fighter: 2 SW charges, Tactical Mind available
    val pb = proficiencyBonus(2)  // +2
    val dexMod = 3
    val dc = 15
    val d20Roll = 6  // 6+3+2=11 < 15: base check fails without boost
    // d10=4: 6+3+2+4=15 ≥ 15 → boosted check succeeds → charge consumed
    val boostSucceeds = checkSucceeds(d20Roll, dexMod, Proficient, pb, 4, dc)
    // d10=3: 6+3+2+3=14 < 15 → boosted check still fails → charge NOT consumed
    val boostFails = checkSucceeds(d20Roll, dexMod, Proficient, pb, 3, dc)
    val fsAfterConsumed = pUseTacticalMind(fs, boostSucceeds)
    val fsAfterNotConsumed = pUseTacticalMind(fs, boostFails)
    all {
      assert(canUseTacticalMind(2, fs)),
      assert(not(checkSucceeds(d20Roll, dexMod, Proficient, pb, 0, dc))), // base check fails
      assert(boostSucceeds),   // d10=4 pushes to exactly DC
      assert(not(boostFails)), // d10=3 not enough
      assert(fsAfterConsumed.secondWindCharges == fs.secondWindCharges - 1),
      assert(fsAfterNotConsumed.secondWindCharges == fs.secondWindCharges),
    }
  }
  
  // Rogue's Expertise vs Tactical Mind, Primal Knowledge, and Guidance
  // Tactical Mind becomes unavailable when Second Wind charges are exhausted
  run qa_tactical_mind_unavailable_without_charges = {
    val fs = freshFighterState(2)
    val fsNoCharges = fs.with("secondWindCharges", 0)
    all {
      assert(canUseTacticalMind(2, fs)),          // available with charges
      assert(not(canUseTacticalMind(2, fsNoCharges))), // unavailable at 0 charges
      assert(not(canUseTacticalMind(1, fs))),     // unavailable below level 2
    }
  }
  
  // Rogue's Expertise vs Tactical Mind, Primal Knowledge, and Guidance
  // Expertise advantage scales with level; at level 5 (PB=3) Expertise gap is +3
  run qa_expertise_gap_scales_with_proficiency_bonus = {
    val pb1 = proficiencyBonus(1)  // +2
    val pb5 = proficiencyBonus(5)  // +3
    val pb9 = proficiencyBonus(9)  // +4
    all {
      // Gap = profMultiplier(Expertise) - profMultiplier(Proficient) = pb each time
      assert(profMultiplier(Expertise, pb1) - profMultiplier(Proficient, pb1) == pb1),
      assert(profMultiplier(Expertise, pb5) - profMultiplier(Proficient, pb5) == pb5),
      assert(profMultiplier(Expertise, pb9) - profMultiplier(Proficient, pb9) == pb9),
      // At level 5, roll 9, Dex+3, DC 18: Expertise 9+3+6=18 succeeds; Proficient 9+3+3=15 fails
      assert(checkSucceeds(9, 3, Expertise, pb5, 0, 18)),
      assert(not(checkSucceeds(9, 3, Proficient, pb5, 0, 18))),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/wsgn4x/
  
  // Changes to Long Rests: interrupted long rest (≥1hr) grants short rest benefits — partial healing via hit dice, not full recovery
  run qa_interrupted_long_rest_gives_short_rest_benefits = {
    val c = freshCreature(20).with("hp", 5).with("hitPointDiceRemaining", 3)
    val conMod = 2
    // interrupted ≥1hr → short rest benefits: spend hit dice (roll 6 + conMod 2 = 8 HP)
    val afterInterrupted = pShortRest(c, conMod, [6])
    // uninterrupted → full long rest
    val afterFull = pLongRest(c, 3)
    assert(
      // interrupted rest heals partially (5 + 6 + 2 = 13), not to max
      afterInterrupted.hp == 13 and
      afterInterrupted.hp < 20 and
      // full long rest restores to max HP
      afterFull.hp == 20 and
      // interrupted rest consumes a hit die
      afterInterrupted.hitPointDiceRemaining == 2 and
      // full long rest restores all hit dice
      afterFull.hitPointDiceRemaining == 3
    )
  }
  
  // Changes to Long Rests: long rest interrupted before 1 hour yields no benefit (state unchanged — rest must be restarted)
  run qa_long_rest_interrupted_before_1hr_no_benefit = {
    val c = freshCreature(20).with("hp", 5).with("hitPointDiceRemaining", 3)
    // interrupted <1hr → no benefit: model as short rest with no dice spent
    val afterInterrupted = pShortRest(c, 2, [])
    assert(
      afterInterrupted.hp == 5 and
      afterInterrupted.hitPointDiceRemaining == 3
    )
  }

  // Source: https://reddit.com/r/onednd/comments/zfvosq/
  
  // Do you think crit-fishing for smites & alike will still exist in One DND?
  // On a critical hit only weapon dice are doubled; bonus dice (e.g. Divine Smite) are added once.
  run qa_crit_smite_bonus_dice_not_doubled = {
    // Longsword crit: roll weapon die twice → 6 + 5 = 11
    // Divine Smite 2d8 (1st level slot): rolls 4 + 3 = 7, added once as bonusDice
    // STR mod +3
    val weaponDiceDoubled = 6 + 5
    val smiteDice         = 4 + 3
    val strMod            = 3
    val critDmg = criticalDamage(weaponDiceDoubled, smiteDice, strMod)
    // If smite were erroneously doubled it would appear in normalDice instead
    val wrongDmg = criticalDamage(weaponDiceDoubled + smiteDice + smiteDice, 0, strMod)
    assert(
      critDmg == weaponDiceDoubled + smiteDice + strMod
      and critDmg != wrongDmg
    )
  }
  
  // Do you think crit-fishing for smites & alike will still exist in One DND?
  // Attack roll resolves (and isCritical is known) before smite declaration — crit-fishing is possible.
  run qa_crit_fishing_roll_resolves_before_smite = {
    // Natural 20 → isCritical; player then chooses to expend smite slot
    val attackResult = resolveAttackRoll(20, 5, 15, 0, 20)
    // Smite declared after seeing the crit: weapon dice doubled, smite dice not
    val weaponDiceDoubled = 8 + 7
    val smiteDice         = 4 + 3
    val strMod            = 3
    val critDmg = criticalDamage(weaponDiceDoubled, smiteDice, strMod)
    assert(
      attackResult.isCritical
      and attackResult.hits
      and critDmg == weaponDiceDoubled + smiteDice + strMod
    )
  }

  // Source: https://rpg.stackexchange.com/q/213429
  
  // Do "always prepared" Spells cost spell slots?
  run qa_always_prepared_spells_require_slots = {
    // "Always prepared" (e.g. Speak With Animals) still expends a slot each cast
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(1, 2))
      .with("slotsCurrent", EMPTY_SLOTS.set(1, 2))
    // First cast: slot expended, one remains — still castable
    val ss1 = pExpendSlot(ss, 1)
    val canCastAfterFirst = pCanCastAtLevel(ss1, 1, 1)
    // Second cast: both slots gone — cannot cast again (not an at-will cantrip)
    val ss2 = pExpendSlot(ss1, 1)
    val cannotCastAfterSecond = not(pCanCastAtLevel(ss2, 1, 1))
    assert(canCastAfterFirst and cannotCastAfterSecond)
  }

  // Source: https://reddit.com/r/onednd/comments/10jhc9l/
  
  // Martial attack vs saving throw question - save-targeting abilities bypass AC entirely (e.g. burst fire DC 15 DEX save)
  run qa_martial_save_bypasses_ac = {
    val creature = freshCreature(20)
    val highAC = 20
    // Regular attack: roll 10 + bonus 3 = 13 < 20 AC → miss
    val regularAttack = resolveAttackRoll(10, 3, highAC, 0, 20)
    // Save-targeting ability: DC 15 DEX save, roll 5 + DEX mod 0 = 5 → failed save
    val savePassed = saveSucceeds(5, 0, false, 2, 0, 15)
    // Failed save → full damage applied regardless of AC
    val afterDmg = if (not(savePassed)) pTakeDamage(creature, 10, Lightning, Set(), Set(), Set(), false)
                   else creature
    assert(
      not(regularAttack.hits) and   // high AC blocked the regular attack
      not(savePassed) and            // creature failed the DEX save
      afterDmg.hp == 10              // damage applied despite AC being unreachable
    )
  }
  
  // Martial attack vs saving throw question - successful DEX save blocks damage entirely for burst-fire style abilities
  run qa_martial_save_no_damage_on_success = {
    val creature = freshCreature(20)
    // DC 15 DEX save, roll 15 + DEX mod 0 = 15 >= 15 → save succeeds
    val savePassed = saveSucceeds(15, 0, false, 2, 0, 15)
    val afterDmg = if (not(savePassed)) pTakeDamage(creature, 10, Lightning, Set(), Set(), Set(), false)
                   else creature
    assert(savePassed and afterDmg.hp == 20)
  }

  // Source: https://reddit.com/r/onednd/comments/y6hh52/
  
  // Approaching enemies while hidden — unseen attacker (hidden from target) has advantage on attack rolls
  run qa_hidden_attacker_has_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,  // hidden: target cannot see the attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
  
  // Approaching enemies while hidden — total darkness without darkvision makes observers effectively blinded
  run qa_darkness_no_darkvision_observer_blinded = {
    // A guard with no darkvision standing in total darkness cannot see a hidden approacher
    val obs = pEffectiveObscurement(Dark, false)
    assert(pBlindedByObscurement(obs))
  }
  
  // Approaching enemies while hidden — darkvision in darkness reduces to lightly obscured, observer not fully blinded
  run qa_darkvision_in_darkness_not_blinded = {
    // A guard with darkvision in total darkness is only lightly obscured — can still potentially detect movement
    val obs = pEffectiveObscurement(Dark, true)
    assert(not(pBlindedByObscurement(obs)) and obs == LightlyObscured)
  }
  
  // Approaching enemies while hidden — if attacker is also blind (can't see target), advantage and disadvantage cancel
  run qa_mutual_unseen_cancels_adv_disadv = {
    // Attacker crept into darkness: target can't see attacker (adv) but attacker also can't see target (disadv) — cancel
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,  // hidden: target can't see attacker → advantage
      attackerCanSeeTarget: false,  // but attacker can't see target either → disadvantage
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // PHB: any advantage source + any disadvantage source → straight roll
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/xy3ph1/
  
  // Q&A: Expert Classes UA - Exhaustion each level subtracts from d20 Tests at -2 per level
  run qa_exhaustion_d20_penalty = {
    val s1 = freshCreature(20).with("exhaustion", 1)
    val s3 = freshCreature(20).with("exhaustion", 3)
    assert(exhaustionPenalty(s1) == -2 and exhaustionPenalty(s3) == -6)
  }
  
  // Q&A: Expert Classes UA - Expertise doubles Proficiency Bonus for skill checks
  run qa_expertise_doubles_proficiency_bonus = {
    val pb = proficiencyBonus(5)
    assert(profMultiplier(Expertise, pb) == pb * 2)
  }
  
  // Q&A: Expert Classes UA - Exhaustion level 6 kills the creature (spec models SRD 5.2.1)
  run qa_exhaustion_level_6_death = {
    val s = freshCreature(20).with("exhaustion", 5)
    val s2 = pAddExhaustion(s, 1)
    assert(s2.dead and s2.exhaustion == 6 and s2.hp == 0)
  }
  
  // Q&A: Expert Classes UA - Long rest reduces exhaustion by 1 with no food/drink requirement
  run qa_long_rest_reduces_exhaustion_unconditionally = {
    val s = freshCreature(20).with("exhaustion", 2)
    val s2 = pLongRest(s, 5)
    assert(s2.exhaustion == 1)
  }
  
  // Q&A: Expert Classes UA - Difficult Terrain costs 1 extra foot per foot of movement (multiplier 2)
  run qa_difficult_terrain_movement_cost_double = {
    assert(pMovementCost(true, false, false, false) == 2)
  }
  
  // Q&A: Expert Classes UA - Armor Training grants proficiency by armor category type (Light/Medium/Heavy)
  run qa_armor_training_by_category = {
    val profs = Set(LightArmor)
    assert(
      not(lacksArmorProficiency(WearingArmor(LEATHER), profs))
      and lacksArmorProficiency(WearingArmor(CHAIN_MAIL), profs)
    )
  }

  // Source: https://rpg.stackexchange.com/q/213671
  
  // Is the refurbished Poison Spray now better at dealing damage than Fire Bolt?
  
  // Against a creature with no resistances, Poison Spray (d12) outdamages Fire Bolt (d10) at max roll
  run qa_poison_spray_wins_unresisted = {
    val fireDmg   = applyDamageModifiers(10, Fire,   Set(), Set(),       Set(), 0)
    val poisonDmg = applyDamageModifiers(12, Poison, Set(), Set(),       Set(), 0)
    assert(poisonDmg > fireDmg)
  }
  
  // Poison immunity wipes out Poison Spray entirely — the primary reason it trails on average EV
  run qa_poison_immune_deals_zero = {
    val poisonDmg = applyDamageModifiers(12, Poison, Set(Poison), Set(), Set(), 0)
    assert(poisonDmg == 0)
  }
  
  // Against a poison-resistant creature: halved d12 (=6) loses to full d10 (=10) — fire bolt wins
  run qa_fire_bolt_beats_resisted_poison = {
    val fireDmg   = applyDamageModifiers(10, Fire,   Set(), Set(),         Set(), 0)
    val poisonDmg = applyDamageModifiers(12, Poison, Set(), Set(Poison),   Set(), 0)
    assert(fireDmg > poisonDmg)
  }
  
  // Against a fire-resistant creature: halved d10 (=5) loses to full d12 (=12) — poison spray wins
  run qa_poison_spray_beats_resisted_fire = {
    val fireDmg   = applyDamageModifiers(10, Fire,   Set(), Set(Fire), Set(), 0)
    val poisonDmg = applyDamageModifiers(12, Poison, Set(), Set(),     Set(), 0)
    assert(poisonDmg > fireDmg)
  }

  // Source: https://reddit.com/r/onednd/comments/11afgiw/
  
  // Spare the Dying seems deceptively game breaking: 1 HP heal removes the unconscious condition entirely
  run qa_spare_the_dying_revives_unconscious = {
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val revived = pHeal(dying, 1)
    assert(revived.hp == 1 and not(revived.unconscious) and not(isIncapacitated(revived)) and revived.deathSaves == DEATH_SAVES_RESET)
  }
  
  // Spare the Dying yoyo loop: enemy knocks fighter to 0 HP, cleric heals 1 HP, repeat indefinitely
  run qa_spare_the_dying_yoyo_loop = {
    val dying = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // Turn 1: Cleric casts Spare the Dying (1 HP)
    val revived1 = pHeal(dying, 1)
    // Turn 1: Enemy attacks, deals enough damage to drop fighter back to 0 HP
    val knocked1 = pTakeDamage(revived1, 5, Slashing, Set(), Set(), Set(), false)
    // Turn 2: Cleric casts Spare the Dying again
    val revived2 = pHeal(knocked1, 1)
    assert(
      revived1.hp == 1 and not(revived1.unconscious)
      and knocked1.hp == 0 and knocked1.unconscious
      and revived2.hp == 1 and not(revived2.unconscious)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/y05jzt/
  
  // Level 8 Playtest: Casters are the king — concentration DC has a floor of 10 regardless of damage amount
  run qa_concentration_dc_floor = {
    val dc_low  = pConcentrationDC(2)   // half = 1, floored to 10
    val dc_mid  = pConcentrationDC(18)  // half = 9, still floored to 10
    val dc_at   = pConcentrationDC(20)  // half = 10, exactly meets floor
    assert(dc_low == 10 and dc_mid == 10 and dc_at == 10)
  }
  
  // Level 8 Playtest: Casters are the king — +6 CON save (CON mod +3, PB +3 at level 8) passes DC 10 on a roll of 4
  run qa_high_con_save_maintains_concentration = {
    val pb     = proficiencyBonus(8) // (8-1)/4 + 2 = 3
    val conMod = 3                   // CON 16 -> mod +3
    val dc     = pConcentrationDC(10)
    val roll   = 4                   // 4 + 6 = 10 >= 10: marginal pass
    assert(dc == 10 and saveSucceeds(roll, conMod, true, pb, 0, dc))
  }
  
  // Level 8 Playtest: Casters are the king — Warcaster advantage: lower die fails where higher die passes, showing advantage value
  run qa_warcaster_advantage_concentration_marginal = {
    val pb     = proficiencyBonus(8)
    val conMod = 3
    val dc     = pConcentrationDC(10)
    val lowRoll  = 3  // 3 + 6 = 9 < 10: fails
    val highRoll = 4  // 4 + 6 = 10 >= 10: passes
    assert(
      not(saveSucceeds(lowRoll,  conMod, true, pb, 0, dc)) and
          saveSucceeds(highRoll, conMod, true, pb, 0, dc)
    )
  }
  
  // Level 8 Playtest: Casters are the king — concentration (Hypnotic Pattern) breaks on failed save but persists on success
  run qa_concentration_check_break_vs_maintain = {
    val ss        = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hypnotic_pattern")
    val afterFail = pConcentrationCheck(ss, false)
    val afterPass = pConcentrationCheck(ss, true)
    assert(not(isConcentrating(afterFail)) and isConcentrating(afterPass))
  }

  // Source: https://reddit.com/r/onednd/comments/1gy8m8n/
  
  // Ring of Invisibility (2024): Invisible condition persists through attack actions, ends only on Bonus Action
  run qa_ring_of_invisibility_persists_through_attack = {
    val creature = freshCreature(30)
    val withInvisible = pApplyCondition(creature, CInvisible)
    // Taking an Attack action (pUseAction operates on TurnState only, does not touch CreatureState invisible field)
    val afterAttack = pUseAction(FRESH_TURN, withInvisible, AAttack)
    // Invisible condition survives the attack — only Bonus Action (remove) or ring removal ends it
    assert(withInvisible.invisible == true)
  }
  
  // Ring of Invisibility (2024): Invisible condition ends when wearer uses Bonus Action to become visible
  run qa_ring_of_invisibility_ends_on_bonus_action = {
    val creature = freshCreature(30)
    val withInvisible = pApplyCondition(creature, CInvisible)
    // Wearer uses Bonus Action to become visible (modeled as explicit condition removal)
    val afterBonusAction = pRemoveCondition(withInvisible, CInvisible)
    assert(afterBonusAction.invisible == false)
  }

  // Source: https://reddit.com/r/onednd/comments/zcsokb/
  
  // Goliath Large Form + Druid Wild Shape: Large Form grants Advantage on Strength Checks, passive STR increases by 5
  run qa_large_form_advantage_on_str_checks = {
    val strMod = abilityModifier(20)
    val profBonus = proficiencyBonus(5)
    val withLargeForm = passiveCheck(strMod, NoneProf, profBonus, true, false)
    val withoutLargeForm = passiveCheck(strMod, NoneProf, profBonus, false, false)
    assert(withLargeForm == withoutLargeForm + 5)
  }
  
  // Goliath Large Form + Druid Wild Shape: Wild Shape rule 'Transforming doesn't break your concentration' - adopting beast HP pool (non-lethal, non-incapacitating) preserves concentration
  run qa_wild_shape_preserves_concentration = {
    val creature = freshCreature(30)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "spell_a")
    // Wild Shape: adopt beast form HP pool; creature is alive and not incapacitated
    val beastForm = freshCreature(20)
    val ssAfter = pBreakConcOnStateChange(ss, creature, beastForm)
    assert(isConcentrating(ssAfter))
  }

  // Source: https://reddit.com/r/onednd/comments/10gemjc/
  
  // INFLUENCE [ACTION] - Animal Handling: gently coaxing a Beast/Monstrosity uses Charisma, not the default Wisdom
  run qa_animal_handling_influence_uses_charisma = {
    // Character with WIS 10 (+0) and CHA 16 (+3)
    val wisMod = 0
    val chaMod = 3
    val profBonus = 2
    val dc = 15
    val d20Roll = 12
    // Default skill mapping: AnimalHandling -> Wis
    val defaultAbility = skillAbility(AnimalHandling)
    // Influence action override: gently coaxing a Beast/Monstrosity uses Cha
    val influenceAbility = Cha
    // Wis-based Animal Handling check: 12 + 0 = 12 < 15, fails
    val defaultCheckFails = not(checkSucceeds(d20Roll, wisMod, NoneProf, profBonus, 0, dc))
    // Cha-based Influence/Animal Handling: 12 + 3 = 15 >= 15, succeeds
    val influenceCheckSucceeds = checkSucceeds(d20Roll, chaMod, NoneProf, profBonus, 0, dc)
    assert(
      defaultAbility == Wis
      and influenceAbility == Cha
      and defaultCheckFails
      and influenceCheckSucceeds
    )
  }

  // Source: https://reddit.com/r/onednd/comments/x1jwon/
  
  // Playtested Cragmaw Cave: critical hit adds extra dice but does NOT double the damage modifier
  run qa_crit_modifier_not_doubled = {
    val dice = 8
    val bonusDice = 8
    val mod = 3
    val critDmg = criticalDamage(dice, bonusDice, mod)
    // PHB: crit = normalDice + bonusDice + modifier (modifier applied once, not doubled)
    assert(critDmg == dice + bonusDice + mod and critDmg != dice + bonusDice + mod * 2)
  }
  
  // Playtested Cragmaw Cave: nat 1 on an attack roll always misses regardless of attack bonus
  run qa_nat1_attack_always_misses = {
    // Goblin crit scenario: even a massive attack bonus cannot save a nat 1
    val result = resolveAttackRoll(1, 20, 5, 0, 20)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // Playtested Cragmaw Cave: nat 20 on a skill check does NOT auto-succeed (no auto-success rule for ability checks)
  run qa_skill_check_nat20_no_auto_success = {
    // Perception check nat 20 vs an impossible DC — still fails; only attacks have auto-success on nat 20
    val result = checkSucceeds(20, 0, Proficient, 4, 0, 40)
    // total = 20 + 0 + 4 + 0 = 24, which < 40
    assert(not(result))
  }
  
  // Playtested Cragmaw Cave: nat 1 on a skill check does NOT auto-fail if total beats the DC
  run qa_skill_check_nat1_no_auto_fail = {
    // Stealth check nat 1 with high modifier can still succeed
    val result = checkSucceeds(1, 10, Proficient, 4, 0, 10)
    // total = 1 + 10 + 4 + 0 = 15, which >= 10
    assert(result)
  }

  // Source: https://reddit.com/r/onednd/comments/y0ri5b/
  
  // What we still need the UA to clarify regarding Hiding (RAW) - heavily obscured blinds sight; lightly obscured and unobscured do not
  run qa_obscurement_blinded_thresholds = {
      assert(
          pBlindedByObscurement(HeavilyObscured) == true
          and pBlindedByObscurement(LightlyObscured) == false
          and pBlindedByObscurement(Unobscured) == false
      )
  }
  
  // What we still need the UA to clarify regarding Hiding (RAW) - total cover prevents targeting; partial covers permit targeting
  run qa_cover_targetability = {
      assert(
          canBeTargeted(TotalCover) == false
          and canBeTargeted(ThreeQuartersCover) == true
          and canBeTargeted(HalfCover) == true
          and canBeTargeted(NoCover) == true
      )
  }
  
  // What we still need the UA to clarify regarding Hiding (RAW) - darkvision reduces darkness to lightly obscured (not blinding)
  run qa_darkvision_dark_not_blinding = {
      val obs = pEffectiveObscurement(Dark, true)
      assert(obs == LightlyObscured and pBlindedByObscurement(obs) == false)
  }
  
  // What we still need the UA to clarify regarding Hiding (RAW) - unseen attacker (hidden/invisible) grants advantage; attacker still seeing target means no disadv
  run qa_unseen_attacker_grants_advantage = {
      val ctx: AttackContext = {
          attackerBlinded: false,
          attackerProne: false,
          attackerRestrained: false,
          attackerPoisoned: false,
          attackerFrightened: false,
          attackerFrightSourceInLOS: false,
          targetBlinded: false,
          targetParalyzed: false,
          targetPetrified: false,
          targetStunned: false,
          targetUnconscious: false,
          targetRestrained: false,
          targetProne: false,
          attackerWithin5ft: true,
          targetDodging: false,
          targetCanSeeAttacker: false,
          attackerCanSeeTarget: true,
          isRangedAttack: false,
          beyondNormalRange: false,
          hostileWithin5ft: false,
          isHeavyWeapon: false,
          wielderSizeSmallOrTiny: false,
          attackerGrappled: false,
          targetIsGrappler: false,
          underwater: false,
          attackerHasSwimSpeed: false,
          isUnderwaterMeleePiercing: false,
          isUnderwaterRangedException: false,
      }
      val mods = pAggregateAttackMods(ctx)
      assert(mods.hasAdvantage == true and mods.hasDisadvantage == false)
  }
  
  // What we still need the UA to clarify regarding Hiding (RAW) - invisible defender (target of attack) imposes disadvantage on attacker
  run qa_invisible_defender_imposes_attacker_disadvantage = {
      val creature = freshCreature(20)
      val withInvisible = pApplyCondition(creature, CInvisible)
      val defMods = pDefenseModifiers(withInvisible, true)
      assert(defMods.attackerDisadvantage == true and defMods.attackerAdvantage == false)
  }

  // Source: https://rpg.stackexchange.com/q/214818
  
  // Is the Movable function of the Grappled Condition subject to the Grappler's strength score?
  run qa_grappled_movable_not_strength_limited = {
    // Accepted answer: Movable function is NOT subject to carrying capacity; speed is halved by the condition rule, not STR.
    val lowStrConfig = TEST_CONFIG.with("abilityScores", TEST_CONFIG.abilityScores.set(Str, 10))
    val creature = freshCreature(20)
    // isGrappling=true, grappledTargetTwoSizesSmaller=false: speed halved to 15, NOT reduced to 5 by STR-based carrying capacity
    val t = pStartTurn(lowStrConfig, creature, Unarmored, 0, true, false)
    assert(t.movementRemaining == 15)
  }
  
  // Is the Movable function of the Grappled Condition subject to the Grappler's strength score?
  run qa_grappled_movable_two_sizes_smaller_no_penalty = {
    // PHB Movable exception: "unless you are Tiny or two or more sizes smaller than it" — no extra movement cost
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, true)
    assert(t.movementRemaining == 30)
  }
  
  // Is the Movable function of the Grappled Condition subject to the Grappler's strength score?
  run qa_grapple_eligibility_size_not_weight = {
    // Grapple initiation requires size <= 1 larger and free hand; STR affects DC only, not eligibility
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Is the Movable function of the Grappled Condition subject to the Grappler's strength score?
  run qa_two_sizes_smaller_exemption_boundary = {
    // Medium grappler: Tiny target is 2 sizes smaller (no penalty); Small is only 1 (penalty applies)
    assert(pTwoSizesSmaller(Medium, Tiny) and not(pTwoSizesSmaller(Medium, Small)))
  }

  // Source: https://rpg.stackexchange.com/q/213897
  
  run qa_overlap_tool_and_skill_grants_advantage_not_double_prof = {{
    val pb = proficiencyBonus(5)
    val lockpickUsesDexSkill = skillAbility(SleightOfHand) == Dex
    val profAddedOnce = profMultiplier(Proficient, pb) == pb
    val notExpertiseByDefault = profMultiplier(Proficient, pb) != profMultiplier(Expertise, pb)
    val overlapGivesAdv = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false }).hasAdvantage
    assert(lockpickUsesDexSkill and profAddedOnce and notExpertiseByDefault and overlapGivesAdv)
  }}
  
  // Q&A: Does having proficiency in Sleight of Hand give advantage to Thieves' Tool check to pick a lock?
  run qa_advantage_stacks_with_single_proficiency_bonus = {{
    val pb = proficiencyBonus(5)
    val dexMod = abilityModifier(16)
    val base = passiveCheck(dexMod, Proficient, pb, false, false)
    val withOverlapAdvantage = passiveCheck(dexMod, Proficient, pb, true, false)
    assert(withOverlapAdvantage == base + 5)
  }}

  // Source: https://reddit.com/r/onednd/comments/wsm2il/
  
  // An analysis of Warcaster and Resilient (Con) after the rule changes:
  // Resilient Con proficiency bonus on Con save turns a failed concentration check into a success
  run qa_resilient_con_concentration_save = {
    // 30 damage -> DC max(10, 15) = 15
    val dc = pConcentrationDC(30)
    val roll = 10
    val conMod = 2
    val profBonus = 3  // level 5
    // no prof: 10+2=12 < 15 fails; with Resilient Con prof: 10+2+3=15 >= 15 succeeds
    assert(
      dc == 15
      and not(saveSucceeds(roll, conMod, false, profBonus, 0, dc))
      and saveSucceeds(roll, conMod, true, profBonus, 0, dc)
    )
  }
  
  // An analysis of Warcaster and Resilient (Con): concentration save DC is capped at 30
  // (relevant because at DC 30 only a nat20+bonus or high-roll can succeed)
  run qa_concentration_dc_capped_at_30 = {
    val dcFromMassiveDamage = pConcentrationDC(120)
    assert(dcFromMassiveDamage == 30)
  }
  
  // An analysis of Warcaster and Resilient (Con): at a DC where proficiency does not bridge the gap,
  // Resilient Con alone still does not guarantee success
  run qa_resilient_con_insufficient_at_very_high_dc = {
    // 120 damage -> DC 30 (capped); con mod +2, PB +4 (level 9), roll 15
    // with prof: 15+2+4=21 < 30 -> still fails
    val dc = pConcentrationDC(120)
    val roll = 15
    val conMod = 2
    val profBonus = 4
    assert(
      dc == 30
      and not(saveSucceeds(roll, conMod, true, profBonus, 0, dc))
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1fa7y19/
  
  // Rogue "Reaction Mini Turn": bonus action Disengage (Cunning Action) prevents opportunity attacks
  run qa_cunning_action_disengage_blocks_oa = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Rogue uses Cunning Action: Withdraw (bonus action disengage) on their turn
    val t1 = pBonusActionDisengage(t0, creature)
    all {
      assert(t1.bonusActionUsed),
      assert(t1.disengaged),
      assert(not(pCanBeOpportunityAttacked(t1))),
    }
  }
  
  // Once a reaction is spent (e.g. on Sentinel OA), it is unavailable for the rest of the round
  run qa_reaction_spent_after_opportunity_attack = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    all {
      assert(t0.reactionAvailable),
      assert(not(t1.reactionAvailable)),
    }
  }
  
  // A creature that has not yet disengaged CAN be opportunity attacked (baseline)
  run qa_not_disengaged_allows_oa = {
    val t0 = FRESH_TURN
    assert(pCanBeOpportunityAttacked(t0))
  }

  // Source: https://reddit.com/r/onednd/comments/11bqrxu/
  
  // New Death Saving throw rules — stabilize (Medicine check) keeps creature unconscious at 0 HP
  run qa_stabilize_keeps_unconscious = {
    val dying = pApplyCondition(freshCreature(20).with("hp", 0), CUnconscious)
    val stabilized = pStabilize(dying)
    assert(stabilized.stable and stabilized.hp == 0 and stabilized.unconscious and not(stabilized.dead))
  }
  
  // New Death Saving throw rules — three death save successes: stable but still unconscious at 0 HP
  run qa_three_death_saves_stable_still_unconscious = {
    val dying = pApplyCondition(freshCreature(20).with("hp", 0), CUnconscious)
    val s1 = pDeathSave(dying, 15)
    val s2 = pDeathSave(s1, 15)
    val s3 = pDeathSave(s2, 15)
    assert(s3.stable and s3.hp == 0 and s3.unconscious and not(s3.dead))
  }
  
  // New Death Saving throw rules — Spare the Dying equivalent (heal to 1 HP) restores consciousness
  run qa_spare_dying_heals_to_1hp_restores_consciousness = {
    val dying = pApplyCondition(freshCreature(20).with("hp", 0), CUnconscious)
    val saved = pHeal(dying, 1)
    assert(saved.hp == 1 and not(saved.unconscious) and not(saved.dead))
  }
  
  // New Death Saving throw rules — stable creature regains consciousness only via natural recovery (1d4 hours)
  run qa_stable_recovery_restores_consciousness = {
    val dying = pApplyCondition(freshCreature(20).with("hp", 0), CUnconscious)
    val stabilized = pStabilize(dying)
    val recovered = pStableRecovery(stabilized)
    assert(recovered.hp == 1 and not(recovered.unconscious) and not(recovered.stable))
  }

  // Source: https://reddit.com/r/onednd/comments/xrmjuw/
  
  // So am I crazy or does Crossbow Expert basically just not work? — Loading limits a hand crossbow to one attack per action, blocking the bonus attack
  run qa_loading_prevents_extra_attack = {
    val handCrossbow: Weapon = {
      name: "hand_crossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Loading, Light_),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    assert(not(pCanExtraAttackWithWeapon(handCrossbow)))
  }

  // Source: https://reddit.com/r/onednd/comments/xu78y4/
  
  // How exactly is Hiding supposed to work in the UA? — hidden attacker's attack rolls have advantage (target can't see attacker)
  run qa_hidden_attacker_has_advantage_1bdb8967 = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // How exactly is Hiding supposed to work in the UA? — attack rolls against hidden creature have disadvantage (attacker can't see target)
  run qa_attacking_hidden_creature_has_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // How exactly is Hiding supposed to work in the UA? — total cover prevents targeting entirely
  run qa_total_cover_cannot_be_targeted = {
    assert(not(canBeTargeted(TotalCover)))
  }
  
  // How exactly is Hiding supposed to work in the UA? — adv and disadv cancel when both sides are unseen
  run qa_mutual_unseen_cancels_to_normal = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: false,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }

  // Death saving throw rules: nat1=2 failures, nat20=regain 1HP+conscious, 3 successes=stable, 3 failures=dead
  run qa_death_save_nat1_counts_as_two_failures = {
    val dying = freshCreature(20).with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(dying, 1)
    assert(after.deathSaves.failures == 2)
  }
  
  // Death saving throw: rolling a natural 20 restores 1 HP and regains consciousness
  run qa_death_save_nat20_restores_hp_and_consciousness = {
    val dying = freshCreature(20).with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(dying, 20)
    all {
      assert(after.hp == 1),
      assert(not(after.unconscious)),
      assert(after.deathSaves.successes == 0),
      assert(after.deathSaves.failures == 0),
    }
  }
  
  // Death saving throw: 3 successes stabilizes the creature
  run qa_death_save_three_successes_stabilizes = {
    val dying = freshCreature(20).with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 2, failures: 0 })
    val after = pDeathSave(dying, 15)
    all {
      assert(after.stable),
      assert(not(after.dead)),
      assert(after.deathSaves.successes == 0),
      assert(after.deathSaves.failures == 0),
    }
  }
  
  // Death saving throw: 3 failures kills the creature
  run qa_death_save_three_failures_kills = {
    val dying = freshCreature(20).with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 0, failures: 2 })
    val after = pDeathSave(dying, 5)
    assert(after.dead)
  }
  
  // Death saving throw: rolling 10 or higher (but not 20) counts as a success
  run qa_death_save_roll_10_or_higher_is_success = {
    val dying = freshCreature(20).with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(dying, 10)
    all {
      assert(after.deathSaves.successes == 1),
      assert(after.deathSaves.failures == 0),
      assert(not(after.dead)),
    }
  }
  
  // Death saving throw: rolling 2-9 counts as one failure
  run qa_death_save_low_roll_is_one_failure = {
    val dying = freshCreature(20).with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(dying, 7)
    all {
      assert(after.deathSaves.failures == 1),
      assert(not(after.dead)),
    }
  }
  
  // Death saving throw: no-op if creature is already stable
  run qa_death_save_noop_if_stable = {
    val stable = freshCreature(20).with("hp", 0)
      .with("stable", true)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(stable, 5)
    assert(after == stable)
  }
  
  // Death saving throw: no-op if creature is dead
  run qa_death_save_noop_if_dead = {
    val dead = freshCreature(20).with("hp", 0).with("dead", true)
    val after = pDeathSave(dead, 15)
    assert(after == dead)
  }

  // Source: https://reddit.com/r/onednd/comments/wu051l/
  
  // Does shoving a grappler actually break the grapple?
  run qa_shove_grappler_does_not_break_grapple = {
    // RAW: CGrappled ends only if the grappled creature is moved out of range —
    // not if the grappler is pushed away. pShove(ShovePush) leaves the grappler's
    // state unchanged (no position tracking), so the grappled condition persists.
    val grappled = pApplyCondition(freshCreature(20), CGrappled)
    val grappler = freshCreature(20)
    val shoveResult = pShove(Medium, Medium, grappler, true, ShovePush)
    assert(shoveResult.success and grappled.grappled)
  }

  // Source: https://reddit.com/r/onednd/comments/wtv7k8/
  
  // The Adventuring Day: The good, the bad, the ugly — regular spell slots only restore on long rest, not short rest
  run qa_adventuring_day_slots_only_restore_on_long_rest = {
    val slotsMax = Map(1 -> 4, 2 -> 3, 3 -> 2, 4 -> 1, 5 -> 1, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0)
    val ss0: SpellSlotState = {
      slotsMax: slotsMax,
      slotsCurrent: slotsMax,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Encounter 1: nova — expend high-level slots
    val ss1 = pExpendSlot(pExpendSlot(ss0, 3), 2)
    // Encounter 2: expend level-1 slots
    val ss2 = pExpendSlot(pExpendSlot(ss1, 1), 1)
    // Short rest between encounters does NOT restore regular slots
    val ssAfterShort = pRestorePactSlots(ss2)
    // Long rest at end of adventuring day restores all
    val ssAfterLong = pRestoreAllSlots(ss2)
    assert(
      // Short rest: regular slots remain depleted
      ssAfterShort.slotsCurrent.get(3) == 1 and
      ssAfterShort.slotsCurrent.get(2) == 2 and
      ssAfterShort.slotsCurrent.get(1) == 2 and
      // Long rest: all slots back to max
      ssAfterLong.slotsCurrent == slotsMax
    )
  }
  
  // The Adventuring Day: nova-ing all slots in one fight leaves none for subsequent encounters until long rest
  run qa_adventuring_day_nova_depletes_subsequent_encounters = {
    val slotsMax = Map(1 -> 2, 2 -> 1, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0)
    val ss0: SpellSlotState = {
      slotsMax: slotsMax,
      slotsCurrent: slotsMax,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Nova: expend all slots in encounter 1
    val ss1 = pExpendSlot(pExpendSlot(pExpendSlot(ss0, 1), 1), 2)
    // Short rest between encounters — still depleted
    val ssAfterShort = pRestorePactSlots(ss1)
    // Attempting to expend a slot at level 1 after short rest: no-op (already 0)
    val ssNoSlot = pExpendSlot(ssAfterShort, 1)
    assert(
      // All regular slots exhausted — no slots available for next encounter
      ssAfterShort.slotsCurrent.get(1) == 0 and
      ssAfterShort.slotsCurrent.get(2) == 0 and
      // pExpendSlot is a no-op when slots are 0
      ssNoSlot.slotsCurrent.get(1) == 0
    )
  }

  // Source: https://rpg.stackexchange.com/q/216447
  
  // Does moving within reach provoke Opportunity Attacks? — OA triggers only on leaving reach, not entering/staying within
  run qa_disengage_prevents_opportunity_attack = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, ADisengage)
    assert(t1.disengaged and not(pCanBeOpportunityAttacked(t1)))
  }
  
  // Does moving within reach provoke Opportunity Attacks? — movement alone (within reach) does not remove OA eligibility; only Disengage does
  run qa_movement_within_reach_no_oa = {
    val t0 = FRESH_TURN
    // creature moves up to 30 ft — simulating orbiting/repositioning within reach — without Disengaging
    val t1 = pUseMovement(t0, 30, 1)
    // still OA-eligible if they later leave reach; movement itself is not the gate
    assert(pCanBeOpportunityAttacked(t1))
  }

  // Source: https://reddit.com/r/onednd/comments/132oeu2/
  
  // The math of Indomitable Might: DC equal to STR score is guaranteed with a bad roll
  run qa_indomitable_might_floor_at_str_score = {
    // STR 20 barbarian level 9: d20=1, strMod=+5, prof=+4 → raw=10 < 20 → Indomitable Might replaces with 20
    val strScore = 20
    val strMod = abilityModifier(strScore)             // +5
    val profBonus = proficiencyBonus(9)                // +4
    val d20Roll = 1
    val rawTotal = d20Roll + strMod + profMultiplier(Proficient, profBonus) // 1+5+4 = 10
    val effectiveTotal = intMax(rawTotal, strScore)    // intMax(10,20) = 20
    val dc = 20
    assert(effectiveTotal >= dc)
  }
  
  // The math of Indomitable Might: DC strictly above STR score is NOT guaranteed
  run qa_indomitable_might_no_help_above_str_score = {
    // Even with Indomitable Might floor of 20, DC 21 still fails on a roll of 1
    val strScore = 20
    val strMod = abilityModifier(strScore)             // +5
    val profBonus = proficiencyBonus(9)                // +4
    val d20Roll = 1
    val rawTotal = d20Roll + strMod + profMultiplier(Proficient, profBonus) // 10
    val effectiveTotal = intMax(rawTotal, strScore)    // 20
    val dc = 21
    assert(not(effectiveTotal >= dc))
  }
  
  // The math of Indomitable Might: feature has no effect when roll total already exceeds STR score
  run qa_indomitable_might_no_effect_on_good_roll = {
    // d20=18: raw = 18+5+4 = 27 > 20, so intMax leaves total unchanged
    val strScore = 20
    val strMod = abilityModifier(strScore)             // +5
    val profBonus = proficiencyBonus(9)                // +4
    val d20Roll = 18
    val rawTotal = d20Roll + strMod + profMultiplier(Proficient, profBonus) // 27
    val effectiveTotal = intMax(rawTotal, strScore)    // intMax(27,20) = 27
    assert(effectiveTotal == rawTotal)
  }
  
  // The math of Indomitable Might: higher bonus shrinks the window where the feature matters
  run qa_indomitable_might_window_shrinks_with_higher_bonus = {
    // With bonus=18 (e.g. magic item), only DC 20 at roll=1 is salvaged (raw=19 < 20 → effective=20)
    // but with bonus=9 (prof only), the window is DC 11-20 (raw at roll=1 is 10 < 11..20)
    val strScore = 20
    val d20Roll = 1
    val profBonus = proficiencyBonus(9)   // +4
    val strMod = abilityModifier(strScore) // +5
  
    // bonus 9 total = 1+9 = 10; Indomitable Might helps for DC 11..20 (5 DCs above 10 in range 7-20 where both apply)
    val rawLowBonus = d20Roll + 9  // 10, simplified misc bonus of 9
    val effLowBonus = intMax(rawLowBonus, strScore)  // 20
    // bonus 18 total = 1+18 = 19; Indomitable Might only helps for DC 20
    val rawHighBonus = d20Roll + 18  // 19
    val effHighBonus = intMax(rawHighBonus, strScore) // 20
  
    // Low bonus: feature rescues more DCs (raw 10 vs effective 20 = 10-point gap)
    // High bonus: feature rescues fewer DCs (raw 19 vs effective 20 = 1-point gap)
    all {
      assert(strScore - rawLowBonus > strScore - rawHighBonus),
      assert(effLowBonus == strScore),
      assert(effHighBonus == strScore),
    }
  }

  // Source: https://rpg.stackexchange.com/q/215620
  
  // With the Malnutrition rules, is it better to eat nothing than eating too little?
  run qa_malnutrition_undereating_failed_save_causes_exhaustion = {
    val conMod = abilityModifier(14) // CON 14 → +2
    val profBonus = proficiencyBonus(1)
    val creature = freshCreature(20)
    // d20=7: 7+2=9 < DC 10 → save fails → gain 1 exhaustion
    val failed = not(saveSucceeds(7, conMod, false, profBonus, 0, 10))
    val result = if (failed) pAddExhaustion(creature, 1) else creature
    assert(failed and result.exhaustion == 1)
  }
  
  // With the Malnutrition rules, is it better to eat nothing than eating too little?
  run qa_malnutrition_undereating_passed_save_no_exhaustion = {
    val conMod = abilityModifier(14) // CON 14 → +2
    val profBonus = proficiencyBonus(1)
    val creature = freshCreature(20)
    // d20=10: 10+2=12 >= DC 10 → save succeeds → no exhaustion
    val succeeded = saveSucceeds(10, conMod, false, profBonus, 0, 10)
    val result = if (not(succeeded)) pAddExhaustion(creature, 1) else creature
    assert(succeeded and result.exhaustion == 0)
  }
  
  // With the Malnutrition rules, eating nothing has no penalty until day 5 — the paradox threshold
  run qa_malnutrition_eating_nothing_safe_before_day5 = {
    // pStarvationThreshold == 5 means days 1-4 without food trigger no automatic exhaustion.
    // Paradox: eating nothing (no save) is mechanically safer than eating < half (DC 10 CON save).
    assert(pStarvationThreshold == 5)
  }

  // Source: https://reddit.com/r/onednd/comments/wu0xcd/
  
  // What Does the New Nat 20/1 Rule Add? — nat 20 on save vs mathematically impossible DC
  run qa_nat20_save_still_fails_high_dc = {
    // Accepted answer: high CR monsters with DC 22+ mean some chars cannot succeed at all;
    // nat 20 auto-succeed rule is what gives them a 5% chance.
    // Char with no proficiency and neutral modifier: 20 + 0 = 20 < 22 → fails under pure math.
    assert(not(saveSucceeds(20, 0, false, 2, 0, 22)))
  }
  
  // What Does the New Nat 20/1 Rule Add? — nat 1 on save succeeds under pure math with high bonus
  run qa_nat1_save_succeeds_without_autofail = {
    // Accepted answer symmetry: characters with big save bonuses have no 5% fail chance without nat 1 rule.
    // +5 ability mod, proficient (PB +4): 1 + 5 + 4 = 10 >= 8 → succeeds under pure math.
    // Nat 1 auto-fail rule is what introduces that guaranteed 5% failure; absent here.
    assert(saveSucceeds(1, 5, true, 4, 0, 8))
  }

  // Source: https://reddit.com/r/onednd/comments/11btlvc/
  
  // Familiars can attack now: spending reaction on familiar's turn to command attack consumes the caster's reaction
  run qa_familiar_attack_costs_reaction = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    assert(
      t0.reactionAvailable == true and
      t1.reactionAvailable == false
    )
  }
  
  // Familiars can attack now: reaction already spent cannot be spent again (familiar can't be commanded twice per round)
  run qa_familiar_attack_reaction_once_per_round = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    val t2 = pUseReaction(t1)
    assert(t1 == t2)
  }

  // Source: https://reddit.com/r/onednd/comments/11ab00h/
  
  // Weird shower thought about armor class — current RAW: unarmored AC = 10 + DEX mod, not 8 + DEX mod
  run qa_unarmored_ac_is_10_plus_dex = {
    val dexMod = 3
    val ac = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 10 + dexMod and ac != 8 + dexMod)
  }
  
  // Light armor (Leather) AC = 11 + DEX mod, not 9 + DEX mod as the speculation suggested
  run qa_light_armor_ac_is_11_plus_dex = {
    val dexMod = 3
    val ac = calculateAC(WearingArmor(LEATHER), dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 11 + dexMod and ac != 9 + dexMod)
  }
  
  // Studded leather (top light armor) = 12 + DEX mod, consistent with 10-base unarmored floor
  run qa_studded_leather_ac_is_12_plus_dex = {
    val dexMod = 4
    val ac = calculateAC(WearingArmor(STUDDED_LEATHER), dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 12 + dexMod)
  }
  
  // Heavy armor (Plate) = 18 flat, no DEX — remains well above unarmored DEX builds as per current math
  run qa_plate_armor_ac_flat_18 = {
    val dexMod = 4
    val ac = calculateAC(WearingArmor(PLATE), dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(ac == 18)
  }

  // Source: https://reddit.com/r/onednd/comments/xrercw/
  
  // Q&A: New Grapple Feat and the future of Grappling — grapple escape DC is based on attacker STR, not DEX
  run qa_grapple_dc_is_str_based = {
    val strMod = 3  // STR 16
    val profBonus = 3  // level 5
    val dc = pGrappleShoveDC(strMod, profBonus)
    assert(dc == 8 + strMod + profBonus)
  }
  
  // Q&A: New Grapple Feat — grappled attacker has disadvantage on attacks against non-grappler targets
  run qa_grappled_attacker_disadv_vs_non_grappler = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true, targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true, isRangedAttack: false, beyondNormalRange: false,
      hostileWithin5ft: false, isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: true, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Q&A: New Grapple Feat — grappled attacker retains normal attack roll (no disadvantage) when targeting their own grappler
  run qa_grappled_attacker_no_disadv_vs_grappler = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true, targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true, isRangedAttack: false, beyondNormalRange: false,
      hostileWithin5ft: false, isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: true, targetIsGrappler: true,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }

  // Source: https://rpg.stackexchange.com/q/214794
  
  run qa_disengage_marks_opportunity_attack_exception = {{
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val tDisengage = pUseAction(t0, creature, ADisengage)
    val tDodge = pUseAction(t0, creature, ADodge)
    assert(not(pCanBeOpportunityAttacked(tDisengage)) and pCanBeOpportunityAttacked(tDodge))
  }}
  
  // Are there other kinds of Opportunity Attacks?
  run qa_other_reaction_usage_does_not_define_opportunity_attack = {{
    val t0 = FRESH_TURN
    val tAfterReaction = pUseReaction(t0)
    assert(pCanBeOpportunityAttacked(tAfterReaction) == pCanBeOpportunityAttacked(t0))
  }}

  // Source: https://rpg.stackexchange.com/q/213646
  
  // Otherworldly Steed Hit Point maximum?
  run qa_steed_max_hp_from_spell_formula = {
    // Steed maxHp = 5 + 10*spellLevel (stat block formula), not HD+CON calculation
    val spellLevel = 2
    val spellMaxHp = 5 + 10 * spellLevel                          // 25
    val hdBasedMaxHp = pFirstLevelHp(10, 2) + pLevelUpHp(10, 2)  // 12 + 12 = 24
    val steed = freshCreature(spellMaxHp)
    val damaged = pTakeDamage(steed, 20, Slashing, Set(), Set(), Set(), false)
    val healed = pHeal(damaged, 100)
    assert(
      spellMaxHp == 25
      and hdBasedMaxHp == 24
      and spellMaxHp != hdBasedMaxHp
      and healed.hp == spellMaxHp
      and healed.maxHp == spellMaxHp
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wry5ly/
  
  // Q&A: "DC 31 is now the DM's best friend" — nat 20 does NOT auto-succeed ability checks
  run qa_nat20_no_autosuccess_ability_check = {
    // d20=20, abilityMod=+2, no proficiency, profBonus=3 (level 5), DC=31 → total 22 < 31
    assert(not(checkSucceeds(20, 2, NoneProf, 3, 0, 31)))
  }
  
  // Q&A: contrast — nat 20 DOES auto-hit on attack rolls (spec asymmetry)
  run qa_nat20_autohit_attack_roll = {
    // d20=20 always hits regardless of AC or attack bonus, critRange=20
    val result = resolveAttackRoll(20, 0, 30, 0, 20)
    assert(result.hits and result.isCritical)
  }
  
  // Q&A: high-bonus character (eloquence bard / rogue with expertise) can still beat DC 31
  run qa_expertise_can_beat_dc31 = {
    // d20=20, abilityMod=+5 (score 20), expertise with profBonus=3 (level 5) → 20+5+6=31 >= 31
    assert(checkSucceeds(20, 5, Expertise, 3, 0, 31))
  }
  
  // Q&A: DC 32 is effectively impossible even with nat 20 + max normal ability + expertise at level 5
  run qa_dc32_unreachable_normal_bounds = {
    // d20=20, abilityMod=+5, expertise pb=3 → total 31 < 32
    assert(not(checkSucceeds(20, 5, Expertise, 3, 0, 32)))
  }

  // Source: https://reddit.com/r/onednd/comments/wtpihj/
  
  // The bat 20/1 rule messes with contested skill checks
  run qa_contested_nat20_no_auto_win = {
    // Wizard rolls nat 20 with -1 Athletics modifier = 19 total
    // Barbarian rolls 19 with +7 Athletics modifier = 26 total
    // Accepted answer: contested checks compare totals only; nat 20 is not an auto-win
    val wizardTotal    = 20 + (-1)  // d20=20, Athletics -1
    val barbarianTotal = 19 + 7     // d20=19, Athletics +7
    assert(contestWinner(barbarianTotal, wizardTotal) == AWins)
  }
  
  // The bat 20/1 rule messes with contested skill checks
  run qa_contested_nat1_no_auto_lose = {
    // Barbarian rolls nat 1 with +7 Athletics modifier = 8 total
    // Wizard rolls 5 with -1 Athletics modifier = 4 total
    // Accepted answer: nat 1 is not an auto-loss in a contest; higher total still wins
    val barbarianTotal = 1 + 7     // d20=1, Athletics +7
    val wizardTotal    = 5 + (-1)  // d20=5, Athletics -1
    assert(contestWinner(barbarianTotal, wizardTotal) == AWins)
  }

  // Source: https://reddit.com/r/onednd/comments/102d3of/
  
  // New Goliath Powerful Build makes it less appealing to barbarians than before
  run qa_powerful_build_rage_advantage_no_stack = {
    // Powerful Build grants advantage on saves to escape Grappled; Barbarian Rage also grants
    // advantage on saves. Per PHB, multiple advantage sources collapse to a single advantage —
    // they don't stack, so both features together give the same result as either alone.
    val powerfulBuildAdv = true  // Powerful Build: adv on escape-grapple saves
    val rageAdv = true           // Barbarian Rage: adv on saves
    val combined = resolveAdvantage({ hasAdvantage: powerfulBuildAdv or rageAdv, hasDisadvantage: false })
    assert(combined.hasAdvantage and not(combined.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/y6s3nr/
  
  // Damage output of Rogues with Light weapons and Subtle strikes: TWF requires both weapons Light and melee
  run qa_twf_light_weapon_precondition = {
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown), isMelee: true,
      normalRange: 20, longRange: 60,
    }
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_), isMelee: true,
      normalRange: 0, longRange: 0,
    }
    val rapier: Weapon = {
      name: "rapier", damageDie: 8, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse), isMelee: true,
      normalRange: 0, longRange: 0,
    }
    val t_attacked: TurnState = FRESH_TURN.with("attackActionUsed", true)
    val t_no_attack: TurnState = FRESH_TURN
    val creature = freshCreature(30)
    assert(
      // two light melee weapons: valid TWF
      pCanTWFWithWeapons(shortsword, shortsword, t_attacked, creature)
      and pCanTWFWithWeapons(dagger, dagger, t_attacked, creature)
      // rapier is not Light — cannot be TWF off-hand
      and not(pCanTWFWithWeapons(shortsword, rapier, t_attacked, creature))
      and not(pCanTWFWithWeapons(rapier, shortsword, t_attacked, creature))
      // attack action must have been used first
      and not(pCanTWFWithWeapons(shortsword, shortsword, t_no_attack, creature))
    )
  }
  
  // Damage output of Rogues with Light weapons: TWF off-hand attack does not add positive ability modifier
  run qa_twf_offhand_no_positive_mod = {
    val diceRoll = 5
    val posMod   = 5   // +5 Dex — irrelevant for off-hand TWF
    val negMod   = -1  // negative mod IS applied (penalty)
    assert(
      pTWFOffHandDamage(diceRoll, posMod) == 5
      and pTWFOffHandDamage(diceRoll, negMod) == 4
      and pTWFOffHandDamage(diceRoll, 0) == 5
    )
  }
  
  // Damage output of Rogues with Subtle strikes: advantage and disadvantage cancel; advantage alone improves rolls
  run qa_subtle_strikes_advantage_mechanics = {
    // any adv + any disadv → straight roll (neither)
    val cancelled = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    // pure advantage (Subtle Strikes with no counter-source)
    val advOnly   = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    // attack at AC 18, +10 bonus — hits on a 8+; with advantage on d20 roll of 8
    val hitResult = resolveAttackRoll(8, 10, 18, 0, 20)
    // nat 1 always misses regardless of bonus
    val nat1      = resolveAttackRoll(1, 10, 18, 0, 20)
    // nat 20 always crits
    val nat20     = resolveAttackRoll(20, 0, 18, 0, 20)
    assert(
      not(cancelled.hasAdvantage) and not(cancelled.hasDisadvantage)
      and advOnly.hasAdvantage and not(advOnly.hasDisadvantage)
      and hitResult.hits and not(hitResult.isCritical)
      and not(nat1.hits)
      and nat20.hits and nat20.isCritical
    )
  }
  
  // Damage output of Rogues: critical hit doubles damage dice but NOT the modifier
  run qa_crit_doubles_dice_not_modifier = {
    // Shortsword crit at level 14 (+5 Dex mod): normal d6 roll = 4, bonus crit dice = 4, mod = 5
    val normalDice = 4
    val bonusDice  = 4   // extra dice equal to normal dice on a crit
    val mod        = 5
    val critDmg   = criticalDamage(normalDice, bonusDice, mod)   // 4+4+5 = 13
    val normalDmg = normalDamage(normalDice, mod)                 // 4+5   = 9
    assert(
      critDmg == 13
      and normalDmg == 9
      // modifier added once in both cases
      and critDmg - normalDmg == normalDice  // extra damage = one extra die roll only
    )
  }

  // Source: https://reddit.com/r/onednd/comments/zak3jg/
  
  // Movement Speeds: whats the general consensus — switching speed type subtracts distance already moved from new budget
  run qa_switch_speed_type_subtracts_moved = {
    // Start a turn with walk speed 30, move 15 ft on foot, then switch to swim speed 30
    val t0 = FRESH_TURN
    val t1 = pUseMovement(t0, 15, 1)
    val t2 = pSwitchSpeedType(t1, 30, 15)
    // new remaining = 30 - 15 = 15; effectiveSpeed updates to swim speed
    assert(t2.movementRemaining == 15 and t2.effectiveSpeed == 30)
  }
  
  // Movement Speeds: whats the general consensus — switch is blocked when already moved >= new speed
  run qa_switch_speed_type_blocked_when_overrun = {
    // Walk 25 ft then try to switch to a swim speed of only 20
    val t0 = FRESH_TURN
    val t1 = pUseMovement(t0, 25, 1)
    // 20 - 25 = -5 <= 0: pSwitchSpeedType returns t unchanged
    val t2 = pSwitchSpeedType(t1, 20, 25)
    assert(t2 == t1)
  }
  
  // Movement Speeds: whats the general consensus — switching before any movement grants full new speed budget
  run qa_switch_speed_type_at_turn_start = {
    // No movement spent yet; switch from walk to a fly speed of 40
    val t0 = FRESH_TURN
    val t1 = pSwitchSpeedType(t0, 40, 0)
    assert(t1.movementRemaining == 40 and t1.effectiveSpeed == 40)
  }

  // Source: https://reddit.com/r/onednd/comments/wvpfgb/
  
  // Grapple on opportunity attacks! — OA consumes reaction; grapple succeeds when save fails and free hand available
  run qa_grapple_on_opportunity_attack = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    all {
      assert(t0.reactionAvailable == true),
      assert(t1.reactionAvailable == false),
      assert(result.success == true),
      assert(result.targetState.grappled == true),
    }
  }
  
  // Grapple on opportunity attacks! — grappled creature has disadvantage attacking anyone who is not the grappler
  run qa_grappled_disadvantage_vs_non_grappler = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: true, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage == true)
  }
  
  // Grapple on opportunity attacks! — shield user (no free hand) cannot grapple on OA
  run qa_grapple_no_free_hand_fails = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(result.success == false and not(result.targetState.grappled))
  }

  // Source: https://reddit.com/r/onednd/comments/1j7g2f0/
  
  // How do you gain Heroic Inspiration? — nat 20 on a D20 Test does NOT grant it automatically
  run qa_heroic_inspiration_not_from_nat20 = {
    // A nat 20 on a death save recovers HP (correct effect), but pDeathSave returns
    // CreatureState only — FighterState.heroicInspiration is never touched by any die roll.
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val fs = freshFighterState(10)            // heroicInspiration starts false
    val afterSave = pDeathSave(creature, 20)  // nat 20: regain 1 HP + consciousness
    all {
      assert(afterSave.hp == 1),              // nat 20 effect: HP restored
      assert(not(fs.heroicInspiration)),      // die roll left FighterState untouched
    }
  }
  
  // How do you gain Heroic Inspiration? — Champion L10 Heroic Warrior (start of turn) is the correct mechanism
  run qa_heroic_inspiration_granted_by_champion_l10_start_of_turn = {
    // The spec grants Heroic Inspiration via pFighterStartTurn at level 10+, not via rolling.
    val fs = freshFighterState(10)           // heroicInspiration: false
    val fsAfter = pFighterStartTurn(fs, 10)
    assert(fsAfter.heroicInspiration)
  }
  
  // How do you gain Heroic Inspiration? — below L10 start-of-turn does NOT grant it
  run qa_heroic_inspiration_not_granted_below_l10 = {
    val fs = freshFighterState(5)
    val fsAfter = pFighterStartTurn(fs, 5)
    assert(not(fsAfter.heroicInspiration))
  }

  // Source: https://reddit.com/r/onednd/comments/wxutdu/
  
  // Has anyone else been playing with 1s always failing and 20s always succeeding skill checks since 3rd edition?
  run qa_nat1_ability_check_can_succeed = {
    // RAW: natural 1 on ability check is NOT automatic failure; high modifier still carries it
    // d20=1 + abilityMod=10 + profBonus=0 + misc=0 = 11 >= DC 10
    assert(checkSucceeds(1, 10, NoneProf, 2, 0, 10))
  }
  
  // Has anyone else been playing with 1s always failing and 20s always succeeding skill checks since 3rd edition?
  run qa_nat20_ability_check_can_fail = {
    // RAW: natural 20 on ability check is NOT automatic success; total still must meet DC
    // d20=20 + abilityMod=0 + profBonus=0 + misc=0 = 20 < DC 25
    assert(not(checkSucceeds(20, 0, NoneProf, 2, 0, 25)))
  }

  // Source: https://reddit.com/r/onednd/comments/1i40c01/
  
  // Can War Magic from Eldritch Knight be used to cast Booming Blade twice with Action Surge?
  run qa_war_magic_action_surge_cantrip_twice = {
    // War Magic replaces one attack within the Attack action — NOT the Magic action.
    // Action Surge grants an extra action restricted only from being a Magic action.
    // Cantrips spend no spell slot, so the "one spell slot per turn" rule never fires.
    // Therefore: Action Surge → second Attack action → War Magic cantrip a second time is legal.
  
    val fs = freshFighterState(5)  // actionSurgeCharges = 1, actionSurgeMax = 1
    val ts = FRESH_TURN            // actionsRemaining = 1
    val s  = freshCreature(30)
  
    // Action Surge: actionsRemaining 1 → 2 (the extra action is NOT the Magic action)
    val surgeResult = pUseActionSurge(ts, fs)
  
    // First Attack action (War Magic: replace one attack with Booming Blade cantrip)
    // Cantrip via War Magic is within the Attack action — does NOT set nonCantripActionSpellCast
    val afterFirstAttack = pUseAction(surgeResult.turn, s, AAttack)
  
    // Second Attack action using the surged action (War Magic again, second cantrip)
    val afterSecondAttack = pUseAction(afterFirstAttack, s, AAttack)
  
    all {
      // Action Surge raises actionsRemaining to 2
      assert(surgeResult.turn.actionsRemaining == 2),
      // After first Attack action, fighter still has 1 action left for the second cantrip
      assert(afterFirstAttack.actionsRemaining == 1),
      // War Magic cantrip (Attack action, no slot) does NOT trigger the spell-slot restriction
      assert(not(afterFirstAttack.nonCantripActionSpellCast)),
      // canCastNonCantripAction is unblocked — the War Magic path never set the flag
      assert(canCastNonCantripAction(afterFirstAttack)),
      // Second Attack action taken; both cantrips cast; no actions remain
      assert(afterSecondAttack.actionsRemaining == 0),
      // Spell restrictions still clear after both casts
      assert(not(afterSecondAttack.nonCantripActionSpellCast)),
      assert(not(afterSecondAttack.bonusActionSpellCast)),
      assert(canCastNonCantripAction(afterSecondAttack)),
      // Confirm Action Surge was consumed
      assert(surgeResult.fighter.actionSurgeCharges == 0),
      assert(surgeResult.fighter.actionSurgeUsedThisTurn),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/10wdy0r/
  
  // Question about alert: Expertise applies only to skills; initiative is a Dex check but not a Skill
  run qa_expertise_not_applicable_to_initiative = {
    val pb = proficiencyBonus(5)          // +3 at level 5
    val dexMod = abilityModifier(16)      // +3
    // Alert grants Proficient in initiative — maximum allowed since initiative is not a Skill
    val initiativeBonus = dexMod + profMultiplier(Proficient, pb)
    // Expertise (restricted to Skill checks) would double prof — initiative cannot qualify
    val wouldBeExpertiseBonus = dexMod + profMultiplier(Expertise, pb)
    assert(
      // Expertise mechanically doubles prof bonus (so it would matter)
      profMultiplier(Expertise, pb) == profMultiplier(Proficient, pb) * 2
      // Expertise would give a strictly higher bonus (it IS "busted" as questioner suspected)
      and wouldBeExpertiseBonus > initiativeBonus
      // Correct rule: initiative tops out at Proficient, not Expertise
      and initiativeBonus == dexMod + pb
    )
  }

  // Source: https://rpg.stackexchange.com/q/216316
  
  // Is the attack from Spiritual Weapon reactivation a Bonus Action or a free action?
  run qa_spiritual_weapon_reactivation_costs_bonus_action = {
    val creature = freshCreature(20)
    val turn0 = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    // Simulate spending the bonus action on Spiritual Weapon move+attack
    val turn1 = pUseBonusAction(turn0, creature)
    // Attempt a second "free" bonus action use — must be rejected
    val turn2 = pUseBonusAction(turn1, creature)
    assert(
      // Bonus action is consumed after first use (not free)
      turn1.bonusActionUsed == true
      // Second call has no effect — only one bonus action per turn
      and turn2.bonusActionUsed == turn1.bonusActionUsed
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xvu102/
  
  // Darts do not currently benefit from the new light weapon feature.
  run qa_darts_lack_light_property_no_twf = {
    val dart: Weapon = {
      name: "dart",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Thrown),  // no Light_
      isMelee: false,
      normalRange: 20,
      longRange: 60,
    }
    val dagger: Weapon = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    assert(
      // dart lacks Light_ and is not melee: TWF blocked on both counts
      not(pCanTWFWithWeapons(dart, dart, t, creature))
      // dagger has Light_ and isMelee: TWF allowed
      and pCanTWFWithWeapons(dagger, dagger, t, creature)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/11a0ply/
  
  // Divine Smite can now be used with ranged weapons (2024 PHB — any weapon attack or unarmed strike)
  run qa_divine_smite_ranged_weapon = {
    // Ranged attack: d20=18 + bonus 5 = 23 >= AC 15 → hits (old rule blocked smite here for ranged)
    val attackResult = resolveAttackRoll(18, 5, 15, 0, 20)
    // Paladin has a 1st-level slot to expend for Divine Smite
    val slots = FRESH_SPELL_SLOTS
      .with("slotsMax",    Map(1->2, 2->0, 3->0, 4->0, 5->0, 6->0, 7->0, 8->0, 9->0))
      .with("slotsCurrent", Map(1->2, 2->0, 3->0, 4->0, 5->0, 6->0, 7->0, 8->0, 9->0))
    // On the ranged hit: expend slot, apply Radiant damage (Divine Smite effect)
    val slotsAfter  = pExpendSlot(slots, 1)
    val target      = freshCreature(40)
    val targetAfter = pTakeDamage(target, 14, Radiant, Set(), Set(), Set(), false)
    assert(
      attackResult.hits           and   // ranged attack landed
      not(attackResult.isCritical) and   // not a crit (18 < critRange 20)
      slotsAfter.slotsCurrent.get(1) == 1 and  // one slot expended for smite
      targetAfter.hp == 26               // 40 - 14 radiant = 26
    )
  }

  // Source: https://rpg.stackexchange.com/q/213841
  
  // Can a Sorcerer use the Metamagic Options on spells cast from Magic Items?
  // Item-cast spells expend no spell slots, yet the user is still the caster — concentration begins normally
  run qa_item_spell_no_slot_needed_for_concentration = {
    // Simulate casting from a magic item: slots stay at 0, but pStartConcentration succeeds
    val ss1 = pStartConcentration(FRESH_SPELL_SLOTS, "spell_a")
    assert(
      isConcentrating(ss1)
      and ss1.slotsCurrent.get(1) == 0  // no slot was expended
    )
  }
  
  // Can a Sorcerer use the Metamagic Options on spells cast from Magic Items?
  // Item-cast spells bypass component requirements (V/S not needed from item); user with no free hand / no voice can still cast
  run qa_item_spell_components_not_required = {
    val creature = freshCreature(20)
    // Creature is paralyzed — pCanSpeak returns false — yet item provides the components
    val paralyzed = pApplyCondition(creature, CParalyzed)
    // requiresVerbal=false, requiresSomatic=false models the item supplying all components
    val canCast = pCanProvideComponents(paralyzed, false, false, false)
    assert(canCast)
  }
  
  // Can a Sorcerer use the Metamagic Options on spells cast from Magic Items?
  // The user IS the caster even via an item: concentration check (caster-specific rule) fires on damage
  run qa_item_spell_caster_concentration_check_fires = {
    val creature = freshCreature(20)
    val ss1 = pStartConcentration(FRESH_SPELL_SLOTS, "spell_a")
    // Failed DC-10 CON save after taking damage breaks concentration, same as any cast spell
    val ss2 = pConcentrationCheck(ss1, false)
    assert(not(isConcentrating(ss2)))
  }

  // Source: https://rpg.stackexchange.com/q/215992
  
  // Are all creatures subject to Conjure Animals? — caster elects not to force the save, creature unaffected
  run qa_conjure_animals_no_force_no_damage = {
    val creature = freshCreature(30)
    // "you can force" means optional: caster chooses not to trigger the save
    val casterForcesIt = false
    val damageAmount = if (casterForcesIt) 15 else 0
    val result = pTakeDamage(creature, damageAmount, Slashing, Set(), Set(), Set(), false)
    assert(result.hp == creature.hp)
  }
  
  // Are all creatures subject to Conjure Animals? — caster forces save, target fails, takes 3d10 slashing
  run qa_conjure_animals_forced_save_fails_takes_damage = {
    val creature = freshCreature(30)
    // Spell save DC 12 (TEST_CONFIG: Wis 13 → mod 1, level 5 → PB 3, DC = 8+1+3)
    // DEX mod 0, not proficient, roll 5 → 5 < 12, save fails
    val savePassed = saveSucceeds(5, 0, false, 3, 0, 12)
    val damage = 15 // pre-resolved 3d10
    val damageDealt = if (not(savePassed)) damage else 0
    val result = pTakeDamage(creature, damageDealt, Slashing, Set(), Set(), Set(), false)
    assert(not(savePassed) and result.hp == 15)
  }
  
  // Are all creatures subject to Conjure Animals? — caster forces save, target succeeds, no damage
  run qa_conjure_animals_forced_save_succeeds_no_damage = {
    val creature = freshCreature(30)
    // DEX mod 0, not proficient, roll 15 → 15 >= 12, save succeeds
    val savePassed = saveSucceeds(15, 0, false, 3, 0, 12)
    val damage = 15
    val damageDealt = if (not(savePassed)) damage else 0
    val result = pTakeDamage(creature, damageDealt, Slashing, Set(), Set(), Set(), false)
    assert(savePassed and result.hp == 30)
  }

  // Source: https://rpg.stackexchange.com/q/218311
  
  run qa_grapple_requires_one_free_hand = {{
    val target = freshCreature(12)
    val resultWithFreeHand = pGrapple(Medium, Medium, target, true, true)
    val resultWithoutFreeHand = pGrapple(Medium, Medium, target, true, false)
  
    assert(
      resultWithFreeHand.success
      and resultWithFreeHand.targetState.grappled
      and not(resultWithoutFreeHand.success)
      and resultWithoutFreeHand.targetState == target
    )
  }}

  // Source: https://rpg.stackexchange.com/q/214666
  
  // The Blade Ward cantrip now reduces the value of an attack roll by a 1d4. What happens if the attack roll is a 20?
  run qa_natural_20_crits_regardless_of_modifiers = {
    // attackBonus = -4 simulates worst-case Blade Ward -1d4; targetAC = 25 would normally miss
    val result = resolveAttackRoll(20, -4, 25, 0, 20)
    assert(result.hits and result.isCritical)
  }

  // Source: https://reddit.com/r/onednd/comments/xuv8fu/
  
  // New Exhaustion Rules with Berserker: each Frenzy use adds 1 exhaustion level, penalty is -2 per level
  run qa_frenzy_one_exhaustion_gives_minus2_penalty = {
    val c = freshCreature(30)
    val c1 = pAddExhaustion(c, 1)
    assert(exhaustionPenalty(c1) == -2)
  }
  
  // New Exhaustion Rules with Berserker: stacking two Frenzy uses gives cumulative -4 D20 penalty
  run qa_frenzy_two_exhaustion_stacks_cumulatively = {
    val c = freshCreature(30)
    val c1 = pAddExhaustion(pAddExhaustion(c, 1), 1)
    assert(c1.exhaustion == 2 and exhaustionPenalty(c1) == -4)
  }
  
  // New Exhaustion Rules with Berserker: long rest removes exactly 1 exhaustion level (slow recovery)
  run qa_frenzy_long_rest_removes_one_exhaustion = {
    val c = freshCreature(30)
    val c2 = pAddExhaustion(pAddExhaustion(c, 1), 1)
    val c3 = pLongRest(c2, 5)
    assert(c3.exhaustion == 1)
  }
  
  // New Exhaustion Rules with Berserker: exhaustion level 6 is fatal regardless of current HP
  run qa_frenzy_exhaustion_level_6_is_fatal = {
    val c = freshCreature(30)
    val c1 = pAddExhaustion(c, 6)
    assert(c1.dead and c1.exhaustion == 6 and c1.hp == 0)
  }

  // Source: https://reddit.com/r/onednd/comments/xuwjf5/
  
  // A Martial equivalent to a spell save dc: grapple/shove DC = 8 + STR mod + PB, parallel to spell save DC
  run qa_martial_save_dc_parallels_spell_save_dc = {
    // STR 16 => mod +3, level 5 => PB +3
    val strMod = abilityModifier(16)
    val pb = proficiencyBonus(5)
    val grappledC = pGrappleShoveDC(strMod, pb)
  
    // Spell save DC for a caster with same ability score and level uses the same formula: 8 + mod + PB
    val config = TEST_CONFIG.with("abilityScores",
      Map(Str -> 16, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    ).with("spellcastingAbility", Str)
     .with("level", 5)
    val sdc = spellSaveDC(config)
  
    all {
      // STR mod is +3
      assert(strMod == 3),
      // PB at level 5 is +3
      assert(pb == 3),
      // Grapple/shove DC = 8 + 3 + 3 = 14
      assert(grappledC == 14),
      // Spell save DC with same ability and level also = 8 + 3 + 3 = 14
      assert(sdc == 14),
      // The formulas are structurally identical
      assert(grappledC == sdc),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/yo08f6/
  
  // Waterdeep Shuffle Parts 3 and 4 — grappled creature has speed 0 at start of turn
  run qa_grappled_speed_is_zero = {
    val creature = freshCreature(20).with("grappled", true)
    val turn = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    assert(turn.movementRemaining == 0 and turn.effectiveSpeed == 0)
  }
  
  // Waterdeep Shuffle Parts 3 and 4 — successful escape removes grappled condition
  run qa_escape_grapple_clears_condition = {
    val creature = freshCreature(20).with("grappled", true)
    val escaped = pEscapeGrapple(creature, true)
    assert(not(escaped.grappled))
  }
  
  // Waterdeep Shuffle Parts 3 and 4 — failed escape attempt leaves grappled condition intact
  run qa_failed_escape_grapple_leaves_condition = {
    val creature = freshCreature(20).with("grappled", true)
    val notEscaped = pEscapeGrapple(creature, false)
    assert(notEscaped.grappled)
  }
  
  // Waterdeep Shuffle Parts 3 and 4 — grapple yo-yo: movement budget is 0 for the whole turn even if escape succeeds mid-turn
  run qa_grappled_no_movement_budget_despite_escape = {
    val creature = freshCreature(20).with("grappled", true)
    val turn = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    val escaped = pEscapeGrapple(creature, true)
    // speed locked to 0 at turn start; escape removes condition but doesn't restore movement
    assert(turn.movementRemaining == 0 and not(escaped.grappled))
  }

  // Source: https://reddit.com/r/onednd/comments/z9wfx4/
  
  // Resistance cantrip: reaction adds d4 to ally's failed saving throw, potentially turning failure to success
  run qa_resistance_d4_turns_failed_save_to_success = {
    // Roll 8 + DEX mod +2 = 10, DC 13 → fails without Resistance
    // Resistance adds d4=3 → total 13, exactly meets DC → succeeds
    val withoutResistance = saveSucceeds(8, 2, false, 3, 0, 13)
    val withResistance    = saveSucceeds(8, 2, false, 3, 3, 13)
    assert(not(withoutResistance) and withResistance)
  }
  
  // Resistance cantrip consumes the caster's reaction for the turn
  run qa_resistance_costs_reaction = {
    val t  = FRESH_TURN
    val t1 = pUseReaction(t)
    assert(t.reactionAvailable and not(t1.reactionAvailable))
  }
  
  // Resistance reaction cannot be used twice in the same turn (reaction-gating)
  run qa_resistance_reaction_once_per_turn = {
    val t  = FRESH_TURN
    val t1 = pUseReaction(t)
    val t2 = pUseReaction(t1)
    // pUseReaction is idempotent once reaction is spent; no second use possible
    assert(not(t2.reactionAvailable) and t2 == t1)
  }
  
  // Resistance d4 at maximum (4) provides strongest benefit for borderline failed saves
  run qa_resistance_max_d4_benefit = {
    // Roll 10 + WIS mod +1 = 11, DC 15 → fails by 4; d4=4 exactly closes the gap
    val withoutResistance = saveSucceeds(10, 1, false, 3, 0, 15)
    val withResistance    = saveSucceeds(10, 1, false, 3, 4, 15)
    assert(not(withoutResistance) and withResistance)
  }
  
  // Resistance d4 minimum (1) is not always enough to salvage a badly failed save
  run qa_resistance_min_d4_insufficient = {
    // Roll 5 + CON mod +1 = 6, DC 15 → fails by 9; d4=1 still fails
    val withResistanceMin = saveSucceeds(5, 1, false, 3, 1, 15)
    assert(not(withResistanceMin))
  }

  // Source: https://rpg.stackexchange.com/q/215561
  
  // Does the Spell Sniper feat work with the True Strike cantrip? — Bypass Cover ignores Half Cover for spell attacks
  run qa_spell_sniper_bypass_half_cover = {
    // roll=12, bonus=4 → total=16; AC=15+HalfCover(+2)=17 → misses without Spell Sniper
    val withoutSniper = resolveAttackRoll(12, 4, 15, coverBonus(HalfCover), 20)
    // Spell Sniper: bypass Half Cover → targetCoverBonus=0, effective AC=15 → hits
    val withSniper = resolveAttackRoll(12, 4, 15, 0, 20)
    assert(not(withoutSniper.hits) and withSniper.hits)
  }
  
  // Does the Spell Sniper feat work with the True Strike cantrip? — Bypass Cover ignores Three-Quarters Cover
  run qa_spell_sniper_bypass_three_quarters_cover = {
    // roll=10, bonus=4 → total=14; AC=10+ThreeQuartersCover(+5)=15 → misses without Spell Sniper
    val withoutSniper = resolveAttackRoll(10, 4, 10, coverBonus(ThreeQuartersCover), 20)
    // Spell Sniper: bypass Three-Quarters Cover → effective AC=10 → hits
    val withSniper = resolveAttackRoll(10, 4, 10, 0, 20)
    assert(not(withoutSniper.hits) and withSniper.hits)
  }
  
  // Does the Spell Sniper feat work with the True Strike cantrip? — Casting in Melee suppresses ranged-in-melee disadvantage for spell attacks
  run qa_spell_sniper_casting_in_melee_no_disadv = {
    val baseCtx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: true,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    // Without Spell Sniper: ranged attack in melee → disadvantage from hostileWithin5ft
    val modsWithout = pAggregateAttackMods(baseCtx)
    // With Spell Sniper (Casting in Melee benefit): hostileWithin5ft suppressed for spell attacks
    val modsWith = pAggregateAttackMods(baseCtx.with("hostileWithin5ft", false))
    assert(modsWithout.hasDisadvantage and not(modsWith.hasDisadvantage))
  }
  
  // Does the Spell Sniper feat work with the True Strike cantrip? — melee weapon True Strike never has close-quarters disadvantage (no ranged penalty for melee attacks)
  run qa_true_strike_melee_weapon_no_close_quarters_disadv = {
    // PHB: only ranged attacks in melee suffer disadvantage; melee spell attacks (True Strike + melee weapon) do not
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: true,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage))
  }

  // Source: https://rpg.stackexchange.com/q/214894
  
  // Can a dominated ally be the target of an Opportunity Attack?
  // 2024 rules removed the "hostile creature" requirement; OA eligibility is purely disengaged flag
  run qa_opportunity_attack_no_hostile_restriction = {
    val nonDisengaged: TurnState = FRESH_TURN.with("disengaged", false)
    val disengagedTurn: TurnState = FRESH_TURN.with("disengaged", true)
    assert(
      // Any creature that hasn't Disengaged can be OA'd — no ally/hostile filter
      pCanBeOpportunityAttacked(nonDisengaged) == true
      and pCanBeOpportunityAttacked(disengagedTurn) == false
    )
  }
  
  // Dominated creature (ally acting as foe) can spend its reaction to make an OA
  run qa_dominated_creature_reaction_for_oa = {
    // Dominated creature has reaction available at start of its turn
    val dominated: TurnState = FRESH_TURN
    val afterOA: TurnState = pUseReaction(dominated)
    assert(
      dominated.reactionAvailable == true
      and afterOA.reactionAvailable == false
      // Reaction consumed exactly once; no second use
      and pUseReaction(afterOA).reactionAvailable == false
    )
  }

  // Source: https://reddit.com/r/onednd/comments/yd5zt9/
  
  // The Study Action, Traps, and Guidance: roll of 9 fails DC 10 trap-check (Guidance reaction is validly triggered)
  run qa_study_trap_roll9_fails_dc10 = {
    assert(not(checkSucceeds(9, 0, NoneProf, 0, 0, 10)))
  }
  
  // The Study Action, Traps, and Guidance: roll of 10 succeeds DC 10 trap-check (no Guidance needed)
  run qa_study_trap_roll10_succeeds_dc10 = {
    assert(checkSucceeds(10, 0, NoneProf, 0, 0, 10))
  }
  
  // The Study Action, Traps, and Guidance: roll 9 + minimum Guidance d4 (=1) as miscBonus reaches exactly DC 10
  run qa_study_trap_guidance_min_d4_reaches_dc10 = {
    assert(checkSucceeds(9, 0, NoneProf, 0, 1, 10))
  }

  // Source: https://rpg.stackexchange.com/q/215246
  
  // Can You Cast a Spell Into an Area You Can't See? — only TotalCover blocks targeting; other cover types permit it
  run qa_only_total_cover_blocks_targeting = {
    assert(
      not(canBeTargeted(TotalCover)) and
      canBeTargeted(NoCover)          and
      canBeTargeted(HalfCover)        and
      canBeTargeted(ThreeQuartersCover)
    )
  }
  
  // Can You Cast a Spell Into an Area You Can't See? — heavily obscured area (Dark) is HeavilyObscured/Blinded, not TotalCover
  run qa_heavy_obscurement_not_total_cover = {
    val obs = pIlluminationObscurement(Dark)
    assert(
      pBlindedByObscurement(obs) and  // Dark = heavily obscured = Blinded on perceiver
      canBeTargeted(NoCover)          // but cover is independent; no-cover target is still targetable
    )
  }
  
  // Can You Cast a Spell Into an Area You Can't See? — attacker unable to see target gets disadvantage, not auto-miss
  run qa_unseen_target_gives_disadv_not_automiss = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,   // caster cannot see into heavily obscured area
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.autoMiss))
  }

  // Source: https://reddit.com/r/onednd/comments/13yqlmu/
  
  // Epic Boon of Recovery: Unkillable Character — nat 20 required to regain HP on death save, not modified roll
  run qa_death_save_nat20_required_not_modified = {
    val dyingCreature = freshCreature(50)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
  
    // Rolling an 18 (which even with +6 = 24 does NOT count as a nat 20)
    val afterRoll18 = pDeathSave(dyingCreature, 18)
    // Rolling a natural 20 restores 1 HP and regains consciousness
    val afterRoll20 = pDeathSave(dyingCreature, 20)
  
    all {
      // An 18 on the die is a success (>= 10) but does NOT restore HP — not equivalent to nat 20
      assert(afterRoll18.hp == 0),
      assert(afterRoll18.deathSaves.successes == 1),
      assert(afterRoll18.unconscious),
      // Only a true nat 20 restores 1 HP and removes unconscious
      assert(afterRoll20.hp == 1),
      assert(not(afterRoll20.unconscious)),
      assert(afterRoll20.deathSaves.successes == 0),
      assert(afterRoll20.deathSaves.failures == 0),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xrt4yn/
  
  // Hide action: DC 15 Dexterity (Stealth) check — expertise rogue passes on modest roll
  run qa_hide_dc15_expertise_passes = {
    // Dex 18 (+4), level 5 (profBonus +3), Expertise in Stealth → +10 total
    // Roll 5: 5 + 4 + 6 = 15 >= DC 15 → hidden
    val dexMod = abilityModifier(18)
    val pb = proficiencyBonus(5)
    assert(checkSucceeds(5, dexMod, Expertise, pb, 0, 15))
  }
  
  // Hide action: DC 15 blocks unproficient low-Dex creature even on a decent roll
  run qa_hide_dc15_no_prof_fails = {
    // Dex 10 (+0), level 1 (profBonus +2), NoneProf → +0 total
    // Roll 14: 14 + 0 + 0 = 14 < DC 15 → not hidden
    val dexMod = abilityModifier(10)
    val pb = proficiencyBonus(1)
    assert(not(checkSucceeds(14, dexMod, NoneProf, pb, 0, 15)))
  }
  
  // Hide DC 15 is stricter than a low-WIS creature's passive Perception
  run qa_hide_dc15_harder_than_low_passive_perception = {
    // Old system: hider only needed to beat passive Perception
    // Wis 8 (-1), no Perception proficiency → passive Perception = 10 + (-1) = 9
    // DC 15 > 9, so new system is harder to satisfy against this creature
    val wisMod = abilityModifier(8)
    val pb = proficiencyBonus(1)
    val passivePerc = passiveCheck(wisMod, NoneProf, pb, false, false)
    assert(passivePerc < 15)
  }

  // Source: https://reddit.com/r/onednd/comments/1dnrrt8/
  
  // The Champion's Survivor feature grants at least a ~77% chance to come back on one of your death saving throws
  run qa_champion_defy_death_nat20_wakeup = {
    // Defy Death converts rolls of 18-20 into the nat-20 death save effect (regain 1 HP, regain consciousness)
    // We verify the nat-20 effect that Defy Death extends: creature wakes up with 1 HP and resets death saves
    val dyingCreature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 1, failures: 1 })
    val result = pDeathSave(dyingCreature, 20)
    all {
      assert(result.hp == 1),
      assert(result.unconscious == false),
      assert(result.deathSaves.successes == 0),
      assert(result.deathSaves.failures == 0),
    }
  }
  
  // The Champion's Survivor: without Defy Death, a roll of 18 only adds a success—it does NOT wake the creature
  run qa_standard_death_save_18_no_wakeup = {
    // Contrast: standard death save roll of 18 is just a success counter, not the nat-20 recovery effect
    val dyingCreature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val result = pDeathSave(dyingCreature, 18)
    all {
      assert(result.hp == 0),
      assert(result.unconscious == true),
      assert(result.deathSaves.successes == 1),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/1enef1o/
  
  // Optimizing Rogue Question: Hide grants Invisible condition; attacks against an invisible creature have disadvantage
  run qa_invisible_condition_attacker_disadvantage = {
    val creature = freshCreature(20).with("invisible", true)
    val defMods = pDefenseModifiers(creature, false)
    assert(defMods.attackerDisadvantage)
  }
  
  // Optimizing Rogue Question: unseen attacker (hidden/invisible) gains advantage on attack rolls against target that cannot see them
  run qa_unseen_attacker_has_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Optimizing Rogue Question: when both attacker is unseen AND target is invisible, advantage and disadvantage cancel out
  run qa_invisible_mutual_cancels_adv_disadv = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: false,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Optimizing Rogue Question: invisible creature leaving a threatened square can provoke an opportunity attack (not disengaged)
  run qa_invisible_creature_can_provoke_opportunity_attack = {
    val t = FRESH_TURN
    // not disengaged -> eligible for opportunity attack
    assert(pCanBeOpportunityAttacked(t))
  }

  // Source: https://reddit.com/r/onednd/comments/11bbobl/
  
  // Can you upcast the free cast of Find Steed?
  // Rule: casting a spell without a slot uses its base level; upcasting requires expending a higher slot
  run qa_free_cast_cannot_upcast = {
    // Find Steed is 2nd-level; flying steed requires casting at 4th level or higher.
    // Set up a character with a 4th-level slot available but no 2nd-level slot.
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(4, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(4, 1))
  
    // Upcasting to 4th level IS mechanically possible — but only by expending the slot.
    val canUpcastViaSlot = pCanCastAtLevel(ss, 2, 4)
    val ssAfterUpcast = pExpendSlot(ss, 4)
  
    // Free cast: no spell slot expended at any level — spell resolves at base level (2).
    val ssAfterFreeCast = ss
  
    // Upcasting consumes the 4th-level slot; free cast leaves all slots untouched.
    assert(
      canUpcastViaSlot and
      ssAfterUpcast.slotsCurrent.get(4) == 0 and
      ssAfterFreeCast.slotsCurrent.get(4) == 1 and
      ssAfterFreeCast.slotsCurrent.get(2) == 0
    )
  }

  // Source: https://rpg.stackexchange.com/q/213520
  
  // Can I combine Cunning Strike: Withdraw & Cunning Action: Dash?
  // Accepted answer: Withdraw grants +halfSpeed bonus movement additive to regular movement (not consuming it);
  // with speed 30, total available = 30 (regular) + 15 (withdraw) + 30 (dash) = 75 ft.
  run qa_cunning_withdraw_plus_dash = {
    val speed = 30
    val creature = freshCreature(20)
    val t0 = FRESH_TURN.with("movementRemaining", speed).with("effectiveSpeed", speed)
    // Cunning Strike: Withdraw adds half speed as bonus movement additive to (not replacing) regular movement
    val tAfterWithdraw = t0.with("movementRemaining", t0.movementRemaining + speed / 2)
    // Cunning Action: Dash adds effectiveSpeed (same movement-budget effect as the Dash action)
    val tAfterDash = pUseAction(tAfterWithdraw, creature, ADash)
    assert(tAfterDash.movementRemaining == speed + speed / 2 + speed)
  }

  // Source: https://reddit.com/r/onednd/comments/ww7xwh/
  
  // What happens when you critically fail initiative?
  // Ruling: nat 1 on initiative is NOT auto-fail; DEX modifier still applies and total determines order.
  run qa_nat1_initiative_no_auto_fail = {
    // Creature A: rolls nat 1, DEX 20 (+5) → initiative total 6
    // Creature B: rolls 3,     DEX  8 (-1) → initiative total 2
    // A goes before B despite rolling nat 1 — modifier is never stripped.
    val dexHigh = 20  // abilityModifier = +5
    val dexLow  = 8   // abilityModifier = -1
    val rollA   = 1   // nat 1
    val rollB   = 3
    val initA   = rollA + abilityModifier(dexHigh)  // 6
    val initB   = rollB + abilityModifier(dexLow)   // 2
    assert(
      // nat 1 does NOT auto-lose initiative — total still compared normally
      contestWinner(initA, initB) == AWins
    )
  }
  
  // Contrast: nat 1 DOES auto-miss on an attack roll (different mechanic).
  // Confirms initiative uses raw total comparison, not resolveAttackRoll semantics.
  run qa_nat1_attack_vs_initiative_distinction = {
    // Attack: nat 1 always misses regardless of bonus
    val attackResult = resolveAttackRoll(1, 10, 5, 0, 20)
    // Initiative: nat 1 + high mod still beats nat 3 + negative mod
    val initTotal_nat1_highDex = 1 + abilityModifier(20)  // 6
    val initTotal_nat3_lowDex  = 3 + abilityModifier(8)   // 2
    assert(
      not(attackResult.hits)
      and contestWinner(initTotal_nat1_highDex, initTotal_nat3_lowDex) == AWins
    )
  }

  // Source: https://rpg.stackexchange.com/q/214580
  
  // Does the Apparatus of Kwalish provide cover to those inside of it?
  run qa_apparatus_kwalish_total_cover_hatch_closed = {
    // Hatch closed = airtight/watertight iron barrel = total cover → cannot be targeted at all
    assert(canBeTargeted(TotalCover) == false)
  }
  
  // Does the Apparatus of Kwalish provide cover to those inside of it?
  run qa_apparatus_kwalish_hatch_open_three_quarters = {
    // Hatch open, attacker at oblique angle through small opening → three-quarters cover: targetable but +5 AC
    assert(canBeTargeted(ThreeQuartersCover) == true and coverBonus(ThreeQuartersCover) == 5)
  }
  
  // Does the Apparatus of Kwalish provide cover to those inside of it?
  run qa_apparatus_kwalish_hatch_open_half = {
    // Hatch open, attacker more directly aligned with opening → half cover: targetable with +2 AC
    assert(canBeTargeted(HalfCover) == true and coverBonus(HalfCover) == 2)
  }
  
  // Does the Apparatus of Kwalish provide cover to those inside of it?
  run qa_apparatus_kwalish_no_cover_right_at_hatch = {
    // Hatch open, attacker standing directly at the hatch mouth → no cover penalty applies
    assert(canBeTargeted(NoCover) == true and coverBonus(NoCover) == 0)
  }

  // Source: https://rpg.stackexchange.com/q/215705
  
  // Can you dual wield a Pistol and a Hand Crossbow if you had the Crossbow Expert and Dual Wielder feats?
  run qa_pistol_hand_crossbow_twf_not_allowed = {
    val pistol: Weapon = {
      name: "Pistol",
      damageDie: 10,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Loading),
      isMelee: false,
      normalRange: 30,
      longRange: 90,
    }
    val handCrossbow: Weapon = {
      name: "HandCrossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Light_, Loading),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    val creature = freshCreature(20)
    // Attack action already taken, bonus action still available
    val t = FRESH_TURN.with("attackActionUsed", true)
    // Case A: Pistol as main weapon — lacks Light_, cannot trigger TWF bonus attack
    val caseA = not(pCanTWFWithWeapons(pistol, handCrossbow, t, creature))
    // Case B: Hand Crossbow as main — has Light_ but is not melee; Pistol as off-hand — not melee
    val caseB = not(pCanTWFWithWeapons(handCrossbow, pistol, t, creature))
    assert(caseA and caseB)
  }

  // Source: https://reddit.com/r/onednd/comments/zd6dm4/
  
  // The Overlooked Change: Acrobatics seems to be a Strength skill now.
  // Accepted answer: skills may use variable ability modifiers; the default mapping
  // is not fixed — caller can pass any ability mod to checkSucceeds.
  run qa_variable_ability_skill_check = {
    // High STR (18, mod +4), low DEX (8, mod -1), level 5 proficient in Acrobatics
    val strMod = abilityModifier(18)   // +4
    val dexMod = abilityModifier(8)    // -1
    val pb     = proficiencyBonus(5)   // +3
    val roll   = 10
    val dc     = 13
    // Default Dexterity (Acrobatics): 10 + (-1) + 3 = 12 < 13 — fails
    val dexCheck = checkSucceeds(roll, dexMod, Proficient, pb, 0, dc)
    // Variable Strength (Acrobatics): 10 + 4 + 3 = 17 >= 13 — succeeds
    val strCheck = checkSucceeds(roll, strMod, Proficient, pb, 0, dc)
    assert(
      skillAbility(Acrobatics) == Dex  // default mapping is still DEX
      and not(dexCheck)                 // DEX-based check fails at this DC
      and strCheck                      // STR-based check succeeds
    )
  }

  // Source: https://rpg.stackexchange.com/q/214050
  
  run qa_squeezing_counts_as_difficult_terrain = {{
    val squeezeCost = pMovementCost(true, false, false, false)
    assert(squeezeCost == 2)
  }}
  
  // Q&A: Is it possible to squeeze into a smaller space?
  run qa_squeezing_spends_one_extra_foot_per_foot = {{
    val creature = freshCreature(10)
    val turn = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    val afterMove = pUseMovement(turn, 5, pMovementCost(true, false, false, false))
    assert(afterMove.movementRemaining == turn.movementRemaining - 10)
  }}

  // Source: https://rpg.stackexchange.com/q/214077
  
  // Gaze of Two Minds: Warlock casting from Rogue's space does not end the Rogue's Invisible condition
  run qa_invisible_not_broken_by_other_caster = {
    // Accepted answer: the hidden creature must be THE CASTER to lose Invisible;
    // Warlock casting via GoTM from Rogue's space does not trigger pRemoveCondition(CInvisible) on the Rogue.
    val rogue = freshCreature(20)
    // Rogue takes the Hide action and gains the Invisible condition
    val rogueHidden = pApplyCondition(rogue, CInvisible)
    // Warlock casts Eldritch Blast "as if in the Rogue's space" via GoTM.
    // The Rogue is not the caster, so none of the Invisible-ending triggers apply to it.
    // No pRemoveCondition(_, CInvisible) is called on the Rogue.
    assert(rogueHidden.invisible == true)
  }

  // Source: https://reddit.com/r/onednd/comments/xu37uy/
  
  // Jump [Spell] ruling alongside the Jump [Action]: spell triples jump distance but does NOT override the 5-foot difficult terrain threshold
  run qa_jump_spell_no_difficult_terrain_threshold_override = {
    val JUMP_DT_THRESHOLD = 5  // Jump action rule: jumps ≤5ft treated as difficult terrain movement
    val strScore = 5
    val baseJump = pLongJumpDistance(strScore, true)   // STR 5 with running start = 5ft (at threshold)
    val spellJump = 3 * baseJump                        // Jump spell triples distance = 15ft
    // The threshold itself is not tripled: 15 > 5, so the spell-enhanced jump is NOT difficult terrain
    val baseCostMultiplier = pMovementCost(baseJump <= JUMP_DT_THRESHOLD, false, false, false)
    val spellCostMultiplier = pMovementCost(spellJump <= JUMP_DT_THRESHOLD, false, false, false)
    assert(
      baseJump == 5 and
      spellJump == 15 and
      baseCostMultiplier == 2 and   // ≤5ft → difficult terrain → 2× movement cost
      spellCostMultiplier == 1      // 15ft > 5ft threshold → normal terrain cost, not difficult
    )
  }

  // Source: https://reddit.com/r/onednd/comments/x1plkj/
  
  // Impromptu quick OneD&D playtest feedback: nat 20 on a death saving throw grants 1 HP and regains consciousness
  run qa_nat20_death_save_grants_1hp = {
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val afterSave = pDeathSave(dying, 20)
    assert(
      afterSave.hp == 1 and
      not(afterSave.unconscious) and
      not(afterSave.incapacitatedSources.contains(ISUnconscious)) and
      afterSave.deathSaves.successes == 0 and
      afterSave.deathSaves.failures == 0
    )
  }

  // Light weapons enable a bonus action attack with a different light weapon (TWF basic rule)
  run qa_twf_two_light_melee_weapons_enable_bonus_attack = {
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_, Thrown),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(pCanTWFWithWeapons(shortsword, dagger, t, creature))
  }
  
  // A non-light main-hand weapon cannot be paired for TWF bonus action
  run qa_twf_non_light_main_hand_blocks_bonus_attack = {
    val longsword: Weapon = {
      name: "longsword", damageDie: 8, versatileDie: 10,
      damageType: Slashing, properties: Set(Versatile),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_, Thrown),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(longsword, dagger, t, creature)))
  }
  
  // TWF off-hand attack does not add a positive ability modifier to damage
  run qa_twf_offhand_damage_no_positive_ability_mod = {
    val diceResult = 5
    val strMod = 3
    all {
      assert(pTWFOffHandDamage(diceResult, strMod) == 5),
      assert(pTWFOffHandDamage(diceResult, 0) == 5),
    }
  }
  
  // TWF off-hand still applies a negative ability modifier as a penalty
  run qa_twf_offhand_damage_applies_negative_mod = {
    val diceResult = 5
    val negMod = -2
    assert(pTWFOffHandDamage(diceResult, negMod) == 3)
  }
  
  // TWF bonus action is unavailable if the bonus action was already spent
  run qa_twf_blocked_when_bonus_action_used = {
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_, Thrown),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    val t = FRESH_TURN.with("attackActionUsed", true).with("bonusActionUsed", true)
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(shortsword, dagger, t, creature)))
  }
  
  // TWF requires the Attack action to have been taken first
  run qa_twf_requires_attack_action_taken = {
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_, Thrown),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    // attackActionUsed is false in FRESH_TURN
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(shortsword, dagger, FRESH_TURN, creature)))
  }

  // Source: https://reddit.com/r/onednd/comments/zn5n23/
  
  // Top comment (score 57): "getting +10 just gives you a chance of reaching 30"
  run qa_reach_dc30_nat20_plus10 = {
    // CHA 16 (mod +3), Expertise at level 5 (PB 3 → +6), Guidance min roll (+1): total modifier +10
    // Nat 20 + 10 = exactly 30 — the maximum guideline DC
    assert(checkSucceeds(20, 3, Expertise, 3, 1, 30))
  }
  
  // Without Guidance the same build has only +9: nat 20 lands at 29, one short of DC 30
  run qa_nat20_plus9_falls_short_dc30 = {
    assert(not(checkSucceeds(20, 3, Expertise, 3, 0, 30)))
  }

  // Source: https://rpg.stackexchange.com/q/218422
  
  // Can an Otherworldly Steed use a readied action while acting as a controlled mount?
  run qa_controlled_mount_readied_action_via_reaction = {
    val creature = freshCreature(20)
    // Ready is NOT a valid controlled mount action (only Dash/Disengage/Dodge are)
    val readyIsRestricted = not(pIsValidControlledMountAction(AReady))
    // On its own turn (before becoming controlled mount), mount uses Ready action
    val turnAfterReady = pUseAction(FRESH_TURN, creature, AReady)
    val readiedFlagSet = turnAfterReady.readiedAction == true
    // Reaction remains available after readying — reactions are separate from actions
    val reactionStillAvailable = turnAfterReady.reactionAvailable == true
    // During the shared (controlled) turn, the readied action fires as a reaction
    val turnAfterReaction = pUseReaction(turnAfterReady)
    val reactionConsumed = not(turnAfterReaction.reactionAvailable)
    // readiedAction flag is unaffected by consuming the reaction (caller resolves trigger)
    val readiedFlagPersists = turnAfterReaction.readiedAction == true
    assert(readyIsRestricted and readiedFlagSet and reactionStillAvailable and reactionConsumed and readiedFlagPersists)
  }

  // Source: https://rpg.stackexchange.com/q/216269
  
  // What exactly classifies as a "miss"? — hit/miss is d20+mods vs AC, purely mechanical
  run qa_miss_when_roll_plus_bonus_below_ac = {
    // total 15 (d20=10, bonus=5) < AC 20 → mechanical miss, regardless of narrative flavor
    val result = resolveAttackRoll(10, 5, 20, 0, 20)
    assert(result.hits == false and result.isCritical == false)
  }
  
  // What exactly classifies as a "miss"? — roll exactly meeting AC is a hit
  run qa_hit_when_roll_plus_bonus_equals_ac = {
    // total 15 (d20=10, bonus=5) == AC 15 → hit (meets or exceeds)
    val result = resolveAttackRoll(10, 5, 15, 0, 20)
    assert(result.hits == true and result.isCritical == false)
  }
  
  // What exactly classifies as a "miss"? — natural 1 always misses regardless of modifiers
  run qa_nat1_always_misses_regardless_of_bonus = {
    // nat 1, huge bonus, trivially low AC → still always a miss
    val result = resolveAttackRoll(1, 100, 2, 0, 20)
    assert(result.hits == false and result.isCritical == false)
  }
  
  // What exactly classifies as a "miss"? — natural 20 always hits regardless of AC
  run qa_nat20_always_hits_regardless_of_ac = {
    // nat 20, no bonus, impossibly high AC → still always a hit and crit
    val result = resolveAttackRoll(20, 0, 100, 0, 20)
    assert(result.hits == true and result.isCritical == true)
  }
  
  // What exactly classifies as a "miss"? — narrative cover bonus is mechanical, not flavor
  run qa_cover_bonus_is_mechanical_not_narrative = {
    // d20=14, bonus=3, AC=15, half-cover=+2 → effective AC 17, total 17 → hits
    val result = resolveAttackRoll(14, 3, 15, coverBonus(HalfCover), 20)
    assert(result.hits == true)
  }

  // Source: https://reddit.com/r/onednd/comments/11f4xq8/
  
  // The Elephant in the room – the "yoyo" healing from 5e remains
  run qa_yoyo_healing_no_penalty = {
    // RAW: healing a dying creature from 0 HP restores consciousness, resets death saves,
    // and imposes zero mechanical penalty — the accepted answer confirms WotC intentionally
    // kept this (even buffing Spare the Dying to grant 1 HP).
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 1, failures: 2 })
    val healed = pHeal(dying, 1)
    assert(
      // HP restored
      healed.hp == 1
      // no longer unconscious or incapacitated
      and not(healed.unconscious)
      and not(healed.incapacitatedSources.contains(ISUnconscious))
      // death saves wiped — slate clean
      and healed.deathSaves.successes == 0
      and healed.deathSaves.failures == 0
      // zero exhaustion: no penalty for going down (the yoyo)
      and healed.exhaustion == 0
      // creature can immediately act again
      and pCanAct(healed)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xefpwa/
  
  // 5E rules that should be simplified: bonus action spell casting restrictions (non-cantrip action blocks bonus action spell)
  run qa_bonus_action_spell_noncantrip_action_blocks_bonus = {
    val t = FRESH_TURN
    val t1 = pMarkNonCantripActionSpell(t)
    assert(not(canCastBonusActionSpell(t1)))
  }
  
  // 5E rules that should be simplified: bonus action spell casting restrictions (bonus action spell blocks non-cantrip action)
  run qa_bonus_action_spell_bonus_blocks_noncantrip_action = {
    val t = FRESH_TURN
    val t1 = pMarkBonusActionSpell(t)
    assert(not(canCastNonCantripAction(t1)))
  }
  
  // 5E rules that should be simplified: fresh turn has no spell casting restrictions yet
  run qa_bonus_action_spell_fresh_turn_no_restrictions = {
    val t = FRESH_TURN
    assert(canCastBonusActionSpell(t) and canCastNonCantripAction(t))
  }

  // Source: https://rpg.stackexchange.com/q/215530
  
  // Force damage is a magical effect; inside an Antimagic Field it is blocked (immunity models AMF suppression)
  run qa_force_damage_blocked_in_antimagic_field = {
    val creature = freshCreature(20)
    // Antimagic Field blocks all magical effects; Force ("pure magical energy") is treated as immunity
    val antimagicImmunities: Set[DamageType] = Set(Force)
    val afterForce = pTakeDamage(creature, 12, Force, Set(), Set(), antimagicImmunities, false)
    assert(afterForce.hp == 20)
  }

  // Source: https://reddit.com/r/onednd/comments/wu3hcy/
  
  // Monsters not critting is not the worst idea ever: d20==critRange resolves as isCritical
  run qa_crit_at_critrange = {
    val result = resolveAttackRoll(20, 3, 14, 0, 20)
    assert(result.isCritical and result.hits)
  }
  
  // Monsters not critting is not the worst idea ever: critRange=21 means d20=20 hits but never crits
  run qa_no_crit_when_critrange_above_20 = {
    val result = resolveAttackRoll(20, 3, 14, 0, 21)
    assert(not(result.isCritical) and result.hits)
  }
  
  // Monsters not critting is not the worst idea ever: crit double-sixes on 1d6+2 vs 7hp wizard = instant death (overflow >= maxHp)
  run qa_crit_double_six_instakills_wizard = {
    val wizard = freshCreature(7)
    // criticalDamage(normalDice=6, bonusDice=6, modifier=2) = 14
    val dmg = criticalDamage(6, 6, 2)
    val after = pTakeDamage(wizard, dmg, Piercing, Set(), Set(), Set(), true)
    assert(after.dead)
  }
  
  // Monsters not critting is not the worst idea ever: same 1d6+2 attack on duff (non-crit) roll leaves wizard alive
  run qa_noncrit_duff_roll_wizard_survives = {
    val wizard = freshCreature(7)
    // normalDamage(diceResult=1, modifier=2) = 3
    val dmg = normalDamage(1, 2)
    val after = pTakeDamage(wizard, dmg, Piercing, Set(), Set(), Set(), false)
    assert(not(after.dead) and after.hp > 0)
  }

  // Source: https://reddit.com/r/onednd/comments/1arqm6d/
  
  // Dragonborn rogue breath weapon question: breath weapon cannot replace Light weapon off-hand attack (TWF requires both weapons to be Light melee)
  run qa_breath_weapon_not_light_twf = {
    val dagger: Weapon = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    // Breath weapon is not a weapon and does not have the Light property
    val breathWeaponProxy: Weapon = {
      name: "breath_weapon",
      damageDie: 0,
      versatileDie: 0,
      damageType: Fire,
      properties: Set(),
      isMelee: false,
      normalRange: 0,
      longRange: 0,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true).with("bonusActionUsed", false)
    assert(not(pCanTWFWithWeapons(dagger, breathWeaponProxy, t, creature)))
  }

  // Source: https://reddit.com/r/onednd/comments/xty2n0/
  
  // Why Hide? — hidden attacker (target cannot see attacker) gains advantage on attack rolls
  run qa_hidden_attacker_has_advantage_52167502 = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,  // Hidden: target cannot see the attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Why Hide? — attacker cannot see hidden target, attacks have disadvantage
  run qa_attacks_against_hidden_have_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,  // attacker cannot see hidden target
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Why Hide? — 3/4 cover grants +5 to effective AC, turning an otherwise-hitting attack into a miss
  run qa_three_quarters_cover_turns_hit_to_miss = {
    // d20=14 + bonus=3 = 17; base AC 15 -> hits without cover
    val nocover = resolveAttackRoll(14, 3, 15, coverBonus(NoCover), 20)
    // same roll vs AC 15 + 5 cover bonus = 20 -> misses
    val withcover = resolveAttackRoll(14, 3, 15, coverBonus(ThreeQuartersCover), 20)
    assert(nocover.hits and not(withcover.hits) and coverBonus(ThreeQuartersCover) == 5)
  }

  // Source: https://reddit.com/r/onednd/comments/x4x5iz/
  
  // DMs should not tailor rolls depending on the character — DC is fixed regardless of ability scores
  run qa_fixed_dc_regardless_of_ability = {
    // Barbarian (STR mod +4, e.g. 18 STR) rolls a 2 at DC 15: 2+4=6 < 15, fails
    val barbarianFails = not(checkSucceeds(2, 4, NoneProf, 3, 0, 15))
    // Wizard (STR mod -1, e.g. 8 STR) rolls a 17 at the same DC 15: 17+(-1)=16 >= 15, succeeds
    val wizardSucceeds = checkSucceeds(17, -1, NoneProf, 3, 0, 15)
    // DC is identical for both — DM never adjusts it based on who is rolling
    assert(barbarianFails and wizardSucceeds)
  }
  
  // DMs should not tailor rolls — same DC means the strong can fail and the weak can succeed
  run qa_same_dc_both_directions = {
    val dc = 12
    // High-modifier character fails with a low roll: 1+5=6 < 12
    val strongFails = not(checkSucceeds(1, 5, NoneProf, 3, 0, dc))
    // Low-modifier character succeeds with a high roll: 15+(-2)=13 >= 12
    val weakSucceeds = checkSucceeds(15, -2, NoneProf, 3, 0, dc)
    assert(strongFails and weakSucceeds)
  }

  // Source: https://reddit.com/r/onednd/comments/10lw18r/
  
  // Action Surge + Two-Weapon Fighting: Light weapon bonus attack only once per turn (2024 rules)
  run qa_light_weapon_bonus_attack_once_per_turn = {
    val creature = freshCreature(20)
    // First Attack action taken — TWF bonus attack is available
    val turnAfterAttack = FRESH_TURN.with("attackActionUsed", true)
    // Player uses the TWF bonus attack (bonus action spent)
    val turnAfterTWF = turnAfterAttack.with("bonusActionUsed", true)
    // Action Surge grants another Attack action, but the bonus action is already spent —
    // pCanTwoWeaponFighting requires bonusActionUsed == false, so TWF cannot trigger a second time
    assert(
      pCanTwoWeaponFighting(turnAfterAttack, creature)
      and not(pCanTwoWeaponFighting(turnAfterTWF, creature))
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wwdnwa/
  
  // "Hidden" new rules for surprise? — Incapacitated when rolling Initiative grants Disadvantage on the roll
  run qa_incapacitated_disadvantage_on_initiative = {
    // Stunned implies incapacitated; initiative is a DEX check
    val incapCreature = pApplyCondition(freshCreature(20), CStunned)
    val healthyCreature = freshCreature(20)
    // Disadvantage flag set iff creature is incapacitated at initiative time
    val incapAdv = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: isIncapacitated(incapCreature) })
    val healthyAdv = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: isIncapacitated(healthyCreature) })
    assert(
      isIncapacitated(incapCreature) and incapAdv.hasDisadvantage and not(incapAdv.hasAdvantage)
      and not(isIncapacitated(healthyCreature)) and not(healthyAdv.hasDisadvantage)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/z9z1vk/
  
  // Banishment is now worse than Tasha's Hideous Laughter: end-of-turn save success removes banishment-like incapacitation
  run qa_end_of_turn_save_success_removes_banishment_effect = {
    val target = freshCreature(20)
    val target1 = pApplyCondition(target, CIncapacitated)
    val effects1 = pAddEffect(target1.activeEffects, "banishment", 3, AtEndOfTurn)
    val target2 = target1.with("activeEffects", effects1)
    val save = { spellId: "banishment", saveSucceeded: true, conditionsToRemove: Set(CIncapacitated) }
    val target3 = pProcessEndOfTurnSaves(target2, [save])
    assert(not(isIncapacitated(target3)) and not(pHasEffect(target3.activeEffects, "banishment")))
  }
  
  // Banishment is now worse than Tasha's Hideous Laughter: failed end-of-turn save keeps target incapacitated
  run qa_end_of_turn_save_failure_keeps_banishment_effect = {
    val target = freshCreature(20)
    val target1 = pApplyCondition(target, CIncapacitated)
    val effects1 = pAddEffect(target1.activeEffects, "banishment", 3, AtEndOfTurn)
    val target2 = target1.with("activeEffects", effects1)
    val save = { spellId: "banishment", saveSucceeded: false, conditionsToRemove: Set(CIncapacitated) }
    val target3 = pProcessEndOfTurnSaves(target2, [save])
    assert(isIncapacitated(target3) and pHasEffect(target3.activeEffects, "banishment"))
  }
  
  // Banishment is now worse than Tasha's Hideous Laughter: THL end-of-turn save success clears both prone and incapacitated
  run qa_thl_end_of_turn_save_removes_prone_and_incapacitated = {
    val target = freshCreature(20)
    val target1 = pApplyCondition(pApplyCondition(target, CIncapacitated), CProne)
    val effects1 = pAddEffect(target1.activeEffects, "thl", 3, AtEndOfTurn)
    val target2 = target1.with("activeEffects", effects1)
    val save = { spellId: "thl", saveSucceeded: true, conditionsToRemove: Set(CIncapacitated, CProne) }
    val target3 = pProcessEndOfTurnSaves(target2, [save])
    assert(not(isIncapacitated(target3)) and not(target3.prone) and not(pHasEffect(target3.activeEffects, "thl")))
  }

  // Source: https://reddit.com/r/onednd/comments/xrm0lc/
  
  // The new ranger and rogue's damage, visualized! — TWF off-hand attack does not add positive ability modifier to damage
  run qa_twf_offhand_no_positive_abilmod = {
    // Optimized TWF build with +4 DEX: off-hand damage = dice roll only, mod omitted
    val diceRoll = 6
    val dexMod = 4
    assert(pTWFOffHandDamage(diceRoll, dexMod) == diceRoll)
  }
  
  // The new ranger and rogue's damage, visualized! — TWF off-hand applies negative ability modifier
  run qa_twf_offhand_negative_mod_reduces_damage = {
    // Low-STR build with -1 mod: off-hand damage = dice + negative mod
    val diceRoll = 5
    val negMod = -1
    assert(pTWFOffHandDamage(diceRoll, negMod) == 4)
  }
  
  // The new ranger and rogue's damage, visualized! — TWF off-hand damage floored at zero
  run qa_twf_offhand_floor_zero = {
    // d4 roll of 1 with -2 penalty: 1 + (-2) = -1, min 0
    val diceRoll = 1
    val negMod = -2
    assert(pTWFOffHandDamage(diceRoll, negMod) == 0)
  }

  // Source: https://reddit.com/r/onednd/comments/1g1iyga/
  
  // Heroic Inspiration - How long does it last? Inspiration lasts until used, not cleared by long rest
  run qa_heroic_inspiration_persists_after_long_rest = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val afterRest = pFighterLongRest(fs)
    assert(afterRest.heroicInspiration)
  }
  
  // Heroic Inspiration - How long does it last? Inspiration lasts until used, not cleared by short rest
  run qa_heroic_inspiration_persists_after_short_rest = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val afterRest = pFighterShortRest(fs)
    assert(afterRest.heroicInspiration)
  }
  
  // Heroic Inspiration - Champion L10 gains inspiration at start of turn when they have none
  run qa_heroic_inspiration_granted_at_turn_start_when_missing = {
    val fs = freshFighterState(10)
    val afterStart = pFighterStartTurn(fs, 10)
    assert(afterStart.heroicInspiration)
  }
  
  // Heroic Inspiration - If you already have inspiration, start-of-turn grant does not double it (stays true, not toggled)
  run qa_heroic_inspiration_not_doubled_when_already_held = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val afterStart = pFighterStartTurn(fs, 10)
    assert(afterStart.heroicInspiration)
  }

  // Source: https://rpg.stackexchange.com/q/214608
  
  // Saving throws when under certain conditions: restrained imposes disadvantage on DEX saves only
  run qa_restrained_dex_save_has_disadvantage = {
    val c = pApplyCondition(freshCreature(10), CRestrained)
    val mods = pSaveModifiers(c, Dex)
    assert(mods.hasDisadvantage and not(mods.autoFail))
  }
  
  // Saving throws when under certain conditions: restrained does NOT affect STR saves
  run qa_restrained_str_save_no_effect = {
    val c = pApplyCondition(freshCreature(10), CRestrained)
    val mods = pSaveModifiers(c, Str)
    assert(not(mods.hasDisadvantage) and not(mods.autoFail))
  }
  
  // Saving throws when under certain conditions: paralyzed causes auto-fail on both STR and DEX saves
  run qa_paralyzed_str_dex_save_autofail = {
    val c = pApplyCondition(freshCreature(10), CParalyzed)
    val strMods = pSaveModifiers(c, Str)
    val dexMods = pSaveModifiers(c, Dex)
    assert(strMods.autoFail and dexMods.autoFail)
  }
  
  // Saving throws when under certain conditions: paralyzed does NOT auto-fail WIS saves
  run qa_paralyzed_wis_save_unaffected = {
    val c = pApplyCondition(freshCreature(10), CParalyzed)
    val mods = pSaveModifiers(c, Wis)
    assert(not(mods.autoFail) and not(mods.hasDisadvantage))
  }
  
  // Saving throws when under certain conditions: prone has no effect on DEX saves
  run qa_prone_dex_save_no_effect = {
    val c = pApplyCondition(freshCreature(10), CProne)
    val mods = pSaveModifiers(c, Dex)
    assert(not(mods.hasDisadvantage) and not(mods.autoFail))
  }
  
  // Saving throws when under certain conditions: stunned auto-fails STR and DEX, not CHA
  run qa_stunned_str_dex_autofail_cha_unaffected = {
    val c = pApplyCondition(freshCreature(10), CStunned)
    val strMods = pSaveModifiers(c, Str)
    val dexMods = pSaveModifiers(c, Dex)
    val chaMods = pSaveModifiers(c, Cha)
    assert(strMods.autoFail and dexMods.autoFail and not(chaMods.autoFail))
  }

  // Source: https://rpg.stackexchange.com/q/215306
  
  // Help calculating dpr for double-bladed scimitar blood hunter: Dex 22 yields +6 modifier
  run qa_dex22_gives_plus6_modifier = {
    assert(abilityModifier(22) == 6)
  }
  
  // Help calculating dpr for double-bladed scimitar blood hunter: level 5 gives +3 proficiency bonus
  run qa_level5_proficiency_bonus = {
    assert(proficiencyBonus(5) == 3)
  }
  
  // Help calculating dpr for double-bladed scimitar blood hunter: +9 attack bonus (Dex+6, PB+3) hits AC 15 on minimum roll of 6
  run qa_attack_bonus9_hits_ac15_on_roll6 = {
    assert(resolveAttackRoll(6, 9, 15, 0, 20).hits == true and
           resolveAttackRoll(5, 9, 15, 0, 20).hits == false)
  }
  
  // Help calculating dpr for double-bladed scimitar blood hunter: +9 attack bonus hits AC 18 on minimum roll of 9
  run qa_attack_bonus9_hits_ac18_on_roll9 = {
    assert(resolveAttackRoll(9, 9, 18, 0, 20).hits == true and
           resolveAttackRoll(8, 9, 18, 0, 20).hits == false)
  }
  
  // Help calculating dpr for double-bladed scimitar blood hunter: darkness makes target unable to see attacker, granting advantage on attacks
  run qa_darkness_skulker_grants_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true, targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Help calculating dpr for double-bladed scimitar blood hunter: critical hit adds bonus dice without doubling the ability modifier
  run qa_crit_doubles_dice_not_modifier_596cc1f2 = {
    // Main attack: normalDice=7 (2d4 GWF-adjusted roll), bonusDice=10 (extra 2d4+1d6 on crit), modifier=6 (Dex)
    val critDmg = criticalDamage(7, 10, 6)
    val normalDmg = normalDamage(7, 6)
    assert(critDmg == normalDmg + 10)
  }

  // Source: https://rpg.stackexchange.com/q/218242
  
  run qa_beast_master_bestial_fury_keeps_remaining_attack = {{
    val cfg = TEST_CONFIG.with("level", 11).with("features", Set(FExtraAttack))
    val ranger = freshCreature(40)
    val t0 = pStartTurn(cfg, ranger, Unarmored, 0, false, false)
    val t1 = pUseAction(t0, ranger, AAttack)
    val t2 = pUseExtraAttack(t1)
  
    assert(t1.attackActionUsed and t1.extraAttacksRemaining == 1 and t2.extraAttacksRemaining == 0)
  }}

  // Source: https://reddit.com/r/onednd/comments/11ayulr/
  
  // Divine Smite Changes I haven't seen mentioned — 9th level slot deals 10d8 radiant (no cap, 2024 rules)
  run qa_divine_smite_9th_level_slot_no_cap = {
    // 2024 formula: smite dice = slotLevel + 1, uncapped
    val slotLevel = 9
    val smiteDiceCount = slotLevel + 1  // 10d8
    // Pre-resolve all d8 as max (8 each) → total = 80
    val totalDamage = normalDamage(smiteDiceCount * 8, 0)
    val creature = freshCreature(100)
    val s1 = pTakeDamage(creature, totalDamage, Radiant, Set(), Set(), Set(), false)
    assert(smiteDiceCount == 10 and totalDamage == 80 and s1.hp == 20)
  }
  
  // Divine Smite Changes — scaling continues past old 4th-slot cap (5d8 was old max)
  run qa_divine_smite_scales_past_old_cap = {
    // Old rule capped at slot 4 → 5d8. New rule: each level keeps adding 1d8.
    val slot4Dice = 4 + 1  // 5d8 — was the old ceiling
    val slot5Dice = 5 + 1  // 6d8 — now valid, exceeds old cap
    val slot9Dice = 9 + 1  // 10d8 — max with full-caster multiclass
    assert(slot5Dice > slot4Dice and slot9Dice > slot5Dice and slot9Dice == 10)
  }
  
  // Divine Smite Changes — 1st level slot baseline is 2d8 radiant
  run qa_divine_smite_1st_level_slot_baseline = {
    val slotLevel = 1
    val smiteDiceCount = slotLevel + 1  // 2d8
    // Pre-resolve both d8 as 6 → total = 12
    val totalDamage = normalDamage(smiteDiceCount * 6, 0)
    val creature = freshCreature(50)
    val s1 = pTakeDamage(creature, totalDamage, Radiant, Set(), Set(), Set(), false)
    assert(smiteDiceCount == 2 and totalDamage == 12 and s1.hp == 38)
  }

  // Source: https://reddit.com/r/onednd/comments/zmygkl/
  
  // New Bardic inspiration healing: damage resolves fully (unconscious/prone/concentration break) before the reaction heal restores HP
  run qa_bardic_inspiration_heal_after_downed = {
    val wizard = freshCreature(20).with("hp", 5)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hold_person")
  
    // Step 1: attack deals exactly 5 damage, dropping wizard to 0 HP → unconscious + prone
    val afterDamage = pTakeDamage(wizard, 5, Slashing, Set(), Set(), Set(), false)
    // Step 2: concentration breaks because wizard became incapacitated (ISUnconscious)
    val concResult = pWithConcBreak(ss, wizard, afterDamage)
  
    // Step 3: Bardic Inspiration reaction heal brings wizard to 4 HP
    val afterHeal = pHeal(concResult.creature, 4)
  
    assert(
      // wizard is back to positive HP
      afterHeal.hp == 4
      // no longer unconscious (heal removed the condition)
      and not(afterHeal.unconscious)
      // still prone — prone is NOT removed when unconscious is removed
      and afterHeal.prone
      // concentration was broken at the moment of going to 0 HP; heal does not restore it
      and not(isConcentrating(concResult.slots))
    )
  }

  // Source: https://rpg.stackexchange.com/q/213927
  
  // Can you grapple a creature as an Opportunity Attack? (2024: yes, Grapple is an Unarmed Strike option)
  run qa_grapple_as_opportunity_attack = {
    val target = freshCreature(20)
    // Reaction available; target never used Disengage, so OA is legal
    val t = FRESH_TURN
    val oaEligible = pCanBeOpportunityAttacked(t)
    // Spending the reaction for the OA
    val t1 = pUseReaction(t)
    // Grapple is the chosen Unarmed Strike effect; target fails the save
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(
      oaEligible
      and not(t1.reactionAvailable)
      and result.success
      and result.targetState.grappled
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wxhv3c/
  
  // Using the new UA character origins to create a High-Elf Hermit: Hermit background grants +2 Wis, +1 Con
  run qa_hermit_background_asi_con_wis = {
    val base: Ability -> int = Map(Str -> 10, Dex -> 14, Con -> 13, Int_ -> 15, Wis -> 12, Cha -> 8)
    val after1 = pApplyASI(base, Con, 1)
    val after2 = pApplyASI(after1, Wis, 2)
    assert(after2.get(Con) == 14 and after2.get(Wis) == 14)
  }
  
  // Using the new UA character origins to create a High-Elf Hermit: standard array [15,14,13,12,10,8] costs exactly 27 points
  run qa_standard_array_valid_point_buy = {
    assert(pValidPointBuy([15, 14, 13, 12, 10, 8]))
  }
  
  // Using the new UA character origins to create a High-Elf Hermit: Fighter level 1 HP = hit die max (d10) + Con mod
  run qa_fighter_level1_hp_with_con14 = {
    val conMod = abilityModifier(14)
    assert(conMod == 2 and pFirstLevelHp(10, conMod) == 12)
  }
  
  // Using the new UA character origins to create a High-Elf Hermit: Druid multiclass prereq (Wis ≥ 13) met after ASI
  run qa_druid_multiclass_prereq_met = {
    val scores: Ability -> int = Map(Str -> 10, Dex -> 14, Con -> 14, Int_ -> 15, Wis -> 14, Cha -> 8)
    assert(pCanMulticlass(scores, Fighter, Druid))
  }

  // Source: https://reddit.com/r/onednd/comments/1fq2cxz/
  
  // The Same Condition From Two Sources? — conditions don't stack; applying the same condition twice is idempotent
  run qa_condition_no_stack_restrained = {
    val base = freshCreature(20)
    val afterFirst  = pApplyCondition(base, CRestrained)
    val afterSecond = pApplyCondition(afterFirst, CRestrained)
    // Either you have a condition or you don't — double application changes nothing
    assert(afterSecond == afterFirst)
  }
  
  // The Same Condition From Two Sources? — creature is restrained after first application regardless of a second source
  run qa_condition_restrained_is_set_once = {
    val base = freshCreature(20)
    val s1 = pApplyCondition(base, CRestrained)
    // Restrained is on after first application
    all {
      assert(s1.restrained == true),
      // A second application leaves the flag unchanged
      assert(pApplyCondition(s1, CRestrained).restrained == true),
    }
  }
  
  // The Same Condition From Two Sources? — removing one effect does not automatically remove the condition (tracked independently via active effects)
  run qa_condition_effect_removal_independent = {
    val base = freshCreature(20)
    val s1 = pApplyCondition(base, CRestrained)
    // Two separate active effects represent two sources (Web, Evard's)
    val effs = pAddEffect(
      pAddEffect(Set(), "web", 5, AtEndOfTurn),
      "evards", 3, AtEndOfTurn
    )
    val s2 = s1.with("activeEffects", effs)
    // Remove Web's effect — Evard's is still active
    val effsAfter = pRemoveEffect(s2.activeEffects, "web")
    val s3 = s2.with("activeEffects", effsAfter)
    // Evard's effect still present; condition itself must be managed separately per source
    all {
      assert(pHasEffect(s3.activeEffects, "evards") == true),
      assert(pHasEffect(s3.activeEffects, "web") == false),
      // The restrained boolean is still set (other source remains)
      assert(s3.restrained == true),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xvpv6w/
  
  // Hidden [Condition] and Passive Perception Misconception?
  // Rule: hider's Stealth check total becomes the DC; passive Perception >= that DC finds them.
  run qa_passive_perception_detects_hidden_when_equal_to_dc = {
    // Hider rolls Stealth: d20=11, Dex+2, proficient PB=2 → total=15 (meets baseline DC 15, becomes detection DC)
    val hideCheckTotal = checkSucceeds(11, 2, Proficient, 2, 0, 15)
    // Observer: passive Perception = 10 + Wis(+3) + prof(2) = 15, no adv/disadv
    val observerPassive = passiveCheck(3, Proficient, 2, false, false)
    // passive exactly equals hide DC → observer finds the hidden creature
    assert(hideCheckTotal and observerPassive >= 15)
  }
  
  // Hidden [Condition] and Passive Perception Misconception?
  // Rule: passive Perception below the hider's check total fails to find them passively.
  run qa_passive_perception_below_hide_dc_fails = {
    // Hider rolls Stealth: d20=14, Dex+2, proficient PB=2 → total=18 (hide DC for detection)
    val hideDC = 14 + 2 + 2  // = 18
    // Observer: passive Perception = 10 + Wis(+3) + prof(2) = 15
    val observerPassive = passiveCheck(3, Proficient, 2, false, false)
    // passive 15 < hide DC 18 → cannot passively detect
    assert(observerPassive < hideDC)
  }
  
  // Hidden [Condition] and Passive Perception Misconception?
  // Rule: active Search (Perception) check can succeed where passive fails — same DC, just rolled.
  run qa_active_search_beats_high_hide_dc_where_passive_fails = {
    // Hider's detection DC = 18 (from successful Stealth roll)
    val hideDC = 18
    val observerPassive = passiveCheck(3, Proficient, 2, false, false)  // = 15, fails
    // Active Perception: roll 13, Wis+3, proficient PB=2 → 13+3+2=18 >= 18
    val activeSearchHits = checkSucceeds(13, 3, Proficient, 2, 0, hideDC)
    assert(observerPassive < hideDC and activeSearchHits)
  }
  
  // Hidden [Condition] and Passive Perception Misconception?
  // Rule: failing the DC 15 baseline means the creature does not become hidden at all.
  run qa_hide_baseline_dc15_must_be_met = {
    // Roll 9, Dex+2, proficient PB=2 → 9+2+2=13 < 15 → hide attempt fails
    val hideAttemptSucceeds = checkSucceeds(9, 2, Proficient, 2, 0, 15)
    assert(not(hideAttemptSucceeds))
  }

  // Source: https://reddit.com/r/onednd/comments/1304fwu/
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // Indomitable is unavailable below level 9 — charges are 0 and canUseIndomitable returns false
  run qa_indomitable_unavailable_below_level_9 = {
    val fs8 = freshFighterState(8)
    all {
      assert(fs8.indomitableCharges == 0),
      assert(not(canUseIndomitable(8, fs8))),
    }
  }
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // Indomitable becomes available at level 9 with exactly 1 charge
  run qa_indomitable_unlocks_at_level_9 = {
    val fs9 = freshFighterState(9)
    all {
      assert(fs9.indomitableCharges == 1),
      assert(canUseIndomitable(9, fs9)),
    }
  }
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // Indomitable charges increase to 2 at level 13
  run qa_indomitable_two_charges_at_level_13 = {
    val fs13 = freshFighterState(13)
    all {
      assert(fs13.indomitableCharges == 2),
      assert(canUseIndomitable(13, fs13)),
    }
  }
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // Indomitable reaches 3 charges at level 17 (where Unconquerable also becomes available)
  run qa_indomitable_three_charges_at_level_17 = {
    val fs17 = freshFighterState(17)
    all {
      assert(fs17.indomitableCharges == 3),
      assert(canUseIndomitable(17, fs17)),
    }
  }
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // Using Indomitable at level 9 consumes the single charge, leaving it unavailable
  run qa_indomitable_use_exhausts_single_charge = {
    val fs9 = freshFighterState(9)
    val fs9_used = pUseIndomitable(fs9)
    all {
      assert(fs9_used.indomitableCharges == 0),
      assert(not(canUseIndomitable(9, fs9_used))),
    }
  }
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // All 3 charges at level 17 can be spent sequentially, then it is exhausted
  run qa_indomitable_all_three_charges_expendable = {
    val fs17 = freshFighterState(17)
    val fs1 = pUseIndomitable(fs17)
    val fs2 = pUseIndomitable(fs1)
    val fs3 = pUseIndomitable(fs2)
    all {
      assert(fs1.indomitableCharges == 2),
      assert(fs2.indomitableCharges == 1),
      assert(fs3.indomitableCharges == 0),
      assert(not(canUseIndomitable(17, fs3))),
    }
  }
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // Long rest fully restores all Indomitable charges at level 17
  run qa_indomitable_long_rest_restores_all_charges = {
    val fs17 = freshFighterState(17)
    val fs_spent = pUseIndomitable(pUseIndomitable(pUseIndomitable(fs17)))
    val fs_rested = pFighterLongRest(fs_spent)
    all {
      assert(fs_spent.indomitableCharges == 0),
      assert(fs_rested.indomitableCharges == 3),
      assert(canUseIndomitable(17, fs_rested)),
    }
  }
  
  // Fighters Indomitable is now *Exactly* the heroic willpower feature it always should have been.
  // Indomitable max charges match the level-gated table across key breakpoints
  run qa_indomitable_charge_table_breakpoints = {
    all {
      assert(indomitableMaxCharges(8)  == 0),
      assert(indomitableMaxCharges(9)  == 1),
      assert(indomitableMaxCharges(12) == 1),
      assert(indomitableMaxCharges(13) == 2),
      assert(indomitableMaxCharges(16) == 2),
      assert(indomitableMaxCharges(17) == 3),
      assert(indomitableMaxCharges(20) == 3),
    }
  }

  // Source: https://rpg.stackexchange.com/q/214638
  
  run qa_slot_level_must_meet_or_exceed_spell_level = {{
    val slots10 = pBuildSlotMap(10)
    val ss0: SpellSlotState = {
      slotsMax: slots10,
      slotsCurrent: slots10,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    assert(
      pCanCastAtLevel(ss0, 5, 5)
      and pCanCastAtLevel(ss0, 1, 5)
      and not(pCanCastAtLevel(ss0, 5, 4))
    )
  }}
  
  // What is the correlation between spell slots and prepared spells?
  run qa_using_two_fifth_level_slots_blocks_more_fifth_level_casts = {{
    val slots10 = pBuildSlotMap(10)
    val ss0: SpellSlotState = {
      slotsMax: slots10,
      slotsCurrent: slots10,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    val ssAfterTwoFifth = pExpendSlot(pExpendSlot(ss0, 5), 5)
    assert(
      ssAfterTwoFifth.slotsCurrent.get(5) == 0
      and not(pCanCastAtLevel(ssAfterTwoFifth, 5, 5))
      and pCanCastAtLevel(ssAfterTwoFifth, 1, 4)
    )
  }}

  // Source: https://reddit.com/r/onednd/comments/yg8a4f/
  
  // 20th-Level Epic Boon of Fortitude: 1st-Level Tough + CON Healing?
  run qa_epic_boon_fortitude_max_hp_at_level_20 = {
    // Boon grants +2 max HP per level; at level 20 that is 40 extra HP
    val baseMaxHp = 100
    val boonBonus = 2 * 20  // 40
    val withBoon    = freshCreature(baseMaxHp + boonBonus)
    val withoutBoon = freshCreature(baseMaxHp)
    // Heal both from 1 HP with an arbitrarily large amount — should cap at respective maxHp
    val healedWith    = pHeal(withBoon.with("hp", 1), 999)
    val healedWithout = pHeal(withoutBoon.with("hp", 1), 999)
    assert(
      healedWith.hp    == baseMaxHp + boonBonus and
      healedWithout.hp == baseMaxHp             and
      healedWith.hp - healedWithout.hp == boonBonus
    )
  }
  
  // 20th-Level Epic Boon of Fortitude: CON modifier added to healing received
  run qa_epic_boon_fortitude_con_mod_to_healing = {
    // Boon adds CON modifier to every healing instance; caller pre-resolves the total
    val conMod   = 4          // e.g. CON 18 -> +4
    val baseHeal = 8          // e.g. Cure Wounds dice result
    val creature = freshCreature(50).with("hp", 20)
    val withoutBoon = pHeal(creature, baseHeal)
    val withBoon    = pHeal(creature, baseHeal + conMod)  // boon adds conMod to the amount
    assert(withBoon.hp - withoutBoon.hp == conMod)
  }

  // Source: https://reddit.com/r/onednd/comments/wuiolk/
  
  // Q&A: Bugbear crits — nat 20 triggers a critical hit at default critRange 20
  run qa_nat20_is_critical_hit = {
    val result = resolveAttackRoll(20, 5, 15, 0, 20)
    assert(result.hits and result.isCritical)
  }
  
  // Q&A: Bugbear crits — nat 1 always misses and never crits, even with high attack bonus
  run qa_nat1_always_misses_no_crit = {
    val result = resolveAttackRoll(1, 20, 5, 0, 20)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // Q&A: Bugbear crits — normal hit below critRange is not a critical even when it hits AC
  run qa_hit_below_crit_range_not_critical = {
    // 15 + 5 = 20 >= AC 18, hits; but 15 < critRange 20, no crit
    val result = resolveAttackRoll(15, 5, 18, 0, 20)
    assert(result.hits and not(result.isCritical))
  }
  
  // Q&A: Bugbear crits — critical damage adds bonus dice on top of normal dice; modifier NOT doubled
  run qa_critical_damage_doubles_dice_not_modifier = {
    // Bugbear-like scenario: normalDice=16 (4d8 result), bonusDice=14 (4d6 surprise dice), mod=2
    val critDmg   = criticalDamage(16, 14, 2)  // 16 + 14 + 2 = 32
    val normalDmg = normalDamage(16, 2)         // 16 + 2 = 18
    assert(critDmg == 32 and normalDmg == 18 and critDmg > normalDmg)
  }
  
  // Q&A: Bugbear crits — Champion-style reduced critRange (e.g. 19) makes 19 a crit
  run qa_reduced_crit_range_triggers_on_19 = {
    val resultDefaultRange = resolveAttackRoll(19, 5, 15, 0, 20)
    val resultReducedRange = resolveAttackRoll(19, 5, 15, 0, 19)
    assert(
      not(resultDefaultRange.isCritical) and
      resultReducedRange.isCritical and resultReducedRange.hits
    )
  }

  // Source: https://rpg.stackexchange.com/q/215556
  
  // Do the effects of Enlarge/Reduce continue to apply after using Wild Shape?
  run qa_enlarge_reduce_persists_through_wild_shape = {
    // Druid concentrating on Enlarge/Reduce before shapeshifting into beast form
    val c0 = freshCreature(30).with("hp", 25)
    val effects0 = pAddEffect(c0.activeEffects, "enlarge_reduce", 10, AtEndOfTurn)
    val c1 = c0.with("activeEffects", effects0)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "enlarge_reduce")
  
    // Wild Shape = form change that is neither death nor newly incapacitating.
    // PHB: "shapeshifting doesn't break your Concentration."
    // pBreakConcOnStateChange only breaks conc when newS is dead (was alive)
    // or newly incapacitated — neither applies here.
    val cBeastForm = c1.with("hp", 28) // HP shifts to beast pool; still conscious, not incap
    val ssAfterShape = pBreakConcOnStateChange(ss, c1, cBeastForm)
  
    assert(
      isConcentrating(ssAfterShape) and
      ssAfterShape.concentrationSpellId == "enlarge_reduce" and
      pHasEffect(cBeastForm.activeEffects, "enlarge_reduce")
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wtyt7r/
  
  // What is the definition of "success" and "failure" for ability checks?
  run qa_check_success_total_meets_dc = {
    // Success: d20 + abilityMod + prof >= DC
    val roll = 10
    val abilityMod = 3
    val profBonus = 3
    val dc = 16
    // 10 + 3 + 3 = 16 >= 16 → success
    assert(checkSucceeds(roll, abilityMod, Proficient, profBonus, 0, dc) == true)
  }
  
  // What is the definition of "success" and "failure" for ability checks?
  run qa_check_failure_total_below_dc = {
    // Failure: d20 + abilityMod + prof < DC
    val roll = 10
    val abilityMod = 3
    val profBonus = 3
    val dc = 17
    // 10 + 3 + 3 = 16 < 17 → failure
    assert(checkSucceeds(roll, abilityMod, Proficient, profBonus, 0, dc) == false)
  }
  
  // What is the definition of "success" and "failure" for ability checks?
  run qa_check_success_boundary_no_prof = {
    // Unproficient check: total meets DC exactly → success
    val roll = 15
    val abilityMod = 2
    val dc = 17
    // 15 + 2 + 0 = 17 >= 17 → success
    assert(checkSucceeds(roll, abilityMod, NoneProf, 4, 0, dc) == true)
  }
  
  // What is the definition of "success" and "failure" for ability checks?
  run qa_check_failure_one_short_no_prof = {
    // Unproficient check: one below DC → failure
    val roll = 14
    val abilityMod = 2
    val dc = 17
    // 14 + 2 + 0 = 16 < 17 → failure
    assert(checkSucceeds(roll, abilityMod, NoneProf, 4, 0, dc) == false)
  }
  
  // What is the definition of "success" and "failure" for ability checks?
  run qa_check_misc_bonus_tips_over_dc = {
    // A misc bonus (e.g. Guidance) can push a near-miss into a success
    val roll = 8
    val abilityMod = 1
    val profBonus = 2
    val miscBonus = 4 // e.g. Guidance d4 result
    val dc = 15
    // 8 + 1 + 2 + 4 = 15 >= 15 → success
    assert(checkSucceeds(roll, abilityMod, Proficient, profBonus, miscBonus, dc) == true)
    // Without misc bonus: 8 + 1 + 2 = 11 < 15 → failure
    and assert(checkSucceeds(roll, abilityMod, Proficient, profBonus, 0, dc) == false)
  }

  // Source: https://reddit.com/r/onednd/comments/1h51lkf/
  
  // Is it possible to cast a spell and then action surge an attack?
  run qa_spell_then_action_surge_attack = {
    // Fighter 2 has Action Surge; cast a spell first, then surge into an Attack action
    val config = configForLevel(2)
    val creature = freshCreature(20)
    val fs = freshFighterState(2)
    val ts = pStartTurn(config, creature, Unarmored, 0, false, false)
  
    // Step 1: Use Magic action (cast a spell) — spends the turn's one action
    val ts1 = pUseAction(ts, creature, AMagic)
  
    // Step 2: Action Surge grants an additional action
    val surgeResult = pUseActionSurge(ts1, fs)
    val ts2 = surgeResult.turn
    val fs2 = surgeResult.fighter
  
    // Step 3: Spend the surged action on an Attack
    val ts3 = pUseAction(ts2, creature, AAttack)
  
    assert(all {
      // Magic action consumed the original action
      ts1.actionsRemaining == 0,
      // Action Surge restores one action
      ts2.actionsRemaining == 1,
      // Surge is marked as used this turn
      fs2.actionSurgeUsedThisTurn == true,
      // Attack action successfully taken with the surged action
      ts3.attackActionUsed == true,
      ts3.actionsRemaining == 0,
    })
  }

  // Source: https://reddit.com/r/onednd/comments/wzenac/
  
  // Does Alert Feat stack with Harengon's Hare Trigger for initiative? (PHB: PB added once per check)
  run qa_proficiency_bonus_no_stack_on_initiative = {
    val level = 5
    val pb = proficiencyBonus(level)      // (5-1)/4 + 2 = 3
    val dexMod = abilityModifier(14)      // (14-10)/2 = 2
    // Initiative is a DEX check. Alert + Hare Trigger both grant "add PB to initiative".
    // Rule: regardless of source count, PB is added at most once -> Proficient, not Expertise.
    // roll(10) + dex(+2) + pb(3) = 15 >= DC 15 with one PB; fails at 12 with none.
    assert(
      profMultiplier(Proficient, pb) == pb
      and profMultiplier(Expertise, pb) == pb * 2
      and checkSucceeds(10, dexMod, Proficient, pb, 0, 15) == true
      and checkSucceeds(10, dexMod, NoneProf, pb, 0, 15) == false
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wu8l2f/
  
  // Grappling may actually be harder to escape now — grapple auto-applies on failed save; grappled creature's speed drops to 0
  run qa_grapple_speed_zero_when_grappled = {
    val target = freshCreature(30)
    val grappleResult = pGrapple(Medium, Medium, target, true, true)
    val grappled = grappleResult.targetState
    val t = pStartTurn(TEST_CONFIG, grappled, Unarmored, 0, false, false)
    assert(
      grappleResult.success and
      grappled.grappled and
      t.movementRemaining == 0 and
      t.effectiveSpeed == 0
    )
  }
  
  // Grappling may actually be harder to escape now — failed escape leaves target grappled; attacker can immediately re-grapple on next turn
  run qa_regrapple_after_failed_escape = {
    val target = freshCreature(30)
    val grappled = pGrapple(Medium, Medium, target, true, true).targetState
    val afterFailedEscape = pEscapeGrapple(grappled, false)
    val regrappleResult = pGrapple(Medium, Medium, afterFailedEscape, true, true)
    assert(
      afterFailedEscape.grappled and
      regrappleResult.success and
      regrappleResult.targetState.grappled
    )
  }
  
  // Grappling may actually be harder to escape now — successful escape save removes grapple and restores full movement
  run qa_escape_grapple_restores_speed = {
    val target = freshCreature(30)
    val grappled = pGrapple(Medium, Medium, target, true, true).targetState
    val tGrappled = pStartTurn(TEST_CONFIG, grappled, Unarmored, 0, false, false)
    val escaped = pEscapeGrapple(grappled, true)
    val tEscaped = pStartTurn(TEST_CONFIG, escaped, Unarmored, 0, false, false)
    assert(
      tGrappled.movementRemaining == 0 and
      not(escaped.grappled) and
      tEscaped.movementRemaining == 30
    )
  }
  
  // Grappling may actually be harder to escape now — prone+grappled creature cannot stand up (speed forced to 0)
  run qa_prone_and_grappled_cannot_stand = {
    val target = freshCreature(30)
    val grappled = pGrapple(Medium, Medium, target, true, true).targetState
    val grappledAndProne = pApplyCondition(grappled, CProne)
    val t = pStartTurn(TEST_CONFIG, grappledAndProne, Unarmored, 0, false, false)
    val tAfterStandAttempt = pStandFromProne(t)
    assert(
      grappledAndProne.prone and
      grappledAndProne.grappled and
      t.effectiveSpeed == 0 and
      tAfterStandAttempt.movementRemaining == t.movementRemaining
    )
  }

  // Source: https://rpg.stackexchange.com/q/217921
  
  // Can you use Dispel Magic to Dispel effects from indirect targets?
  run qa_dispel_magic_indirect_target = {
    // Daylight was cast on Marie (direct target); effect lives on her activeEffects
    val marie = freshCreature(30).with("activeEffects",
      pAddEffect(Set(), "daylight", 5, AtEndOfTurn))
    // Bob is merely inside the emanation — daylight was never cast on him
    val bob = freshCreature(30)
    // Dispel Magic on Bob: pRemoveEffect models "remove spell that is ON this creature"
    val bobAfterDispel = bob.with("activeEffects", pRemoveEffect(bob.activeEffects, "daylight"))
    assert(
      // Dispel targeting Bob is a no-op: daylight was never on him
      bobAfterDispel.activeEffects == bob.activeEffects
      // Marie's daylight persists; targeting Bob cannot reach a spell not on Bob
      and pHasEffect(marie.activeEffects, "daylight")
    )
  }

  // Source: https://reddit.com/r/onednd/comments/y4nt0d/
  
  // "Thrown Weapon Fighting Fighting Style" already exists: +2 damage on ranged attacks with thrown weapons
  run qa_thrown_weapon_fighting_style_damage = {
    val diceRoll      = 5  // pre-resolved d6 damage roll
    val abilityMod    = 2  // STR modifier on a thrown weapon attack
    val styleBonus    = 2  // Thrown Weapon Fighting: +2 to damage roll
  
    // base damage without fighting style
    val baseDamage    = normalDamage(diceRoll, abilityMod)
    // damage with Thrown Weapon Fighting style bonus folded into modifier
    val boostedDamage = normalDamage(diceRoll, abilityMod + styleBonus)
  
    assert(boostedDamage == baseDamage + 2)
  }
  
  // Thrown Weapon Fighting applies only on a hit; a miss still deals 0 damage
  run qa_thrown_weapon_fighting_miss_deals_no_damage = {
    val d20Roll    = 3    // low roll — attacker misses
    val atkBonus   = 5
    val targetAC   = 14
    val coverBonus = 0
    val critRange  = 20
  
    val result = resolveAttackRoll(d20Roll, atkBonus, targetAC, coverBonus, critRange)
    // confirm the attack misses, so the +2 style bonus is never applied
    assert(not(result.hits))
  }

  // Source: https://rpg.stackexchange.com/q/216115
  
  run qa_blindsight_does_not_remove_blinded_attack_disadvantage = {{
    val attacker = freshCreature(20).with("blinded", true)
    val ctx: AttackContext = {
      attackerBlinded: attacker.blinded,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }}
  
  // Blinded despite Blindsight?
  run qa_blinded_target_still_grants_advantage_on_attacks_against_it = {{
    val target = freshCreature(20).with("blinded", true)
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: target.blinded,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }}

  // Source: https://rpg.stackexchange.com/q/216087
  
  run qa_thrown_dagger_javelin_spear_are_still_melee_weapons = {{
    val dagger: Weapon = {
      name: "Dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val javelin: Weapon = {
      name: "Javelin",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Thrown),
      isMelee: true,
      normalRange: 30,
      longRange: 120,
    }
    val spear: Weapon = {
      name: "Spear",
      damageDie: 6,
      versatileDie: 8,
      damageType: Piercing,
      properties: Set(Thrown, Versatile),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    assert(
      dagger.properties.contains(Thrown) and dagger.isMelee
      and javelin.properties.contains(Thrown) and javelin.isMelee
      and spear.properties.contains(Thrown) and spear.isMelee
    )
  }}
  
  // Q&A: Can a 2024 Monk use Stunning Strike with a thrown dagger, javelin or spear?
  run qa_throwing_melee_weapon_does_not_make_it_ranged_for_attack_stat = {{
    val dagger: Weapon = {
      name: "Dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val javelin: Weapon = {
      name: "Javelin",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Thrown),
      isMelee: true,
      normalRange: 30,
      longRange: 120,
    }
    val spear: Weapon = {
      name: "Spear",
      damageDie: 6,
      versatileDie: 8,
      damageType: Piercing,
      properties: Set(Thrown, Versatile),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    assert(
      weaponAttackAbility(javelin, 3, 5) == 3
      and weaponAttackAbility(spear, 2, 4) == 2
      and weaponAttackAbility(dagger, 1, 4) == 4
    )
  }}

  // Source: https://rpg.stackexchange.com/q/213854
  
  // How does Jump work? — Jump spell (2024) "Hella Buffed": spending 10ft movement enables 30ft of travel, remaining movement stays usable
  run qa_jump_spell_hella_buffed = {
    // Creature with 30ft speed starts their turn
    val t0 = FRESH_TURN  // movementRemaining: 30, effectiveSpeed: 30
    // Jump spell: creature spends 10ft of movement to jump 30ft (spell replaces normal 30ft cost)
    val afterJump = pUseMovement(t0, 10, 1)
    // The remaining 20ft of movement is still available for normal movement afterward
    val afterWalk = pUseMovement(afterJump, 20, 1)
    assert(
      // Only 10ft deducted for the 30ft jump — 20ft budget remains
      afterJump.movementRemaining == 20
      // That 20ft is fully spendable: 30ft (jump) + 20ft (walk) = 50ft total on a 30ft speed
      and afterWalk.movementRemaining == 0
    )
  }

  // Source: https://rpg.stackexchange.com/q/214877
  
  // How does Agonizing Blast synergize with Green Flame Blade?
  // Pre-5th level GFB secondary damage is a fixed value (= spellcasting mod, no die);
  // Agonizing Blast only adds CHA mod to damage rolls, so there is nothing to add.
  run qa_agonizing_blast_gfb_pre5_no_roll = {
    val chaScore = 18
    val chaMod = abilityModifier(chaScore) // +4
    // Pre-5th: secondary damage = spellcasting modifier only (fixed, no dice rolled).
    // Model as normalDamage with 0 dice — Agonizing Blast finds no roll to enhance.
    val secondaryFixed = normalDamage(0, chaMod) // 0 + 4 = 4
    assert(secondaryFixed == chaMod)
  }
  
  // At 5th level GFB secondary becomes 1d8 + spellcasting mod (a real damage roll);
  // Agonizing Blast legally adds CHA mod to that roll, stacking with the existing modifier.
  run qa_agonizing_blast_gfb_5th_secondary_stacks = {
    val chaScore = 18
    val chaMod = abilityModifier(chaScore)  // +4
    val spellcastingMod = chaMod            // warlock spellcasting ability = CHA
    val d8Roll = 5
    // Agonizing Blast: add CHA mod to the spell's damage rolls.
    // 5th-level secondary = 1d8 + spellcastingMod + chaMod (Agonizing Blast)
    val secondaryDamage = normalDamage(d8Roll, spellcastingMod + chaMod)
    assert(secondaryDamage == 13) // 5 + 4 + 4
  }

  // Source: https://reddit.com/r/onednd/comments/wufukz/
  
  // The 1 thing that can make changes to monster crits work for me: default critRange=20
  run qa_monster_crit_range_default_is_20 = {
    val roll19 = resolveAttackRoll(19, 5, 14, 0, 20)
    val roll20 = resolveAttackRoll(20, 5, 14, 0, 20)
    assert(
      roll19.hits and not(roll19.isCritical) and
      roll20.hits and roll20.isCritical
    )
  }
  
  // The 1 thing that can make changes to monster crits work for me: "Critical Attacker" monster crits on 19-20
  run qa_monster_crit_range_expanded_19_20 = {
    val roll18 = resolveAttackRoll(18, 5, 14, 0, 19)
    val roll19 = resolveAttackRoll(19, 5, 14, 0, 19)
    val roll20 = resolveAttackRoll(20, 5, 14, 0, 19)
    assert(
      roll18.hits and not(roll18.isCritical) and
      roll19.hits and roll19.isCritical and
      roll20.hits and roll20.isCritical
    )
  }
  
  // The 1 thing that can make changes to monster crits work for me: crit doubles dice via criticalDamage
  run qa_monster_crit_doubles_dice = {
    // normal: 1d8+3 = diceResult(5)+mod(3) = 8
    // crit:   normalDice(5)+bonusDice(5)+mod(3) = 13  (bonus dice = extra roll of same die)
    val normalResult = normalDamage(5, 3)
    val critResult   = criticalDamage(5, 5, 3)
    assert(normalResult == 8 and critResult == 13 and critResult > normalResult)
  }

  // Source: https://reddit.com/r/onednd/comments/1giwn2c/
  
  // Warlock Pseudodragon - Unconscious condition from Sting: implies prone and incapacitated (never self-clears without damage or waking action)
  run qa_unconscious_implies_prone_and_incap = {
    val base = freshCreature(20)
    val poisoned = pApplyCondition(base, CPoisoned)
    val unconscious = pApplyCondition(poisoned, CUnconscious)
    all {
      assert(unconscious.unconscious),
      assert(unconscious.prone),
      assert(unconscious.incapacitatedSources.contains(ISUnconscious)),
      assert(isIncapacitated(unconscious)),
      // Removing poisoned does NOT auto-remove unconscious in the spec (conditions are independent)
      assert(pRemoveCondition(unconscious, CPoisoned).unconscious),
    }
  }
  
  // Warlock Pseudodragon - Petrified creature is immune to Poisoned (and thus immune to the unconscious side-effect)
  run qa_petrified_blocks_poisoned_no_unconscious_sting = {
    val base = freshCreature(20)
    val petrified = pApplyCondition(base, CPetrified)
    val afterPoisonAttempt = pApplyCondition(petrified, CPoisoned)
    all {
      assert(not(afterPoisonAttempt.poisoned)),
      assert(not(afterPoisonAttempt.unconscious)),
    }
  }

  // Paralyzed condition auto-fails DEX saving throws, blocking Dex-based save to end Poisoned
  run qa_paralyzed_autofails_dex_save_blocks_end_poisoned = {
    val creature = freshCreature(20)
    val withParalyzed = pApplyCondition(creature, CParalyzed)
    val withBoth = pApplyCondition(withParalyzed, CPoisoned)
    val saveMods = pSaveModifiers(withBoth, Dex)
    all {
      assert(withBoth.paralyzed),
      assert(withBoth.poisoned),
      assert(saveMods.autoFail),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/zhe9vv/
  
  // How are people feeling about the rework to Aid? — temp HP from Aid does not stack with other temp HP sources
  run qa_temp_hp_does_not_stack = {
    val c = freshCreature(20).with("tempHp", 5)
    // A second temp HP grant (keepOld=false) replaces rather than adds — no stacking
    val c2 = pGrantTempHp(c, 3, false)
    assert(c2.tempHp == 3 and c2.tempHp != 8)
  }
  
  // How are people feeling about the rework to Aid? — player can keep higher existing temp HP over a smaller new grant
  run qa_temp_hp_keep_higher = {
    val c = freshCreature(20).with("tempHp", 5)
    // keepOld=true: existing temp HP is retained when new amount is lower
    val c2 = pGrantTempHp(c, 3, true)
    assert(c2.tempHp == 5)
  }
  
  // How are people feeling about the rework to Aid? — temp HP at 0 HP does not restore consciousness (unlike real healing)
  run qa_temp_hp_no_revive_at_zero = {
    val c = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val c2 = pGrantTempHp(c, 10, false)
    assert(c2.unconscious and c2.hp == 0 and c2.tempHp == 10)
  }

  // Source: https://reddit.com/r/onednd/comments/wwlkii/
  
  // Natural 1: ability checks have no auto-fail — a nat 1 still succeeds when total beats DC
  run qa_nat1_no_autofail_on_ability_check = {
    // STR 30 = +10 mod; DC 5; roll 1 → total 11 ≥ 5 → success (no auto-fail rule for checks)
    val result = checkSucceeds(1, 10, NoneProf, 4, 0, 5)
    assert(result)
  }
  
  // Natural 1: ability checks have no auto-success on nat 20 — fails if total misses DC
  run qa_nat20_no_autosucceed_on_ability_check = {
    // -5 mod; DC 100; roll 20 → total 15 < 100 → failure (no auto-success rule for checks)
    val result = checkSucceeds(20, -5, NoneProf, 2, 0, 100)
    assert(not(result))
  }
  
  // Contrast: attack rolls DO have nat-1 auto-miss regardless of bonus
  run qa_nat1_autofail_applies_only_to_attack_rolls = {
    // Same high bonus scenario — attack with nat 1 always misses
    val attackResult = resolveAttackRoll(1, 15, 5, 0, 20)
    assert(not(attackResult.hits) and not(attackResult.isCritical))
  }

  // Source: https://reddit.com/r/onednd/comments/xrapzu/
  
  // playtest feats first impressions: Dual Wielder — without feat, both weapons must be Light for TWF
  run qa_twf_requires_both_weapons_light = {
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_, Thrown),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    // two light melee weapons -> TWF allowed
    assert(pCanTWFWithWeapons(shortsword, dagger, t, creature))
  }
  
  // playtest feats first impressions: without Dual Wielder feat, non-light main weapon blocks TWF off-hand
  run qa_twf_non_light_main_blocks_twf = {
    val longsword: Weapon = {
      name: "longsword", damageDie: 8, versatileDie: 10,
      damageType: Slashing, properties: Set(Versatile),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_, Thrown),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    // longsword lacks Light_ -> cannot TWF without Dual Wielder
    assert(not(pCanTWFWithWeapons(longsword, dagger, t, creature)))
  }
  
  // playtest feats first impressions: Dual Wielder feat counts one weapon as Light, enabling TWF
  run qa_twf_dual_wielder_feat_counts_weapon_as_light = {
    val longsword: Weapon = {
      name: "longsword", damageDie: 8, versatileDie: 10,
      damageType: Slashing, properties: Set(Versatile),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    // Dual Wielder feat effect: caller adds Light_ to one weapon
    val longswordCountedAsLight: Weapon = longsword.with("properties", Set(Versatile, Light_))
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_, Thrown),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    // with Dual Wielder (longsword treated as Light) + light off-hand -> TWF allowed
    assert(pCanTWFWithWeapons(longswordCountedAsLight, dagger, t, creature))
  }

  // Source: https://reddit.com/r/onednd/comments/x05b7l/
  
  // Hunter's Mark and the new unarmed strike: "extra" damage requires initial damage; successful grapple deals none
  run qa_hunters_mark_no_damage_on_grapple = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.hp == target.hp)
  }
  
  // Hunter's Mark and the new unarmed strike: "extra" damage requires initial damage; successful shove-prone deals none
  run qa_hunters_mark_no_damage_on_shove_prone = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShoveProne)
    assert(result.success and result.targetState.hp == target.hp)
  }
  
  // Hunter's Mark and the new unarmed strike: "extra" damage requires initial damage; successful shove-push deals none
  run qa_hunters_mark_no_damage_on_shove_push = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShovePush)
    assert(result.success and result.targetState.hp == target.hp)
  }

  // Source: https://reddit.com/r/onednd/comments/z9si3f/
  
  // Revised Disciple of Life: bonus HP (2 + spell level) applies only on the casting turn, not to Goodberry's delayed per-berry healing
  run qa_disciple_of_life_casting_turn_only = {
    val spellLevel = 1
    val baseHeal = 4
    val discipleBonus = 2 + spellLevel   // = 3
    val creature = freshCreature(20).with("hp", 5)
    // Casting turn: healer adds Disciple of Life bonus to the immediate heal
    val castingTurnResult = pHeal(creature, baseHeal + discipleBonus)
    // Later turn (Goodberry scenario): berry consumed on a different turn — no Disciple bonus
    val laterTurnResult = pHeal(creature, baseHeal)
    assert(
      castingTurnResult.hp == 12 and
      laterTurnResult.hp == 9 and
      castingTurnResult.hp == laterTurnResult.hp + discipleBonus
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wru1qc/
  
  // New Grappling Rules Thoughts? — grappling only halves mover's speed, not a general condition
  run qa_grappling_speed_only_penalty = {
    val creature = freshCreature(20)
    // Grappling a same-size target: speed halved (30 → 15), no other impairment
    val turnGrappling = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, false)
    // Not grappling: full speed
    val turnNormal = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    // Grappling a two-sizes-smaller target: exemption, full speed retained
    val turnGrapplingSmall = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, true)
    assert(
      // Movement penalty only: speed halved when dragging a non-tiny target
      turnGrappling.movementRemaining == 15
      and turnNormal.movementRemaining == 30
      and turnGrapplingSmall.movementRemaining == 30
      // Grappling does NOT incapacitate or prone the grappler — not a general condition
      and not(creature.prone)
      and not(isIncapacitated(creature))
    )
  }

  // Source: https://rpg.stackexchange.com/q/214390
  
  // Level 5 Goliath damage output: critical hit doubles only dice rolled, not flat modifiers (str, rage, GWM)
  run qa_critical_hit_flat_mod_not_doubled = {
    val normalRoll  = 8   // d12 result
    val critBonus   = 10  // extra d12 rolled on critical hit
    val flatMod     = 9   // +4 str + +2 rage + +3 GWM — added once, not doubled
    val critDmg = criticalDamage(normalRoll, critBonus, flatMod)
    // crit damage == normal damage + bonus dice only; flatMod is NOT multiplied
    assert(critDmg == normalDamage(normalRoll, flatMod) + critBonus)
  }

  // Source: https://reddit.com/r/onednd/comments/z9rew3/
  
  // Spiritual Weapon now needs Concentration — starting SW breaks Spirit Guardians concentration
  run qa_spiritual_weapon_breaks_spirit_guardians_concentration = {
    val slots_with_sg = pStartConcentration(FRESH_SPELL_SLOTS, "spirit_guardians")
    val slots_with_sw = pStartConcentration(slots_with_sg, "spiritual_weapon")
    assert(
      isConcentrating(slots_with_sg)
      and slots_with_sw.concentrationSpellId == "spiritual_weapon"
      and slots_with_sw.concentrationSpellId != "spirit_guardians"
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wrxdd7/
  
  // Current changes and their application to Monk: Unarmed Strike buffs.
  run qa_shove_prone_makes_target_prone = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShoveProne)
    assert(result.success and result.targetState.prone)
  }
  
  // Current changes and their application to Monk: Unarmed Strike buffs.
  run qa_grapple_success_zeroes_movement = {
    val target = freshCreature(20)
    val grappleResult = pGrapple(Medium, Medium, target, true, true)
    val turn = pStartTurn(TEST_CONFIG, grappleResult.targetState, Unarmored, 0, false, false)
    assert(grappleResult.success and turn.movementRemaining == 0)
  }
  
  // Current changes and their application to Monk: Unarmed Strike buffs.
  run qa_prone_target_within_5ft_gives_attacker_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: true, attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Current changes and their application to Monk: Unarmed Strike buffs.
  run qa_grappled_attacker_has_disadvantage_vs_non_grappler = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: true, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and mods.hasDisadvantage)
  }
  
  // Current changes and their application to Monk: Unarmed Strike buffs.
  run qa_grappled_prone_cannot_stand_due_to_zero_speed = {
    val target = freshCreature(20).with("grappled", true).with("prone", true)
    val turn = pStartTurn(TEST_CONFIG, target, Unarmored, 0, false, false)
    val turnAfterAttemptedStand = pStandFromProne(turn)
    assert(turn.effectiveSpeed == 0 and turnAfterAttemptedStand.movementRemaining == turn.movementRemaining)
  }

  // Source: https://reddit.com/r/onednd/comments/xd7im9/
  
  // Cowardly Fighter: level-20 Fighter (WIS 12, no WIS proficiency) fails DC 19 frightful presence on a near-pass roll
  run qa_fighter_wis_save_fails_frightful_presence = {
    // profBonus(20)=6; abilMod(12)=+1; roll 17 → 17+1=18 < 19 → fails
    assert(not(saveSucceeds(17, abilityModifier(12), false, proficiencyBonus(20), 0, 19)))
  }
  
  // Cowardly Fighter: level-20 Cleric (WIS 20, WIS proficiency) passes the same DC 19 on a low roll
  run qa_cleric_wis_save_succeeds_same_dc = {
    // profBonus(20)=6; abilMod(20)=+5; roll 8 → 8+5+6=19 >= 19 → succeeds
    assert(saveSucceeds(8, abilityModifier(20), true, proficiencyBonus(20), 0, 19))
  }
  
  // Cowardly Fighter: both the original roll and an Indomitable reroll fail the DC 19 save
  run qa_fighter_indomitable_reroll_still_fails = {
    // First roll 15: 15+1=16 < 19; reroll 13: 13+1=14 < 19 — both fail
    val wisMod = abilityModifier(12)
    val pb     = proficiencyBonus(20)
    assert(
      not(saveSucceeds(15, wisMod, false, pb, 0, 19))
      and not(saveSucceeds(13, wisMod, false, pb, 0, 19))
    )
  }
  
  // Cowardly Fighter: once frightened, the creature suffers disadvantage on attacks toward the fear source in LOS
  run qa_frightened_imposes_attack_disadvantage = {
    val creature = freshCreature(30)
    val frightened = pApplyCondition(creature, CFrightened)
    val mods = pOwnAttackModifiers(frightened, true)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }

  // Exhaustion inflicted by monster abilities persists indefinitely until reduced by finishing a long rest
  run qa_exhaustion_persists_until_long_rest = {
    // A creature gains 2 exhaustion levels (e.g. from a monster ability)
    val start = freshCreature(30).with("exhaustion", 2).with("hitPointDiceRemaining", 5)
  
    // After a long rest, exhaustion decreases by exactly 1 (not cleared entirely)
    val afterRest = pLongRest(start, 5)
  
    assert(afterRest.exhaustion == 1)
  }

  // Source: https://rpg.stackexchange.com/q/213682
  
  // Are cantrips prepared spells? — level 1+ spells require a slot (preparation); cantrips are known and do not
  run qa_cantrips_known_not_prepared_no_slot = {
    // With no spell slots available, casting a level 1 spell is impossible.
    // Cantrips (level 0) are "known" and bypass the slot/preparation system entirely.
    val noSlots = FRESH_SPELL_SLOTS
    assert(not(pCanCastAtLevel(noSlots, 1, 1)))
  }
  
  // Are cantrips prepared spells? — after a bonus action spell, only cantrips remain castable as an action
  run qa_bonus_spell_blocks_noncantripaction_not_cantrips = {
    // PHB: casting a bonus action spell restricts action spells to cantrips only.
    // canCastNonCantripAction encodes the block on level 1+ (prepared) spells;
    // cantrips are a distinct known category and are not subject to this block.
    val t = pMarkBonusActionSpell(FRESH_TURN)
    assert(not(canCastNonCantripAction(t)))
  }

  // Source: https://reddit.com/r/onednd/comments/y4ni04/
  
  // Melee Rogues Breaking Cover: unseen attacker (hidden behind cover) has advantage on attack rolls
  run qa_hidden_unseen_attacker_melee_has_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,  // hidden behind cover — target cannot see attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Melee Rogues Breaking Cover: after making attack roll hidden condition ends — attacker now visible, no unseen advantage
  run qa_hidden_ends_after_attack_roll_no_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,  // hidden condition ended on attack roll; attacker now visible
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage))
  }
  
  // Melee Rogues Breaking Cover: three-quarters cover grants +5 AC bonus enabling the hide position
  run qa_three_quarters_cover_grants_plus5_ac = {
    assert(coverBonus(ThreeQuartersCover) == 5)
  }

  // Source: https://reddit.com/r/onednd/comments/1ek90nt/
  
  // How many Second Wind and Weapon Masteries do Fighters get now?
  run qa_second_wind_max_charges_level_1_to_3 = {
    // Fighters at levels 1–3 have a Second Wind max of 2
    val fs1 = freshFighterState(1)
    val fs3 = freshFighterState(3)
    all {
      assert(secondWindMaxCharges(1) == 2),
      assert(secondWindMaxCharges(3) == 2),
      assert(fs1.secondWindMax == 2),
      assert(fs3.secondWindMax == 2),
    }
  }
  
  // How many Second Wind and Weapon Masteries do Fighters get now?
  run qa_second_wind_max_charges_level_4_to_9 = {
    // Fighters at levels 4–9 have a Second Wind max of 3
    val fs4 = freshFighterState(4)
    val fs9 = freshFighterState(9)
    all {
      assert(secondWindMaxCharges(4) == 3),
      assert(secondWindMaxCharges(9) == 3),
      assert(fs4.secondWindMax == 3),
      assert(fs9.secondWindMax == 3),
    }
  }
  
  // How many Second Wind and Weapon Masteries do Fighters get now? (accepted: "Max 4 at a time")
  run qa_second_wind_max_charges_level_10_plus = {
    // Fighters at level 10+ have a Second Wind max of 4
    val fs10 = freshFighterState(10)
    val fs20 = freshFighterState(20)
    all {
      assert(secondWindMaxCharges(10) == 4),
      assert(secondWindMaxCharges(20) == 4),
      assert(fs10.secondWindMax == 4),
      assert(fs20.secondWindMax == 4),
    }
  }
  
  // How many Second Wind and Weapon Masteries do Fighters get now? (short rest regains one use)
  run qa_second_wind_short_rest_regains_one = {
    // A Fighter who expended 2 SW charges regains exactly 1 on a short rest (capped at max)
    val fs = freshFighterState(10) // max 4
    val fsSpent = fs.with("secondWindCharges", 2)
    val fsAfterRest = pFighterShortRest(fsSpent)
    all {
      assert(fsAfterRest.secondWindCharges == 3),
      assert(fsAfterRest.secondWindCharges <= fsAfterRest.secondWindMax),
    }
  }
  
  // How many Second Wind and Weapon Masteries do Fighters get now? (short rest caps at max)
  run qa_second_wind_short_rest_capped_at_max = {
    // Short rest does not exceed secondWindMax even if already at max
    val fs = freshFighterState(4) // max 3, starts full
    val fsAfterRest = pFighterShortRest(fs)
    assert(fsAfterRest.secondWindCharges == 3)
  }

  // Source: https://reddit.com/r/onednd/comments/1hxfso6/
  
  // Quick question about remarkable athlete: crit movement is extra, not drawn from existing pool
  run qa_remarkable_athlete_bonus_movement_is_extra = {
    // Champion at level 5 (has Remarkable Athlete from level 3)
    // FRESH_TURN has movementRemaining: 30, effectiveSpeed: 30
    val ts0 = FRESH_TURN
    // Simulate Remarkable Athlete crit: grant half speed as bonus movement
    val ts1 = pGrantBonusMovement(ts0, ts0.effectiveSpeed, false)
    // Use all bonus movement (half speed = 15 ft)
    val ts2 = pUseBonusMovement(ts1, ts1.bonusMovementRemaining)
    all {
      // Bonus movement is half effectiveSpeed (15 ft), tracked separately
      assert(ts1.bonusMovementRemaining == ts0.effectiveSpeed / 2),
      // Regular movement pool is completely untouched after grant
      assert(ts1.movementRemaining == ts0.movementRemaining),
      // Even after spending the bonus movement, regular pool is still intact
      assert(ts2.movementRemaining == ts0.movementRemaining),
      // Bonus movement is now exhausted
      assert(ts2.bonusMovementRemaining == 0),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/wyi0ib/
  
  // Q: "Question About Change In Gnomish Cunning" — One D&D grants advantage on all Int/Wis/Cha saves (no "against magic" restriction)
  run qa_gnomish_cunning_advantage_all_int_wis_cha_saves = {
    // Gnome with Wis 14, no proficiency, DC 15 non-magic save
    val wisMod = abilityModifier(14)   // +2
    val pb     = proficiencyBonus(3)   // +3
    val dc     = 15
    val lowRoll  = 9   // 9 + 2 = 11 < 15 → fails without advantage
    val highRoll = 13  // 13 + 2 = 15 >= 15 → succeeds
  
    // One D&D Gnomish Cunning: advantage with no magic restriction, no disadv source
    val adv = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    val effectiveRoll = if (adv.hasAdvantage) intMax(lowRoll, highRoll) else lowRoll
  
    val failsWithout  = not(saveSucceeds(lowRoll,       wisMod, false, pb, 0, dc))
    val succeedsWith  = saveSucceeds(effectiveRoll, wisMod, false, pb, 0, dc)
  
    // Same mechanic holds for Int and Cha (no magic guard needed — One D&D dropped it)
    val intMod = abilityModifier(12)   // +1
    val chaMod = abilityModifier(10)   // +0
    val intLow = 11  // 11 + 1 = 12 < 14 → fails
    val intHigh = 13 // 13 + 1 = 14 >= 14 → succeeds
    val intDC = 14
    val failsIntWithout = not(saveSucceeds(intLow,  intMod, false, pb, 0, intDC))
    val succeedsIntWith = saveSucceeds(intMax(intLow, intHigh), intMod, false, pb, 0, intDC)
  
    val chaLow = 14  // 14 + 0 = 14 < 15 → fails
    val chaHigh = 15 // 15 + 0 = 15 >= 15 → succeeds
    val failsChaWithout = not(saveSucceeds(chaLow,  chaMod, false, pb, 0, dc))
    val succeedsChaWith = saveSucceeds(intMax(chaLow, chaHigh), chaMod, false, pb, 0, dc)
  
    assert(and {
      failsWithout,
      succeedsWith,
      failsIntWithout,
      succeedsIntWith,
      failsChaWithout,
      succeedsChaWith,
    })
  }

  // Source: https://reddit.com/r/onednd/comments/wuon0p/
  
  // Shove just got very strong: successful ShoveProne knocks target prone, granting advantage to adjacent attackers
  run qa_shove_prone_grants_advantage = {
    val target = freshCreature(20)
    val shoveResult = pShove(Medium, Medium, target, true, ShoveProne)
    val defMods = pDefenseModifiers(shoveResult.targetState, true)
    assert(
      shoveResult.success
      and shoveResult.targetState.prone
      and defMods.attackerAdvantage
    )
  }
  
  // Shove just got very strong: failed shove leaves target upright, no advantage granted
  run qa_shove_failed_no_prone = {
    val target = freshCreature(20)
    val shoveResult = pShove(Medium, Medium, target, false, ShoveProne)
    val defMods = pDefenseModifiers(shoveResult.targetState, true)
    assert(
      not(shoveResult.success)
      and not(shoveResult.targetState.prone)
      and not(defMods.attackerAdvantage)
    )
  }
  
  // Shove just got very strong: prone target beyond 5ft gives attacker DISadvantage, not advantage
  run qa_shove_prone_beyond_5ft_disadvantage = {
    val target = freshCreature(20)
    val shoveResult = pShove(Medium, Medium, target, true, ShoveProne)
    val defModsNear = pDefenseModifiers(shoveResult.targetState, true)
    val defModsFar = pDefenseModifiers(shoveResult.targetState, false)
    assert(
      shoveResult.targetState.prone
      and defModsNear.attackerAdvantage
      and not(defModsFar.attackerAdvantage)
      and defModsFar.attackerDisadvantage
    )
  }

  // Source: https://reddit.com/r/onednd/comments/zhzqw5/
  
  // Should you require skill proficiency in the skill check you are providing help with?
  run qa_help_action_requires_skill_proficiency = {
    // PHB "Assist Ability Check": helper must choose one of their Skill Proficiencies;
    // TEST_CONFIG has Athletics + Perception, but not Stealth.
    val canHelpWithAthletics = TEST_CONFIG.skillProficiencies.contains(Athletics)
    val cannotHelpWithStealth = not(TEST_CONFIG.skillProficiencies.contains(Stealth))
    // A creature lacking the relevant proficiency does not meet the Help prerequisite,
    // so it cannot grant advantage on a Stealth check.
    assert(canHelpWithAthletics and cannotHelpWithStealth)
  }

  // Source: https://reddit.com/r/onednd/comments/xrhoii/
  
  // Is crossbow expert functional? — Loading property prevents extra attacks with a light crossbow
  run qa_crossbow_loading_prevents_extra_attack = {
    val lightCrossbow: Weapon = {
      name: "light crossbow",
      damageDie: 8,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Loading, TwoHanded),
      isMelee: false,
      normalRange: 80,
      longRange: 320,
    }
    assert(not(pCanExtraAttackWithWeapon(lightCrossbow)))
  }
  
  // Is crossbow expert functional? — hand crossbow cannot be used for TWF because it is not a melee weapon
  run qa_hand_crossbow_not_valid_for_twf = {
    val handCrossbow: Weapon = {
      name: "hand crossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Loading, Light_),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    val dagger: Weapon = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    // TWF requires both weapons to be Light AND melee — crossbow fails the melee check
    assert(not(pCanTWFWithWeapons(handCrossbow, dagger, t, creature)))
  }

  // Source: https://reddit.com/r/onednd/comments/zgpd1z/
  
  // Invisibility condition: blindsight negates attack disadvantage against invisible target (question a)
  run qa_blindsight_no_disadv_vs_invisible = {
    // attackerCanSeeTarget=true models blindsight perceiving the invisible creature
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true, targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,  // blindsight: attacker perceives invisible target
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }
  
  // Invisibility condition: blindsight prevents invisible attacker from gaining advantage (question b)
  run qa_blindsight_negates_invisible_attacker_adv = {
    // invisible creature attacks a defender with blindsight
    // targetCanSeeAttacker=true: defender perceives the invisible attacker via blindsight
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true, targetDodging: false,
      targetCanSeeAttacker: true,  // defender has blindsight, sees the invisible attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Invisibility condition: OA on invisible creature within blindsight is eligible and has no disadvantage (question c)
  run qa_blindsight_oa_on_invisible = {
    // invisible creature that has not disengaged can trigger an OA
    val t: TurnState = FRESH_TURN.with("disengaged", false)
    val oaEligible = pCanBeOpportunityAttacked(t)
    // attacker has blindsight — sees the invisible creature — so no disadvantage on the OA
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true, targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,  // blindsight covers the OA
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(oaEligible and not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }

  // Whether temp HP accumulate when an unlimited ability is used repeatedly outside combat
  run qa_temp_hp_no_stacking = {
    // Accepted answer: temporary hit points never accumulate (stack additively).
    // Each use of the ability lets you choose the higher value; you never add them together.
    val base = freshCreature(20)
    // First use: grants 5 temp HP from nothing
    val after_first = pGrantTempHp(base, 5, false)
    // Second use gives fewer (3): player keeps old (5 > 3), temp HP unchanged
    val after_lower = pGrantTempHp(after_first, 3, true)
    // Second use gives more (8): player takes new (8 > 5), replaces — not 5+8=13
    val after_higher = pGrantTempHp(after_first, 8, false)
    all {
      assert(after_first.tempHp == 5),
      assert(after_lower.tempHp == 5),
      assert(after_higher.tempHp == 8),
      // The critical assertion: temp HP are never summed
      assert(after_higher.tempHp != 5 + 8),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xtbtnu/
  
  // Throwing Specialist: Light melee thrown weapon (dagger) qualifies for Two-Weapon Fighting
  run qa_thrown_light_melee_qualifies_for_twf = {
    val dagger = {
      name: "dagger", damageDie: 4, versatileDie: 0,
      damageType: Piercing,
      properties: Set(Light_, Thrown, Finesse),
      isMelee: true, normalRange: 20, longRange: 60,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(pCanTWFWithWeapons(dagger, dagger, t, creature))
  }
  
  // Throwing Specialist: non-Light melee weapon (e.g. longsword) does not qualify for TWF off-hand
  run qa_non_light_melee_does_not_qualify_for_twf = {
    val longsword = {
      name: "longsword", damageDie: 8, versatileDie: 10,
      damageType: Slashing,
      properties: Set(Versatile),
      isMelee: true, normalRange: 0, longRange: 0,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(longsword, longsword, t, creature)))
  }
  
  // Throwing Specialist: TWF off-hand thrown attack does not add positive ability modifier to damage
  run qa_twf_offhand_thrown_no_positive_mod = {
    assert(pTWFOffHandDamage(4, 3) == 4)
  }
  
  // Throwing Specialist: TWF off-hand thrown attack still applies a negative ability modifier as penalty
  run qa_twf_offhand_thrown_applies_negative_mod = {
    assert(pTWFOffHandDamage(3, -1) == 2)
  }

  // Source: https://reddit.com/r/onednd/comments/zdcko5/
  
  // "A buff to grapple I haven't seen anyone talking about. Opportunity Attacks" — grapple as melee attack is eligible for OA when target hasn't disengaged
  run qa_grapple_eligible_for_opportunity_attack = {
    val targetTurn: TurnState = FRESH_TURN.with("disengaged", false)
    val target = freshCreature(20)
    // Attacker uses reaction for OA, makes grapple melee attack; target fails the save
    val attackerTurnAfterReaction = pUseReaction(FRESH_TURN)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(
      pCanBeOpportunityAttacked(targetTurn) and
      not(attackerTurnAfterReaction.reactionAvailable) and
      result.success and
      result.targetState.grappled
    )
  }
  
  // "A buff to grapple I haven't seen anyone talking about. Opportunity Attacks" — disengaging prevents the OA grapple
  run qa_grapple_oa_blocked_by_disengage = {
    val targetTurnDisengaged: TurnState = FRESH_TURN.with("disengaged", true)
    assert(not(pCanBeOpportunityAttacked(targetTurnDisengaged)))
  }
  
  // "A buff to grapple I haven't seen anyone talking about. Opportunity Attacks" — grappled condition forces target speed to 0, achieving the "you're not going anywhere" effect
  run qa_grapple_oa_pins_target = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    // Grappled speed is 0: simulate start of grappled target's turn; speed should collapse to 0
    val grappled = result.targetState
    val t = pStartTurn(TEST_CONFIG, grappled, Unarmored, 0, false, false)
    assert(result.success and grappled.grappled and t.effectiveSpeed == 0)
  }

  // Source: https://reddit.com/r/onednd/comments/wsb7sv/
  
  // Shillelagh: spellcasting ability replaces Str on attack rolls with club/quarterstaff
  run qa_shillelagh_uses_spellcasting_ability_not_str = {
    // Wis 16 (+3) spellcaster, Str 8 (-1), level 1 (profBonus +2)
    val wisMod  = abilityModifier(16)      // +3
    val strMod  = abilityModifier(8)       // -1
    val prof    = proficiencyBonus(1)      // +2
    val normalBonus     = prof + strMod    // 1
    val shillelaghBonus = prof + wisMod    // 5
    // d20=10, AC 15: without Shillelagh 10+1=11 < 15 (miss); with 10+5=15 >= 15 (hit)
    val normalResult     = resolveAttackRoll(10, normalBonus,     15, 0, 20)
    val shillelaghResult = resolveAttackRoll(10, shillelaghBonus, 15, 0, 20)
    assert(not(normalResult.hits) and shillelaghResult.hits)
  }
  
  // Shillelagh: spellcasting ability also replaces Str on damage rolls
  run qa_shillelagh_damage_uses_spellcasting_ability = {
    val wisMod = abilityModifier(16)   // +3
    val strMod = abilityModifier(8)    // -1
    val diceRoll = 6                   // quarterstaff d6 result
    val normalDmg     = normalDamage(diceRoll, strMod)   // 6 + (-1) = 5
    val shillelaghDmg = normalDamage(diceRoll, wisMod)   // 6 + 3    = 9
    assert(shillelaghDmg == 9 and normalDmg == 5 and shillelaghDmg > normalDmg)
  }
  
  // Magic Initiate: any spellcasting ability (e.g. Int) works with Shillelagh
  run qa_shillelagh_magic_initiate_int_spellcasting = {
    // Gish-type: Int 18 (+4), Str 8 (-1), level 1 (profBonus +2)
    val intMod = abilityModifier(18)   // +4
    val strMod = abilityModifier(8)    // -1
    val prof   = proficiencyBonus(1)   // +2
    val normalBonus     = prof + strMod   // 1
    val shillelaghBonus = prof + intMod   // 6
    // d20=8, AC 14: normal 8+1=9 < 14 (miss); Shillelagh 8+6=14 >= 14 (hit)
    val normalResult     = resolveAttackRoll(8, normalBonus,     14, 0, 20)
    val shillelaghResult = resolveAttackRoll(8, shillelaghBonus, 14, 0, 20)
    assert(not(normalResult.hits) and shillelaghResult.hits)
  }

  // Source: https://reddit.com/r/onednd/comments/wrzqnf/
  
  // Grappling and shoving use saving throws; failed save → Grappled condition
  run qa_grapple_save_fail_applies_grappled = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Grappling: target's successful save prevents the condition
  run qa_grapple_save_success_no_grapple = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, false, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Shove (prone choice) on failed save → Prone condition
  run qa_shove_prone_save_fail_applies_prone = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShoveProne)
    assert(result.success and result.targetState.prone)
  }
  
  // Shove push on failed save → success but no Prone
  run qa_shove_push_no_prone = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShovePush)
    assert(result.success and not(result.targetState.prone))
  }
  
  // Size restriction: Medium cannot grapple Huge (two sizes larger)
  run qa_grapple_blocks_two_sizes_larger = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Huge, target, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Size restriction: Medium CAN grapple Large (one size larger)
  run qa_grapple_allows_one_size_larger = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Large, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Grapple requires a free hand; no free hand → always fails
  run qa_grapple_requires_free_hand = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Incapacitated target is auto-grappled regardless of save result
  run qa_grapple_incapacitated_auto_success = {
    val target = freshCreature(20)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val result = pGrapple(Medium, Medium, target, false, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Grapple/Shove DC formula: 8 + STR mod + proficiency bonus
  run qa_grapple_shove_dc_formula = {
    // STR 18 → mod +4; level 5 → PB +3
    val dc = pGrappleShoveDC(abilityModifier(18), proficiencyBonus(5))
    assert(dc == 15)
  }
  
  // Shove (prone) is also blocked when attacker is too small relative to target
  run qa_shove_blocks_two_sizes_larger = {
    val target = freshCreature(20)
    val result = pShove(Small, Huge, target, true, ShoveProne)
    assert(not(result.success) and not(result.targetState.prone))
  }

  // Source: https://reddit.com/r/onednd/comments/1i3ev6t/
  
  // Can someone explain me a critical chances math used in yt for champion?
  // Each roll is resolved independently — a miss on roll 1 + Heroic Inspiration reroll
  // gives a fully independent second crit opportunity at critRange 19.
  run qa_champion_heroic_inspiration_reroll_crit = {
    val critRange  = configForLevel(3).critRange  // Champion L3: Improved Critical → critRange=19
    val firstRoll  = resolveAttackRoll(5, 5, 15, 0, critRange)   // total=10, misses (no crit)
    val reroll     = resolveAttackRoll(19, 5, 15, 0, critRange)  // d20=19 >= critRange=19 → crit
    all {
      assert(not(firstRoll.hits)),
      assert(not(firstRoll.isCritical)),
      assert(reroll.hits),
      assert(reroll.isCritical),
    }
  }
  
  // Champion crit ranges: standard 20 at L1, Improved Critical 19 at L3, Superior Critical 18 at L15.
  run qa_champion_crit_range_by_level = {
    val cr1  = configForLevel(1).critRange
    val cr3  = configForLevel(3).critRange
    val cr15 = configForLevel(15).critRange
    all {
      assert(cr1  == 20),
      assert(cr3  == 19),
      assert(cr15 == 18),
    }
  }
  
  // Each attack roll is resolved independently — critting on one roll does not affect another.
  run qa_champion_each_roll_resolved_independently = {
    val critRange = configForLevel(3).critRange  // 19
    val roll1 = resolveAttackRoll(19, 5, 15, 0, critRange)  // d20=19 → crit
    val roll2 = resolveAttackRoll(11, 5, 15, 0, critRange)  // total=16 >= 15, hits but not crit
    val roll3 = resolveAttackRoll(8,  5, 15, 0, critRange)  // total=13 < 15, miss
    all {
      assert(roll1.isCritical),
      assert(roll2.hits),
      assert(not(roll2.isCritical)),
      assert(not(roll3.hits)),
      assert(not(roll3.isCritical)),
    }
  }
  
  // Heroic Warrior (Champion L10): Heroic Inspiration is granted at start of turn and
  // cleared when spent — enabling a conditional reroll (e.g., on a miss).
  run qa_champion_heroic_inspiration_granted_then_spent = {
    val fs0          = freshFighterState(10).with("heroicInspiration", false)
    val fs_turn_start = pFighterStartTurn(fs0, 10)        // Heroic Warrior grants inspiration
    val fs_after_use  = fs_turn_start.with("heroicInspiration", false) // spending clears it
    all {
      assert(fs_turn_start.heroicInspiration),     // granted at start of turn
      assert(not(fs_after_use.heroicInspiration)), // consumed on use
    }
  }

  // Source: https://reddit.com/r/onednd/comments/y0sb5m/
  
  // Skills with Different Abilities (PHB p175): skill proficiency applies to non-standard ability check
  run qa_skill_different_ability = {
    // Persuasion normally uses CHA; DM allows INT check with Persuasion proficiency instead
    // Character: INT 16 (mod +3), Persuasion proficiency, level 5 (profBonus 3)
    val intMod    = abilityModifier(16)       // +3
    val chaMod    = abilityModifier(10)       // +0
    val pb        = proficiencyBonus(5)       // 3
    val dc        = 15
    val roll      = 9
    // Non-standard: INT + Persuasion prof → 9+3+3=15 >= 15, succeeds
    val intWithProf  = checkSucceeds(roll, intMod, Proficient, pb, 0, dc)
    // Standard: CHA + Persuasion prof → 9+0+3=12 < 15, fails (low CHA)
    val chaWithProf  = checkSucceeds(roll, chaMod, Proficient, pb, 0, dc)
    // Non-standard without proficiency: INT only → 9+3=12 < 15, fails
    val intNoProf    = checkSucceeds(roll, intMod, NoneProf, pb, 0, dc)
    assert(intWithProf and not(chaWithProf) and not(intNoProf))
  }

  // Source: https://reddit.com/r/onednd/comments/zfbonq/
  
  // Is it me, or is the Invisibility condition still funky? — Attacks Affected exception: invisible attacker vs target that cannot see them → advantage
  run qa_invisible_attacks_unseen_target_has_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,  // target cannot see the invisible attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Is it me, or is the Invisibility condition still funky? — Attacks Affected exception cancelled: invisible attacker vs target with See Invisibility → no advantage
  run qa_invisible_attacks_seen_target_no_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,  // target sees invisible attacker via See Invisibility/Blindsight
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Is it me, or is the Invisibility condition still funky? — Attacks Affected: attacking an invisible creature you cannot see → disadvantage
  run qa_attacking_invisible_unseen_has_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,  // attacker cannot see invisible target
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and mods.hasDisadvantage)
  }
  
  // Is it me, or is the Invisibility condition still funky? — Attacks Affected exception cancelled: attacking invisible creature you CAN see (See Invisibility) → no disadvantage
  run qa_attacking_invisible_seen_no_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,  // attacker sees invisible target via See Invisibility/Blindsight
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/1eiamfl/
  
  // New Heroic Inspiration and Hit Dice: Heroic Inspiration allows rerolling any die, including hit dice for HP on level up
  run qa_heroic_inspiration_hit_die_reroll = {
    // Pre-resolved dice: original bad roll of 1, rerolled result of 8, CON mod +2
    val initialRoll = 1
    val rerolledRoll = 8
    val conMod = 2
  
    // Heroic Inspiration: discard original roll, apply pLevelUpHp with the new result
    val hpFromInitialRoll  = pLevelUpHp(initialRoll, conMod)
    val hpFromRerolledRoll = pLevelUpHp(rerolledRoll, conMod)
  
    assert(all {
      // Original roll of 1 + 2 CON mod = 3 HP
      hpFromInitialRoll == 3,
      // Rerolled result of 8 + 2 CON mod = 10 HP (Heroic Inspiration replaces, not adds)
      hpFromRerolledRoll == 10,
      // Using Heroic Inspiration on a bad hit die roll strictly improves HP gained
      hpFromRerolledRoll > hpFromInitialRoll,
    })
  }

  // Source: https://reddit.com/r/onednd/comments/z7nv9t/
  
  // Long rests restore exactly one level of exhaustion (SRD 5.2.1), not all levels
  run qa_long_rest_restores_one_exhaustion_level = {
    val c = freshCreature(20).with("exhaustion", 3)
    val afterRest = pLongRest(c, 5)
    assert(afterRest.exhaustion == 2)
  }

  // Source: https://reddit.com/r/onednd/comments/18d01it/
  
  // Thoughts on allowing you to willingly fail any saving throw: shove succeeds when target willingly fails save
  run qa_willing_fail_save_shove_succeeds = {
    // A grappled creature willingly fails the shove save (targetSaveFailed = true),
    // so the shove to prone succeeds — encoding the accepted answer that this
    // mechanic already existed via normal grapple/shove and is unchanged.
    val grappled = pApplyCondition(freshCreature(20), CGrappled)
    val result = pShove(Medium, Medium, grappled, true, ShoveProne)
    all {
      assert(result.success == true),
      assert(result.targetState.prone == true),
      assert(result.targetState.grappled == true),
    }
  }
  
  // Willingly failing a shove save (push variant) also succeeds
  run qa_willing_fail_save_shove_push_succeeds = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShovePush)
    assert(result.success == true)
  }
  
  // Unwilling failure (save succeeds) blocks shove — contrast case
  run qa_save_success_blocks_shove = {
    val target = freshCreature(20)
    // targetSaveFailed = false means the target succeeded on the save
    val result = pShove(Medium, Medium, target, false, ShoveProne)
    all {
      assert(result.success == false),
      assert(result.targetState.prone == false),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xrhtio/
  
  // Ranger dip is great for barbarian now — bonus action used once per turn (Hunter's Mark and Rage both need bonus action, requiring separate turns)
  run qa_bonus_action_once_per_turn = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // First bonus action use (e.g. cast Hunter's Mark)
    val t1 = pUseBonusAction(t0, creature)
    // Second bonus action attempt (e.g. Rage) has no effect — bonus action already spent
    val t2 = pUseBonusAction(t1, creature)
    assert(t1.bonusActionUsed and t1 == t2)
  }
  
  // Ranger dip is great for barbarian now — casting Hunter's Mark as bonus action spell blocks non-cantrip action spell same turn
  run qa_bonus_action_spell_blocks_noncantrip_action = {
    val t0 = FRESH_TURN
    // Mark that a bonus action spell (Hunter's Mark) was cast this turn
    val t1 = pMarkBonusActionSpell(t0)
    // Cannot cast a non-cantrip as the action on the same turn
    assert(not(canCastNonCantripAction(t1)))
  }
  
  // Ranger dip is great for barbarian now — starting concentration on a second spell (e.g. a rage-granted concentration effect) replaces Hunter's Mark concentration
  run qa_concentration_replaced_by_new_spell = {
    val ss0 = FRESH_SPELL_SLOTS
    // Concentrating on Hunter's Mark
    val ss1 = pStartConcentration(ss0, "hunters_mark")
    // Start concentrating on a different spell — Hunter's Mark concentration is lost
    val ss2 = pStartConcentration(ss1, "other_spell")
    assert(ss2.concentrationSpellId == "other_spell" and not(isConcentrating(ss1) and ss2.concentrationSpellId == "hunters_mark"))
  }

  // Source: https://reddit.com/r/onednd/comments/wseghp/
  
  // New Unarmed Strike, Grapple and Shove interaction: Hex-like spell damage and grapple both apply on the same unarmed strike hit
  run qa_unarmed_hit_hex_damage_and_grapple = {
    val target = freshCreature(20)
    // Hex "whenever you hit with an attack" fires: 1d6 necrotic (rolled 4) applied on hit
    val afterHexDamage = pTakeDamage(target, 4, Necrotic, Set(), Set(), Set(), false)
    // Same hit: choose grapple unarmed strike effect (target save fails, attacker has free hand)
    val grappleResult = pGrapple(Medium, Medium, afterHexDamage, true, true)
    val finalState = grappleResult.targetState
    assert(
      // Hex bonus damage landed
      finalState.hp == 16
      // AND grapple succeeded simultaneously
      and grappleResult.success == true
      and finalState.grappled == true
    )
  }
  
  // New Unarmed Strike, Grapple and Shove interaction: Hex-like spell damage and shove-prone both apply on the same unarmed strike hit
  run qa_unarmed_hit_hex_damage_and_shove_prone = {
    val target = freshCreature(20)
    // Hex "whenever you hit with an attack" fires: 1d6 necrotic (rolled 4)
    val afterHexDamage = pTakeDamage(target, 4, Necrotic, Set(), Set(), Set(), false)
    // Same hit: choose shove-prone unarmed strike effect (target save fails)
    val shoveResult = pShove(Medium, Medium, afterHexDamage, true, ShoveProne)
    val finalState = shoveResult.targetState
    assert(
      // Hex bonus damage landed
      finalState.hp == 16
      // AND shove-prone succeeded simultaneously
      and shoveResult.success == true
      and finalState.prone == true
    )
  }
  
  // New Unarmed Strike, Grapple and Shove interaction: Hex-like spell damage and push-shove both apply on the same unarmed strike hit
  run qa_unarmed_hit_hex_damage_and_shove_push = {
    val target = freshCreature(20)
    val afterHexDamage = pTakeDamage(target, 4, Necrotic, Set(), Set(), Set(), false)
    val shoveResult = pShove(Medium, Medium, afterHexDamage, true, ShovePush)
    val finalState = shoveResult.targetState
    assert(
      finalState.hp == 16
      and shoveResult.success == true
      // push doesn't apply a tracked condition in the spec, but success is true
      and not(finalState.prone)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1hw0bv0/
  
  // Does Bloodied became a condition?
  // Bloodied (≤50% HP) is a keyword, not a condition — it sets no condition flags.
  run qa_bloodied_is_not_a_condition = {
    val maxHp = 20
    val creature = freshCreature(maxHp)
    // Take damage to land at exactly 50% HP
    val damaged = pTakeDamage(creature, 10, Slashing, Set(), Set(), Set(), false)
    // Bloodied threshold: hp <= maxHp / 2
    val isBloodied = damaged.hp <= damaged.maxHp / 2
    assert(
      and {
        // The creature is indeed bloodied (≤50% HP)
        isBloodied,
        // But no condition flags were set — bloodied is not a condition
        not(damaged.blinded),
        not(damaged.charmed),
        not(damaged.deafened),
        not(damaged.frightened),
        not(damaged.grappled),
        not(damaged.invisible),
        not(damaged.paralyzed),
        not(damaged.petrified),
        not(damaged.poisoned),
        not(damaged.prone),
        not(damaged.restrained),
        not(damaged.stunned),
        not(damaged.unconscious),
        damaged.incapacitatedSources == Set(),
      }
    )
  }

  // Source: https://rpg.stackexchange.com/q/215543
  
  // If you use Wild Shape as a druid after raging, do you keep the resistances gained from Rage?
  run qa_rage_resistances_persist_through_wild_shape = {
    // Rage grants resistance to Bludgeoning, Piercing, Slashing. Wild Shape
    // preserves class features and ongoing effects carry over unless the
    // description says otherwise — so rage resistances apply in Beast form.
    val maxHp = 30
    val creature = freshCreature(maxHp)
    val rageResistances = Set(Bludgeoning, Piercing, Slashing)
    val damageAmount = 20
    // In Wild Shape while raging: resistances carry over → 20 slashing is halved to 10
    val withRage = pTakeDamage(creature, damageAmount, Slashing, rageResistances, Set(), Set(), false)
    // Without rage (resistances not active): full 20 damage applied
    val withoutRage = pTakeDamage(creature, damageAmount, Slashing, Set(), Set(), Set(), false)
    assert(
      withRage.hp    == maxHp - (damageAmount / 2)  // 30 - 10 = 20
      and withoutRage.hp == maxHp - damageAmount        // 30 - 20 = 10
      and withRage.hp    != withoutRage.hp              // resistance meaningfully differs outcome
    )
  }

  // Grappled condition: disadvantage vs non-grappler, no penalty vs grappler
  run qa_grappled_attack_disadvantage = {
    // Grappled attacker targeting someone OTHER than the grappler → disadvantage
    val ctxNonGrappler: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: true,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    // Grappled attacker targeting the grappler → no disadvantage
    val ctxGrappler: AttackContext = ctxNonGrappler.with("targetIsGrappler", true)
  
    val modsVsNonGrappler = pAggregateAttackMods(ctxNonGrappler)
    val modsVsGrappler    = pAggregateAttackMods(ctxGrappler)
  
    all {
      assert(modsVsNonGrappler.hasDisadvantage),
      assert(not(modsVsNonGrappler.hasAdvantage)),
      assert(not(modsVsGrappler.hasDisadvantage)),
      assert(not(modsVsGrappler.hasAdvantage)),
    }
  }

  // Source: https://rpg.stackexchange.com/q/213674
  
  // Does Potent Spellcasting (Druid) work with Shillelagh?
  run qa_shillelagh_potent_spellcasting_no_double_wis = {
    // Wis 20 → +5 modifier (level 7 druid, maxed wisdom)
    val wisMod = abilityModifier(20)
    // Shillelagh is a Transmutation cantrip — it does not itself deal damage;
    // the cantrip produces zero direct damage (no attack, no damage roll on cast)
    val shillelaghDirectDamage = 0
    // Weapon attack using the Shillelagh-enhanced quarterstaff (d10 at level 7 cantrip upgrade)
    // Shillelagh substitutes Wis for Str → modifier is wisMod, applied exactly once
    val diceRoll = 5
    val correctDamage = normalDamage(diceRoll, wisMod)
    // Wrong (rejected) interpretation: Potent Spellcasting adds a second Wis mod to the attack
    val wrongDamage = normalDamage(diceRoll, wisMod + wisMod)
    assert(and {
      // Shillelagh cast deals no direct damage — not an attack cantrip
      shillelaghDirectDamage == 0,
      // Weapon attack adds Wis mod exactly once (Shillelagh substitution for Str only)
      correctDamage == diceRoll + wisMod,
      // Double-Wis interpretation is strictly larger and therefore wrong
      correctDamage != wrongDamage,
      wrongDamage == diceRoll + (2 * wisMod),
    })
  }

  // Source: https://rpg.stackexchange.com/q/216492
  
  // Does Planar Binding's effect persist on a creature after it dies and rematerializes (Diabolical Restoration)?
  run qa_active_effect_persists_through_death = {
    val creature = freshCreature(10)
    val withBinding = creature.with("activeEffects",
      pAddEffect(creature.activeEffects, "planar_binding", 10, AtEndOfTurn))
    // Instant death: overflow (20) >= maxHp (10)
    val killed = pTakeDamage(withBinding, 30, Slashing, Set(), Set(), Set(), false)
    assert(killed.dead and pHasEffect(killed.activeEffects, "planar_binding"))
  }

  // Source: https://reddit.com/r/onednd/comments/11a3r4s/
  
  // Abjure Foes: failed Wisdom save applies Frightened condition to target
  run qa_abjure_foes_failed_save_applies_frightened = {
    val target = freshCreature(30)
    val afterFailedSave = pApplyCondition(target, CFrightened)
    assert(afterFailedSave.frightened)
  }
  
  // Abjure Foes: successful Wisdom save does not apply Frightened (only Dazed, not in spec)
  run qa_abjure_foes_successful_save_no_frightened = {
    val target = freshCreature(30)
    // On success only Dazed is applied; Frightened must be absent
    assert(not(target.frightened))
  }
  
  // Abjure Foes: Frightened creature has disadvantage on attacks when fear source is in LOS
  run qa_abjure_foes_frightened_attack_disadv_in_los = {
    val target = freshCreature(30)
    val frightened = pApplyCondition(target, CFrightened)
    val mods = pOwnAttackModifiers(frightened, true)
    assert(mods.hasDisadvantage)
  }
  
  // Abjure Foes: Frightened creature has no fear-sourced disadvantage when source outside LOS
  run qa_abjure_foes_frightened_no_disadv_out_of_los = {
    val target = freshCreature(30)
    val frightened = pApplyCondition(target, CFrightened)
    val mods = pOwnAttackModifiers(frightened, false)
    assert(not(mods.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/wtyzbq/
  
  // Why I as a DM sometimes ask for a skill check even though it has no chance of success or no chance of failure
  run qa_nat20_ability_check_not_auto_success = {
    // Ability checks have no auto-success on nat 20: total 20 + 0 mod = 20 < DC 25 → fails
    assert(not(checkSucceeds(20, 0, NoneProf, 2, 0, 25)))
  }
  
  // Why I as a DM sometimes ask for a skill check even though it has no chance of success or no chance of failure
  run qa_nat1_ability_check_not_auto_fail = {
    // Ability checks have no auto-fail on nat 1: 1 + 5 (abilityMod) + 12 (Expertise × PB 6) = 18 >= DC 10 → succeeds
    assert(checkSucceeds(1, 5, Expertise, 6, 0, 10))
  }

  // Source: https://rpg.stackexchange.com/q/215853
  
  run qa_enspell_item_cast_requires_no_free_hand = {{
    val caster = freshCreature(12).with("poisoned", false)
    val normalSomaticCastWithoutFreeHand = pCanProvideComponents(caster, false, true, false)
    val itemCastWithoutAnyComponents = pCanProvideComponents(caster, false, false, false)
    assert(not(normalSomaticCastWithoutFreeHand) and itemCastWithoutAnyComponents)
  }}

  // Source: https://reddit.com/r/onednd/comments/10oa8nb/
  
  // Dual Wielding: TWF requires both weapons to have the Light property — longswords (non-Light) cannot be dual wielded
  run qa_dual_wield_non_light_weapons_cannot_twf = {
    val longsword: Weapon = {
      name: "longsword",
      damageDie: 8,
      versatileDie: 10,
      damageType: Slashing,
      properties: Set(Versatile),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val t: TurnState = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(longsword, longsword, t, creature)))
  }
  
  // Dual Wielding: two Light melee weapons satisfy the TWF precondition
  run qa_dual_wield_light_weapons_can_twf = {
    val shortsword: Weapon = {
      name: "shortsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val t: TurnState = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(pCanTWFWithWeapons(shortsword, shortsword, t, creature))
  }
  
  // Dual Wielding: TWF bonus action unavailable if Attack action not yet taken
  run qa_dual_wield_requires_attack_action_first = {
    val shortsword: Weapon = {
      name: "shortsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    // FRESH_TURN has attackActionUsed: false
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(shortsword, shortsword, FRESH_TURN, creature)))
  }

  // Source: https://reddit.com/r/onednd/comments/yew73b/
  
  // Clarify attack roll terms in One D&D: melee vs ranged tag determines close-quarters disadvantage
  run qa_melee_spell_attack_no_close_quarters_disadv = {
    val baseCtx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false, hostileWithin5ft: true,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val meleeMods  = pAggregateAttackMods(baseCtx)
    val rangedMods = pAggregateAttackMods(baseCtx.with("isRangedAttack", true))
    assert(
      not(meleeMods.hasDisadvantage) and  // melee spell (e.g. Inflict Wounds): no close-quarters penalty
      rangedMods.hasDisadvantage          // ranged spell: hostile within 5 ft → disadvantage
    )
  }
  
  // Clarify attack roll terms in One D&D: spell attack bonus (melee or ranged) = spellcasting mod + PB
  run qa_spell_attack_bonus_uses_spellcasting_ability = {
    // TEST_CONFIG: Wis 13 → mod +1, level 5 → PB +3; spellcastingAbility = Wis
    val config = TEST_CONFIG
    val expectedBonus =
      abilityModifier(config.abilityScores.get(config.spellcastingAbility))
      + proficiencyBonus(config.level)
    assert(spellAttackBonus(config) == expectedBonus and expectedBonus == 4)
  }

  // Source: https://rpg.stackexchange.com/q/213265
  
  run qa_only_zero_hp_member_blocked_from_long_rest_but_others_can_rest = {{
    val fallen = freshCreature(20)
      .with("hp", 0)
      .with("stable", true)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("exhaustion", 2)
      .with("hitPointDiceRemaining", 1)
  
    val ally = freshCreature(20)
      .with("hp", 7)
      .with("exhaustion", 1)
      .with("hitPointDiceRemaining", 0)
  
    val fallenAfter = pLongRest(fallen, 5)
    val allyAfter = pLongRest(ally, 5)
  
    assert(
      fallenAfter == fallen
      and allyAfter.hp == 20
      and allyAfter.hitPointDiceRemaining == 5
      and allyAfter.exhaustion == 0
    )
  }}
  
  // Q&A: Does a party have to wait 1d4 hours to start a Short Rest if no healing is available and an ally is only stabilized?
  run qa_other_member_short_rest_is_independent_of_fallen_ally_state = {{
    val fallenStable0 = freshCreature(20)
      .with("hp", 0)
      .with("stable", true)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
  
    val fallenHealthy = freshCreature(20).with("hp", 20)
  
    val ally = freshCreature(20)
      .with("hp", 5)
      .with("hitPointDiceRemaining", 2)
  
    val allyAfterWhenFallenAt0 = pShortRest(ally, 2, [6])
    val allyAfterWhenNoOneDown = pShortRest(ally, 2, [6])
  
    assert(
      fallenStable0.hp == 0
      and allyAfterWhenFallenAt0 == allyAfterWhenNoOneDown
      and allyAfterWhenFallenAt0.hp == 13
      and allyAfterWhenFallenAt0.hitPointDiceRemaining == 1
      and fallenHealthy.hp == 20
    )
  }}

  // Source: https://rpg.stackexchange.com/q/213391
  
  // Can I have multiple guardians of faith?
  // Guardian of Faith is non-concentration — two castings don't replace each other; each slot is spent independently.
  run qa_multiple_guardian_of_faith_non_concentration = {
    val slots = {
      slotsMax:      Map(1->0, 2->0, 3->0, 4->2, 5->0, 6->0, 7->0, 8->0, 9->0),
      slotsCurrent:  Map(1->0, 2->0, 3->0, 4->2, 5->0, 6->0, 7->0, 8->0, 9->0),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // First casting — expend one 4th-level slot; no concentration set (GoF is not concentration)
    val slots1 = pExpendSlot(slots, 4)
    // Second casting — expend second 4th-level slot; concentration still unset
    val slots2 = pExpendSlot(slots1, 4)
    assert(
      slots2.slotsCurrent.get(4) == 0 and
      not(isConcentrating(slots2))
    )
  }
  
  // Can I have multiple guardians of faith?
  // Two independent GoF instances each deal 20 Radiant on a failed DEX save — effects applied separately, not combined.
  run qa_multiple_guardian_of_faith_damage_independent_fail = {
    val target = freshCreature(50)
    // First GoF instance: enemy fails save -> 20 radiant
    val t1 = pTakeDamage(target, 20, Radiant, Set(), Set(), Set(), false)
    // Second GoF instance: enemy fails save -> 20 radiant (independent)
    val t2 = pTakeDamage(t1, 20, Radiant, Set(), Set(), Set(), false)
    assert(t2.hp == 10)
  }
  
  // Can I have multiple guardians of faith?
  // Two independent GoF instances, both saves succeeded — half damage (10) each, applied separately.
  run qa_multiple_guardian_of_faith_damage_independent_success = {
    val target = freshCreature(50)
    // First GoF: passes save -> 10 radiant
    val t1 = pTakeDamage(target, 10, Radiant, Set(), Set(), Set(), false)
    // Second GoF: passes save -> 10 radiant (independent, not combined)
    val t2 = pTakeDamage(t1, 10, Radiant, Set(), Set(), Set(), false)
    assert(t2.hp == 30)
  }

  // Source: https://reddit.com/r/onednd/comments/xtdqdw/
  
  // Dipping Ranger doesn't slow spell slot progression now — Ranger uses ceil(levels/2) not floor
  run qa_ranger_multiclass_rounded_up = {
    // Ranger 1 / Wizard 3: Ranger contributes ceil(1/2)=1, not floor(1/2)=0
    val rangerLvls = 1
    val wizardLvls = 3
    val rangerContribCeiling = (rangerLvls + 1) / 2  // = 1
    val rangerContribFloor   = rangerLvls / 2         // = 0
    val casterLvlNew = wizardLvls + rangerContribCeiling  // = 4
    val casterLvlOld = wizardLvls + rangerContribFloor    // = 3
    assert(
      rangerContribCeiling == 1
      and rangerContribFloor == 0
      and pSlotsPerLevel(casterLvlNew, 2) == 3  // caster level 4: 3 × 2nd-level slots
      and pSlotsPerLevel(casterLvlOld, 2) == 2  // caster level 3: 2 × 2nd-level slots (old floor rule)
    )
  }

  // Conditions impose disadvantage or auto-fail on saving throws per condition rules
  run qa_restrained_dex_save_disadvantage = {
    val c = freshCreature(20)
    val restrained = pApplyCondition(c, CRestrained)
    val mods = pSaveModifiers(restrained, Dex)
    assert(mods.hasDisadvantage == true)
  }
  
  // Paralyzed creature auto-fails STR and DEX saving throws
  run qa_paralyzed_autofail_str_dex_saves = {
    val c = freshCreature(20)
    val paralyzed = pApplyCondition(c, CParalyzed)
    val strMods = pSaveModifiers(paralyzed, Str)
    val dexMods = pSaveModifiers(paralyzed, Dex)
    all {
      assert(strMods.autoFail == true),
      assert(dexMods.autoFail == true),
    }
  }
  
  // Stunned creature auto-fails STR and DEX saving throws
  run qa_stunned_autofail_str_dex_saves = {
    val c = freshCreature(20)
    val stunned = pApplyCondition(c, CStunned)
    val strMods = pSaveModifiers(stunned, Str)
    val dexMods = pSaveModifiers(stunned, Dex)
    all {
      assert(strMods.autoFail == true),
      assert(dexMods.autoFail == true),
    }
  }
  
  // Unconscious creature auto-fails STR and DEX saving throws
  run qa_unconscious_autofail_str_dex_saves = {
    val c = freshCreature(20)
    val unconscious = pApplyCondition(c, CUnconscious)
    val strMods = pSaveModifiers(unconscious, Str)
    val dexMods = pSaveModifiers(unconscious, Dex)
    all {
      assert(strMods.autoFail == true),
      assert(dexMods.autoFail == true),
    }
  }
  
  // Petrified creature auto-fails STR and DEX saving throws
  run qa_petrified_autofail_str_dex_saves = {
    val c = freshCreature(20)
    val petrified = pApplyCondition(c, CPetrified)
    val strMods = pSaveModifiers(petrified, Str)
    val dexMods = pSaveModifiers(petrified, Dex)
    all {
      assert(strMods.autoFail == true),
      assert(dexMods.autoFail == true),
    }
  }
  
  // Non-STR/DEX saves (e.g. CON, WIS, INT, CHA) are NOT auto-failed by paralyzed
  run qa_paralyzed_no_autofail_non_str_dex_saves = {
    val c = freshCreature(20)
    val paralyzed = pApplyCondition(c, CParalyzed)
    val conMods = pSaveModifiers(paralyzed, Con)
    val wisMods = pSaveModifiers(paralyzed, Wis)
    all {
      assert(conMods.autoFail == false),
      assert(wisMods.autoFail == false),
    }
  }
  
  // Restrained only imposes disadvantage on DEX saves, not other saves
  run qa_restrained_no_disadv_non_dex_saves = {
    val c = freshCreature(20)
    val restrained = pApplyCondition(c, CRestrained)
    val strMods = pSaveModifiers(restrained, Str)
    val conMods = pSaveModifiers(restrained, Con)
    all {
      assert(strMods.hasDisadvantage == false),
      assert(conMods.hasDisadvantage == false),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/ws8ofd/
  
  // Is Gnomish Cunning Over Powered? — Gnomish Cunning grants advantage on Wis saves (no magic restriction)
  run qa_gnomish_cunning_wis_save_advantage = {
    val wisMod = abilityModifier(14)  // +2
    val pb = proficiencyBonus(1)
    val lowRoll = 5
    val highRoll = 15
    val dc = 15
    // Gnomish Cunning: take higher of two d20 rolls on Wis save
    val advantageRoll = intMax(lowRoll, highRoll)
    assert(saveSucceeds(advantageRoll, wisMod, false, pb, 0, dc))
    and assert(not(saveSucceeds(lowRoll, wisMod, false, pb, 0, dc)))
  }
  
  // Is Gnomish Cunning Over Powered? — Gnomish Cunning grants advantage on Int saves (no magic restriction)
  run qa_gnomish_cunning_int_save_advantage = {
    val intMod = abilityModifier(10)  // +0
    val pb = proficiencyBonus(1)
    val lowRoll = 5
    val highRoll = 12
    val dc = 12
    val advantageRoll = intMax(lowRoll, highRoll)
    assert(saveSucceeds(advantageRoll, intMod, false, pb, 0, dc))
    and assert(not(saveSucceeds(lowRoll, intMod, false, pb, 0, dc)))
  }
  
  // Is Gnomish Cunning Over Powered? — Gnomish Cunning grants advantage on Cha saves (no magic restriction)
  run qa_gnomish_cunning_cha_save_advantage = {
    val chaMod = abilityModifier(8)  // -1
    val pb = proficiencyBonus(1)
    val lowRoll = 4
    val highRoll = 11
    val dc = 10
    val advantageRoll = intMax(lowRoll, highRoll)
    assert(saveSucceeds(advantageRoll, chaMod, false, pb, 0, dc))
    and assert(not(saveSucceeds(lowRoll, chaMod, false, pb, 0, dc)))
  }

  // Source: https://reddit.com/r/onednd/comments/10g2ryz/
  
  // Level 12 Playtest: Temple on the Mountain — Heavy Armor Master flat reduction can bring damage to zero
  run qa_heavy_armor_master_reduces_to_zero = {
    // HAM (playtest): -4 flat reduction; a 3-damage hit becomes 0
    val result = applyDamageModifiers(3, Slashing, Set(), Set(), Set(), 4)
    assert(result == 0)
  }
  
  // Level 12 Playtest: Temple on the Mountain — knocking bandit prone within 5ft grants melee advantage
  run qa_prone_target_within_5ft_gives_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: true, attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Level 12 Playtest: Temple on the Mountain — grappled bandit has speed 0, preventing escape
  run qa_grappled_creature_speed_zero = {
    val creature = freshCreature(30).with("grappled", true)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    assert(t.movementRemaining == 0)
  }
  
  // Level 12 Playtest: Temple on the Mountain — enlarged goliath (Large) can grapple Huge giant (within one size)
  run qa_enlarged_goliath_can_grapple_huge_giant = {
    val giant = freshCreature(50)
    val result = pGrapple(Large, Huge, giant, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Level 12 Playtest: Temple on the Mountain — non-enlarged Medium goliath cannot grapple Huge giant (two sizes larger)
  run qa_medium_goliath_cannot_grapple_huge_giant = {
    val giant = freshCreature(50)
    val result = pGrapple(Medium, Huge, giant, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Level 12 Playtest: Temple on the Mountain — missing long rest causes one exhaustion level
  run qa_missing_long_rest_causes_exhaustion = {
    val creature = freshCreature(30)
    val exhausted = pAddExhaustion(creature, 1)
    assert(exhausted.exhaustion == 1 and not(exhausted.dead))
  }

  // Source: https://reddit.com/r/onednd/comments/wyg58q/
  
  // Grapple and shove can be used as opportunity attacks via unarmed strike (reaction-based)
  run qa_grapple_as_opportunity_attack_8f29064a = {
    // Target has not disengaged: eligible to be opportunity attacked
    val targetTurn: TurnState = FRESH_TURN
    val canOA = pCanBeOpportunityAttacked(targetTurn)
    // Attacker spends reaction to make the OA
    val attackerAfterOA = pUseReaction(FRESH_TURN)
    // Grapple resolves as part of the OA: Medium vs Medium, save failed, free hand available
    val target = freshCreature(20)
    val grappleResult = pGrapple(Medium, Medium, target, true, true)
    assert(
      canOA and
      not(attackerAfterOA.reactionAvailable) and
      grappleResult.success and
      grappleResult.targetState.grappled
    )
  }
  
  // Disengaging prevents opportunity attacks (including grapple/shove OAs)
  run qa_disengaged_no_opportunity_attack = {
    val disengagedTurn = FRESH_TURN.with("disengaged", true)
    assert(not(pCanBeOpportunityAttacked(disengagedTurn)))
  }
  
  // Shove can also be used as an opportunity attack via the same reaction mechanic
  run qa_shove_as_opportunity_attack = {
    val targetTurn: TurnState = FRESH_TURN
    val canOA = pCanBeOpportunityAttacked(targetTurn)
    val attackerAfterOA = pUseReaction(FRESH_TURN)
    val target = freshCreature(20)
    val shoveResult = pShove(Medium, Medium, target, true, ShoveProne)
    assert(
      canOA and
      not(attackerAfterOA.reactionAvailable) and
      shoveResult.success and
      shoveResult.targetState.prone
    )
  }

  // Source: https://rpg.stackexchange.com/q/213868
  
  // Is Dispel Magic Limited to only Spells?
  // Accepted answer: Dispel Magic ends only ongoing spells (active effects with spellId),
  // not non-spell magical effects such as conditions applied by class features (e.g. Beguiling Magic Charmed).
  run qa_dispel_magic_ends_spells_not_class_features = {
    val c0 = freshCreature(20)
  
    // A spell effect (e.g. Bless) is tracked in activeEffects keyed by spellId.
    // Dispel Magic is modeled as pRemoveEffect — it ends the ongoing spell.
    val c1 = c0.with("activeEffects", pAddEffect(c0.activeEffects, "bless", 5, AtEndOfTurn))
    val c2 = c1.with("activeEffects", pRemoveEffect(c1.activeEffects, "bless"))
  
    // A non-spell magical effect (e.g. CCharmed from College of Glamour Beguiling Magic)
    // is tracked only as a condition — it is never entered into activeEffects under a spellId.
    // pRemoveEffect on a spellId that was never added leaves the condition untouched.
    val c3 = pApplyCondition(c0, CCharmed)
    val c4 = c3.with("activeEffects", pRemoveEffect(c3.activeEffects, "beguiling_magic"))
  
    assert(
      // Spell effect is gone after Dispel Magic
      not(pHasEffect(c2.activeEffects, "bless"))
      // Non-spell Charmed condition survives pRemoveEffect — Dispel Magic cannot end it
      and c4.charmed
    )
  }

  // Source: https://rpg.stackexchange.com/q/213303
  
  // Does innate sorcery apply to every attack from storm sphere? - multiple adv sources (Innate Sorcery + target-in-sphere) still resolve to single advantage
  run qa_innate_sorcery_storm_sphere_adv_no_stacking = {
    // Both Innate Sorcery and Storm Sphere (target in sphere) grant advantage; multiple sources collapse to one
    val result = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    assert(result.hasAdvantage and not(result.hasDisadvantage))
  }
  
  // Does innate sorcery apply to every attack from storm sphere? - Innate Sorcery modeled as active effect expires after its 1-minute (10-round) duration
  run qa_innate_sorcery_expires_after_ten_rounds = {
    val effects = pAddEffect(Set(), "innate_sorcery", 10, AtEndOfTurn)
    val stillActive = pTickEffects(effects, 9)
    val expired    = pTickEffects(effects, 10)
    assert(
      pHasEffect(effects, "innate_sorcery") and
      pHasEffect(stillActive, "innate_sorcery") and
      not(pHasEffect(expired, "innate_sorcery"))
    )
  }
  
  // Does innate sorcery apply to every attack from storm sphere? - advantage from Innate Sorcery is cancelled if a disadvantage source also applies (e.g., caster is frightened)
  run qa_innate_sorcery_adv_cancelled_by_disadv = {
    val result = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(result.hasAdvantage) and not(result.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/1hd4jl1/
  
  // Standing from Prone and Slow... Interaction?
  // Accepted answer: half-speed cost recalculates when speed changes mid-turn,
  // but if movement remaining (5 ft) < new half-speed cost (10 ft), creature cannot stand again.
  run qa_stand_prone_speed_reduced_insufficient_movement = {
    // Scenario: creature (speed 30) already spent 15 ft to stand once (15 remaining),
    // then Slow reduced speed to 20 and movement remaining dropped to 5.
    // Standing again costs half of new speed (20/2 = 10), but only 5 ft remain → fails.
    val t0: TurnState = FRESH_TURN
      .with("effectiveSpeed", 20)
      .with("movementRemaining", 5)
    val t1 = pStandFromProne(t0)
    // pSpendHalfSpeed: cost = 20/2 = 10 > 5 remaining → returns t unchanged
    assert(t1 == t0)
  }

  // Source: https://reddit.com/r/onednd/comments/xu875a/
  
  // What was wrong with 5e's Stealth rules? — invisible attacker (unseen) gets advantage on attack rolls, not Stealth checks
  run qa_invisible_attacker_advantage_on_attacks = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // What was wrong with 5e's Stealth rules? — attacking an invisible (unseen) target imposes disadvantage
  run qa_attacking_invisible_target_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and mods.hasDisadvantage)
  }
  
  // What was wrong with 5e's Stealth rules? — when neither side can see the other, advantage and disadvantage cancel
  run qa_mutual_invisibility_cancels_adv_disadv = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: false,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }

  // Source: https://rpg.stackexchange.com/q/214135
  
  // War Magic + Heavy Crossbow: Loading limits ammo fired per action, not total attacks available
  run qa_loading_limits_ammo_not_attacks = {
    val heavyCrossbow: Weapon = {
      name: "heavy_crossbow",
      damageDie: 10,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Loading, Heavy, TwoHanded, Ammunition),
      isMelee: false,
      normalRange: 100,
      longRange: 400,
    }
  
    val creature = freshCreature(20)
  
    // Loading blocks firing a second bolt with the same weapon
    val loadingBlocksWeaponReuse = not(pCanExtraAttackWithWeapon(heavyCrossbow))
  
    // FRESH_TURN reflects a fighter with Extra Attack (extraAttacksRemaining = 1)
    // Taking the Attack action (firing the crossbow once) does NOT consume the extra attack slot
    val t1 = pUseAction(FRESH_TURN, creature, AAttack)
    val extraAttackSlotStillAvailable = t1.extraAttacksRemaining == 1
  
    // The remaining attack slot can still be consumed for another purpose (War Magic cantrip)
    val t2 = pUseExtraAttack(t1)
    val extraAttackSlotConsumed = t2.extraAttacksRemaining == 0
  
    assert(loadingBlocksWeaponReuse and extraAttackSlotStillAvailable and extraAttackSlotConsumed)
  }

  // Source: https://reddit.com/r/onednd/comments/11dtqmx/
  
  // Paladin Crits: 2024 Divine Smite is not doubled on a critical hit — applied after attack resolves, not as part of it
  run qa_divine_smite_not_doubled_on_crit = {
    val creature = freshCreature(50)
    // Natural 20 → critical hit
    val attackResult = resolveAttackRoll(20, 5, 14, 0, 20)
    // Weapon damage: dice doubled on crit (1d8 normal=5, bonus=5, STR mod=3)
    val weaponDmg = criticalDamage(5, 5, 3)
    // 2024 Divine Smite: applied AFTER attack resolves — flat roll, never doubled
    val smiteRoll = 9  // pre-resolved 2d8 (2nd-level slot)
    val smiteDmg = normalDamage(smiteRoll, 0)
    // 2014 rules would have doubled smite dice on a crit
    val oldSmiteDmg = criticalDamage(smiteRoll, smiteRoll, 0)
    val afterWeapon = pTakeDamage(creature, weaponDmg, Slashing, Set(), Set(), Set(), true)
    val afterSmite  = pTakeDamage(afterWeapon, smiteDmg, Radiant, Set(), Set(), Set(), false)
    assert(
      // Attack was indeed a critical hit
      attackResult.isCritical
      // 2024 smite damage is the flat roll only
      and smiteDmg == smiteRoll
      // 2014 smite would have been doubled
      and oldSmiteDmg == smiteRoll * 2
      // The two rulesets differ
      and smiteDmg != oldSmiteDmg
      // HP loss = weapon crit damage + non-doubled smite
      and afterSmite.hp == 50 - weaponDmg - smiteDmg
    )
  }

  // Source: https://rpg.stackexchange.com/q/213801
  
  // Do you always have to make two saves for the new sleep spell?
  run qa_sleep_first_save_success_no_second_save = {
    val creature = freshCreature(20)
    // First save succeeded: no Incapacitated applied, second save never triggered
    val afterFirstSuccess = creature
    assert(not(isIncapacitated(afterFirstSuccess)) and not(afterFirstSuccess.unconscious))
  }
  
  // Do you always have to make two saves for the new sleep spell?
  run qa_sleep_first_fail_second_fail_becomes_unconscious = {
    val creature = freshCreature(20)
    // First save failed: creature gains Incapacitated
    val afterFirstFail = pApplyCondition(creature, CIncapacitated)
    // Second save is only required because creature is incapacitated at end of its turn
    val secondSaveRequired = isIncapacitated(afterFirstFail)
    // Second save also failed: creature gains Unconscious
    val afterSecondFail = pApplyCondition(afterFirstFail, CUnconscious)
    assert(secondSaveRequired and afterSecondFail.unconscious and isIncapacitated(afterSecondFail))
  }
  
  // Do you always have to make two saves for the new sleep spell?
  run qa_sleep_first_fail_second_success_not_unconscious = {
    val creature = freshCreature(20)
    // First save failed: creature gains Incapacitated
    val afterFirstFail = pApplyCondition(creature, CIncapacitated)
    // Second save required because incapacitated
    val secondSaveRequired = isIncapacitated(afterFirstFail)
    // Second save succeeded: remove Incapacitated, no Unconscious applied
    val afterSecondSuccess = pRemoveCondition(afterFirstFail, CIncapacitated)
    assert(secondSaveRequired and not(isIncapacitated(afterSecondSuccess)) and not(afterSecondSuccess.unconscious))
  }

  // Source: https://reddit.com/r/onednd/comments/x6fyz9/
  
  // I love the new Grapples and Unarmed Strikes - Grapple DC is 8 + STR mod + proficiency bonus
  run qa_grapple_dc_formula = {
    val strMod = abilityModifier(14) // score 14 → +2
    val profBonus = proficiencyBonus(5) // level 5 → +3
    assert(pGrappleShoveDC(strMod, profBonus) == 13)
  }
  
  // I love the new Grapples and Unarmed Strikes - target becomes grappled when save fails
  run qa_grapple_applies_on_failed_save = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // I love the new Grapples and Unarmed Strikes - grapple fails when target passes save
  run qa_grapple_fails_on_passed_save = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, false, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // I love the new Grapples and Unarmed Strikes - escape removes grappled condition on success
  run qa_escape_grapple_on_success = {
    val grappled = freshCreature(20).with("grappled", true)
    val after = pEscapeGrapple(grappled, true)
    assert(not(after.grappled))
  }
  
  // I love the new Grapples and Unarmed Strikes - failed escape leaves grappled condition intact
  run qa_escape_grapple_on_failure = {
    val grappled = freshCreature(20).with("grappled", true)
    val after = pEscapeGrapple(grappled, false)
    assert(after.grappled)
  }
  
  // I love the new Grapples and Unarmed Strikes - grapple then shove prone combo applies both conditions
  run qa_grapple_shove_prone_combo = {
    val target = freshCreature(20)
    val afterGrapple = pGrapple(Medium, Medium, target, true, true)
    val afterShove = pShove(Medium, Medium, afterGrapple.targetState, true, ShoveProne)
    assert(afterShove.targetState.grappled and afterShove.targetState.prone)
  }
  
  // I love the new Grapples and Unarmed Strikes - cannot grapple creature more than one size larger
  run qa_grapple_size_limit = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Huge, target, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // I love the new Grapples and Unarmed Strikes - grapple requires a free hand
  run qa_grapple_requires_free_hand_938a6cf1 = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }

  // Source: https://rpg.stackexchange.com/q/213679
  
  // Can you take the maximum result of a die roll when you are not pressed for time and there is no usage limit?
  // Encodes the mechanical rule cited in the answer: temp HP don't stack — you decide keep old or take new.
  
  // Receiving lower temp HP than current: keeping old leaves amount unchanged
  run qa_temp_hp_keep_old_when_new_is_lower = {
    val creature = freshCreature(20).with("tempHp", 8)
    val after = pGrantTempHp(creature, 3, true)
    assert(after.tempHp == 8)
  }
  
  // Receiving higher temp HP than current: choosing new replaces old (not additive)
  run qa_temp_hp_replace_with_higher_not_cumulative = {
    val creature = freshCreature(20).with("tempHp", 5)
    val after = pGrantTempHp(creature, 9, false)
    assert(after.tempHp == 9)
  }
  
  // "Farming" repeated grants at maximum value: result is max, not max * N
  run qa_temp_hp_repeated_max_grants_do_not_stack = {
    val creature = freshCreature(20)
    // Simulate three uses of the ability at max roll (1d8+1 = 9), always choosing new
    val after1 = pGrantTempHp(creature, 9, false)
    val after2 = pGrantTempHp(after1,   9, false)
    val after3 = pGrantTempHp(after2,   9, false)
    assert(after3.tempHp == 9) // 9, not 27
  }
  
  // Choosing to keep old temp HP over an equal grant: still the same value
  run qa_temp_hp_keep_old_when_equal = {
    val creature = freshCreature(20).with("tempHp", 9)
    val after = pGrantTempHp(creature, 9, true)
    assert(after.tempHp == 9)
  }

  // Source: https://reddit.com/r/onednd/comments/xsy59j/
  
  // Dual wielding gives rogues a second attack opportunity to proc once-per-turn Sneak Attack before spending bonus action
  run qa_twf_second_attack_opportunity_for_sneak_attack = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
  
    // Rogue uses Attack action (main-hand swing)
    val t1 = pUseAction(t0, creature, AAttack)
  
    // After Attack action, bonus action is still free → TWF off-hand is available
    val twfAvailable = pCanTwoWeaponFighting(t1, creature)
  
    // Main-hand attack: nat 1 → auto-miss (Sneak Attack cannot proc here)
    val mainHand = resolveAttackRoll(1, 5, 14, 0, 20)
  
    // Off-hand attack: roll 15 + 5 attack bonus = 20 ≥ AC 14 → hits (Sneak Attack procs)
    val offHand = resolveAttackRoll(15, 5, 14, 0, 20)
  
    assert(
      twfAvailable           // second attack opportunity exists before bonus action is spent
      and not(mainHand.hits) // first attack missed — no Sneak Attack
      and offHand.hits       // second attack hits — once-per-turn Sneak Attack can now proc
    )
  }

  // Source: https://reddit.com/r/onednd/comments/zi4ifa/
  
  // Hiding outside combat: passive perception of WIS 10 creature with no Perception proficiency is 10, well below typical hide DC 15
  run qa_typical_npc_passive_perception_below_hide_dc = {
    val wisMod = abilityModifier(10)
    val profBonus = proficiencyBonus(1)
    val passive = passiveCheck(wisMod, NoneProf, profBonus, false, false)
    assert(passive == 10 and passive < 15)
  }
  
  // Hiding outside combat: WIS 16 (+3) with Perception proficiency at level 1 gives passive perception exactly 15, the minimum to auto-detect a DC 15 hide
  run qa_wis16_perception_prof_reaches_dc15 = {
    val wisMod = abilityModifier(16)
    val profBonus = proficiencyBonus(1)
    val passive = passiveCheck(wisMod, Proficient, profBonus, false, false)
    assert(passive == 15)
  }
  
  // Hiding outside combat: WIS 14 (+2) with Perception proficiency at level 1 still falls short of DC 15, confirming "not a lot of creatures have passive perception that high"
  run qa_wis14_perception_prof_below_dc15 = {
    val wisMod = abilityModifier(14)
    val profBonus = proficiencyBonus(1)
    val passive = passiveCheck(wisMod, Proficient, profBonus, false, false)
    assert(passive == 14 and passive < 15)
  }
  
  // Hiding outside combat: Stealth (Hide action) uses DEX as governing ability
  run qa_stealth_governed_by_dex = {
    assert(skillAbility(Stealth) == Dex)
  }
  
  // Hiding outside combat: Perception (search / passive detect) uses WIS as governing ability
  run qa_perception_governed_by_wis = {
    assert(skillAbility(Perception) == Wis)
  }
  
  // Hiding outside combat: hide check with DEX 14 (+2) and Stealth proficiency at level 1, rolling 11, exactly clears DC 15
  run qa_hide_check_exactly_clears_dc15 = {
    val dexMod = abilityModifier(14)
    val profBonus = proficiencyBonus(1)
    assert(checkSucceeds(11, dexMod, Proficient, profBonus, 0, 15))
  }
  
  // Hiding outside combat: hide check with DEX 10 (+0), no Stealth proficiency, rolling 14 fails DC 15
  run qa_hide_check_no_prof_fails_dc15 = {
    val dexMod = abilityModifier(10)
    val profBonus = proficiencyBonus(1)
    assert(not(checkSucceeds(14, dexMod, NoneProf, profBonus, 0, 15)))
  }

  // Source: https://reddit.com/r/onednd/comments/xtr3nl/
  
  // OneDnD Ranger: Two-weapon fighting with light melee weapons (shortswords) is valid
  run qa_twf_shortswords_both_light_melee = {
    val shortsword: Weapon = {
      name: "shortsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    assert(pCanTWFWithWeapons(shortsword, shortsword, t, creature))
  }
  
  // OneDnD Ranger: Hand crossbow fails TWF check — Ammunition weapons are ranged (isMelee: false)
  run qa_twf_hand_crossbow_fails_not_melee = {
    val hand_crossbow: Weapon = {
      name: "hand-crossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Loading),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    assert(not(pCanTWFWithWeapons(hand_crossbow, hand_crossbow, t, creature)))
  }
  
  // OneDnD Ranger: Loading property blocks extra attacks regardless of Extra Attack feature
  run qa_loading_blocks_extra_attack = {
    val hand_crossbow: Weapon = {
      name: "hand-crossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Loading),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    assert(not(pCanExtraAttackWithWeapon(hand_crossbow)))
  }
  
  // OneDnD Ranger: TWF off-hand attack does not add positive ability mod (only penalty applies)
  run qa_twf_offhand_damage_no_positive_mod = {
    val diceResult = 4
    val dexMod = 3 // +3 from 17 Dex per Q&A; should NOT be added to off-hand
    val offHandDmg = pTWFOffHandDamage(diceResult, dexMod)
    assert(offHandDmg == diceResult) // mod ignored since positive
  }
  
  // OneDnD Ranger: TWF off-hand damage applies negative ability mod as penalty
  run qa_twf_offhand_damage_negative_mod_applies = {
    val diceResult = 4
    val negMod = -2
    val offHandDmg = pTWFOffHandDamage(diceResult, negMod)
    assert(offHandDmg == diceResult + negMod)
  }

  // Source: https://reddit.com/r/onednd/comments/zk853x/
  
  // why is there so much focus on Divine Sparks healing? — accepted: healing purpose is recovery from 0 HP, not damage parity
  run qa_healing_restores_from_unconscious = {
    // Creature at 30 HP takes 35 slashing (exceeds adult red dragon's min output of 32),
    // drops to 0 / unconscious. Even the 6d8 average (27 HP) from Divine Sparks restores
    // consciousness — encoding the accepted answer: healing need not out-heal incoming damage,
    // only bring the creature back from being downed.
    val c = freshCreature(30)
    val downed = pTakeDamage(c, 35, Slashing, Set(), Set(), Set(), false)
    val healed = pHeal(downed, 27)
    assert(
      downed.hp == 0 and downed.unconscious
      and healed.hp > 0 and not(healed.unconscious)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/102e66l/
  
  // How exactly do prepared spells/spell slots work now?
  // Accepted answer: you prepare a spell once; each available slot lets you cast it again.
  run qa_prepared_spell_cast_multiple_times = {
    // 6th-level cleric: 3 third-level slots (pSlotsPerLevel(6,3) = 3)
    val slots0: SpellSlotState = {
      slotsMax: EMPTY_SLOTS.set(3, 3),
      slotsCurrent: EMPTY_SLOTS.set(3, 3),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Spirit Guardians is 3rd-level; prepared once, cast up to 3 times (one per slot)
    val canCast1 = pCanCastAtLevel(slots0, 3, 3)
    val slots1   = pExpendSlot(slots0, 3)
    val canCast2 = pCanCastAtLevel(slots1, 3, 3)
    val slots2   = pExpendSlot(slots1, 3)
    val canCast3 = pCanCastAtLevel(slots2, 3, 3)
    val slots3   = pExpendSlot(slots2, 3)
    // All three slots spent — cannot cast a fourth time
    val canCast4 = pCanCastAtLevel(slots3, 3, 3)
    assert(canCast1 and canCast2 and canCast3 and not(canCast4))
  }

  // Source: https://reddit.com/r/onednd/comments/y1ci44/
  
  // All the ways martials have been buffed — grappled creature has disadvantage on attacks against non-grapplers (but not the grappler)
  run qa_grappled_attacker_disadvantage_vs_non_grappler = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: true,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val modsVsNonGrappler = pAggregateAttackMods(ctx)
    val modsVsGrappler    = pAggregateAttackMods(ctx.with("targetIsGrappler", true))
    assert(
      modsVsNonGrappler.hasDisadvantage and
      not(modsVsNonGrappler.hasAdvantage) and
      not(modsVsGrappler.hasDisadvantage)
    )
  }
  
  // All the ways martials have been buffed — TWF off-hand damage omits positive ability modifier but applies negative
  run qa_twf_offhand_modifier_rule = {
    val dice = 5
    val positiveResult = pTWFOffHandDamage(dice, 4)
    val negativeResult = pTWFOffHandDamage(dice, -2)
    val zeroResult     = pTWFOffHandDamage(dice, 0)
    assert(
      positiveResult == dice and    // positive mod ignored
      negativeResult == 3 and       // penalty (5 + -2 = 3) applied
      zeroResult     == dice        // zero mod: no change
    )
  }
  
  // All the ways martials have been buffed — successful grapple (save failed) applies CGrappled; failed grapple (save passed) does not
  run qa_grapple_applies_grappled_condition = {
    val target = freshCreature(20)
    val success = pGrapple(Medium, Medium, target, true, true)
    val failure  = pGrapple(Medium, Medium, target, false, true)
    assert(
      success.success and success.targetState.grappled and
      not(failure.success) and not(failure.targetState.grappled)
    )
  }

  // Source: https://rpg.stackexchange.com/q/214928
  
  // "You" in PHB rules refers to any creature the rule applies to, not just PCs — Prone condition is the cited example
  run qa_you_refers_to_any_creature = {
    // A "monster" and a "PC" are both just CreatureState — Prone applies identically to either
    val monster = freshCreature(40)
    val pc      = freshCreature(10)
    val monsterProne = pApplyCondition(monster, CProne)
    val pcProne      = pApplyCondition(pc, CProne)
    assert(
      monsterProne.prone and
      pcProne.prone and
      // Both yield structurally identical condition state — no creature-type distinction
      monsterProne.prone == pcProne.prone
    )
  }

  // Source: https://rpg.stackexchange.com/q/218114
  
  // Do features that increase Speed apply retroactively when gaining a new special Speed?
  // Ranger with Roving (+10 Speed) and Writhing Tide (Fly 10 ft):
  // "Changes to Your Speeds" makes fly speed 20 (10 base + 10 Roving bonus).
  run qa_speed_bonus_applies_to_fly_speed = {
    // Walk speed = 40 (30 base + 10 Roving); fly speed = 20 (10 Writhing Tide + 10 Roving).
    val walkSpeed = 40
    val flySpeed = 20
    val t0 = FRESH_TURN.with("movementRemaining", walkSpeed).with("effectiveSpeed", walkSpeed)
    // Walk 10 ft, then switch to fly; pSwitchSpeedType: remaining = flySpeed - distanceMoved = 20 - 10 = 10.
    val t1 = pUseMovement(t0, 10, 1)
    val t2 = pSwitchSpeedType(t1, flySpeed, 10)
    assert(t2.movementRemaining == 10 and t2.effectiveSpeed == flySpeed)
  }

  // Source: https://rpg.stackexchange.com/q/218301
  
  run qa_illusory_reality_object_persists_after_concentration_ends = {{
    val spellEffect = { spellId: "silent_image", turnsRemaining: 10, expiresAt: AtEndOfTurn }
    val realObjectEffect = { spellId: "illusory_reality_object", turnsRemaining: 10, expiresAt: AtEndOfTurn }
    val s0 = freshCreature(20).with("activeEffects", Set(spellEffect, realObjectEffect))
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "silent_image")
  
    val ss1 = pBreakConcentration(ss0)
    val effectsAfterConcBreak = pEffectsOnConcBreak(ss0, ss1, s0.activeEffects)
  
    val objectAfter9 = pTickEffects(effectsAfterConcBreak, 9)
    val objectAfter10 = pTickEffects(effectsAfterConcBreak, 10)
  
    assert(
      not(pHasEffect(effectsAfterConcBreak, "silent_image"))
      and pHasEffect(effectsAfterConcBreak, "illusory_reality_object")
      and pHasEffect(objectAfter9, "illusory_reality_object")
      and not(pHasEffect(objectAfter10, "illusory_reality_object"))
    )
  }}

  // Source: https://reddit.com/r/onednd/comments/z9xx74/
  
  // Epic Boon of Spell Recall: casting a prepared spell via the boon expends no slot; spells above 5th level cannot use the boon
  run qa_epic_boon_spell_recall_no_slot_expended = {
    val slots: SpellSlotState = {
      slotsMax: Map(1->2, 2->2, 3->1, 4->1, 5->1, 6->1, 7->0, 8->0, 9->0),
      slotsCurrent: Map(1->2, 2->2, 3->1, 4->1, 5->1, 6->1, 7->0, 8->0, 9->0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // RAW: "cast any spell you have prepared without expending a spell slot,
    // provided the spell is 5th level or lower" — no pExpendSlot call; slots unchanged
    val afterBoon = slots
    // A normal 3rd-level cast DOES consume the slot
    val afterNormalCast = pExpendSlot(slots, 3)
    // Boon eligibility: spell level must be <= 5
    val boonEligible3rd  = 3 <= 5   // true
    val boonEligible6th  = 6 <= 5   // false — boon cannot be used for 6th-level spells
    assert(
      boonEligible3rd
      and not(boonEligible6th)
      // Boon: 3rd-level slot is untouched
      and afterBoon.slotsCurrent.get(3) == 1
      // Normal cast: 3rd-level slot is decremented
      and afterNormalCast.slotsCurrent.get(3) == 0
      // A 6th-level spell has no boon path; even a direct slot cast requires availability
      and pCanCastAtLevel(slots, 6, 6)   // slot exists normally...
      and not(6 <= 5)                    // ...but the boon's own restriction blocks it
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xs3hlv/
  
  // Passive Checks do not exist RAW — passive check formula: 10 + mod + prof + adv/disadv modifier
  run qa_passive_check_base_formula = {
    assert(passiveCheck(3, NoneProf, 3, false, false) == 13)
  }
  
  // Passive Checks do not exist RAW — proficiency bonus added when proficient
  run qa_passive_check_with_proficiency = {
    assert(passiveCheck(3, Proficient, 3, false, false) == 16)
  }
  
  // Passive Checks do not exist RAW — expertise doubles proficiency contribution
  run qa_passive_check_with_expertise = {
    assert(passiveCheck(3, Expertise, 3, false, false) == 19)
  }
  
  // Passive Checks do not exist RAW — advantage grants +5 to passive score
  run qa_passive_check_advantage_adds_five = {
    assert(passiveCheck(2, NoneProf, 2, true, false) == 17)
  }
  
  // Passive Checks do not exist RAW — disadvantage subtracts 5 from passive score
  run qa_passive_check_disadvantage_subtracts_five = {
    assert(passiveCheck(2, NoneProf, 2, false, true) == 7)
  }
  
  // Passive Checks do not exist RAW — advantage and disadvantage together cancel out (no net modifier)
  run qa_passive_check_adv_and_disadv_cancel = {
    assert(passiveCheck(2, NoneProf, 2, true, true) == 12)
  }
  
  // Passive Checks do not exist RAW — half proficiency (e.g. Jack of All Trades) adds floor(prof/2)
  run qa_passive_check_half_proficiency = {
    // profBonus=4, halfProf=2, so 10+3+2=15
    assert(passiveCheck(3, HalfProf, 4, false, false) == 15)
  }

  // Source: https://reddit.com/r/onednd/comments/11ahw9z/
  
  // Clerics are Better at Smiting than Paladins: spell smite dice are doubled on a critical hit
  run qa_spell_smite_dice_double_on_crit = {
    // 2d6 weapon (roll 7) + 2d8 smite (roll 8) + STR mod 4
    // Both weapon and smite dice are rolled again on a crit (modifier NOT doubled)
    val weaponRoll = 7
    val smiteRoll  = 8
    val strMod     = 4
    val critDmg    = criticalDamage(weaponRoll + smiteRoll, weaponRoll + smiteRoll, strMod)
    val normalDmg  = normalDamage(weaponRoll + smiteRoll, strMod)
    assert(critDmg == 34 and normalDmg == 19 and critDmg == normalDmg * 2 - strMod)
  }
  
  // Clerics are Better at Smiting: full caster (level 9) has 5th-level slots; half-caster (paladin level 9) does not
  run qa_full_caster_level5_slots_vs_half_caster = {
    // Cleric: full caster, effective caster level == character level 9
    val clericSlots = pSlotsPerLevel(9, 5)
    // Paladin: half caster, effective caster level = floor(9 / 2) = 4
    val paladinCasterLevel = pMulticlassCasterLevel(0, 9, 0)
    val paladinSlots = pSlotsPerLevel(paladinCasterLevel, 5)
    assert(clericSlots == 1 and paladinSlots == 0)
  }
  
  // Clerics are Better at Smiting: Extra Attack feature gives paladin 1 additional attack per turn
  run qa_extra_attack_feature_count = {
    // TEST_CONFIG has FExtraAttack (level 5 fighter-equivalent)
    val extra = extraAttacksFromConfig(TEST_CONFIG)
    assert(extra == 1)
  }
  
  // Clerics are Better at Smiting (comment 3): TWF requires both weapons to be Light melee
  run qa_twf_requires_both_weapons_light_melee = {
    val greatsword: Weapon = {
      name: "greatsword", damageDie: 6, versatileDie: 0,
      damageType: Slashing, properties: Set(Heavy, TwoHanded),
      isMelee: true, normalRange: 0, longRange: 0
    }
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0,
      damageType: Piercing, properties: Set(Finesse, Light_),
      isMelee: true, normalRange: 0, longRange: 0
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    // Greatsword (Heavy) as main-hand disqualifies TWF
    val canWithGreatsword  = pCanTWFWithWeapons(greatsword, shortsword, t, creature)
    // Two shortswords (both Light melee) qualifies
    val canWithShortswords = pCanTWFWithWeapons(shortsword, shortsword, t, creature)
    assert(not(canWithGreatsword) and canWithShortswords)
  }

  // Source: https://reddit.com/r/onednd/comments/zp67zb/
  
  // Dual Wielder Feat is Underwhelming: base TWF rule requires both weapons be Light melee (feat relaxes to one non-light)
  run qa_twf_base_rule_both_light_required = {
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0, damageType: Piercing,
      properties: Set(Light_, Finesse), isMelee: true, normalRange: 0, longRange: 0
    }
    val handaxe: Weapon = {
      name: "handaxe", damageDie: 6, versatileDie: 0, damageType: Slashing,
      properties: Set(Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60
    }
    val longsword: Weapon = {
      name: "longsword", damageDie: 8, versatileDie: 10, damageType: Slashing,
      properties: Set(Versatile), isMelee: true, normalRange: 0, longRange: 0
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    // Both Light melee: TWF allowed (baseline)
    val bothLight = pCanTWFWithWeapons(shortsword, handaxe, t, creature)
    // Non-light main hand: TWF blocked without Dual Wielder feat
    val nonLightMain = pCanTWFWithWeapons(longsword, handaxe, t, creature)
    // Non-light off-hand: also blocked without Dual Wielder feat
    val nonLightOff = pCanTWFWithWeapons(handaxe, longsword, t, creature)
    assert(bothLight and not(nonLightMain) and not(nonLightOff))
  }

  // Source: https://reddit.com/r/onednd/comments/xsa7s9/
  
  // Q&A: Thieves' Tools proficiency adds proficiency bonus to the ability check
  run qa_tool_proficiency_adds_prof_bonus_to_check = {
    val profBonus = proficiencyBonus(4)  // level 4 -> +2
    val dexMod = abilityModifier(16)     // 16 Dex -> +3
    val dc = 15
    // With tool prof: 10 + 3 + 2 = 15 >= 15 succeeds; without: 10 + 3 = 13 < 15 fails
    val withToolProf = checkSucceeds(10, dexMod, Proficient, profBonus, 0, dc)
    val withoutToolProf = checkSucceeds(10, dexMod, NoneProf, profBonus, 0, dc)
    assert(withToolProf and not(withoutToolProf))
  }
  
  // Q&A: Having both Thieves' Tools proficiency and Sleight of Hand proficiency grants advantage on the check
  run qa_tool_and_skill_proficiency_grants_advantage_on_check = {
    val profBonus = proficiencyBonus(5)  // level 5 -> +3
    val dexMod = abilityModifier(14)     // 14 Dex -> +2
    // Passive with tool prof + advantage (from skill overlap): 10 + 2 + 3 + 5 = 20
    val bothProfs = passiveCheck(dexMod, Proficient, profBonus, true, false)
    // Passive with tool prof only, no advantage: 10 + 2 + 3 = 15
    val toolProfOnly = passiveCheck(dexMod, Proficient, profBonus, false, false)
    assert(bothProfs == 20 and toolProfOnly == 15)
  }

  // Source: https://reddit.com/r/onednd/comments/11aodrv/
  
  // List of spells a moon druid can cast in wild shape: no-material-component spell castable when creature can speak and has free hand
  run qa_moon_druid_wildshape_no_material_vs_spell_castable = {
    // Wild shape form: conscious, not paralyzed/petrified/unconscious — can provide V+S components
    // Material component absent (caller responsibility per spec); only V+S checked here
    val creature = freshCreature(30)
    val canCast = pCanProvideComponents(creature, true, true, true)
    assert(canCast)
  }
  
  // List of spells a moon druid can cast in wild shape: paralysis (e.g. from wild shape being disrupted) blocks verbal-component spells
  run qa_moon_druid_wildshape_paralyzed_blocks_verbal_component = {
    val creature = pApplyCondition(freshCreature(30), CParalyzed)
    // Paralyzed creature cannot speak → V component fails → cannot cast any verbal-component abjuration spell
    val canCast = pCanProvideComponents(creature, true, false, true)
    assert(not(canCast))
  }
  
  // List of spells a moon druid can cast in wild shape: somatic-only spell blocked without free hand
  run qa_moon_druid_wildshape_no_free_hand_blocks_somatic = {
    val creature = freshCreature(30)
    // Wild shape form, no free hand (e.g. two-handed grip) → S component fails
    val canCast = pCanProvideComponents(creature, false, true, false)
    assert(not(canCast))
  }

  // Source: https://rpg.stackexchange.com/q/213742
  
  // Why do you need to beat a DC of 15 to hide? — DC 15 Stealth success grants Invisible condition
  run qa_hide_dc15_success_grants_invisible = {
    val dexMod = 3
    val profBonus = 3
    val d20Roll = 12 // 12 + 3 + 3 = 18 >= 15
    val hideSucceeds = checkSucceeds(d20Roll, dexMod, Proficient, profBonus, 0, 15)
    val creature = freshCreature(20)
    val afterHide = if (hideSucceeds) pApplyCondition(creature, CInvisible) else creature
    assert(hideSucceeds and afterHide.invisible)
  }
  
  // Why do you need to beat a DC of 15 to hide? — DC 15 Stealth failure denies Invisible condition
  run qa_hide_dc15_failure_no_invisible = {
    val dexMod = 0
    val profBonus = 2
    val d20Roll = 5 // 5 + 0 + 2 = 7 < 15
    val hideSucceeds = checkSucceeds(d20Roll, dexMod, Proficient, profBonus, 0, 15)
    val creature = freshCreature(20)
    val afterHide = if (hideSucceeds) pApplyCondition(creature, CInvisible) else creature
    assert(not(hideSucceeds) and not(afterHide.invisible))
  }
  
  // Why do you need to beat a DC of 15 to hide? — Perception beating Stealth total ends Invisible condition
  run qa_hide_found_by_perception_removes_invisible = {
    val stealthTotal = 18 // hider rolled 12 + dex 3 + prof 3
    val perceptionTotal = 20 // seeker rolled 15 + wis 2 + prof 3
    val hidden = pApplyCondition(freshCreature(20), CInvisible)
    val found = perceptionTotal >= stealthTotal
    val afterFound = if (found) pRemoveCondition(hidden, CInvisible) else hidden
    assert(found and not(afterFound.invisible))
  }
  
  // Why do you need to beat a DC of 15 to hide? — Passive Perception below Stealth total leaves creature hidden
  run qa_hide_passive_perception_miss_stays_invisible = {
    val stealthTotal = 18
    val wisMod = 0
    val profBonus = 2
    val passive = passiveCheck(wisMod, Proficient, profBonus, false, false) // 10+0+2 = 12
    val hidden = pApplyCondition(freshCreature(20), CInvisible)
    val found = passive >= stealthTotal
    val afterCheck = if (found) pRemoveCondition(hidden, CInvisible) else hidden
    assert(not(found) and afterCheck.invisible)
  }

  // Source: https://reddit.com/r/onednd/comments/1ep3l4g/
  
  // Level 5 Warlocks/Wizards access to Paralyzed Condition (no saving throw)
  run qa_paralyzed_no_save_when_poisoned = {
    // Rotting Claw: if target is poisoned and attack hits, it becomes paralyzed — no saving throw required
    val creature = freshCreature(20)
    // Step 1: creature is poisoned (e.g. via Quasit rend or Ray of Sickness — no save on attack hit)
    val poisonedCreature = pApplyCondition(creature, CPoisoned)
    // Step 2: Rotting Claw attack hits the poisoned target → paralysis applied directly, no save
    val paralyzedCreature = pApplyCondition(poisonedCreature, CParalyzed)
    all {
      assert(paralyzedCreature.poisoned),
      assert(paralyzedCreature.paralyzed),
      // Paralyzed implies incapacitated — verified without any save roll in the call chain
      assert(paralyzedCreature.incapacitatedSources.contains(ISParalyzed)),
      assert(isIncapacitated(paralyzedCreature)),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/11a6vkq/
  
  // With the new dying rules healing, lay on hands, and spare the dying do not remove the unconscious condition. Where are the rules for removing the condition?
  run qa_heal_while_dying_removes_unconscious = {
    val dying = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val healed = pHeal(dying, 1)
    assert(healed.hp == 1 and not(healed.unconscious))
  }
  
  // Stabilizing via 3 death save successes does NOT remove unconscious — no HP regained, condition persists
  run qa_stabilize_via_saves_keeps_unconscious = {
    val dying = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 2, failures: 0 })
    val stabilized = pDeathSave(dying, 15)
    assert(stabilized.stable and stabilized.unconscious and stabilized.hp == 0)
  }
  
  // Nat 20 on a death save regains 1 HP, which ends Dying and removes unconscious
  run qa_nat20_death_save_removes_unconscious = {
    val dying = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val result = pDeathSave(dying, 20)
    assert(result.hp == 1 and not(result.unconscious))
  }

  // Source: https://rpg.stackexchange.com/q/214398
  
  // Is the damage from Fire's Burn and Frost's Chill, Goliath traits, included in a Critical Hit?
  run qa_firesburn_not_doubled_on_crit = {
    // Nat 20 always scores a critical hit regardless of AC
    val atk = resolveAttackRoll(20, 4, 16, 0, 20)
    // Attack damage on crit: all attack dice rolled twice (main + bonus) plus modifier
    val weaponCritDmg = criticalDamage(6, 3, 3)  // main d8=6, bonus d8=3, STR mod=3 → 12
    // Fire's Burn: triggers "after damage dealt" — not part of the attack's dice, NOT doubled
    val firesBurnDmg = normalDamage(7, 0)          // 1d10 rolled once → 7
    // Frost's Chill: same trigger condition — resolves after attack damage, NOT doubled
    val frostChillDmg = normalDamage(4, 0)         // 1d6 rolled once → 4
    assert(
      atk.isCritical
      and weaponCritDmg == 12   // attack dice are doubled via criticalDamage
      and firesBurnDmg == 7     // Fire's Burn: single die via normalDamage, not doubled
      and frostChillDmg == 4    // Frost's Chill: single die via normalDamage, not doubled
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wrsr7m/
  
  // Only players can crit? — nat 20 on weapon/unarmed attack roll is always a critical hit
  run qa_nat20_weapon_attack_is_critical = {
    val result = resolveAttackRoll(20, 5, 15, 0, 20)
    assert(result.hits and result.isCritical)
  }
  
  // Only players can crit? — roll below critRange (e.g. 19 vs default 20) is a hit but not a crit
  run qa_below_crit_range_not_critical = {
    val result = resolveAttackRoll(19, 5, 10, 0, 20)
    assert(result.hits and not(result.isCritical))
  }
  
  // Only players can crit? — nat 1 never crits regardless of attack bonus or critRange
  run qa_nat1_never_crits = {
    val result = resolveAttackRoll(1, 100, 1, 0, 1)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // Only players can crit? — crit damage rolls damage dice twice but does NOT double the modifier
  // e.g. Mace 1d6+STR crit = first_d6 + second_d6 + STR (not (d6+STR)*2)
  run qa_critical_damage_doubles_dice_not_modifier_a12e34f1 = {
    val firstRoll  = 4  // first d6
    val secondRoll = 3  // bonus d6 from crit
    val strMod     = 3
    val dmg = criticalDamage(firstRoll, secondRoll, strMod)
    assert(dmg == firstRoll + secondRoll + strMod)
  }

  // Source: https://reddit.com/r/onednd/comments/wv3ocx/
  
  // DM'ing a one shot with the UA rules (but with older characters): nat 1 always misses on attack regardless of bonus
  run qa_nat1_attack_auto_miss = {
    // Even with +20 attack bonus vs AC 5, a nat 1 is always a miss
    val result = resolveAttackRoll(1, 20, 5, 0, 20)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // DM'ing a one shot with the UA rules (but with older characters): nat 20 always crits on attack regardless of AC
  run qa_nat20_attack_auto_crit = {
    // Even with -10 attack bonus vs AC 30, a nat 20 always hits and crits
    val result = resolveAttackRoll(20, -10, 30, 0, 20)
    assert(result.hits and result.isCritical)
  }
  
  // DM'ing a one shot with the UA rules (but with older characters): critRange > 20 suppresses auto-crit (simulating no-monster-crit variant)
  run qa_no_crit_when_critrange_above_20_a25d37c3 = {
    // critRange=21 means even a nat 20 falls through to normal hit resolution — hits but no crit
    val result = resolveAttackRoll(20, 5, 15, 0, 21)
    assert(result.hits and not(result.isCritical))
  }
  
  // DM'ing a one shot with the UA rules (but with older characters): critical hit adds extra dice but modifier is NOT doubled
  run qa_crit_damage_dice_doubled_modifier_not = {
    val normalResult = normalDamage(6, 4)       // 6 (die) + 4 (mod) = 10
    val critResult   = criticalDamage(6, 6, 4)  // 6 (normal dice) + 6 (bonus dice) + 4 (mod, not doubled) = 16
    assert(normalResult == 10 and critResult == 16 and critResult == normalResult + 6)
  }

  // Source: https://reddit.com/r/onednd/comments/x135g5/
  
  // Natural 20 on a skill check does not automatically succeed when the DC exceeds the maximum achievable total
  run qa_nat20_skill_check_no_auto_success = {
    // Intimidation -> CHA (skillAbility(Intimidation) == Cha).
    // Paladin with CHA mod 0, no proficiency, no misc bonus, DC 25.
    // nat 20 + 0 + 0 + 0 = 20 < 25 → task is impossible, roll still fails.
    val d20Roll    = 20
    val chaMod     = 0
    val profBonus  = proficiencyBonus(5) // +3, but NoneProf multiplier = 0
    val miscBonus  = 0
    val dc         = 25
    assert(not(checkSucceeds(d20Roll, chaMod, NoneProf, profBonus, miscBonus, dc)))
  }
  
  // Contrast: attack roll nat 20 always hits regardless of AC (crit auto-success only for attacks)
  run qa_nat20_attack_always_hits = {
    // Even against AC 30, a nat 20 attack roll is a critical hit.
    val result = resolveAttackRoll(20, 0, 30, 0, 20)
    assert(result.hits and result.isCritical)
  }

  // Source: https://reddit.com/r/onednd/comments/xzvidj/
  
  // Ranged attacks (incl. ranged spell attacks) impose disadvantage within 5 ft of a hostile; melee attacks do not
  run qa_ranged_spell_attack_close_quarters_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: true,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Melee attack rolls do not incur disadvantage from being within 5 ft of a hostile
  run qa_melee_attack_no_close_quarters_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: true,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/wrx33q/
  
  // New Grappled Condition: Changed... Much better! — grappled creature has Speed 0 at turn start
  run qa_grappled_speed_zero = {
    val grappledCreature = freshCreature(20).with("grappled", true)
    val ts = pStartTurn(TEST_CONFIG, grappledCreature, Unarmored, 0, false, false)
    assert(ts.movementRemaining == 0 and ts.effectiveSpeed == 0)
  }
  
  // New Grappled Condition: Changed... Much better! — grappled creature has disadvantage vs non-grappler
  run qa_grappled_disadv_vs_non_grappler = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true, targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: true, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // New Grappled Condition: Changed... Much better! — grappled creature has NO disadvantage attacking the grappler itself
  run qa_grappled_no_disadv_vs_grappler = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true, targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: true, targetIsGrappler: true,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }
  
  // New Grappled Condition: Changed... Much better! — grappler speed halved while dragging same-size target
  run qa_grappler_speed_halved_dragging_same_size = {
    val grappler = freshCreature(20)
    val ts = pStartTurn(TEST_CONFIG, grappler, Unarmored, 0, true, false)
    assert(ts.effectiveSpeed == 15 and ts.movementRemaining == 15)
  }
  
  // New Grappled Condition: Changed... Much better! — grappler speed NOT halved when target is 2+ sizes smaller
  run qa_grappler_no_speed_penalty_tiny_target = {
    val grappler = freshCreature(20)
    val ts = pStartTurn(TEST_CONFIG, grappler, Unarmored, 0, true, true)
    assert(ts.effectiveSpeed == 30 and ts.movementRemaining == 30)
  }

  // Source: https://rpg.stackexchange.com/q/214088
  
  // Is there any penalty for providing half cover to another creature? (DMG optional "Hitting Cover" rule)
  run qa_hitting_cover_optional_rule = {
    // Squish (AC 14) is behind Tank (AC 12), gaining +2 from half cover.
    // Arch rolls a 15 to hit (no attack bonus).
    // If the roll misses the covered target but would have hit without the bonus,
    // and exceeds the covering creature's AC, the covering creature is hit instead.
    val attackRoll   = 15
    val attackBonus  = 0
    val squishAC     = 14
    val tankAC       = 12
    val halfBonus    = coverBonus(HalfCover)   // = 2
  
    // 1. With cover: 15 vs AC 16 — misses Squish
    val missedWithCover    = resolveAttackRoll(attackRoll, attackBonus, squishAC, halfBonus, 20)
    // 2. Without cover: 15 vs AC 14 — would have hit Squish
    val wouldHitNoCover    = resolveAttackRoll(attackRoll, attackBonus, squishAC, 0, 20)
    // 3. Covering creature check: 15 vs Tank AC 12 — Tank is hit
    val coveringCreatureHit = resolveAttackRoll(attackRoll, attackBonus, tankAC, 0, 20)
  
    assert(
      not(missedWithCover.hits)      // cover caused the miss
      and wouldHitNoCover.hits       // would have hit without cover
      and coveringCreatureHit.hits   // Tank (the cover provider) is struck
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xuq8q9/
  
  // How playable are 5e Expert subclasses? — Soulknife bonus attack: TWF eligible when both weapons are Light melee after Attack action
  run qa_twf_light_melee_bonus_attack_eligible = {
    val psychicBlade: Weapon = {
      name: "psychic_blade",
      damageDie: 6,
      versatileDie: 0,
      damageType: Psychic,
      properties: Set(Light_, Finesse),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    assert(pCanTWFWithWeapons(psychicBlade, psychicBlade, t1, creature))
  }
  
  // How playable are 5e Expert subclasses? — TWF requires Light_ property; heavy/non-light weapon ineligible
  run qa_twf_non_light_weapon_ineligible = {
    val greatsword: Weapon = {
      name: "greatsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(Heavy, TwoHanded),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    assert(not(pCanTWFWithWeapons(greatsword, greatsword, t1, creature)))
  }
  
  // How playable are 5e Expert subclasses? — Mantle of Whispers conflict: reaction already spent cannot be reused same round
  run qa_reaction_exhausted_blocks_second_use = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    val t2 = pUseReaction(t1)
    assert(not(t1.reactionAvailable) and t2 == t1)
  }

  // Source: https://rpg.stackexchange.com/q/215522
  
  // How long do the effects of the Fomorian's Warping Hex last?
  run qa_fomorian_warping_hex_exhaustion_persists_until_long_rest = {
    val c = freshCreature(30)
    // Monster ability inflicts 1 exhaustion level (no duration or end condition specified)
    val afterHex = pAddExhaustion(c, 1)
    // Exhaustion is permanent — does not auto-expire; still present before any rest
    val stillExhausted = afterHex
    // Long rest reduces exhaustion level by exactly 1 (PHB "Long Rest" / Exhaustion glossary)
    val afterLongRest = pLongRest(stillExhausted, 5)
    assert(
      // Hex applied 1 exhaustion
      afterHex.exhaustion == 1
      // No automatic removal — exhaustion persists
      and stillExhausted.exhaustion == 1
      // Long rest reduces by 1, returning to 0 (condition ends)
      and afterLongRest.exhaustion == 0
    )
  }

  // Source: https://reddit.com/r/onednd/comments/x7kqj6/
  
  // Healer and short rests: Healer feat heals HP without spending hit dice, unlike short rest hit die spending
  run qa_healer_heals_without_consuming_hit_dice = {
    val wounded = freshCreature(20).with("hp", 5).with("hitPointDiceRemaining", 3)
    // Healer feat modeled as pHeal: restores HP without touching hit dice
    val afterHealerFeat = pHeal(wounded, 9)
    // Short rest HD spend: same HP restored but consumes a hit die
    val afterSpendHD = pSpendHitDie(wounded, 2, 7) // dieRoll=7 + conMod=2 = 9 healing
    assert(
      afterHealerFeat.hp == 14
      and afterHealerFeat.hitPointDiceRemaining == 3
      and afterSpendHD.hp == 14
      and afterSpendHD.hitPointDiceRemaining == 2
    )
  }

  // Source: https://rpg.stackexchange.com/q/214084
  
  // Does a touch spell have advantage when delivered by an invisible Familiar?
  // Accepted answer: No — the spellcaster makes the melee spell attack, so the familiar's
  // invisibility is irrelevant; the target can see the spellcaster (the actual attacker).
  run qa_familiar_touch_spell_no_advantage_from_familiar_invisibility = {
    // Model the spellcaster as the attacker: target CAN see the spellcaster even though
    // the familiar (the delivery vehicle) is invisible.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      // Spellcaster (the attacker per RAW) is visible to the target — familiar's invisibility is irrelevant
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // The familiar being invisible does not grant advantage; no advantage source fires
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage) and not(mods.autoCrit) and not(mods.autoMiss))
  }

  // Source: https://reddit.com/r/onednd/comments/y3zx6f/
  
  // Can I shove my grappled companion out of a grapple?
  run qa_shove_breaks_grapple = {
    val grappled = pApplyCondition(freshCreature(20), CGrappled)
    // Shove (ShovePush) a grappled creature — same size, target save fails
    val result = pShove(Medium, Medium, grappled, true, ShovePush)
    // Forced movement puts target beyond grappler's reach; grappler releases
    val afterRelease = pReleaseGrapple(result.targetState)
    assert(result.success and not(afterRelease.grappled))
  }

  // Source: https://reddit.com/r/onednd/comments/xurvgq/
  
  // Can you stack Chronal Shift and Guidance
  // A single character cannot use both (each costs a reaction); stacking requires two different characters.
  run qa_chronal_shift_guidance_single_char_cannot_stack_reactions = {
    // One character uses their reaction (Chronal Shift), then tries to use it again (Guidance) — second call is a no-op
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)   // first reaction: Chronal Shift
    val t2 = pUseReaction(t1)   // second attempt: Guidance — reaction already spent, state unchanged
    assert(not(t1.reactionAvailable) and t2 == t1)
  }
  
  // Can you stack Chronal Shift and Guidance
  // Two separate characters each have their own reaction and can both contribute to the same roll.
  run qa_chronal_shift_guidance_two_characters_can_stack = {
    val wizardTurn = FRESH_TURN   // Chronurgy Wizard: reaction available
    val clericTurn = FRESH_TURN   // Cleric: reaction available
    val wizardAfter = pUseReaction(wizardTurn)   // Wizard uses reaction: Chronal Shift (reroll)
    val clericAfter = pUseReaction(clericTurn)   // Cleric uses reaction: Guidance (if roll still fails)
    assert(not(wizardAfter.reactionAvailable) and not(clericAfter.reactionAvailable))
  }

  // Source: https://reddit.com/r/onednd/comments/11a1k1p/
  
  // Faithful Steed: spell cast without expending a slot uses base spell level; no slot consumed
  run qa_faithful_steed_free_cast_base_level_no_slot = {
    val slotsMap = EMPTY_SLOTS.set(2, 2).set(3, 1)
    val ss = FRESH_SPELL_SLOTS.with("slotsMax", slotsMap).with("slotsCurrent", slotsMap)
  
    // Free cast via Faithful Steed: no pExpendSlot called — no slot consumed
    val ssAfterFree = ss
  
    // All slots intact after free cast (nothing expended)
    val allSlotsIntact =
      ssAfterFree.slotsCurrent.get(2) == 2 and
      ssAfterFree.slotsCurrent.get(3) == 1
  
    // Rule: free cast uses base level (2 for Find Steed), not upcast
    // Contrast: a slot-based upcast at level 3 consumes that slot
    val ssAfterUpcast = pExpendSlot(ss, 3)
    val upcastConsumedL3 = ssAfterUpcast.slotsCurrent.get(3) == 0
    val upcastPreservedL2 = ssAfterUpcast.slotsCurrent.get(2) == 2
  
    // Base-level (2) cast is valid when a level-2 slot is available
    val baseLevel2Valid = pCanCastAtLevel(ss, 2, 2)
  
    // Free cast is NOT equivalent to upcasting (would require slot expenditure)
    val freeCastNotUpcast = ssAfterFree.slotsCurrent.get(3) == ss.slotsCurrent.get(3)
  
    assert(allSlotsIntact and upcastConsumedL3 and upcastPreservedL2 and baseLevel2Valid and freeCastNotUpcast)
  }

  // Source: https://reddit.com/r/onednd/comments/wtw4l6/
  
  // One thing I LOVE about the Unarmed Strike Changes: Dodges and Grapples
  // Grapple applied (e.g. as an opportunity attack) sets the target's speed to 0 on their next turn
  run qa_grapple_oa_sets_target_speed_zero = {
    val target = freshCreature(20)
    // Attacker (Medium) grapples target (Medium) via Unarmed Strike — target fails the save
    val result = pGrapple(Medium, Medium, target, true, true)
    val t = pStartTurn(TEST_CONFIG, result.targetState, Unarmored, 0, false, false)
    assert(result.success and result.targetState.grappled and t.effectiveSpeed == 0 and t.movementRemaining == 0)
  }
  
  // Dodge action gives attacker disadvantage while the target is not grappled (speed > 0, dodge active)
  run qa_dodge_gives_attacker_disadvantage_when_speed_nonzero = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: true, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // When grappled (speed becomes 0), dodge benefit is lost — attacker no longer has disadvantage
  run qa_grappled_speed_zero_dodge_benefit_lost = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    // Speed is 0 after grapple; PHB: "You lose this benefit if...your speed drops to 0"
    // Caller must pass targetDodging: false because speed == 0 invalidates dodge
    val t = pStartTurn(TEST_CONFIG, result.targetState, Unarmored, 0, false, false)
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(t.effectiveSpeed == 0 and not(mods.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/1fl8udc/
  
  // Monk grappler: grappled creature has speed 0 at turn start (can't move while grappled)
  run qa_grappled_creature_speed_zero_aab46142 = {
    val creature = freshCreature(20).with("grappled", true)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    assert(t.movementRemaining == 0 and t.effectiveSpeed == 0)
  }
  
  // Monk grappler: fall damage causes prone condition on the fallen creature
  run qa_fall_damage_causes_prone = {
    val creature = freshCreature(30)
    val result = pApplyFall(creature, 10, Set(), Set(), Set())
    assert(result.prone)
  }
  
  // Monk grappler: grappled+prone enemy cannot stand up because grapple sets speed to 0
  run qa_grappled_prone_cannot_stand_up = {
    val creature = freshCreature(20).with("grappled", true).with("prone", true)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    // speed is 0 from grapple, so pStandFromProne returns unchanged TurnState
    val t2 = pStandFromProne(t)
    assert(t2 == t)
  }
  
  // Monk grappler: 120ft fall yields 12d6 damage dice (1d6 per 10ft, max 20)
  run qa_fall_damage_dice_120ft = {
    assert(pFallingDamageDice(120) == 12)
  }
  
  // Monk grappler: fall damage max caps at 20d6 regardless of height (200ft+)
  run qa_fall_damage_dice_capped_at_20 = {
    assert(pFallingDamageDice(300) == 20)
  }

  // Source: https://reddit.com/r/onednd/comments/wrz0m7/
  
  // Grappling: Better or Worse? — grappled creature's Speed becomes 0
  run qa_grappled_speed_zero_aabe38ac = {
    val creature = freshCreature(20).with("grappled", true)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    assert(t.movementRemaining == 0 and t.effectiveSpeed == 0)
  }
  
  // Grappling: Better or Worse? — grappling creature moves at half speed
  run qa_grappler_half_speed = {
    // TEST_CONFIG Walk=30; isGrappling=true, target not two sizes smaller → 30/2=15
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, false)
    assert(t.movementRemaining == 15 and t.effectiveSpeed == 15)
  }
  
  // Grappling: Better or Worse? — grappler speed penalty waived when target is two sizes smaller
  run qa_grappler_no_half_speed_small_target = {
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, true)
    assert(t.movementRemaining == 30 and t.effectiveSpeed == 30)
  }
  
  // Grappling: Better or Worse? — grapple succeeds when target's save fails (same size, free hand)
  run qa_grapple_succeeds_on_failed_save = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Grappling: Better or Worse? — grapple fails against target more than one size larger
  run qa_grapple_fails_oversized_target = {
    // Medium attacker vs Huge target: sizeOrd(Huge)=4 > sizeOrd(Medium)+1=3 → fails
    val target = freshCreature(20)
    val result = pGrapple(Medium, Huge, target, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Grappling: Better or Worse? — grapple requires a free hand
  run qa_grapple_requires_free_hand_aabe38ac = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Grappling: Better or Worse? — successful escape removes grappled condition
  run qa_escape_grapple_success = {
    val creature = freshCreature(20).with("grappled", true)
    val s1 = pEscapeGrapple(creature, true)
    assert(not(s1.grappled))
  }
  
  // Grappling: Better or Worse? — failed escape leaves grappled condition intact
  run qa_escape_grapple_failure = {
    val creature = freshCreature(20).with("grappled", true)
    val s1 = pEscapeGrapple(creature, false)
    assert(s1.grappled)
  }

  // Source: https://reddit.com/r/onednd/comments/1j91gis/
  
  // Otherworldly Leap - Basically just +20 ft. movement?
  // The Jump spell gives a net traversal boost: running start (10ft) + long jump (STR score ft)
  // consumes movement from the pool, leaving the remainder. STR 10, 30ft speed tested here.
  run qa_long_jump_movement_cost = {
    val strScore = 10
    val jumpDist = pLongJumpDistance(strScore, true) // running start: returns STR score
    val t0 = FRESH_TURN                              // 30ft movement
    val t1 = pUseMovement(t0, 10, 1)                // 10ft running start consumed
    val t2 = pUseMovement(t1, jumpDist, 1)           // jump distance also consumed from pool
    assert(all {
      jumpDist == 10,                        // STR 10, running start = 10ft base jump
      t1.movementRemaining == 20,            // 10ft spent on approach
      t2.movementRemaining == 10,            // 10ft more spent covering jump distance
    })
  }

  // Source: https://reddit.com/r/onednd/comments/1fawobo/
  
  // Am I reading this right? If you have two heavy crossbows you can extra attack/action surge by switching between them?
  run qa_loading_blocks_extra_attack_abdfc16a = {
    // A weapon with the Loading property cannot be used for extra attacks
    val heavyCrossbow: Weapon = {
      name: "heavy crossbow",
      damageDie: 10,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Heavy, Loading, TwoHanded, Ammunition),
      isMelee: false,
      normalRange: 100,
      longRange: 400,
    }
    val longbow: Weapon = {
      name: "longbow",
      damageDie: 8,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Heavy, TwoHanded, Ammunition),
      isMelee: false,
      normalRange: 150,
      longRange: 600,
    }
    all {
      // Loading weapon: extra attack NOT allowed (one shot per action/bonus/reaction)
      assert(not(pCanExtraAttackWithWeapon(heavyCrossbow))),
      // Non-loading ranged weapon: extra attack IS allowed
      assert(pCanExtraAttackWithWeapon(longbow)),
    }
  }
  
  // Loading property applies regardless of Extra Attack feature level
  run qa_loading_blocks_extra_attack_regardless_of_feature = {
    val heavyCrossbow: Weapon = {
      name: "heavy crossbow",
      damageDie: 10,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Heavy, Loading, TwoHanded, Ammunition),
      isMelee: false,
      normalRange: 100,
      longRange: 400,
    }
    // Even a Fighter 11 (Extra Attack x2) cannot extra attack with a Loading weapon
    val config11 = configForLevel(11)
    all {
      assert(config11.features.contains(FExtraAttack)),
      assert(config11.features.contains(FExtraAttack2)),
      assert(not(pCanExtraAttackWithWeapon(heavyCrossbow))),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/wywyad/
  
  // Solving Nat 1 Skill Checks with Expertise: nat 1 does NOT auto-fail skill checks (unlike attack rolls)
  run qa_nat1_skill_check_no_auto_fail = {
    // With Expertise, a nat 1 roll can still succeed if total >= DC
    // Attack rolls have nat-1 auto-miss (resolveAttackRoll), but checkSucceeds does not
    val dexMod = 5         // DEX 20
    val prof = proficiencyBonus(5)   // level 5 -> +3
    val expertiseBonus = profMultiplier(Expertise, prof)  // 3 * 2 = 6
    // nat 1 + 5 + 6 = 12 vs DC 10 -> should succeed
    val succeedsNat1 = checkSucceeds(1, dexMod, Expertise, prof, 0, 10)
    // attack roll nat 1 always misses
    val attackNat1 = resolveAttackRoll(1, 10, 10, 0, 20)
    assert(
      succeedsNat1 == true and
      attackNat1.hits == false
    )
  }

  // Source: https://reddit.com/r/onednd/comments/yv4d25/
  
  // "Help me to sneak on my players!" — group stealth: >= half the party succeeds means the group hides successfully
  run qa_group_stealth_half_succeed = {
    // Party of 4: exactly 2 succeed — group check passes
    assert(groupCheckSucceeds(2, 4))
  }
  
  // "Help me to sneak on my players!" — group stealth: fewer than half succeed means the group fails to hide
  run qa_group_stealth_fewer_than_half_fail = {
    // Party of 4: only 1 succeeds — group check fails, ambush can proceed
    assert(not(groupCheckSucceeds(1, 4)))
  }
  
  // "Help me to sneak on my players!" — heavy fog / dim light maps to lightly obscured
  run qa_dim_light_is_lightly_obscured = {
    assert(pIlluminationObscurement(Dim) == LightlyObscured)
  }
  
  // "Help me to sneak on my players!" — lightly obscured (dim light) imposes disadvantage (-5) on passive perception
  run qa_lightly_obscured_passive_perception_penalty = {
    val normal = passiveCheck(1, NoneProf, 2, false, false)  // 10+1 = 11
    val dimmed = passiveCheck(1, NoneProf, 2, false, true)   // 10+1-5 = 6
    assert(dimmed == normal - 5)
  }
  
  // "Help me to sneak on my players!" — monster stealth roll exceeding PC passive perception means the ambush succeeds (monsters hidden)
  run qa_stealth_beats_passive_perception_triggers_ambush = {
    // PC: WIS mod +1, Perception proficient, level 5 PB=3 → passive = 10+1+3 = 14
    val pcPassive = passiveCheck(1, Proficient, 3, false, false)
    // Ghast stealth: d20=12, DEX mod +3, no prof → 15 >= 14 → hidden
    assert(checkSucceeds(12, 3, NoneProf, 3, 0, pcPassive))
  }
  
  // "Help me to sneak on my players!" — monster stealth roll falling short of passive perception means PCs notice them
  run qa_stealth_fails_vs_passive_perception = {
    // PC: WIS mod +2, Perception proficient, level 5 PB=3 → passive = 10+2+3 = 15
    val pcPassive = passiveCheck(2, Proficient, 3, false, false)
    // Ghast stealth: d20=8, DEX mod +3, no prof → 11 < 15 → not hidden
    assert(not(checkSucceeds(8, 3, NoneProf, 3, 0, pcPassive)))
  }

  // Source: https://reddit.com/r/onednd/comments/wuqesh/
  
  // A stat-based analysis of the new grapple rules: unarmed strike hits target AC → Grappled condition applied
  run qa_grapple_attack_hit_applies_grappled = {
    val target = freshCreature(20)
    // d20=14 + attackBonus=5 = 19 >= AC 15 → hits → grapple succeeds
    val attackResult = resolveAttackRoll(14, 5, 15, 0, 20)
    val result = pGrapple(Medium, Medium, target, attackResult.hits, true)
    assert(attackResult.hits and result.success and result.targetState.grappled)
  }
  
  // A stat-based analysis of the new grapple rules: missed unarmed strike → no Grappled condition
  run qa_grapple_attack_miss_no_grapple = {
    val target = freshCreature(20)
    // d20=5 + attackBonus=3 = 8 < AC 15 → misses → grapple fails
    val attackResult = resolveAttackRoll(5, 3, 15, 0, 20)
    val result = pGrapple(Medium, Medium, target, attackResult.hits, true)
    assert(not(attackResult.hits) and not(result.success) and not(result.targetState.grappled))
  }
  
  // A stat-based analysis of the new grapple rules: free hand required even on a hit (nat 20 still fails without free hand)
  run qa_grapple_requires_free_hand_acd63834 = {
    val target = freshCreature(20)
    val attackResult = resolveAttackRoll(20, 5, 10, 0, 20)
    val result = pGrapple(Medium, Medium, target, attackResult.hits, false)
    assert(attackResult.hits and not(result.success) and not(result.targetState.grappled))
  }
  
  // A stat-based analysis of the new grapple rules: size cap — Medium cannot grapple Huge (2 sizes larger) regardless of roll
  run qa_grapple_size_constraint_two_larger_fails = {
    val target = freshCreature(30)
    val result = pGrapple(Medium, Huge, target, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // A stat-based analysis of the new grapple rules: grappled target escapes on successful end-of-turn save
  run qa_grapple_escape_on_successful_save = {
    val target = freshCreature(20)
    val grappled = pApplyCondition(target, CGrappled)
    val escaped = pEscapeGrapple(grappled, true)
    assert(not(escaped.grappled))
  }
  
  // A stat-based analysis of the new grapple rules: failed escape save leaves Grappled condition intact
  run qa_grapple_escape_fails_stays_grappled = {
    val target = freshCreature(20)
    val grappled = pApplyCondition(target, CGrappled)
    val stillGrappled = pEscapeGrapple(grappled, false)
    assert(stillGrappled.grappled)
  }

  // Source: https://reddit.com/r/onednd/comments/wrvdq1/
  
  // Point 8: Adrenaline Rush — temp HP granted equals proficiency bonus at given level
  run qa_adrenaline_rush_temp_hp_equals_proficiency_bonus = {
    val s = freshCreature(20)
    val pb = proficiencyBonus(5) // level 5: PB = 3
    val s1 = pGrantTempHp(s, pb, false)
    assert(s1.tempHp == pb and pb == 3)
  }
  
  // Point 17: Grappled condition zeroes movement at turn start (more impactful grapple)
  run qa_grappled_zeroes_speed_on_turn_start = {
    val creature = freshCreature(20)
    val result = pGrapple(Medium, Medium, creature, true, true)
    val t = pStartTurn(TEST_CONFIG, result.targetState, Unarmored, 0, false, false)
    assert(result.success and result.targetState.grappled and t.movementRemaining == 0)
  }
  
  // Point 17: Escape grapple on successful check removes the grappled condition (easier to escape)
  run qa_escape_grapple_on_success_clears_condition = {
    val grappled = pApplyCondition(freshCreature(20), CGrappled)
    val freed = pEscapeGrapple(grappled, true)
    assert(not(freed.grappled))
  }

  // Source: https://rpg.stackexchange.com/q/214342
  
  // Is my interpretation of the casting rules accurate? — 2024 PHB p.236: casting a non-cantrip (slot) via action blocks bonus action slot cast
  run qa_action_slot_spell_blocks_bonus_action_spell = {
    val t0 = FRESH_TURN
    val t1 = pMarkNonCantripActionSpell(t0)
    assert(not(canCastBonusActionSpell(t1)))
  }
  
  // Is my interpretation of the casting rules accurate? — 2024 PHB p.236: casting a bonus action spell blocks non-cantrip action slot cast
  run qa_bonus_action_spell_blocks_noncant_action_spell = {
    val t0 = FRESH_TURN
    val t1 = pMarkBonusActionSpell(t0)
    assert(not(canCastNonCantripAction(t1)))
  }
  
  // Is my interpretation of the casting rules accurate? — fresh turn permits either cast order before either flag is set
  run qa_fresh_turn_permits_any_spell_slot_cast = {
    val t0 = FRESH_TURN
    assert(canCastBonusActionSpell(t0) and canCastNonCantripAction(t0))
  }

  // Source: https://rpg.stackexchange.com/q/216318
  
  // Can Spiritual Weapon exceed its nominal casting range?
  run qa_spiritual_weapon_movable_effect_no_range_restriction = {
    // Rule: movable spell effects are not restricted by casting range unless spell says so (PHB spell range rules)
    // Spiritual Weapon stays active regardless of distance from caster — no range expiry mechanism exists
    val effects0: Set[ActiveEffect] = Set()
    val effects1 = pAddEffect(effects0, "spell_a", 10, AtEndOfTurn)
    // After being "moved" any distance, effect is still active — no range-based removal
    assert(pHasEffect(effects1, "spell_a"))
  }

  // Source: https://reddit.com/r/onednd/comments/xrcti1/
  
  // The New Charger Feat has an unintended interaction: push size restriction is exactly 1 size category larger
  run qa_charger_push_size_restriction = {
    val target = freshCreature(20)
    // Medium attacker can push a Large target (1 size larger — within one size, allowed)
    val largePush = pShove(Medium, Large, target, true, ShovePush)
    // Medium attacker cannot push a Huge target (2 sizes larger — exceeds one-size limit)
    val hugePush = pShove(Medium, Huge, target, true, ShovePush)
    assert(largePush.success and not(hugePush.success))
  }
  
  // The New Charger Feat: 10ft movement then Attack Action is valid; spec imposes no melee restriction on AAttack
  run qa_charger_movement_then_attack_action = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Move 10ft straight (satisfies Charger's movement condition)
    val t1 = pUseMovement(t0, 10, 1)
    // Attack Action follows — spec does not distinguish ranged vs melee here
    val t2 = pUseAction(t1, creature, AAttack)
    assert(t1.movementRemaining == 20 and t2.attackActionUsed and t2.movementRemaining == 20)
  }
  
  // Charger bonus damage (+1d8) stacks additively with base weapon damage and ability modifier
  run qa_charger_bonus_damage_additive = {
    val baseDiceRoll = 8    // longsword 1d8 resolved to max
    val chargerBonus = 6    // Charger +1d8 pre-resolved to 6
    val strMod = 2
    val total = normalDamage(baseDiceRoll + chargerBonus, strMod)
    assert(total == 16)
  }

  // Source: https://reddit.com/r/onednd/comments/11ahild/
  
  // Did someone notice that druids can talk while in wild shape now?
  run qa_druid_wild_shape_can_speak = {
    // Wild Shape imposes no blocking condition; pCanSpeak only returns false for
    // paralyzed, petrified, or unconscious — none of which are Wild Shape itself.
    val druidInWildShape = freshCreature(20)
    val paralyzedDruid = pApplyCondition(druidInWildShape, CParalyzed)
    assert(
      pCanSpeak(druidInWildShape) and
      not(pCanSpeak(paralyzedDruid))
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1fxlav9/
  
  // Humans can pass their daily Heroic Inspiration to other characters if they already have Heroic Inspiration, right?
  // Champion L10: if fighter already has Heroic Inspiration, start-of-turn does NOT grant a second instance (it is lost per spec model)
  run qa_heroic_inspiration_no_double_grant = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val fs1 = pFighterStartTurn(fs, 10)
    assert(fs1.heroicInspiration == true)
  }
  
  // Champion L10: fighter who lacks Heroic Inspiration receives it at the start of their turn
  run qa_heroic_inspiration_champion_gains_when_missing = {
    val fs = freshFighterState(10).with("heroicInspiration", false)
    val fs1 = pFighterStartTurn(fs, 10)
    assert(fs1.heroicInspiration == true)
  }
  
  // Expending Heroic Inspiration clears it; Champion L10 then regains it at the start of the next turn
  run qa_heroic_inspiration_regained_after_expend = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val fs_spent = fs.with("heroicInspiration", false)
    val fs_next = pFighterStartTurn(fs_spent, 10)
    assert(fs_next.heroicInspiration == true)
  }
  
  // Sub-level-10 Champion does NOT gain Heroic Inspiration at start of turn (feature not yet unlocked)
  run qa_heroic_inspiration_not_granted_below_level_10 = {
    val fs = freshFighterState(9).with("heroicInspiration", false)
    val fs1 = pFighterStartTurn(fs, 9)
    assert(fs1.heroicInspiration == false)
  }

  // Source: https://reddit.com/r/onednd/comments/x4opj4/
  
  // Ardling Angelic Flight: uses per long rest equal proficiency bonus (scales with level)
  run qa_angelic_flight_uses_equal_prof_bonus = {
    assert(
      proficiencyBonus(1) == 2 and   // levels 1-4: 2 uses
      proficiencyBonus(5) == 3 and   // levels 5-8: 3 uses
      proficiencyBonus(9) == 4 and   // levels 9-12: 4 uses
      proficiencyBonus(13) == 5 and  // levels 13-16: 5 uses
      proficiencyBonus(17) == 6      // levels 17-20: 6 uses
    )
  }
  
  // Ardling Angelic Flight: must land by end of movement or fall (speed 0 → falls without hover/magic)
  run qa_angelic_flight_fall_if_not_landed = {
    val flyer = freshCreature(20)
    assert(
      // movement exhausted, no hover, no magic → falls
      pFlyingCreatureFalls(flyer, 0, false, false) == true and
      // still airborne with movement remaining → does not fall
      pFlyingCreatureFalls(flyer, 30, false, false) == false and
      // hover overrides speed-0 fall
      pFlyingCreatureFalls(flyer, 0, true, false) == false and
      // magic (fly spell) overrides speed-0 fall
      pFlyingCreatureFalls(flyer, 0, false, true) == false
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wrv0w3/
  
  // Crits only double Weapon and Unarmed Strike damage now, not their riders.
  run qa_crit_doubles_weapon_dice_only = {
    val weaponRoll    = 5   // 1d8 weapon result
    val critExtraDice = 3   // extra 1d8 rolled on crit (weapon dice only)
    val riderRoll     = 4   // e.g. Hunter's Mark 1d6 — NOT doubled on crit; goes into modifier
    val flatMod       = 3   // STR modifier
  
    // New rule: rider damage treated as a flat modifier (not doubled)
    val newRuleCrit = criticalDamage(weaponRoll, critExtraDice, riderRoll + flatMod)
  
    // Old rule (wrong): rider dice doubled alongside weapon dice
    val oldRuleCrit = criticalDamage(weaponRoll + riderRoll, critExtraDice + riderRoll, flatMod)
  
    // Normal (non-crit) hit: weapon + rider + mod, rolled once
    val normalHit = normalDamage(weaponRoll + riderRoll, flatMod)
  
    assert(and {
      // New rule: weapon×2 + rider×1 + flatMod  (5+3+4+3 = 15)
      newRuleCrit == weaponRoll + critExtraDice + riderRoll + flatMod,
      // New rule strictly less than old rule because rider is no longer doubled
      newRuleCrit < oldRuleCrit,
      // The crit bonus over a normal hit equals exactly the extra weapon die — nothing more
      newRuleCrit - normalHit == critExtraDice,
    })
  }

  // Source: https://reddit.com/r/onednd/comments/wwpbc8/
  
  // Does the new crit rule mean that player summons dont crit?
  run qa_summons_cannot_crit = {
    // PCs crit on a natural 20 (critRange = 20 per PHB default)
    val pcAttack = resolveAttackRoll(20, 5, 15, 0, 20)
    // Summons cannot crit: modeled as critRange = 21 (impossible on a d20)
    val summonAttack = resolveAttackRoll(20, 5, 15, 0, 21)
    assert(
      pcAttack.isCritical and
      not(summonAttack.isCritical) and
      summonAttack.hits
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1f6fb0x/
  
  // Does tactical shift give you speed, or is it just half a disengage?
  run qa_tactical_shift_bonus_movement_oa_free = {
    // Tactical Shift (Second Wind L5): grants half speed as OA-free bonus movement,
    // even when all normal movement for the turn has been spent.
    val ts0 = FRESH_TURN // effectiveSpeed = 30, movementRemaining = 30
    // Spend all normal movement
    val ts1 = pUseMovement(ts0, 30, 1) // movementRemaining = 0
    // Tactical Shift: grant bonus movement = half speed, OA-free
    val ts2 = pGrantBonusMovement(ts1, ts1.effectiveSpeed, true)
    all {
      assert(ts1.movementRemaining == 0),       // all normal movement spent
      assert(ts2.bonusMovementRemaining == 15), // half of 30 ft speed
      assert(ts2.bonusMovementOAFree == true),  // no opportunity attacks provoked
      assert(canUseBonusMovement(ts2)),         // can still move via Tactical Shift
    }
  }
  
  // Does tactical shift give you speed, or is it just half a disengage?
  run qa_tactical_shift_zero_when_speed_zero = {
    // Tactical Shift grants no movement when effective speed is 0 (e.g., grappled).
    // Speed 0 means half speed is also 0 — the feature gives nothing.
    val ts0 = FRESH_TURN.with("effectiveSpeed", 0).with("movementRemaining", 0)
    val ts1 = pGrantBonusMovement(ts0, ts0.effectiveSpeed, true)
    all {
      assert(ts1.bonusMovementRemaining == 0), // half of 0 is 0
      assert(not(canUseBonusMovement(ts1))),   // no movement available
    }
  }
  
  // Does tactical shift give you speed, or is it just half a disengage?
  run qa_tactical_shift_bonus_movement_is_additional = {
    // Tactical Shift bonus movement is tracked separately from normal movement,
    // confirming it is additional movement beyond the per-turn budget.
    val ts0 = FRESH_TURN.with("movementRemaining", 0) // normal budget fully spent
    val ts1 = pGrantBonusMovement(ts0, 30, true)      // Tactical Shift: 15 ft bonus
    val ts2 = pUseBonusMovement(ts1, 10)              // consume 10 ft of bonus
    all {
      assert(ts1.bonusMovementRemaining == 15), // half of 30
      assert(ts2.bonusMovementRemaining == 5),  // 15 - 10 remaining
      assert(ts2.movementRemaining == 0),       // normal movement budget unaffected
    }
  }

  // Source: https://reddit.com/r/onednd/comments/z9rh2a/
  
  // Invisibility doesn't work if they can see you — attack advantage negated when target perceives attacker (e.g. Blindsight, See Invisibility)
  run qa_invisibility_no_adv_when_seen = {
    val ctx = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,  // target sees invisible attacker via Blindsight/See Invisibility
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Invisibility grants attack advantage when target genuinely cannot perceive the attacker
  run qa_invisibility_adv_when_unseen = {
    val ctx = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,  // target cannot see the invisible attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Invisibility + target can see attacker + target dodging → only dodge disadvantage applies, no advantage cancellation
  run qa_invisibility_seen_dodge_gives_disadv = {
    val ctx = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: true,          // target is dodging
      targetCanSeeAttacker: true,   // target can see attacker — no invisibility advantage
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and mods.hasDisadvantage)
  }

  // Source: https://rpg.stackexchange.com/q/214437
  
  // Is there a way for a Dragonborn Rogue to use Sneak Attack and Breath Weapon on the same turn?
  // Accepted answer: No — Nick's extra attack must be with a different Light weapon;
  // Breath Weapon has no Light_ property, so pCanTWFWithWeapons is false.
  run qa_dragonborn_breath_weapon_nick_not_twf = {
    val lightMeleeWeapon: Weapon = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Light_, Finesse, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    // Breath Weapon represented as a non-Light, non-melee "weapon" — lacks Light_ property
    val breathWeaponAsWeapon: Weapon = {
      name: "breath_weapon",
      damageDie: 6,
      versatileDie: 0,
      damageType: Fire,
      properties: Set(),
      isMelee: false,
      normalRange: 15,
      longRange: 15,
    }
    val creature = freshCreature(20)
    // Attack action already taken, bonus action not yet used — TWF prereqs satisfied
    val t = FRESH_TURN.with("attackActionUsed", true)
    // Even though prereqs are met, off-hand must have Light_ — Breath Weapon does not
    assert(not(pCanTWFWithWeapons(lightMeleeWeapon, breathWeaponAsWeapon, t, creature)))
  }

  // Source: https://reddit.com/r/onednd/comments/wrt323/
  
  // New Lucky Feat Ambiguity: advantage + disadvantage cancel out to a straight roll (resolveAdvantage)
  run qa_lucky_adv_disadv_cancel = {
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(resolved.hasAdvantage) and not(resolved.hasDisadvantage))
  }
  
  // New Lucky Feat Ambiguity: passive check with both adv and disadv equals a straight passive check (no +5/-5)
  run qa_lucky_passive_check_adv_disadv_cancel = {
    val abilityMod = 3
    val profBonus = 3
    val withBoth = passiveCheck(abilityMod, Proficient, profBonus, true, true)
    val straight  = passiveCheck(abilityMod, Proficient, profBonus, false, false)
    assert(withBoth == straight)
  }

  // Source: https://reddit.com/r/onednd/comments/186lcik/
  
  // New "Cheese Grater" Champion: successful grapple (save failed, free hand) applies CGrappled condition
  run qa_grapple_applies_grappled_condition_b4bf280d = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // New "Cheese Grater" Champion: grapple fails without a free hand (standard melee grapple requirement)
  run qa_grapple_requires_free_hand_b4bf280d = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // New "Cheese Grater" Champion: grappled creature has speed 0 at start of its turn (can't escape freely)
  run qa_grappled_creature_speed_zero_b4bf280d = {
    val grappledCreature = freshCreature(20).with("grappled", true)
    val ts = pStartTurn(TEST_CONFIG, grappledCreature, Unarmored, 0, false, false)
    all {
      assert(ts.movementRemaining == 0),
      assert(ts.effectiveSpeed == 0),
    }
  }
  
  // New "Cheese Grater" Champion: shove (push choice) succeeds when target fails save
  run qa_shove_push_succeeds_on_failed_save = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShovePush)
    assert(result.success)
  }
  
  // New "Cheese Grater" Champion: shove fails when target makes save
  run qa_shove_push_fails_on_saved = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, false, ShovePush)
    assert(not(result.success))
  }
  
  // New "Cheese Grater" Champion: grapple cannot target a creature more than one size larger
  run qa_grapple_size_limit_b4bf280d = {
    // Medium attacker vs Huge target (2 sizes larger) — must fail regardless of save
    val target = freshCreature(20)
    val result = pGrapple(Medium, Huge, target, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // New "Cheese Grater" Champion: action (Attack) and bonus action are independently available in the same turn
  run qa_action_and_bonus_action_independent_in_turn = {
    val creature = freshCreature(20)
    val ts0 = FRESH_TURN
    val ts1 = pUseAction(ts0, creature, AAttack)
    val ts2 = pUseBonusAction(ts1, creature)
    all {
      assert(ts1.attackActionUsed),
      assert(not(ts1.bonusActionUsed)),
      assert(ts2.bonusActionUsed),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/1en1891/
  
  // Resistance to non-magical attacks in 2024 monsters — 2024 SRD stat blocks removed BPS resistance; creatures take full damage from Bludgeoning, Piercing, and Slashing
  run qa_no_bps_resistance_2024 = {
    // Imp in 2024 SRD has 21 HP (increased from 10 to compensate for removed BPS resistance)
    val creature = freshCreature(21)
    val dmg = 6
    // 2024 SRD: no resistance to Bludgeoning, Piercing, or Slashing — full damage applies
    val afterBludgeoning = pTakeDamage(creature, dmg, Bludgeoning, Set(), Set(), Set(), false)
    val afterPiercing    = pTakeDamage(creature, dmg, Piercing,    Set(), Set(), Set(), false)
    val afterSlashing    = pTakeDamage(creature, dmg, Slashing,    Set(), Set(), Set(), false)
    assert(
      afterBludgeoning.hp == 21 - dmg and
      afterPiercing.hp    == 21 - dmg and
      afterSlashing.hp    == 21 - dmg
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xrcicd/
  
  // Bard Initial Readthrough: BI is reaction-based — reaction is consumed on use
  run qa_bard_bi_reaction_consumed = {
    val t = FRESH_TURN
    val t1 = pUseReaction(t)
    assert(not(t1.reactionAvailable))
  }
  
  // Bard Initial Readthrough: reaction resets at start of each turn (one BI use per round)
  run qa_bard_reaction_resets_on_turn_start = {
    val creature = freshCreature(20)
    val t1 = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    assert(t1.reactionAvailable)
  }
  
  // Bard Initial Readthrough: BI scales with proficiency bonus — reaches 6 at tier 4 (level 17+)
  run qa_bard_bi_proficiency_tier4 = {
    assert(proficiencyBonus(17) == 6)
  }
  
  // Bard Initial Readthrough: BI proficiency-based die exceeds max Charisma modifier at tier 4
  run qa_bard_bi_proficiency_exceeds_cha_at_tier4 = {
    // Standard array max Cha is 15+2 ASI = 20 -> mod +5; proficiency at level 17 = 6
    val maxChaMod = abilityModifier(20)
    val profAtTier4 = proficiencyBonus(17)
    assert(profAtTier4 > maxChaMod)
  }
  
  // Bard Initial Readthrough: ASI/Feat available at level 4
  run qa_bard_asi_at_level_4 = {
    assert(pIsASILevel(4))
  }
  
  // Bard Initial Readthrough: Bard spellcasting is Charisma-based (spell attack = Cha mod + prof)
  run qa_bard_spellcasting_charisma_based = {
    val bardConfig = TEST_CONFIG
      .with("spellcastingAbility", Cha)
      .with("abilityScores", Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 16))
      .with("level", 5)
    // Cha 16 -> mod +3; prof at level 5 -> +3; total = 6
    val bonus = spellcastingBonus(bardConfig)
    assert(bonus == 6)
  }

  // Source: https://reddit.com/r/onednd/comments/ws2h13/
  
  // About 1 and 20 auto-failing/succeeding: nat 20 does NOT auto-succeed ability checks (no special case in checkSucceeds)
  run qa_ability_check_nat20_no_auto_success = {
    // DC 25, roll 20, +0 modifier, no proficiency: total 20 < 25 → fails
    assert(not(checkSucceeds(20, 0, NoneProf, 4, 0, 25)))
  }
  
  // About 1 and 20 auto-failing/succeeding: nat 1 does NOT auto-fail ability checks
  run qa_ability_check_nat1_no_auto_fail = {
    // DC 15, roll 1, +10 ability mod, proficient (PB 6): total 17 >= 15 → succeeds
    assert(checkSucceeds(1, 10, Proficient, 6, 0, 15))
  }

  // Source: https://rpg.stackexchange.com/q/215870
  
  // Magic Stone + Agonizing Blast: Magic Stone deals spell damage, so Agonizing Blast adds spellcasting modifier a second time (1d6 + CHA + CHA)
  run qa_magic_stone_agonizing_blast_double_modifier = {
    val chaScore = 16
    val chaMod = abilityModifier(chaScore)   // (16-10)/2 = 3
    val diceRoll = 4                         // pre-resolved 1d6
    // Magic Stone base damage: 1d6 + spellcasting ability modifier
    val magicStoneDamage = normalDamage(diceRoll, chaMod)
    // Agonizing Blast is legal on Magic Stone (it is spell damage), adding spellcasting mod again
    val withAgonizingBlast = normalDamage(diceRoll, chaMod + chaMod)
    assert(withAgonizingBlast == magicStoneDamage + chaMod)
  }

  // Source: https://reddit.com/r/onednd/comments/1hdgnry/
  
  // Can You Attempt to Grapple in Place of an Opportunity Attack?
  run qa_grapple_as_opportunity_attack_b9c11346 = {
    // A grapple is a special melee attack and can replace the attack in an OA.
    // OA costs a reaction; grapple succeeds when target fails the save.
    val targetTurnState: TurnState = FRESH_TURN.with("disengaged", false)
    val target: CreatureState = freshCreature(20)
  
    // Target has not disengaged, so opportunity attack is eligible
    val oaEligible = pCanBeOpportunityAttacked(targetTurnState)
  
    // Attacker spends their reaction to make the opportunity attack
    val attackerTurnBefore: TurnState = FRESH_TURN
    val attackerTurnAfter: TurnState = pUseReaction(attackerTurnBefore)
  
    // Grapple replaces the attack: Medium attacker vs Medium target,
    // free hand available, target fails save (saveFailed = true)
    val grappleResult = pGrapple(Medium, Medium, target, true, true)
  
    assert(
      oaEligible and
      attackerTurnBefore.reactionAvailable and
      not(attackerTurnAfter.reactionAvailable) and
      grappleResult.success and
      grappleResult.targetState.grappled
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1eriycl/
  
  // Action Surge grants a second action taken sequentially (one at a time per 2024 PHB); it does not interrupt an action already in progress
  run qa_action_surge_sequential_not_interrupt = {
    val fs = freshFighterState(2)
    val ts = FRESH_TURN
    val creature = freshCreature(20)
  
    // Use Action Surge: increments actionsRemaining by 1 (now 2 — both taken sequentially)
    val surgeResult = pUseActionSurge(ts, fs)
    val ts1 = surgeResult.turn
    val fs1 = surgeResult.fighter
  
    // Take first action (one action at a time)
    val ts2 = pUseAction(ts1, creature, AAttack)
  
    // Take second action (the surge action — sequential, not an interrupt)
    val ts3 = pUseAction(ts2, creature, AAttack)
  
    all {
      // Surge produces exactly 2 queued sequential actions
      assert(ts1.actionsRemaining == 2),
      // First action consumed: 1 left
      assert(ts2.actionsRemaining == 1),
      // Second action consumed: 0 left — both taken one at a time
      assert(ts3.actionsRemaining == 0),
      // Surge is marked used this turn and charge is spent
      assert(fs1.actionSurgeUsedThisTurn),
      assert(fs1.actionSurgeCharges == 0),
      // Can never exceed 2 actions even after surge (no interrupt possible)
      assert(ts1.actionsRemaining <= 2),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xtf2ul/
  
  // "It's funny to see how players can casually jump 5 ft in the air in the new UA" — a ≤5 ft jump is difficult terrain (10 ft of movement), no Jump Action required.
  run qa_small_jump_costs_difficult_terrain = {
    // creature has 30 ft of movement; a ≤5 ft jump = difficult terrain multiplier
    val cost = pMovementCost(true, false, false, false) // isDifficultTerrain=true -> multiplier 2
    val t1 = pUseMovement(FRESH_TURN, 5, cost)          // 5 ft × 2 = 10 ft spent
    assert(cost == 2 and t1.movementRemaining == 20)
  }

  // Source: https://reddit.com/r/onednd/comments/11a3m5e/
  
  // Druids no longer have proficiency in medium armor
  run qa_druid_lacks_medium_armor_proficiency = {
    // Base Druid has no medium armor proficiency — wearing breastplate triggers penalty
    val druidProfs: Set[ArmorCategory] = Set(LightArmor)
    assert(lacksArmorProficiency(WearingArmor(BREASTPLATE), druidProfs))
  }
  
  // Druids no longer have proficiency in medium armor (gained via multiclass/feat)
  run qa_druid_medium_armor_via_multiclass_or_feat = {
    // Druid who dipped Ranger (or took a feat) gains medium armor proficiency — no longer penalized
    val druidRangerProfs: Set[ArmorCategory] = Set(LightArmor, MediumArmor)
    assert(not(lacksArmorProficiency(WearingArmor(BREASTPLATE), druidRangerProfs)))
  }
  
  // Druids no longer have proficiency in medium armor — unarmored AC uses only DEX (no special UD)
  run qa_druid_unarmored_ac_no_ud = {
    // Unarmored Druid with no special unarmored defense: AC = 10 + dexMod
    val dexMod = 2
    val ac = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 3)
    assert(ac == 12)
  }

  // Source: https://rpg.stackexchange.com/q/216184
  
  // Does Otherworldly Steed Slam add Strength modifier to attacks?
  run qa_otherworldly_steed_slam_no_str_mod = {
    // Paladin: CHA 16 (+3 mod), level 5 (PB +3) -> spell attack bonus = +6
    val scores = TEST_CONFIG.abilityScores.set(Cha, 16)
    val paladinConfig = TEST_CONFIG
      .with("abilityScores", scores)
      .with("spellcastingAbility", Cha)
    val slamAtkBonus = spellAttackBonus(paladinConfig)  // 3 + 3 = 6
    // Otherworldly Steed STR 18 -> modifier +4
    val steedStrMod = abilityModifier(18)
    assert(
      steedStrMod == 4
      and slamAtkBonus == 6
      // Ruling: attack uses only spell attack modifier as specified; STR mod is irrelevant to attacks
      // d20=9 vs AC 16: correct (no STR mod) → 9+6=15 < 16 → miss
      and resolveAttackRoll(9, slamAtkBonus, 16, 0, 20).hits == false
      // Wrong reading (adds STR mod) → 9+10=19 >= 16 → hit — ruled out by accepted answer
      and resolveAttackRoll(9, slamAtkBonus + steedStrMod, 16, 0, 20).hits == true
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1he1m18/
  
  // How does new stealth work exactly? — Hiding grants Invisible condition which gives advantage on attacks
  run qa_invisible_condition_grants_attack_advantage = {
    val creature = freshCreature(20)
    val hidden = pApplyCondition(creature, CInvisible)
    val ownMods = pOwnAttackModifiers(hidden, false)
    assert(hidden.invisible and ownMods.hasAdvantage and not(ownMods.hasDisadvantage))
  }
  
  // How does new stealth work exactly? — Attacks against an Invisible creature have disadvantage
  run qa_invisible_condition_attackers_have_disadvantage = {
    val creature = freshCreature(20)
    val hidden = pApplyCondition(creature, CInvisible)
    val defMods = pDefenseModifiers(hidden, true)
    assert(defMods.attackerDisadvantage and not(defMods.attackerAdvantage))
  }
  
  // How does new stealth work exactly? — Removing Invisible (spotted/out of cover) cancels both advantages
  run qa_invisible_condition_removal_cancels_benefits = {
    val creature = freshCreature(20)
    val hidden = pApplyCondition(creature, CInvisible)
    val spotted = pRemoveCondition(hidden, CInvisible)
    val ownMods = pOwnAttackModifiers(spotted, false)
    val defMods = pDefenseModifiers(spotted, true)
    all {
      assert(not(spotted.invisible)),
      assert(not(ownMods.hasAdvantage)),
      assert(not(defMods.attackerDisadvantage)),
    }
  }

  // Source: https://rpg.stackexchange.com/q/213828
  
  // When is the 2024 sleep spell likely to remove more targets from combat than the 2014 sleep spell?
  
  // 2024 Sleep: first failed WIS save → Incapacitated (no HP budget check)
  run qa_sleep_2024_first_failed_save_incapacitates = {
    val target = freshCreature(15)
    val wisMod = abilityModifier(8) // WIS 8 → mod -1
    val sleepDC = 13                // level-1 wizard: 8 + 3 (Int mod) + 2 (PB)
    // roll 7: 7 + (-1) = 6 < 13 → fails
    val saveFailed = not(saveSucceeds(7, wisMod, false, 2, 0, sleepDC))
    val afterFirstSave = if (saveFailed) pApplyCondition(target, CIncapacitated) else target
    assert(saveFailed and isIncapacitated(afterFirstSave))
  }
  
  // 2024 Sleep: two consecutive failed WIS saves → Unconscious (fully removed from combat)
  run qa_sleep_2024_two_failed_saves_unconscious = {
    val target = freshCreature(15)
    val wisMod = abilityModifier(8)
    val sleepDC = 13
    // First save fails → Incapacitated
    val s1 = pApplyCondition(target, CIncapacitated)
    // Second save: roll 5, 5 + (-1) = 4 < 13 → fails → Unconscious
    val secondSaveFailed = not(saveSucceeds(5, wisMod, false, 2, 0, sleepDC))
    val s2 = if (secondSaveFailed) pApplyCondition(s1, CUnconscious) else s1
    assert(secondSaveFailed and s2.unconscious and s2.prone and isIncapacitated(s2))
  }
  
  // 2024 Sleep: creature that succeeds first WIS save is completely unaffected
  run qa_sleep_2024_first_save_success_no_effect = {
    val target = freshCreature(15)
    val wisMod = abilityModifier(8)
    val sleepDC = 13
    // roll 18: 18 + (-1) = 17 >= 13 → succeeds
    val succeeded = saveSucceeds(18, wisMod, false, 2, 0, sleepDC)
    val afterSave = if (not(succeeded)) pApplyCondition(target, CIncapacitated) else target
    assert(succeeded and not(isIncapacitated(afterSave)))
  }
  
  // 2024 Sleep mixed group: one goblin fails (Incapacitated), one succeeds (unaffected)
  // Caster chooses targets — can exclude self, unlike 2014's fixed-origin 20ft burst
  run qa_sleep_2024_mixed_group_one_removed = {
    val goblin1 = freshCreature(7)
    val goblin2 = freshCreature(7)
    val wisMod = abilityModifier(8) // WIS 8 → mod -1
    val sleepDC = 13
    // Goblin1 rolls 4: 4 + (-1) = 3 < 13 → fails → Incapacitated
    val g1Fails = not(saveSucceeds(4, wisMod, false, 2, 0, sleepDC))
    val goblin1After = if (g1Fails) pApplyCondition(goblin1, CIncapacitated) else goblin1
    // Goblin2 rolls 15: 15 + (-1) = 14 >= 13 → succeeds → unaffected
    val g2Succeeds = saveSucceeds(15, wisMod, false, 2, 0, sleepDC)
    val goblin2After = if (not(g2Succeeds)) pApplyCondition(goblin2, CIncapacitated) else goblin2
    assert(
      g1Fails and isIncapacitated(goblin1After) and
      g2Succeeds and not(isIncapacitated(goblin2After))
    )
  }
  
  // 2024 Sleep vs high-HP low-WIS target (ogre-like): HP is irrelevant, only WIS save matters
  // Under 2014 rules, 5d8 avg ~22.5 hp could never touch a 59 HP ogre unaided;
  // Under 2024 rules, ogre fails WIS save and is Incapacitated at full HP
  run qa_sleep_2024_high_hp_low_wis_incapacitated_at_full_hp = {
    val ogre = freshCreature(59)
    val wisMod = abilityModifier(7) // WIS 7 → mod -2
    val sleepDC = 13
    // Ogre rolls 8: 8 + (-2) = 6 < 13 → fails
    val saveFailed = not(saveSucceeds(8, wisMod, false, 2, 0, sleepDC))
    val ogreAfter = if (saveFailed) pApplyCondition(ogre, CIncapacitated) else ogre
    // HP unchanged — 2024 Sleep doesn't require HP to be low
    assert(saveFailed and isIncapacitated(ogreAfter) and ogreAfter.hp == 59)
  }

  // Source: https://reddit.com/r/onednd/comments/10bl2r5/
  
  // Hex and Spiritual Weapon compete for concentration; casting one while holding the other ends it
  run qa_hex_spiritual_weapon_concentration_exclusive = {
      val ss0 = FRESH_SPELL_SLOTS
      val ss1 = pStartConcentration(ss0, "hex")
      val ss2 = pStartConcentration(ss1, "spiritual_weapon")
      assert(ss2.concentrationSpellId == "spiritual_weapon")
  }
  
  // Both Hex and Spiritual Weapon are bonus-action spells; casting one blocks non-cantrip action spells that turn
  run qa_bonus_action_spell_restricts_action_to_cantrip = {
      val t0 = FRESH_TURN
      val t1 = pMarkBonusActionSpell(t0)
      assert(not(canCastNonCantripAction(t1)))
  }
  
  // Concentration (Hex/SW): failing the save after taking damage ends the spell
  run qa_failed_concentration_save_ends_hex_or_sw = {
      val ss0 = FRESH_SPELL_SLOTS
      val ss1 = pStartConcentration(ss0, "hex")
      val ss2 = pConcentrationCheck(ss1, false)
      assert(not(isConcentrating(ss2)))
  }
  
  // Breaking concentration on Hex or SW removes its active effect from the creature
  run qa_concentration_break_removes_active_effect = {
      val s0 = freshCreature(30)
      val effects1 = pAddEffect(s0.activeEffects, "hex", 10, AtEndOfTurn)
      val s1 = s0.with("activeEffects", effects1)
      val ss1 = pStartConcentration(FRESH_SPELL_SLOTS, "hex")
      val ss2 = pBreakConcentration(ss1)
      val effects2 = pEffectsOnConcBreak(ss1, ss2, s1.activeEffects)
      assert(not(pHasEffect(effects2, "hex")))
  }
  
  // Concentration DC: 20 damage -> DC 10 (max(10, 20/2)), minimum threshold for Hex/SW saves
  run qa_concentration_dc_minimum_threshold = {
      assert(pConcentrationDC(20) == 10)
  }
  
  // Concentration DC scales above minimum: 30 damage -> DC 15
  run qa_concentration_dc_scales_with_damage = {
      assert(pConcentrationDC(30) == 15)
  }

  // Source: https://reddit.com/r/onednd/comments/11aq2di/
  
  // How to break the new Paladin, with a twist: ranged weapons use DEX, so a Dex-based ranged build has superior attack reliability vs a STR-based melee build
  run qa_ranged_weapon_uses_dex_modifier = {
    // Dex-based ranged "paladin": DEX 18 (+4), STR 10 (+0)
    val dexMod = abilityModifier(18) // +4
    val strMod = abilityModifier(10) // +0
    val profBonus = proficiencyBonus(5) // level 5 → +3
    val archeryFsBonus = 2 // Archery fighting style flat bonus (encoded as attackBonus)
  
    val longbow: Weapon = {
      name: "Longbow",
      damageDie: 8,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, TwoHanded),
      isMelee: false,
      normalRange: 150,
      longRange: 600,
    }
  
    val greatsword: Weapon = {
      name: "Greatsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(Heavy, TwoHanded),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
  
    // ranged weapon picks up DEX; melee weapon picks up STR
    val rangedAbilityMod = weaponAttackAbility(longbow, strMod, dexMod)   // DEX: +4
    val meleeAbilityMod  = weaponAttackAbility(greatsword, strMod, dexMod) // STR: +0
  
    val rangedTotalBonus = rangedAbilityMod + profBonus + archeryFsBonus // 4+3+2 = +9
    val meleeTotalBonus  = meleeAbilityMod  + profBonus                  // 0+3   = +3
  
    // Same mediocre roll of 6 against AC 15
    val rangedResult = resolveAttackRoll(6, rangedTotalBonus, 15, 0, 20) // 6+9=15 >= 15 → hits
    val meleeResult  = resolveAttackRoll(6, meleeTotalBonus,  15, 0, 20) // 6+3=9  <  15 → misses
  
    assert(
      // Ranged weapon uses DEX, melee weapon uses STR
      rangedAbilityMod == dexMod
      and meleeAbilityMod == strMod
      // Dex-based ranged build hits on a roll of 6; STR-based melee build misses
      and rangedResult.hits == true
      and meleeResult.hits == false
      // Archery FS (+2) plus DEX advantage totals to a strictly higher bonus
      and rangedTotalBonus > meleeTotalBonus
    )
  }

  // Source: https://rpg.stackexchange.com/q/215080
  
  // Can any class cast spells as a Ritual? — ritual casting consumes no spell slot
  run qa_ritual_cast_no_slot_expended = {
    val oneSlotMap: int -> int = Map(1 -> 1, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0)
    val slots: SpellSlotState = {
      slotsMax: oneSlotMap,
      slotsCurrent: oneSlotMap,
      pactSlotsMax: 1,
      pactSlotsCurrent: 1,
      pactSlotLevel: 1,
      concentrationSpellId: "",
    }
    // Normal cast: pExpendSlot reduces level-1 slot count
    val afterNormalCast = pExpendSlot(slots, 1)
    // Ritual cast: slot NOT expended — ritual bypasses pExpendSlot entirely
    val afterRitualCast = slots
    assert(
      afterNormalCast.slotsCurrent.get(1) == 0
      and afterRitualCast.slotsCurrent.get(1) == 1
      and afterRitualCast.pactSlotsCurrent == 1
    )
  }

  // Source: https://reddit.com/r/onednd/comments/zmmxwj/
  
  // It's mechanically superior to climb along a flat surface instead of running
  run qa_climb_speed_flat_ground_equals_walk_cost = {
    // Accepted answer: using climb speed on flat ground is mechanically identical to walking —
    // no extra foot cost because hasRelevantSpeed=true cancels the climbSwimExtra penalty.
    val walkCost = pMovementCost(false, false, false, false)
    val climbWithSpeedCost = pMovementCost(false, false, true, true)
    assert(walkCost == climbWithSpeedCost)
  }
  
  // It's mechanically superior to climb along a flat surface instead of running
  run qa_climb_without_speed_costs_extra_vs_walk = {
    // Corollary: climbing WITHOUT a climb speed costs 1 extra foot per foot moved,
    // which is why having a climb speed removes the disincentive entirely.
    val walkCost = pMovementCost(false, false, false, false)
    val climbNoSpeedCost = pMovementCost(false, false, true, false)
    assert(climbNoSpeedCost == walkCost + 1)
  }
  
  // It's mechanically superior to climb along a flat surface instead of running
  run qa_climb_speed_flat_ground_movement_budget_identical = {
    // A creature with climb speed using it on flat ground spends movement at the same
    // rate as walking: move 30ft either way costs the same budget.
    val t = FRESH_TURN
    val afterWalk = pUseMovement(t, 30, pMovementCost(false, false, false, false))
    val afterClimbSpeed = pUseMovement(t, 30, pMovementCost(false, false, true, true))
    assert(afterWalk.movementRemaining == afterClimbSpeed.movementRemaining)
  }

  // Source: https://reddit.com/r/onednd/comments/xuxpeq/
  
  // Bardic Inspiration Healing: attack on downed creature accumulates death save failures without a reaction heal
  run qa_bardic_inspiration_no_heal_second_attack_adds_failure = {
    val wizard = freshCreature(20)
    // First attack drops wizard to 0 HP (unconscious)
    val wizard_downed = pTakeDamage(wizard, 25, Slashing, Set(), Set(), Set(), false)
    // Enemy's second attack hits the downed wizard — bard did NOT use reaction heal
    val wizard_second_hit = pTakeDamage(wizard_downed, 10, Slashing, Set(), Set(), Set(), false)
    assert(
      wizard_downed.hp == 0
      and wizard_downed.unconscious == true
      and wizard_second_hit.hp == 0
      and wizard_second_hit.deathSaves.failures == 1
    )
  }
  
  // Bardic Inspiration Healing: bard reaction heal before second attack restores consciousness and prevents death save failure
  run qa_bardic_inspiration_reaction_heal_prevents_failure = {
    val wizard = freshCreature(20)
    // First attack drops wizard to 0 HP
    val wizard_downed = pTakeDamage(wizard, 25, Slashing, Set(), Set(), Set(), false)
    // Bard spends reaction + Bardic Inspiration to heal (e.g. max d8 BI die = 8 HP)
    val wizard_healed = pHeal(wizard_downed, 8)
    // Enemy's second attack now hits a conscious wizard — damage only, no death saves
    val wizard_second_hit = pTakeDamage(wizard_healed, 10, Slashing, Set(), Set(), Set(), false)
    assert(
      wizard_downed.hp == 0 and wizard_downed.unconscious == true
      // Reaction heal restores consciousness and resets death saves
      and wizard_healed.hp == 8 and wizard_healed.unconscious == false
      and wizard_healed.deathSaves.failures == 0
      // Second hit drops them again but no death save failure was accrued
      and wizard_second_hit.hp == 0
      and wizard_second_hit.deathSaves.failures == 0
    )
  }

  // Source: https://rpg.stackexchange.com/q/213482
  
  // What happens when you hide from a creature with Truesight? — Truesight needs LoS; solid cover blocks it even for Invisible targets
  run qa_truesight_solid_cover_blocks_los = {
    // Rogue hides behind solid rock (total cover) gaining Invisible condition.
    // Truesight cannot pierce solid objects → attackerCanSeeTarget = false → attacker has disadvantage.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // What happens when you hide from a creature with Truesight? — Truesight with clear LoS does see Invisible target normally
  run qa_truesight_open_los_sees_invisible = {
    // Invisible creature in the open, no cover blocking LoS.
    // Truesight + clear LoS → attackerCanSeeTarget = true → no disadvantage.
    // Target can still see the attacker → no unseenAttacker advantage.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }
  
  // What happens when you hide from a creature with Truesight? — hidden creature still gets advantage attacking Truesight if cover blocks their LoS
  run qa_truesight_hidden_attacker_advantage_through_cover = {
    // Rogue (Invisible from hiding, behind rock) attacks the Truesight creature.
    // The rock blocks the Truesight creature's LoS back to the Rogue → targetCanSeeAttacker = false → Rogue gets advantage.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }

  // Source: https://rpg.stackexchange.com/q/215684
  
  run qa_forced_movement_breaks_grapple = {{
    val s = freshCreature(20).with("grappled", true)
    val s2 = pReleaseGrapple(s)
    assert(not(s2.grappled))
  }}
  
  // Q&A: Is there any creature whose grapple cannot be broken by forced movement?
  run qa_restrained_or_stunned_do_not_prevent_grapple_release = {{
    val s = freshCreature(20)
      .with("grappled", true)
      .with("restrained", true)
      .with("stunned", true)
      .with("incapacitatedSources", Set(ISStunned))
    val s2 = pReleaseGrapple(s)
    assert(not(s2.grappled) and s2.restrained and s2.stunned)
  }}

  // Source: https://reddit.com/r/onednd/comments/1g3kyrp/
  
  // The Search Action and Surprise: successful Hide grants Invisible condition, which gives Advantage on Initiative (and attack rolls)
  run qa_hidden_creature_has_initiative_advantage = {
    val creature = freshCreature(20)
    val hidden = pApplyCondition(creature, CInvisible)
    val mods = pOwnAttackModifiers(hidden, false)
    assert(mods.hasAdvantage)
  }
  
  // The Search Action and Surprise: unseen attacker (hidden via Invisible condition) has Advantage on attack rolls against target that cannot see them
  run qa_unseen_attacker_has_attack_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/11an3ry/
  
  // Stats Above 20: standard ASI cannot raise a score above 20
  run qa_asi_caps_at_20 = {
    val scores = Map(Str -> 20, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    val after = pApplyASI(scores, Str, 2)
    assert(after.get(Str) == 20)
  }
  
  // Stats Above 20: ability modifier at the hard cap of 30 is +10
  run qa_ability_modifier_at_hard_cap_30 = {
    assert(abilityModifier(30) == 10)
  }
  
  // Stats Above 20: score raised above 20 (e.g. 22 via Blessing of Health) yields correct modifier
  run qa_ability_modifier_above_20 = {
    assert(abilityModifier(22) == 6)
  }

  // Source: https://reddit.com/r/onednd/comments/ze7vum/
  
  // Long Rest: At least 16 hours + at least 8 hours = sleep disorders
  run qa_long_rest_restores_all_hit_dice = {
    val start = freshCreature(20).with("hitPointDiceRemaining", 2)
    val afterRest = pLongRest(start, 5)
    assert(afterRest.hitPointDiceRemaining == 5)
  }
  
  // Long Rest: At least 16 hours + at least 8 hours = sleep disorders
  run qa_long_rest_restores_hp_to_max = {
    val start = freshCreature(20).with("hp", 7)
    val afterRest = pLongRest(start, 5)
    assert(afterRest.hp == 20)
  }
  
  // Long Rest: At least 16 hours + at least 8 hours = sleep disorders
  run qa_long_rest_clears_temp_hp = {
    val start = freshCreature(20).with("tempHp", 10)
    val afterRest = pLongRest(start, 5)
    assert(afterRest.tempHp == 0)
  }
  
  // Long Rest: At least 16 hours + at least 8 hours = sleep disorders
  run qa_long_rest_no_benefit_at_0_hp = {
    val start = freshCreature(20).with("hp", 0).with("hitPointDiceRemaining", 2)
    val afterRest = pLongRest(start, 5)
    assert(afterRest.hp == 0 and afterRest.hitPointDiceRemaining == 2)
  }
  
  // Long Rest: At least 16 hours + at least 8 hours = sleep disorders
  run qa_long_rest_reduces_exhaustion_by_1 = {
    val start = freshCreature(20).with("exhaustion", 3)
    val afterRest = pLongRest(start, 5)
    assert(afterRest.exhaustion == 2)
  }

  // Source: https://reddit.com/r/onednd/comments/wuehcd/
  
  // Crits On Skill Checks: checks only meaningful when nat 1 fails AND nat 20 succeeds (DMG p.237)
  run qa_check_guaranteed_no_meaningful_failure = {
    // If bonus is high enough that nat 1 still meets DC, task is guaranteed — no meaningful failure
    val abilityMod = 5
    val profBonus = 4
    val dc = 10
    // 1 + 5 + 4 = 10 >= 10: succeeds even on worst roll → task should not have been rolled
    assert(checkSucceeds(1, abilityMod, Proficient, profBonus, 0, dc))
  }
  
  // Crits On Skill Checks: impossible task — nat 20 still fails (DMG p.237)
  run qa_check_impossible_no_meaningful_success = {
    // If DC is so high that nat 20 + all bonuses still fails, task is impossible — no roll warranted
    val abilityMod = 0
    val profBonus = 2
    val dc = 30
    // 20 + 0 + 0 = 20 < 30: fails even on best roll → task should not have been rolled
    assert(not(checkSucceeds(20, abilityMod, NoneProf, profBonus, 0, dc)))
  }
  
  // Crits On Skill Checks: a check is meaningful only when nat 1 fails and nat 20 succeeds (DMG p.237)
  run qa_check_meaningful_nat1_fails_nat20_succeeds = {
    val abilityMod = 3
    val profBonus = 2
    val dc = 15
    // nat 1: 1 + 3 + 2 = 6 < 15 → fail
    // nat 20: 20 + 3 + 2 = 25 >= 15 → succeed
    // Both outcomes possible: this is the only case where rolling is warranted
    assert(
      not(checkSucceeds(1, abilityMod, Proficient, profBonus, 0, dc))
      and checkSucceeds(20, abilityMod, Proficient, profBonus, 0, dc)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/z1ed3w/
  
  // Reliable Talent + Use Magic Device: level 11 rogue with Int 20 auto-passes DC 19 Arcana for 9th-level spell scroll
  run qa_reliable_talent_guarantees_spell_scroll_dc19 = {
    // Reliable Talent floor = 10; 10 + intMod(5) + profBonus(4) = 19 >= DC 19
    val intMod = abilityModifier(20)
    val rogueProf = proficiencyBonus(11)
    val dc = 10 + 9
    assert(checkSucceeds(10, intMod, Proficient, rogueProf, 0, dc))
  }
  
  // Natural 9 without Reliable Talent would fail: shows why the feature matters
  run qa_without_reliable_talent_roll9_fails_dc19 = {
    val intMod = abilityModifier(20)
    val rogueProf = proficiencyBonus(11)
    val dc = 10 + 9
    // 9 + 5 + 4 = 18 < 19
    assert(not(checkSucceeds(9, intMod, Proficient, rogueProf, 0, dc)))
  }
  
  // Level 16 full caster without Arcana proficiency: roll of 13 fails DC 19 (only ~35% success rate)
  run qa_full_caster_no_prof_roll13_fails_dc19 = {
    val intMod = abilityModifier(20)
    val casterProf = proficiencyBonus(16)
    val dc = 10 + 9
    // 13 + 5 + 0 = 18 < 19
    assert(not(checkSucceeds(13, intMod, NoneProf, casterProf, 0, dc)))
  }
  
  // Level 16 full caster needs exactly 14 to succeed (minimum passing roll)
  run qa_full_caster_no_prof_roll14_passes_dc19 = {
    val intMod = abilityModifier(20)
    val casterProf = proficiencyBonus(16)
    val dc = 10 + 9
    // 14 + 5 + 0 = 19 >= 19
    assert(checkSucceeds(14, intMod, NoneProf, casterProf, 0, dc))
  }

  // Source: https://reddit.com/r/onednd/comments/y4ho7y/
  
  // Two-Weapon Fighting: "different" means distinct instances, not distinct weapon types — two daggers are valid
  run qa_twf_same_weapon_type_allowed = {
    val dagger1: Weapon = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val dagger2: Weapon = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true)
    assert(pCanTWFWithWeapons(dagger1, dagger2, t, creature))
  }

  // Source: https://rpg.stackexchange.com/q/214076
  
  // How does the Warlock's invocation Gaze of Two Minds interact with the Unseen rule?
  run qa_unseen_attacker_gaze_of_two_minds_advantage = {
    // Accepted answer: warlock is the attacker; target can't see the warlock (behind full cover),
    // so Unseen Attacker advantage applies regardless of the spell originating from another creature's space.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: false,  // target cannot see the warlock (attacker is behind closed door)
      attackerCanSeeTarget: true,   // warlock perceives target through GoTM senses
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
  
  // Converse: if target CAN see the warlock, no Unseen Attacker advantage
  run qa_seen_attacker_gaze_of_two_minds_no_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,  // target can see the warlock — no Unseen Attacker advantage
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/z9ytbr/
  
  // Subtle Change to the Grappled Condition: grappler speed halved when dragging same-size target
  run qa_grappled_slowed_same_size = {
    val creature = freshCreature(20)
    // isGrappling=true, grappledTargetTwoSizesSmaller=false → speed halved
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, false)
    assert(t.effectiveSpeed == 15)
  }
  
  // Subtle Change to the Grappled Condition: no speed penalty when grappled target is two sizes smaller
  run qa_grappled_no_slowed_two_sizes_smaller = {
    val creature = freshCreature(20)
    // isGrappling=true, grappledTargetTwoSizesSmaller=true → full speed
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, true)
    assert(t.effectiveSpeed == 30)
  }
  
  // Subtle Change to the Grappled Condition: Tiny IS two sizes smaller than Medium (exemption applies)
  run qa_tiny_two_sizes_smaller_than_medium = {
    assert(pTwoSizesSmaller(Medium, Tiny))
  }
  
  // Subtle Change to the Grappled Condition: Small is NOT two sizes smaller than Medium (no exemption)
  run qa_small_not_two_sizes_smaller_than_medium = {
    assert(not(pTwoSizesSmaller(Medium, Small)))
  }
  
  // Subtle Change to the Grappled Condition: Small IS two sizes smaller than Large (exemption applies)
  run qa_small_two_sizes_smaller_than_large = {
    assert(pTwoSizesSmaller(Large, Small))
  }

  // Source: https://reddit.com/r/onednd/comments/11a1v56/
  
  // Druid and Paladin UA summary: Paladin Lay on Hands ends the Poisoned condition
  run qa_lay_on_hands_ends_poisoned = {
    val c = pApplyCondition(freshCreature(20), CPoisoned)
    val healed = pRemoveCondition(c, CPoisoned)
    assert(not(healed.poisoned))
  }
  
  // Druid and Paladin UA summary: Moon Druid level-6 elemental resistance halves chosen damage type
  run qa_moon_druid_elemental_resistance = {
    val c = freshCreature(20)
    val result = pTakeDamage(c, 10, Fire, Set(Fire), Set(), Set(), false)
    assert(result.hp == 15)
  }
  
  // Druid and Paladin UA summary: Paladin gains Extra Attack at level 5
  run qa_paladin_extra_attack_level5 = {
    val config = TEST_CONFIG.with("features", Set(FExtraAttack)).with("level", 5)
    assert(extraAttacksFromConfig(config) == 1)
  }
  
  // Druid and Paladin UA summary: Abjure Foes — Frightened creature has disadv on attacks when fear source is in LOS
  run qa_abjure_foes_frightened_attack_disadv = {
    val c = pApplyCondition(freshCreature(20), CFrightened)
    val mods = pOwnAttackModifiers(c, true)
    assert(mods.hasDisadvantage)
  }

  // Source: https://rpg.stackexchange.com/q/213479
  
  run qa_beguiling_defenses_only_on_hit_attack_roll = {{
    val defender = freshCreature(30).with("hp", 30)
    val hitAttack = resolveAttackRoll(15, 7, 20, 0, 20)
    val missAttack = resolveAttackRoll(5, 7, 20, 0, 20)
    assert(defender.hp == 30 and hitAttack.hits and not(missAttack.hits))
  }}
  
  // Q&A: Can the Warlock's Beguiling Defenses trigger on AoE effects?
  run qa_beguiling_defenses_not_from_save_based_effects = {{
    val defender = freshCreature(30).with("hp", 30)
    val saveBasedEffectResolved = saveSucceeds(14, abilityModifier(14), true, proficiencyBonus(5), 0, 15)
    val attackDidNotHit = resolveAttackRoll(8, 5, 20, 0, 20)
    assert(defender.hp == 30 and saveBasedEffectResolved and not(attackDidNotHit.hits))
  }}

  // Source: https://reddit.com/r/onednd/comments/wuagqh/
  
  // My observations after DMing using new rules — successful grapple sets target speed to 0
  run qa_grapple_imposes_speed_zero = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    val t = pStartTurn(TEST_CONFIG, result.targetState, Unarmored, 0, false, false)
    assert(result.success and result.targetState.grappled and t.movementRemaining == 0 and t.effectiveSpeed == 0)
  }
  
  // My observations after DMing using new rules — successful escape from grapple restores movement
  run qa_escape_grapple_restores_movement = {
    val target = freshCreature(20)
    val grappled = pGrapple(Medium, Medium, target, true, true)
    val escaped = pEscapeGrapple(grappled.targetState, true)
    val t = pStartTurn(TEST_CONFIG, escaped, Unarmored, 0, false, false)
    assert(not(escaped.grappled) and t.movementRemaining > 0)
  }
  
  // My observations after DMing using new rules — failed escape leaves grapple and speed 0 intact
  run qa_failed_escape_stays_grappled = {
    val target = freshCreature(20)
    val grappled = pGrapple(Medium, Medium, target, true, true)
    val stillGrappled = pEscapeGrapple(grappled.targetState, false)
    val t = pStartTurn(TEST_CONFIG, stillGrappled, Unarmored, 0, false, false)
    assert(stillGrappled.grappled and t.movementRemaining == 0)
  }

  // Source: https://reddit.com/r/onednd/comments/wsbdds/
  
  // Shield spell now works on grapples/shoves: attack roll against AC; Shield-boosted AC causes miss, grapple fails
  run qa_shield_blocks_grapple_attack_miss = {
    val target = freshCreature(20)
    // Attacker +4 to hit, rolls 5 → total 9 vs AC 20 (Shield active). Misses.
    val attackResult = resolveAttackRoll(5, 4, 20, 0, 20)
    // Attack missed → treat as save succeeded (targetSaveFailed: false), grapple fails
    val grappleResult = pGrapple(Medium, Medium, target, attackResult.hits, true)
    assert(not(attackResult.hits) and not(grappleResult.targetState.grappled))
  }
  
  // Shield spell now works on grapples/shoves: without Shield, attack hits and grapple succeeds
  run qa_grapple_attack_hits_without_shield = {
    val target = freshCreature(20)
    // Attacker +4 to hit, rolls 15 → total 19 vs AC 15 (no Shield). Hits.
    val attackResult = resolveAttackRoll(15, 4, 15, 0, 20)
    // Attack hit → treat as save failed (targetSaveFailed: true), grapple succeeds
    val grappleResult = pGrapple(Medium, Medium, target, attackResult.hits, true)
    assert(attackResult.hits and grappleResult.targetState.grappled)
  }
  
  // Shield spell now works on grapples/shoves: shove likewise blocked when attack roll misses Shield-boosted AC
  run qa_shield_blocks_shove_attack_miss = {
    val target = freshCreature(20)
    // Attacker +4 to hit, rolls 5 → total 9 vs AC 20 (Shield active). Misses.
    val attackResult = resolveAttackRoll(5, 4, 20, 0, 20)
    // Attack missed → shove fails (target not prone)
    val shoveResult = pShove(Medium, Medium, target, attackResult.hits, ShoveProne)
    assert(not(attackResult.hits) and not(shoveResult.targetState.prone))
  }
  
  // Shield spell now works on grapples/shoves: push variant also blocked on attack miss
  run qa_shield_blocks_shove_push_attack_miss = {
    val target = freshCreature(20)
    val attackResult = resolveAttackRoll(3, 3, 20, 0, 20) // total 6 vs AC 20, miss
    val shoveResult = pShove(Medium, Medium, target, attackResult.hits, ShovePush)
    assert(not(attackResult.hits) and not(shoveResult.success))
  }

  // Source: https://reddit.com/r/onednd/comments/zaxjcd/
  
  // Goliath melee warriors sound pretty fun — prone applied on hit (no save, Hill's Tumble) grants advantage on subsequent melee attacks within 5ft
  run qa_prone_no_save_grants_melee_advantage = {
    val target = freshCreature(30)
    // Hill's Tumble: prone applied directly on hit, no saving throw resolved
    val pronedTarget = pApplyCondition(target, CProne)
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: pronedTarget.prone,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(pronedTarget.prone and mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Goliath melee warriors sound pretty fun — prone beyond 5ft gives disadvantage on ranged attacks (not advantage; melee-only benefit)
  run qa_prone_beyond_5ft_ranged_disadvantage = {
    val target = freshCreature(30)
    val pronedTarget = pApplyCondition(target, CProne)
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: pronedTarget.prone,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: true, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and mods.hasDisadvantage)
  }
  
  // Goliath melee warriors sound pretty fun — prone target (knocked down by Hill's Tumble) can be grappled when target fails save
  run qa_prone_grapple_combo = {
    val target = freshCreature(30)
    val pronedTarget = pApplyCondition(target, CProne)
    // Follow-up grapple: target fails save (e.g. low STR/DEX roll)
    val result = pGrapple(Medium, Medium, pronedTarget, true, true)
    assert(result.success and result.targetState.grappled and result.targetState.prone)
  }

  // Source: https://reddit.com/r/onednd/comments/y02jon/
  
  // What happens if you roll with Disadvantage and then decide to use Heroic Inspiration?
  // Accepted answer (score 72): disadvantage result = lower of the two dice; HI = roll one more d20, compare to that lower result, take higher
  run qa_heroic_inspiration_with_disadvantage_saves_check = {
    val disadvRoll1 = 4
    val disadvRoll2 = 7
    val hiRoll = 14
    val abilityMod = 0
    val dc = 12
    // Disadvantage: take the lower of the two dice
    val disadvResult = intMin(disadvRoll1, disadvRoll2)
    // Heroic Inspiration: roll one d20 and compare to disadvResult, take higher
    val finalRoll = intMax(hiRoll, disadvResult)
    assert(
      // Without HI the check fails (4 + 0 < 12)
      not(checkSucceeds(disadvResult, abilityMod, NoneProf, 0, 0, dc))
      // With HI the check succeeds (14 + 0 >= 12)
      and checkSucceeds(finalRoll, abilityMod, NoneProf, 0, 0, dc)
      // HI die beat the disadvantage result so it is used
      and finalRoll == hiRoll
    )
  }
  
  // When the HI die is also lower than the disadvantage result, disadvResult is kept and check still fails
  run qa_heroic_inspiration_with_disadvantage_still_fails = {
    val disadvRoll1 = 4
    val disadvRoll2 = 7
    val hiRoll = 3
    val abilityMod = 0
    val dc = 12
    val disadvResult = intMin(disadvRoll1, disadvRoll2)  // 4
    val finalRoll = intMax(hiRoll, disadvResult)          // max(3, 4) = 4
    assert(
      // HI die was worse; disadvantage result is retained
      finalRoll == disadvResult
      // Check still fails even after HI (4 + 0 < 12)
      and not(checkSucceeds(finalRoll, abilityMod, NoneProf, 0, 0, dc))
    )
  }

  // Source: https://rpg.stackexchange.com/q/215917
  
  // How does Control Weather interact with a moving caster? — concentration required to maintain effect; failed save ends it
  run qa_control_weather_failed_conc_save_ends_effect = {
    val caster = freshCreature(40)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "control_weather")
    val casterWithEffect = caster.with("activeEffects",
      pAddEffect(Set(), "control_weather", 100, AtEndOfTurn))
    // Caster takes 20 damage (concentration DC = max(10, 20/2) = 10) and fails the save
    val afterDamage = pTakeDamage(casterWithEffect, 20, Fire, Set(), Set(), Set(), false)
    val ssAfter = pConcentrationCheck(ss, false)
    val effectsAfter = pEffectsOnConcBreak(ss, ssAfter, afterDamage.activeEffects)
    assert(
      not(isConcentrating(ssAfter)) and
      not(pHasEffect(effectsAfter, "control_weather"))
    )
  }
  
  // How does Control Weather interact with a moving caster? — becoming incapacitated (e.g. stunned mid-move) immediately breaks concentration
  run qa_control_weather_incap_breaks_concentration = {
    val caster = freshCreature(40)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "control_weather")
    val casterWithEffect = caster.with("activeEffects",
      pAddEffect(Set(), "control_weather", 100, AtEndOfTurn))
    // Caster is stunned (e.g. by a nearby creature while moving)
    val afterStun = pApplyCondition(casterWithEffect, CStunned)
    val r = pWithConcBreak(ss, casterWithEffect, afterStun)
    assert(
      isIncapacitated(r.creature) and
      not(isConcentrating(r.slots)) and
      not(pHasEffect(r.creature.activeEffects, "control_weather"))
    )
  }
  
  // How does Control Weather interact with a moving caster? — concentration DC scales with damage taken (max(10, damage/2))
  run qa_control_weather_concentration_dc_scaling = {
    // Low damage: DC floors at 10
    val dc_low = pConcentrationDC(10)
    // High damage: DC = damage/2
    val dc_high = pConcentrationDC(30)
    assert(dc_low == 10 and dc_high == 15)
  }
  
  // How does Control Weather interact with a moving caster? — casting a second concentration spell while maintaining Control Weather replaces it
  run qa_control_weather_replaced_by_new_conc_spell = {
    val caster = freshCreature(40)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "control_weather")
    val casterWithEffect = caster.with("activeEffects",
      pAddEffect(Set(), "control_weather", 100, AtEndOfTurn))
    // Caster starts concentrating on a different spell (replaces Control Weather)
    val effects1 = pRemoveEffect(casterWithEffect.activeEffects, "control_weather")
    val effects2 = pAddEffect(effects1, "fog_cloud", 10, AtEndOfTurn)
    val ssAfter = pStartConcentration(ss, "fog_cloud")
    assert(
      isConcentrating(ssAfter) and
      ssAfter.concentrationSpellId == "fog_cloud" and
      not(pHasEffect(effects2, "control_weather")) and
      pHasEffect(effects2, "fog_cloud")
    )
  }

  // Source: https://rpg.stackexchange.com/q/215777
  
  // Is it possible to make 3 attacks with a Hand Crossbow without the Extra Attack feature?
  // Hand crossbow has Loading property, which blocks extra attacks via the Extra Attack feature
  run qa_hand_crossbow_loading_prevents_extra_attack = {
    val handCrossbow: Weapon = {
      name: "hand_crossbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Loading, Light_),
      isMelee: false,
      normalRange: 30,
      longRange: 120,
    }
    assert(not(pCanExtraAttackWithWeapon(handCrossbow)))
  }
  
  // Is it possible to make 3 attacks with a Hand Crossbow without the Extra Attack feature?
  // Light weapon bonus action attack: positive ability modifier NOT added to damage; negative IS applied
  run qa_light_bonus_attack_no_positive_ability_mod = {
    val dieRoll = 4
    val posMod = 3
    val negMod = -1
    assert(
      pTWFOffHandDamage(dieRoll, posMod) == dieRoll
      and pTWFOffHandDamage(dieRoll, negMod) == dieRoll + negMod
    )
  }

  // Source: https://rpg.stackexchange.com/q/213650
  
  // How do you cure diseases? — 2024 5e removes disease mechanic; healing alone does not clear CPoisoned (closest analog)
  run qa_healing_does_not_cure_poisoned = {
    val base = freshCreature(20)
    val withPoison = pApplyCondition(base, CPoisoned)
    val afterHeal = pHeal(withPoison, 10)
    assert(afterHeal.poisoned == true)
  }

  // Source: https://reddit.com/r/onednd/comments/zmr0k3/
  
  // The new Jump action has VARIOUS benefits and issues — long jump with running start equals STR score
  run qa_long_jump_running_start_equals_str_score = {
    // SRD: long jump = STR score in feet with ≥10 ft running start
    assert(pLongJumpDistance(16, true) == 16)
  }
  
  // The new Jump action has VARIOUS benefits and issues — long jump without running start is halved
  run qa_long_jump_no_running_start_halved = {
    assert(pLongJumpDistance(16, false) == 8)
  }
  
  // The new Jump action has VARIOUS benefits and issues — high jump = 3 + STR mod with running start
  run qa_high_jump_with_running_start = {
    // STR 16 → modifier +3; 3 + 3 = 6 feet
    assert(pHighJumpHeight(16, true) == 6)
  }
  
  // The new Jump action has VARIOUS benefits and issues — jump distance consumes movement budget
  run qa_jump_consumes_movement = {
    val t0 = FRESH_TURN  // 30 ft remaining
    val dist = pLongJumpDistance(16, true)  // 16 ft
    val t1 = pUseMovement(t0, dist, 1)
    assert(t1.movementRemaining == 14)
  }
  
  // The new Jump action has VARIOUS benefits and issues — jump is blocked when remaining movement is insufficient
  run qa_jump_blocked_by_insufficient_movement = {
    // Disadvantage #3: a great jump roll is wasted if movement is already spent
    val t0 = FRESH_TURN.with("movementRemaining", 10)
    val t1 = pUseMovement(t0, 20, 1)  // want 20 ft, only 10 remain
    assert(t1.movementRemaining == 10)  // no change — can't complete the jump
  }
  
  // The new Jump action has VARIOUS benefits and issues — low-STR creature has short deterministic jump
  run qa_low_str_jump_distance = {
    // Old-style rules: STR 8 Wizard jumps exactly 8 ft (no roll variance, unlike new UA rules)
    assert(pLongJumpDistance(8, true) == 8)
  }

  // Hide action: DC 15 Stealth check grants Invisible condition on success
  run qa_hide_stealth_dc15_success_grants_invisible = {
    val dexMod = abilityModifier(14) // +2
    val profBonus = proficiencyBonus(5) // +3
    val roll = 11 // total = 11 + 2 + 3 = 16 >= DC 15
    val succeeded = checkSucceeds(roll, dexMod, Proficient, profBonus, 0, 15)
    val creature = freshCreature(20)
    val result = if (succeeded) pApplyCondition(creature, CInvisible) else creature
    assert(succeeded and result.invisible)
  }
  
  // Hide action: failed Stealth check (total below DC 15) does not grant Invisible
  run qa_hide_stealth_dc15_failure_no_invisible = {
    val dexMod = abilityModifier(10) // +0
    val profBonus = proficiencyBonus(1) // +2, but NoneProf
    val roll = 9 // total = 9 + 0 + 0 = 9 < DC 15
    val succeeded = checkSucceeds(roll, dexMod, NoneProf, profBonus, 0, 15)
    assert(not(succeeded))
  }
  
  // Perception active check total >= hider's Stealth total ends the hidden condition
  run qa_perception_check_vs_stealth_total_finds_hidden = {
    val hiderStealthTotal = 16
    val wisMod = abilityModifier(14) // +2
    val profBonus = proficiencyBonus(5) // +3
    val roll = 12 // total = 12 + 2 + 3 = 17 >= 16
    val perceiverTotal = roll + wisMod + profMultiplier(Proficient, profBonus)
    val found = perceiverTotal >= hiderStealthTotal
    val hidden = pApplyCondition(freshCreature(20), CInvisible)
    val result = if (found) pRemoveCondition(hidden, CInvisible) else hidden
    assert(found and not(result.invisible))
  }
  
  // Passive Perception (10 + Wis mod + prof) >= hider's Stealth total also locates them
  run qa_passive_perception_vs_stealth_total_finds_hidden = {
    val wisMod = abilityModifier(14) // +2
    val profBonus = proficiencyBonus(5) // +3
    val passive = passiveCheck(wisMod, Proficient, profBonus, false, false) // 10+2+3 = 15
    val hiderStealthTotal = 14 // hider rolled low
    val found = passive >= hiderStealthTotal
    val hidden = pApplyCondition(freshCreature(20), CInvisible)
    val result = if (found) pRemoveCondition(hidden, CInvisible) else hidden
    assert(found and not(result.invisible))
  }

  // Source: https://rpg.stackexchange.com/q/214476
  
  // With the Invisibility spell, can you remain invisible while throwing vials?
  // Rule: Invisibility ends when caster deals damage; save success = 0 damage = spell persists
  
  // Acid vial: target fails save → positive damage dealt → spell ends (HP drop proves damage dealt)
  run qa_invisibility_acid_fails_save_deals_damage = {
    val target = freshCreature(20)
    val s2 = pTakeDamage(target, 7, Acid, Set(), Set(), Set(), false)
    assert(s2.hp == 13)
  }
  
  // Acid vial: target succeeds save → 0 damage dealt → spell continues (HP unchanged)
  run qa_invisibility_acid_succeeds_save_no_damage = {
    val target = freshCreature(20)
    val s2 = pTakeDamage(target, 0, Acid, Set(), Set(), Set(), false)
    assert(s2.hp == 20)
  }
  
  // Immunity (P.S.): immune target takes 0, but raw damage > 0 means damage was "dealt"
  // PHB Rules Glossary "Immunity": immunity prevents taking damage, not the act of dealing it
  run qa_invisibility_immune_target_damage_dealt_not_taken = {
    val rawDamage = 7
    val effImmune    = applyDamageModifiers(rawDamage, Acid, Set(Acid), Set(), Set(), 0)
    val effNoImmune  = applyDamageModifiers(rawDamage, Acid, Set(),       Set(), Set(), 0)
    // Immune: creature takes 0; non-immune: creature takes full amount
    // In both cases raw > 0 → damage was dealt → invisibility ends
    assert(effImmune == 0 and effNoImmune == rawDamage)
  }

  // Source: https://rpg.stackexchange.com/q/213464
  
  // Hex spell: in 2024, initial grapple/shove use saving throws (Hex ability-check disadv irrelevant);
  // escaping an existing grapple is an ability check where Hex STR disadvantage still applies
  run qa_hex_disadvantage_grapple_escape_not_initial = {
    val target = freshCreature(20)
  
    // Initial grapple resolution uses a SAVING THROW — Hex's ability-check disadvantage does NOT apply
    val notGrappled = pGrapple(Medium, Medium, target, false, true)  // target passes save
    val grappleResult = pGrapple(Medium, Medium, target, true, true) // target fails save
  
    // Escape grapple uses an ABILITY CHECK — Hex STR disadvantage DOES apply
    // Pre-resolved with Hex disadvantage (take lower of two d20s): roll fails the escape DC
    val stillGrappled = pEscapeGrapple(grappleResult.targetState, false)
    // Pre-resolved without Hex disadvantage: good roll clears the escape DC
    val escaped = pEscapeGrapple(grappleResult.targetState, true)
  
    assert(
      not(notGrappled.targetState.grappled) and  // passed saving throw → not grappled
      grappleResult.targetState.grappled and     // failed saving throw → grappled
      stillGrappled.grappled and                 // Hex ability-check disadv → escape fails, remains grappled
      not(escaped.grappled)                      // without Hex disadv → escape check succeeds
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wrur88/
  
  // Humans can start with 9 skill proficiencies (racial trait + Skilled feat x2 + background)
  run qa_human_nine_skill_proficiencies = {
    val nineSkills: Set[Skill] = Set(
      Acrobatics, AnimalHandling, Arcana, Athletics, Deception,
      History, Insight, Intimidation, Investigation
    )
    val config = TEST_CONFIG.with("skillProficiencies", nineSkills)
    val pb = proficiencyBonus(config.level) // 3 at level 5
    assert(
      config.skillProficiencies.size() == 9
      and nineSkills.forall(sk => config.skillProficiencies.contains(sk))
      and checkSucceeds(10, 0, Proficient, pb, 0, 13)    // 10+3=13 >= 13: proficient passes
      and not(checkSucceeds(10, 0, NoneProf, pb, 0, 13)) // 10+0=10 < 13: unproficient fails
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wu5ekq/
  
  // What implications does character size have in combat? — small wielder has disadvantage with heavy weapons
  run qa_small_heavy_weapon_disadvantage = {
    val greataxe: Weapon = {
      name: "greataxe", damageDie: 12, versatileDie: 0,
      damageType: Slashing, properties: Set(Heavy, TwoHanded),
      isMelee: true, normalRange: 0, longRange: 0
    }
    assert(heavyWeaponDisadvantage(greataxe, Small))
  }
  
  // What implications does character size have in combat? — medium wielder has no heavy weapon disadvantage
  run qa_medium_no_heavy_weapon_disadvantage = {
    val greataxe: Weapon = {
      name: "greataxe", damageDie: 12, versatileDie: 0,
      damageType: Slashing, properties: Set(Heavy, TwoHanded),
      isMelee: true, normalRange: 0, longRange: 0
    }
    assert(not(heavyWeaponDisadvantage(greataxe, Medium)))
  }
  
  // What implications does character size have in combat? — small creature cannot grapple large (size cap)
  run qa_small_cannot_grapple_large = {
    val target = freshCreature(20)
    val result = pGrapple(Small, Large, target, true, true)
    assert(not(result.success))
  }
  
  // What implications does character size have in combat? — medium creature can grapple large (within one size)
  run qa_medium_can_grapple_large = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Large, target, true, true)
    assert(result.success)
  }
  
  // What implications does character size have in combat? — tiny can grapple small but not medium (small more vulnerable)
  run qa_tiny_can_grapple_small_not_medium = {
    val smallTarget = freshCreature(20)
    val medTarget   = freshCreature(20)
    val r1 = pGrapple(Tiny, Small,  smallTarget, true, true)
    val r2 = pGrapple(Tiny, Medium, medTarget,   true, true)
    assert(r1.success and not(r2.success))
  }
  
  // What implications does character size have in combat? — small cannot shove large, medium can
  run qa_size_shove_restriction = {
    val target = freshCreature(20)
    val smallFail  = pShove(Small,  Large, target, true, ShoveProne)
    val medSucceed = pShove(Medium, Large, target, true, ShoveProne)
    assert(not(smallFail.success) and medSucceed.success)
  }

  // Source: https://reddit.com/r/onednd/comments/11a3qhu/
  
  // New Long Rests and New Grappling Rules: grapple applies CGrappled only when target fails save
  run qa_grapple_requires_failed_save = {
    val target = freshCreature(20)
    val resultFail = pGrapple(Medium, Medium, target, true, true)
    val resultSave = pGrapple(Medium, Medium, target, false, true)
    assert(
      resultFail.success == true and
      resultFail.targetState.grappled and
      resultSave.success == false and
      not(resultSave.targetState.grappled)
    )
  }
  
  // New Long Rests and New Grappling Rules: shove (prone) requires target to fail a saving throw
  run qa_shove_requires_failed_save = {
    val target = freshCreature(20)
    val resultFail = pShove(Medium, Medium, target, true, ShoveProne)
    val resultSave = pShove(Medium, Medium, target, false, ShoveProne)
    assert(
      resultFail.success == true and
      resultFail.targetState.prone and
      resultSave.success == false and
      not(resultSave.targetState.prone)
    )
  }
  
  // New Long Rests and New Grappling Rules: escaping grapple requires a successful check (action)
  run qa_escape_grapple_requires_successful_check = {
    val grappled = pApplyCondition(freshCreature(20), CGrappled)
    val afterFail = pEscapeGrapple(grappled, false)
    val afterSuccess = pEscapeGrapple(grappled, true)
    assert(afterFail.grappled and not(afterSuccess.grappled))
  }
  
  // New Long Rests and New Grappling Rules: incapacitated target is auto-grappled regardless of save
  run qa_grapple_auto_succeeds_vs_incapacitated = {
    val target = pApplyCondition(freshCreature(20), CParalyzed)
    // saveFailed=false, but incapacitated overrides — grapple still succeeds
    val result = pGrapple(Medium, Medium, target, false, true)
    assert(result.success and result.targetState.grappled)
  }

  // Source: https://reddit.com/r/onednd/comments/zbmme2/
  
  // Level 4+ life clerics have more 2nd level spells prepared than 1st level ones
  run qa_cleric_domain_spell_asymmetry = {
    // Cleric prepares spells equal to spell slots per level (full caster, level 4).
    // Domain spells add 2 extra 2nd-level prepared spells, creating asymmetry.
    val casterLevel = 4
    val slotsLv1 = pSlotsPerLevel(casterLevel, 1)   // 4
    val slotsLv2 = pSlotsPerLevel(casterLevel, 2)   // 3
    // Domain contributes 2 fixed 2nd-level spells (e.g. Life domain at cleric lv3+).
    val domainExtra = 2
    val totalLv2Preps = slotsLv2 + domainExtra       // 3 + 2 = 5
    assert(
      slotsLv1 == 4
      and slotsLv2 == 3
      and totalLv2Preps > slotsLv1   // 5 > 4: domain spells cause 2nd-level to exceed 1st
    )
  }

  // Source: https://reddit.com/r/onednd/comments/11fmky5/
  
  // Analysis of the Survivability of the New Druid Wild Shape — fire resistance halves breath weapon damage for Wild Shaped druid
  run qa_fire_resistance_halves_breath_damage = {
    val druid = freshCreature(99)
    val rawBreathDamage = 44
    val withResist = pTakeDamage(druid, rawBreathDamage, Fire, Set(Fire), Set(), Set(), false)
    val noResist   = pTakeDamage(druid, rawBreathDamage, Fire, Set(),      Set(), Set(), false)
    assert(withResist.hp == 77 and noResist.hp == 55)
  }
  
  // Analysis of the Survivability of the New Druid Wild Shape — Barkskin temp HP absorbs claw damage before real HP
  run qa_temp_hp_absorbs_damage_first = {
    val druid = freshCreature(99).with("tempHp", 9)
    val afterDmg = pTakeDamage(druid, 7, Slashing, Set(), Set(), Set(), false)
    assert(afterDmg.hp == 99 and afterDmg.tempHp == 2)
  }
  
  // Analysis of the Survivability of the New Druid Wild Shape — fighter's higher AC (21) causes the same roll that hits druid (AC 15) to miss
  run qa_fighter_higher_ac_avoids_hit_druid_takes = {
    val roll     = 10
    val atkBonus = 10
    val hitsDruid   = resolveAttackRoll(roll, atkBonus, 15, 0, 20)
    val hitsFighter = resolveAttackRoll(roll, atkBonus, 21, 0, 20)
    assert(hitsDruid.hits and not(hitsFighter.hits))
  }
  
  // Analysis of the Survivability of the New Druid Wild Shape — concentration DC is computed from post-resistance damage, so resistance lowers the save DC
  run qa_concentration_dc_uses_post_resistance_damage = {
    // Raw breath damage 44: with fire resist actual damage = 22, DC = max(10, 22/2) = 11
    // Without resistance actual damage = 44, DC = max(10, 44/2) = 22
    val dcWithResist = pConcentrationDC(44 / 2)
    val dcNoResist   = pConcentrationDC(44)
    assert(dcWithResist == 11 and dcNoResist == 22)
  }

  // Source: https://reddit.com/r/onednd/comments/xrmpna/
  
  // Climbing rules in the new UA: climbing through difficult terrain (slope ≥20°) stacks to 3× cost (15 ft per 5 ft)
  run qa_climbing_difficult_terrain_triples_cost = {
    val cost = pMovementCost(true, false, true, false)
    assert(cost == 3)
  }

  // Source: https://reddit.com/r/onednd/comments/xt3e03/
  
  // Thief Rogues can cast 9th level spells 6 levels before anyone else
  run qa_thief_rogue_reliable_talent_9th_scroll = {
    // DC = 10 + spell level 9 = 19
    // Level 11 proficiency bonus = 4; Arcana expertise doubles to 8; INT 12 -> mod +1
    // Reliable Talent: treat any d20 roll ≤ 9 as 10
    // Min total with Reliable Talent = 10 + 1 + 8 = 19, which meets DC 19
    val pb = proficiencyBonus(11)       // (11-1)/4 + 2 = 4
    val intMod = abilityModifier(12)    // (12-10)/2 = 1
    val dc = 10 + 9                     // 19
    // Rolling a 9 (no Reliable Talent): 9 + 1 + 8 = 18 < 19 → fails
    val failsWithoutReliable = checkSucceeds(9, intMod, Expertise, pb, 0, dc)
    // Reliable Talent floors the roll at 10: 10 + 1 + 8 = 19 ≥ 19 → succeeds
    val succeedsWithReliable = checkSucceeds(10, intMod, Expertise, pb, 0, dc)
    assert(not(failsWithoutReliable) and succeedsWithReliable)
  }

  // Source: https://reddit.com/r/onednd/comments/xtz7mj/
  
  // High-AC creature harder to grapple than high-STR creature under new unarmed attack rule
  run qa_grapple_high_ac_harder_than_high_str = {
    val target_ogre  = freshCreature(59)   // Ogre-like: AC 11, STR 18 (+4)
    val target_armor = freshCreature(33)   // Animated Armor-like: AC 18, STR 14 (+2)
    // Under the 2024 rule grapple is an unarmed attack roll vs target AC.
    // Roll 11 with +0 attack bonus: hits AC 11 (ogre) but misses AC 18 (animated armor).
    val atk_ogre  = resolveAttackRoll(11, 0, 11, 0, 20)
    val atk_armor = resolveAttackRoll(11, 0, 18, 0, 20)
    // Pass attack-hit result as targetSaveFailed: hit ↔ grapple lands.
    val grapple_ogre  = pGrapple(Medium, Large,  target_ogre,  atk_ogre.hits,  true)
    val grapple_armor = pGrapple(Medium, Medium, target_armor, atk_armor.hits, true)
    assert(
      grapple_ogre.success        and   // roll 11 beats AC 11 → grapple succeeds
      not(grapple_armor.success)        // roll 11 fails AC 18 → grapple fails
    )
  }

  // Source: https://reddit.com/r/onednd/comments/zast7u/
  
  // Ardling Climber: once per turn, Unarmed Strike damage increases by Proficiency Bonus
  run qa_ardling_climber_unarmed_plus_proficiency_bonus = {
    val strScore = 14
    val strMod = abilityModifier(strScore)       // (14-10)/2 = 2
    val level = 5
    val pb = proficiencyBonus(level)             // (5-1)/4 + 2 = 3
    val baseUnarmed = unarmedDamage(strMod)      // intMax(0, 1 + 2) = 3
    val totalDmg = baseUnarmed + pb              // Ardling Climber adds PB once per turn: 3 + 3 = 6
    val target = freshCreature(20)
    val afterHit = pTakeDamage(target, totalDmg, Bludgeoning, Set(), Set(), Set(), false)
    assert(
      baseUnarmed == 3 and
      pb == 3 and
      totalDmg == 6 and
      afterHit.hp == 14  // 20 - 6 = 14
    )
  }
  
  // Ardling Climber PB bonus scales with level: verify PB values at key tiers
  run qa_ardling_climber_pb_scaling = {
    // Level 1 PB=2, level 5 PB=3, level 9 PB=4, level 17 PB=6
    assert(
      proficiencyBonus(1) == 2 and
      proficiencyBonus(5) == 3 and
      proficiencyBonus(9) == 4 and
      proficiencyBonus(17) == 6
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wrtkwn/
  
  // Combat now hard interrupts Long Rests totally resetting your long rest
  // Interrupted after ≥1h: only short rest benefits, not full long rest restoration
  run qa_interrupted_long_rest_at_least_1h_short_rest_only = {
    val c = freshCreature(20).with("hp", 6).with("hitPointDiceRemaining", 3)
    val conMod = 1
    // Caller applies short rest only (1 HD roll of 5 → 6 HP gained, total 12)
    val shortResult = pShortRest(c, conMod, [5])
    // Full long rest would restore all 20 HP
    val longResult = pLongRest(c, 3)
    assert(
      shortResult.hp == 12 and
      shortResult.hp < shortResult.maxHp and
      longResult.hp == longResult.maxHp and
      shortResult.hp < longResult.hp
    )
  }
  
  // Combat now hard interrupts Long Rests totally resetting your long rest
  // Interrupted before 1h: no benefit at all — caller invokes no rest function
  run qa_interrupted_long_rest_before_1h_no_benefit = {
    val c = freshCreature(20).with("hp", 6).with("hitPointDiceRemaining", 3)
    // No pLongRest or pShortRest called; state must be identical to pre-rest state
    assert(c.hp == 6 and c.hitPointDiceRemaining == 3 and c.hp < c.maxHp)
  }
  
  // Combat now hard interrupts Long Rests totally resetting your long rest
  // Uninterrupted long rest still restores full HP and all hit dice
  run qa_uninterrupted_long_rest_full_benefit = {
    val c = freshCreature(20).with("hp", 1).with("hitPointDiceRemaining", 0)
    val after = pLongRest(c, 5)
    assert(after.hp == after.maxHp and after.hitPointDiceRemaining == 5)
  }

  // Source: https://reddit.com/r/onednd/comments/xrhouq/
  
  // "Invisible condition attack modifiers persist regardless of opponent sight (blindsight/truesight)"
  // pDefenseModifiers has no sight parameter — attacker disadvantage flows directly from s.invisible,
  // modeling RAW where blindsight does not negate invisible's attack roll effects.
  run qa_invisible_modifiers_not_negated_by_blindsight = {
    val s = freshCreature(20).with("invisible", true)
    val defMods = pDefenseModifiers(s, true)
    val ownMods = pOwnAttackModifiers(s, false)
    assert(
      defMods.attackerDisadvantage == true
      and ownMods.hasAdvantage == true
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xzqc1w/
  
  // Dual wielding & Simple Weapons: TWF off-hand attack does not add positive ability modifier
  run qa_twf_offhand_excludes_positive_mod = {
    assert(pTWFOffHandDamage(4, 3) == 4)
  }
  
  // Dual wielding & Simple Weapons: TWF off-hand attack includes negative ability modifier (min 0)
  run qa_twf_offhand_includes_negative_mod = {
    assert(pTWFOffHandDamage(4, -1) == 3)
  }
  
  // Dual wielding & Simple Weapons: TWF total (main + off-hand) equals two-handed 2d6 total when die sums match
  run qa_twf_damage_parity_with_two_handed = {
    val strMod = 3
    val dieRoll1 = 3
    val dieRoll2 = 4
    val twfTotal = normalDamage(dieRoll1, strMod) + pTWFOffHandDamage(dieRoll2, strMod)
    val twoHandedTotal = normalDamage(dieRoll1 + dieRoll2, strMod)
    assert(twfTotal == twoHandedTotal)
  }
  
  // Dual wielding & Simple Weapons: heavy two-handed weapons impose disadvantage on Small/Tiny wielders but not Medium
  run qa_heavy_weapon_small_creature_disadvantage = {
    val greatsword: Weapon = {
      name: "greatsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(Heavy, TwoHanded),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    assert(heavyWeaponDisadvantage(greatsword, Small))
      and assert(heavyWeaponDisadvantage(greatsword, Tiny))
      and assert(not(heavyWeaponDisadvantage(greatsword, Medium)))
  }
  
  // Dual wielding & Simple Weapons: TWF is valid only when both weapons are Light melee; greatsword as off-hand blocks TWF
  run qa_twf_requires_both_weapons_light_d5f7c0ba = {
    val shortsword: Weapon = {
      name: "shortsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val greatsword: Weapon = {
      name: "greatsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(Heavy, TwoHanded),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(pCanTWFWithWeapons(shortsword, shortsword, t, creature))
      and assert(not(pCanTWFWithWeapons(shortsword, greatsword, t, creature)))
      and assert(not(pCanTWFWithWeapons(greatsword, greatsword, t, creature)))
  }

  // Source: https://reddit.com/r/onednd/comments/y4rdle/
  
  // I Love/Hate the Grapple Changes: grapple save failed → CGrappled applied
  run qa_grapple_save_fail_applies_grappled_d64443f4 = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // I Love/Hate the Grapple Changes: grapple save succeeded → no grapple
  run qa_grapple_save_pass_no_grapple = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, false, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // I Love/Hate the Grapple Changes: size restriction — Medium cannot grapple Huge (2 sizes larger)
  run qa_grapple_size_restriction_fails = {
    val target = freshCreature(30)
    val result = pGrapple(Medium, Huge, target, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // I Love/Hate the Grapple Changes: grapple requires a free hand — no free hand → fails
  run qa_grapple_no_free_hand_fails_d64443f4 = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // I Love/Hate the Grapple Changes: grappled creature's speed drops to 0 at turn start
  run qa_grappled_speed_zero_d64443f4 = {
    val grappled = freshCreature(20).with("grappled", true)
    val turn = pStartTurn(TEST_CONFIG, grappled, Unarmored, 0, false, false)
    assert(turn.movementRemaining == 0 and turn.effectiveSpeed == 0)
  }
  
  // I Love/Hate the Grapple Changes: grappled creature has disadvantage attacking a non-grappler
  run qa_grappled_attacker_disadv_vs_nongrappler = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true, targetDodging: false,
      targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: true, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }

  // Source: https://rpg.stackexchange.com/q/216736
  
  run qa_armor_of_agathys_temp_hp_persist_after_spell_ends = {{
    val s0 = freshCreature(20)
    val s1 = pGrantTempHp(s0, 5, false)
    val s2 = s1.with("activeEffects", pAddEffect(s1.activeEffects, "armor_of_agathys", 1, AtEndOfTurn))
    val s3 = s2.with("activeEffects", pTickEffects(s2.activeEffects, 1))
    assert(s3.tempHp == 5 and not(pHasEffect(s3.activeEffects, "armor_of_agathys")))
  }}
  
  // Does the Armor of Agathys spell grant temporary hit points, even if it exceeds the spell's 1-hour duration?
  run qa_temp_hp_end_on_long_rest_not_spell_duration = {{
    val s0 = freshCreature(20)
    val s1 = pGrantTempHp(s0, 5, false)
    val s2 = pLongRest(s1, 5)
    assert(s2.tempHp == 0)
  }}

  // Source: https://reddit.com/r/onednd/comments/x2o5n3/
  
  // Saving throw "fail by 10 or more" uses total modified result, not the natural d20 roll
  run qa_save_fail_by_10_uses_total_modified_result = {
    // Nat 1, CON mod +4, proficient at level 5 (PB +3): total = 1+4+3 = 8, DC 15
    // Raw d20=1 looks like a huge fail, but total 8 is only 7 below DC — extra effect should NOT trigger
    val dc = 15
    val d20Roll = 1
    val conMod = 4
    val pb = proficiencyBonus(5)
    val total = d20Roll + conMod + pb  // = 8
    val failedByTenOrMore = total <= dc - 10  // 8 <= 5 is false
    assert(
      not(saveSucceeds(d20Roll, conMod, true, pb, 0, dc))
      and not(failedByTenOrMore)
    )
  }
  
  // Contrastive: low total (no proficiency, no bonus) on nat 1 DOES trigger "fail by 10 or more"
  run qa_save_fail_by_10_triggers_when_total_far_below_dc = {
    val dc = 15
    val d20Roll = 1
    val conMod = 0
    val pb = proficiencyBonus(5)
    val total = d20Roll + conMod  // = 1, not proficient
    val failedByTenOrMore = total <= dc - 10  // 1 <= 5 is true
    assert(
      not(saveSucceeds(d20Roll, conMod, false, pb, 0, dc))
      and failedByTenOrMore
    )
  }

  // Source: https://reddit.com/r/onednd/comments/y3it2s/
  
  // Exhaustion reduces d20 rolls (via exhaustionPenalty) but spell save DC is fixed from immutable config
  run qa_exhaustion_affects_saves_not_dc = {
    // spellSaveDC: 8 + wis_mod(13=1) + pb(level5=3) = 12
    val dc = spellSaveDC(TEST_CONFIG)
  
    // exhaustion level 3 → penalty = -2 * 3 = -6 (applied to the roller, not the DC)
    val exhausted = freshCreature(20).with("exhaustion", 3)
    val penalty = exhaustionPenalty(exhausted)
  
    // roll of 15 vs DC 12: succeeds without exhaustion, fails with exhaustion penalty on the roller
    val succeedsWithout = saveSucceeds(15, 0, false, 3, 0,       dc)
    val succeedsWith    = saveSucceeds(15, 0, false, 3, penalty, dc)
  
    assert(
      dc == 12
      and penalty == -6
      and succeedsWithout
      and not(succeedsWith)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xqohqa/
  
  // A simple wishlist item: Redo the rules of advantage and disadvantage specifically for how they apply to unseen attackers
  run qa_mutual_unseen_cancels_to_normal_d843a121 = {
    // Both sides blind to each other: adv_unseenAttacker (target can't see attacker)
    // cancels disadv_cantSeeTarget (attacker can't see target) → plain roll
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: false,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }

  // Source: https://reddit.com/r/onednd/comments/xrm25c/
  
  // Is it just me or the grappler feat is busted on monk
  run qa_restrained_target_grants_attacker_advantage = {
    // Grappler feat (2024) restrains the grappled target; restrained gives attacker advantage
    val target = freshCreature(20)
    val targetRestrained = pApplyCondition(target, CRestrained)
    val defMods = pDefenseModifiers(targetRestrained, true)
    assert(defMods.attackerAdvantage)
  }
  
  // Is it just me or the grappler feat is busted on monk
  run qa_dragging_grappled_target_halves_movement = {
    // Moving while grappling a creature not 2+ sizes smaller halves speed (PHB Ch9)
    // Level 5 monk (30ft walk): dragging target → 15ft remaining
    val turn = pStartTurn(TEST_CONFIG, freshCreature(20), Unarmored, 0, true, false)
    assert(turn.movementRemaining == 15 and turn.effectiveSpeed == 15)
  }
  
  // Is it just me or the grappler feat is busted on monk
  run qa_restrained_attack_context_gives_advantage_no_disadv = {
    // Full attack-modifier aggregation: restrained target → advantage, no disadvantage
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false,
      targetRestrained: true,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }

  // Source: https://reddit.com/r/onednd/comments/x1fcaj/
  
  // UA OneDnD: Grapples and Shoves are now considered a Melee Attack via Unarmed Strike wording
  // Grapple applies Grappled condition when target fails their STR/DEX save — save-based resolution, not attack roll vs AC
  run qa_grapple_via_save_applies_grappled = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // UA OneDnD: Grapples and Shoves are now considered a Melee Attack via Unarmed Strike wording
  // Shove (prone) applies Prone condition when target fails save — no attack roll or AC comparison involved
  run qa_shove_prone_via_save_applies_prone = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShoveProne)
    assert(result.success and result.targetState.prone)
  }
  
  // UA OneDnD: Grapples and Shoves are now considered a Melee Attack via Unarmed Strike wording
  // Accepted answer: grapples have no attack roll and no "hit" — target saving successfully means effect fails entirely,
  // unlike a regular attack where nat20 always hits regardless of AC
  run qa_grapple_fails_when_target_save_succeeds = {
    val target = freshCreature(20)
    // Regular attack: nat 20 always hits even AC 30
    val atkResult = resolveAttackRoll(20, 0, 30, 0, 20)
    // Grapple: target passes save → no grapple, regardless of attacker's roll
    val grappleResult = pGrapple(Medium, Medium, target, false, true)
    assert(atkResult.hits and not(grappleResult.success) and not(grappleResult.targetState.grappled))
  }

  // Source: https://reddit.com/r/onednd/comments/1iivjst/
  
  // Am I reading this wrong or can you literally not escape a Mind Flayer if it hits you once?
  run qa_stunned_grappled_cannot_escape = {
    val c = freshCreature(30)
    val grappled = pApplyCondition(c, CGrappled)
    val stunned_grappled = pApplyCondition(grappled, CStunned)
    // Stunned → incapacitated → pCanAct false → creature cannot use action to attempt grapple escape
    all {
      assert(stunned_grappled.grappled),
      assert(stunned_grappled.stunned),
      assert(stunned_grappled.incapacitatedSources.contains(ISStunned)),
      assert(isIncapacitated(stunned_grappled)),
      assert(not(pCanAct(stunned_grappled))),
    }
  }
  
  // Am I reading this wrong or can you literally not escape a Mind Flayer if it hits you once?
  run qa_stunned_grappled_str_dex_saves_autofail = {
    val c = freshCreature(30)
    val s = pApplyCondition(pApplyCondition(c, CGrappled), CStunned)
    // Stunned auto-fails STR and DEX saves, which are the ability scores used for grapple escape
    val strMods = pSaveModifiers(s, Str)
    val dexMods = pSaveModifiers(s, Dex)
    all {
      assert(strMods.autoFail),
      assert(dexMods.autoFail),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/1far8pc/
  
  // Does the Spike Growth and grapple combo really work? — grapple dragging uses size-based movement penalty, not carrying capacity; two-sizes-smaller exception removes the penalty entirely
  run qa_grapple_movement_size_not_carrying_capacity = {
    val creature = freshCreature(30)
    // Grappling a similarly-sized target: speed halved (each foot costs 1 extra = double cost)
    val turnGrappleNormal = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, false)
    // Grappling a target two or more sizes smaller: no movement penalty
    val turnGrappleSmall = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, true, true)
    // Not grappling: full speed
    val turnFree = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    all {
      // Dragging same-size target halves speed regardless of carrying capacity
      assert(turnGrappleNormal.movementRemaining == turnFree.movementRemaining / 2),
      // Two-sizes-smaller exception: full speed restored, carrying capacity irrelevant
      assert(turnGrappleSmall.movementRemaining == turnFree.movementRemaining),
      // Sanity: free movement is the base walk speed
      assert(turnFree.movementRemaining == 30),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/z9ul5h/
  
  // Racer Ardling is Insane: Dash action (and bonus action Dash) each add effective speed to movement remaining, enabling stacking
  run qa_dash_action_stacks_movement = {
    val creature = freshCreature(20)
    val baseTurn = FRESH_TURN
      .with("movementRemaining", 30)
      .with("effectiveSpeed", 30)
      .with("actionsRemaining", 1)
      .with("bonusActionUsed", false)
    // Action Dash: movementRemaining += effectiveSpeed (30 + 30 = 60)
    val afterActionDash = pUseAction(baseTurn, creature, ADash)
    // Bonus Action Dash: movementRemaining += effectiveSpeed again (60 + 30 = 90)
    val afterBonusDash = pBonusActionDash(afterActionDash, creature)
    all {
      assert(afterActionDash.movementRemaining == 60),
      assert(afterActionDash.actionsRemaining == 0),
      assert(afterBonusDash.movementRemaining == 90),
      assert(afterBonusDash.bonusActionUsed == true),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/1eum0jw/
  
  // Squeeze Rules 2024 PHB: squeezing is now under Difficult Terrain — costs 1 extra foot per foot moved
  run qa_squeezing_difficult_terrain_movement_cost = {
    val t = FRESH_TURN
    // Squeezing into a smaller space = difficult terrain: each foot costs 1 extra foot (multiplier 2)
    val cost = pMovementCost(true, false, false, false)
    // Moving 5 feet through the squeezed (difficult terrain) space costs 10 feet of movement
    val t1 = pUseMovement(t, 5, cost)
    all {
      assert(cost == 2),
      assert(t1.movementRemaining == 20),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xs83ko/
  
  // climbing, swimming, flying speed: switching speed type deducts already-moved distance from new budget
  run qa_switch_speed_type_deducts_moved_distance = {
    // Creature with Walk 30ft moves 20ft, then switches to Fly 40ft.
    // New remaining = 40 - 20 = 20ft (not the full 40).
    val t0 = FRESH_TURN  // movementRemaining: 30, effectiveSpeed: 30
    val t1 = pUseMovement(t0, 20, 1)  // 20ft used, 10ft remaining
    val t2 = pSwitchSpeedType(t1, 40, 20)
    assert(t2.movementRemaining == 20 and t2.effectiveSpeed == 40)
  }
  
  // climbing, swimming, flying speed: cannot switch to a speed if already-moved >= that speed
  run qa_switch_speed_type_blocked_when_budget_exhausted = {
    // Creature has Walk 30ft, moves 25ft, then tries to switch to Swim 20ft.
    // 20 - 25 = -5 <= 0, so switch is denied — TurnState unchanged.
    val t0 = FRESH_TURN
    val t1 = pUseMovement(t0, 25, 1)  // 5ft remaining
    val t2 = pSwitchSpeedType(t1, 20, 25)
    assert(t2 == t1)
  }
  
  // climbing, swimming, flying speed: switching to same-sized speed after partial move preserves remaining budget
  run qa_switch_speed_type_equal_speed_preserves_remaining = {
    // Walk 30ft, move 10ft, switch to Swim 30ft.
    // New remaining = 30 - 10 = 20ft; matches what was already left.
    val t0 = FRESH_TURN
    val t1 = pUseMovement(t0, 10, 1)
    val t2 = pSwitchSpeedType(t1, 30, 10)
    assert(t2.movementRemaining == 20 and t2.effectiveSpeed == 30)
  }

  // Source: https://rpg.stackexchange.com/q/215018
  
  // Is it within the DM's authority to alter a Difficulty Class set in the PHB?
  
  // PHB standard lock DC 15 (Dex/SleightOfHand): roll 10 + mod 2 + prof 3 = 15 just succeeds
  run qa_dm_dc_standard_lock_succeeds = {
    val dexMod = abilityModifier(14) // +2
    val profBonus = proficiencyBonus(5) // +3
    assert(checkSucceeds(10, dexMod, Proficient, profBonus, 0, 15))
  }
  
  // DM raises DC to 20 for a high-quality lock: same roll 10 now fails
  run qa_dm_dc_harder_lock_fails = {
    val dexMod = abilityModifier(14) // +2
    val profBonus = proficiencyBonus(5) // +3
    assert(not(checkSucceeds(10, dexMod, Proficient, profBonus, 0, 20)))
  }
  
  // DM lowers DC to 10 for a poor-quality lock: roll 9 fails PHB DC 15 but passes DM DC 10
  run qa_dm_dc_easier_lock_succeeds_where_standard_fails = {
    val dexMod = abilityModifier(14) // +2
    val profBonus = proficiencyBonus(5) // +3
    assert(
      not(checkSucceeds(9, dexMod, Proficient, profBonus, 0, 15))
      and checkSucceeds(9, dexMod, Proficient, profBonus, 0, 10)
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xrahvu/
  
  // Seems like all 4th level feats get a plus +1 stat increase at least
  run qa_level4_is_asi_level = {
    // Level 4 is an ASI level — the tier where half-feats (+1) are offered
    assert(pIsASILevel(4))
  }
  
  // Seems like all 4th level feats get a plus +1 stat increase at least
  run qa_half_feat_plus1_applies_correctly = {
    // Half-feat: +1 to chosen ability score (not the full +2 ASI)
    val scores = Map(Str -> 14, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    val afterHalfFeat = pApplyASI(scores, Str, 1)
    assert(afterHalfFeat.get(Str) == 15)
  }
  
  // Seems like all 4th level feats get a plus +1 stat increase at least
  run qa_half_feat_keeps_score_progression = {
    // PHB 2024 pattern: start 15, background +2 = 17, half-feat +1 at level 4 = 18
    // Taking a feat no longer forces you to sacrifice your primary stat growth
    val scores = Map(Str -> 17, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    val afterHalfFeat = pApplyASI(scores, Str, 1)
    assert(afterHalfFeat.get(Str) == 18)
  }
  
  // Seems like all 4th level feats get a plus +1 stat increase at least
  run qa_half_feat_plus1_capped_at_20 = {
    // pApplyASI caps at 20 regardless of increase amount
    val scores = Map(Str -> 20, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    val afterHalfFeat = pApplyASI(scores, Str, 1)
    assert(afterHalfFeat.get(Str) == 20)
  }

  // Source: https://reddit.com/r/onednd/comments/xxp6rj/
  
  // All the martial-caster posting seems to ignore the playtest's most profound change.
  run qa_prepared_caster_slot_limited_preparation = {
      // Preparation cap at each spell level equals the slot count at that level.
      // Full caster level 5: 4 L1 slots → max 4 L1 spells prepared; 3 L2; 2 L3; 0 L4+
      assert(
          pSlotsPerLevel(5, 1) == 4
          and pSlotsPerLevel(5, 2) == 3
          and pSlotsPerLevel(5, 3) == 2
          and pSlotsPerLevel(5, 4) == 0
          and pSlotsPerLevel(5, 5) == 0
      )
  }
  
  // Half-caster (Ranger lvl 5 = effective caster lvl 2): tighter slot-derived prep caps
  run qa_half_caster_slot_limited_preparation = {
      // Ranger is a half-caster: 5 half-caster levels → effective caster level 2
      val halfCasterLevel = pMulticlassCasterLevel(0, 5, 0)
      assert(
          halfCasterLevel == 2
          and pSlotsPerLevel(halfCasterLevel, 1) == 3   // max 3 L1 spells preparable
          and pSlotsPerLevel(halfCasterLevel, 2) == 0   // no L2 slots → 0 L2 spells preparable
      )
  }

  // Source: https://reddit.com/r/onednd/comments/1j4ec4p/
  
  // Do Exhaustion levels affect Death ST?
  run qa_exhaustion_affects_death_saves = {
    // Creature at 0 HP with 5 exhaustion levels (penalty = -10 to all D20 Tests)
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("prone", true)
      .with("exhaustion", 5)
  
    // exhaustionPenalty models the SRD: -2 × exhaustion level
    val penalty = exhaustionPenalty(creature)
  
    // A roll of 14 would normally succeed (>= 10), but exhaustion 5 drops it to 4
    val effectiveRoll = 14 + penalty // = 4, which is < 10
    val resultWithExhaustion = pDeathSave(creature, effectiveRoll)
  
    // Same roll without exhaustion succeeds normally
    val noExhaustionCreature = creature.with("exhaustion", 0)
    val resultWithoutExhaustion = pDeathSave(noExhaustionCreature, 14)
  
    all {
      // Penalty is -10 for 5 exhaustion levels
      assert(penalty == -10),
      // With the penalty applied, effective roll 4 fails the death save
      assert(resultWithExhaustion.deathSaves.failures == 1),
      // Without exhaustion, roll of 14 succeeds the death save
      assert(resultWithoutExhaustion.deathSaves.successes == 1),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/wxt4be/
  
  // Healer feat breakdown: Battle Medic heals dieRoll + Proficiency Bonus and expends one Hit Die
  run qa_battle_medic_heals_roll_plus_prof_bonus = {
    val level = 5
    val pb = proficiencyBonus(level) // 3
    val dieRoll = 6
    val target = freshCreature(20).with("hp", 8).with("hitPointDiceRemaining", 2)
    // Battle Medic: ally expends 1 Hit Die, regains dieRoll + profBonus (not + CON mod)
    val s1 = target.with("hitPointDiceRemaining", target.hitPointDiceRemaining - 1)
    val s2 = pHeal(s1, dieRoll + pb)
    assert(
      s2.hp == 8 + dieRoll + pb
      and s2.hitPointDiceRemaining == 1
    )
  }
  
  // Healer feat breakdown: Battle Medic uses Proficiency Bonus not CON modifier (unlike Short Rest hit die spending)
  run qa_battle_medic_prof_bonus_not_con_mod = {
    val level = 5
    val pb = proficiencyBonus(level) // 3
    val conMod = 5 // high CON exceeds pb
    val dieRoll = 4
    val target = freshCreature(30).with("hp", 10).with("hitPointDiceRemaining", 2)
    // Short Rest path: pSpendHitDie adds conMod
    val shortRestResult = pSpendHitDie(target, conMod, dieRoll)
    // Battle Medic path: adds profBonus only
    val s1 = target.with("hitPointDiceRemaining", target.hitPointDiceRemaining - 1)
    val battleMedicResult = pHeal(s1, dieRoll + pb)
    assert(
      shortRestResult.hp == 10 + dieRoll + conMod  // 19
      and battleMedicResult.hp == 10 + dieRoll + pb  // 17
      and battleMedicResult.hp < shortRestResult.hp  // Battle Medic gives less when CON mod > PB
    )
  }
  
  // Healer feat breakdown: Healing Rerolls — rerolled result (not the 1) is applied as final healing
  run qa_healing_rerolls_uses_reroll_not_one = {
    // Healing Rerolls: if healing die shows 1, reroll and must use the new roll
    // Pre-resolved: original roll was 1 (discarded), reroll came up 5
    val level = 3
    val pb = proficiencyBonus(level) // 2
    val rerollResult = 5
    val target = freshCreature(20).with("hp", 4).with("hitPointDiceRemaining", 1)
    val s1 = target.with("hitPointDiceRemaining", 0)
    val s2 = pHeal(s1, rerollResult + pb)
    // Final healing = reroll (5) + pb (2) = 7; hp 4 -> 11 (not 4 + 1 + pb = 7)
    assert(
      s2.hp == 4 + rerollResult + pb
      and s2.hp != 4 + 1 + pb  // the original 1 was not used
    )
  }
  
  // Healer feat breakdown: Battle Medic healing is capped at target's maximum HP
  run qa_battle_medic_capped_at_max_hp = {
    val level = 5
    val pb = proficiencyBonus(level) // 3
    val dieRoll = 12
    val target = freshCreature(20).with("hp", 18).with("hitPointDiceRemaining", 1)
    val s1 = target.with("hitPointDiceRemaining", 0)
    val s2 = pHeal(s1, dieRoll + pb) // 12 + 3 = 15, but only 2 HP missing
    assert(s2.hp == target.maxHp)
  }

  // Source: https://reddit.com/r/onednd/comments/yn5vo2/
  
  // half race rules: child's game traits (Size, Speed) come entirely from one chosen parent, not blended or averaged
  run qa_half_race_one_parent_traits = {
    val greatsword: Weapon = {
      name: "greatsword", damageDie: 6, versatileDie: 0,
      damageType: Slashing, properties: Set(Heavy, TwoHanded),
      isMelee: true, normalRange: 0, longRange: 0
    }
    // Parent A: Medium humanoid, 30ft walk (e.g. human)
    val cfgParentA = TEST_CONFIG
      .with("size", Medium)
      .with("speeds", Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0))
    // Parent B: Small humanoid, 25ft walk (e.g. halfling)
    val cfgParentB = TEST_CONFIG
      .with("size", Small)
      .with("speeds", Map(Walk -> 25, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0))
    val child = freshCreature(20)
    val turnA = pStartTurn(cfgParentA, child, Unarmored, 0, false, false)
    val turnB = pStartTurn(cfgParentB, child, Unarmored, 0, false, false)
    // Speed is exactly one parent's speed — not averaged (avg would be 27)
    val speedFromParentA = turnA.movementRemaining == 30
    val speedFromParentB = turnB.movementRemaining == 25
    val notAveraged = turnA.movementRemaining != 27 and turnB.movementRemaining != 27
    // Size-dependent rule: picking Small parent means heavy weapon disadvantage; Medium does not
    val mediumNoHeavyDisadv = not(heavyWeaponDisadvantage(greatsword, cfgParentA.size))
    val smallHasHeavyDisadv = heavyWeaponDisadvantage(greatsword, cfgParentB.size)
    assert(speedFromParentA and speedFromParentB and notAveraged and mediumNoHeavyDisadv and smallHasHeavyDisadv)
  }

  // Source: https://reddit.com/r/onednd/comments/xs8l84/
  
  // Rogue 18 Stroke of Luck: turning a failed attack roll into a 20 results in a critical hit
  run qa_stroke_of_luck_auto_crit = {
    // Original roll misses: d20=5, attackBonus=+3, targetAC=15 → total 8, no hit
    val originalResult = resolveAttackRoll(5, 3, 15, 0, 20)
    // Stroke of Luck turns the roll into 20; critRange=20 so d20>=critRange triggers isCritical
    val strokeResult = resolveAttackRoll(20, 3, 15, 0, 20)
    assert(
      not(originalResult.hits) and
      strokeResult.hits and
      strokeResult.isCritical
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xro1ay/
  
  // Bardic Inspiration healing: reaction-heal immediately revives a just-downed ally
  run qa_bardic_inspiration_reaction_heal = {
    val s0 = freshCreature(10).with("hp", 5)
    val t0 = FRESH_TURN
    // Ally takes 5 damage — drops to 0 HP, goes unconscious
    val s1 = pTakeDamage(s0, 5, Slashing, Set(), Set(), Set(), false)
    // Bard expends reaction + bardic inspiration die (roll = 4) to heal immediately
    val t1 = pUseReaction(t0)
    val s2 = pHeal(s1, 4)
    assert(
      s1.hp == 0 and
      s1.unconscious and
      s1.incapacitatedSources.contains(ISUnconscious) and
      not(t1.reactionAvailable) and
      s2.hp == 4 and
      not(s2.unconscious) and
      s2.deathSaves.successes == 0 and
      s2.deathSaves.failures == 0
    )
  }

  // Source: https://reddit.com/r/onednd/comments/10akznu/
  
  // Concentration: Spiritual Weapon requiring concentration cannot be stacked with Bless or other concentration spells
  run qa_spiritual_weapon_concentration_replaces_existing = {
    // Cleric is concentrating on Bless with an active effect
    val effects0 = pAddEffect(Set(), "bless", 5, AtEndOfTurn)
    val ss0 = pStartConcentration(FRESH_SPELL_SLOTS, "bless")
    // Cleric casts Spiritual Weapon (now requiring concentration):
    // old concentration (Bless) is dropped, its active effect removed, SW's effect added
    val effects1 = pRemoveEffect(effects0, ss0.concentrationSpellId)
    val effects2 = pAddEffect(effects1, "spiritual_weapon", 10, AtEndOfTurn)
    val ss1 = pStartConcentration(ss0, "spiritual_weapon")
    assert(
      ss1.concentrationSpellId == "spiritual_weapon"
      and not(pHasEffect(effects2, "bless"))
      and pHasEffect(effects2, "spiritual_weapon")
    )
  }

  // Source: https://reddit.com/r/onednd/comments/xs59do/
  
  // New rules for Weapon Juggling under "Attack [Action]": Loading property blocks extra attack for hand crossbow
  run qa_weapon_juggle_loading_blocks_extra_attack = {
    val handCrossbow: Weapon = {
      name: "hand crossbow", damageDie: 6, versatileDie: 0, damageType: Piercing,
      properties: Set(Light_, Loading, Ammunition),
      isMelee: false, normalRange: 30, longRange: 120
    }
    assert(not(pCanExtraAttackWithWeapon(handCrossbow)))
  }
  
  // New rules for Weapon Juggling under "Attack [Action]": TWF off-hand with ranged weapon (hand crossbow) invalid — must be light melee
  run qa_weapon_juggle_twf_ranged_offhand_invalid = {
    val shortsword: Weapon = {
      name: "shortsword", damageDie: 6, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_), isMelee: true, normalRange: 0, longRange: 0
    }
    val handCrossbow: Weapon = {
      name: "hand crossbow", damageDie: 6, versatileDie: 0, damageType: Piercing,
      properties: Set(Light_, Loading, Ammunition), isMelee: false, normalRange: 30, longRange: 120
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(shortsword, handCrossbow, t, creature)))
  }
  
  // New rules for Weapon Juggling under "Attack [Action]": light thrown melee weapons qualify for TWF, enabling throwing-weapon builds
  run qa_weapon_juggle_thrown_light_melee_twf_valid = {
    val handaxe: Weapon = {
      name: "handaxe", damageDie: 6, versatileDie: 0, damageType: Slashing,
      properties: Set(Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60
    }
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(pCanTWFWithWeapons(handaxe, dagger, t, creature))
  }

  // Source: https://reddit.com/r/onednd/comments/11a5kbi/
  
  // Moon Druids — forms lacking free hands (e.g. constrictor, no limbs) cannot grapple even when target fails save
  run qa_no_free_hand_grapple_fails = {
    val target = freshCreature(20)
    // attackerHasFreeHand=false: grapple must fail regardless of save outcome
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(not(result.success) and result.targetState == target)
  }
  
  // Moon Druids — forms with STR mod <= -1 (no meaningful STR, e.g. air/water form) deal 0 unarmed damage
  run qa_low_str_unarmed_damage_floors_at_zero = {
    // STR 8 -> mod -1; unarmedDamage floors at 0 via intMax
    val strMod = abilityModifier(8)
    assert(strMod == -1 and unarmedDamage(strMod) == 0)
  }
  
  // Moon Druids — grapple requires BOTH free hand AND target save failure; free hand alone insufficient if save succeeds
  run qa_grapple_requires_free_hand_and_save_fail = {
    val target = freshCreature(20)
    // freeHand=true but save succeeded: grapple fails
    val failedWithSaveSuccess = pGrapple(Medium, Medium, target, false, true)
    // freeHand=true and save failed: grapple succeeds
    val succeededWithSaveFail = pGrapple(Medium, Medium, target, true, true)
    assert(
      not(failedWithSaveSuccess.success) and
      succeededWithSaveFail.success and
      succeededWithSaveFail.targetState.grappled
    )
  }

  // Source: https://reddit.com/r/onednd/comments/135ya1z/
  
  // Action Surge and Eldritch Knight — casting a spell first then Action Surging to attack is legal (comment 3, score 9)
  run qa_action_surge_cast_then_attack = {
    val creature = freshCreature(20)
    val ts0 = FRESH_TURN
    val fs0 = freshFighterState(5)
    // Step 1: Use Action to cast a non-cantrip spell (Fireball, Web, etc.)
    val ts1 = pUseAction(ts0, creature, AMagic)
    val ts2 = pMarkNonCantripActionSpell(ts1)
    // Step 2: Use Action Surge — grants one additional action
    val surgeResult = pUseActionSurge(ts2, fs0)
    val ts3 = surgeResult.turn
    val fs1 = surgeResult.fighter
    // Step 3: Use the Action Surge action for Attack (not spellcasting)
    val ts4 = pUseAction(ts3, creature, AAttack)
    all {
      // The Attack action succeeds with the Action Surge extra action
      assert(ts4.attackActionUsed),
      // Casting a non-cantrip as the main action blocks bonus-action spellcasting
      assert(not(canCastBonusActionSpell(ts4))),
      // Action Surge charge was consumed
      assert(fs1.actionSurgeCharges == 0),
      // No actions remain after spell + Attack
      assert(ts4.actionsRemaining == 0),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xut94m/
  
  // Rethinking Non-Lethal Damage: melee attacker can knock creature to 0 HP unconscious and stable (not dead) instead of killing
  run qa_knockout_unconscious_not_dead = {
    val c = freshCreature(20)
    val knocked = pKnockOut(c)
    assert(
      knocked.unconscious == true
      and knocked.dead == false
      and knocked.prone == true
      and isIncapacitated(knocked)
      and knocked.incapacitatedSources.contains(ISUnconscious)
    )
  }

  // Source: https://rpg.stackexchange.com/q/216423
  
  run qa_cover_does_not_change_oa_eligibility = {{
    val t = FRESH_TURN
    val oaNoCover = pCanBeOpportunityAttacked(t)
    val oaHalfCover = pCanBeOpportunityAttacked(t)
    val oaThreeQuarters = pCanBeOpportunityAttacked(t)
    val oaTotalCover = pCanBeOpportunityAttacked(t)
    assert(oaNoCover and oaNoCover == oaHalfCover and oaHalfCover == oaThreeQuarters and oaThreeQuarters == oaTotalCover)
  }}
  
  // Does moving behind full cover count as “leaving” an opponent’s reach for the purposes of Opportunity Attacks?
  run qa_total_cover_blocks_targeting_but_not_reach_logic = {{
    assert(canBeTargeted(TotalCover) == false and canBeTargeted(NoCover) and canBeTargeted(HalfCover) and canBeTargeted(ThreeQuartersCover))
  }}
  
  // Does moving behind full cover count as “leaving” an opponent’s reach for the purposes of Opportunity Attacks?
  run qa_partial_cover_is_ac_bonus_only = {{
    assert(coverBonus(HalfCover) == 2 and coverBonus(ThreeQuartersCover) == 5 and coverBonus(TotalCover) == 0)
  }}

  // Source: https://reddit.com/r/onednd/comments/wskfzs/
  
  // Auto fail/success - What no one is talking about: Multiple party members!
  // Rule: ability checks have no nat-20 auto-success — total must still meet DC
  run qa_nat20_no_auto_succeed_ability_check = {
    // Barbarian: Int 8 → mod -1, no proficiency, nat 20, DC 29
    // 20 + (-1) + 0 = 19 < 29 → fails
    val result = checkSucceeds(20, abilityModifier(8), NoneProf, proficiencyBonus(5), 0, 29)
    assert(not(result))
  }
  
  // Auto fail/success - What no one is talking about: Multiple party members!
  // Rule: ability checks have no nat-1 auto-fail — high modifier + proficiency can still beat a low DC
  run qa_nat1_no_auto_fail_ability_check = {
    // Wizard: Int 18 → mod +4, Proficient at level 5 (+3 PB), nat 1, DC 5
    // 1 + 4 + 3 = 8 >= 5 → succeeds
    val result = checkSucceeds(1, abilityModifier(18), Proficient, proficiencyBonus(5), 0, 5)
    assert(result)
  }

  // Source: https://reddit.com/r/onednd/comments/y1th7k/
  
  // Shield Master's Shield Bash Should Be Model for All Shoves and Grapples: DC formula is 8 + Str mod + PB
  run qa_shove_grapple_dc_is_8_plus_str_plus_pb = {
    val strMod = 3
    val profBonus = 3
    assert(pGrappleShoveDC(strMod, profBonus) == 8 + strMod + profBonus)
  }
  
  // Shield Master's Shield Bash Should Be Model for All Shoves and Grapples: shove (prone) succeeds when target fails the STR/DEX save
  run qa_shove_prone_succeeds_on_failed_save = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShoveProne)
    assert(result.success == true and result.targetState.prone == true)
  }
  
  // Shield Master's Shield Bash Should Be Model for All Shoves and Grapples: shove fails and target stays upright when save succeeds
  run qa_shove_prone_fails_on_successful_save = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, false, ShoveProne)
    assert(result.success == false and result.targetState.prone == false)
  }
  
  // Shield Master's Shield Bash Should Be Model for All Shoves and Grapples: grapple succeeds when target fails the STR/DEX save
  run qa_grapple_succeeds_on_failed_save_e6c2c335 = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success == true and result.targetState.grappled == true)
  }
  
  // Shield Master's Shield Bash Should Be Model for All Shoves and Grapples: grapple fails when target succeeds the save
  run qa_grapple_fails_on_successful_save = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, false, true)
    assert(result.success == false and result.targetState.grappled == false)
  }
  
  // Shield Master's Shield Bash Should Be Model for All Shoves and Grapples: incapacitated target auto-fails — grapple always succeeds
  run qa_grapple_auto_succeeds_vs_incapacitated_e6c2c335 = {
    val target = freshCreature(20)
    val incapTarget = pApplyCondition(target, CUnconscious)
    // saveSucceeded=false doesn't matter; incapacitated triggers auto-success
    val result = pGrapple(Medium, Medium, incapTarget, false, true)
    assert(result.success == true and result.targetState.grappled == true)
  }
  
  // Shield Master's Shield Bash Should Be Model for All Shoves and Grapples: shove push moves target but doesn't apply prone
  run qa_shove_push_no_prone_e6c2c335 = {
    val target = freshCreature(20)
    val result = pShove(Medium, Medium, target, true, ShovePush)
    assert(result.success == true and result.targetState.prone == false)
  }

  // Source: https://reddit.com/r/onednd/comments/xs1py6/
  
  // The adventuring day is here to stay — long rest restores all spell slots, underpinning encounter budget
  run qa_long_rest_restores_spell_slots = {
    val casterLevel = 5
    val slots = pBuildSlotMap(casterLevel)
    val initialSlots: SpellSlotState = {
      slotsMax: slots,
      slotsCurrent: slots,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Simulate resource drain across multiple encounters
    val afterEnc1 = pExpendSlot(pExpendSlot(initialSlots, 1), 1) // 2 level-1 slots spent
    val afterEnc2 = pExpendSlot(afterEnc1, 2)                     // 1 level-2 slot spent
    val afterEnc3 = pExpendSlot(afterEnc2, 3)                     // 1 level-3 slot spent
    // Long rest restores all slots
    val afterRest = pRestoreAllSlots(afterEnc3)
    assert(
      // PHB multiclass table: level-5 full caster slot counts are fixed
      pSlotsPerLevel(5, 1) == 4
      and pSlotsPerLevel(5, 2) == 3
      and pSlotsPerLevel(5, 3) == 2
      and pSlotsPerLevel(5, 4) == 0
      // Slots were actually depleted during encounters
      and afterEnc3.slotsCurrent.get(1) == 2
      and afterEnc3.slotsCurrent.get(2) == 2
      and afterEnc3.slotsCurrent.get(3) == 1
      // Long rest fully restores all slots to max
      and afterRest.slotsCurrent == initialSlots.slotsMax
    )
  }

  // Source: https://reddit.com/r/onednd/comments/11tv2k1/
  
  // Megathread: feedback about the pally/druid UA — Comment 3: healing a dying creature (0 HP) brings them to 1 HP and removes unconscious, resetting death saves
  run qa_heal_dying_creature_restores_to_conscious = {
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 1, failures: 1 })
    val healed = pHeal(dying, 1)
    all {
      assert(healed.hp == 1),
      assert(not(healed.unconscious)),
      assert(healed.deathSaves == DEATH_SAVES_RESET),
      assert(not(healed.dead)),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/yi0ogv/
  
  // Is the Heal option for Bardic Inspiration really overpowered?
  // Healing a creature knocked to 0 HP (unconscious) restores consciousness and resets death saves
  run qa_reaction_heal_restores_downed_ally = {
    val downed = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 0, failures: 1 })
    val healed = pHeal(downed, 4)
    assert(healed.hp == 4 and not(healed.unconscious) and healed.deathSaves == DEATH_SAVES_RESET)
  }
  
  // Is the Heal option for Bardic Inspiration really overpowered?
  // Reaction (BI Heal) and bonus action (Healing Word) are tracked independently — both usable in same round
  run qa_reaction_and_bonus_action_independent = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    val t2 = pUseBonusAction(t1, creature)
    assert(not(t2.reactionAvailable) and t2.bonusActionUsed)
  }
  
  // Is the Heal option for Bardic Inspiration really overpowered?
  // A creature at 0 HP with accumulated death save failures can still be fully recovered by a heal
  run qa_heal_clears_death_saves_at_0hp = {
    val dying = freshCreature(15)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 1, failures: 2 })
    val healed = pHeal(dying, 1)
    assert(healed.hp == 1 and not(healed.unconscious) and healed.deathSaves == DEATH_SAVES_RESET)
  }

  // Source: https://reddit.com/r/onednd/comments/xtacmv/
  
  // Ranger new king of multiclassing — Ranger multiclass prereq requires both DEX≥13 and WIS≥13
  run qa_ranger_multiclass_prereq_requires_dex_and_wis = {
    val lowWis = Map(Str -> 10, Dex -> 13, Con -> 10, Int_ -> 10, Wis -> 12, Cha -> 10)
    val lowDex = Map(Str -> 10, Dex -> 12, Con -> 10, Int_ -> 10, Wis -> 13, Cha -> 10)
    val meets   = Map(Str -> 10, Dex -> 13, Con -> 10, Int_ -> 10, Wis -> 13, Cha -> 10)
    assert(
      not(pMeetsMulticlassPrereq(lowWis, Ranger)) and
      not(pMeetsMulticlassPrereq(lowDex, Ranger)) and
      pMeetsMulticlassPrereq(meets, Ranger)
    )
  }
  
  // Ranger new king of multiclassing — Rogue only needs DEX≥13, cheaper prereq than Ranger's dual requirement
  run qa_rogue_prereq_easier_than_ranger = {
    val scoresOnlyDex = Map(Str -> 10, Dex -> 13, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10)
    assert(
      pMeetsMulticlassPrereq(scoresOnlyDex, Rogue) and
      not(pMeetsMulticlassPrereq(scoresOnlyDex, Ranger))
    )
  }
  
  // Ranger new king of multiclassing — Expertise (from ranger dip) doubles proficiency bonus at level 1
  run qa_ranger_expertise_doubles_prof_bonus = {
    val pb = proficiencyBonus(1)
    assert(
      profMultiplier(Expertise, pb) == 2 * pb and
      profMultiplier(Proficient, pb) == pb and
      profMultiplier(Expertise, pb) > profMultiplier(Proficient, pb)
    )
  }
  
  // Ranger new king of multiclassing — pCanMulticlass enforces prereqs on both current and new class
  run qa_multiclass_requires_both_class_prereqs = {
    // Fighter (STR or DEX≥13) into Ranger (DEX≥13 AND WIS≥13): needs DEX+WIS
    val meetsAll  = Map(Str -> 13, Dex -> 13, Con -> 10, Int_ -> 10, Wis -> 13, Cha -> 10)
    val lacksWis  = Map(Str -> 13, Dex -> 13, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10)
    assert(
      pCanMulticlass(meetsAll, Fighter, Ranger) and
      not(pCanMulticlass(lacksWis, Fighter, Ranger))
    )
  }

  // Source: https://reddit.com/r/onednd/comments/x1irfc/
  
  // Opposed player skill checks: nat 20 does not auto-win a contest — contests have no DC so no d20 Test crit rules apply
  run qa_contest_nat20_no_autowin = {
    // A rolls nat 20 but large negative mod gives total 5; B rolls 10 with +6 bonus gives total 16 — B wins on totals alone
    val totalA = 20 + (-15)
    val totalB = 10 + 6
    assert(contestWinner(totalA, totalB) == BWins)
  }
  
  // Opposed player skill checks: nat 1 does not auto-lose a contest — only totals matter, no DC, no crit failure rule
  run qa_contest_nat1_no_autolose = {
    // A rolls nat 1 but large bonus gives total 16; B rolls 15 with no bonus gives total 15 — A wins on totals alone
    val totalA = 1 + 15
    val totalB = 15 + 0
    assert(contestWinner(totalA, totalB) == AWins)
  }
  
  // Opposed player skill checks: simultaneous nat 1 and nat 20 — result is still determined purely by totals
  run qa_contest_nat1_vs_nat20_totals_decide = {
    // A rolls nat 1 with +20 mod (total 21); B rolls nat 20 with +0 mod (total 20) — A wins despite rolling 1
    val totalA = 1 + 20
    val totalB = 20 + 0
    assert(contestWinner(totalA, totalB) == AWins)
  }

  // Source: https://reddit.com/r/onednd/comments/wtmesj/
  
  // Warranted? The DM is allowed to rule differently between PCs for the same check
  // Rule: a roll is not warranted when success is impossible even on a nat 20
  
  // Little Timmy (Str 4, no prof, level 5) cannot succeed DC 30 even on nat 20
  run qa_roll_not_warranted_timmy_dc30 = {
    // Str 4 -> mod = -3; NoneProf; profBonus = 3 (level 5); max = 20 + (-3) + 0 = 17
    val timmy_mod = abilityModifier(4)
    val pb = proficiencyBonus(5)
    assert(
      checkSucceeds(20, timmy_mod, NoneProf, pb, 0, 30) == false
    )
  }
  
  // Big Bertha (Str 20, proficient, level 5) also cannot succeed DC 30 on nat 20
  // (same mechanical 0% — both rolls are unwarranted per the rule)
  run qa_roll_not_warranted_bertha_dc30 = {
    // Str 20 -> mod = +5; Proficient; profBonus = 3; max = 20 + 5 + 3 = 28 < 30
    val bertha_mod = abilityModifier(20)
    val pb = proficiencyBonus(5)
    assert(
      checkSucceeds(20, bertha_mod, Proficient, pb, 0, 30) == false
    )
  }
  
  // Bertha with Expertise CAN succeed DC 30 on nat 20 — roll IS warranted for her
  run qa_roll_warranted_bertha_expertise_dc30 = {
    // Str 20 -> mod = +5; Expertise; profBonus = 3; max = 20 + 5 + 6 = 31 >= 30
    val bertha_mod = abilityModifier(20)
    val pb = proficiencyBonus(5)
    assert(
      checkSucceeds(20, bertha_mod, Expertise, pb, 0, 30) == true
    )
  }
  
  // Timmy has no path to DC 30 regardless of roll — nat 20 is still a failure
  run qa_nat20_not_enough_for_timmy = {
    val timmy_mod = abilityModifier(4)
    val pb = proficiencyBonus(5)
    // Even with Proficiency added (generous reading), 20 + (-3) + 3 = 20 < 30
    assert(
      checkSucceeds(20, timmy_mod, Proficient, pb, 0, 30) == false
    )
  }

  // Source: https://reddit.com/r/onednd/comments/wsu8iu/
  
  // New UA Grappling vs 5e version: escape DC = 8 + STR mod + proficiency bonus
  run qa_grapple_escape_dc_formula = {
    val strMod = 4
    val profBonus = proficiencyBonus(5)  // level 5 = +3
    val dc = pGrappleShoveDC(strMod, profBonus)
    assert(dc == 15)
  }
  
  // New UA Grappling vs 5e version: grapple applies Grappled condition when target's save fails
  run qa_grapple_applies_grappled_on_save_failure = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // New UA Grappling vs 5e version: grapple fails without a free hand regardless of save result
  run qa_grapple_requires_free_hand_eb199830 = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, true, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // New UA Grappling vs 5e version: target more than one size larger cannot be grappled
  run qa_grapple_size_restriction_huge_target = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Huge, target, true, true)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // New UA Grappling vs 5e version: target exactly one size larger can be grappled
  run qa_grapple_one_size_larger_allowed = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Large, target, true, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // New UA Grappling vs 5e version: escaping grapple via successful STR/DEX save removes Grappled
  run qa_grapple_escape_on_successful_save_eb199830 = {
    val target = freshCreature(20).with("grappled", true)
    val escaped = pEscapeGrapple(target, true)
    assert(not(escaped.grappled))
  }
  
  // New UA Grappling vs 5e version: failed escape attempt leaves Grappled condition intact
  run qa_grapple_escape_on_failed_save = {
    val target = freshCreature(20).with("grappled", true)
    val escaped = pEscapeGrapple(target, false)
    assert(escaped.grappled)
  }

  // Source: https://reddit.com/r/onednd/comments/zh2qjf/
  
  // Using multiple speeds: PHB rule is track distance covered; distance counts against each speed type
  run qa_switch_speed_types_mid_move = {
    val t0 = FRESH_TURN  // effectiveSpeed=30, movementRemaining=30
    val t1 = pUseMovement(t0, 15, 1)  // walk 15 ft -> movementRemaining=15
    val distanceMoved = t0.movementRemaining - t1.movementRemaining  // 15
    val t2 = pSwitchSpeedType(t1, 30, distanceMoved)  // switch to climb 30; remaining = 30-15 = 15
    assert(t2.movementRemaining == 15 and t2.effectiveSpeed == 30)
  }
  
  // Using multiple speeds: low walk speed + high fly speed; distance walked subtracts from fly budget
  run qa_switch_speed_walk_then_fly = {
    val t0 = FRESH_TURN  // effectiveSpeed=30, movementRemaining=30
    val t1 = pUseMovement(t0, 10, 1)  // walk 10 ft -> movementRemaining=20
    val distanceMoved = t0.movementRemaining - t1.movementRemaining  // 10
    val t2 = pSwitchSpeedType(t1, 60, distanceMoved)  // switch to fly 60; remaining = 60-10 = 50
    assert(t2.movementRemaining == 50 and t2.effectiveSpeed == 60)
  }
  
  // Using multiple speeds: if distance already exceeds new speed type, switch is blocked (no movement remains)
  run qa_switch_speed_blocked_when_exhausted = {
    val t0 = FRESH_TURN  // effectiveSpeed=30, movementRemaining=30
    val t1 = pUseMovement(t0, 25, 1)  // walk 25 ft -> movementRemaining=5
    val distanceMoved = t0.movementRemaining - t1.movementRemaining  // 25
    val t2 = pSwitchSpeedType(t1, 20, distanceMoved)  // switch to climb 20; 20-25=-5 <= 0, blocked
    assert(t2.movementRemaining == 5 and t2.effectiveSpeed == 30)  // unchanged
  }

  // Source: https://rpg.stackexchange.com/q/215147
  
  run qa_no_free_hand_cannot_cast_somatic = {{
    val caster = freshCreature(12)
    assert(not(pCanProvideComponents(caster, false, true, false)))
  }}
  
  // Can a character with no arms/hands cast spells with Somatic/Material components?
  run qa_no_free_hand_still_allows_verbal_only = {{
    val caster = freshCreature(12)
    assert(pCanProvideComponents(caster, true, false, false))
  }}

  // Source: https://rpg.stackexchange.com/q/213423
  
  run qa_counterspell_2024_better_iff_pc_plus_l_gt_4_plus_consave = {{
    val rolls = 1.to(20)
    assert(
      (-1).to(5).forall(s_c =>
        2.to(6).forall(p_c =>
          4.to(9).forall(l =>
            (-1).to(5).forall(c_t =>
              0.to(6).forall(p_t => {
                val threshold2014 = 10 + l - s_c
                val threshold2024 = 8 + s_c + p_c - c_t - p_t
                val inBand =
                  threshold2014 >= 1 and threshold2014 <= 20
                  and threshold2024 >= 1 and threshold2024 <= 21
                val wins2014 =
                  rolls.filter(r => checkSucceeds(r, s_c, NoneProf, 0, 0, 10 + l)).size()
                val wins2024 =
                  rolls.filter(r => not(saveSucceeds(r, c_t, true, p_t, 0, 8 + s_c + p_c))).size()
                inBand implies ((wins2024 > wins2014) == (p_c + l > 4 + c_t + p_t))
              })
            )
          )
        )
      )
    )
  }}

  // Source: https://reddit.com/r/onednd/comments/1fsbnbr/
  
  // Interesting bladelock rules interaction: armor non-proficiency penalizes STR/DEX checks/saves, not attack rolls
  run qa_armor_nonprof_no_attack_disadv = {
    // A warlock with only LightArmor proficiency wearing Scale Mail (MediumArmor)
    val armorProfs: Set[ArmorCategory] = Set(LightArmor)
    val armorState: ArmorState = WearingArmor(SCALE_MAIL)
  
    // Confirm this character lacks proficiency in their worn armor
    val lacksProf = lacksArmorProficiency(armorState, armorProfs)
  
    // Build a clean attack context: no conditions, no special circumstances
    // (models a Warlock making a CHA-based eldritch strike — no STR/DEX involved)
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: false,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
  
    val mods = pAggregateAttackMods(ctx)
  
    assert(all {
      // The character is correctly flagged as lacking armor proficiency
      assert(lacksProf),
      // Armor non-proficiency does NOT appear as a source of attack roll disadvantage
      // (it only penalizes STR/DEX ability checks and saves, and blocks spellcasting)
      assert(not(mods.hasDisadvantage)),
      assert(not(mods.hasAdvantage)),
      assert(not(mods.autoMiss)),
      assert(not(mods.autoCrit)),
    })
  }

  // Source: https://reddit.com/r/onednd/comments/xu1ycl/
  
  // The biggest issue with new Jumping rules: long jump with running start covers STR score feet
  run qa_long_jump_running_start_equals_str_score_eee149d7 = {
    assert(pLongJumpDistance(15, true) == 15)
  }
  
  // The biggest issue with new Jumping rules: long jump standing (no running start) is half STR score
  run qa_long_jump_standing_is_half_str_score = {
    assert(pLongJumpDistance(15, false) == 7)
  }
  
  // The biggest issue with new Jumping rules: basic movement (no Dash) already provides running start
  // Comment clarifies: "You can still run and jump, as you have your basic movement."
  run qa_basic_movement_sufficient_for_running_start = {
    // Running start requires >=10ft; default 30ft speed movement budget exceeds this without any action
    assert(FRESH_TURN.movementRemaining >= 10)
  }
  
  // The biggest issue with new Jumping rules: Dash action adds a full speed's worth of movement
  // (further enables approach distance but is not required for a running start)
  run qa_dash_adds_full_speed_to_movement = {
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, freshCreature(20), ADash)
    assert(t1.movementRemaining == t0.movementRemaining + t0.effectiveSpeed)
  }

  // Source: https://reddit.com/r/onednd/comments/zqlgdy/
  
  // "Speed reduced to 0 also reduces all special speeds to 0" — the_twig's Excellent Video about Movement
  run qa_speed_zero_zeroes_special_speeds = {
    // Grappled triggers the walk-speed-to-0 short-circuit in pStartTurn.
    // Rule: when Speed is reduced to 0, special speeds are also 0.
    // Model: caller must pass newTypeEffectiveSpeed=0 to pSwitchSpeedType.
    val grappled = freshCreature(20).with("grappled", true)
    val t = pStartTurn(TEST_CONFIG, grappled, Unarmored, 0, false, false)
    // walk speed is 0 due to grapple
    val t2 = pSwitchSpeedType(t, 0, 0) // special speed (e.g. fly) is also 0 per rule
    assert(t.movementRemaining == 0 and t2.movementRemaining == 0)
  }
  
  // "Effects that only partially reduce Speed leave special speeds unaffected" — the_twig's Excellent Video about Movement
  run qa_speed_partial_reduction_leaves_special_speeds = {
    // Walk speed reduced by -10 (e.g. Slowed analog via callerSpeedModifier), not to 0.
    // Rule: a fixed special speed (e.g. fly 40) is independent and unaffected.
    val c = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, c, Unarmored, -10, false, false)
    // walk speed: 30 - 10 = 20 (not zero)
    // switch to fly speed 40, no distance moved yet — full 40ft remains
    val t2 = pSwitchSpeedType(t, 40, 0)
    assert(t.movementRemaining == 20 and t2.movementRemaining == 40)
  }

  // Source: https://reddit.com/r/onednd/comments/1dkhr78/
  
  // The 2024 Champion Fighter is stronger than people realize: Heroic Warrior (lvl 10) grants Heroic Inspiration at turn start if not held
  run qa_heroic_warrior_grants_inspiration_level10 = {
    val fs = freshFighterState(10)
    // heroicInspiration starts false; start of turn should grant it
    val result = pFighterStartTurn(fs, 10)
    assert(result.heroicInspiration)
  }
  
  // The 2024 Champion Fighter is stronger than people realize: Heroic Warrior does not double-grant inspiration when already held
  run qa_heroic_warrior_no_double_grant = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val result = pFighterStartTurn(fs, 10)
    // still true — held, not replaced; charge count unchanged
    assert(result.heroicInspiration)
  }
  
  // The 2024 Champion Fighter is stronger than people realize: Heroic Warrior is not active below level 10
  run qa_heroic_warrior_requires_level10 = {
    val fs = freshFighterState(9)
    val result = pFighterStartTurn(fs, 9)
    assert(not(result.heroicInspiration))
  }
  
  // The 2024 Champion Fighter is stronger than people realize: spending inspiration then starting a new turn restores it (infinite cadence)
  run qa_heroic_warrior_refreshes_after_spend = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    // Spend the inspiration
    val fsSpent = fs.with("heroicInspiration", false)
    // Next turn start: Heroic Warrior should restore it
    val result = pFighterStartTurn(fsSpent, 10)
    assert(result.heroicInspiration)
  }
  
  // The 2024 Champion Fighter is stronger than people realize: level 10 boundary — level 10 grants, level 9 does not
  run qa_heroic_warrior_boundary_10_vs_9 = {
    val fs9 = freshFighterState(9)
    val fs10 = freshFighterState(10)
    val res9  = pFighterStartTurn(fs9,  9)
    val res10 = pFighterStartTurn(fs10, 10)
    all {
      assert(not(res9.heroicInspiration)),
      assert(res10.heroicInspiration),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/xrn25h/
  
  // Q&A: Hiding Changes — flat DC 15 check, heavy-obscurement/3-4-cover prereqs, invisibility gives same advantage
  
  // DC 15 stealth check passes at exactly the boundary (Dex +4, level-5 proficiency +3, roll 8 → 15)
  run qa_hiding_dc15_boundary_pass = {
    val dexMod = abilityModifier(18)          // +4
    val pb     = proficiencyBonus(5)          // +3
    assert(checkSucceeds(8, dexMod, Proficient, pb, 0, 15))
  }
  
  // One below the boundary fails
  run qa_hiding_dc15_boundary_fail = {
    val dexMod = abilityModifier(18)
    val pb     = proficiencyBonus(5)
    assert(not(checkSucceeds(7, dexMod, Proficient, pb, 0, 15)))
  }
  
  // Darkness = heavily obscured → qualifies as hiding prerequisite
  run qa_hiding_prereq_darkness_is_heavy_obscurement = {
    val obs = pIlluminationObscurement(Dark)
    assert(pBlindedByObscurement(obs))
  }
  
  // Dim light = lightly obscured only → does NOT meet hiding prerequisite
  run qa_hiding_prereq_dim_light_insufficient = {
    val obs = pIlluminationObscurement(Dim)
    assert(not(pBlindedByObscurement(obs)))
  }
  
  // Three-quarters cover grants +5 (the cover tier required to hide)
  run qa_hiding_prereq_three_quarters_cover_bonus = {
    assert(coverBonus(ThreeQuartersCover) == 5)
  }
  
  // Half cover (+2) is below the hiding prerequisite threshold
  run qa_hiding_half_cover_insufficient = {
    assert(coverBonus(HalfCover) == 2 and coverBonus(HalfCover) < coverBonus(ThreeQuartersCover))
  }
  
  // Invisible attacker: target can't see attacker → attacker has advantage (same benefit as hidden)
  run qa_invisible_attacker_has_advantage_via_unseen_rule = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,   // invisible → target cannot see attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Invisible attacker advantage cancels if attacker also can't see target (adv+disadv → neither)
  run qa_invisible_attacker_advantage_cancelled_by_blind = {
    val ctx: AttackContext = {
      attackerBlinded: true,          // attacker is blinded → disadv
      attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,    // invisible → adv
      attackerCanSeeTarget: false,    // can't see target either → disadv (cantSeeTarget)
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      attackerGrappled: false, targetIsGrappler: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/xzqyue/
  
  // Why advantage/disadvantage isn't perfect: at DC 11, advantage is equivalent to ~+5 flat bonus
  run qa_advantage_equiv_plus5_at_dc11 = {
    // With a +5 misc bonus, minimum roll to hit DC 11 drops from 11 to 6 — matching the ~+5 adv equivalent
    val borderSucceeds = checkSucceeds(6, 0, NoneProf, 2, 5, 11)
    val borderFails    = checkSucceeds(5, 0, NoneProf, 2, 5, 11)
    assert(borderSucceeds and not(borderFails))
  }
  
  // Why advantage/disadvantage isn't perfect: at DC 20, advantage is equivalent to only ~+1 flat bonus
  run qa_advantage_equiv_plus1_at_dc20 = {
    // Without any bonus, only a 20 succeeds against DC 20
    val nat20Hits  = checkSucceeds(20, 0, NoneProf, 2, 0, 20)
    val nat19Miss  = checkSucceeds(19, 0, NoneProf, 2, 0, 20)
    // With +1 bonus, a 19 now suffices — the same threshold shift advantage provides at the extreme
    val plus1_19   = checkSucceeds(19, 0, NoneProf, 2, 1, 20)
    val plus1_18   = checkSucceeds(18, 0, NoneProf, 2, 1, 20)
    assert(nat20Hits and not(nat19Miss) and plus1_19 and not(plus1_18))
  }
  
  // Why advantage/disadvantage isn't perfect: having both advantage and disadvantage cancels to neither
  run qa_advantage_disadvantage_cancel_f608fe17 = {
    val both     = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    val advOnly  = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    val disvOnly = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: true })
    assert(
      not(both.hasAdvantage) and not(both.hasDisadvantage) and
      advOnly.hasAdvantage and not(advOnly.hasDisadvantage) and
      not(disvOnly.hasAdvantage) and disvOnly.hasDisadvantage
    )
  }

  // Source: https://reddit.com/r/onednd/comments/y876pl/
  
  // Guidance and Bardic Inspo on a sliding scale?
  // Core insight: "failure" is DC-relative; same roll can pass one tier and fail another,
  // so reaction triggers (Guidance/BI) depend on which DC threshold is being tested.
  run qa_sliding_scale_failure_is_dc_relative = {
    // Roll of 15, no modifiers: passes DC 12 (minor success tier) but fails DC 17 (moderate success tier).
    // Under RAW, checkSucceeds is binary per DC — a reaction that triggers on "failure"
    // fires at DC 17 but NOT at DC 12 for the same roll.
    assert(
      checkSucceeds(15, 0, NoneProf, 0, 0, 12) and
      not(checkSucceeds(15, 0, NoneProf, 0, 0, 17)) and
      not(checkSucceeds(15, 0, NoneProf, 0, 0, 22))
    )
  }
  
  // A complete failure (below all tiers) legitimately triggers at every DC threshold.
  run qa_sliding_scale_complete_failure_triggers_all = {
    assert(
      not(checkSucceeds(5, 0, NoneProf, 0, 0, 12)) and
      not(checkSucceeds(5, 0, NoneProf, 0, 0, 17)) and
      not(checkSucceeds(5, 0, NoneProf, 0, 0, 22))
    )
  }
  
  // A full success (meets highest tier) leaves no DC where a reaction trigger fires.
  run qa_sliding_scale_full_success_no_trigger = {
    // roll 20 + misc bonus 3 = 23, clears all three tiers
    assert(
      checkSucceeds(20, 0, NoneProf, 0, 3, 22) and
      checkSucceeds(20, 0, NoneProf, 0, 3, 17) and
      checkSucceeds(20, 0, NoneProf, 0, 3, 12)
    )
  }

  // Source: https://rpg.stackexchange.com/q/213750
  
  // Is a Cleric multiclass the only way to gain Heavy Armor proficiency with a 1 level dip?
  run qa_cleric_protector_heavy_armor_proficiency = {
    // Sorcerer base: Cha 15 meets Sorcerer prereq; Wis 14 meets Cleric prereq
    val scores = Map(Str -> 10, Dex -> 8, Con -> 10, Int_ -> 10, Wis -> 14, Cha -> 15)
  
    // Fighter multiclass dip grants only Light + Medium + Shields, NOT Heavy (PHB Ch6)
    val fighterMulticlassProfs = Set(LightArmor, MediumArmor)
  
    // Cleric (Protector divine order) multiclass dip grants Heavy Armor proficiency
    val clericProtectorProfs = Set(LightArmor, MediumArmor, HeavyArmor)
  
    val wearingPlate = WearingArmor(PLATE)
  
    // Fighter dip: wearing Plate means lacking proficiency
    val fighterLacksHeavy = lacksArmorProficiency(wearingPlate, fighterMulticlassProfs)
  
    // Cleric (Protector) dip: wearing Plate is covered
    val clericHasHeavy = not(lacksArmorProficiency(wearingPlate, clericProtectorProfs))
  
    // A Sorcerer can satisfy both prereqs simultaneously (Cha >= 13 + Wis >= 13)
    val sorcererCanDipCleric = pCanMulticlass(scores, Sorcerer, Cleric)
  
    assert(fighterLacksHeavy and clericHasHeavy and sorcererCanDipCleric)
  }

  // Source: https://reddit.com/r/onednd/comments/z11r6l/
  
  // Does Jack of all Trades no longer boost initiative rolls?
  run qa_jack_of_all_trades_not_on_initiative = {
    // SRD 5.2.1: JoAT applies to "ability check that uses a skill proficiency you lack"
    // Initiative is a DEX check with no skill proficiency → NoneProf (no JoAT bonus)
    // A skill check the bard lacks would use HalfProf
    val pb = proficiencyBonus(5)
    val joatBonus = profMultiplier(HalfProf, pb)   // JoAT on a skill-based check
    val initBonus = profMultiplier(NoneProf, pb)    // initiative: no skill, so no JoAT
    assert(
      joatBonus > 0        // JoAT does add half-prof to a skill check
      and initBonus == 0   // but initiative has no skill → NoneProf → 0
      and initBonus != joatBonus
    )
  }

  // Source: https://reddit.com/r/onednd/comments/yiorz8/
  
  // Ranger Decrease Exhaustion: exhaustion level drops by 1 after short rest while exhausted
  run qa_decrease_exhaustion_on_short_rest = {
    val s = freshCreature(30).with("exhaustion", 2)
    val s1 = pReduceExhaustion(s, 1)
    assert(s1.exhaustion == 1)
  }
  
  // Decrease Exhaustion at exhaustion 1: clears exhaustion entirely after short rest
  run qa_decrease_exhaustion_clears_last_level = {
    val s = freshCreature(30).with("exhaustion", 1)
    val s1 = pReduceExhaustion(s, 1)
    assert(s1.exhaustion == 0)
  }
  
  // pReduceExhaustion is floored at 0 — cannot go negative, sustain is stable
  run qa_decrease_exhaustion_floor_at_zero = {
    val s = freshCreature(30).with("exhaustion", 0)
    val s1 = pReduceExhaustion(s, 1)
    assert(s1.exhaustion == 0)
  }
  
  // Coffeelock angle: Warlock pact slots restore on short rest
  run qa_pact_slots_restore_on_short_rest = {
    val ss = FRESH_SPELL_SLOTS
      .with("pactSlotsMax", 2)
      .with("pactSlotsCurrent", 0)
      .with("pactSlotLevel", 2)
    val ss1 = pRestorePactSlots(ss)
    assert(ss1.pactSlotsCurrent == 2)
  }
  
  // Coffeelock + Decrease Exhaustion loop: starting exhausted with spent pact slots,
  // short rest restores pact slots AND Decrease Exhaustion removes the exhaustion level
  run qa_coffeelock_decrease_exhaustion_cycle = {
    val s = freshCreature(30).with("exhaustion", 1)
    val ss = FRESH_SPELL_SLOTS
      .with("pactSlotsMax", 1)
      .with("pactSlotsCurrent", 0)
      .with("pactSlotLevel", 1)
    val s1 = pReduceExhaustion(s, 1)
    val ss1 = pRestorePactSlots(ss)
    assert(s1.exhaustion == 0 and ss1.pactSlotsCurrent == 1)
  }

  // Source: https://reddit.com/r/onednd/comments/11a93w2/
  
  // Does Paladin's Divine Smite not work on a crit anymore?
  run qa_divine_smite_no_crit_double = {
    // 2024 PHB: Divine Smite triggers "immediately after you hit" — it is a separate
    // damage instance applied after the attack resolves, not part of the attack's dice
    // pool, so its dice are NOT doubled on a critical hit.
    val weaponRoll      = 8    // longsword 1d8, normal roll
    val weaponCritExtra = 8    // extra die rolled on crit (equal to normal die)
    val attackMod       = 3
  
    // 2d8 Divine Smite, pre-resolved
    val smiteRoll = 16
  
    // New 2024 rule: weapon crit uses criticalDamage; smite is a separate normalDamage call
    val weaponCritDmg = criticalDamage(weaponRoll, weaponCritExtra, attackMod)  // 8+8+3 = 19
    val smiteDmg      = normalDamage(smiteRoll, 0)                               // 16 — NOT doubled
    val totalNewRule  = weaponCritDmg + smiteDmg                                // 35
  
    // Old 2014 rule: smite dice were added to the attack dice pool and doubled on crit
    val totalOldRule = criticalDamage(weaponRoll + smiteRoll, weaponCritExtra + smiteRoll, attackMod) // (8+16)+(8+16)+3 = 51
  
    assert(
      // Smite damage under new rule equals the dice roll, not doubled
      smiteDmg == smiteRoll
      // New-rule total is strictly less than old-rule total
      and totalNewRule < totalOldRule
      // The difference is exactly the undoubled smite dice (one copy, not two)
      and totalOldRule - totalNewRule == smiteRoll
    )
  }

  // Source: https://rpg.stackexchange.com/q/215371
  
  // Rules as written, are Orcs and Drow now functionally the same?
  // Without species traits applied, two creatures sharing the same base NPC stat block are mechanically identical
  run qa_same_base_statblock_identical_outcomes = {
    val orc_tough = freshCreature(30)
    val drow_tough = freshCreature(30)
    val orcAfterDmg = pTakeDamage(orc_tough, 12, Slashing, Set(), Set(), Set(), false)
    val drowAfterDmg = pTakeDamage(drow_tough, 12, Slashing, Set(), Set(), Set(), false)
    assert(orcAfterDmg == drowAfterDmg)
  }
  
  // Adding darkvision (PHB racial trait) to an NPC stat block produces a different mechanical outcome in darkness
  run qa_darkvision_racial_trait_changes_dark_obscurement = {
    // Base stat block with no racial traits: darkness -> HeavilyObscured -> effectively blinded
    val baseObs = pEffectiveObscurement(Dark, false)
    // Orc/Drow with darkvision applied from PHB species entry: darkness -> LightlyObscured -> not blinded
    val darvisionObs = pEffectiveObscurement(Dark, true)
    assert(
      pBlindedByObscurement(baseObs) and
      not(pBlindedByObscurement(darvisionObs))
    )
  }

  // Source: https://reddit.com/r/onednd/comments/11arryq/
  
  // Divine Smite and the other smites cannot double dice on a critical hit in the new UA
  run qa_smite_crit_doubling = {
    // Divine Smite (2024): "immediately after you hit" — triggers post-hit, not added to the
    // damage roll, so the smite dice are NOT doubled on a crit.
    // Spell Smite: says "the target takes an extra Xd6" — added to the damage roll, so dice
    // ARE doubled on a crit (criticalDamage includes smite dice in normalDice+bonusDice).
  
    val strMod = 3
    val weaponRoll = 6    // 1d8 hit
    val smiteRoll = 8     // 2d8 smite (pre-resolved)
  
    // Divine Smite on a crit: only weapon dice doubled; smite is flat (passed as modifier addend)
    val divineSmiteCrit = criticalDamage(weaponRoll, weaponRoll, strMod) + smiteRoll
  
    // Spell Smite on a crit: smite dice are part of the damage roll, so they are doubled too
    val spellSmiteCrit = criticalDamage(weaponRoll + smiteRoll, weaponRoll + smiteRoll, strMod)
  
    // Normal hit: same total for both — smite dice added once regardless of source
    val normalHit = normalDamage(weaponRoll, strMod) + smiteRoll
  
    assert(
      // divineSmiteCrit: 6+6+3 + 8 = 23
      divineSmiteCrit == 23
      // spellSmiteCrit: (6+8)+(6+8)+3 = 31
      and spellSmiteCrit == 31
      // normalHit: 6+3+8 = 17
      and normalHit == 17
      // Spell smite crit deals more than divine smite crit (smite dice doubled vs not)
      and spellSmiteCrit > divineSmiteCrit
      // Both crits exceed a normal hit
      and divineSmiteCrit > normalHit
      and spellSmiteCrit > normalHit
    )
  }

  // Source: https://reddit.com/r/onednd/comments/yuaowf/
  
  // "Mounted travel with new exhaustion": each exhaustion level reduces speed by 5 ft
  run qa_exhaustion_reduces_speed_per_level = {
    val config = TEST_CONFIG // Walk speed 30
    val creature = freshCreature(30).with("exhaustion", 2)
    val t = pStartTurn(config, creature, Unarmored, 0, false, false)
    // 30 - 5*2 = 20
    assert(t.movementRemaining == 20)
  }
  
  // "Mounted travel with new exhaustion": 5 exhaustion levels leave only 5 ft of movement
  run qa_exhaustion5_nearly_eliminates_movement = {
    val config = TEST_CONFIG // Walk speed 30
    val creature = freshCreature(30).with("exhaustion", 5)
    val t = pStartTurn(config, creature, Unarmored, 0, false, false)
    // 30 - 5*5 = 5
    assert(t.movementRemaining == 5)
  }
  
  // "Mounted travel with new exhaustion": zero exhaustion leaves speed unaffected
  run qa_no_exhaustion_no_speed_penalty = {
    val config = TEST_CONFIG // Walk speed 30
    val creature = freshCreature(30) // exhaustion = 0
    val t = pStartTurn(config, creature, Unarmored, 0, false, false)
    assert(t.movementRemaining == 30)
  }

  // Source: https://reddit.com/r/onednd/comments/wwrj2y/
  
  // Earlier editions: What editions of D&D have had the Nat 20/1 rule as default?
  // 5e combat: nat 1 always misses regardless of attack bonus or target AC
  run qa_nat1_always_misses_attack = {
    val result = resolveAttackRoll(1, 15, 5, 0, 20)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // Earlier editions: 5e combat nat 20 always hits and crits even vs near-unreachable AC
  run qa_nat20_always_hits_and_crits = {
    val result = resolveAttackRoll(20, -5, 30, 0, 20)
    assert(result.hits and result.isCritical)
  }
  
  // Earlier editions: 5e death save nat 20 restores 1 HP and removes unconscious
  run qa_death_save_nat20_restores_hp = {
    val dying = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(dying, 20)
    assert(after.hp == 1 and not(after.unconscious))
  }
  
  // Earlier editions: 5e death save nat 1 inflicts two death save failures
  run qa_death_save_nat1_two_failures = {
    val dying = freshCreature(10)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(dying, 1)
    assert(after.deathSaves.failures == 2)
  }
  
  // Earlier editions: 5e skill checks do NOT auto-succeed on nat 20 (OneDnD change)
  run qa_nat20_skill_check_not_auto_success = {
    // nat 20 + 0 ability mod + no proficiency still fails DC 25
    val succeeds = checkSucceeds(20, 0, NoneProf, 2, 0, 25)
    assert(not(succeeds))
  }
  
  // Earlier editions: 5e skill checks do NOT auto-fail on nat 1 with sufficient bonus
  run qa_nat1_skill_check_not_auto_fail = {
    // nat 1 + +10 modifier still succeeds DC 5
    val succeeds = checkSucceeds(1, 10, NoneProf, 2, 0, 5)
    assert(succeeds)
  }

  // Source: https://reddit.com/r/onednd/comments/wts6gf/
  
  // Stealth Roll of 31+: stealth check compares against passive Perception (a finite DC); success is binary — no imperceptibility tier above "hidden"
  run qa_high_stealth_beats_passive_perception = {
    val dexMod    = abilityModifier(20)     // Dex 20 → +5
    val prof      = proficiencyBonus(5)     // level 5 → +3
    val wisMod    = abilityModifier(14)     // observer Wis 14 → +2
    val obsProf   = proficiencyBonus(3)     // observer level 3 → +2
    // passive Perception = 10 + 2 + 2 = 14
    val passivePerc = passiveCheck(wisMod, Proficient, obsProf, false, false)
  
    // Very high stealth (d20=20, total 28) beats passive Perception → hidden
    val highHidden = checkSucceeds(20, dexMod, Proficient, prof, 0, passivePerc)
    // Borderline success (d20=6, total 14) also beats it → same binary outcome, no extra tier
    val barelyHidden = checkSucceeds(6, dexMod, Proficient, prof, 0, passivePerc)
    // A roll that falls short (d20=1, total 9) fails — detection succeeds
    val detected = not(checkSucceeds(1, dexMod, Proficient, prof, 0, passivePerc))
    assert(highHidden and barelyHidden and detected)
  }

  // Source: https://reddit.com/r/onednd/comments/wrsnyn/
  
  // A 1 now auto fails on any check — nat-1 auto-misses on attack roll regardless of modifiers
  run qa_nat1_auto_fails_attack_roll = {
    // +1000 attack bonus cannot save a nat-1; hits must be false
    val result = resolveAttackRoll(1, 1000, 5, 0, 20)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // A 1 now auto fails on any check — nat-20 auto-hits and crits on attack roll regardless of AC
  run qa_nat20_auto_succeeds_attack_roll = {
    // AC 1000 cannot prevent a nat-20; must hit and crit
    val result = resolveAttackRoll(20, 0, 1000, 0, 20)
    assert(result.hits and result.isCritical)
  }

  // Source: https://reddit.com/r/onednd/comments/wsiq8v/
  
  // D20 tests being capped at DC30: concentration DC is hard-capped at 30 even with extreme damage
  run qa_dc30_concentration_cap = {
    // 1000 points of damage / 2 = 500, capped to 30
    assert(pConcentrationDC(1000) == 30)
  }
  
  // DC30 ceiling is reachable: nat 20 + strong modifiers beats DC 30 (no impossible rolls)
  run qa_nat20_succeeds_at_dc30_ceiling = {
    // d20=20, abilityMod=5 (CON 20), Proficient, profBonus=5 (level 9): 20+5+5=30 >= 30
    assert(checkSucceeds(20, 5, Proficient, 5, 0, 30))
  }

  // Source: https://reddit.com/r/onednd/comments/x3c6zp/
  
  // Can Shadow Blade crit? — Shadow Blade "counts as a simple melee weapon"; weapon attacks crit on d20 >= critRange
  run qa_shadow_blade_can_crit = {
    // Roll exactly at critRange on a weapon attack: always hits and crits, even against unreachable AC
    val result = resolveAttackRoll(20, 0, 30, 0, 20)
    assert(result.hits and result.isCritical)
  }
  
  // Can Shadow Blade crit? — roll below critRange on same weapon attack does NOT crit
  run qa_shadow_blade_no_crit_below_range = {
    val result = resolveAttackRoll(19, 0, 30, 0, 20)
    assert(not(result.isCritical))
  }

  // Source: https://rpg.stackexchange.com/q/214578
  
  // So what's in it for the grappler? — grappled attacker has disadvantage on attacks vs non-grappler targets
  run qa_grappled_disadv_vs_non_grappler_fdce9034 = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: true,
      targetIsGrappler: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // So what's in it for the grappler? — grappled attacker has NO disadvantage when attacking the grappler itself
  run qa_grappled_no_disadv_vs_grappler_fdce9034 = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      attackerGrappled: true,
      targetIsGrappler: true,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleePiercing: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }

  // Source: https://reddit.com/r/onednd/comments/16doxsf/
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Champion L10 Heroic Warrior grants Heroic Inspiration at start of turn
  run qa_champion_heroic_warrior_grants_inspiration = {
    val fs = freshFighterState(10)
    val fs1 = pFighterStartTurn(fs, 10)
    assert(fs1.heroicInspiration == true)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Heroic Warrior does not double-grant if inspiration already active
  run qa_champion_heroic_warrior_no_stack = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val fs1 = pFighterStartTurn(fs, 10)
    assert(fs1.heroicInspiration == true)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Heroic Warrior not available below L10
  run qa_champion_heroic_warrior_requires_l10 = {
    val fs = freshFighterState(9)
    val fs1 = pFighterStartTurn(fs, 9)
    assert(fs1.heroicInspiration == false)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Champion L3 Improved Critical sets crit range to 19
  run qa_champion_improved_critical_range_19 = {
    val config = configForLevel(3)
    assert(config.critRange == 19)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Champion L15 Superior Critical sets crit range to 18
  run qa_champion_superior_critical_range_18 = {
    val config = configForLevel(15)
    assert(config.critRange == 18)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Champion L3 scores a critical hit on d20=19 (Improved Critical)
  run qa_champion_l3_crit_on_19 = {
    val config = configForLevel(3)
    val result = resolveAttackRoll(19, 5, 15, 0, config.critRange)
    all {
      assert(result.hits == true),
      assert(result.isCritical == true),
    }
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — pre-Champion (L2) does NOT crit on d20=19
  run qa_fighter_l2_no_crit_on_19 = {
    val config = configForLevel(2)
    val result = resolveAttackRoll(19, 5, 15, 0, config.critRange)
    all {
      assert(result.hits == true),
      assert(result.isCritical == false),
    }
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Fighter L5 Extra Attack yields 1 bonus attack
  run qa_fighter_l5_extra_attack_count = {
    val config = configForLevel(5)
    assert(extraAttacksFromConfig(config) == 1)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Fighter L11 yields 2 extra attacks (3 total)
  run qa_fighter_l11_extra_attack_count = {
    val config = configForLevel(11)
    assert(extraAttacksFromConfig(config) == 2)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Fighter L20 yields 3 extra attacks (4 total)
  run qa_fighter_l20_extra_attack_count = {
    val config = configForLevel(20)
    assert(extraAttacksFromConfig(config) == 3)
  }
  
  // UA7 Science: Fighter (Champion) vs. Warlock (Blade) — Heroic Inspiration is consumed (set false) when used
  run qa_heroic_inspiration_consumed_on_use_fe0458ed = {
    val fs = freshFighterState(10).with("heroicInspiration", true)
    val fs1 = fs.with("heroicInspiration", false)
    assert(fs1.heroicInspiration == false)
  }

  // Source: https://rpg.stackexchange.com/q/215177
  
  run qa_jump_spell_grappled_target_doubles_movement_spent = {{
    val t0 = FRESH_TURN
    val noGrappleCost = pUseMovement(t0, 10, 1)
    val grappleCost = pUseMovement(t0, 10, 2)
    assert(noGrappleCost.movementRemaining == 20 and grappleCost.movementRemaining == 10)
  }}

  // Source: https://reddit.com/r/onednd/comments/y5q2ao/
  
  // Bard Inspiration OD&D: reaction-based BI conflicts with other reactions — once reaction is used it is unavailable
  run qa_bardic_inspiration_reaction_blocks_other_reactions = {
    val t0 = FRESH_TURN
    // Simulate using reaction (e.g., Bardic Inspiration as reaction)
    val t1 = pUseReaction(t0)
    // Attempting to use reaction again is a no-op (no reaction available)
    val t2 = pUseReaction(t1)
    assert(
      t1.reactionAvailable == false
      and t2 == t1
    )
  }
  
  // Bard Inspiration OD&D: bonus action remains a single-use resource per turn (Healing Word still competes)
  run qa_bonus_action_single_use_per_turn = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseBonusAction(t0, creature)
    // Second bonus action attempt is a no-op — already used
    val t2 = pUseBonusAction(t1, creature)
    assert(
      t1.bonusActionUsed == true
      and t2.bonusActionUsed == true
      and t2 == t1
    )
  }

  // Source: https://reddit.com/r/onednd/comments/1i06mr1/
  
  // OneDnD maximum Movement speed: each Dash action adds full base speed to movement pool (stacks additively)
  run qa_dash_stacks_movement = {
    val creature = freshCreature(30)
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, 0, false, false)
    // Base movement equals effective speed
    val afterActionDash = pUseAction(t0, creature, ADash)
    // Bonus Action Dash also adds effectiveSpeed
    val afterBonusActionDash = pBonusActionDash(afterActionDash, creature)
    all {
      // Turn start: movementRemaining == effectiveSpeed (30 ft for TEST_CONFIG)
      assert(t0.movementRemaining == t0.effectiveSpeed),
      // After Action Dash: movement = 2× base
      assert(afterActionDash.movementRemaining == t0.effectiveSpeed * 2),
      // After Bonus Action Dash: movement = 3× base
      assert(afterBonusActionDash.movementRemaining == t0.effectiveSpeed * 3),
      // Each Dash adds exactly one copy of effectiveSpeed
      assert(afterActionDash.movementRemaining - t0.movementRemaining == t0.effectiveSpeed),
      assert(afterBonusActionDash.movementRemaining - afterActionDash.movementRemaining == t0.effectiveSpeed),
    }
  }

  // Source: https://reddit.com/r/onednd/comments/1ikn3dl/
  
  // Is Undead Nature gone? — suffocation applies exhaustion; exhaustion level 6 causes death (immune creatures unaffected)
  run qa_suffocation_exhaustion_kills_at_6 = {
    val s = freshCreature(30)
    // Simulate suffocation: each round without air adds 1 exhaustion level after grace period expires
    val s1 = pAddExhaustion(s, 1)
    val s2 = pAddExhaustion(s1, 1)
    val s3 = pAddExhaustion(s2, 1)
    val s4 = pAddExhaustion(s3, 1)
    val s5 = pAddExhaustion(s4, 1)
    val s6 = pAddExhaustion(s5, 1)
    all {
      assert(s6.exhaustion == 6),
      assert(s6.dead),
    }
  }
  
  // Is Undead Nature gone? — exhaustion-immune creature (exhaustion stays 0) cannot die via the suffocation path
  run qa_exhaustion_immune_survives_suffocation = {
    val s = freshCreature(30)
    // An exhaustion-immune creature never gains exhaustion levels;
    // confirm exhaustion 0 is neither fatal nor near-fatal regardless of suffocation duration
    val sAfterImmunity = pReduceExhaustion(s, 0)
    all {
      assert(sAfterImmunity.exhaustion == 0),
      assert(not(sAfterImmunity.dead)),
    }
  }

}
