import type { PrincipalId } from "./play-session-access.ts";

export type PlaySessionRequestIdentity =
  | {
      readonly tag: "localProcess";
    }
  | {
      readonly tag: "hostedAnonymous";
      readonly authentication:
        | { readonly tag: "unavailable" }
        | { readonly tag: "oauth"; readonly resourceMetadataUrl: string };
    }
  | { readonly tag: "authenticated"; readonly principalId: PrincipalId };

export function createLocalPlaySessionRequestIdentity(): Extract<
  PlaySessionRequestIdentity,
  { tag: "localProcess" }
> {
  return {
    tag: "localProcess",
  };
}
