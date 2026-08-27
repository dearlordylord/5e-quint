import { spellActiveEffectExecutionRef } from "../active-effect/execution-ref.ts";
import { Match } from "effect";
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
import { areaWindStrengthHole } from "./area-wind-strength.ts";

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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Fog Cloud strong-wind dispersal uses no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 1) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill dispersal uses one area wind-strength fact fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const cloudkill = input.state.combatants
    .get(input.subject.effectOwnerId)
    ?.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "cloudkillAreaHazard" }
      > =>
        effect.kind === "cloudkillAreaHazard" &&
        effect.areaId === input.subject.areaId &&
        spellActiveEffectExecutionRef(effect) === input.subject.effectRef,
    );
  if (cloudkill === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Cloudkill area is no longer active for this dispersal subject.",
    );
  }
  const hole = areaWindStrengthHole(
    cloudkill.areaId,
    spellActiveEffectExecutionRef(cloudkill),
  );
  const fill = input.fills[0];
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  if (fill.kind !== "areaWindStrength" || fill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill dispersal requires the requested area wind-strength fact.",
    );
  }
  const strongWindEstablished = Match.value(fill.value).pipe(
    Match.when({ kind: "strong" }, () => true),
    Match.when({ kind: "notStrong" }, () => false),
    Match.exhaustive,
  );
  if (!strongWindEstablished) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill dispersal requires strong wind in its area.",
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 1) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation uses one table spatial fact fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation requires a table fact that the connected creatures are beyond 60 feet.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
