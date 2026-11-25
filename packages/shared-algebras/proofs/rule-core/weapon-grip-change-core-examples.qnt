// -*- mode: Bluespec; -*-

module weaponGripChangeCoreExamples {
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import weaponGripChangeCore.* from "./weapon-grip-change-core"

  pure val oneHandedLongsword: WeaponGripChangeFacts = {
    ownTurn: true,
    canAct: true,
    holdsWeapon: true,
    twoHandedWeapon: false,
    heldWithTwoHands: false,
    otherHandFree: true,
  }

  pure val longswordDamage: WeaponAttackDamageDieFacts = {
    damageDieSize: 8,
    versatile: VersatileDamageDie(10),
    grip: OneHandedGrip,
    meleeAttack: true,
  }

  run aVersatileWeaponChangesGripBothWaysAndItsDamageDieFollows = all {
    assert(twoHandedGripChangeAllowed(oneHandedLongsword)),
    assert(weaponGripHandsHeld(TwoHandedGrip) == 2),
    assert(weaponAttackDamageDieSize({ ...longswordDamage, grip: TwoHandedGrip }) == 10),
    assert(oneHandedGripChangeAllowed({ ...oneHandedLongsword, heldWithTwoHands: true })),
    assert(weaponGripHandsHeld(OneHandedGrip) == 1),
    assert(weaponAttackDamageDieSize(longswordDamage) == 8),
  }

  run aTwoHandedGripNeedsTheOtherHandFree = all {
    assert(not(twoHandedGripChangeAllowed({ ...oneHandedLongsword, otherHandFree: false }))),
    // Letting go with one hand needs no free hand.
    assert(oneHandedGripChangeAllowed(
      { ...oneHandedLongsword, heldWithTwoHands: true, otherHandFree: false },
    )),
  }

  run aTwoHandedWeaponKeepsItsTwoHandedGrip = all {
    assert(not(oneHandedGripChangeAllowed(
      { ...oneHandedLongsword, twoHandedWeapon: true, heldWithTwoHands: true },
    ))),
  }

  run noChangeToTheSameGripOrWithoutTheWeaponOrOffTurn = all {
    assert(not(oneHandedGripChangeAllowed(oneHandedLongsword))),
    assert(not(twoHandedGripChangeAllowed({ ...oneHandedLongsword, heldWithTwoHands: true }))),
    assert(not(twoHandedGripChangeAllowed({ ...oneHandedLongsword, holdsWeapon: false }))),
    assert(not(twoHandedGripChangeAllowed({ ...oneHandedLongsword, ownTurn: false }))),
    assert(not(twoHandedGripChangeAllowed({ ...oneHandedLongsword, canAct: false }))),
  }
}
