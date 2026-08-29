// -*- mode: Bluespec; -*-
module ruleCoreStatBlockSpellcastingProcedureMbt {
  import statBlockSpellcastingProcedure.* from "../shared-algebras/proofs/rule-core/stat-block-spellcasting-procedure"

  // This focused witness deliberately stops at the generic procedure
  // boundary. It retains every child outcome kind but does not choose a group
  // or invocation; those selections belong to their later capability owners.
  var qSection: StatBlockSpellcastingSection
  var qActionCost: StatBlockSpellcastingActionCost
  var qAtWillOutcomes: List[StatBlockSpellcastingInvocationOutcome]
  var qLimitedOutcomes: List[StatBlockSpellcastingInvocationOutcome]
  var qLimitedResourceOrdinals: List[int]
  var qAdmitted: bool

  pure def fixtureFacts(
    section: StatBlockSpellcastingSection
  ): StatBlockSpellcastingProcedureFacts = {
    section: section,
    ability: IntelligenceAbility,
    spellSaveDc: FixedSpellSaveDc({ value: 13 }),
    spellAttackBonus: FixedSpellAttackBonus({ value: 5 }),
    components: ListedComponents({
      value: {
        verbal: true,
        somatic: true,
        materialRequired: false,
      },
    }),
    groups: List(
      AtWillGroup({ invocations: List(Unrestricted, Restricted) }),
      LimitedGroup({
        resourceOrdinals: List(1),
        invocations: List(Unrestricted),
      }),
    ),
  }

  pure def admitted(admission: StatBlockSpellcastingAdmission): bool =
    match admission {
      | AdmittedStatBlockSpellcastingProcedure(_) => true
      | UnsupportedStatBlockSpellcastingProcedure(_) => false
    }

  action recordProjection(
    section: StatBlockSpellcastingSection
  ): bool = {
    val facts = fixtureFacts(section)
    val admission = admitStatBlockSpellcastingProcedure(facts)
    val outcomes = statBlockSpellcastingProcedureInvocationOutcomes(facts)
    all {
      qSection' = section,
      qActionCost' = match admission {
        | AdmittedStatBlockSpellcastingProcedure(data) =>
            admittedStatBlockSpellcastingActionCost(data.facts)
        | UnsupportedStatBlockSpellcastingProcedure(_) => qActionCost
      },
      qAtWillOutcomes' = outcomes[0],
      qLimitedOutcomes' = outcomes[1],
      qLimitedResourceOrdinals' = List(1),
      qAdmitted' = admitted(admission),
    }
  }

  action init = recordProjection(Actions)

  action doActionProjection = recordProjection(Actions)

  action doBonusProjection = recordProjection(BonusActions)

  action step = any {
    doActionProjection,
    doBonusProjection,
  }
}
