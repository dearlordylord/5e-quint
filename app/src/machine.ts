import type { SnapshotFrom } from "xstate"
import { assign, setup } from "xstate"

import { resolveGrapple, resolveShove } from "#/machine-combat.ts"
import { dmgR, dsR, fallR } from "#/machine-damage.ts"
import { addAe, computeEndTurn, removeAe } from "#/machine-endturn.ts"
import { guards } from "#/machine-guards.ts"
import {
  addDeathFailures,
  addIncapSource,
  applyConditionUpdate,
  calculateEffectiveSpeed,
  computeAddExhaustion,
  effectiveMaxHp,
  exhUpdate,
  MAX_EXHAUSTION,
  removeConditionUpdate,
  removeIncapSource,
  spendHalfSpeed
} from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { computeLongRest, computeShortRest, expendSlot } from "#/machine-spells.ts"
import { computeStartTurn } from "#/machine-startturn.ts"
import {
  conditionTrackConfig,
  damageTrackConfig,
  rootEventHandlers,
  spellcastingConfig,
  turnPhaseConfig
} from "#/machine-states.ts"
import {
  asAddEffect,
  asConcentrationCheck,
  asCondition,
  asEndTurn,
  asEscapeGrapple,
  asExhaustion,
  asExpendSlot,
  asGrantTempHp,
  asGrapple,
  asHeal,
  asLongRest,
  asRemoveEffect,
  asShortRest,
  asShove,
  asSpendHitDie,
  asStartConcentration,
  asStartTurn,
  asTakeDamage,
  asUseAction,
  asUseMovement,
  asUseSecondWind,
  type DndContext,
  type DndEvent,
  type DndMachineInput,
  INITIAL_CONDITIONS,
  INITIAL_TURN_STATE,
  initialFighterState
} from "#/machine-types.ts"
import {
  type ActiveEffect,
  DEATH_SAVES_RESET,
  deathSaveCount,
  EMPTY_SLOTS,
  exhaustionLevel,
  hp,
  type IncapSource,
  movementFeet,
  tempHp
} from "#/types.ts"

export type { DndContext, DndEvent, DndMachineInput } from "#/machine-types.ts"
const concBreakFields = (c: DndContext) =>
  c.concentrationSpellId !== ""
    ? { concentrationSpellId: "", activeEffects: removeAe(c.activeEffects, c.concentrationSpellId) }
    : {}
const concBreak = (c: DndContext) => (!isIncapacitated(c) ? concBreakFields(c) : {})
const exhaustionWithConcBreak = (c: DndContext, levels: number) => {
  const r = computeAddExhaustion(c.exhaustion, levels, c.hp, c.maxHp)
  const died = r.newExhaustion >= MAX_EXHAUSTION && c.exhaustion < MAX_EXHAUSTION
  return { ...exhUpdate(r), ...(died ? concBreakFields(c) : {}) }
}

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const MT = { context: {} as DndContext, events: {} as DndEvent, input: {} as DndMachineInput }
/* eslint-enable @typescript-eslint/consistent-type-assertions */

