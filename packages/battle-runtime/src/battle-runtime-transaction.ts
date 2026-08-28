// KERNEL-COVERAGE: runtime-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

import { Either, Match, Option } from "effect";

import {
  battleMechanicalFrontier,
  type BattleMechanicalFrontier,
  type BattleMechanicalFrontierIssue,
} from "./battle-mechanical-frontier.ts";
import { discoverBattleActs } from "./battle-act-composition.ts";
import {
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
  type BattleRuntimeResolutionResult,
} from "./battle-session-execution.ts";
import {
  battleRuntimeSessionDescendsFrom,
  battleRuntimeSessionFollows,
  battleRuntimeSessionWithState,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import {
  battleReplayStackDepth,
  type BattleReplayStackDepth,
} from "./identity.ts";
import { optionalProperty } from "./optional-property.ts";
import {
  currentInterruptCheckpoint,
  interruptDecisionHole,
  snapshotBattle,
} from "./battle-reducer/battle-snapshot.ts";
import {
  interruptCheckpointIdentity,
  type InterruptCheckpointIdentity,
} from "./battle-reducer/interrupt-checkpoint-identity.ts";
import { interruptedProcedureSubject } from "./battle-reducer/interrupt-execution.ts";
import {
  isBattleReadyTriggerReportSubject,
  sameBattleSubject,
} from "./battle-subjects.ts";
import type {
  BattleFill,
  BattleHole,
  BattleStatBlockExecutionCatalog,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

class BattlePendingTransactionToken {
  readonly #transactionIdentity = undefined;

  private constructor() {
    void this.#transactionIdentity;
  }

  static create(): BattlePendingTransactionToken {
    const token = new BattlePendingTransactionToken();
    Object.freeze(token);
    return token;
  }
}

/**
 * Opaque runtime-owned replay transaction. Consumers can retain and pass the
 * token, but cannot construct layers or inspect a parent continuation.
 */
export type BattlePendingTransaction = BattlePendingTransactionToken;

/** The presentation projection of the transaction's current layer. */
export type BattlePendingTransactionView = {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly holes: ReadonlyNonEmptyArray<BattleHole>;
};

export type BattlePendingTransactionSessionView =
  | {
      readonly tag: "valid";
      readonly view: BattlePendingTransactionView;
    }
  | { readonly tag: "foreignTransaction" }
  | { readonly tag: "transactionSessionMismatch" };

type BattlePendingTransactionData = {
  readonly baseSession: BattleRuntimeSession;
  /** The exact session at which this token may be consumed next. */
  readonly currentSession: BattleRuntimeSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly holes: ReadonlyNonEmptyArray<BattleHole>;
  readonly checkpointOwnership: BattlePendingTransactionCheckpointOwnership;
  readonly parent: BattlePendingTransaction | null;
  /**
   * How completion of this private layer returns to its owner. A report-ready
   * overlay is an admitted one-shot reaction: its report has already been
   * consumed while opening the overlay, so completion refreshes the parent
   * frontier instead of replaying that report. Other layers replay their
   * subject through the normal runtime resolver.
   */
  readonly completion: BattlePendingTransactionCompletion;
};

type BattlePendingTransactionCheckpointOwnership =
  | { readonly tag: "ordinaryFrontier" }
  | {
      readonly tag: "interruptFrontier";
      readonly checkpoint: InterruptCheckpointIdentity;
      readonly ancestors: readonly InterruptCheckpointIdentity[];
    };

type BattlePendingTransactionCompletion =
  | { readonly kind: "replaySubject" }
  | { readonly kind: "refreshParentFrontier" };

const battlePendingTransactionData = new WeakMap<
  BattlePendingTransaction,
  BattlePendingTransactionData
>();

export type BattleRuntimeTransactionOperation =
  | {
      readonly kind: "ordinarySubject";
      readonly subject: BattleSubject;
      /** Only fills submitted by this operation; prior fills stay in the transaction. */
      readonly fills: readonly BattleFill[];
    }
  | {
      readonly kind: "interruptDecision";
      readonly fill: Extract<
        BattleFill,
        { readonly kind: "interruptDecision" }
      >;
    };

export type BattleRuntimeTransactionOperationAdmissionIssue =
  | { readonly tag: "foreignTransaction" }
  | { readonly tag: "interruptRequiresPendingTransaction" }
  | {
      readonly tag: "interruptDecisionRequiresInterruptFrontier";
      readonly pendingSubject: BattleSubject;
    }
  | {
      readonly tag: "ordinarySubjectRequiresOrdinaryFrontier";
      readonly pendingSubject: BattleSubject;
      readonly requestedSubject: BattleSubject;
    }
  | {
      readonly tag: "repeatedReadyTrigger";
      readonly pendingSubject: BattleSubject;
      readonly requestedSubject: BattleSubject;
    }
  | {
      readonly tag: "readyTriggerOverlayRequiresInterruptFrontier";
      readonly pendingSubject: BattleSubject;
      readonly requestedSubject: BattleSubject;
    }
  | {
      readonly tag: "differentPendingSubject";
      readonly pendingSubject: BattleSubject;
      readonly requestedSubject: BattleSubject;
    };

export type BattleRuntimeTransactionOperationAdmission =
  | {
      readonly tag: "admitted";
      readonly operation: BattleRuntimeTransactionOperation;
    }
  | {
      readonly tag: "rejected";
      readonly issue: BattleRuntimeTransactionOperationAdmissionIssue;
    };

/**
 * Admit a typed operation against the runtime-owned transaction layer. MCP and
 * other callers use this result for diagnostics; settlement repeats the same
 * pure admission before executing the operation.
 */
export function admitBattleRuntimeTransactionOperation(input: {
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
}): BattleRuntimeTransactionOperationAdmission {
  if (input.transaction === null) {
    return input.operation.kind === "interruptDecision"
      ? {
          tag: "rejected",
          issue: { tag: "interruptRequiresPendingTransaction" },
        }
      : { tag: "admitted", operation: input.operation };
  }
  const pendingLookup = lookupBattleRuntimeTransaction(input.transaction);
  if (Option.isNone(pendingLookup)) {
    return {
      tag: "rejected",
      issue: { tag: "foreignTransaction" },
    };
  }
  const pending = pendingLookup.value;
  const interruptFrontier = isInterruptFrontier(pending.holes);
  return Match.value(input.operation).pipe(
    Match.when(
      { kind: "interruptDecision" },
      (operation): BattleRuntimeTransactionOperationAdmission =>
        interruptFrontier
          ? { tag: "admitted", operation }
          : {
              tag: "rejected",
              issue: {
                tag: "interruptDecisionRequiresInterruptFrontier",
                pendingSubject: pending.subject,
              },
            },
    ),
    Match.when(
      { kind: "ordinarySubject" },
      (operation): BattleRuntimeTransactionOperationAdmission => {
        if (sameBattleSubject(pending.subject, operation.subject)) {
          return isBattleReadyTriggerReportSubject(operation.subject)
            ? {
                tag: "rejected" as const,
                issue: {
                  tag: "repeatedReadyTrigger" as const,
                  pendingSubject: pending.subject,
                  requestedSubject: operation.subject,
                },
              }
            : interruptFrontier
              ? {
                  tag: "rejected" as const,
                  issue: {
                    tag: "ordinarySubjectRequiresOrdinaryFrontier" as const,
                    pendingSubject: pending.subject,
                    requestedSubject: operation.subject,
                  },
                }
              : { tag: "admitted" as const, operation };
        }
        if (isBattleReadyTriggerReportSubject(operation.subject)) {
          return interruptFrontier
            ? { tag: "admitted" as const, operation }
            : {
                tag: "rejected" as const,
                issue: {
                  tag: "readyTriggerOverlayRequiresInterruptFrontier" as const,
                  pendingSubject: pending.subject,
                  requestedSubject: operation.subject,
                },
              };
        }
        return interruptFrontier
          ? {
              tag: "rejected" as const,
              issue: {
                tag: "ordinarySubjectRequiresOrdinaryFrontier" as const,
                pendingSubject: pending.subject,
                requestedSubject: operation.subject,
              },
            }
          : {
              tag: "rejected" as const,
              issue: {
                tag: "differentPendingSubject" as const,
                pendingSubject: pending.subject,
                requestedSubject: operation.subject,
              },
            };
      },
    ),
    Match.exhaustive,
  );
}

export type BattleRuntimeTransactionDefect =
  | {
      readonly tag: "emptyActsAtSettledPoint";
    }
  | {
      readonly tag: "emptyHoleFrontier";
    }
  | {
      readonly tag: "mechanicalFrontierProjection";
      readonly issue: BattleMechanicalFrontierIssue;
    }
  | {
      readonly tag: "unsettledInterruptStack";
      readonly depth: BattleReplayStackDepth;
    }
  | {
      readonly tag: "unsettledSubjectContinuation";
    }
  | {
      readonly tag: "foreignTransaction";
    }
  | {
      readonly tag: "transactionSessionMismatch";
    }
  | {
      readonly tag: "foreignResolutionSession";
      readonly reason: "battleIdentityMismatch" | "sessionLineageMismatch";
    };

export type BattleRuntimeTransactionResult =
  | {
      readonly tag: "invalid";
      readonly resolution: Extract<
        BattleRuntimeResolutionResult,
        { readonly tag: "invalid" }
      >;
      readonly transaction: BattlePendingTransaction | null;
    }
  | {
      readonly tag: "needsHoles";
      readonly resolution: Extract<
        BattleRuntimeResolutionResult,
        { readonly tag: "needsHoles" }
      >;
      readonly transaction: BattlePendingTransaction;
      readonly frontier: BattleMechanicalFrontier;
    }
  | {
      readonly tag: "settled";
      readonly resolution: Extract<
        BattleRuntimeResolutionResult,
        { readonly tag: "resolved" }
      >;
      readonly session: BattleRuntimeSession;
      readonly acts: ReadonlyNonEmptyArray<
        ReturnType<typeof discoverBattleActs>[number]
      >;
    }
  | {
      readonly tag: "defect";
      readonly resolution: BattleRuntimeResolutionResult;
      readonly issue: BattleRuntimeTransactionDefect;
    };

type RefreshParentFrontierOutcome =
  | { readonly tag: "closed" }
  | {
      readonly tag: "ownerRetained";
      readonly result: BattleRuntimeTransactionResult;
    }
  | {
      readonly tag: "ownerClosedContinueUnwind";
      readonly nextTransaction: BattlePendingTransaction | null;
    }
  | {
      readonly tag: "nestedCheckpointOpened";
      readonly result: BattleRuntimeTransactionResult;
    };

type NeedsHolesResolution = Extract<
  BattleRuntimeResolutionResult,
  { readonly tag: "needsHoles" }
>;
type InvalidResolution = Extract<
  BattleRuntimeResolutionResult,
  { readonly tag: "invalid" }
>;
type ResolvedResolution = Extract<
  BattleRuntimeResolutionResult,
  { readonly tag: "resolved" }
>;

/**
 * Return only the current replay layer. A token that did not come from this
 * runtime is rejected rather than being structurally inspected.
 */
export function battlePendingTransactionView(
  transaction: BattlePendingTransaction,
): Option.Option<BattlePendingTransactionView> {
  return Option.map(
    lookupBattleRuntimeTransaction(transaction),
    transactionView,
  );
}

/**
 * Validate and project a transaction for the exact runtime session that will
 * be stored with its next frontier. This is the only public session/token
 * check; callers cannot inspect or reconstruct the transaction's parent.
 */
export function battlePendingTransactionViewForSession(
  transaction: BattlePendingTransaction,
  session: BattleRuntimeSession,
): BattlePendingTransactionSessionView {
  const data = lookupBattleRuntimeTransaction(transaction);
  if (Option.isNone(data)) return { tag: "foreignTransaction" };
  const transactionData = data.value;
  return transactionData.currentSession === session
    ? {
        tag: "valid",
        view: transactionView(transactionData),
      }
    : { tag: "transactionSessionMismatch" };
}

function lookupBattleRuntimeTransaction(
  transaction: BattlePendingTransaction,
): Option.Option<BattlePendingTransactionData> {
  return Option.fromNullable(battlePendingTransactionData.get(transaction));
}

function createBattlePendingTransaction(input: {
  readonly baseSession: BattleRuntimeSession;
  readonly currentSession: BattleRuntimeSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly holes: ReadonlyNonEmptyArray<BattleHole>;
  readonly parent: BattlePendingTransaction | null;
  readonly completion: BattlePendingTransactionCompletion;
}): BattlePendingTransaction {
  const checkpointOwnership = checkpointOwnershipFor({
    session: input.currentSession,
    holes: input.holes,
  });
  // The private brand is intentionally created only here; the WeakMap is the
  // runtime check that rejects tokens from another transaction owner.
  const transaction = BattlePendingTransactionToken.create();
  battlePendingTransactionData.set(transaction, {
    baseSession: input.baseSession,
    currentSession: input.currentSession,
    subject: ownedFrozenClone(input.subject),
    fills: ownedFrozenClone(input.fills),
    holes: ownedFrozenClone(input.holes),
    checkpointOwnership,
    parent: input.parent,
    completion: input.completion,
  });
  return transaction;
}

function checkpointOwnershipFor(input: {
  readonly session: BattleRuntimeSession;
  readonly holes: readonly BattleHole[];
}): BattlePendingTransactionCheckpointOwnership {
  if (!isInterruptFrontier(input.holes)) {
    return { tag: "ordinaryFrontier" };
  }
  const checkpoints = input.session.state.interruptStack.flatMap((frame) =>
    frame.kind === "interruptCheckpoint" ? [frame.frame] : [],
  );
  const owner = checkpoints.at(-1);
  if (owner === undefined) {
    return { tag: "ordinaryFrontier" };
  }
  return {
    tag: "interruptFrontier",
    checkpoint: interruptCheckpointIdentity(owner),
    ancestors: Object.freeze(
      checkpoints
        .slice(0, -1)
        .map((checkpoint) => interruptCheckpointIdentity(checkpoint)),
    ),
  };
}

function transactionView(
  data: BattlePendingTransactionData,
): BattlePendingTransactionView {
  return Object.freeze({
    subject: data.subject,
    fills: data.fills,
    holes: data.holes,
  });
}

function ownedFrozenClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    return value;
  }
  if (seen.has(value)) return value;
  seen.add(value);
  Object.freeze(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && "value" in descriptor) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return value;
}

