// Granted area Save damage target-granted Magic action.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-granted-action
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import * as Result from "effect/Result";
import type { CombatantId } from "../identity.ts";
import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
import {
  applyBattleHitPointDamage,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowHoles,
  fillsMatchingHoleIds,
  resolveSaveGatedConditionDamageRepeatSave,
} from "./damage-apply.ts";
import {
  applyAvailableSpellDamageReduction,
  damageAmountByTypeAfterTargetAdjustments,
  damageAmountByTypeEntriesToMap,
  isSpellDamageReductionRollFill,
  spellDamageReductionRollForTarget,
} from "./damage-helpers.ts";
import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./targeting-save-interdiction.ts";
import type {
  BattleCreatureState,
  BattleGrantedAreaSaveDamageActionDamageRollHole,
  BattleFill,
  BattleHoleId,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleSpellAreaChoice,
  BattleState,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

import {
  grantedAreaSaveDamageActionSavingThrowOutcomeHole,
  type GrantedAreaSaveDamageActionEffect,
  type GrantedAreaSaveDamageActionSubject,
} from "./granted-area-save-damage-discovery.ts";
import { boundGrantedAreaSaveDamageActionEffect } from "./spell-modifier-binding.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
import { grantedAreaSaveDamageActionHoleKey } from "./selected-effect-hole-key.ts";
import { saveGatedConditionDamageOccurrenceKeyForHoleTarget } from "./staged-condition-repeat-save.ts";
type ExpectedGrantedAreaSaveDamageFill = {
  readonly kind: BattleFill["kind"];
  readonly holeId: BattleHoleId;
};
type GrantedAreaSaveDamageActionDamageEntry = {
  readonly targetId: CombatantId;
  readonly targetForHoles: BattleCreatureState;
  readonly damageByType: ReturnType<typeof damageAmountByTypeEntriesToMap>;
  readonly spellDamageReductionRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  readonly damageAmount: number;
  readonly spellDamageReductionHoles: readonly ExpectedGrantedAreaSaveDamageFill[];
};
type GrantedAreaSaveDamageActionOutcomes = NonNullable<
  ReturnType<typeof savingThrowFillFor>
>["value"]["outcomes"];

export function resolveGrantedAreaSaveDamageActionCommand(
  input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendAction(input.state.currentTurnResources, "magic")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for Granted area Save damage.",
    );
  }
  const effect = activeGrantedAreaSaveDamageActionEffect(
    input.state,
    actor,
    input.subject,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Granted area Save damage requires an active target-attached effect.",
    );
  }
  return resolveGrantedAreaSaveDamageActionWithEffect(input, effect);
}

