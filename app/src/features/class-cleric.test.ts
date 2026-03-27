import { describe, expect, it } from "vitest"

import { channelDivinityMax, clericChannelDivinityMax } from "#/features/class-cleric.ts"

describe("clericChannelDivinityMax", () => {
  it("returns 0 below L2", () => {
    expect(clericChannelDivinityMax(1)).toBe(0)
  })
  it("returns 2 at L2-5", () => {
    expect(clericChannelDivinityMax(2)).toBe(2)
    expect(clericChannelDivinityMax(5)).toBe(2)
  })
  it("returns 3 at L6-17", () => {
    expect(clericChannelDivinityMax(6)).toBe(3)
    expect(clericChannelDivinityMax(17)).toBe(3)
  })
  it("returns 4 at L18+", () => {
    expect(clericChannelDivinityMax(18)).toBe(4)
  })
})

describe("channelDivinityMax", () => {
  it("sums cleric and paladin pools", () => {
    expect(channelDivinityMax({ clericLevel: 6, paladinLevel: 3 })).toBe(5)
  })
  it("returns 0 for non-CD classes", () => {
    expect(channelDivinityMax({ clericLevel: 0, paladinLevel: 0 })).toBe(0)
  })
  it("works for single-class cleric", () => {
    expect(channelDivinityMax({ clericLevel: 18, paladinLevel: 0 })).toBe(4)
  })
  it("works for single-class paladin", () => {
    expect(channelDivinityMax({ clericLevel: 0, paladinLevel: 11 })).toBe(3)
  })
})
