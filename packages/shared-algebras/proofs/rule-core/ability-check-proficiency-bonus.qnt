// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.ABILITY_CHECK.PROFICIENCY_BONUS

module abilityCheckProficiencyBonus {
  type AbilityCheckSkillTraining =
    | SkillUnproficient
    | SkillProficient
    | SkillExpertise

  type JackOfAllTradesState =
    | JackOfAllTradesAbsent
    | JackOfAllTradesPresent

  type OtherProficiencyBonusState =
    | NoOtherProficiencyBonus
    | OtherProficiencyBonusApplies

  type AbilityCheckProficiencyBonusKind =
    | NoAbilityCheckProficiencyBonus
    | SkillProficiencyBonus
    | ExpertiseProficiencyBonus
    | JackOfAllTradesProficiencyBonus

  type AbilityCheckProficiencyBonusProjection = {
    kind: AbilityCheckProficiencyBonusKind,
    bonus: int,
  }

  pure def noAbilityCheckProficiencyBonus: AbilityCheckProficiencyBonusProjection = {
    kind: NoAbilityCheckProficiencyBonus,
    bonus: 0,
  }

  pure def abilityCheckProficiencyBonus(
    proficiencyBonus: int,
    training: AbilityCheckSkillTraining,
    jackOfAllTrades: JackOfAllTradesState,
    otherProficiencyBonus: OtherProficiencyBonusState,
  ): AbilityCheckProficiencyBonusProjection =
    match training {
      | SkillExpertise => {
          kind: ExpertiseProficiencyBonus,
          bonus: proficiencyBonus * 2,
        }
      | SkillProficient => {
          kind: SkillProficiencyBonus,
          bonus: proficiencyBonus,
        }
      | SkillUnproficient =>
          match jackOfAllTrades {
            | JackOfAllTradesAbsent => noAbilityCheckProficiencyBonus
            | JackOfAllTradesPresent =>
                match otherProficiencyBonus {
                  | OtherProficiencyBonusApplies => noAbilityCheckProficiencyBonus
                  | NoOtherProficiencyBonus => {
                      kind: JackOfAllTradesProficiencyBonus,
                      bonus: proficiencyBonus / 2,
                    }
                }
          }
    }
}
