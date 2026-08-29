import { optionalProperty } from "../optional-property.ts";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  BattleCloudkillAreaMembershipTrigger,
  BattleInsectPlagueAreaMembershipTrigger,
  BattleSubject,
} from "../battle-subjects.ts";
import type {
  BattleActiveEffect,
  BattleCloudkillAreaHazardDamageRollHole,
  BattleCloudkillAreaHazardSavingThrowOutcomeHole,
  BattleCloudkillAreaHazardTrigger,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleFill,
  BattleHandledInterruptOccurrence,
  BattleHoleId,
  BattleInsectPlagueAreaHazardDamageRollHole,
  BattleInsectPlagueAreaHazardSavingThrowOutcomeHole,
  BattleInsectPlagueAreaHazardTrigger,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleState,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import type { BattleEffectExecutionRef, CombatantId } from "../identity.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  rolledDiceFillForHole,
  savingThrowOutcomeFillForHole,
} from "./fill-hole-protocol.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  projectReplayChildResult,
  replayParentContinuationFor,
  replayParentProcedureAt,
  type ReplayParentContinuation,
} from "./replay-continuation.ts";
import {
  markCloudkillAreaHazardSavedThisTurn,
  markInsectPlagueAreaHazardSavedThisTurn,
} from "./spells-active-effects.ts";
import {
  applyPreparedSlotSpellDamage,
  applySaveDamageResult,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";

type InsectPlagueAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "insectPlagueAreaHazard" }
>;

export type CloudkillAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "cloudkillAreaHazard" }
>;

export type CloudkillMovementSaveDamageRequest = {
  readonly effect: CloudkillAreaHazardEffect;
  readonly subject: CloudkillResolutionInput["subject"];
};

type PersistentAreaResolvedHoleIds = {
  readonly save: BattleHoleId;
  readonly damage: BattleHoleId;
  readonly concentration: BattleHoleId | null;
  readonly disposition: BattleHoleId | null;
};

type PersistentAreaResolutionContext =
  | { readonly kind: "standalone" }
  | {
      readonly kind: "replayParent";
      readonly parent: ReplayParentContinuation;
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
      readonly sequence: BattleStartTurnOccurrenceSequenceCheckpoint["sequence"];
      readonly completedPrefixHoleIds: BattleStartTurnOccurrenceSequenceCheckpoint["completedPrefixHoleIds"];
      readonly roundDurationCohort: BattleStartTurnOccurrenceSequenceCheckpoint["roundDurationCohort"];
      readonly occurrence: BattleStartTurnOccurrenceSequenceCheckpoint["child"];
      readonly handledPosition:
        | BattleStartTurnOccurrenceSequenceCheckpoint
        | undefined;
    };

type PersistentAreaSaveDamageStep =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly holeIds: PersistentAreaResolvedHoleIds;
      readonly matchedHandledPosition: boolean;
    }
  | {
      readonly tag: "result";
      readonly result: BattleResolutionResult;
    };

export type CloudkillMovementSaveDamageSequenceResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly saveHoleIds: ReadonlySet<BattleHoleId>;
      readonly damageHoleIds: ReadonlySet<BattleHoleId>;
      readonly concentrationHoleIds: ReadonlySet<BattleHoleId>;
      readonly dispositionHoleIds: ReadonlySet<BattleHoleId>;
    }
  | {
      readonly tag: "result";
      readonly result: BattleResolutionResult;
    };

type CloudkillMovementSequenceContinuation =
  | {
      readonly kind: "turnBoundaryReplay";
      readonly sequence: BattleStartTurnOccurrenceSequenceCheckpoint["sequence"];
      readonly completedPrefixHoleIds: BattleStartTurnOccurrenceSequenceCheckpoint["completedPrefixHoleIds"];
      readonly roundDurationCohort: BattleStartTurnOccurrenceSequenceCheckpoint["roundDurationCohort"];
    }
  | {
      readonly kind: "advancedPrefixAtCheckpoint";
      readonly checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint;
    }
  | {
      readonly kind: "advancedPrefixAfterCheckpoint";
      readonly checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint;
    };

type CloudkillMovementReplayFacts = Pick<
  Extract<PersistentAreaResolutionContext, { readonly kind: "replayParent" }>,
  | "sequence"
  | "completedPrefixHoleIds"
  | "roundDurationCohort"
  | "handledPosition"
>;

type CloudkillMovementRequestStep =
  | { readonly tag: "stopped" }
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | Extract<PersistentAreaSaveDamageStep, { readonly tag: "resolved" }>;

type InsectPlagueResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "insectPlagueAreaHazardSave";
    }
  >;
  readonly handledSaveFailedOccurrence?: Extract<
    BattleHandledInterruptOccurrence,
    { readonly trigger: "saveFailed" }
  >;
};

type CloudkillResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "cloudkillAreaHazardSave";
    }
  >;
  readonly handledSaveFailedOccurrence?: Extract<
    BattleHandledInterruptOccurrence,
    { readonly trigger: "saveFailed" }
  >;
};

type ParsedPersistentAreaSaveDamageProcedure =
  | {
      readonly kind: "insectPlague";
      readonly resolution: InsectPlagueResolutionInput;
      readonly target: BattleCreatureState;
      readonly locatedEffect: {
        readonly effectOwnerId: CombatantId;
        readonly effect: InsectPlagueAreaHazardEffect;
      };
      readonly trigger: BattleInsectPlagueAreaHazardTrigger;
    }
  | {
      readonly kind: "cloudkill";
      readonly resolution: CloudkillResolutionInput;
      readonly target: BattleCreatureState;
      readonly locatedEffect: {
        readonly effectOwnerId: CombatantId;
        readonly effect: CloudkillAreaHazardEffect;
      };
      readonly trigger: BattleCloudkillAreaHazardTrigger;
    };

