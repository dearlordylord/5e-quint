/**
 * Scripted 6-wizard battle demo: Fireball + Counterspell chain.
 *
 * Teams: A,B,C (blue) vs D,E,F (red).
 * A and F don't have Counterspell prepared (A is the caster, F didn't prepare it).
 * Sequence:
 *   1. A casts Fireball (AoE, fire, 28 dmg, DEX DC 15, half on save)
 *   2. D counterspells → B counter-CS → E counter-CS → C counter-CS (4 deep)
 *   3. Chain resolves: C beats E, B's CS stands, D's CS countered → Fireball proceeds
 *   4. AoE resolves: B,C,D,E,F all fail saves (28 dmg → unconscious). A untouched.
 */
import type { BattleEvent, InitCreatureConfig } from "#/battle-machine-types.ts"
import type { DamageType } from "#/types.ts"

const WIZARD_HP = 25
const FIREBALL_DMG = 28
const FIREBALL_DC = 15

const WITH_CS: ReadonlySet<string> = new Set([
  "hold_person",
  "bless",
  "fireball",
  "counterspell",
  "guiding_bolt",
  "shield"
])

const NO_CS: ReadonlySet<string> = new Set(["hold_person", "bless", "fireball", "guiding_bolt", "shield"])

const CREATURES: ReadonlyArray<InitCreatureConfig> = [
  { id: "A", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: NO_CS },
  { id: "B", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS },
  { id: "C", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS },
  { id: "D", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS },
  { id: "E", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS },
  { id: "F", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: NO_CS }
]

const cs = (reactorId: string | null, saveSucceeded: boolean, slotLvl = 3): BattleEvent => ({
  type: "BATTLE_RESOLVE_COUNTERSPELL",
  reactorId,
  decision: reactorId != null ? { tag: "RCounterspell" as const, saveSucceeded } : null,
  csSlotLvl: slotLvl
})

const aoeTarget = (targetId: string | null, saveRoll: number): BattleEvent => ({
  type: "BATTLE_RESOLVE_AOE_TARGET",
  targetId,
  saveRoll
})

export const FIREBALL_BATTLE: ReadonlyArray<BattleEvent> = [
  // --- Init & turn start ---
  { type: "BATTLE_INIT", creatures: CREATURES },
  {
    type: "BATTLE_START_TURN",
    rechargeD6: 1,
    sotDmg: 0,
    sotDt: "fire" as DamageType,
    sotHeal: 0,
    sotSaveResult: true,
    sotConSave: true
  },

  // --- A casts Fireball ---
  {
    type: "BATTLE_CAST_AOE",
    saveDC: FIREBALL_DC,
    dmgOnFail: FIREBALL_DMG,
    halfOnSave: true,
    dt: "fire" as DamageType,
    cond: "blinded",
    applyCond: false,
    slotLvl: 3,
    spellName: "fireball",
    ritual: false
  },

  // --- Counterspell chain (4 deep) ---
  // Eligible: B,C,D,E (A and F don't have counterspell prepared)
  cs("D", false), // D counterspells A's Fireball (succeeds)
  cs("B", false), // B counter-counterspells D's CS (succeeds)
  cs("E", false), // E counter-counterspells B's CS (succeeds)
  cs("C", false), // C counter-counterspells E's CS (succeeds)
  // No reactors left (all spent reactions, A and F ineligible)
  // Chain resolves: C beats E → E fizzles → B stands → B beats D → D fizzles → Fireball proceeds
  cs(null, false),

  // --- AoE resolves: all 5 targets fail saves → 28 damage → unconscious ---
  aoeTarget("B", 5),
  aoeTarget("C", 5),
  aoeTarget("D", 5),
  aoeTarget("E", 5),
  aoeTarget("F", 5),
  // F has reaction available (didn't counterspell) → save-failed LR window opens
  {
    type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
    reactorId: "F",
    decision: { tag: "RPass" as const }
  } satisfies BattleEvent,
  {
    type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
    reactorId: null,
    decision: { tag: "RPass" as const }
  } satisfies BattleEvent,
  // After damage applied, after-damage reaction window opens (F had reaction)
  { type: "BATTLE_AFTER_DAMAGE_PASS", reactorId: "F" } satisfies BattleEvent,
  { type: "BATTLE_AFTER_DAMAGE_PASS", reactorId: null } satisfies BattleEvent,

  // --- AoE complete → back to active turn ---
  aoeTarget(null, 0)
]

/** Metadata for game engine rendering — not consumed by the battle machine. */
export const FIREBALL_BATTLE_META = {
  teams: { blue: ["A", "B", "C"], red: ["D", "E", "F"] },
  names: { A: "Aldric", B: "Brynn", C: "Cassia", D: "Dorian", E: "Elara", F: "Felix" }
} as const
