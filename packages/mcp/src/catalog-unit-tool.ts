import { Option, Schema } from "effect";
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
  unitId: Schema.String,
});

const CatalogUnitDetailSchema = Schema.Unknown.annotations({
  jsonSchema: {
    type: "object",
    description:
      "The complete canonical installed SRD Unit record. Record-kind-specific authored fields remain present on the returned object.",
    required: ["id", "kind", "name", "provenance"],
    properties: {
      id: { type: "string" },
      kind: { type: "string" },
      name: { type: "string" },
      provenance: {
        type: "object",
        required: ["kind", "section"],
        properties: {
          kind: { type: "string", enum: ["srd-5.2.1"] },
          section: { type: "string" },
        },
      },
    },
  },
});

const InspectCatalogUnitOutputSchema = Schema.Struct({
  unit: CatalogUnitDetailSchema,
});

export const inspectCatalogUnitToolDefinition = {
  name: inspectCatalogUnitToolName,
  description:
    "Return the canonical installed redistributable SRD Unit record for one catalog id. The authored record is catalog detail, not a claim of source executability in any particular workflow.",
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
    ? schemaJsonContent(InspectCatalogUnitOutputSchema, { unit: unit.value })
    : errorContent(`Unknown installed SRD Unit: ${args.unitId}`, {
        code: "UNKNOWN_CATALOG_UNIT",
        unitId: args.unitId,
        recovery:
          "Call list_catalog_units and retry with one returned Unit id.",
      });
}
