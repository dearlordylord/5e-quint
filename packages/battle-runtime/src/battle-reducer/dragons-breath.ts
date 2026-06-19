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
import * as Either from "effect/Either";
import { spellId } from "../identity.ts";
import type { CombatantId } from "../identity.ts";
import { snapshotBattle } from "../battle-reducer.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-reducer.ts";
import type {
  AvailableBattleAct,
  BattleCreatureState,
  BattleDragonsBreathDamageRollHole,
  BattleDragonsBreathSavingThrowOutcomeHole,
  BattleFill,
  BattleHoleId,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleSpellAreaChoice,
  BattleState,
} from "../battle-reducer.ts";
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
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { combatantCanTakeActions } from "./creature-state.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";

type DragonsBreathEffect = Extract<
  BattleCreatureState["activeEffects"][number],
  { readonly kind: "dragonsBreath" }
>;
type DragonsBreathExhaleSubject = Extract<
  BattleResolutionInputForSubject<
    Extract<
      import("../battle-subjects.ts").BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "dragonsBreathExhale";
      }
    >
  >["subject"],
  { readonly command: "dragonsBreathExhale" }
>;
type ExpectedDragonBreathFill = {
  readonly kind: BattleFill["kind"];
  readonly holeId: BattleHoleId;
};
type DragonsBreathDamageEntry = {
  readonly targetId: CombatantId;
  readonly targetForHoles: BattleCreatureState | undefined;
  readonly damageByType: ReturnType<typeof damageAmountByTypeEntriesToMap>;
  readonly spellDamageReductionRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  readonly damageAmount: number;
  readonly spellDamageReductionHoles: readonly ExpectedDragonBreathFill[];
};

const DRAGONS_BREATH_CONE_LENGTH_FEET = 15;

export function dragonsBreathExhaleActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    !combatantCanTakeActions(actor) ||
    !canSpendAction(state.currentTurnResources, "magic")
  ) {
    return [];
  }
  return activeDragonsBreathEffects(actor).map((effect) => {
    const subject = dragonsBreathExhaleSubject(actorId, effect);
    return {
      subject,
      label: "Dragon's Breath",
      summary: "Spend a Magic action to exhale a table-supplied 15-foot Cone.",
      initialHoles: [dragonsBreathSavingThrowOutcomeHole(state, effect)],
    };
  });
}

