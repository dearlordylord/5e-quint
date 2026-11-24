import type {
  BattleAttackRollResult,
  BattleD20TestDieRerollDecision,
  BattleD20TestOutcomeRerollDecision,
  BattleD20TestRollRerollDecision,
  BattleFill,
  BattleOpportunityAttackThreat,
  BattleRolledDiceFill,
  BattleSavingThrowOutcome,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef } from "../identity.ts";
import { canonicalStructuralKey } from "@dnd/shared/structural-value";
import { Match } from "effect";
import { sameMultisetBy } from "../mechanical-equality.ts";
import { d20TestRollsEqual } from "@dnd/shared-algebras/runtime-hole-algebra";
import { opportunityAttackThreatEqual } from "./opportunity-attack-equality.ts";

export const BATTLE_CONTINUATION_COMPARABLE_FILL_KINDS = [
  "targetChoice",
  "targetSpatialFacts",
  "attackRoll",
  "rolledDice",
  "attackDamageDisposition",
  "concentrationSavingThrow",
  "savingThrowOutcome",
  "movement",
  "persistentAreaSourceTurnTranslation",
  "startTurnOccurrenceOrder",
  "temporaryHitPointChoice",
  "toolPossessionFacts",
  "cunningStrikeEndTurnCoverFacts",
  "deathSavingThrow",
  "statBlockRechargeRoll",
] as const satisfies ReadonlyArray<BattleFill["kind"]>;

export type BattleContinuationComparableFill = Extract<
  BattleFill,
  {
    readonly kind: (typeof BATTLE_CONTINUATION_COMPARABLE_FILL_KINDS)[number];
  }
>;

export function isBattleContinuationComparableFill(
  fill: BattleFill,
): fill is BattleContinuationComparableFill {
  return BATTLE_CONTINUATION_COMPARABLE_FILL_KINDS.some(
    (kind) => kind === fill.kind,
  );
}

