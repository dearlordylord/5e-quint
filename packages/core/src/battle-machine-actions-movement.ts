import {
  buildBattleAttackContext,
  resolveAttack,
} from "#/battle-machine-actions-attack.ts";
import { initiativeDurationRounds } from "@dnd/shared-algebras/elapsed-time-algebra";
import { isIncapacitated, removeCondition } from "#/battle-machine-creature.ts";
import {
  activeId,
  canMakeOpportunityAttack,
  consumeHelp,
  findHelpAdvantage,
  resolveSave,
  setCreature,
  setDifference,
  spendAction,
  spendMovement,
  spendReaction,
} from "#/battle-machine-helpers.ts";
import {
  getMonsterStatBlockByStateId,
  statBlockTraversalMovementActionEntry,
} from "#/monster-catalog.ts";
import type {
  BattleActionArgs,
  BattleContext,
  BattleCreatureState,
  TraversalMovementCtx,
} from "#/battle-machine-types.ts";
import {
  ADR_ACTIVE_TURN,
  PHASE_ACTIVE,
  phaseResolvingMovement,
  phaseResolvingTraversal,
} from "#/battle-machine-types.ts";
import { spendHalfSpeed } from "#/machine-helpers.ts";
import {
  aggregateAttackMods,
  hasAttackDisadvantageSource,
} from "#/machine-combat.ts";
import { SIZE_ORDER } from "#/srd-constants.ts";
import { difficultyClass } from "#/types.ts";

function sizeAtMost(
  targetSize: BattleCreatureState["creatureSize"],
  maxSize: BattleCreatureState["creatureSize"],
): boolean {
  return SIZE_ORDER.indexOf(targetSize) <= SIZE_ORDER.indexOf(maxSize);
}

function spendBonusAction(c: BattleCreatureState): BattleCreatureState {
  return c.bonusActionUsed ? c : { ...c, bonusActionUsed: true };
}

function spendTraversalAction(
  creature: BattleCreatureState,
  actionType: "action" | "bonusAction",
) {
  return actionType === "action"
    ? spendAction(creature, "utilize")
    : spendBonusAction(creature);
}

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

