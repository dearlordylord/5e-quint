// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ACTION.ATTACK_WEAPON_CHANGE
module attackWeaponChangeCore {
  // .references/srd-5.2.1/rules-glossary.md "Attack [Action]", Equipping and
  // Unequipping Weapons: "You can either equip or unequip one weapon when you
  // make an attack as part of this action. You do so either before or after
  // the attack. If you equip a weapon before an attack, you don't need to use
  // it for that attack. Equipping a weapon includes drawing it from a sheath or
  // picking it up. Unequipping a weapon includes sheathing, stowing, or
  // dropping it."
  //
  // A change before the attack rides on the attack. An Attack action attack
  // made without one leaves a change after it, which lasts until the
  // creature's next Attack action attack or the end of its turn
  // (ASSUMPTIONS.md A63). handsFree is whether
  // the hands the weapon's loadout grip uses are empty.

  type WeaponCustody = HeldWeapon | StowedWeapon | WeaponOnGround

  type WeaponChange = EquipWeapon | StowWeapon | DropWeapon

  type AttackWeaponChangeTurn = {
    ownTurn: bool,
    canAct: bool,
    changeAfterAttack: bool,
  }

  pure def weaponChangeCustody(
    custody: WeaponCustody,
    change: WeaponChange,
    handsFree: bool,
  ): Set[WeaponCustody] =
    match change {
      | EquipWeapon =>
          if (custody != HeldWeapon and handsFree) Set(HeldWeapon) else Set()
      | StowWeapon => if (custody == HeldWeapon) Set(StowedWeapon) else Set()
      | DropWeapon => if (custody == HeldWeapon) Set(WeaponOnGround) else Set()
    }

  // The allowance an Attack action attack on the creature's own turn leaves:
  // a change after it, unless it carried its change before the roll. A
  // Grapple or Shove takes an attack's place and carries no change before it.
  pure def afterAttack(
    turn: AttackWeaponChangeTurn,
    changedBeforeAttack: bool,
  ): AttackWeaponChangeTurn =
    { ...turn, changeAfterAttack: not(changedBeforeAttack) }

  pure def canChangeAfterAttack(turn: AttackWeaponChangeTurn): bool =
    turn.ownTurn and turn.canAct and turn.changeAfterAttack

  pure def spendChangeAfterAttack(turn: AttackWeaponChangeTurn): AttackWeaponChangeTurn =
    { ...turn, changeAfterAttack: false }

  pure def startOwnTurn(turn: AttackWeaponChangeTurn): AttackWeaponChangeTurn =
    { ...turn, ownTurn: true, changeAfterAttack: false }

  pure def endOwnTurn(turn: AttackWeaponChangeTurn): AttackWeaponChangeTurn =
    { ...turn, ownTurn: false, changeAfterAttack: false }
}
