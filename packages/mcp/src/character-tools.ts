import type { CharacterId } from "@dnd/battle-runtime";
import {
  ABILITY_SCORE_GENERATION_DRAFT_PATH,
  CHARACTER_DRAFT_CHOICE_PATHS,
  LOADOUT_SLOTS,
  SUPPORTED_ABILITY_SCORE_METHODS,
  UNIT_CHOICE_KEYS,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  characterBuildHitPoints,
  type CharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Match, Schema } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import {
  availableCharacterSession,
  characterIdFromDraftId,
  characterBattleSpellSlots,
  characterSessionCurrentHp,
  type CharacterSession,
} from "./session-store.ts";
import {
  CHARACTER_TOOL_NAMES,
  characterToolNames,
  createCharacterDraftInputSchema,
  draftIdInputSchema,
  emptyInputSchema,
  fillCreationHolesInputSchema,
  type CharacterToolCall,
  type CharacterToolName,
} from "./character-tool-input.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

const JsonObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});
const McpSessionSnapshotSchema = Schema.Struct({
  draftIds: Schema.Array(Schema.String),
  characterIds: Schema.Array(Schema.String),
  selectedStatBlockId: Schema.Union(Schema.String, Schema.Null),
  activeBattle: Schema.Union(
    Schema.Struct({
      battleId: Schema.String,
      currentActorId: Schema.String,
    }),
    Schema.Null,
  ),
  transientBattleFills: Schema.Union(JsonObjectSchema, Schema.Null),
});
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);
const DraftChoiceCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("draft"),
  path: Schema.Literal(...CHARACTER_DRAFT_CHOICE_PATHS),
});
const AbilityScoresCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("draft"),
  path: Schema.Literal(ABILITY_SCORE_GENERATION_DRAFT_PATH),
});
const UnitChoiceCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("unitChoice"),
  unitId: Schema.String,
  choiceKey: Schema.Literal(...UNIT_CHOICE_KEYS),
});
const LoadoutCreationHoleSourceSchema = Schema.Struct({
  tag: Schema.Literal("loadout"),
  equipmentUnitId: Schema.String,
  slot: Schema.Literal(...LOADOUT_SLOTS),
});
const ChoiceCreationHoleSourceSchema = Schema.Union(
  DraftChoiceCreationHoleSourceSchema,
  UnitChoiceCreationHoleSourceSchema,
  LoadoutCreationHoleSourceSchema,
);
const CreationChoiceOptionSchema = Schema.Struct({
  optionId: Schema.String,
  label: Schema.String,
  unitRef: Schema.optionalWith(Schema.Struct({ unitId: Schema.String }), {
    exact: true,
  }),
});
const ChoiceCardinalitySchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("exactly"),
    count: PositiveIntegerSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("between"),
    min: NonNegativeIntegerSchema,
    max: PositiveIntegerSchema,
  }),
);
const CreationHoleSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    holeId: Schema.String,
    source: ChoiceCreationHoleSourceSchema,
    cardinality: ChoiceCardinalitySchema,
    options: Schema.Array(CreationChoiceOptionSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityScores"),
    holeId: Schema.String,
    source: AbilityScoresCreationHoleSourceSchema,
    methods: Schema.Array(Schema.Literal(...SUPPORTED_ABILITY_SCORE_METHODS)),
  }),
);
const CreationFinalizationIssueSchema = Schema.Struct({
  tag: Schema.String,
  code: Schema.String,
  message: Schema.String,
});
const CreationFinalizationSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("ready"),
    build: JsonObjectSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("incomplete"),
    holes: Schema.NonEmptyArray(CreationHoleSchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    issues: Schema.NonEmptyArray(CreationFinalizationIssueSchema),
  }),
);
const CharacterSessionRowSchema = Schema.Union(
  Schema.Struct({
    characterId: Schema.String,
    status: Schema.Literal("available"),
    displayName: Schema.String,
    build: JsonObjectSchema,
    hitPoints: Schema.Struct({
      current: Schema.Number,
      maximum: Schema.Number,
      state: JsonObjectSchema,
    }),
    spellSlots: Schema.optionalWith(Schema.Array(JsonObjectSchema), {
      exact: true,
    }),
  }),
  Schema.Struct({
    characterId: Schema.String,
    status: Schema.Literal("inBattle"),
    displayName: Schema.Null,
    build: JsonObjectSchema,
    battleId: Schema.String,
  }),
);
const CreationFillResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("accepted"),
    draft: JsonObjectSchema,
    holes: Schema.Array(CreationHoleSchema),
    finalization: CreationFinalizationSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    draft: JsonObjectSchema,
    holes: Schema.Array(CreationHoleSchema),
    issues: Schema.NonEmptyArray(JsonObjectSchema),
    finalization: CreationFinalizationSchema,
  }),
);
const CreationDraftOutputSchema = Schema.Struct({
  draft: JsonObjectSchema,
  holes: Schema.Array(CreationHoleSchema),
  finalization: CreationFinalizationSchema,
  session: McpSessionSnapshotSchema,
});
const FillCreationHolesOutputSchema = Schema.Struct({
  result: CreationFillResultSchema,
  storedDraft: JsonObjectSchema,
  session: McpSessionSnapshotSchema,
});
const FinalizeCharacterOutputSchema = Schema.Struct({
  draftId: Schema.String,
  finalization: CreationFinalizationSchema,
  build: Schema.Union(JsonObjectSchema, Schema.Null),
  session: McpSessionSnapshotSchema,
});
const ListCharactersOutputSchema = Schema.Struct({
  characters: Schema.Array(CharacterSessionRowSchema),
  session: McpSessionSnapshotSchema,
});
type CharacterSessionRow = Schema.Schema.Type<typeof CharacterSessionRowSchema>;