export function battleContinuationFillEquals(
  a: BattleContinuationComparableFill,
  b: BattleContinuationComparableFill,
): boolean {
  return Match.value(a).pipe(
    Match.discriminatorsExhaustive("kind")({
      targetChoice: (left) =>
        b.kind === "targetChoice" &&
        left.holeId === b.holeId &&
        left.value === b.value,
      targetSpatialFacts: (left) =>
        b.kind === "targetSpatialFacts" &&
        left.holeId === b.holeId &&
        sameMultisetBy(
          left.spatialFacts,
          b.spatialFacts,
          (leftFact, rightFact) =>
            canonicalStructuralKey(leftFact) ===
            canonicalStructuralKey(rightFact),
        ),
      attackRoll: (left) =>
        b.kind === "attackRoll" &&
        left.holeId === b.holeId &&
        attackRollResultsEqual(left.value, b.value),
      rolledDice: (left) =>
        b.kind === "rolledDice" &&
        left.holeId === b.holeId &&
        rolledDiceGroupsEqual(left.value, b.value) &&
        attackDamageRiderSelectionsEqual(
          left.selectedAttackDamageRiderProcedureRefs,
          b.selectedAttackDamageRiderProcedureRefs,
        ) &&
        cunningStrikeOptionSelectionsEqual(
          left.cunningStrikeOption,
          b.cunningStrikeOption,
        ) &&
        spellDamageRerollDecisionsEqual(
          left.spellDamageReroll,
          b.spellDamageReroll,
        ),
      attackDamageDisposition: (left) =>
        b.kind === "attackDamageDisposition" &&
        left.holeId === b.holeId &&
        left.value.kind === b.value.kind &&
        (left.value.kind !== "zeroHitPointReplacement" ||
          (b.value.kind === "zeroHitPointReplacement" &&
            left.value.procedureRef === b.value.procedureRef)),
      concentrationSavingThrow: (left) =>
        b.kind === "concentrationSavingThrow" &&
        left.holeId === b.holeId &&
        left.value.succeeded === b.value.succeeded &&
        d20TestRollsEqual(left.value.d20TestRoll, b.value.d20TestRoll) &&
        left.value.withoutRoll === b.value.withoutRoll &&
        rerollDecisionListsEqual(
          left.value.d20TestRerolls,
          b.value.d20TestRerolls,
          d20TestOutcomeRerollDecisionsEqual,
        ),
      savingThrowOutcome: (left) =>
        b.kind === "savingThrowOutcome" &&
        left.holeId === b.holeId &&
        savingThrowOutcomeValuesEqual(left.value, b.value),
      movement: (left) =>
        b.kind === "movement" &&
        left.holeId === b.holeId &&
        movementFillValuesEqual(left.value, b.value),
      persistentAreaSourceTurnTranslation: (left) =>
        b.kind === "persistentAreaSourceTurnTranslation" &&
        left.holeId === b.holeId &&
        arrayValuesEqual(
          left.value.affectedCombatantIdsInResolutionOrder,
          b.value.affectedCombatantIdsInResolutionOrder,
        ),
      startTurnOccurrenceOrder: (left) =>
        b.kind === "startTurnOccurrenceOrder" &&
        left.holeId === b.holeId &&
        arrayValuesEqual(left.value.occurrenceIds, b.value.occurrenceIds),
      temporaryHitPointChoice: (left) =>
        b.kind === "temporaryHitPointChoice" &&
        left.holeId === b.holeId &&
        left.value === b.value,
      toolPossessionFacts: (left) =>
        b.kind === "toolPossessionFacts" &&
        left.holeId === b.holeId &&
        arrayValuesEqual(left.value.toolIdsOnPerson, b.value.toolIdsOnPerson),
      cunningStrikeEndTurnCoverFacts: (left) =>
        b.kind === "cunningStrikeEndTurnCoverFacts" &&
        left.holeId === b.holeId &&
        left.value.cover === b.value.cover,
      deathSavingThrow: (left) =>
        b.kind === "deathSavingThrow" &&
        left.holeId === b.holeId &&
        left.value === b.value &&
        rerollDecisionListsEqual(
          left.d20TestRerolls,
          b.d20TestRerolls,
          d20TestDieRerollDecisionsEqual,
        ),
      statBlockRechargeRoll: (left) =>
        b.kind === "statBlockRechargeRoll" &&
        left.holeId === b.holeId &&
        sameMultisetBy(
          left.value,
          b.value,
          (leftResult, rightResult) =>
            leftResult.target === rightResult.target &&
            leftResult.roll === rightResult.roll,
        ),
    }),
  );
}

export function battleFillPrefixAccumulated(
  prefix: readonly BattleContinuationComparableFill[],
  fills: readonly BattleContinuationComparableFill[],
): boolean {
  return (
    fills.length >= prefix.length &&
    prefix.every((fill, index) =>
      battleContinuationFillEquals(fill, fills[index]!),
    )
  );
}

/**
 * Fill kinds whose holes the pending frontier asks again for a reroll
 * decision: each D20 Test roll's ordered reroll decisions.
 */
const BATTLE_REROLL_DECISION_FILL_KINDS = [
  "attackRoll",
  "abilityCheck",
  "concentrationSavingThrow",
  "savingThrowOutcome",
  "deathSavingThrow",
] as const satisfies ReadonlyArray<BattleFill["kind"]>;

type BattleRerollDecisionFill = Extract<
  BattleFill,
  { readonly kind: (typeof BATTLE_REROLL_DECISION_FILL_KINDS)[number] }
>;

function isBattleRerollDecisionFill(
  fill: BattleFill,
): fill is BattleRerollDecisionFill {
  return BATTLE_REROLL_DECISION_FILL_KINDS.some((kind) => kind === fill.kind);
}

/**
 * Whether a fill submitted again for a hole the pending frontier asks again
 * keeps the accepted fill: it is the same fill, except that it may add reroll
 * decisions after the accepted ones.
 */
