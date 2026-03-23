import { useT } from "#/i18n.ts"
import type { DndContext, DndSnapshot } from "#/machine.ts"
import { DEATH_SAVE_THRESHOLD, MAX_EXHAUSTION } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { ALL_CONDITIONS, SPELL_SLOT_LEVELS } from "#/types.ts"

type TrackLabel = "conscious" | "stable" | "unstable" | "dead"

function damageTrackLabel(snap: DndSnapshot): TrackLabel {
  if (snap.matches({ damageTrack: "dead" })) return "dead"
  if (snap.matches({ damageTrack: { dying: "stable" } })) return "stable"
  if (snap.matches({ damageTrack: { dying: "unstable" } })) return "unstable"
  return "conscious"
}

function HpBar({ ctx }: { readonly ctx: DndContext }) {
  const t = useT()
  const pct = ctx.maxHp > 0 ? Math.round((ctx.hp / ctx.maxHp) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>
          {t.hp}: {ctx.hp} / {ctx.maxHp}
        </span>
        {ctx.tempHp > 0 && (
          <span className="text-cyan-400">
            {t.tempHp}: {ctx.tempHp}
          </span>
        )}
      </div>
      <div className="h-4 bg-gray-700 rounded overflow-hidden">
        <div className="h-full bg-red-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function DeathSaveTracker({ ctx }: { readonly ctx: DndContext }) {
  const t = useT()
  const DOT_COUNT = DEATH_SAVE_THRESHOLD
  return (
    <div className="flex gap-4 text-sm">
      <div>
        <span className="text-gray-400">{t.successes}: </span>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <span key={i} className={i < ctx.deathSaves.successes ? "text-green-400" : "text-gray-600"}>
            ●
          </span>
        ))}
      </div>
      <div>
        <span className="text-gray-400">{t.failures}: </span>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <span key={i} className={i < ctx.deathSaves.failures ? "text-red-400" : "text-gray-600"}>
            ●
          </span>
        ))}
      </div>
    </div>
  )
}

function ExhaustionGauge({ level }: { readonly level: number }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{t.exhaustion}:</span>
      {Array.from({ length: MAX_EXHAUSTION }, (_, i) => (
        <span key={i} className={`w-3 h-3 rounded-full ${i < level ? "bg-purple-500" : "bg-gray-700"}`} />
      ))}
      <span className="text-purple-400 ml-1">
        {level}/{MAX_EXHAUSTION}
      </span>
    </div>
  )
}

function ConditionBadges({ ctx }: { readonly ctx: DndContext }) {
  const t = useT()
  const isIncap = isIncapacitated(ctx)
  return (
    <div>
      <h3 className="text-sm text-gray-400 mb-1">{t.conditions}</h3>
      <div className="flex flex-wrap gap-1">
        {ALL_CONDITIONS.map((c) => {
          const active = c === "incapacitated" ? isIncap : ctx[c as keyof DndContext] === true
          return (
            <span
              key={c}
              className={`px-2 py-0.5 rounded text-xs font-medium ${active ? "bg-amber-700 text-amber-100" : "bg-gray-800 text-gray-500"}`}
            >
              {t[c] || c}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function TurnResources({ ctx }: { readonly ctx: DndContext }) {
  const t = useT()
  const resources = [
    { label: t.action, used: ctx.actionUsed },
    { label: t.bonusAction, used: ctx.bonusActionUsed },
    { label: t.reaction, used: !ctx.reactionAvailable }
  ]
  return (
    <div>
      <h3 className="text-sm text-gray-400 mb-1">{t.turnResources}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {resources.map((r) => (
          <div key={r.label} className="flex justify-between">
            <span>{r.label}</span>
            <span className={r.used ? "text-red-400" : "text-green-400"}>{r.used ? t.used : t.available}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span>{t.movement}</span>
          <span>
            {ctx.movementRemaining} / {ctx.effectiveSpeed} ft
          </span>
        </div>
        <div className="flex justify-between">
          <span>{t.extraAttacks}</span>
          <span>
            {ctx.extraAttacksRemaining} {t.remaining}
          </span>
        </div>
      </div>
      {ctx.surprised && <span className="text-yellow-400 text-xs mt-1 block">{t.surprised}</span>}
      {ctx.dodging && <span className="text-blue-400 text-xs">{t.dodging}</span>}
      {ctx.disengaged && <span className="text-blue-400 text-xs ml-2">{t.disengaged}</span>}
    </div>
  )
}

function SpellSlotGrid({ ctx }: { readonly ctx: DndContext }) {
  const t = useT()
  const hasSlots = ctx.slotsCurrent.some((s) => s > 0) || ctx.slotsMax.some((s) => s > 0)
  const hasPact = ctx.pactSlotsMax > 0
  if (!hasSlots && !hasPact) return null
  return (
    <div>
      <h3 className="text-sm text-gray-400 mb-1">{t.spellSlots}</h3>
      <div className="grid grid-cols-9 gap-1 text-center text-xs">
        {Array.from({ length: SPELL_SLOT_LEVELS }, (_, i) => (
          <div key={i} className="bg-gray-800 rounded p-1">
            <div className="text-gray-500">{i + 1}</div>
            <div className={ctx.slotsCurrent[i] > 0 ? "text-blue-400" : "text-gray-600"}>
              {ctx.slotsCurrent[i]}/{ctx.slotsMax[i]}
            </div>
          </div>
        ))}
      </div>
      {hasPact && (
        <div className="text-sm mt-1">
          {t.pactSlots}: {ctx.pactSlotsCurrent}/{ctx.pactSlotsMax} (L{ctx.pactSlotLevel})
        </div>
      )}
      {ctx.concentrationSpellId && (
        <div className="text-sm mt-1 text-yellow-400">
          {t.concentration}: {ctx.concentrationSpellId}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ color, label }: { readonly label: string; readonly color: string }) {
  return <span className={`px-3 py-1 rounded-full text-sm font-bold ${color}`}>{label}</span>
}

const TRACK_COLORS: Record<TrackLabel, string> = {
  conscious: "bg-green-800 text-green-200",
  unstable: "bg-red-800 text-red-200",
  stable: "bg-yellow-800 text-yellow-200",
  dead: "bg-gray-800 text-gray-400"
}

export function StatePanel({ ctx, snapshot }: { readonly snapshot: DndSnapshot; readonly ctx: DndContext }) {
  const t = useT()
  const track = damageTrackLabel(snapshot)
  return (
    <div className="space-y-4 bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t.state}</h2>
        <StatusBadge color={TRACK_COLORS[track]} label={t[track]} />
      </div>
      <HpBar ctx={ctx} />
      {track !== "conscious" && track !== "dead" && <DeathSaveTracker ctx={ctx} />}
      <ExhaustionGauge level={ctx.exhaustion} />
      <ConditionBadges ctx={ctx} />
      <TurnResources ctx={ctx} />
      <SpellSlotGrid ctx={ctx} />
    </div>
  )
}
