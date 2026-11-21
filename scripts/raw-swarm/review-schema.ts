import { jsonSchemaDocument } from "../../packages/shared/src/json-schema.ts";
import { writeFileSync } from "node:fs";
import { JsonSchema } from "effect";

import { ReviewOutputSchema } from "./review-contract.ts";

const outputPath = process.argv[2];
if (outputPath === undefined) {
  throw new Error("Usage: review-schema.ts <output-schema.json>");
}
writeFileSync(
  outputPath,
  `${JSON.stringify(
    (() => {
      const document = JsonSchema.toDocumentDraft07(
        jsonSchemaDocument(ReviewOutputSchema),
      );
      return {
        $schema: JsonSchema.META_SCHEMA_URI_DRAFT_07,
        ...document.schema,
        ...(Object.keys(document.definitions).length === 0
          ? {}
          : { definitions: document.definitions }),
      };
    })(),
    null,
    2,
  )}\n`,
  "utf8",
);