export function battleMonsterTraversal({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_MONSTER_TRAVERSAL">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const monsterId = activeId(c);
  const monster = c.creatures.get(monsterId);
  const selected = c.selectedMonsterCommand;
  const owner =
    monster == null
      ? null
      : getMonsterStatBlockByStateId(monster.monsterStatBlockId);
  const traversalEntry =
    owner == null
      ? null
      : statBlockTraversalMovementActionEntry(owner, e.abilityId);
  const ability = traversalEntry?.ability ?? null;
  const actionType = traversalEntry?.actionType;
  if (
    monster == null ||
    monster.dead ||
    isIncapacitated(monster) ||
    ability == null ||
    actionType == null ||
    (actionType === "action" && monster.actionsRemaining <= 0) ||
    (actionType === "bonusAction" && monster.bonusActionUsed) ||
    (selected != null &&
      (selected.monsterId !== monsterId || selected.abilityId !== e.abilityId))
  ) {
    return {};
  }
  if (e.movementSpent < 0 || !Number.isInteger(e.movementSpent)) {
    return {};
  }
  if (owner == null) return {};
  const requiresRecharge = owner.rechargeAbilities[e.abilityId] != null;
  const requiresDaily = owner.dailyAbilities[e.abilityId] != null;
  if (
    requiresRecharge &&
    (selected == null ||
      selected.type !== "USE_RECHARGE_ABILITY" ||
      !monster.rechargeAvailable[e.abilityId])
  ) {
    return {};
  }
  if (
    requiresDaily &&
    (selected == null ||
      selected.type !== "USE_DAILY_ABILITY" ||
      (monster.dailyUsesRemaining[e.abilityId] ?? 0) <= 0)
  ) {
    return {};
  }
  if (
    ability.movement.maxDistance.kind !== "speed" ||
    e.movementSpent > monster.effectiveSpeed
  ) {
    return {};
  }
  const dragCost =
    monster.grapplingTarget != null && !monster.grappledTargetTwoSizesSmaller
      ? 2
      : 1;
  if (e.movementSpent * dragCost > monster.movementRemaining) return {};
  const seenTargets = new Set<string>();
  for (const entered of e.enteredCreatures) {
    if (entered.targetId === monsterId || seenTargets.has(entered.targetId)) {
      return {};
    }
    seenTargets.add(entered.targetId);
    const target = c.creatures.get(entered.targetId);
    if (
      target == null ||
      target.dead ||
      (ability.movement.passThroughCreatureSpacesUpToSize != null &&
        !sizeAtMost(
          target.creatureSize,
          ability.movement.passThroughCreatureSpacesUpToSize,
        ))
    ) {
      return {};
    }
  }
  const movedMonster = {
    ...spendTraversalAction(
      spendMovement(monster, e.movementSpent, dragCost),
      actionType,
    ),
    battlePosition: e.destination,
    ...(requiresRecharge
      ? {
          rechargeAvailable: {
            ...monster.rechargeAvailable,
            [e.abilityId]: false,
          },
        }
      : {}),
    ...(requiresDaily
      ? {
          dailyUsesRemaining: {
            ...monster.dailyUsesRemaining,
            [e.abilityId]: (monster.dailyUsesRemaining[e.abilityId] ?? 0) - 1,
          },
        }
      : {}),
  };
  const creatures = setCreature(c.creatures, monsterId, movedMonster);
  if (e.enteredCreatures.length === 0) {
    return {
      creatures,
      selectedMonsterCommand: null,
    };
  }
  const traversalCtx: TraversalMovementCtx = {
    mover: monsterId,
    abilityId: e.abilityId,
    save: ability.enteredCreatureEffect.save,
    remaining: e.enteredCreatures,
  };
  return {
    creatures,
    ...phaseResolvingTraversal(traversalCtx),
  };
}

export function battleResolveTraversalStep({
  context: c,
}: BattleActionArgs<"BATTLE_START_TURN">): Partial<BattleContext> {
  const traversal = c.traversalCtx;
  if (traversal == null) return {};
  const [nextTarget, ...remaining] = traversal.remaining;
  if (nextTarget == null) return { ...PHASE_ACTIVE };
  const mover = c.creatures.get(traversal.mover);
  const target = c.creatures.get(nextTarget.targetId);
  if (mover == null || target == null || mover.dead || target.dead) {
    return remaining.length === 0
      ? { ...PHASE_ACTIVE }
      : {
          ...phaseResolvingTraversal({
            ...traversal,
            remaining,
          }),
        };
  }
  const conditionOnFail =
    "conditionOnFail" in traversal.save
      ? traversal.save.conditionOnFail
      : undefined;
  const appliesCondition =
    conditionOnFail != null &&
    (conditionOnFail.targetSizeAtMost == null ||
      sizeAtMost(target.creatureSize, conditionOnFail.targetSizeAtMost));
  const timedConditionOnFail =
    appliesCondition && conditionOnFail?.duration != null
      ? conditionOnFail
      : null;
  const failureBand =
    "failureBand" in traversal.save ? traversal.save.failureBand : undefined;
  const continuedTraversal = {
    ...traversal,
    remaining,
  } as const;
  const returnTo =
    remaining.length === 0
      ? ADR_ACTIVE_TURN
      : {
          tag: "ADRResolvingTraversal" as const,
          traversal: continuedTraversal,
        };
  return resolveSave(
    c.creatures,
    {
      caster: traversal.mover,
      target: nextTarget.targetId,
      saveDC: difficultyClass(traversal.save.dc),
      saveRoll: nextTarget.saveRoll,
      ...(nextTarget.saveRollB != null
        ? { saveRollB: nextTarget.saveRollB }
        : {}),
      damageOnFail: traversal.save.damageOnFail,
      halfOnSuccess: traversal.save.halfOnSuccess,
      damageType: traversal.save.damageType,
      ...(appliesCondition
        ? { conditionOnFail: conditionOnFail.condition }
        : {}),
      applyCondition: appliesCondition,
      saveAbility: traversal.save.ability,
      saveTriggerKind: "none",
      ...(timedConditionOnFail != null
        ? {
            conditionDurationOnFail: {
              effectId: `monster:${traversal.mover}:${traversal.abilityId}:${nextTarget.targetId}`,
              roundsRemaining: initiativeDurationRounds(
                timedConditionOnFail.duration.rounds,
              ),
              expiresAt: timedConditionOnFail.duration.expiresAt,
              expiryOwnerId:
                timedConditionOnFail.duration.expiryOwner === "target"
                  ? nextTarget.targetId
                  : traversal.mover,
            },
          }
        : {}),
      ...(timedConditionOnFail != null && failureBand != null
        ? {
            failureBandCondition: {
              minimumMargin: failureBand.minimumMargin,
              condition: failureBand.condition,
              whileCondition: failureBand.whileCondition,
              ...(failureBand.endsEarlyOnDamage
                ? { endsEarlyOnDamage: true }
                : {}),
              ...(failureBand.endsEarlyOnWakeActionWithinFeet != null
                ? {
                    endsEarlyOnWakeActionWithinFeet:
                      failureBand.endsEarlyOnWakeActionWithinFeet,
                  }
                : {}),
            },
          }
        : {}),
    },
    returnTo,
    (sf) => ({
      tag: "PISaveFailedTraversal",
      sf,
      traversal: continuedTraversal,
    }),
  );
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
