/**
 * Battle-level helpers (ported from battle.qnt section 3).
 * Creature-level pure functions are in battle-machine-creature.ts.
 */
import {
  addEffect,
  applyCondition,
  breakConcentration,
  clearExpiredAtPhase,
  decrementDurations,
  expendSlot,
  heal,
  isIncapacitated,
  removeEffect,
  removeEffectsByCaster,
  startConcentration,
  takeDamage
} from "#/battle-machine-creature.ts"
import type {
  AfterDamageReturn,
  AttackHitCtx,
  AwaitCtx,
  BattleContext,
  BattleCreatureState,
  BattlePhase,
  ConcentrationCtx,
  CreatureId,
  PendingInterrupt,
  PostCastEffect,
  SaveFailedCtx,
  SaveSpellCtx,
  SpellCastCtx,
  SpellStackEntry,
  TriggerType
} from "#/battle-machine-types.ts"
import { ADR_ACTIVE_TURN, BP_ACTIVE_TURN, FRESH_TURN_STATE } from "#/battle-machine-types.ts"
import type { DamageType } from "#/types.ts"

// Re-export creature-level functions used by actions
export {
  applyCondition,
  expendSlot,
  heal,
  spendAction,
  spendExtraAttack,
  spendMovement,
  spendReaction,
  takeDamage
} from "#/battle-machine-creature.ts"

type Creatures = ReadonlyMap<CreatureId, BattleCreatureState>

export function setDifference<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> {
  const result = new Set<T>()
  for (const item of a) {
    if (!b.has(item)) result.add(item)
  }
  return result
}

export function isHit(roll: number, ac: number): boolean {
  return roll >= ac || roll === 20
}

export function activeId(c: BattleContext): CreatureId {
  return c.initiative[c.turnIndex]
}

/** Extract awaiting-reaction context from phase, or null. */
export function awaitingReaction(c: BattleContext): AwaitCtx | null {
  return c.phase.tag === "BPAwaitingReaction" ? c.phase.ctx : null
}

export function piAttackHit(pi: PendingInterrupt) {
  return pi.tag === "PIAttackHit" ? pi : null
}
export function piAttackDamage(pi: PendingInterrupt) {
  return pi.tag === "PIAttackDamage" ? pi : null
}
export function piAfterDamage(pi: PendingInterrupt) {
  return pi.tag === "PIAfterDamage" ? pi : null
}
export function piSpellCast(pi: PendingInterrupt) {
  return pi.tag === "PISpellCast" ? pi : null
}
export function piSaveFailed(pi: PendingInterrupt) {
  return pi.tag === "PISaveFailed" ? pi : null
}
export function piSaveFailedAoE(pi: PendingInterrupt) {
  return pi.tag === "PISaveFailedAoE" ? pi : null
}

export function setCreature(
  cs: Creatures,
  id: CreatureId,
  c: BattleCreatureState
): Map<CreatureId, BattleCreatureState> {
  const m = new Map(cs)
  m.set(id, c)
  return m
}

export function dealDamage(
  cs: Creatures,
  targetId: CreatureId,
  dmg: number,
  dt: DamageType,
  crit: boolean
): Map<CreatureId, BattleCreatureState> {
  return setCreature(cs, targetId, takeDamage(cs.get(targetId)!, dmg, dt, crit))
}

export function breakConcentrationAndPropagate(
  cs: Creatures,
  casterId: CreatureId
): Map<CreatureId, BattleCreatureState> {
  const caster = cs.get(casterId)!
  const spellId = caster.concentrationSpellId
  if (spellId === "") return new Map(cs)
  const result = setCreature(cs, casterId, breakConcentration(removeEffect(caster, spellId)))
  for (const [cid, c] of result) {
    if (cid === casterId) continue
    const cleaned = removeEffectsByCaster(c, casterId)
    if (cleaned !== c) result.set(cid, cleaned)
  }
  return result
}

export function eligibleExcluding(cs: Creatures, excludeId: CreatureId): Set<CreatureId> {
  const result = new Set<CreatureId>()
  for (const [id, c] of cs) {
    if (id !== excludeId && c.reactionAvailable && !c.dead) result.add(id)
  }
  return result
}

