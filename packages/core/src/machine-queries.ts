import type { DndContext } from "#/machine-types.ts";
import {
  CANONICAL_CONDITION_CONSEQUENCES,
  type Ability,
  type AdvState,
  type Condition,
  type D20Mods,
  type DefenseMods,
} from "#/types.ts";

export const D20_TEST_KINDS = [
  "attackRoll",
  "abilityCheck",
  "savingThrow",
] as const;
export type D20TestKind = (typeof D20_TEST_KINDS)[number];

export const D20_DISADVANTAGE_SOURCES = [
  "condition",
  "exhaustion",
  "armorTraining",
] as const;
export type D20DisadvantageSource = (typeof D20_DISADVANTAGE_SOURCES)[number];

export interface D20ModifierQuery {
  readonly kind: D20TestKind;
  readonly ability: Ability;
}

export interface D20ModifierSummary {
  readonly flatModifier: number;
  readonly disadvantageSources: ReadonlyArray<D20DisadvantageSource>;
  readonly spellcastingBlocked: boolean;
}

function activeConditions(ctx: DndContext): ReadonlyArray<Condition> {
  return (Object.keys(
    CANONICAL_CONDITION_CONSEQUENCES,
  ) as ReadonlyArray<Condition>).filter((condition) =>
    condition === "incapacitated" ? isIncapacitated(ctx) : ctx[condition],
  );
}

function hasConditionConsequence(
  ctx: DndContext,
  consequence: keyof (typeof CANONICAL_CONDITION_CONSEQUENCES)[Condition],
): boolean {
  return activeConditions(ctx).some(
    (condition) => CANONICAL_CONDITION_CONSEQUENCES[condition][consequence],
  );
}

export function exhaustionPenalty(ctx: DndContext): number {
  return ctx.exhaustion === 0 ? 0 : -2 * ctx.exhaustion;
}

export function queryD20Modifiers(
  ctx: DndContext,
  query: D20ModifierQuery,
): D20ModifierSummary {
  const disadvantageSources: Array<D20DisadvantageSource> = [];
  if (
    (query.kind === "abilityCheck" && ctx.exhaustion >= 1) ||
    ((query.kind === "attackRoll" || query.kind === "savingThrow") &&
      ctx.exhaustion >= 3)
  ) {
    disadvantageSources.push("exhaustion");
  }
  if (
    ctx.wearingArmorWithoutTraining &&
    (query.ability === "str" || query.ability === "dex")
  ) {
    disadvantageSources.push("armorTraining");
  }
  return {
    flatModifier: exhaustionPenalty(ctx),
    disadvantageSources,
    spellcastingBlocked: ctx.wearingArmorWithoutTraining,
  };
}

export function canCastSpells(ctx: DndContext): boolean {
  return !ctx.wearingArmorWithoutTraining;
}

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
  return !hasConditionConsequence(ctx, "blocksSpeech");
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
      hasConditionConsequence(ctx, "ownAttackDisadvantage") ||
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
      hasConditionConsequence(ctx, "defenseAdvantage") ||
      (ctx.prone && attackerWithin5ft),
    attackerDisadvantage: ctx.invisible || (ctx.prone && !attackerWithin5ft),
    autoCrit:
      attackerWithin5ft &&
      hasConditionConsequence(ctx, "defenseAutoCritWithin5ft"),
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
    hasDisadvantage:
      hasConditionConsequence(ctx, "checkDisadvantage") ||
      (ctx.frightened && frightSourceInLOS),
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
    hasDisadvantage:
      ability === "dex" && hasConditionConsequence(ctx, "saveDexDisadvantage"),
    autoFail:
      isStrOrDex && hasConditionConsequence(ctx, "saveStrDexAutoFail"),
  };
}
