import { buildBattleAttackContext, resolveAttack } from "#/battle-machine-actions-attack.ts"
import { isIncapacitated } from "#/battle-machine-creature.ts"
import { activeId, setCreature, setDifference, spendMovement, spendReaction } from "#/battle-machine-helpers.ts"
import type { BattleActionArgs, BattleContext } from "#/battle-machine-types.ts"
import { PHASE_ACTIVE, phaseResolvingMovement } from "#/battle-machine-types.ts"
import { aggregateAttackMods } from "#/machine-combat.ts"

export function battleMove({ context: c, event: e }: BattleActionArgs<"BATTLE_MOVE">): Partial<BattleContext> {
  if (!c.turnStarted) return {}
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
  const reactor = c.creatures.get(e.reactorId)!
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(reactor))
  const ctx = buildBattleAttackContext(
    cs1,
    e.reactorId,
    mv.mover,
    true,
    true,
    e.hostileWithin5ft,
    e.targetCanSeeAttacker,
    e.attackerCanSeeTarget,
    e.frightSourceInLOS
  )
  const mods = aggregateAttackMods(ctx)
  return resolveAttack(
    cs1,
    e.reactorId,
    mv.mover,
    e.oaAtkRoll,
    e.oaTgtAc,
    e.oaDmg,
    e.oaDt,
    e.oaCrit,
    reactor.critRange,
    { tag: "ADRResolvingMovement", mv: updatedMv },
    e.knockOut,
    true,
    mods,
    e.isFinesse,
    e.hasAllyAdjacentToTarget,
    e.saDmg
  )
}
