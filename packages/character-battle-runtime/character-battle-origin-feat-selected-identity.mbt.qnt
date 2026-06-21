// -*- mode: Bluespec; -*-

module characterBattleOriginFeatSelectedIdentityMbt {
  type CharacterBattleOriginFeatSelectedIdentityOutcome =
    | CharacterBattleOriginFeatSelectedIdentityInit
    | CharacterBattleOriginFeatSelectedIdentityCriminalAlertOriginFeat
    | CharacterBattleOriginFeatSelectedIdentityAlertInitiativeHandoff

  type CharacterBattleOriginFeatSelectedIdentityState = {
    outcome: CharacterBattleOriginFeatSelectedIdentityOutcome,
    originFeatUnitId: str,
    backgroundUnitId: str,
    initiativeScore: int,
  }

  var qState: CharacterBattleOriginFeatSelectedIdentityState

  action recordProjection(
    outcome: CharacterBattleOriginFeatSelectedIdentityOutcome,
    originFeatUnitId: str,
    backgroundUnitId: str,
    initiativeScore: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      originFeatUnitId: originFeatUnitId,
      backgroundUnitId: backgroundUnitId,
      initiativeScore: initiativeScore,
    },
  }

  action init =
    recordProjection(CharacterBattleOriginFeatSelectedIdentityInit, "none", "none", 0)

  action doFinalizeCriminalAlertOriginFeat = all {
    qState.outcome == CharacterBattleOriginFeatSelectedIdentityInit,
    recordProjection(
      CharacterBattleOriginFeatSelectedIdentityCriminalAlertOriginFeat,
      "alert",
      "background_criminal",
      0,
    ),
  }

  action doProjectAlertInitiativeHandoff = all {
    qState.outcome == CharacterBattleOriginFeatSelectedIdentityCriminalAlertOriginFeat,
    recordProjection(
      CharacterBattleOriginFeatSelectedIdentityAlertInitiativeHandoff,
      "alert",
      "background_criminal",
      16,
    ),
  }

  action step = any {
    doFinalizeCriminalAlertOriginFeat,
    doProjectAlertInitiativeHandoff,
  }
}
