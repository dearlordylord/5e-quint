import { Either } from "effect";

import type {
  FilledHoleValue,
  ResolutionInvalid,
  ResolutionResult,
  RuntimeHoleSet,
} from "#/reducer-types.ts";

export type HoleRefillCheck<A> = Either.Either<A, ResolutionInvalid>;
export type HoleRefillAdvance<A> = Either.Either<A, ResolutionResult>;

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

export function validateCurrentHoleInputs(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  expectedHoles: RuntimeHoleSet,
): ResolutionInvalid | null {
  const expectedById = new Map(
    expectedHoles.map((hole) => [hole.holeId, hole]),
  );
  const seen = new Set<string>();

  for (const value of filledHoleValues) {
    const seenKey = String(value.holeId);
    if (seen.has(seenKey)) {
      return invalid(`duplicate filled value for hole ${seenKey}`);
    }
    seen.add(seenKey);

    const expectedHole = expectedById.get(value.holeId);
    if (expectedHole === undefined) {
      return invalid(`unexpected filled value for hole ${seenKey}`);
    }

    if (expectedHole.kind !== value.kind) {
      return invalid(
        `filled value kind ${value.kind} does not match hole ${seenKey}`,
      );
    }
  }

  return null;
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
