import { Match } from "effect"

import { isIncapacitated } from "#/battle-machine-creature.ts"
import {
  activeId,
  advanceFromHitPhase,
  awaitingReaction,
  byTag,
  dealDamageWithAfterReactions,
  eligibleExcluding,
  isHit,
  mkAwait,
  piAfterDamage,
  piAttackDamage,
  piAttackHit,
  returnToState,
  setCreature,
  setDifference,
  spendAction,
  spendExtraAttack,
  spendReaction
} from "#/battle-machine-helpers.ts"
import type {
  AfterDamageReturn,
  AttackHitCtx,
  BattleActionArgs,
  BattleContext,
  BattleCreatureState,
  PhaseFields
} from "#/battle-machine-types.ts"
import { ADR_ACTIVE_TURN, phaseAwaitReaction } from "#/battle-machine-types.ts"
import { deflectAttacksResult } from "#/features/class-monk-features.ts"
import { uncannyDodgeDamage } from "#/features/class-rogue.ts"
import type { CreatureId, DamageType } from "#/types.ts"
import { armorClass } from "#/types.ts"

type Creatures = ReadonlyMap<CreatureId, BattleCreatureState>

/** Shared attack resolution: determines hit, enters reaction chain or deals damage. */
export function resolveAttack(
  cs: Creatures,
  attackerId: CreatureId,
  targetId: CreatureId,
  attackRoll: number,
  targetAc: number,
  damage: number,
  damageType: DamageType,
  isCritical: boolean,
  critRange: number,
  returnTo: AfterDamageReturn
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  if (!isHit(attackRoll, targetAc, critRange)) {
    return { creatures: new Map(cs), ...returnToState(returnTo) }
  }
  const atkCtx: AttackHitCtx = {
    attacker: attackerId,
    target: targetId,
    attackRoll,
    targetAc: armorClass(targetAc),
    damage,
    damageType,
    isCritical,
    critRange,
    atkReturnTo: returnTo
  }
  const elig = eligibleExcluding(cs, attackerId)
  if (elig.size > 0) {
    return {
      creatures: new Map(cs),
      ...phaseAwaitReaction(mkAwait({ tag: "PIAttackHit", ctx: atkCtx }, "TAttackHits", elig))
    }
  }
  return dealDamageWithAfterReactions(cs, targetId, attackerId, damage, damageType, isCritical, returnTo)
}

export function battleAttack({ context: c, event: e }: BattleActionArgs<"BATTLE_ATTACK">): Partial<BattleContext> {
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  const tc = c.creatures.get(e.targetId)!
  if (ac.dead || isIncapacitated(ac) || tc.dead) return {}
  if (ac.actionsRemaining <= 0 && ac.extraAttacksRemaining <= 0) return {}
  const updatedAc =
    ac.attackActionUsed && ac.extraAttacksRemaining > 0 ? spendExtraAttack(ac) : spendAction(ac, "attack")
  const cs = setCreature(c.creatures, id, updatedAc)
  return resolveAttack(cs, id, e.targetId, e.attackRoll, e.tAc, e.dmg, e.dt, e.crit, ac.critRange, ADR_ACTIVE_TURN)
}

export function battleResolveHitReaction({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_RESOLVE_HIT_REACTION">): Partial<BattleContext> {
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAttackHit(aw.interrupt)
  if (!pi) return {}
  const atk = pi.ctx
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null) {
    const result = advanceFromHitPhase(c.creatures, atk)
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      laCtx: result.laCtx
    }
  }
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  const retroAtk = Match.value(e.decision).pipe(
    byTag("RShield", () => ({ ...atk, targetAc: armorClass(atk.targetAc + 5) })),
    byTag("RParry", (d) => ({ ...atk, targetAc: armorClass(atk.targetAc + d.bonus) })),
    byTag("RCuttingWords", (d) => ({ ...atk, attackRoll: atk.attackRoll - d.reduction })),
    byTag("RPass", () => atk),
    Match.exhaustive
  )
  if (retroAtk !== atk) {
    const cs = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
    const newElig = new Set(aw.eligible)
    newElig.delete(e.reactorId)
    return {
      creatures: cs,
      ...phaseAwaitReaction({
        interrupt: { tag: "PIAttackHit", ctx: retroAtk },
        trigger: "TAttackHits",
        eligible: newElig,
        offered: newOffered
      })
    }
  }
  return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) }
}

export function battleResolveDmgReaction({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_RESOLVE_DMG_REACTION">): Partial<BattleContext> {
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
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      laCtx: result.laCtx
    }
  }
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  const reactor = c.creatures.get(e.reactorId)!
  const newDmg = Match.value(e.decision).pipe(
    byTag("RUncannyDodge", () => uncannyDodgeDamage(atk.damage)),
    byTag("RDamageReduction", (d) => deflectAttacksResult(atk.damage, d.amount).damageTaken),
    byTag("RPass", () => atk.damage),
    Match.exhaustive
  )
  if (newDmg !== atk.damage) {
    const cs = setCreature(c.creatures, e.reactorId, spendReaction(reactor))
    const newElig = new Set(aw.eligible)
    newElig.delete(e.reactorId)
    return {
      creatures: cs,
      ...phaseAwaitReaction({
        interrupt: { tag: "PIAttackDamage", ctx: { ...atk, damage: newDmg } },
        trigger: "TAttackDamages",
        eligible: newElig,
        offered: newOffered
      })
    }
  }
  return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) }
}

export function battleAfterDamagePass({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_AFTER_DAMAGE_PASS">): Partial<BattleContext> {
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAfterDamage(aw.interrupt)
  if (!pi) return {}
  const ad = pi.ctx
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null)
    return { ...returnToState(ad.returnTo) }
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) }
}

export function battleAfterDamageSpellReaction({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_AFTER_DAMAGE_SPELL_REACTION">): Partial<BattleContext> {
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAfterDamage(aw.interrupt)
  if (!pi) return {}
  const ad = pi.ctx
  if (e.reactorId === null) return {}
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
  const actualDmg = e.reactionSaved ? Math.trunc(e.reactionDmg / 2) : e.reactionDmg
  const result = dealDamageWithAfterReactions(
    cs1,
    ad.damageSource,
    e.reactorId,
    actualDmg,
    e.reactionDt,
    false,
    ad.returnTo
  )
  return { ...result }
}

export function battleAfterDamageRetaliation({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_AFTER_DAMAGE_RETALIATION">): Partial<BattleContext> {
  const aw = awaitingReaction(c)
  if (!aw) return {}
  const pi = piAfterDamage(aw.interrupt)
  if (!pi) return {}
  const ad = pi.ctx
  if (e.reactorId === null) return {}
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(c.creatures.get(e.reactorId)!))
  const newOffered = new Set(aw.offered)
  newOffered.add(e.reactorId)
  if (!isHit(e.retAtkRoll, e.retTgtAc)) return { creatures: cs1, ...phaseAwaitReaction({ ...aw, offered: newOffered }) }
  const result = dealDamageWithAfterReactions(
    cs1,
    ad.damageSource,
    e.reactorId,
    e.retDmg,
    e.retDt,
    e.retCrit,
    ad.returnTo
  )
  return { ...result }
}
