import type { SnapshotFrom } from "xstate"
import { assign, setup } from "xstate"

import { resolveGrapple, resolveShove } from "#/machine-combat.ts"
import {
  addDeathFailures,
  applyConditionUpdate,
  calculateEffectiveSpeed,
  computeAddExhaustion,
  computeFallDamage,
  computeLongRest,
  computeShortRest,
  computeTakeDamage,
  dehydrationLevels,
  expendSlot,
  removeConditionUpdate,
  resolveDeathSave,
  spendHalfSpeed
} from "#/machine-helpers.ts"
import { damageTrackConfig, turnPhaseConfig } from "#/machine-states.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
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

export type { DndContext, DndEvent } from "#/machine-types.ts"

const EXHAUSTION_DEATH = 6
function dmgR(c: DndContext, e: DndEvent) {
  const ev = asTakeDamage(e)
  return computeTakeDamage(
    c.hp,
    c.maxHp,
    c.tempHp,
    c.exhaustion,
    ev.amount,
    ev.damageType,
    ev.immunities,
    ev.resistances,
    ev.vulnerabilities
  )
}
function dsR(c: DndContext, e: DndEvent) {
  return resolveDeathSave(asDeathSave(e).d20Roll, c.deathSaves.successes, c.deathSaves.failures)
}
function addIS(s: ReadonlySet<IncapSource>, v: IncapSource): ReadonlySet<IncapSource> {
  return new Set([...s, v])
}
function rmIS(s: ReadonlySet<IncapSource>, v: IncapSource): ReadonlySet<IncapSource> {
  return new Set([...s].filter((x) => x !== v))
}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const MT = { context: {} as DndContext, events: {} as DndEvent, input: {} as { readonly maxHp: number } }
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
    exhaustionDeath: ({ context: c }) => c.exhaustion >= EXHAUSTION_DEATH,
    isSurprised: ({ event: e }) => asStartTurn(e).isSurprised,
    canStandFromProne: ({ context: c }) =>
      c.prone && c.effectiveSpeed > 0 && spendHalfSpeed(c.movementRemaining, c.effectiveSpeed).success,
    shouldBreakConcentration: ({ context: c }) => c.concentrationSpellId === "" || c.incapacitatedSources.size > 0
  },
  actions: {
    applyDamage: assign(({ context: c, event: e }) => {
      const r = dmgR(c, e)
      return { hp: hp(r.newHp), tempHp: tempHp(r.newTempHp) }
    }),
    absorbTempHpOnly: assign(({ context: c, event: e }) => ({ tempHp: tempHp(dmgR(c, e).newTempHp) })),
    applyDamageAtZeroHp: assign(({ context: c, event: e }) => {
      const r = dmgR(c, e)
      const { newFailures } = addDeathFailures(c.deathSaves.failures, asTakeDamage(e).isCritical)
      return {
        deathSaves: { successes: c.deathSaves.successes, failures: deathSaveCount(newFailures) },
        tempHp: tempHp(r.newTempHp)
      }
    }),
    applyDeathSave: assign(({ context: c, event: e }) => {
      const r = dsR(c, e)
      if (r.regainsConsciousness) return { deathSaves: DEATH_SAVES_RESET, hp: hp(1) }
      if (r.isStabilized) return { deathSaves: DEATH_SAVES_RESET }
      return { deathSaves: { successes: deathSaveCount(r.newSuccesses), failures: deathSaveCount(r.newFailures) } }
    }),
    applyHeal: assign(({ context: c, event: e }) => ({ hp: hp(Math.min(c.hp + asHeal(e).amount, c.maxHp)) })),
    applyHealFromZero: assign(({ context: c, event: e }) => ({
      deathSaves: DEATH_SAVES_RESET,
      hp: hp(Math.min(asHeal(e).amount, c.maxHp))
    })),
    applyTempHp: assign(({ event: e }) => {
      const ev = asGrantTempHp(e)
      return ev.keepOld ? {} : { tempHp: ev.amount }
    }),
    applyKnockOut: assign({ deathSaves: DEATH_SAVES_RESET, hp: hp(0) }),
    applyStabilize: assign({ deathSaves: DEATH_SAVES_RESET }),
    setUnconscious: assign(({ context: c }) => ({
      unconscious: true,
      prone: true,
      incapacitatedSources: addIS(c.incapacitatedSources, "unconscious")
    })),
    clearUnconscious: assign(({ context: c }) => ({
      unconscious: false,
      incapacitatedSources: rmIS(c.incapacitatedSources, "unconscious")
    })),
    applyCondition: assign(({ context: c, event: e }) => {
      const u = applyConditionUpdate(asCondition(e).condition, c.incapacitatedSources, c.petrified)
      return { ...u.conditionFlags, incapacitatedSources: u.incapSources }
    }),
    removeCondition: assign(({ context: c, event: e }) => {
      const u = removeConditionUpdate(asCondition(e).condition, c.incapacitatedSources)
      return { ...u.conditionFlags, incapacitatedSources: u.incapSources }
    }),
    addExhaustion: assign(({ context: c, event: e }) => {
      const r = computeAddExhaustion(c.exhaustion, asExhaustion(e).levels, c.hp, c.maxHp)
      return { exhaustion: exhaustionLevel(r.newExhaustion), hp: hp(r.newHp) }
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
    useBonusAction: assign(({ context: c }) => {
      if (c.bonusActionUsed || c.incapacitatedSources.size > 0) return {}
      return { bonusActionUsed: true }
    }),
    useReaction: assign(({ context: c }) => {
      if (!c.reactionAvailable) return {}
      return { reactionAvailable: false }
    }),
    useMovement: assign(({ context: c, event: e }) => {
      const ev = asUseMovement(e)
      const cost = ev.feet * ev.movementCost
      if (cost > c.movementRemaining || cost < 0) return {}
      return { movementRemaining: movementFeet(c.movementRemaining - cost) }
    }),
    useExtraAttack: assign(({ context: c }) => {
      if (c.extraAttacksRemaining <= 0) return {}
      return { extraAttacksRemaining: c.extraAttacksRemaining - 1 }
    }),
    standFromProne: assign(({ context: c }) => {
      const r = spendHalfSpeed(c.movementRemaining, c.effectiveSpeed)
      if (!r.success || !c.prone) return {}
      return { movementRemaining: movementFeet(r.newMovementRemaining), prone: false }
    }),
    dropProne: assign({ prone: true }),
    endSurprise: assign({ reactionAvailable: true, surprised: false }),
    markBonusActionSpell: assign({ bonusActionSpellCast: true }),
    markNonCantripActionSpell: assign({ nonCantripActionSpellCast: true }),
    applyGrapple: assign(({ context: c, event: e }) => {
      const ev = asGrapple(e)
      if (
        !resolveGrapple(
          ev.attackerSize,
          ev.targetSize,
          ev.contestResult,
          ev.attackerHasFreeHand,
          c.incapacitatedSources.size > 0
        )
      )
        return {}
      return { grappled: true }
    }),
    releaseGrapple: assign({ grappled: false }),
    escapeGrapple: assign(({ event: e }) => {
      if (asEscapeGrapple(e).contestResult !== "bWins") return {}
      return { grappled: false }
    }),
    applyShove: assign(({ context: c, event: e }) => {
      const ev = asShove(e)
      if (!resolveShove(ev.attackerSize, ev.targetSize, ev.contestResult, c.incapacitatedSources.size > 0)) return {}
      if (ev.choice === "prone") return { prone: true }
      return {}
    }),
    expendSlot: assign(({ context: c, event: e }) => ({
      slotsCurrent: expendSlot(c.slotsCurrent, asExpendSlot(e).level)
    })),
    expendPactSlot: assign(({ context: c }) => {
      if (c.pactSlotsCurrent <= 0) return {}
      return { pactSlotsCurrent: c.pactSlotsCurrent - 1 }
    }),
    startConcentration: assign(({ event: e }) => ({ concentrationSpellId: asStartConcentration(e).spellId })),
    breakConcentration: assign({ concentrationSpellId: "" }),
    concentrationCheck: assign(({ context: c, event: e }) => {
      if (c.concentrationSpellId === "" || asConcentrationCheck(e).conSaveSucceeded) return {}
      return { concentrationSpellId: "" }
    }),
    spendHitDie: assign(({ context: c, event: e }) => {
      if (c.hitDiceRemaining <= 0) return {}
      const ev = asSpendHitDie(e)
      return {
        hitDiceRemaining: c.hitDiceRemaining - 1,
        hp: hp(Math.min(c.hp + Math.max(0, ev.dieRoll + ev.conMod), c.maxHp))
      }
    }),
    shortRest: assign(({ context: c, event: e }) => {
      const ev = asShortRest(e)
      const r = computeShortRest(c.hp, c.maxHp, c.hitDiceRemaining, c.pactSlotsMax, ev.conMod, ev.hdRolls)
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
      const ev = asApplyFall(e)
      const r = computeFallDamage(
        ev.damageRoll,
        c.hp,
        c.maxHp,
        c.tempHp,
        c.exhaustion,
        ev.immunities,
        ev.resistances,
        ev.vulnerabilities
      )
      if (!r) return {}
      if (!r.landsProne) return { tempHp: tempHp(r.newTempHp) }
      return { hp: hp(r.newHp), tempHp: tempHp(r.newTempHp), prone: true }
    }),
    suffocate: assign(({ context: c }) => {
      if (c.hp === 0) return {}
      return {
        hp: hp(0),
        unconscious: true,
        prone: true,
        incapacitatedSources: addIS(c.incapacitatedSources, "unconscious")
      }
    }),
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
  context: ({ input }) => ({
    ...INITIAL_CONDITIONS,
    ...INITIAL_TURN_STATE,
    concentrationSpellId: "",
    deathSaves: DEATH_SAVES_RESET,
    effectiveSpeed: movementFeet(0),
    exhaustion: 0 as ExhaustionLevel,
    hitDiceRemaining: 0,
    hp: hp(input.maxHp),
    incapacitatedSources: new Set<IncapSource>(),
    maxHp: hp(input.maxHp),
    movementRemaining: movementFeet(0),
    pactSlotLevel: 0,
    pactSlotsCurrent: 0,
    pactSlotsMax: 0,
    slotsCurrent: EMPTY_SLOTS,
    slotsMax: EMPTY_SLOTS,
    tempHp: tempHp(0)
  }),
  on: {
    ADD_EXHAUSTION: { actions: ["addExhaustion"] },
    REDUCE_EXHAUSTION: { actions: ["reduceExhaustion"] },
    GRAPPLE: { actions: ["applyGrapple"] },
    RELEASE_GRAPPLE: { actions: ["releaseGrapple"] },
    ESCAPE_GRAPPLE: { actions: ["escapeGrapple"] },
    SHOVE: { actions: ["applyShove"] },
    EXPEND_SLOT: { actions: ["expendSlot"] },
    EXPEND_PACT_SLOT: { actions: ["expendPactSlot"] },
    SHORT_REST: { actions: ["shortRest"] },
    LONG_REST: { actions: ["longRest"] },
    SPEND_HIT_DIE: { actions: ["spendHitDie"] },
    APPLY_FALL: { actions: ["applyFall"] },
    SUFFOCATE: { actions: ["suffocate"] },
    APPLY_STARVATION: { actions: ["applyStarvation"] },
    APPLY_DEHYDRATION: { actions: ["applyDehydration"] }
  },
  states: {
    damageTrack: damageTrackConfig,
    conditionTrack: {
      initial: "tracking",
      states: {
        tracking: {
          on: { APPLY_CONDITION: { actions: ["applyCondition"] }, REMOVE_CONDITION: { actions: ["removeCondition"] } }
        }
      }
    },
    turnPhase: turnPhaseConfig,
    spellcasting: {
      initial: "idle",
      states: {
        idle: { on: { START_CONCENTRATION: { target: "concentrating", actions: ["startConcentration"] } } },
        concentrating: {
          always: { guard: "shouldBreakConcentration", target: "idle", actions: ["breakConcentration"] },
          on: {
            BREAK_CONCENTRATION: { target: "idle", actions: ["breakConcentration"] },
            CONCENTRATION_CHECK: { actions: ["concentrationCheck"] },
            START_CONCENTRATION: { actions: ["startConcentration"] }
          }
        }
      }
    }
  }
})
export type DndSnapshot = SnapshotFrom<typeof dndMachine>
