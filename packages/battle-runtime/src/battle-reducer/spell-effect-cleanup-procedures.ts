import { spellActiveEffectExecutionRef } from "../active-effect/execution-ref.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleActiveEffect,
  BattleResolutionInput,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  battleStateAfterWardingBondSeparation,
  wardingBondSeparationFactsAreSatisfied,
  wardingBondSeparationFactsHole,
} from "./warding-bond.ts";

export function resolveDisperseFogCloudCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "disperseFogCloud";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Fog Cloud strong-wind dispersal uses no fills.",
    );
  }
  /* v8 ignore stop */
  const fogCloud = [...input.state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (effect) =>
        effect.kind === "fogCloudObscurement" &&
        effect.areaId === input.subject.areaId,
    );
  if (fogCloud === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Fog Cloud area is no longer active.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    fogCloud.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveDisperseCloudkillCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "disperseCloudkill";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill strong-wind dispersal uses no fills.",
    );
  }
  /* v8 ignore stop */
  const cloudkill = [...input.state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (effect) =>
        effect.kind === "cloudkillAreaHazard" &&
        effect.areaId === input.subject.areaId,
    );
  if (cloudkill === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Cloudkill area is no longer active.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    cloudkill.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveWardingBondSeparationCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "wardingBondSeparation";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 1) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation uses one table spatial fact fill.",
    );
  }
  /* v8 ignore stop */
  const target = input.state.combatants.get(input.subject.targetId);
  const effect = target?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "wardingBond" }
    > =>
      candidate.kind === "wardingBond" &&
      spellActiveEffectExecutionRef(candidate) === input.subject.effectRef,
  );
  if (
    effect === undefined ||
    effect.sourceCombatantId !== input.subject.actorId
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Warding Bond is no longer active for this connected target.",
    );
  }
  const hole = wardingBondSeparationFactsHole({
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    targetId: input.subject.targetId,
  });
  const fill = input.fills[0];
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fill.kind !== "targetSpatialFacts" ||
    fill.holeId !== hole.holeId ||
    !wardingBondSeparationFactsAreSatisfied({
      sourceCombatantId: effect.sourceCombatantId,
      sourceProcedureRef: effect.sourceProcedureRef,
      targetId: input.subject.targetId,
      facts: fill.spatialFacts,
    })
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation requires a table fact that the connected creatures are beyond 60 feet.",
    );
  }
  /* v8 ignore stop */
  const nextState = battleStateAfterWardingBondSeparation({
    state: input.state,
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    targetId: input.subject.targetId,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
