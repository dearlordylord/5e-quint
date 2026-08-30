// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.spellcasting.procedure

module statBlockSpellcastingProcedureExamples {
  import statBlockSpellcastingProcedure.* from "./stat-block-spellcasting-procedure"

  run test_admits_action_spellcasting_and_preserves_child_outcomes = {
    val facts = {
      section: Actions,
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
    val admission = admitStatBlockSpellcastingProcedure(facts)
    all {
      assert(match admission {
        | AdmittedStatBlockSpellcastingProcedure(data) => all {
            data.facts.section == SpellcastingActions,
            admittedStatBlockSpellcastingActionCost(data.facts) == MagicActionCost,
          }
        | UnsupportedStatBlockSpellcastingProcedure(_) => false
      }),
      assert(
        statBlockSpellcastingProcedureInvocationOutcomes(facts) ==
          List(List(Unrestricted, Restricted), List(Unrestricted))
      ),
    }
  }

  run test_admits_bonus_action_spellcasting_without_identity = {
    val facts = {
      section: BonusActions,
      ability: CharismaAbility,
      spellSaveDc: NoSpellSaveDc,
      spellAttackBonus: NoSpellAttackBonus,
      components: NoComponents,
      groups: List(
        AtWillGroup({ invocations: List(Restricted, Unrestricted) }),
      ),
    }
    val admission = admitStatBlockSpellcastingProcedure(facts)
    all {
      assert(
        match admission {
          | AdmittedStatBlockSpellcastingProcedure(data) => all {
              data.facts.section == SpellcastingBonusActions,
              admittedStatBlockSpellcastingActionCost(data.facts) == BonusActionCost,
            }
          | UnsupportedStatBlockSpellcastingProcedure(_) => false
        }
      )
    }
  }

  run test_rejects_unsupported_sections_and_invalid_groups = {
    val unsupportedSection = {
      section: Reactions,
      ability: IntelligenceAbility,
      spellSaveDc: NoSpellSaveDc,
      spellAttackBonus: NoSpellAttackBonus,
      components: NoComponents,
      groups: List(
        AtWillGroup({ invocations: List(Unrestricted) }),
      ),
    }
    val invalidGroup = {
      section: Actions,
      ability: IntelligenceAbility,
      spellSaveDc: NoSpellSaveDc,
      spellAttackBonus: NoSpellAttackBonus,
      components: NoComponents,
      groups: List(
        LimitedGroup({ resourceOrdinals: List(), invocations: List(Restricted) }),
      ),
    }
    val invalidSaveDc = {
      section: Actions,
      ability: IntelligenceAbility,
      spellSaveDc: FixedSpellSaveDc({ value: 0 }),
      spellAttackBonus: NoSpellAttackBonus,
      components: NoComponents,
      groups: List(
        AtWillGroup({ invocations: List(Unrestricted) }),
      ),
    }
    val duplicateResourceOrdinals = {
      section: Actions,
      ability: IntelligenceAbility,
      spellSaveDc: NoSpellSaveDc,
      spellAttackBonus: NoSpellAttackBonus,
      components: NoComponents,
      groups: List(
        LimitedGroup({ resourceOrdinals: List(1, 1), invocations: List(Unrestricted) }),
      ),
    }
    all {
      assert(
        admitStatBlockSpellcastingProcedure(unsupportedSection) ==
          UnsupportedStatBlockSpellcastingProcedure({ reason: UnsupportedSection })
      ),
      assert(
        admitStatBlockSpellcastingProcedure(invalidGroup) ==
          UnsupportedStatBlockSpellcastingProcedure({ reason: InvalidGroupShape })
      ),
      assert(
        admitStatBlockSpellcastingProcedure(invalidSaveDc) ==
          UnsupportedStatBlockSpellcastingProcedure({ reason: InvalidSpellSaveDc })
      ),
      assert(
        admitStatBlockSpellcastingProcedure(duplicateResourceOrdinals) ==
          UnsupportedStatBlockSpellcastingProcedure({ reason: InvalidGroupShape })
      ),
    }
  }
}
