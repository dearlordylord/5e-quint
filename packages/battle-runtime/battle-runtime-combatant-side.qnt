// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeCombatantSide {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def actorSide(actor: Actor): CombatantSide =
    match actor {
      | Fighter => PartySide
      | Goblin => OppositionSide
    }

  pure def actorsAreEnemies(attacker: Actor, target: Actor): bool =
    actorSide(attacker) != actorSide(target)
}
