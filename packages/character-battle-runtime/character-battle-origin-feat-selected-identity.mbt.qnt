// -*- mode: Bluespec; -*-

module characterBattleOriginFeatSelectedIdentityMbt {
  var qLastResult: str
  var qOriginFeatUnitId: str
  var qBackgroundUnitId: str
  var qInitiativeScore: int

  action recordProjection(
    lastResult: str,
    originFeatUnitId: str,
    backgroundUnitId: str,
    initiativeScore: int,
  ): bool = all {
    qLastResult' = lastResult,
    qOriginFeatUnitId' = originFeatUnitId,
    qBackgroundUnitId' = backgroundUnitId,
    qInitiativeScore' = initiativeScore,
  }

  action init =
    recordProjection("init", "none", "none", 0)

  action doFinalizeCriminalAlertOriginFeat = all {
    qLastResult == "init",
    recordProjection("criminal-alert-origin-feat", "alert", "background_criminal", 0),
  }

  action doProjectAlertInitiativeHandoff = all {
    qLastResult == "criminal-alert-origin-feat",
    recordProjection("alert-initiative-handoff", "alert", "background_criminal", 16),
  }

  action step = any {
    doFinalizeCriminalAlertOriginFeat,
    doProjectAlertInitiativeHandoff,
  }
}