export function eligibleTarget(cs: Creatures, targetId: CreatureId): Set<CreatureId> {
  const t = cs.get(targetId)!
  return t.reactionAvailable && !t.dead ? new Set([targetId]) : new Set()
}

export function eligibleForCounterspell(cs: Creatures, excludeId: CreatureId): Set<CreatureId> {
  const result = new Set<CreatureId>()
  for (const [id, c] of cs) {
    if (id === excludeId || !c.reactionAvailable || c.dead) continue
    let hasSlot = false
    for (let i = 2; i < c.slotsCurrent.length; i++) {
      if (c.slotsCurrent[i] > 0) {
        hasSlot = true
        break
      }
    }
    if (hasSlot && c.preparedSpells.has("counterspell")) result.add(id)
  }
  return result
}

export function mkAwait(pi: PendingInterrupt, tt: TriggerType, elig: Set<CreatureId>): AwaitCtx {
  return { interrupt: pi, trigger: tt, eligible: elig, offered: new Set() }
}

export function returnToPhase(r: AfterDamageReturn): BattlePhase {
  switch (r.tag) {
    case "ADRActiveTurn":
      return BP_ACTIVE_TURN
    case "ADRResolvingAoE":
      return { tag: "BPResolvingAoE", aoe: r.aoe }
    case "ADRResolvingMovement":
      return { tag: "BPResolvingMovement", mv: r.mv }
  }
}

export function dealDamageWithAfterReactions(
  cs: Creatures,
  targetId: CreatureId,
  sourceId: CreatureId,
  dmg: number,
  dt: DamageType,
  crit: boolean,
  returnTo: AfterDamageReturn
): { creatures: Map<CreatureId, BattleCreatureState>; phase: BattlePhase } {
  const oldT = cs.get(targetId)!
  const cs1 = dealDamage(cs, targetId, dmg, dt, crit)
  const newT = cs1.get(targetId)!
  const actualDmg = oldT.hp + oldT.tempHp - (newT.hp + newT.tempHp)
  const elig = eligibleTarget(cs1, targetId)
  if (actualDmg > 0 && elig.size > 0) {
    return {
      creatures: cs1,
      phase: {
        tag: "BPAwaitingReaction",
        ctx: mkAwait(
          {
            tag: "PIAfterDamage",
            ctx: { damageSource: sourceId, damagedCreature: targetId, damageDealt: actualDmg, damageType: dt, returnTo }
          },
          "TDamageTaken",
          elig
        )
      }
    }
  }
  return { creatures: cs1, phase: returnToPhase(returnTo) }
}

export function advanceFromHitPhase(
  cs: Creatures,
  atk: AttackHitCtx
): { creatures: Map<CreatureId, BattleCreatureState>; phase: BattlePhase } {
  const stillHit = isHit(atk.attackRoll, atk.targetAc)
  if (!stillHit) return { creatures: new Map(cs), phase: returnToPhase(atk.atkReturnTo) }
  const dmgElig = eligibleTarget(cs, atk.target)
  if (dmgElig.size > 0) {
    return {
      creatures: new Map(cs),
      phase: {
        tag: "BPAwaitingReaction",
        ctx: mkAwait(
          {
            tag: "PIAttackDamage",
            ctx: {
              attacker: atk.attacker,
              target: atk.target,
              damage: atk.damage,
              damageType: atk.damageType,
              isCritical: atk.isCritical,
              atkReturnTo: atk.atkReturnTo
            }
          },
          "TAttackDamages",
          dmgElig
        )
      }
    }
  }
  return dealDamageWithAfterReactions(
    cs,
    atk.target,
    atk.attacker,
    atk.damage,
    atk.damageType,
    atk.isCritical,
    atk.atkReturnTo
  )
}

