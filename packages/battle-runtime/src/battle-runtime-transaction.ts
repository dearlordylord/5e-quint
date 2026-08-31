// KERNEL-COVERAGE: runtime-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

import { Match, Option, Result } from "effect";

import {
  battleMechanicalFrontier,
  type BattleMechanicalFrontier,
  type BattleMechanicalFrontierIssue,
} from "./battle-mechanical-frontier.ts";
import { discoverBattleActs } from "./battle-act-composition.ts";
import {
  resolveBattleRuntimeInterrupt,
  openCreatureFallsRuntimeInterruptWindow,
  resolveBattleRuntimeSubject,
  resolveBattleRuntimeSubjectForReplay,
  battleCheckpointFrontierEnvelope,
  type BattleCheckpointFrontierEnvelope,
  type BattleRuntimeResolutionResult,
} from "./battle-session-execution.ts";
import {
  battleRuntimeSessionFollows,
  battleRuntimeSessionWithState,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import {
  battleReplayStackDepth,
  type CombatantId,
  type BattleReplayStackDepth,
} from "./identity.ts";
import { optionalProperty } from "./optional-property.ts";
import {
  currentInterruptCheckpoint,
  interruptDecisionFrontier,
  snapshotBattle,
} from "./battle-reducer/battle-snapshot.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
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
  BattleInterruptedProcedure,
  BattleFallingCreatureMitigationTriggerFact,
} from "./battle-state-execution.ts";
import type { FindFamiliarStatBlockCatalog } from "./find-familiar-stat-block-catalog.ts";
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

/**
 * The runtime-owned envelope for a transaction's current layer.  The
 * transaction remains opaque; callers receive only the envelope after the
 * runtime checks that the token belongs to this runtime and this exact
 * session.
 */
export type BattlePendingTransactionEnvelopeSessionView =
  | {
      readonly tag: "valid";
      readonly envelope: BattleCheckpointFrontierEnvelope;
    }
  | { readonly tag: "foreignTransaction" }
  | { readonly tag: "transactionSessionMismatch" };

