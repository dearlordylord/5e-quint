// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-held-light-emitter spell.invocation-spell-created-held-object

module battleRuntimeLightSpellAttacks {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageTypeAdjustment.* from "./battle-runtime-damage-type-adjustment"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"
  pure def fighterWithoutProduceFlameHeldLight(state: BattleState): Combatant =
    {
      ...state.fighter,
      activeEffects: activeEffectsWithoutProduceFlameHeldLight(state.fighter.activeEffects),
    }

  pure def produceFlameHurlDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 4
    else if (characterLevel >= 11) 3
    else if (characterLevel >= 5) 2
    else 1

  type LightShieldOfferBoundary = | LightShieldOfferPending | LightShieldOfferConsidered

  pure def resolveProduceFlameHurl(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveProduceFlameHurlWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveProduceFlameHurlWithMirrorImageDuplicateRoll(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int, concentrationSaveSucceeded: bool, mirrorImageDuplicateHighestRoll: int, attackerPerceivesTargetWithBlindsightOrTruesight: bool): BattleState = resolveProduceFlameHurlWithMirrorImageDuplicateRollAtShieldOfferBoundary(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight, LightShieldOfferPending)

  pure def resolveProduceFlameHurlWithMirrorImageDuplicateRollAtShieldOfferBoundary(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
    shieldOfferBoundary: LightShieldOfferBoundary,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      (shieldOfferBoundary == LightShieldOfferPending and
       not(activeEffectsContainProduceFlameHeldLight(state.fighter.activeEffects)))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled), actionAvailable: false }
    }
    else if (
      mirrorImageRedirectsAttackRollHit(
        state.fighter.activeEffects,
        state.goblin.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    ) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      {
        ...rolled,
        fighter: fighterWithoutProduceFlameHeldLight(rolled),
        goblin: combatantAfterMirrorImageAttackRollHit(
          rolled.fighter.activeEffects,
          rolled.goblin,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        ),
        actionAvailable: false,
      }
    }
    else if (shieldOfferBoundary == LightShieldOfferPending and
             not(state.goblin.activeEffects.contains(ShieldArmorClassBonus)) and
             shieldReactionWindowCanOpen(state, ShieldResumesProduceFlameHurl)) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val reactionBase = { ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled) }
      openShieldReactionWindow(reactionBase, ShieldResumesProduceFlameHurl)
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Fire, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled), goblin: damaged, actionAvailable: false }
    }

  pure def resolveFlameBladeAttack(state: BattleState, attackTotal: int, naturalD20: int, damageDiceRoll: int, concentrationSaveSucceeded: bool): BattleState = resolveFlameBladeAttackAtShieldOfferBoundary(state, attackTotal, naturalD20, damageDiceRoll, concentrationSaveSucceeded, LightShieldOfferPending)

  pure def resolveFlameBladeAttackAtShieldOfferBoundary(state: BattleState, attackTotal: int, naturalD20: int, damageDiceRoll: int, concentrationSaveSucceeded: bool, shieldOfferBoundary: LightShieldOfferBoundary): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(activeEffectsContainHeldFlameBlade(state.fighter.activeEffects))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (
      shieldOfferBoundary == LightShieldOfferPending and
      not(state.goblin.activeEffects.contains(ShieldArmorClassBonus)) and
      shieldReactionWindowCanOpen(state, ShieldResumesFlameBladeAttack)
    ) {
      val reactionBase = recordFighterAttackRoll(revealFighterHidden(state))
      openShieldReactionWindow(reactionBase, ShieldResumesFlameBladeAttack)
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(
        flameBladeHeldDamage(rolled.fighter.activeEffects, damageDiceRoll),
        Fire,
        Set(),
        Set(),
        Set()
      )
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: damaged, actionAvailable: false }
    }
}