type PersistentAreaSaveDamageProcedureCandidate =
  | {
      readonly kind: "insectPlague";
      readonly resolution: InsectPlagueResolutionInput;
      readonly target: BattleCreatureState | undefined;
      readonly locatedEffect:
        | {
            readonly effectOwnerId: CombatantId;
            readonly effect: InsectPlagueAreaHazardEffect;
          }
        | undefined;
      readonly trigger: BattleInsectPlagueAreaHazardTrigger;
    }
  | {
      readonly kind: "cloudkill";
      readonly resolution: CloudkillResolutionInput;
      readonly target: BattleCreatureState | undefined;
      readonly locatedEffect:
        | {
            readonly effectOwnerId: CombatantId;
            readonly effect: CloudkillAreaHazardEffect;
          }
        | undefined;
      readonly trigger: BattleCloudkillAreaHazardTrigger;
    };

type PersistentAreaProcedureHoles =
  | {
      readonly saveHole: BattleInsectPlagueAreaHazardSavingThrowOutcomeHole;
      readonly damageHole: BattleInsectPlagueAreaHazardDamageRollHole;
    }
  | {
      readonly saveHole: BattleCloudkillAreaHazardSavingThrowOutcomeHole;
      readonly damageHole: BattleCloudkillAreaHazardDamageRollHole;
    };

type PersistentAreaProcedureParseResult =
  | {
      readonly tag: "parsed";
      readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    };

export function resolveInsectPlagueAreaSaveDamage(
  resolution: InsectPlagueResolutionInput,
): BattleResolutionResult {
  const allowedFillIssue = persistentAreaAllowedFillIssue(
    resolution,
    "Insect Plague",
  );
  if (allowedFillIssue !== null) {
    return allowedFillIssue;
  }
  const locatedEffect = activeEffectForRef(
    resolution.state,
    resolution.subject.areaMembershipTrigger.effectRef,
    (candidate): candidate is InsectPlagueAreaHazardEffect =>
      candidate.kind === "insectPlagueAreaHazard",
  );
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "insectPlague",
    resolution,
    target: resolution.state.combatants.get(resolution.subject.actorId),
    locatedEffect,
    trigger: persistentAreaTriggerFromMembershipFact(
      resolution.subject.areaMembershipTrigger,
    ),
  });
  return parsed.tag === "invalid"
    ? parsed.result
    : resolveParsedPersistentAreaSaveDamage(parsed.procedure);
}

export function resolveCloudkillAreaSaveDamage(
  resolution: CloudkillResolutionInput,
): BattleResolutionResult {
  const allowedFillIssue = persistentAreaAllowedFillIssue(
    resolution,
    "Cloudkill",
  );
  if (allowedFillIssue !== null) {
    return allowedFillIssue;
  }
  const locatedEffect = activeEffectForRef(
    resolution.state,
    resolution.subject.areaMembershipTrigger.effectRef,
    (candidate): candidate is CloudkillAreaHazardEffect =>
      candidate.kind === "cloudkillAreaHazard",
  );
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "cloudkill",
    resolution,
    target: resolution.state.combatants.get(resolution.subject.actorId),
    locatedEffect,
    trigger: persistentAreaTriggerFromMembershipFact(
      resolution.subject.areaMembershipTrigger,
    ),
  });
  return parsed.tag === "invalid"
    ? parsed.result
    : resolveParsedPersistentAreaSaveDamage(parsed.procedure);
}

function persistentAreaAppearanceTriggerMatchesCastOccurrence(
  state: BattleState,
  trigger:
    | BattleInsectPlagueAreaMembershipTrigger
    | BattleCloudkillAreaMembershipTrigger,
  effect: InsectPlagueAreaHazardEffect | CloudkillAreaHazardEffect,
): boolean {
  return (
    trigger.kind === "appearsInArea" &&
    effect.appearanceOccurrence.actorId === currentActorId(state) &&
    effect.appearanceOccurrence.round === state.initiative.round
  );
}

export function resolveCloudkillMovementSaveDamageSequence(input: {
  readonly advancedState: BattleState;
  readonly parent: ReplayParentContinuation;
  readonly requests: readonly CloudkillMovementSaveDamageRequest[];
  readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
  readonly continuation: CloudkillMovementSequenceContinuation;
}): CloudkillMovementSaveDamageSequenceResult {
  const saveHoleIds = new Set<BattleHoleId>();
  const damageHoleIds = new Set<BattleHoleId>();
  const concentrationHoleIds = new Set<BattleHoleId>();
  const dispositionHoleIds = new Set<BattleHoleId>();
  const replayFacts = cloudkillMovementReplayFacts(input.continuation);
  let parentPositionMatched = replayFacts.handledPosition === undefined;
  let state = input.advancedState;

  for (const [requestIndex, request] of input.requests.entries()) {
    const step = resolveCloudkillMovementSaveDamageRequest({
      state,
      parent: input.parent,
      request,
      sourceTurn: input.sourceTurn,
      continuation: input.continuation,
      replayFacts,
      isFirstRequest: requestIndex === 0,
    });
    if (step.tag === "stopped") break;
    if (step.tag === "result") return step;
    state = step.state;
    addPersistentAreaResolvedHoleIds(
      {
        saveHoleIds,
        damageHoleIds,
        concentrationHoleIds,
        dispositionHoleIds,
      },
      step.holeIds,
    );
    parentPositionMatched ||= step.matchedHandledPosition;
  }

  if (!parentPositionMatched) {
    return invalidCloudkillMovementSaveDamageSequence(input.parent);
  }
  return {
    tag: "resolved",
    state,
    saveHoleIds,
    damageHoleIds,
    concentrationHoleIds,
    dispositionHoleIds,
  };
}

const byCloudkillMovementSequenceContinuationKind = Match.discriminator("kind");

