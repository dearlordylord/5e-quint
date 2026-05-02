import { Option } from "effect";
import { isIncapacitated } from "#/battle-machine-creature.ts";
import {
  battleSpellAccessById,
  resolveBattleSpellAccess,
} from "#/battle-spell-access.ts";
import {
  activeId,
  effectiveBattleSaveRollForCreature,
  applyDamageWithAfterReactions,
  applyFailEffects,
  canProvideBattleSpellComponentsForAccess,
  eligibleForCounterspell,
  eligibleForLR,
  expendSlot,
  mkAwait,
  prepareBattleCasterForSpellAccess,
  setCreature,
  spendAction,
} from "#/battle-machine-helpers.ts";
import type {
  AoESpellCtx,
  BattleActionArgs,
  BattleContext,
  BattleCreatureState,
  CreatureId,
  SaveFailedCtx,
  SpellCastCtx,
} from "#/battle-machine-types.ts";
import {
  PHASE_ACTIVE,
  phaseAwaitReaction,
  phaseResolvingAoE,
} from "#/battle-machine-types.ts";
import { evasionDamage } from "#/features/class-rogue.ts";
import { spellId } from "#/types.ts";
import { battleSpellAccessId } from "#/battle-spell-access.ts";

function expendMonsterSpellDailyUse(
  actor: BattleCreatureState,
  accessId: BattleActionArgs<"BATTLE_CAST_AOE">["event"]["accessId"],
): BattleCreatureState | "unavailable" | null {
  if (accessId == null) return null;
  const access = battleSpellAccessById(actor.spellAccesses, accessId);
  if (Option.isNone(access)) return null;
  const spellAccess = access.value;
  if (spellAccess.resourcePath.kind !== "dailyUse") return null;
  const current = actor.dailyUsesRemaining[spellAccess.resourcePath.usageId];
  if (current == null) return null;
  if (current <= 0) return "unavailable";
  return {
    ...actor,
    dailyUsesRemaining: {
      ...actor.dailyUsesRemaining,
      [spellAccess.resourcePath.usageId]: current - 1,
    },
  };
}

export function battleCastAoE({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_CAST_AOE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {};
  if (ac.actionSurgeActionPending || ac.ragingBlocksSpells) return {};
  if (ac.slotExpendedThisTurn && !e.ritual) return {};
  const currentSpellId = e.spellId ?? spellId(e.spellName ?? "");
  const access = resolveBattleSpellAccess({
    accesses: ac.spellAccesses,
    accessId: e.accessId,
    spellId: currentSpellId,
  });
  const resolvedAccess = Option.getOrNull(access);
  if (e.accessId != null && resolvedAccess == null) {
    return {};
  }
  if (
    resolvedAccess != null &&
    !canProvideBattleSpellComponentsForAccess(ac, resolvedAccess)
  ) {
    return {};
  }
  const preparedCaster =
    resolvedAccess == null
      ? ac
      : prepareBattleCasterForSpellAccess(ac, resolvedAccess);
  let cs = setCreature(c.creatures, id, spendAction(preparedCaster, "magic"));
  const monsterDailyUser = expendMonsterSpellDailyUse(
    cs.get(id)!,
    resolvedAccess?.accessId ?? e.accessId,
  );
  if (monsterDailyUser === "unavailable") {
    return {};
  }
  if (monsterDailyUser != null) {
    cs = setCreature(cs, id, monsterDailyUser);
  } else if (!e.ritual) {
    cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl));
  }
  const liveTargets = new Set<CreatureId>();
  for (const [cid, cr] of cs) {
    if (cid !== id && !cr.dead) liveTargets.add(cid);
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
    saveAbility: e.saveAbility,
    saveTriggerKind: "spell",
  };
  const spellCtx: SpellCastCtx = {
    caster: id,
    // Raw generic AoE events may exercise the battle lane without a modeled
    // authored access. Keep a bookkeeping-only synthetic id there so the
    // interrupt stack can still point at the invocation without implying a
    // semantic access path.
    accessId:
      resolvedAccess?.accessId ??
      battleSpellAccessId(`rawAoE:${currentSpellId}`),
    spellId: currentSpellId,
    postCast: { tag: "PCEAoE", aoe: aoeCtx },
    slotLvl: e.slotLvl,
    ritual: e.ritual,
  };
  const csElig = eligibleForCounterspell(cs, id);
  if (csElig.size > 0) {
    return {
      creatures: cs,
      ...phaseAwaitReaction(
        mkAwait(
          { tag: "PISpellCast", ctx: spellCtx },
          "TSpellBeingCast",
          csElig,
        ),
      ),
    };
  }
  return { creatures: cs, ...phaseResolvingAoE(aoeCtx) };
}

export function battleResolveAoETarget({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_RESOLVE_AOE_TARGET">): Partial<BattleContext> {
  const aoe = c.aoeCtx;
  if (!aoe) return {};
  if (aoe.remaining.size === 0 || e.targetId === null)
    return { ...PHASE_ACTIVE };
  const newRemaining = new Set(aoe.remaining);
  newRemaining.delete(e.targetId);
  const updatedAoe = { ...aoe, remaining: newRemaining };
  const tgt = c.creatures.get(e.targetId)!;
  const tgtIncap = isIncapacitated(tgt);
  const isDex = aoe.saveAbility === "dex";
  const saveRoll = effectiveBattleSaveRollForCreature(
    tgt,
    aoe.saveTriggerKind,
    e.saveRoll,
    e.saveRollB,
  );
  const saved = saveRoll + tgt.saveMiscBonus >= aoe.saveDC;
  const aoeReturn = { tag: "ADRResolvingAoE" as const, aoe: updatedAoe };
  if (saved) {
    if (aoe.halfOnSuccess && aoe.damageOnFail > 0) {
      const halfDmg = Math.trunc(aoe.damageOnFail / 2);
      const evDmg = isDex
        ? evasionDamage(tgt.hasEvasion, tgtIncap, true, halfDmg)
        : halfDmg;
      if (evDmg === 0) {
        return { ...phaseResolvingAoE(updatedAoe) };
      }
      const result = applyDamageWithAfterReactions(
        c.creatures,
        e.targetId,
        aoe.caster,
        evDmg,
        aoe.damageType,
        new Set(),
        false,
        false,
        aoeReturn,
      );
      return { ...result };
    }
    return { ...phaseResolvingAoE(updatedAoe) };
  }
  const evDmgOnFail = isDex
    ? evasionDamage(tgt.hasEvasion, tgtIncap, false, aoe.damageOnFail)
    : aoe.damageOnFail;
  const sfCtx: SaveFailedCtx = {
    caster: aoe.caster,
    target: e.targetId,
    damageOnFail: evDmgOnFail,
    halfOnSuccess: aoe.halfOnSuccess,
    damageType: aoe.damageType,
    conditionOnFail: aoe.conditionOnFail,
    applyCondition: aoe.applyCondition,
    saveSucceeded: false,
  };
  const elig = eligibleForLR(c.creatures, e.targetId);
  if (elig.size > 0) {
    return {
      ...phaseAwaitReaction(
        mkAwait(
          { tag: "PISaveFailedAoE", sf: sfCtx, aoe: updatedAoe },
          "TSaveFailed",
          elig,
        ),
      ),
    };
  }
  const result = applyFailEffects(c.creatures, sfCtx, aoeReturn);
  return { ...result };
}
