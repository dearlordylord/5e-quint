import { join } from "node:path";

import {
  describeSurfacePublicationDeltaIssue,
  type SurfacePublicationDeltaVerificationResult,
  verifySurfacePublicationDeltaWithAuthority,
} from "./publication-delta-verifier-core.ts";

export const SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH =
  "docs/migrations/effect-4/surface-publication-delta-certificate.json";

const SURFACE_PUBLICATION_DELTA_CERTIFICATE_SHA256 =
  "1705ed7f8e76d5f337765c35269a540f76fa1994da5a68fa7e533b608635a13d";

export type SurfacePublicationDeltaVerificationOptions = {
  readonly repoRoot: string;
  readonly publicationDir?: string;
};

export function verifySurfacePublicationDelta(
  options: SurfacePublicationDeltaVerificationOptions,
): SurfacePublicationDeltaVerificationResult {
  return verifySurfacePublicationDeltaWithAuthority({
    ...options,
    certificateAuthority: {
      path: join(options.repoRoot, SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH),
      sha256: SURFACE_PUBLICATION_DELTA_CERTIFICATE_SHA256,
    },
  });
}

export {
  describeSurfacePublicationDeltaIssue,
  type SurfacePublicationDeltaVerificationResult,
};
