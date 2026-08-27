import * as Either from "effect/Either";
import { Schema } from "effect";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type {
  AvailableBattleAct,
  BattleCreatureSnapshot,
  BattleActPresentation,
  BattleInterruptDecisionFrontier,
  BattleInterruptProcedureChoice,
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
        readonly choices: readonly BattlePresentedInterruptChoice[];
      });
};

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
  BattleSnapshotPresentationIssues
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
  BattleSnapshotPresentationIssues
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
  BattleSnapshotPresentationIssues
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
  choices: readonly BattleInterruptProcedureChoice[],
): Either.Either<
  readonly BattlePresentedInterruptChoice[],
  BattleSnapshotPresentationIssues
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
  BattleSnapshotPresentationIssue
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
