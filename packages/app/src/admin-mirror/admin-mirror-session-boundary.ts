import {
  type AdminMirrorSessionListResponse,
  AdminMirrorSessionListResponseSchema,
  type AdminMirrorSessionState,
  AdminMirrorSessionStateSchema
} from "@dnd/mcp/experimental-admin-mirror-contract"
import { Result, Schema } from "effect"

type MirrorSessionLoadIssue = { readonly tag: "invalidResponse" } | { readonly tag: "unavailable" }

export type MirrorSessionLoadState = { readonly tag: "loading" } | { readonly tag: "loaded" } | MirrorSessionLoadIssue

export async function loadMirrorSessions(
  mirrorUrl: string
): Promise<Result.Result<AdminMirrorSessionListResponse, MirrorSessionLoadIssue>> {
  const response = await fetchMirrorSessionResponse(`${mirrorUrl}/admin-projections`)
  if (Result.isFailure(response)) return Result.fail(response.failure)
  if (!response.success.ok) return Result.fail({ tag: "unavailable" })
  return decodeMirrorHttpResponse(response.success)
}

async function fetchMirrorSessionResponse(url: string): Promise<Result.Result<Response, MirrorSessionLoadIssue>> {
  try {
    return Result.succeed(await fetch(url))
  } catch {
    return Result.fail({ tag: "unavailable" })
  }
}

async function decodeMirrorHttpResponse(
  response: Response
): Promise<Result.Result<AdminMirrorSessionListResponse, MirrorSessionLoadIssue>> {
  try {
    return Result.mapError(decodeMirrorSessionResponse(await response.json()), () => ({ tag: "invalidResponse" }))
  } catch {
    return Result.fail({ tag: "invalidResponse" })
  }
}

export function decodeMirrorSessionResponse(value: unknown): Result.Result<AdminMirrorSessionListResponse, string> {
  const decoded = Schema.decodeUnknownResult(AdminMirrorSessionListResponseSchema)(value)
  return Result.mapError(decoded, (error) => error.message)
}

export function decodeMirrorSessionEvent(value: string): Result.Result<AdminMirrorSessionState, string> {
  try {
    const parsed: unknown = JSON.parse(value)
    const decoded = Schema.decodeUnknownResult(AdminMirrorSessionStateSchema)(parsed)
    return Result.mapError(decoded, (error) => error.message)
  } catch {
    return Result.fail("Expected JSON mirror session event.")
  }
}
