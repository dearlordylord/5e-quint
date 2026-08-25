import {
  GUEST_ONLY_PLAY_SESSION_GUIDANCE,
  GUEST_PLAY_SESSION_GUIDANCE,
  type PrincipalId,
} from "./play-session-access.ts";

export type PlaySessionRequestIdentity =
  | {
      readonly tag: "anonymous";
      readonly savedPlaySessions:
        | { readonly tag: "unavailable" }
        | { readonly tag: "oauth"; readonly resourceMetadataUrl: string };
    }
  | { readonly tag: "authenticated"; readonly principalId: PrincipalId };

export const GUEST_ONLY_REQUEST_IDENTITY = {
  tag: "anonymous",
  savedPlaySessions: { tag: "unavailable" },
} as const satisfies PlaySessionRequestIdentity;

export function guestSaveAvailability(
  identity: PlaySessionRequestIdentity,
):
  | { readonly tag: "available" }
  | { readonly tag: "unavailable"; readonly reason: "oauthNotConfigured" } {
  return identity.tag === "authenticated" ||
    identity.savedPlaySessions.tag === "oauth"
    ? { tag: "available" }
    : { tag: "unavailable", reason: "oauthNotConfigured" };
}

export function guestPlaySessionGuidance(
  identity: PlaySessionRequestIdentity,
): string {
  return guestSaveAvailability(identity).tag === "available"
    ? GUEST_PLAY_SESSION_GUIDANCE
    : GUEST_ONLY_PLAY_SESSION_GUIDANCE;
}
