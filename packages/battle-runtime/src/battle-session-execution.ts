// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
import { optionalProperty } from "./optional-property.ts";
import { Match, Result } from "effect";
import type { BattleReducerRouteEvents } from "./battle-reducer/reducer-route-protocol.ts";
import { battleReducerRouteForResolution } from "./battle-reducer/reducer-route.ts";
import {
  discoverBattleActCandidates,
  endTurn,
  openCreatureFallsInterruptWindow,
  resolveAdmittedBattleSubject,
  resolveAdmittedFindFamiliarReappearanceSubject,
  resolveBattleInterrupt,
  snapshotBattle,
} from "./battle-execution-composition.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import {
  battleRuntimeSessionWithStatBlockPresentation,
  battleRuntimeSessionWithState,
  type BattleStatBlockPresentationSource,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import type { CombatantId } from "./identity.ts";
import { sameBattleSubject, type BattleSubject } from "./battle-subjects.ts";
import {
  currentInterruptFrame,
  interruptDecisionFrontier,
} from "./battle-reducer/battle-snapshot.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  BattleActDiscoveryCandidate,
  BattleFill,
  BattleHole,
  BattleInterruptDecisionFrontier,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSnapshot,
  BattleState,
  BattleTargetSpatialFact,
} from "./battle-state-execution.ts";
import type { BattleStatBlockExecutionCatalog } from "./battle-state-execution.ts";
import { admitFindFamiliarReappearance } from "./find-familiar-admission.ts";
import {
  admitTableD20TestCircumstanceDecisions,
  battleD20TestCircumstanceRequests,
  retainAdmittedAttackRollTableSource,
  type BattleD20TestCircumstanceRequest,
  type D20TestResolutionId,
  type TableD20TestCircumstanceDecision,
  type TableD20TestCircumstanceDecisionAdmissionIssue,
} from "./d20-test-circumstance.ts";

export type BattleRuntimeResolutionInput = {
  readonly session: BattleRuntimeSession;
  readonly subject: BattleSubject;
  readonly fills: BattleResolutionInput["fills"];
  readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
};

type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;
type NeedsHolesBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;
export type BattleCheckpointFrontierEnvelope = {
  readonly checkpoint: BattleSnapshot;
  readonly frontier:
    | {
        readonly kind: "acts";
        readonly acts: readonly BattleActDiscoveryCandidate[];
      }
    | {
        readonly kind: "holes";
        readonly subject: BattleSubject;
        readonly holes: ReadonlyNonEmptyArray<BattleHole>;
        readonly continuation:
          | { readonly kind: "ordinaryReplay" }
          | { readonly kind: "runtimeOwnedInterrupt" };
      }
    | BattleInterruptDecisionFrontier;
};

type BattleActsFrontier = Extract<
  BattleCheckpointFrontierEnvelope["frontier"],
  { readonly kind: "acts" }
>;
export type BattleResolvedCheckpointFrontierEnvelope = Omit<
  BattleCheckpointFrontierEnvelope,
  "frontier"
> & {
  readonly frontier: BattleActsFrontier | BattleInterruptDecisionFrontier;
};

type BattleHolesFrontier = Extract<
  BattleCheckpointFrontierEnvelope["frontier"],
  { readonly kind: "holes" }
>;
type BattleNeedsHolesEnvelope = Omit<
  BattleCheckpointFrontierEnvelope,
  "frontier"
> & {
  readonly frontier: BattleHolesFrontier | BattleInterruptDecisionFrontier;
};

