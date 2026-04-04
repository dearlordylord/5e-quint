/**
 * Battle Machine MBT — battle-level state comparison against battleMachine.
 * One createActor(battleMachine), each Quint action maps to one actor.send() call.
 * Complements battle.mbt.test.ts (per-creature projection against dndMachine actors).
 */
import * as path from "node:path"

import { defineDriver, run, stateCheck } from "@firfi/quint-connect"
import { Option } from "effect"
import { describe, it } from "vitest"
import { createActor } from "xstate"
import { z } from "zod"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleContext, BattleCreatureState, BattleEvent } from "#/battle-machine-types.ts"
import {
  compareNormalizedStates,
  ITFBigInt,
  ITFVariant,
  ITFVariantWithValue,
  logMbtSeed,
  mapDamageType,
  QUINT_CONDITION_MAP,
  QuintCreatureState,
  QuintMonsterResourceState,
  QuintSpellSlotState,
  QuintTurnState,
  variantToString
} from "#/mbt-shared.ts"
import type { CreatureId } from "#/types.ts"
import {
  armorClass,
  CreatureId as mkCreatureId,
  difficultyClass,
  spellId as mkSpellId,
  spellSlotLevel
} from "#/types.ts"

// ============================================================
// Quint state parsing (reuse battle-level schemas from B14)
// ============================================================

const QuintCombatant = z.object({
  creature: QuintCreatureState,
  turn: QuintTurnState,
  slots: QuintSpellSlotState,
  kind: z.any().transform(variantToString),
  monsterResources: QuintMonsterResourceState,
  statBlock: z.any(),
  rogueLevel: z.bigint(),
  monkLevel: z.bigint()
})

type ParsedCombatant = z.infer<typeof QuintCombatant>

const QuintBCreaturesMap = z.any().transform((raw: unknown) => {
  const result = new Map<string, ParsedCombatant>()
  if (raw instanceof Map) {
    for (const [k, v] of raw) result.set(String(k), QuintCombatant.parse(v))
  } else if (typeof raw === "object" && raw !== null) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) result.set(k, QuintCombatant.parse(v))
  }
  return result
})

const QuintInitiativeList = z.any().transform((raw: unknown) => {
  if (Array.isArray(raw)) return raw.map(String)
  return [] as Array<string>
})

const QuintBattleState = z.object({
  bCreatures: QuintBCreaturesMap,
  bInitiative: QuintInitiativeList,
  bTurnIndex: z.bigint(),
  bRound: z.bigint(),
  bTurnStarted: z.boolean(),
  bPhase: z.any(),
  bSpellStack: z.any()
})

// ============================================================
// Normalized battle creature state (for comparison)
// ============================================================

interface NormalizedBattleCreature {
  hp: number
  maxHp: number
  tempHp: number
  deathSavesSuccesses: number
  deathSavesFailures: number
  stable: boolean
  dead: boolean
  blinded: boolean
  charmed: boolean
  deafened: boolean
  exhaustion: number
  frightened: boolean
  grappled: boolean
  invisible: boolean
  paralyzed: boolean
  petrified: boolean
  poisoned: boolean
  prone: boolean
  restrained: boolean
  stunned: boolean
  unconscious: boolean
  incapacitatedSources: ReadonlySet<string>
  activeEffects: ReadonlyArray<{
    spellId: string
    turnsRemaining: number
    expiresAt: string
    casterId: string
    grantedResistances: ReadonlySet<string>
    grantedVulnerabilities: ReadonlySet<string>
    grantedImmunities: ReadonlySet<string>
  }>
  movementRemaining: number
  effectiveSpeed: number
  actionsRemaining: number
  attackActionUsed: boolean
  bonusActionUsed: boolean
  reactionAvailable: boolean
  freeInteractionUsed: boolean
  extraAttacksRemaining: number
  disengaged: boolean
  dodging: boolean
  readiedAction: boolean
  bonusActionSpellCast: boolean
  nonCantripActionSpellCast: boolean
  bonusMovementRemaining: number
  bonusMovementOAFree: boolean
  actionSurgeActionPending: boolean
  slotExpendedThisTurn: boolean
  slotsMax: ReadonlyArray<number>
  slotsCurrent: ReadonlyArray<number>
  pactSlotsMax: number
  pactSlotsCurrent: number
  pactSlotLevel: number
  concentrationSpellId: string
  legendaryActionsRemaining: number
  legendaryResistancesRemaining: number
  rechargeAvailable: Readonly<Record<string, boolean>>
  dailyUsesRemaining: Readonly<Record<string, number>>
  creatureKind: string
}

