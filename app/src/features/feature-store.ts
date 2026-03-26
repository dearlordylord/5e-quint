import {
  pCheckRageMaintenance,
  pEndRage,
  pEnterRage,
  pExtendRageWithBA,
  pMarkAttackOrForcedSave,
  rageMaxCharges,
  type RageState
} from "#/features/class-barbarian.ts"
import {
  actionSurgeMaxCharges,
  fighterLongRest,
  fighterShortRest,
  indomitableLongRest,
  indomitableMaxCharges,
  secondWindMaxCharges
} from "#/features/class-fighter.ts"
import { pExpendFocus, pInitFocusPool, pRestoreFocus, pRestoreFocusLongRest } from "#/features/class-monk.ts"
import { wholenessOfBodyMaxCharges } from "#/features/class-monk-features.ts"
import { layOnHandsPoolMax, paladinLongRest } from "#/features/class-paladin.ts"
import { reduceRogue } from "#/features/feature-store-rogue.ts"

export interface FeatureConfig {
  readonly className: string
  readonly level: number
  readonly berserkerLevel?: number
  readonly championLevel?: number
}

export interface FighterFeatureState {
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
  readonly indomitableCharges: number
  readonly indomitableMax: number
}

export interface BarbarianFeatureState {
  readonly raging: boolean
  readonly rageCharges: number
  readonly rageMaxCharges: number
  readonly rageTurnsRemaining: number
  readonly attackedOrForcedSaveThisTurn: boolean
  readonly rageExtendedWithBA: boolean
  readonly recklessThisTurn: boolean
  readonly frenzyUsedThisTurn: boolean
  readonly intimidatingPresenceUsed: boolean
  readonly relentlessRageTimesUsed: number
}

export interface MonkFeatureState {
  readonly focusPoints: number
  readonly focusMax: number
  readonly uncannyMetabolismUsed: boolean
  readonly wholenessOfBodyCharges: number
  readonly wholenessOfBodyMax: number
  readonly quiveringPalmActive: boolean
  readonly deflectAttacksUsedThisRound: boolean
}

export interface PaladinFeatureState {
  readonly layOnHandsPool: number
  readonly layOnHandsMax: number
  readonly smiteFreeUsed: boolean
  readonly faithfulSteedUsed: boolean
  readonly channelDivinityCharges: number
  readonly channelDivinityMax: number
}

export interface RogueFeatureState {
  readonly sneakAttackUsedThisTurn: boolean
  readonly steadyAimUsed: boolean
  readonly strokeOfLuckUsed: boolean
}

export interface FeatureState {
  readonly fighter?: FighterFeatureState
  readonly barbarian?: BarbarianFeatureState
  readonly monk?: MonkFeatureState
  readonly paladin?: PaladinFeatureState
  readonly rogue?: RogueFeatureState
}

