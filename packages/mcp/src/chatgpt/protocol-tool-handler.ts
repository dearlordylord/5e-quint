import { Result } from "effect";
import { isChatGptBattleOperationToolName } from "./protocol-operation.ts";
import { resolvePublicBattleSelection } from "./battle-public-selection.ts";
import {
  handlePlaySessionOperation,
  type PlaySessionRequestIdentity,
} from "../play-session-protocol.ts";
import type {
  PlaySessionRegistry,
  PlaySessionAccessFailure,
} from "../play-session.ts";
import { executeStatefulToolCall } from "../server.ts";
import { errorContent } from "../tool-content.ts";
import type { ProtocolToolDefinition } from "../tool-definition-contract.ts";
import type { ChatGptStatefulToolName } from "./protocol-operation.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";

export function handleChatGptStatefulToolRequest(input: {
  readonly name: ChatGptStatefulToolName;
  readonly args: unknown;
  readonly protocolDefinitionByName: ReadonlyMap<
    string,
    ProtocolToolDefinition
  >;
  readonly playSessions: PlaySessionRegistry<PlaySessionAccessFailure>;
  readonly requestIdentity: PlaySessionRequestIdentity;
}) {
  const definition = input.protocolDefinitionByName.get(input.name);
  if (definition === undefined)
    return errorContent(
      `Tool is not advertised by this MCP server: ${input.name}`,
    );
  return handlePlaySessionOperation({
    registry: input.playSessions,
    toolSurface: "chatgpt",
    operationName: input.name,
    recordOperation: definition.annotations.readOnlyHint !== true,
    args: input.args,
    identity: input.requestIdentity,
    handle: (root, args, playSessionId) => {
      if (input.name === "roll_dice")
        return executeStatefulToolCall(root, input.name, args);
      if (isChatGptBattleOperationToolName(input.name)) {
        const resolved = resolvePublicBattleSelection(
          root,
          playSessionId,
          input.name,
          args,
        );
        return Result.isFailure(resolved)
          ? { content: resolved.failure, commandRetention: "skip" as const }
          : {
              content: CHATGPT_EXECUTION_TOOLS[input.name].handle(
                root,
                resolved.success,
              ),
              commandRetention: "retain" as const,
              retainedArguments: resolved.success,
            };
      }
      return {
        content: CHATGPT_EXECUTION_TOOLS[input.name].handle(root, args),
        commandRetention: "retain" as const,
      };
    },
  });
}
