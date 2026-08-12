import { writeFileSync } from "node:fs";
import { JSONSchema } from "effect";

import { ReviewOutputSchema } from "./review-contract.ts";

const outputPath = process.argv[2];
if (outputPath === undefined) {
  throw new Error("Usage: review-schema.ts <output-schema.json>");
}
writeFileSync(
  outputPath,
  `${JSON.stringify(JSONSchema.make(ReviewOutputSchema), null, 2)}\n`,
  "utf8",
);
