import { BattlePresentedCheckpointFrontierEnvelopeSchema } from "@dnd/battle-runtime";
import { Schema } from "effect";

import { battleEnvelopeMatchesActiveSession } from "./battle-envelope-correlation.ts";
import { CharacterSessionRowSchema } from "./character-tool-output.ts";
import {
  McpActiveBattleStateSnapshotSchema,
  McpInitialInitiativeSetupSnapshotSchema,
  McpNoneBattleStateSnapshotSchema,
  McpSessionSnapshotSchema,
} from "./session-snapshot-output.ts";

export const AdminMirrorSessionIdSchema = Schema.Trimmed.check(
  Schema.isNonEmpty(),
).pipe(Schema.brand("AdminMirrorSessionId"));
export type AdminMirrorSessionId = typeof AdminMirrorSessionIdSchema.Type;
export const adminMirrorSessionId: (value: string) => AdminMirrorSessionId =
  AdminMirrorSessionIdSchema.make;

export const AdminMirrorPublisherInstanceIdSchema = Schema.Trimmed.check(
  Schema.isNonEmpty(),
).pipe(Schema.brand("AdminMirrorPublisherInstanceId"));
export type AdminMirrorPublisherInstanceId =
  typeof AdminMirrorPublisherInstanceIdSchema.Type;
export const adminMirrorPublisherInstanceId: (
  value: string,
) => AdminMirrorPublisherInstanceId = AdminMirrorPublisherInstanceIdSchema.make;

export const AdminMirrorSequenceSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("AdminMirrorSequence"),
);
export type AdminMirrorSequence = typeof AdminMirrorSequenceSchema.Type;
export const adminMirrorSequence: (value: number) => AdminMirrorSequence =
  AdminMirrorSequenceSchema.make;

const AdminMirrorSessionSummaryFields = {
  draftIds: McpSessionSnapshotSchema.fields.draftIds,
  selectedStatBlockId: McpSessionSnapshotSchema.fields.selectedStatBlockId,
};
export const AdminMirrorSessionSummarySchema = Schema.Struct({
  ...AdminMirrorSessionSummaryFields,
  battleState: McpSessionSnapshotSchema.fields.battleState,
});
export type AdminMirrorSessionSummary =
  typeof AdminMirrorSessionSummarySchema.Type;

export const AdminSessionProjectionSchema = Schema.Union([
  Schema.Struct({
    session: Schema.Struct({
      ...AdminMirrorSessionSummaryFields,
      battleState: McpNoneBattleStateSnapshotSchema,
    }),
    battle: Schema.Null,
    characters: Schema.Array(CharacterSessionRowSchema),
  }),
  Schema.Struct({
    session: Schema.Struct({
      ...AdminMirrorSessionSummaryFields,
      battleState: McpInitialInitiativeSetupSnapshotSchema,
    }),
    battle: Schema.Null,
    characters: Schema.Array(CharacterSessionRowSchema),
  }),
  Schema.Struct({
    session: Schema.Struct({
      ...AdminMirrorSessionSummaryFields,
      battleState: McpActiveBattleStateSnapshotSchema,
    }),
    battle: BattlePresentedCheckpointFrontierEnvelopeSchema,
    characters: Schema.Array(CharacterSessionRowSchema),
  }).pipe(
    Schema.check(
      Schema.makeFilter(
        ({ battle, session }) =>
          battleEnvelopeMatchesActiveSession({
            envelope: battle,
            session,
          })
            ? undefined
            : "An active Battle envelope must match its session Battle and actor.",
        {
          message:
            "An active Battle envelope must match its session Battle and actor.",
        },
      ),
    ),
  ),
]);
export type AdminSessionProjection = typeof AdminSessionProjectionSchema.Type;

export const AdminMirrorBattleHpChangeSchema = Schema.Struct({
  combatantId: Schema.String,
  displayName: Schema.String,
  maxHp: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
  nextHp: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
  previousHp: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
});
export type AdminMirrorBattleHpChange =
  typeof AdminMirrorBattleHpChangeSchema.Type;

const JsonObjectSchema = Schema.Record(Schema.String, Schema.Unknown);

export const AdminMirrorEventDebugSchema = Schema.Struct({
  derivedInput: JsonObjectSchema,
  derivedOutcome: JsonObjectSchema,
  eventKind: Schema.String,
  nextBattle: Schema.Union([JsonObjectSchema, Schema.Null]),
  previousBattle: Schema.Union([JsonObjectSchema, Schema.Null]),
});
export type AdminMirrorEventDebug = typeof AdminMirrorEventDebugSchema.Type;

export const AdminMirrorPresentationTimelineEntrySchema = Schema.Struct({
  mirrorSessionId: AdminMirrorSessionIdSchema,
  publisherInstanceId: AdminMirrorPublisherInstanceIdSchema,
  sequence: AdminMirrorSequenceSchema,
  sourceProcessId: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
  receivedAtEpochMs: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
  battleId: Schema.Union([Schema.String, Schema.Null]),
  battleRound: Schema.Union([
    Schema.Number.pipe(
      Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
    ),
    Schema.Null,
  ]),
  actionDetail: Schema.Union([Schema.String, Schema.Null]),
  actionSummary: Schema.Union([Schema.String, Schema.Null]),
  currentActorId: Schema.Union([Schema.String, Schema.Null]),
  currentActorDisplayName: Schema.Union([Schema.String, Schema.Null]),
  debug: Schema.Union([AdminMirrorEventDebugSchema, Schema.Null]),
  hpChanges: Schema.Array(AdminMirrorBattleHpChangeSchema),
  characterCount: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
  draftCount: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
});
export type AdminMirrorPresentationTimelineEntry =
  typeof AdminMirrorPresentationTimelineEntrySchema.Type;

const AdminMirrorProjectionEnvelopeFieldsSchema = Schema.Struct({
  mirrorSessionId: AdminMirrorSessionIdSchema,
  publisherInstanceId: AdminMirrorPublisherInstanceIdSchema,
  sequence: AdminMirrorSequenceSchema,
  sourceProcessId: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  ),
  projection: AdminSessionProjectionSchema,
});
export const AdminMirrorProjectionEnvelopeSchema =
  AdminMirrorProjectionEnvelopeFieldsSchema;
export type AdminMirrorProjectionEnvelope =
  typeof AdminMirrorProjectionEnvelopeSchema.Type;

export const AdminMirrorSessionStateSchema = Schema.Struct({
  envelope: AdminMirrorProjectionEnvelopeSchema,
  receivedAtEpochMs: Schema.Number.pipe(
    Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
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
