import { ABILITY_SCORE_GENERATION_MODES, BACKGROUND_ABILITY_SCORE_OPTIONS } from "@dnd/core/character-ability-scores.ts"
import { type CharacterDraft, STANDARD_ARRAY_SCORES, totalPointBuyCost } from "@dnd/core/character-domain.ts"
import { ABILITIES, type Ability } from "@dnd/core/types.ts"
import { Option } from "effect"

import { titleCase } from "#/components/character-creation/characterCreationShared.tsx"

export function AbilityScoresStep({
  assignedScores,
  draft,
  updateDraft
}: {
  assignedScores: Readonly<Record<Ability, number>> | null
  draft: CharacterDraft
  updateDraft: (patch: Partial<CharacterDraft>) => void
}) {
  const abilityScoreMode = draft.abilityScoreGeneration?.mode
  const plusTwoPlusOneIncrease =
    draft.backgroundAbilityScoreIncrease?.kind === "plusTwoPlusOne" ? draft.backgroundAbilityScoreIncrease : undefined
  const backgroundOptions = draft.background == null ? null : BACKGROUND_ABILITY_SCORE_OPTIONS[draft.background]

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-200">Generation mode</span>
          <select
            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
            onChange={(event) =>
              updateDraft({
                abilityScoreGeneration: {
                  mode: event.target.value as (typeof ABILITY_SCORE_GENERATION_MODES)[number],
                  assignedScores: draft.abilityScoreGeneration?.assignedScores ?? {}
                }
              })
            }
            value={draft.abilityScoreGeneration?.mode ?? ""}
          >
            <option value="">Select a mode</option>
            {ABILITY_SCORE_GENERATION_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {titleCase(mode)}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm text-gray-300">
          <p className="font-medium text-gray-100">SRD reminders</p>
          <p className="mt-2">Standard Array: {STANDARD_ARRAY_SCORES.join(", ")}</p>
          <p className="mt-1">
            Point-buy cost:{" "}
            {assignedScores == null
              ? "complete all six scores to compute"
              : Option.getOrElse(totalPointBuyCost(assignedScores), () => "invalid point-buy scores")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ABILITIES.map((ability) => (
          <label key={ability} className="block space-y-2">
            <span className="text-sm font-medium text-gray-200">{titleCase(ability)}</span>
            <input
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100 disabled:opacity-40"
              disabled={abilityScoreMode == null}
              onChange={(event) => {
                if (abilityScoreMode == null) return
                const raw = event.target.value
                const score = raw === "" ? undefined : Number(raw)
                const assignedScoresPatch = { ...draft.abilityScoreGeneration?.assignedScores }
                if (score == null) delete assignedScoresPatch[ability]
                else assignedScoresPatch[ability] = score
                updateDraft({
                  abilityScoreGeneration: { mode: abilityScoreMode, assignedScores: assignedScoresPatch }
                })
              }}
              placeholder={abilityScoreMode == null ? "pick a mode first" : undefined}
              type="number"
              value={draft.abilityScoreGeneration?.assignedScores[ability] ?? ""}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-200">Background increase</span>
          <select
            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100 disabled:opacity-50"
            disabled={backgroundOptions == null}
            onChange={(event) => {
              if (event.target.value === "plusOneToThree") {
                updateDraft({ backgroundAbilityScoreIncrease: { kind: "plusOneToThree" } })
                return
              }
              if (event.target.value === "plusTwoPlusOne" && backgroundOptions != null) {
                updateDraft({
                  backgroundAbilityScoreIncrease: {
                    kind: "plusTwoPlusOne",
                    plusTwo: backgroundOptions[0],
                    plusOne: backgroundOptions[1]
                  }
                })
                return
              }
              updateDraft({ backgroundAbilityScoreIncrease: undefined })
            }}
            value={draft.backgroundAbilityScoreIncrease?.kind ?? ""}
          >
            <option value="">
              {backgroundOptions == null ? "Choose a background first" : "Select an increase mode"}
            </option>
            <option value="plusTwoPlusOne">+2 to one ability, +1 to a different ability</option>
            <option value="plusOneToThree">+1 to all three background abilities</option>
          </select>
        </label>
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm text-gray-300">
          <p className="font-medium text-gray-100">Background abilities</p>
          <p className="mt-2">
            {backgroundOptions == null
              ? "Choose a background to see valid ability choices."
              : backgroundOptions.map(titleCase).join(", ")}
          </p>
        </div>
      </div>
      {plusTwoPlusOneIncrease == null || backgroundOptions == null ? null : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-200">+2 ability</span>
            <select
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
              onChange={(event) => {
                const plusTwo = event.target.value as Ability
                const plusOne =
                  plusTwoPlusOneIncrease.plusOne === plusTwo
                    ? (backgroundOptions.find((ability) => ability !== plusTwo) ?? plusTwoPlusOneIncrease.plusOne)
                    : plusTwoPlusOneIncrease.plusOne
                updateDraft({
                  backgroundAbilityScoreIncrease: { kind: "plusTwoPlusOne", plusTwo, plusOne }
                })
              }}
              value={plusTwoPlusOneIncrease.plusTwo}
            >
              {backgroundOptions.map((ability) => (
                <option key={ability} value={ability}>
                  {titleCase(ability)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-200">+1 ability</span>
            <select
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
              onChange={(event) =>
                updateDraft({
                  backgroundAbilityScoreIncrease: {
                    kind: "plusTwoPlusOne",
                    plusTwo: plusTwoPlusOneIncrease.plusTwo,
                    plusOne: event.target.value as Ability
                  }
                })
              }
              value={plusTwoPlusOneIncrease.plusOne}
            >
              {backgroundOptions
                .filter((ability) => ability !== plusTwoPlusOneIncrease.plusTwo)
                .map((ability) => (
                  <option key={ability} value={ability}>
                    {titleCase(ability)}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}
