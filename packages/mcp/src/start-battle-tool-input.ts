import {
  BattleId as BattleIdSchema,
  characterId,
  combatantId,
  initiativeScore,
  type BattleId,
  type BattleCombatantDistance,
  type CharacterId,
  type CombatantId,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import {
  characterDraftId,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp, type Hp as HpType } from "@dnd/shared/types";
import { Either, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

const IntegerSchema = Schema.Number.pipe(Schema.int());
const NonNegativeIntegerSchema = IntegerSchema.pipe(
  Schema.greaterThanOrEqualTo(0),
);
const StartBattleCharacterArgsSchema = Schema.Struct({
  sourceDraftId: Schema.NonEmptyTrimmedString,
  combatantId: Schema.NonEmptyTrimmedString,
  characterId: Schema.optionalWith(Schema.NonEmptyTrimmedString, {
    exact: true,
  }),
  initiative: IntegerSchema,
});
const StartBattleCombatantDistanceArgsSchema = Schema.Struct({
  combatantA: Schema.NonEmptyTrimmedString,
  combatantB: Schema.NonEmptyTrimmedString,
  feet: NonNegativeIntegerSchema,
});

const StartBattleToolArgsSchema = Schema.Struct({
  battleId: BattleIdSchema,
  characters: Schema.NonEmptyArray(StartBattleCharacterArgsSchema),
  statBlockCombatantId: Schema.NonEmptyTrimmedString,
  statBlockInitiative: IntegerSchema,
  combatantDistances: Schema.optionalWith(
    Schema.Array(StartBattleCombatantDistanceArgsSchema),
    { exact: true },
  ),
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
  readonly combatantDistances?: readonly BattleCombatantDistance[];
  readonly statBlockCurrentHp?: HpType;
  readonly statBlockTempHp?: HpType;
};

export type StartBattleCharacterToolInput = {
  readonly sourceDraftId: CharacterDraftId;
  readonly combatantId: CombatantId;
  readonly characterId?: CharacterId;
  readonly initiative: InitiativeScore;
};

export function decodeStartBattleArgs(
  args: unknown,
): ToolInputResult<StartBattleToolInput> {
  const record = decodeToolArgs(
    StartBattleToolArgsSchema,
    args,
    "start_battle",
  );
  if (Either.isLeft(record)) return Either.left(record.left);

  return Either.right({
    battleId: record.right.battleId,
    characters: decodeCharacters(record.right.characters),
    statBlockCombatantId: combatantId(record.right.statBlockCombatantId),
    statBlockInitiative: initiativeScore(record.right.statBlockInitiative),
    ...(record.right.combatantDistances === undefined
      ? {}
      : {
          combatantDistances: record.right.combatantDistances.map(
            (distance) => ({
              combatantA: combatantId(distance.combatantA),
              combatantB: combatantId(distance.combatantB),
              feet: distance.feet,
            }),
          ),
        }),
    ...(record.right.statBlockCurrentHp === undefined
      ? {}
      : { statBlockCurrentHp: Hp(record.right.statBlockCurrentHp) }),
    ...(record.right.statBlockTempHp === undefined
      ? {}
      : { statBlockTempHp: Hp(record.right.statBlockTempHp) }),
  });
}

function decodeCharacters(
  value: StartBattleToolArgs["characters"],
): StartBattleToolInput["characters"] {
  const decoded = value.map((character) => ({
    sourceDraftId: characterDraftId(character.sourceDraftId),
    combatantId: combatantId(character.combatantId),
    ...(character.characterId === undefined
      ? {}
      : { characterId: characterId(character.characterId) }),
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
          "Non-empty finalized character combatants. sourceDraftId comes from list_characters; combatantId is the battle actor id.",
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
                "Optional legacy field. Battle start uses the durable characterId already stored on the finalized character session.",
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
      combatantDistances: {
        ...objectProperty(properties.combatantDistances),
        description:
          "Optional explicit encounter distances in feet for combatant pairs. Omit only for the runtime's first-vertical default distance model.",
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