function resolveGrantedAreaSaveDamageActionWithEffect(
  input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>,
  effect: GrantedAreaSaveDamageActionEffect,
): BattleResolutionResult {
  const saveHole = grantedAreaSaveDamageActionSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
  );
  const saveFill = savingThrowFillFor(input.fills, saveHole.holeId);
  if (saveFill === undefined) {
    const fillsValidation = validateExpectedGrantedAreaSaveDamageFills(
      input.fills,
      [{ kind: "savingThrowOutcome", holeId: saveHole.holeId }],
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillsValidation !== null) {
      return invalidResult(input.state, "invalidFill", fillsValidation);
    }
    /* v8 ignore stop -- @preserve */
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateGrantedAreaSaveDamageActionSavingThrowFill(
    input.state,
    input.subject.actorId,
    saveFill,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop -- @preserve */
  const outcomes = saveFill.value.outcomes;
  const savingThrowTargetIds = outcomes.map((outcome) => outcome.targetId);
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    saveFill.relationshipFacts ?? [],
    input.subject.actorId,
    savingThrowTargetIds,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      input.subject.actorId,
      "enemySavingThrow",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Granted area Save damage relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (outcomes.length === 0) {
    const fillsValidation = validateExpectedGrantedAreaSaveDamageFills(
      input.fills,
      [{ kind: "savingThrowOutcome", holeId: saveHole.holeId }],
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillsValidation !== null) {
      return invalidResult(input.state, "invalidFill", fillsValidation);
    }
    /* v8 ignore stop -- @preserve */
    const resolvedState =
      battleStateAfterSpendingGrantedAreaSaveDamageActionMagicAction(
        input,
        savingThrowTargetIds,
        relationshipFacts,
      );
    return {
      tag: "resolved",
      state: resolvedState,
      snapshot: snapshotBattle(resolvedState),
    };
  }

  return resolveGrantedAreaSaveDamageActionDamage({
    input,
    effect,
    saveHole,
    outcomes,
    savingThrowTargetIds,
    relationshipFacts,
  });
}

function resolveGrantedAreaSaveDamageActionDamage(stage: {
  readonly input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>;
  readonly effect: GrantedAreaSaveDamageActionEffect;
  readonly saveHole: ReturnType<
    typeof grantedAreaSaveDamageActionSavingThrowOutcomeHole
  >;
  readonly outcomes: GrantedAreaSaveDamageActionOutcomes;
  readonly savingThrowTargetIds: readonly CombatantId[];
  readonly relationshipFacts: Parameters<
    typeof extendSavingThrowOngoingFeatures
  >[3];
}): BattleResolutionResult {
  const {
    effect,
    outcomes,
    saveHole,
    savingThrowTargetIds,
    relationshipFacts,
  } = stage;
  const input = stage.input;
  const damageHole = grantedAreaSaveDamageActionDamageRollHole(effect);
  const damageFill = rolledDiceFillFor(input.fills, damageHole.holeId);
  if (damageFill === undefined) {
    const damageFillsValidation = validateExpectedGrantedAreaSaveDamageFillKind(
      input.fills,
      "rolledDice",
      [damageHole.holeId],
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageFillsValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageFillsValidation);
    }
    /* v8 ignore stop -- @preserve */
    return needsHolesResult(input.state, input.subject, [damageHole]);
  }
  const damageValidation = validateRolledDiceFillForDiceExpr(
    damageFill,
    damageHole.grantedAreaSaveDamageAction.expr,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop -- @preserve */

  const preparation = prepareGrantedAreaSaveDamageEntries({
    input,
    effect,
    outcomes,
    damageHole,
    damageFill,
  });
  if (preparation.tag === "resolution") return preparation.result;
  return resolveGrantedAreaSaveDamageLifecycle({
    input,
    saveHole,
    damageHole,
    savingThrowTargetIds,
    relationshipFacts,
    resolvedDamageEntries: preparation.entries,
  });
}

type ResolvedGrantedAreaSaveDamageActionDamageEntry =
  GrantedAreaSaveDamageActionDamageEntry & {
    readonly damageRepeatSave: Extract<
      ReturnType<typeof resolveSaveGatedConditionDamageRepeatSave>,
      { readonly tag: "ok" }
    >;
  };

type GrantedAreaSaveDamageEntryPreparation =
  | {
      readonly tag: "ok";
      readonly entries: readonly ResolvedGrantedAreaSaveDamageActionDamageEntry[];
    }
  | { readonly tag: "resolution"; readonly result: BattleResolutionResult };

function prepareGrantedAreaSaveDamageEntries(stage: {
  readonly input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>;
  readonly effect: GrantedAreaSaveDamageActionEffect;
  readonly outcomes: GrantedAreaSaveDamageActionOutcomes;
  readonly damageHole: BattleGrantedAreaSaveDamageActionDamageRollHole;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
}): GrantedAreaSaveDamageEntryPreparation {
  const { input, effect, outcomes, damageHole, damageFill } = stage;

  const spellDamageReductionRolls = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && isSpellDamageReductionRollFill(fill),
  );
  const damageEntriesByTarget: GrantedAreaSaveDamageActionDamageEntry[] = [];
  for (const outcome of outcomes) {
    // Saving-throw fill validation proves every affected outcome target belongs
    // to this battle before damage entries are projected.
    const target = input.state.combatants.get(outcome.targetId)!;
    const unadjusted = outcome.succeeded
      ? Math.floor(rolledDiceTotal(damageFill.value) / 2)
      : rolledDiceTotal(damageFill.value);
    const damageByType = damageAmountByTypeEntriesToMap([
      { damageType: effect.damageType, amount: unadjusted },
    ]);
    const spellDamageReductionRoll = spellDamageReductionRollForTarget(
      spellDamageReductionRolls,
      target,
      damageByType,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageByType,
      spellDamageReductionRoll,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spellReduction.tag === "invalid") {
      return {
        tag: "resolution",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
        ),
      };
    }
    /* v8 ignore stop -- @preserve */
    if (spellReduction.tag === "needsHoles") {
      return {
        tag: "resolution",
        result: needsHolesResult(input.state, input.subject, [
          ...spellReduction.holes,
        ]),
      };
    }
    damageEntriesByTarget.push({
      targetId: outcome.targetId,
      targetForHoles: spellReduction.target,
      damageByType,
      spellDamageReductionRoll,
      damageAmount: damageAmountByTypeAfterTargetAdjustments(
        input.state,
        spellReduction.target,
        spellReduction.damageByType,
      ),
      spellDamageReductionHoles:
        spellDamageReductionRoll === undefined
          ? []
          : [
              {
                kind: "rolledDice" as const,
                holeId: spellDamageReductionRoll.holeId,
              },
            ],
    });
  }
  return resolveGrantedAreaDamageRepeatSaveEntries(
    input,
    damageHole,
    damageEntriesByTarget,
  );
}

