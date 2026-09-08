import * as Result from "effect/Result";
import type {
  BattleResolutionResult,
  BattleSpellSavingThrowOutcomeValue,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { spellSavingThrowOutcomeHole } from "./spells-damage-fills.ts";
import { resolveSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";
import { spellTargetIsKnownWilling } from "./spells-targeting.ts";
import { maybeOpenConfiguredSpellCastReactionWindow } from "./spell-active-effect-resolution.ts";

type WillingTargetSaveInvocation = Parameters<
  typeof spellSavingThrowOutcomeHole
>[2];

export type WillingTargetSaveGate =
  | { readonly tag: "affected" }
  | { readonly tag: "unaffected" }
  | {
      readonly tag: "resolutionRequired";
      readonly resolution: BattleResolutionResult;
    };

export function openReactionThenResolveWillingTargetSave(input: {
  readonly resolution: Omit<
    Parameters<
      typeof maybeOpenConfiguredSpellCastReactionWindow
    >[0]["resolution"],
    "invocation"
  > & { readonly invocation: WillingTargetSaveInvocation };
  readonly targetId: CombatantId;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue | undefined;
  readonly willingTargetSaveMessage: string;
}):
  | BattleResolutionResult
  | { readonly tag: "saveGate"; readonly saveGate: WillingTargetSaveGate } {
  const reactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input.resolution,
    targetIds: [input.targetId],
  });
  return (
    reactionWindow ?? {
      tag: "saveGate",
      saveGate: resolveWillingTargetSaveGate({
        state: input.resolution.input.state,
        subject: input.resolution.input.subject,
        actorId: input.resolution.actorId,
        targetId: input.targetId,
        invocation: input.resolution.invocation,
        targetSpatialFacts: input.targetSpatialFacts,
        savingThrowOutcomes: input.savingThrowOutcomes,
        willingTargetSaveMessage: input.willingTargetSaveMessage,
      }),
    }
  );
}

/**
 * Resolves the save protocol shared by spells that affect a willing target
 * automatically and allow an unwilling target to avoid the effect on a save.
 */
export function resolveWillingTargetSaveGate(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly invocation: WillingTargetSaveInvocation;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue | undefined;
  readonly willingTargetSaveMessage: string;
}): WillingTargetSaveGate {
  const targetIsWilling = spellTargetIsKnownWilling(
    input.actorId,
    input.targetId,
    input.invocation,
    input.targetSpatialFacts,
  );
  if (targetIsWilling) {
    return input.savingThrowOutcomes === undefined
      ? { tag: "affected" }
      : {
          tag: "resolutionRequired",
          resolution: invalidResult(
            input.state,
            "invalidFill",
            input.willingTargetSaveMessage,
          ),
        };
  }
  if (input.savingThrowOutcomes === undefined) {
    return {
      tag: "resolutionRequired",
      resolution: needsHolesResult(input.state, input.subject, [
        spellSavingThrowOutcomeHole(
          input.state,
          input.actorId,
          input.invocation,
        ),
      ]),
    };
  }
  const validation = resolveSavingThrowOutcomes({
    value: input.savingThrowOutcomes,
    invocation: input.invocation,
    state: input.state,
    actorId: input.actorId,
    targetId: undefined,
    targetListIds: [input.targetId],
  });
  if (Result.isFailure(validation)) {
    return {
      tag: "resolutionRequired",
      resolution: invalidResult(input.state, "invalidFill", validation.failure),
    };
  }
  return validation.success.outcomes[0]?.succeeded === true
    ? { tag: "unaffected" }
    : { tag: "affected" };
}
