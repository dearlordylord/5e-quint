import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import { defineDriver, run, stateCheck } from "@firfi/quint-connect"
import { ITFBigInt } from "@firfi/quint-connect/zod"
import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { createActor } from "xstate"
import { z } from "zod"

import { fighterExtraAttacks } from "#/features/class-fighter.ts"
import type { MetamagicOption } from "#/features/class-sorcerer.ts"
import { type DndEvent, dndMachine, type DndSnapshot } from "#/machine.ts"
import { barbarianExtraAttacks } from "#/machine-barbarian.ts"
import { monkExtraAttacks } from "#/machine-monk.ts"
import { rangerExtraAttacks } from "#/machine-ranger.ts"
import type { ClassStateMap } from "#/machine-types.ts"
import type { ActionType, Condition, CreatureKind, DamageType, IncapSource, ShoveChoice, Size } from "#/types.ts"
import { d20Roll, healAmount, tempHp } from "#/types.ts"

// ============================================================
// Quint → TS enum mappings
// ============================================================

const QUINT_CONDITION_MAP: Record<string, Condition> = {
  CBlinded: "blinded",
  CCharmed: "charmed",
  CDeafened: "deafened",
  CFrightened: "frightened",
  CGrappled: "grappled",
  CIncapacitated: "incapacitated",
  CInvisible: "invisible",
  CParalyzed: "paralyzed",
  CPetrified: "petrified",
  CPoisoned: "poisoned",
  CProne: "prone",
  CRestrained: "restrained",
  CStunned: "stunned",
  CUnconscious: "unconscious"
}

const QUINT_ACTION_TYPE_MAP: Record<string, string> = {
  AAttack: "attack",
  AMagic: "magic",
  ADash: "dash",
  ADisengage: "disengage",
  ADodge: "dodge",
  AHelp: "help",
  AHide: "hide",
  AInfluence: "influence",
  AReady: "ready",
  ASearch: "search",
  AStudy: "study",
  AUtilize: "utilize"
}

const QUINT_SIZE_MAP: Record<string, Size> = {
  Tiny: "tiny",
  Small: "small",
  Medium: "medium",
  Large: "large",
  Huge: "huge",
  Gargantuan: "gargantuan"
}

const QUINT_SHOVE_MAP: Record<string, ShoveChoice> = {
  ShoveProne: "prone",
  ShovePush: "push"
}

const QUINT_INCAP_SOURCE_MAP: Record<string, IncapSource> = {
  ISParalyzed: "paralyzed",
  ISPetrified: "petrified",
  ISStunned: "stunned",
  ISUnconscious: "unconscious",
  ISDirect: "direct"
}

// CreatureKind variants match TS values exactly — no mapping needed, just type assertion
function mapCreatureKind(s: string): CreatureKind {
  return s === "Monster" ? "Monster" : "PC"
}

const QUINT_DAMAGE_TYPE_MAP: Record<string, DamageType> = {
  Acid: "acid",
  Bludgeoning: "bludgeoning",
  Cold: "cold",
  Fire: "fire",
  Force: "force",
  Lightning: "lightning",
  Necrotic: "necrotic",
  Piercing: "piercing",
  Poison: "poison",
  Psychic: "psychic",
  Radiant: "radiant",
  Slashing: "slashing",
  Thunder: "thunder"
}

// ============================================================
// Quint state schemas (all ints are bigint from ITF)
// ============================================================

const QuintDeathSaves = z.object({ successes: z.bigint(), failures: z.bigint() })

function variantToString(v: unknown): string {
  if (typeof v === "string") return v
  if (typeof v === "object" && v !== null) {
    if ("tag" in v) return String((v as Record<string, unknown>).tag)
    const keys = Object.keys(v)
    if (keys.length === 1) return keys[0]
  }
  return String(v)
}

/** Convert a Quint Map or plain object to a Record, applying a transform to each value. */
function quintMapToRecord<T>(raw: unknown, transform: (v: unknown) => T): Record<string, T> {
  const result: Record<string, T> = {}
  if (raw instanceof Map) {
    for (const [k, v] of raw) result[String(k)] = transform(v)
  } else if (typeof raw === "object" && raw !== null) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) result[k] = transform(v)
  }
  return result
}

function mapExpiryPhase(s: string): "start" | "end" {
  return s === "AtStartOfTurn" ? "start" : "end"
}

const QuintIncapSourceSet = z.any().transform((raw: unknown) => {
  let items: Array<string> = []
  if (raw instanceof Set) items = [...raw].map(variantToString)
  else if (Array.isArray(raw)) items = raw.map(variantToString)
  return new Set(items.map((s) => QUINT_INCAP_SOURCE_MAP[s] ?? s))
})

const QuintCreatureState = z.object({
  hp: z.bigint(),
  maxHp: z.bigint(),
  tempHp: z.bigint(),
  deathSaves: QuintDeathSaves,
  stable: z.boolean(),
  dead: z.boolean(),
  blinded: z.boolean(),
  charmed: z.boolean(),
  deafened: z.boolean(),
  exhaustion: z.bigint(),
  frightened: z.boolean(),
  grappled: z.boolean(),
  invisible: z.boolean(),
  paralyzed: z.boolean(),
  petrified: z.boolean(),
  poisoned: z.boolean(),
  prone: z.boolean(),
  restrained: z.boolean(),
  stunned: z.boolean(),
  unconscious: z.boolean(),
  incapacitatedSources: QuintIncapSourceSet,
  hitPointDiceRemaining: z.bigint(),
  activeEffects: z.any().transform((raw: unknown) => {
    const items: Array<{ spellId: string; turnsRemaining: number; expiresAt: string }> = []
    if (raw instanceof Set) {
      for (const e of raw) {
        const r = e as Record<string, unknown>
        items.push({
          spellId: String(r.spellId ?? ""),
          turnsRemaining: Number(r.turnsRemaining ?? r.remainingTurns ?? 0),
          expiresAt: mapExpiryPhase(variantToString(r.expiresAt))
        })
      }
    }
    return items.sort((a, b) => a.spellId.localeCompare(b.spellId))
  })
})

const QuintTurnState = z.object({
  movementRemaining: z.bigint(),
  effectiveSpeed: z.bigint(),
  actionsRemaining: z.bigint(),
  attackActionUsed: z.boolean(),
  bonusActionUsed: z.boolean(),
  reactionAvailable: z.boolean(),
  freeInteractionUsed: z.boolean(),
  extraAttacksRemaining: z.bigint(),
  disengaged: z.boolean(),
  dodging: z.boolean(),
  readiedAction: z.boolean(),
  bonusActionSpellCast: z.boolean(),
  nonCantripActionSpellCast: z.boolean(),
  bonusMovementRemaining: z.bigint(),
  bonusMovementOAFree: z.boolean()
})

const QuintSlotMap = z.any().transform((raw: unknown) => {
  const SLOT_LEVELS = 9
  const result: Array<number> = []
  if (raw instanceof Map) {
    for (let i = 1; i <= SLOT_LEVELS; i++) {
      const v = raw.get(BigInt(i)) ?? raw.get(i) ?? 0n
      result.push(Number(v))
    }
  } else if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>
    for (let i = 1; i <= SLOT_LEVELS; i++) {
      result.push(Number(obj[String(i)] ?? 0n))
    }
  }
  return result
})

const QuintSpellSlotState = z.object({
  slotsMax: QuintSlotMap,
  slotsCurrent: QuintSlotMap,
  pactSlotsMax: z.bigint(),
  pactSlotsCurrent: z.bigint(),
  pactSlotLevel: z.bigint(),
  concentrationSpellId: z.string()
})

const QuintFighterState = z.object({
  secondWindCharges: z.bigint(),
  secondWindMax: z.bigint(),
  actionSurgeCharges: z.bigint(),
  actionSurgeMax: z.bigint(),
  actionSurgeUsedThisTurn: z.boolean(),
  indomitableCharges: z.bigint(),
  indomitableMax: z.bigint(),
  heroicInspiration: z.boolean()
})

const QuintBarbarianState = z.object({
  raging: z.boolean(),
  rageCharges: z.bigint(),
  rageMaxCharges: z.bigint(),
  rageTurnsRemaining: z.bigint(),
  attackedOrForcedSaveThisTurn: z.boolean(),
  rageExtendedWithBA: z.boolean(),
  recklessThisTurn: z.boolean(),
  frenzyUsedThisTurn: z.boolean(),
  intimidatingPresenceUsed: z.boolean(),
  relentlessRageTimesUsed: z.bigint(),
  brutalStrikeUsedThisTurn: z.boolean()
})

const QuintMonkState = z.object({
  focusPoints: z.bigint(),
  focusMax: z.bigint(),
  uncannyMetabolismUsed: z.boolean(),
  stunningStrikeUsedThisTurn: z.boolean(),
  wholenessCharges: z.bigint(),
  wholenessMax: z.bigint()
})

// Stub class Zod schemas (prep for parallel integration)
const QuintPaladinState = z.object({
  layOnHandsPool: z.bigint(),
  layOnHandsMax: z.bigint(),
  channelDivinityCharges: z.bigint(),
  channelDivinityMax: z.bigint(),
  smiteFreeUsed: z.boolean()
})
const QuintRogueState = z.object({
  sneakAttackUsedThisTurn: z.boolean(),
  steadyAimUsedThisTurn: z.boolean(),
  cunningStrikeUsesThisTurn: z.bigint()
})
const QuintClericState = z.object({
  channelDivinityCharges: z.bigint(),
  channelDivinityMax: z.bigint()
})
const QuintDruidState = z.object({
  wildShapeCharges: z.bigint(),
  wildShapeMax: z.bigint(),
  inWildShape: z.boolean(),
  wildResurgenceSlotUsedThisLR: z.boolean()
})
const QuintSorcererState = z.object({
  sorceryPoints: z.bigint(),
  sorceryPointsMax: z.bigint(),
  sorcerousRestorationUsed: z.boolean(),
  innateSorceryActive: z.boolean(),
  innateSorceryCharges: z.bigint(),
  innateSorceryTurnsRemaining: z.bigint(),
  metamagicUsedThisCast: z.any().transform((raw: unknown) => {
    if (raw instanceof Set) return raw as Set<MetamagicOption>
    if (Array.isArray(raw)) return new Set(raw.map(String)) as Set<MetamagicOption>
    return new Set<MetamagicOption>()
  }),
  apotheosisUsedThisTurn: z.boolean()
})
const QuintWarlockState = z.object({
  mysticArcanumUsed: z.any().transform((raw: unknown) => {
    if (raw instanceof Set) return raw as Set<number>
    if (Array.isArray(raw)) return new Set(raw.map(Number))
    return new Set<number>()
  }),
  magicalCunningUsed: z.boolean(),
  eldritchSmiteUsedThisTurn: z.boolean()
})
const QuintWizardState = z.object({
  arcaneRecoveryUsed: z.boolean(),
  overchannelUsesThisLR: z.bigint()
})
const QuintRangerState = z.object({
  huntersMarkFreeUses: z.bigint(),
  tirelessCharges: z.bigint(),
  tirelessMax: z.bigint(),
  naturesVeilCharges: z.bigint(),
  naturesVeilMax: z.bigint()
})
const QuintBardState = z.object({
  bardicInspirationCharges: z.bigint(),
  bardicInspirationMax: z.bigint()
})

