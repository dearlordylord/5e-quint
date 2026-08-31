import { join } from "node:path";

import {
  describeSurfacePublicationDeltaIssue,
  type SurfacePublicationDeltaVerificationResult,
  verifySurfacePublicationDeltaWithAuthority,
} from "./publication-delta-verifier-core.ts";

export const SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH =
  "docs/migrations/effect-4/surface-publication-delta-certificate.json";

const SURFACE_PUBLICATION_DELTA_CERTIFICATE_SHA256 =
  "2b9439f95599361b1212aa23009fc482676a4ad77ef5f2a4233034e20247e3e8";

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