export type FeatureAction =
  | { readonly type: "FIGHTER_USE_SECOND_WIND" }
  | { readonly type: "FIGHTER_USE_ACTION_SURGE" }
  | { readonly type: "FIGHTER_USE_TACTICAL_MIND" }
  | { readonly type: "FIGHTER_USE_INDOMITABLE" }
  | { readonly type: "BARBARIAN_ENTER_RAGE" }
  | { readonly type: "BARBARIAN_END_RAGE" }
  | { readonly type: "BARBARIAN_EXTEND_RAGE_BA" }
  | { readonly type: "BARBARIAN_MARK_ATTACK_OR_SAVE" }
  | { readonly type: "BARBARIAN_DECLARE_RECKLESS" }
  | { readonly type: "BERSERKER_APPLY_FRENZY" }
  | { readonly type: "BERSERKER_USE_RETALIATION" }
  | { readonly type: "BERSERKER_USE_INTIMIDATING_PRESENCE" }
  | { readonly type: "BARBARIAN_USE_RELENTLESS_RAGE" }
  | { readonly type: "MONK_EXPEND_FOCUS"; readonly cost: number }
  | {
      readonly type: "MONK_USE_UNCANNY_METABOLISM"
      readonly focusPoints: number
      readonly uncannyMetabolismUsed: boolean
    }
  | { readonly type: "MONK_USE_WHOLENESS_OF_BODY"; readonly chargesAfter: number }
  | { readonly type: "MONK_USE_QUIVERING_PALM" }
  | { readonly type: "MONK_TRIGGER_QUIVERING_PALM" }
  | { readonly type: "MONK_USE_SUPERIOR_DEFENSE" }
  | { readonly type: "MONK_USE_DISCIPLINED_SURVIVOR_REROLL" }
  | { readonly type: "MONK_USE_DEFLECT_ATTACKS" }
  | { readonly type: "MONK_USE_SLOW_FALL" }
  | { readonly type: "PALADIN_LAY_ON_HANDS"; readonly poolAfter: number }
  | { readonly type: "PALADIN_LAY_ON_HANDS_CURE"; readonly poolAfter: number }
  | { readonly type: "PALADIN_SMITE_FREE" }
  | { readonly type: "PALADIN_USE_FAITHFUL_STEED" }
  | { readonly type: "PALADIN_USE_ABJURE_FOES" }
  | { readonly type: "PALADIN_RESTORING_TOUCH"; readonly poolAfter: number }
  | { readonly type: "ROGUE_USE_CUNNING_ACTION" }
  | { readonly type: "ROGUE_USE_STEADY_AIM" }
  | { readonly type: "ROGUE_USE_SNEAK_ATTACK" }
  | { readonly type: "ROGUE_USE_STROKE_OF_LUCK" }
  | { readonly type: "NOTIFY_SHORT_REST" }
  | { readonly type: "NOTIFY_LONG_REST" }
  | { readonly type: "NOTIFY_START_TURN" }
  | { readonly type: "NOTIFY_END_TURN" }
  | { readonly type: "RESET" }

// SRD 5.2.1: Paladin Channel Divinity — 2 uses at L3, +1 at L11
const CHANNEL_DIVINITY_LEVEL = 3
const CHANNEL_DIVINITY_EXTRA_USE_LEVEL = 11

function channelDivinityMaxCharges(paladinLevel: number): number {
  if (paladinLevel < CHANNEL_DIVINITY_LEVEL) return 0
  if (paladinLevel >= CHANNEL_DIVINITY_EXTRA_USE_LEVEL) return 3
  return 2
}

function barbarianToRageState(b: BarbarianFeatureState): RageState {
  return {
    raging: b.raging,
    rageCharges: b.rageCharges,
    rageMaxCharges: b.rageMaxCharges,
    rageTurnsRemaining: b.rageTurnsRemaining,
    attackedOrForcedSaveThisTurn: b.attackedOrForcedSaveThisTurn,
    rageExtendedWithBA: b.rageExtendedWithBA,
    concentrationSpellId: ""
  }
}

function rageStateToBarbarianPatch(r: RageState, prev: BarbarianFeatureState): BarbarianFeatureState {
  return {
    raging: r.raging,
    rageCharges: r.rageCharges,
    rageMaxCharges: r.rageMaxCharges,
    rageTurnsRemaining: r.rageTurnsRemaining,
    attackedOrForcedSaveThisTurn: r.attackedOrForcedSaveThisTurn,
    rageExtendedWithBA: r.rageExtendedWithBA,
    recklessThisTurn: prev.recklessThisTurn,
    frenzyUsedThisTurn: prev.frenzyUsedThisTurn,
    intimidatingPresenceUsed: prev.intimidatingPresenceUsed,
    relentlessRageTimesUsed: prev.relentlessRageTimesUsed
  }
}