type BattlePendingTransactionData = {
  /** The token that owns this canonical data record. */
  readonly transaction: BattlePendingTransaction;
  readonly baseSession: BattleRuntimeSession;
  /** The exact session at which this token may be consumed next. */
  readonly currentSession: BattleRuntimeSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly holes: ReadonlyNonEmptyArray<BattleHole>;
  readonly checkpointOwnership: BattlePendingTransactionCheckpointOwnership;
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
  | {
      /** A root report-ready layer closes without refreshing a parent. */
      readonly kind: "standaloneClose";
      readonly parent: null;
    }
  | {
      readonly kind: "replaySubject";
      readonly parent: BattlePendingTransactionData | null;
    }
  | {
      /** A report-ready overlay always refreshes its existing owner. */
      readonly kind: "refreshParentFrontier";
      readonly parent: BattlePendingTransactionData;
    };

type BattlePendingTransactionInitialization = Result.Result<
  {
    readonly transaction: BattlePendingTransaction;
    readonly data: BattlePendingTransactionData;
  },
  BattleRuntimeTransactionDefect
>;

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
      readonly tag: "interruptFrontierMissingCheckpoint";
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
      readonly nextTransaction: BattlePendingTransactionData | null;
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

/**
 * Project the current transaction layer through the runtime-owned checkpoint
 * envelope.  Ordinary holes are retained by the opaque token rather than
 * inferred from reducer state, which intentionally has no ordinary pending
 * continuation field.  Interrupt decisions still come from the canonical
 * reducer frontier because the token does not expose authored choices.
 */
export function battlePendingTransactionEnvelopeForSession(
  transaction: BattlePendingTransaction,
  session: BattleRuntimeSession,
): BattlePendingTransactionEnvelopeSessionView {
  const data = lookupBattleRuntimeTransaction(transaction);
  if (Option.isNone(data)) return { tag: "foreignTransaction" };
  const transactionData = data.value;
  if (transactionData.currentSession !== session) {
    return { tag: "transactionSessionMismatch" };
  }
  if (isInterruptFrontier(transactionData.holes)) {
    return {
      tag: "valid",
      envelope: battleCheckpointFrontierEnvelope(session.state),
    };
  }
  return {
    tag: "valid",
    envelope: {
      checkpoint: snapshotBattle(session.state),
      frontier: {
        kind: "holes",
        subject: transactionData.subject,
        holes: transactionData.holes,
        continuation: { kind: "ordinaryReplay" },
      },
    },
  };
}

function lookupBattleRuntimeTransaction(
  transaction: BattlePendingTransaction,
): Option.Option<BattlePendingTransactionData> {
  return Option.fromNullishOr(battlePendingTransactionData.get(transaction));
}

function createBattlePendingTransaction(input: {
  readonly baseSession: BattleRuntimeSession;
  readonly currentSession: BattleRuntimeSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly holes: ReadonlyNonEmptyArray<BattleHole>;
  readonly completion: BattlePendingTransactionCompletion;
}): BattlePendingTransactionInitialization {
  const checkpointOwnership = checkpointOwnershipFor({
    session: input.currentSession,
    holes: input.holes,
  });
  return Result.map(checkpointOwnership, (checkpointOwnership) => {
    // The private brand is intentionally created only here; the WeakMap is the
    // runtime check that rejects tokens from another transaction owner.
    const transaction = BattlePendingTransactionToken.create();
    const data: BattlePendingTransactionData = {
      transaction,
      baseSession: input.baseSession,
      currentSession: input.currentSession,
      subject: ownedFrozenClone(input.subject),
      fills: ownedFrozenClone(input.fills),
      holes: ownedFrozenClone(input.holes),
      checkpointOwnership,
      completion: input.completion,
    };
    battlePendingTransactionData.set(transaction, data);
    return { transaction, data };
  });
}

function checkpointOwnershipFor(input: {
  readonly session: BattleRuntimeSession;
  readonly holes: readonly BattleHole[];
}): Result.Result<
  BattlePendingTransactionCheckpointOwnership,
  BattleRuntimeTransactionDefect
> {
  if (!isInterruptFrontier(input.holes)) {
    return Result.succeed({ tag: "ordinaryFrontier" });
  }
  const owner = currentInterruptCheckpoint(input.session.state);
  if (owner === null) {
    return Result.fail({ tag: "interruptFrontierMissingCheckpoint" });
  }
  const checkpoints = input.session.state.interruptStack.flatMap((frame) =>
    frame.kind === "interruptCheckpoint" ? [frame.frame] : [],
  );
  return Result.succeed({
    tag: "interruptFrontier",
    checkpoint: interruptCheckpointIdentity(owner),
    ancestors: Object.freeze(
      checkpoints
        .slice(0, -1)
        .map((checkpoint) => interruptCheckpointIdentity(checkpoint)),
    ),
  });
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
  if (!isDeepFreezable(value)) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  Object.freeze(value);
  freezeOwnProperties(value, seen);
  return value;
}

function isDeepFreezable(value: unknown): value is object {
  return (
    value !== null && (typeof value === "object" || typeof value === "function")
  );
}

function freezeOwnProperties(value: object, seen: WeakSet<object>): void {
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Object.getOwnPropertyDescriptor(value, key)?.value, seen);
  }
}

function isInterruptFrontier(holes: readonly BattleHole[]): boolean {
  return (
    holes.length > 0 && holes.every((hole) => hole.kind === "interruptDecision")
  );
}

function completionForSubject(
  subject: BattleSubject,
  parent: BattlePendingTransactionData | null,
): BattlePendingTransactionCompletion {
  return isBattleReadyTriggerReportSubject(subject)
    ? parent === null
      ? { kind: "standaloneClose", parent: null }
      : { kind: "refreshParentFrontier", parent }
    : { kind: "replaySubject", parent };
}