export function battleResubmittedFillKeepsAcceptedFill(
  accepted: BattleFill,
  resubmitted: BattleFill,
): boolean {
  const atAcceptedDecisions = isBattleRerollDecisionFill(resubmitted)
    ? resubmittedFillAtAcceptedDecisions(accepted, resubmitted)
    : resubmitted;
  return (
    atAcceptedDecisions !== null &&
    canonicalStructuralKey(accepted) ===
      canonicalStructuralKey(atAcceptedDecisions)
  );
}

/**
 * The resubmitted fill with only the reroll decisions the accepted fill made,
 * or null when its decisions don't extend the accepted ones. The result is
 * compared by structure only.
 */
function resubmittedFillAtAcceptedDecisions(
  accepted: BattleFill,
  resubmitted: BattleRerollDecisionFill,
): object | null {
  return Match.value(resubmitted).pipe(
    Match.discriminatorsExhaustive("kind")({
      attackRoll: (fill) =>
        fillValueAtAcceptedRerolls(
          fill,
          accepted.kind === "attackRoll"
            ? accepted.value.d20TestRerolls
            : undefined,
          d20TestRollRerollDecisionsEqual,
        ),
      abilityCheck: (fill) =>
        fillValueAtAcceptedRerolls(
          fill,
          accepted.kind === "abilityCheck"
            ? accepted.value.d20TestRerolls
            : undefined,
          d20TestRollRerollDecisionsEqual,
        ),
      concentrationSavingThrow: (fill) =>
        fillValueAtAcceptedRerolls(
          fill,
          accepted.kind === "concentrationSavingThrow"
            ? accepted.value.d20TestRerolls
            : undefined,
          d20TestOutcomeRerollDecisionsEqual,
        ),
      savingThrowOutcome: (fill) => {
        const outcomes = fill.value.outcomes.map((outcome, index) =>
          valueAtAcceptedRerolls(
            outcome,
            accepted.kind === "savingThrowOutcome"
              ? accepted.value.outcomes[index]?.d20TestRerolls
              : undefined,
            d20TestOutcomeRerollDecisionsEqual,
          ),
        );
        return outcomes.includes(null)
          ? null
          : { ...fill, value: { ...fill.value, outcomes } };
      },
      deathSavingThrow: (fill) =>
        valueAtAcceptedRerolls(
          fill,
          accepted.kind === "deathSavingThrow"
            ? accepted.d20TestRerolls
            : undefined,
          d20TestDieRerollDecisionsEqual,
        ),
    }),
  );
}

function fillValueAtAcceptedRerolls<
  Decision,
  Fill extends {
    readonly value: { readonly d20TestRerolls?: readonly Decision[] };
  },
>(
  fill: Fill,
  accepted: readonly Decision[] | undefined,
  decisionsEqual: (a: Decision, b: Decision) => boolean,
): object | null {
  const value = valueAtAcceptedRerolls(fill.value, accepted, decisionsEqual);
  return value === null ? null : { ...fill, value };
}

/**
 * A roll with only the accepted reroll decisions, when the resubmitted ones
 * start with them; a resubmission may add decisions after the accepted ones.
 */
function valueAtAcceptedRerolls<
  Decision,
  Value extends { readonly d20TestRerolls?: readonly Decision[] },
>(
  value: Value,
  accepted: readonly Decision[] | undefined,
  decisionsEqual: (a: Decision, b: Decision) => boolean,
): object | null {
  const resubmitted = value.d20TestRerolls;
  if (
    accepted !== undefined &&
    (resubmitted === undefined ||
      accepted.length > resubmitted.length ||
      !accepted.every((decision, index) =>
        decisionsEqual(decision, resubmitted[index]!),
      ))
  ) {
    return null;
  }
  const { d20TestRerolls: _resubmitted, ...withoutRerolls } = value;
  return accepted === undefined
    ? withoutRerolls
    : { ...withoutRerolls, d20TestRerolls: accepted };
}

type ComparableAttackRollResult = Pick<
  BattleAttackRollResult,
  "total" | "d20TestRoll"
> &
  Partial<
    Pick<
      BattleAttackRollResult,
      | "activatedOngoingFeatureProcedureRef"
      | "missToHitReplacementProcedureRef"
      | "d20TestRerolls"
    >
  >;

