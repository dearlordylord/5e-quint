// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.HP_REST_HIT_DICE.TRANSITIONS

module characterSheetHpRestHitDiceMbt {
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"

  type CharacterSheetHpRestHitDiceOutcome =
    | CharacterSheetHpRestHitDiceInit
    | CharacterSheetHpRestHitDiceLongRestStartZeroHpRejected
    | CharacterSheetHpRestHitDiceLongRestSixteenHourWaitRejected
    | CharacterSheetHpRestHitDiceShortRestSpendHitPointDie
    | CharacterSheetHpRestHitDiceShortRestInterruptedNoBenefit
    | CharacterSheetHpRestHitDiceLongRestRestoresHpHitPointDiceAndMaximum
    | CharacterSheetHpRestHitDiceLongRestInterruptedBeforeOneHourNoBenefit
    | CharacterSheetHpRestHitDiceLongRestInterruptedWithShortRestBenefits
    | CharacterSheetHpRestHitDiceShortRestStartZeroHpRejected
    | CharacterSheetHpRestHitDiceShortRestDurationTooShortRejected
    | CharacterSheetHpRestHitDiceLongRestDurationTooShortRejected
    | CharacterSheetHpRestHitDiceLongRestPhysicalExertionTooShortRejected
    | CharacterSheetHpRestHitDiceShortRestSpendHitPointDiceSequentially
    | CharacterSheetHpRestHitDiceLongRestInterruptionAtRequiredDurationRejected

  type CharacterSheetHpRestHitDiceState = {
    outcome: CharacterSheetHpRestHitDiceOutcome,
    accepted: bool,
    message: str,
    currentHp: int,
    hitPointMaximum: int,
    hitPointMaximumReduction: int,
    temporaryHitPoints: int,
    spentHitDice: int,
    requiredLongRestTicks: int,
    remainingWaitTicks: int,
    replayIndex: int,
  }

  var qState: CharacterSheetHpRestHitDiceState

  type SheetHpState = {
    currentHp: int,
    normalHitPointMaximum: int,
    hitPointMaximumReduction: int,
    temporaryHitPoints: int,
    spentHitDice: int,
  }

  pure def shortRestTicks: int = 600
  pure def longRestBaseTicks: int = 8 * shortRestTicks
  pure def longRestWaitTicks: int = 16 * shortRestTicks

  pure def effectiveHitPointMaximum(sheet: SheetHpState): int =
    sheet.normalHitPointMaximum - sheet.hitPointMaximumReduction

  pure def healSheetHitPoints(sheet: SheetHpState, rawHealing: int): SheetHpState = {
    val healed = applyHitPointHealing({
      kind: PlayerCharacter,
      hitPoints: sheet.currentHp,
      hitPointMaximum: effectiveHitPointMaximum(sheet),
      temporaryHitPoints: sheet.temporaryHitPoints,
      dead: false,
      unconscious: false,
    }, resetDeathSavingThrowLifecycle, NoPositiveHitPointUnconsciousRecovery, rawHealing)
    {
      currentHp: healed.vitals.hitPoints,
      normalHitPointMaximum: sheet.normalHitPointMaximum,
      hitPointMaximumReduction: sheet.hitPointMaximumReduction,
      temporaryHitPoints: healed.vitals.temporaryHitPoints,
      spentHitDice: sheet.spentHitDice,
    }
  }

  pure def spendHitPointDie(sheet: SheetHpState, dieRoll: int, constitutionModifier: int): SheetHpState = {
    val healing = if (dieRoll + constitutionModifier < 1) 1 else dieRoll + constitutionModifier
    val healed = healSheetHitPoints(sheet, healing)
    healed.with("spentHitDice", healed.spentHitDice + 1)
  }

  pure def completeLongRestBenefits(sheet: SheetHpState): SheetHpState = {
    currentHp: sheet.normalHitPointMaximum,
    normalHitPointMaximum: sheet.normalHitPointMaximum,
    hitPointMaximumReduction: 0,
    temporaryHitPoints: 0,
    spentHitDice: 0,
  }

