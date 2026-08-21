import {
  BattleActPresentationSchema,
  BattleInitiativePositionSchema,
  BattleInterruptProcedureChoiceSchema,
  BattleSpellPresentationSchema,
  BattleDroppedObjectOutcomeSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BattlePresentedSnapshotSchema,
  BattleSubjectSchema,
  discoverBattleActs,
  battleAdmittedSpellPresentations,
  type BattlePresentedSnapshot,
} from "@dnd/battle-runtime";
import { Schema } from "effect";

import {
  McpActiveBattleStateSnapshotSchema,
  McpBattleStateSnapshotSchema,
  McpInitialInitiativeSetupSnapshotSchema,
  McpNoneBattleStateSnapshotSchema,
  McpSessionSnapshotSchema,
  McpSessionSummarySchema,
} from "./session-snapshot-output.ts";
import type { McpBattleStateSnapshot } from "./session-store.ts";

const JsonObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});
const BattleResolutionResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("resolved"),
    snapshot: BattlePresentedSnapshotSchema,
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
    snapshot: BattlePresentedSnapshotSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    reason: Schema.String,
    message: Schema.String,
    snapshot: BattlePresentedSnapshotSchema,
  }),
);

const AvailableBattleActSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
  label: Schema.NonEmptyTrimmedString,
  summary: Schema.NonEmptyTrimmedString,
  presentation: BattleActPresentationSchema,
});

const PresentedBattleInterruptChoiceSchema = Schema.Struct({
  choice: BattleInterruptProcedureChoiceSchema,
  presentation: BattleActPresentationSchema,
});

const BattlePresentationProjectionFields = {
  availableActs: Schema.Array(AvailableBattleActSchema),
  admittedSpellPresentations: Schema.Array(BattleSpellPresentationSchema),
  presentedInterruptChoices: Schema.Array(PresentedBattleInterruptChoiceSchema),
};

const BattlePresentationBranches = {
  none: {
    battleState: McpNoneBattleStateSnapshotSchema,
    snapshot: Schema.Null,
  },
  initialInitiativeSetup: {
    battleState: McpInitialInitiativeSetupSnapshotSchema,
    snapshot: Schema.Null,
  },
  activeBattle: {
    battleState: McpActiveBattleStateSnapshotSchema,
    snapshot: BattlePresentedSnapshotSchema,
  },
} as const;

type BattlePresentationProjection = {
  readonly availableActs: ReturnType<typeof discoverBattleActs>;
  readonly admittedSpellPresentations: ReturnType<
    typeof battleAdmittedSpellPresentations
  >;
  readonly presentedInterruptChoices: readonly unknown[];
};
type BattlePresentationOutput<Session> = BattlePresentationProjection & {
  readonly battleState: McpBattleStateSnapshot;
  readonly snapshot: BattlePresentedSnapshot | null;
  readonly session: Session;
};

function battlePresentationOutputSchema<
  SessionSchema extends Schema.Schema.AnyNoContext,
>(
  session: SessionSchema,
): Schema.Schema<BattlePresentationOutput<SessionSchema["Type"]>, any, never> {
  return Schema.Union(
    Schema.Struct({
      ...BattlePresentationBranches.none,
      ...BattlePresentationProjectionFields,
      session,
    }),
    Schema.Struct({
      ...BattlePresentationBranches.initialInitiativeSetup,
      ...BattlePresentationProjectionFields,
      session,
    }),
    Schema.Struct({
      ...BattlePresentationBranches.activeBattle,
      ...BattlePresentationProjectionFields,
      session,
    }),
  ) as unknown as Schema.Schema<
    BattlePresentationOutput<SessionSchema["Type"]>,
    any,
    never
  >;
}

export const SelectStatBlockOutputSchema = Schema.Struct({
  selectedStatBlock: JsonObjectSchema,
  session: McpSessionSummarySchema,
});

export const BattleSessionOutputSchema = battlePresentationOutputSchema(
  McpSessionSnapshotSchema,
);

export const StartBattleOutputSchema = battlePresentationOutputSchema(
  McpSessionSummarySchema,
);

export const BattleResolutionOutputSchema = Schema.Struct({
  battleState: McpBattleStateSnapshotSchema,
  result: BattleResolutionResultSchema,
  snapshot: BattlePresentedSnapshotSchema,
  ...BattlePresentationProjectionFields,
  session: McpSessionSnapshotSchema,
});

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  closedAt: BattleInitiativePositionSchema,
  characters: Schema.Array(JsonObjectSchema),
  session: McpSessionSummarySchema,
});
