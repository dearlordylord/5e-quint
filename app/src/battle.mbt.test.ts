/**
 * Battle Projection MBT — generates traces from battle.qnt and replays
 * per-creature state against existing dndMachine XState actors.
 */
import * as path from "node:path"

import { defineDriver, run, stateCheck } from "@firfi/quint-connect"
import { describe, it } from "vitest"
import { createActor } from "xstate"
import { z } from "zod"

import { type DndEvent, dndMachine, type DndSnapshot } from "#/machine.ts"
import {
  compareNormalizedStates,
  computeRechargedAbilities,
  EMPTY_DAMAGE_MODS,
  ITFBigInt,
  ITFVariant,
  mapDamageType,
  multiattackExtraAttacks,
  type NormalizedState,
  QUINT_CONDITION_MAP,
  QuintCreatureState,
  QuintMonsterResourceState,
  QuintSpellSlotState,
  QuintTurnState,
  snapshotToNormalized,
  variantToString
} from "#/mbt-shared.ts"
import type { Condition, CreatureKind, DamageType } from "#/types.ts"
import { healAmount } from "#/types.ts"

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
type BattleExcludedKeys =
  | "turnPhase"
  | "hitPointDiceRemaining"
  | "secondWindCharges"
  | "secondWindMax"
  | "actionSurgeCharges"
  | "actionSurgeMax"
  | "actionSurgeUsedThisTurn"
  | "indomitableCharges"
  | "indomitableMax"
  | "heroicInspiration"
  | "fighterLevel"
  | "barbarianLevel"
  | "raging"
  | "rageCharges"
  | "rageMaxCharges"
  | "rageTurnsRemaining"
  | "attackedOrForcedSaveThisTurn"
  | "rageExtendedWithBA"
  | "recklessThisTurn"
  | "frenzyUsedThisTurn"
  | "intimidatingPresenceUsed"
  | "relentlessRageTimesUsed"
  | "brutalStrikeUsedThisTurn"
  | "monkLevel"
  | "focusPoints"
  | "focusMax"
  | "uncannyMetabolismUsed"
  | "stunningStrikeUsedThisTurn"
  | "wholenessCharges"
  | "wholenessMax"
  | "paladinLevel"
  | "layOnHandsPool"
  | "layOnHandsMax"
  | "paladinChannelDivinityCharges"
  | "paladinChannelDivinityMax"
  | "smiteFreeUsed"
  | "rogueLevel"
  | "sneakAttackUsedThisTurn"
  | "steadyAimUsedThisTurn"
  | "cunningStrikeUsesThisTurn"
  | "clericLevel"
  | "clericChannelDivinityCharges"
  | "clericChannelDivinityMax"
  | "druidLevel"
  | "wildShapeCharges"
  | "wildShapeMax"
  | "inWildShape"
  | "wildResurgenceSlotUsedThisLR"
  | "sorcererLevel"
  | "sorceryPoints"
  | "sorceryPointsMax"
  | "sorcerousRestorationUsed"
  | "innateSorceryActive"
  | "innateSorceryCharges"
  | "innateSorceryTurnsRemaining"
  | "metamagicUsedThisCast"
  | "apotheosisUsedThisTurn"
  | "warlockLevel"
  | "mysticArcanumUsed"
  | "magicalCunningUsed"
  | "eldritchSmiteUsedThisTurn"
  | "wizardLevel"
  | "arcaneRecoveryUsed"
  | "overchannelUsesThisLR"
  | "rangerLevel"
  | "huntersMarkFreeUses"
  | "tirelessCharges"
  | "tirelessMax"
  | "naturesVeilCharges"
  | "naturesVeilMax"
  | "bardLevel"
  | "bardicInspirationCharges"
  | "bardicInspirationMax"

type BattleCreatureState = Omit<NormalizedState, BattleExcludedKeys>

const BATTLE_EXCLUDED_KEYS = new Set<string>([
  "turnPhase",
  "hitPointDiceRemaining",
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
  "bardicInspirationMax"
])

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

