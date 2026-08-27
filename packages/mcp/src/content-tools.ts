import { Either, Match, Schema } from "effect";
import {
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceRefsSchema,
  StatBlockSpellReferenceSchema,
  StatBlockTextOnlyReasonSchema,
} from "@dnd/surface/surface/schema";
import type { UnitRecord } from "@dnd/surface/surface/types";

import type { McpApplicationServices } from "./composition-root.ts";
import {
  handleInspectCatalogUnit,
  inspectCatalogUnitToolDefinition,
  inspectCatalogUnitToolName,
  InspectCatalogUnitInputSchema,
  type InspectCatalogUnitArgs,
} from "./catalog-unit-tool.ts";
import { contentWorkflowGuide } from "./content-workflow-guide.ts";
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
  resultPaths: Schema.Record({ key: Schema.String, value: Schema.String }),
  acceptedInputs: Schema.Record({ key: Schema.String, value: Schema.String }),
  naturalLanguagePolicy: Schema.String,
  recovery: StringArraySchema,
  limits: StringArraySchema,
});
const UnitSummarySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
const ListCatalogUnitsOutputSchema = Schema.Struct({
  unitsByKind: Schema.Record({
    key: Schema.String,
    value: Schema.Array(UnitSummarySchema),
  }),
  naturalLanguagePolicy: Schema.String,
  next: Schema.String,
});
const StatBlockAttackSummarySchema = Schema.Struct({
  attackName: Schema.String,
  attackType: Schema.String,
  attackBonus: Schema.Number,
  reachFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  normalRangeFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  longRangeFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  onHit: StringArraySchema,
});
const StatBlockProcedureSectionOutputSchema = Schema.Literal(
  "action",
  "bonus_action",
  "reaction",
  "legendary_action",
);
const StatBlockProcedureKindOutputSchema = Schema.Literal(
  "attack_roll",
  "multiattack",
  "save",
  "support",
  "action_option",
  "spellcasting",
);
const StatBlockSpellcastingGroupSummarySchema = Schema.Struct({
  kind: Schema.Literal("at_will", "limited"),
  resourceRefs: StatBlockProcedureResourceRefsSchema,
  spells: Schema.NonEmptyArray(StatBlockSpellReferenceSchema),
});
const StatBlockExecutableProcedureSummarySchema = Schema.Struct({
  section: StatBlockProcedureSectionOutputSchema,
  procedureOrdinal: StatBlockProcedureOrdinalSchema,
  kind: Schema.Literal("executable"),
  procedureKind: StatBlockProcedureKindOutputSchema,
  name: Schema.String,
  resourceRefs: StatBlockProcedureResourceRefsSchema,
  spellcastingGroups: Schema.optionalWith(
    Schema.Array(StatBlockSpellcastingGroupSummarySchema),
    { exact: true },
  ),
});
const StatBlockTextOnlyProcedureSummarySchema = Schema.Struct({
  section: StatBlockProcedureSectionOutputSchema,
  procedureOrdinal: StatBlockProcedureOrdinalSchema,
  kind: Schema.Literal("textOnly"),
  name: Schema.String,
  description: Schema.String,
  reason: StatBlockTextOnlyReasonSchema,
  resourceRefs: StatBlockProcedureResourceRefsSchema,
});
const StatBlockProcedureSummarySchema = Schema.Union(
  StatBlockExecutableProcedureSummarySchema,
  StatBlockTextOnlyProcedureSummarySchema,
);
const StatBlockSummarySchema = Schema.Struct({
  statBlockId: Schema.String,
  name: Schema.String,
  creatureType: Schema.String,
  armorClass: Schema.Number,
  hitPoints: Schema.Number,
  initiativeModifier: Schema.Number,
  attacks: Schema.Array(StatBlockAttackSummarySchema),
  orderedProcedures: Schema.Array(StatBlockProcedureSummarySchema),
  damageVulnerabilities: StringArraySchema,
  damageResistances: StringArraySchema,
  damageResistanceChoices: StringArraySchema,
  damageImmunities: StringArraySchema,
  conditionImmunities: StringArraySchema,
  provenanceKind: Schema.String,
  provenanceSection: Schema.String,
});
const ListStatBlocksOutputSchema = Schema.Struct({
  statBlocks: Schema.Array(StatBlockSummarySchema),
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
} as const;
export const CONTENT_TOOL_NAMES = [
  contentToolNames.describeMcpWorkflow,
  contentToolNames.listStatBlocks,
  contentToolNames.listCatalogUnits,
  contentToolNames.inspectCatalogUnit,
] as const;
export type ContentToolName = (typeof CONTENT_TOOL_NAMES)[number];
type ContentToolCall =
  | {
      readonly name:
        | typeof contentToolNames.describeMcpWorkflow
        | typeof contentToolNames.listStatBlocks
        | typeof contentToolNames.listCatalogUnits;
      readonly args: Record<string, never>;
    }
  | {
      readonly name: typeof contentToolNames.inspectCatalogUnit;
      readonly args: InspectCatalogUnitArgs;
    };

export const contentToolDefinitions = [
  {
    name: contentToolNames.describeMcpWorkflow,
    title: "Describe MCP Workflow",
    description:
      "Return the agent-facing workflow guide, accepted fill shapes, result paths, supported intent aliases, and recovery rules for this MCP.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: workflowGuideOutputSchema,
  },
  {
    name: contentToolNames.listStatBlocks,
    title: "List Stat Blocks",
    description:
      "List every installed redistributable SRD Stat Block with ids, authored names, ordered procedure summaries (including retained text-only entries), attacks, defenses, and damage modifiers. Catalog presence does not imply that every source is executable in every workflow.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: listStatBlocksOutputSchema,
  },
  {
    name: contentToolNames.listCatalogUnits,
    title: "List Catalog Units",
    description:
      "List every installed redistributable SRD Unit id grouped by kind. This reports catalog presence only; legal and executable sources still come from the consuming workflow's canonical discovery result.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: listCatalogUnitsOutputSchema,
  },
  inspectCatalogUnitToolDefinition,
] as const satisfies readonly ProtocolToolDefinition[];

export type ContentToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isContentToolName(name: string): name is ContentToolName {
  return CONTENT_TOOL_NAMES.some((toolName) => toolName === name);
}

export function decodeContentToolCall(input: {
  readonly name: ContentToolName;
  readonly args: unknown;
}): Either.Either<ContentToolCall, ReturnType<typeof errorContent>> {
  return Match.value(input.name).pipe(
    Match.when(contentToolNames.describeMcpWorkflow, () =>
      Either.map(
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
      Either.map(
        decodeToolArgs(
          EmptyArgsSchema,
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
      Either.map(
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
      Either.map(
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
    Match.exhaustive,
  );
}

export function handleContentToolCall(
  services: McpApplicationServices,
  call: ContentToolCall,
): ContentToolResult {
  return Match.value(call).pipe(
    Match.when({ name: contentToolNames.describeMcpWorkflow }, () =>
      schemaJsonContent(WorkflowGuideOutputSchema, contentWorkflowGuide()),
    ),
    Match.when({ name: contentToolNames.listStatBlocks }, () =>
      schemaJsonContent(ListStatBlocksOutputSchema, {
        statBlocks: services.statBlockCatalog
          .listStatBlocks()
          .map((record) => statBlockSummary(record)),
        next: "Use these statBlockId values in start_battle statBlock combatants, or call select_stat_block to inspect one record.",
      }),
    ),
    Match.when({ name: contentToolNames.listCatalogUnits }, () =>
      schemaJsonContent(ListCatalogUnitsOutputSchema, {
        unitsByKind: groupUnitsByKind(services.unitLibrary.listUnits()),
        naturalLanguagePolicy:
          "Map user wording to returned Unit names and ids only when the intent is unambiguous. If a user says 'warrior', ask whether they mean Fighter before filling class_fighter.",
        next: "Use create_character_draft and discover_creation_holes for the authoritative holeId, optionId, and cardinality values before filling a draft.",
      }),
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
