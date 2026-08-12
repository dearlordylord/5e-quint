export const ATTEMPT_SOURCE_PREFIX = `import type { PlayerContinuation } from "@dnd/player-sdk";

export const continueBattle: PlayerContinuation = async (context) => {
`;

export const ATTEMPT_SOURCE_SUFFIX = `
};
`;

export function attemptSource(body: string): string {
  return `${ATTEMPT_SOURCE_PREFIX}${body}${ATTEMPT_SOURCE_SUFFIX}`;
}

export function authoredAttemptBody(
  source: string,
):
  | { readonly tag: "valid"; readonly body: string }
  | { readonly tag: "invalid"; readonly message: string } {
  return source.startsWith(ATTEMPT_SOURCE_PREFIX) &&
    source.endsWith(ATTEMPT_SOURCE_SUFFIX)
    ? {
        tag: "valid",
        body: source.slice(
          ATTEMPT_SOURCE_PREFIX.length,
          source.length - ATTEMPT_SOURCE_SUFFIX.length,
        ),
      }
    : {
        tag: "invalid",
        message:
          "attempt.ts must retain the generated typed wrapper; edit only its function body.",
      };
}
