import { useState, type FormEvent } from "react"

import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { UseFeatures } from "#/features/useFeatures.ts"

export function FeaturePanel({
  features,
  onFeatureAction
}: {
  readonly features: UseFeatures
  readonly onFeatureAction: (result: BridgeResult) => void
}) {
  const [d10Roll, setD10Roll] = useState(5)
  const fighter = features.featureState.fighter

  if (!fighter) return null

  const handleSecondWind = (e: FormEvent) => {
    e.preventDefault()
    const result = features.secondWind(d10Roll)
    if (result) {
      onFeatureAction(result)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-indigo-700">
      <h2 className="text-lg font-semibold text-indigo-400 mb-3">Fighter Features</h2>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Second Wind</span>
          <span className="text-sm text-gray-400">
            {fighter.secondWindCharges}/{fighter.secondWindMax}
          </span>
        </div>
        <div className="flex gap-1 mb-2">
          {Array.from({ length: fighter.secondWindMax }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < fighter.secondWindCharges ? "bg-indigo-400" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
        <form onSubmit={handleSecondWind} className="flex gap-2 items-end">
          <div>
            <label className="text-xs text-gray-400">d10</label>
            <input
              type="number"
              min={1}
              max={10}
              value={d10Roll}
              onChange={(e) => setD10Roll(Number(e.target.value))}
              className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!features.canSecondWind}
            className="px-3 py-1 rounded text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Second Wind
          </button>
        </form>
      </div>
    </div>
  )
}
