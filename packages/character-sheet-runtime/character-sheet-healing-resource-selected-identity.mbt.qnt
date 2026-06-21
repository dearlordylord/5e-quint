// -*- mode: Bluespec; -*-

module characterSheetHealingResourceSelectedIdentityMbt {
  type CharacterSheetHealingResourceSelectedIdentityOutcome =
    | CharacterSheetHealingResourceSelectedIdentityInit
    | CharacterSheetHealingResourceSelectedIdentityResolved

  type CharacterSheetHealingResourceSelectedIdentityState = {
    sourceHp: int,
    targetHp: int,
    targetPoisoned: bool,
    poolExpended: int,
    poolRemaining: int,
    outcome: CharacterSheetHealingResourceSelectedIdentityOutcome,
  }

  var qState: CharacterSheetHealingResourceSelectedIdentityState

  action recordProjection(
    sourceHp: int,
    targetHp: int,
    targetPoisoned: bool,
    poolExpended: int,
    poolRemaining: int,
    outcome: CharacterSheetHealingResourceSelectedIdentityOutcome,
  ): bool = all {
    qState' = {
      sourceHp: sourceHp,
      targetHp: targetHp,
      targetPoisoned: targetPoisoned,
      poolExpended: poolExpended,
      poolRemaining: poolRemaining,
      outcome: outcome,
    },
  }

  action init = recordProjection(
      12,
      3,
      true,
      0,
      10,
      CharacterSheetHealingResourceSelectedIdentityInit,
    )

  action doLayOnHandsRestoreHpAndRemovePoisoned = all {
    qState.outcome == CharacterSheetHealingResourceSelectedIdentityInit,
    recordProjection(
      12,
      5,
      false,
      7,
      3,
      CharacterSheetHealingResourceSelectedIdentityResolved,
    ),
  }

  action step = any {
    doLayOnHandsRestoreHpAndRemovePoisoned,
  }
}
