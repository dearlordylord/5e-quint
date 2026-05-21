// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveGatedSpell {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

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
      | MindSpikeSaveGate => BattleRuntimeMindSpikeSaveDamage
    }

  pure def battleRuntimeSaveGatedConditionProfileForInvocation(
    invocation: SaveGatedConditionInvocation
  ): BattleRuntimeSaveGatedConditionProfile =
    match invocation {
      | ColorSpraySaveGate => BattleRuntimeColorSpraySaveCondition
      | EntangleSaveGate => BattleRuntimeEntangleSaveCondition
      | AnimalFriendshipSaveGate => BattleRuntimeAnimalFriendshipSaveCondition
      | CharmPersonSaveGate => BattleRuntimeCharmPersonSaveCondition
      | BlindnessDeafnessSaveGate => BattleRuntimeBlindnessDeafnessSaveCondition
      | HoldPersonSaveGate => BattleRuntimeHoldPersonSaveCondition
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
      | MindSpikeSaveGate => Set()
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

  pure def saveGatedDamageRequiresConcentration(invocation: SaveGatedDamageInvocation): bool =
    battleRuntimeSaveGatedDamageRequiresConcentration(
      battleRuntimeSaveGatedDamageProfileForInvocation(invocation)
    )

  pure def mindSpikeDurationTicks: int = 60 * 10

  pure def saveGatedDamageConcentrationDurationEffects(
    invocation: SaveGatedDamageInvocation,
  ): Set[ActiveEffect] =
    match invocation {
      | AcidSplashSaveGate => Set()
      | SacredFlameSaveGate => Set()
      | InflictWoundsSaveGate => Set()
      | BurningHandsSaveGate => Set()
      | FireballSaveGate => Set()
      | ViciousMockerySaveGate => Set()
      | DissonantWhispersSaveGate => Set()
      | HellishRebukeSaveGate => Set()
      | MindSpikeSaveGate => Set(MindSpikeConcentrationDuration({ durationTicks: mindSpikeDurationTicks }))
    }

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
      | BlindnessDeafnessSaveGate => Set()
      | HoldPersonSaveGate => Set()
    }

  pure def activeEffectsWithoutColorSprayFrom(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ColorSprayBlinded(data) => data.source != source
      | _ => true
    })

  pure def charmPersonCharmedDurationTicks: int = 60 * 10
  pure def blindnessDeafnessDurationTicks: int = 10
  pure def holdPersonDurationTicks: int = 10

  pure def saveGatedConditionRequiresConditionChoice(invocation: SaveGatedConditionInvocation): bool =
    invocation == BlindnessDeafnessSaveGate

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
    conditionChoiceFilled: bool,
    savingThrowOutcomesFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (saveGatedConditionTargeting(invocation) == SingleSaveTarget and not(targetFilled))
      Set(TargetChoice)
    else if (match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false } and not(targetFilled))
      Set(SpellTargetList)
    else if (saveGatedConditionRequiresConditionChoice(invocation) and not(conditionChoiceFilled))
      Set(ConditionChoice)
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

  pure def saveGatedConditionImmunityReplayHoles(
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

  pure def applyResistanceSpellReductionToFighter(state: BattleState, damageType: DamageType, damage: int, reductionRoll: int): BattleState = {
    val reducedDamage = damageAfterResistanceSpellReduction(damage, damageType, state.fighter.activeEffects, reductionRoll)
    val updatedEffects = activeEffectsAfterResistanceSpellReduction(state.fighter.activeEffects, damageType)
    {
      ...state,
      fighter: applyDamage({ ...state.fighter, activeEffects: updatedEffects }, reducedDamage, 1, true),
    }
  }

  pure def saveGatedDamageTarget(
    invocation: SaveGatedDamageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageSource: Actor,
  ): Combatant =
    if (saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded) == 0)
      target
    else
      applyDamageFromSource(
        target,
        damageAfterAdjustments(
          saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded),
          saveGatedDamageType(invocation),
          Set(),
          Set(),
          Set()
        ),
        1,
        concentrationSaveSucceeded,
        OrdinaryDamage,
        damageSource,
      )

  pure def acidSplashDamageTarget(
    target: Combatant,
    failedSavingThrow: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant =
    saveGatedDamageTarget(AcidSplashSaveGate, target, not(failedSavingThrow), damageRoll, concentrationSaveSucceeded, Fighter)

  pure def dexHalfSaveDamageAfterReplacement(
    damageRoll: int,
    saveSucceeded: bool,
    replacementApplies: bool,
  ): int =
    if (replacementApplies and saveSucceeded) 0
    else if (replacementApplies or saveSucceeded) damageRoll / 2
    else damageRoll

  pure def resolveAcidSplash(
    state: BattleState,
    fighterFailedSavingThrow: bool,
    goblinFailedSavingThrow: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else
      {
        ...state,
        fighter: acidSplashDamageTarget(state.fighter, fighterFailedSavingThrow, damageRoll, fighterConcentrationSaveSucceeded),
        goblin: acidSplashDamageTarget(state.goblin, goblinFailedSavingThrow, damageRoll, goblinConcentrationSaveSucceeded),
        actionAvailable: false,
      }

  pure def resolveBurningHands(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: saveGatedDamageTarget(BurningHandsSaveGate, state.fighter, fighterSavingThrowSucceeded, damageRoll, fighterConcentrationSaveSucceeded, Fighter),
        goblin: saveGatedDamageTarget(BurningHandsSaveGate, state.goblin, goblinSavingThrowSucceeded, damageRoll, goblinConcentrationSaveSucceeded, Fighter),
        actionAvailable: false,
      }, Fighter)

  pure def resolveBurningHandsEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        actionAvailable: false,
      }, Fighter)

  pure def resolveFireball(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: saveGatedDamageTarget(FireballSaveGate, state.fighter, fighterSavingThrowSucceeded, damageRoll, fighterConcentrationSaveSucceeded, Fighter),
        goblin: saveGatedDamageTarget(FireballSaveGate, state.goblin, goblinSavingThrowSucceeded, damageRoll, goblinConcentrationSaveSucceeded, Fighter),
        actionAvailable: false,
      }, Fighter)

  pure def resolveFireballEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        actionAvailable: false,
      }, Fighter)

  pure def saveGatedConditionTarget(
    invocation: SaveGatedConditionInvocation,
    state: BattleState,
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    targetActor: Actor,
    sourceCreatureType: RuntimeCreatureType,
  ): Combatant =
    if (
      savingThrowSucceeded or
      saveGatedConditionRequiresConditionChoice(invocation) or
      saveGatedConditionPreventedByCreatureTypeProtection(invocation, sourceCreatureType, target.activeEffects)
    )
      target
    else
      {
      val baseEffects = if (invocation == ColorSpraySaveGate)
          activeEffectsWithoutColorSprayFrom(target.activeEffects, source)
        else
          target.activeEffects
        if (invocation == HoldPersonSaveGate)
          holdPersonTarget({ ...target, activeEffects: baseEffects }, false, source, targetActor)
        else
          { ...target, activeEffects: baseEffects.union(saveGatedConditionFailedSaveActiveEffects(invocation, state, source)) }
      }

  pure def selectedTargetCount(fighterTargeted: bool, goblinTargeted: bool): int =
    (if (fighterTargeted) 1 else 0) + (if (goblinTargeted) 1 else 0)

  pure def saveGatedConditionSlotLevelIsLegal(invocation: SaveGatedConditionInvocation, slotLevel: int): bool =
    match saveGatedConditionTargeting(invocation) {
      | TargetListSaveTargets(data) => slotLevel >= data.baseSlotLevel
      | _ => true
    }

  pure def saveGatedConditionTargetCountIsLegal(
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    goblinTargeted: bool,
  ): bool = {
    val count = selectedTargetCount(fighterTargeted, goblinTargeted)
    val targeting = saveGatedConditionTargeting(invocation)
    val minTargets = match targeting {
      | TargetListSaveTargets(data) => data.minTargets
      | _ => 1
    }
    saveGatedConditionSlotLevelIsLegal(invocation, slotLevel) and
      count >= 1 and
      count >= minTargets and
      count <= saveGatedTargetMaxTargets(targeting, slotLevel)
  }

  pure def resolveTargetListSaveGatedCondition(
    state: BattleState,
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (invocation == HoldPersonSaveGate)
      resolveHoldPerson(
        state,
        slotLevel,
        fighterTargeted,
        fighterCreatureType,
        fighterSavingThrowSucceeded,
        goblinTargeted,
        goblinCreatureType,
        goblinSavingThrowSucceeded,
      )
    else if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false }) or
      saveGatedConditionRequiresConditionChoice(invocation) or
      not(saveGatedConditionTargetCountIsLegal(invocation, slotLevel, fighterTargeted, goblinTargeted)) or
      (fighterTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, fighterCreatureType))) or
      (goblinTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, goblinCreatureType)))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (fighterTargeted) saveGatedConditionTarget(invocation, state, state.fighter, fighterSavingThrowSucceeded, Fighter, Fighter, HumanoidCreature) else state.fighter,
        goblin: if (goblinTargeted) saveGatedConditionTarget(invocation, state, state.goblin, goblinSavingThrowSucceeded, Fighter, Goblin, HumanoidCreature) else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def holdPersonTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    targetActor: Actor,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else {
      val withoutPrior = combatantWithoutHoldPersonFrom(target, source)
      val held = {
        ...withoutPrior,
        incapacitated: true,
        activeEffects: withoutPrior.activeEffects.union(Set(HoldPersonParalyzed({
          source: source,
          hadIncapacitated: withoutPrior.incapacitated,
          durationTicks: holdPersonDurationTicks,
        }))),
      }
      breakConcentrationFromHoldPersonAppliedIncapacitated(held, targetActor)
    }

  pure def resolveHoldPerson(
    state: BattleState,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(saveGatedConditionTargetCountIsLegal(HoldPersonSaveGate, slotLevel, fighterTargeted, goblinTargeted)) or
      (fighterTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, fighterCreatureType))) or
      (goblinTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, goblinCreatureType)))
    )
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val withTargets = {
        ...withoutPrior,
        fighter: if (fighterTargeted) holdPersonTarget(withoutPrior.fighter, fighterSavingThrowSucceeded, Fighter, Fighter) else withoutPrior.fighter,
        goblin: if (goblinTargeted) holdPersonTarget(withoutPrior.goblin, goblinSavingThrowSucceeded, Fighter, Goblin) else withoutPrior.goblin,
        actionAvailable: false,
      }
      val holdPersonHasEffect = holdPersonStillActiveFrom(withTargets, Fighter)
      val withConcentration = if (holdPersonHasEffect and not(withTargets.fighter.incapacitated))
        { ...withTargets, fighter: { ...withTargets.fighter, concentrating: true } }
      else
        breakConcentrationSpellEffects(withTargets, Fighter)
      commitActorSpellSlotUse(withConcentration, Fighter)
    }

  pure def endTurnWithHoldPersonRepeatSave(
    state: BattleState,
    source: Actor,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (currentActor(state) == Fighter) {
      val fighter = if (savingThrowSucceeded and activeEffectsContainHoldPersonFrom(state.fighter.activeEffects, source))
        combatantWithoutHoldPersonFrom(state.fighter, source)
      else
        state.fighter
      endTurn(stateWithHoldPersonConcentrationClearedIfNoEffects({ ...state, fighter: fighter }, source))
    } else {
      val goblin = if (savingThrowSucceeded and activeEffectsContainHoldPersonFrom(state.goblin.activeEffects, source))
        combatantWithoutHoldPersonFrom(state.goblin, source)
      else
        state.goblin
      endTurn(stateWithHoldPersonConcentrationClearedIfNoEffects({ ...state, goblin: goblin }, source))
    }

  pure def blindnessDeafnessActiveEffect(choice: BlindnessDeafnessConditionChoice, source: Actor): ActiveEffect =
    match choice {
      | BlindnessDeafnessBlindedChoice => BlindnessDeafnessBlinded({
          source: source,
          durationTicks: blindnessDeafnessDurationTicks,
        })
      | BlindnessDeafnessDeafenedChoice => BlindnessDeafnessDeafened({
          source: source,
          durationTicks: blindnessDeafnessDurationTicks,
        })
    }

  pure def activeEffectsWithoutBlindnessDeafnessChoiceFrom(
    effects: Set[ActiveEffect],
    choice: BlindnessDeafnessConditionChoice,
    source: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match choice {
      | BlindnessDeafnessBlindedChoice => match effect {
          | BlindnessDeafnessBlinded(data) => data.source != source
          | _ => true
        }
      | BlindnessDeafnessDeafenedChoice => match effect {
          | BlindnessDeafnessDeafened(data) => data.source != source
          | _ => true
        }
    })

  pure def blindnessDeafnessRepeatSaveDue(
    effects: Set[ActiveEffect],
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
  ): bool =
    effects.exists(effect => match choice {
      | BlindnessDeafnessBlindedChoice => match effect {
          | BlindnessDeafnessBlinded(data) => data.source == source
          | _ => false
        }
      | BlindnessDeafnessDeafenedChoice => match effect {
          | BlindnessDeafnessDeafened(data) => data.source == source
          | _ => false
        }
    })

  pure def combatantWithoutBlindnessDeafnessChoiceFrom(
    target: Combatant,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
  ): Combatant =
    { ...target, activeEffects: activeEffectsWithoutBlindnessDeafnessChoiceFrom(target.activeEffects, choice, source) }

  pure def blindnessDeafnessTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      {
        ...target,
        activeEffects: activeEffectsWithoutBlindnessDeafnessChoiceFrom(target.activeEffects, choice, source)
          .union(Set(blindnessDeafnessActiveEffect(choice, source))),
      }

  pure def resolveBlindnessDeafness(
    state: BattleState,
    slotLevel: int,
    choice: BlindnessDeafnessConditionChoice,
    fighterTargeted: bool,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(saveGatedConditionTargetCountIsLegal(BlindnessDeafnessSaveGate, slotLevel, fighterTargeted, goblinTargeted))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (fighterTargeted) blindnessDeafnessTarget(state.fighter, fighterSavingThrowSucceeded, Fighter, choice) else state.fighter,
        goblin: if (goblinTargeted) blindnessDeafnessTarget(state.goblin, goblinSavingThrowSucceeded, Fighter, choice) else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def endTurnWithBlindnessDeafnessRepeatSave(
    state: BattleState,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (currentActor(state) == Fighter) {
      val fighter = if (savingThrowSucceeded and blindnessDeafnessRepeatSaveDue(state.fighter.activeEffects, source, choice))
        combatantWithoutBlindnessDeafnessChoiceFrom(state.fighter, source, choice)
      else
        state.fighter
      endTurn({ ...state, fighter: fighter })
    } else {
      val goblin = if (savingThrowSucceeded and blindnessDeafnessRepeatSaveDue(state.goblin.activeEffects, source, choice))
        combatantWithoutBlindnessDeafnessChoiceFrom(state.goblin, source, choice)
      else
        state.goblin
      endTurn({ ...state, goblin: goblin })
    }

  pure def resolveColorSpray(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: saveGatedConditionTarget(ColorSpraySaveGate, state, state.fighter, fighterSavingThrowSucceeded, Fighter, Fighter, HumanoidCreature),
        goblin: saveGatedConditionTarget(ColorSpraySaveGate, state, state.goblin, goblinSavingThrowSucceeded, Fighter, Goblin, HumanoidCreature),
        actionAvailable: false,
      }, Fighter)

  pure def resolveColorSprayEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        actionAvailable: false,
      }, Fighter)

  pure def saveGatedAttackRollAdvantageTarget(
    invocation: SaveGatedAttackRollAdvantageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, activeEffects: target.activeEffects.union(saveGatedAttackRollAdvantageFailedSaveActiveEffects(invocation)) }

  pure def resolveFaerieFireWithObjects(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    objectTargets: Set[ObjectTarget],
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.fighter, fighterSavingThrowSucceeded), concentrating: true },
        goblin: saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.goblin, goblinSavingThrowSucceeded),
        objectOutlines: withoutPrior.objectOutlines.union(
          objectTargets.map(objectTarget => FaerieFireObjectOutline({ source: Fighter, object: objectTarget }))
        ),
        actionAvailable: false,
      }, Fighter)
    }

  pure def resolveFaerieFire(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveFaerieFireWithObjects(state, fighterSavingThrowSucceeded, goblinSavingThrowSucceeded, Set())

  pure def calmEmotionsConditionImmunityEffects(): Set[ActiveEffect] =
    Set(CalmEmotionsCharmedImmunity, CalmEmotionsFrightenedImmunity)

  pure def calmEmotionsTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      {
        ...target,
        activeEffects: target.activeEffects
          .exclude(calmEmotionsConditionImmunityEffects)
          .union(calmEmotionsConditionImmunityEffects),
      }

  pure def calmEmotionsIncludedTargetsAreLegal(
    fighterIncluded: bool,
    fighterCreatureType: RuntimeCreatureType,
    goblinIncluded: bool,
    goblinCreatureType: RuntimeCreatureType,
  ): bool =
    (not(fighterIncluded) or fighterCreatureType == HumanoidCreature) and
      (not(goblinIncluded) or goblinCreatureType == HumanoidCreature)

  pure def resolveCalmEmotions(
    state: BattleState,
    fighterIncluded: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinIncluded: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(calmEmotionsIncludedTargetsAreLegal(fighterIncluded, fighterCreatureType, goblinIncluded, goblinCreatureType))
    )
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val fighterTarget = if (fighterIncluded)
        calmEmotionsTarget(withoutPrior.fighter, fighterSavingThrowSucceeded)
      else
        withoutPrior.fighter
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...fighterTarget, concentrating: true },
        goblin: if (goblinIncluded) calmEmotionsTarget(withoutPrior.goblin, goblinSavingThrowSucceeded) else withoutPrior.goblin,
        actionAvailable: false,
      }, Fighter)
    }

  pure def resolveEntangle(
    state: BattleState,
    fighterIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (fighterIncludedInArea or not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: saveGatedConditionTarget(EntangleSaveGate, withoutPrior, withoutPrior.goblin, goblinSavingThrowSucceeded, Fighter, Goblin, HumanoidCreature),
        actionAvailable: false,
      }, Fighter)
    }

  pure def escapeEntangle(state: BattleState, checkSucceeded: bool): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or not(state.goblin.activeEffects.contains(EntangleRestrained)))
      state
    else
      {
        ...state,
        goblin: if (checkSucceeded) { ...state.goblin, activeEffects: state.goblin.activeEffects.exclude(Set(EntangleRestrained)) } else state.goblin,
        actionAvailable: false,
      }

  pure def saveGatedDamageStateAfterCastConcentrationBreak(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
  ): BattleState =
    if (saveGatedDamageRequiresConcentration(invocation))
      breakConcentrationSpellEffects(state, Fighter)
    else
      state

  pure def saveGatedDamageStateAfterFailedSaveConcentrationStart(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (saveGatedDamageRequiresConcentration(invocation) and not(savingThrowSucceeded))
      {
        ...state,
        fighter: {
          ...state.fighter,
          concentrating: true,
          activeEffects: state.fighter.activeEffects.union(
            saveGatedDamageConcentrationDurationEffects(invocation)
          ),
        },
      }
    else
      state

  pure def resolveSingleTargetSaveGatedDamage(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      saveGatedTargeting(invocation) != SingleSaveTarget or
      (saveGatedDamageSpendsLevelOneSlot(invocation) and not(canExpendSpellSlotThisTurn(state)))
    )
      state
    else {
      val afterConcentrationBreak = saveGatedDamageStateAfterCastConcentrationBreak(state, invocation)
      val damaged = saveGatedDamageTarget(invocation, afterConcentrationBreak.goblin, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded, Fighter)
      val resolved = {
        ...afterConcentrationBreak,
        goblin: damaged,
        actionAvailable: false,
      }
      val afterConcentrationStart = saveGatedDamageStateAfterFailedSaveConcentrationStart(resolved, invocation, savingThrowSucceeded)
      if (saveGatedDamageSpendsLevelOneSlot(invocation))
        commitActorSpellSlotUse(afterConcentrationStart, Fighter)
      else
        afterConcentrationStart
    }

  pure def resolveSelfTargetSaveGatedDamage(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      saveGatedTargeting(invocation) != SingleSaveTarget or
      (saveGatedDamageSpendsLevelOneSlot(invocation) and not(canExpendSpellSlotThisTurn(state)))
    )
      state
    else {
      val afterConcentrationBreak = saveGatedDamageStateAfterCastConcentrationBreak(state, invocation)
      val damaged = saveGatedDamageTarget(invocation, afterConcentrationBreak.fighter, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded, Fighter)
      val resolved = {
        ...afterConcentrationBreak,
        fighter: damaged,
        actionAvailable: false,
      }
      val afterConcentrationStart = saveGatedDamageStateAfterFailedSaveConcentrationStart(resolved, invocation, savingThrowSucceeded)
      if (saveGatedDamageSpendsLevelOneSlot(invocation))
        commitActorSpellSlotUse(afterConcentrationStart, Fighter)
      else
        afterConcentrationStart
    }

  pure def saveGatedSelfTargetDamageRequiresConcentrationSaveAfterCastBreak(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
    savingThrowSucceeded: bool,
    damageRoll: int,
  ): bool = {
    val afterConcentrationBreak = saveGatedDamageStateAfterCastConcentrationBreak(state, invocation)
    val adjustedDamage =
      damageAfterAdjustments(
        saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded),
        saveGatedDamageType(invocation),
        Set(),
        Set(),
        Set()
      )
    afterConcentrationBreak.fighter.concentrating and adjustedDamage > 0
  }

  pure def resolveSacredFlame(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSingleTargetSaveGatedDamage(state, SacredFlameSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def resolveInflictWounds(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSingleTargetSaveGatedDamage(state, InflictWoundsSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def resolveMindSpike(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSingleTargetSaveGatedDamage(state, MindSpikeSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def resolveSelfMindSpike(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSelfTargetSaveGatedDamage(state, MindSpikeSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def adjustedAttackBurstSaveDamage(
    damage: int,
    damageType: DamageType,
  ): int =
    damageAfterAdjustments(damage, damageType, Set(), Set(), Set())

  pure def applyIceKnifeDamageWithSingleConcentrationCheck(
    target: Combatant,
    attackDamage: int,
    burstDamage: int,
    concentrationSaveSucceeded: bool,
  ): Combatant = {
    val totalDamage = attackDamage + burstDamage
    val afterAttack = applyDamageFromSource(target, attackDamage, 1, true, OrdinaryDamage, Fighter)
    val afterBurst = applyDamageFromSource(afterAttack, burstDamage, 1, true, OrdinaryDamage, Fighter)
    if (target.concentrating and totalDamage > 0 and not(concentrationSaveSucceeded))
      breakConcentration(afterBurst)
    else
      afterBurst
  }

  pure def iceKnifeBurstTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
    burstDamageRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant = {
    val burstDamage = adjustedAttackBurstSaveDamage(
      battleRuntimeAttackBurstSaveDamageBurstAmount(burstDamageRoll, savingThrowSucceeded),
      attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage),
    )
    applyIceKnifeDamageWithSingleConcentrationCheck(target, 0, burstDamage, concentrationSaveSucceeded)
  }

  pure def resolveIceKnife(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    attackDamageRoll: int,
    goblinSavingThrowSucceeded: bool,
    fighterIncludedInBurst: bool,
    fighterSavingThrowSucceeded: bool,
    burstDamageRoll: int,
    goblinConcentrationSaveSucceeded: bool,
    fighterConcentrationSaveSucceeded: bool,
  ): BattleState =
    resolveIceKnifeWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      attackDamageRoll,
      goblinSavingThrowSucceeded,
      fighterIncludedInBurst,
      fighterSavingThrowSucceeded,
      burstDamageRoll,
      goblinConcentrationSaveSucceeded,
      fighterConcentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveIceKnifeWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    attackDamageRoll: int,
    goblinSavingThrowSucceeded: bool,
    fighterIncludedInBurst: bool,
    fighterSavingThrowSucceeded: bool,
    burstDamageRoll: int,
    goblinConcentrationSaveSucceeded: bool,
    fighterConcentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val hit = attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20)
      val mirrorImageRedirects = hit and mirrorImageRedirectsAttackRollHit(
        rolled.fighter.activeEffects,
        rolled.goblin.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
      if (hit and not(mirrorImageRedirects) and state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
        openReactionWindow(rolled, {
          trigger: AttackHit,
          procedure: ShieldReactionProcedure,
          eligibleReactors: Set(Goblin),
          offeredReactors: Set(),
          continuation: ResumeIceKnife,
        })
      } else {
        val attackResolvedGoblin =
          if (mirrorImageRedirects)
            combatantAfterMirrorImageAttackRollHit(
              rolled.fighter.activeEffects,
              rolled.goblin,
              attackerPerceivesTargetWithBlindsightOrTruesight,
              mirrorImageDuplicateHighestRoll,
            )
          else
            rolled.goblin
        val attackDamage =
          if (hit and not(mirrorImageRedirects))
            adjustedAttackBurstSaveDamage(
              attackDamageRoll * (if (attackIsCritical(naturalD20, 20)) 2 else 1),
              attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamage),
            )
          else
            0
        val burstDamage =
          if (goblinSavingThrowSucceeded)
            0
          else
            adjustedAttackBurstSaveDamage(burstDamageRoll, attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage))
        val damagedGoblin = applyIceKnifeDamageWithSingleConcentrationCheck(
          attackResolvedGoblin,
          attackDamage,
          burstDamage,
          goblinConcentrationSaveSucceeded,
        )
        val damagedFighter =
          if (fighterIncludedInBurst)
            iceKnifeBurstTarget(rolled.fighter, fighterSavingThrowSucceeded, burstDamageRoll, fighterConcentrationSaveSucceeded)
          else
            rolled.fighter
        commitActorSpellSlotUse({
          ...rolled,
          fighter: damagedFighter,
          goblin: damagedGoblin,
          actionAvailable: false,
        }, Fighter)
      }
    }

}
