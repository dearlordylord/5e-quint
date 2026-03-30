import { describe, expect, it } from "vitest"

import { foresightActive, mindSpikeDamage } from "#/features/spell-divination.ts"

describe("Foresight", () => {
  it("grants advantage on all tests and disadvantage on attacks against", () => {
    const effect = foresightActive()
    expect(effect.advantageOnAllTests).toBe(true)
    expect(effect.attackDisadvantage).toBe(true)
  })
})

describe("Mind Spike", () => {
  it("3d8 at L2", () => {
    expect(mindSpikeDamage(2)).toEqual({ dice: 3, dieSize: 8 })
  })

  it("scales +1d8 per slot above 2", () => {
    expect(mindSpikeDamage(3)).toEqual({ dice: 4, dieSize: 8 })
    expect(mindSpikeDamage(5)).toEqual({ dice: 6, dieSize: 8 })
  })
})
