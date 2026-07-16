import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { SRD_SURFACE_PUBLICATION_FILE_NAMES } from "./publication-artifacts.ts";

describe("committed SRD Surface publication", () => {
  test("compiles and validates with an independent Draft 2020-12 validator", () => {
    const schemaPath = fileURLToPath(
      new URL(
        `../../publication/${SRD_SURFACE_PUBLICATION_FILE_NAMES.schema}`,
        import.meta.url,
      ),
    );
    const aggregatePath = fileURLToPath(
      new URL(
        `../../publication/${SRD_SURFACE_PUBLICATION_FILE_NAMES.aggregate}`,
        import.meta.url,
      ),
    );
    const result = execFileSync(
      process.execPath,
      [
        "--max-old-space-size=512",
        "--input-type=module",
        "--eval",
        `
          import { readFileSync } from "node:fs";
          import Ajv2020 from "ajv/dist/2020.js";
          const schema = JSON.parse(readFileSync(${JSON.stringify(schemaPath)}, "utf8"));
          const aggregate = JSON.parse(readFileSync(${JSON.stringify(aggregatePath)}, "utf8"));
          // Effect's NonEmptyArray is emitted as a legal Draft 2020-12 tuple
          // (prefixItems plus items) without Ajv's optional strict-tuple
          // warning metadata. The published root collections use minItems(1)
          // directly in the canonical graph; validate the document under the
          // independent Draft 2020-12 implementation without that warning mode.
          const validate = new Ajv2020({ strict: false, inlineRefs: false, code: { optimize: 0 } }).compile(schema);
          if (!validate(aggregate)) {
            console.error(JSON.stringify(validate.errors));
            process.exit(1);
          }
          const withFirstUnit = (change) => ({
            ...aggregate,
            units: [change(aggregate.units[0]), ...aggregate.units.slice(1)],
          });
          const invalidCases = {
            unknownProperty: withFirstUnit((unit) => ({ ...unit, unknownProperty: true })),
            nonSrdProvenance: withFirstUnit((unit) => ({
              ...unit,
              provenance: { ...unit.provenance, kind: "synthetic-test" },
            })),
            emptyCollections: { ...aggregate, units: [], statBlocks: [] },
            statBlockInUnits: { ...aggregate, units: [aggregate.statBlocks[0]] },
            unitInStatBlocks: { ...aggregate, statBlocks: [aggregate.units[0]] },
          };
          for (const [name, invalid] of Object.entries(invalidCases)) {
            if (validate(invalid)) {
              console.error(name + " was accepted");
              process.exit(1);
            }
          }
          console.log("valid; rejected " + Object.keys(invalidCases).join(","));
        `,
      ],
      { encoding: "utf8", timeout: 120_000 },
    );

    expect(result.trim()).toBe(
      "valid; rejected unknownProperty,nonSrdProvenance,emptyCollections,statBlockInUnits,unitInStatBlocks",
    );
  }, 180_000);
});
