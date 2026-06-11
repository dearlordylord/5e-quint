import { BattleSnapshotSchema } from "@dnd/battle-runtime";
import { Schema } from "effect";

import { CharacterSessionRowSchema } from "./character-tool-output.ts";
import { McpSessionSnapshotSchema } from "./session-snapshot-output.ts";

export const AdminMirrorSessionIdSchema = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("AdminMirrorSessionId"),
);
export type AdminMirrorSessionId = typeof AdminMirrorSessionIdSchema.Type;
export const adminMirrorSessionId: (value: string) => AdminMirrorSessionId =
  AdminMirrorSessionIdSchema.make;

export const AdminMirrorPublisherInstanceIdSchema =
  Schema.NonEmptyTrimmedString.pipe(
    Schema.brand("AdminMirrorPublisherInstanceId"),
  );
export type AdminMirrorPublisherInstanceId =
  typeof AdminMirrorPublisherInstanceIdSchema.Type;
export const adminMirrorPublisherInstanceId: (
  value: string,
) => AdminMirrorPublisherInstanceId = AdminMirrorPublisherInstanceIdSchema.make;

export const AdminMirrorSequenceSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("AdminMirrorSequence"),
);
export type AdminMirrorSequence = typeof AdminMirrorSequenceSchema.Type;
export const adminMirrorSequence: (value: number) => AdminMirrorSequence =
  AdminMirrorSequenceSchema.make;

export const AdminMirrorSessionSummarySchema = Schema.Struct({
  activeBattle: McpSessionSnapshotSchema.fields.activeBattle,
  draftIds: McpSessionSnapshotSchema.fields.draftIds,
  selectedStatBlockId: McpSessionSnapshotSchema.fields.selectedStatBlockId,
  transientBattleFills: McpSessionSnapshotSchema.fields.transientBattleFills,
});
export type AdminMirrorSessionSummary =
  typeof AdminMirrorSessionSummarySchema.Type;

export const AdminSessionProjectionSchema = Schema.Struct({
  session: AdminMirrorSessionSummarySchema,
  battle: Schema.Union(BattleSnapshotSchema, Schema.Null),
  characters: Schema.Array(CharacterSessionRowSchema),
});
export type AdminSessionProjection = typeof AdminSessionProjectionSchema.Type;

export const AdminMirrorBattleHpChangeSchema = Schema.Struct({
  combatantId: Schema.String,
  displayName: Schema.String,
  maxHp: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  nextHp: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  previousHp: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
});
export type AdminMirrorBattleHpChange =
  typeof AdminMirrorBattleHpChangeSchema.Type;

const JsonObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});

export const AdminMirrorEventDebugSchema = Schema.Struct({
  derivedInput: JsonObjectSchema,
  derivedOutcome: JsonObjectSchema,
  eventKind: Schema.String,
  nextBattle: Schema.Union(JsonObjectSchema, Schema.Null),
  previousBattle: Schema.Union(JsonObjectSchema, Schema.Null),
});
export type AdminMirrorEventDebug = typeof AdminMirrorEventDebugSchema.Type;

export const AdminMirrorPresentationTimelineEntrySchema = Schema.Struct({
  mirrorSessionId: AdminMirrorSessionIdSchema,
  publisherInstanceId: AdminMirrorPublisherInstanceIdSchema,
  sequence: AdminMirrorSequenceSchema,
  sourceProcessId: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
  receivedAtEpochMs: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
  battleId: Schema.Union(Schema.String, Schema.Null),
  battleRound: Schema.Union(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
    Schema.Null,
  ),
  actionDetail: Schema.Union(Schema.String, Schema.Null),
  actionSummary: Schema.Union(Schema.String, Schema.Null),
  currentActorId: Schema.Union(Schema.String, Schema.Null),
  currentActorDisplayName: Schema.Union(Schema.String, Schema.Null),
  debug: Schema.Union(AdminMirrorEventDebugSchema, Schema.Null),
  hpChanges: Schema.Array(AdminMirrorBattleHpChangeSchema),
  characterCount: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
  draftCount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
});
export type AdminMirrorPresentationTimelineEntry =
  typeof AdminMirrorPresentationTimelineEntrySchema.Type;

export const AdminMirrorProjectionEnvelopeSchema = Schema.Struct({
  mirrorSessionId: AdminMirrorSessionIdSchema,
  publisherInstanceId: AdminMirrorPublisherInstanceIdSchema,
  sequence: AdminMirrorSequenceSchema,
  sourceProcessId: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
  projection: AdminSessionProjectionSchema,
});
export type AdminMirrorProjectionEnvelope =
  typeof AdminMirrorProjectionEnvelopeSchema.Type;

export const AdminMirrorSessionStateSchema = Schema.Struct({
  envelope: AdminMirrorProjectionEnvelopeSchema,
  receivedAtEpochMs: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
  multiSource: Schema.Boolean,
  presentationTimeline: Schema.Array(
    AdminMirrorPresentationTimelineEntrySchema,
  ),
});
export type AdminMirrorSessionState = typeof AdminMirrorSessionStateSchema.Type;

export const AdminMirrorSessionListResponseSchema = Schema.Struct({
  sessions: Schema.Array(AdminMirrorSessionStateSchema),
});
export type AdminMirrorSessionListResponse =
  typeof AdminMirrorSessionListResponseSchema.Type;
