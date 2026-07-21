// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-independent-attack-sequence

module battleRuntimeSpellAttackIndependentSequence {
  import battleRuntimeSpellAttackFacts.* from "./battle-runtime-spell-attack-facts"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"
  import battleRuntimeSpellIndependentSequenceBridge.* from "./battle-runtime-spell-independent-sequence-bridge"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"

  pure def eldritchBlastBeamCount(characterLevel: int): int =
    battleRuntimeSpellAttackSequenceAttackCount(
      BattleRuntimeEldritchBlastBeamSequence,
      characterLevel,
    )
  pure def scorchingRayRayCount(slotLevel: int): int =
    battleRuntimeSpellAttackSequenceAttackCount(
      BattleRuntimeScorchingRaySequence,
      slotLevel,
    )
  pure def resolveEldritchBlastBeamAgainstGoblin(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )
  pure def resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20)))
      recordFighterAttackRoll(state)
    else if (
      mirrorImageRedirectsAttackRollHit(
        state.fighter.activeEffects,
        state.goblin.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      {
        ...recordFighterAttackRoll(state),
        goblin: combatantAfterMirrorImageAttackRollHit(
          state.fighter.activeEffects,
          state.goblin,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        ),
      }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll, Force, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...recordFighterAttackRoll(state), goblin: damaged }
    }
  pure def resolveEldritchBlastTwoBeams(
    state: BattleState,
    firstAttackTotal: int,
    firstNaturalD20: int,
    firstDamageRoll: int,
    firstConcentrationSaveSucceeded: bool,
    secondAttackTotal: int,
    secondNaturalD20: int,
    secondDamageRoll: int,
    secondConcentrationSaveSucceeded: bool,
  ): BattleState =
    resolveEldritchBlastTwoBeamsWithMirrorImageDuplicateRolls(
      state,
      firstAttackTotal,
      firstNaturalD20,
      firstDamageRoll,
      firstConcentrationSaveSucceeded,
      0,
      false,
      secondAttackTotal,
      secondNaturalD20,
      secondDamageRoll,
      secondConcentrationSaveSucceeded,
      0,
      false,
    )
  pure def resolveEldritchBlastTwoBeamsWithMirrorImageDuplicateRolls(
    state: BattleState,
    firstAttackTotal: int,
    firstNaturalD20: int,
    firstDamageRoll: int,
    firstConcentrationSaveSucceeded: bool,
    firstMirrorImageDuplicateHighestRoll: int,
    firstAttackerPerceivesTargetWithBlindsightOrTruesight: bool,
    secondAttackTotal: int,
    secondNaturalD20: int,
    secondDamageRoll: int,
    secondConcentrationSaveSucceeded: bool,
    secondMirrorImageDuplicateHighestRoll: int,
    secondAttackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else {
      val firstResolved = resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
        revealFighterHidden(state),
        firstAttackTotal,
        firstNaturalD20,
        firstDamageRoll,
        firstConcentrationSaveSucceeded,
        firstMirrorImageDuplicateHighestRoll,
        firstAttackerPerceivesTargetWithBlindsightOrTruesight,
      )
      val secondResolved = resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
        firstResolved,
        secondAttackTotal,
        secondNaturalD20,
        secondDamageRoll,
        secondConcentrationSaveSucceeded,
        secondMirrorImageDuplicateHighestRoll,
        secondAttackerPerceivesTargetWithBlindsightOrTruesight,
      )
      { ...secondResolved, actionAvailable: false }
    }
}
