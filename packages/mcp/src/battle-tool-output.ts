import {
  BattleActPresentationSchema,
  BattleInitiativePositionSchema,
  BattleInterruptProcedureChoiceSchema,
  CombatantId,
  BattleSpellPresentationSchema,
  BattleDroppedObjectOutcomeSchema,
  BattleHoleSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BattlePresentedSnapshotSchema,
  BattleSubjectSchema,
} from "@dnd/battle-runtime/protocol-codecs";
import { Schema } from "effect";

import {
  McpActiveBattleStateSnapshotSchema,
  McpActiveSessionSnapshotSchema,
  McpInitialInitiativeSetupSnapshotSchema,
  McpNoneBattleStateSnapshotSchema,
  McpSessionSnapshotSchema,
  McpSessionSummarySchema,
} from "./session-snapshot-output.ts";

const JsonObjectSchema = Schema.Record(Schema.String, Schema.Unknown);
const BattleResolutionResultSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("resolved"),
    snapshot: BattlePresentedSnapshotSchema,
    objectDamages: Schema.optionalKey(
      Schema.Array(BattleObjectDamageOutcomeSchema),
    ),
    objectIgnitions: Schema.optionalKey(
      Schema.Array(BattleObjectIgnitionOutcomeSchema),
    ),
    droppedObjects: Schema.optionalKey(
      Schema.Array(BattleDroppedObjectOutcomeSchema),
    ),
    shovePushes: Schema.optionalKey(Schema.Array(BattleShovePushOutcomeSchema)),
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
]);

const AvailableBattleActSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
  label: Schema.Trimmed.check(Schema.isNonEmpty()),
  summary: Schema.Trimmed.check(Schema.isNonEmpty()),
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

const BattleLifecycleResultSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("combatantAdded"),
    combatantId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("combatantRemoved"),
    combatantId: CombatantId,
    removedCombatantIds: Schema.NonEmptyArray(CombatantId),
  }),
]);

function battlePresentationOutputSchema(session: Schema.Constraint) {
  return Schema.toCodecIso(
    Schema.Union([
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
    ]),
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
  ...BattlePresentationProjectionFields,
  session: McpSessionSummarySchema,
});

const BattleLifecycleActiveSetupOutputSchema = Schema.Struct({
  ...BattlePresentationBranches.activeBattle,
  ...BattlePresentationProjectionFields,
  session: McpSessionSummarySchema,
});

const BattleLifecycleActiveOutputSchema = Schema.Struct({
  battleState: McpActiveBattleStateSnapshotSchema,
  result: BattleLifecycleResultSchema,
  snapshot: BattlePresentedSnapshotSchema,
  ...BattlePresentationProjectionFields,
  session: McpActiveSessionSnapshotSchema,
});

export const BattleLifecycleOutputSchema = Schema.toCodecIso(
  Schema.Union([
    BattleLifecycleActiveOutputSchema,
    BattleLifecycleInitialInitiativeSetupOutputSchema,
    BattleLifecycleActiveSetupOutputSchema,
  ]),
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