export function settleBattleRuntimeTransaction(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): BattleRuntimeTransactionResult {
  const transactionValidation = validateTransaction(input);
  if (Result.isFailure(transactionValidation)) {
    return transactionDefectResult(
      invalidTransactionResolution(
        input.session,
        "The pending battle transaction does not belong to this runtime session.",
      ),
      transactionValidation.failure,
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
    resolveOperation({
      ...input,
      operation: operationAdmission.operation,
      pendingData: transactionValidation.success,
    }),
    input.session,
  );
  return settleValidatedBattleRuntimeResolution({
    ...input,
    resolution,
    pendingData: transactionValidation.success,
  });
}

/** Settle the production Creature Falls resolution bound to its witnesses. */
export function settleCreatureFallsRuntimeTransaction(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly fallingCreatureId: CombatantId;
  readonly reactionSpellTargetFacts: readonly BattleFallingCreatureMitigationTriggerFact[];
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): BattleRuntimeTransactionResult {
  const subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "creatureFalls" }
  > = {
    tag: "runtimeCommand",
    actorId: currentActorId(input.session.state),
    command: "creatureFalls",
    fallingCreatureId: input.fallingCreatureId,
  };
  return settleBoundBattleRuntimeResolution({
    session: input.session,
    transaction: input.transaction,
    operation: { kind: "ordinarySubject", subject, fills: [] },
    resolution: openCreatureFallsRuntimeInterruptWindow({
      session: input.session,
      fallingCreatureId: input.fallingCreatureId,
      reactionSpellTargetFacts: input.reactionSpellTargetFacts,
    }),
    ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
  });
}

function settleBoundBattleRuntimeResolution(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly resolution: BattleRuntimeResolutionResult;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): BattleRuntimeTransactionResult {
  const transactionValidation = validateTransaction(input);
  if (Result.isFailure(transactionValidation)) {
    return transactionDefectResult(
      input.resolution,
      transactionValidation.failure,
    );
  }
  return settleValidatedBattleRuntimeResolution({
    ...input,
    pendingData: transactionValidation.success,
  });
}

function settleValidatedBattleRuntimeResolution(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly resolution: BattleRuntimeResolutionResult;
  readonly pendingData: BattlePendingTransactionData | null;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): BattleRuntimeTransactionResult {
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
        pendingData: input.pendingData,
        ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
      }),
    ),
    Match.exhaustive,
  );
}

function resolveOperation(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
  readonly pendingData: BattlePendingTransactionData | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): BattleRuntimeResolutionResult {
  return Match.value(input.operation).pipe(
    Match.when({ kind: "interruptDecision" }, ({ fill }) =>
      resolveBattleRuntimeInterrupt({ session: input.session, fill }),
    ),
    Match.when({ kind: "ordinarySubject" }, ({ subject, fills }) => {
      if (input.transaction === null) {
        return resolveBattleRuntimeSubject({
          session: input.session,
          subject,
          fills,
          ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
        });
      }
      // Operation admission proves that a non-null transaction is owned by
      // this runtime. Keep the data refinement typed anyway so a forged token
      // cannot turn a caller-visible domain failure into an exception.
      return Option.match(Option.fromNullishOr(input.pendingData), {
        onNone: () =>
          invalidTransactionResolution(
            input.session,
            "The pending battle transaction is not owned by this runtime.",
          ),
        onSome: (pending) => {
          if (sameBattleSubject(pending.subject, subject)) {
            return resolveBattleRuntimeSubject({
              session: battleTransactionReplaySession(pending),
              subject: pending.subject,
              fills: appendFills(pending.fills, fills),
              ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
            });
          }
          // The remaining admitted ordinary operation is the one-shot Ready
          // trigger overlay; all other different-subject operations are
          // rejected before reaching this resolver.
          return resolveBattleRuntimeSubject({
            session: input.session,
            subject,
            fills,
            ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
          });
        },
      });
    }),
    Match.exhaustive,
  );
}

function battleTransactionReplaySession(
  transaction: BattlePendingTransactionData,
): BattleRuntimeSession {
  return transaction.currentSession.state.subjectResolutionPhase.kind ===
    "subjectContinuation"
    ? transaction.currentSession
    : transaction.baseSession;
}

function validateTransaction(input: {
  readonly session: BattleRuntimeSession;
  readonly transaction: BattlePendingTransaction | null;
}): Result.Result<
  BattlePendingTransactionData | null,
  BattleRuntimeTransactionDefect
