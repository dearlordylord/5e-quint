import type { SnapshotFrom } from "xstate"
import { assign, setup } from "xstate"

import {
  fighterLongRest as tsFighterLongRest,
  fighterShortRest as tsFighterShortRest,
  heroicWarriorInspiration,
  remarkableAthleteCritMovement
} from "#/features/class-fighter.ts"
import * as barb from "#/machine-barbarian.ts"
import { initialClassStubs } from "#/machine-class-stubs.ts"
import { resolveGrapple, resolveShove } from "#/machine-combat.ts"
import { concBreak, concBreakFields, exhaustionWithConcBreak } from "#/machine-conc.ts"
import { dmgR, dsR, fallR } from "#/machine-damage.ts"
import { addAe, computeEndTurn, removeAe } from "#/machine-endturn.ts"
import { guards } from "#/machine-guards.ts"
import {
  actionSurgeUpdate,
  addDeathFailures,
  addIncapSource,
  applyConditionUpdate,
  effectiveMaxHp,
  EMPTY_CONDITION_SET,
  indomitableUpdate,
  longRestUpdate,
  removeConditionUpdate,
  removeIncapSource,
  secondWindUpdate,
  spendHalfSpeed,
  spendHitDieUpdate,
  tacticalMindUpdate
} from "#/machine-helpers.ts"
import * as monk from "#/machine-monk.ts"
import {
  applyLegendaryResistance,
  monsterLongRestUpdate,
  refreshBoolRecord,
  useDailyAbilityUpdate,
  useRechargeAbilityUpdate
} from "#/machine-monster.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import * as rogue from "#/machine-rogue.ts"
import { computeShortRest, expendSlot } from "#/machine-spells.ts"
import { computeInitTurn } from "#/machine-startturn.ts"
import {
  conditionTrackConfig,
  damageTrackConfig,
  rootEventHandlers,
  spellcastingConfig,
  turnPhaseConfig
} from "#/machine-states.ts"
import {
  asAddEffect,
  asAddExhaustion,
  asApplyCondition,
  asConcentrationCheck,
  asCondition,
  asEndTurn,
  asEscapeGrapple,
  asExhaustion,
  asExpendSlot,
  asGrantTempHp,
  asGrapple,
  asHeal,
  asRemoveEffect,
  asShortRest,
  asShove,
  asSpendHitDie,
  asStartConcentration,
  asTakeDamage,
  asUseAction,
  asUseBonusMovement,
  asUseMovement,
  asUseSecondWind,
  asUseTacticalMind,
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

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const MT = { context: {} as DndContext, events: {} as DndEvent, input: {} as DndMachineInput }
/* eslint-enable @typescript-eslint/consistent-type-assertions */

export const dndMachine = setup({
  types: MT,
  guards,
  actions: {
    markDead: assign({ dead: true }),
    // Quint pMonsterDeathCheck: clear spurious unconscious when monster dies at 0 HP
    monsterDeathCleanup: assign(({ context: c }) =>
      c.creatureKind === "Monster"
        ? { unconscious: false, incapacitatedSources: removeIncapSource(c.incapacitatedSources, "unconscious") }
        : {}
    ),
    enterCombat: assign({ inCombat: true }),
    exitCombat: assign({ inCombat: false }),
    applyDamage: assign(({ context: c, event: e }) => ({
      hp: hp(dmgR(c, e).newHp),
      tempHp: tempHp(dmgR(c, e).newTempHp)
    })),
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
      const ev = asApplyCondition(e)
      const u = applyConditionUpdate(
        ev.condition,
        c.incapacitatedSources,
        c.petrified,
        ev.conditionImmunities ?? EMPTY_CONDITION_SET
      )
      return {
        ...u.conditionFlags,
        incapacitatedSources: u.incapSources,
        ...(!isIncapacitated(c) && u.incapSources.size > 0 ? concBreakFields(c) : {})
      }
    }),
    removeCondition: assign(({ context: c, event: e }) => {
      const cond = asCondition(e).condition
      const u = removeConditionUpdate(cond, c.incapacitatedSources, c.unconscious)
      return { ...u.conditionFlags, incapacitatedSources: u.incapSources }
    }),
    addExhaustion: assign(({ context: c, event: e }) => {
      const ev = asAddExhaustion(e)
      return exhaustionWithConcBreak(c, ev.levels, ev.exhaustionImmune)
    }),
    reduceExhaustion: assign(({ context: c, event: e }) => ({
      exhaustion: exhaustionLevel(Math.max(0, c.exhaustion - asExhaustion(e).levels))
    })),
    initTurn: assign(({ context: c, event: e }) => computeInitTurn(c, e)),
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
    dropProne: assign(({ context: c }) => (c.effectiveSpeed === 0 ? {} : { prone: true })),
    endTurn: assign(({ context: c, event: e }) => {
      const ev = asEndTurn(e)
      const isMonster = c.creatureKind === "Monster"
      const lr = isMonster
        ? applyLegendaryResistance(ev.endOfTurnSaves, ev.useLegendaryResistance, c.legendaryResistancesRemaining)
        : { effectiveSaves: ev.endOfTurnSaves, lrUsed: false }
      const { conditions: conds, ...rest } = computeEndTurn(c, lr.effectiveSaves, ev.endOfTurnDamage)
      return {
        ...conds,
        ...rest,
        ...(lr.lrUsed ? { legendaryResistancesRemaining: c.legendaryResistancesRemaining - 1 } : {})
      }
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
    spendHitDie: assign(({ context: c, event: e }) => spendHitDieUpdate(c, asSpendHitDie(e))),
    shortRest: assign(({ context: c, event: e }) => {
      const ev = asShortRest(e)
      const r = computeShortRest(c.hp, c.maxHp, c.hitDiceRemaining, c.pactSlotsMax, ev.conMod, ev.hdRolls)
      return {
        hitDiceRemaining: r.newHitDice,
        hp: hp(r.newHp),
        pactSlotsCurrent: r.newPactSlots,
        ...(c.creatureKind === "Monster" ? { rechargeAvailable: refreshBoolRecord(c.rechargeAvailable) } : {})
      }
    }),
    longRest: assign(({ context: c }) => {
      const base = longRestUpdate(c)
      return c.creatureKind !== "Monster" ? base : { ...base, ...monsterLongRestUpdate(c) }
    }),
    applyFall: assign(({ context: c, event: e }) => {
      const r = fallR(c, e)
      const took = r.newHp !== c.hp || r.newTempHp !== c.tempHp
      // Dying instant death: HP stays 0 but dmgThrough >= maxHp kills — Quint sees state change
      const dyingInstantDeath = c.hp === 0 && r.dmgThrough >= r.effMax
      return { hp: hp(r.newHp), tempHp: tempHp(r.newTempHp), ...(took || dyingInstantDeath ? { prone: true } : {}) }
    }),
    applyFallAtZeroHp: assign(({ context: c, event: e }) => {
      const r = fallR(c, e)
      if (r.dmgThrough === 0)
        return { tempHp: tempHp(r.newTempHp), ...(r.newTempHp !== c.tempHp ? { prone: true } : {}) }
      const df = addDeathFailures(c.deathSaves.failures, false)
      return {
        tempHp: tempHp(r.newTempHp),
        prone: true,
        stable: false,
        deathSaves: { successes: c.deathSaves.successes, failures: deathSaveCount(df.newFailures) }
      }
    }),
    suffocate: assign(({ context: c }) => ({
      hp: hp(0),
      ...(c.creatureKind === "Monster"
        ? { dead: true }
        : {
            unconscious: true,
            prone: true,
            incapacitatedSources: addIncapSource(c.incapacitatedSources, "unconscious")
          }),
      ...concBreak(c)
    })),
    applyStarvation: assign(({ context: c }) => exhaustionWithConcBreak(c, 1)),
    applyDehydration: assign(({ context: c }) => exhaustionWithConcBreak(c, 1)),
    useSecondWind: assign(({ context: c, event: e }) =>
      secondWindUpdate(c, c.fighterLevel, asUseSecondWind(e).d10Roll, isIncapacitated(c))
    ),
    useActionSurge: assign(({ context: c }) => actionSurgeUpdate(c, isIncapacitated(c))),
    useIndomitable: assign(({ context: c }) => indomitableUpdate(c.fighterLevel, c.indomitableCharges)),
    useTacticalMind: assign(({ context: c, event: e }) =>
      tacticalMindUpdate(
        c.secondWindCharges,
        c.fighterLevel,
        asUseTacticalMind(e).boostedCheckSucceeds,
        isIncapacitated(c)
      )
    ),
    fighterStartTurn: assign(({ context: c }) => ({
      actionSurgeUsedThisTurn: false,
      ...(heroicWarriorInspiration(c.fighterLevel, c.heroicInspiration) ? { heroicInspiration: true } : {})
    })),
    useHeroicInspiration: assign(({ context: c }) => (c.heroicInspiration ? { heroicInspiration: false } : {})),
    scoreCriticalHit: assign(({ context: c }) => {
      if (isIncapacitated(c)) return {}
      const d = remarkableAthleteCritMovement(c.fighterLevel, c.effectiveSpeed)
      return d <= 0 ? { bonusMovementOAFree: true } : { bonusMovementRemaining: d, bonusMovementOAFree: true }
    }),
    useBonusMovement: assign(({ context: c, event: e }) =>
      c.bonusMovementRemaining <= 0
        ? {}
        : { bonusMovementRemaining: Math.max(c.bonusMovementRemaining - asUseBonusMovement(e).feet, 0) }
    ),
    fighterShortRest: assign(({ context: c }) =>
      tsFighterShortRest({
        secondWindCharges: c.secondWindCharges,
        secondWindMax: c.secondWindMax,
        actionSurgeCharges: c.actionSurgeCharges,
        actionSurgeMax: c.actionSurgeMax
      })
    ),
    fighterLongRest: assign(({ context: c }) =>
      tsFighterLongRest({
        secondWindCharges: c.secondWindCharges,
        secondWindMax: c.secondWindMax,
        actionSurgeCharges: c.actionSurgeCharges,
        actionSurgeMax: c.actionSurgeMax,
        indomitableMax: c.indomitableMax
      })
    ),
    useLegendaryAction: assign(({ context: c }) =>
      c.creatureKind !== "Monster" || c.legendaryActionsRemaining <= 0
        ? {}
        : { legendaryActionsRemaining: c.legendaryActionsRemaining - 1 }
    ),
    useRechargeAbility: assign(({ context: c, event: e }) =>
      c.creatureKind !== "Monster"
        ? {}
        : useRechargeAbilityUpdate(c.rechargeAvailable, (e as Extract<DndEvent, { type: "USE_RECHARGE_ABILITY" }>).name)
    ),
    useDailyAbility: assign(({ context: c, event: e }) =>
      c.creatureKind !== "Monster"
        ? {}
        : useDailyAbilityUpdate(c.dailyUsesRemaining, (e as Extract<DndEvent, { type: "USE_DAILY_ABILITY" }>).name)
    ),
    enterRage: assign(({ context: c }) => barb.enterRageUpdate(c)),
    endRage: assign(({ context: c }) => barb.endRageUpdate(c)),
    extendRageBA: assign(({ context: c }) => barb.extendRageBAUpdate(c)),
    markAttackOrForcedSave: assign(({ context: c }) => barb.markAttackOrForcedSaveUpdate(c)),
    declareReckless: assign(({ context: c }) => barb.declareRecklessUpdate(c)),
    useIntimidatingPresence: assign(({ context: c }) => barb.useIntimidatingPresenceUpdate(c)),
    restoreIntimidatingPresence: assign(({ context: c }) => barb.restoreIntimidatingPresenceUpdate(c)),
    barbarianStartTurn: assign(({ context: c }) => barb.barbarianStartTurnUpdate(c)),
    barbarianShortRest: assign(({ context: c }) => barb.barbarianShortRestUpdate(c)),
    barbarianLongRest: assign(({ context: c }) => barb.barbarianLongRestUpdate(c)),
    flurryOfBlows: assign(({ context: c }) => monk.flurryOfBlowsUpdate(c)),
    patientDefenseFree: assign(({ context: c }) => monk.patientDefenseFreeUpdate(c)),
    patientDefenseFocus: assign(({ context: c }) => monk.patientDefenseFocusUpdate(c)),
    stepOfTheWindFree: assign(({ context: c }) => monk.stepOfTheWindFreeUpdate(c)),
    stepOfTheWindFocus: assign(({ context: c }) => monk.stepOfTheWindFocusUpdate(c)),
    stunningStrike: assign(({ context: c }) => monk.stunningStrikeUpdate(c)),
    wholenessOfBody: assign(({ context: c, event: e }) =>
      monk.wholenessOfBodyUpdate(c, (e as Extract<DndEvent, { type: "WHOLENESS_OF_BODY" }>).healRoll)
    ),
    uncannyMetabolism: assign(({ context: c, event: e }) =>
      monk.uncannyMetabolismUpdate(c, (e as Extract<DndEvent, { type: "UNCANNY_METABOLISM" }>).healRoll)
    ),
    monkStartTurn: assign(({ context: c }) => monk.monkStartTurnUpdate(c)),
    monkShortRest: assign(({ context: c }) => monk.monkShortRestUpdate(c)),
    monkLongRest: assign(({ context: c }) => monk.monkLongRestUpdate(c)),
    paladinStartTurn: assign(() => ({})),
    paladinShortRest: assign(() => ({})),
    paladinLongRest: assign(() => ({})),
    useSneakAttack: assign(({ context: c }) => rogue.sneakAttackUpdate(c)),
    useSteadyAim: assign(({ context: c }) => rogue.steadyAimUpdate(c)),
    rogueStartTurn: assign(({ context: c }) => rogue.rogueStartTurnUpdate(c)),
    rogueShortRest: assign(({ context: c }) => rogue.rogueShortRestUpdate(c)),
    rogueLongRest: assign(({ context: c }) => rogue.rogueLongRestUpdate(c)),
    clericStartTurn: assign(() => ({})),
    clericShortRest: assign(() => ({})),
    clericLongRest: assign(() => ({})),
    druidStartTurn: assign(() => ({})),
    druidShortRest: assign(() => ({})),
    druidLongRest: assign(() => ({})),
    sorcererStartTurn: assign(() => ({})),
    sorcererShortRest: assign(() => ({})),
    sorcererLongRest: assign(() => ({})),
    warlockStartTurn: assign(() => ({})),
    warlockShortRest: assign(() => ({})),
    warlockLongRest: assign(() => ({})),
    wizardStartTurn: assign(() => ({})),
    wizardShortRest: assign(() => ({})),
    wizardLongRest: assign(() => ({}))
  }
}).createMachine({
  id: "dnd",
  type: "parallel",
  context: ({ input: i }) => ({
    ...INITIAL_CONDITIONS,
    ...INITIAL_TURN_STATE,
    creatureKind: i.creatureKind ?? "PC",
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
    tempHp: tempHp(0),
    legendaryActionsMax: i.legendaryActionsMax ?? i.legendaryActionsRemaining ?? 0,
    legendaryResistancesMax: i.legendaryResistancesMax ?? i.legendaryResistancesRemaining ?? 0,
    legendaryActionsRemaining: i.legendaryActionsRemaining ?? 0,
    legendaryResistancesRemaining: i.legendaryResistancesRemaining ?? 0,
    rechargeAvailable: i.rechargeAvailable ?? {},
    dailyUsesRemaining: i.dailyUsesRemaining ?? {},
    dailyUsesMax: i.dailyUsesMax ?? i.dailyUsesRemaining ?? {},
    ...barb.initialBarbarianState(i.barbarianLevel ?? 0),
    ...monk.initialMonkState(i.monkLevel ?? 0, i.wholenessMax),
    ...rogue.initialRogueState(i.rogueLevel ?? 0),
    ...initialClassStubs(i)
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
