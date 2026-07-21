// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE

module battleRuntimeEndOfTurnLightExpiration {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def lightEmittersWithoutExpiredEndOfTurnEmitters(
    emitters: Set[LightEmitter],
    actor: Actor,
    round: int
  ): Set[LightEmitter] =
    emitters.filter(emitter => match emitter {
      | SpellLightEmitter(data) => match data.expiresAt {
          | EndOfTurnLightEmitterExpiration(expiresAt) => expiresAt.actor != actor or expiresAt.round != round
          | ConcentrationLightEmitterExpiration(_) => true
          | DurationLightEmitterExpiration(_) => true
          | UntilDispelledLightEmitterExpiration => true
        }
      | ObjectInvisibleRevealLightEmitter(data) => data.expiresAtActor != actor or data.expiresAtRound != round
    })
}
