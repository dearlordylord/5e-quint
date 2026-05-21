// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.HP_REST_HIT_DICE.TRANSITIONS

module characterSheetHpRestHitDiceMbt {
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"

  var qLastResult: str
  var qAccepted: bool
  var qMessage: str
  var qCurrentHp: int
  var qHitPointMaximum: int
  var qHitPointMaximumReduction: int
  var qTemporaryHitPoints: int
  var qSpentHitDice: int
  var qRequiredLongRestTicks: int
  var qRemainingWaitTicks: int
  var qReplayIndex: int

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
    lastResult: str,
    accepted: bool,
    message: str,
    sheet: SheetHpState,
    requiredLongRestTicks: int,
    remainingWaitTicks: int,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qAccepted' = accepted,
    qMessage' = message,
    qCurrentHp' = sheet.currentHp,
    qHitPointMaximum' = effectiveHitPointMaximum(sheet),
    qHitPointMaximumReduction' = sheet.hitPointMaximumReduction,
    qTemporaryHitPoints' = sheet.temporaryHitPoints,
    qSpentHitDice' = sheet.spentHitDice,
    qRequiredLongRestTicks' = requiredLongRestTicks,
    qRemainingWaitTicks' = remainingWaitTicks,
    qReplayIndex' = replayIndex,
  }

  pure def woundedWizard: SheetHpState = {
    currentHp: 7,
    normalHitPointMaximum: 18,
    hitPointMaximumReduction: 0,
    temporaryHitPoints: 0,
    spentHitDice: 0,
  }

  action init =
    recordProjection("init", false, "none", {
      currentHp: 0,
      normalHitPointMaximum: 1,
      hitPointMaximumReduction: 0,
      temporaryHitPoints: 0,
      spentHitDice: 0,
    }, 0, 0, 0)

  action doRejectLongRestStartAtZeroHp = all {
    qReplayIndex == 0,
    recordProjection(
      "long-rest-start-zero-hp-rejected",
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
    qReplayIndex == 1,
    recordProjection(
      "long-rest-sixteen-hour-wait-rejected",
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
    qReplayIndex == 2,
    recordProjection(
      "short-rest-spend-hit-point-die",
      true,
      "none",
      spendHitPointDie(woundedWizard, 4, 1),
      0,
      0,
      3,
    ),
  }

  action doInterruptShortRestNoBenefit = all {
    qReplayIndex == 3,
    recordProjection(
      "short-rest-interrupted-no-benefit",
      true,
      "none",
      woundedWizard,
      0,
      0,
      4,
    ),
  }

  action doCompleteLongRestRestoresHpHitPointDiceAndMaximum = all {
    qReplayIndex == 4,
    recordProjection(
      "long-rest-restores-hp-hit-point-dice-and-maximum",
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
    qReplayIndex == 5,
    recordProjection(
      "long-rest-interrupted-before-one-hour-no-benefit",
      true,
      "none",
      woundedWizard,
      longRestBaseTicks + shortRestTicks,
      0,
      6,
    ),
  }

  action doInterruptLongRestWithShortRestBenefits = all {
    qReplayIndex == 6,
    recordProjection(
      "long-rest-interrupted-with-short-rest-benefits",
      true,
      "none",
      spendHitPointDie(woundedWizard, 4, 1),
      longRestBaseTicks + shortRestTicks,
      0,
      7,
    ),
  }

  action doRejectShortRestStartAtZeroHp = all {
    qReplayIndex == 7,
    recordProjection(
      "short-rest-start-zero-hp-rejected",
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
    qReplayIndex == 8,
    recordProjection(
      "short-rest-duration-too-short-rejected",
      false,
      "Short Rest requires 1 hour before benefits can be received.",
      woundedWizard,
      0,
      0,
      9,
    ),
  }

  action doRejectLongRestDurationTooShort = all {
    qReplayIndex == 9,
    recordProjection(
      "long-rest-duration-too-short-rejected",
      false,
      "Long Rest requires the full required duration before benefits can be received.",
      woundedWizard,
      longRestBaseTicks,
      0,
      10,
    ),
  }

  action doRejectLongRestPhysicalExertionTooShort = all {
    qReplayIndex == 10,
    recordProjection(
      "long-rest-physical-exertion-too-short-rejected",
      false,
      "Long Rest physical exertion interruption requires at least 1 hour.",
      woundedWizard,
      0,
      0,
      11,
    ),
  }

  action doSpendShortRestHitPointDiceSequentially = all {
    qReplayIndex == 11,
    recordProjection(
      "short-rest-spend-hit-point-dice-sequentially",
      true,
      "none",
      spendHitPointDie(spendHitPointDie(woundedWizard, 4, 1), 3, 1),
      0,
      0,
      12,
    ),
  }

  action doRejectLongRestInterruptionAtRequiredDuration = all {
    qReplayIndex == 12,
    recordProjection(
      "long-rest-interruption-at-required-duration-rejected",
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
