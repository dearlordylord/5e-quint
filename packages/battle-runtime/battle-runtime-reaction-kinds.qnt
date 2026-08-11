// -*- mode: Bluespec; -*-

// Reaction-resolution vocabulary shared by the battle-runtime type model
// (battle-runtime-model) and the reaction behaviour (battle-runtime-interrupt-bridge).
//
// LEAF MODULE — intentionally has no imports. These plain enums are the only
// names battle-runtime-model needs from the interrupt bridge. Keeping them here,
// below both consumers, lets battle-runtime-model stay free of the bridge's
// 30-file rule-core closure. A simulated *.mbt.qnt driver that imports the model
// pays a per-trace instantiation cost proportional to the model's import closure;
// folding these enums back into the bridge re-attaches that closure and makes
// every model-importing driver ~100x slower. Do not add imports to this module.
module battleRuntimeReactionKinds {
  type BattleRuntimeReactionTrigger =
    | BattleRuntimeAttackHit
    | BattleRuntimeAttackDamage
    | BattleRuntimeSpellCast
    | BattleRuntimeCreatureFalls
    | BattleRuntimeSaveFailed
    | BattleRuntimeAfterDamage
    | BattleRuntimeOpportunityAttack

  type BattleRuntimeReactionProcedure =
    | BattleRuntimeShieldReactionProcedure
    | BattleRuntimeCounterspellReactionProcedure
    | BattleRuntimeReactionArmorClassEffectProcedure
    | BattleRuntimeSpellInterruptionReactionProcedure
    | BattleRuntimeAfterDamageSpellReactionProcedure
    | BattleRuntimeFallMitigationReactionProcedure
    | BattleRuntimeOpportunityAttackProcedure
    | BattleRuntimeReadiedSpellReleaseProcedure
    | BattleRuntimeDamageInterruptionProcedure
    | BattleRuntimeNoReactionProcedure

  type BattleRuntimeContinuationKind =
    | BattleRuntimeAttackDamageContinuation
    | BattleRuntimeSpellCastContinuation
    | BattleRuntimeSpellAttackContinuation
    | BattleRuntimeSaveGateContinuation
    | BattleRuntimeMovementContinuation
    | BattleRuntimeFallDamageContinuation
    | BattleRuntimeAfterDamageContinuation
}
