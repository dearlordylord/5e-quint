// -*- mode: Bluespec; -*-

// Rule-core component route vocabulary shared by component-first MBT drivers.
//
// LEAF MODULE -- intentionally has no imports. Component connectors use this
// projection to prove a target replay crosses a reusable rule-core component
// boundary before a battle reducer route consumes the rule.
module ruleCoreComponentRoute {
  type RuleCoreComponentOwner =
    | RuleCoreAbilitySkillCommandOwner
    | RuleCoreAttackDamageDispositionOwner
    | RuleCoreFeatureProfileSemanticsOwner
    | RuleCoreHitPointDamageOwner
    | RuleCoreMovementGrappleOwner
    | RuleCoreReactionContinuationConcentrationOwner
    | RuleCoreShoveOutcomeOwner
    | RuleCoreSpellProcedureProfileOwner
    | RuleCoreStatBlockControlOwner

  type RuleCoreComponentRouteEvent =
    | RuleCoreComponentParseInput({ owner: RuleCoreComponentOwner })
    | RuleCoreComponentAdmitInput({ owner: RuleCoreComponentOwner })
    | RuleCoreComponentCall({ owner: RuleCoreComponentOwner })
    | RuleCoreComponentProjectResult({ owner: RuleCoreComponentOwner })

  pure def ruleCoreComponentParseInput(
    owner: RuleCoreComponentOwner,
  ): RuleCoreComponentRouteEvent =
    RuleCoreComponentParseInput({ owner: owner })

  pure def ruleCoreComponentAdmitInput(
    owner: RuleCoreComponentOwner,
  ): RuleCoreComponentRouteEvent =
    RuleCoreComponentAdmitInput({ owner: owner })

  pure def ruleCoreComponentCall(
    owner: RuleCoreComponentOwner,
  ): RuleCoreComponentRouteEvent =
    RuleCoreComponentCall({ owner: owner })

  pure def ruleCoreComponentProjectResult(
    owner: RuleCoreComponentOwner,
  ): RuleCoreComponentRouteEvent =
    RuleCoreComponentProjectResult({ owner: owner })

  pure def ruleCoreComponentRoute(
    owner: RuleCoreComponentOwner,
  ): List[RuleCoreComponentRouteEvent] =
    List(
      ruleCoreComponentParseInput(owner),
      ruleCoreComponentAdmitInput(owner),
      ruleCoreComponentCall(owner),
      ruleCoreComponentProjectResult(owner),
    )
}
