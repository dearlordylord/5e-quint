import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { srdSurface } from "./surface-catalog.ts";
import {
  SRD_SURFACE_SCHEMA_BOUNDS,
  SRD_SURFACE_SCHEMA_SIZE,
} from "./publication-artifacts.ts";
import {
  decodeSrdSurfaceEither,
  decodeUnitRecordEither,
  readSurfaceSchemaRole,
  SrdProvenanceSchema,
  SrdSurfaceJsonSchema,
} from "./schema.ts";

describe("SRD Surface publication schema", () => {
  test("publishes distinct Unit and Stat Block collections", () => {
    expect(srdSurface.kind).toBe("srd-5.2.1-surface-catalog");
    expect(srdSurface.units.length).toBeGreaterThan(0);
    expect(srdSurface.statBlocks.length).toBeGreaterThan(0);
    expect(
      srdSurface.statBlocks.every((record) => record.kind === "statBlock"),
    ).toBe(true);
    expect(
      srdSurface.units.every(
        (record) => record.provenance.kind === "srd-5.2.1",
      ),
    ).toBe(true);
    expect(
      srdSurface.statBlocks.every(
        (record) => record.provenance.kind === "srd-5.2.1",
      ),
    ).toBe(true);
  });

  test("rejects non-SRD member provenance at the aggregate boundary", () => {
    const firstUnit = srdSurface.units[0];
    const result = decodeSrdSurfaceEither({
      ...srdSurface,
      units: [
        {
          ...firstUnit,
          provenance: { kind: "synthetic-test", section: "synthetic-test" },
        },
      ],
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("preserves the canonical provenance role while narrowing to SRD", () => {
    expect(
      readSurfaceSchemaRole(SrdProvenanceSchema.fields.section.ast),
    ).toEqual({ category: "provenance" });
  });

  test("rejects unknown properties instead of stripping them", () => {
    const firstUnit = srdSurface.units[0];
    const aggregateResult = decodeSrdSurfaceEither({
      ...srdSurface,
      units: [{ ...firstUnit, unknownProperty: true }],
    });
    const recordResult = decodeUnitRecordEither({
      ...firstUnit,
      unknownProperty: true,
    });

    expect(Either.isLeft(aggregateResult)).toBe(true);
    expect(Either.isLeft(recordResult)).toBe(true);
  });

  test("rejects empty or whitespace-only Unit ids", () => {
    const firstUnit = srdSurface.units[0];
    expect(
      Either.isLeft(decodeUnitRecordEither({ ...firstUnit, id: "" })),
    ).toBe(true);
    expect(
      Either.isLeft(decodeUnitRecordEither({ ...firstUnit, id: "   " })),
    ).toBe(true);
  });

  test("rejects empty catalog collections", () => {
    const result = decodeSrdSurfaceEither({
      ...srdSurface,
      units: [],
      statBlocks: [],
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("is Draft 2020-12 and closes generated object schemas", () => {
    expect(SrdSurfaceJsonSchema.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );

    const visit = (value: unknown, skipCurrentObjectClosure = false): void => {
      if (Array.isArray(value)) {
        value.forEach((entry) => visit(entry));
        return;
      }
      if (typeof value !== "object" || value === null) return;

      const record = value as Record<string, unknown>;
      if (record.type === "object" && !skipCurrentObjectClosure) {
        expect(record.additionalProperties).toBe(false);
      }
      Object.entries(record).forEach(([key, entry]) => {
        if (key === "allOf" && Array.isArray(entry)) {
          entry.forEach((member) => visit(member, true));
          return;
        }
        visit(entry);
      });
    };

    visit(SrdSurfaceJsonSchema);

    // JSONSchema.Root is a broad union; the preceding root-schema assertion
    // establishes the generated aggregate's object/properties shape here.
    const generated = SrdSurfaceJsonSchema as unknown as {
      readonly properties: {
        readonly units: { readonly items: Record<string, unknown> };
        readonly statBlocks: {
          readonly items: Record<string, unknown>;
        };
      };
    };
    expect(generated.properties.units.items.$ref).toBe(
      "#/$defs/SrdUnitPublicationEncoded",
    );
    expect(generated.properties.statBlocks.items.$ref).toBe(
      "#/$defs/SrdStatBlockPublicationEncoded",
    );
    expect(
      JSON.stringify(SrdSurfaceJsonSchema.$defs).includes('"srd-5.2.1"'),
    ).toBe(true);
  });

  test("keeps the published graph within its bounded named-reference shape", () => {
    const schema = SrdSurfaceJsonSchema as unknown as {
      readonly $defs: Readonly<Record<string, unknown>>;
    };

    expect(Object.keys(schema.$defs).length).toBe(
      SRD_SURFACE_SCHEMA_SIZE.definitions,
    );
    expect(SRD_SURFACE_SCHEMA_SIZE.definitions).toBeLessThan(
      SRD_SURFACE_SCHEMA_BOUNDS.definitions,
    );
    expect(SRD_SURFACE_SCHEMA_SIZE.bytes).toBeLessThan(
      SRD_SURFACE_SCHEMA_BOUNDS.bytes,
    );
  });
});
