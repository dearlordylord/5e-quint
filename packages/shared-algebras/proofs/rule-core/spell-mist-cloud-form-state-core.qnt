// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MIST_CLOUD_FORM_STATE
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001

module spellMistCloudFormStateCore {
  // RAW anchors:
  // - Spells/Descriptions-E-L.md: Gaseous Form target, duration, misty cloud
  //   transformation, worn/carried objects, movement replacement, defensive
  //   passives, zero-Hit-Point end, target Magic Action self-end, and normal
  //   spell end.
  // - Spells/Gaining-and-Casting.md: Concentration duration follows the
  //   Concentration rules.

  type MistCloudTransformedObjects =
    | WornAndCarriedObjects

  type MistCloudMovementSpeedKind =
    | MistCloudFlySpeed

  type MistCloudMovementReplacement = {
    onlyMovementSpeedKind: MistCloudMovementSpeedKind,
    feet: int,
    hover: bool
  }

  type MistCloudDamageResistance =
    | MistCloudBludgeoningResistance
    | MistCloudPiercingResistance
    | MistCloudSlashingResistance

  type MistCloudConditionImmunity =
    | MistCloudProneImmunity

  type MistCloudSavingThrowAdvantage =
    | MistCloudStrengthSavingThrowAdvantage
    | MistCloudDexteritySavingThrowAdvantage
    | MistCloudConstitutionSavingThrowAdvantage

  type MistCloudActivityRestriction =
    | MistCloudCannotTalk
    | MistCloudCannotManipulateObjects
    | MistCloudCarriedOrHeldObjectsCannotBeDroppedUsedOrInteractedWith
    | MistCloudCannotAttack
    | MistCloudCannotCastSpells

  type MistCloudTableSpatialWitness =
    | MistCloudCanOccupyAnotherCreatureSpace
    | MistCloudCanPassThroughNarrowOpenings
    | MistCloudTreatsLiquidsAsSolidSurfaces

  type MistCloudPassiveProjection = {
    damageResistances: Set[MistCloudDamageResistance],
    conditionImmunities: Set[MistCloudConditionImmunity],
    savingThrowAdvantages: Set[MistCloudSavingThrowAdvantage]
  }

  type MistCloudFormEndCause =
    | MistCloudTargetDropsToZeroHitPoints
    | MistCloudTargetMagicActionDismissal
    | MistCloudSpellEnds

  type MistCloudFormAdmissionFacts = {
    actionCastingTime: bool,
    touchRange: bool,
    concentrationUpToHour: bool,
    targetIsWillingCreature: bool,
    transformedObjects: MistCloudTransformedObjects,
    movementReplacement: MistCloudMovementReplacement,
    passiveProjection: MistCloudPassiveProjection,
    activityRestrictions: Set[MistCloudActivityRestriction],
    tableSpatialWitnesses: Set[MistCloudTableSpatialWitness],
    hasZeroHitPointEnd: bool,
    hasTargetMagicActionEnd: bool,
    hasSpellEndCleanup: bool
  }

  type MistCloudFormActiveEffect = {
    sourceSpellKey: int,
    sourceCombatantKey: int,
    targetCombatantKey: int,
    transformedObjects: MistCloudTransformedObjects,
    movementReplacement: MistCloudMovementReplacement,
    passiveProjection: MistCloudPassiveProjection,
    activityRestrictions: Set[MistCloudActivityRestriction],
    tableSpatialWitnesses: Set[MistCloudTableSpatialWitness],
    endCauses: Set[MistCloudFormEndCause],
    concentrationOwnerKey: int,
    durationTicks: int
  }

  type MistCloudFormAdmission =
    | MistCloudFormAccepted(MistCloudFormActiveEffect)
    | MistCloudFormRejected

  pure def mistCloudFormDurationTicks: int = 60 * 10

  pure def mistCloudFormMovementReplacement: MistCloudMovementReplacement = {
    onlyMovementSpeedKind: MistCloudFlySpeed,
    feet: 10,
    hover: true,
  }

  pure def mistCloudFormPassiveProjection: MistCloudPassiveProjection = {
    damageResistances: Set(
      MistCloudBludgeoningResistance,
      MistCloudPiercingResistance,
      MistCloudSlashingResistance
    ),
    conditionImmunities: Set(MistCloudProneImmunity),
    savingThrowAdvantages: Set(
      MistCloudStrengthSavingThrowAdvantage,
      MistCloudDexteritySavingThrowAdvantage,
      MistCloudConstitutionSavingThrowAdvantage
    ),
  }

  pure def mistCloudFormEndCauses: Set[MistCloudFormEndCause] =
    Set(
      MistCloudTargetDropsToZeroHitPoints,
      MistCloudTargetMagicActionDismissal,
      MistCloudSpellEnds
    )

  pure def mistCloudFormActivityRestrictions: Set[MistCloudActivityRestriction] =
    Set(
      MistCloudCannotTalk,
      MistCloudCannotManipulateObjects,
      MistCloudCarriedOrHeldObjectsCannotBeDroppedUsedOrInteractedWith,
      MistCloudCannotAttack,
      MistCloudCannotCastSpells
    )

  pure def mistCloudFormTableSpatialWitnesses: Set[MistCloudTableSpatialWitness] =
    Set(
      MistCloudCanOccupyAnotherCreatureSpace,
      MistCloudCanPassThroughNarrowOpenings,
      MistCloudTreatsLiquidsAsSolidSurfaces
    )

  pure def legalMistCloudFormAdmissionFacts(facts: MistCloudFormAdmissionFacts): bool =
    all {
      facts.actionCastingTime,
      facts.touchRange,
      facts.concentrationUpToHour,
      facts.targetIsWillingCreature,
      facts.transformedObjects == WornAndCarriedObjects,
      facts.movementReplacement == mistCloudFormMovementReplacement,
      facts.passiveProjection == mistCloudFormPassiveProjection,
      facts.activityRestrictions == mistCloudFormActivityRestrictions,
      facts.tableSpatialWitnesses == mistCloudFormTableSpatialWitnesses,
      facts.hasZeroHitPointEnd,
      facts.hasTargetMagicActionEnd,
      facts.hasSpellEndCleanup,
    }

  pure def admitMistCloudFormEffect(
    sourceSpellKey: int,
    sourceCombatantKey: int,
    targetCombatantKey: int,
    facts: MistCloudFormAdmissionFacts
  ): MistCloudFormAdmission =
    if (legalMistCloudFormAdmissionFacts(facts)) {
      MistCloudFormAccepted({
        sourceSpellKey: sourceSpellKey,
        sourceCombatantKey: sourceCombatantKey,
        targetCombatantKey: targetCombatantKey,
        transformedObjects: facts.transformedObjects,
        movementReplacement: facts.movementReplacement,
        passiveProjection: facts.passiveProjection,
        activityRestrictions: facts.activityRestrictions,
        tableSpatialWitnesses: facts.tableSpatialWitnesses,
        endCauses: mistCloudFormEndCauses,
        concentrationOwnerKey: sourceCombatantKey,
        durationTicks: mistCloudFormDurationTicks,
      })
    } else MistCloudFormRejected
}
