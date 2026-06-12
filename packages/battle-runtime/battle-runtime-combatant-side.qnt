// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeCombatantSide {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def actorSide(actor: Actor): CombatantSide =
    match actor {
      | Fighter => PartySide
      | Goblin => OppositionSide
    }

  pure def actorDamageSource(actor: Actor): DamageSourceActor =
    match actor {
      | Fighter => FighterDamageSource
      | Goblin => GoblinDamageSource
    }

  pure def damageSourceSide(damageSource: DamageSourceActor): CombatantSide =
    match damageSource {
      | FighterDamageSource => PartySide
      | FighterAllyDamageSource => PartySide
      | GoblinDamageSource => OppositionSide
    }

  pure def damageSourceIsCasterOrAlly(caster: Actor, damageSource: DamageSourceActor): bool =
    actorSide(caster) == damageSourceSide(damageSource)

  pure def actorsAreEnemies(attacker: Actor, target: Actor): bool =
    actorSide(attacker) != actorSide(target)
}