// Combined state from all Quint vars
const QuintFullState = z.object({
  state: QuintCreatureState,
  turnState: QuintTurnState,
  spellSlots: QuintSpellSlotState,
  turnPhase: z.string(),
  fighterState: QuintFighterState,
  fighterLevel: z.bigint(),
  barbarianState: QuintBarbarianState,
  barbarianLevel: z.bigint(),
  monkState: QuintMonkState,
  monkLevel: z.bigint(),
  paladinState: QuintPaladinState,
  paladinLevel: z.bigint(),
  rogueState: QuintRogueState,
  rogueLevel: z.bigint(),
  clericState: QuintClericState,
  clericLevel: z.bigint(),
  druidState: QuintDruidState,
  druidLevel: z.bigint(),
  sorcererState: QuintSorcererState,
  sorcererLevel: z.bigint(),
  warlockState: QuintWarlockState,
  warlockLevel: z.bigint(),
  wizardState: QuintWizardState,
  wizardLevel: z.bigint(),
  rangerState: QuintRangerState,
  rangerLevel: z.bigint(),
  bardState: QuintBardState,
  bardLevel: z.bigint(),
  creatureKind: z.any().transform(variantToString),
  monsterStatBlock: z.any(), // parsed but not compared field-by-field (StatBlock is config, not mutable state)
  monsterResourceState: z.object({
    legendaryActionsRemaining: z.bigint(),
    legendaryResistancesRemaining: z.bigint(),
    rechargeAvailable: z.any().transform((raw: unknown) => quintMapToRecord(raw, Boolean)),
    dailyUsesRemaining: z.any().transform((raw: unknown) => quintMapToRecord(raw, Number))
  })
})

// ============================================================
// Normalized comparison type (flat representation)
// ============================================================

interface NormalizedState {
  // CreatureState
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly deathSavesSuccesses: number
  readonly deathSavesFailures: number
  readonly stable: boolean
  readonly dead: boolean
  readonly blinded: boolean
  readonly charmed: boolean
  readonly deafened: boolean
  readonly exhaustion: number
  readonly frightened: boolean
  readonly grappled: boolean
  readonly invisible: boolean
  readonly paralyzed: boolean
  readonly petrified: boolean
  readonly poisoned: boolean
  readonly prone: boolean
  readonly restrained: boolean
  readonly stunned: boolean
  readonly unconscious: boolean
  readonly incapacitatedSources: ReadonlySet<string>
  readonly hitPointDiceRemaining: number
  readonly activeEffects: ReadonlyArray<{ spellId: string; turnsRemaining: number; expiresAt: string }>
  // TurnState
  readonly movementRemaining: number
  readonly effectiveSpeed: number
  readonly actionsRemaining: number
  readonly attackActionUsed: boolean
  readonly bonusActionUsed: boolean
  readonly reactionAvailable: boolean
  readonly freeInteractionUsed: boolean
  readonly extraAttacksRemaining: number
  readonly disengaged: boolean
  readonly dodging: boolean
  readonly readiedAction: boolean
  readonly bonusActionSpellCast: boolean
  readonly nonCantripActionSpellCast: boolean
  readonly bonusMovementRemaining: number
  readonly bonusMovementOAFree: boolean
  // turnPhase
  readonly turnPhase: string
  // SpellSlotState
  readonly slotsMax: ReadonlyArray<number>
  readonly slotsCurrent: ReadonlyArray<number>
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: string
  // FighterState
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
  readonly indomitableCharges: number
  readonly indomitableMax: number
  readonly heroicInspiration: boolean
  readonly fighterLevel: number
  readonly barbarianLevel: number
  // BarbarianState
  readonly raging: boolean
  readonly rageCharges: number
  readonly rageMaxCharges: number
  readonly rageTurnsRemaining: number
  readonly attackedOrForcedSaveThisTurn: boolean
  readonly rageExtendedWithBA: boolean
  readonly recklessThisTurn: boolean
  readonly frenzyUsedThisTurn: boolean
  readonly intimidatingPresenceUsed: boolean
  readonly relentlessRageTimesUsed: number
  readonly brutalStrikeUsedThisTurn: boolean
  readonly creatureKind: string
  // MonsterResourceState
  readonly legendaryActionsRemaining: number
  readonly legendaryResistancesRemaining: number
  readonly rechargeAvailable: Readonly<Record<string, boolean>>
  readonly dailyUsesRemaining: Readonly<Record<string, number>>
  // MonkState
  readonly monkLevel: number
  readonly focusPoints: number
  readonly focusMax: number
  readonly uncannyMetabolismUsed: boolean
  readonly stunningStrikeUsedThisTurn: boolean
  readonly wholenessCharges: number
  readonly wholenessMax: number
  // Stub class states
  readonly paladinLevel: number
  readonly layOnHandsPool: number
  readonly layOnHandsMax: number
  readonly paladinChannelDivinityCharges: number
  readonly paladinChannelDivinityMax: number
  readonly smiteFreeUsed: boolean
  readonly rogueLevel: number
  readonly sneakAttackUsedThisTurn: boolean
  readonly steadyAimUsedThisTurn: boolean
  readonly cunningStrikeUsesThisTurn: number
  readonly clericLevel: number
  readonly clericChannelDivinityCharges: number
  readonly clericChannelDivinityMax: number
  readonly druidLevel: number
  readonly wildShapeCharges: number
  readonly wildShapeMax: number
  readonly inWildShape: boolean
  readonly wildResurgenceSlotUsedThisLR: boolean
  readonly sorcererLevel: number
  readonly sorceryPoints: number
  readonly sorceryPointsMax: number
  readonly sorcerousRestorationUsed: boolean
  readonly innateSorceryActive: boolean
  readonly innateSorceryCharges: number
  readonly innateSorceryTurnsRemaining: number
  readonly metamagicUsedThisCast: ReadonlySet<MetamagicOption>
  readonly apotheosisUsedThisTurn: boolean
  readonly warlockLevel: number
  readonly mysticArcanumUsed: ReadonlySet<number>
  readonly magicalCunningUsed: boolean
  readonly eldritchSmiteUsedThisTurn: boolean
  readonly wizardLevel: number
  readonly arcaneRecoveryUsed: boolean
  readonly overchannelUsesThisLR: number
  // RangerState
  readonly rangerLevel: number
  readonly huntersMarkFreeUses: number
  readonly tirelessCharges: number
  readonly tirelessMax: number
  readonly naturesVeilCharges: number
  readonly naturesVeilMax: number
  // BardState
  readonly bardLevel: number
  readonly bardicInspirationCharges: number
  readonly bardicInspirationMax: number
}

// ============================================================
// XState snapshot → normalized state
// ============================================================

/** Flatten classStates into NormalizedState's flat fields (bridge format). */
function flattenClassStates(cs: Partial<ClassStateMap>) {
  const fi = cs.fighter
  const ba = cs.barbarian
  const mo = cs.monk
  const pa = cs.paladin
  const ro = cs.rogue
  const cl = cs.cleric
  const dr = cs.druid
  const so = cs.sorcerer
  const wk = cs.warlock
  const wi = cs.wizard
  const rn = cs.ranger
  const bd = cs.bard
  return {
    secondWindCharges: fi?.secondWindCharges ?? 0,
    secondWindMax: fi?.secondWindMax ?? 0,
    actionSurgeCharges: fi?.actionSurgeCharges ?? 0,
    actionSurgeMax: fi?.actionSurgeMax ?? 0,
    actionSurgeUsedThisTurn: fi?.actionSurgeUsedThisTurn ?? false,
    indomitableCharges: fi?.indomitableCharges ?? 0,
    indomitableMax: fi?.indomitableMax ?? 0,
    heroicInspiration: fi?.heroicInspiration ?? false,
    fighterLevel: fi?.level ?? 0,
    barbarianLevel: ba?.level ?? 0,
    raging: ba?.raging ?? false,
    rageCharges: ba?.rageCharges ?? 0,
    rageMaxCharges: ba?.rageMaxCharges ?? 0,
    rageTurnsRemaining: ba?.rageTurnsRemaining ?? 0,
    attackedOrForcedSaveThisTurn: ba?.attackedOrForcedSaveThisTurn ?? false,
    rageExtendedWithBA: ba?.rageExtendedWithBA ?? false,
    recklessThisTurn: ba?.recklessThisTurn ?? false,
    frenzyUsedThisTurn: ba?.frenzyUsedThisTurn ?? false,
    intimidatingPresenceUsed: ba?.intimidatingPresenceUsed ?? false,
    relentlessRageTimesUsed: ba?.relentlessRageTimesUsed ?? 0,
    brutalStrikeUsedThisTurn: ba?.brutalStrikeUsedThisTurn ?? false,
    monkLevel: mo?.level ?? 0,
    focusPoints: mo?.focusPoints ?? 0,
    focusMax: mo?.focusMax ?? 0,
    uncannyMetabolismUsed: mo?.uncannyMetabolismUsed ?? false,
    stunningStrikeUsedThisTurn: mo?.stunningStrikeUsedThisTurn ?? false,
    wholenessCharges: mo?.wholenessCharges ?? 0,
    wholenessMax: mo?.wholenessMax ?? 0,
    paladinLevel: pa?.level ?? 0,
    layOnHandsPool: pa?.layOnHandsPool ?? 0,
    layOnHandsMax: pa?.layOnHandsMax ?? 0,
    paladinChannelDivinityCharges: pa?.paladinChannelDivinityCharges ?? 0,
    paladinChannelDivinityMax: pa?.paladinChannelDivinityMax ?? 0,
    smiteFreeUsed: pa?.smiteFreeUsed ?? false,
    rogueLevel: ro?.level ?? 0,
    sneakAttackUsedThisTurn: ro?.sneakAttackUsedThisTurn ?? false,
    steadyAimUsedThisTurn: ro?.steadyAimUsedThisTurn ?? false,
    cunningStrikeUsesThisTurn: ro?.cunningStrikeUsesThisTurn ?? 0,
    clericLevel: cl?.level ?? 0,
    clericChannelDivinityCharges: cl?.clericChannelDivinityCharges ?? 0,
    clericChannelDivinityMax: cl?.clericChannelDivinityMax ?? 0,
    druidLevel: dr?.level ?? 0,
    wildShapeCharges: dr?.wildShapeCharges ?? 0,
    wildShapeMax: dr?.wildShapeMax ?? 0,
    inWildShape: dr?.inWildShape ?? false,
    wildResurgenceSlotUsedThisLR: dr?.wildResurgenceSlotUsedThisLR ?? false,
    sorcererLevel: so?.level ?? 0,
    sorceryPoints: so?.sorceryPoints ?? 0,
    sorceryPointsMax: so?.sorceryPointsMax ?? 0,
    sorcerousRestorationUsed: so?.sorcerousRestorationUsed ?? false,
    innateSorceryActive: so?.innateSorceryActive ?? false,
    innateSorceryCharges: so?.innateSorceryCharges ?? 0,
    innateSorceryTurnsRemaining: so?.innateSorceryTurnsRemaining ?? 0,
    metamagicUsedThisCast: so?.metamagicUsedThisCast ?? new Set<MetamagicOption>(),
    apotheosisUsedThisTurn: so?.apotheosisUsedThisTurn ?? false,
    warlockLevel: wk?.level ?? 0,
    mysticArcanumUsed: wk?.mysticArcanumUsed ?? new Set<number>(),
    magicalCunningUsed: wk?.magicalCunningUsed ?? false,
    eldritchSmiteUsedThisTurn: wk?.eldritchSmiteUsedThisTurn ?? false,
    wizardLevel: wi?.level ?? 0,
    arcaneRecoveryUsed: wi?.arcaneRecoveryUsed ?? false,
    overchannelUsesThisLR: wi?.overchannelUsesThisLR ?? 0,
    rangerLevel: rn?.level ?? 0,
    huntersMarkFreeUses: rn?.huntersMarkFreeUses ?? 0,
    tirelessCharges: rn?.tirelessCharges ?? 0,
    tirelessMax: rn?.tirelessMax ?? 0,
    naturesVeilCharges: rn?.naturesVeilCharges ?? 0,
    naturesVeilMax: rn?.naturesVeilMax ?? 0,
    bardLevel: bd?.level ?? 0,
    bardicInspirationCharges: bd?.bardicInspirationCharges ?? 0,
    bardicInspirationMax: bd?.bardicInspirationMax ?? 0
  }
}

