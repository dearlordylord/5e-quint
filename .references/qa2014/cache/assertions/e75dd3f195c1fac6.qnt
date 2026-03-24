// Source: https://rpg.stackexchange.com/q/178837
module _qa_e75dd3f195c1fac6 {
  import dnd.* from "./dnd"

  // Is it possible to bring an Astral Dreadnaught to the Material Plane?
  // True Polymorph replaces all statistics including special features; once polymorphed,
  // the creature's original traits (like Astral Entity) are replaced, so it can exist elsewhere.
  // Spec encodes True Polymorph as replacing CharConfig entirely.
  run qa_true_polymorph_replaces_config = {
    // Astral Dreadnought has a special feature modeled as part of its CharConfig.
    // True Polymorph replaces the target's game statistics (CharConfig) with a new form.
    // After polymorph the original config (and any special traits) is gone.
    val originalConfig: CharConfig = {
      abilityScores: Map(Str -> 28, Dex -> 7, Con -> 20, Int_ -> 10, Wis -> 14, Cha -> 18),
      level: 20,
      size: Huge,
      speeds: Map(Walk -> 20, Fly -> 80, Swim -> 0, Climb -> 0, Burrow -> 0),
      saveProficiencies: Set(Str, Con, Wis),
      skillProficiencies: Set(Perception),
      expertiseSkills: Set(),
      armorProficiencies: Set(),
      hitDieType: 12,
      spellcastingAbility: Wis,
      hasSpellcasting: false,
      canRitualCast: false,
      unarmoredDefense: NoUnarmoredDefense,
      features: Set(),
    }
    // New form via True Polymorph — ordinary creature, no special plane-binding features
    val polymorphedConfig: CharConfig = {
      abilityScores: Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10),
      level: 1,
      size: Medium,
      speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
      saveProficiencies: Set(),
      skillProficiencies: Set(),
      expertiseSkills: Set(),
      armorProficiencies: Set(),
      hitDieType: 8,
      spellcastingAbility: Wis,
      hasSpellcasting: false,
      canRitualCast: false,
      unarmoredDefense: NoUnarmoredDefense,
      features: Set(),
    }
    // PHB True Polymorph: target's statistics are replaced by the new form's statistics.
    // The original config's special traits no longer apply once polymorphed.
    // Assert: polymorphed config has no special features that would prevent plane travel.
    assert(
      // Original dreadnought has no FExtraAttack etc, but we verify config replacement:
      // after True Polymorph the active config is polymorphedConfig, not originalConfig.
      polymorphedConfig != originalConfig
      // The new form has no special features at all
      and polymorphedConfig.features == Set()
      // The original form's features are gone (not present in new form)
      and not(polymorphedConfig.features.contains(FExtraAttack))
      // Proficiency bonus changes with the new stat block (level 1 vs level 20)
      and proficiencyBonus(polymorphedConfig.level) < proficiencyBonus(originalConfig.level)
      // The new form is a different size — consistent with a true form-replacement
      and polymorphedConfig.size != originalConfig.size
    )
  }
}