export const dndMachine = setup({
  types: MT,
  guards,
  actions: {
    markDead: assign({ dead: true }),
    enterCombat: assign({ inCombat: true }),
    exitCombat: assign({ inCombat: false }),
    applyDamage: assign(({ context: c, event: e }) => {
      const r = dmgR(c, e)
      return { hp: hp(r.newHp), tempHp: tempHp(r.newTempHp) }
    }),
    absorbTempHpOnly: assign(({ context: c, event: e }) => ({ tempHp: tempHp(dmgR(c, e).newTempHp) })),
    applyDamageAtZeroHp: assign(({ context: c, event: e }) => {
      const { newFailures } = addDeathFailures(c.deathSaves.failures, asTakeDamage(e).isCritical)
      return {
        deathSaves: { successes: c.deathSaves.successes, failures: deathSaveCount(newFailures) },
        tempHp: tempHp(dmgR(c, e).newTempHp),
        stable: false
      }
    }),
    applyDeathSave: assign(({ context: c, event: e }) => {
      const r = dsR(c, e)
      if (r.regainsConsciousness) return { deathSaves: DEATH_SAVES_RESET, hp: hp(1) }
      if (r.isStabilized) return { deathSaves: DEATH_SAVES_RESET, stable: true }
      return { deathSaves: { successes: deathSaveCount(r.newSuccesses), failures: deathSaveCount(r.newFailures) } }
    }),
    applyHeal: assign(({ context: c, event: e }) => ({
      hp: hp(Math.min(c.hp + asHeal(e).amount, effectiveMaxHp(c.maxHp)))
    })),
    applyHealFromZero: assign(({ context: c, event: e }) => ({
      deathSaves: DEATH_SAVES_RESET,
      hp: hp(Math.min(asHeal(e).amount, effectiveMaxHp(c.maxHp)))
    })),
    applyTempHp: assign(({ event: e }) => (asGrantTempHp(e).keepOld ? {} : { tempHp: asGrantTempHp(e).amount })),
    applyKnockOut: assign(({ context: c }) => ({
      hp: hp(1),
      ...concBreak(c)
    })),
    applyStabilize: assign({ deathSaves: DEATH_SAVES_RESET, stable: true }),
    setUnconscious: assign(({ context: c }) => ({
      unconscious: true,
      prone: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "unconscious"),
      ...concBreak(c)
    })),
    clearUnconscious: assign(({ context: c }) => ({
      unconscious: false,
      incapacitatedSources: removeIncapSource(c.incapacitatedSources, "unconscious"),
      stable: false,
      deathSaves: DEATH_SAVES_RESET
    })),
    applyCondition: assign(({ context: c, event: e }) => {
      const u = applyConditionUpdate(asCondition(e).condition, c.incapacitatedSources, c.petrified)
      return {
        ...u.conditionFlags,
        incapacitatedSources: u.incapSources,
        ...(!isIncapacitated(c) && u.incapSources.size > 0 ? concBreakFields(c) : {})
      }
    }),
    removeCondition: assign(({ context: c, event: e }) => {
      const cond = asCondition(e).condition
      if (cond === "prone" && c.unconscious) return {}
      const u = removeConditionUpdate(cond, c.incapacitatedSources)
      return { ...u.conditionFlags, incapacitatedSources: u.incapSources }
    }),
    addExhaustion: assign(({ context: c, event: e }) => exhaustionWithConcBreak(c, asExhaustion(e).levels)),
    reduceExhaustion: assign(({ context: c, event: e }) => ({
      exhaustion: exhaustionLevel(Math.max(0, c.exhaustion - asExhaustion(e).levels))
    })),
    initTurn: assign(({ context: c, event: e }) => {
      const ev = asStartTurn(e)
      const { conditions: conds, ...cr } = computeStartTurn(c, ev.deathSaveRoll, ev.startOfTurnEffects)
      const speed = calculateEffectiveSpeed({
        armorPenalty: ev.armorPenalty,
        baseSpeed: ev.baseSpeed,
        callerSpeedModifier: ev.callerSpeedModifier,
        exhaustion: c.exhaustion,
        grappled: conds.grappled ?? c.grappled,
        grappledTargetTwoSizesSmaller: ev.grappledTargetTwoSizesSmaller,
        isGrappling: ev.isGrappling,
        restrained: conds.restrained ?? c.restrained
      })
      return {
        ...conds,
        ...cr,
        ...INITIAL_TURN_STATE,
        effectiveSpeed: movementFeet(speed),
        extraAttacksRemaining: ev.extraAttacks,
        movementRemaining: movementFeet(speed)
      }
    }),
    useAction: assign(({ context: c, event: e }) => {
      const ev = asUseAction(e)
      if (c.actionsRemaining <= 0 || isIncapacitated(c)) return {}
      const base = { actionsRemaining: c.actionsRemaining - 1 }
      switch (ev.actionType) {
        case "attack":
          return { ...base, attackActionUsed: true }
        case "disengage":
          return { ...base, disengaged: true }
        case "dodge":
          return { ...base, dodging: true }
        case "dash":
          return { ...base, movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed) }
        case "ready":
          return { ...base, readiedAction: true }
        default:
          return base
      }
    }),
    useBonusAction: assign(({ context: c }) =>
      c.bonusActionUsed || isIncapacitated(c) ? {} : { bonusActionUsed: true }
    ),
    useReaction: assign(({ context: c }) => (c.reactionAvailable ? { reactionAvailable: false } : {})),
    useMovement: assign(({ context: c, event: e }) => {
      const cost = asUseMovement(e).feet * asUseMovement(e).movementCost
      return cost > c.movementRemaining || cost < 0
        ? {}
        : { movementRemaining: movementFeet(c.movementRemaining - cost) }
    }),
    useExtraAttack: assign(({ context: c }) =>
      c.extraAttacksRemaining <= 0 ? {} : { extraAttacksRemaining: c.extraAttacksRemaining - 1 }
    ),
    grantExtraAction: assign(({ context: c }) => ({
      actionsRemaining: c.actionsRemaining + 1
    })),
    standFromProne: assign(({ context: c }) => {
      const r = spendHalfSpeed(c.movementRemaining, c.effectiveSpeed)
      if (!r.success) return {}
      return { movementRemaining: movementFeet(r.newMovementRemaining), ...(c.prone ? { prone: false } : {}) }
    }),
    dropProne: assign({ prone: true }),
    endTurn: assign(({ context: c, event: e }) => {
      const ev = asEndTurn(e)
      const { conditions: conds, ...rest } = computeEndTurn(c, ev.endOfTurnSaves, ev.endOfTurnDamage)
      return { ...conds, ...rest }
    }),
    markBonusActionSpell: assign({ bonusActionSpellCast: true }),
    markNonCantripActionSpell: assign({ nonCantripActionSpellCast: true }),
    applyGrapple: assign(({ context: c, event: e }) => {
      const ev = asGrapple(e)
      const ok = resolveGrapple(
        ev.attackerSize,
        ev.targetSize,
        ev.targetSaveFailed,
        ev.attackerHasFreeHand,
        isIncapacitated(c)
      )
      return ok ? { grappled: true } : {}
    }),
    releaseGrapple: assign({ grappled: false }),
    escapeGrapple: assign(({ event: e }) => (asEscapeGrapple(e).escapeSucceeded ? { grappled: false } : {})),
    applyShove: assign(({ context: c, event: e }) => {
      const ev = asShove(e)
      if (!resolveShove(ev.attackerSize, ev.targetSize, ev.targetSaveFailed, isIncapacitated(c))) return {}
      if (ev.choice === "prone") return { prone: true }
      return {}
    }),
    expendSlot: assign(({ context: c, event: e }) => ({
      slotsCurrent: expendSlot(c.slotsCurrent, asExpendSlot(e).level)
    })),
    expendPactSlot: assign(({ context: c }) =>
      c.pactSlotsCurrent <= 0 ? {} : { pactSlotsCurrent: c.pactSlotsCurrent - 1 }
    ),
    startConcentration: assign(({ context: c, event: e }) => {
      const ev = asStartConcentration(e)
      const base = c.concentrationSpellId ? removeAe(c.activeEffects, c.concentrationSpellId) : c.activeEffects
      return {
        concentrationSpellId: ev.spellId,
        activeEffects: addAe(base, ev.spellId, ev.durationTurns, ev.expiresAt)
      }
    }),
    breakConcentration: assign(({ context: c }) => concBreakFields(c)),
    concentrationCheck: assign(({ context: c, event: e }) =>
      c.concentrationSpellId === "" || asConcentrationCheck(e).conSaveSucceeded ? {} : concBreakFields(c)
    ),
    addEffect: assign(({ context: c, event: e }) => {
      const ev = asAddEffect(e)
      return { activeEffects: addAe(c.activeEffects, ev.spellId, ev.durationTurns, ev.expiresAt) }
    }),
    removeEffect: assign(({ context: c, event: e }) => ({
      activeEffects: removeAe(c.activeEffects, asRemoveEffect(e).spellId)
    })),
    spendHitDie: assign(({ context: c, event: e }) => {
      if (c.hitDiceRemaining <= 0) return {}
      const ev = asSpendHitDie(e)
      return {
        hitDiceRemaining: c.hitDiceRemaining - 1,
        hp: hp(Math.min(c.hp + Math.max(0, ev.dieRoll + ev.conMod), effectiveMaxHp(c.maxHp)))
      }
    }),
    shortRest: assign(({ context: c, event: e }) => {
      const ev = asShortRest(e)
      const r = computeShortRest(c.hp, c.maxHp, c.hitDiceRemaining, c.pactSlotsMax, ev.conMod, ev.hdRolls)
      return { hitDiceRemaining: r.newHitDice, hp: hp(r.newHp), pactSlotsCurrent: r.newPactSlots }
    }),
    longRest: assign(({ context: c, event: e }) => {
      const ev = asLongRest(e)
      const r = computeLongRest(c.hp, c.maxHp, c.exhaustion, c.slotsMax, c.pactSlotsMax, ev.totalHitDice)
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
      if (r.dmgThrough === 0)
        return { tempHp: tempHp(r.newTempHp), ...(r.newTempHp !== c.tempHp ? { prone: true } : {}) }
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
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "unconscious"),
      ...concBreak(c)
    })),
    applyStarvation: assign(({ context: c }) => exhaustionWithConcBreak(c, 1)),
    applyDehydration: assign(({ context: c }) => exhaustionWithConcBreak(c, 1)),
    useSecondWind: assign(({ context: c, event: e }) => {
      const ev = asUseSecondWind(e)
      if (c.secondWindCharges <= 0 || c.bonusActionUsed || isIncapacitated(c)) return {}
      const healAmount = ev.d10Roll + ev.fighterLevel
      const newHp = Math.min(c.hp + healAmount, effectiveMaxHp(c.maxHp))
      return { hp: hp(newHp), secondWindCharges: c.secondWindCharges - 1, bonusActionUsed: true }
    }),
    useActionSurge: assign(({ context: c }) => {
      if (c.actionSurgeCharges <= 0 || c.actionSurgeUsedThisTurn || isIncapacitated(c)) return {}
      return {
        actionsRemaining: c.actionsRemaining + 1,
        actionSurgeCharges: c.actionSurgeCharges - 1,
        actionSurgeUsedThisTurn: true
      }
    }),
    useIndomitable: assign(({ context: c }) => {
      if (c.indomitableCharges <= 0) return {}
      return { indomitableCharges: c.indomitableCharges - 1 }
    }),
    fighterStartTurn: assign({ actionSurgeUsedThisTurn: false }),
    fighterShortRest: assign(({ context: c }) => ({
      secondWindCharges: Math.min(c.secondWindCharges + 1, c.secondWindMax),
      actionSurgeCharges: c.actionSurgeMax
    })),
    fighterLongRest: assign(({ context: c }) => ({
      secondWindCharges: c.secondWindMax,
      actionSurgeCharges: c.actionSurgeMax,
      indomitableCharges: c.indomitableMax
    }))
  }
}).createMachine({
  id: "dnd",
  type: "parallel",
  context: ({ input: i }) => ({
    ...INITIAL_CONDITIONS,
    ...INITIAL_TURN_STATE,
    fighterLevel: i.fighterLevel ?? 0,
    ...initialFighterState(i.fighterLevel ?? 0),
    activeEffects: [] as ReadonlyArray<ActiveEffect>,
    concentrationSpellId: "",
    dead: false,
    inCombat: false,
    deathSaves: DEATH_SAVES_RESET,
    stable: false,
    effectiveSpeed: movementFeet(i.effectiveSpeed ?? 0),
    exhaustion: exhaustionLevel(0),
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
