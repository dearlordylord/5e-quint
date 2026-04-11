/**
 * Battle-level XState machine — mirrors battle.qnt's full state.
 * Three states: idle → running → ended. All events handled in `running`,
 * routed by child states under `running` with `always` transitions.
 *
 * Creatures are stored as flat context (Map<CreatureId, BattleCreatureState>),
 * NOT as spawned creatureMachine child actors. D&D combat requires atomic
 * cross-creature updates (attacker + target in one assign) and sequential
 * phase coordination (attack → reaction → damage → after-damage) that would
 * become async choreography with actors. The creature machine's logic is
 * reused via pure functions in battle-machine-creature.ts.
 */
import { assign, setup, type SnapshotFrom } from "xstate";

import {
  battleAfterDamageDecline,
  battleAfterDamageReactiveEffect,
  battleAfterDamageRetaliation,
  battleAfterDamageSpellReaction,
  battleAttack,
  battleResolveDmgReaction,
  battleResolveHitReaction,
} from "#/battle-machine-actions-attack.ts";
import {
  battleMove,
  battleMovementOADecline,
  battleMovementOAAttack,
  battleStandFromProne,
} from "#/battle-machine-actions-movement.ts";
import {
  battleCastAoE,
  battleCastConcentrationSpell,
  battleCastSaveSpell,
  battleConcentrationCheck,
  battleResolveAoETarget,
  battleResolveCounterspell,
  battleResolveSaveFailedReaction,
} from "#/battle-machine-actions-spell.ts";
import {
  battleActionSurge,
  battleAddCreature,
  battleBonusDisengage,
  battleBonusHide,
  battleDash,
  battleDeclareReckless,
  battleDisengage,
  battleDodge,
  battleEndTurn,
  battleEscapeGrapple,
  battleEnterRage,
  battleGrapple,
  battleHeal,
  battleHelpAttack,
  battleHide,
  battleInit,
  battleLegendaryAttack,
  battleLegendaryPass,
  battleOffHandAttack,
  battleReady,
  battleReadyPass,
  battleReadyRelease,
  battleReadySpell,
  battleReadySpellRelease,
  battleSearch,
  battleReleaseGrapple,
  battleStartTurn,
} from "#/battle-machine-actions-turn.ts";
import type { BattleContext, BattleEvent } from "#/battle-machine-types.ts";

// Action functions take a narrowed event (BattleActionArgs<T>), but XState's assign()
// expects the full BattleEvent union. Two casts required: input (contravariance) and
// output (XState phantom type). Safe: the machine's on: { EVENT: actions } mapping
// guarantees the correct event at runtime, and each action is typed at its definition site.
type WideActionFn = (args: {
  context: BattleContext;
  event: BattleEvent;
}) => Partial<BattleContext>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const narrow = (fn: (args: any) => Partial<BattleContext>) =>
  assign(fn as WideActionFn) as any;

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const MT = {
  context: {} as BattleContext,
  events: {} as BattleEvent,
};
/* eslint-enable @typescript-eslint/consistent-type-assertions */

const INITIAL_CONTEXT: BattleContext = {
  creatures: new Map(),
  initiative: [],
  turnIndex: 0,
  round: 0,
  turnStarted: false,
  awaitCtx: null,
  aoeCtx: null,
  movementCtx: null,
  laCtx: null,
  readyCtx: null,
  spellStack: [],
  helpTargets: [],
};