function isDead(snap: DndSnapshot): boolean {
  return snap.matches({ damageTrack: "dead" })
}

function snapshotToNormalized(snap: DndSnapshot): NormalizedState {
  const c = snap.context
  const dead = isDead(snap)
  return {
    hp: c.hp,
    maxHp: c.maxHp,
    tempHp: c.tempHp,
    deathSavesSuccesses: c.deathSaves.successes,
    deathSavesFailures: c.deathSaves.failures,
    stable: c.stable,
    dead,
    blinded: c.blinded,
    charmed: c.charmed,
    deafened: c.deafened,
    exhaustion: c.exhaustion,
    frightened: c.frightened,
    grappled: c.grappled,
    invisible: c.invisible,
    paralyzed: c.paralyzed,
    petrified: c.petrified,
    poisoned: c.poisoned,
    prone: c.prone,
    restrained: c.restrained,
    stunned: c.stunned,
    unconscious: c.unconscious,
    incapacitatedSources: c.incapacitatedSources,
    hitPointDiceRemaining: c.hitDiceRemaining,
    activeEffects: [...c.activeEffects]
      .sort((a, b) => a.spellId.localeCompare(b.spellId))
      .map((ae) => ({ spellId: ae.spellId, turnsRemaining: ae.turnsRemaining, expiresAt: ae.expiresAt })),
    movementRemaining: c.movementRemaining,
    effectiveSpeed: c.effectiveSpeed,
    actionsRemaining: c.actionsRemaining,
    attackActionUsed: c.attackActionUsed,
    bonusActionUsed: c.bonusActionUsed,
    reactionAvailable: c.reactionAvailable,
    freeInteractionUsed: c.freeInteractionUsed,
    extraAttacksRemaining: c.extraAttacksRemaining,
    disengaged: c.disengaged,
    dodging: c.dodging,
    readiedAction: c.readiedAction,
    bonusActionSpellCast: c.bonusActionSpellCast,
    nonCantripActionSpellCast: c.nonCantripActionSpellCast,
    bonusMovementRemaining: c.bonusMovementRemaining,
    bonusMovementOAFree: c.bonusMovementOAFree,
    turnPhase: snap.matches({ turnPhase: "acting" })
      ? "acting"
      : snap.matches({ turnPhase: "waitingForTurn" })
        ? "waitingForTurn"
        : "outOfCombat",
    slotsMax: [...c.slotsMax],
    slotsCurrent: [...c.slotsCurrent],
    pactSlotsMax: c.pactSlotsMax,
    pactSlotsCurrent: c.pactSlotsCurrent,
    pactSlotLevel: c.pactSlotLevel,
    concentrationSpellId: c.concentrationSpellId,
    creatureKind: c.creatureKind,
    legendaryActionsRemaining: c.legendaryActionsRemaining,
    legendaryResistancesRemaining: c.legendaryResistancesRemaining,
    rechargeAvailable: c.rechargeAvailable,
    dailyUsesRemaining: c.dailyUsesRemaining,
    // Class states — extract locals to avoid repeated optional chains
    ...flattenClassStates(c.classStates)
  }
}

function quintParsedToNormalized(raw: z.infer<typeof QuintFullState>): NormalizedState {
  const s = raw.state
  const t = raw.turnState
  const ss = raw.spellSlots
  return {
    hp: Number(s.hp),
    maxHp: Number(s.maxHp),
    tempHp: Number(s.tempHp),
    deathSavesSuccesses: Number(s.deathSaves.successes),
    deathSavesFailures: Number(s.deathSaves.failures),
    stable: s.stable,
    dead: s.dead,
    blinded: s.blinded,
    charmed: s.charmed,
    deafened: s.deafened,
    exhaustion: Number(s.exhaustion),
    frightened: s.frightened,
    grappled: s.grappled,
    invisible: s.invisible,
    paralyzed: s.paralyzed,
    petrified: s.petrified,
    poisoned: s.poisoned,
    prone: s.prone,
    restrained: s.restrained,
    stunned: s.stunned,
    unconscious: s.unconscious,
    incapacitatedSources: s.incapacitatedSources,
    hitPointDiceRemaining: Number(s.hitPointDiceRemaining),
    activeEffects: s.activeEffects,
    movementRemaining: Number(t.movementRemaining),
    effectiveSpeed: Number(t.effectiveSpeed),
    actionsRemaining: Number(t.actionsRemaining),
    attackActionUsed: t.attackActionUsed,
    bonusActionUsed: t.bonusActionUsed,
    reactionAvailable: t.reactionAvailable,
    freeInteractionUsed: t.freeInteractionUsed,
    extraAttacksRemaining: Number(t.extraAttacksRemaining),
    disengaged: t.disengaged,
    dodging: t.dodging,
    readiedAction: t.readiedAction,
    bonusActionSpellCast: t.bonusActionSpellCast,
    nonCantripActionSpellCast: t.nonCantripActionSpellCast,
    bonusMovementRemaining: Number(t.bonusMovementRemaining),
    bonusMovementOAFree: t.bonusMovementOAFree,
    turnPhase: raw.turnPhase,
    slotsMax: ss.slotsMax,
    slotsCurrent: ss.slotsCurrent,
    pactSlotsMax: Number(ss.pactSlotsMax),
    pactSlotsCurrent: Number(ss.pactSlotsCurrent),
    pactSlotLevel: Number(ss.pactSlotLevel),
    concentrationSpellId: ss.concentrationSpellId,
    secondWindCharges: Number(raw.fighterState.secondWindCharges),
    secondWindMax: Number(raw.fighterState.secondWindMax),
    actionSurgeCharges: Number(raw.fighterState.actionSurgeCharges),
    actionSurgeMax: Number(raw.fighterState.actionSurgeMax),
    actionSurgeUsedThisTurn: raw.fighterState.actionSurgeUsedThisTurn,
    indomitableCharges: Number(raw.fighterState.indomitableCharges),
    indomitableMax: Number(raw.fighterState.indomitableMax),
    heroicInspiration: raw.fighterState.heroicInspiration,
    fighterLevel: Number(raw.fighterLevel),
    barbarianLevel: Number(raw.barbarianLevel),
    raging: raw.barbarianState.raging,
    rageCharges: Number(raw.barbarianState.rageCharges),
    rageMaxCharges: Number(raw.barbarianState.rageMaxCharges),
    rageTurnsRemaining: Number(raw.barbarianState.rageTurnsRemaining),
    attackedOrForcedSaveThisTurn: raw.barbarianState.attackedOrForcedSaveThisTurn,
    rageExtendedWithBA: raw.barbarianState.rageExtendedWithBA,
    recklessThisTurn: raw.barbarianState.recklessThisTurn,
    frenzyUsedThisTurn: raw.barbarianState.frenzyUsedThisTurn,
    intimidatingPresenceUsed: raw.barbarianState.intimidatingPresenceUsed,
    relentlessRageTimesUsed: Number(raw.barbarianState.relentlessRageTimesUsed),
    brutalStrikeUsedThisTurn: raw.barbarianState.brutalStrikeUsedThisTurn,
    creatureKind: raw.creatureKind,
    legendaryActionsRemaining: Number(raw.monsterResourceState.legendaryActionsRemaining),
    legendaryResistancesRemaining: Number(raw.monsterResourceState.legendaryResistancesRemaining),
    rechargeAvailable: raw.monsterResourceState.rechargeAvailable,
    dailyUsesRemaining: raw.monsterResourceState.dailyUsesRemaining,
    monkLevel: Number(raw.monkLevel),
    focusPoints: Number(raw.monkState.focusPoints),
    focusMax: Number(raw.monkState.focusMax),
    uncannyMetabolismUsed: raw.monkState.uncannyMetabolismUsed,
    stunningStrikeUsedThisTurn: raw.monkState.stunningStrikeUsedThisTurn,
    wholenessCharges: Number(raw.monkState.wholenessCharges),
    wholenessMax: Number(raw.monkState.wholenessMax),
    paladinLevel: Number(raw.paladinLevel),
    layOnHandsPool: Number(raw.paladinState.layOnHandsPool),
    layOnHandsMax: Number(raw.paladinState.layOnHandsMax),
    paladinChannelDivinityCharges: Number(raw.paladinState.channelDivinityCharges),
    paladinChannelDivinityMax: Number(raw.paladinState.channelDivinityMax),
    smiteFreeUsed: raw.paladinState.smiteFreeUsed,
    rogueLevel: Number(raw.rogueLevel),
    sneakAttackUsedThisTurn: raw.rogueState.sneakAttackUsedThisTurn,
    steadyAimUsedThisTurn: raw.rogueState.steadyAimUsedThisTurn,
    cunningStrikeUsesThisTurn: Number(raw.rogueState.cunningStrikeUsesThisTurn),
    clericLevel: Number(raw.clericLevel),
    clericChannelDivinityCharges: Number(raw.clericState.channelDivinityCharges),
    clericChannelDivinityMax: Number(raw.clericState.channelDivinityMax),
    druidLevel: Number(raw.druidLevel),
    wildShapeCharges: Number(raw.druidState.wildShapeCharges),
    wildShapeMax: Number(raw.druidState.wildShapeMax),
    inWildShape: raw.druidState.inWildShape,
    wildResurgenceSlotUsedThisLR: raw.druidState.wildResurgenceSlotUsedThisLR,
    sorcererLevel: Number(raw.sorcererLevel),
    sorceryPoints: Number(raw.sorcererState.sorceryPoints),
    sorceryPointsMax: Number(raw.sorcererState.sorceryPointsMax),
    sorcerousRestorationUsed: raw.sorcererState.sorcerousRestorationUsed,
    innateSorceryActive: raw.sorcererState.innateSorceryActive,
    innateSorceryCharges: Number(raw.sorcererState.innateSorceryCharges),
    innateSorceryTurnsRemaining: Number(raw.sorcererState.innateSorceryTurnsRemaining),
    metamagicUsedThisCast: raw.sorcererState.metamagicUsedThisCast,
    apotheosisUsedThisTurn: raw.sorcererState.apotheosisUsedThisTurn,
    warlockLevel: Number(raw.warlockLevel),
    mysticArcanumUsed: raw.warlockState.mysticArcanumUsed,
    magicalCunningUsed: raw.warlockState.magicalCunningUsed,
    eldritchSmiteUsedThisTurn: raw.warlockState.eldritchSmiteUsedThisTurn,
    wizardLevel: Number(raw.wizardLevel),
    arcaneRecoveryUsed: raw.wizardState.arcaneRecoveryUsed,
    overchannelUsesThisLR: Number(raw.wizardState.overchannelUsesThisLR),
    rangerLevel: Number(raw.rangerLevel),
    huntersMarkFreeUses: Number(raw.rangerState.huntersMarkFreeUses),
    tirelessCharges: Number(raw.rangerState.tirelessCharges),
    tirelessMax: Number(raw.rangerState.tirelessMax),
    naturesVeilCharges: Number(raw.rangerState.naturesVeilCharges),
    naturesVeilMax: Number(raw.rangerState.naturesVeilMax),
    bardLevel: Number(raw.bardLevel),
    bardicInspirationCharges: Number(raw.bardState.bardicInspirationCharges),
    bardicInspirationMax: Number(raw.bardState.bardicInspirationMax)
  }
}