  action recordProjection(
    outcome: CharacterSheetHpRestHitDiceOutcome,
    accepted: bool,
    message: str,
    sheet: SheetHpState,
    requiredLongRestTicks: int,
    remainingWaitTicks: int,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      accepted: accepted,
      message: message,
      currentHp: sheet.currentHp,
      hitPointMaximum: effectiveHitPointMaximum(sheet),
      hitPointMaximumReduction: sheet.hitPointMaximumReduction,
      temporaryHitPoints: sheet.temporaryHitPoints,
      spentHitDice: sheet.spentHitDice,
      requiredLongRestTicks: requiredLongRestTicks,
      remainingWaitTicks: remainingWaitTicks,
      replayIndex: replayIndex,
    },
  }

  pure def woundedWizard: SheetHpState = {
    currentHp: 7,
    normalHitPointMaximum: 18,
    hitPointMaximumReduction: 0,
    temporaryHitPoints: 0,
    spentHitDice: 0,
  }

  action init =
    recordProjection(
      CharacterSheetHpRestHitDiceInit,
      false,
      "none",
      {
      currentHp: 0,
      normalHitPointMaximum: 1,
      hitPointMaximumReduction: 0,
      temporaryHitPoints: 0,
      spentHitDice: 0,
    },
      0,
      0,
      0,
    )

  action doRejectLongRestStartAtZeroHp = all {
    qState.replayIndex == 0,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestStartZeroHpRejected,
      false,
      "Long Rest requires the Character Sheet to have at least 1 HP.",
      {
        currentHp: 0,
        normalHitPointMaximum: 12,
        hitPointMaximumReduction: 0,
        temporaryHitPoints: 0,
        spentHitDice: 0,
      },
      0,
      0,
      1,
    ),
  }

  action doRejectLongRestBeforeSixteenHourWait = all {
    qState.replayIndex == 1,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestSixteenHourWaitRejected,
      false,
      "Long Rest requires waiting 16 hours after finishing the previous Long Rest.",
      {
        currentHp: 12,
        normalHitPointMaximum: 12,
        hitPointMaximumReduction: 0,
        temporaryHitPoints: 0,
        spentHitDice: 0,
      },
      0,
      longRestWaitTicks - (longRestWaitTicks - 1),
      2,
    ),
  }

  action doSpendShortRestHitPointDie = all {
    qState.replayIndex == 2,
    recordProjection(
      CharacterSheetHpRestHitDiceShortRestSpendHitPointDie,
      true,
      "none",
      spendHitPointDie(woundedWizard, 4, 1),
      0,
      0,
      3,
    ),
  }

  action doInterruptShortRestNoBenefit = all {
    qState.replayIndex == 3,
    recordProjection(
      CharacterSheetHpRestHitDiceShortRestInterruptedNoBenefit,
      true,
      "none",
      woundedWizard,
      0,
      0,
      4,
    ),
  }

  action doCompleteLongRestRestoresHpHitPointDiceAndMaximum = all {
    qState.replayIndex == 4,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestRestoresHpHitPointDiceAndMaximum,
      true,
      "none",
      completeLongRestBenefits({
        currentHp: 7,
        normalHitPointMaximum: 18,
        hitPointMaximumReduction: 6,
        temporaryHitPoints: 2,
        spentHitDice: 1,
      }),
      0,
      0,
      5,
    ),
  }

  action doInterruptLongRestBeforeOneHourNoBenefit = all {
    qState.replayIndex == 5,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestInterruptedBeforeOneHourNoBenefit,
      true,
      "none",
      woundedWizard,
      longRestBaseTicks + shortRestTicks,
      0,
      6,
    ),
  }

  action doInterruptLongRestWithShortRestBenefits = all {
    qState.replayIndex == 6,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestInterruptedWithShortRestBenefits,
      true,
      "none",
      spendHitPointDie(woundedWizard, 4, 1),
      longRestBaseTicks + shortRestTicks,
      0,
      7,
    ),
  }

  action doRejectShortRestStartAtZeroHp = all {
    qState.replayIndex == 7,
    recordProjection(
      CharacterSheetHpRestHitDiceShortRestStartZeroHpRejected,
      false,
      "Short Rest requires the Character Sheet to have at least 1 HP.",
      {
        currentHp: 0,
        normalHitPointMaximum: 12,
        hitPointMaximumReduction: 0,
        temporaryHitPoints: 0,
        spentHitDice: 0,
      },
      0,
      0,
      8,
    ),
  }

  action doRejectShortRestDurationTooShort = all {
    qState.replayIndex == 8,
    recordProjection(
      CharacterSheetHpRestHitDiceShortRestDurationTooShortRejected,
      false,
      "Short Rest requires 1 hour before benefits can be received.",
      woundedWizard,
      0,
      0,
      9,
    ),
  }

  action doRejectLongRestDurationTooShort = all {
    qState.replayIndex == 9,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestDurationTooShortRejected,
      false,
      "Long Rest requires the full required duration before benefits can be received.",
      woundedWizard,
      longRestBaseTicks,
      0,
      10,
    ),
  }

  action doRejectLongRestPhysicalExertionTooShort = all {
    qState.replayIndex == 10,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestPhysicalExertionTooShortRejected,
      false,
      "Long Rest physical exertion interruption requires at least 1 hour.",
      woundedWizard,
      0,
      0,
      11,
    ),
  }

  action doSpendShortRestHitPointDiceSequentially = all {
    qState.replayIndex == 11,
    recordProjection(
      CharacterSheetHpRestHitDiceShortRestSpendHitPointDiceSequentially,
      true,
      "none",
      spendHitPointDie(spendHitPointDie(woundedWizard, 4, 1), 3, 1),
      0,
      0,
      12,
    ),
  }

  action doRejectLongRestInterruptionAtRequiredDuration = all {
    qState.replayIndex == 12,
    recordProjection(
      CharacterSheetHpRestHitDiceLongRestInterruptionAtRequiredDurationRejected,
      false,
      "Long Rest interruption requires rested time before the required Long Rest duration.",
      woundedWizard,
      longRestBaseTicks,
      0,
      13,
    ),
  }

  action step = any {
    doRejectLongRestStartAtZeroHp,
    doRejectLongRestBeforeSixteenHourWait,
    doSpendShortRestHitPointDie,
    doInterruptShortRestNoBenefit,
    doCompleteLongRestRestoresHpHitPointDiceAndMaximum,
    doInterruptLongRestBeforeOneHourNoBenefit,
    doInterruptLongRestWithShortRestBenefits,
    doRejectShortRestStartAtZeroHp,
    doRejectShortRestDurationTooShort,
    doRejectLongRestDurationTooShort,
    doRejectLongRestPhysicalExertionTooShort,
    doSpendShortRestHitPointDiceSequentially,
    doRejectLongRestInterruptionAtRequiredDuration,
  }
}
