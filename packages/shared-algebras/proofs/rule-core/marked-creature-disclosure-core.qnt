// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.MARKED_CREATURE_DISCLOSURE
// UNIT-PROFILE-COVERAGE: qnt-owner table-caller.marked-creature-defenses
// RAW: .references/srd-5.2.1/classes.md:6813-6816.
module markedCreatureDisclosureCore {
  type CreatureDefenseFacts = {
    damageImmunities: Set[str], conditionImmunities: Set[str],
    resistances: Set[str], vulnerabilities: Set[str],
  }
  // RAW: playing-the-game.md:1181-1197. Current granted Resistance/Immunity
  // combines with the creature's base facts; duplicate instances do not stack.
  pure def currentCreatureDefenses(base: CreatureDefenseFacts, activeResistances: Set[str], activeConditionImmunities: Set[str]): CreatureDefenseFacts =
    { ...base, resistances: base.resistances.union(activeResistances),
      conditionImmunities: base.conditionImmunities.union(activeConditionImmunities) }
  pure def canDisclose(hasFeature: bool, ownMarkOnTarget: bool): bool =
    hasFeature and ownMarkOnTarget
}