function resolveGrantedAreaDamageRepeatSaveEntries(
  input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>,
  damageHole: BattleGrantedAreaSaveDamageActionDamageRollHole,
  damageEntriesByTarget: readonly GrantedAreaSaveDamageActionDamageEntry[],
): GrantedAreaSaveDamageEntryPreparation {
  const resolvedDamageEntries: ResolvedGrantedAreaSaveDamageActionDamageEntry[] =
    [];
  for (const entry of damageEntriesByTarget) {
    const damageRepeatSave = resolveSaveGatedConditionDamageRepeatSave({
      state: input.state,
      target: entry.targetForHoles,
      damageAmount: entry.damageAmount,
      fills: input.fills.filter(
        (
          fill,
        ): fill is Extract<
          BattleFill,
          { readonly kind: "savingThrowOutcome" }
        > => fill.kind === "savingThrowOutcome",
      ),
      damageOccurrenceKey: saveGatedConditionDamageOccurrenceKeyForHoleTarget({
        holeId: damageHole.holeId,
        targetId: entry.targetId,
      }),
    });
    if (damageRepeatSave.tag === "invalid") {
      return {
        tag: "resolution",
        result: invalidResult(
          input.state,
          "invalidFill",
          damageRepeatSave.message,
        ),
      };
    }
    if (damageRepeatSave.tag === "needsHoles") {
      return {
        tag: "resolution",
        result: needsHolesResult(
          input.state,
          input.subject,
          damageRepeatSave.missingHoles,
        ),
      };
    }
    resolvedDamageEntries.push({ ...entry, damageRepeatSave });
  }
  return { tag: "ok", entries: resolvedDamageEntries };
}

