// --- Paladin reducer ---
// Extracted from feature-store.ts to stay under eslint max-lines (420).

import { paladinLongRest } from "#/features/class-paladin.ts"
import type { FeatureAction, FeatureConfig, FeatureState } from "#/features/feature-store.ts"

export function channelDivinityMaxCharges(paladinLevel: number): number {
  if (paladinLevel < 3) return 0
  if (paladinLevel < 11) return 2
  return 3
}

export function reducePaladin(state: FeatureState, action: FeatureAction, config: FeatureConfig): FeatureState {
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
