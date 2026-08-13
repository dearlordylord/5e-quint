// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE

// RAW anchors:
// - Equipment.md, Ammunition: an Ammunition-property weapon requires matching
//   ammunition and each attack expends one piece.
// - Monsters/Overview.md, Ammunition and Ranged Attacks: a monster that
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
