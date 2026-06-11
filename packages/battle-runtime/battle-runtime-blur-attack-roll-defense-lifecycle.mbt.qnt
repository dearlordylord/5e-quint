// -*- mode: Bluespec; -*-

module battleRuntimeBlurAttackRollDefenseLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | BlurAttackRollDefense

  type BlurAttackRollDefenseLifecycleScenarioOutcome = | Init | BlurCast | BlindsightBypass | TruesightBypass | NoBypass | OtherAdvantage | NoOtherAdvantage | ConcentrationBroken


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
  type WitnessState = {
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qSpellSlotExpended: int,
    qSlotSpellCastThisTurn: bool,
    qBlurredEffectActive: bool,
    qCasterConcentrating: bool,
    qAttackerPerceivesWithBlindsight: bool,
    qAttackerPerceivesWithTruesight: bool,
    qOtherAttackAdvantage: bool,
    qAttackRollMode: str,
    qScenarioOutcome: BlurAttackRollDefenseLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qSpellSlotExpended: int = qState.qSpellSlotExpended
  pure def qSlotSpellCastThisTurn: bool = qState.qSlotSpellCastThisTurn
  pure def qBlurredEffectActive: bool = qState.qBlurredEffectActive
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qAttackerPerceivesWithBlindsight: bool = qState.qAttackerPerceivesWithBlindsight
  pure def qAttackerPerceivesWithTruesight: bool = qState.qAttackerPerceivesWithTruesight
  pure def qOtherAttackAdvantage: bool = qState.qOtherAttackAdvantage
  pure def qAttackRollMode: str = qState.qAttackRollMode
  pure def qScenarioOutcome: BlurAttackRollDefenseLifecycleScenarioOutcome = qState.qScenarioOutcome

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
    scenarioOutcome: BlurAttackRollDefenseLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qSpellSlotExpended: spellSlotExpended,
      qSlotSpellCastThisTurn: slotSpellCastThisTurn,
      qBlurredEffectActive: blurredEffectActive,
      qCasterConcentrating: casterConcentrating,
      qAttackerPerceivesWithBlindsight: attackerPerceivesWithBlindsight,
      qAttackerPerceivesWithTruesight: attackerPerceivesWithTruesight,
      qOtherAttackAdvantage: otherAttackAdvantage,
      qAttackRollMode: projectedAttackRollMode(
      blurredEffectActive,
      attackerPerceivesWithBlindsight,
      attackerPerceivesWithTruesight,
      otherAttackAdvantage,
    ),
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
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
    Init,
    witnessInit(BlurAttackRollDefense),
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
      BlurCast,
    witnessResolved(BlurAttackRollDefense),
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
    BlindsightBypass,
    witnessResolved(BlurAttackRollDefense),
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
    TruesightBypass,
    witnessResolved(BlurAttackRollDefense),
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
    NoBypass,
    witnessResolved(BlurAttackRollDefense),
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
    OtherAdvantage,
    witnessResolved(BlurAttackRollDefense),
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
    NoOtherAdvantage,
    witnessResolved(BlurAttackRollDefense),
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
      ConcentrationBroken,
    witnessResolved(BlurAttackRollDefense),
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
    qScenarioOutcome,
    qState.protocol,)

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
