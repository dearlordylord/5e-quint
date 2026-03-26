import { describe, expect, it } from "vitest"

import {
  canExecuteActionSurge,
  canExecuteSecondWind,
  executeActionSurge,
  executeSecondWind
} from "#/features/feature-bridge.ts"
import type { FeatureState } from "#/features/feature-store.ts"
import type { DndContext } from "#/machine-types.ts"
import { DEATH_SAVES_RESET, EMPTY_SLOTS, exhaustionLevel, hp, movementFeet, tempHp } from "#/types.ts"

function makeFighterState(charges: number, max: number = 3): FeatureState {
  return {
    fighter: {
      secondWindCharges: charges,
      secondWindMax: max,
      actionSurgeCharges: 1,
      actionSurgeMax: 1,
      actionSurgeUsedThisTurn: false
    }
  }
}

function makeFighterStateWithSurge(
  actionSurgeCharges: number,
  actionSurgeUsedThisTurn: boolean,
  actionSurgeMax: number = 1
): FeatureState {
  return {
    fighter: {
      secondWindCharges: 3,
      secondWindMax: 3,
      actionSurgeCharges,
      actionSurgeMax,
      actionSurgeUsedThisTurn
    }
  }
}

function makeCtx(overrides: Partial<DndContext> = {}): DndContext {
  return {
    hp: hp(10),
    maxHp: hp(20),
    tempHp: tempHp(0),
    deathSaves: DEATH_SAVES_RESET,
    stable: false,
    dead: false,
    inCombat: false,
    exhaustion: exhaustionLevel(0),
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
    unconscious: false,
    incapacitatedSources: new Set(),
    movementRemaining: movementFeet(30),
    effectiveSpeed: movementFeet(30),
    actionsRemaining: 1,
    attackActionUsed: false,
    bonusActionUsed: false,
    reactionAvailable: true,
    freeInteractionUsed: false,
    extraAttacksRemaining: 1,
    disengaged: false,
    dodging: false,
    readiedAction: false,
    bonusActionSpellCast: false,
    nonCantripActionSpellCast: false,
    slotsMax: EMPTY_SLOTS,
    slotsCurrent: EMPTY_SLOTS,
    pactSlotsMax: 0,
    pactSlotsCurrent: 0,
    pactSlotLevel: 0,
    concentrationSpellId: "",
    hitDiceRemaining: 5,
    activeEffects: [],
    ...overrides
  }
}

describe("canExecuteSecondWind", () => {
  it("returns true when charges > 0 and bonus action available", () => {
    expect(canExecuteSecondWind(makeFighterState(2), makeCtx())).toBe(true)
  })

  it("returns false when charges = 0", () => {
    expect(canExecuteSecondWind(makeFighterState(0), makeCtx())).toBe(false)
  })

  it("returns false when bonus action used", () => {
    expect(canExecuteSecondWind(makeFighterState(2), makeCtx({ bonusActionUsed: true }))).toBe(false)
  })

  it("returns false for non-fighter state", () => {
    expect(canExecuteSecondWind({}, makeCtx())).toBe(false)
  })
})

describe("executeSecondWind", () => {
  it("returns correct HEAL amount (d10 + fighter level)", () => {
    const result = executeSecondWind(makeFighterState(2), makeCtx(), 7, 5)
    // healAmount = d10Roll(7) + fighterLevel(5) = 12
    const healEvent = result.machineEvents.find((e) => e.type === "HEAL")
    expect(healEvent).toBeDefined()
    expect(healEvent!.type).toBe("HEAL")
    expect(Number((healEvent as Extract<typeof healEvent, { type: "HEAL" }>).amount)).toBe(12)
  })

  it("returns USE_BONUS_ACTION + HEAL events", () => {
    const result = executeSecondWind(makeFighterState(2), makeCtx(), 5, 5)
    expect(result.machineEvents).toHaveLength(2)
    expect(result.machineEvents[0].type).toBe("USE_BONUS_ACTION")
    expect(result.machineEvents[1].type).toBe("HEAL")
  })

  it("returns FIGHTER_USE_SECOND_WIND feature action", () => {
    const result = executeSecondWind(makeFighterState(2), makeCtx(), 5, 5)
    expect(result.featureAction).toEqual({ type: "FIGHTER_USE_SECOND_WIND" })
  })
})

describe("canExecuteActionSurge", () => {
  it("returns true when charges > 0 and not used this turn", () => {
    expect(canExecuteActionSurge(makeFighterStateWithSurge(1, false), makeCtx())).toBe(true)
  })

  it("returns false when charges = 0", () => {
    expect(canExecuteActionSurge(makeFighterStateWithSurge(0, false), makeCtx())).toBe(false)
  })

  it("returns false when used this turn", () => {
    expect(canExecuteActionSurge(makeFighterStateWithSurge(1, true), makeCtx())).toBe(false)
  })

  it("returns false for non-fighter state", () => {
    expect(canExecuteActionSurge({}, makeCtx())).toBe(false)
  })
})

describe("executeActionSurge", () => {
  it("returns GRANT_EXTRA_ACTION machine event", () => {
    const result = executeActionSurge(makeFighterStateWithSurge(1, false))
    expect(result.machineEvents).toHaveLength(1)
    expect(result.machineEvents[0].type).toBe("GRANT_EXTRA_ACTION")
  })

  it("returns FIGHTER_USE_ACTION_SURGE feature action", () => {
    const result = executeActionSurge(makeFighterStateWithSurge(1, false))
    expect(result.featureAction).toEqual({ type: "FIGHTER_USE_ACTION_SURGE" })
  })
})
