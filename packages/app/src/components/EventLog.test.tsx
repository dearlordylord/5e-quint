// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EventLog } from "./EventLog.tsx"

describe("EventLog", () => {
  it("renders the empty state", () => {
    render(<EventLog cursor={0} entries={[]} onJumpTo={vi.fn()} />)

    expect(screen.getByText("No events yet")).toBeTruthy()
  })

  it("marks past, current, and future entries and supports jumping", () => {
    const onJumpTo = vi.fn()
    const scrollTo = vi.fn()
    const windowScrollTo = vi.fn()
    let rowTop = 120
    let visibleTop = 0
    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get() {
        return this instanceof HTMLTableRowElement ? rowTop : 0
      }
    })
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this instanceof HTMLTableRowElement ? 20 : 0
      }
    })
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this instanceof HTMLDivElement ? 100 : 0
      }
    })
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      get() {
        return this instanceof HTMLDivElement ? visibleTop : 0
      }
    })
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo
    })
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: windowScrollTo
    })

    const view = render(
      <EventLog
        cursor={1}
        entries={[{ label: "Started", detail: "Round one" }, { label: "Current" }, { label: "Future", detail: "" }]}
        onJumpTo={onJumpTo}
      />
    )

    expect(scrollTo).toHaveBeenCalledWith({ top: 40 })
    expect(windowScrollTo).not.toHaveBeenCalled()
    expect(screen.getByText("Current").closest("tr")?.textContent).toContain(">")
    expect(screen.getByText("Future").closest("tr")?.className).toContain("opacity-35")

    fireEvent.click(screen.getByText("Started"))
    expect(onJumpTo).toHaveBeenCalledWith(0)

    rowTop = 20
    visibleTop = 50
    view.rerender(
      <EventLog
        cursor={0}
        entries={[{ label: "Started", detail: "Round one" }, { label: "Current" }, { label: "Future", detail: "" }]}
        onJumpTo={onJumpTo}
      />
    )
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 20 })

    rowTop = 20
    visibleTop = 0
    view.rerender(
      <EventLog
        cursor={1}
        entries={[{ label: "Started", detail: "Round one" }, { label: "Current" }, { label: "Future", detail: "" }]}
        onJumpTo={onJumpTo}
      />
    )
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 20 })
  })
})