function cloudkillMovementReplayFacts(
  continuation: CloudkillMovementSequenceContinuation,
): CloudkillMovementReplayFacts {
  return Match.value(continuation).pipe(
    byCloudkillMovementSequenceContinuationKind(
      "turnBoundaryReplay",
      ({ sequence, completedPrefixHoleIds, roundDurationCohort }) => ({
        sequence,
        completedPrefixHoleIds,
        roundDurationCohort,
        handledPosition: undefined,
      }),
    ),
    byCloudkillMovementSequenceContinuationKind(
      "advancedPrefixAtCheckpoint",
      ({ checkpoint }) => ({
        sequence: checkpoint.sequence,
        completedPrefixHoleIds: checkpoint.completedPrefixHoleIds,
        roundDurationCohort: checkpoint.roundDurationCohort,
        handledPosition: checkpoint,
      }),
    ),
    byCloudkillMovementSequenceContinuationKind(
      "advancedPrefixAfterCheckpoint",
      ({ checkpoint }) => ({
        sequence: checkpoint.sequence,
        completedPrefixHoleIds: checkpoint.completedPrefixHoleIds,
        roundDurationCohort: checkpoint.roundDurationCohort,
        handledPosition: undefined,
      }),
    ),
    Match.exhaustive,
  );
}

function resolveCloudkillMovementSaveDamageRequest(input: {
  readonly state: BattleState;
  readonly parent: ReplayParentContinuation;
  readonly request: CloudkillMovementSaveDamageRequest;
  readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
  readonly continuation: CloudkillMovementSequenceContinuation;
  readonly replayFacts: CloudkillMovementReplayFacts;
  readonly isFirstRequest: boolean;
}): CloudkillMovementRequestStep {
  const requestParent =
    input.continuation.kind === "turnBoundaryReplay"
      ? input.parent
      : replayParentContinuationFor({
          state: input.state,
          subject: input.parent.subject,
          fills: input.parent.fills,
        });
  const locatedActiveEffect = activeEffectForRef(
    input.state,
    input.request.effect.effectRef,
    (candidate): candidate is CloudkillAreaHazardEffect =>
      candidate.kind === "cloudkillAreaHazard",
  );
  if (!input.isFirstRequest && locatedActiveEffect === undefined) {
    return { tag: "stopped" };
  }
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "cloudkill",
    resolution: {
      state: input.state,
      subject: input.request.subject,
      fills: input.parent.fills,
    },
    target: input.state.combatants.get(input.request.subject.actorId),
    locatedEffect: locatedActiveEffect,
    trigger: persistentAreaTriggerFromMembershipFact(
      input.request.subject.areaMembershipTrigger,
    ),
  });
  if (parsed.tag === "invalid") {
    return {
      tag: "result",
      result: projectReplayChildResult(requestParent, parsed.result),
    };
  }
  return resolvePersistentAreaSaveDamageStep({
    procedure: parsed.procedure,
    context: {
      kind: "replayParent",
      parent: requestParent,
      sourceTurn: input.sourceTurn,
      sequence: input.replayFacts.sequence,
      completedPrefixHoleIds: input.replayFacts.completedPrefixHoleIds,
      roundDurationCohort: input.replayFacts.roundDurationCohort,
      occurrence: {
        kind: "cloudkillMovementSaveDamageSequence",
        effectRef: input.request.effect.effectRef,
        targetId: input.request.subject.actorId,
      },
      handledPosition: input.replayFacts.handledPosition,
    },
  });
}

function addPersistentAreaResolvedHoleIds(
  target: {
    readonly saveHoleIds: Set<BattleHoleId>;
    readonly damageHoleIds: Set<BattleHoleId>;
    readonly concentrationHoleIds: Set<BattleHoleId>;
    readonly dispositionHoleIds: Set<BattleHoleId>;
  },
  holeIds: PersistentAreaResolvedHoleIds,
): void {
  target.saveHoleIds.add(holeIds.save);
  target.damageHoleIds.add(holeIds.damage);
  if (holeIds.concentration !== null) {
    target.concentrationHoleIds.add(holeIds.concentration);
  }
  if (holeIds.disposition !== null) {
    target.dispositionHoleIds.add(holeIds.disposition);
  }
}

function sameCloudkillMovementSaveDamagePosition(
  left: BattleStartTurnOccurrenceSequenceCheckpoint,
  right: BattleStartTurnOccurrenceSequenceCheckpoint,
): boolean {
  return (
    left.kind === right.kind &&
    sameStartTurnOccurrenceSequence(left.sequence, right.sequence) &&
    sameStartTurnSourceTurn(left.sourceTurn, right.sourceTurn) &&
    sameCloudkillMovementChild(left.child, right.child) &&
    sameReadonlyArray(
      left.completedPrefixHoleIds,
      right.completedPrefixHoleIds,
    ) &&
    sameRoundDurationCohort(left.roundDurationCohort, right.roundDurationCohort)
  );
}

