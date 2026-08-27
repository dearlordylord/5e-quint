import {
  BattleFillSchema,
  BattleProcedureExecutionRef,
  BattleSubjectSchema,
  combatantId,
  type BattleFill,
  type BattleSubject,
  type BattleTargetSpatialFact,
  type CombatantId,
} from "@dnd/battle-runtime";
import { movementFeet } from "@dnd/shared/types";
import {
  StatBlockId,
  type StatBlockId as StatBlockIdType,
} from "@dnd/shared/game-facts";
import { Match, Result, Schema } from "effect";

import {
  mcpObjectJsonSchema,
  mcpObjectJsonSchemaWithCopiedObjects,
  type ToolError,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import {
  decodeStartBattleArgs,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import {
  decodeBattleLifecycleArgs,
  type BattleLifecycleToolInput,
} from "./battle-lifecycle-tool-input.ts";

const EmptyArgsSchema = Schema.Struct({});
const CombatantIdTextSchema = Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
  Schema.annotate({
    description: "Combatant id from the current battle snapshot.",
  }),
);
const SelectStatBlockArgsSchema = Schema.Struct({
  statBlockId: StatBlockId.pipe(
    Schema.annotate({
      description: "SRD Stat Block id from list_stat_blocks.",
    }),
  ),
});
const FillBattleHoleArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  fill: BattleFillSchema,
});
const ResolveBattleActArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  reactionSpellTargetFacts: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        kind: Schema.Literal(
          "featherFallTriggerSelfOrVisibleCreatureWithinRange",
        ),
        reactorId: CombatantIdTextSchema,
        fallingCreatureId: CombatantIdTextSchema,
        sourceProcedureRef: BattleProcedureExecutionRef,
        rangeFeet: Schema.Number.pipe(
          Schema.check(Schema.isInt()),
          Schema.check(Schema.isGreaterThan(0)),
        ),
      }),
    ),
  ).pipe(
    Schema.annotate({
      description:
        "Table-supplied reaction spell facts for runtime commands that open a reaction window, currently creatureFalls for Feather Fall.",
    }),
  ),
});
const EndTurnArgsSchema = Schema.Struct({ actorId: CombatantIdTextSchema });

export const selectStatBlockInputSchema = mcpObjectJsonSchema(
  SelectStatBlockArgsSchema,
);
export const readBattleStateInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
export const discoverBattleActsInputSchema =
  mcpObjectJsonSchema(EmptyArgsSchema);
export const fillBattleHoleInputSchema = mcpObjectJsonSchemaWithCopiedObjects(
  FillBattleHoleArgsSchema,
  {
    subject:
      "Copy the exact subject object returned by discover_battle_acts or the preceding needsHoles result.",
    fill: "Build one fill object from the current returned hole, preserving its kind and holeId. The server validates the complete fill against the canonical battle contract.",
  },
);
export const resolveBattleActInputSchema = mcpObjectJsonSchemaWithCopiedObjects(
  ResolveBattleActArgsSchema,
  {
    subject:
      "Copy the exact subject object returned by discover_battle_acts for an act with no holes.",
  },
);
export const endTurnInputSchema = mcpObjectJsonSchema(EndTurnArgsSchema);
export const endBattleInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);

export const battleToolNames = {
  selectStatBlock: "select_stat_block",
  startBattle: "start_battle",
  battleLifecycle: "battle_lifecycle",
  readBattleState: "read_battle_state",
  discoverBattleActs: "discover_battle_acts",
  fillBattleHole: "fill_battle_hole",
  resolveBattleAct: "resolve_battle_act",
  endTurn: "end_turn",
  endBattle: "end_battle",
} as const;
export const BATTLE_TOOL_NAMES = [
  battleToolNames.selectStatBlock,
  battleToolNames.startBattle,
  battleToolNames.battleLifecycle,
  battleToolNames.readBattleState,
  battleToolNames.discoverBattleActs,
  battleToolNames.fillBattleHole,
  battleToolNames.resolveBattleAct,
  battleToolNames.endTurn,
  battleToolNames.endBattle,
] as const;
export type BattleToolName = (typeof BATTLE_TOOL_NAMES)[number];

type SelectStatBlockToolInput = {
  readonly statBlockId: StatBlockIdType;
};

type BattleActorToolInput = {
  readonly actorId: CombatantId;
};

type FillBattleHoleToolInput = {
  readonly subject: BattleSubject;
  readonly fill: BattleFill;
};

type ResolveBattleActToolInput = {
  readonly subject: BattleSubject;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
};

type EmptyToolInput = Record<string, never>;

export type BattleToolCall =
  | {
      readonly name: typeof battleToolNames.selectStatBlock;
      readonly args: SelectStatBlockToolInput;
    }
  | {
      readonly name: typeof battleToolNames.startBattle;
      readonly args: StartBattleToolInput;
    }
  | {
      readonly name: typeof battleToolNames.battleLifecycle;
      readonly args: BattleLifecycleToolInput;
    }
  | {
      readonly name: typeof battleToolNames.readBattleState;
      readonly args: EmptyToolInput;
    }
  | {
      readonly name: typeof battleToolNames.discoverBattleActs;
      readonly args: EmptyToolInput;
    }
  | {
      readonly name: typeof battleToolNames.fillBattleHole;
      readonly args: FillBattleHoleToolInput;
    }
  | {
      readonly name: typeof battleToolNames.resolveBattleAct;
      readonly args: ResolveBattleActToolInput;
    }
  | {
      readonly name: typeof battleToolNames.endTurn;
      readonly args: BattleActorToolInput;
    }
  | {
      readonly name: typeof battleToolNames.endBattle;
      readonly args: EmptyToolInput;
    };

