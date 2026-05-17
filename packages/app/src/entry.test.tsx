// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { RootApp } from "./entry.tsx"

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
    throw new Error(`Unexpected page console error: ${args.map(String).join(" ")}`)
  })
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

describe("RootApp route boot", () => {
  it("renders the character creation route without page errors", () => {
    render(<RootApp path="/character" />)

    expect(screen.getByText("Character Creation Workflow")).toBeTruthy()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it("renders the battle route without page errors", () => {
    render(<RootApp path="/battle" />)

    expect(screen.getByText("Battle Visualizer")).toBeTruthy()
    expect(screen.getAllByText("Laser Wizard").length).toBeGreaterThan(0)
    expect(screen.getByText("Battle joined")).toBeTruthy()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
