import { Match } from "effect";

import type { BattleCreatureState } from "#/battle-machine-types.ts";
import { isIncapacitated as isBattleCreatureIncapacitated } from "#/battle-machine-creature.ts";
import type { DndContext } from "#/machine-types.ts";
import { canCastSpells, isIncapacitated } from "#/machine-queries.ts";
import { compileProjectedExecutable } from "#/projected-compiler.ts";
import type { ProjectedExecutableAction } from "#/projected-executable.ts";
import {
  interpretProjectedAction,
  type ProjectedAmountResolution,
  type ProjectedInterpreterActor,
  type ProjectedTargetResolution,
} from "#/projected-mechanic-interpreter.ts";
import {
  actionCostParts,
  canUseProjectedAction,
  describeProjectedAction,
  interpretationHealOutcome,
  selfOnlyRuntime,
  type ProjectedAvailabilityState,
  type ProjectedPoolCost,
  type ProjectedQuotaCost,
} from "#/projected-action-bridge-helpers.ts";
import { getSpellRecordStrict } from "#/features/spell-registry.ts";
import { proficiencyBonus, spellId, type SpellName } from "#/types.ts";
import type {
  ClassFeatureRecord,
  SpellRecord,
} from "../../prototype-content-surface/src/surface/types.ts";
import acidSplashSurface from "../../prototype-content-surface/content/acid_splash.json";
import actionSurgeSurface from "../../prototype-content-surface/content/fighter_action_surge_l2.json";
import secondWindSurface from "../../prototype-content-surface/content/fighter_second_wind.json";

const ACID_SPLASH_SURFACE = acidSplashSurface as unknown as SpellRecord;
const SECOND_WIND_SURFACE = secondWindSurface as unknown as ClassFeatureRecord;
const ACTION_SURGE_SURFACE = actionSurgeSurface as unknown as ClassFeatureRecord;

const SECOND_WIND_PROJECTED_ACTION = compileProjectedExecutable(SECOND_WIND_SURFACE);
const ACTION_SURGE_PROJECTED_ACTION = compileProjectedExecutable(ACTION_SURGE_SURFACE);

export type ProjectedPreparedSpellRuntime = {
  readonly targetIds: ReadonlyArray<string>;
  readonly saveOutcomes: ReadonlyArray<
    ProjectedTargetResolution<"fail" | "success">
  >;
  readonly amounts: ReadonlyArray<ProjectedAmountResolution>;
};

function projectedPreparedSpellAction(
  spellName: SpellName,
): ProjectedExecutableAction | null {
  return Match.value(spellName).pipe(
    Match.when("acid_splash", () => compileProjectedExecutable(ACID_SPLASH_SURFACE)),
    Match.orElse(() => null),
  );
}

function projectedCharacterLevel(context: DndContext): number {
  return Object.values(context.classStates).reduce(
    (total, entry) => total + (entry?.level ?? 0),
    0,
  );
}

function projectedSpellSaveDc(context: DndContext): number | null {
  const characterLevel = projectedCharacterLevel(context);
  if (characterLevel <= 0) return null;
  // EPT8 only validates caller-supplied save/damage resolutions against the
  // projected action graph. The current creature context does not yet own all
  // spellcasting-ability modifiers for every caster path, so the bridge uses a
  // proficiency-only save DC placeholder until the owned spellcasting surface
  // widens in the later parity tasks.
  return 8 + proficiencyBonus(characterLevel);
}

function projectedActorFromCreatureContext(
  context: DndContext,
): ProjectedInterpreterActor {
  return {
    actorId: context.selfId ?? "self",
    characterLevel: projectedCharacterLevel(context),
    fighterLevel: context.classStates.fighter?.level ?? 0,
    spellSaveDc: projectedSpellSaveDc(context),
  };
}

function projectedActorFromBattleCreature(
  actorId: string,
  actor: BattleCreatureState,
): ProjectedInterpreterActor {
  return {
    actorId,
    characterLevel: Math.max(actor.fighterLevel, 1),
    fighterLevel: actor.fighterLevel,
    spellSaveDc: null,
  };
}

function projectedCreatureAvailabilityState(
  context: DndContext,
): ProjectedAvailabilityState {
  return {
    fighterLevel: context.classStates.fighter?.level ?? 0,
    secondWindCharges: context.classStates.fighter?.secondWindCharges ?? 0,
    actionSurgeCharges: context.classStates.fighter?.actionSurgeCharges ?? 0,
    actionSurgeUsedThisTurn:
      context.classStates.fighter?.actionSurgeUsedThisTurn ?? false,
    bonusActionUsed: context.bonusActionUsed,
    actionsRemaining: context.actionsRemaining,
  };
}

function projectedBattleFighterAvailabilityState(
  actor: BattleCreatureState,
): ProjectedAvailabilityState {
  return {
    fighterLevel: actor.fighterLevel,
    secondWindCharges: 0,
    actionSurgeCharges: actor.actionSurgeCharges,
    actionSurgeUsedThisTurn: actor.actionSurgeUsedThisTurn,
    bonusActionUsed: actor.bonusActionUsed,
    actionsRemaining: actor.actionsRemaining,
  };
}

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
    projectedActorFromCreatureContext(context),
  );
}

export function projectedSecondWindSummary(context: DndContext): string {
  return describeProjectedAction(
    SECOND_WIND_PROJECTED_ACTION,
    projectedActorFromCreatureContext(context),
  );
}

export function projectedActionSurgeSummary(context: DndContext): string {
  return describeProjectedAction(
    ACTION_SURGE_PROJECTED_ACTION,
    projectedActorFromCreatureContext(context),
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
  const spell = getSpellRecordStrict(spellName);
  const isCantrip = spell.level === 0;
  if (
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
  spellName: SpellName,
  runtime: ProjectedPreparedSpellRuntime,
): {
  readonly event: {
    readonly type: "CAST_PREPARED_SPELL";
    readonly spellName: SpellName;
  };
  readonly outcome: string;
} {
  const action = projectedPreparedSpellAction(spellName);
  if (action == null) {
    throw new Error(
      `No projected prepared spell action exists for ${spellName}.`,
    );
  }
  const actor = projectedActorFromCreatureContext(context);
  if (actor.spellSaveDc == null) {
    throw new Error(
      `${spellName}: spell save DC is unavailable in this context.`,
    );
  }
  interpretProjectedAction(action, actor, {
    resolveAttachment: () => runtime.targetIds,
    resolveSaveGate: () => runtime.saveOutcomes,
    resolveAmount: () => runtime.amounts,
  });
  return {
    event: { type: "CAST_PREPARED_SPELL", spellName },
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
  const actor = projectedActorFromCreatureContext(context);
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
  const actor = projectedActorFromCreatureContext(context);
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
