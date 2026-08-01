import type {
  BattleAttackRollResult,
  BattleD20TestRolledD20s,
  BattleFill,
  BattleOpportunityAttackThreat,
  BattleRolledDiceFill,
  BattleSavingThrowOutcome,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef } from "../identity.ts";
import { sameMultisetBy } from "../mechanical-equality.ts";
import { interruptAttackExecutionSelectionsEqual } from "./movement-speed.ts";

export type BattleContinuationComparableFill = Extract<
  BattleFill,
  {
    readonly kind:
      | "targetChoice"
      | "attackRoll"
      | "rolledDice"
      | "attackDamageDisposition"
      | "concentrationSavingThrow"
      | "savingThrowOutcome"
      | "movement"
      | "toolPossessionFacts"
      | "cunningStrikeEndTurnCoverFacts"
      | "deathSavingThrow";
  }
>;

type SameKindBattleContinuationFillPair = {
  [Kind in BattleContinuationComparableFill["kind"]]: {
    readonly kind: Kind;
    readonly left: Extract<
      BattleContinuationComparableFill,
      { readonly kind: Kind }
    >;
    readonly right: Extract<
      BattleContinuationComparableFill,
      { readonly kind: Kind }
    >;
  };
}[BattleContinuationComparableFill["kind"]];

function sameKindBattleContinuationFillPair(
  a: BattleContinuationComparableFill,
  b: BattleContinuationComparableFill,
): SameKindBattleContinuationFillPair | null {
  if (a.kind !== b.kind) {
    return null;
  }
  // The runtime comparison proves both members share one discriminant; TypeScript cannot preserve that correlation when the values arrive as separate unions.
  return {
    kind: a.kind,
    left: a,
    right: b,
  } as SameKindBattleContinuationFillPair;
}