export const characterToolDefinitions = [
  {
    name: characterToolNames.createCharacterDraft,
    description:
      "Create and store a character draft, then return its current creation holes and finalization status.",
    inputSchema: createCharacterDraftInputSchema,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.discoverCreationHoles,
    description:
      "Return the current fillable creation holes, draft revision, and finalization status for a stored character draft.",
    inputSchema: draftIdInputSchema,
    outputSchema: mcpOutputJsonSchema(CreationDraftOutputSchema),
  },
  {
    name: characterToolNames.fillCreationHoles,
    description:
      "Submit an atomic batch of creation fills for a stored draft. Accepted batches replace the stored draft; rejected batches leave it unchanged.",
    inputSchema: fillCreationHolesInputSchema,
    outputSchema: mcpOutputJsonSchema(FillCreationHolesOutputSchema),
  },
  {
    name: characterToolNames.finalizeCharacter,
    description:
      "Finalize a complete supported character draft. A ready finalization stores the resulting in-play record by characterId and removes the active draft.",
    inputSchema: draftIdInputSchema,
    outputSchema: mcpOutputJsonSchema(FinalizeCharacterOutputSchema),
  },
  {
    name: characterToolNames.listCharacters,
    description:
      "List durable character-session records. Monster Stat Blocks and live battle combatants are not character-list rows.",
    inputSchema: emptyInputSchema,
    outputSchema: mcpOutputJsonSchema(ListCharactersOutputSchema),
  },
] as const;

export type CharacterToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isCharacterToolName(name: string): name is CharacterToolName {
  return CHARACTER_TOOL_NAMES.some((toolName) => toolName === name);
}

