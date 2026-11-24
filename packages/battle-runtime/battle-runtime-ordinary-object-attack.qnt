// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.ORDINARY_OBJECT_PROCEDURE

// RAW anchors:
// - Rules Glossary, "Attack [Action]": choose a target, determine modifiers,
//   resolve the attack roll, and roll damage only on a hit.
// - Rules Glossary, "Cover": owned by coverDefenseCore.
module battleRuntimeOrdinaryObjectAttack {
  import coverDefenseCore.* from "../shared-algebras/proofs/rule-core/cover-defense-core"

  type OrdinaryObjectAttackProcedureResult = {
    valid: bool,
    actionRemaining: bool,
    needsAttackRoll: bool,
    needsDamageRoll: bool,
    hit: bool,
    damageEmitted: bool,
  }

  pure def ordinaryObjectAttackProcedure(
    cover: CoverDegree,
    attackRollSupplied: bool,
    naturalD20: int,
    attackTotal: int,
    armorClass: int,
    damageRollSupplied: bool
  ): OrdinaryObjectAttackProcedureResult = {
    val targetLegal = coverAllowsDirectTargeting(cover)
    val attackHits =
      attackRollSupplied and naturalD20 != 1 and
        (naturalD20 == 20 or attackTotal >= armorClassBehindCover(armorClass, cover))
    val fillOrderValid = not(damageRollSupplied) or (attackRollSupplied and attackHits)
    val valid = targetLegal and fillOrderValid
    val needsAttackRoll = valid and not(attackRollSupplied)
    val hit = valid and attackRollSupplied and attackHits
    val needsDamageRoll = hit and not(damageRollSupplied)
    val resolved = valid and attackRollSupplied and (not(attackHits) or damageRollSupplied)
    {
      valid: valid,
      actionRemaining: not(resolved),
      needsAttackRoll: needsAttackRoll,
      needsDamageRoll: needsDamageRoll,
      hit: hit,
      damageEmitted: hit and damageRollSupplied,
    }
  }
}
