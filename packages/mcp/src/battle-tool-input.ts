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
import { Either, Match, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";
import {
  decodeStartBattleArgs,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import {
  decodeApplyBattleLifecycleOperationArgs,
  type ApplyBattleLifecycleOperationToolInput,
} from "./battle-lifecycle-tool-input.ts";
import { errorContent } from "./tool-content.ts";

const EmptyArgsSchema = Schema.Struct({});
const CombatantIdTextSchema = Schema.NonEmptyTrimmedString.annotations({
  description: "Combatant id from the current battle snapshot.",
});
const SelectStatBlockArgsSchema = Schema.Struct({
  statBlockId: StatBlockId.annotations({
    description: "SRD Stat Block id from list_stat_blocks.",
  }),
});
const BattleSubjectJsonSchema = Schema.String.pipe(
  Schema.minLength(2),
).annotations({
  description:
    "JSON.stringify(subject) for the exact subject returned by discover_battle_acts.",
});
const BattleFillJsonSchema = Schema.String.pipe(
  Schema.minLength(2),
).annotations({
  description:
    "JSON.stringify(fill) for one BattleFill matching the next returned hole.",
});
const FillBattleHoleArgsSchema = Schema.Struct({
  subjectJson: BattleSubjectJsonSchema,
  fillJson: BattleFillJsonSchema,
});
const ResolveBattleActArgsSchema = Schema.Struct({
  subjectJson: BattleSubjectJsonSchema,
  reactionSpellTargetFacts: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        kind: Schema.Literal(
          "featherFallTriggerSelfOrVisibleCreatureWithinRange",
        ),
        reactorId: CombatantIdTextSchema,
        fallingCreatureId: CombatantIdTextSchema,
        sourceProcedureRef: BattleProcedureExecutionRef,
        rangeFeet: Schema.Number.pipe(Schema.int(), Schema.positive()),
      }),
    ),
    { exact: true },
  ).annotations({
    description:
      "Table-supplied reaction spell facts for runtime commands that open a reaction window, currently creatureFalls for Feather Fall.",
  }),
});
const EndTurnArgsSchema = Schema.Struct({ actorId: CombatantIdTextSchema });

export const selectStatBlockInputSchema = mcpObjectJsonSchema(
  SelectStatBlockArgsSchema,
);
export const readBattleStateInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
export const discoverBattleActsInputSchema =
  mcpObjectJsonSchema(EmptyArgsSchema);
export const fillBattleHoleInputSchema = mcpObjectJsonSchema(
  FillBattleHoleArgsSchema,
);
export const resolveBattleActInputSchema = mcpObjectJsonSchema(
  ResolveBattleActArgsSchema,
);
export const endTurnInputSchema = mcpObjectJsonSchema(EndTurnArgsSchema);
export const endBattleInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);

