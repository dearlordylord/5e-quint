// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
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
  battleStateAfterLinkedDefenseResistanceDamageShareSeparation,
  linkedDefenseResistanceDamageShareSeparationFactsAreSatisfied,
  linkedDefenseResistanceDamageShareSeparationFactsHole,
} from "./linked-defense-damage-share.ts";
import { areaWindStrengthHole } from "./area-wind-strength.ts";

export function resolveDispersePersistentAreaTraitCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "endPersistentAreaTraitForEnvironment";
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
      "persistent-area trait strong-wind dispersal uses no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const persistentAreaTrait = [...input.state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (effect) =>
        effect.kind === "persistentAreaTrait" &&
        effect.areaId === input.subject.areaId,
    );
  if (persistentAreaTrait === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "persistent-area trait area is no longer active.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    persistentAreaTrait.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveDisperseTranslatingPersistentAreaCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "endPersistentAreaSaveDamageForEnvironment";
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
      "TranslatingPersistentArea dispersal uses one area wind-strength fact fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const translatingPersistentArea = input.state.combatants
    .get(input.subject.effectOwnerId)
    ?.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "persistentAreaSaveDamage" }
      > =>
        effect.kind === "persistentAreaSaveDamage" &&
        spellActiveEffectExecutionRef(effect) === input.subject.effectRef,
    );
  if (translatingPersistentArea === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "TranslatingPersistentArea area is no longer active for this dispersal subject.",
    );
  }
  const hole = areaWindStrengthHole(
    translatingPersistentArea.areaId,
    spellActiveEffectExecutionRef(translatingPersistentArea),
  );
  const fill = input.fills[0];
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  if (fill.kind !== "areaWindStrength" || fill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "TranslatingPersistentArea dispersal requires the requested area wind-strength fact.",
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
      "TranslatingPersistentArea dispersal requires strong wind in its area.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    translatingPersistentArea.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveLinkedDefenseResistanceDamageShareSeparationCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "linkedDefenseResistanceDamageShareSeparation";
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
      "Linked defense separation uses one table spatial fact fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const target = input.state.combatants.get(input.subject.targetId);
  const effect = target?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "linkedDefenseResistanceDamageShare" }
    > =>
      candidate.kind === "linkedDefenseResistanceDamageShare" &&
      spellActiveEffectExecutionRef(candidate) === input.subject.effectRef,
  );
  if (
    effect === undefined ||
    effect.sourceCombatantId !== input.subject.actorId
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "The linked defense effect is no longer active for this connected target.",
    );
  }
  const hole = linkedDefenseResistanceDamageShareSeparationFactsHole({
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
    !linkedDefenseResistanceDamageShareSeparationFactsAreSatisfied({
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
      "Linked defense separation requires a table fact that the connected creatures are beyond 60 feet.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState =
    battleStateAfterLinkedDefenseResistanceDamageShareSeparation({
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