export function resolveSave(
  cs: Creatures,
  save: SaveSpellCtx,
  returnTo: AfterDamageReturn
): { creatures: Map<CreatureId, BattleCreatureState>; phase: BattlePhase } {
  const saved = save.saveRoll >= save.saveDC
  if (saved) {
    if (save.halfOnSuccess && save.damageOnFail > 0) {
      return dealDamageWithAfterReactions(
        cs,
        save.target,
        save.caster,
        Math.trunc(save.damageOnFail / 2),
        save.damageType,
        false,
        returnTo
      )
    }
    return { creatures: new Map(cs), phase: returnToPhase(returnTo) }
  }
  const elig = eligibleTarget(cs, save.target)
  const failCtx: SaveFailedCtx = {
    caster: save.caster,
    target: save.target,
    damageOnFail: save.damageOnFail,
    halfOnSuccess: save.halfOnSuccess,
    damageType: save.damageType,
    conditionOnFail: save.conditionOnFail,
    applyCondition: save.applyCondition,
    saveSucceeded: false
  }
  if (elig.size > 0) {
    return {
      creatures: new Map(cs),
      phase: { tag: "BPAwaitingReaction", ctx: mkAwait({ tag: "PISaveFailed", ctx: failCtx }, "TSaveFailed", elig) }
    }
  }
  return applyFailEffects(cs, failCtx, returnTo)
}

export function applyFailEffects(
  cs: Creatures,
  ctx: SaveFailedCtx,
  returnTo: AfterDamageReturn
): { creatures: Map<CreatureId, BattleCreatureState>; phase: BattlePhase } {
  if (ctx.saveSucceeded) {
    if (ctx.halfOnSuccess && ctx.damageOnFail > 0) {
      return dealDamageWithAfterReactions(
        cs,
        ctx.target,
        ctx.caster,
        Math.trunc(ctx.damageOnFail / 2),
        ctx.damageType,
        false,
        returnTo
      )
    }
    return { creatures: new Map(cs), phase: returnToPhase(returnTo) }
  }
  let cs1: Map<CreatureId, BattleCreatureState> = new Map(cs)
  if (ctx.applyCondition) cs1 = setCreature(cs1, ctx.target, applyCondition(cs1.get(ctx.target)!, ctx.conditionOnFail))
  if (ctx.damageOnFail > 0)
    return dealDamageWithAfterReactions(cs1, ctx.target, ctx.caster, ctx.damageOnFail, ctx.damageType, false, returnTo)
  return { creatures: cs1, phase: returnToPhase(returnTo) }
}

export function resolveConcentration(cs: Creatures, conc: ConcentrationCtx): Map<CreatureId, BattleCreatureState> {
  let cs1: Map<CreatureId, BattleCreatureState> =
    cs.get(conc.caster)!.concentrationSpellId !== "" ? breakConcentrationAndPropagate(cs, conc.caster) : new Map(cs)
  let c = startConcentration(cs1.get(conc.caster)!, conc.spellId)
  c = addEffect(c, conc.spellId, conc.duration, "end", conc.caster)
  cs1 = setCreature(cs1, conc.caster, c)
  let t = addEffect(cs1.get(conc.target)!, conc.spellId, conc.duration, "end", conc.caster)
  if (conc.applyCondition) t = applyCondition(t, conc.conditionOnFail)
  return setCreature(cs1, conc.target, t)
}

export function resolveSpellEntry(
  cs: Creatures,
  casterId: CreatureId,
  slotLvl: number,
  isRitual: boolean,
  postCast: PostCastEffect,
  stack: ReadonlyArray<SpellStackEntry>
): { creatures: Map<CreatureId, BattleCreatureState>; phase: BattlePhase; stack: ReadonlyArray<SpellStackEntry> } {
  let cs1: Map<CreatureId, BattleCreatureState> = new Map(cs)
  if (!isRitual && slotLvl > 0) cs1 = setCreature(cs1, casterId, expendSlot(cs1.get(casterId)!, slotLvl))
  switch (postCast.tag) {
    case "PCESave": {
      const r = resolveSave(cs1, postCast.save, ADR_ACTIVE_TURN)
      return { creatures: r.creatures, phase: r.phase, stack }
    }
    case "PCEAoE":
      return { creatures: cs1, phase: { tag: "BPResolvingAoE", aoe: postCast.aoe }, stack }
    case "PCEConcentration":
      return { creatures: resolveConcentration(cs1, postCast.conc), phase: BP_ACTIVE_TURN, stack }
    default:
      return { creatures: cs1, phase: BP_ACTIVE_TURN, stack }
  }
}

