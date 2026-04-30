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
import { Either, JSONSchema, Schema } from "effect";

import type { ToolError } from "./tool-input-helpers.ts";
import { errorContent } from "./tool-content.ts";

type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};

const IntegerSchema = Schema.Number.pipe(Schema.int());
const NonNegativeIntegerSchema = IntegerSchema.pipe(
  Schema.greaterThanOrEqualTo(0),
);

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

const generatedStartBattleInputSchema = JSONSchema.make(
  StartBattleToolArgsSchema,
);

// JSONSchema.make preserves the object shape from StartBattleToolArgsSchema,
// but its library type does not retain the literal top-level `type: "object"`.
export const startBattleInputSchema =
  generatedStartBattleInputSchema as unknown as McpObjectInputSchema;

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
  const decoded = Schema.decodeUnknownEither(StartBattleToolArgsSchema, {
    onExcessProperty: "error",
  })(args);
  if (Either.isLeft(decoded)) {
    return errorContent(`${toolName} expects valid start battle arguments.`, {
      code: "INVALID_ARGUMENTS",
      expected: "StartBattleToolInput",
      message: decoded.left.message,
    });
  }

  const record = decoded.right;

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
