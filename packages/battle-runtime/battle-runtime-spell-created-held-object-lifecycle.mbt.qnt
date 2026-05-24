// -*- mode: Bluespec; -*-

module battleRuntimeSpellCreatedHeldObjectLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Flame Blade:
  //   the spell evokes a fiery blade in a free hand; it lasts for the
  //   Concentration duration, disappears if let go, can be evoked again as a
  //   Bonus Action, sheds Bright Light and Dim Light, and enables a Magic
  //   Action melee spell attack for Fire damage.
  // - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
  //   if the effect creator loses Concentration, the effect ends.
  // - .references/srd-5.2.1/Playing-the-Game.md#Light:
  //   Bright Light is normal illumination and Dim Light creates a Lightly
  //   Obscured area.
  // - UBIQUITOUS_LANGUAGE.md: Holding / Wielding, Free Hand, Magic Action,
  //   Bonus Action, Spell Attack, Concentration, Illumination, and Spell Slot.
  var qMagicActionAvailable: bool
  var qBonusActionAvailable: bool
  var qInitialCastAvailable: bool
  var qHeldObjectEffectActive: bool
  var qHeldObjectHeld: bool
  var qFreeHandAvailable: bool
  var qCasterConcentrating: bool
  var qLightProjected: bool
  var qSpellSlotExpended: int
  var qSpellSlotCommittedThisTurn: bool
  var qAttackAvailable: bool
  var qReEvokeAvailable: bool
  var qTargetHp: int
  var qLastResult: str

  pure val initialTargetHp: int = 20
  pure val hitTargetHp: int = 8

  action recordSpellCreatedHeldObjectState(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    initialCastAvailable: bool,
    heldObjectEffectActive: bool,
    heldObjectHeld: bool,
    freeHandAvailable: bool,
    casterConcentrating: bool,
    lightProjected: bool,
    spellSlotExpended: int,
    spellSlotCommittedThisTurn: bool,
    attackAvailable: bool,
    reEvokeAvailable: bool,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qMagicActionAvailable' = magicActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qInitialCastAvailable' = initialCastAvailable,
    qHeldObjectEffectActive' = heldObjectEffectActive,
    qHeldObjectHeld' = heldObjectHeld,
    qFreeHandAvailable' = freeHandAvailable,
    qCasterConcentrating' = casterConcentrating,
    qLightProjected' = lightProjected,
    qSpellSlotExpended' = spellSlotExpended,
    qSpellSlotCommittedThisTurn' = spellSlotCommittedThisTurn,
    qAttackAvailable' = attackAvailable,
    qReEvokeAvailable' = reEvokeAvailable,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = recordSpellCreatedHeldObjectState(
    true,
    true,
    true,
    false,
    false,
    true,
    false,
    false,
    0,
    false,
    false,
    false,
    initialTargetHp,
    "init",
  )

  action doCastHeldObject = all {
    qInitialCastAvailable,
    qBonusActionAvailable,
    qFreeHandAvailable,
    qSpellSlotExpended == 0,
    recordSpellCreatedHeldObjectState(
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      1,
      true,
      true,
      false,
      initialTargetHp,
      "castHeldObject",
    ),
  }

  action doAttackHeldObject = all {
    qHeldObjectEffectActive,
    qHeldObjectHeld,
    qMagicActionAvailable,
    qTargetHp == initialTargetHp,
    recordSpellCreatedHeldObjectState(
      false,
      qBonusActionAvailable,
      false,
      true,
      true,
      false,
      true,
      true,
      qSpellSlotExpended,
      qSpellSlotCommittedThisTurn,
      false,
      false,
      hitTargetHp,
      "attackedHeldObject",
    ),
  }

  action doReleaseHeldObject = all {
    qHeldObjectEffectActive,
    qHeldObjectHeld,
    recordSpellCreatedHeldObjectState(
      qMagicActionAvailable,
      qBonusActionAvailable,
      false,
      true,
      false,
      true,
      true,
      false,
      qSpellSlotExpended,
      qSpellSlotCommittedThisTurn,
      false,
      qBonusActionAvailable,
      qTargetHp,
      "releasedHeldObject",
    ),
  }

  action doAdvanceToCasterTurn = all {
    qHeldObjectEffectActive,
    qCasterConcentrating,
    recordSpellCreatedHeldObjectState(
      true,
      true,
      false,
      true,
      qHeldObjectHeld,
      not(qHeldObjectHeld),
      true,
      qHeldObjectHeld,
      qSpellSlotExpended,
      false,
      qHeldObjectHeld,
      not(qHeldObjectHeld),
      qTargetHp,
      "nextCasterTurn",
    ),
  }

  action doReEvokeHeldObject = all {
    qHeldObjectEffectActive,
    not(qHeldObjectHeld),
    qReEvokeAvailable,
    qBonusActionAvailable,
    qFreeHandAvailable,
    recordSpellCreatedHeldObjectState(
      qMagicActionAvailable,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      qSpellSlotExpended,
      false,
      qMagicActionAvailable,
      false,
      qTargetHp,
      "reEvokedHeldObject",
    ),
  }

  action doBreakConcentration = all {
    qHeldObjectEffectActive,
    qCasterConcentrating,
    recordSpellCreatedHeldObjectState(
      qMagicActionAvailable,
      qBonusActionAvailable,
      false,
      false,
      false,
      true,
      false,
      false,
      qSpellSlotExpended,
      qSpellSlotCommittedThisTurn,
      false,
      false,
      qTargetHp,
      "concentrationCleaned",
    ),
  }

  action doExpireDuration = all {
    qHeldObjectEffectActive,
    qCasterConcentrating,
    recordSpellCreatedHeldObjectState(
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      qSpellSlotExpended,
      false,
      false,
      false,
      qTargetHp,
      "durationCleaned",
    ),
  }

  action doStutter = recordSpellCreatedHeldObjectState(
    qMagicActionAvailable,
    qBonusActionAvailable,
    qInitialCastAvailable,
    qHeldObjectEffectActive,
    qHeldObjectHeld,
    qFreeHandAvailable,
    qCasterConcentrating,
    qLightProjected,
    qSpellSlotExpended,
    qSpellSlotCommittedThisTurn,
    qAttackAvailable,
    qReEvokeAvailable,
    qTargetHp,
    qLastResult,
  )

  action step = any {
    doCastHeldObject,
    doAttackHeldObject,
    doReleaseHeldObject,
    doAdvanceToCasterTurn,
    doReEvokeHeldObject,
    doBreakConcentration,
    doExpireDuration,
    doStutter,
  }
}
