// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
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

  it("renders the home route and its navigation", () => {
    render(<RootApp path="/" />)

    expect(screen.getByText("D&D 5e SRD Character Tools")).toBeTruthy()
    expect(screen.getByRole("link", { name: "MCP Admin Mirror" })).toHaveProperty("pathname", "/admin")
  })

  it("renders the quarantined trace placeholder", () => {
    render(<RootApp path="/trace" />)

    expect(screen.getByText("Battle Runtime Trace Viewer Pending")).toBeTruthy()
  })

  it("boots into a document root when the browser entry element exists", async () => {
    document.body.innerHTML = '<div id="root"></div>'
    window.history.replaceState({}, "", "/")
    vi.resetModules()

    await act(async () => {
      await import("./entry.tsx")
    })

    expect(await screen.findByText("D&D 5e SRD Character Tools")).toBeTruthy()
  })
})
