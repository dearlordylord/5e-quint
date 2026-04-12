import { ABILITY_SCORE_GENERATION_MODES, BACKGROUND_ABILITY_SCORE_OPTIONS } from "@dnd/core/character-ability-scores.ts"
import {
  ALIGNMENTS,
  CHARACTER_BACKGROUNDS,
  CHARACTER_LANGUAGES,
  CHARACTER_SPECIES,
  type CharacterDraft,
  STANDARD_ARRAY_SCORES,
  totalPointBuyCost
} from "@dnd/core/character-domain.ts"
import { CLASS_NAMES, type ClassName } from "@dnd/core/features/class-tables.ts"
import { ABILITIES, type Ability } from "@dnd/core/types.ts"

import { JsonEditor, titleCase } from "#/components/character-creation/characterCreationShared.tsx"

export const STEP_ORDER = ["class", "origin", "abilityScores", "alignment", "details", "review"] as const

export type StepId = (typeof STEP_ORDER)[number]

export const STEP_TITLES: Readonly<Record<StepId, string>> = {
  class: "1. Choose Class",
  origin: "2. Determine Origin",
  abilityScores: "3. Determine Ability Scores",
  alignment: "4. Choose Alignment",
  details: "5. Fill In Details",
  review: "Review And Projections"
}

const ALIGNMENT_LABELS: Readonly<Record<(typeof ALIGNMENTS)[number], string>> = {
  LG: "Lawful Good",
  NG: "Neutral Good",
  CG: "Chaotic Good",
  LN: "Lawful Neutral",
  N: "Neutral",
  CN: "Chaotic Neutral",
  LE: "Lawful Evil",
  NE: "Neutral Evil",
  CE: "Chaotic Evil"
}

function abilityScoresComplete(draft: CharacterDraft): boolean {
  return ABILITIES.every((ability) => draft.abilityScoreGeneration?.assignedScores[ability] != null)
}

function completeAssignedScores(draft: CharacterDraft): Readonly<Record<Ability, number>> | null {
  if (!abilityScoresComplete(draft) || draft.abilityScoreGeneration == null) return null
  return draft.abilityScoreGeneration.assignedScores as Readonly<Record<Ability, number>>
}

function nextLanguages(
  draft: CharacterDraft,
  language: (typeof CHARACTER_LANGUAGES)[number],
  checked: boolean
): ReadonlyArray<(typeof CHARACTER_LANGUAGES)[number]> {
  const languages = draft.languages ?? []
  if (checked) return languages.includes(language) ? languages : [...languages, language]
  return languages.filter((entry) => entry !== language)
}

