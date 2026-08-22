import { spellActiveEffectExecutionRef } from "../active-effect/execution-ref.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleFill,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  applyProtectionRelevantEffectSaveOutcome,
  conditionApplicationPreventedByCreatureTypeProtection,
  protectionRelevantEffectsForTarget,
  protectionRelevantEffectSavingThrowOutcomeHole,
  resolveBattlePossessionAttempt,
  validateProtectionRelevantEffectSavingThrowOutcome,
} from "./spell-condition-effects-helpers.ts";

export function resolveProtectionRelevantEffectSaveCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "protectionRelevantEffectSave";
      }
    >
  >,
): BattleResolutionResult {
  const effect = protectionRelevantEffectsForTarget(
    input.state,
    input.subject.actorId,
  ).find(
    (candidate) =>
      spellActiveEffectExecutionRef(candidate) === input.subject.effectRef,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Protection from Evil and Good relevant-effect save requires a matching active effect on the target.",
    );
  }
  const hole = protectionRelevantEffectSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
  );
  if (
    hole.protectionRelevantEffectSave.relevantEffect !==
    input.subject.relevantEffect
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Protection relevant-effect identity no longer matches the selected active effect.",
    );
  }
  const saveFill = input.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === hole.holeId,
  );
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFill.relationshipFacts !== undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Protection from Evil and Good save relationship facts were not requested.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const validation = validateProtectionRelevantEffectSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const nextState = applyProtectionRelevantEffectSaveOutcome(
    input.state,
    input.subject.actorId,
    effect,
    saveFill.value.outcomes[0]?.succeeded === true,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveCreatureTypeProtectionConditionAttemptCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "creatureTypeProtectionConditionAttempt";
      }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length !== 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Creature Type Protection condition attempts do not accept fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const target = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- @preserve -- Dispatcher invariant: runtime-command resolution admits only a subject whose actor is the current known combatant. */
  if (target === undefined) {
    /* v8 ignore next -- @preserve -- Dispatcher invariant: the public resolver rejects an unknown subject actor before this handler runs. */
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection condition attempt requires a known target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    !conditionApplicationPreventedByCreatureTypeProtection(
      input.state,
      input.subject.sourceCombatantId,
      target,
      input.subject.condition,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection condition attempt requires a scoped protected condition.",
    );
  }
  return {
    tag: "resolved",
    state: input.state,
    snapshot: snapshotBattle(input.state),
  };
}

export function resolveCreatureTypeProtectionPossessionAttemptCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "creatureTypeProtectionPossessionAttempt";
      }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length !== 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Creature Type Protection possession attempts do not accept fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const disposition = resolveBattlePossessionAttempt({
    state: input.state,
    sourceCombatantId: input.subject.sourceCombatantId,
    targetId: input.subject.actorId,
  });
  if (disposition.tag === "invalid") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection possession attempt requires known source and target creature types.",
    );
  }
  if (
    disposition.tag !== "prevented" ||
    disposition.prevention !== "creatureTypeProtection"
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection possession attempt requires scoped possession prevention.",
    );
  }
  return {
    tag: "resolved",
    state: input.state,
    snapshot: snapshotBattle(input.state),
  };
}
