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

  // Drawing the ammunition is part of the attack, and loading a one-handed
  // weapon needs a free hand: one that holds nothing and grapples no one.
  // A stat block never states what each hand holds (ASSUMPTIONS.md A64), so
  // its loading hand is not stated and does not refuse the attack.
  type LoadingHand =
    | LoadingHandFree
    | LoadingHandOccupied
    | LoadingHandNotStated

  pure def ammunitionCanBeDrawn(loadingHand: LoadingHand): bool =
    loadingHand != LoadingHandOccupied

  pure def ammunitionAttackReady(
    stock: AmmunitionStock,
    ammunitionKind: AmmunitionKind,
    loadingHand: LoadingHand,
  ): bool =
    ammunitionAttackAvailable(stock, ammunitionKind) and
    ammunitionCanBeDrawn(loadingHand)

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
