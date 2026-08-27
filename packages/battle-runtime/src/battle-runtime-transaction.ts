import { Either, Match } from "effect";

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
  battleRuntimeSessionFollows,
  battleRuntimeSessionWithState,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import { optionalProperty } from "./optional-property.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
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
      readonly depth: number;
    }
  | {
      readonly tag: "unsettledSubjectContinuation";
    }
  | {
      readonly tag: "foreignTransaction";
    }
  | {
      readonly tag: "transactionSessionMismatch";
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
): BattlePendingTransactionView | undefined {
  const data = battlePendingTransactionData.get(transaction);
  return data === undefined ? undefined : transactionView(data);
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
  const data = battlePendingTransactionData.get(transaction);
  if (data === undefined) return { tag: "foreignTransaction" };
  return data.currentSession === session
    ? {
        tag: "valid",
        view: transactionView(data),
      }
    : { tag: "transactionSessionMismatch" };
}

function battlePendingTransactionMatchesSession(
  transaction: BattlePendingTransaction,
  session: BattleRuntimeSession,
): boolean {
  const data = battlePendingTransactionData.get(transaction);
  return data !== undefined && data.currentSession === session;
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
  // The private brand is intentionally created only here; the WeakMap is the
  // runtime check that rejects tokens from another transaction owner.
  const transaction = BattlePendingTransactionToken.create();
  battlePendingTransactionData.set(transaction, {
    baseSession: input.baseSession,
    currentSession: input.currentSession,
    subject: ownedFrozenClone(input.subject),
    fills: ownedFrozenClone(input.fills),
    holes: ownedFrozenClone(input.holes),
    parent: input.parent,
    completion: input.completion,
  });
  return transaction;
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
  const resolution = rebaseResolutionToSession(
    resolveOperation(input),
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
  const operationIssue = incompatibleTransactionOperationMessage(input);
  if (operationIssue !== undefined) {
    return transactionInvalidResult(
      invalidTransactionResolution(input.session, operationIssue),
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
  const operationIssue = incompatibleTransactionOperationMessage(input);
  if (operationIssue !== undefined) {
    return invalidTransactionResolution(input.session, operationIssue);
  }
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
      const pending =
        input.transaction === null
          ? null
          : battlePendingTransactionData.get(input.transaction);
      if (pending === null || pending === undefined) {
        return resolveBattleRuntimeSubject({
          session: input.session,
          subject,
          fills,
          ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
        });
      }
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

function incompatibleTransactionOperationMessage(input: {
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
}): string | undefined {
  if (
    input.transaction === null ||
    input.operation.kind !== "ordinarySubject" ||
    !isBattleReadyTriggerReportSubject(input.operation.subject)
  ) {
    return undefined;
  }
  const pending = battlePendingTransactionData.get(input.transaction);
  if (pending === undefined) return undefined;
  if (sameBattleSubject(pending.subject, input.operation.subject)) {
    return "A report-ready trigger cannot be repeated while its interrupt decision is pending.";
  }
  return isInterruptFrontier(pending.holes)
    ? undefined
    : "A report-ready trigger may overlay only a different subject's interrupt frontier.";
}

function validateTransaction(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
}): BattleRuntimeTransactionDefect | undefined {
  if (input.transaction === null) return undefined;
  const data = battlePendingTransactionData.get(input.transaction);
  if (data === undefined) return { tag: "foreignTransaction" };
  return battlePendingTransactionMatchesSession(
    input.transaction,
    input.session,
  )
    ? undefined
    : { tag: "transactionSessionMismatch" };
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
  const transactionView = battlePendingTransactionData.get(transaction);
  if (transactionView === undefined) {
    return transactionDefectResult(resolution, {
      tag: "foreignTransaction",
    });
  }
  const projected = battleMechanicalFrontier({
    result: resolution,
    acceptedFills: transactionView.fills,
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
      const pending =
        input.transaction === null
          ? null
          : battlePendingTransactionData.get(input.transaction);
      if (pending === null || pending === undefined) {
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
      const pendingData = battlePendingTransactionData.get(pending);
      if (pendingData === undefined) {
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
  let replayCursor: BattlePendingTransaction | null = null;

  if (input.transaction !== null) {
    const transactionData = battlePendingTransactionData.get(input.transaction);
    if (transactionData === undefined) {
      return transactionDefectResult(resolution, {
        tag: "foreignTransaction",
      });
    }
    if (input.operation.kind === "interruptDecision") {
      replayCursor = Match.value(transactionData.completion).pipe(
        Match.when({ kind: "replaySubject" }, () => input.transaction),
        Match.when({ kind: "refreshParentFrontier" }, () => null),
        Match.exhaustive,
      );
      if (transactionData.completion.kind === "refreshParentFrontier") {
        if (runtimeOwnsUnresolvedContinuation(resolution.session)) {
          const refreshed = refreshParentFrontierAfterOverlay({
            resolution,
            parent: transactionData.parent,
          });
          if (refreshed !== undefined) return refreshed;
        }
      }
    } else {
      // Ordinary subjects have already been resolved by the operation and
      // begin at their parent continuation.
      replayCursor = transactionData.parent;
    }
  }

  if (!runtimeOwnsUnresolvedContinuation(resolution.session)) {
    replayCursor = null;
  }

  while (replayCursor !== null) {
    const transactionData = battlePendingTransactionData.get(replayCursor);
    if (transactionData === undefined) {
      return transactionDefectResult(resolution, {
        tag: "foreignTransaction",
      });
    }
    const resumedOutcome = resumePendingLayer({
      resolution,
      transaction: replayCursor,
      ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
    });
    if (resumedOutcome.tag !== "resolved") return resumedOutcome.result;
    resolution = resumedOutcome.resolution;
    replayCursor = runtimeOwnsUnresolvedContinuation(resolution.session)
      ? transactionData.parent
      : null;
  }

  const settledIssue = settledStateIssue(resolution.session);
  return settledIssue === undefined
    ? settledActsResult(resolution)
    : transactionDefectResult(resolution, settledIssue);
}

function refreshParentFrontierAfterOverlay(input: {
  readonly resolution: ResolvedResolution;
  readonly parent: BattlePendingTransaction | null;
}): BattleRuntimeTransactionResult | undefined {
  if (input.parent === null) return undefined;
  const parentData = battlePendingTransactionData.get(input.parent);
  if (parentData === undefined) {
    return transactionDefectResult(input.resolution, {
      tag: "foreignTransaction",
    });
  }

  // The parent subject was not consumed by the one-shot overlay. Rebuild only
  // its boundary result from the canonical parent layer and the post-overlay
  // session; the runtime snapshot remains the source of the current holes and
  // interrupt choices.
  const refreshedResolution: NeedsHolesResolution = {
    tag: "needsHoles",
    session: input.resolution.session,
    subject: parentData.subject,
    holes: parentData.holes,
    snapshot: input.resolution.snapshot,
  };
  const refreshedTransaction = createBattlePendingTransaction({
    baseSession: parentData.baseSession,
    currentSession: input.resolution.session,
    subject: parentData.subject,
    fills: parentData.fills,
    holes: parentData.holes,
    parent: parentData.parent,
    completion: parentData.completion,
  });
  const refreshedData = battlePendingTransactionData.get(refreshedTransaction);
  if (refreshedData === undefined) {
    return transactionDefectResult(refreshedResolution, {
      tag: "foreignTransaction",
    });
  }
  const projected = battleMechanicalFrontier({
    result: refreshedResolution,
    acceptedFills: refreshedData.fills,
  });
  if (Either.isLeft(projected)) {
    return transactionDefectResult(refreshedResolution, {
      tag: "mechanicalFrontierProjection",
      issue: projected.left,
    });
  }
  return {
    tag: "needsHoles",
    resolution: refreshedResolution,
    transaction: refreshedTransaction,
    frontier: projected.right,
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
  const data = battlePendingTransactionData.get(input.transaction);
  if (data === undefined) {
    return {
      tag: "result",
      result: transactionDefectResult(input.resolution, {
        tag: "foreignTransaction",
      }),
    };
  }
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
      const nextData = battlePendingTransactionData.get(nextTransaction);
      if (nextData === undefined) {
        return {
          tag: "result" as const,
          result: transactionDefectResult(input.resolution, {
            tag: "foreignTransaction",
          }),
        };
      }
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
        depth: session.state.interruptStack.length,
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
