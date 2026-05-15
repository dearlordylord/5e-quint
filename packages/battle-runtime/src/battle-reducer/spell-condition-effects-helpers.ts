// Spell-condition effect helpers shared between M (damage_apply) and
// P (spells_holes_fills). Cycle #19 in REFACTOR_MAP.md — both clusters need
// these small helpers; hoisting them here keeps M↔P unidirectional. Mechanical
// extraction — no behavior change.

import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import type { Condition } from "@dnd/shared/types";
import type { SpellId } from "../identity.ts";
import type { CombatantId } from "../identity.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattlePossessionAttemptDisposition,
  BattleState,
  ProtectionFromEvilAndGoodPreventedCondition,
} from "../battle-reducer.ts";
import { battleCreatureType } from "./domain-helpers.ts";

const HIDEOUS_LAUGHTER_CONDITIONS = [
  "prone",
  "incapacitated",
] as const satisfies ReadonlyArray<Condition>;

type ConditionApplyingActiveEffect =
  | Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>
  | Extract<BattleActiveEffect, { readonly kind: "sleepPendingRepeatSave" }>
  | Extract<BattleActiveEffect, { readonly kind: "sleepUnconscious" }>
  | Extract<BattleActiveEffect, { readonly kind: "hideousLaughter" }>;

type SingleConditionApplyingActiveEffect = Exclude<
  ConditionApplyingActiveEffect,
  Extract<BattleActiveEffect, { readonly kind: "hideousLaughter" }>
>;

type HideousLaughterEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hideousLaughter" }
>;

export type BattlePossessionAttemptInput = {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly targetId: CombatantId;
};

export function conditionHasNonSpellSource(
  combatant: BattleCreatureState,
  condition: Condition,
): boolean {
  return (
    hasConditionFromOwnFlag(combatant.conditions, condition) &&
    !combatant.activeEffects.some((effect) =>
      activeEffectSourcesCondition(effect, condition),
    )
  );
}

export function conditionHadNonSpellSourceBeforeSpellEffect(
  combatant: BattleCreatureState,
  condition: Condition,
): boolean {
  return (
    conditionHasNonSpellSource(combatant, condition) ||
    combatant.activeEffects.some(
      (effect) =>
        activeEffectSourcesCondition(effect, condition) &&
        "conditionHadNonSpellSource" in effect &&
        effect.conditionHadNonSpellSource,
    )
  );
}

export function conditionApplicationPreventedByCreatureTypeProtection(
  state: BattleState,
  sourceCombatantId: CombatantId,
  target: BattleCreatureState,
  condition: Condition,
): boolean {
  if (!isProtectionFromEvilAndGoodPreventedCondition(condition)) {
    return false;
  }
  const sourceCreatureType = battleCreatureTypeForCombatant(
    state,
    sourceCombatantId,
  );
  return (
    sourceCreatureType !== null &&
    target.activeEffects.some(
      (effect) =>
        creatureTypeProtectionAppliesToSource(effect, sourceCreatureType) &&
        effect.preventedConditions.includes(condition),
    )
  );
}

export function resolveBattlePossessionAttempt({
  state,
  sourceCombatantId,
  targetId,
}: BattlePossessionAttemptInput): BattlePossessionAttemptDisposition {
  const source = state.combatants.get(sourceCombatantId);
  if (source === undefined) {
    return {
      tag: "invalid",
      reason: "unknownSourceCombatant",
      sourceCombatantId,
      targetId,
    };
  }
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      reason: "unknownTargetCombatant",
      sourceCombatantId,
      targetId,
    };
  }

  const sourceCreatureType = battleCreatureType(source);
  if (sourceCreatureType === null) {
    return {
      tag: "invalid",
      reason: "unknownSourceCreatureType",
      sourceCombatantId,
      targetId,
    };
  }

  if (
    possessionApplicationPreventedByCreatureTypeProtection(
      sourceCreatureType,
      target,
    )
  ) {
    return {
      tag: "prevented",
      prevention: "creatureTypeProtection",
      sourceCombatantId,
      targetId,
    };
  }
  return { tag: "unprevented", sourceCombatantId, targetId };
}

function battleCreatureTypeForCombatant(
  state: BattleState,
  combatantId: CombatantId,
): CreatureType | null {
  const combatant = state.combatants.get(combatantId);
  return combatant === undefined ? null : battleCreatureType(combatant);
}

function isProtectionFromEvilAndGoodPreventedCondition(
  condition: Condition,
): condition is ProtectionFromEvilAndGoodPreventedCondition {
  return condition === "charmed" || condition === "frightened";
}

function possessionApplicationPreventedByCreatureTypeProtection(
  sourceCreatureType: CreatureType,
  target: BattleCreatureState,
): boolean {
  return target.activeEffects.some(
    (effect) =>
      creatureTypeProtectionAppliesToSource(effect, sourceCreatureType) &&
      effect.preventsPossession,
  );
}

