import { Schema } from "effect";
import {
  BATTLE_LIFECYCLE_OPERATION_SCHEMAS,
  battleLifecycleToolInputFromParsedOperation,
} from "../battle-lifecycle-tool-input.ts";
import { handleBattleLifecycleToolCall } from "../battle-lifecycle-tool.ts";
import { DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS } from "../tool-definition-contract.ts";
import { defineChatGptStatefulTool } from "./stateful-tool.ts";

export const CHATGPT_LIFECYCLE_EXECUTION_TOOLS = {
  add_combatant: defineChatGptStatefulTool({
    name: "add_combatant",
    selection: { family: "battleLifecycle", operation: "addCombatant" },
    schema: Schema.Struct({
      operation: BATTLE_LIFECYCLE_OPERATION_SCHEMAS.addCombatant,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleBattleLifecycleToolCall(
        root,
        battleLifecycleToolInputFromParsedOperation(args.operation),
      ),
  }),
  remove_combatant: defineChatGptStatefulTool({
    name: "remove_combatant",
    selection: { family: "battleLifecycle", operation: "removeCombatant" },
    schema: Schema.Struct({
      operation: BATTLE_LIFECYCLE_OPERATION_SCHEMAS.removeCombatant,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleBattleLifecycleToolCall(
        root,
        battleLifecycleToolInputFromParsedOperation(args.operation),
      ),
  }),
  apply_initiative_swap: defineChatGptStatefulTool({
    name: "apply_initiative_swap",
    selection: { family: "battleLifecycle", operation: "applyInitiativeSwap" },
    schema: Schema.Struct({
      operation: BATTLE_LIFECYCLE_OPERATION_SCHEMAS.applyInitiativeSwap,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleBattleLifecycleToolCall(
        root,
        battleLifecycleToolInputFromParsedOperation(args.operation),
      ),
  }),
  finalize_initial_initiative_setup: defineChatGptStatefulTool({
    name: "finalize_initial_initiative_setup",
    selection: {
      family: "battleLifecycle",
      operation: "finalizeInitialInitiativeSetup",
    },
    schema: Schema.Struct({
      operation:
        BATTLE_LIFECYCLE_OPERATION_SCHEMAS.finalizeInitialInitiativeSetup,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleBattleLifecycleToolCall(
        root,
        battleLifecycleToolInputFromParsedOperation(args.operation),
      ),
  }),
} as const;
