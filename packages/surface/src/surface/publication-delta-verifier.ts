import { join } from "node:path";

import {
  describeSurfacePublicationDeltaIssue,
  type SurfacePublicationDeltaVerificationResult,
  verifySurfacePublicationDeltaWithAuthority,
} from "./publication-delta-verifier-core.ts";

export const SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH =
  "docs/migrations/effect-4/surface-publication-delta-certificate.json";

const SURFACE_PUBLICATION_DELTA_CERTIFICATE_SHA256 =
  "3c7e7b63376fecf5598370a67dbbdf92bc16f28a84d77f722bd2bde7708f67b5";

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
