// -*- mode: Bluespec; -*-

module battleRuntimeDragonsBreathInitialEffectMbt {
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
  var qTurnRole: str
  var qBonusActionAvailable: bool
  var qSpellInvocationAvailable: bool
  var qTargetEffectActive: bool
  var qEffectDamageType: str
  var qEffectOriginalSlotLevel: int
  var qEffectSpellSaveDc: int
  var qEffectDurationTicks: int
  var qCasterConcentrating: bool
  var qGrantedMagicActionAvailable: bool
  var qLastResult: str

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
    lastResult: str,
  ): bool = all {
    qTurnRole' = turnRole,
    qBonusActionAvailable' = bonusActionAvailable,
    qSpellInvocationAvailable' = spellInvocationAvailable,
    qTargetEffectActive' = targetEffectActive,
    qEffectDamageType' = effectDamageType,
    qEffectOriginalSlotLevel' = effectOriginalSlotLevel,
    qEffectSpellSaveDc' = effectSpellSaveDc,
    qEffectDurationTicks' = effectDurationTicks,
    qCasterConcentrating' = casterConcentrating,
    qGrantedMagicActionAvailable' = grantedMagicActionAvailable,
    qLastResult' = lastResult,
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
      "init",
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
        "cast",
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
      "targetTurn",
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
      "concentrationBroken",
    ),
  }

  action step = any {
    doCastDragonsBreath,
    doEndCasterTurn,
    doBreakConcentration,
  }
}
