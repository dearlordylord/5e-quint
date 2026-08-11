// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE

module battleRuntimeSpellSaveBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import spellSaveDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-save-damage-projection-core"
  import spellSaveConditionProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-save-condition-projection-core"

  type BattleRuntimeSaveGatedDamageProfile =
    | BattleRuntimeAcidSplashSaveDamage
    | BattleRuntimeSacredFlameSaveDamage
    | BattleRuntimeInflictWoundsSaveDamage
    | BattleRuntimeBurningHandsSaveDamage
    | BattleRuntimeFireballSaveDamage
    | BattleRuntimeLightningBoltSaveDamage
    | BattleRuntimeViciousMockerySaveDamage
    | BattleRuntimeThunderwaveSaveDamage
    | BattleRuntimeDissonantWhispersSaveDamage
    | BattleRuntimeHellishRebukeSaveDamage
    | BattleRuntimeMindSpikeSaveDamage
  type BattleRuntimeSaveGatedConditionProfile =
    | BattleRuntimeColorSpraySaveCondition
    | BattleRuntimeEntangleSaveCondition
    | BattleRuntimeAnimalFriendshipSaveCondition
    | BattleRuntimeCharmPersonSaveCondition
    | BattleRuntimeBlindnessDeafnessSaveCondition
    | BattleRuntimeHoldMonsterSaveCondition
    | BattleRuntimeHoldPersonSaveCondition
    | BattleRuntimeFaerieFireSaveAttackRollAdvantage
  type BattleRuntimeSaveGatedTargeting =
    | BattleRuntimeSingleSaveTarget
    | BattleRuntimeAreaSaveTargets
    | BattleRuntimeTargetListSaveTargets({
        minTargets: int,
        baseSlotLevel: int,
        baseTargets: int,
        additionalTargetsPerSlotLevel: int,
      })
  type BattleRuntimeSaveGatedDamageSuccess =
    | BattleRuntimeNoDamageOnSaveSuccess
    | BattleRuntimeHalfDamageOnSaveSuccess
  type BattleRuntimeSavingThrowAbility =
    | BattleRuntimeStrengthSavingThrow
    | BattleRuntimeDexteritySavingThrow
    | BattleRuntimeConstitutionSavingThrow
    | BattleRuntimeWisdomSavingThrow
  type BattleRuntimeSaveGatedFailedEffect =
    | BattleRuntimeViciousMockeryNextAttackDisadvantageEffect
    | BattleRuntimeThunderwavePush10FeetEffect
    | BattleRuntimeDissonantWhispersForcedReactionMovementEffect
    | BattleRuntimeColorSprayBlindedEffect
    | BattleRuntimeEntangleRestrainedEffect
    | BattleRuntimeAnimalFriendshipCharmedEffect({ durationTicks: int })
    | BattleRuntimeCharmPersonCharmedEffect({ durationTicks: int })
    | BattleRuntimeBlindnessDeafnessBlindedEffect({ durationTicks: int })
    | BattleRuntimeBlindnessDeafnessDeafenedEffect({ durationTicks: int })
    | BattleRuntimeHoldMonsterParalyzedEffect({ durationTicks: int })
    | BattleRuntimeHoldPersonParalyzedEffect({ durationTicks: int })
    | BattleRuntimeFaerieFireOutlineEffect
  pure def battleRuntimeSaveGatedDamageProfile(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): SpellSaveGatedDamageProfile =
    match profile {
      | BattleRuntimeAcidSplashSaveDamage => AcidSplashSaveDamageProfile
      | BattleRuntimeSacredFlameSaveDamage => SacredFlameSaveDamageProfile
      | BattleRuntimeInflictWoundsSaveDamage => InflictWoundsSaveDamageProfile
      | BattleRuntimeBurningHandsSaveDamage => BurningHandsSaveDamageProfile
      | BattleRuntimeFireballSaveDamage => FireballSaveDamageProfile
      | BattleRuntimeLightningBoltSaveDamage => LightningBoltSaveDamageProfile
      | BattleRuntimeViciousMockerySaveDamage => ViciousMockerySaveDamageProfile
      | BattleRuntimeThunderwaveSaveDamage => ThunderwaveSaveDamageProfile
      | BattleRuntimeDissonantWhispersSaveDamage => DissonantWhispersSaveDamageProfile
      | BattleRuntimeHellishRebukeSaveDamage => HellishRebukeSaveDamageProfile
      | BattleRuntimeMindSpikeSaveDamage => MindSpikeSaveDamageProfile
    }
  pure def battleRuntimeSaveGatedConditionProfile(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): SpellSaveGatedConditionProfile =
    match profile {
      | BattleRuntimeColorSpraySaveCondition => ColorSpraySaveConditionProfile
      | BattleRuntimeEntangleSaveCondition => EntangleSaveConditionProfile
      | BattleRuntimeAnimalFriendshipSaveCondition => AnimalFriendshipSaveConditionProfile
      | BattleRuntimeCharmPersonSaveCondition => CharmPersonSaveConditionProfile
      | BattleRuntimeBlindnessDeafnessSaveCondition => BlindnessDeafnessSaveConditionProfile
      | BattleRuntimeHoldMonsterSaveCondition => HoldMonsterSaveConditionProfile
      | BattleRuntimeHoldPersonSaveCondition => HoldPersonSaveConditionProfile
      | BattleRuntimeFaerieFireSaveAttackRollAdvantage => FaerieFireSaveAttackRollAdvantageProfile
    }
  pure def battleRuntimeSaveGatedTargeting(
    targeting: SpellSaveGatedTargeting
  ): BattleRuntimeSaveGatedTargeting =
    match targeting {
      | SpellSingleSaveTarget => BattleRuntimeSingleSaveTarget
      | SpellAreaSaveTargets => BattleRuntimeAreaSaveTargets
      | SpellTargetListSaveTargets(data) => BattleRuntimeTargetListSaveTargets(data)
    }
  pure def battleRuntimeSaveGatedDamageTargeting(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): BattleRuntimeSaveGatedTargeting =
    battleRuntimeSaveGatedTargeting(
      spellSaveGatedDamageTargeting(battleRuntimeSaveGatedDamageProfile(profile))
    )
  pure def battleRuntimeSaveGatedConditionTargeting(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): BattleRuntimeSaveGatedTargeting =
    battleRuntimeSaveGatedTargeting(
      spellSaveGatedConditionTargeting(battleRuntimeSaveGatedConditionProfile(profile))
    )
  pure def battleRuntimeSavingThrowAbility(ability: SpellSavingThrowAbility): BattleRuntimeSavingThrowAbility =
    match ability {
      | SpellStrengthSavingThrow => BattleRuntimeStrengthSavingThrow
      | SpellDexteritySavingThrow => BattleRuntimeDexteritySavingThrow
      | SpellConstitutionSavingThrow => BattleRuntimeConstitutionSavingThrow
      | SpellWisdomSavingThrow => BattleRuntimeWisdomSavingThrow
    }
  pure def battleRuntimeSaveGatedConditionSavingThrowAbility(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): BattleRuntimeSavingThrowAbility =
    battleRuntimeSavingThrowAbility(
      spellSaveGatedConditionSavingThrowAbility(battleRuntimeSaveGatedConditionProfile(profile))
    )
  pure def battleRuntimeSaveGatedTargetMaxTargets(
    targeting: BattleRuntimeSaveGatedTargeting,
    slotLevel: int
  ): int =
    match targeting {
      | BattleRuntimeSingleSaveTarget => 1
      | BattleRuntimeAreaSaveTargets => 1
      | BattleRuntimeTargetListSaveTargets(data) =>
        spellSaveGatedTargetMaxTargets(SpellTargetListSaveTargets(data), slotLevel)
    }
  pure def battleRuntimeSaveGatedDamageSuccess(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): BattleRuntimeSaveGatedDamageSuccess =
    match spellSaveGatedDamageSuccess(battleRuntimeSaveGatedDamageProfile(profile)) {
      | SpellNoDamageOnSaveSuccess => BattleRuntimeNoDamageOnSaveSuccess
      | SpellHalfDamageOnSaveSuccess => BattleRuntimeHalfDamageOnSaveSuccess
    }
  pure def battleRuntimeSaveGatedDamageType(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): RuleDamageType =
    spellSaveGatedDamageType(battleRuntimeSaveGatedDamageProfile(profile))
  pure def battleRuntimeSaveGatedDamageRequiresSlot(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): bool =
    spellSaveGatedDamageRequiresSlot(battleRuntimeSaveGatedDamageProfile(profile))
  pure def battleRuntimeSaveGatedDamageRequiresConcentration(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): bool =
    spellSaveGatedDamageRequiresConcentration(battleRuntimeSaveGatedDamageProfile(profile))
  pure def battleRuntimeSaveGatedDamageFailedEffect(
    effect: SpellSaveGatedDamageFailedEffect
  ): BattleRuntimeSaveGatedFailedEffect =
    match effect {
      | ViciousMockeryNextAttackDisadvantageEffect => BattleRuntimeViciousMockeryNextAttackDisadvantageEffect
      | ThunderwavePush10FeetEffect => BattleRuntimeThunderwavePush10FeetEffect
      | DissonantWhispersForcedReactionMovementEffect => BattleRuntimeDissonantWhispersForcedReactionMovementEffect
    }
  pure def battleRuntimeSaveGatedConditionFailedEffect(
    effect: SpellSaveGatedConditionFailedEffect
  ): BattleRuntimeSaveGatedFailedEffect =
    match effect {
      | ColorSprayBlindedEffect => BattleRuntimeColorSprayBlindedEffect
      | EntangleRestrainedEffect => BattleRuntimeEntangleRestrainedEffect
      | AnimalFriendshipCharmedEffect(data) => BattleRuntimeAnimalFriendshipCharmedEffect({ durationTicks: data.durationTicks })
      | CharmPersonCharmedEffect(data) => BattleRuntimeCharmPersonCharmedEffect({ durationTicks: data.durationTicks })
      | BlindnessDeafnessBlindedEffect(data) => BattleRuntimeBlindnessDeafnessBlindedEffect({ durationTicks: data.durationTicks })
      | BlindnessDeafnessDeafenedEffect(data) => BattleRuntimeBlindnessDeafnessDeafenedEffect({ durationTicks: data.durationTicks })
      | HoldMonsterParalyzedEffect(data) => BattleRuntimeHoldMonsterParalyzedEffect({ durationTicks: data.durationTicks })
      | HoldPersonParalyzedEffect(data) => BattleRuntimeHoldPersonParalyzedEffect({ durationTicks: data.durationTicks })
      | FaerieFireOutlineEffect => BattleRuntimeFaerieFireOutlineEffect
    }
  pure def battleRuntimeSaveGatedDamageFailedSaveEffects(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): Set[BattleRuntimeSaveGatedFailedEffect] =
    spellSaveGatedDamageFailedSaveEffects(battleRuntimeSaveGatedDamageProfile(profile))
      .map(battleRuntimeSaveGatedDamageFailedEffect)
  pure def battleRuntimeSaveGatedConditionFailedSaveEffects(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): Set[BattleRuntimeSaveGatedFailedEffect] =
    spellSaveGatedConditionFailedSaveEffects(battleRuntimeSaveGatedConditionProfile(profile))
      .map(battleRuntimeSaveGatedConditionFailedEffect)
  pure def battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(
    profile: BattleRuntimeSaveGatedConditionProfile,
    targetIsBeast: bool,
    targetIsHumanoid: bool
  ): bool =
    spellSaveGatedConditionTargetCreatureTypeIsLegal(
      battleRuntimeSaveGatedConditionProfile(profile),
      targetIsBeast,
      targetIsHumanoid,
    )
  pure def battleRuntimeSaveGatedConditionSavingThrowHasAdvantage(
    profile: BattleRuntimeSaveGatedConditionProfile,
    targetIsHostile: bool
  ): bool =
    spellSaveGatedConditionSavingThrowHasAdvantage(
      battleRuntimeSaveGatedConditionProfile(profile),
      targetIsHostile,
    )
}
