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
import { Either, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleFillSession } from "./session-store.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import type { BattleSessionOutputSchema } from "./battle-tool-output.ts";
import { errorContent } from "./tool-content.ts";

type BattlePayloadPresentationIssues = BattleSnapshotPresentationIssues;

export type BattlePresentationProjection = {
  readonly snapshot: BattlePresentedSnapshot | null;
  readonly availableActs: ReturnType<typeof discoverBattleActs>;
  readonly admittedSpellPresentations: ReturnType<
    typeof battleAdmittedSpellPresentations
  >;
  readonly presentedInterruptChoices: ReturnType<
    typeof presentedInterruptChoices
  >;
};
export type ActiveBattlePresentationProjection =
  BattlePresentationProjection & {
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

type BattleSessionPayload = typeof BattleSessionOutputSchema.Type;
type ActiveBattleSessionPayload = Extract<
  BattleSessionPayload,
  { readonly battleState: { readonly tag: "activeBattle" } }
>;
type EmptyBattleSessionPayload = Extract<
  BattleSessionPayload,
  { readonly battleState: { readonly tag: "none" } }
>;

export function battleSessionPayload(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession,
): Either.Either<ActiveBattleSessionPayload, BattleSnapshotPresentationIssues>;
export function battleSessionPayload(
  root: McpPlaySessionRoot,
  session: null,
): Either.Either<EmptyBattleSessionPayload, BattleSnapshotPresentationIssues>;
export function battleSessionPayload(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession | null,
): Either.Either<
  ActiveBattleSessionPayload | EmptyBattleSessionPayload,
  BattleSnapshotPresentationIssues
> {
  if (session === null) {
    const snapshot = root.sessionStore.snapshot();
    const battleState = battleStateSnapshot(root.sessionStore.battleState);
    if (battleState.tag !== "none") {
      throw new Error(
        "Empty battle presentation requires an owned empty state.",
      );
    }
    return Either.right({
      battleState,
      snapshot: null,
      availableActs: [],
      admittedSpellPresentations: [],
      presentedInterruptChoices: [],
      session: snapshot,
    });
  }
  const presentation = battlePresentationProjection(session);
  return Either.map(presentation, (value) => {
    const snapshot = root.sessionStore.snapshot();
    const battleState = battleStateSnapshot(root.sessionStore.battleState);
    if (battleState.tag !== "activeBattle") {
      throw new Error(
        "Active battle presentation requires an owned active state.",
      );
    }
    return { ...value, battleState, session: snapshot };
  });
}

export function initialInitiativeSetupPayload(root: McpPlaySessionRoot) {
  const session = root.sessionStore.snapshot();
  const battleState = battleStateSnapshot(root.sessionStore.battleState);
  if (battleState.tag !== "initialInitiativeSetup") {
    throw new Error("Initial Initiative payload requires owned setup state.");
  }
  return {
    battleState,
    snapshot: null,
    availableActs: [],
    admittedSpellPresentations: [],
    presentedInterruptChoices: [],
    session: { ...session, battleState },
  };
}

export function initialInitiativeSetupStartPayload(root: McpPlaySessionRoot) {
  const session = root.sessionStore.snapshot();
  const battleState = battleStateSnapshot(root.sessionStore.battleState);
  if (battleState.tag !== "initialInitiativeSetup") {
    throw new Error("Initial Initiative payload requires owned setup state.");
  }
  return {
    battleState,
    snapshot: null,
    availableActs: [],
    admittedSpellPresentations: [],
    presentedInterruptChoices: [],
    session: { ...mcpSessionSummary(session), battleState },
  };
}

export function battleResolutionPayload(
  root: McpPlaySessionRoot,
  result: BattleRuntimeResolutionResult,
) {
  const presentation = battleResultPresentationProjection(result);
  return Either.map(presentation, (value) => {
    const battleState = battleStateSnapshot(root.sessionStore.battleState);
    if (battleState.tag !== "activeBattle") {
      throw new Error("Battle resolution requires an active battle state.");
    }
    const session = root.sessionStore.snapshot();
    return {
      result: battleResolutionResultPayload(result, value.snapshot),
      ...value,
      battleState,
      snapshot: value.snapshot,
      session: {
        ...session,
        battleState,
      },
    };
  });
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

export function battlePresentationProjection(
  session: BattleRuntimeSession,
): Either.Either<
  ActiveBattlePresentationProjection,
  BattleSnapshotPresentationIssues
>;
export function battlePresentationProjection(
  session: BattleRuntimeSession | null,
): Either.Either<
  BattlePresentationProjection,
  BattleSnapshotPresentationIssues
>;
export function battlePresentationProjection(
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
  return choices.flatMap((choice) =>
    Match.value(choice).pipe(
      Match.when({ kind: "nestedProcedure" }, (nestedProcedure) => {
        const presentation = battleSubjectPresentation(
          session,
          nestedProcedure.subject,
        );
        return presentation === undefined
          ? []
          : [{ choice: nestedProcedure, presentation }];
      }),
      Match.when({ kind: "reactionModifier" }, () => []),
      Match.exhaustive,
    ),
  );
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
