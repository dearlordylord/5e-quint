import type { CreationFill, CreationHole, SupportedAbilityScoreMethod } from "@dnd/character-creation-runtime"
import { BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY } from "@dnd/character-creation-runtime"
import { ABILITIES, type Ability } from "@dnd/shared/game-facts"
import { STANDARD_ARRAY_SCORES, totalPointBuyCost } from "@dnd/shared-algebras/ability-score-algebra"
import { Option } from "effect"
import { useState } from "react"

import { type AbilityScoreInput, abilityScoresFill } from "#/components/character-creation/characterCreationRuntime.ts"
import { titleCase } from "#/components/character-creation/characterCreationShared.tsx"

function emptyScores(): Partial<Record<Ability, number>> {
  return {}
}

function completeScores(scores: Partial<Record<Ability, number>>): AbilityScoreInput | null {
  return ABILITIES.every((ability) => scores[ability] != null) ? (scores as AbilityScoreInput) : null
}

export function AbilityScoresStep({
  holes,
  onFill
}: {
  holes: ReadonlyArray<CreationHole>
  onFill: (fill: CreationFill) => void
}) {
  const abilityScoreHole = holes.find((hole) => hole.kind === "abilityScores")
  const backgroundIncreaseHoles = holes.filter(
    (hole) =>
      hole.kind === "choice" &&
      hole.source.tag === "unitChoice" &&
      hole.source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY
  )
  const [method, setMethod] = useState<SupportedAbilityScoreMethod>("standardArray")
  const [scores, setScores] = useState<Partial<Record<Ability, number>>>(emptyScores)
  const complete = completeScores(scores)

  return (
    <div className="mt-5 space-y-5">
      {abilityScoreHole == null ? (
        <p className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-3 text-sm text-emerald-300">
          Ability scores have been accepted by the promoted runtime.
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-200">Generation method</span>
              <select
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
                onChange={(event) => setMethod(event.target.value as SupportedAbilityScoreMethod)}
                value={method}
              >
                {abilityScoreHole.methods.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {titleCase(candidate)}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm text-gray-300">
              <p className="font-medium text-gray-100">SRD reminders</p>
              <p className="mt-2">Standard Array: {STANDARD_ARRAY_SCORES.join(", ")}</p>
              <p className="mt-1">
                Point-buy cost:{" "}
                {complete == null
                  ? "complete all six scores to compute"
                  : Option.getOrElse(totalPointBuyCost(complete), () => "invalid point-buy scores")}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ABILITIES.map((ability) => (
              <label key={ability} className="block space-y-2">
                <span className="text-sm font-medium text-gray-200">{titleCase(ability)}</span>
                <input
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
                  onChange={(event) => {
                    const raw = event.target.value
                    setScores((current) => {
                      const next = { ...current }
                      if (raw === "") delete next[ability]
                      else next[ability] = Number(raw)
                      return next
                    })
                  }}
                  type="number"
                  value={scores[ability] ?? ""}
                />
              </label>
            ))}
          </div>
          <button
            className="rounded-md border border-amber-500 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              complete == null ||
              abilityScoresFill({ holeId: abilityScoreHole.holeId, method, scores: complete }) == null
            }
            onClick={() => {
              if (complete == null) return
              const fill = abilityScoresFill({ holeId: abilityScoreHole.holeId, method, scores: complete })
              if (fill != null) onFill(fill)
            }}
            type="button"
          >
            Submit Ability Scores
          </button>
        </>
      )}
      {backgroundIncreaseHoles.map((hole) =>
        hole.kind === "choice" ? (
          <div key={hole.holeId} className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Background ability score increase</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {hole.options.map((option) => (
                <button
                  key={option.optionId}
                  className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
                  onClick={() => onFill({ kind: "choice", holeId: hole.holeId, optionIds: [option.optionId] })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
