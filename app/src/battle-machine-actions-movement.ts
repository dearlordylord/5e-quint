import { isIncapacitated } from "#/battle-machine-creature.ts"
import {
  activeId,
  advanceFromHitPhase,
  eligibleExcluding,
  isHit,
  mkAwait,
  setCreature,
  setDifference,
  spendMovement,
  spendReaction
} from "#/battle-machine-helpers.ts"
import type { BattleActionArgs, BattleContext } from "#/battle-machine-types.ts"
import { PHASE_ACTIVE, phaseAwaitReaction, phaseResolvingMovement } from "#/battle-machine-types.ts"

export function battleMove({ context: c, event: e }: BattleActionArgs<"BATTLE_MOVE">): Partial<BattleContext> {
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || isIncapacitated(ac) || ac.movementRemaining <= 0) return {}
  const cs = setCreature(c.creatures, id, spendMovement(ac, 5, 1))
  if (ac.disengaged) return { creatures: cs }
  const oaEligible = new Set(
    [...e.threatened].filter((tid) => {
      const t = cs.get(tid)
      return t && t.reactionAvailable && !t.dead
    })
  )
  if (oaEligible.size === 0) return { creatures: cs }
  return {
    creatures: cs,
    ...phaseResolvingMovement({ mover: id, threatenedBy: oaEligible, processed: new Set() })
  }
}

export function battleMovementOAPass({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_MOVEMENT_OA_PASS">): Partial<BattleContext> {
  const mv = c.movementCtx
  if (!mv) return {}
  if (setDifference(mv.threatenedBy, mv.processed).size === 0 || e.reactorId === null) return { ...PHASE_ACTIVE }
  const newProcessed = new Set(mv.processed)
  newProcessed.add(e.reactorId)
  return { ...phaseResolvingMovement({ ...mv, processed: newProcessed }) }
}

export function battleMovementOAAttack({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_MOVEMENT_OA_ATTACK">): Partial<BattleContext> {
  const mv = c.movementCtx
  if (!mv) return {}
  if (e.reactorId === null) return {}
  const newProc = new Set(mv.processed)
  newProc.add(e.reactorId)
  const updatedMv = { ...mv, processed: newProc }
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
  if (!isHit(e.oaAtkRoll, e.oaTgtAc)) return { creatures: cs1, ...phaseResolvingMovement(updatedMv) }
  const atkCtx = {
    attacker: e.reactorId,
    target: mv.mover,
    attackRoll: e.oaAtkRoll,
    targetAc: e.oaTgtAc,
    damage: e.oaDmg,
    damageType: e.oaDt,
    isCritical: e.oaCrit,
    atkReturnTo: { tag: "ADRResolvingMovement" as const, mv: updatedMv }
  }
  const hitElig = eligibleExcluding(cs1, e.reactorId)
  if (hitElig.size > 0) {
    return {
      creatures: cs1,
      ...phaseAwaitReaction(mkAwait({ tag: "PIAttackHit", ctx: atkCtx }, "TAttackHits", hitElig))
    }
  }
  const result = advanceFromHitPhase(cs1, atkCtx)
  return { ...result }
}
