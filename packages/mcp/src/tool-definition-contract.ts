import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";

/**
 * The MCP SDK leaves each tool annotation optional. The server does not: every
 * advertised tool owns an explicit side-effect classification.
 */
export type McpToolAnnotations = Readonly<
  Required<
    Pick<
      ToolAnnotations,
      "readOnlyHint" | "destructiveHint" | "idempotentHint" | "openWorldHint"
    >
  >
>;

export type ProtocolToolDefinition = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpObjectInputSchema;
  readonly outputSchema?: McpOutputSchema;
  readonly annotations: McpToolAnnotations;
};

export const READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const satisfies McpToolAnnotations;

export const NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const satisfies McpToolAnnotations;

export const IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const satisfies McpToolAnnotations;

export const DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const satisfies McpToolAnnotations;

export const DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const satisfies McpToolAnnotations;
