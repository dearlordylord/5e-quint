// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-after-hit-damage spell.invocation-after-hit-damage-illumination spell.invocation-magic-weapon-enhancement spell.invocation-weapon-damage-rider

module battleRuntimeWeaponHitSpellRiders {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"

  pure def favorWeaponDamageRiderDurationTicks: int =
    battleRuntimeDivineFavorDurationTicks

  pure def activeEffectsWithoutDivineFavor(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsContainDivineFavor(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => true
      | _ => false
    })

  pure def fighterDivineFavorDamage(divineFavorDamageRoll: int, effects: Set[ActiveEffect]): int =
    if (activeEffectsContainDivineFavor(effects)) divineFavorDamageRoll else 0

  pure def magicWeaponDurationTicks: int =
    60 * 10

  pure def magicWeaponEnhancementBonus(slotLevel: int): int =
    if (slotLevel >= 6) 3 else if (slotLevel >= 3) 2 else if (slotLevel >= 2) 1 else 0

  pure def activeEffectsWithoutMagicWeaponFromSource(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | MagicWeaponEnhancement(data) => data.source != source
      | _ => true
    })

  pure def activeEffectsContainMagicWeaponForItem(effects: Set[ActiveEffect], target: Actor, weaponItem: MagicWeaponItem): bool =
    effects.exists(effect => match effect {
      | MagicWeaponEnhancement(data) => data.target == target and data.weaponItem == weaponItem
      | _ => false
    })

  pure def activeEffectsContainMagicWeaponFromOtherSource(
    effects: Set[ActiveEffect],
    target: Actor,
    weaponItem: MagicWeaponItem,
    source: Actor,
  ): bool =
    effects.exists(effect => match effect {
      | MagicWeaponEnhancement(data) => data.target == target and data.weaponItem == weaponItem and data.source != source
      | _ => false
    })

  pure def activeEffectsMagicWeaponEnhancementBonus(effects: Set[ActiveEffect], target: Actor, weaponItem: MagicWeaponItem): int =
    effects
      .map(effect => match effect {
        | MagicWeaponEnhancement(data) => if (data.target == target and data.weaponItem == weaponItem) data.bonus else 0
        | _ => 0
      })
      .fold(0, (highest, bonus) => if (highest > bonus) highest else bonus)

  pure def battleStateWithoutMagicWeaponFromSource(state: BattleState, source: Actor): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: activeEffectsWithoutMagicWeaponFromSource(state.fighter.activeEffects, source),
      },
      goblin: {
        ...state.goblin,
        activeEffects: activeEffectsWithoutMagicWeaponFromSource(state.goblin.activeEffects, source),
      },
    }

  pure def battleStateMagicWeaponItemHasOtherSource(
    state: BattleState,
    target: Actor,
    weaponItem: MagicWeaponItem,
    source: Actor,
  ): bool =
    activeEffectsContainMagicWeaponFromOtherSource(state.fighter.activeEffects, target, weaponItem, source) or
      activeEffectsContainMagicWeaponFromOtherSource(state.goblin.activeEffects, target, weaponItem, source)

  pure def battleStateMagicWeaponItemIsMagic(state: BattleState, target: Actor, weaponItem: MagicWeaponItem): bool =
    activeEffectsContainMagicWeaponForItem(state.fighter.activeEffects, target, weaponItem) or
      activeEffectsContainMagicWeaponForItem(state.goblin.activeEffects, target, weaponItem)

  pure def battleStateMagicWeaponItemBonus(state: BattleState, target: Actor, weaponItem: MagicWeaponItem): int = {
    val fighterBonus = activeEffectsMagicWeaponEnhancementBonus(state.fighter.activeEffects, target, weaponItem)
    val goblinBonus = activeEffectsMagicWeaponEnhancementBonus(state.goblin.activeEffects, target, weaponItem)
    if (fighterBonus > goblinBonus) fighterBonus else goblinBonus
  }

  pure def magicWeaponAttackBonus(state: BattleState, target: Actor, weaponItem: MagicWeaponItem): int =
    battleStateMagicWeaponItemBonus(state, target, weaponItem)

  pure def magicWeaponDamageTotal(baseDamage: int, state: BattleState, target: Actor, weaponItem: MagicWeaponItem): int =
    baseDamage + battleStateMagicWeaponItemBonus(state, target, weaponItem)

  pure def resolveMagicWeapon(
    state: BattleState,
    target: Actor,
    weaponItem: MagicWeaponItem,
    targetIsNonmagicalWeapon: bool,
    slotLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      targetIsNonmagicalWeapon and
      slotLevel >= 2 and
      not(battleStateMagicWeaponItemHasOtherSource(state, target, weaponItem, Fighter))
    ) {
      val withoutPrior = battleStateWithoutMagicWeaponFromSource(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          activeEffects: withoutPrior.fighter.activeEffects.union(Set(MagicWeaponEnhancement({
            source: Fighter,
            target: target,
            weaponItem: weaponItem,
            bonus: magicWeaponEnhancementBonus(slotLevel),
            durationTicks: magicWeaponDurationTicks,
          }))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    } else
      state

  pure def divineSmiteDamageDice(slotLevel: int, targetCreatureType: RuntimeCreatureType): int =
    battleRuntimeDivineSmiteDamageDice(
      slotLevel,
      targetCreatureType == FiendCreature or targetCreatureType == UndeadCreature,
    )

  pure def activeEffectsWithoutEnsnaringStrike(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | EnsnaringStrikeRestrained(_) => false
      | _ => true
    })

  pure def activeEffectsContainEnsnaringStrike(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | EnsnaringStrikeRestrained(_) => true
      | _ => false
    })

  pure def ensnaringStrikeDamageDiceForSlot(slotLevel: int): int =
    battleRuntimeEnsnaringStrikeDamageDice(slotLevel)

  pure def ensnaringStrikeTargetHasSaveAdvantage(targetSize: CreatureSize): bool =
    battleRuntimeEnsnaringStrikeTargetHasSaveAdvantage(
      targetSize == Large or targetSize == Huge or targetSize == Gargantuan
    )

  pure def ensnaringStrikeDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | EnsnaringStrikeRestrained(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)

  pure def searingSmiteDamageDiceForSlot(slotLevel: int): int =
    battleRuntimeSearingSmiteDamageDice(slotLevel)

  pure def searingSmiteDurationTicks: int =
    battleRuntimeSearingSmiteDurationTicks

  pure def shiningSmiteDamageDiceForSlot(slotLevel: int): int =
    battleRuntimeShiningSmiteDamageDice(slotLevel)

  pure def shiningSmiteDurationTicks: int =
    battleRuntimeShiningSmiteDurationTicks

  pure def activeEffectsWithoutSearingSmite(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SearingSmiteBurning(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutShiningSmite(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ShiningSmiteIllumination(_) => false
      | _ => true
    })

  pure def activeEffectsContainSearingSmite(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | SearingSmiteBurning(_) => true
      | _ => false
    })

  pure def activeEffectsContainShiningSmite(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | ShiningSmiteIllumination(_) => true
      | _ => false
    })

  pure def searingSmiteDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | SearingSmiteBurning(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)

  pure def resolveDivineFavor(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutDivineFavor(state.fighter.activeEffects)
            .union(Set(DivineFavorWeaponDamageRider({ durationTicks: favorWeaponDamageRiderDurationTicks }))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    else
      state

  pure def resolveDivineSmiteAfterMeleeHit(
    state: BattleState,
    slotLevel: int,
    smiteDamageRoll: int,
    targetCreatureType: RuntimeCreatureType,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      commitActorSpellSlotUse({
        ...state,
        bonusActionAvailable: false,
        goblin: applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
      }, Fighter)
    else
      state

  pure def resolvePaladinsSmiteAfterMeleeHit(
    state: BattleState,
    paladinsSmiteUsesRemaining: int,
    smiteDamageRoll: int,
    targetCreatureType: RuntimeCreatureType,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): { state: BattleState, paladinsSmiteUsesRemaining: int } =
    if (
      currentActor(state) == Fighter and
      paladinsSmiteUsesRemaining > 0 and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...state,
          bonusActionAvailable: false,
          goblin: applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
        },
        paladinsSmiteUsesRemaining: paladinsSmiteUsesRemaining - 1,
      }
    else
      { state: state, paladinsSmiteUsesRemaining: paladinsSmiteUsesRemaining }

  pure def resolveEnsnaringStrikeAfterWeaponHit(
    state: BattleState,
    slotLevel: int,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
        commitActorSpellSlotUse({
          ...withoutPrior,
          fighter: { ...withoutPrior.fighter, concentrating: not(goblinSavingThrowSucceeded) },
          goblin: if (goblinSavingThrowSucceeded)
            withoutPrior.goblin
          else
            {
              ...withoutPrior.goblin,
              activeEffects: activeEffectsWithoutEnsnaringStrike(withoutPrior.goblin.activeEffects)
                .union(Set(EnsnaringStrikeRestrained({ damageDice: ensnaringStrikeDamageDiceForSlot(slotLevel) }))),
            },
          bonusActionAvailable: false,
        }, Fighter)
      }
    else
      state

  pure def resolveSearingSmiteAfterMeleeHit(
    state: BattleState,
    slotLevel: int,
    smiteDamageRoll: int,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      commitActorSpellSlotUse({
        ...state,
        goblin: {
          ...applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
          activeEffects: activeEffectsWithoutSearingSmite(state.goblin.activeEffects)
            .union(Set(SearingSmiteBurning({
              damageDice: searingSmiteDamageDiceForSlot(slotLevel),
              durationTicks: searingSmiteDurationTicks,
            }))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    else
      state

  pure def resolveShiningSmiteAfterMeleeHit(
    state: BattleState,
    slotLevel: int,
    smiteDamageRoll: int,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 2 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: {
          ...applyDamageFromSource(withoutPrior.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
          activeEffects: activeEffectsWithoutShiningSmite(withoutPrior.goblin.activeEffects)
            .union(Set(ShiningSmiteIllumination({
              durationTicks: shiningSmiteDurationTicks,
            }))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    }
    else
      state

  pure def escapeEnsnaringStrike(
    state: BattleState,
    checkSucceeded: bool,
    actorWithinRestrainedTargetReach: bool,
  ): BattleState =
    if (
      not(state.actionAvailable)
        or not(activeEffectsContainEnsnaringStrike(state.goblin.activeEffects))
        or (currentActor(state) != Goblin and not(actorWithinRestrainedTargetReach))
    )
      state
    else
      {
        ...state,
        fighter: if (checkSucceeded) { ...state.fighter, concentrating: false } else state.fighter,
        goblin: if (checkSucceeded) { ...state.goblin, activeEffects: activeEffectsWithoutEnsnaringStrike(state.goblin.activeEffects) } else state.goblin,
        actionAvailable: false,
      }
}
