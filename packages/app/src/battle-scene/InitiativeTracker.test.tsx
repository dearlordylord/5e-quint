// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { InitiativeCreatureSnapshot } from "./battle-scene-layout.ts"
import { InitiativeTracker } from "./InitiativeTracker.tsx"

afterEach(cleanup)

describe("InitiativeTracker", () => {
  it("presents active, reacting, unconscious, and dead combatants", () => {
    render(
      <InitiativeTracker
        round={3}
        creatures={[
          creature({
            id: "active",
            isActive: true,
            name: "Active Wizard",
            preparedSpells: ["counterspell", "magic_missile"],
            slotsByLevel: [{ current: 1, level: 1, max: 2 }]
          }),
          creature({
            id: "reacting",
            isReacting: true,
            name: "Reacting Wizard",
            reactionAvailable: false,
            team: "red"
          }),
          creature({ id: "unconscious", name: "Unconscious Wizard", unconscious: true }),
          creature({ dead: true, id: "dead", name: "Dead Wizard" }),
          creature({ id: "empty", name: "Empty Wizard", preparedSpells: [] })
        ]}
      />
    )

    expect(screen.getByText("Round 3")).toBeTruthy()
    expect(screen.getAllByTitle("Counterspell ready")).toHaveLength(3)
    expect(screen.getByRole("button", { name: /Active Wizard/ }).className).toContain("border-amber-500")
    expect(screen.getByRole("button", { name: /Reacting Wizard/ }).className).toContain("border-violet-500")
    expect(screen.getByRole("button", { name: /Unconscious Wizard/ }).className).toContain("opacity-50")
    expect(screen.getByRole("button", { name: /Dead Wizard/ }).className).toContain("opacity-30")

    fireEvent.click(screen.getByRole("button", { name: /Active Wizard/ }))
    expect(screen.getByText("magic missile")).toBeTruthy()
    expect(screen.getByText("L1")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Active Wizard/ }))
    expect(screen.queryByText("magic missile")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Reacting Wizard/ }))
    expect(screen.getByText("counterspell").className).toContain("line-through")

    fireEvent.click(screen.getByRole("button", { name: /Dead Wizard/ }))
    expect(screen.queryByText("magic missile")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Empty Wizard/ }))
    expect(screen.queryByText("magic missile")).toBeNull()
  })
})

function creature(
  overrides: Partial<InitiativeCreatureSnapshot> & Pick<InitiativeCreatureSnapshot, "id" | "name">
): InitiativeCreatureSnapshot {
  return {
    currentHp: 10,
    dead: false,
    isActive: false,
    isReacting: false,
    maxHp: 10,
    preparedSpells: ["counterspell"],
    reactionAvailable: true,
    slotsByLevel: [],
    team: "blue",
    unconscious: false,
    ...overrides
  }
}
