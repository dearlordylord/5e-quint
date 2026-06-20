// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release
//
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Glyph of Warding:
//   the glyph lasts until dispelled or triggered; once triggered, the spell
//   ends; if the inscribed surface or object is moved more than 10 feet from
//   where the spell was cast, the glyph is broken and the spell ends without
//   triggering. The explosive rune branch releases a 20-foot-radius Sphere,
//   requires Dexterity Saving Throws, deals 5d8 chosen Acid/Cold/Fire/
//   Lightning/Thunder damage on failed saves, halves damage on successful
//   saves, and adds 1d8 per slot level above 3.
// - UBIQUITOUS_LANGUAGE.md: Spell Effect, Saving Throw, Area of Effect,
//   Damage Type, and table-owned spatial facts.

module battleRuntimeGlyphDurableOccurrence {
  type GlyphOccurrence = {
    active: bool,
    effectId: int,
    sourceSpellLevel: int,
    releaseBranch: str,
    damageType: str,
    coveredAreaId: int,
    castLocationId: int,
    movementInvalidationMoreThanFeet: int,
  }

  type GlyphTriggerOccurrenceWitness = {
    effectId: int,
  }

  type GlyphExplosiveRuneReleaseWitness = {
    triggerOccurrence: GlyphTriggerOccurrenceWitness,
    coveredAreaId: int,
    affectedTargetCount: int,
    savingThrowAbility: str,
    savingThrowDcSource: str,
    savingThrowOutcomeCount: int,
  }

  pure val glyphMinimumSpellLevel = 3

  pure val glyphMovementInvalidationThresholdFeet = 10

  pure val glyphExplosiveRuneRadiusFeet = 20

  pure val glyphExplosiveRuneBaseDamageDice = 5

  pure val glyphExplosiveRuneDamageDieSize = 8

  pure val glyphExplosiveRuneDamageTypes: Set[str] =
    Set("acid", "cold", "fire", "lightning", "thunder")

  pure def completedGlyphInscriptionAccepted(
    sourceSpellLevel: int,
    releaseBranch: str,
    damageType: str,
  ): bool =
    sourceSpellLevel >= glyphMinimumSpellLevel and
    releaseBranch == "explosiveRune" and
    damageType.in(glyphExplosiveRuneDamageTypes)

  pure def completedGlyphOccurrence(
    effectId: int,
    sourceSpellLevel: int,
    releaseBranch: str,
    damageType: str,
    coveredAreaId: int,
    castLocationId: int,
  ): GlyphOccurrence = {
    active: true,
    effectId: effectId,
    sourceSpellLevel: sourceSpellLevel,
    releaseBranch: releaseBranch,
    damageType: damageType,
    coveredAreaId: coveredAreaId,
    castLocationId: castLocationId,
    movementInvalidationMoreThanFeet: glyphMovementInvalidationThresholdFeet,
  }

  pure def inactiveGlyphOccurrence(occurrence: GlyphOccurrence): GlyphOccurrence = {
    active: false,
    effectId: occurrence.effectId,
    sourceSpellLevel: occurrence.sourceSpellLevel,
    releaseBranch: occurrence.releaseBranch,
    damageType: occurrence.damageType,
    coveredAreaId: occurrence.coveredAreaId,
    castLocationId: occurrence.castLocationId,
    movementInvalidationMoreThanFeet: occurrence.movementInvalidationMoreThanFeet,
  }

  pure def glyphAfterTriggerOccurrence(
    occurrence: GlyphOccurrence,
    witnessEffectId: int,
  ): GlyphOccurrence =
    if (
      occurrence.active and
      occurrence.effectId == witnessEffectId and
      occurrence.releaseBranch != "explosiveRune"
    )
    inactiveGlyphOccurrence(occurrence)
    else occurrence

  pure def glyphAfterMovementInvalidation(
    occurrence: GlyphOccurrence,
    witnessEffectId: int,
    witnessCastLocationId: int,
    movedDistanceFeet: int,
  ): GlyphOccurrence =
    if (
      occurrence.active and
      occurrence.effectId == witnessEffectId and
      occurrence.castLocationId == witnessCastLocationId and
      movedDistanceFeet > occurrence.movementInvalidationMoreThanFeet
    )
    inactiveGlyphOccurrence(occurrence)
    else occurrence

  pure def glyphExplosiveRuneDamageDice(sourceSpellLevel: int): int =
    if (sourceSpellLevel >= glyphMinimumSpellLevel)
    glyphExplosiveRuneBaseDamageDice + (sourceSpellLevel - glyphMinimumSpellLevel)
    else 0

  pure def glyphExplosiveRuneDamageOnSave(
    failedSaveDamage: int,
    savingThrowSucceeded: bool,
  ): int =
    if (savingThrowSucceeded) failedSaveDamage / 2 else failedSaveDamage

  pure def glyphExplosiveRuneReleaseWitnessAccepted(
    occurrence: GlyphOccurrence,
    witness: GlyphExplosiveRuneReleaseWitness,
  ): bool =
    occurrence.active and
    occurrence.effectId == witness.triggerOccurrence.effectId and
    occurrence.releaseBranch == "explosiveRune" and
    occurrence.damageType.in(glyphExplosiveRuneDamageTypes) and
    occurrence.coveredAreaId == witness.coveredAreaId and
    witness.affectedTargetCount >= 0 and
    (
      witness.affectedTargetCount == 0 or
      (
        witness.savingThrowOutcomeCount == witness.affectedTargetCount and
        witness.savingThrowAbility == "dex" and
        witness.savingThrowDcSource == "casterSpellSaveDc"
      )
    )

