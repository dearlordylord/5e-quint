// -*- mode: Bluespec; -*-

module ordinaryCreatureSpaceRouteTests {
  import creatureSizeOrder.* from "./creature-size-order"
  import ordinaryCreatureSpaceRoute.* from "./ordinary-creature-space-route"

  run ordinary_route_occupant_category_and_cost_parity = all {
    assert(ordinaryRouteOccupantTraversable(MediumSize, LivingCreatureOccupant({
      creatureSize: MediumSize,
      incapacitated: true,
      allyOfMover: false,
    }))),
    assert(ordinaryRouteOccupantTraversable(MediumSize, LivingCreatureOccupant({
      creatureSize: MediumSize,
      incapacitated: false,
      allyOfMover: true,
    }))),
    assert(ordinaryRouteOccupantTraversable(MediumSize, LivingCreatureOccupant({
      creatureSize: TinySize,
      incapacitated: false,
      allyOfMover: false,
    }))),
    assert(ordinaryRouteOccupantTraversable(TinySize, LivingCreatureOccupant({
      creatureSize: MediumSize,
      incapacitated: false,
      allyOfMover: false,
    }))),
    assert(not(ordinaryRouteOccupantTraversable(MediumSize, LivingCreatureOccupant({
      creatureSize: MediumSize,
      incapacitated: false,
      allyOfMover: false,
    })))),
    assert(ordinaryRouteOccupantTraversable(MediumSize, CorpseOccupant)),
    assert(ordinaryRouteOccupantExtraCostPerFoot(LivingCreatureOccupant({
      creatureSize: MediumSize,
      incapacitated: true,
      allyOfMover: false,
    })) == 1),
    assert(ordinaryRouteOccupantExtraCostPerFoot(LivingCreatureOccupant({
      creatureSize: TinySize,
      incapacitated: false,
      allyOfMover: false,
    })) == 0),
    assert(ordinaryRouteOccupantExtraCostPerFoot(LivingCreatureOccupant({
      creatureSize: MediumSize,
      incapacitated: false,
      allyOfMover: true,
    })) == 0),
    assert(ordinaryRouteOccupantExtraCostPerFoot(CorpseOccupant) == 0),
    assert(ordinaryOccupiedDestinationAssessment(LivingCreatureOccupant({
      creatureSize: MediumSize,
      incapacitated: false,
      allyOfMover: false,
    })) == LivingCreatureDestinationIllegal),
    assert(ordinaryOccupiedDestinationAssessment(CorpseOccupant) == CorpseDestinationUnsupported),
  }
}
