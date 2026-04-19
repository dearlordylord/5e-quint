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

  type ProjectedAttackKind =
    | PAKWeaponAttack

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
        cap: ProjectedResourceCap,
        resetCadence: ProjectedResetCadence,
      })

  // ============================================================
  // 6. EXECUTABLE GRAPH SURFACE
  // ============================================================

  type ProjectedNodeId = int

  type ProjectedContinuation =
    | PCDone
    | PCNode(ProjectedNodeId)

  type ProjectedAttackRollNode = {
    nodeId: ProjectedNodeId,
    attachment: ProjectedExecutableAttachment,
    attackKind: ProjectedAttackKind,
    onHit: ProjectedContinuation,
    onMiss: ProjectedContinuation,
  }

  type ProjectedSaveGateNode = {
    nodeId: ProjectedNodeId,
    ability: Ability,
    dc: ProjectedSaveDc,
    attachment: ProjectedExecutableAttachment,
    onFail: ProjectedContinuation,
    onSuccess: ProjectedContinuation,
  }

  type ProjectedDirectNode = {
    nodeId: ProjectedNodeId,
    attachment: ProjectedExecutableAttachment,
    next: ProjectedContinuation,
  }

  type ProjectedDamageNode = {
    nodeId: ProjectedNodeId,
    damageType: DamageType,
    amount: ProjectedAmount,
    next: ProjectedContinuation,
  }

  type ProjectedHealHpNode = {
    nodeId: ProjectedNodeId,
    amount: ProjectedAmount,
    next: ProjectedContinuation,
  }

  type ProjectedGrantExtraActionNode = {
    nodeId: ProjectedNodeId,
    restriction: ProjectedGrantedActionRestriction,
    next: ProjectedContinuation,
  }

  type ProjectedExecutableNode =
    | PENAttackRoll(ProjectedAttackRollNode)
    | PENSaveGate(ProjectedSaveGateNode)
    | PENDirect(ProjectedDirectNode)
    | PENDamage(ProjectedDamageNode)
    | PENHealHp(ProjectedHealHpNode)
    | PENGrantExtraAction(ProjectedGrantExtraActionNode)

  type ProjectedExecutableAction = {
    source: ProjectedSource,
    activationCost: ProjectedActivationCost,
    resourceGate: ProjectedResourceGate,
    usageLimit: ProjectedUsageLimit,
    entryNode: ProjectedNodeId,
    nodes: List[ProjectedExecutableNode],
  }

  // ============================================================
  // 7. PERSISTENT SUBSET
  // ============================================================

  type ProjectedPersistentAttachment =
    | PPAChosenTarget

  type ProjectedSetBaseAcPayload = {
    source: ProjectedSource,
    attachment: ProjectedPersistentAttachment,
  }

  type ProjectedPersistentRecord =
    | PPRSetBaseAc(ProjectedSetBaseAcPayload)

  pure val MAGE_ARMOR_BASE_AC: int = 13

  pure val MAGE_ARMOR_ABILITY_MOD: Ability = Dex

  pure val MAGE_ARMOR_DURATION_HOURS: int = 8

  type ProjectedMageArmorEarlyEnd =
    | PMEETargetDonsArmor

  pure val MAGE_ARMOR_EARLY_END: ProjectedMageArmorEarlyEnd =
    PMEETargetDonsArmor
}
