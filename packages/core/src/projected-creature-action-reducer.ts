import { assert } from "#/assert.ts";
import type { DndContext } from "#/machine-types.ts";
import { updateClass, effectiveMaxHp } from "#/machine-helpers.ts";
import type {
  ProjectedActivationCost,
  ProjectedExecutableAction,
  ProjectedResourceGate,
  ProjectedResourcePool,
  ProjectedUsageLimit,
} from "#/projected-executable.ts";
import type { ProjectedInterpreterTransition } from "#/projected-mechanic-interpreter-types.ts";
import {
  interpretProjectedAction,
  type ProjectedExecutionRuntime,
  type ProjectedInterpreterActor,
} from "#/projected-mechanic-interpreter.ts";
import {
  compileProjectedExecutable,
} from "#/projected-compiler.ts";
import { canUseProjectedPreparedSpell } from "#/projected-action-bridge.ts";
import { isIncapacitated } from "#/machine-queries.ts";
import { hp, resourceCount } from "#/types.ts";
import { decodeClassFeatureRecordSync } from "@dnd/prototype-content-surface/surface/schema";
import { Match } from "effect";
import { byTag } from "#/battle-machine-helpers.ts";
import actionSurgeSurface from "../../prototype-content-surface/content/fighter_action_surge_l2.json";
import secondWindSurface from "../../prototype-content-surface/content/fighter_second_wind.json";

const SECOND_WIND_PROJECTED_ACTION = compileProjectedExecutable(
  decodeClassFeatureRecordSync(secondWindSurface),
);
const ACTION_SURGE_PROJECTED_ACTION = compileProjectedExecutable(
  decodeClassFeatureRecordSync(actionSurgeSurface),
);

interface ReducerAcc {
  readonly context: DndContext;
  readonly patch: Partial<DndContext>;
}

function merged(acc: ReducerAcc, extra: Partial<DndContext>): ReducerAcc {
  return {
    context: { ...acc.context, ...extra },
    patch: { ...acc.patch, ...extra },
  };
}

function mergedFighter(
  acc: ReducerAcc,
  patch: Partial<NonNullable<DndContext["classStates"]["fighter"]>>,
): ReducerAcc {
  return merged(acc, updateClass(acc.context, "fighter", patch));
}

function reduceSpendActivation(
  acc: ReducerAcc,
  cost: Exclude<ProjectedActivationCost, "PACFree">,
): ReducerAcc | null {
  return Match.value(cost).pipe(
    Match.when("PACAction", () =>
      acc.context.actionsRemaining > 0
        ? merged(acc, { actionsRemaining: acc.context.actionsRemaining - 1 })
        : null,
    ),
    Match.when("PACBonusAction", () =>
      acc.context.bonusActionUsed
        ? null
        : merged(acc, { bonusActionUsed: true }),
    ),
    Match.exhaustive,
  );
}

function fighterPoolCharges(
  fighter: NonNullable<DndContext["classStates"]["fighter"]>,
  pool: ProjectedResourcePool,
): number {
  return Match.value(pool).pipe(
    Match.when("PRPSecondWind", () => fighter.secondWindCharges),
    Match.when("PRPActionSurge", () => fighter.actionSurgeCharges),
    Match.exhaustive,
  );
}

function reduceSpendResourceUse(
  acc: ReducerAcc,
  gate: Extract<ProjectedResourceGate, { readonly tag: "PRGUseCount" }>,
): ReducerAcc | null {
  const fighter = acc.context.classStates.fighter;
  if (fighter == null) return null;
  const current = fighterPoolCharges(fighter, gate.value.pool);
  if (current <= 0) return null;
  const decremented = resourceCount(current - 1);
  return Match.value(gate.value.pool).pipe(
    Match.when("PRPSecondWind", () =>
      mergedFighter(acc, { secondWindCharges: decremented }),
    ),
    Match.when("PRPActionSurge", () =>
      mergedFighter(acc, { actionSurgeCharges: decremented }),
    ),
    Match.exhaustive,
  );
}

function reduceMarkUsageLimit(
  acc: ReducerAcc,
  usageLimit: Exclude<ProjectedUsageLimit, "PULNone">,
  gate: ProjectedResourceGate,
): ReducerAcc | null {
  if (gate.tag !== "PRGUseCount") return acc;
  return Match.value(usageLimit).pipe(
    Match.when("PULOncePerTurn", () => {
      const fighter = acc.context.classStates.fighter;
      if (fighter == null) return null;
      return Match.value(gate.value.pool).pipe(
        Match.when("PRPActionSurge", () =>
          fighter.actionSurgeUsedThisTurn
            ? null
            : mergedFighter(acc, { actionSurgeUsedThisTurn: true }),
        ),
        Match.when("PRPSecondWind", () => acc),
        Match.exhaustive,
      );
    }),
    Match.exhaustive,
  );
}

function reduceHealHp(acc: ReducerAcc, total: number): ReducerAcc {
  const c = acc.context;
  return merged(acc, {
    hp: hp(Math.min(c.hp + total, effectiveMaxHp(c.maxHp, c.maxHpReduction))),
  });
}

