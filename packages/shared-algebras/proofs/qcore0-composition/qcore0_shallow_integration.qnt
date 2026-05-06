// -*- mode: Bluespec; -*-

module qcore0ShallowIntegration {
  import qcore0DamageContract.* from "./qcore0_damage_contract"
  import qcore0ActionContract.* from "./qcore0_action_contract"

  var qTargetHp: int
  var qTargetTempHp: int
  var qActionAvailable: bool
  var qBonusAvailable: bool

  action init = all {
    qTargetHp' = 8,
    qTargetTempHp' = 2,
    qActionAvailable' = true,
    qBonusAvailable' = true,
  }

  action doAttackProcedure = {
    val nextVitals =
      applyDamage({ hp: qTargetHp, maxHp: 8, tempHp: qTargetTempHp, dead: qTargetHp == 0 }, 4)
    val nextBudget =
      spendAction({ actionAvailable: qActionAvailable, bonusAvailable: qBonusAvailable })
    all {
      canSpendAction({ actionAvailable: qActionAvailable, bonusAvailable: qBonusAvailable }),
      qTargetHp' = nextVitals.hp,
      qTargetTempHp' = nextVitals.tempHp,
      qActionAvailable' = nextBudget.actionAvailable,
      qBonusAvailable' = nextBudget.bonusAvailable,
    }
  }

  action doBonusProcedure = {
    val nextBudget =
      spendBonus({ actionAvailable: qActionAvailable, bonusAvailable: qBonusAvailable })
    all {
      qBonusAvailable,
      qTargetHp' = qTargetHp,
      qTargetTempHp' = qTargetTempHp,
      qActionAvailable' = nextBudget.actionAvailable,
      qBonusAvailable' = nextBudget.bonusAvailable,
    }
  }

  action doResetTurn = all {
    qTargetHp' = qTargetHp,
    qTargetTempHp' = qTargetTempHp,
    qActionAvailable' = true,
    qBonusAvailable' = true,
  }

  action step = any {
    doAttackProcedure,
    doBonusProcedure,
    doResetTurn,
  }

  val invariant = all {
    legalVitals({ hp: qTargetHp, maxHp: 8, tempHp: qTargetTempHp, dead: qTargetHp == 0 }),
    legalBudget({ actionAvailable: qActionAvailable, bonusAvailable: qBonusAvailable }),
  }
}
