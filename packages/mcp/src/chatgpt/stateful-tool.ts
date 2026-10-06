import type { ChatGptStatefulInput } from "./stateful-tool-input.ts";
import { shareToolSchemaDefinitions } from "../json-schema-sharing.ts";
import { Result, Schema } from "effect";
import type { McpPlaySessionRoot } from "../composition-root.ts";
import { decodeToolArgs, mcpObjectJsonSchema } from "../schema-codec.ts";
import type { handleToolCall } from "../server.ts";
import type {
  McpToolAnnotations,
  ProtocolToolDefinition,
} from "../tool-definition-contract.ts";
import {
  CHATGPT_TOOL_PLAN,
  type ChatGptToolName,
  type ChatGptToolSelection,
} from "./operation-tool-plan.ts";

export type ChatGptExecutionTool = {
  readonly definition: ProtocolToolDefinition;
  readonly handle: (
    root: McpPlaySessionRoot,
    args: unknown,
  ) => ReturnType<typeof handleToolCall>;
};

export function defineChatGptStatefulTool<
  const Name extends ChatGptToolName,
  A extends ChatGptStatefulInput<NoInfer<Name>>,
  I,
>(input: {
  readonly name: Name;
  readonly selection: NoInfer<ChatGptToolSelection<Name>>;
  readonly schema: Schema.Codec<A, I, never>;
  readonly annotations: McpToolAnnotations;
  readonly handle: (
    root: McpPlaySessionRoot,
    args: A,
  ) => ReturnType<typeof handleToolCall>;
}): ChatGptExecutionTool & {
  readonly definition: ProtocolToolDefinition & { readonly name: Name };
  readonly selection: ChatGptToolSelection<Name>;
} {
  return {
    selection: input.selection,
    definition: {
      name: input.name,
      title: input.name.replaceAll("_", " "),
      description: CHATGPT_TOOL_PLAN[input.name].description,
      inputSchema: {
        ...shareToolSchemaDefinitions(mcpObjectJsonSchema(input.schema)),
        type: "object",
      },
      annotations: input.annotations,
    },
    handle(root: McpPlaySessionRoot, args: unknown) {
      const decoded = decodeToolArgs(input.schema, args, input.name);
      return Result.isFailure(decoded)
        ? decoded.failure
        : input.handle(root, decoded.success);
    },
  };
}
