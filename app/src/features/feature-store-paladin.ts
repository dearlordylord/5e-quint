// --- Paladin reducer ---
// Extracted from feature-store.ts to stay under eslint max-lines (420).

import { paladinLongRest } from "#/features/class-paladin.ts"
import type { FeatureAction, FeatureConfig, FeatureState } from "#/features/feature-store.ts"

export function reducePaladin(state: FeatureState, action: FeatureAction, config: FeatureConfig): FeatureState {
  if (!state.paladin) return state
  const p = state.paladin

  switch (action.type) {
    case "PALADIN_LAY_ON_HANDS":
    case "PALADIN_LAY_ON_HANDS_CURE":
      return { ...state, paladin: { ...p, layOnHandsPool: action.poolAfter } }

    case "PALADIN_SMITE_FREE":
      return { ...state, paladin: { ...p, smiteFreeUsed: true } }

    case "NOTIFY_START_TURN":
      return state

    case "NOTIFY_LONG_REST": {
      const rest = paladinLongRest(config.level)
      return {
        ...state,
        paladin: {
          ...p,
          layOnHandsPool: rest.layOnHandsPool,
          smiteFreeUsed: false
        }
      }
    }

    default:
      return state
  }
}
