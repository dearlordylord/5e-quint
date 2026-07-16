import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  SRD_SURFACE_PUBLICATION_ARTIFACT_BYTES,
  SRD_SURFACE_PUBLICATION_FILE_NAMES,
} from "../packages/surface/src/surface/publication-artifacts.ts";

const publicationDirectory = join(
  process.cwd(),
  "packages",
  "surface",
  "publication",
);

mkdirSync(publicationDirectory, { recursive: true });
writeFileSync(
  join(publicationDirectory, SRD_SURFACE_PUBLICATION_FILE_NAMES.aggregate),
  SRD_SURFACE_PUBLICATION_ARTIFACT_BYTES.aggregate,
);
writeFileSync(
  join(publicationDirectory, SRD_SURFACE_PUBLICATION_FILE_NAMES.schema),
  SRD_SURFACE_PUBLICATION_ARTIFACT_BYTES.schema,
);
