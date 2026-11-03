import { canonicalToolDefinitionForSurface } from "./chatgpt/canonical-output-schema.ts";
import { isChatGptStatefulToolName } from "./chatgpt/protocol-operation.ts";
import { shareToolDefinitionsForSurface } from "./chatgpt/tool-surface.ts";
import type { McpToolSurface } from "./mcp-tool-surface.ts";
import { projectModelOutputJsonSchema } from "./model-output-json-schema.ts";
import {
  isPlaySessionToolName,
  isStatefulPlaySessionToolName,
  playSessionToolDefinitions,
  playSessionToolDefinitionForSurface,
  statefulPlaySessionToolDefinition,
} from "./play-session-tool-contract.ts";
import { isMcpModelOutputSchema } from "./schema-codec.ts";
import { toolDefinitions } from "./server.ts";
import {
  NO_AUTH_SECURITY_SCHEMES,
  SAVED_PLAY_SESSION_SECURITY_SCHEMES,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

export function buildAdvertisedToolDefinitions(
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
  playSessionTransport: "hosted" | "localProcess" = "hosted",
  toolSurface: McpToolSurface = "regular",
): readonly ProtocolToolDefinition[] {
  const advertised = applyTransportSecurity(
    [
      ...playSessionDefinitionsForTransport(playSessionTransport, toolSurface),
      ...definitions.map((definition) => {
        const advertisedDefinition =
          definition.outputSchema === undefined
            ? definition
            : {
                ...definition,
                outputSchema: {
                  ...(isMcpModelOutputSchema(definition.outputSchema)
                    ? definition.outputSchema
                    : projectModelOutputJsonSchema(definition.outputSchema)),
                  type: "object",
                },
              };
        const name = advertisedDefinition.name;
        const statefulName = statefulToolNameForSurface(name, toolSurface);
        return statefulName === undefined
          ? advertisedDefinition
          : statefulPlaySessionToolDefinition(
              advertisedDefinition,
              statefulName,
              toolSurface,
            );
      }),
    ],
    playSessionTransport,
  );
  return shareToolDefinitionsForSurface(advertised, toolSurface);
}

export function buildCanonicalToolDefinitions(
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
  playSessionTransport: "hosted" | "localProcess" = "hosted",
  toolSurface: McpToolSurface = "regular",
): readonly ProtocolToolDefinition[] {
  return applyTransportSecurity(
    [
      ...playSessionDefinitionsForTransport(playSessionTransport, toolSurface),
      ...definitions.map((definition) => {
        const canonicalDefinition = canonicalToolDefinitionForSurface(
          definition,
          toolSurface,
        );
        const statefulName = statefulToolNameForSurface(
          canonicalDefinition.name,
          toolSurface,
        );
        return statefulName === undefined
          ? canonicalDefinition
          : statefulPlaySessionToolDefinition(
              canonicalDefinition,
              statefulName,
              toolSurface,
            );
      }),
    ],
    playSessionTransport,
  );
}

export function buildCanonicalCodecToolDefinitions(
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
  playSessionTransport: "hosted" | "localProcess" = "hosted",
  toolSurface: McpToolSurface = "regular",
): readonly ProtocolToolDefinition[] {
  return applyTransportSecurity(
    [
      ...playSessionDefinitionsForTransport(
        playSessionTransport,
        toolSurface,
      ).map((definition) =>
        canonicalToolDefinitionForSurface(definition, toolSurface),
      ),
      ...definitions.map((definition) =>
        canonicalToolDefinitionForSurface(definition, toolSurface),
      ),
    ],
    playSessionTransport,
  );
}

function statefulToolNameForSurface(name: string, surface: McpToolSurface) {
  return isStatefulPlaySessionToolName(name)
    ? name
    : surface === "chatgpt" && isChatGptStatefulToolName(name)
      ? name
      : undefined;
}
function playSessionDefinitionsForTransport(
  transport: "hosted" | "localProcess",
  surface: McpToolSurface,
): readonly ProtocolToolDefinition[] {
  return playSessionToolDefinitions
    .filter(
      (definition: ProtocolToolDefinition) =>
        transport === "hosted" ||
        !definition.securitySchemes?.some((scheme) => scheme.type === "oauth2"),
    )
    .map((definition) =>
      playSessionToolDefinitionForSurface(definition, surface),
    );
}

function applyTransportSecurity(
  definitions: readonly ProtocolToolDefinition[],
  playSessionTransport: "hosted" | "localProcess",
): readonly ProtocolToolDefinition[] {
  return definitions.map((definition) => {
    const source: ProtocolToolDefinition = definition;
    const securitySchemes =
      source.securitySchemes ??
      (isPlaySessionToolName(source.name) ||
      isStatefulPlaySessionToolName(source.name)
        ? playSessionTransport === "hosted"
          ? SAVED_PLAY_SESSION_SECURITY_SCHEMES
          : NO_AUTH_SECURITY_SCHEMES
        : NO_AUTH_SECURITY_SCHEMES);
    return {
      ...source,
      securitySchemes,
      _meta: { ...source._meta, securitySchemes },
    };
  });
}
