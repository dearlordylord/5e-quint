// RAW-COVERAGE: qnt-owner RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001
// SRD 5.2.1 rules-glossary.md:451-459; monsters.md:401-409.
module spellConcentrationSourceLifecycle {
  import reactionsContinuationsConcentration as RC from "./reactions-continuations-concentration"

  type ConcentrationSource =
    | NoConcentrationSource
    | CastingSpellSource(int)
    | SpellEffectSource(int)

  type EffectMaintenance =
    | ConcentrationMaintained(int)
    | DurationMaintained

  type SourceConcentrationState = {
    concentration: ConcentrationSource,
    effects: int -> EffectMaintenance,
  }

  pure def sourceProcedure(source: ConcentrationSource): Set[int] = match source {
    | NoConcentrationSource => Set()
    | CastingSpellSource(procedure) => Set(procedure)
    | SpellEffectSource(procedure) => Set(procedure)
  }

  pure def endSourceConcentration(state: SourceConcentrationState): SourceConcentrationState = {
    val endedSource = sourceProcedure(state.concentration)
    {
      concentration: NoConcentrationSource,
      effects: state.effects.keys().filter(effect => match state.effects.get(effect) {
        | ConcentrationMaintained(procedure) => not(procedure.in(endedSource))
        | DurationMaintained => true
      }).mapBy(effect => state.effects.get(effect)),
    }
  }

  pure def startSpellCastingConcentration(state: SourceConcentrationState, procedure: int): SourceConcentrationState =
    endSourceConcentration(state).with("concentration", CastingSpellSource(procedure))

  pure def sourceConcentrationAfterDamage(state: SourceConcentrationState, damage: int, saveSucceeded: bool): SourceConcentrationState = {
    val concentrating = state.concentration != NoConcentrationSource
    val result = RC::resolveConcentrationAfterDamage(if (concentrating) RC::Concentrating else RC::NoConcentration, damage, saveSucceeded)
    if (concentrating and result.concentration == RC::NoConcentration) endSourceConcentration(state) else state
  }

  pure def sourceConcentrationWhenPrevented(state: SourceConcentrationState, incapacitatedOrDead: bool): SourceConcentrationState = {
    val concentration = {
      interruptedActor: if (state.concentration == NoConcentrationSource) RC::NoConcentration else RC::Concentrating,
      reactor: RC::NoConcentration,
    }
    val result = RC::breakConcentrationIfPrevented(concentration, RC::InterruptedActor, incapacitatedOrDead)
    if (result.interruptedActor == RC::NoConcentration) endSourceConcentration(state) else state
  }

  pure def expireSpellEffectConcentrationSource(state: SourceConcentrationState, expiredProcedure: int): SourceConcentrationState = match state.concentration {
    | SpellEffectSource(procedure) => if (procedure == expiredProcedure) endSourceConcentration(state) else state
    | CastingSpellSource(_) => state
    | NoConcentrationSource => state
  }

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
