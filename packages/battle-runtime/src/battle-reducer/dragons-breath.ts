// Dragon's Breath target-granted Magic action.
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
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
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
} from "./dragons-breath-discovery.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
import { grantedAreaSaveDamageActionHoleKey } from "./selected-effect-hole-key.ts";
type ExpectedDragonBreathFill = {
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
  readonly spellDamageReductionHoles: readonly ExpectedDragonBreathFill[];
};

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
      "Magic action is no longer available for Dragon's Breath.",
    );
  }
  const effect = activeGrantedAreaSaveDamageActionEffect(actor, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dragon's Breath requires an active target-attached effect.",
    );
  }
  const saveHole = grantedAreaSaveDamageActionSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
  );
  const saveFillsValidation = validateExpectedDragonBreathFillKind(
    input.fills,
    "savingThrowOutcome",
    [saveHole.holeId],
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFillsValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveFillsValidation);
  }
  /* v8 ignore stop -- @preserve */
  const saveFill = savingThrowFillFor(input.fills, saveHole.holeId);
  if (saveFill === undefined) {
    const fillsValidation = validateExpectedDragonBreathFills(input.fills, [
      { kind: "savingThrowOutcome", holeId: saveHole.holeId },
    ]);
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
      "Dragon's Breath relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (outcomes.length === 0) {
    const fillsValidation = validateExpectedDragonBreathFills(input.fills, [
      { kind: "savingThrowOutcome", holeId: saveHole.holeId },
    ]);
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

  const damageHole = grantedAreaSaveDamageActionDamageRollHole(effect);
  const damageFill = rolledDiceFillFor(input.fills, damageHole.holeId);
  if (damageFill === undefined) {
    const damageFillsValidation = validateExpectedDragonBreathFillKind(
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
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (spellReduction.tag === "needsHoles") {
      return needsHolesResult(input.state, input.subject, [
        ...spellReduction.holes,
      ]);
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
  const concentrationHoles = damageEntriesByTarget.flatMap((entry) => {
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
      "Concentration Saving Throw fill is only valid for a concentrating Dragon's Breath damage target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageDispositionHoles = damageEntriesByTarget.flatMap((entry) => {
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
  const fillsValidation = validateExpectedDragonBreathFills(input.fills, [
    { kind: "savingThrowOutcome", holeId: saveHole.holeId },
    { kind: "rolledDice", holeId: damageHole.holeId },
    ...damageEntriesByTarget.flatMap(
      (entry) => entry.spellDamageReductionHoles,
    ),
    ...concentrationHoles.map((hole) => ({
      kind: "concentrationSavingThrow" as const,
      holeId: hole.holeId,
    })),
    ...damageDispositionHoles.map((hole) => ({
      kind: "attackDamageDisposition" as const,
      holeId: hole.holeId,
    })),
  ]);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillsValidation !== null) {
    return invalidResult(input.state, "invalidFill", fillsValidation);
  }
  /* v8 ignore stop -- @preserve */

  let damaged = battleStateAfterSpendingGrantedAreaSaveDamageActionMagicAction(
    input,
    savingThrowTargetIds,
    relationshipFacts,
  );
  for (const entry of damageEntriesByTarget) {
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
        "Spell damage reduction state changed before Dragon's Breath damage could resolve.",
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
    label: `Dragon's Breath damage (${expr.dice}d${expr.dieSize})`,
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
  return { dice: Number(effect.originalSlotLevel) + 1, dieSize: 6 };
}

function activeGrantedAreaSaveDamageActionEffect(
  actor: BattleCreatureState | undefined,
  subject: GrantedAreaSaveDamageActionSubject,
): GrantedAreaSaveDamageActionEffect | undefined {
  return actor?.activeEffects.find(
    (effect): effect is GrantedAreaSaveDamageActionEffect =>
      effect.kind === "grantedAreaSaveDamageAction" &&
      spellActiveEffectExecutionRef(effect) === subject.effectRef,
  );
}

/* v8 ignore start -- @preserve -- Malformed saving-throw validator: Dragon's Breath discovery supplies the exhaler-owned Cone, unique affected targets, and matching outcomes; admitted damage execution remains measured. */
function validateGrantedAreaSaveDamageActionSavingThrowFill(
  state: BattleState,
  actorId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
): string | null {
  if (!("area" in fill.value)) {
    return "Dragon's Breath requires 15-foot Cone area facts.";
  }
  const area = fill.value.area;
  if (area.originAnchorId !== actorId) {
    return "Dragon's Breath Cone must originate from the exhaling creature.";
  }
  const areaValidation = validateGrantedAreaSaveDamageActionArea(state, area);
  if (areaValidation !== null) {
    return areaValidation;
  }
  const affectedTargets = new Set(area.affectedTargetIds);
  const seenTargets = new Set<CombatantId>();
  for (const outcome of fill.value.outcomes) {
    if (!affectedTargets.has(outcome.targetId)) {
      return "Dragon's Breath Saving Throw outcomes must match the table-supplied Cone affected targets.";
    }
    if (seenTargets.has(outcome.targetId)) {
      return "Dragon's Breath Saving Throw outcomes must not duplicate targets.";
    }
    seenTargets.add(outcome.targetId);
  }
  return seenTargets.size === affectedTargets.size
    ? null
    : "Dragon's Breath Saving Throw outcomes must cover every table-supplied Cone affected target.";
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed area-witness validator: the Dragon's Breath Cone hole fixes its geometry, origin, battle membership, and unique affected targets before resolution. */
function validateGrantedAreaSaveDamageActionArea(
  state: BattleState,
  area: BattleSpellAreaChoice,
): string | null {
  if (!state.combatants.has(area.originAnchorId)) {
    return "Dragon's Breath Cone origin must be a combatant in this battle.";
  }
  if ("kind" in area || "sleepNonSleeperFacts" in area) {
    return "Dragon's Breath uses plain Cone area facts.";
  }
  const affectedTargets = new Set(area.affectedTargetIds);
  if (affectedTargets.size !== area.affectedTargetIds.length) {
    return "Dragon's Breath Cone affected targets must not duplicate targets.";
  }
  for (const targetId of affectedTargets) {
    if (!state.combatants.has(targetId)) {
      return "Dragon's Breath Cone affected target must be a combatant in this battle.";
    }
  }
  return null;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed fill-set validator: discovery publishes the exact Dragon's Breath hole kinds and identities; admitted fills are consumed after this boundary. */
function validateExpectedDragonBreathFillKind(
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
      return `Unexpected ${kind} fill for Dragon's Breath.`;
    }
    if (seen.has(fill.holeId)) {
      return `Duplicate ${kind} fill for Dragon's Breath.`;
    }
    seen.add(fill.holeId);
  }
  return null;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed fill-set validator: the resolver forwards only fills keyed by its discovered Dragon's Breath holes, so unexpected and duplicate keys are defensive rejections. */
function validateExpectedDragonBreathFills(
  fills: readonly BattleFill[],
  expected: readonly ExpectedDragonBreathFill[],
): string | null {
  const expectedKeys = new Set(expected.map(dragonBreathFillKey));
  const seen = new Set<string>();
  for (const fill of fills) {
    const key = dragonBreathFillKey(fill);
    if (!expectedKeys.has(key)) {
      return `Unexpected ${fill.kind} fill for Dragon's Breath.`;
    }
    if (seen.has(key)) {
      return `Duplicate ${fill.kind} fill for Dragon's Breath.`;
    }
    seen.add(key);
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function dragonBreathFillKey(fill: ExpectedDragonBreathFill): string {
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
