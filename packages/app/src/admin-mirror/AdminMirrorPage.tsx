import {
  type AdminMirrorPresentationTimelineEntry,
  type AdminMirrorSessionListResponse,
  AdminMirrorSessionListResponseSchema,
  type AdminMirrorSessionState,
  AdminMirrorSessionStateSchema
} from "@dnd/mcp/experimental-admin-mirror-contract"
import { Either, Schema } from "effect"
import { parseAsString, useQueryState } from "nuqs"
import { useCallback, useEffect, useMemo, useState } from "react"

import { PageShell } from "#/components/PageShell.tsx"
import { BTN_SM } from "#/components/styles.ts"

const DEFAULT_MIRROR_PORT = 8787
const EVENT_JSON_INDENT_SPACES = 2
const SELECTED_SESSION_QUERY_PARAM = "session"

export function AdminMirrorPage() {
  const mirrorUrl = useMemo(defaultMirrorUrl, [])
  const [sessions, setSessions] = useState<ReadonlyArray<AdminMirrorSessionState>>([])
  const [selectedSessionId, setSelectedSessionId] = useQueryState(
    SELECTED_SESSION_QUERY_PARAM,
    parseAsString.withOptions({ history: "replace" })
  )
  const [connection, setConnection] = useState<"connecting" | "offline" | "streaming">("connecting")

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${mirrorUrl}/admin-projections`)
      if (!response.ok) throw new Error(`Mirror returned ${response.status}`)
      const decoded = decodeMirrorSessionResponse(await response.json())
      if (Either.isLeft(decoded)) throw new Error(decoded.left)
      const payload = decoded.right
      setSessions(payload.sessions)
      setConnection((current) => (current === "streaming" ? current : "offline"))
    } catch {
      setConnection("offline")
    }
  }, [mirrorUrl])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setConnection("connecting")
    const source = new EventSource(`${mirrorUrl}/admin-projections/events`)
    const handleOpen = () => setConnection("streaming")
    const handleError = () => setConnection("offline")
    const handleMessage = (event: MessageEvent<string>) => {
      const decoded = decodeMirrorSessionEvent(event.data)
      if (Either.isLeft(decoded)) {
        setConnection("offline")
        return
      }
      const session = decoded.right
      setSessions((current) => upsertSession(current, session))
    }
    source.addEventListener("open", handleOpen)
    source.addEventListener("error", handleError)
    source.addEventListener("message", handleMessage)
    return () => {
      source.removeEventListener("open", handleOpen)
      source.removeEventListener("error", handleError)
      source.removeEventListener("message", handleMessage)
      source.close()
    }
  }, [mirrorUrl])

  const selectedSession = selectMirrorSession(sessions, selectedSessionId)
  const visibleSelectedSessionId = selectedSession?.envelope.mirrorSessionId ?? null

  useEffect(() => {
    if (visibleSelectedSessionId !== null && selectedSessionId !== visibleSelectedSessionId)
      void setSelectedSessionId(visibleSelectedSessionId)
  }, [selectedSessionId, setSelectedSessionId, visibleSelectedSessionId])

  return (
    <PageShell
      title="MCP Admin Mirror"
      actions={
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className={connectionClass(connection)}>{connection}</span>
          <button className={BTN_SM} onClick={() => void refresh()} type="button">
            Refresh
          </button>
        </div>
      }
    >
      <main className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-gray-800 bg-gray-900/80 p-3">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">No mirror sessions.</p>
          ) : (
            <ol className="space-y-2">
              {sessions.map((session) => {
                const selected = session.envelope.mirrorSessionId === visibleSelectedSessionId
                return (
                  <li key={session.envelope.mirrorSessionId}>
                    <button
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        selected
                          ? "border-amber-400 bg-amber-400/10 text-amber-100"
                          : "border-gray-800 bg-black/20 text-gray-300 hover:border-gray-700"
                      }`}
                      onClick={() => void setSelectedSessionId(session.envelope.mirrorSessionId)}
                      type="button"
                    >
                      <span className="block truncate font-medium">{session.envelope.mirrorSessionId}</span>
                      <span className="mt-1 block text-xs text-gray-500">
                        seq {session.envelope.sequence} · pid {session.envelope.sourceProcessId}
                      </span>
                      {session.multiSource ? (
                        <span className="mt-1 block text-xs text-amber-300">multiple publishers</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </aside>

        <section className="space-y-4">
          {selectedSession === null ? (
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-6 text-center text-gray-500">
              {selectedSessionId === null ? "No session selected." : `Session ${selectedSessionId} is not retained.`}
            </div>
          ) : (
            <SessionDetail session={selectedSession} />
          )}
        </section>
      </main>
    </PageShell>
  )
}

