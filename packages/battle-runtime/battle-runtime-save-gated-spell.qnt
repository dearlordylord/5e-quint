// -*- mode: Bluespec; -*-

module battleRuntimeSaveGatedSpell {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure def battleRuntimeSaveGatedDamageProfileForInvocation(
    invocation: SaveGatedDamageInvocation
  ): BattleRuntimeSaveGatedDamageProfile =
    match invocation {
      | AcidSplashSaveGate => BattleRuntimeAcidSplashSaveDamage
      | SacredFlameSaveGate => BattleRuntimeSacredFlameSaveDamage
      | InflictWoundsSaveGate => BattleRuntimeInflictWoundsSaveDamage
      | BurningHandsSaveGate => BattleRuntimeBurningHandsSaveDamage
      | FireballSaveGate => BattleRuntimeFireballSaveDamage
      | ViciousMockerySaveGate => BattleRuntimeViciousMockerySaveDamage
      | DissonantWhispersSaveGate => BattleRuntimeDissonantWhispersSaveDamage
      | HellishRebukeSaveGate => BattleRuntimeHellishRebukeSaveDamage
    }

  pure def battleRuntimeSaveGatedConditionProfileForInvocation(
    invocation: SaveGatedConditionInvocation
  ): BattleRuntimeSaveGatedConditionProfile =
    match invocation {
      | ColorSpraySaveGate => BattleRuntimeColorSpraySaveCondition
      | EntangleSaveGate => BattleRuntimeEntangleSaveCondition
      | AnimalFriendshipSaveGate => BattleRuntimeAnimalFriendshipSaveCondition
      | CharmPersonSaveGate => BattleRuntimeCharmPersonSaveCondition
    }

  pure def battleRuntimeAttackBurstSaveDamageProfileForInvocation(
    invocation: AttackBurstSaveDamageInvocation
  ): BattleRuntimeAttackBurstSaveDamageProfile =
    match invocation {
      | IceKnifeAttackBurstSaveDamage => BattleRuntimeIceKnifeAttackBurstSaveDamage
    }

  pure def saveGatedAreaObjectIgnitionOutcomes(
    invocation: SaveGatedDamageInvocation,
    object: ObjectTarget,
    source: Actor,
    disposition: ObjectIgnitionDisposition,
  ): Set[ObjectIgnitionOutcome] =
    if (invocation == FireballSaveGate and disposition == ObjectFlammableUnattended)
      Set(ObjectStartsBurning({
        object: object,
        source: source,
        sourceSpell: Fireball,
      }))
    else
      Set()

  pure def saveGatedDamageFailedSaveActiveEffects(invocation: SaveGatedDamageInvocation): Set[ActiveEffect] =
    match invocation {
      | AcidSplashSaveGate => Set()
      | SacredFlameSaveGate => Set()
      | InflictWoundsSaveGate => Set()
      | BurningHandsSaveGate => Set()
      | FireballSaveGate => Set()
      | DissonantWhispersSaveGate => Set()
      | HellishRebukeSaveGate => Set()
      | ViciousMockerySaveGate => Set(ViciousMockeryNextAttackDisadvantage)
    }

  pure def saveGatedTargeting(invocation: SaveGatedDamageInvocation): SaveGatedTargeting =
    saveGatedTargetingFromBridge(
      battleRuntimeSaveGatedDamageTargeting(
        battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
      )
    )

  pure def saveGatedTargetingFromBridge(targeting: BattleRuntimeSaveGatedTargeting): SaveGatedTargeting =
    match targeting {
      | BattleRuntimeSingleSaveTarget => SingleSaveTarget
      | BattleRuntimeAreaSaveTargets => AreaSaveTargets
      | BattleRuntimeTargetListSaveTargets(data) => TargetListSaveTargets(data)
    }

  pure def saveGatedDamageSuccess(invocation: SaveGatedDamageInvocation): SaveGatedDamageSuccess =
    match battleRuntimeSaveGatedDamageSuccess(
      battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
    ) {
      | BattleRuntimeNoDamageOnSaveSuccess => NoDamageOnSaveSuccess
      | BattleRuntimeHalfDamageOnSaveSuccess => HalfDamageOnSaveSuccess
    }

  pure def saveGatedDamageType(invocation: SaveGatedDamageInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeSaveGatedDamageType(
        battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
      )
    )

  pure def saveGatedDamageSpendsLevelOneSlot(invocation: SaveGatedDamageInvocation): bool =
    battleRuntimeSaveGatedDamageRequiresSlot(
      battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
    )

  pure def attackBurstSaveDamageSpendsLevelOneSlot(invocation: AttackBurstSaveDamageInvocation): bool =
    battleRuntimeAttackBurstSaveDamageRequiresSlot(
      battleRuntimeAttackBurstSaveDamageProfileForInvocation(invocation)
    )

  pure def attackBurstSaveDamageAttackType(invocation: AttackBurstSaveDamageInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeAttackBurstSaveDamageAttackType(
        battleRuntimeAttackBurstSaveDamageProfileForInvocation(invocation)
      )
    )

  pure def attackBurstSaveDamageBurstType(invocation: AttackBurstSaveDamageInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeAttackBurstSaveDamageBurstType(
        battleRuntimeAttackBurstSaveDamageProfileForInvocation(invocation)
      )
    )

