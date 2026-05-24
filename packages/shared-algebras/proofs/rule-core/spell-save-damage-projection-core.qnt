// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellSaveDamageProjectionCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots and Saving Throws.
  // - Rules-Glossary.md: Concentration and Saving Throw effect notation.
  // - Spells/Descriptions-A-D.md: Acid Splash and Dissonant Whispers.
  // - Spells/Descriptions-E-L.md: Fireball, Hellish Rebuke, and Lightning
  //   Bolt.
  // - Spells/Descriptions-M-P.md: Mind Spike.
  // - Spells/Descriptions-S-Z.md: Sacred Flame and Thunderwave.
  // - UBIQUITOUS_LANGUAGE.md: Saving Throw, Spell Slot, Concentration, Spell
  //   Invocation, and Damage Type.

  type SpellSaveGatedTargeting =
    | SpellSingleSaveTarget
    | SpellAreaSaveTargets
    | SpellTargetListSaveTargets({
        minTargets: int,
        baseSlotLevel: int,
        baseTargets: int,
        additionalTargetsPerSlotLevel: int,
      })

  type SpellSaveGatedDamageSuccess =
    | SpellNoDamageOnSaveSuccess
    | SpellHalfDamageOnSaveSuccess

  type SpellSaveGatedDamageProfile =
    | AcidSplashSaveDamageProfile
    | SacredFlameSaveDamageProfile
    | InflictWoundsSaveDamageProfile
    | BurningHandsSaveDamageProfile
    | FireballSaveDamageProfile
    | LightningBoltSaveDamageProfile
    | ViciousMockerySaveDamageProfile
    | ThunderwaveSaveDamageProfile
    | DissonantWhispersSaveDamageProfile
    | HellishRebukeSaveDamageProfile
    | MindSpikeSaveDamageProfile

  type SpellSaveGatedDamageFailedEffect =
    | ViciousMockeryNextAttackDisadvantageEffect
    | ThunderwavePush10FeetEffect
    | DissonantWhispersForcedReactionMovementEffect

  pure def spellSaveGatedDamageTargeting(profile: SpellSaveGatedDamageProfile): SpellSaveGatedTargeting =
    match profile {
      | AcidSplashSaveDamageProfile => SpellAreaSaveTargets
      | SacredFlameSaveDamageProfile => SpellSingleSaveTarget
      | InflictWoundsSaveDamageProfile => SpellSingleSaveTarget
      | BurningHandsSaveDamageProfile => SpellAreaSaveTargets
      | FireballSaveDamageProfile => SpellAreaSaveTargets
      | LightningBoltSaveDamageProfile => SpellAreaSaveTargets
      | ViciousMockerySaveDamageProfile => SpellSingleSaveTarget
      | ThunderwaveSaveDamageProfile => SpellAreaSaveTargets
      | DissonantWhispersSaveDamageProfile => SpellSingleSaveTarget
      | HellishRebukeSaveDamageProfile => SpellSingleSaveTarget
      | MindSpikeSaveDamageProfile => SpellSingleSaveTarget
    }

  pure def spellSaveGatedDamageSuccess(profile: SpellSaveGatedDamageProfile): SpellSaveGatedDamageSuccess =
    match profile {
      | AcidSplashSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | SacredFlameSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | InflictWoundsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | BurningHandsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | FireballSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | LightningBoltSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | ViciousMockerySaveDamageProfile => SpellNoDamageOnSaveSuccess
      | ThunderwaveSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | DissonantWhispersSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | HellishRebukeSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | MindSpikeSaveDamageProfile => SpellHalfDamageOnSaveSuccess
    }

  pure def spellSaveGatedDamageType(profile: SpellSaveGatedDamageProfile): RuleDamageType =
    match profile {
      | AcidSplashSaveDamageProfile => AcidDamage
      | SacredFlameSaveDamageProfile => RadiantDamage
      | InflictWoundsSaveDamageProfile => NecroticDamage
      | BurningHandsSaveDamageProfile => FireDamage
      | FireballSaveDamageProfile => FireDamage
      | LightningBoltSaveDamageProfile => LightningDamage
      | ViciousMockerySaveDamageProfile => PsychicDamage
      | ThunderwaveSaveDamageProfile => ThunderDamage
      | DissonantWhispersSaveDamageProfile => PsychicDamage
      | HellishRebukeSaveDamageProfile => FireDamage
      | MindSpikeSaveDamageProfile => PsychicDamage
    }

  pure def spellSaveGatedDamageRequiresSlot(profile: SpellSaveGatedDamageProfile): bool =
    match profile {
      | AcidSplashSaveDamageProfile => false
      | SacredFlameSaveDamageProfile => false
      | InflictWoundsSaveDamageProfile => true
      | BurningHandsSaveDamageProfile => true
      | FireballSaveDamageProfile => true
      | LightningBoltSaveDamageProfile => true
      | ViciousMockerySaveDamageProfile => false
      | ThunderwaveSaveDamageProfile => true
      | DissonantWhispersSaveDamageProfile => true
      | HellishRebukeSaveDamageProfile => true
      | MindSpikeSaveDamageProfile => true
    }

  pure def spellSaveGatedDamageRequiresConcentration(profile: SpellSaveGatedDamageProfile): bool =
    match profile {
      | AcidSplashSaveDamageProfile => false
      | SacredFlameSaveDamageProfile => false
      | InflictWoundsSaveDamageProfile => false
      | BurningHandsSaveDamageProfile => false
      | FireballSaveDamageProfile => false
      | LightningBoltSaveDamageProfile => false
      | ViciousMockerySaveDamageProfile => false
      | ThunderwaveSaveDamageProfile => false
      | DissonantWhispersSaveDamageProfile => false
      | HellishRebukeSaveDamageProfile => false
      | MindSpikeSaveDamageProfile => true
    }

  pure def spellSaveGatedDamageFailedSaveEffects(profile: SpellSaveGatedDamageProfile): Set[SpellSaveGatedDamageFailedEffect] =
    match profile {
      | AcidSplashSaveDamageProfile => Set()
      | SacredFlameSaveDamageProfile => Set()
      | InflictWoundsSaveDamageProfile => Set()
      | BurningHandsSaveDamageProfile => Set()
      | FireballSaveDamageProfile => Set()
      | LightningBoltSaveDamageProfile => Set()
      | ViciousMockerySaveDamageProfile => Set(ViciousMockeryNextAttackDisadvantageEffect)
      | ThunderwaveSaveDamageProfile => Set(ThunderwavePush10FeetEffect)
      | DissonantWhispersSaveDamageProfile => Set(DissonantWhispersForcedReactionMovementEffect)
      | HellishRebukeSaveDamageProfile => Set()
      | MindSpikeSaveDamageProfile => Set()
    }

  pure def spellSaveGatedTargetMaxTargets(targeting: SpellSaveGatedTargeting, slotLevel: int): int =
    match targeting {
      | SpellTargetListSaveTargets(data) =>
        data.baseTargets +
          (if (slotLevel > data.baseSlotLevel)
            (slotLevel - data.baseSlotLevel) * data.additionalTargetsPerSlotLevel
          else
            0)
      | SpellSingleSaveTarget => 1
      | SpellAreaSaveTargets => 1
    }
}
