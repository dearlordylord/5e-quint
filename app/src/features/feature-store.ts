import { fighterLongRest, fighterShortRest, secondWindMaxCharges } from "#/features/class-fighter.ts"

export interface FeatureConfig {
  readonly className: string
  readonly level: number
}

export interface FighterFeatureState {
  readonly secondWindCharges: number
  readonly secondWindMax: number
}

export interface FeatureState {
  readonly fighter?: FighterFeatureState
}

export type FeatureAction =
  | { readonly type: "FIGHTER_USE_SECOND_WIND" }
  | { readonly type: "NOTIFY_SHORT_REST" }
  | { readonly type: "NOTIFY_LONG_REST" }
  | { readonly type: "NOTIFY_START_TURN" }
  | { readonly type: "RESET" }

export function createInitialFeatureState(config: FeatureConfig): FeatureState {
  if (config.className === "fighter") {
    const max = secondWindMaxCharges(config.level)
    return { fighter: { secondWindCharges: max, secondWindMax: max } }
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

    case "NOTIFY_SHORT_REST": {
      const rest = fighterShortRest({
        secondWindCharges: f.secondWindCharges,
        secondWindMax: f.secondWindMax,
        actionSurgeCharges: 0,
        actionSurgeMax: 0
      })
      return { ...state, fighter: { ...f, secondWindCharges: rest.secondWindCharges } }
    }

    case "NOTIFY_LONG_REST": {
      const rest = fighterLongRest({
        secondWindCharges: f.secondWindCharges,
        secondWindMax: f.secondWindMax,
        actionSurgeCharges: 0,
        actionSurgeMax: 0
      })
      return { ...state, fighter: { ...f, secondWindCharges: rest.secondWindCharges } }
    }

    case "NOTIFY_START_TURN":
      return state

    default:
      return state
  }
}