> {
  if (input.transaction === null) return Result.succeed(null);
  const data = lookupBattleRuntimeTransaction(input.transaction);
  if (Option.isNone(data)) return Result.fail({ tag: "foreignTransaction" });
  return data.value.currentSession === input.session
    ? Result.succeed(data.value)
    : Result.fail({ tag: "transactionSessionMismatch" });
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
    readonly pendingData: BattlePendingTransactionData | null;
    readonly operation: BattleRuntimeTransactionOperation;
    readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
  },
  resolution: NeedsHolesResolution,
): BattleRuntimeTransactionResult {
  const frontier = resolution.envelope.frontier;
  const holes =
    frontier.kind === "interruptDecision"
      ? ([frontier.decisionHole] as const)
      : frontier.holes;
  const subject =
    frontier.kind === "holes"
      ? frontier.subject
      : interruptedProcedureSubjectFromState(resolution.session.state);
  if (subject === null) {
    return transactionDefectResult(resolution, {
      tag: "interruptFrontierMissingCheckpoint",
    });
  }
  const transaction = transactionForNeedsHoles(
    input,
    resolution,
    holes,
    subject,
  );
  return Result.match(transaction, {
    onFailure: (issue) => transactionDefectResult(resolution, issue),
    onSuccess: ({ transaction, data }) =>
      projectPendingTransactionFrontier(resolution, transaction, data.fills),
  });
}

function projectPendingTransactionFrontier(
  resolution: NeedsHolesResolution,
  transaction: BattlePendingTransaction,
  acceptedFills: readonly BattleFill[],
): BattleRuntimeTransactionResult {
  const projected = battleMechanicalFrontier({
    result: resolution.envelope.frontier,
    acceptedFills,
  });
  return Result.match(projected, {
    onFailure: (issue) =>
      transactionDefectResult(resolution, {
        tag: "mechanicalFrontierProjection",
        issue,
      }),
    onSuccess: (frontier) => ({
      tag: "needsHoles" as const,
      resolution,
      transaction,
      frontier,
    }),
  });
}

function interruptedProcedureSubjectFromState(
  state: BattleRuntimeSession["state"],
): BattleSubject | null {
  return Option.match(Option.fromNullishOr(currentInterruptCheckpoint(state)), {
    onNone: () => null,
    onSome: (checkpoint) =>
      interruptedProcedureSubject(checkpoint.continuation),
  });
}

function transactionForNeedsHoles(
  input: {
    readonly session: BattleRuntimeSession;
    readonly transaction: BattlePendingTransaction | null;
    readonly pendingData: BattlePendingTransactionData | null;
    readonly operation: BattleRuntimeTransactionOperation;
  },
  resolution: NeedsHolesResolution,
  holes: ReadonlyNonEmptyArray<BattleHole>,
  subject: BattleSubject,
): BattlePendingTransactionInitialization {
  return Match.value(input.operation).pipe(
    Match.when({ kind: "ordinarySubject" }, ({ subject, fills }) => {
      const pending = input.pendingData;
      if (pending === null) {
        return createBattlePendingTransaction({
          baseSession: input.session,
          currentSession: resolution.session,
          subject,
          fills,
          holes,
          completion: completionForSubject(subject, null),
        });
      }
      if (sameBattleSubject(pending.subject, subject)) {
        return createBattlePendingTransaction({
          baseSession: pending.baseSession,
          currentSession: resolution.session,
          subject,
          fills: appendFills(pending.fills, fills),
          holes,
          completion: pending.completion,
        });
      }
      return createBattlePendingTransaction({
        baseSession: resolution.session,
        currentSession: resolution.session,
        subject,
        fills,
        holes,
        completion: completionForSubject(subject, pending),
      });
    }),
    Match.when({ kind: "interruptDecision" }, ({ fill }) => {
      return Option.match(Option.fromNullishOr(input.pendingData), {
        onNone: () =>
          createBattlePendingTransaction({
            baseSession: resolution.session,
            currentSession: resolution.session,
            subject,
            fills: acceptedFillsForInterrupt(fill),
            holes,
            completion: completionForSubject(subject, null),
          }),
        onSome: (pending) => {
          const ancestor = ancestorTransactionForSubject(
            pending.completion.parent,
            subject,
          );
          if (ancestor !== null) {
            // Completing a nested interrupt can expose the ordinary frontier
            // of an ancestor layer. Rehydrate that owner so its canonical
            // replay fills (for example, an attack target and roll) remain
            // attached to the continuation. Nested choice fills have already
            // been consumed by the reducer and must not become a new ancestor
            // replay prefix.
            return createBattlePendingTransaction({
              baseSession: ancestor.baseSession,
              currentSession: resolution.session,
              subject: ancestor.subject,
              fills: ancestor.fills,
              holes,
              completion: ancestor.completion,
            });
          }
          return sameBattleSubject(pending.subject, subject)
            ? createBattlePendingTransaction({
                baseSession: pending.baseSession,
                currentSession: resolution.session,
                subject: pending.subject,
                fills: pending.fills,
                holes,
                completion: pending.completion,
              })
            : createBattlePendingTransaction({
                baseSession: resolution.session,
                currentSession: resolution.session,
                subject,
                fills: acceptedFillsForInterrupt(fill),
                holes,
                completion: completionForSubject(subject, pending),
              });
        },
      });
    }),
    Match.exhaustive,
  );
}

