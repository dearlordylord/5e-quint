import {
  actionSurgeMaxCharges,
  fighterLongRest,
  fighterShortRest,
  secondWindMaxCharges
} from "#/features/class-fighter.ts"

export interface FeatureConfig {
  readonly className: string
  readonly level: number
}

export interface FighterFeatureState {
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
}

export interface FeatureState {
  readonly fighter?: FighterFeatureState
}

export type FeatureAction =
  | { readonly type: "FIGHTER_USE_SECOND_WIND" }
  | { readonly type: "FIGHTER_USE_ACTION_SURGE" }
  | { readonly type: "NOTIFY_SHORT_REST" }
  | { readonly type: "NOTIFY_LONG_REST" }
  | { readonly type: "NOTIFY_START_TURN" }
  | { readonly type: "RESET" }

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
  return {}
}

export function featureReducer(state: FeatureState, action: FeatureAction, config: FeatureConfig): FeatureState {
  if (action.type === "RESET") {
    return createInitialFeatureState(config)
  }

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
