import {
  BattleActPresentationSchema,
  BattleInterruptProcedureChoiceSchema,
  BattleSpellPresentationSchema,
  battleActPresentationMatchesSubject,
  BattleDroppedObjectOutcomeSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
} from "@dnd/battle-runtime";
import { Match, Schema } from "effect";

import {
  McpSessionSnapshotSchema,
  McpSessionSummarySchema,
} from "./session-snapshot-output.ts";

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
    shovePushes: Schema.optionalWith(
      Schema.Array(BattleShovePushOutcomeSchema),
      {
        exact: true,
      },
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

const AvailableBattleActSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
  label: Schema.NonEmptyTrimmedString,
  summary: Schema.NonEmptyTrimmedString,
  presentation: BattleActPresentationSchema,
}).pipe(
  Schema.filter(
    ({ subject, presentation }) =>
      battleActPresentationMatchesSubject(subject, presentation),
    {
      message: () =>
        "Battle act presentation must describe the same execution variant and procedure as its subject.",
    },
  ),
);

const PresentedBattleInterruptChoiceSchema = Schema.Struct({
  choice: BattleInterruptProcedureChoiceSchema,
  presentation: BattleActPresentationSchema,
}).pipe(
  Schema.filter(
    ({ choice, presentation }) =>
      Match.value(choice).pipe(
        Match.discriminatorsExhaustive("kind")({
          releaseReadiedSpell: (value) =>
            battleActPresentationMatchesSubject(value.subject, presentation),
          releaseReadiedMovement: (value) =>
            battleActPresentationMatchesSubject(value.subject, presentation),
          castTriggeredReactionSpell: (value) =>
            battleActPresentationMatchesSubject(value.subject, presentation),
          castAttackHitBonusActionSpell: (value) =>
            battleActPresentationMatchesSubject(value.subject, presentation),
          opportunityAttack: (value) =>
            battleActPresentationMatchesSubject(value.subject, presentation),
          retaliationAttack: (value) =>
            battleActPresentationMatchesSubject(value.subject, presentation),
          reactionRollOrDamageReduction: () => false,
        }),
      ),
    {
      message: () =>
        "Interrupt presentation must describe the same execution choice and procedure.",
    },
  ),
);

const BattlePresentationProjectionFields = {
  availableActs: Schema.Array(AvailableBattleActSchema),
  admittedSpellPresentations: Schema.Array(BattleSpellPresentationSchema),
  presentedInterruptChoices: Schema.Array(PresentedBattleInterruptChoiceSchema),
};

export const SelectStatBlockOutputSchema = Schema.Struct({
  selectedStatBlock: JsonObjectSchema,
  session: McpSessionSummarySchema,
});

export const BattleSessionOutputSchema = Schema.Struct({
  snapshot: Schema.Union(BattleSnapshotSchema, Schema.Null),
  ...BattlePresentationProjectionFields,
  session: McpSessionSnapshotSchema,
});

export const StartBattleOutputSchema = Schema.Struct({
  snapshot: BattleSnapshotSchema,
  ...BattlePresentationProjectionFields,
  session: McpSessionSummarySchema,
});

export const BattleResolutionOutputSchema = Schema.Struct({
  result: BattleResolutionResultSchema,
  snapshot: BattleSnapshotSchema,
  ...BattlePresentationProjectionFields,
  session: McpSessionSnapshotSchema,
});

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  characters: Schema.Array(JsonObjectSchema),
  session: McpSessionSummarySchema,
});
