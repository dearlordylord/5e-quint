import type { SnapshotFrom } from "xstate"
import { assign, setup } from "xstate"

import {
  addDeathFailures,
  applyConditionUpdate,
  computeAddExhaustion,
  computeTakeDamage,
  removeConditionUpdate,
  resolveDeathSave
} from "#/machine-helpers.ts"
import type {
  Condition,
  D20Roll,
  DamageType,
  DeathSaves,
  ExhaustionLevel,
  HealAmount,
  HP,
  IncapSource,
  TempHP
} from "#/types.ts"
import { DEATH_SAVES_RESET, deathSaveCount, exhaustionLevel, hp, tempHp } from "#/types.ts"

// --- Context ---

export interface DndContext {
  readonly hp: HP
  readonly maxHp: HP
  readonly tempHp: TempHP
  readonly deathSaves: DeathSaves
  readonly exhaustion: ExhaustionLevel
  readonly blinded: boolean
  readonly charmed: boolean
  readonly deafened: boolean
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
  readonly incapacitatedSources: ReadonlySet<IncapSource>
}

// --- Events ---

export type DndEvent =
  | {
      readonly type: "TAKE_DAMAGE"
      readonly amount: number
      readonly damageType: DamageType
      readonly resistances: ReadonlySet<DamageType>
      readonly vulnerabilities: ReadonlySet<DamageType>
      readonly immunities: ReadonlySet<DamageType>
      readonly isCritical: boolean
    }
  | { readonly type: "HEAL"; readonly amount: HealAmount }
  | { readonly type: "GRANT_TEMP_HP"; readonly amount: TempHP; readonly keepOld: boolean }
  | { readonly type: "DEATH_SAVE"; readonly d20Roll: D20Roll }
  | { readonly type: "STABILIZE" }
  | { readonly type: "KNOCK_OUT" }
  | { readonly type: "APPLY_CONDITION"; readonly condition: Condition }
  | { readonly type: "REMOVE_CONDITION"; readonly condition: Condition }
  | { readonly type: "ADD_EXHAUSTION"; readonly levels: number }
  | { readonly type: "REDUCE_EXHAUSTION"; readonly levels: number }

// --- Event extractors ---

type TakeDamageEvent = Extract<DndEvent, { readonly type: "TAKE_DAMAGE" }>
type HealEvent = Extract<DndEvent, { readonly type: "HEAL" }>
type GrantTempHpEvent = Extract<DndEvent, { readonly type: "GRANT_TEMP_HP" }>
type DeathSaveEvent = Extract<DndEvent, { readonly type: "DEATH_SAVE" }>
type ConditionEvent = Extract<DndEvent, { readonly type: "APPLY_CONDITION" | "REMOVE_CONDITION" }>
type ExhaustionEvent = Extract<DndEvent, { readonly type: "ADD_EXHAUSTION" | "REDUCE_EXHAUSTION" }>

function asTakeDamage(event: DndEvent): TakeDamageEvent {
  return event as TakeDamageEvent
}
function asHeal(event: DndEvent): HealEvent {
  return event as HealEvent
}
function asGrantTempHp(event: DndEvent): GrantTempHpEvent {
  return event as GrantTempHpEvent
}
function asDeathSave(event: DndEvent): DeathSaveEvent {
  return event as DeathSaveEvent
}
function asCondition(event: DndEvent): ConditionEvent {
  return event as ConditionEvent
}
function asExhaustion(event: DndEvent): ExhaustionEvent {
  return event as ExhaustionEvent
}

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
  const e = asDeathSave(event)
  return resolveDeathSave(e.d20Roll, context.deathSaves.successes, context.deathSaves.failures)
}

function addIncapSource(sources: ReadonlySet<IncapSource>, source: IncapSource): ReadonlySet<IncapSource> {
  return new Set([...sources, source])
}

function removeIncapSource(sources: ReadonlySet<IncapSource>, source: IncapSource): ReadonlySet<IncapSource> {
  return new Set([...sources].filter((s) => s !== source))
}

// --- Condition flags for initial context ---

const INITIAL_CONDITIONS = {
  blinded: false,
  charmed: false,
  deafened: false,
  frightened: false,
  grappled: false,
  invisible: false,
  paralyzed: false,
  petrified: false,
  poisoned: false,
  prone: false,
  restrained: false,
  stunned: false,
  unconscious: false
} as const

// --- Machine ---

// XState v5 type inference requires `{} as T` pattern for types property
/* eslint-disable @typescript-eslint/consistent-type-assertions */
const machineTypes = { context: {} as DndContext, events: {} as DndEvent, input: {} as { readonly maxHp: number } }
/* eslint-enable @typescript-eslint/consistent-type-assertions */

