// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.ATTACK_ROLL_DEFENSE
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-roll-defense
// RAW: .references/srd-5.2.1/classes.md:6825-6832.
module attackRollDefenseCore {
  type AttackRollDefense = NoDefense | OpportunityDefense | RepeatAttackerDefense
  pure def grantsDisadvantage(choice: AttackRollDefense, opportunityAttack: bool, attackerHitThisTurn: bool): bool =
    match choice {
      | NoDefense => false
      | OpportunityDefense => opportunityAttack
      | RepeatAttackerDefense => attackerHitThisTurn
    }
  pure def recordsHit(choice: AttackRollDefense, hit: bool): bool =
    choice == RepeatAttackerDefense and hit
  type AttackHit = { attacker: int, defender: int }
  pure def hitEffects(choice: AttackRollDefense, effects: Set[AttackHit], attacker: int, defender: int, hit: bool): Set[AttackHit] =
    if (recordsHit(choice, hit)) effects.union(Set({ attacker: attacker, defender: defender })) else effects
  pure def endTurnEffects(effects: Set[AttackHit]): Set[AttackHit] = Set()
}