export type BattleRuntimeResolutionResult =
  | {
      readonly tag: "resolved";
      readonly session: BattleRuntimeSession;
      readonly envelope: BattleResolvedCheckpointFrontierEnvelope;
      readonly routeEvents?: BattleReducerRouteEvents;
      readonly objectDamages?: ResolvedBattleResult["objectDamages"];
      readonly objectIgnitions?: ResolvedBattleResult["objectIgnitions"];
      readonly droppedObjects?: ResolvedBattleResult["droppedObjects"];
      readonly shovePushes?: ResolvedBattleResult["shovePushes"];
      readonly teleports?: ResolvedBattleResult["teleports"];
      readonly movements?: ResolvedBattleResult["movements"];
    }
  | {
      readonly tag: "needsHoles";
      readonly session: BattleRuntimeSession;
      readonly envelope: BattleNeedsHolesEnvelope;
      readonly routeEvents?: BattleReducerRouteEvents;
    }
  | {
      readonly tag: "invalid";
      readonly session: BattleRuntimeSession;
      readonly reason: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >["reason"];
      readonly message: string;
      readonly envelope: BattleCheckpointFrontierEnvelope;
      readonly routeEvents?: BattleReducerRouteEvents;
    };

/**
 * Read the single runtime-owned checkpoint/frontier envelope for the current
 * state.  Consumers must use this boundary instead of projecting reducer
 * state fields independently.
 */
export function currentBattleCheckpointFrontierEnvelope(
  session: BattleRuntimeSession,
): BattleCheckpointFrontierEnvelope {
  return battleCheckpointFrontierEnvelope(session.state);
}

/** Project the runtime-owned checkpoint and continuation frontier from state. */
export function battleCheckpointFrontierEnvelope(
  state: BattleState,
): BattleCheckpointFrontierEnvelope {
  return battleCurrentFrontierEnvelope(state);
}

export function battleFrontierHoles(
  envelope: BattleCheckpointFrontierEnvelope,
): BattleHolesFrontier | null {
  return Match.value(envelope.frontier).pipe(
    Match.when({ kind: "holes" }, (frontier) => frontier),
    Match.orElse(() => null),
  );
}

export function battleFrontierInterruptDecision(
  envelope: BattleCheckpointFrontierEnvelope,
): BattleInterruptDecisionFrontier | null {
  return Match.value(envelope.frontier).pipe(
    Match.when({ kind: "interruptDecision" }, (frontier) => frontier),
    Match.orElse(() => null),
  );
}

/** Read interrupt choices from a live reducer state through its public frontier. */
export function battleFrontierInterruptDecisionForState(
  state: BattleState,
): BattleInterruptDecisionFrontier | null {
  return battleFrontierInterruptDecision(
    battleCheckpointFrontierEnvelope(state),
  );
}

export type BattleRuntimeTableD20TestResolutionResult =
  | Extract<BattleRuntimeResolutionResult, { readonly tag: "resolved" }>
  | (Extract<BattleRuntimeResolutionResult, { readonly tag: "needsHoles" }> & {
      readonly d20TestCircumstanceRequests: readonly BattleD20TestCircumstanceRequest[];
    })
  | (Extract<BattleRuntimeResolutionResult, { readonly tag: "invalid" }> &
      (
        | {
            readonly tableD20TestCircumstanceDecisionIssue: TableD20TestCircumstanceDecisionAdmissionIssue;
          }
        | { readonly tableD20TestCircumstanceDecisionIssue?: never }
      ));

const byBattleResolutionTag = Match.discriminator("tag");

function battleActsEnvelope(
  state: BattleRuntimeSession["state"],
): BattleResolvedCheckpointFrontierEnvelope {
  return {
    checkpoint: snapshotBattle(state),
    frontier: {
      kind: "acts",
      acts: discoverBattleActCandidates(state),
    },
  };
}

function battleResolvedFrontierEnvelope(
  state: BattleRuntimeSession["state"],
): BattleResolvedCheckpointFrontierEnvelope {
  const interruptFrontier = interruptDecisionFrontier(state);
  return interruptFrontier === null
    ? battleActsEnvelope(state)
    : {
        checkpoint: snapshotBattle(state),
        frontier: interruptFrontier,
      };
}