export function createInitialFeatureState(config: FeatureConfig): FeatureState {
  if (config.className === "fighter") {
    const swMax = secondWindMaxCharges(config.level)
    const asMax = actionSurgeMaxCharges(config.level)
    const indMax = indomitableMaxCharges(config.level)
    return {
      fighter: {
        secondWindCharges: swMax,
        secondWindMax: swMax,
        actionSurgeCharges: asMax,
        actionSurgeMax: asMax,
        actionSurgeUsedThisTurn: false,
        indomitableCharges: indMax,
        indomitableMax: indMax
      }
    }
  }
  if (config.className === "rogue") {
    return {
      rogue: {
        sneakAttackUsedThisTurn: false,
        steadyAimUsed: false,
        strokeOfLuckUsed: false
      }
    }
  }
  if (config.className === "barbarian") {
    const max = rageMaxCharges(config.level)
    return {
      barbarian: {
        raging: false,
        rageCharges: max,
        rageMaxCharges: max,
        rageTurnsRemaining: 0,
        attackedOrForcedSaveThisTurn: false,
        rageExtendedWithBA: false,
        recklessThisTurn: false,
        frenzyUsedThisTurn: false,
        intimidatingPresenceUsed: false,
        relentlessRageTimesUsed: 0
      }
    }
  }
  if (config.className === "monk") {
    const pool = pInitFocusPool(config.level)
    // TODO: wisMod should come from config; default to 1 for now (minimum 1 charge)
    const wobMax = wholenessOfBodyMaxCharges(0)
    return {
      monk: {
        focusPoints: pool.focusPoints,
        focusMax: pool.focusMax,
        uncannyMetabolismUsed: pool.uncannyMetabolismUsed,
        wholenessOfBodyCharges: wobMax,
        wholenessOfBodyMax: wobMax,
        quiveringPalmActive: false,
        deflectAttacksUsedThisRound: false
      }
    }
  }
  if (config.className === "paladin") {
    const max = layOnHandsPoolMax(config.level)
    const cdMax = channelDivinityMaxCharges(config.level)
    return {
      paladin: {
        layOnHandsPool: max,
        layOnHandsMax: max,
        smiteFreeUsed: false,
        faithfulSteedUsed: false,
        channelDivinityCharges: cdMax,
        channelDivinityMax: cdMax
      }
    }
  }
  return {}
}

function reduceFighter(state: FeatureState, action: FeatureAction, config: FeatureConfig): FeatureState {
  if (!state.fighter) return state
  const f = state.fighter

  switch (action.type) {
    case "FIGHTER_USE_SECOND_WIND":
    case "FIGHTER_USE_TACTICAL_MIND":
      return { ...state, fighter: { ...f, secondWindCharges: f.secondWindCharges - 1 } }

    case "FIGHTER_USE_ACTION_SURGE":
      return {
        ...state,
        fighter: { ...f, actionSurgeCharges: f.actionSurgeCharges - 1, actionSurgeUsedThisTurn: true }
      }

    case "FIGHTER_USE_INDOMITABLE":
      return { ...state, fighter: { ...f, indomitableCharges: f.indomitableCharges - 1 } }

    case "NOTIFY_SHORT_REST": {
      const rest = fighterShortRest({
        secondWindCharges: f.secondWindCharges,
        secondWindMax: f.secondWindMax,
        actionSurgeCharges: f.actionSurgeCharges,
        actionSurgeMax: f.actionSurgeMax
      })
      return {
        ...state,
        fighter: {
          ...f,
          secondWindCharges: rest.secondWindCharges,
          actionSurgeCharges: rest.actionSurgeCharges
        }
      }
    }

    case "NOTIFY_LONG_REST": {
      const rest = fighterLongRest({
        secondWindCharges: f.secondWindCharges,
        secondWindMax: f.secondWindMax,
        actionSurgeCharges: f.actionSurgeCharges,
        actionSurgeMax: f.actionSurgeMax
      })
      return {
        ...state,
        fighter: {
          ...f,
          secondWindCharges: rest.secondWindCharges,
          actionSurgeCharges: rest.actionSurgeCharges,
          indomitableCharges: indomitableLongRest(config.level)
        }
      }
    }

    case "NOTIFY_START_TURN":
      return { ...state, fighter: { ...f, actionSurgeUsedThisTurn: false } }

    default:
      return state
  }
}

