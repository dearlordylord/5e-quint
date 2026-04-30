import { type ActorRefFrom, type SnapshotFrom } from "xstate";

import { battleMachine } from "@dnd/core/battle-machine.ts";
import type {
  BattleContext,
  BattleCreatureState,
  CreatureId,
} from "@dnd/core/battle-machine-types.ts";
import { encodeDndSnapshot } from "@dnd/core/context-encoding.ts";
import { creatureMachine } from "@dnd/core/machine.ts";
import {
  currentActing,
  initiativeOrder,
} from "@dnd/shared-algebras/initiative-algebra";
import {
  getMonsterStatBlockByStateId,
  statBlockAbilityName,
} from "@dnd/core/monster-catalog.ts";

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

function battleInitiative(context: BattleContext) {
  return context.initiative as BattleContext["initiative"] | null;
}

function battlePhase(context: BattleContext) {
  const initiative = battleInitiative(context);
  if (context.awaitCtx !== null) return "awaitingReaction" as const;
  if (context.aoeCtx !== null) return "resolvingAoE" as const;
  if (context.movementCtx !== null) return "resolvingMovement" as const;
  if (context.laCtx !== null) return "awaitingLegendaryAction" as const;
  if (context.readyCtx !== null) return "awaitingReadiedAction" as const;
  if (initiative != null && !context.turnStarted) {
    return "awaitingStartTurn" as const;
  }
  return "activeTurn" as const;
}

function nextRequiredAction(context: BattleContext) {
  if (battleInitiative(context) == null) return null;
  if (!context.turnStarted && context.awaitCtx === null) {
    return {
      tool: "execute_control_command" as const,
      scope: "battle" as const,
      type: "BATTLE_START_TURN" as const,
      note: "Battle initiative is set and the next turn has not begun. Issue BATTLE_START_TURN with explicit runtime facts to open the action window.",
    };
  }
  return null;
}

function currentTurnCreatureId(context: BattleContext): CreatureId | null {
  const initiative = battleInitiative(context);
  return initiative == null ? null : currentActing(initiative);
}

function encodeMonsterControlState(context: BattleContext) {
  return Object.fromEntries(
    [...context.creatures.entries()]
      .flatMap(([id, creature]) => {
        const statBlock = getMonsterStatBlockByStateId(
          creature.monsterStatBlockId,
        );
        if (creature.creatureKind !== "Monster" || statBlock == null) return [];
        return [
          [
            id,
            {
              statBlockId: creature.monsterStatBlockId,
              legendaryActions: statBlock.legendaryActions.map((ability) => ({
                id: ability.id,
                name: ability.name,
                cost: ability.kind === "legendaryAction" ? ability.cost : null,
                remainingUses: creature.legendaryActionsRemaining,
                selected:
                  context.selectedMonsterCommand?.type ===
                    "USE_LEGENDARY_ACTION" &&
                  context.selectedMonsterCommand.monsterId === id &&
                  context.selectedMonsterCommand.abilityId === ability.id,
              })),
              rechargeAbilities: Object.entries(creature.rechargeAvailable).map(
                ([abilityId, available]) => ({
                  id: abilityId,
                  name:
                    statBlock.rechargeAbilities[abilityId]?.name ??
                    statBlockAbilityName(statBlock, abilityId) ??
                    abilityId,
                  available,
                  selected:
                    context.selectedMonsterCommand?.type ===
                      "USE_RECHARGE_ABILITY" &&
                    context.selectedMonsterCommand.monsterId === id &&
                    context.selectedMonsterCommand.abilityId === abilityId,
                }),
              ),
              dailyAbilities: Object.entries(creature.dailyUsesRemaining).map(
                ([abilityId, remainingUses]) => ({
                  id: abilityId,
                  name: statBlockAbilityName(statBlock, abilityId) ?? abilityId,
                  remainingUses,
                  selected:
                    context.selectedMonsterCommand?.type ===
                      "USE_DAILY_ABILITY" &&
                    context.selectedMonsterCommand.monsterId === id &&
                    context.selectedMonsterCommand.abilityId === abilityId,
                }),
              ),
            },
          ] as const,
        ];
      })
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

const CREATURE_CONDITION_KEYS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const satisfies ReadonlyArray<keyof BattleCreatureState>;

function activeConditions(
  creature: BattleCreatureState,
): ReadonlyArray<string> {
  return CREATURE_CONDITION_KEYS.filter((key) => creature[key] === true);
}

function encodeCreatureSummary(creature: BattleCreatureState) {
  return {
    hp: creature.hp,
    maxHp: creature.maxHp,
    maxHpReduction: creature.maxHpReduction,
    tempHp: creature.tempHp,
    dead: creature.dead,
    stable: creature.stable,
    exhaustion: creature.exhaustion,
    conditions: activeConditions(creature),
    deathSaves: creature.deathSaves,
    creatureKind: creature.creatureKind,
  };
}

function encodeCreatureSummaries(context: BattleContext) {
  return Object.fromEntries(
    [...context.creatures.entries()]
      .map(([id, creature]) => [id, encodeCreatureSummary(creature)] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function encodeBattleRuntimeState(snapshot: BattleSnapshot) {
  const monsterControl = encodeMonsterControlState(snapshot.context);
  const nextAction = nextRequiredAction(snapshot.context);
  const initiative = battleInitiative(snapshot.context);
  return {
    scope: "battle" as const,
    machineState: snapshot.value,
    tags: [...snapshot.tags].sort(),
    round: initiative?.round ?? 0,
    turnIndex: initiative?.alreadyActed.length ?? 0,
    turnStarted: snapshot.context.turnStarted,
    activeCreatureId: currentTurnCreatureId(snapshot.context),
    initiative: initiative == null ? [] : initiativeOrder(initiative),
    creatureIds: [...snapshot.context.creatures.keys()].sort(),
    creatures: encodeCreatureSummaries(snapshot.context),
    phase: battlePhase(snapshot.context),
    awaitingReaction: snapshot.context.awaitCtx !== null,
    resolvingAoE: snapshot.context.aoeCtx !== null,
    resolvingMovement: snapshot.context.movementCtx !== null,
    awaitingLegendaryAction: snapshot.context.laCtx !== null,
    awaitingReadiedAction: snapshot.context.readyCtx !== null,
    ...(nextAction != null ? { nextRequiredAction: nextAction } : {}),
    ...(Object.keys(monsterControl).length > 0 ? { monsterControl } : {}),
  };
}
