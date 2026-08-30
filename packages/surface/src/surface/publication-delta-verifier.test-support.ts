import {
  type SurfacePublicationDeltaVerificationResult,
  verifySurfacePublicationDeltaWithAuthority,
} from "./publication-delta-verifier-core.ts";

export type SurfacePublicationDeltaFixtureOptions = {
  readonly repoRoot: string;
  readonly publicationDir: string;
  readonly reviewedCertificate: {
    readonly path: string;
    readonly sha256: string;
  };
};

export function verifySurfacePublicationDeltaFixture(
  options: SurfacePublicationDeltaFixtureOptions,
): SurfacePublicationDeltaVerificationResult {
  return verifySurfacePublicationDeltaWithAuthority({
    repoRoot: options.repoRoot,
    publicationDir: options.publicationDir,
    certificateAuthority: options.reviewedCertificate,
  });
}
