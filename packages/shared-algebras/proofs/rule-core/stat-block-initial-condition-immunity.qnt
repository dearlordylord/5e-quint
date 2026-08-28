// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.INITIAL_CONDITION_IMMUNITY

module statBlockInitialConditionImmunity {
  // RAW anchors:
  // - Monsters/Overview.md: Immunities lists a monster's condition
  //   Immunities.
  // - Rules-Glossary.md: Immunity says an immune creature is unaffected by
  //   that condition.
  // - UBIQUITOUS_LANGUAGE.md: Condition Immunity means the condition does
  //   not apply, including its implied side effects.

  type StatBlockCondition =
    | StatBlockBlindedCondition
    | StatBlockCharmedCondition
    | StatBlockDeafenedCondition
    | StatBlockFrightenedCondition
    | StatBlockGrappledCondition
    | StatBlockIncapacitatedCondition
    | StatBlockInvisibleCondition
    | StatBlockParalyzedCondition
    | StatBlockPetrifiedCondition
    | StatBlockPoisonedCondition
    | StatBlockProneCondition
    | StatBlockRestrainedCondition
    | StatBlockStunnedCondition
    | StatBlockUnconsciousCondition

  type StatBlockInitialConditionAdmission = {
    initialConditions: Set[StatBlockCondition],
    conditionImmunities: Set[StatBlockCondition],
  }

  pure def statBlockInitialConditionAdmissionAllowed(
    admission: StatBlockInitialConditionAdmission
  ): bool =
    admission.initialConditions.forall(condition =>
      condition == StatBlockProneCondition and
        not(admission.conditionImmunities.contains(condition))
    )
}