// Phase-routing guards: `always` transitions on each child state check nullable
// context fields and route to the correct state. Actions set the relevant field;
// the machine follows via `always`.
export const battleMachine = setup({
  types: MT,
  guards: {
    hasAwaitCtx: ({ context }: { context: BattleContext }) =>
      context.awaitCtx !== null,
    hasAoeCtx: ({ context }: { context: BattleContext }) =>
      context.aoeCtx !== null,
    hasMovementCtx: ({ context }: { context: BattleContext }) =>
      context.movementCtx !== null,
    hasLaCtx: ({ context }: { context: BattleContext }) =>
      context.laCtx !== null,
    hasReadyCtx: ({ context }: { context: BattleContext }) =>
      context.readyCtx !== null,
    noAwaitCtx: ({ context }: { context: BattleContext }) =>
      context.awaitCtx === null,
    noAoeCtx: ({ context }: { context: BattleContext }) =>
      context.aoeCtx === null,
    noMovementCtx: ({ context }: { context: BattleContext }) =>
      context.movementCtx === null,
    noLaCtx: ({ context }: { context: BattleContext }) =>
      context.laCtx === null,
    noReadyCtx: ({ context }: { context: BattleContext }) =>
      context.readyCtx === null,
  },
  actions: {
    battleInit: narrow(battleInit),
    battleAddCreature: narrow(battleAddCreature),
    battleStartTurn: narrow(battleStartTurn),
    battleAttack: narrow(battleAttack),
    battleResolveHitReaction: narrow(battleResolveHitReaction),
    battleResolveDmgReaction: narrow(battleResolveDmgReaction),
    battleAfterDamageDecline: narrow(battleAfterDamageDecline),
    battleAfterDamageSpellReaction: narrow(battleAfterDamageSpellReaction),
    battleAfterDamageReactiveEffect: narrow(battleAfterDamageReactiveEffect),
    battleAfterDamageRetaliation: narrow(battleAfterDamageRetaliation),
    battleCastSaveSpell: narrow(battleCastSaveSpell),
    battleResolveCounterspell: narrow(battleResolveCounterspell),
    battleResolveSaveFailedReaction: narrow(battleResolveSaveFailedReaction),
    battleCastConcentrationSpell: narrow(battleCastConcentrationSpell),
    battleConcentrationCheck: narrow(battleConcentrationCheck),
    battleCastAoE: narrow(battleCastAoE),
    battleResolveAoETarget: narrow(battleResolveAoETarget),
    battleMove: narrow(battleMove),
    battleMovementOADecline: narrow(battleMovementOADecline),
    battleMovementOAAttack: narrow(battleMovementOAAttack),
    battleEndTurn: narrow(battleEndTurn),
    battleLegendaryPass: narrow(battleLegendaryPass),
    battleLegendaryAttack: narrow(battleLegendaryAttack),
    battleHeal: narrow(battleHeal),
    battleHelpAttack: narrow(battleHelpAttack),
    battleHide: narrow(battleHide),
    battleBonusHide: narrow(battleBonusHide),
    battleSearch: narrow(battleSearch),
    battleOffHandAttack: narrow(battleOffHandAttack),
    battleDash: narrow(battleDash),
    battleDisengage: narrow(battleDisengage),
    battleBonusDisengage: narrow(battleBonusDisengage),
    battleDodge: narrow(battleDodge),
    battleStandFromProne: narrow(battleStandFromProne),
    battleGrapple: narrow(battleGrapple),
    battleReleaseGrapple: narrow(battleReleaseGrapple),
    battleEscapeGrapple: narrow(battleEscapeGrapple),
    battleActionSurge: narrow(battleActionSurge),
    battleEnterRage: narrow(battleEnterRage),
    battleDeclareReckless: narrow(battleDeclareReckless),
    battleReady: narrow(battleReady),
    battleReadySpell: narrow(battleReadySpell),
    battleReadyPass: narrow(battleReadyPass),
    battleReadyRelease: narrow(battleReadyRelease),
    battleReadySpellRelease: narrow(battleReadySpellRelease),
  },
}).createMachine({
  id: "battle",
  initial: "idle",
  context: INITIAL_CONTEXT,
  states: {
    idle: {
      on: {
        BATTLE_INIT: { target: "running", actions: "battleInit" },
      },
    },
    running: {
      initial: "activeTurn",
      states: {
        activeTurn: {
          tags: ["playerTurn"],
          always: [
            { guard: "hasAwaitCtx", target: "awaitingReaction" },
            { guard: "hasAoeCtx", target: "resolvingAoE" },
            { guard: "hasMovementCtx", target: "resolvingMovement" },
            { guard: "hasLaCtx", target: "awaitingLegendaryAction" },
            { guard: "hasReadyCtx", target: "awaitingReadiedAction" },
          ],
          on: {
            BATTLE_ADD_CREATURE: { actions: "battleAddCreature" },
            BATTLE_START_TURN: { actions: "battleStartTurn" },
            BATTLE_ATTACK: { actions: "battleAttack" },
            BATTLE_CAST_SAVE_SPELL: { actions: "battleCastSaveSpell" },
            BATTLE_CAST_CONCENTRATION_SPELL: {
              actions: "battleCastConcentrationSpell",
            },
            BATTLE_CONCENTRATION_CHECK: { actions: "battleConcentrationCheck" },
            BATTLE_CAST_AOE: { actions: "battleCastAoE" },
            BATTLE_MOVE: { actions: "battleMove" },
            BATTLE_END_TURN: { actions: "battleEndTurn" },
            BATTLE_HEAL: { actions: "battleHeal" },
            BATTLE_HELP_ATTACK: { actions: "battleHelpAttack" },
            BATTLE_HIDE: { actions: "battleHide" },
            BATTLE_BONUS_HIDE: { actions: "battleBonusHide" },
            BATTLE_SEARCH: { actions: "battleSearch" },
            BATTLE_DASH: { actions: "battleDash" },
            BATTLE_DISENGAGE: { actions: "battleDisengage" },
            BATTLE_BONUS_DISENGAGE: { actions: "battleBonusDisengage" },
            BATTLE_DODGE: { actions: "battleDodge" },
            BATTLE_STAND_FROM_PRONE: { actions: "battleStandFromProne" },
            BATTLE_OFF_HAND_ATTACK: { actions: "battleOffHandAttack" },
            BATTLE_GRAPPLE: { actions: "battleGrapple" },
            BATTLE_RELEASE_GRAPPLE: { actions: "battleReleaseGrapple" },
            BATTLE_ESCAPE_GRAPPLE: { actions: "battleEscapeGrapple" },
            BATTLE_ACTION_SURGE: { actions: "battleActionSurge" },
            BATTLE_ENTER_RAGE: { actions: "battleEnterRage" },
            BATTLE_DECLARE_RECKLESS: { actions: "battleDeclareReckless" },
            BATTLE_READY: { actions: "battleReady" },
            BATTLE_READY_SPELL: { actions: "battleReadySpell" },
          },
        },
        awaitingReaction: {
          tags: ["reactionWindow"],
          always: [{ guard: "noAwaitCtx", target: "activeTurn" }],
          on: {
            BATTLE_RESOLVE_HIT_REACTION: {
              actions: "battleResolveHitReaction",
            },
            BATTLE_RESOLVE_DMG_REACTION: {
              actions: "battleResolveDmgReaction",
            },
            BATTLE_AFTER_DAMAGE_DECLINE: {
              actions: "battleAfterDamageDecline",
            },
            BATTLE_AFTER_DAMAGE_SPELL_REACTION: {
              actions: "battleAfterDamageSpellReaction",
            },
            BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT: {
              actions: "battleAfterDamageReactiveEffect",
            },
            BATTLE_AFTER_DAMAGE_RETALIATION: {
              actions: "battleAfterDamageRetaliation",
            },
            BATTLE_RESOLVE_COUNTERSPELL: {
              actions: "battleResolveCounterspell",
            },
            BATTLE_RESOLVE_SAVE_FAILED_REACTION: {
              actions: "battleResolveSaveFailedReaction",
            },
          },
        },
        resolvingAoE: {
          tags: ["resolving"],
          always: [{ guard: "noAoeCtx", target: "activeTurn" }],
          on: {
            BATTLE_RESOLVE_AOE_TARGET: { actions: "battleResolveAoETarget" },
          },
        },
        resolvingMovement: {
          tags: ["resolving"],
          always: [{ guard: "noMovementCtx", target: "activeTurn" }],
          on: {
            BATTLE_MOVEMENT_OA_DECLINE: {
              actions: "battleMovementOADecline",
            },
            BATTLE_MOVEMENT_OA_ATTACK: { actions: "battleMovementOAAttack" },
          },
        },
        awaitingLegendaryAction: {
          tags: ["legendaryWindow"],
          always: [{ guard: "noLaCtx", target: "activeTurn" }],
          on: {
            BATTLE_LEGENDARY_PASS: { actions: "battleLegendaryPass" },
            BATTLE_LEGENDARY_ATTACK: { actions: "battleLegendaryAttack" },
          },
        },
        awaitingReadiedAction: {
          tags: ["readyWindow"],
          always: [{ guard: "noReadyCtx", target: "activeTurn" }],
          on: {
            BATTLE_READY_PASS: { actions: "battleReadyPass" },
            BATTLE_READY_RELEASE: { actions: "battleReadyRelease" },
            BATTLE_READY_SPELL_RELEASE: { actions: "battleReadySpellRelease" },
          },
        },
      },
    },
    ended: {
      type: "final",
    },
  },
});

export type BattleSnapshot = SnapshotFrom<typeof battleMachine>;
