import { optionalProperty } from "../optional-property.ts";
import { Match } from "effect";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";
import type {
  AdmittedBattleResolutionInput,
  BattleFill,
  BattleInterruptCheckpoint,
  BattleInterruptRouteOptions,
  BattleInterruptedProcedure,
  BattleReplayContinuationFrame,
  BattleReplayParentPosition,
  BattleResolutionResult,
  BattleState,
  GlyphStoredSpellReleaseReplayContext,
} from "../battle-state-execution.ts";
import { battleContinuationFillEquals } from "./battle-fill-equality.ts";
import {
  currentInterruptCheckpoint,
  currentInterruptFrame,
  snapshotBattle,
} from "./battle-snapshot.ts";
import { releaseGlyphStoredSpell } from "./glyph-durable-occurrence.ts";
import { interruptCheckpointFrame } from "./interrupt-execution.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";
import { invalidResult } from "./result-helpers.ts";
import type { SpellProcedureExecutionRegistry } from "./spell-procedure-profiles/execution-registry.ts";
import { mergeObjectOutcomeResult } from "./object-outcome-accumulation.ts";

const admittedReplayContinuationSubject = Symbol(
  "AdmittedReplayContinuationSubject",
);

const replayParentContinuation = Symbol("ReplayParentContinuation");

export type ReplayParentContinuation = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly [replayParentContinuation]: true;
};

export function replayParentContinuationFor(
  input: Pick<ReplayParentContinuation, "state" | "subject" | "fills">,
): ReplayParentContinuation {
  return { ...input, [replayParentContinuation]: true };
}

export function replayParentProcedureAt(
  parent: ReplayParentContinuation,
  position: BattleReplayParentPosition,
): Extract<BattleInterruptedProcedure, { readonly kind: "replay" }> {
  return {
    kind: "replay",
    subject: parent.subject,
    fills: parent.fills,
    parentPosition: position,
  };
}

export function projectReplayChildResult(
  parent: ReplayParentContinuation,
  child: BattleResolutionResult,
): BattleResolutionResult {
  return Match.value(child).pipe(
    Match.when({ tag: "needsHoles" }, (result) => {
      const state =
        result.state.interruptStack.length > parent.state.interruptStack.length
          ? result.state
          : parent.state;
      return needsHolesResult(state, parent.subject, result.holes);
    }),
    Match.when({ tag: "invalid" }, (result) =>
      invalidResult(parent.state, result.reason, result.message),
    ),
    Match.when({ tag: "resolved" }, (result) => result),
    Match.exhaustive,
  );
}

export type AdmittedReplayContinuationSubject = {
  readonly input: AdmittedBattleResolutionInput;
  readonly interruptRouteOptions: Extract<
    BattleInterruptRouteOptions,
    { readonly replayingInterruptedProcedure: true }
  >;
  readonly [admittedReplayContinuationSubject]: true;
};

type ResolveReplayContinuationSubject = (
  admitted: AdmittedReplayContinuationSubject,
  executionRegistry: SpellProcedureExecutionRegistry,
) => BattleResolutionResult;

type GlyphStoredSpellReleaseInput = Omit<
  Parameters<typeof releaseGlyphStoredSpell>[0],
  "executionRegistry"
>;

export class ReplayContinuationExecution {
  private constructor(
    private readonly executionRegistry: SpellProcedureExecutionRegistry,
    private readonly subjectResolver: ResolveReplayContinuationSubject,
  ) {}

  static fromExecutionRegistry(
    executionRegistry: SpellProcedureExecutionRegistry,
    subjectResolver: ResolveReplayContinuationSubject,
  ): ReplayContinuationExecution {
    return new ReplayContinuationExecution(executionRegistry, subjectResolver);
  }

  resolveSubject(
    admitted: AdmittedReplayContinuationSubject,
  ): BattleResolutionResult {
    return this.subjectResolver(admitted, this.executionRegistry);
  }

  releaseStoredGlyph(
    input: GlyphStoredSpellReleaseInput,
  ): ReturnType<typeof releaseGlyphStoredSpell> {
    return releaseGlyphStoredSpell({
      ...input,
      executionRegistry: this.executionRegistry,
    });
  }
}

type ReplayContinuationResolutionInput = {
  readonly state: BattleState;
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
  readonly handledInterruptTrigger: BattleInterruptTrigger;
  readonly fills: readonly BattleFill[];
  readonly execution: ReplayContinuationExecution;
};

export function replayContinuationFrame(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  handledInterruptTrigger: BattleInterruptTrigger,
): BattleReplayContinuationFrame {
  return {
    kind: "replayContinuation",
    continuation,
    handledInterruptTrigger,
  };
}

