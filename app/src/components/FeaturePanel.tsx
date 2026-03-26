import { type FormEvent, useState } from "react"

import { MonkPanel } from "#/components/MonkPanel.tsx"
import { PaladinPanel } from "#/components/PaladinPanel.tsx"
import { RoguePanel } from "#/components/RoguePanel.tsx"
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
  const barbarian = features.featureState.barbarian
  const monk = features.featureState.monk
  const paladin = features.featureState.paladin
  const rogue = features.featureState.rogue

  if (!fighter && !barbarian && !monk && !paladin && !rogue) return null

  const handleSecondWind = (e: FormEvent) => {
    e.preventDefault()
    const result = features.secondWind(d10Roll)
    if (result) onFeatureAction(result)
  }

  const handleActionSurge = () => {
    const result = features.actionSurge()
    if (result) onFeatureAction(result)
  }

  const handleEnterRage = () => {
    const result = features.enterRage()
    if (result) {
      onFeatureAction(result)
    }
  }

  const handleEndRage = () => {
    const result = features.endRage()
    if (result) {
      onFeatureAction(result)
    }
  }

  const handleExtendRageBA = () => {
    const result = features.extendRageBA()
    if (result) {
      onFeatureAction(result)
    }
  }

  const handleDeclareReckless = () => {
    const result = features.declareReckless()
    if (result) {
      onFeatureAction(result)
    }
  }

  const handleFrenzy = () => {
    const result = features.frenzy()
    if (result) onFeatureAction(result)
  }

  const handleRetaliation = () => {
    const result = features.retaliation()
    if (result) onFeatureAction(result)
  }

  const handleIntimidatingPresence = () => {
    const result = features.intimidatingPresence()
    if (result) onFeatureAction(result)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-indigo-700">
      {fighter && (
        <>
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
                  className={`w-3 h-3 rounded-full ${i < fighter.secondWindCharges ? "bg-indigo-400" : "bg-gray-600"}`}
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
          {fighter.actionSurgeMax > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Action Surge</span>
                <span className="text-sm text-gray-400">
                  {fighter.actionSurgeCharges}/{fighter.actionSurgeMax}
                </span>
              </div>
              <div className="flex gap-1 mb-2">
                {Array.from({ length: fighter.actionSurgeMax }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i < fighter.actionSurgeCharges ? "bg-amber-400" : "bg-gray-600"}`}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={handleActionSurge}
                  disabled={!features.canActionSurge}
                  className="px-3 py-1 rounded text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Action Surge
                </button>
                {fighter.actionSurgeUsedThisTurn && <span className="text-xs text-amber-300">Used this turn</span>}
              </div>
            </div>
          )}
          {fighter.indomitableMax > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Indomitable</span>
                <span className="text-sm text-gray-400">
                  {fighter.indomitableCharges}/{fighter.indomitableMax}
                </span>
              </div>
              <div className="flex gap-1 mb-2">
                {Array.from({ length: fighter.indomitableMax }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i < fighter.indomitableCharges ? "bg-emerald-400" : "bg-gray-600"}`}
                  />
                ))}
              </div>
            </div>
          )}
          {features.championCritRange < 20 && (
            <div className="mb-4 p-2 bg-indigo-900/30 border border-indigo-700 rounded text-sm">
              <div className="text-indigo-300 font-medium mb-1">Champion</div>
              <div className="text-xs text-gray-400">Critical Hit range: {features.championCritRange}-20</div>
              {features.hasRemarkableAthlete && (
                <div className="text-xs text-gray-400">Remarkable Athlete: Advantage on Initiative and Athletics</div>
              )}
              {features.survivorDefyDeathAdvantage && (
                <div className="text-xs text-gray-400">Survivor: Advantage on Death Saving Throws</div>
              )}
            </div>
          )}
        </>
      )}

      {monk && <MonkPanel features={features} monk={monk} onFeatureAction={onFeatureAction} />}

      {barbarian && (
        <>
          <h2 className="text-lg font-semibold text-red-400 mb-3">Barbarian Features</h2>

          {/* Rage Charges */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Rage</span>
              <span className="text-sm text-gray-400">
                {barbarian.rageCharges}/{barbarian.rageMaxCharges}
              </span>
            </div>
            <div className="flex gap-1 mb-2">
              {Array.from({ length: barbarian.rageMaxCharges }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < barbarian.rageCharges ? "bg-red-400" : "bg-gray-600"}`}
                />
              ))}
            </div>

            {/* Raging indicator */}
            {barbarian.raging && (
              <div className="mb-2 p-2 bg-red-900/40 border border-red-600 rounded text-sm">
                <div className="flex items-center gap-2 text-red-300 font-medium">
                  <span>RAGING</span>
                  <span className="text-xs text-gray-400">({barbarian.rageTurnsRemaining} turns remaining)</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Resistance: bludgeoning, piercing, slashing</div>
                {barbarian.attackedOrForcedSaveThisTurn && (
                  <div className="text-xs text-green-400 mt-1">Attack/save marked this turn</div>
                )}
                {barbarian.rageExtendedWithBA && (
                  <div className="text-xs text-yellow-400 mt-1">Extended with bonus action</div>
                )}
              </div>
            )}

            {/* Enter / End Rage */}
            <div className="flex gap-2 mb-2">
              {!barbarian.raging ? (
                <button
                  onClick={handleEnterRage}
                  disabled={!features.canEnterRage}
                  className="px-3 py-1 rounded text-sm font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Enter Rage
                </button>
              ) : (
                <button
                  onClick={handleEndRage}
                  className="px-3 py-1 rounded text-sm font-medium bg-gray-600 hover:bg-gray-500 text-white"
                >
                  End Rage
                </button>
              )}
            </div>

            {/* Extend Rage / Mark Attack */}
            {barbarian.raging && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleExtendRageBA}
                  disabled={!features.canExtendRageBA}
                  className="px-3 py-1 rounded text-sm font-medium bg-yellow-700 hover:bg-yellow-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Extend Rage (BA)
                </button>
                <button
                  onClick={features.markAttackOrSave}
                  disabled={barbarian.attackedOrForcedSaveThisTurn}
                  className="px-3 py-1 rounded text-sm font-medium bg-orange-700 hover:bg-orange-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Mark Attack/Save
                </button>
              </div>
            )}
          </div>

          {/* Reckless Attack */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-300">Reckless Attack</span>
              {barbarian.recklessThisTurn && (
                <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">Active</span>
              )}
            </div>
            <button
              onClick={handleDeclareReckless}
              disabled={!features.canDeclareReckless}
              className="px-3 py-1 rounded text-sm font-medium bg-yellow-700 hover:bg-yellow-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reckless Attack
            </button>
          </div>

          {/* Berserker Subclass Features */}
          {features.berserkerLevel >= 3 && (
            <>
              <h3 className="text-md font-semibold text-red-300 mt-4 mb-2">Berserker</h3>

              {/* Frenzy (L3) */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-300">Frenzy</span>
                  {barbarian.frenzyUsedThisTurn && (
                    <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">Used this turn</span>
                  )}
                  {features.frenzyDamageDice > 0 && (
                    <span className="text-xs text-gray-400">({features.frenzyDamageDice}d6)</span>
                  )}
                </div>
                <button
                  onClick={handleFrenzy}
                  disabled={!features.canFrenzy}
                  className="px-3 py-1 rounded text-sm font-medium bg-red-700 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Frenzy
                </button>
              </div>

              {/* Mindless Rage (L6) */}
              {features.berserkerLevel >= 6 && features.mindlessRageImmunities.size > 0 && (
                <div className="mb-2 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
                  Mindless Rage: immune to {[...features.mindlessRageImmunities].join(", ")}
                </div>
              )}

              {/* Retaliation (L10) */}
              {features.berserkerLevel >= 10 && (
                <div className="mb-2">
                  <span className="text-sm text-gray-300">Retaliation</span>
                  <div className="mt-1">
                    <button
                      onClick={handleRetaliation}
                      disabled={!features.canRetaliation}
                      className="px-3 py-1 rounded text-sm font-medium bg-red-700 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Retaliate
                    </button>
                  </div>
                </div>
              )}

              {/* Intimidating Presence (L14) */}
              {features.berserkerLevel >= 14 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-300">Intimidating Presence</span>
                    <div className="flex gap-1">
                      <div
                        className={`w-3 h-3 rounded-full ${barbarian.intimidatingPresenceUsed ? "bg-gray-600" : "bg-red-400"}`}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleIntimidatingPresence}
                    disabled={!features.canIntimidatingPresence}
                    className="px-3 py-1 rounded text-sm font-medium bg-red-700 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Intimidating Presence
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {paladin && <PaladinPanel features={features} paladin={paladin} onFeatureAction={onFeatureAction} />}

      {rogue && <RoguePanel features={features} rogue={rogue} onFeatureAction={onFeatureAction} />}
    </div>
  )
}
