/**
 * Shared MBT utilities — Quint→TS enum maps, Zod schemas, normalization,
 * and comparison helpers used by both creature and battle MBT tests.
 */
import { z } from "zod"

import type { MetamagicOption } from "#/features/class-sorcerer.ts"
import type { DndSnapshot } from "#/machine.ts"
import type { ClassStateMap } from "#/machine-types.ts"
import type { Condition, CreatureKind, DamageType, IncapSource, ShoveChoice, Size } from "#/types.ts"

// ============================================================
// Quint → TS enum mappings
// ============================================================

export const QUINT_CONDITION_MAP: Record<string, Condition> = {
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

export const QUINT_ACTION_TYPE_MAP: Record<string, string> = {
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

export const QUINT_SIZE_MAP: Record<string, Size> = {
  Tiny: "tiny",
  Small: "small",
  Medium: "medium",
  Large: "large",
  Huge: "huge",
  Gargantuan: "gargantuan"
}

export const QUINT_SHOVE_MAP: Record<string, ShoveChoice> = {
  ShoveProne: "prone",
  ShovePush: "push"
}

export const QUINT_INCAP_SOURCE_MAP: Record<string, IncapSource> = {
  ISParalyzed: "paralyzed",
  ISPetrified: "petrified",
  ISStunned: "stunned",
  ISUnconscious: "unconscious",
  ISDirect: "direct"
}

export const QUINT_DAMAGE_TYPE_MAP: Record<string, DamageType> = {
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
// Mapping helpers
// ============================================================

/** Parse a Quint Set[DamageType] (ITF Set of variants) into a JS Set of mapped damage type strings. */
function parseDamageTypeSet(raw: unknown): ReadonlySet<string> {
  if (!(raw instanceof Set)) return new Set<string>()
  const result = new Set<string>()
  for (const item of raw) result.add(mapDamageType(variantToString(item)))
  return result
}

export function variantToString(v: unknown): string {
  if (typeof v === "string") return v
  if (typeof v === "object" && v !== null) {
    if ("tag" in v) return String((v as Record<string, unknown>).tag)
    const keys = Object.keys(v)
    if (keys.length === 1) return keys[0]
  }
  return String(v)
}

/** Convert a Quint Map or plain object to a Record, applying a transform to each value. */
export function quintMapToRecord<T>(raw: unknown, transform: (v: unknown) => T): Record<string, T> {
  const result: Record<string, T> = {}
  if (raw instanceof Map) {
    for (const [k, v] of raw) result[String(k)] = transform(v)
  } else if (typeof raw === "object" && raw !== null) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) result[k] = transform(v)
  }
  return result
}

export function mapExpiryPhase(s: string): "start" | "end" {
  return s === "AtStartOfTurn" ? "start" : "end"
}

export function mapCreatureKind(s: string): CreatureKind {
  return s === "Monster" ? "Monster" : "PC"
}

export function mapDamageType(s: string): DamageType {
  return QUINT_DAMAGE_TYPE_MAP[s] ?? "bludgeoning"
}

// ============================================================
// ITF schema helpers
// ============================================================

export const ITFVariant = z.any().transform(variantToString)

/** Variant that preserves the parameter value (for parameterized variants like RCounterspell(bool)). */
export const ITFVariantWithValue = z.any().transform((v: unknown) => ({
  tag: variantToString(v),
  value: typeof v === "object" && v !== null && "value" in v ? (v as Record<string, unknown>).value : undefined
}))

// ============================================================
// Quint state schemas (all ints are bigint from ITF)
// ============================================================

export const QuintDeathSaves = z.object({ successes: z.bigint(), failures: z.bigint() })

export const QuintIncapSourceSet = z.any().transform((raw: unknown) => {
  let items: Array<string> = []
  if (raw instanceof Set) items = [...raw].map(variantToString)
  else if (Array.isArray(raw)) items = raw.map(variantToString)
  return new Set(items.map((s) => QUINT_INCAP_SOURCE_MAP[s] ?? s))
})

export const QuintCreatureState = z.object({
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
    const items: Array<{
      spellId: string
      turnsRemaining: number
      expiresAt: string
      casterId: string
      grantedResistances: ReadonlySet<string>
      grantedVulnerabilities: ReadonlySet<string>
      grantedImmunities: ReadonlySet<string>
    }> = []
    if (raw instanceof Set) {
      for (const e of raw) {
        const r = e as Record<string, unknown>
        items.push({
          spellId: String(r.spellId ?? ""),
          turnsRemaining: Number(r.turnsRemaining ?? r.remainingTurns ?? 0),
          expiresAt: mapExpiryPhase(variantToString(r.expiresAt)),
          casterId: String(r.casterId ?? ""),
          grantedResistances: parseDamageTypeSet(r.grantedResistances),
          grantedVulnerabilities: parseDamageTypeSet(r.grantedVulnerabilities),
          grantedImmunities: parseDamageTypeSet(r.grantedImmunities)
        })
      }
    }
    return items.sort((a, b) => a.spellId.localeCompare(b.spellId))
  })
})

