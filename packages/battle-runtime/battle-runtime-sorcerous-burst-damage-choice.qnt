// -*- mode: Bluespec; -*-

// Sorcerous Burst damage-type selection vocabulary shared by the battle-runtime
// type model (battle-runtime-model) and the spell behaviour (battle-runtime-spell-bridge).
//
// LEAF MODULE — intentionally has no imports. This is the only name
// battle-runtime-model needs from the spell bridge. Keeping it here, below both
// consumers, lets battle-runtime-model stay free of the spell bridge's rule-core
// closure (see battle-runtime-reaction-kinds.qnt for the per-trace cost rationale).
// Do not add imports to this module.
module battleRuntimeSorcerousBurstDamageChoice {
  type BattleRuntimeSorcerousBurstDamageTypeChoice =
    | BattleRuntimeSorcerousBurstAcidDamage
    | BattleRuntimeSorcerousBurstColdDamage
    | BattleRuntimeSorcerousBurstFireDamage
    | BattleRuntimeSorcerousBurstLightningDamage
    | BattleRuntimeSorcerousBurstPoisonDamage
    | BattleRuntimeSorcerousBurstPsychicDamage
    | BattleRuntimeSorcerousBurstThunderDamage
}
