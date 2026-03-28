/* eslint-disable max-lines */
import { useCallback, useEffect, useRef, useState } from "react"

import { HighlightedQuint } from "#/components/demo/HighlightedQuint.tsx"
import { type QuintSnippet, SNIPPETS } from "#/components/demo/quint-snippets.ts"

import { FIELD_GROUPS, type NormalizedState, SAMPLE_TRACE, type TraceStep } from "./sample-trace.ts"

/** Map Quint action names to their spec snippets */
const ACTION_SNIPPETS: Partial<Record<string, QuintSnippet>> = {
  // Core actions
  doTakeDamage: SNIPPETS.takeDamage,
  doHeal: SNIPPETS.heal,
  doDeathSave: SNIPPETS.deathSave,
  doStartTurn: SNIPPETS.startTurn,
  doEndTurn: SNIPPETS.endTurn,
  doUseAction: SNIPPETS.useAction,
  doUseMovement: SNIPPETS.useMovement,
  doUseExtraAttack: SNIPPETS.useExtraAttack,
  doEnterCombat: SNIPPETS.enterCombat,
  doExitCombat: SNIPPETS.exitCombat,
  doStandFromProne: SNIPPETS.standFromProne,
  doShortRest: SNIPPETS.shortRest,
  doLongRest: SNIPPETS.longRest,
  // Fighter actions
  doUseSecondWind: SNIPPETS.secondWind,
  doUseActionSurge: SNIPPETS.actionSurge,
  doUseIndomitable: SNIPPETS.indomitable,
  doUseTacticalMind: SNIPPETS.tacticalMind,
  doScoreCriticalHit: SNIPPETS.remarkableAthlete
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(val: unknown): string {
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]"
    return `[${val.join(", ")}]`
  }
  if (typeof val === "boolean") return val ? "true" : "false"
  return String(val)
}

function valuesMatch(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return a === b
}

/** Return the set of field names that changed between prev and current state */
function changedFields(prev: NormalizedState | null, curr: NormalizedState): Set<string> {
  if (!prev) return new Set()
  const changed = new Set<string>()
  for (const key of Object.keys(curr) as Array<keyof NormalizedState>) {
    if (!valuesMatch(prev[key], curr[key])) {
      changed.add(key)
    }
  }
  return changed
}

