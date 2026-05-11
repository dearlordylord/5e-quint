import {
  BattleFillSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
} from "@dnd/battle-runtime";
import { Schema } from "effect";

const JsonObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});
const McpSessionSnapshotSchema = Schema.Struct({
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
const BattleResolutionResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("resolved"),
    snapshot: BattleSnapshotSchema,
    objectDamages: Schema.optionalWith(
      Schema.Array(BattleObjectDamageOutcomeSchema),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("needsHoles"),
    subject: BattleSubjectSchema,
    holes: Schema.Array(BattleHoleSchema),
    snapshot: BattleSnapshotSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    reason: Schema.String,
    message: Schema.String,
    snapshot: BattleSnapshotSchema,
  }),
);

export const SelectStatBlockOutputSchema = Schema.Struct({
  selectedStatBlock: JsonObjectSchema,
  session: McpSessionSnapshotSchema,
});

export const BattleSessionOutputSchema = Schema.Struct({
  snapshot: Schema.Union(BattleSnapshotSchema, Schema.Null),
  session: McpSessionSnapshotSchema,
});

export const StartBattleOutputSchema = Schema.Struct({
  snapshot: BattleSnapshotSchema,
  session: McpSessionSnapshotSchema,
});

export const BattleResolutionOutputSchema = Schema.Struct({
  result: BattleResolutionResultSchema,
  snapshot: BattleSnapshotSchema,
  session: McpSessionSnapshotSchema,
});

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  characters: Schema.Array(JsonObjectSchema),
  session: McpSessionSnapshotSchema,
});