function battleCurrentFrontierEnvelope(
  state: BattleRuntimeSession["state"],
): BattleCheckpointFrontierEnvelope {
  const interruptFrontier = interruptDecisionFrontier(state);
  if (interruptFrontier !== null) {
    return {
      checkpoint: snapshotBattle(state),
      frontier: interruptFrontier,
    };
  }
  const continuation = battleCurrentContinuation(state);
  if (continuation !== null) {
    const pending = resolveBattleSubject({
      state,
      subject: continuation.subject,
      fills: continuation.fills,
    });
    if (pending.tag === "needsHoles") {
      const envelope = battleHolesEnvelope(
        state,
        pending.subject,
        pending.holes,
        "runtimeOwnedInterrupt",
      );
      if (envelope !== null) return envelope;
    }
  }
  return battleActsEnvelope(state);
}

function battleCurrentContinuation(state: BattleRuntimeSession["state"]): {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
} | null {
  const frame = currentInterruptFrame(state);
  if (frame === null) return null;
  const attackDamageContinuation = ({
    continuation,
  }: {
    readonly continuation: { readonly participant: BattleSubject };
  }) => ({ subject: continuation.participant, fills: [] });
  return Match.value(frame).pipe(
    Match.when({ kind: "interruptCheckpoint" }, ({ frame: checkpoint }) => {
      const activeInterrupt = checkpoint.activeInterrupt;
      return activeInterrupt === undefined
        ? null
        : {
            subject: activeInterrupt.subject,
            fills: activeInterrupt.fills,
          };
    }),
    Match.when({ kind: "replayContinuation" }, ({ continuation }) => ({
      subject: continuation.subject,
      fills: continuation.fills,
    })),
    Match.when(
      { kind: "attackDamageContinuationConcentration" },
      attackDamageContinuation,
    ),
    Match.when(
      { kind: "attackDamageContinuationCunningStrike" },
      attackDamageContinuation,
    ),
    Match.when({ kind: "flySpeedGrantEndFallCleanup" }, () => null),
    Match.when({ kind: "fallDamageLandingMitigation" }, () => null),
    Match.exhaustive,
  );
}

function battleHolesEnvelope(
  state: BattleRuntimeSession["state"],
  subject: BattleSubject,
  holes: readonly BattleHole[],
  continuation: "ordinaryReplay" | "runtimeOwnedInterrupt",
): BattleNeedsHolesEnvelope | null {
  const firstHole = holes[0];
  if (firstHole === undefined) return null;
  const nonEmptyHoles: ReadonlyNonEmptyArray<BattleHole> = [
    firstHole,
    ...holes.slice(1),
  ];
  return {
    checkpoint: snapshotBattle(state),
    frontier: {
      kind: "holes",
      subject,
      holes: nonEmptyHoles,
      continuation: { kind: continuation },
    },
  };
}

function precedingBattleFrontierEnvelope(
  input: BattleRuntimeResolutionInput,
): BattleCheckpointFrontierEnvelope {
  if (input.fills.length === 0) {
    return battleCurrentFrontierEnvelope(input.session.state);
  }
  const preceding = resolveBattleRuntimeSubject({
    ...input,
    fills: input.fills.slice(0, -1),
  });
  return preceding.tag === "resolved"
    ? battleResolvedFrontierEnvelope(input.session.state)
    : preceding.envelope;
}

function invalidBattleRuntimeResult(
  input: BattleRuntimeResolutionInput,
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
  message: string,
): Extract<BattleRuntimeResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    session: input.session,
    reason,
    message,
    envelope: precedingBattleFrontierEnvelope(input),
  };
}

function rolledD20TestRequests(
  requests: readonly BattleD20TestCircumstanceRequest[],
  fill: BattleFill | undefined,
): readonly BattleD20TestCircumstanceRequest[] {
  const rolledSavingThrowTargetIds =
    fill?.kind === "concentrationSavingThrow" && fill.value.withoutRoll === true
      ? new Set<CombatantId>()
      : fill?.kind === "savingThrowOutcome"
        ? new Set(
            fill.value.outcomes.flatMap((outcome) =>
              outcome.withoutRoll === true ? [] : [outcome.targetId],
            ),
          )
        : undefined;
  return rolledSavingThrowTargetIds === undefined
    ? requests
    : requests.filter(
        (request) =>
          request.testKind !== "savingThrow" ||
          (request.targetId !== undefined &&
            rolledSavingThrowTargetIds.has(request.targetId)),
      );
}

