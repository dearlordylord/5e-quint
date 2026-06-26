// -*- mode: Bluespec; -*-

// Executable route vocabulary for character-battle handoff route connector
// drivers. This module describes reducer shape, not authored catalog identity.
module characterBattleReducerRoute {
  type CharacterBattleRouteSubjectFamily =
    | SheetToBattleInitRouteSubject
    | BattleToSheetSettlementRouteSubject
    | HandoffResourceProjectionRouteSubject
    | HandoffFeatureResourceProjectionRouteSubject
    | HandoffSelectedReferenceRouteSubject
    | HandoffBattleMutationRouteSubject

  type CharacterBattleRouteHoleFamily =
    | HandoffIdentityMatchHoleFamily
    | HandoffHitPointProjectionHoleFamily
    | HandoffSpellResourceProjectionHoleFamily
    | HandoffFeatureResourceProjectionHoleFamily
    | HandoffSettlementConflictHoleFamily

  type CharacterBattleRouteFillFamily =
    | HandoffSheetProjectionFill
    | HandoffBattleDeltaFill
    | HandoffResourceDeltaFill
    | HandoffSettlementRejectionFill

  type CharacterBattleRouteOwnerGroup =
    | CharacterBattleSheetOwner
    | CharacterBattleBuildProjectionOwner
    | CharacterBattleInitProjectionOwner
    | CharacterBattleRuntimeOwner
    | CharacterBattleSettlementOwner
    | CharacterBattleResourceProjectionOwner

  type CharacterBattleRouteEvent =
    | RouteProjectCharacterSheetToBattle({
        subject: CharacterBattleRouteSubjectFamily,
        owner: CharacterBattleRouteOwnerGroup,
      })
    | RouteEnterBattleRuntime({
        subject: CharacterBattleRouteSubjectFamily,
        owner: CharacterBattleRouteOwnerGroup,
      })
    | RouteSettleBattleToCharacterSheet({
        subject: CharacterBattleRouteSubjectFamily,
        fill: CharacterBattleRouteFillFamily,
        holes: Set[CharacterBattleRouteHoleFamily],
        owner: CharacterBattleRouteOwnerGroup,
      })
    | RouteRejectCharacterBattleHandoff({
        subject: CharacterBattleRouteSubjectFamily,
        fill: CharacterBattleRouteFillFamily,
        holes: Set[CharacterBattleRouteHoleFamily],
        owner: CharacterBattleRouteOwnerGroup,
      })

  pure def routeProjectCharacterSheetToBattle(
    subject: CharacterBattleRouteSubjectFamily,
    owner: CharacterBattleRouteOwnerGroup,
  ): CharacterBattleRouteEvent =
    RouteProjectCharacterSheetToBattle({
      subject: subject,
      owner: owner,
    })

  pure def routeEnterBattleRuntime(
    subject: CharacterBattleRouteSubjectFamily,
    owner: CharacterBattleRouteOwnerGroup,
  ): CharacterBattleRouteEvent =
    RouteEnterBattleRuntime({
      subject: subject,
      owner: owner,
    })

  pure def routeSettleBattleToCharacterSheet(
    subject: CharacterBattleRouteSubjectFamily,
    fill: CharacterBattleRouteFillFamily,
    holes: Set[CharacterBattleRouteHoleFamily],
    owner: CharacterBattleRouteOwnerGroup,
  ): CharacterBattleRouteEvent =
    RouteSettleBattleToCharacterSheet({
      subject: subject,
      fill: fill,
      holes: holes,
      owner: owner,
    })

  pure def routeRejectCharacterBattleHandoff(
    subject: CharacterBattleRouteSubjectFamily,
    fill: CharacterBattleRouteFillFamily,
    holes: Set[CharacterBattleRouteHoleFamily],
    owner: CharacterBattleRouteOwnerGroup,
  ): CharacterBattleRouteEvent =
    RouteRejectCharacterBattleHandoff({
      subject: subject,
      fill: fill,
      holes: holes,
      owner: owner,
    })
}
