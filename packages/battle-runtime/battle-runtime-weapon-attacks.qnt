// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-attack-override
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave

module battleRuntimeWeaponAttacks {
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
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

  pure def spendFighterAttackActionOrExtraAttackSlot(state: BattleState): BattleState = {
    val attacker = combatantForActor(state, Fighter)
    if (hasAttackActionAdditionalAttacks(attacker.extraAttackSlotsRemaining))
      stateWithActorCombatant(state, Fighter, { ...attacker, extraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterExtraAttack(attacker.extraAttackSlotsRemaining) })
    else {
      val spent = stateWithFighterMovementStep(
        state,
        battleRuntimeSpendAttackAction(movementProjectionForFighter(state, WalkSpeedKind)),
      )
      if (spent != state)
        stateWithActorCombatant(spent, Fighter, { ...combatantForActor(spent, Fighter), extraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterAttackAction(
          state.actionAvailable,
          attacker.extraAttackAdditionalAttacks,
        ) })
      else
        state
    }
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
    val attacker = combatantForActor(state, Fighter)
    val defender = combatantForActor(state, Goblin)
    val primary = resolveAttack(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded)
    val cleaveAvailable =
      attacker.greataxeCleaveMastery and
      not(attacker.cleaveExtraAttackUsedThisTurn) and
      attackHits(attackTotal, naturalD20, combatantArmorClass(defender), fighterCriticalThreshold(state))
    if (
      cleaveAvailable and
      useCleave and
      cleaveSecondTargetEligible and
      attackHits(cleaveAttackTotal, cleaveNaturalD20, combatantArmorClass(defender), fighterCriticalThreshold(state))
    )
      stateWithActorCombatants(
        primary,
        Goblin, applyDamageFromSource(combatantForActor(primary, Goblin), cleaveSecondHitDamage(cleaveDamageRoll, attackAbilityModifier), if (attackIsCritical(cleaveNaturalD20, fighterCriticalThreshold(state))) 2 else 1, true, OrdinaryDamage, Fighter),
        Fighter, { ...combatantForActor(primary, Fighter), cleaveExtraAttackUsedThisTurn: true },
      )
    else if (cleaveAvailable and useCleave and cleaveSecondTargetEligible)
      stateWithActorCombatant(primary, Fighter, { ...combatantForActor(primary, Fighter), cleaveExtraAttackUsedThisTurn: true })
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
  ): BattleState = {
    val attacker = combatantForActor(state, Fighter)
    val defender = combatantForActor(state, Goblin)
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or attacker.unconscious or attacker.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      val rageDamage = if (fighterHasRage(revealed)) fighterRageDamageBonus(barbarianLevel) else 0
      val divineFavorDamage = fighterDivineFavorDamage(damageRoll.divineFavorDamageRoll, combatantForActor(revealed, Fighter).activeEffects)
      val divineSmiteDamage = damageRoll.divineSmiteDamageRoll
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, combatantForActor(revealed, Fighter).activeEffects, Goblin)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else if (
        mirrorImageRedirectsAttackRollHit(
          combatantForActor(spent, Fighter).activeEffects,
          combatantForActor(spent, Goblin).activeEffects,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        )
      )
        {
          ...stateWithActorCombatant(spent, Goblin, combatantAfterMirrorImageAttackRollHit(
            combatantForActor(spent, Fighter).activeEffects,
            combatantForActor(spent, Goblin),
            attackerPerceivesTargetWithBlindsightOrTruesight,
            mirrorImageDuplicateHighestRoll,
          )),
          lightWeaponAttackMade: true,
        }
      else {
        val damaged = applyDamageFromSource(defender, damageRoll.weaponDamageRoll + 3 + rageDamage + divineFavorDamage + divineSmiteDamage + huntersMarkDamage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, damageDisposition, Fighter)
        val sapEffects = if (attacker.longswordSapMastery) Set(WeaponMasterySapNextAttackDisadvantage({ source: Fighter })) else Set()
        val toppled = attacker.quarterstaffToppleMastery and forceToppleSave and not(toppleSaveSucceeded)
        { ...stateWithActorCombatant(spent, Goblin, { ...damaged, prone: damaged.prone or toppled, activeEffects: damaged.activeEffects.union(sapEffects) }), lightWeaponAttackMade: true }
      }
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
  ): BattleState = {
    val attacker = combatantForActor(state, Fighter)
    val defender = combatantForActor(state, Goblin)
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      attacker.unconscious or
      attacker.incapacitated or
      fighterHasRage(state) or
      not(trueStrikeDamageTypeChoiceIsLegal(selectedDamageType, weaponDamageType))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), fighterCriticalThreshold(state)))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (defender.reactionAvailable and not(defender.activeEffects.contains(ShieldArmorClassBonus))) {
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
      { ...stateWithActorCombatant(rolled, Goblin, applyDamageFromSource(defender, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)), actionAvailable: false }
    }
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
  ): BattleState = {
    val attacker = combatantForActor(state, Fighter)
    val defender = combatantForActor(state, Goblin)
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or attacker.unconscious or attacker.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else {
        val sneakSelectedAndEligible =
          selectedSneakAttack and
          fighterSneakAttackEligible(revealed, rollHasAdvantage, allyAdjacent, rollHasDisadvantage)
        val damage = weaponDamageRoll + 3 + (if (sneakSelectedAndEligible) sneakAttackDamageRoll else 0)
        {
          ...stateWithActorCombatants(
            spent,
            Goblin, applyDamageFromSource(defender, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
            Fighter, { ...combatantForActor(spent, Fighter), sneakAttackUsedThisTurn: sneakSelectedAndEligible or combatantForActor(revealed, Fighter).sneakAttackUsedThisTurn },
          ),
          lightWeaponAttackMade: true,
        }
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
  ): BattleState = {
    val attacker = combatantForActor(state, Goblin)
    val defender = combatantForActor(state, Fighter)
    if (not(state.actionAvailable) or currentActor(state) != Goblin or attacker.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), 20)))
      { ...state, actionAvailable: false }
    else if (
      mirrorImageRedirectsAttackRollHit(
        attacker.activeEffects,
        defender.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      {
        ...stateWithActorCombatant(state, Fighter, combatantAfterMirrorImageAttackRollHit(
          attacker.activeEffects,
          defender,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        )),
        actionAvailable: false,
      }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      {
        ...stateWithFighterDamage(state, applyDamageFromSource(defender, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        actionAvailable: false,
      }
    }
  }

  pure def resolveGoblinMultiattack(state: BattleState): BattleState = {
    val attacker = combatantForActor(state, Goblin)
    if (not(state.actionAvailable) or currentActor(state) != Goblin or attacker.hp == 0)
      state
    else
      { ...stateWithActorCombatant(state, Goblin, { ...attacker, multiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterFirstAttack }), actionAvailable: false }
  }

  pure def goblinMultiattackDispatchContinuationOpen(state: BattleState): bool =
    currentActor(state) == Goblin and combatantForActor(state, Goblin).multiattackDispatchesRemaining > 0

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
  ): BattleState = {
    val attacker = combatantForActor(state, Goblin)
    val defender = combatantForActor(state, Fighter)
    val attackerAfterDispatch = { ...attacker, multiattackDispatchesRemaining: battleRuntimeGoblinMultiattackDispatchesAfterDispatch(attacker.multiattackDispatchesRemaining) }
    if (attacker.multiattackDispatchesRemaining <= 0 or currentActor(state) != Goblin or attacker.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), 20)))
      stateWithActorCombatant(state, Goblin, attackerAfterDispatch)
    else if (
      mirrorImageRedirectsAttackRollHit(
        attacker.activeEffects,
        defender.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      stateWithActorCombatants(
        state,
        Fighter, combatantAfterMirrorImageAttackRollHit(
          attacker.activeEffects,
          defender,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        ),
        Goblin, attackerAfterDispatch,
      )
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      stateWithActorCombatant(
        stateWithFighterDamage(state, applyDamageFromSource(defender, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        Goblin,
        attackerAfterDispatch,
      )
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
  ): BattleState = {
    val attacker = combatantForActor(state, Goblin)
    val defender = combatantForActor(state, Fighter)
    if (attacker.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), 20)))
      state
    else if (
      mirrorImageRedirectsAttackRollHit(
        attacker.activeEffects,
        defender.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      stateWithActorCombatant(state, Fighter, combatantAfterMirrorImageAttackRollHit(
        attacker.activeEffects,
        defender,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      ))
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(defender, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, damageDisposition, Goblin))
    }
  }

  pure def resolveGoblinOpportunityAttackWithUncannyDodge(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val attacker = combatantForActor(state, Goblin)
    val defender = combatantForActor(state, Fighter)
    if (attacker.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), 20)))
      state
    else {
      val adjustedDamage = damageAfterAdjustments(uncannyDodgeDamage(damageRoll + 2), Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(defender, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin))
    }
  }

}
