export const MCP_TOOL_SURFACES = ["regular", "chatgpt"] as const;
export type McpToolSurface = (typeof MCP_TOOL_SURFACES)[number];
