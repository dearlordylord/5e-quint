// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { CreatureLayout } from "./battle-scene-layout.ts"
import { CreatureToken } from "./CreatureToken.tsx"

afterEach(cleanup)

describe("CreatureToken", () => {
  it("renders the complete token presentation vocabulary", () => {
    const variants: ReadonlyArray<CreatureLayout> = [
      layout({
        castBar: bar("#a78bfa"),
        castingGlow: true,
        floatingLabel: "Casting",
        labelTone: "positive",
        slotJustSpent: true,
        slotRows: [{ filled: 1, level: 3, total: 2, x: 1, y: 2 }],
        sprite: sprite()
      }),
      layout({
        deathSaves: { failures: 1, successes: 2, x: 1, y: 2 },
        floatingLabel: "Down",
        isReacting: true,
        justBecameUnconscious: true,
        sprite: null,
        tempHpBar: bar("#60a5fa"),
        unconscious: true
      }),
      layout({ damageFlash: true, isActive: true, sprite: sprite({ scale: 2 }) }),
      layout({ sprite: null })
    ]

    const { container, rerender } = render(
      <svg>
        <CreatureToken {...variants[0]} />
      </svg>
    )
    for (const variant of variants.slice(1)) {
      rerender(
        <svg>
          <CreatureToken {...variant} />
        </svg>
      )
    }

    expect(container.querySelector("circle")).toBeTruthy()
    expect(container.textContent).toContain("Wizard")
  })
})

function bar(color: string): CreatureLayout["hpBar"] {
  return {
    color,
    fillWidth: 5,
    height: 2,
    totalWidth: 10,
    x: 1,
    y: 2
  }
}

function sprite(overrides: { readonly scale?: number } = {}) {
  return {
    h: 32,
    imgH: 96,
    imgW: 192,
    url: "/synthetic.png",
    w: 32,
    x: 0,
    y: 0,
    ...overrides
  }
}

function layout(overrides: Partial<CreatureLayout>): CreatureLayout {
  return {
    castBar: null,
    castingGlow: false,
    cx: 20,
    cy: 20,
    damageFlash: false,
    deathSaves: null,
    floatingLabel: null,
    hpBar: bar("#22c55e"),
    id: "wizard",
    isActive: false,
    isReacting: false,
    justBecameUnconscious: false,
    label: "Wizard",
    labelTone: "negative",
    labelY: 50,
    opacity: 1,
    slotJustSpent: false,
    slotRows: [],
    sprite: null,
    teamColor: "#3b82f6",
    tempHpBar: null,
    tokenRadius: 10,
    unconscious: false,
    ...overrides
  }
}
