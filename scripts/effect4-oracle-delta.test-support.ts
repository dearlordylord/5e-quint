import { createHash } from "node:crypto";

import { Result } from "effect";

import { readRegularRepositoryFile } from "./effect3-baseline.ts";
import {
  decodeOracleDeltaCertificate,
  type OracleDeltaIssue,
  type OracleDeltaCertificate,
} from "./effect4-oracle-delta.ts";

const sha256 = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

export function decodeOracleDeltaCertificateFixtureBytes(
  bytes: Uint8Array,
  expectedSha256: string,
):
  | { readonly tag: "valid"; readonly certificate: OracleDeltaCertificate }
  | { readonly tag: "invalid"; readonly issue: OracleDeltaIssue } {
  const observedSha256 = sha256(bytes);
  if (observedSha256 !== expectedSha256) {
    return {
      tag: "invalid",
      issue: {
        kind: "certificate-digest-mismatch",
        message: `certificate SHA-256 ${observedSha256} does not match fixture digest ${expectedSha256}`,
      },
    };
  }
  try {
    const decoded = decodeOracleDeltaCertificate(
      JSON.parse(Buffer.from(bytes).toString("utf8")),
    );
    return Result.isSuccess(decoded)
      ? { tag: "valid", certificate: decoded.success }
      : {
          tag: "invalid",
          issue: {
            kind: "certificate-invalid",
            message: String(decoded.failure),
          },
        };
  } catch (error) {
    return {
      tag: "invalid",
      issue: {
        kind: "certificate-invalid",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function readOracleDeltaCertificateFixture(input: {
  readonly repositoryPath: string;
  readonly expectedSha256: string;
}):
  | { readonly tag: "valid"; readonly certificate: OracleDeltaCertificate }
  | { readonly tag: "invalid"; readonly issue: OracleDeltaIssue } {
  try {
    return decodeOracleDeltaCertificateFixtureBytes(
      readRegularRepositoryFile(input.repositoryPath),
      input.expectedSha256,
    );
  } catch (error) {
    return {
      tag: "invalid",
      issue: {
        kind: "certificate-unreadable",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
