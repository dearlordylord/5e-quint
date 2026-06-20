// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-glyph-durable-occurrence
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-glyph-durable-occurrence
//
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Glyph of Warding:
//   the glyph lasts until dispelled or triggered; once triggered, the spell
//   ends; if the inscribed surface or object is moved more than 10 feet from
//   where the spell was cast, the glyph is broken and the spell ends without
//   triggering.
// - UBIQUITOUS_LANGUAGE.md: Spell Effect and table-owned spatial facts.

module battleRuntimeGlyphDurableOccurrence {
  type GlyphOccurrence = {
    active: bool,
    effectId: int,
    castLocationId: int,
    movementInvalidationMoreThanFeet: int,
  }

  pure val glyphMinimumSpellLevel = 3

  pure val glyphMovementInvalidationThresholdFeet = 10

  pure def completedGlyphInscriptionAccepted(sourceSpellLevel: int): bool =
    sourceSpellLevel >= glyphMinimumSpellLevel

  pure def completedGlyphOccurrence(effectId: int, castLocationId: int): GlyphOccurrence = {
    active: true,
    effectId: effectId,
    castLocationId: castLocationId,
    movementInvalidationMoreThanFeet: glyphMovementInvalidationThresholdFeet,
  }

  pure def inactiveGlyphOccurrence(occurrence: GlyphOccurrence): GlyphOccurrence = {
    active: false,
    effectId: occurrence.effectId,
    castLocationId: occurrence.castLocationId,
    movementInvalidationMoreThanFeet: occurrence.movementInvalidationMoreThanFeet,
  }

  pure def glyphAfterTriggerOccurrence(
    occurrence: GlyphOccurrence,
    witnessEffectId: int,
  ): GlyphOccurrence =
    if (occurrence.active and occurrence.effectId == witnessEffectId)
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

  run test_completed_inscription_creates_active_glyph_occurrence = {
    val occurrence = completedGlyphOccurrence(1, 100)
    all {
      assert(completedGlyphInscriptionAccepted(3)),
      assert(occurrence.active),
      assert(occurrence.effectId == 1),
      assert(occurrence.castLocationId == 100),
      assert(occurrence.movementInvalidationMoreThanFeet == 10),
    }
  }

  run test_completed_inscription_rejects_below_minimum_spell_level = {
    all {
      assert(not(completedGlyphInscriptionAccepted(2))),
      assert(completedGlyphInscriptionAccepted(3)),
      assert(completedGlyphInscriptionAccepted(4)),
    }
  }

  run test_trigger_occurrence_ends_matching_glyph = {
    val occurrence = completedGlyphOccurrence(1, 100)
    val ended = glyphAfterTriggerOccurrence(occurrence, 1)
    val unrelated = glyphAfterTriggerOccurrence(occurrence, 2)
    all {
      assert(not(ended.active)),
      assert(unrelated.active),
    }
  }

  run test_movement_invalidation_requires_matching_cast_location_and_more_than_ten_feet = {
    val occurrence = completedGlyphOccurrence(1, 100)
    val exactThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 10)
    val wrongCastLocation = glyphAfterMovementInvalidation(occurrence, 1, 200, 11)
    val movedBeyondThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 11)
    all {
      assert(exactThreshold.active),
      assert(wrongCastLocation.active),
      assert(not(movedBeyondThreshold.active)),
    }
  }
}
