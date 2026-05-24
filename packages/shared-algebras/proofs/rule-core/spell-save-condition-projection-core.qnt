// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellSaveConditionProjectionCore {
  import spellSaveDamageProjectionCore.* from "./spell-save-damage-projection-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Saving Throws and Using a Higher-Level
  //   Spell Slot.
  // - Rules-Glossary.md: Beast, Humanoid, Saving Throw effect notation, and
  //   Blinded, Charmed, Deafened, Paralyzed, Restrained, and Invisible
  //   conditions.
  // - Spells/Descriptions-A-D.md: Animal Friendship, Blindness/Deafness, Charm
  //   Person, and Color Spray.
  // - Spells/Descriptions-E-L.md: Entangle, Faerie Fire, and Hold Person.
  // - UBIQUITOUS_LANGUAGE.md: Saving Throw, Spell Save DC, Advantage and
  //   Disadvantage, and condition terminology.

  type SpellSavingThrowAbility =
    | SpellStrengthSavingThrow
    | SpellDexteritySavingThrow
    | SpellConstitutionSavingThrow
    | SpellWisdomSavingThrow

  type SpellSaveGatedConditionProfile =
    | ColorSpraySaveConditionProfile
    | EntangleSaveConditionProfile
    | AnimalFriendshipSaveConditionProfile
    | CharmPersonSaveConditionProfile
    | BlindnessDeafnessSaveConditionProfile
    | HoldPersonSaveConditionProfile
    | FaerieFireSaveAttackRollAdvantageProfile

  type SpellSaveGatedConditionFailedEffect =
    | ColorSprayBlindedEffect
    | EntangleRestrainedEffect
    | AnimalFriendshipCharmedEffect({ durationTicks: int })
    | CharmPersonCharmedEffect({ durationTicks: int })
    | BlindnessDeafnessBlindedEffect({ durationTicks: int })
    | BlindnessDeafnessDeafenedEffect({ durationTicks: int })
    | HoldPersonParalyzedEffect({ durationTicks: int })
    | FaerieFireOutlineEffect

  pure def spellSaveGatedConditionTargeting(profile: SpellSaveGatedConditionProfile): SpellSaveGatedTargeting =
    match profile {
      | ColorSpraySaveConditionProfile => SpellAreaSaveTargets
      | EntangleSaveConditionProfile => SpellAreaSaveTargets
      | AnimalFriendshipSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | CharmPersonSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | BlindnessDeafnessSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 2, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | HoldPersonSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 2, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | FaerieFireSaveAttackRollAdvantageProfile => SpellAreaSaveTargets
    }

  pure def spellSaveGatedConditionSavingThrowAbility(profile: SpellSaveGatedConditionProfile): SpellSavingThrowAbility =
    match profile {
      | ColorSpraySaveConditionProfile => SpellConstitutionSavingThrow
      | EntangleSaveConditionProfile => SpellStrengthSavingThrow
      | AnimalFriendshipSaveConditionProfile => SpellWisdomSavingThrow
      | CharmPersonSaveConditionProfile => SpellWisdomSavingThrow
      | BlindnessDeafnessSaveConditionProfile => SpellConstitutionSavingThrow
      | HoldPersonSaveConditionProfile => SpellWisdomSavingThrow
      | FaerieFireSaveAttackRollAdvantageProfile => SpellDexteritySavingThrow
    }

  pure def spellSaveGatedConditionFailedSaveEffects(profile: SpellSaveGatedConditionProfile): Set[SpellSaveGatedConditionFailedEffect] =
    match profile {
      | ColorSpraySaveConditionProfile => Set(ColorSprayBlindedEffect)
      | EntangleSaveConditionProfile => Set(EntangleRestrainedEffect)
      | AnimalFriendshipSaveConditionProfile => Set(AnimalFriendshipCharmedEffect({ durationTicks: 24 * 60 }))
      | CharmPersonSaveConditionProfile => Set(CharmPersonCharmedEffect({ durationTicks: 10 * 60 }))
      | BlindnessDeafnessSaveConditionProfile => Set(
          BlindnessDeafnessBlindedEffect({ durationTicks: 10 }),
          BlindnessDeafnessDeafenedEffect({ durationTicks: 10 })
        )
      | HoldPersonSaveConditionProfile => Set(HoldPersonParalyzedEffect({ durationTicks: 10 }))
      | FaerieFireSaveAttackRollAdvantageProfile => Set(FaerieFireOutlineEffect)
    }

  pure def spellSaveGatedConditionTargetCreatureTypeIsLegal(
    profile: SpellSaveGatedConditionProfile,
    targetIsBeast: bool,
    targetIsHumanoid: bool
  ): bool =
    match profile {
      | AnimalFriendshipSaveConditionProfile => targetIsBeast
      | CharmPersonSaveConditionProfile => targetIsHumanoid
      | BlindnessDeafnessSaveConditionProfile => true
      | HoldPersonSaveConditionProfile => targetIsHumanoid
      | _ => true
    }

  pure def spellSaveGatedConditionSavingThrowHasAdvantage(
    profile: SpellSaveGatedConditionProfile,
    targetIsHostile: bool
  ): bool =
    profile == CharmPersonSaveConditionProfile and targetIsHostile
}