function quintCombatantToNormalized(c: ParsedCombatant): NormalizedBattleCreature {
  const s = c.creature
  const t = c.turn
  const ss = c.slots
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
    slotsMax: ss.slotsMax,
    slotsCurrent: ss.slotsCurrent,
    pactSlotsMax: Number(ss.pactSlotsMax),
    pactSlotsCurrent: Number(ss.pactSlotsCurrent),
    pactSlotLevel: Number(ss.pactSlotLevel),
    concentrationSpellId: ss.concentrationSpellId,
    legendaryActionsRemaining: Number(c.monsterResources.legendaryActionsRemaining),
    legendaryResistancesRemaining: Number(c.monsterResources.legendaryResistancesRemaining),
    rechargeAvailable: c.monsterResources.rechargeAvailable,
    dailyUsesRemaining: c.monsterResources.dailyUsesRemaining,
    creatureKind: c.kind
  }
}

const EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>()

function xstateCreatureToNormalized(c: BattleCreatureState): NormalizedBattleCreature {
  return {
    hp: c.hp,
    maxHp: c.maxHp,
    tempHp: c.tempHp,
    deathSavesSuccesses: c.deathSaves.successes,
    deathSavesFailures: c.deathSaves.failures,
    stable: c.stable,
    dead: c.dead,
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
    slotExpendedThisTurn: c.slotExpendedThisTurn,
    slotsMax: [...c.slotsMax],
    slotsCurrent: [...c.slotsCurrent],
    pactSlotsMax: c.pactSlotsMax,
    pactSlotsCurrent: c.pactSlotsCurrent,
    pactSlotLevel: c.pactSlotLevel,
    concentrationSpellId: Option.getOrElse(c.concentrationSpellId, () => ""),
    legendaryActionsRemaining: c.legendaryActionsRemaining,
    legendaryResistancesRemaining: c.legendaryResistancesRemaining,
    rechargeAvailable: c.rechargeAvailable,
    dailyUsesRemaining: c.dailyUsesRemaining,
    creatureKind: c.creatureKind
  }
}

// ============================================================
// Battle-level state for comparison
// ============================================================

interface BattleCompareState {
  creatures: Map<string, NormalizedBattleCreature>
  turnIndex: number
  round: number
  turnStarted: boolean
}

// ============================================================
// Driver
// ============================================================

const OI = ITFBigInt.optional()
const OV = ITFVariant.optional()
const OB = z.boolean().optional()
const OS = z.string().optional()