export function returnToCSWindow(
  cs: Creatures,
  entry: SpellStackEntry,
  stack: ReadonlyArray<SpellStackEntry>
): { creatures: Map<CreatureId, BattleCreatureState>; phase: BattlePhase; stack: ReadonlyArray<SpellStackEntry> } {
  const freshElig = eligibleForCounterspell(cs, entry.spellCasterId)
  const remaining = setDifference(freshElig, entry.offered)
  if (remaining.size > 0) {
    const spell: SpellCastCtx = {
      caster: entry.spellCasterId,
      spellName: entry.spellName,
      postCast: entry.spellPostCast,
      slotLvl: entry.slotLvl,
      ritual: entry.ritual
    }
    return {
      creatures: new Map(cs),
      stack,
      phase: {
        tag: "BPAwaitingReaction",
        ctx: {
          interrupt: { tag: "PISpellCast", ctx: spell },
          trigger: "TSpellBeingCast",
          eligible: freshElig,
          offered: entry.offered
        }
      }
    }
  }
  if (entry.spellPostCast.tag === "PCECounterspell") {
    const csEffect = entry.spellPostCast.cs
    if (stack.length === 0) return { creatures: new Map(cs), phase: BP_ACTIVE_TURN, stack }
    const popped = { top: stack[stack.length - 1], rest: stack.slice(0, -1) }
    if (!csEffect.conSaveSucceeded) {
      if (popped.top.spellPostCast.tag === "PCECounterspell") {
        if (popped.rest.length === 0) return { creatures: new Map(cs), phase: BP_ACTIVE_TURN, stack: popped.rest }
        const gp = { top: popped.rest[popped.rest.length - 1], rest: popped.rest.slice(0, -1) }
        const fe2 = eligibleForCounterspell(cs, gp.top.spellCasterId)
        if (setDifference(fe2, gp.top.offered).size > 0) {
          const sp2: SpellCastCtx = {
            caster: gp.top.spellCasterId,
            spellName: gp.top.spellName,
            postCast: gp.top.spellPostCast,
            slotLvl: gp.top.slotLvl,
            ritual: gp.top.ritual
          }
          return {
            creatures: new Map(cs),
            stack: gp.rest,
            phase: {
              tag: "BPAwaitingReaction",
              ctx: {
                interrupt: { tag: "PISpellCast", ctx: sp2 },
                trigger: "TSpellBeingCast",
                eligible: fe2,
                offered: gp.top.offered
              }
            }
          }
        }
        return resolveSpellEntry(cs, gp.top.spellCasterId, gp.top.slotLvl, gp.top.ritual, gp.top.spellPostCast, gp.rest)
      }
      return { creatures: new Map(cs), phase: BP_ACTIVE_TURN, stack: popped.rest }
    }
    const fe2 = eligibleForCounterspell(cs, popped.top.spellCasterId)
    if (setDifference(fe2, popped.top.offered).size > 0) {
      const sp2: SpellCastCtx = {
        caster: popped.top.spellCasterId,
        spellName: popped.top.spellName,
        postCast: popped.top.spellPostCast,
        slotLvl: popped.top.slotLvl,
        ritual: popped.top.ritual
      }
      return {
        creatures: new Map(cs),
        stack: popped.rest,
        phase: {
          tag: "BPAwaitingReaction",
          ctx: {
            interrupt: { tag: "PISpellCast", ctx: sp2 },
            trigger: "TSpellBeingCast",
            eligible: fe2,
            offered: popped.top.offered
          }
        }
      }
    }
    return resolveSpellEntry(
      cs,
      popped.top.spellCasterId,
      popped.top.slotLvl,
      popped.top.ritual,
      popped.top.spellPostCast,
      popped.rest
    )
  }
  return resolveSpellEntry(cs, entry.spellCasterId, entry.slotLvl, entry.ritual, entry.spellPostCast, stack)
}