export function resolveDragonsBreathExhaleCommand(
  input: BattleResolutionInputForSubject<DragonsBreathExhaleSubject>,
): BattleResolutionResult {
  if (input.subject.actorId !== currentActorId(input.state)) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Dragon's Breath exhale belongs to the current actor.",
    );
  }
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
  const effect = activeDragonsBreathEffect(actor, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dragon's Breath requires an active target-attached effect.",
    );
  }
  const saveHole = dragonsBreathSavingThrowOutcomeHole(input.state, effect);
  const saveFillsValidation = validateExpectedDragonBreathFillKind(
    input.fills,
    "savingThrowOutcome",
    [saveHole.holeId],
  );
  if (saveFillsValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveFillsValidation);
  }
  const saveFill = savingThrowFillFor(input.fills, saveHole.holeId);
  if (saveFill === undefined) {
    const fillsValidation =
      input.fills.length === 0
        ? null
        : validateExpectedDragonBreathFills(input.fills, [
            { kind: "savingThrowOutcome", holeId: saveHole.holeId },
          ]);
    if (fillsValidation !== null) {
      return invalidResult(input.state, "invalidFill", fillsValidation);
    }
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateDragonsBreathSavingThrowFill(
    input.state,
    input.subject.actorId,
    saveFill,
  );
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  const outcomes = saveFill.value.outcomes;
  if (outcomes.length === 0) {
    const fillsValidation = validateExpectedDragonBreathFills(input.fills, [
      { kind: "savingThrowOutcome", holeId: saveHole.holeId },
    ]);
    if (fillsValidation !== null) {
      return invalidResult(input.state, "invalidFill", fillsValidation);
    }
    const spent = spendAction(input.state.currentTurnResources, "magic");
    if (Either.isLeft(spent)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Magic action is no longer available for Dragon's Breath.",
      );
    }
    const resolvedState = battleStateAfterTargetActionEarlyEndForActor(
      { ...input.state, currentTurnResources: spent.right },
      input.subject.actorId,
    );
    return {
      tag: "resolved",
      state: resolvedState,
      snapshot: snapshotBattle(resolvedState),
    };
  }

  const damageHole = dragonsBreathDamageRollHole(effect);
  const damageFill = rolledDiceFillFor(input.fills, damageHole.holeId);
  if (damageFill === undefined) {
    const damageFillsValidation = validateExpectedDragonBreathFillKind(
      input.fills,
      "rolledDice",
      [damageHole.holeId],
    );
    if (damageFillsValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageFillsValidation);
    }
    return needsHolesResult(input.state, input.subject, [damageHole]);
  }
  const damageValidation = validateRolledDiceFillForDiceExpr(
    damageFill,
    damageHole.dragonsBreath.expr,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }

  const spellDamageReductionRolls = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && isSpellDamageReductionRollFill(fill),
  );
  const damageEntriesByTarget: DragonsBreathDamageEntry[] = [];
  for (const outcome of outcomes) {
    const target = input.state.combatants.get(outcome.targetId);
    const unadjusted = outcome.succeeded
      ? Math.floor(rolledDiceTotal(damageFill.value) / 2)
      : rolledDiceTotal(damageFill.value);
    const damageByType = damageAmountByTypeEntriesToMap([
      { damageType: effect.damageType, amount: unadjusted },
    ]);
    if (target === undefined) {
      damageEntriesByTarget.push({
        targetId: outcome.targetId,
        targetForHoles: target,
        damageByType,
        spellDamageReductionRoll: undefined,
        damageAmount: 0,
        spellDamageReductionHoles: [],
      });
      continue;
    }
    const spellDamageReductionRoll = spellDamageReductionRollForTarget(
      spellDamageReductionRolls,
      target,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageByType,
      spellDamageReductionRoll,
    );
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
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
    return entry.targetForHoles === undefined || entry.damageAmount <= 0
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
  if (
    concentrationFills.some((fill) => !concentrationHoleIds.has(fill.holeId))
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating Dragon's Breath damage target.",
    );
  }
  const damageDispositionHoles = damageEntriesByTarget.flatMap((entry) => {
    const hole =
      entry.targetForHoles === undefined || entry.damageAmount <= 0
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
  if (dispositionValidation !== null) {
    return invalidResult(input.state, "invalidFill", dispositionValidation);
  }
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
  if (fillsValidation !== null) {
    return invalidResult(input.state, "invalidFill", fillsValidation);
  }

  const spent = spendAction(input.state.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for Dragon's Breath.",
    );
  }
  let damaged = battleStateAfterTargetActionEarlyEndForActor(
    { ...input.state, currentTurnResources: spent.right },
    input.subject.actorId,
  );
  for (const entry of damageEntriesByTarget) {
    const currentTarget = damaged.combatants.get(entry.targetId);
    if (currentTarget === undefined) {
      continue;
    }
    const spellReduction = applyAvailableSpellDamageReduction(
      currentTarget,
      entry.damageByType,
      entry.spellDamageReductionRoll,
    );
    if (spellReduction.tag !== "ok") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction state changed before Dragon's Breath damage could resolve.",
      );
    }
    const damageAmount = damageAmountByTypeAfterTargetAdjustments(
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
      wardingBondDamageShareConcentrationSavingThrows: fillsMatchingHoleIds(
        concentrationFills,
        concentrationLifecycleHoles,
      ),
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

export function dragonsBreathSavingThrowOutcomeHole(
  state: BattleState,
  effect: DragonsBreathEffect,
): BattleDragonsBreathSavingThrowOutcomeHole {
  const key = dragonsBreathHoleKey(effect, "saving-throw-outcome");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Dragon's Breath 15-foot Cone Saving Throw outcomes",
    dragonsBreath: {
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: effect.sourceSpellId,
      lengthFeet: DRAGONS_BREATH_CONE_LENGTH_FEET,
    },
    ability: "dex",
    dc: { kind: "fixed", dc: effect.spellSaveDc },
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(state, "dex"),
    targetFlatBonuses: savingThrowFlatBonusProjections(state, "dex"),
  };
}

function dragonsBreathDamageRollHole(
  effect: DragonsBreathEffect,
): BattleDragonsBreathDamageRollHole {
  const expr = dragonsBreathDamageExpr(effect);
  const key = dragonsBreathHoleKey(
    effect,
    `damage-result:${expr.dice}d${expr.dieSize}`,
  );
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Dragon's Breath damage (${expr.dice}d${expr.dieSize})`,
    dragonsBreath: {
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: effect.sourceSpellId,
      damageType: effect.damageType,
      expr,
    },
  };
}

function dragonsBreathDamageExpr(effect: DragonsBreathEffect): {
  readonly dice: number;
  readonly dieSize: 6;
} {
  return { dice: Number(effect.originalSlotLevel) + 1, dieSize: 6 };
}

function activeDragonsBreathEffects(
  actor: BattleCreatureState,
): readonly DragonsBreathEffect[] {
  return actor.activeEffects.filter(
    (effect): effect is DragonsBreathEffect => effect.kind === "dragonsBreath",
  );
}

function activeDragonsBreathEffect(
  actor: BattleCreatureState | undefined,
  subject: DragonsBreathExhaleSubject,
): DragonsBreathEffect | undefined {
  return actor?.activeEffects.find(
    (effect): effect is DragonsBreathEffect =>
      effect.kind === "dragonsBreath" &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.sourceSpellId === subject.sourceSpellId,
  );
}

function dragonsBreathExhaleSubject(
  actorId: CombatantId,
  effect: DragonsBreathEffect,
): DragonsBreathExhaleSubject {
  return {
    tag: "runtimeCommand",
    actorId,
    command: "dragonsBreathExhale",
    sourceCombatantId: effect.sourceCombatantId,
    sourceSpellId: spellId(effect.sourceSpellId),
  };
}

function validateDragonsBreathSavingThrowFill(
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
  const areaValidation = validateDragonsBreathArea(state, area);
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

function validateDragonsBreathArea(
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

function dragonsBreathHoleKey(
  effect: DragonsBreathEffect,
  suffix: string,
): string {
  return `battle:dragons-breath:${effect.sourceSpellId}:${effect.sourceCombatantId}:${suffix}`;
}
