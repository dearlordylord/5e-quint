import { isIncapacitated } from "#/battle-machine-creature.ts"
import {
  activeId,
  applyFailEffects,
  awaitingReaction,
  breakConcentrationAndPropagate,
  dealDamageWithAfterReactions,
  eligibleForCounterspell,
  eligibleForLR,
  expendSlot,
  mkAwait,
  piSaveFailed,
  piSaveFailedAoE,
  piSpellCast,
  resolveSave,
  setCreature,
  setDifference,
  spendAction,
  spendLR,
  spendReaction
} from "#/battle-machine-helpers.ts"
import { resolveConcentration, resolveSpellEntry, returnToCSWindow } from "#/battle-machine-spells.ts"
import type {
  AoESpellCtx,
  BattleActionArgs,
  BattleContext,
  CreatureId,
  SaveFailedCtx,
  SpellCastCtx,
  SpellStackEntry
} from "#/battle-machine-types.ts"
import { ADR_ACTIVE_TURN, PHASE_ACTIVE, phaseAwaitReaction, phaseResolvingAoE } from "#/battle-machine-types.ts"
import { evasionDamage } from "#/features/class-rogue.ts"

export function battleCastSaveSpell({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_CAST_SAVE_SPELL">): Partial<BattleContext> {
  if (!c.turnStarted) return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || isIncapacitated(ac)) return {}
  if (ac.ragingBlocksSpells) return {}
  if (e.bonusAction) {
    if (ac.bonusActionUsed || ac.slotExpendedThisTurn) return {}
  } else {
    if (ac.actionSurgeActionPending) return {}
    if (ac.actionsRemaining <= 0) return {}
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
    applyCondition: e.applyCond,
    saveAbility: e.saveAbility
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
      ...phaseAwaitReaction(mkAwait({ tag: "PISpellCast", ctx: spellCtx }, "TSpellBeingCast", csElig))
    }
  }
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl))
  const result = resolveSave(cs, saveCtx, ADR_ACTIVE_TURN)
  return { ...result }
}

export function battleResolveCounterspell({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_RESOLVE_COUNTERSPELL">): Partial<BattleContext> {
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const piSC = piSpellCast(aw.interrupt)
  if (!piSC) return {}
  const spell = piSC.ctx
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null) {
    if (spell.postCast.tag === "PCECounterspell") {
      const csEffect = spell.postCast.cs
      if (c.spellStack.length === 0) return { ...PHASE_ACTIVE }
      const popped = { top: c.spellStack[c.spellStack.length - 1], rest: c.spellStack.slice(0, -1) }
      if (!csEffect.conSaveSucceeded) {
        if (popped.top.spellPostCast.tag === "PCECounterspell") {
          if (popped.rest.length === 0) return { ...PHASE_ACTIVE, spellStack: popped.rest }
          const gp = { top: popped.rest[popped.rest.length - 1], rest: popped.rest.slice(0, -1) }
          const result = returnToCSWindow(c.creatures, gp.top, gp.rest)
          return { ...result, spellStack: result.stack }
        }
        return { ...PHASE_ACTIVE, spellStack: popped.rest }
      }
      const result = returnToCSWindow(c.creatures, popped.top, popped.rest)
      return { ...result, spellStack: result.stack }
    }
    const result = resolveSpellEntry(
      c.creatures,
      spell.caster,
      spell.slotLvl,
      spell.ritual,
      spell.postCast,
      c.spellStack
    )
    return { ...result, spellStack: result.stack }
  }

  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  if (!e.decision || e.decision.tag === "RPass") {
    return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) }
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
    ...phaseAwaitReaction(mkAwait({ tag: "PISpellCast", ctx: csSpell }, "TSpellBeingCast", csElig))
  }
}

export function battleResolveSaveFailedReaction({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_RESOLVE_SAVE_FAILED_REACTION">): Partial<BattleContext> {
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
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      laCtx: result.laCtx
    }
  }
  if (e.decision.tag === "RLegendaryResistance") {
    const cs1 = spendLR(c.creatures, e.reactorId)
    const result = applyFailEffects(cs1, { ...sf, saveSucceeded: true }, returnTo)
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      laCtx: result.laCtx
    }
  }
  const newOff = new Set(aw2.offered)
  newOff.add(e.reactorId)
  return { ...phaseAwaitReaction({ ...aw2, offered: newOff }) }
}

