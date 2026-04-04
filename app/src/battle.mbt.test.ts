/**
 * Battle Projection MBT — generates traces from battle.qnt and replays
 * per-creature state against existing dndMachine XState actors.
 */
import * as path from "node:path"

import { defineDriver, run, stateCheck } from "@firfi/quint-connect"
import { Option } from "effect"
import { describe, it } from "vitest"
import { createActor } from "xstate"
import { z } from "zod"

import { effectiveInitRoll } from "#/battle-machine-actions-turn.ts"
import { type DndEvent, dndMachine, type DndSnapshot } from "#/machine.ts"
import {
  compareNormalizedStates,
  computeRechargedAbilities,
  EMPTY_DAMAGE_MODS,
  ITFBigInt,
  ITFVariant,
  ITFVariantWithValue,
  logMbtSeed,
  mapDamageType,
  type NormalizedState,
  QUINT_CONDITION_MAP,
  QuintCreatureState,
  QuintMonsterResourceState,
  QuintSpellSlotState,
  QuintTurnState,
  snapshotToNormalized,
  variantToString
} from "#/mbt-shared.ts"
import type { Condition, CreatureId, CreatureKind, DamageType } from "#/types.ts"
import {
  classLevel,
  CreatureId as mkCreatureId,
  healAmount,
  resourceCount,
  spellId as mkSpellId,
  spellSlotLevel
} from "#/types.ts"

// ============================================================
// Battle-level Zod schemas (B14.2)
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

// Parse bCreatures map: CreatureId -> Combatant
const QuintBCreaturesMap = z.any().transform((raw: unknown) => {
  const result = new Map<string, ParsedCombatant>()
  if (raw instanceof Map) {
    for (const [k, v] of raw) {
      result.set(String(k), QuintCombatant.parse(v))
    }
  } else if (typeof raw === "object" && raw !== null) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      result.set(k, QuintCombatant.parse(v))
    }
  }
  return result
})

// Parse bInitiative: List[CreatureId]
const QuintInitiativeList = z.any().transform((raw: unknown) => {
  if (Array.isArray(raw)) return raw.map(String)
  return [] as Array<string>
})

const QuintBattleState = z.object({
  bCreatures: QuintBCreaturesMap,
  bInitiative: QuintInitiativeList,
  bTurnIndex: z.bigint(),
  bRound: z.bigint(),
  bPhase: z.any() // parsed but only used for phase detection
})

// ============================================================
// Per-creature normalized state (battle subset)
// ============================================================

/**
 * Fields to compare between Quint Combatant and XState dndMachine.
 * Excludes class state fields (battle Combatant only tracks rogueLevel/monkLevel).
 */

/** Battle comparison excludes class states and turnPhase (not tracked by battle Combatant). */
const BATTLE_EXCLUDED_KEYS_ARRAY = [
  "turnPhase",
  "hitDiceRemaining",
  "secondWindCharges",
  "secondWindMax",
  "actionSurgeCharges",
  "actionSurgeMax",
  "actionSurgeUsedThisTurn",
  "indomitableCharges",
  "indomitableMax",
  "heroicInspiration",
  "fighterLevel",
  "barbarianLevel",
  "raging",
  "rageCharges",
  "rageMaxCharges",
  "rageTurnsRemaining",
  "attackedOrForcedSaveThisTurn",
  "rageExtendedWithBA",
  "recklessThisTurn",
  "frenzyUsedThisTurn",
  "intimidatingPresenceUsed",
  "relentlessRageTimesUsed",
  "brutalStrikeUsedThisTurn",
  "monkLevel",
  "focusPoints",
  "focusMax",
  "uncannyMetabolismUsed",
  "stunningStrikeUsedThisTurn",
  "wholenessCharges",
  "wholenessMax",
  "paladinLevel",
  "layOnHandsPool",
  "layOnHandsMax",
  "paladinChannelDivinityCharges",
  "paladinChannelDivinityMax",
  "smiteFreeUsed",
  "rogueLevel",
  "sneakAttackUsedThisTurn",
  "steadyAimUsedThisTurn",
  "cunningStrikeUsesThisTurn",
  "clericLevel",
  "clericChannelDivinityCharges",
  "clericChannelDivinityMax",
  "druidLevel",
  "wildShapeCharges",
  "wildShapeMax",
  "inWildShape",
  "wildResurgenceSlotUsedThisLR",
  "sorcererLevel",
  "sorceryPoints",
  "sorceryPointsMax",
  "sorcerousRestorationUsed",
  "innateSorceryActive",
  "innateSorceryCharges",
  "innateSorceryTurnsRemaining",
  "metamagicUsedThisCast",
  "apotheosisUsedThisTurn",
  "warlockLevel",
  "mysticArcanumUsed",
  "magicalCunningUsed",
  "eldritchSmiteUsedThisTurn",
  "wizardLevel",
  "arcaneRecoveryUsed",
  "overchannelUsesThisLR",
  "rangerLevel",
  "huntersMarkFreeUses",
  "tirelessCharges",
  "tirelessMax",
  "naturesVeilCharges",
  "naturesVeilMax",
  "bardLevel",
  "bardicInspirationCharges",
  "bardicInspirationMax",
  "slotExpendedThisTurn"
] as const satisfies ReadonlyArray<keyof NormalizedState>

type BattleExcludedKeys = (typeof BATTLE_EXCLUDED_KEYS_ARRAY)[number]
type BattleCreatureState = Omit<NormalizedState, BattleExcludedKeys>
const BATTLE_EXCLUDED_KEYS = new Set<string>(BATTLE_EXCLUDED_KEYS_ARRAY)

/** Project NormalizedState to BattleCreatureState by dropping class/turnPhase fields. */
function projectToBattle(full: NormalizedState): BattleCreatureState {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(full)) {
    if (!BATTLE_EXCLUDED_KEYS.has(k)) result[k] = v
  }
  return result as BattleCreatureState
}

