// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE

module battleRuntimeSpellAttackDirectResolution {
  import battleRuntimeSpellAttackFacts.* from "./battle-runtime-spell-attack-facts"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageTypeAdjustment.* from "./battle-runtime-damage-type-adjustment"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  pure def rayOfFrostSpeedEffectActive(
    hit: bool,
    currentActor: Actor,
    caster: Actor,
  ): bool =
    hit and currentActor != caster
  pure def starryWispDimLightEmitter(
    state: BattleState,
    source: Actor,
    attachment: LightEmitterAttachment,
  ): LightEmitter =
    match attachment {
      | CombatantLightEmitter(_) => SpellLightEmitter({
          source: source,
          sourceSpell: StarryWisp,
          attachment: attachment,
          emission: DimLightEmission({ radiusFeet: 10 }),
          opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
          ongoingSpellTracking: UntrackedSpellLightEmitter,
          expiresAt: EndOfTurnLightEmitterExpiration({
            actor: source,
            round: endOfCasterNextTurnExpiresAtRound(state, source),
          }),
        })
      | ObjectLightEmitter(data) => ObjectInvisibleRevealLightEmitter({
          source: source,
          sourceSpell: StarryWisp,
          object: data.object,
          dimLightRadiusFeet: 10,
          expiresAtActor: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        })
      | DancingLightEmitter(_) => SpellLightEmitter({
          source: source,
          sourceSpell: DancingLightsSpell,
          attachment: attachment,
          emission: DimLightEmission({ radiusFeet: 10 }),
          opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
          ongoingSpellTracking: UntrackedSpellLightEmitter,
          expiresAt: ConcentrationLightEmitterExpiration({ actor: source }),
        })
    }
  pure def applyStarryWispDimLightEmitter(
    state: BattleState,
    source: Actor,
    attachment: LightEmitterAttachment,
  ): BattleState = {
    val emitter = starryWispDimLightEmitter(state, source, attachment)
    { ...state,
      lightEmitters: state.lightEmitters
        .filter(candidate => match candidate {
          | SpellLightEmitter(data) =>
              data.source != source
                or data.sourceSpell != StarryWisp
                or data.attachment != attachment
          | ObjectInvisibleRevealLightEmitter(data) =>
              data.source != source
                or data.sourceSpell != StarryWisp
                or match attachment {
                  | CombatantLightEmitter(_) => true
                  | ObjectLightEmitter(objectAttachment) => data.object != objectAttachment.object
                  | DancingLightEmitter(_) => true
                }
        })
        .union(Set(emitter)),
    }
  }
  pure def applyChillTouchHitPointRegainPrevention(state: BattleState, target: Combatant, source: Actor): Combatant =
    { ...target,
      activeEffects: target.activeEffects
        .filter(effect => match effect {
          | ChillTouchHitPointRegainPrevented(data) => data.source != source
          | _ => true
        })
        .union(Set(ChillTouchHitPointRegainPrevented({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))),
    }
  pure def applyStarryWispInvisibleBenefitDenied(state: BattleState, target: Combatant, source: Actor): Combatant =
    { ...target,
      activeEffects: target.activeEffects
        .filter(effect => match effect {
          | StarryWispInvisibleBenefitDenied(data) => data.source != source
          | _ => true
        })
        .union(Set(StarryWispInvisibleBenefitDenied({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))),
    }

  type DirectSpellAttackReactionContinuation =
    | DirectSpellAttackRayOfFrost
    | DirectSpellAttackPoisonSpray
    | DirectSpellAttackChillTouch

  type DirectSpellAttackShieldOfferBoundary =
    | DirectSpellAttackShieldOfferPending
    | DirectSpellAttackShieldOfferConsidered

  type DirectSpellAttackReactionContinuationOption =
    | NoDirectSpellAttackReactionContinuation
    | HasDirectSpellAttackReactionContinuation(DirectSpellAttackReactionContinuation)

  pure def directSpellAttackContinuationForShield(
    continuation: ShieldReactionContinuation,
  ): DirectSpellAttackReactionContinuationOption =
    match continuation {
      | ShieldResumesRayOfFrost =>
          HasDirectSpellAttackReactionContinuation(DirectSpellAttackRayOfFrost)
      | ShieldResumesPoisonSpray =>
          HasDirectSpellAttackReactionContinuation(DirectSpellAttackPoisonSpray)
      | ShieldResumesChillTouch =>
          HasDirectSpellAttackReactionContinuation(DirectSpellAttackChillTouch)
      | _ => NoDirectSpellAttackReactionContinuation
    }

  pure def directSpellAttackContinuationForCounterspell(
    continuation: CounterspellReactionContinuation,
  ): DirectSpellAttackReactionContinuationOption =
    match continuation {
      | CounterspellResumesRayOfFrost =>
          HasDirectSpellAttackReactionContinuation(DirectSpellAttackRayOfFrost)
      | CounterspellResumesPoisonSpray =>
          HasDirectSpellAttackReactionContinuation(DirectSpellAttackPoisonSpray)
      | CounterspellResumesChillTouch =>
          HasDirectSpellAttackReactionContinuation(DirectSpellAttackChillTouch)
      | _ => NoDirectSpellAttackReactionContinuation
    }

  pure def resumeDirectSpellAttackReactionContinuation(
    state: BattleState,
    continuation: DirectSpellAttackReactionContinuation,
  ): BattleState =
    resumeDirectSpellAttackReactionContinuationAtShieldOfferBoundary(
      state,
      continuation,
      DirectSpellAttackShieldOfferPending,
    )

  pure def resumeDirectSpellAttackReactionContinuationAfterShieldOffer(
    state: BattleState,
    continuation: DirectSpellAttackReactionContinuation,
  ): BattleState =
    resumeDirectSpellAttackReactionContinuationAtShieldOfferBoundary(
      state,
      continuation,
      DirectSpellAttackShieldOfferConsidered,
    )

  pure def resumeDirectSpellAttackReactionContinuationAtShieldOfferBoundary(
    state: BattleState,
    continuation: DirectSpellAttackReactionContinuation,
    shieldOfferBoundary: DirectSpellAttackShieldOfferBoundary,
  ): BattleState =
    match continuation {
      | DirectSpellAttackRayOfFrost =>
          resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
            state,
            15,
            10,
            fighterSpellAttackDamageRoll(4),
            true,
            0,
            false,
            shieldOfferBoundary,
          )
      | DirectSpellAttackPoisonSpray =>
          resolvePoisonSprayWithMirrorImageDuplicateRoll(
            state,
            15,
            10,
            7,
            true,
            0,
            false,
            shieldOfferBoundary,
          )
      | DirectSpellAttackChillTouch =>
          resolveChillTouchWithMirrorImageDuplicateRoll(
            state,
            15,
            10,
            6,
            true,
            0,
            false,
            shieldOfferBoundary,
          )
    }

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
      DirectSpellAttackShieldOfferPending,
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
      DirectSpellAttackShieldOfferPending,
    )
  pure def resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterSpellAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
    shieldOfferBoundary: DirectSpellAttackShieldOfferBoundary,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (shieldOfferBoundary == DirectSpellAttackShieldOfferPending and
             state.goblin.reactionAvailable and
             not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        request: AttackHitShieldReactionRequest({
          eligibleReactors: Set(Goblin),
          continuation: ShieldResumesRayOfFrost,
        }),
        offeredReactors: Set(),
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
      DirectSpellAttackShieldOfferPending,
    )
  pure def resolvePoisonSprayWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
    shieldOfferBoundary: DirectSpellAttackShieldOfferBoundary,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (shieldOfferBoundary == DirectSpellAttackShieldOfferPending and
             state.goblin.reactionAvailable and
             not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        request: AttackHitShieldReactionRequest({
          eligibleReactors: Set(Goblin),
          continuation: ShieldResumesPoisonSpray,
        }),
        offeredReactors: Set(),
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
      DirectSpellAttackShieldOfferPending,
    )
  pure def resolveChillTouchWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
    shieldOfferBoundary: DirectSpellAttackShieldOfferBoundary,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (shieldOfferBoundary == DirectSpellAttackShieldOfferPending and
             state.goblin.reactionAvailable and
             not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        request: AttackHitShieldReactionRequest({
          eligibleReactors: Set(Goblin),
          continuation: ShieldResumesChillTouch,
        }),
        offeredReactors: Set(),
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Necrotic, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: applyChillTouchHitPointRegainPrevention(state, damaged, Fighter), actionAvailable: false }
    }
}
