/**
 * Battle machine actions part 2 — spellcasting, movement, end turn, legendary, heal.
 */
import {
  activeId,
  advanceFromHitPhase,
  applyFailEffects,
  awaitingReaction,
  breakConcentrationAndPropagate,
  dealDamage,
  dealDamageWithAfterReactions,
  eligibleExcluding,
  eligibleForCounterspell,
  eligibleTarget,
  expendSlot,
  heal,
  isHit,
  mkAwait,
  nextTurn,
  piSaveFailed,
  piSaveFailedAoE,
  piSpellCast,
  processEndTurn,
  resolveSave,
  setCreature,
  setDifference,
  spendAction,
  spendMovement,
  spendReaction
} from "#/battle-machine-helpers.ts"
import { resolveConcentration, resolveSpellEntry, returnToCSWindow } from "#/battle-machine-spells.ts"
import type {
  AoESpellCtx,
  BattleContext,
  BattleEvent,
  CreatureId,
  SaveFailedCtx,
  SpellCastCtx,
  SpellStackEntry
} from "#/battle-machine-types.ts"
import { ADR_ACTIVE_TURN, BP_ACTIVE_TURN } from "#/battle-machine-types.ts"

type Args = { context: BattleContext; event: BattleEvent }

export function battleCastSaveSpell({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_CAST_SAVE_SPELL") return {}
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (e.bonusAction) {
    if (ac.dead || ac.bonusActionUsed || ac.slotExpendedThisTurn) return {}
  } else {
    if (ac.dead || ac.actionsRemaining <= 0) return {}
    if (ac.slotExpendedThisTurn && !e.ritual) return {}
  }
  let cs = e.bonusAction
    ? setCreature(c.creatures, id, { ...ac, bonusActionUsed: true, bonusActionSpellCast: true })
    : setCreature(c.creatures, id, spendAction(ac, "magic"))
  const saveCtx = {
    caster: id,
    target: e.targetId,
    saveDC: e.saveDC,
    saveRoll: e.saveRoll,
    damageOnFail: e.dmgOnFail,
    halfOnSuccess: e.halfOnSave,
    damageType: e.dt,
    conditionOnFail: e.cond,
    applyCondition: e.applyCond
  }
  const spellCtx: SpellCastCtx = {
    caster: id,
    spellName: e.spellName,
    postCast: { tag: "PCESave", save: saveCtx },
    slotLvl: e.slotLvl,
    ritual: e.ritual
  }
  const csElig = eligibleForCounterspell(cs, id)
  if (csElig.size > 0) {
    return {
      creatures: cs,
      phase: {
        tag: "BPAwaitingReaction",
        ctx: mkAwait({ tag: "PISpellCast", ctx: spellCtx }, "TSpellBeingCast", csElig)
      }
    }
  }
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl))
  const result = resolveSave(cs, saveCtx, ADR_ACTIVE_TURN)
  return { creatures: result.creatures, phase: result.phase }
}

export function battleResolveCounterspell({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_RESOLVE_COUNTERSPELL") return {}
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const piSC = piSpellCast(aw.interrupt)
  if (!piSC) return {}
  const spell = piSC.ctx
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null) {
    if (spell.postCast.tag === "PCECounterspell") {
      const csEffect = spell.postCast.cs
      if (c.spellStack.length === 0) return { phase: BP_ACTIVE_TURN }
      const popped = { top: c.spellStack[c.spellStack.length - 1], rest: c.spellStack.slice(0, -1) }
      if (!csEffect.conSaveSucceeded) {
        if (popped.top.spellPostCast.tag === "PCECounterspell") {
          if (popped.rest.length === 0) return { phase: BP_ACTIVE_TURN, spellStack: popped.rest }
          const gp = { top: popped.rest[popped.rest.length - 1], rest: popped.rest.slice(0, -1) }
          const result = returnToCSWindow(c.creatures, gp.top, gp.rest)
          return { creatures: result.creatures, phase: result.phase, spellStack: result.stack }
        }
        return { phase: BP_ACTIVE_TURN, spellStack: popped.rest }
      }
      const result = returnToCSWindow(c.creatures, popped.top, popped.rest)
      return { creatures: result.creatures, phase: result.phase, spellStack: result.stack }
    }
    const result = resolveSpellEntry(
      c.creatures,
      spell.caster,
      spell.slotLvl,
      spell.ritual,
      spell.postCast,
      c.spellStack
    )
    return { creatures: result.creatures, phase: result.phase, spellStack: result.stack }
  }

  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  if (!e.decision || e.decision.tag === "RPass") {
    return { phase: { tag: "BPAwaitingReaction", ctx: { ...aw, offered: newOffered } } }
  }
  // Only remaining variant after null/RPass check above
  const reactor = c.creatures.get(e.reactorId)!
  let cs = setCreature(c.creatures, e.reactorId, spendReaction(reactor))
  cs = setCreature(cs, e.reactorId, expendSlot(cs.get(e.reactorId)!, e.csSlotLvl))
  const conSaveSucceeded = e.decision.saveSucceeded
  const stackEntry: SpellStackEntry = {
    spellCasterId: spell.caster,
    spellPostCast: spell.postCast,
    offered: newOffered,
    slotLvl: spell.slotLvl,
    spellName: spell.spellName,
    ritual: spell.ritual
  }
  const csSpell: SpellCastCtx = {
    caster: e.reactorId,
    spellName: "counterspell",
    postCast: { tag: "PCECounterspell", cs: { targetCasterId: spell.caster, conSaveSucceeded } },
    slotLvl: e.csSlotLvl,
    ritual: false
  }
  const csElig = eligibleForCounterspell(cs, e.reactorId)
  return {
    creatures: cs,
    spellStack: [...c.spellStack, stackEntry],
    phase: {
      tag: "BPAwaitingReaction",
      ctx: mkAwait({ tag: "PISpellCast", ctx: csSpell }, "TSpellBeingCast", csElig)
    }
  }
}

