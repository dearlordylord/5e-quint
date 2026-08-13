// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE

module ordinaryCreatureSpaceRoute {
  import creatureSizeOrder.* from "./creature-size-order"

  type OrdinaryRouteOccupantCategory =
    | LivingCreatureOccupant({
        creatureSize: RuleSize,
        incapacitated: bool,
        allyOfMover: bool,
      })
    | CorpseOccupant

  type OrdinaryOccupiedDestinationAssessment =
    | LivingCreatureDestinationIllegal
    | CorpseDestinationUnsupported

  pure def twoOrMoreSizesDifferent(first: RuleSize, second: RuleSize): bool =
    sizeRank(first) - sizeRank(second) >= 2 or
      sizeRank(second) - sizeRank(first) >= 2

  pure def livingCreatureSpaceTraversable(
    moverSize: RuleSize,
    creatureSize: RuleSize,
    incapacitated: bool,
    allyOfMover: bool,
  ): bool =
    allyOfMover or incapacitated or creatureSize == TinySize or
      twoOrMoreSizesDifferent(moverSize, creatureSize)

  pure def ordinaryRouteOccupantTraversable(
    moverSize: RuleSize,
    occupant: OrdinaryRouteOccupantCategory,
  ): bool =
    match occupant {
      | LivingCreatureOccupant(facts) => livingCreatureSpaceTraversable(
          moverSize,
          facts.creatureSize,
          facts.incapacitated,
          facts.allyOfMover,
        )
      | CorpseOccupant => true
    }

  pure def ordinaryRouteOccupantExtraCostPerFoot(
    occupant: OrdinaryRouteOccupantCategory,
  ): int =
    match occupant {
      | LivingCreatureOccupant(facts) =>
          if (facts.creatureSize == TinySize or facts.allyOfMover) 0 else 1
      | CorpseOccupant => 0
    }

  pure def ordinaryOccupiedDestinationAssessment(
    occupant: OrdinaryRouteOccupantCategory,
  ): OrdinaryOccupiedDestinationAssessment =
    match occupant {
      | LivingCreatureOccupant(_) => LivingCreatureDestinationIllegal
      | CorpseOccupant => CorpseDestinationUnsupported
    }
}
