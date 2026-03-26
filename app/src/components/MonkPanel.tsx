import { type FormEvent, useState } from "react"

import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { MonkFeatureState } from "#/features/feature-store.ts"
import type { UseFeatures } from "#/features/useFeatures.ts"

const D8_DEFAULT = 4
const D8_MAX = 8
const QUIVERING_PALM_LEVEL = 17

export function MonkPanel({
  features,
  monk,
  monkLevel,
  onFeatureAction
}: {
  readonly features: UseFeatures
  readonly monk: MonkFeatureState
  readonly monkLevel: number
  readonly onFeatureAction: (result: BridgeResult) => void
}) {
  const [d8Roll, setD8Roll] = useState(D8_DEFAULT)
  const [stunSavePassed, setStunSavePassed] = useState(false)
  const [wobDieRoll, setWobDieRoll] = useState(D8_DEFAULT)
  // TODO: wisMod should come from config
  const [wisMod] = useState(0)

  const handleFlurryOfBlows = () => {
    const result = features.flurryOfBlows()
    if (result) onFeatureAction(result)
  }

  const handlePatientDefenseFree = () => {
    const result = features.patientDefenseFree()
    if (result) onFeatureAction(result)
  }

  const handlePatientDefenseFocus = () => {
    const result = features.patientDefenseFocus()
    if (result) onFeatureAction(result)
  }

  const handleStepOfTheWindFree = () => {
    const result = features.stepOfTheWindFree()
    if (result) onFeatureAction(result)
  }

  const handleStepOfTheWindFocus = () => {
    const result = features.stepOfTheWindFocus()
    if (result) onFeatureAction(result)
  }

  const handleStunningStrike = () => {
    const result = features.stunningStrike(stunSavePassed)
    if (result) onFeatureAction(result)
  }

  const handleUncannyMetabolism = (e: FormEvent) => {
    e.preventDefault()
    const result = features.uncannyMetabolism(d8Roll)
    if (result) onFeatureAction(result)
  }

  const handleDeflectAttacks = () => {
    const result = features.deflectAttacks()
    if (result) onFeatureAction(result)
  }

  const handleSlowFall = () => {
    const result = features.slowFall()
    if (result) onFeatureAction(result)
  }

  const handleSuperiorDefense = () => {
    const result = features.superiorDefense()
    if (result) onFeatureAction(result)
  }

  const handleWholenessOfBody = (e: FormEvent) => {
    e.preventDefault()
    const result = features.wholenessOfBody(wobDieRoll, wisMod)
    if (result) onFeatureAction(result)
  }

  const handleQuiveringPalm = () => {
    const result = features.quiveringPalm()
    if (result) onFeatureAction(result)
  }

  const handleTriggerQuiveringPalm = () => {
    const result = features.triggerQuiveringPalm()
    if (result) onFeatureAction(result)
  }

  const handleDisciplinedSurvivorReroll = () => {
    const result = features.disciplinedSurvivorReroll()
    if (result) onFeatureAction(result)
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-emerald-400 mb-3">Monk Features</h2>

      {/* Focus Points */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Focus Points</span>
          <span className="text-sm text-gray-400">
            {monk.focusPoints}/{monk.focusMax}
          </span>
        </div>
        <div className="flex gap-1 mb-2">
          {Array.from({ length: monk.focusMax }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i < monk.focusPoints ? "bg-emerald-400" : "bg-gray-600"}`}
            />
          ))}
        </div>

        {/* Martial Arts Die */}
        <div className="text-xs text-gray-400 mb-2">Martial Arts Die: d{features.martialArtsDie}</div>
      </div>

      {/* Passive Indicators */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-emerald-300 mb-2">Passive Features</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {features.unarmoredMovementBonus > 0 && (
            <span className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded">
              Unarmored Movement +{features.unarmoredMovementBonus}ft
            </span>
          )}
          {features.hasFocusEmpoweredStrikes && (
            <span className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded">Empowered Strikes</span>
          )}
          {features.canSelfRestore && (
            <span className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded">Self-Restoration</span>
          )}
          {features.hasDeflectEnergy && (
            <span className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded">Deflect Energy</span>
          )}
          {features.hasDisciplinedSurvivor && (
            <span className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded">Disciplined Survivor</span>
          )}
          {features.hasFleetStep && (
            <span className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded">Fleet Step</span>
          )}
        </div>
      </div>

      {/* Focus Actions */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-emerald-300 mb-2">Focus Actions</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={handleFlurryOfBlows}
            disabled={!features.canFlurryOfBlows}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Flurry of Blows
          </button>
          <button
            type="button"
            onClick={handlePatientDefenseFree}
            disabled={!features.canPatientDefenseFree}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Patient Defense (free)
          </button>
          <button
            type="button"
            onClick={handlePatientDefenseFocus}
            disabled={!features.canPatientDefenseFocus}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Patient Defense (focus)
          </button>
          <button
            type="button"
            onClick={handleStepOfTheWindFree}
            disabled={!features.canStepOfTheWindFree}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Step of the Wind (free)
          </button>
          <button
            type="button"
            onClick={handleStepOfTheWindFocus}
            disabled={!features.canStepOfTheWindFocus}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Step of the Wind (focus)
          </button>
        </div>
      </div>

      {/* Stunning Strike */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-300">Stunning Strike</span>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-400 flex items-center gap-1">
            <input
              type="checkbox"
              checked={stunSavePassed}
              onChange={(e) => setStunSavePassed(e.target.checked)}
              className="rounded"
            />
            Save passed
          </label>
          <button
            type="button"
            onClick={handleStunningStrike}
            disabled={!features.canStunningStrike}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Stunning Strike
          </button>
        </div>
      </div>

      {/* Reactions */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-emerald-300 mb-2">Reactions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDeflectAttacks}
            disabled={!features.canDeflectAttacks}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Deflect Attacks
          </button>
          <button
            type="button"
            onClick={handleSlowFall}
            disabled={!features.canSlowFall}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Slow Fall
          </button>
        </div>
      </div>

      {/* Superior Defense */}
      {features.canSuperiorDefense && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleSuperiorDefense}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Superior Defense (3 FP + Action)
          </button>
        </div>
      )}

      {/* Disciplined Survivor Reroll */}
      {features.hasDisciplinedSurvivor && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleDisciplinedSurvivorReroll}
            disabled={!features.canDisciplinedSurvivorReroll}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Disciplined Survivor Reroll (1 FP)
          </button>
        </div>
      )}

      {/* Wholeness of Body */}
      {monk.wholenessOfBodyMax > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Wholeness of Body</span>
            <span className="text-sm text-gray-400">
              {monk.wholenessOfBodyCharges}/{monk.wholenessOfBodyMax}
            </span>
          </div>
          <form onSubmit={handleWholenessOfBody} className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-gray-400">MA die</label>
              <input
                type="number"
                min={1}
                max={D8_MAX}
                value={wobDieRoll}
                onChange={(e) => setWobDieRoll(Number(e.target.value))}
                className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!features.canWholenessOfBody}
              className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Wholeness of Body
            </button>
          </form>
        </div>
      )}

      {/* Quivering Palm */}
      {monkLevel >= QUIVERING_PALM_LEVEL && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-300">Quivering Palm</span>
            {monk.quiveringPalmActive && (
              <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">Active</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleQuiveringPalm}
              disabled={!features.canQuiveringPalm || monk.quiveringPalmActive}
              className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Quivering Palm (4 FP)
            </button>
            {monk.quiveringPalmActive && (
              <button
                type="button"
                onClick={handleTriggerQuiveringPalm}
                className="px-3 py-1 rounded text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                Trigger
              </button>
            )}
          </div>
        </div>
      )}

      {/* Uncanny Metabolism */}
      {!monk.uncannyMetabolismUsed && (
        <div className="mb-4">
          <form onSubmit={handleUncannyMetabolism} className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-gray-400">d8</label>
              <input
                type="number"
                min={1}
                max={D8_MAX}
                value={d8Roll}
                onChange={(e) => setD8Roll(Number(e.target.value))}
                className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!features.canUncannyMetabolism}
              className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Uncanny Metabolism
            </button>
          </form>
        </div>
      )}
      {monk.uncannyMetabolismUsed && (
        <div className="mb-2 text-xs text-gray-500">Uncanny Metabolism used (long rest to recharge)</div>
      )}
    </>
  )
}
