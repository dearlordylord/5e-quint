import { workflowGuide } from "./workflow-guide.ts";
import type { McpToolSurface } from "./mcp-tool-surface.ts";
import { Match, Result, Schema } from "effect";
import { ChallengeRatingSchema, SizeSchema } from "@dnd/surface/surface/schema";
import type { UnitRecord } from "@dnd/surface/surface/types";

import type { McpApplicationServices } from "./composition-root.ts";
import {
  handleInspectCatalogUnit,
  handleInspectStatBlock,
  inspectStatBlockToolDefinition,
  inspectStatBlockToolName,
  InspectStatBlockInputSchema,
  type InspectStatBlockArgs,
  inspectCatalogUnitToolDefinition,
  inspectCatalogUnitToolName,
  InspectCatalogUnitInputSchema,
  type InspectCatalogUnitArgs,
} from "./catalog-unit-tool.ts";
import { statBlockSummary } from "./stat-block-content-projection.ts";
export { statBlockSummary } from "./stat-block-content-projection.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import {
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

const EmptyArgsSchema = Schema.Struct({});
const StringArraySchema = Schema.Array(Schema.String);
const WorkflowGuideOutputSchema = Schema.Struct({
  lifecycle: StringArraySchema,
  resultPaths: Schema.Record(Schema.String, Schema.String),
  acceptedInputs: Schema.Record(Schema.String, Schema.String),
  selectionPolicies: Schema.Record(Schema.String, Schema.String),
  naturalLanguagePolicy: Schema.String,
  recovery: StringArraySchema,
  limits: StringArraySchema,
});
const UnitSummarySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
const ListCatalogUnitsOutputSchema = Schema.Struct({
  unitsByKind: Schema.Record(Schema.String, Schema.Array(UnitSummarySchema)),
  naturalLanguagePolicy: Schema.String,
  next: Schema.String,
});
const StatBlockSizeSummarySchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    size: SizeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("alternatives"),
    options: Schema.NonEmptyArray(SizeSchema),
  }),
]);
const StatBlockDiscoveryEntrySchema = Schema.Struct({
  statBlockId: Schema.String,
  name: Schema.String,
  size: StatBlockSizeSummarySchema,
  creatureType: Schema.String,
  challengeRating: ChallengeRatingSchema,
  armorClass: Schema.Number,
  hitPoints: Schema.Number,
  initiativeModifier: Schema.Number,
});
const DEFAULT_STAT_BLOCK_PAGE_SIZE = 20;
const MAX_STAT_BLOCK_PAGE_SIZE = 50;
const CatalogOffsetSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
).pipe(Schema.brand("StatBlockCatalogOffset"));
const ListStatBlocksInputSchema = Schema.Struct({
  query: Schema.optionalKey(
    Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
      Schema.brand("StatBlockCatalogQuery"),
    ),
  ),
  offset: Schema.optionalKey(CatalogOffsetSchema),
  limit: Schema.optionalKey(
    Schema.Number.check(
      Schema.isInt(),
      Schema.isBetween({ minimum: 1, maximum: MAX_STAT_BLOCK_PAGE_SIZE }),
    ).pipe(Schema.brand("StatBlockCatalogPageSize")),
  ),
});
const ListStatBlocksOutputSchema = Schema.Struct({
  statBlocks: Schema.Array(StatBlockDiscoveryEntrySchema),
  total: Schema.Number,
  nextOffset: Schema.NullOr(Schema.Number),
  next: Schema.String,
});

const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
const workflowGuideOutputSchema = mcpOutputJsonSchema(
  WorkflowGuideOutputSchema,
);
const listStatBlocksOutputSchema = mcpOutputJsonSchema(
  ListStatBlocksOutputSchema,
);
const listCatalogUnitsOutputSchema = mcpOutputJsonSchema(
  ListCatalogUnitsOutputSchema,
);

