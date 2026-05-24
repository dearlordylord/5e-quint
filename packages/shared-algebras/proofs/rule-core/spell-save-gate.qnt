// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES

module spellSaveGate {
  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Saving Throws.
  // - Playing-the-Game.md: Saving Throws and Damage / Half Damage.
  // - Rules-Glossary.md: Saving Throw Effect Notation.

  type SpellSaveGateBranch =
    | SpellSavingThrowSucceeded
    | SpellSavingThrowFailed

  type SpellSaveGateDamageOnSuccess =
    | SpellSaveGateNoDamageOnSuccess
    | SpellSaveGateHalfDamageOnSuccess

  type SpellSaveGateDamageResult =
    | SpellSaveGateFullDamage
    | SpellSaveGateHalfDamage
    | SpellSaveGateNoDamage

  pure def spellSaveGateBranch(savingThrowSucceeded: bool): SpellSaveGateBranch =
    if (savingThrowSucceeded) SpellSavingThrowSucceeded else SpellSavingThrowFailed

  pure def spellSaveGateFailedEffectsApply(branch: SpellSaveGateBranch): bool =
    branch == SpellSavingThrowFailed

  pure def spellSaveGateSuccessEffectsApply(branch: SpellSaveGateBranch): bool =
    branch == SpellSavingThrowSucceeded

  pure def spellSaveGateDamageResult(
    branch: SpellSaveGateBranch,
    damageOnSuccess: SpellSaveGateDamageOnSuccess
  ): SpellSaveGateDamageResult =
    match branch {
      | SpellSavingThrowFailed => SpellSaveGateFullDamage
      | SpellSavingThrowSucceeded =>
        match damageOnSuccess {
          | SpellSaveGateNoDamageOnSuccess => SpellSaveGateNoDamage
          | SpellSaveGateHalfDamageOnSuccess => SpellSaveGateHalfDamage
        }
    }

  pure def spellSaveGateDamageAmount(rawDamage: int, result: SpellSaveGateDamageResult): int =
    if (rawDamage <= 0) 0
    else match result {
      | SpellSaveGateFullDamage => rawDamage
      | SpellSaveGateHalfDamage => rawDamage / 2
      | SpellSaveGateNoDamage => 0
    }
}