  pure def glyphAfterExplosiveRuneRelease(
    occurrence: GlyphOccurrence,
    witness: GlyphExplosiveRuneReleaseWitness,
  ): GlyphOccurrence =
    if (glyphExplosiveRuneReleaseWitnessAccepted(occurrence, witness))
    inactiveGlyphOccurrence(occurrence)
    else occurrence

  run test_completed_inscription_creates_active_glyph_occurrence = {
    val occurrence = completedGlyphOccurrence(1, 3, "explosiveRune", "thunder", 200, 100)
    all {
      assert(completedGlyphInscriptionAccepted(3, "explosiveRune", "thunder")),
      assert(occurrence.active),
      assert(occurrence.effectId == 1),
      assert(occurrence.sourceSpellLevel == 3),
      assert(occurrence.releaseBranch == "explosiveRune"),
      assert(occurrence.damageType == "thunder"),
      assert(occurrence.coveredAreaId == 200),
      assert(occurrence.castLocationId == 100),
      assert(occurrence.movementInvalidationMoreThanFeet == 10),
    }
  }

  run test_completed_inscription_rejects_below_minimum_spell_level = {
    all {
      assert(not(completedGlyphInscriptionAccepted(2, "explosiveRune", "thunder"))),
      assert(completedGlyphInscriptionAccepted(3, "explosiveRune", "thunder")),
      assert(completedGlyphInscriptionAccepted(4, "explosiveRune", "thunder")),
      assert(not(completedGlyphInscriptionAccepted(3, "spellGlyph", "thunder"))),
      assert(not(completedGlyphInscriptionAccepted(3, "explosiveRune", "force"))),
    }
  }

  run test_trigger_occurrence_does_not_end_explosive_rune_without_release = {
    val occurrence = completedGlyphOccurrence(1, 3, "explosiveRune", "thunder", 200, 100)
    val ended = glyphAfterTriggerOccurrence(occurrence, 1)
    val unrelated = glyphAfterTriggerOccurrence(occurrence, 2)
    all {
      assert(ended.active),
      assert(unrelated.active),
    }
  }

  run test_movement_invalidation_requires_matching_cast_location_and_more_than_ten_feet = {
    val occurrence = completedGlyphOccurrence(1, 3, "explosiveRune", "thunder", 200, 100)
    val exactThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 10)
    val wrongCastLocation = glyphAfterMovementInvalidation(occurrence, 1, 200, 11)
    val movedBeyondThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 11)
    all {
      assert(exactThreshold.active),
      assert(wrongCastLocation.active),
      assert(not(movedBeyondThreshold.active)),
    }
  }

  run test_explosive_rune_release_requires_matching_area_witness_and_stored_release = {
    val occurrence = completedGlyphOccurrence(1, 5, "explosiveRune", "thunder", 200, 100)
    val acceptedWitness = {
      triggerOccurrence: { effectId: 1 },
      coveredAreaId: 200,
      affectedTargetCount: 2,
      savingThrowAbility: "dex",
      savingThrowDcSource: "casterSpellSaveDc",
      savingThrowOutcomeCount: 2,
    }
    val wrongAreaWitness = { ...acceptedWitness, coveredAreaId: 201 }
    val wrongSaveAbilityWitness = { ...acceptedWitness, savingThrowAbility: "con" }
    val wrongSaveDcWitness = { ...acceptedWitness, savingThrowDcSource: "fixed" }
    val wrongSaveCountWitness = { ...acceptedWitness, savingThrowOutcomeCount: 1 }
    val wrongReleaseBranchOccurrence = { ...occurrence, releaseBranch: "spellGlyph" }
    val wrongDamageTypeOccurrence = { ...occurrence, damageType: "force" }
    all {
      assert(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongAreaWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveAbilityWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveDcWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveCountWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(wrongReleaseBranchOccurrence, acceptedWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(wrongDamageTypeOccurrence, acceptedWitness))),
    }
  }

  run test_explosive_rune_release_scales_damage_and_halves_successful_saves = {
    val occurrence = completedGlyphOccurrence(1, 5, "explosiveRune", "thunder", 200, 100)
    all {
      assert(glyphExplosiveRuneDamageDice(3) == 5),
      assert(glyphExplosiveRuneDamageDice(5) == 7),
      assert(glyphExplosiveRuneRadiusFeet == 20),
      assert(glyphExplosiveRuneDamageDieSize == 8),
      assert(glyphExplosiveRuneDamageDice(occurrence.sourceSpellLevel) == 7),
      assert(glyphExplosiveRuneDamageOnSave(27, false) == 27),
      assert(glyphExplosiveRuneDamageOnSave(27, true) == 13),
    }
  }

  run test_explosive_rune_release_ends_matching_glyph_after_release = {
    val occurrence = completedGlyphOccurrence(1, 3, "explosiveRune", "fire", 200, 100)
    val releaseWitness = {
      triggerOccurrence: { effectId: 1 },
      coveredAreaId: 200,
      affectedTargetCount: 1,
      savingThrowAbility: "dex",
      savingThrowDcSource: "casterSpellSaveDc",
      savingThrowOutcomeCount: 1,
    }
    val ended = glyphAfterExplosiveRuneRelease(occurrence, releaseWitness)
    val unrelated = glyphAfterExplosiveRuneRelease(
      occurrence,
      { ...releaseWitness, triggerOccurrence: { effectId: 2 } },
    )
    all {
      assert(not(ended.active)),
      assert(unrelated.active),
    }
  }
}