// ============================================================
// ENFORCEMENT: every DndEvent type must have a driver action
// ============================================================

type EventActionMap = {
  TAKE_DAMAGE: "doTakeDamage"
  HEAL: "doHeal"
  GRANT_TEMP_HP: "doGrantTempHp"
  DEATH_SAVE: "doDeathSave"
  STABILIZE: "doStabilize"
  KNOCK_OUT: "doKnockOut"
  APPLY_CONDITION: "doApplyCondition"
  REMOVE_CONDITION: "doRemoveCondition"
  ADD_EXHAUSTION: "doAddExhaustion"
  REDUCE_EXHAUSTION: "doReduceExhaustion"
  START_TURN: "doStartTurn"
  USE_ACTION: "doUseAction"
  USE_BONUS_ACTION: "doUseBonusAction"
  USE_REACTION: "doUseReaction"
  USE_MOVEMENT: "doUseMovement"
  USE_EXTRA_ATTACK: "doUseExtraAttack"
  STAND_FROM_PRONE: "doStandFromProne"
  DROP_PRONE: "doDropProne"
  END_TURN: "doEndTurn"
  MARK_BONUS_ACTION_SPELL: "doMarkBonusActionSpell"
  MARK_NON_CANTRIP_ACTION_SPELL: "doMarkNonCantripActionSpell"
  GRAPPLE: "doGrapple"
  RELEASE_GRAPPLE: "doReleaseGrapple"
  ESCAPE_GRAPPLE: "doEscapeGrapple"
  SHOVE: "doShove"
  EXPEND_SLOT: "doExpendSlot"
  EXPEND_PACT_SLOT: "doExpendPactSlot"
  START_CONCENTRATION: "doStartConcentration"
  BREAK_CONCENTRATION: "doBreakConcentration"
  CONCENTRATION_CHECK: "doConcentrationCheck"
  SHORT_REST: "doShortRest"
  LONG_REST: "doLongRest"
  SPEND_HIT_DIE: "doSpendHitDie"
  APPLY_FALL: "doApplyFall"
  SUFFOCATE: "doSuffocate"
  APPLY_STARVATION: "doApplyStarvation"
  APPLY_DEHYDRATION: "doApplyDehydration"
  ADD_EFFECT: "doAddEffect"
  REMOVE_EFFECT: "doRemoveEffect"
  ENTER_COMBAT: "doEnterCombat"
  EXIT_COMBAT: "doExitCombat"
  GRANT_EXTRA_ACTION: "doGrantExtraAction"
  USE_SECOND_WIND: "doUseSecondWind"
  USE_ACTION_SURGE: "doUseActionSurge"
  USE_INDOMITABLE: "doUseIndomitable"
  USE_TACTICAL_MIND: "doUseTacticalMind"
  USE_HEROIC_INSPIRATION: "doUseHeroicInspiration"
  SCORE_CRITICAL_HIT: "doScoreCriticalHit"
  USE_BONUS_MOVEMENT: "doUseBonusMovement"
  USE_LEGENDARY_ACTION: "doUseLegendaryAction"
  USE_RECHARGE_ABILITY: "doUseRechargeAbility"
  USE_DAILY_ABILITY: "doUseDailyAbility"
  ENTER_RAGE: "doEnterRage"
  END_RAGE: "doEndRage"
  EXTEND_RAGE_BA: "doExtendRageBA"
  MARK_ATTACK_OR_FORCED_SAVE: "doMarkAttackOrForcedSave"
  DECLARE_RECKLESS: "doDeclareReckless"
  USE_INTIMIDATING_PRESENCE: "doUseIntimidatingPresence"
  RESTORE_INTIMIDATING_PRESENCE: "doRestoreIntimidatingPresence"
  USE_BRUTAL_STRIKE: "doBrutalStrike"
  USE_RELENTLESS_RAGE: "doUseRelentlessRage"
  FLURRY_OF_BLOWS: "doFlurryOfBlows"
  PATIENT_DEFENSE_FREE: "doPatientDefenseFree"
  PATIENT_DEFENSE_FOCUS: "doPatientDefenseFocus"
  STEP_OF_THE_WIND_FREE: "doStepOfTheWindFree"
  STEP_OF_THE_WIND_FOCUS: "doStepOfTheWindFocus"
  STUNNING_STRIKE: "doStunningStrike"
  WHOLENESS_OF_BODY: "doWholenessOfBody"
  UNCANNY_METABOLISM: "doUncannyMetabolism"
  USE_ARCANE_RECOVERY: "doUseArcaneRecovery"
  USE_OVERCHANNEL: "doOverchannel"
  USE_SNEAK_ATTACK: "doUseSneakAttack"
  USE_STEADY_AIM: "doUseSteadyAim"
  CUNNING_ACTION_DASH: "doCunningActionDash"
  CUNNING_ACTION_DISENGAGE: "doCunningActionDisengage"
  CUNNING_ACTION_HIDE: "doCunningActionHide"
  USE_UNCANNY_DODGE: "doUseUncannyDodge"
  USE_CUNNING_STRIKE: "doCunningStrike"
  USE_CLERIC_CHANNEL_DIVINITY: "doUseClericChannelDivinity"
  USE_LAY_ON_HANDS: "doUseLayOnHands"
  USE_PALADIN_CHANNEL_DIVINITY: "doUsePaladinChannelDivinity"
  USE_DIVINE_SMITE: "doDivineSmite"
  USE_DIVINE_SMITE_FREE: "doDivineSmiteFree"
  USE_MAGICAL_CUNNING: "doUseMagicalCunning"
  USE_MYSTIC_ARCANUM: "doUseMysticArcanum"
  USE_ELDRITCH_SMITE: "doEldritchSmite"
  CONVERT_SLOT_TO_POINTS: "doConvertSlotToPoints"
  CONVERT_POINTS_TO_SLOT: "doConvertPointsToSlot"
  USE_INNATE_SORCERY: "doUseInnateSorcery"
  USE_METAMAGIC: "doUseMetamagic"
  ENTER_WILD_SHAPE: "doEnterWildShape"
  EXIT_WILD_SHAPE: "doExitWildShape"
  USE_WILD_RESURGENCE_CHARGE: "doWildResurgenceCharge"
  USE_WILD_RESURGENCE_SLOT: "doWildResurgenceSlot"
  USE_FREE_HUNTERS_MARK: "doUseFreeHuntersMark"
  USE_TIRELESS: "doUseTireless"
  USE_NATURES_VEIL: "doUseNaturesVeil"
  USE_BARDIC_INSPIRATION: "doUseBardicInspiration"
  USE_CUTTING_WORDS: "doUseCuttingWords"
  USE_FONT_SLOT_RESTORE: "doUseFontSlotRestore"
  USE_PEERLESS_SKILL: "doUsePeerlessSkill"
}

// Compile error if a DndEvent type is missing from EventActionMap
type UnmappedEvents = Exclude<DndEvent["type"], keyof EventActionMap>
type AssertAllEventsMapped = UnmappedEvents extends never
  ? true
  : { ERROR: `Missing from EventActionMap: ${UnmappedEvents}` }