export function CharacterCreationStepContent({
  currentStep,
  displayValue,
  draft,
  finalizationOk,
  reviewOutputs,
  setAbilityScore,
  setDraft,
  updateDraft
}: {
  currentStep: StepId
  draft: CharacterDraft
  displayValue: (value: unknown) => string
  finalizationOk: boolean
  reviewOutputs: {
    readonly battleProjection: unknown
    readonly derived: unknown
    readonly machineInput: unknown
    readonly sheet: unknown
  } | null
  setAbilityScore: (ability: Ability, score: number) => void
  setDraft: React.Dispatch<React.SetStateAction<CharacterDraft>>
  updateDraft: (patch: Partial<CharacterDraft>) => void
}) {
  const assignedScores = completeAssignedScores(draft)

  if (currentStep === "class") {
    return (
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-200">Primary class</span>
          <select
            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
            onChange={(event) => {
              const primaryClass = event.target.value as ClassName
              setDraft((current) => ({
                ...current,
                primaryClass,
                advancement: current.advancement ?? [{ className: primaryClass }]
              }))
            }}
            value={draft.primaryClass ?? ""}
          >
            <option value="">Select a class</option>
            {CLASS_NAMES.map((className) => (
              <option key={className} value={className}>
                {titleCase(className)}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm text-gray-300">
          <p className="font-medium text-gray-100">Current advancement</p>
          <p className="mt-2 text-gray-400">
            CHAR7 owns higher-level starts and multiclass flow. This shell preserves the ordered advancement record
            already in the draft.
          </p>
          <pre className="mt-3 overflow-auto rounded-md bg-black/30 p-3 text-xs text-gray-200">
            {displayValue(draft.advancement ?? [])}
          </pre>
        </div>
        <div className="md:col-span-2">
          <JsonEditor
            label="Advancement JSON override"
            onChange={(value) => updateDraft({ advancement: value as CharacterDraft["advancement"] })}
            value={draft.advancement}
          />
        </div>
      </div>
    )
  }

  if (currentStep === "origin") {
    return (
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-200">Background</span>
          <select
            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
            onChange={(event) =>
              updateDraft({
                background: event.target.value === "" ? undefined : (event.target.value as CharacterDraft["background"])
              })
            }
            value={draft.background ?? ""}
          >
            <option value="">Select a background</option>
            {CHARACTER_BACKGROUNDS.map((background) => (
              <option key={background} value={background}>
                {titleCase(background)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-200">Species</span>
          <select
            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
            onChange={(event) =>
              updateDraft({
                species: event.target.value === "" ? undefined : (event.target.value as CharacterDraft["species"])
              })
            }
            value={draft.species ?? ""}
          >
            <option value="">Select a species</option>
            {CHARACTER_SPECIES.map((species) => (
              <option key={species} value={species}>
                {titleCase(species)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium text-gray-200">Languages</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {CHARACTER_LANGUAGES.map((language) => (
              <label
                key={language}
                className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-gray-200"
              >
                <input
                  checked={draft.languages?.includes(language) ?? false}
                  onChange={(event) => updateDraft({ languages: nextLanguages(draft, language, event.target.checked) })}
                  type="checkbox"
                />
                <span>{language}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    )
  }

  if (currentStep === "abilityScores") {
    return (
      <div className="mt-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-200">Generation mode</span>
            <select
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  abilityScoreGeneration: {
                    mode: event.target.value as (typeof ABILITY_SCORE_GENERATION_MODES)[number],
                    assignedScores: current.abilityScoreGeneration?.assignedScores ?? {}
                  }
                }))
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
              {assignedScores == null ? "complete all six scores to compute" : totalPointBuyCost(assignedScores)}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ABILITIES.map((ability) => (
            <label key={ability} className="block space-y-2">
              <span className="text-sm font-medium text-gray-200">{titleCase(ability)}</span>
              <input
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
                min={3}
                max={20}
                onChange={(event) => setAbilityScore(ability, Number(event.target.value))}
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
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
              onChange={(event) =>
                updateDraft({
                  backgroundAbilityScoreIncrease:
                    event.target.value === "plusOneToThree"
                      ? { kind: "plusOneToThree" }
                      : { kind: "plusTwoPlusOne", plusTwo: "str", plusOne: "dex" }
                })
              }
              value={draft.backgroundAbilityScoreIncrease?.kind ?? ""}
            >
              <option value="">Select an increase mode</option>
              <option value="plusTwoPlusOne">+2 to one ability, +1 to a different ability</option>
              <option value="plusOneToThree">+1 to all three background abilities</option>
            </select>
          </label>
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm text-gray-300">
            <p className="font-medium text-gray-100">Background abilities</p>
            <p className="mt-2">
              {draft.background == null
                ? "Choose a background to see valid ability choices."
                : BACKGROUND_ABILITY_SCORE_OPTIONS[draft.background].map(titleCase).join(", ")}
            </p>
          </div>
        </div>
        {draft.backgroundAbilityScoreIncrease?.kind !== "plusTwoPlusOne" ? null : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-200">+2 ability</span>
              <select
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
                onChange={(event) =>
                  updateDraft({
                    backgroundAbilityScoreIncrease: {
                      kind: "plusTwoPlusOne",
                      plusTwo: event.target.value as Ability,
                      plusOne: draft.backgroundAbilityScoreIncrease.plusOne
                    }
                  })
                }
                value={draft.backgroundAbilityScoreIncrease.plusTwo}
              >
                {ABILITIES.map((ability) => (
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
                      plusTwo: draft.backgroundAbilityScoreIncrease.plusTwo,
                      plusOne: event.target.value as Ability
                    }
                  })
                }
                value={draft.backgroundAbilityScoreIncrease.plusOne}
              >
                {ABILITIES.map((ability) => (
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

  if (currentStep === "alignment") {
    return (
      <div className="mt-5 max-w-xl">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-200">Alignment</span>
          <select
            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
            onChange={(event) =>
              updateDraft({
                alignment: event.target.value === "" ? undefined : (event.target.value as CharacterDraft["alignment"])
              })
            }
            value={draft.alignment ?? ""}
          >
            <option value="">Select an alignment</option>
            {ALIGNMENTS.map((alignment) => (
              <option key={alignment} value={alignment}>
                {ALIGNMENT_LABELS[alignment]}
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  }

  if (currentStep === "details") {
    return (
      <div className="mt-5 space-y-5">
        <p className="text-sm text-gray-400">
          Step 5 owns the remaining structured choices. This shell edits those draft slices directly rather than
          duplicating class-specific validation or derivation logic in the UI.
        </p>
        <JsonEditor
          label="Build choices JSON"
          onChange={(value) => updateDraft({ choices: value as CharacterDraft["choices"] })}
          value={draft.choices}
        />
        <JsonEditor
          label="Equipment JSON"
          onChange={(value) => updateDraft({ equipment: value as CharacterDraft["equipment"] })}
          value={draft.equipment}
        />
        <JsonEditor
          label="Spellcasting JSON"
          onChange={(value) => updateDraft({ spellcasting: value as CharacterDraft["spellcasting"] })}
          value={draft.spellcasting}
        />
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
        <p className="font-medium text-gray-100">Direct finalization</p>
        <p className={`mt-2 text-sm ${finalizationOk ? "text-emerald-300" : "text-amber-300"}`}>
          {finalizationOk
            ? "This review uses the direct domain-level finalization path."
            : "The draft still has canonical finalization issues."}
        </p>
      </div>
      {reviewOutputs == null ? null : (
        <div className="grid gap-5 xl:grid-cols-2">
          {[
            ["Character Sheet", reviewOutputs.sheet],
            ["Derived Numbers", reviewOutputs.derived],
            ["Machine Input", reviewOutputs.machineInput],
            ["Battle Projection", reviewOutputs.battleProjection]
          ].map(([label, value]) => (
            <div key={label}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</h3>
              <pre className="overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs text-gray-100">
                {displayValue(value)}
              </pre>
            </div>
          ))}
        </div>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Persisted Draft</h3>
        <pre className="overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs text-gray-100">
          {displayValue(draft)}
        </pre>
      </div>
    </div>
  )
}