function isInterruptFrontier(holes: readonly BattleHole[]): boolean {
  return (
    holes.length > 0 && holes.every((hole) => hole.kind === "interruptDecision")
  );
}

function completionForSubject(
  subject: BattleSubject,
): BattlePendingTransactionCompletion {
  return isBattleReadyTriggerReportSubject(subject)
    ? { kind: "refreshParentFrontier" }
    : { kind: "replaySubject" };
}

export function settleBattleRuntimeTransaction(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
}): BattleRuntimeTransactionResult {
  const transactionIssue = validateTransaction(input);
  if (transactionIssue !== undefined) {
    return transactionDefectResult(
      invalidTransactionResolution(
        input.session,
        "The pending battle transaction does not belong to this runtime session.",
      ),
      transactionIssue,
    );
  }
  const operationAdmission = admitBattleRuntimeTransactionOperation(input);
  if (operationAdmission.tag === "rejected") {
    return transactionInvalidResult(
      invalidTransactionResolution(
        input.session,
        transactionOperationAdmissionMessage(operationAdmission.issue),
      ),
      input.transaction,
    );
  }
  const resolution = rebaseResolutionToSession(
    resolveOperation({ ...input, operation: operationAdmission.operation }),
    input.session,
  );
  return settleBattleRuntimeResolution({ ...input, resolution });
}

