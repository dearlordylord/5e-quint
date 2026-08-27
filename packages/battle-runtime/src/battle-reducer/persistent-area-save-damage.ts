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
  BattleCreatureState,
  BattleFill,
  BattleHole,
  BattleHoleId,
  BattleInsectPlagueAreaHazardDamageRollHole,
  BattleInsectPlagueAreaHazardSavingThrowOutcomeHole,
  BattleInsectPlagueAreaHazardTrigger,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleReplayParentPosition,
  BattleSavingThrowOutcome,
  BattleState,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import type { BattleAreaId, CombatantId } from "../identity.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
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
  readonly parentHoleId: BattleHoleId;
  readonly subject: CloudkillResolutionInput["subject"];
};

type PersistentAreaSequenceHole = Extract<
  BattleHole,
  {
    readonly kind:
      | "savingThrowOutcome"
      | "rolledDice"
      | "concentrationSavingThrow";
  }
>;

export type CloudkillMovementSaveDamageSequenceResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly saveHoleIds: ReadonlySet<BattleHoleId>;
      readonly damageHoleIds: ReadonlySet<BattleHoleId>;
      readonly concentrationHoleIds: ReadonlySet<BattleHoleId>;
    }
  | {
      readonly tag: "result";
      readonly result: BattleResolutionResult;
    };

type InsectPlagueResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "insectPlagueAreaHazardSave";
    }
  >;
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
};

type CloudkillResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "cloudkillAreaHazardSave";
    }
  >;
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
};

type ParsedPersistentAreaSaveDamageProcedure =
  | {
      readonly kind: "insectPlague";
      readonly resolution: InsectPlagueResolutionInput;
      readonly target: BattleCreatureState;
      readonly effect: InsectPlagueAreaHazardEffect;
      readonly trigger: BattleInsectPlagueAreaHazardTrigger;
    }
  | {
      readonly kind: "cloudkill";
      readonly resolution: CloudkillResolutionInput;
      readonly target: BattleCreatureState;
      readonly effect: CloudkillAreaHazardEffect;
      readonly trigger: BattleCloudkillAreaHazardTrigger;
    };

type PersistentAreaSaveDamageProcedureCandidate =
  | {
      readonly kind: "insectPlague";
      readonly resolution: InsectPlagueResolutionInput;
      readonly target: BattleCreatureState | undefined;
      readonly effect: InsectPlagueAreaHazardEffect | undefined;
      readonly trigger: BattleInsectPlagueAreaHazardTrigger;
    }
  | {
      readonly kind: "cloudkill";
      readonly resolution: CloudkillResolutionInput;
      readonly target: BattleCreatureState | undefined;
      readonly effect: CloudkillAreaHazardEffect | undefined;
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
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "insectPlague",
    resolution,
    target: resolution.state.combatants.get(resolution.subject.actorId),
    effect: activeEffectForArea(
      resolution.state,
      resolution.subject.areaMembershipTrigger.areaId,
      (candidate): candidate is InsectPlagueAreaHazardEffect =>
        candidate.kind === "insectPlagueAreaHazard",
    ),
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
  const parsed = parsePersistentAreaSaveDamageProcedure({
    kind: "cloudkill",
    resolution,
    target: resolution.state.combatants.get(resolution.subject.actorId),
    effect: activeEffectForArea(
      resolution.state,
      resolution.subject.areaMembershipTrigger.areaId,
      (candidate): candidate is CloudkillAreaHazardEffect =>
        candidate.kind === "cloudkillAreaHazard",
    ),
    trigger: persistentAreaTriggerFromMembershipFact(
      resolution.subject.areaMembershipTrigger,
    ),
  });
  return parsed.tag === "invalid"
    ? parsed.result
    : resolveParsedPersistentAreaSaveDamage(parsed.procedure);
}

export function persistentAreaAppearanceTriggerMatchesCurrentTurn(
  state: BattleState,
  trigger:
    | BattleInsectPlagueAreaMembershipTrigger
    | BattleCloudkillAreaMembershipTrigger,
): boolean {
  return (
    trigger.kind === "appearsInArea" &&
    trigger.triggerTurn.actorId === currentActorId(state) &&
    trigger.triggerTurn.round === state.initiative.round
  );
}

