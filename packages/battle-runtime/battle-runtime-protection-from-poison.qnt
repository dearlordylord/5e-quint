// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION

module battleRuntimeProtectionFromPoison {
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  pure def protectionFromPoisonDurationTicks: int = 1 * 60 * 10

  pure def protectionFromPoisonSavingThrowAdvantageActiveEffect: ActiveEffect =
    ProtectionFromPoisonSavingThrowAdvantage({ durationTicks: protectionFromPoisonDurationTicks })

  pure def protectionFromPoisonResistanceActiveEffect: ActiveEffect =
    ProtectionFromPoisonPoisonResistance({ durationTicks: protectionFromPoisonDurationTicks })

  pure def activeEffectsWithoutProtectionFromPoison(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ProtectionFromPoisonSavingThrowAdvantage(_) => false
      | ProtectionFromPoisonPoisonResistance(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutPoisoned(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | RayOfSicknessPoisoned => false
      | _ => true
    })

  pure def protectionFromPoisonActiveEffects: Set[ActiveEffect] =
    Set(protectionFromPoisonSavingThrowAdvantageActiveEffect, protectionFromPoisonResistanceActiveEffect)

  pure def applyProtectionFromPoisonToCombatant(combatant: Combatant): Combatant = {
    val cleansedEffects = activeEffectsWithoutPoisoned(combatant.activeEffects)
    val replacedEffects = activeEffectsWithoutProtectionFromPoison(cleansedEffects)
    {
      ...combatant,
      activeEffects: replacedEffects.union(protectionFromPoisonActiveEffects),
    }
  }

  pure def protectionFromPoisonTargetedState(state: BattleState, target: Actor): BattleState =
    {
      ...state,
      fighter: if (target == Fighter) applyProtectionFromPoisonToCombatant(state.fighter) else state.fighter,
      goblin: if (target == Goblin) applyProtectionFromPoisonToCombatant(state.goblin) else state.goblin,
    }

  pure def resolveProtectionFromPoisonSpell(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) == Fighter and
      canSpendFighterSpellActionCost(state, SpellMagicAction) and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      commitActorSpellSlotUse(
        spendFighterSpellActionCost(protectionFromPoisonTargetedState(state, target), SpellMagicAction),
        Fighter,
      )
    } else {
      state
    }

  pure def hasProtectionFromPoisonSavingThrowAdvantage(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | ProtectionFromPoisonSavingThrowAdvantage(_) => true
      | _ => false
    })

  pure def protectionFromPoisonSavingThrowRollMode(effects: Set[ActiveEffect]): SavingThrowRollMode =
    if (hasProtectionFromPoisonSavingThrowAdvantage(effects))
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def hasProtectionFromPoisonResistance(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | ProtectionFromPoisonPoisonResistance(_) => true
      | _ => false
    })

  pure def damageAfterProtectionFromPoisonResistance(
    damage: int,
    damageType: DamageType,
    effects: Set[ActiveEffect],
  ): int =
    damageAfterAdjustments(
      damage,
      damageType,
      if (hasProtectionFromPoisonResistance(effects)) Set(Poison) else Set(),
      Set(),
      Set(),
    )

  run test_protection_from_poison_cast_removes_poisoned_and_applies_protection = {
    val poisoned = {
      ...initialState,
      goblin: { ...initialState.goblin, activeEffects: Set(RayOfSicknessPoisoned) },
    }
    val result = resolveProtectionFromPoisonSpell(poisoned, Goblin)
    all {
      assert(not(result.actionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(not(result.goblin.activeEffects.contains(RayOfSicknessPoisoned))),
      assert(result.goblin.activeEffects.contains(protectionFromPoisonSavingThrowAdvantageActiveEffect)),
      assert(result.goblin.activeEffects.contains(protectionFromPoisonResistanceActiveEffect)),
    }
  }

  run test_protection_from_poison_projects_save_advantage_and_damage_resistance = {
    val effects = protectionFromPoisonActiveEffects
    all {
      assert(protectionFromPoisonSavingThrowRollMode(effects) == AdvantageSavingThrow),
      assert(protectionFromPoisonSavingThrowRollMode(Set()) == NormalSavingThrow),
      assert(damageAfterProtectionFromPoisonResistance(9, Poison, effects) == 4),
      assert(damageAfterProtectionFromPoisonResistance(9, Slashing, effects) == 9),
    }
  }

  run test_protection_from_poison_protection_expires_after_duration_tick = {
    val expiringEffects = Set(
      ProtectionFromPoisonSavingThrowAdvantage({ durationTicks: 1 }),
      ProtectionFromPoisonPoisonResistance({ durationTicks: 1 }),
    )
    all {
      assert(tickDurationActiveEffects(expiringEffects) == Set()),
      assert(tickDurationActiveEffects(protectionFromPoisonActiveEffects).contains(
        ProtectionFromPoisonSavingThrowAdvantage({ durationTicks: protectionFromPoisonDurationTicks - 1 })
      )),
      assert(tickDurationActiveEffects(protectionFromPoisonActiveEffects).contains(
        ProtectionFromPoisonPoisonResistance({ durationTicks: protectionFromPoisonDurationTicks - 1 })
      )),
    }
  }
}
