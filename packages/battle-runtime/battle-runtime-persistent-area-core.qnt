// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-fog-cloud-obscurement

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE
//
// Identity-free mechanics shared by persistent and movable area procedures.
// Authored spell modules provide SRD fixture parameters and projection bridges;
// this module owns the reusable lifecycle, identity, save, movement, and damage
// relationships consumed by those fixtures.
//
// RAW anchors:
// - Spells/Descriptions-A-D.md#Cloudkill
// - Spells/Descriptions-E-L.md#Flaming-Sphere, #Fog-Cloud, #Grease,
//   #Gust-of-Wind, and #Insect-Plague
// - Spells/Descriptions-M-P.md#Moonbeam
// - Spells/Descriptions-S-Z.md#Sleet-Storm, #Spike-Growth, and #Web
// - UBIQUITOUS_LANGUAGE.md entries for Spell Effect, Area of Effect,
//   Movement, Saving Throw, Damage Type, and Boundary Crossing.

module battleRuntimePersistentAreaCore {
  import spellSaveGate.* from "../shared-algebras/proofs/rule-core/spell-save-gate"

  type PersistentAreaIdentity[a] = {
    activeEffectAreaId: a,
    projectedZoneAreaId: a,
  }

  type PersistentAreaIdentityState[a] =
    | PersistentAreaAbsent
    | PersistentAreaPresent(PersistentAreaIdentity[a])

  type PersistentAreaActionCost =
    | PersistentAreaMagicAction
    | PersistentAreaBonusAction

  type PersistentAreaTranslationDirection =
    | PersistentAreaAwayFromSource

  type PersistentAreaLifecycle =
    | StationaryPersistentArea
    | SourceTurnTranslationPersistentArea({
        distanceFeet: int,
        direction: PersistentAreaTranslationDirection,
      })
    | CasterActionRepositionPersistentArea({
        actionCost: PersistentAreaActionCost,
        maxDistanceFeet: int,
      })
    | CasterBonusActionDirectionReplacementPersistentArea

  pure def persistentAreaIdentity(areaId: a): PersistentAreaIdentity[a] = {
    activeEffectAreaId: areaId,
    projectedZoneAreaId: areaId,
  }

  pure def installPersistentAreaIdentity(areaId: a): PersistentAreaIdentityState[a] =
    PersistentAreaPresent(persistentAreaIdentity(areaId))

  pure def replacePersistentAreaIdentity(
    state: PersistentAreaIdentityState[a],
    areaId: a,
  ): PersistentAreaIdentityState[a] =
    match state {
      | PersistentAreaAbsent => state
      | PersistentAreaPresent(_) => installPersistentAreaIdentity(areaId)
    }

  pure def retainPersistentAreaIdentity(
    state: PersistentAreaIdentityState[a],
  ): PersistentAreaIdentityState[a] = state

  pure def endPersistentAreaIdentity(
    state: PersistentAreaIdentityState[a],
  ): PersistentAreaIdentityState[a] =
    match state {
      | PersistentAreaAbsent => state
      | PersistentAreaPresent(_) => PersistentAreaAbsent
    }

  pure def persistentAreaIdentityCoherent(
    state: PersistentAreaIdentityState[a],
  ): bool =
    match state {
      | PersistentAreaAbsent => true
      | PersistentAreaPresent(identity) =>
          identity.activeEffectAreaId == identity.projectedZoneAreaId
    }

  pure def persistentAreaIdentityRetains(
    before: PersistentAreaIdentityState[a],
    after: PersistentAreaIdentityState[a],
  ): bool = before == after

  pure def persistentAreaScaledDamageDice(
    slotLevel: int,
    minimumSlotLevel: int,
    baseDamageDice: int,
  ): int =
    baseDamageDice + (slotLevel - minimumSlotLevel)

  pure def persistentAreaDamageRollAccepted(
    rolledDamage: int,
    damageDice: int,
    damageDieSize: int,
  ): bool =
    damageDice > 0 and
    damageDieSize > 0 and
    rolledDamage >= damageDice and
    rolledDamage <= damageDice * damageDieSize

  pure def persistentAreaDamageAfterSave(
    rolledDamage: int,
    savingThrowSucceeded: bool,
  ): int = {
    val branch = spellSaveGateBranch(savingThrowSucceeded)
    val damageResult = spellSaveGateDamageResult(branch, SpellSaveGateHalfDamageOnSuccess)
    spellSaveGateDamageAmount(rolledDamage, damageResult)
  }

  pure def persistentAreaMoveDistanceAccepted(
    moveFeet: int,
    maxMoveFeet: int,
  ): bool =
    moveFeet > 0 and moveFeet <= maxMoveFeet

  pure def persistentAreaMovementDamageAmount(
    rolledDamagePerInterval: int,
    movementFeet: int,
    intervalFeet: int,
  ): int =
    if (movementFeet <= 0 or intervalFeet <= 0)
      0
    else
      rolledDamagePerInterval * (movementFeet / intervalFeet)

  pure def directionalPersistentAreaMovementCost(
    totalDistanceFeet: int,
    movementAgainstDirectionFeet: int,
  ): int =
    if (
      totalDistanceFeet > 0 and
      movementAgainstDirectionFeet > 0 and
      movementAgainstDirectionFeet <= totalDistanceFeet
    )
      totalDistanceFeet + movementAgainstDirectionFeet
    else
      0

  pure def persistentAreaConditionApplies(
    savingThrowSucceeded: bool,
  ): bool = not(savingThrowSucceeded)

  pure def persistentAreaSlotScaledDistanceFeet(
    slotLevel: int,
    minimumSlotLevel: int,
    baseDistanceFeet: int,
    distanceFeetPerSlotAboveMinimum: int,
  ): int =
    baseDistanceFeet +
    (slotLevel - minimumSlotLevel) * distanceFeetPerSlotAboveMinimum
}
