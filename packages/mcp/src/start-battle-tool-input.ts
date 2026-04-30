import {
  battleId,
  characterId,
  combatantId,
  initiativeScore,
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

import {
  invalidFieldContent,
  isRecord,
  isToolError,
  readToolArgsRecord,
  type ToolError,
} from "./tool-input-helpers.ts";

type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};

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
    additionalCharacters: {
      type: "array",
      description:
        "Additional finalized character sheets to add to the battle. Each entry has sheetDraftId, characterCombatantId, characterId, characterDisplayName, and characterInitiative.",
    },
  },
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
  readonly additionalCharacters: readonly StartBattleCharacterToolInput[];
};

export type StartBattleCharacterToolInput = {
  readonly sheetDraftId: CharacterDraftId;
  readonly characterCombatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly characterDisplayName: string;
  readonly characterInitiative: InitiativeScore;
};

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
    "additionalCharacters",
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
  const additionalCharacters = decodeAdditionalCharacters(
    record.additionalCharacters,
    toolName,
  );
  if (isToolError(additionalCharacters)) return additionalCharacters;

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
    additionalCharacters,
  };
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

  // The loop writes every requested literal field after proving each field's
  // value is a string; TypeScript cannot infer that from dynamic keys.
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

function decodeAdditionalCharacters(
  value: unknown,
  toolName: string,
): readonly StartBattleCharacterToolInput[] | ToolError {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    return invalidFieldContent(
      toolName,
      "additionalCharacters",
      "array of character battle inputs",
    );
  }

  const decoded: StartBattleCharacterToolInput[] = [];
  for (const [index, item] of value.entries()) {
    const character = decodeAdditionalCharacter(item, toolName, index);
    if (isToolError(character)) return character;
    decoded.push(character);
  }
  return decoded;
}

function decodeAdditionalCharacter(
  value: unknown,
  toolName: string,
  index: number,
): StartBattleCharacterToolInput | ToolError {
  const field = `additionalCharacters[${index}]`;
  if (!isRecord(value)) {
    return invalidFieldContent(toolName, field, "character battle input");
  }
  const requiredString = decodeRequiredStringFields(value, toolName, [
    "sheetDraftId",
    "characterCombatantId",
    "characterId",
    "characterDisplayName",
  ]);
  if (isToolError(requiredString)) return requiredString;
  const initiative = decodeInitiativeField(
    value.characterInitiative,
    toolName,
    `${field}.characterInitiative`,
  );
  if (isToolError(initiative)) return initiative;

  return {
    sheetDraftId: characterDraftId(requiredString.sheetDraftId),
    characterCombatantId: combatantId(requiredString.characterCombatantId),
    characterId: characterId(requiredString.characterId),
    characterDisplayName: requiredString.characterDisplayName,
    characterInitiative: initiative,
  };
}
