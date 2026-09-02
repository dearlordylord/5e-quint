import { Result, Schema } from "effect";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  AvailableBattleAct,
  BattleActPresentation,
  BattleCreatureSnapshot,
  BattleInterruptDecisionFrontier,
  BattleInterruptProcedureChoice,
  BattleInterruptChoicePresentationIssue,
  BattleInterruptChoicePresentationIssues,
  BattlePresentationIssues,
  BattlePresentedCreatureSnapshot,
  BattlePresentedSnapshot,
  BattleSnapshotPresentationIssue,
  BattleSnapshotPresentationIssues,
} from "./battle-state-execution.ts";
import { interruptChoiceResponderId } from "./battle-state-execution.ts";
import {
  type BattleCheckpointFrontierEnvelope,
  currentBattleCheckpointFrontierEnvelope,
} from "./battle-session-execution.ts";
import {
  battleSubjectPresentation,
  presentBattleActs,
} from "./battle-act-composition.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { battleCreaturePresentationDisplayName } from "./stat-block-presentation.ts";
import { BattleCreatureDisplayNameSchema } from "./battle-creature-display-name.ts";
import {
  BattleActDiscoveryCandidateSchema,
  BattleActPresentationSchema,
  BattleCheckpointFrontierHolesSchema,
  BattleInterruptDecisionFrontierSchema,
  BattleInterruptProcedureChoiceWithSubjectSchema,
  BattleInterruptProcedureModifierChoiceSchema,
  BattlePresentedSnapshotSchema,
  portableCodec,
} from "./battle-reducer/battle-codecs.ts";

const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);

type BattleAvailableActCodec = Schema.Struct<
  typeof BattleActDiscoveryCandidateSchema.fields & {
    readonly label: typeof NonEmptyTrimmedStringSchema;
    readonly summary: typeof NonEmptyTrimmedStringSchema;
    readonly presentation: typeof BattleActPresentationSchema;
  }
>;

const BattleAvailableActSchema: BattleAvailableActCodec = Schema.Struct({
  ...BattleActDiscoveryCandidateSchema.fields,
  label: NonEmptyTrimmedStringSchema,
  summary: NonEmptyTrimmedStringSchema,
  presentation: BattleActPresentationSchema,
});

type BattlePresentedInterruptModifierChoiceCodec = Schema.Struct<{
  readonly choice: typeof BattleInterruptProcedureModifierChoiceSchema;
}>;
type BattlePresentedInterruptProcedureChoiceCodec = Schema.Struct<{
  readonly choice: typeof BattleInterruptProcedureChoiceWithSubjectSchema;
  readonly presentation: typeof BattleActPresentationSchema;
}>;
type BattlePresentedInterruptChoiceCodec = Schema.Union<
  readonly [
    BattlePresentedInterruptModifierChoiceCodec,
    BattlePresentedInterruptProcedureChoiceCodec,
  ]
>;

const BattlePresentedInterruptChoiceSchema: BattlePresentedInterruptChoiceCodec =
  Schema.Union([
    Schema.Struct({ choice: BattleInterruptProcedureModifierChoiceSchema }),
    Schema.Struct({
      choice: BattleInterruptProcedureChoiceWithSubjectSchema,
      presentation: BattleActPresentationSchema,
    }),
  ]);

type BattlePresentedCheckpointFrontierCodec = Schema.Union<
  readonly [
    Schema.Struct<{
      readonly kind: Schema.Literal<"acts">;
      readonly acts: Schema.$Array<typeof BattleAvailableActSchema>;
    }>,
    typeof BattleCheckpointFrontierHolesSchema,
    Schema.Struct<
      Omit<typeof BattleInterruptDecisionFrontierSchema.fields, "choices"> & {
        readonly choices: Schema.NonEmptyArray<
          typeof BattlePresentedInterruptChoiceSchema
        >;
      }
    >,
  ]
>;

type BattlePresentedCheckpointFrontierEnvelopeCodec = Schema.Struct<{
  readonly checkpoint: typeof BattlePresentedSnapshotSchema;
  readonly frontier: BattlePresentedCheckpointFrontierCodec;
}>;

export const BattlePresentedCheckpointFrontierEnvelopeSchema: Schema.Codec<
  BattlePresentedCheckpointFrontierEnvelope,
  Schema.Codec.Encoded<BattlePresentedCheckpointFrontierEnvelopeCodec>,
  never,
  never
> = portableCodec<
  BattlePresentedCheckpointFrontierEnvelope,
  Schema.Codec.Encoded<BattlePresentedCheckpointFrontierEnvelopeCodec>
>()(
  Schema.Struct({
    checkpoint: BattlePresentedSnapshotSchema,
    frontier: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("acts"),
        acts: Schema.Array(BattleAvailableActSchema),
      }),
      BattleCheckpointFrontierHolesSchema,
      Schema.Struct({
        ...BattleInterruptDecisionFrontierSchema.fields,
        choices: Schema.NonEmptyArray(BattlePresentedInterruptChoiceSchema),
      }),
    ]),
  }).pipe(
    Schema.annotate({
      identifier: "BattlePresentedCheckpointFrontierEnvelope",
    }),
  ),
);

