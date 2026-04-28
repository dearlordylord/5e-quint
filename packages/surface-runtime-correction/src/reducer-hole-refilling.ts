import { Either } from "effect";
import { traverseValidation } from "@dnd/shared/validation-algebra";

import type {
  FilledHoleValue,
  ResolutionInvalid,
  RuntimeHole,
  ResolutionResult,
  RuntimeHoleSet,
} from "#/reducer-types.ts";

export type HoleRefillCheck<A> = Either.Either<A, ResolutionInvalid>;
export type HoleRefillAdvance<A> = Either.Either<A, ResolutionResult>;

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => structurallyEqual(item, right[index]))
    );
  }

  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.hasOwn(rightRecord, key) &&
        structurallyEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function validateFilledHolePayload(
  value: FilledHoleValue,
  expectedHole: RuntimeHole,
): ResolutionInvalid | null {
  if (
    value.kind === "surfaceAttachment" &&
    expectedHole.kind === "surfaceAttachment"
  ) {
    return structurallyEqual(value.value, expectedHole.attachment)
      ? null
      : invalid(`filled attachment does not match hole ${value.holeId}`);
  }

  if (
    value.kind === "surfaceDamageTypeRef" &&
    expectedHole.kind === "surfaceDamageTypeRef"
  ) {
    return structurallyEqual(value.value, expectedHole.damageTypeRef)
      ? null
      : invalid(`filled damage type does not match hole ${value.holeId}`);
  }

  return null;
}

function validationIssuesToInvalid(
  issues: ReadonlyArray<ResolutionInvalid>,
): ResolutionInvalid {
  return invalid(issues.map((issue) => issue.reason).join("; "));
}

export function validateCurrentHoleInputs(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  expectedHoles: RuntimeHoleSet,
): ResolutionInvalid | null {
  const expectedById = new Map(
    expectedHoles.map((hole) => [hole.holeId, hole]),
  );
  const firstSeenIndexes = filledHoleValues.reduce<ReadonlyMap<string, number>>(
    (indexes, value, index) => {
      const seenKey = String(value.holeId);
      return indexes.has(seenKey)
        ? indexes
        : new Map(indexes).set(seenKey, index);
    },
    new Map(),
  );

  const validation = traverseValidation(filledHoleValues, (value, index) => {
    const seenKey = String(value.holeId);
    const issues = [
      ...(firstSeenIndexes.get(seenKey) === index
        ? []
        : [invalid(`duplicate filled value for hole ${seenKey}`)]),
    ];

    const expectedHole = expectedById.get(value.holeId);
    if (expectedHole === undefined) {
      return Either.left(
        validationIssuesToInvalid([
          ...issues,
          invalid(`unexpected filled value for hole ${seenKey}`),
        ]),
      );
    }

    const kindIssue =
      expectedHole.kind === value.kind
        ? null
        : invalid(
            `filled value kind ${value.kind} does not match hole ${seenKey}`,
          );
    const payloadIssue =
      kindIssue === null
        ? validateFilledHolePayload(value, expectedHole)
        : null;
    const allIssues = [
      ...issues,
      ...(kindIssue === null ? [] : [kindIssue]),
      ...(payloadIssue === null ? [] : [payloadIssue]),
    ];

    return allIssues.length === 0
      ? Either.right(undefined)
      : Either.left(validationIssuesToInvalid(allIssues));
  });

  return Either.isRight(validation)
    ? null
    : validationIssuesToInvalid(validation.left);
}

export function requireValidHoleInputs(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): HoleRefillCheck<RuntimeHoleSet> {
  const validation = validateCurrentHoleInputs(filledHoleValues, holes);
  return validation === null ? Either.right(holes) : Either.left(validation);
}

export function missingHoles(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): RuntimeHoleSet {
  const filledHoleIds = new Set(filledHoleValues.map((value) => value.holeId));

  return holes.filter((hole) => !filledHoleIds.has(hole.holeId));
}

export function requireNoMissingHoles(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): HoleRefillAdvance<RuntimeHoleSet> {
  const holesToAsk = missingHoles(filledHoleValues, holes);
  return holesToAsk.length === 0
    ? Either.right(holes)
    : Either.left({ tag: "needsHoles", holes: holesToAsk });
}

export function requireCompleteOrNeedsHoles(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): HoleRefillAdvance<RuntimeHoleSet> {
  const validation = validateCurrentHoleInputs(filledHoleValues, holes);
  if (validation !== null) {
    return Either.left(validation);
  }

  return requireNoMissingHoles(filledHoleValues, holes);
}

export function requirePresentOrNeedsHoles(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): HoleRefillAdvance<RuntimeHoleSet> {
  const holesToAsk = missingHoles(filledHoleValues, holes);
  if (holesToAsk.length === 0) {
    return Either.right(holes);
  }

  const validation = validateCurrentHoleInputs(filledHoleValues, holes);
  if (validation !== null) {
    return Either.left(validation);
  }

  return Either.left({ tag: "needsHoles", holes: holesToAsk });
}