function sameReadonlyArray<T>(
  left: readonly T[],
  right: readonly T[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameStartTurnOccurrenceSequence(
  left: BattleStartTurnOccurrenceSequenceCheckpoint["sequence"],
  right: BattleStartTurnOccurrenceSequenceCheckpoint["sequence"],
): boolean {
  return Match.value(left).pipe(
    Match.when(
      { kind: "single" },
      ({ occurrenceId }) =>
        right.kind === "single" && occurrenceId === right.occurrenceId,
    ),
    Match.when(
      { kind: "ordered" },
      ({ occurrenceIds }) =>
        right.kind === "ordered" &&
        sameReadonlyArray(occurrenceIds, right.occurrenceIds),
    ),
    Match.exhaustive,
  );
}

function sameStartTurnSourceTurn(
  left: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  right: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
): boolean {
  return left.actorId === right.actorId && left.round === right.round;
}

function sameCloudkillMovementChild(
  left: BattleStartTurnOccurrenceSequenceCheckpoint["child"],
  right: BattleStartTurnOccurrenceSequenceCheckpoint["child"],
): boolean {
  return left.effectRef === right.effectRef && left.targetId === right.targetId;
}

function sameRoundDurationCohort(
  left: BattleStartTurnOccurrenceSequenceCheckpoint["roundDurationCohort"],
  right: BattleStartTurnOccurrenceSequenceCheckpoint["roundDurationCohort"],
): boolean {
  return (
    sameReadonlyArray(left.activeEffectRefs, right.activeEffectRefs) &&
    sameReadonlyArray(left.lightEmitterRefs, right.lightEmitterRefs)
  );
}

function invalidCloudkillMovementSaveDamageSequence(
  parent: ReplayParentContinuation,
): CloudkillMovementSaveDamageSequenceResult {
  return {
    tag: "result",
    result: invalidResult(
      parent.state,
      "staleSubject",
      "Cloudkill movement damage could not continue from its current start-turn boundary.",
    ),
  };
}

function persistentAreaAllowedFillIssue(
  resolution: BattleResolutionInput,
  procedureName: "Insect Plague" | "Cloudkill",
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> | null {
  return resolution.fills.some(
    (fill) =>
      fill.kind !== "savingThrowOutcome" &&
      fill.kind !== "rolledDice" &&
      fill.kind !== "concentrationSavingThrow" &&
      fill.kind !== "attackDamageDisposition",
  )
    ? invalidResult(
        resolution.state,
        "invalidFill",
        `${procedureName} save accepts only save, damage, damage disposition, and Concentration fills.`,
      )
    : null;
}

function parsePersistentAreaSaveDamageProcedure(
  candidate: PersistentAreaSaveDamageProcedureCandidate,
): PersistentAreaProcedureParseResult {
  const membershipTrigger = candidate.resolution.subject.areaMembershipTrigger;
  if (
    candidate.locatedEffect === undefined ||
    candidate.locatedEffect.effect.areaId !== membershipTrigger.areaId
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        candidate.resolution.state,
        "staleSubject",
        `${persistentAreaProcedureName(candidate.kind)} save is no longer available.`,
      ),
    };
  }
  if (
    membershipTrigger.kind === "appearsInArea" &&
    !persistentAreaAppearanceTriggerMatchesCastOccurrence(
      candidate.resolution.state,
      membershipTrigger,
      candidate.locatedEffect.effect,
    )
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        candidate.resolution.state,
        "staleSubject",
        `${persistentAreaProcedureName(candidate.kind)} appearance save is outside its cast occurrence.`,
      ),
    };
  }
  if (candidate.target === undefined) {
    return {
      tag: "invalid",
      result: invalidResult(
        candidate.resolution.state,
        "staleSubject",
        `${persistentAreaProcedureName(candidate.kind)} save target is no longer available.`,
      ),
    };
  }
  if (
    candidate.locatedEffect.effect.savedThisTurn.includes(
      candidate.resolution.subject.actorId,
    )
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        candidate.resolution.state,
        "staleSubject",
        `${persistentAreaProcedureName(candidate.kind)} save was already resolved for this target this turn.`,
      ),
    };
  }
  return {
    tag: "parsed",
    procedure:
      candidate.kind === "insectPlague"
        ? {
            kind: candidate.kind,
            resolution: candidate.resolution,
            target: candidate.target,
            locatedEffect: candidate.locatedEffect,
            trigger: candidate.trigger,
          }
        : {
            kind: candidate.kind,
            resolution: candidate.resolution,
            target: candidate.target,
            locatedEffect: candidate.locatedEffect,
            trigger: candidate.trigger,
          },
  };
}

function resolveParsedPersistentAreaSaveDamage(
  procedure: ParsedPersistentAreaSaveDamageProcedure,
): BattleResolutionResult {
  const step = resolvePersistentAreaSaveDamageStep({
    procedure,
    context: { kind: "standalone" },
  });
  return Match.value(step).pipe(
    Match.when({ tag: "result" }, ({ result }) => result),
    Match.when({ tag: "resolved" }, ({ state }) => ({
      tag: "resolved" as const,
      state,
      snapshot: snapshotBattle(state),
    })),
    Match.exhaustive,
  );
}

function resolvePersistentAreaSaveDamageStep(input: {
  readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
  readonly context: PersistentAreaResolutionContext;
}): PersistentAreaSaveDamageStep {
  const { procedure, context } = input;
  const { resolution } = procedure;
  const { effect } = procedure.locatedEffect;
  const { saveHole, damageHole } = persistentAreaProcedureHoles(
    procedure,
    context,
  );
  const procedureName = persistentAreaProcedureName(procedure.kind);
  const saveStage = resolvePersistentAreaSaveStage({
    procedure,
    context,
    saveHole,
    damageHole,
    procedureName,
  });
  if (saveStage.tag === "result") return saveStage;
  const damageStage = resolvePersistentAreaDamageRollStage({
    procedure,
    context,
    damageHole,
    damageFills: saveStage.value.damageFills,
    saveOutcome: saveStage.value.saveOutcome,
  });
  if (damageStage.tag === "result") return damageStage;
  const concentrationStage = resolvePersistentAreaConcentrationStage({
    procedure,
    context,
    procedureName,
    adjustedDamage: damageStage.value.adjustedDamage,
  });
  if (concentrationStage.tag === "result") return concentrationStage;
  const dispositionStage = resolvePersistentAreaDispositionStage({
    procedure,
    context,
    adjustedDamage: damageStage.value.adjustedDamage,
  });
  if (dispositionStage.tag === "result") return dispositionStage;

  const holeIds = persistentAreaResolvedHoleIds({
    saveHole,
    damageHole,
    concentrationHole: concentrationStage.value.hole,
    dispositionHole: dispositionStage.value.hole,
  });
  const consumedFillIssue = persistentAreaConsumedFillIssue({
    procedure,
    context,
    procedureName,
    holeIds,
  });
  if (consumedFillIssue !== null) return consumedFillIssue;

  const afterDamage = applyPreparedSlotSpellDamage(
    resolution.state,
    resolution.subject.actorId,
    damageStage.value.adjustedDamage,
    {
      damageSourceId: effect.sourceCombatantId,
      damageDisposition: damageDispositionForTarget(
        dispositionStage.value.hole === null
          ? []
          : [dispositionStage.value.hole],
        dispositionStage.value.fills,
        resolution.subject.actorId,
      ),
      ...optionalProperty(
        "concentrationSavingThrow",
        concentrationStage.value.fill,
      ),
      spatialFacts: [],
    },
  );
  const nextState = stateAfterPersistentAreaSaveDamage(procedure, afterDamage);
  return {
    tag: "resolved",
    state: nextState,
    holeIds,
    matchedHandledPosition: saveStage.value.matchedHandledPosition,
  };
}

