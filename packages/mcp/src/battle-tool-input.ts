import {
  BattleFillSchema,
  BattleSubjectSchema,
  combatantId,
  type BattleFill,
  type BattleSubject,
  type CombatantId,
} from "@dnd/battle-runtime";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
import { Either, JSONSchema, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

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
    description:
      "One BattleFill for the current act replay: targetChoice, attackRoll, or rolledDice.",
  }),
});
const ResolveBattleActArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema.annotations({
    description:
      "No-hole battle act subject returned by discover_battle_acts, such as Action Surge.",
  }),
});
const EndTurnArgsSchema = Schema.Struct({ actorId: CombatantIdTextSchema });

export const selectStatBlockInputSchema = JSONSchema.make(
  SelectStatBlockArgsSchema,
) as unknown as McpObjectInputSchema;
export const readBattleStateInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
export const discoverBattleActsInputSchema =
  mcpObjectJsonSchema(EmptyArgsSchema);
export const fillBattleHoleInputSchema = JSONSchema.make(
  FillBattleHoleArgsSchema,
) as unknown as McpObjectInputSchema;
export const resolveBattleActInputSchema = JSONSchema.make(
  ResolveBattleActArgsSchema,
) as unknown as McpObjectInputSchema;
export const endTurnInputSchema = JSONSchema.make(
  EndTurnArgsSchema,
) as unknown as McpObjectInputSchema;
export const endBattleInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);

export type BattleActorToolInput = {
  readonly actorId: CombatantId;
};

export type FillBattleHoleToolInput = {
  readonly subject: BattleSubject;
  readonly fill: BattleFill;
};

export type ResolveBattleActToolInput = {
  readonly subject: BattleSubject;
};

export function decodeSelectStatBlockArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<StatBlockId> {
  const record = decodeToolArgs(SelectStatBlockArgsSchema, args, toolName);
  return Either.map(record, (value) => value.statBlockId);
}

export function decodeReadBattleStateArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<Record<string, never>> {
  return decodeEmptyArgs(args, toolName);
}

export function decodeDiscoverBattleActsArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<Record<string, never>> {
  return decodeEmptyArgs(args, toolName);
}

export function decodeFillBattleHoleArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<FillBattleHoleToolInput> {
  const record = decodeToolArgs(FillBattleHoleArgsSchema, args, toolName);
  if (Either.isLeft(record)) return Either.left(record.left);

  return Either.right({
    subject: record.right.subject,
    fill: record.right.fill,
  });
}

export function decodeResolveBattleActArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<ResolveBattleActToolInput> {
  const record = decodeToolArgs(ResolveBattleActArgsSchema, args, toolName);
  return Either.map(record, (value) => ({ subject: value.subject }));
}

export function decodeEndTurnArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<BattleActorToolInput> {
  const record = decodeToolArgs(EndTurnArgsSchema, args, toolName);
  return Either.map(record, (value) => ({
    actorId: combatantId(value.actorId),
  }));
}

export function decodeEndBattleArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<Record<string, never>> {
  return decodeEmptyArgs(args, toolName);
}

function decodeEmptyArgs(
  args: unknown,
  toolName: string,
): ToolInputResult<Record<string, never>> {
  const decoded = decodeToolArgs(EmptyArgsSchema, args, toolName);
  return Either.map(decoded, () => ({}));
}
