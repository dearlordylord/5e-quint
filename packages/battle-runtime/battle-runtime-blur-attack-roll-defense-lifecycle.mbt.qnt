// -*- mode: Bluespec; -*-

module battleRuntimeBlurAttackRollDefenseLifecycleMbt {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeBlurAttackRollDefense.* from "./battle-runtime-blur-attack-roll-defense"

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Blur:
  //   Blur is a level 2 Action spell with range Self and Concentration up to
  //   1 minute. For the duration, creatures have Disadvantage on attack rolls
  //   against the caster unless the attacker perceives the caster with
  //   Blindsight or Truesight.
  // - .references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage:
  //   Advantage and Disadvantage cancel to a normal d20 roll.
  // - UBIQUITOUS_LANGUAGE.md: Attack Roll, Advantage and Disadvantage,
  //   Concentration, Blindsight, and Truesight.
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qSpellSlotExpended: int
  var qSlotSpellCastThisTurn: bool
  var qBlurredEffectActive: bool
  var qCasterConcentrating: bool
  var qAttackerPerceivesWithBlindsight: bool
  var qAttackerPerceivesWithTruesight: bool
  var qOtherAttackAdvantage: bool
  var qAttackRollMode: str
  var qLastResult: str

  pure val normalAttackRoll: str = "normal"
  pure val advantageAttackRoll: str = "advantage"
  pure val disadvantageAttackRoll: str = "disadvantage"

  pure def blurAttackRollDefenseWitnessCaster(
    blurredEffectActive: bool,
    casterConcentrating: bool,
  ): Combatant = {
    ...initialState.fighter,
    activeEffects: if (blurredEffectActive) Set(blurAttackRollDefenseEffect) else Set(),
    concentrating: casterConcentrating,
  }

  pure def projectedAttackRollMode(
    blurredEffectActive: bool,
    attackerPerceivesWithBlindsight: bool,
    attackerPerceivesWithTruesight: bool,
    otherAttackAdvantage: bool,
  ): str = {
    val blurredTargetEffects =
      if (blurredEffectActive) Set(blurAttackRollDefenseEffect) else Set()
    val otherAdvantageTargetEffects =
      if (otherAttackAdvantage) Set(GuidingBoltNextAttackAdvantage) else Set()
    match blurAttackRollDefenseAttackRollMode(
      Set(),
      blurredTargetEffects.union(otherAdvantageTargetEffects),
      true,
      attackerPerceivesWithBlindsight or attackerPerceivesWithTruesight,
    ) {
      | NormalSpellAttackRoll => normalAttackRoll
      | AdvantageSpellAttackRoll => advantageAttackRoll
      | DisadvantageSpellAttackRoll => disadvantageAttackRoll
    }
  }

