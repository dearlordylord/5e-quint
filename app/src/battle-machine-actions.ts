/**
 * Battle machine actions part 1 — init, start turn, attack, reaction phases.
 * Each function takes {context, event} and returns Partial<BattleContext>.
 */
import {
  activeId,
  advanceFromHitPhase,
  awaitingReaction,
  dealDamageWithAfterReactions,
  eligibleExcluding,
  isHit,
  mkAwait,
  piAfterDamage,
  piAttackDamage,
  piAttackHit,
  processStartTurn,
  returnToPhase,
  setCreature,
  setDifference,
  spendAction,
  spendExtraAttack,
  spendReaction
} from "#/battle-machine-helpers.ts"
import type {
  AttackHitCtx,
  BattleContext,
  BattleCreatureState,
  BattleEvent,
  CreatureId
} from "#/battle-machine-types.ts"
import { ADR_ACTIVE_TURN, BP_ACTIVE_TURN, freshCaster, freshCreature } from "#/battle-machine-types.ts"

type Args = { context: BattleContext; event: BattleEvent }

export function battleInit({ event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_INIT") return {}
  const creatures = new Map<string, BattleCreatureState>()
  creatures.set("A", { ...freshCaster(e.hp1, "PC"), rogueLevel: 5 })
  creatures.set("B", freshCaster(e.hp2, "PC"))
  creatures.set("C", {
    ...freshCreature(e.hp3, "Monster"),
    legendaryActionsRemaining: 3,
    legendaryResistancesRemaining: 3
  })
  creatures.set("D", freshCaster(e.hp4, "PC"))
  return {
    creatures,
    initiative: ["A", "B", "C", "D"],
    turnIndex: 0,
    round: 1,
    phase: BP_ACTIVE_TURN,
    spellStack: [],
    turnStarted: false
  }
}

export function battleStartTurn({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_START_TURN") return {}
  if (c.phase.tag !== "BPActiveTurn" || c.turnStarted) return {}
  const id = activeId(c)
  const creature = c.creatures.get(id)!
  let cs: Map<CreatureId, BattleCreatureState> = new Map(c.creatures)
  if (creature.creatureKind === "Monster") {
    cs = setCreature(cs, id, { ...creature, legendaryActionsRemaining: 3 })
  }
  let rechargedAbilities: ReadonlyArray<string> | undefined
  if (creature.creatureKind === "Monster") {
    const minRolls: Record<string, number> = { breath_weapon: 5 }
    const recharged: Array<string> = []
    for (const [name, available] of Object.entries(cs.get(id)!.rechargeAvailable)) {
      if (!available && e.rechargeD6 >= (minRolls[name] ?? 5)) recharged.push(name)
    }
    if (recharged.length > 0) rechargedAbilities = recharged
  }
  const result = processStartTurn(
    cs,
    id,
    e.sotDmg,
    e.sotDt,
    e.sotHeal,
    e.sotSaveResult,
    e.sotConSave,
    rechargedAbilities
  )
  return { creatures: result, turnStarted: true }
}

export function battleAttack({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_ATTACK") return {}
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  const tc = c.creatures.get(e.targetId)!
  if (ac.dead || tc.dead) return {}
  if (ac.actionsRemaining <= 0 && ac.extraAttacksRemaining <= 0) return {}
  const updatedAc =
    ac.attackActionUsed && ac.extraAttacksRemaining > 0 ? spendExtraAttack(ac) : spendAction(ac, "attack")
  const cs = setCreature(c.creatures, id, updatedAc)
  if (!isHit(e.attackRoll, e.tAc)) return { creatures: cs }
  const atkCtx: AttackHitCtx = {
    attacker: id,
    target: e.targetId,
    attackRoll: e.attackRoll,
    targetAc: e.tAc,
    damage: e.dmg,
    damageType: e.dt,
    isCritical: e.crit,
    atkReturnTo: ADR_ACTIVE_TURN
  }
  const elig = eligibleExcluding(cs, id)
  if (elig.size > 0) {
    return {
      creatures: cs,
      phase: { tag: "BPAwaitingReaction", ctx: mkAwait({ tag: "PIAttackHit", ctx: atkCtx }, "TAttackHits", elig) }
    }
  }
  const result = dealDamageWithAfterReactions(cs, e.targetId, id, e.dmg, e.dt, e.crit, ADR_ACTIVE_TURN)
  return { creatures: result.creatures, phase: result.phase }
}

export function battleResolveHitReaction({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_RESOLVE_HIT_REACTION") return {}
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAttackHit(aw.interrupt)
  if (!pi) return {}
  const atk = pi.ctx
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null) {
    const result = advanceFromHitPhase(c.creatures, atk)
    return { creatures: result.creatures, phase: result.phase }
  }
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  let retroAtk = atk
  switch (e.decision.tag) {
    case "RShield":
      retroAtk = { ...atk, targetAc: atk.targetAc + 5 }
      break
    case "RParry":
      retroAtk = { ...atk, targetAc: atk.targetAc + e.decision.bonus }
      break
    case "RCuttingWords":
      retroAtk = { ...atk, attackRoll: atk.attackRoll - e.decision.reduction }
      break
    case "RPass":
      break
  }
  if (retroAtk !== atk) {
    const cs = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
    const newElig = new Set(aw.eligible)
    newElig.delete(e.reactorId)
    return {
      creatures: cs,
      phase: {
        tag: "BPAwaitingReaction",
        ctx: {
          interrupt: { tag: "PIAttackHit", ctx: retroAtk },
          trigger: "TAttackHits",
          eligible: newElig,
          offered: newOffered
        }
      }
    }
  }
  return { phase: { tag: "BPAwaitingReaction", ctx: { ...aw, offered: newOffered } } }
}

export function battleResolveDmgReaction({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_RESOLVE_DMG_REACTION") return {}
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAttackDamage(aw.interrupt)
  if (!pi) return {}
  const atk = pi.ctx
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null) {
    const result = dealDamageWithAfterReactions(
      c.creatures,
      atk.target,
      atk.attacker,
      atk.damage,
      atk.damageType,
      atk.isCritical,
      atk.atkReturnTo
    )
    return { creatures: result.creatures, phase: result.phase }
  }
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  const reactor = c.creatures.get(e.reactorId)!
  let newDmg = atk.damage
  switch (e.decision.tag) {
    case "RUncannyDodge":
      if (reactor.rogueLevel >= 5) newDmg = Math.trunc(atk.damage / 2)
      break
    case "RDamageReduction":
      if (reactor.monkLevel >= 3) newDmg = Math.max(0, atk.damage - e.decision.amount)
      break
    case "RPass":
      break
  }
  if (newDmg !== atk.damage) {
    const cs = setCreature(c.creatures, e.reactorId, spendReaction(reactor))
    const newElig = new Set(aw.eligible)
    newElig.delete(e.reactorId)
    return {
      creatures: cs,
      phase: {
        tag: "BPAwaitingReaction",
        ctx: {
          interrupt: { tag: "PIAttackDamage", ctx: { ...atk, damage: newDmg } },
          trigger: "TAttackDamages",
          eligible: newElig,
          offered: newOffered
        }
      }
    }
  }
  return { phase: { tag: "BPAwaitingReaction", ctx: { ...aw, offered: newOffered } } }
}

export function battleAfterDamagePass({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_AFTER_DAMAGE_PASS") return {}
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAfterDamage(aw.interrupt)
  if (!pi) return {}
  const ad = pi.ctx
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null)
    return { phase: returnToPhase(ad.returnTo) }
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  return { phase: { tag: "BPAwaitingReaction", ctx: { ...aw, offered: newOffered } } }
}

export function battleAfterDamageHellishRebuke({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_AFTER_DAMAGE_HELLISH_REBUKE") return {}
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAfterDamage(aw.interrupt)
  if (!pi) return {}
  const ad = pi.ctx
  if (e.reactorId === null) return {}
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
  const actualDmg = e.rebukeSaved ? Math.trunc(e.rebukeDmg / 2) : e.rebukeDmg
  const result = dealDamageWithAfterReactions(cs1, ad.damageSource, e.reactorId, actualDmg, "fire", false, ad.returnTo)
  return { creatures: result.creatures, phase: result.phase }
}

export function battleAfterDamageRetaliation({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_AFTER_DAMAGE_RETALIATION") return {}
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAfterDamage(aw.interrupt)
  if (!pi) return {}
  const ad = pi.ctx
  if (e.reactorId === null) return {}
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  if (!isHit(e.retAtkRoll, e.retTgtAc))
    return { creatures: cs1, phase: { tag: "BPAwaitingReaction", ctx: { ...aw, offered: newOffered } } }
  const result = dealDamageWithAfterReactions(
    cs1,
    ad.damageSource,
    e.reactorId,
    e.retDmg,
    e.retDt,
    e.retCrit,
    ad.returnTo
  )
  return { creatures: result.creatures, phase: result.phase }
}
