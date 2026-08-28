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
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import {
  levitatedTargetWithinSpellRangeFactPresent,
  levitateAltitudeChangeHole,
  updateLevitatedCreatureAltitude,
} from "./levitate-creature.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { applySelfTransformationModeEffect } from "./spells-active-effects.ts";

export function resolveLevitateAltitudeControlCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "levitateAltitudeControl";
      }
    >
  >,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendAction(input.state.currentTurnResources, "magic")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for Levitate altitude control.",
    );
  }
  const target = input.state.combatants.get(input.subject.targetId);
  const selectedEffect =
    target === undefined
      ? undefined
      : spellActiveEffectForExecutionRef(
          target.activeEffects,
          input.subject.effectRef,
        );
  const effect =
    selectedEffect?.kind === "spellLevitatedCreature"
      ? selectedEffect
      : undefined;
  if (
    target === undefined ||
    effect === undefined ||
    effect.sourceCombatantId !== input.subject.actorId
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Levitate altitude control is no longer active for the target.",
    );
  }
  const hole = levitateAltitudeChangeHole({
    actorId: input.subject.actorId,
    targetId: input.subject.targetId,
    effectRef: effect.effectRef,
    maxDistanceFeet: effect.maxAltitudeChangeFeet,
  });
  const fill = input.fills[0];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 1) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude control uses one altitude-change fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.kind !== "levitateAltitudeChange" || fill.holeId !== hole.holeId) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude control requires the selected altitude-change fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hole.directions.includes(fill.value.direction) ||
    fill.value.distanceFeet <= 0 ||
    fill.value.distanceFeet > hole.maxDistanceFeet ||
    !Number.isInteger(fill.value.distanceFeet)
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude change must be a positive whole number no greater than the spell limit.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !levitatedTargetWithinSpellRangeFactPresent({
      facts: fill.spatialFacts,
      effectRef: effect.effectRef,
      sourceCombatantId: effect.sourceCombatantId,
      sourceProcedureRef: effect.sourceProcedureRef,
      targetId: input.subject.targetId,
      rangeFeet: effect.rangeFeet,
    })
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude control requires a table fact that the target remains within the spell's range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spentState = {
    ...input.state,
    currentTurnResources: Result.getOrThrow(
      spendAction(input.state.currentTurnResources, "magic"),
    ),
  };
  const nextState = updateLevitatedCreatureAltitude({
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