/** Map from Quint action names to human-readable labels */
const ACTION_LABELS: Record<string, string> = {
  init: "Initialize",
  doTakeDamage: "Take Damage",
  doHeal: "Heal",
  doGrantTempHp: "Grant Temp HP",
  doDeathSave: "Death Save",
  doStabilize: "Stabilize",
  doKnockOut: "Knock Out",
  doApplyCondition: "Apply Condition",
  doRemoveCondition: "Remove Condition",
  doAddExhaustion: "Add Exhaustion",
  doReduceExhaustion: "Reduce Exhaustion",
  doStartTurn: "Start Turn",
  doEndTurn: "End Turn",
  doUseAction: "Use Action",
  doUseBonusAction: "Use Bonus Action",
  doUseReaction: "Use Reaction",
  doUseMovement: "Use Movement",
  doUseExtraAttack: "Use Extra Attack",
  doStandFromProne: "Stand from Prone",
  doDropProne: "Drop Prone",
  doEnterCombat: "Enter Combat",
  doExitCombat: "Exit Combat",
  doUseSecondWind: "Second Wind",
  doUseActionSurge: "Action Surge",
  doUseIndomitable: "Use Indomitable",
  doUseHeroicInspiration: "Use Heroic Inspiration",
  doShortRest: "Short Rest",
  doLongRest: "Long Rest"
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({
  index,
  isCurrent,
  isVisited,
  onClick,
  step
}: {
  index: number
  step: TraceStep
  isCurrent: boolean
  isVisited: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={`Step ${index}: ${step.quintAction}`}
      className={`
        flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-mono
        transition-all duration-150
        ${
          isCurrent
            ? "bg-amber-500 text-gray-900 outline outline-2 outline-offset-2 outline-amber-300 font-bold"
            : isVisited
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-gray-800/40 text-gray-600 hover:bg-gray-700 hover:text-gray-400"
        }
      `}
    >
      {index}
    </button>
  )
}

function SpecPanel({ snippet }: { snippet: QuintSnippet }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-700/40 bg-gray-950 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-900/60 border border-emerald-600/40 px-2 py-0.5 text-xs font-bold text-emerald-300">
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
          MBT verified
        </span>
        <code className="text-xs font-bold text-emerald-400">{snippet.name}</code>
      </div>
      <pre className="text-xs leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap bg-gray-900/50 rounded-md p-3 border border-gray-800/50">
        <HighlightedQuint source={snippet.source} />
      </pre>
      <div className="mt-2 text-[11px] text-gray-500">
        Fields: <span className="text-gray-400">{snippet.touchedFields.join(", ")}</span>
      </div>
    </div>
  )
}

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0
  const color = pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-amber-500" : pct > 0 ? "bg-red-500" : "bg-gray-600"
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">HP</span>
        <span className="text-sm font-bold text-white">
          {hp} / {maxHp}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MovementBar({ remaining, speed }: { remaining: number; speed: number }) {
  const pct = speed > 0 ? Math.round((remaining / speed) * 100) : 0
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Movement</span>
        <span className="text-sm font-bold text-white">
          {remaining} / {speed} ft
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 bg-sky-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Slot({ color, filled, label }: { filled: boolean; color: string; label: string }) {
  return (
    <div
      className={`w-5 h-5 rounded ${filled ? color : "bg-gray-700/50"} flex items-center justify-center`}
      title={label}
    >
      <span className="text-[8px] font-bold text-white/80">{label[0]}</span>
    </div>
  )
}

function ChargeDot({ color, filled }: { filled: boolean; color: string }) {
  return <div className={`w-2 h-2 rounded-full ${filled ? color : "bg-gray-700/50"}`} />
}

function ActionEconomy({ s }: { s: NormalizedState }) {
  if (s.turnPhase !== "acting") return null
  return (
    <div className="mt-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <span
          className="text-[10px] text-gray-500 uppercase font-semibold mr-0.5 cursor-help underline decoration-dotted decoration-gray-600"
          title="Actions remaining"
        >
          Act
        </span>
        {Array.from({ length: Math.max(s.actionsRemaining, 1) }, (_, i) => (
          <Slot key={i} filled={i < s.actionsRemaining} color="bg-blue-600" label="Action" />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span
          className="text-[10px] text-gray-500 uppercase font-semibold mr-0.5 cursor-help underline decoration-dotted decoration-gray-600"
          title="Bonus Action"
        >
          BA
        </span>
        <Slot filled={!s.bonusActionUsed} color="bg-amber-600" label="Bonus" />
      </div>
      <div className="flex items-center gap-1">
        <span
          className="text-[10px] text-gray-500 uppercase font-semibold mr-0.5 cursor-help underline decoration-dotted decoration-gray-600"
          title="Reaction"
        >
          Rxn
        </span>
        <Slot filled={s.reactionAvailable} color="bg-purple-600" label="Reaction" />
      </div>
      {s.extraAttacksRemaining > 0 && (
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] text-gray-500 uppercase font-semibold mr-0.5 cursor-help underline decoration-dotted decoration-gray-600"
            title="Extra Attacks remaining"
          >
            Extra
          </span>
          <Slot filled color="bg-red-600" label="Extra" />
          {s.extraAttacksRemaining > 1 && <span className="text-[10px] text-gray-400">x{s.extraAttacksRemaining}</span>}
        </div>
      )}
    </div>
  )
}

function FighterCharges({ s }: { s: NormalizedState }) {
  if (s.secondWindMax === 0 && s.actionSurgeMax === 0 && s.indomitableMax === 0) return null
  return (
    <div className="mt-2 flex items-center gap-4 flex-wrap">
      {s.secondWindMax > 0 && (
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] text-indigo-400 font-semibold cursor-help underline decoration-dotted decoration-gray-600"
            title="Second Wind"
          >
            SW
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: s.secondWindMax }, (_, i) => (
              <ChargeDot key={i} filled={i < s.secondWindCharges} color="bg-indigo-400" />
            ))}
          </div>
        </div>
      )}
      {s.actionSurgeMax > 0 && (
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] text-amber-400 font-semibold cursor-help underline decoration-dotted decoration-gray-600"
            title="Action Surge"
          >
            AS
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: s.actionSurgeMax }, (_, i) => (
              <ChargeDot key={i} filled={i < s.actionSurgeCharges} color="bg-amber-400" />
            ))}
          </div>
          {s.actionSurgeUsedThisTurn && <span className="text-[9px] text-amber-400/60 ml-0.5">used</span>}
        </div>
      )}
      {s.indomitableMax > 0 && (
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] text-emerald-400 font-semibold cursor-help underline decoration-dotted decoration-gray-600"
            title="Indomitable"
          >
            Ind
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: s.indomitableMax }, (_, i) => (
              <ChargeDot key={i} filled={i < s.indomitableCharges} color="bg-emerald-400" />
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1">
        <span
          className="text-[10px] text-gray-500 font-semibold cursor-help underline decoration-dotted decoration-gray-600"
          title="Hit Dice remaining"
        >
          HD
        </span>
        <span className="text-[10px] text-gray-400">
          {s.hitPointDiceRemaining}/{5}
        </span>
      </div>
    </div>
  )
}

