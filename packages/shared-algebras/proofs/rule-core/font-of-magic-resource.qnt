// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.font-of-magic-slot-to-sorcery-points character-sheet.font-of-magic-sorcery-points-to-spell-slot

module fontOfMagicResource {
  import featureResourcePool.* from "./feature-resource-pool"

  type FontOfMagicCreatedSlotProjection = {
    sorceryPoints: ResourcePoolFacts,
    createdSpellSlot: ResourcePoolFacts,
  }

  type FontOfMagicSlotToPointsProjection = {
    sorceryPoints: ResourcePoolFacts,
    ordinarySpellSlot: ResourcePoolFacts,
    createdSpellSlot: ResourcePoolFacts,
  }

  pure def fontOfMagicSpellSlotPointGain(spellSlotLevel: int): int =
    spellSlotLevel

  pure def legalFontOfMagicConvertibleSpellSlotLevel(spellSlotLevel: int): bool =
    spellSlotLevel >= 1 and spellSlotLevel <= 9

  pure def fontOfMagicSpellSlotSourceRequiresChoice(
    ordinarySpellSlot: ResourcePoolFacts,
    createdSpellSlot: ResourcePoolFacts,
  ): bool =
    resourcePoolRemaining(ordinarySpellSlot) > 0 and resourcePoolRemaining(createdSpellSlot) > 0

  pure def canConvertFontOfMagicSlotToSorceryPoints(
    sorceryPoints: ResourcePoolFacts,
    spellSlotLevel: int,
    ordinarySpellSlot: ResourcePoolFacts,
    createdSpellSlot: ResourcePoolFacts,
  ): bool = all {
    legalFontOfMagicConvertibleSpellSlotLevel(spellSlotLevel),
    legalResourcePool(ordinarySpellSlot),
    legalResourcePool(createdSpellSlot),
    resourcePoolRemaining(ordinarySpellSlot) + resourcePoolRemaining(createdSpellSlot) > 0,
    not(fontOfMagicSpellSlotSourceRequiresChoice(ordinarySpellSlot, createdSpellSlot)),
    canRecoverResourcePool(sorceryPoints, fontOfMagicSpellSlotPointGain(spellSlotLevel)),
  }

  pure def convertFontOfMagicSlotToSorceryPoints(
    sorceryPoints: ResourcePoolFacts,
    spellSlotLevel: int,
    ordinarySpellSlot: ResourcePoolFacts,
    createdSpellSlot: ResourcePoolFacts,
  ): FontOfMagicSlotToPointsProjection =
    if (resourcePoolRemaining(ordinarySpellSlot) > 0) {
      sorceryPoints: recoverResourcePool(sorceryPoints, fontOfMagicSpellSlotPointGain(spellSlotLevel)),
      ordinarySpellSlot: spendResourcePool(ordinarySpellSlot, 1),
      createdSpellSlot: createdSpellSlot,
    } else {
      sorceryPoints: recoverResourcePool(sorceryPoints, fontOfMagicSpellSlotPointGain(spellSlotLevel)),
      ordinarySpellSlot: ordinarySpellSlot,
      createdSpellSlot: spendResourcePool(createdSpellSlot, 1),
    }

  pure def fontOfMagicSpellSlotCreationCost(spellSlotLevel: int): int =
    if (spellSlotLevel == 1) 2
    else if (spellSlotLevel == 2) 3
    else if (spellSlotLevel == 3) 5
    else if (spellSlotLevel == 4) 6
    else if (spellSlotLevel == 5) 7
    else 0

  pure def fontOfMagicSpellSlotCreationMinimumSorcererLevel(spellSlotLevel: int): int =
    if (spellSlotLevel == 1) 2
    else if (spellSlotLevel == 2) 3
    else if (spellSlotLevel == 3) 5
    else if (spellSlotLevel == 4) 7
    else if (spellSlotLevel == 5) 9
    else 0

  pure def legalFontOfMagicCreatedSpellSlotLevel(spellSlotLevel: int): bool =
    spellSlotLevel >= 1 and spellSlotLevel <= 5

  pure def canCreateFontOfMagicSpellSlot(
    sorceryPoints: ResourcePoolFacts,
    createdSpellSlot: ResourcePoolFacts,
    sorcererLevel: int,
    spellSlotLevel: int,
  ): bool = all {
    legalFontOfMagicCreatedSpellSlotLevel(spellSlotLevel),
    legalResourcePool(createdSpellSlot),
    sorcererLevel >= fontOfMagicSpellSlotCreationMinimumSorcererLevel(spellSlotLevel),
    canSpendResourcePool(sorceryPoints, fontOfMagicSpellSlotCreationCost(spellSlotLevel)),
  }

  pure def createFontOfMagicSpellSlot(
    sorceryPoints: ResourcePoolFacts,
    createdSpellSlot: ResourcePoolFacts,
    spellSlotLevel: int,
  ): FontOfMagicCreatedSlotProjection = {
    val pointCost = fontOfMagicSpellSlotCreationCost(spellSlotLevel)
    {
      sorceryPoints: spendResourcePool(sorceryPoints, pointCost),
      createdSpellSlot: createdSpellSlot.with("capacity", createdSpellSlot.capacity + 1),
    }
  }
}