function reduceBarbarian(state: FeatureState, action: FeatureAction, config: FeatureConfig): FeatureState {
  if (!state.barbarian) return state
  const b = state.barbarian
  const rageState = barbarianToRageState(b)

  switch (action.type) {
    case "BARBARIAN_ENTER_RAGE": {
      const next = pEnterRage(rageState)
      return { ...state, barbarian: rageStateToBarbarianPatch(next, b) }
    }

    case "BARBARIAN_END_RAGE": {
      const next = pEndRage(rageState)
      return { ...state, barbarian: rageStateToBarbarianPatch(next, b) }
    }

    case "BARBARIAN_EXTEND_RAGE_BA": {
      const next = pExtendRageWithBA(rageState)
      return { ...state, barbarian: rageStateToBarbarianPatch(next, b) }
    }

    case "BARBARIAN_MARK_ATTACK_OR_SAVE": {
      const next = pMarkAttackOrForcedSave(rageState)
      return { ...state, barbarian: rageStateToBarbarianPatch(next, b) }
    }

    case "BARBARIAN_DECLARE_RECKLESS":
      return { ...state, barbarian: { ...b, recklessThisTurn: true } }

    case "BERSERKER_APPLY_FRENZY":
      return { ...state, barbarian: { ...b, frenzyUsedThisTurn: true } }

    case "BERSERKER_USE_RETALIATION":
      return state // no store-side state change; machine event (USE_REACTION) handled by bridge

    case "BERSERKER_USE_INTIMIDATING_PRESENCE":
      return { ...state, barbarian: { ...b, intimidatingPresenceUsed: true } }

    case "BARBARIAN_USE_RELENTLESS_RAGE":
      return { ...state, barbarian: { ...b, relentlessRageTimesUsed: b.relentlessRageTimesUsed + 1 } }

    case "NOTIFY_START_TURN":
      return {
        ...state,
        barbarian: {
          ...b,
          recklessThisTurn: false,
          attackedOrForcedSaveThisTurn: false,
          rageExtendedWithBA: false,
          frenzyUsedThisTurn: false
        }
      }

    case "NOTIFY_END_TURN": {
      const next = pCheckRageMaintenance(rageState, config.level)
      return { ...state, barbarian: rageStateToBarbarianPatch(next, b) }
    }

    case "NOTIFY_SHORT_REST": {
      // SRD: "You regain one expended use when you finish a Short Rest"
      const max = rageMaxCharges(config.level)
      return {
        ...state,
        barbarian: { ...b, rageCharges: Math.min(b.rageCharges + 1, max), relentlessRageTimesUsed: 0 }
      }
    }

    case "NOTIFY_LONG_REST": {
      const max = rageMaxCharges(config.level)
      return {
        ...state,
        barbarian: {
          ...b,
          raging: false,
          rageCharges: max,
          rageTurnsRemaining: 0,
          attackedOrForcedSaveThisTurn: false,
          rageExtendedWithBA: false,
          recklessThisTurn: false,
          frenzyUsedThisTurn: false,
          intimidatingPresenceUsed: false,
          relentlessRageTimesUsed: 0
        }
      }
    }

    default:
      return state
  }
}