void (true as AssertAllEventsMapped)

// ============================================================
// Driver: map Quint actions → XState events
// ============================================================

const ITFVariant = z.any().transform(variantToString)

const driverSchema = {
  init: {
    kind: ITFVariant,
    l: ITFBigInt,
    maxHp: ITFBigInt,
    selectedBlock: z.any(),
    pcClass: z.string().optional(),
    wisMod: ITFBigInt,
    chaMod: ITFBigInt
  },
  doTakeDamage: { amount: ITFBigInt, dt: ITFVariant, isCrit: z.boolean() },
  doTakeDamageMonster: { amount: ITFBigInt, dt: ITFVariant, isCrit: z.boolean() },
  doTakeDamageWithMods: {
    amount: ITFBigInt,
    dt: ITFVariant,
    isCrit: z.boolean(),
    resType: ITFVariant,
    vulnType: ITFVariant
  },
  doHeal: { amount: ITFBigInt },
  doGrantTempHp: { amount: ITFBigInt, keepOld: z.boolean() },
  doDeathSave: { roll: ITFBigInt, roll2: ITFBigInt },
  doStabilize: {},
  doKnockOut: {},
  doApplyCondition: { c: ITFVariant, useImmunity: z.boolean(), immuneCondition: ITFVariant },
  doRemoveCondition: { c: ITFVariant },
  doAddExhaustion: { levels: ITFBigInt, exhaustionImmune: z.boolean() },
  doReduceExhaustion: { levels: ITFBigInt },
  doStartTurn: {
    callerSpeedMod: ITFBigInt,
    isGrappling: z.boolean(),
    grappledSmall: z.boolean(),
    deathSaveRoll: ITFBigInt.optional(),
    deathSaveRoll2: ITFBigInt.optional(),
    conMod: ITFBigInt.optional(),
    numEffects: ITFBigInt.optional(),
    effSpellId: z.string().optional(),
    effHeal: ITFBigInt.optional(),
    effTempHp: ITFBigInt.optional(),
    effSaveResult: z.boolean().optional(),
    effDmgAmount: ITFBigInt.optional(),
    effDmgType: ITFVariant.optional(),
    effConSave: z.boolean().optional(),
    effResType: ITFVariant.optional(),
    effVulnType: ITFVariant.optional(),
    rechargeRollVal: ITFBigInt.optional()
  },
  doUseAction: { at: ITFVariant },
  doUseBonusAction: {},
  doUseReaction: {},
  doUseMovement: { feet: ITFBigInt, cost: ITFBigInt },
  doUseExtraAttack: {},
  doStandFromProne: {},
  doDropProne: {},
  doEndTurn: {
    numSaves: ITFBigInt.optional(),
    saveSpellId: z.string().optional(),
    saveSucceeded: z.boolean().optional(),
    saveCondition: ITFVariant.optional(),
    numDmg: ITFBigInt.optional(),
    dmgSpellId: z.string().optional(),
    dmgAmount: ITFBigInt.optional(),
    dmgType: ITFVariant.optional(),
    conSave: z.boolean().optional(),
    dmgResType: ITFVariant.optional(),
    dmgVulnType: ITFVariant.optional(),
    useLR: z.boolean().optional()
  },
  doMarkBonusActionSpell: {},
  doMarkNonCantripActionSpell: {},
  doExpendSlot: { level: ITFBigInt },
  doExpendPactSlot: {},
  doStartConcentration: { spellId: z.string(), duration: ITFBigInt, expiresAt: ITFVariant },
  doBreakConcentration: {},
  doAddEffect: { spellId: z.string(), duration: ITFBigInt, expiresAt: ITFVariant },
  doRemoveEffect: { spellId: z.string() },
  doConcentrationCheck: { saveSucceeded: z.boolean() },
  doSpendHitDie: { conMod: ITFBigInt, dieRoll: ITFBigInt },
  doShortRest: { conMod: ITFBigInt, numDice: ITFBigInt, r1: ITFBigInt, r2: ITFBigInt, r3: ITFBigInt },
  doLongRest: {},
  doUseLegendaryAction: { actionName: z.string().optional() },
  doUseRechargeAbility: { name: z.string().optional() },
  doUseDailyAbility: { name: z.string().optional() },
  doApplyFall: { damageRoll: ITFBigInt },
  doSuffocate: {},
  doApplyStarvation: {},
  doApplyDehydration: {},
  doGrapple: { atkSize: ITFVariant, tgtSize: ITFVariant, saveFailed: z.boolean(), freeHand: z.boolean() },
  doReleaseGrapple: {},
  doEscapeGrapple: { escaped: z.boolean() },
  doShove: { atkSize: ITFVariant, tgtSize: ITFVariant, saveFailed: z.boolean(), choice: ITFVariant },
  doEnterCombat: {},
  doExitCombat: {},
  doUseSecondWind: { d10Roll: ITFBigInt },
  doUseActionSurge: {},
  doUseIndomitable: {},
  doUseTacticalMind: { boostedCheckSucceeds: z.boolean() },
  doUseHeroicInspiration: {},
  doScoreCriticalHit: {},
  doUseBonusMovement: { feet: ITFBigInt },
  doEnterRage: {},
  doEndRage: {},
  doExtendRageBA: {},
  doMarkAttackOrForcedSave: {},
  doDeclareReckless: {},
  doUseIntimidatingPresence: {},
  doRestoreIntimidatingPresence: {},
  doBrutalStrike: {},
  doUseRelentlessRage: { conSaveSucceeded: z.boolean().optional() },
  doFlurryOfBlows: {},
  doPatientDefenseFree: {},
  doPatientDefenseFocus: {},
  doStepOfTheWindFree: {},
  doStepOfTheWindFocus: {},
  doStunningStrike: {},
  doWholenessOfBody: { healRoll: ITFBigInt.optional() },
  doUncannyMetabolism: { healRoll: ITFBigInt.optional() },
  doUseArcaneRecovery: { slotLevel: ITFBigInt.optional() },
  doOverchannel: {},
  doUseSneakAttack: {},
  doUseSteadyAim: {},
  doCunningActionDash: {},
  doCunningActionDisengage: {},
  doCunningActionHide: {},
  doUseUncannyDodge: {},
  doCunningStrike: {},
  doUseClericChannelDivinity: {},
  doUseLayOnHands: { amount: ITFBigInt.optional() },
  doUsePaladinChannelDivinity: {},
  doDivineSmite: { slotLevel: ITFBigInt.optional() },
  doDivineSmiteFree: {},
  doUseMagicalCunning: {},
  doUseMysticArcanum: { spellLevel: ITFBigInt.optional() },
  doEldritchSmite: {},
  doConvertSlotToPoints: { slotLevel: ITFBigInt.optional() },
  doConvertPointsToSlot: { slotLevel: ITFBigInt.optional() },
  doUseInnateSorcery: {},
  doUseMetamagic: { option: z.string().optional() },
  doEnterWildShape: {},
  doExitWildShape: {},
  doWildResurgenceCharge: { slotLevel: ITFBigInt.optional() },
  doWildResurgenceSlot: {},
  doUseFreeHuntersMark: {},
  doUseTireless: { d8Roll: ITFBigInt.optional() },
  doUseNaturesVeil: {},
  doUseBardicInspiration: {},
  doUseCuttingWords: {},
  doUseFontSlotRestore: { slotLevel: ITFBigInt.optional() },
  doUsePeerlessSkill: { success: z.boolean().optional() },
  step: {}, // dead character no-op
  stepPC: {}, // composite — framework expands to leaf actions
  stepMonster: {}, // composite — framework expands to leaf actions
  stepUniversal: {} // composite — framework expands to leaf actions
} as const

/** Multiattack length to extra attacks: first attack uses Attack action, rest are extra. */
function multiattackExtraAttacks(multiattackLength: number): number {
  return multiattackLength > 0 ? multiattackLength - 1 : 0
}

function mapDamageType(s: string): DamageType {
  return QUINT_DAMAGE_TYPE_MAP[s] ?? "bludgeoning"
}

/** Extract stat block fields from Quint's parsed StatBlock record. */
function parseStatBlock(raw: unknown): {
  resistances: Set<DamageType>
  vulnerabilities: Set<DamageType>
  immunities: Set<DamageType>
  conditionImmunities: Set<Condition>
  exhaustionImmune: boolean
  walkSpeed: number
  multiattackLength: number
  maxHp: number
  legendaryActionsRemaining: number
  legendaryResistancesRemaining: number
  rechargeAvailable: Record<string, boolean>
  rechargeMinRolls: Record<string, number>
  dailyUsesRemaining: Record<string, number>
} {
  if (!raw || typeof raw !== "object") {
    return {
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      conditionImmunities: new Set(),
      exhaustionImmune: false,
      walkSpeed: 30,
      multiattackLength: 0,
      maxHp: 10,
      legendaryActionsRemaining: 0,
      legendaryResistancesRemaining: 0,
      rechargeAvailable: {},
      rechargeMinRolls: {},
      dailyUsesRemaining: {}
    }
  }
  const r = raw as Record<string, unknown>
  const mapSet = (field: unknown): Set<DamageType> => {
    if (field instanceof Set) return new Set([...field].map((v) => mapDamageType(variantToString(v))))
    return new Set()
  }
  const mapCondSet = (field: unknown): Set<Condition> => {
    if (field instanceof Set)
      return new Set([...field].map((v) => QUINT_CONDITION_MAP[variantToString(v)] ?? "blinded"))
    return new Set()
  }
  const speeds = r.speeds as Map<unknown, unknown> | undefined
  let walkSpeed = 30
  if (speeds instanceof Map) {
    // Quint ITF may represent variant keys as strings or objects
    for (const [k, v] of speeds) {
      if (variantToString(k) === "Walk") {
        walkSpeed = Number(v)
        break
      }
    }
  }
  const multiattack = r.multiattack
  const multiattackLength = Array.isArray(multiattack) ? multiattack.length : 0
  // Phase L: extract legendary/recharge/daily config
  const legendaryActionUses = Number(r.legendaryActionUses ?? 0n)
  const legendaryResistanceUses = Number(r.legendaryResistanceUses ?? 0n)
  const inLair = Boolean(r.inLair ?? false)
  const lairBonus = inLair ? 1 : 0

  // Recharge abilities: all start unavailable; extract rechargeMin per ability
  const rechargeAvailable = quintMapToRecord(r.rechargeAbilities, () => false)
  const rechargeMinRolls = quintMapToRecord(r.rechargeAbilities, (v) => {
    const def = v as Record<string, unknown> | undefined
    return Number(def?.rechargeMin ?? 5n)
  })
  const dailyUsesRemaining = quintMapToRecord(r.dailyAbilities, Number)

  return {
    resistances: mapSet(r.resistances),
    vulnerabilities: mapSet(r.vulnerabilities),
    immunities: mapSet(r.damageImmunities),
    conditionImmunities: mapCondSet(r.conditionImmunities),
    exhaustionImmune: Boolean(r.exhaustionImmune),
    walkSpeed,
    multiattackLength,
    maxHp: Number(r.maxHp ?? 10n),
    legendaryActionsRemaining: legendaryActionUses + lairBonus,
    legendaryResistancesRemaining: legendaryResistanceUses + lairBonus,
    rechargeAvailable,
    rechargeMinRolls,
    dailyUsesRemaining
  }
}

