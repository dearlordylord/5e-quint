// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.MINIMAL_RESOLUTION
//
// Pilot composite slice for the QCP-PILOT-SLICE deliverable defined in
// plans/QNT_COVERAGE_PROGRAM.md. Models a minimal creature-vs-creature
// attack: on a caller-supplied hit verdict, a caller-supplied damage
// amount is applied to the target's Hit Points, clamped at 0 via the
// SHARED.HIT_POINTS.POSITIVE_DAMAGE atomic's nonnegative helper.
//
// Intentionally out of scope at this slice (covered by later slices or
// by the full hit-point-damage atomic):
//   - d20 attack roll vs Armor Class (hit arrives as a caller fill)
//   - damage roll formula, critical hits, damage type adjustments
//   - Temporary Hit Points, dead/unconscious lifecycle, Death Saving Throws
//   - action economy, initiative, turn structure

module creatureAttack {
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"

  type CreatureAttackState = {
    creatureAHp: int,
    creatureBHp: int,
  }

  type Attacker = AttackerA | AttackerB

  type CreatureAttackFills = {
    damage: int,
    hit: bool,
  }

  pure def applyDamageToCreature(currentHp: int, damage: int): int =
    nonnegative(currentHp - nonnegative(damage))

  pure def resolveCreatureAttack(state: CreatureAttackState, attacker: Attacker, fills: CreatureAttackFills): CreatureAttackState =
    if (not(fills.hit)) state
    else match attacker {
      | AttackerA => {
          creatureAHp: state.creatureAHp,
          creatureBHp: applyDamageToCreature(state.creatureBHp, fills.damage),
        }
      | AttackerB => {
          creatureAHp: applyDamageToCreature(state.creatureAHp, fills.damage),
          creatureBHp: state.creatureBHp,
        }
    }
}
