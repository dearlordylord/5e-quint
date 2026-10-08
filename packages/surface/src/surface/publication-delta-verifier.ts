import { join } from "node:path";

import {
  describeSurfacePublicationDeltaIssue,
  type SurfacePublicationDeltaVerificationResult,
  verifySurfacePublicationDeltaWithAuthority,
} from "./publication-delta-verifier-core.ts";

export const SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH =
  "packages/surface/publication/srd-surface-delta-certificate.json";

const SURFACE_PUBLICATION_DELTA_CERTIFICATE_SHA256 =
  "9de55b647b54b65f983b64476cbe364801aec5a7a0465bc7f60f82948835912b";

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