function persistentAreaResolvedHoleIds(input: {
  readonly saveHole:
    | BattleInsectPlagueAreaHazardSavingThrowOutcomeHole
    | BattleCloudkillAreaHazardSavingThrowOutcomeHole;
  readonly damageHole:
    | BattleInsectPlagueAreaHazardDamageRollHole
    | BattleCloudkillAreaHazardDamageRollHole;
  readonly concentrationHole: BattleConcentrationSavingThrowHole | null;
  readonly dispositionHole: ReturnType<
    typeof zeroHitPointReplacementDispositionHole
  >;
}): PersistentAreaResolvedHoleIds {
  return {
    save: input.saveHole.holeId,
    damage: input.damageHole.holeId,
    concentration:
      input.concentrationHole === null ? null : input.concentrationHole.holeId,
    disposition:
      input.dispositionHole === null ? null : input.dispositionHole.holeId,
  };
}

type PersistentAreaStage<Value> =
  | { readonly tag: "resolved"; readonly value: Value }
  | Extract<PersistentAreaSaveDamageStep, { readonly tag: "result" }>;

type PersistentAreaDamageFill = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>;

type PersistentAreaConcentrationFill = Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>;

type PersistentAreaDispositionFill = Extract<
  BattleFill,
  { readonly kind: "attackDamageDisposition" }
>;

function resolvePersistentAreaSaveStage(input: {
  readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
  readonly context: PersistentAreaResolutionContext;
  readonly saveHole:
    | BattleInsectPlagueAreaHazardSavingThrowOutcomeHole
    | BattleCloudkillAreaHazardSavingThrowOutcomeHole;
  readonly damageHole:
    | BattleInsectPlagueAreaHazardDamageRollHole
    | BattleCloudkillAreaHazardDamageRollHole;
  readonly procedureName: "Insect Plague" | "Cloudkill";
}): PersistentAreaStage<{
  readonly saveOutcome: BattleSavingThrowOutcome;
  readonly damageFills: readonly PersistentAreaDamageFill[];
  readonly matchedHandledPosition: boolean;
}> {
  const { resolution } = input.procedure;
  const { effect } = input.procedure.locatedEffect;
  const saveFills = resolution.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === input.saveHole.holeId,
  );
  const damageFills = resolution.fills.filter(
    (fill): fill is PersistentAreaDamageFill =>
      fill.kind === "rolledDice" && fill.holeId === input.damageHole.holeId,
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: each discovered persistent-area save and damage hole can be answered only once. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return persistentAreaStepResult(
      input.context,
      invalidResult(
        resolution.state,
        "invalidFill",
        `${input.procedureName} save received duplicate fills.`,
      ),
    );
  }
  /* v8 ignore stop -- @preserve */
  const saveFill = savingThrowOutcomeFillForHole(saveFills, input.saveHole);
  if (saveFill === undefined) {
    return persistentAreaStepResult(
      input.context,
      needsHolesResult(resolution.state, resolution.subject, [input.saveHole]),
    );
  }
  const parsedSave = parseSingleTargetPersistentAreaSave(
    saveFill,
    resolution.subject.actorId,
    input.procedureName,
  );
  /* v8 ignore start -- @preserve -- Malformed fill: the save outcome must answer the discovered single-target hole for the triggering actor. */
  if (parsedSave.tag === "invalid") {
    return persistentAreaStepResult(
      input.context,
      invalidResult(resolution.state, "invalidFill", parsedSave.message),
    );
  }
  /* v8 ignore stop -- @preserve */
  const replayPosition = persistentAreaReplayPosition(input.context);
  const matchedHandledPosition =
    replayPosition !== undefined &&
    persistentAreaHandledPositionMatches(input.context, replayPosition);
  if (!parsedSave.outcome.succeeded) {
    const reactionWindow = maybeOpenInterruptWindow(
      resolution.state,
      {
        trigger: "saveFailed",
        targetId: resolution.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: persistentAreaInterruptContinuation(
          input.context,
          resolution,
          replayPosition,
        ),
      },
      persistentAreaHandledInterruptTrigger(
        input.context,
        resolution.handledSaveFailedOccurrence,
        resolution.subject.actorId,
        effect.sourceProcedureRef,
        matchedHandledPosition,
      ),
    );
    if (reactionWindow !== null) {
      return persistentAreaStepResult(input.context, reactionWindow);
    }
  }
  return {
    tag: "resolved",
    value: {
      saveOutcome: parsedSave.outcome,
      damageFills,
      matchedHandledPosition,
    },
  };
}

function resolvePersistentAreaDamageRollStage(input: {
  readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
  readonly context: PersistentAreaResolutionContext;
  readonly damageHole:
    | BattleInsectPlagueAreaHazardDamageRollHole
    | BattleCloudkillAreaHazardDamageRollHole;
  readonly damageFills: readonly PersistentAreaDamageFill[];
  readonly saveOutcome: BattleSavingThrowOutcome;
}): PersistentAreaStage<{
  readonly adjustedDamage: ReturnType<typeof persistentAreaAdjustedDamage>;
}> {
  const { resolution, target } = input.procedure;
  const { effect } = input.procedure.locatedEffect;
  const damageFill = rolledDiceFillForHole(input.damageFills, input.damageHole);
  if (damageFill === undefined) {
    return persistentAreaStepResult(
      input.context,
      needsHolesResult(resolution.state, resolution.subject, [
        input.damageHole,
      ]),
    );
  }
  const damageIssue = validateRolledDiceFillForDiceExpr(
    damageFill,
    effect.damage.expr,
  );
  /* v8 ignore start -- @preserve -- Malformed fill: the damage roll must match the exact expression carried by its discovered hole. */
  if (damageIssue !== null) {
    return persistentAreaStepResult(
      input.context,
      invalidResult(resolution.state, "invalidFill", damageIssue),
    );
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "resolved",
    value: {
      adjustedDamage: persistentAreaAdjustedDamage({
        state: resolution.state,
        target,
        effect,
        damageFill,
        saveSucceeded: input.saveOutcome.succeeded,
      }),
    },
  };
}

