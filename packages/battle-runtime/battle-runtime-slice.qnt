// -*- mode: Bluespec; -*-

module battleRuntimeSlice {
  // SRD traceability for this phase-1 battle runtime slice:
  // - Playing-the-Game.md lines 479-495: combat proceeds in rounds and turns
  //   by Initiative order, and the Initiative order remains fixed round to round.
  // - Playing-the-Game.md lines 501-513: a turn can include one action, and
  //   doing nothing is a legal turn choice. ASSUMPTIONS.md A2 records the repo
  //   modeling choice that End Turn is a runtime transition, not an SRD Action.
  // - Playing-the-Game.md lines 582-589 and 700-703: an Attack chooses a
  //   target, resolves an attack roll, rolls damage on a hit, and rolls the
  //   attack's damage dice twice on a Critical Hit.
  // - Playing-the-Game.md lines 684-698 and 788-808: damage subtracts from HP,
  //   HP cannot go below 0, weapon damage adds the attack ability modifier, and
  //   Temporary Hit Points absorb damage before HP.
  // - Playing-the-Game.md lines 748-780 and ASSUMPTIONS.md A12: Stat Block
  //   monsters use Monster Death at 0 HP; Character Build combatants use the
  //   Death Saving Throw lifecycle, including instant death from massive
  //   damage.
  //
  // This slice is the package-local parity reference for implemented
  // @dnd/battle-runtime behavior. The root battle.qnt remains the broader
  // combat authority until the package-local slice is reconciled into the
  // canonical battle spec.

  type Actor = Fighter | Goblin

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

  pure def currentActor(state: BattleState): Actor =
    state.initiative.stillToAct[0]

  pure def openHoles(state: BattleState): Set[Hole] =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious))
      Set(TargetChoice)
    else Set()

  pure def attackReplayHoles(state: BattleState, replay: AttackReplay): Set[Hole] =
    if (currentActor(state) != Fighter or not(state.actionAvailable) or state.fighter.unconscious)
      Set()
    else match replay {
      | AttackNeedsTarget => Set(TargetChoice)
      | AttackNeedsAttackRoll => Set(AttackRoll)
      | AttackRollFilled(roll) =>
          if (attackHits(roll.attackTotal, roll.naturalD20, state.goblin.ac))
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
