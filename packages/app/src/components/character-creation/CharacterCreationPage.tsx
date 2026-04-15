import {
  assessCharacterDraft,
  type CharacterDraft,
  type CharacterDraftUpdatePreview,
  type CharacterLevelUpTransition,
  type CharacterSheetAdvancementPreview,
  previewCharacterDraftUpdate,
  previewCharacterSheetAdvancement
} from "@dnd/core/character-domain.ts"
import {
  characterSheetBattleProjection,
  characterSheetMachineInput,
  deriveCharacterSheetNumbers
} from "@dnd/core/character-sheet-derived.ts"
import { useCallback, useEffect, useState } from "react"

import {
  CLERIC_EXAMPLE_DRAFT,
  FIGHTER_EXAMPLE_DRAFT,
  FIGHTER_LEVEL5_EXAMPLE_DRAFT
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

function formatDroppedPath(path: ReadonlyArray<string>): string {
  return path.length === 0 ? "(root)" : path.join(".")
}

function LastChangePanel({ lastChange, onDismiss }: { lastChange: LastChange | null; onDismiss: () => void }) {
  if (lastChange == null) return null
  const dropped = lastChange.kind === "draft" ? lastChange.preview.droppedFacts : []
  const newlyOpened =
    lastChange.kind === "draft"
      ? lastChange.preview.newlyOpenedChoices
      : lastChange.preview.candidateAssessment.status === "complete"
        ? []
        : lastChange.preview.candidateAssessment.openChoices
  const newlyIntroduced =
    lastChange.kind === "draft"
      ? lastChange.preview.newlyIntroducedIssues
      : lastChange.preview.candidateAssessment.status === "invalid"
        ? lastChange.preview.candidateAssessment.issues
        : []

  if (dropped.length === 0 && newlyOpened.length === 0 && newlyIntroduced.length === 0) return null

  return (
    <div className="mt-4 rounded-lg border border-amber-700/60 bg-amber-950/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-amber-200">
          Last {lastChange.kind === "draft" ? "edit" : "advancement preview"} impact
        </p>
        <button
          aria-label="Dismiss last change panel"
          className="rounded-md border border-gray-700 px-2 text-xs text-gray-300 hover:border-gray-500"
          onClick={onDismiss}
          type="button"
        >
          ✕
        </button>
      </div>
      {dropped.length > 0 && (
        <div className="mt-2">
          <p className="text-xs uppercase tracking-wide text-amber-300">Dropped facts</p>
          <ul className="mt-1 space-y-1 text-gray-200">
            {dropped.map((fact) => (
              <li key={fact.path.join(".")} className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1">
                <p className="font-mono text-xs text-amber-200">{formatDroppedPath(fact.path)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {newlyOpened.length > 0 && (
        <div className="mt-2">
          <p className="text-xs uppercase tracking-wide text-sky-300">Newly opened choices</p>
          <ul className="mt-1 space-y-1 text-gray-200">
            {newlyOpened.map((choice) => (
              <li
                key={`${choice.code}-${choice.message}`}
                className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1"
              >
                <p className="font-mono text-xs text-sky-300">{choice.code}</p>
                <p className="text-xs text-gray-300">{choice.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {newlyIntroduced.length > 0 && (
        <div className="mt-2">
          <p className="text-xs uppercase tracking-wide text-rose-300">Newly introduced issues</p>
          <ul className="mt-1 space-y-1 text-gray-200">
            {newlyIntroduced.map((issue) => (
              <li
                key={`${issue.code}-${issue.message}`}
                className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1"
              >
                <p className="font-mono text-xs text-rose-300">{issue.code}</p>
                <p className="text-xs text-gray-300">{issue.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type LastChange =
  | { readonly kind: "draft"; readonly preview: CharacterDraftUpdatePreview }
  | { readonly kind: "advancement"; readonly preview: CharacterSheetAdvancementPreview }

export function CharacterCreationPage() {
  const [draft, setDraft] = useState<CharacterDraft>(parseStoredDraft)
  const [currentStep, setCurrentStep] = useState<StepId>("class")
  const [lastChange, setLastChange] = useState<LastChange | null>(null)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const goToStep = useCallback((offset: -1 | 1) => {
    setCurrentStep((step) => {
      const nextIndex = currentStepIndex(step) + offset
      if (nextIndex < 0 || nextIndex >= STEP_ORDER.length) return step
      return STEP_ORDER[nextIndex]
    })
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target != null) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return
      }
      if (event.key === "ArrowLeft") goToStep(-1)
      else if (event.key === "ArrowRight") goToStep(1)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [goToStep])

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
    const preview = previewCharacterDraftUpdate(draft, patch)
    setLastChange({ kind: "draft", preview })
    setDraft(preview.candidateDraft)
  }

  function advanceDraftFromReview(transition: CharacterLevelUpTransition) {
    if (completeSheet == null) return
    const preview = previewCharacterSheetAdvancement(completeSheet, transition)
    setLastChange({ kind: "advancement", preview })
    setDraft(preview.candidateDraft)
  }

  function loadPresetDraft(next: CharacterDraft, step: StepId) {
    setDraft(next)
    setCurrentStep(step)
    setLastChange(null)
  }

  return (
    <PageShell
      title="Character Creation Workflow"
      actions={
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
            onClick={() => loadPresetDraft(FIGHTER_EXAMPLE_DRAFT, "review")}
            type="button"
          >
            Load Fighter Example
          </button>
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
            onClick={() => loadPresetDraft(FIGHTER_LEVEL5_EXAMPLE_DRAFT, "review")}
            type="button"
          >
            Load Fighter Lv5
          </button>
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
            onClick={() => loadPresetDraft(CLERIC_EXAMPLE_DRAFT, "review")}
            type="button"
          >
            Load Cleric Example
          </button>
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-rose-500 hover:text-rose-300"
            onClick={() => loadPresetDraft({}, "class")}
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
          <LastChangePanel lastChange={lastChange} onDismiss={() => setLastChange(null)} />
        </aside>

        <section className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5">
            <h2 className="text-xl font-semibold text-amber-300">{STEP_TITLES[currentStep]}</h2>
            <p className="mt-2 text-sm text-gray-400">
              The shell follows the SRD step order from Character Creation while keeping the draft editable at any
              point.
            </p>
            <CharacterCreationStepContent
              advanceDraft={advanceDraftFromReview}
              currentStep={currentStep}
              draft={draft}
              displayValue={displayValue}
              draftStatus={assessment.status}
              reviewOutputs={reviewOutputs}
              updateDraft={updateDraft}
            />
            <div className="mt-6 flex items-center justify-between border-t border-gray-800 pt-4">
              <button
                aria-label="Previous step"
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentStep === "class"}
                onClick={() => goToStep(-1)}
                type="button"
              >
                <span aria-hidden="true">←</span> Previous
              </button>
              <span className="text-xs text-gray-500">
                Step {currentStepIndex(currentStep) + 1} of {STEP_ORDER.length} · use ← / → keys
              </span>
              <button
                aria-label="Next step"
                className="rounded-md border border-amber-500 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentStep === "review"}
                onClick={() => goToStep(1)}
                type="button"
              >
                Next <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