function creatureTypeProtectionAppliesToSource(
  effect: BattleActiveEffect,
  sourceCreatureType: CreatureType,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "creatureTypeProtection" }
> {
  return (
    effect.kind === "creatureTypeProtection" &&
    effect.protectedAgainstCreatureTypes.includes(sourceCreatureType)
  );
}

function activeEffectSourcesCondition(
  effect: BattleActiveEffect,
  condition: Condition,
): boolean {
  if (condition === "incapacitated") {
    return activeEffectDirectlyAppliesCondition(effect, condition);
  }
  return (
    (effect.kind === "spellCondition" &&
      (effect.condition === condition ||
        (condition === "prone" && effect.condition === "unconscious"))) ||
    (effect.kind === "sleepUnconscious" &&
      (condition === "unconscious" || condition === "prone")) ||
    activeEffectDirectlyAppliesCondition(effect, condition)
  );
}

function activeEffectDirectlyAppliesCondition(
  effect: BattleActiveEffect,
  condition: Condition,
): boolean {
  return (
    (effect.kind === "spellCondition" && effect.condition === condition) ||
    (effect.kind === "sleepPendingRepeatSave" &&
      condition === "incapacitated") ||
    (effect.kind === "sleepUnconscious" && condition === "unconscious") ||
    (effect.kind === "hideousLaughter" &&
      (condition === "prone" || condition === "incapacitated"))
  );
}

function hasConditionFromOwnFlag(
  conditions: ConditionState,
  condition: Condition,
): boolean {
  return condition === "incapacitated"
    ? conditions.directIncapacitated
    : hasCondition(conditions, condition);
}

export function spellRestraintEffects(
  state: BattleState,
  combatantId: CombatantId,
): readonly Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>[] {
  const combatant = state.combatants.get(combatantId);
  if (
    combatant === undefined ||
    !hasCondition(combatant.conditions, "restrained")
  ) {
    return [];
  }
  return combatant.activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "spellCondition" }
    > =>
      effect.kind === "spellCondition" &&
      effect.condition === "restrained" &&
      effect.escape !== null,
  );
}

export type SpellRestraintEffectEntry = {
  readonly targetId: CombatantId;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellCondition" }
  >;
};

export function spellRestraintEffectEntries(
  state: BattleState,
): readonly SpellRestraintEffectEntry[] {
  return [...state.combatants.keys()].flatMap((targetId) =>
    spellRestraintEffects(state, targetId).map((effect) => ({
      targetId,
      effect,
    })),
  );
}

export function spellRestraintEffectFor(
  state: BattleState,
  combatantId: CombatantId,
  sourceSpellId: SpellId,
  sourceCombatantId: CombatantId,
):
  | Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>
  | undefined {
  return spellRestraintEffects(state, combatantId).find(
    (effect) =>
      effect.sourceSpellId === sourceSpellId &&
      effect.sourceCombatantId === sourceCombatantId,
  );
}

export function removeSpellConditionEffect(
  state: BattleState,
  combatantId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    return state;
  }
  const activeEffects = combatant.activeEffects.filter(
    (candidate) => candidate !== effect,
  );
  const nextCombatant: BattleCreatureState =
    combatant.positiveHpUnconscious === null
      ? {
          ...combatant,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            combatant.conditions,
            activeEffects,
            [effect],
          ),
        }
      : { ...combatant, activeEffects };
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, nextCombatant),
  };
}

export function combatantHasSleepEffect(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState {
  return combatant?.activeEffects.some(isSleepEffect) === true;
}

export function sleepShakeAwakeTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([id, combatant]) => id !== actorId && combatantHasSleepEffect(combatant),
    )
    .map(([id]) => id);
}

export function removeSleepEffectsFromTarget(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const expiring = target.activeEffects.filter(isSleepEffect);
  if (expiring.length === 0) {
    return state;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => !expiring.some((expired) => expired === effect),
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            expiring,
          ),
        }
      : { ...target, activeEffects };
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, nextCombatant),
  };
}

function isSleepEffect(effect: BattleActiveEffect): boolean {
  return (
    effect.kind === "sleepPendingRepeatSave" ||
    effect.kind === "sleepUnconscious"
  );
}

