// --- Monk reducer ---
// Extracted from feature-store.ts to stay under eslint max-lines (420).

import { pExpendFocus, pRestoreFocus, pRestoreFocusLongRest } from "#/features/class-monk.ts"
import type { FeatureAction, FeatureConfig, FeatureState } from "#/features/feature-store.ts"

export function reduceMonk(state: FeatureState, action: FeatureAction, _config: FeatureConfig): FeatureState {
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
