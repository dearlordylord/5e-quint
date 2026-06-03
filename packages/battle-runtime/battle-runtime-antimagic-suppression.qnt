// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-antimagic-field-ongoing-spell-suppression

module battleRuntimeAntimagicSuppression {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"

  pure val antimagicFieldDurationTicks = 600
  pure val antimagicFieldAreaId = 6
  pure val antimagicFieldRadiusFeet = 10

  pure def activeEffectsWithoutAntimagicFieldOngoingSpellSuppression(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | AntimagicFieldOngoingSpellSuppression(data) => data.areaId != areaId
      | _ => true
    })

  pure def activeEffectsAntimagicSuppressedOngoingSpellEffects(effects: Set[ActiveEffect]): Set[OngoingSpellEffectRef] =
    effects
      .map(effect => match effect {
        | AntimagicFieldOngoingSpellSuppression(data) => data.suppressedOngoingSpellEffects
        | _ => Set()
      })
      .fold(Set(), (left, right) => left.union(right))

  pure def antimagicSuppressedOngoingSpellEffects(state: BattleState): Set[OngoingSpellEffectRef] =
    activeEffectsAntimagicSuppressedOngoingSpellEffects(state.fighter.activeEffects)
      .union(activeEffectsAntimagicSuppressedOngoingSpellEffects(state.goblin.activeEffects))

  pure def antimagicSuppressesOngoingSpellActiveEffect(
    state: BattleState,
    activeEffectKind: OngoingSpellActiveEffectKind,
    effectId: int,
  ): bool =
    antimagicSuppressedOngoingSpellEffects(state)
      .contains(OngoingSpellActiveEffectRef({ activeEffectKind: activeEffectKind, effectId: effectId }))

  pure def resolveAntimagicFieldOngoingSpellSuppression(
    state: BattleState,
    areaId: int,
    suppressedOngoingSpellEffects: Set[OngoingSpellEffectRef],
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 8)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutAntimagicFieldOngoingSpellSuppression(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(AntimagicFieldOngoingSpellSuppression({
              areaId: areaId,
              radiusFeet: antimagicFieldRadiusFeet,
              suppressedOngoingSpellEffects: suppressedOngoingSpellEffects,
              durationTicks: antimagicFieldDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def antimagicFieldOngoingSpellSuppressionActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | AntimagicFieldOngoingSpellSuppression(data) => data.areaId == areaId
      | _ => false
    })
}
