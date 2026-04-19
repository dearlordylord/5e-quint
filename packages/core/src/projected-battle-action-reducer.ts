import { Match } from "effect";

import { activeId, setCreature } from "#/battle-machine-helpers.ts";
import type {
  BattleContext,
  BattleCreatureState,
} from "#/battle-machine-types.ts";
import { isIncapacitated } from "#/battle-machine-creature.ts";
import { ACTION_SURGE_PROJECTED_ACTION } from "#/projected-action-records.ts";
import {
  interpretProjectedAction,
  type ProjectedInterpreterActor,
} from "#/projected-mechanic-interpreter.ts";
import { byTag } from "#/battle-machine-helpers.ts";
import type { ProjectedInterpreterTransition } from "#/projected-mechanic-interpreter-types.ts";

function actorForBattleCreature(
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

function reduceBattleActionSurgeTransitions(
  actor: BattleCreatureState,
  transitions: ReadonlyArray<ProjectedInterpreterTransition>,
): BattleCreatureState | null {
  let next = actor;
  for (const transition of transitions) {
    const reduced = Match.value(transition).pipe(
      byTag("PITSpendActivation", () => next),
      byTag("PITSpendResourceUse", () =>
        next.actionSurgeCharges <= 0
          ? null
          : {
              ...next,
              actionSurgeCharges: next.actionSurgeCharges - 1,
            },
      ),
      byTag("PITMarkUsageLimit", () =>
        next.actionSurgeUsedThisTurn
          ? null
          : {
              ...next,
              actionSurgeUsedThisTurn: true,
            },
      ),
      byTag("PITDirect", () => next),
      byTag("PITGrantExtraAction", () => ({
        ...next,
        actionsRemaining: next.actionsRemaining + 1,
        actionSurgeActionPending: true,
      })),
      Match.orElse(() => next),
    );
    if (reduced == null) {
      return null;
    }
    next = reduced;
  }
  return next;
}

export function applyProjectedBattleActionSurge(
  context: BattleContext,
): Partial<BattleContext> {
  if (!context.turnStarted) return {};
  const id = activeId(context);
  const actor = context.creatures.get(id);
  if (
    actor == null ||
    isIncapacitated(actor) ||
    actor.actionSurgeCharges <= 0 ||
    actor.actionSurgeUsedThisTurn
  ) {
    return {};
  }
  const updated = reduceBattleActionSurgeTransitions(
    actor,
    interpretProjectedAction(
      ACTION_SURGE_PROJECTED_ACTION,
      actorForBattleCreature(id, actor),
      {
        resolveAttachment: () => [id],
        resolveAttackRoll: () => [],
        resolveSaveGate: () => [],
        resolveAmount: () => [],
      },
    ).transitions,
  );
  return updated == null
    ? {}
    : { creatures: setCreature(context.creatures, id, updated) };
}
