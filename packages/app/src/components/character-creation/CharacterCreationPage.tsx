import { type CharacterDraft, createCharacterDraft, type CreationBatchFillIssue } from "@dnd/character-creation-runtime"
import type { CharacterSheet } from "@dnd/character-sheet-runtime"
import { Either } from "effect"
import { useCallback, useEffect, useState } from "react"

import { CHARACTER_CREATION_PRESETS } from "#/components/character-creation/characterCreationPresets.ts"
import {
  appendStoredCharacterSheet,
  applyCharacterCreationFill,
  assessCharacterDraft,
  characterSheetSummary,
  createCharacterSheetFromDraft
} from "#/components/character-creation/characterCreationRuntime.ts"
import {
  CharacterCreationStepContent,
  STEP_ORDER,
  STEP_TITLES,
  type StepId
} from "#/components/character-creation/CharacterCreationStepContent.tsx"
import { PageShell } from "#/components/PageShell.tsx"

function currentStepIndex(step: StepId): number {
  return STEP_ORDER.indexOf(step)
}

function issueKey(issue: CreationBatchFillIssue): string {
  return `${issue.tag}-${issue.code}-${issue.message}`
}

export function CharacterCreationPage() {
  const [draft, setDraft] = useState<CharacterDraft>(() => createCharacterDraft({}))
  const [sheets, setSheets] = useState<ReadonlyArray<CharacterSheet>>([])
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(() => sheets[0]?.characterId ?? null)
  const [currentStep, setCurrentStep] = useState<StepId>("class")
  const [lastIssues, setLastIssues] = useState<ReadonlyArray<CreationBatchFillIssue>>([])
  const [lastSheetIssue, setLastSheetIssue] = useState<string | null>(null)
  const assessment = assessCharacterDraft(draft)

  const goToStep = useCallback((offset: -1 | 1) => {
    setCurrentStep((step) => {
      const nextIndex = currentStepIndex(step) + offset
      if (nextIndex < 0 || nextIndex >= STEP_ORDER.length) return step
      return STEP_ORDER[nextIndex]
    })
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target.isContentEditable) return
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
          {CHARACTER_CREATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
              onClick={() => {
                setDraft(preset.draft)
                setCurrentStep("review")
                setLastIssues([])
                setLastSheetIssue(null)
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
              setLastSheetIssue(null)
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
            <p className="font-medium text-gray-100">Character creation status</p>
            <p className={assessment.finalization.tag === "ready" ? "mt-2 text-emerald-300" : "mt-2 text-amber-300"}>
              {assessment.finalization.tag === "ready"
                ? "Draft finalizes to a Character Build."
                : assessment.finalization.tag === "invalid"
                  ? `${assessment.finalization.issues.length} finalization issue(s) require fixes.`
                  : `${assessment.holes.length} creation hole(s) remain open.`}
            </p>
            <p className="mt-2 text-gray-400">
              Character creation stores durable build evidence. Finalizing creates a local Character Sheet for in-play
              state.
            </p>
            <button
              className="mt-3 w-full rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={assessment.finalization.tag !== "ready"}
              onClick={() => {
                const sheet = createCharacterSheetFromDraft(draft)
                if (Either.isLeft(sheet)) {
                  setLastSheetIssue(sheet.left.message)
                  return
                }
                setSheets((storedSheets) => appendStoredCharacterSheet(storedSheets, sheet.right))
                setSelectedSheetId(sheet.right.characterId)
                setLastSheetIssue(null)
              }}
              type="button"
            >
              Finalize Character Sheet
            </button>
            {lastSheetIssue === null ? null : <p className="mt-2 text-rose-200">{lastSheetIssue}</p>}
          </div>
          <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm">
            <p className="font-medium text-gray-100">Character Sheets</p>
            {sheets.length === 0 ? (
              <p className="mt-2 text-gray-400">No local Character Sheets.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {sheets.map((sheet) => {
                  const summary = characterSheetSummary(sheet)
                  const selected = selectedSheetId === sheet.characterId
                  if (Either.isLeft(summary)) {
                    return (
                      <li key={sheet.characterId}>
                        <div className="rounded-md border border-rose-900/80 bg-black/20 px-3 py-2 text-sm text-rose-100">
                          {summary.left.message}
                        </div>
                      </li>
                    )
                  }
                  return (
                    <li key={sheet.characterId}>
                      <button
                        className={`w-full rounded-md border px-3 py-2 text-left transition ${
                          selected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-100"
                            : "border-gray-800 bg-black/20 text-gray-300 hover:border-gray-700"
                        }`}
                        onClick={() => setSelectedSheetId(sheet.characterId)}
                        type="button"
                      >
                        <span className="block truncate">{summary.right.characterId}</span>
                        <span className="mt-1 block text-xs text-gray-400">
                          HP {summary.right.currentHp}/{summary.right.maximumHp}
                          {summary.right.tempHp === 0 ? "" : ` + ${summary.right.tempHp} temp`} ·{" "}
                          {summary.right.hitPointState}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
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
              The UI follows the SRD character-creation step order while submitting real runtime fills.
            </p>
            <CharacterCreationStepContent
              currentStep={currentStep}
              draft={draft}
              finalization={assessment.finalization}
              holes={assessment.holes}
              onFill={(fill) => {
                const result = applyCharacterCreationFill(draft, fill)
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
          {sheets.length === 0 ? null : (
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-5">
              <h2 className="text-xl font-semibold text-emerald-300">Character Session</h2>
              {sheets
                .filter((sheet) => sheet.characterId === selectedSheetId)
                .map((sheet) => {
                  const summary = characterSheetSummary(sheet)
                  if (Either.isLeft(summary)) {
                    return (
                      <div
                        key={sheet.characterId}
                        className="mt-4 rounded-md border border-rose-900 bg-black/20 p-3 text-sm text-rose-100"
                      >
                        {summary.left.message}
                      </div>
                    )
                  }
                  return (
                    <dl key={sheet.characterId} className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-md border border-gray-800 bg-black/20 p-3">
                        <dt className="text-gray-400">Character Sheet</dt>
                        <dd className="mt-1 break-all text-gray-100">{summary.right.characterId}</dd>
                      </div>
                      <div className="rounded-md border border-gray-800 bg-black/20 p-3">
                        <dt className="text-gray-400">Hit Points</dt>
                        <dd className="mt-1 text-gray-100">
                          {summary.right.currentHp}/{summary.right.maximumHp} · {summary.right.hitPointState}
                        </dd>
                      </div>
                      <div className="rounded-md border border-gray-800 bg-black/20 p-3">
                        <dt className="text-gray-400">Spell Slot State</dt>
                        <dd className="mt-1 text-gray-100">
                          {summary.right.spellSlots.length === 0
                            ? "No spell slot expenditures"
                            : summary.right.spellSlots
                                .map((slot) => `Level ${slot.spellLevel}: ${slot.expended}/${slot.count}`)
                                .join(", ")}
                        </dd>
                      </div>
                      <div className="rounded-md border border-gray-800 bg-black/20 p-3">
                        <dt className="text-gray-400">Pact Slot State</dt>
                        <dd className="mt-1 text-gray-100">
                          {summary.right.pactSlots === undefined
                            ? "No Pact Slots"
                            : `Level ${summary.right.pactSlots.slotLevel}: ${summary.right.pactSlots.expended}/${summary.right.pactSlots.count}`}
                        </dd>
                      </div>
                      <div className="rounded-md border border-gray-800 bg-black/20 p-3">
                        <dt className="text-gray-400">Hit Dice</dt>
                        <dd className="mt-1 text-gray-100">
                          {summary.right.hitDice
                            .map((pool) => `${pool.classUnitId}: ${pool.spent}/${pool.total} d${pool.dieSize}`)
                            .join(", ")}
                        </dd>
                      </div>
                      <div className="rounded-md border border-gray-800 bg-black/20 p-3">
                        <dt className="text-gray-400">Resources</dt>
                        <dd className="mt-1 text-gray-100">
                          {summary.right.resources.length === 0
                            ? "No tracked resources"
                            : summary.right.resources
                                .map((resource) => `${resource.unitId}: ${resource.expended}/${resource.count}`)
                                .join(", ")}
                        </dd>
                      </div>
                    </dl>
                  )
                })}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
