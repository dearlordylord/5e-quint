import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SRD_SURFACE_PUBLICATION_FILE_NAMES } from "../packages/surface/src/surface/publication-artifacts.ts";
import {
  buildSrdSurfacePublication,
  describeSurfacePublicationBuildIssue,
} from "./srd-surface-publication-artifacts.ts";

const publicationDirectory = join(
  process.cwd(),
  "packages",
  "surface",
  "publication",
);

mkdirSync(publicationDirectory, { recursive: true });
const publication = buildSrdSurfacePublication();
if (publication.tag === "invalid") {
  for (const issue of publication.issues) {
    console.error(
      `Surface publication: ${describeSurfacePublicationBuildIssue(issue)}`,
    );
  }
  process.exitCode = 1;
} else {
  writeFileSync(
    join(publicationDirectory, SRD_SURFACE_PUBLICATION_FILE_NAMES.aggregate),
    publication.bytes.aggregate,
  );
  writeFileSync(
    join(publicationDirectory, SRD_SURFACE_PUBLICATION_FILE_NAMES.schema),
    publication.bytes.schema,
  );
}
