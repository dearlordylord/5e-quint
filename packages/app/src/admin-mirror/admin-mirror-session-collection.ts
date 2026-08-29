import type { AdminMirrorSessionState } from "@dnd/mcp/experimental-admin-mirror-contract"
import { Match } from "effect"

import type {
  MirrorOriginConfigurationIssue,
  MirrorSessionLoadIssue,
  MirrorSessionLoadState
} from "./admin-mirror-session-boundary.ts"

type MirrorSessionCollectionIssue = MirrorOriginConfigurationIssue | MirrorSessionLoadIssue

type MirrorSessionLoadRequest = {
  readonly tag: "mirrorSessionLoadRequest"
  readonly token: symbol
}

type MirrorSessionCollectionState =
  | {
      readonly tag: "awaitingLoadStart"
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | {
      readonly tag: "failed"
      readonly issue: MirrorSessionCollectionIssue
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | {
      readonly tag: "loaded"
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | {
      readonly tag: "loading"
      readonly request: MirrorSessionLoadRequest
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
      readonly streamUpdatesSinceRequestStarted: ReadonlyArray<AdminMirrorSessionState>
    }

type MirrorSessionCollectionAction =
  | {
      readonly tag: "loadFailed"
      readonly issue: MirrorSessionCollectionIssue
      readonly request: MirrorSessionLoadRequest
    }
  | {
      readonly tag: "loadSucceeded"
      readonly request: MirrorSessionLoadRequest
      readonly sessions: ReadonlyArray<AdminMirrorSessionState>
    }
  | { readonly tag: "loadStarted"; readonly request: MirrorSessionLoadRequest }
  | { readonly tag: "streamSessionReceived"; readonly session: AdminMirrorSessionState }

export const initialMirrorSessionCollectionState: MirrorSessionCollectionState = {
  tag: "awaitingLoadStart",
  sessions: []
}

export function makeMirrorSessionLoadRequest(): MirrorSessionLoadRequest {
  return { tag: "mirrorSessionLoadRequest", token: Symbol("mirrorSessionLoadRequest") }
}

export function reduceMirrorSessionCollection(
  state: MirrorSessionCollectionState,
  action: MirrorSessionCollectionAction
): MirrorSessionCollectionState {
  return Match.value(action).pipe(
    Match.when({ tag: "loadStarted" }, ({ request }) => ({
      tag: "loading" as const,
      request,
      sessions: state.sessions,
      streamUpdatesSinceRequestStarted: []
    })),
    Match.when({ tag: "loadSucceeded" }, ({ request, sessions }) =>
      state.tag !== "loading" || state.request !== request
        ? state
        : {
            tag: "loaded" as const,
            sessions: state.streamUpdatesSinceRequestStarted.reduceRight(upsertMirrorSession, sessions)
          }
    ),
    Match.when({ tag: "loadFailed" }, ({ issue, request }) =>
      state.tag !== "loading" || state.request !== request
        ? state
        : { tag: "failed" as const, issue, sessions: state.sessions }
    ),
    Match.when({ tag: "streamSessionReceived" }, ({ session }) =>
      state.tag === "loading"
        ? {
            ...state,
            sessions: upsertMirrorSession(state.sessions, session),
            streamUpdatesSinceRequestStarted: upsertMirrorSession(state.streamUpdatesSinceRequestStarted, session)
          }
        : { ...state, sessions: upsertMirrorSession(state.sessions, session) }
    ),
    Match.exhaustive
  )
}

export function mirrorSessionCollectionLoadState(state: MirrorSessionCollectionState): MirrorSessionLoadState {
  return Match.value(state).pipe(
    Match.when({ tag: "awaitingLoadStart" }, () => ({ tag: "loading" as const })),
    Match.when({ tag: "loading" }, () => ({ tag: "loading" as const })),
    Match.when({ tag: "loaded" }, () => ({ tag: "loaded" as const })),
    Match.when({ tag: "failed" }, ({ issue }) => issue),
    Match.exhaustive
  )
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
