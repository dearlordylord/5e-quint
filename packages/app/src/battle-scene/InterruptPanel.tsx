import { battleMachine } from "@dnd/core/battle-machine.ts"
import type { BattleContext, BattleEvent, PendingInterrupt, SpellStackEntry } from "@dnd/core/battle-machine-types.ts"
import type { ScenarioMeta } from "@dnd/core/battle-scene/scene-snapshot.ts"
import { useMemo } from "react"
import { createActor } from "xstate"

// --- Stack frame data model ---

interface StackFrame {
  readonly id: string
  readonly kind: string
  readonly title: string
  readonly subtitle: string
  readonly participants: ReadonlyArray<{ role: string; name: string; highlight?: "blue" | "red" | "amber" }>
  readonly stats: ReadonlyArray<{ label: string; value: string; color?: string }>
  readonly choices: ReadonlyArray<{ label: string; color: string }>
  readonly depth: number
}

type Names = Record<string, string>

function n(names: Names, id: string): string {
  return names[id] ?? id
}

function interruptFrame(pi: PendingInterrupt, await_: BattleContext["awaitCtx"], names: Names): StackFrame {
  const eligible = await_ ? [...await_.eligible] : []
  const offered = await_ ? [...await_.offered] : []
  const waiting = eligible.filter((id) => !offered.includes(id))

  switch (pi.tag) {
    case "PIAttackHit": {
      const ctx = pi.ctx
      return {
        id: "attackHit",
        kind: "ATTACK",
        title: "Attack Hits",
        subtitle: ctx.isCritical ? "CRITICAL HIT!" : `Roll ${ctx.attackRoll} vs AC ${ctx.targetAc}`,
        participants: [
          { role: "Attacker", name: n(names, ctx.attacker), highlight: "red" },
          { role: "Target", name: n(names, ctx.target), highlight: "blue" },
          ...waiting.map((id) => ({ role: "Can React", name: n(names, id), highlight: "amber" as const }))
        ],
        stats: [
          { label: "Damage", value: `${ctx.damage} ${ctx.damageType}`, color: "text-red-400" },
          ...(ctx.isCritical ? [{ label: "Crit", value: `≥${ctx.critRange}`, color: "text-yellow-400" }] : []),
          ...(ctx.knockOut ? [{ label: "Non-lethal", value: "Yes", color: "text-green-400" }] : [])
        ],
        choices: [
          { label: "Shield (+5 AC)", color: "text-sky-400" },
          { label: "Parry (+AC)", color: "text-sky-400" },
          { label: "Cutting Words (-die)", color: "text-purple-400" },
          { label: "Pass", color: "text-gray-500" }
        ],
        depth: 0
      }
    }
    case "PIAttackDamage": {
      const ctx = pi.ctx
      return {
        id: "attackDamage",
        kind: "DAMAGE",
        title: "Damage Incoming",
        subtitle: ctx.isCritical ? "Critical damage" : "Normal damage",
        participants: [
          { role: "Source", name: n(names, ctx.attacker), highlight: "red" },
          { role: "Target", name: n(names, ctx.target), highlight: "blue" },
          ...waiting.map((id) => ({ role: "Can React", name: n(names, id), highlight: "amber" as const }))
        ],
        stats: [{ label: "Damage", value: `${ctx.damage} ${ctx.damageType}`, color: "text-red-400" }],
        choices: [
          { label: "Uncanny Dodge (½)", color: "text-emerald-400" },
          { label: "Deflect Attacks (-N)", color: "text-emerald-400" },
          { label: "Pass", color: "text-gray-500" }
        ],
        depth: 0
      }
    }
    case "PIAfterDamage": {
      const ctx = pi.ctx
      return {
        id: "afterDamage",
        kind: "RETALIATE",
        title: "After Damage",
        subtitle: `${ctx.damageDealt} ${ctx.damageType} dealt`,
        participants: [
          { role: "Damaged", name: n(names, ctx.damagedCreature), highlight: "blue" },
          { role: "Source", name: n(names, ctx.damageSource), highlight: "red" },
          ...waiting.map((id) => ({ role: "Can React", name: n(names, id), highlight: "amber" as const }))
        ],
        stats: [{ label: "Dealt", value: `${ctx.damageDealt} ${ctx.damageType}`, color: "text-red-400" }],
        choices: [
          { label: "Hellish Rebuke", color: "text-orange-400" },
          { label: "Fire Shield", color: "text-orange-400" },
          { label: "Retaliation", color: "text-orange-400" },
          { label: "Pass → Conc Check", color: "text-gray-500" }
        ],
        depth: 0
      }
    }
    case "PISpellCast": {
      const ctx = pi.ctx
      return {
        id: "spellCast",
        kind: "SPELL",
        title: "Spell Being Cast",
        subtitle: ctx.spellName || "Unknown spell",
        participants: [
          { role: "Caster", name: n(names, ctx.caster), highlight: "red" },
          ...waiting.map((id) => ({ role: "Can Counter", name: n(names, id), highlight: "amber" as const }))
        ],
        stats: [
          ...(ctx.slotLvl > 0 ? [{ label: "Slot", value: `Level ${ctx.slotLvl}`, color: "text-violet-400" }] : []),
          ...(ctx.ritual ? [{ label: "Ritual", value: "Yes", color: "text-teal-400" }] : [])
        ],
        choices: [
          { label: "Counterspell", color: "text-violet-400" },
          { label: "Pass", color: "text-gray-500" }
        ],
        depth: 0
      }
    }
    case "PISaveFailed": {
      const ctx = pi.ctx
      return {
        id: "saveFailed",
        kind: "SAVE",
        title: "Save Failed",
        subtitle: ctx.saveSucceeded ? "Save succeeded (awaiting flip)" : "Failed saving throw",
        participants: [
          { role: "Caster", name: n(names, ctx.caster), highlight: "red" },
          { role: "Target", name: n(names, ctx.target), highlight: "blue" },
          ...waiting.map((id) => ({ role: "Can React", name: n(names, id), highlight: "amber" as const }))
        ],
        stats: [
          ...(ctx.damageOnFail > 0
            ? [{ label: "Damage", value: `${ctx.damageOnFail} ${ctx.damageType}`, color: "text-red-400" }]
            : []),
          ...(ctx.applyCondition && ctx.conditionOnFail != null
            ? [{ label: "Condition", value: ctx.conditionOnFail, color: "text-yellow-400" }]
            : [])
        ],
        choices: [
          { label: "Legendary Resistance", color: "text-amber-400" },
          { label: "Pass", color: "text-gray-500" }
        ],
        depth: 0
      }
    }
    case "PISaveFailedAoE": {
      const sf = pi.sf
      return {
        id: "saveFailedAoE",
        kind: "SAVE",
        title: "AoE Save Failed",
        subtitle: "Failed AoE saving throw",
        participants: [
          { role: "Caster", name: n(names, sf.caster), highlight: "red" },
          { role: "Target", name: n(names, sf.target), highlight: "blue" },
          ...waiting.map((id) => ({ role: "Can React", name: n(names, id), highlight: "amber" as const }))
        ],
        stats: [
          ...(sf.damageOnFail > 0
            ? [{ label: "Damage", value: `${sf.damageOnFail} ${sf.damageType}`, color: "text-red-400" }]
            : [])
        ],
        choices: [
          { label: "Legendary Resistance", color: "text-amber-400" },
          { label: "Pass", color: "text-gray-500" }
        ],
        depth: 0
      }
    }
  }
}

