import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";

import {
  ORACLE_PUBLICATION_ARTIFACTS,
  type OraclePublicationMember,
} from "../src/oracle-publication.ts";

const DRAFT_2020_12_SCHEMA = "https://json-schema.org/draft/2020-12/schema";

type JsonRecord = { readonly [key: string]: unknown };

export type OraclePublicationSchemaValidation = {
  readonly member: OraclePublicationMember;
  readonly issues: readonly string[];
  readonly validate: ValidateFunction<unknown> | undefined;
};

/**
 * Validate one committed publication snapshot independently of Effect's
 * schema compiler. This pure helper is shared by the Node sync script and the
 * injected-FileSystem corpus CLI so they cannot drift on bytes, metadata, or
 * Ajv compilation policy.
 */
export function validateOraclePublicationSchemaBytes(
  member: OraclePublicationMember,
  bytes: Uint8Array,
): OraclePublicationSchemaValidation {
  const artifact = ORACLE_PUBLICATION_ARTIFACTS[member];
  const issues: string[] = [];
  const committedBytes = Buffer.from(bytes);

  if (!committedBytes.equals(artifact.bytes)) {
    issues.push(`publication artifact is out of sync: ${artifact.fileName}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(committedBytes.toString("utf8"));
  } catch (error) {
    issues.push(
      `publication artifact is not valid JSON (${artifact.fileName}): ${safeErrorMessage(error)}`,
    );
    return { member, issues, validate: undefined };
  }

  if (!isJsonRecord(parsed)) {
    issues.push(
      `publication artifact root is not an object: ${artifact.fileName}`,
    );
    return { member, issues, validate: undefined };
  }

  if (parsed.$schema !== DRAFT_2020_12_SCHEMA) {
    issues.push(
      `publication artifact has the wrong $schema: ${artifact.fileName}`,
    );
  }
  if (parsed.$id !== artifact.rootId) {
    issues.push(
      `publication artifact has the wrong root $id: ${artifact.fileName}`,
    );
  }

  try {
    const validate = new Ajv2020({
      strict: false,
      inlineRefs: false,
      code: { optimize: 0 },
    }).compile(parsed);
    return { member, issues, validate };
  } catch (error) {
    issues.push(
      `publication artifact does not compile with Draft 2020-12 Ajv (${artifact.fileName}): ${safeErrorMessage(error)}`,
    );
    return { member, issues, validate: undefined };
  }
}

export function formatOraclePublicationValidationErrors(
  validate: ValidateFunction<unknown>,
): readonly string[] {
  return (validate.errors ?? []).map(formatAjvError);
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath === "" ? "/" : error.instancePath;
  return `${path} ${error.message ?? "schema validation failed"}`;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
