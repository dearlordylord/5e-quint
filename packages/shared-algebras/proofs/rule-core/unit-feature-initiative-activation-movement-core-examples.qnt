// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.passive-initiative-roll-mode unit-feature.ongoing-feature-activation-movement-rider
module unitFeatureInitiativeActivationMovementCoreExamples {
  import unitFeatureInitiativeActivationMovementCore.* from "./unit-feature-initiative-activation-movement-core"
  run test_selected_initiative_and_activation_movement = all {
    assert(passiveInitiativeAdvantage(true)),
    assert(not(passiveInitiativeAdvantage(false))),
    assert(activationMovementBudget(true, true, 40) == 20),
    assert(activationMovementBudget(true, true, 35) == 17),
    assert(activationMovementBudget(true, true, 0) == 0),
    assert(activationMovementAdmitted(true, true, 40, 20, true)),
    assert(not(activationMovementAdmitted(true, true, 40, 21, true))),
    assert(not(activationMovementAdmitted(true, true, 40, 10, false))),
    assert(not(activationMovementAdmitted(false, true, 40, 10, true))),
    assert(not(activationMovementAdmitted(true, false, 40, 10, true))),
    assert(not(activationMovementAdmitted(true, true, 0, 0, true))),
  }
}
