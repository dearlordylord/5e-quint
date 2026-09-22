// -*- mode: Bluespec; -*-

module spellDefinitionProfiles {
  // RAW anchors:
  // - spells.md: Spell definitions and Spell Invocation.
  // - UBIQUITOUS_LANGUAGE.md: Spell Definition and Spell Invocation.

  type SpellDefinitionProfile =
    | MagicMissileSpellProfile
    | RayOfFrostSpellProfile
    | AcidSplashSpellProfile
    | HealingWordSpellProfile
    | CureWoundsSpellProfile
    | MassCureWoundsSpellProfile
    | MassHealingWordSpellProfile
    | MageArmorSpellProfile
}
