import {
  type AdminMirrorSessionListResponse,
  AdminMirrorSessionListResponseSchema,
  type AdminMirrorSessionState,
  AdminMirrorSessionStateSchema
} from "@dnd/mcp/experimental-admin-mirror-contract"
import { Result, Schema } from "effect"

const DEFAULT_MIRROR_PORT = 8787

const AdminMirrorOriginSchema = Schema.URLFromString.pipe(
  Schema.check(
    Schema.makeFilter(
      (url) =>
        (url.protocol === "https:" || url.protocol === "http:") &&
        url.username === "" &&
        url.password === "" &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === "",
      {
        message: "Admin mirror origin must be an HTTP(S) origin without credentials, path, query, or fragment."
      }
    )
  ),
  Schema.brand("AdminMirrorOrigin")
)

export type AdminMirrorOrigin = typeof AdminMirrorOriginSchema.Type
export type MirrorOriginConfigurationIssue = { readonly tag: "invalidConfiguration" }
type MirrorSessionInvalidResponseIssue = { readonly tag: "invalidResponse" }
type MirrorSessionUnavailableIssue = { readonly tag: "unavailable" }
export type MirrorSessionLoadIssue = MirrorSessionInvalidResponseIssue | MirrorSessionUnavailableIssue
type MirrorSessionResponseParseIssue = {
  readonly tag: "invalidMirrorSessionResponse"
  readonly message: string
}
type MirrorSessionEventParseIssue =
  | { readonly tag: "invalidMirrorSessionEvent"; readonly message: string }
  | { readonly tag: "malformedMirrorSessionEventJson"; readonly message: string }

export type MirrorSessionLoadState =
  | MirrorOriginConfigurationIssue
  | MirrorSessionLoadIssue
  | { readonly tag: "loading" }
  | { readonly tag: "loaded" }

export async function loadMirrorSessions(
  mirrorOrigin: AdminMirrorOrigin
): Promise<Result.Result<AdminMirrorSessionListResponse, MirrorSessionLoadIssue>> {
  const response = await fetchMirrorSessionResponse(new URL("/admin-projections", mirrorOrigin))
  if (Result.isFailure(response)) return Result.fail(response.failure)
  if (!response.success.ok) return Result.fail({ tag: "unavailable" })
  return decodeMirrorHttpResponse(response.success)
}

async function fetchMirrorSessionResponse(url: URL): Promise<Result.Result<Response, MirrorSessionUnavailableIssue>> {
  try {
    return Result.succeed(await fetch(url))
  } catch {
    return Result.fail({ tag: "unavailable" })
  }
}

export function decodeAdminMirrorOrigin(
  value: unknown
): Result.Result<AdminMirrorOrigin, MirrorOriginConfigurationIssue> {
  return Result.mapError(Schema.decodeUnknownResult(AdminMirrorOriginSchema)(value), () => ({
    tag: "invalidConfiguration"
  }))
}

export function defaultAdminMirrorOrigin(): Result.Result<AdminMirrorOrigin, MirrorOriginConfigurationIssue> {
  const configured = import.meta.env.VITE_ADMIN_MIRROR_URL
  if (configured !== undefined && configured.length > 0) return decodeAdminMirrorOrigin(configured)
  /* v8 ignore next -- @preserve -- the browser-only page does not construct its default origin during SSR */
  if (typeof window === "undefined") return decodeAdminMirrorOrigin(`http://localhost:${DEFAULT_MIRROR_PORT}`)
  return decodeAdminMirrorOrigin(`${window.location.protocol}//${window.location.hostname}:${DEFAULT_MIRROR_PORT}`)
}

async function decodeMirrorHttpResponse(
  response: Response
): Promise<Result.Result<AdminMirrorSessionListResponse, MirrorSessionInvalidResponseIssue>> {
  try {
    return Result.mapError(decodeMirrorSessionResponse(await response.json()), () => ({ tag: "invalidResponse" }))
  } catch {
    return Result.fail({ tag: "invalidResponse" })
  }
}

export function decodeMirrorSessionResponse(
  value: unknown
): Result.Result<AdminMirrorSessionListResponse, MirrorSessionResponseParseIssue> {
  const decoded = Schema.decodeUnknownResult(AdminMirrorSessionListResponseSchema)(value)
  return Result.mapError(decoded, (error) => ({
    tag: "invalidMirrorSessionResponse",
    message: error.message
  }))
}

export function decodeMirrorSessionEvent(
  value: string
): Result.Result<AdminMirrorSessionState, MirrorSessionEventParseIssue> {
  try {
    const parsed: unknown = JSON.parse(value)
    const decoded = Schema.decodeUnknownResult(AdminMirrorSessionStateSchema)(parsed)
    return Result.mapError(decoded, (error) => ({
      tag: "invalidMirrorSessionEvent",
      message: error.message
    }))
  } catch {
    return Result.fail({
      tag: "malformedMirrorSessionEventJson",
      message: "Expected JSON mirror session event."
    })
  }
}
