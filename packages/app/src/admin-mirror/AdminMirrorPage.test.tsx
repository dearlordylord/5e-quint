// @vitest-environment jsdom
import { battlePresentedCheckpointFrontierEnvelope } from "@dnd/battle-runtime"
import {
  type AdminMirrorPresentationTimelineEntry,
  AdminMirrorPresentationTimelineEntrySchema,
  type AdminMirrorSessionState,
  AdminMirrorSessionStateSchema
} from "@dnd/mcp/experimental-admin-mirror-contract"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Either, Schema } from "effect"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { WIZARD_BATTLE_DEMO_STEPS } from "../battle-scene/wizard-battle-demo.ts"
import {
  AdminMirrorPage,
  decodeMirrorSessionEvent,
  decodeMirrorSessionResponse,
  presentationTimelineTitle,
  selectMirrorSession
} from "./AdminMirrorPage.tsx"

const setSelectedSessionId = vi.fn()
const queryState = vi.hoisted((): { value: string | null } => ({ value: null }))

vi.mock("nuqs", () => ({
  parseAsString: {
    withOptions: () => ({})
  },
  useQueryState: () => [queryState.value, setSelectedSessionId]
}))

class TestEventSource extends EventTarget {
  static latest: TestEventSource | undefined
  readonly close = vi.fn()