function resolvePersistentAreaConcentrationStage(input: {
  readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
  readonly context: PersistentAreaResolutionContext;
  readonly procedureName: "Insect Plague" | "Cloudkill";
  readonly adjustedDamage: ReturnType<typeof persistentAreaAdjustedDamage>;
}): PersistentAreaStage<{
  readonly hole: BattleConcentrationSavingThrowHole | null;
  readonly fill: PersistentAreaConcentrationFill | undefined;
}> {
  const { resolution, target } = input.procedure;
  const hole = persistentAreaConcentrationSavingThrowHole(
    target,
    input.adjustedDamage,
    input.context,
  );
  const fills =
    hole === null
      ? []
      : resolution.fills.filter(
          (fill): fill is PersistentAreaConcentrationFill =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === hole.holeId,
        );
  /* v8 ignore start -- @preserve -- Malformed fill set: a damaged concentrating target exposes at most one Concentration save hole. */
  if (fills.length > 1) {
    return persistentAreaStepResult(
      input.context,
      invalidResult(
        resolution.state,
        "invalidFill",
        `${input.procedureName} save received duplicate Concentration save fills.`,
      ),
    );
  }
  /* v8 ignore stop -- @preserve */
  const fill =
    hole === null ? undefined : concentrationSavingThrowFillFor(fills, hole);
  if (hole !== null && fill === undefined) {
    return persistentAreaStepResult(
      input.context,
      needsHolesResult(resolution.state, resolution.subject, [hole]),
    );
  }
  return { tag: "resolved", value: { hole, fill } };
}

function resolvePersistentAreaDispositionStage(input: {
  readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
  readonly context: PersistentAreaResolutionContext;
  readonly adjustedDamage: ReturnType<typeof persistentAreaAdjustedDamage>;
}): PersistentAreaStage<{
  readonly hole: ReturnType<typeof zeroHitPointReplacementDispositionHole>;
  readonly fills: readonly PersistentAreaDispositionFill[];
}> {
  const { resolution, target } = input.procedure;
  const { effect } = input.procedure.locatedEffect;
  const hole = zeroHitPointReplacementDispositionHole({
    damageSourceId: effect.sourceCombatantId,
    target,
    damageAmount: input.adjustedDamage,
  });
  const fills =
    hole === null
      ? []
      : resolution.fills.filter(
          (fill): fill is PersistentAreaDispositionFill =>
            fill.kind === "attackDamageDisposition" &&
            fill.holeId === hole.holeId,
        );
  const issue = damageDispositionFillsValidation({
    holes: hole === null ? [] : [hole],
    fills,
  });
  if (issue !== null) {
    return persistentAreaStepResult(
      input.context,
      invalidResult(resolution.state, "invalidFill", issue),
    );
  }
  if (hole !== null && damageDispositionFillFor(fills, hole) === undefined) {
    return persistentAreaStepResult(
      input.context,
      needsHolesResult(resolution.state, resolution.subject, [hole]),
    );
  }
  return { tag: "resolved", value: { hole, fills } };
}

