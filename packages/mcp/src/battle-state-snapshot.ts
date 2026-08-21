import {
  requiredInitiativeRollModeForCombatant,
  snapshotBattle,
  type BattleState,
} from "@dnd/battle-runtime";
import { Match } from "effect";

import type {
  McpBattleState,
  McpBattleStateSnapshot,
  McpBattleSessionSnapshot,
} from "./session-store.ts";

function battleSessionSnapshot(state: BattleState): McpBattleSessionSnapshot {
  return {
    tag: "activeBattle",
    battleId: state.battleId,
    currentActorId: snapshotBattle(state).currentActorId,
  };
}

export function battleStateSnapshot<T extends McpBattleState["tag"]>(
  state: Extract<McpBattleState, { readonly tag: T }>,
): Extract<McpBattleStateSnapshot, { readonly tag: T }>;
export function battleStateSnapshot(
  state: McpBattleState,
): McpBattleStateSnapshot {
  return Match.value(state).pipe(
    Match.when({ tag: "none" }, (matched) => matched),
    Match.when({ tag: "activeBattle" }, (matched) =>
      battleSessionSnapshot(matched.session.state),
    ),
    Match.when({ tag: "initialInitiativeSetup" }, (matched) => {
      const battle = matched.setup.state;
      const snapshot = snapshotBattle(battle);
      return {
        tag: "initialInitiativeSetup" as const,
        battleId: battle.battleId,
        combatants: snapshot.turnOrder.flatMap((combatantId) => {
          const combatant = battle.combatants.get(combatantId);
          if (combatant === undefined) return [];
          return [
            {
              combatantId,
              initiative: combatant.initiative,
              rollMode:
                requiredInitiativeRollModeForCombatant(battle, combatantId) ??
                "normal",
            },
          ];
        }),
      };
    }),
    Match.exhaustive,
  );
}
