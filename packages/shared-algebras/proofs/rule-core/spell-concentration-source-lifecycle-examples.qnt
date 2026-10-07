// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-SPELLCASTING-CONCENTRATION-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.spell-invocation.unrestricted
module spellConcentrationSourceLifecycleExamples {
  import spellConcentrationSourceLifecycle.* from "./spell-concentration-source-lifecycle"

  run test_preventionAndDurationKeepUnrelatedSources = {
    val state = { concentration: SpellEffectSource(1), effects: Map(10 -> ConcentrationMaintained(1), 20 -> ConcentrationMaintained(2)) }
    all {
      assert(sourceConcentrationWhenPrevented(state, false) == state),
      assert(sourceConcentrationWhenPrevented(state, true).concentration == NoConcentrationSource),
      assert(sourceConcentrationWhenPrevented(state, true).effects.keys() == Set(20)),
      assert(expireSpellEffectConcentrationSource(state, 2) == state),
      assert(expireSpellEffectConcentrationSource(state, 1).effects.keys() == Set(20)),
      assert(expireSpellEffectConcentrationSource(state.with("concentration", CastingSpellSource(1)), 1).concentration == CastingSpellSource(1)),
    }
  }

  run test_replacementAtCastingStartCleansOnlyPriorSource = {
    val state = {
      concentration: SpellEffectSource(1),
      effects: Map(10 -> ConcentrationMaintained(1), 20 -> ConcentrationMaintained(2), 30 -> DurationMaintained),
    }
    val started = startSpellCastingConcentration(state, 3)
    all {
      assert(started.concentration == CastingSpellSource(3)),
      assert(started.effects.keys() == Set(20, 30)),
      assert(endSourceConcentration(started).effects == started.effects),
    }
  }

  run test_damageDuringCastingDropsPendingSource = {
    val state = { concentration: CastingSpellSource(1), effects: Map(30 -> DurationMaintained) }
    all {
      assert(sourceConcentrationAfterDamage(state, 12, true) == state),
      assert(sourceConcentrationAfterDamage(state, 12, false).concentration == NoConcentrationSource),
      assert(sourceConcentrationAfterDamage(state, 0, false) == state),
    }
  }
}