function reduceMonk(state: FeatureState, action: FeatureAction, _config: FeatureConfig): FeatureState {
  if (!state.monk) return state
  const m = state.monk

  switch (action.type) {
    case "MONK_EXPEND_FOCUS": {
      const result = pExpendFocus(m, action.cost)
      if (!result.success) return state
      return { ...state, monk: { ...m, focusPoints: result.focusPoints } }
    }

    case "MONK_USE_UNCANNY_METABOLISM":
      return {
        ...state,
        monk: { ...m, focusPoints: action.focusPoints, uncannyMetabolismUsed: action.uncannyMetabolismUsed }
      }

    case "MONK_USE_WHOLENESS_OF_BODY":
      return { ...state, monk: { ...m, wholenessOfBodyCharges: action.chargesAfter } }

    case "MONK_USE_QUIVERING_PALM":
      return { ...state, monk: { ...m, quiveringPalmActive: true } }

    case "MONK_TRIGGER_QUIVERING_PALM":
      return { ...state, monk: { ...m, quiveringPalmActive: false } }

    case "MONK_USE_SUPERIOR_DEFENSE":
      return state // FP expenditure handled via MONK_EXPEND_FOCUS; action cost via machine event

    case "MONK_USE_DISCIPLINED_SURVIVOR_REROLL":
      return state // FP expenditure handled via MONK_EXPEND_FOCUS

    case "MONK_USE_DEFLECT_ATTACKS":
      return { ...state, monk: { ...m, deflectAttacksUsedThisRound: true } }

    case "MONK_USE_SLOW_FALL":
      return state // reaction cost handled by machine event

    case "NOTIFY_START_TURN":
      return { ...state, monk: { ...m, deflectAttacksUsedThisRound: false } }

    case "NOTIFY_SHORT_REST": {
      const restored = pRestoreFocus(m)
      return {
        ...state,
        monk: {
          ...m,
          focusPoints: restored.focusPoints,
          focusMax: restored.focusMax,
          uncannyMetabolismUsed: restored.uncannyMetabolismUsed,
          wholenessOfBodyCharges: m.wholenessOfBodyMax,
          deflectAttacksUsedThisRound: false
        }
      }
    }

    case "NOTIFY_LONG_REST": {
      const restored = pRestoreFocusLongRest(m)
      return {
        ...state,
        monk: {
          ...m,
          focusPoints: restored.focusPoints,
          focusMax: restored.focusMax,
          uncannyMetabolismUsed: restored.uncannyMetabolismUsed,
          wholenessOfBodyCharges: m.wholenessOfBodyMax,
          quiveringPalmActive: false,
          deflectAttacksUsedThisRound: false
        }
      }
    }

    default:
      return state
  }
}

function reducePaladin(state: FeatureState, action: FeatureAction, config: FeatureConfig): FeatureState {
  if (!state.paladin) return state
  const p = state.paladin

  switch (action.type) {
    case "PALADIN_LAY_ON_HANDS":
    case "PALADIN_LAY_ON_HANDS_CURE":
      return { ...state, paladin: { ...p, layOnHandsPool: action.poolAfter } }

    case "PALADIN_SMITE_FREE":
      return { ...state, paladin: { ...p, smiteFreeUsed: true } }

    case "PALADIN_USE_FAITHFUL_STEED":
      return { ...state, paladin: { ...p, faithfulSteedUsed: true } }

    case "PALADIN_USE_ABJURE_FOES":
      return { ...state, paladin: { ...p, channelDivinityCharges: p.channelDivinityCharges - 1 } }

    case "PALADIN_RESTORING_TOUCH":
      return { ...state, paladin: { ...p, layOnHandsPool: action.poolAfter } }

    case "NOTIFY_SHORT_REST": {
      // Channel Divinity: regain 1 use on short rest (SRD 5.2.1)
      const cdAfterShort = Math.min(p.channelDivinityCharges + 1, p.channelDivinityMax)
      return { ...state, paladin: { ...p, channelDivinityCharges: cdAfterShort } }
    }

    case "NOTIFY_LONG_REST": {
      const rest = paladinLongRest(config.level)
      const cdMax = channelDivinityMaxCharges(config.level)
      return {
        ...state,
        paladin: {
          ...p,
          layOnHandsPool: rest.layOnHandsPool,
          smiteFreeUsed: false,
          faithfulSteedUsed: false,
          channelDivinityCharges: cdMax,
          channelDivinityMax: cdMax
        }
      }
    }

    default:
      return state
  }
}

export function featureReducer(state: FeatureState, action: FeatureAction, config: FeatureConfig): FeatureState {
  if (action.type === "RESET") {
    return createInitialFeatureState(config)
  }

  let result = state
  result = reduceFighter(result, action, config)
  result = reduceBarbarian(result, action, config)
  result = reduceMonk(result, action, config)
  result = reducePaladin(result, action, config)
  result = reduceRogue(result, action, config)
  return result
}