export function resolveCloudkillMovementSaveDamageSequence(input: {
  readonly advancedState: BattleState;
  readonly parent: ReplayParentContinuation;
  readonly requests: readonly CloudkillMovementSaveDamageRequest[];
  readonly parentPosition: BattleReplayParentPosition | undefined;
}): CloudkillMovementSaveDamageSequenceResult {
  const saveHoleIds = new Set<BattleHoleId>();
  const damageHoleIds = new Set<BattleHoleId>();
  const concentrationHoleIds = new Set<BattleHoleId>();
  let parentPositionMatched = input.parentPosition === undefined;
  let state = input.advancedState;

  for (const request of input.requests) {
    let resumesAfterThisSave = false;
    let savePosition: BattleReplayParentPosition | undefined;
    const procedureFills: BattleFill[] = [];
    let child = resolveCloudkillAreaSaveDamage({
      state,
      subject: request.subject,
      fills: procedureFills,
      handledInterruptTrigger: "saveFailed",
    });

    for (;;) {
      const childStep = Match.value(child).pipe(
        Match.when({ tag: "resolved" }, (result) => ({
          tag: "resolved" as const,
          result,
        })),
        Match.when({ tag: "needsHoles" }, (result) => ({
          tag: "needsHoles" as const,
          result,
        })),
        Match.when({ tag: "invalid" }, (result) => ({
          tag: "invalid" as const,
          result,
        })),
        Match.exhaustive,
      );
      if (childStep.tag === "resolved") {
        state = childStep.result.state;
        break;
      }
      if (childStep.tag === "invalid") {
        return {
          tag: "result",
          result: projectReplayChildResult(input.parent, childStep.result),
        };
      }

      const [hole, ...additionalHoles] = childStep.result.holes;
      if (
        hole === undefined ||
        additionalHoles.length > 0 ||
        !isPersistentAreaSequenceHole(hole)
      ) {
        return invalidCloudkillMovementSaveDamageSequence(input.parent);
      }
      const matchingFills = input.parent.fills.filter(
        (fill) => fill.kind === hole.kind && fill.holeId === hole.holeId,
      );
      if (matchingFills.length === 0) {
        return {
          tag: "result",
          result: projectReplayChildResult(input.parent, childStep.result),
        };
      }
      procedureFills.push(...matchingFills);
      if (hole.kind === "savingThrowOutcome") {
        savePosition = cloudkillMovementSaveDamagePosition(
          request,
          hole.holeId,
        );
        resumesAfterThisSave =
          input.parentPosition !== undefined &&
          sameCloudkillMovementSaveDamagePosition(
            input.parentPosition,
            savePosition,
          );
        if (resumesAfterThisSave) {
          parentPositionMatched = true;
        }
      }
      Match.value(hole).pipe(
        Match.when({ kind: "savingThrowOutcome" }, ({ holeId }) =>
          saveHoleIds.add(holeId),
        ),
        Match.when({ kind: "rolledDice" }, ({ holeId }) =>
          damageHoleIds.add(holeId),
        ),
        Match.when({ kind: "concentrationSavingThrow" }, ({ holeId }) =>
          concentrationHoleIds.add(holeId),
        ),
        Match.exhaustive,
      );
      child = resolveCloudkillAreaSaveDamage({
        state,
        subject: request.subject,
        fills: procedureFills,
        handledInterruptTrigger: "saveFailed",
      });

      const failedSave =
        matchingFills.find(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "savingThrowOutcome" }
          > => fill.kind === "savingThrowOutcome",
        )?.value.outcomes[0]?.succeeded === false;
      if (failedSave && !resumesAfterThisSave) {
        if (savePosition === undefined) {
          return invalidCloudkillMovementSaveDamageSequence(input.parent);
        }
        const reactionWindow = maybeOpenInterruptWindow(
          input.parent.state,
          {
            trigger: "saveFailed",
            targetId: request.subject.actorId,
            sourceProcedureRef: request.effect.sourceProcedureRef,
            continuation: replayParentProcedureAt(input.parent, savePosition),
          },
          undefined,
        );
        if (reactionWindow !== null) {
          return {
            tag: "result",
            result: projectReplayChildResult(input.parent, reactionWindow),
          };
        }
      }
    }
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
  };
}

function cloudkillMovementSaveDamagePosition(
  request: CloudkillMovementSaveDamageRequest,
  saveHoleId: BattleHoleId,
): BattleReplayParentPosition {
  return {
    kind: "persistentAreaSaveDamage",
    parentHoleId: request.parentHoleId,
    saveHoleId,
    areaId: request.effect.areaId,
    sourceProcedureRef: request.effect.sourceProcedureRef,
    targetId: request.subject.actorId,
  };
}

