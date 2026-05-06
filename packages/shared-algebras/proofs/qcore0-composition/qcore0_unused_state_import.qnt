// -*- mode: Bluespec; -*-

module qcore0UnusedStateImport {
  import qcore0DamageImpl from "./qcore0_damage_impl"

  var qCounter: int

  action init = qCounter' = 0
  action step = qCounter' = qCounter + 1

  val invariant = qCounter >= 0
}
