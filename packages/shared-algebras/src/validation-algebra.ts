import { Result } from "effect";

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
  validate: (value: A, index: number) => Result.Result<B, E>,
): Result.Result<ReadonlyArray<B>, ReadonlyNonEmptyArray<E>> {
  const accumulated = values.reduce<ValidationAccumulator<B, E>>(
    (accumulator, value, index) => {
      const result = validate(value, index);

      return Result.isFailure(result)
        ? {
            ...accumulator,
            errors: [...accumulator.errors, result.failure],
          }
        : {
            ...accumulator,
            values: [...accumulator.values, result.success],
          };
    },
    { values: [], errors: [] },
  );

  if (isNonEmptyReadonlyArray(accumulated.errors)) {
    return Result.fail(accumulated.errors);
  }

  return Result.succeed(accumulated.values);
}