function persistentAreaConsumedFillIssue(input: {
  readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
  readonly context: PersistentAreaResolutionContext;
  readonly procedureName: "Insect Plague" | "Cloudkill";
  readonly holeIds: PersistentAreaResolvedHoleIds;
}): Extract<PersistentAreaSaveDamageStep, { readonly tag: "result" }> | null {
  const consumedHoleIds = new Set([input.holeIds.save, input.holeIds.damage]);
  if (input.holeIds.concentration !== null) {
    consumedHoleIds.add(input.holeIds.concentration);
  }
  if (input.holeIds.disposition !== null) {
    consumedHoleIds.add(input.holeIds.disposition);
  }
  /* v8 ignore start -- @preserve -- Malformed fill set: every supplied fill must answer a hole derived for this exact replay subject. */
  if (
    persistentAreaContextOwnsAllFills(input.context) &&
    input.procedure.resolution.fills.some(
      (fill) => !consumedHoleIds.has(fill.holeId),
    )
  ) {
    return persistentAreaStepResult(
      input.context,
      invalidResult(
        input.procedure.resolution.state,
        "invalidFill",
        `${input.procedureName} save received a fill for an unrelated hole.`,
      ),
    );
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

const byPersistentAreaResolutionContextKind = Match.discriminator("kind");

function persistentAreaStepResult(
  context: PersistentAreaResolutionContext,
  result: BattleResolutionResult,
): Extract<PersistentAreaSaveDamageStep, { readonly tag: "result" }> {
  return {
    tag: "result",
    result: Match.value(context).pipe(
      byPersistentAreaResolutionContextKind("standalone", () => result),
      byPersistentAreaResolutionContextKind("replayParent", ({ parent }) =>
        projectReplayChildResult(parent, result),
      ),
      Match.exhaustive,
    ),
  };
}

function persistentAreaReplayPosition(
  context: PersistentAreaResolutionContext,
): BattleStartTurnOccurrenceSequenceCheckpoint | undefined {
  return Match.value(context).pipe(
    byPersistentAreaResolutionContextKind("standalone", () => undefined),
    byPersistentAreaResolutionContextKind(
      "replayParent",
      ({
        completedPrefixHoleIds,
        occurrence,
        roundDurationCohort,
        sequence,
        sourceTurn,
      }) => ({
        kind: "startTurnOccurrenceSequence" as const,
        sequence,
        completedPrefixHoleIds,
        roundDurationCohort,
        sourceTurn,
        child: occurrence,
      }),
    ),
    Match.exhaustive,
  );
}

function persistentAreaHandledPositionMatches(
  context: PersistentAreaResolutionContext,
  position: BattleStartTurnOccurrenceSequenceCheckpoint,
): boolean {
  return Match.value(context).pipe(
    byPersistentAreaResolutionContextKind("standalone", () => false),
    byPersistentAreaResolutionContextKind(
      "replayParent",
      ({ handledPosition }) =>
        handledPosition !== undefined &&
        sameCloudkillMovementSaveDamagePosition(handledPosition, position),
    ),
    Match.exhaustive,
  );
}

function persistentAreaInterruptContinuation(
  context: PersistentAreaResolutionContext,
  resolution: InsectPlagueResolutionInput | CloudkillResolutionInput,
  replayPosition: BattleStartTurnOccurrenceSequenceCheckpoint | undefined,
) {
  return Match.value(context).pipe(
    byPersistentAreaResolutionContextKind("standalone", () => ({
      kind: "replay" as const,
      subject: resolution.subject,
      fills: resolution.fills,
    })),
    byPersistentAreaResolutionContextKind("replayParent", ({ parent }) => {
      if (replayPosition === undefined) {
        return {
          kind: "replay" as const,
          subject: parent.subject,
          fills: parent.fills,
        };
      }
      return replayParentProcedureAt(parent, replayPosition);
    }),
    Match.exhaustive,
  );
}

function persistentAreaHandledInterruptTrigger(
  context: PersistentAreaResolutionContext,
  standaloneHandledOccurrence:
    | Extract<
        BattleHandledInterruptOccurrence,
        { readonly trigger: "saveFailed" }
      >
    | undefined,
  targetId: CombatantId,
  sourceProcedureRef: CloudkillAreaHazardEffect["sourceProcedureRef"],
  matchedHandledPosition: boolean,
): BattleInterruptTrigger | undefined {
  return Match.value(context).pipe(
    byPersistentAreaResolutionContextKind("standalone", () =>
      standaloneHandledOccurrence?.targetId === targetId &&
      standaloneHandledOccurrence.sourceProcedureRef === sourceProcedureRef
        ? "saveFailed"
        : undefined,
    ),
    byPersistentAreaResolutionContextKind("replayParent", () =>
      matchedHandledPosition ? "saveFailed" : undefined,
    ),
    Match.exhaustive,
  );
}

function persistentAreaContextOwnsAllFills(
  context: PersistentAreaResolutionContext,
): boolean {
  return Match.value(context).pipe(
    byPersistentAreaResolutionContextKind("standalone", () => true),
    byPersistentAreaResolutionContextKind("replayParent", () => false),
    Match.exhaustive,
  );
}

const byPersistentAreaProcedureKind = Match.discriminator("kind");

function persistentAreaProcedureHoles(
  procedure: ParsedPersistentAreaSaveDamageProcedure,
  context: PersistentAreaResolutionContext,
): PersistentAreaProcedureHoles {
  return Match.value(procedure).pipe(
    byPersistentAreaProcedureKind("insectPlague", (insectPlague) => ({
      saveHole: insectPlagueAreaHazardSavingThrowOutcomeHole(
        insectPlague.resolution.state,
        insectPlague.resolution.subject.actorId,
        insectPlague.locatedEffect.effect,
        insectPlague.trigger,
      ),
      damageHole: insectPlagueAreaHazardDamageRollHole(
        insectPlague.resolution.subject.actorId,
        insectPlague.locatedEffect.effect,
        insectPlague.trigger,
      ),
    })),
    byPersistentAreaProcedureKind("cloudkill", (cloudkill) => ({
      saveHole: cloudkillAreaHazardSavingThrowOutcomeHole(
        cloudkill.resolution.state,
        cloudkill.resolution.subject.actorId,
        cloudkill.locatedEffect.effect,
        cloudkill.trigger,
        context.kind === "replayParent" ? context.sourceTurn : undefined,
      ),
      damageHole: cloudkillAreaHazardDamageRollHole(
        cloudkill.resolution.subject.actorId,
        cloudkill.locatedEffect.effect,
        cloudkill.trigger,
        context.kind === "replayParent" ? context.sourceTurn : undefined,
      ),
    })),
    Match.exhaustive,
  );
}

function stateAfterPersistentAreaSaveDamage(
  procedure: ParsedPersistentAreaSaveDamageProcedure,
  state: BattleState,
): BattleState {
  return Match.value(procedure).pipe(
    byPersistentAreaProcedureKind("insectPlague", (insectPlague) =>
      markInsectPlagueAreaHazardSavedThisTurn(
        state,
        insectPlague.resolution.subject.actorId,
        insectPlague.locatedEffect,
      ),
    ),
    byPersistentAreaProcedureKind("cloudkill", (cloudkill) =>
      markCloudkillAreaHazardSavedThisTurn(
        state,
        cloudkill.resolution.subject.actorId,
        cloudkill.locatedEffect,
      ),
    ),
    Match.exhaustive,
  );
}

function persistentAreaProcedureName(
  kind: ParsedPersistentAreaSaveDamageProcedure["kind"],
): "Insect Plague" | "Cloudkill" {
  return kind === "insectPlague" ? "Insect Plague" : "Cloudkill";
}

type ParsedSingleTargetSave =
  | { readonly tag: "parsed"; readonly outcome: BattleSavingThrowOutcome }
  | { readonly tag: "invalid"; readonly message: string };

function parseSingleTargetPersistentAreaSave(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
  targetId: CombatantId,
  procedureName: "Insect Plague" | "Cloudkill",
): ParsedSingleTargetSave {
  if ("area" in fill.value) {
    return {
      tag: "invalid",
      message: `${procedureName} Saving Throw outcome must not include area facts.`,
    };
  }
  const [outcome, ...additionalOutcomes] = fill.value.outcomes;
  if (
    outcome === undefined ||
    additionalOutcomes.length > 0 ||
    outcome.targetId !== targetId
  ) {
    return {
      tag: "invalid",
      message: `${procedureName} Saving Throw outcome must match the triggering target.`,
    };
  }
  return { tag: "parsed", outcome };
}

function persistentAreaAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: InsectPlagueAreaHazardEffect | CloudkillAreaHazardEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    applySaveDamageResult(rolledDamage, input.saveSucceeded ? "half" : "full"),
    input.effect.damage.damageType,
  );
}

function activeEffectForRef<
  TEffect extends BattleActiveEffect & {
    readonly effectRef: BattleEffectExecutionRef;
  },
