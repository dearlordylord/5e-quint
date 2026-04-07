/**
 * Visual catalog — pure data mappings for spell, damage type, and condition visuals.
 * No logic, no imports beyond domain types.
 */
import type { Condition, DamageType } from "#/types.ts"

export interface SpellVisual {
  color: string
  aoeShape?: "circle" | "cone" | "cube" | "line"
  castDurationMs: number
  label: string
}

export interface DamageTypeVisual {
  flashColor: string
  aoeColor: string
}

export interface ConditionVisual {
  tintColor?: string
  label: string
}

export const spellVisuals: Record<string, SpellVisual> = {
  fireball: { color: "#f97316", aoeShape: "circle", castDurationMs: 500, label: "Fireball" },
  counterspell: { color: "#8b5cf6", castDurationMs: 300, label: "Counterspell" },
  shatter: { color: "#93c5fd", aoeShape: "circle", castDurationMs: 400, label: "Shatter" },
  hold_person: { color: "#eab308", castDurationMs: 400, label: "Hold Person" },
  bless: { color: "#fbbf24", castDurationMs: 400, label: "Bless" },
  guiding_bolt: { color: "#facc15", castDurationMs: 350, label: "Guiding Bolt" },
  shield: { color: "#60a5fa", castDurationMs: 200, label: "Shield" },
  haste: { color: "#34d399", castDurationMs: 400, label: "Haste" },
  spirit_guardians: { color: "#f9fafb", castDurationMs: 500, label: "Spirit Guardians" },
  burning_hands: { color: "#ef4444", aoeShape: "cone", castDurationMs: 350, label: "Burning Hands" },
  inflict_wounds: { color: "#6b21a8", castDurationMs: 400, label: "Inflict Wounds" }
}

export const damageTypeVisuals: Record<DamageType, DamageTypeVisual> = {
  acid: { flashColor: "#84cc16", aoeColor: "#65a30d" },
  bludgeoning: { flashColor: "#9ca3af", aoeColor: "#6b7280" },
  cold: { flashColor: "#67e8f9", aoeColor: "#22d3ee" },
  fire: { flashColor: "#f97316", aoeColor: "#ea580c" },
  force: { flashColor: "#a78bfa", aoeColor: "#7c3aed" },
  lightning: { flashColor: "#fde047", aoeColor: "#eab308" },
  necrotic: { flashColor: "#a3a3a3", aoeColor: "#525252" },
  piercing: { flashColor: "#d4d4d8", aoeColor: "#a1a1aa" },
  poison: { flashColor: "#4ade80", aoeColor: "#22c55e" },
  psychic: { flashColor: "#e879f9", aoeColor: "#c026d3" },
  radiant: { flashColor: "#fef08a", aoeColor: "#fde047" },
  slashing: { flashColor: "#e5e5e5", aoeColor: "#d4d4d4" },
  thunder: { flashColor: "#93c5fd", aoeColor: "#dc2626" }
}

export const conditionVisuals: Record<Condition, ConditionVisual> = {
  blinded: { tintColor: "#1f2937", label: "Blinded" },
  charmed: { tintColor: "#ec4899", label: "Charmed" },
  deafened: { tintColor: "#6b7280", label: "Deafened" },
  frightened: { tintColor: "#7c3aed", label: "Frightened" },
  grappled: { tintColor: "#d97706", label: "Grappled" },
  incapacitated: { tintColor: "#4b5563", label: "Incapacitated" },
  invisible: { tintColor: "#e2e8f0", label: "Invisible" },
  paralyzed: { tintColor: "#fbbf24", label: "Paralyzed" },
  petrified: { tintColor: "#78716c", label: "Petrified" },
  poisoned: { tintColor: "#22c55e", label: "Poisoned" },
  prone: { tintColor: "#92400e", label: "Prone" },
  restrained: { tintColor: "#b45309", label: "Restrained" },
  stunned: { tintColor: "#fcd34d", label: "Stunned" },
  unconscious: { tintColor: "#374151", label: "Unconscious" }
}

/** Look up a spell visual, falling back to a generic default. */
export function getSpellVisual(spellName: string): SpellVisual {
  return (
    spellVisuals[spellName] ?? {
      color: "#9ca3af",
      castDurationMs: 400,
      label: spellName
    }
  )
}
