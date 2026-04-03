/**
 * Scripted 6-wizard battle demo: two fireballs, one CS chain.
 *
 * Teams: A,B,C (blue) vs D,E,F (red). 50 HP each.
 * A and D: no Counterspell (fireball slingers).
 * B,C,E,F: have Counterspell.
 * Initiative: A, D, B, E, C, F (alternating teams).
 *
 * Turn A: Fireball at red team. 4-deep CS chain (E→B→F→C), all reactions spent.
 *   D fails (50→22), E saves (50→36), F fails (50→22).
 * Turn D: Fireball at blue team. No counterspellers (all spent reactions).
 *   A saves (50→36), B fails (50→22), C fails (50→22).
 */
import type { BattleEvent, InitCreatureConfig } from "#/battle-machine-types.ts"
import type { ScenarioMeta } from "#/battle-scene/scene-snapshot.ts"
import type { DamageType } from "#/types.ts"

const WIZARD_HP = 50
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
  { id: "D", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: NO_CS },
  { id: "B", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS },
  { id: "E", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS },
  { id: "C", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS },
  { id: "F", maxHp: WIZARD_HP, kind: "PC", caster: true, preparedSpells: WITH_CS }
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

const startTurn: BattleEvent = {
  type: "BATTLE_START_TURN",
  rechargeD6: 1,
  sotDmg: 0,
  sotDt: "fire" as DamageType,
  sotHeal: 0,
  sotSaveResult: true,
  sotConSave: true
}

const endTurn: BattleEvent = {
  type: "BATTLE_END_TURN",
  eotSaveSucceeded: true,
  eotDmg: 0,
  eotDt: "fire" as DamageType,
  eotConSave: true
}

const SHATTER_DMG = 14
const SHATTER_DC = 15

const castShatter: BattleEvent = {
  type: "BATTLE_CAST_AOE",
  saveDC: SHATTER_DC,
  dmgOnFail: SHATTER_DMG,
  halfOnSave: true,
  dt: "thunder" as DamageType,
  cond: "deafened",
  applyCond: false,
  slotLvl: 2,
  spellName: "shatter",
  ritual: false
}

const castFireball: BattleEvent = {
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
}

const sfPass = (reactorId: string | null): BattleEvent => ({
  type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
  reactorId,
  decision: { tag: "RPass" as const }
})

const adPass = (reactorId: string | null): BattleEvent => ({
  type: "BATTLE_AFTER_DAMAGE_PASS",
  reactorId
})

