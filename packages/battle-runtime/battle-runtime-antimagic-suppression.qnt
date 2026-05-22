// -*- mode: Bluespec; -*-

module battleRuntimeAntimagicSuppression {
  import battleRuntimeModel.* from "./battle-runtime-model"

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

  run test_antimagic_field_suppression_tracks_ongoing_spell_refs = {
    val suppressed = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(AntimagicFieldOngoingSpellSuppression({
          areaId: 1,
          radiusFeet: 10,
          suppressedOngoingSpellEffects: Set(OngoingSpellActiveEffectRef({
            activeEffectKind: OngoingSpellSpiritualWeaponEffect,
            effectId: 2,
          })),
          durationTicks: 10,
        })),
      },
    }
    all {
      assert(antimagicSuppressesOngoingSpellActiveEffect(suppressed, OngoingSpellSpiritualWeaponEffect, 2)),
      assert(not(antimagicSuppressesOngoingSpellActiveEffect(suppressed, OngoingSpellSpiritualWeaponEffect, 3))),
    }
  }
}