export const QuintTurnState = z.object({
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
  bonusMovementOAFree: z.boolean(),
  actionSurgeActionPending: z.boolean(),
  slotExpendedThisTurn: z.boolean()
})

export const QuintSlotMap = z.any().transform((raw: unknown) => {
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

export const QuintSpellSlotState = z.object({
  slotsMax: QuintSlotMap,
  slotsCurrent: QuintSlotMap,
  pactSlotsMax: z.bigint(),
  pactSlotsCurrent: z.bigint(),
  pactSlotLevel: z.bigint(),
  concentrationSpellId: z.string()
})

// Class state schemas
export const QuintFighterState = z.object({
  secondWindCharges: z.bigint(),
  secondWindMax: z.bigint(),
  actionSurgeCharges: z.bigint(),
  actionSurgeMax: z.bigint(),
  actionSurgeUsedThisTurn: z.boolean(),
  indomitableCharges: z.bigint(),
  indomitableMax: z.bigint(),
  heroicInspiration: z.boolean()
})

export const QuintBarbarianState = z.object({
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

export const QuintMonkState = z.object({
  focusPoints: z.bigint(),
  focusMax: z.bigint(),
  uncannyMetabolismUsed: z.boolean(),
  stunningStrikeUsedThisTurn: z.boolean(),
  wholenessCharges: z.bigint(),
  wholenessMax: z.bigint()
})

export const QuintPaladinState = z.object({
  layOnHandsPool: z.bigint(),
  layOnHandsMax: z.bigint(),
  channelDivinityCharges: z.bigint(),
  channelDivinityMax: z.bigint(),
  smiteFreeUsed: z.boolean()
})

export const QuintRogueState = z.object({
  sneakAttackUsedThisTurn: z.boolean(),
  steadyAimUsedThisTurn: z.boolean(),
  cunningStrikeUsesThisTurn: z.bigint()
})

export const QuintClericState = z.object({
  channelDivinityCharges: z.bigint(),
  channelDivinityMax: z.bigint()
})

export const QuintDruidState = z.object({
  wildShapeCharges: z.bigint(),
  wildShapeMax: z.bigint(),
  inWildShape: z.boolean(),
  wildResurgenceSlotUsedThisLR: z.boolean()
})

export const QuintSorcererState = z.object({
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

export const QuintWarlockState = z.object({
  mysticArcanumUsed: z.any().transform((raw: unknown) => {
    if (raw instanceof Set) return raw as Set<number>
    if (Array.isArray(raw)) return new Set(raw.map(Number))
    return new Set<number>()
  }),
  magicalCunningUsed: z.boolean(),
  eldritchSmiteUsedThisTurn: z.boolean()
})

export const QuintWizardState = z.object({
  arcaneRecoveryUsed: z.boolean(),
  overchannelUsesThisLR: z.bigint()
})

export const QuintRangerState = z.object({
  huntersMarkFreeUses: z.bigint(),
  tirelessCharges: z.bigint(),
  tirelessMax: z.bigint(),
  naturesVeilCharges: z.bigint(),
  naturesVeilMax: z.bigint()
})

export const QuintBardState = z.object({
  bardicInspirationCharges: z.bigint(),
  bardicInspirationMax: z.bigint()
})

export const QuintMonsterResourceState = z.object({
  legendaryActionsRemaining: z.bigint(),
  legendaryResistancesRemaining: z.bigint(),
  rechargeAvailable: z.any().transform((raw: unknown) => quintMapToRecord(raw, Boolean)),
  dailyUsesRemaining: z.any().transform((raw: unknown) => quintMapToRecord(raw, Number))
})

// Combined state from all Quint vars (creature-level MBT)
export const QuintFullState = z.object({
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
  monsterStatBlock: z.any(),
  monsterResourceState: QuintMonsterResourceState
})

// ============================================================
// Normalized comparison type (flat representation)
// ============================================================

export interface NormalizedState {
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
  readonly activeEffects: ReadonlyArray<{
    spellId: string
    turnsRemaining: number
    expiresAt: string
    casterId: string
    grantedResistances: ReadonlySet<string>
    grantedVulnerabilities: ReadonlySet<string>
    grantedImmunities: ReadonlySet<string>
  }>
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
  readonly actionSurgeActionPending: boolean
  readonly slotExpendedThisTurn: boolean
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
export function flattenClassStates(cs: Partial<ClassStateMap>) {
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

export function snapshotToNormalized(snap: DndSnapshot): NormalizedState {
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
      .map((ae) => ({
        spellId: ae.spellId,
        turnsRemaining: ae.turnsRemaining,
        expiresAt: ae.expiresAt,
        casterId: ae.casterId,
        grantedResistances: ae.grantedResistances ?? EMPTY_STRING_SET,
        grantedVulnerabilities: ae.grantedVulnerabilities ?? EMPTY_STRING_SET,
        grantedImmunities: ae.grantedImmunities ?? EMPTY_STRING_SET
      }))
      .sort((a, b) => a.spellId.localeCompare(b.spellId)),
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
    actionSurgeActionPending: c.actionSurgeActionPending,
    slotExpendedThisTurn: false, // battle-level only, not tracked by creature machine
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
    ...flattenClassStates(c.classStates)
  }
}

export function quintParsedToNormalized(raw: z.infer<typeof QuintFullState>): NormalizedState {
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
    actionSurgeActionPending: t.actionSurgeActionPending,
    slotExpendedThisTurn: t.slotExpendedThisTurn,
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
// State comparison helpers
// ============================================================

export function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

export function arraysEqual(a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

type NormalizedEffect = NormalizedState["activeEffects"][number]

export function activeEffectsEqual(a: ReadonlyArray<NormalizedEffect>, b: ReadonlyArray<NormalizedEffect>): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].spellId !== b[i].spellId ||
      a[i].turnsRemaining !== b[i].turnsRemaining ||
      a[i].expiresAt !== b[i].expiresAt ||
      a[i].casterId !== b[i].casterId ||
      !setsEqual(a[i].grantedResistances, b[i].grantedResistances) ||
      !setsEqual(a[i].grantedVulnerabilities, b[i].grantedVulnerabilities) ||
      !setsEqual(a[i].grantedImmunities, b[i].grantedImmunities)
    )
      return false
  }
  return true
}

/** Field-by-field state comparison. Works with NormalizedState and any structural subset. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compareNormalizedStates(spec: any, impl: any): boolean {
  const keys = Object.keys(spec)
  for (const k of keys) {
    const sv = spec[k]
    const iv = impl[k]
    if (k === "activeEffects") {
      if (!activeEffectsEqual(sv as ReadonlyArray<NormalizedEffect>, iv as ReadonlyArray<NormalizedEffect>))
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

// ============================================================
// Stat block / monster helpers
// ============================================================

/** Multiattack length to extra attacks: first attack uses Attack action, rest are extra. */
export function multiattackExtraAttacks(multiattackLength: number): number {
  return multiattackLength > 0 ? multiattackLength - 1 : 0
}

/** Extract stat block fields from Quint's parsed StatBlock record. */
export function parseStatBlock(raw: unknown): {
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
    for (const [k, v] of speeds) {
      if (variantToString(k) === "Walk") {
        walkSpeed = Number(v)
        break
      }
    }
  }
  const multiattack = r.multiattack
  const multiattackLength = Array.isArray(multiattack) ? multiattack.length : 0
  const legendaryActionUses = Number(r.legendaryActionUses ?? 0n)
  const legendaryResistanceUses = Number(r.legendaryResistanceUses ?? 0n)
  const inLair = Boolean(r.inLair ?? false)
  const lairBonus = inLair ? 1 : 0

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
export function computeRechargedAbilities(
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

// ============================================================
// MBT seed helpers
// ============================================================

/** Log the seed from a completed MBT run for reproducibility. */
export function logMbtSeed(label: string, result: { seed: string }): void {
  console.log(`[${label}] seed: ${result.seed}`)
}

// ============================================================
// Shared event construction helpers
// ============================================================

const EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>()
const EMPTY_DAMAGE_SET = new Set<DamageType>()

/** Shared empty damage modifier sets — reused across all TAKE_DAMAGE events. */
export const EMPTY_DAMAGE_MODS = {
  resistances: EMPTY_DAMAGE_SET,
  vulnerabilities: EMPTY_DAMAGE_SET,
  immunities: EMPTY_DAMAGE_SET
} as const

// Re-export ITFBigInt for convenience
export { ITFBigInt } from "@firfi/quint-connect/zod"