const battleDriverSchema = {
  bInit: {
    hp1: OI, hp2: OI, hp3: OI, hp4: OI,
    initRoll1: OI, initRoll2: OI, initRoll3: OI, initRoll4: OI,
    initRoll1b: OI, initRoll2b: OI, initRoll3b: OI, initRoll4b: OI,
    surprised1: OB, surprised2: OB, surprised3: OB, surprised4: OB,
  },
  bStartTurn: { rechargeD6: OI, sotDmg: OI, sotDt: OV, sotHeal: OI, sotSaveResult: OB, sotConSave: OB },
  bAttack: { targetId: OS, attackRoll: OI, dmg: OI, dt: OV, crit: OB, tAc: OI },
  bResolveHitReaction: { reactorId: OS, parryBonus: OI, cwReduction: OI, decision: OV },
  bResolveDmgReaction: { reactorId: OS, reductionAmt: OI, decision: OV },
  bAfterDamagePass: { reactorId: OS },
  bAfterDamageHellishRebuke: { rebukeDmg: OI, rebukeSaved: OB, reactorId: OS },
  bAfterDamageRetaliation: { retAtkRoll: OI, retDmg: OI, retDt: OV, retCrit: OB, retTgtAc: OI, reactorId: OS },
  bCastSaveSpell: {
    targetId: OS,
    saveDC: OI,
    saveRoll: OI,
    dmgOnFail: OI,
    halfOnSave: OB,
    dt: OV,
    cond: OV,
    applyCond: OB,
    slotLvl: OI,
    ritual: OB
  },
  bResolveCounterspell: { reactorId: OS, decision: ITFVariantWithValue.optional(), csSlotLvl: OI },
  bResolveSaveFailedReaction: { reactorId: OS, decision: OV },
  bCastConcentrationSpell: {
    targetId: OS,
    slotLvl: OI,
    duration: OI,
    spellId: OS,
    cond: OV,
    applyCond: OB,
    ritual: OB
  },
  bConcentrationCheck: { targetId: OS, conSaveSucceeded: OB },
  bCastAoE: { saveDC: OI, dmgOnFail: OI, halfOnSave: OB, dt: OV, cond: OV, applyCond: OB, slotLvl: OI, ritual: OB },
  bResolveAoETarget: { targetId: OS, saveRoll: OI },
  bMove: { threatened: z.any().optional() },
  bMovementOAPass: { reactorId: OS },
  bMovementOAAttack: { oaAtkRoll: OI, oaDmg: OI, oaDt: OV, oaCrit: OB, oaTgtAc: OI, reactorId: OS },
  bEndTurn: { eotSaveSucceeded: OB, eotDmg: OI, eotDt: OV, eotConSave: OB },
  bLegendaryPass: {},
  bLegendaryAttack: { monsterId: OS, laTarget: OS, laAtkRoll: OI, laDmg: OI, laDt: OV, laCrit: OB, laTgtAc: OI },
  bHeal: { targetId: OS, amount: OI },
  bCastBonusActionSpell: {
    targetId: OS,
    saveDC: OI,
    saveRoll: OI,
    dmgOnFail: OI,
    halfOnSave: OB,
    dt: OV,
    cond: OV,
    applyCond: OB,
    slotLvl: OI,
    spellName: OS
  },
  battleStep: {}
} as const

function p(picks: Record<string, unknown>, key: string, fallback: number): number {
  const v = picks[key]
  return v != null ? Number(v) : fallback
}
function ps(picks: Record<string, unknown>, key: string, fallback: string): string {
  const v = picks[key]
  return v != null ? String(v) : fallback
}
/** Pick a string and brand as CreatureId (MBT boundary). */
function pc(picks: Record<string, unknown>, key: string, fallback: string): CreatureId {
  return mkCreatureId(ps(picks, key, fallback))
}
/** Pick a nullable string and brand as CreatureId | null (MBT boundary). */
function pcn(picks: Record<string, unknown>, key: string): CreatureId | null {
  return picks[key] != null ? mkCreatureId(String(picks[key])) : null
}
function pb(picks: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = picks[key]
  return typeof v === "boolean" ? v : fallback
}