function resolveGrantedAreaSaveDamageLifecycle(stage: {
  readonly input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>;
  readonly saveHole: ReturnType<
    typeof grantedAreaSaveDamageActionSavingThrowOutcomeHole
  >;
  readonly damageHole: BattleGrantedAreaSaveDamageActionDamageRollHole;
  readonly savingThrowTargetIds: readonly CombatantId[];
  readonly relationshipFacts: Parameters<
    typeof extendSavingThrowOngoingFeatures
  >[3];
  readonly resolvedDamageEntries: readonly ResolvedGrantedAreaSaveDamageActionDamageEntry[];
}): BattleResolutionResult {
  const {
    input,
    saveHole,
    damageHole,
    savingThrowTargetIds,
    relationshipFacts,
    resolvedDamageEntries,
  } = stage;
  const concentrationHoles = resolvedDamageEntries.flatMap((entry) => {
    return entry.damageAmount <= 0
      ? []
      : damageLifecycleConcentrationSavingThrowHoles({
          state: input.state,
          target: entry.targetForHoles,
          damageAmount: entry.damageAmount,
        });
  });
  const concentrationFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const concentrationHoleIds = new Set(
    concentrationHoles.map((hole) => hole.holeId),
  );
  const missingConcentrationHoles = concentrationHoles.filter(
    (hole) => !concentrationFills.some((fill) => fill.holeId === hole.holeId),
  );
  if (missingConcentrationHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingConcentrationHoles,
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    concentrationFills.some((fill) => !concentrationHoleIds.has(fill.holeId))
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating Granted area Save damage damage target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageDispositionHoles = resolvedDamageEntries.flatMap((entry) => {
    const hole =
      entry.damageAmount <= 0
        ? null
        : zeroHitPointReplacementDispositionHole({
            damageSourceId: input.subject.actorId,
            target: entry.targetForHoles,
            damageAmount: entry.damageAmount,
          });
    return hole === null ? [] : [hole];
  });
  const damageDispositions = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "attackDamageDisposition" }
    > => fill.kind === "attackDamageDisposition",
  );
  const dispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: damageDispositions,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (dispositionValidation !== null) {
    return invalidResult(input.state, "invalidFill", dispositionValidation);
  }
  /* v8 ignore stop -- @preserve */
  const missingDispositionHoles = damageDispositionHoles.filter(
    (hole) => damageDispositionFillFor(damageDispositions, hole) === undefined,
  );
  if (missingDispositionHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingDispositionHoles,
    );
  }
  const fillsValidation = validateExpectedGrantedAreaSaveDamageFills(
    input.fills,
    [
      { kind: "savingThrowOutcome", holeId: saveHole.holeId },
      { kind: "rolledDice", holeId: damageHole.holeId },
      ...resolvedDamageEntries.flatMap(
        (entry) => entry.spellDamageReductionHoles,
      ),
      ...resolvedDamageEntries.flatMap((entry) =>
        entry.damageRepeatSave.holes.map((hole) => ({
          kind: "savingThrowOutcome" as const,
          holeId: hole.holeId,
        })),
      ),
      ...concentrationHoles.map((hole) => ({
        kind: "concentrationSavingThrow" as const,
        holeId: hole.holeId,
      })),
      ...damageDispositionHoles.map((hole) => ({
        kind: "attackDamageDisposition" as const,
        holeId: hole.holeId,
      })),
    ],
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillsValidation !== null) {
    return invalidResult(input.state, "invalidFill", fillsValidation);
  }
  /* v8 ignore stop -- @preserve */

  return applyGrantedAreaSaveDamageEntries({
    input,
    savingThrowTargetIds,
    relationshipFacts,
    resolvedDamageEntries,
    concentrationFills,
    damageDispositions,
  });
}

function applyGrantedAreaSaveDamageEntries(stage: {
  readonly input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>;
  readonly savingThrowTargetIds: readonly CombatantId[];
  readonly relationshipFacts: Parameters<
    typeof extendSavingThrowOngoingFeatures
  >[3];
  readonly resolvedDamageEntries: readonly ResolvedGrantedAreaSaveDamageActionDamageEntry[];
  readonly concentrationFills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[];
  readonly damageDispositions: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[];
}): BattleResolutionResult {
  const {
    input,
    savingThrowTargetIds,
    relationshipFacts,
    resolvedDamageEntries,
    concentrationFills,
    damageDispositions,
  } = stage;
  let damaged = battleStateAfterSpendingGrantedAreaSaveDamageActionMagicAction(
    input,
    savingThrowTargetIds,
    relationshipFacts,
  );
  for (const entry of resolvedDamageEntries) {
    // Damage application preserves combatant membership, and fill validation
    // proved this target was present before the sequential damage lifecycle.
    const currentTarget = damaged.combatants.get(entry.targetId)!;
    const spellReduction = applyAvailableSpellDamageReduction(
      currentTarget,
      entry.damageByType,
      entry.spellDamageReductionRoll,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spellReduction.tag !== "ok") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction state changed before Granted area Save damage damage could resolve.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const damageAmount = damageAmountByTypeAfterTargetAdjustments(
      damaged,
      spellReduction.target,
      spellReduction.damageByType,
    );
    if (damageAmount <= 0) {
      continue;
    }
    const dispositionHole = zeroHitPointReplacementDispositionHole({
      damageSourceId: input.subject.actorId,
      target: spellReduction.target,
      damageAmount,
    });
    const targetConcentrationHole = concentrationSavingThrowHole(
      spellReduction.target,
      damageAmount,
    );
    const concentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state: damaged,
        target: spellReduction.target,
        damageAmount,
      });
    damaged = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: entry.damageRepeatSave.context,
      state: damaged,
      target: spellReduction.target,
      damageAmount,
      deathFailuresAtZeroHp: 1,
      damageSourceId: input.subject.actorId,
      concentrationSavingThrow:
        targetConcentrationHole === null
          ? undefined
          : concentrationFills.find(
              (fill) => fill.holeId === targetConcentrationHole.holeId,
            ),
      linkedDefenseResistanceDamageShareConcentrationSavingThrows:
        fillsMatchingHoleIds(concentrationFills, concentrationLifecycleHoles),
      damageDisposition:
        dispositionHole === null
          ? { kind: "ordinaryDamage" }
          : (damageDispositionFillFor(damageDispositions, dispositionHole)
              ?.value ?? { kind: "ordinaryDamage" }),
    });
  }
  return {
    tag: "resolved",
    state: damaged,
    snapshot: snapshotBattle(damaged),
  };
}

