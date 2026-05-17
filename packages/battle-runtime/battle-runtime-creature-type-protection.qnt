// -*- mode: Bluespec; -*-

module battleRuntimeCreatureTypeProtection {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def protectionFromEvilAndGoodCreatureTypeIsScoped(creatureType: RuntimeCreatureType): bool =
    creatureType == AberrationCreature or
    creatureType == CelestialCreature or
    creatureType == ElementalCreature or
    creatureType == FeyCreature or
    creatureType == FiendCreature or
    creatureType == UndeadCreature

  pure def spellAttackRollModeFromCreatureTypeScopedActiveEffects(
    attackerCreatureType: RuntimeCreatureType,
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): SpellAttackRollMode = {
    val hasAdvantage =
      targetEffects.contains(GuidingBoltNextAttackAdvantage)
      or (attackerCanSeeTarget and targetEffects.contains(FaerieFireOutline))
    val hasDisadvantage =
      attackerEffects.contains(ViciousMockeryNextAttackDisadvantage)
      or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false })
      or (
        targetEffects.contains(ProtectionFromEvilAndGoodCreatureTypeProtection)
        and protectionFromEvilAndGoodCreatureTypeIsScoped(attackerCreatureType)
      )
    if (hasAdvantage and not(hasDisadvantage))
      AdvantageSpellAttackRoll
    else if (hasDisadvantage and not(hasAdvantage))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll
  }

  pure def protectionFromEvilAndGoodConditionIsPrevented(condition: PreventedProtectionCondition): bool =
    condition == PreventedCharmed or condition == PreventedFrightened

  pure def protectionFromEvilAndGoodPreventsConditionFromCreatureType(
    sourceCreatureType: RuntimeCreatureType,
    targetEffects: Set[ActiveEffect],
    condition: PreventedProtectionCondition,
  ): bool =
    targetEffects.contains(ProtectionFromEvilAndGoodCreatureTypeProtection) and
    protectionFromEvilAndGoodCreatureTypeIsScoped(sourceCreatureType) and
    protectionFromEvilAndGoodConditionIsPrevented(condition)

  pure def protectionFromEvilAndGoodPreventsPossessionFromCreatureType(
    sourceCreatureType: RuntimeCreatureType,
    targetEffects: Set[ActiveEffect],
  ): bool =
    targetEffects.contains(ProtectionFromEvilAndGoodCreatureTypeProtection) and
    protectionFromEvilAndGoodCreatureTypeIsScoped(sourceCreatureType)

  pure def possessionAttemptDispositionFromCreatureTypeProtection(
    sourceCreatureType: RuntimeCreatureType,
    targetEffects: Set[ActiveEffect],
  ): PossessionAttemptDisposition =
    if (protectionFromEvilAndGoodPreventsPossessionFromCreatureType(sourceCreatureType, targetEffects))
      PossessionPreventedByCreatureTypeProtection
    else
      PossessionUnprevented

  pure def protectionRelevantEffectHasSource(effect: ActiveEffect): bool =
    match effect {
      | ProtectionRelevantCharmed(_) => true
      | ProtectionRelevantFrightened(_) => true
      | ProtectionRelevantPossession(_) => true
      | _ => false
    }

  pure def protectionFromEvilAndGoodRelevantEffectSaveRollMode(
    sourceCreatureType: RuntimeCreatureType,
    targetEffects: Set[ActiveEffect],
    relevantEffect: ActiveEffect,
  ): SavingThrowRollMode =
    if (
      targetEffects.contains(ProtectionFromEvilAndGoodCreatureTypeProtection)
      and targetEffects.contains(relevantEffect)
      and protectionFromEvilAndGoodCreatureTypeIsScoped(sourceCreatureType)
      and protectionRelevantEffectHasSource(relevantEffect)
    )
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def saveGatedConditionPreventedByCreatureTypeProtection(
    invocation: SaveGatedConditionInvocation,
    sourceCreatureType: RuntimeCreatureType,
    targetEffects: Set[ActiveEffect],
  ): bool =
    match invocation {
      | AnimalFriendshipSaveGate =>
          protectionFromEvilAndGoodPreventsConditionFromCreatureType(sourceCreatureType, targetEffects, PreventedCharmed)
      | CharmPersonSaveGate =>
          protectionFromEvilAndGoodPreventsConditionFromCreatureType(sourceCreatureType, targetEffects, PreventedCharmed)
      | ColorSpraySaveGate => false
      | EntangleSaveGate => false
    }
}
