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
import { Either, Match, Result, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  mcpObjectJsonSchemaWithCopiedObjects,
  type ToolInputResult,
} from "./schema-codec.ts";
import {
  decodeStartBattleArgs,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import {
  decodeBattleLifecycleArgs,
  type BattleLifecycleToolInput,
} from "./battle-lifecycle-tool-input.ts";

const EmptyArgsSchema = Schema.Struct({});
const CombatantIdTextSchema = Schema.NonEmptyTrimmedString.annotations({
  description: "Combatant id from the current battle snapshot.",
});
const SelectStatBlockArgsSchema = Schema.Struct({
  statBlockId: StatBlockId.annotations({
    description: "SRD Stat Block id from list_stat_blocks.",
  }),
});
const FillBattleHoleArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  fill: BattleFillSchema,
});
const ResolveBattleActArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema,
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
    Match.when(battleToolNames.battleLifecycle, () =>
      Result.map(decodeBattleLifecycleArgs(input.args), (args) => ({
        name: battleToolNames.battleLifecycle,
        args,
      })),
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

  return Either.right(record.right);
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
  return Either.right({
    subject: record.right.subject,
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
