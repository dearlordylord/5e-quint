// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR

module unitFeatureMetamagicOptionFactCore {
  // RAW anchors:
  // - Classes/Sorcerer.md: Level 2 Metamagic and Metamagic Options.
  // - Classes/Sorcerer.md: Careful Spell, Empowered Spell, Heightened Spell,
  //   Quickened Spell, and Transmuted Spell Sorcery Point costs.
  // - UBIQUITOUS_LANGUAGE.md: Pool and Spend.

  type BattleRuntimeMetamagicEffectKind =
    | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit
    | DamageDiceRerollStackingException
    | SavingThrowProtection
    | SavingThrowDisadvantage
    | DamageTypeSubstitution

  type BattleRuntimeMetamagicStackingMode =
    | OnePerSpell
    | CanCombineWithDifferentMetamagic

  type BattleRuntimeMetamagicOptionFact =
    | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact
    | DamageDiceRerollStackingExceptionOptionFact
    | SavingThrowProtectionOptionFact
    | SavingThrowDisadvantageOptionFact
    | DamageTypeSubstitutionOptionFact

  pure def quickenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact

  pure def empoweredSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    DamageDiceRerollStackingExceptionOptionFact

  pure def carefulSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SavingThrowProtectionOptionFact

  pure def heightenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SavingThrowDisadvantageOptionFact

  pure def transmutedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    DamageTypeSubstitutionOptionFact

  pure def battleRuntimeMetamagicOptionEffectKind(
    option: BattleRuntimeMetamagicOptionFact
  ): BattleRuntimeMetamagicEffectKind =
    match option {
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact =>
        QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit
      | DamageDiceRerollStackingExceptionOptionFact =>
        DamageDiceRerollStackingException
      | SavingThrowProtectionOptionFact => SavingThrowProtection
      | SavingThrowDisadvantageOptionFact => SavingThrowDisadvantage
      | DamageTypeSubstitutionOptionFact => DamageTypeSubstitution
    }

  pure def battleRuntimeMetamagicOptionStackingMode(
    option: BattleRuntimeMetamagicOptionFact
  ): BattleRuntimeMetamagicStackingMode =
    match option {
      | DamageDiceRerollStackingExceptionOptionFact =>
        CanCombineWithDifferentMetamagic
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact => OnePerSpell
      | SavingThrowProtectionOptionFact => OnePerSpell
      | SavingThrowDisadvantageOptionFact => OnePerSpell
      | DamageTypeSubstitutionOptionFact => OnePerSpell
    }

  pure def battleRuntimeMetamagicOptionSorceryPointCost(
    option: BattleRuntimeMetamagicOptionFact
  ): int =
    match option {
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact => 2
      | DamageDiceRerollStackingExceptionOptionFact => 1
      | SavingThrowProtectionOptionFact => 1
      | SavingThrowDisadvantageOptionFact => 2
      | DamageTypeSubstitutionOptionFact => 1
    }

  pure def supportedBattleRuntimeMetamagicEffectKinds: Set[BattleRuntimeMetamagicEffectKind] =
    Set(
      QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit,
      DamageDiceRerollStackingException,
      SavingThrowProtection,
      SavingThrowDisadvantage,
      DamageTypeSubstitution,
    )

  pure def battleRuntimeMetamagicOptionEffectSupported(
    option: BattleRuntimeMetamagicOptionFact
  ): bool =
    supportedBattleRuntimeMetamagicEffectKinds.contains(
      battleRuntimeMetamagicOptionEffectKind(option)
    )

}
