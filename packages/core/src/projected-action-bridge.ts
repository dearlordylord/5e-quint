import type { BattleCreatureState } from "#/battle-machine-types.ts";
import { isIncapacitated as isBattleCreatureIncapacitated } from "#/battle-machine-creature.ts";
import type { DndContext } from "#/machine-types.ts";
import { canCastSpells, isIncapacitated } from "#/machine-queries.ts";
import {
  ACTION_SURGE_PROJECTED_ACTION,
  projectedActorFromBattleCreature,
  projectedActorFromCreatureContext,
  projectedBattleFighterAvailabilityState,
  projectedCreatureAvailabilityState,
  projectedNonSpellActorFromCreatureContext,
  projectedPreparedSpellAction,
  projectedPreparedSpellDefinition,
  SECOND_WIND_PROJECTED_ACTION,
} from "#/projected-action-context.ts";
import { interpretProjectedAction } from "#/projected-mechanic-interpreter.ts";
import {
  actionCostParts,
  canUseProjectedAction,
  describeProjectedAction,
  interpretationHealOutcome,
  selfOnlyRuntime,
  type ProjectedPoolCost,
  type ProjectedQuotaCost,
} from "#/projected-action-bridge-helpers.ts";
import {
  interpretProjectedPreparedSpellAnswer,
  promptForProjectedPreparedSpell,
  type ProjectedPreparedSpellPrompt,
  type ProjectedPreparedSpellPromptAnswer,
} from "#/projected-action-bridge-prepared-spell.ts";
import { spellId, type SpellName } from "#/types.ts";

// Bridge from the legacy projected-executable seam into the current
// available-actions / machine runtime. This file is a bounded compatibility
// layer, not the target architecture for migrated correction-pattern flows.

export function projectedPreparedSpellSummary(
  context: DndContext,
  spellName: SpellName,
): string {
  const action = projectedPreparedSpellAction(spellName);
  if (action == null) {
    throw new Error(
      `No projected prepared spell action exists for ${spellName}.`,
    );
  }
  return describeProjectedAction(
    action,
    projectedActorFromCreatureContext(context, spellName),
  );
}

export function discoverProjectedPreparedSpellPrompt(
  context: DndContext,
  spellName: SpellName,
): ProjectedPreparedSpellPrompt | null {
  const action = projectedPreparedSpellAction(spellName);
  if (action == null || !canUseProjectedPreparedSpell(context, spellName)) {
    return null;
  }
  return promptForProjectedPreparedSpell(
    spellName,
    action,
    projectedActorFromCreatureContext(context, spellName),
  );
}

export function projectedSecondWindSummary(context: DndContext): string {
  return describeProjectedAction(
    SECOND_WIND_PROJECTED_ACTION,
    projectedNonSpellActorFromCreatureContext(context),
  );
}

export function projectedActionSurgeSummary(context: DndContext): string {
  return describeProjectedAction(
    ACTION_SURGE_PROJECTED_ACTION,
    projectedNonSpellActorFromCreatureContext(context),
  );
}

export function projectedBattleActionSurgeSummary(
  actorId: string,
  actor: BattleCreatureState,
): string {
  return describeProjectedAction(
    ACTION_SURGE_PROJECTED_ACTION,
    projectedActorFromBattleCreature(actorId, actor),
  );
}

export function projectedPreparedSpellCost(
  spellName: SpellName,
): ReadonlyArray<ProjectedPoolCost | ProjectedQuotaCost> {
  const action = projectedPreparedSpellAction(spellName);
  return action == null ? [] : actionCostParts(action);
}

export function projectedSecondWindCost(): ReadonlyArray<
  ProjectedPoolCost | ProjectedQuotaCost
> {
  return actionCostParts(SECOND_WIND_PROJECTED_ACTION);
}

export function projectedActionSurgeCost(): ReadonlyArray<
  ProjectedPoolCost | ProjectedQuotaCost
> {
  return actionCostParts(ACTION_SURGE_PROJECTED_ACTION);
}