export function battleCastConcentrationSpell({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_CAST_CONCENTRATION_SPELL">): Partial<BattleContext> {
  if (!c.turnStarted) return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {}
  if (ac.actionSurgeActionPending || ac.ragingBlocksSpells) return {}
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
      ...phaseAwaitReaction(mkAwait({ tag: "PISpellCast", ctx: spellCtx }, "TSpellBeingCast", csElig))
    }
  }
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl))
  return { creatures: resolveConcentration(cs, concCtx), ...PHASE_ACTIVE }
}

export function battleConcentrationCheck({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_CONCENTRATION_CHECK">): Partial<BattleContext> {
  if (e.conSaveSucceeded) return {}
  const cs = breakConcentrationAndPropagate(c.creatures, e.targetId)
  return { creatures: cs }
}

export function battleCastAoE({ context: c, event: e }: BattleActionArgs<"BATTLE_CAST_AOE">): Partial<BattleContext> {
  if (!c.turnStarted) return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {}
  if (ac.actionSurgeActionPending || ac.ragingBlocksSpells) return {}
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
    remaining: liveTargets,
    saveAbility: e.saveAbility
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
      ...phaseAwaitReaction(mkAwait({ tag: "PISpellCast", ctx: spellCtx }, "TSpellBeingCast", csElig))
    }
  }
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl))
  return { creatures: cs, ...phaseResolvingAoE(aoeCtx) }
}

export function battleResolveAoETarget({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_RESOLVE_AOE_TARGET">): Partial<BattleContext> {
  const aoe = c.aoeCtx
  if (!aoe) return {}
  if (aoe.remaining.size === 0 || e.targetId === null) return { ...PHASE_ACTIVE }
  const newRemaining = new Set(aoe.remaining)
  newRemaining.delete(e.targetId)
  const updatedAoe = { ...aoe, remaining: newRemaining }
  const tgt = c.creatures.get(e.targetId)!
  const tgtIncap = isIncapacitated(tgt)
  const isDex = aoe.saveAbility === "dex"
  const saved = e.saveRoll + tgt.saveMiscBonus >= aoe.saveDC
  const aoeReturn = { tag: "ADRResolvingAoE" as const, aoe: updatedAoe }
  if (saved) {
    if (aoe.halfOnSuccess && aoe.damageOnFail > 0) {
      const halfDmg = Math.trunc(aoe.damageOnFail / 2)
      // Evasion on DEX save success: 0 damage
      const evDmg = isDex ? evasionDamage(tgt.hasEvasion, tgtIncap, true, halfDmg) : halfDmg
      if (evDmg === 0) {
        return { ...phaseResolvingAoE(updatedAoe) }
      }
      const result = dealDamageWithAfterReactions(
        c.creatures,
        e.targetId,
        aoe.caster,
        evDmg,
        aoe.damageType,
        false,
        false,
        aoeReturn
      )
      return { ...result }
    }
    return { ...phaseResolvingAoE(updatedAoe) }
  }
  // Save failed — Evasion on DEX save fail: half damage
  const evDmgOnFail = isDex ? evasionDamage(tgt.hasEvasion, tgtIncap, false, aoe.damageOnFail) : aoe.damageOnFail
  const sfCtx: SaveFailedCtx = {
    caster: aoe.caster,
    target: e.targetId,
    damageOnFail: evDmgOnFail,
    halfOnSuccess: aoe.halfOnSuccess,
    damageType: aoe.damageType,
    conditionOnFail: aoe.conditionOnFail,
    applyCondition: aoe.applyCondition,
    saveSucceeded: false
  }
  const elig = eligibleForLR(c.creatures, e.targetId)
  if (elig.size > 0) {
    return {
      ...phaseAwaitReaction(mkAwait({ tag: "PISaveFailedAoE", sf: sfCtx, aoe: updatedAoe }, "TSaveFailed", elig))
    }
  }
  const result = applyFailEffects(c.creatures, sfCtx, aoeReturn)
  return { ...result }
}
