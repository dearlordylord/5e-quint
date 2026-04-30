import {
  battleId,
  characterId,
  combatantId,
  initiativeScore,
  type BattleFill,
  type BattleId,
  type CharacterId,
  type CombatantId,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import {
  characterDraftId,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp, type Hp as HpType } from "@dnd/shared/types";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";

import { decodeBattleFill } from "./battle-fill-input.ts";
import { errorContent } from "./tool-content.ts";

type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};
type ToolError = ReturnType<typeof errorContent>;

export const selectStatBlockInputSchema = {
  type: "object",
  required: ["statBlockId"],
  properties: {
    statBlockId: {
      type: "string",
      description: "SRD Stat Block id from the Surface Stat Block catalog.",
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const startBattleInputSchema = {
  type: "object",
  required: [
    "battleId",
    "sheetDraftId",
    "characterCombatantId",
    "characterId",
    "characterDisplayName",
    "characterInitiative",
    "statBlockCombatantId",
    "statBlockInitiative",
  ],
  properties: {
    battleId: { type: "string" },
    sheetDraftId: {
      type: "string",
      description: "Finalized sheet id returned by finalize_character.",
    },
    characterCombatantId: { type: "string" },
    characterId: { type: "string" },
    characterDisplayName: { type: "string" },
    characterInitiative: { type: "integer" },
    statBlockCombatantId: { type: "string" },
    statBlockInitiative: { type: "integer" },
    statBlockCurrentHp: { type: "integer", minimum: 0 },
    statBlockTempHp: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const readBattleStateInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const discoverBattleActsInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const fillBattleHoleInputSchema = {
  type: "object",
  required: ["actorId", "attackName", "fill"],
  properties: {
    actorId: {
      type: "string",
      description: "Current actor combatant id for the Attack action.",
    },
    attackName: {
      type: "string",
      description:
        "Authored attack name from the selected battle act subject, such as Longsword, Scimitar, or Shortbow.",
    },
    fill: {
      type: "object",
      description:
        "One BattleFill for the current Attack replay: targetChoice, attackRoll, or rolledDice. attackRoll values may include rollMode: normal, advantage, or disadvantage.",
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const endTurnInputSchema = {
  type: "object",
  required: ["actorId"],
  properties: {
    actorId: { type: "string" },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const endBattleInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export type StartBattleToolInput = {
  readonly battleId: BattleId;
  readonly sheetDraftId: CharacterDraftId;
  readonly characterCombatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly characterDisplayName: string;
  readonly characterInitiative: InitiativeScore;
  readonly statBlockCombatantId: CombatantId;
  readonly statBlockInitiative: InitiativeScore;
  readonly statBlockCurrentHp?: HpType;
  readonly statBlockTempHp?: HpType;
};

export type BattleActorToolInput = {
  readonly actorId: CombatantId;
};

export type FillBattleHoleToolInput = BattleActorToolInput & {
  readonly attackName: string;
  readonly fill: BattleFill;
};

export function decodeSelectStatBlockArgs(
  args: unknown,
  toolName: string,
): StatBlockId | ToolError {
  const record = readToolArgsRecord(args, toolName, ["statBlockId"]);
  if (isToolError(record)) return record;
  if (typeof record.statBlockId !== "string") {
    return invalidFieldContent(toolName, "statBlockId", "string");
  }
  return record.statBlockId;
}

export function decodeStartBattleArgs(
  args: unknown,
  toolName: string,
): StartBattleToolInput | ToolError {
  const record = readToolArgsRecord(args, toolName, [
    "battleId",
    "sheetDraftId",
    "characterCombatantId",
    "characterId",
    "characterDisplayName",
    "characterInitiative",
    "statBlockCombatantId",
    "statBlockInitiative",
    "statBlockCurrentHp",
    "statBlockTempHp",
  ]);
  if (isToolError(record)) return record;

  const requiredString = decodeRequiredStringFields(record, toolName, [
    "battleId",
    "sheetDraftId",
    "characterCombatantId",
    "characterId",
    "characterDisplayName",
    "statBlockCombatantId",
  ]);
  if (isToolError(requiredString)) return requiredString;

  const characterInitiative = decodeInitiativeField(
    record.characterInitiative,
    toolName,
    "characterInitiative",
  );
  if (isToolError(characterInitiative)) return characterInitiative;
  const statBlockInitiative = decodeInitiativeField(
    record.statBlockInitiative,
    toolName,
    "statBlockInitiative",
  );
  if (isToolError(statBlockInitiative)) return statBlockInitiative;

  const statBlockCurrentHp = decodeOptionalHpField(
    record.statBlockCurrentHp,
    toolName,
    "statBlockCurrentHp",
  );
  if (isToolError(statBlockCurrentHp)) return statBlockCurrentHp;
  const statBlockTempHp = decodeOptionalHpField(
    record.statBlockTempHp,
    toolName,
    "statBlockTempHp",
  );
  if (isToolError(statBlockTempHp)) return statBlockTempHp;

  return {
    battleId: battleId(requiredString.battleId),
    sheetDraftId: characterDraftId(requiredString.sheetDraftId),
    characterCombatantId: combatantId(requiredString.characterCombatantId),
    characterId: characterId(requiredString.characterId),
    characterDisplayName: requiredString.characterDisplayName,
    characterInitiative,
    statBlockCombatantId: combatantId(requiredString.statBlockCombatantId),
    statBlockInitiative,
    ...(statBlockCurrentHp === undefined ? {} : { statBlockCurrentHp }),
    ...(statBlockTempHp === undefined ? {} : { statBlockTempHp }),
  };
}

export function decodeReadBattleStateArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  const record = readToolArgsRecord(args, toolName, []);
  return isToolError(record) ? record : {};
}

export function decodeDiscoverBattleActsArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  const record = readToolArgsRecord(args, toolName, []);
  return isToolError(record) ? record : {};
}

export function decodeFillBattleHoleArgs(
  args: unknown,
  toolName: string,
): FillBattleHoleToolInput | ToolError {
  const record = readToolArgsRecord(args, toolName, [
    "actorId",
    "attackName",
    "fill",
  ]);
  if (isToolError(record)) return record;
  if (typeof record.actorId !== "string") {
    return invalidFieldContent(toolName, "actorId", "string");
  }
  if (
    typeof record.attackName !== "string" ||
    record.attackName.trim() === ""
  ) {
    return invalidFieldContent(toolName, "attackName", "non-empty string");
  }

  const fill = decodeBattleFill(record.fill, toolName);
  if (isToolError(fill)) return fill;

  return {
    actorId: combatantId(record.actorId),
    attackName: record.attackName,
    fill,
  };
}

export function decodeEndTurnArgs(
  args: unknown,
  toolName: string,
): BattleActorToolInput | ToolError {
  const record = readToolArgsRecord(args, toolName, ["actorId"]);
  if (isToolError(record)) return record;
  if (typeof record.actorId !== "string") {
    return invalidFieldContent(toolName, "actorId", "string");
  }

  return { actorId: combatantId(record.actorId) };
}

export function decodeEndBattleArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  const record = readToolArgsRecord(args, toolName, []);
  return isToolError(record) ? record : {};
}

export function isBattleToolError(value: unknown): value is ToolError {
  return isRecord(value) && value.isError === true;
}

function decodeRequiredStringFields<const Fields extends readonly string[]>(
  record: Readonly<Record<string, unknown>>,
  toolName: string,
  fields: Fields,
): Readonly<Record<Fields[number], string>> | ToolError {
  const decoded: Record<string, string> = {};
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "string") {
      return invalidFieldContent(toolName, field, "string");
    }
    decoded[field] = value;
  }

  // The loop above writes every requested literal field after proving each
  // value is a string; TypeScript cannot express that from dynamic keys.
  return decoded as Readonly<Record<Fields[number], string>>;
}

function decodeInitiativeField(
  value: unknown,
  toolName: string,
  field: string,
): InitiativeScore | ToolError {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return invalidFieldContent(toolName, field, "integer Initiative score");
  }
  return initiativeScore(value);
}

function decodeOptionalHpField(
  value: unknown,
  toolName: string,
  field: string,
): HpType | undefined | ToolError {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return invalidFieldContent(toolName, field, "non-negative integer HP");
  }
  return Hp(value);
}

function readToolArgsRecord(
  args: unknown,
  toolName: string,
  allowedFields: readonly string[],
): Readonly<Record<string, unknown>> | ToolError {
  if (!isRecord(args)) {
    return errorContent(`${toolName} expects object arguments.`, {
      code: "INVALID_ARGUMENTS",
      expected: "object",
    });
  }

  for (const key of Object.keys(args)) {
    if (!allowedFields.includes(key)) {
      return errorContent(`Unexpected ${toolName} field: ${key}`, {
        code: "UNEXPECTED_FIELD",
        field: key,
      });
    }
  }

  return args;
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

function isToolError(value: unknown): value is ToolError {
  return isRecord(value) && value.isError === true;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