/**
 * Settle a result produced by a battle-runtime entry point that has extra
 * caller-owned witnesses, such as the creature-falls interrupt opener.
 */
export function settleBattleRuntimeResolution(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly resolution: BattleRuntimeResolutionResult;
  readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
}): BattleRuntimeTransactionResult {
  const transactionIssue = validateTransaction(input);
  if (transactionIssue !== undefined) {
    return transactionDefectResult(input.resolution, transactionIssue);
  }
  const resolutionSessionIssue = validateResolutionSession(input);
  if (resolutionSessionIssue !== undefined) {
    return transactionDefectResult(input.resolution, resolutionSessionIssue);
  }
  const operationAdmission = admitBattleRuntimeTransactionOperation(input);
  if (operationAdmission.tag === "rejected") {
    return transactionInvalidResult(
      invalidTransactionResolution(
        input.session,
        transactionOperationAdmissionMessage(operationAdmission.issue),
      ),
      input.transaction,
    );
  }
  const { resolution } = input;
  return Match.value(resolution).pipe(
    Match.when({ tag: "invalid" }, (invalid) =>
      transactionInvalidResult(invalid, input.transaction),
    ),
    Match.when({ tag: "needsHoles" }, (needsHoles) =>
      transactionNeedsHolesResult(input, needsHoles),
    ),
    Match.when({ tag: "resolved" }, (resolved) =>
      settleResolvedTransaction({
        resolution: resolved,
        transaction: input.transaction,
        operation: input.operation,
        ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
      }),
    ),
    Match.exhaustive,
  );
}

