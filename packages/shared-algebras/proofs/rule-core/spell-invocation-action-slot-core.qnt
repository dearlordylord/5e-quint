// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellInvocationActionSlotCore {
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"
  import spellInvocationTargetCardinalityCore.* from "./spell-invocation-target-cardinality-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Gaining Spells, Spell Slots, Casting
  //   without Slots, Casting Time, One Spell with a Spell Slot per Turn, and
  //   Targets.
  // - UBIQUITOUS_LANGUAGE.md: Spell Access, Spell Invocation, Magic Action,
  //   Bonus Action, Cantrip, and Spell Slot.

  type SpellInvocationFacts = {
    profile: SpellDefinitionProfile,
    hasSpellAccess: bool,
    selectedSlotLevel: int,
    targetCount: int,
    targetsAreValid: bool,
  }

  pure def spellProfileAction(profile: SpellDefinitionProfile): SpellInvocationAction =
    if (profile == HealingWordSpellProfile or profile == MassHealingWordSpellProfile) BonusActionSpellInvocation
    else ActionTimeSpellInvocation

  pure def spellProfileMinimumSlotLevel(profile: SpellDefinitionProfile): int =
    if (profile == RayOfFrostSpellProfile or profile == AcidSplashSpellProfile) 0
    else if (profile == MassHealingWordSpellProfile) 3
    else if (profile == MassCureWoundsSpellProfile) 5
    else 1

  pure def spellProfileSlotSpend(profile: SpellDefinitionProfile): SpellInvocationSlotSpend = {
    val minimumSlot = spellProfileMinimumSlotLevel(profile)
    if (minimumSlot == 0) SpellInvocationWithoutSlot
    else SpellInvocationWithSlot({ minimumSlotLevel: minimumSlot })
  }

  pure def spellProfileRequiresSlot(profile: SpellDefinitionProfile): bool =
    spellInvocationSlotSpendRequiresSlot(spellProfileSlotSpend(profile))

  pure def spellInvocationResourceFacts(
    facts: SpellInvocationFacts
  ): SpellInvocationResourceFacts = {
    invocationAction: spellProfileAction(facts.profile),
    hasSpellAccess: facts.hasSpellAccess,
    slotSpend: spellProfileSlotSpend(facts.profile),
    selectedSlotLevel: facts.selectedSlotLevel,
    targetCount: facts.targetCount,
    targetCardinality: spellInvocationTargetCardinality(facts.profile, facts.selectedSlotLevel),
    targetsAreValid: facts.targetsAreValid,
  }

  pure def legalSpellInvocationFacts(facts: SpellInvocationFacts): bool =
    legalSpellInvocationResourceFacts(spellInvocationResourceFacts(facts))

  pure def resolveSpellInvocation(
    state: SpellcastingProcedureState,
    facts: SpellInvocationFacts
  ): SpellInvocationResult =
    resolveSpellInvocationResource(state, spellInvocationResourceFacts(facts))

  pure def spellInvocationCanAffectTargets(
    invocation: SpellInvocationResult,
    facts: SpellInvocationFacts
  ): bool =
    spellInvocationResourceCanAffectTargets(
      invocation,
      spellInvocationResourceFacts(facts)
    )
}
