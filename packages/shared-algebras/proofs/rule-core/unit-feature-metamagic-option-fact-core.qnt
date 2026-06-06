// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL

module unitFeatureMetamagicOptionFactCore {
  // RAW anchors:
  // - Classes/Sorcerer.md: Level 2 Metamagic and Metamagic Options.
  // - Classes/Sorcerer.md: Careful Spell, Distant Spell, Empowered Spell,
  //   Extended Spell,
  //   Heightened Spell, Quickened Spell, Seeking Spell, Subtle Spell,
  //   Transmuted Spell, and Twinned Spell Sorcery Point costs.
  // - UBIQUITOUS_LANGUAGE.md: Pool and Spend.

  type BattleRuntimeMetamagicEffectKind =
    | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit
    | SpellRangeIncrease
    | DurationExtensionAndConcentrationSaveAdvantage
    | DamageDiceRerollStackingException
    | MissedSpellAttackRerollStackingException
    | SavingThrowProtection
    | SavingThrowDisadvantage
    | ComponentSuppression
    | DamageTypeSubstitution
    | EffectiveSpellLevelIncreaseForExtraTarget

  type BattleRuntimeMetamagicStackingMode =
    | OnePerSpell
    | CanCombineWithDifferentMetamagic

  type BattleRuntimeMetamagicOptionFact =
    | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact
    | SpellRangeIncreaseOptionFact
    | DurationExtensionAndConcentrationSaveAdvantageOptionFact
    | DamageDiceRerollStackingExceptionOptionFact
    | MissedSpellAttackRerollStackingExceptionOptionFact
    | SavingThrowProtectionOptionFact
    | SavingThrowDisadvantageOptionFact
    | ComponentSuppressionOptionFact
    | DamageTypeSubstitutionOptionFact
    | EffectiveSpellLevelIncreaseForExtraTargetOptionFact

  pure def quickenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact

  pure def distantSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SpellRangeIncreaseOptionFact

  pure def extendedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    DurationExtensionAndConcentrationSaveAdvantageOptionFact

  pure def empoweredSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    DamageDiceRerollStackingExceptionOptionFact

  pure def seekingSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    MissedSpellAttackRerollStackingExceptionOptionFact

  pure def carefulSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SavingThrowProtectionOptionFact

  pure def heightenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    SavingThrowDisadvantageOptionFact

  pure def subtleSpellMetamagicFact: BattleRuntimeMetamagicOptionFact =
    ComponentSuppressionOptionFact

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
      | DurationExtensionAndConcentrationSaveAdvantageOptionFact =>
        DurationExtensionAndConcentrationSaveAdvantage
      | DamageDiceRerollStackingExceptionOptionFact =>
        DamageDiceRerollStackingException
      | MissedSpellAttackRerollStackingExceptionOptionFact =>
        MissedSpellAttackRerollStackingException
      | SavingThrowProtectionOptionFact => SavingThrowProtection
      | SavingThrowDisadvantageOptionFact => SavingThrowDisadvantage
      | ComponentSuppressionOptionFact => ComponentSuppression
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
      | MissedSpellAttackRerollStackingExceptionOptionFact =>
        CanCombineWithDifferentMetamagic
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact => OnePerSpell
      | SpellRangeIncreaseOptionFact => OnePerSpell
      | DurationExtensionAndConcentrationSaveAdvantageOptionFact => OnePerSpell
      | SavingThrowProtectionOptionFact => OnePerSpell
      | SavingThrowDisadvantageOptionFact => OnePerSpell
      | ComponentSuppressionOptionFact => OnePerSpell
      | DamageTypeSubstitutionOptionFact => OnePerSpell
      | EffectiveSpellLevelIncreaseForExtraTargetOptionFact => OnePerSpell
    }

  pure def battleRuntimeMetamagicOptionSorceryPointCost(
    option: BattleRuntimeMetamagicOptionFact
  ): int =
    match option {
      | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimitOptionFact => 2
      | SpellRangeIncreaseOptionFact => 1
      | DurationExtensionAndConcentrationSaveAdvantageOptionFact => 1
      | DamageDiceRerollStackingExceptionOptionFact => 1
      | MissedSpellAttackRerollStackingExceptionOptionFact => 1
      | SavingThrowProtectionOptionFact => 1
      | SavingThrowDisadvantageOptionFact => 2
      | ComponentSuppressionOptionFact => 1
      | DamageTypeSubstitutionOptionFact => 1
      | EffectiveSpellLevelIncreaseForExtraTargetOptionFact => 1
    }

  pure def supportedBattleRuntimeMetamagicEffectKinds: Set[BattleRuntimeMetamagicEffectKind] =
    Set(
      QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit,
      SpellRangeIncrease,
      DurationExtensionAndConcentrationSaveAdvantage,
      DamageDiceRerollStackingException,
      MissedSpellAttackRerollStackingException,
      SavingThrowProtection,
      SavingThrowDisadvantage,
      ComponentSuppression,
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
