import {
  BattleInitiativePositionSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleDroppedObjectOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BattlePresentedCheckpointFrontierEnvelopeSchema,
  CombatantId,
} from "@dnd/battle-runtime";
import { Schema } from "effect";

import {
  McpActiveSessionSnapshotSchema,
  McpInitialInitiativeSetupSessionSnapshotSchema,
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
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("needsHoles"),
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    reason: Schema.String,
    message: Schema.String,
  }),
);

const BattlePresentationBranches = {
  none: {
    envelope: Schema.Null,
    session: McpSessionSnapshotSchema,
  },
  initialInitiativeSetup: {
    envelope: Schema.Null,
    session: McpSessionSummarySchema,
  },
  activeBattle: {
    envelope: BattlePresentedCheckpointFrontierEnvelopeSchema,
    session: McpActiveSessionSnapshotSchema,
  },
} as const;

const BattleLifecycleResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("combatantAdded"),
    combatantId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("combatantRemoved"),
    combatantId: CombatantId,
    removedCombatantIds: Schema.NonEmptyArray(CombatantId),
  }),
);

function battlePresentationOutputSchema(session: Schema.Schema.AnyNoContext) {
  return Schema.Union(
    Schema.Struct({
      ...BattlePresentationBranches.none,
      session,
    }),
    Schema.Struct({
      ...BattlePresentationBranches.initialInitiativeSetup,
      session,
    }),
    Schema.Struct({
      ...BattlePresentationBranches.activeBattle,
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

const BattleLifecycleInitialInitiativeSetupOutputSchema = Schema.Struct({
  ...BattlePresentationBranches.initialInitiativeSetup,
  session: McpInitialInitiativeSetupSessionSnapshotSchema,
});

const BattleLifecycleActiveSetupOutputSchema = Schema.Struct({
  ...BattlePresentationBranches.activeBattle,
  session: McpSessionSummarySchema,
});

const BattleLifecycleActiveOutputSchema = Schema.Struct({
  result: BattleLifecycleResultSchema,
  envelope: BattlePresentedCheckpointFrontierEnvelopeSchema,
  session: McpActiveSessionSnapshotSchema,
});

export const BattleLifecycleOutputSchema = Schema.Union(
  BattleLifecycleActiveOutputSchema,
  BattleLifecycleInitialInitiativeSetupOutputSchema,
  BattleLifecycleActiveSetupOutputSchema,
);

export const BattleResolutionOutputSchema = Schema.Struct({
  result: BattleResolutionResultSchema,
  envelope: BattlePresentedCheckpointFrontierEnvelopeSchema,
  session: McpActiveSessionSnapshotSchema,
});

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  closedAt: BattleInitiativePositionSchema,
  characters: Schema.Array(JsonObjectSchema),
  session: McpSessionSummarySchema,
});
