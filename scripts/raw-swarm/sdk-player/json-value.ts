import type { JsonValue } from "./continuation-contract.ts";
import { canonicalJson } from "../transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

export function jsonValue(value: unknown): JsonValue {
  return jsonValueWithAncestors(value, new WeakSet(), false);
}

export function sdkCallInputJsonValue(value: unknown): JsonValue {
  return jsonValueWithAncestors(value, new WeakSet(), true);
}

function jsonValueWithAncestors(
  value: unknown,
  ancestors: WeakSet<object>,
  strictObjectStructure: boolean,
): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object") {
    return fail("SDK evidence contains a non-JSON execution value.");
  }
  if (ancestors.has(value)) {
    return fail("SDK evidence contains a cyclic execution value.");
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    const entries: JsonValue[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, index);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        return fail("SDK evidence contains a sparse array.");
      }
      entries.push(
        jsonValueWithAncestors(
          descriptor.value,
          ancestors,
          strictObjectStructure,
        ),
      );
    }
    if (
      strictObjectStructure &&
      Reflect.ownKeys(value).length !== value.length + 1
    ) {
      return fail("SDK evidence contains a non-JSON array property.");
    }
    ancestors.delete(value);
    return entries;
  }
  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(
        ([key, entry]) =>
          [
            jsonValueWithAncestors(key, ancestors, strictObjectStructure),
            jsonValueWithAncestors(entry, ancestors, strictObjectStructure),
          ] as const,
      )
      .sort(([left], [right]) =>
        canonicalJson(left).localeCompare(canonicalJson(right)),
      );
    ancestors.delete(value);
    return { $map: entries };
  }
  if (value instanceof Set) {
    const result: JsonValue = {
      $set: [...value.values()]
        .map((entry) =>
          jsonValueWithAncestors(entry, ancestors, strictObjectStructure),
        )
        .sort((left, right) =>
          canonicalJson(left).localeCompare(canonicalJson(right)),
        ),
    };
    ancestors.delete(value);
    return result;
  }
  if (!strictObjectStructure) {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(
        ([key, entry]) =>
          [
            key,
            jsonValueWithAncestors(entry, ancestors, strictObjectStructure),
          ] as const,
      );
    ancestors.delete(value);
    return Object.fromEntries(entries);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    return fail("SDK evidence contains a non-JSON object prototype.");
  const entries: [string, JsonValue][] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      return fail("SDK evidence contains a symbol-keyed property.");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      return fail("SDK evidence contains a non-JSON object property.");
    }
    if (descriptor.value !== undefined) {
      entries.push([
        key,
        jsonValueWithAncestors(
          descriptor.value,
          ancestors,
          strictObjectStructure,
        ),
      ]);
    }
  }
  ancestors.delete(value);
  return Object.fromEntries(entries);
}

export function isJsonValue(
  value: unknown,
  ancestors: WeakSet<object> = new WeakSet(),
): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || value === null) return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const arrayKeys = Array.isArray(value) ? Object.keys(value) : [];
  const valid = Array.isArray(value)
    ? Object.getOwnPropertySymbols(value).length === 0 &&
      arrayKeys.length === value.length &&
      arrayKeys.every((key) => {
        const index = Number(key);
        return (
          Number.isInteger(index) &&
          index >= 0 &&
          index < 2 ** 32 - 1 &&
          String(index) === key
        );
      }) &&
      Array.from({ length: value.length }, (_, index) => index).every(
        (index) =>
          Object.prototype.hasOwnProperty.call(value, index) &&
          isJsonValue(value[index], ancestors),
      )
    : (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null) &&
      Object.getOwnPropertySymbols(value).length === 0 &&
      Object.values(value).every((entry) => isJsonValue(entry, ancestors));
  ancestors.delete(value);
  return valid;
}
