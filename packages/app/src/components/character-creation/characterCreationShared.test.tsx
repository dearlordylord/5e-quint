// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { displayValue, JsonEditor, titleCase } from "./characterCreationShared.tsx"

describe("character-creation display helpers", () => {
  it("formats domain collections and labels", () => {
    expect(displayValue({ map: new Map([["a", 1]]), set: new Set(["b"]) })).toBe(
      '{\n  "map": {\n    "a": 1\n  },\n  "set": [\n    "b"\n  ]\n}'
    )
    expect(titleCase("classFeature_choice")).toBe("Class Feature Choice")
  })

  it("parses editor changes, clears blank input, reports invalid JSON, and follows new values", () => {
    const onChange = vi.fn()
    const { rerender } = render(<JsonEditor label="Facts" onChange={onChange} value={{ ready: true }} />)
    const editor = screen.getByRole("textbox", { name: "Facts" })

    fireEvent.change(editor, { target: { value: '{"count":2}' } })
    expect(onChange).toHaveBeenLastCalledWith({ count: 2 })

    fireEvent.change(editor, { target: { value: "{" } })
    expect(screen.getByText(/Unexpected end of JSON input|Expected property name/i)).toBeTruthy()

    fireEvent.change(editor, { target: { value: " " } })
    expect(onChange).toHaveBeenLastCalledWith(undefined)

    rerender(<JsonEditor label="Facts" onChange={onChange} value={null} />)
    expect(editor).toHaveProperty("value", "")
  })
})
