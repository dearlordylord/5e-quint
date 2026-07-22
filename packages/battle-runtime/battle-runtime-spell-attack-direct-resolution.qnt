// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module battleRuntimeSpellAttackDirectResolution {
  import battleRuntimeSpellAttackFacts.* from "./battle-runtime-spell-attack-facts"
  import battleRuntimeSpellAttackTimedEffects.* from "./battle-runtime-spell-attack-timed-effects"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  pure def fighterSpellAttackMirrorImageRedirects(
    state: BattleState,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): bool =
    mirrorImageRedirectsAttackRollHit(
      state.fighter.activeEffects,
      state.goblin.activeEffects,
      attackerPerceivesTargetWithBlindsightOrTruesight,
      mirrorImageDuplicateHighestRoll,
    )
  pure def recordFighterSpellAttackMirrorImageDuplicateHit(
    state: BattleState,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState = {
    val rolled = recordFighterAttackRoll(revealFighterHidden(state))
    {
      ...rolled,
      goblin: combatantAfterMirrorImageAttackRollHit(
        rolled.fighter.activeEffects,
        rolled.goblin,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      ),
      actionAvailable: false,
    }
  }
  pure def resolveRayOfFrost(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveRayOfFrostWithMirrorImageDuplicateRoll(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 0, false)
  pure def resolveRayOfFrostWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      fighterSpellAttackDamageRoll(damageRoll),
      concentrationSaveSucceeded,
      mirrorImageDuplicateHighestRoll,
      attackerPerceivesTargetWithBlindsightOrTruesight,
    )
  pure def resolveRayOfFrostWithDamageRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterSpellAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )
  pure def resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterSpellAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, rolled.fighter.activeEffects, Goblin)
      val damaged = applyDamageFromSource(state.goblin, damageRoll.spellDamageRoll + huntersMarkDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: { ...damaged, activeEffects: damaged.activeEffects.union(Set(RayOfFrostSpeedDelta)) }, actionAvailable: false }
    }
  pure def resolvePoisonSpray(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolvePoisonSprayWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )
  pure def resolvePoisonSprayWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumePoisonSpray,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Poison, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: damaged, actionAvailable: false }
    }
  pure def resolveChillTouch(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveChillTouchWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )
  pure def resolveChillTouchWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeChillTouch,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Necrotic, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: applyChillTouchHitPointRegainPrevention(state, damaged, Fighter), actionAvailable: false }
    }
}
