// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.MOVEMENT.SPEED_COLLECTOR

// RAW trace:
// - .references/srd-5.2.1/rules-glossary.md#Speed, "Changes to Your Speeds":
//   "If an effect increases or decreases your Speed for a time, any special
//   speed you have increases or decreases by an equal amount for the same
//   duration." "if your Speed is reduced to 0 and you have a Climb Speed, your
//   Climb Speed is also reduced to 0."
// - .references/srd-5.2.1/rules-glossary.md#Grappled, #Paralyzed, #Petrified,
//   #Restrained, #Unconscious: "Speed 0. Your Speed is 0 and can't increase."
// - .references/srd-5.2.1/equipment.md#Strength: "that armor reduces the
//   wearer's speed by 10 feet unless the wearer has a Strength score equal to
//   or higher than the listed score."
// - .references/srd-5.2.1/equipment.md#Slow: "you can reduce its Speed by 10
//   feet ... If the creature is hit more than once by weapons that have this
//   property, the Speed reduction doesn't exceed 10 feet."
// - .references/srd-5.2.1/spells.md#Haste ("doubled"), #Slow ("halved") and
//   .references/srd-5.2.1/classes.md#Stunning Strike ("Speed is halved"):
//   ratios of the Speed.
//
// Scope: how the sources that change one creature's Speed combine. Which
// effects a creature has is owned by the runtime; this core takes each
// source as a number.

module speedCollectorCore {
  // equipment.md#Strength and #Slow: both reduce Speed by 10 feet.
  pure val HeavyArmorStrengthReduction = 10
  pure val WeaponMasterySlowReduction = 10

  type Ratio = { numerator: int, denominator: int }

  type SpeedCircumstances = {
    ordinarySpeed: int,
    // Features, spells and Hamstring Blow: each adds.
    deltas: List[int],
    // Each Slow on the creature, as its reduction.
    slowReductions: List[int],
    wearingArmor: bool,
    strengthScore: int,
    // 0 when the armor lists no Strength.
    armorStrengthRequirement: int,
    ratios: List[Ratio],
    speedZero: bool,
  }

  pure def sumOf(values: List[int]): int =
    foldl(values, 0, (total, value) => total + value)

  pure def maxOf(values: List[int], initial: int): int =
    foldl(values, initial, (best, value) => if (value > best) value else best)

  // Heavy armor the wearer isn't strong enough for slows it by 10 feet.
  pure def heavyArmorDelta(c: SpeedCircumstances): int =
    if (c.wearingArmor and c.strengthScore < c.armorStrengthRequirement)
      -HeavyArmorStrengthReduction
    else 0

  // Every Slow together reduces Speed only by the largest one.
  pure def slowDelta(c: SpeedCircumstances): int =
    -maxOf(c.slowReductions, 0)

  pure def totalDelta(c: SpeedCircumstances): int =
    sumOf(c.deltas) + slowDelta(c) + heavyArmorDelta(c)

  pure def numeratorOf(c: SpeedCircumstances): int =
    foldl(c.ratios, 1, (product, ratio) => product * ratio.numerator)

  pure def denominatorOf(c: SpeedCircumstances): int =
    foldl(c.ratios, 1, (product, ratio) => product * ratio.denominator)

  // A speed changed by every delta, then every ratio. A speed is a distance,
  // so a reduction never takes it below 0.
  pure def changedSpeed(c: SpeedCircumstances, speed: int): int =
    if (c.speedZero) 0
    else {
      val changed = ((speed + totalDelta(c)) * numeratorOf(c)) / denominatorOf(c)
      if (changed < 0) 0 else changed
    }

  pure def creatureSpeed(c: SpeedCircumstances): int =
    changedSpeed(c, c.ordinarySpeed)

  // A special speed of its own changes by the same amount; one equal to the
  // creature's Speed is its changed Speed.
  pure def fixedSpecialSpeed(c: SpeedCircumstances, speed: int): int =
    changedSpeed(c, speed)
}