export function resolveBattleRuntimeSubject(
  input: BattleRuntimeResolutionInput,
): BattleRuntimeResolutionResult {
  if (
    input.subject.tag === "companionLifecycle" &&
    input.subject.action === "reappear"
  ) {
    if (input.statBlockCatalog === undefined) {
      return invalidBattleRuntimeResult(
        input,
        "invalidFill",
        "Familiar reappearance requires a Stat Block catalog.",
      );
    }
    const admission = admitFindFamiliarReappearance({
      state: input.session.state,
      casterId: input.subject.actorId,
      catalog: input.statBlockCatalog,
    });
    if (Result.isFailure(admission)) {
      return invalidBattleRuntimeResult(
        input,
        "invalidFill",
        admission.failure.message,
      );
    }
    const result = resolveAdmittedFindFamiliarReappearanceSubject({
      fills: input.fills,
      admission: admission.success.mechanics,
    });
    return battleRuntimeResolutionWithFamiliarPresentation(
      input.session,
      result,
      admission.success.mechanics.combatantAdmission.combatantId,
      admission.success.presentation,
      input,
    );
  }
  return battleRuntimeResolutionFromMechanical(
    input.session,
    resolveBattleSubject({
      state: input.session.state,
      subject: input.subject,
      fills: input.fills,
    }),
    "ordinary",
    input,
  );
}

function appendUnseenD20TestRequests(
  accumulated: BattleD20TestCircumstanceRequest[],
  projected: readonly BattleD20TestCircumstanceRequest[],
): void {
  for (const request of projected) {
    const alreadyAccumulated = accumulated.some(
      ({ requestRef }) => requestRef === request.requestRef,
    );
    if (!alreadyAccumulated) accumulated.push(request);
  }
}

function retainAttackRollTableSourceForFrontier(input: {
  readonly fill: BattleFill | undefined;
  readonly holes: readonly BattleHole[];
  readonly requests: readonly BattleD20TestCircumstanceRequest[];
  readonly decisions: ReadonlyMap<
    BattleD20TestCircumstanceRequest["requestRef"],
    TableD20TestCircumstanceDecision
  >;
}): void {
  if (input.fill?.kind !== "attackRoll") return;
  const attackHole = input.holes.find(
    (hole) => hole.kind === "attackRoll" && hole.holeId === input.fill?.holeId,
  );
  const attackRequest = input.requests.find(
    (request) =>
      request.testKind === "attackRoll" &&
      request.holeInstanceKey === attackHole?.holeInstanceKey,
  );
  const decision =
    attackRequest === undefined
      ? undefined
      : input.decisions.get(attackRequest.requestRef);
  if (decision?.testKind === "attackRoll") {
    retainAdmittedAttackRollTableSource(input.fill.value, decision.source);
  }
}

function subjectD20TestRequests(input: {
  readonly resolution: BattleRuntimeResolutionInput;
  readonly resolutionId: D20TestResolutionId;
  readonly fills: readonly BattleFill[];
  readonly decisions: ReadonlyMap<
    BattleD20TestCircumstanceRequest["requestRef"],
    TableD20TestCircumstanceDecision
  >;
}): readonly BattleD20TestCircumstanceRequest[] {
  const requests: BattleD20TestCircumstanceRequest[] = [];
  for (let fillIndex = 0; fillIndex <= input.fills.length; fillIndex += 1) {
    const frontier = resolveBattleRuntimeSubject({
      ...input.resolution,
      fills: input.fills.slice(0, fillIndex),
    });
    if (frontier.tag !== "needsHoles") continue;
    if (frontier.envelope.frontier.kind !== "holes") continue;
    const fill = input.fills[fillIndex];
    const frontierRequests = rolledD20TestRequests(
      battleD20TestCircumstanceRequests({
        resolutionId: input.resolutionId,
        holes: frontier.envelope.frontier.holes,
        resolvedFills: input.fills.slice(0, fillIndex),
      }),
      fill,
    );
    appendUnseenD20TestRequests(requests, frontierRequests);
    retainAttackRollTableSourceForFrontier({
      fill,
      holes: frontier.envelope.frontier.holes,
      requests: frontierRequests,
      decisions: input.decisions,
    });
  }
  return requests;
}

