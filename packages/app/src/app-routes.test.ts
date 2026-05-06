import { describe, expect, test } from "vitest"

import { appRouteTarget } from "./app-routes.ts"

describe("app route boundary", () => {
  test("keeps promoted character creation as the active app workflow", () => {
    expect(appRouteTarget("/character")).toBe("character")
  })

  test("quarantines Core-backed trace visualizer routes", () => {
    expect(appRouteTarget("/trace")).toBe("tracePlaceholder")
    expect(appRouteTarget("/embed/trace")).toBe("tracePlaceholder")
  })

  test("selects battle-runtime snapshots for active battle routes", () => {
    expect(appRouteTarget("/battle")).toBe("battle")
    expect(appRouteTarget("/battle/machine")).toBe("battle")
    expect(appRouteTarget("/battle/interrupts")).toBe("battle")
    expect(appRouteTarget("/embed/battle")).toBe("battle")
  })

  test("routes removed Core-backed app surfaces home", () => {
    expect(appRouteTarget("/simulator")).toBe("home")
    expect(appRouteTarget("/machines")).toBe("home")
    expect(appRouteTarget("/machine-viz")).toBe("home")
  })
})
