// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-blur-attack-roll-defense
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-blur-attack-roll-defense
//
// Focused semantic core for Blur's attack-roll defense lifecycle.
// RAW anchors:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Blur: self spell,
//   Concentration up to 1 minute, attack-roll Disadvantage against the caster,
//   and Blindsight/Truesight bypass.
// - .references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage:
//   Advantage and Disadvantage cancel to a normal d20 roll.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration: losing
//   Concentration ends Concentration effects.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Advantage, Disadvantage,
//   Concentration, Blindsight, and Truesight.

module battleRuntimeBlurAttackRollDefense {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"

  pure val blurAttackRollDefenseEffect: ActiveEffect = Blurred

  pure def activeEffectsWithBlurAttackRollDefense(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.union(Set(blurAttackRollDefenseEffect))

  pure def activeEffectsContainBlurAttackRollDefense(effects: Set[ActiveEffect]): bool =
    effects.contains(blurAttackRollDefenseEffect)

  pure def blurAttackRollDefenseAttackRollMode(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
    attackerPerceivesBlurredTargetWithBlindsightOrTruesight: bool,
  ): SpellAttackRollMode =
    spellAttackRollModeFromBlurredActiveEffects(
      attackerEffects,
      targetEffects,
      attackerCanSeeTarget,
      attackerPerceivesBlurredTargetWithBlindsightOrTruesight,
    )

  pure def combatantWithBlurAttackRollDefenseApplied(caster: Combatant): Combatant = {
    val concentrationBase = breakConcentration(caster)
    {
      ...concentrationBase,
      concentrating: true,
      activeEffects: activeEffectsWithBlurAttackRollDefense(concentrationBase.activeEffects),
    }
  }

  pure def combatantWithBlurAttackRollDefenseConcentrationBroken(caster: Combatant): Combatant =
    breakConcentration(caster)
}
