import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import * as Result from "effect/Result";
import {
  spellActiveEffectForExecutionRef,
  spellActiveEffectExecutionRef,
} from "../effect-execution-ref.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleActiveEffect,
  BattleFill,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import {
  controlledVerticalSuspensionTargetWithinRangeFactPresent,
  controlledVerticalSuspensionAltitudeChangeHole,
  updateControlledVerticalSuspensionAltitude,
} from "./controlled-vertical-suspension.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { applySelfTransformationModeEffect } from "./spells-active-effects.ts";
import { spellProcedureBoundToActiveEffect } from "./spell-active-effect-binding.ts";

type ControlledVerticalSuspensionSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "controlledVerticalSuspensionAltitudeControl";
  }
>;

type ControlledVerticalSuspensionInput =
  BattleResolutionInputForSubject<ControlledVerticalSuspensionSubject>;

type ControlledVerticalSuspensionEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "controlledVerticalSuspension" }
>;

type ControlledVerticalSuspensionProcedure = Extract<
  NonNullable<ReturnType<typeof spellProcedureBoundToActiveEffect>>,
  { readonly procedure: "controlledVerticalSuspension" }
>;

type ControlledVerticalSuspensionContext = {
  readonly effect: ControlledVerticalSuspensionEffect;
  readonly sourceProcedure: ControlledVerticalSuspensionProcedure;
};

type ControlledVerticalSuspensionContextResult =
  | {
      readonly tag: "ok";
      readonly context: ControlledVerticalSuspensionContext;
    }
  | { readonly tag: "invalid"; readonly message: string };

function controlledVerticalSuspensionContext(
  input: ControlledVerticalSuspensionInput,
): ControlledVerticalSuspensionContextResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !controlledVerticalSuspensionActionIsAvailable(
      actor,
      input.state.currentTurnResources,
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Magic action is no longer available for ControlledVerticalSuspension altitude control.",
    };
  }
  const target = input.state.combatants.get(input.subject.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude control is no longer active for the target.",
    };
  }
  const selectedEffect = spellActiveEffectForExecutionRef(
    target.activeEffects,
    input.subject.effectRef,
  );
  if (selectedEffect?.kind !== "controlledVerticalSuspension") {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude control is no longer active for the target.",
    };
  }
  if (selectedEffect.sourceCombatantId !== input.subject.actorId) {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude control is no longer active for the target.",
    };
  }
  const sourceProcedure = spellProcedureBoundToActiveEffect(
    input.state,
    selectedEffect,
  );
  if (sourceProcedure?.procedure !== "controlledVerticalSuspension") {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension source procedure is no longer available.",
    };
  }
  return {
    tag: "ok",
    context: { effect: selectedEffect, sourceProcedure },
  };
}

function controlledVerticalSuspensionActionIsAvailable(
  actor: Parameters<typeof combatantCanTakeActions>[0],
  resources: Parameters<typeof canSpendAction>[0],
): boolean {
  return combatantCanTakeActions(actor) && canSpendAction(resources, "magic");
}

type ControlledVerticalSuspensionAltitudeChangeFill = Extract<
  BattleFill,
  { readonly kind: "controlledVerticalSuspensionAltitudeChange" }
>;

type ControlledVerticalSuspensionAltitudeChangeHole = ReturnType<
  typeof controlledVerticalSuspensionAltitudeChangeHole
>;

type ControlledVerticalSuspensionFillAdmission =
  | {
      readonly tag: "ok";
      readonly fill: ControlledVerticalSuspensionAltitudeChangeFill;
    }
  | { readonly tag: "needsHole" }
  | { readonly tag: "invalid"; readonly message: string };

