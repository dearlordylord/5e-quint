// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-self-teleport

module battleRuntimeSelfTeleportLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Misty Step:
  //   Misty Step is a level 2 Bonus Action spell with range Self that
  //   teleports the caster up to 30 feet to an unoccupied space they can see.
  // - .references/srd-5.2.1/Rules-Glossary.md#Teleportation:
  //   teleportation does not expend Movement, never provokes Opportunity
  //   Attacks, and transports equipment the creature is wearing and carrying.
  // - .references/srd-5.2.1/Playing-the-Game.md#Bonus Actions and
  //   #Opportunity Attacks: a creature can take one Bonus Action on its turn,
  //   and teleportation avoids Opportunity Attacks.
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field:
  //   no one can teleport into or out of the aura or use planar travel there.
  // - UBIQUITOUS_LANGUAGE.md: Bonus Action, Spell Slot, Movement,
  //   Opportunity Attack, Teleportation, and Holding / Wielding.
  var qBonusActionAvailable: bool
  var qSpellAvailable: bool
  var qDestinationWitnessAvailable: bool
  var qDestinationWitnessConsumed: bool
  var qTeleportEmitted: bool
  var qMovementSpentFeet: int
  var qMovementRemainingFeet: int
  var qSpellSlotExpended: int
  var qSpellSlotCommittedThisTurn: bool
  var qNoOpportunityAttackProjected: bool
  var qEquipmentTransportProjected: bool
  var qDestinationDistanceFeet: int
  var qDestinationInsideAntimagicAuraWitness: bool
  var qAntimagicTransitBlocked: bool
  var qLastResult: str

  action recordSelfTeleportState(
    bonusActionAvailable: bool,
    spellAvailable: bool,
    destinationWitnessAvailable: bool,
    destinationWitnessConsumed: bool,
    teleportEmitted: bool,
    movementSpentFeet: int,
    movementRemainingFeet: int,
    spellSlotExpended: int,
    spellSlotCommittedThisTurn: bool,
    noOpportunityAttackProjected: bool,
    equipmentTransportProjected: bool,
    destinationDistanceFeet: int,
    destinationInsideAntimagicAuraWitness: bool,
    antimagicTransitBlocked: bool,
    lastResult: str,
  ): bool = all {
    qBonusActionAvailable' = bonusActionAvailable,
    qSpellAvailable' = spellAvailable,
    qDestinationWitnessAvailable' = destinationWitnessAvailable,
    qDestinationWitnessConsumed' = destinationWitnessConsumed,
    qTeleportEmitted' = teleportEmitted,
    qMovementSpentFeet' = movementSpentFeet,
    qMovementRemainingFeet' = movementRemainingFeet,
    qSpellSlotExpended' = spellSlotExpended,
    qSpellSlotCommittedThisTurn' = spellSlotCommittedThisTurn,
    qNoOpportunityAttackProjected' = noOpportunityAttackProjected,
    qEquipmentTransportProjected' = equipmentTransportProjected,
    qDestinationDistanceFeet' = destinationDistanceFeet,
    qDestinationInsideAntimagicAuraWitness' = destinationInsideAntimagicAuraWitness,
    qAntimagicTransitBlocked' = antimagicTransitBlocked,
    qLastResult' = lastResult,
  }

  action init = recordSelfTeleportState(
    true,
    true,
    true,
    false,
    false,
    0,
    30,
    0,
    false,
    false,
    false,
    0,
    false,
    false,
    "init",
  )

  action doRequestDestinationWitness = all {
    qSpellAvailable,
    qDestinationWitnessAvailable,
    not(qDestinationWitnessConsumed),
    recordSelfTeleportState(
      qBonusActionAvailable,
      true,
      true,
      false,
      false,
      qMovementSpentFeet,
      qMovementRemainingFeet,
      qSpellSlotExpended,
      qSpellSlotCommittedThisTurn,
      false,
      false,
      0,
      false,
      false,
      "destinationWitnessRequired",
    ),
  }

  action doCastSelfTeleport = all {
    qBonusActionAvailable,
    qSpellAvailable,
    qDestinationWitnessAvailable,
    qSpellSlotExpended == 0,
    recordSelfTeleportState(
      false,
      false,
      false,
      true,
      true,
      0,
      30,
      1,
      true,
      true,
      true,
      30,
      false,
      false,
      "selfTeleported",
    ),
  }

  action doRejectAntimagicDestinationTransit = all {
    qBonusActionAvailable,
    qSpellAvailable,
    qDestinationWitnessAvailable,
    qSpellSlotExpended == 0,
    recordSelfTeleportState(
      true,
      true,
      true,
      false,
      false,
      0,
      30,
      0,
      false,
      false,
      false,
      0,
      true,
      true,
      "antimagicTransitBlocked",
    ),
  }

  action doStutter = recordSelfTeleportState(
    qBonusActionAvailable,
    qSpellAvailable,
    qDestinationWitnessAvailable,
    qDestinationWitnessConsumed,
    qTeleportEmitted,
    qMovementSpentFeet,
    qMovementRemainingFeet,
    qSpellSlotExpended,
    qSpellSlotCommittedThisTurn,
    qNoOpportunityAttackProjected,
    qEquipmentTransportProjected,
    qDestinationDistanceFeet,
    qDestinationInsideAntimagicAuraWitness,
    qAntimagicTransitBlocked,
    qLastResult,
  )

  action step = any {
    doRequestDestinationWitness,
    doCastSelfTeleport,
    doRejectAntimagicDestinationTransit,
    doStutter,
  }
}
