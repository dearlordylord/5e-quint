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
  NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

export const characterToolDefinitions = [
  {
    name: characterToolNames.createCharacterDraft,
    title: "Create Character Draft",
    description:
      "Begin creating a character in this Play Session by storing a new draft and returning its draftId, unanswered creation choices, revision, and finalization status. Continue with fill_creation_holes, then finalize_character when ready; use discover_creation_holes to resume an existing draft. Omitting draftId creates a new draft on each call; an id already used by a draft or finalized character is rejected.",
    inputSchema: createCharacterDraftInputSchema,
    annotations: NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.discoverCreationHoles,
    title: "Discover Creation Holes",
    description:
      "Return the current supported fillable creation holes, draft revision, and finalization status for a stored character draft. Every returned choice option is admitted by this server's active execution support profile.",
    inputSchema: draftIdInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.fillCreationHoles,
    title: "Fill Creation Holes",
    description:
      "Submit an atomic batch of creation fills for a stored draft using option ids returned by its current holes. Accepted batches replace the stored draft; rejected batches leave it unchanged.",
    inputSchema: fillCreationHolesInputSchema,
    annotations: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(FillCreationHolesOutputSchema),
  },
  {
    name: characterToolNames.finalizeCharacter,
    title: "Finalize Character",
    description:
      "Finalize a complete supported character draft. A ready finalization stores the resulting in-play record by characterId and removes the active draft. Druid Wild Shape drafts require selected known Beast Stat Block ids.",
    inputSchema: finalizeCharacterInputSchema,
    annotations: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(FinalizeCharacterOutputSchema),
  },
  {
    name: characterToolNames.applyCharacterSessionOperation,
    title: "Apply Character Operation",
    description:
      "Update a finalized character outside Battle: change equipment or levels, manage forms and companions, apply healing or rests, advance recovery time, or spend and convert resources. Choose one operation.kind and its matching fields; every affected Character Session must be available in this Play Session. Returns character state and, when applicable, an operation result; calendar-time recovery may request dice fills. Changes can consume resources and are not safe to repeat blindly. Use query_character_session for read-only projections, creation tools for drafts, and Battle tools for in-Battle actions.",
    inputSchema: applyCharacterSessionOperationInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CharacterSessionOperationOutputSchema),
  },
  {
    name: characterToolNames.listCharacters,
    title: "List Characters",
    description:
      "List all finalized characters in this Play Session, including characterId, Battle availability, and build-derived facts. Available rows include mutable sheet state, current and maximum HP, Hit Dice, spell slots, Pact Slots, and feature resources; characters in Battle are marked unavailable, and unfinished drafts are excluded. Use a returned characterId with inspect_character_session for stored details or query_character_session for a calculated projection.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(ListCharactersOutputSchema),
  },
  {
    name: characterToolNames.inspectCharacterSession,
    title: "Inspect Character Session",
    description:
      "Inspect one selected Character Session as its canonical stored session plus core build-derived Hit Point, Hit Dice, Spell Slot, Pact Slot, and resource facts.",
    inputSchema: characterSessionIdInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CharacterSessionDetailOutputSchema),
  },
  {
    name: characterToolNames.queryCharacterSession,
    title: "Query Character Session",
    description:
      "Read one calculated result for a finalized character outside Battle without changing its state. Choose query.kind for ability-check abilities or jump abilities, proficiency, linked speeds, Armor Class, spell access, known forms, rituals, or Weapon Mastery, and supply only that variant's fields. The character must be available in this Play Session. Use inspect_character_session for stored character and core sheet facts, or apply_character_session_operation to change it.",
    inputSchema: queryCharacterSessionInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(CharacterSessionQueryOutputSchema),
  },
] as const satisfies readonly ProtocolToolDefinition[];
