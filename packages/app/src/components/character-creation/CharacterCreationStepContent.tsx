import type {
  CharacterDraft,
  CreationFill,
  CreationFinalizationResult,
  CreationHole
} from "@dnd/character-creation-runtime"
import { BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY } from "@dnd/character-creation-runtime"
import { useState } from "react"

import { AbilityScoresStep } from "#/components/character-creation/AbilityScoresStep.tsx"
import { displayValue, titleCase } from "#/components/character-creation/characterCreationShared.tsx"

export const STEP_ORDER = ["class", "origin", "abilityScores", "alignment", "details", "review"] as const

export type StepId = (typeof STEP_ORDER)[number]

export const STEP_TITLES: Readonly<Record<StepId, string>> = {
  class: "1. Choose Class",
  origin: "2. Determine Origin",
  abilityScores: "3. Determine Ability Scores",
  alignment: "4. Choose Alignment",
  details: "5. Fill In Details",
  review: "Review Character"
}

function draftPath(hole: CreationHole): string | null {
  return hole.source.tag === "draft" ? hole.source.path : null
}

function holesForStep(step: StepId, holes: ReadonlyArray<CreationHole>): ReadonlyArray<CreationHole> {
  if (step === "class") return holes.filter((hole) => draftPath(hole) === "draft.progression.initial")
  if (step === "origin") {
    return holes.filter((hole) =>
      ["draft.background", "draft.species", "draft.languages"].some((path) => path === draftPath(hole))
    )
  }
  if (step === "abilityScores") {
    return holes.filter(
      (hole) =>
        draftPath(hole) === "draft.abilityScoreGeneration" ||
        (hole.source.tag === "unitChoice" && hole.source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY)
    )
  }
  if (step === "alignment") return holes.filter((hole) => draftPath(hole) === "draft.alignment")
  if (step === "details") {
    return holes.filter(
      (hole) =>
        !holesForStep("class", [hole]).includes(hole) &&
        !holesForStep("origin", [hole]).includes(hole) &&
        !holesForStep("abilityScores", [hole]).includes(hole) &&
        !holesForStep("alignment", [hole]).includes(hole)
    )
  }
  return holes
}

function holeTitle(hole: CreationHole): string {
  if (hole.source.tag === "draft") return titleCase(hole.source.path.replace("draft.", ""))
  if (hole.source.tag === "unitChoice") return titleCase(hole.source.choiceKey)
  return titleCase(hole.source.slot)
}

function choiceLimit(hole: Extract<CreationHole, { readonly kind: "choice" }>): number {
  return hole.cardinality.tag === "exactly" ? hole.cardinality.count : hole.cardinality.max
}

function choiceMinimum(hole: Extract<CreationHole, { readonly kind: "choice" }>): number {
  return hole.cardinality.tag === "exactly" ? hole.cardinality.count : hole.cardinality.min
}

function ChoiceHolePicker({
  hole,
  onFill
}: {
  hole: Extract<CreationHole, { readonly kind: "choice" }>
  onFill: (fill: CreationFill) => void
}) {
  const max = choiceLimit(hole)
  const min = choiceMinimum(hole)
  const isMultiPick = max > 1
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  if (!isMultiPick) {
    return (
      <label className="block space-y-2 rounded-lg border border-gray-800 bg-gray-950/40 p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{holeTitle(hole)}</span>
        <select
          className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
          onChange={(event) => {
            const option = hole.options.find((candidate) => candidate.optionId === event.target.value)
            if (option == null) return
            onFill({ kind: "choice", holeId: hole.holeId, optionIds: [option.optionId] })
          }}
          value=""
        >
          <option value="">Select an option</option>
          {hole.options.map((option) => (
            <option key={option.optionId} value={option.optionId}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {holeTitle(hole)} ({min === max ? max : `${min}-${max}`} choices)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {hole.options.map((option) => {
          const checked = selected.has(option.optionId)
          const disabled = !checked && selected.size >= max
          return (
            <label
              key={option.optionId}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                checked
                  ? "border-amber-500 bg-amber-500/10 text-amber-200"
                  : disabled
                    ? "cursor-not-allowed border-gray-800 bg-gray-950/40 text-gray-500"
                    : "border-gray-700 bg-gray-950/60 text-gray-200 hover:border-gray-500"
              }`}
            >
              <input
                checked={checked}
                disabled={disabled}
                onChange={(event) => {
                  setSelected((current) => {
                    const next = new Set(current)
                    if (event.target.checked) next.add(option.optionId)
                    else next.delete(option.optionId)
                    return next
                  })
                }}
                type="checkbox"
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
      <button
        className="mt-3 rounded-md border border-amber-500 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={selected.size < min || selected.size > max}
        onClick={() => {
          const selectedOptions = hole.options
            .filter((option) => selected.has(option.optionId))
            .map((option) => option.optionId)
          onFill({ kind: "choice", holeId: hole.holeId, optionIds: selectedOptions })
          setSelected(new Set())
        }}
        type="button"
      >
        Submit {holeTitle(hole)}
      </button>
    </div>
  )
}

function CreationHoles({
  emptyText,
  holes,
  onFill
}: {
  emptyText: string
  holes: ReadonlyArray<CreationHole>
  onFill: (fill: CreationFill) => void
}) {
  if (holes.length === 0) return <p className="mt-5 text-sm text-emerald-300">{emptyText}</p>

  return (
    <div className="mt-5 space-y-3">
      {holes.map((hole) =>
        hole.kind === "choice" ? (
          <ChoiceHolePicker key={hole.holeId} hole={hole} onFill={onFill} />
        ) : (
          <div key={hole.holeId} className="rounded-lg border border-gray-800 bg-gray-950/40 p-3 text-sm text-gray-300">
            Fill {holeTitle(hole)} from the ability-score step.
          </div>
        )
      )}
    </div>
  )
}

export function CharacterCreationStepContent({
  currentStep,
  draft,
  finalization,
  holes,
  onFill
}: {
  currentStep: StepId
  draft: CharacterDraft
  finalization: CreationFinalizationResult
  holes: ReadonlyArray<CreationHole>
  onFill: (fill: CreationFill) => void
}) {
  const stepHoles = holesForStep(currentStep, holes)

  if (currentStep === "abilityScores") return <AbilityScoresStep holes={stepHoles} onFill={onFill} />

  if (currentStep === "review") {
    return (
      <div className="mt-5 space-y-5">
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
          <p className="font-medium text-gray-100">In-Play State</p>
          <p className="mt-2 text-sm text-gray-400">
            Character creation finalizes Character Build facts. In-play records own current HP, zero-HP lifecycle, and
            spent Spell Slots outside battle; BattleState owns them during combat.
          </p>
        </div>
        {finalization.tag === "ready" ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Character Build</h3>
            <pre className="overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs text-gray-100">
              {displayValue(finalization.build)}
            </pre>
          </div>
        ) : finalization.tag === "invalid" ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">Finalization Issues</h3>
            <pre className="overflow-auto rounded-lg border border-rose-900 bg-rose-950/20 p-4 text-xs text-rose-100">
              {displayValue(finalization.issues)}
            </pre>
          </div>
        ) : (
          <CreationHoles emptyText="No open creation holes." holes={holes} onFill={onFill} />
        )}
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Character Draft</h3>
          <pre className="overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs text-gray-100">
            {displayValue(draft)}
          </pre>
        </div>
      </div>
    )
  }

  return <CreationHoles emptyText="This step is complete." holes={stepHoles} onFill={onFill} />
}
