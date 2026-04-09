/**
 * Spell resolution helpers — concentration, spell entry, counterspell window.
 * Split from battle-machine-helpers.ts for eslint max-lines compliance.
 */
import { Match, Option } from "effect";

import { addEffect, startConcentration } from "#/battle-machine-creature.ts";
import {
  applyCondition,
  breakConcentrationAndPropagate,
  byTag,
  eligibleForCounterspell,
  resolveSave,
  setCreature,
  setDifference,
} from "#/battle-machine-helpers.ts";
import type {
  BattleCreatureState,
  ConcentrationCtx,
  CreatureId,
  PhaseFields,
  PostCastEffect,
  SpellCastCtx,
  SpellStackEntry,
} from "#/battle-machine-types.ts";
import {
  ADR_ACTIVE_TURN,
  PHASE_ACTIVE,
  phaseAwaitReaction,
  phaseResolvingAoE,
} from "#/battle-machine-types.ts";

type Creatures = ReadonlyMap<CreatureId, BattleCreatureState>;

function refundSlot(
  c: BattleCreatureState,
  level: number,
): BattleCreatureState {
  const idx = level - 1;
  if (idx < 0 || idx >= c.slotsCurrent.length) return c;
  const current = c.slotsCurrent[idx];
  const maximum = c.slotsMax[idx];
  if (current == null || maximum == null || current >= maximum) return c;
  const newSlots = [...c.slotsCurrent];
  newSlots[idx] = current + 1;
  return { ...c, slotsCurrent: newSlots };
}

export function refundSpellEntry(
  cs: Creatures,
  entry: SpellStackEntry,
): Map<CreatureId, BattleCreatureState> {
  if (entry.ritual || entry.slotLvl <= 0) return new Map(cs);
  return setCreature(
    cs,
    entry.spellCasterId,
    refundSlot(cs.get(entry.spellCasterId)!, entry.slotLvl),
  );
}

export function resolveConcentration(
  cs: Creatures,
  conc: ConcentrationCtx,
): Map<CreatureId, BattleCreatureState> {
  let cs1: Map<CreatureId, BattleCreatureState> = Option.isSome(
    cs.get(conc.caster)!.concentrationSpellId,
  )
    ? breakConcentrationAndPropagate(cs, conc.caster)
    : new Map(cs);
  let c = startConcentration(cs1.get(conc.caster)!, conc.spellId);
  c = addEffect(c, conc.spellId, conc.duration, "end", conc.caster);
  cs1 = setCreature(cs1, conc.caster, c);
  let t = addEffect(
    cs1.get(conc.target)!,
    conc.spellId,
    conc.duration,
    "end",
    conc.caster,
    {
      grantedConditions: conc.applyCondition ? [conc.conditionOnFail] : [],
    },
  );
  if (conc.applyCondition) t = applyCondition(t, conc.conditionOnFail);
  return setCreature(cs1, conc.target, t);
}

export function resolveSpellEntry(
  cs: Creatures,
  _casterId: CreatureId,
  _slotLvl: number,
  _isRitual: boolean,
  postCast: PostCastEffect,
  stack: ReadonlyArray<SpellStackEntry>,
): {
  creatures: Map<CreatureId, BattleCreatureState>;
  stack: ReadonlyArray<SpellStackEntry>;
} & PhaseFields {
  const cs1: Map<CreatureId, BattleCreatureState> = new Map(cs);
  const result = Match.value(postCast).pipe(
    byTag("PCESave", (pc) => {
      const r = resolveSave(cs1, pc.save, ADR_ACTIVE_TURN);
      return {
        creatures: r.creatures,
        awaitCtx: r.awaitCtx,
        aoeCtx: r.aoeCtx,
        movementCtx: r.movementCtx,
        laCtx: r.laCtx,
        readyCtx: r.readyCtx,
      };
    }),
    byTag("PCEAoE", (pc) => ({ creatures: cs1, ...phaseResolvingAoE(pc.aoe) })),
    byTag("PCEConcentration", (pc) => ({
      creatures: resolveConcentration(cs1, pc.conc),
      ...PHASE_ACTIVE,
    })),
    byTag("PCEDone", () => ({ creatures: cs1, ...PHASE_ACTIVE })),
    byTag("PCECounterspell", () => {
      throw new Error(
        "resolveSpellEntry called with PCECounterspell — should be handled by returnToCSWindow",
      );
    }),
    Match.exhaustive,
  );
  return { ...result, stack };
}

