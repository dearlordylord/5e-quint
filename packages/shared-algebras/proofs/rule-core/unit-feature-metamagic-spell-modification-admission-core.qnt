// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL

module unitFeatureMetamagicSpellModificationAdmissionCore {
  import unitFeatureMetamagicOptionFactCore.* from "./unit-feature-metamagic-option-fact-core"

  // RAW anchors:
  // - Classes/Sorcerer.md: Level 2 Metamagic option choice, Sorcery Point
  //   spend, and one-Metamagic-option-per-spell default.
  // - Classes/Sorcerer.md: Empowered Spell and Seeking Spell stacking exceptions.
  // - UBIQUITOUS_LANGUAGE.md: Pool and Spend.

  pure def selectedMetamagicOptionsKnown(
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    selectedOptions.forall(option => knownOptions.contains(option))

  pure def selectedMetamagicSorceryPointCost(
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): int =
    selectedOptions
      .map(option => battleRuntimeMetamagicOptionSorceryPointCost(option))
      .fold(0, (total, cost) => total + cost)

  pure def selectedMetamagicOptionsAffordable(
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    sorceryPointsRemaining >= selectedMetamagicSorceryPointCost(selectedOptions)

  pure def selectedMetamagicOptionsCanStack(
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    selectedOptions.size() <= 1 or (
      selectedOptions.size() == 2 and
      selectedOptions.exists(
        option => battleRuntimeMetamagicOptionStackingMode(option) == CanCombineWithDifferentMetamagic
      )
    )

  pure def selectedMetamagicSpellModificationAdmission(
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.size() > 0 and
    selectedMetamagicOptionsKnown(knownOptions, selectedOptions) and
    selectedMetamagicOptionsAffordable(selectedOptions, sorceryPointsRemaining) and
    selectedMetamagicOptionsCanStack(selectedOptions)
}
