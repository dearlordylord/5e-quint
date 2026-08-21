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
} from "@dnd/battle-runtime";
import { Schema } from "effect";

import {
  McpActiveBattleStateSnapshotSchema,
  McpActiveSessionSnapshotSchema,
  McpInitialInitiativeSetupSnapshotSchema,
  McpNoneBattleStateSnapshotSchema,
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

const BattleLifecycleResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("combatantAdded"),
    combatantId: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("combatantRemoved"),
    combatantId: Schema.String,
    removedCombatantIds: Schema.NonEmptyArray(Schema.String),
  }),
);

function battlePresentationOutputSchema(session: Schema.Schema.AnyNoContext) {
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
  );
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

const BattleLifecycleActiveOutputSchema = Schema.Struct({
  battleState: McpActiveBattleStateSnapshotSchema,
  result: BattleLifecycleResultSchema,
  snapshot: BattlePresentedSnapshotSchema,
  ...BattlePresentationProjectionFields,
  session: McpActiveSessionSnapshotSchema,
});

export const BattleLifecycleOutputSchema = Schema.Union(
  BattleLifecycleActiveOutputSchema,
  StartBattleOutputSchema,
);

export const BattleResolutionOutputSchema = Schema.Struct({
  battleState: McpActiveBattleStateSnapshotSchema,
  result: BattleResolutionResultSchema,
  snapshot: BattlePresentedSnapshotSchema,
  ...BattlePresentationProjectionFields,
  session: McpActiveSessionSnapshotSchema,
});

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  closedAt: BattleInitiativePositionSchema,
  characters: Schema.Array(JsonObjectSchema),
  session: McpSessionSummarySchema,
});