export const FIREBALL_BATTLE: ReadonlyArray<BattleEvent> = [
  // === Init ===
  { type: "BATTLE_INIT", creatures: CREATURES },

  // === Turn A (Laser Wizard): Fireball at red team ===
  startTurn,
  castFireball, // event index 2

  // CS chain: E→B→F→C (4 deep, all succeed at base level)
  cs("E", false), // E counterspells A's Fireball
  cs("B", false), // B counter-CS E
  cs("F", false), // F counter-CS B
  cs("C", false), // C counter-CS F
  cs(null, false), // chain resolves: C>F, B stands, E fizzles → Fireball proceeds

  // AoE resolves on red team
  aoeTarget("D", 5), // D fails (50→22)
  // D has reaction (no CS prepared, didn't counterspell) → save-failed window
  sfPass("D"),
  sfPass(null),
  adPass("D"),
  adPass(null),
  aoeTarget("E", 17), // E saves (50→36, half=14)
  aoeTarget("F", 8), // F fails (50→22), no reaction (spent on CS)
  aoeTarget(null, 0), // AoE complete

  endTurn, // end A's turn

  // === Turn D (Mud Scamp): Fireball at blue team ===
  startTurn, // D's turn starts, D's reaction resets
  castFireball, // event index 18

  // No eligible counterspellers: B,C,E,F spent reactions; A has no CS; D is caster
  cs(null, false), // no CS window

  // AoE resolves on blue team
  aoeTarget("A", 16), // A saves (50→36, half=14). A has reaction → after-damage window
  adPass("A"),
  adPass(null),
  aoeTarget("B", 4), // B fails (50→22), no reaction (spent on CS)
  aoeTarget("C", 7), // C fails (50→22), no reaction (spent on CS)
  aoeTarget(null, 0), // AoE complete

  endTurn, // end D's turn

  // === Turns B, E, C, F ===
  startTurn,
  endTurn, // B: pass (no useful action)

  // === Turn E (Gray Elf): Shatter at A+B (10ft radius, level 2 slot) ===
  startTurn,
  castShatter, // targets A and B
  cs(null, false), // no CS eligible
  aoeTarget("A", 8), // A fails CON save (36→22). A has reaction.
  sfPass("A"),
  sfPass(null),
  adPass("A"),
  adPass(null),
  aoeTarget("B", 6), // B fails CON save (22→8). B has reaction (reset on B's turn).
  sfPass("B"),
  sfPass(null),
  adPass("B"),
  adPass(null),
  aoeTarget(null, 0), // Shatter complete
  endTurn, // E

  startTurn,
  endTurn, // C: pass
  startTurn,
  endTurn, // F: pass

  // === ROUND 2 ===

  // === Turn A: Fireball #2 at red team (D=22, E=36, F=22) ===
  startTurn,
  castFireball, // event index 49

  // CS chain again: E→B→F→C (everyone has 1 level-3 slot left)
  cs("E", false),
  cs("B", false),
  cs("F", false),
  cs("C", false),
  cs(null, false), // chain resolves, Fireball proceeds

  // AoE resolves
  aoeTarget("D", 3), // D fails (22→0) — KO!
  // D has reaction → save-failed + after-damage windows
  sfPass("D"),
  sfPass(null),
  adPass("D"),
  adPass(null),
  aoeTarget("E", 18), // E saves (36→22, half=14)
  aoeTarget("F", 6), // F fails (22→0) — KO! No reaction (spent on CS)
  aoeTarget(null, 0),

  endTurn, // end A's turn — D and F unconscious, E alone at 22 HP

  // === Turn D: unconscious, death save ===
  // D fails death save (sotSaveResult=false)
  {
    type: "BATTLE_START_TURN",
    rechargeD6: 1,
    sotDmg: 0,
    sotDt: "fire" as DamageType,
    sotHeal: 0,
    sotSaveResult: false,
    sotConSave: true
  },
  endTurn,

  // === Turn E: Shatter #2 at A+B (A=22, B=8) ===
  startTurn,
  castShatter,
  cs(null, false), // no CS eligible
  aoeTarget("A", 10), // A fails CON save (22→8)
  sfPass("A"),
  sfPass(null),
  adPass("A"),
  adPass(null),
  aoeTarget("B", 3), // B fails CON save (8→0) — KO!
  sfPass("B"),
  sfPass(null),
  adPass("B"),
  adPass(null),
  aoeTarget(null, 0),
  endTurn,

  // === Turn F: unconscious, death save (fails) ===
  {
    type: "BATTLE_START_TURN",
    rechargeD6: 1,
    sotDmg: 0,
    sotDt: "fire" as DamageType,
    sotHeal: 0,
    sotSaveResult: false,
    sotConSave: true
  },
  endTurn
]

/** Metadata for game engine rendering — not consumed by the battle machine. */
export const FIREBALL_BATTLE_META = {
  teams: { blue: ["A", "B", "C"], red: ["D", "E", "F"] },
  names: {
    A: "Laser Wizard",
    B: "Forest Wizard",
    C: "Bufo",
    D: "Mud Scamp",
    E: "Gray Elf",
    F: "Ritual Wizard"
  },
  gridPositions: {
    A: { row: 3, col: 2 },
    B: { row: 5, col: 2 },
    C: { row: 7, col: 2 },
    D: { row: 3, col: 8 },
    E: { row: 5, col: 8 },
    F: { row: 7, col: 8 }
  },
  aoeTargetPoints: {
    "2": { row: 5, col: 8 },
    "18": { row: 5, col: 2 },
    "30": { row: 4, col: 2 },
    "49": { row: 5, col: 8 },
    "67": { row: 4, col: 2 }
  },
  spellAnnotations: {
    "2": "Fireball",
    "18": "Fireball",
    "30": "Shatter",
    "49": "Fireball",
    "67": "Shatter"
  }
} satisfies ScenarioMeta
