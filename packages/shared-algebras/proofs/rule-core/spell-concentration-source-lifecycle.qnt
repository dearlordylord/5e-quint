// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-SPELLCASTING-CONCENTRATION-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.SPELLCASTING_CONCENTRATION
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
}
