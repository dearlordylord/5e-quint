// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ray-of-enfeeblement-damage-penalty

module battleRuntimeSaveGatedDamageResolution {
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"

  import battleRuntimeSpellAttackBurstBridge.* from "./battle-runtime-spell-attack-burst-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"

  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"
  import battleRuntimeRayOfEnfeeblement.* from "./battle-runtime-ray-of-enfeeblement"
  import battleRuntimeSaveGatedDamageTarget.* from "./battle-runtime-save-gated-damage-target"
  import battleRuntimeSaveGatedObjectFacts.* from "./battle-runtime-save-gated-object-facts"
  import battleRuntimeRayOfEnfeeblementDamageResolution.* from "./battle-runtime-ray-of-enfeeblement-damage-resolution"

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
      | LightningBoltSaveGate => Set()
      | ViciousMockerySaveGate => Set()
      | DissonantWhispersSaveGate => Set()
      | HellishRebukeSaveGate => Set()
      | MindSpikeSaveGate => Set(MindSpikeConcentrationDuration({ durationTicks: mindSpikeDurationTicks }))
    }

  pure def applyResistanceSpellReductionToFighter(state: BattleState, damageType: DamageType, damage: int, reductionRoll: int): BattleState = {
    val reducedDamage = damageAfterResistanceSpellReduction(damage, damageType, state.fighter.activeEffects, reductionRoll)
    val updatedEffects = activeEffectsAfterResistanceSpellReduction(state.fighter.activeEffects, damageType)
    {
      ...state,
      fighter: applyDamage({ ...state.fighter, activeEffects: updatedEffects }, reducedDamage, 1, true),
    }
  }
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
      battleRuntimeAttackBurstSaveDamageBurstAmount(
        battleRuntimeAttackBurstSaveDamageProfileForInvocation(IceKnifeAttackBurstSaveDamage),
        burstDamageRoll,
        savingThrowSucceeded,
      ),
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
          adjustedAttackBurstSaveDamage(
            battleRuntimeAttackBurstSaveDamageBurstAmount(
              battleRuntimeAttackBurstSaveDamageProfileForInvocation(IceKnifeAttackBurstSaveDamage),
              burstDamageRoll,
              goblinSavingThrowSucceeded,
            ),
            attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage),
          )
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
  pure def resolveSelfMindSpike(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSelfTargetSaveGatedDamage(state, MindSpikeSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)
}
