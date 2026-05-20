import {
  BattleDroppedObjectOutcomeSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
} from "@dnd/battle-runtime";
import { Schema } from "effect";

import { McpSessionSnapshotSchema } from "./session-snapshot-output.ts";

const JsonObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});
const BattleResolutionResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("resolved"),
    snapshot: BattleSnapshotSchema,
    objectDamages: Schema.optionalWith(
      Schema.Array(BattleObjectDamageOutcomeSchema),
      { exact: true },
    ),
    objectIgnitions: Schema.optionalWith(
      Schema.Array(BattleObjectIgnitionOutcomeSchema),
      { exact: true },
    ),
    droppedObjects: Schema.optionalWith(
      Schema.Array(BattleDroppedObjectOutcomeSchema),
      { exact: true },
    ),
    shovePushes: Schema.optionalWith(Schema.Array(BattleShovePushOutcomeSchema), {
      exact: true,
    }),
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