export function nextTurn(turnIndex: number, initLen: number, round: number): { idx: number; round: number } {
  const nextIdx = turnIndex + 1 < initLen ? turnIndex + 1 : 0
  return { idx: nextIdx, round: nextIdx === 0 ? round + 1 : round }
}

export function processStartTurn(
  cs: Creatures,
  activeId: CreatureId,
  sotDmg: number,
  sotDt: DamageType,
  sotHeal: number,
  _sotSaveResult: boolean,
  sotConSave: boolean,
  rechargedAbilities: ReadonlyArray<string> | undefined
): Map<CreatureId, BattleCreatureState> {
  let c = cs.get(activeId)!
  let effs = decrementDurations(c.activeEffects)
  effs = clearExpiredAtPhase(effs, "start")
  c = { ...c, activeEffects: effs }
  let result = setCreature(cs, activeId, c)
  const hasEffects = effs.length > 0 && (sotDmg > 0 || sotHeal > 0)
  if (hasEffects) {
    if (sotHeal > 0) c = heal(c, sotHeal)
    if (sotDmg > 0) {
      const oldConcId = c.concentrationSpellId
      c = takeDamage(c, sotDmg, sotDt, false)
      if (oldConcId !== "" && (c.dead || isIncapacitated(c)))
        c = { ...c, concentrationSpellId: "", activeEffects: c.activeEffects.filter((e) => e.spellId !== oldConcId) }
      if (c.concentrationSpellId !== "" && !sotConSave) {
        const sid = c.concentrationSpellId
        c = { ...c, concentrationSpellId: "", activeEffects: c.activeEffects.filter((e) => e.spellId !== sid) }
      }
      result = setCreature(result, activeId, c)
      if (oldConcId !== "" && c.concentrationSpellId === "") {
        result = breakConcentrationAndPropagate(result, activeId)
        c = result.get(activeId)!
      }
    } else {
      result = setCreature(result, activeId, c)
    }
  }
  c = result.get(activeId)!
  c = { ...c, ...FRESH_TURN_STATE }
  if (c.creatureKind === "Monster" && rechargedAbilities) {
    const newRecharge = { ...c.rechargeAvailable }
    for (const name of rechargedAbilities) newRecharge[name] = true
    c = { ...c, rechargeAvailable: newRecharge }
  }
  return setCreature(result, activeId, c)
}

export function processEndTurn(
  cs: Creatures,
  activeId: CreatureId,
  eotSaveSucceeded: boolean,
  eotDmg: number,
  eotDt: DamageType,
  eotConSave: boolean
): Map<CreatureId, BattleCreatureState> {
  let c = cs.get(activeId)!
  const hasEotEffects = c.activeEffects.length > 0
  if (hasEotEffects && eotSaveSucceeded) {
    const idsToRemove = new Set<string>()
    for (const ae of c.activeEffects) {
      if (ae.expiresAt === "end") idsToRemove.add(ae.spellId)
    }
    if (idsToRemove.size > 0) c = { ...c, activeEffects: c.activeEffects.filter((ae) => !idsToRemove.has(ae.spellId)) }
  }
  if (hasEotEffects && eotDmg > 0) {
    const oldConcId = c.concentrationSpellId
    c = takeDamage(c, eotDmg, eotDt, false)
    if (oldConcId !== "" && (c.dead || isIncapacitated(c)))
      c = { ...c, concentrationSpellId: "", activeEffects: c.activeEffects.filter((e) => e.spellId !== oldConcId) }
    if (c.concentrationSpellId !== "" && !eotConSave) {
      const sid = c.concentrationSpellId
      c = { ...c, concentrationSpellId: "", activeEffects: c.activeEffects.filter((e) => e.spellId !== sid) }
    }
  }
  c = { ...c, activeEffects: clearExpiredAtPhase(c.activeEffects, "end") }
  let result = setCreature(cs, activeId, c)
  const oldConcId = cs.get(activeId)!.concentrationSpellId
  if (oldConcId !== "" && result.get(activeId)!.concentrationSpellId === "")
    result = breakConcentrationAndPropagate(result, activeId)
  return result
}
