// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ongoing-spell-ending

module battleRuntimeOngoingSpellDispel {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def dispelMagicEndsTrackedOngoingSpell(
    slotLevel: int,
    successfulCheckEffectIds: Set[int],
    sourceEffectId: int,
    sourceSpellLevel: int,
  ): bool =
    sourceSpellLevel <= slotLevel or successfulCheckEffectIds.contains(sourceEffectId)

  pure def dispelMagicCheckSucceeds(checkTotal: int, sourceSpellLevel: int): bool =
    checkTotal >= 10 + sourceSpellLevel

  pure def dispelMagicSuccessfulAbilityCheckEffectIds(
    sourceEffectId: int,
    checkTotal: int,
    sourceSpellLevel: int,
  ): Set[int] =
    if (dispelMagicCheckSucceeds(checkTotal, sourceSpellLevel)) Set(sourceEffectId) else Set()

  pure def dispelMagicMagicalEffectTargetActiveEffects(
    effects: Set[ActiveEffect],
    activeEffectKind: OngoingSpellActiveEffectKind,
    effectId: int,
    slotLevel: int,
    successfulCheckEffectIds: Set[int],
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HeatMetalObjectContactDamage(data) =>
          not(
            activeEffectKind == OngoingSpellObjectContactDamageEffect and
            data.effectId == effectId and
            dispelMagicEndsTrackedOngoingSpell(
              slotLevel,
              successfulCheckEffectIds,
              data.effectId,
              data.sourceSpellLevel,
            )
          )
      | SpiritualWeapon(data) =>
          not(
            activeEffectKind == OngoingSpellSpiritualWeaponEffect and
            data.effectId == effectId and
            dispelMagicEndsTrackedOngoingSpell(
              slotLevel,
              successfulCheckEffectIds,
              data.effectId,
              data.sourceSpellLevel,
            )
          )
      | _ => true
    })
}
