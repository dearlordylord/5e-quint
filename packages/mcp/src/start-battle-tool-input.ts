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
import { Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
  type ToolError,
} from "./schema-codec.ts";
import { isToolError } from "./tool-input-helpers.ts";

const IntegerSchema = Schema.Number.pipe(Schema.int());
const NonNegativeIntegerSchema = IntegerSchema.pipe(
  Schema.greaterThanOrEqualTo(0),
);
export const StartBattleOutputSchema = Schema.Struct({
  battleState: Schema.Any,
  snapshot: Schema.Any,
  session: Schema.Any,
});

const StartBattleCharacterArgsSchema = Schema.Struct({
  sourceDraftId: Schema.NonEmptyTrimmedString,
  combatantId: Schema.NonEmptyTrimmedString,
  characterId: Schema.NonEmptyTrimmedString,
  initiative: IntegerSchema,
});

const StartBattleToolArgsSchema = Schema.Struct({
  battleId: Schema.NonEmptyTrimmedString,
  characters: Schema.NonEmptyArray(StartBattleCharacterArgsSchema),
  statBlockCombatantId: Schema.NonEmptyTrimmedString,
  statBlockInitiative: IntegerSchema,
  statBlockCurrentHp: Schema.optionalWith(NonNegativeIntegerSchema, {
    exact: true,
  }),
  statBlockTempHp: Schema.optionalWith(NonNegativeIntegerSchema, {
    exact: true,
  }),
});

type StartBattleToolArgs = Schema.Schema.Type<typeof StartBattleToolArgsSchema>;

export const startBattleInputSchema = describeStartBattleInputSchema(
  mcpObjectJsonSchema(StartBattleToolArgsSchema),
);

export type StartBattleToolInput = {
  readonly battleId: BattleId;
  readonly characters: readonly [
    StartBattleCharacterToolInput,
    ...StartBattleCharacterToolInput[],
  ];
  readonly statBlockCombatantId: CombatantId;
  readonly statBlockInitiative: InitiativeScore;
  readonly statBlockCurrentHp?: HpType;
  readonly statBlockTempHp?: HpType;
};

export type StartBattleCharacterToolInput = {
  readonly sourceDraftId: CharacterDraftId;
  readonly combatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly initiative: InitiativeScore;
};

export function decodeStartBattleArgs(
  args: unknown,
  toolName: string,
): StartBattleToolInput | ToolError {
  const record = decodeToolArgs(StartBattleToolArgsSchema, args, toolName);
  if (isToolError(record)) return record;

  return {
    battleId: battleId(record.battleId),
    characters: decodeCharacters(record.characters),
    statBlockCombatantId: combatantId(record.statBlockCombatantId),
    statBlockInitiative: initiativeScore(record.statBlockInitiative),
    ...(record.statBlockCurrentHp === undefined
      ? {}
      : { statBlockCurrentHp: Hp(record.statBlockCurrentHp) }),
    ...(record.statBlockTempHp === undefined
      ? {}
      : { statBlockTempHp: Hp(record.statBlockTempHp) }),
  };
}

function decodeCharacters(
  value: StartBattleToolArgs["characters"],
): StartBattleToolInput["characters"] {
  const decoded = value.map((character) => ({
    sourceDraftId: characterDraftId(character.sourceDraftId),
    combatantId: combatantId(character.combatantId),
    characterId: characterId(character.characterId),
    initiative: initiativeScore(character.initiative),
  }));
  const [first, ...rest] = decoded;
  if (first === undefined) {
    throw new Error("Start battle character codec returned an empty array.");
  }
  return [first, ...rest];
}

function describeStartBattleInputSchema(
  schema: McpObjectInputSchema,
): McpObjectInputSchema {
  const properties = (schema.properties ?? {}) as Record<string, unknown>;
  const characters = properties.characters as
    | { readonly items?: { readonly properties?: Record<string, unknown> } }
    | undefined;
  return {
    ...schema,
    description:
      "Start battle after finalize_character and select_stat_block. Provide one or more finalized character sessions plus caller-supplied Initiative for every combatant.",
    properties: {
      ...properties,
      battleId: {
        ...objectProperty(properties.battleId),
        description: "Caller-chosen durable battle id.",
      },
      characters: {
        ...objectProperty(properties.characters),
        description:
          "Non-empty finalized character combatants. sourceDraftId comes from list_characters; combatantId is the battle actor id; characterId is the durable identity used for post-battle handoff.",
        items: {
          ...(characters?.items ?? {}),
          properties: {
            ...(characters?.items?.properties ?? {}),
            sourceDraftId: {
              ...objectProperty(characters?.items?.properties?.sourceDraftId),
              description:
                "sourceDraftId for an available finalized character from list_characters.",
            },
            combatantId: {
              ...objectProperty(characters?.items?.properties?.combatantId),
              description:
                "Caller-chosen battle actor id used in turn order, targets, and battle subjects.",
            },
            characterId: {
              ...objectProperty(characters?.items?.properties?.characterId),
              description:
                "Caller-chosen durable character identity stored in battle and used for post-battle handoff.",
            },
            initiative: {
              ...objectProperty(characters?.items?.properties?.initiative),
              description: "Caller-supplied Initiative score.",
            },
          },
        },
      },
      statBlockCombatantId: {
        ...objectProperty(properties.statBlockCombatantId),
        description:
          "Caller-chosen battle actor id for the selected Stat Block.",
      },
      statBlockInitiative: {
        ...objectProperty(properties.statBlockInitiative),
        description: "Caller-supplied Initiative score for the Stat Block.",
      },
      statBlockCurrentHp: {
        ...objectProperty(properties.statBlockCurrentHp),
        description:
          "Optional non-negative current HP override for the selected Stat Block.",
      },
      statBlockTempHp: {
        ...objectProperty(properties.statBlockTempHp),
        description:
          "Optional non-negative temporary HP for the selected Stat Block.",
      },
    },
  };
}

function objectProperty(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
