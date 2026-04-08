/**
 * Battle-level helpers (ported from battle.qnt section 3).
 * Creature-level pure functions are in battle-machine-creature.ts.
 */
import { Match, Option } from "effect"

import {
  applyCondition,
  breakConcentration,
  clearExpiredAtPhase,
  deathSave,
  decrementDurations,
  FRESH_TURN_STATE,
  heal,
  isIncapacitated,
  removeEffect,
  removeEffectsByCaster,
  takeDamage
} from "#/battle-machine-creature.ts"
import { calculateEffectiveSpeed } from "#/machine-helpers.ts"
import type {
  AfterDamageReturn,
  AttackHitCtx,
  AwaitCtx,
  BattleContext,
  BattleCreatureState,
  CreatureId,
  PendingInterrupt,
  PhaseFields,
  SaveFailedCtx,
  SaveSpellCtx,
  TriggerType
} from "#/battle-machine-types.ts"
import {
  PHASE_ACTIVE,
  phaseAwaitingLegendary,
  phaseAwaitingReady,
  phaseAwaitReaction,
  phaseResolvingAoE,
  phaseResolvingMovement
} from "#/battle-machine-types.ts"
import { evasionDamage } from "#/features/class-rogue.ts"
import type { DamageType, SpellId } from "#/types.ts"

/** Exhaustive discriminator for tagged unions using `tag` field. */
export const byTag = Match.discriminator("tag")

// Re-export creature-level functions used by actions.
// battleExpendSlot re-exported as expendSlot — battle callers always mark "slot expended this turn".
export {
  applyCondition,
  battleExpendSlot as expendSlot,
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

export function isHit(roll: number, ac: number, critRange = 20): boolean {
  return roll >= ac || roll >= critRange
}

export function activeId(c: BattleContext): CreatureId {
  return c.initiative[c.turnIndex]
}

export function awaitingReaction(c: BattleContext): AwaitCtx | null {
  return c.awaitCtx
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
  crit: boolean,
  knockOut: boolean
): Map<CreatureId, BattleCreatureState> {
  const old = cs.get(targetId)!
  const nc = takeDamage(old, dmg, dt, crit)
  // SRD 5.2.1 "Knocking Out a Creature": melee attacker's choice when damage
  // would reduce a PC to 0 HP (not instant death). Sets HP to 1 + Unconscious.
  if (knockOut && old.creatureKind === "PC" && old.hp > 0 && nc.hp === 0 && !nc.dead) {
    return setCreature(cs, targetId, applyCondition({ ...old, hp: 1 }, "unconscious"))
  }
  return setCreature(cs, targetId, nc)
}

export function breakConcentrationAndPropagate(
  cs: Creatures,
  casterId: CreatureId
): Map<CreatureId, BattleCreatureState> {
  const caster = cs.get(casterId)!
  const concOpt = caster.concentrationSpellId
  if (Option.isNone(concOpt)) return new Map(cs)
  const spellId = concOpt.value
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
    if (id !== excludeId && c.reactionAvailable && !c.dead && !c.unconscious) result.add(id)
  }
  return result
}

export function eligibleTarget(cs: Creatures, targetId: CreatureId): Set<CreatureId> {
  const t = cs.get(targetId)!
  return t.reactionAvailable && !t.dead && !t.unconscious ? new Set([targetId]) : new Set()
}

/** Eligible for Legendary Resistance: alive + conscious + has LR charges remaining. */
export function eligibleForLR(cs: Creatures, targetId: CreatureId): Set<CreatureId> {
  const t = cs.get(targetId)!
  return !t.dead && !t.unconscious && t.legendaryResistancesRemaining > 0 ? new Set([targetId]) : new Set()
}

/** Spend one Legendary Resistance charge. */
export function spendLR(cs: Creatures, id: CreatureId): Creatures {
  const c = cs.get(id)!
  return setCreature(cs, id, { ...c, legendaryResistancesRemaining: c.legendaryResistancesRemaining - 1 })
}