export function returnToCSWindow(
  cs: Creatures,
  entry: SpellStackEntry,
  stack: ReadonlyArray<SpellStackEntry>,
): {
  creatures: Map<CreatureId, BattleCreatureState>;
  stack: ReadonlyArray<SpellStackEntry>;
} & PhaseFields {
  const freshElig = eligibleForCounterspell(cs, entry.spellCasterId);
  const remaining = setDifference(freshElig, entry.offered);
  if (remaining.size > 0) {
    const spell: SpellCastCtx = {
      caster: entry.spellCasterId,
      spellName: entry.spellName,
      postCast: entry.spellPostCast,
      slotLvl: entry.slotLvl,
      ritual: entry.ritual,
    };
    return {
      creatures: new Map(cs),
      stack,
      ...phaseAwaitReaction({
        interrupt: { tag: "PISpellCast", ctx: spell },
        trigger: "TSpellBeingCast",
        eligible: freshElig,
        offered: entry.offered,
      }),
    };
  }
  if (entry.spellPostCast.tag === "PCECounterspell") {
    const csEffect = entry.spellPostCast.cs;
    if (stack.length === 0)
      return { creatures: new Map(cs), ...PHASE_ACTIVE, stack };
    const popped = { top: stack[stack.length - 1], rest: stack.slice(0, -1) };
    if (!csEffect.conSaveSucceeded) {
      if (popped.top.spellPostCast.tag === "PCECounterspell") {
        if (popped.rest.length === 0)
          return {
            creatures: new Map(cs),
            ...PHASE_ACTIVE,
            stack: popped.rest,
          };
        const gp = {
          top: popped.rest[popped.rest.length - 1],
          rest: popped.rest.slice(0, -1),
        };
        const fe2 = eligibleForCounterspell(cs, gp.top.spellCasterId);
        if (setDifference(fe2, gp.top.offered).size > 0) {
          const sp2: SpellCastCtx = {
            caster: gp.top.spellCasterId,
            spellName: gp.top.spellName,
            postCast: gp.top.spellPostCast,
            slotLvl: gp.top.slotLvl,
            ritual: gp.top.ritual,
          };
          return {
            creatures: new Map(cs),
            stack: gp.rest,
            ...phaseAwaitReaction({
              interrupt: { tag: "PISpellCast", ctx: sp2 },
              trigger: "TSpellBeingCast",
              eligible: fe2,
              offered: gp.top.offered,
            }),
          };
        }
        return returnToCSWindow(cs, gp.top, gp.rest);
      }
      return { creatures: new Map(cs), ...PHASE_ACTIVE, stack: popped.rest };
    }
    const fe2 = eligibleForCounterspell(cs, popped.top.spellCasterId);
    if (setDifference(fe2, popped.top.offered).size > 0) {
      const sp2: SpellCastCtx = {
        caster: popped.top.spellCasterId,
        spellName: popped.top.spellName,
        postCast: popped.top.spellPostCast,
        slotLvl: popped.top.slotLvl,
        ritual: popped.top.ritual,
      };
      return {
        creatures: new Map(cs),
        stack: popped.rest,
        ...phaseAwaitReaction({
          interrupt: { tag: "PISpellCast", ctx: sp2 },
          trigger: "TSpellBeingCast",
          eligible: fe2,
          offered: popped.top.offered,
        }),
      };
    }
    return returnToCSWindow(cs, popped.top, popped.rest);
  }
  return resolveSpellEntry(
    cs,
    entry.spellCasterId,
    entry.slotLvl,
    entry.ritual,
    entry.spellPostCast,
    stack,
  );
}
