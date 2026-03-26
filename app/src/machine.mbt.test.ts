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

import { type DndEvent, dndMachine, type DndSnapshot } from "#/machine.ts"
import type { ActionType, Condition, DamageType, IncapSource, ShoveChoice, Size } from "#/types.ts"
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
  nonCantripActionSpellCast: z.boolean()
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

// Combined state from all 3 Quint vars
const QuintFullState = z.object({
  state: QuintCreatureState,
  turnState: QuintTurnState,
  spellSlots: QuintSpellSlotState,
  turnPhase: z.string()
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
  // turnPhase
  readonly turnPhase: string
  // SpellSlotState
  readonly slotsMax: ReadonlyArray<number>
  readonly slotsCurrent: ReadonlyArray<number>
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: string
}

// ============================================================
// XState snapshot → normalized state
// ============================================================

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
    concentrationSpellId: c.concentrationSpellId
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
    turnPhase: raw.turnPhase,
    slotsMax: ss.slotsMax,
    slotsCurrent: ss.slotsCurrent,
    pactSlotsMax: Number(ss.pactSlotsMax),
    pactSlotsCurrent: Number(ss.pactSlotsCurrent),
    pactSlotLevel: Number(ss.pactSlotLevel),
    concentrationSpellId: ss.concentrationSpellId
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
  init: { maxHp: ITFBigInt },
  doTakeDamage: { amount: ITFBigInt, dt: ITFVariant, isCrit: z.boolean() },
  doTakeDamageWithMods: {
    amount: ITFBigInt,
    dt: ITFVariant,
    isCrit: z.boolean(),
    resType: ITFVariant,
    vulnType: ITFVariant
  },
  doHeal: { amount: ITFBigInt },
  doGrantTempHp: { amount: ITFBigInt, keepOld: z.boolean() },
  doDeathSave: { roll: ITFBigInt },
  doStabilize: {},
  doKnockOut: {},
  doApplyCondition: { c: ITFVariant },
  doRemoveCondition: { c: ITFVariant },
  doAddExhaustion: { levels: ITFBigInt },
  doReduceExhaustion: { levels: ITFBigInt },
  doStartTurn: {
    callerSpeedMod: ITFBigInt,
    isGrappling: z.boolean(),
    grappledSmall: z.boolean(),
    deathSaveRoll: ITFBigInt.optional(),
    numEffects: ITFBigInt.optional(),
    effSpellId: z.string().optional(),
    effHeal: ITFBigInt.optional(),
    effTempHp: ITFBigInt.optional(),
    effSaveResult: z.boolean().optional(),
    effDmgAmount: ITFBigInt.optional(),
    effDmgType: ITFVariant.optional(),
    effConSave: z.boolean().optional()
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
    conSave: z.boolean().optional()
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
  step: {} // dead character no-op
} as const

function mapDamageType(s: string): DamageType {
  return QUINT_DAMAGE_TYPE_MAP[s] ?? "bludgeoning"
}

const HIT_DICE_TOTAL = 5

const dndDriver = defineDriver(driverSchema, () => {
  let actor: ReturnType<typeof createActor<typeof dndMachine>> | null = null

  function ensureActor() {
    if (!actor) throw new Error("Actor not initialized — init must come first")
    return actor
  }

  function send(event: DndEvent) {
    ensureActor().send(event)
  }

  return {
    init: ({ maxHp: mhp }) => {
      if (actor) actor.stop()
      // Match Quint FRESH_TURN: movementRemaining=30, effectiveSpeed=30, extraAttacks=1, hitDice=5
      const INIT_SPEED = 30
      actor = createActor(dndMachine, {
        input: {
          maxHp: Number(mhp),
          hitDiceRemaining: HIT_DICE_TOTAL,
          effectiveSpeed: INIT_SPEED,
          movementRemaining: INIT_SPEED,
          extraAttacksRemaining: 1
        }
      })
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
    doDeathSave: ({ roll }) => {
      send({ type: "DEATH_SAVE", d20Roll: d20Roll(Number(roll)) })
    },
    doStabilize: () => {
      send({ type: "STABILIZE" })
    },
    doKnockOut: () => {
      send({ type: "KNOCK_OUT" })
    },
    doApplyCondition: ({ c }) => {
      send({ type: "APPLY_CONDITION", condition: QUINT_CONDITION_MAP[c] ?? "blinded" })
    },
    doRemoveCondition: ({ c }) => {
      send({ type: "REMOVE_CONDITION", condition: QUINT_CONDITION_MAP[c] ?? "blinded" })
    },
    doAddExhaustion: ({ levels }) => {
      send({ type: "ADD_EXHAUSTION", levels: Number(levels) })
    },
    doReduceExhaustion: ({ levels }) => {
      send({ type: "REDUCE_EXHAUSTION", levels: Number(levels) })
    },
    doStartTurn: ({
      callerSpeedMod,
      deathSaveRoll: dsRoll,
      effConSave,
      effDmgAmount,
      effDmgType,
      effHeal,
      effSaveResult,
      effSpellId,
      effTempHp,
      grappledSmall,
      isGrappling,
      numEffects
    }) => {
      // Quint uses TEST_CONFIG: Walk=30, no armor penalty, extraAttack=1
      const BASE_SPEED = 30
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
              conSaveSucceeded: effConSave ?? false
            }
          ]
      send({
        type: "START_TURN",
        baseSpeed: BASE_SPEED,
        armorPenalty: 0,
        extraAttacks: 1,
        callerSpeedModifier: Number(callerSpeedMod),
        isGrappling,
        grappledTargetTwoSizesSmaller: grappledSmall,
        deathSaveRoll: dsRoll != null ? d20Roll(Number(dsRoll)) : undefined,
        startOfTurnEffects: effects
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
      dmgSpellId,
      dmgType,
      numDmg,
      numSaves,
      saveCondition,
      saveSpellId,
      saveSucceeded
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
      const damages = !numDmg
        ? []
        : [
            {
              spellId: dmgSpellId ?? "",
              damage: Number(dmgAmount ?? 0),
              damageType: mapDamageType(dmgType ?? "Bludgeoning"),
              conSaveSucceeded: conSave ?? false
            }
          ]
      send({ type: "END_TURN", endOfTurnSaves: saves, endOfTurnDamage: damages })
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
      send({ type: "LONG_REST", totalHitDice: HIT_DICE_TOTAL })
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
    step: () => {}, // dead character no-op
    getState: () => snapshotToNormalized(ensureActor().getSnapshot()),
    config: () => ({ statePath: [] })
  }
})

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

describe("DnD MBT", () => {
  it("replays Quint traces against XState machine", async () => {
    const MBT_TRACE_COUNT = 50
    const MBT_STEP_COUNT = 30
    await run({
      spec: path.resolve(import.meta.dirname, "../../dnd.qnt"),
      driver: dndDriver,
      backend: "rust",
      nTraces: Number(process.env["MBT_TRACES"] ?? MBT_TRACE_COUNT),
      maxSteps: Number(process.env["MBT_STEPS"] ?? MBT_STEP_COUNT),
      stateCheck: stateCheck(
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
            } else if (sv !== iv) return false
          }
          return true
        }
      )
    })
  }, 180_000)
})