function resolveOperation(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
}): BattleRuntimeResolutionResult {
  return Match.value(input.operation).pipe(
    Match.when({ kind: "interruptDecision" }, ({ fill }) =>
      input.transaction === null
        ? invalidTransactionResolution(
            input.session,
            "An interrupt decision requires a pending battle transaction.",
          )
        : resolveBattleRuntimeInterrupt({ session: input.session, fill }),
    ),
    Match.when({ kind: "ordinarySubject" }, ({ subject, fills }) => {
      const pendingLookup =
        input.transaction === null
          ? Option.none<BattlePendingTransactionData>()
          : lookupBattleRuntimeTransaction(input.transaction);
      if (Option.isNone(pendingLookup)) {
        return resolveBattleRuntimeSubject({
          session: input.session,
          subject,
          fills,
          ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
        });
      }
      const pending = pendingLookup.value;
      if (sameBattleSubject(pending.subject, subject)) {
        return resolveBattleRuntimeSubject({
          session: pending.baseSession,
          subject: pending.subject,
          fills: appendFills(pending.fills, fills),
          ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
        });
      }
      if (isBattleReadyTriggerReportSubject(subject)) {
        return resolveBattleRuntimeSubject({
          session: input.session,
          subject,
          fills,
          ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
        });
      }
      return invalidTransactionResolution(
        input.session,
        "A pending battle transaction owns a different subject.",
      );
    }),
    Match.exhaustive,
  );
}

function validateTransaction(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
}): BattleRuntimeTransactionDefect | undefined {
  if (input.transaction === null) return undefined;
  const data = lookupBattleRuntimeTransaction(input.transaction);
  if (Option.isNone(data)) return { tag: "foreignTransaction" };
  return data.value.currentSession === input.session
    ? undefined
    : { tag: "transactionSessionMismatch" };
}

