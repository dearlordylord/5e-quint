import {
  battleAdmittedSpellPresentations,
  battlePresentedSnapshot,
  battleSubjectPresentation,
  discoverBattleActs,
  presentBattleActs,
  presentBattleSnapshot,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleInterruptProcedureChoice,
  type BattlePresentedSnapshot,
  type BattleSnapshotPresentationIssues,
} from "@dnd/battle-runtime";
import { Either } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import type { BattleFillSession } from "./session-store.ts";
import { errorContent } from "./tool-content.ts";

type BattlePayloadPresentationIssues = BattleSnapshotPresentationIssues;

type BattlePresentationProjection = {
  readonly snapshot: BattlePresentedSnapshot | null;
  readonly availableActs: ReturnType<typeof discoverBattleActs>;
  readonly admittedSpellPresentations: ReturnType<
    typeof battleAdmittedSpellPresentations
  >;
  readonly presentedInterruptChoices: ReturnType<
    typeof presentedInterruptChoices
  >;
};
type ActiveBattlePresentationProjection = BattlePresentationProjection & {
  readonly snapshot: BattlePresentedSnapshot;
};

export function unknownStatBlockContent(statBlockId: string, error: unknown) {
  return errorContent(`Unknown Stat Block: ${statBlockId}`, {
    code: "UNKNOWN_STAT_BLOCK",
    statBlockId,
    message: error instanceof Error ? error.message : String(error),
  });
}

export function noStoredBattleContent() {
  return errorContent("No battle session has been started.", {
    code: "NO_BATTLE_SESSION",
  });
}

export function pendingBattleFillsContent(
  pendingFills: BattleFillSession,
  message: string,
) {
  return errorContent(message, {
    code: "BATTLE_FILLS_PENDING",
    pendingSubject: pendingFills.subject,
  });
}

export function battleSessionPayload(
  root: McpCompositionRoot,
  session: BattleRuntimeSession | null,
) {
  const presentation = battlePresentationProjection(session);
  return Either.map(presentation, (value) => ({
    ...value,
    session: root.sessionStore.snapshot(),
  }));
}

export function battleResolutionPayload(
  root: McpCompositionRoot,
  result: BattleRuntimeResolutionResult,
) {
  const presentation = battleResultPresentationProjection(result);
  return Either.map(presentation, (value) => ({
    result: battleResolutionResultPayload(result, value.snapshot),
    ...value,
    snapshot: value.snapshot,
    session: root.sessionStore.snapshot(),
  }));
}

function battleResultPresentationProjection(
  result: BattleRuntimeResolutionResult,
): Either.Either<
  ActiveBattlePresentationProjection,
  BattleSnapshotPresentationIssues
> {
  return Either.map(
    presentBattleSnapshot(result.session, result.snapshot),
    (snapshot) => ({
      snapshot,
      availableActs: presentBattleActs(result.session, result.snapshot.acts),
      admittedSpellPresentations: battleAdmittedSpellPresentations(
        result.session,
      ),
      presentedInterruptChoices: presentedInterruptChoices(
        result.session,
        result.snapshot.pendingInterrupt?.choices ?? [],
      ),
    }),
  );
}

function battlePresentationProjection(
  session: BattleRuntimeSession,
): Either.Either<
  ActiveBattlePresentationProjection,
  BattleSnapshotPresentationIssues
>;
function battlePresentationProjection(
  session: BattleRuntimeSession | null,
): Either.Either<
  BattlePresentationProjection,
  BattleSnapshotPresentationIssues
>;
function battlePresentationProjection(
  session: BattleRuntimeSession | null,
): Either.Either<
  BattlePresentationProjection,
  BattleSnapshotPresentationIssues
> {
  if (session === null) {
    return Either.right({
      snapshot: null,
      availableActs: [] as const,
      admittedSpellPresentations: [] as const,
      presentedInterruptChoices: [] as const,
    });
  }
  return Either.map(battlePresentedSnapshot(session), (snapshot) => ({
    snapshot,
    availableActs: discoverBattleActs(session),
    admittedSpellPresentations: battleAdmittedSpellPresentations(session),
    presentedInterruptChoices: presentedInterruptChoices(
      session,
      snapshot.pendingInterrupt?.choices ?? [],
    ),
  }));
}

export function battleSnapshotPresentationIssueContent(
  issues: BattlePayloadPresentationIssues,
) {
  return errorContent("Battle presentation context is incomplete.", {
    code: "BATTLE_SNAPSHOT_PRESENTATION_INCOMPLETE",
    issues,
  });
}

export function presentedInterruptChoices(
  session: BattleRuntimeSession,
  choices: readonly BattleInterruptProcedureChoice[],
) {
  return choices.flatMap((choice) => {
    if (choice.kind === "reactionRollOrDamageReduction") return [];
    const presentation = battleSubjectPresentation(session, choice.subject);
    return presentation === undefined ? [] : [{ choice, presentation }];
  });
}

export function battleResolutionResultPayload(
  result: BattleRuntimeResolutionResult,
  snapshot: BattlePresentedSnapshot,
) {
  if (result.tag === "resolved") {
    return {
      tag: result.tag,
      snapshot,
      ...(result.objectDamages === undefined
        ? {}
        : { objectDamages: result.objectDamages }),
      ...(result.objectIgnitions === undefined
        ? {}
        : { objectIgnitions: result.objectIgnitions }),
      ...(result.droppedObjects === undefined
        ? {}
        : { droppedObjects: result.droppedObjects }),
      ...(result.shovePushes === undefined
        ? {}
        : { shovePushes: result.shovePushes }),
    };
  }
  if (result.tag === "needsHoles") {
    return {
      tag: result.tag,
      subject: result.subject,
      holes: result.holes,
      snapshot,
    };
  }

  return {
    tag: result.tag,
    reason: result.reason,
    message: result.message,
    snapshot,
  };
}
