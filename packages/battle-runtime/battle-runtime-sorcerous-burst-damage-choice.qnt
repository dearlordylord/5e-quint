// -*- mode: Bluespec; -*-

// Sorcerous Burst damage-type selection vocabulary shared by the battle-runtime
// type model (battle-runtime-model) and independent-sequence spell behaviour.
//
// LEAF MODULE — intentionally has no imports. This is the only name
// battle-runtime-model needs from the focused independent-sequence bridge.
// Keeping it here, below both consumers, leaves the model free of behavioural
// rule-core closures (see battle-runtime-reaction-kinds.qnt for the cost rationale).
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
