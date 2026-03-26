import type { CunningActionChoice } from "#/features/class-rogue.ts"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import type { RogueFeatureState } from "#/features/feature-store.ts"
import type { UseFeatures } from "#/features/useFeatures.ts"

export function RoguePanel({
  features,
  onFeatureAction,
  rogue
}: {
  readonly features: UseFeatures
  readonly rogue: RogueFeatureState
  readonly onFeatureAction: (result: BridgeResult) => void
}) {
  const handleCunningAction = (choice: CunningActionChoice) => {
    const result = features.cunningAction(choice)
    if (result) onFeatureAction(result)
  }

  const handleSteadyAim = () => {
    const result = features.steadyAim()
    if (result) onFeatureAction(result)
  }

  const handleSneakAttack = () => {
    const result = features.sneakAttack()
    if (result) onFeatureAction(result)
  }

  const handleStrokeOfLuck = () => {
    const result = features.strokeOfLuck()
    if (result) onFeatureAction(result)
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-emerald-400 mb-3">Rogue Features</h2>

      {/* Sneak Attack */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Sneak Attack</span>
          <span className="text-sm text-gray-400">{features.sneakAttackDice}d6</span>
        </div>
        {rogue.sneakAttackUsedThisTurn && <div className="text-xs text-yellow-400 mb-1">Used this turn</div>}
        <button
          type="button"
          onClick={handleSneakAttack}
          disabled={rogue.sneakAttackUsedThisTurn}
          className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sneak Attack
        </button>
      </div>

      {/* Cunning Action (L2) */}
      <div className="mb-4">
        <span className="text-sm text-gray-300 block mb-1">Cunning Action</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleCunningAction("dash")}
            disabled={!features.canCunningAction}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Dash
          </button>
          <button
            type="button"
            onClick={() => handleCunningAction("disengage")}
            disabled={!features.canCunningAction}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Disengage
          </button>
          <button
            type="button"
            onClick={() => handleCunningAction("hide")}
            disabled={!features.canCunningAction}
            className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Steady Aim (L3) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-300">Steady Aim</span>
          {rogue.steadyAimUsed && <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">Used</span>}
        </div>
        <button
          type="button"
          onClick={handleSteadyAim}
          disabled={!features.canSteadyAim}
          className="px-3 py-1 rounded text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Steady Aim
        </button>
      </div>

      {/* Stroke of Luck (L20) */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-300">Stroke of Luck</span>
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-full ${rogue.strokeOfLuckUsed ? "bg-gray-600" : "bg-emerald-400"}`} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleStrokeOfLuck}
          disabled={!features.canStrokeOfLuck}
          className="px-3 py-1 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Stroke of Luck
        </button>
      </div>
    </>
  )
}