// slotExpendedThisTurn is guarded both here (for reactions) and at all spell-casting
// actions (for action/BA spells). SRD 5.2.1 "One Spell with a Spell Slot per Turn".
export function eligibleForCounterspell(cs: Creatures, excludeId: CreatureId): Set<CreatureId> {
  const result = new Set<CreatureId>()
  for (const [id, c] of cs) {
    if (id === excludeId || !c.reactionAvailable || c.dead || c.unconscious) continue
    let hasSlot = false
    for (let i = 2; i < c.slotsCurrent.length; i++) {
      if (c.slotsCurrent[i] > 0) {
        hasSlot = true
        break
      }
    }
    if (hasSlot && c.preparedSpells.has("counterspell") && !c.slotExpendedThisTurn) result.add(id)
  }
  return result
}

export function mkAwait(pi: PendingInterrupt, tt: TriggerType, elig: Set<CreatureId>): AwaitCtx {
  return { interrupt: pi, trigger: tt, eligible: elig, offered: new Set() }
}

export function returnToState(r: AfterDamageReturn): PhaseFields {
  return Match.value(r).pipe(
    byTag("ADRActiveTurn", () => PHASE_ACTIVE),
    byTag("ADRResolvingAoE", (v) => phaseResolvingAoE(v.aoe)),
    byTag("ADRResolvingMovement", (v) => phaseResolvingMovement(v.mv)),
    byTag("ADRAwaitingLegendaryAction", (v) => phaseAwaitingLegendary(v.la)),
    byTag("ADRAwaitingReadiedAction", (v) => phaseAwaitingReady(v.ready)),
    Match.exhaustive
  )
}

export function dealDamageWithAfterReactions(
  cs: Creatures,
  targetId: CreatureId,
  sourceId: CreatureId,
  dmg: number,
  dt: DamageType,
  crit: boolean,
  knockOut: boolean,
  returnTo: AfterDamageReturn
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const oldT = cs.get(targetId)!
  const cs1 = dealDamage(cs, targetId, dmg, dt, crit, knockOut)
  const newT = cs1.get(targetId)!
  const actualDmg = oldT.hp + oldT.tempHp - (newT.hp + newT.tempHp)
  const elig = eligibleTarget(cs1, targetId)
  if (actualDmg > 0 && elig.size > 0) {
    return {
      creatures: cs1,
      ...phaseAwaitReaction(
        mkAwait(
          {
            tag: "PIAfterDamage",
            ctx: { damageSource: sourceId, damagedCreature: targetId, damageDealt: actualDmg, damageType: dt, returnTo }
          },
          "TDamageTaken",
          elig
        )
      )
    }
  }
  return { creatures: cs1, ...returnToState(returnTo) }
}

export function advanceFromHitPhase(
  cs: Creatures,
  atk: AttackHitCtx
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const stillHit = isHit(atk.attackRoll, atk.targetAc, atk.critRange)
  if (!stillHit) return { creatures: new Map(cs), ...returnToState(atk.atkReturnTo) }
  const dmgElig = eligibleTarget(cs, atk.target)
  if (dmgElig.size > 0) {
    return {
      creatures: new Map(cs),
      ...phaseAwaitReaction(
        mkAwait(
          {
            tag: "PIAttackDamage",
            ctx: {
              attacker: atk.attacker,
              target: atk.target,
              damage: atk.damage,
              damageType: atk.damageType,
              isCritical: atk.isCritical,
              atkReturnTo: atk.atkReturnTo,
              knockOut: atk.knockOut
            }
          },
          "TAttackDamages",
          dmgElig
        )
      )
    }
  }
  return dealDamageWithAfterReactions(
    cs,
    atk.target,
    atk.attacker,
    atk.damage,
    atk.damageType,
    atk.isCritical,
    atk.knockOut,
    atk.atkReturnTo
  )
}

