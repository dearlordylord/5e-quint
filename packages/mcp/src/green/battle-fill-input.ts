import { combatantId, type BattleFill } from "@dnd/battle-runtime";
import {
  ATTACK_ROLL_MODES,
  holeId,
  type AttackRollMode,
  type AttackRollResult,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { DieRollResult, type ReadonlyNonEmptyArray } from "@dnd/shared/types";

import { errorContent } from "../tool-content.ts";

type GreenToolError = ReturnType<typeof errorContent>;
type RolledDiceFill = Extract<BattleFill, { readonly kind: "rolledDice" }>;
type RolledDiceGroup = RolledDiceFill["value"][number];

export function decodeBattleFill(
  value: unknown,
  toolName: string,
): BattleFill | GreenToolError {
  if (!isRecord(value)) {
    return invalidFieldContent(toolName, "fill", "BattleFill object");
  }

  if (typeof value.kind !== "string") {
    return invalidFieldContent(toolName, "fill.kind", "string");
  }
  if (typeof value.holeId !== "string") {
    return invalidFieldContent(toolName, "fill.holeId", "string");
  }

  if (value.kind === "targetChoice") {
    if (typeof value.value !== "string") {
      return invalidFieldContent(toolName, "fill.value", "combatant id string");
    }
    return {
      kind: "targetChoice",
      holeId: holeId(value.holeId),
      value: combatantId(value.value),
    };
  }

  if (value.kind === "attackRoll") {
    const attackRoll = decodeAttackRollValue(value.value, toolName);
    if (isGreenToolError(attackRoll)) return attackRoll;
    return {
      kind: "attackRoll",
      holeId: holeId(value.holeId),
      value: attackRoll,
    };
  }

  if (value.kind === "rolledDice") {
    const groups = decodeRolledDiceGroups(value.value, toolName);
    if (isGreenToolError(groups)) return groups;
    return {
      kind: "rolledDice",
      holeId: holeId(value.holeId),
      value: groups,
    };
  }

  return invalidFieldContent(
    toolName,
    "fill.kind",
    "targetChoice, attackRoll, or rolledDice",
  );
}

function decodeAttackRollValue(
  value: unknown,
  toolName: string,
): AttackRollResult | GreenToolError {
  if (!isRecord(value)) {
    return invalidFieldContent(toolName, "fill.value", "attack-roll object");
  }
  if (typeof value.total !== "number" || !Number.isInteger(value.total)) {
    return invalidFieldContent(toolName, "fill.value.total", "integer");
  }
  const naturalD20 = decodeDieRollResult(
    value.naturalD20,
    toolName,
    "fill.value.naturalD20",
  );
  if (isGreenToolError(naturalD20)) return naturalD20;
  const rollMode = decodeAttackRollMode(value.rollMode);
  if (rollMode === false) {
    return invalidFieldContent(
      toolName,
      "fill.value.rollMode",
      "normal, advantage, or disadvantage",
    );
  }

  return {
    total: value.total,
    naturalD20,
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

function decodeAttackRollMode(
  value: unknown,
): AttackRollMode | undefined | false {
  return value === undefined
    ? undefined
    : typeof value === "string" && isAttackRollMode(value)
      ? value
      : false;
}

function isAttackRollMode(value: string): value is AttackRollMode {
  return ATTACK_ROLL_MODES.some((mode) => mode === value);
}

function decodeRolledDiceGroups(
  value: unknown,
  toolName: string,
): RolledDiceFill["value"] | GreenToolError {
  if (!Array.isArray(value) || value.length === 0) {
    return invalidFieldContent(
      toolName,
      "fill.value",
      "non-empty rolled dice group array",
    );
  }

  const groups: Array<RolledDiceGroup> = [];
  for (const [groupIndex, group] of value.entries()) {
    const decoded = decodeRolledDiceGroup(group, toolName, groupIndex);
    if (isGreenToolError(decoded)) return decoded;
    groups.push(decoded);
  }

  return isReadonlyNonEmptyArray(groups)
    ? groups
    : invalidFieldContent(
        toolName,
        "fill.value",
        "non-empty rolled dice group array",
      );
}

function decodeRolledDiceGroup(
  value: unknown,
  toolName: string,
  groupIndex: number,
): RolledDiceGroup | GreenToolError {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    return invalidFieldContent(
      toolName,
      `fill.value[${groupIndex}].results`,
      "non-empty die result array",
    );
  }
  if (value.results.length === 0) {
    return invalidFieldContent(
      toolName,
      `fill.value[${groupIndex}].results`,
      "non-empty die result array",
    );
  }

  const results: Array<DieRollResult> = [];
  for (const [resultIndex, result] of value.results.entries()) {
    const decoded = decodeDieRollResult(
      result,
      toolName,
      `fill.value[${groupIndex}].results[${resultIndex}]`,
    );
    if (isGreenToolError(decoded)) return decoded;
    results.push(decoded);
  }

  return isReadonlyNonEmptyArray(results)
    ? { results }
    : invalidFieldContent(
        toolName,
        `fill.value[${groupIndex}].results`,
        "non-empty die result array",
      );
}

function decodeDieRollResult(
  value: unknown,
  toolName: string,
  field: string,
): DieRollResult | GreenToolError {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return invalidFieldContent(toolName, field, "positive integer");
  }

  return DieRollResult(value);
}

function invalidFieldContent(
  toolName: string,
  field: string,
  expected: string,
) {
  return errorContent(`Invalid ${toolName} field: ${field}`, {
    code: "INVALID_FIELD",
    field,
    expected,
  });
}

function isGreenToolError(value: unknown): value is GreenToolError {
  return isRecord(value) && value.isError === true;
}

function isReadonlyNonEmptyArray<T>(
  values: ReadonlyArray<T>,
): values is ReadonlyNonEmptyArray<T> {
  return values.length > 0;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
