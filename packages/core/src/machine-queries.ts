import type { DndContext } from "#/machine-types.ts";
import type { Ability, AdvState, D20Mods, DefenseMods } from "#/types.ts";

// --- Derived state queries ---

/** Incapacitated is derived from source tracking, not a stored flag. */
export function isIncapacitated(ctx: DndContext): boolean {
  return ctx.incapacitatedSources.size > 0;
}

/** Can take actions and reactions. Matches Quint pCanAct. */
export function canAct(ctx: DndContext): boolean {
  return !isIncapacitated(ctx);
}

/** Can speak. Stunned creatures can speak falteringly (returns true). Matches Quint pCanSpeak. */
export function canSpeak(ctx: DndContext): boolean {
  return !ctx.paralyzed && !ctx.petrified && !ctx.unconscious;
}

// --- Modifier aggregation (matches Quint pure functions) ---

/** Own attack modifiers from conditions. Matches Quint pOwnAttackModifiers.
 *  Exhaustion flat penalty (-2*level) applied separately via exhaustionPenalty. */
export function ownAttackMods(
  ctx: DndContext,
  frightSourceInLOS: boolean,
): AdvState {
  return {
    hasAdvantage: ctx.invisible,
    hasDisadvantage:
      ctx.blinded ||
      ctx.prone ||
      ctx.restrained ||
      ctx.poisoned ||
      (ctx.frightened && frightSourceInLOS),
  };
}

/** Defense modifiers (what attackers get against this creature). Matches Quint pDefenseModifiers. */
export function defenseMods(
  ctx: DndContext,
  attackerWithin5ft: boolean,
): DefenseMods {
  return {
    attackerAdvantage:
      ctx.blinded ||
      ctx.paralyzed ||
      ctx.petrified ||
      ctx.stunned ||
      ctx.unconscious ||
      ctx.restrained ||
      (ctx.prone && attackerWithin5ft),
    attackerDisadvantage: ctx.invisible || (ctx.prone && !attackerWithin5ft),
    autoCrit: (ctx.paralyzed || ctx.unconscious) && attackerWithin5ft,
  };
}

/** Ability check modifiers. Matches Quint pCheckModifiers.
 *  Exhaustion flat penalty (-2*level) applied separately via exhaustionPenalty. */
export function checkMods(
  ctx: DndContext,
  requiresSight: boolean,
  requiresHearing: boolean,
  frightSourceInLOS: boolean,
): D20Mods {
  return {
    hasAdvantage: false,
    hasDisadvantage: ctx.poisoned || (ctx.frightened && frightSourceInLOS),
    autoFail:
      (ctx.blinded && requiresSight) || (ctx.deafened && requiresHearing),
  };
}

/** Saving throw modifiers. Matches Quint pSaveModifiers.
 *  Exhaustion flat penalty (-2*level) applied separately via exhaustionPenalty. */
export function saveMods(ctx: DndContext, ability: Ability): D20Mods {
  const isStrOrDex = ability === "str" || ability === "dex";
  return {
    hasAdvantage: false,
    hasDisadvantage: ctx.restrained && ability === "dex",
    autoFail:
      isStrOrDex &&
      (ctx.paralyzed || ctx.petrified || ctx.stunned || ctx.unconscious),
  };
}
