// -*- mode: Bluespec; -*-

module statBlockInitialConditionImmunityTests {
  import statBlockInitialConditionImmunity.* from "./stat-block-initial-condition-immunity"

  run test_initial_condition_matching_immunity_is_rejected = {
    val admission = {
      initialConditions: Set(StatBlockProneCondition),
      conditionImmunities: Set(StatBlockProneCondition),
    }
    assert(not(statBlockInitialConditionAdmissionAllowed(admission)))
  }

  run test_initial_condition_without_matching_immunity_is_allowed = {
    val admission = {
      initialConditions: Set(StatBlockProneCondition),
      conditionImmunities: Set(StatBlockGrappledCondition),
    }
    assert(statBlockInitialConditionAdmissionAllowed(admission))
  }

  run test_empty_initial_conditions_are_allowed = {
    val admission = {
      initialConditions: Set(),
      conditionImmunities: Set(StatBlockProneCondition),
    }
    assert(statBlockInitialConditionAdmissionAllowed(admission))
  }

  run test_unsupported_initial_condition_is_rejected = {
    val admission = {
      initialConditions: Set(StatBlockGrappledCondition),
      conditionImmunities: Set(),
    }
    assert(not(statBlockInitialConditionAdmissionAllowed(admission)))
  }
}
