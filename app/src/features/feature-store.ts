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
  secondWindMaxCharges
} from "#/features/class-fighter.ts"

export interface FeatureConfig {
  readonly className: string
  readonly level: number
  readonly berserkerLevel?: number
}

export interface FighterFeatureState {
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
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
}

export interface FeatureState {
  readonly fighter?: FighterFeatureState
  readonly barbarian?: BarbarianFeatureState
}

export type FeatureAction =
  | { readonly type: "FIGHTER_USE_SECOND_WIND" }
  | { readonly type: "FIGHTER_USE_ACTION_SURGE" }
  | { readonly type: "BARBARIAN_ENTER_RAGE" }
  | { readonly type: "BARBARIAN_END_RAGE" }
  | { readonly type: "BARBARIAN_EXTEND_RAGE_BA" }
  | { readonly type: "BARBARIAN_MARK_ATTACK_OR_SAVE" }
  | { readonly type: "BARBARIAN_DECLARE_RECKLESS" }
  | { readonly type: "BERSERKER_APPLY_FRENZY" }
  | { readonly type: "BERSERKER_USE_RETALIATION" }
  | { readonly type: "BERSERKER_USE_INTIMIDATING_PRESENCE" }
  | { readonly type: "NOTIFY_SHORT_REST" }
  | { readonly type: "NOTIFY_LONG_REST" }
  | { readonly type: "NOTIFY_START_TURN" }
  | { readonly type: "NOTIFY_END_TURN" }
  | { readonly type: "RESET" }

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
    intimidatingPresenceUsed: prev.intimidatingPresenceUsed
  }
}

export function createInitialFeatureState(config: FeatureConfig): FeatureState {
  if (config.className === "fighter") {
    const swMax = secondWindMaxCharges(config.level)
    const asMax = actionSurgeMaxCharges(config.level)
    return {
      fighter: {
        secondWindCharges: swMax,
        secondWindMax: swMax,
        actionSurgeCharges: asMax,
        actionSurgeMax: asMax,
        actionSurgeUsedThisTurn: false
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
        intimidatingPresenceUsed: false
      }
    }
  }
  return {}
}

function reduceFighter(state: FeatureState, action: FeatureAction, _config: FeatureConfig): FeatureState {
  if (!state.fighter) return state
  const f = state.fighter

  switch (action.type) {
    case "FIGHTER_USE_SECOND_WIND":
      return { ...state, fighter: { ...f, secondWindCharges: f.secondWindCharges - 1 } }

    case "FIGHTER_USE_ACTION_SURGE":
      return {
        ...state,
        fighter: { ...f, actionSurgeCharges: f.actionSurgeCharges - 1, actionSurgeUsedThisTurn: true }
      }

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
          actionSurgeCharges: rest.actionSurgeCharges
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
          intimidatingPresenceUsed: false
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
  return result
}
