import { Option, Schema } from "effect";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import {
  SrdStatBlockRecordSchema,
  SrdUnitRecordSchema,
} from "@dnd/surface/surface/schema";
import { isSrd521Unit } from "@dnd/surface/surface/unit-catalog";

import type { McpApplicationServices } from "./composition-root.ts";
import {
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import {
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

export const inspectCatalogUnitToolName = "inspect_catalog_unit";

export const InspectCatalogUnitInputSchema = Schema.Struct({
  unitId: UnitId,
});

const InspectCatalogUnitOutputSchema = Schema.Struct({
  unitRecordJson: Schema.fromJsonString(SrdUnitRecordSchema),
});

export const inspectCatalogUnitToolDefinition = {
  name: inspectCatalogUnitToolName,
  title: "Inspect Catalog Unit",
  description:
    "Return the canonical installed redistributable SRD Unit record as unitRecordJson for one Unit id from list_catalog_units. Stat Blocks are a separate catalog: use inspect_stat_block with a statBlockId from list_stat_blocks. Parse that JSON for the complete authored detail; catalog detail is not a claim of source executability in any particular workflow.",
  inputSchema: mcpObjectJsonSchema(InspectCatalogUnitInputSchema),
  annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  outputSchema: mcpOutputJsonSchema(InspectCatalogUnitOutputSchema),
} as const satisfies ProtocolToolDefinition;

export type InspectCatalogUnitArgs = Schema.Schema.Type<
  typeof InspectCatalogUnitInputSchema
>;

export function handleInspectCatalogUnit(
  services: McpApplicationServices,
  args: InspectCatalogUnitArgs,
) {
  const unit = Option.filter(
    services.unitLibrary.getUnit(args.unitId),
    isSrd521Unit,
  );
  return Option.isSome(unit)
    ? schemaJsonContent(InspectCatalogUnitOutputSchema, {
        unitRecordJson: unit.value,
      })
    : errorContent(`Unknown installed SRD Unit: ${args.unitId}`, {
        code: "UNKNOWN_CATALOG_UNIT",
        unitId: args.unitId,
        recovery:
          "Call list_catalog_units and retry with one returned Unit id.",
      });
}

export const inspectStatBlockToolName = "inspect_stat_block";
export const InspectStatBlockInputSchema = Schema.Struct({
  statBlockId: StatBlockId,
});
const InspectStatBlockOutputSchema = Schema.Struct({
  statBlockRecordJson: Schema.fromJsonString(SrdStatBlockRecordSchema),
});
export const inspectStatBlockToolDefinition = {
  name: inspectStatBlockToolName,
  title: "Inspect Stat Block",
  description:
    "Read the complete canonical installed SRD Stat Block as statBlockRecordJson without selecting it or changing a Play Session. Use a statBlockId from list_stat_blocks. Unit ids from list_catalog_units belong to inspect_catalog_unit. Catalog detail does not imply workflow executability.",
  inputSchema: mcpObjectJsonSchema(InspectStatBlockInputSchema),
  annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  outputSchema: mcpOutputJsonSchema(InspectStatBlockOutputSchema),
} as const satisfies ProtocolToolDefinition;
export type InspectStatBlockArgs = Schema.Schema.Type<
  typeof InspectStatBlockInputSchema
>;
export function handleInspectStatBlock(
  services: McpApplicationServices,
  args: InspectStatBlockArgs,
) {
  const statBlock = services.statBlockCatalog.getStatBlock(args.statBlockId);
  return Option.isSome(statBlock)
    ? schemaJsonContent(InspectStatBlockOutputSchema, {
        statBlockRecordJson: statBlock.value,
      })
    : errorContent(`Unknown installed SRD Stat Block: ${args.statBlockId}`, {
        code: "UNKNOWN_STAT_BLOCK",
        statBlockId: args.statBlockId,
        recovery:
          "Call list_stat_blocks and retry with one returned statBlockId. Unit ids belong to inspect_catalog_unit.",
      });
}
