// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellInvocationTargetCardinalityCore {
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Targets and Using a Higher-Level Spell Slot.
  // - Spells/Descriptions-A-D.md: Acid Splash.
  // - Spells/Descriptions-M-P.md: Mass Cure Wounds and Mass Healing Word.
  // - UBIQUITOUS_LANGUAGE.md: Spell Definition and Spell Invocation.

  pure def spellInvocationTargetCardinality(
    profile: SpellDefinitionProfile,
    slotLevel: int
  ): SpellInvocationTargetCardinality =
    if (profile == AcidSplashSpellProfile) SpellInvocationOpenUpperTargets({ minimumTargetCount: 1 })
    else if (profile == MassHealingWordSpellProfile or profile == MassCureWoundsSpellProfile) SpellInvocationBoundedTargets({
      minimumTargetCount: 1,
      maximumTargetCount: 6,
    })
    else SpellInvocationBoundedTargets({
      minimumTargetCount: 1,
      maximumTargetCount: 1,
    })

  pure def legalSpellInvocationTargetCount(
    profile: SpellDefinitionProfile,
    slotLevel: int,
    targetCount: int
  ): bool =
    legalSpellInvocationTargetCardinality(
      spellInvocationTargetCardinality(profile, slotLevel),
      targetCount
    )
}
