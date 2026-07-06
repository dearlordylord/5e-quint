// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.bardic-inspiration-grant unit-feature.bardic-inspiration-failed-d20-test
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.bardic-inspiration-grant unit-feature.bardic-inspiration-failed-d20-test

module battleRuntimeBardicInspiration {
  import attackRollDamageDiceCore.* from "../shared-algebras/proofs/rule-core/attack-roll-damage-dice-core"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def cuttingWordsAttackRollTotal(attackTotal: int, bardicInspirationRoll: int): int =
    battleRuntimeCuttingWordsRollTotal(attackTotal, bardicInspirationRoll)

  pure def cuttingWordsAbilityCheckTotal(originalTotal: int, bardicInspirationRoll: int): int =
    battleRuntimeCuttingWordsRollTotal(originalTotal, bardicInspirationRoll)

  pure def abilityCheckSucceeds(total: int, dc: int): bool =
    total >= dc

  pure def cuttingWordsAbilityCheckResolution(
    originalTotal: int,
    dc: int,
    bardicInspirationRoll: int,
    bardCanSeeCreature: bool,
    creatureWithinSixtyFeet: bool,
    reactionAvailable: bool,
    bardicInspirationUsesRemaining: int,
  ): CuttingWordsResult = {
    if (battleRuntimeCuttingWordsAbilityCheckAdmitted(
      originalTotal,
      dc,
      bardicInspirationRoll,
      bardCanSeeCreature,
      creatureWithinSixtyFeet,
      reactionAvailable,
      bardicInspirationUsesRemaining,
    ))
      {
        state: { ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } },
        usesRemaining: bardicInspirationUsesRemaining - 1,
      }
    else
      { state: initialState, usesRemaining: bardicInspirationUsesRemaining }
  }

  pure def bardicInspirationUses(charismaModifier: int): int =
    if (charismaModifier > 1) charismaModifier else 1

  pure def bardicInspirationDieSizeAtClassLevel(bardLevel: int): int =
    if (bardLevel >= 15) 12
    else if (bardLevel >= 10) 10
    else if (bardLevel >= 5) 8
    else 6

  pure def hasBardicInspirationDie(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | BardicInspirationDie(_) => true
      | _ => false
    })

  pure def bardicInspirationGrantAdmitted(
    targetWithinSixtyFeet: bool,
    targetCanSeeBard: bool,
    targetCanHearBard: bool,
    targetUnconscious: bool,
    bonusActionAvailable: bool,
    usesRemaining: int,
    targetHasBardicInspirationDie: bool,
  ): bool =
    targetWithinSixtyFeet
      and not(targetUnconscious)
      and (targetCanSeeBard or targetCanHearBard)
      and bonusActionAvailable
      and usesRemaining > 0
      and not(targetHasBardicInspirationDie)

  pure def bardicInspirationTargetEffectsAfterGrant(
    effects: Set[ActiveEffect],
    source: Actor,
    bardLevel: int,
  ): Set[ActiveEffect] =
    effects.union(Set(BardicInspirationDie({
      source: source,
      dieSize: bardicInspirationDieSizeAtClassLevel(bardLevel),
      durationTicks: 600,
    })))

  pure def bardicInspirationUsesAfterGrant(
    usesRemaining: int,
    grantAdmitted: bool,
  ): int =
    if (grantAdmitted) usesRemaining - 1 else usesRemaining

  pure def bardicInspirationD20TestTotal(originalTotal: int, bardicInspirationRoll: int): int =
    originalTotal + bardicInspirationRoll

  pure def bardicInspirationDifficultyClassD20TestSucceeds(total: int, dc: int): bool =
    total >= dc

  pure def bardicInspirationAttackRollSucceeds(
    total: int,
    naturalD20: int,
    armorClass: int,
    criticalThreshold: int,
  ): bool =
    resolveAttackRoll({
      naturalD20: naturalD20,
      total: total,
      armorClass: armorClass,
      criticalThreshold: criticalThreshold,
    }).hits

  pure def bardicInspirationDifficultyClassD20TestAdmitted(
    hasBardicInspirationDie: bool,
    dieSize: int,
    originalTotal: int,
    dc: int,
    bardicInspirationRoll: int,
  ): bool =
    hasBardicInspirationDie
      and not(bardicInspirationDifficultyClassD20TestSucceeds(originalTotal, dc))
      and bardicInspirationRoll >= 1
      and bardicInspirationRoll <= dieSize

  pure def bardicInspirationAttackRollAdmitted(
    hasBardicInspirationDie: bool,
    dieSize: int,
    originalTotal: int,
    naturalD20: int,
    armorClass: int,
    criticalThreshold: int,
    bardicInspirationRoll: int,
  ): bool =
    hasBardicInspirationDie
      and not(bardicInspirationAttackRollSucceeds(originalTotal, naturalD20, armorClass, criticalThreshold))
      and bardicInspirationRoll >= 1
      and bardicInspirationRoll <= dieSize

  pure def bardicInspirationEffectsAfterDieRoll(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | BardicInspirationDie(_) => false
      | _ => true
    })

}