export type BattlePresentedInterruptChoice =
  | {
      readonly choice: Extract<
        BattleInterruptProcedureChoice,
        { readonly kind: "reactionModifier" }
      >;
    }
  | {
      readonly choice: Exclude<
        BattleInterruptProcedureChoice,
        { readonly kind: "reactionModifier" }
      >;
      readonly presentation: BattleActPresentation;
    };

export type BattlePresentedCheckpointFrontierEnvelope = {
  readonly checkpoint: BattlePresentedSnapshot;
  readonly frontier:
    | {
        readonly kind: "acts";
        readonly acts: readonly AvailableBattleAct[];
      }
    | Extract<BattleCheckpointFrontierEnvelope["frontier"], { kind: "holes" }>
    | (Omit<BattleInterruptDecisionFrontier, "choices"> & {
        readonly choices: ReadonlyNonEmptyArray<BattlePresentedInterruptChoice>;
      });
};

export function battlePresentedSnapshot(
  session: BattleRuntimeSession,
): Result.Result<BattlePresentedSnapshot, BattleSnapshotPresentationIssues> {
  return presentBattleSnapshot(session, snapshotBattle(session.state));
}

export function presentBattleSnapshot(
  session: BattleRuntimeSession,
  snapshot: import("./battle-state-execution.ts").BattleSnapshot,
): Result.Result<BattlePresentedSnapshot, BattleSnapshotPresentationIssues> {
  return Result.map(
    traverseValidation(snapshot.combatants, (combatant) =>
      presentedCombatant(session, combatant),
    ),
    (combatants) => ({ ...snapshot, combatants }),
  );
}

/**
 * Join authored presentation facts onto the runtime-owned envelope.  The
 * checkpoint and frontier remain the same single runtime envelope; only the
 * consumer-facing display names and act/choice labels are added here.
 */
export function presentBattleCheckpointFrontierEnvelope(
  session: BattleRuntimeSession,
  envelope: BattleCheckpointFrontierEnvelope,
): Result.Result<
  BattlePresentedCheckpointFrontierEnvelope,
  BattlePresentationIssues
> {
  return Result.flatMap(
    presentBattleSnapshot(session, envelope.checkpoint),
    (checkpoint) =>
      Result.map(presentFrontier(session, envelope.frontier), (frontier) => ({
        checkpoint,
        frontier,
      })),
  );
}

export function battlePresentedCheckpointFrontierEnvelope(
  session: BattleRuntimeSession,
): Result.Result<
  BattlePresentedCheckpointFrontierEnvelope,
  BattlePresentationIssues
> {
  return presentBattleCheckpointFrontierEnvelope(
    session,
    currentBattleCheckpointFrontierEnvelope(session),
  );
}

function presentFrontier(
  session: BattleRuntimeSession,
  frontier: BattleCheckpointFrontierEnvelope["frontier"],
): Result.Result<
  BattlePresentedCheckpointFrontierEnvelope["frontier"],
  BattlePresentationIssues
> {
  if (frontier.kind === "acts") {
    return Result.succeed({
      kind: "acts",
      acts: presentBattleActs(session, frontier.acts),
    });
  }
  if (frontier.kind === "holes") {
    return Result.succeed(frontier);
  }
  return Result.map(
    presentBattleInterruptChoices(session, frontier.choices),
    (choices) => ({ ...frontier, choices }),
  );
}

export function presentBattleInterruptChoices(
  session: BattleRuntimeSession,
  choices: ReadonlyNonEmptyArray<BattleInterruptProcedureChoice>,
): Result.Result<
  ReadonlyNonEmptyArray<BattlePresentedInterruptChoice>,
  BattleInterruptChoicePresentationIssues
> {
  return traverseValidation(choices, (choice) =>
    presentBattleInterruptChoice(session, choice),
  );
}

function presentBattleInterruptChoice(
  session: BattleRuntimeSession,
  choice: BattleInterruptProcedureChoice,
): Result.Result<
  BattlePresentedInterruptChoice,
  BattleInterruptChoicePresentationIssue
> {
  if (choice.kind === "reactionModifier") {
    // Modifier-only choices are mechanics-owned and have no authored act
    // presentation to join. They must remain visible in the frontier.
    return Result.succeed({ choice });
  }
  const presentation = battleSubjectPresentation(session, choice.subject);
  if (presentation === undefined) {
    return Result.fail({
      tag: "battleInterruptChoicePresentationIssue",
      reason: "missingSubjectPresentation",
      responderId: interruptChoiceResponderId(choice),
      choiceKind: choice.kind,
      subject: choice.subject,
    });
  }
  return Result.succeed({ choice, presentation });
}

function presentedCombatant(
  session: BattleRuntimeSession,
  combatant: BattleCreatureSnapshot,
): Result.Result<
  BattlePresentedCreatureSnapshot,
  BattleSnapshotPresentationIssue
> {
  const displayName = battleCreaturePresentationDisplayName(
    session.state,
    session.context,
    combatant.combatantId,
  );
  if (displayName === null) {
    return Result.fail({
      tag: "battleSnapshotPresentationIssue",
      reason: "missingStatBlockPresentation",
      combatantId: combatant.combatantId,
    });
  }
  return Schema.is(BattleCreatureDisplayNameSchema)(displayName)
    ? Result.succeed({ ...combatant, displayName })
    : Result.fail({
        tag: "battleSnapshotPresentationIssue",
        reason: "invalidDisplayName",
        combatantId: combatant.combatantId,
      });
}