function createBattleMachineDriver() {
  return defineDriver(battleDriverSchema, () => {
    let actor: ReturnType<typeof createActor<typeof battleMachine>> | null = null

    function send(event: BattleEvent) {
      if (!actor) throw new Error("Actor not initialized")
      actor.send(event)
    }

    function ctx(): BattleContext {
      if (!actor) throw new Error("Actor not initialized")
      return actor.getSnapshot().context
    }

    function parseThreatenedSet(raw: unknown): Set<CreatureId> {
      if (raw instanceof Set) return new Set([...raw].map((x) => mkCreatureId(String(x))))
      if (Array.isArray(raw)) return new Set(raw.map((x) => mkCreatureId(String(x))))
      return new Set()
    }

    return {
      bInit: (picks: Record<string, unknown>) => {
        actor = createActor(battleMachine)
        actor.start()
        send({
          type: "BATTLE_INIT",
          creatures: [
            {
              id: mkCreatureId("A"), maxHp: p(picks, "hp1", 20), kind: "PC", caster: true, rogueLevel: 5,
              initiativeRoll: p(picks, "initRoll1", 10), initiativeRollB: p(picks, "initRoll1b", 10),
              surprised: pb(picks, "surprised1", false),
            },
            {
              id: mkCreatureId("B"), maxHp: p(picks, "hp2", 20), kind: "PC", caster: true,
              initiativeRoll: p(picks, "initRoll2", 10), initiativeRollB: p(picks, "initRoll2b", 10),
              surprised: pb(picks, "surprised2", false),
            },
            {
              id: mkCreatureId("C"), maxHp: p(picks, "hp3", 35), kind: "Monster",
              legendaryActions: 3, legendaryResistances: 3,
              initiativeRoll: p(picks, "initRoll3", 10), initiativeRollB: p(picks, "initRoll3b", 10),
              surprised: pb(picks, "surprised3", false),
            },
            {
              id: mkCreatureId("D"), maxHp: p(picks, "hp4", 20), kind: "PC", caster: true,
              initiativeRoll: p(picks, "initRoll4", 10), initiativeRollB: p(picks, "initRoll4b", 10),
              surprised: pb(picks, "surprised4", false),
            }
          ]
        })
      },
      bStartTurn: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_START_TURN",
          rechargeD6: p(picks, "rechargeD6", 3),
          sotDmg: p(picks, "sotDmg", 0),
          sotDt: mapDamageType(ps(picks, "sotDt", "Bludgeoning")),
          sotHeal: p(picks, "sotHeal", 0),
          sotSaveResult: pb(picks, "sotSaveResult", false),
          sotConSave: pb(picks, "sotConSave", false),
          deathSaveRoll: p(picks, "deathSaveRoll", 0)
        })
      },
      bAttack: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_ATTACK",
          targetId: pc(picks, "targetId", ""),
          attackRoll: p(picks, "attackRoll", 10),
          dmg: p(picks, "dmg", 5),
          dt: mapDamageType(ps(picks, "dt", "Slashing")),
          crit: pb(picks, "crit", false),
          tAc: armorClass(p(picks, "tAc", 15))
        })
      },
      bResolveHitReaction: (picks: Record<string, unknown>) => {
        const tag = ps(picks, "decision", "RPass")
        const decision =
          tag === "RShield"
            ? ({ tag: "RShield" } as const)
            : tag === "RParry"
              ? ({ tag: "RParry", bonus: p(picks, "parryBonus", 3) } as const)
              : tag === "RCuttingWords"
                ? ({ tag: "RCuttingWords", reduction: p(picks, "cwReduction", 6) } as const)
                : ({ tag: "RPass" } as const)
        send({
          type: "BATTLE_RESOLVE_HIT_REACTION",
          reactorId: pcn(picks, "reactorId"),
          decision
        })
      },
      bResolveDmgReaction: (picks: Record<string, unknown>) => {
        const tag = ps(picks, "decision", "RPass")
        const decision =
          tag === "RUncannyDodge"
            ? ({ tag: "RUncannyDodge" } as const)
            : tag === "RDamageReduction"
              ? ({ tag: "RDamageReduction", amount: p(picks, "reductionAmt", 5) } as const)
              : ({ tag: "RPass" } as const)
        send({
          type: "BATTLE_RESOLVE_DMG_REACTION",
          reactorId: pcn(picks, "reactorId"),
          decision
        })
      },
      bAfterDamagePass: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_AFTER_DAMAGE_PASS",
          reactorId: pcn(picks, "reactorId")
        })
      },
      bAfterDamageHellishRebuke: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_AFTER_DAMAGE_HELLISH_REBUKE",
          reactorId: pcn(picks, "reactorId"),
          rebukeDmg: p(picks, "rebukeDmg", 10),
          rebukeSaved: pb(picks, "rebukeSaved", false)
        })
      },
      bAfterDamageRetaliation: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_AFTER_DAMAGE_RETALIATION",
          reactorId: pcn(picks, "reactorId"),
          retAtkRoll: p(picks, "retAtkRoll", 10),
          retDmg: p(picks, "retDmg", 5),
          retDt: mapDamageType(ps(picks, "retDt", "Slashing")),
          retCrit: pb(picks, "retCrit", false),
          retTgtAc: armorClass(p(picks, "retTgtAc", 15))
        })
      },
      bCastSaveSpell: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_SAVE_SPELL",
          targetId: pc(picks, "targetId", ""),
          saveDC: difficultyClass(p(picks, "saveDC", 15)),
          saveRoll: p(picks, "saveRoll", 10),
          dmgOnFail: p(picks, "dmgOnFail", 10),
          halfOnSave: pb(picks, "halfOnSave", false),
          dt: mapDamageType(ps(picks, "dt", "Fire")),
          cond: QUINT_CONDITION_MAP[ps(picks, "cond", "CBlinded")] ?? "blinded",
          applyCond: pb(picks, "applyCond", false),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          spellName: ps(picks, "spellName", "guiding_bolt"),
          ritual: pb(picks, "ritual", false)
        })
      },
      bResolveCounterspell: (picks: Record<string, unknown>) => {
        const raw = picks["decision"] as { tag: string; value: unknown } | undefined
        const tag = raw ? variantToString(raw) : undefined
        const decision =
          tag === "RCounterspell"
            ? ({ tag: "RCounterspell", saveSucceeded: Boolean(raw!.value) } as const)
            : tag === "RPass"
              ? ({ tag: "RPass" } as const)
              : null
        send({
          type: "BATTLE_RESOLVE_COUNTERSPELL",
          reactorId: pcn(picks, "reactorId"),
          decision,
          csSlotLvl: spellSlotLevel(p(picks, "csSlotLvl", 3))
        })
      },
      bResolveSaveFailedReaction: (picks: Record<string, unknown>) => {
        const tag = ps(picks, "decision", "RPass")
        const decision =
          tag === "RLegendaryResistance" ? ({ tag: "RLegendaryResistance" } as const) : ({ tag: "RPass" } as const)
        send({
          type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
          reactorId: pcn(picks, "reactorId"),
          decision
        })
      },
      bCastConcentrationSpell: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_CONCENTRATION_SPELL",
          targetId: pc(picks, "targetId", ""),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          duration: p(picks, "duration", 5),
          spellId: mkSpellId(ps(picks, "spellId", "hold_person")),
          cond: QUINT_CONDITION_MAP[ps(picks, "cond", "CParalyzed")] ?? "paralyzed",
          applyCond: pb(picks, "applyCond", false),
          ritual: pb(picks, "ritual", false)
        })
      },
      bConcentrationCheck: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CONCENTRATION_CHECK",
          targetId: pc(picks, "targetId", ""),
          conSaveSucceeded: pb(picks, "conSaveSucceeded", false)
        })
      },
      bCastAoE: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_AOE",
          saveDC: difficultyClass(p(picks, "saveDC", 15)),
          dmgOnFail: p(picks, "dmgOnFail", 10),
          halfOnSave: pb(picks, "halfOnSave", false),
          dt: mapDamageType(ps(picks, "dt", "Fire")),
          cond: QUINT_CONDITION_MAP[ps(picks, "cond", "CBlinded")] ?? "blinded",
          applyCond: pb(picks, "applyCond", false),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          spellName: ps(picks, "spellName", "fireball"),
          ritual: pb(picks, "ritual", false)
        })
      },
      bResolveAoETarget: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_RESOLVE_AOE_TARGET",
          targetId: pcn(picks, "targetId"),
          saveRoll: p(picks, "saveRoll", 10)
        })
      },
      bMove: (picks: Record<string, unknown>) => {
        send({ type: "BATTLE_MOVE", threatened: parseThreatenedSet(picks["threatened"]) })
      },
      bMovementOAPass: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_MOVEMENT_OA_PASS",
          reactorId: pcn(picks, "reactorId")
        })
      },
      bMovementOAAttack: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_MOVEMENT_OA_ATTACK",
          reactorId: pcn(picks, "reactorId"),
          oaAtkRoll: p(picks, "oaAtkRoll", 10),
          oaDmg: p(picks, "oaDmg", 5),
          oaDt: mapDamageType(ps(picks, "oaDt", "Slashing")),
          oaCrit: pb(picks, "oaCrit", false),
          oaTgtAc: armorClass(p(picks, "oaTgtAc", 15))
        })
      },
      bEndTurn: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_END_TURN",
          eotSaveSucceeded: pb(picks, "eotSaveSucceeded", false),
          eotDmg: p(picks, "eotDmg", 0),
          eotDt: mapDamageType(ps(picks, "eotDt", "Bludgeoning")),
          eotConSave: pb(picks, "eotConSave", false)
        })
      },
      bLegendaryPass: () => {
        send({ type: "BATTLE_LEGENDARY_PASS" })
      },
      bLegendaryAttack: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_LEGENDARY_ATTACK",
          monsterId: pc(picks, "monsterId", ""),
          laTarget: pc(picks, "laTarget", ""),
          laAtkRoll: p(picks, "laAtkRoll", 10),
          laDmg: p(picks, "laDmg", 10),
          laDt: mapDamageType(ps(picks, "laDt", "Slashing")),
          laCrit: pb(picks, "laCrit", false),
          laTgtAc: armorClass(p(picks, "laTgtAc", 15))
        })
      },
      bHeal: (picks: Record<string, unknown>) => {
        send({ type: "BATTLE_HEAL", targetId: pc(picks, "targetId", ""), amount: p(picks, "amount", 5) })
      },
      bCastBonusActionSpell: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_SAVE_SPELL",
          targetId: pc(picks, "targetId", ""),
          saveDC: difficultyClass(p(picks, "saveDC", 15)),
          saveRoll: p(picks, "saveRoll", 10),
          dmgOnFail: p(picks, "dmgOnFail", 10),
          halfOnSave: pb(picks, "halfOnSave", false),
          dt: mapDamageType(ps(picks, "dt", "Fire")),
          cond: QUINT_CONDITION_MAP[ps(picks, "cond", "CBlinded")] ?? "blinded",
          applyCond: pb(picks, "applyCond", false),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          spellName: ps(picks, "spellName", "guiding_bolt"),
          ritual: false,
          bonusAction: true
        })
      },
      battleStep: () => {},
      getState: (): BattleCompareState => {
        const c = ctx()
        const creatures = new Map<string, NormalizedBattleCreature>()
        for (const [id, cr] of c.creatures) creatures.set(id, xstateCreatureToNormalized(cr))
        return { creatures, turnIndex: c.turnIndex, round: c.round, turnStarted: c.turnStarted }
      },
      config: () => ({ statePath: [] as Array<string> })
    }
  })
}