function ConditionPills({ s }: { s: NormalizedState }) {
  const active: Array<string> = []
  if (s.unconscious) active.push("Unconscious")
  if (s.prone) active.push("Prone")
  if (s.blinded) active.push("Blinded")
  if (s.charmed) active.push("Charmed")
  if (s.frightened) active.push("Frightened")
  if (s.grappled) active.push("Grappled")
  if (s.paralyzed) active.push("Paralyzed")
  if (s.petrified) active.push("Petrified")
  if (s.poisoned) active.push("Poisoned")
  if (s.restrained) active.push("Restrained")
  if (s.stunned) active.push("Stunned")
  if (active.length === 0) return null
  return (
    <div className="mt-2 flex gap-1 flex-wrap">
      {active.map((c) => (
        <span
          key={c}
          className="px-1.5 py-0.5 rounded bg-red-900/40 border border-red-700/40 text-[10px] text-red-300 font-medium"
        >
          {c}
        </span>
      ))}
    </div>
  )
}

function DeathSavePips({ s }: { s: NormalizedState }) {
  if (s.hp > 0) return null
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-emerald-400 font-semibold">Save</span>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${i < s.deathSavesSuccesses ? "bg-emerald-500" : "bg-gray-700/50"}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-red-400 font-semibold">Fail</span>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${i < s.deathSavesFailures ? "bg-red-500" : "bg-gray-700/50"}`}
          />
        ))}
      </div>
    </div>
  )
}

function ActionHeader({ step }: { step: TraceStep }) {
  const label = ACTION_LABELS[step.quintAction] ?? step.quintAction
  const snippet = ACTION_SNIPPETS[step.quintAction]
  const s = step.quintState
  return (
    <div className="mb-4 rounded-lg bg-gray-800/80 border border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="rounded bg-violet-600/80 px-2 py-0.5 text-xs font-mono text-violet-100">Quint</span>
        <code className="text-sm text-violet-300">{step.quintAction}</code>
        <span className="text-gray-600 mx-1">&rarr;</span>
        <span className="rounded bg-sky-600/80 px-2 py-0.5 text-xs font-mono text-sky-100">XState</span>
        <code className="text-sm text-sky-300">{step.xstateEvent}</code>
      </div>
      <p className="text-sm text-gray-300">{step.description}</p>
      <div className="mt-2 text-sm font-semibold text-amber-400">{label}</div>
      <HpBar hp={s.hp} maxHp={s.maxHp} />
      {s.turnPhase !== "outOfCombat" && <MovementBar remaining={s.movementRemaining} speed={s.effectiveSpeed} />}
      <ActionEconomy s={s} />
      <FighterCharges s={s} />
      <ConditionPills s={s} />
      <DeathSavePips s={s} />
      {snippet && <SpecPanel snippet={snippet} />}
    </div>
  )
}

function FieldRow({
  changed,
  match,
  name,
  quintVal,
  xstateVal
}: {
  name: string
  quintVal: string
  xstateVal: string
  changed: boolean
  match: boolean
}) {
  const bgClass = changed ? "bg-emerald-950/40" : ""
  const nameClass = changed ? "text-emerald-400 font-medium" : "text-gray-500"
  const valClass = changed ? "text-emerald-300" : "text-gray-500"
  const mismatchClass = !match ? "text-red-400 font-bold" : ""

  return (
    <tr className={bgClass}>
      <td className={`px-3 py-1 font-mono text-xs ${nameClass}`}>{name}</td>
      <td className={`px-3 py-1 font-mono text-xs text-right ${valClass}`}>{quintVal}</td>
      <td className={`px-3 py-1 font-mono text-xs text-right ${valClass} ${mismatchClass}`}>{xstateVal}</td>
      <td className="px-2 py-1 text-center text-xs">{!match && <span className="text-red-400">{"\u2717"}</span>}</td>
    </tr>
  )
}

function StateTable({ prevState, step }: { step: TraceStep; prevState: NormalizedState | null }) {
  const changed = changedFields(prevState, step.quintState)
  const groups = FIELD_GROUPS

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Field</th>
            <th className="px-3 py-2 text-xs font-medium text-violet-400 uppercase tracking-wider text-right">Quint</th>
            <th className="px-3 py-2 text-xs font-medium text-sky-400 uppercase tracking-wider text-right">XState</th>
            <th className="px-2 py-2 w-6"></th>
          </tr>
        </thead>
        <tbody>
          {(Object.entries(groups) as Array<[string, ReadonlyArray<string>]>).map(([groupName, fields]) => {
            // Only show groups that have at least one changed or non-default field
            const hasChanged = fields.some((f) => changed.has(f))
            const hasNonDefault = fields.some((f) => {
              const val = step.quintState[f as keyof NormalizedState]
              if (typeof val === "boolean") return val
              if (typeof val === "number") return val !== 0
              if (typeof val === "string") return val !== "" && val !== "outOfCombat"
              if (Array.isArray(val)) return val.length > 0 && val.some((v) => v !== 0)
              return false
            })

            if (!hasChanged && !hasNonDefault) return null

            return <GroupRows key={groupName} groupName={groupName} fields={fields} step={step} changed={changed} />
          })}
        </tbody>
      </table>
    </div>
  )
}

function GroupRows({
  changed,
  fields,
  groupName,
  step
}: {
  groupName: string
  fields: ReadonlyArray<string>
  step: TraceStep
  changed: Set<string>
}) {
  return (
    <>
      <tr>
        <td colSpan={4} className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          {groupName}
        </td>
      </tr>
      {fields.map((field) => {
        const qVal = step.quintState[field as keyof NormalizedState]
        const xVal = step.xstateState[field as keyof NormalizedState]
        const isChanged = changed.has(field)
        const match = valuesMatch(qVal, xVal)

        // Skip unchanged default-valued fields to reduce noise
        if (!isChanged) {
          if (typeof qVal === "boolean" && !qVal) return null
          if (typeof qVal === "number" && qVal === 0) return null
          if (typeof qVal === "string" && (qVal === "" || qVal === "outOfCombat")) return null
          if (Array.isArray(qVal) && (qVal.length === 0 || qVal.every((v) => v === 0))) return null
        }

        return (
          <FieldRow
            key={field}
            name={field}
            quintVal={formatValue(qVal)}
            xstateVal={formatValue(xVal)}
            changed={isChanged}
            match={match}
          />
        )
      })}
    </>
  )
}

const VERIFICATION_ROWS: ReadonlyArray<{ aspect: string; source: string; verified: boolean }> = [
  { aspect: "NormalizedState shape", source: "machine.mbt.test.ts", verified: true },
  { aspect: "State transition logic", source: "Quint spec, field-by-field", verified: true },
  { aspect: "Fighter charge values", source: "Quint spec tables", verified: true },
  { aspect: "Action economy rules", source: "Quint spec", verified: true },
  { aspect: "Condition implications", source: "Quint spec", verified: true },
  { aspect: "Death save mechanics", source: "Quint spec", verified: true },
  { aspect: "HP/damage math", source: "Quint spec", verified: true },
  { aspect: "XState state values (right column)", source: "Real machine replay", verified: true },
  { aspect: "Trace sequence & dice rolls", source: "Hardcoded", verified: false },
  { aspect: "Quint state values (left column)", source: "Hand-computed", verified: false },
  { aspect: "Quint snippets", source: "Hand-extracted from dnd.qnt", verified: false }
]

function VerificationStatus() {
  return (
    <div className="mt-4 pt-3 border-t border-gray-800">
      <h4 className="text-gray-400 font-semibold mb-2">Verification status</h4>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-gray-600 uppercase tracking-wider">
            <th className="text-left py-1 pr-2">Aspect</th>
            <th className="text-left py-1 pr-2">Source</th>
            <th className="text-center py-1 w-8">MBT</th>
          </tr>
        </thead>
        <tbody>
          {VERIFICATION_ROWS.map((row) => (
            <tr key={row.aspect} className={row.verified ? "text-gray-500" : "text-gray-600"}>
              <td className="py-0.5 pr-2">{row.aspect}</td>
              <td className="py-0.5 pr-2 font-mono">{row.source}</td>
              <td className="py-0.5 text-center">{row.verified ? "\u2713" : "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PLAYBACK_SPEED_MS = 1200

export function TraceVisualizer() {
  const trace = SAMPLE_TRACE
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef(false)

  const goTo = useCallback(
    (idx: number) => {
      setCurrentStep(Math.max(0, Math.min(idx, trace.length - 1)))
    },
    [trace.length]
  )

  const goBack = useCallback(() => goTo(currentStep - 1), [goTo, currentStep])
  const goForward = useCallback(() => goTo(currentStep + 1), [goTo, currentStep])

  const togglePlay = useCallback(() => {
    setPlaying((prev) => {
      playRef.current = !prev
      return !prev
    })
  }, [])

  // Auto-advance
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      if (!playRef.current) return
      setCurrentStep((prev) => {
        if (prev >= trace.length - 1) {
          setPlaying(false)
          playRef.current = false
          return prev
        }
        return prev + 1
      })
    }, PLAYBACK_SPEED_MS)
    return () => clearInterval(timer)
  }, [playing, trace.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        setCurrentStep((prev) => Math.max(0, prev - 1))
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        setCurrentStep((prev) => Math.min(trace.length - 1, prev + 1))
      } else if (e.key === " ") {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [trace.length, togglePlay])

  const currentTraceStep = trace[currentStep]
  const prevState = currentStep > 0 ? trace[currentStep - 1].quintState : null
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-amber-400">MBT Trace Replay Visualizer</h1>
              <p className="text-xs text-gray-500 mt-0.5">D&D 5e Formal Spec &mdash; Quint / XState</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Timeline strip */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={goBack}
              disabled={currentStep === 0}
              className="rounded bg-gray-800 px-3 py-1.5 text-sm font-mono text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              &larr; Prev
            </button>
            <button
              onClick={togglePlay}
              className={`rounded px-3 py-1.5 text-sm font-mono transition ${
                playing
                  ? "bg-red-700 text-red-100 hover:bg-red-600"
                  : "bg-emerald-700 text-emerald-100 hover:bg-emerald-600"
              }`}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={goForward}
              disabled={currentStep === trace.length - 1}
              className="rounded bg-gray-800 px-3 py-1.5 text-sm font-mono text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next &rarr;
            </button>
            <span className="text-[10px] text-gray-600 ml-2">Arrow keys to navigate, Space to play/pause</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 py-2 px-1">
            {trace.map((s, i) => (
              <StepIndicator
                key={i}
                index={i}
                step={s}
                isCurrent={i === currentStep}
                isVisited={i <= currentStep}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column: action info + explanation */}
          <div className="lg:col-span-3">
            <ActionHeader step={currentTraceStep} />

            {/* How MBT works */}
            <div className="rounded-lg bg-gray-900 border border-gray-800 p-4 text-xs text-gray-500 leading-relaxed">
              <h3 className="text-gray-400 font-semibold text-sm mb-2">What is MBT?</h3>
              <p className="mb-2">
                <strong className="text-gray-300">Model-Based Testing</strong> generates random traces from the Quint
                formal spec using <code className="text-violet-400">quint run</code>, then replays each step against the
                XState state machine.
              </p>
              <p className="mb-2">
                After each step, <strong className="text-gray-300">every field</strong> of the normalized state is
                compared. A single mismatch fails the test. This is how we prove the implementation matches the spec.
              </p>
              <p>
                This trace shows a <strong className="text-gray-300">Level 5 Champion Fighter</strong> vs an Ogre:
                taking hits, Second Wind to heal, Action Surge for a four-attack turn, dropping to 0 HP, a clutch nat 20
                death save, standing from prone, and landing the killing blow at 1 HP.
              </p>

              {/* Legend */}
              <div className="mt-4 pt-3 border-t border-gray-800">
                <h4 className="text-gray-400 font-semibold mb-1.5">Legend</h4>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded bg-emerald-950/60 ring-1 ring-emerald-700"></span>
                    <span>Changed this step</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-mono text-xs">dim</span>
                    <span>Unchanged (non-default values shown)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400 font-mono text-xs">Quint</span>
                    <span>Spec state</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sky-400 font-mono text-xs">XState</span>
                    <span>Implementation state</span>
                  </div>
                </div>
              </div>

              {/* Verification status */}
              <VerificationStatus />
            </div>
          </div>

          {/* Right column: state diff table */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
              <div className="border-b border-gray-800 px-4 py-2.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300">State Comparison</h2>
                <span className="text-[10px] text-gray-600 font-mono">NormalizedState</span>
              </div>
              <StateTable step={currentTraceStep} prevState={prevState} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-gray-800 text-center">
          <a
            href="https://github.com/dearlordylord/5e-quint"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-300"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}