function sameCloudkillMovementSaveDamagePosition(
  left: BattleReplayParentPosition,
  right: BattleReplayParentPosition,
): boolean {
  return (
    left.kind === right.kind &&
    left.parentHoleId === right.parentHoleId &&
    left.saveHoleId === right.saveHoleId &&
    left.areaId === right.areaId &&
    left.sourceProcedureRef === right.sourceProcedureRef &&
    left.targetId === right.targetId
  );
}

function isPersistentAreaSequenceHole(
  hole: BattleHole,
): hole is PersistentAreaSequenceHole {
  return (
    hole.kind === "savingThrowOutcome" ||
    hole.kind === "rolledDice" ||
    hole.kind === "concentrationSavingThrow"
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
      fill.kind !== "concentrationSavingThrow",
  )
    ? invalidResult(
        resolution.state,
        "invalidFill",
        `${procedureName} save accepts only save, damage, and Concentration fills.`,
      )
    : null;
}

function parsePersistentAreaSaveDamageProcedure(
  candidate: PersistentAreaSaveDamageProcedureCandidate,
): PersistentAreaProcedureParseResult {
  const membershipTrigger = candidate.resolution.subject.areaMembershipTrigger;
  if (
    membershipTrigger.kind === "appearsInArea" &&
    !persistentAreaAppearanceTriggerMatchesCurrentTurn(
      candidate.resolution.state,
      membershipTrigger,
    )
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        candidate.resolution.state,
        "staleSubject",
        `${persistentAreaProcedureName(candidate.kind)} appearance save no longer matches its triggering turn.`,
      ),
    };
  }
  if (candidate.effect === undefined) {
    return {
      tag: "invalid",
      result: invalidResult(
        candidate.resolution.state,
        "staleSubject",
        `${persistentAreaProcedureName(candidate.kind)} save is no longer available.`,
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
    candidate.effect.savedThisTurn.includes(
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
            effect: candidate.effect,
            trigger: candidate.trigger,
          }
        : {
            kind: candidate.kind,
            resolution: candidate.resolution,
            target: candidate.target,
            effect: candidate.effect,
            trigger: candidate.trigger,
          },
  };
}

function resolveParsedPersistentAreaSaveDamage(
  procedure: ParsedPersistentAreaSaveDamageProcedure,
): BattleResolutionResult {
  const { resolution, target, effect } = procedure;
  const { saveHole, damageHole } = persistentAreaProcedureHoles(procedure);
  const procedureName = persistentAreaProcedureName(procedure.kind);
  const saveFills = resolution.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = resolution.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: each discovered persistent-area save and damage hole can be answered only once. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      resolution.state,
      "invalidFill",
      `${procedureName} save received duplicate fills.`,
    );
  }
  /* v8 ignore stop -- @preserve */

  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(resolution.state, resolution.subject, [saveHole]);
  }
  const parsedSave = parseSingleTargetPersistentAreaSave(
    saveFill,
    resolution.subject.actorId,
    procedureName,
  );
  /* v8 ignore start -- @preserve -- Malformed fill: the save outcome must answer the discovered single-target hole for the triggering actor. */
  if (parsedSave.tag === "invalid") {
    return invalidResult(resolution.state, "invalidFill", parsedSave.message);
  }
  /* v8 ignore stop -- @preserve */
  const saveOutcome = parsedSave.outcome;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      resolution.state,
      {
        trigger: "saveFailed",
        targetId: resolution.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: resolution.subject,
          fills: resolution.fills,
        },
      },
      resolution.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsHolesResult(resolution.state, resolution.subject, [damageHole]);
  }
  const damageIssue = validateRolledDiceFillForDiceExpr(
    damageFill,
    effect.damage.expr,
  );
  /* v8 ignore start -- @preserve -- Malformed fill: the damage roll must match the exact expression carried by its discovered hole. */
  if (damageIssue !== null) {
    return invalidResult(resolution.state, "invalidFill", damageIssue);
  }
  /* v8 ignore stop -- @preserve */

  const adjustedDamage = persistentAreaAdjustedDamage({
    state: resolution.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : resolution.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- @preserve -- Malformed fill set: a damaged concentrating target exposes at most one Concentration save hole. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      resolution.state,
      "invalidFill",
      `${procedureName} save received duplicate Concentration save fills.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsHolesResult(resolution.state, resolution.subject, [
      concentrationHole,
    ]);
  }

  const consumedHoleIds = new Set([
    saveHole.holeId,
    damageHole.holeId,
    ...(concentrationHole === null ? [] : [concentrationHole.holeId]),
  ]);
  /* v8 ignore start -- @preserve -- Malformed fill set: every supplied fill must answer a hole derived for this exact replay subject. */
  if (resolution.fills.some((fill) => !consumedHoleIds.has(fill.holeId))) {
    return invalidResult(
      resolution.state,
      "invalidFill",
      `${procedureName} save received a fill for an unrelated hole.`,
    );
  }
  /* v8 ignore stop -- @preserve */

  const afterDamage = applyPreparedSlotSpellDamage(
    resolution.state,
    resolution.subject.actorId,
    adjustedDamage,
    {
      damageSourceId: effect.sourceCombatantId,
      ...optionalProperty("concentrationSavingThrow", concentrationFill),
      spatialFacts: [],
    },
  );
  const nextState = stateAfterPersistentAreaSaveDamage(procedure, afterDamage);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

const byPersistentAreaProcedureKind = Match.discriminator("kind");

function persistentAreaProcedureHoles(
  procedure: ParsedPersistentAreaSaveDamageProcedure,
): PersistentAreaProcedureHoles {
  return Match.value(procedure).pipe(
    byPersistentAreaProcedureKind("insectPlague", (insectPlague) => ({
      saveHole: insectPlagueAreaHazardSavingThrowOutcomeHole(
        insectPlague.resolution.state,
        insectPlague.resolution.subject.actorId,
        insectPlague.effect,
        insectPlague.trigger,
      ),
      damageHole: insectPlagueAreaHazardDamageRollHole(
        insectPlague.resolution.state,
        insectPlague.resolution.subject.actorId,
        insectPlague.effect,
        insectPlague.trigger,
      ),
    })),
    byPersistentAreaProcedureKind("cloudkill", (cloudkill) => ({
      saveHole: cloudkillAreaHazardSavingThrowOutcomeHole(
        cloudkill.resolution.state,
        cloudkill.resolution.subject.actorId,
        cloudkill.effect,
        cloudkill.trigger,
      ),
      damageHole: cloudkillAreaHazardDamageRollHole(
        cloudkill.resolution.state,
        cloudkill.resolution.subject.actorId,
        cloudkill.effect,
        cloudkill.trigger,
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
        insectPlague.effect,
      ),
    ),
    byPersistentAreaProcedureKind("cloudkill", (cloudkill) =>
      markCloudkillAreaHazardSavedThisTurn(
        state,
        cloudkill.resolution.subject.actorId,
        cloudkill.effect,
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

function activeEffectForArea<
  TEffect extends BattleActiveEffect & { readonly areaId: BattleAreaId },
>(
  state: BattleState,
  areaId: BattleAreaId,
  isExpectedEffect: (effect: BattleActiveEffect) => effect is TEffect,
): TEffect | undefined {
  for (const combatant of state.combatants.values()) {
    const effect = combatant.activeEffects.find(
      (candidate): candidate is TEffect =>
        isExpectedEffect(candidate) && candidate.areaId === areaId,
    );
    if (effect !== undefined) return effect;
  }
  return undefined;
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
  const key = `battle:insect-plague-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}${persistentAreaAppearanceTurnKey(state, trigger)}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} CON save`,
    insectPlagueAreaHazard: {
      targetId,
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
  state: BattleState,
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect,
  trigger: BattleInsectPlagueAreaHazardTrigger,
): BattleInsectPlagueAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:insect-plague-area-hazard-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}${persistentAreaAppearanceTurnKey(state, trigger)}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    insectPlagueAreaHazard: {
      targetId,
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

function persistentAreaAppearanceTurnKey(
  state: BattleState,
  trigger:
    | BattleInsectPlagueAreaHazardTrigger
    | BattleCloudkillAreaHazardTrigger,
): string {
  return trigger === "appearsInArea"
    ? `:${currentActorId(state)}:${state.initiative.round}`
    : "";
}

export function cloudkillAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
): BattleCloudkillAreaHazardSavingThrowOutcomeHole {
  const key = `battle:cloudkill-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}${persistentAreaAppearanceTurnKey(state, trigger)}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} CON save`,
    cloudkillAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ...persistentAreaSavingThrowHoleFacts(state, targetId, effect),
  };
}

function cloudkillAreaHazardDamageRollHole(
  state: BattleState,
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
): BattleCloudkillAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:cloudkill-area-hazard-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}${persistentAreaAppearanceTurnKey(state, trigger)}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${persistentAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    cloudkillAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}
