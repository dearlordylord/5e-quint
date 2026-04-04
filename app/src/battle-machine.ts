/**
 * Battle-level XState machine — mirrors battle.qnt's full state.
 * Three states: idle → running → ended. All events handled in `running`,
 * routed by context.phase guards.
 *
 * Creatures are stored as flat context (Map<CreatureId, BattleCreatureState>),
 * NOT as spawned dndMachine child actors. D&D combat requires atomic
 * cross-creature updates (attacker + target in one assign) and sequential
 * phase coordination (attack → reaction → damage → after-damage) that would
 * become async choreography with actors. The creature machine's logic is
 * reused via pure functions in battle-machine-creature.ts.
 */
import { assign, setup, type SnapshotFrom } from "xstate"

import {
  battleAfterDamageHellishRebuke,
  battleAfterDamagePass,
  battleAfterDamageRetaliation,
  battleAttack,
  battleResolveDmgReaction,
  battleResolveHitReaction
} from "#/battle-machine-actions-attack.ts"
import { battleMove, battleMovementOAAttack, battleMovementOAPass } from "#/battle-machine-actions-movement.ts"
import {
  battleCastAoE,
  battleCastConcentrationSpell,
  battleCastSaveSpell,
  battleConcentrationCheck,
  battleResolveAoETarget,
  battleResolveCounterspell,
  battleResolveSaveFailedReaction
} from "#/battle-machine-actions-spell.ts"
import {
  battleEndTurn,
  battleHeal,
  battleInit,
  battleLegendaryAttack,
  battleLegendaryPass,
  battleStartTurn
} from "#/battle-machine-actions-turn.ts"
import type { BattleContext, BattleEvent } from "#/battle-machine-types.ts"
import { BP_ACTIVE_TURN } from "#/battle-machine-types.ts"

// Action functions take a narrowed event (BattleActionArgs<T>), but XState's assign()
// expects the full BattleEvent union. Two casts required: input (contravariance) and
// output (XState phantom type). Safe: the machine's on: { EVENT: actions } mapping
// guarantees the correct event at runtime, and each action is typed at its definition site.
type WideActionFn = (args: { context: BattleContext; event: BattleEvent }) => Partial<BattleContext>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const narrow = (fn: (args: any) => Partial<BattleContext>) => assign(fn as WideActionFn) as any

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const MT = {
  context: {} as BattleContext,
  events: {} as BattleEvent
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */

const INITIAL_CONTEXT: BattleContext = {
  creatures: new Map(),
  initiative: [],
  turnIndex: 0,
  round: 0,
  turnStarted: false,
  phase: BP_ACTIVE_TURN,
  spellStack: []
}

export const battleMachine = setup({
  types: MT,
  actions: {
    battleInit: narrow(battleInit),
    battleStartTurn: narrow(battleStartTurn),
    battleAttack: narrow(battleAttack),
    battleResolveHitReaction: narrow(battleResolveHitReaction),
    battleResolveDmgReaction: narrow(battleResolveDmgReaction),
    battleAfterDamagePass: narrow(battleAfterDamagePass),
    battleAfterDamageHellishRebuke: narrow(battleAfterDamageHellishRebuke),
    battleAfterDamageRetaliation: narrow(battleAfterDamageRetaliation),
    battleCastSaveSpell: narrow(battleCastSaveSpell),
    battleResolveCounterspell: narrow(battleResolveCounterspell),
    battleResolveSaveFailedReaction: narrow(battleResolveSaveFailedReaction),
    battleCastConcentrationSpell: narrow(battleCastConcentrationSpell),
    battleConcentrationCheck: narrow(battleConcentrationCheck),
    battleCastAoE: narrow(battleCastAoE),
    battleResolveAoETarget: narrow(battleResolveAoETarget),
    battleMove: narrow(battleMove),
    battleMovementOAPass: narrow(battleMovementOAPass),
    battleMovementOAAttack: narrow(battleMovementOAAttack),
    battleEndTurn: narrow(battleEndTurn),
    battleLegendaryPass: narrow(battleLegendaryPass),
    battleLegendaryAttack: narrow(battleLegendaryAttack),
    battleHeal: narrow(battleHeal)
  }
}).createMachine({
  id: "battle",
  initial: "idle",
  context: INITIAL_CONTEXT,
  states: {
    idle: {
      on: {
        BATTLE_INIT: { target: "running", actions: "battleInit" }
      }
    },
    running: {
      on: {
        BATTLE_START_TURN: { actions: "battleStartTurn" },
        BATTLE_ATTACK: { actions: "battleAttack" },
        BATTLE_RESOLVE_HIT_REACTION: { actions: "battleResolveHitReaction" },
        BATTLE_RESOLVE_DMG_REACTION: { actions: "battleResolveDmgReaction" },
        BATTLE_AFTER_DAMAGE_PASS: { actions: "battleAfterDamagePass" },
        BATTLE_AFTER_DAMAGE_HELLISH_REBUKE: { actions: "battleAfterDamageHellishRebuke" },
        BATTLE_AFTER_DAMAGE_RETALIATION: { actions: "battleAfterDamageRetaliation" },
        BATTLE_CAST_SAVE_SPELL: { actions: "battleCastSaveSpell" },
        BATTLE_RESOLVE_COUNTERSPELL: { actions: "battleResolveCounterspell" },
        BATTLE_RESOLVE_SAVE_FAILED_REACTION: { actions: "battleResolveSaveFailedReaction" },
        BATTLE_CAST_CONCENTRATION_SPELL: { actions: "battleCastConcentrationSpell" },
        BATTLE_CONCENTRATION_CHECK: { actions: "battleConcentrationCheck" },
        BATTLE_CAST_AOE: { actions: "battleCastAoE" },
        BATTLE_RESOLVE_AOE_TARGET: { actions: "battleResolveAoETarget" },
        BATTLE_MOVE: { actions: "battleMove" },
        BATTLE_MOVEMENT_OA_PASS: { actions: "battleMovementOAPass" },
        BATTLE_MOVEMENT_OA_ATTACK: { actions: "battleMovementOAAttack" },
        BATTLE_END_TURN: { actions: "battleEndTurn" },
        BATTLE_LEGENDARY_PASS: { actions: "battleLegendaryPass" },
        BATTLE_LEGENDARY_ATTACK: { actions: "battleLegendaryAttack" },
        BATTLE_HEAL: { actions: "battleHeal" }
      }
    },
    ended: {
      type: "final"
    }
  }
})

export type BattleSnapshot = SnapshotFrom<typeof battleMachine>
