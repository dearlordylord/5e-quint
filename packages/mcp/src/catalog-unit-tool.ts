import { Option, Schema } from "effect";
import { UnitId } from "@dnd/shared/game-facts";
import { SrdUnitRecordSchema } from "@dnd/surface/surface/schema";
import { isSrd521Unit } from "@dnd/surface/surface/unit-catalog";

import type { McpCompositionRoot } from "./composition-root.ts";
import {
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

export const inspectCatalogUnitToolName = "inspect_catalog_unit";

export const InspectCatalogUnitInputSchema = Schema.Struct({
  unitId: UnitId,
});

const InspectCatalogUnitOutputSchema = Schema.Struct({
  unitRecordJson: Schema.parseJson(SrdUnitRecordSchema),
});

export const inspectCatalogUnitToolDefinition = {
  name: inspectCatalogUnitToolName,
  description:
    "Return the canonical installed redistributable SRD Unit record as unitRecordJson for one catalog id. Parse that JSON for the complete authored detail; catalog detail is not a claim of source executability in any particular workflow.",
  inputSchema: mcpObjectJsonSchema(InspectCatalogUnitInputSchema),
  outputSchema: mcpOutputJsonSchema(InspectCatalogUnitOutputSchema),
} as const;

export type InspectCatalogUnitArgs = Schema.Schema.Type<
  typeof InspectCatalogUnitInputSchema
>;

export function handleInspectCatalogUnit(
  root: McpCompositionRoot,
  args: InspectCatalogUnitArgs,
) {
  const unit = Option.filter(
    root.unitLibrary.getUnit(args.unitId),
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
