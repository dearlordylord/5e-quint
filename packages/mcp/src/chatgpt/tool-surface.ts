import { inlineCostlySchemaDefinitions } from "../json-schema-definition-inlining.ts";
import { factorObjectUnionConstraints } from "../json-schema-object-unions.ts";
import { simplifyLiteralSchemaConstraints } from "../json-schema-literals.ts";
import { Match } from "effect";
import type { McpToolSurface } from "../mcp-tool-surface.ts";
import { shareToolSchemaDefinitions } from "../json-schema-sharing.ts";
import { characterToolDefinitionsByName } from "../character-tool-definitions.ts";
import { battleToolDefinitionsByName } from "../battle-tool-definitions.ts";
import { contentToolDefinitionsByName } from "../content-tools.ts";
import { diceToolDefinitionsByName } from "../dice-tool-definitions.ts";
import {
  type PlaySessionToolName,
  playSessionToolDefinitionsByName,
} from "../play-session-tool-contract.ts";
import { handleToolCall, handleApplicationToolCall } from "../server.ts";
import { isContentToolName } from "../content-tools.ts";
import type { ChatGptToolName } from "./operation-tool-plan.ts";
import type { ChatGptExecutionTool } from "./stateful-tool.ts";
import { CHATGPT_CHARACTER_EXECUTION_TOOLS } from "./character-execution-tools.ts";
import { CHATGPT_LIFECYCLE_EXECUTION_TOOLS } from "./lifecycle-execution-tools.ts";
import { CHATGPT_BATTLE_EXECUTION_TOOLS } from "./battle-tool-registration.ts";
import { chatGptBattleHoleTool } from "./battle-hole-tool.ts";
import type { ProtocolToolDefinition } from "../tool-definition-contract.ts";

type NamedDefinition<Name extends string> = ProtocolToolDefinition & {
  readonly name: Name;
};
function retainedTool<const Name extends ChatGptToolName>(
  definition: NamedDefinition<Name>,
  description: string = definition.description,
) {
  return {
    definition: { ...definition, description },
    handle: (root, args) =>
      isContentToolName(definition.name)
        ? handleApplicationToolCall(root, definition.name, args, "chatgpt")
        : handleToolCall(root, definition.name, args),
  } satisfies ChatGptExecutionTool;
}

export const CHATGPT_EXECUTION_TOOLS = {
  answer_battle_hole: chatGptBattleHoleTool,
  ...CHATGPT_CHARACTER_EXECUTION_TOOLS,
  ...CHATGPT_LIFECYCLE_EXECUTION_TOOLS,
  ...CHATGPT_BATTLE_EXECUTION_TOOLS,
  create_character_draft: retainedTool(
    characterToolDefinitionsByName.create_character_draft,
  ),
  discover_creation_holes: retainedTool(
    characterToolDefinitionsByName.discover_creation_holes,
  ),
  fill_creation_holes: retainedTool(
    characterToolDefinitionsByName.fill_creation_holes,
  ),
  finalize_character: retainedTool(
    characterToolDefinitionsByName.finalize_character,
  ),
  inspect_character_session: retainedTool(
    characterToolDefinitionsByName.inspect_character_session,
  ),
  list_characters: retainedTool(
    characterToolDefinitionsByName.list_characters,
    "List finalized characters in this Play Session, including characterId, Battle availability, and build-derived facts. Available rows include mutable sheet state, HP, Hit Dice, spell slots and feature resources. Use inspect_character_session for stored details and named query tools for calculated projections.",
  ),
  start_battle: retainedTool(
    battleToolDefinitionsByName.start_battle,
    "Start a Battle from finalized characters and SRD Stat Blocks. Supply Initiative scores for every combatant and a size when the Stat Block exposes alternatives. Choose initialSetup to keep Initiative setup open; continue with apply_initiative_swap and finalize_initial_initiative_setup.",
  ),
  end_battle: retainedTool(battleToolDefinitionsByName.end_battle),
  select_stat_block: retainedTool(
    battleToolDefinitionsByName.select_stat_block,
  ),
  read_battle_state: retainedTool(
    battleToolDefinitionsByName.read_battle_state,
  ),
  discover_battle_acts: retainedTool(
    battleToolDefinitionsByName.discover_battle_acts,
    "Read the current Battle checkpoint, frontier and available acts. The response's chatGptBattleOperations field lists named tools for each subject or Reaction choice. Select an Act with its named tool and subject, then supply ordinary facts through answer_battle_hole. Select a Reaction with its named tool and interruptDecision fill, without a subject and with choice.fills: []. Finish the current continuation before choosing another act.",
  ),
  describe_mcp_workflow: retainedTool(
    contentToolDefinitionsByName.describe_mcp_workflow,
  ),
  inspect_catalog_unit: retainedTool(
    contentToolDefinitionsByName.inspect_catalog_unit,
  ),
  list_catalog_units: retainedTool(
    contentToolDefinitionsByName.list_catalog_units,
  ),
  list_stat_blocks: retainedTool(contentToolDefinitionsByName.list_stat_blocks),
  roll_dice: retainedTool(diceToolDefinitionsByName.roll_dice),
} as const satisfies {
  readonly [Name in Exclude<
    ChatGptToolName,
    PlaySessionToolName
  >]: ChatGptExecutionTool & { readonly definition: NamedDefinition<Name> };
};

export const chatGptExecutionToolDefinitions = Object.values(
  CHATGPT_EXECUTION_TOOLS,
).map((tool) => tool.definition);
export function isChatGptExecutionToolName(
  name: string,
): name is keyof typeof CHATGPT_EXECUTION_TOOLS {
  return Object.hasOwn(CHATGPT_EXECUTION_TOOLS, name);
}

export const chatGptToolDefinitions = [
  ...Object.values(playSessionToolDefinitionsByName),
  ...chatGptExecutionToolDefinitions,
];

export function shareToolDefinitionsForSurface(
  definitions: readonly ProtocolToolDefinition[],
  surface: McpToolSurface,
): readonly ProtocolToolDefinition[] {
  return Match.value(surface).pipe(
    Match.when("regular", () => definitions),
    Match.when("chatgpt", () =>
      definitions.map(
        (definition): ProtocolToolDefinition => ({
          ...definition,
          inputSchema: {
            ...inlineCostlySchemaDefinitions(
              simplifyLiteralSchemaConstraints(
                factorObjectUnionConstraints(definition.inputSchema),
              ),
            ),
            type: "object",
          },
          ...(definition.outputSchema === undefined
            ? {}
            : {
                outputSchema: inlineCostlySchemaDefinitions(
                  simplifyLiteralSchemaConstraints(
                    factorObjectUnionConstraints(
                      shareToolSchemaDefinitions(definition.outputSchema),
                    ),
                  ),
                ),
              }),
        }),
      ),
    ),
    Match.exhaustive,
  );
}
