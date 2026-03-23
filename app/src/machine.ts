import type { SnapshotFrom } from "xstate"
import { assign, setup } from "xstate"

import {
  addDeathFailures,
  applyConditionUpdate,
  calculateEffectiveSpeed,
  computeAddExhaustion,
  computeTakeDamage,
  removeConditionUpdate,
  resolveDeathSave,
  spendHalfSpeed
} from "#/machine-helpers.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
import {
  asCondition,
  asDeathSave,
  asExhaustion,
  asGrantTempHp,
  asHeal,
  asStartTurn,
  asTakeDamage,
  asUseAction,
  asUseMovement,
  INITIAL_CONDITIONS,
  INITIAL_TURN_STATE
} from "#/machine-types.ts"
import type { ExhaustionLevel, IncapSource } from "#/types.ts"
import { DEATH_SAVES_RESET, deathSaveCount, exhaustionLevel, hp, movementFeet, tempHp } from "#/types.ts"

export type { DndContext, DndEvent } from "#/machine-types.ts"

// --- Helpers for guards/actions ---

const EXHAUSTION_DEATH_THRESHOLD = 6

function dmgResult(context: DndContext, event: DndEvent) {
  const e = asTakeDamage(event)
  return computeTakeDamage(
    context.hp,
    context.maxHp,
    context.tempHp,
    context.exhaustion,
    e.amount,
    e.damageType,
    e.immunities,
    e.resistances,
    e.vulnerabilities
  )
}

function deathSaveResult(context: DndContext, event: DndEvent) {
  return resolveDeathSave(asDeathSave(event).d20Roll, context.deathSaves.successes, context.deathSaves.failures)
}

function addIncapSource(sources: ReadonlySet<IncapSource>, source: IncapSource): ReadonlySet<IncapSource> {
  return new Set([...sources, source])
}

function removeIncapSource(sources: ReadonlySet<IncapSource>, source: IncapSource): ReadonlySet<IncapSource> {
  return new Set([...sources].filter((s) => s !== source))
}

// --- Machine ---

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const machineTypes = { context: {} as DndContext, events: {} as DndEvent, input: {} as { readonly maxHp: number } }
/* eslint-enable @typescript-eslint/consistent-type-assertions */

