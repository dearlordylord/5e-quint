// Runtime consumption of Slow active-effect penalties that are admitted from
// typed Surface facts by the Slow spell procedure profile.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE

import { optionalProperty } from "../optional-property.ts";
import { enableActionOrBonusActionExclusion } from "@dnd/shared-algebras/action-economy-algebra";
import type {
  ActionSpellBattleResolutionInput,
  BattleCreatureState,
  BattleExecutableSpellInvocation,
  BattleFill,
  BattleResolutionResult,
  BattleState,
  BattleTurnResources,
  BonusActionDashSpellBattleResolutionInput,
  BonusActionSpellBattleResolutionInput,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import {
  saveGatedTurnConstraintBundleEffects,
  turnConstraintSomaticSpellFailureOutcomeHole,
} from "./save-gated-turn-constraint-facts.ts";
import type { SpellMetamagicApplicationFact } from "./metamagic-support.ts";
export { turnConstraintSomaticSpellFailureOutcomeHole } from "./save-gated-turn-constraint-facts.ts";

type SaveGatedSomaticSpellFailureSubject =
  | ActionSpellBattleResolutionInput["subject"]
  | BonusActionSpellBattleResolutionInput["subject"]
  | BonusActionDashSpellBattleResolutionInput["subject"];

export type BattleFillAfterTurnConstraintSomaticSpellFailureOutcome = Exclude<
  BattleFill,
  { readonly kind: "turnConstraintSomaticSpellFailureOutcome" }
>;

type SlowSomaticSpellFailureResolution =
  | {
      readonly tag: "continue";
      readonly fills: readonly BattleFillAfterTurnConstraintSomaticSpellFailureOutcome[];
    }
  | BattleResolutionResult;

export function combatantHasSaveGatedTurnConstraintBundle(
  combatant: BattleCreatureState | undefined,
): boolean {
  return saveGatedTurnConstraintBundleEffects(combatant).length > 0;
}

export function slowActionOrBonusActionTurnResources(
  resources: BattleTurnResources,
  actor: BattleCreatureState | undefined,
): BattleTurnResources {
  return combatantHasSaveGatedTurnConstraintBundle(actor)
    ? enableActionOrBonusActionExclusion(resources)
    : resources;
}

export function resolveSlowSomaticSpellFailure(input: {
  readonly state: BattleState;
  readonly castingState: BattleState;
  readonly subject: SaveGatedSomaticSpellFailureSubject;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly fills: readonly BattleFill[];
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): SlowSomaticSpellFailureResolution {
  const hole = turnConstraintSomaticSpellFailureOutcomeHole(input);
  const fills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "turnConstraintSomaticSpellFailureOutcome" }
    > => fill.kind === "turnConstraintSomaticSpellFailureOutcome",
  );
  const remainingFills = fillsAfterTurnConstraintSomaticSpellFailureOutcome(
    input.fills,
  );
  if (hole === null) {
    return fills.length === 0
      ? { tag: "continue", fills: remainingFills }
      : invalidResult(
          input.state,
          "invalidFill",
          "turn-hindering effect Somatic spell failure fills are valid only for slowed spell casts with an effective Somatic component.",
        );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "turn-hindering effect Somatic spell failure outcome was filled twice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const fill = fills[0];
  if (fill === undefined) {
    return needsHolesResult(input.castingState, input.subject, [hole]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "turn-hindering effect Somatic spell failure fill must use the selected turn-hindering effect chance hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return fill.value.spellFailed
    ? spendSpellCastResources({
        state: input.castingState,
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.state,
        startConcentration: false,
        ...optionalProperty("actionCostOverride", input.actionCostOverride),
        ...optionalProperty(
          "metamagicApplications",
          input.metamagicApplications,
        ),
      })
    : { tag: "continue", fills: remainingFills };
}

export function fillsAfterTurnConstraintSomaticSpellFailureOutcome(
  fills: readonly BattleFill[],
): readonly BattleFillAfterTurnConstraintSomaticSpellFailureOutcome[] {
  return fills.filter(
    (fill): fill is BattleFillAfterTurnConstraintSomaticSpellFailureOutcome =>
      fill.kind !== "turnConstraintSomaticSpellFailureOutcome",
  );
}
