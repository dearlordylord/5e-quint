import { optionalProperty } from "./optional-property.ts";
import type {
  BattleActDiscoveryCandidate,
  AdmittedBattleResolutionInput,
  BattleFill,
  BattleHandledInterruptOccurrence,
  BattleInterruptedProcedure,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSnapshot,
  BattleState,
  BattleAcceptedAttackAmmunitionSpend,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  battleSubjectForReplay,
  sameBattleSubject,
} from "./battle-subjects.ts";
import {
  endTurn as endTurnWithRegistry,
  resolveAdmittedBattleSubject as resolveAdmittedBattleSubjectWithRegistry,
  resolveBattleInterrupt as resolveBattleInterruptWithRegistry,
  resolveAdmittedReplayContinuationSubject,
} from "./battle-reducer/dispatcher.ts";
import {
  openCreatureFallsInterruptWindow as openCreatureFallsInterruptWindowStateOnly,
  resolveFallDamageLanding as resolveFallDamageLandingStateOnly,
  resolveFallingCreatureMitigationLanding as resolveFallingCreatureMitigationLandingStateOnly,
  resolveFlySpeedGrantEndFallCleanup as resolveFlySpeedGrantEndFallCleanupStateOnly,
} from "./battle-reducer/environmental-fall-procedures.ts";
import {
  CompanionLifecycleProcedureExecution,
  resolveAdmittedCompanionReappearanceSubject as resolveAdmittedCompanionReappearanceSubjectStateOnly,
  resolveSpawnedCompanionTouchSpellSubject,
  shareSpawnedCompanionSenses as shareSpawnedCompanionSensesStateOnly,
} from "./battle-reducer/companion-lifecycle-procedures.ts";
import { spawnedCompanionConnectionHole } from "./companion-subjects.ts";
import {
  ReplayContinuationExecution,
  resolveReplayContinuationFromState as resolveReplayContinuationFromStateWithRegistry,
} from "./battle-reducer/replay-continuation.ts";
import type { BattleInterruptTrigger } from "./battle-interrupt-triggers.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { discoverBattleActCandidatesWithExecutionRegistry } from "./battle-reducer/battle-discovery.ts";
import {
  battleSnapshotProjection as battleSnapshotProjectionFromState,
  snapshotBattle as snapshotBattleFromState,
} from "./battle-reducer/battle-snapshot.ts";
import type { SpawnedCompanionWithin100FeetFact } from "./companion-communication.ts";
import type { CombatantId } from "./identity.ts";
import { ATTACK_RESOLVERS } from "./battle-reducer/attack-main.ts";
import { resolveMonkFocusFlurryOfBlowsStrike } from "./battle-reducer/monk-flurry-attack.ts";
import { resolvePactOfTheChainFamiliarReactionAttack } from "./companion-reaction-attack.ts";
import type { BattleAttackRouteResolvers } from "./battle-reducer/attack-resolvers.ts";

const BATTLE_ATTACK_ROUTE_RESOLVERS = {
  ...ATTACK_RESOLVERS,
  resolveMonkFocusFlurryOfBlowsStrike,
  resolvePactOfTheChainFamiliarReactionAttack,
} satisfies BattleAttackRouteResolvers;

export function resolveAdmittedBattleSubject(
  input: AdmittedBattleResolutionInput,
  handledInterruptTrigger?: BattleInterruptTrigger,
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    resolveAdmittedBattleSubjectWithRegistry(
      input,
      executionRegistry,
      BATTLE_ATTACK_ROUTE_RESOLVERS,
      handledInterruptTrigger === undefined ? {} : { handledInterruptTrigger },
    ),
    handledInterruptTrigger,
  );
}

export function resolveBattleInterrupt(input: {
  readonly state: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
}): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    resolveBattleInterruptWithRegistry(
      input,
      executionRegistry,
      BATTLE_ATTACK_ROUTE_RESOLVERS,
    ),
  );
}

export function resolveAdmittedCompanionReappearanceSubject(
  input: Parameters<
    typeof resolveAdmittedCompanionReappearanceSubjectStateOnly
  >[0],
): BattleResolutionResult {
  return battleResolutionWithExecutionSnapshot(
    input.admission.state,
    resolveAdmittedCompanionReappearanceSubjectStateOnly(input),
  );
}