function spellStackFrame(entry: SpellStackEntry, depth: number, names: Names): StackFrame {
  const waiting = [...entry.offered].length < 1 ? ["(awaiting reactions)"] : []
  return {
    id: `cs_${depth}`,
    kind: "COUNTER",
    title: `Counterspell (depth ${depth})`,
    subtitle: `Countering ${n(names, entry.spellCasterId)}'s ${entry.spellName}`,
    participants: [
      { role: "Original Caster", name: n(names, entry.spellCasterId), highlight: "red" },
      ...waiting.map((w) => ({ role: w, name: "", highlight: "amber" as const }))
    ],
    stats: [
      ...(entry.slotLvl > 0
        ? [{ label: "Target Slot", value: `Level ${entry.slotLvl}`, color: "text-violet-400" }]
        : [])
    ],
    choices: [
      { label: "Counter-Counterspell", color: "text-violet-400" },
      { label: "Pass", color: "text-gray-500" }
    ],
    depth
  }
}

function buildStack(ctx: BattleContext, names: Names): ReadonlyArray<StackFrame> {
  if (!ctx.awaitCtx) return []
  const frames: ReadonlyArray<StackFrame> = [
    interruptFrame(ctx.awaitCtx.interrupt, ctx.awaitCtx, names),
    ...ctx.spellStack.map((entry, i) => spellStackFrame(entry, i + 1, names))
  ]
  return frames
}

// --- Visual components ---

