import {
  BattleFillSchema,
  BattleSubjectSchema,
  combatantId,
  type BattleFill,
  type BattleSubject,
  type BattleTargetSpatialFact,
  type CombatantId,
} from "@dnd/battle-runtime";
import { movementFeet } from "@dnd/shared/types";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
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

const EmptyArgsSchema = Schema.Struct({});
const CombatantIdTextSchema = Schema.NonEmptyTrimmedString.annotations({
  description: "Combatant id from the current battle snapshot.",
});
const SelectStatBlockArgsSchema = Schema.Struct({
  statBlockId: Schema.NonEmptyTrimmedString.annotations({
    description: "SRD Stat Block id from list_stat_blocks.",
  }),
});
const FillBattleHoleArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema.annotations({
    description:
      "Battle act subject returned by discover_battle_acts. Copy it exactly.",
  }),
  fill: BattleFillSchema.annotations({
    identifier: "BattleFill",
    description:
      "One BattleFill matching the next hole returned by the battle runtime for the selected act replay.",
  }),
});
const ResolveBattleActArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema.annotations({
    description:
      "No-hole battle act subject returned by discover_battle_acts, such as Action Surge.",
  }),
  reactionSpellTargetFacts: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        kind: Schema.Literal(
          "featherFallTriggerSelfOrVisibleCreatureWithinRange",
        ),
        reactorId: CombatantIdTextSchema,
        fallingCreatureId: CombatantIdTextSchema,
        spellId: Schema.NonEmptyTrimmedString,
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
  battleToolNames.readBattleState,
  battleToolNames.discoverBattleActs,
  battleToolNames.fillBattleHole,
  battleToolNames.resolveBattleAct,
  battleToolNames.endTurn,
  battleToolNames.endBattle,
] as const;
export type BattleToolName = (typeof BATTLE_TOOL_NAMES)[number];

type SelectStatBlockToolInput = {
  readonly statBlockId: StatBlockId;
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

  return Either.right({
    subject: record.right.subject,
    fill: record.right.fill,
  });
}

function decodeResolveBattleActArgs(
  args: unknown,
): ToolInputResult<ResolveBattleActToolInput> {
  const record = decodeToolArgs(
    ResolveBattleActArgsSchema,
    args,
    battleToolNames.resolveBattleAct,
  );
  return Either.map(record, (value) => ({
    subject: value.subject,
    reactionSpellTargetFacts: (value.reactionSpellTargetFacts ?? []).map(
      (fact) => ({
        kind: fact.kind,
        reactorId: combatantId(fact.reactorId),
        fallingCreatureId: combatantId(fact.fallingCreatureId),
        spellId: fact.spellId,
        rangeFeet: movementFeet(fact.rangeFeet),
      }),
    ),
  }));
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
