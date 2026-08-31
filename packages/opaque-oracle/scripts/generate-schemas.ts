import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_MEMBERS,
} from "../src/oracle-publication.ts";

const publicationDirectory = join(process.cwd(), "publication");

mkdirSync(publicationDirectory, { recursive: true });
for (const member of ORACLE_PUBLICATION_MEMBERS) {
  const artifact = ORACLE_PUBLICATION_ARTIFACTS[member];
  writeFileSync(join(publicationDirectory, artifact.fileName), artifact.bytes);
}
