// -*- mode: Bluespec; -*-

module qcore0DamageImpl {
  import qcore0DamageContract.* from "./qcore0_damage_contract"

  var qHp: int
  var qMaxHp: int
  var qTempHp: int
  var qDead: bool

  action init = all {
    qHp' = 8,
    qMaxHp' = 10,
    qTempHp' = 3,
    qDead' = false,
  }

  action doSmallDamage = {
    val resultingVitals = applyDamage({ hp: qHp, maxHp: qMaxHp, tempHp: qTempHp, dead: qDead }, 2)
    all {
      qHp' = resultingVitals.hp,
      qMaxHp' = resultingVitals.maxHp,
      qTempHp' = resultingVitals.tempHp,
      qDead' = resultingVitals.dead,
    }
  }

  action doBigDamage = {
    val resultingVitals = applyDamage({ hp: qHp, maxHp: qMaxHp, tempHp: qTempHp, dead: qDead }, 8)
    all {
      qHp' = resultingVitals.hp,
      qMaxHp' = resultingVitals.maxHp,
      qTempHp' = resultingVitals.tempHp,
      qDead' = resultingVitals.dead,
    }
  }

  action doHeal = {
    val resultingVitals = applyHealing({ hp: qHp, maxHp: qMaxHp, tempHp: qTempHp, dead: qDead }, 3)
    all {
      qHp' = resultingVitals.hp,
      qMaxHp' = resultingVitals.maxHp,
      qTempHp' = resultingVitals.tempHp,
      qDead' = resultingVitals.dead,
    }
  }

  action step = any {
    doSmallDamage,
    doBigDamage,
    doHeal,
  }

  val invariant =
    legalVitals({ hp: qHp, maxHp: qMaxHp, tempHp: qTempHp, dead: qDead })
}
