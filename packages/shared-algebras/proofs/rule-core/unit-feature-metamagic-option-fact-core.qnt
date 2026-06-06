// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE

module unitFeatureMetamagicOptionFactCore {
  // RAW anchors:
  // - Classes/Sorcerer.md: Level 2 Metamagic and Metamagic Options.
  // - Classes/Sorcerer.md: Careful Spell, Distant Spell, Empowered Spell,
  //   Heightened Spell, Quickened Spell, Transmuted Spell, and Twinned Spell
  //   Sorcery Point costs.
  // - UBIQUITOUS_LANGUAGE.md: Pool and Spend.

  type BattleRuntimeMetamagicEffectKind =
    | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit
    | SpellRangeIncrease
    | DamageDiceRerollStackingException
    | SavingThrowProtection
    | SavingThrowDisadvantage
    | DamageTypeSubstitution
    | EffectiveSpellLevelIncreaseForExtraTarget

  type BattleRuntimeMetamagicStackingMode =
    | OnePerSpell
    | CanCombineWithDifferentMetamagic

  type BattleRuntimeMetamagicOptionFact =
    | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact
    | SpellRangeIncreaseOptionFact
    | DamageDiceRerollStackingExceptionOptionFact
    | SavingThrowProtectionOptionFact
    | SavingThrowDisadvantageOptionFact
    | DamageTypeSubstitutionOptionFact
    | EffectiveSpellLevelIncreaseForExtraTargetOptionFact

  pure def quickenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact

  pure def distantSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SpellRangeIncreaseOptionFact

  pure def empoweredSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    DamageDiceRerollStackingExceptionOptionFact

  pure def carefulSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SavingThrowProtectionOptionFact

  pure def heightenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SavingThrowDisadvantageOptionFact

  pure def transmutedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    DamageTypeSubstitutionOptionFact

  pure def twinnedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    EffectiveSpellLevelIncreaseForExtraTargetOptionFact

  pure def battleRuntimeMetamagicOptionEffectKind(
    option: BattleRuntimeMetamagicOptionFact
  ): BattleRuntimeMetamagicEffectKind =
    match option {
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact =>
        QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit
      | SpellRangeIncreaseOptionFact => SpellRangeIncrease
      | DamageDiceRerollStackingExceptionOptionFact =>
        DamageDiceRerollStackingException
      | SavingThrowProtectionOptionFact => SavingThrowProtection
      | SavingThrowDisadvantageOptionFact => SavingThrowDisadvantage
      | DamageTypeSubstitutionOptionFact => DamageTypeSubstitution
      | EffectiveSpellLevelIncreaseForExtraTargetOptionFact =>
        EffectiveSpellLevelIncreaseForExtraTarget
    }

  pure def battleRuntimeMetamagicOptionStackingMode(
    option: BattleRuntimeMetamagicOptionFact
  ): BattleRuntimeMetamagicStackingMode =
    match option {
      | DamageDiceRerollStackingExceptionOptionFact =>
        CanCombineWithDifferentMetamagic
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact => OnePerSpell
      | SpellRangeIncreaseOptionFact => OnePerSpell
      | SavingThrowProtectionOptionFact => OnePerSpell
      | SavingThrowDisadvantageOptionFact => OnePerSpell
      | DamageTypeSubstitutionOptionFact => OnePerSpell
      | EffectiveSpellLevelIncreaseForExtraTargetOptionFact => OnePerSpell
    }

  pure def battleRuntimeMetamagicOptionSorceryPointCost(
    option: BattleRuntimeMetamagicOptionFact
  ): int =
    match option {
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact => 2
      | SpellRangeIncreaseOptionFact => 1
      | DamageDiceRerollStackingExceptionOptionFact => 1
      | SavingThrowProtectionOptionFact => 1
      | SavingThrowDisadvantageOptionFact => 2
      | DamageTypeSubstitutionOptionFact => 1
      | EffectiveSpellLevelIncreaseForExtraTargetOptionFact => 1
    }

  pure def supportedBattleRuntimeMetamagicEffectKinds: Set[BattleRuntimeMetamagicEffectKind] =
    Set(
      QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit,
      SpellRangeIncrease,
      DamageDiceRerollStackingException,
      SavingThrowProtection,
      SavingThrowDisadvantage,
      DamageTypeSubstitution,
      EffectiveSpellLevelIncreaseForExtraTarget,
    )

  pure def battleRuntimeMetamagicOptionEffectSupported(
    option: BattleRuntimeMetamagicOptionFact
  ): bool =
    supportedBattleRuntimeMetamagicEffectKinds.contains(
      battleRuntimeMetamagicOptionEffectKind(option)
    )

}