  constructor(readonly url: string) {
    super()
    TestEventSource.latest = this
  }
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

beforeEach(() => {
  queryState.value = null
  setSelectedSessionId.mockClear()
  TestEventSource.latest = undefined
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("EventSource", TestEventSource)
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("AdminMirrorPage mirror boundary", () => {
  test("decodes valid mirror session responses", () => {
    const decoded = decodeMirrorSessionResponse({
      sessions: [rawSessionState({ sequence: 0 })]
    })

    expect(Either.isRight(decoded)).toBe(true)
  })

  test("rejects invalid mirror protocol values", () => {
    const decoded = decodeMirrorSessionResponse({
      sessions: [rawSessionState({ sequence: -1 })]
    })

    expect(Either.isLeft(decoded)).toBe(true)
  })

  test("rejects malformed mirror event JSON", () => {
    const decoded = decodeMirrorSessionEvent("{")

    expect(Either.isLeft(decoded)).toBe(true)
  })

  test("rejects valid JSON with an invalid mirror event shape", () => {
    const decoded = decodeMirrorSessionEvent(JSON.stringify({}))

    expect(Either.isLeft(decoded)).toBe(true)
  })

  test("decodes mirror session events", () => {
    const decoded = decodeMirrorSessionEvent(JSON.stringify(rawSessionState({ sequence: 2 })))

    expect(Either.isRight(decoded)).toBe(true)
  })

  test("does not replace a requested missing session with the newest session", () => {
    expect(selectMirrorSession([sessionState({ mirrorSessionId: "newest", sequence: 2 })], "live-demo")).toBeNull()
  })

  test("selects the newest retained session only when no session is requested", () => {
    const newest = sessionState({ mirrorSessionId: "newest", sequence: 2 })

    expect(selectMirrorSession([newest], null)).toBe(newest)
  })

  test("treats an empty retained collection entry as no selected session", () => {
    const sparseSessions = new Array<AdminMirrorSessionState>(1)

    expect(selectMirrorSession(sparseSessions, null)).toBeNull()
  })

  test("formats battle event titles without technical battle ids", () => {
    expect(
      presentationTimelineTitle({
        ...presentationTimelineEntry({ battleId: "battle:technical-id", battleRound: 1 }),
        currentActorDisplayName: "Orc Soldier Fighter 2",
        currentActorId: "fighter"
      })
    ).toBe("Round 1: Orc Soldier Fighter 2's turn")
  })

  test("uses action summaries as the primary event title", () => {
    expect(
      presentationTimelineTitle({
        ...presentationTimelineEntry({ battleId: "battle:technical-id", battleRound: 1 }),
        actionDetail: "Orc Soldier Fighter 2's Flail hit Skeleton.",
        actionSummary: "Orc Soldier Fighter 2 hits Skeleton with Flail"
      })
    ).toBe("Orc Soldier Fighter 2 hits Skeleton with Flail")
  })

  test("formats HP event titles as readable battle outcomes", () => {
    expect(
      presentationTimelineTitle({
        ...presentationTimelineEntry({ battleId: "battle:technical-id", battleRound: 1 }),
        hpChanges: [
          {
            combatantId: "skeleton-a",
            displayName: "Skeleton",
            maxHp: 13,
            nextHp: 5,
            previousHp: 13
          }
        ]
      })
    ).toBe("Skeleton took 8 damage")
  })

  test("formats every presentation event category", () => {
    const base = presentationTimelineEntry({})
    const hpChange = {
      combatantId: "wizard",
      displayName: "Wizard",
      maxHp: 10,
      nextHp: 10,
      previousHp: 5
    }

    expect(presentationTimelineTitle({ ...base, hpChanges: [hpChange] })).toBe("Wizard healed 5 HP")
    expect(presentationTimelineTitle({ ...base, hpChanges: [{ ...hpChange, previousHp: 10 }] })).toBe(
      "Wizard HP changed"
    )
    expect(presentationTimelineTitle({ ...base, hpChanges: [hpChange, hpChange] })).toBe("HP changed for 2 combatants")
    expect(presentationTimelineTitle({ ...base, battleId: "battle", currentActorId: "wizard" })).toBe("wizard's turn")
    expect(presentationTimelineTitle({ ...base, battleId: "battle" })).toBe("Battle updated")
    expect(presentationTimelineTitle({ ...base, characterCount: 1 })).toBe("Characters updated")
    expect(presentationTimelineTitle({ ...base, draftCount: 1 })).toBe("Drafts updated")
    expect(presentationTimelineTitle(base)).toBe("Session updated")
  })

  test("renders retained projection details and follows refresh and stream events", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ sessions: [rawDetailedSessionState()] })))

    const { unmount } = render(<AdminMirrorPage />)

    expect(await screen.findAllByText("battle:wizard-fireball-counterspell-demo")).toHaveLength(2)
    expect(screen.getByText("available")).toBeTruthy()
    expect(screen.getByText("inBattle")).toBeTruthy()
    expect(screen.getByText("multiple publishers")).toBeTruthy()
    await waitFor(() => expect(setSelectedSessionId).toHaveBeenCalledWith("demo"))

    const source = TestEventSource.latest
    expect(source?.url).toContain("/admin-projections/events")
    act(() => {
      source?.dispatchEvent(new Event("open"))
    })
    expect(await screen.findByText("streaming")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
    expect(await screen.findByText("streaming")).toBeTruthy()

    fireEvent.click(screen.getAllByRole("button", { name: "JSON" })[0])
    expect(screen.getByText("Derived Input")).toBeTruthy()
    const modalContent = screen.getByText("Derived Input")
    const modalBackdrop = modalContent.closest(".fixed")
    if (!(modalBackdrop instanceof HTMLElement)) throw new Error("Expected JSON modal backdrop.")
    fireEvent.mouseDown(modalContent)
    expect(screen.getByText("Derived Input")).toBeTruthy()
    fireEvent.keyDown(window, { key: "Enter" })
    expect(screen.getByText("Derived Input")).toBeTruthy()
    fireEvent.mouseDown(modalBackdrop)
    await waitFor(() => expect(screen.queryByText("Derived Input")).toBeNull())
    fireEvent.click(screen.getAllByRole("button", { name: "JSON" })[0])
    fireEvent.keyDown(window, { key: "Escape" })
    await waitFor(() => expect(screen.queryByText("Derived Input")).toBeNull())

    act(() => {
      source?.dispatchEvent(new MessageEvent("message", { data: "{" }))
    })
    expect(await screen.findByText("offline")).toBeTruthy()

    act(() => {
      source?.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify(rawSessionState({ mirrorSessionId: "streamed", sequence: 3 }))
        })
      )
    })
    expect(await screen.findAllByText("streamed")).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: "JSON" }))
    expect(screen.getByText("Event")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByText("Event")).toBeNull())

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    fireEvent.click(screen.getByRole("button", { name: /demo/ }))
    expect(setSelectedSessionId).toHaveBeenCalledWith("demo")

    act(() => {
      source?.dispatchEvent(new Event("error"))
    })
    expect(await screen.findByText("offline")).toBeTruthy()
    unmount()
    expect(source?.close).toHaveBeenCalledOnce()
  })

  test("shows empty, missing, and failed mirror states", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ sessions: [] }))
    render(<AdminMirrorPage />)

    expect(await screen.findByText("No mirror sessions.")).toBeTruthy()
    expect(screen.getByText("No session selected.")).toBeTruthy()

    cleanup()
    fetchMock.mockRejectedValueOnce(new Error("unavailable"))
    render(<AdminMirrorPage />)
    expect(await screen.findByText("offline")).toBeTruthy()
  })

  test("shows a requested session that is no longer retained", async () => {
    queryState.value = "missing"
    fetchMock.mockResolvedValue(jsonResponse({ sessions: [rawSessionState({ sequence: 1 })] }))
    render(<AdminMirrorPage />)

    expect(await screen.findByText("Session missing is not retained.")).toBeTruthy()
  })

  test("rejects unsuccessful and malformed refresh responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }))
    render(<AdminMirrorPage />)
    expect(await screen.findByText("offline")).toBeTruthy()

    cleanup()
    fetchMock.mockResolvedValueOnce(jsonResponse({ sessions: "invalid" }))
    render(<AdminMirrorPage />)
    expect(await screen.findByText("offline")).toBeTruthy()
  })

  test("renders an explicitly empty retained presentation timeline", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        sessions: [{ ...rawSessionState({ sequence: 1 }), presentationTimeline: [] }]
      })
    )
    render(<AdminMirrorPage />)

    expect(await screen.findByText("No presentation snapshots retained by this mirror.")).toBeTruthy()
  })

  test("uses the configured mirror URL", async () => {
    vi.stubEnv("VITE_ADMIN_MIRROR_URL", "http://configured-mirror.test")
    fetchMock.mockResolvedValue(jsonResponse({ sessions: [] }))

    render(<AdminMirrorPage />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("http://configured-mirror.test/admin-projections"))
    expect(TestEventSource.latest?.url).toBe("http://configured-mirror.test/admin-projections/events")
  })
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status: 200
  })
}