// ============================================================
// State comparison
// ============================================================

const battleMachineStateCheck = stateCheck(
  (raw: unknown) => {
    const parsed = QuintBattleState.parse(raw)
    const creatures = new Map<string, NormalizedBattleCreature>()
    for (const [id, combatant] of parsed.bCreatures) creatures.set(id, quintCombatantToNormalized(combatant))
    return {
      creatures,
      turnIndex: Number(parsed.bTurnIndex),
      round: Number(parsed.bRound),
      turnStarted: parsed.bTurnStarted
    } satisfies BattleCompareState
  },
  (spec: BattleCompareState, impl: BattleCompareState) => {
    // Compare battle-level fields
    if (spec.turnIndex !== impl.turnIndex || spec.round !== impl.round || spec.turnStarted !== impl.turnStarted)
      return false
    // Compare per-creature fields
    for (const [id, specState] of spec.creatures) {
      const implState = impl.creatures.get(id)
      if (!implState) return false
      if (!compareNormalizedStates(specState, implState)) return false
    }
    return true
  }
)

// ============================================================
// Test harness
// ============================================================

describe("Battle Machine MBT", () => {
  const isDev = process.env["MBT_DEV"] === "1"
  const MBT_TRACE_COUNT = 1
  const MBT_STEP_COUNT = isDev ? 5 : 10
  const MBT_MAX_SAMPLES = isDev ? 10 : 50
  const specPath = path.resolve(import.meta.dirname, "../../battle.qnt")

  it("replays battle traces against battleMachine", async () => {
    const dir = process.env["MBT_REPLAY_DIR"]
    if (dir) {
      const { replayFromDir } = await import("./mbt-replay.js")
      const result = await replayFromDir({
        dir,
        driver: createBattleMachineDriver(),
        stateCheck: battleMachineStateCheck
      })
      console.log(`[battle machine MBT] replayed ${result.tracesReplayed} traces from ${dir}`)
    } else {
      const result = await run({
        spec: specPath,
        init: "bInit",
        step: "battleStep",
        driver: createBattleMachineDriver(),
        backend: "rust",
        nTraces: Number(process.env["MBT_TRACES"] ?? MBT_TRACE_COUNT),
        maxSteps: Number(process.env["MBT_STEPS"] ?? MBT_STEP_COUNT),
        maxSamples: Number(process.env["MBT_MAX_SAMPLES"] ?? MBT_MAX_SAMPLES),
        stateCheck: battleMachineStateCheck
      })
      logMbtSeed("battle machine MBT", result)
    }
  }, 300_000)
})