export function endTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly fills?: readonly BattleFill[];
}): BattleResolutionResult {
  const subject = {
    tag: "runtimeCommand" as const,
    actorId: input.actorId,
    command: "endTurn" as const,
  };
  const phase = input.state.subjectResolutionPhase;
  if (
    phase.kind === "subjectContinuation" &&
    !sameBattleSubject(phase.subject, subject)
  ) {
    return {
      tag: "invalid",
      reason: "staleSubject",
      message:
        "The pending subject continuation must resolve before the turn can end.",
      snapshot: snapshotBattle(input.state),
    };
  }
  const dispatchState =
    phase.kind === "subjectContinuation"
      ? {
          ...input.state,
          subjectResolutionPhase: { kind: "subjectSelection" as const },
        }
      : input.state;
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    endTurnWithRegistry(
      { ...input, state: dispatchState },
      executionRegistry,
      BATTLE_ATTACK_ROUTE_RESOLVERS,
    ),
  );
}

export function deliverTouchSpellThroughSpawnedCompanion(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >;
  readonly fills: BattleResolutionInput["fills"];
  readonly fact: SpawnedCompanionWithin100FeetFact;
}): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  if (input.subject.mode.tag !== "cast") {
    return {
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Spawned companion touch delivery requires an immediate spell cast.",
      snapshot: snapshotBattleFromState(input.state),
    };
  }
  const subject: Extract<
    BattleSubject,
    { readonly tag: "spawnedCompanionTouchSpellProxy" }
  > = {
    tag: "spawnedCompanionTouchSpellProxy",
    actorId: input.subject.actorId,
    procedureRef: input.subject.procedureRef,
    companionId: input.fact.familiarId,
    spellAction: input.subject.tag === "actionSpell" ? "action" : "bonusAction",
    mode: input.subject.mode,
    ...optionalProperty("metamagic", input.subject.metamagic),
  };
  const connectionHole = spawnedCompanionConnectionHole({
    ownerId: input.fact.ownerId,
    companionId: input.fact.familiarId,
  });
  return battleResolutionWithExecutionSnapshot(
    input.state,
    resolveSpawnedCompanionTouchSpellSubject(
      {
        state: input.state,
        subject,
        fills: [
          {
            kind: "spawnedCompanionConnection",
            holeId: connectionHole.holeId,
            value: { withinRange: true },
          },
          ...input.fills,
        ],
      },
      CompanionLifecycleProcedureExecution.fromResolver((admitted) =>
        resolveAdmittedBattleSubjectWithRegistry(
          admitted,
          executionRegistry,
          BATTLE_ATTACK_ROUTE_RESOLVERS,
        ),
      ),
      "uncommitted",
    ),
  );
}

export function shareSpawnedCompanionSenses(
  input: Parameters<typeof shareSpawnedCompanionSensesStateOnly>[0],
): BattleResolutionResult {
  return battleResolutionWithExecutionSnapshot(
    input.state,
    shareSpawnedCompanionSensesStateOnly(input),
  );
}

export function openCreatureFallsInterruptWindow(
  input: Parameters<typeof openCreatureFallsInterruptWindowStateOnly>[0],
): BattleResolutionResult {
  return battleResolutionWithExecutionSnapshot(
    input.state,
    openCreatureFallsInterruptWindowStateOnly(input),
  );
}

export function resolveFallingCreatureMitigationLanding(
  input: Parameters<typeof resolveFallingCreatureMitigationLandingStateOnly>[0],
): ReturnType<typeof resolveFallingCreatureMitigationLandingStateOnly> {
  return resultWithExecutionSnapshot(
    resolveFallingCreatureMitigationLandingStateOnly(input),
  );
}

export function resolveFallDamageLanding(
  input: Parameters<typeof resolveFallDamageLandingStateOnly>[0],
): ReturnType<typeof resolveFallDamageLandingStateOnly> {
  return resultWithExecutionSnapshot(resolveFallDamageLandingStateOnly(input));
}

export function resolveFlySpeedGrantEndFallCleanup(
  input: Parameters<typeof resolveFlySpeedGrantEndFallCleanupStateOnly>[0],
): ReturnType<typeof resolveFlySpeedGrantEndFallCleanupStateOnly> {
  return resultWithExecutionSnapshot(
    resolveFlySpeedGrantEndFallCleanupStateOnly(input),
  );
}

export function resolveReplayContinuationFromState(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  handledInterruptOccurrence: BattleHandledInterruptOccurrence,
  fills: readonly BattleFill[],
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    state,
    resolveReplayContinuationFromStateWithRegistry({
      state,
      continuation,
      handledInterruptOccurrence,
      fills,
      execution: replayContinuationExecution(executionRegistry),
    }),
  );
}

function replayContinuationExecution(
  executionRegistry: ReturnType<typeof spellProcedureExecutionRegistry>,
): ReplayContinuationExecution {
  return ReplayContinuationExecution.fromExecutionRegistry(
    executionRegistry,
    (admitted, boundExecutionRegistry) =>
      resolveAdmittedReplayContinuationSubject(
        admitted,
        boundExecutionRegistry,
        BATTLE_ATTACK_ROUTE_RESOLVERS,
      ),
  );
}

