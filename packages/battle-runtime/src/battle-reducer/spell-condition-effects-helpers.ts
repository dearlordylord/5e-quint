// Spell-condition effect helpers shared between M (damage_apply) and
// P (spells_holes_fills). Cycle #19 in REFACTOR_MAP.md — both clusters need
// these small helpers; hoisting them here keeps M↔P unidirectional. Mechanical
// extraction — no behavior change.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION

import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import type { Condition } from "@dnd/shared/types";
import type { CombatantId } from "../identity.ts";
import type {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
} from "../identity.ts";
import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleCreatureState,
  BattlePossessionAttemptDisposition,
  BattleProtectionRelevantEffectSavingThrowOutcomeHole,
  BattleSavingThrowOutcomeValue,
  BattleState,
  ProtectionFromEvilAndGoodPreventedCondition,
} from "../battle-state-execution.ts";
import { KnockedOutConditionState as KnockedOutConditionStateBrand } from "./knocked-out-state.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import { wardingBondSavingThrowFlatBonusProjectionsForTarget } from "./warding-bond.ts";

import {
  activeEffectCondition,
  conditionsAfterApplyingSpellConditionEffects,
  isConditionApplyingActiveEffect,
} from "../active-effect/lifecycle.ts";
export { conditionsAfterApplyingSpellConditionEffects };
type ProtectionRelevantCondition = ProtectionFromEvilAndGoodPreventedCondition;
type ProtectionRelevantEffect =
  | Extract<BattleActiveEffect, { readonly kind: "spellConditionRepeatSave" }>
  | Extract<BattleActiveEffect, { readonly kind: "possession" }>;
type ProtectionRelevantEffectKind = ProtectionRelevantCondition | "possession";

type HideousLaughterEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hideousLaughter" }
>;
type HypnoticPatternControlEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hypnoticPatternControl" }
>;
export type SpellConcentrationEffectSource = {
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};

export function spellConcentrationEffectSourceFromEffect(
  effect: BattleActiveEffect,
): SpellConcentrationEffectSource | null {
  return "sourceProcedureRef" in effect
    ? {
        sourceCombatantId: effect.sourceCombatantId,
        sourceProcedureRef: effect.sourceProcedureRef,
      }
    : null;
}

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
        (effect.kind === "hypnoticPatternControl" &&
          ((condition === "charmed" &&
            effect.conditionHadNonSpellCharmedSource) ||
            (condition === "incapacitated" &&
              effect.conditionHadNonSpellIncapacitatedSource))) ||
        ("conditionHadNonSpellSource" in effect &&
          effect.conditionHadNonSpellSource &&
          (activeEffectSourcesCondition(effect, condition) ||
            (effect.kind === "conditionImmunity" &&
              effect.condition === condition))),
    )
  );
}

export function battleCreatureAfterConditionRemoval(
  combatant: BattleCreatureState,
  condition: Condition,
): BattleCreatureState {
  const activeEffects = combatant.activeEffects.filter(
    (effect) => !activeEffectDirectlyAppliesCondition(effect, condition),
  );
  const conditions = conditionsAfterApplyingSpellConditionEffects(
    removeCondition(combatant.conditions, condition),
    activeEffects,
  );
  if (combatant.positiveHpUnconscious !== null) {
    return {
      ...combatant,
      activeEffects,
      conditions: KnockedOutConditionStateBrand(
        applyCondition(conditions, "unconscious"),
      ),
    };
  }

  return {
    ...combatant,
    activeEffects,
    conditions,
  };
}

