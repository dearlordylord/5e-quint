import {
  applyCharacterSessionOperationInputSchema,
  characterToolNames,
  characterSessionIdInputSchema,
  createCharacterDraftInputSchema,
  draftIdInputSchema,
  emptyInputSchema,
  fillCreationHolesInputSchema,
  finalizeCharacterInputSchema,
} from "./character-tool-input.ts";
import { queryCharacterSessionInputSchema } from "./character-session-query-tool-input.ts";
import {
  CharacterSessionDetailOutputSchema,
  CharacterSessionQueryOutputSchema,
  CharacterSessionOperationOutputSchema,
  CreationDraftOutputSchema,
  FillCreationHolesOutputSchema,
  FinalizeCharacterOutputSchema,
  ListCharactersOutputSchema,
} from "./character-tool-output.ts";
import { mcpOutputJsonSchema } from "./schema-codec.ts";
import {
  DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS,
  NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
export const characterToolDefinitions = [
  {
    name: characterToolNames.createCharacterDraft,
    description:
      "Create and store a character draft, then return its current creation holes and finalization status.",
    inputSchema: createCharacterDraftInputSchema,
    annotations: NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.discoverCreationHoles,
    description:
      "Return the current supported fillable creation holes, draft revision, and finalization status for a stored character draft. Every returned choice option is admitted by this server's active execution support profile.",
    inputSchema: draftIdInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.fillCreationHoles,
    description:
      "Submit an atomic batch of creation fills for a stored draft using option ids returned by its current holes. Accepted batches replace the stored draft; rejected batches leave it unchanged.",
    inputSchema: fillCreationHolesInputSchema,
    annotations: IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(FillCreationHolesOutputSchema),
  },
  {
    name: characterToolNames.finalizeCharacter,
    description:
      "Finalize a complete supported character draft. A ready finalization stores the resulting in-play record by characterId and removes the active draft. Druid Wild Shape drafts require selected known Beast Stat Block ids.",
    inputSchema: finalizeCharacterInputSchema,
    annotations: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(FinalizeCharacterOutputSchema),
  },
  {
    name: characterToolNames.applyCharacterSessionOperation,
    description:
      "Apply a supported durable character-session operation. Class-level advancement and Druid known-form replacement delegate existing level-gain and Wild Shape support facts to the runtime; companion creation, Lay On Hands and spell-based rest healing, atomic Short/Long Rest completion, composed Long Rest interruption/resumption with strictly increasing cumulativeRestedTicks boundaries, calendar-time Stable recovery, and feature-resource mutations delegate validation and state transitions to the Character Sheet runtime; MCP retains no rest intermediate state.",
    inputSchema: applyCharacterSessionOperationInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CharacterSessionOperationOutputSchema),
  },
  {
    name: characterToolNames.listCharacters,
    description:
      "List durable character-session display rows. Rows include build-derived HP, Hit Dice, Spell Slot, Pact Slot, and resource capacities plus mutable sheet state.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(ListCharactersOutputSchema),
  },
  {
    name: characterToolNames.inspectCharacterSession,
    description:
      "Inspect one selected Character Session as its canonical stored session plus core build-derived Hit Point, Hit Dice, Spell Slot, Pact Slot, and resource facts.",
    inputSchema: characterSessionIdInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CharacterSessionDetailOutputSchema),
  },
  {
    name: characterToolNames.queryCharacterSession,
    description:
      "Query one available Character Session through the existing Character Sheet ability, movement, defense, Spell Access, form, ritual, and Weapon Mastery projections.",
    inputSchema: queryCharacterSessionInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CharacterSessionQueryOutputSchema),
  },
] as const satisfies readonly ProtocolToolDefinition[];
