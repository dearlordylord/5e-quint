// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
import { optionalProperty } from "./optional-property.ts";
import { Match } from "effect";
import * as Either from "effect/Either";
import type { BattleReducerRouteEvents } from "./battle-reducer/reducer-route-protocol.ts";
import { battleReducerRouteForResolution } from "./battle-reducer/reducer-route.ts";
import {
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
import {
  isBattleReadyTriggerReportSubject,
  sameBattleSubject,
  type BattleSubject,
} from "./battle-subjects.ts";
import type {
  BattleFill,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSnapshot,
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

export type BattleRuntimeResolutionResult =
  | {
      readonly tag: "resolved";
      readonly session: BattleRuntimeSession;
      readonly snapshot: ResolvedBattleResult["snapshot"];
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
      readonly subject: NeedsHolesBattleResult["subject"];
      readonly holes: NeedsHolesBattleResult["holes"];
      readonly snapshot: NeedsHolesBattleResult["snapshot"];
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
      readonly snapshot: BattleSnapshot;
      readonly routeEvents?: BattleReducerRouteEvents;
    };

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
      return {
        tag: "invalid",
        session: input.session,
        reason: "invalidFill",
        message: "Familiar reappearance requires a Stat Block catalog.",
        snapshot: snapshotBattle(input.session.state),
      };
    }
    const admission = admitFindFamiliarReappearance({
      state: input.session.state,
      casterId: input.subject.actorId,
      catalog: input.statBlockCatalog,
    });
    if (Either.isLeft(admission)) {
      return {
        tag: "invalid",
        session: input.session,
        reason: "invalidFill",
        message: admission.left.message,
        snapshot: snapshotBattle(input.session.state),
      };
    }
    const result = resolveAdmittedFindFamiliarReappearanceSubject({
      fills: input.fills,
      admission: admission.right.mechanics,
    });
    return battleRuntimeResolutionWithFamiliarPresentation(
      input.session,
      result,
      admission.right.mechanics.combatantAdmission.combatantId,
      admission.right.presentation,
    );
  }
  return battleRuntimeResolutionFromMechanical(
    input.session,
    resolveBattleSubject({
      state: input.session.state,
      subject: input.subject,
      fills: input.fills,
    }),
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
    const fill = input.fills[fillIndex];
    const frontierRequests = rolledD20TestRequests(
      battleD20TestCircumstanceRequests({
        resolutionId: input.resolutionId,
        holes: frontier.holes,
        resolvedFills: input.fills.slice(0, fillIndex),
      }),
      fill,
    );
    appendUnseenD20TestRequests(requests, frontierRequests);
    retainAttackRollTableSourceForFrontier({
      fill,
      holes: frontier.holes,
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
  if (Either.isLeft(admission)) {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message: admission.left.issues.map(({ message }) => message).join(" "),
      snapshot: snapshotBattle(input.session.state),
      tableD20TestCircumstanceDecisionIssue: admission.left,
    };
  }
  const result = resolveBattleRuntimeSubject({
    ...input,
    fills,
  });
  return result.tag === "needsHoles"
    ? {
        ...result,
        d20TestCircumstanceRequests: battleD20TestCircumstanceRequests({
          resolutionId: input.d20TestResolutionId,
          holes: result.holes,
          resolvedFills: fills,
        }),
      }
    : result;
}

function battleRuntimeResolutionWithFamiliarPresentation(
  session: BattleRuntimeSession,
  result: BattleResolutionResult,
  combatantId: CombatantId,
  presentation: BattleStatBlockPresentationSource,
): BattleRuntimeResolutionResult {
  if (result.tag !== "resolved") {
    return battleRuntimeResolutionFromMechanical(session, result);
  }
  const combatant = result.state.combatants.get(combatantId);
  if (combatant === undefined) {
    return {
      tag: "invalid",
      session,
      reason: "invalidFill",
      message:
        "Resolved familiar reappearance did not create its admitted combatant.",
      snapshot: snapshotBattle(session.state),
    };
  }
  const { state: _state, ...outcome } = result;
  return {
    ...outcome,
    snapshot: snapshotBattle(result.state),
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
): BattleRuntimeResolutionResult {
  return Match.value(result).pipe(
    byBattleResolutionTag("resolved", ({ state, ...outcome }) => ({
      ...outcome,
      session: battleRuntimeSessionWithState(session, state),
    })),
    byBattleResolutionTag("needsHoles", ({ state, ...outcome }) => ({
      ...outcome,
      session: battleRuntimeSessionWithState(session, state),
    })),
    byBattleResolutionTag("invalid", (outcome) => ({
      ...outcome,
      session,
    })),
    Match.exhaustive,
  );
}

export function resolveBattleRuntimeInterrupt(input: {
  readonly session: BattleRuntimeSession;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
}): BattleRuntimeResolutionResult {
  return battleRuntimeResolutionFromMechanical(
    input.session,
    resolveBattleInterrupt({ state: input.session.state, fill: input.fill }),
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
  );
}

export function endBattleRuntimeTurnWithTableD20TestCircumstances(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly fills: readonly BattleFill[];
  readonly d20TestResolutionId: D20TestResolutionId;
  readonly tableD20TestCircumstanceDecisions: readonly TableD20TestCircumstanceDecision[];
}): BattleRuntimeTableD20TestResolutionResult {
  const requests: BattleD20TestCircumstanceRequest[] = [];
  for (let fillIndex = 0; fillIndex <= input.fills.length; fillIndex += 1) {
    const frontier = endBattleRuntimeTurn({
      session: input.session,
      actorId: input.actorId,
      fills: input.fills.slice(0, fillIndex),
    });
    if (frontier.tag !== "needsHoles") continue;
    const fill = input.fills[fillIndex];
    const frontierRequests = rolledD20TestRequests(
      battleD20TestCircumstanceRequests({
        resolutionId: input.d20TestResolutionId,
        holes: frontier.holes,
        resolvedFills: input.fills.slice(0, fillIndex),
      }),
      fill,
    );
    for (const request of frontierRequests) {
      if (
        !requests.some(
          ({ requestRef: priorRequestRef }) =>
            priorRequestRef === request.requestRef,
        )
      ) {
        requests.push(request);
      }
    }
  }
  const admission = admitTableD20TestCircumstanceDecisions({
    requests,
    decisions: input.tableD20TestCircumstanceDecisions,
  });
  if (Either.isLeft(admission)) {
    return {
      tag: "invalid",
      session: input.session,
      reason: "invalidFill",
      message: admission.left.issues.map(({ message }) => message).join(" "),
      snapshot: snapshotBattle(input.session.state),
      tableD20TestCircumstanceDecisionIssue: admission.left,
    };
  }
  const result = endBattleRuntimeTurn(input);
  return result.tag === "needsHoles"
    ? {
        ...result,
        d20TestCircumstanceRequests: battleD20TestCircumstanceRequests({
          resolutionId: input.d20TestResolutionId,
          holes: result.holes,
          resolvedFills: input.fills,
        }),
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
  );
}

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const phase = input.state.subjectResolutionPhase;
  const reportsReadyTrigger = isBattleReadyTriggerReportSubject(input.subject);
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