export function resolveBattleRuntimeSubjectWithTableD20TestCircumstances(
  input: BattleRuntimeResolutionInput & {
    readonly d20TestResolutionId: D20TestResolutionId;
    readonly tableD20TestCircumstanceDecisions: readonly TableD20TestCircumstanceDecision[];
  },
): BattleRuntimeTableD20TestResolutionResult {
  const fills = input.fills.map((fill) =>
    fill.kind === "attackRoll"
      ? {
          ...fill,
          value: { ...fill.value },
        }
      : fill,
  );
  const decisionByRequestRef = new Map(
    input.tableD20TestCircumstanceDecisions.map((decision) => [
      decision.requestRef,
      decision,
    ]),
  );
  const requests = subjectD20TestRequests({
    resolution: input,
    resolutionId: input.d20TestResolutionId,
    fills,
    decisions: decisionByRequestRef,
  });
  const admission = admitTableD20TestCircumstanceDecisions({
    requests,
    decisions: input.tableD20TestCircumstanceDecisions,
  });
  if (Result.isFailure(admission)) {
    return {
      ...invalidBattleRuntimeResult(
        input,
        "invalidFill",
        admission.failure.issues.map(({ message }) => message).join(" "),
      ),
      tableD20TestCircumstanceDecisionIssue: admission.failure,
    };
  }
  const result = resolveBattleRuntimeSubject({
    ...input,
    fills,
  });
  return result.tag === "needsHoles"
    ? {
        ...result,
        d20TestCircumstanceRequests:
          result.envelope.frontier.kind === "holes"
            ? battleD20TestCircumstanceRequests({
                resolutionId: input.d20TestResolutionId,
                holes: result.envelope.frontier.holes,
                resolvedFills: fills,
              })
            : [],
      }
    : result;
}

function battleRuntimeResolutionWithFamiliarPresentation(
  session: BattleRuntimeSession,
  result: BattleResolutionResult,
  combatantId: CombatantId,
  presentation: BattleStatBlockPresentationSource,
  retryInput: BattleRuntimeResolutionInput,
): BattleRuntimeResolutionResult {
  if (result.tag !== "resolved") {
    return battleRuntimeResolutionFromMechanical(
      session,
      result,
      "ordinary",
      retryInput,
    );
  }
  const combatant = result.state.combatants.get(combatantId);
  if (combatant === undefined) {
    return invalidBattleRuntimeResult(
      retryInput,
      "invalidFill",
      "Resolved familiar reappearance did not create its admitted combatant.",
    );
  }
  const { state: _state, snapshot: _snapshot, ...outcome } = result;
  return {
    ...outcome,
    envelope: battleResolvedFrontierEnvelope(result.state),
    session: battleRuntimeSessionWithStatBlockPresentation(
      session,
      result.state,
      combatantId,
      presentation,
    ),
  };
}

