import type { SnapshotFrom } from "xstate"
import { assign, setup } from "xstate"

import { resolveGrapple, resolveShove } from "#/machine-combat.ts"
import {
  addDeathFailures,
  ALL_DAMAGE_TYPES,
  applyConditionUpdate,
  calculateEffectiveSpeed,
  computeAddExhaustion,
  computeFallResult,
  computeLongRest,
  computeShortRest,
  computeTakeDamage,
  dehydrationLevels,
  effectiveMaxHp,
  expendSlot,
  removeConditionUpdate,
  resolveDeathSave,
  spendHalfSpeed
} from "#/machine-helpers.ts"
import {
  conditionTrackConfig,
  damageTrackConfig,
  rootEventHandlers,
  spellcastingConfig,
  turnPhaseConfig
} from "#/machine-states.ts"
import type { DndContext, DndEvent, DndMachineInput } from "#/machine-types.ts"
import {
  asApplyDehydration,
  asApplyFall,
  asConcentrationCheck,
  asCondition,
  asDeathSave,
  asEscapeGrapple,
  asExhaustion,
  asExpendSlot,
  asGrantTempHp,
  asGrapple,
  asHeal,
  asLongRest,
  asShortRest,
  asShove,
  asSpendHitDie,
  asStartConcentration,
  asStartTurn,
  asTakeDamage,
  asUseAction,
  asUseMovement,
  INITIAL_CONDITIONS,
  INITIAL_TURN_STATE
} from "#/machine-types.ts"
import type { ExhaustionLevel, IncapSource } from "#/types.ts"
import { DEATH_SAVES_RESET, deathSaveCount, EMPTY_SLOTS, exhaustionLevel, hp, movementFeet, tempHp } from "#/types.ts"

export type { DndContext, DndEvent, DndMachineInput } from "#/machine-types.ts"
const EXHAUSTION_DEATH = 6
const fallR = (c: DndContext, e: DndEvent) =>
  computeFallResult(
    asApplyFall(e).damageRoll,
    c.hp,
    c.maxHp,
    c.tempHp,
    c.exhaustion,
    asApplyFall(e).immunities,
    c.petrified ? ALL_DAMAGE_TYPES : asApplyFall(e).resistances,
    asApplyFall(e).vulnerabilities
  )
const dmgR = (c: DndContext, e: DndEvent) => {
  const ev = asTakeDamage(e)
  return computeTakeDamage(
    c.hp,
    c.maxHp,
    c.tempHp,
    c.exhaustion,
    ev.amount,
    ev.damageType,
    ev.immunities,
    c.petrified ? ALL_DAMAGE_TYPES : ev.resistances,
    ev.vulnerabilities
  )
}
const dsR = (c: DndContext, e: DndEvent) =>
  resolveDeathSave(asDeathSave(e).d20Roll, c.deathSaves.successes, c.deathSaves.failures)
const addIS = (s: ReadonlySet<IncapSource>, v: IncapSource): ReadonlySet<IncapSource> => new Set([...s, v])
const rmIS = (s: ReadonlySet<IncapSource>, v: IncapSource): ReadonlySet<IncapSource> =>
  new Set([...s].filter((x) => x !== v))
const concBreak = (c: DndContext) =>
  c.incapacitatedSources.size === 0 && c.concentrationSpellId !== "" ? { concentrationSpellId: "" } : {}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const MT = { context: {} as DndContext, events: {} as DndEvent, input: {} as DndMachineInput }
/* eslint-enable @typescript-eslint/consistent-type-assertions */

