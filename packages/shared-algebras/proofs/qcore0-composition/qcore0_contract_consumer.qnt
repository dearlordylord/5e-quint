// -*- mode: Bluespec; -*-

module qcore0ContractConsumer {
  import qcore0DamageContract.* from "./qcore0_damage_contract"

  var qLocalHp: int
  var qLocalTempHp: int

  action init = all {
    qLocalHp' = 5,
    qLocalTempHp' = 2,
  }

  action doContractDamage = {
    val resultingVitals = applyDamage({ hp: qLocalHp, maxHp: 5, tempHp: qLocalTempHp, dead: false }, 3)
    all {
      qLocalHp' = resultingVitals.hp,
      qLocalTempHp' = resultingVitals.tempHp,
    }
  }

  action step = doContractDamage

  val invariant = all {
    qLocalHp >= 0,
    qLocalHp <= 5,
    qLocalTempHp >= 0,
  }
}