  action recordBlurState(
    actionAvailable: bool,
    spellAvailable: bool,
    spellSlotExpended: int,
    slotSpellCastThisTurn: bool,
    blurredEffectActive: bool,
    casterConcentrating: bool,
    attackerPerceivesWithBlindsight: bool,
    attackerPerceivesWithTruesight: bool,
    otherAttackAdvantage: bool,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qSpellSlotExpended' = spellSlotExpended,
    qSlotSpellCastThisTurn' = slotSpellCastThisTurn,
    qBlurredEffectActive' = blurredEffectActive,
    qCasterConcentrating' = casterConcentrating,
    qAttackerPerceivesWithBlindsight' = attackerPerceivesWithBlindsight,
    qAttackerPerceivesWithTruesight' = attackerPerceivesWithTruesight,
    qOtherAttackAdvantage' = otherAttackAdvantage,
    qAttackRollMode' = projectedAttackRollMode(
      blurredEffectActive,
      attackerPerceivesWithBlindsight,
      attackerPerceivesWithTruesight,
      otherAttackAdvantage,
    ),
    qLastResult' = lastResult,
  }

  action init = recordBlurState(
    true,
    true,
    0,
    false,
    false,
    false,
    false,
    false,
    false,
    "init",
  )

  action doCastBlur = all {
    qActionAvailable,
    qSpellAvailable,
    val casterAfterBlurCast = combatantWithBlurAttackRollDefenseApplied(
      blurAttackRollDefenseWitnessCaster(qBlurredEffectActive, qCasterConcentrating)
    )
    recordBlurState(
      false,
      false,
      1,
      true,
      activeEffectsContainBlurAttackRollDefense(casterAfterBlurCast.activeEffects),
      casterAfterBlurCast.concentrating,
      qAttackerPerceivesWithBlindsight,
      qAttackerPerceivesWithTruesight,
      qOtherAttackAdvantage,
      "blurCast",
    ),
  }

  action doSetBlindsightBypass = recordBlurState(
    qActionAvailable,
    qSpellAvailable,
    qSpellSlotExpended,
    qSlotSpellCastThisTurn,
    qBlurredEffectActive,
    qCasterConcentrating,
    true,
    false,
    qOtherAttackAdvantage,
    "blindsightBypass",
  )

  action doSetTruesightBypass = recordBlurState(
    qActionAvailable,
    qSpellAvailable,
    qSpellSlotExpended,
    qSlotSpellCastThisTurn,
    qBlurredEffectActive,
    qCasterConcentrating,
    false,
    true,
    qOtherAttackAdvantage,
    "truesightBypass",
  )

  action doClearBypass = recordBlurState(
    qActionAvailable,
    qSpellAvailable,
    qSpellSlotExpended,
    qSlotSpellCastThisTurn,
    qBlurredEffectActive,
    qCasterConcentrating,
    false,
    false,
    qOtherAttackAdvantage,
    "noBypass",
  )

  action doSetOtherAttackAdvantage = recordBlurState(
    qActionAvailable,
    qSpellAvailable,
    qSpellSlotExpended,
    qSlotSpellCastThisTurn,
    qBlurredEffectActive,
    qCasterConcentrating,
    qAttackerPerceivesWithBlindsight,
    qAttackerPerceivesWithTruesight,
    true,
    "otherAdvantage",
  )

  action doClearOtherAttackAdvantage = recordBlurState(
    qActionAvailable,
    qSpellAvailable,
    qSpellSlotExpended,
    qSlotSpellCastThisTurn,
    qBlurredEffectActive,
    qCasterConcentrating,
    qAttackerPerceivesWithBlindsight,
    qAttackerPerceivesWithTruesight,
    false,
    "noOtherAdvantage",
  )

  action doBreakConcentration = all {
    qCasterConcentrating,
    val casterAfterConcentrationBreak = combatantWithBlurAttackRollDefenseConcentrationBroken(
      blurAttackRollDefenseWitnessCaster(qBlurredEffectActive, qCasterConcentrating)
    )
    recordBlurState(
      qActionAvailable,
      qSpellAvailable,
      qSpellSlotExpended,
      qSlotSpellCastThisTurn,
      activeEffectsContainBlurAttackRollDefense(casterAfterConcentrationBreak.activeEffects),
      casterAfterConcentrationBreak.concentrating,
      qAttackerPerceivesWithBlindsight,
      qAttackerPerceivesWithTruesight,
      qOtherAttackAdvantage,
      "concentrationBroken",
    ),
  }

  action doStutter = recordBlurState(
    qActionAvailable,
    qSpellAvailable,
    qSpellSlotExpended,
    qSlotSpellCastThisTurn,
    qBlurredEffectActive,
    qCasterConcentrating,
    qAttackerPerceivesWithBlindsight,
    qAttackerPerceivesWithTruesight,
    qOtherAttackAdvantage,
    qLastResult,
  )

  action step = any {
    doCastBlur,
    doSetBlindsightBypass,
    doSetTruesightBypass,
    doClearBypass,
    doSetOtherAttackAdvantage,
    doClearOtherAttackAdvantage,
    doBreakConcentration,
    doStutter,
  }
}