function validateResolutionSession(input: {
  readonly session: BattleRuntimeSession;
  readonly resolution: BattleRuntimeResolutionResult;
}): BattleRuntimeTransactionDefect | undefined {
  const expectedSession = input.session;
  const resolutionSession = input.resolution.session;
  if (resolutionSession.state.battleId !== expectedSession.state.battleId) {
    return {
      tag: "foreignResolutionSession",
      reason: "battleIdentityMismatch",
    };
  }
  return battleRuntimeSessionDescendsFrom(resolutionSession, expectedSession)
    ? undefined
    : {
        tag: "foreignResolutionSession",
        reason: "sessionLineageMismatch",
      };
}

function rebaseResolutionToSession(
  resolution: BattleRuntimeResolutionResult,
  session: BattleRuntimeSession,
): BattleRuntimeResolutionResult {
  return battleRuntimeSessionFollows(resolution.session, session)
    ? resolution
    : {
        ...resolution,
        session: battleRuntimeSessionWithState(
          session,
          resolution.session.state,
        ),
      };
}

function transactionNeedsHolesResult(
  input: {
    readonly session: BattleRuntimeSession;
    readonly transaction: BattlePendingTransaction | null;
    readonly operation: BattleRuntimeTransactionOperation;
    readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
  },
  resolution: NeedsHolesResolution,
): BattleRuntimeTransactionResult {
  const holes = nonEmptyHoles(resolution.holes);
  if (holes === undefined) {
    return transactionDefectResult(resolution, {
      tag: "emptyHoleFrontier",
    });
  }
  const transaction = transactionForNeedsHoles(input, resolution, holes);
  return projectPendingTransactionFrontier(resolution, transaction);
}

function projectPendingTransactionFrontier(
  resolution: NeedsHolesResolution,
  transaction: BattlePendingTransaction,
): BattleRuntimeTransactionResult {
  const transactionLookup = lookupBattleRuntimeTransaction(transaction);
  if (Option.isNone(transactionLookup)) {
    return transactionDefectResult(resolution, {
      tag: "foreignTransaction",
    });
  }
  const projected = battleMechanicalFrontier({
    result: resolution,
    acceptedFills: transactionLookup.value.fills,
  });
  if (Either.isLeft(projected)) {
    return transactionDefectResult(resolution, {
      tag: "mechanicalFrontierProjection",
      issue: projected.left,
    });
  }
  return {
    tag: "needsHoles",
    resolution,
    transaction,
    frontier: projected.right,
  };
}

function transactionForNeedsHoles(
  input: {
    readonly session: BattleRuntimeSession;
    readonly transaction: BattlePendingTransaction | null;
    readonly operation: BattleRuntimeTransactionOperation;
  },
  resolution: NeedsHolesResolution,
  holes: ReadonlyNonEmptyArray<BattleHole>,
): BattlePendingTransaction {
  return Match.value(input.operation).pipe(
    Match.when({ kind: "ordinarySubject" }, ({ subject, fills }) => {
      const pendingLookup =
        input.transaction === null
          ? Option.none<BattlePendingTransactionData>()
          : lookupBattleRuntimeTransaction(input.transaction);
      if (Option.isNone(pendingLookup)) {
        return createBattlePendingTransaction({
          baseSession: input.session,
          currentSession: resolution.session,
          subject: resolution.subject,
          fills,
          holes,
          parent: null,
          completion: completionForSubject(resolution.subject),
        });
      }
      const pending = pendingLookup.value;
      if (sameBattleSubject(pending.subject, subject)) {
        return createBattlePendingTransaction({
          baseSession: pending.baseSession,
          currentSession: resolution.session,
          subject: resolution.subject,
          fills: appendFills(pending.fills, fills),
          holes,
          parent: pending.parent,
          completion: pending.completion,
        });
      }
      return createBattlePendingTransaction({
        baseSession: resolution.session,
        currentSession: resolution.session,
        subject: resolution.subject,
        fills,
        holes,
        parent: input.transaction,
        completion: completionForSubject(resolution.subject),
      });
    }),
    Match.when({ kind: "interruptDecision" }, ({ fill }) => {
      const pending = input.transaction;
      if (pending === null) {
        return createBattlePendingTransaction({
          baseSession: resolution.session,
          currentSession: resolution.session,
          subject: resolution.subject,
          fills: acceptedFillsForInterrupt(fill),
          holes,
          parent: null,
          completion: completionForSubject(resolution.subject),
        });
      }
      const pendingDataLookup = lookupBattleRuntimeTransaction(pending);
      if (Option.isNone(pendingDataLookup)) {
        return createBattlePendingTransaction({
          baseSession: resolution.session,
          currentSession: resolution.session,
          subject: resolution.subject,
          fills: acceptedFillsForInterrupt(fill),
          holes,
          parent: null,
          completion: completionForSubject(resolution.subject),
        });
      }
      const pendingData = pendingDataLookup.value;
      return sameBattleSubject(pendingData.subject, resolution.subject)
        ? createBattlePendingTransaction({
            baseSession: pendingData.baseSession,
            currentSession: resolution.session,
            subject: pendingData.subject,
            fills: pendingData.fills,
            holes,
            parent: pendingData.parent,
            completion: pendingData.completion,
          })
        : createBattlePendingTransaction({
            baseSession: resolution.session,
            currentSession: resolution.session,
            subject: resolution.subject,
            fills: acceptedFillsForInterrupt(fill),
            holes,
            parent: pending,
            completion: completionForSubject(resolution.subject),
          });
    }),
    Match.exhaustive,
  );
}

