import { type ActorRefFrom, type SnapshotFrom } from "xstate";

import { battleMachine } from "@dnd/core/battle-machine.ts";
import type {
  BattleContext,
  CreatureId,
} from "@dnd/core/battle-machine-types.ts";
import { encodeDndSnapshot } from "@dnd/core/context-encoding.ts";
import { creatureMachine } from "@dnd/core/machine.ts";

export type DndActor = ActorRefFrom<typeof creatureMachine>;
export type BattleActor = ActorRefFrom<typeof battleMachine>;
export type SupportedActionHost =
  | { readonly scope: "creature"; readonly actor: DndActor }
  | { readonly scope: "battle"; readonly actor: BattleActor };

type DndSnapshot = SnapshotFrom<typeof creatureMachine>;
type BattleSnapshot = SnapshotFrom<typeof battleMachine>;

export function jsonContent(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

export function errorContent(message: string, details?: unknown) {
  return {
    ...jsonContent(
      details == null ? { error: message } : { error: message, details },
    ),
    isError: true as const,
  };
}

export function snapshotFingerprint(snapshot: DndSnapshot): string {
  return JSON.stringify(encodeDndSnapshot(snapshot));
}

export function battleSnapshotUnchanged(
  before: BattleSnapshot,
  after: BattleSnapshot,
): boolean {
  return (
    before.context === after.context &&
    JSON.stringify(before.value) === JSON.stringify(after.value)
  );
}

function battlePhase(context: BattleContext) {
  if (context.awaitCtx !== null) return "awaitingReaction" as const;
  if (context.aoeCtx !== null) return "resolvingAoE" as const;
  if (context.movementCtx !== null) return "resolvingMovement" as const;
  if (context.laCtx !== null) return "awaitingLegendaryAction" as const;
  if (context.readyCtx !== null) return "awaitingReadiedAction" as const;
  return "activeTurn" as const;
}

function currentTurnCreatureId(context: BattleContext): CreatureId | null {
  return context.initiative[context.turnIndex] ?? null;
}

export function encodeBattleRuntimeState(snapshot: BattleSnapshot) {
  return {
    scope: "battle" as const,
    machineState: snapshot.value,
    tags: [...snapshot.tags].sort(),
    round: snapshot.context.round,
    turnIndex: snapshot.context.turnIndex,
    activeCreatureId: currentTurnCreatureId(snapshot.context),
    initiative: snapshot.context.initiative,
    creatureIds: [...snapshot.context.creatures.keys()].sort(),
    phase: battlePhase(snapshot.context),
    awaitingReaction: snapshot.context.awaitCtx !== null,
    resolvingAoE: snapshot.context.aoeCtx !== null,
    resolvingMovement: snapshot.context.movementCtx !== null,
    awaitingLegendaryAction: snapshot.context.laCtx !== null,
    awaitingReadiedAction: snapshot.context.readyCtx !== null,
  };
}
