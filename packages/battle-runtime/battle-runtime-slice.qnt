// -*- mode: Bluespec; -*-

module battleRuntimeSlice {
  // SRD traceability for this phase-1 battle runtime slice:
  // - Playing-the-Game.md lines 479-495: combat proceeds in rounds and turns
  //   by Initiative order, and the Initiative order remains fixed round to round.
  // - Playing-the-Game.md lines 501-513: a turn can include one action, and
  //   doing nothing is a legal turn choice. ASSUMPTIONS.md A2 records the repo
  //   modeling choice that End Turn is a runtime transition, not a rules Action.
  // - Playing-the-Game.md lines 582-589 and 700-703: an Attack chooses a
  //   target, resolves an attack roll, rolls damage on a hit, and rolls the
  //   attack's damage dice twice on a Critical Hit.
  // - Playing-the-Game.md lines 684-698 and 788-808: damage subtracts from HP,
  //   HP cannot go below 0, weapon damage adds the attack ability modifier, and
  //   Temporary Hit Points absorb damage before HP.
  // - Playing-the-Game.md lines 748-780 and ASSUMPTIONS.md A12: Stat Block
  //   monsters use Monster Death at 0 HP; Character Build combatants use the
  //   Death Saving Throw lifecycle, including instant death from massive
  //   damage. This slice covers the immediate HP-mutation boundary: drop to
  //   0 HP, damage at 0 HP, Critical Hit damage at 0 HP, and Massive Damage.
  //   Start-turn Death Saving Throw rolls, Stable recovery/handoff, and
  //   post-battle character closeout are future width, not part of this slice.
  // - Classes/Fighter.md lines 76-80: Action Surge grants one additional action
  //   except Magic, spends one use per Short or Long Rest, and is limited to
  //   once per turn.
  // - Spells/Gaining-and-Casting.md lines 40-65 and 178-182, Classes/Wizard.md
  //   lines 56-82, Spells/Descriptions-M-P.md lines 86-96, and
  //   Spells/Descriptions-Q-R.md lines 41-52: prepared level-1 Wizard spells
  //   spend Spell Slots; cantrips do not; spell attacks add Proficiency Bonus;
  //   Magic Missile can put all darts on one target; Ray of Frost reduces Speed
  //   until the start of the caster's next turn.
  // - Rules-Glossary.md "Armor Training": lacking training for worn armor
  //   prevents spellcasting while preserving Spell Slot state.
  // - Monsters/Monsters-P-S.md lines 1152-1175 and UBIQUITOUS_LANGUAGE.md:
  //   Skeleton has Bludgeoning vulnerability and Poison damage immunity.
  //
  // This slice is the package-local parity reference for implemented
  // @dnd/battle-runtime behavior. Old root battle.qnt remains legacy/broad
  // proof/reference material until BA reconciliation classifies, restores,
  // merges, or quarantines it; it is not the place to add new promoted
  // runtime behavior.

  type Actor = Fighter | Goblin

  type DamageType = Bludgeoning | Poison | Force | Cold | Slashing | Piercing

  type SpellInvocation = MagicMissile | RayOfFrost

  type Hole = TargetChoice | AttackRoll | DamageRoll

  type ZeroHpLifecycle = DiesAtZeroHp | UsesDeathSavingThrows

  type Combatant = {
    hp: int,
    maxHp: int,
    tempHp: int,
    ac: int,
    unconscious: bool,
    deathFailures: int,
    lifecycle: ZeroHpLifecycle,
  }

  type Initiative = {
    round: int,
    alreadyActed: List[Actor],
    stillToAct: List[Actor],
  }

  type BattleState = {
    initiative: Initiative,
    fighter: Combatant,
    goblin: Combatant,
    actionAvailable: bool,
    bonusActionAvailable: bool,
  }

  type ActionSurgeResult = {
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  }

  type AttackReplay =
    | AttackNeedsTarget
    | AttackNeedsAttackRoll
    | AttackRollFilled({ attackTotal: int, naturalD20: int })
    | AttackReplayComplete

