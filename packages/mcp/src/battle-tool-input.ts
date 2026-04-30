import {
  BattleFillSchema,
  BattleSubjectSchema,
  combatantId,
  type BattleFill,
  type BattleSubject,
  type CombatantId,
} from "@dnd/battle-runtime";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
import { JSONSchema, Schema } from "effect";

import { isToolError, type ToolError } from "./tool-input-helpers.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
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
): StatBlockId | ToolError {
  const record = decodeToolArgs(SelectStatBlockArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  return record.statBlockId;
}

export function decodeReadBattleStateArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  return decodeEmptyArgs(args, toolName);
}

export function decodeDiscoverBattleActsArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  return decodeEmptyArgs(args, toolName);
}

export function decodeFillBattleHoleArgs(
  args: unknown,
  toolName: string,
): FillBattleHoleToolInput | ToolError {
  const record = decodeToolArgs(FillBattleHoleArgsSchema, args, toolName);
  if (isToolError(record)) return record;

  return {
    subject: record.subject,
    fill: record.fill,
  };
}

export function decodeResolveBattleActArgs(
  args: unknown,
  toolName: string,
): ResolveBattleActToolInput | ToolError {
  const record = decodeToolArgs(ResolveBattleActArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  return { subject: record.subject };
}

export function decodeEndTurnArgs(
  args: unknown,
  toolName: string,
): BattleActorToolInput | ToolError {
  const record = decodeToolArgs(EndTurnArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  return { actorId: combatantId(record.actorId) };
}

export function decodeEndBattleArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  return decodeEmptyArgs(args, toolName);
}

export function isBattleToolError(value: unknown): value is ToolError {
  return isToolError(value);
}

function decodeEmptyArgs(args: unknown, toolName: string) {
  const decoded = decodeToolArgs(EmptyArgsSchema, args, toolName);
  return isToolError(decoded) ? decoded : {};
}
