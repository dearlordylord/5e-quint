// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellIndependentAttackSequenceCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  // RAW anchors:
  // - Spells/Descriptions-E-L.md: Eldritch Blast beam count, object targets,
  //   separate attack rolls, and Force damage.
  // - Spells/Descriptions-S-Z.md: Scorching Ray ray count, separate ranged
  //   spell attacks, higher-slot ray scaling, and Fire damage.
  // - Rules-Glossary.md: Damage Roll, Spell Attack, and Target.
  // - Playing-the-Game.md: Making an Attack and Damage Rolls.
  // - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Attack, Damage Type,
  //   and Using a Higher-Level Spell Slot.

  type SpellAttackSequenceProfile =
    | EldritchBlastBeamSequenceProfile
    | ScorchingRaySequenceProfile

  type SpellAttackSequenceStep =
    | SpellAttackSequenceUnavailable
    | SpellAttackSequenceNeedsTargets
    | SpellAttackSequenceNeedsAttackRoll
    | SpellAttackSequenceNeedsDamageRoll
    | SpellAttackSequenceComplete

  pure def spellAttackSequenceDamageType(profile: SpellAttackSequenceProfile): RuleDamageType =
    match profile {
      | EldritchBlastBeamSequenceProfile => ForceDamage
      | ScorchingRaySequenceProfile => FireDamage
    }

  pure def spellAttackSequenceSupportsObjectTargets(profile: SpellAttackSequenceProfile): bool =
    match profile {
      | EldritchBlastBeamSequenceProfile => true
      | ScorchingRaySequenceProfile => true
    }

  pure def spellAttackSequenceAttackCount(profile: SpellAttackSequenceProfile, scalingLevel: int): int =
    match profile {
      | EldritchBlastBeamSequenceProfile =>
          if (scalingLevel >= 17) 4
          else if (scalingLevel >= 11) 3
          else if (scalingLevel >= 5) 2
          else 1
      | ScorchingRaySequenceProfile =>
          if (scalingLevel < 2) 0
          else 3 + (scalingLevel - 2)
    }

  pure def spellAttackSequenceStepFromCounts(
    canCastSpells: bool,
    attackCount: int,
    targetsFilled: int,
    attackRollsFilled: int,
    hits: int,
    damageRollsFilled: int,
  ): SpellAttackSequenceStep =
    if (not(canCastSpells) or attackCount <= 0)
      SpellAttackSequenceUnavailable
    else if (targetsFilled < attackCount)
      SpellAttackSequenceNeedsTargets
    else if (attackRollsFilled < attackCount)
      SpellAttackSequenceNeedsAttackRoll
    else if (damageRollsFilled < hits)
      SpellAttackSequenceNeedsDamageRoll
    else
      SpellAttackSequenceComplete

  pure def spellAttackSequenceStep(
    profile: SpellAttackSequenceProfile,
    canCastSpells: bool,
    attackCount: int,
    targetsFilled: int,
    attackRollsFilled: int,
    hits: int,
    damageRollsFilled: int,
  ): SpellAttackSequenceStep =
    spellAttackSequenceStepFromCounts(canCastSpells, attackCount, targetsFilled, attackRollsFilled, hits, damageRollsFilled)
}
