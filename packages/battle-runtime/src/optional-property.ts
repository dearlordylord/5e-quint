/**
 * Preserves exact-optional-property semantics while constructing an object.
 *
 * Callers use this instead of repeating conditional object-spread branches.
 * The value is omitted when absent; it is never stored as `undefined`.
 */
type OptionalPropertyResult<Key extends PropertyKey, Value> = [Value] extends [
  undefined,
]
  ? {}
  : undefined extends Value
    ? { readonly [Property in Key]?: Exclude<Value, undefined> }
    : { readonly [Property in Key]: Value };

export function optionalProperty<const Key extends PropertyKey, Value>(
  key: Key,
  value: Value,
): OptionalPropertyResult<Key, Value> {
  return value === undefined
    ? // Cast justification: this branch establishes the conditional result's
      // undefined case, but TypeScript does not narrow an unconstrained generic
      // parameter from a value comparison.
      ({} as OptionalPropertyResult<Key, Value>)
    : // Cast justification: TypeScript widens a generic computed property to
      // `{ [x: string]: Value }`; the immediately preceding branch proves the
      // value is defined and this literal contains exactly the supplied key.
      ({ [key]: value } as OptionalPropertyResult<Key, Value>);
}

/** Canonicalizes an empty array to omission and retains a present non-empty array. */
export function nonEmptyArrayProperty<const Key extends PropertyKey>(
  key: Key,
  value: readonly [],
): {};
export function nonEmptyArrayProperty<
  const Key extends PropertyKey,
  const Element,
>(
  key: Key,
  value: readonly [Element, ...Element[]],
): { readonly [Property in Key]: readonly [Element, ...Element[]] };
export function nonEmptyArrayProperty<const Key extends PropertyKey, Element>(
  key: Key,
  value: readonly Element[],
): {
  readonly [Property in Key]?: readonly [Element, ...Element[]];
};
export function nonEmptyArrayProperty<const Key extends PropertyKey, Element>(
  key: Key,
  value: readonly Element[],
): {} | { readonly [Property in Key]: readonly [Element, ...Element[]] } {
  return value.length === 0
    ? {}
    : // Cast justification: the length guard narrows the runtime array to the
      // non-empty tuple represented here, while a generic computed key is
      // otherwise widened by TypeScript.
      ({ [key]: value } as {
        readonly [Property in Key]: readonly [Element, ...Element[]];
      });
}
