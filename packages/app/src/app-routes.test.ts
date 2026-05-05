import { describe, expect, test } from "vitest"

import { appRouteTarget } from "./app-routes.ts"

describe("app route boundary", () => {
  test("quarantines Core-backed trace visualizer routes", () => {
    expect(appRouteTarget("/trace")).toBe("promotedTracePlaceholder")
    expect(appRouteTarget("/embed/trace")).toBe("promotedTracePlaceholder")
  })

  test("selects promoted battle snapshots for active battle routes", () => {
    expect(appRouteTarget("/battle")).toBe("battle")
    expect(appRouteTarget("/battle/machine")).toBe("battle")
    expect(appRouteTarget("/battle/interrupts")).toBe("battle")
    expect(appRouteTarget("/embed/battle")).toBe("battle")
  })
})
