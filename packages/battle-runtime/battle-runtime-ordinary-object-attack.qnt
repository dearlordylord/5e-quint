// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.ORDINARY_OBJECT_PROCEDURE

// RAW anchors:
// - Rules Glossary, "Attack [Action]": choose a target, determine modifiers,
//   resolve the attack roll, and roll damage only on a hit.
// - Rules Glossary, "Cover": Half Cover adds 2 to AC and Total Cover prevents
//   direct targeting.
module battleRuntimeOrdinaryObjectAttack {
  type ObjectAttackCover =
    | NoObjectCover
    | HalfObjectCover
    | ThreeQuartersObjectCover
    | TotalObjectCover

  type OrdinaryObjectAttackProcedureResult = {
    valid: bool,
    actionRemaining: bool,
    needsAttackRoll: bool,
    needsDamageRoll: bool,
    hit: bool,
    damageEmitted: bool,
  }

  pure def ordinaryObjectAttackProcedure(
    cover: ObjectAttackCover,
    attackRollSupplied: bool,
    naturalD20: int,
    attackTotal: int,
    armorClass: int,
    damageRollSupplied: bool
  ): OrdinaryObjectAttackProcedureResult = {
    val targetLegal = cover != TotalObjectCover
    val coverArmorClassBonus =
      if (cover == HalfObjectCover) 2
      else if (cover == ThreeQuartersObjectCover) 5
      else 0
    val attackHits =
      attackRollSupplied and naturalD20 != 1 and
        (naturalD20 == 20 or attackTotal >= armorClass + coverArmorClassBonus)
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
