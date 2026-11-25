// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ARMOR_CLASS.COLLECTOR

// RAW trace:
// - .references/srd-5.2.1/playing-the-game.md#Armor Class: "A creature's AC
//   can then be modified by armor, magic items, spells, and more." "Only One
//   Base AC": "only one base calculation can be in effect for a creature."
// - .references/srd-5.2.1/rules-glossary.md#Armor Class: "If a rule gives you
//   another base AC calculation, you choose which calculation to use; you
//   can't use more than one." The creature uses its highest (ASSUMPTIONS.md
//   A67).
// - .references/srd-5.2.1/spells.md#Mage Armor: "a willing creature who isn't
//   wearing armor ... the target's base AC becomes 13 plus its Dexterity
//   modifier." A spell's base calculation is a candidate only without armor.
// - .references/srd-5.2.1/spells.md#Shield of Faith ("+2 bonus to AC"),
//   #Warding Bond ("+1 bonus to AC"), #Slow ("−2 penalty to AC"): bonuses
//   and penalties add to the base calculation in effect.
// - .references/srd-5.2.1/spells.md#Barkskin: "the target has an Armor Class
//   of 17 if its AC is lower than that": a floor under the creature's AC.
// - .references/srd-5.2.1/rules-glossary.md#Cover: Half Cover and
//   Three-Quarters Cover give "+2" and "+5 bonus to AC". Cover is the attack's
//   circumstance, added after the creature's own floor (ASSUMPTIONS.md A66).
//   coverDefenseCore owns the degrees.
//
// Scope: how the parts of a creature's AC combine. Which bonuses a creature's
// armor, Shield and features give is owned by armorClassBase; this core takes
// each part as a number.

module armorClassCollectorCore {
  import coverDefenseCore.* from "./cover-defense-core"

  type ArmorClassCircumstances = {
    ownBaseCalculation: int,
    wearingArmor: bool,
    spellBaseCalculations: List[int],
    modifiers: List[int],
    floors: List[int],
    cover: CoverDegree,
  }

  pure def maxOf(values: List[int], initial: int): int =
    values.foldl(initial, (best, value) => if (value > best) value else best)

  pure def sumOf(values: List[int]): int =
    values.foldl(0, (total, value) => total + value)

  // Only one base calculation is in effect: the highest the creature has.
  pure def baseCalculationInEffect(c: ArmorClassCircumstances): int =
    if (c.wearingArmor) c.ownBaseCalculation
    else maxOf(c.spellBaseCalculations, c.ownBaseCalculation)

  // The creature's own AC: its base calculation with every bonus and penalty,
  // raised to its highest floor.
  pure def creatureArmorClass(c: ArmorClassCircumstances): int =
    maxOf(c.floors, baseCalculationInEffect(c) + sumOf(c.modifiers))

  // The AC an attack roll must meet: the creature's own AC behind its cover.
  pure def collectedArmorClass(c: ArmorClassCircumstances): int =
    armorClassBehindCover(creatureArmorClass(c), c.cover)
}
