import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  createMcpCompositionRoot,
  handleToolCall,
  toolDefinitions,
  type McpCompositionRoot,
} from "./server.ts";
import { battleToolNames } from "./battle-tool-input.ts";
import { characterToolNames } from "./character-tool-input.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";
import {
  readSrdPlayWidgetResource,
  SRD_PLAY_WIDGET_MIME_TYPE,
  srdPlayWidgetResources,
  srdPlayWidgetResourceUris,
} from "./prototype-srd-play-widgets.ts";
import { errorContent } from "./tool-content.ts";

type ProtocolToolDefinition = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpObjectInputSchema;
  readonly outputSchema?: McpOutputSchema;
  readonly annotations?: {
    readonly readOnlyHint?: boolean;
    readonly destructiveHint?: boolean;
    readonly openWorldHint?: boolean;
  };
  readonly _meta?: Readonly<Record<string, unknown>>;
};

const widgetUriByToolName: Readonly<Record<string, string>> = {
  [characterToolNames.listCharacters]: srdPlayWidgetResourceUris.characterList,
  [battleToolNames.readBattleState]: srdPlayWidgetResourceUris.battleState,
};

function withPrototypeWidgetMetadata(
  definition: ProtocolToolDefinition,
): ProtocolToolDefinition {
  const resourceUri = widgetUriByToolName[definition.name];
  return resourceUri === undefined
    ? definition
    : {
        ...definition,
        annotations: {
          ...definition.annotations,
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
        _meta: { ui: { resourceUri } },
      };
}

export function createDndMcpProtocolServer(
  root: McpCompositionRoot = createMcpCompositionRoot(),
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
) {
  const advertisedDefinitions = definitions.map(withPrototypeWidgetMetadata);
  const advertisedToolNames = new Set(
    advertisedDefinitions.map((definition) => definition.name),
  );
  const server = new Server(
    { name: "dnd-surface-runtime", version: "0.1.0" },
    { capabilities: { resources: {}, tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: advertisedDefinitions,
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: srdPlayWidgetResources,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const html = readSrdPlayWidgetResource(request.params.uri);
    if (html === null) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown SRD Play widget resource: ${request.params.uri}`,
      );
    }
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: SRD_PLAY_WIDGET_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: { connectDomains: [], resourceDomains: [] },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    return advertisedToolNames.has(name)
      ? handleToolCall(root, name, request.params.arguments)
      : errorContent(`Tool is not advertised by this MCP server: ${name}`);
  });

  return { root, server };
}
