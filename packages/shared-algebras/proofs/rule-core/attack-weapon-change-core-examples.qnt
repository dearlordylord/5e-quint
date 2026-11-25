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
}
