/**
 * Scripted 6-wizard battle demo: Fireball + Counterspell chain.
 *
 * Teams: A,B,C (blue) vs D,E,F (red)
 * Sequence:
 *   1. A casts Fireball (AoE, fire, 28 dmg, DEX DC 15, half on save)
 *   2. D counterspells → B counter-counterspells → E counter-counterspells → C counter-counterspells
 *   3. Chain resolves: C beats E, so B's CS stands, so D's CS is countered → Fireball goes through
 *   4. AoE resolves: B,C,D,E fail saves (28 dmg → unconscious), F saves (14 dmg → alive)
 *   5. F's after-damage reaction window (renderer shows "Absorb Elements")
 */
import type { BattleEvent, InitCreatureConfig } from "#/battle-machine-types.ts"
import type { DamageType } from "#/types.ts"

const WIZARD_HP = 25
const FIREBALL_DMG = 28
const FIREBALL_DC = 15

// A and F don't have counterspell: A is the Fireball caster, F is the "selfish" wizard.
const WITH_CS: ReadonlySet<string> = new Set([
  "hold_person",
  "bless",
  "fireball",
  "counterspell",
  "guiding_bolt",
  "shield"
])

const NO_CS: ReadonlySet<string> = new Set([
  "hold_person",
  "bless",
  "fireball",
  "guiding_bolt",
  "shield",
  "absorb_elements"
])

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
  decision:
    reactorId && !saveSucceeded
      ? { tag: "RCounterspell" as const, saveSucceeded }
      : reactorId
        ? { tag: "RPass" as const }
        : null,
  csSlotLvl: slotLvl
})

const aoeTarget = (targetId: string | null, saveRoll: number): BattleEvent => ({
  type: "BATTLE_RESOLVE_AOE_TARGET",
  targetId,
  saveRoll
})

const afterDmgPass = (reactorId: string | null): BattleEvent => ({
  type: "BATTLE_AFTER_DAMAGE_PASS",
  reactorId
})

export const FIREBALL_SELFISHNESS: ReadonlyArray<BattleEvent> = [
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

  // --- Counterspell chain ---
  // D counterspells A's Fireball (succeeds — conSave failed)
  cs("D", false),
  // B counterspells D's CS (succeeds)
  cs("B", false),
  // E counterspells B's CS (succeeds)
  cs("E", false),
  // C counterspells E's CS (succeeds)
  cs("C", false),
  // No reactors left → chain unwinds:
  //   C's CS counters E's CS → E's CS fizzles → B's CS stands →
  //   B's CS counters D's CS → D's CS fizzles → Fireball proceeds
  cs(null, false),

  // --- AoE resolves: each target saves or fails ---
  // B,C,D,E fail (saveRoll < DC 15) → 28 damage → unconscious
  aoeTarget("B", 5),
  aoeTarget("C", 5),
  aoeTarget("D", 5),
  aoeTarget("E", 5),

  // F succeeds save (saveRoll >= 15) → half damage (14) → 11 HP → alive
  // After-damage reaction window opens (F has reaction available)
  aoeTarget("F", 17),

  // --- F's after-damage reaction (game engine renders as "Absorb Elements") ---
  afterDmgPass("F"),
  afterDmgPass(null),

  // --- AoE complete (remaining empty) → back to active turn ---
  aoeTarget(null, 0)
]

/** Metadata for game engine rendering — not consumed by the battle machine. */
export const FIREBALL_SELFISHNESS_META = {
  teams: { blue: ["A", "B", "C"], red: ["D", "E", "F"] },
  names: { A: "Aldric", B: "Brynn", C: "Cassia", D: "Dorian", E: "Elara", F: "Felix" },
  spellAnnotations: {
    3: "fireball",
    4: "counterspell",
    5: "counterspell",
    6: "counterspell",
    7: "counterspell",
    14: "absorb_elements"
  } satisfies Record<number, string>
} as const
