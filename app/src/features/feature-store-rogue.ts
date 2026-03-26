// --- Rogue reducer ---
// Extracted from feature-store.ts to stay under eslint max-lines (420).

import { resetRogueTurnState } from "#/features/class-rogue.ts"
import type { FeatureAction, FeatureConfig, FeatureState } from "#/features/feature-store.ts"

export function reduceRogue(state: FeatureState, action: FeatureAction, _config: FeatureConfig): FeatureState {
  if (!state.rogue) return state
  const r = state.rogue

  switch (action.type) {
    case "ROGUE_USE_SNEAK_ATTACK":
      return { ...state, rogue: { ...r, sneakAttackUsedThisTurn: true } }

    case "ROGUE_USE_CUNNING_ACTION":
      return state // bonus action consumed via machine event; no store-side state change

    case "ROGUE_USE_STEADY_AIM":
      return { ...state, rogue: { ...r, steadyAimUsed: true } }

    case "ROGUE_USE_STROKE_OF_LUCK":
      return { ...state, rogue: { ...r, strokeOfLuckUsed: true } }

    case "NOTIFY_START_TURN": {
      const reset = resetRogueTurnState()
      return {
        ...state,
        rogue: {
          ...r,
          sneakAttackUsedThisTurn: reset.sneakAttackUsedThisTurn,
          steadyAimUsed: reset.steadyAimUsedThisTurn
        }
      }
    }

    case "NOTIFY_SHORT_REST":
    case "NOTIFY_LONG_REST":
      return { ...state, rogue: { ...r, strokeOfLuckUsed: false } }

    default:
      return state
  }
}
