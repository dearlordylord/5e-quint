// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.TARGET_COVER

// RAW trace:
// - .references/srd-5.2.1/rules-glossary.md#Cover: Half Cover gives +2 AC,
//   Three-Quarters Cover gives +5 AC, and Total Cover means the target can't be
//   targeted directly.
// - .references/srd-5.2.1/playing-the-game.md#Cover: only the most protective
//   degree applies. The table adjudicates that degree from the geometry and
//   supplies it; this core owns what the degree does to an attack.
// - .references/srd-5.2.1/spells.md "A Clear Path to the Target": a spell
//   can't target something behind Total Cover.
module coverDefenseCore {
  type CoverDegree =
    | NoCover
    | HalfCover
    | ThreeQuartersCover
    | TotalCover

  pure def coverAllowsDirectTargeting(cover: CoverDegree): bool =
    match cover {
      | TotalCover => false
      | _ => true
    }

  pure def coverArmorClassBonus(cover: CoverDegree): int =
    match cover {
      | HalfCover => 2
      | ThreeQuartersCover => 5
      | _ => 0
    }

  pure def armorClassBehindCover(armorClass: int, cover: CoverDegree): int =
    armorClass + coverArmorClassBonus(cover)
}
