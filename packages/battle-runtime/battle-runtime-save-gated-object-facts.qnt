// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveGatedObjectFacts {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def saveGatedAreaObjectIgnitionOutcomes(
    invocation: SaveGatedDamageInvocation,
    object: ObjectTarget,
    source: Actor,
    disposition: ObjectIgnitionDisposition,
  ): Set[ObjectIgnitionOutcome] =
    if (invocation == FireballSaveGate and disposition == ObjectFlammableUnattended)
      Set(ObjectStartsBurning({
        object: object,
        source: source,
        sourceSpell: Fireball,
      }))
    else
      Set()
}