function settleResolvedTransaction(input: {
  readonly resolution: ResolvedResolution;
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
}): BattleRuntimeTransactionResult {
  let resolution = input.resolution;
  let completionCursor: BattlePendingTransaction | null = null;

  if (input.transaction !== null) {
    const transactionDataLookup = lookupBattleRuntimeTransaction(
      input.transaction,
    );
    if (Option.isNone(transactionDataLookup)) {
      return transactionDefectResult(resolution, {
        tag: "foreignTransaction",
      });
    }
    const transactionData = transactionDataLookup.value;
    if (input.operation.kind === "interruptDecision") {
      completionCursor = input.transaction;
    } else {
      // Ordinary subjects have already been resolved by the operation and
      // begin at their parent continuation.
      completionCursor = transactionData.parent;
    }
  }

  if (!runtimeOwnsUnresolvedContinuation(resolution.session)) {
    completionCursor = null;
  }

  while (completionCursor !== null) {
    const transactionDataLookup =
      lookupBattleRuntimeTransaction(completionCursor);
    if (Option.isNone(transactionDataLookup)) {
      return transactionDefectResult(resolution, {
        tag: "foreignTransaction",
      });
    }
    const transactionData = transactionDataLookup.value;
    if (
      transactionData.completion.kind === "replaySubject" &&
      transactionOwnerClosedWithAncestor(transactionData, resolution.session)
    ) {
      completionCursor = transactionData.parent;
      continue;
    }
    if (transactionData.completion.kind === "refreshParentFrontier") {
      const refreshed = refreshParentFrontier({
        resolution,
        parent: transactionData.parent,
      });
      const refreshAction = Match.value(refreshed).pipe(
        Match.when({ tag: "closed" }, () => ({ tag: "stop" as const })),
        Match.when({ tag: "ownerRetained" }, ({ result }) => ({
          tag: "return" as const,
          result,
        })),
        Match.when(
          { tag: "ownerClosedContinueUnwind" },
          ({ nextTransaction }) => ({
            tag: "continue" as const,
            nextTransaction,
          }),
        ),
        Match.when({ tag: "nestedCheckpointOpened" }, ({ result }) => ({
          tag: "return" as const,
          result,
        })),
        Match.exhaustive,
      );
      if (refreshAction.tag === "return") return refreshAction.result;
      if (refreshAction.tag === "stop") {
        completionCursor = null;
      } else {
        completionCursor = refreshAction.nextTransaction;
      }
      continue;
    }
    const resumedOutcome = resumePendingLayer({
      resolution,
      transaction: completionCursor,
      ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
    });
    if (resumedOutcome.tag !== "resolved") return resumedOutcome.result;
    resolution = resumedOutcome.resolution;
    completionCursor = runtimeOwnsUnresolvedContinuation(resolution.session)
      ? transactionData.parent
      : null;
  }

  const settledIssue = settledStateIssue(resolution.session);
  return settledIssue === undefined
    ? settledActsResult(resolution)
    : transactionDefectResult(resolution, settledIssue);
}

function transactionOwnerClosedWithAncestor(
  transaction: BattlePendingTransactionData,
  session: BattleRuntimeSession,
): boolean {
  const currentFrame = currentInterruptCheckpoint(session.state);
  if (currentFrame === null || currentFrame.activeInterrupt !== undefined) {
    return false;
  }
  return (
    transaction.checkpointOwnership.tag === "interruptFrontier" &&
    transaction.checkpointOwnership.ancestors.some(
      (ancestor) => ancestor === interruptCheckpointIdentity(currentFrame),
    )
  );
}