function sessionState(input: {
  readonly mirrorSessionId?: string
  readonly sequence: number
}): AdminMirrorSessionState {
  return Schema.decodeUnknownSync(AdminMirrorSessionStateSchema)(rawSessionState(input))
}

function rawSessionState(input: { readonly mirrorSessionId?: string; readonly sequence: number }) {
  const mirrorSessionId = input.mirrorSessionId ?? "demo"

  return {
    envelope: {
      mirrorSessionId,
      projection: {
        battle: null,
        characters: [],
        session: {
          battleState: { tag: "none" },
          draftIds: [],
          selectedStatBlockId: null
        }
      },
      publisherInstanceId: "publisher-a",
      sequence: input.sequence,
      sourceProcessId: 1
    },
    presentationTimeline: [
      {
        ...rawPresentationTimelineEntry({
          mirrorSessionId,
          sequence: input.sequence
        })
      }
    ],
    multiSource: false,
    receivedAtEpochMs: 1
  }
}

function rawDetailedSessionState() {
  const base = rawSessionState({ sequence: 1 })
  const battle = Either.getOrThrow(battlePresentedCheckpointFrontierEnvelope(WIZARD_BATTLE_DEMO_STEPS[0].session))
  const result = {
    ...base,
    envelope: {
      ...base.envelope,
      projection: {
        ...base.envelope.projection,
        battle,
        characters: [
          {
            build: {},
            characterId: "character:available",
            companion: {},
            displayName: "Available Wizard",
            hitDice: [],
            hitPoints: { current: 8, maximum: 10, state: {} },
            resources: [],
            status: "available"
          },
          {
            battleId: battle.checkpoint.battleId,
            build: {},
            characterId: "character:in-battle",
            companion: {},
            displayName: null,
            status: "inBattle"
          }
        ],
        session: {
          ...base.envelope.projection.session,
          battleState: {
            tag: "activeBattle",
            battleId: battle.checkpoint.battleId,
            currentActorId: battle.checkpoint.currentActorId
          }
        }
      }
    },
    multiSource: true,
    presentationTimeline: [
      {
        ...base.presentationTimeline[0],
        actionDetail: "A precise action detail.",
        actionSummary: "A precise action",
        debug: {
          derivedInput: { step: 1 },
          derivedOutcome: { accepted: true },
          eventKind: "battleAction",
          nextBattle: { round: 1 },
          previousBattle: null
        }
      },
      {
        ...rawPresentationTimelineEntry({ battleRound: 2, sequence: 2 }),
        currentActorDisplayName: "Available Wizard",
        hpChanges: [
          {
            combatantId: "wizard",
            displayName: "Available Wizard",
            maxHp: 10,
            nextHp: 7,
            previousHp: 10
          }
        ]
      },
      {
        ...rawPresentationTimelineEntry({ sequence: 3 }),
        hpChanges: [
          {
            combatantId: "wizard",
            displayName: "Available Wizard",
            maxHp: 10,
            nextHp: 6,
            previousHp: 7
          }
        ]
      },
      {
        ...rawPresentationTimelineEntry({ battleRound: 3, sequence: 4 }),
        characterCount: 1,
        currentActorDisplayName: "Available Wizard",
        draftCount: 1
      }
    ]
  }
  return result
}

function rawPresentationTimelineEntry(input: {
  readonly battleId?: string | null
  readonly battleRound?: number | null
  readonly mirrorSessionId?: string
  readonly sequence?: number
}) {
  return {
    actionDetail: null,
    actionSummary: null,
    battleId: input.battleId ?? null,
    battleRound: input.battleRound ?? null,
    characterCount: 0,
    currentActorDisplayName: null,
    currentActorId: null,
    debug: null,
    draftCount: 0,
    hpChanges: [],
    mirrorSessionId: input.mirrorSessionId ?? "demo",
    publisherInstanceId: "publisher-a",
    receivedAtEpochMs: 1,
    sequence: input.sequence ?? 1,
    sourceProcessId: 1
  }
}

function presentationTimelineEntry(input: {
  readonly battleId?: string | null
  readonly battleRound?: number | null
  readonly mirrorSessionId?: string
  readonly sequence?: number
}): AdminMirrorPresentationTimelineEntry {
  return Schema.decodeUnknownSync(AdminMirrorPresentationTimelineEntrySchema)(rawPresentationTimelineEntry(input))
}
