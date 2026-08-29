import { optionalProperty } from "../optional-property.ts";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  BattleTranslatingPersistentAreaSaveDamageTrigger as BattleTranslatingPersistentAreaMembershipTrigger,
  BattleStationaryPersistentAreaSaveDamageTrigger as BattleStationaryPersistentAreaMembershipTrigger,
  BattleSubject,
} from "../battle-subjects.ts";
import type {
  BattleActiveEffect,
  BattleTranslatingPersistentAreaSaveDamageRollHole,
  BattleTranslatingPersistentAreaSaveDamageSavingThrowOutcomeHole,
  BattleTranslatingPersistentAreaSaveDamageTrigger,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleFill,
  BattleHandledInterruptOccurrence,
  BattleHoleId,
  BattleStationaryPersistentAreaSaveDamageRollHole,
  BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole,
  BattleStationaryPersistentAreaSaveDamageTrigger,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleState,
  BattleTurnAnchor,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import type { BattleEffectExecutionRef, CombatantId } from "../identity.ts";
import { characterRetainedSpellProcedureExecution } from "../character-execution-queries.ts";
import type {
  SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution,
  StationaryPersistentAreaSaveDamageSpellProcedureExecution,
} from "../procedure-execution/spell-procedure-execution.ts";
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
  markTranslatingPersistentAreaAreaHazardSavedThisTurn,
  markStationaryPersistentAreaAreaHazardSavedThisTurn,
} from "./spells-active-effects.ts";
import {
  applyPreparedSlotSpellDamage,
  applySaveDamageResult,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";

type PersistentAreaSaveDamageOccurrence = Extract<
  BattleActiveEffect,
  {
    readonly kind: "persistentAreaSaveDamage";
    readonly appearanceOccurrence: BattleTurnAnchor;
    readonly savedThisTurn: readonly CombatantId[];
  }
>;

type StationaryPersistentAreaAreaHazardEffect =
  PersistentAreaSaveDamageOccurrence & {
    readonly save: {
      readonly ability: StationaryPersistentAreaSaveDamageSpellProcedureExecution["ability"];
      readonly dc: StationaryPersistentAreaSaveDamageSpellProcedureExecution["dc"];
    };
    readonly damage: StationaryPersistentAreaSaveDamageSpellProcedureExecution["damage"];
  };

export type TranslatingPersistentAreaAreaHazardEffect =
  PersistentAreaSaveDamageOccurrence & {
    readonly save: {
      readonly ability: SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution["ability"];
      readonly dc: SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution["dc"];
    };
    readonly damage: SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution["damage"];
  };

export type TranslatingPersistentAreaMovementSaveDamageRequest = {
  readonly effect: TranslatingPersistentAreaAreaHazardEffect;
  readonly subject: TranslatingPersistentAreaResolutionInput["subject"];
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
      readonly replayPlan: TranslatingPersistentAreaMovementReplayPlan;
      readonly occurrence: BattleStartTurnOccurrenceSequenceCheckpoint["child"];
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

export type TranslatingPersistentAreaMovementSaveDamageSequenceResult =
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

type TranslatingPersistentAreaMovementReplayPlan =
  | {
      readonly kind: "turnBoundaryReplay";
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
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

const byTranslatingPersistentAreaMovementReplayPlanKind =
  Match.discriminator("kind");

type TranslatingPersistentAreaMovementRequestStep =
  | { readonly tag: "stopped" }
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | Extract<PersistentAreaSaveDamageStep, { readonly tag: "resolved" }>;

type StationaryPersistentAreaResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "persistentAreaSaveDamageSave";
      readonly areaMembershipTrigger: BattleStationaryPersistentAreaMembershipTrigger;
    }
  >;
  readonly handledSaveFailedOccurrence?: Extract<
    BattleHandledInterruptOccurrence,
    { readonly trigger: "saveFailed" }
  >;
};

type TranslatingPersistentAreaResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "persistentAreaSaveDamageSave";
      readonly areaMembershipTrigger: BattleTranslatingPersistentAreaMembershipTrigger;
    }
  >;
  readonly handledSaveFailedOccurrence?: Extract<
    BattleHandledInterruptOccurrence,
    { readonly trigger: "saveFailed" }
  >;
};