function battleRuntimeResolutionFromMechanical(
  session: BattleRuntimeSession,
  result: BattleResolutionResult,
  checkpointMode: "ordinary" | "interrupt",
  retryInput?: BattleRuntimeResolutionInput,
): BattleRuntimeResolutionResult {
  return Match.value(result).pipe(
    byBattleResolutionTag(
      "resolved",
      ({ state, snapshot: _snapshot, ...outcome }) => ({
        ...outcome,
        envelope: battleResolvedFrontierEnvelope(state),
        session: battleRuntimeSessionWithState(session, state),
      }),
    ),
    byBattleResolutionTag(
      "needsHoles",
      ({
        state,
        snapshot: _snapshot,
        checkpointBoundary: _checkpointBoundary,
        ...outcome
      }) => {
        const runtimeOwnedInterrupt =
          battleResolutionRequiresRuntimeOwnedInterruptCheckpoint({
            checkpointBoundary: _checkpointBoundary,
            checkpointMode,
            session,
            state,
          });
        const checkpointState = runtimeOwnedInterrupt ? state : session.state;
        const checkpointSession = runtimeOwnedInterrupt
          ? battleRuntimeSessionWithState(session, state)
          : session;
        const interruptFrontier = interruptDecisionFrontier(state);
        const envelope =
          interruptFrontier === null
            ? battleHolesEnvelope(
                checkpointState,
                outcome.subject,
                outcome.holes,
                runtimeOwnedInterrupt
                  ? "runtimeOwnedInterrupt"
                  : "ordinaryReplay",
              )
            : {
                checkpoint: snapshotBattle(state),
                frontier: interruptFrontier,
              };
        if (envelope === null) {
          return {
            tag: "invalid" as const,
            session,
            reason: "invalidFill" as const,
            message: "Battle continuation requires a non-empty Hole frontier.",
            envelope: retryInput
              ? precedingBattleFrontierEnvelope(retryInput)
              : battleCurrentFrontierEnvelope(session.state),
            ...optionalProperty("routeEvents", outcome.routeEvents),
          };
        }
        return {
          tag: "needsHoles" as const,
          session: checkpointSession,
          envelope,
          ...optionalProperty("routeEvents", outcome.routeEvents),
        };
      },
    ),
    byBattleResolutionTag("invalid", ({ snapshot: _snapshot, ...outcome }) => ({
      ...outcome,
      session,
      envelope: retryInput
        ? precedingBattleFrontierEnvelope(retryInput)
        : battleCurrentFrontierEnvelope(session.state),
    })),
    Match.exhaustive,
  );
}

function battleResolutionRequiresRuntimeOwnedInterruptCheckpoint(input: {
  readonly checkpointBoundary: NeedsHolesBattleResult["checkpointBoundary"];
  readonly checkpointMode: "ordinary" | "interrupt";
  readonly session: BattleRuntimeSession;
  readonly state: BattleState;
}): boolean {
  return (
    input.checkpointMode === "interrupt" ||
    input.checkpointBoundary !== undefined ||
    input.session.state.interruptStack.length > 0 ||
    input.state.interruptStack.length > 0
  );
}

export function resolveBattleRuntimeInterrupt(input: {
  readonly session: BattleRuntimeSession;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
}): BattleRuntimeResolutionResult {
  return battleRuntimeResolutionFromMechanical(
    input.session,
    resolveBattleInterrupt({ state: input.session.state, fill: input.fill }),
    "interrupt",
  );
}

export function endBattleRuntimeTurn(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly fills?: readonly BattleFill[];
}): BattleRuntimeResolutionResult {
  return battleRuntimeResolutionFromMechanical(
    input.session,
    endTurn({
      state: input.session.state,
      actorId: input.actorId,
      ...optionalProperty("fills", input.fills),
    }),
    "ordinary",
  );
}

type BattleRuntimeTurnD20TestResolutionInput = {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly fills: readonly BattleFill[];
  readonly d20TestResolutionId: D20TestResolutionId;
  readonly tableD20TestCircumstanceDecisions: readonly TableD20TestCircumstanceDecision[];
};

function endBattleRuntimeTurnD20TestRequests(
  input: BattleRuntimeTurnD20TestResolutionInput,
): readonly BattleD20TestCircumstanceRequest[] {
  const requests: BattleD20TestCircumstanceRequest[] = [];
  for (let fillIndex = 0; fillIndex <= input.fills.length; fillIndex += 1) {
    const frontier = endBattleRuntimeTurn({
      session: input.session,
      actorId: input.actorId,
      fills: input.fills.slice(0, fillIndex),
    });
    if (frontier.tag !== "needsHoles") continue;
    if (frontier.envelope.frontier.kind !== "holes") continue;
    const fill = input.fills[fillIndex];
    const frontierRequests = rolledD20TestRequests(
      battleD20TestCircumstanceRequests({
        resolutionId: input.d20TestResolutionId,
        holes: frontier.envelope.frontier.holes,
        resolvedFills: input.fills.slice(0, fillIndex),
      }),
      fill,
    );
    appendUnseenD20TestRequests(requests, frontierRequests);
  }
  return requests;
}

