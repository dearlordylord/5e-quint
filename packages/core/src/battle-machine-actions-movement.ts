import {
  buildBattleAttackContext,
  resolveAttack,
} from "#/battle-machine-actions-attack.ts";
import { isIncapacitated, removeCondition } from "#/battle-machine-creature.ts";
import {
  activeId,
  canMakeOpportunityAttack,
  consumeHelp,
  findHelpAdvantage,
  setCreature,
  setDifference,
  spendMovement,
  spendReaction,
} from "#/battle-machine-helpers.ts";
import type {
  BattleActionArgs,
  BattleContext,
} from "#/battle-machine-types.ts";
import {
  PHASE_ACTIVE,
  phaseResolvingMovement,
} from "#/battle-machine-types.ts";
import { spendHalfSpeed } from "#/machine-helpers.ts";
import {
  aggregateAttackMods,
  hasAttackDisadvantageSource,
} from "#/machine-combat.ts";

export function battleMove({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_MOVE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac) || ac.movementRemaining <= 0) return {};
  const dragCost =
    ac.grapplingTarget != null && !ac.grappledTargetTwoSizesSmaller ? 2 : 1;
  const cs = setCreature(c.creatures, id, spendMovement(ac, 5, dragCost));
  // The caller owns geometry and provides the threat set for this 5ft reach-exit checkpoint.
  if (
    ac.disengaged ||
    e.provocationKind === "doesNotProvokeOpportunityAttacks"
  ) {
    return { creatures: cs };
  }
  const oaEligible = new Set(
    [...e.threatened].filter((tid) => {
      const t = cs.get(tid);
      return t != null && canMakeOpportunityAttack(t);
    }),
  );
  if (oaEligible.size === 0) return { creatures: cs };
  return {
    creatures: cs,
    ...phaseResolvingMovement({
      mover: id,
      threatenedBy: oaEligible,
      processed: new Set(),
    }),
  };
}

export function battleMovementOADecline({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_MOVEMENT_OA_DECLINE">): Partial<BattleContext> {
  const mv = c.movementCtx;
  if (!mv) return {};
  if (
    setDifference(mv.threatenedBy, mv.processed).size === 0 ||
    e.reactorId === null
  )
    return { ...PHASE_ACTIVE };
  const newProcessed = new Set(mv.processed);
  newProcessed.add(e.reactorId);
  return { ...phaseResolvingMovement({ ...mv, processed: newProcessed }) };
}

export function battleMovementOAAttack({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_MOVEMENT_OA_ATTACK">): Partial<BattleContext> {
  const mv = c.movementCtx;
  if (!mv) return {};
  if (e.reactorId === null) return {};
  const newProc = new Set(mv.processed);
  newProc.add(e.reactorId);
  const updatedMv = { ...mv, processed: newProc };
  const reactor = c.creatures.get(e.reactorId)!;
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(reactor));
  const helpIdx = findHelpAdvantage(c.helpTargets, e.reactorId, mv.mover);
  const weaponProperties =
    e.weaponProperties ??
    reactor.mainHandWeapon?.properties ??
    new Set(e.isFinesse === true ? ["finesse"] : []);
  const ctx = buildBattleAttackContext(
    cs1,
    e.reactorId,
    mv.mover,
    true,
    weaponProperties,
    e.attackerWithin5ft,
    e.hostileWithin5ft,
    e.targetCanSeeAttacker,
    e.attackerCanSeeTarget,
    e.frightSourceInLOS,
    helpIdx >= 0,
  );
  const mods = aggregateAttackMods(ctx);
  const hasAnyDisadvantageSource = hasAttackDisadvantageSource(ctx);
  const result = resolveAttack(
    cs1,
    e.reactorId,
    mv.mover,
    e.oaAtkRoll,
    e.oaTgtAc,
    e.oaDmg,
    e.oaDt,
    e.oaDamageQualifiers ??
      reactor.mainHandWeapon?.damageQualifiers ??
      new Set(),
    e.oaCrit,
    reactor.critRange,
    { tag: "ADRResolvingMovement", mv: updatedMv },
    e.knockOut,
    true,
    e.attackerWithin5ft,
    e.attackerWithin60ft ?? false,
    e.targetCanSeeAttacker,
    mods,
    false,
    undefined,
    weaponProperties,
    undefined,
    e.hasAllyAdjacentToTarget,
    hasAnyDisadvantageSource,
    e.saDmg,
    e.hitReactionCandidates,
  );
  return helpIdx >= 0
    ? { ...result, helpTargets: consumeHelp(c.helpTargets, helpIdx) }
    : result;
}

/** SRD 5.2.1: standing from prone costs half your speed. */
export function battleStandFromProne({
  context: c,
}: BattleActionArgs<"BATTLE_STAND_FROM_PRONE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (!ac.prone || ac.dead || isIncapacitated(ac)) return {};
  const result = spendHalfSpeed(ac.movementRemaining, ac.effectiveSpeed);
  if (!result.success) return {};
  return {
    creatures: setCreature(
      c.creatures,
      id,
      removeCondition(
        { ...ac, movementRemaining: result.newMovementRemaining },
        "prone",
      ),
    ),
  };
}