type ParsedPersistentAreaSaveDamageProcedure =
  | {
      readonly kind: "stationaryPersistentArea";
      readonly resolution: StationaryPersistentAreaResolutionInput;
      readonly target: BattleCreatureState;
      readonly locatedEffect: {
        readonly effectOwnerId: CombatantId;
        readonly effect: StationaryPersistentAreaAreaHazardEffect;
      };
      readonly trigger: BattleStationaryPersistentAreaSaveDamageTrigger;
    }
  | {
      readonly kind: "translatingPersistentArea";
      readonly resolution: TranslatingPersistentAreaResolutionInput;
      readonly target: BattleCreatureState;
      readonly locatedEffect: {
        readonly effectOwnerId: CombatantId;
        readonly effect: TranslatingPersistentAreaAreaHazardEffect;
      };
      readonly trigger: BattleTranslatingPersistentAreaSaveDamageTrigger;
    };

type PersistentAreaSaveDamageProcedureCandidate =
  | {
      readonly kind: "stationaryPersistentArea";
      readonly resolution: StationaryPersistentAreaResolutionInput;
      readonly target: BattleCreatureState | undefined;
      readonly locatedEffect:
        | {
            readonly effectOwnerId: CombatantId;
            readonly effect: StationaryPersistentAreaAreaHazardEffect;
          }
        | undefined;
      readonly trigger: BattleStationaryPersistentAreaSaveDamageTrigger;
    }
  | {
      readonly kind: "translatingPersistentArea";
      readonly resolution: TranslatingPersistentAreaResolutionInput;
      readonly target: BattleCreatureState | undefined;
      readonly locatedEffect:
        | {
            readonly effectOwnerId: CombatantId;
            readonly effect: TranslatingPersistentAreaAreaHazardEffect;
          }
        | undefined;
      readonly trigger: BattleTranslatingPersistentAreaSaveDamageTrigger;
    };

