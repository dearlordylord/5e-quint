import {
  applyFailEffects,
  awaitingReaction,
  canProvideBattleSpellComponents,
  eligibleForCounterspell,
  expendSlot,
  mkAwait,
  piSaveFailed,
  piSaveFailedAoE,
  piSaveFailedTraversal,
  piSpellCast,
  prepareBattleCasterForSpell,
  setCreature,
  setDifference,
  spendLR,
  spendReaction,
} from "#/battle-machine-helpers.ts";
import {
  refundSpellEntry,
  resolveSpellEntry,
  returnToCSWindow,
} from "#/battle-machine-spells.ts";
import type {
  AoESpellCtx,
  BattleActionArgs,
  BattleContext,
  SaveFailedCtx,
  SpellCastCtx,
  SpellStackEntry,
  TraversalMovementCtx,
} from "#/battle-machine-types.ts";
import {
  ADR_ACTIVE_TURN,
  PHASE_ACTIVE,
  phaseAwaitReaction,
} from "#/battle-machine-types.ts";

export function battleResolveCounterspell({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_RESOLVE_COUNTERSPELL">): Partial<BattleContext> {
  const aw = awaitingReaction(c);
  if (!aw) return {};
  const piSC = piSpellCast(aw.interrupt);
  if (!piSC) return {};
  const spell = piSC.ctx;
  if (
    setDifference(aw.eligible, aw.offered).size === 0 ||
    e.reactorId === null
  ) {
    if (spell.postCast.tag === "PCECounterspell") {
      const csEffect = spell.postCast.cs;
      if (c.spellStack.length === 0) return { ...PHASE_ACTIVE };
      const popped = {
        top: c.spellStack[c.spellStack.length - 1],
        rest: c.spellStack.slice(0, -1),
      };
      if (!csEffect.conSaveSucceeded) {
        const refunded = refundSpellEntry(c.creatures, popped.top);
        if (popped.top.spellPostCast.tag === "PCECounterspell") {
          if (popped.rest.length === 0)
            return {
              creatures: refunded,
              ...PHASE_ACTIVE,
              spellStack: popped.rest,
            };
          const gp = {
            top: popped.rest[popped.rest.length - 1],
            rest: popped.rest.slice(0, -1),
          };
          const result = returnToCSWindow(refunded, gp.top, gp.rest);
          return { ...result, spellStack: result.stack };
        }
        return {
          creatures: refunded,
          ...PHASE_ACTIVE,
          spellStack: popped.rest,
        };
      }
      const result = returnToCSWindow(c.creatures, popped.top, popped.rest);
      return { ...result, spellStack: result.stack };
    }
    const result = resolveSpellEntry(
      c.creatures,
      spell.caster,
      spell.slotLvl,
      spell.ritual,
      spell.postCast,
      c.spellStack,
    );
    return { ...result, spellStack: result.stack };
  }

  const newOffered = new Set(aw.offered);
  newOffered.add(e.reactorId);
  if (!e.decision || e.decision.tag === "RPass") {
    return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) };
  }
  const reactor = c.creatures.get(e.reactorId)!;
  if (!canProvideBattleSpellComponents(reactor, "counterspell")) return {};
  const preparedReactor = prepareBattleCasterForSpell(reactor, "counterspell");
  let cs = setCreature(
    c.creatures,
    e.reactorId,
    spendReaction(preparedReactor),
  );
  cs = setCreature(
    cs,
    e.reactorId,
    expendSlot(cs.get(e.reactorId)!, e.csSlotLvl),
  );
  const conSaveSucceeded = e.decision.saveSucceeded;
  const stackEntry: SpellStackEntry = {
    spellCasterId: spell.caster,
    spellPostCast: spell.postCast,
    offered: newOffered,
    slotLvl: spell.slotLvl,
    spellName: spell.spellName,
    ritual: spell.ritual,
  };
  const csSpell: SpellCastCtx = {
    caster: e.reactorId,
    spellName: "counterspell",
    postCast: {
      tag: "PCECounterspell",
      cs: { targetCasterId: spell.caster, conSaveSucceeded },
    },
    slotLvl: e.csSlotLvl,
    ritual: false,
  };
  const csElig = eligibleForCounterspell(cs, e.reactorId);
  return {
    creatures: cs,
    spellStack: [...c.spellStack, stackEntry],
    ...phaseAwaitReaction(
      mkAwait({ tag: "PISpellCast", ctx: csSpell }, "TSpellBeingCast", csElig),
    ),
  };
}

export function battleResolveSaveFailedReaction({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_RESOLVE_SAVE_FAILED_REACTION">): Partial<BattleContext> {
  const aw2 = awaitingReaction(c);
  if (!aw2) return {};
  const piSF = piSaveFailed(aw2.interrupt);
  const piSFAoE = piSaveFailedAoE(aw2.interrupt);
  const piSFTraversal = piSaveFailedTraversal(aw2.interrupt);
  if (!piSF && !piSFAoE && !piSFTraversal) return {};
  const sf: SaveFailedCtx = piSF
    ? piSF.ctx
    : piSFAoE
      ? piSFAoE.sf
      : piSFTraversal!.sf;
  const aoe: AoESpellCtx | undefined = piSFAoE ? piSFAoE.aoe : undefined;
  const traversal: TraversalMovementCtx | undefined = piSFTraversal
    ? piSFTraversal.traversal
    : undefined;
  const returnTo =
    aoe && aoe.remaining.size > 0
      ? { tag: "ADRResolvingAoE" as const, aoe }
      : traversal && traversal.remaining.length > 0
        ? { tag: "ADRResolvingTraversal" as const, traversal }
        : ADR_ACTIVE_TURN;
  if (
    setDifference(aw2.eligible, aw2.offered).size === 0 ||
    e.reactorId === null
  ) {
    const result = applyFailEffects(c.creatures, sf, returnTo);
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      traversalCtx: result.traversalCtx,
      laCtx: result.laCtx,
    };
  }
  if (e.decision.tag === "RLegendaryResistance") {
    const cs1 = spendLR(c.creatures, e.reactorId);
    const result = applyFailEffects(
      cs1,
      { ...sf, saveSucceeded: true },
      returnTo,
    );
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      traversalCtx: result.traversalCtx,
      laCtx: result.laCtx,
    };
  }
  const newOff = new Set(aw2.offered);
  newOff.add(e.reactorId);
  return { ...phaseAwaitReaction({ ...aw2, offered: newOff }) };
}
