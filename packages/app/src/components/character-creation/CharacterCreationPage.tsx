import { applyCharacterDraftUpdate, assessCharacterDraft, type CharacterDraft } from "@dnd/core/character-domain.ts"
import {
  characterSheetBattleProjection,
  characterSheetMachineInput,
  deriveCharacterSheetNumbers
} from "@dnd/core/character-sheet-derived.ts"
import { type Ability } from "@dnd/core/types.ts"
import { useEffect, useState } from "react"

import {
  CLERIC_EXAMPLE_DRAFT,
  FIGHTER_EXAMPLE_DRAFT
} from "#/components/character-creation/characterCreationPresets.ts"
import { displayValue } from "#/components/character-creation/characterCreationShared.tsx"
import {
  CharacterCreationStepContent,
  STEP_ORDER,
  STEP_TITLES,
  type StepId
} from "#/components/character-creation/CharacterCreationStepContent.tsx"
import { PageShell } from "#/components/PageShell.tsx"

const STORAGE_KEY = "dnd.characterDraft.v1"

function parseStoredDraft(): CharacterDraft {
  if (typeof window === "undefined") return {}
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored == null) return {}
  try {
    return JSON.parse(stored) as CharacterDraft
  } catch {
    return {}
  }
}

function currentStepIndex(step: StepId): number {
  return STEP_ORDER.indexOf(step)
}

export function CharacterCreationPage() {
  const [draft, setDraft] = useState<CharacterDraft>(parseStoredDraft)
  const [currentStep, setCurrentStep] = useState<StepId>("class")

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const assessment = assessCharacterDraft(draft)
  const completeSheet = assessment.status === "complete" ? assessment.sheet : null
  const reviewOutputs =
    completeSheet == null
      ? null
      : {
          sheet: completeSheet,
          derived: deriveCharacterSheetNumbers(completeSheet),
          machineInput: characterSheetMachineInput(completeSheet),
          battleProjection: characterSheetBattleProjection(completeSheet)
        }

  function updateDraft(patch: Partial<CharacterDraft>) {
    setDraft((current) => applyCharacterDraftUpdate(current, patch))
  }

  function setAbilityScore(ability: Ability, score: number) {
    setDraft((current) =>
      applyCharacterDraftUpdate(current, {
        abilityScoreGeneration: {
          mode: current.abilityScoreGeneration?.mode ?? "standardArray",
          assignedScores: {
            ...current.abilityScoreGeneration?.assignedScores,
            [ability]: score
          }
        }
      })
    )
  }

  return (
    <PageShell
      title="Character Creation Workflow"
      actions={
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
            onClick={() => {
              setDraft(FIGHTER_EXAMPLE_DRAFT)
              setCurrentStep("review")
            }}
            type="button"
          >
            Load Fighter Example
          </button>
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
            onClick={() => {
              setDraft(CLERIC_EXAMPLE_DRAFT)
              setCurrentStep("review")
            }}
            type="button"
          >
            Load Cleric Example
          </button>
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-rose-500 hover:text-rose-300"
            onClick={() => {
              setDraft({})
              setCurrentStep("class")
            }}
            type="button"
          >
            Reset Draft
          </button>
        </div>
      }
    >
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Steps</h2>
          <ol className="space-y-2">
            {STEP_ORDER.map((step) => {
              const active = step === currentStep
              return (
                <li key={step}>
                  <button
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-amber-400 bg-amber-400/10 text-amber-200"
                        : "border-gray-800 bg-gray-950/60 text-gray-300 hover:border-gray-700"
                    }`}
                    onClick={() => setCurrentStep(step)}
                    type="button"
                  >
                    {STEP_TITLES[step]}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-6 rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm">
            <p className="font-medium text-gray-100">Canonical status</p>
            <p className={assessment.status === "complete" ? "mt-2 text-emerald-300" : "mt-2 text-amber-300"}>
              {assessment.status === "complete"
                ? "Draft is ready for review."
                : assessment.status === "invalid"
                  ? `${assessment.issues.length} illegal issue(s) require fixes.`
                  : `${assessment.openChoices.length} required choice(s) remain open.`}
            </p>
            <p className="mt-2 text-gray-400">
              This shell stores only <code>CharacterDraft</code>. Validation, sheet finalization, and projection output
              all come from core.
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm">
            <p className="font-medium text-gray-100">Open choices</p>
            {assessment.openChoices.length === 0 ? (
              <p className="mt-2 text-emerald-300">No open choices.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-gray-300">
                {assessment.openChoices.map((choice) => (
                  <li
                    key={`${choice.code}-${choice.message}`}
                    className="rounded-md border border-gray-800 bg-gray-900 px-2 py-2"
                  >
                    <p className="font-mono text-xs text-sky-300">{choice.code}</p>
                    <p className="mt-1 text-sm">{choice.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm">
            <p className="font-medium text-gray-100">Illegal state</p>
            {assessment.issues.length === 0 ? (
              <p className="mt-2 text-emerald-300">No illegal issues.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-gray-300">
                {assessment.issues.map((issue) => (
                  <li
                    key={`${issue.code}-${issue.message}`}
                    className="rounded-md border border-gray-800 bg-gray-900 px-2 py-2"
                  >
                    <p className="font-mono text-xs text-amber-300">{issue.code}</p>
                    <p className="mt-1 text-sm">{issue.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5">
            <h2 className="text-xl font-semibold text-amber-300">{STEP_TITLES[currentStep]}</h2>
            <p className="mt-2 text-sm text-gray-400">
              The shell follows the SRD step order from Character Creation while keeping the draft editable at any
              point.
            </p>
            <CharacterCreationStepContent
              currentStep={currentStep}
              draft={draft}
              displayValue={displayValue}
              draftStatus={assessment.status}
              reviewOutputs={reviewOutputs}
              setAbilityScore={setAbilityScore}
              updateDraft={updateDraft}
            />
            <div className="mt-6 flex items-center justify-between border-t border-gray-800 pt-4">
              <button
                className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-gray-500"
                disabled={currentStep === "class"}
                onClick={() => setCurrentStep(STEP_ORDER[Math.max(0, currentStepIndex(currentStep) - 1)])}
                type="button"
              >
                Previous
              </button>
              <button
                className="rounded-md border border-amber-500 px-3 py-2 text-sm text-amber-200 transition hover:bg-amber-500/10"
                disabled={currentStep === "review"}
                onClick={() =>
                  setCurrentStep(STEP_ORDER[Math.min(STEP_ORDER.length - 1, currentStepIndex(currentStep) + 1)])
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
