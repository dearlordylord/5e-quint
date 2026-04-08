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
import { aggregateAttackMods } from "#/machine-combat.ts"
import type { AttackContext, CreatureId, DamageType, FullAttackMods } from "#/types.ts"
import { armorClass } from "#/types.ts"

type Creatures = ReadonlyMap<CreatureId, BattleCreatureState>

/** Build AttackContext from battle creature state + per-attack parameters. */
export function buildBattleAttackContext(
  cs: Creatures,
  attackerId: CreatureId,
  targetId: CreatureId,
  isMelee: boolean,
  attackerWithin5ft: boolean,
  hostileWithin5ft: boolean,
  targetCanSeeAttacker: boolean,
  attackerCanSeeTarget: boolean,
  frightSourceInLOS: boolean
): AttackContext {
  const atk = cs.get(attackerId)!
  const tgt = cs.get(targetId)!
  return {
    attackerBlinded: atk.blinded,
    attackerProne: atk.prone,
    attackerRestrained: atk.restrained,
    attackerPoisoned: atk.poisoned,
    attackerFrightened: atk.frightened,
    attackerFrightSourceInLOS: frightSourceInLOS,
    targetBlinded: tgt.blinded,
    targetParalyzed: tgt.paralyzed,
    targetPetrified: tgt.petrified,
    targetStunned: tgt.stunned,
    targetUnconscious: tgt.unconscious,
    targetRestrained: tgt.restrained,
    targetProne: tgt.prone,
    attackerWithin5ft,
    targetDodging: tgt.dodging,
    targetCanSeeAttacker,
    attackerCanSeeTarget,
    isRangedAttack: !isMelee,
    beyondNormalRange: false,
    hostileWithin5ft,
    isHeavyWeapon: false,
    wielderStrScore: 16, // not modeled in battle; safe default
    wielderDexScore: 14,
    attackerGrappled: false, // grapple not in battle yet (F9)
    targetIsGrappler: false,
    underwater: false,
    attackerHasSwimSpeed: false,
    isUnderwaterMeleeException: false,
    isUnderwaterRangedException: false,
    attackerReckless: atk.recklessThisTurn,
    targetReckless: tgt.recklessThisTurn
  }
}

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
  returnTo: AfterDamageReturn,
  knockOut: boolean,
  isMelee: boolean,
  mods: FullAttackMods,
  onHitEffect: AttackHitCtx["onHitEffect"],
  isFinesse: boolean,
  hasAllyAdjacentToTarget: boolean,
  saDmg: number
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const hit = !mods.autoMiss && isHit(attackRoll, targetAc, critRange)
  if (!hit) {
    return { creatures: new Map(cs), ...returnToState(returnTo) }
  }
  const atk = cs.get(attackerId)!
  const meleeDmgBonus = isMelee ? atk.meleeDamageBonus : 0 // rage bonus: melee only (D1 fix)
  // Sneak Attack eligibility (SRD 5.2.1 Rogue "Sneak Attack")
  const eligibleWeapon = isFinesse || !isMelee
  const saEligible =
    atk.sneakAttackDice > 0 &&
    !atk.sneakAttackUsedThisTurn &&
    eligibleWeapon &&
    (mods.hasAdvantage || (hasAllyAdjacentToTarget && !mods.hasDisadvantage))
  const effectiveSaDmg = saEligible ? saDmg : 0
  const totalDmg = damage + meleeDmgBonus + effectiveSaDmg
  const effectiveCrit = isCritical || mods.autoCrit
  const effectiveKnockOut = knockOut && isMelee // SRD: knock out is melee only
  const cs1 = saEligible ? setCreature(cs, attackerId, { ...atk, sneakAttackUsedThisTurn: true }) : cs
  const atkCtx: AttackHitCtx = {
    attacker: attackerId,
    target: targetId,
    attackRoll,
    targetAc: armorClass(targetAc),
    damage: totalDmg,
    damageType,
    isCritical: effectiveCrit,
    critRange,
    atkReturnTo: returnTo,
    knockOut: effectiveKnockOut,
    onHitEffect
  }
  const elig = eligibleExcluding(cs1, attackerId)
  if (elig.size > 0) {
    return {
      creatures: new Map(cs1),
      ...phaseAwaitReaction(mkAwait({ tag: "PIAttackHit", ctx: atkCtx }, "TAttackHits", elig))
    }
  }
  return dealDamageWithAfterReactions(
    cs1,
    targetId,
    attackerId,
    totalDmg,
    damageType,
    effectiveCrit,
    effectiveKnockOut,
    returnTo
  )
}

export function battleAttack({ context: c, event: e }: BattleActionArgs<"BATTLE_ATTACK">): Partial<BattleContext> {
  if (!c.turnStarted) return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  const tc = c.creatures.get(e.targetId)!
  if (ac.dead || isIncapacitated(ac) || tc.dead) return {}
  if (ac.actionsRemaining <= 0 && ac.extraAttacksRemaining <= 0) return {}
  const updatedAc =
    ac.attackActionUsed && ac.extraAttacksRemaining > 0 ? spendExtraAttack(ac) : spendAction(ac, "attack")
  const cs = setCreature(c.creatures, id, updatedAc)
  const ctx = buildBattleAttackContext(
    cs,
    id,
    e.targetId,
    e.isMelee,
    e.attackerWithin5ft,
    e.hostileWithin5ft,
    e.targetCanSeeAttacker,
    e.attackerCanSeeTarget,
    e.frightSourceInLOS
  )
  const mods = aggregateAttackMods(ctx)
  return resolveAttack(
    cs,
    id,
    e.targetId,
    e.attackRoll,
    e.tAc,
    e.dmg,
    e.dt,
    e.crit,
    ac.critRange,
    ADR_ACTIVE_TURN,
    e.knockOut,
    e.isMelee,
    mods,
    e.onHitEffect,
    e.isFinesse,
    e.hasAllyAdjacentToTarget,
    e.saDmg
  )
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
    const result = advanceFromHitPhase(c.creatures, atk, activeId(c))
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
      atk.knockOut,
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
    false,
    ad.returnTo
  )
  return { ...result }
}