export const battleToolNames = {
  selectStatBlock: "select_stat_block",
  startBattle: "start_battle",
  applyBattleLifecycleOperation: "apply_battle_lifecycle_operation",
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
  battleToolNames.applyBattleLifecycleOperation,
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
      readonly name: typeof battleToolNames.applyBattleLifecycleOperation;
      readonly args: ApplyBattleLifecycleOperationToolInput;
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
}): ToolInputResult<BattleToolCall> {
  return Match.value(input.name).pipe(
    Match.when(battleToolNames.selectStatBlock, () =>
      Either.map(decodeSelectStatBlockArgs(input.args), (args) => ({
        name: battleToolNames.selectStatBlock,
        args,
      })),
    ),
    Match.when(battleToolNames.startBattle, () =>
      Either.map(decodeStartBattleArgs(input.args), (args) => ({
        name: battleToolNames.startBattle,
        args,
      })),
    ),
    Match.when(battleToolNames.applyBattleLifecycleOperation, () =>
      Either.map(
        decodeApplyBattleLifecycleOperationArgs(input.args),
        (args) => ({
          name: battleToolNames.applyBattleLifecycleOperation,
          args,
        }),
      ),
    ),
    Match.when(battleToolNames.readBattleState, () =>
      Either.map(
        decodeEmptyArgs(input.args, battleToolNames.readBattleState),
        (args) => ({
          name: battleToolNames.readBattleState,
          args,
        }),
      ),
    ),
    Match.when(battleToolNames.discoverBattleActs, () =>
      Either.map(
        decodeEmptyArgs(input.args, battleToolNames.discoverBattleActs),
        (args) => ({
          name: battleToolNames.discoverBattleActs,
          args,
        }),
      ),
    ),
    Match.when(battleToolNames.fillBattleHole, () =>
      Either.map(decodeFillBattleHoleArgs(input.args), (args) => ({
        name: battleToolNames.fillBattleHole,
        args,
      })),
    ),
    Match.when(battleToolNames.resolveBattleAct, () =>
      Either.map(decodeResolveBattleActArgs(input.args), (args) => ({
        name: battleToolNames.resolveBattleAct,
        args,
      })),
    ),
    Match.when(battleToolNames.endTurn, () =>
      Either.map(decodeEndTurnArgs(input.args), (args) => ({
        name: battleToolNames.endTurn,
        args,
      })),
    ),
    Match.when(battleToolNames.endBattle, () =>
      Either.map(
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
): ToolInputResult<SelectStatBlockToolInput> {
  const record = decodeToolArgs(
    SelectStatBlockArgsSchema,
    args,
    battleToolNames.selectStatBlock,
  );
  return Either.map(record, (value) => ({
    statBlockId: value.statBlockId,
  }));
}

function decodeFillBattleHoleArgs(
  args: unknown,
): ToolInputResult<FillBattleHoleToolInput> {
  const record = decodeToolArgs(
    FillBattleHoleArgsSchema,
    args,
    battleToolNames.fillBattleHole,
  );
  if (Either.isLeft(record)) return Either.left(record.left);

  const subject = decodeJsonFact(
    BattleSubjectSchema,
    record.right.subjectJson,
    battleToolNames.fillBattleHole,
    "subjectJson",
  );
  if (Either.isLeft(subject)) return Either.left(subject.left);
  return Either.map(
    decodeJsonFact(
      BattleFillSchema,
      record.right.fillJson,
      battleToolNames.fillBattleHole,
      "fillJson",
    ),
    (fill) => ({ subject: subject.right, fill }),
  );
}

function decodeResolveBattleActArgs(
  args: unknown,
): ToolInputResult<ResolveBattleActToolInput> {
  const record = decodeToolArgs(
    ResolveBattleActArgsSchema,
    args,
    battleToolNames.resolveBattleAct,
  );
  if (Either.isLeft(record)) return Either.left(record.left);
  const subject = decodeJsonFact(
    BattleSubjectSchema,
    record.right.subjectJson,
    battleToolNames.resolveBattleAct,
    "subjectJson",
  );
  if (Either.isLeft(subject)) return Either.left(subject.left);
  return Either.right({
    subject: subject.right,
    reactionSpellTargetFacts: (record.right.reactionSpellTargetFacts ?? []).map(
      (fact) => ({
        kind: fact.kind,
        reactorId: combatantId(fact.reactorId),
        fallingCreatureId: combatantId(fact.fallingCreatureId),
        sourceProcedureRef: fact.sourceProcedureRef,
        rangeFeet: movementFeet(fact.rangeFeet),
      }),
    ),
  });
}

function decodeJsonFact<A, I>(
  schema: Schema.Schema<A, I, never>,
  json: string,
  toolName: BattleToolName,
  field: string,
): ToolInputResult<A> {
  return Either.mapLeft(
    Schema.decodeUnknownEither(Schema.parseJson(schema), {
      onExcessProperty: "error",
    })(json),
    (issue) =>
      errorContent(`${toolName} expects valid ${field} JSON.`, {
        code: "INVALID_ARGUMENTS",
        message: issue.message,
      }),
  );
}

function decodeEndTurnArgs(
  args: unknown,
): ToolInputResult<BattleActorToolInput> {
  const record = decodeToolArgs(
    EndTurnArgsSchema,
    args,
    battleToolNames.endTurn,
  );
  return Either.map(record, (value) => ({
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
): ToolInputResult<EmptyToolInput> {
  const decoded = decodeToolArgs(EmptyArgsSchema, args, toolName);
  return Either.map(decoded, () => ({}));
}