export function discoverBattleActCandidates(
  state: BattleState,
): readonly BattleActDiscoveryCandidate[] {
  const executionRegistry = spellProcedureExecutionRegistry();
  return discoverBattleActCandidatesWithExecutionRegistry(
    state,
    executionRegistry,
  );
}

export function battleSnapshotProjection(state: BattleState): {
  readonly snapshot: ReturnType<typeof snapshotBattleFromState>;
} {
  return battleSnapshotProjectionFromState(state);
}

export function snapshotBattle(
  state: BattleState,
): ReturnType<typeof snapshotBattleFromState> {
  return snapshotBattleFromState(state);
}

function battleResolutionWithExecutionSnapshot(
  inputState: BattleState,
  result: BattleResolutionResult,
  handledInterruptTrigger?: BattleInterruptTrigger,
): BattleResolutionResult {
  const resolvedSubjectPhase =
    result.tag === "resolved"
      ? completedReportedReadyResumePhase(inputState, result.state)
      : undefined;
  const continuation = continuationMetadata(result, handledInterruptTrigger);
  const phasedResult =
    result.tag === "invalid"
      ? result
      : {
          ...result,
          state: {
            ...result.state,
            subjectResolutionPhase:
              result.tag === "needsHoles"
                ? {
                    kind: "subjectContinuation" as const,
                    subject: battleSubjectForReplay(result.subject),
                    ...optionalProperty(
                      "acceptedAttackAmmunitionSpend",
                      continuation.acceptedAttackAmmunitionSpend,
                    ),
                    ...(continuation.handledInterruptTrigger !== undefined
                      ? {
                          handledInterruptTrigger:
                            continuation.handledInterruptTrigger,
                        }
                      : {}),
                  }
                : (resolvedSubjectPhase ?? {
                    kind: "subjectSelection" as const,
                  }),
          },
        };
  const snapshotState =
    phasedResult.tag === "invalid" ? inputState : phasedResult.state;
  const snapshot = snapshotBattleFromState(snapshotState);
  return {
    ...phasedResult,
    snapshot,
  };
}

function continuationMetadata(
  result: BattleResolutionResult,
  handledInterruptTrigger: BattleInterruptTrigger | undefined,
): {
  readonly handledInterruptTrigger: BattleInterruptTrigger | undefined;
  readonly acceptedAttackAmmunitionSpend:
    | BattleAcceptedAttackAmmunitionSpend
    | undefined;
} {
  if (
    result.tag === "invalid" ||
    result.state.subjectResolutionPhase.kind !== "subjectContinuation"
  ) {
    return {
      handledInterruptTrigger,
      acceptedAttackAmmunitionSpend: undefined,
    };
  }
  return {
    handledInterruptTrigger:
      result.state.subjectResolutionPhase.handledInterruptTrigger ??
      handledInterruptTrigger,
    acceptedAttackAmmunitionSpend:
      result.state.subjectResolutionPhase.acceptedAttackAmmunitionSpend,
  };
}

function completedReportedReadyResumePhase(
  inputState: BattleState,
  resultState: BattleState,
): BattleState["subjectResolutionPhase"] | undefined {
  const inputFrames = inputState.interruptStack.flatMap((frame) =>
    frame.kind === "interruptCheckpoint" &&
    frame.frame.trigger === "reportedReadyTrigger"
      ? [frame.frame]
      : [],
  );
  const remainingFrameCount = resultState.interruptStack.filter(
    (frame) =>
      frame.kind === "interruptCheckpoint" &&
      frame.frame.trigger === "reportedReadyTrigger",
  ).length;
  const resumePhase =
    inputFrames.slice(remainingFrameCount)[0]?.resumeSubjectResolutionPhase;
  return resumePhase?.kind === "subjectContinuation" &&
    (!sameCombatantRoster(inputState, resultState) ||
      !resultState.combatants.has(resumePhase.subject.actorId))
    ? { kind: "subjectSelection" }
    : resumePhase;
}

function sameCombatantRoster(left: BattleState, right: BattleState): boolean {
  return (
    left.combatants.size === right.combatants.size &&
    [...left.combatants.keys()].every((combatantId) =>
      right.combatants.has(combatantId),
    )
  );
}

function resultWithExecutionSnapshot<
  Result extends {
    readonly state: BattleState;
    readonly snapshot: BattleSnapshot;
  },
>(result: Result): Result {
  return {
    ...result,
    snapshot: snapshotBattleFromState(result.state),
  };
}