export function battleContinuationFillEquals(
  a: BattleContinuationComparableFill,
  b: BattleContinuationComparableFill,
): boolean {
  const pair = sameKindBattleContinuationFillPair(a, b);
  if (pair === null || a.holeId !== b.holeId) {
    return false;
  }
  if (pair.kind === "targetChoice") {
    return pair.left.value === pair.right.value;
  }
  if (pair.kind === "attackRoll") {
    return attackRollResultsEqual(pair.left.value, pair.right.value);
  }
  if (pair.kind === "rolledDice") {
    return (
      rolledDiceGroupsEqual(pair.left.value, pair.right.value) &&
      attackDamageRiderSelectionsEqual(
        pair.left.selectedAttackDamageRiderProcedureRefs,
        pair.right.selectedAttackDamageRiderProcedureRefs,
      ) &&
      cunningStrikeOptionSelectionsEqual(
        pair.left.cunningStrikeOption,
        pair.right.cunningStrikeOption,
      ) &&
      spellDamageRerollDecisionsEqual(
        pair.left.spellDamageReroll,
        pair.right.spellDamageReroll,
      )
    );
  }
  if (pair.kind === "attackDamageDisposition") {
    return pair.left.value.kind === pair.right.value.kind;
  }
  if (pair.kind === "concentrationSavingThrow") {
    return (
      pair.left.value.succeeded === pair.right.value.succeeded &&
      pair.left.value.naturalD20 === pair.right.value.naturalD20 &&
      rolledD20sEqual(
        pair.left.value.rolledD20s,
        pair.right.value.rolledD20s,
      ) &&
      pair.left.value.withoutRoll === pair.right.value.withoutRoll &&
      d20TestNaturalOneRerollOutcomeDecisionsEqual(
        pair.left.value.d20TestNaturalOneReroll,
        pair.right.value.d20TestNaturalOneReroll,
      )
    );
  }
  if (pair.kind === "savingThrowOutcome") {
    return savingThrowOutcomeValuesEqual(pair.left.value, pair.right.value);
  }
  if (pair.kind === "movement") {
    return movementFillValuesEqual(pair.left.value, pair.right.value);
  }
  if (pair.kind === "toolPossessionFacts") {
    return arrayValuesEqual(
      pair.left.value.toolIdsOnPerson,
      pair.right.value.toolIdsOnPerson,
    );
  }
  if (pair.kind === "cunningStrikeEndTurnCoverFacts") {
    return pair.left.value.cover === pair.right.value.cover;
  }
  if (pair.kind === "deathSavingThrow") {
    return (
      pair.left.value === pair.right.value &&
      d20TestNaturalOneRerollDieDecisionsEqual(
        pair.left.d20TestNaturalOneReroll,
        pair.right.d20TestNaturalOneReroll,
      )
    );
  }
  /* v8 ignore start -- BattleContinuationComparableFill is exhausted above, so this emitted tail is unreachable unless the type widens without a comparator branch, which fails compilation. */
  const exhaustive: never = pair;
  return exhaustive;
  /* v8 ignore stop */
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

type ComparableAttackRollResult = Pick<
  BattleAttackRollResult,
  "total" | "naturalD20" | "rollMode" | "rolledD20s"
> &
  Partial<
    Pick<
      BattleAttackRollResult,
      | "activatedOngoingFeatureProcedureRef"
      | "missToHitReplacementProcedureRef"
      | "spellAttackReroll"
      | "d20TestNaturalOneReroll"
    >
  >;

function attackRollResultsEqual(
  a: ComparableAttackRollResult,
  b: ComparableAttackRollResult,
): boolean {
  return (
    a.total === b.total &&
    a.naturalD20 === b.naturalD20 &&
    a.rollMode === b.rollMode &&
    rolledD20sEqual(a.rolledD20s, b.rolledD20s) &&
    a.activatedOngoingFeatureProcedureRef ===
      b.activatedOngoingFeatureProcedureRef &&
    a.missToHitReplacementProcedureRef === b.missToHitReplacementProcedureRef &&
    spellAttackRerollDecisionsEqual(a.spellAttackReroll, b.spellAttackReroll) &&
    d20TestNaturalOneRerollDecisionsEqual(
      a.d20TestNaturalOneReroll,
      b.d20TestNaturalOneReroll,
    )
  );
}

function spellAttackRerollDecisionsEqual(
  a: BattleAttackRollResult["spellAttackReroll"],
  b: BattleAttackRollResult["spellAttackReroll"],
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (a.kind !== b.kind || a.effectKind !== b.effectKind) {
    return false;
  }
  if (a.kind === "decline" || b.kind === "decline") {
    return a.kind === b.kind;
  }
  return attackRollResultsEqual(a.replacement, b.replacement);
}

function d20TestNaturalOneRerollDecisionsEqual(
  a: BattleAttackRollResult["d20TestNaturalOneReroll"],
  b: BattleAttackRollResult["d20TestNaturalOneReroll"],
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (a.kind !== b.kind || a.effectKind !== b.effectKind) {
    return false;
  }
  if (a.kind === "decline" || b.kind === "decline") {
    return a.kind === b.kind;
  }
  if (a.kind === "rerollRolledDie" || b.kind === "rerollRolledDie") {
    return (
      a.kind === "rerollRolledDie" &&
      b.kind === "rerollRolledDie" &&
      a.replacement.die === b.replacement.die &&
      a.replacement.naturalD20 === b.replacement.naturalD20 &&
      attackRollResultsEqual(a.replacement.result, b.replacement.result)
    );
  }
  return attackRollResultsEqual(a.replacement, b.replacement);
}

function d20TestNaturalOneRerollOutcomeDecisionsEqual(
  a: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >["value"]["d20TestNaturalOneReroll"],
  b: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >["value"]["d20TestNaturalOneReroll"],
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (a.kind !== b.kind || a.effectKind !== b.effectKind) {
    return false;
  }
  if (a.kind === "decline" || b.kind === "decline") {
    return a.kind === b.kind;
  }
  if (a.kind === "rerollRolledDie" || b.kind === "rerollRolledDie") {
    return (
      a.kind === "rerollRolledDie" &&
      b.kind === "rerollRolledDie" &&
      a.replacement.die === b.replacement.die &&
      a.replacement.naturalD20 === b.replacement.naturalD20 &&
      a.replacement.result.succeeded === b.replacement.result.succeeded &&
      a.replacement.result.naturalD20 === b.replacement.result.naturalD20
    );
  }
  return (
    a.replacement.succeeded === b.replacement.succeeded &&
    a.replacement.naturalD20 === b.replacement.naturalD20
  );
}

function d20TestNaturalOneRerollDieDecisionsEqual(
  a: Extract<
    BattleFill,
    { readonly kind: "deathSavingThrow" }
  >["d20TestNaturalOneReroll"],
  b: Extract<
    BattleFill,
    { readonly kind: "deathSavingThrow" }
  >["d20TestNaturalOneReroll"],
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (a.kind !== b.kind || a.effectKind !== b.effectKind) {
    return false;
  }
  return a.kind === "decline" || b.kind === "decline"
    ? a.kind === b.kind
    : a.replacement === b.replacement;
}

function rolledD20sEqual(
  a: BattleD20TestRolledD20s | undefined,
  b: BattleD20TestRolledD20s | undefined,
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return (
    a.first === b.first && a.second === b.second && a.selected === b.selected
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
    a.naturalD20 === b.naturalD20 &&
    a.withoutRoll === b.withoutRoll &&
    rolledD20sEqual(a.rolledD20s, b.rolledD20s) &&
    d20TestNaturalOneRerollOutcomeDecisionsEqual(
      a.d20TestNaturalOneReroll,
      b.d20TestNaturalOneReroll,
    )
  );
}

function movementFillValuesEqual(
  a: Extract<BattleFill, { readonly kind: "movement" }>["value"],
  b: Extract<BattleFill, { readonly kind: "movement" }>["value"],
): boolean {
  return (
    a.speedKind === b.speedKind &&
    a.movementCostFeet === b.movementCostFeet &&
    acrobaticMovementFactsEqual(a.acrobaticMovement, b.acrobaticMovement) &&
    opportunityAttackThreatsEqual(
      a.provokedOpportunityAttacks,
      b.provokedOpportunityAttacks,
    )
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

function opportunityAttackThreatsEqual(
  a: readonly BattleOpportunityAttackThreat[],
  b: readonly BattleOpportunityAttackThreat[],
): boolean {
  if (a.length !== b.length) return false;
  const unmatched = [...b];
  return a.every((threat) => {
    const matchingIndex = unmatched.findIndex(
      (other) =>
        threat.reactorId === other.reactorId &&
        interruptAttackExecutionSelectionsEqual(threat, other),
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