function admitControlledVerticalSuspensionFill(
  input: ControlledVerticalSuspensionInput,
  context: ControlledVerticalSuspensionContext,
  hole: ControlledVerticalSuspensionAltitudeChangeHole,
): ControlledVerticalSuspensionFillAdmission {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject fills that contradict the admitted subject's discovered hole contract. */
  if (input.fills.length > 1) {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude control uses one altitude-change fill.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const fill = input.fills[0];
  if (fill === undefined) return { tag: "needsHole" };
  /* v8 ignore start -- @preserve -- Malformed resolution input: these guards reject fills that contradict the admitted subject's discovered hole contract. */
  if (fill.kind !== "controlledVerticalSuspensionAltitudeChange") {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude control requires the selected altitude-change fill.",
    };
  }
  if (fill.holeId !== hole.holeId) {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude control requires the selected altitude-change fill.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard rejects an altitude change outside the discovered hole's typed constraints. */
  if (!controlledVerticalSuspensionAltitudeChangeIsValid(fill, hole)) {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude change must be a positive whole number no greater than the spell limit.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard rejects a fill without the table fact required by the discovered hole. */
  if (
    !controlledVerticalSuspensionTargetWithinRangeFactPresent({
      facts: fill.spatialFacts,
      effectRef: context.effect.effectRef,
      sourceCombatantId: context.effect.sourceCombatantId,
      sourceProcedureRef: context.effect.sourceProcedureRef,
      targetId: input.subject.targetId,
      rangeFeet: context.sourceProcedure.rangeFeet,
    })
  ) {
    return {
      tag: "invalid",
      message:
        "ControlledVerticalSuspension altitude control requires a table fact that the target remains within the spell's range.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "ok", fill };
}

function controlledVerticalSuspensionAltitudeChangeIsValid(
  fill: ControlledVerticalSuspensionAltitudeChangeFill,
  hole: ControlledVerticalSuspensionAltitudeChangeHole,
): boolean {
  return (
    hole.directions.includes(fill.value.direction) &&
    fill.value.distanceFeet > 0 &&
    fill.value.distanceFeet <= hole.maxDistanceFeet &&
    Number.isInteger(fill.value.distanceFeet)
  );
}

export function resolveControlledVerticalSuspensionAltitudeControlCommand(
  input: ControlledVerticalSuspensionInput,
): BattleResolutionResult {
  const contextResult = controlledVerticalSuspensionContext(input);
  if (contextResult.tag === "invalid") {
    return invalidResult(input.state, "staleSubject", contextResult.message);
  }
  const { effect, sourceProcedure } = contextResult.context;
  const hole = controlledVerticalSuspensionAltitudeChangeHole({
    actorId: input.subject.actorId,
    targetId: input.subject.targetId,
    effectRef: effect.effectRef,
    maxDistanceFeet: sourceProcedure.maxAltitudeChangeFeet,
  });
  const fillAdmission = admitControlledVerticalSuspensionFill(
    input,
    contextResult.context,
    hole,
  );
  if (fillAdmission.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillAdmission.message);
  }
  if (fillAdmission.tag === "needsHole") {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const fill = fillAdmission.fill;
  const spentState = {
    ...input.state,
    currentTurnResources: Result.getOrThrow(
      spendAction(input.state.currentTurnResources, "magic"),
    ),
  };
  const nextState = updateControlledVerticalSuspensionAltitude({
    state: spentState,
    targetId: input.subject.targetId,
    effectRef: effect.effectRef,
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    change: fill.value,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveReplaceSelfTransformationModeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "replaceSelfTransformationMode";
      }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Self-transformation mode replacement uses no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendAction(input.state.currentTurnResources, "magic")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const spent = Result.getOrThrow(
    spendAction(input.state.currentTurnResources, "magic"),
  );
  const selectedEffect = spellActiveEffectForExecutionRef(
    actor.activeEffects,
    input.subject.effectRef,
  );
  const activeEffect =
    selectedEffect?.kind === "selfTransformation" ? selectedEffect : undefined;
  if (
    activeEffect === undefined ||
    activeEffect.sourceCombatantId !== input.subject.actorId
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Self-transformation mode replacement requires an active self-transformation effect.",
    );
  }
  if (activeEffect.mode === input.subject.mode) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Self-transformation mode is already active.",
    );
  }
  const modeEffect =
    input.subject.mode === "naturalWeapons"
      ? activeEffect.naturalWeaponFacts.damage.damageTypeChoices.includes(
          input.subject.naturalWeaponDamageType,
        )
        ? {
            mode: input.subject.mode,
            naturalWeaponFacts: activeEffect.naturalWeaponFacts,
            naturalWeaponDamageType: input.subject.naturalWeaponDamageType,
          }
        : /* v8 ignore next -- @preserve -- Discovered-subject invariant: the selected damage type comes from these immutable active-effect choices. */
          null
      : {
          mode: input.subject.mode,
          naturalWeaponFacts: activeEffect.naturalWeaponFacts,
        };
  /* v8 ignore start -- @preserve -- Stale forged subject: discovery derives Natural Weapons choices from this same active effect, whose immutable procedure facts remain attached for its lifetime. */
  if (modeEffect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Natural Weapons damage type is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = applySelfTransformationModeEffect({
    state: { ...input.state, currentTurnResources: spent },
    actorId: input.subject.actorId,
    sourceCombatantId: activeEffect.sourceCombatantId,
    sourceProcedureRef: activeEffect.sourceProcedureRef,
    modeEffect,
    expiresAt: activeEffect.expiresAt,
    effectRef: spellActiveEffectExecutionRef(activeEffect),
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