export function resolveSave(
  cs: Creatures,
  save: SaveSpellCtx,
  returnTo: AfterDamageReturn
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const tgt = cs.get(save.target)!
  const saved = save.saveRoll + tgt.saveMiscBonus >= save.saveDC
  const isDex = save.saveAbility === "dex"
  const tgtIncap = isIncapacitated(tgt)
  if (saved) {
    if (save.halfOnSuccess && save.damageOnFail > 0) {
      const halfDmg = Math.trunc(save.damageOnFail / 2)
      const evDmg = isDex ? evasionDamage(tgt.hasEvasion, tgtIncap, true, halfDmg) : halfDmg
      if (evDmg === 0) {
        return { creatures: new Map(cs), ...returnToState(returnTo) }
      }
      return dealDamageWithAfterReactions(cs, save.target, save.caster, evDmg, save.damageType, false, false, returnTo)
    }
    return { creatures: new Map(cs), ...returnToState(returnTo) }
  }
  const evDmgOnFail = isDex ? evasionDamage(tgt.hasEvasion, tgtIncap, false, save.damageOnFail) : save.damageOnFail
  const elig = eligibleForLR(cs, save.target)
  const failCtx: SaveFailedCtx = {
    caster: save.caster,
    target: save.target,
    damageOnFail: evDmgOnFail,
    halfOnSuccess: save.halfOnSuccess,
    damageType: save.damageType,
    conditionOnFail: save.conditionOnFail,
    applyCondition: save.applyCondition,
    saveSucceeded: false
  }
  if (elig.size > 0) {
    return {
      creatures: new Map(cs),
      ...phaseAwaitReaction(mkAwait({ tag: "PISaveFailed", ctx: failCtx }, "TSaveFailed", elig))
    }
  }
  return applyFailEffects(cs, failCtx, returnTo)
}

export function applyFailEffects(
  cs: Creatures,
  ctx: SaveFailedCtx,
  returnTo: AfterDamageReturn
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  if (ctx.saveSucceeded) {
    if (ctx.halfOnSuccess && ctx.damageOnFail > 0) {
      return dealDamageWithAfterReactions(
        cs,
        ctx.target,
        ctx.caster,
        Math.trunc(ctx.damageOnFail / 2),
        ctx.damageType,
        false,
        false,
        returnTo
      )
    }
    return { creatures: new Map(cs), ...returnToState(returnTo) }
  }
  let cs1: Map<CreatureId, BattleCreatureState> = new Map(cs)
  if (ctx.applyCondition) cs1 = setCreature(cs1, ctx.target, applyCondition(cs1.get(ctx.target)!, ctx.conditionOnFail))
  if (ctx.damageOnFail > 0)
    return dealDamageWithAfterReactions(
      cs1,
      ctx.target,
      ctx.caster,
      ctx.damageOnFail,
      ctx.damageType,
      false,
      false,
      returnTo
    )
  return { creatures: cs1, ...returnToState(returnTo) }
}

export function nextTurn(turnIndex: number, initLen: number, round: number): { idx: number; round: number } {
  const nextIdx = turnIndex + 1 < initLen ? turnIndex + 1 : 0
  return { idx: nextIdx, round: nextIdx === 0 ? round + 1 : round }
}

/** Apply damage to a creature and handle concentration break + propagation in one step. */
function applyDamageWithConcBreak(
  cs: Creatures,
  id: CreatureId,
  creature: BattleCreatureState,
  dmg: number,
  dt: DamageType,
  conSaveSucceeded: boolean
): { creatures: Map<CreatureId, BattleCreatureState>; creature: BattleCreatureState } {
  const hadConc = Option.isSome(creature.concentrationSpellId)
  let c = takeDamage(creature, dmg, dt, false)
  if (hadConc && (c.dead || isIncapacitated(c))) c = breakConcentration(c)
  if (Option.isSome(c.concentrationSpellId) && !conSaveSucceeded) c = breakConcentration(c)
  let result = setCreature(cs, id, c)
  if (hadConc && Option.isNone(c.concentrationSpellId)) {
    result = breakConcentrationAndPropagate(result, id)
    c = result.get(id)!
  }
  return { creatures: result, creature: c }
}

