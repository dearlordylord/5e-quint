import * as Either from "effect/Either";
import { Schema } from "effect";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  AvailableBattleAct,
  BattleCreatureSnapshot,
  BattleActPresentation,
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
} from "./battle-reducer/battle-codecs.ts";

export type BattlePresentedInterruptChoice =
  | {
      readonly choice: Extract<
        BattleInterruptProcedureChoice,
        { readonly kind: "reactionRollOrDamageReduction" }
      >;
    }
  | {
      readonly choice: Exclude<
        BattleInterruptProcedureChoice,
        { readonly kind: "reactionRollOrDamageReduction" }
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

type EncodedBattleAvailableAct = Schema.Schema.Encoded<
  typeof BattleActDiscoveryCandidateSchema
> & {
  readonly label: string;
  readonly summary: string;
  readonly presentation: Schema.Schema.Encoded<
    typeof BattleActPresentationSchema
  >;
};

type DecodedBattleAvailableAct = Schema.Schema.Type<
  typeof BattleActDiscoveryCandidateSchema
> & {
  readonly label: Schema.Schema.Type<typeof Schema.NonEmptyTrimmedString>;
  readonly summary: Schema.Schema.Type<typeof Schema.NonEmptyTrimmedString>;
  readonly presentation: Schema.Schema.Type<typeof BattleActPresentationSchema>;
};

type EncodedBattlePresentedInterruptChoice =
  | {
      readonly choice: Schema.Schema.Encoded<
        typeof BattleInterruptProcedureModifierChoiceSchema
      >;
    }
  | {
      readonly choice: Schema.Schema.Encoded<
        typeof BattleInterruptProcedureChoiceWithSubjectSchema
      >;
      readonly presentation: Schema.Schema.Encoded<
        typeof BattleActPresentationSchema
      >;
    };

type DecodedBattlePresentedInterruptChoice =
  | {
      readonly choice: Schema.Schema.Type<
        typeof BattleInterruptProcedureModifierChoiceSchema
      >;
    }
  | {
      readonly choice: Schema.Schema.Type<
        typeof BattleInterruptProcedureChoiceWithSubjectSchema
      >;
      readonly presentation: Schema.Schema.Type<
        typeof BattleActPresentationSchema
      >;
    };

type EncodedBattlePresentedInterruptDecisionFrontier = Omit<
  Schema.Schema.Encoded<typeof BattleInterruptDecisionFrontierSchema>,
  "choices"
> & {
  readonly choices: ReadonlyNonEmptyArray<EncodedBattlePresentedInterruptChoice>;
};

type DecodedBattlePresentedInterruptDecisionFrontier = Omit<
  Schema.Schema.Type<typeof BattleInterruptDecisionFrontierSchema>,
  "choices"
> & {
  readonly choices: ReadonlyNonEmptyArray<DecodedBattlePresentedInterruptChoice>;
};

type DecodedBattlePresentedCheckpointFrontierEnvelope = {
  readonly checkpoint: Schema.Schema.Type<typeof BattlePresentedSnapshotSchema>;
  readonly frontier:
    | {
        readonly kind: "acts";
        readonly acts: readonly DecodedBattleAvailableAct[];
      }
    | Schema.Schema.Type<typeof BattleCheckpointFrontierHolesSchema>
    | DecodedBattlePresentedInterruptDecisionFrontier;
};

type EncodedBattlePresentedCheckpointFrontierEnvelope = {
  readonly checkpoint: Schema.Schema.Encoded<
    typeof BattlePresentedSnapshotSchema
  >;
  readonly frontier:
    | {
        readonly kind: "acts";
        readonly acts: readonly EncodedBattleAvailableAct[];
      }
    | Schema.Schema.Encoded<typeof BattleCheckpointFrontierHolesSchema>
    | EncodedBattlePresentedInterruptDecisionFrontier;
};

const BattleAvailableActSchema = Schema.Struct({
  ...BattleActDiscoveryCandidateSchema.fields,
  label: Schema.NonEmptyTrimmedString,
  summary: Schema.NonEmptyTrimmedString,
  presentation: BattleActPresentationSchema,
});

const BattlePresentedInterruptChoiceSchema = Schema.Union(
  Schema.Struct({ choice: BattleInterruptProcedureModifierChoiceSchema }),
  Schema.Struct({
    choice: BattleInterruptProcedureChoiceWithSubjectSchema,
    presentation: BattleActPresentationSchema,
  }),
);

export const BattlePresentedCheckpointFrontierEnvelopeSchema: Schema.Schema<
  DecodedBattlePresentedCheckpointFrontierEnvelope,
  EncodedBattlePresentedCheckpointFrontierEnvelope,
  never
> = Schema.Struct({
  checkpoint: BattlePresentedSnapshotSchema,
  frontier: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("acts"),
      acts: Schema.Array(BattleAvailableActSchema),
    }),
    BattleCheckpointFrontierHolesSchema,
    Schema.Struct({
      ...BattleInterruptDecisionFrontierSchema.fields,
      choices: Schema.NonEmptyArray(BattlePresentedInterruptChoiceSchema),
    }),
  ),
}).annotations({ identifier: "BattlePresentedCheckpointFrontierEnvelope" });