function SessionDetail({ session }: { readonly session: AdminMirrorSessionState }) {
  const { envelope } = session
  const battle = envelope.projection.battle
  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Mirror Session" value={envelope.mirrorSessionId} />
        <Metric label="Sequence" value={String(envelope.sequence)} />
        <Metric label="Publisher" value={envelope.publisherInstanceId} />
        <Metric label="Received" value={new Date(session.receivedAtEpochMs).toLocaleTimeString()} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
          <h2 className="text-sm font-semibold text-gray-200">Battle</h2>
          {battle === null ? (
            <p className="mt-3 text-sm text-gray-500">No active battle.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Battle" value={battle.battleId} />
                <Metric label="Round" value={String(battle.round)} />
                <Metric label="Current Actor" value={battle.currentActorId} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {battle.combatants.map((combatant) => (
                  <div key={combatant.combatantId} className="rounded-md border border-gray-800 bg-black/20 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-100">{combatant.displayName}</p>
                      <p className="mt-1 text-xs text-gray-500">{combatant.combatantId}</p>
                    </div>
                    <p className="mt-3 text-sm text-gray-300">
                      HP {combatant.hp}/{combatant.maxHp}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <h2 className="text-sm font-semibold text-gray-200">Characters</h2>
            <div className="mt-3 space-y-2">
              {envelope.projection.characters.length === 0 ? (
                <p className="text-sm text-gray-500">No character sessions.</p>
              ) : (
                envelope.projection.characters.map((character) => (
                  <div key={character.characterId} className="rounded-md border border-gray-800 bg-black/20 p-3">
                    <p className="break-all text-sm font-medium text-gray-100">{character.characterId}</p>
                    <p className="mt-1 text-xs text-gray-500">{character.status}</p>
                    {character.status === "available" ? (
                      <p className="mt-2 text-sm text-gray-300">
                        {character.displayName} · HP {character.hitPoints.current}/{character.hitPoints.maximum}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-300">{character.battleId}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <PresentationTimeline events={session.presentationTimeline} />
        </div>
      </div>
    </>
  )
}

function PresentationTimeline({ events }: { readonly events: ReadonlyArray<AdminMirrorPresentationTimelineEntry> }) {
  const [inspectedEvent, setInspectedEvent] = useState<AdminMirrorPresentationTimelineEntry | null>(null)
  useEffect(() => {
    if (inspectedEvent === null) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectedEvent(null)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [inspectedEvent])

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-200">Presentation Timeline</h2>
        <span className="text-xs text-gray-500">{events.length} retained</span>
      </div>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No presentation snapshots retained by this mirror.</p>
      ) : (
        <ol className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <li
              className="rounded-md border border-gray-800 bg-black/20 px-3 py-2"
              key={`${event.publisherInstanceId}:${event.sequence}`}
            >
              <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                <span>seq {event.sequence}</span>
                <time>{new Date(event.receivedAtEpochMs).toLocaleTimeString()}</time>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-gray-100">{presentationTimelineTitle(event)}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-gray-500">{presentationTimelineDetail(event)}</p>
                <button className={BTN_SM} onClick={() => setInspectedEvent(event)} type="button">
                  JSON
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {inspectedEvent === null ? null : (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInspectedEvent(null)
          }}
        >
          <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gray-700 bg-gray-950 p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-gray-100">
                  {presentationTimelineTitle(inspectedEvent)}
                </h3>
                <p className="mt-1 truncate text-xs text-gray-500">{presentationTimelineDetail(inspectedEvent)}</p>
              </div>
              <button className={BTN_SM} onClick={() => setInspectedEvent(null)} type="button">
                Close
              </button>
            </div>
            <div className="mt-3 max-h-[72vh] space-y-3 overflow-auto pr-1">
              {inspectedEvent.debug === null ? (
                <InspectorJson title="Event" value={inspectedEvent} />
              ) : (
                <>
                  <InspectorJson title="Derived Input" value={inspectedEvent.debug.derivedInput} />
                  <InspectorJson title="Derived Outcome" value={inspectedEvent.debug.derivedOutcome} />
                  <div className="grid gap-3 lg:grid-cols-2">
                    <InspectorJson title="Before Battle" value={inspectedEvent.debug.previousBattle} />
                    <InspectorJson title="After Battle" value={inspectedEvent.debug.nextBattle} />
                  </div>
                  <InspectorJson title="Full Event" value={inspectedEvent} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function InspectorJson({ title, value }: { readonly title: string; readonly value: unknown }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <pre className="mt-1 overflow-auto rounded-md border border-gray-800 bg-black p-3 text-xs leading-relaxed text-gray-300">
        {JSON.stringify(value, null, EVENT_JSON_INDENT_SPACES)}
      </pre>
    </section>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-800 bg-gray-900/80 p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-gray-100">{value}</dd>
    </div>
  )
}

export function presentationTimelineTitle(event: AdminMirrorPresentationTimelineEntry): string {
  if (event.actionSummary !== null) return event.actionSummary
  const firstHpChange = event.hpChanges[0]
  if (event.hpChanges.length === 1) return hpChangeTitle(firstHpChange)
  if (event.hpChanges.length > 1) return `HP changed for ${event.hpChanges.length} combatants`
  if (event.battleId !== null) {
    const actor = event.currentActorDisplayName ?? event.currentActorId
    if (actor !== null && event.battleRound !== null) return `Round ${event.battleRound}: ${actor}'s turn`
    if (actor !== null) return `${actor}'s turn`
    return "Battle updated"
  }
  if (event.characterCount > 0) return "Characters updated"
  if (event.draftCount > 0) return "Drafts updated"
  return "Session updated"
}

function presentationTimelineDetail(event: AdminMirrorPresentationTimelineEntry): string {
  if (event.actionDetail !== null) return event.actionDetail
  const firstHpChange = event.hpChanges[0]
  if (event.hpChanges.length === 1) {
    const change = firstHpChange
    return [
      `HP ${change.nextHp}/${change.maxHp}`,
      ...(event.battleRound === null ? [] : [`round ${event.battleRound}`]),
      ...(event.currentActorDisplayName === null ? [] : [`current ${event.currentActorDisplayName}`])
    ].join(" · ")
  }
  return [
    `publisher ${event.publisherInstanceId}`,
    `pid ${event.sourceProcessId}`,
    ...(event.battleRound === null ? [] : [`round ${event.battleRound}`]),
    ...(event.currentActorDisplayName === null ? [] : [`current ${event.currentActorDisplayName}`]),
    `${event.characterCount} character${event.characterCount === 1 ? "" : "s"}`,
    `${event.draftCount} draft${event.draftCount === 1 ? "" : "s"}`
  ].join(" · ")
}

function hpChangeTitle(change: AdminMirrorPresentationTimelineEntry["hpChanges"][number]): string {
  const delta = change.nextHp - change.previousHp
  if (delta < 0) return `${change.displayName} took ${-delta} damage`
  if (delta > 0) return `${change.displayName} healed ${delta} HP`
  return `${change.displayName} HP changed`
}

function upsertSession(
  sessions: ReadonlyArray<AdminMirrorSessionState>,
  session: AdminMirrorSessionState
): ReadonlyArray<AdminMirrorSessionState> {
  return [
    session,
    ...sessions.filter((current) => current.envelope.mirrorSessionId !== session.envelope.mirrorSessionId)
  ]
}

export function selectMirrorSession(
  sessions: ReadonlyArray<AdminMirrorSessionState>,
  selectedSessionId: string | null
): AdminMirrorSessionState | null {
  if (sessions.length === 0) return null
  if (selectedSessionId !== null) {
    return sessions.find((session) => session.envelope.mirrorSessionId === selectedSessionId) ?? null
  }
  return sessions[0] ?? null
}

export function decodeMirrorSessionResponse(value: unknown): Either.Either<AdminMirrorSessionListResponse, string> {
  const decoded = Schema.decodeUnknownEither(AdminMirrorSessionListResponseSchema)(value)
  return Either.mapLeft(decoded, (error) => error.message)
}

export function decodeMirrorSessionEvent(value: string): Either.Either<AdminMirrorSessionState, string> {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return Either.left("Expected JSON mirror session event.")
  }
  const decoded = Schema.decodeUnknownEither(AdminMirrorSessionStateSchema)(parsed)
  return Either.mapLeft(decoded, (error) => error.message)
}

function defaultMirrorUrl(): string {
  const configured = import.meta.env.VITE_ADMIN_MIRROR_URL
  if (configured !== undefined && configured.length > 0) return configured
  if (typeof window === "undefined") return `http://localhost:${DEFAULT_MIRROR_PORT}`
  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_MIRROR_PORT}`
}

function connectionClass(connection: "connecting" | "offline" | "streaming"): string {
  if (connection === "streaming") return "text-emerald-300"
  if (connection === "connecting") return "text-amber-300"
  return "text-rose-300"
}