export const dndMachine = setup({
  types: machineTypes,
  guards: {
    instantDeathFromConscious: ({ context, event }) => {
      const r = dmgResult(context, event)
      return r.dmgThrough > 0 && r.newHp === 0 && r.overflow >= r.effMax
    },
    dropsToZeroHp: ({ context, event }) => {
      const r = dmgResult(context, event)
      return r.dmgThrough > 0 && r.newHp === 0 && r.overflow < r.effMax
    },
    noDamageThrough: ({ context, event }) => dmgResult(context, event).dmgThrough === 0,
    instantDeathFromDying: ({ context, event }) => {
      const r = dmgResult(context, event)
      return r.dmgThrough > 0 && r.dmgThrough >= r.effMax
    },
    deathFromDamageFailures: ({ context, event }) => {
      const r = dmgResult(context, event)
      if (r.dmgThrough === 0) return false
      return addDeathFailures(context.deathSaves.failures, asTakeDamage(event).isCritical).isDead
    },
    deathSaveRegainsConsciousness: ({ context, event }) => deathSaveResult(context, event).regainsConsciousness,
    deathSaveStabilizes: ({ context, event }) => deathSaveResult(context, event).isStabilized,
    deathSaveDies: ({ context, event }) => deathSaveResult(context, event).isDead,
    exhaustionDeath: ({ context }) => context.exhaustion >= EXHAUSTION_DEATH_THRESHOLD,
    isSurprised: ({ event }) => asStartTurn(event).isSurprised,
    canStandFromProne: ({ context }) =>
      context.prone &&
      context.effectiveSpeed > 0 &&
      spendHalfSpeed(context.movementRemaining, context.effectiveSpeed).success
  },
  actions: {
    applyDamage: assign(({ context, event }) => {
      const r = dmgResult(context, event)
      return { hp: hp(r.newHp), tempHp: tempHp(r.newTempHp) }
    }),
    absorbTempHpOnly: assign(({ context, event }) => ({ tempHp: tempHp(dmgResult(context, event).newTempHp) })),
    applyDamageAtZeroHp: assign(({ context, event }) => {
      const r = dmgResult(context, event)
      const { newFailures } = addDeathFailures(context.deathSaves.failures, asTakeDamage(event).isCritical)
      return {
        deathSaves: { successes: context.deathSaves.successes, failures: deathSaveCount(newFailures) },
        tempHp: tempHp(r.newTempHp)
      }
    }),
    applyDeathSave: assign(({ context, event }) => {
      const r = deathSaveResult(context, event)
      if (r.regainsConsciousness) return { deathSaves: DEATH_SAVES_RESET, hp: hp(1) }
      if (r.isStabilized) return { deathSaves: DEATH_SAVES_RESET }
      return { deathSaves: { successes: deathSaveCount(r.newSuccesses), failures: deathSaveCount(r.newFailures) } }
    }),
    applyHeal: assign(({ context, event }) => ({ hp: hp(Math.min(context.hp + asHeal(event).amount, context.maxHp)) })),
    applyHealFromZero: assign(({ context, event }) => ({
      deathSaves: DEATH_SAVES_RESET,
      hp: hp(Math.min(asHeal(event).amount, context.maxHp))
    })),
    applyTempHp: assign(({ event }) => {
      const e = asGrantTempHp(event)
      return e.keepOld ? {} : { tempHp: e.amount }
    }),
    applyKnockOut: assign({ deathSaves: DEATH_SAVES_RESET, hp: hp(0) }),
    applyStabilize: assign({ deathSaves: DEATH_SAVES_RESET }),
    setUnconscious: assign(({ context }) => ({
      unconscious: true,
      prone: true,
      incapacitatedSources: addIncapSource(context.incapacitatedSources, "unconscious")
    })),
    clearUnconscious: assign(({ context }) => ({
      unconscious: false,
      incapacitatedSources: removeIncapSource(context.incapacitatedSources, "unconscious")
    })),
    applyCondition: assign(({ context, event }) => {
      const update = applyConditionUpdate(asCondition(event).condition, context.incapacitatedSources, context.petrified)
      return { ...update.conditionFlags, incapacitatedSources: update.incapSources }
    }),
    removeCondition: assign(({ context, event }) => {
      const update = removeConditionUpdate(asCondition(event).condition, context.incapacitatedSources)
      return { ...update.conditionFlags, incapacitatedSources: update.incapSources }
    }),
    addExhaustion: assign(({ context, event }) => {
      const result = computeAddExhaustion(context.exhaustion, asExhaustion(event).levels, context.hp, context.maxHp)
      return { exhaustion: exhaustionLevel(result.newExhaustion), hp: hp(result.newHp) }
    }),
    reduceExhaustion: assign(({ context, event }) => ({
      exhaustion: exhaustionLevel(Math.max(0, context.exhaustion - asExhaustion(event).levels))
    })),
    initTurn: assign(({ context, event }) => {
      const e = asStartTurn(event)
      const speed = calculateEffectiveSpeed({
        armorPenalty: e.armorPenalty,
        baseSpeed: e.baseSpeed,
        callerSpeedModifier: e.callerSpeedModifier,
        exhaustion: context.exhaustion,
        grappled: context.grappled,
        grappledTargetTwoSizesSmaller: e.grappledTargetTwoSizesSmaller,
        isGrappling: e.isGrappling,
        restrained: context.restrained
      })
      return {
        ...INITIAL_TURN_STATE,
        actionUsed: e.isSurprised,
        bonusActionUsed: e.isSurprised,
        dodging: false,
        effectiveSpeed: movementFeet(speed),
        extraAttacksRemaining: e.extraAttacks,
        movementRemaining: movementFeet(e.isSurprised ? 0 : speed),
        reactionAvailable: !e.isSurprised,
        surprised: e.isSurprised
      }
    }),
    useAction: assign(({ context, event }) => {
      const e = asUseAction(event)
      if (context.actionUsed || context.incapacitatedSources.size > 0) return {}
      if (e.actionType === "attack") return { actionUsed: true, attackActionUsed: true }
      if (e.actionType === "disengage") return { actionUsed: true, disengaged: true }
      if (e.actionType === "dodge") return { actionUsed: true, dodging: true }
      if (e.actionType === "dash") {
        return { actionUsed: true, movementRemaining: movementFeet(context.movementRemaining + context.effectiveSpeed) }
      }
      if (e.actionType === "ready") return { actionUsed: true, readiedAction: true }
      return { actionUsed: true }
    }),
    useBonusAction: assign(({ context }) => {
      if (context.bonusActionUsed || context.incapacitatedSources.size > 0) return {}
      return { bonusActionUsed: true }
    }),
    useReaction: assign(({ context }) => {
      if (!context.reactionAvailable) return {}
      return { reactionAvailable: false }
    }),
    useMovement: assign(({ context, event }) => {
      const e = asUseMovement(event)
      const cost = e.feet * e.movementCost
      if (cost > context.movementRemaining || cost < 0) return {}
      return { movementRemaining: movementFeet(context.movementRemaining - cost) }
    }),
    useExtraAttack: assign(({ context }) => {
      if (context.extraAttacksRemaining <= 0) return {}
      return { extraAttacksRemaining: context.extraAttacksRemaining - 1 }
    }),
    standFromProne: assign(({ context }) => {
      const result = spendHalfSpeed(context.movementRemaining, context.effectiveSpeed)
      if (!result.success || !context.prone) return {}
      return { movementRemaining: movementFeet(result.newMovementRemaining), prone: false }
    }),
    dropProne: assign({ prone: true }),
    endSurprise: assign({ reactionAvailable: true, surprised: false }),
    markBonusActionSpell: assign({ bonusActionSpellCast: true }),
    markNonCantripActionSpell: assign({ nonCantripActionSpellCast: true })
  }
}).createMachine({
  id: "dnd",
  type: "parallel",
  context: ({ input }) => ({
    ...INITIAL_CONDITIONS,
    ...INITIAL_TURN_STATE,
    deathSaves: DEATH_SAVES_RESET,
    effectiveSpeed: movementFeet(0),
    exhaustion: 0 as ExhaustionLevel,
    hp: hp(input.maxHp),
    incapacitatedSources: new Set<IncapSource>(),
    maxHp: hp(input.maxHp),
    movementRemaining: movementFeet(0),
    tempHp: tempHp(0)
  }),
  on: {
    ADD_EXHAUSTION: { actions: ["addExhaustion"] },
    REDUCE_EXHAUSTION: { actions: ["reduceExhaustion"] }
  },
  states: {
    damageTrack: {
      initial: "conscious",
      states: {
        conscious: {
          always: { guard: "exhaustionDeath", target: "#dnd.damageTrack.dead" },
          on: {
            TAKE_DAMAGE: [
              { guard: "instantDeathFromConscious", target: "#dnd.damageTrack.dead", actions: ["applyDamage"] },
              { guard: "dropsToZeroHp", target: "#dnd.damageTrack.dying", actions: ["applyDamage", "setUnconscious"] },
              { actions: ["applyDamage"] }
            ],
            HEAL: { actions: ["applyHeal"] },
            GRANT_TEMP_HP: { actions: ["applyTempHp"] },
            KNOCK_OUT: { target: "#dnd.damageTrack.dying.stable", actions: ["applyKnockOut", "setUnconscious"] }
          }
        },
        dying: {
          initial: "unstable",
          always: { guard: "exhaustionDeath", target: "#dnd.damageTrack.dead" },
          on: {
            HEAL: { target: "#dnd.damageTrack.conscious", actions: ["applyHealFromZero", "clearUnconscious"] },
            GRANT_TEMP_HP: { actions: ["applyTempHp"] }
          },
          states: {
            unstable: {
              on: {
                TAKE_DAMAGE: [
                  { guard: "noDamageThrough", actions: ["absorbTempHpOnly"] },
                  { guard: "instantDeathFromDying", target: "#dnd.damageTrack.dead", actions: ["absorbTempHpOnly"] },
                  {
                    guard: "deathFromDamageFailures",
                    target: "#dnd.damageTrack.dead",
                    actions: ["applyDamageAtZeroHp"]
                  },
                  { actions: ["applyDamageAtZeroHp"] }
                ],
                DEATH_SAVE: [
                  {
                    guard: "deathSaveRegainsConsciousness",
                    target: "#dnd.damageTrack.conscious",
                    actions: ["applyDeathSave", "clearUnconscious"]
                  },
                  { guard: "deathSaveStabilizes", target: "stable", actions: ["applyDeathSave"] },
                  { guard: "deathSaveDies", target: "#dnd.damageTrack.dead", actions: ["applyDeathSave"] },
                  { actions: ["applyDeathSave"] }
                ],
                STABILIZE: { target: "stable", actions: ["applyStabilize"] }
              }
            },
            stable: {
              on: {
                TAKE_DAMAGE: [
                  { guard: "noDamageThrough", actions: ["absorbTempHpOnly"] },
                  { guard: "instantDeathFromDying", target: "#dnd.damageTrack.dead", actions: ["absorbTempHpOnly"] },
                  {
                    guard: "deathFromDamageFailures",
                    target: "#dnd.damageTrack.dead",
                    actions: ["applyDamageAtZeroHp"]
                  },
                  { target: "unstable", actions: ["applyDamageAtZeroHp"] }
                ]
              }
            }
          }
        },
        dead: {}
      }
    },
    conditionTrack: {
      initial: "tracking",
      states: {
        tracking: {
          on: {
            APPLY_CONDITION: { actions: ["applyCondition"] },
            REMOVE_CONDITION: { actions: ["removeCondition"] }
          }
        }
      }
    },
    turnPhase: {
      initial: "outOfCombat",
      states: {
        outOfCombat: {
          on: {
            START_TURN: [
              { guard: "isSurprised", target: "surprised", actions: ["initTurn"] },
              { target: "acting", actions: ["initTurn"] }
            ]
          }
        },
        acting: {
          on: {
            START_TURN: [
              { guard: "isSurprised", target: "surprised", actions: ["initTurn"] },
              { target: "acting", actions: ["initTurn"] }
            ],
            USE_ACTION: { actions: ["useAction"] },
            USE_BONUS_ACTION: { actions: ["useBonusAction"] },
            USE_REACTION: { actions: ["useReaction"] },
            USE_MOVEMENT: { actions: ["useMovement"] },
            USE_EXTRA_ATTACK: { actions: ["useExtraAttack"] },
            STAND_FROM_PRONE: { guard: "canStandFromProne", actions: ["standFromProne"] },
            DROP_PRONE: { actions: ["dropProne"] },
            MARK_BONUS_ACTION_SPELL: { actions: ["markBonusActionSpell"] },
            MARK_NON_CANTRIP_ACTION_SPELL: { actions: ["markNonCantripActionSpell"] }
          }
        },
        surprised: {
          on: {
            END_SURPRISE_TURN: { target: "outOfCombat", actions: ["endSurprise"] },
            START_TURN: [
              { guard: "isSurprised", target: "surprised", actions: ["initTurn"] },
              { target: "acting", actions: ["initTurn"] }
            ]
          }
        }
      }
    }
  }
})

export type DndSnapshot = SnapshotFrom<typeof dndMachine>
