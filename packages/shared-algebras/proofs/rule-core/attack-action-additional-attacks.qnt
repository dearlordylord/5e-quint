// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module attackActionAdditionalAttacks {
  type AttackActionAdditionalAttacks =
    | NoAdditionalAttacks
    | OneAdditionalAttack
    | TwoAdditionalAttacks
    | ThreeAdditionalAttacks

  pure def attackActionAdditionalAttackCount(
    additionalAttacks: AttackActionAdditionalAttacks
  ): int =
    match additionalAttacks {
      | NoAdditionalAttacks => 0
      | OneAdditionalAttack => 1
      | TwoAdditionalAttacks => 2
      | ThreeAdditionalAttacks => 3
    }

  pure def hasAttackActionAdditionalAttacks(
    additionalAttacks: AttackActionAdditionalAttacks
  ): bool =
    additionalAttacks != NoAdditionalAttacks
}
