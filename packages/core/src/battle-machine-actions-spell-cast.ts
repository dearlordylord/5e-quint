import { Option } from "effect";
import { isIncapacitated } from "#/battle-machine-creature.ts";
import {
  battleSpellAccessId,
  resolveBattleSpellAccess,
} from "#/battle-spell-access.ts";
import {
  activeId,
  breakConcentrationAndPropagate,
  canProvideBattleSpellComponentsForAccess,
  eligibleForCounterspell,
  expendSlot,
  mkAwait,
  prepareBattleCasterForSpellAccess,
  resolveSave,
  setCreature,
  spendAction,
} from "#/battle-machine-helpers.ts";
import {
  getSpellRecord,
  makeSpellLibrary,
  resolveBattleReadyableSpellPayload,
  SRD_SPELLS,
} from "#/features/spell-registry.ts";
import { resolveConcentration } from "#/battle-machine-spells.ts";
import type {
  BattleActionArgs,
  BattleContext,
  SpellCastCtx,
} from "#/battle-machine-types.ts";
import {
  ADR_ACTIVE_TURN,
  PHASE_ACTIVE,
  phaseAwaitReaction,
} from "#/battle-machine-types.ts";
import { spellId } from "#/types.ts";

const SPELL_LIBRARY = makeSpellLibrary(SRD_SPELLS);

export function battleCastSaveSpell({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_CAST_SAVE_SPELL">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac)) return {};
  if (ac.ragingBlocksSpells) return {};
  const currentSpellId = e.spellId ?? spellId(e.spellName ?? "");
  const spellRecord = getSpellRecord(SPELL_LIBRARY, currentSpellId);
  if (spellRecord == null) return {};
  if (e.ritual && !spellRecord.ritual) return {};
  const access = resolveBattleSpellAccess({
    accesses: ac.spellAccesses,
    accessId: e.accessId,
    spellId: currentSpellId,
  });
  const resolvedAccess = Option.getOrNull(access);
  if (e.accessId != null && resolvedAccess == null) return {};
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
  if (e.bonusAction) {
    if (ac.bonusActionUsed || ac.slotExpendedThisTurn) return {};
  } else {
    if (ac.actionSurgeActionPending) return {};
    if (ac.actionsRemaining <= 0) return {};
    if (ac.slotExpendedThisTurn && !e.ritual) return {};
  }
  const payload = resolveBattleReadyableSpellPayload(
    currentSpellId,
    e.slotLvl,
    resolvedAccess?.spellSaveDC ?? e.saveDC,
  );
  if (payload == null) return {};
  let cs = e.bonusAction
    ? setCreature(c.creatures, id, {
        ...preparedCaster,
        bonusActionUsed: true,
        bonusActionSpellCast: true,
      })
    : setCreature(c.creatures, id, spendAction(preparedCaster, "magic"));
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl));
  const saveCtx = {
    caster: id,
    target: e.targetId,
    saveDC: payload.release.saveDC,
    saveRoll: e.saveRoll,
    ...(e.saveRollB != null ? { saveRollB: e.saveRollB } : {}),
    damageOnFail: payload.release.damageOnFail,
    halfOnSuccess: payload.release.halfOnSuccess,
    damageType: payload.release.damageType,
    conditionOnFail: payload.release.conditionOnFail,
    applyCondition: payload.release.applyCondition,
    saveAbility: payload.release.saveAbility,
    saveTriggerKind: "spell" as const,
  };
  const spellCtx: SpellCastCtx = {
    caster: id,
    accessId:
      resolvedAccess?.accessId ??
      battleSpellAccessId(`rawSave:${currentSpellId}`),
    spellId: currentSpellId,
    postCast: { tag: "PCESave", save: saveCtx },
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
  const result = resolveSave(cs, saveCtx, ADR_ACTIVE_TURN);
  return { ...result };
}

export function battleCastConcentrationSpell({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_CAST_CONCENTRATION_SPELL">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {};
  if (ac.actionSurgeActionPending || ac.ragingBlocksSpells) return {};
  if (ac.slotExpendedThisTurn && !e.ritual) return {};
  const access = resolveBattleSpellAccess({
    accesses: ac.spellAccesses,
    accessId: e.accessId,
    spellId: e.spellId,
  });
  if (Option.isNone(access)) return {};
  if (!canProvideBattleSpellComponentsForAccess(ac, access.value)) return {};
  const preparedCaster = prepareBattleCasterForSpellAccess(ac, access.value);
  let cs = setCreature(c.creatures, id, spendAction(preparedCaster, "magic"));
  if (!e.ritual) cs = setCreature(cs, id, expendSlot(cs.get(id)!, e.slotLvl));
  const concCtx = {
    caster: id,
    target: e.targetId,
    spellId: e.spellId,
    duration: e.duration,
    conditionOnFail: e.cond,
    applyCondition: e.applyCond,
  };
  const spellCtx: SpellCastCtx = {
    caster: id,
    accessId: access.value.accessId,
    spellId: e.spellId,
    postCast: { tag: "PCEConcentration" as const, conc: concCtx },
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
  return { creatures: resolveConcentration(cs, concCtx), ...PHASE_ACTIVE };
}

export function battleConcentrationCheck({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_CONCENTRATION_CHECK">): Partial<BattleContext> {
  if (e.conSaveSucceeded) return {};
  const cs = breakConcentrationAndPropagate(c.creatures, e.targetId);
  return { creatures: cs };
}
