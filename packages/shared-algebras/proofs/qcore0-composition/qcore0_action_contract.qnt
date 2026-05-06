// -*- mode: Bluespec; -*-

module qcore0ActionContract {
  type TurnBudget = {
    actionAvailable: bool,
    bonusAvailable: bool,
  }

  pure def canSpendAction(budget: TurnBudget): bool =
    budget.actionAvailable

  pure def spendAction(budget: TurnBudget): TurnBudget = {
    actionAvailable: false,
    bonusAvailable: budget.bonusAvailable,
  }

  pure def spendBonus(budget: TurnBudget): TurnBudget = {
    actionAvailable: budget.actionAvailable,
    bonusAvailable: false,
  }

  pure def legalBudget(budget: TurnBudget): bool =
    budget.actionAvailable.in(Set(true, false))
      and budget.bonusAvailable.in(Set(true, false))

  run test_spend_action_preserves_bonus = {
    val resultingBudget = spendAction({ actionAvailable: true, bonusAvailable: true })
    all {
      assert(not(resultingBudget.actionAvailable)),
      assert(resultingBudget.bonusAvailable),
      assert(legalBudget(resultingBudget)),
    }
  }
}