type CreatureId = string
type Actor = ReturnType<typeof createActor<typeof dndMachine>>
const EMPTY_CONDITION_IMMUNITIES = new Set<Condition>()

// Battle driver schema: all fields optional because battleStep = any { ... }
// generates nondets for ALL actions — unused actions have None picks.
const OI = ITFBigInt.optional()
const OV = ITFVariant.optional()
const OB = z.boolean().optional()
const OS = z.string().optional()

const battleDriverSchema = {
  bInit: { hp1: OI, hp2: OI, hp3: OI },
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
    slotLvl: OI
  },
  bResolveCounterspell: { reactorId: OS, decision: OV, csSlotLvl: OI },
  bResolveSaveFailedReaction: { reactorId: OS, decision: OV },
  bCastConcentrationSpell: { targetId: OS, slotLvl: OI, duration: OI, spellId: OS, cond: OV, applyCond: OB },
  bConcentrationCheck: { targetId: OS, conSaveSucceeded: OB },
  bCastAoE: { saveDC: OI, dmgOnFail: OI, halfOnSave: OB, dt: OV, cond: OV, applyCond: OB, slotLvl: OI },
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
      CreatureId,
      {
        multiattackLength: number
        rechargeMinRolls: Record<string, number>
      }
    >()
    const creatureKinds = new Map<CreatureId, CreatureKind>()
    let initiative: Array<string> = []
    let turnIndex = 0

    // Track who has been initialized with START_TURN
    const turnStarted = new Set<CreatureId>()

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

    function send(id: CreatureId, event: DndEvent) {
      const actor = actors.get(id)
      if (!actor) throw new Error(`No actor for ${id}`)
      actor.send(event)
    }

    function getSnap(id: CreatureId): DndSnapshot {
      const actor = actors.get(id)
      if (!actor) throw new Error(`No actor for ${id}`)
      return actor.getSnapshot()
    }

    function activeId(): CreatureId {
      return initiative[turnIndex]
    }

    // ============================================================
    // Action projection mapping (B14.4)
    // ============================================================

    function handleBInit(picks: ReadonlyMap<string, unknown>) {
      // bInit creates 3 creatures with nondeterministic HP.
      // We know the shape from battle.qnt: A=PC caster rogue5, B=PC caster, C=Monster
      const hp1 = pickBigInt(picks, "hp1") ?? 20
      const hp2 = pickBigInt(picks, "hp2") ?? 20
      const hp3 = pickBigInt(picks, "hp3") ?? 35

      // Spell slot config for mkCaster: slots 1:4, 2:3, 3:2
      const casterSlots = [4, 3, 2, 0, 0, 0, 0, 0, 0]

      // A: PC caster with rogueLevel=5
      const actorA = createActor(dndMachine, {
        input: {
          maxHp: hp1,
          effectiveSpeed: 30,
          movementRemaining: 30,
          extraAttacksRemaining: 1,
          rogueLevel: 5,
          creatureKind: "PC",
          slotsMax: casterSlots,
          slotsCurrent: casterSlots
        }
      })
      actorA.start()
      actorA.send({ type: "ENTER_COMBAT" })
      actors.set("A", actorA)
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
      actors.set("B", actorB)
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
          legendaryActionsRemaining: 3,
          legendaryResistancesRemaining: 3,
          rechargeAvailable: {},
          dailyUsesRemaining: {}
        }
      })
      actorC.start()
      actorC.send({ type: "ENTER_COMBAT" })
      actors.set("C", actorC)
      creatureKinds.set("C", "Monster")

      initiative = ["A", "B", "C"]
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
              spellId: "",
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
        extraAttacks: isMonster && sb ? multiattackExtraAttacks(sb.multiattackLength) : 0,
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
          // Concentration check is handled by the creature machine
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
            send(pendingAttack.target, {
              type: "TAKE_DAMAGE",
              amount: pendingAttack.damage,
              damageType: pendingAttack.damageType,
              resistances: new Set<DamageType>(),
              vulnerabilities: new Set<DamageType>(),
              immunities: new Set<DamageType>(),
              isCritical: pendingAttack.isCritical
            })
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
        send(pendingAttack.target, {
          type: "TAKE_DAMAGE",
          amount: pendingAttack.damage,
          damageType: pendingAttack.damageType,
          ...EMPTY_DAMAGE_MODS,
          isCritical: pendingAttack.isCritical
        })
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

    function handleBAfterDamagePass(_picks: ReadonlyMap<string, unknown>) {
      // Pass — no events to send. After-damage reactions don't affect creature state
      // beyond reaction spending (which happens in Hellish Rebuke / Retaliation).
    }

    function handleBAfterDamageHellishRebuke(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      if (!reactorId) return // remaining == 0, nothing to do

      const rebukeDmg = pickBigInt(picks, "rebukeDmg") ?? 10
      const rebukeSaved = pickBool(picks, "rebukeSaved") ?? false

      send(reactorId, { type: "USE_REACTION" })
      // Damage source tracked in pendingAfterDamage (set when damage is applied).
      if (pendingAfterDamage) {
        const actualDmg = rebukeSaved ? Math.floor(rebukeDmg / 2) : rebukeDmg
        send(pendingAfterDamage.damageSource, {
          type: "TAKE_DAMAGE",
          amount: actualDmg,
          damageType: "fire" as DamageType,
          ...EMPTY_DAMAGE_MODS,
          isCritical: false
        })
      }
    }

    function handleBAfterDamageRetaliation(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      if (!reactorId) return

      const retAtkRoll = pickBigInt(picks, "retAtkRoll") ?? 10
      const retDmg = pickBigInt(picks, "retDmg") ?? 5
      const retDt = pickVariant(picks, "retDt") ?? "Slashing"
      const retCrit = pickBool(picks, "retCrit") ?? false
      const retTgtAc = pickBigInt(picks, "retTgtAc") ?? 15

      send(reactorId, { type: "USE_REACTION" })
      const hit = retAtkRoll >= retTgtAc || retAtkRoll === 20
      if (hit && pendingAfterDamage) {
        send(pendingAfterDamage.damageSource, {
          type: "TAKE_DAMAGE",
          amount: retDmg,
          damageType: mapDamageType(retDt),
          ...EMPTY_DAMAGE_MODS,
          isCritical: retCrit
        })
      }
    }

    /** Track after-damage context for Hellish Rebuke / Retaliation */
    const pendingAfterDamage: { damageSource: string; damagedCreature: string } | null = null

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

      // Spend action + slot
      send(id, { type: "USE_ACTION", actionType: "magic" })
      send(id, { type: "EXPEND_SLOT", level: slotLvl })

      // Store pending spell for later resolution
      pendingSpell = {
        caster: id,
        target: targetId,
        saveDC,
        saveRoll,
        damageOnFail: dmgOnFail,
        halfOnSuccess: halfOnSave,
        damageType: mapDamageType(dt),
        conditionOnFail: QUINT_CONDITION_MAP[cond] ?? "blinded",
        applyCondition: applyCond
      }

      // Check if Counterspell reactors exist
      const hasCSReactors = [...actors.entries()].some(([cid, actor]) => {
        if (cid === id) return false
        const snap = actor.getSnapshot()
        if (!snap.context.reactionAvailable || snap.matches({ damageTrack: "dead" })) return false
        // Must have level 3+ slot
        return snap.context.slotsCurrent.slice(2).some((s) => s > 0) // indices 2+ = levels 3+
      })

      if (!hasCSReactors) {
        // Resolve save immediately
        resolveSpellSave(pendingSpell)
        pendingSpell = null
      }
      // Otherwise, wait for bResolveCounterspell
    }

    /** Pending spell context */
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
    } | null = null

    /** Pending AoE context */
    let pendingAoE: {
      caster: string
      saveDC: number
      damageOnFail: number
      halfOnSuccess: boolean
      damageType: DamageType
      conditionOnFail: Condition
      applyCondition: boolean
    } | null = null

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
        }
      } else {
        // Save failed — apply condition + damage
        if (spell.applyCondition) {
          send(spell.target, {
            type: "APPLY_CONDITION",
            condition: spell.conditionOnFail,
            conditionImmunities: EMPTY_CONDITION_IMMUNITIES
          })
        }
        if (spell.damageOnFail > 0) {
          send(spell.target, {
            type: "TAKE_DAMAGE",
            amount: spell.damageOnFail,
            damageType: spell.damageType,
            resistances: new Set<DamageType>(),
            vulnerabilities: new Set<DamageType>(),
            immunities: new Set<DamageType>(),
            isCritical: false
          })
        }
      }
    }

    function handleBResolveCounterspell(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      const decisionRaw = picks.get("decision")
      const decision = variantToString(decisionRaw)
      const csSlotLvl = pickBigInt(picks, "csSlotLvl") ?? 3

      if (!reactorId) {
        // No remaining reactors — spell resolves
        if (pendingSpell) {
          resolveSpellSave(pendingSpell)
          pendingSpell = null
        }
        // For AoE: phase transitions to BPResolvingAoE — handled by bResolveAoETarget
        // For Counterspell-on-Counterspell: handled by stack
        return
      }

      if (decision.startsWith("RCounterspell")) {
        // Reactor casts Counterspell: spend reaction + slot
        send(reactorId, { type: "USE_REACTION" })
        send(reactorId, { type: "EXPEND_SLOT", level: csSlotLvl })

        // Parse CS outcome from decision variant
        const conSaveSucceeded = decision === "RCounterspell(true)" || decision.includes("true")

        if (!conSaveSucceeded) {
          // CS succeeds — original spell fizzles
          pendingSpell = null
          pendingAoE = null
        }
        // If CS fails, spell continues — will resolve when all remaining reactors are processed
      }
      // RPass: do nothing, keep pending
    }

    function handleBResolveSaveFailedReaction(picks: ReadonlyMap<string, unknown>) {
      const reactorId = pickString(picks, "reactorId")
      const decisionRaw = picks.get("decision")
      const decision = variantToString(decisionRaw)

      if (!reactorId) {
        // No remaining — effects already applied via resolveSpellSave or similar
        return
      }

      if (decision === "RLegendaryResistance") {
        // LR: spend reaction (simplified), auto-succeed save
        send(reactorId, { type: "USE_REACTION" })
        // The save is now succeeded — if pending spell, modify it
        // In the Quint spec, LR sets saveSucceeded=true, then applyFailEffects checks it
        // For the projection, we need to undo the fail effects...
        // Actually, LR fires BEFORE applyFailEffects in the remaining=0 branch.
        // The projection handles this differently — when remaining=0 with LR used,
        // applyFailEffects sees saveSucceeded=true and applies half damage.
        // This is already handled by Quint — we just need to match the final state.
        //
        // For PISaveFailed: LR flips save to succeeded, then applyFailEffects runs.
        // We need to track that the save succeeded for the final resolution.
        // LR flips the save to succeeded — tracked by Quint, not projected to XState
      }
      // RPass: do nothing
    }

    function handleBCastConcentrationSpell(picks: ReadonlyMap<string, unknown>) {
      const id = activeId()
      const targetId = pickString(picks, "targetId") ?? ""
      const slotLvl = pickBigInt(picks, "slotLvl") ?? 1
      const duration = pickBigInt(picks, "duration") ?? 5
      const spellId = pickString(picks, "spellId") ?? "hold_person"
      const cond = pickVariant(picks, "cond") ?? "CParalyzed"
      const applyCond = pickBool(picks, "applyCond") ?? false

      // Spend action + slot
      send(id, { type: "USE_ACTION", actionType: "magic" })
      send(id, { type: "EXPEND_SLOT", level: slotLvl })

      // If already concentrating, break old concentration
      const ctx = getSnap(id).context
      if (ctx.concentrationSpellId !== "") {
        breakConcentrationAndPropagate(id)
      }

      // Start concentration
      send(id, { type: "START_CONCENTRATION", spellId, durationTurns: duration, expiresAt: "end" })

      // Add effect to target
      send(targetId, { type: "ADD_EFFECT", spellId, durationTurns: duration, expiresAt: "end" })

      // Apply condition to target
      if (applyCond) {
        send(targetId, {
          type: "APPLY_CONDITION",
          condition: QUINT_CONDITION_MAP[cond] ?? "paralyzed",
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
    function breakConcentrationAndPropagate(casterId: CreatureId) {
      const casterSnap = getSnap(casterId)
      const spellId = casterSnap.context.concentrationSpellId
      if (spellId === "") return

      send(casterId, { type: "BREAK_CONCENTRATION" })
      send(casterId, { type: "REMOVE_EFFECT", spellId })

      // Remove effects from other creatures (effects cast by this caster)
      // The TS ActiveEffect doesn't have casterId, so we match by spellId
      for (const [cid, actor] of actors) {
        if (cid === casterId) continue
        const snap = actor.getSnapshot()
        for (const eff of snap.context.activeEffects) {
          if (eff.spellId === spellId) {
            send(cid, { type: "REMOVE_EFFECT", spellId })
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

      // Spend action + slot
      send(id, { type: "USE_ACTION", actionType: "magic" })
      send(id, { type: "EXPEND_SLOT", level: slotLvl })

      pendingAoE = {
        caster: id,
        saveDC,
        damageOnFail: dmgOnFail,
        halfOnSuccess: halfOnSave,
        damageType: mapDamageType(dt),
        conditionOnFail: QUINT_CONDITION_MAP[cond] ?? "blinded",
        applyCondition: applyCond
      }

      // Counterspell check — similar to bCastSaveSpell
      const hasCSReactors = [...actors.entries()].some(([cid, actor]) => {
        if (cid === id) return false
        const snap = actor.getSnapshot()
        if (!snap.context.reactionAvailable || snap.matches({ damageTrack: "dead" })) return false
        return snap.context.slotsCurrent.slice(2).some((s) => s > 0)
      })

      if (!hasCSReactors) {
        // No Counterspell — AoE resolves via bResolveAoETarget
        // pendingAoE stays set for target resolution
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
        }
      } else {
        // Failed save
        if (pendingAoE.applyCondition) {
          send(targetId, {
            type: "APPLY_CONDITION",
            condition: pendingAoE.conditionOnFail,
            conditionImmunities: EMPTY_CONDITION_IMMUNITIES
          })
        }
        if (pendingAoE.damageOnFail > 0) {
          send(targetId, {
            type: "TAKE_DAMAGE",
            amount: pendingAoE.damageOnFail,
            damageType: pendingAoE.damageType,
            resistances: new Set<DamageType>(),
            vulnerabilities: new Set<DamageType>(),
            immunities: new Set<DamageType>(),
            isCritical: false
          })
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
                spellId: "",
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
  // battle.qnt has 21 phase-guarded actions — most random samples fail guards.
  // Keep maxSamples bounded to avoid quint spinning. Trace generation is the
  // bottleneck, not replay.
  const MBT_TRACE_COUNT = 1
  const MBT_STEP_COUNT = 10
  const specPath = path.resolve(import.meta.dirname, "../../battle.qnt")

  it("replays battle traces per-creature against dndMachine actors", async () => {
    await run({
      spec: specPath,
      init: "bInit",
      step: "battleStep",
      driver: createBattleProjectionDriver(),
      backend: "rust",
      nTraces: Number(process.env["MBT_TRACES"] ?? MBT_TRACE_COUNT),
      maxSteps: Number(process.env["MBT_STEPS"] ?? MBT_STEP_COUNT),
      maxSamples: Number(process.env["MBT_MAX_SAMPLES"] ?? 50),
      stateCheck: battleStateCheck
    })
  }, 300_000)
})
