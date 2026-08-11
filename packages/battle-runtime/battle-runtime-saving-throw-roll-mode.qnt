// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE

module battleRuntimeSavingThrowRollMode {
  type SavingThrowRollMode = NormalSavingThrow | AdvantageSavingThrow | DisadvantageSavingThrow

  pure def combineSavingThrowRollModes(
    baseMode: SavingThrowRollMode,
    addedMode: SavingThrowRollMode,
  ): SavingThrowRollMode =
    if (baseMode == NormalSavingThrow)
      addedMode
    else if (addedMode == NormalSavingThrow)
      baseMode
    else if (baseMode == addedMode)
      baseMode
    else
      NormalSavingThrow
}
