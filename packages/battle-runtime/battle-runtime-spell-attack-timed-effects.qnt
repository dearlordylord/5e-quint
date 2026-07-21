// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module battleRuntimeSpellAttackTimedEffects {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

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
}
