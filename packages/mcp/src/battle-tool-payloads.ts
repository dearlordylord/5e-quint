import {
  battleAdmittedSpellPresentations,
  battleSnapshotProjection,
  battleSubjectPresentation,
  discoverBattleActs,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { Match } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import type { BattleFillSession } from "./session-store.ts";
import { errorContent } from "./tool-content.ts";

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
  return {
    ...battlePresentationProjection(session),
    session: root.sessionStore.snapshot(),
  };
}

export function battleResolutionPayload(
  root: McpCompositionRoot,
  result: BattleRuntimeResolutionResult,
) {
  const session = root.sessionStore.battleSession;
  const presentation = battlePresentationProjection(session);
  return {
    result: battleResolutionResultPayload(result),
    ...presentation,
    snapshot: presentation.snapshot ?? result.snapshot,
    session: root.sessionStore.snapshot(),
  };
}

function battlePresentationProjection(session: BattleRuntimeSession | null) {
  if (session === null) {
    return {
      snapshot: null,
      availableActs: [],
      admittedSpellPresentations: [],
      presentedInterruptChoices: [],
    };
  }
  const snapshot = battleSnapshotProjection(session.state).snapshot;
  return {
    snapshot,
    availableActs: discoverBattleActs(session),
    admittedSpellPresentations: battleAdmittedSpellPresentations(session),
    presentedInterruptChoices: presentedInterruptChoices(session, snapshot),
  };
}

function presentedInterruptChoices(
  session: BattleRuntimeSession,
  snapshot: ReturnType<typeof battleSnapshotProjection>["snapshot"],
) {
  return (snapshot.pendingInterrupt?.choices ?? []).flatMap((choice) => {
    const present = (subject: BattleSubject) => {
      const presentation = battleSubjectPresentation(session, subject);
      return presentation === undefined ? [] : [{ choice, presentation }];
    };
    return Match.value(choice).pipe(
      Match.discriminatorsExhaustive("kind")({
        releaseReadiedSpell: (value) => present(value.subject),
        releaseReadiedMovement: (value) => present(value.subject),
        castTriggeredReactionSpell: (value) => present(value.subject),
        castAttackHitBonusActionSpell: (value) => present(value.subject),
        opportunityAttack: (value) => present(value.subject),
        retaliationAttack: (value) => present(value.subject),
        reactionRollOrDamageReduction: () => [],
      }),
    );
  });
}

function battleResolutionResultPayload(result: BattleRuntimeResolutionResult) {
  if (result.tag === "resolved") {
    return {
      tag: result.tag,
      snapshot: result.snapshot,
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
      snapshot: result.snapshot,
    };
  }

  return {
    tag: result.tag,
    reason: result.reason,
    message: result.message,
    snapshot: result.snapshot,
  };
}