/** Compute which recharge abilities succeed given a d6 roll (mirrors Quint's pProcessRechargeRolls). */
function computeRechargedAbilities(
  rollVal: number,
  rechargeMinRolls: Record<string, number>,
  rechargeAvailable: Readonly<Record<string, boolean>>
): Array<string> | undefined {
  const recharged: Array<string> = []
  for (const [name, available] of Object.entries(rechargeAvailable)) {
    if (!available && rollVal >= (rechargeMinRolls[name] ?? 5)) {
      recharged.push(name)
    }
  }
  return recharged.length > 0 ? recharged : undefined
}

function createDndDriver() {
  return defineDriver(driverSchema, () => {
    let actor: ReturnType<typeof createActor<typeof dndMachine>> | null = null
    let currentCreatureKind: CreatureKind = "PC"
    let currentStatBlock: ReturnType<typeof parseStatBlock> | null = null

    function ensureActor() {
      if (!actor) throw new Error("Actor not initialized — init must come first")
      return actor
    }

    function send(event: DndEvent) {
      ensureActor().send(event)
    }

    return {
      init: ({ chaMod, kind, l, maxHp: mhp, pcClass, selectedBlock, wisMod }) => {
        if (actor) actor.stop()
        const creatureKind = mapCreatureKind(kind)
        currentCreatureKind = creatureKind
        if (creatureKind === "Monster") {
          const sb = parseStatBlock(selectedBlock)
          currentStatBlock = sb
          actor = createActor(dndMachine, {
            input: {
              maxHp: sb.maxHp,
              hitDiceRemaining: 0,
              effectiveSpeed: sb.walkSpeed,
              movementRemaining: sb.walkSpeed,
              extraAttacksRemaining: multiattackExtraAttacks(sb.multiattackLength),
              fighterLevel: 0,
              barbarianLevel: 0,
              monkLevel: 0,
              paladinLevel: 0,
              rogueLevel: 0,
              clericLevel: 0,
              druidLevel: 0,
              sorcererLevel: 0,
              warlockLevel: 0,
              wizardLevel: 0,
              rangerLevel: 0,
              bardLevel: 0,
              creatureKind: "Monster",
              legendaryActionsRemaining: sb.legendaryActionsRemaining,
              legendaryResistancesRemaining: sb.legendaryResistancesRemaining,
              rechargeAvailable: sb.rechargeAvailable,
              dailyUsesRemaining: sb.dailyUsesRemaining,
              dailyUsesMax: sb.dailyUsesRemaining
            }
          })
        } else {
          currentStatBlock = null
          const INIT_SPEED = 30
          const level = Number(l)
          const cls = pcClass ?? "Fighter"
          const fLevel = cls === "Fighter" ? level : 0
          const bLevel = cls === "Barbarian" ? level : 0
          const mLevel = cls === "Monk" ? level : 0
          const wLevel = cls === "Wizard" ? level : 0
          const rLevel = cls === "Rogue" ? level : 0
          const cLevel = cls === "Cleric" ? level : 0
          const pLevel = cls === "Paladin" ? level : 0
          const wkLevel = cls === "Warlock" ? level : 0
          const sLevel = cls === "Sorcerer" ? level : 0
          const dLevel = cls === "Druid" ? level : 0
          const rnLevel = cls === "Ranger" ? level : 0
          const bdLevel = cls === "Bard" ? level : 0
          actor = createActor(dndMachine, {
            input: {
              maxHp: Number(mhp),
              hitDiceRemaining: level,
              effectiveSpeed: INIT_SPEED,
              movementRemaining: INIT_SPEED,
              extraAttacksRemaining: 1,
              fighterLevel: fLevel,
              barbarianLevel: bLevel,
              monkLevel: mLevel,
              wholenessMax: Number(wisMod),
              paladinLevel: pLevel,
              rogueLevel: rLevel,
              clericLevel: cLevel,
              druidLevel: dLevel,
              sorcererLevel: sLevel,
              warlockLevel: wkLevel,
              wizardLevel: wLevel,
              rangerLevel: rnLevel,
              wisMod: Number(wisMod),
              bardLevel: bdLevel,
              chaMod: Number(chaMod),
              creatureKind: "PC"
            }
          })
        }
        actor.start()
      },
      doTakeDamage: ({ amount, dt, isCrit }) => {
        send({
          type: "TAKE_DAMAGE",
          amount: Number(amount),
          damageType: mapDamageType(dt),
          resistances: new Set(),
          vulnerabilities: new Set(),
          immunities: new Set(),
          isCritical: isCrit
        })
      },
      doTakeDamageMonster: ({ amount, dt, isCrit }) => {
        const sb = currentStatBlock
        send({
          type: "TAKE_DAMAGE",
          amount: Number(amount),
          damageType: mapDamageType(dt),
          resistances: sb?.resistances ?? new Set(),
          vulnerabilities: sb?.vulnerabilities ?? new Set(),
          immunities: sb?.immunities ?? new Set(),
          isCritical: isCrit
        })
      },
      doTakeDamageWithMods: ({ amount, dt, isCrit, resType, vulnType }) => {
        send({
          type: "TAKE_DAMAGE",
          amount: Number(amount),
          damageType: mapDamageType(dt),
          resistances: new Set([mapDamageType(resType)]),
          vulnerabilities: new Set([mapDamageType(vulnType)]),
          immunities: new Set(),
          isCritical: isCrit
        })
      },
      doHeal: ({ amount }) => {
        send({ type: "HEAL", amount: healAmount(Number(amount)) })
      },
      doGrantTempHp: ({ amount, keepOld }) => {
        send({ type: "GRANT_TEMP_HP", amount: tempHp(Number(amount)), keepOld })
      },
      doDeathSave: ({ roll, roll2 }) => {
        send({ type: "DEATH_SAVE", d20Roll: d20Roll(Number(roll)), d20Roll2: d20Roll(Number(roll2)) })
      },
      doStabilize: () => {
        send({ type: "STABILIZE" })
      },
      doKnockOut: () => {
        send({ type: "KNOCK_OUT" })
      },
      doApplyCondition: ({ c, immuneCondition, useImmunity }) => {
        const immunities = useImmunity
          ? new Set([QUINT_CONDITION_MAP[immuneCondition] ?? "blinded"])
          : new Set<Condition>()
        send({
          type: "APPLY_CONDITION",
          condition: QUINT_CONDITION_MAP[c] ?? "blinded",
          conditionImmunities: immunities
        })
      },
      doRemoveCondition: ({ c }) => {
        send({ type: "REMOVE_CONDITION", condition: QUINT_CONDITION_MAP[c] ?? "blinded" })
      },
      doAddExhaustion: ({ exhaustionImmune, levels }) => {
        send({ type: "ADD_EXHAUSTION", levels: Number(levels), exhaustionImmune })
      },
      doReduceExhaustion: ({ levels }) => {
        send({ type: "REDUCE_EXHAUSTION", levels: Number(levels) })
      },
      doStartTurn: ({
        callerSpeedMod,
        conMod,
        deathSaveRoll: dsRoll,
        deathSaveRoll2: dsRoll2,
        effConSave,
        effDmgAmount,
        effDmgType,
        effHeal,
        effResType,
        effSaveResult,
        effSpellId,
        effTempHp,
        effVulnType,
        grappledSmall,
        isGrappling,
        numEffects,
        rechargeRollVal
      }) => {
        const isMonster = currentCreatureKind === "Monster"
        const sb = currentStatBlock
        // Monster: speed from stat block, no armor penalty; PC: Walk=30, no armor penalty
        const BASE_SPEED = isMonster && sb ? sb.walkSpeed : 30
        const ctx = ensureActor().getSnapshot().context
        const extraAttacks =
          isMonster && sb
            ? sb.multiattackLength > 0
              ? sb.multiattackLength - 1
              : 0
            : Math.max(
                fighterExtraAttacks(ctx.classStates.fighter?.level ?? 0),
                barbarianExtraAttacks(ctx.classStates.barbarian?.level ?? 0),
                monkExtraAttacks(ctx.classStates.monk?.level ?? 0),
                rangerExtraAttacks(ctx.classStates.ranger?.level ?? 0)
              )
        const effects = !numEffects
          ? []
          : [
              {
                spellId: effSpellId ?? "",
                healAmount: Number(effHeal ?? 0),
                tempHpAmount: Number(effTempHp ?? 0),
                saveResult: effSaveResult ?? false,
                damageAmount: Number(effDmgAmount ?? 0),
                damageType: mapDamageType(effDmgType ?? "Bludgeoning"),
                conSaveSucceeded: effConSave ?? false,
                resistances: new Set(effResType ? [mapDamageType(effResType)] : []),
                vulnerabilities: new Set(effVulnType ? [mapDamageType(effVulnType)] : []),
                immunities: new Set<DamageType>()
              }
            ]
        send({
          type: "START_TURN",
          baseSpeed: BASE_SPEED,
          armorPenalty: 0,
          extraAttacks,
          callerSpeedModifier: Number(callerSpeedMod),
          isGrappling,
          grappledTargetTwoSizesSmaller: grappledSmall,
          // Monsters: skip death save (pass undefined), skip Heroic Rally (conMod undefined)
          deathSaveRoll: isMonster ? undefined : dsRoll != null ? d20Roll(Number(dsRoll)) : undefined,
          deathSaveRoll2: isMonster ? undefined : dsRoll2 != null ? d20Roll(Number(dsRoll2)) : undefined,
          conMod: isMonster ? undefined : conMod != null ? Number(conMod) : undefined,
          startOfTurnEffects: effects,
          // Phase L: compute which abilities recharged (mirrors Quint's pProcessRechargeRolls)
          rechargedAbilities:
            isMonster && sb && rechargeRollVal != null
              ? computeRechargedAbilities(
                  Number(rechargeRollVal),
                  sb.rechargeMinRolls,
                  ensureActor().getSnapshot().context.rechargeAvailable
                )
              : undefined
        })
      },
      doUseAction: ({ at }) => {
        send({
          type: "USE_ACTION",
          actionType: (QUINT_ACTION_TYPE_MAP[at] ?? "attack") as ActionType
        })
      },
      doUseBonusAction: () => {
        send({ type: "USE_BONUS_ACTION" })
      },
      doUseReaction: () => {
        send({ type: "USE_REACTION" })
      },
      doUseMovement: ({ cost, feet }) => {
        send({ type: "USE_MOVEMENT", feet: Number(feet), movementCost: Number(cost) })
      },
      doUseExtraAttack: () => {
        send({ type: "USE_EXTRA_ATTACK" })
      },
      doStandFromProne: () => {
        send({ type: "STAND_FROM_PRONE" })
      },
      doDropProne: () => {
        send({ type: "DROP_PRONE" })
      },
      doEndTurn: ({
        conSave,
        dmgAmount,
        dmgResType,
        dmgSpellId,
        dmgType,
        dmgVulnType,
        numDmg,
        numSaves,
        saveCondition,
        saveSpellId,
        saveSucceeded,
        useLR
      }) => {
        // When turnPhase != "acting", Quint skips nondet generation — all params are undefined (no-op path)
        const saves = !numSaves
          ? []
          : [
              {
                spellId: saveSpellId ?? "",
                saveSucceeded: saveSucceeded ?? false,
                conditionsToRemove: [QUINT_CONDITION_MAP[saveCondition ?? ""] ?? "blinded"]
              }
            ]
        const isMonster = currentCreatureKind === "Monster"
        const sb = currentStatBlock
        const damages = !numDmg
          ? []
          : [
              {
                spellId: dmgSpellId ?? "",
                damage: Number(dmgAmount ?? 0),
                damageType: mapDamageType(dmgType ?? "Bludgeoning"),
                conSaveSucceeded: conSave ?? false,
                resistances: isMonster && sb ? sb.resistances : new Set(dmgResType ? [mapDamageType(dmgResType)] : []),
                vulnerabilities:
                  isMonster && sb ? sb.vulnerabilities : new Set(dmgVulnType ? [mapDamageType(dmgVulnType)] : []),
                immunities: isMonster && sb ? sb.immunities : new Set<DamageType>()
              }
            ]
        send({ type: "END_TURN", endOfTurnSaves: saves, endOfTurnDamage: damages, useLegendaryResistance: useLR })
      },
      doMarkBonusActionSpell: () => {
        send({ type: "MARK_BONUS_ACTION_SPELL" })
      },
      doMarkNonCantripActionSpell: () => {
        send({ type: "MARK_NON_CANTRIP_ACTION_SPELL" })
      },
      doExpendSlot: ({ level }) => {
        send({ type: "EXPEND_SLOT", level: Number(level) })
      },
      doExpendPactSlot: () => {
        send({ type: "EXPEND_PACT_SLOT" })
      },
      doStartConcentration: ({ duration, expiresAt, spellId }) => {
        send({
          type: "START_CONCENTRATION",
          spellId,
          durationTurns: Number(duration),
          expiresAt: mapExpiryPhase(expiresAt)
        })
      },
      doBreakConcentration: () => {
        send({ type: "BREAK_CONCENTRATION" })
      },
      doAddEffect: ({ duration, expiresAt, spellId }) => {
        send({ type: "ADD_EFFECT", spellId, durationTurns: Number(duration), expiresAt: mapExpiryPhase(expiresAt) })
      },
      doRemoveEffect: ({ spellId }) => {
        send({ type: "REMOVE_EFFECT", spellId })
      },
      doConcentrationCheck: ({ saveSucceeded }) => {
        send({ type: "CONCENTRATION_CHECK", conSaveSucceeded: saveSucceeded })
      },
      doSpendHitDie: ({ conMod, dieRoll }) => {
        send({ type: "SPEND_HIT_DIE", conMod: Number(conMod), dieRoll: Number(dieRoll) })
      },
      doShortRest: ({ conMod, numDice, r1, r2, r3 }) => {
        const n = Number(numDice)
        const rolls = [Number(r1), Number(r2), Number(r3)].slice(0, n)
        send({ type: "SHORT_REST", conMod: Number(conMod), hdRolls: rolls })
      },
      doLongRest: () => {
        send({ type: "LONG_REST" })
      },
      doApplyFall: ({ damageRoll }) => {
        send({
          type: "APPLY_FALL",
          damageRoll: Number(damageRoll),
          resistances: new Set(),
          vulnerabilities: new Set(),
          immunities: new Set()
        })
      },
      doSuffocate: () => {
        send({ type: "SUFFOCATE" })
      },
      doApplyStarvation: () => {
        send({ type: "APPLY_STARVATION" })
      },
      doApplyDehydration: () => {
        send({ type: "APPLY_DEHYDRATION" })
      },
      doGrapple: ({ atkSize, freeHand, saveFailed, tgtSize }) => {
        send({
          type: "GRAPPLE",
          attackerSize: QUINT_SIZE_MAP[atkSize] ?? "medium",
          targetSize: QUINT_SIZE_MAP[tgtSize] ?? "medium",
          targetSaveFailed: saveFailed,
          attackerHasFreeHand: freeHand
        })
      },
      doReleaseGrapple: () => {
        send({ type: "RELEASE_GRAPPLE" })
      },
      doEscapeGrapple: ({ escaped }) => {
        send({ type: "ESCAPE_GRAPPLE", escapeSucceeded: escaped })
      },
      doShove: ({ atkSize, choice, saveFailed, tgtSize }) => {
        send({
          type: "SHOVE",
          attackerSize: QUINT_SIZE_MAP[atkSize] ?? "medium",
          targetSize: QUINT_SIZE_MAP[tgtSize] ?? "medium",
          targetSaveFailed: saveFailed,
          choice: QUINT_SHOVE_MAP[choice] ?? "prone"
        })
      },
      doEnterCombat: () => {
        send({ type: "ENTER_COMBAT" })
      },
      doExitCombat: () => {
        send({ type: "EXIT_COMBAT" })
      },
      doUseSecondWind: ({ d10Roll }) => {
        send({ type: "USE_SECOND_WIND", d10Roll: Number(d10Roll) })
      },
      doUseActionSurge: () => {
        send({ type: "USE_ACTION_SURGE" })
      },
      doUseIndomitable: () => {
        send({ type: "USE_INDOMITABLE" })
      },
      doUseTacticalMind: ({ boostedCheckSucceeds }) => {
        send({ type: "USE_TACTICAL_MIND", boostedCheckSucceeds })
      },
      doUseHeroicInspiration: () => {
        send({ type: "USE_HEROIC_INSPIRATION" })
      },
      doScoreCriticalHit: () => {
        send({ type: "SCORE_CRITICAL_HIT" })
      },
      doUseBonusMovement: ({ feet }) => {
        send({ type: "USE_BONUS_MOVEMENT", feet: Number(feet) })
      },
      doEnterRage: () => {
        send({ type: "ENTER_RAGE" })
      },
      doEndRage: () => {
        send({ type: "END_RAGE" })
      },
      doExtendRageBA: () => {
        send({ type: "EXTEND_RAGE_BA" })
      },
      doMarkAttackOrForcedSave: () => {
        send({ type: "MARK_ATTACK_OR_FORCED_SAVE" })
      },
      doDeclareReckless: () => {
        send({ type: "DECLARE_RECKLESS" })
      },
      doUseIntimidatingPresence: () => {
        send({ type: "USE_INTIMIDATING_PRESENCE" })
      },
      doRestoreIntimidatingPresence: () => {
        send({ type: "RESTORE_INTIMIDATING_PRESENCE" })
      },
      doBrutalStrike: () => {
        send({ type: "USE_BRUTAL_STRIKE" })
      },
      doUseRelentlessRage: ({ conSaveSucceeded }) => {
        if (conSaveSucceeded != null) send({ type: "USE_RELENTLESS_RAGE", conSaveSucceeded })
      },
      doFlurryOfBlows: () => {
        send({ type: "FLURRY_OF_BLOWS" })
      },
      doPatientDefenseFree: () => {
        send({ type: "PATIENT_DEFENSE_FREE" })
      },
      doPatientDefenseFocus: () => {
        send({ type: "PATIENT_DEFENSE_FOCUS" })
      },
      doStepOfTheWindFree: () => {
        send({ type: "STEP_OF_THE_WIND_FREE" })
      },
      doStepOfTheWindFocus: () => {
        send({ type: "STEP_OF_THE_WIND_FOCUS" })
      },
      doStunningStrike: () => {
        send({ type: "STUNNING_STRIKE" })
      },
      doWholenessOfBody: ({ healRoll }) => {
        if (healRoll != null) send({ type: "WHOLENESS_OF_BODY", healRoll: Number(healRoll) })
      },
      doUncannyMetabolism: ({ healRoll }) => {
        if (healRoll != null) send({ type: "UNCANNY_METABOLISM", healRoll: Number(healRoll) })
      },
      doUseArcaneRecovery: ({ slotLevel }) => {
        if (slotLevel != null) send({ type: "USE_ARCANE_RECOVERY", slotLevel: Number(slotLevel) })
      },
      doOverchannel: () => {
        send({ type: "USE_OVERCHANNEL" })
      },
      doUseSneakAttack: () => {
        send({ type: "USE_SNEAK_ATTACK" })
      },
      doUseSteadyAim: () => {
        send({ type: "USE_STEADY_AIM" })
      },
      doCunningActionDash: () => {
        send({ type: "CUNNING_ACTION_DASH" })
      },
      doCunningActionDisengage: () => {
        send({ type: "CUNNING_ACTION_DISENGAGE" })
      },
      doCunningActionHide: () => {
        send({ type: "CUNNING_ACTION_HIDE" })
      },
      doUseUncannyDodge: () => {
        send({ type: "USE_UNCANNY_DODGE" })
      },
      doCunningStrike: () => {
        send({ type: "USE_CUNNING_STRIKE" })
      },
      doUseClericChannelDivinity: () => {
        send({ type: "USE_CLERIC_CHANNEL_DIVINITY" })
      },
      doUseLayOnHands: ({ amount }) => {
        if (amount != null) send({ type: "USE_LAY_ON_HANDS", amount: Number(amount) })
      },
      doUsePaladinChannelDivinity: () => {
        send({ type: "USE_PALADIN_CHANNEL_DIVINITY" })
      },
      doDivineSmite: ({ slotLevel }) => {
        if (slotLevel != null) send({ type: "USE_DIVINE_SMITE", slotLevel: Number(slotLevel) })
      },
      doDivineSmiteFree: () => {
        send({ type: "USE_DIVINE_SMITE_FREE" })
      },
      doUseMagicalCunning: () => {
        send({ type: "USE_MAGICAL_CUNNING" })
      },
      doUseMysticArcanum: ({ spellLevel }) => {
        if (spellLevel != null) send({ type: "USE_MYSTIC_ARCANUM", spellLevel: Number(spellLevel) })
      },
      doEldritchSmite: () => {
        send({ type: "USE_ELDRITCH_SMITE" })
      },
      doConvertSlotToPoints: ({ slotLevel }) => {
        if (slotLevel != null) send({ type: "CONVERT_SLOT_TO_POINTS", slotLevel: Number(slotLevel) })
      },
      doConvertPointsToSlot: ({ slotLevel }) => {
        if (slotLevel != null) send({ type: "CONVERT_POINTS_TO_SLOT", slotLevel: Number(slotLevel) })
      },
      doUseInnateSorcery: () => {
        send({ type: "USE_INNATE_SORCERY" })
      },
      doUseMetamagic: ({ option }) => {
        if (option != null) send({ type: "USE_METAMAGIC", option })
      },
      doEnterWildShape: () => {
        send({ type: "ENTER_WILD_SHAPE" })
      },
      doExitWildShape: () => {
        send({ type: "EXIT_WILD_SHAPE" })
      },
      doWildResurgenceCharge: ({ slotLevel }) => {
        if (slotLevel != null) send({ type: "USE_WILD_RESURGENCE_CHARGE", slotLevel: Number(slotLevel) })
      },
      doWildResurgenceSlot: () => {
        send({ type: "USE_WILD_RESURGENCE_SLOT" })
      },
      doUseFreeHuntersMark: () => {
        send({ type: "USE_FREE_HUNTERS_MARK" })
      },
      doUseTireless: ({ d8Roll }) => {
        if (d8Roll != null) send({ type: "USE_TIRELESS", d8Roll: Number(d8Roll) })
      },
      doUseNaturesVeil: () => {
        send({ type: "USE_NATURES_VEIL" })
      },
      doUseBardicInspiration: () => {
        send({ type: "USE_BARDIC_INSPIRATION" })
      },
      doUseCuttingWords: () => {
        send({ type: "USE_CUTTING_WORDS" })
      },
      doUseFontSlotRestore: ({ slotLevel }) => {
        if (slotLevel != null) send({ type: "USE_FONT_SLOT_RESTORE", slotLevel: Number(slotLevel) })
      },
      doUsePeerlessSkill: ({ success }) => {
        if (success != null) send({ type: "USE_PEERLESS_SKILL", success })
      },
      // Args are undefined when Quint guard → unchanged (nondet not generated)
      doUseLegendaryAction: ({ actionName }) => {
        if (actionName != null) send({ type: "USE_LEGENDARY_ACTION", actionName })
      },
      doUseRechargeAbility: ({ name }) => {
        if (name != null) send({ type: "USE_RECHARGE_ABILITY", name })
      },
      doUseDailyAbility: ({ name }) => {
        if (name != null) send({ type: "USE_DAILY_ABILITY", name })
      },
      step: () => {}, // dead character no-op
      stepPC: () => {}, // composite — framework expands to leaf actions
      stepMonster: () => {}, // composite — framework expands to leaf actions
      stepUniversal: () => {}, // composite — framework expands to leaf actions
      getState: () => snapshotToNormalized(ensureActor().getSnapshot()),
      config: () => ({ statePath: [] })
    }
  })
}

