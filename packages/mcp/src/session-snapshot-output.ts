import { BattleFillSchema, BattleSubjectSchema } from "@dnd/battle-runtime";
import { Schema } from "effect";

// Wire-output projection of the `McpSessionSnapshot` runtime type (session-store.ts).
// One definition shared by every tool-output schema so the snapshot shape — in
// particular `transientBattleFills` — cannot diverge per tool.
export const McpSessionSnapshotSchema = Schema.Struct({
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
  transientBattleFills: Schema.Union(
    Schema.Struct({
      subject: BattleSubjectSchema,
      fills: Schema.Array(BattleFillSchema),
    }),
    Schema.Null,
  ),
});