export function handleCharacterToolCall(
  root: McpCompositionRoot,
  call: CharacterToolCall,
): CharacterToolResult {
  return Match.value(call).pipe(
    Match.when({ name: characterToolNames.createCharacterDraft }, (matched) => {
      const draft = createCharacterDraft({
        unitLibrary: root.unitLibrary,
        ...(matched.args.draftId == null
          ? {}
          : { draftId: matched.args.draftId }),
      });
      if (root.sessionStore.drafts.has(draft.draftId)) {
        return duplicateDraftIdContent(draft.draftId, "activeDraft");
      }
      if (draftCharacterIdAlreadyReserved(root, draft.draftId)) {
        return duplicateDraftIdContent(draft.draftId, "activeDraft");
      }
      if (
        root.sessionStore.characters.has(characterIdFromDraftId(draft.draftId))
      ) {
        return duplicateDraftIdContent(draft.draftId, "finalizedSession");
      }
      root.sessionStore.drafts.set(draft.draftId, draft);
      return schemaJsonContent(
        CreationDraftOutputSchema,
        creationDraftPayload(root, draft),
      );
    }),
    Match.when(
      { name: characterToolNames.discoverCreationHoles },
      (matched) => {
        const draft = root.sessionStore.drafts.get(matched.args.draftId);
        if (draft == null) return unknownDraftContent(matched.args.draftId);
        return schemaJsonContent(
          CreationDraftOutputSchema,
          creationDraftPayload(root, draft),
        );
      },
    ),
    Match.when({ name: characterToolNames.fillCreationHoles }, (matched) => {
      const input = matched.args;
      const draft = root.sessionStore.drafts.get(input.draftId);
      if (draft == null) {
        return unknownDraftContent(input.draftId);
      }
      const result = fillCreationHoles({
        draft,
        unitLibrary: root.unitLibrary,
        expectedRevision: input.expectedRevision,
        fills: input.fills,
      });

      if (result.tag === "accepted") {
        root.sessionStore.drafts.set(result.draft.draftId, result.draft);
      }

      return schemaJsonContent(FillCreationHolesOutputSchema, {
        result,
        storedDraft:
          root.sessionStore.drafts.get(input.draftId) ?? result.draft,
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.when({ name: characterToolNames.finalizeCharacter }, (matched) => {
      const draftId = matched.args.draftId;
      const draft = root.sessionStore.drafts.get(draftId);
      if (draft == null) return unknownDraftContent(draftId);

      const finalization = finalizeCharacterDraft({
        draft,
        unitLibrary: root.unitLibrary,
      });
      const finalizedCharacterId = characterIdFromDraftId(draftId);
      if (finalization.tag === "ready") {
        const hitPoints = characterBuildHitPoints(
          finalization.build,
          root.unitLibrary,
        );
        if (Either.isLeft(hitPoints)) {
          return errorContent("Character finalization session failed.", {
            code: "CHARACTER_SESSION_INVALID",
            message: hitPoints.left.map((issue) => issue.message).join("; "),
          });
        }
        const session = availableCharacterSession({
          characterId: finalizedCharacterId,
          build: finalization.build,
          currentHp: Hp(hitPoints.right.maximum),
        });
        if (Either.isLeft(session)) {
          return errorContent("Character finalization session failed.", {
            code: "CHARACTER_SESSION_INVALID",
            message: session.left.message,
          });
        }
        root.sessionStore.characters.set(session.right);
        root.sessionStore.drafts.delete(draftId);
      }

      return schemaJsonContent(FinalizeCharacterOutputSchema, {
        draftId,
        finalization,
        build:
          finalization.tag === "ready"
            ? (root.sessionStore.characters.get(finalizedCharacterId)?.build ??
              null)
            : null,
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.when({ name: characterToolNames.listCharacters }, () => {
      const rows = characterListRows(root);
      if (Either.isLeft(rows)) {
        return errorContent("Character list projection failed.", {
          code: "CHARACTER_LIST_INVALID",
          message: rows.left,
        });
      }
      return schemaJsonContent(ListCharactersOutputSchema, {
        characters: rows.right,
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.exhaustive,
  );
}

function unknownDraftContent(draftId: CharacterDraftId) {
  return errorContent(`Unknown character draft: ${draftId}`, {
    code: "UNKNOWN_CHARACTER_DRAFT",
    draftId,
  });
}

function duplicateDraftIdContent(
  draftId: CharacterDraftId,
  existingOwner: "activeDraft" | "finalizedSession",
) {
  return errorContent(`Character draft id already exists: ${draftId}`, {
    code: "DUPLICATE_CHARACTER_DRAFT_ID",
    draftId,
    existingOwner,
  });
}

function draftCharacterIdAlreadyReserved(
  root: McpCompositionRoot,
  draftId: CharacterDraftId,
): boolean {
  const candidateCharacterId = characterIdFromDraftId(draftId);
  return Array.from(root.sessionStore.drafts.keys()).some(
    (activeDraftId) =>
      characterIdFromDraftId(activeDraftId) === candidateCharacterId,
  );
}

function creationDraftPayload(root: McpCompositionRoot, draft: CharacterDraft) {
  return {
    draft,
    holes: discoverCreationHoles({
      draft,
      unitLibrary: root.unitLibrary,
    }),
    finalization: finalizeCharacterDraft({
      draft,
      unitLibrary: root.unitLibrary,
    }),
    session: root.sessionStore.snapshot(),
  };
}

function characterListRows(
  root: McpCompositionRoot,
): Either.Either<readonly CharacterSessionRow[], string> {
  const rows: CharacterSessionRow[] = [];
  for (const [characterId, session] of root.sessionStore.characters.entries()) {
    const row = characterListRow(root.unitLibrary, characterId, session);
    if (Either.isLeft(row)) return Either.left(row.left);
    rows.push(row.right);
  }
  return Either.right(rows);
}

function characterListRow(
  unitLibrary: UnitCatalog,
  characterId: CharacterId,
  session: CharacterSession,
): Either.Either<CharacterSessionRow, string> {
  if (session.tag === "available") {
    const hitPoints = characterBuildHitPoints(session.build, unitLibrary);
    if (Either.isLeft(hitPoints)) {
      return Either.left(
        hitPoints.left.map((issue) => issue.message).join("; "),
      );
    }
    return Either.right({
      characterId,
      status: session.tag,
      displayName: characterBuildDisplayName(unitLibrary, session.build),
      build: session.build,
      hitPoints: {
        current: characterSessionCurrentHp(session),
        maximum: hitPoints.right.maximum,
        state: session.hitPoints,
      },
      ...(characterBattleSpellSlots(session) === undefined
        ? {}
        : { spellSlots: characterBattleSpellSlots(session) }),
    });
  }

  return Either.right({
    characterId,
    status: session.tag,
    displayName: null,
    build: session.build,
    battleId: session.battleId,
  });
}