// ============================================================
// State comparison
// ============================================================

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

function arraysEqual(a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function activeEffectsEqual(
  a: ReadonlyArray<{ spellId: string; turnsRemaining: number; expiresAt: string }>,
  b: ReadonlyArray<{ spellId: string; turnsRemaining: number; expiresAt: string }>
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].spellId !== b[i].spellId ||
      a[i].turnsRemaining !== b[i].turnsRemaining ||
      a[i].expiresAt !== b[i].expiresAt
    )
      return false
  }
  return true
}

// ============================================================
// Sync enforcement tests
// ============================================================

const KNOWN_MISSING_FIELDS = new Set<string>([])

type QuintRow = {
  readonly kind: "row"
  readonly fields: ReadonlyArray<{ readonly fieldName: string }>
  readonly other: QuintRow | { readonly kind: "empty" }
}

const QuintRow: Schema.Schema<QuintRow, unknown> = Schema.suspend(() =>
  Schema.Struct({
    kind: Schema.Literal("row"),
    fields: Schema.Array(Schema.Struct({ fieldName: Schema.String })),
    other: Schema.Union(QuintRow, Schema.Struct({ kind: Schema.Literal("empty") }))
  })
) as Schema.Schema<QuintRow, unknown>

const QuintTypedef = Schema.Struct({
  kind: Schema.Literal("typedef"),
  name: Schema.String,
  type: Schema.Struct({ fields: QuintRow })
})

