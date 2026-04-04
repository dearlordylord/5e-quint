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
import { BP_ACTIVE_TURN } from "#/battle-machine-types.ts"

export function battleMove({ context: c, event: e }: BattleActionArgs<"BATTLE_MOVE">): Partial<BattleContext> {
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || ac.movementRemaining <= 0) return {}
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
    phase: { tag: "BPResolvingMovement", mv: { mover: id, threatenedBy: oaEligible, processed: new Set() } }
  }
}

export function battleMovementOAPass({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_MOVEMENT_OA_PASS">): Partial<BattleContext> {
  if (c.phase.tag !== "BPResolvingMovement") return {}
  const mv = c.phase.mv
  if (setDifference(mv.threatenedBy, mv.processed).size === 0 || e.reactorId === null) return { phase: BP_ACTIVE_TURN }
  const newProcessed = new Set(mv.processed)
  newProcessed.add(e.reactorId)
  return { phase: { tag: "BPResolvingMovement", mv: { ...mv, processed: newProcessed } } }
}

export function battleMovementOAAttack({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_MOVEMENT_OA_ATTACK">): Partial<BattleContext> {
  if (c.phase.tag !== "BPResolvingMovement") return {}
  const mv = c.phase.mv
  if (e.reactorId === null) return {}
  const newProc = new Set(mv.processed)
  newProc.add(e.reactorId)
  const updatedMv = { ...mv, processed: newProc }
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
  if (!isHit(e.oaAtkRoll, e.oaTgtAc)) return { creatures: cs1, phase: { tag: "BPResolvingMovement", mv: updatedMv } }
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
      phase: { tag: "BPAwaitingReaction", ctx: mkAwait({ tag: "PIAttackHit", ctx: atkCtx }, "TAttackHits", hitElig) }
    }
  }
  const result = advanceFromHitPhase(cs1, atkCtx)
  return { creatures: result.creatures, phase: result.phase }
}
