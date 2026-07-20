import { BattleFillSchema, BattleSubjectSchema } from "@dnd/battle-runtime";
import { Schema } from "effect";

import type { McpSessionSnapshot } from "./session-store.ts";

const McpSessionSummaryFields = {
  draftIds: Schema.Array(Schema.String),
  characterIds: Schema.Array(Schema.String),
  selectedStatBlockId: Schema.Union(Schema.String, Schema.Null),
  activeBattle: Schema.Union(
    Schema.Struct({
      battleId: Schema.String,
      currentActorId: Schema.String,
    }),
    Schema.Null,
  ),
};

export const McpSessionSummarySchema = Schema.Struct(McpSessionSummaryFields);

const McpTransientBattleFillsSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  fills: Schema.Array(BattleFillSchema),
  presentation: Schema.optionalWith(Schema.Never, { exact: true }),
});

export const McpSessionSnapshotSchema = Schema.Struct({
  ...McpSessionSummaryFields,
  transientBattleFills: Schema.Union(
    McpTransientBattleFillsSchema,
    Schema.Null,
  ),
});

export type McpSessionSummary = typeof McpSessionSummarySchema.Type;

export function mcpSessionSummary(
  snapshot: McpSessionSnapshot,
): McpSessionSummary {
  return {
    draftIds: snapshot.draftIds,
    characterIds: snapshot.characterIds,
    selectedStatBlockId: snapshot.selectedStatBlockId,
    activeBattle: snapshot.activeBattle,
  };
}