function refreshParentFrontier(input: {
  readonly resolution: ResolvedResolution;
  readonly parent: BattlePendingTransaction | null;
}): RefreshParentFrontierOutcome {
  if (input.parent === null) return { tag: "closed" };
  const parentDataLookup = lookupBattleRuntimeTransaction(input.parent);
  if (Option.isNone(parentDataLookup)) {
    return {
      tag: "ownerRetained",
      result: transactionDefectResult(input.resolution, {
        tag: "foreignTransaction",
      }),
    };
  }
  const parentData = parentDataLookup.value;

  const currentFrame = currentInterruptCheckpoint(
    input.resolution.session.state,
  );
  if (currentFrame === null) {
    return { tag: "closed" };
  }
  if (currentFrame.activeInterrupt !== undefined) {
    return { tag: "closed" };
  }

  const currentIdentity = interruptCheckpointIdentity(currentFrame);
  const ownership = parentData.checkpointOwnership;
  if (
    ownership.tag === "interruptFrontier" &&
    currentIdentity !== ownership.checkpoint &&
    ownership.ancestors.some((ancestor) => ancestor === currentIdentity)
  ) {
    return {
      tag: "ownerClosedContinueUnwind",
      nextTransaction: parentData.parent,
    };
  }
  if (
    ownership.tag !== "interruptFrontier" ||
    currentIdentity !== ownership.checkpoint
  ) {
    const nestedSubject = interruptedProcedureSubject(
      currentFrame.continuation,
    );
    const nestedHoles = [interruptDecisionHole(currentFrame)] as const;
    const nestedResolution: NeedsHolesResolution = {
      tag: "needsHoles",
      session: input.resolution.session,
      subject: nestedSubject,
      holes: nestedHoles,
      snapshot: snapshotBattle(input.resolution.session.state),
    };
    const nestedTransaction = createBattlePendingTransaction({
      baseSession: input.resolution.session,
      currentSession: input.resolution.session,
      subject: nestedSubject,
      fills: [],
      holes: nestedHoles,
      parent: input.parent,
      completion: completionForSubject(nestedSubject),
    });
    return {
      tag: "nestedCheckpointOpened",
      result: projectPendingTransactionFrontier(
        nestedResolution,
        nestedTransaction,
      ),
    };
  }

  const refreshedHoles = [interruptDecisionHole(currentFrame)] as const;
  // The parent subject was not consumed by the one-shot overlay. Its frontier
  // is the current, reconciled checkpoint in the post-overlay session; the
  // parent layer retains only its accepted subject fills and completion mode.
  const refreshedResolution: NeedsHolesResolution = {
    tag: "needsHoles",
    session: input.resolution.session,
    subject: parentData.subject,
    holes: refreshedHoles,
    snapshot: snapshotBattle(input.resolution.session.state),
  };
  const refreshedTransaction = createBattlePendingTransaction({
    baseSession: parentData.baseSession,
    currentSession: input.resolution.session,
    subject: parentData.subject,
    fills: parentData.fills,
    holes: refreshedHoles,
    parent: parentData.parent,
    completion: parentData.completion,
  });
  return {
    tag: "ownerRetained",
    result: projectPendingTransactionFrontier(
      refreshedResolution,
      refreshedTransaction,
    ),
  };
}

type ResumePendingLayerResult =
  | {
      readonly tag: "resolved";
      readonly resolution: ResolvedResolution;
    }
  | {
      readonly tag: "result";
      readonly result: BattleRuntimeTransactionResult;
    };

function resumePendingLayer(input: {
  readonly resolution: ResolvedResolution;
  readonly transaction: BattlePendingTransaction;
  readonly statBlockCatalog?: BattleStatBlockExecutionCatalog;
}): ResumePendingLayerResult {
  const dataLookup = lookupBattleRuntimeTransaction(input.transaction);
  if (Option.isNone(dataLookup)) {
    return {
      tag: "result",
      result: transactionDefectResult(input.resolution, {
        tag: "foreignTransaction",
      }),
    };
  }
  const data = dataLookup.value;
  const resumed = resolveBattleRuntimeSubject({
    session: input.resolution.session,
    subject: data.subject,
    fills: data.fills,
    ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
  });
  return Match.value(resumed).pipe(
    Match.when({ tag: "invalid" }, (invalid) => ({
      tag: "result" as const,
      result: transactionInvalidResult(invalid, input.transaction),
    })),
    Match.when({ tag: "needsHoles" }, (needsHoles) => {
      const holes = nonEmptyHoles(needsHoles.holes);
      if (holes === undefined) {
        return {
          tag: "result" as const,
          result: transactionDefectResult(input.resolution, {
            tag: "emptyHoleFrontier",
          }),
        };
      }
      const nextTransaction = sameBattleSubject(
        data.subject,
        needsHoles.subject,
      )
        ? createBattlePendingTransaction({
            baseSession: data.baseSession,
            currentSession: needsHoles.session,
            subject: needsHoles.subject,
            fills: data.fills,
            holes,
            parent: data.parent,
            completion: data.completion,
          })
        : createBattlePendingTransaction({
            baseSession: needsHoles.session,
            currentSession: needsHoles.session,
            subject: needsHoles.subject,
            fills: [],
            holes,
            parent: input.transaction,
            completion: completionForSubject(needsHoles.subject),
          });
      const nextDataLookup = lookupBattleRuntimeTransaction(nextTransaction);
      if (Option.isNone(nextDataLookup)) {
        return {
          tag: "result" as const,
          result: transactionDefectResult(input.resolution, {
            tag: "foreignTransaction",
          }),
        };
      }
      const nextData = nextDataLookup.value;
      const projected = battleMechanicalFrontier({
        result: needsHoles,
        acceptedFills: nextData.fills,
      });
      if (Either.isLeft(projected)) {
        return {
          tag: "result" as const,
          result: transactionDefectResult(input.resolution, {
            tag: "mechanicalFrontierProjection",
            issue: projected.left,
          }),
        };
      }
      return {
        tag: "result" as const,
        result: {
          tag: "needsHoles" as const,
          resolution: needsHoles,
          transaction: nextTransaction,
          frontier: projected.right,
        },
      };
    }),
    Match.when({ tag: "resolved" }, (resolved) => ({
      tag: "resolved" as const,
      resolution: resolved,
    })),
    Match.exhaustive,
  );
}