export function battlePresentedSnapshot(
  session: BattleRuntimeSession,
): Either.Either<BattlePresentedSnapshot, BattleSnapshotPresentationIssues> {
  return presentBattleSnapshot(session, snapshotBattle(session.state));
}

export function presentBattleSnapshot(
  session: BattleRuntimeSession,
  snapshot: import("./battle-state-execution.ts").BattleSnapshot,
): Either.Either<BattlePresentedSnapshot, BattleSnapshotPresentationIssues> {
  return Either.map(
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
): Either.Either<
  BattlePresentedCheckpointFrontierEnvelope,
  BattlePresentationIssues
> {
  return Either.flatMap(
    presentBattleSnapshot(session, envelope.checkpoint),
    (checkpoint) =>
      Either.map(presentFrontier(session, envelope.frontier), (frontier) => ({
        checkpoint,
        frontier,
      })),
  );
}

export function battlePresentedCheckpointFrontierEnvelope(
  session: BattleRuntimeSession,
): Either.Either<
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
): Either.Either<
  BattlePresentedCheckpointFrontierEnvelope["frontier"],
  BattlePresentationIssues
> {
  if (frontier.kind === "acts") {
    return Either.right({
      kind: "acts",
      acts: presentBattleActs(session, frontier.acts),
    });
  }
  if (frontier.kind === "holes") {
    return Either.right(frontier);
  }
  return Either.map(
    presentBattleInterruptChoices(session, frontier.choices),
    (choices) => ({ ...frontier, choices }),
  );
}

export function presentBattleInterruptChoices(
  session: BattleRuntimeSession,
  choices: ReadonlyNonEmptyArray<BattleInterruptProcedureChoice>,
): Either.Either<
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
): Either.Either<
  BattlePresentedInterruptChoice,
  BattleInterruptChoicePresentationIssue
> {
  if (choice.kind === "reactionRollOrDamageReduction") {
    // Modifier-only choices are mechanics-owned and have no authored act
    // presentation to join. They must remain visible in the frontier.
    return Either.right({ choice });
  }
  const presentation = battleSubjectPresentation(session, choice.subject);
  if (presentation === undefined) {
    return Either.left({
      tag: "battleInterruptChoicePresentationIssue",
      reason: "missingSubjectPresentation",
      reactorId: choice.reactorId,
      choiceKind: choice.kind,
      subject: choice.subject,
    });
  }
  return Either.right({ choice, presentation });
}

function presentedCombatant(
  session: BattleRuntimeSession,
  combatant: BattleCreatureSnapshot,
): Either.Either<
  BattlePresentedCreatureSnapshot,
  BattleSnapshotPresentationIssue
> {
  const displayName = battleCreaturePresentationDisplayName(
    session.state,
    session.context,
    combatant.combatantId,
  );
  if (displayName === null) {
    return Either.left({
      tag: "battleSnapshotPresentationIssue",
      reason: "missingStatBlockPresentation",
      combatantId: combatant.combatantId,
    });
  }
  return Schema.is(BattleCreatureDisplayNameSchema)(displayName)
    ? Either.right({ ...combatant, displayName })
    : Either.left({
        tag: "battleSnapshotPresentationIssue",
        reason: "invalidDisplayName",
        combatantId: combatant.combatantId,
      });
}