export function resolveReplayContinuation(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly execution: ReplayContinuationExecution;
}): BattleResolutionResult {
  const frame = currentInterruptFrame(input.state);
  if (
    frame?.kind !== "replayContinuation" ||
    !sameBattleSubject(input.subject, frame.continuation.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Interrupted procedure replay must be resolved before other battle subjects.",
    );
  }
  return resolveReplayContinuationFromState({
    state: {
      ...input.state,
      interruptStack: input.state.interruptStack.slice(0, -1),
    },
    continuation: frame.continuation,
    handledInterruptTrigger: frame.handledInterruptTrigger,
    fills: reconstructReplayContinuationFills(
      frame.continuation.fills,
      input.fills,
    ),
    execution: input.execution,
  });
}

export function reconstructReplayContinuationFills(
  recordedFills: readonly BattleFill[],
  submittedFills: readonly BattleFill[],
): readonly BattleFill[] {
  return [
    ...recordedFills,
    ...replayContinuationSuffixFills(recordedFills, submittedFills),
  ];
}

function replayContinuationSuffixFills(
  recordedFills: readonly BattleFill[],
  submittedFills: readonly BattleFill[],
): readonly BattleFill[] {
  let recordedSearchStart = 0;
  return submittedFills.filter((submittedFill) => {
    const recordedIndex = recordedFills.findIndex(
      (recordedFill, index) =>
        index >= recordedSearchStart &&
        replayContinuationRecordedFillMatches(recordedFill, submittedFill),
    );
    if (recordedIndex === -1) {
      return true;
    }
    recordedSearchStart = recordedIndex + 1;
    return false;
  });
}

const replayContinuationSemanticFillKinds = [
  "targetChoice",
  "attackRoll",
  "rolledDice",
] as const satisfies ReadonlyArray<BattleFill["kind"]>;

type ReplayContinuationSemanticFill = Extract<
  BattleFill,
  { readonly kind: (typeof replayContinuationSemanticFillKinds)[number] }
>;

function replayContinuationRecordedFillMatches(
  recordedFill: BattleFill,
  submittedFill: BattleFill,
): boolean {
  return (
    recordedFill === submittedFill ||
    replayContinuationSemanticFillEquals(recordedFill, submittedFill)
  );
}

function replayContinuationSemanticFillEquals(
  recordedFill: BattleFill,
  submittedFill: BattleFill,
): boolean {
  if (
    !isReplayContinuationSemanticFill(recordedFill) ||
    !isReplayContinuationSemanticFill(submittedFill)
  ) {
    return false;
  }
  return battleContinuationFillEquals(recordedFill, submittedFill);
}

function isReplayContinuationSemanticFill(
  fill: BattleFill,
): fill is ReplayContinuationSemanticFill {
  return replayContinuationSemanticFillKinds.some((kind) => kind === fill.kind);
}

export function resolveReplayContinuationFromState(
  input: ReplayContinuationResolutionInput,
): BattleResolutionResult {
  const glyphStoredSpellReleaseReplay =
    input.continuation.glyphStoredSpellReleaseReplay;
  if (glyphStoredSpellReleaseReplay !== undefined) {
    return resolveGlyphStoredSpellReplayContinuationFromState(
      input,
      glyphStoredSpellReleaseReplay,
    );
  }
  const admission = admitBattleResolutionInput({
    state: input.state,
    subject: input.continuation.subject,
    fills: input.fills,
  });
  if (admission.tag === "staleCharacterProcedure") {
    return invalidResult(
      input.state,
      "staleSubject",
      "The interrupted character procedure reference is no longer bound to its actor.",
    );
  }
  const result = input.execution.resolveSubject(
    admitReplayContinuationSubject(
      admission.input,
      replayInterruptRouteOptions(
        input.continuation,
        input.handledInterruptTrigger,
      ),
    ),
  );
  if (
    result.tag !== "needsHoles" ||
    replayChangedInterruptStackDepth(input.state, result.state)
  ) {
    return result.tag === "resolved"
      ? mergeObjectOutcomeResult(result, input.continuation.objectOutcomes)
      : result;
  }
  const interruptCheckpoint = currentInterruptCheckpoint(result.state);
  const activeInterrupt = interruptCheckpoint?.activeInterrupt;
  if (
    interruptCheckpoint !== null &&
    activeInterrupt !== undefined &&
    sameBattleSubject(activeInterrupt.subject, input.continuation.subject)
  ) {
    const pendingState =
      activeInterruptWithReplayContinuationAttackDamageChanges(
        result.state,
        input.continuation,
        { ...interruptCheckpoint, activeInterrupt },
      );
    return {
      ...result,
      state: pendingState,
      snapshot: snapshotBattle(pendingState),
    };
  }
  const pendingState = {
    ...result.state,
    interruptStack: [
      ...result.state.interruptStack,
      replayContinuationFrame(
        input.continuation,
        input.handledInterruptTrigger,
      ),
    ],
  };
  return {
    ...result,
    state: pendingState,
    snapshot: snapshotBattle(pendingState),
  };
}

