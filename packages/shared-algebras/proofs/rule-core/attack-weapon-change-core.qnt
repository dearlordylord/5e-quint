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
  // the slot can take the weapon: see slotTakesWeapon.
  //
  // Any weapon the creature owns can be equipped, into one hand slot of its
  // loadout: the main hand or the off hand. The slot's own weapon goes back
  // with the loadout's grip. Another weapon takes the slot once the slot's
  // weapon, if any, is out of hand; that weapon then leaves the loadout, still
  // carried, or lying where it fell (ASSUMPTIONS.md A63). That Battle puts
  // another weapon in the off hand only beside a main weapon in hand, and
  // never a Two-Handed one, is a limit of its slot model, not a rule, so it
  // isn't modeled here (A63).

  type WeaponCustody = HeldWeapon | StowedWeapon | WeaponOnGround

  type WeaponChange = EquipWeapon | StowWeapon | DropWeapon

  // A hand slot an equip names, as the equipped weapon finds it.
  type EquipSlot = {
    // The slot's weapon is another one, still in hand.
    slotWeaponHeld: bool,
    // Every hand the slot gives the weapon, with its grip, is empty.
    slotHandsFree: bool,
  }

  pure def slotTakesWeapon(slot: EquipSlot): bool =
    not(slot.slotWeaponHeld) and slot.slotHandsFree

  // Where the slot's previous weapon is once another weapon takes the slot.
  // It is out of hand, and leaving the loadout doesn't move it.
  pure def departingWeaponCustody(custody: WeaponCustody): Set[WeaponCustody] =
    match custody {
      | HeldWeapon => Set()
      | StowedWeapon => Set(StowedWeapon)
      | WeaponOnGround => Set(WeaponOnGround)
    }

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
  // Grapple or Shove that takes an attack's place is such an attack, and
  // carries its change before it the same way; one a Flurry of Blows Unarmed
  // Strike pays for is no Attack action attack, carries no change, and
  // leaves the allowance as it was. A readied Attack's attack, made with a
  // Reaction on another creature's turn, carries its one change on its
  // release, before or after the attack, and leaves no allowance.
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
