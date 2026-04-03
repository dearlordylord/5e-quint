/**
 * Battle-level XState machine — mirrors battle.qnt's full state.
 * Three states: idle → running → ended. All events handled in `running`,
 * routed by context.phase guards.
 */
import type { SnapshotFrom } from "xstate"
import { assign, setup } from "xstate"

import {
  battleAfterDamageHellishRebuke,
  battleAfterDamagePass,
  battleAfterDamageRetaliation,
  battleAttack,
  battleInit,
  battleResolveDmgReaction,
  battleResolveHitReaction,
  battleStartTurn
} from "#/battle-machine-actions.ts"
import {
  battleCastAoE,
  battleCastConcentrationSpell,
  battleCastSaveSpell,
  battleConcentrationCheck,
  battleEndTurn,
  battleHeal,
  battleLegendaryAttack,
  battleLegendaryPass,
  battleMove,
  battleMovementOAAttack,
  battleMovementOAPass,
  battleResolveAoETarget,
  battleResolveCounterspell,
  battleResolveSaveFailedReaction
} from "#/battle-machine-actions2.ts"
import type { BattleContext, BattleEvent } from "#/battle-machine-types.ts"
import { BP_ACTIVE_TURN } from "#/battle-machine-types.ts"

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
    battleInit: assign(battleInit),
    battleStartTurn: assign(battleStartTurn),
    battleAttack: assign(battleAttack),
    battleResolveHitReaction: assign(battleResolveHitReaction),
    battleResolveDmgReaction: assign(battleResolveDmgReaction),
    battleAfterDamagePass: assign(battleAfterDamagePass),
    battleAfterDamageHellishRebuke: assign(battleAfterDamageHellishRebuke),
    battleAfterDamageRetaliation: assign(battleAfterDamageRetaliation),
    battleCastSaveSpell: assign(battleCastSaveSpell),
    battleResolveCounterspell: assign(battleResolveCounterspell),
    battleResolveSaveFailedReaction: assign(battleResolveSaveFailedReaction),
    battleCastConcentrationSpell: assign(battleCastConcentrationSpell),
    battleConcentrationCheck: assign(battleConcentrationCheck),
    battleCastAoE: assign(battleCastAoE),
    battleResolveAoETarget: assign(battleResolveAoETarget),
    battleMove: assign(battleMove),
    battleMovementOAPass: assign(battleMovementOAPass),
    battleMovementOAAttack: assign(battleMovementOAAttack),
    battleEndTurn: assign(battleEndTurn),
    battleLegendaryPass: assign(battleLegendaryPass),
    battleLegendaryAttack: assign(battleLegendaryAttack),
    battleHeal: assign(battleHeal)
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
