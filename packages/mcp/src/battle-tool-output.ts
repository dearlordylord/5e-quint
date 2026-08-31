import {
  BattleInitiativePositionSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleDroppedObjectOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BATTLE_INVALID_REASON_CODES,
  BattlePresentedCheckpointFrontierEnvelopeSchema,
  CombatantId,
} from "@dnd/battle-runtime";
import { Schema } from "effect";

import { battleEnvelopeMatchesActiveSession } from "./battle-envelope-correlation.ts";
import {
  McpActiveSessionSnapshotSchema,
  McpInitialInitiativeSetupSessionSnapshotSchema,
  McpNoneSessionSnapshotSchema,
  McpSessionSummarySchema,
} from "./session-snapshot-output.ts";

const JsonObjectSchema = Schema.Record(Schema.String, Schema.Unknown);

const BattleResolutionResolvedResultSchema = Schema.Struct({
  tag: Schema.Literal("resolved"),
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
});

const BattleResolutionNeedsHolesResultSchema = Schema.Struct({
  tag: Schema.Literal("needsHoles"),
});

const BattleResolutionInvalidResultSchema = Schema.Struct({
  tag: Schema.Literal("invalid"),
  reason: Schema.Literals(BATTLE_INVALID_REASON_CODES),
  message: Schema.String,
});

export const BattlePresentationEnvelopeSchema =
  BattlePresentedCheckpointFrontierEnvelopeSchema;

const BattleResolvedPresentationEnvelopeSchema =
  BattlePresentationEnvelopeSchema.pipe(
    Schema.check(
      Schema.makeFilter(
        (envelope) =>
          envelope.frontier.kind === "acts" ||
          envelope.frontier.kind === "interruptDecision",
        {
          message:
            "A resolved Battle result must expose an Acts or interrupt-decision frontier.",
        },
      ),
    ),
  );

const BattleNeedsHolesPresentationEnvelopeSchema =
  BattlePresentationEnvelopeSchema.pipe(
    Schema.check(
      Schema.makeFilter(
        (envelope) =>
          envelope.frontier.kind === "holes" ||
          envelope.frontier.kind === "interruptDecision",
        {
          message:
            "A needsHoles Battle result must expose a Holes or interrupt-decision frontier.",
        },
      ),
    ),
  );

const BattleActivePresentationBranchSchema = Schema.Struct({
  envelope: BattlePresentationEnvelopeSchema,
  session: McpActiveSessionSnapshotSchema,
}).pipe(
  Schema.check(
    Schema.makeFilter(battleEnvelopeMatchesActiveSession, {
      message:
        "An active Battle envelope must match its session Battle and actor.",
    }),
  ),
);

const BattlePresentationBranches = {
  none: Schema.Struct({
    envelope: Schema.Null,
    session: McpNoneSessionSnapshotSchema,
  }),
  initialInitiativeSetup: Schema.Struct({
    envelope: Schema.Null,
    session: McpInitialInitiativeSetupSessionSnapshotSchema,
  }),
  activeBattle: BattleActivePresentationBranchSchema,
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

function battlePresentationOutputSchema() {
  return Schema.toCodecIso(
    Schema.Union([
      BattlePresentationBranches.none,
      BattlePresentationBranches.initialInitiativeSetup,
      BattlePresentationBranches.activeBattle,
    ]),
  );
}

export const SelectStatBlockOutputSchema = Schema.Struct({
  selectedStatBlock: JsonObjectSchema,
  session: McpSessionSummarySchema,
});

export const BattleSessionOutputSchema = battlePresentationOutputSchema();

export const StartBattleOutputSchema = Schema.toCodecIso(
  Schema.Union([
    BattlePresentationBranches.initialInitiativeSetup,
    BattlePresentationBranches.activeBattle,
  ]),
);

const BattleLifecycleInitialInitiativeSetupOutputSchema = Schema.Struct({
  envelope: Schema.Null,
  session: McpInitialInitiativeSetupSessionSnapshotSchema,
});

const BattleLifecycleActiveSetupOutputSchema =
  BattleActivePresentationBranchSchema;

const BattleLifecycleActiveOutputSchema = Schema.Struct({
  result: BattleLifecycleResultSchema,
  envelope: BattlePresentationEnvelopeSchema,
  session: McpActiveSessionSnapshotSchema,
}).pipe(
  Schema.check(
    Schema.makeFilter(
      ({ envelope, session }) =>
        battleEnvelopeMatchesActiveSession({ envelope, session }),
      {
        message:
          "An active Battle envelope must match its session Battle and actor.",
      },
    ),
  ),
);

export const BattleLifecycleOutputSchema = Schema.toCodecIso(
  Schema.Union([
    BattleLifecycleActiveOutputSchema,
    BattleLifecycleInitialInitiativeSetupOutputSchema,
    BattleLifecycleActiveSetupOutputSchema,
  ]),
);

export const BattleResolutionOutputSchema = Schema.toCodecIso(
  Schema.Union([
    Schema.Struct({
      result: BattleResolutionResolvedResultSchema,
      envelope: BattleResolvedPresentationEnvelopeSchema,
      session: McpActiveSessionSnapshotSchema,
    }).pipe(
      Schema.check(
        Schema.makeFilter(
          ({ envelope, session }) =>
            battleEnvelopeMatchesActiveSession({ envelope, session }),
          {
            message:
              "An active Battle envelope must match its session Battle and actor.",
          },
        ),
      ),
    ),
    Schema.Struct({
      result: BattleResolutionNeedsHolesResultSchema,
      envelope: BattleNeedsHolesPresentationEnvelopeSchema,
      session: McpActiveSessionSnapshotSchema,
    }).pipe(
      Schema.check(
        Schema.makeFilter(
          ({ envelope, session }) =>
            battleEnvelopeMatchesActiveSession({ envelope, session }),
          {
            message:
              "An active Battle envelope must match its session Battle and actor.",
          },
        ),
      ),
    ),
    Schema.Struct({
      result: BattleResolutionInvalidResultSchema,
      envelope: BattlePresentationEnvelopeSchema,
      session: McpActiveSessionSnapshotSchema,
    }).pipe(
      Schema.check(
        Schema.makeFilter(
          ({ envelope, session }) =>
            battleEnvelopeMatchesActiveSession({ envelope, session }),
          {
            message:
              "An active Battle envelope must match its session Battle and actor.",
          },
        ),
      ),
    ),
  ]),
);

export type BattleResolutionResultPayload =
  | Schema.Schema.Type<typeof BattleResolutionResolvedResultSchema>
  | Schema.Schema.Type<typeof BattleResolutionNeedsHolesResultSchema>
  | Schema.Schema.Type<typeof BattleResolutionInvalidResultSchema>;

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  closedAt: BattleInitiativePositionSchema,
  characters: Schema.Array(JsonObjectSchema),
  session: McpSessionSummarySchema,
});