function parseQuintTypeFields(typeName: string): Array<string> {
  const tmpFile = path.join(os.tmpdir(), `quint_ast_${process.pid}.json`)
  try {
    execSync(`quint parse ${path.resolve(import.meta.dirname, "../../dnd.qnt")} --out ${tmpFile}`)
    const raw = JSON.parse(fs.readFileSync(tmpFile, "utf8")) as {
      modules: Array<{ declarations: Array<Record<string, unknown>> }>
    }
    const rawDecl = raw.modules[0]?.declarations.find((d) => d.kind === "typedef" && d.name === typeName)
    if (!rawDecl) throw new Error(`${typeName} typedef not found in Quint AST`)

    const stateType = Schema.decodeUnknownSync(QuintTypedef)(rawDecl)

    function getFields(row: QuintRow): Array<string> {
      const fields: Array<string> = row.fields.map((f) => f.fieldName)
      if (row.other.kind === "row") fields.push(...getFields(row.other))
      return fields
    }
    return getFields(stateType.type.fields)
  } finally {
    try {
      fs.unlinkSync(tmpFile)
    } catch {
      /* ignore cleanup errors */
    }
  }
}

describe("MBT driver sync", () => {
  it("no NEW Quint CreatureState fields missing from schema", () => {
    const quintFields = parseQuintTypeFields("CreatureState")
    const schemaKeys = Object.keys(QuintCreatureState.shape)
    const missing = quintFields.filter((f: string) => !schemaKeys.includes(f) && !KNOWN_MISSING_FIELDS.has(f))
    expect(missing, `New Quint CreatureState fields not in schema: ${missing.join(", ")}`).toEqual([])
  })

  it("no NEW Quint TurnState fields missing from schema", () => {
    const quintFields = parseQuintTypeFields("TurnState")
    const schemaKeys = Object.keys(QuintTurnState.shape)
    const missing = quintFields.filter((f: string) => !schemaKeys.includes(f) && !KNOWN_MISSING_FIELDS.has(f))
    expect(missing, `New Quint TurnState fields not in schema: ${missing.join(", ")}`).toEqual([])
  })

  it("no NEW Quint SpellSlotState fields missing from schema", () => {
    const quintFields = parseQuintTypeFields("SpellSlotState")
    const schemaKeys = Object.keys(QuintSpellSlotState.shape)
    const missing = quintFields.filter((f: string) => !schemaKeys.includes(f) && !KNOWN_MISSING_FIELDS.has(f))
    expect(missing, `New Quint SpellSlotState fields not in schema: ${missing.join(", ")}`).toEqual([])
  })

  it("KNOWN_MISSING_FIELDS entries are actually missing (remove when fixed)", () => {
    const allSchemaKeys = new Set([
      ...Object.keys(QuintCreatureState.shape),
      ...Object.keys(QuintTurnState.shape),
      ...Object.keys(QuintSpellSlotState.shape)
    ])
    const stale = [...KNOWN_MISSING_FIELDS].filter((f) => allSchemaKeys.has(f))
    expect(stale, `Remove from KNOWN_MISSING_FIELDS: ${stale.join(", ")}`).toEqual([])
  })
})

// ============================================================
// MBT test
// ============================================================

const mbtStateCheck = stateCheck(
  (raw) => quintParsedToNormalized(QuintFullState.parse(raw)),
  (spec, impl) => {
    const keys = Object.keys(spec) as Array<keyof NormalizedState>
    for (const k of keys) {
      const sv = spec[k]
      const iv = impl[k]
      if (k === "activeEffects") {
        if (
          !activeEffectsEqual(
            sv as ReadonlyArray<{ spellId: string; turnsRemaining: number; expiresAt: string }>,
            iv as ReadonlyArray<{ spellId: string; turnsRemaining: number; expiresAt: string }>
          )
        )
          return false
      } else if (sv instanceof Set && iv instanceof Set) {
        if (!setsEqual(sv, iv)) return false
      } else if (Array.isArray(sv) && Array.isArray(iv)) {
        if (!arraysEqual(sv, iv)) return false
      } else if (typeof sv === "object" && typeof iv === "object") {
        const so = sv as Record<string, unknown>
        const io = iv as Record<string, unknown>
        const soKeys = Object.keys(so)
        const ioKeys = Object.keys(io)
        if (soKeys.length !== ioKeys.length) return false
        for (const rk of soKeys) {
          if (!(rk in io) || so[rk] !== io[rk]) return false
        }
      } else if (sv !== iv) return false
    }
    return true
  }
)

describe("DnD MBT", () => {
  const MBT_TRACE_COUNT = 50
  const MBT_STEP_COUNT = 30
  const specPath = path.resolve(import.meta.dirname, "../../dnd.qnt")

  it("replays Quint traces against XState machine (L3 + L5 + L9 + L10 + L18)", async () => {
    await run({
      spec: specPath,
      driver: createDndDriver(),
      backend: "rust",
      nTraces: Number(process.env["MBT_TRACES"] ?? MBT_TRACE_COUNT),
      maxSteps: Number(process.env["MBT_STEPS"] ?? MBT_STEP_COUNT),
      stateCheck: mbtStateCheck
    })
  }, 180_000)
})
