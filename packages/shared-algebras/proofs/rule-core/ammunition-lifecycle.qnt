// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE

// RAW anchors:
// - equipment.md, Ammunition: an Ammunition-property weapon requires matching
//   ammunition and each attack expends one piece. Drawing the ammunition is
//   part of the attack, and a one-handed weapon needs a free hand to load.
// - monsters.md, Ammunition and Ranged Attacks: a monster that
//   requires ammunition carries the necessary ammunition.
module ammunitionLifecycle {
  type AmmunitionKind =
    | ArrowAmmunition
    | BoltAmmunition
    | BulletAmmunition
    | NeedleAmmunition
    | SlingBulletAmmunition

  type AmmunitionStock = { ammunitionKind: AmmunitionKind, remaining: int }

  pure def legalAmmunitionStock(stock: AmmunitionStock): bool = all {
    stock.ammunitionKind.in(Set(
      ArrowAmmunition,
      BoltAmmunition,
      BulletAmmunition,
      NeedleAmmunition,
      SlingBulletAmmunition,
    )),
    stock.remaining >= 0,
  }

  pure def ammunitionRemaining(
    stock: AmmunitionStock,
    ammunitionKind: AmmunitionKind,
  ): int = if (stock.ammunitionKind == ammunitionKind) stock.remaining else 0

  pure def ammunitionAttackAvailable(
    stock: AmmunitionStock,
    ammunitionKind: AmmunitionKind,
  ): bool =
    legalAmmunitionStock(stock) and
    ammunitionRemaining(stock, ammunitionKind) > 0

  // equipment.md "Ammunition" requires a free loading hand for a one-handed
  // weapon. "Two-Handed" requires two hands for the attack; those hands may
  // operate that same weapon, but may not hold or grapple something else.
  type AmmunitionHandUse =
    | AmmunitionHandFree
    | AmmunitionHandHoldsAttackingWeapon
    | AmmunitionHandOccupied

  type AmmunitionHands =
    | OneHandedLoadingHand(AmmunitionHandUse)
    | TwoHandedOperatingHands({ left: AmmunitionHandUse, right: AmmunitionHandUse })
    | AttackingWeaponGripUnavailable
    | StatBlockHandsNotStated

  pure def ammunitionCanBeDrawn(hands: AmmunitionHands): bool =
    match hands {
      | OneHandedLoadingHand(hand) => hand == AmmunitionHandFree
      | TwoHandedOperatingHands(operating) => all {
          operating.left != AmmunitionHandOccupied,
          operating.right != AmmunitionHandOccupied,
          operating.left == AmmunitionHandHoldsAttackingWeapon or
            operating.right == AmmunitionHandHoldsAttackingWeapon,
        }
      | AttackingWeaponGripUnavailable => false
      // Stat Blocks do not state individual hand occupancy (A64).
      | StatBlockHandsNotStated => true
    }

  pure def ammunitionAttackReady(
    stock: AmmunitionStock,
    ammunitionKind: AmmunitionKind,
    hands: AmmunitionHands,
  ): bool =
    ammunitionAttackAvailable(stock, ammunitionKind) and
    ammunitionCanBeDrawn(hands)

  pure def ammunitionAfterAcceptedAttack(
    stock: AmmunitionStock,
    ammunitionKind: AmmunitionKind,
  ): AmmunitionStock =
    if (stock.ammunitionKind == ammunitionKind and stock.remaining > 0) {
      stock.with("remaining", stock.remaining - 1)
    } else {
      stock
    }
}
