import {
  type AdminMirrorPresentationTimelineEntry,
  AdminMirrorPresentationTimelineEntrySchema,
  type AdminMirrorSessionState,
  AdminMirrorSessionStateSchema
} from "@dnd/mcp/experimental-admin-mirror-contract"
import { Either, Schema } from "effect"
import { describe, expect, test } from "vitest"

import {
  decodeMirrorSessionEvent,
  decodeMirrorSessionResponse,
  presentationTimelineTitle,
  selectMirrorSession
} from "./AdminMirrorPage.tsx"

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
})

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
          activeBattle: null,
          draftIds: [],
          selectedStatBlockId: null,
          transientBattleFills: null
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
