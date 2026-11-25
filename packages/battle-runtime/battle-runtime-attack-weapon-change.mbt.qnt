// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.ATTACK_WEAPON_CHANGE
// RAW: .references/srd-5.2.1/rules-glossary.md "Attack [Action]", Equipping
// and Unequipping Weapons.
// Focused witness of one character's loadout weapon across its Attack action
// attacks, the change after each, and the turns in between. Rules authority
// is attack-weapon-change-core.qnt.
module battleRuntimeAttackWeaponChangeMbt {
  import attackWeaponChangeCore.* from "../shared-algebras/proofs/rule-core/attack-weapon-change-core"

  var qWeapon: WeaponCustody
  var qTurn: AttackWeaponChangeTurn
  // The character's one Attack action attack this turn: a level 1 Fighter.
  var qAttackAvailable: bool

  pure val offTurn: AttackWeaponChangeTurn = {
    ownTurn: false,
    canAct: true,
    changeAfterAttack: false,
  }

  action init = all {
    qWeapon' = HeldWeapon,
    qTurn' = startOwnTurn(offTurn),
    qAttackAvailable' = true,
  }

  // An attack with the weapon when it is in hand after the change, and an
  // Unarmed Strike otherwise. No change: changeBefore is empty.
  action attack(changeBefore: Set[WeaponChange]): bool = all {
    qTurn.ownTurn,
    qAttackAvailable,
    val custodies =
      if (changeBefore.size() == 0) Set(qWeapon)
      else changeBefore.map(change => weaponChangeCustody(qWeapon, change, true)).flatten()
    all {
      custodies.size() > 0,
      nondet custody = custodies.oneOf()
      all {
        qWeapon' = custody,
        qTurn' = afterAttack(qTurn, changeBefore.size() > 0),
        qAttackAvailable' = false,
      },
    },
  }

  action doAttack = attack(Set())

  action doAttackDrawingWeapon = attack(Set(EquipWeapon))

  action doAttackStowingWeapon = attack(Set(StowWeapon))

  action doAttackDroppingWeapon = attack(Set(DropWeapon))

  action changeAfter(change: WeaponChange): bool = all {
    canChangeAfterAttack(qTurn),
    val custodies = weaponChangeCustody(qWeapon, change, true)
    all {
      custodies.size() > 0,
      nondet custody = custodies.oneOf()
      all {
        qWeapon' = custody,
        qTurn' = spendChangeAfterAttack(qTurn),
        qAttackAvailable' = qAttackAvailable,
      },
    },
  }

  action doDrawAfterAttack = changeAfter(EquipWeapon)

  action doStowAfterAttack = changeAfter(StowWeapon)

  action doDropAfterAttack = changeAfter(DropWeapon)

  action doEndOwnTurn = all {
    qTurn.ownTurn,
    qWeapon' = qWeapon,
    qTurn' = endOwnTurn(qTurn),
    qAttackAvailable' = false,
  }

  action doEndOtherTurn = all {
    not(qTurn.ownTurn),
    qWeapon' = qWeapon,
    qTurn' = startOwnTurn(qTurn),
    qAttackAvailable' = true,
  }

  action step = any {
    doAttack,
    doAttackDrawingWeapon,
    doAttackStowingWeapon,
    doAttackDroppingWeapon,
    doDrawAfterAttack,
    doStowAfterAttack,
    doDropAfterAttack,
    doEndOwnTurn,
    doEndOtherTurn,
  }
}
