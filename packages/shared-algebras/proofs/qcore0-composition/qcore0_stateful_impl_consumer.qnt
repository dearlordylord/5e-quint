// -*- mode: Bluespec; -*-

module qcore0StatefulImplConsumer {
  import qcore0DamageImpl from "./qcore0_damage_impl"

  action init = qcore0DamageImpl::init
  action step = qcore0DamageImpl::step

  val invariant = qcore0DamageImpl::invariant
}
