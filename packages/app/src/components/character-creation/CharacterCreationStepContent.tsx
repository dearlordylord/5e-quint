import {
  alignmentFromAbbreviation,
  alignmentLabel,
  ALIGNMENTS,
  CHARACTER_BACKGROUNDS,
  CHARACTER_LANGUAGES,
  CHARACTER_SPECIES,
  type CharacterDraft,
  type CharacterLevelUpTransition
} from "@dnd/core/character-domain.ts"
import { CLASS_NAMES, type ClassName } from "@dnd/core/features/class-tables.ts"
import { ABILITIES, type Ability } from "@dnd/core/types.ts"

import { AbilityScoresStep } from "#/components/character-creation/AbilityScoresStep.tsx"
import { JsonEditor, titleCase } from "#/components/character-creation/characterCreationShared.tsx"
import { DetailsStep } from "#/components/character-creation/DetailsStep.tsx"

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
  advanceDraft,
  currentStep,
  displayValue,
  draft,
  draftStatus,
  reviewOutputs,
  updateDraft
}: {
  advanceDraft: (transition: CharacterLevelUpTransition) => void
  currentStep: StepId
  draft: CharacterDraft
  displayValue: (value: unknown) => string
  draftStatus: "complete" | "incomplete" | "invalid"
  reviewOutputs: Readonly<Record<"battleProjection" | "derived" | "machineInput" | "sheet", unknown>> | null
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
              updateDraft({ primaryClass })
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
            The ordered advancement record drives level, class distribution, subclass timing, and feat choices. Edit it
            here for higher-level starts, or use Level Up from the review step after completing a character.
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
    return <AbilityScoresStep assignedScores={assignedScores} draft={draft} updateDraft={updateDraft} />
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
                {alignmentLabel(alignmentFromAbbreviation(alignment))}
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  }

  if (currentStep === "details") {
    return <DetailsStep draft={draft} updateDraft={updateDraft} />
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
        <p className="font-medium text-gray-100">Direct finalization</p>
        <p className={`mt-2 text-sm ${draftStatus === "complete" ? "text-emerald-300" : "text-amber-300"}`}>
          {draftStatus === "complete"
            ? "This review uses the direct domain-level finalization path."
            : draftStatus === "invalid"
              ? "The draft has illegal choices that must be fixed before review."
              : "The draft still has open required choices before review."}
        </p>
      </div>
      {draftStatus === "complete" && (
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
          <p className="font-medium text-gray-100">Level Up (current: {draft.advancement?.length ?? 0})</p>
          <p className="mt-1 text-xs text-gray-500">
            Starts from the finalized sheet, previews the next canonical advancement draft, and lets the assessment
            pipeline surface any newly opened choices before a finalized sheet exists again.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CLASS_NAMES.map((className) => (
              <button
                key={className}
                className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
                onClick={() => advanceDraft({ entry: { className } })}
                type="button"
              >
                +1 {titleCase(className)}
              </button>
            ))}
          </div>
        </div>
      )}
      {reviewOutputs == null ? null : (
        <div className="grid gap-5 xl:grid-cols-2">
          {(
            [
              ["Character Sheet", reviewOutputs.sheet],
              ["Derived Numbers", reviewOutputs.derived],
              ["Machine Input", reviewOutputs.machineInput],
              ["Battle Projection", reviewOutputs.battleProjection]
            ] as const
          ).map(([label, value]) => (
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
