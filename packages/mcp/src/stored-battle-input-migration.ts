import { Result, type Schema } from "effect";

function isJsonArray(value: Schema.Json): value is Schema.JsonArray {
  return Array.isArray(value);
}

function migrateValue(value: Schema.Json): Result.Result<Schema.Json, string> {
  if (value === null || typeof value !== "object") return Result.succeed(value);
  if (isJsonArray(value)) {
    const items: Schema.Json[] = [];
    for (const item of value) {
      const migrated = migrateValue(item);
      if (Result.isFailure(migrated)) return migrated;
      items.push(migrated.success);
    }
    return Result.succeed(items);
  }
  return migrateStoredBattleInput(value);
}

export function migrateStoredBattleInput(
  input: Schema.JsonObject,
): Result.Result<Schema.JsonObject, string> {
  const fields: [string, Schema.Json][] = [];
  for (const [key, value] of Object.entries(input)) {
    const migrated = migrateValue(value);
    if (Result.isFailure(migrated)) return Result.fail(migrated.failure);
    fields.push([key, migrated.success]);
  }
  const entries = Object.fromEntries(fields);
  return migrateStoredPointOriginArea(entries);
}

function migrateStoredPointOriginArea(
  entries: Schema.JsonObject,
): Result.Result<Schema.JsonObject, string> {
  if (
    (entries.kind === "pointOriginSphereSaveDamageArea" ||
      entries.kind === "pointOriginSphereObjectDamageArea") &&
    "originAnchorId" in entries
  ) {
    if ("originAnchor" in entries) {
      return Result.fail(
        "Stored point-origin area has conflicting origin forms.",
      );
    }
    const { originAnchorId: combatantId, ...area } = entries;
    if (typeof combatantId !== "string" || combatantId.trim() === "") {
      return Result.fail(
        "Stored point-origin area has an invalid combatant origin.",
      );
    }
    return Result.succeed({
      ...area,
      originAnchor: { kind: "combatant", combatantId },
    });
  }
  return Result.succeed(entries);
}
