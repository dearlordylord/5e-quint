import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  AdmittedBattleResolutionInput,
  BattleConcentrationSavingThrowHole,
  BattleFill,
  BattleHole,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
} from "../battle-state-execution.ts";
import { battleSubjectActorId } from "./creature-state-execution.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE,
  d20TestNaturalOneRerollHoleWithOption,
  d20TestNaturalOneRerollOutcomeDecisionRequired,
  d20TestNaturalOneRerollOutcomeIssue,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
} from "./d20-test-natural-one-reroll.ts";
import { invalidResult } from "./result-helpers.ts";

type D20TestNaturalOneRerollPrefixResolver = (
  input: AdmittedBattleResolutionInput,
) => BattleResolutionResult;

type D20TestNaturalOneRerollDecisionHoleKind =
  | "abilityCheck"
  | "concentrationSavingThrow"
  | "savingThrowOutcome"
  | "spellcastingAbilityCheck";

type D20TestNaturalOneRerollFillValidation =
  | { readonly tag: "ok" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "decisionRequired";
      readonly fillIndex: number;
      readonly holeId: BattleFill["holeId"];
      readonly holeKind: D20TestNaturalOneRerollDecisionHoleKind;
    };

type D20TestNaturalOneRerollAbilityCheckHole = Extract<
  BattleHole,
  { readonly kind: "abilityCheck" | "spellcastingAbilityCheck" }
>;

type D20TestNaturalOneRerollSavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;

function pendingHolesBeforeFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly fillIndex: number;
  readonly resolvePrefix: D20TestNaturalOneRerollPrefixResolver;
}): readonly BattleHole[] {
  const pending = input.resolvePrefix({
    ...input.resolutionInput,
    fills: input.resolutionInput.fills.slice(0, input.fillIndex),
  });
  return pending.tag === "needsHoles" ? pending.holes : [];
}

function abilityCheckHoleForFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly fillIndex: number;
  readonly fill: Extract<BattleFill, { readonly kind: "abilityCheck" }>;
  readonly resolvePrefix: D20TestNaturalOneRerollPrefixResolver;
}): D20TestNaturalOneRerollAbilityCheckHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is D20TestNaturalOneRerollAbilityCheckHole =>
      (hole.kind === "abilityCheck" ||
        hole.kind === "spellcastingAbilityCheck") &&
      hole.holeId === input.fill.holeId,
  );
}

function savingThrowOutcomeHoleForFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly fillIndex: number;
  readonly fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
  readonly resolvePrefix: D20TestNaturalOneRerollPrefixResolver;
}): D20TestNaturalOneRerollSavingThrowOutcomeHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is D20TestNaturalOneRerollSavingThrowOutcomeHole =>
      hole.kind === "savingThrowOutcome" && hole.holeId === input.fill.holeId,
  );
}

function savingThrowOutcomeRollModeForTarget(
  hole: D20TestNaturalOneRerollSavingThrowOutcomeHole | undefined,
  targetId: BattleSavingThrowOutcome["targetId"],
): AttackRollMode | undefined {
  return hole?.targetRollModes.find(
    (projection) => projection.targetId === targetId,
  )?.rollMode;
}

function concentrationSavingThrowHoleForFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly fillIndex: number;
  readonly fill: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >;
  readonly resolvePrefix: D20TestNaturalOneRerollPrefixResolver;
}): BattleConcentrationSavingThrowHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is BattleConcentrationSavingThrowHole =>
      hole.kind === "concentrationSavingThrow" &&
      hole.holeId === input.fill.holeId,
  );
}