>(
  state: BattleState,
  effectRef: TEffect["effectRef"],
  isExpectedEffect: (effect: BattleActiveEffect) => effect is TEffect,
):
  | { readonly effectOwnerId: CombatantId; readonly effect: TEffect }
  | undefined {
  let located:
    | { readonly effectOwnerId: CombatantId; readonly effect: TEffect }
    | undefined;
  for (const [effectOwnerId, combatant] of state.combatants) {
    for (const candidate of combatant.activeEffects) {
      if (candidate.effectRef !== effectRef) {
        continue;
      }
      if (located !== undefined) return undefined;
      if (!isExpectedEffect(candidate)) return undefined;
      located = { effectOwnerId, effect: candidate };
    }
  }
  return located;
}

function persistentAreaTriggerFromMembershipFact(
  trigger: BattleInsectPlagueAreaMembershipTrigger,
): BattleInsectPlagueAreaHazardTrigger;
function persistentAreaTriggerFromMembershipFact(
  trigger: BattleCloudkillAreaMembershipTrigger,
): BattleCloudkillAreaHazardTrigger;
function persistentAreaTriggerFromMembershipFact(
  trigger:
    | BattleInsectPlagueAreaMembershipTrigger
    | BattleCloudkillAreaMembershipTrigger,
): BattleInsectPlagueAreaHazardTrigger | BattleCloudkillAreaHazardTrigger {
  return Match.value(trigger).pipe(
    byPersistentAreaMembershipTriggerKind(
      "appearsInArea",
      () => "appearsInArea" as const,
    ),
    byPersistentAreaMembershipTriggerKind(
      "areaMovesIntoSpace",
      () => "movesIntoSpace" as const,
    ),
    byPersistentAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    byPersistentAreaMembershipTriggerKind(
      "turnEndInArea",
      () => "endsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

const byPersistentAreaMembershipTriggerKind = Match.discriminator("kind");

type PersistentAreaHazardTriggerLabel =
  | "appearance"
  | "cloud-movement"
  | "entry"
  | "end-turn";

function persistentAreaSavingThrowHoleFacts(
  state: BattleState,
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect | CloudkillAreaHazardEffect,
): Pick<
  BattleInsectPlagueAreaHazardSavingThrowOutcomeHole,
  "ability" | "dc" | "areaChoices" | "targetRollModes" | "targetFlatBonuses"
> {
  return {
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

export function insectPlagueAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect,
  trigger: BattleInsectPlagueAreaHazardTrigger,
): BattleInsectPlagueAreaHazardSavingThrowOutcomeHole {
  const key = `battle:insect-plague-area-hazard-save:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} CON save`,
    insectPlagueAreaHazard: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ...persistentAreaSavingThrowHoleFacts(state, targetId, effect),
  };
}

function insectPlagueAreaHazardDamageRollHole(
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect,
  trigger: BattleInsectPlagueAreaHazardTrigger,
): BattleInsectPlagueAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:insect-plague-area-hazard-damage:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    insectPlagueAreaHazard: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function persistentAreaHazardTriggerLabel(
  trigger: BattleInsectPlagueAreaHazardTrigger,
): PersistentAreaHazardTriggerLabel;
function persistentAreaHazardTriggerLabel(
  trigger: BattleCloudkillAreaHazardTrigger,
): PersistentAreaHazardTriggerLabel;
function persistentAreaHazardTriggerLabel(
  trigger:
    | BattleInsectPlagueAreaHazardTrigger
    | BattleCloudkillAreaHazardTrigger,
): PersistentAreaHazardTriggerLabel {
  return Match.value(trigger).pipe(
    Match.when("appearsInArea", () => "appearance" as const),
    Match.when("movesIntoSpace", () => "cloud-movement" as const),
    Match.when("entersArea", () => "entry" as const),
    Match.when("endsTurnInArea", () => "end-turn" as const),
    Match.exhaustive,
  );
}

function persistentAreaAppearanceOccurrenceKey(
  effect: InsectPlagueAreaHazardEffect | CloudkillAreaHazardEffect,
  trigger:
    | BattleInsectPlagueAreaHazardTrigger
    | BattleCloudkillAreaHazardTrigger,
): string {
  return trigger === "appearsInArea"
    ? `:${effect.appearanceOccurrence.actorId}:${effect.appearanceOccurrence.round}`
    : "";
}

export function cloudkillAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
  sourceTurn?: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
): BattleCloudkillAreaHazardSavingThrowOutcomeHole {
  const key = `battle:cloudkill-area-hazard-save:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}${cloudkillMovementSourceTurnKey(trigger, sourceTurn)}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} CON save`,
    cloudkillAreaHazard: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ...persistentAreaSavingThrowHoleFacts(state, targetId, effect),
  };
}

export function cloudkillMovementSavingThrowHoleId(
  checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint,
): BattleHoleId {
  const { child, sourceTurn } = checkpoint;
  return holeId(
    `battle:cloudkill-area-hazard-save:${child.targetId}:${child.effectRef}:movesIntoSpace:${sourceTurn.actorId}:${Number(sourceTurn.round)}`,
  );
}

function cloudkillAreaHazardDamageRollHole(
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
  sourceTurn?: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
): BattleCloudkillAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:cloudkill-area-hazard-damage:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}${cloudkillMovementSourceTurnKey(trigger, sourceTurn)}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    cloudkillAreaHazard: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function cloudkillMovementSourceTurnKey(
  trigger: BattleCloudkillAreaHazardTrigger,
  sourceTurn:
    | BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"]
    | undefined,
): string {
  return trigger === "movesIntoSpace" && sourceTurn !== undefined
    ? `:${sourceTurn.actorId}:${Number(sourceTurn.round)}`
    : "";
}

function persistentAreaConcentrationSavingThrowHole(
  target: BattleCreatureState,
  damageAmount: number,
  context: PersistentAreaResolutionContext,
): BattleConcentrationSavingThrowHole | null {
  const base = concentrationSavingThrowHole(target, damageAmount);
  if (base === null || context.kind === "standalone") return base;
  const key = `battle:cloudkill-movement-concentration:${context.sourceTurn.actorId}:${Number(context.sourceTurn.round)}:${context.occurrence.effectRef}:${context.occurrence.targetId}`;
  return {
    ...base,
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
  };
}
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
