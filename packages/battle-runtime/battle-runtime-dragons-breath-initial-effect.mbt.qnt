// -*- mode: Bluespec; -*-

module battleRuntimeDragonsBreathInitialEffectMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DragonsBreathInitialEffect

  type DragonsBreathInitialEffectScenarioOutcome = | Init | Cast | TargetTurn | ConcentrationBroken


  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dragon's Breath:
  //   Bonus Action, Touch, Concentration up to 1 minute; one willing creature;
  //   Acid, Cold, Fire, Lightning, or Poison choice; target can take a Magic
  //   action to exhale the granted 15-foot Cone.
  // - .references/srd-5.2.1/Spells/Gaining-and-Casting.md:
  //   Spell Slots, Casting Time, Duration, and Using a Higher-Level Spell Slot.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Slot,
  //   Concentration, Spell Invocation, Spell Effect, Cast Level, Duration, and
  //   Area of Effect.
  type WitnessState = {
    qTurnRole: str,
    qBonusActionAvailable: bool,
    qSpellInvocationAvailable: bool,
    qTargetEffectActive: bool,
    qEffectDamageType: str,
    qEffectOriginalSlotLevel: int,
    qEffectSpellSaveDc: int,
    qEffectDurationTicks: int,
    qCasterConcentrating: bool,
    qGrantedMagicActionAvailable: bool,
    qScenarioOutcome: DragonsBreathInitialEffectScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTurnRole: str = qState.qTurnRole
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qSpellInvocationAvailable: bool = qState.qSpellInvocationAvailable
  pure def qTargetEffectActive: bool = qState.qTargetEffectActive
  pure def qEffectDamageType: str = qState.qEffectDamageType
  pure def qEffectOriginalSlotLevel: int = qState.qEffectOriginalSlotLevel
  pure def qEffectSpellSaveDc: int = qState.qEffectSpellSaveDc
  pure def qEffectDurationTicks: int = qState.qEffectDurationTicks
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qGrantedMagicActionAvailable: bool = qState.qGrantedMagicActionAvailable
  pure def qScenarioOutcome: DragonsBreathInitialEffectScenarioOutcome = qState.qScenarioOutcome

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noDamageType: str = "none"
  pure val dragonsBreathDurationTicks: int = 10
  pure val casterSpellSaveDc: int = 13
  pure val legalDamageTypes: Set[str] = Set("acid", "cold", "fire", "lightning", "poison")


  action recordDragonsBreathState(
    turnRole: str,
    bonusActionAvailable: bool,
    spellInvocationAvailable: bool,
    targetEffectActive: bool,
    effectDamageType: str,
    effectOriginalSlotLevel: int,
    effectSpellSaveDc: int,
    effectDurationTicks: int,
    casterConcentrating: bool,
    grantedMagicActionAvailable: bool,
    scenarioOutcome: DragonsBreathInitialEffectScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTurnRole: turnRole,
      qBonusActionAvailable: bonusActionAvailable,
      qSpellInvocationAvailable: spellInvocationAvailable,
      qTargetEffectActive: targetEffectActive,
      qEffectDamageType: effectDamageType,
      qEffectOriginalSlotLevel: effectOriginalSlotLevel,
      qEffectSpellSaveDc: effectSpellSaveDc,
      qEffectDurationTicks: effectDurationTicks,
      qCasterConcentrating: casterConcentrating,
      qGrantedMagicActionAvailable: grantedMagicActionAvailable,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = all {
    recordDragonsBreathState(
      casterTurnRole,
      true,
      true,
      false,
      noDamageType,
      0,
      0,
      0,
      false,
      false,
      Init,
    witnessInit(DragonsBreathInitialEffect),
  ),
  }

  action doCastDragonsBreath = {
    nondet damageType = legalDamageTypes.oneOf()
    nondet slotLevel = 2.to(3).oneOf()
    all {
      qTurnRole == casterTurnRole,
      qBonusActionAvailable,
      qSpellInvocationAvailable,
      not(qTargetEffectActive),
      not(qCasterConcentrating),
      recordDragonsBreathState(
        casterTurnRole,
        false,
        false,
        true,
        damageType,
        slotLevel,
        casterSpellSaveDc,
        dragonsBreathDurationTicks,
        true,
        false,
        Cast,
    witnessResolved(DragonsBreathInitialEffect),
  ),
    }
  }

  action doEndCasterTurn = all {
    qTurnRole == casterTurnRole,
    qTargetEffectActive,
    qCasterConcentrating,
    recordDragonsBreathState(
      targetTurnRole,
      true,
      false,
      true,
      qEffectDamageType,
      qEffectOriginalSlotLevel,
      qEffectSpellSaveDc,
      qEffectDurationTicks,
      true,
      true,
      TargetTurn,
    witnessResolved(DragonsBreathInitialEffect),
  ),
  }

  action doBreakConcentration = all {
    qTargetEffectActive,
    qCasterConcentrating,
    recordDragonsBreathState(
      qTurnRole,
      qBonusActionAvailable,
      false,
      false,
      noDamageType,
      0,
      0,
      0,
      false,
      false,
      ConcentrationBroken,
    witnessResolved(DragonsBreathInitialEffect),
  ),
  }

  action step = any {
    doCastDragonsBreath,
    doEndCasterTurn,
    doBreakConcentration,
  }
}