function ancestorTransactionForSubject(
  transaction: BattlePendingTransactionData | null,
  subject: BattleSubject,
): BattlePendingTransactionData | null {
  let cursor = transaction;
  while (cursor !== null) {
    if (sameBattleSubject(cursor.subject, subject)) return cursor;
    cursor = cursor.completion.parent;
  }
  return null;
}

function initialCompletionCursor(input: {
  readonly transaction: BattlePendingTransaction | null;
  readonly pendingData: BattlePendingTransactionData | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly resolution: ResolvedResolution;
}):
  | {
      readonly tag: "cursor";
      readonly cursor: BattlePendingTransactionData | null;
    }
  | {
      readonly tag: "result";
      readonly result: BattleRuntimeTransactionResult;
    } {
  if (input.transaction === null) return { tag: "cursor", cursor: null };
  return Option.match(Option.fromNullishOr(input.pendingData), {
    onNone: () => ({ tag: "cursor" as const, cursor: null }),
    onSome: (transactionData) => ({
      tag: "cursor" as const,
      cursor:
        input.operation.kind === "interruptDecision"
          ? transactionData
          : transactionData.completion.parent,
    }),
  });
}

type CompletionCursorStep =
  | { readonly tag: "stop" }
  | {
      readonly tag: "continue";
      readonly nextTransaction: BattlePendingTransactionData | null;
    }
  | {
      readonly tag: "resume";
      readonly resolution: ResolvedResolution;
      readonly nextTransaction: BattlePendingTransactionData | null;
    }
  | { readonly tag: "result"; readonly result: BattleRuntimeTransactionResult };