function attackRollResultsEqual(
  a: ComparableAttackRollResult,
  b: ComparableAttackRollResult,
): boolean {
  return (
    a.total === b.total &&
    d20TestRollsEqual(a.d20TestRoll, b.d20TestRoll) &&
    a.activatedOngoingFeatureProcedureRef ===
      b.activatedOngoingFeatureProcedureRef &&
    a.missToHitReplacementProcedureRef === b.missToHitReplacementProcedureRef &&
    rerollDecisionListsEqual(
      a.d20TestRerolls,
      b.d20TestRerolls,
      d20TestRollRerollDecisionsEqual,
    )
  );
}

function rerollDecisionListsEqual<Decision>(
  a: readonly Decision[] | undefined,
  b: readonly Decision[] | undefined,
  decisionsEqual: (a: Decision, b: Decision) => boolean,
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return (
    a.length === b.length &&
    a.every((decision, index) => decisionsEqual(decision, b[index]!))
  );
}

function d20TestRollRerollDecisionsEqual<EffectKind extends string>(
  a: BattleD20TestRollRerollDecision<EffectKind>,
  b: BattleD20TestRollRerollDecision<EffectKind>,
): boolean {
  return Match.value(a).pipe(
    Match.discriminatorsExhaustive("kind")({
      decline: (left) =>
        b.kind === "decline" && left.effectKind === b.effectKind,
      reroll: (left) =>
        b.kind === "reroll" &&
        left.effectKind === b.effectKind &&
        attackRollResultsEqual(left.replacement, b.replacement),
      rerollRolledDie: (left) =>
        b.kind === "rerollRolledDie" &&
        left.effectKind === b.effectKind &&
        left.replacement.die === b.replacement.die &&
        attackRollResultsEqual(left.replacement.result, b.replacement.result),
    }),
  );
}

function d20TestOutcomeRerollDecisionsEqual<EffectKind extends string>(
  a: BattleD20TestOutcomeRerollDecision<EffectKind>,
  b: BattleD20TestOutcomeRerollDecision<EffectKind>,
): boolean {
  return Match.value(a).pipe(
    Match.discriminatorsExhaustive("kind")({
      decline: (left) =>
        b.kind === "decline" && left.effectKind === b.effectKind,
      reroll: (left) =>
        b.kind === "reroll" &&
        left.effectKind === b.effectKind &&
        left.replacement.succeeded === b.replacement.succeeded &&
        d20TestRollsEqual(
          left.replacement.d20TestRoll,
          b.replacement.d20TestRoll,
        ),
      rerollRolledDie: (left) =>
        b.kind === "rerollRolledDie" &&
        left.effectKind === b.effectKind &&
        left.replacement.die === b.replacement.die &&
        left.replacement.result.succeeded === b.replacement.result.succeeded &&
        d20TestRollsEqual(
          left.replacement.result.d20TestRoll,
          b.replacement.result.d20TestRoll,
        ),
    }),
  );
}

function d20TestDieRerollDecisionsEqual<EffectKind extends string>(
  a: BattleD20TestDieRerollDecision<EffectKind>,
  b: BattleD20TestDieRerollDecision<EffectKind>,
): boolean {
  return Match.value(a).pipe(
    Match.discriminatorsExhaustive("kind")({
      decline: (left) =>
        b.kind === "decline" && left.effectKind === b.effectKind,
      reroll: (left) =>
        b.kind === "reroll" &&
        left.effectKind === b.effectKind &&
        left.replacement === b.replacement,
    }),
  );
}

function savingThrowOutcomeValuesEqual(
  a: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>["value"],
  b: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>["value"],
): boolean {
  return (
    a.outcomes.length === b.outcomes.length &&
    a.outcomes.every((outcome, index) =>
      savingThrowOutcomesEqual(outcome, b.outcomes[index]),
    )
  );
}

