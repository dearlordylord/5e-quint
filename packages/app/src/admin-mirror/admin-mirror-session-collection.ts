import type { AdminMirrorSessionState } from "@dnd/mcp/experimental-admin-mirror-contract"
import { Match, Result, Schema } from "effect"

import type {
  AdminMirrorOrigin,
  MirrorOriginConfigurationIssue,
  MirrorSessionLoadIssue,
  MirrorSessionLoadState
} from "./admin-mirror-session-boundary.ts"

type MirrorSessionId = AdminMirrorSessionState["envelope"]["mirrorSessionId"]
const MirrorSessionLoadRequestIdSchema = Schema.Symbol.pipe(Schema.brand("MirrorSessionLoadRequestId"))
type MirrorSessionLoadRequestId = typeof MirrorSessionLoadRequestIdSchema.Type

type MirrorSessionCollectionState =
  | { readonly tag: "configurationInvalid" }
  | {
      readonly tag: "awaitingLoadStart"
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | {
      readonly tag: "failed"
      readonly issue: MirrorSessionLoadIssue
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | {
      readonly tag: "loaded"
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | {
      readonly tag: "loading"
      readonly requestId: MirrorSessionLoadRequestId
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
      readonly streamedSessionIdsDuringLoad: ReadonlySet<MirrorSessionId>
    }

type MirrorSessionCollectionAction =
  | {
      readonly tag: "loadFailed"
      readonly issue: MirrorSessionLoadIssue
      readonly requestId: MirrorSessionLoadRequestId
    }
  | {
      readonly tag: "loadSucceeded"
      readonly requestId: MirrorSessionLoadRequestId
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | { readonly tag: "loadStarted"; readonly requestId: MirrorSessionLoadRequestId }
  | { readonly tag: "streamSessionReceived"; readonly session: AdminMirrorSessionState }

export function makeInitialMirrorSessionCollectionState(
  mirrorOrigin: Result.Result<AdminMirrorOrigin, MirrorOriginConfigurationIssue>
): MirrorSessionCollectionState {
  return Result.isFailure(mirrorOrigin) ? { tag: "configurationInvalid" } : { tag: "awaitingLoadStart", sessions: [] }
}

export function makeMirrorSessionLoadRequestId(): MirrorSessionLoadRequestId {
  return MirrorSessionLoadRequestIdSchema.make(Symbol("mirrorSessionLoadRequest"))
}

export function mirrorSessionCollectionSessions(
  state: MirrorSessionCollectionState
): ReadonlyArray<AdminMirrorSessionState> {
  return state.tag === "configurationInvalid" ? [] : state.sessions
}

export function reduceMirrorSessionCollection(
  state: MirrorSessionCollectionState,
  action: MirrorSessionCollectionAction
): MirrorSessionCollectionState {
  return Match.value(action).pipe(
    Match.when({ tag: "loadStarted" }, ({ requestId }) =>
      state.tag === "configurationInvalid"
        ? state
        : {
            tag: "loading" as const,
            requestId,
            sessions: state.sessions,
            streamedSessionIdsDuringLoad: new Set<MirrorSessionId>()
          }
    ),
    Match.when({ tag: "loadSucceeded" }, ({ requestId, sessions }) =>
      state.tag !== "loading" || state.requestId !== requestId
        ? state
        : {
            tag: "loaded" as const,
            sessions: replaceSnapshotSessions(state.sessions, state.streamedSessionIdsDuringLoad, sessions)
          }
    ),
    Match.when({ tag: "loadFailed" }, ({ issue, requestId }) =>
      state.tag !== "loading" || state.requestId !== requestId
        ? state
        : { tag: "failed" as const, issue, sessions: state.sessions }
    ),
    Match.when({ tag: "streamSessionReceived" }, ({ session }) =>
      state.tag === "configurationInvalid"
        ? state
        : state.tag === "loading"
          ? {
              ...state,
              sessions: upsertMirrorSession(state.sessions, session),
              streamedSessionIdsDuringLoad: new Set([
                ...state.streamedSessionIdsDuringLoad,
                session.envelope.mirrorSessionId
              ])
            }
          : { ...state, sessions: upsertMirrorSession(state.sessions, session) }
    ),
    Match.exhaustive
  )
}

export function mirrorSessionCollectionLoadState(state: MirrorSessionCollectionState): MirrorSessionLoadState {
  return Match.value(state).pipe(
    Match.when({ tag: "configurationInvalid" }, () => ({ tag: "invalidConfiguration" as const })),
    Match.when({ tag: "awaitingLoadStart" }, () => ({ tag: "loading" as const })),
    Match.when({ tag: "loading" }, () => ({ tag: "loading" as const })),
    Match.when({ tag: "loaded" }, () => ({ tag: "loaded" as const })),
    Match.when({ tag: "failed" }, ({ issue }) => issue),
    Match.exhaustive
  )
}

function replaceSnapshotSessions(
  currentSessions: ReadonlyArray<AdminMirrorSessionState>,
  streamedSessionIds: ReadonlySet<MirrorSessionId>,
  snapshotSessions: ReadonlyArray<AdminMirrorSessionState>
): ReadonlyArray<AdminMirrorSessionState> {
  return [
    ...currentSessions.filter((session) => streamedSessionIds.has(session.envelope.mirrorSessionId)),
    ...snapshotSessions.filter((session) => !streamedSessionIds.has(session.envelope.mirrorSessionId))
  ]
}

function upsertMirrorSession(
  sessions: ReadonlyArray<AdminMirrorSessionState>,
  session: AdminMirrorSessionState
): ReadonlyArray<AdminMirrorSessionState> {
  return [
    session,
    ...sessions.filter((current) => current.envelope.mirrorSessionId !== session.envelope.mirrorSessionId)
  ]
}
