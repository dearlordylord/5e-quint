// Runtime consumption of Slow active-effect penalties that are admitted from
// typed Surface facts by the Slow spell procedure profile.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE

import { enableActionOrBonusActionExclusion } from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  ActionSpellBattleResolutionInput,
  BattleActiveEffect,
  BattleCreatureState,
  BattleFill,
  BattleResolutionResult,
  BattleSlowSomaticSpellFailureOutcomeHole,
  BattleState,
  BattleTurnResources,
  BonusActionDashSpellBattleResolutionInput,
  BonusActionSpellBattleResolutionInput,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { spellId, type CombatantId } from "../identity.ts";
import { SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT } from "./domain-constants.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import type { SpellMetamagicApplicationFact } from "./metamagic-support.ts";
import { subtleSpellComponentProjectionForApplications } from "./metamagic-support.ts";
import { invalidResult } from "./result-helpers.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";

type SlowActivePenaltiesEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "slowActivePenalties" }
>;

type SlowSomaticSpellFailureSubject =
  | ActionSpellBattleResolutionInput["subject"]
  | BonusActionSpellBattleResolutionInput["subject"]
  | BonusActionDashSpellBattleResolutionInput["subject"];

type SlowSomaticSpellFailureResolution =
  | { readonly tag: "continue"; readonly fills: readonly BattleFill[] }
  | BattleResolutionResult;

export function combatantHasSlowActivePenalties(
  combatant: BattleCreatureState | undefined,
): boolean {
  return slowActivePenaltiesEffects(combatant).length > 0;
}

export function slowActionOrBonusActionTurnResources(
  resources: BattleTurnResources,
  actor: BattleCreatureState | undefined,
): BattleTurnResources {
  return combatantHasSlowActivePenalties(actor)
    ? enableActionOrBonusActionExclusion(resources)
    : resources;
}

export function slowSomaticSpellFailureOutcomeHole(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): BattleSlowSomaticSpellFailureOutcomeHole | null {
  const effects = slowActivePenaltiesEffects(input.state.combatants.get(input.actorId));
  if (
    effects.length === 0 ||
    !spellInvocationRequiresEffectiveSomaticComponent(
      input.metamagicApplications === undefined
        ? { invocation: input.invocation }
        : {
            invocation: input.invocation,
            metamagicApplications: input.metamagicApplications,
          },
    )
  ) {
    return null;
  }
  const key = [
    "battle:slow-somatic-spell-failure",
    input.actorId,
    input.invocation.spell.id,
  ]
    .map(String)
    .join(":");
  return {
    holeInstanceKey: holeInstanceKey(key),
    holeId: holeId(key),
    kind: "slowSomaticSpellFailureOutcome",
    label: "Slow Somatic spell failure chance",
    actorId: input.actorId,
    spellId: spellId(input.invocation.spell.id),
    failurePercent: SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
    activeEffectSources: effects.map((effect) => ({
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
    })),
  };
}

export function resolveSlowSomaticSpellFailure(input: {
  readonly state: BattleState;
  readonly castingState: BattleState;
  readonly subject: SlowSomaticSpellFailureSubject;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly fills: readonly BattleFill[];
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): SlowSomaticSpellFailureResolution {
  const hole = slowSomaticSpellFailureOutcomeHole(input);
  const fills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "slowSomaticSpellFailureOutcome" }
    > => fill.kind === "slowSomaticSpellFailureOutcome",
  );
  if (hole === null) {
    return fills.length === 0
      ? { tag: "continue", fills: input.fills }
      : invalidResult(
          input.state,
          "invalidFill",
          "Slow Somatic spell failure fills are valid only for slowed spell casts with an effective Somatic component.",
        );
  }
  if (fills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Slow Somatic spell failure outcome was filled twice.",
    );
  }
  const fill = fills[0];
  if (fill === undefined) {
    return needsHolesResult(input.castingState, input.subject, [hole]);
  }
  if (fill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Slow Somatic spell failure fill must use the selected Slow chance hole.",
    );
  }
  return fill.value.spellFailed
    ? spendSpellCastResources({
        state: input.castingState,
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.state,
        startConcentration: false,
        ...(input.actionCostOverride === undefined
          ? {}
          : { actionCostOverride: input.actionCostOverride }),
        ...(input.metamagicApplications === undefined
          ? {}
          : { metamagicApplications: input.metamagicApplications }),
      })
    : { tag: "continue", fills: input.fills };
}

function slowActivePenaltiesEffects(
  combatant: BattleCreatureState | undefined,
): readonly SlowActivePenaltiesEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is SlowActivePenaltiesEffect =>
          effect.kind === "slowActivePenalties",
      );
}

function spellInvocationRequiresEffectiveSomaticComponent(input: {
  readonly invocation: SupportedSpellInvocation;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): boolean {
  if (
    !spellInvocationIsSpellcasting(input.invocation) ||
    !input.invocation.spell.mechanics.components.s
  ) {
    return false;
  }
  const projection = subtleSpellComponentProjectionForApplications(
    input.metamagicApplications,
  );
  return (
    projection?.suppressedComponents.some(
      (component) => component.kind === "somatic",
    ) !== true
  );
}
