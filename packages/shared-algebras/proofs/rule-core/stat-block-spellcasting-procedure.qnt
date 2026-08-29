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

  type StatBlockSpellcastingActionSection =
    | SpellcastingActions
    | SpellcastingBonusActions

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

  type StatBlockSpellcastingAdmittedProcedureFacts = {
    section: StatBlockSpellcastingActionSection,
    ability: StatBlockSpellcastingAbility,
    spellSaveDc: StatBlockSpellcastingOptionalSaveDc,
    spellAttackBonus: StatBlockSpellcastingOptionalAttackBonus,
    components: StatBlockSpellcastingOptionalComponents,
    groups: List[StatBlockSpellcastingGroup],
  }

  type StatBlockSpellcastingUnsupportedReason =
    | UnsupportedSection
    | EmptyGroupList
    | InvalidSpellSaveDc
    | InvalidGroupShape

  type StatBlockSpellcastingAdmission =
    | AdmittedStatBlockSpellcastingProcedure({
        facts: StatBlockSpellcastingAdmittedProcedureFacts,
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

  pure def legalStatBlockSpellcastingSaveDc(
    saveDc: StatBlockSpellcastingOptionalSaveDc
  ): bool = match saveDc {
    | NoSpellSaveDc => true
    | FixedSpellSaveDc(data) => data.value >= 1
  }

  pure def statBlockSpellcastingResourceOrdinalSet(
    ordinals: List[int]
  ): Set[int] = ordinals.foldl(
    Set(),
    (seen, ordinal) => seen.union(Set(ordinal))
  )

  pure def legalStatBlockSpellcastingResourceOrdinals(
    ordinals: List[int]
  ): bool = all {
    ordinals.foldl(
      true,
      (legal, ordinal) => legal and ordinal >= 1
    ),
    statBlockSpellcastingResourceOrdinalSet(ordinals).size() == ordinals.length(),
  }

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
    legalStatBlockSpellcastingSaveDc(facts.spellSaveDc),
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
    else if (not(legalStatBlockSpellcastingSaveDc(facts.spellSaveDc)))
      UnsupportedStatBlockSpellcastingProcedure({ reason: InvalidSpellSaveDc })
    else if (not(legalStatBlockSpellcastingProcedureFacts(facts)))
      UnsupportedStatBlockSpellcastingProcedure({ reason: InvalidGroupShape })
    else AdmittedStatBlockSpellcastingProcedure({
      facts: {
        section:
          if (facts.section == Actions)
            SpellcastingActions
          else SpellcastingBonusActions,
        ability: facts.ability,
        spellSaveDc: facts.spellSaveDc,
        spellAttackBonus: facts.spellAttackBonus,
        components: facts.components,
        groups: facts.groups,
      },
    })

  pure def statBlockSpellcastingActionCost(
    section: StatBlockSpellcastingActionSection
  ): StatBlockSpellcastingActionCost =
    if (section == SpellcastingBonusActions) BonusActionCost
    else MagicActionCost

  // This operation only exposes the generic procedure's action cost. It does
  // not select a group or an invocation; those typed child outcomes belong to
  // their later owners.
  pure def admittedStatBlockSpellcastingActionCost(
    facts: StatBlockSpellcastingAdmittedProcedureFacts
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
