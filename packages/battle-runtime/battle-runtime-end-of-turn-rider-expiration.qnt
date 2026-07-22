// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS

module battleRuntimeEndOfTurnRiderExpiration {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def activeEffectsWithoutExpiredEndOfTurnRiders(
    effects: Set[ActiveEffect],
    actor: Actor,
    round: int
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ChillTouchHitPointRegainPrevented(data) => data.source != actor or data.expiresAtRound != round
      | StarryWispInvisibleBenefitDenied(data) => data.source != actor or data.expiresAtRound != round
      | ColorSprayBlinded(data) => data.source != actor or data.expiresAtRound != round
      | _ => true
    })
}