  pure val initialState: BattleState = {
    initiative: { round: 1, alreadyActed: [], stillToAct: [Fighter, Goblin] },
    fighter: {
      hp: 12,
      maxHp: 12,
      tempHp: 0,
      ac: 10,
      unconscious: false,
      deathFailures: 0,
      lifecycle: UsesDeathSavingThrows,
    },
    goblin: {
      hp: 10,
      maxHp: 10,
      tempHp: 0,
      ac: 15,
      unconscious: false,
      deathFailures: 0,
      lifecycle: DiesAtZeroHp,
    },
    actionAvailable: true,
    bonusActionAvailable: true,
  }

  // The promoted runtime receives Initiative counts and the caller-resolved
  // order for tied counts at the boundary. The slice treats that order as
  // authoritative once battle starts.
  pure val callerOrderedTieInitialState: BattleState = {
    ...initialState,
    initiative: { round: 1, alreadyActed: [], stillToAct: [Goblin, Fighter] },
  }

  pure def currentActor(state: BattleState): Actor =
    state.initiative.stillToAct[0]

  pure def currentActorCanAttack(state: BattleState): bool =
    state.actionAvailable and
    (
      (currentActor(state) == Fighter and not(state.fighter.unconscious)) or
      (currentActor(state) == Goblin and state.goblin.hp > 0)
    )

  pure def attackTargetAc(state: BattleState): int =
    if (currentActor(state) == Fighter) state.goblin.ac else state.fighter.ac

  pure def openHoles(state: BattleState): Set[Hole] =
    if (currentActorCanAttack(state))
      Set(TargetChoice)
    else Set()

  pure def attackReplayHoles(state: BattleState, replay: AttackReplay): Set[Hole] =
    if (not(currentActorCanAttack(state)))
      Set()
    else match replay {
      | AttackNeedsTarget => Set(TargetChoice)
      | AttackNeedsAttackRoll => Set(AttackRoll)
      | AttackRollFilled(roll) =>
          if (attackHits(roll.attackTotal, roll.naturalD20, attackTargetAc(state)))
            Set(DamageRoll)
          else
            Set()
      | AttackReplayComplete => Set()
    }

  pure def nextInitiative(initiative: Initiative): Initiative = {
    val current = initiative.stillToAct[0]
    val remaining = initiative.stillToAct.slice(1, initiative.stillToAct.length())
    val acted = initiative.alreadyActed.append(current)

    if (remaining.length() == 0)
      { round: initiative.round + 1, alreadyActed: [], stillToAct: acted }
    else
      { round: initiative.round, alreadyActed: acted, stillToAct: remaining }
  }

  pure def endTurn(state: BattleState): BattleState =
    {
      ...state,
      initiative: nextInitiative(state.initiative),
      actionAvailable: true,
      bonusActionAvailable: true,
    }

  pure def attackHits(total: int, naturalD20: int, armorClass: int): bool =
    if (naturalD20 == 1) false
    else if (naturalD20 == 20) true
    else total >= armorClass

