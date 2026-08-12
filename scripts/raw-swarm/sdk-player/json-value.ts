import type { JsonValue } from "./continuation-contract.ts";

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
