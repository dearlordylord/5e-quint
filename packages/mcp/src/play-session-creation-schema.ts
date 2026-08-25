import {
  GUEST_ONLY_PLAY_SESSION_GUIDANCE,
  GUEST_PLAY_SESSION_GUIDANCE,
} from "./play-session-access.ts";
import type { McpOutputSchema } from "./schema-codec.ts";

export function playSessionCreationResultSchema(input: {
  readonly playSessionId: McpOutputSchema;
  readonly guestAccessGrant: McpOutputSchema;
}): McpOutputSchema {
  const branch = (
    access: McpOutputSchema,
    guidance: McpOutputSchema | undefined,
  ): McpOutputSchema => ({
    type: "object",
    properties: {
      tag: { const: "playSessionCreated" },
      playSessionId: input.playSessionId,
      access,
      ...(guidance === undefined ? {} : { guidance }),
    },
    required: [
      "tag",
      "playSessionId",
      "access",
      ...(guidance === undefined ? [] : ["guidance"]),
    ],
    additionalProperties: false,
  });
  return {
    anyOf: [
      branch(
        {
          type: "object",
          properties: {
            tag: { const: "guest" },
            guestAccessGrant: input.guestAccessGrant,
          },
          required: ["tag", "guestAccessGrant"],
          additionalProperties: false,
        },
        {
          anyOf: [
            { const: GUEST_PLAY_SESSION_GUIDANCE },
            { const: GUEST_ONLY_PLAY_SESSION_GUIDANCE },
          ],
        },
      ),
      branch(
        {
          type: "object",
          properties: { tag: { const: "authenticated" } },
          required: ["tag"],
          additionalProperties: false,
        },
        undefined,
      ),
    ],
  };
}
