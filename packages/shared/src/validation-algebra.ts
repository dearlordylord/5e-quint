import { Either } from "effect";

import type { ReadonlyNonEmptyArray } from "./types.ts";

type ValidationAccumulator<A, E> = {
  readonly values: ReadonlyArray<A>;
  readonly errors: ReadonlyArray<E>;
};

export function traverseValidation<A, B, E>(
  values: ReadonlyArray<A>,
  validate: (value: A, index: number) => Either.Either<B, E>,
): Either.Either<ReadonlyArray<B>, ReadonlyNonEmptyArray<E>> {
  const accumulated = values.reduce<ValidationAccumulator<B, E>>(
    (accumulator, value, index) => {
      const result = validate(value, index);

      return Either.isLeft(result)
        ? {
            ...accumulator,
            errors: [...accumulator.errors, result.left],
          }
        : {
            ...accumulator,
            values: [...accumulator.values, result.right],
          };
    },
    { values: [], errors: [] },
  );

  return accumulated.errors.length === 0
    ? Either.right(accumulated.values)
    : Either.left(accumulated.errors as ReadonlyNonEmptyArray<E>);
}
