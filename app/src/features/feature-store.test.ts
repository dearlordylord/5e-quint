import { describe, expect, it } from "vitest"

import {
  createInitialFeatureState,
  type FeatureConfig,
  featureReducer,
  type FeatureState
} from "#/features/feature-store.ts"

const fighterL5: FeatureConfig = { className: "fighter", level: 5 }
const wizardL5: FeatureConfig = { className: "wizard", level: 5 }

describe("createInitialFeatureState", () => {
  it("returns correct charges for fighter L5", () => {
    const state = createInitialFeatureState(fighterL5)
    expect(state.fighter).toBeDefined()
    expect(state.fighter!.secondWindCharges).toBe(3) // levels 4-9 get 3
    expect(state.fighter!.secondWindMax).toBe(3)
  })

  it("returns empty state for non-fighter", () => {
    const state = createInitialFeatureState(wizardL5)
    expect(state.fighter).toBeUndefined()
  })
})

describe("featureReducer", () => {
  const initial = createInitialFeatureState(fighterL5)

  it("FIGHTER_USE_SECOND_WIND decrements charges", () => {
    const next = featureReducer(initial, { type: "FIGHTER_USE_SECOND_WIND" }, fighterL5)
    expect(next.fighter!.secondWindCharges).toBe(2)
  })

  it("NOTIFY_SHORT_REST restores 1 charge", () => {
    // Start with 1 charge used
    const used = featureReducer(initial, { type: "FIGHTER_USE_SECOND_WIND" }, fighterL5)
    expect(used.fighter!.secondWindCharges).toBe(2)
    const rested = featureReducer(used, { type: "NOTIFY_SHORT_REST" }, fighterL5)
    expect(rested.fighter!.secondWindCharges).toBe(3)
  })

  it("NOTIFY_SHORT_REST does not exceed max", () => {
    const rested = featureReducer(initial, { type: "NOTIFY_SHORT_REST" }, fighterL5)
    expect(rested.fighter!.secondWindCharges).toBe(3)
  })

  it("NOTIFY_LONG_REST restores all charges", () => {
    // Use all charges
    let state: FeatureState = initial
    state = featureReducer(state, { type: "FIGHTER_USE_SECOND_WIND" }, fighterL5)
    state = featureReducer(state, { type: "FIGHTER_USE_SECOND_WIND" }, fighterL5)
    state = featureReducer(state, { type: "FIGHTER_USE_SECOND_WIND" }, fighterL5)
    expect(state.fighter!.secondWindCharges).toBe(0)
    const rested = featureReducer(state, { type: "NOTIFY_LONG_REST" }, fighterL5)
    expect(rested.fighter!.secondWindCharges).toBe(3)
  })

  it("RESET returns initial state", () => {
    const used = featureReducer(initial, { type: "FIGHTER_USE_SECOND_WIND" }, fighterL5)
    const reset = featureReducer(used, { type: "RESET" }, fighterL5)
    expect(reset.fighter!.secondWindCharges).toBe(3)
    expect(reset.fighter!.secondWindMax).toBe(3)
  })

  it("non-fighter state is unaffected by actions", () => {
    const wizardState = createInitialFeatureState(wizardL5)
    const next = featureReducer(wizardState, { type: "FIGHTER_USE_SECOND_WIND" }, wizardL5)
    expect(next).toBe(wizardState)
  })

  it("NOTIFY_START_TURN resets actionSurgeUsedThisTurn", () => {
    const used = featureReducer(initial, { type: "FIGHTER_USE_ACTION_SURGE" }, fighterL5)
    expect(used.fighter!.actionSurgeUsedThisTurn).toBe(true)
    const next = featureReducer(used, { type: "NOTIFY_START_TURN" }, fighterL5)
    expect(next.fighter!.actionSurgeUsedThisTurn).toBe(false)
  })
})

describe("Action Surge feature store", () => {
  const fighterL5Config: FeatureConfig = { className: "fighter", level: 5 }
  const fighterL17Config: FeatureConfig = { className: "fighter", level: 17 }

  it("initial state has correct Action Surge charges for fighter L5", () => {
    const state = createInitialFeatureState(fighterL5Config)
    expect(state.fighter!.actionSurgeCharges).toBe(1)
    expect(state.fighter!.actionSurgeMax).toBe(1)
    expect(state.fighter!.actionSurgeUsedThisTurn).toBe(false)
  })

  it("L17 fighter gets 2 Action Surge charges", () => {
    const state = createInitialFeatureState(fighterL17Config)
    expect(state.fighter!.actionSurgeCharges).toBe(2)
    expect(state.fighter!.actionSurgeMax).toBe(2)
  })

  it("FIGHTER_USE_ACTION_SURGE decrements charges and sets usedThisTurn", () => {
    const initial = createInitialFeatureState(fighterL5Config)
    const next = featureReducer(initial, { type: "FIGHTER_USE_ACTION_SURGE" }, fighterL5Config)
    expect(next.fighter!.actionSurgeCharges).toBe(0)
    expect(next.fighter!.actionSurgeUsedThisTurn).toBe(true)
  })

  it("NOTIFY_SHORT_REST restores Action Surge charges", () => {
    const initial = createInitialFeatureState(fighterL5Config)
    const used = featureReducer(initial, { type: "FIGHTER_USE_ACTION_SURGE" }, fighterL5Config)
    expect(used.fighter!.actionSurgeCharges).toBe(0)
    const rested = featureReducer(used, { type: "NOTIFY_SHORT_REST" }, fighterL5Config)
    expect(rested.fighter!.actionSurgeCharges).toBe(1)
  })

  it("NOTIFY_LONG_REST restores Action Surge charges", () => {
    const initial = createInitialFeatureState(fighterL5Config)
    const used = featureReducer(initial, { type: "FIGHTER_USE_ACTION_SURGE" }, fighterL5Config)
    const rested = featureReducer(used, { type: "NOTIFY_LONG_REST" }, fighterL5Config)
    expect(rested.fighter!.actionSurgeCharges).toBe(1)
  })
})
