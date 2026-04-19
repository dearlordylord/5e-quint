// -*- mode: Bluespec; -*-

module projectedExecutable {
  import creature.* from "./creature"

  // ============================================================
  // 1. SOURCE IDENTITY
  // ============================================================

  type ProjectedUnitKind =
    | PUKSpell
    | PUKClassFeature

  type ProjectedSource = {
    unitId: str,
    unitKind: ProjectedUnitKind,
    unitName: str,
  }

  // ============================================================
  // 2. EXECUTABLE TARGETING / ATTACHMENT SURFACE
  // ============================================================

  type ProjectedAreaSpherePointWithinRange = {
    rangeFeet: int,
    radiusFeet: int,
  }

  type ProjectedExecutableAttachment =
    | PEASelf
    | PEAOneTarget
    | PEAAreaSpherePointWithinRange(ProjectedAreaSpherePointWithinRange)

  // ============================================================
  // 3. EXECUTABLE CLOSED DOMAINS
  // ============================================================

  type ProjectedSaveDc =
    | PDCSpellSaveDc

  type ProjectedGrantedActionRestriction =
    | PGARExcludeMagicAction

  type ProjectedActivationCost =
    | PACAction
    | PACBonusAction
    | PACFree

  type ProjectedUsageLimit =
    | PULNone
    | PULOncePerTurn

  // ============================================================
  // 4. AMOUNT / SCALING SHAPES
  // ============================================================

  type ProjectedLevelAxis =
    | PLACharacterLevel
    | PLAFighterLevel

  type ProjectedDiceExpr = {
    dice: int,
    dieSize: int,
    flat: int,
  }

  type ProjectedThresholdDiceTier = {
    atLevel: int,
    diceOverride: int,
  }

  type ProjectedThresholdDiceAmount = {
    axis: ProjectedLevelAxis,
    base: ProjectedDiceExpr,
    tiers: List[ProjectedThresholdDiceTier],
  }

  type ProjectedLinearDicePlusLevelAmount = {
    axis: ProjectedLevelAxis,
    base: ProjectedDiceExpr,
    perLevelFlat: int,
    startingAtLevel: int,
  }

  type ProjectedAmount =
    | PAThresholdDice(ProjectedThresholdDiceAmount)
    | PALinearDicePlusLevel(ProjectedLinearDicePlusLevelAmount)

  // ============================================================
  // 5. RESOURCE / RESET SHAPES
  // ============================================================

  type ProjectedResourceAxis =
    | PRAClass

  type ProjectedResourcePool =
    | PRPSecondWind
    | PRPActionSurge

  type ProjectedThresholdUseCapTier = {
    atLevel: int,
    value: int,
  }

  type ProjectedThresholdUseCap = {
    axis: ProjectedResourceAxis,
    base: int,
    tiers: List[ProjectedThresholdUseCapTier],
  }

  type ProjectedResourceCap =
    | PRCThresholdTiers(ProjectedThresholdUseCap)

  type ProjectedPartialShortFullLong = {
    shortRestRefill: int,
  }

  type ProjectedResetCadence =
    | PRCPartialShortFullLong(ProjectedPartialShortFullLong)
    | PRCShortOrLongRest

  type ProjectedResourceGate =
    | PRGNone
    | PRGUseCount({
        pool: ProjectedResourcePool,
        cap: ProjectedResourceCap,
        resetCadence: ProjectedResetCadence,
      })

  // ============================================================
  // 6. DIRECT EXECUTABLE ACTION SURFACE
  // ============================================================

  type ProjectedExecutableBase = {
    source: ProjectedSource,
    activationCost: ProjectedActivationCost,
    resourceGate: ProjectedResourceGate,
    usageLimit: ProjectedUsageLimit,
    attachment: ProjectedExecutableAttachment,
  }

  type ProjectedSaveGateDamageAction = {
    source: ProjectedSource,
    activationCost: ProjectedActivationCost,
    resourceGate: ProjectedResourceGate,
    usageLimit: ProjectedUsageLimit,
    attachment: ProjectedExecutableAttachment,
    ability: Ability,
    dc: ProjectedSaveDc,
    damageType: DamageType,
    amount: ProjectedAmount,
  }

  type ProjectedDirectHealHpAction = {
    source: ProjectedSource,
    activationCost: ProjectedActivationCost,
    resourceGate: ProjectedResourceGate,
    usageLimit: ProjectedUsageLimit,
    attachment: ProjectedExecutableAttachment,
    amount: ProjectedAmount,
  }

  type ProjectedDirectGrantExtraActionAction = {
    source: ProjectedSource,
    activationCost: ProjectedActivationCost,
    resourceGate: ProjectedResourceGate,
    usageLimit: ProjectedUsageLimit,
    attachment: ProjectedExecutableAttachment,
    restriction: ProjectedGrantedActionRestriction,
  }

  type ProjectedExecutableAction =
    | PEASaveGateDamage(ProjectedSaveGateDamageAction)
    | PEADirectHealHp(ProjectedDirectHealHpAction)
    | PEADirectGrantExtraAction(ProjectedDirectGrantExtraActionAction)

  // ============================================================
  // 7. PERSISTENT SUBSET
  // ============================================================

  type ProjectedPersistentAttachment =
    | PPAChosenTarget

  type ProjectedPersistentEarlyEnd =
    | PPEETargetDonsArmor

  type ProjectedSetBaseAcPayload = {
    source: ProjectedSource,
    attachment: ProjectedPersistentAttachment,
    baseArmorClass: int,
    abilityModifier: Ability,
    earlyEnds: List[ProjectedPersistentEarlyEnd],
  }

  type ProjectedPersistentRecord =
    | PPRSetBaseAc(ProjectedSetBaseAcPayload)
}