export function canUseProjectedPreparedSpell(
  context: DndContext,
  spellName: SpellName,
): boolean {
  const action = projectedPreparedSpellAction(spellName);
  if (action == null) return false;
  if (!context.preparedSpells.has(spellId(spellName))) return false;
  const spell = projectedPreparedSpellDefinition(spellName);
  const isCantrip = spell.level === 0;
  if (
    // These are runtime spellcasting gates owned by creature context rather than
    // by the projected executable itself.
    context.hp <= 0 ||
    isIncapacitated(context) ||
    context.slotExpendedThisTurn ||
    !canCastSpells(context)
  ) {
    return false;
  }
  if (context.classStates.barbarian?.raging ?? false) return false;
  if (
    action.activationCost === "PACAction" &&
    (context.actionSurgeActionPending ||
      (!isCantrip && context.bonusActionSpellCast))
  ) {
    return false;
  }
  if (
    action.activationCost === "PACBonusAction" &&
    context.nonCantripActionSpellCast
  ) {
    return false;
  }
  return canUseProjectedAction(
    action,
    projectedCreatureAvailabilityState(context),
  );
}

export function canUseProjectedSecondWind(context: DndContext): boolean {
  if (context.hp <= 0 || isIncapacitated(context)) return false;
  return canUseProjectedAction(
    SECOND_WIND_PROJECTED_ACTION,
    projectedCreatureAvailabilityState(context),
  );
}

export function canUseProjectedActionSurge(context: DndContext): boolean {
  if (context.hp <= 0 || isIncapacitated(context)) return false;
  return canUseProjectedAction(
    ACTION_SURGE_PROJECTED_ACTION,
    projectedCreatureAvailabilityState(context),
  );
}

export function canUseProjectedBattleActionSurge(
  actor: BattleCreatureState,
): boolean {
  if (isBattleCreatureIncapacitated(actor)) return false;
  return canUseProjectedAction(
    ACTION_SURGE_PROJECTED_ACTION,
    projectedBattleFighterAvailabilityState(actor),
  );
}

export function finalizeProjectedPreparedSpell(
  context: DndContext,
  prompt: ProjectedPreparedSpellPrompt,
  answer: ProjectedPreparedSpellPromptAnswer,
): {
  readonly event: {
    // This bounded bridge currently finalizes through the prepared-spell event
    // lane only. Broader spell-access/event naming remains a core follow-up.
    readonly type: "CAST_PREPARED_SPELL";
    readonly spellName: SpellName;
  };
  readonly outcome: string;
} {
  const action = projectedPreparedSpellAction(prompt.spellName);
  if (action == null) {
    throw new Error(
      `No projected prepared spell action exists for ${prompt.spellName}.`,
    );
  }
  const actor = projectedActorFromCreatureContext(context, prompt.spellName);

  if (actor.spellSaveDc == null) {
    throw new Error(
      `${prompt.spellName}: spell save DC is unavailable in this context.`,
    );
  }
  interpretProjectedPreparedSpellAnswer({ action, actor, prompt, answer });
  return {
    event: { type: "CAST_PREPARED_SPELL", spellName: prompt.spellName },
    outcome: describeProjectedAction(action, actor),
  };
}

export function finalizeProjectedSecondWind(
  context: DndContext,
  d10Roll: number,
): {
  readonly event: {
    readonly type: "USE_SECOND_WIND";
    readonly d10Roll: number;
  };
  readonly outcome: string;
} {
  if (d10Roll < 1 || d10Roll > 10) {
    throw new Error(
      `Second Wind d10 roll must be between 1 and 10, received ${d10Roll}.`,
    );
  }
  const actor = projectedNonSpellActorFromCreatureContext(context);
  const interpretation = interpretProjectedAction(
    SECOND_WIND_PROJECTED_ACTION,
    actor,
    selfOnlyRuntime(actor.actorId, ({ targetIds, amount }) =>
      targetIds.map((targetId) => ({
        targetId,
        total: d10Roll + amount.flat,
        rolledTotal: d10Roll,
      })),
    ),
  );
  return {
    event: { type: "USE_SECOND_WIND", d10Roll },
    outcome: interpretationHealOutcome(interpretation),
  };
}

export function finalizeProjectedActionSurge(context: DndContext): {
  readonly event: { readonly type: "USE_ACTION_SURGE" };
  readonly outcome: string;
} {
  const actor = projectedNonSpellActorFromCreatureContext(context);
  interpretProjectedAction(
    ACTION_SURGE_PROJECTED_ACTION,
    actor,
    selfOnlyRuntime(actor.actorId, () => []),
  );
  return {
    event: { type: "USE_ACTION_SURGE" },
    outcome: describeProjectedAction(ACTION_SURGE_PROJECTED_ACTION, actor),
  };
}
