import { type CharacterDraft, createCharacterDraft, type CreationBatchFillIssue } from "@dnd/character-creation-runtime"
import { useCallback, useEffect, useState } from "react"

import { PROMOTED_CHARACTER_PRESETS } from "#/components/character-creation/characterCreationPresets.ts"
import {
  applyPromotedCreationFill,
  assessPromotedDraft,
  CHARACTER_DRAFT_STORAGE_KEY,
  parseStoredPromotedDraft
} from "#/components/character-creation/characterCreationRuntime.ts"
import {
  CharacterCreationStepContent,
  STEP_ORDER,
  STEP_TITLES,
  type StepId
} from "#/components/character-creation/CharacterCreationStepContent.tsx"
import { PageShell } from "#/components/PageShell.tsx"

function parseStoredDraft(): CharacterDraft {
  if (typeof window === "undefined") return createCharacterDraft({})
  const stored = window.localStorage.getItem(CHARACTER_DRAFT_STORAGE_KEY)
  if (stored == null) return createCharacterDraft({})
  try {
    const parsed = JSON.parse(stored) as unknown
    return parseStoredPromotedDraft(parsed) ?? createCharacterDraft({})
  } catch {
    return createCharacterDraft({})
  }
}

function currentStepIndex(step: StepId): number {
  return STEP_ORDER.indexOf(step)
}

function issueKey(issue: CreationBatchFillIssue): string {
  return `${issue.tag}-${issue.code}-${issue.message}`
}

export function CharacterCreationPage() {
  const [draft, setDraft] = useState<CharacterDraft>(parseStoredDraft)
  const [currentStep, setCurrentStep] = useState<StepId>("class")
  const [lastIssues, setLastIssues] = useState<ReadonlyArray<CreationBatchFillIssue>>([])
  const assessment = assessPromotedDraft(draft)

  useEffect(() => {
    window.localStorage.setItem(CHARACTER_DRAFT_STORAGE_KEY, JSON.stringify(draft))
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

  return (
    <PageShell
      title="Character Creation Workflow"
      actions={
        <div className="flex flex-wrap justify-center gap-2">
          {PROMOTED_CHARACTER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
              onClick={() => {
                setDraft(preset.draft)
                setCurrentStep("review")
                setLastIssues([])
              }}
              type="button"
            >
              Load {preset.label}
            </button>
          ))}
          <button
            className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-rose-500 hover:text-rose-300"
            onClick={() => {
              setDraft(createCharacterDraft({}))
              setCurrentStep("class")
              setLastIssues([])
            }}
            type="button"
          >
            Reset Draft
          </button>
        </div>
      }
    >
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
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
            <p className="font-medium text-gray-100">Promoted runtime status</p>
            <p className={assessment.finalization.tag === "ready" ? "mt-2 text-emerald-300" : "mt-2 text-amber-300"}>
              {assessment.finalization.tag === "ready"
                ? "Draft finalizes to CharacterBuild."
                : assessment.finalization.tag === "invalid"
                  ? `${assessment.finalization.issues.length} finalization issue(s) require fixes.`
                  : `${assessment.holes.length} creation hole(s) remain open.`}
            </p>
            <p className="mt-2 text-gray-400">
              This shell stores only promoted <code>CharacterDraft</code>. The runtime owns holes, fills, and
              finalization.
            </p>
          </div>
          {lastIssues.length === 0 ? null : (
            <div className="mt-4 rounded-lg border border-rose-900 bg-rose-950/20 p-3 text-sm">
              <p className="font-medium text-rose-200">Last rejected fill</p>
              <ul className="mt-2 space-y-2 text-rose-100">
                {lastIssues.map((issue) => (
                  <li key={issueKey(issue)} className="rounded-md border border-rose-900/80 bg-black/20 px-2 py-2">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section className="space-y-6">
          <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-5">
            <h2 className="text-xl font-semibold text-amber-300">{STEP_TITLES[currentStep]}</h2>
            <p className="mt-2 text-sm text-gray-400">
              The UI follows the SRD character-creation step order while submitting real promoted runtime fills.
            </p>
            <CharacterCreationStepContent
              currentStep={currentStep}
              draft={draft}
              finalization={assessment.finalization}
              holes={assessment.holes}
              onFill={(fill) => {
                const result = applyPromotedCreationFill(draft, fill)
                if (result.tag === "accepted") {
                  setDraft(result.draft)
                  setLastIssues([])
                } else {
                  setLastIssues(result.issues)
                }
              }}
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