  pure def attackBurstSaveDamageReplayHoles(
    invocation: AttackBurstSaveDamageInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    attackRollFilled: bool,
    attackHitsTarget: bool,
    attackDamageFilled: bool,
    savingThrowOutcomesFilled: bool,
    anyBurstTargetFailsSavingThrow: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (not(targetFilled))
      Set(TargetChoice)
    else if (not(attackRollFilled))
      Set(AttackRoll)
    else if (attackHitsTarget and not(attackDamageFilled))
      Set(DamageRoll)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else if (anyBurstTargetFailsSavingThrow)
      Set(SpellDamageRoll)
    else
      Set()

  pure def saveGatedConditionTargeting(invocation: SaveGatedConditionInvocation): SaveGatedTargeting =
    saveGatedTargetingFromBridge(
      battleRuntimeSaveGatedConditionTargeting(
        battleRuntimeSaveGatedConditionProfileForInvocation(invocation)
      )
    )

  pure def saveGatedConditionSavingThrowAbility(invocation: SaveGatedConditionInvocation): Ability =
    match battleRuntimeSaveGatedConditionSavingThrowAbility(
      battleRuntimeSaveGatedConditionProfileForInvocation(invocation)
    ) {
      | BattleRuntimeStrengthSavingThrow => StrAbility
      | BattleRuntimeDexteritySavingThrow => DexAbility
      | BattleRuntimeConstitutionSavingThrow => ConAbility
      | BattleRuntimeWisdomSavingThrow => WisAbility
    }

  pure def saveGatedTargetMaxTargets(targeting: SaveGatedTargeting, slotLevel: int): int =
    battleRuntimeSaveGatedTargetMaxTargets(saveGatedTargetingToBridge(targeting), slotLevel)

  pure def saveGatedTargetingToBridge(targeting: SaveGatedTargeting): BattleRuntimeSaveGatedTargeting =
    match targeting {
      | SingleSaveTarget => BattleRuntimeSingleSaveTarget
      | AreaSaveTargets => BattleRuntimeAreaSaveTargets
      | TargetListSaveTargets(data) => BattleRuntimeTargetListSaveTargets(data)
    }

  pure def saveGatedConditionFailedSaveActiveEffects(
    invocation: SaveGatedConditionInvocation,
    state: BattleState,
    source: Actor,
  ): Set[ActiveEffect] =
    match invocation {
      | ColorSpraySaveGate => Set(ColorSprayBlinded({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))
      | EntangleSaveGate => Set(EntangleRestrained)
      | AnimalFriendshipSaveGate => Set(AnimalFriendshipCharmed({ source: source, durationTicks: 24 * 60 }))
      | CharmPersonSaveGate => Set(CharmPersonCharmed({ source: source, durationTicks: charmPersonCharmedDurationTicks }))
    }

  pure def activeEffectsWithoutColorSprayFrom(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ColorSprayBlinded(data) => data.source != source
      | _ => true
    })

  pure def charmPersonCharmedDurationTicks: int = 60 * 10

  pure def saveGatedConditionTargetCreatureTypeIsLegal(
    invocation: SaveGatedConditionInvocation,
    targetCreatureType: RuntimeCreatureType,
  ): bool =
    battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(
      battleRuntimeSaveGatedConditionProfileForInvocation(invocation),
      targetCreatureType == BeastCreature,
      targetCreatureType == HumanoidCreature,
    )

  pure def saveGatedConditionSavingThrowHasAdvantage(
    invocation: SaveGatedConditionInvocation,
    targetIsHostile: bool,
  ): bool =
    battleRuntimeSaveGatedConditionSavingThrowHasAdvantage(
      battleRuntimeSaveGatedConditionProfileForInvocation(invocation),
      targetIsHostile,
    )

  pure def saveGatedConditionReplayHoles(
    invocation: SaveGatedConditionInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    savingThrowOutcomesFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (saveGatedConditionTargeting(invocation) == SingleSaveTarget and not(targetFilled))
      Set(TargetChoice)
    else if (match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false } and not(targetFilled))
      Set(SpellTargetList)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else
      Set()

  pure def saveGatedAttackRollAdvantageTargeting(invocation: SaveGatedAttackRollAdvantageInvocation): SaveGatedTargeting =
    match invocation {
      | FaerieFireSaveGate => saveGatedTargetingFromBridge(
          battleRuntimeSaveGatedConditionTargeting(BattleRuntimeFaerieFireSaveAttackRollAdvantage)
        )
    }

  pure def saveGatedAttackRollAdvantageFailedSaveActiveEffects(invocation: SaveGatedAttackRollAdvantageInvocation): Set[ActiveEffect] =
    match invocation {
      | FaerieFireSaveGate => Set(FaerieFireOutline)
    }

  pure def saveGatedAttackRollAdvantageReplayHoles(
    invocation: SaveGatedAttackRollAdvantageInvocation,
    canCastSpells: bool,
    savingThrowOutcomesFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else
      Set()

  pure def saveGatedDamageReplayHoles(
    invocation: SaveGatedDamageInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    savingThrowOutcomesFilled: bool,
    anyTargetTakesDamage: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (saveGatedTargeting(invocation) == SingleSaveTarget and not(targetFilled))
      Set(TargetChoice)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else if (anyTargetTakesDamage)
      Set(DamageRoll)
    else
      Set()

  pure def acidSplashReplayHoles(
    canCastSpells: bool,
    savingThrowOutcomesFilled: bool,
    anyFailedSavingThrow: bool,
  ): Set[Hole] =
    saveGatedDamageReplayHoles(AcidSplashSaveGate, canCastSpells, true, savingThrowOutcomesFilled, anyFailedSavingThrow)

  pure def saveGatedDamageAmount(
    invocation: SaveGatedDamageInvocation,
    damageRoll: int,
    savingThrowSucceeded: bool,
  ): int =
    if (not(savingThrowSucceeded))
      damageRoll
    else if (saveGatedDamageSuccess(invocation) == HalfDamageOnSaveSuccess)
      damageRoll / 2
    else
      0
}
