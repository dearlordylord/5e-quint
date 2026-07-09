// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.retaliation-reaction-attack
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeRetaliation {
  // RAW anchors:
  // - Classes/Barbarian.md Level 10, Retaliation: when a creature within
  //   5 feet damages you, you can take a Reaction to make one melee attack
  //   against that creature, using a weapon or Unarmed Strike.
  // - UBIQUITOUS_LANGUAGE.md: Reaction, Attack, Unarmed Strike.

  type RetaliationReactionFacts = {
    positiveDamage: bool,
    damageSourceIsSelf: bool,
    damageSourceWithinFiveFeet: bool,
    reactorHasReaction: bool,
    reactorHasRetaliation: bool,
    attackIsMeleeWeaponOrUnarmedStrike: bool,
  }

  pure def retaliationReactionAttackAvailable(
    facts: RetaliationReactionFacts,
  ): bool =
    facts.positiveDamage
      and not(facts.damageSourceIsSelf)
      and facts.damageSourceWithinFiveFeet
      and facts.reactorHasReaction
      and facts.reactorHasRetaliation
      and facts.attackIsMeleeWeaponOrUnarmedStrike

  pure def retaliationReactionAttackTargetIsDamageSource(
    available: bool,
    damageSourceId: int,
    selectedTargetId: int,
  ): bool =
    available and selectedTargetId == damageSourceId
}