export const dndMachine = setup({
  types: MT,
  guards: {
    instantDeathFromConscious: ({ context: c, event: e }) => {
      const r = dmgR(c, e)
      return r.dmgThrough > 0 && r.newHp === 0 && r.overflow >= r.effMax
    },
    dropsToZeroHp: ({ context: c, event: e }) => {
      const r = dmgR(c, e)
      return r.dmgThrough > 0 && r.newHp === 0 && r.overflow < r.effMax
    },
    noDamageThrough: ({ context: c, event: e }) => dmgR(c, e).dmgThrough === 0,
    instantDeathFromDying: ({ context: c, event: e }) => {
      const r = dmgR(c, e)
      return r.dmgThrough > 0 && r.dmgThrough >= r.effMax
    },
    deathFromDamageFailures: ({ context: c, event: e }) => {
      const r = dmgR(c, e)
      if (r.dmgThrough === 0) return false
      return addDeathFailures(c.deathSaves.failures, asTakeDamage(e).isCritical).isDead
    },
    deathSaveRegainsConsciousness: ({ context: c, event: e }) => dsR(c, e).regainsConsciousness,
    deathSaveStabilizes: ({ context: c, event: e }) => dsR(c, e).isStabilized,
    deathSaveDies: ({ context: c, event: e }) => dsR(c, e).isDead,
    fallInstantDeath: ({ context: c, event: e }) =>
      ((r) => r.dmgThrough > 0 && r.newHp === 0 && r.overflow >= r.effMax)(fallR(c, e)),
    fallDropsToZero: ({ context: c, event: e }) =>
      ((r) => r.dmgThrough > 0 && r.newHp === 0 && r.overflow < r.effMax)(fallR(c, e)),
    fallInstantDeathFromDying: ({ context: c, event: e }) =>
      ((r) => r.dmgThrough > 0 && r.dmgThrough >= r.effMax)(fallR(c, e)),
    fallNoDamage: ({ context: c, event: e }) => fallR(c, e).effAmount === 0,
    canSuffocate: ({ context: c }) => c.hp > 0,
    shortRestHeals: ({ context: c, event: e }) => {
      const ev = asShortRest(e)
      const r = computeShortRest(c.hp, c.maxHp, c.exhaustion, c.hitDiceRemaining, c.pactSlotsMax, ev.conMod, ev.hdRolls)
      return c.hp === 0 && r.newHp > 0
    },
    longRestHeals: ({ context: c }) => c.hp >= 1,
    hitDieHeals: ({ context: c, event: e }) => {
      if (c.hitDiceRemaining <= 0) return false
      const ev = asSpendHitDie(e)
      return c.hp === 0 && Math.max(0, ev.dieRoll + ev.conMod) > 0
    },
    exhaustionDeath: ({ context: c }) => c.exhaustion >= EXHAUSTION_DEATH,
    isSurprised: ({ event: e }) => asStartTurn(e).isSurprised,
    canStandFromProne: ({ context: c }) =>
      c.incapacitatedSources.size === 0 &&
      c.effectiveSpeed > 0 &&
      spendHalfSpeed(c.movementRemaining, c.effectiveSpeed).success,
    shouldBreakConcentration: ({ context: c }) => c.concentrationSpellId === ""
  },
  actions: {
    applyDamage: assign(({ context: c, event: e }) => {
      const r = dmgR(c, e)
      const breakConc = c.concentrationSpellId !== "" && (r.newHp !== c.hp || r.newTempHp !== c.tempHp)
      return { hp: hp(r.newHp), tempHp: tempHp(r.newTempHp), ...(breakConc ? { concentrationSpellId: "" } : {}) }
    }),
    absorbTempHpOnly: assign(({ context: c, event: e }) => {
      const newTmp = dmgR(c, e).newTempHp
      const breakConc = c.concentrationSpellId !== "" && newTmp !== c.tempHp
      return { tempHp: tempHp(newTmp), ...(breakConc ? { concentrationSpellId: "" } : {}) }
    }),
    applyDamageAtZeroHp: assign(({ context: c, event: e }) => {
      const r = dmgR(c, e)
      const { newFailures } = addDeathFailures(c.deathSaves.failures, asTakeDamage(e).isCritical)
      return {
        deathSaves: { successes: c.deathSaves.successes, failures: deathSaveCount(newFailures) },
        tempHp: tempHp(r.newTempHp),
        stable: false,
        ...(c.concentrationSpellId !== "" ? { concentrationSpellId: "" } : {})
      }
    }),
    applyDeathSave: assign(({ context: c, event: e }) => {
      const r = dsR(c, e)
      if (r.regainsConsciousness) return { deathSaves: DEATH_SAVES_RESET, hp: hp(1) }
      if (r.isStabilized) return { deathSaves: DEATH_SAVES_RESET, stable: true }
      return { deathSaves: { successes: deathSaveCount(r.newSuccesses), failures: deathSaveCount(r.newFailures) } }
    }),
    applyHeal: assign(({ context: c, event: e }) => ({
      hp: hp(Math.min(c.hp + asHeal(e).amount, effectiveMaxHp(c.exhaustion, c.maxHp)))
    })),
    applyHealFromZero: assign(({ context: c, event: e }) => ({
      deathSaves: DEATH_SAVES_RESET,
      hp: hp(Math.min(asHeal(e).amount, effectiveMaxHp(c.exhaustion, c.maxHp)))
    })),
    applyTempHp: assign(({ event: e }) => (asGrantTempHp(e).keepOld ? {} : { tempHp: asGrantTempHp(e).amount })),
    applyKnockOut: assign(({ context: c }) => ({
      deathSaves: DEATH_SAVES_RESET,
      hp: hp(0),
      stable: true,
      ...concBreak(c)
    })),
    applyStabilize: assign({ deathSaves: DEATH_SAVES_RESET, stable: true }),
    setUnconscious: assign(({ context: c }) => ({
      unconscious: true,
      prone: true,
      incapacitatedSources: addIS(c.incapacitatedSources, "unconscious")
    })),
    clearUnconscious: assign(({ context: c }) => ({
      unconscious: false,
      incapacitatedSources: rmIS(c.incapacitatedSources, "unconscious"),
      stable: false,
      deathSaves: DEATH_SAVES_RESET
    })),
    applyCondition: assign(({ context: c, event: e }) => {
      const u = applyConditionUpdate(asCondition(e).condition, c.incapacitatedSources, c.petrified)
      const becameIncap = c.incapacitatedSources.size === 0 && u.incapSources.size > 0
      return {
        ...u.conditionFlags,
        incapacitatedSources: u.incapSources,
        ...(becameIncap && c.concentrationSpellId !== "" ? { concentrationSpellId: "" } : {})
      }
    }),
    removeCondition: assign(({ context: c, event: e }) => {
      const cond = asCondition(e).condition
      if (cond === "prone" && c.unconscious) return {}
      const u = removeConditionUpdate(cond, c.incapacitatedSources)
      return { ...u.conditionFlags, incapacitatedSources: u.incapSources }
    }),
    addExhaustion: assign(({ context: c, event: e }) => {
      const r = computeAddExhaustion(c.exhaustion, asExhaustion(e).levels, c.hp, c.maxHp)
      const diedFromExhaust = r.newExhaustion >= EXHAUSTION_DEATH && c.exhaustion < EXHAUSTION_DEATH
      return {
        exhaustion: exhaustionLevel(r.newExhaustion),
        hp: hp(r.newHp),
        ...(diedFromExhaust && c.concentrationSpellId !== "" ? { concentrationSpellId: "" } : {})
      }
    }),
    reduceExhaustion: assign(({ context: c, event: e }) => ({
      exhaustion: exhaustionLevel(Math.max(0, c.exhaustion - asExhaustion(e).levels))
    })),
    initTurn: assign(({ context: c, event: e }) => {
      const ev = asStartTurn(e)
      const speed = calculateEffectiveSpeed({
        armorPenalty: ev.armorPenalty,
        baseSpeed: ev.baseSpeed,
        callerSpeedModifier: ev.callerSpeedModifier,
        exhaustion: c.exhaustion,
        grappled: c.grappled,
        grappledTargetTwoSizesSmaller: ev.grappledTargetTwoSizesSmaller,
        isGrappling: ev.isGrappling,
        restrained: c.restrained
      })
      return {
        ...INITIAL_TURN_STATE,
        actionUsed: ev.isSurprised,
        bonusActionUsed: ev.isSurprised,
        effectiveSpeed: movementFeet(speed),
        extraAttacksRemaining: ev.extraAttacks,
        movementRemaining: movementFeet(ev.isSurprised ? 0 : speed),
        reactionAvailable: !ev.isSurprised,
        surprised: ev.isSurprised
      }
    }),
    useAction: assign(({ context: c, event: e }) => {
      const ev = asUseAction(e)
      if (c.actionUsed || c.incapacitatedSources.size > 0) return {}
      if (ev.actionType === "attack") return { actionUsed: true, attackActionUsed: true }
      if (ev.actionType === "disengage") return { actionUsed: true, disengaged: true }
      if (ev.actionType === "dodge") return { actionUsed: true, dodging: true }
      if (ev.actionType === "dash")
        return { actionUsed: true, movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed) }
      if (ev.actionType === "ready") return { actionUsed: true, readiedAction: true }
      return { actionUsed: true }
    }),
    useBonusAction: assign(({ context: c }) =>
      c.bonusActionUsed || c.incapacitatedSources.size > 0 ? {} : { bonusActionUsed: true }
    ),
    useReaction: assign(({ context: c }) => (c.reactionAvailable ? { reactionAvailable: false } : {})),
    useMovement: assign(({ context: c, event: e }) => {
      const ev = asUseMovement(e)
      const cost = ev.feet * ev.movementCost
      if (cost > c.movementRemaining || cost < 0) return {}
      return { movementRemaining: movementFeet(c.movementRemaining - cost) }
    }),
    useExtraAttack: assign(({ context: c }) =>
      c.extraAttacksRemaining <= 0 ? {} : { extraAttacksRemaining: c.extraAttacksRemaining - 1 }
    ),
    standFromProne: assign(({ context: c }) => {
      const r = spendHalfSpeed(c.movementRemaining, c.effectiveSpeed)
      if (!r.success) return {}
      return { movementRemaining: movementFeet(r.newMovementRemaining), ...(c.prone ? { prone: false } : {}) }
    }),
    dropProne: assign({ prone: true }),
    endSurprise: assign({ reactionAvailable: true, surprised: false }),
    markBonusActionSpell: assign({ bonusActionSpellCast: true }),
    markNonCantripActionSpell: assign({ nonCantripActionSpellCast: true }),
    applyGrapple: assign(({ context: c, event: e }) => {
      const ev = asGrapple(e)
      const ok = resolveGrapple(
        ev.attackerSize,
        ev.targetSize,
        ev.contestResult,
        ev.attackerHasFreeHand,
        c.incapacitatedSources.size > 0
      )
      return ok ? { grappled: true } : {}
    }),
    releaseGrapple: assign({ grappled: false }),
    escapeGrapple: assign(({ event: e }) => (asEscapeGrapple(e).contestResult === "bWins" ? { grappled: false } : {})),
    applyShove: assign(({ context: c, event: e }) => {
      const ev = asShove(e)
      if (!resolveShove(ev.attackerSize, ev.targetSize, ev.contestResult, c.incapacitatedSources.size > 0)) return {}
      if (ev.choice === "prone") return { prone: true }
      return {}
    }),
    expendSlot: assign(({ context: c, event: e }) => ({
      slotsCurrent: expendSlot(c.slotsCurrent, asExpendSlot(e).level)
    })),
    expendPactSlot: assign(({ context: c }) =>
      c.pactSlotsCurrent <= 0 ? {} : { pactSlotsCurrent: c.pactSlotsCurrent - 1 }
    ),
    startConcentration: assign(({ event: e }) => ({ concentrationSpellId: asStartConcentration(e).spellId })),
    breakConcentration: assign({ concentrationSpellId: "" }),
    concentrationCheck: assign(({ context: c, event: e }) =>
      c.concentrationSpellId === "" || asConcentrationCheck(e).conSaveSucceeded ? {} : { concentrationSpellId: "" }
    ),
    spendHitDie: assign(({ context: c, event: e }) => {
      if (c.hitDiceRemaining <= 0) return {}
      const ev = asSpendHitDie(e)
      return {
        hitDiceRemaining: c.hitDiceRemaining - 1,
        hp: hp(Math.min(c.hp + Math.max(0, ev.dieRoll + ev.conMod), effectiveMaxHp(c.exhaustion, c.maxHp)))
      }
    }),
    shortRest: assign(({ context: c, event: e }) => {
      const ev = asShortRest(e)
      const r = computeShortRest(c.hp, c.maxHp, c.exhaustion, c.hitDiceRemaining, c.pactSlotsMax, ev.conMod, ev.hdRolls)
      return { hitDiceRemaining: r.newHitDice, hp: hp(r.newHp), pactSlotsCurrent: r.newPactSlots }
    }),
    longRest: assign(({ context: c, event: e }) => {
      const ev = asLongRest(e)
      const r = computeLongRest(
        c.hp,
        c.maxHp,
        c.exhaustion,
        c.hitDiceRemaining,
        c.slotsCurrent,
        c.pactSlotsMax,
        ev.totalHitDice,
        ev.hasEaten
      )
      if (!r) return {}
      return {
        exhaustion: exhaustionLevel(r.newExhaustion),
        hitDiceRemaining: r.newHitDice,
        hp: hp(r.newHp),
        pactSlotsCurrent: r.newPactSlots,
        slotsCurrent: r.newSlots,
        tempHp: tempHp(0)
      }
    }),
    applyFall: assign(({ context: c, event: e }) => {
      const r = fallR(c, e)
      return {
        hp: hp(r.newHp),
        tempHp: tempHp(r.newTempHp),
        ...(r.newHp !== c.hp || r.newTempHp !== c.tempHp ? { prone: true } : {})
      }
    }),
    applyFallAtZeroHp: assign(({ context: c, event: e }) => {
      const r = fallR(c, e)
      if (r.dmgThrough === 0) return { tempHp: tempHp(r.newTempHp) }
      const df = addDeathFailures(c.deathSaves.failures, false)
      return {
        tempHp: tempHp(r.newTempHp),
        deathSaves: { successes: c.deathSaves.successes, failures: deathSaveCount(df.newFailures) },
        prone: true,
        stable: false
      }
    }),
    suffocate: assign(({ context: c }) => ({
      hp: hp(0),
      unconscious: true,
      prone: true,
      incapacitatedSources: addIS(c.incapacitatedSources, "unconscious"),
      ...concBreak(c)
    })),
    applyStarvation: assign(({ context: c }) => {
      const r = computeAddExhaustion(c.exhaustion, 1, c.hp, c.maxHp)
      return { exhaustion: exhaustionLevel(r.newExhaustion), hp: hp(r.newHp) }
    }),
    applyDehydration: assign(({ context: c, event: e }) => {
      const ev = asApplyDehydration(e)
      const levels = dehydrationLevels(c.exhaustion, ev.halfWater, ev.conSaveSucceeded)
      if (levels === 0) return {}
      const r = computeAddExhaustion(c.exhaustion, levels, c.hp, c.maxHp)
      return { exhaustion: exhaustionLevel(r.newExhaustion), hp: hp(r.newHp) }
    })
  }
}).createMachine({
  id: "dnd",
  type: "parallel",
  context: ({ input: i }) => ({
    ...INITIAL_CONDITIONS,
    ...INITIAL_TURN_STATE,
    concentrationSpellId: "",
    deathSaves: DEATH_SAVES_RESET,
    stable: false,
    effectiveSpeed: movementFeet(i.effectiveSpeed ?? 0),
    exhaustion: 0 as ExhaustionLevel,
    extraAttacksRemaining: i.extraAttacksRemaining ?? 0,
    hitDiceRemaining: i.hitDiceRemaining ?? 0,
    hp: hp(i.maxHp),
    incapacitatedSources: new Set<IncapSource>(),
    maxHp: hp(i.maxHp),
    movementRemaining: movementFeet(i.movementRemaining ?? 0),
    pactSlotLevel: 0,
    pactSlotsCurrent: 0,
    pactSlotsMax: 0,
    slotsCurrent: EMPTY_SLOTS,
    slotsMax: EMPTY_SLOTS,
    tempHp: tempHp(0)
  }),
  on: rootEventHandlers,
  states: {
    damageTrack: damageTrackConfig,
    conditionTrack: conditionTrackConfig,
    turnPhase: turnPhaseConfig,
    spellcasting: spellcastingConfig
  }
})
export type DndSnapshot = SnapshotFrom<typeof dndMachine>
