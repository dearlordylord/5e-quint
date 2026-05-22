// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS

module battleRuntimeWeaponAttacks {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  pure def spendFighterAttackActionOrExtraAttackSlot(state: BattleState): BattleState =
    if (state.fighterExtraAttackSlotsRemaining > 0)
      {
        ...state,
        fighterExtraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterExtraAttack(state.fighterExtraAttackSlotsRemaining),
      }
    else {
      val spent = stateWithFighterMovementStep(
        state,
        battleRuntimeSpendAttackAction(movementProjectionForFighter(state, WalkSpeedKind)),
      )
      if (spent != state)
      {
        ...spent,
        fighterExtraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterAttackAction(
          state.actionAvailable,
          state.fighterExtraAttackSupported,
        ),
      }
      else
        state
    }

  pure def resolveAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttackAtBarbarianLevel(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1)

  pure def resolveAttackWithToppleChoice(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    forceToppleSave: bool,
    toppleSaveSucceeded: bool,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithToppleChoice(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1, OrdinaryDamage, forceToppleSave, toppleSaveSucceeded)

  pure def resolveAttackWithCleaveChoice(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    useCleave: bool,
    cleaveSecondTargetEligible: bool,
    cleaveAttackTotal: int,
    cleaveNaturalD20: int,
    cleaveDamageRoll: int,
    attackAbilityModifier: int,
  ): BattleState = {
    val primary = resolveAttack(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded)
    val cleaveAvailable =
      state.fighterGreataxeCleaveMastery and
      not(state.fighterCleaveExtraAttackUsedThisTurn) and
      attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))
    if (
      cleaveAvailable and
      useCleave and
      cleaveSecondTargetEligible and
      attackHits(cleaveAttackTotal, cleaveNaturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))
    )
      { ...primary, goblin: applyDamageFromSource(primary.goblin, cleaveSecondHitDamage(cleaveDamageRoll, attackAbilityModifier), if (attackIsCritical(cleaveNaturalD20, fighterCriticalThreshold(state))) 2 else 1, true, OrdinaryDamage, Fighter), fighterCleaveExtraAttackUsedThisTurn: true }
    else if (cleaveAvailable and useCleave and cleaveSecondTargetEligible)
      { ...primary, fighterCleaveExtraAttackUsedThisTurn: true }
    else
      primary
  }

  pure def resolveAttackKnockOut(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttackWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, KnockOut)

  pure def resolveAttackWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1, damageDisposition)

  pure def resolveAttackAtBarbarianLevel(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, barbarianLevel, OrdinaryDamage)

  pure def resolveAttackAtBarbarianLevelWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
    damageDisposition: DamageDisposition,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithToppleChoice(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, barbarianLevel, damageDisposition, false, true)

  pure def resolveAttackAtBarbarianLevelWithToppleChoice(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
    damageDisposition: DamageDisposition,
    forceToppleSave: bool,
    toppleSaveSucceeded: bool,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithToppleChoiceAndMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      barbarianLevel,
      damageDisposition,
      forceToppleSave,
      toppleSaveSucceeded,
      0,
      false,
    )

  pure def resolveAttackAtBarbarianLevelWithToppleChoiceAndMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
    damageDisposition: DamageDisposition,
    forceToppleSave: bool,
    toppleSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      val rageDamage = if (fighterHasRage(revealed)) fighterRageDamageBonus(barbarianLevel) else 0
      val divineFavorDamage = fighterDivineFavorDamage(damageRoll.divineFavorDamageRoll, revealed.fighter.activeEffects)
      val divineSmiteDamage = damageRoll.divineSmiteDamageRoll
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, revealed.fighter.activeEffects, Goblin)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else if (
        mirrorImageRedirectsAttackRollHit(
          spent.fighter.activeEffects,
          spent.goblin.activeEffects,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        )
      )
        {
          ...spent,
          goblin: combatantAfterMirrorImageAttackRollHit(
            spent.fighter.activeEffects,
            spent.goblin,
            attackerPerceivesTargetWithBlindsightOrTruesight,
            mirrorImageDuplicateHighestRoll,
          ),
          lightWeaponAttackMade: true,
        }
      else {
        val damaged = applyDamageFromSource(state.goblin, damageRoll.weaponDamageRoll + 3 + rageDamage + divineFavorDamage + divineSmiteDamage + huntersMarkDamage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, damageDisposition, Fighter)
        val sapEffects = if (state.fighterLongswordSapMastery) Set(WeaponMasterySapNextAttackDisadvantage({ source: Fighter })) else Set()
        val toppled = state.fighterQuarterstaffToppleMastery and forceToppleSave and not(toppleSaveSucceeded)
        { ...spent, goblin: { ...damaged, prone: damaged.prone or toppled, activeEffects: damaged.activeEffects.union(sapEffects) }, lightWeaponAttackMade: true }
      }
    }

  pure def resolveTrueStrikeWeaponAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    weaponDamageRoll: int,
    bonusDamageRoll: int,
    spellcastingAbilityModifier: int,
    characterLevel: int,
    selectedDamageType: DamageType,
    weaponDamageType: DamageType,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(trueStrikeDamageTypeChoiceIsLegal(selectedDamageType, weaponDamageType))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state)))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeTrueStrikeWeaponAttack,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val damage = trueStrikeDamageAfterAdjustments(
        weaponDamageRoll,
        bonusDamageRoll,
        spellcastingAbilityModifier,
        characterLevel,
        selectedDamageType,
      )
      { ...rolled, goblin: applyDamageFromSource(state.goblin, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter), actionAvailable: false }
    }

  pure def resolveAttackWithOptionalSneakAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    weaponDamageRoll: int,
    sneakAttackDamageRoll: int,
    selectedSneakAttack: bool,
    rollHasAdvantage: bool,
    allyAdjacent: bool,
    rollHasDisadvantage: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else {
        val sneakSelectedAndEligible =
          selectedSneakAttack and
          fighterSneakAttackEligible(revealed, rollHasAdvantage, allyAdjacent, rollHasDisadvantage)
        val damage = weaponDamageRoll + 3 + (if (sneakSelectedAndEligible) sneakAttackDamageRoll else 0)
        {
          ...spent,
          goblin: applyDamageFromSource(state.goblin, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
          lightWeaponAttackMade: true,
          fighterSneakAttackUsedThisTurn: sneakSelectedAndEligible or revealed.fighterSneakAttackUsedThisTurn,
        }
    }
    }

  pure def resolveAttackRecklessly(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttack(activateRecklessAttackOnFirstAttackRoll(state), attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded)

  pure def resolveGoblinAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveGoblinAttackWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveGoblinAttackWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      { ...state, actionAvailable: false }
    else if (
      mirrorImageRedirectsAttackRollHit(
        state.goblin.activeEffects,
        state.fighter.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      {
        ...state,
        fighter: combatantAfterMirrorImageAttackRollHit(
          state.goblin.activeEffects,
          state.fighter,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        ),
        actionAvailable: false,
      }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      {
        ...stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        actionAvailable: false,
      }
    }

  pure def resolveGoblinMultiattack(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else
      { ...state, actionAvailable: false, goblinMultiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterFirstAttack }

  pure def goblinMultiattackDispatchContinuationOpen(state: BattleState): bool =
    currentActor(state) == Goblin and state.goblinMultiattackDispatchesRemaining > 0

  pure def resolveGoblinMultiattackDispatch(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveGoblinMultiattackDispatchWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveGoblinMultiattackDispatchWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (state.goblinMultiattackDispatchesRemaining <= 0 or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      { ...state, goblinMultiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterDispatch(state.goblinMultiattackDispatchesRemaining) }
    else if (
      mirrorImageRedirectsAttackRollHit(
        state.goblin.activeEffects,
        state.fighter.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      {
        ...state,
        fighter: combatantAfterMirrorImageAttackRollHit(
          state.goblin.activeEffects,
          state.fighter,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        ),
        goblinMultiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterDispatch(state.goblinMultiattackDispatchesRemaining),
      }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      {
        ...stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        goblinMultiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterDispatch(state.goblinMultiattackDispatchesRemaining),
      }
    }

  pure def resolveGoblinOpportunityAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveGoblinOpportunityAttackWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, OrdinaryDamage)

  pure def resolveGoblinOpportunityAttackWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
  ): BattleState =
    resolveGoblinOpportunityAttackWithDispositionAndMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      damageDisposition,
      0,
      false,
    )

  pure def resolveGoblinOpportunityAttackWithDispositionAndMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      state
    else if (
      mirrorImageRedirectsAttackRollHit(
        state.goblin.activeEffects,
        state.fighter.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      {
        ...state,
        fighter: combatantAfterMirrorImageAttackRollHit(
          state.goblin.activeEffects,
          state.fighter,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        ),
      }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, damageDisposition, Goblin))
    }

  pure def resolveGoblinOpportunityAttackWithUncannyDodge(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      state
    else {
      val adjustedDamage = damageAfterAdjustments(uncannyDodgeDamage(damageRoll + 2), Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin))
    }

}