function settledActsResult(
  resolution: ResolvedResolution,
): BattleRuntimeTransactionResult {
  const acts = discoverBattleActs(resolution.session);
  const nonEmptyActs = nonEmpty(acts);
  return nonEmptyActs === undefined
    ? transactionDefectResult(resolution, { tag: "emptyActsAtSettledPoint" })
    : {
        tag: "settled",
        resolution,
        session: resolution.session,
        acts: nonEmptyActs,
      };
}

function settledStateIssue(
  session: BattleRuntimeSession,
): BattleRuntimeTransactionDefect | undefined {
  if (session.state.subjectResolutionPhase.kind === "subjectContinuation") {
    return { tag: "unsettledSubjectContinuation" };
  }
  return session.state.interruptStack.length === 0
    ? undefined
    : {
        tag: "unsettledInterruptStack",
        depth: battleReplayStackDepth(session.state.interruptStack.length),
      };
}

function runtimeOwnsUnresolvedContinuation(
  session: BattleRuntimeSession,
): boolean {
  return (
    session.state.subjectResolutionPhase.kind === "subjectContinuation" ||
    session.state.interruptStack.length > 0
  );
}

function transactionInvalidResult(
  resolution: InvalidResolution,
  transaction: BattlePendingTransaction | null,
): BattleRuntimeTransactionResult {
  return { tag: "invalid", resolution, transaction };
}

function transactionDefectResult(
  resolution: BattleRuntimeResolutionResult,
  issue: BattleRuntimeTransactionDefect,
): BattleRuntimeTransactionResult {
  return {
    tag: "defect",
    resolution,
    issue,
  };
}

function invalidTransactionResolution(
  session: BattleRuntimeSession,
  message: string,
): InvalidResolution {
  return {
    tag: "invalid",
    session,
    reason: "staleSubject",
    message,
    snapshot: snapshotBattle(session.state),
  };
}

function transactionOperationAdmissionMessage(
  issue: BattleRuntimeTransactionOperationAdmissionIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "foreignTransaction" },
      () => "The pending battle transaction is not owned by this runtime.",
    ),
    Match.when(
      { tag: "interruptRequiresPendingTransaction" },
      () => "An interrupt decision requires a pending battle transaction.",
    ),
    Match.when(
      { tag: "interruptDecisionRequiresInterruptFrontier" },
      () =>
        "An interrupt decision requires a pending interrupt-decision frontier.",
    ),
    Match.when(
      { tag: "ordinarySubjectRequiresOrdinaryFrontier" },
      () =>
        "An ordinary subject operation cannot run while an interrupt-decision frontier is pending.",
    ),
    Match.when(
      { tag: "repeatedReadyTrigger" },
      () =>
        "A report-ready trigger cannot be repeated while its interrupt decision is pending.",
    ),
    Match.when(
      { tag: "readyTriggerOverlayRequiresInterruptFrontier" },
      () =>
        "A report-ready trigger may overlay only a different subject's interrupt frontier.",
    ),
    Match.when(
      { tag: "differentPendingSubject" },
      () => "A pending battle transaction owns a different subject.",
    ),
    Match.exhaustive,
  );
}

function acceptedFillsForInterrupt(
  fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>,
): readonly BattleFill[] {
  return Match.value(fill.value).pipe(
    Match.when({ kind: "decline" }, () => []),
    Match.when({ kind: "resolve" }, ({ choice }) => choice.fills),
    Match.exhaustive,
  );
}

function appendFills(
  accepted: readonly BattleFill[],
  submitted: readonly BattleFill[],
): readonly BattleFill[] {
  return Object.freeze([...accepted, ...submitted]);
}

function nonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

function nonEmptyHoles(
  holes: readonly BattleHole[],
): ReadonlyNonEmptyArray<BattleHole> | undefined {
  return nonEmpty(holes);
}