export function concentrationSpellEffectSourcesDirectlyApplyingCondition(
  combatant: BattleCreatureState,
  condition: Condition,
): readonly SpellConcentrationEffectSource[] {
  const sources: SpellConcentrationEffectSource[] = [];
  for (const effect of combatant.activeEffects) {
    if (
      !isConcentrationSpellEffectDirectlyApplyingCondition(effect, condition)
    ) {
      continue;
    }
    const source = {
      sourceCombatantId: effect.sourceCombatantId,
      sourceProcedureRef: effect.sourceProcedureRef,
    };
    if (
      sources.some(
        (existing) =>
          existing.sourceCombatantId === source.sourceCombatantId &&
          existing.sourceProcedureRef === source.sourceProcedureRef,
      )
    ) {
      continue;
    }
    sources.push(source);
  }
  return sources;
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

export function conditionApplicationPreventedByConditionImmunity(
  target: BattleCreatureState,
  condition: Condition,
): boolean {
  return target.activeEffects.some(
    (effect) =>
      effect.kind === "conditionImmunity" && effect.condition === condition,
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
  /* v8 ignore start -- @preserve -- Battle-state admission rejects an unresolved cast-time creature-type choice before creating a Stat Block combatant, while character combatants are canonically Humanoid. */
  if (sourceCreatureType === null) {
    return {
      tag: "invalid",
      reason: "unknownSourceCreatureType",
      sourceCombatantId,
      targetId,
    };
  }
  /* v8 ignore stop -- @preserve */

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

export function protectionRelevantEffectSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: ProtectionRelevantEffect,
): BattleProtectionRelevantEffectSavingThrowOutcomeHole {
  const relevantEffect = protectionRelevantEffectKind(effect);
  const key = [
    "battle:protection-relevant-effect-save:",
    targetId,
    spellActiveEffectExecutionRef(effect),
    effect.sourceCombatantId,
    effect.sourceProcedureRef,
    relevantEffect,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${relevantEffect} save`,
    protectionRelevantEffectSave: {
      targetId,
      effectRef: spellActiveEffectExecutionRef(effect),
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      relevantEffect,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: targetHasProtectionRelevantEffectSaveAdvantage(
      state,
      targetId,
      effect,
    )
      ? [{ targetId, rollMode: "advantage" }]
      : [],
    targetFlatBonuses: [...state.combatants].flatMap(([, target]) =>
      wardingBondSavingThrowFlatBonusProjectionsForTarget(target),
    ),
  };
}

export function protectionRelevantEffects(
  combatant: BattleCreatureState,
): readonly ProtectionRelevantEffect[] {
  return combatant.activeEffects.filter(isProtectionRelevantEffect);
}

export function protectionRelevantEffectsForTarget(
  state: BattleState,
  targetId: CombatantId,
): readonly ProtectionRelevantEffect[] {
  const target = state.combatants.get(targetId);
  return target === undefined ? [] : protectionRelevantEffects(target);
}

export function applyProtectionRelevantEffectSaveOutcome(
  state: BattleState,
  targetId: CombatantId,
  effect: ProtectionRelevantEffect,
  succeeded: boolean,
): BattleState {
  if (!succeeded) {
    return state;
  }
  return effect.kind === "spellConditionRepeatSave"
    ? removeSpellConditionEffect(state, targetId, effect)
    : removePossessionEffect(state, targetId, effect);
}

export function validateProtectionRelevantEffectSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Protection from Evil and Good relevant-effect save must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Protection from Evil and Good relevant-effect save must match the affected target exactly once.";
}

function isProtectionRelevantEffect(
  effect: BattleActiveEffect,
): effect is ProtectionRelevantEffect {
  return (
    effect.kind === "spellConditionRepeatSave" || effect.kind === "possession"
  );
}

function protectionRelevantEffectKind(
  effect: ProtectionRelevantEffect,
): ProtectionRelevantEffectKind {
  return effect.kind === "spellConditionRepeatSave"
    ? effect.condition
    : effect.kind;
}

function targetHasProtectionRelevantEffectSaveAdvantage(
  state: BattleState,
  targetId: CombatantId,
  effect: ProtectionRelevantEffect,
): boolean {
  const target = state.combatants.get(targetId);
  const sourceCreatureType = battleCreatureTypeForCombatant(
    state,
    effect.sourceCombatantId,
  );
  return (
    target !== undefined &&
    sourceCreatureType !== null &&
    target.activeEffects.includes(effect) &&
    target.activeEffects.some((candidate) =>
      creatureTypeProtectionAppliesToSource(candidate, sourceCreatureType),
    )
  );
}

function removePossessionEffect(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "possession" }>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: target.activeEffects.filter(
        (candidate) => candidate !== effect,
      ),
    }),
  };
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
  return (
    activeEffectDirectlyAppliesCondition(effect, condition) ||
    (condition === "prone" &&
      activeEffectDirectlyAppliesCondition(effect, "unconscious"))
  );
}

function activeEffectDirectlyAppliesCondition(
  effect: BattleActiveEffect,
  condition: Condition,
): boolean {
  return (
    (effect.kind === "spellCondition" && effect.condition === condition) ||
    (effect.kind === "unitFeatureCondition" &&
      effect.condition === condition) ||
    (effect.kind === "unitFeatureConditionEndTurnSave" &&
      effect.condition === condition) ||
    (effect.kind === "targetActionEndedSpellCondition" &&
      effect.condition === condition) ||
    (effect.kind === "spellConditionRepeatSave" &&
      effect.condition === condition) ||
    (effect.kind === "spellConditionEndTurnSave" &&
      effect.condition === condition) ||
    (effect.kind === "spellConditionCountedEndTurnSave" &&
      effect.condition === condition) ||
    (effect.kind === "sleepPendingRepeatSave" &&
      condition === "incapacitated") ||
    (effect.kind === "sleepUnconscious" && condition === "unconscious") ||
    (effect.kind === "hideousLaughter" &&
      (condition === "prone" || condition === "incapacitated")) ||
    (effect.kind === "hypnoticPatternControl" &&
      (condition === "charmed" || condition === "incapacitated"))
  );
}

function isConcentrationSpellEffectDirectlyApplyingCondition(
  effect: BattleActiveEffect,
  condition: Condition,
): effect is BattleActiveEffect &
  SpellConcentrationEffectSource & {
    readonly expiresAt: Extract<
      BattleActiveEffectExpiration,
      { readonly kind: "concentration" }
    >;
  } {
  return (
    activeEffectDirectlyAppliesCondition(effect, condition) &&
    "sourceProcedureRef" in effect &&
    "sourceCombatantId" in effect &&
    "expiresAt" in effect &&
    effect.expiresAt.kind === "concentration"
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
  effectRef: BattleEffectExecutionRef,
):
  | Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>
  | undefined {
  return spellRestraintEffects(state, combatantId).find(
    (effect) => spellActiveEffectExecutionRef(effect) === effectRef,
  );
}

export function removeSpellConditionEffect(
  state: BattleState,
  combatantId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    {
      readonly kind:
        | "spellCondition"
        | "spellConditionRepeatSave"
        | "spellConditionEndTurnSave"
        | "spellConditionCountedEndTurnSave";
    }
  >,
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

export function hypnoticPatternShakeAwakeTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([id, combatant]) =>
        id !== actorId &&
        combatant.activeEffects.some(isHypnoticPatternControlEffect),
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

export function removeHypnoticPatternControlEffectsFromTarget(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const expiring = target.activeEffects.filter(isHypnoticPatternControlEffect);
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
  let combatants: ReadonlyMap<CombatantId, BattleCreatureState> = new Map(
    state.combatants,
  ).set(targetId, nextCombatant);
  for (const effect of expiring) {
    combatants = combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
      combatants,
      {
        sourceCombatantId: effect.sourceCombatantId,
        sourceProcedureRef: effect.sourceProcedureRef,
      },
    );
  }
  return {
    ...state,
    combatants,
  };
}

export function removeHideousLaughterEffectFromTarget(
  state: BattleState,
  targetId: CombatantId,
  effectRef: BattleEffectExecutionRef,
): BattleState {
  const target = state.combatants.get(targetId);
  const expiringEffect = target?.activeEffects.find(
    (effect): effect is HideousLaughterEffect =>
      effect.kind === "hideousLaughter" && effect.effectRef === effectRef,
  );
  if (target === undefined || expiringEffect === undefined) {
    return state;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => effect.effectRef !== effectRef,
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
  return combatantsAfterMatchingConcentrationSpellEffectsEndedIfNoEffects(
    combatants,
    source,
    sameHideousLaughterSpellEffect,
  );
}

export function combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  source: SpellConcentrationEffectSource,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return combatantsAfterMatchingConcentrationSpellEffectsEndedIfNoEffects(
    combatants,
    source,
    sameConcentrationSpellEffectSource,
  );
}

function combatantsAfterMatchingConcentrationSpellEffectsEndedIfNoEffects<
  Source extends SpellConcentrationEffectSource,
>(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  source: Source,
  matchesSource: (effect: BattleActiveEffect, source: Source) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const spellStillActive = [...combatants.values()].some((combatant) =>
    combatant.activeEffects.some((effect) => matchesSource(effect, source)),
  );
  if (spellStillActive) {
    return combatants;
  }
  const sourceCombatant = combatants.get(source.sourceCombatantId);
  if (
    sourceCombatant === undefined ||
    sourceCombatant.concentration?.effectKind !== "spellEffect" ||
    sourceCombatant.concentration.sourceProcedureRef !==
      source.sourceProcedureRef
  ) {
    return combatants;
  }
  return new Map(combatants).set(source.sourceCombatantId, {
    ...sourceCombatant,
    concentration: null,
  });
}

export function combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  sources: readonly SpellConcentrationEffectSource[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const uniqueSources = [
    ...new Map(
      sources.map((source) => [
        `${source.sourceCombatantId}\u0000${source.sourceProcedureRef}`,
        source,
      ]),
    ).values(),
  ];
  return uniqueSources.reduce(
    (nextCombatants, source) =>
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        nextCombatants,
        source,
      ),
    combatants,
  );
}

function isHypnoticPatternControlEffect(
  effect: BattleActiveEffect,
): effect is HypnoticPatternControlEffect {
  return effect.kind === "hypnoticPatternControl";
}

function sameHideousLaughterSpellEffect(
  effect: BattleActiveEffect,
  source: HideousLaughterEffect,
): effect is HideousLaughterEffect {
  return (
    effect.kind === "hideousLaughter" &&
    effect.sourceProcedureRef === source.sourceProcedureRef &&
    effect.sourceCombatantId === source.sourceCombatantId
  );
}

function sameConcentrationSpellEffectSource(
  effect: BattleActiveEffect,
  source: SpellConcentrationEffectSource,
): boolean {
  return (
    effect.sourceCombatantId === source.sourceCombatantId &&
    "sourceProcedureRef" in effect &&
    effect.sourceProcedureRef === source.sourceProcedureRef &&
    "expiresAt" in effect &&
    effect.expiresAt.kind === "concentration"
  );
}

export function conditionsAfterExpiringSpellConditionEffects(
  conditions: ConditionState,
  remainingEffects: readonly BattleActiveEffect[],
  expiringEffects: readonly BattleActiveEffect[],
): ConditionState {
  const withoutExpiredConditionSources = expiringEffects
    .filter(isConditionApplyingActiveEffect)
    .reduce((nextConditions, effect) => {
      if (effect.kind === "hideousLaughter") {
        return conditionsAfterExpiringHideousLaughterEffect(
          nextConditions,
          remainingEffects,
          effect,
        );
      }
      if (effect.kind === "hypnoticPatternControl") {
        return conditionsAfterExpiringHypnoticPatternControlEffect(
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
  return expiringEffects
    .filter(isConditionImmunityActiveEffect)
    .reduce(
      (nextConditions, effect) =>
        conditionsAfterExpiringConditionImmunity(
          nextConditions,
          remainingEffects,
          effect,
        ),
      withoutExpiredConditionSources,
    );
}

function isConditionImmunityActiveEffect(
  effect: BattleActiveEffect,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "conditionImmunity" }
> {
  return effect.kind === "conditionImmunity";
}

function conditionsAfterExpiringConditionImmunity(
  conditions: ConditionState,
  remainingEffects: readonly BattleActiveEffect[],
  expiringEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "conditionImmunity" }
  >,
): ConditionState {
  if (
    remainingEffects.some(
      (effect) =>
        effect.kind === "conditionImmunity" &&
        effect.condition === expiringEffect.condition,
    )
  ) {
    return conditions;
  }
  return expiringEffect.conditionHadNonSpellSource ||
    remainingEffects.some((effect) =>
      activeEffectSourcesCondition(effect, expiringEffect.condition),
    )
    ? applyCondition(conditions, expiringEffect.condition)
    : conditions;
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

function conditionsAfterExpiringHypnoticPatternControlEffect(
  conditions: ConditionState,
  remainingEffects: readonly BattleActiveEffect[],
  expiringEffect: HypnoticPatternControlEffect,
): ConditionState {
  const withoutCharmed =
    remainingEffects.some((remaining) =>
      activeEffectDirectlyAppliesCondition(remaining, "charmed"),
    ) || expiringEffect.conditionHadNonSpellCharmedSource
      ? conditions
      : removeCondition(conditions, "charmed");
  return remainingEffects.some((remaining) =>
    activeEffectDirectlyAppliesCondition(remaining, "incapacitated"),
  ) || expiringEffect.conditionHadNonSpellIncapacitatedSource
    ? withoutCharmed
    : removeCondition(withoutCharmed, "incapacitated");
}
