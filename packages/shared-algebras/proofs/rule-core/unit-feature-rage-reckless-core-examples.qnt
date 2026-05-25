// -*- mode: Bluespec; -*-

module unitFeatureRageRecklessCoreExamples {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"
  import unitFeatureRageRecklessCore.* from "./unit-feature-rage-reckless-core"

  run test_rage_spends_bonus_action_breaks_concentration_and_grants_riders = {
    val state = {
      turn: initialTurnProcedureState,
      pool: { usesRemaining: 2, maximumUses: 2 },
      occurrence: NoRageOccurrence,
      concentration: {
        interruptedActor: Concentrating,
        reactor: NoConcentration,
      },
    }
    val raging = startRage(state, {
      wearingHeavyArmor: false,
      incapacitated: false,
      persistentRage: false,
    })
    val damage = applyRageDamageBonus(raging, {
      usesStrength: true,
      dealsDamage: true,
      attackForm: RageWeaponAttack,
    }, 9, 5)
    all {
      assert(raging.occurrence == RageUntilEndOfNextTurn),
      assert(not(raging.turn.bonusActionAvailable)),
      assert(raging.pool.usesRemaining == 1),
      assert(raging.concentration.interruptedActor == NoConcentration),
      assert(ragePreventsConcentrationOrSpellcasting(raging)),
      assert(rageGrantsResistance(RageBludgeoningDamage)),
      assert(rageGrantsResistance(RagePiercingDamage)),
      assert(rageGrantsResistance(RageSlashingDamage)),
      assert(not(rageGrantsResistance(RageOtherDamage))),
      assert(damage == 8),
      assert(legalRageState(raging)),
    }
  }

  run test_rage_heavy_armor_and_incapacitated_block_or_end = {
    val state = {
      turn: initialTurnProcedureState,
      pool: { usesRemaining: 2, maximumUses: 2 },
      occurrence: NoRageOccurrence,
      concentration: {
        interruptedActor: NoConcentration,
        reactor: NoConcentration,
      },
    }
    val blocked = startRage(state, {
      wearingHeavyArmor: true,
      incapacitated: false,
      persistentRage: false,
    })
    val raging = startRage(state, {
      wearingHeavyArmor: false,
      incapacitated: false,
      persistentRage: false,
    })
    val ended = endRageIfBlocked(raging, {
      madeAttackRollAgainstEnemy: false,
      forcedEnemySavingThrow: false,
      spendsBonusAction: false,
      incapacitated: true,
      unconscious: false,
      wearingHeavyArmor: false,
    })
    all {
      assert(blocked == state),
      assert(ended.occurrence == NoRageOccurrence),
    }
  }

  run test_reckless_attack_only_activates_on_first_strength_attack_roll = {
    val initial = {
      occurrence: NoRecklessAttackOccurrence,
      attackRollMadeThisTurn: false,
    }
    val reckless = activateRecklessAttackOnFirstAttackRoll(initial, {
      choosesRecklessAttack: true,
      strengthAttackRoll: true,
    })
    val later = activateRecklessAttackOnFirstAttackRoll(startTurnRecklessAttack(reckless)
      .with("attackRollMadeThisTurn", true), {
      choosesRecklessAttack: true,
      strengthAttackRoll: true,
    })
    all {
      assert(recklessAttackGrantsAdvantage(reckless, { strengthAttackRoll: true })),
      assert(not(recklessAttackGrantsAdvantage(reckless, { strengthAttackRoll: false }))),
      assert(recklessAttackGrantsIncomingAttackAdvantage(reckless)),
      assert(startTurnRecklessAttack(reckless).occurrence == NoRecklessAttackOccurrence),
      assert(later.occurrence == NoRecklessAttackOccurrence),
    }
  }

  run test_frenzy_uses_rage_reckless_strength_first_hit_facts = {
    val rage = {
      turn: initialTurnProcedureState,
      pool: { usesRemaining: 1, maximumUses: 2 },
      occurrence: RageUntilEndOfNextTurn,
      concentration: {
        interruptedActor: NoConcentration,
        reactor: NoConcentration,
      },
    }
    val reckless = {
      occurrence: RecklessAttackUntilStartOfTurn,
      attackRollMadeThisTurn: true,
    }
    val state = initialFrenzyState(rage, reckless, true)
    val result = resolveFrenzy(state, {
      hitWithAttackRoll: true,
      strengthBasedAttack: true,
      attackForm: RageUnarmedStrikeAttack,
      barbarianLevel: 3,
      attackDamageType: BludgeoningDamage,
    })
    val repeated = resolveFrenzy(result.state, {
      hitWithAttackRoll: true,
      strengthBasedAttack: true,
      attackForm: RageWeaponAttack,
      barbarianLevel: 3,
      attackDamageType: SlashingDamage,
    })
    val blocked = resolveFrenzy(initialFrenzyState(rage, reckless, false), {
      hitWithAttackRoll: true,
      strengthBasedAttack: true,
      attackForm: RageWeaponAttack,
      barbarianLevel: 3,
      attackDamageType: SlashingDamage,
    })
    all {
      assert(result.admitted),
      assert(result.state.firstEligibleHitResolvedThisTurn),
      assert(result.damageDice == rageDamageBonus(3)),
      assert(result.damageType == BludgeoningDamage),
      assert(not(repeated.admitted)),
      assert(not(blocked.admitted)),
    }
  }
}