export function endBattleRuntimeTurnWithTableD20TestCircumstances(
  input: BattleRuntimeTurnD20TestResolutionInput,
): BattleRuntimeTableD20TestResolutionResult {
  const requests = endBattleRuntimeTurnD20TestRequests(input);
  const admission = admitTableD20TestCircumstanceDecisions({
    requests,
    decisions: input.tableD20TestCircumstanceDecisions,
  });
  if (Result.isFailure(admission)) {
    const retry = endBattleRuntimeTurn({
      session: input.session,
      actorId: input.actorId,
      fills: input.fills,
    });
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message: admission.failure.issues.map(({ message }) => message).join(" "),
      envelope:
        retry.tag === "resolved"
          ? battleResolvedFrontierEnvelope(input.session.state)
          : retry.envelope,
      tableD20TestCircumstanceDecisionIssue: admission.failure,
    };
  }
  const result = endBattleRuntimeTurn(input);
  return result.tag === "needsHoles"
    ? {
        ...result,
        d20TestCircumstanceRequests:
          result.envelope.frontier.kind === "holes"
            ? battleD20TestCircumstanceRequests({
                resolutionId: input.d20TestResolutionId,
                holes: result.envelope.frontier.holes,
                resolvedFills: input.fills,
              })
            : [],
      }
    : result;
}

export function openCreatureFallsRuntimeInterruptWindow(input: {
  readonly session: BattleRuntimeSession;
  readonly fallingCreatureId: CombatantId;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
}): BattleRuntimeResolutionResult {
  return battleRuntimeResolutionFromMechanical(
    input.session,
    openCreatureFallsInterruptWindow({
      state: input.session.state,
      fallingCreatureId: input.fallingCreatureId,
      reactionSpellTargetFacts: input.reactionSpellTargetFacts,
    }),
    "ordinary",
  );
}

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const phase = input.state.subjectResolutionPhase;
  const reportsReadyTrigger =
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "reportReadyTrigger";
  if (hasStaleSubjectContinuation(phase, reportsReadyTrigger, input.subject)) {
    return {
      tag: "invalid",
      reason: "staleSubject",
      message:
        "The pending subject continuation must resolve before another subject can begin.",
      snapshot: snapshotBattle(input.state),
    };
  }
  const dispatchState = input.state;
  const admittedInput = { ...input, state: dispatchState };
  const admission = admitBattleResolutionInput(admittedInput);
  if (admission.tag === "staleCharacterProcedure") {
    return {
      tag: "invalid",
      reason: "staleSubject",
      message:
        "The selected character procedure reference is not bound to this actor.",
      snapshot: snapshotBattle(input.state),
    };
  }
  const mechanical = resolveAdmittedBattleSubject(
    admission.input,
    phase.kind === "subjectContinuation" && !reportsReadyTrigger
      ? phase.handledInterruptTrigger
      : undefined,
  );
  const result = reportsReadyTrigger
    ? mechanicalResultWithPreservedSubjectPhase(
        mechanical,
        input.state.subjectResolutionPhase,
      )
    : mechanical;
  const routeEvents = battleReducerRouteForResolution(admission.input, result);
  return routeEvents === undefined ? result : { ...result, routeEvents };
}

function hasStaleSubjectContinuation(
  phase: BattleResolutionInput["state"]["subjectResolutionPhase"],
  reportsReadyTrigger: boolean,
  subject: BattleSubject,
): boolean {
  return (
    phase.kind === "subjectContinuation" &&
    !reportsReadyTrigger &&
    !sameBattleSubject(phase.subject, subject)
  );
}

function mechanicalResultWithPreservedSubjectPhase(
  result: BattleResolutionResult,
  subjectResolutionPhase: BattleResolutionInput["state"]["subjectResolutionPhase"],
): BattleResolutionResult {
  return result.tag === "invalid"
    ? result
    : {
        ...result,
        state: { ...result.state, subjectResolutionPhase },
        snapshot: snapshotBattle({ ...result.state, subjectResolutionPhase }),
      };
}