export function battleResolveSaveFailedReaction({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_RESOLVE_SAVE_FAILED_REACTION") return {}
  const aw2 = awaitingReaction(c)
  if (!aw2) return {}
  const piSF = piSaveFailed(aw2.interrupt)
  const piSFAoE = piSaveFailedAoE(aw2.interrupt)
  if (!piSF && !piSFAoE) return {}
  const sf: SaveFailedCtx = piSF ? piSF.ctx : piSFAoE!.sf
  const aoe: AoESpellCtx | undefined = piSFAoE ? piSFAoE.aoe : undefined
  const returnTo = aoe && aoe.remaining.size > 0 ? { tag: "ADRResolvingAoE" as const, aoe } : ADR_ACTIVE_TURN
  if (setDifference(aw2.eligible, aw2.offered).size === 0 || e.reactorId === null) {
    const result = applyFailEffects(c.creatures, sf, returnTo)
    return { creatures: result.creatures, phase: result.phase }
  }
  if (e.decision.tag === "RLegendaryResistance") {
    const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
    const result = applyFailEffects(cs1, { ...sf, saveSucceeded: true }, returnTo)
    return { creatures: result.creatures, phase: result.phase }
  }
  const newOff = new Set(aw2.offered)
  newOff.add(e.reactorId)
  return { phase: { tag: "BPAwaitingReaction", ctx: { ...aw2, offered: newOff } } }
}

export function battleCastConcentrationSpell({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_CAST_CONCENTRATION_SPELL") return {}
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || ac.actionsRemaining <= 0) return {}
  if (ac.slotExpendedThisTurn && !e.ritual) return {}
  let cs = setCreature(c.creatures, id, spendAction(ac, "magic"))
  const concCtx = {
    caster: id,
    target: e.targetId,
    spellId: e.spellId,
    duration: e.duration,
    conditionOnFail: e.cond,
    applyCondition: e.applyCond
  }
  const spellCtx: SpellCastCtx = {
    caster: id,
    spellName: e.spellId,
    postCast: { tag: "PCEConcentration" as const, conc: concCtx },
    slotLvl: e.slotLvl,
    ritual: e.ritual
  }
  const csElig = eligibleForCounterspell(cs, id)
  if (csElig.size > 0) {
    return {
      creatures: cs,
      phase: {
        tag: "BPAwaitingReaction",
        ctx: mkAwait({ tag: "PISpellCast", ctx: spellCtx }, "TSpellBeingCast", csElig)
      }
    }
  }
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl))
  return { creatures: resolveConcentration(cs, concCtx), phase: BP_ACTIVE_TURN }
}

export function battleConcentrationCheck({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_CONCENTRATION_CHECK") return {}
  if (c.phase.tag !== "BPActiveTurn") return {}
  if (e.conSaveSucceeded) return {}
  const cs = breakConcentrationAndPropagate(c.creatures, e.targetId)
  return { creatures: cs }
}

export function battleCastAoE({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_CAST_AOE") return {}
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || ac.actionsRemaining <= 0) return {}
  if (ac.slotExpendedThisTurn && !e.ritual) return {}
  let cs = setCreature(c.creatures, id, spendAction(ac, "magic"))
  const liveTargets = new Set<CreatureId>()
  for (const [cid, cr] of cs) {
    if (cid !== id && !cr.dead) liveTargets.add(cid)
  }
  const aoeCtx: AoESpellCtx = {
    caster: id,
    saveDC: e.saveDC,
    damageOnFail: e.dmgOnFail,
    halfOnSuccess: e.halfOnSave,
    damageType: e.dt,
    conditionOnFail: e.cond,
    applyCondition: e.applyCond,
    remaining: liveTargets
  }
  const spellCtx: SpellCastCtx = {
    caster: id,
    spellName: e.spellName,
    postCast: { tag: "PCEAoE", aoe: aoeCtx },
    slotLvl: e.slotLvl,
    ritual: e.ritual
  }
  const csElig = eligibleForCounterspell(cs, id)
  if (csElig.size > 0) {
    return {
      creatures: cs,
      phase: {
        tag: "BPAwaitingReaction",
        ctx: mkAwait({ tag: "PISpellCast", ctx: spellCtx }, "TSpellBeingCast", csElig)
      }
    }
  }
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl))
  return { creatures: cs, phase: { tag: "BPResolvingAoE", aoe: aoeCtx } }
}

