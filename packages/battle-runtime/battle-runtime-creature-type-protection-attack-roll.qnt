// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION

module battleRuntimeCreatureTypeProtectionAttackRoll {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"

  pure def spellAttackRollModeFromCreatureTypeScopedActiveEffects(
    attackerCreatureType: RuntimeCreatureType,
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): SpellAttackRollMode = {
    val hasDisadvantage = activeEffectsGrantAttackRollDisadvantage(attackerEffects) or (
        targetEffects.contains(ProtectionFromEvilAndGoodCreatureTypeProtection)
        and protectionFromEvilAndGoodCreatureTypeIsScoped(attackerCreatureType)
      )
    attackRollModeFromFlags(
      activeEffectsGrantAttackRollAdvantage(targetEffects, attackerCanSeeTarget),
      hasDisadvantage,
    )
  }
}