function battleStateAfterSpendingGrantedAreaSaveDamageActionMagicAction(
  input: BattleResolutionInputForSubject<GrantedAreaSaveDamageActionSubject>,
  targetIds: readonly CombatantId[],
  relationshipFacts: Parameters<typeof extendSavingThrowOngoingFeatures>[3],
): BattleState {
  // The resolver proves Magic-action availability before processing fills, and
  // fill processing does not modify turn resources.
  const spentResources = Result.getOrThrow(
    spendAction(input.state.currentTurnResources, "magic"),
  );
  return battleStateAfterTargetActionEarlyEndForActor(
    extendSavingThrowOngoingFeatures(
      { ...input.state, currentTurnResources: spentResources },
      input.subject.actorId,
      targetIds,
      relationshipFacts,
    ),
    input.subject.actorId,
  );
}

function grantedAreaSaveDamageActionDamageRollHole(
  effect: GrantedAreaSaveDamageActionEffect,
): BattleGrantedAreaSaveDamageActionDamageRollHole {
  const expr = grantedAreaSaveDamageActionDamageExpr(effect);
  const key = grantedAreaSaveDamageActionHoleKey(
    spellActiveEffectExecutionRef(effect),
    `damage-result:${expr.dice}d${expr.dieSize}`,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Granted area Save damage damage (${expr.dice}d${expr.dieSize})`,
    grantedAreaSaveDamageAction: {
      sourceCombatantId: effect.sourceCombatantId,
      sourceProcedureRef: effect.sourceProcedureRef,
      damageType: effect.damageType,
      expr,
    },
  };
}

function grantedAreaSaveDamageActionDamageExpr(
  effect: GrantedAreaSaveDamageActionEffect,
): {
  readonly dice: number;
  readonly dieSize: 6;
} {
  return { dice: Number(effect.castLevel) + 1, dieSize: 6 };
}

function activeGrantedAreaSaveDamageActionEffect(
  state: BattleState,
  actor: BattleCreatureState | undefined,
  subject: GrantedAreaSaveDamageActionSubject,
): GrantedAreaSaveDamageActionEffect | undefined {
  const effect = actor?.activeEffects.find(
    (candidate) =>
      candidate.kind === "grantedAreaSaveDamageAction" &&
      spellActiveEffectExecutionRef(candidate) === subject.effectRef,
  );
  return effect?.kind === "grantedAreaSaveDamageAction"
    ? boundGrantedAreaSaveDamageActionEffect(state, effect)
    : undefined;
}

/* v8 ignore start -- @preserve -- Malformed saving-throw validator: Granted area Save damage discovery supplies the exhaler-owned Cone, unique affected targets, and matching outcomes; admitted damage execution remains measured. */
function validateGrantedAreaSaveDamageActionSavingThrowFill(
  state: BattleState,
  actorId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
): string | null {
  if (!("area" in fill.value)) {
    return "Granted area Save damage requires 15-foot Cone area facts.";
  }
  const area = fill.value.area;
  if (area.originAnchorId !== actorId) {
    return "Granted area Save damage Cone must originate from the exhaling creature.";
  }
  const areaValidation = validateGrantedAreaSaveDamageActionArea(state, area);
  if (areaValidation !== null) {
    return areaValidation;
  }
  const affectedTargets = new Set(area.affectedTargetIds);
  const seenTargets = new Set<CombatantId>();
  for (const outcome of fill.value.outcomes) {
    if (!affectedTargets.has(outcome.targetId)) {
      return "Granted area Save damage Saving Throw outcomes must match the table-supplied Cone affected targets.";
    }
    if (seenTargets.has(outcome.targetId)) {
      return "Granted area Save damage Saving Throw outcomes must not duplicate targets.";
    }
    seenTargets.add(outcome.targetId);
  }
  return seenTargets.size === affectedTargets.size
    ? null
    : "Granted area Save damage Saving Throw outcomes must cover every table-supplied Cone affected target.";
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed area-witness validator: the Granted area Save damage Cone hole fixes its geometry, origin, battle membership, and unique affected targets before resolution. */
function validateGrantedAreaSaveDamageActionArea(
  state: BattleState,
  area: BattleSpellAreaChoice,
): string | null {
  if (!state.combatants.has(area.originAnchorId)) {
    return "Granted area Save damage Cone origin must be a combatant in this battle.";
  }
  if ("kind" in area || "sleepNonSleeperFacts" in area) {
    return "Granted area Save damage uses plain Cone area facts.";
  }
  const affectedTargets = new Set(area.affectedTargetIds);
  if (affectedTargets.size !== area.affectedTargetIds.length) {
    return "Granted area Save damage Cone affected targets must not duplicate targets.";
  }
  for (const targetId of affectedTargets) {
    if (!state.combatants.has(targetId)) {
      return "Granted area Save damage Cone affected target must be a combatant in this battle.";
    }
  }
  return null;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed fill-set validator: discovery publishes the exact Granted area Save damage hole kinds and identities; admitted fills are consumed after this boundary. */
function validateExpectedGrantedAreaSaveDamageFillKind(
  fills: readonly BattleFill[],
  kind: BattleFill["kind"],
  expectedHoleIds: readonly BattleHoleId[],
): string | null {
  const expected = new Set(expectedHoleIds);
  const seen = new Set<BattleHoleId>();
  for (const fill of fills) {
    if (fill.kind !== kind) {
      continue;
    }
    if (!expected.has(fill.holeId)) {
      return `Unexpected ${kind} fill for Granted area Save damage.`;
    }
    if (seen.has(fill.holeId)) {
      return `Duplicate ${kind} fill for Granted area Save damage.`;
    }
    seen.add(fill.holeId);
  }
  return null;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed fill-set validator: the resolver forwards only fills keyed by its discovered Granted area Save damage holes, so unexpected and duplicate keys are defensive rejections. */
function validateExpectedGrantedAreaSaveDamageFills(
  fills: readonly BattleFill[],
  expected: readonly ExpectedGrantedAreaSaveDamageFill[],
): string | null {
  const expectedKeys = new Set(expected.map(grantedAreaSaveDamageFillKey));
  const seen = new Set<string>();
  for (const fill of fills) {
    const key = grantedAreaSaveDamageFillKey(fill);
    if (!expectedKeys.has(key)) {
      return `Unexpected ${fill.kind} fill for Granted area Save damage.`;
    }
    if (seen.has(key)) {
      return `Duplicate ${fill.kind} fill for Granted area Save damage.`;
    }
    seen.add(key);
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function grantedAreaSaveDamageFillKey(
  fill: ExpectedGrantedAreaSaveDamageFill,
): string {
  return `${fill.kind}:${fill.holeId}`;
}

function savingThrowFillFor(
  fills: readonly BattleFill[],
  expectedHoleId: BattleHoleId,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === expectedHoleId,
  );
}

function rolledDiceFillFor(
  fills: readonly BattleFill[],
  expectedHoleId: BattleHoleId,
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return fills.find(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === expectedHoleId,
  );
}
