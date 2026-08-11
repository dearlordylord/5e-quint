// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-shield

module battleRuntimeLightShieldReactionResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeDamageTypeAdjustment.* from "./battle-runtime-damage-type-adjustment"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeShieldReactionDecision.* from "./battle-runtime-shield-reaction-decision"

  // RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield
  type LightShieldReactionContinuation =
    | LightShieldProduceFlameHurl
    | LightShieldFlameBladeAttack

  type LightShieldReactionFrame = {
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
    continuation: LightShieldReactionContinuation,
  }

  type LightShieldReactionCandidate =
    | NoLightShieldReactionCandidate
    | HasLightShieldReactionCandidate(LightShieldReactionFrame)

  // The attack-hit Shield frame is opened after the held light has already
  // been consumed. Resume from that boundary instead of replaying the
  // pre-attack held-light admission.
  pure def resumeProduceFlameHurlAfterHeldLightConsumed(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state)
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Fire, Set(), Set(), Set())
      val damaged = applyDamageFromSource(
        state.goblin,
        adjustedDamage,
        if (attackIsCritical(naturalD20, 20)) 2 else 1,
        concentrationSaveSucceeded,
        OrdinaryDamage,
        Fighter,
      )
      { ...rolled, goblin: damaged, actionAvailable: false }
    }

  pure def lightShieldReactionCandidate(
    frame: PendingReactionFrame,
  ): LightShieldReactionCandidate =
    match frame.procedure {
      | ShieldReactionProcedure =>
          if (not(shieldReactionFrameIsFreshGoblinTarget(frame)) or
              frame.trigger != AttackHit)
            NoLightShieldReactionCandidate
          else
            match frame.continuation {
              | ResumeProduceFlameHurl =>
                  HasLightShieldReactionCandidate({
                    eligibleReactors: frame.eligibleReactors,
                    offeredReactors: frame.offeredReactors,
                    continuation: LightShieldProduceFlameHurl,
                  })
              | ResumeFlameBladeAttack =>
                  HasLightShieldReactionCandidate({
                    eligibleReactors: frame.eligibleReactors,
                    offeredReactors: frame.offeredReactors,
                    continuation: LightShieldFlameBladeAttack,
                  })
              | _ => NoLightShieldReactionCandidate
            }
      | _ => NoLightShieldReactionCandidate
    }

  pure def resumeLightShieldReactionContinuation(
    state: BattleState,
    continuation: LightShieldReactionContinuation,
  ): BattleState =
    match continuation {
      | LightShieldProduceFlameHurl =>
          resumeProduceFlameHurlAfterHeldLightConsumed(state, 15, 10, 5, true)
      | LightShieldFlameBladeAttack =>
          resolveFlameBladeAttack(state, 15, 10, 6, true)
    }

  pure def resolveLightShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: LightShieldReactionFrame,
  ): BattleState =
    match takeShieldReactionDecision(
      state,
      reactor,
      frame.eligibleReactors,
      frame.offeredReactors,
    ) {
      | ShieldReactionDecisionTaken(data) =>
          if (data.frameClosed)
            resumeLightShieldReactionContinuation(data.state, frame.continuation)
          else
            data.state
      | _ => state
    }

  pure def declineLightShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: LightShieldReactionFrame,
  ): BattleState =
    match declineShieldReactionDecision(
      state,
      reactor,
    ) {
      | ShieldReactionDecisionDeclined(data) =>
          if (data.frameClosed)
            resumeShieldReactionAfterDecline(
              data.state,
              reactor,
              resumeState => resumeLightShieldReactionContinuation(
                resumeState,
                frame.continuation,
              ),
            )
          else
            data.state
      | _ => state
    }

  pure def resolveLightShieldReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match lightShieldReactionCandidate(frame) {
              | NoLightShieldReactionCandidate => state
              | HasLightShieldReactionCandidate(shieldFrame) =>
                  resolveLightShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }

  pure def declineLightShieldReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match lightShieldReactionCandidate(frame) {
              | NoLightShieldReactionCandidate => state
              | HasLightShieldReactionCandidate(shieldFrame) =>
                  declineLightShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }
}
