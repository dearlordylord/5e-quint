import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

export function mapReadonlyNonEmptyArray<T, U>(
  values: ReadonlyNonEmptyArray<T>,
  project: (value: T, index: number) => U,
): ReadonlyNonEmptyArray<U> {
  const [first, ...rest] = values;
  return [
    project(first, 0),
    ...rest.map((value, index) => project(value, index + 1)),
  ];
}