type PersistentAreaProcedureHoles =
  | {
      readonly saveHole: BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole;
      readonly damageHole: BattleStationaryPersistentAreaSaveDamageRollHole;
    }
  | {
      readonly saveHole: BattleTranslatingPersistentAreaSaveDamageSavingThrowOutcomeHole;
      readonly damageHole: BattleTranslatingPersistentAreaSaveDamageRollHole;
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

export function resolveStationaryPersistentAreaAreaSaveDamage(
  resolution: StationaryPersistentAreaResolutionInput,
): BattleResolutionResult {
  const allowedFillIssue = persistentAreaAllowedFillIssue(
    resolution,
    "stationary persistent area",
  );
  if (allowedFillIssue !== null) {
    return allowedFillIssue;
  }
  const locatedEffect = persistentAreaSaveDamageEffectForRef(
    resolution.state,
    resolution.subject.areaMembershipTrigger.effectRef,
    "stationary",
  );
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "stationaryPersistentArea",
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

export function resolveTranslatingPersistentAreaAreaSaveDamage(
  resolution: TranslatingPersistentAreaResolutionInput,
): BattleResolutionResult {
  const allowedFillIssue = persistentAreaAllowedFillIssue(
    resolution,
    "translating persistent area",
  );
  if (allowedFillIssue !== null) {
    return allowedFillIssue;
  }
  const locatedEffect = persistentAreaSaveDamageEffectForRef(
    resolution.state,
    resolution.subject.areaMembershipTrigger.effectRef,
    "sourceTurnTranslation",
  );
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "translatingPersistentArea",
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
    | BattleStationaryPersistentAreaMembershipTrigger
    | BattleTranslatingPersistentAreaMembershipTrigger,
  effect:
    | StationaryPersistentAreaAreaHazardEffect
    | TranslatingPersistentAreaAreaHazardEffect,
): boolean {
  return (
    trigger.kind === "appearsInArea" &&
    effect.appearanceOccurrence.actorId === currentActorId(state) &&
    effect.appearanceOccurrence.round === state.initiative.round
  );
}

export function resolveTranslatingPersistentAreaMovementSaveDamageSequence(input: {
  readonly advancedState: BattleState;
  readonly parent: ReplayParentContinuation;
  readonly requests: readonly TranslatingPersistentAreaMovementSaveDamageRequest[];
  readonly replayPlan: TranslatingPersistentAreaMovementReplayPlan;
}): TranslatingPersistentAreaMovementSaveDamageSequenceResult {
  const saveHoleIds = new Set<BattleHoleId>();
  const damageHoleIds = new Set<BattleHoleId>();
  const concentrationHoleIds = new Set<BattleHoleId>();
  const dispositionHoleIds = new Set<BattleHoleId>();
  let parentPositionMatched = Match.value(input.replayPlan).pipe(
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "turnBoundaryReplay",
      () => true,
    ),
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "advancedPrefixAtCheckpoint",
      () => false,
    ),
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "advancedPrefixAfterCheckpoint",
      () => true,
    ),
    Match.exhaustive,
  );
  let state = input.advancedState;

  for (const [requestIndex, request] of input.requests.entries()) {
    const step = resolveTranslatingPersistentAreaMovementSaveDamageRequest({
      state,
      parent: input.parent,
      request,
      replayPlan: input.replayPlan,
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
    return invalidTranslatingPersistentAreaMovementSaveDamageSequence(
      input.parent,
    );
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

function resolveTranslatingPersistentAreaMovementSaveDamageRequest(input: {
  readonly state: BattleState;
  readonly parent: ReplayParentContinuation;
  readonly request: TranslatingPersistentAreaMovementSaveDamageRequest;
  readonly replayPlan: TranslatingPersistentAreaMovementReplayPlan;
  readonly isFirstRequest: boolean;
}): TranslatingPersistentAreaMovementRequestStep {
  const resumedRequestParent = () =>
    replayParentContinuationFor({
      state: input.state,
      subject: input.parent.subject,
      fills: input.parent.fills,
    });
  const requestParent = Match.value(input.replayPlan).pipe(
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "turnBoundaryReplay",
      () => input.parent,
    ),
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "advancedPrefixAtCheckpoint",
      resumedRequestParent,
    ),
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "advancedPrefixAfterCheckpoint",
      resumedRequestParent,
    ),
    Match.exhaustive,
  );
  const locatedActiveEffect = persistentAreaSaveDamageEffectForRef(
    input.state,
    input.request.effect.effectRef,
    "sourceTurnTranslation",
  );
  if (!input.isFirstRequest && locatedActiveEffect === undefined) {
    return { tag: "stopped" };
  }
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "translatingPersistentArea",
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
      replayPlan: input.replayPlan,
      occurrence: {
        kind: "persistentAreaTranslationSaveDamageSequence",
        effectRef: input.request.effect.effectRef,
        targetId: input.request.subject.actorId,
      },
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

function sameTranslatingPersistentAreaMovementSaveDamagePosition(
  left: BattleStartTurnOccurrenceSequenceCheckpoint,
  right: BattleStartTurnOccurrenceSequenceCheckpoint,
): boolean {
  return (
    left.kind === right.kind &&
    sameStartTurnOccurrenceSequence(left.sequence, right.sequence) &&
    sameStartTurnSourceTurn(left.sourceTurn, right.sourceTurn) &&
    sameTranslatingPersistentAreaMovementChild(left.child, right.child) &&
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

function sameTranslatingPersistentAreaMovementChild(
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

function invalidTranslatingPersistentAreaMovementSaveDamageSequence(
  parent: ReplayParentContinuation,
): TranslatingPersistentAreaMovementSaveDamageSequenceResult {
  return {
    tag: "result",
    result: invalidResult(
      parent.state,
      "staleSubject",
      "translating persistent area movement damage could not continue from its current start-turn boundary.",
    ),
  };
}

function persistentAreaAllowedFillIssue(
  resolution: BattleResolutionInput,
  procedureName: "stationary persistent area" | "translating persistent area",
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
      candidate.kind === "stationaryPersistentArea"
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
    concentration: concentrationStage.value,
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
        persistentAreaConcentrationFill(concentrationStage.value),
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
    | BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole
    | BattleTranslatingPersistentAreaSaveDamageSavingThrowOutcomeHole;
  readonly damageHole:
    | BattleStationaryPersistentAreaSaveDamageRollHole
    | BattleTranslatingPersistentAreaSaveDamageRollHole;
  readonly concentration: PersistentAreaConcentrationAnswer;
  readonly dispositionHole: ReturnType<
    typeof zeroHitPointReplacementDispositionHole
  >;
}): PersistentAreaResolvedHoleIds {
  return {
    save: input.saveHole.holeId,
    damage: input.damageHole.holeId,
    concentration: persistentAreaConcentrationHoleId(input.concentration),
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

type PersistentAreaConcentrationAnswer =
  | { readonly tag: "notRequired" }
  | {
      readonly tag: "answered";
      readonly hole: BattleConcentrationSavingThrowHole;
      readonly fill: PersistentAreaConcentrationFill;
    };

function persistentAreaConcentrationHoleId(
  answer: PersistentAreaConcentrationAnswer,
): BattleHoleId | null {
  return Match.value(answer).pipe(
    Match.when({ tag: "notRequired" }, () => null),
    Match.when({ tag: "answered" }, ({ hole }) => hole.holeId),
    Match.exhaustive,
  );
}

function persistentAreaConcentrationFill(
  answer: PersistentAreaConcentrationAnswer,
): PersistentAreaConcentrationFill | undefined {
  return Match.value(answer).pipe(
    Match.when({ tag: "notRequired" }, () => undefined),
    Match.when({ tag: "answered" }, ({ fill }) => fill),
    Match.exhaustive,
  );
}

type PersistentAreaDispositionFill = Extract<
  BattleFill,
  { readonly kind: "attackDamageDisposition" }
>;

function resolvePersistentAreaSaveStage(input: {
  readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
  readonly context: PersistentAreaResolutionContext;
  readonly saveHole:
    | BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole
    | BattleTranslatingPersistentAreaSaveDamageSavingThrowOutcomeHole;
  readonly damageHole:
    | BattleStationaryPersistentAreaSaveDamageRollHole
    | BattleTranslatingPersistentAreaSaveDamageRollHole;
  readonly procedureName:
    | "stationary persistent area"
    | "translating persistent area";
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
    | BattleStationaryPersistentAreaSaveDamageRollHole
    | BattleTranslatingPersistentAreaSaveDamageRollHole;
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
  readonly procedureName:
    | "stationary persistent area"
    | "translating persistent area";
  readonly adjustedDamage: ReturnType<typeof persistentAreaAdjustedDamage>;
}): PersistentAreaStage<PersistentAreaConcentrationAnswer> {
  const { resolution, target } = input.procedure;
  const hole = persistentAreaConcentrationSavingThrowHole(
    target,
    input.adjustedDamage,
    input.context,
  );
  if (hole === null) {
    return { tag: "resolved", value: { tag: "notRequired" } };
  }
  const fills = resolution.fills.filter(
    (fill): fill is PersistentAreaConcentrationFill =>
      fill.kind === "concentrationSavingThrow" && fill.holeId === hole.holeId,
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
  const fill = concentrationSavingThrowFillFor(fills, hole);
  if (fill === undefined) {
    return persistentAreaStepResult(
      input.context,
      needsHolesResult(resolution.state, resolution.subject, [hole]),
    );
  }
  return { tag: "resolved", value: { tag: "answered", hole, fill } };
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
  readonly procedureName:
    | "stationary persistent area"
    | "translating persistent area";
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

function persistentAreaSourceTurnTranslationReplaySourceTurn(
  replayPlan: TranslatingPersistentAreaMovementReplayPlan,
): BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"] {
  return Match.value(replayPlan).pipe(
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "turnBoundaryReplay",
      ({ sourceTurn }) => sourceTurn,
    ),
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "advancedPrefixAtCheckpoint",
      ({ checkpoint }) => checkpoint.sourceTurn,
    ),
    byTranslatingPersistentAreaMovementReplayPlanKind(
      "advancedPrefixAfterCheckpoint",
      ({ checkpoint }) => checkpoint.sourceTurn,
    ),
    Match.exhaustive,
  );
}

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
      ({ occurrence, replayPlan }) =>
        Match.value(replayPlan).pipe(
          byTranslatingPersistentAreaMovementReplayPlanKind(
            "turnBoundaryReplay",
            ({
              completedPrefixHoleIds,
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
          byTranslatingPersistentAreaMovementReplayPlanKind(
            "advancedPrefixAtCheckpoint",
            ({ checkpoint }) => ({ ...checkpoint, child: occurrence }),
          ),
          byTranslatingPersistentAreaMovementReplayPlanKind(
            "advancedPrefixAfterCheckpoint",
            ({ checkpoint }) => ({ ...checkpoint, child: occurrence }),
          ),
          Match.exhaustive,
        ),
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
    byPersistentAreaResolutionContextKind("replayParent", ({ replayPlan }) =>
      Match.value(replayPlan).pipe(
        byTranslatingPersistentAreaMovementReplayPlanKind(
          "turnBoundaryReplay",
          () => false,
        ),
        byTranslatingPersistentAreaMovementReplayPlanKind(
          "advancedPrefixAtCheckpoint",
          ({ checkpoint }) =>
            sameTranslatingPersistentAreaMovementSaveDamagePosition(
              checkpoint,
              position,
            ),
        ),
        byTranslatingPersistentAreaMovementReplayPlanKind(
          "advancedPrefixAfterCheckpoint",
          () => false,
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function persistentAreaInterruptContinuation(
  context: PersistentAreaResolutionContext,
  resolution:
    | StationaryPersistentAreaResolutionInput
    | TranslatingPersistentAreaResolutionInput,
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
  sourceProcedureRef: TranslatingPersistentAreaAreaHazardEffect["sourceProcedureRef"],
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
    byPersistentAreaProcedureKind(
      "stationaryPersistentArea",
      (stationaryPersistentArea) => ({
        saveHole: stationaryPersistentAreaSaveDamageSavingThrowOutcomeHole(
          stationaryPersistentArea.resolution.state,
          stationaryPersistentArea.resolution.subject.actorId,
          stationaryPersistentArea.locatedEffect.effect,
          stationaryPersistentArea.trigger,
        ),
        damageHole: stationaryPersistentAreaSaveDamageDamageRollHole(
          stationaryPersistentArea.resolution.subject.actorId,
          stationaryPersistentArea.locatedEffect.effect,
          stationaryPersistentArea.trigger,
        ),
      }),
    ),
    byPersistentAreaProcedureKind(
      "translatingPersistentArea",
      (translatingPersistentArea) => ({
        saveHole: translatingPersistentAreaSaveDamageSavingThrowOutcomeHole(
          translatingPersistentArea.resolution.state,
          translatingPersistentArea.resolution.subject.actorId,
          translatingPersistentArea.locatedEffect.effect,
          translatingPersistentArea.trigger,
          context.kind === "replayParent"
            ? persistentAreaSourceTurnTranslationReplaySourceTurn(
                context.replayPlan,
              )
            : undefined,
        ),
        damageHole: translatingPersistentAreaSaveDamageDamageRollHole(
          translatingPersistentArea.resolution.subject.actorId,
          translatingPersistentArea.locatedEffect.effect,
          translatingPersistentArea.trigger,
          context.kind === "replayParent"
            ? persistentAreaSourceTurnTranslationReplaySourceTurn(
                context.replayPlan,
              )
            : undefined,
        ),
      }),
    ),
    Match.exhaustive,
  );
}

function stateAfterPersistentAreaSaveDamage(
  procedure: ParsedPersistentAreaSaveDamageProcedure,
  state: BattleState,
): BattleState {
  return Match.value(procedure).pipe(
    byPersistentAreaProcedureKind(
      "stationaryPersistentArea",
      (stationaryPersistentArea) =>
        markStationaryPersistentAreaAreaHazardSavedThisTurn(
          state,
          stationaryPersistentArea.resolution.subject.actorId,
          stationaryPersistentArea.locatedEffect,
        ),
    ),
    byPersistentAreaProcedureKind(
      "translatingPersistentArea",
      (translatingPersistentArea) =>
        markTranslatingPersistentAreaAreaHazardSavedThisTurn(
          state,
          translatingPersistentArea.resolution.subject.actorId,
          translatingPersistentArea.locatedEffect,
        ),
    ),
    Match.exhaustive,
  );
}

function persistentAreaProcedureName(
  kind: ParsedPersistentAreaSaveDamageProcedure["kind"],
): "stationary persistent area" | "translating persistent area" {
  return kind === "stationaryPersistentArea"
    ? "stationary persistent area"
    : "translating persistent area";
}

type ParsedSingleTargetSave =
  | { readonly tag: "parsed"; readonly outcome: BattleSavingThrowOutcome }
  | { readonly tag: "invalid"; readonly message: string };

function parseSingleTargetPersistentAreaSave(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
  targetId: CombatantId,
  procedureName: "stationary persistent area" | "translating persistent area",
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
  readonly effect:
    | StationaryPersistentAreaAreaHazardEffect
    | TranslatingPersistentAreaAreaHazardEffect;
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

function persistentAreaSaveDamageEffectForRef(
  state: BattleState,
  effectRef: BattleEffectExecutionRef,
  expectedLifecycle: "stationary",
):
  | {
      readonly effectOwnerId: CombatantId;
      readonly effect: StationaryPersistentAreaAreaHazardEffect;
    }
  | undefined;
function persistentAreaSaveDamageEffectForRef(
  state: BattleState,
  effectRef: BattleEffectExecutionRef,
  expectedLifecycle: "sourceTurnTranslation",
):
  | {
      readonly effectOwnerId: CombatantId;
      readonly effect: TranslatingPersistentAreaAreaHazardEffect;
    }
  | undefined;
function persistentAreaSaveDamageEffectForRef(
  state: BattleState,
  effectRef: BattleEffectExecutionRef,
  expectedLifecycle: "stationary" | "sourceTurnTranslation",
):
  | {
      readonly effectOwnerId: CombatantId;
      readonly effect:
        | StationaryPersistentAreaAreaHazardEffect
        | TranslatingPersistentAreaAreaHazardEffect;
    }
  | undefined {
  let located:
    | {
        readonly effectOwnerId: CombatantId;
        readonly effect: PersistentAreaSaveDamageOccurrence;
      }
    | undefined;
  for (const [effectOwnerId, combatant] of state.combatants) {
    for (const candidate of combatant.activeEffects) {
      if (candidate.effectRef !== effectRef) {
        continue;
      }
      if (located !== undefined) return undefined;
      if (
        candidate.kind !== "persistentAreaSaveDamage" ||
        candidate.appearanceOccurrence === undefined ||
        candidate.savedThisTurn === undefined ||
        candidate.shapeShiftSuppressed !== undefined
      ) {
        return undefined;
      }
      located = { effectOwnerId, effect: candidate };
    }
  }
  if (located === undefined) return undefined;
  const owner = state.combatants.get(located.effectOwnerId);
  if (
    owner?.origin.kind !== "character" ||
    located.effect.sourceCombatantId !== located.effectOwnerId
  ) {
    return undefined;
  }
  const procedure = characterRetainedSpellProcedureExecution(
    owner.origin.execution,
    located.effect.sourceProcedureRef,
  );
  if (
    procedure?.procedure !== "persistentAreaSaveDamage" ||
    procedure.lifecycle.kind !== expectedLifecycle
  ) {
    return undefined;
  }
  return {
    effectOwnerId: located.effectOwnerId,
    effect: {
      ...located.effect,
      save: { ability: procedure.ability, dc: procedure.dc },
      damage: procedure.damage,
    },
  };
}

function persistentAreaTriggerFromMembershipFact(
  trigger: BattleStationaryPersistentAreaMembershipTrigger,
): BattleStationaryPersistentAreaSaveDamageTrigger;
function persistentAreaTriggerFromMembershipFact(
  trigger: BattleTranslatingPersistentAreaMembershipTrigger,
): BattleTranslatingPersistentAreaSaveDamageTrigger;
function persistentAreaTriggerFromMembershipFact(
  trigger:
    | BattleStationaryPersistentAreaMembershipTrigger
    | BattleTranslatingPersistentAreaMembershipTrigger,
):
  | BattleStationaryPersistentAreaSaveDamageTrigger
  | BattleTranslatingPersistentAreaSaveDamageTrigger {
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
  | "area-translation"
  | "entry"
  | "end-turn";

function persistentAreaSavingThrowHoleFacts(
  state: BattleState,
  targetId: CombatantId,
  effect:
    | StationaryPersistentAreaAreaHazardEffect
    | TranslatingPersistentAreaAreaHazardEffect,
): Pick<
  BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole,
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

export function stationaryPersistentAreaSaveDamageSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: StationaryPersistentAreaAreaHazardEffect,
  trigger: BattleStationaryPersistentAreaSaveDamageTrigger,
): BattleStationaryPersistentAreaSaveDamageSavingThrowOutcomeHole {
  const key = `battle:stationary-persistent-area-save-damage-save:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} CON save`,
    persistentAreaSaveDamage: {
      topology: "stationary",
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

function stationaryPersistentAreaSaveDamageDamageRollHole(
  targetId: CombatantId,
  effect: StationaryPersistentAreaAreaHazardEffect,
  trigger: BattleStationaryPersistentAreaSaveDamageTrigger,
): BattleStationaryPersistentAreaSaveDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:stationary-persistent-area-save-damage-damage:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    persistentAreaSaveDamage: {
      topology: "stationary",
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
  trigger: BattleStationaryPersistentAreaSaveDamageTrigger,
): PersistentAreaHazardTriggerLabel;
function persistentAreaHazardTriggerLabel(
  trigger: BattleTranslatingPersistentAreaSaveDamageTrigger,
): PersistentAreaHazardTriggerLabel;
function persistentAreaHazardTriggerLabel(
  trigger:
    | BattleStationaryPersistentAreaSaveDamageTrigger
    | BattleTranslatingPersistentAreaSaveDamageTrigger,
): PersistentAreaHazardTriggerLabel {
  return Match.value(trigger).pipe(
    Match.when("appearsInArea", () => "appearance" as const),
    Match.when("movesIntoSpace", () => "area-translation" as const),
    Match.when("entersArea", () => "entry" as const),
    Match.when("endsTurnInArea", () => "end-turn" as const),
    Match.exhaustive,
  );
}

function persistentAreaAppearanceOccurrenceKey(
  effect:
    | StationaryPersistentAreaAreaHazardEffect
    | TranslatingPersistentAreaAreaHazardEffect,
  trigger:
    | BattleStationaryPersistentAreaSaveDamageTrigger
    | BattleTranslatingPersistentAreaSaveDamageTrigger,
): string {
  return trigger === "appearsInArea"
    ? `:${effect.appearanceOccurrence.actorId}:${effect.appearanceOccurrence.round}`
    : "";
}

export function translatingPersistentAreaSaveDamageSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: TranslatingPersistentAreaAreaHazardEffect,
  trigger: BattleTranslatingPersistentAreaSaveDamageTrigger,
  sourceTurn?: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
): BattleTranslatingPersistentAreaSaveDamageSavingThrowOutcomeHole {
  const key = `battle:translating-persistent-area-save-damage-save:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}${persistentAreaSourceTurnTranslationSourceTurnKey(trigger, sourceTurn)}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} CON save`,
    persistentAreaSaveDamage: {
      topology: "translating",
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

export function persistentAreaSourceTurnTranslationSavingThrowHoleId(
  checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint,
): BattleHoleId {
  const { child, sourceTurn } = checkpoint;
  return holeId(
    `battle:translating-persistent-area-save-damage-save:${child.targetId}:${child.effectRef}:movesIntoSpace:${sourceTurn.actorId}:${Number(sourceTurn.round)}`,
  );
}

function translatingPersistentAreaSaveDamageDamageRollHole(
  targetId: CombatantId,
  effect: TranslatingPersistentAreaAreaHazardEffect,
  trigger: BattleTranslatingPersistentAreaSaveDamageTrigger,
  sourceTurn?: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
): BattleTranslatingPersistentAreaSaveDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:translating-persistent-area-save-damage-damage:${targetId}:${effect.effectRef}:${trigger}${persistentAreaAppearanceOccurrenceKey(effect, trigger)}${persistentAreaSourceTurnTranslationSourceTurnKey(trigger, sourceTurn)}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    persistentAreaSaveDamage: {
      topology: "translating",
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

function persistentAreaSourceTurnTranslationSourceTurnKey(
  trigger: BattleTranslatingPersistentAreaSaveDamageTrigger,
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
  const sourceTurn = persistentAreaSourceTurnTranslationReplaySourceTurn(
    context.replayPlan,
  );
  const key = `battle:translatingPersistentArea-movement-concentration:${sourceTurn.actorId}:${Number(sourceTurn.round)}:${context.occurrence.effectRef}:${context.occurrence.targetId}`;
  return {
    ...base,
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
  };
}
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.STATIONARY_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.TRANSLATING_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE
