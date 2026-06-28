// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Character-Creation.md#Record Class Features:
//   class features can offer choices during character creation.
// - packages/character-creation-runtime/VOCABULARY.md: Unit-backed selection,
//   Source-shaped finalization checks, and Subclass Choice.
module characterCreationClassFeatureSelectedIdentityRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"
  import characterCreationRouteFixtures.* from "./character-creation-route-fixtures"

  type SelectedIdentityRouteState = {
    ready: bool,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: SelectedIdentityRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialSelectedIdentityRoute: List[CharacterCreationRouteEvent] =
    completedFighterCreationRoute

  pure def retainSelectedReferenceRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route
      .append(
        routeRetainCreationSelectedReferences(
          CreationSelectedReferenceRouteSubject,
          CreationSelectedReferenceOwner,
        )
      )
      .append(
        routeRecordCreationFacts(
          CreationSelectedReferenceRouteSubject,
          Set(CreationSelectedReferenceRetentionFact),
          CreationSelectedReferenceOwner,
        )
      )

  pure def projectSelectedReferenceRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route
      .append(
        routeRetainCreationSelectedReferences(
          CreationSelectedReferenceRouteSubject,
          CreationSelectedReferenceOwner,
        )
      )
      .append(
        routeProjectCharacterBuildFacts(
          CreationBuildProjectionRouteSubject,
          CharacterBuildOwner,
        )
      )
      .append(
        routeRecordCreationFacts(
          CreationBuildProjectionRouteSubject,
          Set(CreationBuildProjectionInputFact),
          CharacterBuildOwner,
        )
      )

  action recordRoute(route: List[CharacterCreationRouteEvent]): bool = all {
    qState' = {
      ready: false,
      qRoute: route,
    },
  }

  action init = all {
    qState' = {
      ready: true,
      qRoute: initialSelectedIdentityRoute,
    },
  }

  action doSelectBardExpertise = all {
    qState.ready,
    recordRoute(retainSelectedReferenceRoute(qRoute)),
  }

  action doProjectClericChannelDivinity = all {
    qState.ready,
    recordRoute(projectSelectedReferenceRoute(qRoute)),
  }

  action doProjectDruidWildShape = all {
    qState.ready,
    recordRoute(projectSelectedReferenceRoute(qRoute)),
  }

  action doProjectDruidWildCompanion = all {
    qState.ready,
    recordRoute(projectSelectedReferenceRoute(qRoute)),
  }

  action doProjectMonksFocus = all {
    qState.ready,
    recordRoute(projectSelectedReferenceRoute(qRoute)),
  }

  action doProjectMonkUncannyMetabolism = all {
    qState.ready,
    recordRoute(projectSelectedReferenceRoute(qRoute)),
  }

  action doSelectPaladinFightingStyle = all {
    qState.ready,
    recordRoute(retainSelectedReferenceRoute(qRoute)),
  }

  action doSelectRangerDeftExplorer = all {
    qState.ready,
    recordRoute(retainSelectedReferenceRoute(qRoute)),
  }

  action doSelectRangerFightingStyle = all {
    qState.ready,
    recordRoute(retainSelectedReferenceRoute(qRoute)),
  }

  action doProjectWarlockPactMagic = all {
    qState.ready,
    recordRoute(projectSelectedReferenceRoute(qRoute)),
  }

  action doSelectWizardScholar = all {
    qState.ready,
    recordRoute(retainSelectedReferenceRoute(qRoute)),
  }

  action doSelectWizardEvocationSavant = all {
    qState.ready,
    recordRoute(retainSelectedReferenceRoute(qRoute)),
  }

  action stepSelectBardExpertise = any {
    doSelectBardExpertise,
  }

  action stepProjectClericChannelDivinity = any {
    doProjectClericChannelDivinity,
  }

  action stepProjectDruidWildShape = any {
    doProjectDruidWildShape,
  }

  action stepProjectDruidWildCompanion = any {
    doProjectDruidWildCompanion,
  }

  action stepProjectMonksFocus = any {
    doProjectMonksFocus,
  }

  action stepProjectMonkUncannyMetabolism = any {
    doProjectMonkUncannyMetabolism,
  }

  action stepSelectPaladinFightingStyle = any {
    doSelectPaladinFightingStyle,
  }

  action stepSelectRangerDeftExplorer = any {
    doSelectRangerDeftExplorer,
  }

  action stepSelectRangerFightingStyle = any {
    doSelectRangerFightingStyle,
  }

  action stepProjectWarlockPactMagic = any {
    doProjectWarlockPactMagic,
  }

  action stepSelectWizardScholar = any {
    doSelectWizardScholar,
  }

  action stepSelectWizardEvocationSavant = any {
    doSelectWizardEvocationSavant,
  }

  action step = any {
    doSelectBardExpertise,
    doProjectClericChannelDivinity,
    doProjectDruidWildShape,
    doProjectDruidWildCompanion,
    doProjectMonksFocus,
    doProjectMonkUncannyMetabolism,
    doSelectPaladinFightingStyle,
    doSelectRangerDeftExplorer,
    doSelectRangerFightingStyle,
    doProjectWarlockPactMagic,
    doSelectWizardScholar,
    doSelectWizardEvocationSavant,
  }
}
