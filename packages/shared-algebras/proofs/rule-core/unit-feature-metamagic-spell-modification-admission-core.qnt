// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR

module unitFeatureMetamagicSpellModificationAdmissionCore {
  import unitFeatureMetamagicOptionFactCore.* from "./unit-feature-metamagic-option-fact-core"

  // RAW anchors:
  // - Classes/Sorcerer.md: Level 2 Metamagic option choice, Sorcery Point
  //   spend, and one-Metamagic-option-per-spell default.
  // - Classes/Sorcerer.md: Empowered Spell stacking exception.
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