function savingThrowOutcomesEqual(
  a: BattleSavingThrowOutcome,
  b: BattleSavingThrowOutcome | undefined,
): boolean {
  return (
    b !== undefined &&
    a.targetId === b.targetId &&
    a.succeeded === b.succeeded &&
    d20TestRollsEqual(a.d20TestRoll, b.d20TestRoll) &&
    a.withoutRoll === b.withoutRoll &&
    rerollDecisionListsEqual(
      a.d20TestRerolls,
      b.d20TestRerolls,
      d20TestOutcomeRerollDecisionsEqual,
    )
  );
}

function movementFillValuesEqual(
  a: Extract<BattleFill, { readonly kind: "movement" }>["value"],
  b: Extract<BattleFill, { readonly kind: "movement" }>["value"],
): boolean {
  return (
    a.speedKind === b.speedKind &&
    movementPathsEqual(a.path, b.path) &&
    acrobaticMovementFactsEqual(a.acrobaticMovement, b.acrobaticMovement) &&
    opportunityAttackThreatListsEqual(
      a.provokedOpportunityAttacks,
      b.provokedOpportunityAttacks,
    )
  );
}

function movementPathsEqual(
  a: Extract<BattleFill, { readonly kind: "movement" }>["value"]["path"],
  b: Extract<BattleFill, { readonly kind: "movement" }>["value"]["path"],
): boolean {
  return (
    a.length === b.length &&
    a.every((segment, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        segment.distanceFeet === other.distanceFeet &&
        segment.activity === other.activity &&
        segment.difficultTerrain === other.difficultTerrain &&
        segment.movesCloserThroughDirectionalArea ===
          other.movesCloserThroughDirectionalArea &&
        arrayValuesEqual(
          segment.draggedGrappledTargetIds,
          other.draggedGrappledTargetIds,
        )
      );
    })
  );
}

function acrobaticMovementFactsEqual(
  a: Extract<
    BattleFill,
    { readonly kind: "movement" }
  >["value"]["acrobaticMovement"],
  b: Extract<
    BattleFill,
    { readonly kind: "movement" }
  >["value"]["acrobaticMovement"],
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return (
    a.kind === b.kind &&
    a.withoutFallingDuringMovement === b.withoutFallingDuringMovement &&
    arrayValuesEqual(a.paths, b.paths)
  );
}

function opportunityAttackThreatListsEqual(
  a: readonly BattleOpportunityAttackThreat[],
  b: readonly BattleOpportunityAttackThreat[],
): boolean {
  if (a.length !== b.length) return false;
  const unmatched = [...b];
  return a.every((threat) => {
    const matchingIndex = unmatched.findIndex((other) =>
      opportunityAttackThreatEqual(threat, other),
    );
    if (matchingIndex === -1) return false;
    unmatched.splice(matchingIndex, 1);
    return true;
  });
}

function arrayValuesEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function rolledDiceGroupsEqual(
  a: BattleRolledDiceFill["value"],
  b: BattleRolledDiceFill["value"],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (group, index) =>
        group.results.length === b[index]?.results.length &&
        group.results.every(
          (result, resultIndex) => result === b[index]?.results[resultIndex],
        ),
    )
  );
}

function attackDamageRiderSelectionsEqual(
  a: readonly BattleProcedureExecutionRef[] | undefined,
  b: readonly BattleProcedureExecutionRef[] | undefined,
): boolean {
  return (
    (a ?? []).length === (b ?? []).length &&
    (a ?? []).every((procedureRef, index) => procedureRef === (b ?? [])[index])
  );
}

function cunningStrikeOptionSelectionsEqual(
  a: BattleRolledDiceFill["cunningStrikeOption"],
  b: BattleRolledDiceFill["cunningStrikeOption"],
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return a.procedureRef === b.procedureRef && a.optionId === b.optionId;
}

function spellDamageRerollDecisionsEqual(
  a: BattleRolledDiceFill["spellDamageReroll"],
  b: BattleRolledDiceFill["spellDamageReroll"],
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (a.kind !== b.kind || a.effectKind !== b.effectKind) {
    return false;
  }
  return sameMultisetBy(
    a.dice,
    b.dice,
    (left, right) =>
      left.original === right.original &&
      left.replacement === right.replacement,
  );
}
