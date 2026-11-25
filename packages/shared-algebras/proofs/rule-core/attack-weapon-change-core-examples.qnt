// -*- mode: Bluespec; -*-

module attackWeaponChangeCoreExamples {
  import attackWeaponChangeCore.* from "./attack-weapon-change-core"

  pure val ownTurn: AttackWeaponChangeTurn = {
    ownTurn: true,
    canAct: true,
    changeAfterAttack: false,
  }

  run aHeldWeaponIsSheathedOrDroppedAndAStowedOrFallenOneDrawn = all {
    assert(weaponChangeCustody(HeldWeapon, StowWeapon, true) == Set(StowedWeapon)),
    assert(weaponChangeCustody(HeldWeapon, DropWeapon, true) == Set(WeaponOnGround)),
    assert(weaponChangeCustody(StowedWeapon, EquipWeapon, true) == Set(HeldWeapon)),
    assert(weaponChangeCustody(WeaponOnGround, EquipWeapon, true) == Set(HeldWeapon)),
  }

  run noChangeThatDoesNothingOrNeedsAnOccupiedHand = all {
    assert(weaponChangeCustody(HeldWeapon, EquipWeapon, true) == Set()),
    assert(weaponChangeCustody(StowedWeapon, StowWeapon, true) == Set()),
    assert(weaponChangeCustody(WeaponOnGround, DropWeapon, true) == Set()),
    assert(weaponChangeCustody(StowedWeapon, EquipWeapon, false) == Set()),
  }

  pure val freeSlot: EquipSlot = {
    slotWeaponHeld: false,
    slotHandsFree: true,
  }

  run anOwnedWeaponGoesInASlotWhoseWeaponIsOutOfHand = all {
    assert(slotTakesWeapon(freeSlot)),
    assert(weaponChangeCustody(StowedWeapon, EquipWeapon, slotTakesWeapon(freeSlot)) == Set(HeldWeapon)),
    assert(weaponChangeCustody(WeaponOnGround, EquipWeapon, slotTakesWeapon(freeSlot)) == Set(HeldWeapon)),
    // The slot's previous weapon leaves the loadout where it is.
    assert(departingWeaponCustody(StowedWeapon) == Set(StowedWeapon)),
    assert(departingWeaponCustody(WeaponOnGround) == Set(WeaponOnGround)),
    assert(departingWeaponCustody(HeldWeapon) == Set()),
  }

  run noSlotForAWeaponWhileItsWeaponIsHeldOrItsHandsAreFull = all {
    assert(not(slotTakesWeapon({ ...freeSlot, slotWeaponHeld: true }))),
    assert(not(slotTakesWeapon({ ...freeSlot, slotHandsFree: false }))),
    assert(weaponChangeCustody(StowedWeapon, EquipWeapon, slotTakesWeapon({ ...freeSlot, slotWeaponHeld: true })) == Set()),
  }

  run anAttackWithoutAChangeLeavesOneAfterIt = all {
    assert(canChangeAfterAttack(afterAttack(ownTurn, false))),
    assert(not(canChangeAfterAttack(afterAttack(ownTurn, true)))),
    assert(not(canChangeAfterAttack(spendChangeAfterAttack(afterAttack(ownTurn, false))))),
    // The next attack decides the allowance again.
    assert(not(canChangeAfterAttack(afterAttack(afterAttack(ownTurn, false), true)))),
  }

  run theChangeAfterAnAttackEndsWithTheTurn = all {
    assert(not(canChangeAfterAttack(endOwnTurn(afterAttack(ownTurn, false))))),
    assert(not(canChangeAfterAttack(startOwnTurn(endOwnTurn(afterAttack(ownTurn, false)))))),
    assert(not(canChangeAfterAttack({ ...afterAttack(ownTurn, false), canAct: false }))),
  }

  pure val otherCreatureTurn: AttackWeaponChangeTurn = {
    ownTurn: false,
    canAct: true,
    changeAfterAttack: false,
  }

  run aReadiedAttackLeavesNoChangeAfterIt = all {
    assert(afterAttack(otherCreatureTurn, false) == otherCreatureTurn),
    assert(not(canChangeAfterAttack(afterAttack(otherCreatureTurn, false)))),
  }

  run aReadiedReleaseCarriesItsChangeBeforeOrAfterTheAttack = all {
    assert(readiedReleaseChangeCustody(HeldWeapon, StowWeapon, true, AfterReadiedAttack, true, false, true) == Set(StowedWeapon)),
    assert(readiedReleaseChangeCustody(StowedWeapon, EquipWeapon, true, BeforeReadiedAttack, true, false, true) == Set(HeldWeapon)),
    assert(readiedReleaseChangeCustody(StowedWeapon, EquipWeapon, true, AfterReadiedAttack, false, false, true) == Set(HeldWeapon)),
    // No change before the attack that loses the readied attack.
    assert(readiedReleaseChangeCustody(HeldWeapon, DropWeapon, true, BeforeReadiedAttack, false, false, true) == Set()),
    // No change after the attack names the weapon it threw.
    assert(readiedReleaseChangeCustody(HeldWeapon, StowWeapon, true, AfterReadiedAttack, true, true, true) == Set()),
    // A reactor a Reaction to the attack left unable to act makes none after it.
    assert(readiedReleaseChangeCustody(HeldWeapon, StowWeapon, true, AfterReadiedAttack, true, false, false) == Set()),
  }
}
