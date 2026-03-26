import { type FormEvent, useState } from "react"

import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { PaladinFeatureState } from "#/features/feature-store.ts"
import type { UseFeatures } from "#/features/useFeatures.ts"

const LOH_DEFAULT = 5
const LOH_CURE_COST = 5
const PERCENT = 100
const POISONED_CONDITIONS: ReadonlyArray<"poisoned"> = ["poisoned"]

export function PaladinPanel({
  features,
  onFeatureAction,
  paladin
}: {
  readonly features: UseFeatures
  readonly paladin: PaladinFeatureState
  readonly onFeatureAction: (result: BridgeResult) => void
}) {
  const [layOnHandsAmount, setLayOnHandsAmount] = useState(LOH_DEFAULT)

  const handleLayOnHandsHeal = (e: FormEvent) => {
    e.preventDefault()
    const result = features.layOnHandsHeal(layOnHandsAmount)
    if (result) onFeatureAction(result)
  }

  const handleLayOnHandsCure = (condition: "poisoned") => {
    const result = features.layOnHandsCure(condition)
    if (result) onFeatureAction(result)
  }

  const handlePaladinSmiteFree = () => {
    const result = features.paladinSmiteFree()
    if (result) onFeatureAction(result)
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-yellow-400 mb-3">Paladin Features</h2>

      {/* Lay on Hands Pool */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Lay on Hands</span>
          <span className="text-sm text-gray-400">
            {paladin.layOnHandsPool}/{paladin.layOnHandsMax}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded h-2 mb-2">
          <div
            className="bg-yellow-400 rounded h-2 transition-all"
            style={{
              width: `${paladin.layOnHandsMax > 0 ? (paladin.layOnHandsPool / paladin.layOnHandsMax) * PERCENT : 0}%`
            }}
          />
        </div>
        <form onSubmit={handleLayOnHandsHeal} className="flex gap-2 items-end">
          <div>
            <label className="text-xs text-gray-400">HP</label>
            <input
              type="number"
              min={1}
              max={paladin.layOnHandsPool}
              value={layOnHandsAmount}
              onChange={(e) => setLayOnHandsAmount(Number(e.target.value))}
              className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!features.canLayOnHandsHeal}
            className="px-3 py-1 rounded text-sm font-medium bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Heal
          </button>
        </form>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => handleLayOnHandsCure("poisoned")}
            disabled={!features.canLayOnHandsCure("poisoned", POISONED_CONDITIONS)}
            className="px-3 py-1 rounded text-sm font-medium bg-green-700 hover:bg-green-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cure Poisoned ({LOH_CURE_COST} HP)
          </button>
        </div>
      </div>

      {/* Paladin's Smite (free use) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-300">Paladin{"'"}s Smite (Free)</span>
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-full ${paladin.smiteFreeUsed ? "bg-gray-600" : "bg-yellow-400"}`} />
          </div>
        </div>
        <button
          type="button"
          onClick={handlePaladinSmiteFree}
          disabled={!features.canPaladinSmiteFree}
          className="px-3 py-1 rounded text-sm font-medium bg-yellow-700 hover:bg-yellow-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Free Smite
        </button>
      </div>

      {/* Passive Indicators */}
      {features.hasDivineHealth && (
        <div className="mb-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
          Divine Health: immune to disease
        </div>
      )}
      {features.canUseAuraOfProtection && (
        <div className="mb-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
          Aura of Protection: +{features.auraOfProtectionBonus} to saving throws
        </div>
      )}
      {features.radiantStrikesDice > 0 && (
        <div className="mb-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
          Radiant Strikes: +{features.radiantStrikesDice}d8 radiant on melee hits
        </div>
      )}
    </>
  )
}
