// --- Barbarian bridge functions (passives + Relentless Rage) ---
// Extracted from feature-bridge.ts to stay under eslint max-lines (420).

import {
  canUseDangerSense,
  canUseRelentlessRage,
  fastMovementBonus,
  hasFeralInstinct,
  indomitableMight,
  instinctivePounceDistance,
  primalChampionBonus,
  relentlessRageDC
} from "#/features/class-barbarian.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { FeatureState } from "#/features/feature-store.ts"

// --- Passive queries (re-exported pure functions) ---

export {
  canUseDangerSense,
  fastMovementBonus,
  hasFeralInstinct,
  indomitableMight,
  instinctivePounceDistance,
  primalChampionBonus
}

// --- Relentless Rage (needs BridgeResult / state) ---

export function canExecuteRelentlessRage(featureState: FeatureState, barbarianLevel: number): boolean {
  if (!featureState.barbarian) return false
  return canUseRelentlessRage(barbarianLevel, featureState.barbarian.raging)
}

export function executeRelentlessRage(): BridgeResult {
  return {
    featureAction: { type: "BARBARIAN_USE_RELENTLESS_RAGE" },
    machineEvents: []
  }
}

export function getRelentlessRageDC(featureState: FeatureState): number {
  if (!featureState.barbarian) return 0
  return relentlessRageDC(featureState.barbarian.relentlessRageTimesUsed)
}
