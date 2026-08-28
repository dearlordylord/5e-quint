// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.spellcasting.procedure
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE

module statBlockSpellcastingProcedure {
  // RAW anchors:
  // - Monsters/Overview.md: Spellcasting: ability, spell save DC, spell
  //   attack bonus, listed components, and listed spell groups.
  // - UBIQUITOUS_LANGUAGE.md: Stat Block, Spellcasting, Action, Bonus Action,
  //   and authored-free runtime projection.

  type StatBlockSpellcastingSection =
    | Actions
    | BonusActions
    | Reactions
    | LegendaryActions

  type StatBlockSpellcastingInvocationOutcome =
    | Unrestricted
    | Restricted

  type StatBlockSpellcastingAbility =
    | StrengthAbility
    | DexterityAbility
    | ConstitutionAbility
    | IntelligenceAbility
    | WisdomAbility
    | CharismaAbility

  type StatBlockSpellcastingOptionalSaveDc =
    | NoSpellSaveDc
    | FixedSpellSaveDc({ value: int })

  type StatBlockSpellcastingOptionalAttackBonus =
    | NoSpellAttackBonus
    | FixedSpellAttackBonus({ value: int })

  type StatBlockSpellcastingComponents = {
    verbal: bool,
    somatic: bool,
    materialRequired: bool,
  }

  type StatBlockSpellcastingOptionalComponents =
    | NoComponents
    | ListedComponents({ value: StatBlockSpellcastingComponents })

  type StatBlockSpellcastingGroup =
    | AtWillGroup({
        invocations: List[StatBlockSpellcastingInvocationOutcome],
      })
    | LimitedGroup({
        resourceOrdinals: List[int],
        invocations: List[StatBlockSpellcastingInvocationOutcome],
      })

  type StatBlockSpellcastingProcedureFacts = {
    section: StatBlockSpellcastingSection,
    ability: StatBlockSpellcastingAbility,
    spellSaveDc: StatBlockSpellcastingOptionalSaveDc,
    spellAttackBonus: StatBlockSpellcastingOptionalAttackBonus,
    components: StatBlockSpellcastingOptionalComponents,
    groups: List[StatBlockSpellcastingGroup],
  }

  type StatBlockSpellcastingUnsupportedReason =
    | UnsupportedSection
    | EmptyGroupList
    | InvalidGroupShape

  type StatBlockSpellcastingAdmission =
    | AdmittedStatBlockSpellcastingProcedure({
        facts: StatBlockSpellcastingProcedureFacts,
      })
    | UnsupportedStatBlockSpellcastingProcedure({
        reason: StatBlockSpellcastingUnsupportedReason,
      })

  type StatBlockSpellcastingActionCost =
    | MagicActionCost
    | BonusActionCost

  pure def statBlockSpellcastingSectionIsSupported(
    section: StatBlockSpellcastingSection
  ): bool =
    section == Actions or section == BonusActions

  pure def legalStatBlockSpellcastingInvocationOutcomes(
    outcomes: List[StatBlockSpellcastingInvocationOutcome]
  ): bool = outcomes.length() > 0

  pure def legalStatBlockSpellcastingResourceOrdinals(
    ordinals: List[int]
  ): bool = ordinals.foldl(
    true,
    (legal, ordinal) => legal and ordinal >= 1
  )

  pure def legalStatBlockSpellcastingGroup(
    group: StatBlockSpellcastingGroup
  ): bool = match group {
    | AtWillGroup(data) => all {
        legalStatBlockSpellcastingInvocationOutcomes(data.invocations),
      }
    | LimitedGroup(data) => all {
        data.resourceOrdinals.length() > 0,
        legalStatBlockSpellcastingResourceOrdinals(data.resourceOrdinals),
        legalStatBlockSpellcastingInvocationOutcomes(data.invocations),
      }
  }

  pure def legalStatBlockSpellcastingProcedureFacts(
    facts: StatBlockSpellcastingProcedureFacts
  ): bool = all {
    statBlockSpellcastingSectionIsSupported(facts.section),
    facts.groups.length() > 0,
    facts.groups.foldl(
      true,
      (legal, group) => legal and legalStatBlockSpellcastingGroup(group)
    ),
  }

  pure def admitStatBlockSpellcastingProcedure(
    facts: StatBlockSpellcastingProcedureFacts
  ): StatBlockSpellcastingAdmission =
    if (not(statBlockSpellcastingSectionIsSupported(facts.section)))
      UnsupportedStatBlockSpellcastingProcedure({ reason: UnsupportedSection })
    else if (facts.groups.length() == 0)
      UnsupportedStatBlockSpellcastingProcedure({ reason: EmptyGroupList })
    else if (not(legalStatBlockSpellcastingProcedureFacts(facts)))
      UnsupportedStatBlockSpellcastingProcedure({ reason: InvalidGroupShape })
    else AdmittedStatBlockSpellcastingProcedure({ facts: facts })

  pure def statBlockSpellcastingActionCost(
    section: StatBlockSpellcastingSection
  ): StatBlockSpellcastingActionCost =
    if (section == BonusActions) BonusActionCost
    else MagicActionCost

  // This operation only exposes the generic procedure's action cost. It does
  // not select a group or an invocation; those typed child outcomes belong to
  // their later owners.
  pure def admittedStatBlockSpellcastingActionCost(
    facts: StatBlockSpellcastingProcedureFacts
  ): StatBlockSpellcastingActionCost =
    statBlockSpellcastingActionCost(facts.section)

  pure def statBlockSpellcastingInvocationOutcomes(
    group: StatBlockSpellcastingGroup
  ): List[StatBlockSpellcastingInvocationOutcome] = match group {
    | AtWillGroup(data) => data.invocations
    | LimitedGroup(data) => data.invocations
  }

  pure def statBlockSpellcastingProcedureInvocationOutcomes(
    facts: StatBlockSpellcastingProcedureFacts
  ): List[List[StatBlockSpellcastingInvocationOutcome]] =
    facts.groups.foldl(
      List(),
      (outcomes, group) =>
        outcomes.append(statBlockSpellcastingInvocationOutcomes(group))
    )
}