function settleCompletionCursor(input: {
  readonly resolution: ResolvedResolution;
  readonly data: BattlePendingTransactionData;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): CompletionCursorStep {
  const data = input.data;
  const currentFrame = currentInterruptCheckpoint(
    input.resolution.session.state,
  );
  if (
    currentFrame !== null &&
    currentFrame.activeInterrupt === undefined &&
    data.checkpointOwnership.tag === "interruptFrontier" &&
    interruptCheckpointIdentity(currentFrame) ===
      data.checkpointOwnership.checkpoint
  ) {
    return {
      tag: "result",
      result: retainedInterruptFrontierResult(input.resolution, data),
    };
  }
  if (
    data.completion.kind === "replaySubject" &&
    transactionOwnerClosedWithAncestor(data, input.resolution.session)
  ) {
    return {
      tag: "continue",
      nextTransaction: data.completion.parent,
    };
  }
  return Match.value(data.completion).pipe(
    Match.when({ kind: "standaloneClose" }, () =>
      settleStandaloneCompletion({
        resolution: input.resolution,
        transaction: data.transaction,
        data,
        ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
      }),
    ),
    Match.when({ kind: "replaySubject" }, () =>
      resumeCompletionCursor({
        ...input,
        data,
        parent: data.completion.parent,
      }),
    ),
    Match.when({ kind: "refreshParentFrontier" }, (completion) =>
      completionStepForRefresh({
        resolution: input.resolution,
        parent: completion.parent,
      }),
    ),
    Match.exhaustive,
  );
}

function settleStandaloneCompletion(input: {
  readonly resolution: ResolvedResolution;
  readonly transaction: BattlePendingTransaction;
  readonly data: BattlePendingTransactionData;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): CompletionCursorStep {
  const currentFrame = currentInterruptCheckpoint(
    input.resolution.session.state,
  );
  if (
    currentFrame !== null &&
    input.data.checkpointOwnership.tag === "interruptFrontier" &&
    interruptCheckpointIdentity(currentFrame) ===
      input.data.checkpointOwnership.checkpoint
  ) {
    return resumeCompletionCursor({
      resolution: input.resolution,
      data: input.data,
      parent: null,
      ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
    });
  }
  if (currentFrame === null) return { tag: "stop" };
  const currentFrontier = interruptDecisionFrontier(
    input.resolution.session.state,
  );
  if (currentFrontier === null) {
    return {
      tag: "result",
      result: transactionDefectResult(input.resolution, {
        tag: "interruptFrontierMissingCheckpoint",
      }),
    };
  }
  const subject = interruptedProcedureSubject(currentFrame.continuation);
  const transaction = createBattlePendingTransaction({
    baseSession: input.resolution.session,
    currentSession: input.resolution.session,
    subject,
    fills: interruptedProcedureFills(currentFrame.continuation),
    holes: [currentFrontier.decisionHole],
    completion: { kind: "replaySubject", parent: null },
  });
  const refreshedResolution: NeedsHolesResolution = {
    tag: "needsHoles",
    session: input.resolution.session,
    envelope: {
      checkpoint: snapshotBattle(input.resolution.session.state),
      frontier: currentFrontier,
    },
  };
  return Result.match(transaction, {
    onFailure: (issue) => ({
      tag: "result" as const,
      result: transactionDefectResult(input.resolution, issue),
    }),
    onSuccess: ({ transaction: token, data }) => ({
      tag: "result" as const,
      result: projectPendingTransactionFrontier(
        refreshedResolution,
        token,
        data.fills,
      ),
    }),
  });
}

function interruptedProcedureFills(
  continuation: BattleInterruptedProcedure,
): readonly BattleFill[] {
  return Match.value(continuation).pipe(
    Match.when({ kind: "replay" }, ({ fills }) => fills),
    Match.when({ kind: "resolved" }, () => []),
    Match.when({ kind: "afterDamageSequence" }, () => []),
    Match.when(
      { kind: "afterDamageSequenceWithPrimaryAttackFollowUp" },
      ({ fills }) => fills,
    ),
    Match.when({ kind: "weaponMasteryCleave" }, ({ fills }) => fills),
    Match.when({ kind: "huntersPreyHordeBreaker" }, ({ fills }) => fills),
    Match.when({ kind: "movement" }, () => []),
    Match.when({ kind: "movementThenAfterDamageSequence" }, () => []),
    Match.when({ kind: "attackDamage" }, () => []),
    Match.exhaustive,
  );
}

function resumeCompletionCursor(input: {
  readonly resolution: ResolvedResolution;
  readonly data: BattlePendingTransactionData;
  readonly parent: BattlePendingTransactionData | null;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): CompletionCursorStep {
  const resumedOutcome = resumePendingLayer({
    resolution: input.resolution,
    data: input.data,
    ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
  });
  return resumedOutcome.tag === "resolved"
    ? {
        tag: "resume",
        resolution: resumedOutcome.resolution,
        nextTransaction:
          resumedOutcome.resolution.session.state.interruptStack.length > 0 ||
          resumedOutcome.resolution.session.state.subjectResolutionPhase
            .kind === "subjectContinuation"
            ? input.parent
            : null,
      }
    : { tag: "result", result: resumedOutcome.result };
}

function completionStepForRefresh(input: {
  readonly resolution: ResolvedResolution;
  readonly parent: BattlePendingTransactionData;
}): CompletionCursorStep {
  const refreshed = refreshParentFrontier(input);
  return Match.value(refreshed).pipe(
    Match.when({ tag: "closed" }, () => ({ tag: "stop" as const })),
    Match.when({ tag: "ownerRetained" }, ({ result }) => ({
      tag: "result" as const,
      result,
    })),
    Match.when({ tag: "nestedCheckpointOpened" }, ({ result }) => ({
      tag: "result" as const,
      result,
    })),
    Match.when({ tag: "ownerClosedContinueUnwind" }, ({ nextTransaction }) => ({
      tag: "continue" as const,
      nextTransaction,
    })),
    Match.exhaustive,
  );
}

function settleResolvedTransaction(input: {
  readonly resolution: ResolvedResolution;
  readonly transaction: BattlePendingTransaction | null;
  readonly pendingData: BattlePendingTransactionData | null;
  readonly operation: BattleRuntimeTransactionOperation;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): BattleRuntimeTransactionResult {
  let resolution = input.resolution;
  const initial = initialCompletionCursor({
    resolution,
    transaction: input.transaction,
    pendingData: input.pendingData,
    operation: input.operation,
  });
  if (initial.tag === "result") return initial.result;
  let completionCursor = initial.cursor;

  if (!runtimeOwnsUnresolvedContinuation(resolution.session)) {
    completionCursor = null;
  }

  while (completionCursor !== null) {
    const step = settleCompletionCursor({
      resolution,
      data: completionCursor,
      ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
    });
    if (step.tag === "result") return step.result;
    if (step.tag === "stop") {
      completionCursor = null;
      continue;
    }
    if (step.tag === "resume") {
      resolution = step.resolution;
      completionCursor = step.nextTransaction;
      continue;
    }
    completionCursor = step.nextTransaction;
  }

  const settledIssue = settledStateIssue(resolution.session);
  return settledIssue === undefined
    ? settledActsResult(resolution)
    : transactionDefectResult(resolution, settledIssue);
}

function checkpointOwnerClosedWithAncestor(
  transaction: BattlePendingTransactionData,
  currentIdentity: InterruptCheckpointIdentity,
): boolean {
  return (
    transaction.checkpointOwnership.tag === "interruptFrontier" &&
    currentIdentity !== transaction.checkpointOwnership.checkpoint &&
    transaction.checkpointOwnership.ancestors.some(
      (ancestor) => ancestor === currentIdentity,
    )
  );
}

function transactionOwnerClosedWithAncestor(
  transaction: BattlePendingTransactionData,
  session: BattleRuntimeSession,
): boolean {
  const currentFrame = currentInterruptCheckpoint(session.state);
  if (currentFrame === null || currentFrame.activeInterrupt !== undefined) {
    return false;
  }
  return checkpointOwnerHasAncestor(
    transaction,
    interruptCheckpointIdentity(currentFrame),
  );
}

function checkpointOwnerHasAncestor(
  transaction: BattlePendingTransactionData,
  currentIdentity: InterruptCheckpointIdentity,
): boolean {
  return (
    transaction.checkpointOwnership.tag === "interruptFrontier" &&
    transaction.checkpointOwnership.ancestors.some(
      (ancestor) => ancestor === currentIdentity,
    )
  );
}

function parentOwnsCheckpoint(
  parent: BattlePendingTransactionData,
  currentIdentity: InterruptCheckpointIdentity,
): boolean {
  return (
    parent.checkpointOwnership.tag === "interruptFrontier" &&
    currentIdentity === parent.checkpointOwnership.checkpoint
  );
}

function refreshParentFrontier(input: {
  readonly resolution: ResolvedResolution;
  readonly parent: BattlePendingTransactionData;
}): RefreshParentFrontierOutcome {
  const parentData = input.parent;
  const currentFrame = currentInterruptCheckpoint(
    input.resolution.session.state,
  );
  if (currentFrame === null || currentFrame.activeInterrupt !== undefined) {
    return { tag: "closed" };
  }
  const currentIdentity = interruptCheckpointIdentity(currentFrame);
  if (checkpointOwnerClosedWithAncestor(parentData, currentIdentity)) {
    return {
      tag: "ownerClosedContinueUnwind",
      nextTransaction: parentData.completion.parent,
    };
  }
  return parentOwnsCheckpoint(parentData, currentIdentity)
    ? retainParentFrontier({ ...input }, parentData)
    : openNestedCheckpoint({ ...input }, currentFrame);
}

function openNestedCheckpoint(
  input: {
    readonly resolution: ResolvedResolution;
    readonly parent: BattlePendingTransactionData;
  },
  currentFrame: NonNullable<ReturnType<typeof currentInterruptCheckpoint>>,
): RefreshParentFrontierOutcome {
  const currentFrontier = interruptDecisionFrontier(
    input.resolution.session.state,
  );
  if (currentFrontier === null) {
    return {
      tag: "ownerRetained",
      result: transactionDefectResult(input.resolution, {
        tag: "interruptFrontierMissingCheckpoint",
      }),
    };
  }
  const nestedSubject = interruptedProcedureSubject(currentFrame.continuation);
  const nestedResolution: NeedsHolesResolution = {
    tag: "needsHoles",
    session: input.resolution.session,
    envelope: {
      checkpoint: snapshotBattle(input.resolution.session.state),
      frontier: currentFrontier,
    },
  };
  const nestedTransaction = createBattlePendingTransaction({
    baseSession: input.resolution.session,
    currentSession: input.resolution.session,
    subject: nestedSubject,
    fills: [],
    holes: [currentFrontier.decisionHole],
    completion: completionForSubject(nestedSubject, input.parent),
  });
  return Result.match(nestedTransaction, {
    onFailure: (issue) => ({
      tag: "ownerRetained" as const,
      result: transactionDefectResult(input.resolution, issue),
    }),
    onSuccess: ({ transaction, data }) => ({
      tag: "nestedCheckpointOpened" as const,
      result: projectPendingTransactionFrontier(
        nestedResolution,
        transaction,
        data.fills,
      ),
    }),
  });
}

function retainParentFrontier(
  input: {
    readonly resolution: ResolvedResolution;
  },
  parentData: BattlePendingTransactionData,
): RefreshParentFrontierOutcome {
  return {
    tag: "ownerRetained",
    result: retainedInterruptFrontierResult(input.resolution, parentData),
  };
}

function retainedInterruptFrontierResult(
  resolution: ResolvedResolution,
  transactionData: BattlePendingTransactionData,
): BattleRuntimeTransactionResult {
  const currentFrontier = interruptDecisionFrontier(resolution.session.state);
  if (currentFrontier === null) {
    return transactionDefectResult(resolution, {
      tag: "interruptFrontierMissingCheckpoint",
    });
  }
  const refreshedResolution: NeedsHolesResolution = {
    tag: "needsHoles",
    session: resolution.session,
    envelope: {
      checkpoint: snapshotBattle(resolution.session.state),
      frontier: currentFrontier,
    },
  };
  const refreshedTransaction = createBattlePendingTransaction({
    baseSession: transactionData.baseSession,
    currentSession: resolution.session,
    subject: transactionData.subject,
    fills: transactionData.fills,
    holes: [currentFrontier.decisionHole],
    completion: transactionData.completion,
  });
  return Result.match(refreshedTransaction, {
    onFailure: (issue) => transactionDefectResult(resolution, issue),
    onSuccess: ({ transaction, data }) =>
      projectPendingTransactionFrontier(
        refreshedResolution,
        transaction,
        data.fills,
      ),
  });
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
  readonly data: BattlePendingTransactionData;
  readonly statBlockCatalog?: FindFamiliarStatBlockCatalog;
}): ResumePendingLayerResult {
  const data = input.data;
  const currentCheckpoint = currentInterruptCheckpoint(
    input.resolution.session.state,
  );
  const resumed = resolveBattleRuntimeSubjectForReplay({
    session: input.resolution.session,
    subject: data.subject,
    fills: data.fills,
    ...(currentCheckpoint === null
      ? {}
      : { handledInterruptTrigger: currentCheckpoint.trigger }),
    ...optionalProperty("statBlockCatalog", input.statBlockCatalog),
  });
  return Match.value(resumed).pipe(
    Match.when({ tag: "invalid" }, (invalid) => ({
      tag: "result" as const,
      result: transactionInvalidResult(invalid, data.transaction),
    })),
    Match.when({ tag: "needsHoles" }, (needsHoles) => ({
      tag: "result" as const,
      result: transactionNeedsHolesResult(
        {
          session: input.resolution.session,
          transaction: data.transaction,
          pendingData: data,
          operation: {
            kind: "ordinarySubject",
            subject: data.subject,
            fills: [],
          },
        },
        needsHoles,
      ),
    })),
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
  return Option.match(Option.fromNullishOr(nonEmptyActs), {
    onNone: () =>
      transactionDefectResult(resolution, { tag: "emptyActsAtSettledPoint" }),
    onSome: (acts) => ({
      tag: "settled" as const,
      resolution,
      session: resolution.session,
      acts,
    }),
  });
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
    envelope: battleCheckpointFrontierEnvelope(session.state),
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
