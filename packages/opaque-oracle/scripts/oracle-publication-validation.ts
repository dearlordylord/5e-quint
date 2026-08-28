import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import { Either, Match } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

import {
  ORACLE_PUBLICATION_ARTIFACTS,
  type OraclePublicationMember,
} from "../src/oracle-publication.ts";
import { toReadonlyNonEmpty } from "./oracle-evaluation-cli-support.ts";

const DRAFT_2020_12_SCHEMA = "https://json-schema.org/draft/2020-12/schema";

type JsonRecord = { readonly [key: string]: unknown };

export type OraclePublicationSchemaIssue =
  | {
      readonly tag: "artifactOutOfSync";
      readonly fileName: string;
    }
  | {
      readonly tag: "invalidJson";
      readonly fileName: string;
      readonly cause: unknown;
    }
  | {
      readonly tag: "rootNotObject";
      readonly fileName: string;
    }
  | {
      readonly tag: "wrongSchema";
      readonly fileName: string;
      readonly expected: string;
      readonly actual: unknown;
    }
  | {
      readonly tag: "wrongRootId";
      readonly fileName: string;
      readonly expected: string;
      readonly actual: unknown;
    }
  | {
      readonly tag: "compileFailed";
      readonly fileName: string;
      readonly cause: unknown;
    };

export type OraclePublicationSchemaIssues =
  ReadonlyNonEmptyArray<OraclePublicationSchemaIssue>;

export type OraclePublicationSchemaValidation =
  | {
      readonly tag: "valid";
      readonly member: OraclePublicationMember;
      readonly issues: readonly [];
      readonly validate: ValidateFunction<unknown>;
    }
  | {
      readonly tag: "invalid";
      readonly member: OraclePublicationMember;
      readonly issues: OraclePublicationSchemaIssues;
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
  const byteIssues: OraclePublicationSchemaIssue[] = artifact.bytes.equals(
    Buffer.from(bytes),
  )
    ? []
    : [artifactOutOfSyncIssue(artifact.fileName)];
  const parsed = parsePublicationSchema(
    artifact.fileName,
    Buffer.from(bytes).toString("utf8"),
  );

  if (Either.isLeft(parsed)) {
    return invalidValidation(
      member,
      appendPublicationIssue(byteIssues, parsed.left),
      undefined,
    );
  }

  const metadataIssues = publicationMetadataIssues(member, parsed.right);
  const schemaIssues = [...byteIssues, ...metadataIssues];
  const compiled = compilePublicationSchema(artifact.fileName, parsed.right);
  if (Either.isLeft(compiled)) {
    return invalidValidation(
      member,
      appendPublicationIssue(schemaIssues, compiled.left),
      undefined,
    );
  }

  const nonEmptyIssues = toReadonlyNonEmpty(schemaIssues);
  return nonEmptyIssues === undefined
    ? {
        tag: "valid",
        member,
        issues: [],
        validate: compiled.right,
      }
    : invalidValidation(member, nonEmptyIssues, compiled.right);
}

export function formatOraclePublicationValidation(
  validation: OraclePublicationSchemaValidation,
): readonly string[] {
  return Match.value(validation).pipe(
    Match.when({ tag: "valid" }, () => []),
    Match.when({ tag: "invalid" }, ({ issues }) =>
      issues.map(formatOraclePublicationIssue),
    ),
    Match.exhaustive,
  );
}

function parsePublicationSchema(
  fileName: string,
  text: string,
): Either.Either<JsonRecord, OraclePublicationSchemaIssue> {
  try {
    const parsed = JSON.parse(text);
    return isJsonRecord(parsed)
      ? Either.right(parsed)
      : Either.left({ tag: "rootNotObject", fileName });
  } catch (cause) {
    return Either.left({ tag: "invalidJson", fileName, cause });
  }
}

function artifactOutOfSyncIssue(
  fileName: string,
): OraclePublicationSchemaIssue {
  return { tag: "artifactOutOfSync", fileName };
}

function publicationMetadataIssues(
  member: OraclePublicationMember,
  parsed: JsonRecord,
): OraclePublicationSchemaIssue[] {
  const artifact = ORACLE_PUBLICATION_ARTIFACTS[member];
  const issues: OraclePublicationSchemaIssue[] = [];
  if (parsed.$schema !== DRAFT_2020_12_SCHEMA) {
    issues.push({
      tag: "wrongSchema",
      fileName: artifact.fileName,
      expected: DRAFT_2020_12_SCHEMA,
      actual: parsed.$schema,
    });
  }
  if (parsed.$id !== artifact.rootId) {
    issues.push({
      tag: "wrongRootId",
      fileName: artifact.fileName,
      expected: artifact.rootId,
      actual: parsed.$id,
    });
  }
  return issues;
}

function compilePublicationSchema(
  fileName: string,
  parsed: JsonRecord,
): Either.Either<ValidateFunction<unknown>, OraclePublicationSchemaIssue> {
  try {
    return Either.right(
      new Ajv2020({
        strict: false,
        inlineRefs: false,
        code: { optimize: 0 },
      }).compile(parsed),
    );
  } catch (cause) {
    return Either.left({ tag: "compileFailed", fileName, cause });
  }
}

function invalidValidation(
  member: OraclePublicationMember,
  issues: OraclePublicationSchemaIssues,
  validate: ValidateFunction<unknown> | undefined,
): OraclePublicationSchemaValidation {
  return { tag: "invalid", member, issues, validate };
}

function appendPublicationIssue(
  issues: readonly OraclePublicationSchemaIssue[],
  issue: OraclePublicationSchemaIssue,
): OraclePublicationSchemaIssues {
  return toReadonlyNonEmpty([...issues, issue]) ?? [issue];
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatOraclePublicationIssue(
  issue: OraclePublicationSchemaIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "artifactOutOfSync" },
      ({ fileName }) => `publication artifact is out of sync: ${fileName}`,
    ),
    Match.when(
      { tag: "invalidJson" },
      ({ fileName, cause }) =>
        `publication artifact is not valid JSON (${fileName}): ${safeErrorMessage(cause)}`,
    ),
    Match.when(
      { tag: "rootNotObject" },
      ({ fileName }) =>
        `publication artifact root is not an object: ${fileName}`,
    ),
    Match.when(
      { tag: "wrongSchema" },
      ({ fileName }) =>
        `publication artifact has the wrong $schema: ${fileName}`,
    ),
    Match.when(
      { tag: "wrongRootId" },
      ({ fileName }) =>
        `publication artifact has the wrong root $id: ${fileName}`,
    ),
    Match.when(
      { tag: "compileFailed" },
      ({ fileName, cause }) =>
        `publication artifact does not compile with Draft 2020-12 Ajv (${fileName}): ${safeErrorMessage(cause)}`,
    ),
    Match.exhaustive,
  );
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