export function decodeBattleToolCall(input: {
  readonly name: BattleToolName;
  readonly args: unknown;
}): Result.Result<BattleToolCall, ToolError> {
  return Match.value(input.name).pipe(
    Match.when(battleToolNames.selectStatBlock, () =>
      Result.map(decodeSelectStatBlockArgs(input.args), (args) => ({
        name: battleToolNames.selectStatBlock,
        args,
      })),
    ),
    Match.when(battleToolNames.startBattle, () =>
      Result.map(decodeStartBattleArgs(input.args), (args) => ({
        name: battleToolNames.startBattle,
        args,
      })),
    ),
    Match.when(battleToolNames.battleLifecycle, () =>
      Result.map(decodeBattleLifecycleArgs(input.args), (args) => ({
        name: battleToolNames.battleLifecycle,
        args,
      })),
    ),
    Match.when(battleToolNames.readBattleState, () =>
      Result.map(
        decodeEmptyArgs(input.args, battleToolNames.readBattleState),
        (args) => ({
          name: battleToolNames.readBattleState,
          args,
        }),
      ),
    ),
    Match.when(battleToolNames.discoverBattleActs, () =>
      Result.map(
        decodeEmptyArgs(input.args, battleToolNames.discoverBattleActs),
        (args) => ({
          name: battleToolNames.discoverBattleActs,
          args,
        }),
      ),
    ),
    Match.when(battleToolNames.fillBattleHole, () =>
      Result.map(decodeFillBattleHoleArgs(input.args), (args) => ({
        name: battleToolNames.fillBattleHole,
        args,
      })),
    ),
    Match.when(battleToolNames.resolveBattleAct, () =>
      Result.map(decodeResolveBattleActArgs(input.args), (args) => ({
        name: battleToolNames.resolveBattleAct,
        args,
      })),
    ),
    Match.when(battleToolNames.endTurn, () =>
      Result.map(decodeEndTurnArgs(input.args), (args) => ({
        name: battleToolNames.endTurn,
        args,
      })),
    ),
    Match.when(battleToolNames.endBattle, () =>
      Result.map(
        decodeEmptyArgs(input.args, battleToolNames.endBattle),
        (args) => ({
          name: battleToolNames.endBattle,
          args,
        }),
      ),
    ),
    Match.exhaustive,
  );
}

function decodeSelectStatBlockArgs(
  args: unknown,
): Result.Result<SelectStatBlockToolInput, ToolError> {
  const record = decodeBattleToolArgs(
    SelectStatBlockArgsSchema,
    args,
    battleToolNames.selectStatBlock,
  );
  return Result.map(record, (value) => ({
    statBlockId: value.statBlockId,
  }));
}

function decodeFillBattleHoleArgs(
  args: unknown,
): Result.Result<FillBattleHoleToolInput, ToolError> {
  const record = decodeBattleToolArgs(
    FillBattleHoleArgsSchema,
    args,
    battleToolNames.fillBattleHole,
  );
  if (Result.isFailure(record)) return Result.fail(record.failure);

  return Result.succeed(record.success);
}

function decodeResolveBattleActArgs(
  args: unknown,
): Result.Result<ResolveBattleActToolInput, ToolError> {
  const record = decodeBattleToolArgs(
    ResolveBattleActArgsSchema,
    args,
    battleToolNames.resolveBattleAct,
  );
  if (Result.isFailure(record)) return Result.fail(record.failure);
  return Result.succeed({
    subject: record.success.subject,
    reactionSpellTargetFacts: (
      record.success.reactionSpellTargetFacts ?? []
    ).map((fact) => ({
      kind: fact.kind,
      reactorId: combatantId(fact.reactorId),
      fallingCreatureId: combatantId(fact.fallingCreatureId),
      sourceProcedureRef: fact.sourceProcedureRef,
      rangeFeet: movementFeet(fact.rangeFeet),
    })),
  });
}

function decodeEndTurnArgs(
  args: unknown,
): Result.Result<BattleActorToolInput, ToolError> {
  const record = decodeBattleToolArgs(
    EndTurnArgsSchema,
    args,
    battleToolNames.endTurn,
  );
  return Result.map(record, (value) => ({
    actorId: combatantId(value.actorId),
  }));
}

type EmptyBattleToolName =
  | typeof battleToolNames.readBattleState
  | typeof battleToolNames.discoverBattleActs
  | typeof battleToolNames.endBattle;

function decodeEmptyArgs(
  args: unknown,
  toolName: EmptyBattleToolName,
): Result.Result<EmptyToolInput, ToolError> {
  const decoded = decodeBattleToolArgs(EmptyArgsSchema, args, toolName);
  return Result.map(decoded, () => ({}));
}

function decodeBattleToolArgs<A>(
  schema: Schema.Codec<A, unknown, never>,
  args: unknown,
  toolName: string,
): Result.Result<A, ToolError> {
  const decoded = Schema.decodeUnknownResult(Schema.toType(schema), {
    onExcessProperty: "error",
  })(args === undefined ? {} : args);
  return Result.isFailure(decoded)
    ? Result.fail(
        errorContent(`${toolName} expects valid arguments.`, {
          code: "INVALID_ARGUMENTS",
          message: decoded.failure.message,
        }),
      )
    : Result.succeed(decoded.success);
}
