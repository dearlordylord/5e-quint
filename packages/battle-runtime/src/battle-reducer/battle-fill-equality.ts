import type {
  BattleAttackRollResult,
  BattleD20TestRolledD20s,
  BattleFill,
  BattleOpportunityAttackThreat,
  BattleRolledDiceFill,
  BattleSavingThrowOutcome,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef } from "../identity.ts";
import { Match } from "effect";
import { sameMultisetBy } from "../mechanical-equality.ts";
import { opportunityAttackThreatEqual } from "./opportunity-attack-equality.ts";

export const BATTLE_CONTINUATION_COMPARABLE_FILL_KINDS = [
  "targetChoice",
  "attackRoll",
  "rolledDice",
  "attackDamageDisposition",
  "concentrationSavingThrow",
  "savingThrowOutcome",
  "movement",
  "cloudkillMovement",
  "startTurnOccurrenceOrder",
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
        left.value.kind === b.value.kind,
      concentrationSavingThrow: (left) =>
        b.kind === "concentrationSavingThrow" &&
        left.holeId === b.holeId &&
        left.value.succeeded === b.value.succeeded &&
        left.value.naturalD20 === b.value.naturalD20 &&
        rolledD20sEqual(left.value.rolledD20s, b.value.rolledD20s) &&
        left.value.withoutRoll === b.value.withoutRoll &&
        d20TestNaturalOneRerollOutcomeDecisionsEqual(
          left.value.d20TestNaturalOneReroll,
          b.value.d20TestNaturalOneReroll,
        ),
      savingThrowOutcome: (left) =>
        b.kind === "savingThrowOutcome" &&
        left.holeId === b.holeId &&
        savingThrowOutcomeValuesEqual(left.value, b.value),
      movement: (left) =>
        b.kind === "movement" &&
        left.holeId === b.holeId &&
        movementFillValuesEqual(left.value, b.value),
      cloudkillMovement: (left) =>
        b.kind === "cloudkillMovement" &&
        left.holeId === b.holeId &&
        arrayValuesEqual(
          left.value.affectedCombatantIdsInResolutionOrder,
          b.value.affectedCombatantIdsInResolutionOrder,
        ),
      startTurnOccurrenceOrder: (left) =>
        b.kind === "startTurnOccurrenceOrder" &&
        left.holeId === b.holeId &&
        arrayValuesEqual(
          left.value.occurrenceIds,
          b.value.occurrenceIds,
        ),
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
        d20TestNaturalOneRerollDieDecisionsEqual(
          left.d20TestNaturalOneReroll,
          b.d20TestNaturalOneReroll,
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
        left.replacement.naturalD20 === b.replacement.naturalD20 &&
        attackRollResultsEqual(left.replacement.result, b.replacement.result),
    }),
  );
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
  return Match.value(a).pipe(
    Match.discriminatorsExhaustive("kind")({
      decline: (left) =>
        b.kind === "decline" && left.effectKind === b.effectKind,
      reroll: (left) =>
        b.kind === "reroll" &&
        left.effectKind === b.effectKind &&
        left.replacement.succeeded === b.replacement.succeeded &&
        left.replacement.naturalD20 === b.replacement.naturalD20,
      rerollRolledDie: (left) =>
        b.kind === "rerollRolledDie" &&
        left.effectKind === b.effectKind &&
        left.replacement.die === b.replacement.die &&
        left.replacement.naturalD20 === b.replacement.naturalD20 &&
        left.replacement.result.succeeded === b.replacement.result.succeeded &&
        left.replacement.result.naturalD20 === b.replacement.result.naturalD20,
    }),
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
    opportunityAttackThreatListsEqual(
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
