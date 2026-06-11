// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-self-teleport

module battleRuntimeSelfTeleportLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

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
  type Hole = | NoHole

  type SelfTeleportWitnessState = {
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
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SelfTeleportWitnessState

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
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      bonusActionAvailable: bonusActionAvailable,
      spellAvailable: spellAvailable,
      destinationWitnessAvailable: destinationWitnessAvailable,
      destinationWitnessConsumed: destinationWitnessConsumed,
      teleportEmitted: teleportEmitted,
      movementSpentFeet: movementSpentFeet,
      movementRemainingFeet: movementRemainingFeet,
      spellSlotExpended: spellSlotExpended,
      spellSlotCommittedThisTurn: spellSlotCommittedThisTurn,
      noOpportunityAttackProjected: noOpportunityAttackProjected,
      equipmentTransportProjected: equipmentTransportProjected,
      destinationDistanceFeet: destinationDistanceFeet,
      destinationInsideAntimagicAuraWitness: destinationInsideAntimagicAuraWitness,
      antimagicTransitBlocked: antimagicTransitBlocked,
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
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
    witnessInit(NoHole),
  )

  action doRequestDestinationWitness = all {
    qState.spellAvailable,
    qState.destinationWitnessAvailable,
    not(qState.destinationWitnessConsumed),
    recordSelfTeleportState(
      qState.bonusActionAvailable,
      true,
      true,
      false,
      false,
      qState.movementSpentFeet,
      qState.movementRemainingFeet,
      qState.spellSlotExpended,
      qState.spellSlotCommittedThisTurn,
      false,
      false,
      0,
      false,
      false,
      "destinationWitnessRequired",
      witnessResolved(NoHole),
    ),
  }

  action doCastSelfTeleport = all {
    qState.bonusActionAvailable,
    qState.spellAvailable,
    qState.destinationWitnessAvailable,
    qState.spellSlotExpended == 0,
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
      witnessResolved(NoHole),
    ),
  }

  action doRejectAntimagicDestinationTransit = all {
    qState.bonusActionAvailable,
    qState.spellAvailable,
    qState.destinationWitnessAvailable,
    qState.spellSlotExpended == 0,
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
      witnessResolved(NoHole),
    ),
  }

  action doStutter = recordSelfTeleportState(
    qState.bonusActionAvailable,
    qState.spellAvailable,
    qState.destinationWitnessAvailable,
    qState.destinationWitnessConsumed,
    qState.teleportEmitted,
    qState.movementSpentFeet,
    qState.movementRemainingFeet,
    qState.spellSlotExpended,
    qState.spellSlotCommittedThisTurn,
    qState.noOpportunityAttackProjected,
    qState.equipmentTransportProjected,
    qState.destinationDistanceFeet,
    qState.destinationInsideAntimagicAuraWitness,
    qState.antimagicTransitBlocked,
    qState.scenarioResult,
    qState.protocol,
  )

  action step = any {
    doRequestDestinationWitness,
    doCastSelfTeleport,
    doRejectAntimagicDestinationTransit,
    doStutter,
  }
}
