import { Either } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

type ValidationAccumulator<A, E> = {
  readonly values: ReadonlyArray<A>;
  readonly errors: ReadonlyArray<E>;
};

function isNonEmptyReadonlyArray<T>(
  values: ReadonlyArray<T>,
): values is ReadonlyNonEmptyArray<T> {
  return values.length > 0;
}

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

  if (isNonEmptyReadonlyArray(accumulated.errors)) {
    return Either.left(accumulated.errors);
  }

  return Either.right(accumulated.values);
}