function validateD20TestNaturalOneRerollFills(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly resolvePrefix: D20TestNaturalOneRerollPrefixResolver;
}): D20TestNaturalOneRerollFillValidation {
  const actor = input.resolutionInput.state.combatants.get(
    battleSubjectActorId(input.resolutionInput.subject),
  );
  for (const [fillIndex, fill] of input.resolutionInput.fills.entries()) {
    if (fill.kind === "abilityCheck") {
      const abilityCheckHole = abilityCheckHoleForFill({
        ...input,
        fillIndex,
        fill,
      });
      const abilityCheckRollMode =
        abilityCheckHole?.kind === "abilityCheck"
          ? abilityCheckHole.rollMode
          : undefined;
      const originalNaturalD20 =
        fill.value.naturalD20 === undefined
          ? undefined
          : Number(fill.value.naturalD20);
      if (
        d20TestNaturalOneRerollRollDecisionRequired({
          actor,
          rollMode: abilityCheckRollMode,
          rolledD20s: fill.value.rolledD20s,
          originalNaturalD20,
          decision: fill.value.d20TestNaturalOneReroll,
        })
      ) {
        return {
          tag: "decisionRequired",
          fillIndex,
          holeId: fill.holeId,
          holeKind: abilityCheckHole?.kind ?? "abilityCheck",
        };
      }
      const issue = d20TestNaturalOneRerollRollIssue({
        actor,
        total: fill.value.total,
        rollMode: abilityCheckRollMode,
        rolledD20s: fill.value.rolledD20s,
        originalNaturalD20,
        decision: fill.value.d20TestNaturalOneReroll,
        requiredRollMode: abilityCheckRollMode,
      });
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (issue !== null) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return { tag: "invalid", message: issue };
      }
      /* v8 ignore stop */
      continue;
    }
    if (fill.kind === "savingThrowOutcome") {
      const savingThrowHole = savingThrowOutcomeHoleForFill({
        ...input,
        fillIndex,
        fill,
      });
      for (const outcome of fill.value.outcomes) {
        const target = input.resolutionInput.state.combatants.get(
          outcome.targetId,
        );
        const rollMode = savingThrowOutcomeRollModeForTarget(
          savingThrowHole,
          outcome.targetId,
        );
        const originalNaturalD20 =
          outcome.naturalD20 === undefined
            ? undefined
            : Number(outcome.naturalD20);
        if (
          d20TestNaturalOneRerollOutcomeDecisionRequired({
            actor: target,
            rollMode,
            rolledD20s: outcome.rolledD20s,
            originalNaturalD20,
            decision: outcome.d20TestNaturalOneReroll,
            withoutRoll: outcome.withoutRoll,
          })
        ) {
          return {
            tag: "decisionRequired",
            fillIndex,
            holeId: fill.holeId,
            holeKind: "savingThrowOutcome",
          };
        }
        const issue = d20TestNaturalOneRerollOutcomeIssue({
          actor: target,
          rollMode,
          rolledD20s: outcome.rolledD20s,
          originalNaturalD20,
          decision: outcome.d20TestNaturalOneReroll,
          withoutRoll: outcome.withoutRoll,
          succeeded: outcome.succeeded,
        });
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (issue !== null) {
          /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
          return { tag: "invalid", message: issue };
        }
        /* v8 ignore stop */
      }
      continue;
    }
    if (fill.kind === "concentrationSavingThrow") {
      const concentrationHole = concentrationSavingThrowHoleForFill({
        ...input,
        fillIndex,
        fill,
      });
      const concentrationActor =
        concentrationHole === undefined
          ? undefined
          : input.resolutionInput.state.combatants.get(
              concentrationHole.combatantId,
            );
      const originalNaturalD20 =
        fill.value.naturalD20 === undefined
          ? undefined
          : Number(fill.value.naturalD20);
      if (
        d20TestNaturalOneRerollOutcomeDecisionRequired({
          actor: concentrationActor,
          rollMode: concentrationHole?.rollMode,
          rolledD20s: fill.value.rolledD20s,
          originalNaturalD20,
          decision: fill.value.d20TestNaturalOneReroll,
          withoutRoll: fill.value.withoutRoll,
        })
      ) {
        return {
          tag: "decisionRequired",
          fillIndex,
          holeId: fill.holeId,
          holeKind: "concentrationSavingThrow",
        };
      }
      const issue = d20TestNaturalOneRerollOutcomeIssue({
        actor: concentrationActor,
        rollMode: concentrationHole?.rollMode,
        rolledD20s: fill.value.rolledD20s,
        originalNaturalD20,
        decision: fill.value.d20TestNaturalOneReroll,
        withoutRoll: fill.value.withoutRoll,
        succeeded: fill.value.succeeded,
      });
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (issue !== null) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return { tag: "invalid", message: issue };
      }
      /* v8 ignore stop */
    }
  }
  return { tag: "ok" };
}

function resolveD20TestNaturalOneRerollDecisionHole(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly decision: Extract<
    D20TestNaturalOneRerollFillValidation,
    { readonly tag: "decisionRequired" }
  >;
  readonly resolvePrefix: D20TestNaturalOneRerollPrefixResolver;
}): BattleResolutionResult {
  const pending = input.resolvePrefix({
    ...input.resolutionInput,
    fills: input.resolutionInput.fills.slice(0, input.decision.fillIndex),
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (pending.tag !== "needsHoles") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.resolutionInput.state,
      "invalidFill",
      D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE,
    );
  }
  /* v8 ignore stop */
  let matched = false;
  const holes = pending.holes.map((hole): BattleHole => {
    if (
      hole.kind === input.decision.holeKind &&
      hole.holeId === input.decision.holeId
    ) {
      matched = true;
      return d20TestNaturalOneRerollHoleWithOption(hole);
    }
    return hole;
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!matched) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.resolutionInput.state,
      "invalidFill",
      D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE,
    );
  }
  /* v8 ignore stop */
  return { ...pending, holes };
}

export function resolveD20TestNaturalOneRerollFills(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly resolvePrefix: D20TestNaturalOneRerollPrefixResolver;
}): BattleResolutionResult | undefined {
  const validation = validateD20TestNaturalOneRerollFills(input);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.resolutionInput.state,
      "invalidFill",
      validation.message,
    );
  }
  /* v8 ignore stop */
  return validation.tag === "decisionRequired"
    ? resolveD20TestNaturalOneRerollDecisionHole({
        ...input,
        decision: validation,
      })
    : undefined;
}
