// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.creature-type-protection-and-charm

module battleRuntimeCreatureTypeProtection {
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def protectionFromEvilAndGoodCreatureTypeIsScoped(creatureType: RuntimeCreatureType): bool =
    creatureType == AberrationCreature or
    creatureType == CelestialCreature or
    creatureType == ElementalCreature or
    creatureType == FeyCreature or
    creatureType == FiendCreature or
    creatureType == UndeadCreature

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

  pure def protectionRelevantEffectSourceIsScoped(
    creatureTypesByActor: Actor -> RuntimeCreatureType,
    source: Actor,
  ): bool =
    if (creatureTypesByActor.keys().contains(source))
      protectionFromEvilAndGoodCreatureTypeIsScoped(creatureTypesByActor.get(source))
    else
      false

  pure def protectionFromEvilAndGoodRelevantEffectSaveRollMode(
    creatureTypesByActor: Actor -> RuntimeCreatureType,
    targetEffects: Set[ActiveEffect],
    relevantEffect: ActiveEffect,
  ): SavingThrowRollMode =
    if (
      targetEffects.contains(ProtectionFromEvilAndGoodCreatureTypeProtection)
      and targetEffects.contains(relevantEffect)
    ) {
      match relevantEffect {
        | ProtectionRelevantCharmed(effect) =>
            if (protectionRelevantEffectSourceIsScoped(creatureTypesByActor, effect.source))
              AdvantageSavingThrow
            else
              NormalSavingThrow
        | ProtectionRelevantFrightened(effect) =>
            if (protectionRelevantEffectSourceIsScoped(creatureTypesByActor, effect.source))
              AdvantageSavingThrow
            else
              NormalSavingThrow
        | ProtectionRelevantPossession(effect) =>
            if (protectionRelevantEffectSourceIsScoped(creatureTypesByActor, effect.source))
              AdvantageSavingThrow
            else
              NormalSavingThrow
        | _ => NormalSavingThrow
      }
    } else NormalSavingThrow

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
      | BlindnessDeafnessSaveGate => false
      | HoldMonsterSaveGate => false
      | HoldPersonSaveGate => false
    }
}
