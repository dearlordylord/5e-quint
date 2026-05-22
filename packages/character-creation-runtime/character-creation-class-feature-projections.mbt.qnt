// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.CLASS_FEATURE_RESOURCE.PROJECTION CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION

module characterCreationClassFeatureProjectionsMbt {
  var qLastResult: str
  var qResourceUnitId: str
  var qResourceKind: str
  var qResourceMaximum: int
  var qShortRestRefillsAll: bool
  var qLongRestRefillsAll: bool
  var qSourceFactKind: str
  var qLinkedResourceUnitId: str
  var qKnownOptionCount: int
  var qSpellUseLimit: str
  var qMartialArtsDieSourceUnitId: str
  var qMartialArtsDieDice: int
  var qMartialArtsDieSize: int
  var qMonkLevelBonus: int
  var qMetamagicOwnerClassLevel: int
  var qMetamagicChoiceCount: int
  var qMetamagicSelectionRepeatability: str
  var qMetamagicSorceryPointPoolId: str
  var qFirstMetamagicOptionId: str
  var qFirstMetamagicSorceryPointCost: int
  var qFirstMetamagicStackingMode: str
  var qFirstMetamagicEffectKind: str
  var qSecondMetamagicOptionId: str
  var qSecondMetamagicSorceryPointCost: int
  var qSecondMetamagicStackingMode: str
  var qSecondMetamagicEffectKind: str
  var qReplayIndex: int

  action recordProjection(
    lastResult: str,
    resourceUnitId: str,
    resourceKind: str,
    resourceMaximum: int,
    shortRestRefillsAll: bool,
    longRestRefillsAll: bool,
    sourceFactKind: str,
    linkedResourceUnitId: str,
    knownOptionCount: int,
    spellUseLimit: str,
    martialArtsDieSourceUnitId: str,
    martialArtsDieDice: int,
    martialArtsDieSize: int,
    monkLevelBonus: int,
    metamagicOwnerClassLevel: int,
    metamagicChoiceCount: int,
    metamagicSelectionRepeatability: str,
    metamagicSorceryPointPoolId: str,
    firstMetamagicOptionId: str,
    firstMetamagicSorceryPointCost: int,
    firstMetamagicStackingMode: str,
    firstMetamagicEffectKind: str,
    secondMetamagicOptionId: str,
    secondMetamagicSorceryPointCost: int,
    secondMetamagicStackingMode: str,
    secondMetamagicEffectKind: str,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qResourceUnitId' = resourceUnitId,
    qResourceKind' = resourceKind,
    qResourceMaximum' = resourceMaximum,
    qShortRestRefillsAll' = shortRestRefillsAll,
    qLongRestRefillsAll' = longRestRefillsAll,
    qSourceFactKind' = sourceFactKind,
    qLinkedResourceUnitId' = linkedResourceUnitId,
    qKnownOptionCount' = knownOptionCount,
    qSpellUseLimit' = spellUseLimit,
    qMartialArtsDieSourceUnitId' = martialArtsDieSourceUnitId,
    qMartialArtsDieDice' = martialArtsDieDice,
    qMartialArtsDieSize' = martialArtsDieSize,
    qMonkLevelBonus' = monkLevelBonus,
    qMetamagicOwnerClassLevel' = metamagicOwnerClassLevel,
    qMetamagicChoiceCount' = metamagicChoiceCount,
    qMetamagicSelectionRepeatability' = metamagicSelectionRepeatability,
    qMetamagicSorceryPointPoolId' = metamagicSorceryPointPoolId,
    qFirstMetamagicOptionId' = firstMetamagicOptionId,
    qFirstMetamagicSorceryPointCost' = firstMetamagicSorceryPointCost,
    qFirstMetamagicStackingMode' = firstMetamagicStackingMode,
    qFirstMetamagicEffectKind' = firstMetamagicEffectKind,
    qSecondMetamagicOptionId' = secondMetamagicOptionId,
    qSecondMetamagicSorceryPointCost' = secondMetamagicSorceryPointCost,
    qSecondMetamagicStackingMode' = secondMetamagicStackingMode,
    qSecondMetamagicEffectKind' = secondMetamagicEffectKind,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection(
      "init",
      "none",
      "none",
      0,
      false,
      false,
      "none",
      "none",
      0,
      "none",
      "none",
      0,
      0,
      0,
      0,
      0,
      "none",
      "none",
      "none",
      0,
      "none",
      "none",
      "none",
      0,
      "none",
      "none",
      0,
    )

  action doProjectMonkFocusAndUncannyMetabolism = all {
    qReplayIndex == 0,
    recordProjection(
      "monk-focus-uncanny-metabolism",
      "monk_monks_focus",
      "use_count",
      2,
      true,
      true,
      "uncanny_metabolism",
      "monk_monks_focus",
      0,
      "none",
      "monk_martial_arts",
      1,
      6,
      2,
      0,
      0,
      "none",
      "none",
      "none",
      0,
      "none",
      "none",
      "none",
      0,
      "none",
      "none",
      1,
    ),
  }

  action doProjectSorcererFontAndMetamagic = all {
    qReplayIndex == 1,
    recordProjection(
      "sorcerer-font-metamagic",
      "sorcerer_font_of_magic",
      "point_pool",
      2,
      false,
      true,
      "sorcerer_metamagic",
      "sorcerer_font_of_magic",
      2,
      "one_per_spell_unless_option_allows_stacking",
      "none",
      0,
      0,
      0,
      2,
      2,
      "unique",
      "sorcery_points",
      "sorcerer_empowered_spell",
      1,
      "can_combine_with_different_metamagic",
      "damage_dice_reroll",
      "sorcerer_heightened_spell",
      2,
      "one_per_spell",
      "saving_throw_disadvantage",
      2,
    ),
  }

  action step = any {
    doProjectMonkFocusAndUncannyMetabolism,
    doProjectSorcererFontAndMetamagic,
  }
}