function admitReplayContinuationSubject(
  input: AdmittedBattleResolutionInput,
  interruptRouteOptions: Extract<
    BattleInterruptRouteOptions,
    { readonly replayingInterruptedProcedure: true }
  >,
): AdmittedReplayContinuationSubject {
  return {
    input,
    interruptRouteOptions,
    [admittedReplayContinuationSubject]: true,
  };
}

function replayChangedInterruptStackDepth(
  stateBeforeReplay: BattleState,
  stateAfterReplay: BattleState,
): boolean {
  return (
    stateAfterReplay.interruptStack.length !==
    stateBeforeReplay.interruptStack.length
  );
}

function replayInterruptRouteOptions(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  handledInterruptTrigger: BattleInterruptTrigger,
): Extract<
  BattleInterruptRouteOptions,
  { readonly replayingInterruptedProcedure: true }
> {
  return {
    replayingInterruptedProcedure: true,
    handledInterruptTrigger,
    ...optionalProperty("replayParentPosition", continuation.parentPosition),
    ...optionalProperty(
      "pendingAttackDamageReductions",
      continuation.attackDamageReductions,
    ),
    ...optionalProperty(
      "pendingAttackDamageAdditions",
      continuation.attackDamageAdditions,
    ),
  };
}

function resolveGlyphStoredSpellReplayContinuationFromState(
  input: ReplayContinuationResolutionInput,
  replay: GlyphStoredSpellReleaseReplayContext,
): BattleResolutionResult {
  const result = input.execution.releaseStoredGlyph({
    state: input.state,
    profile: replay.profile,
    witness: {
      ...replay.witness,
      fills: input.fills,
    },
    handledInterruptTrigger: input.handledInterruptTrigger,
  });
  if (result.tag === "released") {
    return mergeObjectOutcomeResult(
      {
        tag: "resolved",
        state: result.state,
        snapshot: snapshotBattle(result.state),
      },
      input.continuation.objectOutcomes,
    );
  }
  if (result.tag === "needsHoles") {
    if (replayChangedInterruptStackDepth(input.state, result.state)) {
      return needsHolesResult(
        result.state,
        input.continuation.subject,
        result.holes,
      );
    }
    const pendingState = {
      ...result.state,
      interruptStack: [
        ...result.state.interruptStack,
        replayContinuationFrame(
          input.continuation,
          input.handledInterruptTrigger,
        ),
      ],
    };
    return needsHolesResult(
      pendingState,
      input.continuation.subject,
      result.holes,
    );
  }
  if (result.tag === "notFound") {
    return invalidResult(
      result.state,
      "staleSubject",
      "Glyph stored spell release replay no longer has a matching durable occurrence.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (result.tag === "ambiguousOccurrence") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      result.state,
      "invalidFill",
      "Glyph stored spell release replay matched multiple durable occurrences.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
  return invalidResult(
    result.state,
    "invalidFill",
    result.message ??
      `Glyph stored spell release replay witness is invalid: ${result.reason}.`,
  );
  /* v8 ignore stop -- @preserve */
}

type ActiveInterruptCheckpoint = BattleInterruptCheckpoint & {
  readonly activeInterrupt: NonNullable<
    BattleInterruptCheckpoint["activeInterrupt"]
  >;
};

function activeInterruptWithReplayContinuationAttackDamageChanges(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  frame: ActiveInterruptCheckpoint,
): BattleState {
  if (
    continuation.attackDamageReductions === undefined &&
    continuation.attackDamageAdditions === undefined
  ) {
    return state;
  }
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      interruptCheckpointFrame({
        ...frame,
        activeInterrupt: {
          ...frame.activeInterrupt,
          ...(continuation.attackDamageReductions === undefined
            ? {}
            : {
                pendingAttackDamageReductions:
                  continuation.attackDamageReductions,
              }),
          ...(continuation.attackDamageAdditions === undefined
            ? {}
            : {
                pendingAttackDamageAdditions:
                  continuation.attackDamageAdditions,
              }),
        },
      }),
    ],
  };
}
