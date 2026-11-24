// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.EQUIPMENT.WEAPON_GRIP_CHANGE

// SRD 5.2.1 equipment.md "Versatile": a Versatile weapon "can be used with one
// or two hands", and its Versatile damage applies "when used with two hands
// to make a melee attack". A creature holding its weapon can change how it
// holds it. The SRD gives the change no cost or timing, so it costs nothing on
// the creature's own turn while it can act (ASSUMPTIONS.md A65). A Two-Handed
// weapon keeps its two-handed grip (ASSUMPTIONS.md A58), and a two-handed grip
// needs the other hand free.
// Import-free, so simulated drivers can compose over it as a pure leaf; the
// grips themselves are attack-roll-damage-dice-core's WeaponGrip.
module weaponGripChangeCore {
  type WeaponGripChangeFacts = {
    ownTurn: bool,
    canAct: bool,
    holdsWeapon: bool,
    twoHandedWeapon: bool,
    heldWithTwoHands: bool,
    // The hand the weapon doesn't hold with a one-handed grip holds nothing:
    // no shield, off-hand weapon, grapple or held object.
    otherHandFree: bool,
  }

  pure def weaponGripChangeOpen(facts: WeaponGripChangeFacts): bool = and {
    facts.ownTurn,
    facts.canAct,
    facts.holdsWeapon,
  }

  // Whether the creature can take its one-handed weapon in both hands now.
  pure def twoHandedGripChangeAllowed(facts: WeaponGripChangeFacts): bool = and {
    weaponGripChangeOpen(facts),
    not(facts.heldWithTwoHands),
    facts.otherHandFree,
  }

  // Whether the creature can let go of its weapon with one hand now. Letting
  // go needs no free hand.
  pure def oneHandedGripChangeAllowed(facts: WeaponGripChangeFacts): bool = and {
    weaponGripChangeOpen(facts),
    facts.heldWithTwoHands,
    not(facts.twoHandedWeapon),
  }
}