export function combatantHasHideousLaughterEffect(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState {
  return combatant?.activeEffects.some(isHideousLaughterEffect) === true;
}

export function removeHideousLaughterEffectFromTarget(
  state: BattleState,
  targetId: CombatantId,
  expiringEffect: HideousLaughterEffect,
): BattleState {
  const target = state.combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return state;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => effect !== expiringEffect,
  );
  const conditions = conditionsAfterExpiringHideousLaughterEffect(
    target.conditions,
    activeEffects,
    expiringEffect,
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? { ...target, activeEffects, conditions }
      : { ...target, activeEffects };
  const combatants = new Map(state.combatants).set(targetId, nextCombatant);
  return {
    ...state,
    combatants: combatantsAfterHideousLaughterSpellEndedIfNoEffects(
      combatants,
      expiringEffect,
    ),
  };
}

export function combatantsAfterHideousLaughterSpellEndedIfNoEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  source: HideousLaughterEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const spellStillActive = [...combatants.values()].some((combatant) =>
    combatant.activeEffects.some((effect) =>
      sameHideousLaughterSpellEffect(effect, source),
    ),
  );
  if (spellStillActive) {
    return combatants;
  }
  const sourceCombatant = combatants.get(source.sourceCombatantId);
  if (
    sourceCombatant === undefined ||
    sourceCombatant.concentration?.effectKind !== "spellEffect" ||
    sourceCombatant.concentration.sourceSpellId !== source.sourceSpellId
  ) {
    return combatants;
  }
  return new Map(combatants).set(source.sourceCombatantId, {
    ...sourceCombatant,
    concentration: null,
  });
}

function isHideousLaughterEffect(effect: BattleActiveEffect): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "hideousLaughter" }
> {
  return effect.kind === "hideousLaughter";
}

function sameHideousLaughterSpellEffect(
  effect: BattleActiveEffect,
  source: HideousLaughterEffect,
): effect is HideousLaughterEffect {
  return (
    effect.kind === "hideousLaughter" &&
    effect.sourceSpellId === source.sourceSpellId &&
    effect.sourceCombatantId === source.sourceCombatantId
  );
}

export function conditionsAfterApplyingSpellConditionEffects(
  conditions: ConditionState,
  activeEffects: readonly BattleActiveEffect[],
): ConditionState {
  const conditionImmunities = activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "conditionImmunity" }
    > => effect.kind === "conditionImmunity",
  );
  const baseConditions = conditionImmunities.reduce(
    (nextConditions, immunity) =>
      removeCondition(nextConditions, immunity.condition),
    conditions,
  );
  return activeEffects
    .filter(isConditionApplyingActiveEffect)
    .reduce((nextConditions, effect) => {
      return activeEffectConditions(effect).reduce(
        (conditionState, condition) =>
          conditionImmunities.some((immunity) => immunity.condition === condition)
            ? conditionState
            : applyCondition(conditionState, condition),
        nextConditions,
      );
    }, baseConditions);
}

export function conditionsAfterExpiringSpellConditionEffects(
  conditions: ConditionState,
  remainingEffects: readonly BattleActiveEffect[],
  expiringEffects: readonly BattleActiveEffect[],
): ConditionState {
  return expiringEffects
    .filter(isConditionApplyingActiveEffect)
    .reduce((nextConditions, effect) => {
      if (effect.kind === "hideousLaughter") {
        return conditionsAfterExpiringHideousLaughterEffect(
          nextConditions,
          remainingEffects,
          effect,
        );
      }
      const condition = activeEffectCondition(effect);
      const stillHasSpellSource = remainingEffects.some((remaining) =>
        activeEffectDirectlyAppliesCondition(remaining, condition),
      );
      return stillHasSpellSource || effect.conditionHadNonSpellSource
        ? nextConditions
        : removeCondition(nextConditions, condition);
    }, conditions);
}

function isConditionApplyingActiveEffect(
  effect: BattleActiveEffect,
): effect is ConditionApplyingActiveEffect {
  return (
    effect.kind === "spellCondition" ||
    effect.kind === "sleepPendingRepeatSave" ||
    effect.kind === "sleepUnconscious" ||
    effect.kind === "hideousLaughter"
  );
}

function activeEffectConditions(
  effect: ConditionApplyingActiveEffect,
): readonly Condition[] {
  return effect.kind === "hideousLaughter"
    ? HIDEOUS_LAUGHTER_CONDITIONS
    : [activeEffectCondition(effect)];
}

function activeEffectCondition(
  effect: SingleConditionApplyingActiveEffect,
): Condition {
  if (effect.kind === "spellCondition") return effect.condition;
  return effect.kind === "sleepPendingRepeatSave"
    ? "incapacitated"
    : "unconscious";
}

function conditionsAfterExpiringHideousLaughterEffect(
  conditions: ConditionState,
  remainingEffects: readonly BattleActiveEffect[],
  expiringEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "hideousLaughter" }
  >,
): ConditionState {
  const withoutProne =
    remainingEffects.some((remaining) =>
      activeEffectDirectlyAppliesCondition(remaining, "prone"),
    ) || expiringEffect.conditionHadNonSpellProneSource
      ? conditions
      : removeCondition(conditions, "prone");
  return remainingEffects.some((remaining) =>
    activeEffectDirectlyAppliesCondition(remaining, "incapacitated"),
  ) || expiringEffect.conditionHadNonSpellIncapacitatedSource
    ? withoutProne
    : removeCondition(withoutProne, "incapacitated");
}