export function processStartTurn(
  cs: Creatures,
  activeId: CreatureId,
  sotDmg: number,
  sotDt: DamageType,
  sotHeal: number,
  _sotSaveResult: boolean,
  sotConSave: boolean,
  rechargedAbilities: ReadonlyArray<string> | undefined,
  deathSaveRoll: number
): Map<CreatureId, BattleCreatureState> {
  let c = cs.get(activeId)!
  let effs = decrementDurations(c.activeEffects)
  effs = clearExpiredAtPhase(effs, "start")
  c = { ...c, activeEffects: effs }
  // Auto-break concentration if the concentrated spell's effect expired
  if (Option.isSome(c.concentrationSpellId)) {
    const cid = c.concentrationSpellId.value
    if (!c.activeEffects.some((a) => a.spellId === cid)) c = breakConcentration(c)
  }
  // Death save: if at 0 HP, not stable, not dead, and roll provided
  if (c.hp === 0 && !c.stable && !c.dead && deathSaveRoll > 0) {
    c = deathSave(c, deathSaveRoll)
  }
  let result = setCreature(cs, activeId, c)
  const hasEffects = effs.length > 0 && (sotDmg > 0 || sotHeal > 0)
  if (hasEffects) {
    if (sotHeal > 0) c = heal(c, sotHeal)
    if (sotDmg > 0) {
      const r = applyDamageWithConcBreak(result, activeId, c, sotDmg, sotDt, sotConSave)
      result = r.creatures
      c = r.creature
    } else {
      result = setCreature(result, activeId, c)
    }
  }
  c = result.get(activeId)!
  const speed = calculateEffectiveSpeed({
    baseSpeed: c.baseWalkSpeed,
    armorPenalty: 0,
    grappled: c.grappled,
    restrained: c.restrained,
    exhaustion: c.exhaustion,
    isGrappling: false,
    grappledTargetTwoSizesSmaller: false
  })
  c = { ...c, ...FRESH_TURN_STATE, effectiveSpeed: speed, movementRemaining: speed }
  if (c.creatureKind === "Monster" && rechargedAbilities) {
    const newRecharge = { ...c.rechargeAvailable }
    for (const name of rechargedAbilities) newRecharge[name] = true
    c = { ...c, rechargeAvailable: newRecharge }
  }
  result = setCreature(result, activeId, c)
  // Reset slotExpendedThisTurn for non-active creatures (active already reset by FRESH_TURN_STATE)
  for (const [cid, cr] of result) {
    if (cid !== activeId && cr.slotExpendedThisTurn) result.set(cid, { ...cr, slotExpendedThisTurn: false })
  }
  return result
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
    const idsToRemove = new Set<SpellId>()
    for (const ae of c.activeEffects) {
      if (ae.expiresAt === "end") idsToRemove.add(ae.spellId)
    }
    if (idsToRemove.size > 0) c = { ...c, activeEffects: c.activeEffects.filter((ae) => !idsToRemove.has(ae.spellId)) }
  }
  let baseCreatures: Creatures
  if (hasEotEffects && eotDmg > 0) {
    const r = applyDamageWithConcBreak(cs, activeId, c, eotDmg, eotDt, eotConSave)
    c = r.creature
    baseCreatures = r.creatures
  } else {
    baseCreatures = cs
  }
  c = { ...c, activeEffects: clearExpiredAtPhase(c.activeEffects, "end") }
  // Auto-break concentration if the concentrated spell's effect expired
  if (Option.isSome(c.concentrationSpellId)) {
    const cid = c.concentrationSpellId.value
    if (!c.activeEffects.some((a) => a.spellId === cid)) c = breakConcentration(c)
  }
  let result = setCreature(baseCreatures, activeId, c)
  const oldConcId = cs.get(activeId)!.concentrationSpellId
  if (Option.isSome(oldConcId) && Option.isNone(result.get(activeId)!.concentrationSpellId)) {
    result = breakConcentrationAndPropagate(result, activeId)
  }
  return result
}