function quintCombatantToNormalized(c: ParsedCombatant): BattleCreatureState {
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

// ============================================================
// Battle projection driver
// ============================================================

type Actor = ReturnType<typeof createActor<typeof dndMachine>>
const EMPTY_CONDITION_IMMUNITIES = new Set<Condition>()

// Battle driver schema: all fields optional because battleStep = any { ... }
// generates nondets for ALL actions — unused actions have None picks.
const OI = ITFBigInt.optional()
const OV = ITFVariant.optional()
const OB = z.boolean().optional()
const OS = z.string().optional()

const battleDriverSchema = {
  bInit: {
    hp1: OI,
    hp2: OI,
    hp3: OI,
    hp4: OI,
    initRoll1: OI,
    initRoll2: OI,
    initRoll3: OI,
    initRoll4: OI,
    initRoll1b: OI,
    initRoll2b: OI,
    initRoll3b: OI,
    initRoll4b: OI,
    surprised1: OB,
    surprised2: OB,
    surprised3: OB,
    surprised4: OB
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
  battleStep: {} // composite — framework expands to leaf actions
} as const

function createBattleProjectionDriver() {
  return defineDriver(battleDriverSchema, () => {
    const actors = new Map<CreatureId, Actor>()
    const statBlocks = new Map<
      string,
      {
        multiattackLength: number
        rechargeMinRolls: Record<string, number>
      }
    >()
    const creatureKinds = new Map<string, CreatureKind>()
    let initiative: Array<string> = []
    let turnIndex = 0

    // Track who has been initialized with START_TURN
    const turnStarted = new Set<string>()

    // Pick helpers: values are already parsed by schema (number, string, boolean)
    function pickBigInt(picks: ReadonlyMap<string, unknown>, key: string): number | undefined {
      const v = picks.get(key)
      return v != null ? Number(v) : undefined
    }
    function pickString(picks: ReadonlyMap<string, unknown>, key: string): string | undefined {
      const v = picks.get(key)
      return v != null ? String(v) : undefined
    }
    function pickBool(picks: ReadonlyMap<string, unknown>, key: string): boolean | undefined {
      const v = picks.get(key)
      return typeof v === "boolean" ? v : undefined
    }
    function pickVariant(picks: ReadonlyMap<string, unknown>, key: string): string | undefined {
      const v = picks.get(key)
      return v != null ? String(v) : undefined
    }
    function send(id: string, event: DndEvent) {
      const actor = actors.get(mkCreatureId(id))
      if (!actor) throw new Error(`No actor for ${id}`)
      actor.send(event)
    }

    /** Transition creature to waitingForTurn if still acting (XState lifecycle). */
    function ensureWaitingForTurn(id: string) {
      const snap = getSnap(id)
      if (snap.matches({ turnPhase: "acting" })) {
        send(id, { type: "END_TURN", endOfTurnSaves: [], endOfTurnDamage: [] })
      }
    }

    function getSnap(id: string): DndSnapshot {
      const actor = actors.get(mkCreatureId(id))
      if (!actor) throw new Error(`No actor for ${id}`)
      return actor.getSnapshot()
    }

    function activeId(): string {
      return initiative[turnIndex]
    }

    // ============================================================
    // Action projection mapping (B14.4)
    // ============================================================

    function handleBInit(picks: ReadonlyMap<string, unknown>) {
      // bInit creates 4 creatures with nondeterministic HP.
      // A=PC caster rogue5, B=PC caster, C=Monster, D=PC caster (CS chain depth)
      const hp1 = pickBigInt(picks, "hp1") ?? 20
      const hp2 = pickBigInt(picks, "hp2") ?? 20
      const hp3 = pickBigInt(picks, "hp3") ?? 35
      const hp4 = pickBigInt(picks, "hp4") ?? 20

      // Spell slot config for mkCaster: slots 1:4, 2:3, 3:2
      const casterSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0]

      // A: PC caster with rogueLevel=5
      const actorA = createActor(dndMachine, {
        input: {
          maxHp: hp1,
          effectiveSpeed: 30,
          movementRemaining: 30,
          extraAttacksRemaining: 1,
          rogueLevel: classLevel(5),
          creatureKind: "PC",
          slotsMax: casterSlots,
          slotsCurrent: casterSlots
        }
      })
      actorA.start()
      actorA.send({ type: "ENTER_COMBAT" })
      actors.set(mkCreatureId("A"), actorA)
      creatureKinds.set("A", "PC")

      // B: PC caster, no class levels
      const actorB = createActor(dndMachine, {
        input: {
          maxHp: hp2,
          effectiveSpeed: 30,
          movementRemaining: 30,
          extraAttacksRemaining: 1,
          creatureKind: "PC",
          slotsMax: casterSlots,
          slotsCurrent: casterSlots
        }
      })
      actorB.start()
      actorB.send({ type: "ENTER_COMBAT" })
      actors.set(mkCreatureId("B"), actorB)
      creatureKinds.set("B", "PC")

      // C: Monster with TEST_MONSTER_STAT_BLOCK (3 LA, 3 LR, breath_weapon recharge 5)
      statBlocks.set("C", { multiattackLength: 0, rechargeMinRolls: { breath_weapon: 5 } })
      const actorC = createActor(dndMachine, {
        input: {
          maxHp: hp3,
          effectiveSpeed: 30,
          movementRemaining: 30,
          extraAttacksRemaining: 1,
          creatureKind: "Monster",
          legendaryActionsRemaining: resourceCount(3),
          legendaryResistancesRemaining: resourceCount(3),
          rechargeAvailable: {},
          dailyUsesRemaining: {}
        }
      })
      actorC.start()
      actorC.send({ type: "ENTER_COMBAT" })
      actors.set(mkCreatureId("C"), actorC)
      creatureKinds.set("C", "Monster")

      // D: PC caster, no class levels (enables CS chain depth >= 2)
      const actorD = createActor(dndMachine, {
        input: {
          maxHp: hp4,
          effectiveSpeed: 30,
          movementRemaining: 30,
          extraAttacksRemaining: 1,
          creatureKind: "PC",
          slotsMax: casterSlots,
          slotsCurrent: casterSlots
        }
      })
      actorD.start()
      actorD.send({ type: "ENTER_COMBAT" })
      actors.set(mkCreatureId("D"), actorD)
      creatureKinds.set("D", "PC")

      const initEntries = [
        {
          id: "A",
          score: effectiveInitRoll(
            pickBigInt(picks, "initRoll1") ?? 10,
            pickBigInt(picks, "initRoll1b") ?? 10,
            pickBool(picks, "surprised1") ?? false
          )
        },
        {
          id: "B",
          score: effectiveInitRoll(
            pickBigInt(picks, "initRoll2") ?? 10,
            pickBigInt(picks, "initRoll2b") ?? 10,
            pickBool(picks, "surprised2") ?? false
          )
        },
        {
          id: "C",
          score: effectiveInitRoll(
            pickBigInt(picks, "initRoll3") ?? 10,
            pickBigInt(picks, "initRoll3b") ?? 10,
            pickBool(picks, "surprised3") ?? false
          )
        },
        {
          id: "D",
          score: effectiveInitRoll(
            pickBigInt(picks, "initRoll4") ?? 10,
            pickBigInt(picks, "initRoll4b") ?? 10,
            pickBool(picks, "surprised4") ?? false
          )
        }
      ]
      // Stable sort descending (matches Quint's selection sort: ties preserve input order)
      initEntries.sort((a, b) => b.score - a.score)
      initiative = initEntries.map((e) => e.id)
      turnIndex = 0
      turnStarted.clear()

      // Battle creatures start with FRESH_TURN (actionsRemaining=1) and can act
      // immediately. Send START_TURN to put all actors in "acting" state so
      // USE_ACTION etc. are accepted by the XState machine.
      for (const [id, actor] of actors) {
        actor.send({
          type: "START_TURN",
          baseSpeed: 30,
          armorPenalty: 0,
          extraAttacks: 1,
          callerSpeedModifier: 0,
          isGrappling: false,
          grappledTargetTwoSizesSmaller: false,
          startOfTurnEffects: []
        })
        turnStarted.add(id)
      }
    }

    function handleBStartTurn(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const isMonster = creatureKinds.get(id) === "Monster"
      const sb = statBlocks.get(id)

      ensureWaitingForTurn(id)
      const ctx = getSnap(id).context

      const rechargeD6 = pickBigInt(picks, "rechargeD6") ?? 3
      const sotDmg = pickBigInt(picks, "sotDmg") ?? 0
      const sotDt = pickVariant(picks, "sotDt") ?? "Bludgeoning"
      const sotHeal = pickBigInt(picks, "sotHeal") ?? 0
      const sotSaveResult = pickBool(picks, "sotSaveResult") ?? false
      const sotConSave = pickBool(picks, "sotConSave") ?? false

      // Check if creature has active effects (for start-of-turn processing)
      const hasEffects = ctx.activeEffects.length > 0 && (sotDmg > 0 || sotHeal > 0)

      const effects = hasEffects
        ? [
            {
              spellId: mkSpellId(""),
              healAmount: sotHeal,
              tempHpAmount: 0,
              saveResult: sotSaveResult,
              damageAmount: sotDmg,
              damageType: mapDamageType(sotDt),
              conSaveSucceeded: sotConSave,
              resistances: new Set<DamageType>(),
              vulnerabilities: new Set<DamageType>(),
              immunities: new Set<DamageType>()
            }
          ]
        : []

      send(id, {
        type: "START_TURN",
        baseSpeed: 30,
        armorPenalty: 0,
        extraAttacks: 1, // FRESH_TURN.extraAttacksRemaining is always 1 in the Quint spec
        callerSpeedModifier: 0,
        isGrappling: false,
        grappledTargetTwoSizesSmaller: false,
        startOfTurnEffects: effects,
        rechargedAbilities:
          isMonster && sb
            ? computeRechargedAbilities(rechargeD6, sb.rechargeMinRolls, ctx.rechargeAvailable)
            : undefined
      })
      turnStarted.add(id)
    }

    function handleBAttack(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const targetId = pickString(picks, "targetId") ?? ""
      const attackRoll = pickBigInt(picks, "attackRoll") ?? 10
      const dmg = pickBigInt(picks, "dmg") ?? 5
      const dt = pickVariant(picks, "dt") ?? "Slashing"
      const crit = pickBool(picks, "crit") ?? false
      const tAc = pickBigInt(picks, "tAc") ?? 15

      const ctx = getSnap(id).context

      // Determine if using extra attack or action
      if (ctx.attackActionUsed && ctx.extraAttacksRemaining > 0) {
        send(id, { type: "USE_EXTRA_ATTACK" })
      } else {
        send(id, { type: "USE_ACTION", actionType: "attack" })
      }

      // Check if hit
      const hit = attackRoll >= tAc || attackRoll === 20
      if (hit) {
        // Defer damage if any reactor can interrupt; apply immediately otherwise.
        const hasEligibleReactors = [...actors.entries()].some(([cid, actor]) => {
          if (cid === id) return false
          const snap = actor.getSnapshot()
          return snap.context.reactionAvailable && !snap.matches({ damageTrack: "dead" })
        })

        if (!hasEligibleReactors) {
          // No reactors — damage applied immediately (same as Quint path)
          send(targetId, {
            type: "TAKE_DAMAGE",
            amount: dmg,
            damageType: mapDamageType(dt),
            resistances: new Set<DamageType>(),
            vulnerabilities: new Set<DamageType>(),
            immunities: new Set<DamageType>(),
            isCritical: crit
          })
          pendingAfterDamage = { damageSource: id, damagedCreature: targetId }
        } else {
          // Damage deferred — will be applied on resolution
          pendingAttack = {
            attacker: id,
            target: targetId,
            damage: dmg,
            damageType: mapDamageType(dt),
            isCritical: crit,
            attackRoll,
            targetAc: tAc
          }
        }
      }
    }

    /** Pending attack state for deferred damage */
    let pendingAttack: {
      attacker: string
      target: string
      damage: number
      damageType: DamageType
      isCritical: boolean
      attackRoll: number
      targetAc: number
    } | null = null

    function handleBResolveHitReaction(picks: ReadonlyMap<string, unknown>) {
      if (!pendingAttack) return // no-op when not in attack reaction phase

      const reactorId = pickString(picks, "reactorId")
      const parryBonus = pickBigInt(picks, "parryBonus") ?? 3
      const cwReduction = pickBigInt(picks, "cwReduction") ?? 6
      const decisionRaw = picks.get("decision")
      const decision = variantToString(decisionRaw)

      if (!reactorId) {
        // remaining == 0: all reactors offered, advance from hit phase
        // Check if the attack still hits after AC modifications
        const stillHit = pendingAttack.attackRoll >= pendingAttack.targetAc || pendingAttack.attackRoll === 20
        if (stillHit) {
          // Check if target has damage-phase reaction available
          const targetSnap = getSnap(pendingAttack.target)
          const targetHasReaction = targetSnap.context.reactionAvailable && !targetSnap.matches({ damageTrack: "dead" })

          if (!targetHasReaction) {
            // No damage reactions — apply damage immediately
            const atk = pendingAttack
            send(pendingAttack.target, {
              type: "TAKE_DAMAGE",
              amount: pendingAttack.damage,
              damageType: pendingAttack.damageType,
              resistances: new Set<DamageType>(),
              vulnerabilities: new Set<DamageType>(),
              immunities: new Set<DamageType>(),
              isCritical: pendingAttack.isCritical
            })
            pendingAfterDamage = { damageSource: atk.attacker, damagedCreature: atk.target }
            pendingAttack = null
          }
          // If target has reaction, leave pendingAttack for bResolveDmgReaction
        } else {
          // Miss — no damage
          pendingAttack = null
        }
        return
      }

      // A reactor is deciding
      if (decision === "RShield") {
        send(reactorId, { type: "USE_REACTION" })
        pendingAttack.targetAc += 5
      } else if (decision.startsWith("RParry")) {
        send(reactorId, { type: "USE_REACTION" })
        pendingAttack.targetAc += parryBonus
      } else if (decision.startsWith("RCuttingWords")) {
        send(reactorId, { type: "USE_REACTION" })
        pendingAttack.attackRoll -= cwReduction
      }
      // RPass: no reaction spent, no changes
    }

    function handleBResolveDmgReaction(picks: ReadonlyMap<string, unknown>) {
      if (!pendingAttack) return

      const reactorId = pickString(picks, "reactorId")
      const reductionAmt = pickBigInt(picks, "reductionAmt") ?? 5
      const decisionRaw = picks.get("decision")
      const decision = variantToString(decisionRaw)

      if (!reactorId) {
        // remaining == 0: all reactors offered, deal damage
        const atk = pendingAttack
        send(pendingAttack.target, {
          type: "TAKE_DAMAGE",
          amount: pendingAttack.damage,
          damageType: pendingAttack.damageType,
          ...EMPTY_DAMAGE_MODS,
          isCritical: pendingAttack.isCritical
        })
        pendingAfterDamage = { damageSource: atk.attacker, damagedCreature: atk.target }
        pendingAttack = null
        return
      }

      // Damage reduction reactions
      if (decision === "RUncannyDodge") {
        send(reactorId, { type: "USE_REACTION" })
        pendingAttack.damage = Math.floor(pendingAttack.damage / 2)
      } else if (decision.startsWith("RDamageReduction")) {
        send(reactorId, { type: "USE_REACTION" })
        pendingAttack.damage = Math.max(0, pendingAttack.damage - reductionAmt)
      }
      // RPass: no change
    }

    function handleBAfterDamagePass(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      if (!reactorId) {
        // remaining == 0: after-damage window closed
        pendingAfterDamage = null
      }
    }

    function handleBAfterDamageHellishRebuke(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      if (!reactorId) {
        // remaining == 0: after-damage window closed
        pendingAfterDamage = null
        return
      }

      const rebukeDmg = pickBigInt(picks, "rebukeDmg") ?? 10
      const rebukeSaved = pickBool(picks, "rebukeSaved") ?? false

      send(reactorId, { type: "USE_REACTION" })
      // Damage source tracked in pendingAfterDamage (set when damage is applied).
      if (pendingAfterDamage) {
        const actualDmg = rebukeSaved ? Math.floor(rebukeDmg / 2) : rebukeDmg
        const target = pendingAfterDamage.damageSource
        send(target, {
          type: "TAKE_DAMAGE",
          amount: actualDmg,
          damageType: "fire" as DamageType,
          ...EMPTY_DAMAGE_MODS,
          isCritical: false
        })
        pendingAfterDamage = { damageSource: reactorId, damagedCreature: target }
      }
    }

    function handleBAfterDamageRetaliation(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      if (!reactorId) {
        // remaining == 0: after-damage window closed
        pendingAfterDamage = null
        return
      }

      const retAtkRoll = pickBigInt(picks, "retAtkRoll") ?? 10
      const retDmg = pickBigInt(picks, "retDmg") ?? 5
      const retDt = pickVariant(picks, "retDt") ?? "Slashing"
      const retCrit = pickBool(picks, "retCrit") ?? false
      const retTgtAc = pickBigInt(picks, "retTgtAc") ?? 15

      send(reactorId, { type: "USE_REACTION" })
      const hit = retAtkRoll >= retTgtAc || retAtkRoll === 20
      if (hit && pendingAfterDamage) {
        const target = pendingAfterDamage.damageSource
        send(target, {
          type: "TAKE_DAMAGE",
          amount: retDmg,
          damageType: mapDamageType(retDt),
          ...EMPTY_DAMAGE_MODS,
          isCritical: retCrit
        })
        pendingAfterDamage = { damageSource: reactorId, damagedCreature: target }
      }
    }

    /** Track after-damage context for Hellish Rebuke / Retaliation */
    let pendingAfterDamage: { damageSource: string; damagedCreature: string } | null = null

    /** Track deferred save-failed context for LR interrupt (PISaveFailed / PISaveFailedAoE).
     *  When a save fails and the target has reaction available (LR eligible),
     *  effects are NOT applied immediately — they're deferred until bResolveSaveFailedReaction. */
    let pendingSaveFailed: {
      target: string
      caster: string
      damageOnFail: number
      halfOnSuccess: boolean
      damageType: DamageType
      conditionOnFail: Condition
      applyCondition: boolean
      saveSucceeded: boolean // flipped to true by LR
    } | null = null

    /** Check if target creature has reaction available (eligible for LR). */
    function hasLRReactor(targetId: string): boolean {
      const actor = actors.get(mkCreatureId(targetId))
      if (!actor) return false
      const snap = actor.getSnapshot()
      return snap.context.reactionAvailable && !snap.matches({ damageTrack: "dead" })
    }

    function handleBCastSaveSpell(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const targetId = pickString(picks, "targetId") ?? ""
      const saveDC = pickBigInt(picks, "saveDC") ?? 15
      const saveRoll = pickBigInt(picks, "saveRoll") ?? 10
      const dmgOnFail = pickBigInt(picks, "dmgOnFail") ?? 10
      const halfOnSave = pickBool(picks, "halfOnSave") ?? false
      const dt = pickVariant(picks, "dt") ?? "Fire"
      const cond = pickVariant(picks, "cond") ?? "CBlinded"
      const applyCond = pickBool(picks, "applyCond") ?? false
      const slotLvl = pickBigInt(picks, "slotLvl") ?? 1
      const ritual = pickBool(picks, "ritual") ?? false

      // Spend action only — slot deferred until CS resolves (SRD 5.2.1)
      send(id, { type: "USE_ACTION", actionType: "magic" })

      pendingSpell = {
        caster: id,
        target: targetId,
        saveDC,
        saveRoll,
        damageOnFail: dmgOnFail,
        halfOnSuccess: halfOnSave,
        damageType: mapDamageType(dt),
        conditionOnFail: QUINT_CONDITION_MAP[cond] ?? "blinded",
        applyCondition: applyCond,
        slotLvl,
        ritual
      }

      const hasCSReactors = hasEligibleCSReactors(id, csWindowOffered)

      if (!hasCSReactors) {
        // Resolve save immediately — expend deferred slot (ritual skips expenditure)
        if (!ritual) send(id, { type: "EXPEND_SLOT", level: spellSlotLevel(slotLvl) })
        resolveSpellSave(pendingSpell)
        pendingSpell = null
      }
    }

    /** Pending spell context (slot deferred until CS resolves) */
    let pendingSpell: {
      caster: string
      target: string
      saveDC: number
      saveRoll: number
      damageOnFail: number
      halfOnSuccess: boolean
      damageType: DamageType
      conditionOnFail: Condition
      applyCondition: boolean
      slotLvl: number
      ritual: boolean
    } | null = null

    /** Pending AoE context (slot deferred until CS resolves) */
    let pendingAoE: {
      caster: string
      saveDC: number
      damageOnFail: number
      halfOnSuccess: boolean
      damageType: DamageType
      conditionOnFail: Condition
      applyCondition: boolean
      ritual: boolean
      slotLvl: number
    } | null = null

    /** Pending concentration context (slot + effects deferred until CS resolves) */
    let pendingConcentration: {
      caster: string
      target: string
      spellId: string
      duration: number
      conditionOnFail: Condition
      applyCondition: boolean
      slotLvl: number
      ritual: boolean
    } | null = null

    /** CS chain: tracks nested Counterspell-on-Counterspell outcomes.
     *  Each entry records whether the CS succeeded and the interrupted spell's caster
     *  (needed to check remaining reactors when returning to that window during unwinding). */
    const csChain: Array<{ succeeded: boolean; csCaster: string }> = []

    /** Reactors already offered in the original spell's CS window.
     *  Used to determine if remaining reactors exist when CS chain unwinds. */
    const csWindowOffered = new Set<string>()

    function resolveSpellSave(spell: NonNullable<typeof pendingSpell>) {
      const saved = spell.saveRoll >= spell.saveDC
      if (saved) {
        if (spell.halfOnSuccess && spell.damageOnFail > 0) {
          const halfDmg = Math.floor(spell.damageOnFail / 2)
          send(spell.target, {
            type: "TAKE_DAMAGE",
            amount: halfDmg,
            damageType: spell.damageType,
            resistances: new Set<DamageType>(),
            vulnerabilities: new Set<DamageType>(),
            immunities: new Set<DamageType>(),
            isCritical: false
          })
          pendingAfterDamage = { damageSource: spell.caster, damagedCreature: spell.target }
        }
      } else {
        // Save failed — check for LR-eligible reactor before applying effects
        if (hasLRReactor(spell.target)) {
          // Defer effects until bResolveSaveFailedReaction
          pendingSaveFailed = {
            target: spell.target,
            caster: spell.caster,
            damageOnFail: spell.damageOnFail,
            halfOnSuccess: spell.halfOnSuccess,
            damageType: spell.damageType,
            conditionOnFail: spell.conditionOnFail,
            applyCondition: spell.applyCondition,
            saveSucceeded: false
          }
        } else {
          // No LR — apply fail effects immediately
          applyFailEffects(
            spell.target,
            spell.caster,
            spell.damageOnFail,
            spell.damageType,
            spell.conditionOnFail,
            spell.applyCondition
          )
        }
      }
    }

    /** Apply fail effects: condition + damage. Shared by resolveSpellSave and bResolveSaveFailedReaction. */
    function applyFailEffects(
      target: string,
      caster: string,
      damageOnFail: number,
      damageType: DamageType,
      conditionOnFail: Condition,
      applyCondition: boolean
    ) {
      if (applyCondition) {
        send(target, {
          type: "APPLY_CONDITION",
          condition: conditionOnFail,
          conditionImmunities: EMPTY_CONDITION_IMMUNITIES
        })
      }
      if (damageOnFail > 0) {
        send(target, {
          type: "TAKE_DAMAGE",
          amount: damageOnFail,
          damageType,
          resistances: new Set<DamageType>(),
          vulnerabilities: new Set<DamageType>(),
          immunities: new Set<DamageType>(),
          isCritical: false
        })
        pendingAfterDamage = { damageSource: caster, damagedCreature: target }
      }
    }

    /** Check if there are eligible CS reactors excluding a caster and offered set. */
    function hasEligibleCSReactors(casterId: string, offered: ReadonlySet<string>): boolean {
      return [...actors.entries()].some(([c, actor]) => {
        if (c === casterId || offered.has(c as string)) return false
        const snap = actor.getSnapshot()
        if (!snap.context.reactionAvailable || snap.matches({ damageTrack: "dead" })) return false
        return snap.context.slotsCurrent.slice(2).some((s) => s > 0)
      })
    }

    function originalCasterId(): string {
      return pendingSpell?.caster ?? pendingAoE?.caster ?? pendingConcentration?.caster ?? ""
    }

    function handleBResolveCounterspell(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      const decision = picks.get("decision") as { tag: string; value: unknown } | undefined
      const csSlotLvl = pickBigInt(picks, "csSlotLvl") ?? 3
      if (!reactorId) {
        if (csChain.length > 0) {
          // CS chain unwinding. Walk level by level, checking remaining at each.
          let fizzleBelow = false
          while (csChain.length > 0) {
            const entry = csChain.pop()!
            if (fizzleBelow) {
              // This level was fizzled → its target is unaffected.
              fizzleBelow = false
            } else if (entry.succeeded) {
              fizzleBelow = true
              continue // Don't check remaining yet — need to see what's below
            }
            // CS failed or was fizzled. Check remaining at the returned-to window.
            // The returned-to window's caster is the CS caster of the entry we just popped
            // (we're returning to THEIR CS window). At depth 0, it's the original caster.
            const parentCaster = csChain.length > 0 ? csChain[csChain.length - 1].csCaster : originalCasterId()
            const offered = csChain.length === 0 ? csWindowOffered : new Set<string>()
            if (hasEligibleCSReactors(parentCaster, offered)) {
              return // Quint re-enters this window — more bResolveCounterspell steps coming
            }
          }
          if (fizzleBelow) {
            pendingSpell = null
            pendingAoE = null
            pendingConcentration = null
            csWindowOffered.clear()

            return
          }
          csWindowOffered.clear()
        }
        // Depth 0: resolve original spell.
        if (pendingSpell) {
          if (!pendingSpell.ritual)
            send(pendingSpell.caster, { type: "EXPEND_SLOT", level: spellSlotLevel(pendingSpell.slotLvl) })
          resolveSpellSave(pendingSpell)
          pendingSpell = null
        } else if (pendingAoE) {
          if (!pendingAoE.ritual)
            send(pendingAoE.caster, { type: "EXPEND_SLOT", level: spellSlotLevel(pendingAoE.slotLvl) })
        } else if (pendingConcentration) {
          resolveConcentrationSpell(pendingConcentration)
          pendingConcentration = null
        }
        csWindowOffered.clear()
        return
      }

      // Track offered reactors at original window depth.
      if (csChain.length === 0) {
        csWindowOffered.add(reactorId)
      }

      if (decision?.tag.startsWith("RCounterspell")) {
        send(reactorId, { type: "USE_REACTION" })
        send(reactorId, { type: "EXPEND_SLOT", level: spellSlotLevel(csSlotLvl) })
        const conSaveSucceeded = Boolean(decision.value)
        csChain.push({ succeeded: !conSaveSucceeded, csCaster: reactorId })
      }
    }

    function handleBResolveSaveFailedReaction(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      const decisionRaw = picks.get("decision")
      const decision = variantToString(decisionRaw)

      if (!reactorId) {
        // No remaining reactors — apply deferred effects based on saveSucceeded flag
        if (pendingSaveFailed) {
          const sf = pendingSaveFailed
          pendingSaveFailed = null
          if (sf.saveSucceeded) {
            // LR flipped save to succeeded — half damage if applicable, no condition
            if (sf.halfOnSuccess && sf.damageOnFail > 0) {
              const halfDmg = Math.floor(sf.damageOnFail / 2)
              send(sf.target, {
                type: "TAKE_DAMAGE",
                amount: halfDmg,
                damageType: sf.damageType,
                resistances: new Set<DamageType>(),
                vulnerabilities: new Set<DamageType>(),
                immunities: new Set<DamageType>(),
                isCritical: false
              })
              pendingAfterDamage = { damageSource: sf.caster, damagedCreature: sf.target }
            }
          } else {
            // No LR used — full fail effects
            applyFailEffects(
              sf.target,
              sf.caster,
              sf.damageOnFail,
              sf.damageType,
              sf.conditionOnFail,
              sf.applyCondition
            )
          }
        }
        return
      }

      if (decision === "RLegendaryResistance") {
        // LR: spend reaction, flip save to succeeded
        send(reactorId, { type: "USE_REACTION" })
        if (pendingSaveFailed) {
          pendingSaveFailed.saveSucceeded = true
          // Effects applied when remaining==0 (reactorId is null)
          // But in Quint, LR immediately resolves — apply now
          const sf = pendingSaveFailed
          pendingSaveFailed = null
          if (sf.halfOnSuccess && sf.damageOnFail > 0) {
            const halfDmg = Math.floor(sf.damageOnFail / 2)
            send(sf.target, {
              type: "TAKE_DAMAGE",
              amount: halfDmg,
              damageType: sf.damageType,
              resistances: new Set<DamageType>(),
              vulnerabilities: new Set<DamageType>(),
              immunities: new Set<DamageType>(),
              isCritical: false
            })
            pendingAfterDamage = { damageSource: sf.caster, damagedCreature: sf.target }
          }
        }
      }
      // RPass: do nothing, keep pending for next reactor
    }

    function handleBCastConcentrationSpell(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const targetId = pickString(picks, "targetId") ?? ""
      const slotLvl = pickBigInt(picks, "slotLvl") ?? 1
      const duration = pickBigInt(picks, "duration") ?? 5
      const spellId = pickString(picks, "spellId") ?? "hold_person"
      const cond = pickVariant(picks, "cond") ?? "CParalyzed"
      const applyCond = pickBool(picks, "applyCond") ?? false
      const ritual = pickBool(picks, "ritual") ?? false

      // Spend action only — slot + concentration deferred until CS resolves (SRD 5.2.1)
      send(id, { type: "USE_ACTION", actionType: "magic" })

      pendingConcentration = {
        caster: id,
        target: targetId,
        spellId,
        duration,
        conditionOnFail: QUINT_CONDITION_MAP[cond] ?? "paralyzed",
        applyCondition: applyCond,
        slotLvl,
        ritual
      }

      const hasCSReactors = hasEligibleCSReactors(id, csWindowOffered)
      if (!hasCSReactors) {
        resolveConcentrationSpell(pendingConcentration)
        pendingConcentration = null
      }
    }

    /** Resolve a concentration spell: expend slot, start concentration, add effects. */
    function resolveConcentrationSpell(conc: NonNullable<typeof pendingConcentration>) {
      if (!conc.ritual) send(conc.caster, { type: "EXPEND_SLOT", level: spellSlotLevel(conc.slotLvl) })

      // If already concentrating, break old concentration
      const ctx = getSnap(conc.caster).context
      if (Option.isSome(ctx.concentrationSpellId)) {
        breakConcentrationAndPropagate(conc.caster)
      }

      // Start concentration
      send(conc.caster, {
        type: "START_CONCENTRATION",
        spellId: mkSpellId(conc.spellId),
        durationTurns: conc.duration,
        expiresAt: "end",
        casterId: mkCreatureId(conc.caster)
      })

      // Add effect to target
      send(conc.target, {
        type: "ADD_EFFECT",
        spellId: mkSpellId(conc.spellId),
        durationTurns: conc.duration,
        expiresAt: "end",
        casterId: mkCreatureId(conc.caster)
      })

      // Apply condition to target
      if (conc.applyCondition) {
        send(conc.target, {
          type: "APPLY_CONDITION",
          condition: conc.conditionOnFail,
          conditionImmunities: EMPTY_CONDITION_IMMUNITIES
        })
      }
    }

    function handleBConcentrationCheck(picks: ReadonlyMap<string, unknown>) {
      const targetId = pickString(picks, "targetId") ?? ""
      const conSaveSucceeded = pickBool(picks, "conSaveSucceeded") ?? false

      if (!conSaveSucceeded) {
        breakConcentrationAndPropagate(targetId)
      }
    }

    /** Break concentration for a caster and remove effects from all creatures. */
    function breakConcentrationAndPropagate(casterId: string) {
      const casterSnap = getSnap(casterId)
      const concOpt = casterSnap.context.concentrationSpellId
      if (Option.isNone(concOpt)) return
      const sid = concOpt.value

      send(casterId, { type: "BREAK_CONCENTRATION" })
      send(casterId, { type: "REMOVE_EFFECT", spellId: sid })

      // Remove effects from other creatures cast by this caster (match by casterId)
      for (const [cid, actor] of actors) {
        if (cid === casterId) continue
        const snap = actor.getSnapshot()
        for (const eff of snap.context.activeEffects) {
          if (eff.casterId === casterId) {
            send(cid, { type: "REMOVE_EFFECT", spellId: eff.spellId })
          }
        }
      }
    }

    function handleBCastAoE(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const saveDC = pickBigInt(picks, "saveDC") ?? 15
      const dmgOnFail = pickBigInt(picks, "dmgOnFail") ?? 10
      const halfOnSave = pickBool(picks, "halfOnSave") ?? false
      const dt = pickVariant(picks, "dt") ?? "Fire"
      const cond = pickVariant(picks, "cond") ?? "CBlinded"
      const applyCond = pickBool(picks, "applyCond") ?? false
      const slotLvl = pickBigInt(picks, "slotLvl") ?? 1
      const ritual = pickBool(picks, "ritual") ?? false

      // Spend action only — slot deferred until CS resolves (SRD 5.2.1)
      send(id, { type: "USE_ACTION", actionType: "magic" })

      pendingAoE = {
        caster: id,
        saveDC,
        damageOnFail: dmgOnFail,
        halfOnSuccess: halfOnSave,
        slotLvl,
        damageType: mapDamageType(dt),
        conditionOnFail: QUINT_CONDITION_MAP[cond] ?? "blinded",
        applyCondition: applyCond,
        ritual
      }

      const hasCSReactors = hasEligibleCSReactors(id, csWindowOffered)

      if (!hasCSReactors) {
        if (!ritual) send(id, { type: "EXPEND_SLOT", level: spellSlotLevel(slotLvl) })
      }
    }

    function handleBResolveAoETarget(picks: ReadonlyMap<string, unknown>) {
      if (!pendingAoE) return

      const targetId = pickString(picks, "targetId")
      const saveRoll = pickBigInt(picks, "saveRoll") ?? 10

      if (!targetId) {
        // remaining == 0: all targets processed, back to active turn
        pendingAoE = null
        return
      }

      const saved = saveRoll >= pendingAoE.saveDC
      if (saved) {
        if (pendingAoE.halfOnSuccess && pendingAoE.damageOnFail > 0) {
          const halfDmg = Math.floor(pendingAoE.damageOnFail / 2)
          send(targetId, {
            type: "TAKE_DAMAGE",
            amount: halfDmg,
            damageType: pendingAoE.damageType,
            resistances: new Set<DamageType>(),
            vulnerabilities: new Set<DamageType>(),
            immunities: new Set<DamageType>(),
            isCritical: false
          })
          pendingAfterDamage = { damageSource: pendingAoE.caster, damagedCreature: targetId }
        }
      } else {
        // Failed save — check for LR-eligible reactor before applying effects
        if (hasLRReactor(targetId)) {
          // Defer effects until bResolveSaveFailedReaction (PISaveFailedAoE path)
          pendingSaveFailed = {
            target: targetId,
            caster: pendingAoE.caster,
            damageOnFail: pendingAoE.damageOnFail,
            halfOnSuccess: pendingAoE.halfOnSuccess,
            damageType: pendingAoE.damageType,
            conditionOnFail: pendingAoE.conditionOnFail,
            applyCondition: pendingAoE.applyCondition,
            saveSucceeded: false
          }
        } else {
          // No LR — apply fail effects immediately
          applyFailEffects(
            targetId,
            pendingAoE.caster,
            pendingAoE.damageOnFail,
            pendingAoE.damageType,
            pendingAoE.conditionOnFail,
            pendingAoE.applyCondition
          )
        }
      }
    }

    function handleBMove(_picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      // bMove spends 5ft of movement
      send(id, { type: "USE_MOVEMENT", feet: 5, movementCost: 1 })
    }

    function handleBMovementOAPass(_picks: ReadonlyMap<string, unknown>) {
      // Pass — no events
    }

    function handleBMovementOAAttack(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      if (!reactorId) return

      const oaAtkRoll = pickBigInt(picks, "oaAtkRoll") ?? 10
      const oaDmg = pickBigInt(picks, "oaDmg") ?? 5
      const oaDt = pickVariant(picks, "oaDt") ?? "Slashing"
      const oaCrit = pickBool(picks, "oaCrit") ?? false
      const oaTgtAc = pickBigInt(picks, "oaTgtAc") ?? 15

      send(reactorId, { type: "USE_REACTION" })

      const hit = oaAtkRoll >= oaTgtAc || oaAtkRoll === 20
      if (hit) {
        const moverId = activeId()
        // OA hits during movement — may enter hit reaction chain
        // For simplicity in the projection, apply damage directly
        // The reaction chain is handled by subsequent bResolveHitReaction/bResolveDmgReaction steps
        const hasHitReactors = [...actors.entries()].some(([cid, actor]) => {
          if (cid === reactorId) return false
          const snap = actor.getSnapshot()
          return snap.context.reactionAvailable && !snap.matches({ damageTrack: "dead" })
        })

        if (!hasHitReactors) {
          send(moverId, {
            type: "TAKE_DAMAGE",
            amount: oaDmg,
            damageType: mapDamageType(oaDt),
            resistances: new Set<DamageType>(),
            vulnerabilities: new Set<DamageType>(),
            immunities: new Set<DamageType>(),
            isCritical: oaCrit
          })
          pendingAfterDamage = { damageSource: reactorId, damagedCreature: moverId }
        } else {
          pendingAttack = {
            attacker: reactorId,
            target: moverId,
            damage: oaDmg,
            damageType: mapDamageType(oaDt),
            isCritical: oaCrit,
            attackRoll: oaAtkRoll,
            targetAc: oaTgtAc
          }
        }
      }
    }

    function handleBEndTurn(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const ctx = getSnap(id).context

      const eotSaveSucceeded = pickBool(picks, "eotSaveSucceeded") ?? false
      const eotDmg = pickBigInt(picks, "eotDmg") ?? 0
      const eotDt = pickVariant(picks, "eotDt") ?? "Bludgeoning"
      const eotConSave = pickBool(picks, "eotConSave") ?? false

      // Build end-of-turn effects
      const hasEotEffects = ctx.activeEffects.length > 0

      const saves =
        hasEotEffects && eotSaveSucceeded
          ? ctx.activeEffects
              .filter((e) => e.expiresAt === "end")
              .map((e) => ({
                spellId: e.spellId,
                saveSucceeded: true,
                conditionsToRemove: ["blinded" as Condition]
              }))
          : []

      const damages =
        hasEotEffects && eotDmg > 0
          ? [
              {
                spellId: mkSpellId(""),
                damage: eotDmg,
                damageType: mapDamageType(eotDt),
                conSaveSucceeded: eotConSave,
                ...EMPTY_DAMAGE_MODS
              }
            ]
          : []

      send(id, { type: "END_TURN", endOfTurnSaves: saves, endOfTurnDamage: damages })
      turnStarted.delete(id)

      // Defer turn advancement — bLegendaryPass/bLegendaryAttack or before() will advance.
      pendingEndTurn = true
    }

    let pendingEndTurn = false

    function advanceTurn() {
      const initLen = initiative.length
      turnIndex = (turnIndex + 1) % initLen
      pendingEndTurn = false
    }

    function handleBLegendaryPass(_picks: ReadonlyMap<string, unknown>) {
      // Only advance turn if we're actually in the LA window (after bEndTurn)
      if (pendingEndTurn) advanceTurn()
    }

    function handleBLegendaryAttack(picks: ReadonlyMap<string, unknown>) {
      // Only act if we're in the LA window (after bEndTurn)
      if (!pendingEndTurn) return

      const monsterId = pickString(picks, "monsterId") ?? ""
      const laTarget = pickString(picks, "laTarget") ?? ""
      const laAtkRoll = pickBigInt(picks, "laAtkRoll") ?? 10
      const laDmg = pickBigInt(picks, "laDmg") ?? 10
      const laDt = pickVariant(picks, "laDt") ?? "Slashing"
      const laCrit = pickBool(picks, "laCrit") ?? false
      const laTgtAc = pickBigInt(picks, "laTgtAc") ?? 15

      ensureWaitingForTurn(monsterId)

      // Spend LA
      send(monsterId, { type: "USE_LEGENDARY_ACTION", actionName: "tail_attack" })

      const hit = laAtkRoll >= laTgtAc || laAtkRoll === 20
      if (hit) {
        send(laTarget, {
          type: "TAKE_DAMAGE",
          amount: laDmg,
          damageType: mapDamageType(laDt),
          ...EMPTY_DAMAGE_MODS,
          isCritical: laCrit
        })
        pendingAfterDamage = { damageSource: monsterId, damagedCreature: laTarget }
      }

      advanceTurn()
    }

    function handleBHeal(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const targetId = pickString(picks, "targetId") ?? ""
      const amount = pickBigInt(picks, "amount") ?? 5

      send(id, { type: "USE_ACTION", actionType: "magic" })
      send(targetId, { type: "HEAL", amount: healAmount(amount) })
    }

    // ============================================================
    // Schema-based handler dispatch
    // ============================================================

    // Convert typed picks to Map for existing handlers
    function toMap(p: Record<string, unknown>): ReadonlyMap<string, unknown> {
      return new Map(Object.entries(p))
    }

    function before(action: string) {
      if (pendingEndTurn && action !== "bLegendaryPass" && action !== "bLegendaryAttack") {
        advanceTurn()
      }
    }

    return {
      bInit: (p: Record<string, unknown>) => {
        before("bInit")
        handleBInit(toMap(p))
      },
      bStartTurn: (p: Record<string, unknown>) => {
        before("bStartTurn")
        handleBStartTurn(toMap(p))
      },
      bAttack: (p: Record<string, unknown>) => {
        before("bAttack")
        handleBAttack(toMap(p))
      },
      bResolveHitReaction: (p: Record<string, unknown>) => {
        before("bResolveHitReaction")
        handleBResolveHitReaction(toMap(p))
      },
      bResolveDmgReaction: (p: Record<string, unknown>) => {
        before("bResolveDmgReaction")
        handleBResolveDmgReaction(toMap(p))
      },
      bAfterDamagePass: (p: Record<string, unknown>) => {
        before("bAfterDamagePass")
        handleBAfterDamagePass(toMap(p))
      },
      bAfterDamageHellishRebuke: (p: Record<string, unknown>) => {
        before("bAfterDamageHellishRebuke")
        handleBAfterDamageHellishRebuke(toMap(p))
      },
      bAfterDamageRetaliation: (p: Record<string, unknown>) => {
        before("bAfterDamageRetaliation")
        handleBAfterDamageRetaliation(toMap(p))
      },
      bCastSaveSpell: (p: Record<string, unknown>) => {
        before("bCastSaveSpell")
        handleBCastSaveSpell(toMap(p))
      },
      bResolveCounterspell: (p: Record<string, unknown>) => {
        before("bResolveCounterspell")
        handleBResolveCounterspell(toMap(p))
      },
      bResolveSaveFailedReaction: (p: Record<string, unknown>) => {
        before("bResolveSaveFailedReaction")
        handleBResolveSaveFailedReaction(toMap(p))
      },
      bCastConcentrationSpell: (p: Record<string, unknown>) => {
        before("bCastConcentrationSpell")
        handleBCastConcentrationSpell(toMap(p))
      },
      bConcentrationCheck: (p: Record<string, unknown>) => {
        before("bConcentrationCheck")
        handleBConcentrationCheck(toMap(p))
      },
      bCastAoE: (p: Record<string, unknown>) => {
        before("bCastAoE")
        handleBCastAoE(toMap(p))
      },
      bResolveAoETarget: (p: Record<string, unknown>) => {
        before("bResolveAoETarget")
        handleBResolveAoETarget(toMap(p))
      },
      bMove: () => {
        before("bMove")
        handleBMove(new Map())
      },
      bMovementOAPass: () => {
        before("bMovementOAPass")
        handleBMovementOAPass(new Map())
      },
      bMovementOAAttack: (p: Record<string, unknown>) => {
        before("bMovementOAAttack")
        handleBMovementOAAttack(toMap(p))
      },
      bEndTurn: (p: Record<string, unknown>) => {
        before("bEndTurn")
        handleBEndTurn(toMap(p))
      },
      bLegendaryPass: () => {
        before("bLegendaryPass")
        handleBLegendaryPass(new Map())
      },
      bLegendaryAttack: (p: Record<string, unknown>) => {
        before("bLegendaryAttack")
        handleBLegendaryAttack(toMap(p))
      },
      bHeal: (p: Record<string, unknown>) => {
        before("bHeal")
        handleBHeal(toMap(p))
      },
      battleStep: () => {}, // composite — framework expands to leaf actions
      getState: () => {
        const result = new Map<string, BattleCreatureState>()
        for (const [id, actor] of actors) {
          result.set(id, projectToBattle(snapshotToNormalized(actor.getSnapshot())))
        }
        return result
      },
      config: () => ({ statePath: [] as Array<string> })
    }
  })
}

// ============================================================
// State comparison (B14.5)
// ============================================================

type BattleDriverState = Map<string, BattleCreatureState>

const battleStateCheck = stateCheck(
  (raw: unknown) => {
    const parsed = QuintBattleState.parse(raw)
    const result = new Map<string, BattleCreatureState>()
    for (const [id, combatant] of parsed.bCreatures) {
      result.set(id, quintCombatantToNormalized(combatant))
    }
    return result
  },
  (spec: BattleDriverState, impl: BattleDriverState) => {
    for (const [id, specState] of spec) {
      const implState = impl.get(id)
      if (!implState) return false
      if (!compareNormalizedStates(specState, implState)) return false
    }
    return true
  }
)

// ============================================================
// Test harness (B14.5)
// ============================================================

describe("Battle Projection MBT", () => {
  // MBT_DEV=1: fast dev feedback (fewer samples, shorter traces).
  // Default: comprehensive run for CI / perpetual background validation.
  const isDev = process.env["MBT_DEV"] === "1"
  const MBT_TRACE_COUNT = 1
  const MBT_STEP_COUNT = isDev ? 5 : 10
  const MBT_MAX_SAMPLES = isDev ? 10 : 50
  const specPath = path.resolve(import.meta.dirname, "../../battle.qnt")

  it("replays battle traces per-creature against dndMachine actors", async () => {
    const dir = process.env["MBT_REPLAY_DIR"]
    if (dir) {
      // Replay from pre-generated ITF files (skips Quint evaluator).
      const { replayFromDir } = await import("./mbt-replay.js")
      const result = await replayFromDir({
        dir,
        driver: createBattleProjectionDriver(),
        stateCheck: battleStateCheck
      })
      console.log(`[battle MBT] replayed ${result.tracesReplayed} traces from ${dir}`)
    } else {
      const result = await run({
        spec: specPath,
        init: "bInit",
        step: "battleStep",
        driver: createBattleProjectionDriver(),
        backend: "rust",
        nTraces: Number(process.env["MBT_TRACES"] ?? MBT_TRACE_COUNT),
        maxSteps: Number(process.env["MBT_STEPS"] ?? MBT_STEP_COUNT),
        maxSamples: Number(process.env["MBT_MAX_SAMPLES"] ?? MBT_MAX_SAMPLES),
        stateCheck: battleStateCheck
      })
      logMbtSeed("battle MBT", result)
    }
  }, 300_000)
})
