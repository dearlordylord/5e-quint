// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.MINIMAL_RESOLUTION

module creatureAttack {
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"

  type CreatureAttackState = {
    attackerHp: int,
    targetHp: int,
  }

  type Attacker = AttackerA | AttackerB

  type AttackFills = {
    damage: int,
    hit: bool,
  }

  pure def applyDamageToCreature(currentHp: int, damage: int): int =
    nonnegative(currentHp - nonnegative(damage))

  pure def resolveAttack(state: CreatureAttackState, attacker: Attacker, fills: AttackFills): CreatureAttackState =
    if (not(fills.hit)) state
    else match attacker {
      | AttackerA => {
          attackerHp: state.attackerHp,
          targetHp: applyDamageToCreature(state.targetHp, fills.damage),
        }
      | AttackerB => {
          attackerHp: applyDamageToCreature(state.attackerHp, fills.damage),
          targetHp: state.targetHp,
        }
    }
}