export function battleResolveAoETarget({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_RESOLVE_AOE_TARGET") return {}
  if (c.phase.tag !== "BPResolvingAoE") return {}
  const aoe = c.phase.aoe
  if (aoe.remaining.size === 0 || e.targetId === null) return { phase: BP_ACTIVE_TURN }
  const newRemaining = new Set(aoe.remaining)
  newRemaining.delete(e.targetId)
  const updatedAoe = { ...aoe, remaining: newRemaining }
  const saved = e.saveRoll >= aoe.saveDC
  const aoeReturn = { tag: "ADRResolvingAoE" as const, aoe: updatedAoe }
  if (saved) {
    if (aoe.halfOnSuccess && aoe.damageOnFail > 0) {
      const result = dealDamageWithAfterReactions(
        c.creatures,
        e.targetId,
        aoe.caster,
        Math.trunc(aoe.damageOnFail / 2),
        aoe.damageType,
        false,
        aoeReturn
      )
      return { creatures: result.creatures, phase: result.phase }
    }
    return { phase: { tag: "BPResolvingAoE", aoe: updatedAoe } }
  }
  const sfCtx: SaveFailedCtx = {
    caster: aoe.caster,
    target: e.targetId,
    damageOnFail: aoe.damageOnFail,
    halfOnSuccess: aoe.halfOnSuccess,
    damageType: aoe.damageType,
    conditionOnFail: aoe.conditionOnFail,
    applyCondition: aoe.applyCondition,
    saveSucceeded: false
  }
  const elig = eligibleTarget(c.creatures, e.targetId)
  if (elig.size > 0) {
    return {
      phase: {
        tag: "BPAwaitingReaction",
        ctx: mkAwait({ tag: "PISaveFailedAoE", sf: sfCtx, aoe: updatedAoe }, "TSaveFailed", elig)
      }
    }
  }
  const result = applyFailEffects(c.creatures, sfCtx, aoeReturn)
  return { creatures: result.creatures, phase: result.phase }
}

export function battleMove({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_MOVE") return {}
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

export function battleMovementOAPass({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_MOVEMENT_OA_PASS") return {}
  if (c.phase.tag !== "BPResolvingMovement") return {}
  const mv = c.phase.mv
  if (setDifference(mv.threatenedBy, mv.processed).size === 0 || e.reactorId === null) return { phase: BP_ACTIVE_TURN }
  const newProcessed = new Set(mv.processed)
  newProcessed.add(e.reactorId)
  return { phase: { tag: "BPResolvingMovement", mv: { ...mv, processed: newProcessed } } }
}

export function battleMovementOAAttack({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_MOVEMENT_OA_ATTACK") return {}
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

export function battleEndTurn({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_END_TURN") return {}
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const cs = processEndTurn(c.creatures, id, e.eotSaveSucceeded, e.eotDmg, e.eotDt, e.eotConSave)
  const laEligible = new Set<CreatureId>()
  for (const [cid, cr] of cs) {
    if (
      cid !== id &&
      cr.creatureKind === "Monster" &&
      cr.legendaryActionsRemaining > 0 &&
      !cr.dead &&
      cr.incapacitatedSources.size === 0
    )
      laEligible.add(cid)
  }
  if (laEligible.size > 0) {
    return {
      creatures: cs,
      phase: { tag: "BPAwaitingLegendaryAction", la: { eligibleMonsters: laEligible, endingTurnIndex: c.turnIndex } }
    }
  }
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { creatures: cs, turnIndex: nt.idx, round: nt.round, phase: BP_ACTIVE_TURN, turnStarted: false }
}

export function battleLegendaryPass({ context: c }: Args): Partial<BattleContext> {
  if (c.phase.tag !== "BPAwaitingLegendaryAction") return {}
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { turnIndex: nt.idx, round: nt.round, phase: BP_ACTIVE_TURN, turnStarted: false }
}

export function battleLegendaryAttack({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_LEGENDARY_ATTACK") return {}
  if (c.phase.tag !== "BPAwaitingLegendaryAction") return {}
  const m = c.creatures.get(e.monsterId)!
  let cs = setCreature(c.creatures, e.monsterId, { ...m, legendaryActionsRemaining: m.legendaryActionsRemaining - 1 })
  if (isHit(e.laAtkRoll, e.laTgtAc)) cs = dealDamage(cs, e.laTarget, e.laDmg, e.laDt, e.laCrit)
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { creatures: cs, turnIndex: nt.idx, round: nt.round, phase: BP_ACTIVE_TURN, turnStarted: false }
}

export function battleHeal({ context: c, event: e }: Args): Partial<BattleContext> {
  if (e.type !== "BATTLE_HEAL") return {}
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || ac.actionsRemaining <= 0) return {}
  let cs = setCreature(c.creatures, id, spendAction(ac, "magic"))
  cs = setCreature(cs, e.targetId, heal(cs.get(e.targetId)!, e.amount))
  return { creatures: cs }
}