const KIND_COLORS: Record<string, { border: string; bg: string; badge: string }> = {
  ATTACK: { border: "border-red-500/60", bg: "bg-red-950/30", badge: "bg-red-500/20 text-red-400" },
  DAMAGE: { border: "border-orange-500/60", bg: "bg-orange-950/30", badge: "bg-orange-500/20 text-orange-400" },
  RETALIATE: { border: "border-amber-500/60", bg: "bg-amber-950/30", badge: "bg-amber-500/20 text-amber-400" },
  SPELL: { border: "border-violet-500/60", bg: "bg-violet-950/30", badge: "bg-violet-500/20 text-violet-400" },
  COUNTER: { border: "border-fuchsia-500/60", bg: "bg-fuchsia-950/30", badge: "bg-fuchsia-500/20 text-fuchsia-400" },
  SAVE: { border: "border-yellow-500/60", bg: "bg-yellow-950/30", badge: "bg-yellow-500/20 text-yellow-400" }
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  blue: "text-sky-400",
  red: "text-red-400",
  amber: "text-amber-400"
}
const STACK_INDENT_PX = 24

function StackFrameCard({ frame, isTop }: { frame: StackFrame; isTop: boolean }) {
  const colors = KIND_COLORS[frame.kind] ?? KIND_COLORS["ATTACK"]

  return (
    <div
      className={`relative rounded-lg border-2 ${colors.border} ${colors.bg} transition-all duration-300 ${
        isTop ? "shadow-lg shadow-white/5 scale-[1.02]" : "opacity-75"
      }`}
      style={{ marginLeft: `${frame.depth * STACK_INDENT_PX}px` }}
    >
      {/* Connector line */}
      {frame.depth > 0 && (
        <div className="absolute -top-4 border-l-2 border-dashed border-gray-600 h-4" style={{ left: "-12px" }} />
      )}

      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${colors.badge}`}>{frame.kind}</span>
          <span className="font-semibold text-sm text-gray-100">{frame.title}</span>
          {isTop && (
            <span className="ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-white animate-pulse">
              ACTIVE
            </span>
          )}
        </div>

        {/* Subtitle */}
        <div className="text-xs text-gray-400 mb-2">{frame.subtitle}</div>

        {/* Participants + Stats row */}
        <div className="flex gap-4 mb-2">
          {/* Participants */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {frame.participants.map((p, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px]">
                <span className="text-gray-500">{p.role}:</span>
                <span className={`font-semibold ${HIGHLIGHT_COLORS[p.highlight ?? ""] ?? "text-gray-300"}`}>
                  {p.name}
                </span>
              </div>
            ))}
          </div>

          {/* Stats */}
          {frame.stats.length > 0 && (
            <div className="flex gap-3 ml-auto">
              {frame.stats.map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-[11px]">
                  <span className="text-gray-500">{s.label}:</span>
                  <span className={`font-mono font-bold ${s.color ?? "text-gray-300"}`}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reaction choices */}
        {isTop && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-700/50">
            {frame.choices.map((c, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border border-gray-700 ${c.color}`}>
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <div className="text-4xl mb-3 opacity-30">&#x2694;</div>
      <div className="text-sm font-semibold">No Active Interrupts</div>
      <div className="text-xs mt-1">Waiting for attack, spell, or reaction trigger</div>
    </div>
  )
}

// --- Main component ---

function replayBattleCtx(events: ReadonlyArray<BattleEvent>, upTo: number) {
  const actor = createActor(battleMachine)
  actor.start()
  for (let i = 0; i <= upTo && i < events.length; i++) {
    actor.send(events[i])
  }
  const ctx = actor.getSnapshot().context
  actor.stop()
  return ctx
}

export function InterruptPanel({
  cursor,
  events,
  meta
}: {
  events: ReadonlyArray<BattleEvent>
  cursor: number
  meta: ScenarioMeta
}) {
  const battleCtx = useMemo(() => replayBattleCtx(events, cursor), [events, cursor])
  const stack = useMemo(() => buildStack(battleCtx, meta.names), [battleCtx, meta.names])

  return (
    <div className="w-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-bold text-gray-200">Interrupt Stack</span>
        {stack.length > 0 && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
            depth {stack.length}
          </span>
        )}
      </div>

      {stack.length === 0 ? (
        <IdleState />
      ) : (
        <div className="flex flex-col gap-3">
          {stack.map((frame, i) => (
            <StackFrameCard key={frame.id} frame={frame} isTop={i === stack.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