function reduceGrantExtraAction(acc: ReducerAcc): ReducerAcc {
  return merged(acc, {
    actionsRemaining: acc.context.actionsRemaining + 1,
    actionSurgeActionPending: true,
  });
}

function reduceTransition(
  acc: ReducerAcc,
  transition: ProjectedInterpreterTransition,
  gate: ProjectedResourceGate,
): ReducerAcc | null {
  return Match.value(transition).pipe(
    byTag("PITSpendActivation", ({ value }) =>
      reduceSpendActivation(acc, value.cost),
    ),
    byTag("PITSpendResourceUse", ({ value }) =>
      reduceSpendResourceUse(acc, value.gate),
    ),
    byTag("PITMarkUsageLimit", ({ value }) =>
      reduceMarkUsageLimit(acc, value.usageLimit, gate),
    ),
    byTag("PITDirect", () => acc),
    byTag("PITSaveGate", () => acc),
    byTag("PITDamage", () => acc),
    byTag("PITHealHp", ({ value }) => reduceHealHp(acc, value.total)),
    byTag("PITGrantExtraAction", () => reduceGrantExtraAction(acc)),
    Match.exhaustive,
  );
}

function reduceProjectedTransitions(
  context: DndContext,
  transitions: ReadonlyArray<ProjectedInterpreterTransition>,
  gate: ProjectedResourceGate,
): Partial<DndContext> | null {
  let acc: ReducerAcc = { context, patch: {} };
  for (const transition of transitions) {
    const next = reduceTransition(acc, transition, gate);
    if (next == null) return null;
    acc = next;
  }
  return acc.patch;
}

function actorForContext(context: DndContext): ProjectedInterpreterActor {
  let characterLevel = 0;
  for (const state of Object.values(context.classStates)) {
    if (state) characterLevel += state.level;
  }
  return {
    actorId: context.selfId ?? "self",
    characterLevel,
    fighterLevel: context.classStates.fighter?.level ?? 0,
    spellSaveDc: 8,
  };
}

function applyProjectedAction(
  action: ProjectedExecutableAction,
  actor: ProjectedInterpreterActor,
  runtime: ProjectedExecutionRuntime,
  context: DndContext,
  guardMessage: string,
): Partial<DndContext> {
  const interpretation = interpretProjectedAction(action, actor, runtime);
  const patch = reduceProjectedTransitions(
    context,
    interpretation.transitions,
    action.resourceGate,
  );
  assert(patch != null, guardMessage);
  return patch;
}

function selfRuntime(
  actor: ProjectedInterpreterActor,
  resolveAmount: ProjectedExecutionRuntime["resolveAmount"],
): ProjectedExecutionRuntime {
  return {
    resolveAttachment: ({ attachment }) =>
      attachment.tag === "PEASelf" ? [actor.actorId] : [],
    resolveSaveGate: () => [],
    resolveAmount,
  };
}

export function projectedActionLegalForContext(
  action: ProjectedExecutableAction,
  context: DndContext,
): boolean {
  if (isIncapacitated(context)) return false;
  return Match.value(action.tag).pipe(
    Match.when("PEASaveGateDamage", () =>
      canUseProjectedPreparedSpell(
        context,
        action.source.unitId as Parameters<typeof canUseProjectedPreparedSpell>[1],
      ),
    ),
    Match.when("PEADirectHealHp", () => {
      const actor = actorForContext(context);
      const patch = reduceProjectedTransitions(
        context,
        interpretProjectedAction(
          action,
          actor,
          selfRuntime(actor, () => []),
        ).transitions,
        action.resourceGate,
      );
      return patch != null;
    }),
    Match.when("PEADirectGrantExtraAction", () => {
      const actor = actorForContext(context);
      const patch = reduceProjectedTransitions(
        context,
        interpretProjectedAction(
          action,
          actor,
          selfRuntime(actor, () => []),
        ).transitions,
        action.resourceGate,
      );
      return patch != null;
    }),
    Match.exhaustive,
  );
}

export function applyProjectedSecondWind(
  context: DndContext,
  d10Roll: number,
): Partial<DndContext> {
  const actor = actorForContext(context);
  return applyProjectedAction(
    SECOND_WIND_PROJECTED_ACTION,
    actor,
    selfRuntime(actor, ({ targetIds, amount }) =>
      targetIds.map((targetId) => ({
        targetId,
        total: d10Roll + amount.flat,
        rolledTotal: d10Roll,
      })),
    ),
    context,
    "guard: canSecondWind should have prevented this",
  );
}

export function applyProjectedActionSurge(
  context: DndContext,
): Partial<DndContext> {
  const actor = actorForContext(context);
  return applyProjectedAction(
    ACTION_SURGE_PROJECTED_ACTION,
    actor,
    selfRuntime(actor, () => []),
    context,
    "guard: canActionSurge should have prevented this",
  );
}