export const contentToolNames = {
  describeMcpWorkflow: "describe_mcp_workflow",
  listStatBlocks: "list_stat_blocks",
  listCatalogUnits: "list_catalog_units",
  inspectCatalogUnit: inspectCatalogUnitToolName,
  inspectStatBlock: inspectStatBlockToolName,
} as const;
export const CONTENT_TOOL_NAMES = [
  contentToolNames.describeMcpWorkflow,
  contentToolNames.listStatBlocks,
  contentToolNames.listCatalogUnits,
  contentToolNames.inspectCatalogUnit,
  contentToolNames.inspectStatBlock,
] as const;
export type ContentToolName = (typeof CONTENT_TOOL_NAMES)[number];
type ContentToolCall =
  | {
      readonly name: typeof contentToolNames.inspectStatBlock;
      readonly args: InspectStatBlockArgs;
    }
  | {
      readonly name:
        | typeof contentToolNames.describeMcpWorkflow
        | typeof contentToolNames.listCatalogUnits;
      readonly args: Record<string, never>;
    }
  | {
      readonly name: typeof contentToolNames.listStatBlocks;
      readonly args: typeof ListStatBlocksInputSchema.Type;
    }
  | {
      readonly name: typeof contentToolNames.inspectCatalogUnit;
      readonly args: InspectCatalogUnitArgs;
    };

export const contentToolDefinitionsByName = {
  [contentToolNames.describeMcpWorkflow]: {
    name: contentToolNames.describeMcpWorkflow,
    title: "Describe MCP Workflow",
    description:
      "Return the agent-facing workflow guide, accepted fill shapes, result paths, supported intent aliases, and recovery rules for this MCP.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: workflowGuideOutputSchema,
  },
  [contentToolNames.listStatBlocks]: {
    name: contentToolNames.listStatBlocks,
    title: "List Stat Blocks",
    description:
      "Find installed redistributable SRD Stat Blocks by an optional case-insensitive name or id substring. Returns encounter selection facts including Challenge Rating, Size, AC, HP, and Initiative, with at most 20 entries by default or 50 with limit. Follow nextOffset with the same query to read another page; null means complete. Call inspect_stat_block with a returned statBlockId for attacks, procedures, defenses, and other detail. Catalog presence does not imply that every source is executable in every workflow.",
    inputSchema: mcpObjectJsonSchema(ListStatBlocksInputSchema),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: listStatBlocksOutputSchema,
  },
  [contentToolNames.listCatalogUnits]: {
    name: contentToolNames.listCatalogUnits,
    title: "List Catalog Units",
    description:
      "List every installed redistributable SRD Unit id grouped by kind. This reports catalog presence only; legal and executable sources still come from the consuming workflow's canonical discovery result.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: listCatalogUnitsOutputSchema,
  },
  [inspectCatalogUnitToolDefinition.name]: inspectCatalogUnitToolDefinition,
  [inspectStatBlockToolDefinition.name]: inspectStatBlockToolDefinition,
} as const satisfies Readonly<Record<string, ProtocolToolDefinition>>;
export const contentToolDefinitions = Object.values(
  contentToolDefinitionsByName,
);

export type ContentToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isContentToolName(name: string): name is ContentToolName {
  return CONTENT_TOOL_NAMES.some((toolName) => toolName === name);
}

export function decodeContentToolCall(input: {
  readonly name: ContentToolName;
  readonly args: unknown;
}): Result.Result<ContentToolCall, ReturnType<typeof errorContent>> {
  return Match.value(input.name).pipe(
    Match.when(contentToolNames.describeMcpWorkflow, () =>
      Result.map(
        decodeToolArgs(
          EmptyArgsSchema,
          input.args,
          contentToolNames.describeMcpWorkflow,
        ),
        (args) => ({
          name: contentToolNames.describeMcpWorkflow,
          args,
        }),
      ),
    ),
    Match.when(contentToolNames.listStatBlocks, () =>
      Result.map(
        decodeToolArgs(
          ListStatBlocksInputSchema,
          input.args,
          contentToolNames.listStatBlocks,
        ),
        (args) => ({
          name: contentToolNames.listStatBlocks,
          args,
        }),
      ),
    ),
    Match.when(contentToolNames.listCatalogUnits, () =>
      Result.map(
        decodeToolArgs(
          EmptyArgsSchema,
          input.args,
          contentToolNames.listCatalogUnits,
        ),
        (args) => ({
          name: contentToolNames.listCatalogUnits,
          args,
        }),
      ),
    ),
    Match.when(contentToolNames.inspectCatalogUnit, () =>
      Result.map(
        decodeToolArgs(
          InspectCatalogUnitInputSchema,
          input.args,
          contentToolNames.inspectCatalogUnit,
        ),
        (args) => ({
          name: contentToolNames.inspectCatalogUnit,
          args,
        }),
      ),
    ),
    Match.when(contentToolNames.inspectStatBlock, () =>
      Result.map(
        decodeToolArgs(
          InspectStatBlockInputSchema,
          input.args,
          contentToolNames.inspectStatBlock,
        ),
        (args) => ({ name: contentToolNames.inspectStatBlock, args }),
      ),
    ),
    Match.exhaustive,
  );
}