  pure def withGoblinHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, goblin: { ...state.goblin, hp: hp, tempHp: tempHp } }

  pure def withFighterHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, fighter: { ...state.fighter, hp: hp, tempHp: tempHp } }

  pure def resolveAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious)
      state
    else if (not(attackHits(attackTotal, naturalD20, state.goblin.ac)))
      { ...state, actionAvailable: false }
    else
      { ...state, goblin: applyDamage(state.goblin, damageRoll + 3, if (naturalD20 == 20) 2 else 1), actionAvailable: false }

  pure def resolveGoblinAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, state.fighter.ac)))
      { ...state, actionAvailable: false }
    else
      { ...state, fighter: applyDamage(state.fighter, damageRoll + 2, if (naturalD20 == 20) 2 else 1), actionAvailable: false }

  pure def applyDamage(target: Combatant, damage: int, deathFailuresAtZeroHp: int): Combatant = {
    val effectiveDamage = if (damage < 0) 0 else damage
    val tempHpAbsorbed = if (target.tempHp < effectiveDamage) target.tempHp else effectiveDamage
    val hpDamage = effectiveDamage - tempHpAbsorbed
    val nextHp = if (target.hp - hpDamage < 0) 0 else target.hp - hpDamage
    val massiveDamageKills =
      hpDamage > 0 and
      (if (target.hp <= 0) hpDamage else hpDamage - target.hp) >= target.maxHp
    val damaged = { ...target, hp: nextHp, tempHp: target.tempHp - tempHpAbsorbed }

    if (effectiveDamage <= 0)
      target
    else if (target.hp <= 0)
      if (massiveDamageKills) applyInstantDeath(damaged) else applyDamageAtZeroHp(damaged, deathFailuresAtZeroHp)
    else if (nextHp > 0)
      damaged
    else
      if (massiveDamageKills) applyInstantDeath(damaged) else applyDropToZeroHp(damaged)
  }

  pure def damageAfterAdjustments(
    damage: int,
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    if (immunities.contains(damageType)) 0
    else {
      val afterResistance =
        if (resistances.contains(damageType)) damage / 2 else damage

      if (vulnerabilities.contains(damageType))
        afterResistance * 2
      else
        afterResistance
    }

  pure def sameTypeDamageAfterAdjustments(
    damageParts: List[int],
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    damageAfterAdjustments(
      damageParts.foldl(0, (total, damage) => total + damage),
      damageType,
      resistances,
      vulnerabilities,
      immunities,
    )

  pure def grantActionSurge(
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  ): ActionSurgeResult =
    if (currentActor(state) == Fighter and usesRemaining > 0 and not(usedThisTurn))
      {
        state: { ...state, actionAvailable: true },
        usesRemaining: usesRemaining - 1,
        usedThisTurn: true,
      }
    else
      { state: state, usesRemaining: usesRemaining, usedThisTurn: usedThisTurn }

  pure def expendedSlotsAfterInvocation(
    invocation: SpellInvocation,
    expendedLevelOneSlots: int,
  ): int =
    match invocation {
      | MagicMissile => expendedLevelOneSlots + 1
      | RayOfFrost => expendedLevelOneSlots
    }

  pure def canDiscoverSpellActs(canCastSpells: bool): bool =
    canCastSpells

  pure def spellAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def magicMissileAllDartsDamage(
    dieTotal: int,
    dartCount: int,
    flatPerDart: int,
  ): int =
    dieTotal + (dartCount * flatPerDart)

  pure def rayOfFrostSpeedEffectActive(
    hit: bool,
    currentActor: Actor,
    caster: Actor,
  ): bool =
    hit and currentActor != caster

  pure def applyDropToZeroHp(target: Combatant): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => target
      | UsesDeathSavingThrows => { ...target, unconscious: true, deathFailures: 0 }
    }

  pure def applyDamageAtZeroHp(target: Combatant, deathFailuresAtZeroHp: int): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => target
      | UsesDeathSavingThrows => {
          ...target,
          unconscious: true,
          deathFailures: if (target.deathFailures + deathFailuresAtZeroHp > 3) 3 else target.deathFailures + deathFailuresAtZeroHp,
        }
    }

  pure def applyInstantDeath(target: Combatant): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => target
      | UsesDeathSavingThrows => { ...target, unconscious: true, deathFailures: 3 }
    }

  run test_initial_holes_cover_attack_target = {
    assert(openHoles(initialState) == Set(TargetChoice))
  }

  run test_attack_replay_asks_for_attack_roll_after_target = {
    assert(attackReplayHoles(initialState, AttackNeedsAttackRoll) == Set(AttackRoll))
  }

  run test_attack_replay_asks_for_damage_roll_after_hit = {
    assert(attackReplayHoles(initialState, AttackRollFilled({ attackTotal: 15, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_goblin_turn_opens_stat_block_attack_target_hole = {
    assert(openHoles(endTurn(initialState)) == Set(TargetChoice))
  }

  run test_caller_ordered_initiative_tie_selects_first_supplied_actor = {
    all {
      assert(currentActor(callerOrderedTieInitialState) == Goblin),
      assert(
        endTurn(endTurn(callerOrderedTieInitialState)).initiative.stillToAct == [Goblin, Fighter]
      ),
    }
  }

  run test_goblin_attack_replay_uses_fighter_armor_class = {
    assert(attackReplayHoles(endTurn(initialState), AttackRollFilled({ attackTotal: 19, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_attack_miss_spends_action_without_damage = {
    val result = resolveAttack(initialState, 14, 9, 0)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
      assert(result.goblin.tempHp == 0),
    }
  }

  run test_attack_hit_applies_damage_and_spends_action = {
    val result = resolveAttack(initialState, 15, 10, 4)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
    }
  }

  run test_goblin_attack_hit_applies_stat_block_damage_to_fighter = {
    val result = resolveGoblinAttack(endTurn(initialState), 20, 18, 5)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 5),
    }
  }

  run test_skeleton_damage_adjustments_apply_vulnerability_and_immunity = {
    all {
      assert(
        damageAfterAdjustments(5, Bludgeoning, Set(), Set(Bludgeoning), Set(Poison)) == 10
      ),
      assert(damageAfterAdjustments(5, Poison, Set(), Set(Bludgeoning), Set(Poison)) == 0),
    }
  }

  run test_same_type_damage_adjustments_apply_resistance_after_combining_parts = {
    assert(
      sameTypeDamageAfterAdjustments([3, 1], Slashing, Set(Slashing), Set(), Set()) == 2
    )
  }

  run test_action_surge_grants_one_extra_action_and_spends_use = {
    val result = grantActionSurge({ ...initialState, actionAvailable: false }, 1, false)
    all {
      assert(result.state.actionAvailable),
      assert(result.usesRemaining == 0),
      assert(result.usedThisTurn),
      assert(grantActionSurge(result.state, result.usesRemaining, result.usedThisTurn) == result),
    }
  }

  run test_spell_invocation_slot_spend_distinguishes_prepared_spell_from_cantrip = {
    all {
      assert(expendedSlotsAfterInvocation(MagicMissile, 0) == 1),
      assert(expendedSlotsAfterInvocation(RayOfFrost, 0) == 0),
    }
  }

  run test_spell_act_discovery_respects_spellcasting_gate = {
    all {
      assert(canDiscoverSpellActs(true)),
      assert(not(canDiscoverSpellActs(false))),
    }
  }

  run test_spell_invocation_executable_spell_facts = {
    all {
      assert(spellAttackModifier(3, 2) == 5),
      assert(magicMissileAllDartsDamage(3, 3, 1) == 6),
      assert(rayOfFrostSpeedEffectActive(true, Goblin, Fighter)),
      assert(not(rayOfFrostSpeedEffectActive(true, Fighter, Fighter))),
    }
  }

  run test_critical_hit_applies_doubled_damage_dice = {
    val result = resolveAttack(initialState, 20, 20, 9)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
    }
  }

  run test_temporary_hp_absorbs_damage_before_hp = {
    val result = resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, 4)
    all {
      assert(result.goblin.tempHp == 0),
      assert(result.goblin.hp == 8),
    }
  }

  run test_hp_clamps_to_zero_and_monster_dies = {
    val result = resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, 8)
    all {
      assert(result.goblin.hp == 0),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_character_drop_to_zero_uses_death_saving_throw_lifecycle = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 0),
      assert(result.lifecycle == UsesDeathSavingThrows),
    }
  }

  run test_massive_damage_kills_character_on_drop_to_zero = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 19, 2)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_character_damage_at_zero_adds_one_death_failure = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 1),
    }
  }

  run test_character_critical_damage_at_zero_adds_two_death_failures = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 2),
    }
  }

  run test_massive_damage_at_zero_kills_character = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 13, 2)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_end_turn_advances_current_actor_and_resets_resources = {
    val result = endTurn({ ...initialState, actionAvailable: false, bonusActionAvailable: false })
    all {
      assert(currentActor(result) == Goblin),
      assert(result.initiative.round == 1),
      assert(result.actionAvailable),
      assert(result.bonusActionAvailable),
    }
  }

  run test_end_turn_wraps_to_next_round = {
    val result = endTurn(endTurn(initialState))
    all {
      assert(currentActor(result) == Fighter),
      assert(result.initiative.round == 2),
      assert(result.initiative.alreadyActed == []),
      assert(result.initiative.stillToAct == [Fighter, Goblin]),
    }
  }
}
