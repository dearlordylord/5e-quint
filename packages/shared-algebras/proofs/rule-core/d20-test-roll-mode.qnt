// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/playing-the-game.md#Advantage/Disadvantage says
//   matching sources do not stack and Advantage with Disadvantage resolves
//   to a normal roll.

module d20TestRollMode {
  type D20TestRollMode =
    | NormalD20TestRoll
    | AdvantageD20TestRoll
    | DisadvantageD20TestRoll

  type D20TestRollModeSources = {
    advantage: bool,
    disadvantage: bool,
  }

  pure def d20TestRollModeFromSources(
    sources: D20TestRollModeSources,
  ): D20TestRollMode =
    if (sources.advantage == sources.disadvantage)
      NormalD20TestRoll
    else if (sources.advantage)
      AdvantageD20TestRoll
    else
      DisadvantageD20TestRoll
}