export const dndMachine = setup({
  types: machineTypes,
  guards: {
    // TAKE_DAMAGE guards (conscious)
    instantDeathFromConscious: ({ context, event }) => {
      const r = dmgResult(context, event)
      return r.dmgThrough > 0 && r.newHp === 0 && r.overflow >= r.effMax
    },
    dropsToZeroHp: ({ context, event }) => {
      const r = dmgResult(context, event)
      return r.dmgThrough > 0 && r.newHp === 0 && r.overflow < r.effMax
    },

    // TAKE_DAMAGE guards (dying)
    noDamageThrough: ({ context, event }) => dmgResult(context, event).dmgThrough === 0,
    instantDeathFromDying: ({ context, event }) => {
      const r = dmgResult(context, event)
      return r.dmgThrough > 0 && r.dmgThrough >= r.effMax
    },
    deathFromDamageFailures: ({ context, event }) => {
      const e = asTakeDamage(event)
      const r = dmgResult(context, event)
      if (r.dmgThrough === 0) return false
      return addDeathFailures(context.deathSaves.failures, e.isCritical).isDead
    },

    // DEATH_SAVE guards
    deathSaveRegainsConsciousness: ({ context, event }) => deathSaveResult(context, event).regainsConsciousness,
    deathSaveStabilizes: ({ context, event }) => deathSaveResult(context, event).isStabilized,
    deathSaveDies: ({ context, event }) => deathSaveResult(context, event).isDead,

    // Exhaustion death guard (for always transitions)
    exhaustionDeath: ({ context }) => context.exhaustion >= EXHAUSTION_DEATH_THRESHOLD
  },
  actions: {
    // TAKE_DAMAGE actions
    applyDamage: assign(({ context, event }) => {
      const r = dmgResult(context, event)
      return { hp: hp(r.newHp), tempHp: tempHp(r.newTempHp) }
    }),
    absorbTempHpOnly: assign(({ context, event }) => {
      const r = dmgResult(context, event)
      return { tempHp: tempHp(r.newTempHp) }
    }),
    applyDamageAtZeroHp: assign(({ context, event }) => {
      const e = asTakeDamage(event)
      const r = dmgResult(context, event)
      const { newFailures } = addDeathFailures(context.deathSaves.failures, e.isCritical)
      return {
        deathSaves: { successes: context.deathSaves.successes, failures: deathSaveCount(newFailures) },
        tempHp: tempHp(r.newTempHp)
      }
    }),

    // DEATH_SAVE actions
    applyDeathSave: assign(({ context, event }) => {
      const r = deathSaveResult(context, event)
      if (r.regainsConsciousness) {
        return { deathSaves: DEATH_SAVES_RESET, hp: hp(1) }
      }
      if (r.isStabilized) {
        return { deathSaves: DEATH_SAVES_RESET }
      }
      return {
        deathSaves: { successes: deathSaveCount(r.newSuccesses), failures: deathSaveCount(r.newFailures) }
      }
    }),

    // HEAL actions
    applyHeal: assign(({ context, event }) => {
      const e = asHeal(event)
      const newHp = Math.min(context.hp + e.amount, context.maxHp)
      return { hp: hp(newHp) }
    }),
    applyHealFromZero: assign(({ context, event }) => {
      const e = asHeal(event)
      const newHp = Math.min(e.amount, context.maxHp)
      return { deathSaves: DEATH_SAVES_RESET, hp: hp(newHp) }
    }),

    // GRANT_TEMP_HP
    applyTempHp: assign(({ event }) => {
      const e = asGrantTempHp(event)
      if (e.keepOld) return {}
      return { tempHp: e.amount }
    }),

    // KNOCK_OUT
    applyKnockOut: assign({
      deathSaves: DEATH_SAVES_RESET,
      hp: hp(0)
    }),

    // STABILIZE
    applyStabilize: assign({ deathSaves: DEATH_SAVES_RESET }),

    // Unconscious state wiring (cross-region: damageTrack ↔ conditionTrack)
    setUnconscious: assign(({ context }) => ({
      unconscious: true,
      prone: true,
      incapacitatedSources: addIncapSource(context.incapacitatedSources, "unconscious")
    })),
    clearUnconscious: assign(({ context }) => ({
      unconscious: false,
      incapacitatedSources: removeIncapSource(context.incapacitatedSources, "unconscious")
    })),

    // APPLY_CONDITION / REMOVE_CONDITION
    applyCondition: assign(({ context, event }) => {
      const e = asCondition(event)
      const update = applyConditionUpdate(e.condition, context.incapacitatedSources, context.petrified)
      return { ...update.conditionFlags, incapacitatedSources: update.incapSources }
    }),
    removeCondition: assign(({ context, event }) => {
      const e = asCondition(event)
      const update = removeConditionUpdate(e.condition, context.incapacitatedSources)
      return { ...update.conditionFlags, incapacitatedSources: update.incapSources }
    }),

    // ADD_EXHAUSTION / REDUCE_EXHAUSTION
    addExhaustion: assign(({ context, event }) => {
      const e = asExhaustion(event)
      const result = computeAddExhaustion(context.exhaustion, e.levels, context.hp, context.maxHp)
      return { exhaustion: exhaustionLevel(result.newExhaustion), hp: hp(result.newHp) }
    }),
    reduceExhaustion: assign(({ context, event }) => {
      const e = asExhaustion(event)
      const newLevel = Math.max(0, context.exhaustion - e.levels)
      return { exhaustion: exhaustionLevel(newLevel) }
    })
  }
}).createMachine({
  id: "dnd",
  type: "parallel",
  context: ({ input }) => ({
    ...INITIAL_CONDITIONS,
    deathSaves: DEATH_SAVES_RESET,
    exhaustion: 0 as ExhaustionLevel,
    hp: hp(input.maxHp),
    incapacitatedSources: new Set<IncapSource>(),
    maxHp: hp(input.maxHp),
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
              {
                guard: "dropsToZeroHp",
                target: "#dnd.damageTrack.dying",
                actions: ["applyDamage", "setUnconscious"]
              },
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
            HEAL: {
              target: "#dnd.damageTrack.conscious",
              actions: ["applyHealFromZero", "clearUnconscious"]
            },
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
                  {
                    guard: "deathSaveStabilizes",
                    target: "stable",
                    actions: ["applyDeathSave"]
                  },
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
    }
  }
})

// --- Snapshot type export ---

export type DndSnapshot = SnapshotFrom<typeof dndMachine>