export function handleContentToolCall(
  services: McpApplicationServices,
  call: ContentToolCall,
  toolSurface: McpToolSurface = "regular",
): ContentToolResult {
  return Match.value(call).pipe(
    Match.when({ name: contentToolNames.describeMcpWorkflow }, () =>
      schemaJsonContent(WorkflowGuideOutputSchema, workflowGuide(toolSurface)),
    ),
    Match.when({ name: contentToolNames.listStatBlocks }, ({ args }) => {
      const query = args.query?.toLocaleLowerCase("en-US");
      const records = services.statBlockCatalog
        .listStatBlocks()
        .filter(
          (record) =>
            query === undefined ||
            record.name.toLocaleLowerCase("en-US").includes(query) ||
            record.id.toLocaleLowerCase("en-US").includes(query),
        )
        .sort((left, right) => left.id.localeCompare(right.id));
      const offset = args.offset ?? 0;
      const limit = args.limit ?? DEFAULT_STAT_BLOCK_PAGE_SIZE;
      const page = records.slice(offset, offset + limit);
      return schemaJsonContent(ListStatBlocksOutputSchema, {
        statBlocks: page.map((record) => {
          const summary = statBlockSummary(record);
          return {
            statBlockId: summary.statBlockId,
            name: summary.name,
            size: summary.size,
            creatureType: summary.creatureType,
            challengeRating: record.challengeRating,
            armorClass: summary.armorClass,
            hitPoints: summary.hitPoints,
            initiativeModifier: summary.initiativeModifier,
          };
        }),
        total: records.length,
        nextOffset:
          offset + page.length < records.length ? offset + page.length : null,
        next: "Use a returned statBlockId in start_battle, or call inspect_stat_block to read its complete combat details. Follow nextOffset with the same query while it is non-null. For alternative Sizes, pass one returned option as the combatant size.",
      });
    }),
    Match.when({ name: contentToolNames.listCatalogUnits }, () =>
      schemaJsonContent(ListCatalogUnitsOutputSchema, {
        unitsByKind: groupUnitsByKind(services.unitLibrary.listUnits()),
        naturalLanguagePolicy:
          "Map user wording to returned Unit names and ids only when the intent is unambiguous. If a user says 'warrior', ask whether they mean Fighter before filling class_fighter.",
        next: "Use create_character_draft and get_character_creation_choices for the authoritative holeId, optionId, and cardinality values before filling a draft.",
      }),
    ),
    Match.when({ name: contentToolNames.inspectStatBlock }, ({ args }) =>
      handleInspectStatBlock(services, args),
    ),
    Match.when({ name: contentToolNames.inspectCatalogUnit }, ({ args }) =>
      handleInspectCatalogUnit(services, args),
    ),
    Match.exhaustive,
  );
}

function groupUnitsByKind(units: readonly UnitRecord[]) {
  const groups: Record<
    string,
    Array<{ readonly id: string; readonly name: string }>
  > = {};
  for (const unit of units) {
    const kind = unit.kind;
    groups[kind] ??= [];
    groups[kind].push({ id: unit.id, name: unit.name });
  }
  return Object.fromEntries(
    Object.entries(groups).map(([kind, values]) => [
      kind,
      values.sort((left, right) =>
        String(left.id).localeCompare(String(right.id)),
      ),
    ]),
  );
}
